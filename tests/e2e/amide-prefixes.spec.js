/**
 * @file Amide prefixes e2e (design.md §13.4 I-39d): molecules loaded
 * through the editor test API with an amide beside an acid or an ester,
 * or with two amides on different carbon pieces, are named with the amide
 * as a prefix — its carbon in the chain (`amino` + `oxo`), `carbamoil` or
 * `acilamino`; the stepper for `ácido 4-(metilamino)-4-oxobutanoico` says
 * the amide is not the principal group and how it is cited (never an
 * amine or a ketone), and highlights it whole; "Ordenar dibujo" lays one
 * out; three amides on one chain and a diamide with a group on its N are
 * refused with their messages. Runs on the dev server and on
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

test('a half amide is named and explained, the amide highlighted whole, and Ordenar dibujo lays it out', async ({ page }) => {
  const errors = await openApp(page);
  await loadSmiles(page, 'CNC(=O)CCC(=O)O');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('ácido 4-(metilamino)-4-oxobutanoico');
  await expect(page.locator('#results .results-error')).toHaveCount(0);

  const { titles, texts } = await readSteps(page);
  expect(titles).toEqual(['Cuenta los carbonos', 'Reconoce el grupo funcional', 'Busca la cadena principal',
    'Numera la cadena', 'Nombra los sustituyentes', 'Ordena alfabéticamente', 'Monta el nombre']);
  expect(texts[0]).toContain('5 carbonos, 9 hidrógenos, 1 átomo de nitrógeno y 3 átomos de oxígeno (C₅H₉NO₃)');
  expect(texts[1]).toContain('También tiene un grupo amida');
  expect(texts[1]).toContain('ácido > amida > aldehído');
  expect(texts[1]).toContain('su nitrógeno, junto con los grupos unidos a él, con el prefijo «amino-»');
  expect(texts[1]).not.toContain('una amina');
  expect(texts[2]).toContain('sí forma parte de la cadena');
  expect(texts[4]).toContain('«metilamino» no es una amina');
  expect(texts[6]).toContain('El nombre completo es «ácido 4-(metilamino)-4-oxobutanoico»');
  // "Reconoce el grupo funcional": the amide highlighted whole (its carbon, O, N and the methyl on the N).
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
  await expect(page.locator('#result-name')).toHaveText('ácido 4-(metilamino)-4-oxobutanoico');
  expect(errors).toEqual([]);
}); // End of test 'a half amide is named and explained…'

test('two amides on different pieces: the other one is acetilamino, and the tie-break says why', async ({ page }) => {
  const errors = await openApp(page);
  await loadSmiles(page, 'CC(=O)NCC(=O)N');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('2-(acetilamino)etanamida');
  const { titles, texts } = await readSteps(page);
  expect(titles).toContain('Desempates');
  expect(texts[1]).toContain('Tiene además otro grupo amida');
  expect(texts[titles.indexOf('Desempates')]).toContain('no los grupos unidos al nitrógeno del grupo amida principal');
  expect(errors).toEqual([]);
}); // End of test 'two amides on different pieces…'

test('loaded amide-prefix molecules are named; three amides on a chain and an N-substituted diamide are refused', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['NC(=O)CCC(=O)O', 'ácido 4-amino-4-oxobutanoico'],
    ['OC(=O)CC(C(=O)NC)CC(=O)O', 'ácido 3-(metilcarbamoil)pentanodioico'],
    ['CC(=O)NCC(=O)O', 'ácido 2-(acetilamino)etanoico'],
    ['CC(=O)N(C)CC(=O)O', 'ácido 2-[acetil(metil)amino]etanoico'],
    ['NC(=O)CCC(=O)OC', '4-amino-4-oxobutanoato de metilo'],
    ['OC(=O)CC(CC(N)=O)CCC', 'ácido 3-(2-amino-2-oxoetil)hexanoico'],
    ['NC(=O)CC(CC(N)=O)NC(C)=O', '3-(acetilamino)pentanodiamida'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
    await expect(page.locator('#results .results-error')).toHaveCount(0);
  } // End of the loop over the loaded molecules

  const error = page.locator('#results .results-error');
  await loadSmiles(page, 'NC(=O)CC(C(N)=O)CC(N)=O');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('más de dos grupos amida en la misma cadena');
  await expect(page.locator('#result-name')).toHaveCount(0);

  await loadSmiles(page, 'NC(=O)CCC(=O)NCC(N)=O');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('localizadores como N¹ y N⁴');
  expect(errors).toEqual([]);
}); // End of test 'loaded amide-prefix molecules…'
