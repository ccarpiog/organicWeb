/**
 * @file Unit tests for the phase I-12 helpers: glossary tooltip placement
 * (src/ui/results.js) and the Ayuda glossary list (src/ui/help.js).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tipPlacement } from '../../src/ui/results.js';
import { fillGlossary } from '../../src/ui/help.js';
import { GLOSSARY } from '../../src/explain/explain.js';

test('tipPlacement keeps a glossary tooltip inside the window', () => {
  // Plenty of room: no shift, full width.
  assert.deepEqual(tipPlacement(100, 1280), { shift: 0, width: 256 });
  // Near the right edge of a phone: shifted left so that it ends 8 px from the edge.
  const near = tipPlacement(235, 375);
  assert.equal(near.width, 256);
  assert.equal(235 + near.shift + near.width, 375 - 8);
  // Never shifted past the left margin.
  const narrow = tipPlacement(20, 200);
  assert.equal(narrow.width, 184);
  assert.equal(20 + narrow.shift, 8);
});

test('fillGlossary lists every glossary term with its definition', () => {
  const made = [];
  const doc = {
    createElement: (tag) => {
      const node = { tag, textContent: '' };
      made.push(node);
      return node;
    },
  };
  const appended = [];
  const list = { ownerDocument: doc, replaceChildren: () => appended.splice(0), append: (...nodes) => appended.push(...nodes) };
  fillGlossary(list);
  const entries = Object.entries(GLOSSARY);
  assert.equal(appended.length, entries.length * 2);
  assert.equal(appended[0].tag, 'dt');
  assert.equal(appended[0].textContent, 'Cadena principal');
  assert.equal(appended[1].tag, 'dd');
  assert.equal(appended[1].textContent, entries[0][1]);
});
