/**
 * @file Editor e2e (design.md §6.1): drawing with real pointer clicks and
 * drags on the SVG canvas, asserting the molecule through the test API
 * published as `window.__editor` (src/ui/app.js).
 */

import { test, expect } from '@playwright/test';

/**
 * Current molecule as `{atoms: id[], bonds: "a-b:order"[]}`.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<{atoms: number[], bonds: string[]}>} The summary.
 */
async function shape(page) {
  return page.evaluate(() => {
    const json = window.__editor.getMoleculeJSON();
    return { atoms: json.atoms.map((a) => a.id), bonds: json.bonds.map((b) => `${b.a}-${b.b}:${b.order}`) };
  });
}

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
 * Clicks on the canvas at a fraction of its size.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {number} fx - Horizontal fraction (0–1).
 * @param {number} fy - Vertical fraction (0–1).
 * @returns {Promise<void>}
 */
async function clickCanvas(page, fx, fy) {
  const box = await page.locator('svg#canvas').boundingBox();
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
}

test.beforeEach(async ({ page }) => {
  await page.goto('index.html');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
});

test('draw butane by clicks, set a double bond, undo, redo, erase an atom', async ({ page }) => {
  const tools = page.getByRole('navigation', { name: 'Herramientas de dibujo' });
  await expect(tools.getByRole('button', { name: 'Enlace simple' })).toHaveAttribute('aria-pressed', 'true');
  await clickCanvas(page, 0.3, 0.5);
  await clickAtom(page, 2);
  await clickAtom(page, 3);
  expect(await shape(page)).toEqual({ atoms: [1, 2, 3, 4], bonds: ['1-2:1', '2-3:1', '3-4:1'] });
  await expect(page.locator('svg#canvas .bond')).toHaveCount(3);

  await tools.getByRole('button', { name: 'Enlace doble' }).click();
  await clickBond(page, 2);
  expect((await shape(page)).bonds).toEqual(['1-2:1', '2-3:2', '3-4:1']);
  await expect(page.locator('svg#canvas .bond[data-bond-id="2"] .bond-line')).toHaveCount(2);

  await tools.getByRole('button', { name: 'Deshacer' }).click();
  expect((await shape(page)).bonds).toEqual(['1-2:1', '2-3:1', '3-4:1']);
  await tools.getByRole('button', { name: 'Rehacer' }).click();
  expect((await shape(page)).bonds).toEqual(['1-2:1', '2-3:2', '3-4:1']);
  await expect(tools.getByRole('button', { name: 'Rehacer' })).toBeDisabled();

  await tools.getByRole('button', { name: 'Borrar' }).click();
  await clickAtom(page, 4);
  expect(await shape(page)).toEqual({ atoms: [1, 2, 3], bonds: ['1-2:1', '2-3:2'] });
});

test('the Carbono tool draws methane', async ({ page }) => {
  await page.getByRole('button', { name: 'Carbono', exact: true }).click();
  await clickCanvas(page, 0.5, 0.5);
  expect(await shape(page)).toEqual({ atoms: [1], bonds: [] });
  await expect(page.locator('svg#canvas .atom-label')).toHaveText('CH₄');
});

test('a fifth bond on a carbon shows a toast and changes nothing', async ({ page }) => {
  await page.getByRole('button', { name: 'Carbono', exact: true }).click();
  await clickCanvas(page, 0.5, 0.5);
  for (let i = 0; i < 4; i += 1) {
    await clickAtom(page, 1);
  }
  expect((await shape(page)).atoms).toHaveLength(5);
  const toast = page.locator('#toast');
  await expect(toast).toBeHidden();
  await clickAtom(page, 1);
  await expect(toast).toBeVisible();
  await expect(toast).toHaveText('Este carbono ya tiene 4 enlaces.');
  expect((await shape(page)).atoms).toHaveLength(5);
});

test('dragging from an atom adds a bond; Esc cancels a drag in progress', async ({ page }) => {
  await clickCanvas(page, 0.4, 0.5);
  const p = await page.evaluate(() => window.__editor.atomClientPoint(1));
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 10, p.y + 40, { steps: 4 });
  await expect(page.locator('svg#canvas .preview-line')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('svg#canvas .preview-line')).toHaveCount(0);
  await page.mouse.up();
  expect(await shape(page)).toEqual({ atoms: [1, 2], bonds: ['1-2:1'] });

  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 5, p.y + 80, { steps: 4 });
  await page.mouse.up();
  expect(await shape(page)).toEqual({ atoms: [1, 2, 3], bonds: ['1-2:1', '1-3:1'] });
});

test('Limpiar asks in an in-page dialog and is undoable', async ({ page }) => {
  await clickCanvas(page, 0.5, 0.5);
  await page.getByRole('button', { name: 'Limpiar' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toBeHidden();
  expect((await shape(page)).atoms).toHaveLength(2);
  await page.getByRole('button', { name: 'Limpiar' }).click();
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => shape(page)).toEqual({ atoms: [], bonds: [] });
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await shape(page)).atoms).toHaveLength(2);
});

test('the highlight API draws highlights and locants', async ({ page }) => {
  await clickCanvas(page, 0.4, 0.5);
  await page.evaluate(() => {
    window.__editor.highlight([{ atoms: [1, 2], bonds: [1], style: 'parent' }]);
    window.__editor.showLocants(new Map([[1, 1], [2, 2]]));
  });
  await expect(page.locator('svg#canvas .hl-parent')).toHaveCount(3);
  await expect(page.locator('svg#canvas .locant')).toHaveText(['1', '2']);
  await page.evaluate(() => {
    window.__editor.clearHighlight();
    window.__editor.showLocants(null);
  });
  await expect(page.locator('svg#canvas .hl')).toHaveCount(0);
  await expect(page.locator('svg#canvas .locant')).toHaveCount(0);
});
