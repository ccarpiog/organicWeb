/**
 * @file Results panel e2e (design.md §5, §9): the "¿Cómo se llama?" button
 * names a drawn molecule, the stepper walks through every step and changes
 * the canvas highlights, the alternatives of an isopropyl compound are
 * listed, a chemical edit clears the result while a coordinate-only move
 * keeps it, and friendly errors (ring, empty canvas) are shown.
 */

import { test, expect } from '@playwright/test';
import { parseSmiles } from '../../src/model/smiles.js';
import { moleculeToJSON } from '../../src/model/molecule.js';

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
 * Clicks on an atom of the drawing.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {number} id - Atom id.
 * @returns {Promise<void>}
 */
async function clickAtom(page, id) {
  const p = await page.evaluate((atomId) => window.__editor.atomClientPoint(atomId), id);
  await page.mouse.click(p.x, p.y);
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
 * Loads a molecule from SMILES, spreading the atoms so that none overlap.
 * The SMILES is parsed here in Node (the model modules are pure), so this
 * works on the dev server and on the single-file build alike.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} smiles - The SMILES string.
 * @returns {Promise<void>}
 */
async function loadSmiles(page, smiles) {
  const json = moleculeToJSON(parseSmiles(smiles));
  json.atoms.forEach((atom, i) => {
    atom.x = 150 + (i % 8) * 60;
    atom.y = 150 + Math.floor(i / 8) * 60 + (i % 2) * 25;
  });
  await page.evaluate((data) => window.__editor.loadMolecule(data), json);
}

/**
 * What the canvas shows: highlight marks and locant labels.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<string>} A signature of the highlights and locants.
 */
async function canvasMarks(page) {
  return page.evaluate(() => {
    const marks = [...document.querySelectorAll('svg#canvas .hl')]
      .map((n) => `${n.getAttribute('class')}:${n.dataset.atomId || ''}:${n.dataset.bondId || ''}`);
    const locants = [...document.querySelectorAll('svg#canvas .locant')].map((n) => `${n.dataset.atomId}=${n.textContent}`);
    return JSON.stringify([marks.sort(), locants.sort()]);
  });
}

test('draw 3-metilhexano, name it and walk through every step', async ({ page }) => {
  const errors = await openApp(page);
  // Hexane chain 1…6 by clicks, then a methyl on carbon 3.
  await clickCanvas(page, 0.3, 0.5);
  for (const id of [2, 3, 4, 5]) {
    await clickAtom(page, id);
  }
  await clickAtom(page, 3);
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().atoms.length)).toBe(7);

  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('3-metilhexano');
  await expect(page.locator('#result-name .part-locant')).toHaveText('3');
  await expect(page.locator('#alternatives')).toHaveCount(0);

  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  await expect(stepper).toBeVisible();
  const dots = stepper.locator('.step-dot');
  const total = await dots.count();
  expect(total).toBeGreaterThanOrEqual(5);
  const previous = stepper.getByRole('button', { name: 'Anterior' });
  const next = stepper.getByRole('button', { name: 'Siguiente' });
  await expect(previous).toBeDisabled();

  const titles = [];
  const marks = [];
  for (let i = 0; i < total; i += 1) {
    await expect(stepper.locator('.step-count')).toHaveText(`Paso ${i + 1} de ${total}`);
    await expect(dots.nth(i)).toHaveAttribute('aria-current', 'step');
    titles.push(await stepper.locator('.step-title').textContent());
    marks.push(await canvasMarks(page));
    expect(await page.locator('svg#canvas .hl').count()).toBeGreaterThan(0);
    if (i < total - 1) {
      await next.click();
    }
  }
  await expect(next).toBeDisabled();
  expect(titles[0]).toBe('Cuenta los carbonos');
  expect(titles).toContain('Busca la cadena más larga');
  expect(titles).toContain('Numera la cadena');
  expect(titles).toContain('Nombra los sustituyentes');
  expect(titles[total - 1]).toBe('Monta el nombre');
  for (let i = 1; i < total; i += 1) {
    expect(marks[i], `highlights change between steps ${i} and ${i + 1}`).not.toBe(marks[i - 1]);
  }
  await expect(stepper.locator('.step-content')).toContainText('El nombre completo es «3-metilhexano».');
  await expect(stepper.locator('.legend .part-stem')).toHaveText('hex');

  // Numbering: a side-by-side table and options that relabel the canvas.
  await dots.nth(titles.indexOf('Numera la cadena')).click();
  await expect(stepper.locator('table.compare .diff').first()).toBeVisible();
  const before = await canvasMarks(page);
  await stepper.getByRole('button', { name: 'Opción B' }).click();
  await expect(stepper.getByRole('button', { name: 'Opción B' })).toHaveAttribute('aria-pressed', 'true');
  expect(await canvasMarks(page)).not.toBe(before);

  await previous.click();
  await expect(stepper.locator('.step-count')).toHaveText(`Paso ${titles.indexOf('Numera la cadena')} de ${total}`);
  expect(errors).toEqual([]);
});

test('5-isopropilnonano lists both alternative names with their labels', async ({ page }) => {
  await openApp(page);
  await loadSmiles(page, 'CCCCC(C(C)C)CCCC');
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('5-isopropilnonano');
  const block = page.getByRole('region', { name: 'Otras formas válidas' });
  await expect(block).toBeVisible();
  const items = block.locator('.alternative');
  await expect(items).toHaveCount(2);
  await expect(items.nth(0).locator('.alternative-name')).toHaveText('5-(propan-2-il)nonano');
  await expect(items.nth(0).locator('.alternative-label')).toHaveText('nombre preferido por la IUPAC (2013)');
  await expect(items.nth(1).locator('.alternative-name')).toHaveText('5-(1-metiletil)nonano');
  await expect(items.nth(1).locator('.alternative-label')).toHaveText('forma sistemática clásica');
});

test('a chemical edit clears the result; a coordinate-only move keeps it', async ({ page }) => {
  await openApp(page);
  await loadSmiles(page, 'CC(CC)CCC');
  const name = page.locator('#result-name');
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(name).toHaveText('3-metilhexano');
  await expect(page.locator('svg#canvas .hl').first()).toBeVisible();

  // Mover: drag one atom; only coordinates change.
  await page.getByRole('button', { name: 'Mover' }).click();
  const p = await page.evaluate(() => window.__editor.atomClientPoint(1));
  await drag(page, p, { x: p.x + 20, y: p.y + 30 });
  await expect(name).toHaveText('3-metilhexano');
  await expect(page.locator('svg#canvas .hl').first()).toBeVisible();

  // Enlace doble on a bond: a chemical edit.
  await page.getByRole('button', { name: 'Enlace doble' }).click();
  const b = await page.evaluate(() => window.__editor.bondClientPoint(1));
  await page.mouse.click(b.x, b.y);
  await expect(name).toHaveCount(0);
  await expect(page.locator('.results-hint')).toBeVisible();
  await expect(page.locator('svg#canvas .hl')).toHaveCount(0);
  await expect(page.locator('svg#canvas .locant')).toHaveCount(0);
});

test('an empty canvas asks to draw; a ring with a side chain is named (I-26)', async ({ page }) => {
  await openApp(page);
  const button = page.getByRole('button', { name: '¿Cómo se llama?' });
  await button.click();
  await expect(page.getByRole('alert')).toContainText('Dibuja primero una molécula.');

  // Three carbons by clicks, then close the ring by dragging from atom 3 to atom 1.
  await clickCanvas(page, 0.45, 0.5);
  await clickAtom(page, 2);
  const from = await page.evaluate(() => window.__editor.atomClientPoint(3));
  const to = await page.evaluate(() => window.__editor.atomClientPoint(1));
  await drag(page, from, to);
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON().bonds.length)).toBe(3);
  // A side chain on the ring: the ring is the parent, the chain a substituent.
  await clickAtom(page, 2);
  await button.click();
  await expect(page.locator('#result-name')).toHaveText('metilciclopropano');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
