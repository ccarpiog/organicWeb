/**
 * @file Ring e2e (design.md §3.2, §13 I-24, I-25): a ring drawn by bonding
 * back to an atom is named (ciclopropano, ciclohexano) and its stepper
 * highlights the closure bond; a hand-drawn substituted ring is named
 * (1-etil-3-metilciclohexano, I-26) with its ring numbering on the canvas;
 * "Ordenar dibujo" draws a named ring as a regular polygon (I-27b: locant 1
 * on top, numbering clockwise, one Deshacer restores the drawing); benzene
 * and toluene are named (I-28: tolueno under "Otras formas válidas", the
 * Kekulé step in the stepper, Ordenar dibujo orders them) while a
 * disubstituted benzene keeps its naming error; a ring with an oxygen, fused and spiro
 * rings get their out-of-scope messages; the 90° view falls back safely; a
 * ring survives the autosave restore. Runs on the dev server and on
 * dist/index.html.
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
 * Tells whether the given atoms lie on a regular polygon: equal distances
 * from their centre, and every consecutive pair one bond length apart.
 *
 * @param {{atoms: {id: number, x: number, y: number}[]}} json - The molecule JSON.
 * @param {number[]} ring - Ring atoms in ring order.
 * @returns {{regular: boolean, bonds: boolean}} Both true for a regular polygon.
 */
function ringShape(json, ring) {
  const pts = ring.map((id) => json.atoms.find((a) => a.id === id));
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const radii = pts.map((p) => Math.hypot(p.x - cx, p.y - cy));
  const sides = pts.map((p, i) => Math.hypot(p.x - pts[(i + 1) % pts.length].x, p.y - pts[(i + 1) % pts.length].y));
  return {
    regular: radii.every((r) => Math.abs(r - radii[0]) < 1e-6),
    bonds: sides.every((d) => Math.abs(d - sides[0]) < 1e-6),
  };
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

test('a drawn ring is named ciclopropano; Ordenar dibujo orders it, 90° view and reload fall back safely', async ({ page }) => {
  const errors = await openApp(page);
  await drawTriangle(page);
  const nameButton = page.getByRole('button', { name: '¿Cómo se llama?' });
  await nameButton.click();
  await expect(page.locator('#result-name')).toHaveText('ciclopropano');
  await expect(page.locator('#results .results-error')).toHaveCount(0);
  await expect(page.locator('#redraw-hint')).toContainText('¿Quieres ver el anillo ordenado?');
  // No locant numbers on an unnumbered ring.
  await expect(page.locator('svg#canvas .locant')).toHaveCount(0);

  // Ordenar dibujo draws the ring as a regular triangle; still no numbers, the ring highlighted.
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  expect(ringShape(await page.evaluate(() => window.__editor.getMoleculeJSON()), [1, 2, 3])).toEqual({ regular: true, bonds: true });
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .locant')).toHaveCount(0);
  await expect(page.locator('svg#canvas .hl-bond.hl-parent')).toHaveCount(3);
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

test('a hand-drawn substituted ring is 1-etil-3-metilciclohexano; Ordenar dibujo orders it', async ({ page }) => {
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
  await expect(page.locator('#redraw-hint')).toContainText('¿Quieres ver el anillo ordenado?');

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

  // Ordenar dibujo: a regular hexagon, locant 1 (atom 3) on top, 2 clockwise from it.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  expect(ringShape(after, [1, 2, 3, 4, 5, 6])).toEqual({ regular: true, bonds: true });
  const at = (id) => after.atoms.find((a) => a.id === id);
  expect(Math.min(...[1, 2, 3, 4, 5, 6].map((id) => at(id).y))).toBeCloseTo(at(3).y, 6);
  expect(at(2).x).toBeGreaterThan(at(3).x);
  await expect(page.locator('svg#canvas .locant')).toHaveCount(6);
  await expect(page.locator('svg#canvas .hl-bond.hl-parent')).toHaveCount(6);
  // One Deshacer brings the hand drawing back.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON())).toEqual(before);
  await expect(page.locator('#result-name')).toHaveText('1-etil-3-metilciclohexano');
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

test('benzene and toluene are named (I-28); a disubstituted benzene keeps its naming error', async ({ page }) => {
  const errors = await openApp(page);
  await loadSmiles(page, 'CC1C=CC=CC=1');
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('metilbenceno');
  await expect(page.locator('#alternatives')).toContainText('tolueno');
  await expect(page.locator('#redraw-hint')).toContainText('¿Quieres ver el anillo ordenado?');
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  await expect(stepper.locator('.step-dot')).toHaveCount(4);
  await stepper.locator('.step-dot').nth(1).click();
  await expect(stepper.locator('.step-title')).toHaveText('Reconoce el benceno');
  await expect(stepper.locator('.step-content')).toContainText('estructuras de Kekulé');
  // The three double bonds apart from the three single ring bonds.
  await expect(page.locator('svg#canvas .hl-bond.hl-candidate')).toHaveCount(3);
  await expect(page.locator('svg#canvas .hl-bond.hl-parent')).toHaveCount(3);
  // Ordenar dibujo orders the hexagon as one undoable edit.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  expect(after.atoms.map((a) => [a.x, a.y])).not.toEqual(before.atoms.map((a) => [a.x, a.y]));
  // Regression (I-28 review): the name has no locants, so the ordered benzene shows no ring numbers,
  // on any step of the stepper.
  await expect(page.locator('svg#canvas .locant')).toHaveCount(0);
  for (let i = 0; i < 4; i += 1) {
    await stepper.locator('.step-dot').nth(i).click();
    await expect(page.locator('svg#canvas .locant')).toHaveCount(0);
  }
  // A disubstituted benzene: CYCLE, no name, Ordenar dibujo shows the error and changes nothing.
  await loadSmiles(page, 'CC1=CC=CC=C1C');
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  const error = page.locator('#results .results-error');
  await expect(error).toHaveAttribute('data-code', 'CYCLE');
  await expect(error).toContainText('Este benceno tiene 2 sustituyentes');
  await expect(page.locator('#result-name')).toHaveCount(0);
  const unchanged = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect(page.locator('#results .results-error')).toHaveAttribute('data-code', 'CYCLE');
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON())).toEqual(unchanged);
  expect(errors).toEqual([]);
});

test('a ring from the ring tool plus a chain: the hint orders it, one Deshacer undoes it (I-27b)', async ({ page }) => {
  const errors = await openApp(page);
  // A propyl chain (Enlace simple: a click draws ethane, a click on atom 2 adds atom 3)…
  await clickCanvas(page, 0.25, 0.3);
  await expect.poll(() => page.evaluate(() => window.__editor.getMoleculeJSON().atoms.length)).toBe(2);
  await clickAtom(page, 2);
  // …and a cyclopentane hung from atom 3 with the ring tool.
  await page.getByRole('group', { name: 'Anillos' }).getByRole('button', { name: 'Anillo de 5 carbonos', exact: true }).click();
  await clickAtom(page, 3);
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(before.atoms).toHaveLength(8);
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('propilciclopentano');
  await expect(page.locator('#redraw-hint')).toContainText('¿Quieres ver el anillo ordenado?');

  await page.locator('#redraw-hint').getByRole('button', { name: 'Ordenar dibujo' }).click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  // The five ring atoms (ids 4–8) in ring order, walking the ring bonds from atom 4.
  const inRing = new Set([4, 5, 6, 7, 8]);
  const ring = [4];
  while (ring.length < 5) {
    const last = ring[ring.length - 1];
    const next = after.bonds.map((b) => (b.a === last ? b.b : b.b === last ? b.a : null))
      .find((id) => inRing.has(id) && !ring.includes(id));
    ring.push(next);
  }
  expect(ringShape(after, ring)).toEqual({ regular: true, bonds: true });
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-atom.hl-parent')).toHaveCount(5);

  // Locant labels from the numbering step on.
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  const titles = await stepper.locator('.step-dot').count();
  const dots = stepper.locator('.step-dot');
  for (let i = 0; i < titles; i += 1) {
    await dots.nth(i).click();
    if ((await stepper.locator('.step-title').textContent()) === 'Numera el anillo') {
      break;
    }
  }
  await expect(stepper.locator('.step-title')).toHaveText('Numera el anillo');
  await expect(page.locator('svg#canvas .locant')).toHaveCount(5);

  // One Deshacer restores the previous drawing.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON())).toEqual(before);
  await expect(page.locator('#result-name')).toHaveText('propilciclopentano');
  expect(errors).toEqual([]);
}); // End of test 'a ring from the ring tool plus a chain…'
