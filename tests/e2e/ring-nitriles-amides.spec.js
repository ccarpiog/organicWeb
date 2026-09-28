/**
 * @file Ring nitriles and amides e2e (design.md §13.4 I-40c): molecules
 * loaded through the editor test API with a –C≡N or an amide bonded to a
 * ring are named with `-carbonitrilo` / `-carboxamida`
 * (`2-metilciclohexano-1-carboxamida`), the retained `benzonitrilo` and
 * `benzamida` (with the systematic names under "Otras formas válidas"),
 * groups on the amide N with the letter N (`N-metilbenzamida`); a ring on
 * an amide N is an N prefix (`N-feniletanamida`, with `N-fenilacetamida`);
 * on a side chain the chain is the parent (`2-feniletanonitrilo`, with
 * `fenilacetonitrilo`); below an acid the ring groups are `ciano-` /
 * `carbamoil-`; the stepper explains that the group's carbon is not a ring
 * carbon; "Ordenar dibujo" lays a ring amide out; a ring ester beside a
 * chain ester, an N-substituted ring diamide and a polysubstituted benzene
 * stay refused.
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

test('an amide on a ring: -carboxamida, explained step by step, and Ordenar dibujo lays it out', async ({ page }) => {
  const errors = await openApp(page);
  await loadSmiles(page, 'NC(=O)C1CCCCC1C');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('2-metilciclohexano-1-carboxamida');
  await expect(page.locator('#results .results-error')).toHaveCount(0);

  const { titles, texts } = await readSteps(page);
  expect(titles).toEqual(['Cuenta los carbonos', 'Reconoce el grupo funcional', 'Busca el anillo', 'Numera el anillo',
    'Nombra los sustituyentes', 'Monta el nombre']);
  expect(texts[0]).toContain('(C₈H₁₅NO)');
  expect(texts[1]).toContain('Su carbono no forma parte del anillo');
  expect(texts[1]).toContain('«-carboxamida»');
  expect(texts[2]).toContain('ni su carbono ni su oxígeno ni su nitrógeno se cuentan en el anillo');
  expect(texts[3]).toContain('el carbono del anillo unido a la amida es el 1');
  expect(texts[5]).toContain('El carbono de la amida no tiene número');
  expect(texts[5]).toContain('El nombre completo es «2-metilciclohexano-1-carboxamida»');
  // «Reconoce el grupo funcional»: the whole amide (its carbon, O and N) is highlighted.
  const stepper = page.locator('#stepper');
  await stepper.locator('.step-dot').nth(1).click();
  await expect(page.locator('svg#canvas .hl-atom.hl-parent')).toHaveCount(4);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // Ordenar dibujo lays it out (one undoable edit), keeping the atoms and bonds.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  expect(after.atoms.map((a) => [a.x, a.y])).not.toEqual(before.atoms.map((a) => [a.x, a.y]));
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('2-metilciclohexano-1-carboxamida');
  expect(errors).toEqual([]);
}); // End of test 'an amide on a ring…'

test('benzene: benzonitrilo and N-metilbenzamida with their systematic names; the -acet- names of N-fenil and side chains', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name, other] of [
    ['N#CC1=CC=CC=C1', 'benzonitrilo', 'bencenocarbonitrilo'],
    ['NC(=O)C1=CC=CC=C1', 'benzamida', 'bencenocarboxamida'],
    ['CNC(=O)C1=CC=CC=C1', 'N-metilbenzamida', 'N-metilbencenocarboxamida'],
    ['CC(=O)NC1=CC=CC=C1', 'N-feniletanamida', 'N-fenilacetamida'],
    ['N#CCC1=CC=CC=C1', '2-feniletanonitrilo', 'fenilacetonitrilo'],
    ['NC(=O)CC1=CC=CC=C1', '2-feniletanamida', '2-fenilacetamida'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
    await expect(page.locator('#alternatives')).toContainText('Otras formas válidas');
    await expect(page.locator('#alternatives')).toContainText(other);
  } // End of the loop over the benzene derivatives
  await loadSmiles(page, 'CNC(=O)C1=CC=CC=C1');
  await askName(page);
  const { titles, texts } = await readSteps(page);
  expect(titles).toEqual(['Cuenta los carbonos', 'Reconoce el grupo funcional', 'Reconoce el benceno', 'Nombra los sustituyentes',
    'Monta el nombre']);
  expect(texts[2]).toContain('tiene nombre propio: «benzamida»');
  expect(texts[2]).toContain('El anillo sigue teniendo un solo sustituyente, el grupo amida');
  expect(texts[4]).toContain('«benz» es el anillo y «-amida», el grupo amida');
  expect(errors).toEqual([]);
}); // End of test 'benzene…'

test('loaded ring nitriles and amides are named; two esters apart, N-substituted ring diamides and polysubstituted benzenes stay refused', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['N#CC1CCCCC1', 'ciclohexanocarbonitrilo'],
    ['NC(=O)C1CCCC1', 'ciclopentanocarboxamida'],
    ['N#CC1C=CCCC1', 'ciclohex-2-eno-1-carbonitrilo'],
    ['N#CC1CCCCC1C#N', 'ciclohexano-1,2-dicarbonitrilo'],
    ['CNC(=O)C1CCCCC1', 'N-metilciclohexanocarboxamida'],
    ['CC(=O)NC1CCCCC1', 'N-ciclohexiletanamida'],
    ['NC(=O)CCC1CCCCC1', '3-ciclohexilpropanamida'],
    ['N#CCC1CCC(C#N)CC1', '4-(cianometil)ciclohexano-1-carbonitrilo'],
    ['OC(=O)C1CCC(C#N)CC1', 'ácido 4-cianociclohexano-1-carboxílico'],
    ['OC(=O)C1CCC(C(N)=O)CC1', 'ácido 4-carbamoilciclohexano-1-carboxílico'],
    ['OC(=O)C(C(=O)O)C1CCC(C#N)CC1', 'ácido 2-(4-cianociclohexil)propanodioico'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
    await expect(page.locator('#results .results-error')).toHaveCount(0);
  } // End of the loop over the loaded molecules

  // «Anillo o cadena»: a ring on the amide N counts for nothing, the chain wins.
  await loadSmiles(page, 'CC(=O)NC1=CC=CC=C1');
  await askName(page);
  const { titles, texts } = await readSteps(page);
  expect(titles[2]).toBe('Anillo o cadena');
  expect(texts[2]).toContain('El anillo no lleva ningún grupo amida y la mejor cadena abierta lleva un grupo amida: gana la cadena');
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  const error = page.locator('#results .results-error');
  for (const [smiles, code, text] of [
    ['N#CC1CCC(C(=O)OC)C(CC(=O)OC)C1', 'HETEROATOM', 'un oxígeno, un nitrógeno o un anillo'],
    ['CNC(=O)C1CCC(C(N)=O)CC1', 'HETEROATOM', 'localizadores como N¹ y N⁴'],
    ['N#CC1=CC=C(C)C=C1', 'CYCLE', 'Este benceno tiene 2 sustituyentes'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(error).toHaveAttribute('data-code', code);
    await expect(error).toContainText(text);
    await expect(page.locator('#result-name')).toHaveCount(0);
  } // End of the loop over the refused molecules
  expect(errors).toEqual([]);
}); // End of test 'loaded ring nitriles and amides…'
