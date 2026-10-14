/**
 * @file «¿Cómo se dibuja?» with rings e2e (design.md §15.2, §15.8 R-4;
 * phase I-50a, R-4a): the «Anillos» row offers the `ciclo` tile; tiles
 * `met il ciclo hex ano` build `metilciclohexano`, and «Dibujar» puts the
 * ring on the canvas — six ring bonds and the methyl, one undoable edit,
 * centred and ordered, the ring highlighted as the parent — with
 * «¡Correcto!» above «Se llama:»; a ring branch on a chain draws the
 * molecule the app names on its ring (another name); a ring too small and
 * two rings bonded together stay in the dialog with their message, the
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
 * Builds a name from tiles in the dialog (from an empty name) and presses
 * «Dibujar».
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {...string} texts - Tile texts, in order.
 * @returns {Promise<import('@playwright/test').Locator>} The dialog.
 */
async function drawName(page, ...texts) {
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of texts) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  return dialog;
} // End of function drawName()

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
 * Tells whether a serialised molecule has a cycle (more bonds than atoms − 1, connected).
 *
 * @param {{atoms: object[], bonds: object[]}} mol - moleculeToJSON() output.
 * @returns {boolean} True for one ring or more.
 */
function hasRing(mol) {
  return mol.bonds.length >= mol.atoms.length;
}

test('«Anillos»: tiles `met il ciclo hex ano` draw methylcyclohexane, correct, ordered; Deshacer restores the canvas', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  await expect(dialog.getByRole('heading', { name: 'Anillos', exact: true })).toBeVisible();
  const ring = dialog.locator('#name-builder-rows [data-tile="ring-cyclo"]');
  await expect(ring).toHaveText('ciclo');
  await expect(ring).toBeVisible();
  // The name line assembles the ring like any other stem.
  const rows = page.locator('#name-builder-rows');
  for (const text of ['met', 'il', 'ciclo', 'hex', 'ano']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await expect(page.locator('#name-builder-name')).toHaveText('metilciclohexano');
  await expect(page.locator('#name-builder-name .part-stem').first()).toHaveText('ciclo');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();

  // The ring is on the canvas: seven carbons, seven bonds (six in the ring), whole and in view.
  const drawn = await moleculeJSON(page);
  expect(drawn.atoms).toHaveLength(7);
  expect(drawn.bonds).toHaveLength(7);
  expect(hasRing(drawn)).toBe(true);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The verdict, then «Se llama:»; the ordered drawing highlights the ring as the parent.
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: metilciclohexano');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto!');
  await expect(page.locator('#result-name')).toHaveText('metilciclohexano');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom')).toHaveCount(6);

  // One undoable edit: Deshacer empties the canvas again and clears the verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test '«Anillos»: tiles `met il ciclo hex ano` draw methylcyclohexane…'

test('a ring branch on a chain draws the molecule the app names on its ring; a ring parent with left-out locants', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  // `ciclohexilmetano`: another name for methylcyclohexane.
  await drawName(page, 'ciclo', 'hex', 'il', 'met', 'ano');
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: ciclohexilmetano');
  // No diagnosis for rings yet (phase I-50d): the whole message, with no diagnosis line.
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«metilciclohexano». Pulsa «Ver paso a paso» para ver por qué.');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveCount(0);
  await expect(page.locator('#result-name')).toHaveText('metilciclohexano');
  const drawn = await moleculeJSON(page);
  expect([drawn.atoms.length, drawn.bonds.length]).toEqual([7, 7]);
  // `3-metilciclohexeno`: the locant of the double bond is missing.
  await drawName(page, '3', 'met', 'il', 'ciclo', 'hex', 'eno');
  await expect(verdict).toHaveAttribute('data-kind', 'missingLocants');
  await expect(verdict.locator('.verdict-message')).toHaveText('Casi: faltan los números. Se escribe «3-metilciclohex-1-eno».');
  await expect(page.locator('#result-name')).toHaveText('3-metilciclohex-1-eno');
  const ene = await moleculeJSON(page);
  expect(ene.bonds.filter((bond) => bond.order === 2)).toHaveLength(1);
  expect(errors).toEqual([]);
}); // End of test 'a ring branch on a chain draws the molecule the app names on its ring…'

test('rings the app cannot draw stay in the dialog: a ring too small (tiles marked), two rings bonded together', async ({ page }) => {
  const errors = await openApp(page);
  const dialog = await drawName(page, 'ciclo', 'et', 'ano');
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('Un anillo tiene por lo menos 3 carbonos: el más pequeño es el ciclopropano.');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([0, 1]);
  await expect(dialog).toBeVisible();
  // Two rings bonded straight together: out of scope, with the app's own message; nothing drawn.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of ['ciclo', 'hex', 'il', 'ciclo', 'hex', 'ano']) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await expect(page.locator('#name-builder-name')).toHaveText('ciclohexilciclohexano');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toContainText('Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar: '
    + 'Esta molécula tiene varios anillos.');
  expect(await invalidTiles(page)).toEqual([]);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  expect(errors).toEqual([]);
}); // End of test 'rings the app cannot draw stay in the dialog…'
