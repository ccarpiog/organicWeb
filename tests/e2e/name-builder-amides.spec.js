/**
 * @file «¿Cómo se dibuja?» with amides e2e (design.md §15.2, §15.5.2, §15.8
 * R-6d; phase I-52d1, R-6d1): the «Grupos» row offers the suffixes `amida`
 * and `carboxamida` and the «Anillos» row `benzamida`, each with its tooltip,
 * and the `N` tooltip names the amides too; tiles `N met il et ano amida`
 * build `N-metiletanamida` and «Dibujar» puts the molecule on the canvas,
 * the methyl on the amide's nitrogen, one undoable edit, centred and
 * ordered, with «¡Correcto!» and its traditional name; `but ano di amida`,
 * `ciclo hex ano 1 4 di carboxamida` and `N N di met il benzamida` are
 * correct, `N et il p met il benzamida` an alternative; `met il et ano amida`
 * draws N-metiletanamida with «Casi: faltan los números…»; the shared rules
 * speak on an amide name (`N-metil-N-metiletanamida`: UNGROUPED), and an
 * amide's own mistake (`propano-1-carboxamida`) is drawn and named without a
 * diagnosis, a deliberate null of diagnose.js «Amides» until phase I-52d4;
 * an `N` and a letter on one prefix, a third group on the amide's nitrogen
 * and a group on one nitrogen of a diamide stay in the dialog with their
 * message (and marked tiles), the canvas untouched.
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
 * and the bond orders (`C1 C1` for an amide's nitrogen with one group on it),
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

test('the amide tiles; `N met il et ano amida` draws N-metiletanamida, correct, ordered; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const groups = dialog.getByRole('group', { name: 'Grupos' });
  for (const [id, text, hint] of [['suffix-amide', 'amida', /propanamida; con dos, butanodiamida/],
    ['suffix-carboxamide', 'carboxamida', /ciclohexanocarboxamida, ciclohexano-1,4-dicarboxamida/]]) {
    const tile = groups.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveText(text);
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAccessibleName(text);
    await expect(tile).toHaveAttribute('title', hint);
    await expect(tile).toHaveClass(/nb-tile--suffix/);
  }
  const ring = dialog.getByRole('group', { name: 'Anillos' }).locator('[data-tile="ring-benzamide"]');
  await expect(ring).toHaveText('benzamida');
  await expect(ring).toHaveAccessibleName('benzamida');
  await expect(ring).toHaveAttribute('title', 'Benceno con un grupo amida: bencenocarboxamida. Las ramas unidas al nitrógeno llevan «N»: '
    + 'N-metilbenzamida.');
  const nitrogen = dialog.getByRole('group', { name: 'Números' }).locator('[data-tile="locant-nitrogen"]');
  await expect(nitrogen).toHaveAttribute('title', /También en las amidas, para las ramas unidas a su nitrógeno/);
  await page.keyboard.press('Escape');

  await buildName(page, 'N', 'met', 'il', 'et', 'ano', 'amida');
  const line = page.locator('#name-builder-name');
  await expect(line).toHaveText('N-metiletanamida');
  await expect(line.locator('.part-locant').first()).toHaveText('N');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // Three carbons, the =O and the nitrogen, bonded to the C=O carbon and the methyl; whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'N', 'O']);
  expect(nitrogenBonds(drawn)).toEqual(['C1 C1']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The verdict, then «Se llama:»; the ordered drawing highlights the parent.
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: N-metiletanamida');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! También se llama «N-metilacetamida» (nombre tradicional, '
    + 'que la IUPAC (2013) conserva como preferido).');
  await expect(page.locator('#result-name')).toHaveText('N-metiletanamida');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);

  // `but ano di amida`: the `o` of `ano` kept before `diamida`; an amide group at each end.
  let again = await buildName(page, 'but', 'ano', 'di', 'amida');
  await expect(line).toHaveText('butanodiamida');
  await again.getByRole('button', { name: 'Dibujar' }).click();
  await expect(again).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('butanodiamida');
  expect(nitrogenBonds(await moleculeJSON(page))).toEqual(['C1', 'C1']);

  // `ciclo hex ano 1 4 di carboxamida`: each group's carbon outside the ring.
  again = await buildName(page, 'ciclo', 'hex', 'ano', '1', '4', 'di', 'carboxamida');
  await expect(line).toHaveText('ciclohexano-1,4-dicarboxamida');
  await again.getByRole('button', { name: 'Dibujar' }).click();
  await expect(again).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('ciclohexano-1,4-dicarboxamida');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'N', 'N', 'O', 'O']);
  expect(errors).toEqual([]);
}); // End of test 'the amide tiles…'

test('`benzamida` with `N`: correct and the o/m/p alternative; left-out `N`; the shared rules speak; an amide\'s own mistake has no diagnosis yet', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  const line = page.locator('#name-builder-name');
  // `N,N-dimetilbenzamida`: two methyls on the amide's nitrogen, none on the ring.
  let dialog = await buildName(page, 'N', 'N', 'di', 'met', 'il', 'benzamida');
  await expect(line).toHaveText('N,N-dimetilbenzamida');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('N,N-dimetilbenzamida');
  expect(nitrogenBonds(await moleculeJSON(page))).toEqual(['C1 C1 C1']);

  // `N-etil-p-metilbenzamida`: the ethyl on the nitrogen occupies no ring position, so the letter reads (the old form).
  dialog = await buildName(page, 'N', 'et', 'il', 'p (para, 1,4)', 'met', 'il', 'benzamida');
  await expect(line).toHaveText('N-etil-p-metilbenzamida');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(page.locator('#result-name')).toHaveText('N-etil-4-metilbenzamida');

  // `metiletanamida`: the methyl's place left out, searched on the carbons and on the nitrogen; only `N` gives the app's name.
  dialog = await buildName(page, 'met', 'il', 'et', 'ano', 'amida');
  await expect(line).toHaveText('metiletanamida');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'missingLocants');
  await expect(verdict.locator('.verdict-message')).toHaveText('Casi: faltan los números. Se escribe «N-metiletanamida».');
  await expect(page.locator('#result-name')).toHaveText('N-metiletanamida');
  expect(nitrogenBonds(await moleculeJSON(page))).toEqual(['C1 C1']);

  // `N-metil-N-metiletanamida`: two methyls on the nitrogen written one by one; UNGROUPED speaks of `N,N-dimetil`.
  dialog = await buildName(page, 'N', 'met', 'il', 'N', 'met', 'il', 'et', 'ano', 'amida');
  await expect(line).toHaveText('N-metil-N-metiletanamida');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'UNGROUPED');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('Las ramas iguales se escriben una sola vez, con «di», «tri»… '
    + 'delante: «N,N-dimetil», no «N-metil-N-metil».');
  await expect(page.locator('#result-name')).toHaveText('N,N-dimetiletanamida');

  // `propano-1-carboxamida`: the amide's carbon on the other side of the parent, a deliberate null of diagnose.js «Amides» until
  // phase I-52d4: drawn and named, the block without a diagnosis.
  dialog = await buildName(page, 'prop', 'ano', '1', 'carboxamida');
  await expect(line).toHaveText('propano-1-carboxamida');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  expect(await verdict.getAttribute('data-diagnosis')).toBeNull();
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«butanamida». Pulsa «Ver paso a paso» para ver por qué.');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveCount(0);
  await expect(page.locator('#result-name')).toHaveText('butanamida');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'C', 'N', 'O']);
  expect(errors).toEqual([]);
}); // End of test '`benzamida` with `N`…'

test('an `N` with a letter, a third group on the amide\'s nitrogen and an `N` on a diamide stay in the dialog, canvas untouched', async ({ page }) => {
  const errors = await openApp(page);
  // Something on the canvas first, which a failure must keep.
  let dialog = await buildName(page, 'et', 'ano', 'amida');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#result-name')).toHaveText('etanamida');

  // `N,p-dimetilbenzamida`: an `N` and a letter on one prefix, no used form.
  dialog = await buildName(page, 'N', 'p (para, 1,4)', 'di', 'met', 'il', 'benzamida');
  await expect(page.locator('#name-builder-name')).toHaveText('N,p-dimetilbenzamida');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('«N» y las letras «o», «m» y «p» no van juntas delante de un mismo grupo: con un grupo en el '
    + 'nitrógeno y otro en el anillo, escribe «N» para el del nitrógeno y un número para el del anillo (N,4-dimetilbenzamida).');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([0, 1]);
  await expect(dialog).toBeVisible();

  // `N,N,N-trimetiletanamida`: the amide's nitrogen holds three bonds; the third `N` is marked.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of ['N', 'N', 'N', 'tri', 'met', 'il', 'et', 'ano', 'amida']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await expect(page.locator('#name-builder-name')).toHaveText('N,N,N-trimetiletanamida');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('El nitrógeno de la amida tendría 4 enlaces, y un nitrógeno solo puede tener 3.');
  expect(await invalidTiles(page)).toEqual([2]);
  await expect(dialog).toBeVisible();

  // `N-metilbutanodiamida`: a group on one nitrogen of a diamide, which the app cannot tell apart (N¹, N⁴): out of scope.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  for (const text of ['N', 'met', 'il', 'but', 'ano', 'di', 'amida']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await expect(page.locator('#name-builder-name')).toHaveText('N-metilbutanodiamida');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toContainText('Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar: Esta molécula tiene dos '
    + 'grupos amida y alguno de sus nitrógenos lleva otros grupos unidos.');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  // The canvas keeps etanamida.
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'N', 'O']);
  await expect(page.locator('#result-name')).toHaveText('etanamida');
  expect(errors).toEqual([]);
}); // End of test 'an `N` with a letter…'
