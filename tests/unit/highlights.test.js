/**
 * @file Unit tests for the "Resaltar en el dibujo" switch (phase I-16,
 * design.md §9): canvasMarks() hides every canvas mark when the switch is
 * off, makeMarksToggle() builds an accessible toggle button, and the
 * preference key round-trips through the try/catch storage helpers. Phase
 * I-49b: withStudentChain() adds a diagnosis's student chain under the
 * view's marks, and verdictExplanation() gives the explanation in the
 * student's prefix style.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canvasMarks, makeMarksToggle, MARKS_LABEL, withStudentChain, verdictExplanation } from '../../src/ui/results.js';
import { MARKS_KEY, readItem, writeItem } from '../../src/ui/autosave.js';
import { HIGHLIGHT_STYLES, normalizeHighlight } from '../../src/editor/render.js';
import { readName } from '../../src/reverse/index.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { explain } from '../../src/explain/explain.js';

const VIEW = Object.freeze({
  highlight: [{ atoms: [1, 2], bonds: [1], style: 'parent' }, { atoms: [3], bonds: [], style: 'substituent' }],
  locants: [[1, 1], [2, 2]],
});

test('canvasMarks passes the view through when the marks are on', () => {
  assert.deepEqual(canvasMarks(VIEW, true), { highlight: VIEW.highlight, locants: VIEW.locants });
  assert.deepEqual(canvasMarks({ highlight: VIEW.highlight, locants: null }, true), { highlight: VIEW.highlight, locants: null });
  assert.deepEqual(canvasMarks(null, true), { highlight: null, locants: null });
});

test('canvasMarks draws nothing when the marks are off, whatever the view', () => {
  assert.deepEqual(canvasMarks(VIEW, false), { highlight: null, locants: null });
  assert.deepEqual(canvasMarks(null, false), { highlight: null, locants: null });
});

/**
 * A minimal fake document whose buttons record attributes and listeners.
 *
 * @returns {{createElement: function(string): object}} The fake document.
 */
function fakeDocument() {
  return {
    createElement: (tag) => {
      const attributes = new Map();
      const listeners = [];
      return {
        tag,
        attributes,
        listeners,
        setAttribute: (name, value) => attributes.set(name, value),
        getAttribute: (name) => attributes.get(name),
        addEventListener: (type, fn) => listeners.push([type, fn]),
      };
    },
  };
}

test('makeMarksToggle builds a toggle button with aria-pressed and a Spanish label', () => {
  let presses = 0;
  const on = makeMarksToggle(fakeDocument(), 'stepper-marks-toggle', true, () => { presses += 1; });
  assert.equal(on.tag, 'button');
  assert.equal(on.type, 'button');
  assert.equal(on.id, 'stepper-marks-toggle');
  assert.equal(on.className, 'marks-toggle');
  assert.equal(on.textContent, MARKS_LABEL);
  assert.equal(MARKS_LABEL, 'Resaltar en el dibujo');
  assert.equal(on.getAttribute('aria-pressed'), 'true');
  assert.deepEqual(on.listeners.map(([type]) => type), ['click']);
  on.listeners[0][1]();
  assert.equal(presses, 1);
  const off = makeMarksToggle(fakeDocument(), 'result-marks-toggle', false, () => {});
  assert.equal(off.getAttribute('aria-pressed'), 'false');
});

test('the preference is stored under organicWeb.highlights and storage errors are swallowed', () => {
  assert.equal(MARKS_KEY, 'organicWeb.highlights');
  const data = new Map();
  const storage = { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) };
  assert.equal(readItem(storage, MARKS_KEY), null); // Missing: the app treats it as on.
  assert.equal(writeItem(storage, MARKS_KEY, 'off'), true);
  assert.equal(readItem(storage, MARKS_KEY), 'off');
  const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('full'); } };
  assert.equal(readItem(broken, MARKS_KEY), null);
  assert.equal(writeItem(broken, MARKS_KEY, 'off'), false);
});

test('withStudentChain() puts the student\'s chain first (drawn lowest), leaves option views and no chain alone (I-49b)', () => {
  const chain = { atoms: [1, 2, 3], bonds: [1, 2] };
  const shown = withStudentChain(VIEW, chain);
  assert.deepEqual(shown.highlight, [{ atoms: [1, 2, 3], bonds: [1, 2], style: 'student' }, ...VIEW.highlight]);
  assert.equal(shown.locants, VIEW.locants);
  // The view itself is not changed, and the chain is copied.
  assert.equal(VIEW.highlight.length, 2);
  assert.notEqual(shown.highlight[0].atoms, chain.atoms);
  assert.deepEqual(withStudentChain({ highlight: undefined, locants: null }, chain).highlight, [{ ...chain, style: 'student' }]);
  assert.equal(withStudentChain(VIEW, chain, true), VIEW);
  assert.equal(withStudentChain(VIEW, null), VIEW);
  assert.equal(withStudentChain(VIEW, { atoms: [], bonds: [] }), VIEW);
  assert.equal(withStudentChain(null, chain), null);
  // The diagnosis's parent joins a view without a parent band (a coordinate-only edit ends the
  // ordered marks), under the view's marks; a view with its own parent band keeps it alone.
  const parent = { atoms: [1, 2, 3, 4], bonds: [1, 2, 3] };
  assert.deepEqual(withStudentChain({ highlight: [], locants: null }, chain, false, parent).highlight,
    [{ ...chain, style: 'student' }, { ...parent, style: 'parent' }]);
  const banded = { highlight: [{ atoms: [9], bonds: [], style: 'parent' }], locants: null };
  assert.deepEqual(withStudentChain(banded, chain, false, parent).highlight, [{ ...chain, style: 'student' }, ...banded.highlight]);
  assert.equal(withStudentChain(VIEW, chain, true, parent), VIEW);
  assert.equal(withStudentChain(VIEW, null, false, parent), VIEW);
  // The switch still hides everything, the student's chain included.
  assert.deepEqual(canvasMarks(shown, false), { highlight: null, locants: null });
  // The renderer accepts the style (an unknown one would fall back to `parent`).
  assert.ok(HIGHLIGHT_STYLES.includes('student'));
  assert.deepEqual(normalizeHighlight(shown.highlight)[0], { atoms: [1, 2, 3], bonds: [1, 2], style: 'student' });
}); // End of test 'withStudentChain()…'

test('verdictExplanation(): the student-style explanation of a diagnosed otherName, never the default one when the style differs', () => {
  /**
   * Reads a name written as text.
   *
   * @param {string} text - A name.
   * @returns {object} readName() of its tiles.
   */
  const read = (text) => readName(tokenize(text));
  const pin = read('6-metil-4-(propan-2-il)nonano');
  const explanation = verdictExplanation(pin);
  assert.equal(explanation.naming.name, '4-metil-6-(propan-2-il)nonano');
  assert.equal(explanation.steps[explanation.index].id, 'numbering');
  // Its numbering step numbers the parent the app's way in that style (methyl at 4), unlike explain(verdict.naming).
  const numbering = explanation.steps[explanation.index];
  const methyl = pin.diagnosis.parent.atoms[3];
  assert.deepEqual(numbering.locants.find(([id]) => id === methyl), [methyl, 4]);
  const defaultSteps = explain(pin.naming);
  const defaultNumbering = defaultSteps.find((step) => step.id === 'numbering');
  assert.notDeepEqual(defaultNumbering.locants, numbering.locants);
  assert.deepEqual(defaultNumbering.locants.find(([id]) => id === methyl), [methyl, 6]); // The student's own numbering.

  // The default style: the usual steps, opened at the diagnosis's step.
  const longer = read('2-etilbutano');
  const usual = verdictExplanation(longer);
  assert.equal(usual.naming, longer.naming);
  assert.deepEqual(usual.steps, explain(longer.naming));
  assert.equal(usual.steps[usual.index].id, 'chain');

  // No diagnosis, or another kind: none.
  assert.equal(verdictExplanation(read('4-(1,1-dimetiletil)heptano')), null);
  assert.equal(verdictExplanation(read('2-metilbutano')), null);
  assert.equal(verdictExplanation(null), null);
  // An explanation without steps is not used.
  assert.equal(verdictExplanation(longer, () => []), null);
}); // End of test 'verdictExplanation()…'

test('verdictExplanation(): a failing explanation is not used (the verdict never depends on its diagnosis)', () => {
  const verdict = readName(tokenize('2-etilbutano'));
  assert.equal(verdictExplanation(verdict, () => { throw new Error('boom'); }), null);
});
