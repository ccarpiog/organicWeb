/**
 * @file «¿Cómo se dibuja?» with the retained nitrile names e2e (design.md
 * §13.4 I-38, I-40c, §14.5, §15.2, §15.8 R-6b; phase I-52b2, R-6b2): the
 * «Nombres tradicionales» row offers `acetonitrilo`, `fenilacetonitrilo` and
 * `ftalonitrilo`, each with a tooltip; the tile `acetonitrilo` builds
 * `acetonitrilo`, and «Dibujar» puts etanonitrilo on the canvas — its –C≡N a
 * carbon and a nitrogen joined by a triple bond, one undoable edit, centred
 * and ordered — with «¡Correcto!… es una forma válida» above «Se llama:
 * etanonitrilo»; `ftalonitrilo` draws benzene-1,2-dicarbonitrile, and
 * `4-metilftalonitrilo` and `2-(4-metilfenil)acetonitrilo`, which the engine
 * writes too, their molecules; a substituted `2-cloroacetonitrilo` draws its
 * molecule with the app's name and why; `1-acetonitrilo` is refused with the
 * number marked, the canvas untouched; the Ayuda section «Del nombre al
 * dibujo» has its nitrile line. Runs on the dev server and on dist
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
 * The bonds of each nitrogen of a drawn molecule: its neighbour's element and
 * the bond order (the N of a –C≡N is `C3`), the nitrogens sorted.
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
 * The ring positions of the –C≡N groups seen from each other, as the number
 * of ring bonds between the ring carbons that carry them (1 orto, 2 meta, 3
 * para), sorted. A –C≡N carbon is a carbon triple-bonded to a nitrogen; a
 * ring carbon is a carbon with two carbon neighbours that are no –C≡N
 * carbons.
 *
 * @param {object} json - moleculeToJSON() output of a benzene ring with –C≡N groups.
 * @returns {number[]} The distances, one per pair of –C≡N groups.
 */
function cyanoDistances(json) {
  const element = new Map(json.atoms.map((atom) => [atom.id, atom.element]));
  const neighbours = (id) => json.bonds.filter((b) => b.a === id || b.b === id).map((b) => (b.a === id ? b.b : b.a));
  const cyanos = json.bonds.filter((b) => b.order === 3 && [b.a, b.b].some((id) => element.get(id) === 'N'))
    .map((b) => (element.get(b.a) === 'N' ? b.b : b.a));
  const ringCarbons = cyanos.map((carbon) => neighbours(carbon).find((n) => element.get(n) === 'C'));
  const inRing = new Set(json.atoms.filter((atom) => atom.element === 'C' && !cyanos.includes(atom.id)
    && neighbours(atom.id).filter((n) => element.get(n) === 'C' && !cyanos.includes(n)).length >= 2).map((atom) => atom.id));
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
  } // End of the loop over the pairs of –C≡N groups
  return distances.sort();
} // End of function cyanoDistances()

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

test('«Nombres tradicionales»: the nitrile tiles; `acetonitrilo` draws etanonitrilo, a valid form; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const traditional = dialog.getByRole('group', { name: 'Nombres tradicionales' });
  for (const [id, text, hint] of [['template-acetonitrile', 'acetonitrilo', /etanonitrilo\. .*2-\(4-metilfenil\)acetonitrilo/],
    ['template-phenylacetonitrile', 'fenilacetonitrilo', /2-feniletanonitrilo/],
    ['template-phthalonitrile', 'ftalonitrilo', /benceno-1,2-dicarbonitrilo\. .*4-metilftalonitrilo/]]) {
    const tile = traditional.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveText(text);
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAccessibleName(text);
    await expect(tile).toHaveAttribute('title', hint);
  }
  await page.keyboard.press('Escape');

  await buildName(page, 'acetonitrilo');
  await expect(page.locator('#name-builder-name')).toHaveText('acetonitrilo');
  await expect(page.locator('#name-builder-name .part-stem')).toHaveText('acetonitrilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // Etanonitrilo on the canvas: two carbons, the –C≡N's carbon triple-bonded to the nitrogen; whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'N']);
  expect(drawn.bonds).toHaveLength(2);
  expect(nitrogenBonds(drawn)).toEqual(['C3']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: acetonitrilo');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «acetonitrilo» es una forma válida (nombre tradicional, '
    + 'que la IUPAC (2013) conserva como preferido). El nombre que doy primero es «etanonitrilo».');
  await expect(page.locator('#result-name')).toHaveText('etanonitrilo');
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test '«Nombres tradicionales»: the nitrile tiles…'

test('`ftalonitrilo`, `4-metilftalonitrilo` and `2-(4-metilfenil)acetonitrilo` draw their molecules; `2-cloroacetonitrilo` its molecule and why', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  let dialog = await buildName(page, 'ftalonitrilo');
  await expect(page.locator('#name-builder-name')).toHaveText('ftalonitrilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «ftalonitrilo» es una forma válida (nombre tradicional, '
    + 'que la IUPAC (2013) acepta). El nombre que doy primero es «benceno-1,2-dicarbonitrilo».');
  await expect(page.locator('#result-name')).toHaveText('benceno-1,2-dicarbonitrilo');
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'N', 'N']);
  expect(drawn.bonds).toHaveLength(10);
  expect(nitrogenBonds(drawn)).toEqual(['C3', 'C3']);
  expect(cyanoDistances(drawn)).toEqual([1]); // The two –C≡N groups in orto (1,2), their carbons outside the ring.
  expect(await drawingInsideCanvas(page)).toBe(true);

  // `ftalonitrilo` with a branch on its ring: the engine writes it too, so it is a valid form.
  dialog = await buildName(page, '4', 'met', 'il', 'ftalonitrilo');
  await expect(page.locator('#name-builder-name')).toHaveText('4-metilftalonitrilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(page.locator('#result-name')).toHaveText('4-metilbenceno-1,2-dicarbonitrilo');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'N', 'N']);
  expect(cyanoDistances(drawn)).toEqual([1]);

  // A substituted phenyl on carbon 2 of `acetonitrilo`: the engine writes it too.
  dialog = await buildName(page, '2', 'empieza rama compuesta', '4', 'met', 'il', 'fenil', 'acaba rama', 'acetonitrilo');
  await expect(page.locator('#name-builder-name')).toHaveText('2-(4-metilfenil)acetonitrilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «2-(4-metilfenil)acetonitrilo» es una forma válida '
    + '(nombre tradicional, que la IUPAC (2013) acepta). El nombre que doy primero es «2-(4-metilfenil)etanonitrilo».');
  await expect(page.locator('#result-name')).toHaveText('2-(4-metilfenil)etanonitrilo');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'N']);
  expect(nitrogenBonds(drawn)).toEqual(['C3']);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // A substituted chain template, which the app never writes: the molecule it describes, named by the app, and why.
  dialog = await buildName(page, '2', 'cloro', 'acetonitrilo');
  await expect(page.locator('#name-builder-name')).toHaveText('2-cloroacetonitrilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«2-cloroetanonitrilo».');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'SUBSTITUTED_TEMPLATE');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('El nombre tradicional «acetonitrilo» no admite sustituyentes: con '
    + 'más grupos, la molécula se nombra con su nombre sistemático: «2-cloroetanonitrilo».');
  await expect(page.locator('#result-name')).toHaveText('2-cloroetanonitrilo');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'Cl', 'N']);
  expect(nitrogenBonds(drawn)).toEqual(['C3']);
  expect(await drawingInsideCanvas(page)).toBe(true);
  expect(errors).toEqual([]);
}); // End of test '`ftalonitrilo`, `4-metilftalonitrilo`…'

test('`1-acetonitrilo` is refused with the number marked; the Ayuda line of nitriles', async ({ page }) => {
  const errors = await openApp(page);
  const dialog = await buildName(page, '1', 'acetonitrilo');
  await expect(page.locator('#name-builder-name')).toHaveText('1-acetonitrilo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('«acetonitrilo» ya dice dónde va su grupo C≡N, en el carbono 1: no lleva números ni letras propios.');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([0]);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);

  // Ayuda, «Del nombre al dibujo»: nitriles are read; their tiles and the retained names.
  await page.getByRole('button', { name: 'Ayuda' }).click();
  const help = page.getByRole('dialog', { name: 'Cómo se usa' });
  await expect(help.locator('#help-name-to-drawing')).toContainText('y de sus ácidos carboxílicos y ésteres, y de sus nitrilos');
  const line = help.locator('#help-name-to-drawing-nitriles');
  for (const phrase of ['Nitrilos.', '«nitrilo» va al final', 'no lleva números', 'butanonitrilo', 'butanodinitrilo',
    '«carbonitrilo»', 'ciclohexanocarbonitrilo', 'el benzonitrilo', '«ciano»', 'ácido 3-cianopropanoico',
    'el acetonitrilo, el fenilacetonitrilo y el ftalonitrilo', '4-metilftalonitrilo', '2-(4-metilfenil)acetonitrilo']) {
    await expect(line).toContainText(phrase);
  }
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
}); // End of test '`1-acetonitrilo` is refused…'
