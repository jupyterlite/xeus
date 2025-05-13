// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import { IXeusWorkerKernel } from './interfaces';
import {
  IEmpackEnvMeta,
  bootstrapEmpackPackedEnvironment,
  bootstrapPython,
  getPythonVersion,
  loadShareLibs,
  waitRunDependencies,
  ILogger,
  ISolvedPackages,
  solve,
  removePackagesFromEmscriptenFS,
  showPackagesList,
  IBootstrapData,
  parse
} from '@emscripten-forge/mambajs';
import { IUnpackJSAPI } from '@emscripten-forge/untarjs';
globalThis.Module = {};

// when a toplevel cell uses an await, the cell is implicitly
// wrapped in a async function. Since the webloop - eventloop
// implementation does not support `eventloop.run_until_complete(f)`
// we need to convert the toplevel future in a javascript Promise
// this `toplevel` promise is then awaited before we
// execute the next cell. After the promise is awaited we need
// to do some cleanup and delete the python proxy
// (ie a js-wrapped python object) to avoid memory leaks
globalThis.toplevel_promise = null;
globalThis.toplevel_promise_py_proxy = null;

declare function createXeusModule(options: any): any;

let kernelReady: (value: unknown) => void;
let rawXKernel: any;
let rawXServer: any;
const STREAM = { log: 'stdout', warn: 'stdout', error: 'stderr' };

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const json = await response.json();
  return json;
}

globalThis.ready = new Promise(resolve => {
  kernelReady = resolve;
});

export class XeusWorkerLogger implements ILogger {
  constructor(kernelId: string) {
    this._id = kernelId;
    this._channel = new BroadcastChannel('/xeus-kernel-logs-broadcast');
  }

  log(...msg: any[]): void {
    postMessage({
      _stream: {
        name: STREAM['log'],
        text: msg.join(' ') + '\n'
      }
    });

    this._channel.postMessage({
      kernelId: this._id,
      payload: { type: 'text', level: 'info', data: msg.join(' ') }
    });
  }

  warn(...msg: any[]): void {
    postMessage({
      _stream: {
        name: STREAM['warn'],
        text: msg.join(' ') + '\n'
      }
    });

    this._channel.postMessage({
      kernelId: this._id,
      payload: { type: 'text', level: 'warning', data: msg.join(' ') }
    });
  }

  error(...msg: any[]): void {
    postMessage({
      _stream: {
        name: STREAM['error'],
        evalue: msg.join(''),
        traceback: [],
        executionCount: this.executionCount,
        text: msg.join('')
      }
    });
    this._channel.postMessage({
      kernelId: this._id,
      payload: { type: 'text', level: 'critical', data: msg.join(' ') }
    });
  }

  private _id: string;
  private _channel: BroadcastChannel;
  executionCount: number = 0;
}

export abstract class XeusRemoteKernel {
  constructor(options: XeusRemoteKernel.IOptions = {}) {}

  async ready(): Promise<void> {
    return await globalThis.ready;
  }

  async cd(path: string): Promise<void> {
    if (!path || !globalThis.Module.FS) {
      return;
    }

    globalThis.Module.FS.chdir(path);
  }

  async isDir(path: string): Promise<boolean> {
    try {
      const lookup = globalThis.Module.FS.lookupPath(path);
      return globalThis.Module.FS.isDir(lookup.node.mode);
    } catch (e) {
      return false;
    }
  }

  async processMessage(event: any): Promise<void> {
    const msg_type = event.msg.header.msg_type;

    await globalThis.ready;

    if (
      globalThis.toplevel_promise !== null &&
      globalThis.toplevel_promise_py_proxy !== null
    ) {
      await globalThis.toplevel_promise;
      globalThis.toplevel_promise_py_proxy.delete();
      globalThis.toplevel_promise_py_proxy = null;
      globalThis.toplevel_promise = null;
    }

    if (msg_type === 'input_reply') {
      // Should never be called as input_reply messages are handled by get_stdin
      // via SharedArrayBuffer or service worker.
    } else if (msg_type === 'execute_request') {
      this._executionCount += 1;
      event.msg.content.code = await this.processMagics(event.msg.content.code);
      rawXServer.notify_listener(event.msg);
    } else {
      rawXServer.notify_listener(event.msg);
    }
  }

  _setInstalledPackages() {
    const installed = {};
    this._empackEnvMeta.packages.map((pkg: any) => {
      installed[pkg.filename] = {
        name: pkg.name,
        version: pkg.version,
        repo_url: pkg.repo_url ? pkg.repo_url : pkg.channel ? pkg.channel : '',
        filename: pkg.filename ? pkg.filename : '',
        filename_stem: pkg.filename_stem ? pkg.filename_stem : '',
        url: pkg.url ? pkg.url : '',
        repo_name: pkg.repo_name
          ? pkg.repo_name
          : pkg.channel
            ? pkg.channel
            : '',
        build_string: pkg.build
      };
    });
    this._installedPackages = installed;
  }

  async _install(channels: string[], specs: string[], pipSpecs: string[]) {
    if (specs.length || pipSpecs.length) {
      const packageNames = this.getPackageNames(specs, pipSpecs);
      try {
        this._logger.log(`Collecting ${packageNames?.join(',')}`);
        const newPackages = await solve({
          ymlOrSpecs: specs,
          installedPackages: this._installedPackages,
          pipSpecs,
          channels,
          logger: this._logger
        });

        await this._reloadPackages(
          {
            ...newPackages.condaPackages,
            ...newPackages.pipPackages
          },
          packageNames,
          this._logger
        );
      } catch (error: any) {
        this._logger.executionCount = this._executionCount;
        this._logger?.error(error.stack);
      }
    }
  }

  async processMagics(code: string) {
    const { commands, run } = parse(code);
    for (const command of commands) {
      switch (command.type) {
        case 'install':
          if (command.data) {
            const { channels, specs, pipSpecs } = command.data;
            await this._install(
              channels,
              specs as string[],
              pipSpecs as string[]
            );
          }
          break;
        case 'list':
          showPackagesList(this._installedPackages, this._logger);
          break;
        default:
          break;
      }
    }
    return run;
  }

  getPackageNames(specs: string[] | undefined, pipSpecs: string[] | undefined) {
    let pkgs: string[] = [];
    if (specs?.length && pipSpecs?.length) {
      pkgs = [...specs, ...pipSpecs];
    } else if (specs?.length) {
      pkgs = [...specs];
    } else if (pipSpecs?.length) {
      pkgs = [...pipSpecs];
    }
    const regex = /(\w+)(?:=\S*)?/g;

    const packageNames: string[] = [];
    let match: RegExpExecArray | null = regex.exec(pkgs.join(','));
    while (match !== null) {
      packageNames.push(match[1]);
      match = regex.exec(pkgs.join(','));
    }
    return packageNames;
  }

  async _reloadPackages(
    newPackages: ISolvedPackages,
    packageNames: string[],
    logger: ILogger
  ) {
    let text = '';

    if (Object.keys(newPackages).length) {
      logger.log(`Installing collected packages: ${packageNames.join(',')}`);

      await this.updateKernelPackages(newPackages);
      this._setInstalledPackages();

      await this._load();
      const collectedPkgs: string[] = [];
      packageNames.forEach((pkg: string) => {
        Object.keys(this._installedPackages).map((filename: string) => {
          if (filename.includes(pkg)) {
            collectedPkgs.push(
              `${this._installedPackages[filename].name}-${this._installedPackages[filename].version}`
            );
          }
        });
      });
      text = `Successfully installed: ${collectedPkgs?.join(',')}\n`;
      logger.log(text);
    } else {
      text = `There are no available packages: ${packageNames.join(',')}\n`;
      logger.warn(text);
    }
  }

  async updateKernelPackages(pkgs: ISolvedPackages): Promise<any> {
    const removeList: any = [];
    const newPackages: any = [];

    Object.keys(pkgs).map((filename: string) => {
      const newPkg = pkgs[filename];
      this._empackEnvMeta.packages.map((oldPkg: any) => {
        if (
          newPkg.name === oldPkg.name &&
          (newPkg.version !== oldPkg.version || filename !== oldPkg.filename)
        ) {
          removeList.push(oldPkg);
        }
      });
      const tmpPkg = {
        name: newPkg.name,
        url: newPkg.url,
        filename,
        version: newPkg.version,
        build: newPkg.build_string,
        repo_name: newPkg.repo_name,
        repo_url: newPkg.repo_url
      };
      newPackages.push(tmpPkg);
    });
    if (Object.keys(removeList).length) {
      await removePackagesFromEmscriptenFS({
        removeList,
        Module: globalThis.Module,
        paths: this._paths,
        logger: this._logger
      });
    }

    this._empackEnvMeta.packages = [...newPackages];
  }

  async initialize(options: IXeusWorkerKernel.IOptions): Promise<void> {
    const {
      baseUrl,
      browsingContextId,
      kernelSpec,
      empackEnvMetaLink,
      kernelId
    } = options;

    this._logger = new XeusWorkerLogger(kernelId);

    // location of the kernel binary on the server
    const binary_js = URLExt.join(baseUrl, kernelSpec.argv[0]);
    const binary_wasm = binary_js.replace('.js', '.wasm');
    const binary_data = binary_js.replace('.js', '.data');
    const kernel_root_url = URLExt.join(
      baseUrl,
      'xeus',
      'kernels',
      kernelSpec.dir
    );

    const sharedLibs =
      kernelSpec.metadata && kernelSpec.metadata.shared
        ? kernelSpec.metadata.shared
        : {};

    importScripts(binary_js);
    globalThis.Module = await createXeusModule({
      locateFile: (file: string) => {
        if (file in sharedLibs) {
          return URLExt.join(kernel_root_url, file);
        }

        if (file.endsWith('.wasm')) {
          return binary_wasm;
        } else if (file.endsWith('.data')) {
          // Handle the .data file if it exists
          return binary_data;
        }

        return file;
      }
    });
    try {
      await waitRunDependencies(globalThis.Module);
      if (
        globalThis.Module.FS !== undefined &&
        globalThis.Module.loadDynamicLibrary !== undefined
      ) {
        const empackEnvMetaLocation = empackEnvMetaLink || kernel_root_url;
        const packagesJsonUrl = `${empackEnvMetaLocation}/empack_env_meta.json`;
        this._pkgRootUrl = URLExt.join(
          baseUrl,
          `xeus/kernels/${kernelSpec.name}/kernel_packages`
        );
        this._empackEnvMeta = (await fetchJson(
          packagesJsonUrl
        )) as IEmpackEnvMeta;

        this._setInstalledPackages();
        this._activeKernel = kernelSpec.name;
        await this._load();
      }

      this._initializeStdin(baseUrl, browsingContextId);
      // backward compatibility: Checking if the kernel constructor takes argument or not
      try {
        rawXKernel = new globalThis.Module.xkernel(kernelSpec.argv);
      } catch (e) {
        rawXKernel = new globalThis.Module.xkernel();
      }
      rawXServer = rawXKernel.get_server();
      if (!rawXServer) {
        this._logger.error('Failed to start kernel!');
      }
      rawXKernel.start();
    } catch (e) {
      if (typeof e === 'number') {
        const msg = globalThis.Module.get_exception_message(e);
        this._logger.error(msg);
        throw new Error(msg);
      } else {
        this._logger.error(e);
        throw e;
      }
    }

    this._logger.log('Kernel successfuly started!');

    kernelReady(1);
  }

  async _load() {
    const { sharedLibs, paths, untarjs }: IBootstrapData =
      await bootstrapEmpackPackedEnvironment({
        empackEnvMeta: this._empackEnvMeta,
        pkgRootUrl: this._pkgRootUrl,
        untarjs: this._untarjs,
        Module: globalThis.Module,
        logger: this._logger
      });
    this._paths = paths;
    if (!this._untarjs) {
      this._untarjs = untarjs;
    }
    // Bootstrap Python, if it's xeus-python
    if (this._activeKernel === 'xpython' && !this._isPythonInstalled) {
      const pythonVersion = getPythonVersion(this._empackEnvMeta.packages);

      if (!pythonVersion) {
        throw new Error('Failed to load Python!');
      }

      this._logger.log('Starting Python');

      await bootstrapPython({
        prefix: this._empackEnvMeta.prefix,
        pythonVersion: pythonVersion,
        Module: globalThis.Module
      });
      this._isPythonInstalled = true;
    }

    // Load shared libs
    await loadShareLibs({
      sharedLibs,
      prefix: this._empackEnvMeta.prefix,
      Module: globalThis.Module,
      logger: this._logger
    });
  }

  /**
   * Setup custom Emscripten FileSystem
   */
  abstract mount(
    driveName: string,
    mountpoint: string,
    baseUrl: string,
    browsingContextId: string
  ): Promise<void>;

  /**
   * Add get_stdin function to globalThis that takes an input_request message, blocks
   * until the corresponding input_reply is received and returns the input_reply message.
   * If an error occurs return an object of the form { error: "Error explanation" }
   * This function is called by xeus-lite's get_stdin.
   */
  protected abstract _initializeStdin(
    baseUrl: string,
    browsingContextId: string
  ): void;

  private _logger: XeusWorkerLogger;
  private _empackEnvMeta: IEmpackEnvMeta;
  private _isPythonInstalled = false;
  private _pkgRootUrl = '';
  private _activeKernel = '';
  private _installedPackages = {};
  private _paths = {};
  private _executionCount = 0;
  private _untarjs: IUnpackJSAPI | undefined;
}

export namespace XeusRemoteKernel {
  export interface IOptions {}
}
