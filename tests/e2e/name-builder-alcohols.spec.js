/**
 * @file «¿Cómo se dibuja?» with alcohols and phenols e2e (design.md §15.2,
 * §15.8 R-5a; phase I-51a2, R-5a2): the «Grupos» row offers `hidroxi` and
 * `ol` beside the halogens, the «Anillos» row `fenol` and the closing-bond
 * locant `1(n)`; tiles `prop ano 2 ol` build `propan-2-ol`, and «Dibujar»
 * puts the molecule on the canvas — the OH on carbon 2, one undoable edit,
 * centred and ordered — with «¡Correcto!» above «Se llama:»; `4 met il fenol`
 * draws 4-metilfenol (its traditional name announced) and `p met il fenol`
 * is the positional alternative; `ciclohex-1(6)-eno-1,2,4-triol` is built
 * with the `1(n)` tile; the old-style `2-propanol` is drawn with its note;
 * `propanol` (left-out locants) and a misplaced `ol` stay in the dialog with
 * their message, the canvas untouched. Runs on the dev server and on dist
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

/**
 * The elements of the drawn atoms, sorted.
 *
 * @param {object} json - moleculeToJSON() output.
 * @returns {string[]} The element symbols.
 */
function elementsOf(json) {
  return json.atoms.map((atom) => atom.element).sort();
}

/**
 * The elements of the atoms the ordered drawing highlights as the parent
 * (each atom once: an oxygen's label and dot are both marked), sorted. The
 * engine's parent of an alcohol includes its OH groups (render.js
 * suffixGroupIds()).
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<string[]>} The element symbols.
 */
async function parentElements(page) {
  const ids = await page.locator('svg#canvas .hl-parent.hl-atom')
    .evaluateAll((nodes) => [...new Set(nodes.map((node) => Number(node.dataset.atomId)))]);
  const json = await moleculeJSON(page);
  return ids.map((id) => json.atoms.find((atom) => atom.id === id).element).sort();
} // End of function parentElements()

/**
 * How many carbon neighbours the carbon bearing each oxygen has, sorted.
 *
 * @param {object} json - moleculeToJSON() output.
 * @returns {number[]} One count per oxygen.
 */
function oxygenCarbonDegrees(json) {
  const element = new Map(json.atoms.map((atom) => [atom.id, atom.element]));
  return json.atoms.filter((atom) => atom.element === 'O').map((oxygen) => {
    const [bond] = json.bonds.filter((b) => b.a === oxygen.id || b.b === oxygen.id);
    const carbon = bond.a === oxygen.id ? bond.b : bond.a;
    return json.bonds.filter((b) => (b.a === carbon || b.b === carbon) && b !== bond)
      .filter((b) => element.get(b.a === carbon ? b.b : b.a) === 'C').length;
  }).sort();
} // End of function oxygenCarbonDegrees()

test('«Grupos» and «Anillos»: tiles `prop ano 2 ol` draw propan-2-ol, correct, ordered; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const groups = dialog.getByRole('group', { name: 'Grupos' });
  for (const [id, text] of [['group-hydroxy', 'hidroxi'], ['suffix-alcohol', 'ol']]) {
    await expect(groups.locator(`[data-tile="${id}"]`)).toHaveText(text);
    await expect(groups.locator(`[data-tile="${id}"]`)).toBeVisible();
  }
  const rings = dialog.getByRole('group', { name: 'Anillos' });
  await expect(rings.locator('[data-tile="ring-phenol"]')).toHaveText('fenol');
  await expect(rings.locator('[data-tile="ring-closing"]')).toHaveText('1(n)');
  await expect(rings.locator('[data-tile="ring-closing"]')).toHaveAttribute('title', /enlace que cierra un anillo/);
  await page.keyboard.press('Escape');

  await buildName(page, 'prop', 'ano', '2', 'ol');
  await expect(page.locator('#name-builder-name')).toHaveText('propan-2-ol');
  await expect(page.locator('#name-builder-name .part-ending')).toHaveText(['an', 'ol']);
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // Three carbons and the oxygen of the OH, on the middle carbon (two carbon neighbours); whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'O']);
  expect(oxygenCarbonDegrees(drawn)).toEqual([2]);
  expect(await drawingInsideCanvas(page)).toBe(true);

  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: propan-2-ol');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto!');
  await expect(page.locator('#result-name')).toHaveText('propan-2-ol');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();
  expect(await parentElements(page)).toEqual(['C', 'C', 'C', 'O']);

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test '«Grupos» and «Anillos»: tiles `prop ano 2 ol` draw propan-2-ol…'

test('`4 met il fenol` draws 4-metilfenol with its traditional name; `p met il fenol` is the positional alternative', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  let dialog = await buildName(page, '4', 'met', 'il', 'fenol');
  await expect(page.locator('#name-builder-name')).toHaveText('4-metilfenol');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! También se llama «p-cresol» (nombre tradicional, que la '
    + 'IUPAC (2013) acepta).');
  await expect(page.locator('#result-name')).toHaveText('4-metilfenol');
  // The benzene ring (three double bonds), its methyl and its OH: eight atoms, eight bonds.
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'O']);
  expect(drawn.bonds).toHaveLength(8);
  expect(drawn.bonds.filter((bond) => bond.order === 2)).toHaveLength(3);
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();
  expect(await parentElements(page)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'O']); // The ring and its OH, not the methyl.
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The old orto/meta/para form: the same molecule, an alternative.
  dialog = await buildName(page, 'p (para, 1,4)', 'met', 'il', 'fenol');
  await expect(page.locator('#name-builder-name')).toHaveText('p-metilfenol');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-message')).toContainText('«p-metilfenol» es una forma válida');
  await expect(page.locator('#result-name')).toHaveText('4-metilfenol');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'O']);
  expect(errors).toEqual([]);
}); // End of test '`4 met il fenol` draws 4-metilfenol…'

test('`1(n)` builds ciclohex-1(6)-eno-1,2,4-triol; `2-propanol` is drawn with its note; `propanol` and a stray `ol` stay in the dialog', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  let dialog = await buildName(page, 'ciclo', 'hex', '1(n)', 'eno', '1', '2', '4', 'tri', 'ol');
  await expect(page.locator('#name-builder-name')).toHaveText('ciclohex-1(6)-eno-1,2,4-triol');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('ciclohex-1(6)-eno-1,2,4-triol');
  const ring = await moleculeJSON(page);
  expect(elementsOf(ring)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'O', 'O', 'O']);
  expect(ring.bonds.filter((bond) => bond.order === 2)).toHaveLength(1);

  // The old style: drawn, named, and the note with the modern writing (no diagnosis yet for an alcohol's suffix, R-5a3b).
  dialog = await buildName(page, '2', 'prop', 'ano', 'ol');
  await expect(page.locator('#name-builder-name')).toHaveText('2-propanol');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).not.toHaveAttribute('data-diagnosis', /.+/);
  await expect(verdict.locator('.verdict-note')).toHaveText('Es la forma antigua de escribirlo; hoy se escribe «propan-2-ol».');
  await expect(page.locator('#result-name')).toHaveText('propan-2-ol');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'O']);

  // `propanol`: two molecules; nothing drawn.
  dialog = await buildName(page, 'prop', 'ano', 'ol');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('Faltan números: puede ser propan-1-ol o propan-2-ol.');
  await expect(dialog).toBeVisible();

  // `ol` before the parent: out of place, the tile marked.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of ['ol', 'et', 'ano']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('Esta ficha no puede ir aquí: «ol» va al final del nombre, detrás de la terminación de la cadena '
    + 'principal (propan-2-ol, butano-1,4-diol); en una rama, el grupo OH se escribe «hidroxi».');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([0]);
  await page.keyboard.press('Escape');
  // The canvas keeps the old-style molecule.
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'O']);
  await expect(page.locator('#result-name')).toHaveText('propan-2-ol');
  expect(errors).toEqual([]);
}); // End of test '`1(n)` builds ciclohex-1(6)-eno-1,2,4-triol…'
