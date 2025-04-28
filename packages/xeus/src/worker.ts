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
  removePackagesFromEmscriptenFS
} from '@emscripten-forge/mambajs';
import { parseCommandLine } from './tools';
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

let resolveInputReply: any;
let kernelReady: (value: unknown) => void;
let rawXKernel: any;
let rawXServer: any;
const names = { log: 'stdout', warn: 'stdout', error: 'stderr' };

async function get_stdin() {
  const replyPromise = new Promise(resolve => {
    resolveInputReply = resolve;
  });
  return replyPromise;
}

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const json = await response.json();
  return json;
}

(self as any).get_stdin = get_stdin;

globalThis.ready = new Promise(resolve => {
  kernelReady = resolve;
});

export class XeusWorkerLogger implements ILogger {
  constructor(kernelId: string) {
    this._channel = new BroadcastChannel(`/kernel-broadcast/${kernelId}`);
  }

  log(...msg: any[]): void {
    this._channel.postMessage({ type: 'log', msg: msg.join(' ') });
  }

  warn(...msg: any[]): void {
    this._channel.postMessage({ type: 'warn', msg: msg.join(' ') });
  }

  error(...msg: any[]): void {
    this._channel.postMessage({ type: 'error', msg: msg.join(' ') });
  }

  private _channel: BroadcastChannel;
}

export class XeusRemoteKernel {
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
      resolveInputReply(event.msg);
    } else if (msg_type === 'execute_request') {
      const code = event.msg.content.code;
      event.msg.content.code = await this._installPackages(code);
      rawXServer.notify_listener(event.msg);
    } else {
      rawXServer.notify_listener(event.msg);
    }
  }

  _getInstalledPackages() {
    return this._installedPackages;
  }

  _setInstalledPackages() {
    const installed = {};
    this._empackEnvMeta.packages.map((pkg: any) => {
      installed[pkg.filename] = {
        name: pkg.name,
        version: pkg.version,
        repo_url: pkg.repo_url ? pkg.repo_url : '',
        repo_name: pkg.repo_name ? pkg.repo_name : '',
        build_string: pkg.build
      };
    });
    this._installedPackages = installed;
  }

  _showPackagesList() {
    const installedPackages = this._getInstalledPackages();

    const nameWidth = 30;
    const versionWidth = 30;
    const buildWidth = 30;

    this.showMessage(`${'Name'.padEnd(nameWidth)}${'Version'.padEnd(versionWidth)}${'Build'.padEnd(buildWidth)} \n`, 'log');

    this.showMessage('─'.repeat(nameWidth + versionWidth + buildWidth) + '\n', 'log');


    Object.keys(installedPackages).forEach(filename => {
      const text = `${installedPackages[filename].name.padEnd(nameWidth)}${installedPackages[filename].version.padEnd(versionWidth)}${installedPackages[filename].build_string.padEnd(buildWidth)} \n`;
      this.showMessage(text, 'log');
    });
  }

   showMessage(text: string, log: string){
    postMessage({
      _stream: {
        name: names[log],
        text
      }
    });
  }

  showSolverInformation(packages:ISolvedPackages, time:number) {
    this.showMessage(`Solving took ${time/1000} seconds \n`, 'log');
    this.showMessage('Solved environment!\n', 'log');
    Object.keys(packages).map((filename)=>{
      const {name, version, build_string} = packages[filename];
      this.showMessage(`${name} ${version} ${build_string}\n`, 'log');
    });
  }

  async _installPackages(code: string) {
    const commandNames = [
      'micromamba',
      'un',
      'mamba',
      'conda',
      'rattler',
      'pip'
    ];
    let isInstallCommand = false;
    let isListCommand = false;
    commandNames.forEach((command: string) => {
      if (code.includes(`${command} install`)) {
        isInstallCommand = true;
      } else if (code.includes(`${command} list`)) {
        isListCommand = true;
      }
    });
    if (isInstallCommand || isListCommand) {
      const { install, run, list } = parseCommandLine(code);
      if (list.includes(true)) {
        this._showPackagesList();
      }

      if (install.specs || install.pipSpecs) {
        const installedPackages = this._getInstalledPackages();
        const packageNames = this.getPackageNames(
          install.specs,
          install.pipSpecs
        );
        try {
          this.showMessage(`Collecting ${packageNames?.join(',')} \nSolving environment...\n`, 'log');
          const start = performance.now();
          const newPackages = await solve({
            ymlOrSpecs: install.specs ? install.specs : [],
            installedPackages,
            pipSpecs: install.pipSpecs ? install.pipSpecs : [],
            channels: install.channels,
            logger: this._logger
          });
          const end = performance.now();
          const time = end - start;
          this.showSolverInformation({...newPackages.condaPackages, ...newPackages.pipPackages}, time);

          await this._reloadPackages(
            {
              ...newPackages.condaPackages,
              ...newPackages.pipPackages
            },
            packageNames
          );
        } catch (error: any) {
          postMessage({
            _stream: {
              name: names['error'],
              text: `${error.message}\n ${error.stack}`
            }
          });
          this._logger?.error(error);
        }
      }
      code = run || '';
    }

    return code;
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

    let packageNames: string[] = [];
    let match: RegExpExecArray | null = regex.exec(pkgs.join(','));
    while (match !== null) {
      packageNames.push(match[1]);
      match = regex.exec(pkgs.join(','));
    }
    return packageNames;
  }

  async _reloadPackages(newPackages: ISolvedPackages, packageNames: string[]) {
    let text = '';

    if (Object.keys(newPackages).length) {
      postMessage({
        _stream: {
          name: names['log'],
          text: `Installing collected packages: ${packageNames.join(',')}\n`
        }
      });

      await this.updateKernelPackages(newPackages);
      this._setInstalledPackages();

      await this._load();
      let collectedPkgs: string[] = [];
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
      postMessage({
        _stream: {
          name: names['log'],
          text
        }
      });
    } else {
      text = `There are no available packages: ${packageNames.join(',')}\n`;
      postMessage({
        _stream: {
          name: names['warn'],
          text
        }
      });
    }
  }

  async updateKernelPackages(pkgs: ISolvedPackages): Promise<any> {
    const removeList: any = [];
    const newPackages: any = [];
    Object.keys(pkgs).map((filename: string) => {
      const newPkg = pkgs[filename];
      this._empackEnvMeta.packages.map((oldPkg: any) => {
        if (newPkg.name === oldPkg.name && newPkg.version !== oldPkg.version) {
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
    const { baseUrl, kernelSpec, empackEnvMetaLink, kernelId } = options;

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
        //if (!this._empackEnvMeta) {
        this._empackEnvMeta = (await fetchJson(
          packagesJsonUrl
        )) as IEmpackEnvMeta;
        //     }
        this._setInstalledPackages();
        this._activeKernel = kernelSpec.name;
        await this._load();
      }

      rawXKernel = new globalThis.Module.xkernel();
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
    const { sharedLibs, paths } = await bootstrapEmpackPackedEnvironment({
      empackEnvMeta: this._empackEnvMeta,
      pkgRootUrl: this._pkgRootUrl,
      Module: globalThis.Module,
      logger: this._logger
    });
    this._paths = paths;

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

  private _logger: XeusWorkerLogger;
  private _empackEnvMeta: IEmpackEnvMeta;
  private _isPythonInstalled = false;
  private _pkgRootUrl = '';
  private _activeKernel = '';
  private _installedPackages = {};
  private _paths = {};
}

export namespace XeusRemoteKernel {
  export interface IOptions {}
}
