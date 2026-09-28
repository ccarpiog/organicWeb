/**
 * @file CHO/COOH abbreviations e2e (design.md §6.3, §13.4 I-41b): the
 * "Abreviar CHO y COOH" toggle is shown only while the 90° view is on, is
 * off by default and remembered across a reload; when pressed, aldehyde and
 * acid groups are drawn as one `CHO` / `COOH` label (mirrored `OHC` /
 * `HOOC` at locant 1) with a Spanish accessible description, no slanted
 * strokes and no overlaps in the real font; stepper highlights on any atom
 * of the group light the whole label; editing on the label acts on the
 * group's carbon and Borrar removes the whole group (one undo step);
 * toggling never touches the molecule, the undo history or the autosave,
 * and turning it off restores the per-atom drawing exactly.
 */

import { test, expect } from '@playwright/test';
import { parseSmiles } from '../../src/model/smiles.js';
import { moleculeToJSON } from '../../src/model/molecule.js';

/** Spanish accessible descriptions of the two labels (src/editor/labels.js ABBREVIATION_DESCRIPTIONS). */
const DESCRIBED = { CHO: /Grupo aldehído \(–CHO\)/, COOH: /Grupo ácido \(–COOH\)/ };

/**
 * Opens the app, collecting page errors.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<string[]>} The live list of console/page errors.
 */
async function open(page) {
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
 * Rendered atom labels by atom id: their text.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<Record<string, string>>} The labels.
 */
async function labelTexts(page) {
  return page.evaluate(() => Object.fromEntries([...document.querySelectorAll('svg#canvas .atom-label')]
    .map((t) => [t.dataset.atomId, t.textContent])));
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
 * Everything the toggle must never touch: the model, the undo/redo state
 * and the autosaved drawing.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<{model: object, undo: boolean, redo: boolean, saved: string|null}>} The state.
 */
async function modelState(page) {
  return page.evaluate(() => ({
    model: window.__editor.getMoleculeJSON(),
    undo: window.__editor.canUndo(),
    redo: window.__editor.canRedo(),
    saved: window.localStorage.getItem('organicWeb.molecule'),
  }));
}

test('the toggle shows only with the 90° view, is off by default and is remembered', async ({ page }) => {
  const errors = await open(page);
  const toggle = page.getByRole('button', { name: 'Abreviar CHO y COOH' });
  await expect(toggle).toBeHidden();
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await expect(toggle).toBeHidden();
  await page.locator('#right-angle-button').click();
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toHaveAttribute('title', /CHO.*COOH/);
  await loadSmiles(page, 'CCC(=O)O');
  await expect(page.locator('svg#canvas .abbr-label')).toHaveCount(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('svg#canvas .abbr-label')).toHaveCount(1);
  expect(await page.evaluate(() => window.localStorage.getItem('organicWeb.abbreviations'))).toBe('on');

  // Remembered across a reload (the drawing is restored by the autosave).
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('svg#canvas .abbr-label')).toHaveCount(1);

  // Hidden again with the 90° view off or in Esqueleto; the preference survives.
  await page.locator('#right-angle-button').click();
  await expect(toggle).toBeHidden();
  await expect(page.locator('svg#canvas .abbr-label')).toHaveCount(0);
  await page.locator('#right-angle-button').click();
  await expect(page.locator('svg#canvas .abbr-label')).toHaveCount(1);
  await page.getByRole('button', { name: 'Esqueleto' }).click();
  await expect(toggle).toBeHidden();
  await expect(page.locator('svg#canvas .abbr-label')).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test 'the toggle shows only with the 90° view…'

test('CHO and COOH are drawn as one described label; toggling never changes the molecule and off restores the drawing', async ({ page }) => {
  const errors = await open(page);
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await page.locator('#right-angle-button').click();
  const canvas = page.locator('svg#canvas');
  const toggle = page.getByRole('button', { name: 'Abreviar CHO y COOH' });
  const cases = [
    { smiles: 'CCC(C)C=O', name: '2-metilbutanal', texts: { 5: 'OHC' }, gone: [6] },
    { smiles: 'OC(=O)CCC(=O)O', name: 'ácido butanodioico', texts: { 2: 'HOOC', 6: 'COOH' }, gone: [1, 3, 7, 8] },
    { smiles: 'CC(O)CC(=O)O', name: 'ácido 3-hidroxibutanoico', texts: { 5: 'HOOC', 3: 'OH' }, gone: [6, 7] },
  ];
  for (const c of cases) {
    await loadSmiles(page, c.smiles);
    await expect(canvas).toHaveClass(/is-right-angle/);
    const plainLabels = await labelTexts(page);
    const plainBonds = await page.locator('svg#canvas .bond-line').evaluateAll((ls) => ls.map((l) => l.outerHTML));
    const before = await modelState(page);
    await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
    await expect(page.locator('#result-name')).toHaveText(c.name);

    await toggle.click();
    const shown = await labelTexts(page);
    for (const [id, text] of Object.entries(c.texts)) {
      expect(shown[id], `${c.smiles} atom ${id}`).toBe(text);
    }
    for (const id of c.gone) {
      expect(shown[id], `${c.smiles}: atom ${id} is inside a label`).toBeUndefined();
    }
    // Accessible description on each label, and the atoms it stands for.
    const groups = page.locator('svg#canvas .abbr-label');
    for (let i = 0; i < await groups.count(); i += 1) {
      const kind = await groups.nth(i).getAttribute('data-kind');
      await expect(groups.nth(i)).toHaveAttribute('aria-label', DESCRIBED[kind]);
      await expect(groups.nth(i).locator('title')).toHaveText(DESCRIBED[kind]);
      const atoms = (await groups.nth(i).getAttribute('data-group-atoms')).split(' ');
      expect(atoms.length).toBe(kind === 'CHO' ? 2 : 3);
    }
    expect(await geometryReport(page), c.smiles).toEqual({ slanted: 0, strokeOnLabel: 0, labelOverlap: 0 });
    // Display only: model, undo/redo, autosave and the name are untouched.
    expect(await modelState(page)).toEqual(before);
    await expect(page.locator('#result-name')).toHaveText(c.name);

    // Off: the per-atom drawing comes back exactly.
    await toggle.click();
    expect(await labelTexts(page)).toEqual(plainLabels);
    expect(await page.locator('svg#canvas .bond-line').evaluateAll((ls) => ls.map((l) => l.outerHTML))).toEqual(plainBonds);
    expect(await modelState(page)).toEqual(before);
  } // End of the loop over the cases
  // Methanal keeps its per-atom drawing even with the toggle on.
  await toggle.click();
  await loadSmiles(page, 'C=O');
  await expect(canvas).toHaveClass(/is-right-angle/);
  await expect(page.locator('svg#canvas .abbr-label')).toHaveCount(0);
  expect(await labelTexts(page)).toEqual({ 1: 'CH₂', 2: 'O' });
  expect(errors).toEqual([]);
}); // End of test 'CHO and COOH are drawn as one described label…'

test('stepper highlights on any atom of the group light the whole label', async ({ page }) => {
  const errors = await open(page);
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await page.locator('#right-angle-button').click();
  await page.getByRole('button', { name: 'Abreviar CHO y COOH' }).click();
  await loadSmiles(page, 'CC(C)C(=O)O');
  await expect(page.locator('svg#canvas .abbr-label')).toHaveCount(1);
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const dots = page.locator('#stepper .step-dot');
  let boxed = 0;
  for (let i = 0; i < await dots.count(); i += 1) {
    await dots.nth(i).click();
    const report = await page.evaluate(() => ({
      boxes: [...document.querySelectorAll('svg#canvas .hl-abbr')].map((n) => n.dataset.groupAtoms),
      // Circles never sit on a hidden O atom of the group.
      circles: [...document.querySelectorAll('svg#canvas circle.hl-atom')].map((n) => Number(n.dataset.atomId)),
    }));
    expect(report.circles.filter((id) => id === 5 || id === 6)).toEqual([]);
    for (const atoms of report.boxes) {
      expect(atoms.split(' ').map(Number).sort()).toEqual([4, 5, 6]);
    }
    boxed += report.boxes.length;
  } // End of the loop over the steps
  expect(boxed).toBeGreaterThan(0);
  // The switch still hides every mark.
  await page.locator('#stepper').getByRole('button', { name: 'Resaltar en el dibujo' }).click();
  await expect(page.locator('svg#canvas .hl-abbr')).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test 'stepper highlights on any atom of the group…'

test('editing on the label acts on the group carbon; Borrar removes the whole group in one undo step', async ({ page }) => {
  const errors = await open(page);
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await page.locator('#right-angle-button').click();
  await page.getByRole('button', { name: 'Abreviar CHO y COOH' }).click();
  const canvas = page.locator('svg#canvas');
  const tools = page.getByRole('navigation', { name: 'Herramientas de dibujo' });
  await loadSmiles(page, 'CCCC=O');
  await expect(page.locator('svg#canvas .abbr-label')).toHaveCount(1);
  const json = () => page.evaluate(() => window.__editor.getMoleculeJSON());
  const start = await json();
  const label = page.locator('svg#canvas .abbr-label');

  // Hover over the O end of the label: the whole label (its carbon) is hovered.
  const box = await label.locator('text').boundingBox();
  await tools.getByRole('button', { name: 'Borrar' }).click();
  await page.mouse.move(box.x + box.width - 3, box.y + box.height / 2);
  await expect(page.locator('svg#canvas .atom-abbr.is-hover')).toHaveCount(1);

  // Borrar on the label removes C, =O together: butanal → propane, one undo step.
  await page.mouse.click(box.x + box.width - 3, box.y + box.height / 2);
  let now = await json();
  expect(now.atoms.map((a) => a.id)).toEqual([1, 2, 3]);
  await expect(canvas).toHaveClass(/is-right-angle/);
  await expect(page.locator('svg#canvas .abbr-label')).toHaveCount(0);
  await page.keyboard.press('Control+z');
  expect(await json()).toEqual(start);
  await expect(page.locator('svg#canvas .abbr-label')).toHaveCount(1);
  await page.keyboard.press('Control+Shift+z');
  expect((await json()).atoms.map((a) => a.id)).toEqual([1, 2, 3]);
  await page.keyboard.press('Control+z');
  expect(await json()).toEqual(start);

  // Enlace simple on the label grows a carbon from the group's carbon: pentan-2-ona (no longer abbreviated).
  await tools.getByRole('button', { name: 'Enlace simple' }).click();
  const centre = await page.evaluate(() => window.__editor.atomClientPoint(4));
  await page.mouse.click(centre.x + 6, centre.y);
  now = await json();
  expect(now.atoms.length).toBe(6);
  expect(now.bonds.some((b) => (b.a === 4 || b.b === 4) && (b.a === 6 || b.b === 6))).toBe(true);
  await expect(page.locator('svg#canvas .abbr-label')).toHaveCount(0);
  await expect(page.locator('svg#canvas .atom-label[data-atom-id="5"]')).toHaveText('O');
  await page.keyboard.press('Control+z');
  expect(await json()).toEqual(start);

  // An element added so that a group appears flashes the whole new label: butanal → ácido butanoico.
  await tools.getByRole('button', { name: 'Oxígeno' }).click();
  const from = await page.evaluate(() => window.__editor.atomClientPoint(4));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x, from.y + 80, { steps: 8 });
  await page.mouse.up();
  now = await json();
  expect(now.atoms.map((a) => a.element)).toEqual(['C', 'C', 'C', 'C', 'O', 'O']);
  await expect(page.locator('svg#canvas .abbr-label[data-kind="COOH"]')).toHaveCount(1);
  await expect(page.locator('svg#canvas rect.added-ring')).toHaveCount(1);
  expect(await geometryReport(page)).toEqual({ slanted: 0, strokeOnLabel: 0, labelOverlap: 0 });
  // A full COOH carbon refuses a new bond with the valence message; nothing changes.
  await tools.getByRole('button', { name: 'Enlace simple' }).click();
  const acid = await page.evaluate(() => window.__editor.atomClientPoint(4));
  const before = await json();
  await page.mouse.click(acid.x - 10, acid.y);
  expect(await json()).toEqual(before);
  await expect(page.locator('#toast')).toContainText('4 enlaces');
  expect(errors).toEqual([]);
}); // End of test 'editing on the label acts on the group carbon…'
