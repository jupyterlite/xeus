// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEndPlugin,
  JupyterFrontEnd
} from '@jupyterlab/application';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

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

        console.log('kernel id', kernelId);

        const channel = new BroadcastChannel(`/kernel-broadcast/${kernelId}`);

        channel.onmessage = event => {
          console.log('RECEIVED MESSAGE IN THE MAIN THREAD', event);
        };
      });
    });
  }
};

export default [kernelStatusPlugin];
