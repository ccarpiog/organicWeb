/**
 * @file Ester prefixes and diesters e2e (design.md §13.4 I-39c): molecules
 * loaded through the editor test API with an ester beside an acid are named
 * with the ester as a prefix — its carbon in the chain (`alcoxi` + `oxo`),
 * `alcoxicarbonil` or `aciloxi` — and diesters on one chain as `-dioato de
 * di…ilo` or `… de etilo y metilo`; the stepper for `ácido
 * 4-metoxi-4-oxobutanoico` says the ester is not the principal group and
 * how it is cited, and highlights it whole; the stepper for a diester has
 * its own "Separa las partes del diéster" step; "Ordenar dibujo" lays one
 * out; esters on different carbon pieces and three esters are refused with
 * their messages. Runs on the dev server and on dist/index.html.
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

/**
 * Opens the stepper and reads the title and text of every step.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<{titles: string[], texts: string[]}>} The titles and texts, in order.
 */
async function readSteps(page) {
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
  return { titles, texts };
}

test('a half ester is named and explained, the ester highlighted whole, and Ordenar dibujo lays it out', async ({ page }) => {
  const errors = await openApp(page);
  await loadSmiles(page, 'COC(=O)CCC(=O)O');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('ácido 4-metoxi-4-oxobutanoico');
  await expect(page.locator('#results .results-error')).toHaveCount(0);

  const { titles, texts } = await readSteps(page);
  expect(titles).toEqual(['Cuenta los carbonos', 'Reconoce el grupo funcional', 'Busca la cadena principal',
    'Numera la cadena', 'Nombra los sustituyentes', 'Ordena alfabéticamente', 'Monta el nombre']);
  expect(texts[0]).toContain('5 carbonos, 8 hidrógenos y 4 átomos de oxígeno (C₅H₈O₄)');
  expect(texts[1]).toContain('También tiene un grupo –COO– (un éster)');
  expect(texts[1]).toContain('ácido > éster > aldehído');
  expect(texts[1]).toContain('su C=O se nombra con «oxo-»');
  expect(texts[2]).toContain('sí forma parte de la cadena');
  expect(texts[4]).toContain('«metoxi» no es un éter');
  expect(texts[6]).toContain('El nombre completo es «ácido 4-metoxi-4-oxobutanoico»');
  // "Reconoce el grupo funcional": the ester highlighted whole (its carbon, both O and the methyl).
  const stepper = page.locator('#stepper');
  await stepper.locator('.step-dot').nth(1).click();
  await expect(page.locator('svg#canvas .hl-atom.hl-substituent')).toHaveCount(4);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // Ordenar dibujo lays it out (one undoable edit), keeping the atoms and bonds.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('ácido 4-metoxi-4-oxobutanoico');
  expect(errors).toEqual([]);
}); // End of test 'a half ester is named and explained…'

test('a diester gets its own step: the acid part and both groups', async ({ page }) => {
  const errors = await openApp(page);
  await loadSmiles(page, 'COC(=O)CC(=O)OCC');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('propanodioato de etilo y metilo');
  const { titles, texts } = await readSteps(page);
  expect(titles).toEqual(['Cuenta los carbonos', 'Reconoce el grupo funcional', 'Separa las partes del diéster',
    'Busca la cadena principal', 'Numera la cadena', 'Monta el nombre']);
  expect(texts[1]).toContain('la molécula es un diéster');
  expect(texts[2]).toContain('separan la molécula en tres partes');
  expect(texts[2]).toContain('en orden alfabético y unidos por «y»');
  expect(texts[5]).toContain('«ethyl methyl propanedioate»');
  expect(errors).toEqual([]);
}); // End of test 'a diester gets its own step…'

test('loaded ester-prefix molecules and diesters are named; esters on different pieces and three esters are refused', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['OC(=O)CC(C(=O)OC)CC(=O)O', 'ácido 3-(metoxicarbonil)pentanodioico'],
    ['CC(=O)OCC(=O)O', 'ácido 2-(acetiloxi)etanoico'],
    ['O=COC(C)C(=O)O', 'ácido 2-(formiloxi)propanoico'],
    ['CC(C)C(=O)OCC(=O)O', 'ácido 2-[(2-metilpropanoil)oxi]etanoico'],
    ['OC(=O)CC(CC(=O)OC)CCC', 'ácido 3-(2-metoxi-2-oxoetil)hexanoico'],
    ['COC(=O)CCC(=O)OC', 'butanodioato de dimetilo'],
    ['ClCCOC(=O)CCC(=O)OCCCl', 'butanodioato de bis(2-cloroetilo)'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
    await expect(page.locator('#results .results-error')).toHaveCount(0);
  } // End of the loop over the loaded molecules

  const error = page.locator('#results .results-error');
  await loadSmiles(page, 'CC(=O)OCCOC(C)=O');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('no están en la misma cadena de carbonos');
  await expect(page.locator('#result-name')).toHaveCount(0);

  await loadSmiles(page, 'COC(=O)CC(C(=O)OC)CC(=O)OC');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('más de dos grupos –COO–');
  expect(errors).toEqual([]);
}); // End of test 'loaded ester-prefix molecules and diesters…'
