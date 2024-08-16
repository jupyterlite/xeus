// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import coincident from 'coincident';

import {
  ContentsAPI,
  DriveFS,
  TDriveRequest,
  TDriveMethod,
  TDriveResponse
} from '@jupyterlite/contents';

import { IXeusWorkerKernel } from './tokens';
import { XeusRemoteKernel } from './worker';

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
    return new SharedBufferContentsAPI(
      options.driveName,
      options.mountpoint,
      options.FS,
      options.ERRNO_CODES
    );
  }
}

export class XeusCoincidentKernel extends XeusRemoteKernel {
  /**
   * Setup custom Emscripten FileSystem
   */
  protected async initFilesystem(
    options: IXeusWorkerKernel.IOptions
  ): Promise<void> {
    if (options.mountDrive) {
      const mountpoint = '/drive';
      const { FS, PATH, ERRNO_CODES } = globalThis.Module;
      const { baseUrl } = options;

      const driveFS = new XeusDriveFS({
        FS,
        PATH,
        ERRNO_CODES,
        baseUrl,
        driveName: this._driveName,
        mountpoint
      });
      FS.mkdir(mountpoint);
      FS.mount(driveFS, {}, mountpoint);
      FS.chdir(mountpoint);
      this._driveFS = driveFS;
    }
  }
}

const worker = new XeusCoincidentKernel();

const sendWorkerMessage = workerAPI.processWorkerMessage.bind(workerAPI);
worker.registerCallback(sendWorkerMessage);

workerAPI.initialize = worker.initialize.bind(worker);
workerAPI.cd = worker.cd.bind(worker);
workerAPI.isDir = worker.isDir.bind(worker);
