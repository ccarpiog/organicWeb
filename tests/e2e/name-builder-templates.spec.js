/**
 * @file «¿Cómo se dibuja?» with the retained templates and the orto/meta/para
 * letters e2e (design.md §14.4, §14.5, §15.2, §15.8 R-4; phase I-50c, R-4c):
 * the «Nombres tradicionales» row offers `tolueno`, `estireno`, `xileno` and
 * `mesitileno`, the «Anillos» row the letters `o`, `m`, `p` with their words;
 * tiles `p xileno` build `p-xileno`, and «Dibujar» puts p-xylene on the canvas
 * — one undoable edit, centred and ordered, the ring highlighted — with
 * «¡Correcto!… es una forma válida» above «Se llama: 1,4-dimetilbenceno»;
 * `tolueno` and a substituted `4-metiltolueno` draw too (the latter with the
 * app's name and why), `xileno` alone asks for its numbers; a
 * refused o/m/p form (`o-trimetilbenceno`, and since I-54b a letter before
 * the second of two different prefixes, `etil-m-metilbenceno`) stays in the
 * dialog with its message and the letter marked, the canvas untouched; the
 * Ayuda section «Del nombre al dibujo» has the rings line. Since I-54b the
 * tiles `m cloro et il benceno` draw `m-cloroetilbenceno`, a valid form.
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

test('«Nombres tradicionales»: tiles `p xileno` draw p-xylene, a valid form; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const traditional = dialog.getByRole('group', { name: 'Nombres tradicionales' });
  for (const [id, text] of [['template-toluene', 'tolueno'], ['template-styrene', 'estireno'], ['template-xylene', 'xileno'],
    ['template-mesitylene', 'mesitileno']]) {
    const tile = traditional.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveText(text);
    await expect(tile).toBeVisible();
  }
  // The letters sit in «Anillos», each with its word beside it and the positions in its accessible name.
  const rings = dialog.getByRole('group', { name: 'Anillos' });
  for (const [id, label, shown] of [['positional-ortho', 'o (orto, 1,2)', 'oorto'], ['positional-meta', 'm (meta, 1,3)', 'mmeta'],
    ['positional-para', 'p (para, 1,4)', 'ppara']]) {
    const tile = rings.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveAccessibleName(label);
    await expect(tile).toHaveText(shown);
  }
  await page.keyboard.press('Escape');

  await buildName(page, 'p (para, 1,4)', 'xileno');
  await expect(page.locator('#name-builder-name')).toHaveText('p-xileno');
  await expect(page.locator('#name-builder-name .part-locant')).toHaveText('p');
  await expect(page.locator('#name-builder-name .part-stem')).toHaveText('xileno');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // p-Xylene on the canvas: eight carbons, eight bonds (six in the ring, three of them double), whole and in view.
  const drawn = await moleculeJSON(page);
  expect([drawn.atoms.length, drawn.bonds.length]).toEqual([8, 8]);
  expect(drawn.bonds.filter((bond) => bond.order === 2)).toHaveLength(3);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The verdict, then «Se llama:» with the systematic name; the ordered drawing highlights the ring.
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: p-xileno');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «p-xileno» es una forma válida (nombre tradicional, '
    + 'que la IUPAC (2013) acepta). El nombre que doy primero es «1,4-dimetilbenceno».');
  await expect(page.locator('#result-name')).toHaveText('1,4-dimetilbenceno');
  await expect(page.locator('svg#canvas .hl-parent.hl-atom')).toHaveCount(6);

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test '«Nombres tradicionales»: tiles `p xileno` draw p-xylene…'

test('`tolueno` draws toluene; `4-metiltolueno` draws the molecule with the app\'s name; `xileno` alone asks for numbers', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  let dialog = await buildName(page, 'tolueno');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-message')).toContainText('«tolueno» es una forma válida');
  await expect(page.locator('#result-name')).toHaveText('metilbenceno');
  expect((await moleculeJSON(page)).atoms).toHaveLength(7);

  // A substituted template, which the app never writes: the molecule it describes, named by the app, and why (I-50d).
  dialog = await buildName(page, '4', 'met', 'il', 'tolueno');
  await expect(page.locator('#name-builder-name')).toHaveText('4-metiltolueno');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«1,4-dimetilbenceno».');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'SUBSTITUTED_TEMPLATE');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('El nombre tradicional «tolueno» no admite más sustituyentes: '
    + 'con más ramas en el anillo, la molécula se nombra a partir de «benceno», con todas las ramas delante: «1,4-dimetilbenceno».');
  await expect(verdict.locator('.verdict-hint')).toHaveText('Pulsa «Ver paso a paso» para ver por qué.');
  await expect(page.locator('#result-name')).toHaveText('1,4-dimetilbenceno');
  const drawn = await moleculeJSON(page);
  expect([drawn.atoms.length, drawn.bonds.length]).toEqual([8, 8]);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // `xileno` without the positions of its methyls: three molecules; nothing drawn, the canvas keeps the last drawing.
  dialog = await buildName(page, 'xileno');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(page.locator('#name-builder-message')).toHaveText('Faltan números: puede ser 1,2-xileno, 1,3-xileno o 1,4-xileno.');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await moleculeJSON(page)).atoms).toHaveLength(8);
  expect(errors).toEqual([]);
}); // End of test '`tolueno` draws toluene…'

test('refused o/m/p forms stay in the dialog with the letter marked, the canvas untouched; the Ayuda rings line', async ({ page }) => {
  const errors = await openApp(page);
  // Three groups on the ring: the letters only say where two of them are.
  const dialog = await buildName(page, 'o (orto, 1,2)', 'tri', 'met', 'il', 'benceno');
  await expect(page.locator('#name-builder-name')).toHaveText('o-trimetilbenceno');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu nombre pone tres: '
    + 'escribe los números (1,2,4-trimetilbenceno).');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([0]);
  await expect(dialog).toBeVisible();
  // Two different groups on benzene (I-54b): one letter, at the start, before the first group — not before the second.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of ['et', 'il', 'm (meta, 1,3)', 'met', 'il', 'benceno']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await expect(page.locator('#name-builder-name')).toHaveText('etil-m-metilbenceno');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('Con dos grupos distintos en el benceno, la letra va al principio del nombre, delante del primer '
    + 'grupo, que va en el carbono 1: la letra dice dónde está el segundo (m-cloroetilbenceno).');
  expect(await invalidTiles(page)).toEqual([2]);
  await page.keyboard.press('Escape');
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);

  // Ayuda, «Del nombre al dibujo»: rings, benzene, the templates and the letters.
  await page.getByRole('button', { name: 'Ayuda' }).click();
  const help = page.getByRole('dialog', { name: 'Cómo se usa' });
  const line = help.locator('#help-name-to-drawing-rings');
  for (const phrase of ['«ciclo» va delante de la raíz', '«fenil»', '(4-metilfenil)', '«Nombres tradicionales»', 'tolueno', 'estireno',
    'mesitileno', '(1,2-xileno)', 'p (para) = 1,4', 'p-dimetilbenceno', 'o distintos: entonces la letra va al principio del nombre',
    '(m-cloroetilbenceno, que con números es el 1-cloro-3-etilbenceno)', 'pero no con tres grupos.']) {
    await expect(line).toContainText(phrase);
  }
  await expect(help.locator('#help-name-to-drawing')).toContainText('o con un anillo');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
}); // End of test 'refused o/m/p forms stay in the dialog…'

test('two different groups on benzene (I-54b): tiles `m cloro et il benceno` draw m-cloroetilbenceno, a valid form', async ({ page }) => {
  const errors = await openApp(page);
  const dialog = await buildName(page, 'm (meta, 1,3)', 'cloro', 'et', 'il', 'benceno');
  await expect(page.locator('#name-builder-name')).toHaveText('m-cloroetilbenceno');
  await expect(page.locator('#name-builder-name .part-locant')).toHaveText('m');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // 1-Chloro-3-ethylbenzene on the canvas: eight carbons and the chlorine, nine bonds (three of them double), in view.
  const drawn = await moleculeJSON(page);
  expect([drawn.atoms.length, drawn.bonds.length]).toEqual([9, 9]);
  expect(drawn.atoms.filter((atom) => atom.element === 'Cl')).toHaveLength(1);
  expect(drawn.bonds.filter((bond) => bond.order === 2)).toHaveLength(3);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The `alternative` verdict: the old letter form with its label, then «Se llama:» with the name the app gives first.
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: m-cloroetilbenceno');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «m-cloroetilbenceno» es una forma válida (forma antigua '
    + 'con orto/meta/para; hoy se recomienda el número (1,2 / 1,3 / 1,4)). El nombre que doy primero es «1-cloro-3-etilbenceno».');
  await expect(page.locator('#result-name')).toHaveText('1-cloro-3-etilbenceno');
  await expect(page.locator('svg#canvas .hl-parent.hl-atom')).toHaveCount(6);

  // The two groups out of alphabetical order: the molecule, the app's name and the order rule, worded for the letter.
  const again = await buildName(page, 'p (para, 1,4)', 'met', 'il', 'cloro', 'benceno');
  await expect(page.locator('#name-builder-name')).toHaveText('p-metilclorobenceno');
  await again.getByRole('button', { name: 'Dibujar' }).click();
  await expect(again).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'ALPHABETICAL_ORDER');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('Los sustituyentes se escriben por orden alfabético, también con la '
    + 'letra «p» delante: «cloro» va antes que «metil» (c antes que m). Se escribe «p-clorometilbenceno», no «p-metilclorobenceno».');
  await expect(page.locator('#result-name')).toHaveText('1-cloro-4-metilbenceno');
  expect(errors).toEqual([]);
}); // End of test 'two different groups on benzene (I-54b)…'
