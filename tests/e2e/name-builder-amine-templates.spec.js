/**
 * @file «¿Cómo se dibuja?» with the retained amine names and the amines'
 * class names e2e (design.md §2, §13.4 I-36, I-40a, §14.4, §15.2, §15.8 R-6c;
 * phase I-52c3, R-6c3): the «Nombres tradicionales» row offers `anilina` and
 * `bencilamina`, each with a tooltip; `N`, `met`, `il` and `anilina` build
 * `N-metilanilina`, and «Dibujar» puts N-metilbencenamina on the canvas — its
 * nitrogen bonded to the ring and to the methyl, one undoable edit, centred
 * and ordered — with «¡Correcto!… es una forma válida» above «Se llama:
 * N-metilbencenamina»; `N,4-dimetilanilina`, `p-cloroanilina` (a letter) and
 * `bencilamina` draw their molecules, a substituted `N-metilbencilamina` its
 * molecule with the app's name and why; `di`, `met`, `il` and `amina` build
 * the class name `dimetilamina`, a valid form, and `metiletilamina` its
 * molecule without a diagnosis yet (phase I-52c4b); `N,p-dimetilanilina` and
 * `tetrametilamina` are refused with their tiles marked, the canvas
 * untouched; the Ayuda section «Del nombre al dibujo» has its amine line.
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
 * the bond order (an amine's N is single-bonded to one to three carbons:
 * `C1 C1` for N-metilanilina), the nitrogens sorted.
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

test('«Nombres tradicionales»: the amine tiles; `N-metilanilina` draws N-metilbencenamina, a valid form; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const traditional = dialog.getByRole('group', { name: 'Nombres tradicionales' });
  for (const [id, text, hint] of [['template-aniline', 'anilina', /bencenamina\. .*N,4-dimetilanilina/],
    ['template-benzylamine', 'bencilamina', /fenilmetanamina/]]) {
    const tile = traditional.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveText(text);
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAccessibleName(text);
    await expect(tile).toHaveAttribute('title', hint);
  }
  await expect(dialog.locator('[data-tile="suffix-amine"]')).toHaveAttribute('title', /met, il y amina dan metilamina/);
  await page.keyboard.press('Escape');

  await buildName(page, 'N', 'met', 'il', 'anilina');
  await expect(page.locator('#name-builder-name')).toHaveText('N-metilanilina');
  await expect(page.locator('#name-builder-name .part-stem')).toHaveText('anilina');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // N-metilbencenamina on the canvas: seven carbons, the nitrogen single-bonded to the ring and to the methyl; whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'N']);
  expect(drawn.bonds).toHaveLength(8);
  expect(nitrogenBonds(drawn)).toEqual(['C1 C1']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: N-metilanilina');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «N-metilanilina» es una forma válida (nombre tradicional, '
    + 'que la IUPAC (2013) conserva como preferido). El nombre que doy primero es «N-metilbencenamina».');
  await expect(page.locator('#result-name')).toHaveText('N-metilbencenamina');
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test '«Nombres tradicionales»: the amine tiles…'

test('`N,4-dimetilanilina`, `p-cloroanilina` and `bencilamina` draw their molecules; `N-metilbencilamina` its molecule and why', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  let dialog = await buildName(page, 'N', '4', 'di', 'met', 'il', 'anilina');
  await expect(page.locator('#name-builder-name')).toHaveText('N,4-dimetilanilina');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(page.locator('#result-name')).toHaveText('N,4-dimetilbencen-1-amina');
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'N']);
  expect(nitrogenBonds(drawn)).toEqual(['C1 C1']); // One methyl on the nitrogen, the other on the ring.
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The old orto/meta/para form the engine writes on `anilina`.
  dialog = await buildName(page, 'p (para, 1,4)', 'cloro', 'anilina');
  await expect(page.locator('#name-builder-name')).toHaveText('p-cloroanilina');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «p-cloroanilina» es una forma válida (forma antigua con '
    + 'orto/meta/para; hoy se recomienda el número (1,2 / 1,3 / 1,4)). El nombre que doy primero es «4-clorobencen-1-amina».');
  await expect(page.locator('#result-name')).toHaveText('4-clorobencen-1-amina');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'Cl', 'N']);
  expect(nitrogenBonds(drawn)).toEqual(['C1']);

  dialog = await buildName(page, 'bencilamina');
  await expect(page.locator('#name-builder-name')).toHaveText('bencilamina');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «bencilamina» es una forma válida (nombre tradicional, que '
    + 'la IUPAC (2013) acepta). El nombre que doy primero es «fenilmetanamina».');
  await expect(page.locator('#result-name')).toHaveText('fenilmetanamina');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'N']);
  expect(nitrogenBonds(drawn)).toEqual(['C1']);

  // `bencilamina` with a group on its nitrogen, which the engine never writes: the molecule, named by the app, and why.
  dialog = await buildName(page, 'N', 'met', 'il', 'bencilamina');
  await expect(page.locator('#name-builder-name')).toHaveText('N-metilbencilamina');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'SUBSTITUTED_TEMPLATE');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('El nombre tradicional «bencilamina» no admite sustituyentes: con '
    + 'más grupos, la molécula se nombra con su nombre sistemático: «1-fenil-N-metilmetanamina».');
  await expect(page.locator('#result-name')).toHaveText('1-fenil-N-metilmetanamina');
  drawn = await moleculeJSON(page);
  expect(nitrogenBonds(drawn)).toEqual(['C1 C1']);
  expect(await drawingInsideCanvas(page)).toBe(true);
  expect(errors).toEqual([]);
}); // End of test '`N,4-dimetilanilina`, `p-cloroanilina`…'

test('class names: `dimetilamina` draws N-metilmetanamina, a valid form; `metiletilamina` its molecule, no diagnosis yet', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  let dialog = await buildName(page, 'di', 'met', 'il', 'amina');
  await expect(page.locator('#name-builder-name')).toHaveText('dimetilamina');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'N']);
  expect(nitrogenBonds(drawn)).toEqual(['C1 C1']);
  expect(await drawingInsideCanvas(page)).toBe(true);
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: dimetilamina');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «dimetilamina» es una forma válida (nombre tradicional (los '
    + 'grupos unidos al nitrógeno y la palabra «amina»), muy usado en los libros). El nombre que doy primero es «N-metilmetanamina».');
  await expect(page.locator('#result-name')).toHaveText('N-metilmetanamina');

  dialog = await buildName(page, 'et', 'il', 'di', 'met', 'il', 'amina');
  await expect(page.locator('#name-builder-name')).toHaveText('etildimetilamina');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(page.locator('#result-name')).toHaveText('N,N-dimetiletanamina');
  expect(nitrogenBonds(await moleculeJSON(page))).toEqual(['C1 C1 C1']);

  // Out of alphabetical order: the class name's own mistake, a deliberate null of diagnose.js «Amines» until phase I-52c4b.
  dialog = await buildName(page, 'met', 'il', 'et', 'il', 'amina');
  await expect(page.locator('#name-builder-name')).toHaveText('metiletilamina');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  expect(await verdict.getAttribute('data-diagnosis')).toBeNull();
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«N-metiletanamina». Pulsa «Ver paso a paso» para ver por qué.');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveCount(0);
  await expect(page.locator('#result-name')).toHaveText('N-metiletanamina');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'N']);
  expect(errors).toEqual([]);
}); // End of test 'class names…'

test('`N,p-dimetilanilina` and `tetrametilamina` are refused with their tiles marked; the Ayuda line of amines', async ({ page }) => {
  const errors = await openApp(page);
  let dialog = await buildName(page, 'N', 'p (para, 1,4)', 'di', 'met', 'il', 'anilina');
  await expect(page.locator('#name-builder-name')).toHaveText('N,p-dimetilanilina');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('«N» y las letras «o», «m» y «p» no van juntas delante de un mismo grupo: con un grupo en el '
    + 'nitrógeno y otro en el anillo, escribe los números (N,4-dimetilanilina).');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([0, 1]);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);

  // A fourth group on the nitrogen of a class name: VALENCE, the tiles of the group that adds it.
  dialog = await buildName(page, 'tetra', 'met', 'il', 'amina');
  await expect(page.locator('#name-builder-name')).toHaveText('tetrametilamina');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('El nitrógeno de la amina tendría 4 enlaces, y un nitrógeno solo puede tener 3.');
  expect(await invalidTiles(page)).toEqual([0, 1, 2]);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);

  // Ayuda, «Del nombre al dibujo»: amines are read; their tiles, `N`, `amino`, the retained names and the class names.
  await page.getByRole('button', { name: 'Ayuda' }).click();
  const help = page.getByRole('dialog', { name: 'Cómo se usa' });
  await expect(help.locator('#help-name-to-drawing')).toContainText('y de sus nitrilos y aminas');
  const line = help.locator('#help-name-to-drawing-amines');
  for (const phrase of ['Aminas.', '«amina» va al final', 'propan-2-amina', '«N»', 'N-metiletanamina', 'N,N-dimetilmetanamina',
    '«amino»', '2-aminoetan-1-ol', '(dimetilamino)', 'la anilina', '4-cloroanilina', 'N-metilanilina', 'la bencilamina',
    'solo vale sin más ramas', 'metilamina', 'dimetilamina', 'por orden alfabético', 'tert-butilamina']) {
    await expect(line).toContainText(phrase);
  }
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
}); // End of test '`N,p-dimetilanilina` and `tetrametilamina`…'
