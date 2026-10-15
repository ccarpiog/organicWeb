/**
 * @file «¿Cómo se dibuja?» with the ester prefixes e2e (design.md §13.4
 * I-39c, I-40d, §15.2, §15.5.2, §15.8 R-6a; phase I-52a2b, R-6a2b): an ester
 * that is not the principal group, written as a prefix from the tiles that
 * exist — the «Grupos» row's `oxi` after an acyl branch (`acetil oxi` →
 * `(acetiloxi)`) and `carbonil` after `oxi` (`met il oxi carbonil` →
 * `(metoxicarbonil)`), both before the END of a compound branch
 * (`[(2-metilpropanoil)oxi]`); their tooltips say so; «Dibujar» puts the
 * acid on the canvas — one undoable edit, whole and in view — with the
 * verdict above «Se llama:» (`correct`, and the IUPAC-preferred
 * `[(propan-2-iloxi)carbonil]` an `alternative`); an alkoxycarbonyl prefix
 * whose C=O carbon the app puts in the chain draws its molecule with the
 * app's name and, since phase I-52a3a, its diagnosis (ESTER_IN_CHAIN, a
 * deliberate «Esters» null until then); `carbonil` after an acyloxy prefix is refused with its tile
 * marked, the canvas untouched; the Ayuda ester paragraph has its prefix
 * sentence. Runs on the dev server and on dist (playwright.config.js).
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
 * The bonds of each oxygen of a drawn molecule: its neighbours' elements and
 * the bond orders (an ether or bridge oxygen `C1 C1`, a C=O `C2`, an OH
 * `C1`), the oxygens sorted.
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

test('`ácido 2-(acetiloxi)etanoico` from `acetil` and `oxi`: drawn, correct; the tooltips of `oxi` and `carbonil`', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const groups = page.getByRole('dialog', { name: '¿Cómo se dibuja?' }).getByRole('group', { name: 'Grupos' });
  await expect(groups.locator('[data-tile="group-alkoxy"]')).toHaveAttribute('title', /acetil y oxi dan \(acetiloxi\)\.$/);
  await expect(groups.locator('[data-tile="acyl-ring"]')).toHaveAttribute('title', /met, il, oxi y carbonil dan \(metoxicarbonil\)\.$/);
  await page.keyboard.press('Escape');

  const dialog = await buildName(page, 'ácido', '2', 'acetil', 'oxi', 'et', 'ano', 'oico');
  const line = page.locator('#name-builder-name');
  await expect(line).toHaveText('ácido 2-(acetiloxi)etanoico');
  await expect(line.locator('.part-prefix')).toHaveText(['acetil', 'oxi']);
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // Acetyloxyethanoic acid: four carbons; the acid's =O and OH, the ester's =O and its oxygen between two carbons.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'O', 'O', 'O', 'O']);
  expect(oxygenBonds(drawn)).toEqual(['C1', 'C1 C1', 'C2', 'C2']);
  expect(await drawingInsideCanvas(page)).toBe(true);
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto!');
  await expect(page.locator('#result-name')).toHaveText('ácido 2-(acetiloxi)etanoico');

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test '`ácido 2-(acetiloxi)etanoico`…'

test('`(metoxicarbonil)` from `met il oxi carbonil`, `[(2-metilpropanoil)oxi]` in a compound branch, `[(propan-2-iloxi)carbonil]`', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  const line = page.locator('#name-builder-name');
  // An alkoxycarbonyl prefix: `carbonil` after `oxi`; the `il` of `met il` writes nothing (`metoxi`).
  let dialog = await buildName(page, 'ácido', '3', 'met', 'il', 'oxi', 'carbonil', 'pent', 'ano', 'di', 'oico');
  await expect(line).toHaveText('ácido 3-(metoxicarbonil)pentanodioico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('ácido 3-(metoxicarbonil)pentanodioico');
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'O', 'O', 'O', 'O', 'O', 'O']);
  expect(oxygenBonds(drawn)).toEqual(['C1', 'C1', 'C1 C1', 'C2', 'C2', 'C2']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // An acyloxy prefix with branches of its own: `oxi` inside the compound branch, before closing it; the inner marks are the app's.
  dialog = await buildName(page, 'ácido', '2', 'empieza rama compuesta', '2', 'met', 'il', 'prop', 'ano', 'oil', 'oxi', 'acaba rama', 'et',
    'ano', 'oico');
  await expect(line).toHaveText('ácido 2-[(2-metilpropanoil)oxi]etanoico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('ácido 2-[(2-metilpropanoil)oxi]etanoico');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'O', 'O', 'O', 'O']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The IUPAC-preferred form of the alkoxy part: a valid form, the app's first name in the default style.
  dialog = await buildName(page, 'ácido', '3', 'prop', 'ano', '2', 'il', 'oxi', 'carbonil', 'pent', 'ano', 'di', 'oico');
  await expect(line).toHaveText('ácido 3-[(propan-2-iloxi)carbonil]pentanodioico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «ácido 3-[(propan-2-iloxi)carbonil]pentanodioico» es una '
    + 'forma válida (nombre preferido por la IUPAC (2013)). El nombre que doy primero es «ácido 3-(isopropoxicarbonil)pentanodioico».');
  await expect(page.locator('#result-name')).toHaveText('ácido 3-(isopropoxicarbonil)pentanodioico');
  expect(errors).toEqual([]);
}); // End of test '`(metoxicarbonil)`…'

test('an ester carbon the app puts in the chain: drawn, with its diagnosis; `acetil oxi carbonil` refused; the Ayuda sentence', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  // The C=O carbon of the prefix lengthens the chain: the app writes the ester with `metoxi` and `oxo`, and says why (I-52a3a).
  let dialog = await buildName(page, 'ácido', '3', 'met', 'il', 'oxi', 'carbonil', 'prop', 'ano', 'oico');
  await expect(page.locator('#name-builder-name')).toHaveText('ácido 3-(metoxicarbonil)propanoico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'ESTER_IN_CHAIN');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«ácido 4-metoxi-4-oxobutanoico».');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('El prefijo «metoxicarbonil» está en el extremo de la cadena, y el '
    + 'carbono de su C=O la alarga: la cadena principal tiene 4 carbonos. Con ese carbono en la cadena, el éster ya no se nombra '
    + '«metoxicarbonil», sino con dos prefijos con el mismo número: «oxo» para su C=O y uno acabado en «-oxi» para su oxígeno del '
    + 'medio con el grupo unido a él. Se escribe «ácido 4-metoxi-4-oxobutanoico».');
  await expect(page.locator('#result-name')).toHaveText('ácido 4-metoxi-4-oxobutanoico');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'C', 'C', 'O', 'O', 'O', 'O']);

  // `carbonil` after an acyloxy prefix: the oxygen between two C=O groups; its tile marked, nothing drawn.
  const before = await moleculeJSON(page);
  dialog = await buildName(page, 'ácido', '2', 'acetil', 'oxi', 'carbonil', 'et', 'ano', 'oico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('Esta ficha no puede ir aquí: «carbonil» no va detrás de «acetil» y «oxi»: el oxígeno quedaría '
    + 'entre dos grupos C=O, y eso no es un éster. Un éster como rama es (acetiloxi) o (metoxicarbonil).');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([4]);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await moleculeJSON(page)).toEqual(before);

  // Ayuda, «Del nombre al dibujo»: the ester paragraph says how to write an ester prefix.
  await page.getByRole('button', { name: 'Ayuda' }).click();
  const help = page.getByRole('dialog', { name: 'Cómo se usa' });
  const paragraph = help.locator('#help-name-to-drawing-esters');
  for (const phrase of ['Un éster que no es el grupo principal (junto a un ácido) se escribe como prefijo', '«oxi» detrás de una rama '
    + 'con un C=O', 'acetil y oxi dan acetiloxi', 'ácido 2-(acetiloxi)etanoico', '«carbonil» detrás de «oxi»',
  'met, il, oxi y carbonil dan metoxicarbonil', 'antes de cerrarla: [(2-metilpropanoil)oxi]']) {
    await expect(paragraph).toContainText(phrase);
  }
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
}); // End of test 'an ester carbon the app puts in the chain…'
