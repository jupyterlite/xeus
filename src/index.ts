// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import {
  IServiceWorkerManager,
  JupyterLiteServer,
  JupyterLiteServerPlugin
} from '@jupyterlite/server';
import { IBroadcastChannelWrapper } from '@jupyterlite/contents';
import { IKernel, IKernelSpecs } from '@jupyterlite/kernel';

import { WebWorkerKernel } from './web_worker_kernel';

const EXTENSION_NAME = 'xeus';
const EXTENSION_STATIC_DIR = `../extensions/@jupyterlite/${EXTENSION_NAME}/static/`;

// helper function to fetch json
function getPkgJson(url: string) {
  const json_url = EXTENSION_STATIC_DIR + url;
  const xhr = new XMLHttpRequest();
  xhr.open('GET', json_url, false);
  xhr.send(null);
  return JSON.parse(xhr.responseText);
}

let kernel_dir: string[] = [];
try {
  kernel_dir = getPkgJson('share/jupyter/kernels.json');
} catch (err) {
  console.log(err);
  console.log('could not fetch share/jupyter/kernels/kernels.json');
  kernel_dir = [];
  throw err;
}

// fetch kernel spec for each kernel
const kernel_specs = kernel_dir.map(kernel_dir => {
  const spec: any = getPkgJson(
    'share/jupyter/kernels/' + kernel_dir + '/kernel.json'
  );
  spec.name = kernel_dir;
  spec.dir = kernel_dir;
  spec.resources = {
    'logo-32x32':
      EXTENSION_STATIC_DIR +
      'share/jupyter/kernels/' +
      kernel_dir +
      '/logo-32x32.png',
    'logo-64x64':
      EXTENSION_STATIC_DIR +
      'share/jupyter/kernels/' +
      kernel_dir +
      '/logo-64x64.png'
  };
  return spec;
});

const server_kernels = kernel_specs.map(kernelspec => {
  const server_kernel: JupyterLiteServerPlugin<void> = {
    // use name from spec
    id: `@jupyterlite/${kernelspec.name}-extension:kernel`,
    autoStart: true,
    requires: [IKernelSpecs],
    optional: [IServiceWorkerManager, IBroadcastChannelWrapper],
    activate: (
      app: JupyterLiteServer,
      kernelspecs: IKernelSpecs,
      serviceWorker?: IServiceWorkerManager,
      broadcastChannel?: IBroadcastChannelWrapper
    ) => {
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
  return server_kernel;
});

const plugins: JupyterLiteServerPlugin<any>[] = server_kernels;

export default plugins;
