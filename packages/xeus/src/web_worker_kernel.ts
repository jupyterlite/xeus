// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import coincident from 'coincident';

import { wrap } from 'comlink';
import type { Remote } from 'comlink';

import { ISignal, Signal } from '@lumino/signaling';
import { PromiseDelegate } from '@lumino/coreutils';

import { PageConfig } from '@jupyterlab/coreutils';
import { Contents, KernelMessage } from '@jupyterlab/services';

import { IKernel } from '@jupyterlite/kernel';
import {
  DriveContentsProcessor,
  TDriveMethod,
  TDriveRequest
} from '@jupyterlite/contents';

import { IXeusWorkerKernel } from './interfaces';

export class WebWorkerKernel implements IKernel {
  /**
   * Instantiate a new WebWorkerKernel
   *
   * @param options The instantiation options for a new WebWorkerKernel
   */
  constructor(options: WebWorkerKernel.IOptions) {
    const {
      id,
      name,
      sendMessage,
      location,
      kernelSpec,
      contentsManager,
      empackEnvMetaLink
    } = options;
    this._id = id;
    this._name = name;
    this._location = location;
    this._kernelSpec = kernelSpec;
    this._contentsManager = contentsManager;
    this._sendMessage = sendMessage;
    this._empackEnvMetaLink = empackEnvMetaLink;
    this._worker = this.initWorker(options);
    this._remoteKernel = this.initRemote(options);
    this.initFileSystem(options);
  }

  /**
   * Load the worker.
   */
  protected initWorker(options: WebWorkerKernel.IOptions): Worker {
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
  protected initRemote(
    options: WebWorkerKernel.IOptions
  ): IXeusWorkerKernel | Remote<IXeusWorkerKernel> {
    let remote: IXeusWorkerKernel | Remote<IXeusWorkerKernel>;
    if (crossOriginIsolated) {
      // We directly forward messages to xeus, which will dispatch them properly
      // See discussion in https://github.com/jupyterlite/xeus/pull/108#discussion_r1750143661
      this._worker.onmessage = this._processCoincidentWorkerMessage.bind(this);

      remote = coincident(this._worker) as IXeusWorkerKernel;
      // The coincident worker uses its own filesystem API:
      (remote.processDriveRequest as any) = async <T extends TDriveMethod>(
        data: TDriveRequest<T>
      ) => {
        if (!DriveContentsProcessor) {
          throw new Error(
            'File system calls over Atomics.wait is only supported with jupyterlite>=0.4.0a3'
          );
        }

        if (this._contentsProcessor === undefined) {
          this._contentsProcessor = new DriveContentsProcessor({
            contentsManager: this._contentsManager
          });
        }

        return await this._contentsProcessor.processDriveRequest(data);
      };
    } else {
      this._worker.onmessage = e => {
        this._processComlinkWorkerMessage(e.data);
      };
      remote = wrap(this._worker) as Remote<IXeusWorkerKernel>;
    }

    remote
      .initialize({
        kernelId: this._id,
        kernelSpec: this._kernelSpec,
        baseUrl: PageConfig.getBaseUrl(),
        mountDrive: options.mountDrive,
        empackEnvMetaLink: this._empackEnvMetaLink
      })
      .then(this._ready.resolve.bind(this._ready));

    return remote;
  }

  async handleMessage(msg: KernelMessage.IMessage): Promise<void> {
    this._parent = msg;
    this._parentHeader = msg.header;
    await this._sendMessageToWorker(msg);
  }

  private async _sendMessageToWorker(msg: any): Promise<void> {
    if (msg.header.msg_type !== 'input_reply') {
      this._executeDelegate = new PromiseDelegate<void>();
    }

    await this._remoteKernel.processMessage({ msg, parent: this.parent });
    if (msg.header.msg_type !== 'input_reply') {
      return await this._executeDelegate.promise;
    }
  }

  /**
   * Get the last parent header
   */
  get parentHeader():
    | KernelMessage.IHeader<KernelMessage.MessageType>
    | undefined {
    return this._parentHeader;
  }

  /**
   * Get the last parent message (mimick ipykernel's get_parent)
   */
  get parent(): KernelMessage.IMessage | undefined {
    return this._parent;
  }

  /**
   * Get the kernel location
   */
  get location(): string {
    return this._location;
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

    msg.data.header.session = this._parentHeader?.session ?? '';
    msg.data.session = this._parentHeader?.session ?? '';
    this._sendMessage(msg.data);

    // resolve promise
    if (
      msg.data.header.msg_type === 'status' &&
      msg.data.content.execution_state === 'idle'
    ) {
      this._executeDelegate.resolve();
    }
  }

  /**
   * Process a message coming from the comlink web worker.
   *
   * @param msg The worker message to process.
   */
  private _processComlinkWorkerMessage(msg: any): void {
    if (!msg.header) {
      return;
    }

    msg.header.session = this._parentHeader?.session ?? '';
    msg.session = this._parentHeader?.session ?? '';
    this._sendMessage(msg);

    // resolve promise
    if (
      msg.header.msg_type === 'status' &&
      msg.content.execution_state === 'idle'
    ) {
      this._executeDelegate.resolve();
    }
  }

  /**
   * A promise that is fulfilled when the kernel is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * Return whether the kernel is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A signal emitted when the kernel is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * Dispose the kernel.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._worker.terminate();
    (this._worker as any) = null;
    (this._remoteKernel as any) = null;
    this._isDisposed = true;
    this._disposed.emit(void 0);
  }

  /**
   * Get the kernel id
   */
  get id(): string {
    return this._id;
  }

  /**
   * Get the name of the kernel
   */
  get name(): string {
    return this._name;
  }

  private async initFileSystem(options: WebWorkerKernel.IOptions) {
    let driveName: string;
    let localPath: string;

    if (options.location.includes(':')) {
      const parts = options.location.split(':');
      driveName = parts[0];
      localPath = parts[1];
    } else {
      driveName = '';
      localPath = options.location;
    }

    await this._remoteKernel.ready();

    await this._remoteKernel.mount(
      driveName,
      '/drive',
      PageConfig.getBaseUrl()
    );

    if (await this._remoteKernel.isDir('/files')) {
      await this._remoteKernel.cd('/files');
    } else {
      await this._remoteKernel.cd(`/drive/${localPath}`);
    }
  }

  private _kernelSpec: any;
  private _id: string;
  private _name: string;
  private _location: string;
  private _contentsManager: Contents.IManager;
  private _contentsProcessor: DriveContentsProcessor | undefined = undefined;
  private _remoteKernel: IXeusWorkerKernel | Remote<IXeusWorkerKernel>;
  private _isDisposed = false;
  private _disposed = new Signal<this, void>(this);
  private _worker: Worker;
  private _sendMessage: IKernel.SendMessage;
  private _executeDelegate = new PromiseDelegate<void>();
  private _parentHeader:
    | KernelMessage.IHeader<KernelMessage.MessageType>
    | undefined = undefined;
  private _parent: KernelMessage.IMessage | undefined = undefined;
  private _ready = new PromiseDelegate<void>();
  private _empackEnvMetaLink: string | undefined;
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
  }
}
