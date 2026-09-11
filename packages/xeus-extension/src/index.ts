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

/**
 * How long to wait for the service worker to take control of the page.
 */
const SERVICE_WORKER_CONTROL_TIMEOUT = 10000;

/**
 * Wait for the service worker to take control of this page.
 *
 * A page which is not cross-origin isolated has no SharedArrayBuffer, so the kernel
 * worker performs its synchronous filesystem and stdin calls as synchronous requests
 * answered by the service worker. A dedicated worker inherits the controller of the
 * document which created it, as it was at the time of creation, and never gets one
 * later. A kernel worker created before the service worker controls the page
 * therefore has none of its requests intercepted, for its whole lifetime: the kernel
 * hangs on its first filesystem call and the notebook stays at "Connecting" forever.
 *
 * @returns whether the service worker is now controlling the page.
 */
async function waitForServiceWorkerControl(
  serviceWorkerManager?: IServiceWorkerManager
): Promise<boolean> {
  const { serviceWorker } = navigator;

  // People can disable the service worker in their JupyterLite deployment.
  if (!serviceWorkerManager || !serviceWorker) {
    return false;
  }

  // registration is usually still in flight when the first kernel is requested,
  // and rejects when there is no service worker to be had at all
  try {
    await serviceWorkerManager.ready;
  } catch {
    return false;
  }

  if (!serviceWorkerManager.enabled) {
    return false;
  }

  if (serviceWorker.controller) {
    return true;
  }

  // the service worker claims its clients when it activates, so no reload is needed,
  // but that can happen after the kernel is requested
  const controlled = await new Promise<boolean>(resolve => {
    function done(): void {
      clearTimeout(timeout);
      serviceWorker.removeEventListener('controllerchange', done);
      resolve(serviceWorker.controller !== null);
    }

    const timeout = setTimeout(done, SERVICE_WORKER_CONTROL_TIMEOUT);
    serviceWorker.addEventListener('controllerchange', done);
    // controllerchange may have fired between the check above and the listener
    if (serviceWorker.controller) {
      done();
    }
  });

  if (!controlled) {
    console.warn(
      `The service worker did not take control of this page within ${
        SERVICE_WORKER_CONTROL_TIMEOUT / 1000
      }s`
    );
  }

  return controlled;
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

    // Wait for the service worker here, before any kernel can be requested, rather
    // than when one is created: a kernel whose creation blocks for more than about
    // a second loses its session, and the cells of its notebook then never run.
    if (!crossOriginIsolated) {
      await waitForServiceWorkerControl(serviceWorker);
    }

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

          // The drive is reached through SharedArrayBuffer when the page is
          // cross-origin isolated, and through the service worker otherwise. Mount
          // it only if one of the two is actually available right now: mounting it
          // on a page the service worker does not control leaves every filesystem
          // call of this kernel unanswered. This must not block, see above.
          const mountDrive =
            crossOriginIsolated ||
            !!(serviceWorker?.enabled && navigator.serviceWorker?.controller);

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
