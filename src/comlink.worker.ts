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
  async mount(
    driveName: string,
    mountpoint: string,
    baseUrl: string
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
      mountpoint
    });

    FS.mkdir(mountpoint);
    FS.mount(drive, {}, mountpoint);
    FS.chdir(mountpoint);
  }
}

const worker = new XeusComlinkKernel();

expose(worker);
