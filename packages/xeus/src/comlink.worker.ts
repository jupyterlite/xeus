// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * A WebWorker entrypoint that uses comlink to handle postMessage details
 */

import { expose } from 'comlink';

import { URLExt } from '@jupyterlab/coreutils';

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

  protected _initializeStdin(baseUrl: string, browsingContextId: string): void {
    globalThis.get_stdin = (inputRequest: any): any => {
      // Send a input request to the front-end via the service worker and block until
      // the reply is received.
      try {
        const xhr = new XMLHttpRequest();
        const url = URLExt.join(baseUrl, '/api/stdin/kernel');
        xhr.open('POST', url, false); // Synchronous XMLHttpRequest
        const msg = JSON.stringify({
          browsingContextId,
          data: inputRequest
        });
        // Send input request, this blocks until the input reply is received.
        xhr.send(msg);
        const inputReply = JSON.parse(xhr.response as string);

        if ('error' in inputReply) {
          // Service worker may return an error instead of an input reply message.
          throw new Error(inputReply['error']);
        }

        return inputReply;
      } catch (err) {
        return { error: `Failed to request stdin via service worker: ${err}` };
      }
    };
  }
}

const worker = new XeusComlinkKernel();

expose(worker);
