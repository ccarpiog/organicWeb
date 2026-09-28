/**
 * @file Acyl prefixes e2e (design.md §13.4 I-39b): molecules loaded through
 * the editor test API with a C=O carbon bonded to their chain as a branch
 * are named with `formil`, `acetil` or an `-oil` prefix (a ketone, an acid,
 * an ester and its O-bound group, an amide, a nitrile, an aldehyde); the
 * stepper for `3-acetilpentano-2,4-diona` explains the acyl branch (its
 * carbon not counted in the chain, the prefix `acetil`) and highlights it
 * whole; "Ordenar dibujo" lays one out; a –CO–C≡N branch is refused with
 * its message. Runs on the dev server and on dist/index.html.
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

test('an acetyl branch on a dione is named and explained, and Ordenar dibujo lays it out', async ({ page }) => {
  const errors = await openApp(page);
  await loadSmiles(page, 'CC(=O)C(C(C)=O)C(C)=O');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('3-acetilpentano-2,4-diona');
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
  } // End of the loop over the stepper steps
  expect(titles).toEqual(['Cuenta los carbonos', 'Reconoce el grupo funcional', 'Busca la cadena principal',
    'Numera la cadena', 'Nombra los sustituyentes', 'Monta el nombre']);
  expect(texts[0]).toContain('7 carbonos, 10 hidrógenos y 3 átomos de oxígeno (C₇H₁₀O₃)');
  expect(texts[1]).toContain('(un grupo acilo)');
  expect(texts[1]).toContain('se nombra con el prefijo «acetil-»');
  expect(texts[1]).toContain('no se cuenta en la cadena principal');
  expect(texts[2]).toContain('se nombra con «acetil-»');
  expect(texts[4]).toContain('En el carbono 3 hay un grupo acetilo: se escribe «3-acetil»');
  expect(texts[4]).toContain('prefiere a «etanoil»');
  expect(texts[5]).toContain('El nombre completo es «3-acetilpentano-2,4-diona»');
  // "Nombra los sustituyentes": the acetyl branch highlighted whole (its two carbons and its O).
  await dots.nth(4).click();
  await expect(page.locator('svg#canvas .hl-atom.hl-substituent')).toHaveCount(3);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // Ordenar dibujo lays it out (one undoable edit), keeping the atoms and bonds.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('3-acetilpentano-2,4-diona');
  expect(errors).toEqual([]);
}); // End of test 'an acetyl branch on a dione…'

test('loaded acyl molecules are named; a –CO–C≡N branch is refused', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['OC(=O)CC(C=O)CC(=O)O', 'ácido 3-formilpentanodioico'],
    ['OC(=O)C(C(=O)CC)CCCCC', 'ácido 2-propanoilheptanoico'],
    ['OC(=O)C(C(=O)C(C)C)CCCCCC', 'ácido 2-(2-metilpropanoil)octanoico'],
    ['CCOC(=O)CC(C=O)CC', '3-formilpentanoato de etilo'],
    ['CC(=O)OCC(C=O)CC', 'etanoato de 2-formilbutilo'],
    ['NC(=O)C(C(C)=O)CCC', '2-acetilpentanamida'],
    ['N#CC(C(C)=O)CCC', '2-acetilpentanonitrilo'],
    ['CCCC(C(C)=O)CC=O', '3-acetilhexanal'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
    await expect(page.locator('#results .results-error')).toHaveCount(0);
  } // End of the loop over the loaded molecules

  await loadSmiles(page, 'OC(=O)C(C(=O)C#N)CC');
  await askName(page);
  const error = page.locator('#results .results-error');
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('carbonocianidoil');
  await expect(page.locator('#result-name')).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test 'loaded acyl molecules…'
