/**
 * @file «¿Cómo se dibuja?» with aldehydes and ketones e2e (design.md §15.2,
 * §15.5.2, §15.8 R-5c; phase I-51c1, R-5c1): the «Grupos» row offers `oxo`,
 * `formil`, `al`, `ona` and `carbaldehído`, the «Anillos» row
 * `benzaldehído`, each with its tooltip; tiles `pent ano 2 ona` build
 * `pentan-2-ona` (the `o` of `ano` elided before the vowel of `ona`) and
 * «Dibujar» puts the molecule on the canvas, its C=O a double bond, one
 * undoable edit, centred and ordered, with «¡Correcto!»; `but ano di al`
 * draws butanodial; `benzaldehído`, `4-oxopentanal` and
 * `ciclohexanocarbaldehído` (the –CHO's carbon outside the ring) are
 * correct; the old-style `2-pentanona` draws its molecule with the app's
 * name and the OLD_STYLE diagnosis; `al` after a ring, a ketone on a bare
 * end and left-out locants (`pentanona`) stay in the dialog with their
 * message, the canvas untouched.
 * Runs on the dev server and on dist (playwright.config.js).
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
 * The bonds of each oxygen of a drawn molecule: its neighbour's element and
 * the bond order, sorted (the =O of a C=O is `C2`).
 *
 * @param {object} json - moleculeToJSON() output.
 * @returns {string[][]} Per oxygen, its bonds.
 */
function oxygenBonds(json) {
  const element = new Map(json.atoms.map((atom) => [atom.id, atom.element]));
  return json.atoms.filter((atom) => atom.element === 'O').map((oxygen) => json.bonds
    .filter((bond) => bond.a === oxygen.id || bond.b === oxygen.id)
    .map((bond) => `${element.get(bond.a === oxygen.id ? bond.b : bond.a)}${bond.order}`)
    .sort());
}

test('«Grupos»: the carbonyl tiles; `pent ano 2 ona` draws pentan-2-ona, correct, ordered; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const groups = dialog.getByRole('group', { name: 'Grupos' });
  for (const [id, text, hint] of [['group-oxo', 'oxo', /4-oxopentanal/], ['retained-formyl', 'formil', /\(4-formilciclohexil\)/],
    ['suffix-aldehyde', 'al', /butanal; con dos, butanodial/], ['suffix-ketone', 'ona', /pentan-2-ona/],
    ['suffix-carbaldehyde', 'carbaldehído', /ciclohexanocarbaldehído/]]) {
    const tile = groups.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveText(text);
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAccessibleName(text);
    await expect(tile).toHaveAttribute('title', hint);
  }
  await expect(groups.locator('[data-tile="group-oxo"]')).toHaveClass(/nb-tile--carbonyl/);
  await expect(groups.locator('[data-tile="suffix-ketone"]')).toHaveClass(/nb-tile--suffix/);
  await page.keyboard.press('Escape');

  await buildName(page, 'pent', 'ano', '2', 'ona');
  const line = page.locator('#name-builder-name');
  await expect(line).toHaveText('pentan-2-ona');
  await expect(line.locator('.part-ending')).toHaveText(['an', 'ona']);
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // Five carbons and the oxygen of the C=O, double-bonded to carbon 2; whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'O']);
  expect(oxygenBonds(drawn)).toEqual([['C2']]);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The verdict, then «Se llama:»; the ordered drawing highlights the parent.
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: pentan-2-ona');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto!');
  await expect(page.locator('#result-name')).toHaveText('pentan-2-ona');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);

  // `but ano di al`: the `o` of `ano` kept before the consonant of `dial`; a C=O at each end.
  const again = await buildName(page, 'but', 'ano', 'di', 'al');
  await expect(line).toHaveText('butanodial');
  await again.getByRole('button', { name: 'Dibujar' }).click();
  await expect(again).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('butanodial');
  expect(oxygenBonds(await moleculeJSON(page))).toEqual([['C2'], ['C2']]);
  expect(errors).toEqual([]);
}); // End of test '«Grupos»: the carbonyl tiles; `pent ano 2 ona` draws pentan-2-ona…'

test('`benzaldehído`, `4-oxopentanal` and `ciclohexanocarbaldehído` are correct; `2-pentanona` is drawn with its diagnosis', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const tile = page.getByRole('group', { name: 'Anillos' }).locator('[data-tile="ring-benzaldehyde"]');
  await expect(tile).toHaveText('benzaldehído');
  await expect(tile).toHaveAccessibleName('benzaldehído');
  await expect(tile).toHaveAttribute('title', 'Benceno con un grupo CHO: bencenocarbaldehído.');
  await page.keyboard.press('Escape');

  let dialog = await buildName(page, '4', 'met', 'il', 'benzaldehído');
  await expect(page.locator('#name-builder-name')).toHaveText('4-metilbenzaldehído');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('4-metilbenzaldehído');
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'O']);
  expect(drawn.bonds.filter((bond) => bond.order === 2)).toHaveLength(4); // The ring's three and the C=O.
  expect(oxygenBonds(drawn)).toEqual([['C2']]);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // An `oxo` prefix beside the aldehyde.
  dialog = await buildName(page, '4', 'oxo', 'pent', 'ano', 'al');
  await expect(page.locator('#name-builder-name')).toHaveText('4-oxopentanal');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('4-oxopentanal');
  expect(oxygenBonds(await moleculeJSON(page))).toEqual([['C2'], ['C2']]);

  // `carbaldehído`: the –CHO's carbon outside the ring, its locant left out (one place on a bare ring).
  dialog = await buildName(page, 'ciclo', 'hex', 'ano', 'carbaldehído');
  await expect(page.locator('#name-builder-name')).toHaveText('ciclohexanocarbaldehído');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('ciclohexanocarbaldehído');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'O']);
  expect(drawn.bonds).toHaveLength(8); // The ring's six, the bond to the –CHO's carbon and the C=O.

  // The old style: drawn, named, and the OLD_STYLE diagnosis with the suffix's word.
  dialog = await buildName(page, '2', 'pent', 'ano', 'ona');
  await expect(page.locator('#name-builder-name')).toHaveText('2-pentanona');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'OLD_STYLE');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('Has escrito los números delante de la raíz, como se hacía antes. '
    + 'Hoy van detrás, justo delante de «ona»: «pentan-2-ona».');
  await expect(page.locator('#result-name')).toHaveText('pentan-2-ona');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'C', 'C', 'O']);
  expect(errors).toEqual([]);
}); // End of test '`benzaldehído`, `4-oxopentanal` and `ciclohexanocarbaldehído`…'

test('`al` after a ring, a ketone on a bare end and left-out locants stay in the dialog with their message; the canvas keeps its drawing', async ({ page }) => {
  const errors = await openApp(page);
  // A drawing to keep.
  let dialog = await buildName(page, 'prop', 'ano', 'ona');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#verdict .verdict-message')).toHaveText('¡Correcto! También se llama «acetona» (nombre tradicional, que '
    + 'la IUPAC (2013) acepta).');
  await expect(page.locator('#result-name')).toHaveText('propanona');

  // `al` after a ring: the tile is marked, with the hint that says what a ring's –CHO is.
  dialog = await buildName(page, 'ciclo', 'hex', 'ano', 'al');
  await expect(page.locator('#name-builder-name')).toHaveText('ciclohexanal');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('Esta ficha no puede ir aquí: «al» solo va detrás de una cadena: en un anillo, el grupo CHO va unido a '
    + 'un carbono del anillo y se escribe «carbaldehído» (ciclohexanocarbaldehído).');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([3]);
  await expect(dialog).toBeVisible();

  // A ketone on an end carbon with nothing else on it: an aldehyde, so the `ona` locant is marked.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of ['prop', 'ano', '1', 'ona']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('La terminación «ona» va en un carbono unido a otros dos carbonos, como los del interior de la '
    + 'cadena; en un extremo sería un aldehído («al»).');
  expect(await invalidTiles(page)).toEqual([2]);

  // `pentanona`: two molecules; nothing drawn.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  for (const text of ['pent', 'ano', 'ona']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('Faltan números: puede ser pentan-2-ona o pentan-3-ona.');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  // The canvas keeps propanona.
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'O']);
  await expect(page.locator('#result-name')).toHaveText('propanona');
  expect(errors).toEqual([]);
}); // End of test '`al` after a ring, a ketone on a bare end and left-out locants…'
