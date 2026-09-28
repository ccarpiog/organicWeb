/**
 * @file Amides e2e (design.md §13.4 I-37): an amide drawn with the existing
 * tools (a carbon with two more carbons on it, turned into Oxígeno and
 * Nitrógeno, then Enlace doble on the C–O bond; the N labelled NH₂) is
 * named etanamida with acetamida under "Otras formas válidas"; a carbon
 * added on the N (now labelled NH) makes N-metiletanamida, and the stepper
 * explains the amide as one group (never a ketone and an amine), the
 * «-amida» suffix, the N-group with the letter «N» and the uncited locant,
 * with the whole group (C, O, N) highlighted; molecules loaded through the
 * editor test API get their names (metanamida, N,N-dimetiletanamida,
 * N-etil-N-metilpropanamida, 2-metilpropanamida, butanodiamida,
 * 4-oxopentanamida, 2-aminopropanamida); "Ordenar dibujo" lays out an
 * amide; an amide with a ring, an amide with an acid, an N-substituted
 * diamide and an imide are refused with their messages. Runs on the dev
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

test('an amide drawn with the tools is named, and the stepper explains the amide group and the N locant', async ({ page }) => {
  const errors = await openApp(page);
  const tools = page.locator('#toolbar');
  // C–C from the empty canvas, two more carbons on the second one, Oxígeno and Nitrógeno on them, Enlace doble on C–O.
  await clickCanvas(page, 0.4, 0.5);
  await clickAtom(page, 2);
  await clickAtom(page, 2);
  await tools.getByRole('button', { name: 'Oxígeno', exact: true }).click();
  await clickAtom(page, 3);
  await tools.getByRole('button', { name: 'Nitrógeno', exact: true }).click();
  await clickAtom(page, 4);
  await tools.getByRole('button', { name: 'Enlace doble' }).click();
  await clickBond(page, 2);
  let json = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(json.atoms.map((a) => a.element)).toEqual(['C', 'C', 'O', 'N']);
  expect(json.bonds.map((b) => b.order)).toEqual([1, 2, 1]);
  await expect(label(page, 4)).toHaveText('NH₂');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('etanamida');
  await expect(page.locator('#results .results-error')).toHaveCount(0);
  await expect(page.locator('#alternatives')).toContainText('acetamida');

  // Enlace simple on the N adds a carbon to it: an N-substituted amide, labelled NH.
  await tools.getByRole('button', { name: 'Enlace simple' }).click();
  await clickAtom(page, 4);
  json = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(json.atoms.map((a) => a.element)).toEqual(['C', 'C', 'O', 'N', 'C']);
  await expect(label(page, 4)).toHaveText('NH');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('N-metiletanamida');
  await expect(page.locator('#alternatives')).toContainText('N-metilacetamida');

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
  expect(texts[0]).toContain('1 átomo de nitrógeno y 1 átomo de oxígeno (C₃H₇NO)');
  expect(texts[0]).toContain('El nitrógeno unido a dos carbonos se ve como NH');
  expect(texts[1]).toContain('la molécula es una amida');
  expect(texts[1]).toContain('el C=O de una amida no es una cetona, ni su nitrógeno una amina');
  expect(texts[1]).toContain('se nombra con el sufijo «-amida»');
  expect(texts[1]).toContain('con la letra «N» en vez de un número');
  expect(texts[2]).toContain('no puede atravesar el nitrógeno');
  expect(texts[3]).toContain('El carbono del grupo amida siempre es el 1');
  expect(texts[3]).toContain('La «N» del nombre no es el número de un carbono');
  expect(texts[4]).toContain('En el nitrógeno hay un grupo metilo: se escribe «N-metil»');
  expect(texts[5]).toContain('El nombre completo es «N-metiletanamida»');

  // "Reconoce el grupo funcional": the whole amide (C, O, N; C=O and C–N bonds) as the principal group, the N-methyl apart.
  await dots.nth(1).click();
  await expect(page.locator('svg#canvas .hl-atom.hl-parent')).toHaveCount(3);
  await expect(page.locator('svg#canvas .hl-bond.hl-parent')).toHaveCount(2);
  await expect(page.locator('svg#canvas .hl-atom.hl-substituent')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // Ordenar dibujo lays it out (one undoable edit), keeping the atoms and bonds.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  expect(after.atoms.map((a) => a.element)).toEqual(['C', 'C', 'O', 'N', 'C']);
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('N-metiletanamida');
  expect(errors).toEqual([]);
}); // End of test 'an amide drawn with the tools is named…'

test('loaded amides: N-groups, diamide, branches, other groups as prefixes; out-of-scope amides refused', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['NC=O', 'metanamida'],
    ['CC(=O)N(C)C', 'N,N-dimetiletanamida'],
    ['CCC(=O)N(C)CC', 'N-etil-N-metilpropanamida'],
    ['CC(C)C(N)=O', '2-metilpropanamida'],
    ['NC(=O)CCC(N)=O', 'butanodiamida'],
    ['C=CC(N)=O', 'prop-2-enamida'],
    ['CC(=O)CCC(N)=O', '4-oxopentanamida'],
    ['CC(N)C(N)=O', '2-aminopropanamida'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
    await expect(page.locator('#results .results-error')).toHaveCount(0);
  } // End of the loop over the loaded amides

  // N,N-dimetilmetanamida: its traditional name keeps the N groups.
  await loadSmiles(page, 'CN(C)C=O');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('N,N-dimetilmetanamida');
  await expect(page.locator('#alternatives')).toContainText('N,N-dimetilformamida');

  const error = page.locator('#results .results-error');
  for (const [smiles, text] of [
    ['NC(=O)C1CCCCC1', 'las amidas con anillo'],
    ['NC(=O)CC(=O)O', '«carbamoil-» o «acilamino-»'],
    ['CNC(=O)CCC(N)=O', 'localizadores como N¹ y N⁴'],
    ['CC(=O)NC(C)=O', 'Eso es una imida'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
    await expect(error).toContainText(text);
    await expect(page.locator('#result-name')).toHaveCount(0);
  } // End of the loop over the refused amides

  // A refused amide still offers the group steps: the stepper ends with "Aún no sé nombrarla".
  await loadSmiles(page, 'NC(=O)C1CCCCC1');
  await askName(page);
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  const dots = stepper.locator('.step-dot');
  await dots.nth(0).click();
  await expect(stepper.locator('.step-content')).toContainText('amida');
  await dots.nth(await dots.count() - 1).click();
  await expect(stepper.locator('.step-title')).toHaveText('Aún no sé nombrarla');
  await expect(stepper.locator('.step-content')).toContainText('las amidas con anillo');
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();
  expect(errors).toEqual([]);
}); // End of test 'loaded amides…'
