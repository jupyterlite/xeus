// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import type {
  JupyterFrontEndPlugin,
  JupyterFrontEnd
} from '@jupyterlab/application';
import type { ILogPayload } from '@jupyterlab/logconsole';
import { ILoggerRegistry } from '@jupyterlab/logconsole';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';

import { IServiceWorkerManager } from '@jupyterlite/apputils';
import type { IKernel } from '@jupyterlite/services';
import { IKernelSpecs } from '@jupyterlite/services';

import { WebWorkerKernel } from '@jupyterlite/xeus';

import { IEmpackEnvMetaFile } from './tokens';

/**
 * Interface for items in the kernel list (kernels.json file), created in XeusAddon.
 */
interface IKernelListItem {
  env_name: string;
  kernel: string;
}

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

const kernelPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlite/xeus-kernel:register',
  autoStart: true,
  requires: [IKernelSpecs],
  optional: [IServiceWorkerManager, IEmpackEnvMetaFile, ILoggerRegistry],
  activate: async (
    app: JupyterFrontEnd,
    kernelspecs: IKernelSpecs,
    serviceWorker?: IServiceWorkerManager,
    empackEnvMetaFile?: IEmpackEnvMetaFile,
    loggerRegistry?: ILoggerRegistry
  ) => {
    // Fetch kernel list
    let kernelList: IKernelListItem[] = [];
    try {
      kernelList = await getJson('xeus/kernels.json');
    } catch (err) {
      console.log(`Could not fetch xeus/kernels.json: ${err}`);
      throw err;
    }
    const contentsManager = app.serviceManager.contents;

    const kernelNames = kernelList.map(item => item.kernel);
    const duplicateNames = kernelNames.filter(
      (item, index) => kernelNames.indexOf(item) !== index
    );

    for (const kernelItem of kernelList) {
      const { env_name, kernel } = kernelItem;
      // Fetch kernel spec
      const kernelspec = await getJson(
        `xeus/${env_name}/${kernel}/kernel.json`
      );
      kernelspec.name = kernel;
      kernelspec.dir = kernel;
      kernelspec.envName = env_name;

      if (duplicateNames.includes(kernel)) {
        // Ensure kernelspec.name and display_name are unique.
        kernelspec.name = `${kernel} (${env_name})`;
        kernelspec.display_name = `${kernelspec.display_name} [${env_name}]`;
      }

      for (const [key, value] of Object.entries(kernelspec.resources)) {
        kernelspec.resources[key] = URLExt.join(
          PageConfig.getBaseUrl(),
          value as string
        );
      }
      kernelspecs.register({
        spec: kernelspec,
        create: async (options: IKernel.IOptions): Promise<IKernel> => {
          // If kernelspec.name contains a space then the actual name of the executable
          // is only the part before the space.
          const index = kernelspec.name.indexOf(' ');
          if (index > 0) {
            kernelspec.name = kernelspec.name.slice(0, index);
          }

          const mountDrive = !!(serviceWorker?.enabled || crossOriginIsolated);
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
            empackEnvMetaLink: link,
            browsingContextId: serviceWorker?.browsingContextId || ''
          });
        }
      });
    }

    // @ts-expect-error: refreshSpecs() is not doing what it says it does, so we don't use it
    await app.serviceManager.kernelspecs._specsChanged.emit(
      app.serviceManager.kernelspecs.specs
    );

    // Kernel logs
    if (loggerRegistry) {
      const channel = new BroadcastChannel('/xeus-kernel-logs-broadcast');

      channel.addEventListener('message', event => {
        const { kernelId, payload } = event.data as {
          kernelId: string;
          payload: ILogPayload;
        };

        const { sessions } = app.serviceManager;

        // Find the session path that corresponds to the kernel ID
        let sessionPath = '';
        for (const session of sessions.running()) {
          if (session.kernel?.id === kernelId) {
            sessionPath = session.path;
            break;
          }
        }

        const logger = loggerRegistry.getLogger(sessionPath);
        logger.log(payload);
      });
    }
  }
};

const empackEnvMetaPlugin: JupyterFrontEndPlugin<IEmpackEnvMetaFile> = {
  id: '@jupyterlite/xeus:empack-env-meta',
  autoStart: true,
  provides: IEmpackEnvMetaFile,
  activate: (): IEmpackEnvMetaFile => {
    return {
      getLink: async (kernelspec: Record<string, any>) => {
        const { envName } = kernelspec;
        const kernel_root_url = URLExt.join(
          PageConfig.getBaseUrl(),
          `xeus/${envName}`
        );
        return `${kernel_root_url}`;
      }
    };
  }
};

export default [empackEnvMetaPlugin, kernelPlugin];
export { IEmpackEnvMetaFile };
