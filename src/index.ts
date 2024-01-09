// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import {
  IServiceWorkerManager,
  JupyterLiteServer,
  JupyterLiteServerPlugin
} from '@jupyterlite/server';
import { IBroadcastChannelWrapper } from '@jupyterlite/contents';
import { IKernel, IKernelSpecs } from '@jupyterlite/kernel';

import { WebWorkerKernel } from './web_worker_kernel';

// helper function to fetch json
async function getJson(url: string) {
  const json_url = URLExt.join(PageConfig.getBaseUrl(), url);

  const response = await fetch(json_url);
  return JSON.parse(await response.text());
}

const xeusKernelsPlugin: JupyterLiteServerPlugin<void> = {
  id: '@jupyterlite/xeus:register-kernels',
  autoStart: true,
  requires: [IKernelSpecs],
  optional: [IServiceWorkerManager, IBroadcastChannelWrapper],
  activate: async (
    app: JupyterLiteServer,
    kernelspecs: IKernelSpecs,
    serviceWorker?: IServiceWorkerManager,
    broadcastChannel?: IBroadcastChannelWrapper
  ) => {
    let kernel_dir: string[] = [];
    try {
      kernel_dir = await getJson('xeus/kernels.json');
    } catch (err) {
      console.log(`Could not fetch xeus/kernels.json: ${err}`);
      throw err;
    }

    // Fetch kernel spec for each kernel
    kernel_dir.map(async kernel_dir => {
      const kernelspec = await getJson(
        'xeus/kernels/' + kernel_dir + '/kernel.json'
      );
      kernelspec.name = kernel_dir;
      kernelspec.dir = kernel_dir;
      kernelspec.resources = {
        'logo-32x32': 'xeus/kernels/' + kernel_dir + '/logo-32x32.png',
        'logo-64x64': 'xeus/kernels/' + kernel_dir + '/logo-64x64.png'
      };

      kernelspecs.register({
        spec: kernelspec,
        create: async (options: IKernel.IOptions): Promise<IKernel> => {
          const mountDrive = !!(
            serviceWorker?.enabled && broadcastChannel?.enabled
          );

          if (mountDrive) {
            console.info(
              `${kernelspec.name} contents will be synced with Jupyter Contents`
            );
          } else {
            console.warn(
              `${kernelspec.name} contents will NOT be synced with Jupyter Contents`
            );
          }

          return new WebWorkerKernel({
            ...options,
            mountDrive,
            kernelspec
          });
        }
      });
    });
  }
};

export default xeusKernelsPlugin;
