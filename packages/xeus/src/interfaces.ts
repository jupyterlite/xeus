// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Definitions for the Xeus kernel.
 */

import {
  TDriveMethod,
  TDriveRequest,
  TDriveResponse
} from '@jupyterlite/contents';

import { IWorkerKernel } from '@jupyterlite/kernel';

/**
 * An interface for Xeus workers.
 */
export interface IXeusWorkerKernel extends IWorkerKernel {
  /**
   * Handle any lazy initialization activities.
   */
  initialize(options: IXeusWorkerKernel.IOptions): Promise<void>;

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
   * Process worker message
   * @param msg
   */
  processWorkerMessage(msg: any): void;

  /**
   * Register a callback for handling messages from the worker.
   */
  registerCallback(callback: (msg: any) => void): void;

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
   */
  mount(driveName: string, mountpoint: string, baseUrl: string): Promise<void>;

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
    empackEnvMetaLink?: string;
  }
}
