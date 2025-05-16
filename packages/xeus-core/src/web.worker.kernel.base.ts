// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import type { Remote } from 'comlink';

import { ISignal, Signal } from '@lumino/signaling';
import { PromiseDelegate } from '@lumino/coreutils';

import { PageConfig } from '@jupyterlab/coreutils';
import { Contents, KernelMessage } from '@jupyterlab/services';

import { IKernel } from '@jupyterlite/kernel';
import { DriveContentsProcessor } from '@jupyterlite/contents';

import { IXeusWorkerKernel } from './interfaces';

export abstract class WebWorkerKernelBase implements IKernel {
  /**
   * Instantiate a new WebWorkerKernelBase
   *
   * @param options The instantiation options for a new WebWorkerKernelBase
   */
  constructor(options: WebWorkerKernelBase.IOptions) {
    const { id, name, sendMessage, location, contentsManager } = options;
    this._id = id;
    this._name = name;
    this._location = location;
    this._contentsManager = contentsManager;
    this._contentsProcessor = new DriveContentsProcessor({
      contentsManager: this.contentsManager
    });
    this._sendMessage = sendMessage;
    this._worker = this.initWorker(options);
    this._remoteKernel = this.createRemote(options);
    this.initRemote(options).then(this._ready.resolve.bind(this._ready));
    this.initFileSystem(options);
  }

  /**
   * Load the worker.
   */
  abstract initWorker(options: WebWorkerKernelBase.IOptions): Worker;

  /**
   * Create the remote kernel.
   */
  abstract createRemote(
    options: WebWorkerKernelBase.IOptions
  ): IXeusWorkerKernel | Remote<IXeusWorkerKernel>;

  /**
   * Initialize the remote kernel
   * @param options
   */
  protected async initRemote(options: WebWorkerKernelBase.IOptions) {
    return this._remoteKernel.initialize({
      baseUrl: PageConfig.getBaseUrl(),
      kernelId: this.id,
      mountDrive: options.mountDrive,
      kernelSpec: options.kernelSpec,
      browsingContextId: options.browsingContextId
    });
  }

  async handleMessage(msg: KernelMessage.IMessage): Promise<void> {
    this._parent = msg;
    this._parentHeader = msg.header;
    await this._sendMessageToWorker(msg);
  }

  protected processWorkerMessage(msg: any) {
    if (!msg.header) {
      // Custom msg bypassing comlink/coincident protocol
      if (msg._stream) {
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
          this.sendMessage(errorMessage);
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

        this.sendMessage(message);
        return;
      } else {
        return;
      }
    }

    msg.header.session = this.parentHeader?.session ?? '';
    msg.session = this.parentHeader?.session ?? '';
    this.sendMessage(msg);

    // resolve promise
    if (
      msg.header.msg_type === 'status' &&
      msg.content.execution_state === 'idle'
    ) {
      this.executeDelegate.resolve();
    }
  }

  private async _sendMessageToWorker(msg: any): Promise<void> {
    if (msg.header.msg_type === 'input_reply') {
      this._inputDelegate.resolve(msg);
    } else {
      this._executeDelegate = new PromiseDelegate<void>();
      await this._remoteKernel.processMessage({ msg, parent: this.parent });
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
   * Send kernel message to the client
   */
  protected get sendMessage(): IKernel.SendMessage {
    return this._sendMessage;
  }

  /**
   * Promise that gets resolved upon execution
   */
  protected get executeDelegate() {
    return this._executeDelegate;
  }

  /**
   * Promise that gets resolved upon input response
   */
  protected set inputDelegate(
    value: PromiseDelegate<KernelMessage.IInputReplyMsg>
  ) {
    this._inputDelegate = value;
  }

  /**
   * Promise that gets resolved upon input response
   */
  protected get inputDelegate() {
    return this._inputDelegate;
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
   * Get the content manager
   */
  protected get contentsManager() {
    return this._contentsManager;
  }

  /**
   * Get the content processor
   */
  protected get contentsProcessor() {
    return this._contentsProcessor;
  }

  /**
   * Get the worker
   */
  protected get worker() {
    return this._worker;
  }

  protected get remoteKernel() {
    return this._remoteKernel;
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

  private async initFileSystem(options: WebWorkerKernelBase.IOptions) {
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
      PageConfig.getBaseUrl(),
      options.browsingContextId
    );

    if (await this._remoteKernel.isDir('/files')) {
      await this._remoteKernel.cd('/files');
    } else {
      await this._remoteKernel.cd(`/drive/${localPath}`);
    }
  }

  private _id: string;
  private _name: string;
  private _location: string;
  private _contentsManager: Contents.IManager;
  private _contentsProcessor: DriveContentsProcessor;
  private _remoteKernel: IXeusWorkerKernel | Remote<IXeusWorkerKernel>;
  private _isDisposed = false;
  private _disposed = new Signal<this, void>(this);
  private _worker: Worker;
  private _sendMessage: IKernel.SendMessage;
  private _executeDelegate = new PromiseDelegate<void>();
  private _inputDelegate = new PromiseDelegate<KernelMessage.IInputReplyMsg>();
  private _parentHeader:
    | KernelMessage.IHeader<KernelMessage.MessageType>
    | undefined = undefined;
  private _parent: KernelMessage.IMessage | undefined = undefined;
  private _ready = new PromiseDelegate<void>();
}

/**
 * A namespace for WebWorkerKernelBase statics.
 */
export namespace WebWorkerKernelBase {
  /**
   * The instantiation options for a Pyodide kernel
   */
  export interface IOptions extends IKernel.IOptions {
    contentsManager: Contents.IManager;
    mountDrive: boolean;
    kernelSpec: any;
    browsingContextId: string;
  }
}
