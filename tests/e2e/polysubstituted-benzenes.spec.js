/**
 * @file Polysubstituted benzenes e2e (design.md §14, I-42): benzenes whose
 * groups are all hydrocarbon branches, halogens or alkoxy groups, loaded
 * through the editor test API in either Kekulé drawing, get their name; the
 * xileno / mesitileno names and the old orto/meta/para form appear under
 * "Otras formas válidas" only where §14.4/§14.5 allow them; the "Numera el
 * anillo" step compares the numberings without talking about double bonds,
 * and the canvas shows the locants 1–6 on the ring with 1 on a substituted
 * carbon. "Ordenar dibujo" gives a clean drawing (layoutProblems()) for two
 * to six substituents, locant 1 on top, and the 90° view keeps the normal
 * drawing with its ring note. Runs on the dev server and on dist/index.html.
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

test('o-xylene in either Kekulé drawing: name, xileno and orto forms, numbering step and canvas locants', async ({ page }) => {
  const errors = await openApp(page);
  // Atoms 2–7 are the ring; the methyl groups hang from atoms 2 and 7.
  for (const smiles of ['CC1=CC=CC=C1C', 'CC1C=CC=CC=1C']) {
    await loadSmiles(page, smiles);
    await expectName(page, '1,2-dimetilbenceno');
    const alts = await alternatives(page);
    expect(alts.some((a) => a.includes('1,2-xileno'))).toBe(true);
    expect(alts.some((a) => a.includes('o-xileno'))).toBe(true);
    expect(alts.some((a) => a.includes('o-dimetilbenceno') && a.includes('forma antigua con orto/meta/para'))).toBe(true);

    const text = await openStep(page, 'Numera el anillo');
    expect(text).toContain('todos los sustituyentes juntos llevan los localizadores más bajos');
    expect(text).toContain('opción A: 1, 2; opción B: 1, 6');
    expect(text).toContain('Los dos «metil» están en posición orto (1,2).');
    expect(text).not.toContain('enlace doble');
    // Six ring locants on the canvas; 1 and 2 on the two carbons that carry a methyl group.
    await expect(page.locator('svg#canvas .locant')).toHaveCount(6);
    const locants = await canvasLocants(page);
    expect(Object.values(locants).sort()).toEqual(['1', '2', '3', '4', '5', '6']);
    expect([locants[2], locants[7]].sort()).toEqual(['1', '2']);
    await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();
  } // End of the loop over the two Kekulé drawings
  expect(errors).toEqual([]);
}); // End of test 'o-xylene in either Kekulé drawing…'

test('two different prefixes: alphabetical tie-break, the meta note and the m- form under «Otras formas válidas» (I-54a)', async ({ page }) => {
  const errors = await openApp(page);
  // Atoms 3–8 are the ring: the ethyl on atom 3, the chlorine (atom 9) on atom 7.
  await loadSmiles(page, 'CCC1=CC=CC(Cl)=C1');
  await expectName(page, '1-cloro-3-etilbenceno');
  // The old letter form of two different groups (design.md §14.4, I-54a), with the orto/meta/para label.
  await expect(page.locator('#alternatives .alternatives-title')).toHaveText('Otras formas válidas');
  const alts = await alternatives(page);
  expect(alts).toHaveLength(1);
  expect(alts[0]).toContain('m-cloroetilbenceno');
  expect(alts[0]).toContain('forma antigua con orto/meta/para');
  const text = await openStep(page, 'Numera el anillo');
  expect(text).toContain('el número más bajo es para el sustituyente que se escribe primero');
  expect(text).toContain('opción A: 1, 3; opción B: 3, 1');
  expect(text).toContain('«cloro» y «etil» están en posición meta (1,3).');
  expect(text).toContain('este compuesto se llamaba «m-cloroetilbenceno»');
  expect(text).toContain('«m-cloroetilbenceno» se puede leer como «(cloroetil)benceno»');
  const locants = await canvasLocants(page);
  expect([locants[7], locants[3]]).toEqual(['1', '3']);
  expect(errors).toEqual([]);
});

for (const c of [
  { smiles: 'CC1=CC(C)=CC(C)=C1', name: '1,3,5-trimetilbenceno', present: ['mesitileno'], absent: ['m-'] },
  { smiles: 'CCC1=CC(C)=C(C)C=C1', name: '4-etil-1,2-dimetilbenceno', present: [], absent: ['xileno', 'o-'] },
  { smiles: 'ClC1=CC=C(Cl)C=C1', name: '1,4-diclorobenceno', present: ['p-diclorobenceno'], absent: ['xileno'] },
  { smiles: 'COC1=CC=C(C)C=C1', name: '1-metil-4-metoxibenceno', present: ['p-metil(metoxi)benceno'], absent: ['anisol'] },
  { smiles: 'CC1=CC=CC=C1I', name: '1-metil-2-yodobenceno', present: ['o-metilyodobenceno'], absent: [] },
  { smiles: 'CC(C)C1=CC=C(C(C)C)C=C1', name: '1,4-diisopropilbenceno', present: ['1,4-di(propan-2-il)benceno', 'p-diisopropilbenceno'], absent: [] },
  { smiles: 'ClC1=C(Cl)C(Cl)=C(Cl)C(Cl)=C1Cl', name: 'hexaclorobenceno', present: [], absent: [] },
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
} // End of the loop over the named benzenes

test('Ordenar dibujo lays out benzenes with two to six substituents cleanly; the 90° view falls back', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['CC1=CC=CC=C1Br', '1-bromo-2-metilbenceno'],
    ['CCC1=CC(OC)=CC(C(C)C)=C1', '1-etil-3-isopropil-5-metoxibenceno'],
    ['C=CC1=C(F)C(Cl)=C(C#C)C=C1', '2-cloro-4-etenil-1-etinil-3-fluorobenceno'],
    ['CC1=C(C)C(C)=C(OCC)C(C(C)(C)C)=C1', '1-tert-butil-2-etoxi-3,4,5-trimetilbenceno'],
    ['CC1=C(C)C(C)=C(C)C(C)=C1C', 'hexametilbenceno'],
    ['CCC1=C(Cl)C(C)=C(Br)C(OC)=C1I', '1-bromo-3-cloro-4-etil-2-metil-6-metoxi-5-yodobenceno'],
  ]) {
    await loadSmiles(page, smiles);
    await expectName(page, name);
    const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
    await page.locator('#toolbar [data-action="arrange"]').click();
    await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
    await expect(page.locator('#toast')).not.toHaveText(/No he podido ordenar/);
    const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
    expect(after.bonds).toEqual(before.bonds);
    expect(after.atoms).not.toEqual(before.atoms);
    const problems = layoutProblems(moleculeFromJSON(after).mol);
    expect(problems, `${smiles}: ${JSON.stringify(problems)}`).toMatchObject({ ok: true, crossings: 0, inside: 0 });
    await expect(page.locator('#result-name')).toHaveText(name);
    if (name.startsWith('hexa')) {
      continue; // No numbering step: «hexametilbenceno» has no locants.
    }
    // The ring atom with locant 1 (shown on the canvas after the redraw) is the top vertex of the hexagon.
    await openStep(page, 'Numera el anillo');
    const locants = await canvasLocants(page);
    const ring = Object.keys(locants).map(Number);
    expect(ring).toHaveLength(6);
    const one = ring.find((id) => locants[id] === '1');
    const y = (id) => after.atoms.find((a) => a.id === id).y;
    expect(Math.min(...ring.map(y))).toBeCloseTo(y(one), 6);
    await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();
  } // End of the loop over the benzenes to lay out

  // The 90° view keeps the normal drawing of a ring, with its note.
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await page.locator('#right-angle-button').click();
  expect(await page.evaluate(() => window.__editor.isProjected())).toBe(false);
  await expect(page.locator('#right-angle-note')).toHaveText('Hay un anillo: se ve el dibujo normal.');
  await expect(page.locator('svg#canvas')).not.toHaveClass(/is-right-angle/);
  await loadSmiles(page, 'CC1=CC=CC=C1C');
  expect(await page.evaluate(() => window.__editor.isProjected())).toBe(false);
  await expect(page.locator('#right-angle-note')).toHaveText('Hay un anillo: se ve el dibujo normal.');
  expect(errors).toEqual([]);
}); // End of test 'Ordenar dibujo lays out benzenes with two to six substituents…'
