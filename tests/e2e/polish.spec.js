/**
 * @file Polish e2e (design.md §9): the Ayuda dialog, keyboard access with
 * visible focus, accessible names on every control, the screen-reader live
 * region, the phone layout (no horizontal scroll, toolbar at the bottom) and
 * drawing with touch on a tablet.
 */

import { test, expect } from '@playwright/test';

/**
 * Opens the app and waits until it is ready.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<void>}
 */
async function openApp(page) {
  await page.goto('index.html');
  await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true');
}

/**
 * Chooses an example from the Ejemplos menu.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} label - The menu item text.
 * @returns {Promise<void>}
 */
async function loadExample(page, label) {
  await page.getByRole('button', { name: 'Ejemplos' }).click();
  await page.getByRole('menuitem', { name: label, exact: true }).click();
}

/**
 * Horizontal overflow of the page: how many pixels the document is wider
 * than the window (0 when there is no horizontal scroll).
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<number>} The overflow in CSS pixels.
 */
async function horizontalOverflow(page) {
  return page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)
    - document.documentElement.clientWidth);
}

test('Ayuda opens an in-page dialog with illustrations and the glossary; Esc closes it', async ({ page }) => {
  await openApp(page);
  const help = page.getByRole('button', { name: 'Ayuda' });
  await help.click();
  const dialog = page.getByRole('dialog', { name: 'Cómo se usa' });
  await expect(dialog).toBeVisible();
  expect(await dialog.locator('svg.help-figure').count()).toBeGreaterThanOrEqual(4);
  // 13 terms since I-36 added «Amina».
  await expect(dialog.locator('.help-glossary dt')).toHaveCount(13);
  await expect(dialog.locator('.help-glossary')).toContainText('Amina');
  await expect(dialog.locator('.help-glossary')).toContainText('Cadena principal');
  await expect(dialog.locator('.help-glossary')).toContainText('Anillo');
  await expect(dialog.locator('.help-glossary')).toContainText('Grupo funcional');
  // v2 content (I-41c): the named families with rings, what is out of scope,
  // the ring tool, the heteroatom palette, the 90° view and the CHO/COOH toggle.
  const families = dialog.locator('#help-families li');
  await expect(families).toHaveCount(10);
  for (const phrase of ['Derivados halogenados', 'Alcoholes', 'Aldehídos', 'cetonas', 'Ácidos carboxílicos', 'Éteres',
    'Ésteres', 'Aminas', 'Amidas', 'Nitrilos', 'ciclohexanol', 'ácido benzoico', 'benzonitrilo']) {
    await expect(dialog.locator('#help-families')).toContainText(phrase);
  }
  const outOfScope = dialog.locator('#help-out-of-scope');
  for (const phrase of ['estereoquímica', 'cargas', 'heterociclos', 'fusionados', 'benceno con dos o más sustituyentes',
    'imidas']) {
    await expect(outOfScope).toContainText(phrase);
  }
  for (const phrase of ['«Anillos»', '«Benceno»', 'O (oxígeno), N (nitrógeno)', '«Ángulos rectos (90°)»',
    'también con oxígeno, nitrógeno y halógenos', '«Abreviar CHO y COOH»']) {
    await expect(dialog).toContainText(phrase);
  }
  // The focus starts on the heading, at the top of the dialog.
  await expect(dialog.getByRole('heading', { name: 'Cómo se usa' })).toBeFocused();
  // Editor shortcuts are off while the dialog is open.
  await page.keyboard.press('c');
  expect(await page.evaluate(() => window.__editor.getTool())).toBe('single');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(help).toBeFocused();
  // Entendido closes it too.
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Entendido' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Entendido' }).click();
  await expect(dialog).toBeHidden();
});

test('every control has an accessible name and is reachable with Tab, with a visible focus ring', async ({ page }) => {
  await openApp(page);
  await loadExample(page, 'Alcano ramificado');
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();

  // Accessible names: icon-only toolbar buttons carry aria-label.
  const unnamed = await page.evaluate(() => [...document.querySelectorAll('button')]
    .filter((b) => !b.closest('dialog') && b.offsetParent !== null)
    .filter((b) => !(b.getAttribute('aria-label') || b.textContent).trim())
    .map((b) => b.outerHTML.slice(0, 80)));
  expect(unnamed).toEqual([]);
  const toolLabels = await page.locator('#toolbar button').evaluateAll((buttons) => buttons.map((b) => b.getAttribute('aria-label')));
  expect(toolLabels.every(Boolean)).toBe(true);

  // Tab through the page and record every focused control.
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  const reached = new Set();
  const outlines = [];
  for (let i = 0; i < 60; i += 1) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) {
        return null;
      }
      const style = getComputedStyle(el);
      return {
        key: el.id || el.getAttribute('aria-label') || el.textContent.trim(),
        outline: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2,
      };
    });
    if (info) {
      reached.add(info.key);
      outlines.push(info.outline);
    }
  } // End of the Tab loop
  for (const name of ['examples-button', 'help-button', 'Carbono', 'Enlace simple', 'Cambiar enlace', 'Mover', 'Deshacer',
    'Ordenar dibujo', 'name-button', 'center-button', 'Ocultar el paso a paso', 'Siguiente']) {
    expect(reached, name).toContain(name);
  }
  expect(outlines.every(Boolean)).toBe(true);
});

test('the name and the current step are announced through the live region', async ({ page }) => {
  await openApp(page);
  const announcer = page.locator('#announcer');
  await expect(announcer).toHaveAttribute('aria-live', 'polite');
  await loadExample(page, 'Alqueno (un enlace doble)');
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(announcer).toHaveText('Se llama: hex-2-eno');
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  await expect(announcer).toContainText('Paso 1 de');
  await expect(announcer).toContainText('Cuenta los carbonos.');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(announcer).toContainText('Paso 2 de');
  // A chemical edit clears the result and the announcement.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(announcer).toHaveText('');
});

test('a glossary term shows its definition on focus or hover; Esc hides it until a fresh interaction', async ({ page }) => {
  await openApp(page);
  await loadExample(page, 'Alcano ramificado');
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  let term = stepper.locator('.term').first();
  for (let i = 0; i < 8 && (await term.count()) === 0; i += 1) {
    await stepper.getByRole('button', { name: 'Siguiente' }).click();
    term = stepper.locator('.term').first();
  }
  const tipShown = () => term.evaluate((el) => {
    const after = getComputedStyle(el, '::after');
    return after.display !== 'none' && after.content !== 'none' && after.content.length > 10;
  });
  expect(await tipShown()).toBe(false);
  // Focus shows the tooltip; Esc hides it and keeps the focus on the term.
  await term.focus();
  expect(await tipShown()).toBe(true);
  expect(await term.getAttribute('aria-description')).toBeTruthy();
  await page.keyboard.press('Escape');
  expect(await tipShown()).toBe(false);
  await expect(term).toBeFocused();
  // Hovered and focused: Esc hides it although the pointer is still over the term.
  await term.hover();
  await term.evaluate((el) => el.blur());
  await term.focus();
  expect(await tipShown()).toBe(true);
  await page.keyboard.press('Escape');
  expect(await tipShown()).toBe(false);
  // Hovered only (focus elsewhere): Esc hides it too; leaving and coming back shows it again.
  await term.evaluate((el) => el.blur());
  await page.mouse.move(0, 0);
  await term.hover();
  expect(await tipShown()).toBe(true);
  await term.focus();
  await page.keyboard.press('Escape');
  await term.evaluate((el) => el.blur());
  expect(await tipShown()).toBe(false);
  await page.mouse.move(0, 0);
  await term.hover();
  expect(await tipShown()).toBe(true);
});

test.describe('phone width (375 px)', () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test('no horizontal scroll, and the toolbar sits at the bottom of the screen', async ({ page }) => {
    await openApp(page);
    expect(await horizontalOverflow(page)).toBe(0);
    const toolbar = await page.locator('#toolbar').boundingBox();
    const canvas = await page.locator('.canvas-area').boundingBox();
    expect(toolbar.y).toBeGreaterThan(canvas.y);
    expect(Math.abs(toolbar.y + toolbar.height - 740)).toBeLessThanOrEqual(1);
    // Every tool is on screen.
    for (const button of await page.locator('#toolbar button').all()) {
      const b = await button.boundingBox();
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(375);
    }

    // With a result, the stepper open (comparison tables included), the
    // glossary tooltips shown and the Ayuda dialog open.
    for (const label of ['Alcano ramificado', 'Con un grupo isopropilo', 'Enlace doble y triple a la vez']) {
      await loadExample(page, label);
      await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
      await page.getByRole('button', { name: 'Ver paso a paso' }).click();
      const next = page.getByRole('button', { name: 'Siguiente' });
      for (;;) {
        expect(await horizontalOverflow(page), label).toBe(0);
        for (const term of await page.locator('#stepper .term').all()) {
          await term.focus();
          expect(await horizontalOverflow(page), `${label}: tooltip`).toBe(0);
        }
        if (await next.isDisabled()) {
          break;
        }
        await next.click();
      } // End of the loop over the steps
    } // End of the loop over the examples
    // The toolbar still ends at the bottom of the screen after scrolling.
    await page.mouse.wheel(0, 400);
    await expect.poll(async () => {
      const box = await page.locator('#toolbar').boundingBox();
      return Math.round(box.y + box.height);
    }).toBe(740);

    await page.getByRole('button', { name: 'Ayuda' }).click();
    await expect(page.getByRole('dialog', { name: 'Cómo se usa' })).toBeVisible();
    expect(await horizontalOverflow(page)).toBe(0);
    const dialog = await page.locator('#help-dialog').boundingBox();
    expect(dialog.x).toBeGreaterThanOrEqual(0);
    expect(dialog.x + dialog.width).toBeLessThanOrEqual(375);
    // The content is taller than the dialog, and the initial focus is inside its visible area.
    expect(await page.locator('#help-dialog').evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      const box = document.getElementById('help-dialog').getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return { inDialog: Boolean(el.closest('#help-dialog')), visible: r.top >= box.top && r.bottom <= box.bottom
        && r.top >= 0 && r.bottom <= window.innerHeight };
    });
    expect(focused).toEqual({ inDialog: true, visible: true });
  });
});

test.describe('tablet with touch', () => {
  test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true });

  test('taps draw carbons and choose tools', async ({ page }) => {
    await openApp(page);
    const box = await page.locator('svg#canvas').boundingBox();
    await page.touchscreen.tap(box.x + box.width * 0.3, box.y + box.height * 0.5);
    expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.length)).toBe(2);
    const p = await page.evaluate(() => window.__editor.atomClientPoint(2));
    await page.touchscreen.tap(p.x, p.y);
    expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.length)).toBe(3);
    await page.getByRole('button', { name: 'Enlace doble' }).tap();
    expect(await page.evaluate(() => window.__editor.getTool())).toBe('double');
    const b = await page.evaluate(() => window.__editor.bondClientPoint(1));
    await page.touchscreen.tap(b.x, b.y);
    expect(await page.evaluate(() => window.__editor.getMoleculeJSON().bonds[0].order)).toBe(2);
    await page.getByRole('button', { name: '¿Cómo se llama?' }).tap();
    await expect(page.locator('#result-name')).toHaveText('propeno');
  });
});
