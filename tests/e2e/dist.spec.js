/**
 * @file E2e check of the single-file build: dist/index.html, opened through a
 * file:// URL, shows the shell and runs its inlined script without errors.
 */

import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { writeBuild } from '../../scripts/build.mjs';

let distUrl;

test.beforeAll(async () => {
  distUrl = pathToFileURL(await writeBuild()).href;
});

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

  await page.goto(distUrl);
  await expect(page).toHaveTitle('Química orgánica');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Química orgánica');
  await expect(page.locator('svg#canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: '¿Cómo se llama?' })).toBeDisabled();
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  // The page must not fetch anything besides itself.
  expect(requests.filter((url) => url !== distUrl)).toEqual([]);
  expect(errors).toEqual([]);
});
