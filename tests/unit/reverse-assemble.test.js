/**
 * @file Unit tests for the assembler of «¿Cómo se dibuja?»
 * (src/reverse/assemble.js, design.md §15.4, §15.5.1, §15.5.2, phase R-1a):
 * each §15.5.1 example assembles to its stated text, one test per automatic
 * rule (§15.5.2 items 1–5), the spans, and partial or wrong sequences
 * (assembled as written, never repaired); the ring forms of R-4a (`ciclo`
 * parents and branches, and the crowded case of rule 5); the benzene words
 * of R-4b (`benceno`, `fenil`, `(4-metilfenil)`); the suffix half of rule 4
 * (R-5a2: `propan-2-ol`, `butano-1,4-diol`, `butano-1,2,3,4-tetrol`; more in
 * reverse-alcohols.test.js).
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

test('rule 4, suffix half (R-5a2): a suffix multiplier loses its a before a vowel, then the parent its o', () => {
  assert.equal(text('prop ano 2 ol'), 'propan-2-ol'); // `ano` → `an` before the vowel of `ol`
  assert.equal(text('but ano 1 4 di ol'), 'butano-1,4-diol'); // kept before the consonant of `diol`
  assert.equal(text('but ano 1 2 3 4 tetra ol'), 'butano-1,2,3,4-tetrol'); // `tetra` → `tetr` first; then `o` kept before `t`
  assert.equal(text('prop 2 eno 1 ol'), 'prop-2-en-1-ol'); // the last segment's `eno` → `en`
  assert.equal(text('but 2 eno 1 4 di ol'), 'but-2-eno-1,4-diol');
  assert.equal(text('benceno 1 2 di ol'), 'benceno-1,2-diol');
  // The `an` before `ol` is the `ano` tile's own span; the elided multiplier is its tile's span.
  const ol = build('prop ano 2 ol');
  assert.deepEqual(ol.spans.filter((s) => ol.text.slice(s.from, s.to) === 'an').map((s) => s.tile), [1]);
  const tetrol = build('but ano 1 2 3 4 tetra ol');
  assert.deepEqual(tetrol.spans.filter((s) => s.tile === 6).map((s) => tetrol.text.slice(s.from, s.to)), ['tetr']);
}); // End of test 'rule 4, suffix half (R-5a2)…'

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

test('rings (R-4a): `ciclo` parents take the chain rules (connecting a, en / in, old style)', () => {
  assert.equal(text('ciclo hex ano'), 'ciclohexano');
  assert.equal(text('ciclo hex eno'), 'ciclohexeno');
  assert.equal(text('ciclo hex 1 eno'), 'ciclohex-1-eno');
  assert.equal(text('ciclo hex 1 3 di eno'), 'ciclohexa-1,3-dieno'); // rule 2
  assert.equal(text('ciclo oct 1 3 5 7 tetra eno'), 'cicloocta-1,3,5,7-tetraeno');
  assert.equal(text('ciclo oct 1 eno 3 ino'), 'ciclooct-1-en-3-ino'); // rule 3
  assert.equal(text('3 met il ciclo hex 1 eno'), '3-metilciclohex-1-eno');
  assert.equal(text('1 isopropil 4 met il ciclo hex ano'), '1-isopropil-4-metilciclohexano');
  assert.equal(text('prop 2 eno 1 il ciclo hex ano'), '(prop-2-en-1-il)ciclohexano');
  assert.equal(text('1 3 ciclo hex di eno'), '1,3-ciclohexadieno'); // old style
  // `ciclo` is a stem piece of the parent, a prefix piece inside a branch.
  const parent = build('ciclo hex ano');
  assert.deepEqual(parent.spans.map((s) => [parent.text.slice(s.from, s.to), s.kind, s.tile]),
    [['ciclo', 'stem', 0], ['hex', 'stem', 1], ['ano', 'ending', 2]]);
  const branch = build('ciclo hex il met ano');
  assert.deepEqual(branch.spans.slice(0, 3).map((s) => [branch.text.slice(s.from, s.to), s.kind]),
    [['ciclo', 'prefix'], ['hex', 'prefix'], ['il', 'prefix']]);
}); // End of test 'rings (R-4a): `ciclo` parents take the chain rules…'

test('rings (R-4a): ring branches enclosed as render.js needsEnclosure() says', () => {
  // A saturated ring at its carbon 1: no marks (`ciclohexilmetanol`, `2-ciclohexilidenetan-1-ol` in names.tsv).
  assert.equal(text('ciclo hex il met ano'), 'ciclohexilmetano');
  assert.equal(text('2 ciclo hex iliden et ano'), '2-ciclohexilidenetano');
  assert.equal(text('di ciclo hex il met ano'), 'diciclohexilmetano');
  // Unsaturated, with own locants or own prefixes: enclosed (`2-(ciclohex-2-en-1-il)etan-1-ol`,
  // `2-(2-metilciclohexil)propan-1-ol`).
  assert.equal(text('2 ciclo hex 2 eno 1 il et ano'), '2-(ciclohex-2-en-1-il)etano');
  assert.equal(text('ciclo hex eno il met ano'), '(ciclohexenil)metano');
  assert.equal(text('ciclo hex 1 il met ano'), '(ciclohexan-1-il)metano'); // automatic `an`, a cited locant
  assert.equal(text('2 START 2 met il ciclo hex il END prop ano'), '2-(2-metilciclohexil)propano');
  assert.equal(text('1 2 bis START 2 met il ciclo hex il END et ano'), '1,2-bis(2-metilciclohexil)etano');
  assert.equal(text('2 START ciclo hex il met il END but ano'), '2-(ciclohexilmetil)butano');
}); // End of test 'rings (R-4a): ring branches enclosed as render.js needsEnclosure() says'

test('rule 5, crowded prefixes (R-4a): a ring branch after the first of several prefixes without locants is enclosed', () => {
  // render.js enclosedInName(): `cloro(fenil)metanol`, but `fenil(metoxi)metanol` (a ring cited first reads clearly).
  assert.equal(text('met il ciclo hex il met ano'), 'metil(ciclohexil)metano');
  assert.equal(text('ciclo hex il met il met ano'), 'ciclohexilmetilmetano');
  // Not crowded: one prefix, or a locant written.
  assert.equal(text('1 met il 1 ciclo hex il et ano'), '1-metil-1-ciclohexiletano');
  assert.equal(text('met il 1 ciclo hex il et ano'), 'metil-1-ciclohexiletano');
  // Inside a compound branch, and the marks around it one level up.
  assert.equal(text('2 START met il ciclo hex il met il END but ano'), '2-[metil(ciclohexil)metil]butano');
  // A ring branch wrapped in START…END without prefixes of its own is the same branch (review I-50a).
  assert.equal(text('met il START ciclo hex il END met ano'), 'metil(ciclohexil)metano');
  assert.equal(text('2 START met il START ciclo hex il END met il END but ano'), '2-[metil(ciclohexil)metil]butano');
  assert.equal(text('START ciclo hex il END met il met ano'), 'ciclohexilmetilmetano');
}); // End of test 'rule 5, crowded prefixes (R-4a)…'

test('benzene (R-4b): `benceno` is the parent\'s stem, `fenil` a branch word enclosed as render.js encloses it', () => {
  assert.equal(text('benceno'), 'benceno');
  assert.equal(text('met il benceno'), 'metilbenceno');
  assert.equal(text('1 4 di met il benceno'), '1,4-dimetilbenceno');
  assert.equal(text('1 isopropil 4 met il benceno'), '1-isopropil-4-metilbenceno');
  assert.equal(text('1 met il 4 prop ano 2 il benceno'), '1-metil-4-(propan-2-il)benceno');
  assert.equal(text('hexa met il benceno'), 'hexametilbenceno');
  // A bare `fenil` is never enclosed alone (`fenilmetanol`, `difenil…`); a crowded ring after the first prefix is (rule 5).
  assert.equal(text('fenil met ano'), 'fenilmetano');
  assert.equal(text('di fenil met ano'), 'difenilmetano');
  assert.equal(text('met il fenil met ano'), 'metil(fenil)metano');
  assert.equal(text('met il START fenil END met ano'), 'metil(fenil)metano');
  assert.equal(text('fenil met il met ano'), 'fenilmetilmetano');
  // With prefixes of its own, a compound branch (render.js isSubstitutedPhenyl()): enclosed, nested marks one level up.
  assert.equal(text('START 4 met il fenil END met ano'), '(4-metilfenil)metano');
  assert.equal(text('1 START 2 4 di met il fenil END prop ano'), '1-(2,4-dimetilfenil)propano');
  assert.equal(text('START 4 prop ano 2 il fenil END met ano'), '[4-(propan-2-il)fenil]metano');
  assert.equal(text('bis START 4 met il fenil END met ano'), 'bis(4-metilfenil)metano');
  // Spans: `benceno` a stem piece of the parent, `fenil` a prefix piece.
  const parent = build('1 4 di met il benceno');
  assert.deepEqual(parent.spans.filter((s) => s.tile !== null).map((s) => [parent.text.slice(s.from, s.to), s.kind]), [
    ['1', 'locant'], ['4', 'locant'], ['di', 'multiplier'], ['met', 'prefix'], ['il', 'prefix'], ['benceno', 'stem'],
  ]);
  const phenyl = build('fenil met ano');
  assert.deepEqual([phenyl.text.slice(phenyl.spans[0].from, phenyl.spans[0].to), phenyl.spans[0].kind], ['fenil', 'prefix']);
  // Mistakes are assembled as written: numbers on `benceno`, `benceno` inside a branch.
  assert.equal(build('1 3 5 benceno').text, '1,3,5-benceno');
  assert.equal(build('benceno 1 3 5 tri eno').text, 'benceno-1,3,5-trieno');
  assert.equal(build('START benceno END met ano').text, '(benceno)metano');
}); // End of test 'benzene (R-4b): `benceno` is the parent's stem…'

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
