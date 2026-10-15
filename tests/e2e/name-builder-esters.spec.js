/**
 * @file «¿Cómo se dibuja?» with esters e2e (design.md §15.2, §15.5.2 item
 * 6, §15.8 R-6a; phase I-52a1, R-6a1): the «Grupos» row offers the
 * suffixes `oato` and `carboxilato` and the ending `ilo` of an ester's
 * O-bound group, the «Anillos» row `benzoato`, each with its tooltip; tiles
 * `et ano oato met ilo` build `etanoato de metilo` (the ` de ` the app's, the
 * `o` of `ano` elided before the vowel of `oato`) and «Dibujar» puts the
 * molecule on the canvas, its –COO– a C=O and a bridge oxygen bonded to the
 * methyl, one undoable edit, centred and ordered, with «¡Correcto!» and the
 * traditional `acetato de metilo` announced; `butanodioato de dimetilo` (its
 * own multiplier) and `propanodioato de etilo y metilo` (the automatic ` y `)
 * are correct; a ring ester, `ciclohexanocarboxilato de etilo`, and a
 * `benzoato`, `4-metilbenzoato de etilo`, are correct; `4-metilbutanoato de
 * metilo` draws its molecule with the app's name and the BRANCH_AT_END
 * diagnosis; an ester suffix without its O-bound group, a group ending in
 * `il`, left-out locants with several molecules and a molecule the app
 * cannot name stay in the dialog with their message, the canvas untouched.
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
 * The bonds of each oxygen of a drawn molecule: its neighbours' elements and
 * the bond orders (the =O of a –COO– is `C2`, its bridge oxygen `C1 C1`), the
 * oxygens sorted.
 *
 * @param {object} json - moleculeToJSON() output.
 * @returns {string[]} Per oxygen, its bonds.
 */
function oxygenBonds(json) {
  const element = new Map(json.atoms.map((atom) => [atom.id, atom.element]));
  return json.atoms.filter((atom) => atom.element === 'O').map((oxygen) => json.bonds
    .filter((bond) => bond.a === oxygen.id || bond.b === oxygen.id)
    .map((bond) => `${element.get(bond.a === oxygen.id ? bond.b : bond.a)}${bond.order}`)
    .sort().join(' ')).sort();
}

test('«Grupos»: the ester tiles; `et ano oato met ilo` draws etanoato de metilo, correct, ordered; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const groups = dialog.getByRole('group', { name: 'Grupos' });
  for (const [id, text, hint, kind] of [['suffix-ester', 'oato', /etanoato de metilo; con dos, butanodioato de dimetilo/, 'suffix'],
    ['suffix-carboxylate', 'carboxilato', /ciclohexanocarboxilato de etilo/, 'suffix'],
    ['ester-alkyl', 'ilo', /en lugar de «il»: met e ilo dan metilo/, 'esterAlkyl']]) {
    const tile = groups.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveText(text);
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAccessibleName(text);
    await expect(tile).toHaveAttribute('title', hint);
    await expect(tile).toHaveClass(new RegExp(`nb-tile--${kind}`));
  }
  // `ilo` in the prefixes' colour, as `il`.
  expect(await groups.locator('[data-tile="ester-alkyl"]').evaluate((node) => getComputedStyle(node).color))
    .toBe(await dialog.locator('[data-tile="fv-1"]').evaluate((node) => getComputedStyle(node).color));
  const benzoate = dialog.getByRole('group', { name: 'Anillos' }).locator('[data-tile="ring-benzoate"]');
  await expect(benzoate).toHaveText('benzoato');
  await expect(benzoate).toHaveAttribute('title', 'Benceno con un grupo COO: bencenocarboxilato. Detrás va el grupo unido al oxígeno: '
    + 'benzoato de metilo.');
  await page.keyboard.press('Escape');

  await buildName(page, 'et', 'ano', 'oato', 'met', 'ilo');
  const line = page.locator('#name-builder-name');
  await expect(line).toHaveText('etanoato de metilo');
  await expect(line.locator('.part-ending')).toHaveText(['an', 'oato']);
  await expect(line.locator('.part-prefix')).toHaveText(['met', 'ilo']);
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // Three carbons, the =O of the –COO– and its bridge oxygen, bonded to the methyl; whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'O', 'O']);
  expect(oxygenBonds(drawn)).toEqual(['C1 C1', 'C2']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The verdict, then «Se llama:»; the ordered drawing highlights the parent.
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: etanoato de metilo');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! También se llama «acetato de metilo» (nombre tradicional, '
    + 'que la IUPAC (2013) conserva como preferido).');
  await expect(page.locator('#result-name')).toHaveText('etanoato de metilo');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test '«Grupos»: the ester tiles; `et ano oato met ilo`…'

test('diesters: `butanodioato de dimetilo` with its own multiplier and `propanodioato de etilo y metilo` with the automatic ` y `', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  const line = page.locator('#name-builder-name');
  let dialog = await buildName(page, 'but', 'ano', 'di', 'oato', 'di', 'met', 'ilo');
  await expect(line).toHaveText('butanodioato de dimetilo');
  await expect(line.locator('.part-multiplier')).toHaveText(['di', 'di']);
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto!');
  await expect(page.locator('#result-name')).toHaveText('butanodioato de dimetilo');
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'O', 'O', 'O', 'O']);
  expect(oxygenBonds(drawn)).toEqual(['C1 C1', 'C1 C1', 'C2', 'C2']);

  dialog = await buildName(page, 'prop', 'ano', 'di', 'oato', 'et', 'ilo', 'met', 'ilo');
  await expect(line).toHaveText('propanodioato de etilo y metilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('propanodioato de etilo y metilo');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'O', 'O', 'O', 'O']);
  expect(await drawingInsideCanvas(page)).toBe(true);
  expect(errors).toEqual([]);
}); // End of test 'diesters…'

test('a ring ester and a `benzoato` are correct; `4-metilbutanoato de metilo` is drawn with its diagnosis', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  let dialog = await buildName(page, 'ciclo', 'hex', 'ano', 'carboxilato', 'et', 'ilo');
  await expect(page.locator('#name-builder-name')).toHaveText('ciclohexanocarboxilato de etilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('ciclohexanocarboxilato de etilo');
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'O', 'O']);
  expect(drawn.bonds).toHaveLength(11); // The ring's six, the bond to the –COO– carbon, its C=O and C–O, the O–C and C–C of the ethyl.

  // `benzoato`: the –COO– placed at carbon 1 of the ring by the word.
  dialog = await buildName(page, '4', 'met', 'il', 'benzoato', 'et', 'ilo');
  await expect(page.locator('#name-builder-name')).toHaveText('4-metilbenzoato de etilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('4-metilbenzoato de etilo');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'O', 'O']);
  expect(drawn.bonds.filter((bond) => bond.order === 2)).toHaveLength(4); // The ring's three and the C=O.
  expect(oxygenBonds(drawn)).toEqual(['C1 C1', 'C2']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // A branch on the end of the acid part: drawn, named, and the BRANCH_AT_END diagnosis of the acid part's chain.
  dialog = await buildName(page, '4', 'met', 'il', 'but', 'ano', 'oato', 'met', 'ilo');
  await expect(page.locator('#name-builder-name')).toHaveText('4-metilbutanoato de metilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'BRANCH_AT_END');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('La rama «metil» está en el extremo de la cadena, así que la alarga: la '
    + 'cadena principal tiene 5 carbonos.');
  await expect(page.locator('#result-name')).toHaveText('pentanoato de metilo');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'O', 'O']);
  expect(errors).toEqual([]);
}); // End of test 'a ring ester and a `benzoato` are correct…'

test('failures stay in the dialog: no O-bound group, a group ending in `il`, two molecules, a molecule the app cannot name', async ({ page }) => {
  const errors = await openApp(page);
  // `etanoato` alone: the suffix's tile is marked, with what is missing.
  const dialog = await buildName(page, 'et', 'ano', 'oato');
  await expect(page.locator('#name-builder-name')).toHaveText('etanoato');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('Detrás de «oato» va el grupo unido al oxígeno del éster, acabado en «ilo» (la palabra «de» la pone '
    + 'la app): et, ano, oato, met e ilo dan etanoato de metilo.');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([2]);
  await expect(dialog).toBeVisible();

  // `met il` after the suffix: the `il` tile is marked, with the hint that the O-bound group ends in `ilo`.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of ['et', 'ano', 'oato', 'met', 'il']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await expect(page.locator('#name-builder-name')).toHaveText('etanoato de metil');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('Esta ficha no puede ir aquí: el grupo unido al oxígeno de un éster acaba en «ilo», no en «il»: met e '
    + 'ilo dan metilo (etanoato de metilo).');
  expect(await invalidTiles(page)).toEqual([4]);

  // `ciclohexanodicarboxilato de dimetilo`: several molecules; nothing drawn.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  for (const text of ['ciclo', 'hex', 'ano', 'di', 'carboxilato', 'di', 'met', 'ilo']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await expect(page.locator('#name-builder-name')).toHaveText('ciclohexanodicarboxilato de dimetilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('Faltan números: puede ser ciclohexano-1,1-dicarboxilato de dimetilo, ciclohexano-1,2-dicarboxilato '
    + 'de dimetilo, ciclohexano-1,3-dicarboxilato de dimetilo u otra molécula.');
  await expect(dialog).toBeVisible();

  // A diester whose two different O-bound groups would need locants: the engine's refusal, nothing drawn.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  for (const text of ['2', 'met', 'il', 'but', 'ano', 'di', 'oato', 'et', 'ilo', 'met', 'ilo']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await expect(page.locator('#name-builder-name')).toHaveText('2-metilbutanodioato de etilo y metilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toContainText('Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar:');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  // The canvas is untouched: still empty.
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  expect(errors).toEqual([]);
}); // End of test 'failures stay in the dialog…'
