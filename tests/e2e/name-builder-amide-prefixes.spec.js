/**
 * @file «¿Cómo se dibuja?» with amide prefixes e2e (design.md §15.2, §15.5.2,
 * §15.8 R-6d; phase I-52d2, R-6d2): the «Grupos» row offers `carbamoil`, with
 * its tooltip, and `amino`'s tooltip names the acylamino prefixes; tiles
 * `ácido 3 carbamoil pent ano di oico` build `ácido 3-carbamoilpentanodioico`
 * and «Dibujar» puts the molecule on the canvas — the whole –CONH₂ on carbon 3
 * —, one undoable edit, centred and ordered, with «¡Correcto!»; the groups on
 * the carbamoyl nitrogen go before `carbamoil` in a compound branch, the marks
 * automatic (`ácido 3-[etil(metil)carbamoil]pentanodioico`); an acyl group on
 * an amino prefix's nitrogen builds the acylamino prefixes (`ácido
 * 2-(acetilamino)etanoico`, `2-(acetilamino)etanamida`, both correct); `ácido
 * (acetilamino)etanoico` draws the acid with «Casi: faltan los números…»; a
 * shared rule speaks on the groups on the carbamoyl nitrogen
 * (`[metil(etil)carbamoil]`: ALPHABETICAL_ORDER), and an amide's own mistake
 * (`ácido 3-carbamoilpropanoico`, whose C=O carbon the engine takes into the
 * chain) is drawn and named with its diagnosis (AMIDE_IN_CHAIN since phase
 * I-52d4, a deliberate null before); a locant on a group of the
 * carbamoyl nitrogen, a third group on it and an acyl group on it (an imide)
 * stay in the dialog with their message (and marked tiles), the canvas
 * untouched. Runs on the dev server and on dist (playwright.config.js).
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
 * and the bond orders (`C1 C1 C1` for a dimethylcarbamoyl group's), the
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

test('the `carbamoil` tile; `ácido 3 carbamoil pent ano di oico` draws, correct, ordered; groups on its nitrogen in a compound branch', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const groups = dialog.getByRole('group', { name: 'Grupos' });
  const carbamoyl = groups.locator('[data-tile="retained-carbamoyl"]');
  await expect(carbamoyl).toHaveText('carbamoil');
  await expect(carbamoyl).toBeVisible();
  await expect(carbamoyl).toHaveAccessibleName('carbamoil');
  await expect(carbamoyl).toHaveAttribute('title', /^Un grupo amida \(–CONH₂\) unido por el carbono del C=O/);
  await expect(carbamoyl).toHaveAttribute('title', /\(metilcarbamoil\), \[etil\(metil\)carbamoil\]/);
  await expect(carbamoyl).toHaveClass(/nb-tile--retained/);
  await expect(groups.locator('[data-tile="retained-amino"]')).toHaveAttribute('title', /\(acetilamino\), \[acetil\(metil\)amino\]/);
  await page.keyboard.press('Escape');

  await buildName(page, 'ácido', '3', 'carbamoil', 'pent', 'ano', 'di', 'oico');
  const line = page.locator('#name-builder-name');
  await expect(line).toHaveText('ácido 3-carbamoilpentanodioico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // Six carbons (the –CONH₂'s outside the chain), the two –COOH and the amide's =O and nitrogen; whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'N', 'O', 'O', 'O', 'O', 'O']);
  expect(nitrogenBonds(drawn)).toEqual(['C1']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The verdict, then «Se llama:»; the ordered drawing highlights the parent.
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: ácido 3-carbamoilpentanodioico');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto!');
  await expect(page.locator('#result-name')).toHaveText('ácido 3-carbamoilpentanodioico');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);

  // Two different groups on the amide's nitrogen: the second one's parentheses and the outer brackets are automatic.
  const again = await buildName(page, 'ácido', '3', 'empieza rama compuesta', 'et', 'il', 'met', 'il', 'carbamoil', 'acaba rama', 'pent',
    'ano', 'di', 'oico');
  await expect(line).toHaveText('ácido 3-[etil(metil)carbamoil]pentanodioico');
  await again.getByRole('button', { name: 'Dibujar' }).click();
  await expect(again).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('ácido 3-[etil(metil)carbamoil]pentanodioico');
  expect(nitrogenBonds(await moleculeJSON(page))).toEqual(['C1 C1 C1']);
  expect(errors).toEqual([]);
}); // End of test 'the `carbamoil` tile…'

test('acylamino prefixes: correct beside an acid and an amide; left-out locant; a shared rule on the nitrogen\'s groups; an amide\'s own mistake has no diagnosis yet', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  const line = page.locator('#name-builder-name');
  // `ácido 2-(acetilamino)etanoico`: the acetyl group on the amino prefix's nitrogen, its C=O carbon bonded to it.
  let dialog = await buildName(page, 'ácido', '2', 'empieza rama compuesta', 'acetil', 'amino', 'acaba rama', 'et', 'ano', 'oico');
  await expect(line).toHaveText('ácido 2-(acetilamino)etanoico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('ácido 2-(acetilamino)etanoico');
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'N', 'O', 'O', 'O']);
  expect(nitrogenBonds(drawn)).toEqual(['C1 C1']);

  // `2-(acetilamino)etanamida`: two amides on two carbon pieces, the other one the acylamino prefix.
  dialog = await buildName(page, '2', 'empieza rama compuesta', 'acetil', 'amino', 'acaba rama', 'et', 'ano', 'amida');
  await expect(line).toHaveText('2-(acetilamino)etanamida');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('2-(acetilamino)etanamida');
  expect(nitrogenBonds(await moleculeJSON(page))).toEqual(['C1', 'C1 C1']);

  // `ácido (acetilamino)etanoico`: the prefix's place left out, searched; the engine's name cites it.
  dialog = await buildName(page, 'ácido', 'empieza rama compuesta', 'acetil', 'amino', 'acaba rama', 'et', 'ano', 'oico');
  await expect(line).toHaveText('ácido (acetilamino)etanoico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'missingLocants');
  await expect(verdict.locator('.verdict-message')).toHaveText('Casi: faltan los números. Se escribe «ácido 2-(acetilamino)etanoico».');

  // `ácido 3-[metil(etil)carbamoil]pentanodioico`: the groups on the carbamoyl nitrogen out of alphabetical order.
  dialog = await buildName(page, 'ácido', '3', 'empieza rama compuesta', 'met', 'il', 'et', 'il', 'carbamoil', 'acaba rama', 'pent', 'ano',
    'di', 'oico');
  await expect(line).toHaveText('ácido 3-[metil(etil)carbamoil]pentanodioico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'ALPHABETICAL_ORDER');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('Los sustituyentes se escriben por orden alfabético: «etil» va antes que '
    + '«metil» (e antes que m).');
  await expect(page.locator('#result-name')).toHaveText('ácido 3-[etil(metil)carbamoil]pentanodioico');

  // `ácido 3-carbamoilpropanoico`: the carbamoyl's C=O carbon on the chain's end, which the engine takes into the chain — a
  // deliberate null of diagnose.js «Amides» until phase I-52d4, now AMIDE_IN_CHAIN: drawn and named, the diagnosis between the
  // verdict's two sentences.
  dialog = await buildName(page, 'ácido', '3', 'carbamoil', 'prop', 'ano', 'oico');
  await expect(line).toHaveText('ácido 3-carbamoilpropanoico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'AMIDE_IN_CHAIN');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama «ácido '
    + '4-amino-4-oxobutanoico».');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('El prefijo «carbamoil» está en el extremo de la cadena, y el carbono '
    + 'de su C=O la alarga: la cadena principal tiene 4 carbonos. Con ese carbono en la cadena, la amida ya no se nombra «carbamoil», '
    + 'sino con dos prefijos con el mismo número: «oxo» para su C=O y «amino» para su nitrógeno, con los grupos unidos a él. Se escribe '
    + '«ácido 4-amino-4-oxobutanoico».');
  await expect(page.locator('#result-name')).toHaveText('ácido 4-amino-4-oxobutanoico');
  expect(errors).toEqual([]);
}); // End of test 'acylamino prefixes…'

test('a locant on the carbamoyl nitrogen\'s groups, a third group and an acyl group on it stay in the dialog, canvas untouched', async ({ page }) => {
  const errors = await openApp(page);
  // Something on the canvas first, which a failure must keep.
  let dialog = await buildName(page, 'ácido', '3', 'carbamoil', 'pent', 'ano', 'di', 'oico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#result-name')).toHaveText('ácido 3-carbamoilpentanodioico');

  // `ácido 3-(1-metilcarbamoil)pentanodioico`: the groups on the nitrogen take no locants.
  dialog = await buildName(page, 'ácido', '3', 'empieza rama compuesta', '1', 'met', 'il', 'carbamoil', 'acaba rama', 'pent', 'ano', 'di',
    'oico');
  await expect(page.locator('#name-builder-name')).toHaveText('ácido 3-(1-metilcarbamoil)pentanodioico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('Esta ficha no puede ir aquí: los grupos unidos al nitrógeno de «carbamoil» van delante de '
    + '«carbamoil», sin números ni letras: (metilcarbamoil), (dimetilcarbamoil), [etil(metil)carbamoil]. Si un grupo lleva sus propias '
    + 'ramas, va en su propia rama compuesta, con sus números dentro: [(2-cloroetil)carbamoil].');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([3]);
  await expect(dialog).toBeVisible();

  // `ácido 3-(trimetilcarbamoil)pentanodioico`: the amide's nitrogen holds three bonds; the group that adds the fourth is marked.
  const rows = page.locator('#name-builder-rows');
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  for (const text of ['ácido', '3', 'empieza rama compuesta', 'tri', 'met', 'il', 'carbamoil', 'acaba rama', 'pent', 'ano', 'di', 'oico']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await expect(page.locator('#name-builder-name')).toHaveText('ácido 3-(trimetilcarbamoil)pentanodioico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('El nitrógeno del grupo carbamoil tendría 4 enlaces, y un nitrógeno solo puede tener 3.');
  expect(await invalidTiles(page)).toEqual([3, 4, 5]);
  await expect(dialog).toBeVisible();

  // `ácido 3-(acetilcarbamoil)pentanodioico`: a second C=O group on the amide's nitrogen makes an imide, out of scope.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  for (const text of ['ácido', '3', 'empieza rama compuesta', 'acetil', 'carbamoil', 'acaba rama', 'pent', 'ano', 'di', 'oico']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await expect(page.locator('#name-builder-name')).toHaveText('ácido 3-(acetilcarbamoil)pentanodioico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toContainText('Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar: Esta molécula tiene un '
    + 'nitrógeno unido a dos grupos C=O (–CO–NH–CO–).');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  // The canvas keeps ácido 3-carbamoilpentanodioico.
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'N', 'O', 'O', 'O', 'O', 'O']);
  await expect(page.locator('#result-name')).toHaveText('ácido 3-carbamoilpentanodioico');
  expect(errors).toEqual([]);
}); // End of test 'a locant on the carbamoyl nitrogen\'s groups…'
