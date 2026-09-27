/**
 * @file Final acceptance e2e (phase I-12): from an empty page, draw
 * 4-etenilheptano with real pointer clicks, name it, step through the whole
 * explanation, then "Ordenar dibujo". The test API is only used to look up
 * where atoms and bonds are drawn (and to read the result for assertions).
 * Runs in both projects; in the `dist` project it is the single-file build
 * opened through file://, which must not fetch anything else.
 */

import { test, expect } from '@playwright/test';

/**
 * Clicks on an atom of the drawing.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {number} id - Atom id.
 * @returns {Promise<void>}
 */
async function clickAtom(page, id) {
  const p = await page.evaluate((atomId) => window.__editor.atomClientPoint(atomId), id);
  await page.mouse.click(p.x, p.y);
}

/**
 * Clicks on the midpoint of a bond.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {number} id - Bond id.
 * @returns {Promise<void>}
 */
async function clickBond(page, id) {
  const p = await page.evaluate((bondId) => window.__editor.bondClientPoint(bondId), id);
  await page.mouse.click(p.x, p.y);
}

/**
 * Bonds of the drawing as "a-b:order" strings.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<string[]>} The bonds.
 */
async function bonds(page) {
  return page.evaluate(() => window.__editor.getMoleculeJSON().bonds.map((b) => `${b.a}-${b.b}:${b.order}`));
}

test('draw 4-etenilheptano, name it, step through the explanation and Ordenar dibujo', async ({ page }, testInfo) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('index.html');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  await expect(page.locator('svg#canvas .atom')).toHaveCount(0);
  const tools = page.getByRole('navigation', { name: 'Herramientas de dibujo' });

  // Heptane: a click on the empty canvas draws C1–C2, then each click on the
  // last carbon adds the next one.
  await tools.getByRole('button', { name: 'Enlace simple' }).click();
  const box = await page.locator('svg#canvas').boundingBox();
  await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.55);
  for (const id of [2, 3, 4, 5, 6]) {
    await clickAtom(page, id);
  }
  // The vinyl branch on C4: two clicks draw C4–C8 and C8–C9, then the
  // Enlace doble tool turns C8–C9 into a double bond.
  await clickAtom(page, 4);
  await clickAtom(page, 8);
  await tools.getByRole('button', { name: 'Enlace doble' }).click();
  await clickBond(page, 8);
  expect(await bonds(page)).toEqual(['1-2:1', '2-3:1', '3-4:1', '4-5:1', '5-6:1', '6-7:1', '4-8:1', '8-9:2']);
  await expect(page.locator('#formula')).toHaveText('Fórmula: C₉H₁₈');

  // Name it.
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('4-etenilheptano');
  await expect(page.locator('#announcer')).toHaveText('Se llama: 4-etenilheptano');

  // Step through the whole explanation with Siguiente.
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  const total = await stepper.locator('.step-dot').count();
  expect(total).toBeGreaterThanOrEqual(4);
  const titles = [];
  for (let i = 1; i <= total; i += 1) {
    await expect(stepper.locator('.step-count')).toHaveText(`Paso ${i} de ${total}`);
    const title = await stepper.locator('.step-title').textContent();
    titles.push(title);
    await expect(page.locator('#announcer')).toContainText(`Paso ${i} de ${total}. ${title}.`);
    await expect(stepper.locator('.step-content')).not.toBeEmpty();
    if (i < total) {
      await stepper.getByRole('button', { name: 'Siguiente' }).click();
    }
  } // End of the loop over the explanation steps
  expect(titles[0]).toBe('Cuenta los carbonos');
  expect(titles[total - 1]).toBe('Monta el nombre');
  await expect(stepper.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  await expect(stepper.locator('.step-content')).toContainText('4-etenilheptano');

  // Ordenar dibujo: the chain is redrawn, the name stays, the parent chain
  // is highlighted with its locants 1–7.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.map((a) => [a.x, a.y]));
  await expect(page.locator('#redraw-hint')).toBeVisible();
  await page.locator('#redraw-hint').getByRole('button', { name: 'Ordenar dibujo' }).click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.map((a) => [a.x, a.y]));
  expect(after).not.toEqual(before);
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('#result-name')).toHaveText('4-etenilheptano');
  expect(await bonds(page)).toEqual(['1-2:1', '2-3:1', '3-4:1', '4-5:1', '5-6:1', '6-7:1', '4-8:1', '8-9:2']);
  await expect(page.locator('svg#canvas .hl-parent').first()).toBeAttached();
  await expect(page.locator('svg#canvas .locant')).toHaveCount(7);
  // The main chain lies left to right: its carbons are sorted by x.
  const chainX = await page.evaluate(() => {
    const atoms = window.__editor.getMoleculeJSON().atoms;
    return [1, 2, 3, 4, 5, 6, 7].map((id) => atoms.find((a) => a.id === id).x);
  });
  const ascending = chainX.every((x, i) => i === 0 || x > chainX[i - 1]);
  const descending = chainX.every((x, i) => i === 0 || x < chainX[i - 1]);
  expect(ascending || descending).toBe(true);

  if (testInfo.project.name === 'dist') {
    const own = page.url();
    expect(own).toMatch(/^file:.*\/dist\/index\.html$/);
    expect(requests.filter((url) => url !== own)).toEqual([]);
  }
  expect(errors).toEqual([]);
}); // End of the acceptance test
