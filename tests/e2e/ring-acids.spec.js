/**
 * @file Ring acids, aldehydes and ring acyl prefixes e2e (design.md §13.4
 * I-40b): molecules loaded through the editor test API with a –COOH or a
 * –CHO bonded to a ring are named with `-carboxílico` / `-carbaldehído`
 * (`ácido 2-metilciclohexano-1-carboxílico`), the retained `ácido benzoico`
 * and `benzaldehído` (with the systematic names under "Otras formas
 * válidas"); on a side chain the chain is the parent (`ácido
 * 2-feniletanoico`, with `ácido fenilacético`); `carboxi-`, `benzoil` and
 * `(ciclohexanocarbonil)` prefixes are named; the stepper explains that
 * the group's carbon is not a ring carbon; "Ordenar dibujo" lays a ring
 * acid out; a ring ester beside a chain ester stays refused (nitriles and
 * amides with a ring are named since I-40c, ring-nitriles-amides.spec.js;
 * ring esters since I-40d, ring-esters.spec.js). Runs on the dev server and
 * on dist/index.html.
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

test('a –COOH on a ring: -carboxílico, explained step by step, and Ordenar dibujo lays it out', async ({ page }) => {
  const errors = await openApp(page);
  await loadSmiles(page, 'OC(=O)C1CCCCC1C');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('ácido 2-metilciclohexano-1-carboxílico');
  await expect(page.locator('#results .results-error')).toHaveCount(0);

  const { titles, texts } = await readSteps(page);
  expect(titles).toEqual(['Cuenta los carbonos', 'Reconoce el grupo funcional', 'Busca el anillo', 'Numera el anillo',
    'Nombra los sustituyentes', 'Monta el nombre']);
  expect(texts[0]).toContain('(C₈H₁₄O₂)');
  expect(texts[1]).toContain('Su carbono no forma parte del anillo');
  expect(texts[1]).toContain('«-carboxílico»');
  expect(texts[2]).toContain('ni su carbono ni sus oxígenos se cuentan en el anillo');
  expect(texts[3]).toContain('el carbono del anillo unido al –COOH es el 1');
  expect(texts[5]).toContain('El carbono del –COOH no tiene número');
  expect(texts[5]).toContain('El nombre completo es «ácido 2-metilciclohexano-1-carboxílico»');
  // «Reconoce el grupo funcional»: the whole –COOH (its carbon and both oxygens) is highlighted.
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
  await expect(page.locator('#result-name')).toHaveText('ácido 2-metilciclohexano-1-carboxílico');
  expect(errors).toEqual([]);
}); // End of test 'a –COOH on a ring…'

test('benzene: ácido benzoico and benzaldehído, with their systematic names; -acético names for the side chains', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name, other] of [
    ['OC(=O)C1=CC=CC=C1', 'ácido benzoico', 'ácido bencenocarboxílico'],
    ['O=CC1=CC=CC=C1', 'benzaldehído', 'bencenocarbaldehído'],
    ['OC(=O)CC1=CC=CC=C1', 'ácido 2-feniletanoico', 'ácido fenilacético'],
    ['O=CCC1=CC=CC=C1', '2-feniletanal', 'fenilacetaldehído'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
    await expect(page.locator('#alternatives')).toContainText('Otras formas válidas');
    await expect(page.locator('#alternatives')).toContainText(other);
  } // End of the loop over the benzene derivatives
  await loadSmiles(page, 'OC(=O)C1=CC=CC=C1');
  await askName(page);
  const { titles, texts } = await readSteps(page);
  expect(titles).toEqual(['Cuenta los carbonos', 'Reconoce el grupo funcional', 'Reconoce el benceno', 'Monta el nombre']);
  expect(texts[2]).toContain('tiene nombre propio: «ácido benzoico»');
  expect(texts[3]).toContain('«benz» es el anillo y «-oico», el grupo –COOH');
  expect(errors).toEqual([]);
}); // End of test 'benzene…'

test('loaded ring acids, aldehydes and ring acyl prefixes are named; a ring ester beside a chain ester stays refused', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['O=CC1CCCCC1', 'ciclohexanocarbaldehído'],
    ['OC(=O)C1CCCC1', 'ácido ciclopentanocarboxílico'],
    ['O=CC1CCCC(Cl)C1', '3-clorociclohexano-1-carbaldehído'],
    ['OC(=O)C1CCCCC1C(=O)O', 'ácido ciclohexano-1,2-dicarboxílico'],
    ['O=CCC1CCCCC1', '2-ciclohexiletanal'],
    ['O=CCCC1=CC=CC=C1', '3-fenilpropanal'],
    ['OC(=O)C1CCCCC1CC(=O)O', 'ácido 2-(carboximetil)ciclohexano-1-carboxílico'],
    ['OC(=O)C(C(=O)O)C1CCC(C(=O)O)CC1', 'ácido 2-(4-carboxiciclohexil)propanodioico'],
    ['OC(=O)C(CC)C(=O)C1=CC=CC=C1', 'ácido 2-benzoilbutanoico'],
    ['CC(=O)C(C(=O)C1CCCCC1)C(C)=O', '3-(ciclohexanocarbonil)pentano-2,4-diona'],
    ['CCC(=O)C1=CC=CC=C1', '1-fenilpropan-1-ona'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
    await expect(page.locator('#results .results-error')).toHaveCount(0);
  } // End of the loop over the loaded molecules

  // «Anillo o cadena»: the –COOH on the ring counts for the ring, the tie keeps the ring.
  await loadSmiles(page, 'OC(=O)C1CCCCC1CC(=O)O');
  await askName(page);
  const { titles, texts } = await readSteps(page);
  expect(titles[2]).toBe('Anillo o cadena');
  expect(texts[2]).toContain('cuenta como grupo del anillo');
  expect(texts[2]).toContain('hay empate, así que manda el anillo');
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  const error = page.locator('#results .results-error');
  // A ring ester beside an acid is named since I-40d; a ring ester beside a chain ester stays refused.
  await loadSmiles(page, 'COC(=O)C1CCC(CCC(=O)OC)CC1');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('un oxígeno, un nitrógeno o un anillo');
  await expect(page.locator('#result-name')).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test 'loaded ring acids…'
