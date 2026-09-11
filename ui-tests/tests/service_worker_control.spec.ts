import { expect, test } from '@playwright/test';

/**
 * A page which is not cross-origin isolated has no SharedArrayBuffer, so the kernel
 * worker performs its synchronous filesystem calls as synchronous requests answered
 * by the service worker. A dedicated worker inherits the controller of the document
 * which created it, as it was at the time of creation, and never gets one later, so
 * a kernel worker created before the service worker controls the page has none of
 * its requests intercepted and hangs on its first filesystem call.
 *
 * Record, for every worker created, whether the page was controlled at the time.
 */
const RECORD_WORKER_CREATION = `
  globalThis._workers = [];
  const OriginalWorker = Worker;
  globalThis.Worker = new Proxy(OriginalWorker, {
    construct(target, args) {
      globalThis._workers.push({
        url: String(args[0]),
        controlled: !!navigator.serviceWorker?.controller
      });
      return new target(...args);
    }
  });
`;

/**
 * How long to hold back the service worker script, in milliseconds. On a fast local
 * server the service worker takes control well before a kernel can be requested,
 * which hides the race. Must stay below the timeout the extension waits for the
 * service worker to take control.
 */
const SERVICE_WORKER_DELAY = 5000;

test.describe('Service Worker control', () => {
  // with SharedArrayBuffer the kernel worker talks to the main thread directly and
  // does not need the service worker at all
  test.skip(
    ({ baseURL }) => !!baseURL?.includes('8080'),
    'only applies when the page is not cross-origin isolated'
  );

  test('the kernel worker is not created before the service worker controls the page', async ({
    page
  }) => {
    test.setTimeout(120000);

    await page.addInitScript(RECORD_WORKER_CREATION);

    await page.context().route(/service-worker\.js/, async route => {
      await new Promise(resolve => setTimeout(resolve, SERVICE_WORKER_DELAY));
      await route.continue();
    });

    await page.goto('lab/index.html');

    const workersBeforeKernel: number = await page.evaluate(
      () => ((globalThis as any)._workers ?? []).length
    );

    // start a kernel as soon as the launcher offers one
    await page
      .locator('[title="JavaScript (xjavascript)"]')
      .first()
      .click({ timeout: 60000 });

    // The kernel worker URL is a bundler-generated path and does not reliably
    // contain a stable substring such as "comlink". Wait for the kernel to
    // become idle, then inspect every Worker created after the click.
    await page
      .locator('#jp-main-statusbar')
      .getByText('Idle')
      .waitFor({ timeout: 60000 });

    const workers: { url: string; controlled: boolean }[] = await page.evaluate(
      () => (globalThis as any)._workers ?? []
    );

    const kernelWorkers = workers.slice(workersBeforeKernel);

    expect(kernelWorkers.length).toBeGreaterThan(0);
    expect(kernelWorkers.filter(worker => !worker.controlled)).toEqual([]);
  });
});
