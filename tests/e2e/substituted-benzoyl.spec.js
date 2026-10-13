/**
 * @file Substituted benzoyl prefixes e2e (design.md §14, I-45b): a C=O
 * carbon the parent chain misses, bonded to a benzene with its own
 * prefixes, is a `(…benzoil)` prefix in parentheses
 * (`ácido 2-(4-metilbenzoil)butanoico`, `3-(4-metilbenzoil)pentano-2,4-diona`,
 * `ácido 2-[(4-clorobenzoil)amino]etanoico`), in either Kekulé drawing;
 * "Otras formas válidas" offers only the isopropyl prefix styles, never
 * `toluoil` or an o/m/p form; the substituents step numbers the benzoyl
 * ring from the carbon bonded to the C=O. A functional group on the ring
 * stays refused (beside an ester too; a benzoyl beside an ester is named
 * since I-45c, tests/e2e/substituted-esters.spec.js). "Ordenar dibujo" gives a
 * clean drawing. Runs on the dev server and on dist/index.html.
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

/** The I-45b targets: both Kekulé drawings, the name, the alternatives present and absent. */
const CASES = [
  {
    drawings: ['OC(=O)C(CC)C(=O)C1=CC=C(C)C=C1', 'OC(=O)C(CC)C(=O)C1C=CC(C)=CC=1'],
    name: 'ácido 2-(4-metilbenzoil)butanoico',
    present: [],
    absent: ['toluoil', 'p-'],
  },
  {
    drawings: ['OC(=O)C(CC)C(=O)C1=C(C)C=CC=C1Cl', 'OC(=O)C(CC)C(=O)C1C(C)=CC=CC=1Cl'],
    name: 'ácido 2-(2-cloro-6-metilbenzoil)butanoico',
    present: [],
    absent: [],
  },
  {
    drawings: ['CC(=O)C(C(=O)C1=CC=C(C)C=C1)C(C)=O', 'CC(=O)C(C(=O)C1C=CC(C)=CC=1)C(C)=O'],
    name: '3-(4-metilbenzoil)pentano-2,4-diona',
    present: [],
    absent: [],
  },
  {
    drawings: ['OC(=O)CNC(=O)C1=CC=C(Cl)C=C1', 'OC(=O)CNC(=O)C1C=CC(Cl)=CC=1'],
    name: 'ácido 2-[(4-clorobenzoil)amino]etanoico',
    present: [],
    absent: [],
  },
  {
    drawings: ['OC(=O)C(CC)C(=O)C1=CC=C(C(C)C)C=C1', 'OC(=O)C(CC)C(=O)C1C=CC(C(C)C)=CC=1'],
    name: 'ácido 2-(4-isopropilbenzoil)butanoico',
    present: ['ácido 2-[4-(propan-2-il)benzoil]butanoico', 'ácido 2-[4-(1-metiletil)benzoil]butanoico'],
    absent: ['p-', 'cumoil'],
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
} // End of the loop over the I-45b targets

test('the substituents step numbers the benzoyl ring from the carbon bonded to the C=O', async ({ page }) => {
  const errors = await openApp(page);
  await loadSmiles(page, 'OC(=O)C(CC)C(=O)C1=C(C)C=CC=C1Cl');
  await expectName(page, 'ácido 2-(2-cloro-6-metilbenzoil)butanoico');
  const text = await openStep(page, 'Nombra los sustituyentes');
  expect(text).toContain('Con el benceno se llama «benzoil»');
  expect(text).toContain('Sus carbonos se numeran empezando por el que está unido al C=O, que es el 1');
  expect(text).toContain('el número más bajo es para el sustituyente que va antes por orden alfabético');
  expect(text).toContain('«cloro» en el carbono 2 y «metil» en el carbono 6');
  expect(text).toContain('Va entre paréntesis porque tiene sus propios sustituyentes y números');
  expect(text).not.toContain('un solo sustituyente');
  expect(errors).toEqual([]);
});

test('still out of scope: a functional group on the benzoyl ring (beside an ester too, I-45c)', async ({ page }) => {
  const errors = await openApp(page);
  const error = page.locator('#results .results-error');
  for (const [smiles, text] of [
    ['CCOC(=O)C(CC)C(=O)C1=CC=C(O)C=C1', 'su benceno lleva, además del éster, otro grupo funcional'],
    ['OC(=O)C(CC)C(=O)C1=CC=C(O)C=C1', 'como sustituyente (fenil, fenoxi o benzoil) cuando una sola de sus ramas lleva grupos funcionales'],
  ]) {
    await loadSmiles(page, smiles);
    await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
    await expect(error).toHaveAttribute('data-code', 'CYCLE');
    await expect(error).toContainText(text);
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
