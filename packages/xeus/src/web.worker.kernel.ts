// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import coincident from 'coincident';

import { wrap } from 'comlink';
import type { Remote } from 'comlink';

import { PromiseDelegate } from '@lumino/coreutils';

import { Contents, KernelMessage } from '@jupyterlab/services';

import { IKernel } from '@jupyterlite/kernel';
import {
  DriveContentsProcessor,
  TDriveMethod,
  TDriveRequest
} from '@jupyterlite/contents';

import { WebWorkerKernelBase, IXeusWorkerKernel } from '@jupyterlite/xeus-core';

export class WebWorkerKernel extends WebWorkerKernelBase {
  /**
   * Instantiate a new WebWorkerKernel
   *
   * @param options The instantiation options for a new WebWorkerKernel
   */
  // constructor(options: WebWorkerKernel.IOptions) {
  //   const {
  //     id,
  //     name,
  //     sendMessage,
  //     location,
  //     kernelSpec,
  //     contentsManager,
  //     empackEnvMetaLink
  //   } = options;
  //   this._id = id;
  //   this._name = name;
  //   this._location = location;
  //   this._kernelSpec = kernelSpec;
  //   this._contentsManager = contentsManager;
  //   this.sendMessage = sendMessage;
  //   this._empackEnvMetaLink = empackEnvMetaLink;
  //   this.worker = this.initWorker(options);
  //   this._remoteKernel = this.initRemote(options);
  //   this.initFileSystem(options);
  // }

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
  initRemote(
    options: WebWorkerKernel.IOptions
  ): IXeusWorkerKernel | Remote<IXeusWorkerKernel> {
    let remote: IXeusWorkerKernel | Remote<IXeusWorkerKernel>;
    if (crossOriginIsolated) {
      // We directly forward messages to xeus, which will dispatch them properly
      // See discussion in https://github.com/jupyterlite/xeus/pull/108#discussion_r1750143661
      this.worker.onmessage = this._processCoincidentWorkerMessage.bind(this);

      remote = coincident(this.worker) as IXeusWorkerKernel;
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
        this._processCoincidentWorkerMessage({ data: inputRequest });
        this.inputDelegate =
          new PromiseDelegate<KernelMessage.IInputReplyMsg>();
        return await this.inputDelegate.promise;
      };
    } else {
      this.worker.onmessage = e => {
        this._processComlinkWorkerMessage(e.data);
      };
      remote = wrap(this.worker) as Remote<IXeusWorkerKernel>;
    }

    return remote;
  }

  /**
   * Process a message coming from the coincident web worker.
   *
   * @param msg The worker message to process.
   */
  private _processCoincidentWorkerMessage(msg: any): void {
    if (!msg.data?.header) {
      return;
    }

    msg.data.header.session = this.parentHeader?.session ?? '';
    msg.data.session = this.parentHeader?.session ?? '';
    this.sendMessage(msg.data);

    // resolve promise
    if (
      msg.data.header.msg_type === 'status' &&
      msg.data.content.execution_state === 'idle'
    ) {
      this.executeDelegate.resolve();
    }
  }

  private _assignSession(msg: any) {
    msg.header.session = this.parentHeader?.session ?? '';
    msg.session = this.parentHeader?.session ?? '';
    return msg;
  }

  /**
   * Process a message coming from the comlink web worker.
   *
   * @param msg The worker message to process.
   */
  private _processComlinkWorkerMessage(msg: any): void {
    if (!msg.header) {
      if (msg?._stream) {
        const parentHeaderValue = this.parentHeader;
        const { name, text } = msg._stream;
        if (name === 'stderr') {
          const errorMessage =
            KernelMessage.createMessage<KernelMessage.IExecuteReplyMsg>({
              msgType: 'execute_reply',
              channel: 'shell',
              parentHeader:
                parentHeaderValue as KernelMessage.IHeader<'execute_request'>,
              session: parentHeaderValue?.session ?? '',
              content: {
                execution_count: msg._stream.executionCount,
                status: 'error',
                ename: msg._stream.ename,
                evalue: msg._stream.evalue,
                traceback: msg._stream.traceback.join('')
              }
            });
          msg = this._assignSession(errorMessage);
          this.sendMessage(msg);
        }

        const message = KernelMessage.createMessage<KernelMessage.IStreamMsg>({
          channel: 'iopub',
          msgType: 'stream',
          session: parentHeaderValue?.session ?? '',
          parentHeader: parentHeaderValue,
          content: {
            name,
            text
          }
        });

        msg = this._assignSession(message);
        this.sendMessage(msg);
      } else {
        return;
      }
    } else {
      this.sendMessage(this._assignSession(msg));
    }

    // resolve promise
    if (
      msg.header.msg_type === 'status' &&
      msg.content.execution_state === 'idle'
    ) {
      this.executeDelegate.resolve();
    }
  }
}

/**
 * A namespace for WebWorkerKernel statics.
 */
export namespace WebWorkerKernel {
  /**
   * The instantiation options for a Pyodide kernel
   */
  export interface IOptions extends IKernel.IOptions {
    contentsManager: Contents.IManager;
    mountDrive: boolean;
    kernelSpec: any;
    empackEnvMetaLink?: string | undefined;
    browsingContextId: string;
  }
}
