/**
 * @file «¿Cómo se dibuja?» with the retained amide names e2e (design.md
 * §13.4 I-37, I-40c, §14.5, §15.2, §15.8 R-6d; phase I-52d3, R-6d3): the
 * «Nombres tradicionales» row offers `formamida`, `acetamida` and
 * `ftalamida`, each with a tooltip; `N`, `N`, `di`, `met`, `il` and
 * `formamida` build `N,N-dimetilformamida`, and «Dibujar» puts
 * N,N-dimetilmetanamida on the canvas — its –CONH₂ a carbon with an =O and a
 * nitrogen, the two methyls on that nitrogen, one undoable edit, centred and
 * ordered — with «¡Correcto!… es una forma válida» above «Se llama:
 * N,N-dimetilmetanamida»; `acetamida`, `2-fenilacetamida`, `ftalamida` and
 * `4-metilftalamida`, which the engine writes, draw their molecules;
 * `metilacetamida` (the `N` left out) is «N-metilacetamida»; a substituted
 * `2-cloroacetamida` draws its molecule with the app's name and why; a second
 * amide group written `carbamoil` beside the word (`2-carbamoilacetamida`) is
 * drawn and named with its diagnosis (CARBONYL_PREFIX since phase I-52d4, a
 * deliberate null before); `1-acetamida` is refused with the number marked
 * and `N-metilftalamida` with the engine's own message, the canvas
 * untouched; the Ayuda section «Del nombre al dibujo» has its amide line.
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
 * the bond order (an amide's NH₂ is `C1`, the N of N,N-dimetil… `C1 C1 C1`),
 * the nitrogens sorted.
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
 * Builds a name, draws it and waits for the dialog to close.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} text - The name line's expected text.
 * @param {...string} tiles - Tile names, in order.
 * @returns {Promise<void>}
 */
async function drawName(page, text, ...tiles) {
  const dialog = await buildName(page, ...tiles);
  await expect(page.locator('#name-builder-name')).toHaveText(text);
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
} // End of function drawName()

test('«Nombres tradicionales»: the amide tiles; `N,N-dimetilformamida` draws N,N-dimetilmetanamida, a valid form; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const traditional = dialog.getByRole('group', { name: 'Nombres tradicionales' });
  for (const [id, text, hint] of [['template-formamide', 'formamida', /metanamida\. .*N,N-dimetilformamida/],
    ['template-acetamide', 'acetamida', /etanamida\. .*N-metilacetamida.*2-fenilacetamida, 2-\(4-metilfenil\)acetamida/],
    ['template-phthalamide', 'ftalamida', /benceno-1,2-dicarboxamida\. .*4-metilftalamida/]]) {
    const tile = traditional.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveText(text);
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAccessibleName(text);
    await expect(tile).toHaveAttribute('title', hint);
  }
  await page.keyboard.press('Escape');

  await buildName(page, 'N', 'N', 'di', 'met', 'il', 'formamida');
  await expect(page.locator('#name-builder-name')).toHaveText('N,N-dimetilformamida');
  await expect(page.locator('#name-builder-name .part-stem').last()).toHaveText('formamida');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // N,N-dimetilmetanamida on the canvas: the C=O carbon, its =O and the nitrogen, the two methyls on the nitrogen; in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'N', 'O']);
  expect(drawn.bonds).toHaveLength(4);
  expect(nitrogenBonds(drawn)).toEqual(['C1 C1 C1']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: N,N-dimetilformamida');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «N,N-dimetilformamida» es una forma válida (nombre '
    + 'tradicional, que la IUPAC (2013) conserva como preferido). El nombre que doy primero es «N,N-dimetilmetanamida».');
  await expect(page.locator('#result-name')).toHaveText('N,N-dimetilmetanamida');
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test '«Nombres tradicionales»: the amide tiles…'

test('`acetamida`, `2-fenilacetamida`, `ftalamida` and `4-metilftalamida` draw their molecules; `metilacetamida` gets its `N`; `2-cloroacetamida` its molecule and why', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  await drawName(page, 'acetamida', 'acetamida');
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(page.locator('#result-name')).toHaveText('etanamida');
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'N', 'O']);
  expect(nitrogenBonds(drawn)).toEqual(['C1']);

  // A phenyl on carbon 2 of `acetamida`: the engine's `2-fenilacetamida`, its locant kept (its N could carry the phenyl too).
  await drawName(page, '2-fenilacetamida', '2', 'fenil', 'acetamida');
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «2-fenilacetamida» es una forma válida (nombre tradicional, '
    + 'que la IUPAC (2013) acepta). El nombre que doy primero es «2-feniletanamida».');
  await expect(page.locator('#result-name')).toHaveText('2-feniletanamida');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'N', 'O']);
  expect(nitrogenBonds(drawn)).toEqual(['C1']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // `ftalamida`: two –CONH₂, their carbons outside the ring; with a branch on its ring, a form the engine writes too.
  await drawName(page, 'ftalamida', 'ftalamida');
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(page.locator('#result-name')).toHaveText('benceno-1,2-dicarboxamida');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'N', 'N', 'O', 'O']);
  expect(nitrogenBonds(drawn)).toEqual(['C1', 'C1']);
  await drawName(page, '4-metilftalamida', '4', 'met', 'il', 'ftalamida');
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(page.locator('#result-name')).toHaveText('4-metilbenceno-1,2-dicarboxamida');

  // `metilacetamida`: the methyl's place left out, searched on carbon 2 and on the nitrogen; only `N` gives the engine's name.
  await drawName(page, 'metilacetamida', 'met', 'il', 'acetamida');
  await expect(verdict).toHaveAttribute('data-kind', 'missingLocants');
  await expect(verdict.locator('.verdict-message')).toHaveText('Casi: faltan los números. Se escribe «N-metilacetamida» (nombre '
    + 'tradicional, que la IUPAC (2013) conserva como preferido). El nombre que doy primero es «N-metiletanamida».');
  await expect(page.locator('#result-name')).toHaveText('N-metiletanamida');
  expect(nitrogenBonds(await moleculeJSON(page))).toEqual(['C1 C1']);

  // A substituted chain template, which the app never writes: the molecule it describes, named by the app, and why.
  await drawName(page, '2-cloroacetamida', '2', 'cloro', 'acetamida');
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«2-cloroetanamida».');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'SUBSTITUTED_TEMPLATE');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('El nombre tradicional «acetamida» solo admite grupos en el nitrógeno, '
    + 'con «N» (N-metilacetamida), o solo un fenil en el carbono 2 (2-fenilacetamida): con otros grupos, la molécula se nombra con su '
    + 'nombre sistemático: «2-cloroetanamida».');
  await expect(page.locator('#result-name')).toHaveText('2-cloroetanamida');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'Cl', 'N', 'O']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // A second amide group written `carbamoil` beside the word: the amide's own mistake, a deliberate null of diagnose.js «Amides»
  // until phase I-52d4, now CARBONYL_PREFIX: drawn and named, the diagnosis between the verdict's two sentences.
  await drawName(page, '2-carbamoilacetamida', '2', 'carbamoil', 'acetamida');
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'CARBONYL_PREFIX');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«propanodiamida».');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('Los grupos amida son el grupo principal: los de la cadena principal se '
    + 'nombran todos juntos con la terminación «-diamida», al final del nombre, no con el prefijo «carbamoil». Su carbono entra en la '
    + 'cadena principal. Se escribe «propanodiamida».');
  await expect(page.locator('#result-name')).toHaveText('propanodiamida');
  expect(errors).toEqual([]);
}); // End of test '`acetamida`, `2-fenilacetamida`…'

test('`1-acetamida` and `N-metilftalamida` stay in the dialog, canvas untouched; the Ayuda line of amides', async ({ page }) => {
  const errors = await openApp(page);
  let dialog = await buildName(page, '1', 'acetamida');
  await expect(page.locator('#name-builder-name')).toHaveText('1-acetamida');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('«acetamida» ya dice dónde va su grupo amida, en el carbono 1: no lleva números ni letras propios.');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([0]);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);

  // An `N` beside `ftalamida`'s two amide groups: the engine's own refusal of an N-substituted benzene diamide.
  dialog = await buildName(page, 'N', 'met', 'il', 'ftalamida');
  await expect(page.locator('#name-builder-name')).toHaveText('N-metilftalamida');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toContainText('Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar');
  await expect(message).toContainText('varios grupos amida unidos al anillo');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);

  // Ayuda, «Del nombre al dibujo»: amides are read; their tiles and the retained names.
  await page.getByRole('button', { name: 'Ayuda' }).click();
  const help = page.getByRole('dialog', { name: 'Cómo se usa' });
  await expect(help.locator('#help-name-to-drawing')).toContainText('y de sus nitrilos y aminas, y de sus amidas');
  const line = help.locator('#help-name-to-drawing-amides');
  for (const phrase of ['Amidas.', '«amida» va al final', 'no lleva números', 'etanamida', 'butanodiamida', '«carboxamida»',
    'ciclohexanocarboxamida', 'la benzamida', '«N»', 'N-metiletanamida', 'N,N-dimetilbenzamida', 'ácido 4-amino-4-oxobutanoico',
    '«carbamoil»', 'ácido 4-carbamoilbenzoico', '(metilcarbamoil)', '(acetilamino)', 'la formamida, la acetamida y la ftalamida',
    'N,N-dimetilformamida', 'N-metilacetamida', '2-fenilacetamida', '2-(4-metilfenil)acetamida', '4-metilftalamida']) {
    await expect(line).toContainText(phrase);
  }
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
}); // End of test '`1-acetamida` and `N-metilftalamida`…'
