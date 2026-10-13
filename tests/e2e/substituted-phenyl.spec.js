/**
 * @file Substituted phenyl and phenoxy prefixes e2e (design.md §14, I-45a):
 * a benzene with its own prefixes beside one functional branch is a
 * `fenil` / `fenoxi` prefix of the chain parent, in parentheses
 * (`1-(4-metilfenil)etan-1-ona`, `2-(4-clorofenil)etan-1-ol`,
 * `ácido 2-(3-metilfenil)etanoico`, `2-(4-metilfenoxi)etan-1-ol`,
 * `N-(4-metilfenil)etanamida`), in either Kekulé drawing; "Otras formas
 * válidas" keeps the acetic forms (`ácido 2-(3-metilfenil)acético`,
 * `N-(4-metilfenil)acetamida`) but never `acetofenona`; the substituents
 * step numbers the phenyl from its attachment carbon. An ester beside
 * another functional group of the ring stays refused (substituted benzoyl
 * groups are named since I-45b: substituted-benzoyl.spec.js; esters with a
 * substituted ring since I-45c: substituted-esters.spec.js). "Ordenar dibujo"
 * gives a clean drawing. Runs on the dev server and on dist/index.html.
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

/** The I-45a targets: both Kekulé drawings, the name, the alternatives present and absent. */
const CASES = [
  {
    drawings: ['CC(=O)C1=CC=C(C)C=C1', 'CC(=O)C1C=CC(C)=CC=1'],
    name: '1-(4-metilfenil)etan-1-ona',
    present: [],
    absent: ['acetofenona'],
  },
  {
    drawings: ['OCCC1=CC=C(Cl)C=C1', 'OCCC1C=CC(Cl)=CC=1'],
    name: '2-(4-clorofenil)etan-1-ol',
    present: [],
    absent: [],
  },
  {
    drawings: ['OC(=O)CC1=CC(C)=CC=C1', 'OC(=O)CC1C=C(C)C=CC=1'],
    name: 'ácido 2-(3-metilfenil)etanoico',
    present: ['ácido 2-(3-metilfenil)acético'],
    absent: ['fenilacético'],
  },
  {
    drawings: ['OCCOC1=CC=C(C)C=C1', 'OCCOC1C=CC(C)=CC=1'],
    name: '2-(4-metilfenoxi)etan-1-ol',
    present: [],
    absent: [],
  },
  {
    drawings: ['CC(=O)NC1=CC=C(C)C=C1', 'CC(=O)NC1C=CC(C)=CC=1'],
    name: 'N-(4-metilfenil)etanamida',
    present: ['N-(4-metilfenil)acetamida'],
    absent: ['acetanilida'],
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
} // End of the loop over the I-45a targets

test('the substituents step numbers the phenyl from its attachment carbon', async ({ page }) => {
  const errors = await openApp(page);
  await loadSmiles(page, 'OCCC1=C(C)C=CC=C1Cl');
  await expectName(page, '2-(2-cloro-6-metilfenil)etan-1-ol');
  const text = await openStep(page, 'Nombra los sustituyentes');
  expect(text).toContain('«2-cloro-6-metilfenil» es un anillo de benceno unido a la cadena principal');
  expect(text).toContain('Sus carbonos se numeran empezando por el que está unido a la cadena principal, que es el 1');
  expect(text).toContain('el número más bajo es para el sustituyente que va antes por orden alfabético');
  expect(text).toContain('Va entre paréntesis porque tiene sus propios sustituyentes y números');
  expect(text).not.toContain('un solo sustituyente');
  expect(errors).toEqual([]);
});

test('still out of scope: an ester beside another functional group of the ring, two functional branches', async ({ page }) => {
  const errors = await openApp(page);
  const error = page.locator('#results .results-error');
  for (const [smiles, code, text] of [
    // Esters with a substituted ring are named since I-45c (tests/e2e/substituted-esters.spec.js).
    ['CC(=O)OC1=CC=C(O)C=C1', 'CYCLE', 'su benceno lleva, además del éster, otro grupo funcional'],
    ['CCOC(=O)C1=CC=C(N)C=C1', 'CYCLE', 'su benceno lleva, además del éster, otro grupo funcional'],
    ['OCCC1=CC=C(CCO)C=C1', 'CYCLE', 'como sustituyente (fenil, fenoxi o benzoil) cuando una sola de sus ramas lleva grupos funcionales'],
  ]) {
    await loadSmiles(page, smiles);
    await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
    await expect(error).toHaveAttribute('data-code', code);
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
