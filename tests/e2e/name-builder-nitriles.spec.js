/**
 * @file «¿Cómo se dibuja?» with nitriles e2e (design.md §15.2, §15.5.2,
 * §15.8 R-6b; phase I-52b1, R-6b1): the «Grupos» row offers `ciano` and the
 * suffixes `nitrilo` and `carbonitrilo`, the «Anillos» row `benzonitrilo`,
 * each with its tooltip; tiles `but ano nitrilo` build `butanonitrilo` (the
 * `o` of `ano` kept before the consonant of `nitrilo`) and «Dibujar» puts the
 * molecule on the canvas, its –C≡N a carbon and a nitrogen joined by a triple
 * bond, one undoable edit, centred and ordered, with «¡Correcto!»;
 * `butanodinitrilo` has a –C≡N at each end; `4-metilbenzonitrilo`,
 * `ciclohexano-1,4-dicarbonitrilo` (the –C≡N's carbon outside the ring) and
 * `ácido 3-cianopropanoico` (the –C≡N's carbon outside the chain) are correct;
 * the old-style `2-butenonitrilo` draws its molecule with the app's name and
 * the OLD_STYLE diagnosis; `cianometano`, a nitrile's own mistake, draws
 * etanonitrilo with no diagnosis yet (phase I-52b3); `metilpropanonitrilo`
 * draws the molecule with «Casi: faltan los números…»; `nitrilo` after a ring
 * and left-out locants with two molecules stay in the dialog with their
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
 * The bonds of each nitrogen of a drawn molecule: its neighbour's element and
 * the bond order (the N of a –C≡N is `C3`), the nitrogens sorted.
 *
 * @param {object} json - moleculeToJSON() output.
 * @returns {string[]} Per nitrogen, its bonds.
 */
function nitrogenBonds(json) {
  const element = new Map(json.atoms.map((atom) => [atom.id, atom.element]));
  return json.atoms.filter((atom) => atom.element === 'N').map((nitrogen) => json.bonds
    .filter((bond) => bond.a === nitrogen.id || bond.b === nitrogen.id)
    .map((bond) => `${element.get(bond.a === nitrogen.id ? bond.b : bond.a)}${bond.order}`)
    .sort().join(' ')).sort();
}

test('«Grupos»: the nitrile tiles; `but ano nitrilo` draws butanonitrilo, correct, ordered; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const groups = dialog.getByRole('group', { name: 'Grupos' });
  for (const [id, text, hint, kind] of [['retained-cyano', 'ciano', /su carbono no cuenta en la cadena/, 'retained'],
    ['suffix-nitrile', 'nitrilo', /butanonitrilo; con dos, butanodinitrilo/, 'suffix'],
    ['suffix-carbonitrile', 'carbonitrilo', /ciclohexanocarbonitrilo/, 'suffix']]) {
    const tile = groups.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveText(text);
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAccessibleName(text);
    await expect(tile).toHaveAttribute('title', hint);
    await expect(tile).toHaveClass(new RegExp(`nb-tile--${kind}`));
  }
  const ring = dialog.getByRole('group', { name: 'Anillos' }).locator('[data-tile="ring-benzonitrile"]');
  await expect(ring).toHaveText('benzonitrilo');
  await expect(ring).toHaveAccessibleName('benzonitrilo');
  await expect(ring).toHaveAttribute('title', 'Benceno con un grupo C≡N: bencenocarbonitrilo.');
  await page.keyboard.press('Escape');

  await buildName(page, 'but', 'ano', 'nitrilo');
  const line = page.locator('#name-builder-name');
  await expect(line).toHaveText('butanonitrilo');
  await expect(line.locator('.part-ending')).toHaveText(['ano', 'nitrilo']);
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // Four carbons, the nitrogen triple-bonded to carbon 1; whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'N']);
  expect(nitrogenBonds(drawn)).toEqual(['C3']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The verdict, then «Se llama:»; the ordered drawing highlights the parent.
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: butanonitrilo');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto!');
  await expect(page.locator('#result-name')).toHaveText('butanonitrilo');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);

  // `but ano di nitrilo`: the `o` of `ano` kept before `dinitrilo`; a –C≡N at each end.
  const again = await buildName(page, 'but', 'ano', 'di', 'nitrilo');
  await expect(line).toHaveText('butanodinitrilo');
  await again.getByRole('button', { name: 'Dibujar' }).click();
  await expect(again).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('butanodinitrilo');
  expect(nitrogenBonds(await moleculeJSON(page))).toEqual(['C3', 'C3']);
  expect(errors).toEqual([]);
}); // End of test '«Grupos»: the nitrile tiles; `but ano nitrilo`…'

test('`4-metilbenzonitrilo`, `ciclohexano-1,4-dicarbonitrilo` and `ácido 3-cianopropanoico` are correct; `2-butenonitrilo` has its diagnosis', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  let dialog = await buildName(page, '4', 'met', 'il', 'benzonitrilo');
  await expect(page.locator('#name-builder-name')).toHaveText('4-metilbenzonitrilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('4-metilbenzonitrilo');
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'N']);
  expect(drawn.bonds.filter((bond) => bond.order === 2)).toHaveLength(3); // The ring's three.
  expect(nitrogenBonds(drawn)).toEqual(['C3']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // `carbonitrilo`: each –C≡N's carbon outside the ring.
  dialog = await buildName(page, 'ciclo', 'hex', 'ano', '1', '4', 'di', 'carbonitrilo');
  await expect(page.locator('#name-builder-name')).toHaveText('ciclohexano-1,4-dicarbonitrilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('ciclohexano-1,4-dicarbonitrilo');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'N', 'N']);
  expect(drawn.bonds).toHaveLength(10); // The ring's six, two bonds to the –C≡N carbons and their two C≡N.

  // `ciano` beside an acid: its carbon is not the chain's (three carbons in the parent, four with the –C≡N's).
  dialog = await buildName(page, 'ácido', '3', 'ciano', 'prop', 'ano', 'oico');
  await expect(page.locator('#name-builder-name')).toHaveText('ácido 3-cianopropanoico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('ácido 3-cianopropanoico');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'N', 'O', 'O']);
  expect(nitrogenBonds(drawn)).toEqual(['C3']);

  // The old style: drawn, named, and the OLD_STYLE diagnosis with the segment's words.
  dialog = await buildName(page, '2', 'but', 'eno', 'nitrilo');
  await expect(page.locator('#name-builder-name')).toHaveText('2-butenonitrilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'OLD_STYLE');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('Has escrito los números delante de la raíz, como se hacía antes. '
    + 'Hoy van detrás, justo delante de «eno» o «ino»: «but-2-enonitrilo».');
  await expect(page.locator('#result-name')).toHaveText('but-2-enonitrilo');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'C', 'N']);
  expect(errors).toEqual([]);
}); // End of test '`4-metilbenzonitrilo`, `ciclohexano-1,4-dicarbonitrilo`…'

test('a nitrile\'s own mistake has no diagnosis yet; left-out locants; `nitrilo` after a ring and two molecules stay in the dialog', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  // `cianometano`: the –C≡N written `ciano` while it is the principal group, a deliberate null of diagnose.js «Nitriles» until
  // phase I-52b3: drawn and named, today's block without a diagnosis.
  let dialog = await buildName(page, 'ciano', 'met', 'ano');
  await expect(page.locator('#name-builder-name')).toHaveText('cianometano');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  expect(await verdict.getAttribute('data-diagnosis')).toBeNull();
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«etanonitrilo». Pulsa «Ver paso a paso» para ver por qué.');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveCount(0);
  await expect(page.locator('#result-name')).toHaveText('etanonitrilo');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'N']);

  // `metilpropanonitrilo`: the methyl's locant left out, one molecule; drawn with the name the app writes.
  dialog = await buildName(page, 'met', 'il', 'prop', 'ano', 'nitrilo');
  await expect(page.locator('#name-builder-name')).toHaveText('metilpropanonitrilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'missingLocants');
  await expect(verdict.locator('.verdict-message')).toHaveText('Casi: faltan los números. Se escribe «2-metilpropanonitrilo».');
  await expect(page.locator('#result-name')).toHaveText('2-metilpropanonitrilo');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'C', 'N']);

  // `nitrilo` after a ring: the tile is marked, with the hint that says what a ring's –C≡N is.
  dialog = await buildName(page, 'ciclo', 'hex', 'ano', 'nitrilo');
  await expect(page.locator('#name-builder-name')).toHaveText('ciclohexanonitrilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('Esta ficha no puede ir aquí: «nitrilo» solo va detrás de una cadena: en un anillo, el grupo C≡N '
    + 'va unido a un carbono del anillo y se escribe «carbonitrilo» (ciclohexanocarbonitrilo).');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([3]);
  await expect(dialog).toBeVisible();

  // `metilbutanonitrilo`: two molecules; nothing drawn.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of ['met', 'il', 'but', 'ano', 'nitrilo']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('Faltan números: puede ser 2-metilbutanonitrilo o 3-metilbutanonitrilo.');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  // The canvas keeps 2-metilpropanonitrilo.
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'C', 'N']);
  await expect(page.locator('#result-name')).toHaveText('2-metilpropanonitrilo');
  expect(errors).toEqual([]);
}); // End of test 'a nitrile\'s own mistake…'
