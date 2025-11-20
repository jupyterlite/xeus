import type { IXeusWorkerKernel } from '@jupyterlite/xeus-core';

export interface IEmpackXeusWorkerKernel extends IXeusWorkerKernel {
  initialize(options: IEmpackXeusWorkerKernel.IOptions): Promise<void>;
}

export namespace IEmpackXeusWorkerKernel {
  export interface IOptions extends IXeusWorkerKernel.IOptions {
    empackEnvMetaLink?: string | undefined;
  }
}
