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
import {
  IInstallationCommandOptions,
  IUninstallationCommandOptions,
  packageNameFromSpec
} from '@emscripten-forge/mambajs-core';
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

  protected initializeCurrentSpecs(empackEnvMeta: IEmpackEnvMeta) {
    const specs: string[] = empackEnvMeta.specs ? empackEnvMeta.specs : [];
    empackEnvMeta.packages.forEach((pkg: any) => {
      specs.map((spec: string) => {
        const specName = packageNameFromSpec(spec);
        if (pkg.name === specName) {
          if (pkg.channel !== 'PyPi') {
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
      return;
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
    this.initializeCurrentSpecs(empackEnvMeta);

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

  protected addSpecs(specs: string[], currentSpecs: { [key: string]: string }) {
    const updatedCurrentSpecs = { ...currentSpecs };

    specs.forEach((spec: string) => {
      const pkgName = packageNameFromSpec(spec);
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
    updatedInstalled: ISolvedPackages
  ) {
    const updatedCurrentSpecs = { ...currentSpecs };
    let updatedInstalledPkgs = { ...updatedInstalled };

    specs.forEach((spec: string) => {
      const pkgName = packageNameFromSpec(spec);
      if (pkgName && !newInstalledPackagesMap[pkgName]) {
        this.logger.log(
          `Failure: package to remove not found in the environment: ${pkgName}`
        );
      } else {
        if (pkgName) {
          if (updatedCurrentSpecs[pkgName]) {
            delete updatedCurrentSpecs[pkgName];
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

  protected async deletePipPkgs(pipSpecs: string[]) {
    const newInstalledPackagesMap: { [name: string]: ISolvedPackage } =
      this.getInstalledPackagesMap();
    let updatedInstalledPkgs = { ...this._installedPackages };
    pipSpecs.forEach((spec: string) => {
      const pkgName = packageNameFromSpec(spec);
      if (pkgName && !newInstalledPackagesMap[pkgName]) {
        this.logger.log(`WARNING: Skipping ${pkgName} as it is not installed.`);
      } else if (pkgName) {
        updatedInstalledPkgs = this.deleteFromInstalledPackages(
          pkgName,
          updatedInstalledPkgs
        );
      }
    });
    await this._reloadPackagesInFS(updatedInstalledPkgs);
  }

  protected getPackagesList(specs: string[], type: 'pip' | 'conda'): string[] {
    const newInstalledPackagesMap: { [name: string]: ISolvedPackage } =
      this.getInstalledPackagesMap();
    const preparedPkgs: any = this.canDelete(
      specs,
      newInstalledPackagesMap,
      type
    );
    const specsForDeleting: string[] = [];
    preparedPkgs.forEach((pkgData: any) => {
      if (pkgData.status) {
        specsForDeleting.push(pkgData.spec);
      } else {
        this.logger.error(pkgData.message);
      }
    });
    return specsForDeleting;
  }

  protected canDelete(
    specs: string[],
    installedMap: { [name: string]: ISolvedPackage },
    type?: 'pip' | 'conda'
  ) {
    const result: any = [];
    specs.forEach((spec: string) => {
      const pkgName = packageNameFromSpec(spec);
      const specStatus = {
        status: 0,
        message: '',
        spec
      };
      if (pkgName) {
        const pkg = installedMap[pkgName];
        if (pkg) {
          if (type === 'pip') {
            if (pkg.repo_name !== 'PyPi') {
              specStatus.message = `It is imposible to use "pip uninstall" for the package ${spec}, please use "conda remove" command for this`;
            } else {
              specStatus.status = 1;
            }
          } else if (type === 'conda') {
            if (pkg.repo_name === 'PyPi') {
              specStatus.message = `It is imposible to use "conda remove" for the package ${spec}, please use "pip uninstall" command for this`;
            } else {
              specStatus.status = 1;
            }
          }
        } else {
          specStatus.message = `Package ${pkgName} is not in the installed list`;
        }
        result.push(specStatus);
      }
    });
    return result;
  }

  protected getInstalledPackagesMap() {
    const newInstalledPackagesMap: { [name: string]: ISolvedPackage } = {};
    for (const newInstalledPkg of Object.values(this._installedPackages)) {
      newInstalledPackagesMap[newInstalledPkg.name] = newInstalledPkg;
    }
    return newInstalledPackagesMap;
  }

  protected updateCurrentSpecs(
    specs: string[],
    command: 'install' | 'uninstall'
  ): {
    specs: { [key: string]: string };
    installed: ISolvedPackages;
    status: number;
  } {
    let newSpecs = { ...this._currentSpecs };

    /* we need to collect requested pip specs to know when we need to delete all packages
       if a user tried to install and after they decided to delete pip packages
       and if specs array is empty and pip specs array is not, then we should not clean an enviroment
    */
    let updatedInstalled: ISolvedPackages = { ...this._installedPackages };
    const newInstalledPackagesMap: { [name: string]: ISolvedPackage } =
      this.getInstalledPackagesMap();

    let status: number = 1;

    switch (command) {
      case 'install':
        newSpecs = this.addSpecs(specs, newSpecs);
        break;
      case 'uninstall': {
        if (specs.length) {
          const data = this.deleteSpecs(
            specs,
            newSpecs,
            newInstalledPackagesMap,
            updatedInstalled
          );
          newSpecs = data.specs;
          updatedInstalled = data.installed;
        } else {
          status = 0;
        }

        break;
      }
      default:
        break;
    }

    return {
      specs: newSpecs,
      installed: updatedInstalled,
      status
    };
  }

  protected async install(options: IInstallationCommandOptions) {
    let data: {
      specs: { [key: string]: string };
      installed: ISolvedPackages;
      status: number;
    } = {
      specs: {},
      installed: this._installedPackages,
      status: 1
    };
    if (options.specs.length) {
      data = this.updateCurrentSpecs(options.specs, 'install');
    }

    let newPackages: {
      condaPackages: ISolvedPackages;
      pipPackages: ISolvedPackages;
    };

    try {
      switch (options.type) {
        case 'conda': {
          newPackages = await solve({
            ymlOrSpecs: Object.values(data.specs),
            installedPackages: data.installed,
            channels: options.channels,
            logger: this.logger
          });
          break;
        }
        case 'pip': {
          newPackages = await solve({
            installedPackages: this._installedPackages,
            pipSpecs: options.specs,
            logger: this.logger
          });
          break;
        }
      }

      await this._reloadPackagesInFS({
        ...newPackages.condaPackages,
        ...newPackages.pipPackages
      });
      if (options.specs.length) {
        this.filterCurrentSpecs(data.specs);
      }
    } catch (error: any) {
      this.logger?.error(error.stack);
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
    options: IUninstallationCommandOptions
  ): Promise<void> {
    let data:
      | {
          specs: { [key: string]: string };
          installed: ISolvedPackages;
          status: number;
        }
      | undefined;

    const newCondaPipSpecs = this.getPackagesList(options.specs, options.type);
    if (newCondaPipSpecs.length) {
      if (options.type === 'conda') {
        data = this.updateCurrentSpecs(options.specs, 'uninstall');

        if (
          data &&
          data.status &&
          Object.keys(this._installedPackages).length
        ) {
          try {
            if (!Object.keys(data.specs).length) {
              const newInstalledPkgs = {};
              Object.keys(this._installedPackages).forEach(
                (filename: string) => {
                  const pkg = this._installedPackages[filename];
                  if (pkg.repo_name === 'PyPi') {
                    newInstalledPkgs[filename] = pkg;
                  }
                }
              );

              await this._reloadPackagesInFS(newInstalledPkgs);
              this._currentSpecs = {};
            } else {
              const newPackages = await solve({
                ymlOrSpecs: Object.values(data.specs),
                installedPackages: data.installed,
                pipSpecs: [],
                channels: [],
                logger: this.logger
              });
              await this._reloadPackagesInFS({
                ...newPackages.condaPackages,
                ...newPackages.pipPackages
              });
              this.filterCurrentSpecs(data.specs);
            }
          } catch (error: any) {
            this.logger?.error(error.stack);
          }
        }
      } else {
        await this.deletePipPkgs(newCondaPipSpecs);
      }
    }
  }

  protected filterCurrentSpecs(specs: { [key: string]: string }): void {
    const newInstalledMap = this.getInstalledPackagesMap();
    const newCurrentSpecs = {};

    Object.keys(specs).forEach((pkgName: string) => {
      if (
        newInstalledMap[pkgName] &&
        newInstalledMap[pkgName].repo_name !== 'PyPi'
      ) {
        newCurrentSpecs[pkgName] = specs[pkgName];
      }
    });
    if (Object.keys(newCurrentSpecs).length) {
      this._currentSpecs = { ...newCurrentSpecs };
    }
  }

  private async _reloadPackagesInFS(newInstalledPackages: ISolvedPackages) {
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
}

export namespace XeusRemoteKernel {
  export interface IOptions {}
}
