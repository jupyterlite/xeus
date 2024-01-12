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

function getJson(url: string) {
  const json_url = URLExt.join(PageConfig.getBaseUrl(), url);
  const xhr = new XMLHttpRequest();
  xhr.open('GET', json_url, false);
  xhr.send(null);
  return JSON.parse(xhr.responseText);
}

let kernel_list: string[] = [];
try {
  kernel_list = getJson('xeus/kernels.json');
} catch (err) {
  console.log(`Could not fetch xeus/kernels.json: ${err}`);
  throw err;
}

const plugins = kernel_list.map((kernel): JupyterLiteServerPlugin<void> => {
  return {
    id: `@jupyterlite/xeus-${kernel}:register`,
    autoStart: true,
    requires: [IKernelSpecs],
    optional: [IServiceWorkerManager, IBroadcastChannelWrapper],
    activate: (
      app: JupyterLiteServer,
      kernelspecs: IKernelSpecs,
      serviceWorker?: IServiceWorkerManager,
      broadcastChannel?: IBroadcastChannelWrapper
    ) => {
      // Fetch kernel spec
      const kernelspec = getJson('xeus/kernels/' + kernel + '/kernel.json');
      kernelspec.name = kernel;
      kernelspec.dir = kernel;
      for (const [key, value] of Object.entries(kernelspec.resources)) {
        kernelspec.resources[key] = URLExt.join(
          PageConfig.getBaseUrl(),
          value as string
        );
      }

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
    }
  };
});

export default plugins;
