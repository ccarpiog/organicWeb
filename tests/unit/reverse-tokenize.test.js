/**
 * @file Unit tests for the tokenizer of «¿Cómo se dibuja?»
 * (src/reverse/tokenize.js, design.md §15.4, §15.7, phase R-1a): the
 * inverse of the assembler. The fixture round trip covers every open-chain
 * hydrocarbon name and alternative of tests/fixtures/names.tsv (rows chosen
 * by an explicit SMILES syntax check, never by "tokenize failed"), and a
 * seeded property test reads back the text of random grammatical sequences.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { tokenize, TOKENIZE_BUDGET, TOKENIZE_MAX_LENGTH } from '../../src/reverse/tokenize.js';
import { stem, multiplier, compoundMultiplier, ENDINGS, FREE_VALENCE_SUFFIXES } from '../../src/naming/lexicon.es.js';
import { seq, readFixtures, isOpenChainHydrocarbon } from './reverse-words.js';

/** Fixture rows of open-chain hydrocarbons (phase R-1a scope). */
const EXPECTED_ROWS = 176;

/** Names and alternatives of those rows. */
const EXPECTED_NAMES = 204;

/**
 * Reads a tile sequence back as text.
 *
 * @param {string[]} ids - Tile ids.
 * @returns {{text: string, errors: object[]}} The assembled text and the parse errors.
 */
function readBack(ids) {
  const { tree, errors } = parse(ids);
  return { text: assemble(tree).text, errors };
}

test('fixture round trip: every open-chain hydrocarbon name and alternative', async () => {
  const rows = (await readFixtures()).filter((row) => isOpenChainHydrocarbon(row.smiles));
  let covered = 0;
  for (const row of rows) {
    for (const name of row.names) {
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      const back = readBack(ids);
      assert.deepEqual(back.errors, [], `names.tsv:${row.line}: ${name}`);
      assert.equal(back.text, name, `names.tsv:${row.line}`);
      covered += 1;
    }
  } // End of the loop over the fixture rows
  assert.equal(rows.length, EXPECTED_ROWS);
  assert.equal(covered, EXPECTED_NAMES);
}); // End of test 'fixture round trip: every open-chain hydrocarbon name and alternative'

test('the §15.5.1 examples tokenize to the tiles of the design', () => {
  const examples = [
    ['hexano', 'hex ano'],
    ['2,3-dimetilpentano', '2 3 di met il pent ano'],
    ['buta-1,3-dieno', 'but 1 3 di eno'],
    ['hex-1-en-3,5-diino', 'hex 1 eno 3 5 di ino'],
    ['4-(propan-2-il)heptano', '4 prop ano 2 il hept ano'],
    ['5-etenilidennonano', '5 et eno iliden non ano'],
    ['5,5-bis(2,2-dimetilpropil)nonano', '5 5 bis START 2 2 di met il prop il END non ano'],
    ['5,5-di-tert-butilnonano', '5 5 di tert-butil non ano'],
    ['2-buteno', '2 but eno'],
  ];
  for (const [name, words] of examples) {
    assert.deepEqual(tokenize(name), seq(words), name);
  }
}); // End of test 'the §15.5.1 examples tokenize to the tiles of the design'

test('tokenize prefers whole words and automatic marks for simple branches', () => {
  assert.deepEqual(tokenize('tridecano'), seq('tridec ano')); // not `tri dec ano`
  assert.deepEqual(tokenize('5-tridecilnonano'), seq('5 tridec il non ano')); // `tri dec il` needs three locants
  assert.deepEqual(tokenize('5-(prop-2-en-1-il)nonano'), seq('5 prop 2 eno 1 il non ano')); // no START / END
  assert.deepEqual(tokenize('8-[2-(propan-2-iliden)hexil]pentadecano'),
    seq('8 START 2 prop ano 2 iliden hex il END pentadec ano'));
  assert.deepEqual(tokenize('2-metil-2-buteno'), seq('2 met il 2 but eno'));
  assert.deepEqual(tokenize('1,3-butadieno'), seq('1 3 but di eno'));
  assert.deepEqual(tokenize('propadieno'), seq('prop di eno'));
}); // End of test 'tokenize prefers whole words and automatic marks for simple branches'

test('tokenize returns null outside the grammar, for texts that only read with errors, and past its budget', () => {
  for (const text of ['', 'ácido etanoico', 'ciclohexano', 'clorometano', 'propan-2-ol', 'metilbenceno', 'hex ano', 'HEXANO']) {
    assert.equal(tokenize(text), null, text);
  }
  for (const text of ['2,3-trimetilpentano', '1,3-hexenino', 'hexano-2-metil', '2-metil', '5-(2-metilpropil', 'propil']) {
    assert.equal(tokenize(text), null, text);
  }
  assert.ok(TOKENIZE_BUDGET > 0);
  assert.equal(tokenize('5,5-bis(2,2-dimetilpropil)nonano', { budget: 5 }), null);
  const start = performance.now();
  assert.equal(tokenize(`${'('.repeat(40)}metano${')'.repeat(40)}`), null);
  assert.ok(performance.now() - start < 2000, 'the budget bounds the search');
}); // End of test 'tokenize returns null outside the grammar, for texts that only read with errors, and past its budget'

test('tokenize never exhausts the stack: deep nesting and over-long texts return null (review I-47a)', () => {
  assert.equal(tokenize(`${'('.repeat(3000)}metano${')'.repeat(3000)}`), null);
  assert.equal(tokenize('metil'.repeat(TOKENIZE_MAX_LENGTH)), null);
  const deepest = Math.floor((TOKENIZE_MAX_LENGTH - 'metano'.length) / 2);
  assert.equal(tokenize(`${'('.repeat(deepest)}metano${')'.repeat(deepest)}`), null);
  assert.deepEqual(tokenize('metano'), seq('met ano'));
});

test('tokenize compares in NFC', () => {
  assert.deepEqual(tokenize('hexano'.normalize('NFD')), seq('hex ano'));
});

/**
 * Seeded pseudo-random generator (mulberry32).
 *
 * @param {number} seed - The seed.
 * @returns {() => number} A function returning numbers in [0, 1).
 */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generator of grammatical tile sequences (design.md §15.5.1), as tile
 * words: prefixes (simple, retained, compound up to two levels deep) with
 * locant counts that match their multipliers (or left out), and a parent
 * with `ano` or one or two segments, sometimes in the old style.
 *
 * @param {() => number} random - The random source.
 * @returns {() => string[]} A function returning one sequence of tile words.
 */
function grammarGenerator(random) {
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const nums = (k) => Array.from({ length: k }, () => String(int(1, 30)));
  const fv = () => FREE_VALENCE_SUFFIXES[int(1, 2)];
  /**
   * One unsaturation segment, with or without its locants.
   *
   * @param {boolean} located - Whether to cite its locants.
   * @returns {string[]} The words.
   */
  const segment = (located) => {
    const k = int(1, 3);
    return [...(located ? nums(k) : []), ...(k > 1 ? [multiplier(k)] : []), pick([ENDINGS.double, ENDINGS.triple])];
  };
  /**
   * A simple branch (design.md §15.5.1 `simple`).
   *
   * @returns {string[]} The words.
   */
  const simple = () => {
    const form = int(0, 3);
    const root = stem(int(1, 30));
    if (form === 0) {
      return [root, fv()];
    }
    if (form === 1) {
      return [root, ...(random() < 0.5 ? [ENDINGS.saturated] : []), ...nums(1), fv()];
    }
    if (form === 2) {
      const segments = Array.from({ length: int(1, 2) }, () => segment(random() < 0.7)).flat();
      return [root, ...segments, ...(random() < 0.6 ? nums(1) : []), fv()];
    }
    return [pick(['isopropil', 'isopropiliden', 'tert-butil'])];
  }; // End of function simple()
  /**
   * A prefix: locants (or none), multiplier, substituent.
   *
   * @param {number} depth - Nesting depth of compound branches.
   * @returns {string[]} The words.
   */
  const prefix = (depth) => {
    const k = int(1, 3);
    const branch = depth < 2 && random() < 0.3;
    const mult = k > 1 ? [pick([multiplier(k), compoundMultiplier(k)])] : [];
    const substituent = branch
      ? ['START', ...Array.from({ length: int(1, 2) }, () => prefix(depth + 1)).flat(), ...simple(), 'END']
      : simple();
    return [...(random() < 0.85 ? nums(k) : []), ...mult, ...substituent];
  }; // End of function prefix()
  /**
   * The parent: `ano`, or segments, sometimes with old-style locants.
   *
   * @returns {string[]} The words.
   */
  const parent = () => {
    const root = stem(int(1, 30));
    const form = int(0, 2);
    if (form === 0) {
      return [root, ENDINGS.saturated];
    }
    if (form === 1) {
      return [root, ...Array.from({ length: int(1, 2) }, () => segment(random() < 0.8)).flat()];
    }
    const k = int(1, 2); // old style: the locants of the only segment without them go first
    return [...nums(k), root, ...(k > 1 ? [multiplier(k)] : []), pick([ENDINGS.double, ENDINGS.triple])];
  }; // End of function parent()
  return () => [...Array.from({ length: int(0, 3) }, () => prefix(0)).flat(), ...parent()];
} // End of function grammarGenerator()

test('property: the text of random grammatical sequences tokenizes back to the same text', () => {
  const next = grammarGenerator(mulberry32(20261014));
  for (let i = 0; i < 400; i += 1) {
    const words = next().join(' ');
    const ids = seq(words);
    const original = readBack(ids);
    assert.deepEqual(original.errors, [], words);
    const spans = assemble(parse(ids).tree).spans;
    assert.deepEqual(spans.filter((s) => s.tile !== null).map((s) => s.tile), ids.map((_, j) => j), `${words}: one span per tile`);
    const found = tokenize(original.text);
    assert.ok(found, `${words} → ${original.text}: no tiles`);
    assert.equal(readBack(found).text, original.text, words);
  } // End of the loop over the random sequences
}); // End of test 'property: the text of random grammatical sequences tokenizes back to the same text'
