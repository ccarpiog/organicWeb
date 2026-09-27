/**
 * @file 90° view e2e (design.md §6.3): the "Ángulos rectos (90°)" toggle is
 * shown only in Con carbonos and remembered across reloads; the projected
 * drawing has horizontal/vertical bonds with strokes clear of the real
 * rendered labels; the drawing is read-only (tools disabled, clicks do not
 * draw, a drag pans) while undo and examples still update it; the stepper
 * highlights and locants follow the projected positions; fallbacks show a
 * note and stay editable (a chain drawn on an empty canvas switches to the
 * 90° view); and turning the view off restores the drawing exactly.
 */

import { test, expect } from '@playwright/test';

/** Two separate ethanes: no 90° projection possible (DISCONNECTED). */
const TWO_PIECES = {
  version: 1,
  nextAtomId: 5,
  nextBondId: 3,
  atoms: [
    { id: 1, element: 'C', x: 200, y: 200 },
    { id: 2, element: 'C', x: 240, y: 200 },
    { id: 3, element: 'C', x: 400, y: 260 },
    { id: 4, element: 'C', x: 440, y: 260 },
  ],
  bonds: [{ id: 1, a: 1, b: 2, order: 1 }, { id: 2, a: 3, b: 4, order: 1 }],
};

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
 * Loads an example from the Ejemplos menu.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} label - The menu label.
 * @returns {Promise<void>}
 */
async function loadExample(page, label) {
  await page.getByRole('button', { name: 'Ejemplos' }).click();
  await page.getByRole('menuitem', { name: label, exact: true }).click();
}

/**
 * Positions of the rendered atom labels, by atom id (SVG attributes, drawing units).
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<Record<string, {x: number, y: number, text: string}>>} The labels.
 */
async function labelPositions(page) {
  return page.evaluate(() => Object.fromEntries([...document.querySelectorAll('svg#canvas .atom-label')]
    .map((t) => [t.dataset.atomId, { x: Number(t.getAttribute('x')), y: Number(t.getAttribute('y')), text: t.textContent }])));
}

/**
 * Geometry report of the drawing as rendered by the browser (real font):
 * bond strokes that are neither horizontal nor vertical, strokes touching a
 * label box, and overlapping label boxes (client rectangles).
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<{slanted: number, strokeOnLabel: number, labelOverlap: number, strokes: number}>} Counts.
 */
async function geometryReport(page) {
  return page.evaluate(() => {
    const labels = [...document.querySelectorAll('svg#canvas .atom-label')].map((t) => t.getBoundingClientRect());
    const lines = [...document.querySelectorAll('svg#canvas .bond-line')];
    const hit = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
    let slanted = 0;
    let strokeOnLabel = 0;
    for (const line of lines) {
      const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map((k) => Number(line.getAttribute(k)));
      if (Math.abs(x1 - x2) > 1e-6 && Math.abs(y1 - y2) > 1e-6) {
        slanted += 1;
      }
      const box = line.getBoundingClientRect();
      if (labels.some((l) => hit(box, l))) {
        strokeOnLabel += 1;
      }
    }
    let labelOverlap = 0;
    for (let i = 0; i < labels.length; i += 1) {
      for (let j = i + 1; j < labels.length; j += 1) {
        if (hit(labels[i], labels[j])) {
          labelOverlap += 1;
        }
      }
    }
    return { slanted, strokeOnLabel, labelOverlap, strokes: lines.length };
  });
} // End of function geometryReport()

test('the toggle shows only in Con carbonos and is remembered across reloads', async ({ page }) => {
  const errors = await openApp(page);
  const toggle = page.locator('#right-angle-button');
  await expect(toggle).toBeHidden();
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveText('Ángulos rectos (90°)');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('organicWeb.rightAngles'))).toBe('on');

  // Esqueleto hides the toggle and keeps the zigzag, but not the preference.
  await page.getByRole('button', { name: 'Esqueleto' }).click();
  await expect(toggle).toBeHidden();
  expect(await page.evaluate(() => window.__editor.isReadOnly())).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('organicWeb.rightAngles'))).toBe('on');
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.__editor.isReadOnly())).toBe(false); // Empty canvas: editable.
  await loadExample(page, 'Alcano ramificado');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.__editor.isReadOnly())).toBe(true);
  await toggle.click();
  await page.reload();
  await expect(page.locator('#right-angle-button')).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
}); // End of test 'the toggle shows only in Con carbonos…'

test('the reference molecule is drawn at 90° and toggling off restores the drawing exactly', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await loadExample(page, 'Alcano con muchas ramas');
  const model = await page.evaluate(() => window.__editor.getMoleculeJSON());
  const before = await labelPositions(page);

  await page.locator('#right-angle-button').click();
  await expect(page.locator('svg#canvas')).toHaveClass(/is-right-angle/);
  const shown = await labelPositions(page);
  // Parent chain 1-2-5-6-7 (SMILES CC(C)(C)CC(C)C): one horizontal line, locant 1 on the left.
  const chain = ['1', '2', '5', '6', '7'];
  expect(chain.map((id) => shown[id].text)).toEqual(['CH₃', 'C', 'CH₂', 'CH', 'CH₃']);
  expect(new Set(chain.map((id) => shown[id].y)).size).toBe(1);
  chain.slice(1).forEach((id, i) => expect(shown[id].x).toBeGreaterThan(shown[chain[i]].x));
  // C2's methyls straight above and below it; C4's methyl straight below it.
  expect([shown['3'].x, shown['4'].x]).toEqual([shown['2'].x, shown['2'].x]);
  expect([shown['3'].y, shown['4'].y].map((y) => Math.sign(y - shown['2'].y)).sort()).toEqual([-1, 1]);
  expect(shown['8'].x).toBe(shown['6'].x);
  expect(shown['8'].y).toBeGreaterThan(shown['6'].y);
  const report = await geometryReport(page);
  expect(report).toEqual({ slanted: 0, strokeOnLabel: 0, labelOverlap: 0, strokes: 7 });

  // The model's coordinates never changed; turning the view off shows them again.
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON())).toEqual(model);
  await page.locator('#right-angle-button').click();
  await expect(page.locator('svg#canvas')).not.toHaveClass(/is-right-angle/);
  expect(await labelPositions(page)).toEqual(before);
  expect(await page.evaluate(() => window.__editor.canUndo())).toBe(true);
  expect(errors).toEqual([]);
}); // End of test 'the reference molecule is drawn at 90°…'

test('multiple bonds keep = and ≡ strokes clear of the labels', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await page.locator('#right-angle-button').click();
  for (const [label, strokes] of [['Enlace doble y triple a la vez', 7], ['Rama unida con un enlace doble', 7]]) {
    await loadExample(page, label);
    await expect(page.locator('svg#canvas')).toHaveClass(/is-right-angle/);
    expect(await geometryReport(page)).toEqual({ slanted: 0, strokeOnLabel: 0, labelOverlap: 0, strokes });
  }
  // The =CH₂ of 3-metilidenhexano hangs vertically: two vertical strokes.
  const double = page.locator('svg#canvas .bond[data-order="2"] .bond-line');
  await expect(double).toHaveCount(2);
  const xs = await double.evaluateAll((lines) => lines.map((l) => Number(l.getAttribute('x1')) - Number(l.getAttribute('x2'))));
  expect(xs).toEqual([0, 0]);
  expect(errors).toEqual([]);
});

test('the 90° view is read-only: tools disabled, clicks do not draw, a drag pans, undo still works', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await loadExample(page, 'Alcano ramificado');
  await loadExample(page, 'Alcano con muchas ramas');
  await page.locator('#right-angle-button').click();
  const note = page.locator('#right-angle-note');
  await expect(note).toHaveText('Desactiva los ángulos rectos para editar.');
  await expect(page.locator('#toolbar [data-tool="single"]')).toBeDisabled();
  await expect(page.locator('#toolbar [data-tool="move"]')).toBeDisabled();
  await expect(page.locator('#toolbar [data-action="arrange"]')).toBeDisabled();
  await expect(page.locator('#toolbar [data-action="undo"]')).toBeEnabled();
  await expect(page.locator('#redraw-hint')).toHaveCount(0);

  const model = await page.evaluate(() => window.__editor.getMoleculeJSON());
  const box = await page.locator('svg#canvas').boundingBox();
  // A click on empty space and on an atom (Enlace simple is the tool) changes nothing.
  await page.mouse.click(box.x + 30, box.y + 30);
  const atom = await page.evaluate(() => window.__editor.atomClientPoint(5));
  await page.mouse.click(atom.x, atom.y);
  // The I-14 chain drag is not available either: a long drag from an atom pans.
  const view = await page.evaluate(() => window.__editor.getView());
  await page.mouse.move(atom.x, atom.y);
  await page.mouse.down();
  await page.mouse.move(atom.x + 160, atom.y + 20, { steps: 8 });
  await expect(page.locator('svg#canvas .chain-counter')).toHaveCount(0);
  await page.mouse.up();
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON())).toEqual(model);
  const panned = await page.evaluate(() => window.__editor.getView());
  expect(panned.x).toBeGreaterThan(view.x);
  expect(panned.scale).toBe(view.scale);
  // Tool shortcuts are ignored.
  await page.keyboard.press('2');
  expect(await page.evaluate(() => window.__editor.getTool())).toBe('single');

  // Undo still works and the projection follows the molecule (2,3-dimetilpentano: 7 C).
  await page.keyboard.press('Control+z');
  await expect(page.locator('svg#canvas .atom-label')).toHaveCount(7);
  expect((await geometryReport(page)).slanted).toBe(0);
  await expect(page.locator('svg#canvas')).toHaveClass(/is-right-angle/);
  expect(errors).toEqual([]);
}); // End of test 'the 90° view is read-only…'

test('stepper highlights and locants follow the projected drawing', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await loadExample(page, 'Alcano con muchas ramas');
  await page.locator('#right-angle-button').click();
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('2,2,4-trimetilpentano');
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  const next = stepper.getByRole('button', { name: 'Siguiente' });
  const labels = await labelPositions(page);
  let checkedAtoms = 0;
  let checkedLocants = 0;
  const total = Number((await stepper.locator('.step-count').textContent()).match(/de (\d+)/)[1]);
  for (let step = 1; step <= total; step += 1) {
    const marks = await page.evaluate(() => ({
      atoms: [...document.querySelectorAll('svg#canvas .hl-atom')].map((c) => ({
        id: c.dataset.atomId, x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy')),
      })),
      bonds: [...document.querySelectorAll('svg#canvas .hl-bond')].map((l) => ['x1', 'y1', 'x2', 'y2'].map((k) => Number(l.getAttribute(k)))),
      locants: [...document.querySelectorAll('svg#canvas .locant')].map((t) => ({
        id: t.dataset.atomId, x: Number(t.getAttribute('x')), y: Number(t.getAttribute('y')),
      })),
    }));
    for (const mark of marks.atoms) {
      expect([mark.x, mark.y]).toEqual([labels[mark.id].x, labels[mark.id].y]);
      checkedAtoms += 1;
    }
    for (const [x1, y1, x2, y2] of marks.bonds) {
      expect(x1 === x2 || y1 === y2).toBe(true);
    }
    for (const locant of marks.locants) {
      const at = labels[locant.id];
      expect(Math.hypot(locant.x - at.x, locant.y - at.y)).toBeLessThan(30);
      checkedLocants += 1;
    }
    if (step < total) {
      await next.click();
      await expect(stepper.locator('.step-count')).toHaveText(`Paso ${step + 1} de ${total}`);
    }
  } // End of the walk through the steps
  expect(checkedAtoms).toBeGreaterThan(0);
  expect(checkedLocants).toBeGreaterThan(0);
  expect(errors).toEqual([]);
}); // End of test 'stepper highlights and locants follow the projected drawing'

test('fallbacks draw the normal, editable layout with a note', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await page.locator('#right-angle-button').click();
  const note = page.locator('#right-angle-note');
  await expect(note).toHaveText('Los ángulos rectos aparecerán cuando dibujes una molécula.');
  await expect(page.locator('#toolbar [data-tool="single"]')).toBeEnabled();

  await page.evaluate((json) => window.__editor.loadMolecule(json), TWO_PIECES);
  await expect(note).toHaveText('Hay piezas sueltas: se ve el dibujo normal.');
  await expect(page.locator('svg#canvas')).not.toHaveClass(/is-right-angle/);
  const shown = await labelPositions(page);
  for (const atom of TWO_PIECES.atoms) {
    expect([shown[atom.id].x, shown[atom.id].y]).toEqual([atom.x, atom.y]);
  }
  // Editable in the fallback: tools, Ordenar dibujo, shortcuts.
  expect(await page.evaluate(() => window.__editor.isReadOnly())).toBe(false);
  await expect(page.locator('#toolbar [data-tool="single"]')).toBeEnabled();
  await expect(page.locator('#toolbar [data-action="arrange"]')).toBeEnabled();
  await page.keyboard.press('2');
  expect(await page.evaluate(() => window.__editor.getTool())).toBe('double');

  // Joining the pieces makes the molecule projectable: the 90° view and read-only switch on.
  await page.keyboard.press('1');
  const a = await page.evaluate(() => window.__editor.atomClientPoint(2));
  const b = await page.evaluate(() => window.__editor.atomClientPoint(3));
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('svg#canvas')).toHaveClass(/is-right-angle/);
  await expect(note).toHaveText('Desactiva los ángulos rectos para editar.');
  await expect(page.locator('#toolbar [data-tool="single"]')).toBeDisabled();
  expect(errors).toEqual([]);
}); // End of test 'fallbacks draw the normal, editable layout with a note'

test('with the toggle saved on, an empty canvas still lets the student draw a chain, then shows 90°', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await page.locator('#right-angle-button').click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  await expect(page.locator('#right-angle-button')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.length)).toBe(0);
  await expect(page.locator('#toolbar [data-tool="single"]')).toBeEnabled();

  // The I-14 Enlace simple chain drag works on the empty canvas.
  const box = await page.locator('svg#canvas').boundingBox();
  const start = { x: box.x + box.width * 0.3, y: box.y + box.height * 0.5 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 150, start.y, { steps: 10 });
  await expect(page.locator('svg#canvas .chain-counter')).toBeVisible();
  await page.mouse.up();
  const count = await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.length);
  expect(count).toBeGreaterThan(2);

  // The chain is projectable: 90° view, read-only, all labels on one line.
  await expect(page.locator('svg#canvas')).toHaveClass(/is-right-angle/);
  await expect(page.locator('#toolbar [data-tool="single"]')).toBeDisabled();
  await expect(page.locator('#right-angle-note')).toHaveText('Desactiva los ángulos rectos para editar.');
  const labels = Object.values(await labelPositions(page));
  expect(labels).toHaveLength(count);
  expect(new Set(labels.map((l) => l.y)).size).toBe(1);
  expect(await geometryReport(page)).toMatchObject({ slanted: 0, strokeOnLabel: 0, labelOverlap: 0 });
  expect(errors).toEqual([]);
}); // End of test 'with the toggle saved on, an empty canvas still lets the student draw…'
