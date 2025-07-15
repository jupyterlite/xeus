// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import coincident from 'coincident';

import { wrap, transfer } from 'comlink';
import type { Remote } from 'comlink';

import { PromiseDelegate } from '@lumino/coreutils';

import { KernelMessage } from '@jupyterlab/services';

import {
  DriveContentsProcessor,
  TDriveMethod,
  TDriveRequest
} from '@jupyterlite/contents';

import { WebWorkerKernelBase } from '@jupyterlite/xeus-core';
import { IEmpackXeusWorkerKernel } from './interfaces';
import { PageConfig } from '@jupyterlab/coreutils';

export class WebWorkerKernel extends WebWorkerKernelBase {
  /**
   * Instantiate a new WebWorkerKernel
   *
   * @param options The instantiation options for a new WebWorkerKernel
   */
  constructor(options: WebWorkerKernel.IOptions) {
    super(options);
  }

  /**
   * Load the worker.
   */
  initWorker(options: WebWorkerKernel.IOptions): Worker {
    if (crossOriginIsolated) {
      return new Worker(new URL('./coincident.worker.js', import.meta.url), {
        type: 'module'
      });
    } else {
      return new Worker(new URL('./comlink.worker.js', import.meta.url), {
        type: 'module'
      });
    }
  }

  /**
   * Initialize the remote kernel.
   * Use coincident if crossOriginIsolated, comlink otherwise
   * See the two following issues for more context:
   *  - https://github.com/jupyterlite/jupyterlite/issues/1424
   *  - https://github.com/jupyterlite/xeus/issues/102
   */
  createRemote(
    options: WebWorkerKernel.IOptions
  ): IEmpackXeusWorkerKernel | Remote<IEmpackXeusWorkerKernel> {
    let remote: IEmpackXeusWorkerKernel | Remote<IEmpackXeusWorkerKernel>;

    // We directly forward messages to xeus, which will dispatch them properly
    // See discussion in https://github.com/jupyterlite/xeus/pull/108#discussion_r1750143661
    this.worker.onmessage = e => {
      this.processWorkerMessage(e.data);
    };

    if (crossOriginIsolated) {
      remote = coincident(this.worker) as IEmpackXeusWorkerKernel;
      // The coincident worker uses its own filesystem API:
      (remote.processDriveRequest as any) = async <T extends TDriveMethod>(
        data: TDriveRequest<T>
      ) => {
        if (!DriveContentsProcessor) {
          throw new Error(
            'File system calls over Atomics.wait is only supported with jupyterlite>=0.4.0a3'
          );
        }

        return await this.contentsProcessor.processDriveRequest(data);
      };

      // Stdin request is synchronous from the web worker's point of view, blocking
      // until the reply is received. From the UI thread's point of view it is async.
      (remote.processStdinRequest as any) = async (
        inputRequest: KernelMessage.IInputRequestMsg
      ): Promise<KernelMessage.IInputReplyMsg> => {
        this.processWorkerMessage(inputRequest);
        this.inputDelegate =
          new PromiseDelegate<KernelMessage.IInputReplyMsg>();
        return await this.inputDelegate.promise;
      };

      // make a global function to store objects in the global scope
      // of the worker. This is useful to move/transfer objects
      // like OffscreenCanvas from the main thread to the worker.
      (globalThis as any).storeAsGlobal = async (object: any, name: string) => {
        // use coincident to transfer the object
        await (remote as any).storeAsGlobal(
          object,
          name,
          coincident.transfer(object)
        );
      };
    } else {
      remote = wrap(this.worker) as Remote<IEmpackXeusWorkerKernel>;

      // make a global function to store objects in the global scope
      // for instance, to store an OffscreenCanvas
      (globalThis as any).storeAsGlobal = async (object: any, name: string) => {
        await (remote as any).storeAsGlobal(transfer(object, [object]), name);
      };
    }
    // this global function can be called in the frontend code of
    // widgets, for instance to forward events from the main thread
    // to the worker.
    (globalThis as any).callGlobalReceiver = async (
      receiverName: string,
      methodName: string,
      ...args: any[]
    ): Promise<any> => {
      return await (remote as any).callGlobalReceiver(
        receiverName,
        methodName,
        ...args
      );
    };
    return remote;
  }

  /**
   * Initialize the remote kernel
   * @param options
   */
  protected async initRemote(options: WebWorkerKernel.IOptions) {
    return (this.remoteKernel as IEmpackXeusWorkerKernel).initialize({
      baseUrl: PageConfig.getBaseUrl(),
      kernelId: this.id,
      mountDrive: options.mountDrive,
      kernelSpec: options.kernelSpec,
      browsingContextId: options.browsingContextId,
      empackEnvMetaLink: options.empackEnvMetaLink
    });
  }
}

/**
 * A namespace for WebWorkerKernel statics.
 */
export namespace WebWorkerKernel {
  /**
   * The instantiation options for a Pyodide kernel
   */
  export interface IOptions extends WebWorkerKernelBase.IOptions {
    empackEnvMetaLink?: string | undefined;
  }
}
