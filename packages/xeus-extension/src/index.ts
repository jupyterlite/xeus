// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEndPlugin,
  JupyterFrontEnd
} from '@jupyterlab/application';
import {
  MainAreaWidget,
  IToolbarWidgetRegistry,
  showErrorMessage
} from '@jupyterlab/apputils';
import { listIcon, ToolbarButton } from '@jupyterlab/ui-components';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { LoggerRegistry, LogConsolePanel } from '@jupyterlab/logconsole';
import { NotebookPanel } from '@jupyterlab/notebook';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';

import { IServiceWorkerManager } from '@jupyterlite/server';
import { IBroadcastChannelWrapper } from '@jupyterlite/contents';
import { IKernel, IKernelSpecs } from '@jupyterlite/kernel';

import { WebWorkerKernel } from '@jupyterlite/xeus';

import { IEmpackEnvMetaFile } from './tokens';

enum KernelStatus {
  None = 0,
  Info = 1,
  Warning = 2,
  Error = 3
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
  optional: [
    IServiceWorkerManager,
    IBroadcastChannelWrapper,
    IEmpackEnvMetaFile
  ],
  activate: async (
    app: JupyterFrontEnd,
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

const empackEnvMetaPlugin: JupyterFrontEndPlugin<IEmpackEnvMetaFile> = {
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

const kernelStatusPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlite/xeus-extension:xeus-kernel-status',
  autoStart: true,
  requires: [IToolbarWidgetRegistry, IRenderMimeRegistry],
  activate: async (
    app: JupyterFrontEnd,
    toolbarRegistry: IToolbarWidgetRegistry,
    rendermime: IRenderMimeRegistry
  ) => {
    const toolbarFactory = (panel: NotebookPanel) => {
      const session = panel.sessionContext;

      let currentState = KernelStatus.None;
      let kernelId: string | undefined;
      let kernelName: string | undefined;
      let logConsolePanel: LogConsolePanel | undefined;
      let sourceId: string | undefined;
      let logConsoleWidget: MainAreaWidget<LogConsolePanel> | undefined;

      const createWidget = () => {
        if (!logConsolePanel) {
          return;
        }

        logConsoleWidget = new MainAreaWidget<LogConsolePanel>({
          content: logConsolePanel
        });
        logConsoleWidget.title.label = 'Kernel Logs';
        logConsoleWidget.title.icon = listIcon;
        logConsoleWidget.id = `${sourceId}-widget`;
      };

      const toolbarButton = new ToolbarButton({
        icon: listIcon,
        onClick: () => {
          if (!logConsolePanel) {
            showErrorMessage(
              'Cannot show logs',
              'Cannot show logs for the current kernel'
            );
            return;
          }

          if (!logConsoleWidget) {
            createWidget();
          }

          if (logConsoleWidget) {
            if (logConsoleWidget.isDisposed) {
              createWidget();
            }

            if (!logConsoleWidget.isAttached) {
              app.shell.add(logConsoleWidget, 'main', { mode: 'split-bottom' });
            }

            app.shell.activateById(logConsoleWidget.id);
          }
        },
        tooltip: 'Show kernel logs'
      });

      session.kernelChanged.connect(() => {
        kernelId = session.session?.id;
        kernelName = session.session?.kernel?.name;

        currentState = KernelStatus.None;

        if (!kernelId || !kernelName) {
          return;
        }

        sourceId = `${kernelName}-${kernelId}`;

        logConsolePanel = new LogConsolePanel(
          new LoggerRegistry({
            defaultRendermime: rendermime,
            maxLength: 1000
          })
        );

        logConsolePanel.source = sourceId;

        const channel = new BroadcastChannel(`/kernel-broadcast/${kernelId}`);

        if (logConsolePanel.logger) {
          logConsolePanel.logger.level = 'info';
        }

        // Scroll to bottom when new content shows up
        logConsolePanel.logger?.contentChanged.connect(() => {
          const element = document.getElementById(`source:${sourceId}`);

          if (!element) {
            return;
          }

          const lastChild = element.lastElementChild;
          if (lastChild) {
            lastChild.scrollIntoView({ behavior: 'smooth' });
          }
        });

        channel.onmessage = event => {
          if (!logConsolePanel) {
            return;
          }

          switch (event.data.type) {
            case 'log':
              logConsolePanel.logger?.log({
                type: 'text',
                level: 'info',
                data: event.data.msg
              });

              if (currentState < KernelStatus.Info) {
                currentState = KernelStatus.Info;
                toolbarButton.addClass('xeus-kernel-status-info');
              }
              break;
            case 'warn':
              logConsolePanel.logger?.log({
                type: 'text',
                level: 'warning',
                data: event.data.msg
              });

              if (currentState < KernelStatus.Warning) {
                currentState = KernelStatus.Warning;
                toolbarButton.addClass('xeus-kernel-status-warning');
              }
              break;
            case 'error':
              logConsolePanel.logger?.log({
                type: 'text',
                level: 'error',
                data: event.data.msg
              });

              if (currentState < KernelStatus.Error) {
                currentState = KernelStatus.Error;
                toolbarButton.addClass('xeus-kernel-status-error');
              }
              break;
          }
        };
      });

      return toolbarButton;
    };

    if (toolbarRegistry) {
      toolbarRegistry.addFactory<NotebookPanel>(
        'Notebook',
        'xeusKernelLogs',
        toolbarFactory
      );
    }
  }
};

export default [kernelStatusPlugin, empackEnvMetaPlugin, kernelPlugin];
export { IEmpackEnvMetaFile };
