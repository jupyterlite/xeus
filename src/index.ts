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

/**
 * Fetches JSON data from the specified URL asynchronously.
 *
 * This function constructs the full URL using the base URL from the PageConfig and
 * the provided relative URL. It then performs a GET request using the Fetch API
 * and returns the parsed JSON data.
 *
 * @param {string} url - The relative URL to fetch the JSON data from.
 * @returns {Promise<any>} - A promise that resolves to the parsed JSON data.
 * @throws {Error} - Throws an error if the HTTP request fails.
 *
 */
async function getJson(url: string) {
  const jsonUrl = URLExt.join(PageConfig.getBaseUrl(), url);
  const response = await fetch(jsonUrl, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

const kernelPlugin: JupyterLiteServerPlugin<void> = {
  id: '@jupyterlite/xeus-kernel:register',
  autoStart: true,
  requires: [IKernelSpecs],
  optional: [
    IServiceWorkerManager,
    IBroadcastChannelWrapper,
    IEmpackEnvMetaFile
  ],
  activate: async (
    app: JupyterLiteServer,
    kernelspecs: IKernelSpecs,
    serviceWorker?: IServiceWorkerManager,
    broadcastChannel?: IBroadcastChannelWrapper,
    empackEnvMetaFile?: IEmpackEnvMetaFile
  ) => {
    // Fetch kernel list
    let kernelList: string[] = [];
    try {
      kernelList = await getJson('xeus/kernels.json');
    } catch (err) {
      console.log(`Could not fetch xeus/kernels.json: ${err}`);
      throw err;
    }
    const contentsManager = app.serviceManager.contents;

    for (const kernel of kernelList) {
      // Fetch kernel spec
      const kernelspec = await getJson(
        'xeus/kernels/' + kernel + '/kernel.json'
      );
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
          const link = empackEnvMetaFile
            ? await empackEnvMetaFile.getLink(kernelspec)
            : '';

          return new WebWorkerKernel({
            ...options,
            contentsManager,
            mountDrive,
            kernelSpec: kernelspec,
            empackEnvMetaLink: link
          });
        }
      });
    }
    await app.serviceManager.kernelspecs.refreshSpecs();
  }
};

const empackEnvMetaPlugin: JupyterLiteServerPlugin<IEmpackEnvMetaFile> = {
  id: '@jupyterlite/xeus:empack-env-meta',
  autoStart: true,
  provides: IEmpackEnvMetaFile,
  activate: (): IEmpackEnvMetaFile => {
    return {
      getLink: async (kernelspec: Record<string, any>) => {
        const kernelName = kernelspec.name;
        const kernel_root_url = URLExt.join(
          PageConfig.getBaseUrl(),
          `xeus/kernels/${kernelName}`
        );
        return `${kernel_root_url}`;
      }
    };
  }
};

export default [empackEnvMetaPlugin, kernelPlugin];
