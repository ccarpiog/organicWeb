/**
 * @file Nitriles e2e (design.md §13.4 I-38): a nitrile drawn with the
 * existing tools (C–C–C, the last carbon turned into Nitrógeno, then Enlace
 * triple on the C–N bond; the N labelled N, without hydrogen) is named
 * etanonitrilo with acetonitrilo under "Otras formas válidas", never as an
 * alkyne; the stepper explains the –C≡N group (its carbon is carbon 1, the
 * N is not a chain atom, the triple bond is no «-ino»), the «-nitrilo»
 * suffix and the formula with N, with the whole group (C and N)
 * highlighted; molecules loaded through the editor test API get their names
 * (metanonitrilo, propanonitrilo, 2-metilpropanonitrilo, butanodinitrilo,
 * prop-2-enonitrilo, 4-oxopentanonitrilo, 3-hidroxibutanonitrilo,
 * 2-aminopropanonitrilo, 3-cloropropanonitrilo); "Ordenar dibujo" lays out
 * a nitrile; a nitrile with a ring, three nitriles and a nitrile below an
 * acid (ciano-) are refused with their messages. Runs on the dev server and
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

test('a nitrile drawn with the tools is named, and the stepper explains the –C≡N group', async ({ page }) => {
  const errors = await openApp(page);
  const tools = page.locator('#toolbar');
  // C–C from the empty canvas, one more carbon on the second one, Nitrógeno on it, then Enlace triple on the C–N bond.
  await clickCanvas(page, 0.4, 0.5);
  await clickAtom(page, 2);
  await tools.getByRole('button', { name: 'Nitrógeno', exact: true }).click();
  await clickAtom(page, 3);
  await expect(label(page, 3)).toHaveText('NH₂');
  await tools.getByRole('button', { name: 'Enlace triple' }).click();
  await clickBond(page, 2);
  const json = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(json.atoms.map((a) => a.element)).toEqual(['C', 'C', 'N']);
  expect(json.bonds.map((b) => b.order)).toEqual([1, 3]);
  // The nitrile N has no hydrogen left: labelled N.
  await expect(label(page, 3)).toHaveText('N');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('etanonitrilo');
  await expect(page.locator('#results .results-error')).toHaveCount(0);
  await expect(page.locator('#alternatives')).toContainText('acetonitrilo');

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
    'Numera la cadena', 'Monta el nombre']);
  expect(texts[0]).toContain('2 carbonos, 3 hidrógenos y 1 átomo de nitrógeno (C₂H₃N)');
  expect(texts[0]).toContain('se ve como N: sus 3 enlaces van a ese carbono');
  expect(texts[1]).toContain('la molécula es un nitrilo');
  expect(texts[1]).toContain('Ese enlace triple no es el de un alquino');
  expect(texts[1]).toContain('se nombra con el sufijo «-nitrilo»');
  expect(texts[1]).toContain('«acetonitrilo»');
  expect(texts[3]).toContain('El carbono del grupo –C≡N siempre es el 1');
  expect(texts[4]).toContain('La «o» final de «-ano» se queda delante de «-nitrilo»');
  expect(texts[4]).toContain('El nombre completo es «etanonitrilo»');

  // "Reconoce el grupo funcional": the whole –C≡N (C and N, the triple bond) as the principal group.
  await dots.nth(1).click();
  await expect(page.locator('svg#canvas .hl-atom.hl-parent')).toHaveCount(2);
  await expect(page.locator('svg#canvas .hl-bond.hl-parent')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // Ordenar dibujo lays it out (one undoable edit), keeping the atoms and bonds.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  expect(after.atoms.map((a) => a.element)).toEqual(['C', 'C', 'N']);
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('etanonitrilo');
  expect(errors).toEqual([]);
}); // End of test 'a nitrile drawn with the tools is named…'

test('loaded nitriles: branches, dinitrile, other groups as prefixes; out-of-scope nitriles refused', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['C#N', 'metanonitrilo'],
    ['CCC#N', 'propanonitrilo'],
    ['CC(C)C#N', '2-metilpropanonitrilo'],
    ['N#CCCC#N', 'butanodinitrilo'],
    ['C=CC#N', 'prop-2-enonitrilo'],
    ['CC(=O)CCC#N', '4-oxopentanonitrilo'],
    ['CC(O)CC#N', '3-hidroxibutanonitrilo'],
    ['CC(N)C#N', '2-aminopropanonitrilo'],
    ['ClCCC#N', '3-cloropropanonitrilo'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
    await expect(page.locator('#results .results-error')).toHaveCount(0);
  } // End of the loop over the loaded nitriles

  const error = page.locator('#results .results-error');
  for (const [smiles, text] of [
    ['N#CC1CCCCC1', '«-carbonitrilo»'],
    ['N#CCC(C#N)CC#N', 'más de dos grupos –C≡N'],
    ['N#CCCC(=O)O', 'prefijo «ciano-»'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
    await expect(error).toContainText(text);
    await expect(page.locator('#result-name')).toHaveCount(0);
  } // End of the loop over the refused nitriles

  // A refused nitrile still offers the group steps: the stepper ends with "Aún no sé nombrarla".
  await loadSmiles(page, 'N#CC1CCCCC1');
  await askName(page);
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  const dots = stepper.locator('.step-dot');
  await dots.nth(0).click();
  await expect(stepper.locator('.step-content')).toContainText('1 nitrilo');
  await dots.nth(await dots.count() - 1).click();
  await expect(stepper.locator('.step-title')).toHaveText('Aún no sé nombrarla');
  await expect(stepper.locator('.step-content')).toContainText('ciclohexanocarbonitrilo');
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();
  expect(errors).toEqual([]);
}); // End of test 'loaded nitriles…'
