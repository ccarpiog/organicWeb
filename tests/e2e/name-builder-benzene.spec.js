/**
 * @file «¿Cómo se dibuja?» with benzene e2e (design.md §15.2, §15.8 R-4;
 * phase I-50b, R-4b): the «Anillos» row offers `benceno` and `fenil` beside
 * `ciclo`; tiles `1 4 di met il benceno` build `1,4-dimetilbenceno`, and
 * «Dibujar» puts the benzene ring on the canvas — six ring bonds, three of
 * them double, and the two methyls, one undoable edit, centred and ordered,
 * the ring highlighted as the parent — with «¡Correcto!» above «Se llama:»;
 * a substituted phenyl on a chain, `1-(4-metilfenil)propano`, draws the
 * molecule the app names on its ring (another name, with its diagnosis);
 * numbers of its own on `benceno` stay in the dialog with their message and
 * the tiles marked, the canvas untouched. Runs on the dev server and on dist
 * (playwright.config.js).
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
} // End of function openApp()

/**
 * Opens the dialog, empties the name and taps tiles by their accessible names.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {...string} texts - Tile names, in order.
 * @returns {Promise<import('@playwright/test').Locator>} The dialog.
 */
async function buildName(page, ...texts) {
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of texts) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  return dialog;
} // End of function buildName()

/**
 * The molecule on the canvas, serialised.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<object>} moleculeToJSON() output.
 */
function moleculeJSON(page) {
  return page.evaluate(() => window.__editor.getMoleculeJSON());
}

/**
 * Tells whether every atom, as drawn, lies inside the canvas on screen.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<boolean>} True when the whole drawing is visible.
 */
function drawingInsideCanvas(page) {
  return page.evaluate(() => {
    const box = document.getElementById('canvas').getBoundingClientRect();
    return window.__editor.getMoleculeJSON().atoms.every((atom) => {
      const p = window.__editor.atomClientPoint(atom.id);
      return p.x >= box.left && p.x <= box.right && p.y >= box.top && p.y <= box.bottom;
    });
  });
}

/**
 * The tile indices of the name line's options marked aria-invalid.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<number[]>} The indices.
 */
function invalidTiles(page) {
  return page.locator('#name-builder-name [aria-invalid="true"]')
    .evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.index)));
}

test('«Anillos»: tiles `1 4 di met il benceno` draw p-xylene, correct, ordered; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const rings = dialog.getByRole('group', { name: 'Anillos' });
  for (const [id, text] of [['ring-cyclo', 'ciclo'], ['ring-benzene', 'benceno'], ['retained-phenyl', 'fenil']]) {
    const tile = rings.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveText(text);
    await expect(tile).toBeVisible();
  }
  await page.keyboard.press('Escape');

  await buildName(page, '1', '4', 'di', 'met', 'il', 'benceno');
  await expect(page.locator('#name-builder-name')).toHaveText('1,4-dimetilbenceno');
  await expect(page.locator('#name-builder-name .part-stem')).toHaveText('benceno');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // The benzene ring is on the canvas: eight carbons, eight bonds (six in the ring, three of them double), whole and in view.
  const drawn = await moleculeJSON(page);
  expect(drawn.atoms).toHaveLength(8);
  expect(drawn.bonds).toHaveLength(8);
  expect(drawn.bonds.filter((bond) => bond.order === 2)).toHaveLength(3);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The verdict, then «Se llama:»; the ordered drawing highlights the ring as the parent.
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: 1,4-dimetilbenceno');
  await expect(verdict.locator('.verdict-message')).toContainText('¡Correcto!');
  await expect(verdict.locator('.verdict-message')).toContainText('También se llama «p-xileno»');
  await expect(page.locator('#result-name')).toHaveText('1,4-dimetilbenceno');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom')).toHaveCount(6);

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test '«Anillos»: tiles `1 4 di met il benceno` draw p-xylene…'

test('a substituted phenyl on a chain draws the molecule the app names on its ring; `dimetilbenceno` asks for numbers', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  // `1-(4-metilfenil)propano`: the ring is the parent, so the app calls it `1-metil-4-propilbenceno`.
  let dialog = await buildName(page, '1', 'empieza rama compuesta', '4', 'met', 'il', 'fenil', 'acaba rama', 'prop', 'ano');
  await expect(page.locator('#name-builder-name')).toHaveText('1-(4-metilfenil)propano');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: 1-(4-metilfenil)propano');
  // The ring diagnosis (phase I-50d) between the verdict's two sentences: the ring is the parent.
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«1-metil-4-propilbenceno».');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'RING_IS_PARENT');
  await expect(verdict.locator('.verdict-hint')).toHaveText('Pulsa «Ver paso a paso» para ver por qué.');
  await expect(page.locator('#result-name')).toHaveText('1-metil-4-propilbenceno');
  const drawn = await moleculeJSON(page);
  expect([drawn.atoms.length, drawn.bonds.length]).toEqual([10, 10]);
  expect(drawn.bonds.filter((bond) => bond.order === 2)).toHaveLength(3);
  expect(await drawingInsideCanvas(page)).toBe(true);
  // `dimetilbenceno`: three molecules (1,2 / 1,3 / 1,4); nothing drawn, the canvas keeps the last drawing.
  dialog = await buildName(page, 'di', 'met', 'il', 'benceno');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(page.locator('#name-builder-message')).toHaveText(
    'Faltan números: puede ser 1,2-dimetilbenceno, 1,3-dimetilbenceno o 1,4-dimetilbenceno.');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await moleculeJSON(page)).atoms).toHaveLength(10);
  expect(errors).toEqual([]);
}); // End of test 'a substituted phenyl on a chain draws the molecule the app names on its ring…'

test('numbers of its own on `benceno` stay in the dialog (tiles marked); two rings bonded together are out of scope', async ({ page }) => {
  const errors = await openApp(page);
  const dialog = await buildName(page, '1', '3', '5', 'benceno');
  await expect(page.locator('#name-builder-name')).toHaveText('1,3,5-benceno');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('El benceno no lleva números propios: sus enlaces dobles no se numeran. Los números van delante '
    + 'de cada rama (1,2-dimetilbenceno).');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([0, 1, 2]);
  await expect(dialog).toBeVisible();
  // `fenilbenceno` (biphenyl): two rings bonded straight together; nothing drawn.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of ['fenil', 'benceno']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await expect(page.locator('#name-builder-name')).toHaveText('fenilbenceno');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toContainText('Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar: '
    + 'Esta molécula tiene varios anillos.');
  expect(await invalidTiles(page)).toEqual([]);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  expect(errors).toEqual([]);
}); // End of test 'numbers of its own on `benceno` stay in the dialog…'
