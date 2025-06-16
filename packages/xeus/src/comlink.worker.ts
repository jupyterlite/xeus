// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * A WebWorker entrypoint that uses comlink to handle postMessage details
 */

import { expose } from 'comlink';

import { URLExt } from '@jupyterlab/coreutils';

import { DriveFS } from '@jupyterlite/contents';

import { EmpackedXeusRemoteKernel } from './worker';

export class XeusComlinkKernel extends EmpackedXeusRemoteKernel {
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

  // 
  async storeAsGlobal(object: any, name: string): Promise<void> {
    console.log("recieved object to store as global:", name, object);
    // store canvas in the globalThis object
    if (typeof globalThis[name] !== 'undefined') {
      console.warn(`Global variable ${name} already exists, overwriting.`);
    }
    globalThis[name] = object;
  }


  async callGlobalReciver(
    reciverName: string,
    methodName: string,
    ...args: any[]
  ): Promise<void> {

    try{
      const reciver = globalThis[reciverName];
      reciver[methodName](...args);
    }
    catch (error) {
      console.error(`Error calling global receiver ${reciverName} method ${methodName}:`, error);
      throw error;
    }
  }
    

  // async storeOffscreenCanvas(
  //   offscreenCanvas: OffscreenCanvas,
  //   name: string,
  //   event_handler_name : string,
  //   event_handler : (event: Event) => void 
  // ): Promise<void> {
  //   console.log("recieved offscreen canvas to store as global:", name, offscreenCanvas);
  //   // store offscreen canvas in the globalThis object
  //   if (typeof globalThis[name] !== 'undefined') {
  //     console.warn(`Global variable ${name} already exists, overwriting.`);
  //   }
  //   globalThis[name] = offscreenCanvas;

  //   // get the function to handle events
  //   if (typeof globalThis[event_handler_name] !== 'undefined') {
  //     console.warn(`Global event handler ${event_handler_name} already exists, overwriting.`);
  //   }
  //   globalThis[event_handler_name] = event_handler;
    
  // }

  protected initializeStdin(baseUrl: string, browsingContextId: string): void {
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
