// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import type { IEmpackEnvMeta, TSharedLibsMap } from '@emscripten-forge/mambajs';
import type * as Mambajs from '@emscripten-forge/mambajs';
import type {
  ILock,
  IInstallationCommandOptions,
  IListCommandOptions,
  IUninstallationCommandOptions
} from '@emscripten-forge/mambajs-core';
import {
  empackLockToMambajsLock,
  bootstrapEmpackPackedEnvironment,
  bootstrapPython,
  loadSharedLibs,
  showPackagesList,
  showPipPackagesList,
  updatePackagesInEmscriptenFS
} from '@emscripten-forge/mambajs-core';
import { XeusRemoteKernelBase } from '@jupyterlite/xeus-core';
import type { IEmpackXeusWorkerKernel } from './interfaces';
import { envFingerprint, restorePycCache, savePycCache } from './pyc-cache';

/**
 * Lazily load @emscripten-forge/mambajs.
 *
 * It bundles the rattler package solver, whose ~4 MB wasm is inlined as base64 and
 * compiled synchronously when the module is evaluated. The solver is only needed for
 * %conda / %pip (un)install, so we don't want to pay for it on every kernel start.
 * webpackMode "eager" keeps the code in the worker bundle (no extra chunk to load),
 * but defers its evaluation to the first call.
 */
let mambajsPromise: Promise<typeof Mambajs> | undefined;
function loadMambajs(): Promise<typeof Mambajs> {
  if (!mambajsPromise) {
    mambajsPromise = import(
      /* webpackMode: "eager" */ '@emscripten-forge/mambajs'
    );
  }
  return mambajsPromise;
}

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

    const sharedLibs: { [lib: string]: string } =
      kernelSpec.metadata && kernelSpec.metadata.shared
        ? kernelSpec.metadata.shared
        : {};

    // Save .so files the kernel links against
    Object.values(sharedLibs).forEach(lib => this._kernelSharedLibs.add(lib));
    this._kernelSharedLibs.add('lib/libxeus.so');

    importScripts(binaryJS);
    return {
      // Compile the wasm here (or reuse the module compiled by a previous worker of
      // this kernel), so that the compiled module can be handed to the next worker.
      instantiateWasm: (
        imports: any,
        receiveInstance: (instance: any, module: any) => void
      ) => {
        const compile = async () => {
          try {
            return await WebAssembly.compileStreaming(
              fetch(binaryWASM, { credentials: 'same-origin' })
            );
          } catch {
            // e.g. wrong MIME type: fall back to non-streaming compilation
            const response = await fetch(binaryWASM, {
              credentials: 'same-origin'
            });
            return WebAssembly.compile(await response.arrayBuffer());
          }
        };
        const instantiate = async () => {
          if (options.wasmModule) {
            try {
              const instance = await WebAssembly.instantiate(
                options.wasmModule,
                imports
              );
              return { instance, module: options.wasmModule };
            } catch (e) {
              console.warn('Cannot reuse the compiled wasm module', e);
            }
          }
          const module = await compile();
          const instance = await WebAssembly.instantiate(module, imports);
          return { instance, module };
        };
        instantiate()
          .then(({ instance, module }) => {
            this.wasmModule = module;
            receiveInstance(instance, module);
          })
          .catch(e =>
            console.error('Failed to instantiate the kernel wasm', e)
          );
        return {};
      },
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

    this._lock = empackLockToMambajsLock({
      empackEnvMeta,
      pkgRootUrl: this._pkgRootUrl
    });

    if (this.Module.FS === undefined) {
      console.warn(
        `Cannot initialize the file-system of ${kernelSpec.dir} since it wasn't compiled with FS support.`
      );
      return;
    }

    this._prefix = empackEnvMeta.prefix;

    const bootstrapped = await bootstrapEmpackPackedEnvironment({
      empackEnvMeta,
      lock: this._lock,
      pkgRootUrl: this._pkgRootUrl,
      Module: this.Module,
      logger: this.logger,
      pythonVersion: this._pythonVersion
    });

    this._paths = bootstrapped.paths;
    this._pythonVersion = bootstrapped.pythonVersion;
    this._sharedLibs = bootstrapped.sharedLibs;

    // Restore the Python bytecode compiled by a previous kernel (see pyc-cache.ts)
    this._envKey = envFingerprint(kernelSpec.envName, empackEnvMeta);
    if (this._pythonVersion) {
      try {
        this._restoredPycs = await restorePycCache(this.Module, this._envKey);
      } catch (e) {
        console.warn('Failed to restore the Python bytecode cache', e);
      }
    }
  }

  /**
   * Persist the Python bytecode compiled during startup for the next kernel.
   */
  protected async afterKernelStarted(): Promise<void> {
    if (!this._pythonVersion || !this._envKey || this._envModified) {
      return;
    }
    const root = `${this._prefix === '/' ? '' : this._prefix}/lib`;
    await savePycCache(
      this.Module,
      this._envKey,
      root,
      this._restoredPycs.length
    );
  }

  /**
   * Called before the environment is changed at runtime (%conda / %pip).
   *
   * The restored pycs are "unchecked": Python would use them even if the
   * package sources change. Remove them, Python recompiles what it needs.
   */
  private _onEnvironmentChange() {
    this._envModified = true;
    for (const path of this._restoredPycs) {
      try {
        this.Module.FS.unlink(path);
      } catch {
        // already gone
      }
    }
    this._restoredPycs = [];
  }

  /**
   * Initialize the interpreter if needed
   * @param options
   */
  protected async initializeInterpreter(
    options: IEmpackXeusWorkerKernel.IOptions
  ) {
    if (this.Module.FS === undefined) {
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

    // Load shared libs only for old emscripten versions
    if (this.emscriptenMajorVersion < 4) {
      await loadSharedLibs({
        sharedLibs: this._sharedLibs,
        prefix: '/',
        Module: this.Module,
        logger: this.logger
      });
    }
  }

  get emscriptenMajorVersion(): number {
    if (this._emscriptenVersion) {
      return this._emscriptenVersion;
    }

    for (const pkg of Object.values(this._lock.packages)) {
      if (pkg.name === 'emscripten-abi') {
        this._emscriptenVersion = Number.parseInt(pkg.version.split('.')[0]);
      }
    }

    if (!this._emscriptenVersion) {
      console.warn('Failed to detect emscripten version');

      // We fallback to loading all shared libs
      this._emscriptenVersion = 0;
    }

    return this._emscriptenVersion;
  }

  /**
   * Process %conda install or %pip install commands
   * @param options
   */
  protected async install(options: IInstallationCommandOptions) {
    const { install, pipInstall } = await loadMambajs();
    this._onEnvironmentChange();
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
    const { remove, pipUninstall } = await loadMambajs();
    this._onEnvironmentChange();
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
    // This is workaround to not hit FS APIs of the mounted custom FS for the kernel.
    const pwd = this.Module.FS.cwd();
    this.Module.FS.chdir('/');

    try {
      const { sharedLibs, paths } = await updatePackagesInEmscriptenFS({
        newLock,
        oldLock: this._lock,
        pythonVersion: this._pythonVersion,
        Module: this.Module,
        logger: this.logger,
        paths: this._paths
      });

      this._paths = paths;

      // Remove dynamic libs we already linked against, so we don't load them again
      this._sharedLibs = {};
      for (const pkg of Object.keys(sharedLibs)) {
        this._sharedLibs[pkg] = sharedLibs[pkg].filter(
          lib => !this._kernelSharedLibs.has(lib)
        );
      }

      // Load shared libs only for old emscripten versions
      if (this.emscriptenMajorVersion < 4) {
        await loadSharedLibs({
          sharedLibs: this._sharedLibs,
          prefix: '/',
          Module: this.Module,
          logger: this.logger
        });
      }

      this._lock = newLock;
    } finally {
      this.Module.FS.chdir(pwd);
    }
  }

  private _envKey = '';
  private _envModified = false;
  private _restoredPycs: string[] = [];
  private _emscriptenVersion: number | undefined = undefined;
  private _pythonVersion: number[] | undefined;
  private _prefix = '';

  private _pkgRootUrl = '';

  private _sharedLibs: TSharedLibsMap;
  private _kernelSharedLibs = new Set<string>();
  private _lock: ILock;
  private _paths = {};
}

export namespace XeusRemoteKernel {
  export interface IOptions {}
}
