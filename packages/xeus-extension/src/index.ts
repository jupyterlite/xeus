// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEndPlugin,
  JupyterFrontEnd
} from '@jupyterlab/application';

import { MainAreaWidget } from '@jupyterlab/apputils';

import { listIcon, ToolbarButton } from '@jupyterlab/ui-components';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { LoggerRegistry, LogConsolePanel } from '@jupyterlab/logconsole';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

const kernelStatusPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlite/xeus-extension:kernel-status',
  autoStart: true,
  optional: [],
  requires: [INotebookTracker, IRenderMimeRegistry],
  activate: async (
    app: JupyterFrontEnd,
    notebooks: INotebookTracker,
    rendermime: IRenderMimeRegistry
  ) => {
    notebooks.widgetAdded.connect((sender, nbPanel: NotebookPanel) => {
      const session = nbPanel.sessionContext;

      session.kernelChanged.connect(() => {
        const kernelId = session.session?.id;
        const kernelName = session.session?.kernel?.name;

        if (!kernelId || !kernelName) {
          return;
        }

        // TODO detect xeus kernel and don't show the logs for other kernels?

        const logConsolePanel = new LogConsolePanel(
          new LoggerRegistry({
            defaultRendermime: rendermime,
            maxLength: 1000
          })
        );

        logConsolePanel.source = kernelName;

        const logConsoleWidget = new MainAreaWidget<LogConsolePanel>({
          content: logConsolePanel
        });
        logConsoleWidget.title.label = 'Kernel Logs';
        logConsoleWidget.title.icon = listIcon;

        nbPanel.toolbar.addItem(
          'kernel logs',
          new ToolbarButton({
            icon: listIcon,
            onClick: () => {
              app.shell.add(logConsoleWidget, 'main', { mode: 'split-bottom' });
            },
            tooltip: 'Show kernel logs'
          })
        );

        const channel = new BroadcastChannel(`/kernel-broadcast/${kernelId}`);

        if (logConsolePanel.logger) {
          logConsolePanel.logger.level = 'info';
        }

        channel.onmessage = event => {
          switch (event.data.type) {
            case 'log':
              console.log('logger defined?', logConsolePanel.logger);
              logConsolePanel.logger?.log({
                type: 'text',
                level: 'info',
                data: event.data.msg
              });
              break;
            case 'warn':
              logConsolePanel.logger?.log({
                type: 'text',
                level: 'warning',
                data: event.data.msg
              });
              break;
            case 'error':
              logConsolePanel.logger?.log({
                type: 'text',
                level: 'error',
                data: event.data.msg
              });
              break;
          }
        };
      });
    });
  }
};

export default [kernelStatusPlugin];
