/**
 * @file Element palette e2e (design.md §6.1, §6.3, §13 I-23): placing O, N
 * and Cl with the palette buttons, C=O with the double-bond tool, changing an
 * element and undoing it, the Spanish valence refusal, the keyboard
 * shortcuts, heteroatom labels (with their implicit H) that act as the atom
 * when clicked, the "not nameable yet" result, and the 90° view and
 * "Ordenar dibujo" falling back without errors. Runs on the dev server and on
 * dist/index.html.
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
 * Elements of the current molecule, by atom id order.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<string[]>} The element symbols.
 */
async function elements(page) {
  return page.evaluate(() => window.__editor.getMoleculeJSON().atoms.map((a) => a.element));
}

/**
 * Bond orders of the current molecule, by bond id order.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @returns {Promise<number[]>} The orders.
 */
async function orders(page) {
  return page.evaluate(() => window.__editor.getMoleculeJSON().bonds.map((b) => b.order));
}

/**
 * Clicks on an atom of the drawing (its centre, as drawn).
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
 * Clicks on the midpoint of a bond.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {number} id - Bond id.
 * @returns {Promise<void>}
 */
async function clickBond(page, id) {
  const p = await page.evaluate((bondId) => window.__editor.bondClientPoint(bondId), id);
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
 * Text of the label drawn on an atom.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {number} id - Atom id.
 * @returns {import('@playwright/test').Locator} The label.
 */
function label(page, id) {
  return page.locator(`svg#canvas .atom-label[data-atom-id="${id}"]`);
}

test('the palette buttons place O, N and Cl, labelled with their hydrogens', async ({ page }) => {
  const errors = await openApp(page);
  const palette = page.getByRole('group', { name: 'Elementos' });
  await expect(palette.getByRole('button')).toHaveCount(7);
  for (const [name, fx] of [['Oxígeno', 0.2], ['Nitrógeno', 0.4], ['Cloro', 0.6]]) {
    const button = palette.getByRole('button', { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await clickCanvas(page, fx, 0.5);
  }
  expect(await elements(page)).toEqual(['O', 'N', 'Cl']);
  await expect(label(page, 1)).toHaveText('H₂O');
  await expect(label(page, 2)).toHaveText('NH₃');
  await expect(label(page, 3)).toHaveText('HCl');
  // Heteroatoms get no carbon dot in Esqueleto.
  await expect(page.locator('svg#canvas .carbon-dot')).toHaveCount(0);

  // A bond from the N with the Cloro tool: N-Cl, labels follow the hydrogens.
  const from = await page.evaluate(() => window.__editor.atomClientPoint(2));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 30, from.y - 30, { steps: 4 });
  await page.mouse.move(from.x + 60, from.y, { steps: 4 });
  await page.mouse.up();
  expect(await elements(page)).toEqual(['O', 'N', 'Cl', 'Cl']);
  await expect(label(page, 2)).toHaveText('NH₂');
  await expect(label(page, 4)).toHaveText('Cl');
  expect(errors).toEqual([]);
});

test('C=O with the double-bond tool, element change and undo, in both display modes', async ({ page }) => {
  const errors = await openApp(page);
  const tools = page.getByRole('navigation', { name: 'Herramientas de dibujo' });
  // Enlace simple on empty space: two carbons; Oxígeno on the second changes it.
  await clickCanvas(page, 0.4, 0.5);
  await tools.getByRole('button', { name: 'Oxígeno' }).click();
  await clickAtom(page, 2);
  expect(await elements(page)).toEqual(['C', 'O']);
  await expect(label(page, 2)).toHaveText('OH');
  await expect(label(page, 1)).toHaveCount(0); // The carbon keeps the skeletal drawing.
  await expect(page.locator('svg#canvas .carbon-dot')).toHaveCount(1);

  // Enlace doble on the C-O bond: C=O (the oxygen loses its H).
  await tools.getByRole('button', { name: 'Enlace doble' }).click();
  await clickBond(page, 1);
  expect(await orders(page)).toEqual([2]);
  await expect(label(page, 2)).toHaveText('O');

  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await expect(label(page, 1)).toHaveText('CH₂');
  await expect(label(page, 2)).toHaveText('O');
  await page.getByRole('button', { name: 'Esqueleto' }).click();

  // Undo: one step per gesture (the double bond, then the element change).
  await tools.getByRole('button', { name: 'Deshacer' }).click();
  expect(await orders(page)).toEqual([1]);
  expect(await elements(page)).toEqual(['C', 'O']);
  await tools.getByRole('button', { name: 'Deshacer' }).click();
  expect(await elements(page)).toEqual(['C', 'C']);
  await expect(label(page, 2)).toHaveCount(0);
  await tools.getByRole('button', { name: 'Rehacer' }).click();
  expect(await elements(page)).toEqual(['C', 'O']);
  expect(errors).toEqual([]);
});

test('a change that exceeds the new valence is refused with a Spanish toast', async ({ page }) => {
  await openApp(page);
  // Propane: Cloro on the middle carbon (2 bonds) does not fit.
  await clickCanvas(page, 0.4, 0.5);
  await clickAtom(page, 2);
  const tools = page.getByRole('navigation', { name: 'Herramientas de dibujo' });
  await tools.getByRole('button', { name: 'Cloro' }).click();
  await clickAtom(page, 2);
  const toast = page.locator('#toast');
  await expect(toast).toBeVisible();
  await expect(toast).toHaveText('No se puede cambiar a cloro: este átomo tiene 2 enlaces y el cloro solo admite 1.');
  expect(await elements(page)).toEqual(['C', 'C', 'C']);
  // A bond tool on a full oxygen: element-specific refusal, the O stays an O.
  await tools.getByRole('button', { name: 'Oxígeno' }).click();
  await clickAtom(page, 2);
  await tools.getByRole('button', { name: 'Enlace simple' }).click();
  await clickAtom(page, 2);
  await expect(toast).toHaveText('Este oxígeno ya tiene 2 enlaces.');
  expect(await elements(page)).toEqual(['C', 'O', 'C']);
});

test('keyboard shortcuts pick the elements, and the palette shows the choice', async ({ page }) => {
  await openApp(page);
  const palette = page.getByRole('group', { name: 'Elementos' });
  const cases = [['o', 'O', 'Oxígeno'], ['n', 'N', 'Nitrógeno'], ['f', 'F', 'Flúor'], ['l', 'Cl', 'Cloro'],
    ['b', 'Br', 'Bromo'], ['i', 'I', 'Yodo'], ['c', 'C', 'Carbono']];
  for (const [key, element, name] of cases) {
    await page.keyboard.press(key);
    expect(await page.evaluate(() => [window.__editor.getTool(), window.__editor.getElement()])).toEqual(['carbon', element]);
    await expect(palette.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(palette.locator('[aria-pressed="true"]')).toHaveCount(1);
  }
  await page.keyboard.press('1');
  await expect(palette.locator('[aria-pressed="true"]')).toHaveCount(0);
  // A key then a click: `n` then a click on empty space places a nitrogen.
  await page.keyboard.press('n');
  await clickCanvas(page, 0.5, 0.5);
  expect(await elements(page)).toEqual(['N']);
  await expect(palette.getByRole('button', { name: 'Cloro', exact: true })).toHaveAttribute('aria-keyshortcuts', 'l');
});

test('a click on a heteroatom label acts on the atom', async ({ page }) => {
  await openApp(page);
  await clickCanvas(page, 0.4, 0.5);
  await page.keyboard.press('n');
  await clickAtom(page, 2);
  await expect(label(page, 2)).toHaveText('NH₂');
  // Click at the lower right of the "NH₂" label, outside the atom's hit
  // circle (ATOM_HIT_RADIUS 12) but inside the label's hit box (heteroLabelBox(): ±16 × ±9.5 for NH₂).
  const point = await page.evaluate(() => {
    const atom = window.__editor.getMoleculeJSON().atoms[1];
    return window.__editor.modelToClient({ x: atom.x + 15, y: atom.y + 8 });
  });
  expect(await page.evaluate((p) => {
    const hit = document.elementFromPoint(p.x, p.y);
    return Boolean(hit) && hit.closest('svg#canvas') !== null;
  }, point)).toBe(true);
  await page.keyboard.press('l');
  await page.mouse.click(point.x, point.y);
  expect(await elements(page)).toEqual(['C', 'Cl']);
});

/**
 * Loads two bonded atoms 30 drawing units apart on a horizontal line.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} first - Element of atom 1.
 * @param {string} second - Element of atom 2.
 * @returns {Promise<void>}
 */
async function loadClosePair(page, first, second) {
  await page.evaluate(([a, b]) => window.__editor.loadMolecule({
    version: 1,
    nextAtomId: 3,
    nextBondId: 2,
    atoms: [{ id: 1, element: a, x: 300, y: 200 }, { id: 2, element: b, x: 330, y: 200 }],
    bonds: [{ id: 1, a: 1, b: 2, order: 1 }],
  }), [first, second]);
}

/**
 * Clicks at a point given in drawing units relative to atom 1.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {number} dx - Horizontal offset from atom 1.
 * @param {number} dy - Vertical offset from atom 1.
 * @returns {Promise<void>}
 */
async function clickNearFirst(page, dx, dy) {
  const p = await page.evaluate(([x, y]) => {
    const atom = window.__editor.getMoleculeJSON().atoms[0];
    return window.__editor.modelToClient({ x: atom.x + x, y: atom.y + y });
  }, [dx, dy]);
  await page.mouse.click(p.x, p.y);
}

test('a bond between two close heteroatom labels stays a bond; the label text stays the atom', async ({ page }) => {
  const errors = await openApp(page);
  const tools = page.getByRole('navigation', { name: 'Herramientas de dibujo' });
  // O–O 30 units apart: Enlace doble on the bond midpoint makes O=O.
  await loadClosePair(page, 'O', 'O');
  await tools.getByRole('button', { name: 'Enlace doble' }).click();
  await clickBond(page, 1);
  expect(await orders(page)).toEqual([2]);
  expect(await elements(page)).toEqual(['O', 'O']);
  // Borrar on the bond midpoint deletes the bond, not an atom.
  await loadClosePair(page, 'O', 'O');
  await tools.getByRole('button', { name: 'Borrar' }).click();
  await clickBond(page, 1);
  expect(await orders(page)).toEqual([]);
  expect(await elements(page)).toEqual(['O', 'O']);
  // Borrar on the text of the first "OH" (outside its hit circle) deletes that atom.
  await loadClosePair(page, 'O', 'O');
  await clickNearFirst(page, -11, 7);
  expect(await elements(page)).toEqual(['O']);
  // N–Cl: the stroke visible between "NH₂" and "Cl" is the bond.
  await loadClosePair(page, 'N', 'Cl');
  await clickNearFirst(page, 18.5, 0);
  expect(await elements(page)).toEqual(['N', 'Cl']);
  expect(await orders(page)).toEqual([]);
  // C–OH 28 units apart: Enlace doble on the midpoint makes C=O.
  await page.evaluate(() => window.__editor.loadMolecule({
    version: 1,
    nextAtomId: 3,
    nextBondId: 2,
    atoms: [{ id: 1, element: 'C', x: 300, y: 200 }, { id: 2, element: 'O', x: 328, y: 200 }],
    bonds: [{ id: 1, a: 1, b: 2, order: 1 }],
  }));
  await tools.getByRole('button', { name: 'Enlace doble' }).click();
  await clickNearFirst(page, 14, 0);
  expect(await orders(page)).toEqual([2]);
  expect(await elements(page)).toEqual(['C', 'O']);
  expect(errors).toEqual([]);
});

test('naming a heteroatom molecule shows the "not yet" message; 90° view and Ordenar dibujo fall back', async ({ page }) => {
  const errors = await openApp(page);
  // C–C–C–C, then Nitrógeno on the last carbon and Enlace triple on the C–N bond: a nitrile, C–C–C≡N.
  // (Amines such as C–C–N–C are named since I-36 and ethers since I-34; a nitrile is still refused.)
  await clickCanvas(page, 0.4, 0.5);
  await clickAtom(page, 2);
  await clickAtom(page, 3);
  await page.keyboard.press('n');
  await clickAtom(page, 4);
  await page.getByRole('button', { name: 'Enlace triple' }).click();
  await clickBond(page, 3);
  expect(await elements(page)).toEqual(['C', 'C', 'C', 'N']);
  expect(await orders(page)).toEqual([1, 1, 3]);

  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  const error = page.locator('#results .results-error');
  await expect(error).toHaveAttribute('data-code', 'HETEROATOM');
  await expect(error).toContainText('Aún no sé nombrar este tipo de compuestos');
  // No name, but the group steps (I-29) are offered under the message; nothing marked until opened.
  await expect(page.locator('#result-name')).toHaveCount(0);
  await expect(page.locator('svg#canvas .hl')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  const stepper = page.locator('#stepper');
  const dots = stepper.locator('.step-dot');
  const titles = [];
  for (let i = 0; i < await dots.count(); i += 1) {
    await dots.nth(i).click();
    titles.push(await stepper.locator('.step-title').textContent());
  }
  expect(titles).toEqual(['Reconoce los grupos', 'Elige el principal', 'Sufijo o prefijo', 'Aún no sé nombrarla']);
  await dots.nth(0).click();
  await expect(stepper.locator('.step-content')).toContainText('1 nitrilo: un carbono unido a un nitrógeno por un enlace triple (–C≡N)');
  await expect(page.locator('svg#canvas .hl-atom.hl-substituent')).toHaveCount(2);
  await dots.nth(2).click();
  await expect(stepper.locator('.step-content')).toContainText('El nitrilo: sufijo «-nitrilo»');
  await expect(page.locator('svg#canvas .hl-atom.hl-parent')).toHaveCount(2);
  await page.getByRole('button', { name: 'Ocultar el paso a paso' }).click();
  await expect(page.locator('svg#canvas .hl')).toHaveCount(0);

  // Ordenar dibujo: the drawing stays as it was, no crash.
  const before = await page.evaluate(() => window.__editor.getMoleculeJSON());
  await page.locator('#toolbar [data-action="arrange"]').click();
  expect(await page.evaluate(() => window.__editor.getMoleculeJSON())).toEqual(before);

  // The 90° view falls back to the normal (editable) drawing, with a note.
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  await page.locator('#right-angle-button').click();
  expect(await page.evaluate(() => window.__editor.isProjected())).toBe(false);
  await expect(page.locator('#right-angle-note')).toHaveText('Hay átomos que no son carbono: se ve el dibujo normal.');
  // The nitrile N has no hydrogen left: labelled N.
  await expect(label(page, 4)).toHaveText('N');
  await expect(label(page, 1)).toHaveText('CH₃');
  // Still editable there: Carbono on the N turns it into but-1-yne (a hydrocarbon), which projects.
  await page.keyboard.press('c');
  await clickAtom(page, 4);
  expect(await elements(page)).toEqual(['C', 'C', 'C', 'C']);
  expect(await page.evaluate(() => window.__editor.isProjected())).toBe(true);
  expect(errors).toEqual([]);
}); // End of test 'naming a heteroatom molecule shows the "not yet" message…'
