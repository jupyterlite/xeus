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

        const sourceId = `${kernelName}-${kernelId}`;

        const logConsolePanel = new LogConsolePanel(
          new LoggerRegistry({
            defaultRendermime: rendermime,
            maxLength: 1000
          })
        );

        logConsolePanel.source = sourceId;

        nbPanel.toolbar.addItem(
          'kernel logs',
          new ToolbarButton({
            icon: listIcon,
            onClick: () => {
              const logConsoleWidget = new MainAreaWidget<LogConsolePanel>({
                content: logConsolePanel
              });
              logConsoleWidget.title.label = 'Kernel Logs';
              logConsoleWidget.title.icon = listIcon;

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
