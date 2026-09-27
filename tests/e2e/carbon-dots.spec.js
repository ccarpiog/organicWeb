/**
 * @file Carbon dots e2e (design.md §6.3): in Esqueleto mode every carbon —
 * chain ends, a lone carbon, and the vertices of a nearly collinear chain —
 * carries a visible filled dot, also after "Ordenar dibujo" and under the
 * stepper highlight, hover and selection; Con carbonos shows none. Clicking
 * the CH₄ label of a lone carbon acts on that carbon in both modes.
 */

import { test, expect } from '@playwright/test';

/**
 * The 4-carbon chain of the user report: C1→C2 down-right, C2→C3 almost
 * flat, C3→C4 up-right, so the C2 and C3 bends are barely visible.
 */
const FLAT_BUTANE = {
  version: 1,
  nextAtomId: 5,
  nextBondId: 4,
  atoms: [
    { id: 1, element: 'C', x: 260, y: 230 },
    { id: 2, element: 'C', x: 298, y: 244 },
    { id: 3, element: 'C', x: 338, y: 246 },
    { id: 4, element: 'C', x: 376, y: 232 },
  ],
  bonds: [{ id: 1, a: 1, b: 2, order: 1 }, { id: 2, a: 2, b: 3, order: 1 }, { id: 3, a: 3, b: 4, order: 1 }],
};

/** Methane: one lone carbon. */
const METHANE = {
  version: 1,
  nextAtomId: 2,
  nextBondId: 1,
  atoms: [{ id: 1, element: 'C', x: 300, y: 250 }],
  bonds: [],
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
 * Checks that the carbon dots and the atoms match one to one: each dot sits
 * on its atom, is painted (opaque fill, non-empty box) and is drawn after the
 * highlight and selection layers, so nothing covers it.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<void>}
 */
async function expectOneVisibleDotPerCarbon(page) {
  const report = await page.evaluate(() => {
    const atoms = window.__editor.getMoleculeJSON().atoms;
    const dots = [...document.querySelectorAll('svg#canvas .carbon-dot')];
    const layerBefore = (name, dot) => {
      const layer = document.querySelector(`svg#canvas .mol-${name}`);
      return Boolean(layer.compareDocumentPosition(dot) & Node.DOCUMENT_POSITION_FOLLOWING);
    };
    return {
      atomIds: atoms.map((a) => a.id).sort((p, q) => p - q),
      dotIds: dots.map((d) => Number(d.dataset.atomId)).sort((p, q) => p - q),
      misplaced: dots.filter((d) => {
        const atom = atoms.find((a) => a.id === Number(d.dataset.atomId));
        return !atom || Math.abs(Number(d.getAttribute('cx')) - atom.x) > 1e-6 || Math.abs(Number(d.getAttribute('cy')) - atom.y) > 1e-6;
      }).length,
      invisible: dots.filter((d) => {
        const box = d.getBoundingClientRect();
        const fill = getComputedStyle(d).fill;
        return box.width < 3 || box.height < 3 || fill === 'none' || fill.endsWith(', 0)') || fill === 'transparent';
      }).length,
      covered: dots.filter((d) => !layerBefore('highlight', d) || !layerBefore('selection', d)).length,
    };
  });
  expect(report.dotIds).toEqual(report.atomIds);
  expect(report.misplaced).toBe(0);
  expect(report.invisible).toBe(0);
  expect(report.covered).toBe(0);
} // End of function expectOneVisibleDotPerCarbon()

test('Esqueleto dots every carbon of a nearly collinear chain; Con carbonos shows none', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate((json) => window.__editor.loadMolecule(json), FLAT_BUTANE);
  await expect(page.getByRole('button', { name: 'Esqueleto' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('svg#canvas .carbon-dot')).toHaveCount(4);
  await expectOneVisibleDotPerCarbon(page);

  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await expect(page.locator('svg#canvas .carbon-dot')).toHaveCount(0);
  await expect(page.locator('svg#canvas .atom-label')).toHaveText(['CH₃', 'CH₂', 'CH₂', 'CH₃']);

  await page.getByRole('button', { name: 'Esqueleto' }).click();
  await expect(page.locator('svg#canvas .carbon-dot')).toHaveCount(4);
  await expect(page.locator('svg#canvas .atom-label')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a lone carbon gets a dot and its CH₄ label below it; Con carbonos shows only the label', async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate((json) => window.__editor.loadMolecule(json), METHANE);
  await expect(page.locator('svg#canvas .carbon-dot')).toHaveCount(1);
  await expectOneVisibleDotPerCarbon(page);
  const label = page.locator('svg#canvas .atom-label');
  await expect(label).toHaveText('CH₄');
  expect(Number(await label.getAttribute('y'))).toBeGreaterThan(METHANE.atoms[0].y);

  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await expect(page.locator('svg#canvas .carbon-dot')).toHaveCount(0);
  await expect(label).toHaveText('CH₄');
  expect(Number(await label.getAttribute('y'))).toBe(METHANE.atoms[0].y);
  expect(errors).toEqual([]);
});

test('dots stay on every carbon after Ordenar dibujo, under the highlight, hover and selection', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: 'Ejemplos' }).click();
  await page.getByRole('menuitem', { name: 'Rama con un enlace doble', exact: true }).click();
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('4-etenilheptano');
  await page.locator('#toolbar [data-action="arrange"]').click();
  await expect.poll(() => page.evaluate(() => window.__editor.isAnimating())).toBe(false);
  await expect(page.locator('svg#canvas .hl-parent.hl-atom')).toHaveCount(7);
  await expect(page.locator('svg#canvas .carbon-dot')).toHaveCount(9);
  await expectOneVisibleDotPerCarbon(page);

  // Hover an atom: its hit disc turns on and the dot is still there.
  const p = await page.evaluate(() => window.__editor.atomClientPoint(1));
  await page.mouse.move(p.x, p.y);
  await expect(page.locator('svg#canvas .atom.is-hover')).toHaveCount(1);
  await expect(page.locator('svg#canvas .carbon-dot')).toHaveCount(9);

  // Select with Mover: selection discs appear, dots stay on top.
  await page.evaluate(() => window.__editor.setTool('move'));
  await page.mouse.click(p.x, p.y);
  await expect(page.locator('svg#canvas .sel-atom')).not.toHaveCount(0);
  await expectOneVisibleDotPerCarbon(page);
  expect(errors).toEqual([]);
}); // End of test 'dots stay on every carbon after Ordenar dibujo…'

test('the Enlace simple chain preview dots its future carbons in Esqueleto', async ({ page }) => {
  const errors = await openApp(page);
  const box = await page.locator('svg#canvas').boundingBox();
  await page.evaluate(() => window.__editor.setTool('single'));
  const start = { x: box.x + box.width * 0.3, y: box.y + box.height * 0.5 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 150, start.y, { steps: 10 });
  const counter = await page.locator('svg#canvas .chain-counter').textContent();
  const count = Number.parseInt(counter, 10);
  // Every future carbon but the last one (which has the end marker) is dotted.
  await expect(page.locator('svg#canvas .preview-dot')).toHaveCount(count - 1);
  await expect(page.locator('svg#canvas .preview-end')).toHaveCount(1);
  await page.mouse.up();
  await expect(page.locator('svg#canvas .preview-dot')).toHaveCount(0);
  await expect(page.locator('svg#canvas .carbon-dot')).toHaveCount(count);
  await expectOneVisibleDotPerCarbon(page);
  expect(errors).toEqual([]);
}); // End of test 'the Enlace simple chain preview dots its future carbons…'

/**
 * Clicks the centre of the rendered CH₄ label.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<void>}
 */
async function clickLoneLabel(page) {
  const box = await page.locator('svg#canvas .atom-label').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

for (const mode of ['Esqueleto', 'Con carbonos']) {
  test(`clicking the CH₄ label acts on methane (${mode})`, async ({ page }) => {
    const errors = await openApp(page);
    await page.getByRole('button', { name: mode }).click();
    await page.evaluate((json) => window.__editor.loadMolecule(json), METHANE);

    // Enlace simple on the label grows methane into ethane: no new lone carbon on empty space.
    await page.evaluate(() => window.__editor.setTool('single'));
    await clickLoneLabel(page);
    const grown = await page.evaluate(() => window.__editor.getMoleculeJSON());
    expect(grown.atoms.map((a) => a.id)).toEqual([1, 2]);
    expect(grown.bonds.map((b) => `${b.a}-${b.b}:${b.order}`)).toEqual(['1-2:1']);

    // Borrar on the label deletes methane itself.
    await page.evaluate((json) => window.__editor.loadMolecule(json), METHANE);
    await page.evaluate(() => window.__editor.setTool('erase'));
    await clickLoneLabel(page);
    expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.length)).toBe(0);
    expect(errors).toEqual([]);
  });
}
