// Copyright (c) Thorsten Beier
// Copyright (c) JupyterLite Contributors
// Distributed under the terms of the Modified BSD License.

import {
  IServiceWorkerManager,
  JupyterLiteServer,
  JupyterLiteServerPlugin
} from '@jupyterlite/server';
import { IBroadcastChannelWrapper } from '@jupyterlite/contents';
import { IKernel, IKernelSpecs } from '@jupyterlite/kernel';

import { WebWorkerKernel } from './web_worker_kernel';




const rel_path = "../extensions/@jupyterlite/xeus-python-kernel/static/";

// helper function to fetch json 
function getPkgJson(url: string) {
  const json_url = rel_path + url;
  const xhr = new XMLHttpRequest();
  xhr.open("GET", json_url, false);
  xhr.send(null);
  return JSON.parse(xhr.responseText);
}

let kernel_dir : string[] = [];
try{
  kernel_dir = getPkgJson("share/jupyter/kernels.json")
}
catch(err){
  console.log(err);
  console.log("could not fetch share/jupyter/kernels/kernels.json");
  kernel_dir = []
  throw err;
}
console.log(kernel_dir);

// fetch kernel spec for each kernel
const kernel_specs = kernel_dir.map((kernel_dir) => {
  let spec : any =  getPkgJson("share/jupyter/kernels/" + kernel_dir + "/kernel.json")
  spec.name = kernel_dir;
  spec.dir = kernel_dir;
  spec.resources = {
    'logo-32x32': rel_path + "share/jupyter/kernels/" + kernel_dir + "/logo-32x32.png",
    'logo-64x64': rel_path + "share/jupyter/kernels/" + kernel_dir + "/logo-64x64.png",
  }
  return spec;
});

console.log(kernel_specs);

const server_kernels = kernel_specs.map((spec) => {
  let server_kernel : JupyterLiteServerPlugin<void> = {
    // use name from spec
    id: `@jupyterlite/${spec.name}-extension:kernel`, 
    autoStart: true,
    requires: [IKernelSpecs],
    optional: [IServiceWorkerManager, IBroadcastChannelWrapper],
    activate: (
      app: JupyterLiteServer,
      kernelspecs: IKernelSpecs,
      serviceWorker?: IServiceWorkerManager,
      broadcastChannel?: IBroadcastChannelWrapper
    ) => {
      kernelspecs.register({
        spec: spec,
        create: async (options: IKernel.IOptions): Promise<IKernel> => {
          const mountDrive = !!(
            serviceWorker?.enabled && broadcastChannel?.enabled
          );
  
          if (mountDrive) {
            console.info(
              `${spec.name} contents will be synced with Jupyter Contents`
            );
          } else {
            console.warn(
              `${spec.name} contents will NOT be synced with Jupyter Contents`
            );
          }
  
          return new WebWorkerKernel({
            ...options,
            mountDrive
          },
          spec
          );
        }
      });
    }
  };
  return server_kernel;
});




const plugins: JupyterLiteServerPlugin<any>[] = server_kernels;

export default plugins;
