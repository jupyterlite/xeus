// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import type { DriveFS } from '@jupyterlite/contents';
import { IXeusWorkerKernel } from './tokens';
import { bootstrapFromEmpackPackedEnvironment, IPackagesInfo} from "@emscripten-forge/mambajs"

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

async function get_stdin() {
  const replyPromise = new Promise(resolve => {
    resolveInputReply = resolve;
  });
  return replyPromise;
}

(self as any).get_stdin = get_stdin;

async function waitRunDependency() {
  const promise = new Promise<void>(resolve => {
    globalThis.Module.monitorRunDependencies = (n: number) => {
      if (n === 0) {
        resolve();
      }
    };
  });
  // If there are no pending dependencies left, monitorRunDependencies will
  // never be called. Since we can't check the number of dependencies,
  // manually trigger a call.
  globalThis.Module.addRunDependency('dummy');
  globalThis.Module.removeRunDependency('dummy');
  return promise;
}

globalThis.ready = new Promise(resolve => {
  kernelReady = resolve;
});

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
    } else {
      rawXServer.notify_listener(event.msg);
    }
  }

  async initialize(options: IXeusWorkerKernel.IOptions): Promise<void> {
    const { baseUrl, kernelSpec, empackEnvMetaLink } = options;
    // location of the kernel binary on the server
    const binary_js = URLExt.join(baseUrl, kernelSpec.argv[0]);
    const binary_wasm = binary_js.replace('.js', '.wasm');

    importScripts(binary_js);
    globalThis.Module = await createXeusModule({
      locateFile: (file: string) => {
        if (file.endsWith('.wasm')) {
          return binary_wasm;
        }
        return file;
      }
    });
    try {
      await waitRunDependency();
      if (globalThis.Module['async_init'] !== undefined) {
      // each kernel can have a `async_init` function
      // which can do kernel specific **async** initialization
      // This function is usually implemented in the pre/post.js
      // in the emscripten build of that kernel

      const kernel_root_url = empackEnvMetaLink
          ? empackEnvMetaLink
          : URLExt.join(baseUrl, `xeus/kernels/${kernelSpec.dir}`);
          const verbose = true;

      //if the kernel is not xeus-python than we have to avoid using pyjs
     
        const packagesJsonUrl = `${kernel_root_url}/empack_env_meta.json`;
        let packageData: IPackagesInfo = {};
        try{ 
          packageData = await bootstrapFromEmpackPackedEnvironment(packagesJsonUrl, verbose, false, globalThis.Module);
        } catch(error: any) {
          
          throw new Error(error.message);
        }
        if (kernelSpec.name === 'xpython') {
          if (Object.keys(packageData).length) { 
            let {pythonVersion, prefix} = packageData;
            if (pythonVersion) {
              await globalThis.Module['init_python_phases']( pythonVersion, prefix, verbose);
            }
        }
        }
    }

      await waitRunDependency();

      rawXKernel = new globalThis.Module.xkernel();
      rawXServer = rawXKernel.get_server();
      if (!rawXServer) {
        console.error('Failed to start kernel!');
      }
      rawXKernel.start();
    } catch (e) {
      if (typeof e === 'number') {
        const msg = globalThis.Module.get_exception_message(e);
        console.error(msg);
        throw new Error(msg);
      } else {
        console.error(e);
        throw e;
      }
    }

    kernelReady(1);
  }

  /**
   * Register the callback function to send messages from the worker back to the main thread.
   * @param callback the callback to register
   */
  registerCallback(callback: (msg: any) => void): void {
    this._sendWorkerMessage = callback;
  }

  protected _driveName = '';
  protected _driveFS: DriveFS | null = null;
  protected _sendWorkerMessage: (msg: any) => void = () => {};
}

export namespace XeusRemoteKernel {
  export interface IOptions {}
}
