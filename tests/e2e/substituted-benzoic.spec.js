/**
 * @file Substituted benzoic acids, benzaldehydes, benzonitriles and
 * benzamides e2e (design.md §14, I-43b): one –COOH, –CHO, –C≡N or amide on
 * the ring is the principal group with locant 1, not written in the
 * retained name (`ácido 4-metilbenzoico`, `4-clorobenzaldehído`,
 * `N-etil-4-metilbenzamida`), junior groups are prefixes
 * (`ácido 4-formilbenzoico`, `3-cianobenzamida`), in either Kekulé drawing;
 * the systematic `benceno-1-…` and old orto/meta/para forms appear under
 * "Otras formas válidas" only; the "Numera el anillo" step says the
 * principal group takes 1 and never talks about double bonds, the canvas
 * shows 1 on the ring carbon bonded to the group, and the colour key shows
 * `benz` and the group's ending. Two groups of the principal kind are named
 * since I-44 (benzene-polysuffix.spec.js); an ester or a ketone beside other
 * groups stays refused. "Ordenar dibujo" gives a clean drawing and the 90° view keeps the
 * normal drawing. Runs on the dev server and on dist/index.html.
 */

import { test, expect } from '@playwright/test';
import { parseSmiles } from '../../src/model/smiles.js';
import { moleculeToJSON, moleculeFromJSON } from '../../src/model/molecule.js';
import { layoutProblems } from '../../src/layout/canonical.js';

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
 * Loads a molecule from SMILES (parsed here in Node; atom ids follow the
 * SMILES order from 1), with the atoms spread on a grid so that none overlap.
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
 * Names the drawing and waits for the expected name.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} name - The expected name.
 * @returns {Promise<void>}
 */
async function expectName(page, name) {
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText(name);
  await expect(page.locator('#results .results-error')).toHaveCount(0);
}

/**
 * The entries listed under "Otras formas válidas" (empty when the section is absent).
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<string[]>} The text of every entry.
 */
async function alternatives(page) {
  return page.locator('#alternatives li').allTextContents();
}

/**
 * Opens the stepper on the step with a given title and returns its text.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} title - The step title.
 * @returns {Promise<string>} The step text.
 */
async function openStep(page, title) {
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  const dots = stepper.locator('.step-dot');
  for (let i = 0; i < await dots.count(); i += 1) {
    await dots.nth(i).click();
    if (await stepper.locator('.step-title').textContent() === title) {
      return stepper.locator('.step-content').textContent();
    }
  }
  throw new Error(`no step titled ${title}`);
}

/**
 * The locant labels drawn on the canvas, as atom id → text.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<Record<number, string>>} The labels.
 */
async function canvasLocants(page) {
  return page.evaluate(() => Object.fromEntries([...document.querySelectorAll('svg#canvas .locant')]
    .map((node) => [Number(node.dataset.atomId), node.textContent])));
}

test('ácido 4-metilbenzoico in either Kekulé drawing: systematic and para forms, COOH at 1 in the numbering and on the canvas', async ({ page }) => {
  const errors = await openApp(page);
  // Atoms 1–3 are the COOH (O, C, O); atoms 4–7, 9, 10 the ring; the COOH on atom 4, the methyl (atom 8) on atom 7.
  for (const smiles of ['OC(=O)C1=CC=C(C)C=C1', 'OC(=O)C1C=CC(C)=CC=1']) {
    await loadSmiles(page, smiles);
    await expectName(page, 'ácido 4-metilbenzoico');
    const alts = await alternatives(page);
    expect(alts).toHaveLength(2);
    expect(alts.some((a) => a.includes('ácido 4-metilbenceno-1-carboxílico') && a.includes('forma sistemática'))).toBe(true);
    expect(alts.some((a) => a.includes('ácido p-metilbenzoico') && a.includes('forma antigua con orto/meta/para'))).toBe(true);
    expect(alts.join(' | ')).not.toContain('toluico');
    const text = await openStep(page, 'Numera el anillo');
    expect(text).toContain('el grupo –COOH es el grupo principal y lleva el número más bajo, así que el carbono del anillo unido al –COOH es siempre el 1');
    expect(text).toContain('«metil» está en posición para (1,4) respecto al grupo –COOH.');
    expect(text).not.toContain('enlace');
    await expect(page.locator('svg#canvas .locant')).toHaveCount(6);
    const locants = await canvasLocants(page);
    expect([locants[4], locants[7]]).toEqual(['1', '4']);
    await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();
  } // End of the loop over the two Kekulé drawings
  const assemble = await openStep(page, 'Monta el nombre');
  expect(assemble).toContain('El grupo –COOH no lleva número');
  expect(assemble).toContain('En la forma sistemática sí se escribe: «ácido 4-metilbenceno-1-carboxílico»');
  // The colour key: `benz` and `-oico`, never the `fen` / `-ol` of fenol.
  expect(await page.locator('#stepper ul.legend .part').allTextContents()).toEqual(['ácido', '4', 'metil', 'benz', '-oico']);
  expect(errors).toEqual([]);
}); // End of test 'ácido 4-metilbenzoico in either Kekulé drawing…'

for (const c of [
  { smiles: 'O=CC1=CC=C(Cl)C=C1', name: '4-clorobenzaldehído', present: ['4-clorobenceno-1-carbaldehído', 'p-clorobenzaldehído'], absent: ['bencenocarbaldehído'] },
  { smiles: 'N#CC1=CC=CC(C)=C1', name: '3-metilbenzonitrilo', present: ['3-metilbenceno-1-carbonitrilo', 'm-metilbenzonitrilo'], absent: ['tolu'] },
  { smiles: 'NC(=O)C1=CC=C(C)C=C1', name: '4-metilbenzamida', present: ['4-metilbenceno-1-carboxamida', 'p-metilbenzamida'], absent: ['tolu'] },
  { smiles: 'CCNC(=O)C1=CC=C(C)C=C1', name: 'N-etil-4-metilbenzamida', present: ['N-etil-4-metilbenceno-1-carboxamida', 'N-etil-p-metilbenzamida'], absent: [] },
  { smiles: 'OC(=O)C1=CC=C(O)C=C1', name: 'ácido 4-hidroxibenzoico', present: ['ácido 4-hidroxibenceno-1-carboxílico', 'ácido p-hidroxibenzoico'], absent: ['fenol'] },
  { smiles: 'O=C(O)C1=CC=C(C=O)C=C1', name: 'ácido 4-formilbenzoico', present: ['ácido 4-formilbenceno-1-carboxílico', 'ácido p-formilbenzoico'], absent: ['benzaldehído'] },
  { smiles: 'NC(=O)C1=CC(C#N)=CC=C1', name: '3-cianobenzamida', present: ['3-cianobenceno-1-carboxamida', 'm-cianobenzamida'], absent: ['benzonitrilo'] },
  { smiles: 'NC1=CC=C(C(O)=O)C=C1O', name: 'ácido 4-amino-3-hidroxibenzoico', present: ['ácido 4-amino-3-hidroxibenceno-1-carboxílico'], absent: ['forma antigua', 'p-amino', 'm-hidroxi'] },
]) {
  test(`${c.smiles} is named ${c.name} with the right "Otras formas válidas"`, async ({ page }) => {
    const errors = await openApp(page);
    await loadSmiles(page, c.smiles);
    await expectName(page, c.name);
    const alts = (await alternatives(page)).join(' | ');
    for (const text of c.present) {
      expect(alts).toContain(text);
    }
    for (const text of c.absent) {
      expect(alts).not.toContain(text);
    }
    expect(errors).toEqual([]);
  });
} // End of the loop over the named benzoic acids, benzaldehydes, benzonitriles and benzamides

test('still out of scope: a diester, a CHO on a branch, an ester or a ketone beside other groups (two ring –COOH or –CHO are named since I-44)', async ({ page }) => {
  const errors = await openApp(page);
  const error = page.locator('#results .results-error');
  for (const smiles of ['CCOC(=O)C1=CC=C(C(=O)OCC)C=C1', 'O=CCC1=CC=C(C(O)=O)C=C1', 'CCOC(=O)C1=CC=C(C)C=C1', 'CC(=O)C1=CC=C(C(O)=O)C=C1']) {
    await loadSmiles(page, smiles);
    await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
    await expect(error).toHaveAttribute('data-code', 'CYCLE');
    await expect(error).toContainText('el benceno-1,2-diol o el ácido 4-hidroxibenzoico');
    await expect(page.locator('#result-name')).toHaveCount(0);
  } // End of the loop over the refused benzenes
  expect(errors).toEqual([]);
});

test('Ordenar dibujo lays out substituted benzoic acids and benzamides cleanly; the 90° view falls back', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['OC(=O)C1=CC=C(C)C=C1', 'ácido 4-metilbenzoico'],
    ['CCNC(=O)C1=CC=C(C)C=C1', 'N-etil-4-metilbenzamida'],
    ['NC(=O)C1=CC(C#N)=CC=C1', '3-cianobenzamida'],
    ['OC(=O)C1=C(C)C(C)=C(C)C(C)=C1C', 'ácido 2,3,4,5,6-pentametilbenzoico'],
  ]) {
    await loadSmiles(page, smiles);
    await expectName(page, name);
    const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
    await page.locator('#toolbar [data-action="arrange"]').click();
    await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
    await expect(page.locator('#toast')).not.toHaveText(/No he podido ordenar/);
    const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
    expect(after.bonds).toEqual(before.bonds);
    const problems = layoutProblems(moleculeFromJSON(after).mol);
    expect(problems, `${smiles}: ${JSON.stringify(problems)}`).toMatchObject({ ok: true, crossings: 0, inside: 0 });
    await expect(page.locator('#result-name')).toHaveText(name);
    await openStep(page, 'Numera el anillo');
    await expect(page.locator('svg#canvas .locant')).toHaveCount(6);
    await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();
  } // End of the loop over the molecules to lay out

  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await page.locator('#right-angle-button').click();
  expect(await page.evaluate(() => window.__editor.isProjected())).toBe(false);
  await expect(page.locator('#right-angle-note')).toHaveText('Hay un anillo: se ve el dibujo normal.');
  await expect(page.locator('svg#canvas')).not.toHaveClass(/is-right-angle/);
  expect(errors).toEqual([]);
}); // End of test 'Ordenar dibujo lays out substituted benzoic acids…'
