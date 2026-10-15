/**
 * @file «¿Cómo se dibuja?» with amines e2e (design.md §15.2, §15.5.2, §15.8
 * R-6c; phase I-52c1, R-6c1): the «Grupos» row offers the suffix `amina` and
 * the «Números» row the locant `N`, each with its tooltip; tiles `N met il et
 * ano amina` build `N-metiletanamina` and «Dibujar» puts the molecule on the
 * canvas, the methyl on the nitrogen, one undoable edit, centred and ordered,
 * with «¡Correcto!»; `N 2 di met il prop ano 1 amina` (a mixed `N,2` list)
 * and `bencenamina` are correct; `met il et ano amina` draws N-metiletanamina
 * with «Casi: faltan los números…»; the shared rules speak on an amine name
 * (`N-metil-N-metiletanamina`: UNGROUPED), the amine's own mistakes are
 * deliberate nulls (`N-etilmetanamina`: drawn and named, no diagnosis yet,
 * phase I-52c4); `N` without `amina` and a third group on the nitrogen stay
 * in the dialog with their message and marked tiles, the canvas untouched.
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
 * The bonds of each nitrogen of a drawn molecule: its neighbours' elements
 * and the bond orders (`C1 C1` for a nitrogen with two carbons), the
 * nitrogens sorted.
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

test('the `amina` and `N` tiles; `N met il et ano amina` draws N-metiletanamina, correct, ordered; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const amina = dialog.getByRole('group', { name: 'Grupos' }).locator('[data-tile="suffix-amine"]');
  await expect(amina).toHaveText('amina');
  await expect(amina).toBeVisible();
  await expect(amina).toHaveAccessibleName('amina');
  await expect(amina).toHaveAttribute('title', /propan-2-amina, butano-1,4-diamina, ciclohexanamina, bencenamina/);
  await expect(amina).toHaveClass(/nb-tile--suffix/);
  const nitrogen = dialog.getByRole('group', { name: 'Números' }).locator('[data-tile="locant-nitrogen"]');
  await expect(nitrogen).toHaveText('N');
  await expect(nitrogen).toBeVisible(); // Shown with 1–12, never behind «más».
  await expect(nitrogen).toHaveAccessibleName('N');
  await expect(nitrogen).toHaveAttribute('title', /unida al nitrógeno de la amina/);
  await expect(nitrogen).toHaveClass(/nb-tile--nitrogen/);
  await page.keyboard.press('Escape');

  await buildName(page, 'N', 'met', 'il', 'et', 'ano', 'amina');
  const line = page.locator('#name-builder-name');
  await expect(line).toHaveText('N-metiletanamina');
  await expect(line.locator('.part-locant').first()).toHaveText('N');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // Three carbons and the nitrogen, bonded to two of them; whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'N']);
  expect(nitrogenBonds(drawn)).toEqual(['C1 C1']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The verdict, then «Se llama:»; the ordered drawing highlights the parent.
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: N-metiletanamina');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto!');
  await expect(page.locator('#result-name')).toHaveText('N-metiletanamina');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);

  // A mixed `N,2` list: one methyl on the nitrogen, one on carbon 2.
  const again = await buildName(page, 'N', '2', 'di', 'met', 'il', 'prop', 'ano', '1', 'amina');
  await expect(line).toHaveText('N,2-dimetilpropan-1-amina');
  await again.getByRole('button', { name: 'Dibujar' }).click();
  await expect(again).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('N,2-dimetilpropan-1-amina');
  const mixed = await moleculeJSON(page);
  expect(elementsOf(mixed)).toEqual(['C', 'C', 'C', 'C', 'C', 'N']);
  expect(nitrogenBonds(mixed)).toEqual(['C1 C1']);

  // `benceno amina`: the `o` of `benceno` elided before `amina`; the traditional name offered.
  const benzene = await buildName(page, 'benceno', 'amina');
  await expect(line).toHaveText('bencenamina');
  await benzene.getByRole('button', { name: 'Dibujar' }).click();
  await expect(benzene).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! También se llama «anilina» (nombre tradicional, que la '
    + 'IUPAC (2013) conserva como preferido).');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'N']);
  expect(errors).toEqual([]);
}); // End of test 'the `amina` and `N` tiles…'

test('left-out `N`: missing locants; the shared rules speak; an amine\'s own mistake has no diagnosis yet', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  // `metiletanamina`: the methyl's place left out, searched on the carbons and on the nitrogen; only `N` gives the app's name.
  let dialog = await buildName(page, 'met', 'il', 'et', 'ano', 'amina');
  await expect(page.locator('#name-builder-name')).toHaveText('metiletanamina');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'missingLocants');
  await expect(verdict.locator('.verdict-message')).toHaveText('Casi: faltan los números. Se escribe «N-metiletanamina».');
  await expect(page.locator('#result-name')).toHaveText('N-metiletanamina');
  expect(nitrogenBonds(await moleculeJSON(page))).toEqual(['C1 C1']);

  // `N-metil-N-metiletanamina`: two methyls on the nitrogen written one by one; UNGROUPED speaks of `N,N-dimetil`.
  dialog = await buildName(page, 'N', 'met', 'il', 'N', 'met', 'il', 'et', 'ano', 'amina');
  await expect(page.locator('#name-builder-name')).toHaveText('N-metil-N-metiletanamina');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'UNGROUPED');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('Las ramas iguales se escriben una sola vez, con «di», «tri»… '
    + 'delante: «N,N-dimetil», no «N-metil-N-metil».');
  await expect(page.locator('#result-name')).toHaveText('N,N-dimetiletanamina');
  expect(nitrogenBonds(await moleculeJSON(page))).toEqual(['C1 C1 C1']);

  // `N-etilmetanamina`: the parent on the other side of the nitrogen, a deliberate null of diagnose.js «Amines» until phase
  // I-52c4: drawn and named, today's block without a diagnosis.
  dialog = await buildName(page, 'N', 'et', 'il', 'met', 'ano', 'amina');
  await expect(page.locator('#name-builder-name')).toHaveText('N-etilmetanamina');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  expect(await verdict.getAttribute('data-diagnosis')).toBeNull();
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«N-metiletanamina». Pulsa «Ver paso a paso» para ver por qué.');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveCount(0);
  await expect(page.locator('#result-name')).toHaveText('N-metiletanamina');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'N']);
  expect(errors).toEqual([]);
}); // End of test 'left-out `N`…'

test('`N` without `amina` and a third group on the nitrogen stay in the dialog, tiles marked, canvas untouched', async ({ page }) => {
  const errors = await openApp(page);
  // Something on the canvas first, which a failure must keep.
  let dialog = await buildName(page, 'et', 'ano', 'amina');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#result-name')).toHaveText('etanamina');

  // `N-metiletano`: `N` names an amine's nitrogen, and the name has no `amina`.
  dialog = await buildName(page, 'N', 'met', 'il', 'et', 'ano');
  await expect(page.locator('#name-builder-name')).toHaveText('N-metiletano');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('Esta ficha no puede ir aquí: «N» dice que un grupo va unido al nitrógeno de una amina, así que '
    + 'solo va en un nombre que acaba en «amina» (N-metiletanamina).');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([0]);
  await expect(dialog).toBeVisible();

  // `N,N,N-trimetiletanamina`: the nitrogen holds three bonds; the third `N` is marked.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of ['N', 'N', 'N', 'tri', 'met', 'il', 'et', 'ano', 'amina']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await expect(page.locator('#name-builder-name')).toHaveText('N,N,N-trimetiletanamina');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('El nitrógeno de la amina tendría 4 enlaces, y un nitrógeno solo puede tener 3.');
  expect(await invalidTiles(page)).toEqual([2]);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  // The canvas keeps etanamina.
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'N']);
  await expect(page.locator('#result-name')).toHaveText('etanamina');
  expect(errors).toEqual([]);
}); // End of test '`N` without `amina`…'
