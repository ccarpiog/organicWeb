/**
 * @file E2e check of the single-file build: dist/index.html, opened through a
 * file:// URL, shows the shell and runs its inlined script (editor, naming
 * engine and explanation included) without errors and without fetching
 * anything. Runs in the `dist` project only (playwright.config.js), whose
 * global set-up has just rebuilt the file.
 */

import { test, expect } from '@playwright/test';

test('dist/index.html works from file://', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));

  await page.goto('index.html');
  const distUrl = page.url();
  expect(distUrl).toMatch(/^file:.*\/dist\/index\.html$/);
  await expect(page).toHaveTitle('Química orgánica');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Química orgánica');
  await expect(page.locator('svg#canvas')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  await expect(page.getByRole('button', { name: '¿Cómo se llama?' })).toBeEnabled();
  // The bundled editor works: the Carbono tool draws methane.
  await page.getByRole('button', { name: 'Carbono', exact: true }).click();
  const box = await page.locator('svg#canvas').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('svg#canvas .atom-label')).toHaveText('CH₄');
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.length)).toBe(1);
  // The bundled naming engine and explanation work too.
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('metano');
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  await expect(page.locator('.step-title')).toHaveText('Cuenta los carbonos');
  // The page must not fetch anything besides itself.
  expect(requests.filter((url) => url !== distUrl)).toEqual([]);
  expect(errors).toEqual([]);
});
