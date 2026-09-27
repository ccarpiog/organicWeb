/**
 * @file Alcohols e2e (design.md §13.4 I-31): a molecule drawn with the
 * Oxígeno tool (C–C–OH) is named etanol instead of refused, with the –OH
 * group, the `-ol` suffix and the omitted locant explained in the stepper
 * and the OH shown on the canvas; molecules loaded through the editor test
 * API get their names (propan-2-ol, prop-2-en-1-ol with the OH numbered
 * before the double bond, ciclohexanol, fenol); "Ordenar dibujo" lays out an
 * alcohol; an acid and an OH on a ring's side chain are still refused. Runs
 * on the dev server and on dist/index.html.
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

/**
 * Asks for the name of the current drawing.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<void>}
 */
async function askName(page) {
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
}

test('a molecule drawn with the Oxígeno tool is named etanol, with the –OH group explained', async ({ page }) => {
  const errors = await openApp(page);
  // C–C from the empty canvas, a third carbon, then Oxígeno on it: C–C–OH.
  await clickCanvas(page, 0.4, 0.5);
  await clickAtom(page, 2);
  await page.locator('#toolbar').getByRole('button', { name: 'Oxígeno', exact: true }).click();
  await clickAtom(page, 3);
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.map((a) => a.element))).toEqual(['C', 'C', 'O']);
  // The OH is shown on the canvas.
  await expect(page.locator('svg#canvas text', { hasText: /^OH$/ })).toHaveCount(1);

  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('etanol');
  await expect(page.locator('#results .results-error')).toHaveCount(0);
  const steps = await readSteps(page);
  const titles = steps.map((s) => s.title);
  expect(titles).toEqual(['Cuenta los carbonos', 'Reconoce el grupo funcional', 'Busca la cadena principal', 'Numera la cadena', 'Monta el nombre']);
  expect(steps[0].text).toContain('1 átomo de oxígeno (C₂H₆O)');
  expect(steps[1].text).toContain('la molécula es un alcohol');
  expect(steps[1].text).toContain('sufijo «-ol»');
  expect(steps[3].text).toContain('En «etanol» no hace falta el número');
  expect(steps[4].text).toContain('La «o» final de «-ano» se quita delante de «-ol»');
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // Ordenar dibujo lays it out (one undoable edit), keeping the atoms and bonds.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  expect(after.atoms.map((a) => a.element)).toEqual(['C', 'C', 'O']);
  expect(errors).toEqual([]);
}); // End of test 'a molecule drawn with the Oxígeno tool is named etanol…'

test('loaded alcohols: suffix locants, OH before the double bond, rings and fenol; acids stay refused', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['CC(O)C', 'propan-2-ol'],
    ['OCCO', 'etano-1,2-diol'],
    ['OC1CCCCC1', 'ciclohexanol'],
    ['CC1CCCCC1O', '2-metilciclohexan-1-ol'],
    ['OC1=CC=CC=C1', 'fenol'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
  } // End of the loop over the loaded alcohols

  await loadSmiles(page, 'C=CCO');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('prop-2-en-1-ol');
  const steps = await readSteps(page);
  const numbering = steps.find((s) => s.title === 'Numera la cadena').text;
  expect(numbering).toContain('Regla: los grupos –OH (el grupo principal) deben tener los localizadores más bajos.');
  expect(numbering).toContain('el enlace doble tendría el número 1 en vez del 2, pero manda el –OH');
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  await loadSmiles(page, 'CC(=O)O');
  await askName(page);
  const error = page.locator('#results .results-error');
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('y alcoholes');
  await expect(page.locator('#result-name')).toHaveCount(0);

  await loadSmiles(page, 'OCC1=CC=CC=C1');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('cuando el –OH está unido directamente al anillo');
  expect(errors).toEqual([]);
}); // End of test 'loaded alcohols…'
