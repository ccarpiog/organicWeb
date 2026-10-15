/**
 * @file «¿Cómo se dibuja?» with amino prefixes e2e (design.md §15.2, §15.5.2,
 * §15.8 R-6c; phase I-52c2, R-6c2): the «Grupos» row offers `amino`, with
 * its tooltip; tiles `2 amino et ano 1 ol` build `2-aminoetan-1-ol` and
 * «Dibujar» puts the molecule on the canvas, one undoable edit, centred and
 * ordered, with «¡Correcto!»; the groups on the nitrogen go before `amino`
 * in a compound branch, the marks automatic (`2-(dimetilamino)etan-1-ol`,
 * `2-[etil(metil)amino]etan-1-ol`, both correct); `ácido amino et ano oico`
 * draws the amino acid with «Casi: faltan los números…»; a shared rule speaks
 * on the groups on the nitrogen (`2-[metil(metil)amino]etan-1-ol`:
 * UNGROUPED); a principal amine written `amino` has its diagnosis
 * (`aminoetano`: drawn and named «etanamina», CARBONYL_PREFIX since phase
 * I-52c4a); a locant on a group of the nitrogen, an acyl group on it and a
 * third group stay in the dialog with their message and marked tiles, the
 * canvas untouched. Runs on the dev server and on dist (playwright.config.js).
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
 * and the bond orders (`C1 C1 C1` for a dimethylamino group's), the
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

test('the `amino` tile; `2 amino et ano 1 ol` draws 2-aminoetan-1-ol, correct, ordered; groups on the nitrogen in a compound branch', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const amino = dialog.getByRole('group', { name: 'Grupos' }).locator('[data-tile="retained-amino"]');
  await expect(amino).toHaveText('amino');
  await expect(amino).toBeVisible();
  await expect(amino).toHaveAccessibleName('amino');
  await expect(amino).toHaveAttribute('title', /2-aminoetan-1-ol, ácido 2-aminopropanoico/);
  await expect(amino).toHaveAttribute('title', /\(metilamino\), \(dimetilamino\), \[etil\(metil\)amino\]/);
  await expect(amino).toHaveClass(/nb-tile--retained/);
  await page.keyboard.press('Escape');

  await buildName(page, '2', 'amino', 'et', 'ano', '1', 'ol');
  const line = page.locator('#name-builder-name');
  await expect(line).toHaveText('2-aminoetan-1-ol');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // Two carbons, the OH and the NH₂, each on its carbon; whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'N', 'O']);
  expect(nitrogenBonds(drawn)).toEqual(['C1']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The verdict, then «Se llama:»; the ordered drawing highlights the parent.
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: 2-aminoetan-1-ol');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto!');
  await expect(page.locator('#result-name')).toHaveText('2-aminoetan-1-ol');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);

  // Two methyls on the nitrogen: `di` before them inside the compound branch, its marks written by the controls.
  let again = await buildName(page, '2', 'empieza rama compuesta', 'di', 'met', 'il', 'amino', 'acaba rama', 'et', 'ano', '1', 'ol');
  await expect(line).toHaveText('2-(dimetilamino)etan-1-ol');
  await again.getByRole('button', { name: 'Dibujar' }).click();
  await expect(again).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('2-(dimetilamino)etan-1-ol');
  expect(nitrogenBonds(await moleculeJSON(page))).toEqual(['C1 C1 C1']);

  // Two different groups: the second one's parentheses and the outer brackets are automatic.
  again = await buildName(page, '2', 'empieza rama compuesta', 'et', 'il', 'met', 'il', 'amino', 'acaba rama', 'et', 'ano', '1', 'ol');
  await expect(line).toHaveText('2-[etil(metil)amino]etan-1-ol');
  await again.getByRole('button', { name: 'Dibujar' }).click();
  await expect(again).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('2-[etil(metil)amino]etan-1-ol');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'C', 'C', 'N', 'O']);
  expect(errors).toEqual([]);
}); // End of test 'the `amino` tile…'

test('left-out amino locant: missing locants; a shared rule on the nitrogen\'s groups; a principal amine written `amino` has its diagnosis', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  // `ácido aminoetanoico`: the amino prefix's place left out, searched; the engine's name cites it.
  let dialog = await buildName(page, 'ácido', 'amino', 'et', 'ano', 'oico');
  await expect(page.locator('#name-builder-name')).toHaveText('ácido aminoetanoico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'missingLocants');
  await expect(verdict.locator('.verdict-message')).toHaveText('Casi: faltan los números. Se escribe «ácido 2-aminoetanoico».');
  await expect(page.locator('#result-name')).toHaveText('ácido 2-aminoetanoico');

  // `2-[metil(metil)amino]etan-1-ol`: the two methyls on the nitrogen written one by one; UNGROUPED speaks of `(dimetilamino)`.
  dialog = await buildName(page, '2', 'empieza rama compuesta', 'met', 'il', 'met', 'il', 'amino', 'acaba rama', 'et', 'ano', '1', 'ol');
  await expect(page.locator('#name-builder-name')).toHaveText('2-[metil(metil)amino]etan-1-ol');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'UNGROUPED');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('Las ramas iguales se escriben una sola vez, con «di», «tri»… '
    + 'delante: «2-(dimetilamino)», no «2-[metil(metil)amino]».');
  await expect(page.locator('#result-name')).toHaveText('2-(dimetilamino)etan-1-ol');

  // `aminoetano`: a principal amine written as an amino prefix, a deliberate null of diagnose.js «Amines» until phase I-52c4a,
  // now CARBONYL_PREFIX: drawn and named, the diagnosis between the verdict's two sentences.
  dialog = await buildName(page, 'amino', 'et', 'ano');
  await expect(page.locator('#name-builder-name')).toHaveText('aminoetano');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'CARBONYL_PREFIX');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«etanamina».');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('El grupo amino es el grupo principal: se nombra con la '
    + 'terminación «-amina», al final del nombre, no con el prefijo «amino». Se escribe «etanamina».');
  await expect(verdict.locator('.verdict-hint')).toHaveText('Pulsa «Ver paso a paso» para ver por qué.');
  await expect(page.locator('#result-name')).toHaveText('etanamina');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'N']);
  expect(errors).toEqual([]);
}); // End of test 'left-out amino locant…'

test('a locant or an acyl group on the nitrogen\'s groups and a third group stay in the dialog, tiles marked, canvas untouched', async ({ page }) => {
  const errors = await openApp(page);
  // Something on the canvas first, which a failure must keep.
  let dialog = await buildName(page, '2', 'amino', 'et', 'ano', '1', 'ol');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#result-name')).toHaveText('2-aminoetan-1-ol');

  // `2-(1-metilamino)etan-1-ol`: the groups on the nitrogen take no locants.
  dialog = await buildName(page, '2', 'empieza rama compuesta', '1', 'met', 'il', 'amino', 'acaba rama', 'et', 'ano', '1', 'ol');
  await expect(page.locator('#name-builder-name')).toHaveText('2-(1-metilamino)etan-1-ol');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('Esta ficha no puede ir aquí: los grupos unidos al nitrógeno de «amino» van delante de «amino», sin '
    + 'números ni letras: (metilamino), (dimetilamino), [etil(metil)amino]. Si un grupo lleva sus propias ramas, va en su propia rama '
    + 'compuesta, con sus números dentro: [(2-cloroetil)amino].');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([2]);
  await expect(dialog).toBeVisible();

  // `2-(acetilamino)etan-1-ol`: a C=O group on the nitrogen makes an amide (the amides' phase).
  const rows = page.locator('#name-builder-rows');
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  for (const text of ['2', 'empieza rama compuesta', 'acetil', 'amino', 'acaba rama', 'et', 'ano', '1', 'ol']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await expect(page.locator('#name-builder-name')).toHaveText('2-(acetilamino)etan-1-ol');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('Esta ficha no puede ir aquí: «acetil» no va unido al nitrógeno de «amino»: un grupo C=O unido al '
    + 'nitrógeno no forma una amina, sino una amida.');
  expect(await invalidTiles(page)).toEqual([2]);

  // `2-(trimetilamino)etan-1-ol`: the nitrogen holds three bonds; the group that adds the fourth is marked.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  for (const text of ['2', 'empieza rama compuesta', 'tri', 'met', 'il', 'amino', 'acaba rama', 'et', 'ano', '1', 'ol']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await expect(page.locator('#name-builder-name')).toHaveText('2-(trimetilamino)etan-1-ol');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('El nitrógeno del grupo amino tendría 4 enlaces, y un nitrógeno solo puede tener 3.');
  expect(await invalidTiles(page)).toEqual([2, 3, 4]);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  // The canvas keeps 2-aminoetan-1-ol.
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'N', 'O']);
  await expect(page.locator('#result-name')).toHaveText('2-aminoetan-1-ol');
  expect(errors).toEqual([]);
}); // End of test 'a locant or an acyl group…'
