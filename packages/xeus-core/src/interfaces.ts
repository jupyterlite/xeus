// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Definitions for the Xeus kernel.
 */

import type { KernelMessage } from '@jupyterlab/services';

import type {
  TDriveMethod,
  TDriveRequest,
  TDriveResponse,
  IWorkerKernel
} from '@jupyterlite/services';

/**
 * An interface for Xeus workers.
 */
export interface IXeusWorkerKernel extends IWorkerKernel {
  /**
   * Handle any lazy initialization activities.
   */
  initialize(options: IXeusWorkerKernel.IOptions): Promise<void>;

  /**
   * The compiled kernel wasm module (WebAssembly.Module), if the worker compiled it.
   * The main thread hands it to the next worker of the same kernel (e.g. on restart).
   */
  getWasmModule(): any;

  /**
   * Snapshot of the unpacked environment, for the next worker of the same kernel
   * (restart), or undefined if the worker doesn't provide one.
   */
  getFsSnapshot(): Promise<any>;

  /**
   * Process drive request
   * @param data
   */
  processDriveRequest<T extends TDriveMethod>(
    data: TDriveRequest<T>
  ): TDriveResponse<T>;

  /**
   * Process a message sent from the main thread to the worker.
   * @param msg
   */
  processMessage(msg: any): void;

  /**
   * Process stdin request, blocking until the reply is received.
   * This is sync for the web worker, async for the UI thread.
   * @param inputRequest
   */
  processStdinRequest(
    inputRequest: KernelMessage.IInputRequestMsg
  ): KernelMessage.IInputReplyMsg;

  /**
   * Process worker message
   * @param msg
   */
  processWorkerMessage(msg: any): void;

  /**
   * Whether the kernel is ready.
   * @returns a promise that resolves when the kernel is ready.
   */
  ready(): Promise<void>;

  /**
   * Mount a drive
   * @param driveName The name of the drive
   * @param mountpoint The mountpoint of the drive
   * @param baseUrl The base URL of the server
   * @param browsingContextId The current page id
   */
  mount(
    driveName: string,
    mountpoint: string,
    baseUrl: string,
    browsingContextId: string
  ): Promise<void>;

  /**
   * Change the current working directory
   * @param path The path to change to
   */
  cd(path: string): Promise<void>;

  /**
   * Check if a path is a directory
   * @param path The path to check
   */
  isDir(path: string): Promise<boolean>;

  /**
   * Store an object in the global scope
   * This is useful to move/transfer objects like OffscreenCanvas
   * from the main thread to the worker.
   * @param object The object to store
   * @param name The name to store the object under
   */
  storeAsGlobal(object: any, name: string): Promise<void>;

  /**
   * Call a method on a an global object in the workers global scope
   * This is usefull to forward events from the main thread to the worker
   * @param receiverName The name of the receiver
   * @param methodName The name of the method to call
   * @param args The arguments to pass to the method
   */
  callGlobalReceiver(
    receiverName: string,
    methodName: string,
    ...args: any[]
  ): Promise<void>;
}

/**
 * An namespace for Xeus workers.
 */
export namespace IXeusWorkerKernel {
  /**
   * Initialization options for a worker.
   */
  export interface IOptions extends IWorkerKernel.IOptions {
    baseUrl: string;
    kernelId: string;
    kernelSpec: any;
    mountDrive: boolean;
    browsingContextId: string;
    /**
     * An already compiled kernel wasm module (WebAssembly.Module) from a previous
     * worker of the same kernel. Instantiating it skips the compilation.
     */
    wasmModule?: any;
    /**
     * The unpacked environment from a previous worker of the same kernel
     * (see getFsSnapshot). Restoring it skips fetching and unpacking the packages.
     */
    fsSnapshot?: any;
  }
}
