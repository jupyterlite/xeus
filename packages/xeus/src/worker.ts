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
  showPackagesList
} from '@emscripten-forge/mambajs';
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
const names = { log: 'stdout', warn: 'stdout', error: 'stderr' };

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

namespace CommandParser {
  export interface IParsedCommands {
    install: IInstallationCommandOptions;
    run: string;
  }

  export interface IInstallationCommandOptions {
    channels?: string[];
    specs?: string[];
    pipSpecs?: string[];
    isPipCommand?: boolean;
  }

  export interface ICommands extends IParsedCommands {
    list: boolean[];
  }
  export type SpecTypes = 'specs' | 'pipSpecs';
}

/**
 * Parser of installation command
 */
class CommandParser {
  constructor() {}

  /**
   * Parses a command-line string and classifies it into installation commands,
   * runnable code, or conda list operations.
   *
   * - If the code is a list command, it sets the `list` flag to true.
   * - If the code contains conda or pip installation command, then it tries to parse it
   * - Otherwise code will be executed as it is
   *
   * @param {string} code - The raw command-line input string to be parsed.
   * @returns {CommandParser.ICommands} An object containing:
   *  - parsed installation options,
   *  - run command code,
   *  - and a list flag indicating whether a list command was detected.
   */
  parseCommandLine(code: string): CommandParser.ICommands {
    let result: CommandParser.ICommands = {
      install: {},
      run: code,
      list: [false]
    };
    const codeLines = code.split('\n');
    if (codeLines.length > 1) {
      result = { ...this._parseLines(codeLines) };
    } else {
      if (this._hasCondaListCommand(code)) {
        result = { install: result.install, run: '', list: [true] };
      } else {
        result = { ...this._parseCommand(code), list: [false] };
      }
    }
    return result;
  }

  /**
   * Parses one row of code and detects whether it is conda or pip installation command.
   * runnable code, or conda list operations.
   *
   * @param {string} code - The raw command-line input string to be parsed.
   * @returns {CommandParser.IParsedCommands} An object containing:
   *  - parsed installation options,
   *  - run command code
   */
  _parseCommand(code: string): CommandParser.IParsedCommands {
    const run = code;
    let isPipCommand = false;
    const isCondaCommand = this._hasCondaInstallCommand(code);
    code = this._isCondaCodeLine(code);

    if (!isCondaCommand && code.includes('%pip install')) {
      code = code.replace('%pip install', '');
      isPipCommand = true;
    }
    let result: CommandParser.IInstallationCommandOptions = {
      channels: [],
      specs: [],
      pipSpecs: []
    };
    if ((isCondaCommand || isPipCommand) && code) {
      if (isPipCommand) {
        result = this._parsePipCommand(code);
      } else {
        result = this._parseCondaCommand(code);
      }

      return { install: { ...result, isPipCommand }, run: '' };
    } else {
      return { install: {}, run };
    }
  }

  /**
   * Parses multiply lines
   *
   * @param {string[]} codeLines - The command line which should be parsed.
   * @returns {CommandParser.ICommands} An object containing:
   *  - parsed installation options,
   *  - run command code,
   *  - and a list flag indicating whether a list command was detected.
   */

  _parseLines(codeLines: string[]): CommandParser.ICommands {
    const installCommands: string[] = [];
    const runCommands: string[] = [];
    const listCommand: boolean[] = [];

    let channels: string[] = [];
    let specs: string[] = [];
    let pipSpecs: string[] = [];
    codeLines.forEach((line: string) => {
      if (this._hasCondaInstallCommand(line) || this._hasPipCommand(line)) {
        installCommands.push(line);
      } else if (this._hasCondaListCommand(line)) {
        listCommand.push(true);
      } else {
        runCommands.push(line);
      }
    });

    if (installCommands.length) {
      let tmpResult: CommandParser.IParsedCommands = {
        install: {
          channels: [],
          specs: [],
          pipSpecs: []
        },
        run: ''
      };
      installCommands.forEach((line: string) => {
        tmpResult = { ...this._parseCommand(line) };
        channels = tmpResult.install.channels
          ? [...channels, ...tmpResult.install.channels]
          : channels;
        specs = tmpResult.install.specs
          ? [...specs, ...tmpResult.install.specs]
          : specs;
        pipSpecs = tmpResult.install.pipSpecs
          ? [...pipSpecs, ...tmpResult.install.pipSpecs]
          : pipSpecs;
      });
    }

    return {
      install: { channels, specs, pipSpecs },
      run: runCommands ? runCommands.join('\n') : '',
      list: listCommand ? listCommand : [false]
    };
  }

  /**
   * Detects whether the line has conda installation commands
   * and replace the patter '[commandNames] install' for futher calculations
   *
   * @param {string} code - The command line which should be parsed.
   * @returns {string} - Can be as part of conda installation command and as code
   */
  _isCondaCodeLine(code: string) {
    const commandNames = ['micromamba', 'un', 'mamba', 'conda', 'rattler'];
    commandNames.forEach((name: string) => {
      if (code.includes(`%${name} install`)) {
        code = code.replace(`%${name} install`, '');
      }
    });

    return code;
  }

  /**
   * Detects whether the line has conda installation commands
   *
   * @param {string} code - The command line which should be parsed.
   * @returns {boolean} - True if it is a conda installation command
   */
  _hasCondaInstallCommand(code: string) {
    let isCondaCommand = false;
    const commandNames = ['micromamba', 'un', 'mamba', 'conda', 'rattler'];
    commandNames.forEach((name: string) => {
      if (code.includes(`%${name} install`)) {
        isCondaCommand = true;
      }
    });

    return isCondaCommand;
  }

  /**
   * Detects whether the line is to list installed packages
   *
   * @param {string} code - The command line which should be parsed.
   * @returns {boolean} - True if it is list command
   */
  _hasCondaListCommand(code: string) {
    let isCondaListCommand = false;
    const commandNames = ['micromamba', 'un', 'mamba', 'conda', 'rattler'];
    commandNames.forEach((name: string) => {
      if (code === `%${name} list`) {
        isCondaListCommand = true;
      }
    });

    return isCondaListCommand;
  }

  /**
   * Detects whether the line has pip installation commands
   *
   * @param {string} code - The command line which should be parsed.
   * @returns {boolean} - True if it is a pip installation command
   */
  _hasPipCommand(code: string) {
    let isPipCommand = false;
    if (code.includes('%pip install')) {
      isPipCommand = true;
    }

    return isPipCommand;
  }

  /**
   * Parse conda installation command
   *
   * @param {string} input - The command line which should be parsed.
   * @returns {CommandParser.IInstallationCommandOptions} An object containing:
   *  - channels,
   *  - conda packages for installing,
   *  - pip packages for installing
   */
  _parseCondaCommand = (
    input: string
  ): CommandParser.IInstallationCommandOptions => {
    const parts = input.split(' ');
    const channels: string[] = [];
    const specs: string[] = [];
    const pipSpecs: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part) {
        const j = i + 1;

        if (part === '-c' && j < parts.length && !parts[j].startsWith('-')) {
          channels.push(parts[j]);
          i++;
        } else {
          specs.push(part);
        }
      }
    }

    return {
      channels,
      specs,
      pipSpecs
    };
  };

  /**
   * Parse pip installation command
   *
   * @param {string} input - The command line which should be parsed.
   * @returns {CommandParser.IInstallationCommandOptions} An object containing:
   *  - channels,
   *  - conda packages for installing,
   *  - pip packages for installing
   */

  _parsePipCommand = (
    input: string
  ): CommandParser.IInstallationCommandOptions => {
    const parts = input.split(' ');
    let skip = false;
    const limits = [
      '--index-url',
      '.whl',
      'tar.gz',
      '--extra-index-url',
      'http',
      'https',
      'git',
      './',
      '-r',
      '--extra-index-url'
    ];

    const flags = [
      '--upgrade',
      '--pre',
      '--no-cache-dir',
      '--user',
      '--upgrade',
      '--no-deps'
    ];

    const pipSpecs: string[] = [];

    limits.map((options: string) => {
      if (input.includes(options)) {
        skip = true;
      }
    });
    if (!skip) {
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part) {
          if (!flags.includes(part)) {
            pipSpecs.push(part);
          }
        }
      }
    }

    return {
      channels: [],
      specs: [],
      pipSpecs
    };
  };
}

export class XeusWorkerLogger implements ILogger {
  constructor(kernelId: string) {
    this._channel = new BroadcastChannel(`/kernel-broadcast/${kernelId}`);
  }

  log(...msg: any[]): void {
    postMessage({
      _stream: {
        name: names['log'],
        text: msg.join(' ') + '\n'
      }
    });
    this._channel.postMessage({ type: 'log', msg: msg.join(' ') });
  }

  warn(...msg: any[]): void {
    postMessage({
      _stream: {
        name: names['warn'],
        text: msg.join(' ') + '\n'
      }
    });
    this._channel.postMessage({ type: 'warn', msg: msg.join(' ') });
  }

  error(...msg: any[]): void {
    const [firstEl, ...rest] = msg;
    let executionCount = 0;
    let evalue = '';
    if (msg !== undefined) {
      if (typeof firstEl === 'number') {
        executionCount = firstEl;
        evalue = rest.join('');
      } else {
        evalue = msg.join('');
      }
      postMessage({
        _stream: {
          name: names['error'],
          evalue,
          traceback: [],
          executionCount,
          text: evalue
        }
      });

      this._channel.postMessage({ type: 'error', msg: msg.join(' ') });
    }
  }

  private _channel: BroadcastChannel;
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
      // Should never be called as input_reply messages are returned via service worker
    } else if (msg_type === 'execute_request') {
      this._executionCount += 1;
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
  /*
  _getKernelLogger(): ILogger {
    return {
      log(...msg: any[]): void {
        postMessage({
          _stream: {
            name: names['log'],
            text: msg.join(' ') + '\n'
          }
        });
      },

      warn(...msg: any[]): void {
        postMessage({
          _stream: {
            name: names['warn'],
            text: msg.join(' ') + '\n'
          }
        });
      },

      error({
        evalue,
        traceback,
        executionCount
      }: {
        evalue: string;
        traceback?: string[];
        executionCount?: 0;
      }): void {
        if (evalue !== undefined) {
          postMessage({
            _stream: {
              name: names['error'],
              evalue,
              traceback,
              executionCount,
              text: `${evalue}${traceback?.length? traceback.join(''):''}`
            }
          });
        }
      }
    };
  }
*/
  _setInstalledPackages() {
    let installed = {};
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
      const commandParser = new CommandParser();
      const { install, run, list } = commandParser.parseCommandLine(code);
      const installedPackages = this._getInstalledPackages();
      if (list.includes(true)) {
        showPackagesList(installedPackages, this._logger);
      }

      if (install.specs || install.pipSpecs) {
        const packageNames = this.getPackageNames(
          install.specs,
          install.pipSpecs
        );
        try {
          this._logger.log(`Collecting ${packageNames?.join(',')}`);
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
          this._logger.log(`Solving took ${time / 1000} seconds`);

          await this._reloadPackages(
            {
              ...newPackages.condaPackages,
              ...newPackages.pipPackages
            },
            packageNames,
            this._logger
          );
        } catch (error: any) {
          this._logger?.error(this._executionCount, error.stack);
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
        //if (!this._empackEnvMeta) {
        this._empackEnvMeta = (await fetchJson(
          packagesJsonUrl
        )) as IEmpackEnvMeta;
        //     }
        this._setInstalledPackages();
        this._activeKernel = kernelSpec.name;
        await this._load();
      }

      this._initializeStdin(baseUrl, browsingContextId);

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
}

export namespace XeusRemoteKernel {
  export interface IOptions {}
}
