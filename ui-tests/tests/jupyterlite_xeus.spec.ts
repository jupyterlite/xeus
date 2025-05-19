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

    const notebookSection = page.locator('.jp-Launcher-section').first();
    expect(await notebookSection.screenshot()).toMatchSnapshot(
      'jupyter-xeus-launcher.png'
    );
  });

  test('xeus-python should execute some code', async ({ page }) => {
    await page.goto('lab/index.html');

    const xpython = page
      .locator('[title="Python 3.13 (XPython) [env1]"]')
      .first();
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

  test('should support the same kernel from a second environment', async ({
    page
  }) => {
    await page.goto('lab/index.html');

    const xpython = page
      .locator('[title="Python 3.13 (XPython) [env2]"]')
      .first();
    await xpython.click();

    // Wait for kernel to be idle
    await page.locator('#jp-main-statusbar').getByText('Idle').waitFor();

    // xeus-python from env2 does not have bqplot installed.
    await page.notebook.addCell('code', 'import bqplot');
    await page.notebook.runCell(1);

    // Wait for kernel to be idle
    await page.locator('#jp-main-statusbar').getByText('Idle').waitFor();

    const cell = await page.notebook.getCellOutput(1);

    expect(await cell?.screenshot()).toMatchSnapshot(
      'jupyter-xeus-execute-env2.png'
    );
  });

  test('the kernel should have access to the file system', async ({ page }) => {
    await page.goto('lab/index.html');

    // Create a Python notebook
    const xpython = page
      .locator('[title="Python 3.13 (XPython) [env1]"]')
      .first();
    await xpython.click();

    await page.notebook.save();

    await page.notebook.setCell(0, 'code', 'import os; os.listdir()');
    await page.notebook.runCell(0);

    const cell = await page.notebook.getCellOutput(0);
    const cellContent = await cell?.textContent();
    const name = 'Untitled.ipynb';
    expect(cellContent).toContain(name);
  });

  test('Stdin using python kernel', async ({ page }) => {
    await page.goto('lab/index.html');

    // Create a Python notebook
    const xpython = page
      .locator('[title="Python 3.13 (XPython) [env2]"]')
      .first();
    await xpython.click();

    await page.notebook.save();

    await page.notebook.setCell(0, 'code', 'name = input("Prompt:")');
    let cell0 = page.notebook.runCell(0); // Do not await yet.

    // Run cell containing `input`.
    await page.locator('.jp-Stdin >> text=Prompt:').waitFor();
    await page.keyboard.insertText('My Name');
    await page.keyboard.press('Enter');
    await cell0; // await end of cell.

    let output = await page.notebook.getCellTextOutput(0);
    expect(output![0]).toEqual('Prompt: My Name\n');

    await page.notebook.setCell(
      0,
      'code',
      'import getpass; pw = getpass.getpass("Password:")'
    );
    cell0 = page.notebook.runCell(0); // Do not await yet.

    // Run cell containing `input`.
    await page.locator('.jp-Stdin >> text=Password:').waitFor();
    await page.keyboard.insertText('hidden123');
    await page.keyboard.press('Enter');
    await cell0; // await end of cell.

    output = await page.notebook.getCellTextOutput(0);
    expect(output![0]).toEqual('Password: ········\n');
  });

  test('pip install using python kernel', async ({ page }) => {
    await page.goto('lab/index.html');

    // Create a Python notebook
    const xpython = page
      .locator('[title="Python 3.13 (XPython) [env2]"]')
      .first();
    await xpython.click();

    await page.notebook.save();

    await page.notebook.setCell(0, 'code', 'import py2vega');
    await page.notebook.runCell(0);

    let output = await page.notebook.getCellTextOutput(0);
    expect(output![0]).toContain('ModuleNotFoundError');

    await page.notebook.setCell(1, 'code', '%pip install py2vega');
    await page.notebook.runCell(1);

    await page.notebook.setCell(2, 'code', 'import py2vega; print("ok")');
    await page.notebook.runCell(2);

    output = await page.notebook.getCellTextOutput(2);
    expect(output![0]).not.toContain('ModuleNotFoundError');
  });

  test('conda install using python kernel', async ({ page }) => {
    await page.goto('lab/index.html');

    // Create a Python notebook
    const xpython = page
      .locator('[title="Python 3.13 (XPython) [env2]"]')
      .first();
    await xpython.click();

    await page.notebook.save();

    await page.notebook.setCell(0, 'code', 'import ipycanvas');
    await page.notebook.runCell(0);

    let output = await page.notebook.getCellTextOutput(0);
    expect(output![0]).toContain('ModuleNotFoundError');

    await page.notebook.setCell(1, 'code', '%conda install ipycanvas');
    await page.notebook.runCell(1);

    await page.notebook.setCell(2, 'code', 'import ipycanvas; print("ok")');
    await page.notebook.runCell(2);

    output = await page.notebook.getCellTextOutput(2);
    expect(output![0]).not.toContain('ModuleNotFoundError');
  });
});
