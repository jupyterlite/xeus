// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import coincident from 'coincident';

import type { KernelMessage } from '@jupyterlab/services';

import {
  ContentsAPI,
  DriveFS,
  TDriveRequest,
  TDriveMethod,
  TDriveResponse
} from '@jupyterlite/contents';

import { IXeusWorkerKernel } from '@jupyterlite/xeus-core';
import { EmpackedXeusRemoteKernel } from './worker';

const workerAPI = coincident(self) as IXeusWorkerKernel;

/**
 * An Emscripten-compatible synchronous Contents API using shared array buffers.
 */
export class SharedBufferContentsAPI extends ContentsAPI {
  request<T extends TDriveMethod>(data: TDriveRequest<T>): TDriveResponse<T> {
    return workerAPI.processDriveRequest(data);
  }
}

/**
 * A custom drive implementation which uses shared array buffers (via coincident) if available
 */
class XeusDriveFS extends DriveFS {
  createAPI(options: DriveFS.IOptions): ContentsAPI {
    return new SharedBufferContentsAPI(options);
  }
}

export class XeusCoincidentKernel extends EmpackedXeusRemoteKernel {
  /**
   * Setup custom Emscripten FileSystem
   */
  async mount(
    driveName: string,
    mountpoint: string,
    baseUrl: string,
    browsingContextId: string
  ): Promise<void> {
    const { FS, PATH, ERRNO_CODES } = globalThis.Module;

    if (!FS) {
      return;
    }

    const drive = new XeusDriveFS({
      FS,
      PATH,
      ERRNO_CODES,
      baseUrl,
      driveName,
      mountpoint,
      browsingContextId
    });

    FS.mkdir(mountpoint);
    FS.mount(drive, {}, mountpoint);
    FS.chdir(mountpoint);
  }

  protected initializeStdin(baseUrl: string, browsingContextId: string): void {
    globalThis.get_stdin = (
      inputRequest: KernelMessage.IInputRequestMsg
    ): KernelMessage.IInputReplyMsg =>
      workerAPI.processStdinRequest(inputRequest);
  }

  async storeAsGlobal(object: any, name: string): Promise<void> {
    globalThis[name] = object;
  }

  async callGlobalReciver(
    reciverName: string,
    methodName: string,
    ...args: any[]
  ): Promise<void> {
    const reciver = globalThis[reciverName];
    reciver[methodName](...args);
  }
}

const worker = new XeusCoincidentKernel();

workerAPI.initialize = worker.initialize.bind(worker);
workerAPI.mount = worker.mount.bind(worker);
workerAPI.ready = worker.ready.bind(worker);
workerAPI.cd = worker.cd.bind(worker);
workerAPI.isDir = worker.isDir.bind(worker);
workerAPI.processMessage = worker.processMessage.bind(worker);

workerAPI.storeAsGlobal = worker.storeAsGlobal.bind(worker);
workerAPI.callGlobalReciver = worker.callGlobalReciver.bind(worker);
