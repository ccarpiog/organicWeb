/**
 * @file «¿Cómo se dibuja?» with the retained carbonyl templates e2e
 * (design.md §13.4 I-32, I-40a, I-40b, §14.5, §15.2, §15.8 R-5c; phase
 * I-51c3a, R-5c3a): the «Nombres tradicionales» row offers `formaldehído`,
 * `acetaldehído`, `acetona`, `acetofenona`, `fenilacetaldehído`,
 * `ftalaldehído`, `isoftalaldehído` and `tereftalaldehído`, each with a
 * tooltip; the tile `acetona` builds `acetona`, and «Dibujar» puts propanone
 * on the canvas — one undoable edit, centred and ordered — with «¡Correcto!…
 * es una forma válida» above «Se llama: propanona»; `ftalaldehído` draws
 * benzene-1,2-dicarbaldehyde and `4-metilftalaldehído`, which the engine
 * writes too, its methyl derivative; a substituted `1-cloroacetona` draws its
 * molecule with the app's name and why; `1-acetona` is refused with the
 * number marked, the canvas untouched; the Ayuda section «Del nombre al
 * dibujo» has its aldehyde and ketone line. Runs on the dev server and on
 * dist (playwright.config.js).
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
 * The ring positions of the –CHO groups seen from each other, as the number
 * of ring bonds between the ring carbons that carry them (1 orto, 2 meta,
 * 3 para), sorted. A ring carbon is a carbon of the drawn ring (a carbon with
 * two carbon neighbours in the ring); a –CHO carbon is a carbon double-bonded
 * to an oxygen.
 *
 * @param {object} json - moleculeToJSON() output of a benzene ring with –CHO groups.
 * @returns {number[]} The distances, one per pair of –CHO groups.
 */
function formylDistances(json) {
  const element = new Map(json.atoms.map((atom) => [atom.id, atom.element]));
  const neighbours = (id) => json.bonds.filter((b) => b.a === id || b.b === id).map((b) => (b.a === id ? b.b : b.a));
  const formyls = json.bonds.filter((b) => b.order === 2 && [b.a, b.b].some((id) => element.get(id) === 'O'))
    .map((b) => (element.get(b.a) === 'O' ? b.b : b.a));
  const ringCarbons = formyls.map((carbon) => neighbours(carbon).find((n) => element.get(n) === 'C'));
  const inRing = new Set(json.atoms.filter((atom) => atom.element === 'C' && !formyls.includes(atom.id)
    && neighbours(atom.id).filter((n) => element.get(n) === 'C' && !formyls.includes(n)).length >= 2).map((atom) => atom.id));
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
  } // End of the loop over the pairs of –CHO groups
  return distances.sort();
} // End of function formylDistances()

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

test('«Nombres tradicionales»: the carbonyl tiles; `acetona` draws propanona, a valid form; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const traditional = dialog.getByRole('group', { name: 'Nombres tradicionales' });
  for (const [id, text, hint] of [['template-formaldehyde', 'formaldehído', /metanal/],
    ['template-acetaldehyde', 'acetaldehído', /etanal/], ['template-acetone', 'acetona', /propanona/],
    ['template-acetophenone', 'acetofenona', /1-feniletan-1-ona/], ['template-phenylacetaldehyde', 'fenilacetaldehído', /2-feniletanal/],
    ['template-phthalaldehyde', 'ftalaldehído', /benceno-1,2-dicarbaldehído/],
    ['template-isophthalaldehyde', 'isoftalaldehído', /benceno-1,3-dicarbaldehído/],
    ['template-terephthalaldehyde', 'tereftalaldehído', /benceno-1,4-dicarbaldehído/]]) {
    const tile = traditional.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveText(text);
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAccessibleName(text);
    await expect(tile).toHaveAttribute('title', hint);
  }
  await page.keyboard.press('Escape');

  await buildName(page, 'acetona');
  await expect(page.locator('#name-builder-name')).toHaveText('acetona');
  await expect(page.locator('#name-builder-name .part-stem')).toHaveText('acetona');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // Propanone on the canvas: three carbons, the middle one double-bonded to the oxygen; whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'O']);
  expect(drawn.bonds).toHaveLength(3);
  const element = new Map(drawn.atoms.map((atom) => [atom.id, atom.element]));
  const double = drawn.bonds.filter((bond) => bond.order === 2);
  expect(double).toHaveLength(1);
  const carbonyl = element.get(double[0].a) === 'O' ? double[0].b : double[0].a;
  expect(drawn.bonds.filter((bond) => bond.a === carbonyl || bond.b === carbonyl)).toHaveLength(3); // Two carbons and the O.
  expect(await drawingInsideCanvas(page)).toBe(true);

  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: acetona');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «acetona» es una forma válida (nombre tradicional, '
    + 'que la IUPAC (2013) acepta). El nombre que doy primero es «propanona».');
  await expect(page.locator('#result-name')).toHaveText('propanona');
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test '«Nombres tradicionales»: the carbonyl tiles…'

test('`ftalaldehído` and `4-metilftalaldehído` draw their benzene dicarbaldehydes; `1-cloroacetona` its molecule and why', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  let dialog = await buildName(page, 'ftalaldehído');
  await expect(page.locator('#name-builder-name')).toHaveText('ftalaldehído');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «ftalaldehído» es una forma válida (nombre tradicional, '
    + 'que la IUPAC (2013) acepta). El nombre que doy primero es «benceno-1,2-dicarbaldehído».');
  await expect(page.locator('#result-name')).toHaveText('benceno-1,2-dicarbaldehído');
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'O', 'O']);
  expect(drawn.bonds).toHaveLength(10);
  expect(formylDistances(drawn)).toEqual([1]); // The two –CHO groups in orto (1,2).
  expect(await drawingInsideCanvas(page)).toBe(true);

  // A ftalaldehído with a branch on its ring: the engine writes it too, so it is a valid form.
  dialog = await buildName(page, '4', 'met', 'il', 'ftalaldehído');
  await expect(page.locator('#name-builder-name')).toHaveText('4-metilftalaldehído');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(page.locator('#result-name')).toHaveText('4-metilbenceno-1,2-dicarbaldehído');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'O', 'O']);
  expect(formylDistances(drawn)).toEqual([1]);

  // A substituted chain template, which the app never writes: the molecule it describes, named by the app, and why.
  dialog = await buildName(page, '1', 'cloro', 'acetona');
  await expect(page.locator('#name-builder-name')).toHaveText('1-cloroacetona');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«1-cloropropan-2-ona».');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'SUBSTITUTED_TEMPLATE');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('El nombre tradicional «acetona» no admite sustituyentes: con más '
    + 'grupos, la molécula se nombra con su nombre sistemático: «1-cloropropan-2-ona».');
  await expect(page.locator('#result-name')).toHaveText('1-cloropropan-2-ona');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'Cl', 'O']);
  expect(await drawingInsideCanvas(page)).toBe(true);
  expect(errors).toEqual([]);
}); // End of test '`ftalaldehído` and `4-metilftalaldehído`…'

test('`1-acetona` is refused with the number marked; the Ayuda line of aldehydes and ketones', async ({ page }) => {
  const errors = await openApp(page);
  const dialog = await buildName(page, '1', 'acetona');
  await expect(page.locator('#name-builder-name')).toHaveText('1-acetona');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('«acetona» ya dice dónde va su grupo C=O, en el carbono 2: no lleva números ni letras propios.');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([0]);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);

  // Ayuda, «Del nombre al dibujo»: aldehydes and ketones are read; their tiles and the retained names.
  await page.getByRole('button', { name: 'Ayuda' }).click();
  const help = page.getByRole('dialog', { name: 'Cómo se usa' });
  await expect(help.locator('#help-name-to-drawing')).toContainText('éteres, aldehídos y cetonas');
  const line = help.locator('#help-name-to-drawing-carbonyls');
  for (const phrase of ['«al» va al final', 'butanal', 'pentan-2-ona', '«carbaldehído»', '«oxo»', '«formil»', '«acetil»', '«oil»',
    '«carbonil»', '«benzoil»', 'el formaldehído, el acetaldehído, la acetona, la acetofenona, el fenilacetaldehído y los '
    + 'ftalaldehídos', '4-metilftalaldehído', '2-(4-metilfenil)acetaldehído']) {
    await expect(line).toContainText(phrase);
  }
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
}); // End of test '`1-acetona` is refused…'
