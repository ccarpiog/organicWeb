/**
 * @file Unit tests for «Dibujar» (src/ui/draw-name.js, design.md §15.2,
 * §15.3, phase R-2b): the layout check before the canvas is touched, the
 * order of the steps (load centred, results, close) with injected fakes,
 * every failure staying in the dialog, the centre of the old drawing, and
 * the verdict block's text (readName()'s own message and notes, the
 * student's name in coloured parts). Phase I-49b: the diagnosis between the
 * verdict's two sentences, a null diagnosis unchanged, the OLD_STYLE note
 * decision, the line naming the student-style name the stepper explains, and
 * the legend of the two chains.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  drawVerdict, verdictLayout, verdictBlock, verdictEntries, studentParts, drawingCentre, diagnosisLegend, styleLine, CANNOT_DRAW,
  STUDENT_LABEL, VERDICT_TONES, DIAGNOSIS_STEP_LABEL, LEGEND_TEXTS,
} from '../../src/ui/draw-name.js';
import { readName, VERDICT_TEXTS } from '../../src/reverse/index.js';
import { diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
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

  // Another name with a diagnosis (phase I-49b): the diagnosis between the verdict's two sentences.
  const other = verdictBlock(verdictOf('metiletano'));
  assert.equal(other.tone, 'other');
  assert.deepEqual(other.lines, [
    'Esta es la molécula que describe tu nombre, pero se llama «propano».',
    'La rama «metil» está en el extremo de la cadena, así que la alarga: la cadena principal tiene 3 carbonos.',
    'Pulsa «Ver paso a paso» para ver por qué.',
  ]);
  assert.deepEqual(other.entries.map((e) => e.role), ['message', 'diagnosis', 'hint']);
  assert.equal(other.diagnosis.code, 'BRANCH_AT_END');

  // A null diagnosis keeps today's text exactly: the message in one line, no diagnosis.
  const plain = verdictOf('4-(1,1-dimetiletil)heptano');
  assert.equal(plain.kind, 'otherName');
  assert.equal(plain.diagnosis, null);
  const undiagnosed = verdictBlock(plain);
  assert.deepEqual(undiagnosed.lines, ['Esta es la molécula que describe tu nombre, pero se llama «4-tert-butilheptano». '
    + 'Pulsa «Ver paso a paso» para ver por qué.']);
  assert.deepEqual(undiagnosed.entries, [{ role: 'message', text: undiagnosed.lines[0] }]);
  assert.equal(undiagnosed.diagnosis, null);
  // Other kinds have no diagnosis either.
  assert.equal(correct.diagnosis, null);
  assert.equal(almost.diagnosis, null);

  assert.equal(STUDENT_LABEL, 'Tu nombre:');
  assert.deepEqual(Object.keys(VERDICT_TONES).sort(), [...SUCCESS_KINDS].sort());
}); // End of test 'verdictBlock()…'

test('the old style: an OLD_STYLE diagnosis replaces the old-style note; beside another diagnosis the note stays', () => {
  const old = verdictOf('2-buteno');
  assert.equal(old.diagnosis.code, 'OLD_STYLE');
  assert.deepEqual(old.notes, [`${VERDICT_TEXTS.oldStyle} «but-2-eno».`]);
  assert.equal(old.notes[0], 'Es la forma antigua de escribirlo; hoy se escribe «but-2-eno».');
  const block = verdictBlock(old);
  assert.deepEqual(block.entries.map((e) => e.role), ['message', 'diagnosis', 'hint']);
  assert.ok(!block.lines.some((line) => line.startsWith(VERDICT_TEXTS.oldStyle)));
  assert.equal(block.lines[1], old.diagnosis.message);
  assert.match(block.lines[1], /«but-2-eno»/);

  // An old-style name with an earlier mistake: its diagnosis, then the note.
  const numbered = verdictOf('2-metil-3-buteno');
  assert.equal(numbered.kind, 'otherName');
  assert.notEqual(numbered.diagnosis.code, 'OLD_STYLE');
  const both = verdictBlock(numbered);
  assert.deepEqual(both.entries.map((e) => e.role), ['message', 'diagnosis', 'hint', 'note']);
  assert.equal(both.lines[3], numbered.notes[0]);
  assert.ok(both.lines[3].startsWith(VERDICT_TEXTS.oldStyle));
}); // End of test 'the old style…'

test('the student\'s prefix style: the name the stepper explains, with its label, before the diagnosis', () => {
  const verdict = verdictOf('6-metil-4-(propan-2-il)nonano');
  assert.equal(verdict.diagnosis.code, 'NUMBERING');
  assert.equal(verdict.diagnosis.style, 'pin');
  const explanation = diagnosisExplanation(verdict, explain);
  assert.equal(explanation.naming.name, '4-metil-6-(propan-2-il)nonano');
  const block = verdictBlock(verdict, explanation);
  assert.deepEqual(block.entries.map((e) => e.role), ['message', 'style', 'diagnosis', 'hint']);
  // «Se llama» keeps the default name; the style line names the explained one.
  assert.equal(block.lines[0], 'Esta es la molécula que describe tu nombre, pero se llama «4-isopropil-6-metilnonano».');
  assert.equal(block.lines[1], styleLine('4-metil-6-(propan-2-il)nonano', 'nombre preferido por la IUPAC (2013)'));
  assert.equal(block.lines[1], 'Con las ramas escritas como en tu nombre, se escribe «4-metil-6-(propan-2-il)nonano» '
    + '(nombre preferido por la IUPAC (2013)). El paso a paso usa ese nombre.');
  // Without the explanation (or in the default style) there is no style line.
  assert.deepEqual(verdictBlock(verdict).entries.map((e) => e.role), ['message', 'diagnosis', 'hint']);
  const plain = verdictOf('2-etilbutano');
  assert.equal(plain.diagnosis.style, 'isopropil');
  assert.deepEqual(verdictBlock(plain, diagnosisExplanation(plain, explain)).entries.map((e) => e.role),
    ['message', 'diagnosis', 'hint']);
  assert.equal(styleLine('x', null), 'Con las ramas escritas como en tu nombre, se escribe «x». El paso a paso usa ese nombre.');
}); // End of test 'the student\'s prefix style…'

test('diagnosisLegend(): the parent and the student\'s chain, said to be the same when the atoms and bonds are', () => {
  const longer = verdictOf('2-etilbutano').diagnosis;
  assert.deepEqual(diagnosisLegend(longer), [
    { style: 'parent', text: 'Cadena principal' }, { style: 'student', text: 'Tu cadena' },
  ]);
  // Numbered from the other end: the same chain in the other order.
  const numbering = verdictOf('4-metilpentano').diagnosis;
  assert.deepEqual(numbering.student.atoms, [...numbering.parent.atoms].reverse());
  assert.deepEqual(diagnosisLegend(numbering), [
    { style: 'parent', text: 'Cadena principal' }, { style: 'student', text: 'Tu cadena (es la misma)' },
  ]);
  assert.equal(diagnosisLegend(null), null);
  assert.equal(diagnosisLegend({ ...longer, student: { atoms: [], bonds: [] } }), null);
  assert.deepEqual(Object.keys(LEGEND_TEXTS).sort(), ['label', 'parent', 'parentRing', 'same', 'sameRing', 'student', 'studentRing']);
  assert.equal(DIAGNOSIS_STEP_LABEL, 'Ver el paso');
  assert.equal(verdictBlock(verdictOf('2-etilbutano')).diagnosis.legend[1].text, 'Tu cadena');
}); // End of test 'diagnosisLegend()…'

test('diagnosisLegend() with a ring (I-50d): the app\'s ring beside the student\'s chain, or the same ring numbered otherwise', () => {
  // The ring is the parent, the student's three-carbon chain one of its branches.
  const ringParent = verdictOf('1-(4-metilfenil)propano').diagnosis;
  assert.equal(ringParent.code, 'RING_IS_PARENT');
  assert.deepEqual([ringParent.student.atoms.length, ringParent.student.bonds.length], [3, 2]);
  assert.deepEqual([ringParent.parent.atoms.length, ringParent.parent.bonds.length], [6, 6], 'the ring, its closing bond too');
  assert.deepEqual(diagnosisLegend(ringParent), [
    { style: 'parent', text: 'Cadena principal (el anillo)' }, { style: 'student', text: 'Tu cadena' },
  ]);
  // The student's ring is the app's, numbered from another carbon.
  const numbering = verdictOf('1,5-dimetilciclohexano').diagnosis;
  assert.equal(numbering.code, 'RING_NUMBERING');
  assert.notDeepEqual(numbering.student.atoms, numbering.parent.atoms);
  assert.deepEqual(diagnosisLegend(numbering), [
    { style: 'parent', text: 'Cadena principal (el anillo)' }, { style: 'student', text: 'Tu anillo (es el mismo)' },
  ]);
  assert.deepEqual(verdictBlock(verdictOf('1-(4-metilfenil)propano')).diagnosis,
    { code: 'RING_IS_PARENT', legend: diagnosisLegend(ringParent) });
  // Never mistaken for a ring: a three-carbon chain has two bonds.
  assert.equal(diagnosisLegend({ student: { atoms: [1, 2, 3], bonds: [1, 2] }, parent: { atoms: [1, 2, 3], bonds: [1, 2] } })[1].text,
    'Tu cadena (es la misma)');
  assert.equal(diagnosisLegend({ student: { atoms: [1, 2, 3], bonds: [1, 2, 3] }, parent: { atoms: [3, 2, 1], bonds: [2, 1, 3] } })[1]
    .text, 'Tu anillo (es el mismo)');
}); // End of test 'diagnosisLegend() with a ring (I-50d)…'

test('verdictEntries(): a message that does not end with the hint keeps it whole, the diagnosis after it', () => {
  const verdict = verdictOf('metiletano');
  const entries = verdictEntries({ ...verdict, message: 'Otro texto.' }, null);
  assert.deepEqual(entries, [{ role: 'message', text: 'Otro texto.' }, { role: 'diagnosis', text: verdict.diagnosis.message }]);
});

test('studentParts(): spans that do not give the text back fall back to one part', () => {
  assert.deepEqual(studentParts({ text: 'hexano', spans: [{ from: 0, to: 3, kind: 'stem' }] }), [{ text: 'hexano', kind: 'stem' }]);
  assert.deepEqual(studentParts({ text: 'hexano', spans: [] }), [{ text: 'hexano', kind: 'stem' }]);
  assert.deepEqual(studentParts({ text: 'hexano', spans: [{ from: 0, to: 3, kind: 'stem' }, { from: 3, to: 6, kind: 'ending' }] }),
    [{ text: 'hex', kind: 'stem' }, { text: 'ano', kind: 'ending' }]);
});
