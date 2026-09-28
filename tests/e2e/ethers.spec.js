/**
 * @file Ethers e2e (design.md §13.4 I-34): an ether drawn with the existing
 * tools (a four-carbon chain whose second carbon is turned into an oxygen
 * with Oxígeno) is named metoxietano instead of refused, with etil metil
 * éter under "Otras formas válidas"; the stepper's "Reconoce el éter"
 * explains why the chain cannot run through the O and which side is the
 * parent, and highlights both sides of the O (the parent side, the alkoxy
 * side and the O with its two bonds apart); molecules loaded through the
 * editor test API get their names (2-metoxietan-1-ol, 1-isopropoxibutano,
 * 1,2-dimetoxietano, metoxibenceno with anisol, ácido 2-metoxietanoico);
 * "Ordenar dibujo" lays out an ether; a symmetric ether with the
 * principal group on both halves and an ester are refused with their
 * messages. Runs on the dev server and on dist/index.html.
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

test('an ether drawn with the tools is named metoxietano, with both sides of the O highlighted', async ({ page }) => {
  const errors = await openApp(page);
  // C–C from the empty canvas, two more carbons in a row, then Oxígeno on the second carbon: C–O–C–C.
  await clickCanvas(page, 0.4, 0.5);
  await clickAtom(page, 2);
  await clickAtom(page, 3);
  await page.locator('#toolbar').getByRole('button', { name: 'Oxígeno', exact: true }).click();
  await clickAtom(page, 2);
  const json = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(json.atoms.map((a) => a.element)).toEqual(['C', 'O', 'C', 'C']);
  // The ether oxygen has no hydrogen: it is labelled O.
  await expect(page.locator('svg#canvas text', { hasText: /^O$/ })).toHaveCount(1);

  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('metoxietano');
  await expect(page.locator('#results .results-error')).toHaveCount(0);
  await expect(page.locator('#alternatives')).toContainText('etil metil éter');
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  const dots = stepper.locator('.step-dot');
  const titles = [];
  const texts = [];
  for (let i = 0; i < await dots.count(); i += 1) {
    await dots.nth(i).click();
    titles.push(await stepper.locator('.step-title').textContent());
    texts.push(await stepper.locator('.step-content').textContent());
  }
  expect(titles).toEqual(['Cuenta los carbonos', 'Reconoce el éter', 'Busca la cadena más larga', 'Numera la cadena',
    'Nombra los sustituyentes', 'Monta el nombre']);
  expect(texts[0]).toContain('1 átomo de oxígeno (C₃H₈O)');
  expect(texts[1]).toContain('la molécula es un éter');
  expect(texts[1]).toContain('La cadena principal no puede pasar por el oxígeno');
  expect(texts[1]).toContain('Gana la más larga, y el otro lado es el sustituyente «metoxi»');
  expect(texts[1]).toContain('met + oxi = metoxi');
  expect(texts[2]).toContain('La cadena no puede atravesar el oxígeno de un éter');
  // "Reconoce el éter": the parent side (C3, C4 and their bond), the alkoxy side (C1) and the O with both C–O bonds.
  await dots.nth(1).click();
  await expect(page.locator('svg#canvas .hl-atom.hl-parent')).toHaveCount(2);
  await expect(page.locator('svg#canvas .hl-bond.hl-parent')).toHaveCount(1);
  await expect(page.locator('svg#canvas .hl-atom.hl-substituent')).toHaveCount(1);
  await expect(page.locator('svg#canvas .hl-atom.hl-candidate')).toHaveCount(1);
  await expect(page.locator('svg#canvas .hl-bond.hl-candidate')).toHaveCount(2);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // Ordenar dibujo lays it out (one undoable edit), keeping the atoms and bonds.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  expect(after.atoms.map((a) => a.element)).toEqual(['C', 'O', 'C', 'C']);
  expect(errors).toEqual([]);
}); // End of test 'an ether drawn with the tools is named metoxietano…'

test('loaded ethers: parent side, alkoxy forms, one option per O; out-of-scope ethers refused', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['COC', 'metoximetano'],
    ['OCCOC', '2-metoxietan-1-ol'],
    ['CC(C)OCCCC', '1-isopropoxibutano'],
    ['COCC(=O)O', 'ácido 2-metoxietanoico'],
    ['CC(=O)CCOC', '4-metoxibutan-2-ona'],
    ['COC1CCCCC1', 'metoxiciclohexano'],
    ['CCCCCOCCCCCC', '1-(pentiloxi)hexano'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
  } // End of the loop over the loaded ethers

  await loadSmiles(page, 'CC(C)OCCCC');
  await askName(page);
  await expect(page.locator('#alternatives')).toContainText('1-(propan-2-iloxi)butano');
  await expect(page.locator('#alternatives')).toContainText('butil isopropil éter');

  await loadSmiles(page, 'COC1=CC=CC=C1');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('metoxibenceno');
  await expect(page.locator('#alternatives')).toContainText('anisol');

  // Two ether oxygens: one option per O in "Reconoce el éter", each marking its O.
  await loadSmiles(page, 'COCCOC');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('1,2-dimetoxietano');
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  await stepper.locator('.step-dot').nth(1).click();
  await expect(stepper.locator('.step-title')).toHaveText('Reconoce el éter');
  await expect(page.locator('svg#canvas .hl-atom.hl-candidate')).toHaveCount(2);
  await stepper.getByRole('button', { name: 'Oxígeno 2 de 2' }).click();
  await expect(stepper.getByRole('button', { name: 'Oxígeno 2 de 2' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('svg#canvas .hl-atom.hl-candidate')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  const error = page.locator('#results .results-error');
  await loadSmiles(page, 'OCCOCCO');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('dos mitades iguales');
  await expect(page.locator('#result-name')).toHaveCount(0);

  await loadSmiles(page, 'CC(=O)OC');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('éteres (con un oxígeno unido a dos carbonos, C–O–C)');
  expect(errors).toEqual([]);
}); // End of test 'loaded ethers…'
