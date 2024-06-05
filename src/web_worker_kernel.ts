// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import coincident from 'coincident';

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

interface IXeusKernel {
  initialize(kernel_spec: any, base_url: string): Promise<void>;

  ready(): Promise<void>;

  mount(driveName: string, mountpoint: string, baseUrl: string): Promise<void>;

  cd(path: string): Promise<void>;

  isDir(path: string): Promise<boolean>;

  processMessage(msg: any): Promise<void>;

  processDriveRequest(data: any): void;
}

export class WebWorkerKernel implements IKernel {
  /**
   * Instantiate a new WebWorkerKernel
   *
   * @param options The instantiation options for a new WebWorkerKernel
   */
  constructor(options: WebWorkerKernel.IOptions) {
    const { id, name, sendMessage, location, kernelspec, contentsManager } =
      options;
    this._id = id;
    this._name = name;
    this._location = location;
    this._kernelspec = kernelspec;
    this._contentsManager = contentsManager;
    this._sendMessage = sendMessage;
    this._worker = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module'
    });

    this._worker.onmessage = this._processWorkerMessage.bind(this);

    this._remote = coincident(this._worker) as IXeusKernel;

    this.setupFilesystemAPIs();

    this._remote.initialize(this._kernelspec, PageConfig.getBaseUrl());

    this.initFileSystem(options);
  }

  async handleMessage(msg: KernelMessage.IMessage): Promise<void> {
    this._parent = msg;
    this._parentHeader = msg.header;
    await this._sendMessageToWorker(msg);
  }

  private async _sendMessageToWorker(msg: any): Promise<void> {
    // TODO Remove this??
    if (msg.header.msg_type !== 'input_reply') {
      this._executeDelegate = new PromiseDelegate<void>();
    }

    await this._remote.processMessage({ msg, parent: this.parent });
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
   * Process a message coming from the pyodide web worker.
   *
   * @param msg The worker message to process.
   */
  private _processWorkerMessage(msg: any): void {
    if (!msg.data.header) {
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
   * A promise that is fulfilled when the kernel is ready.
   */
  get ready(): Promise<void> {
    return Promise.resolve();
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
    (this._remote as any) = null;
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

  private setupFilesystemAPIs() {
    this._remote.processDriveRequest = async <T extends TDriveMethod>(
      data: TDriveRequest<T>
    ) => {
      if (!DriveContentsProcessor) {
        console.error(
          'File system calls over Atomics.wait is only supported with jupyterlite>=0.4.0a3'
        );
        return;
      }

      if (this._contentsProcessor === undefined) {
        this._contentsProcessor = new DriveContentsProcessor({
          contentsManager: this._contentsManager
        });
      }

      return await this._contentsProcessor.processDriveRequest(data);
    };
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

    await this._remote.ready();

    await this._remote.mount(driveName, '/drive', PageConfig.getBaseUrl());

    if (await this._remote.isDir('/files')) {
      await this._remote.cd('/files');
    } else {
      await this._remote.cd(localPath);
    }
  }

  private _kernelspec: any;
  private _id: string;
  private _name: string;
  private _location: string;
  private _contentsManager: Contents.IManager;
  private _contentsProcessor: DriveContentsProcessor | undefined = undefined;
  private _remote: IXeusKernel;
  private _isDisposed = false;
  private _disposed = new Signal<this, void>(this);
  private _worker: Worker;
  private _sendMessage: IKernel.SendMessage;
  private _executeDelegate = new PromiseDelegate<void>();
  private _parentHeader:
    | KernelMessage.IHeader<KernelMessage.MessageType>
    | undefined = undefined;
  private _parent: KernelMessage.IMessage | undefined = undefined;
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
    kernelspec: any;
  }
}
