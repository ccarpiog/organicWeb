/**
 * @file «¿Cómo se dibuja?» dialog e2e (design.md §15.2, phases R-2a and
 * R-2b): the button under «¿Cómo se llama?» opens the dialog; tiles build
 * the name on the name line (coloured by part kind, one selectable span per
 * tile); insertion after the selected span or at the front; «Borrar ficha»,
 * Backspace, «Borrar todo»; Escape closes and the focus returns; the tiles
 * survive reopening; keyboard-only use; «Dibujar» with a wrong name shows
 * the message and marks the tiles without touching the canvas, and an edit
 * clears them; the tile cap; the full-screen dialog on a phone.
 *
 * «Dibujar» with a name the app understands (R-2b, design.md §15.7): the
 * molecule replaces the drawing as one undoable edit, centred, ordered
 * (parent highlighted with its locants, no redraw hint), with the verdict
 * block above «Se llama:» (correct, alternative, missingLocants, otherName
 * with its diagnosis, an old-style name; the diagnosis itself is
 * diagnosis.spec.js's); the dialog closes; Deshacer restores the old drawing
 * and clears the verdict, a coordinate-only undo keeps it; the molecule is
 * autosaved, the verdict and the tiles are not; keyboard only; a phone; the
 * 90° view. The centring is part of the edit: Deshacer restores the old
 * drawing's view (zoom and pan), Rehacer the centred one, with the 90° view
 * off and on, while ordinary edits never move the view.
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
} // End of function openApp()

/**
 * The «¿Cómo se dibuja?» dialog.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {import('@playwright/test').Locator} The dialog.
 */
function builder(page) {
  return page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
}

/**
 * Opens the dialog with its launcher.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<import('@playwright/test').Locator>} The open dialog.
 */
async function openBuilder(page) {
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = builder(page);
  await expect(dialog).toBeVisible();
  return dialog;
}

/**
 * Taps tiles by their exact text.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {...string} texts - Tile texts, in order.
 * @returns {Promise<void>}
 */
async function tap(page, ...texts) {
  const rows = page.locator('#name-builder-rows');
  for (const text of texts) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
}

/**
 * Presses Tab (or Shift+Tab) until the focused element matches a selector.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} selector - CSS selector of the target.
 * @param {boolean} [backwards] - Shift+Tab instead of Tab.
 * @returns {Promise<void>}
 */
async function tabTo(page, selector, backwards = false) {
  for (let i = 0; i < 150; i += 1) {
    if (await page.evaluate((sel) => document.activeElement && document.activeElement.matches(sel), selector)) {
      return;
    }
    await page.keyboard.press(backwards ? 'Shift+Tab' : 'Tab');
  }
  throw new Error(`Tab never reached ${selector}`);
}

/**
 * The tile indices of the name line's options marked aria-invalid.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<number[]>} The indices.
 */
function invalidTiles(page) {
  return page.locator('#name-builder-name [aria-invalid="true"]')
    .evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.index)));
}

test('the button opens the dialog; tiles build a coloured name; Escape closes; reopening keeps the tiles', async ({ page }) => {
  const errors = await openApp(page);
  await expect(page.locator('.results-hint')).toHaveText(
    'Dibuja una molécula en el lienzo y pulsa «¿Cómo se llama?», o forma un nombre con «¿Cómo se dibuja?».');
  // The launcher sits right under «¿Cómo se llama?», outside the replaceable results body.
  const launcher = page.getByRole('button', { name: '¿Cómo se dibuja?' });
  await expect(launcher).toBeEnabled();
  expect(await page.locator('.results-body #draw-name-button').count()).toBe(0);
  const nameBox = await page.locator('#name-button').boundingBox();
  const launcherBox = await launcher.boundingBox();
  expect(launcherBox.y).toBeGreaterThan(nameBox.y + nameBox.height - 1);
  expect(launcherBox.y - (nameBox.y + nameBox.height)).toBeLessThan(24);

  const dialog = await openBuilder(page);
  await expect(dialog.getByRole('heading', { name: '¿Cómo se dibuja?' })).toBeFocused();
  // Tiles only: no text field of any kind.
  expect(await dialog.locator('input, textarea, select, [contenteditable]').count()).toBe(0);
  for (const label of ['Números', '¿Cuántos?', 'Raíces (cuántos carbonos)', 'Terminaciones', 'Ramas']) {
    await expect(dialog.getByRole('heading', { name: label, exact: true })).toBeVisible();
  }
  for (const text of ['empieza rama compuesta', 'acaba rama', 'isopropil', 'isopropiliden', 'tert-butil', 'iliden', 'bis']) {
    await expect(dialog.getByRole('button', { name: text, exact: true })).toBeVisible();
  }
  const name = page.locator('#name-builder-name');
  await expect(name).toHaveAttribute('aria-live', 'polite');
  await expect(name).toHaveText('Pulsa las fichas de abajo para formar un nombre.');

  await tap(page, '2', 'met', 'il', 'but', 'ano');
  await expect(name).toHaveText('2-metilbutano');
  // One span per tile, coloured like the result name; the new tile is the selection.
  const options = name.getByRole('option');
  await expect(options).toHaveCount(6); // The insertion point before the first tile, then the five tiles.
  await expect(name.locator('[data-index="0"]')).toHaveClass(/part-locant/);
  await expect(name.locator('[data-index="1"]')).toHaveClass(/part-prefix/);
  await expect(name.locator('[data-index="3"]')).toHaveClass(/part-stem/);
  await expect(name.locator('[data-index="4"]')).toHaveClass(/part-ending/);
  await expect(name.locator('[data-index="4"]')).toHaveAttribute('aria-selected', 'true');
  await expect(name.locator('[aria-selected="true"]')).toHaveCount(1);

  // «más» shows the rest of a row.
  const numbers = dialog.getByRole('group', { name: 'Números' });
  await expect(numbers.getByRole('button', { name: '13', exact: true })).toBeHidden();
  const more = numbers.getByRole('button', { name: 'más' });
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await more.click();
  await expect(numbers.getByRole('button', { name: '13', exact: true })).toBeVisible();
  await expect(numbers.getByRole('button', { name: '30', exact: true })).toBeVisible();
  await expect(numbers.getByRole('button', { name: 'menos' })).toHaveAttribute('aria-expanded', 'true');
  const roots = dialog.getByRole('group', { name: 'Raíces (cuántos carbonos)' });
  await expect(roots.getByRole('button', { name: 'undec', exact: true })).toBeHidden();
  await roots.getByRole('button', { name: 'más' }).click();
  await expect(roots.getByRole('button', { name: 'undec', exact: true })).toBeVisible();

  // The editor's shortcuts are off while the dialog is open; Escape closes it and the focus returns.
  await page.keyboard.press('c');
  expect(await page.evaluate(() => window.__editor.getTool())).toBe('single');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(launcher).toBeFocused();

  // Reopening shows the same tiles; «Cerrar» closes too.
  await launcher.click();
  await expect(dialog).toBeVisible();
  await expect(name).toHaveText('2-metilbutano');
  await dialog.getByRole('button', { name: 'Cerrar' }).click();
  await expect(dialog).toBeHidden();
  await expect(launcher).toBeFocused();
  // Nothing was autosaved: a reload starts with an empty name.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  await openBuilder(page);
  await expect(name).toHaveText('Pulsa las fichas de abajo para formar un nombre.');
  expect(errors).toEqual([]);
}); // End of test 'the button opens the dialog…'

test('a tile goes after the selected span; Borrar ficha, Backspace and Borrar todo', async ({ page }) => {
  const errors = await openApp(page);
  const dialog = await openBuilder(page);
  const name = page.locator('#name-builder-name');
  await tap(page, '2', 'met', 'il', 'pent', 'ano');
  await expect(name).toHaveText('2-metilpentano');

  // Select the «2» and insert after it.
  await name.locator('[data-index="0"]').click();
  await expect(name.locator('[data-index="0"]')).toHaveAttribute('aria-selected', 'true');
  await expect(name.locator('[data-index="0"]')).toHaveClass(/is-selected/);
  await tap(page, '3', 'di');
  await expect(name).toHaveText('2,3-dimetilpentano');
  await expect(name.locator('[data-index="2"]')).toHaveAttribute('aria-selected', 'true');

  // «Borrar ficha» removes the selected tile; Backspace (focus in the dialog) does the same.
  await dialog.getByRole('button', { name: 'Borrar ficha' }).click();
  await expect(name).toHaveText('2,3-metilpentano');
  await expect(name.locator('[data-index="1"]')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Backspace');
  await expect(name).toHaveText('2-metilpentano');

  // The insertion point before the first tile: a tile goes to the front.
  await name.locator('[data-index="-1"]').click();
  await expect(name.locator('[data-index="-1"]')).toHaveAttribute('aria-selected', 'true');
  await tap(page, '3');
  await expect(name).toHaveText('3,2-metilpentano');
  await expect(name.locator('[data-index="0"]')).toHaveText('3');

  // «Borrar todo».
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  await expect(name).toHaveText('Pulsa las fichas de abajo para formar un nombre.');
  await page.keyboard.press('Backspace');
  await expect(dialog).toBeVisible();
  expect(errors).toEqual([]);
}); // End of test 'a tile goes after the selected span…'

test('compound branches: an unfinished one shows its opening mark faintly', async ({ page }) => {
  await openApp(page);
  await openBuilder(page);
  const name = page.locator('#name-builder-name');
  await tap(page, '5', '5', 'bis', 'empieza rama compuesta', '2', '2', 'di', 'met', 'il', 'prop', 'il');
  await expect(name).toHaveText('5,5-bis(2,2-dimetilpropil');
  const open = name.locator('[data-index="3"]');
  await expect(open).toHaveClass(/nb-piece--pending/);
  expect(Number(await open.evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(1);
  await expect(open).toHaveAttribute('aria-label', 'empieza rama compuesta');
  await tap(page, 'acaba rama', 'non', 'ano');
  await expect(name).toHaveText('5,5-bis(2,2-dimetilpropil)nonano');
  await expect(open).not.toHaveClass(/nb-piece--pending/);
  await expect(name.locator('.nb-piece--pending')).toHaveCount(0);
}); // End of test 'compound branches…'

test('keyboard only: open, add tiles, move the selection, delete, draw and close', async ({ page }) => {
  await openApp(page);
  const launcher = page.locator('#draw-name-button');
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await tabTo(page, '#draw-name-button');
  await page.keyboard.press('Enter');
  const dialog = builder(page);
  await expect(dialog).toBeVisible();
  const name = page.locator('#name-builder-name');

  // Tiles with Enter and Space.
  await tabTo(page, '#name-builder-rows [data-tile="root-4"]');
  await page.keyboard.press('Enter');
  await tabTo(page, '#name-builder-rows [data-tile="ending-saturated"]');
  await page.keyboard.press('Space');
  await expect(name).toHaveText('butano');

  // Back to the name line; Home selects the insertion point before the first tile.
  await tabTo(page, '#name-builder-name [role="option"]', true);
  await expect(name.locator('[data-index="1"]')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(name.locator('[data-index="-1"]')).toBeFocused();
  await expect(name.locator('[data-index="-1"]')).toHaveAttribute('aria-selected', 'true');
  await tabTo(page, '#name-builder-rows [data-tile="num-2"]');
  await page.keyboard.press('Enter');
  await tabTo(page, '#name-builder-rows [data-tile="root-1"]');
  await page.keyboard.press('Enter');
  await tabTo(page, '#name-builder-rows [data-tile="fv-1"]');
  await page.keyboard.press('Enter');
  await expect(name).toHaveText('2-metilbutano');

  // Arrow keys and End move the selection (roving tabindex: one option in the Tab order).
  await tabTo(page, '#name-builder-name [role="option"]', true);
  await expect(name.locator('[data-index="2"]')).toBeFocused();
  await expect(name.locator('[tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('ArrowRight');
  await expect(name.locator('[data-index="3"]')).toBeFocused();
  await expect(name.locator('[data-index="3"]')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(name.locator('[data-index="1"]')).toBeFocused();
  await page.keyboard.press('End');
  await expect(name.locator('[data-index="4"]')).toBeFocused();
  // Backspace on the name line removes the selected tile and keeps the focus on the line.
  await page.keyboard.press('Backspace');
  await expect(name).toHaveText('2-metilbut');
  await expect(name.locator('[data-index="3"]')).toBeFocused();

  // «Dibujar» with the keyboard: the message is announced.
  await tabTo(page, '[data-role="draw"]');
  await page.keyboard.press('Enter');
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveAttribute('role', 'status');
  await expect(message).toContainText('Después de «but» va una terminación');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(launcher).toBeFocused();
}); // End of test 'keyboard only…'

test('Dibujar: failures stay in the dialog with the wrong tiles marked and the canvas untouched; an edit clears them', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: 'Ejemplos' }).click();
  await page.getByRole('menuitem', { name: 'Alcano ramificado', exact: true }).click();
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  const resultName = await page.locator('#result-name').textContent();
  const before = await page.evaluate(() => JSON.stringify(window.__editor.getMoleculeJSON()));
  const canUndo = await page.getByRole('button', { name: 'Deshacer' }).isEnabled();

  const dialog = await openBuilder(page);
  const name = page.locator('#name-builder-name');
  const message = page.locator('#name-builder-message');
  const draw = dialog.getByRole('button', { name: 'Dibujar' });

  // An empty name.
  await draw.click();
  await expect(message).toHaveText('Elige fichas para formar un nombre.');
  await expect(message).toHaveClass(/nb-message--error/);

  // A parse error: the two locants are marked.
  await tap(page, '2', '3', 'met', 'il', 'but', 'ano');
  await expect(message).toHaveText('');
  await draw.click();
  await expect(message).toHaveText('Con dos números hace falta «di».');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([0, 1]);
  await expect(name.locator('[data-index="0"]')).toHaveClass(/nb-piece--invalid/);
  await expect(dialog).toBeVisible();
  // Any edit clears the stale message and marks.
  await dialog.getByRole('button', { name: 'Borrar ficha' }).click();
  await expect(message).toHaveText('');
  expect(await invalidTiles(page)).toEqual([]);

  // A structural error, then an ambiguous name (no tiles marked).
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  await tap(page, '7', 'met', 'il', 'pent', 'ano');
  await draw.click();
  await expect(message).toHaveText('La cadena de 5 carbonos va del 1 al 5: no hay carbono 7.');
  expect(await invalidTiles(page)).toEqual([0]);
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  await tap(page, 'but', 'eno');
  await draw.click();
  await expect(message).toHaveText('Faltan números: puede ser but-1-eno o but-2-eno.');
  expect(await invalidTiles(page)).toEqual([]);

  // The canvas, its history and the result were never touched.
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => JSON.stringify(window.__editor.getMoleculeJSON()))).toBe(before);
  expect(await page.getByRole('button', { name: 'Deshacer' }).isEnabled()).toBe(canUndo);
  await expect(page.locator('#result-name')).toHaveText(resultName);
  expect(errors).toEqual([]);
}); // End of test 'Dibujar: failures stay in the dialog…'

test('the tile cap: tile buttons stop adding and a message says why', async ({ page }) => {
  await openApp(page);
  const dialog = await openBuilder(page);
  const name = page.locator('#name-builder-name');
  const one = dialog.locator('#name-builder-rows [data-tile="num-1"]');
  await one.focus();
  for (let i = 0; i < 100; i += 1) {
    await page.keyboard.press('Enter');
  }
  await expect(name.locator('.nb-piece')).toHaveCount(100);
  const limit = page.locator('#name-builder-limit');
  await expect(limit).toHaveText('Ya hay 100 fichas, el máximo: borra alguna para añadir otra.');
  await expect(one).toHaveAttribute('aria-disabled', 'true');
  await expect(one).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(name.locator('.nb-piece')).toHaveCount(100);
  // Deleting one makes room again.
  await page.keyboard.press('Backspace');
  await expect(name.locator('.nb-piece')).toHaveCount(99);
  await expect(limit).toHaveText('');
  await expect(one).not.toHaveAttribute('aria-disabled', 'true');
}); // End of test 'the tile cap…'

test.describe('phone (375 × 667)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('the dialog fills the screen; the name line and Dibujar stay visible while the rows scroll', async ({ page }) => {
    const errors = await openApp(page);
    const dialog = await openBuilder(page);
    const box = await dialog.boundingBox();
    expect(Math.round(box.x)).toBe(0);
    expect(Math.round(box.y)).toBe(0);
    expect(Math.round(box.width)).toBe(375);
    expect(Math.round(box.height)).toBe(667);
    await tap(page, '5', '5', 'bis', 'empieza rama compuesta', '2', '2', 'di', 'met', 'il', 'prop', 'il', 'acaba rama',
      'non', 'ano');
    const name = page.locator('#name-builder-name');
    const draw = dialog.getByRole('button', { name: 'Dibujar' });
    await expect(name).toHaveText('5,5-bis(2,2-dimetilpropil)nonano');

    const rows = page.locator('#name-builder-rows');
    const more = rows.getByRole('button', { name: 'más' });
    while ((await more.count()) > 0) {
      await more.first().click();
    }
    expect(await rows.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    await rows.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    // Scrolled to the end, the last tile of the rows is on screen (since the acyl tiles of I-51c2 the «Ramas» row is above it).
    await expect(rows.locator('.nb-tile').last()).toBeInViewport();
    await expect(name).toBeInViewport({ ratio: 1 });
    await expect(draw).toBeInViewport({ ratio: 1 });
    // No horizontal scroll inside the dialog.
    expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await rows.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    // A failure message keeps Dibujar on screen too.
    await tap(page, 'eno');
    await draw.click();
    await expect(page.locator('#name-builder-message')).not.toHaveText('');
    await expect(draw).toBeInViewport({ ratio: 1 });
    expect(errors).toEqual([]);
  }); // End of test 'the dialog fills the screen…'
}); // End of describe 'phone (375 × 667)'

/**
 * Tells whether one box lies inside another (to the pixel).
 *
 * @param {{x: number, y: number, width: number, height: number}} inner - The inner box.
 * @param {{x: number, y: number, width: number, height: number}} outer - The outer box.
 * @returns {boolean} True when `inner` is inside `outer`.
 */
function inside(inner, outer) {
  return inner.x >= outer.x - 1 && inner.y >= outer.y - 1
    && inner.x + inner.width <= outer.x + outer.width + 1 && inner.y + inner.height <= outer.y + outer.height + 1;
}

for (const viewport of [{ width: 320, height: 480 }, { width: 320, height: 568 }]) {
  test.describe(`short phone (${viewport.width} × ${viewport.height})`, () => {
    test.use({ viewport });

    test('a capped name with an error message keeps the editing buttons and the tile rows usable', async ({ page }) => {
      const errors = await openApp(page);
      const dialog = await openBuilder(page);
      const name = page.locator('#name-builder-name');
      const one = page.locator('#name-builder-rows [data-tile="num-1"]');
      await one.focus();
      for (let i = 0; i < 100; i += 1) {
        await page.keyboard.press('Enter');
      }
      await expect(name.locator('.nb-piece')).toHaveCount(100);
      await expect(page.locator('#name-builder-limit')).not.toHaveText('');
      await dialog.getByRole('button', { name: 'Dibujar' }).click();
      const message = page.locator('#name-builder-message');
      await expect(message).toHaveClass(/nb-message--error/);
      await expect(message).not.toHaveText('');

      // The editing buttons and «Dibujar» are on screen and inside the dialog.
      const box = await dialog.boundingBox();
      for (const label of ['Borrar ficha', 'Borrar todo', 'Dibujar']) {
        const button = dialog.getByRole('button', { name: label, exact: true });
        await expect(button, label).toBeInViewport({ ratio: 1 });
        expect(inside(await button.boundingBox(), box), label).toBe(true);
      }
      // The name line and the message keep a visible part (they scroll inside).
      await expect(name).toBeInViewport();
      await expect(message).toBeInViewport();
      // The tile rows keep some height and scroll: their first tile shows, and the last one can be scrolled to.
      const rows = page.locator('#name-builder-rows');
      const rowsBox = await rows.boundingBox();
      expect(rowsBox.height).toBeGreaterThan(60);
      expect(inside(rowsBox, box)).toBe(true);
      await rows.evaluate((el) => { el.scrollTop = 0; });
      await expect(one).toBeInViewport({ ratio: 1 });
      const last = rows.getByRole('button', { name: 'acaba rama', exact: true });
      await last.scrollIntoViewIfNeeded();
      await expect(last).toBeInViewport();
      expect(inside(await last.boundingBox(), box)).toBe(true);
      expect(errors).toEqual([]);
    }); // End of test 'a capped name with an error message…'
  }); // End of describe 'short phone'
} // End of the loop over the short viewports

// ---------------------------------------------------------------------------
// «Dibujar» on the canvas (phase R-2b).
// ---------------------------------------------------------------------------

/**
 * Builds a name from tiles in the dialog (from an empty name) and presses
 * «Dibujar».
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {...string} texts - Tile texts, in order.
 * @returns {Promise<import('@playwright/test').Locator>} The dialog.
 */
async function drawName(page, ...texts) {
  const dialog = await openBuilder(page);
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  await tap(page, ...texts);
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  return dialog;
}

/**
 * The molecule on the canvas, serialised.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<object>} moleculeToJSON() output.
 */
function moleculeJSON(page) {
  return page.evaluate(() => window.__editor.getMoleculeJSON());
}

/**
 * Tells whether every atom, as drawn (also in the 90° view), lies inside the
 * canvas on screen.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<boolean>} True when the whole drawing is visible.
 */
function drawingInsideCanvas(page) {
  return page.evaluate(() => {
    const box = document.getElementById('canvas').getBoundingClientRect();
    return window.__editor.getMoleculeJSON().atoms.every((atom) => {
      const p = window.__editor.atomClientPoint(atom.id);
      return p.x >= box.left && p.x <= box.right && p.y >= box.top && p.y <= box.bottom;
    });
  });
}

/**
 * The locant labels on the canvas, ascending.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<number[]>} The numbers shown.
 */
function canvasLocants(page) {
  return page.locator('svg#canvas .locant').evaluateAll((nodes) => nodes.map((n) => Number(n.textContent)).sort((a, b) => a - b));
}

/**
 * Tells whether the verdict block comes before «Se llama:» in the results panel.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<boolean>} True when it does.
 */
function verdictBeforeName(page) {
  return page.evaluate(() => {
    const verdict = document.getElementById('verdict');
    const label = document.querySelector('.results-body .result-label');
    return Boolean(verdict && label && (verdict.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
}

/**
 * Drags an atom with the Mover tool by a client offset (a coordinate-only edit).
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

test('Dibujar: the molecule replaces the drawing, centred and ordered, with the verdict above the name; Deshacer restores the old drawing', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: 'Ejemplos' }).click();
  await page.getByRole('menuitem', { name: 'Alcano ramificado', exact: true }).click();
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('2,3-dimetilpentano');
  const before = await moleculeJSON(page);

  const dialog = await drawName(page, '2', 'met', 'il', 'but', 'ano');
  // The dialog closes and the focus goes back to its launcher.
  await expect(dialog).toBeHidden();
  await expect(page.locator('#draw-name-button')).toBeFocused();

  // The molecule of the name is on the canvas, whole and in view.
  const drawn = await moleculeJSON(page);
  expect(drawn.atoms).toHaveLength(5);
  expect(drawn.bonds).toHaveLength(4);
  expect(await drawingInsideCanvas(page)).toBe(true);

  // The verdict block, then «Se llama:» and the name.
  const verdict = page.locator('#verdict');
  await expect(verdict).toBeVisible();
  await expect(verdict).toHaveAttribute('data-kind', 'correct');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: 2-metilbutano');
  await expect(verdict.locator('.verdict-student .part-locant')).toHaveText('2');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto!');
  await expect(verdict.locator('.verdict-note')).toHaveCount(0);
  await expect(page.locator('#result-name')).toHaveText('2-metilbutano');
  expect(await verdictBeforeName(page)).toBe(true);
  await expect(page.locator('#announcer')).toContainText('¡Correcto! Se llama: 2-metilbutano');

  // The ordered drawing: parent chain highlighted with its locants, no redraw hint.
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom')).toHaveCount(4);
  expect(await canvasLocants(page)).toEqual([1, 2, 3, 4]);

  // The molecule is autosaved like any edit; the verdict and the tiles are not.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('organicWeb.molecule')));
  expect(saved).toEqual(drawn);
  const stored = await page.evaluate(() => Object.keys(localStorage).map((key) => localStorage.getItem(key)).join('\n'));
  expect(stored).not.toContain('Correcto');
  expect(stored).not.toContain('root-1');

  // Deshacer restores the previous drawing and, being a chemical edit, clears the verdict with the result.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect(await moleculeJSON(page)).toEqual(before);
  await expect(page.locator('#verdict')).toHaveCount(0);
  await expect(page.locator('#result-name')).toHaveCount(0);
  await expect(page.locator('.results-hint')).toBeVisible();
  // Rehacer brings the drawn molecule back (without a stale verdict).
  await page.getByRole('button', { name: 'Rehacer' }).click();
  expect(await moleculeJSON(page)).toEqual(drawn);
  await expect(page.locator('#verdict')).toHaveCount(0);

  // A reload keeps the molecule only: no verdict, an empty name in the dialog.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
  expect(await moleculeJSON(page)).toEqual(drawn);
  await expect(page.locator('#verdict')).toHaveCount(0);
  await openBuilder(page);
  await expect(page.locator('#name-builder-name')).toHaveText('Pulsa las fichas de abajo para formar un nombre.');
  expect(errors).toEqual([]);
}); // End of test 'Dibujar: the molecule replaces the drawing…'

test('Dibujar: a coordinate-only edit and its undo keep the verdict; the ordered state follows the drawing', async ({ page }) => {
  const errors = await openApp(page);
  await drawName(page, '4', 'prop', 'ano', '2', 'il', 'hept', 'ano');
  const verdict = page.locator('#verdict');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto! «4-(propan-2-il)heptano» es una forma válida '
    + '(nombre preferido por la IUPAC (2013)). El nombre que doy primero es «4-isopropilheptano».');
  await expect(verdict).toHaveAttribute('data-kind', 'alternative');
  await expect(page.locator('#result-name')).toHaveText('4-isopropilheptano');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  const ordered = await moleculeJSON(page);

  // Moving an atom is a coordinate-only edit: the verdict stays, the drawing is no longer the ordered one.
  await moveAtom(page, ordered.atoms[0].id, 40, 50);
  expect(await moleculeJSON(page)).not.toEqual(ordered);
  await expect(verdict).toBeVisible();
  await expect(page.locator('#redraw-hint')).toBeVisible();
  // Its undo is coordinate-only too: the verdict stays and the drawing is ordered again.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect(await moleculeJSON(page)).toEqual(ordered);
  await expect(verdict).toBeVisible();
  await expect(page.locator('#result-name')).toHaveText('4-isopropilheptano');
  await expect(page.locator('#redraw-hint')).toBeHidden();
  await expect(page.locator('svg#canvas .hl-parent.hl-atom')).toHaveCount(7);
  expect(errors).toEqual([]);
}); // End of test 'Dibujar: a coordinate-only edit…'

test('Dibujar: missing locants, an old-style name and another name each show their verdict', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');

  // Left-out locants: «Casi».
  await drawName(page, 'met', 'il', 'prop', 'eno');
  await expect(verdict).toHaveAttribute('data-kind', 'missingLocants');
  await expect(verdict).toHaveClass(/verdict--almost/);
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: metilpropeno');
  await expect(verdict.locator('.verdict-message')).toHaveText('Casi: faltan los números. Se escribe «2-metilprop-1-eno».');
  await expect(page.locator('#result-name')).toHaveText('2-metilprop-1-eno');
  expect((await moleculeJSON(page)).atoms).toHaveLength(4);
  const first = await moleculeJSON(page);

  // The old style: drawn, named, with its diagnosis (which stands in for the old-style note, I-49b).
  await drawName(page, '2', 'but', 'eno');
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«but-2-eno».');
  await expect(verdict.locator('.verdict-diagnosis')).toContainText('como se hacía antes');
  await expect(verdict.locator('.verdict-hint')).toHaveText('Pulsa «Ver paso a paso» para ver por qué.');
  await expect(verdict.locator('.verdict-note')).toHaveCount(0);
  await expect(page.locator('#result-name')).toHaveText('but-2-eno');

  // Another name: the molecule the name describes, with the app's name and the stepper.
  await drawName(page, 'met', 'il', 'et', 'ano');
  await expect(verdict).toHaveClass(/verdict--other/);
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: metiletano');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«propano».');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('La rama «metil» está en el extremo de la cadena, así que la '
    + 'alarga: la cadena principal tiene 3 carbonos.');
  await expect(page.locator('#result-name')).toHaveText('propano');
  expect((await moleculeJSON(page)).atoms).toHaveLength(3);
  expect(await verdictBeforeName(page)).toBe(true);
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  await expect(page.locator('#stepper')).toBeVisible();

  // Each «Dibujar» was one edit: two Deshacer get back to the first drawing, without a verdict.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect(await moleculeJSON(page)).toEqual(first);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test 'Dibujar: missing locants…'

test('Dibujar: after a drawn name, a failing one keeps the canvas, the verdict and the result', async ({ page }) => {
  const errors = await openApp(page);
  await drawName(page, 'hex', 'ano');
  await expect(page.locator('#result-name')).toHaveText('hexano');
  const drawn = await moleculeJSON(page);
  // An ambiguous name: the message, no tile marked.
  const dialog = await drawName(page, 'but', 'eno');
  const message = page.locator('#name-builder-message');
  await expect(message).toHaveText('Faltan números: puede ser but-1-eno o but-2-eno.');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([]);
  await expect(dialog).toBeVisible();
  // A wrong name: the message and the wrong tiles marked.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  await tap(page, '2', '3', 'met', 'il', 'but', 'ano');
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('Con dos números hace falta «di».');
  expect(await invalidTiles(page)).toEqual([0, 1]);
  await expect(page.locator('#name-builder-name [data-index="0"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(dialog).toBeVisible();
  // A molecule the editor refuses to load (forced here): its message in the dialog, no tile marked.
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  await tap(page, 'pent', 'ano');
  await page.evaluate(() => {
    window.__editor.loadMolecule = () => ({ ok: false, message: 'No se puede cargar.', atoms: [] });
  });
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(message).toHaveText('No se puede cargar.');
  await expect(message).toHaveClass(/nb-message--error/);
  expect(await invalidTiles(page)).toEqual([]);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await moleculeJSON(page)).toEqual(drawn);
  await expect(page.locator('#verdict .verdict-message')).toHaveText('¡Correcto!');
  await expect(page.locator('#result-name')).toHaveText('hexano');
  expect(errors).toEqual([]);
}); // End of test 'Dibujar: after a drawn name…'

test('keyboard only: build a name and draw it', async ({ page }) => {
  const errors = await openApp(page);
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await tabTo(page, '#draw-name-button');
  await page.keyboard.press('Enter');
  const dialog = builder(page);
  await expect(dialog).toBeVisible();
  await tabTo(page, '#name-builder-rows [data-tile="root-6"]');
  await page.keyboard.press('Enter');
  await tabTo(page, '#name-builder-rows [data-tile="ending-saturated"]');
  await page.keyboard.press('Space');
  await expect(page.locator('#name-builder-name')).toHaveText('hexano');
  await tabTo(page, '[data-role="draw"]', true);
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.locator('#draw-name-button')).toBeFocused();
  await expect(page.locator('#verdict .verdict-message')).toHaveText('¡Correcto!');
  await expect(page.locator('#result-name')).toHaveText('hexano');
  expect((await moleculeJSON(page)).atoms).toHaveLength(6);
  // Ctrl+Z (the editor's shortcut) undoes the drawing and clears the verdict.
  await page.keyboard.press('Control+z');
  expect((await moleculeJSON(page)).atoms).toHaveLength(0);
  await expect(page.locator('#verdict')).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test 'keyboard only: build a name and draw it'

test('Dibujar with the 90° view on: the drawing is projected, centred and ordered, and the preference is kept', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  const toggle = page.locator('#right-angle-button');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  await drawName(page, '2', 'met', 'il', 'but', 'ano');
  await expect(page.locator('#verdict .verdict-message')).toHaveText('¡Correcto!');
  await expect(page.locator('#result-name')).toHaveText('2-metilbutano');
  expect(await page.evaluate(() => window.__editor.isProjected())).toBe(true);
  await expect(page.locator('svg#canvas')).toHaveClass(/is-right-angle/);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(await drawingInsideCanvas(page)).toBe(true);
  await expect(page.locator('svg#canvas .hl-parent.hl-atom')).toHaveCount(4);
  expect(await canvasLocants(page)).toEqual([1, 2, 3, 4]);
  await expect(page.locator('#redraw-hint')).toBeHidden();

  // A bigger molecule still fits the visible canvas in the 90° view.
  await drawName(page, '5', '5', 'bis', 'empieza rama compuesta', '2', '2', 'di', 'met', 'il', 'prop', 'il', 'acaba rama',
    'non', 'ano');
  await expect(page.locator('#result-name')).toHaveText('5,5-bis(2,2-dimetilpropil)nonano');
  expect(await page.evaluate(() => window.__editor.isProjected())).toBe(true);
  expect(await drawingInsideCanvas(page)).toBe(true);

  await page.getByRole('button', { name: 'Deshacer' }).click();
  expect((await moleculeJSON(page)).atoms).toHaveLength(5);
  await expect(page.locator('#verdict')).toHaveCount(0);
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
}); // End of test 'Dibujar with the 90° view on…'

/**
 * A zigzag chain of carbons, serialised: with 28 carbons it is wider than the
 * canvas at the highest zoom «Centrar» uses, so the view centred on a short
 * molecule cannot show it whole.
 *
 * @param {number} n - Number of carbons.
 * @returns {object} moleculeToJSON() output.
 */
function longChain(n) {
  const atoms = [];
  const bonds = [];
  for (let i = 1; i <= n; i += 1) {
    atoms.push({ id: i, element: 'C', x: 100 + (i - 1) * 34.64, y: i % 2 === 0 ? 230 : 250 });
    if (i > 1) {
      bonds.push({ id: i - 1, a: i - 1, b: i, order: 1 });
    }
  }
  return { version: 1, nextAtomId: n + 1, nextBondId: n, atoms, bonds };
}

/**
 * The editor's canvas view (zoom and pan).
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<{scale: number, x: number, y: number}>} The view.
 */
function canvasView(page) {
  return page.evaluate(() => window.__editor.getView());
}

for (const rightAngle of [false, true]) {
  test(`Dibujar is one edit with its view${rightAngle ? ' (90° view)' : ''}: Deshacer brings back the long molecule in its own view, Rehacer the short one centred`, async ({ page }) => {
    const errors = await openApp(page);
    if (rightAngle) {
      await page.getByRole('button', { name: 'Con carbonos' }).click();
      await page.locator('#right-angle-button').click();
    }
    await page.evaluate((json) => window.__editor.loadMolecule(json), longChain(28));
    await page.locator('#center-button').click();
    expect(await page.evaluate(() => window.__editor.isProjected())).toBe(rightAngle);
    const long = { json: await moleculeJSON(page), view: await canvasView(page) };
    expect(await drawingInsideCanvas(page)).toBe(true);

    // «Dibujar» a short name: centred, at a higher zoom than the long chain's.
    await drawName(page, 'prop', 'ano');
    await expect(page.locator('#result-name')).toHaveText('propano');
    const short = { json: await moleculeJSON(page), view: await canvasView(page) };
    expect(short.json.atoms).toHaveLength(3);
    expect(short.view.scale).toBeGreaterThan(long.view.scale);
    expect(await drawingInsideCanvas(page)).toBe(true);

    // Deshacer: the long chain in the very view it had, whole on screen; the 90° preference kept.
    await page.getByRole('button', { name: 'Deshacer' }).click();
    expect(await moleculeJSON(page)).toEqual(long.json);
    expect(await canvasView(page)).toEqual(long.view);
    expect(await drawingInsideCanvas(page)).toBe(true);
    expect(await page.evaluate(() => window.__editor.isProjected())).toBe(rightAngle);
    await expect(page.locator('#verdict')).toHaveCount(0);

    // Rehacer: the short molecule centred again.
    await page.getByRole('button', { name: 'Rehacer' }).click();
    expect(await moleculeJSON(page)).toEqual(short.json);
    expect(await canvasView(page)).toEqual(short.view);
    expect(await drawingInsideCanvas(page)).toBe(true);

    // An ordinary edit and its undo and redo never move the view.
    await page.evaluate(() => window.__editor.zoomBy(0.8));
    const zoomed = await canvasView(page);
    await page.evaluate(() => window.__editor.setTool('single'));
    const end = await page.evaluate(() => window.__editor.atomClientPoint(1));
    await page.mouse.click(end.x, end.y);
    expect((await moleculeJSON(page)).atoms).toHaveLength(4);
    expect(await canvasView(page)).toEqual(zoomed);
    await page.getByRole('button', { name: 'Deshacer' }).click();
    expect(await moleculeJSON(page)).toEqual(short.json);
    expect(await canvasView(page)).toEqual(zoomed);
    await page.getByRole('button', { name: 'Rehacer' }).click();
    expect((await moleculeJSON(page)).atoms).toHaveLength(4);
    expect(await canvasView(page)).toEqual(zoomed);

    // Undoing the «Dibujar» edit with Ctrl+Z also restores the long chain's view.
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+z');
    expect(await moleculeJSON(page)).toEqual(long.json);
    expect(await canvasView(page)).toEqual(long.view);

    if (rightAngle) {
      // The 90° view switched off between «Dibujar» and Deshacer: the long chain, now drawn normally, is centred.
      await page.getByRole('button', { name: 'Rehacer' }).click();
      expect(await canvasView(page)).toEqual(short.view);
      await page.locator('#right-angle-button').click();
      expect(await page.evaluate(() => window.__editor.isProjected())).toBe(false);
      await page.getByRole('button', { name: 'Deshacer' }).click();
      expect(await moleculeJSON(page)).toEqual(long.json);
      expect(await drawingInsideCanvas(page)).toBe(true);
    }
    expect(errors).toEqual([]);
  }); // End of test 'Dibujar is one edit with its view…'
} // End of the loop over the 90° view off and on

test.describe('phone (375 × 667), Dibujar', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('the dialog closes, the molecule fits the canvas and the verdict shows without a sideways scroll', async ({ page }) => {
    const errors = await openApp(page);
    await drawName(page, '3', 'met', 'iliden', 'hex', 'ano');
    await expect(builder(page)).toBeHidden();
    expect((await moleculeJSON(page)).atoms).toHaveLength(7);
    expect(await drawingInsideCanvas(page)).toBe(true);
    const verdict = page.locator('#verdict');
    await verdict.scrollIntoViewIfNeeded();
    await expect(verdict).toBeInViewport();
    await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto!');
    await expect(page.locator('#result-name')).toHaveText('3-metilidenhexano');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    // Deshacer empties the canvas again and clears the verdict.
    await page.getByRole('button', { name: 'Deshacer' }).click();
    expect((await moleculeJSON(page)).atoms).toHaveLength(0);
    await expect(verdict).toHaveCount(0);
    expect(errors).toEqual([]);
  }); // End of test 'the dialog closes…'
}); // End of describe 'phone (375 × 667), Dibujar'
