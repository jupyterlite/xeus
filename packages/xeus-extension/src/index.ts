// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEndPlugin,
  JupyterFrontEnd
} from '@jupyterlab/application';

import { listIcon, ToolbarButton } from '@jupyterlab/ui-components';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { LogsDialog, LogsModel } from './logs';

const kernelStatusPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlite/xeus-extension:kernel-status',
  autoStart: true,
  optional: [],
  requires: [INotebookTracker],
  activate: async (app: JupyterFrontEnd, notebooks: INotebookTracker) => {
    console.log('ACTIVATE XEUS_EXTENSION', app);

    notebooks.widgetAdded.connect((sender, nbPanel: NotebookPanel) => {
      const session = nbPanel.sessionContext;

      console.log(session);
      session.kernelChanged.connect(() => {
        const kernelId = session.session?.id;

        if (!kernelId) {
          return;
        }

        // TODO detect xeus kernel and don't show the button for other kernels?
        console.log('kernel name', session.session?.kernel?.name);

        const logsModel = new LogsModel(kernelId);

        nbPanel.toolbar.addItem(
          'kernel logs',
          new ToolbarButton({
            icon: listIcon,
            onClick: () => {
              const dialog = new LogsDialog(logsModel);
              dialog.launch();
            },
            tooltip: 'Show kernel logs'
          })
        );
      });
    });
  }
};

export default [kernelStatusPlugin];
