// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import { expose } from 'comlink';

import {
  DriveFS,
  DriveFSEmscriptenNodeOps,
  IEmscriptenFSNode,
  IStats
} from '@jupyterlite/contents';
import { URLExt } from '@jupyterlab/coreutils';

declare function createXeusModule(options: any): any;

globalThis.Module = {};

class StreamNodeOps extends DriveFSEmscriptenNodeOps {
  private getNode(nodeOrStream: any) {
    if (nodeOrStream['node']) {
      return nodeOrStream['node'];
    }
    return nodeOrStream;
  }

  lookup(parent: IEmscriptenFSNode, name: string): IEmscriptenFSNode {
    return super.lookup(this.getNode(parent), name);
  }

  getattr(node: IEmscriptenFSNode): IStats {
    return super.getattr(this.getNode(node));
  }

  setattr(node: IEmscriptenFSNode, attr: IStats): void {
    super.setattr(this.getNode(node), attr);
  }

  mknod(
    parent: IEmscriptenFSNode,
    name: string,
    mode: number,
    dev: any
  ): IEmscriptenFSNode {
    return super.mknod(this.getNode(parent), name, mode, dev);
  }

  rename(
    oldNode: IEmscriptenFSNode,
    newDir: IEmscriptenFSNode,
    newName: string
  ): void {
    super.rename(this.getNode(oldNode), this.getNode(newDir), newName);
  }

  rmdir(parent: IEmscriptenFSNode, name: string): void {
    super.rmdir(this.getNode(parent), name);
  }

  readdir(node: IEmscriptenFSNode): string[] {
    return super.readdir(this.getNode(node));
  }
}

// TODO Remove this when we don't need StreamNodeOps anymore
class LoggingDrive extends DriveFS {
  constructor(options: DriveFS.IOptions) {
    super(options);

    this.node_ops = new StreamNodeOps(this);
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

async function get_stdin() {
  const replyPromise = new Promise(resolve => {
    resolveInputReply = resolve;
  });
  return replyPromise;
}

(self as any).get_stdin = get_stdin;

class XeusKernel {
  constructor(resolve: any) {
    this._resolve = resolve;
  }

  async ready(): Promise<void> {
    return await globalThis.ready;
  }

  mount(driveName: string, mountpoint: string, baseUrl: string): void {
    const { FS, PATH, ERRNO_CODES } = globalThis.Module;

    if (!FS) {
      return;
    }

    this._drive = new LoggingDrive({
      FS,
      PATH,
      ERRNO_CODES,
      baseUrl,
      driveName,
      mountpoint
    });

    FS.mkdir(mountpoint);
    FS.mount(this._drive, {}, mountpoint);
    FS.chdir(mountpoint);
  }

  cd(path: string) {
    if (!path || !globalThis.Module.FS) {
      return;
    }

    globalThis.Module.FS.chdir(path);
  }

  isDir(path: string) {
    try {
      const lookup = globalThis.Module.FS.lookupPath(path);
      return globalThis.Module.FS.isDir(lookup.node.mode);
    } catch (e) {
      return false;
    }
  }

  async processMessage(event: any): Promise<void> {
    const msg_type = event.msg.header.msg_type;

    await this.ready();

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
      this._raw_xserver.notify_listener(event.msg);
    }
  }

  async initialize(kernel_spec: any, base_url: string) {
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
      await this.waitRunDependency();

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

      await this.waitRunDependency();

      this._raw_xkernel = new globalThis.Module.xkernel();
      this._raw_xserver = this._raw_xkernel.get_server();
      if (!this._raw_xkernel) {
        console.error('Failed to start kernel!');
      }
      this._raw_xkernel.start();
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
    this._resolve();
  }

  private async waitRunDependency() {
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
  private _resolve: any;
  private _raw_xkernel: any;
  private _raw_xserver: any;
  private _drive: DriveFS | null = null;
}

globalThis.ready = new Promise(resolve => {
  expose(new XeusKernel(resolve));
});
