/**
 * @file Esters e2e (design.md §13.4 I-35): an ester drawn with the existing
 * tools (a carbon with two more carbons on it, a fourth carbon on one of
 * them, Oxígeno on the two middle atoms, then Enlace doble on one C–O bond)
 * is named etanoato de metilo instead of refused, with acetato de metilo
 * under "Otras formas válidas"; the stepper recognises the –COO– group,
 * separates the two parts (the acid part and the O-bound group, each
 * highlighted apart, one option each) and explains the Spanish order
 * «… de …»; molecules loaded through the editor test API get their names
 * (propanoato de etilo, butanoato de isopropilo with propan-2-ilo and
 * 1-metiletilo, 2-metilpropanoato de tert-butilo, metanoato de metilo with
 * formiato de metilo, 3-oxobutanoato de etilo, etanoato de 2-hidroxietilo);
 * "Ordenar dibujo" lays out an ester; two esters on different carbon pieces,
 * a lactone and a mixed diester that would need locants are refused with
 * their messages (a diester on one chain and an ester beside an acid are
 * named since I-39c, tests/e2e/ester-prefixes.spec.js; esters with a ring
 * since I-40d, tests/e2e/ring-esters.spec.js). Runs on
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

test('an ester drawn with the tools is named etanoato de metilo, with its two parts highlighted apart', async ({ page }) => {
  const errors = await openApp(page);
  const tools = page.locator('#toolbar');
  // C–C from the empty canvas, two more carbons on the second one, a carbon on the fourth,
  // Oxígeno on atoms 3 and 4, then Enlace doble on the C2–O3 bond: CH3–C(=O)–O–CH3.
  await clickCanvas(page, 0.4, 0.5);
  await clickAtom(page, 2);
  await clickAtom(page, 2);
  await clickAtom(page, 4);
  await tools.getByRole('button', { name: 'Oxígeno', exact: true }).click();
  await clickAtom(page, 3);
  await clickAtom(page, 4);
  await tools.getByRole('button', { name: 'Enlace doble' }).click();
  await clickBond(page, 2);
  const json = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(json.atoms.map((a) => a.element)).toEqual(['C', 'C', 'O', 'O', 'C']);
  expect(json.bonds.map((b) => b.order)).toEqual([1, 2, 1, 1]);
  // Neither oxygen has a hydrogen: both are labelled O.
  await expect(page.locator('svg#canvas text', { hasText: /^O$/ })).toHaveCount(2);

  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('etanoato de metilo');
  await expect(page.locator('#results .results-error')).toHaveCount(0);
  await expect(page.locator('#alternatives')).toContainText('acetato de metilo');
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
  expect(titles).toEqual(['Cuenta los carbonos', 'Reconoce el grupo funcional', 'Separa las dos partes del éster',
    'Busca la cadena principal', 'Numera la cadena', 'Monta el nombre']);
  expect(texts[0]).toContain('2 átomos de oxígeno (C₃H₆O₂)');
  expect(texts[1]).toContain('la molécula es un éster');
  expect(texts[1]).toContain('el C=O del –COO– no es una cetona, ni su oxígeno del medio un éter');
  expect(texts[2]).toContain('cambiando «-oico» por «-oato»: «etanoato»');
  expect(texts[2]).toContain('acabado en «-ilo» (metilo, etilo, propilo…): «metilo»');
  expect(texts[3]).toContain('la cadena no puede atravesar el oxígeno del medio');
  expect(texts[4]).toContain('El carbono del grupo –COO– siempre es el 1, así que su número no se escribe');
  expect(texts[5]).toContain('Después va la palabra «de» y la segunda palabra');
  expect(texts[5]).toContain('En inglés el orden es al revés');
  // "Separa las dos partes del éster": the acid part (C1, C2, the =O and their bonds), the O-bound group (C5)
  // and the middle O with its two bonds apart.
  await dots.nth(2).click();
  await expect(page.locator('svg#canvas .hl-atom.hl-parent')).toHaveCount(3);
  await expect(page.locator('svg#canvas .hl-bond.hl-parent')).toHaveCount(2);
  await expect(page.locator('svg#canvas .hl-atom.hl-substituent')).toHaveCount(1);
  await expect(page.locator('svg#canvas .hl-atom.hl-candidate')).toHaveCount(1);
  await expect(page.locator('svg#canvas .hl-bond.hl-candidate')).toHaveCount(2);
  // One option per part, each highlighting only its own part.
  await stepper.getByRole('button', { name: 'Grupo unido al oxígeno' }).click();
  await expect(stepper.getByRole('button', { name: 'Grupo unido al oxígeno' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('svg#canvas .hl-atom.hl-parent')).toHaveCount(0);
  await expect(page.locator('svg#canvas .hl-atom.hl-substituent')).toHaveCount(1);
  await stepper.getByRole('button', { name: 'Parte del ácido' }).click();
  await expect(page.locator('svg#canvas .hl-atom.hl-parent')).toHaveCount(3);
  await expect(page.locator('svg#canvas .hl-atom.hl-substituent')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // Ordenar dibujo lays it out (one undoable edit), keeping the atoms and bonds.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.bonds).toEqual(before.bonds);
  expect(after.atoms.map((a) => a.element)).toEqual(['C', 'C', 'O', 'O', 'C']);
  expect(errors).toEqual([]);
}); // End of test 'an ester drawn with the tools is named etanoato de metilo…'

test('loaded esters: branched groups on both sides, oxo- and hidroxi-, formiato; out-of-scope esters refused', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['CCC(=O)OCC', 'propanoato de etilo'],
    ['CCCC(=O)OC(C)C', 'butanoato de isopropilo'],
    ['CC(C)C(=O)OC(C)(C)C', '2-metilpropanoato de tert-butilo'],
    ['CC(=O)CC(=O)OCC', '3-oxobutanoato de etilo'],
    ['CC(=O)OCCO', 'etanoato de 2-hidroxietilo'],
    ['CC(=O)OCC=C', 'etanoato de prop-2-en-1-ilo'],
  ]) {
    await loadSmiles(page, smiles);
    await askName(page);
    await expect(page.locator('#result-name')).toHaveText(name);
  } // End of the loop over the loaded esters

  await loadSmiles(page, 'CCCC(=O)OC(C)C');
  await askName(page);
  await expect(page.locator('#alternatives')).toContainText('butanoato de propan-2-ilo');
  await expect(page.locator('#alternatives')).toContainText('butanoato de 1-metiletilo');

  await loadSmiles(page, 'O=COC');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('metanoato de metilo');
  await expect(page.locator('#alternatives')).toContainText('formiato de metilo');

  // The O-bound group is longer, but the acid part carries the principal group.
  await loadSmiles(page, 'CC(=O)OCCCCC');
  await askName(page);
  await expect(page.locator('#result-name')).toHaveText('etanoato de pentilo');
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  await stepper.locator('.step-dot').nth(3).click();
  await expect(stepper.locator('.step-title')).toHaveText('Busca la cadena principal');
  await expect(stepper.locator('.step-content')).toContainText('Hay una cadena más larga, de 5 carbonos, pero lleva menos grupos –COO–');
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  const error = page.locator('#results .results-error');
  await loadSmiles(page, 'CC(=O)OCCOC(C)=O');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('diacetato de etano-1,2-diilo');
  await expect(page.locator('#result-name')).toHaveCount(0);

  // Esters with a ring are named since I-40d (ring-esters.spec.js); a lactone (the –COO– inside the ring) is not.
  await loadSmiles(page, 'O=C1CCCCO1');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'RING_SYSTEM');
  await expect(error).toContainText('Esta molécula es una lactona');

  await loadSmiles(page, 'COC(=O)CC(C)C(=O)OCC');
  await askName(page);
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('Habría que decir con localizadores');
  expect(errors).toEqual([]);
}); // End of test 'loaded esters…'
