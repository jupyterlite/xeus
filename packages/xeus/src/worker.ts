// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import {
  IEmpackEnvMeta,
  bootstrapEmpackPackedEnvironment,
  bootstrapPython,
  loadSharedLibs,
  showPackagesList,
  TSharedLibsMap,
  install,
  pipInstall,
  pipUninstall,
  remove
} from '@emscripten-forge/mambajs';
import {
  ILock,
  IInstallationCommandOptions,
  IListCommandOptions,
  IUninstallationCommandOptions,
  showPipPackagesList,
  updatePackagesInEmscriptenFS
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

    this._prefix = empackEnvMeta.prefix;

    const bootstrapped = await bootstrapEmpackPackedEnvironment({
      empackEnvMeta,
      pkgRootUrl: this._pkgRootUrl,
      Module: this.Module,
      logger: this.logger,
      pythonVersion: this._pythonVersion
    });

    this._paths = bootstrapped.paths;
    this._pythonVersion = bootstrapped.pythonVersion;
    this._untarjs = bootstrapped.untarjs;
    this._sharedLibs = bootstrapped.sharedLibs;
    this._lock = bootstrapped.lock;
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
    await loadSharedLibs({
      sharedLibs: this._sharedLibs,
      prefix: '/',
      Module: this.Module,
      logger: this.logger
    });
  }

  /**
   * Process %conda install or %pip install commands
   * @param options
   */
  protected async install(options: IInstallationCommandOptions) {
    let env: ILock;

    switch (options.type) {
      case 'conda': {
        env = await install(
          options.specs,
          this._lock,
          options.channels,
          this.logger
        );
        break;
      }
      case 'pip': {
        env = await pipInstall(options.specs, this._lock, this.logger);
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
    let env: ILock;

    switch (options.type) {
      case 'conda': {
        env = await remove(options.specs, this._lock, this.logger);
        break;
      }
      case 'pip': {
        env = await pipUninstall(options.specs, this._lock, this.logger);
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
          packages: this._lock.packages,
          pipPackages: this._lock.pipPackages
        },
        this.logger
      );
    } else {
      showPipPackagesList(this._lock.pipPackages, this.logger);
    }

    return Promise.resolve();
  }

  private async _reloadPackagesInFS(newLock: ILock) {
    const { sharedLibs, paths } = await updatePackagesInEmscriptenFS({
      newLock,
      oldLock: this._lock,
      pythonVersion: this._pythonVersion,
      Module: this.Module,
      untarjs: this._untarjs,
      logger: this.logger,
      paths: this._paths
    });
    this._paths = paths;
    this._sharedLibs = sharedLibs;

    await loadSharedLibs({
      sharedLibs: this._sharedLibs,
      prefix: '/',
      Module: this.Module,
      logger: this.logger
    });

    this._lock = newLock;
  }

  private _pythonVersion: number[] | undefined;
  private _prefix = '';

  private _pkgRootUrl = '';

  private _sharedLibs: TSharedLibsMap;
  private _lock: ILock;
  private _paths = {};

  private _untarjs: IUnpackJSAPI | undefined;
}

export namespace XeusRemoteKernel {
  export interface IOptions {}
}
