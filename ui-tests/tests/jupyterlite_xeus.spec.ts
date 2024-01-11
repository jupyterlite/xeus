import { test } from '@jupyterlab/galata';

import { expect } from '@playwright/test';

test.describe('General Tests', () => {
  test.beforeEach(({ page }) => {
    page.setDefaultTimeout(600000);

    page.on('console', message => {
      console.log('CONSOLE MSG ---', message.text());
    });
  });

  test('Launcher should contain xeus-python and xeus-lua kernels', async ({
    page
  }) => {
    await page.goto('lab/index.html');

    expect(await page.screenshot()).toMatchSnapshot(
      'jupyter-xeus-launcher.png'
    );
  });

  test('xeus-python should execute some code', async ({ page }) => {
    await page.goto('lab/index.html');

    // Launch a Python notebook
    const xpython = page.locator('[title="Python 3.11 (XPython)"]').first();
    await xpython.click();

    // Wait for kernel to be idle
    await page.locator('#jp-main-statusbar').getByText('Idle').waitFor();

    await page.notebook.addCell('code', 'import bqplot; print("ok")');
    await page.notebook.runCell(1);

    // Wait for kernel to be idle
    await page.locator('#jp-main-statusbar').getByText('Idle').waitFor();

    const cell = await page.notebook.getCellOutput(1);

    expect(await cell?.screenshot()).toMatchSnapshot(
      'jupyter-xeus-execute.png'
    );
  });
});
