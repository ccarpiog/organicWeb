/**
 * @file Phenols and benzenamines with ring prefixes e2e (design.md §14,
 * I-43a): one OH or amine group on the ring is the principal group with
 * locant 1 (`4-metilfenol`, `2-clorobencen-1-amina`,
 * `N,4-dimetilbencen-1-amina`, `4-aminofenol`), in either Kekulé drawing;
 * the cresol, anilina and old orto/meta/para forms appear under "Otras
 * formas válidas" only where §14.4/§14.5 allow them; the "Numera el
 * anillo" step says the principal group takes 1 and never talks about
 * double bonds, and the canvas shows 1 on the carbon with the group. The
 * cases still out of scope keep their refusal. "Ordenar dibujo" gives a
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

test('4-metilfenol in either Kekulé drawing: cresol and para forms, OH at 1 in the numbering and on the canvas', async ({ page }) => {
  const errors = await openApp(page);
  // Atom 1 is the O; atoms 2–5, 7, 8 the ring; the OH on atom 2, the methyl (atom 6) on atom 5.
  for (const smiles of ['OC1=CC=C(C)C=C1', 'OC1C=CC(C)=CC=1']) {
    await loadSmiles(page, smiles);
    await expectName(page, '4-metilfenol');
    const alts = await alternatives(page);
    expect(alts.some((a) => a.includes('p-cresol') && a.includes('que la IUPAC (2013) acepta'))).toBe(true);
    expect(alts.some((a) => a.includes('p-metilfenol') && a.includes('forma antigua con orto/meta/para'))).toBe(true);
    expect(alts).toHaveLength(2);

    const text = await openStep(page, 'Numera el anillo');
    expect(text).toContain('el grupo –OH es el grupo principal y lleva el número más bajo, así que el carbono con el –OH es siempre el 1');
    expect(text).toContain('«metil» está en posición para (1,4) respecto al grupo –OH.');
    expect(text).not.toContain('enlace');
    await expect(page.locator('svg#canvas .locant')).toHaveCount(6);
    const locants = await canvasLocants(page);
    expect([locants[2], locants[5]]).toEqual(['1', '4']);
    await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();
  } // End of the loop over the two Kekulé drawings
  expect(errors).toEqual([]);
}); // End of test '4-metilfenol in either Kekulé drawing…'

test('2-clorobencen-1-amina: the 1 of the amine is written, anilina and orto forms', async ({ page }) => {
  const errors = await openApp(page);
  // Atom 1 is the N; atoms 2–7 the ring; the chlorine (atom 8) on atom 7.
  await loadSmiles(page, 'NC1=CC=CC=C1Cl');
  await expectName(page, '2-clorobencen-1-amina');
  const alts = (await alternatives(page)).join(' | ');
  expect(alts).toContain('2-cloroanilina');
  expect(alts).toContain('o-cloroanilina');
  expect(alts).not.toContain('bencenamina');
  const text = await openStep(page, 'Numera el anillo');
  expect(text).toContain('el grupo amino es el grupo principal y lleva el número más bajo');
  expect(text).toContain('«cloro» está en posición orto (1,2) respecto al grupo amino.');
  expect(text).not.toContain('enlace');
  const locants = await canvasLocants(page);
  expect([locants[2], locants[7]]).toEqual(['1', '2']);
  expect(errors).toEqual([]);
});

for (const c of [
  { smiles: 'CNC1=CC=C(C)C=C1', name: 'N,4-dimetilbencen-1-amina', present: ['N,4-dimetilanilina'], absent: ['p-', 'toluidina'] },
  { smiles: 'NC1=CC=C(O)C=C1', name: '4-aminofenol', present: ['p-aminofenol'], absent: ['anilina', 'cresol'] },
  { smiles: 'OC1=C(C)C=C(C)C=C1Cl', name: '2-cloro-4,6-dimetilfenol', present: [], absent: ['cresol', 'o-', 'm-', 'p-'] },
  { smiles: 'CC(C)C1=CC=C(O)C=C1', name: '4-isopropilfenol', present: ['4-(propan-2-il)fenol', 'p-isopropilfenol'], absent: ['cresol'] },
  { smiles: 'CN(C)C1=CC=C(Br)C=C1', name: '4-bromo-N,N-dimetilbencen-1-amina', present: ['4-bromo-N,N-dimetilanilina', 'p-bromo-N,N-dimetilanilina'], absent: [] },
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
} // End of the loop over the named phenols and benzenamines

test('still out of scope: two OH, two amines, two ring –COOH, an OH on a branch', async ({ page }) => {
  const errors = await openApp(page);
  const error = page.locator('#results .results-error');
  for (const smiles of ['OC1=CC=C(O)C=C1', 'NC1=CC=C(N)C=C1', 'OC(=O)C1=CC=C(C(O)=O)C=C1O', 'OCC1=CC=C(O)C=C1']) {
    await loadSmiles(page, smiles);
    await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
    await expect(error).toContainText('aún no sé combinar con los demás');
    await expect(error).toContainText('el más importante de estos grupos (el grupo principal) aparece una sola vez');
    await expect(page.locator('#result-name')).toHaveCount(0);
  } // End of the loop over the refused benzenes
  expect(errors).toEqual([]);
});

test('Ordenar dibujo lays out phenols and benzenamines cleanly; the 90° view falls back', async ({ page }) => {
  const errors = await openApp(page);
  for (const [smiles, name] of [
    ['OC1=CC=C(C)C=C1', '4-metilfenol'],
    ['NC1=CC=CC=C1Cl', '2-clorobencen-1-amina'],
    ['CNC1=CC=C(C)C=C1', 'N,4-dimetilbencen-1-amina'],
    ['NC1=CC=C(O)C=C1C', '4-amino-3-metilfenol'],
    ['OC1=C(C)C(C)=C(C)C(C)=C1C', '2,3,4,5,6-pentametilfenol'],
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
    // The ring atom with locant 1 (the one with the principal group) is the top vertex of the hexagon.
    await openStep(page, 'Numera el anillo');
    const locants = await canvasLocants(page);
    const ring = Object.keys(locants).map(Number);
    expect(ring).toHaveLength(6);
    const one = ring.find((id) => locants[id] === '1');
    const y = (id) => after.atoms.find((a) => a.id === id).y;
    expect(Math.min(...ring.map(y))).toBeCloseTo(y(one), 6);
    await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();
  } // End of the loop over the molecules to lay out

  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await page.locator('#right-angle-button').click();
  expect(await page.evaluate(() => window.__editor.isProjected())).toBe(false);
  await expect(page.locator('#right-angle-note')).toHaveText('Hay un anillo: se ve el dibujo normal.');
  await expect(page.locator('svg#canvas')).not.toHaveClass(/is-right-angle/);
  expect(errors).toEqual([]);
}); // End of test 'Ordenar dibujo lays out phenols and benzenamines…'
