/**
 * @file Amines e2e (design.md §13.4 I-36): an amine drawn with the existing
 * tools (a C–C–C–C chain, Nitrógeno on its last carbon, labelled NH₂) is
 * named propan-1-amina; a carbon added on the N (now labelled NH) makes
 * N-metilpropan-1-amina, and the stepper explains the –NH– group and the
 * «-amina» suffix, the N-group with the letter «N» (highlighted apart from
 * the parent chain) and the numbering; molecules loaded through the editor
 * test API get their names (N-metiletanamina, N,N-dimetilmetanamina with
 * trimetilamina, N-etil-N-metilpropan-1-amina, butano-1,4-diamina,
 * ciclohexanamina, bencenamina with anilina, N-metilbencenamina with
 * N-metilanilina, 2-aminoetan-1-ol, 2-(dimetilamino)etan-1-ol, ácido
 * 2-aminopropanoico); "Ordenar dibujo" lays out an amine; side-chain amines
 * on a ring, N-substituted polyamines and symmetric amines are refused with
 * their messages, a urea and an imine keep the generic HETEROATOM
 * refusal, and an N in a ring is a heterocycle (RING_SYSTEM). Runs on the
 * dev server and on dist/index.html.
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
 * Text of the label drawn on an atom.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {number} id - Atom id.
 * @returns {import('@playwright/test').Locator} The label.
 */
function label(page, id) {
  return page.locator(`svg#canvas .atom-label[data-atom-id="${id}"]`);
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
 * Counts the highlighted atoms or bonds of one style on the canvas.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {'atom'|'bond'} kind - Atoms or bonds.
 * @param {string} style - Highlight style (parent, substituent, candidate).
 * @returns {import('@playwright/test').Locator} The highlighted elements.
 */
function highlighted(page, kind, style) {
  return page.locator(`svg#canvas .hl-${kind}.hl-${style}`);
}

test('an amine drawn with the tools is named, and the stepper explains the –NH– group and the N-locant', async ({ page }) => {
  const errors = await openApp(page);
  const tools = page.locator('#toolbar');
  // C–C from the empty canvas, two more carbons in a row, then Nitrógeno on the last one: CH3–CH2–CH2–NH2.
  await clickCanvas(page, 0.4, 0.5);
  await clickAtom(page, 2);
  await clickAtom(page, 3);
  await tools.getByRole('button', { name: 'Nitrógeno', exact: true }).click();
  await clickAtom(page, 4);
  let json = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(json.atoms.map((a) => a.element)).toEqual(['C', 'C', 'C', 'N']);
  // An N bound to one carbon carries two hydrogens.
  await expect(label(page, 4)).toHaveText('NH₂');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('propan-1-amina');
  await expect(page.locator('#results .results-error')).toHaveCount(0);
  await expect(page.locator('#alternatives')).toContainText('propilamina');

  // Enlace simple on the N adds a carbon to it: a secondary amine, labelled NH.
  await tools.getByRole('button', { name: 'Enlace simple' }).click();
  await clickAtom(page, 4);
  json = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(json.atoms.map((a) => a.element)).toEqual(['C', 'C', 'C', 'N', 'C']);
  await expect(label(page, 4)).toHaveText('NH');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('N-metilpropan-1-amina');
  await expect(page.locator('#alternatives')).toContainText('metilpropilamina');

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
  expect(texts[0]).toContain('1 átomo de nitrógeno (C₄H₁₁N)');
  expect(texts[0]).toContain('El nitrógeno unido a dos carbonos se ve como NH');
  expect(texts[1]).toContain('un nitrógeno unido a dos carbonos y a un hidrógeno (–NH–)');
  expect(texts[1]).toContain('Aquí es una amina secundaria');
  expect(texts[1]).toContain('se nombra con el sufijo «-amina»');
  expect(texts[1]).toContain('con la letra «N» en vez de un número');
  expect(texts[2]).toContain('no puede atravesar el nitrógeno');
  expect(texts[3]).toContain('La «N» del nombre no es el número de un carbono');
  expect(texts[4]).toContain('En el nitrógeno hay un grupo metilo: se escribe «N-metil»');
  expect(texts[5]).toContain('El nombre completo es «N-metilpropan-1-amina»');
  expect(texts[5]).toContain('N = el grupo «metil» va unido al nitrógeno, no a un carbono');

  // "Reconoce el grupo funcional": the N with its chain carbon (parent) and the N-methyl (substituent) apart.
  await dots.nth(1).click();
  await expect(highlighted(page, 'atom', 'parent')).toHaveCount(2);
  await expect(highlighted(page, 'bond', 'parent')).toHaveCount(1);
  await expect(highlighted(page, 'atom', 'substituent')).toHaveCount(1);
  await expect(highlighted(page, 'bond', 'substituent')).toHaveCount(1);
  // "Numera la cadena": only the three chain carbons are numbered; the N gets no number.
  await dots.nth(3).click();
  await expect(page.locator('svg#canvas .locant')).toHaveText(['1', '2', '3']);
  // "Nombra los sustituyentes": the N-group option highlights the methyl on the N.
  await dots.nth(4).click();
  await stepper.getByRole('button', { name: 'metil', exact: true }).click();
  await expect(highlighted(page, 'atom', 'substituent')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // Ordenar dibujo lays it out (one undoable edit), keeping the atoms and bonds.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  expect(after.atoms.map((a) => a.element)).toEqual(['C', 'C', 'C', 'N', 'C']);
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('N-metilpropan-1-amina');
  expect(errors).toEqual([]);
}); // End of test 'an amine drawn with the tools is named…'

test('loaded amines: N-groups, tertiary, diamine, ring amines, anilina and amino prefixes', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['CCN', 'etanamina'],
    ['CC(N)C', 'propan-2-amina'],
    ['NCCCCN', 'butano-1,4-diamina'],
    ['CCNC', 'N-metiletanamina'],
    ['CCCN(C)CC', 'N-etil-N-metilpropan-1-amina'],
    ['NC1CCCCC1', 'ciclohexanamina'],
    ['NCCO', '2-aminoetan-1-ol'],
    ['CN(C)CCO', '2-(dimetilamino)etan-1-ol'],
    ['CC(N)C(=O)O', 'ácido 2-aminopropanoico'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
    await expect(page.locator('#results .results-error')).toHaveCount(0);
  } // End of the loop over the loaded amines

  // A tertiary amine: the alkylamine name under "Otras formas válidas".
  await loadSmiles(page, 'CN(C)C');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('N,N-dimetilmetanamina');
  await expect(page.locator('#alternatives')).toContainText('Otras formas válidas');
  await expect(page.locator('#alternatives')).toContainText('trimetilamina');
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  await stepper.locator('.step-dot').nth(1).click();
  await expect(stepper.locator('.step-title')).toHaveText('Reconoce el grupo funcional');
  await expect(stepper.locator('.step-content')).toContainText('Aquí es una amina terciaria');
  await expect(stepper.locator('.step-content')).toContainText('«N,N-dimetilmetanamina»');
  // The parent carbon with the N, and the two N-methyl groups apart.
  await expect(highlighted(page, 'atom', 'parent')).toHaveCount(2);
  await expect(highlighted(page, 'atom', 'substituent')).toHaveCount(2);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // Benzene amines: bencenamina, with the retained anilina offered.
  await loadSmiles(page, 'NC1=CC=CC=C1');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('bencenamina');
  await expect(page.locator('#alternatives')).toContainText('anilina');
  await loadSmiles(page, 'CNC1=CC=CC=C1');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('N-metilbencenamina');
  await expect(page.locator('#alternatives')).toContainText('N-metilanilina');

  // An amine under an alcohol is the amino- prefix: its option highlights the N and its groups.
  await loadSmiles(page, 'CN(C)CCO');
  await askName(page);
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  await stepper.locator('.step-dot').nth(4).click();
  await expect(stepper.locator('.step-title')).toHaveText('Nombra los sustituyentes');
  await stepper.getByRole('button', { name: 'dimetilamino', exact: true }).click();
  await expect(highlighted(page, 'atom', 'substituent')).toHaveCount(3);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();
  expect(errors).toEqual([]);
}); // End of test 'loaded amines…'

test('out-of-scope amines and other nitrogen compounds are refused with their messages', async ({ page }) => {
  const errors = await openApp(page);
  const error = page.locator('#results .results-error');
  for (const [smiles, text] of [
    // An amine on a ring's side chain (sideChainAmine).
    ['NCC1CCCCC1', 'un anillo y un grupo amino (un nitrógeno, como el –NH₂) en una de sus ramas'],
    // A diamine with a group on one N (substitutedPolyamine).
    ['NCCNC', 'localizadores como N¹ y N²'],
    // Equal halves joined by the N, each with the principal group (symmetricAmine).
    ['OCCNCCO', 'partes iguales unidas por un nitrógeno'],
    // A urea and an imine: the generic message, which lists the amines (and, since I-37, the amides; since I-38, the nitriles).
    ['NC(=O)N', 'aminas (con un nitrógeno unido a uno, dos o tres carbonos por enlaces sencillos, como el –NH₂), amidas'],
    ['CCC=N', 'Aún no sé nombrar este tipo de compuestos'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
    await expect(error).toContainText(text);
    await expect(page.locator('#result-name')).toHaveCount(0);
  } // End of the loop over the refused molecules

  // The refused amine still offers the group steps: the stepper ends with "Aún no sé nombrarla".
  await loadSmiles(page, 'NCC1CCCCC1');
  await askName(page);
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  const dots = stepper.locator('.step-dot');
  await expect(dots).toHaveCount(4);
  await dots.nth(3).click();
  await expect(stepper.locator('.step-title')).toHaveText('Aún no sé nombrarla');
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // A refused nitrile (below an acid, I-38) is named by its group steps as a nitrile (–C≡N), not an amine.
  await loadSmiles(page, 'N#CCC(=O)O');
  await askName(page);
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  await dots.nth(0).click();
  await expect(stepper.locator('.step-content')).toContainText('1 nitrilo');
  await expect(stepper.locator('.step-content')).not.toContainText('amina:');
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // An N inside a ring: a heterocycle.
  await loadSmiles(page, 'C1CCNCC1');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'RING_SYSTEM');
  await expect(error).toContainText('es un heterociclo');
  await expect(page.locator('#result-name')).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test 'out-of-scope amines…'
