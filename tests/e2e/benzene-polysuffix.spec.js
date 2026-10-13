/**
 * @file Benzenes with several identical principal groups e2e (design.md
 * §14, I-44): two to six OH, amine, –COOH, –CHO, –C≡N or amide groups on
 * the ring are the multiplied suffix of `benceno`, always the systematic
 * name (`3-etilbenceno-1,2-diol`, the user's example, in either Kekulé
 * drawing; `benceno-1,4-diamina`, `ácido benceno-1,3-dicarboxílico`,
 * `benceno-1,4-dicarbaldehído`, `benceno-1,3,5-tricarbonitrilo`,
 * `benceno-1,4-dicarboxamida`); the retained names (`hidroquinona`,
 * `ácido isoftálico`, `ácido 4-metilftálico`…) appear under "Otras formas
 * válidas" only, never `anilina` or a repeated systematic form; the steps
 * speak in plural, the "Numera el anillo" step numbers the groups first and
 * never talks about double bonds, and the canvas shows their numbers.
 * Groups on the N of a ring diamine stay refused. "Ordenar dibujo" gives a
 * clean drawing and the 90° view keeps the normal drawing. Runs on the dev
 * server and on dist/index.html.
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

test('3-etilbenceno-1,2-diol (the user\'s example) in either Kekulé drawing: OH at 1,2, ethyl at 3, plural steps', async ({ page }) => {
  const errors = await openApp(page);
  // Atoms 1–2 the ethyl; 3, 4, 6, 8, 9, 10 the ring; the ethyl on atom 3, the OH (atoms 5 and 7) on atoms 4 and 6.
  for (const smiles of ['CCC1=C(O)C(O)=CC=C1', 'CCC1C(O)=C(O)C=CC=1']) {
    await loadSmiles(page, smiles);
    await expectName(page, '3-etilbenceno-1,2-diol');
    expect(await alternatives(page)).toEqual([]);
    const text = await openStep(page, 'Numera el anillo');
    expect(text).toContain('los grupos –OH son el grupo principal y llevan los localizadores más bajos, así que uno de ellos está siempre en el 1');
    expect(text).not.toContain('enlace');
    await expect(page.locator('svg#canvas .locant')).toHaveCount(6);
    const locants = await canvasLocants(page);
    expect([locants[6], locants[4], locants[3]]).toEqual(['1', '2', '3']);
    await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();
  } // End of the loop over the two Kekulé drawings
  const group = await openStep(page, 'Reconoce el grupo funcional');
  expect(group).toContain('Con un solo grupo –OH el benceno se llama «fenol», pero con 2 grupos –OH se nombra siempre con «benceno» y el sufijo «-diol»');
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();
  const assemble = await openStep(page, 'Monta el nombre');
  expect(assemble).toContain('Después va «benceno», los números de los grupos –OH (1,2) entre guiones y el sufijo «-diol»');
  expect(assemble).not.toContain('fenol');
  expect(await page.locator('#stepper ul.legend .part').allTextContents()).toEqual(['3', 'etil', 'benceno', '1,2', '-diol']);
  expect(errors).toEqual([]);
}); // End of test '3-etilbenceno-1,2-diol (the user's example)…'

for (const c of [
  { smiles: 'NC1=CC=C(N)C=C1', name: 'benceno-1,4-diamina', present: [], absent: ['anilina', 'bencenamina'] },
  { smiles: 'O=C(O)C1=CC(C(=O)O)=CC=C1', name: 'ácido benceno-1,3-dicarboxílico', present: ['ácido isoftálico'], absent: ['benzoico', 'forma sistemática'] },
  { smiles: 'O=CC1=CC=C(C=O)C=C1', name: 'benceno-1,4-dicarbaldehído', present: ['tereftalaldehído'], absent: ['benzaldehído', 'forma sistemática'] },
  { smiles: 'N#CC1=CC(C#N)=CC(C#N)=C1', name: 'benceno-1,3,5-tricarbonitrilo', present: [], absent: ['benzonitrilo'] },
  { smiles: 'NC(=O)C1=CC=C(C(N)=O)C=C1', name: 'benceno-1,4-dicarboxamida', present: [], absent: ['benzamida', 'ftalamida'] },
  { smiles: 'OC1=CC=C(O)C=C1', name: 'benceno-1,4-diol', present: ['hidroquinona'], absent: ['fenol', 'p-'] },
  { smiles: 'OC1=CC=CC=C1O', name: 'benceno-1,2-diol', present: ['pirocatecol', 'catecol'], absent: ['fenol'] },
  { smiles: 'CC1=CC=C(O)C(O)=C1', name: '4-metilbenceno-1,2-diol', present: [], absent: ['catecol', 'cresol'] },
  { smiles: 'CC1=CC=C(C(=O)O)C(C(=O)O)=C1', name: 'ácido 4-metilbenceno-1,2-dicarboxílico', present: ['ácido 4-metilftálico'], absent: ['benzoico'] },
]) {
  test(`${c.smiles} is named ${c.name} with the right "Otras formas válidas"`, async ({ page }) => {
    const errors = await openApp(page);
    await loadSmiles(page, c.smiles);
    await expectName(page, c.name);
    const alts = await alternatives(page);
    expect(alts).toHaveLength(c.present.length);
    const joined = alts.join(' | ');
    for (const text of c.present) {
      expect(joined).toContain(text);
    }
    for (const text of c.absent) {
      expect(joined).not.toContain(text);
    }
    expect(errors).toEqual([]);
  });
} // End of the loop over the named benzenes with several identical principal groups

test('still out of scope: a group on the N of a ring diamine, an ester beside two OH', async ({ page }) => {
  const errors = await openApp(page);
  const error = page.locator('#results .results-error');
  for (const [smiles, code, text] of [
    ['CNC1=CC=C(N)C=C1', 'HETEROATOM', 'Este benceno tiene varios grupos amino unidos al anillo'],
    ['CCOC(=O)C1=CC(O)=CC(O)=C1', 'CYCLE', 'su benceno lleva, además del éster, otro grupo funcional'], // an ester beside other functional groups of the ring (I-45c)
  ]) {
    await loadSmiles(page, smiles);
    await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
    await expect(error).toHaveAttribute('data-code', code);
    await expect(error).toContainText(text);
    await expect(page.locator('#result-name')).toHaveCount(0);
  } // End of the loop over the refused benzenes
  expect(errors).toEqual([]);
});

test('Ordenar dibujo lays them out cleanly; the 90° view falls back', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['CCC1=C(O)C(O)=CC=C1', '3-etilbenceno-1,2-diol'],
    ['O=C(O)C1=CC(C(=O)O)=CC=C1', 'ácido benceno-1,3-dicarboxílico'],
    ['N#CC1=CC(C#N)=CC(C#N)=C1', 'benceno-1,3,5-tricarbonitrilo'],
    ['NC(=O)C1=CC=C(C(N)=O)C=C1', 'benceno-1,4-dicarboxamida'],
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
  } // End of the loop over the molecules to lay out

  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await page.locator('#right-angle-button').click();
  expect(await page.evaluate(() => window.__editor.isProjected())).toBe(false);
  await expect(page.locator('#right-angle-note')).toHaveText('Hay un anillo: se ve el dibujo normal.');
  await expect(page.locator('svg#canvas')).not.toHaveClass(/is-right-angle/);
  expect(errors).toEqual([]);
}); // End of test 'Ordenar dibujo lays them out cleanly…'
