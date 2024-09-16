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
import { IEmpackEnvMetaFile } from './tokens';

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
    optional: [IServiceWorkerManager, IBroadcastChannelWrapper, IEmpackEnvMetaFile],
    activate: (
      app: JupyterLiteServer,
      kernelspecs: IKernelSpecs,
      serviceWorker?: IServiceWorkerManager,
      broadcastChannel?: IBroadcastChannelWrapper,
      empackEnvMetaFile?: IEmpackEnvMetaFile
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

      const contentsManager = app.serviceManager.contents;

      kernelspecs.register({
        spec: kernelspec,
        create: async (options: IKernel.IOptions): Promise<IKernel> => {
          const mountDrive = !!(
            (serviceWorker?.enabled && broadcastChannel?.enabled) ||
            crossOriginIsolated
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
            contentsManager,
            mountDrive,
            kernelSpec: kernelspec,
            empackEnvMetaLink:empackEnvMetaFile? empackEnvMetaFile.getLink(): ''
          });
        }
      });
    }
  };
});

const empackEnvMetaPlugin: JupyterLiteServerPlugin<void> = {
  id: `@jupyterlite/xeus-python:empack-env-meta`,
  autoStart: true,
  provides: IEmpackEnvMetaFile,
  activate: (): IEmpackEnvMetaFile => {
    return {
      getLink(){ 
        let empackEnvMetaLink =''
         const searchParams = new URL(location.href).searchParams;

          if (searchParams && searchParams.get('empack_env_meta'))  {
            empackEnvMetaLink = searchParams.get('empack_env_meta') as string;
          }
          return empackEnvMetaLink;
      }
    };
  },
};

plugins.push(empackEnvMetaPlugin);

export default plugins;
