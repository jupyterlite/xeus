// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import { wrap } from 'comlink';
import type { Remote } from 'comlink';

import { ISignal, Signal } from '@lumino/signaling';
import { PromiseDelegate } from '@lumino/coreutils';

import { PageConfig } from '@jupyterlab/coreutils';
import { KernelMessage } from '@jupyterlab/services';

import { IKernel } from '@jupyterlite/kernel';

interface IXeusKernel {
  ready(): Promise<void>;

  mount(driveName: string, mountpoint: string, baseUrl: string): Promise<void>;

  cd(path: string): Promise<void>;

  processMessage(msg: any): Promise<void>;
}


export class WebWorkerKernel implements IKernel {
  /**
   * Instantiate a new WebWorkerKernel
   *
   * @param options The instantiation options for a new WebWorkerKernel
   */
  constructor(options: WebWorkerKernel.IOptions, spec: any) {
    console.log('constructing WebWorkerKernel kernel');
    const { id, name, sendMessage, location } = options;
    this._id = id;
    this._name = name;
    this._location = location;
    this._spec = spec;
    this._sendMessage = sendMessage;
    console.log('constructing WebWorkerKernel worker');
    this._worker = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module'
    });
    console.log('constructing WebWorkerKernel done');

    this._worker.onmessage = e => {
      this._processWorkerMessage(e.data);
    };

    console.log("wrap");
    this._remote = wrap(this._worker);
    console.log("wrap done");
    
    // this._remote.processMessage({
    //   msg: {
    //     header: {
    //       msg_type: 'initialize'
    //     }
    //   },
    //   spec: this._spec
    // });

    if(false){
      console.log('init filesystem');
      this.initFileSystem(options);

    }
    console.log('constructing WebWorkerKernel done2');
  }

  async handleMessage(msg: KernelMessage.IMessage): Promise<void> {
    console.log('handleMessage', msg);
    this._parent = msg;
    this._parentHeader = msg.header;
    console.log("send message to worker");
    await this._sendMessageToWorker(msg);
    console.log("send message to worker awaiting done");
  }

  private async _sendMessageToWorker(msg: any): Promise<void> {

    if(this._first_message){
      this._first_message = false;
      console.log('first message');
      await this._remote.ready();
      console.log("waited for ready");

      await this._remote.processMessage({
        msg: {
          header: {
            msg_type: 'initialize'
          }
        },
        spec: this._spec
      });
      console.log('first message done');
    }

   
    // TODO Remove this??
    if (msg.header.msg_type !== 'input_reply') {
      this._executeDelegate = new PromiseDelegate<void>();
    }

    console.log(' this._remote.processMessage({ msg, parent: this.parent });');
    await this._remote.processMessage({ msg, parent: this.parent });
    console.log(' this._remote.processMessage({ msg, parent: this.parent }); done');
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
    console.log('processWorkerMessage', msg);
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

    if (false || options.mountDrive) {
      await this._remote.mount(driveName, '/drive', PageConfig.getBaseUrl());
      await this._remote.cd(localPath);
    }
  }

  private _first_message: boolean = true;
  private _spec: any;
  private _id: string;
  private _name: string;
  private _location: string;
  private _remote: Remote<IXeusKernel>;
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
    mountDrive: boolean;
  }
}
