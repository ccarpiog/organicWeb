/**
 * @file Esters with substituted benzene rings e2e (design.md §14, I-45c): a
 * substituted benzoate (`4-metilbenzoato de etilo`), a substituted phenyl
 * as the O-bound group (`etanoato de 4-metilfenilo`, with `acetato de
 * 4-metilfenilo`) and two rings split by the ester (`benzoato de
 * 4-clorofenilo`, `4-metilbenzoato de 4-clorofenilo`), in either Kekulé
 * drawing; "Otras formas válidas" lists exactly the expected entries (the
 * o/m/p form only for a benzoate with one prefix, never `toluato` or
 * `tolilo`); the ester step describes the numbering of the O-bound phenyl.
 * An ester beside another functional group of the ring stays refused.
 * "Ordenar dibujo" gives a clean drawing. Runs on the dev server and on
 * dist/index.html.
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

/** The I-45c targets: both Kekulé drawings, the name, the alternatives present and absent. */
const CASES = [
  {
    drawings: ['CCOC(=O)C1=CC=C(C)C=C1', 'CCOC(=O)C1C=CC(C)=CC=1'],
    name: '4-metilbenzoato de etilo',
    present: ['4-metilbenceno-1-carboxilato de etilo', 'p-metilbenzoato de etilo'],
    absent: ['toluato'],
  },
  {
    drawings: ['CC(=O)OC1=CC=C(C)C=C1', 'CC(=O)OC1C=CC(C)=CC=1'],
    name: 'etanoato de 4-metilfenilo',
    present: ['acetato de 4-metilfenilo'],
    absent: ['tolilo', 'p-'],
  },
  {
    drawings: ['O=C(OC1=CC=C(Cl)C=C1)C1=CC=CC=C1', 'O=C(OC1C=CC(Cl)=CC=1)C1C=CC=CC=1'],
    name: 'benzoato de 4-clorofenilo',
    present: ['bencenocarboxilato de 4-clorofenilo'],
    absent: ['p-'],
  },
  {
    drawings: ['CC1=CC=C(C=C1)C(=O)OC1=CC=C(Cl)C=C1', 'CC1C=CC(=CC=1)C(=O)OC1C=CC(Cl)=CC=1'],
    name: '4-metilbenzoato de 4-clorofenilo',
    present: ['4-metilbenceno-1-carboxilato de 4-clorofenilo', 'p-metilbenzoato de 4-clorofenilo'],
    absent: ['toluato', 'de p-'],
  },
  {
    drawings: ['CC(=O)OC1=C(C)C=CC=C1Cl', 'CC(=O)OC1C(C)=CC=CC=1Cl'],
    name: 'etanoato de 2-cloro-6-metilfenilo',
    present: ['acetato de 2-cloro-6-metilfenilo'],
    absent: [],
  },
  {
    drawings: ['CCOC(=O)CC1=CC=C(C)C=C1', 'CCOC(=O)CC1C=CC(C)=CC=1'],
    name: '2-(4-metilfenil)etanoato de etilo',
    present: ['2-(4-metilfenil)acetato de etilo'],
    absent: [],
  },
];

for (const c of CASES) {
  test(`${c.name} in either Kekulé drawing, with the right "Otras formas válidas"`, async ({ page }) => {
    const errors = await openApp(page);
    for (const smiles of c.drawings) {
      await loadSmiles(page, smiles);
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
    } // End of the loop over the two Kekulé drawings
    expect(errors).toEqual([]);
  });
} // End of the loop over the I-45c targets

test('the ester step numbers the O-bound phenyl from the carbon bonded to the oxygen', async ({ page }) => {
  const errors = await openApp(page);
  await loadSmiles(page, 'CC(=O)OC1=C(C)C=CC=C1Cl');
  await expectName(page, 'etanoato de 2-cloro-6-metilfenilo');
  const text = await openStep(page, 'Separa las dos partes del éster');
  expect(text).toContain('«2-cloro-6-metilfenilo» es un anillo de benceno unido al oxígeno');
  expect(text).toContain('Sus carbonos se numeran empezando por el que está unido al oxígeno, que es el 1');
  expect(text).toContain('el número más bajo es para el sustituyente que va antes por orden alfabético');
  expect(text).toContain('No va entre paréntesis: es una palabra suelta');
  expect(errors).toEqual([]);
});

test('the ester step of a split ester describes both substituted rings', async ({ page }) => {
  const errors = await openApp(page);
  await loadSmiles(page, 'CC1=CC=C(C=C1)C(=O)OC1=CC=C(Cl)C=C1');
  await expectName(page, '4-metilbenzoato de 4-clorofenilo');
  const text = await openStep(page, 'Separa las dos partes del éster');
  expect(text).toContain('«ácido 4-metilbenzoico», cambiando «-oico» por «-oato»: «4-metilbenzoato»');
  expect(text).toContain('El anillo lleva «cloro» en el carbono 4, delante de «fenilo»');
  expect(errors).toEqual([]);
});

test('still out of scope: an ester beside another functional group of the ring', async ({ page }) => {
  const errors = await openApp(page);
  const error = page.locator('#results .results-error');
  for (const smiles of ['CC(=O)OC1=CC=C(O)C=C1', 'CCOC(=O)C1=CC=C(C(=O)OCC)C=C1']) {
    await loadSmiles(page, smiles);
    await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
    await expect(error).toHaveAttribute('data-code', 'CYCLE');
    await expect(error).toContainText('su benceno lleva, además del éster, otro grupo funcional');
    await expect(page.locator('#result-name')).toHaveCount(0);
  } // End of the loop over the refused molecules
  expect(errors).toEqual([]);
});

test('Ordenar dibujo lays them out cleanly', async ({ page }) => {
  const errors = await openApp(page);
  for (const c of CASES) {
    const [smiles] = c.drawings;
    await loadSmiles(page, smiles);
    await expectName(page, c.name);
    const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
    await page.locator('#toolbar [data-action="arrange"]').click();
    await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
    await expect(page.locator('#toast')).not.toHaveText(/No he podido ordenar/);
    const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
    expect(after.bonds).toEqual(before.bonds);
    const problems = layoutProblems(moleculeFromJSON(after).mol);
    expect(problems, `${smiles}: ${JSON.stringify(problems)}`).toMatchObject({ ok: true, crossings: 0, inside: 0 });
    await expect(page.locator('#result-name')).toHaveText(c.name);
  } // End of the loop over the molecules to lay out
  expect(errors).toEqual([]);
}); // End of test 'Ordenar dibujo lays them out cleanly'
