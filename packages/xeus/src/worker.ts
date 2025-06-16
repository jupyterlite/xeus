// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import {
  IEmpackEnvMeta,
  bootstrapEmpackPackedEnvironment,
  bootstrapPython,
  getPythonVersion,
  loadShareLibs,
  ISolvedPackages,
  solve,
  installPackagesToEmscriptenFS,
  removePackagesFromEmscriptenFS,
  showPackagesList,
  TSharedLibsMap,
  ISolvedPackage
} from '@emscripten-forge/mambajs';
import { IUnpackJSAPI } from '@emscripten-forge/untarjs';
import { XeusRemoteKernelBase } from '@jupyterlite/xeus-core';
import { IEmpackXeusWorkerKernel } from './interfaces';

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const json = await response.json();
  return json;
}

/**
 * A worker kernel that is backed by an empack environment
 */
export abstract class EmpackedXeusRemoteKernel extends XeusRemoteKernelBase {
  protected async initializeModule(
    options: IEmpackXeusWorkerKernel.IOptions
  ): Promise<any> {
    const { baseUrl, kernelSpec } = options;

    // location of the kernel binary on the server
    const binaryJS = URLExt.join(baseUrl, kernelSpec.argv[0]);
    const binaryWASM = binaryJS.replace('.js', '.wasm');
    const binaryDATA = binaryJS.replace('.js', '.data');
    const kernelRootUrl = URLExt.join(baseUrl, 'xeus', kernelSpec.envName);

    const sharedLibs =
      kernelSpec.metadata && kernelSpec.metadata.shared
        ? kernelSpec.metadata.shared
        : {};

    importScripts(binaryJS);
    return {
      locateFile: (file: string) => {
        if (file in sharedLibs) {
          return URLExt.join(kernelRootUrl, kernelSpec.name, file);
        }

        // Special case for libxeus
        if (['libxeus.so'].includes(file)) {
          return URLExt.join(kernelRootUrl, file);
        }

        if (file.endsWith('.wasm')) {
          return binaryWASM;
        } else if (file.endsWith('.data')) {
          // Handle the .data file if it exists
          return binaryDATA;
        }

        return file;
      }
    };
  }

  protected async initializeFileSystem(
    options: IEmpackXeusWorkerKernel.IOptions
  ): Promise<any> {
    const { baseUrl, kernelSpec, empackEnvMetaLink } = options;

    if (
      this.Module.FS === undefined ||
      this.Module.loadDynamicLibrary === undefined
    ) {
      throw new Error('Cannot load kernel without a valid FS');
    }

    // location of the kernel binary on the server
    const kernelRootUrl = URLExt.join(
      baseUrl,
      'xeus',
      'kernels',
      kernelSpec.dir
    );

    const empackEnvMetaLocation = empackEnvMetaLink || kernelRootUrl;
    const packagesJsonUrl = `${empackEnvMetaLocation}/empack_env_meta.json`;
    this._pkgRootUrl = URLExt.join(
      baseUrl,
      `xeus/${kernelSpec.envName}/kernel_packages`
    );
    const empackEnvMeta = (await fetchJson(packagesJsonUrl)) as IEmpackEnvMeta;

    // Initialize installed packages from empack env meta
    this._installedPackages = {};
    console.log('empackEnvMeta',empackEnvMeta);
    empackEnvMeta.packages.map(pkg => {
      this._installedPackages[pkg.filename] = {
        name: pkg.name,
        version: pkg.version,
        repo_url: pkg.channel ? pkg.channel : '',
        url: pkg.url ? pkg.url : '',
        repo_name: pkg.channel ? pkg.channel : '',
        build_string: pkg.build,
      };
    });

    this._pythonVersion = getPythonVersion(empackEnvMeta.packages);
    this._prefix = empackEnvMeta.prefix;

    const bootstrapped = await bootstrapEmpackPackedEnvironment({
      empackEnvMeta,
      pkgRootUrl: this._pkgRootUrl,
      Module: this.Module,
      logger: this.logger,
      pythonVersion: this._pythonVersion
    });

    this._paths = bootstrapped.paths;
    this._untarjs = bootstrapped.untarjs;
    this._sharedLibs = bootstrapped.sharedLibs;
  }

  /**
   * Initialize the interpreter if needed
   * @param options
   */
  protected async initializeInterpreter(
    options: IEmpackXeusWorkerKernel.IOptions
  ) {
    // Bootstrap Python, if it's xeus-python
    if (options.kernelSpec.name === 'xpython') {
      if (!this._pythonVersion) {
        throw new Error('Python is not installed, cannot start Python!');
      }

      this.logger.log('Starting Python');

      await bootstrapPython({
        prefix: this._prefix,
        pythonVersion: this._pythonVersion,
        Module: this.Module
      });
    }

    // Load shared libs
    await loadShareLibs({
      sharedLibs: this._sharedLibs,
      prefix: this._prefix,
      Module: this.Module,
      logger: this.logger
    });
  }
  protected getPackageName(specs: string) {
    const nameMatch = specs.match(/^([a-zA-Z0-9_-]+)/);

    if (!nameMatch) {
      return null;
    }

    const packageName = nameMatch[1];
    console.log('packageName', packageName);
    return packageName;
  }
  protected updateCurrentSpecs(
    specs: string[],
    pipSpecs: string[],
    type: string
  ) {
    switch (type) {
      case 'initial':
      case 'install':
        specs.forEach((spec: string) => {
          const pkgName = this.getPackageName(spec);
          if (pkgName) {
            this._currentSpecs[pkgName] = spec;
          }
        });

        pipSpecs.forEach((spec: string) => {
          const pkgName = this.getPackageName(spec);
          if (pkgName) {
            this._currentPipSpecs[pkgName] = spec;
          }
        });
        break;
      case 'uninstall':
      case 'remove':
        specs.forEach((spec: string) => {
          const pkgName = this.getPackageName(spec);
          if (pkgName && type === 'remove') {
            delete this._currentSpecs[pkgName];
          } else if (pkgName && type === 'uninstall') {
            delete this._currentPipSpecs[pkgName];
          }
        });
        break;
      default:
        break;
    }
  }

  protected async solvEnv(channels: string []){
    try {
        const newPackages = await solve({
          ymlOrSpecs: Object.values(this._currentSpecs),
          installedPackages: this._installedPackages,
          pipSpecs: Object.values(this._currentPipSpecs),
          channels,
          logger: this.logger
        });

        await this._reloadPackagesInFS(
          {
            ...newPackages.condaPackages,
            ...newPackages.pipPackages
          },
          []
        );
      } catch (error: any) {
        this.logger?.error(error.stack);
      }
  }

  protected async install(
    channels: string[],
    specs: string[],
    pipSpecs: string[]
  ) {
    if (specs.length || pipSpecs.length) {
      this.updateCurrentSpecs(specs, pipSpecs, 'install');
      this.solvEnv(channels);
    }
  }

  /**
   * Implements dynamic installation of packages
   */
  protected listInstalledPackages(): Promise<void> {
    showPackagesList(this._installedPackages, this.logger);
    return Promise.resolve();
  }

  protected async uninstall(
    specs: string[],
    env: string[] | undefined,
    type: string
  ): Promise<void> {
    if (type === 'uninstall') {
      this.updateCurrentSpecs([], specs, type);
    } else {
      this.updateCurrentSpecs(specs, [], type);
    }
    this.solvEnv([]);
  }

  private async _reloadPackagesInFS(
    newInstalledPackages: ISolvedPackages,
    prefix: string[]
  ) {
    const removedPackages: ISolvedPackages = {};
    const newPackages: ISolvedPackages = {};

    // First create structures we can quickly inspect
    const newInstalledPackagesMap: { [name: string]: ISolvedPackage } = {};
    for (const newInstalledPkg of Object.values(newInstalledPackages)) {
      newInstalledPackagesMap[newInstalledPkg.name] = newInstalledPkg;
    }
    const oldInstalledPackagesMap: { [name: string]: ISolvedPackage } = {};
    for (const oldInstalledPkg of Object.values(this._installedPackages)) {
      oldInstalledPackagesMap[oldInstalledPkg.name] = oldInstalledPkg;
    }

    // Compare old installed packages with new ones
    for (const filename of Object.keys(this._installedPackages)) {
      const installedPkg = this._installedPackages[filename];

      // Exact same build of the package already installed
      if (
        installedPkg.name in newInstalledPackagesMap &&
        installedPkg.build_string ===
          newInstalledPackagesMap[installedPkg.name].build_string &&
        installedPkg.version ===
          newInstalledPackagesMap[installedPkg.name].version
      ) {
        continue;
      }

      removedPackages[filename] = installedPkg;
    }

    // Compare new installed packages with old ones
    for (const filename of Object.keys(newInstalledPackages)) {
      const newPkg = newInstalledPackages[filename];

      // Exact same build of the package already installed
      if (
        newPkg.name in oldInstalledPackagesMap &&
        newPkg.build_string ===
          oldInstalledPackagesMap[newPkg.name].build_string  &&
        newPkg.version === oldInstalledPackagesMap[newPkg.name].version
      ) {
        continue;
      }

      newPackages[filename] = newPkg;
    }

    await removePackagesFromEmscriptenFS({
      removedPackages,
      Module: this.Module,
      paths: this._paths,
      logger: this.logger
    });

    const { sharedLibs, paths } = await installPackagesToEmscriptenFS({
      packages: newPackages,
      pkgRootUrl: this._pkgRootUrl,
      pythonVersion: this._pythonVersion,
      Module: this.Module,
      untarjs: this._untarjs,
      logger: this.logger
    });
    this._paths = { ...this._paths, ...paths };

    await loadShareLibs({
      sharedLibs,
      prefix: this._prefix,
      Module: this.Module,
      logger: this.logger
    });

    this._installedPackages = newInstalledPackages;
  }

  private _pythonVersion: number[] | undefined;
  private _prefix = '';

  private _pkgRootUrl = '';

  private _sharedLibs: TSharedLibsMap;
  private _installedPackages: ISolvedPackages = {};
  private _paths = {};

  private _untarjs: IUnpackJSAPI | undefined;
  private _currentSpecs = {};
  private _currentPipSpecs = {};
}

export namespace XeusRemoteKernel {
  export interface IOptions {}
}
