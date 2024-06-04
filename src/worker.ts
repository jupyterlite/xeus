// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import coincident from 'coincident';

import {
  ContentsAPI,
  DriveFS,
  TDriveRequest,
  TDriveMethod,
  TDriveResponse,
  ServiceWorkerContentsAPI
} from '@jupyterlite/contents';

import { URLExt } from '@jupyterlab/coreutils';

declare function createXeusModule(options: any): any;

globalThis.Module = {};

const workerAPI = coincident(self) as typeof globalThis;

/**
 * An Emscripten-compatible synchronous Contents API using shared array buffers.
 */
export class SharedBufferContentsAPI extends ContentsAPI {
  request<T extends TDriveMethod>(data: TDriveRequest<T>): TDriveResponse<T> {
    return workerAPI.processDriveRequest(data);
  }
}

class XeusDriveFS extends DriveFS {
  createAPI(options: DriveFS.IOptions): ContentsAPI {
    if (crossOriginIsolated) {
      return new SharedBufferContentsAPI(
        options.driveName,
        options.mountpoint,
        options.FS,
        options.ERRNO_CODES
      );
    } else {
      return new ServiceWorkerContentsAPI(
        options.baseUrl,
        options.driveName,
        options.mountpoint,
        options.FS,
        options.ERRNO_CODES
      );
    }
  }
}

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

let resolveInputReply: any;
let drive: XeusDriveFS;
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

workerAPI.mount = (
  driveName: string,
  mountpoint: string,
  baseUrl: string
): void => {
  const { FS, PATH, ERRNO_CODES } = globalThis.Module;

  if (!FS) {
    return;
  }

  drive = new XeusDriveFS({
    FS,
    PATH,
    ERRNO_CODES,
    baseUrl,
    driveName,
    mountpoint
  });

  FS.mkdir(mountpoint);
  FS.mount(drive, {}, mountpoint);
  FS.chdir(mountpoint);
};

workerAPI.ready = async (): Promise<void> => {
  return await globalThis.ready;
};

workerAPI.cd = (path: string) => {
  if (!path || !globalThis.Module.FS) {
    return;
  }

  globalThis.Module.FS.chdir(path);
};

workerAPI.isDir = (path: string) => {
  try {
    const lookup = globalThis.Module.FS.lookupPath(path);
    return globalThis.Module.FS.isDir(lookup.node.mode);
  } catch (e) {
    return false;
  }
};

workerAPI.processMessage = async (event: any): Promise<void> => {
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
};

workerAPI.initialize = async (kernel_spec: any, base_url: string) => {
  // location of the kernel binary on the server
  const binary_js = URLExt.join(base_url, kernel_spec.argv[0]);
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

    // each kernel can have a `async_init` function
    // which can do kernel specific **async** initialization
    // This function is usually implemented in the pre/post.js
    // in the emscripten build of that kernel
    if (globalThis.Module['async_init'] !== undefined) {
      const kernel_root_url = URLExt.join(
        base_url,
        `xeus/kernels/${kernel_spec.dir}`
      );
      const pkg_root_url = URLExt.join(base_url, 'xeus/kernel_packages');
      const verbose = true;
      await globalThis.Module['async_init'](
        kernel_root_url,
        pkg_root_url,
        verbose
      );
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
};
