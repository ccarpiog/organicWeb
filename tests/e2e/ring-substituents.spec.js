/**
 * @file Rings as substituents e2e (design.md §13.4 I-40a): molecules loaded
 * through the editor test API with an OH, a ketone or an amine on a ring's
 * side chain are named with the chain as the parent and the ring as a
 * prefix (`2-ciclohexiletan-1-ol`, `1-feniletan-1-ona`, `fenilmetanamina`…);
 * the stepper's «Anillo o cadena» step says why the chain wins (the
 * principal group first) and highlights the ring and the chain apart; a
 * ring and a chain with as many groups each keep the ring as the parent;
 * the traditional names are listed under "Otras formas válidas"; "Ordenar
 * dibujo" lays a ring prefix out; two identical principal branches on a
 * ring and two esters on two side chains of the ring are refused with
 * their messages (an acyl group on the ring and aldehydes are named since
 * I-40b, tests/e2e/ring-acids.spec.js; nitriles and amides since I-40c;
 * ring esters since I-40d, tests/e2e/ring-esters.spec.js).
 * Runs on the dev server and on dist/index.html.
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

test('an OH on a ring side chain: the chain is the parent, explained step by step, and Ordenar dibujo lays it out', async ({ page }) => {
  const errors = await openApp(page);
  await loadSmiles(page, 'OCCC1CCCCC1');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('2-ciclohexiletan-1-ol');
  await expect(page.locator('#results .results-error')).toHaveCount(0);

  const { titles, texts } = await readSteps(page);
  expect(titles).toEqual(['Cuenta los carbonos', 'Reconoce el grupo funcional', 'Anillo o cadena', 'Busca la cadena principal',
    'Numera la cadena', 'Nombra los sustituyentes', 'Monta el nombre']);
  expect(texts[0]).toContain('(C₈H₁₆O)');
  expect(texts[2]).toContain('lo primero es el grupo principal');
  expect(texts[2]).toContain('gana la cadena');
  expect(texts[2]).toContain('se nombra «ciclohexil»');
  expect(texts[3]).toContain('Sin contar los carbonos del anillo');
  expect(texts[5]).toContain('es un anillo de 6 carbonos');
  expect(texts[6]).toContain('El nombre completo es «2-ciclohexiletan-1-ol»');
  // «Anillo o cadena»: the ring (as a substituent) and the chain (as the parent) highlighted apart.
  const stepper = page.locator('#stepper');
  await stepper.locator('.step-dot').nth(2).click();
  await expect(page.locator('svg#canvas .hl-atom.hl-substituent')).toHaveCount(6);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // Ordenar dibujo lays it out (one undoable edit), keeping the atoms and bonds.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  expect(after.atoms.map((a) => [a.x, a.y])).not.toEqual(before.atoms.map((a) => [a.x, a.y]));
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('2-ciclohexiletan-1-ol');
  expect(errors).toEqual([]);
}); // End of test 'an OH on a ring side chain…'

test('ketones and amines beside a benzene, with their traditional names; a tie keeps the ring', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name, traditional] of [
    ['CC(=O)C1=CC=CC=C1', '1-feniletan-1-ona', 'acetofenona'],
    ['OCC1=CC=CC=C1', 'fenilmetanol', 'alcohol bencílico'],
    ['NCC1=CC=CC=C1', 'fenilmetanamina', 'bencilamina'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
    await expect(page.locator('#alternatives')).toContainText('Otras formas válidas');
    await expect(page.locator('#alternatives')).toContainText(traditional);
  } // End of the loop over the benzene derivatives
  await loadSmiles(page, 'OCC1CCC(O)CC1');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('4-(hidroximetil)ciclohexan-1-ol');
  const { titles, texts } = await readSteps(page);
  expect(titles.slice(2, 4)).toEqual(['Anillo o cadena', 'Busca el anillo']);
  expect(texts[2]).toContain('hay empate, así que manda el anillo');
  expect(errors).toEqual([]);
}); // End of test 'ketones and amines beside a benzene…'

test('loaded ring-prefix molecules are named; identical principal branches and two esters apart are refused', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['CC(O)C1=CC=CC=C1', '1-feniletan-1-ol'],
    ['CCC(=O)C1=CC=CC=C1', '1-fenilpropan-1-ona'],
    ['CC(=O)C1CCCCC1', '1-ciclohexiletan-1-ona'],
    ['NCCC1=CC=CC=C1', '2-feniletan-1-amina'],
    ['OCC(C)C1CCCCC1C', '2-(2-metilciclohexil)propan-1-ol'],
    ['OCCC1C=CCCC1', '2-(ciclohex-2-en-1-il)etan-1-ol'],
    ['OCCOC1=CC=CC=C1', '2-fenoxietan-1-ol'],
    ['OCCNC1CCCCC1', '2-(ciclohexilamino)etan-1-ol'],
    ['ClC(O)C1=CC=CC=C1', 'cloro(fenil)metanol'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
    await expect(page.locator('#results .results-error')).toHaveCount(0);
  } // End of the loop over the loaded molecules

  const error = page.locator('#results .results-error');
  await loadSmiles(page, 'OCC1CCC(CO)CC1');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('ciclohexano-1,4-diildimetanol');
  await expect(page.locator('#result-name')).toHaveCount(0);

  // Ring esters are named since I-40d; two esters on two side chains of the ring stay refused.
  await loadSmiles(page, 'COC(=O)CC1CCC(CCC(=O)OC)CC1');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('dos grupos –COO– (éster)');
  expect(errors).toEqual([]);
}); // End of test 'loaded ring-prefix molecules…'
