/**
 * @file "Resaltar en el dibujo" e2e (design.md §9): the switch in the stepper
 * hides and restores the canvas highlights and locant numbers without
 * leaving or resetting the stepper, works from the keyboard with the right
 * aria-pressed state, stays off while stepping, is remembered across
 * reloads, and also governs the marks shown with the stepper closed, the
 * ordered drawing's parent highlight and the 90° view.
 */

import { test, expect } from '@playwright/test';

/**
 * Opens the app and waits until it is ready, collecting page errors.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<string[]>} The live list of console/page errors.
 */
async function openApp(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('index.html');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  return errors;
}

/**
 * Chooses an example from the Ejemplos menu.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} label - The menu item text.
 * @returns {Promise<void>}
 */
async function loadExample(page, label) {
  await page.getByRole('button', { name: 'Ejemplos' }).click();
  await page.getByRole('menuitem', { name: label, exact: true }).click();
  await expect(page.locator('#examples-menu')).toBeHidden();
}

/**
 * Counts the stepper marks on the canvas.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<{hl: number, locants: number}>} Highlight shapes and locant numbers.
 */
async function marks(page) {
  return page.evaluate(() => ({
    hl: document.querySelectorAll('svg#canvas .hl').length,
    locants: document.querySelectorAll('svg#canvas .locant').length,
  }));
}

test('the stepper switch hides and restores the marks without moving the stepper', async ({ page }) => {
  const errors = await openApp(page);
  await loadExample(page, 'Alcano ramificado');
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  const count = stepper.locator('.step-count');
  const next = stepper.getByRole('button', { name: 'Siguiente' });
  await next.click();
  await expect(count).toHaveText(/^Paso 2 de/);
  const step2 = await marks(page);
  expect(step2.hl).toBeGreaterThan(0);
  const title2 = await stepper.locator('.step-title').textContent();

  // The switch lives in the stepper; the one under the name is hidden meanwhile.
  const toggle = stepper.getByRole('button', { name: 'Resaltar en el dibujo' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#result-marks-toggle')).toBeHidden();

  // Keyboard: focus the switch and press Space.
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toBeFocused();
  expect(await marks(page)).toEqual({ hl: 0, locants: 0 });
  await expect(count).toHaveText(/^Paso 2 de/);
  await expect(stepper.locator('.step-title')).toHaveText(title2);
  await expect(stepper).toBeVisible();

  // Stepping on keeps the marks off while the text advances.
  const total = Number((await count.textContent()).match(/de (\d+)/)[1]);
  for (let step = 3; step <= total; step += 1) {
    await next.click();
    await expect(count).toHaveText(`Paso ${step} de ${total}`);
    expect(await marks(page)).toEqual({ hl: 0, locants: 0 });
  }
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  // Enter switches them back on: the current (last) step's marks show.
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const last = await marks(page);
  expect(last.hl).toBeGreaterThan(0);
  expect(last.locants).toBeGreaterThan(0);

  // Back to step 2: the same marks as before.
  await stepper.locator('.step-dot').nth(1).click();
  expect(await marks(page)).toEqual(step2);
  expect(errors).toEqual([]);
}); // End of test 'the stepper switch hides and restores the marks…'

test('the choice is remembered and also governs the closed stepper and the ordered drawing', async ({ page }) => {
  const errors = await openApp(page);
  await loadExample(page, 'Rama con un enlace doble');
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('4-etenilheptano');
  const outer = page.locator('#result-marks-toggle');
  await expect(outer).toBeVisible();
  await expect(outer).toHaveAttribute('aria-pressed', 'true');
  expect((await marks(page)).hl).toBeGreaterThan(0);

  // Ordenar dibujo: the parent stays highlighted with its locants…
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  await expect(page.locator('svg#canvas .hl-parent.hl-atom')).toHaveCount(7);
  // …until the switch under the name turns every mark off.
  await outer.click();
  await expect(outer).toHaveAttribute('aria-pressed', 'false');
  expect(await marks(page)).toEqual({ hl: 0, locants: 0 });
  expect(await page.evaluate(() => localStorage.getItem('organicWeb.highlights'))).toBe('off');

  // The stepper opens with its switch off and draws nothing.
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  await expect(outer).toBeHidden();
  await expect(page.locator('#stepper-marks-toggle')).toHaveAttribute('aria-pressed', 'false');
  expect(await marks(page)).toEqual({ hl: 0, locants: 0 });
  await page.locator('#stepper-marks-toggle').click();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom')).toHaveCount(7);
  await page.locator('#stepper-marks-toggle').click();
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();
  await expect(outer).toBeVisible();
  await expect(outer).toHaveAttribute('aria-pressed', 'false');

  // Remembered after a reload.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-marks-toggle')).toHaveAttribute('aria-pressed', 'false');
  expect(await marks(page)).toEqual({ hl: 0, locants: 0 });
  await page.locator('#result-marks-toggle').click();
  expect((await marks(page)).hl).toBeGreaterThan(0);
  expect(await page.evaluate(() => localStorage.getItem('organicWeb.highlights'))).toBe('on');
  expect(errors).toEqual([]);
}); // End of test 'the choice is remembered…'

test('the switch hides the marks in the 90° view too', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await loadExample(page, 'Alcano con muchas ramas');
  await page.locator('#right-angle-button').click();
  expect(await page.evaluate(() => window.__editor.isReadOnly())).toBe(true);
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  await stepper.locator('.step-dot').last().click();
  const shown = await marks(page);
  expect(shown.hl).toBeGreaterThan(0);
  expect(shown.locants).toBeGreaterThan(0);
  await stepper.getByRole('button', { name: 'Resaltar en el dibujo' }).click();
  expect(await marks(page)).toEqual({ hl: 0, locants: 0 });
  await stepper.getByRole('button', { name: 'Anterior' }).click();
  expect(await marks(page)).toEqual({ hl: 0, locants: 0 });
  await stepper.getByRole('button', { name: 'Resaltar en el dibujo' }).click();
  expect((await marks(page)).hl).toBeGreaterThan(0);
  expect(errors).toEqual([]);
}); // End of test 'the switch hides the marks in the 90° view too'
