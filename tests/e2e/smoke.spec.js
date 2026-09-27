/**
 * @file Smoke e2e: the development page (served over HTTP) loads the shell
 * without console errors and lays the results panel out responsively.
 */

import { test, expect } from '@playwright/test';

/**
 * Records console errors and uncaught page errors.
 *
 * @param {import('@playwright/test').Page} page - The page to watch.
 * @returns {string[]} Live array of error messages.
 */
function collectErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test('the shell loads with title, canvas and a disabled name button', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/index.html');
  await expect(page).toHaveTitle('Química orgánica');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Química orgánica');
  await expect(page.locator('svg#canvas')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Herramientas de dibujo' })).toBeVisible();
  await expect(page.getByRole('button', { name: '¿Cómo se llama?' })).toBeDisabled();
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  expect(errors).toEqual([]);
});

test('results sit beside the canvas on wide screens and below it on narrow ones', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/index.html');
  let canvas = await page.locator('.canvas-area').boundingBox();
  let results = await page.locator('#results').boundingBox();
  expect(results.x).toBeGreaterThanOrEqual(canvas.x + canvas.width);

  await page.setViewportSize({ width: 600, height: 900 });
  canvas = await page.locator('.canvas-area').boundingBox();
  results = await page.locator('#results').boundingBox();
  expect(results.y).toBeGreaterThanOrEqual(canvas.y + canvas.height);
});
