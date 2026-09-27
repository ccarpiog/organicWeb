/**
 * @file Editor extras e2e (design.md §6.1, §6.3): Cadena tool with its live
 * counter, Mover with marquee selection (a coordinate-only edit), autosave
 * and restore on reload (including corrupt storage), the live formula, the
 * display toggle, pan/zoom and the keyboard shortcuts.
 */

import { test, expect } from '@playwright/test';

/** Advance along the drag axis per zigzag bond (src/editor/geometry.js CHAIN_STEP). */
const CHAIN_STEP = 40 * Math.cos(Math.PI / 6);

/** A propane drawn at known drawing coordinates (moleculeToJSON() format). */
const PROPANE = {
  version: 1,
  nextAtomId: 4,
  nextBondId: 3,
  atoms: [
    { id: 1, element: 'C', x: 300, y: 250 },
    { id: 2, element: 'C', x: 334.64, y: 230 },
    { id: 3, element: 'C', x: 369.28, y: 250 },
  ],
  bonds: [{ id: 1, a: 1, b: 2, order: 1 }, { id: 2, a: 2, b: 3, order: 1 }],
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
  await page.goto('/index.html');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  return errors;
}

/**
 * Client point of a drawing point.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {{x: number, y: number}} point - Drawing coordinates.
 * @returns {Promise<{x: number, y: number}>} Client coordinates.
 */
async function toClient(page, point) {
  return page.evaluate((p) => window.__editor.modelToClient(p), point);
}

/**
 * Drags the mouse between two client points in several steps.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {{x: number, y: number}} from - Start (client).
 * @param {{x: number, y: number}} to - End (client).
 * @returns {Promise<void>}
 */
async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

/**
 * Atom count and bond list of the drawing.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<{atoms: number, bonds: string[]}>} The summary.
 */
async function shape(page) {
  return page.evaluate(() => {
    const json = window.__editor.getMoleculeJSON();
    return { atoms: json.atoms.length, bonds: json.bonds.map((b) => `${b.a}-${b.b}:${b.order}`) };
  });
}

test('Cadena: a drag shows a live "N C" counter and draws that many carbons', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Cadena' }).click();
  const start = { x: 250, y: 250 };
  const from = await toClient(page, start);
  const to = await toClient(page, { x: start.x + 4 * CHAIN_STEP, y: start.y });
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await expect(page.locator('svg#canvas .chain-counter')).toHaveText('5 C');
  await page.mouse.up();
  await expect(page.locator('svg#canvas .chain-counter')).toHaveCount(0);
  expect(await shape(page)).toEqual({ atoms: 5, bonds: ['1-2:1', '2-3:1', '3-4:1', '4-5:1'] });
  await expect(page.locator('#formula')).toHaveText('Fórmula: C₅H₁₂');

  // A chain grown from an existing atom counts only the carbons it adds.
  const atom5 = await page.evaluate(() => window.__editor.getMoleculeJSON().atoms[4]);
  const from5 = await toClient(page, atom5);
  const to5 = await toClient(page, { x: atom5.x, y: atom5.y + 2 * CHAIN_STEP });
  await page.mouse.move(from5.x, from5.y);
  await page.mouse.down();
  await page.mouse.move(to5.x, to5.y, { steps: 8 });
  await expect(page.locator('svg#canvas .chain-counter')).toHaveText('2 C');
  await page.mouse.up();
  expect((await shape(page)).atoms).toBe(7);
  await expect(page.locator('#formula')).toHaveText('Fórmula: C₇H₁₆');
});

test('Mover: marquee + drag moves the selection as a coordinate-only edit', async ({ page }) => {
  await openApp(page);
  await page.evaluate((json) => window.__editor.loadMolecule(json), PROPANE);
  await page.evaluate(() => {
    window.__edits = [];
    window.__editor.onEdit((e) => window.__edits.push(e.kind));
  });
  await page.keyboard.press('m');
  await expect(page.getByRole('button', { name: 'Mover' })).toHaveAttribute('aria-pressed', 'true');

  // Marquee around the three atoms: selects, edits nothing.
  await drag(page, await toClient(page, { x: 270, y: 200 }), await toClient(page, { x: 400, y: 280 }));
  expect(await page.evaluate(() => window.__editor.getSelection())).toEqual([1, 2, 3]);
  await expect(page.locator('svg#canvas .sel-atom')).toHaveCount(3);
  expect(await page.evaluate(() => window.__edits)).toEqual([]);

  // Drag the selection by one of its atoms.
  await drag(page, await toClient(page, { x: 300, y: 250 }), await toClient(page, { x: 360, y: 290 }));
  const moved = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(moved.bonds).toEqual(PROPANE.bonds);
  for (const [i, atom] of moved.atoms.entries()) {
    expect(atom.x).toBeCloseTo(PROPANE.atoms[i].x + 60, 0);
    expect(atom.y).toBeCloseTo(PROPANE.atoms[i].y + 40, 0);
  }
  expect(await page.evaluate(() => window.__edits)).toEqual(['coordinates']);

  // Undo of a move is a coordinate edit too; a new bond is a chemical one.
  await page.keyboard.press('Control+z');
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms)).toEqual(PROPANE.atoms);
  await page.keyboard.press('1');
  const p1 = await toClient(page, PROPANE.atoms[0]);
  await page.mouse.click(p1.x, p1.y);
  expect(await page.evaluate(() => window.__edits)).toEqual(['coordinates', 'coordinates', 'chemical']);
});

test('the drawing is restored after a reload, with the formula and display mode', async ({ page }) => {
  const errors = await openApp(page);
  await expect(page.locator('#formula')).toHaveText('Fórmula: —');
  await page.evaluate((json) => window.__editor.loadMolecule(json), PROPANE);
  await expect(page.locator('#formula')).toHaveText('Fórmula: C₃H₈');
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await expect(page.locator('svg#canvas .atom-label')).toHaveText(['CH₃', 'CH₂', 'CH₃']);
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON())).toEqual(before);
  await expect(page.locator('#formula')).toHaveText('Fórmula: C₃H₈');
  await expect(page.getByRole('button', { name: 'Con carbonos' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('svg#canvas .atom-label')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeDisabled();

  await page.getByRole('button', { name: 'Esqueleto' }).click();
  await expect(page.locator('svg#canvas .atom-label')).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const [label, saved] of [
  ['invalid JSON', '{"version":1,"atoms":[{'],
  ['a bond to a missing atom', JSON.stringify({ version: 1, atoms: [{ id: 1, element: 'C', x: 0, y: 0 }], bonds: [{ id: 1, a: 1, b: 9, order: 1 }] })],
  ['a pentavalent carbon', JSON.stringify({
    version: 1,
    atoms: [1, 2, 3, 4].map((id) => ({ id, element: 'C', x: id * 40, y: 0 })),
    bonds: [{ id: 1, a: 1, b: 2, order: 3 }, { id: 2, a: 1, b: 3, order: 2 }, { id: 3, a: 1, b: 4, order: 1 }],
  })],
]) {
  test(`corrupt autosave (${label}) gives an empty canvas without errors`, async ({ page }) => {
    await page.addInitScript((text) => {
      if (!sessionStorage.getItem('seeded')) {
        sessionStorage.setItem('seeded', '1');
        localStorage.setItem('organicWeb.molecule', text);
      }
    }, saved);
    const errors = await openApp(page);
    expect(await shape(page)).toEqual({ atoms: 0, bonds: [] });
    await expect(page.locator('svg#canvas .atom')).toHaveCount(0);
    await expect(page.locator('#formula')).toHaveText('Fórmula: —');
    expect(await page.evaluate(() => localStorage.getItem('organicWeb.molecule'))).toBeNull();
    // The editor still works.
    const p = await toClient(page, { x: 300, y: 250 });
    await page.mouse.click(p.x, p.y);
    expect((await shape(page)).atoms).toBe(2);
    expect(errors).toEqual([]);
  });
}

test('keyboard shortcuts switch tools and undo/redo', async ({ page }) => {
  await openApp(page);
  const tools = page.getByRole('navigation', { name: 'Herramientas de dibujo' });
  const expectTool = (name) => expect(tools.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const [key, name] of [
    ['c', 'Carbono'], ['2', 'Enlace doble'], ['3', 'Enlace triple'], ['1', 'Enlace simple'], ['t', 'Cambiar enlace'],
    ['h', 'Cadena'], ['e', 'Borrar'], ['m', 'Mover'], ['Delete', 'Borrar'], ['C', 'Carbono'],
  ]) {
    await page.keyboard.press(key);
    await expectTool(name);
  }
  await page.keyboard.press('1');
  const p = await toClient(page, { x: 300, y: 250 });
  await page.mouse.click(p.x, p.y);
  expect((await shape(page)).atoms).toBe(2);
  await page.keyboard.press('Control+z');
  expect((await shape(page)).atoms).toBe(0);
  await page.keyboard.press('Control+Shift+z');
  expect((await shape(page)).atoms).toBe(2);
  await page.keyboard.press('Meta+z');
  expect((await shape(page)).atoms).toBe(0);
});

test('wheel zooms, space+drag pans, Centrar fits; none of them edits', async ({ page }) => {
  await openApp(page);
  await page.evaluate((json) => window.__editor.loadMolecule(json), PROPANE);
  await page.evaluate(() => {
    window.__edits = [];
    window.__editor.onEdit((e) => window.__edits.push(e.kind));
  });
  const atom = await toClient(page, PROPANE.atoms[1]);
  await page.mouse.move(atom.x, atom.y);
  await page.mouse.wheel(0, -300);
  const zoomed = await page.evaluate(() => window.__editor.getView());
  expect(zoomed.scale).toBeGreaterThan(1);
  // The point under the cursor stays put.
  const after = await toClient(page, PROPANE.atoms[1]);
  expect(after.x).toBeCloseTo(atom.x, 0);
  expect(after.y).toBeCloseTo(atom.y, 0);

  const box = await page.locator('svg#canvas').boundingBox();
  await page.keyboard.down('Space');
  await drag(page, { x: box.x + 50, y: box.y + 50 }, { x: box.x + 150, y: box.y + 100 });
  await page.keyboard.up('Space');
  const panned = await page.evaluate(() => window.__editor.getView());
  expect(panned.x).not.toBeCloseTo(zoomed.x, 0);
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms)).toEqual(PROPANE.atoms);

  await page.getByRole('button', { name: 'Centrar' }).click();
  const centre = await toClient(page, { x: (300 + 369.28) / 2, y: 240 });
  expect(centre.x).toBeCloseTo(box.x + box.width / 2, -1);
  expect(centre.y).toBeCloseTo(box.y + box.height / 2, -1);
  expect(await page.evaluate(() => window.__edits)).toEqual([]);
});

test('a drawing made far from the origin is visible after a reload', async ({ page }) => {
  const errors = await openApp(page);
  // Pan far away (the view only), then draw a bond in the middle of the canvas.
  await page.evaluate(() => window.__editor.setView({ scale: 1, x: -2000, y: -1500 }));
  const box = await page.locator('svg#canvas').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  expect((await shape(page)).atoms).toBe(2);
  const saved = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(saved.atoms[0].x).toBeGreaterThan(1500);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON())).toEqual(saved);
  const after = await page.locator('svg#canvas').boundingBox();
  for (const atom of saved.atoms) {
    const p = await toClient(page, atom);
    expect(p.x).toBeGreaterThan(after.x);
    expect(p.x).toBeLessThan(after.x + after.width);
    expect(p.y).toBeGreaterThan(after.y);
    expect(p.y).toBeLessThan(after.y + after.height);
  } // End of the loop that checks every restored atom is on screen
  await expect(page.locator('svg#canvas .atom')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('a pinch whose second finger starts on an atom leaves the editor usable', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate((json) => window.__editor.loadMolecule(json), PROPANE);
  const box = await page.locator('svg#canvas').boundingBox();
  const atom = await toClient(page, PROPANE.atoms[1]);
  const first = { x: box.x + 40, y: box.y + box.height - 40, id: 1 };
  const second = { x: atom.x, y: atom.y, id: 2 };
  // Real touch input (Chromium DevTools protocol), so pointer capture applies.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await touch('touchStart', [first]);
  await touch('touchStart', [first, second]);
  // The second finger leaves the canvas (above it) before it is lifted.
  const outside = { ...second, x: atom.x, y: Math.max(box.y - 30, 2) };
  for (let step = 1; step <= 6; step++) {
    const y = second.y + ((outside.y - second.y) * step) / 6;
    await touch('touchMove', [first, { ...second, y }]);
  } // End of the loop that drags the second finger off the canvas
  await touch('touchEnd', [first]);
  await touch('touchEnd', []);
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.length)).toBe(3);
  expect(await page.evaluate(() => window.__editor.isGestureActive())).toBe(false);

  // Editing still works, with the mouse and with a single-finger tap.
  const empty = { x: box.x + 60, y: box.y + 60 };
  await page.mouse.click(empty.x, empty.y);
  expect((await shape(page)).atoms).toBe(5);
  const tap = { x: box.x + box.width - 60, y: box.y + 60, id: 3 };
  await touch('touchStart', [tap]);
  await touch('touchEnd', []);
  expect((await shape(page)).atoms).toBe(7);
  expect(errors).toEqual([]);
});
