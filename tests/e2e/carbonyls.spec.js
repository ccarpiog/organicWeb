/**
 * @file Aldehydes and ketones e2e (design.md §13.4 I-32): a C=O drawn with
 * the existing tools (a chain, Oxígeno on its last carbon, then Enlace doble
 * on that bond) is named propanal instead of refused, with the –CHO group,
 * the `-al` suffix and the uncited locant explained in the stepper and the
 * C=O (carbon and oxygen) highlighted on the canvas; molecules loaded
 * through the editor test API get their names (propanona with propan-2-ona
 * and acetona under "Otras formas válidas", etanal, butanodial,
 * pentano-2,4-diona, pent-3-en-2-ona, 4-oxopentanal, 4-hidroxibutan-2-ona,
 * ciclohexanona, 2-metilciclohexan-1-ona); "Ordenar dibujo" lays out a
 * carbonyl; an aldehyde on a ring, a –CO–C≡N branch and an anhydride are refused
 * with their messages. Runs on the dev server and on dist/index.html.
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

test('a C=O drawn with the bond tools is named propanal, with the –CHO group explained and highlighted', async ({ page }) => {
  const errors = await openApp(page);
  const tools = page.locator('#toolbar');
  // C–C from the empty canvas, two more carbons, Oxígeno on the last one, then Enlace doble on that bond.
  await clickCanvas(page, 0.4, 0.5);
  await clickAtom(page, 2);
  await clickAtom(page, 3);
  await tools.getByRole('button', { name: 'Oxígeno', exact: true }).click();
  await clickAtom(page, 4);
  await tools.getByRole('button', { name: 'Enlace doble' }).click();
  await clickBond(page, 3);
  const json = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(json.atoms.map((a) => a.element)).toEqual(['C', 'C', 'C', 'O']);
  expect(json.bonds.map((b) => b.order)).toEqual([1, 1, 2]);
  // The C=O oxygen is labelled O (no hydrogen).
  await expect(page.locator('svg#canvas text', { hasText: /^O$/ })).toHaveCount(1);

  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('propanal');
  await expect(page.locator('#results .results-error')).toHaveCount(0);
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
  expect(texts[0]).toContain('1 átomo de oxígeno (C₃H₆O)');
  expect(texts[1]).toContain('la molécula es un aldehído');
  expect(texts[1]).toContain('sufijo «-al»');
  expect(texts[3]).toContain('El carbono del grupo –CHO siempre es el 1, así que su número no se escribe');
  expect(texts[4]).toContain('La «o» final de «-ano» se quita delante de «-al»');
  // "Reconoce el grupo funcional": the C=O is highlighted whole, its carbon and its oxygen and the double bond.
  await dots.nth(1).click();
  await expect(page.locator('svg#canvas .hl-atom.hl-parent')).toHaveCount(2);
  await expect(page.locator('svg#canvas .hl-bond.hl-parent')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // Ordenar dibujo lays it out (one undoable edit), keeping the atoms and bonds.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  expect(after.atoms.map((a) => a.element)).toEqual(['C', 'C', 'C', 'O']);
  expect(errors).toEqual([]);
}); // End of test 'a C=O drawn with the bond tools is named propanal…'

test('loaded aldehydes and ketones: -al, -ona, oxo-, hidroxi-, rings, propanona and acetona; out-of-scope C=O refused', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['CC=O', 'etanal'],
    ['O=CCCC=O', 'butanodial'],
    ['CC(C)C=O', '2-metilpropanal'],
    ['CCC(C)=O', 'butan-2-ona'],
    ['CC(=O)CC(C)=O', 'pentano-2,4-diona'],
    ['CC=CC(C)=O', 'pent-3-en-2-ona'],
    ['CC(=O)CCC=O', '4-oxopentanal'],
    ['CC(=O)CCO', '4-hidroxibutan-2-ona'],
    ['O=C1CCCCC1', 'ciclohexanona'],
    ['CC1CCCCC1=O', '2-metilciclohexan-1-ona'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
  } // End of the loop over the loaded carbonyls

  await loadSmiles(page, 'CC(C)=O');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('propanona');
  await expect(page.locator('#alternatives')).toContainText('propan-2-ona');
  await expect(page.locator('#alternatives')).toContainText('acetona');
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  await stepper.locator('.step-dot').nth(3).click();
  await expect(stepper.locator('.step-title')).toHaveText('Numera la cadena');
  await expect(stepper.locator('.step-content')).toContainText('En «propanona» no hace falta el número');
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  const error = page.locator('#results .results-error');
  await loadSmiles(page, 'O=CCC(C=O)CC=O');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('carbaldehído');
  await expect(page.locator('#result-name')).toHaveCount(0);

  // An aldehyde on a ring is named since I-40b (tests/e2e/ring-acids.spec.js).
  await loadSmiles(page, 'O=CC1CCCCC1');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('ciclohexanocarbaldehído');

  // An acyl branch is named since I-39b (tests/e2e/acyl.spec.js); only –CO–C≡N keeps the refusal.
  await loadSmiles(page, 'OC(=O)C(C(=O)C#N)CC');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('carbonocianidoil');

  // An anhydride (acids are named since I-33, esters since I-35).
  await loadSmiles(page, 'CC(=O)OC(C)=O');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('aldehídos y cetonas');
  expect(errors).toEqual([]);
}); // End of test 'loaded aldehydes and ketones…'
