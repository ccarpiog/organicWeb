/**
 * @file «¿Cómo se dibuja?» with the retained ester names e2e (design.md
 * §13.4 I-35, I-40d, I-45c, §15.2, §15.8 R-6a; phase I-52a2a, R-6a2a): the
 * «Nombres tradicionales» row offers `formiato`, `acetato` and
 * `fenilacetato`, each with a tooltip; the tiles `acetato et ilo` build
 * `acetato de etilo` (the ` de ` the app's) and «Dibujar» puts ethyl ethanoate
 * on the canvas — one undoable edit, centred and ordered — with «¡Correcto!…
 * es una forma válida» above «Se llama: etanoato de etilo»; the aryl-acetate
 * the engine writes too, `2-(4-metilfenil)acetato de etilo`, draws its
 * molecule; a substituted `2-cloroacetato de metilo` draws its molecule with
 * the app's name and why; `acetato` without its O-bound group is refused with
 * the template's tile marked, the canvas untouched; the Ayuda section «Del
 * nombre al dibujo» has its ester line. Runs on the dev server and on dist
 * (playwright.config.js).
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
 * the bond orders (the =O of a –COO– is `C2`, its bridge oxygen `C1 C1`), the
 * oxygens sorted.
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

test('«Nombres tradicionales»: the ester tiles; `acetato et ilo` draws ethyl ethanoate, a valid form; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const traditional = dialog.getByRole('group', { name: 'Nombres tradicionales' });
  for (const [id, text, hint] of [['template-formate', 'formiato', /metanoato\. .*formiato de metilo/],
    ['template-acetate', 'acetato', /etanoato\. .*acetato de etilo/], ['template-phenylacetate', 'fenilacetato', /2-feniletanoato/]]) {
    const tile = traditional.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveText(text);
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAccessibleName(text);
    await expect(tile).toHaveAttribute('title', hint);
    await expect(tile).toHaveAttribute('title', /Detrás va el grupo unido al oxígeno/);
  }
  await page.keyboard.press('Escape');

  await buildName(page, 'acetato', 'et', 'ilo');
  const line = page.locator('#name-builder-name');
  await expect(line).toHaveText('acetato de etilo');
  await expect(line.locator('.part-stem')).toHaveText('acetato');
  await expect(line.locator('.part-prefix')).toHaveText(['et', 'ilo']);
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // Ethyl ethanoate on the canvas: four carbons, the =O of the –COO– and its bridge oxygen bonded to the ethyl; whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'O', 'O']);
  expect(drawn.bonds).toHaveLength(5);
  expect(oxygenBonds(drawn)).toEqual(['C1 C1', 'C2']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: acetato de etilo');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «acetato de etilo» es una forma válida (nombre tradicional, '
    + 'que la IUPAC (2013) conserva como preferido). El nombre que doy primero es «etanoato de etilo».');
  await expect(page.locator('#result-name')).toHaveText('etanoato de etilo');
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test '«Nombres tradicionales»: the ester tiles…'

test('`2-(4-metilfenil)acetato de etilo` draws its aryl-acetate; `2-cloroacetato de metilo` its molecule and why', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  // A substituted phenyl on carbon 2 of `acetato`: the engine writes it too, so it is a valid form.
  let dialog = await buildName(page, '2', 'empieza rama compuesta', '4', 'met', 'il', 'fenil', 'acaba rama', 'acetato', 'et', 'ilo');
  await expect(page.locator('#name-builder-name')).toHaveText('2-(4-metilfenil)acetato de etilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «2-(4-metilfenil)acetato de etilo» es una forma válida '
    + '(nombre tradicional, que la IUPAC (2013) acepta). El nombre que doy primero es «2-(4-metilfenil)etanoato de etilo».');
  await expect(page.locator('#result-name')).toHaveText('2-(4-metilfenil)etanoato de etilo');
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'O', 'O']);
  expect(drawn.bonds.filter((bond) => bond.order === 2)).toHaveLength(4); // The ring's three and the C=O.
  expect(oxygenBonds(drawn)).toEqual(['C1 C1', 'C2']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // A substituted retained ester word, which the app never writes: the molecule it describes, named by the app, and why.
  dialog = await buildName(page, '2', 'cloro', 'acetato', 'met', 'ilo');
  await expect(page.locator('#name-builder-name')).toHaveText('2-cloroacetato de metilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«2-cloroetanoato de metilo».');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'SUBSTITUTED_TEMPLATE');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('El nombre tradicional «acetato» no admite sustituyentes: con más '
    + 'grupos, la molécula se nombra con su nombre sistemático: «2-cloroetanoato de metilo».');
  await expect(page.locator('#result-name')).toHaveText('2-cloroetanoato de metilo');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'Cl', 'O', 'O']);
  expect(await drawingInsideCanvas(page)).toBe(true);
  expect(errors).toEqual([]);
}); // End of test '`2-(4-metilfenil)acetato de etilo`…'

test('`acetato` without its O-bound group is refused with its tile marked; the Ayuda line of esters', async ({ page }) => {
  const errors = await openApp(page);
  const dialog = await buildName(page, 'acetato');
  await expect(page.locator('#name-builder-name')).toHaveText('acetato');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('Detrás de «acetato» va el grupo unido al oxígeno del éster, acabado en «ilo» (la palabra «de» la '
    + 'pone la app): acetato, met e ilo dan acetato de metilo.');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([0]);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);

  // Ayuda, «Del nombre al dibujo»: esters are read; their tiles, the automatic words and the retained names.
  await page.getByRole('button', { name: 'Ayuda' }).click();
  const help = page.getByRole('dialog', { name: 'Cómo se usa' });
  await expect(help.locator('#help-name-to-drawing')).toContainText('ácidos carboxílicos, ésteres');
  const line = help.locator('#help-name-to-drawing-esters');
  for (const phrase of ['Ésteres.', 'la parte ácida', 'el grupo unido al oxígeno', '«oato»', '«carboxilato»',
    'ciclohexanocarboxilato de etilo', 'el benzoato', 'acaba en «ilo»', 'etanoato de metilo', 'La palabra «de» la pongo yo',
    'la «y» entre dos grupos distintos', 'propanodioato de etilo y metilo', 'butanodioato de dimetilo',
    'el formiato, el acetato y el fenilacetato', 'acetato de etilo', '2-(4-metilfenil)acetato de etilo']) {
    await expect(line).toContainText(phrase);
  }
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
}); // End of test '`acetato` without its O-bound group…'
