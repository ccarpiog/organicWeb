/**
 * @file Carboxylic acids e2e (design.md §13.4 I-33): a –COOH drawn with the
 * existing tools (a carbon with two more carbons on it, both turned into
 * oxygens with Oxígeno, then Enlace doble on one C–O bond) is named ácido etanoico instead of refused, with
 * ácido acético under "Otras formas válidas", the –COOH group, the word
 * «ácido», the `-oico` suffix and the uncited locant explained in the
 * stepper and the whole –COOH (carbon and both oxygens) highlighted on the
 * canvas; molecules loaded through the editor test API get their names
 * (ácido metanoico, ácido 2-metilpropanoico, ácido but-2-enoico, ácido
 * butanodioico, ácido 4-oxopentanoico, ácido 2-hidroxipropanoico, ácido
 * 3-oxopropanoico); "Ordenar dibujo" lays out an acid; three –COOH and an
 * acid with a ring are refused with their messages, and an acid with an
 * ester is named with the ester as a prefix (since I-39c). Runs on the dev
 * server and on dist/index.html.
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
 * Clicks on a bond of the drawing (its midpoint, as drawn).
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {number} id - Bond id.
 * @returns {Promise<void>}
 */
async function clickBond(page, id) {
  const p = await page.evaluate((bondId) => window.__editor.bondClientPoint(bondId), id);
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
 * Asks for the name of the current drawing.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<void>}
 */
async function askName(page) {
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
}

test('a –COOH drawn with the tools is named ácido etanoico, with the group explained and highlighted whole', async ({ page }) => {
  const errors = await openApp(page);
  const tools = page.locator('#toolbar');
  // C–C from the empty canvas, two more carbons on the second one, Oxígeno on both, then Enlace doble on the first C–O bond.
  await clickCanvas(page, 0.4, 0.5);
  await clickAtom(page, 2);
  await clickAtom(page, 2);
  await tools.getByRole('button', { name: 'Oxígeno', exact: true }).click();
  await clickAtom(page, 3);
  await clickAtom(page, 4);
  await tools.getByRole('button', { name: 'Enlace doble' }).click();
  await clickBond(page, 2);
  const json = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(json.atoms.map((a) => a.element)).toEqual(['C', 'C', 'O', 'O']);
  expect(json.bonds.map((b) => b.order)).toEqual([1, 2, 1]);
  // The C=O oxygen is labelled O, the other one OH.
  await expect(page.locator('svg#canvas text', { hasText: /^O$/ })).toHaveCount(1);

  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('ácido etanoico');
  await expect(page.locator('#results .results-error')).toHaveCount(0);
  await expect(page.locator('#alternatives')).toContainText('ácido acético');
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  const dots = stepper.locator('.step-dot');
  const titles = [];
  const texts = [];
  for (let i = 0; i < await dots.count(); i += 1) {
    await dots.nth(i).click();
    titles.push(await stepper.locator('.step-title').textContent());
    texts.push(await stepper.locator('.step-content').textContent());
  }
  expect(titles).toEqual(['Cuenta los carbonos', 'Reconoce el grupo funcional', 'Busca la cadena principal', 'Numera la cadena', 'Monta el nombre']);
  expect(texts[0]).toContain('2 átomos de oxígeno (C₂H₄O₂)');
  expect(texts[1]).toContain('la molécula es un ácido carboxílico');
  expect(texts[1]).toContain('el –OH del –COOH no es un alcohol');
  expect(texts[1]).toContain('el nombre empieza por la palabra «ácido» y termina con el sufijo «-oico»');
  expect(texts[3]).toContain('El carbono del grupo –COOH siempre es el 1, así que su número no se escribe');
  expect(texts[4]).toContain('Delante de todo va la palabra «ácido»');
  expect(texts[4]).toContain('La «o» final de «-ano» se quita delante de «-oico»');
  // "Reconoce el grupo funcional": the –COOH is highlighted whole, its carbon, both oxygens and both C–O bonds.
  await dots.nth(1).click();
  await expect(page.locator('svg#canvas .hl-atom.hl-parent')).toHaveCount(3);
  await expect(page.locator('svg#canvas .hl-bond.hl-parent')).toHaveCount(2);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // Ordenar dibujo lays it out (one undoable edit), keeping the atoms and bonds.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  expect(after.atoms.map((a) => a.element)).toEqual(['C', 'C', 'O', 'O']);
  expect(errors).toEqual([]);
}); // End of test 'a –COOH drawn with the tools is named ácido etanoico…'

test('loaded acids: ácido …oico, -dioico, oxo-, hidroxi-, ácido fórmico; out-of-scope acids refused', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['OC=O', 'ácido metanoico'],
    ['CC(C)C(=O)O', 'ácido 2-metilpropanoico'],
    ['CC=CC(=O)O', 'ácido but-2-enoico'],
    ['OC(=O)CCC(=O)O', 'ácido butanodioico'],
    ['CC(=O)CCC(=O)O', 'ácido 4-oxopentanoico'],
    ['CC(O)C(=O)O', 'ácido 2-hidroxipropanoico'],
    ['O=CCC(=O)O', 'ácido 3-oxopropanoico'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
  } // End of the loop over the loaded acids

  await loadSmiles(page, 'OC=O');
  await askName(page);
  await expect(page.locator('#alternatives')).toContainText('ácido fórmico');

  await loadSmiles(page, 'CC(C)C(=O)O');
  await askName(page);
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  await stepper.locator('.step-dot').nth(3).click();
  await expect(stepper.locator('.step-title')).toHaveText('Numera la cadena');
  await expect(stepper.locator('.step-content')).toContainText('Regla: los grupos –COOH (el grupo principal) deben tener los localizadores más bajos.');
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  const error = page.locator('#results .results-error');
  await loadSmiles(page, 'OC(=O)CC(CC(=O)O)C(=O)O');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('más de dos grupos –COOH');
  await expect(error).toContainText('-carboxílico');
  await expect(page.locator('#result-name')).toHaveCount(0);

  // An acid on a ring is named since I-40b (tests/e2e/ring-acids.spec.js).
  await loadSmiles(page, 'OC(=O)C1CCCCC1');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('ácido ciclohexanocarboxílico');
  await expect(error).toHaveCount(0);

  // An acid with an ester: the ester is a prefix, named since I-39c (tests/e2e/ester-prefixes.spec.js).
  await loadSmiles(page, 'CC(=O)OCC(=O)O');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('ácido 2-(acetiloxi)etanoico');
  await expect(error).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test 'loaded acids…'
