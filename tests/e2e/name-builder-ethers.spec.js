/**
 * @file «¿Cómo se dibuja?» with ethers e2e (design.md §15.2, §15.5.2 item 6,
 * §15.8 R-5b; phase I-51b1, R-5b1): the «Grupos» row offers `oxi` (with its
 * tooltip); tiles `1 met il oxi prop ano` build `1-metoxipropano` — the `il`
 * a silent, selectable piece of the name line, since `oxi` replaces it —
 * and «Dibujar» puts the molecule on the canvas, its ether oxygen between
 * two carbons, one undoable edit, centred and ordered, with «¡Correcto!»;
 * `anisol` («Nombres tradicionales», with its tooltip) draws metoxibenceno
 * as an accepted alternative; the crowded `cloro(metoxi)metano` gets its
 * parentheses from the app and is correct; `etoximetano` draws its molecule
 * with the app's name and why, told from the oxygen (phase I-51b2,
 * ETHER_SIDE); `oxi` out of place and left-out locants (`metoxipropano`)
 * stay in the dialog with their message, the canvas untouched; the Ayuda
 * section «Del nombre al dibujo» has its ethers line. Phase I-51b2, R-5b2:
 * the «Grupos» row offers `éter` (with its tooltip); tiles `et il met il
 * éter` build `etil metil éter` — the spaces the app's — and «Dibujar» draws
 * metoxietano as an accepted alternative, `dietil éter` too; `metil etil
 * éter` draws its molecule with the order mistake, «Ver el paso» opening the
 * class-name step «Monta el nombre con «éter»» (review of phase I-51b2); one
 * group only stays in the dialog; the Ayuda ethers line speaks of class
 * names.
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
 * The elements bonded to each oxygen of a drawn molecule, sorted (an ether
 * oxygen has two carbons, each by a single bond).
 *
 * @param {object} json - moleculeToJSON() output.
 * @returns {string[][]} Per oxygen, its neighbours' elements and bond orders (`C1`).
 */
function oxygenNeighbours(json) {
  const element = new Map(json.atoms.map((atom) => [atom.id, atom.element]));
  return json.atoms.filter((atom) => atom.element === 'O').map((oxygen) => json.bonds
    .filter((bond) => bond.a === oxygen.id || bond.b === oxygen.id)
    .map((bond) => `${element.get(bond.a === oxygen.id ? bond.b : bond.a)}${bond.order}`)
    .sort());
}

test('«Grupos»: tiles `1 met il oxi prop ano` draw 1-metoxipropano, correct, ordered; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const tile = dialog.getByRole('group', { name: 'Grupos' }).locator('[data-tile="group-alkoxy"]');
  await expect(tile).toHaveText('oxi');
  await expect(tile).toBeVisible();
  await expect(tile).toHaveAccessibleName('oxi');
  await expect(tile).toHaveAttribute('title', /met, il y oxi dan metoxi/);
  await page.keyboard.press('Escape');

  await buildName(page, '1', 'met', 'il');
  const line = page.locator('#name-builder-name');
  await expect(line).toHaveText('1-metil');
  // `oxi` replaces the `il`: the name line reads `1-metoxi`, the `il` stays a silent piece with its own accessible name.
  await page.locator('#name-builder-rows').getByRole('button', { name: 'oxi', exact: true }).click();
  await expect(line).toHaveText('1-metoxi');
  const silent = line.locator('.nb-piece--silent');
  await expect(silent).toHaveCount(1);
  await expect(silent).toHaveAttribute('aria-label', 'il (no se escribe)');
  await expect(silent).toHaveAttribute('data-tile', 'fv-1');
  for (const text of ['prop', 'ano']) {
    await page.locator('#name-builder-rows').getByRole('button', { name: text, exact: true }).click();
  }
  await expect(line).toHaveText('1-metoxipropano');
  await expect(line.locator('.part-prefix')).toHaveText(['met', '', 'oxi']);
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // Four carbons and an ether oxygen between two of them; whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'O']);
  expect(drawn.bonds).toHaveLength(4);
  expect(oxygenNeighbours(drawn)).toEqual([['C1', 'C1']]);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The verdict, then «Se llama:»; the ordered drawing highlights the parent.
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: 1-metoxipropano');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto!');
  await expect(page.locator('#result-name')).toHaveText('1-metoxipropano');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test '«Grupos»: tiles `1 met il oxi prop ano` draw 1-metoxipropano…'

test('`anisol` draws metoxibenceno, an accepted alternative; `cloro(metoxi)metano` gets its marks; `etoximetano` and why', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const tile = page.getByRole('group', { name: 'Nombres tradicionales' }).locator('[data-tile="template-anisole"]');
  await expect(tile).toHaveText('anisol');
  await expect(tile).toHaveAccessibleName('anisol');
  await expect(tile).toHaveAttribute('title', 'Benceno con un grupo metoxi: metoxibenceno.');
  await page.keyboard.press('Escape');

  let dialog = await buildName(page, 'anisol');
  await expect(page.locator('#name-builder-name')).toHaveText('anisol');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «anisol» es una forma válida (nombre tradicional, que la '
    + 'IUPAC (2013) acepta). El nombre que doy primero es «metoxibenceno».');
  await expect(page.locator('#result-name')).toHaveText('metoxibenceno');
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'C', 'C', 'C', 'O']);
  expect(drawn.bonds.filter((bond) => bond.order === 2)).toHaveLength(3);
  expect(oxygenNeighbours(drawn)).toEqual([['C1', 'C1']]);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The crowded case: two prefixes without locants on methane, the app encloses the alkoxy one.
  dialog = await buildName(page, 'cloro', 'met', 'il', 'oxi', 'met', 'ano');
  await expect(page.locator('#name-builder-name')).toHaveText('cloro(metoxi)metano');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('cloro(metoxi)metano');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'Cl', 'O']);
  expect(oxygenNeighbours(drawn)).toEqual([['C1', 'C1']]);

  // The wrong side of the oxygen as the parent: the molecule, its name and why, told from the oxygen (I-51b2).
  dialog = await buildName(page, 'et', 'il', 'oxi', 'met', 'ano');
  await expect(page.locator('#name-builder-name')).toHaveText('etoximetano');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'ETHER_SIDE');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«metoxietano».');
  await expect(verdict.locator('.verdict-diagnosis')).toContainText('en ese lado hay una cadena de 2 carbonos, más larga que la '
    + 'tuya, de 1. Tu cadena, con el oxígeno, es el sustituyente «metoxi»: «metoxietano».');
  await expect(page.locator('#result-name')).toHaveText('metoxietano');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'C', 'O']);
  expect(await drawingInsideCanvas(page)).toBe(true);
  expect(errors).toEqual([]);
}); // End of test '`anisol` draws metoxibenceno…'

test('`oxi` out of place, or left-out locants, stay in the dialog with their message; the canvas keeps its drawing', async ({ page }) => {
  const errors = await openApp(page);
  // A drawing to keep.
  let dialog = await buildName(page, 'met', 'il', 'oxi', 'met', 'ano');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#result-name')).toHaveText('metoximetano');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'O']);

  // `oxi` after a halogen: the tile is marked, with the hint that says where it goes.
  dialog = await buildName(page, 'cloro', 'oxi', 'met', 'ano');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('Esta ficha no puede ir aquí: «oxi» va justo detrás de una rama acabada en «il», y la une a la '
    + 'cadena por un oxígeno: met, il y oxi dan metoxi; también detrás de «isopropil», «tert-butil» o «fenil» (isopropoxi), y en una '
    + 'rama compuesta, antes de cerrarla: (2-metilpropoxi).');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([1]);
  await expect(dialog).toBeVisible();

  // `metoxipropano`: two molecules; nothing drawn.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of ['met', 'il', 'oxi', 'prop', 'ano']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('Faltan números: puede ser 1-metoxipropano o 2-metoxipropano.');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect(elementsOf(await moleculeJSON(page))).toEqual(['C', 'C', 'O']);
  await expect(page.locator('#result-name')).toHaveText('metoximetano');

  // Ayuda, «Del nombre al dibujo»: ethers are read; the `oxi` line and `anisol`.
  await page.getByRole('button', { name: 'Ayuda' }).click();
  const help = page.getByRole('dialog', { name: 'Cómo se usa' });
  await expect(help.locator('#help-name-to-drawing')).toContainText('alcoholes y fenoles, éteres');
  const line = help.locator('#help-name-to-drawing-ethers');
  for (const phrase of ['«oxi» va detrás de una rama', 'met, il y oxi dan metoxi', '1-metoxipropano', '(pentiloxi)',
    '(propan-2-iloxi)', '(2-metilpropoxi)', 'El anisol (metoxibenceno)', 'con la palabra «éter», que está en «Grupos»',
    'et, il, met, il y éter dan etil metil éter', 'dietil éter', 'tert-butil metil éter']) {
    await expect(line).toContainText(phrase);
  }
  await expect(help.locator('#help-name-to-drawing')).toContainText('Los guiones, las comas, los paréntesis y los espacios los pongo yo.');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
}); // End of test '`oxi` out of place, or left-out locants, stay in the dialog…'

test('«Grupos»: `éter` builds a class name with the app\'s spaces; `etil metil éter` and `dietil éter` are accepted, `metil etil éter` explained', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const tile = page.getByRole('group', { name: 'Grupos' }).locator('[data-tile="class-ether"]');
  await expect(tile).toHaveText('éter');
  await expect(tile).toBeVisible();
  await expect(tile).toHaveAccessibleName('éter');
  await expect(tile).toHaveClass(/nb-tile--classWord/);
  await expect(tile).toHaveAttribute('title', /et, il, met, il y éter dan etil metil éter/);
  await page.keyboard.press('Escape');

  // One group only: the dialog says what is missing, the tiles marked, the canvas untouched.
  let dialog = await buildName(page, 'met', 'il', 'éter');
  await expect(page.locator('#name-builder-name')).toHaveText('metil éter');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('Un éter lleva dos grupos unidos al oxígeno y tu nombre solo pone uno: escribe dos, por orden '
    + 'alfabético (etil metil éter), o uno solo con «di» delante si los dos son iguales (dietil éter).');
  expect(await invalidTiles(page)).toEqual([0, 1, 2]);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);

  // `et il met il éter`: the spaces are the app's; «Dibujar» draws metoxietano, an accepted alternative.
  dialog = await buildName(page, 'et', 'il', 'met', 'il', 'éter');
  const line = page.locator('#name-builder-name');
  await expect(line).toHaveText('etil metil éter');
  await expect(line.locator('.part-ending')).toHaveText(['éter']);
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: etil metil éter');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «etil metil éter» es una forma válida (nombre de clase '
    + 'funcional (los dos grupos y la palabra «éter»), que la IUPAC (2013) acepta). El nombre que doy primero es «metoxietano».');
  await expect(page.locator('#result-name')).toHaveText('metoxietano');
  let drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'O']);
  expect(oxygenNeighbours(drawn)).toEqual([['C1', 'C1']]);
  expect(await drawingInsideCanvas(page)).toBe(true);
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // `di et il éter`: dietil éter.
  dialog = await buildName(page, 'di', 'et', 'il', 'éter');
  await expect(line).toHaveText('dietil éter');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(page.locator('#result-name')).toHaveText('etoxietano');
  drawn = await moleculeJSON(page);
  expect(elementsOf(drawn)).toEqual(['C', 'C', 'C', 'C', 'O']);
  expect(oxygenNeighbours(drawn)).toEqual([['C1', 'C1']]);

  // The groups out of order: the molecule, its name and why; a class name has no chain of its own to stripe.
  dialog = await buildName(page, 'met', 'il', 'et', 'il', 'éter');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'CLASS_ORDER');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('En el nombre con «éter», los dos grupos se escriben por orden '
    + 'alfabético: «etil» va antes que «metil» (e antes que m). Se escribe «etil metil éter».');
  await expect(verdict.getByRole('list', { name: 'Qué se ve en el dibujo' })).toHaveCount(0);
  await expect(page.locator('svg#canvas .hl-student')).toHaveCount(0);
  // «Ver el paso» (review of phase I-51b2): the class-name step, after «Reconoce el éter», says how this name is formed
  // and tells it from metoxietano; the two groups and the oxygen are marked.
  await verdict.getByRole('button', { name: 'Ver el paso' }).click();
  const stepper = page.locator('#stepper');
  await expect(stepper).toHaveAttribute('data-step-id', 'etherClass');
  await expect(stepper.locator('.step-title')).toHaveText('Monta el nombre con «éter»');
  await expect(stepper.locator('.step-title')).toBeFocused();
  await expect(stepper.locator('.step-count')).toHaveText('Paso 3 de 7');
  const content = stepper.locator('.step-content');
  for (const phrase of ['El nombre que explican los otros pasos, «metoxietano», es el que doy primero, el nombre sustitutivo',
    'aquí, «etil» y «metil».', '«tert-» no cuenta para el orden', '«dietil éter», no «etil etil éter»',
    'En el nombre sustitutivo, en cambio, el éter nunca va al final', 'Para esta molécula: «etil metil éter».']) {
    await expect(content).toContainText(phrase);
  }
  await expect(page.locator('svg#canvas .hl-substituent.hl-atom')).toHaveCount(3);
  await expect(page.locator('svg#canvas .hl-candidate.hl-atom')).toHaveCount(1);
  // One step back, «Reconoce el éter»: the substitutive name's ether.
  await stepper.getByRole('button', { name: 'Anterior' }).click();
  await expect(stepper).toHaveAttribute('data-step-id', 'ether');
  expect(errors).toEqual([]);
}); // End of test '«Grupos»: `éter` builds a class name…'
