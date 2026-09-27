/**
 * @file Redraw and Ejemplos e2e (design.md §7, §9): an example loaded from
 * the menu is named, "Ordenar dibujo" redraws it as one undoable coordinate
 * edit (parent highlighted, locants shown, name kept), undo restores the
 * previous coordinates, reduced motion skips the animation, a press during
 * the animation only ends it (never edits an atom the user cannot see
 * there), and the menu works from the keyboard. A hand-drawn molecule whose
 * ordered drawing re-centres the canvas comes back exactly, in the same view,
 * with one Deshacer (also pressed during the animation), and Rehacer
 * re-applies the ordered drawing. Undone in the 90° view, the 90° drawing
 * keeps its own view and the normal drawing gets its view back on leaving it.
 */

import { test, expect } from '@playwright/test';

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
 * Chooses an example from the Ejemplos menu with the mouse.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} label - The menu item text.
 * @returns {Promise<void>}
 */
async function loadExample(page, label) {
  await page.getByRole('button', { name: 'Ejemplos' }).click();
  await page.getByRole('menuitem', { name: label, exact: true }).click();
  await expect(page.locator('#examples-menu')).toBeHidden();
}

/**
 * Atom coordinates of the drawing, by id.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<Array<[number, number, number]>>} [id, x, y] triples.
 */
async function coordinates(page) {
  return page.evaluate(() => window.__editor.getMoleculeJSON().atoms.map((a) => [a.id, a.x, a.y]));
}

/**
 * Drags an atom with the Mover tool by a client offset.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {number} id - Atom id.
 * @param {number} dx - Horizontal offset (client px).
 * @param {number} dy - Vertical offset (client px).
 * @returns {Promise<void>}
 */
async function moveAtom(page, id, dx, dy) {
  await page.evaluate(() => window.__editor.setTool('move'));
  const p = await page.evaluate((atomId) => window.__editor.atomClientPoint(atomId), id);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + dx, p.y + dy, { steps: 8 });
  await page.mouse.up();
}

test('load an example, name it, Ordenar dibujo, undo restores the coordinates and keeps the name', async ({ page }) => {
  const errors = await openApp(page);
  await loadExample(page, 'Rama con un enlace doble');
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.length)).toBe(9);
  // Spoil the ordered drawing so that redrawing has something to do.
  await moveAtom(page, 1, 50, 60);
  const moved = await coordinates(page);

  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('4-etenilheptano');
  await expect(page.locator('#redraw-hint')).toBeVisible();
  await expect(page.locator('#redraw-hint')).toContainText('¿Quieres ver la cadena principal ordenada?');

  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const arranged = await coordinates(page);
  expect(arranged).not.toEqual(moved);
  await expect(page.locator('#result-name')).toHaveText('4-etenilheptano');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  // Parent chain highlighted, locants 1…7 next to its atoms, left to right.
  await expect(page.locator('svg#canvas .hl-parent.hl-atom')).toHaveCount(7);
  const locants = await page.evaluate(() => [...document.querySelectorAll('svg#canvas .locant')]
    .map((n) => [Number(n.textContent), window.__editor.getMoleculeJSON().atoms.find((a) => a.id === Number(n.dataset.atomId)).x])
    .sort((p, q) => p[0] - q[0]));
  expect(locants.map((l) => l[0])).toEqual([1, 2, 3, 4, 5, 6, 7]);
  for (let i = 1; i < locants.length; i += 1) {
    expect(locants[i][1]).toBeGreaterThan(locants[i - 1][1]);
  }

  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect(await coordinates(page)).toEqual(moved);
  await expect(page.locator('#result-name')).toHaveText('4-etenilheptano');
  await expect(page.locator('#redraw-hint')).toBeVisible();

  await page.getByRole('button', { name: 'Rehacer' }).click();
  expect(await coordinates(page)).toEqual(arranged);
  await expect(page.locator('#redraw-hint')).toBeHidden();
  expect(errors).toEqual([]);
}); // End of test 'load an example, name it, Ordenar dibujo, undo…'

test('with reduced motion the hint button redraws at once; a second press changes nothing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = await openApp(page);
  await loadExample(page, 'Con un grupo tert-butilo');
  await moveAtom(page, 2, -40, 70);
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('4-tert-butiloctano');
  const moved = await coordinates(page);
  await page.locator('#redraw-hint').getByRole('button', { name: 'Ordenar dibujo' }).click();
  expect(await page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const arranged = await coordinates(page);
  expect(arranged).not.toEqual(moved);
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect(page.locator('#toast')).toHaveText('El dibujo ya está ordenado.');
  expect(await coordinates(page)).toEqual(arranged);
  // Only one undo step was added: a single undo gets back to the moved drawing.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect(await coordinates(page)).toEqual(moved);
  await expect(page.locator('#result-name')).toHaveText('4-tert-butiloctano');
  expect(errors).toEqual([]);
});

test('Ordenar dibujo names the molecule first when no name is shown', async ({ page }) => {
  const errors = await openApp(page);
  await loadExample(page, 'Con un grupo isopropilo');
  await moveAtom(page, 1, 30, 80);
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect(page.locator('#result-name')).toHaveText('4-isopropilheptano');
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  await expect(page.locator('svg#canvas .hl-parent.hl-atom')).toHaveCount(7);
  expect(errors).toEqual([]);
});

test('the Ejemplos menu works from the keyboard and loading clears a shown name', async ({ page }) => {
  const errors = await openApp(page);
  await loadExample(page, 'Alcano de cadena recta');
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('hexano');

  const button = page.getByRole('button', { name: 'Ejemplos' });
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#examples-menu')).toBeVisible();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#examples-menu')).toBeHidden();
  await expect(button).toBeFocused();

  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'El alcano ramificado más pequeño' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#examples-menu')).toBeHidden();
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.length)).toBe(4);
  await expect(page.locator('#result-name')).toHaveCount(0);
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('2-metilpropano');
  expect(errors).toEqual([]);
}); // End of test 'the Ejemplos menu works from the keyboard…'

test('a click during the redraw animation ends it and edits nothing', async ({ page }) => {
  const errors = await openApp(page);
  await loadExample(page, 'Alcano ramificado');
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('2,3-dimetilpentano');
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  // A long animation (every atom 80 units to the right) so the click lands while it runs.
  await page.evaluate(() => {
    window.__editor.setTool('carbon'); // Any other change would end the animation, so first.
    const positions = new Map(window.__editor.getMoleculeJSON().atoms.map((a) => [a.id, { x: a.x + 80, y: a.y }]));
    window.__editor.animateCoordinates(positions, { duration: 10000 });
  });
  expect(await page.evaluate(() => window.__editor.isAnimating())).toBe(true);
  // Where atom 1 already is in the model, but not yet on screen: a click there must not grow a carbon.
  const p = await page.evaluate(() => window.__editor.atomClientPoint(1));
  await page.mouse.click(p.x, p.y);
  expect(await page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const after = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(after.atoms.length).toBe(before.atoms.length);
  expect(after.bonds).toEqual(before.bonds);
  expect(after.atoms.map((a) => a.x)).toEqual(before.atoms.map((a) => a.x + 80));
  await expect(page.locator('#result-name')).toHaveText('2,3-dimetilpentano');
  // The drawing now shows the final positions: the next click edits normally.
  await page.mouse.click(p.x, p.y);
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.length)).toBe(before.atoms.length + 1);
  expect(errors).toEqual([]);
}); // End of test 'a click during the redraw animation ends it and edits nothing'

test('a Mover drag shows the atom at its new place before the release', async ({ page }) => {
  const errors = await openApp(page);
  await loadExample(page, 'Rama con un enlace doble');
  const atom = page.locator('circle.atom[data-atom-id="1"]');
  const before = Number(await atom.getAttribute('cx'));
  await page.evaluate(() => window.__editor.setTool('move'));
  const p = await page.evaluate(() => window.__editor.atomClientPoint(1));
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 60, p.y, { steps: 8 });
  // Mid-gesture: the rendered circle already follows the pointer.
  expect(Number(await atom.getAttribute('cx'))).toBeGreaterThan(before + 20);
  await page.mouse.up();
  expect(errors).toEqual([]);
});

/**
 * Drags on the canvas between two client points (a drawing gesture).
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {{x: number, y: number}} from - Start (client px).
 * @param {{x: number, y: number}} to - End (client px).
 * @returns {Promise<void>}
 */
async function dragOnCanvas(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

/**
 * Draws a branched molecule by hand with Enlace simple: a long chain dragged
 * down the left edge of the canvas (its ordered, horizontal drawing no longer
 * fits there, so "Ordenar dibujo" re-centres the canvas) and a branch dragged
 * from its second carbon.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<{coords: Array<[number, number, number]>, view: object, points: object[]}>} The
 *   hand-drawn coordinates, the canvas view and the atoms' client points.
 */
async function drawByHand(page) {
  const box = await page.locator('svg#canvas').boundingBox();
  await dragOnCanvas(page, { x: box.x + 40, y: box.y + 30 }, { x: box.x + 50, y: box.y + 480 });
  const p = await page.evaluate(() => window.__editor.atomClientPoint(2));
  await dragOnCanvas(page, p, { x: p.x + 70, y: p.y + 10 });
  return {
    coords: await coordinates(page),
    view: await page.evaluate(() => window.__editor.getView()),
    points: await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.map((a) => window.__editor.atomClientPoint(a.id))),
  };
} // End of function drawByHand()

/**
 * Reads the enabled state of Deshacer and Rehacer.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<{undo: boolean, redo: boolean}>} True for an enabled button.
 */
async function undoRedoEnabled(page) {
  return {
    undo: await page.getByRole('button', { name: 'Deshacer' }).isEnabled(),
    redo: await page.getByRole('button', { name: 'Rehacer' }).isEnabled(),
  };
}

test('a hand-drawn molecule: Ordenar dibujo, then one Deshacer brings the drawing back where it was; Rehacer orders it again', async ({ page }) => {
  const errors = await openApp(page);
  const drawn = await drawByHand(page);
  expect(drawn.coords.length).toBeGreaterThan(10);
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).not.toBeEmpty();
  const name = await page.locator('#result-name').textContent();
  expect(await undoRedoEnabled(page)).toEqual({ undo: true, redo: false });

  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  const arranged = await coordinates(page);
  const fitted = await page.evaluate(() => window.__editor.getView());
  expect(arranged).not.toEqual(drawn.coords);
  expect(fitted).not.toEqual(drawn.view); // The ordered drawing did not fit: the canvas was re-centred.
  expect(await undoRedoEnabled(page)).toEqual({ undo: true, redo: false });

  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect(await coordinates(page)).toEqual(drawn.coords);
  // Same view: every carbon is back at the very spot of the screen where it was drawn.
  expect(await page.evaluate(() => window.__editor.getView())).toEqual(drawn.view);
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.map((a) => window.__editor.atomClientPoint(a.id))))
    .toEqual(drawn.points);
  expect(await undoRedoEnabled(page)).toEqual({ undo: true, redo: true });
  await expect(page.locator('#result-name')).toHaveText(name);
  await expect(page.locator('#redraw-hint')).toBeVisible();

  await page.getByRole('button', { name: 'Rehacer' }).click();
  expect(await coordinates(page)).toEqual(arranged);
  expect(await page.evaluate(() => window.__editor.getView())).toEqual(fitted);
  expect(await undoRedoEnabled(page)).toEqual({ undo: true, redo: false });
  await expect(page.locator('#redraw-hint')).toBeHidden();

  // Ctrl+Z works the same way.
  await page.keyboard.press('Control+z');
  expect(await coordinates(page)).toEqual(drawn.coords);
  expect(await page.evaluate(() => window.__editor.getView())).toEqual(drawn.view);
  expect(errors).toEqual([]);
}); // End of test 'a hand-drawn molecule: Ordenar dibujo, then one Deshacer…'

for (const how of ['button', 'keyboard']) {
  test(`Deshacer (${how}) during the Ordenar dibujo animation brings the hand drawing back at once`, async ({ page }) => {
    const errors = await openApp(page);
    const drawn = await drawByHand(page);
    // No name shown: the toolbar button names the molecule first.
    await page.locator('#toolbar [data-action="arrange"]').click();
    expect(await page.evaluate(() => window.__editor.isAnimating())).toBe(true);
    const arranged = await coordinates(page);
    if (how === 'button') {
      await page.getByRole('button', { name: 'Deshacer' }).click();
    } else {
      await page.keyboard.press('ControlOrMeta+z');
    }
    expect(await page.evaluate(() => window.__editor.isAnimating())).toBe(false);
    expect(await coordinates(page)).toEqual(drawn.coords);
    expect(await page.evaluate(() => window.__editor.getView())).toEqual(drawn.view);
    // The drawing on screen is the hand drawing, not a frame of the animation.
    expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.map((a) => window.__editor.atomClientPoint(a.id))))
      .toEqual(drawn.points);
    expect(await undoRedoEnabled(page)).toEqual({ undo: true, redo: true });
    await expect(page.locator('#redraw-hint')).toBeVisible();

    await page.getByRole('button', { name: 'Rehacer' }).click();
    expect(await coordinates(page)).toEqual(arranged);
    expect(await undoRedoEnabled(page)).toEqual({ undo: true, redo: false });
    expect(errors).toEqual([]);
  }); // End of test 'Deshacer during the Ordenar dibujo animation…'
} // End of the loop over the ways of pressing Deshacer

test('Deshacer of Ordenar dibujo in the 90° view keeps the 90° view; the normal drawing gets its view back', async ({ page }) => {
  const errors = await openApp(page);
  const drawn = await drawByHand(page);
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  await page.locator('#canvas-bar button[data-mode="condensed"]').click();
  await page.locator('#right-angle-button').click();
  expect(await page.evaluate(() => window.__editor.isProjected())).toBe(true);
  await page.locator('#center-button').click();
  const projectedView = await page.evaluate(() => window.__editor.getView());

  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect(await coordinates(page)).toEqual(drawn.coords);
  // The 90° drawing is not clipped by the normal drawing's old view.
  expect(await page.evaluate(() => window.__editor.getView())).toEqual(projectedView);

  await page.locator('#right-angle-button').click();
  expect(await page.evaluate(() => window.__editor.isProjected())).toBe(false);
  expect(await page.evaluate(() => window.__editor.getView())).toEqual(drawn.view);
  expect(errors).toEqual([]);
}); // End of test 'Deshacer of Ordenar dibujo in the 90° view…'
