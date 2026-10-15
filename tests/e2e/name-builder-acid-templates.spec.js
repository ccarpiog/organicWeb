/**
 * @file «¿Cómo se dibuja?» with the retained acid names e2e (design.md
 * §13.4 I-33, I-40b, §14.5, §15.2, §15.8 R-5d; phase I-51d2, R-5d2): the
 * «Nombres tradicionales» row offers `fórmico`, `acético`, `oxálico`,
 * `fenilacético`, `ftálico`, `isoftálico` and `tereftálico`, each with a
 * tooltip; the tiles `ácido acético` build `ácido acético`, and «Dibujar»
 * puts ethanoic acid on the canvas — one undoable edit, centred and ordered —
 * with «¡Correcto!… es una forma válida» above «Se llama: ácido etanoico»;
 * `ácido 4-metilftálico`, which the engine writes too, draws its benzene
 * dicarboxylic acid; a substituted `ácido 2-cloroacético` draws its molecule
 * with the app's name and why; `acético` without `ácido` is refused with the
 * template's tile marked, the canvas untouched; the Ayuda section «Del nombre
 * al dibujo» has its acid line. Runs on the dev server and on dist
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
 * The bonds of each oxygen of a drawn molecule: its neighbour's element and
 * the bond order (the =O of a –COOH is `C2`, its OH `C1`), the oxygens
 * sorted.
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
 * The ring positions of the –COOH groups seen from each other, as the number
 * of ring bonds between the ring carbons that carry them (1 orto, 2 meta,
 * 3 para), sorted. A –COOH carbon is a carbon double-bonded to an oxygen; a
 * ring carbon is a carbon, not a –COOH one, with at least two such carbon
 * neighbours.
 *
 * @param {object} json - moleculeToJSON() output of a benzene ring with –COOH groups.
 * @returns {number[]} The distances, one per pair of –COOH groups.
 */
function carboxylDistances(json) {
  const element = new Map(json.atoms.map((atom) => [atom.id, atom.element]));
  const neighbours = (id) => json.bonds.filter((b) => b.a === id || b.b === id).map((b) => (b.a === id ? b.b : b.a));
  const carboxyls = json.bonds.filter((b) => b.order === 2 && [b.a, b.b].some((id) => element.get(id) === 'O'))
    .map((b) => (element.get(b.a) === 'O' ? b.b : b.a));
  const ringCarbons = carboxyls.map((carbon) => neighbours(carbon).find((n) => element.get(n) === 'C'));
  const inRing = new Set(json.atoms.filter((atom) => atom.element === 'C' && !carboxyls.includes(atom.id)
    && neighbours(atom.id).filter((n) => element.get(n) === 'C' && !carboxyls.includes(n)).length >= 2).map((atom) => atom.id));
  const distances = [];
  for (let i = 0; i < ringCarbons.length; i += 1) {
    for (let j = i + 1; j < ringCarbons.length; j += 1) {
      // Breadth-first over the ring carbons only.
      const seen = new Map([[ringCarbons[i], 0]]);
      const queue = [ringCarbons[i]];
      while (queue.length > 0) {
        const at = queue.shift();
        for (const next of neighbours(at).filter((n) => inRing.has(n) && !seen.has(n))) {
          seen.set(next, seen.get(at) + 1);
          queue.push(next);
        }
      } // End of the breadth-first loop
      distances.push(seen.get(ringCarbons[j]));
    }
  } // End of the loop over the pairs of –COOH groups
  return distances.sort();
} // End of function carboxylDistances()

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

test('«Nombres tradicionales»: the acid tiles; `ácido acético` draws ethanoic acid, a valid form; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const traditional = dialog.getByRole('group', { name: 'Nombres tradicionales' });
  for (const [id, text, hint] of [['template-formicAcid', 'fórmico', /ácido metanoico/],
    ['template-aceticAcid', 'acético', /ácido etanoico/], ['template-oxalicAcid', 'oxálico', /ácido etanodioico/],
    ['template-phenylaceticAcid', 'fenilacético', /ácido 2-feniletanoico/],
    ['template-phthalicAcid', 'ftálico', /ácido benceno-1,2-dicarboxílico/],
    ['template-isophthalicAcid', 'isoftálico', /ácido benceno-1,3-dicarboxílico/],
    ['template-terephthalicAcid', 'tereftálico', /ácido benceno-1,4-dicarboxílico/]]) {
    const tile = traditional.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveText(text);
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAccessibleName(text);
    await expect(tile).toHaveAttribute('title', hint);
    await expect(tile).toHaveAttribute('title', /Va detrás de «ácido»/);
  }
  await page.keyboard.press('Escape');

  await buildName(page, 'ácido', 'acético');
  const line = page.locator('#name-builder-name');
  await expect(line).toHaveText('ácido acético');
  await expect(line.locator('.part-ending')).toHaveText('ácido');
  await expect(line.locator('.part-stem')).toHaveText('acético');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // Ethanoic acid on the canvas: two carbons, the =O and the OH on one of them; whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'O', 'O']);
  expect(drawn.bonds).toHaveLength(3);
  expect(oxygenBonds(drawn)).toEqual(['C1', 'C2']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: ácido acético');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «ácido acético» es una forma válida (nombre tradicional, '
    + 'que la IUPAC (2013) conserva como preferido). El nombre que doy primero es «ácido etanoico».');
  await expect(page.locator('#result-name')).toHaveText('ácido etanoico');
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test '«Nombres tradicionales»: the acid tiles…'

test('`ácido 4-metilftálico` draws its benzene dicarboxylic acid; `ácido 2-cloroacético` its molecule and why', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  // A ftálico with a branch on its ring: the engine writes it too, so it is a valid form.
  let dialog = await buildName(page, 'ácido', '4', 'met', 'il', 'ftálico');
  await expect(page.locator('#name-builder-name')).toHaveText('ácido 4-metilftálico');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «ácido 4-metilftálico» es una forma válida (nombre '
    + 'tradicional, que la IUPAC (2013) acepta). El nombre que doy primero es «ácido 4-metilbenceno-1,2-dicarboxílico».');
  await expect(page.locator('#result-name')).toHaveText('ácido 4-metilbenceno-1,2-dicarboxílico');
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'O', 'O', 'O', 'O']);
  expect(oxygenBonds(drawn)).toEqual(['C1', 'C1', 'C2', 'C2']);
  expect(carboxylDistances(drawn)).toEqual([1]); // The two –COOH groups in orto (1,2).
  expect(await drawingInsideCanvas(page)).toBe(true);

  // A substituted chain template, which the app never writes: the molecule it describes, named by the app, and why.
  dialog = await buildName(page, 'ácido', '2', 'cloro', 'acético');
  await expect(page.locator('#name-builder-name')).toHaveText('ácido 2-cloroacético');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«ácido 2-cloroetanoico».');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'SUBSTITUTED_TEMPLATE');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('El nombre tradicional «ácido acético» no admite sustituyentes: con '
    + 'más grupos, la molécula se nombra con su nombre sistemático: «ácido 2-cloroetanoico».');
  await expect(page.locator('#result-name')).toHaveText('ácido 2-cloroetanoico');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'Cl', 'O', 'O']);
  expect(await drawingInsideCanvas(page)).toBe(true);
  expect(errors).toEqual([]);
}); // End of test '`ácido 4-metilftálico`…'

test('`acético` without `ácido` is refused with its tile marked; the Ayuda line of acids', async ({ page }) => {
  const errors = await openApp(page);
  const dialog = await buildName(page, 'acético');
  await expect(page.locator('#name-builder-name')).toHaveText('acético');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('El nombre de un ácido empieza por la palabra «ácido»: pon esa ficha al principio, como en ácido '
    + 'acético.');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([0]);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);

  // Ayuda, «Del nombre al dibujo»: acids are read; their tiles and the retained names.
  await page.getByRole('button', { name: 'Ayuda' }).click();
  const help = page.getByRole('dialog', { name: 'Cómo se usa' });
  await expect(help.locator('#help-name-to-drawing')).toContainText('y de sus ácidos carboxílicos');
  const line = help.locator('#help-name-to-drawing-acids');
  for (const phrase of ['empieza por la palabra «ácido»', '«oico» va al final', 'ácido butanoico', '«carboxílico»',
    'ácido benzoico', '«carboxi»', 'el fórmico, el acético, el oxálico, el fenilacético y los ftálicos', 'ácido acético',
    'ácido 4-metilftálico', 'ácido 2-(3-metilfenil)acético']) {
    await expect(line).toContainText(phrase);
  }
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
}); // End of test '`acético` without `ácido`…'
