/**
 * @file Ring e2e (design.md §3.2, §13 I-24, I-25): a ring drawn by bonding
 * back to an atom is named (ciclopropano, ciclohexano) and its stepper
 * highlights the closure bond; a hand-drawn substituted ring is named
 * (1-etil-3-metilciclohexano, I-26) with its ring numbering on the canvas
 * and still refuses "Ordenar dibujo"; a ring with an oxygen, fused and spiro rings
 * get their out-of-scope messages; "Ordenar dibujo" and the 90° view fall
 * back safely; a ring survives the autosave restore. Runs on the dev server
 * and on dist/index.html.
 */

import { test, expect } from '@playwright/test';
import { parseSmiles } from '../../src/model/smiles.js';
import { moleculeToJSON } from '../../src/model/molecule.js';

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
}

/**
 * Clicks on an atom of the drawing (its centre, as drawn).
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {number} id - Atom id.
 * @returns {Promise<void>}
 */
async function clickAtom(page, id) {
  const p = await page.evaluate((atomId) => window.__editor.atomClientPoint(atomId), id);
  await page.mouse.click(p.x, p.y);
}

/**
 * Clicks on the canvas at a fraction of its size.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {number} fx - Horizontal fraction (0–1).
 * @param {number} fy - Vertical fraction (0–1).
 * @returns {Promise<void>}
 */
async function clickCanvas(page, fx, fy) {
  const box = await page.locator('svg#canvas').boundingBox();
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
}

/**
 * Drags the mouse from one client point to another.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {{x: number, y: number}} from - Start point.
 * @param {{x: number, y: number}} to - End point.
 * @returns {Promise<void>}
 */
async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

/**
 * Loads a molecule from SMILES (parsed here in Node), with the atoms spread
 * on a grid so that none overlap.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} smiles - The SMILES string.
 * @returns {Promise<void>}
 */
async function loadSmiles(page, smiles) {
  const json = moleculeToJSON(parseSmiles(smiles));
  json.atoms.forEach((atom, i) => {
    atom.x = 150 + (i % 5) * 60;
    atom.y = 150 + Math.floor(i / 5) * 60 + (i % 2) * 25;
  });
  await page.evaluate((data) => window.__editor.loadMolecule(data), json);
}

/**
 * Draws a three-carbon ring: two clicks, then a drag from atom 3 back to atom 1.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<void>}
 */
async function drawTriangle(page) {
  await clickCanvas(page, 0.45, 0.5);
  await clickAtom(page, 2);
  const from = await page.evaluate(() => window.__editor.atomClientPoint(3));
  const to = await page.evaluate(() => window.__editor.atomClientPoint(1));
  await drag(page, from, to);
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().bonds.length)).toBe(3);
}

test('a drawn ring is named ciclopropano; Ordenar dibujo, 90° view and reload fall back safely', async ({ page }) => {
  const errors = await openApp(page);
  await drawTriangle(page);
  const nameButton = page.getByRole('button', { name: '¿Cómo se llama?' });
  await nameButton.click();
  await expect(page.locator('#result-name')).toHaveText('ciclopropano');
  await expect(page.locator('#results .results-error')).toHaveCount(0);
  await expect(page.locator('#redraw-hint')).toHaveCount(0);
  // No locant numbers on an unnumbered ring.
  await expect(page.locator('svg#canvas .locant')).toHaveCount(0);

  // Ordenar dibujo leaves the drawing as it is, and says why.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect(page.locator('#toast')).toHaveText('Todavía no sé ordenar el dibujo de un anillo. El dibujo se queda como estaba.');
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON())).toEqual(before);
  await expect(page.locator('#result-name')).toHaveText('ciclopropano');

  // The 90° view falls back to the normal drawing, with a note.
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await page.locator('#right-angle-button').click();
  expect(await page.evaluate(() => window.__editor.isProjected())).toBe(false);
  await expect(page.locator('#right-angle-note')).toHaveText('Hay un anillo: se ve el dibujo normal.');

  // The ring survives the autosave restore and is still named.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().bonds.length)).toBe(3);
  await nameButton.click();
  await expect(page.locator('#result-name')).toHaveText('ciclopropano');
  expect(errors).toEqual([]);
}); // End of test 'a drawn ring is named ciclopropano…'

test('a hand-drawn hexagon is ciclohexano; the stepper highlights the closure bond', async ({ page }) => {
  const errors = await openApp(page);
  // Six carbons by clicks (each click on the last carbon adds one), then close the ring.
  await clickCanvas(page, 0.35, 0.5);
  for (const id of [2, 3, 4, 5]) {
    await clickAtom(page, id);
  }
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.length)).toBe(6);
  const from = await page.evaluate(() => window.__editor.atomClientPoint(6));
  const to = await page.evaluate(() => window.__editor.atomClientPoint(1));
  await drag(page, from, to);
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().bonds.length)).toBe(6);
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('ciclohexano');

  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  const titles = [];
  const dots = stepper.locator('.step-dot');
  const total = await dots.count();
  for (let i = 0; i < total; i += 1) {
    await dots.nth(i).click();
    titles.push(await stepper.locator('.step-title').textContent());
  }
  expect(titles).toEqual(['Cuenta los carbonos', 'Busca el anillo', 'Numera el anillo', 'Monta el nombre']);
  await dots.nth(0).click();
  await expect(stepper.locator('.step-content')).toContainText('(C₆H₁₂)');
  await dots.nth(1).click();
  await expect(stepper.locator('.step-content')).toContainText('se cierra sobre sí misma');
  // Five ring bonds in the parent colour, the closure bond apart, six ring atoms.
  await expect(page.locator('svg#canvas .hl-bond.hl-candidate')).toHaveCount(1);
  await expect(page.locator('svg#canvas .hl-bond.hl-parent')).toHaveCount(5);
  await expect(page.locator('svg#canvas .hl-atom.hl-parent')).toHaveCount(6);
  await dots.nth(3).click();
  await expect(stepper.locator('.step-content')).toContainText('El nombre completo es «ciclohexano».');
  await expect(page.locator('svg#canvas .locant')).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test 'a hand-drawn hexagon is ciclohexano…'

test('a hand-drawn substituted ring is 1-etil-3-metilciclohexano; Ordenar dibujo refuses it', async ({ page }) => {
  const errors = await openApp(page);
  // A hexagon: six carbons by clicks, then close the ring.
  await clickCanvas(page, 0.35, 0.5);
  for (const id of [2, 3, 4, 5]) {
    await clickAtom(page, id);
  }
  const from = await page.evaluate(() => window.__editor.atomClientPoint(6));
  const to = await page.evaluate(() => window.__editor.atomClientPoint(1));
  await drag(page, from, to);
  // A methyl on atom 1 (atom 7) and an ethyl on atom 3 (atoms 8 and 9).
  await clickAtom(page, 1);
  await clickAtom(page, 3);
  await clickAtom(page, 8);
  const json = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(json.atoms.length).toBe(9);
  expect(json.bonds.length).toBe(9);
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('1-etil-3-metilciclohexano');
  await expect(page.locator('#results .results-error')).toHaveCount(0);
  await expect(page.locator('#redraw-hint')).toHaveCount(0);

  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  const dots = stepper.locator('.step-dot');
  const titles = [];
  const total = await dots.count();
  for (let i = 0; i < total; i += 1) {
    await dots.nth(i).click();
    titles.push(await stepper.locator('.step-title').textContent());
  }
  expect(titles).toEqual([
    'Cuenta los carbonos', 'Busca el anillo', 'Numera el anillo', 'Nombra los sustituyentes',
    'Ordena alfabéticamente', 'Monta el nombre',
  ]);
  await dots.nth(1).click();
  await expect(stepper.locator('.step-content')).toContainText('el anillo es la cadena principal');
  await dots.nth(2).click();
  await expect(stepper.locator('.step-content')).toContainText('En un anillo no hay extremos');
  // The chosen ring numbering: six locant labels, 1 on the ethyl carbon (atom 3), 3 on the methyl carbon (atom 1).
  await expect(page.locator('svg#canvas .locant')).toHaveCount(6);
  const locants = await page.evaluate(() => [...document.querySelectorAll('svg#canvas .locant')].map((el) => el.textContent).sort());
  expect(locants).toEqual(['1', '2', '3', '4', '5', '6']);

  // Ordenar dibujo leaves the drawing as it is, and says why (ring layouts come in I-27).
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect(page.locator('#toast')).toHaveText('Todavía no sé ordenar el dibujo de un anillo. El dibujo se queda como estaba.');
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON())).toEqual(before);
  // The 90° view falls back to the normal drawing.
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await page.locator('#right-angle-button').click();
  expect(await page.evaluate(() => window.__editor.isProjected())).toBe(false);
  await expect(page.locator('#right-angle-note')).toHaveText('Hay un anillo: se ve el dibujo normal.');
  expect(errors).toEqual([]);
}); // End of test 'a hand-drawn substituted ring…'

test('a ring with an oxygen is a heterocycle: out of scope', async ({ page }) => {
  const errors = await openApp(page);
  await drawTriangle(page);
  await page.keyboard.press('o');
  await clickAtom(page, 3);
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.map((a) => a.element))).toEqual(['C', 'C', 'O']);
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  const error = page.locator('#results .results-error');
  await expect(error).toHaveAttribute('data-code', 'RING_SYSTEM');
  await expect(error).toContainText('es un heterociclo');
  expect(errors).toEqual([]);
});

for (const [smiles, text] of [
  ['C1CCC2CCCCC2C1', 'anillos fusionados'],
  ['C1CC2CCC1C2', 'anillos con puente'],
  ['C1CCC2(C1)CCCC2', 'compuesto espiro'],
  ['C1CCC(CC1)C1CCCCC1', 'varios anillos'],
]) {
  test(`${smiles} gets the out-of-scope message "${text}"`, async ({ page }) => {
    const errors = await openApp(page);
    await loadSmiles(page, smiles);
    await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
    const error = page.locator('#results .results-error');
    await expect(error).toHaveAttribute('data-code', 'RING_SYSTEM');
    await expect(error).toContainText(text);
    expect(errors).toEqual([]);
  });
}

test('a benzene hexagon gets the "not yet" benzene message (named from I-28)', async ({ page }) => {
  const errors = await openApp(page);
  await loadSmiles(page, 'C1=CC=CC=C1');
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  const error = page.locator('#results .results-error');
  await expect(error).toHaveAttribute('data-code', 'CYCLE');
  await expect(error).toContainText('Este anillo es un benceno');
  await expect(page.locator('#result-name')).toHaveCount(0);
  expect(errors).toEqual([]);
});
