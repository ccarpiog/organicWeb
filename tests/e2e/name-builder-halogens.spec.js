/**
 * @file «¿Cómo se dibuja?» with halogens e2e (design.md §15.2, §15.8 R-5a;
 * phase I-51a1, R-5a1): the «Grupos» row offers `fluoro`, `cloro`, `bromo`
 * and `yodo`; tiles `1 bromo 4 cloro benceno` build `1-bromo-4-clorobenceno`,
 * and «Dibujar» puts the molecule on the canvas — the benzene ring with its
 * bromine and chlorine atoms, one undoable edit, centred and ordered, the ring
 * highlighted as the parent — with «¡Correcto!» above «Se llama:»;
 * `2-cloropropano` draws the chlorine on carbon 2; identical halogens written
 * one by one get their diagnosis; a name whose halogens fit nowhere
 * (`pentaclorometano`) and one with left-out locants (`dicloroetano`) stay
 * in the dialog with their message, the canvas untouched; the Ayuda section
 * «Del nombre al dibujo» has its halogens line. Runs on the dev server and
 * on dist (playwright.config.js).
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

/**
 * The elements of the drawn atoms, sorted.
 *
 * @param {object} json - moleculeToJSON() output.
 * @returns {string[]} The element symbols.
 */
function elementsOf(json) {
  return json.atoms.map((atom) => atom.element).sort();
}

test('«Grupos»: tiles `1 bromo 4 cloro benceno` draw the molecule, correct, ordered; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const groups = dialog.getByRole('group', { name: 'Grupos' });
  for (const [id, text] of [['halogen-F', 'fluoro'], ['halogen-Cl', 'cloro'], ['halogen-Br', 'bromo'], ['halogen-I', 'yodo']]) {
    const tile = groups.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveText(text);
    await expect(tile).toBeVisible();
  }
  await page.keyboard.press('Escape');

  await buildName(page, '1', 'bromo', '4', 'cloro', 'benceno');
  await expect(page.locator('#name-builder-name')).toHaveText('1-bromo-4-clorobenceno');
  await expect(page.locator('#name-builder-name .part-prefix')).toHaveText(['bromo', 'cloro']);
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // The benzene ring with its two halogens: eight atoms, eight bonds (three of them double), whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['Br', 'C', 'C', 'C', 'C', 'C', 'C', 'Cl']);
  expect(drawn.bonds).toHaveLength(8);
  expect(drawn.bonds.filter((bond) => bond.order === 2)).toHaveLength(3);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The verdict, then «Se llama:»; the ordered drawing highlights the ring as the parent.
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: 1-bromo-4-clorobenceno');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto!');
  await expect(page.locator('#result-name')).toHaveText('1-bromo-4-clorobenceno');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom')).toHaveCount(6);

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test '«Grupos»: tiles `1 bromo 4 cloro benceno` draw the molecule…'

test('`2-cloropropano` draws the chlorine on carbon 2; `1-cloro-2-cloroetano` draws its molecule with the diagnosis', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  let dialog = await buildName(page, '2', 'cloro', 'prop', 'ano');
  await expect(page.locator('#name-builder-name')).toHaveText('2-cloropropano');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('2-cloropropano');
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'Cl']);
  // The chlorine hangs from the middle carbon (two carbon neighbours).
  const chlorine = drawn.atoms.find((atom) => atom.element === 'Cl');
  const [bond] = drawn.bonds.filter((b) => b.a === chlorine.id || b.b === chlorine.id);
  const carbon = bond.a === chlorine.id ? bond.b : bond.a;
  expect(drawn.bonds.filter((b) => (b.a === carbon || b.b === carbon) && b !== bond)).toHaveLength(2);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // Identical halogens written one by one: the molecule, its name and the grouping mistake.
  dialog = await buildName(page, '1', 'cloro', '2', 'cloro', 'et', 'ano');
  await expect(page.locator('#name-builder-name')).toHaveText('1-cloro-2-cloroetano');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'UNGROUPED');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«1,2-dicloroetano».');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('Los sustituyentes iguales se escriben una sola vez, con «di», «tri»… '
    + 'delante: «1,2-dicloro», no «1-cloro-2-cloro».');
  await expect(page.locator('#result-name')).toHaveText('1,2-dicloroetano');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'Cl', 'Cl']);
  expect(errors).toEqual([]);
}); // End of test '`2-cloropropano` draws the chlorine on carbon 2…'

test('halogens that fit nowhere, or left-out locants, stay in the dialog with their message; the canvas keeps its drawing', async ({ page }) => {
  const errors = await openApp(page);
  // A drawing to keep.
  let dialog = await buildName(page, 'cloro', 'met', 'ano');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#result-name')).toHaveText('clorometano');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'Cl']);

  // `pentaclorometano`: five chlorines on one carbon (VALENCE), the left-out prefix marked.
  dialog = await buildName(page, 'penta', 'cloro', 'met', 'ano');
  await expect(page.locator('#name-builder-name')).toHaveText('pentaclorometano');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('No caben: pongas donde pongas lo que va sin número, algún carbono tendría más de 4 enlaces.');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([0, 1]);
  await expect(dialog).toBeVisible();

  // `dicloroetano`: two molecules; nothing drawn.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of ['di', 'cloro', 'et', 'ano']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('Faltan números: puede ser 1,1-dicloroetano o 1,2-dicloroetano.');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'Cl']);
  await expect(page.locator('#result-name')).toHaveText('clorometano');

  // Ayuda, «Del nombre al dibujo»: the halogens of the «Grupos» row.
  await page.getByRole('button', { name: 'Ayuda' }).click();
  const help = page.getByRole('dialog', { name: 'Cómo se usa' });
  const line = help.locator('#help-name-to-drawing-groups');
  for (const phrase of ['«Grupos»', 'fluoro, cloro, bromo y yodo', 'orden alfabético', '2-bromo-1-cloropropano', '(2-cloroetil)']) {
    await expect(line).toContainText(phrase);
  }
  await expect(help.locator('#help-name-to-drawing')).toContainText('y de sus derivados halogenados');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
}); // End of test 'halogens that fit nowhere, or left-out locants, stay in the dialog…'
