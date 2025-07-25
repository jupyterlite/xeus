// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import {
  IEmpackEnvMeta,
  bootstrapEmpackPackedEnvironment,
  bootstrapPython,
  getPythonVersion,
  loadSharedLibs,
  ISolvedPackages,
  installPackagesToEmscriptenFS,
  removePackagesFromEmscriptenFS,
  showPackagesList,
  TSharedLibsMap,
  ISolvedPackage,
  install,
  pipInstall,
  pipUninstall,
  remove
} from '@emscripten-forge/mambajs';
import {
  IEnv,
  IInstallationCommandOptions,
  IListCommandOptions,
  IUninstallationCommandOptions,
  showPipPackagesList
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
    this._env.specs = empackEnvMeta.specs ? empackEnvMeta.specs : [];
    this._env.channels = empackEnvMeta.channels ? empackEnvMeta.channels : [];

    // Initialize installed packages from empack env meta
    empackEnvMeta.packages.map(pkg => {
      this._env.packages.condaPackages[pkg.filename] = {
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
    await this._maybeLoadSharedLibs();
  }

  /**
   * Process %conda install or %pip install commands
   * @param options
   */
  protected async install(options: IInstallationCommandOptions) {
    let env: IEnv;

    switch (options.type) {
      case 'conda': {
        env = await install(
          options.specs,
          this._env,
          options.channels,
          this.logger
        );
        break;
      }
      case 'pip': {
        env = await pipInstall(options.specs, this._env, this.logger);
        break;
      }
    }

    await this._reloadPackagesInFS(env);
  }

  /**
   * Process %conda remove or %pip uninstall commands
   * @param options
   */
  protected async uninstall(
    options: IUninstallationCommandOptions
  ): Promise<void> {
    let env: IEnv;

    switch (options.type) {
      case 'conda': {
        env = await remove(options.specs, this._env, this.logger);
        break;
      }
      case 'pip': {
        env = await pipUninstall(options.specs, this._env, this.logger);
        break;
      }
    }

    await this._reloadPackagesInFS(env);
  }

  /**
   * Process %conda list or %pip list commands
   * @param options
   */
  protected listInstalledPackages(options: IListCommandOptions): Promise<void> {
    if (options.type === 'conda') {
      showPackagesList(
        {
          ...this._env.packages.condaPackages,
          ...this._env.packages.pipPackages
        },
        this.logger
      );
    } else {
      showPipPackagesList(this._env.packages.pipPackages, this.logger);
    }

    return Promise.resolve();
  }

  private async _reloadPackagesInFS(newEnv: IEnv) {
    const removedPackages: ISolvedPackages = {};
    const newPackages: ISolvedPackages = {};

    const newInstalledPackages = {
      ...newEnv.packages.condaPackages,
      ...newEnv.packages.pipPackages
    };
    const installedPackages = {
      ...this._env.packages.condaPackages,
      ...this._env.packages.pipPackages
    };

    // First create structures we can quickly inspect
    const newInstalledPackagesMap: { [name: string]: ISolvedPackage } = {};
    for (const newInstalledPkg of Object.values(newInstalledPackages)) {
      newInstalledPackagesMap[newInstalledPkg.name] = newInstalledPkg;
    }
    const oldInstalledPackagesMap: { [name: string]: ISolvedPackage } = {};
    for (const oldInstalledPkg of Object.values(installedPackages)) {
      oldInstalledPackagesMap[oldInstalledPkg.name] = oldInstalledPkg;
    }

    // Compare old installed packages with new ones
    for (const filename of Object.keys(installedPackages)) {
      const installedPkg = installedPackages[filename];

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
    this._sharedLibs = sharedLibs;

    await this._maybeLoadSharedLibs();

    this._env = newEnv;
  }

  private async _maybeLoadSharedLibs() {
    // If we're running in the Python kernel, load all cpython shared libs beforehand
    if (this._pythonVersion) {
      const cpythonSharedLibs: TSharedLibsMap = {};
      for (const pkgName of Object.keys(this._sharedLibs)) {
        cpythonSharedLibs[pkgName] = this._sharedLibs[pkgName].filter(
          sharedLib => sharedLib.includes('cpython-3')
        );
      }

      await loadSharedLibs({
        sharedLibs: cpythonSharedLibs,
        prefix: '/',
        Module: this.Module,
        logger: this.logger
      });
    }
  }

  private _pythonVersion: number[] | undefined;
  private _prefix = '';

  private _pkgRootUrl = '';

  private _sharedLibs: TSharedLibsMap;
  private _env: IEnv = {
    packages: {
      condaPackages: {},
      pipPackages: {}
    },
    channels: [],
    specs: []
  };
  private _paths = {};

  private _untarjs: IUnpackJSAPI | undefined;
}

export namespace XeusRemoteKernel {
  export interface IOptions {}
}
