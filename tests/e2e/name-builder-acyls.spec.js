/**
 * @file «¿Cómo se dibuja?» with acyl prefixes e2e (design.md §15.2, §15.5.2,
 * §15.8 R-5c; phase I-51c2, R-5c2): the «Grupos» row offers `acetil`, `oil`
 * and `carbonil`, the «Anillos» row `benzoil`, each with its tooltip; tiles
 * `3 acetil pent ano 2 4 di ona` build `3-acetilpentano-2,4-diona` and
 * «Dibujar» puts the molecule on the canvas, three C=O double bonds, one
 * undoable edit, centred and ordered, with «¡Correcto!»; `2 START 4 met il
 * benzoil END hept ano al` draws `2-(4-metilbenzoil)heptanal` (a compound
 * branch, the benzoyl's own methyl on its carbon 4), `3 ciclo hex ano
 * carbonil pent ano 2 4 di ona` `3-(ciclohexanocarbonil)pentano-2,4-diona`
 * (the enclosure automatic, the C=O carbon outside the ring) and `2 prop 2
 * eno oil hept ano al` `2-(prop-2-enoil)heptanal`, all correct; `2-metil-2-
 * benzoilheptanal` is drawn with the app's name and the ALPHABETICAL_ORDER
 * diagnosis; `oil` without the branch's ending and `carbonil` after a chain
 * stay in the dialog with their message, the canvas untouched.
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
 * The elements of the drawn atoms, counted: `{C: 7, O: 3}`.
 *
 * @param {object} json - moleculeToJSON() output.
 * @returns {Object<string, number>} The count of each element symbol.
 */
function elementCounts(json) {
  return json.atoms.reduce((counts, atom) => ({ ...counts, [atom.element]: (counts[atom.element] || 0) + 1 }), {});
}

/**
 * The bonds of each oxygen of a drawn molecule: its neighbour's element and
 * the bond order, sorted (the =O of a C=O is `C2`).
 *
 * @param {object} json - moleculeToJSON() output.
 * @returns {string[][]} Per oxygen, its bonds.
 */
function oxygenBonds(json) {
  const element = new Map(json.atoms.map((atom) => [atom.id, atom.element]));
  return json.atoms.filter((atom) => atom.element === 'O').map((oxygen) => json.bonds
    .filter((bond) => bond.a === oxygen.id || bond.b === oxygen.id)
    .map((bond) => `${element.get(bond.a === oxygen.id ? bond.b : bond.a)}${bond.order}`)
    .sort());
}

test('«Grupos»: the acyl tiles; `3 acetil pent ano 2 4 di ona` draws 3-acetilpentano-2,4-diona, correct, ordered; Deshacer', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  const groups = dialog.getByRole('group', { name: 'Grupos' });
  for (const [id, text, hint] of [['retained-acetyl', 'acetil', /3-acetilpentano-2,4-diona/], ['acyl-chain', 'oil', /prop, ano y oil dan propanoil/],
    ['acyl-ring', 'carbonil', /\(ciclohexanocarbonil\)/]]) {
    const tile = groups.locator(`[data-tile="${id}"]`);
    await expect(tile).toHaveText(text);
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAccessibleName(text);
    await expect(tile).toHaveAttribute('title', hint);
  }
  await expect(groups.locator('[data-tile="acyl-chain"]')).toHaveClass(/nb-tile--acyl/);
  await expect(groups.locator('[data-tile="retained-acetyl"]')).toHaveClass(/nb-tile--retained/);
  const benzoyl = dialog.getByRole('group', { name: 'Anillos' }).locator('[data-tile="retained-benzoyl"]');
  await expect(benzoyl).toHaveText('benzoil');
  await expect(benzoyl).toHaveAccessibleName('benzoil');
  await expect(benzoyl).toHaveAttribute('title', /\(4-metilbenzoil\)/);
  await page.keyboard.press('Escape');

  const built = await buildName(page, '3', 'acetil', 'pent', 'ano', '2', '4', 'di', 'ona');
  const line = page.locator('#name-builder-name');
  await expect(line).toHaveText('3-acetilpentano-2,4-diona');
  await built.getByRole('button', { name: 'Dibujar' }).click();
  await expect(built).toBeHidden();

  // Seven carbons and the three oxygens, each double-bonded to a carbon; whole and in view.
  const drawn = await moleculeJSON(page);
  expect(elementCounts(drawn)).toEqual({ C: 7, O: 3 });
  expect(oxygenBonds(drawn)).toEqual([['C2'], ['C2'], ['C2']]);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The verdict, then «Se llama:»; the ordered drawing highlights the parent.
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: 3-acetilpentano-2,4-diona');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto!');
  await expect(page.locator('#result-name')).toHaveText('3-acetilpentano-2,4-diona');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom').first()).toBeAttached();

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);

  // `oil` after a chain's ending: `prop-2-en` + `oil`, the enclosure automatic.
  const again = await buildName(page, '2', 'prop', '2', 'eno', 'oil', 'hept', 'ano', 'al');
  await expect(line).toHaveText('2-(prop-2-enoil)heptanal');
  await again.getByRole('button', { name: 'Dibujar' }).click();
  await expect(again).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('2-(prop-2-enoil)heptanal');
  expect(elementCounts(await moleculeJSON(page))).toEqual({ C: 10, O: 2 });
  expect(errors).toEqual([]);
}); // End of test '«Grupos»: the acyl tiles…'

test('`(4-metilbenzoil)` in a compound branch and `(ciclohexanocarbonil)` are correct; `2-metil-2-benzoilheptanal` is diagnosed', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  const line = page.locator('#name-builder-name');

  // `benzoil` as the own chain of a compound branch, its methyl on its carbon 4.
  let dialog = await buildName(page, '2', 'empieza rama compuesta', '4', 'met', 'il', 'benzoil', 'acaba rama', 'hept', 'ano', 'al');
  await expect(line).toHaveText('2-(4-metilbenzoil)heptanal');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('2-(4-metilbenzoil)heptanal');
  let drawn = await moleculeJSON(page);
  expect(elementCounts(drawn)).toEqual({ C: 15, O: 2 });
  expect(drawn.bonds.filter((bond) => bond.order === 2)).toHaveLength(5); // The ring's three and the two C=O.
  expect(await drawingInsideCanvas(page)).toBe(true);

  // `carbonil` after the ring's name: the parentheses automatic, the C=O carbon outside the ring.
  dialog = await buildName(page, '3', 'ciclo', 'hex', 'ano', 'carbonil', 'pent', 'ano', '2', '4', 'di', 'ona');
  await expect(line).toHaveText('3-(ciclohexanocarbonil)pentano-2,4-diona');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(page.locator('#result-name')).toHaveText('3-(ciclohexanocarbonil)pentano-2,4-diona');
  drawn = await moleculeJSON(page);
  expect(elementCounts(drawn)).toEqual({ C: 12, O: 3 });
  expect(oxygenBonds(drawn)).toEqual([['C2'], ['C2'], ['C2']]);

  // Out of alphabetical order: drawn, named, and the ALPHABETICAL_ORDER diagnosis.
  dialog = await buildName(page, '2', 'met', 'il', '2', 'benzoil', 'hept', 'ano', 'al');
  await expect(line).toHaveText('2-metil-2-benzoilheptanal');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'ALPHABETICAL_ORDER');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('Los sustituyentes se escriben por orden alfabético: «benzoil» va '
    + 'antes que «metil» (b antes que m).');
  await expect(page.locator('#result-name')).toHaveText('2-benzoil-2-metilheptanal');
  expect(errors).toEqual([]);
}); // End of test '`(4-metilbenzoil)` in a compound branch…'

test('`oil` without the branch\'s ending and `carbonil` after a chain stay in the dialog with their message; the canvas keeps its drawing', async ({ page }) => {
  const errors = await openApp(page);
  // A drawing to keep.
  let dialog = await buildName(page, '2', 'benzoil', 'hept', 'ano', 'al');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#result-name')).toHaveText('2-benzoilheptanal');

  // `prop oil`: the `oil` tile is marked, with the hint that asks for the branch's ending.
  dialog = await buildName(page, '2', 'prop', 'oil', 'hept', 'ano', 'al');
  await expect(page.locator('#name-builder-name')).toHaveText('2-propoilheptanal');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('Esta ficha no puede ir aquí: delante de «oil» va la terminación de la rama, como en la cadena '
    + 'principal: prop, ano y oil dan propanoil; but, 2, eno y oil dan (but-2-enoil).');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([2]);
  await expect(dialog).toBeVisible();

  // `carbonil` after a chain: marked, with the hint that a chain's acyl branch ends in `oil`.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of ['2', 'prop', 'ano', 'carbonil', 'hept', 'ano', 'al']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('Esta ficha no puede ir aquí: «carbonil» va detrás del nombre de un anillo: (ciclohexanocarbonil); '
    + 'en una cadena, la rama acaba en «oil»: propanoil.');
  expect(await invalidTiles(page)).toEqual([3]);
  await page.keyboard.press('Escape');
  // The canvas keeps 2-benzoilheptanal.
  expect(elementCounts(await moleculeJSON(page))).toEqual({ C: 14, O: 2 });
  await expect(page.locator('#result-name')).toHaveText('2-benzoilheptanal');
  expect(errors).toEqual([]);
}); // End of test '`oil` without the branch\'s ending…'
