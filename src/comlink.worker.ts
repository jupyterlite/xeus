// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * A WebWorker entrypoint that uses comlink to handle postMessage details
 */

import { expose } from 'comlink';

import {
  ContentsAPI,
  DriveFS,
  ServiceWorkerContentsAPI
} from '@jupyterlite/contents';

import { IXeusWorkerKernel } from './tokens';

import { XeusRemoteKernel } from './worker';

/**
 * A custom drive implementation which uses the service worker
 */
class XeusDriveFS extends DriveFS {
  createAPI(options: DriveFS.IOptions): ContentsAPI {
    return new ServiceWorkerContentsAPI(
      options.baseUrl,
      options.driveName,
      options.mountpoint,
      options.FS,
      options.ERRNO_CODES
    );
  }
}

export class XeusComlinkKernel extends XeusRemoteKernel {
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

const worker = new XeusComlinkKernel();

expose(worker);
