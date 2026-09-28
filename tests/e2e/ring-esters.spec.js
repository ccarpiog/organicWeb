/**
 * @file Ring esters e2e (design.md §13.4 I-40d): molecules loaded through
 * the editor test API with an ester –COO– and a ring are named: the ring
 * on the acid side with `-carboxilato` (`2-metilciclohexano-1-carboxilato
 * de etilo`) or the retained `benzoato` (with `bencenocarboxilato` under
 * "Otras formas válidas"), the ring on the O side as a ring group
 * (`etanoato de fenilo`, with `acetato de fenilo`), a ring on each side
 * (`benzoato de fenilo`), the ring on a side chain as a prefix
 * (`2-feniletanoato de metilo`, with `fenilacetato de metilo`), and ester
 * prefixes on a ring below an acid; the stepper separates the two parts of
 * the ester; "Ordenar dibujo" lays a two-ring ester out; a lactone, a mixed
 * ring diester and a ring ester beside a chain ester stay refused. Runs on
 * the dev server and on dist/index.html.
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

test('a ring ester: -carboxilato, its two parts separated step by step, and Ordenar dibujo lays it out', async ({ page }) => {
  const errors = await openApp(page);
  await loadSmiles(page, 'CCOC(=O)C1CCCCC1C');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('2-metilciclohexano-1-carboxilato de etilo');
  await expect(page.locator('#results .results-error')).toHaveCount(0);

  const { titles, texts } = await readSteps(page);
  expect(titles).toEqual(['Cuenta los carbonos', 'Reconoce el grupo funcional', 'Separa las dos partes del éster', 'Busca el anillo',
    'Numera el anillo', 'Nombra los sustituyentes', 'Monta el nombre']);
  expect(texts[0]).toContain('(C₁₀H₁₈O₂)');
  expect(texts[1]).toContain('Su carbono no forma parte del anillo');
  expect(texts[1]).toContain('«-carboxilato»');
  expect(texts[2]).toContain('La parte del ácido es el anillo de 6 carbonos, con el carbono del C=O, que está fuera del anillo');
  expect(texts[2]).toContain('cambiando «-ílico» por «-ilato»: «2-metilciclohexano-1-carboxilato»');
  expect(texts[3]).toContain('ni su carbono ni sus oxígenos se cuentan en el anillo');
  expect(texts[6]).toContain('El carbono del –COO– no tiene número');
  expect(texts[6]).toContain('El nombre completo es «2-metilciclohexano-1-carboxilato de etilo»');
  // «Separa las dos partes del éster»: the acid part (the ring, its methyl, the C=O carbon and its O), the ethyl
  // group and the middle O apart.
  const stepper = page.locator('#stepper');
  await stepper.locator('.step-dot').nth(2).click();
  await expect(page.locator('svg#canvas .hl-atom.hl-parent')).toHaveCount(9);
  await expect(page.locator('svg#canvas .hl-atom.hl-substituent')).toHaveCount(2);
  await expect(page.locator('svg#canvas .hl-atom.hl-candidate')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();
  expect(errors).toEqual([]);
}); // End of test 'a ring ester…'

test('rings on the O side and on both sides: fenilo, benzoato de fenilo, the traditional and systematic forms', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name, other] of [
    ['COC(=O)C1=CC=CC=C1', 'benzoato de metilo', 'bencenocarboxilato de metilo'],
    ['CC(=O)OC1=CC=CC=C1', 'etanoato de fenilo', 'acetato de fenilo'],
    ['CC(=O)OC1CCCCC1', 'etanoato de ciclohexilo', 'acetato de ciclohexilo'],
    ['COC(=O)CC1=CC=CC=C1', '2-feniletanoato de metilo', 'fenilacetato de metilo'],
    ['O=C(OC1=CC=CC=C1)C1=CC=CC=C1', 'benzoato de fenilo', 'bencenocarboxilato de fenilo'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
    await expect(page.locator('#alternatives')).toContainText('Otras formas válidas');
    await expect(page.locator('#alternatives')).toContainText(other);
  } // End of the loop over the molecules with other valid forms
  // The two-ring ester: explained with the benzene step, laid out by Ordenar dibujo.
  const { titles, texts } = await readSteps(page);
  expect(titles).toEqual(['Cuenta los carbonos', 'Reconoce el grupo funcional', 'Separa las dos partes del éster', 'Reconoce el benceno',
    'Monta el nombre']);
  expect(texts[2]).toContain('«fenilo» es el benceno como grupo');
  expect(texts[3]).toContain('tiene nombre propio: «benzoato»');
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  expect(after.atoms.map((a) => [a.x, a.y])).not.toEqual(before.atoms.map((a) => [a.x, a.y]));
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('benzoato de fenilo');
  expect(errors).toEqual([]);
}); // End of test 'rings on the O side and on both sides…'

test('loaded ring esters are named; a lactone, a mixed ring diester and two esters apart stay refused', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['COC(=O)C1CCCC1', 'ciclopentanocarboxilato de metilo'],
    ['COC(=O)C1C=CCCC1', 'ciclohex-2-eno-1-carboxilato de metilo'],
    ['COC(=O)C1CCC(C(=O)OC)CC1', 'ciclohexano-1,4-dicarboxilato de dimetilo'],
    ['CC(=O)OC1CCCCC1C', 'etanoato de 2-metilciclohexilo'],
    ['O=C(OC1CCCCC1C)C1CCCCC1', 'ciclohexanocarboxilato de 2-metilciclohexilo'],
    ['COC(=O)C1CCC(C(=O)O)CC1', 'ácido 4-(metoxicarbonil)ciclohexano-1-carboxílico'],
    ['CC(=O)OC1CCC(C(=O)O)CC1', 'ácido 4-(acetiloxi)ciclohexano-1-carboxílico'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
    await expect(page.locator('#results .results-error')).toHaveCount(0);
  } // End of the loop over the loaded molecules

  // «Anillo o cadena»: a ring on the O counts for nothing, the chain wins.
  await loadSmiles(page, 'CC(=O)OC1=CC=CC=C1');
  await askName(page);
  const { titles, texts } = await readSteps(page);
  expect(titles[3]).toBe('Anillo o cadena');
  expect(texts[3]).toContain('El anillo está al otro lado del oxígeno del medio del –COO–');
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  const error = page.locator('#results .results-error');
  for (const [smiles, code, text] of [
    ['O=C1CCCCO1', 'RING_SYSTEM', 'Esta molécula es una lactona'],
    ['CCOC(=O)C1CCCCC1C(=O)OC', 'HETEROATOM', 'en qué carbono del anillo está cada grupo'],
    ['COC(=O)C1CCC(CC(=O)OC)CC1', 'HETEROATOM', 'un oxígeno, un nitrógeno o un anillo'],
    ['COC(=O)C1=CC=C(C)C=C1', 'CYCLE', 'Este benceno tiene 2 sustituyentes'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(error).toHaveAttribute('data-code', code);
    await expect(error).toContainText(text);
    await expect(page.locator('#result-name')).toHaveCount(0);
  } // End of the loop over the refused molecules
  expect(errors).toEqual([]);
}); // End of test 'loaded ring esters…'
