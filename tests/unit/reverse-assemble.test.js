/**
 * @file Unit tests for the assembler of «¿Cómo se dibuja?»
 * (src/reverse/assemble.js, design.md §15.4, §15.5.1, §15.5.2, phase R-1a):
 * each §15.5.1 example assembles to its stated text, one test per automatic
 * rule (§15.5.2 items 1–5), the spans, and partial or wrong sequences
 * (assembled as written, never repaired).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { seq } from './reverse-words.js';

/**
 * Assembles tile words.
 *
 * @param {string} words - Space-separated tile words (reverse-words.js).
 * @returns {{text: string, spans: object[], errors: object[]}} The text, its spans and the parse errors.
 */
function build(words) {
  const { tree, errors } = parse(seq(words));
  return { ...assemble(tree), errors };
}

/**
 * Assembles tile words that must form a valid name, and returns the text.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {string} The text.
 */
function text(words) {
  const result = build(words);
  assert.deepEqual(result.errors, [], words);
  return result.text;
}

// The examples of design.md §15.5.1, one test each.
const EXAMPLES = [
  ['hex ano', 'hexano'],
  ['2 3 di met il pent ano', '2,3-dimetilpentano'],
  ['but 1 3 di eno', 'buta-1,3-dieno'],
  ['hex 1 eno 3 5 di ino', 'hex-1-en-3,5-diino'],
  ['4 prop ano 2 il hept ano', '4-(propan-2-il)heptano'],
  ['5 et eno iliden non ano', '5-etenilidennonano'],
  ['5 5 bis START 2 2 di met il prop il END non ano', '5,5-bis(2,2-dimetilpropil)nonano'],
  ['5 5 di tert-butil non ano', '5,5-di-tert-butilnonano'],
  ['2 but eno', '2-buteno'],
];
for (const [words, expected] of EXAMPLES) {
  test(`§15.5.1 example: ${words} → ${expected}`, () => {
    assert.equal(text(words), expected);
  });
}

test('rule 1: commas inside a locant list, hyphens between locants and words', () => {
  assert.equal(text('2 2 4 tri met il pent ano'), '2,2,4-trimetilpentano');
  assert.equal(text('3 et il 2 met il pent ano'), '3-etil-2-metilpentano');
  assert.equal(text('2 met il prop 1 eno'), '2-metilprop-1-eno');
  assert.equal(text('5 START 2 2 di met il prop il END 7 et il dodec ano'), '5-(2,2-dimetilpropil)-7-etildodecano');
  // No hyphen after an opening mark; one after a closing mark before a locant.
  assert.equal(text('5 6 di but ano 2 il 3 7 di met iliden non 4 eno'), '5,6-di(butan-2-il)-3,7-dimetilidennon-4-eno');
  // Old style: the locants before the root.
  assert.equal(text('2 met il 2 but eno'), '2-metil-2-buteno');
}); // End of test 'rule 1: commas inside a locant list, hyphens between locants and words'

test('rule 2: the connecting a only when the first cited segment is multiplied', () => {
  assert.equal(text('but 1 3 di eno'), 'buta-1,3-dieno');
  assert.equal(text('hex 1 3 di eno 5 ino'), 'hexa-1,3-dien-5-ino');
  assert.equal(text('hex 1 eno 3 5 di ino'), 'hex-1-en-3,5-diino');
  assert.equal(text('prop di eno'), 'propadieno');
  assert.equal(text('7 START but 1 3 di eno 1 il END tridec ano'), '7-(buta-1,3-dien-1-il)tridecano');
  assert.equal(text('1 3 but di eno'), '1,3-butadieno'); // old style
  assert.equal(text('but 1 eno'), 'but-1-eno');
});

test('rule 3: eno → en and ino → in before another segment or il / iliden', () => {
  assert.equal(text('pent 1 eno 4 ino'), 'pent-1-en-4-ino');
  assert.equal(text('5 prop 2 eno 1 il non ano'), '5-(prop-2-en-1-il)nonano');
  assert.equal(text('5 prop 2 ino 1 iliden non ano'), '5-(prop-2-in-1-iliden)nonano');
  assert.equal(text('4 et eno il hept ano'), '4-etenilheptano');
  assert.equal(text('4 et ino il hept ano'), '4-etinilheptano');
  // The student's order is kept: a triple bond cited first is elided before the second segment too.
  assert.equal(text('pent 1 ino 3 eno'), 'pent-1-in-3-eno');
}); // End of test 'rule 3: eno → en and ino → in before another segment or il / iliden'

test('rule 4: ano → an before a cited free-valence locant, automatic an without the tile', () => {
  assert.equal(text('4 prop ano 2 il hept ano'), '4-(propan-2-il)heptano');
  assert.equal(text('4 prop 2 il hept ano'), '4-(propan-2-il)heptano'); // `an` added automatically
  assert.equal(text('6 but ano 2 iliden undec ano'), '6-(butan-2-iliden)undecano');
  assert.equal(text('hex ano'), 'hexano'); // kept at the end of the name
  // The automatic `an` has no tile; the `ano` tile reads `an`.
  const auto = build('4 prop 2 il hept ano');
  assert.deepEqual(auto.spans.filter((s) => auto.text.slice(s.from, s.to) === 'an').map((s) => s.tile), [null]);
  const tile = build('4 prop ano 2 il hept ano');
  assert.deepEqual(tile.spans.filter((s) => tile.text.slice(s.from, s.to) === 'an').map((s) => s.tile), [2]);
}); // End of test 'rule 4: ano → an before a cited free-valence locant, automatic an without the tile'

test('rule 5: enclosure, marks by nesting level, the student\'s multiplier, di-tert-', () => {
  // Enclosed: own locants or prefixes, or unsaturation in three or more carbons; never a retained word.
  assert.equal(text('5 prop il non ano'), '5-propilnonano');
  assert.equal(text('5 isopropil non ano'), '5-isopropilnonano');
  assert.equal(text('5 isopropiliden non ano'), '5-isopropilidennonano');
  assert.equal(text('5 START 2 met il prop il END non ano'), '5-(2-metilpropil)nonano');
  assert.equal(text('5 prop eno il non ano'), '5-(propenil)nonano'); // render.js: unsaturated chain of 3+ carbons
  assert.equal(text('5 met iliden non ano'), '5-metilidennonano');
  // Nesting: ( ) inside [ ] inside { }.
  assert.equal(text('8 START 2 prop ano 2 iliden hex il END pentadec ano'), '8-[2-(propan-2-iliden)hexil]pentadecano');
  assert.equal(text('8 START 2 isopropiliden hex il END pentadec ano'), '8-(2-isopropilidenhexil)pentadecano');
  assert.equal(text('9 START 2 START 3 START 1 met il et il END pent il END hex il END heptadec ano'),
    '9-{2-[3-(1-metiletil)pentil]hexil}heptadecano');
  // The student's multiplier as chosen, even when the engine would use the other one.
  assert.equal(text('5 5 di prop ano 2 il non ano'), '5,5-di(propan-2-il)nonano');
  assert.equal(text('5 5 bis START 1 met il et il END non ano'), '5,5-bis(1-metiletil)nonano');
  assert.equal(text('5 5 bis prop ano 2 il non ano'), '5,5-bis(propan-2-il)nonano');
  assert.equal(text('5 5 di START 2 met il prop il END non ano'), '5,5-di(2-metilpropil)nonano');
  // A hyphen between a multiplier and an italic descriptor.
  assert.equal(text('5 5 di tert-butil non ano'), '5,5-di-tert-butilnonano');
  assert.equal(text('5 5 di isopropil non ano'), '5,5-diisopropilnonano');
}); // End of test 'rule 5: enclosure, marks by nesting level, the student's multiplier, di-tert-'

test('assembly never repairs the student\'s order, grouping or locants', () => {
  assert.equal(text('2 met il 3 et il hex ano'), '2-metil-3-etilhexano'); // not alphabetical
  assert.equal(text('2 met il 3 met il hex ano'), '2-metil-3-metilhexano'); // not grouped
  assert.equal(text('3 2 di met il pent ano'), '3,2-dimetilpentano'); // not ascending
  assert.equal(text('4 met il pent ano'), '4-metilpentano'); // not renumbered
  assert.equal(text('met il prop ano'), 'metilpropano'); // locant left out
});

test('spans: contiguous, one per tile, automatic text without a tile', () => {
  const words = '5 5 bis START 2 2 di met il prop il END non ano';
  const { text: name, spans } = build(words);
  let end = 0;
  for (const span of spans) {
    assert.equal(span.from, end, 'contiguous');
    end = span.to;
  }
  assert.equal(end, name.length);
  const tiles = spans.filter((s) => s.tile !== null).map((s) => s.tile);
  assert.deepEqual(tiles, Array.from({ length: seq(words).length }, (_, i) => i));
  const at = (i) => spans.find((s) => s.tile === i);
  const slice = (span) => name.slice(span.from, span.to);
  assert.deepEqual([0, 2, 3, 11, 12, 13].map((i) => [slice(at(i)), at(i).kind]), [
    ['5', 'locant'], ['bis', 'multiplier'], ['(', 'punct'], [')', 'punct'], ['non', 'stem'], ['ano', 'ending'],
  ]);
  assert.deepEqual([4, 7, 8].map((i) => [slice(at(i)), at(i).kind]), [['2', 'prefix'], ['met', 'prefix'], ['il', 'prefix']]);
  assert.deepEqual(spans.filter((s) => s.tile === null).map(slice), [',', '-', ',', '-']);
  // The connecting `a` is automatic text of kind 'stem', as in render.js.
  const diene = build('but 1 3 di eno');
  assert.deepEqual(diene.spans.map((s) => [diene.text.slice(s.from, s.to), s.tile, s.kind]), [
    ['but', 0, 'stem'], ['a', null, 'stem'], ['-', null, 'punct'], ['1', 1, 'locant'], [',', null, 'punct'],
    ['3', 2, 'locant'], ['-', null, 'punct'], ['di', 3, 'multiplier'], ['eno', 4, 'ending'],
  ]);
}); // End of test 'spans: contiguous, one per tile, automatic text without a tile'

test('spans: controls of a branch that needs no marks are empty; an unfinished branch shows its opening mark', () => {
  const plain = build('5 START prop il END non ano');
  assert.equal(plain.text, '5-propilnonano');
  assert.deepEqual(plain.spans.filter((s) => s.tile === 1 || s.tile === 4).map((s) => [s.from, s.to]), [[2, 2], [8, 8]]);
  const open = build('5 START 2 met il prop il');
  assert.equal(open.text, '5-(2-metilpropil');
  assert.deepEqual(open.spans.find((s) => s.tile === 1), { tile: 1, from: 2, to: 3, kind: 'punct', pending: true });
  assert.ok(open.spans.filter((s) => s.tile !== 1).every((s) => !s.pending));
});

test('partial and wrong sequences still assemble', () => {
  const cases = [
    ['', ''],
    ['2 3 di met il', '2,3-dimetil'],
    ['2 3 di', '2,3-di'],
    ['but', 'but'],
    ['but 1 3 di', 'but-1,3-di'],
    ['5 START', '5-('],
    ['5 START 2 START 1 met il', '5-[2-(1-metil'],
    ['eno', 'eno'],
    ['hex ano 2 met il', 'hexano-2-metil'],
    ['met il END but ano', 'metil)butano'],
    ['3 prop ano il hex ano', '3-propanilhexano'],
    ['1 3 hex eno ino', '1,3-hexenino'],
  ];
  for (const [words, expected] of cases) {
    assert.equal(build(words).text, expected, words);
  }
}); // End of test 'partial and wrong sequences still assemble'
