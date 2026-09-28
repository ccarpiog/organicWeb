/**
 * @file ciano- e2e (design.md §13.4 I-39a): a nitrile beside an acid, drawn
 * with the existing tools (a –COOH on a C–C, then a C–C≡N on its other
 * carbon), is named ácido 2-cianoetanoico, never as a dinitrile or an
 * alkyne; the stepper says the nitrile is not the principal group, that
 * «ciano-» includes its carbon (not a chain carbon: the chain has 2
 * carbons), counts its C and N in the formula and highlights the –C≡N whole
 * as a substituent; molecules loaded through the editor test API get their
 * ciano- names (acid, ester, amide, ester O-bound group, amide N group, a
 * nitrile on a branch piece of a nitrile); "Ordenar dibujo" lays one out; a
 * nitrile on the acid's carbon is refused with its message. Runs on the dev
 * server and on dist/index.html.
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

/**
 * Text of the label drawn on an atom.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {number} id - Atom id.
 * @returns {import('@playwright/test').Locator} The label.
 */
function label(page, id) {
  return page.locator(`svg#canvas .atom-label[data-atom-id="${id}"]`);
}

test('a nitrile drawn beside an acid is named with ciano-, and the stepper explains why', async ({ page }) => {
  const errors = await openApp(page);
  const tools = page.locator('#toolbar');
  // C–C from the empty canvas, two carbons on the second one turned into O (one C=O): a –COOH on carbon 2.
  await clickCanvas(page, 0.4, 0.5);
  await clickAtom(page, 2);
  await clickAtom(page, 2);
  await tools.getByRole('button', { name: 'Oxígeno', exact: true }).click();
  await clickAtom(page, 3);
  await clickAtom(page, 4);
  await tools.getByRole('button', { name: 'Enlace doble' }).click();
  await clickBond(page, 2);
  // Then C–C on carbon 1, the last carbon turned into Nitrógeno and the C–N bond made triple: a –C≡N on carbon 1.
  await tools.getByRole('button', { name: 'Enlace simple' }).click();
  await clickAtom(page, 1);
  await clickAtom(page, 5);
  await tools.getByRole('button', { name: 'Nitrógeno', exact: true }).click();
  await clickAtom(page, 6);
  await tools.getByRole('button', { name: 'Enlace triple' }).click();
  await clickBond(page, 5);
  const json = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(json.atoms.map((a) => a.element)).toEqual(['C', 'C', 'O', 'O', 'C', 'N']);
  expect(json.bonds.map((b) => b.order)).toEqual([1, 2, 1, 1, 3]);
  await expect(label(page, 6)).toHaveText('N');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('ácido 2-cianoetanoico');
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
  expect(texts[0]).toContain('3 carbonos, 3 hidrógenos, 1 átomo de nitrógeno y 2 átomos de oxígeno (C₃H₃NO₂)');
  expect(texts[1]).toContain('También tiene un grupo –C≡N (un nitrilo)');
  expect(texts[1]).toContain('ácido > nitrilo > aldehído');
  expect(texts[1]).toContain('cada –C≡N se nombra con el prefijo «ciano-»');
  expect(texts[1]).toContain('ese carbono no se cuenta en la cadena principal ni se numera');
  expect(texts[2]).toContain('Sin contar el carbono del –C≡N, que va en el prefijo «ciano-»');
  expect(texts[2]).toContain('tiene 2 carbonos');
  expect(texts[4]).toContain('En el carbono 2 hay un grupo –C≡N: se escribe «2-ciano»');
  expect(texts[5]).toContain('El nombre completo es «ácido 2-cianoetanoico»');
  // "Reconoce el grupo funcional": the –COOH as the principal group, the –C≡N whole (C, N and both bonds) as a substituent.
  await dots.nth(1).click();
  await expect(page.locator('svg#canvas .hl-atom.hl-parent')).toHaveCount(3);
  await expect(page.locator('svg#canvas .hl-atom.hl-substituent')).toHaveCount(2);
  await expect(page.locator('svg#canvas .hl-bond.hl-substituent')).toHaveCount(2);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // Ordenar dibujo lays it out (one undoable edit), keeping the atoms and bonds.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('ácido 2-cianoetanoico');
  expect(errors).toEqual([]);
}); // End of test 'a nitrile drawn beside an acid is named with ciano-…'

test('loaded ciano- molecules are named; a nitrile on the acid carbon is refused', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['N#CCCC(=O)O', 'ácido 3-cianopropanoico'],
    ['CCC(C#N)C(=O)O', 'ácido 2-cianobutanoico'],
    ['N#CCC(=O)OC', '2-cianoetanoato de metilo'],
    ['CC(=O)OCC#N', 'etanoato de cianometilo'],
    ['N#CCCC(N)=O', '3-cianopropanamida'],
    ['CC(=O)NCC#N', 'N-(cianometil)etanamida'],
    ['N#CCCOCC#N', '3-(cianometoxi)propanonitrilo'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
    await expect(page.locator('#results .results-error')).toHaveCount(0);
  } // End of the loop over the loaded molecules

  await loadSmiles(page, 'N#CC(=O)O');
  await askName(page);
  const error = page.locator('#results .results-error');
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('ácido carbonocianídico');
  await expect(page.locator('#result-name')).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test 'loaded ciano- molecules…'
