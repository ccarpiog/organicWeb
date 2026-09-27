/**
 * @file Unit tests for the "Resaltar en el dibujo" switch (phase I-16,
 * design.md §9): canvasMarks() hides every canvas mark when the switch is
 * off, makeMarksToggle() builds an accessible toggle button, and the
 * preference key round-trips through the try/catch storage helpers.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canvasMarks, makeMarksToggle, MARKS_LABEL } from '../../src/ui/results.js';
import { MARKS_KEY, readItem, writeItem } from '../../src/ui/autosave.js';

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
