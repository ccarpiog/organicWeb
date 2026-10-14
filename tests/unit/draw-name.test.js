/**
 * @file Unit tests for «Dibujar» (src/ui/draw-name.js, design.md §15.2,
 * §15.3, phase R-2b): the layout check before the canvas is touched, the
 * order of the steps (load centred, results, close) with injected fakes,
 * every failure staying in the dialog, the centre of the old drawing, and
 * the verdict block's text (readName()'s own message and notes, the
 * student's name in coloured parts).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  drawVerdict, verdictLayout, verdictBlock, studentParts, drawingCentre, CANNOT_DRAW, STUDENT_LABEL, VERDICT_TONES,
} from '../../src/ui/draw-name.js';
import { readName } from '../../src/reverse/index.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { layoutProblems } from '../../src/layout/canonical.js';
import { nameMolecule } from '../../src/naming/index.js';
import { createMolecule, addAtom } from '../../src/model/molecule.js';
import { SUCCESS_KINDS } from '../../src/ui/name-builder-state.js';

/**
 * The verdict of a name written as text (its tiles found by the tokenizer).
 *
 * @param {string} text - A name.
 * @returns {object} readName() of its tiles.
 */
function verdictOf(text) {
  const tiles = tokenize(text);
  assert.ok(tiles, `no tiles for ${text}`);
  return readName(tiles);
}

/**
 * Fakes of the editor, the results panel and the dialog that record the
 * calls drawVerdict() makes, in order.
 *
 * @param {{load?: object}} [options] - `load`: the outcome loadMolecule() gives (default success).
 * @returns {{calls: Array<[string, ...*]>, editor: object, results: object, builder: object}} The fakes.
 */
function fakes(options = {}) {
  const calls = [];
  const editor = {
    peekMolecule: () => createMolecule(),
    loadMolecule: (mol, opts) => {
      calls.push(['load', mol, opts]);
      return options.load || { ok: true, changed: true };
    },
    centerView: () => calls.push(['center']),
  };
  const results = { showVerdict: (verdict, laid) => calls.push(['results', verdict, laid]) };
  const builder = {
    showFailure: (message) => calls.push(['failure', message]),
    showVerdict: (verdict) => calls.push(['dialogVerdict', verdict]),
    close: () => calls.push(['close']),
  };
  return { calls, editor, results, builder };
} // End of function fakes()

test('a success verdict: layout, load centred, results, close — in that order', () => {
  const verdict = verdictOf('2-metilbutano');
  assert.equal(verdict.kind, 'correct');
  const { calls, editor, results, builder } = fakes();
  const outcome = drawVerdict(verdict, { editor, results, builder });
  assert.deepEqual(outcome, { ok: true, changed: true });
  // The centring is part of the load (one undoable edit for the molecule and its view), not a separate step.
  assert.deepEqual(calls.map((call) => call[0]), ['load', 'results', 'close']);
  assert.deepEqual(calls[0][2], { center: true });
  const laid = calls[0][1];
  // The results panel gets the very molecule that was loaded (its layout) and the verdict.
  assert.equal(calls[1][1], verdict);
  assert.equal(calls[1][2], laid);
  // Same ids as the verdict's molecule, a clear drawing, nameable with the same parent.
  assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()]);
  assert.deepEqual([...laid.bonds.keys()], [...verdict.molecule.bonds.keys()]);
  assert.equal(layoutProblems(laid).ok, true);
  const named = nameMolecule(laid);
  assert.equal(named.name, '2-metilbutano');
  assert.deepEqual(named.parent.atoms, verdict.naming.parent.atoms);
}); // End of test 'a success verdict…'

test('a layout that cannot be made or has problems: the message in the dialog, the canvas untouched', () => {
  const verdict = verdictOf('hexano');
  const { calls, editor, results, builder } = fakes();
  const outcome = drawVerdict(verdict, { editor, results, builder, layout: () => null });
  assert.deepEqual(outcome, { ok: false, message: CANNOT_DRAW });
  assert.deepEqual(calls, [['failure', CANNOT_DRAW]]);
  assert.equal(CANNOT_DRAW, 'He entendido el nombre, pero no consigo dibujar esta molécula sin que se crucen enlaces.');
});

test('a refused load: its message in the dialog, nothing centred, no result, the dialog stays open', () => {
  const verdict = verdictOf('hexano');
  const refusal = { ok: false, message: 'Este carbono ya tiene 4 enlaces.', atoms: [] };
  const { calls, editor, results, builder } = fakes({ load: refusal });
  assert.equal(drawVerdict(verdict, { editor, results, builder }), refusal);
  assert.deepEqual(calls.map((call) => call[0]), ['load', 'failure']);
  assert.equal(calls[1][1], refusal.message);
});

test('a failure verdict never reaches the canvas (defensive: the dialog keeps failures to itself)', () => {
  const failures = [readName([]), verdictOf('buteno'), readName(['num-2', 'num-3', 'root-1', 'fv-1', 'root-4', 'ending-saturated'])];
  assert.deepEqual(failures.map((v) => v.kind), ['invalid', 'ambiguous', 'invalid']);
  for (const verdict of failures) {
    const { calls, editor, results, builder } = fakes();
    const outcome = drawVerdict(verdict, { editor, results, builder });
    assert.equal(outcome.ok, false);
    assert.deepEqual(calls.map((call) => call[0]), ['dialogVerdict']);
  }
});

test('without a results panel the molecule is still loaded and the dialog closes', () => {
  const { calls, editor, builder } = fakes();
  drawVerdict(verdictOf('propano'), { editor, results: null, builder });
  assert.deepEqual(calls.map((call) => call[0]), ['load', 'close']);
});

test('verdictLayout(): centred on the given point; null without a molecule, a naming, or for a refusal', () => {
  const verdict = verdictOf('4-(propan-2-il)heptano');
  const laid = verdictLayout(verdict, { x: 300, y: 200 });
  assert.ok(laid);
  assert.deepEqual(drawingCentre(laid), { x: 300, y: 200 });
  // The verdict's own molecule is not changed.
  assert.ok([...verdict.molecule.atoms.values()].every((a) => a.x === 0 && a.y === 0));
  assert.equal(verdictLayout(null), null);
  assert.equal(verdictLayout({ ...verdict, draw: false }), null);
  assert.equal(verdictLayout({ ...verdict, molecule: null }), null);
  assert.equal(verdictLayout({ ...verdict, naming: { ok: false, error: { code: 'X', message: 'x' } } }), null);
  // A naming whose parent does not belong to the molecule: canonicalLayout() throws, and that is a refusal.
  assert.equal(verdictLayout({ ...verdict, naming: { ...verdict.naming, parent: { atoms: [999], bonds: [] } } }), null);
}); // End of test 'verdictLayout()…'

test('the worked success cases of design.md §15.5.3 and the e2e names all lay out clearly', () => {
  const names = ['metilpropano', '2-metilpropeno', 'metilpropeno', 'metiletano', '1-metilpropano', '2-etilbutano',
    '4-metilpentano', 'hex-4-eno', '2-buteno', '1,3-butadieno', '5,5-bis(2,2-dimetilpropil)nonano', '3-metilidenhexano',
    '5,5-di-tert-butilnonano', '4-(1-metiletil)heptano'];
  for (const name of names) {
    const verdict = verdictOf(name);
    assert.ok(SUCCESS_KINDS.includes(verdict.kind), `${name}: ${verdict.kind}`);
    const laid = verdictLayout(verdict);
    assert.ok(laid, name);
    assert.equal(layoutProblems(laid).ok, true, name);
  }
}); // End of test 'the worked success cases…'

test('drawingCentre(): the middle of the bounding box, the origin for an empty canvas', () => {
  assert.deepEqual(drawingCentre(createMolecule()), { x: 0, y: 0 });
  assert.deepEqual(drawingCentre(null), { x: 0, y: 0 });
  const mol = createMolecule();
  addAtom(mol, { x: 100, y: 40 });
  addAtom(mol, { x: 300, y: 80 });
  addAtom(mol, { x: 180, y: 240 });
  assert.deepEqual(drawingCentre(mol), { x: 200, y: 140 });
});

test('verdictBlock(): readName()\'s message and notes, the tone, and the student\'s name in parts', () => {
  const correct = verdictBlock(verdictOf('2-metilbutano'));
  assert.deepEqual(correct.lines, ['¡Correcto!']);
  assert.equal(correct.tone, 'correct');
  assert.equal(correct.kind, 'correct');
  assert.deepEqual(correct.student, [
    { text: '2', kind: 'locant' }, { text: '-', kind: 'punct' }, { text: 'met', kind: 'prefix' }, { text: 'il', kind: 'prefix' },
    { text: 'but', kind: 'stem' }, { text: 'ano', kind: 'ending' },
  ]);

  const alternative = verdictBlock(verdictOf('4-(propan-2-il)heptano'));
  assert.equal(alternative.tone, 'correct');
  assert.deepEqual(alternative.lines, ['¡Correcto! «4-(propan-2-il)heptano» es una forma válida (nombre preferido por la IUPAC '
    + '(2013)). El nombre que doy primero es «4-isopropilheptano».']);
  assert.equal(alternative.student.map((p) => p.text).join(''), '4-(propan-2-il)heptano');

  const almost = verdictBlock(verdictOf('metilpropeno'));
  assert.equal(almost.tone, 'almost');
  assert.deepEqual(almost.lines, ['Casi: faltan los números. Se escribe «2-metilprop-1-eno».']);

  const other = verdictBlock(verdictOf('metiletano'));
  assert.equal(other.tone, 'other');
  assert.deepEqual(other.lines, ['Esta es la molécula que describe tu nombre, pero se llama «propano». '
    + 'Pulsa «Ver paso a paso» para ver por qué.']);

  // The old-style note is the block's second line.
  const old = verdictBlock(verdictOf('2-buteno'));
  assert.equal(old.kind, 'otherName');
  assert.deepEqual(old.lines, ['Esta es la molécula que describe tu nombre, pero se llama «but-2-eno». '
    + 'Pulsa «Ver paso a paso» para ver por qué.', 'Es la forma antigua de escribirlo; hoy se escribe «but-2-eno».']);

  assert.equal(STUDENT_LABEL, 'Tu nombre:');
  assert.deepEqual(Object.keys(VERDICT_TONES).sort(), [...SUCCESS_KINDS].sort());
}); // End of test 'verdictBlock()…'

test('studentParts(): spans that do not give the text back fall back to one part', () => {
  assert.deepEqual(studentParts({ text: 'hexano', spans: [{ from: 0, to: 3, kind: 'stem' }] }), [{ text: 'hexano', kind: 'stem' }]);
  assert.deepEqual(studentParts({ text: 'hexano', spans: [] }), [{ text: 'hexano', kind: 'stem' }]);
  assert.deepEqual(studentParts({ text: 'hexano', spans: [{ from: 0, to: 3, kind: 'stem' }, { from: 3, to: 6, kind: 'ending' }] }),
    [{ text: 'hex', kind: 'stem' }, { text: 'ano', kind: 'ending' }]);
});
