/**
 * @file Unit tests for the DOM-free editing state of the «¿Cómo se dibuja?»
 * dialog (src/ui/name-builder-state.js, design.md §15.2, phase R-2a):
 * insertion after the selection, «Borrar ficha» / «Borrar todo», the
 * selection and its keyboard moves, the tile cap, unfinished compound
 * branches, and the feedback of «Dibujar» (error tile ranges → marked
 * tiles; any edit clears it).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createNameBuilderState, errorTileIndices, verdictFeedback, isSuccess, SUCCESS_KINDS, MAX_TILES, START,
} from '../../src/ui/name-builder-state.js';
import { readName, VERDICT_KINDS } from '../../src/reverse/index.js';
import { START_ID, END_ID } from '../../src/reverse/tiles.js';

/** Tiles of 2-metilbutano. */
const METHYLBUTANE = ['num-2', 'root-1', 'fv-1', 'root-4', 'ending-saturated'];

/**
 * A state holding a tile sequence, inserted one by one (nothing selected first).
 *
 * @param {string[]} ids - Tile ids.
 * @param {object} [options] - createNameBuilderState() options.
 * @returns {object} The state.
 */
function stateWith(ids, options) {
  const state = createNameBuilderState(options);
  ids.forEach((id) => assert.equal(state.insert(id), true));
  return state;
}

test('inserting at the end: each new tile becomes the selection and the name assembles from the tree', () => {
  const state = createNameBuilderState();
  assert.equal(state.selection(), null);
  assert.equal(state.view().text, '');
  assert.deepEqual(state.view().pieces, []);
  METHYLBUTANE.forEach((id, i) => {
    state.insert(id);
    assert.equal(state.selection(), i);
  });
  assert.deepEqual(state.tiles(), METHYLBUTANE);
  const view = state.view();
  assert.equal(view.text, '2-metilbutano');
  assert.equal(view.count, 5);
  // One piece per tile, coloured by part kind; automatic text has no tile.
  const tilePieces = view.pieces.filter((p) => p.tile !== null);
  assert.deepEqual(tilePieces.map((p) => [p.tile, p.text, p.kind, p.tileKind]), [
    [0, '2', 'locant', 'num'], [1, 'met', 'prefix', 'root'], [2, 'il', 'prefix', 'freeValence'],
    [3, 'but', 'stem', 'root'], [4, 'ano', 'ending', 'ending'],
  ]);
  assert.deepEqual(view.pieces.filter((p) => p.tile === null).map((p) => [p.text, p.kind]), [['-', 'punct']]);
  assert.deepEqual(view.pieces.filter((p) => p.selected).map((p) => p.tile), [4]);
  // tiles() is a copy.
  state.tiles().push('num-3');
  assert.equal(state.count(), 5);
}); // End of test 'inserting at the end…'

test('a tile goes after the selected one, or at the front from START, and becomes the selection', () => {
  const state = stateWith(['num-2', 'root-1', 'fv-1', 'root-5', 'ending-saturated']);
  assert.equal(state.view().text, '2-metilpentano');
  assert.equal(state.select(0), true);
  state.insert('num-3');
  assert.equal(state.selection(), 1);
  assert.equal(state.view().text, '2,3-metilpentano');
  state.insert('mult-2');
  assert.equal(state.view().text, '2,3-dimetilpentano');
  assert.equal(state.selection(), 2);

  const front = stateWith(['root-1', 'fv-1', 'root-4', 'ending-saturated']);
  assert.equal(front.select(START), true);
  assert.equal(front.selection(), START);
  front.insert('num-2');
  assert.equal(front.selection(), 0);
  assert.equal(front.view().text, '2-metilbutano');
}); // End of test 'a tile goes after the selected one…'

test('«Borrar ficha» removes the selected tile (its predecessor, or START, is selected), else the last one', () => {
  const state = stateWith(METHYLBUTANE);
  state.select(2);
  assert.equal(state.remove(), true);
  assert.deepEqual(state.tiles(), ['num-2', 'root-1', 'root-4', 'ending-saturated']);
  assert.equal(state.selection(), 1);
  // The next tile takes the removed one's place.
  state.insert('fv-1');
  assert.deepEqual(state.tiles(), METHYLBUTANE);

  state.select(0);
  assert.equal(state.remove(), true);
  assert.equal(state.selection(), START);
  assert.deepEqual(state.tiles(), METHYLBUTANE.slice(1));
  // At START there is nothing before the insertion point: nothing is removed.
  assert.equal(state.remove(), false);
  assert.equal(state.count(), 4);

  // With nothing selected, the last tile goes and nothing becomes selected.
  state.select(null);
  assert.equal(state.remove(), true);
  assert.deepEqual(state.tiles(), ['root-1', 'fv-1', 'root-4']);
  assert.equal(state.selection(), null);

  // Removing the only tile leaves no selection.
  const one = stateWith(['root-4']);
  assert.equal(one.remove(), true);
  assert.equal(one.selection(), null);
  assert.equal(one.remove(), false);
}); // End of test '«Borrar ficha» removes the selected tile (its predecessor…'

test('«Borrar todo» empties the name', () => {
  const state = stateWith(METHYLBUTANE);
  assert.equal(state.clear(), true);
  assert.deepEqual(state.tiles(), []);
  assert.equal(state.selection(), null);
  assert.equal(state.view().text, '');
  assert.equal(state.clear(), false);
});

test('selection: clamped to the tiles, START only with tiles; arrow moves start from the last tile', () => {
  const state = createNameBuilderState();
  assert.equal(state.select(START), false);
  assert.equal(state.selection(), null);
  assert.equal(state.moveSelection(-1), false);
  ['root-4', 'ending-saturated'].forEach((id) => state.insert(id));
  state.select(null);
  assert.equal(state.select(7), true);
  assert.equal(state.selection(), 1);
  assert.equal(state.select(-5), true);
  assert.equal(state.selection(), START);
  assert.equal(state.select(START), false);

  state.select(null);
  assert.equal(state.moveSelection(-1), true);
  assert.equal(state.selection(), 0);
  assert.equal(state.moveSelection(-1), true);
  assert.equal(state.selection(), START);
  assert.equal(state.moveSelection(-1), false);
  assert.equal(state.moveSelection(1), true);
  assert.equal(state.moveSelection(1), true);
  assert.equal(state.selection(), 1);
  assert.equal(state.moveSelection(1), false);
  // Selecting is not an edit: the name is unchanged.
  assert.equal(state.view().text, 'butano');
}); // End of test 'selection…'

test(`the cap: at most ${MAX_TILES} tiles by default; beyond it insert() refuses`, () => {
  assert.ok(MAX_TILES >= 100 && MAX_TILES <= 200);
  assert.equal(createNameBuilderState().cap, MAX_TILES);
  const state = stateWith(['root-4', 'ending-saturated', 'num-2'], { cap: 3 });
  assert.equal(state.isFull(), true);
  assert.equal(state.view().full, true);
  assert.equal(state.insert('num-3'), false);
  assert.equal(state.count(), 3);
  state.remove();
  assert.equal(state.isFull(), false);
  assert.equal(state.insert('num-3'), true);

  const big = createNameBuilderState();
  for (let i = 0; i < MAX_TILES; i += 1) {
    assert.equal(big.insert('num-2'), true);
  }
  assert.equal(big.insert('num-2'), false);
  assert.equal(big.count(), MAX_TILES);
}); // End of test 'the cap…'

test('an unknown tile id throws', () => {
  assert.throws(() => createNameBuilderState().insert('no-such-tile'), /unknown tile/);
});

test('an unfinished compound branch: its opening mark is pending until «acaba rama»', () => {
  const state = stateWith([START_ID, 'num-2']);
  let view = state.view();
  assert.equal(view.text, '(2');
  assert.deepEqual(view.openBranches, [0]);
  assert.deepEqual(view.pieces.filter((p) => p.pending).map((p) => [p.tile, p.text, p.tileKind]), [[0, '(', 'start']]);
  ['num-2', 'mult-2', 'root-1', 'fv-1', 'root-3', 'fv-1', END_ID, 'root-9', 'ending-saturated'].forEach((id) => state.insert(id));
  state.select(START);
  ['num-5', 'num-5', 'cmult-2'].forEach((id) => state.insert(id));
  view = state.view();
  assert.equal(view.text, '5,5-bis(2,2-dimetilpropil)nonano');
  assert.deepEqual(view.openBranches, []);
  assert.equal(view.pieces.some((p) => p.pending), false);

  // A compound branch that needs no marks: its controls are empty pieces, still one per tile.
  const silent = stateWith([START_ID, 'root-1', 'fv-1', END_ID, 'root-4', 'ending-saturated']);
  const pieces = silent.view().pieces.filter((p) => p.tile !== null);
  assert.equal(silent.view().text, 'metilbutano');
  assert.deepEqual(pieces.map((p) => [p.tile, p.text]), [[0, ''], [1, 'met'], [2, 'il'], [3, ''], [4, 'but'], [5, 'ano']]);
}); // End of test 'an unfinished compound branch…'

test('errorTileIndices: tile ranges [from, to) to indices, clamped; an empty range marks nothing', () => {
  assert.deepEqual(errorTileIndices([{ from: 0, to: 0 }], 0), []);
  assert.deepEqual(errorTileIndices([{ from: 0, to: 2 }], 6), [0, 1]);
  assert.deepEqual(errorTileIndices([{ from: 3, to: 6 }, { from: 1, to: 4 }], 5), [1, 2, 3, 4]);
  assert.deepEqual(errorTileIndices([{ from: 4, to: 4 }], 4), []);
  assert.deepEqual(errorTileIndices(undefined, 3), []);
});

test('success verdicts are exactly the ones readName() draws', () => {
  assert.deepEqual([...SUCCESS_KINDS].sort(), ['alternative', 'correct', 'missingLocants', 'otherName']);
  assert.ok(SUCCESS_KINDS.every((kind) => VERDICT_KINDS.includes(kind)));
  const cases = [
    [METHYLBUTANE, 'correct'],
    [['root-1', 'fv-1', 'root-3', 'ending-saturated'], 'missingLocants'],
    [['root-1', 'fv-1', 'root-2', 'ending-saturated'], 'otherName'],
    [['root-4', 'ending-double'], 'ambiguous'],
    [[], 'invalid'],
    [['root-4'], 'invalid'],
  ];
  for (const [ids, kind] of cases) {
    const verdict = readName(ids);
    assert.equal(verdict.kind, kind, ids.join(' '));
    assert.equal(isSuccess(verdict), verdict.draw, ids.join(' '));
  }
  assert.equal(isSuccess(null), false);
}); // End of test 'success verdicts are exactly the ones readName() draws'

test('verdictFeedback: a failure marks its error tiles; a success marks none', () => {
  const wrong = ['num-2', 'num-3', 'root-1', 'fv-1', 'root-4', 'ending-saturated'];
  const invalid = verdictFeedback(readName(wrong), wrong.length);
  assert.equal(invalid.tone, 'error');
  assert.deepEqual(invalid.lines, ['Con dos números hace falta «di».']);
  assert.deepEqual(invalid.invalid, [0, 1]);

  const empty = verdictFeedback(readName([]), 0);
  assert.deepEqual(empty, { tone: 'error', lines: ['Elige fichas para formar un nombre.'], invalid: [] });

  const ambiguous = verdictFeedback(readName(['root-4', 'ending-double']), 2);
  assert.equal(ambiguous.tone, 'error');
  assert.deepEqual(ambiguous.lines, ['Faltan números: puede ser but-1-eno o but-2-eno.']);
  assert.deepEqual(ambiguous.invalid, []);

  const correct = verdictFeedback(readName(METHYLBUTANE), METHYLBUTANE.length);
  assert.deepEqual(correct, { tone: 'success', lines: ['¡Correcto!'], invalid: [] });

  // Notes follow the message (the old-style note).
  const oldStyle = verdictFeedback(readName(['num-2', 'root-4', 'ending-double']), 3);
  assert.equal(oldStyle.lines.length, 2);
  assert.match(oldStyle.lines[1], /forma antigua.*but-2-eno/);
}); // End of test 'verdictFeedback…'

test('feedback shows on the pieces until any edit clears it; selecting keeps it', () => {
  const wrong = ['num-2', 'num-3', 'root-1', 'fv-1', 'root-4', 'ending-saturated'];
  const state = stateWith(wrong);
  state.setFeedback(verdictFeedback(readName(state.tiles()), state.count()));
  assert.deepEqual(state.view().pieces.filter((p) => p.invalid).map((p) => p.tile), [0, 1]);
  assert.equal(state.feedback().tone, 'error');
  state.select(0);
  assert.notEqual(state.feedback(), null);
  // Insert, remove and clear each clear the feedback and the marks.
  for (const edit of [(s) => s.insert('mult-2'), (s) => s.remove(), (s) => s.clear()]) {
    state.setFeedback({ tone: 'error', lines: ['x'], invalid: [0] });
    edit(state);
    assert.equal(state.feedback(), null);
    assert.equal(state.view().pieces.some((p) => p.invalid), false);
  }
  // Out-of-range indices are dropped; clearFeedback() removes it.
  const other = stateWith(['root-4']);
  other.setFeedback({ tone: 'error', lines: ['x'], invalid: [0, 3, -1] });
  assert.deepEqual(other.feedback().invalid, [0]);
  other.clearFeedback();
  assert.equal(other.feedback(), null);
}); // End of test 'feedback shows on the pieces until any edit clears it…'

test('the state module is DOM-free and saves nothing', async () => {
  const source = await readFile(new URL('../../src/ui/name-builder-state.js', import.meta.url), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\b(document|window|localStorage|sessionStorage|HTMLElement)\b/);
});
