import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the @jupyterlite/xeus extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlite/xeus:plugin',
  description: 'JupyterLite loader for Xeus kernels',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension @jupyterlite/xeus is activated!');
  }
};

export default plugin;
