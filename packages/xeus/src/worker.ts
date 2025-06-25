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

  protected setupCurrentSpecs(empackEnvMeta: IEmpackEnvMeta) {
    const specs: string[] = empackEnvMeta.specs ? empackEnvMeta.specs : [];
    empackEnvMeta.packages.forEach((pkg: any) => {
      specs.map((spec: string) => {
        const specName = this.getPackageName(spec);
        if (pkg.name === specName) {
          if (pkg.channel === 'PyPi') {
            this._currentPipSpecs[pkg.name] = spec;
          } else {
            this._currentSpecs[pkg.name] = spec;
          }
        }
      });
    });
  }

  protected async initializeFileSystem(
    options: IEmpackXeusWorkerKernel.IOptions
  ): Promise<any> {
    const { baseUrl, kernelSpec, empackEnvMetaLink } = options;

    if (
      this.Module.FS === undefined ||
      this.Module.loadDynamicLibrary === undefined
    ) {
      console.warn(
        `Cannot initialize the file-system of ${kernelSpec.dir} since it wasn't compiled with FS support.`
      );
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
    this.setupCurrentSpecs(empackEnvMeta);

    // Initialize installed packages from empack env meta
    this._installedPackages = {};
    empackEnvMeta.packages.map(pkg => {
      this._installedPackages[pkg.filename] = {
        name: pkg.name,
        version: pkg.version,
        repo_url: pkg.channel ? pkg.channel : '',
        url: pkg.url ? pkg.url : '',
        repo_name: pkg.channel ? pkg.channel : '',
        build_string: pkg.build,
        subdir: pkg.subdir ? pkg.subdir : '',
        depends: pkg.depends ? pkg.depends : []
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
    if (
      this.Module.FS === undefined ||
      this.Module.loadDynamicLibrary === undefined
    ) {
      // Return early, we've already warned earlier
      return;
    }

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

  protected deleteFromInstalledPackages(
    pkgName: string,
    installed: ISolvedPackages
  ) {
    const newInstalledPkgs: ISolvedPackages = {};
    Object.keys(installed).map((filename: string) => {
      const installedPkg = installed[filename];
      if (pkgName !== installedPkg.name) {
        newInstalledPkgs[filename] = installedPkg;
      }
    });
    return newInstalledPkgs;
  }

  protected getPackageName(specs: string) {
    const nameMatch = specs.match(/^([a-zA-Z0-9_-]+)/);

    if (!nameMatch) {
      return null;
    }

    const packageName = nameMatch[1];
    return packageName;
  }

  protected addSpecs(specs: string[], currentSpecs: { [key: string]: string }) {
    const updatedCurrentSpecs = { ...currentSpecs };

    specs.forEach((spec: string) => {
      const pkgName = this.getPackageName(spec);
      if (pkgName) {
        updatedCurrentSpecs[pkgName] = spec;
      }
    });
    return updatedCurrentSpecs;
  }

  protected deleteSpecs(
    specs: string[],
    currentSpecs: { [key: string]: string },
    newInstalledPackagesMap: { [name: string]: ISolvedPackage },
    updatedInstalled: ISolvedPackages,
    type: string
  ) {
    const updatedCurrentSpecs = { ...currentSpecs };
    let updatedInstalledPkgs = { ...updatedInstalled };

    specs.forEach((spec: string) => {
      const pkgName = this.getPackageName(spec);
      if (pkgName && !newInstalledPackagesMap[pkgName]) {
        this.logger.log(`Package ${pkgName} is not in the installed list`);
      } else {
        if (pkgName) {
          // the special case when a user deletes pip
          if (pkgName === 'pip') {
            this.logger.log('Be aware of pip is being removed');
          }
          if (updatedCurrentSpecs[pkgName]) {
            delete updatedCurrentSpecs[pkgName];
            if (type === 'uninstall') {
              updatedInstalledPkgs = this.deleteFromInstalledPackages(
                pkgName,
                updatedInstalledPkgs
              );
            }
          } else {
            updatedInstalledPkgs = this.deleteFromInstalledPackages(
              pkgName,
              updatedInstalledPkgs
            );
          }
        }
      }
    });

    return { specs: updatedCurrentSpecs, installed: updatedInstalledPkgs };
  }

  protected identifySpecs(
    specs: string[],
    currentSpecs: { [key: string]: string },
    currentPipSpecs: { [key: string]: string }
  ) {
    const result = { fromCondaPkgs: false, fromPipPkgs: false };
    specs.forEach((spec: string) => {
      const pkgName = this.getPackageName(spec);
      if (pkgName) {
        if (currentSpecs[pkgName]) {
          result.fromCondaPkgs = true;
        } else if (currentPipSpecs[pkgName]) {
          result.fromPipPkgs = true;
        }
      }
    });
    return result;
  }

  protected updateCurrentSpecs(
    specs: string[],
    pipSpecs: string[],
    type: string
  ): {
    specs: { [key: string]: string };
    pipSpecs: { [key: string]: string };
    installed: ISolvedPackages;
  } {
    // copy data before making manupulations
    let newSpecs = { ...this._currentSpecs };
    let newPipSpecs = { ...this._currentPipSpecs };
    let updatedInstalled: ISolvedPackages = { ...this._installedPackages };
    const newInstalledPackagesMap: { [name: string]: ISolvedPackage } = {};
    for (const newInstalledPkg of Object.values(this._installedPackages)) {
      newInstalledPackagesMap[newInstalledPkg.name] = newInstalledPkg;
    }

    switch (type) {
      case 'initial':
      case 'install':
        newSpecs = this.addSpecs(specs, newSpecs);
        if (!newInstalledPackagesMap['pip'] && pipSpecs.length) {
          this.logger.error('Cannot run "pip install": pip is not installed');
        } else if (pipSpecs.length) {
          newPipSpecs = this.addSpecs(pipSpecs, newPipSpecs);
        }
        break;
      case 'uninstall':
      case 'remove': {
        const tmpSpecs: string[] = specs.length
          ? specs
          : pipSpecs.length
            ? pipSpecs
            : [];
        const { fromCondaPkgs, fromPipPkgs } = this.identifySpecs(
          tmpSpecs,
          newSpecs,
          newPipSpecs
        );
        if (fromCondaPkgs) {
          const data = this.deleteSpecs(
            tmpSpecs,
            newSpecs,
            newInstalledPackagesMap,
            updatedInstalled,
            'remove'
          );
          newSpecs = data.specs;
          updatedInstalled = data.installed;
        }
        if (fromPipPkgs) {
          const data = this.deleteSpecs(
            tmpSpecs,
            newPipSpecs,
            newInstalledPackagesMap,
            updatedInstalled,
            'uninstall'
          );
          newPipSpecs = data.specs;
          updatedInstalled = data.installed;
        }

        break;
      }
      default:
        break;
    }

    return {
      specs: newSpecs,
      pipSpecs: newPipSpecs,
      installed: updatedInstalled
    };
  }

  protected async solvEnv(
    specs: {},
    pipSpecs: {},
    channels: string[],
    installedPackages: ISolvedPackages
  ) {
    try {
      const newPackages = await solve({
        ymlOrSpecs: Object.values(specs),
        installedPackages,
        pipSpecs: Object.values(pipSpecs),
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
      this._currentSpecs = specs;
      this._currentPipSpecs = pipSpecs;
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
      const data = this.updateCurrentSpecs(specs, pipSpecs, 'install');
      this.solvEnv(data.specs, data.pipSpecs, channels, data.installed);
    }
  }

  /**
   * Implements dynamic installation of packages
   */
  protected listInstalledPackages(): Promise<void> {
    if (Object.keys(this._installedPackages).length) {
      showPackagesList(this._installedPackages, this.logger);
      return Promise.resolve();
    } else {
      this.logger.log('Please install packages, an environment is empty');
      return Promise.resolve();
    }
  }

  protected async uninstall(
    specs: string[],
    env: string[] | undefined,
    type: string
  ): Promise<void> {
    let data:
      | {
          specs: { [key: string]: string };
          pipSpecs: { [key: string]: string };
          installed: ISolvedPackages;
        }
      | undefined;
    if (type === 'uninstall') {
      data = this.updateCurrentSpecs([], specs, type);
    } else {
      data = this.updateCurrentSpecs(specs, [], type);
    }

    if (Object.keys(this._installedPackages).length) {
      if (
        !Object.keys(data.specs).length &&
        !Object.keys(data.pipSpecs).length
      ) {
        await removePackagesFromEmscriptenFS({
          removedPackages: this._installedPackages,
          Module: this.Module,
          paths: { ...this._paths },
          logger: this.logger
        });
        this._installedPackages = {};
      } else {
        this.solvEnv(data.specs, data.pipSpecs, [], data.installed);
      }
    }
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
          oldInstalledPackagesMap[newPkg.name].build_string &&
        newPkg.version === oldInstalledPackagesMap[newPkg.name].version
      ) {
        continue;
      }

      newPackages[filename] = newPkg;
    }

    const newPath = await removePackagesFromEmscriptenFS({
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
    this._paths = { ...newPath, ...paths };

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
  private _currentSpecs: { [key: string]: string } = {};
  private _currentPipSpecs: { [key: string]: string } = {};
}

export namespace XeusRemoteKernel {
  export interface IOptions {}
}
