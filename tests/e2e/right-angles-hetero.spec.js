/**
 * @file 90° view with heteroatoms e2e (design.md §6.3, §13.4 I-41a): named
 * acyclic molecules with O, N or halogens are drawn at right angles (an
 * alcohol, an acid, an ester, an amide, an amine, a nitrile) with the parent
 * chain on one line, no slanted strokes and no overlaps in the real font;
 * chain ends continue the line (`HO–`, `N≡C–`, `CH₃–O–C–`); editing there
 * places, re-bonds and erases heteroatoms through their projected labels
 * (blue ring on the new atom); stepper highlights land on the projected
 * heteroatoms; a ring still falls back with its note.
 */

import { test, expect } from '@playwright/test';
import { parseSmiles } from '../../src/model/smiles.js';
import { moleculeToJSON } from '../../src/model/molecule.js';

/** Note shown while the 90° drawing is on screen. */
const HINT = 'Puedes dibujar aquí. Para mover átomos u ordenar el dibujo, desactiva los ángulos rectos.';

/**
 * Opens the app, collecting page errors, and turns the 90° view on (Con carbonos).
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<string[]>} The live list of console/page errors.
 */
async function openRightAngles(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('index.html');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await page.locator('#right-angle-button').click();
  return errors;
}

/**
 * Loads a SMILES string as the drawing (atoms on a loose grid; ids follow the SMILES order from 1).
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} smiles - The molecule.
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
 * Rendered atom labels by atom id: text and SVG position.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<Record<string, {x: number, y: number, text: string}>>} The labels.
 */
async function labels(page) {
  return page.evaluate(() => Object.fromEntries([...document.querySelectorAll('svg#canvas .atom-label')]
    .map((t) => [t.dataset.atomId, { x: Number(t.getAttribute('x')), y: Number(t.getAttribute('y')), text: t.textContent }])));
}

/**
 * Geometry of the drawing as rendered with the real font: slanted strokes,
 * strokes touching a label box, and overlapping label boxes.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<{slanted: number, strokeOnLabel: number, labelOverlap: number}>} Counts.
 */
async function geometryReport(page) {
  return page.evaluate(() => {
    const boxes = [...document.querySelectorAll('svg#canvas .atom-label')].map((t) => t.getBoundingClientRect());
    const lines = [...document.querySelectorAll('svg#canvas .bond-line')];
    const hit = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
    let slanted = 0;
    let strokeOnLabel = 0;
    for (const line of lines) {
      const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map((k) => Number(line.getAttribute(k)));
      if (Math.abs(x1 - x2) > 1e-6 && Math.abs(y1 - y2) > 1e-6) {
        slanted += 1;
      }
      if (boxes.some((b) => hit(line.getBoundingClientRect(), b))) {
        strokeOnLabel += 1;
      }
    }
    let labelOverlap = 0;
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        if (hit(boxes[i], boxes[j])) {
          labelOverlap += 1;
        }
      }
    }
    return { slanted, strokeOnLabel, labelOverlap };
  });
} // End of function geometryReport()

/**
 * Clicks the projected position of an atom.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {number} id - The atom id.
 * @returns {Promise<void>}
 */
async function clickAtom(page, id) {
  const p = await page.evaluate((a) => window.__editor.atomClientPoint(a), id);
  await page.mouse.click(p.x, p.y);
}

/**
 * One case per family: SMILES, name, the parent chain in locant order (atom
 * ids), the atom that continues the chain line beyond locant 1 (null: none)
 * and the labels expected on some atoms.
 */
const CASES = [
  { smiles: 'CC(Cl)CO', name: '2-cloropropan-1-ol', chain: [4, 2, 1], lead: 5, texts: { 5: 'HO', 3: 'Cl' } },
  { smiles: 'CC(C)C(=O)O', name: 'ácido 2-metilpropanoico', chain: [4, 2, 1], lead: 6, texts: { 5: 'O', 6: 'HO' } },
  { smiles: 'CC(=O)OC', name: 'etanoato de metilo', chain: [2, 1], lead: 4, texts: { 3: 'O', 4: 'O', 5: 'CH₃' } },
  { smiles: 'CNC(C)=O', name: 'N-metiletanamida', chain: [3, 4], lead: 2, texts: { 2: 'NH', 5: 'O' } },
  { smiles: 'CCCN', name: 'propan-1-amina', chain: [3, 2, 1], lead: 4, texts: { 4: 'H₂N' } },
  { smiles: 'CCCC#N', name: 'butanonitrilo', chain: [4, 3, 2, 1], lead: 5, texts: { 5: 'N' } },
];

test('named acyclic molecules with heteroatoms are drawn at 90°, chain ends continuing the line', async ({ page }) => {
  const errors = await openRightAngles(page);
  const canvas = page.locator('svg#canvas');
  for (const c of CASES) {
    await loadSmiles(page, c.smiles);
    await expect(canvas).toHaveClass(/is-right-angle/);
    await expect(page.locator('#right-angle-note')).toHaveText(HINT);
    await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
    await expect(page.locator('#result-name')).toHaveText(c.name);
    const shown = await labels(page);
    // The parent chain on one horizontal line, locant 1 on the left.
    expect(new Set(c.chain.map((id) => shown[id].y)).size, c.smiles).toBe(1);
    c.chain.slice(1).forEach((id, i) => expect(shown[id].x, c.smiles).toBeGreaterThan(shown[c.chain[i]].x));
    // The lead atom continues that line before locant 1.
    expect(shown[c.lead].y, c.smiles).toBe(shown[c.chain[0]].y);
    expect(shown[c.lead].x, c.smiles).toBeLessThan(shown[c.chain[0]].x);
    for (const [id, text] of Object.entries(c.texts)) {
      expect(shown[id].text, `${c.smiles} atom ${id}`).toBe(text);
    }
    expect(await geometryReport(page), c.smiles).toEqual({ slanted: 0, strokeOnLabel: 0, labelOverlap: 0 });
  } // End of the loop over the families
  // C=O is a double stroke to an O label (the ester's carbonyl hangs vertically).
  await loadSmiles(page, 'CC(=O)OC');
  const double = page.locator('svg#canvas .bond[data-order="2"] .bond-line');
  await expect(double).toHaveCount(2);
  expect(await double.evaluateAll((ls) => ls.map((l) => Number(l.getAttribute('x1')) - Number(l.getAttribute('x2'))))).toEqual([0, 0]);
  // The model's coordinates never change; turning the view off restores the drawing.
  const model = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#right-angle-button').click();
  await expect(canvas).not.toHaveClass(/is-right-angle/);
  const normal = await labels(page);
  for (const atom of model.atoms) {
    expect([normal[atom.id].x, normal[atom.id].y]).toEqual([atom.x, atom.y]);
  }
  expect(errors).toEqual([]);
}); // End of test 'named acyclic molecules with heteroatoms are drawn at 90°…'

test('editing in the 90° view places, re-bonds and erases a heteroatom', async ({ page }) => {
  const errors = await openRightAngles(page);
  const canvas = page.locator('svg#canvas');
  const tools = page.getByRole('navigation', { name: 'Herramientas de dibujo' });
  await loadSmiles(page, 'CCCC');
  await expect(canvas).toHaveClass(/is-right-angle/);
  const json = () => page.evaluate(() => window.__editor.getMoleculeJSON());
  const start = await json();

  // Oxígeno dragged out of the projected C2 grows a new O on it (a click would change C2 itself).
  await tools.getByRole('button', { name: 'Oxígeno' }).click();
  const from = await page.evaluate(() => window.__editor.atomClientPoint(2));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y + 80, { steps: 8 });
  await page.mouse.up();
  let now = await json();
  expect(now.atoms.map((a) => a.element)).toEqual(['C', 'C', 'C', 'C', 'O']);
  expect(now.atoms.filter((a) => a.id <= 4)).toEqual(start.atoms); // Model carbons never move.
  await expect(canvas).toHaveClass(/is-right-angle/);
  await expect(page.locator('svg#canvas .added-ring')).toHaveCount(1);
  await expect(page.locator('svg#canvas .atom-label[data-atom-id="5"]')).toHaveText('OH');

  // Enlace doble on the projected C–O bond: butan-2-ona, still at 90°.
  await tools.getByRole('button', { name: 'Enlace doble' }).click();
  const bondId = now.bonds.find((b) => b.a === 5 || b.b === 5).id;
  const mid = await page.evaluate((id) => window.__editor.bondClientPoint(id), bondId);
  await page.mouse.click(mid.x, mid.y);
  now = await json();
  expect(now.bonds.find((b) => b.id === bondId).order).toBe(2);
  await expect(page.locator('svg#canvas .atom-label[data-atom-id="5"]')).toHaveText('O');
  await expect(canvas).toHaveClass(/is-right-angle/);

  // Cloro on the projected CH₃ at the far end changes that carbon: 1-clorobutan-2-ona.
  await tools.getByRole('button', { name: 'Cloro' }).click();
  await clickAtom(page, 4);
  now = await json();
  expect(now.atoms.find((a) => a.id === 4).element).toBe('Cl');
  await expect(canvas).toHaveClass(/is-right-angle/);
  expect(await geometryReport(page)).toEqual({ slanted: 0, strokeOnLabel: 0, labelOverlap: 0 });

  // Borrar on the projected O label removes it; four undo steps back to butane.
  await tools.getByRole('button', { name: 'Borrar' }).click();
  await clickAtom(page, 5);
  expect((await json()).atoms.some((a) => a.id === 5)).toBe(false);
  await expect(canvas).toHaveClass(/is-right-angle/);
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('Control+z');
  }
  expect(await json()).toEqual(start);
  expect(errors).toEqual([]);
}); // End of test 'editing in the 90° view places, re-bonds and erases a heteroatom'

test('stepper highlights land on the projected heteroatoms; a ring still falls back', async ({ page }) => {
  const errors = await openRightAngles(page);
  await loadSmiles(page, 'CC(C)C(=O)O');
  await expect(page.locator('svg#canvas')).toHaveClass(/is-right-angle/);
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const dots = page.locator('#stepper .step-dot');
  let checked = 0;
  for (let i = 0; i < await dots.count(); i += 1) {
    await dots.nth(i).click();
    const report = await page.evaluate(() => {
      const shown = window.__editor.getShownMolecule();
      return [...document.querySelectorAll('svg#canvas .hl-atom')].map((node) => {
        const atom = shown.atoms.get(Number(node.dataset.atomId));
        return { element: atom.element, dx: Number(node.getAttribute('cx')) - atom.x, dy: Number(node.getAttribute('cy')) - atom.y };
      });
    });
    for (const r of report) {
      expect([r.dx, r.dy]).toEqual([0, 0]);
      checked += r.element === 'O' ? 1 : 0;
    }
  } // End of the loop over the steps
  expect(checked).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();

  // A named ring (ciclohexanol) keeps the normal drawing with the ring note.
  await loadSmiles(page, 'OC1CCCCC1');
  await expect(page.locator('#right-angle-note')).toHaveText('Hay un anillo: se ve el dibujo normal.');
  await expect(page.locator('svg#canvas')).not.toHaveClass(/is-right-angle/);
  expect(errors).toEqual([]);
}); // End of test 'stepper highlights land on the projected heteroatoms…'
