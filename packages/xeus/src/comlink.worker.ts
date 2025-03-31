// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * A WebWorker entrypoint that uses comlink to handle postMessage details
 */

import { expose } from 'comlink';

import { DriveFS } from '@jupyterlite/contents';

import { XeusRemoteKernel } from './worker';

export class XeusComlinkKernel extends XeusRemoteKernel {
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

    const drive = new DriveFS({
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
}

const worker = new XeusComlinkKernel();

expose(worker);
