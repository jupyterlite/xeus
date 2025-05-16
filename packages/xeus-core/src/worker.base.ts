// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import { IXeusWorkerKernel } from './interfaces';
import { waitRunDependencies, ILogger, parse } from '@emscripten-forge/mambajs';

declare function createXeusModule(options: any): any;

const STREAM = { log: 'stdout', warn: 'stdout', error: 'stderr' };

export class XeusWorkerLoggerBase implements ILogger {
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

/**
 * The base class for the worker kernel
 *
 * Meant to be extended in order to load kernels from other sources, implement custom magics etc.
 */
export abstract class XeusRemoteKernelBase {
  constructor(options: XeusRemoteKernelBase.IOptions = {}) {
    this._ready = new Promise(resolve => {
      this.setKernelReady = resolve;
    });
  }

  async ready(): Promise<void> {
    return await this._ready;
  }

  async cd(path: string): Promise<void> {
    if (!path || !this.Module.FS) {
      return;
    }

    this.Module.FS.chdir(path);
  }

  async isDir(path: string): Promise<boolean> {
    try {
      const lookup = this.Module.FS.lookupPath(path);
      return this.Module.FS.isDir(lookup.node.mode);
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
      this.logger.executionCount += 1;
      event.msg.content.code = await this.processMagics(event.msg.content.code);
      this.xserver.notify_listener(event.msg);
    } else {
      this.xserver.notify_listener(event.msg);
    }
  }

  protected get Module() {
    return globalThis.Module;
  }

  protected set Module(value: any) {
    globalThis.Module = value;
  }

  async initialize(options: IXeusWorkerKernel.IOptions): Promise<void> {
    const { baseUrl, browsingContextId, kernelSpec } = options;

    this.logger = this.initializeLogger(options);

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

    this.Module = await this.initializeModule(options);
    this.Module = await createXeusModule(this.Module);

    try {
      await waitRunDependencies(this.Module);

      await this.initializeFileSystem(options);
      await this.initializeInterpreter(options);
      this.initializeStdin(baseUrl, browsingContextId);

      try {
        this.xkernel = new this.Module.xkernel(kernelSpec.argv);
      } catch (e) {
        this.xkernel = new this.Module.xkernel();
      }
      this.xserver = this.xkernel.get_server();
      if (!this.xserver) {
        this.logger.error('Failed to start kernel!');
      }
      this.xkernel.start();
    } catch (e) {
      if (typeof e === 'number') {
        const msg = this.Module.get_exception_message(e);
        this.logger.error(msg);
        throw new Error(msg);
      } else {
        this.logger.error(e);
        throw e;
      }
    }

    this.logger.log('Kernel successfuly started!');

    this.setKernelReady();
  }

  protected initializeLogger(
    options: IXeusWorkerKernel.IOptions
  ): XeusWorkerLoggerBase {
    return new XeusWorkerLoggerBase(options.kernelId);
  }

  /**
   * Initialize the emscripten Module
   * @param options
   */
  protected abstract initializeModule(options: IXeusWorkerKernel.IOptions): any;

  /**
   * Initialize the this.Module.FS as needed
   * @param options
   */
  protected abstract initializeFileSystem(
    options: IXeusWorkerKernel.IOptions
  ): Promise<any>;

  /**
   * Initialize the interpreter if needed
   * @param options
   */
  protected abstract initializeInterpreter(
    options: IXeusWorkerKernel.IOptions
  ): Promise<any>;

  /**
   * Add get_stdin function to globalThis that takes an input_request message, blocks
   * until the corresponding input_reply is received and returns the input_reply message.
   * If an error occurs return an object of the form { error: "Error explanation" }
   * This function is called by xeus-lite's get_stdin.
   */
  protected abstract initializeStdin(
    baseUrl: string,
    browsingContextId: string
  ): void;

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
   * Implements dynamic installation of packages
   */
  protected abstract install(
    channels: string[],
    specs: string[],
    pipSpecs: string[]
  ): Promise<void>;

  /**
   * Implements dynamic installation of packages
   */
  protected abstract listInstalledPackages(): Promise<void>;

  /**
   * Process magics prior to executing code
   * @returns the runnable code without magics
   */
  protected async processMagics(code: string) {
    const { commands, run } = parse(code);
    for (const command of commands) {
      switch (command.type) {
        case 'install':
          if (command.data) {
            const { channels, specs, pipSpecs } = command.data;
            await this.install(
              channels,
              specs as string[],
              pipSpecs as string[]
            );
          }
          break;
        case 'list':
          await this.listInstalledPackages();
          break;
        default:
          break;
      }
    }
    return run;
  }

  protected xkernel: any;
  protected xserver: any;

  protected setKernelReady: (value: void) => void;

  private _ready: Promise<void>;

  protected logger: XeusWorkerLoggerBase;
}

export namespace XeusRemoteKernelBase {
  export interface IOptions {}
}
