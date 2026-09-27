/**
 * @file Anillos tool e2e (design.md §6.1, §6.3, §13 I-27a): the ring-size
 * buttons, a free ring on the canvas named ciclo…ano, a ring hung from an
 * atom (one undo step removes it), the `a` shortcut cycling the size, the
 * hover preview, and the inner stroke of a ring double bond. Runs on the dev
 * server and on dist/index.html.
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
 * Clicks on the canvas at a fraction of its size.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {number} fx - Horizontal fraction (0–1).
 * @param {number} fy - Vertical fraction (0–1).
 * @returns {Promise<void>}
 */
async function clickCanvas(page, fx, fy) {
  const box = await page.locator('svg#canvas').boundingBox();
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
}

test('the ring buttons draw a free ring, named ciclo…ano', async ({ page }) => {
  const errors = await openApp(page);
  const group = page.getByRole('group', { name: 'Anillos' });
  await expect(group.getByRole('button')).toHaveCount(6);
  const five = group.getByRole('button', { name: 'Anillo de 5 carbonos', exact: true });
  await expect(five).toHaveAttribute('title', 'Anillo de 5 carbonos (A)');
  await five.click();
  await expect(five).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => [window.__editor.getTool(), window.__editor.getRingSize()])).toEqual(['ring', 5]);
  // Hovering shows the ring about to be placed.
  const box = await page.locator('svg#canvas').boundingBox();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await expect(page.locator('#canvas .preview-ring')).toHaveCount(5);
  await clickCanvas(page, 0.4, 0.5);
  const mol = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(mol.atoms).toHaveLength(5);
  expect(mol.bonds).toHaveLength(5);
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('ciclopentano');
  expect(errors).toEqual([]);
});

test('a ring clicked on an atom hangs from it; undo removes it in one step', async ({ page }) => {
  const errors = await openApp(page);
  // Enlace simple (the default tool) on empty space: ethane.
  await clickCanvas(page, 0.3, 0.5);
  await expect.poll(() => page.evaluate(() => window.__editor.getMoleculeJSON().atoms.length)).toBe(2);
  await page.getByRole('group', { name: 'Anillos' }).getByRole('button', { name: 'Anillo de 6 carbonos', exact: true }).click();
  const p = await page.evaluate(() => window.__editor.atomClientPoint(2));
  await page.mouse.click(p.x, p.y);
  const mol = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(mol.atoms).toHaveLength(8);
  expect(mol.bonds).toHaveLength(8);
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('etilciclohexano');
  await page.getByRole('button', { name: 'Deshacer' }).click();
  const back = await page.evaluate(() => window.__editor.getMoleculeJSON());
  expect(back.atoms).toHaveLength(2);
  expect(back.bonds).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('the a key picks Anillos, then cycles the ring size', async ({ page }) => {
  await openApp(page);
  const group = page.getByRole('group', { name: 'Anillos' });
  await page.keyboard.press('a');
  expect(await page.evaluate(() => [window.__editor.getTool(), window.__editor.getRingSize()])).toEqual(['ring', 6]);
  await expect(group.locator('[aria-pressed="true"]')).toHaveAttribute('data-ring-size', '6');
  await page.keyboard.press('a');
  await page.keyboard.press('a');
  expect(await page.evaluate(() => window.__editor.getRingSize())).toBe(8);
  await page.keyboard.press('a');
  expect(await page.evaluate(() => window.__editor.getRingSize())).toBe(3);
  await expect(group.locator('[aria-pressed="true"]')).toHaveAttribute('data-ring-size', '3');
  await page.keyboard.press('1');
  await expect(group.locator('[aria-pressed="true"]')).toHaveCount(0);
});

test('a ring double bond draws its second stroke inside the ring', async ({ page }) => {
  await openApp(page);
  await page.getByRole('group', { name: 'Anillos' }).getByRole('button', { name: 'Anillo de 6 carbonos', exact: true }).click();
  await clickCanvas(page, 0.5, 0.5);
  await page.getByRole('button', { name: 'Enlace doble', exact: true }).click();
  const q = await page.evaluate(() => window.__editor.bondClientPoint(1));
  await page.mouse.click(q.x, q.y);
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('ciclohexeno');
  const strokes = await page.evaluate(() => [...document.querySelectorAll('#canvas .bond[data-bond-id="1"] .bond-line')]
    .map((l) => ({ x: (Number(l.getAttribute('x1')) + Number(l.getAttribute('x2'))) / 2,
      y: (Number(l.getAttribute('y1')) + Number(l.getAttribute('y2'))) / 2 })));
  expect(strokes).toHaveLength(2);
  const atoms = (await page.evaluate(() => window.__editor.getMoleculeJSON())).atoms;
  const centre = { x: atoms.reduce((s, a) => s + a.x, 0) / 6, y: atoms.reduce((s, a) => s + a.y, 0) / 6 };
  const d = (s) => Math.hypot(s.x - centre.x, s.y - centre.y);
  expect(d(strokes[1])).toBeLessThan(d(strokes[0]));
});
