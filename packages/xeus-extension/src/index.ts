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

enum KernelStatus {
  None = 0,
  Info = 1,
  Warning = 2,
  Error = 3
}

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

          if (logConsoleWidget) {
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

        logConsoleWidget = new MainAreaWidget<LogConsolePanel>({
          content: logConsolePanel
        });
        logConsoleWidget.title.label = 'Kernel Logs';
        logConsoleWidget.title.icon = listIcon;
        logConsoleWidget.id = `${sourceId}-widget`;

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

export default [kernelStatusPlugin];
