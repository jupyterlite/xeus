import { IServiceWorkerManager } from '@jupyterlite/apputils';

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
export async function waitForServiceWorkerControl(
  serviceWorkerManager?: IServiceWorkerManager,
  serviceWorkerControlTimeout = 10000
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

    const timeout = setTimeout(done, serviceWorkerControlTimeout);
    serviceWorker.addEventListener('controllerchange', done);
    // controllerchange may have fired between the check above and the listener
    if (serviceWorker.controller) {
      done();
    }
  });

  if (!controlled) {
    console.warn(
      `The service worker did not take control of this page within ${
        serviceWorkerControlTimeout / 1000
      }s`
    );
  }

  return controlled;
}
