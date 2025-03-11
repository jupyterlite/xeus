// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEndPlugin, JupyterFrontEnd } from '@jupyterlab/application';

const kernelStatusPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlite/xeus-extension:kernel-status',
  autoStart: true,
  optional: [],
  activate: async (
    app: JupyterFrontEnd
  ) => {
    console.log('ACTIVATE XEUS_EXTENSION', app);
  }
};

export default [kernelStatusPlugin];
