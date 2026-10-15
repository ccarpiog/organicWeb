/**
 * @file «¿Cómo se dibuja?» with carboxylic acids e2e (design.md §15.2,
 * §15.5.2, §15.8 R-5d; phase I-51d1, R-5d1): the «Grupos» row offers the
 * class word `ácido`, `carboxi` and the suffixes `oico` and `carboxílico`,
 * the «Anillos» row `benzoico`, each with its tooltip; tiles `ácido but ano
 * oico` build `ácido butanoico` (the space after `ácido` the app's, the `o`
 * of `ano` elided before the vowel of `oico`) and «Dibujar» puts the molecule
 * on the canvas, its –COOH a C=O and a C–OH, one undoable edit, centred and
 * ordered, with «¡Correcto!»; `ácido butanodioico` has a –COOH at each end;
 * `ácido 4-metilbenzoico` and `ácido ciclohexano-1,4-dicarboxílico` (the
 * –COOH's carbon outside the ring) are correct; the old-style `ácido
 * 2-butenoico` draws its molecule with the app's name and the OLD_STYLE
 * diagnosis; `ácido metilpropanoico` draws the molecule with «Casi: faltan
 * los números…»; an acid suffix without `ácido`, `oico` after a ring and
 * left-out locants with two molecules stay in the dialog with their message,
 * the canvas untouched.
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
 * the bond order (the =O of a –COOH is `C2`, its OH `C1`), the oxygens
 * sorted.
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

test('«Grupos»: the acid tiles; `ácido but ano oico` draws ácido butanoico, correct, ordered; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const groups = dialog.getByRole('group', { name: 'Grupos' });
  for (const [id, text, hint, kind] of [['class-acid', 'ácido', /al principio del nombre/, 'suffixClass'],
    ['retained-carboxy', 'carboxi', /\(carboximetil\)/, 'retained'], ['suffix-acid', 'oico', /ácido butanoico; con dos, ácido butanodioico/, 'suffix'],
    ['suffix-carboxylic', 'carboxílico', /ácido ciclohexanocarboxílico/, 'suffix']]) {
    const tile = groups.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveText(text);
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAccessibleName(text);
    await expect(tile).toHaveAttribute('title', hint);
    await expect(tile).toHaveClass(new RegExp(`nb-tile--${kind}`));
  }
  // The class word in the endings' colour, as on the name line.
  expect(await groups.locator('[data-tile="class-acid"]').evaluate((node) => getComputedStyle(node).color))
    .toBe(await groups.locator('[data-tile="suffix-acid"]').evaluate((node) => getComputedStyle(node).color));
  await page.keyboard.press('Escape');

  await buildName(page, 'ácido', 'but', 'ano', 'oico');
  const line = page.locator('#name-builder-name');
  await expect(line).toHaveText('ácido butanoico');
  await expect(line.locator('.part-ending')).toHaveText(['ácido', 'an', 'oico']);
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // Four carbons, and the =O and the OH of the –COOH on carbon 1; whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'O', 'O']);
  expect(oxygenBonds(drawn)).toEqual(['C1', 'C2']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The verdict, then «Se llama:»; the ordered drawing highlights the parent.
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: ácido butanoico');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto!');
  await expect(page.locator('#result-name')).toHaveText('ácido butanoico');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);

  // `ácido but ano di oico`: the `o` of `ano` kept before the consonant of `dioico`; a –COOH at each end.
  const again = await buildName(page, 'ácido', 'but', 'ano', 'di', 'oico');
  await expect(line).toHaveText('ácido butanodioico');
  await again.getByRole('button', { name: 'Dibujar' }).click();
  await expect(again).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('ácido butanodioico');
  expect(oxygenBonds(await moleculeJSON(page))).toEqual(['C1', 'C1', 'C2', 'C2']);
  expect(errors).toEqual([]);
}); // End of test '«Grupos»: the acid tiles; `ácido but ano oico`…'

test('`ácido 4-metilbenzoico` and `ácido ciclohexano-1,4-dicarboxílico` are correct; `ácido 2-butenoico` is drawn with its diagnosis', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const tile = page.getByRole('group', { name: 'Anillos' }).locator('[data-tile="ring-benzoic"]');
  await expect(tile).toHaveText('benzoico');
  await expect(tile).toHaveAccessibleName('benzoico');
  await expect(tile).toHaveAttribute('title', 'Benceno con un grupo COOH: ácido bencenocarboxílico. Va detrás de «ácido»: ácido benzoico.');
  await page.keyboard.press('Escape');

  let dialog = await buildName(page, 'ácido', '4', 'met', 'il', 'benzoico');
  await expect(page.locator('#name-builder-name')).toHaveText('ácido 4-metilbenzoico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('ácido 4-metilbenzoico');
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'O', 'O']);
  expect(drawn.bonds.filter((bond) => bond.order === 2)).toHaveLength(4); // The ring's three and the C=O.
  expect(oxygenBonds(drawn)).toEqual(['C1', 'C2']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // `carboxílico`: each –COOH's carbon outside the ring.
  dialog = await buildName(page, 'ácido', 'ciclo', 'hex', 'ano', '1', '4', 'di', 'carboxílico');
  await expect(page.locator('#name-builder-name')).toHaveText('ácido ciclohexano-1,4-dicarboxílico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('ácido ciclohexano-1,4-dicarboxílico');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'O', 'O', 'O', 'O']);
  expect(drawn.bonds).toHaveLength(12); // The ring's six, two bonds to the –COOH carbons and their four C–O.

  // The old style: drawn, named, and the OLD_STYLE diagnosis with the segment's words.
  dialog = await buildName(page, 'ácido', '2', 'but', 'eno', 'oico');
  await expect(page.locator('#name-builder-name')).toHaveText('ácido 2-butenoico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'OLD_STYLE');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('Has escrito los números delante de la raíz, como se hacía antes. '
    + 'Hoy van detrás, justo delante de «eno» o «ino»: «ácido but-2-enoico».');
  await expect(page.locator('#result-name')).toHaveText('ácido but-2-enoico');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'C', 'O', 'O']);
  expect(errors).toEqual([]);
}); // End of test '`ácido 4-metilbenzoico` and `ácido ciclohexano-1,4-dicarboxílico`…'

test('left-out locants: one molecule is drawn with «Casi…»; an acid suffix without `ácido`, `oico` after a ring and two molecules stay in the dialog', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  // `ácido metilpropanoico`: the methyl's locant left out, one molecule; drawn with the name the app writes.
  let dialog = await buildName(page, 'ácido', 'met', 'il', 'prop', 'ano', 'oico');
  await expect(page.locator('#name-builder-name')).toHaveText('ácido metilpropanoico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'missingLocants');
  await expect(verdict.locator('.verdict-message')).toHaveText('Casi: faltan los números. Se escribe «ácido 2-metilpropanoico».');
  await expect(page.locator('#result-name')).toHaveText('ácido 2-metilpropanoico');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'C', 'O', 'O']);

  // An acid suffix without `ácido`: the suffix's tile is marked, with what is missing.
  dialog = await buildName(page, 'but', 'ano', 'oico');
  await expect(page.locator('#name-builder-name')).toHaveText('butanoico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('El nombre de un ácido empieza por la palabra «ácido»: pon esa ficha al principio, como en ácido '
    + 'butanoico.');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([2]);
  await expect(dialog).toBeVisible();

  // `oico` after a ring: the tile is marked, with the hint that says what a ring's –COOH is.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of ['ácido', 'ciclo', 'hex', 'ano', 'oico']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await expect(page.locator('#name-builder-name')).toHaveText('ácido ciclohexanoico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('Esta ficha no puede ir aquí: «oico» solo va detrás de una cadena: en un anillo, el grupo COOH va '
    + 'unido a un carbono del anillo y se escribe «carboxílico» (ácido ciclohexanocarboxílico).');
  expect(await invalidTiles(page)).toEqual([4]);

  // `ácido metilbutanoico`: two molecules; nothing drawn.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  for (const text of ['ácido', 'met', 'il', 'but', 'ano', 'oico']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('Faltan números: puede ser ácido 2-metilbutanoico o ácido 3-metilbutanoico.');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  // The canvas keeps ácido 2-metilpropanoico.
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'C', 'O', 'O']);
  await expect(page.locator('#result-name')).toHaveText('ácido 2-metilpropanoico');
  expect(errors).toEqual([]);
}); // End of test 'left-out locants: one molecule is drawn…'
