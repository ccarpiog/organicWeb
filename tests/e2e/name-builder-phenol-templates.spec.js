/**
 * @file «¿Cómo se dibuja?» with the retained phenol templates e2e (design.md
 * §14.4, §14.5, §15.2, §15.8 R-5a; phase I-51a3a, R-5a3a): the «Nombres
 * tradicionales» row offers `cresol`, `pirocatecol`, `catecol`, `resorcinol`
 * and `hidroquinona`, each with a tooltip; tiles `p cresol` build `p-cresol`,
 * and «Dibujar» puts 4-methylphenol on the canvas — one undoable edit,
 * centred and ordered — with «¡Correcto!… es una forma válida» above «Se
 * llama: 4-metilfenol»; `hidroquinona` draws benzene-1,4-diol; a substituted
 * `4-clorocatecol` draws its molecule with the app's name and why; `cresol`
 * alone asks for its letter and `4-cresol` is refused with the number
 * marked, the canvas untouched; the Ayuda section «Del nombre al dibujo»
 * mentions alcohols and phenols and lists the phenol templates. Runs on the
 * dev server and on dist (playwright.config.js).
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
 * The ring positions of the oxygens seen from each other, as the number of
 * ring bonds between their carbons (1 orto, 2 meta, 3 para), sorted.
 *
 * @param {object} json - moleculeToJSON() output of a benzene ring with two OH groups.
 * @returns {number[]} The distances, one per pair of oxygens.
 */
function oxygenDistances(json) {
  const element = new Map(json.atoms.map((atom) => [atom.id, atom.element]));
  const neighbours = (id) => json.bonds.filter((b) => b.a === id || b.b === id).map((b) => (b.a === id ? b.b : b.a));
  const carbons = json.atoms.filter((atom) => atom.element === 'O').map((oxygen) => neighbours(oxygen.id)[0]);
  const distances = [];
  for (let i = 0; i < carbons.length; i += 1) {
    for (let j = i + 1; j < carbons.length; j += 1) {
      // Breadth-first over the ring carbons only.
      const seen = new Map([[carbons[i], 0]]);
      const queue = [carbons[i]];
      while (queue.length > 0) {
        const at = queue.shift();
        for (const next of neighbours(at).filter((n) => element.get(n) === 'C' && !seen.has(n))) {
          seen.set(next, seen.get(at) + 1);
          queue.push(next);
        }
      } // End of the breadth-first loop
      distances.push(seen.get(carbons[j]));
    }
  } // End of the loop over the pairs of oxygens
  return distances.sort();
} // End of function oxygenDistances()

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

test('«Nombres tradicionales»: the phenol tiles; `p cresol` draws 4-metilfenol, a valid form; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const traditional = dialog.getByRole('group', { name: 'Nombres tradicionales' });
  for (const [id, text, hint] of [['template-cresol', 'cresol', /o-cresol, m-cresol o p-cresol/],
    ['template-pyrocatechol', 'pirocatecol', /benceno-1,2-diol/], ['template-catechol', 'catecol', /acepta pirocatecol/],
    ['template-resorcinol', 'resorcinol', /benceno-1,3-diol/], ['template-hydroquinone', 'hidroquinona', /benceno-1,4-diol/]]) {
    const tile = traditional.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveText(text);
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAccessibleName(text);
    await expect(tile).toHaveAttribute('title', hint);
  }
  await page.keyboard.press('Escape');

  await buildName(page, 'p (para, 1,4)', 'cresol');
  await expect(page.locator('#name-builder-name')).toHaveText('p-cresol');
  await expect(page.locator('#name-builder-name .part-locant')).toHaveText('p');
  await expect(page.locator('#name-builder-name .part-stem')).toHaveText('cresol');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // 4-Methylphenol on the canvas: the ring (three double bonds), its methyl and its OH; whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'O']);
  expect(drawn.bonds).toHaveLength(8);
  expect(drawn.bonds.filter((bond) => bond.order === 2)).toHaveLength(3);
  expect(await drawingInsideCanvas(page)).toBe(true);

  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: p-cresol');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «p-cresol» es una forma válida (nombre tradicional, '
    + 'que la IUPAC (2013) acepta). El nombre que doy primero es «4-metilfenol».');
  await expect(page.locator('#result-name')).toHaveText('4-metilfenol');
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test '«Nombres tradicionales»: the phenol tiles…'

test('`hidroquinona` draws benzene-1,4-diol; `4-clorocatecol` draws its molecule with the app\'s name and why', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  let dialog = await buildName(page, 'hidroquinona');
  await expect(page.locator('#name-builder-name')).toHaveText('hidroquinona');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «hidroquinona» es una forma válida (nombre tradicional, '
    + 'que la IUPAC (2013) acepta). El nombre que doy primero es «benceno-1,4-diol».');
  await expect(page.locator('#result-name')).toHaveText('benceno-1,4-diol');
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'O', 'O']);
  expect(drawn.bonds).toHaveLength(8);
  expect(oxygenDistances(drawn)).toEqual([3]); // The two OH groups in para (1,4).
  expect(await drawingInsideCanvas(page)).toBe(true);

  // A substituted template, which the app never writes: the molecule it describes, named by the app, and why.
  dialog = await buildName(page, '4', 'cloro', 'catecol');
  await expect(page.locator('#name-builder-name')).toHaveText('4-clorocatecol');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«4-clorobenceno-1,2-diol».');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'SUBSTITUTED_TEMPLATE');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('El nombre tradicional «catecol» no admite más sustituyentes: con '
    + 'más ramas en el anillo, la molécula se nombra a partir de «benceno», con todas las ramas delante: «4-clorobenceno-1,2-diol».');
  await expect(page.locator('#result-name')).toHaveText('4-clorobenceno-1,2-diol');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'Cl', 'O', 'O']);
  expect(oxygenDistances(drawn)).toEqual([1]); // The two OH groups of the catechol in orto (1,2).
  expect(await drawingInsideCanvas(page)).toBe(true);
  expect(errors).toEqual([]);
}); // End of test '`hidroquinona` draws benzene-1,4-diol…'

test('`cresol` alone asks for its letter, `4-cresol` is refused with the number marked; the Ayuda lines', async ({ page }) => {
  const errors = await openApp(page);
  const dialog = await buildName(page, 'cresol');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('Falta la letra: puede ser o-cresol, m-cresol o p-cresol.');
  await expect(dialog).toBeVisible();

  // A number before `cresol`: the app writes only the letter.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of ['4', 'cresol']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await expect(page.locator('#name-builder-name')).toHaveText('4-cresol');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('Con «cresol» no van números: una letra dice dónde está su metilo respecto al grupo OH (o-cresol, '
    + 'm-cresol o p-cresol).');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([0]);
  await page.keyboard.press('Escape');
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);

  // Ayuda, «Del nombre al dibujo»: alcohols and phenols are read; the phenol templates and the alcohol tiles.
  await page.getByRole('button', { name: 'Ayuda' }).click();
  const help = page.getByRole('dialog', { name: 'Cómo se usa' });
  await expect(help.locator('#help-name-to-drawing')).toContainText('de sus derivados halogenados, alcoholes y fenoles');
  const rings = help.locator('#help-name-to-drawing-rings');
  for (const phrase of ['el cresol, el pirocatecol o catecol, el resorcinol y la hidroquinona', 'solo lleva la letra (p-cresol)',
    '4-clorocatecol']) {
    await expect(rings).toContainText(phrase);
  }
  const groups = help.locator('#help-name-to-drawing-groups');
  for (const phrase of ['«ol» va al final', 'propan-2-ol', 'butano-1,4-diol', '«hidroxi»', '(hidroximetil)', '4-metilfenol']) {
    await expect(groups).toContainText(phrase);
  }
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
}); // End of test '`cresol` alone asks for its letter…'
