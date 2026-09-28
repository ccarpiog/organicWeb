/**
 * @file Halogen derivatives e2e (design.md §13.4 I-30): a molecule drawn with
 * the Cloro tool is named (cloroetano) instead of refused, with the halogen
 * explained as a prefix in the stepper; molecules loaded through the editor
 * test API get their names (2-metil-4-yodopentano with the Spanish
 * alphabetical order, clorobenceno); "Ordenar dibujo" lays out a halogen
 * derivative, the 90° view keeps the normal drawing, and a molecule with
 * an ester oxygen keeps its HETEROATOM refusal (ethers are named since
 * I-34: tests/e2e/ethers.spec.js). Runs on the dev server and on
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
 * Opens the stepper and returns the title and text of every step.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<{title: string, text: string}[]>} The steps, in order.
 */
async function readSteps(page) {
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  const dots = stepper.locator('.step-dot');
  const steps = [];
  for (let i = 0; i < await dots.count(); i += 1) {
    await dots.nth(i).click();
    steps.push({
      title: await stepper.locator('.step-title').textContent(),
      text: await stepper.locator('.step-content').textContent(),
    });
  }
  return steps;
}

test('a molecule drawn with the Cloro tool is named, with the halogen explained as a prefix', async ({ page }) => {
  const errors = await openApp(page);
  // C–C from the empty canvas, a third carbon, then Cloro on it: C–C–Cl.
  await clickCanvas(page, 0.4, 0.5);
  await clickAtom(page, 2);
  await page.locator('#toolbar').getByRole('button', { name: 'Cloro', exact: true }).click();
  await clickAtom(page, 3);
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.map((a) => a.element))).toEqual(['C', 'C', 'Cl']);

  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('cloroetano');
  await expect(page.locator('#results .results-error')).toHaveCount(0);
  const steps = await readSteps(page);
  const titles = steps.map((s) => s.title);
  expect(titles[0]).toBe('Cuenta los carbonos');
  expect(titles).toContain('Nombra los sustituyentes');
  expect(titles[titles.length - 1]).toBe('Monta el nombre');
  expect(steps[0].text).toContain('1 átomo de cloro (C₂H₅Cl)');
  const substituents = steps.find((s) => s.title === 'Nombra los sustituyentes').text;
  expect(substituents).toContain('«cloro-» (Cl)');
  expect(substituents).toContain('Un halógeno nunca va al final del nombre');
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // Ordenar dibujo lays it out (one undoable edit), keeping the atoms and bonds.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  expect(after.atoms.map((a) => a.element)).toEqual(['C', 'C', 'Cl']);

  // The 90° view keeps the normal drawing for a molecule with a halogen.
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await page.locator('#right-angle-button').click();
  expect(await page.evaluate(() => window.__editor.isProjected())).toBe(false);
  await expect(page.locator('#right-angle-note')).toHaveText('Hay átomos que no son carbono: se ve el dibujo normal.');
  expect(errors).toEqual([]);
}); // End of test 'a molecule drawn with the Cloro tool is named…'

test('loaded halogen derivatives: Spanish alphabetical order, halogen on benzene; an ester is still refused', async ({ page }) => {
  const errors = await openApp(page);
  await loadSmiles(page, 'CC(I)CC(C)C');
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('2-metil-4-yodopentano');
  const steps = await readSteps(page);
  const order = steps.find((s) => s.title === 'Ordena alfabéticamente').text;
  expect(order).toContain('«metil» va antes que «yodo» (m va antes que y).');
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  await loadSmiles(page, 'ClC1=CC=CC=C1');
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('clorobenceno');

  await loadSmiles(page, 'ClCCOC(C)=O');
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  const error = page.locator('#results .results-error');
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('derivados halogenados');
  await expect(page.locator('#result-name')).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test 'loaded halogen derivatives…'
