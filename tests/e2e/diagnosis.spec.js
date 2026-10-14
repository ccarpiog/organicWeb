/**
 * @file Diagnosis of «¿Cómo se dibuja?» in the results panel e2e (design.md
 * §15.3 `otherName`, §15.8 R-3; phase I-49b), on the dev server and on
 * `dist/index.html` via `file://`: «Dibujar» with a name the app names
 * otherwise shows the main mistake between the verdict's two sentences, the
 * student's chain striped beside the parent on the canvas with a legend, and
 * «Ver el paso», which opens the stepper at the diagnosis's step (the
 * explanation in the student's prefix style, whose name the block then
 * gives); the «Resaltar en el dibujo» switch hides the chain and the
 * legend; the 90° view keeps the chain; a coordinate-only edit keeps it all,
 * Deshacer and «¿Cómo se llama?» clear it; an OLD_STYLE diagnosis replaces
 * the old-style note; a null diagnosis and the other verdicts are unchanged;
 * keyboard only; a phone. Rings (phase I-50d): the ring as the parent of a
 * name written on a chain — the student's chain striped beside the ring, the
 * legend naming the ring, «Ver el paso» at «Reconoce el benceno» — and a ring
 * numbered otherwise, «Ver el paso» at «Numera el anillo».
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
 * Builds a name from tiles in the «¿Cómo se dibuja?» dialog (from an empty
 * name) and presses «Dibujar»; waits until the dialog has closed.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {...string} texts - Tile texts, in order.
 * @returns {Promise<void>}
 */
async function drawName(page, ...texts) {
  await page.getByRole('button', { name: '¿Cómo se dibuja?' }).click();
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Borrar todo' }).click();
  const rows = page.locator('#name-builder-rows');
  for (const text of texts) {
    await rows.getByRole('button', { name: text, exact: true }).click();
  }
  await dialog.getByRole('button', { name: 'Dibujar' }).click();
  await expect(dialog).toBeHidden();
} // End of function drawName()

/**
 * The ids of the atoms and bonds a highlight style marks on the canvas.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} style - A highlight style (`student`, `parent`…).
 * @returns {Promise<{atoms: number[], bonds: number[]}>} The ids, ascending.
 */
function marked(page, style) {
  return page.evaluate((name) => {
    const ids = (selector, key) => [...document.querySelectorAll(`svg#canvas ${selector}.hl-${name}`)]
      .map((node) => Number(node.dataset[key])).sort((a, b) => a - b);
    return { atoms: ids('.hl-atom', 'atomId'), bonds: ids('.hl-bond', 'bondId') };
  }, style);
}

/**
 * The locant shown on the canvas next to an atom, or null.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {number} id - Atom id.
 * @returns {Promise<number|null>} The number.
 */
function locantOf(page, id) {
  return page.evaluate((atomId) => {
    const node = document.querySelector(`svg#canvas .locant[data-atom-id="${atomId}"]`);
    return node ? Number(node.textContent) : null;
  }, id);
}

/** The tiles of «2-etilbutano» (a longer chain exists: 3-metilpentano). */
const LONGER = ['2', 'et', 'il', 'but', 'ano'];

/** The tiles of «4-metilpentano» (numbered from the other end: 2-metilpentano). */
const NUMBERING = ['4', 'met', 'il', 'pent', 'ano'];

/** The tiles of «1-(4-metilfenil)propano» (the ring is the parent: 1-metil-4-propilbenceno). */
const RING_PARENT = ['1', 'empieza rama compuesta', '4', 'met', 'il', 'fenil', 'acaba rama', 'prop', 'ano'];

/** The tiles of «1,5-dimetilciclohexano» (the ring numbered otherwise: 1,3-dimetilciclohexano). */
const RING_NUMBERING = ['1', '5', 'di', 'met', 'il', 'ciclo', 'hex', 'ano'];

test('a longer chain: the message between the two sentences, the student\'s chain beside the parent, «Ver el paso» at «Busca la cadena»; Deshacer clears it all', async ({ page }) => {
  const errors = await openApp(page);
  await drawName(page, ...LONGER);
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'LONGER_CHAIN');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: 2-etilbutano');
  // The three sentences, in order: the verdict, the diagnosis, the hint.
  const texts = await verdict.locator('.verdict-message, .verdict-style, .verdict-diagnosis, .verdict-hint, .verdict-note')
    .allTextContents();
  expect(texts).toEqual([
    'Esta es la molécula que describe tu nombre, pero se llama «3-metilpentano».',
    'Hay una cadena más larga que la tuya: la tuya tiene 4 carbonos y la cadena principal tiene 5.',
    'Pulsa «Ver paso a paso» para ver por qué.',
  ]);
  await expect(page.locator('#result-name')).toHaveText('3-metilpentano');
  await expect(page.locator('#announcer')).toContainText('Hay una cadena más larga que la tuya');

  // The legend names both marks; the student's chain (4 carbons) is striped beside the 5-carbon parent.
  const legend = verdict.getByRole('list', { name: 'Qué se ve en el dibujo' });
  await expect(legend).toBeVisible();
  await expect(legend.getByRole('listitem')).toHaveText(['Cadena principal', 'Tu cadena']);
  const student = await marked(page, 'student');
  expect(student.atoms).toHaveLength(4);
  expect(student.bonds).toHaveLength(3);
  const parent = await marked(page, 'parent');
  expect(parent.atoms).toHaveLength(5);
  expect(parent.atoms).not.toEqual(student.atoms);
  // Drawn differently, not by colour alone: a wider dashed band and dashed rings.
  const look = await page.evaluate(() => {
    const style = (selector) => getComputedStyle(document.querySelector(`svg#canvas ${selector}`));
    const studentBond = style('.hl-bond.hl-student');
    const parentBond = style('.hl-bond.hl-parent');
    return {
      studentDash: studentBond.strokeDasharray,
      parentDash: parentBond.strokeDasharray,
      wider: parseFloat(studentBond.strokeWidth) > parseFloat(parentBond.strokeWidth),
      ringDash: style('.hl-atom.hl-student').strokeDasharray,
      ringFill: style('.hl-atom.hl-student').fill,
    };
  });
  expect(look.studentDash).not.toBe('none');
  expect(look.parentDash).toBe('none');
  expect(look.wider).toBe(true);
  expect(look.ringDash).not.toBe('none');
  expect(look.ringFill).toBe('none');
  // The student's chain is drawn under the parent (first in the highlight layer).
  expect(await page.evaluate(() => document.querySelector('svg#canvas .mol-highlight .hl').classList.contains('hl-student'))).toBe(true);

  // «Ver el paso»: the stepper opens at «Busca la cadena más larga», the focus on its title; the chain stays marked.
  await verdict.getByRole('button', { name: 'Ver el paso' }).click();
  const stepper = page.locator('#stepper');
  await expect(stepper).toBeVisible();
  await expect(stepper).toHaveAttribute('data-step-id', 'chain');
  await expect(stepper.locator('.step-count')).toHaveText('Paso 2 de 5');
  await expect(stepper.locator('.step-title')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Ocultar el paso a paso' })).toHaveAttribute('aria-expanded', 'true');
  expect(await marked(page, 'student')).toEqual(student);
  // Stepping on keeps it; «Ver el paso» again goes back to the diagnosis's step.
  await stepper.getByRole('button', { name: 'Siguiente' }).click();
  await expect(stepper).toHaveAttribute('data-step-id', 'numbering');
  expect(await marked(page, 'student')).toEqual(student);
  await verdict.getByRole('button', { name: 'Ver el paso' }).click();
  await expect(stepper).toHaveAttribute('data-step-id', 'chain');

  // The highlight switch hides the chain and its legend, and brings them back.
  const toggle = stepper.getByRole('button', { name: 'Resaltar en el dibujo' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect((await marked(page, 'student')).atoms).toHaveLength(0);
  await expect(page.locator('svg#canvas .hl')).toHaveCount(0);
  await expect(legend).toBeHidden();
  await toggle.click();
  expect(await marked(page, 'student')).toEqual(student);
  await expect(legend).toBeVisible();

  // Deshacer (a chemical edit) clears the verdict, the diagnosis and every mark.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(verdict).toHaveCount(0);
  await expect(page.locator('.verdict-diagnosis')).toHaveCount(0);
  await expect(page.locator('#diagnosis-step-button')).toHaveCount(0);
  await expect(page.locator('svg#canvas .hl-student')).toHaveCount(0);
  await expect(page.locator('svg#canvas .hl')).toHaveCount(0);
  await expect(page.locator('.results-hint')).toBeVisible();
  // Rehacer brings the molecule back without a stale diagnosis.
  await page.getByRole('button', { name: 'Rehacer' }).click();
  await expect(page.locator('svg#canvas .hl-student')).toHaveCount(0);
  await expect(verdict).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test 'a longer chain…'

test('numbered from the other end: «Ver el paso» at «Numera la cadena», the same chain in the legend', async ({ page }) => {
  const errors = await openApp(page);
  await drawName(page, ...NUMBERING);
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'NUMBERING');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama «2-metilpentano».');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('Hay que numerar la cadena desde el otro extremo: los sustituyentes '
    + 'tienen que llevar los números más bajos (2 en vez de 4).');
  await expect(verdict.locator('.verdict-hint')).toHaveText('Pulsa «Ver paso a paso» para ver por qué.');
  await expect(verdict.locator('.verdict-style')).toHaveCount(0);
  await expect(verdict.getByRole('listitem')).toHaveText(['Cadena principal', 'Tu cadena (es la misma)']);
  // The student's chain is the parent (5 carbons), numbered the other way.
  const student = await marked(page, 'student');
  expect(student.atoms).toHaveLength(5);
  expect((await marked(page, 'parent')).atoms).toEqual(student.atoms);

  await verdict.getByRole('button', { name: 'Ver el paso' }).click();
  const stepper = page.locator('#stepper');
  await expect(stepper).toHaveAttribute('data-step-id', 'numbering');
  await expect(stepper.locator('.step-count')).toHaveText('Paso 3 de 5');
  await expect(stepper.locator('.step-title')).toHaveText('Numera la cadena');
  // The student's carbon 4 (atom 4: the tiles built the chain in their order) is carbon 2 in the app's numbering.
  expect(await locantOf(page, 4)).toBe(2);
  expect(errors).toEqual([]);
}); // End of test 'numbered from the other end…'

test('a ring (I-50d): the ring is the parent beside the student\'s chain, «Ver el paso» at «Reconoce el benceno»; a ring numbered otherwise', async ({ page }) => {
  const errors = await openApp(page);
  await drawName(page, ...RING_PARENT);
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'RING_IS_PARENT');
  await expect(verdict.locator('.verdict-student')).toHaveText('Tu nombre: 1-(4-metilfenil)propano');
  // The three sentences, in order: the verdict, the diagnosis, the hint.
  const texts = await verdict.locator('.verdict-message, .verdict-style, .verdict-diagnosis, .verdict-hint, .verdict-note')
    .allTextContents();
  expect(texts).toEqual([
    'Esta es la molécula que describe tu nombre, pero se llama «1-metil-4-propilbenceno».',
    'El anillo es la cadena principal: un anillo manda siempre sobre una cadena abierta, aunque la cadena sea más larga. '
      + 'Tu cadena de 3 carbonos va en una rama del anillo: «1-metil-4-propilbenceno».',
    'Pulsa «Ver paso a paso» para ver por qué.',
  ]);
  await expect(page.locator('#result-name')).toHaveText('1-metil-4-propilbenceno');

  // The legend names the ring; the student's three-carbon chain is striped beside the six-carbon ring, apart from it.
  const legend = verdict.getByRole('list', { name: 'Qué se ve en el dibujo' });
  await expect(legend).toBeVisible();
  await expect(legend.getByRole('listitem')).toHaveText(['Cadena principal (el anillo)', 'Tu cadena']);
  const student = await marked(page, 'student');
  expect([student.atoms.length, student.bonds.length]).toEqual([3, 2]);
  const parent = await marked(page, 'parent');
  expect([parent.atoms.length, parent.bonds.length]).toEqual([6, 6]);
  expect(parent.atoms.some((id) => student.atoms.includes(id))).toBe(false);

  // «Ver el paso»: the stepper opens at «Reconoce el benceno» (the ring is always the parent), the focus on its title.
  await verdict.getByRole('button', { name: 'Ver el paso' }).click();
  const stepper = page.locator('#stepper');
  await expect(stepper).toBeVisible();
  await expect(stepper).toHaveAttribute('data-step-id', 'benzene');
  await expect(stepper.locator('.step-count')).toHaveText('Paso 2 de 6');
  await expect(stepper.locator('.step-title')).toHaveText('Reconoce el benceno');
  await expect(stepper.locator('.step-title')).toBeFocused();
  expect(await marked(page, 'student')).toEqual(student);

  // A ring numbered from another carbon: the same ring in the legend, «Ver el paso» at «Numera el anillo».
  await drawName(page, ...RING_NUMBERING);
  await expect(verdict).toHaveAttribute('data-diagnosis', 'RING_NUMBERING');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«1,3-dimetilciclohexano».');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('Hay que numerar el anillo de otra manera, empezando en otro '
    + 'carbono o contando hacia el otro lado: los sustituyentes tienen que llevar los números más bajos (3 en vez de 5).');
  await expect(verdict.getByRole('listitem')).toHaveText(['Cadena principal (el anillo)', 'Tu anillo (es el mismo)']);
  const ring = await marked(page, 'student');
  expect([ring.atoms.length, ring.bonds.length]).toEqual([6, 6]);
  expect((await marked(page, 'parent')).atoms).toEqual(ring.atoms);
  await verdict.getByRole('button', { name: 'Ver el paso' }).click();
  await expect(stepper).toHaveAttribute('data-step-id', 'ringNumbering');
  await expect(stepper.locator('.step-title')).toHaveText('Numera el anillo');
  // The student's carbon 5 (atom 5: the tiles built the ring in their order) is carbon 3 in the app's numbering.
  expect(await locantOf(page, 5)).toBe(3);

  // Deshacer (a chemical edit) clears the verdict, the diagnosis and every mark.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.locator('.verdict-diagnosis')).toHaveCount(0);
  await expect(page.locator('svg#canvas .hl-student')).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test 'a ring (I-50d)…'

test('branches in another prefix style: «Se llama» keeps the default name, the block names the explained one, whose numbering the stepper shows', async ({ page }) => {
  const errors = await openApp(page);
  await drawName(page, '6', 'met', 'il', '4', 'prop', 'ano', '2', 'il', 'non', 'ano');
  const verdict = page.locator('#verdict');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'NUMBERING');
  await expect(page.locator('#result-name')).toHaveText('4-isopropil-6-metilnonano');
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«4-isopropil-6-metilnonano».');
  await expect(verdict.locator('.verdict-style')).toHaveText('Con las ramas escritas como en tu nombre, se escribe '
    + '«4-metil-6-(propan-2-il)nonano» (nombre preferido por la IUPAC (2013)). El paso a paso usa ese nombre.');
  // The style line comes before the diagnosis.
  const roles = await verdict.locator('p').evaluateAll((nodes) => nodes.map((n) => n.className));
  expect(roles).toEqual(['verdict-student', 'verdict-message', 'verdict-style', 'verdict-diagnosis', 'verdict-hint']);
  // The student's carbon 6 holds the methyl: carbon 4 in the explained name, on the canvas and in the numbering step.
  expect(await locantOf(page, 6)).toBe(4);
  await verdict.getByRole('button', { name: 'Ver el paso' }).click();
  const stepper = page.locator('#stepper');
  await expect(stepper).toHaveAttribute('data-step-id', 'numbering');
  expect(await locantOf(page, 6)).toBe(4);
  // «Ver paso a paso» shows the same explanation: its last step builds the explained name.
  await stepper.locator('.step-dot').last().click();
  await expect(stepper).toHaveAttribute('data-step-id', 'assemble');
  await expect(stepper.locator('.step-name')).toHaveText('4-metil-6-(propan-2-il)nonano');
  expect(errors).toEqual([]);
}); // End of test 'branches in another prefix style…'

test('the old style: the OLD_STYLE diagnosis without the old-style note; beside another diagnosis the note stays', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  await drawName(page, '2', 'but', 'eno');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'OLD_STYLE');
  await expect(verdict.locator('.verdict-diagnosis')).toHaveText('Has escrito los números delante de la raíz, como se hacía antes. '
    + 'Hoy van detrás, justo delante de «eno» o «ino»: «but-2-eno».');
  await expect(verdict.locator('.verdict-note')).toHaveCount(0);
  await verdict.getByRole('button', { name: 'Ver el paso' }).click();
  await expect(page.locator('#stepper')).toHaveAttribute('data-step-id', 'assemble');

  await drawName(page, '2', 'met', 'il', '3', 'but', 'eno');
  await expect(verdict).toHaveAttribute('data-diagnosis', 'NUMBERING');
  await expect(verdict.locator('.verdict-note')).toHaveText('Es la forma antigua de escribirlo; hoy se escribe «2-metilbut-3-eno».');
  const order = await verdict.locator('p').evaluateAll((nodes) => nodes.map((n) => n.className));
  expect(order).toEqual(['verdict-student', 'verdict-message', 'verdict-diagnosis', 'verdict-hint', 'verdict-note']);
  expect(errors).toEqual([]);
}); // End of test 'the old style…'

test('no diagnosis and the other verdicts: today\'s block, no legend, no «Ver el paso», no student\'s chain', async ({ page }) => {
  const errors = await openApp(page);
  const verdict = page.locator('#verdict');
  // An otherName whose branch is written in a style the app does not offer for it: no diagnosis.
  await drawName(page, '4', 'empieza rama compuesta', '1', '1', 'di', 'met', 'il', 'et', 'il', 'acaba rama', 'hept', 'ano');
  await expect(verdict).toHaveAttribute('data-kind', 'otherName');
  expect(await verdict.getAttribute('data-diagnosis')).toBeNull();
  await expect(verdict.locator('.verdict-message')).toHaveText('Esta es la molécula que describe tu nombre, pero se llama '
    + '«4-tert-butilheptano». Pulsa «Ver paso a paso» para ver por qué.');
  for (const selector of ['.verdict-diagnosis', '.verdict-hint', '.verdict-style', '.verdict-legend', '#diagnosis-step-button']) {
    await expect(verdict.locator(selector), selector).toHaveCount(0);
  }
  await expect(page.locator('svg#canvas .hl-student')).toHaveCount(0);
  // The usual stepper.
  await page.getByRole('button', { name: 'Ver paso a paso' }).click();
  await expect(page.locator('#stepper .step-count')).toHaveText(/^Paso 1 de /);

  // Correct and missing locants: no diagnosis either.
  await drawName(page, '2', 'met', 'il', 'but', 'ano');
  await expect(verdict.locator('.verdict-message')).toHaveText('¡Correcto!');
  await expect(verdict.locator('.verdict-tools')).toHaveCount(0);
  await drawName(page, 'met', 'il', 'prop', 'eno');
  await expect(verdict.locator('.verdict-message')).toHaveText('Casi: faltan los números. Se escribe «2-metilprop-1-eno».');
  await expect(verdict.locator('.verdict-tools')).toHaveCount(0);
  await expect(page.locator('svg#canvas .hl-student')).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test 'no diagnosis and the other verdicts…'

test('a coordinate-only edit keeps the diagnosis and the chain; «¿Cómo se llama?» shows the plain result', async ({ page }) => {
  const errors = await openApp(page);
  await drawName(page, ...LONGER);
  const student = await marked(page, 'student');
  expect(student.atoms).toHaveLength(4);
  const parent = await marked(page, 'parent');
  expect(parent.atoms).toHaveLength(5);
  // Move an atom with the Mover tool: coordinates only.
  await page.evaluate(() => window.__editor.setTool('move'));
  const p = await page.evaluate((id) => window.__editor.atomClientPoint(id), student.atoms[0]);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 30, p.y + 40, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('#redraw-hint')).toBeVisible();
  await expect(page.locator('#verdict .verdict-diagnosis')).toBeVisible();
  expect(await marked(page, 'student')).toEqual(student);
  // The parent stays beside it, as the legend says (the ordered drawing's marks are gone).
  expect(await marked(page, 'parent')).toEqual(parent);
  // Its undo is coordinate-only too.
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.locator('#redraw-hint')).toBeHidden();
  expect(await marked(page, 'student')).toEqual(student);
  expect(await marked(page, 'parent')).toEqual(parent);
  // Naming the drawing again: the plain result, without the verdict or the chain.
  await page.getByRole('button', { name: '¿Cómo se llama?' }).click();
  await expect(page.locator('#result-name')).toHaveText('3-metilpentano');
  await expect(page.locator('#verdict')).toHaveCount(0);
  await expect(page.locator('svg#canvas .hl-student')).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test 'a coordinate-only edit…'

test('the 90° view: the student\'s chain on the projected drawing, kept when the view is switched off', async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole('button', { name: 'Con carbonos' }).click();
  const rightAngle = page.locator('#right-angle-button');
  await rightAngle.click();
  await expect(rightAngle).toHaveAttribute('aria-pressed', 'true');
  await drawName(page, ...LONGER);
  expect(await page.evaluate(() => window.__editor.isProjected())).toBe(true);
  const student = await marked(page, 'student');
  expect(student.atoms).toHaveLength(4);
  expect(student.bonds).toHaveLength(3);
  // Each ring sits on its atom as drawn (projected).
  const placed = await page.evaluate((ids) => ids.every((id) => {
    const ring = document.querySelector(`svg#canvas .hl-atom.hl-student[data-atom-id="${id}"]`);
    const dot = document.querySelector(`svg#canvas .hl-atom.hl-parent[data-atom-id="${id}"], svg#canvas .hl-atom.hl-substituent[data-atom-id="${id}"]`);
    return ring && dot && ring.getAttribute('cx') === dot.getAttribute('cx') && ring.getAttribute('cy') === dot.getAttribute('cy');
  }), student.atoms);
  expect(placed).toBe(true);
  await page.locator('#diagnosis-step-button').click();
  await expect(page.locator('#stepper')).toHaveAttribute('data-step-id', 'chain');
  expect(await marked(page, 'student')).toEqual(student);
  await rightAngle.click();
  expect(await page.evaluate(() => window.__editor.isProjected())).toBe(false);
  expect(await marked(page, 'student')).toEqual(student);
  await expect(page.locator('#stepper')).toHaveAttribute('data-step-id', 'chain');
  expect(errors).toEqual([]);
}); // End of test 'the 90° view…'

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

test('keyboard only: from «¿Cómo se dibuja?» to «Ver el paso», then through the stepper; Ctrl+Z clears it', async ({ page }) => {
  const errors = await openApp(page);
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await tabTo(page, '#draw-name-button');
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: '¿Cómo se dibuja?' });
  await expect(dialog).toBeVisible();
  for (const tile of ['num-4', 'root-1', 'fv-1', 'root-5', 'ending-saturated']) {
    await tabTo(page, `#name-builder-rows [data-tile="${tile}"]`);
    await page.keyboard.press('Enter');
  }
  await expect(page.locator('#name-builder-name')).toHaveText('4-metilpentano');
  await tabTo(page, '[data-role="draw"]', true);
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.locator('#draw-name-button')).toBeFocused();
  // Tab reaches «Ver el paso» in the verdict block; Enter opens the stepper at the numbering step.
  await tabTo(page, '#diagnosis-step-button');
  await expect(page.locator('#diagnosis-step-button')).toHaveAccessibleDescription(/numerar la cadena desde el otro extremo/);
  await page.keyboard.press('Enter');
  const stepper = page.locator('#stepper');
  await expect(stepper).toHaveAttribute('data-step-id', 'numbering');
  await expect(stepper.locator('.step-title')).toBeFocused();
  // From the title, Tab goes on into the stepper: «Anterior» moves one step back.
  await page.keyboard.press('Tab');
  await expect(stepper.getByRole('button', { name: 'Anterior' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(stepper).toHaveAttribute('data-step-id', 'chain');
  // Ctrl+Z undoes the drawing: the verdict, the diagnosis and the chain go.
  await page.keyboard.press('Control+z');
  await expect(page.locator('#verdict')).toHaveCount(0);
  await expect(page.locator('svg#canvas .hl-student')).toHaveCount(0);
  expect(errors).toEqual([]);
}); // End of test 'keyboard only…'

test.describe('phone (375 × 667), diagnosis', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('the diagnosis, the legend and «Ver el paso» fit without a sideways scroll; the step opens in view', async ({ page }) => {
    const errors = await openApp(page);
    await drawName(page, '6', 'met', 'il', '4', 'prop', 'ano', '2', 'il', 'non', 'ano');
    const verdict = page.locator('#verdict');
    await verdict.scrollIntoViewIfNeeded();
    await expect(verdict.locator('.verdict-diagnosis')).toBeVisible();
    await expect(verdict.locator('.verdict-legend')).toBeVisible();
    const button = verdict.getByRole('button', { name: 'Ver el paso' });
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    // Everything in the block stays inside it.
    const inside = await verdict.evaluate((block) => {
      const box = block.getBoundingClientRect();
      return [...block.querySelectorAll('p, li, button')].every((node) => {
        const r = node.getBoundingClientRect();
        return r.left >= box.left - 0.5 && r.right <= box.right + 0.5;
      });
    });
    expect(inside).toBe(true);
    await button.click();
    const title = page.locator('#stepper .step-title');
    await expect(title).toBeFocused();
    await expect(title).toBeInViewport();
    // Not hidden behind the toolbar fixed at the bottom of a phone screen.
    expect(await page.evaluate(() => document.querySelector('#stepper .step-title').getBoundingClientRect().bottom
      <= document.getElementById('toolbar').getBoundingClientRect().top)).toBe(true);
    await expect(page.locator('#stepper')).toHaveAttribute('data-step-id', 'numbering');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await page.getByRole('button', { name: 'Deshacer' }).click();
    await expect(verdict).toHaveCount(0);
    expect(errors).toEqual([]);
  }); // End of test 'the diagnosis, the legend…'
}); // End of describe 'phone (375 × 667), diagnosis'
