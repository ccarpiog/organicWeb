/**
 * @file Unit tests for the alcohols and phenols in «¿Cómo se dibuja?»
 * (src/reverse/, design.md §15.5, §15.7, §15.8 R-5a; phase I-51a2, R-5a2):
 * the `hidroxi` and `ol` tiles of the «Grupos» row, `fenol` and the
 * closing-bond locant `1(n)` of the «Anillos» row — parser (the suffix node,
 * old-style locants of the suffix, errors with their tile ranges, partial
 * names), assembler (the suffix half of rule 4: the multiplier's `a` and the
 * parent's `o` elided before a vowel, `1(6)` with the ring's size), tokenizer,
 * interpreter and builder (the suffix's carbon slots, one oxygen per OH, the
 * OH of `fenol` at carbon 1), search (left-out suffix locants), readName()
 * on chains, rings and benzene, with each molecule compared with a SMILES,
 * mutations and their diagnosis (the rules that still apply, the deliberate
 * nulls), the fixture round trip over every alcohol row of
 * tests/fixtures/names.tsv, the closed loop over the oracle's alcohol
 * generators (pure imports, no Java), the ordered drawing, a no-crash
 * property and time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build, specAtoms, specCarbons } from '../../src/reverse/build.js';
import { searchStructures, slotGroups, fillVariants } from '../../src/reverse/search.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { CLOSING_ID, HYDROXY_ID, OL_ID, PHENOL_ID, tileById } from '../../src/reverse/tiles.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import {
  generateAlcohols, generateMonocycles, generateRingPrincipalBenzenes, generateRingPolysuffixBenzenes, generateRingSubstituents,
  generateSubstitutedPhenyls,
} from '../../scripts/oracle/generate.mjs';
import { seq, readFixtures, isAlcohol, isAlcoholMolecule, isAlcoholName } from './reverse-words.js';

/** Alcohol fixture rows: 59 of I-31, 18 of I-40a, 8 of I-43a, 8 of I-44, 9 of I-45a. */
const EXPECTED_ROWS = Object.freeze({ total: 102, i31: 59, i40a: 18, i43a: 8, i44: 8, i45a: 9 });

/** Their names and alternatives written with the tiles of this phase. */
const EXPECTED_NAMES = 117;

/**
 * Their names left for later phases: the retained phenols of R-5a3
 * (`p-cresol` twice, `o-cresol`, `m-cresol`, `pirocatecol`, `catecol`,
 * `resorcinol`, `hidroquinona`) and `alcohol bencílico`.
 */
const EXPECTED_LATER_NAMES = 9;

/** Average time budget of one readName() call over the fixture round trip, in milliseconds (phones are slower). */
const AVERAGE_BUDGET_MS = 50;

/** Time budget of one representative alcohol readName() call, in milliseconds. */
const PER_NAME_BUDGET_MS = 250;

/**
 * The tile ids of a name: space-separated tile words (reverse-words.js), or
 * a name text read by the tokenizer.
 *
 * @param {string} name - Tile words or a name.
 * @returns {string[]} The tile ids.
 */
function idsOf(name) {
  const ids = name.includes(' ') ? seq(name) : tokenize(name);
  assert.ok(ids, `no tiles for ${name}`);
  return ids;
}

/**
 * Reads a name (tile words or text).
 *
 * @param {string} name - Tile words or a name.
 * @param {object} [options] - readName() options.
 * @returns {object} The verdict.
 */
function read(name, options) {
  return readName(idsOf(name), options);
}

/**
 * The errors of a parse as `CODE[from,to)` strings.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {string[]} The errors.
 */
function errorsOf(words) {
  return parse(seq(words)).errors.map((e) => `${e.code}[${e.from},${e.to})`);
}

/**
 * The first error of a parse.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {{code: string, from: number, to: number, message: string}} The error.
 */
function firstError(words) {
  return parse(seq(words)).errors[0];
}

/**
 * The NameSpec of error-free tile words.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {object} The NameSpec.
 */
function specOf(words) {
  const { tree, errors } = parse(seq(words));
  assert.deepEqual(errors, [], words);
  return interpret(tree);
}

/**
 * The assembled text of tile words.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {string} The text.
 */
function text(words) {
  return assemble(parse(seq(words)).tree).text;
}

/**
 * The aromatic-equivalence key of a SMILES molecule.
 *
 * @param {string} smiles - A SMILES (Kekulé form).
 * @returns {string} aromaticKey() of its graph.
 */
function keyOf(smiles) {
  return aromaticKey(parseSmiles(smiles));
}

/**
 * The `otherName` message (design.md §15.3).
 *
 * @param {string} name - The engine's name.
 * @returns {string} The message.
 */
function otherNameMessage(name) {
  return `Esta es la molécula que describe tu nombre, pero se llama «${name}». Pulsa «Ver paso a paso» para ver por qué.`;
}

// ---------------------------------------------------------------------------
// Parser, assembler, tokenizer.
// ---------------------------------------------------------------------------

test('parse (R-5a2): the suffix `ol` after the parent\'s ending, `hidroxi` as a one-atom prefix, `fenol` as a whole word', () => {
  // 0:prop 1:ano 2:2 3:ol — the parent's suffix node with its locants.
  let { tree, errors } = parse(seq('prop ano 2 ol'));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.parent.suffix, { type: 'suffix', locants: [2], multiplier: null, tile: 3, range: [2, 4] });
  assert.deepEqual([tree.parent.range, tree.parent.legacySuffix], [[0, 4], false]);
  // 0:but 1:ano 2:1 3:2 4:3 5:4 6:tetra 7:ol — locants and multiplier.
  ({ tree, errors } = parse(seq('but ano 1 2 3 4 tetra ol')));
  assert.deepEqual([errors, tree.parent.suffix.locants, tree.parent.suffix.multiplier], [[], [2, 3, 4, 5], 6]);
  // On a ring, after `eno`, and on `benceno`.
  assert.deepEqual(errorsOf('ciclo hex 2 eno 1 ol'), []);
  assert.deepEqual(parse(seq('ciclo hex 2 eno 1 ol')).tree.parent.suffix.locants, [4]);
  ({ tree } = parse(seq('benceno 1 2 di ol')));
  assert.deepEqual([tree.parent.chain.type, tree.parent.suffix.locants, tree.parent.suffix.multiplier], ['benzene', [1, 2], 3]);
  // Left out: no locants, still the suffix.
  assert.deepEqual(parse(seq('et ano ol')).tree.parent.suffix, { type: 'suffix', locants: [], multiplier: null, tile: 2, range: [2, 3] });
  // `hidroxi`: a one-atom group like a halogen, also inside a compound branch.
  ({ tree, errors } = parse(seq('2 START hidroxi met il END prop ano 1 3 di ol')));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.items[0].substituent.items[0].substituent, { type: 'hydroxy', tile: 2, range: [2, 3] });
  // `fenol`: the parent's word, no suffix node of its own; prefixes before it.
  ({ tree, errors } = parse(seq('4 met il fenol')));
  assert.deepEqual([errors, tree.parent.chain, tree.parent.suffix], [[], { type: 'benzene', tile: 3, range: [3, 4] }, null]);
  assert.equal(tree.tiles[3].id, PHENOL_ID);
  // `p-metilfenol`: the letter counts the OH of `fenol` as one of the two positions (design.md §14.4).
  assert.deepEqual(errorsOf('p met il fenol'), []);
}); // End of test 'parse (R-5a2): the suffix `ol` after the parent's ending…'

test('parse (R-5a2): old-style locants of the suffix (`2-propanol`, `1,2-bencenodiol`) and of a segment beside it', () => {
  let { tree, errors } = parse(seq('2 prop ano ol'));
  assert.deepEqual([errors, tree.parent.legacy, tree.parent.legacySuffix, tree.parent.legacySegment], [[], [0], true, null]);
  ({ tree, errors } = parse(seq('1 2 et ano di ol')));
  assert.deepEqual([errors, tree.parent.legacySuffix], [[], true]);
  ({ tree, errors } = parse(seq('1 2 benceno di ol')));
  assert.deepEqual([errors, tree.parent.legacySuffix], [[], true]);
  // `3-buten-2-ol`: the suffix has its locant, the old-style one goes to the segment.
  ({ tree, errors } = parse(seq('3 but eno 2 ol')));
  assert.deepEqual([errors, tree.parent.legacySegment, tree.parent.legacySuffix], [[], 0, false]);
  // Two lists left open, or a count that does not match: LEGACY (BENZENE_BONDS on `benceno`).
  assert.deepEqual(errorsOf('2 but eno ol'), ['LEGACY[0,1)']);
  assert.deepEqual(errorsOf('1 2 prop ano ol'), ['LEGACY[0,2)']);
  assert.deepEqual(errorsOf('1 2 3 benceno di ol'), ['BENZENE_BONDS[0,3)']);
}); // End of test 'parse (R-5a2): old-style locants of the suffix…'

test('parse (R-5a2): errors with alcohols, each with its tile range', () => {
  // `ol` out of place: at the start, after a bare number, inside a compound branch, after `fenol` or a template.
  assert.deepEqual(errorsOf('ol'), ['TILE_ORDER[0,1)', 'NO_PARENT[0,1)']);
  assert.equal(firstError('ol').message, 'Esta ficha no puede ir aquí: «ol» va al final del nombre, detrás de la terminación de la '
    + 'cadena principal (propan-2-ol, butano-1,4-diol); en una rama, el grupo OH se escribe «hidroxi».');
  assert.deepEqual(errorsOf('START 2 ol et il END prop ano'), ['TILE_ORDER[1,2)', 'TILE_ORDER[2,3)']);
  assert.deepEqual(errorsOf('fenol 2 ol'), ['TILE_ORDER[1,3)']);
  assert.deepEqual(errorsOf('tolueno 4 ol'), ['TILE_ORDER[1,3)']);
  // A root without its ending before `ol` (no automatic `an`, unlike `propan-2-il`).
  assert.equal(errorsOf('prop 2 ol')[0], 'ROOT_END[0,1)');
  // Counts and multipliers.
  assert.deepEqual(errorsOf('prop ano 2 3 ol'), ['LOCANT_COUNT[2,4)']);
  assert.equal(firstError('prop ano 2 3 ol').message, 'Con dos números hace falta «di».');
  assert.deepEqual(errorsOf('prop ano 2 di ol'), ['LOCANT_COUNT[2,4)']);
  assert.deepEqual(errorsOf('but ano 1 4 bis ol'), ['TILE_ORDER[4,5)']);
  assert.equal(firstError('but ano 1 4 bis ol').message, 'Esta ficha no puede ir aquí: delante de «ol» va «di», «tri»…, no «bis» ni «tris».');
  // `fenol` places its own OH: numbers or a letter before it, a multiplier, or `fenol` inside a branch.
  assert.deepEqual(errorsOf('2 fenol'), ['TEMPLATE_LOCANTS[0,1)']);
  assert.equal(firstError('2 fenol').message, '«fenol» ya dice dónde va su grupo OH, en el carbono 1: no lleva números ni letras propios.');
  assert.deepEqual(errorsOf('p fenol'), ['TEMPLATE_LOCANTS[0,1)']);
  assert.deepEqual(errorsOf('di fenol'), ['TILE_ORDER[0,1)']);
  assert.deepEqual(errorsOf('START fenol END met ano'), ['TILE_ORDER[1,2)', 'TILE_ORDER[2,3)']);
  assert.match(firstError('START fenol END met ano').message, /como en \(4-hidroxifenil\)\.$/);
  // o/m/p: the OH of `fenol` counts, so a letter on a multiplied prefix says three positions.
  assert.deepEqual(errorsOf('o di met il fenol'), ['POSITIONAL[0,1)']);
  assert.match(firstError('o di met il fenol').message, /pone tres \(contando el grupo OH del fenol\)/);
  // `hidroxi`: a group, not a branch, at the end; no compound branch of its own.
  assert.equal(firstError('2 hidroxi').message, 'El nombre acaba en un grupo («hidroxi»): falta la cadena principal detrás.');
  assert.deepEqual(errorsOf('START hidroxi END met ano'), ['TILE_ORDER[2,3)']);
}); // End of test 'parse (R-5a2): errors with alcohols…'

test('parse (R-5a2): `1(n)` is a locant of a ring\'s `eno` / `ino` only; anywhere else TILE_ORDER', () => {
  // 0:ciclo 1:hex 2:1(n) 3:eno 4:1 5:2 6:4 7:tri 8:ol
  const { tree, errors } = parse(seq('ciclo hex 1(n) eno 1 2 4 tri ol'));
  assert.deepEqual(errors, []);
  assert.deepEqual([tree.parent.chain.segments[0].locants, tree.parent.suffix.locants], [[2], [4, 5, 6]]);
  assert.deepEqual(errorsOf('ciclo prop 1 1(n) 2 tri eno'), []);
  assert.deepEqual(errorsOf('2 ciclo hex 1(n) eno 1 il prop ano'), [], 'a ring branch\'s segment');
  for (const [words, error] of [
    ['1(n) met il prop ano', 'TILE_ORDER[0,1)'], // a prefix's locant
    ['prop 1(n) eno', 'TILE_ORDER[1,2)'], // a chain's segment
    ['ciclo prop 1(n) il met ano', 'TILE_ORDER[2,3)'], // a free-valence locant
    ['ciclo hex ano 1(n) ol', 'TILE_ORDER[3,4)'], // the suffix's locant
    ['1(n) ciclo hex eno', 'TILE_ORDER[0,1)'], // old style, before the root
  ]) {
    assert.deepEqual(errorsOf(words), [error], words);
  }
  assert.equal(firstError('prop 1(n) eno').message, 'Esta ficha no puede ir aquí: «1(n)» es el número del enlace que cierra un '
    + 'anillo, del último carbono al 1, y solo va delante de «eno» o «ino» de un anillo (ciclohex-1(6)-eno-1,2,4-triol).');
}); // End of test 'parse (R-5a2): `1(n)` is a locant of a ring's `eno` / `ino` only…'

test('assemble (R-5a2): the suffix half of rule 4 — a multiplier\'s `a`, then the parent\'s `o`, elided before a vowel', () => {
  for (const [words, expected] of [
    ['prop ano 2 ol', 'propan-2-ol'], // `ano` → `an` before `ol`
    ['et ano ol', 'etanol'],
    ['met ano di ol', 'metanodiol'], // kept before the consonant of `diol`
    ['but ano 1 4 di ol', 'butano-1,4-diol'],
    ['prop ano 1 2 3 tri ol', 'propano-1,2,3-triol'],
    ['but ano 1 2 3 4 tetra ol', 'butano-1,2,3,4-tetrol'], // `tetra` → `tetr`; then `o` kept before `t`
    ['pent ano 1 2 3 4 5 penta ol', 'pentano-1,2,3,4,5-pentol'],
    ['prop 2 eno 1 ol', 'prop-2-en-1-ol'], // `eno` → `en`
    ['but 3 ino 2 ol', 'but-3-in-2-ol'], // `ino` → `in`
    ['but 2 eno 1 4 di ol', 'but-2-eno-1,4-diol'],
    ['pent 1 4 di eno 3 ol', 'penta-1,4-dien-3-ol'], // the connecting `a` still from the first segment
    ['ciclo hex ano ol', 'ciclohexanol'],
    ['ciclo hex ano 1 4 di ol', 'ciclohexano-1,4-diol'],
    ['benceno 1 2 di ol', 'benceno-1,2-diol'],
    ['benceno hexa ol', 'bencenohexol'], // `hexa` → `hex`, then `benceno` keeps its `o`
    ['benceno ol', 'bencenol'], // `benceno` → `bencen` before `ol` (the engine says `fenol`)
    ['4 met il fenol', '4-metilfenol'],
    ['2 prop ano ol', '2-propanol'], // old style
    ['1 2 benceno di ol', '1,2-bencenodiol'],
    ['2 cloro et ano 1 ol', '2-cloroetan-1-ol'],
    ['2 START hidroxi met il END prop ano 1 3 di ol', '2-(hidroximetil)propano-1,3-diol'], // `hidroxi` never enclosed alone
    ['START 4 START hidroxi met il END ciclo hex il END et ano 1 ol', '[4-(hidroximetil)ciclohexil]etan-1-ol'],
  ]) {
    assert.equal(text(words), expected, words);
  }
  // Spans: one per tile; the suffix's locants, multiplier and `ol` with the engine's part kinds; `fenol` one stem span.
  const { spans } = assemble(parse(seq('but ano 1 2 3 4 tetra ol')).tree);
  assert.deepEqual(spans.filter((s) => s.tile !== null).map((s) => [s.tile, s.kind]),
    [[0, 'stem'], [1, 'ending'], [2, 'locant'], [3, 'locant'], [4, 'locant'], [5, 'locant'], [6, 'multiplier'], [7, 'ending']]);
  const phenol = assemble(parse(seq('4 met il fenol')).tree);
  assert.deepEqual(phenol.spans.filter((s) => s.tile === 3).map((s) => [phenol.text.slice(s.from, s.to), s.kind]), [['fenol', 'stem']]);
}); // End of test 'assemble (R-5a2): the suffix half of rule 4…'

test('assemble (R-5a2): `1(n)` is written with the ring\'s size and punctuated as a locant', () => {
  assert.equal(text('ciclo hex 1(n) eno 1 2 4 tri ol'), 'ciclohex-1(6)-eno-1,2,4-triol');
  assert.equal(text('ciclo prop 1 1(n) 2 tri eno'), 'ciclopropa-1,1(3),2-trieno');
  assert.equal(text('ciclo but 1 1(n) 2 3 tetra eno'), 'ciclobuta-1,1(4),2,3-tetraeno');
  assert.equal(text('ciclo dodec 1(n) eno'), 'ciclododec-1(12)-eno');
  // Out of place it keeps the tile's text.
  assert.equal(text('prop 1(n) eno'), 'prop-1(n)-eno');
  const { spans, text: name } = assemble(parse(seq('ciclo hex 1(n) eno 1 2 4 tri ol')).tree);
  assert.deepEqual(spans.filter((s) => s.tile === 2).map((s) => [name.slice(s.from, s.to), s.kind]), [['1(6)', 'locant']]);
}); // End of test 'assemble (R-5a2): `1(n)` is written with the ring's size…'

test('tokenize (R-5a2): alcohol names read back to their tiles', () => {
  for (const [name, words] of [
    ['propan-2-ol', 'prop ano 2 ol'],
    ['etanol', 'et ano ol'],
    ['butano-1,2,3,4-tetrol', 'but ano 1 2 3 4 tetra ol'],
    ['pentano-1,2,3,4,5-pentol', 'pent ano 1 2 3 4 5 penta ol'],
    ['but-3-en-2-ol', 'but 3 eno 2 ol'],
    ['ciclohex-2-en-1-ol', 'ciclo hex 2 eno 1 ol'],
    ['fenol', 'fenol'],
    ['p-metilfenol', 'p met il fenol'],
    ['benceno-1,2-diol', 'benceno 1 2 di ol'],
    ['bencenohexol', 'benceno hexa ol'],
    ['bencenol', 'benceno ol'],
    ['2-propanol', '2 prop ano ol'],
    ['1,2-bencenodiol', '1 2 benceno di ol'],
    ['ciclohex-1(6)-eno-1,2,4-triol', 'ciclo hex 1(n) eno 1 2 4 tri ol'],
    ['ciclopropa-1,1(3),2-trieno', 'ciclo prop 1 1(n) 2 tri eno'],
    ['2-(hidroximetil)propano-1,3-diol', '2 START hidroxi met il END prop ano 1 3 di ol'],
    ['[4,4-bis(hidroximetil)ciclohexil]clorometanol', 'START 4 4 bis START hidroxi met il END ciclo hex il END cloro met ano ol'],
  ]) {
    assert.deepEqual(tokenize(name), seq(words), name);
  }
  assert.deepEqual([tileById(CLOSING_ID).text, tileById(OL_ID).text, tileById(HYDROXY_ID).text], ['1(n)', 'ol', 'hidroxi']);
  // Texts that only read with errors: no tiles.
  for (const name of ['ol', '2-ol', 'propan-2,3-ol', 'fenol-2-ol', '2-fenol', 'but-1(4)-eno', 'ciclohexan-1(6)-ol', '(hidroxi)metano']) {
    assert.equal(tokenize(name), null, name);
  }
}); // End of test 'tokenize (R-5a2): alcohol names read back to their tiles'

// ---------------------------------------------------------------------------
// Interpreter, builder, search.
// ---------------------------------------------------------------------------

test('interpret (R-5a2): the suffix\'s carbon slots, `fenol`\'s implicit OH, `hidroxi`, `1(n)`, old style', () => {
  let spec = specOf('but ano 1 4 di ol');
  assert.deepEqual([spec.suffix.kind, spec.suffix.multiplier, spec.suffix.phenol, spec.suffix.tiles, spec.suffix.word],
    ['alcohol', { count: 2, compound: false }, false, [2, 6], { text: 'ol', tiles: [5, 6] }]);
  assert.deepEqual(spec.suffix.slots.map((slot) => [slot.kind, slot.value, slot.role, slot.domain, slot.tiles]),
    [['supplied', 1, 'carbon', [1, 4], [2, 3]], ['supplied', 4, 'carbon', [1, 4], [3, 4]]]);
  assert.deepEqual(spec.parent.tiles, [0, 2], 'the parent\'s tiles stop before its suffix');
  // Left out: carbon slots over the parent, one multiset group in the search.
  spec = specOf('prop ano ol');
  assert.deepEqual(spec.leftOut.map((slot) => [slot.role, slot.domain, slot.tiles]), [['carbon', [1, 3], [2, 3]]]);
  assert.deepEqual(slotGroups(specOf('benceno di ol')).map((g) => [g.role, g.indices.length, g.domain]), [['carbon', 2, [1, 6]]]);
  // `fenol`: the benzene parent, its OH implicit at carbon 1 on the `fenol` tile; a letter's prefix numbered beside it.
  spec = specOf('p met il fenol');
  assert.deepEqual([spec.parent.kind, spec.parent.template, spec.traditional], ['benzene', null, null]);
  assert.deepEqual(spec.suffix.slots.map((slot) => [slot.kind, slot.value, slot.tiles]), [['implicit', 1, [3, 4]]]);
  assert.deepEqual([spec.suffix.phenol, spec.suffix.word.text], [true, 'fenol']);
  assert.deepEqual(spec.prefixes[0].slots.map((slot) => [slot.kind, slot.value, slot.letter]), [['supplied', 4, true]]);
  // `hidroxi`: a one-atom SubstituentSpec, its atom an oxygen.
  const hydroxy = specOf('2 START hidroxi met il END prop ano 1 3 di ol').prefixes[0].substituent.prefixes[0].substituent;
  assert.deepEqual([hydroxy.kind, hydroxy.element, hydroxy.length, hydroxy.freeValence, hydroxy.prefixes],
    ['hydroxy', 'O', null, null, []]);
  // `1(6)`: bond 6 of the ring, the closing one.
  spec = specOf('ciclo hex 1(n) eno 1 2 4 tri ol');
  assert.deepEqual(spec.parent.double.map((slot) => [slot.kind, slot.value, slot.closing, slot.role]), [['supplied', 6, 6, 'ringBond']]);
  // Old style: the suffix's slots from the locants before the root, and the note.
  spec = specOf('2 prop ano ol');
  assert.deepEqual([spec.suffix.slots.map((slot) => [slot.kind, slot.value]), spec.oldStyle], [[['supplied', 2]], true]);
  assert.equal(specOf('prop ano 2 ol').oldStyle, false);
}); // End of test 'interpret (R-5a2): the suffix's carbon slots…'

test('build (R-5a2): one oxygen per OH, single-bonded to its carbon; the caps count it; ranges and VALENCE with their tiles', () => {
  const spec = specOf('but ano 1 4 di ol');
  const built = build(spec);
  assert.ok(built.ok);
  assert.equal(aromaticKey(built.molecule), keyOf('OCCCCO'));
  assert.deepEqual(built.suffixAtoms.map((g) => [g.locant, built.molecule.atoms.get(g.attachment).element, g.tiles]),
    [[1, 'O', [2, 3]], [4, 'O', [3, 4]]]);
  assert.deepEqual(built.suffixAtoms.map((g) => g.parentAtom), [built.studentParent.atoms[0], built.studentParent.atoms[3]]);
  assert.equal(built.molecule.bonds.get(built.suffixAtoms[0].bond).order, 1);
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [4, 6]);
  // `hidroxi` adds its oxygen as a prefix's atom.
  const hydroxy = build(specOf('2 START hidroxi met il END prop ano 1 3 di ol'), [1]); // `hidroxi` on the methyl's only carbon.
  assert.equal(aromaticKey(hydroxy.molecule), keyOf('OCC(CO)CO'));
  assert.deepEqual(hydroxy.prefixAtoms[0].atoms.map((id) => hydroxy.molecule.atoms.get(id).element), ['C', 'O']);
  /**
   * The first error of tile words as `[code, from, to, message]`.
   *
   * @param {string} words - Tile words.
   * @returns {Array} The error.
   */
  const invalid = (words) => {
    const verdict = read(words);
    assert.equal(verdict.kind, 'invalid', words);
    const [error] = verdict.errors;
    return [error.code, error.from, error.to, error.message];
  };
  assert.deepEqual(invalid('prop ano 4 ol'), ['LOCANT_RANGE', 2, 3, 'La cadena de 3 carbonos va del 1 al 3: no hay carbono 4.']);
  assert.deepEqual(invalid('7 met il fenol'), ['LOCANT_RANGE', 0, 1, 'El anillo del fenol tiene 6 carbonos, del 1 al 6: no hay carbono 7.']);
  assert.deepEqual(invalid('1 met il fenol'), ['VALENCE', 0, 1,
    'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el fenol, ese carbono ya lleva un grupo OH.']);
  assert.deepEqual(invalid('met ano 1 1 1 1 1 penta ol'), ['VALENCE', 6, 7,
    'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4.']);
  assert.deepEqual(invalid('met ano penta ol').slice(0, 3), ['VALENCE', 2, 4]);
  assert.deepEqual(invalid('ciclo hex 6 1(n) di eno'), ['SAME_BOND', 2, 4, 'Hay dos enlaces múltiples en el mismo sitio (1(6)).']);
}); // End of test 'build (R-5a2): one oxygen per OH…'

test('search (R-5a2): left-out suffix locants give the structures they fit; the suffix kept out with the prefixes', () => {
  /**
   * The engine's names of the structures of tile words, with their placements.
   *
   * @param {string} words - Tile words.
   * @returns {Array} `[name, placements]` per structure.
   */
  const structures = (words) => searchStructures(specOf(words), { namer: nameMolecule }).structures
    .map((s) => [s.naming.name, s.placements.length]);
  assert.deepEqual(structures('et ano ol'), [['etanol', 2]]);
  assert.deepEqual(structures('prop ano ol'), [['propan-1-ol', 2], ['propan-2-ol', 1]]);
  assert.deepEqual(structures('ciclo hex ano ol'), [['ciclohexanol', 6]]);
  assert.deepEqual(structures('benceno di ol').map(([name]) => name), ['benceno-1,2-diol', 'benceno-1,3-diol', 'benceno-1,4-diol']);
  assert.deepEqual(structures('met il fenol').map(([name]) => name), ['2-metilfenol', '3-metilfenol', '4-metilfenol']);
  assert.deepEqual(structures('met ano tetra ol'), [['metanotetrol', 1]]);
  // The filled comparison may keep the suffix's locants out with the prefixes' (the engine omits both together).
  assert.deepEqual(fillVariants(specOf('cloro et ano ol')), [{ prefixes: false, parent: false }, { prefixes: true, parent: false }]);
  assert.deepEqual(fillVariants(specOf('et ano ol')), [{ prefixes: false, parent: false }, { prefixes: true, parent: false }]);
  assert.deepEqual(fillVariants(specOf('met ano ol')), [{ prefixes: false, parent: false }], 'one value: never written');
}); // End of test 'search (R-5a2): left-out suffix locants…'

// ---------------------------------------------------------------------------
// readName(): our cases, ambiguity, mutations, diagnosis.
// ---------------------------------------------------------------------------

/**
 * Alcohol names read by readName(): [name (tile words or text), kind, the
 * engine's name, SMILES of the molecule described]. The first rows are the
 * acceptance cases of the phase.
 */
const CASES = [
  ['propan-2-ol', 'correct', 'propan-2-ol', 'CC(O)C'],
  ['etanol', 'correct', 'etanol', 'CCO'],
  ['butano-1,4-diol', 'correct', 'butano-1,4-diol', 'OCCCCO'],
  ['butano-1,2,3,4-tetrol', 'correct', 'butano-1,2,3,4-tetrol', 'OCC(O)C(O)CO'],
  ['but-3-en-2-ol', 'correct', 'but-3-en-2-ol', 'CC(O)C=C'],
  ['ciclohexanol', 'correct', 'ciclohexanol', 'OC1CCCCC1'],
  ['ciclohex-2-en-1-ol', 'correct', 'ciclohex-2-en-1-ol', 'OC1C=CCCC1'],
  ['fenol', 'correct', 'fenol', 'OC1=CC=CC=C1'],
  ['4-metilfenol', 'correct', '4-metilfenol', 'OC1=CC=C(C)C=C1'],
  ['benceno-1,2-diol', 'correct', 'benceno-1,2-diol', 'OC1=CC=CC=C1O'],
  ['2-cloroetan-1-ol', 'correct', '2-cloroetan-1-ol', 'ClCCO'],
  ['p-metilfenol', 'alternative', '4-metilfenol', 'OC1=CC=C(C)C=C1'],
  // Our own: more multipliers and endings, rings, benzene, `hidroxi` in branches, the closing-bond locant.
  ['metanol', 'correct', 'metanol', 'CO'],
  ['pentano-1,2,3,4,5-pentol', 'correct', 'pentano-1,2,3,4,5-pentol', 'OCC(O)C(O)C(O)CO'],
  ['prop-2-en-1-ol', 'correct', 'prop-2-en-1-ol', 'C=CCO'],
  ['but-2-eno-1,4-diol', 'correct', 'but-2-eno-1,4-diol', 'OCC=CCO'],
  ['penta-1,4-dien-3-ol', 'correct', 'penta-1,4-dien-3-ol', 'OC(C=C)C=C'],
  ['triclorometanol', 'correct', 'triclorometanol', 'OC(Cl)(Cl)Cl'],
  ['ciclohexano-1,4-diol', 'correct', 'ciclohexano-1,4-diol', 'OC1CCC(O)CC1'],
  ['bencenohexol', 'correct', 'bencenohexol', 'OC1=C(O)C(O)=C(O)C(O)=C1O'],
  ['2-(hidroximetil)propano-1,3-diol', 'correct', '2-(hidroximetil)propano-1,3-diol', 'OCC(CO)CO'],
  ['4-(hidroximetil)ciclohexan-1-ol', 'correct', '4-(hidroximetil)ciclohexan-1-ol', 'OCC1CCC(O)CC1'],
  ['[4,4-bis(hidroximetil)ciclohexil]clorometanol', 'correct', '[4,4-bis(hidroximetil)ciclohexil]clorometanol',
    'OCC1(CO)CCC(C(O)Cl)CC1'],
  ['2-(4-clorofenil)etan-1-ol', 'correct', '2-(4-clorofenil)etan-1-ol', 'OCCC1=CC=C(Cl)C=C1'],
  ['ciclohex-1(6)-eno-1,2,4-triol', 'correct', 'ciclohex-1(6)-eno-1,2,4-triol', 'OC1C(O)CC(O)CC=1'],
  ['ciclopropa-1,1(3),2-trieno', 'correct', 'ciclopropa-1,1(3),2-trieno', 'C1=C=C=1'],
  ['ciclobuta-1,1(4),2,3-tetraeno', 'correct', 'ciclobuta-1,1(4),2,3-tetraeno', 'C1=C=C=C=1'],
  ['3-(propan-2-il)heptan-2-ol', 'alternative', '3-isopropilheptan-2-ol', 'CCCCC(C(C)C)C(O)C'],
  // The molecule the name describes, named otherwise.
  ['butan-3-ol', 'otherName', 'butan-2-ol', 'CC(O)CC'],
  ['bencenol', 'otherName', 'fenol', 'OC1=CC=CC=C1'],
  ['2-hidroxipropano', 'otherName', 'propan-2-ol', 'CC(O)C'],
  ['(hidroximetil)benceno', 'otherName', 'fenilmetanol', 'OCC1=CC=CC=C1'],
  ['(4-hidroxifenil)metano', 'otherName', '4-metilfenol', 'OC1=CC=C(C)C=C1'],
  ['ciclohex-6-eno-1,2,4-triol', 'otherName', 'ciclohex-1(6)-eno-1,2,4-triol', 'OC1C(O)CC(O)CC=1'],
  ['2-propanol', 'otherName', 'propan-2-ol', 'CC(O)C'],
  ['1,2-bencenodiol', 'otherName', 'benceno-1,2-diol', 'OC1=CC=CC=C1O'],
  // Left-out locants with one structure.
  ['ciclohex-2-enol', 'missingLocants', 'ciclohex-2-en-1-ol', 'OC1C=CCCC1'],
  ['2-cloroetanol', 'missingLocants', '2-cloroetan-1-ol', 'ClCCO'],
  ['ciclopropatrieno', 'missingLocants', 'ciclopropa-1,1(3),2-trieno', 'C1=C=C=1'],
];

test('readName (R-5a2): alcohols on chains, rings and benzene, `hidroxi`, `1(n)`, with their molecules', () => {
  for (const [name, kind, engine, smiles] of CASES) {
    const verdict = read(name);
    assert.equal(verdict.kind, kind, `${name}: ${verdict.message}`);
    assert.equal(verdict.text, name);
    assert.equal(verdict.name, engine, name);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${name} builds another graph`);
    assert.equal(verdict.draw, true, name);
    if (kind === 'otherName') {
      assert.equal(verdict.message, otherNameMessage(engine), name);
    }
    if (kind === 'missingLocants') {
      assert.equal(verdict.filled, engine, name);
    }
  } // End of the loop over the cases
  // A traditional alternative is announced (design.md §15.1); the positional one is labelled.
  assert.equal(read('4-metilfenol').message, '¡Correcto! También se llama «p-cresol» (nombre tradicional, que la IUPAC (2013) acepta).');
  assert.match(read('p-metilfenol').message, /^¡Correcto! «p-metilfenol» es una forma válida \(.+\)\. El nombre que doy primero es «4-metilfenol»\.$/);
  // The old style keeps its note.
  assert.deepEqual(read('2-propanol').notes, ['Es la forma antigua de escribirlo; hoy se escribe «propan-2-ol».']);
  assert.deepEqual(read('1,2-bencenodiol').notes, ['Es la forma antigua de escribirlo; hoy se escribe «benceno-1,2-diol».']);
  // The OH groups of the drawn molecule, mapped onto it.
  const verdict = read('butano-1,4-diol');
  assert.deepEqual(verdict.suffixAtoms.map((g) => verdict.molecule.atoms.get(g.attachment).element), ['O', 'O']);
  assert.ok(verdict.suffixAtoms.every((g) => verdict.studentParent.atoms.includes(g.parentAtom)));
}); // End of test 'readName (R-5a2): alcohols on chains, rings and benzene…'

test('readName (R-5a2): left-out locants of the suffix list the structures (`propanol`, design.md §15.3); refusals', () => {
  for (const [name, candidates] of [
    ['propanol', ['propan-1-ol', 'propan-2-ol']],
    ['bencenodiol', ['benceno-1,2-diol', 'benceno-1,3-diol', 'benceno-1,4-diol']],
    ['metilfenol', ['2-metilfenol', '3-metilfenol', '4-metilfenol']],
    ['but-3-enol', ['but-3-en-1-ol', 'but-3-en-2-ol']],
    ['hidroximetilbenceno', ['2-metilfenol', '3-metilfenol', '4-metilfenol']],
  ]) {
    const verdict = read(name);
    assert.equal(verdict.kind, 'ambiguous', `${name}: ${verdict.message}`);
    assert.deepEqual(verdict.candidates.map((c) => c.text), candidates, name);
    assert.deepEqual([verdict.molecule, verdict.draw], [null, false], name);
  } // End of the loop over the ambiguous names
  assert.equal(read('propanol').message, 'Faltan números: puede ser propan-1-ol o propan-2-ol.');
  assert.match(read('butanodiol').message, /^Faltan números: puede ser butano-1,1-diol, butano-1,2-diol, butano-1,3-diol u otras 3 moléculas\.$/);
  assert.equal(read('prop ano ol', { budget: { placements: 1 } }).kind, 'incomplete');
  // A molecule the engine refuses: an OH on the ring and one on a side chain of a substituted benzene.
  const refused = read('(4-hidroxifenil)metanol');
  assert.deepEqual([refused.kind, refused.draw], ['outOfScope', false]);
}); // End of test 'readName (R-5a2): left-out locants of the suffix list the structures…'

/**
 * Mutations of correct alcohol names (design.md §15.7): [tile words,
 * assembled text, kind, the engine's name, SMILES of the molecule
 * described, diagnosis code of an `otherName` (null for a deliberate null,
 * diagnose.js header «Alcohols»)].
 */
const MUTATIONS = [
  ['but ano 2 ol', 'butan-2-ol', 'correct', 'butan-2-ol', 'CC(O)CC', null],
  // The OH numbered from the other end (N0): no message yet (R-5a3).
  ['but ano 3 ol', 'butan-3-ol', 'otherName', 'butan-2-ol', 'CC(O)CC', null],
  ['ciclo hex ano 2 ol', 'ciclohexan-2-ol', 'otherName', 'ciclohexanol', 'OC1CCCCC1', null],
  ['benceno 1 5 di ol', 'benceno-1,5-diol', 'otherName', 'benceno-1,3-diol', 'OC1=CC=CC(O)=C1', null],
  // After an N0 tie, the later numbering rules keep their messages.
  ['pent 4 eno 3 ol', 'pent-4-en-3-ol', 'otherName', 'pent-1-en-3-ol', 'C=CC(O)CC', 'NUMBERING'],
  ['4 met il pent ano 3 ol', '4-metilpentan-3-ol', 'otherName', '2-metilpentan-3-ol', 'CC(C)C(O)CC', 'NUMBERING'],
  ['3 cloro prop ano 2 ol', '3-cloropropan-2-ol', 'otherName', '1-cloropropan-2-ol', 'ClCC(O)C', 'NUMBERING'],
  ['6 met il ciclo hex ano 1 ol', '6-metilciclohexan-1-ol', 'otherName', '2-metilciclohexan-1-ol', 'CC1CCCCC1O', 'RING_NUMBERING'],
  ['6 met il fenol', '6-metilfenol', 'otherName', '2-metilfenol', 'OC1=CC=CC=C1C', 'RING_NUMBERING'],
  ['ciclo hex 5 eno 1 ol', 'ciclohex-5-en-1-ol', 'otherName', 'ciclohex-2-en-1-ol', 'OC1C=CCCC1', 'RING_NUMBERING'],
  // Chain choice: a branch on an end, a longer chain with as many OH groups.
  ['1 met il prop ano 2 ol', '1-metilpropan-2-ol', 'otherName', 'butan-2-ol', 'CC(O)CC', 'BRANCH_AT_END'],
  ['2 prop il hept ano 3 ol', '2-propilheptan-3-ol', 'otherName', '4-metilnonan-5-ol', 'CCCCC(O)C(C)CCC', 'LONGER_CHAIN'],
  ['2 START 2 hidroxi et il END prop ano 1 3 di ol', '2-(2-hidroxietil)propano-1,3-diol', 'otherName',
    '2-(hidroximetil)butano-1,4-diol', 'OCCC(CO)CO', 'LONGER_CHAIN'],
  // The form rules: order, grouping, di/bis, locants out of order (the suffix's too), needless locants.
  ['2 met il 1 cloro prop ano 1 ol', '2-metil-1-cloropropan-1-ol', 'otherName', '1-cloro-2-metilpropan-1-ol', 'OC(Cl)C(C)C',
    'ALPHABETICAL_ORDER'],
  ['2 met il 2 met il prop ano 1 ol', '2-metil-2-metilpropan-1-ol', 'otherName', '2,2-dimetilpropan-1-ol', 'OCC(C)(C)C', 'UNGROUPED'],
  ['1 cloro 2 cloro et ano 1 ol', '1-cloro-2-cloroetan-1-ol', 'otherName', '1,2-dicloroetan-1-ol', 'OC(Cl)CCl', 'UNGROUPED'],
  ['2 2 bis met il prop ano 1 ol', '2,2-bismetilpropan-1-ol', 'otherName', '2,2-dimetilpropan-1-ol', 'OCC(C)(C)C', 'MULTIPLIER_KIND'],
  ['but ano 4 1 di ol', 'butano-4,1-diol', 'otherName', 'butano-1,4-diol', 'OCCCCO', 'LOCANT_ORDER'],
  ['ciclo prop 1(n) 1 2 tri eno', 'ciclopropa-1(3),1,2-trieno', 'otherName', 'ciclopropa-1,1(3),2-trieno', 'C1=C=C=1', 'LOCANT_ORDER'],
  ['1 1 1 tri cloro met ano ol', '1,1,1-triclorometanol', 'otherName', 'triclorometanol', 'OC(Cl)(Cl)Cl', 'NEEDLESS_LOCANTS'],
  ['2 START 1 hidroxi met il END prop ano 1 3 di ol', '2-(1-hidroximetil)propano-1,3-diol', 'otherName',
    '2-(hidroximetil)propano-1,3-diol', 'OCC(CO)CO', 'NEEDLESS_LOCANTS'],
  // Deliberate nulls: an OH written as `hidroxi` on the parent, the parent's suffix count otherwise, a ring parent against a
  // chain one with OH groups, old-style locants of the suffix, needless suffix locants, `bencenol`.
  ['2 hidroxi prop ano', '2-hidroxipropano', 'otherName', 'propan-2-ol', 'CC(O)C', null],
  ['2 hidroxi prop ano 1 ol', '2-hidroxipropan-1-ol', 'otherName', 'propano-1,2-diol', 'OCC(O)C', null],
  ['4 hidroxi tolueno', '4-hidroxitolueno', 'otherName', '4-metilfenol', 'OC1=CC=C(C)C=C1', null], // not SUBSTITUTED_TEMPLATE
  ['START 2 hidroxi et il END ciclo hex ano', '(2-hidroxietil)ciclohexano', 'otherName', '2-ciclohexiletan-1-ol', 'OCCC1CCCCC1', null],
  ['START 4 hidroxi ciclo hex il END met ano ol', '(4-hidroxiciclohexil)metanol', 'otherName', '4-(hidroximetil)ciclohexan-1-ol',
    'OCC1CCC(O)CC1', null],
  ['2 prop ano ol', '2-propanol', 'otherName', 'propan-2-ol', 'CC(O)C', null],
  ['et ano 1 ol', 'etan-1-ol', 'otherName', 'etanol', 'CCO', null],
  ['benceno ol', 'bencenol', 'otherName', 'fenol', 'OC1=CC=CC=C1', null],
  // Removed locants (one structure fits).
  ['2 cloro et ano ol', '2-cloroetanol', 'missingLocants', '2-cloroetan-1-ol', 'ClCCO', null],
];

test('mutations of alcohol names: renumbered, unsorted, ungrouped, di/bis, out of order, needless and removed locants', () => {
  for (const [words, name, kind, engine, smiles, code] of MUTATIONS) {
    const verdict = read(words);
    assert.equal(verdict.text, name, words);
    assert.equal(verdict.kind, kind, `${name}: ${verdict.message}`);
    assert.equal(verdict.name, engine, name);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${name} builds another graph`);
    if (kind !== 'otherName') {
      continue;
    }
    if (code === null) {
      assert.equal(verdict.diagnosis, null, `${name}: ${verdict.diagnosis && verdict.diagnosis.message}`);
      continue;
    }
    assert.ok(verdict.diagnosis, `${name}: no diagnosis`);
    assert.equal(verdict.diagnosis.code, code, `${name}: ${verdict.diagnosis.message}`);
    assert.ok(!/undefined|null|NaN|\[object/.test(verdict.diagnosis.message), `${name}: ${verdict.diagnosis.message}`);
    const opened = diagnosisExplanation(verdict, explain);
    assert.ok([verdict.diagnosis.step, ...STEP_FALLBACKS[verdict.diagnosis.step]].includes(opened.steps[opened.index].id), name);
  } // End of the loop over the mutations
}); // End of test 'mutations of alcohol names…'

test('diagnosis (R-5a2): the messages the rules give an alcohol, quoted whole', () => {
  for (const [words, message, tiles] of [
    ['pent 4 eno 3 ol', 'Hay que numerar la cadena desde el otro extremo: los enlaces dobles y triples tienen que llevar los números '
      + 'más bajos (1 en vez de 4).', null],
    ['6 met il ciclo hex ano 1 ol', 'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro '
      + 'lado: los sustituyentes tienen que llevar los números más bajos (2 en vez de 6).', null],
    ['1 met il prop ano 2 ol', 'La rama «metil» está en el extremo de la cadena, así que la alarga: la cadena principal tiene 4 '
      + 'carbonos.', [0, 3]],
    ['2 prop il hept ano 3 ol', 'Hay una cadena más larga que la tuya: la tuya tiene 7 carbonos y la cadena principal tiene 9.', [3, 5]],
    ['but ano 4 1 di ol', 'Los números de un mismo grupo se escriben de menor a mayor: «butano-1,4-diol», no «butano-4,1-diol».', [2, 4]],
    ['1 cloro 2 cloro et ano 1 ol', 'Los sustituyentes iguales se escriben una sola vez, con «di», «tri»… delante: «1,2-dicloro», '
      + 'no «1-cloro-2-cloro».', [0, 4]],
    ['1 1 1 tri cloro met ano ol', 'En «triclorometanol» no se escriben números: solo hay una manera de colocar los sustituyentes.',
      [0, 3]],
  ]) {
    const verdict = read(words);
    assert.ok(verdict.diagnosis, `${verdict.text}: no diagnosis`);
    assert.equal(verdict.diagnosis.message, message, verdict.text);
    assert.deepEqual(verdict.diagnosis.tiles, tiles, `${verdict.text}: tiles`);
  } // End of the loop over the messages
}); // End of test 'diagnosis (R-5a2): the messages the rules give an alcohol…'

test('«Dibujar» (R-5a2): alcohol verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const name of ['metanol', 'propan-2-ol', 'butano-1,2,3,4-tetrol', 'fenol', '4-metilfenol', 'benceno-1,2-diol', 'bencenohexol',
    'ciclohexanol', 'ciclohex-1(6)-eno-1,2,4-triol', '[4,4-bis(hidroximetil)ciclohexil]clorometanol', 'butan-3-ol', 'p-metilfenol',
    'ciclopropa-1,1(3),2-trieno']) {
    const verdict = read(name);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-5a2): alcohol verdicts have an ordered drawing…'

// ---------------------------------------------------------------------------
// Fixture round trip and closed loop (design.md §15.7).
// ---------------------------------------------------------------------------

test('fixture round trip (R-5a2): every alcohol row of I-31, I-40a, I-43a, I-44, I-45a, graph compared with the SMILES', async () => {
  const fixtures = await readFixtures();
  const rows = fixtures.filter((row) => isAlcohol(row.smiles));
  let covered = 0;
  let later = 0;
  let elapsed = 0;
  for (const row of rows) {
    const expected = keyOf(row.smiles);
    for (const name of row.names) {
      if (!isAlcoholName(name)) {
        later += 1; // A retained phenol of R-5a3, or `alcohol bencílico`.
        continue;
      }
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      assert.equal(assemble(parse(ids).tree).text, name, `names.tsv:${row.line}: assembly`);
      const start = performance.now();
      const verdict = readName(ids);
      elapsed += performance.now() - start;
      const isMain = name === row.names[0];
      assert.equal(verdict.kind, isMain ? 'correct' : 'alternative', `names.tsv:${row.line}: ${name} → ${verdict.message}`);
      assert.equal(verdict.text, name);
      assert.equal(verdict.name, row.names[0], `names.tsv:${row.line}`);
      assert.equal(aromaticKey(verdict.molecule), expected, `names.tsv:${row.line}: ${name} builds another graph`);
      assert.equal(verdict.draw, true);
      if (!isMain) {
        assert.equal(verdict.matched.name, name);
      }
      covered += 1;
    } // End of the loop over the names of a row
  } // End of the loop over the fixture rows
  /**
   * How many rows of a fixture section were covered.
   *
   * @param {string} id - The section's phase id, as in its `#` line.
   * @returns {number} The count.
   */
  const inSection = (id) => rows.filter((row) => row.section.includes(`(${id})`) || row.section.includes(`(${id},`)).length;
  assert.deepEqual([rows.length, inSection('I-31'), inSection('I-40a'), inSection('I-43a'), inSection('I-44'), inSection('I-45a')],
    [EXPECTED_ROWS.total, EXPECTED_ROWS.i31, EXPECTED_ROWS.i40a, EXPECTED_ROWS.i43a, EXPECTED_ROWS.i44, EXPECTED_ROWS.i45a]);
  assert.equal(covered, EXPECTED_NAMES);
  assert.equal(later, EXPECTED_LATER_NAMES);
  assert.ok(elapsed / covered < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / covered).toFixed(2)} ms on average`);
  // Every I-31 row is an alcohol of a hydrocarbon or a halogen derivative: none is left for a later phase.
  assert.equal(fixtures.filter((row) => row.section.includes('(I-31)') && !isAlcohol(row.smiles)).length, 0);
}); // End of test 'fixture round trip (R-5a2): every alcohol row…'

/** The closed loop's generators (scripts/oracle/generate.mjs; design.md §15.7), alcohols only. */
const LOOP = Object.freeze({
  alcohols: Object.freeze({ count: 400, seed: 5201, minSize: 1, maxSize: 12 }),
  others: Object.freeze({ count: 400, seed: 5202 }),
});

/**
 * Minimum coverage of the closed loop: molecules (generateAlcohols(), and
 * the alcohols of generateRingPrincipalBenzenes(),
 * generateRingPolysuffixBenzenes(), generateRingSubstituents() and
 * generateSubstitutedPhenyls(), distinct by aromatic key), names read back,
 * removed-locant mutations (the suffix's lists too) and decisive verdicts
 * among them (the seeds give 746, 790, 2289 and 2276).
 */
const LOOP_MIN = Object.freeze({ molecules: 730, names: 770, removed: 2250, decisive: 2240 });

/**
 * The closed loop's molecules, distinct by aromatic key.
 *
 * @returns {object[]} The molecules.
 */
function loopMolecules() {
  const seen = new Set();
  const molecules = [];
  const others = [generateRingPrincipalBenzenes, generateRingPolysuffixBenzenes, generateRingSubstituents, generateSubstitutedPhenyls]
    .flatMap((generate) => generate(LOOP.others));
  for (const mol of [...generateAlcohols(LOOP.alcohols), ...others].filter(isAlcoholMolecule)) {
    const key = aromaticKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  }
  return molecules;
} // End of function loopMolecules()

/**
 * The locant lists of a tree a student can leave out: a prefix's, a
 * segment's and the suffix's (R-5a2), at any depth — never a free-valence
 * locant.
 *
 * @param {object} tree - An error-free parse() tree.
 * @returns {number[][]} The lists of locant tile indices.
 */
function locantLists(tree) {
  const lists = [];
  /**
   * Collects the segments of a chain or ring (none for a whole word or a one-atom group).
   *
   * @param {object} chain - A substituent or parent chain node.
   * @returns {void}
   */
  const visitChain = (chain) => (chain.segments || []).forEach((segment) => segment.locants.length > 0 && lists.push(segment.locants));
  /**
   * Collects a prefix and its substituent.
   *
   * @param {object} item - A prefix node.
   * @returns {void}
   */
  const visitItem = (item) => {
    if (item.locants.length > 0) {
      lists.push(item.locants);
    }
    const sub = item.substituent;
    if (sub.type === 'branch') {
      sub.items.forEach(visitItem);
      visitChain(sub.chain);
    } else {
      visitChain(sub);
    }
  }; // End of function visitItem()
  tree.items.forEach(visitItem);
  visitChain(tree.parent.chain);
  if (tree.parent.suffix && tree.parent.suffix.locants.length > 0) {
    lists.push(tree.parent.suffix.locants);
  }
  return lists;
} // End of function locantLists()

test('closed loop over the alcohol generators: engine name → tiles → readName() → the same graph, then without each locant list', () => {
  const molecules = loopMolecules();
  const counts = { names: 0, removed: 0, decisive: 0 };
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    assert.ok(naming.ok, naming.ok ? '' : naming.error.message);
    const key = aromaticKey(mol);
    const all = [naming.name, ...naming.alternatives.map((alt) => alt.name)];
    for (const [i, name] of all.entries()) {
      if (!isAlcoholName(name)) {
        continue; // A retained phenol of R-5a3 (`p-cresol`, `catecol`…) or `alcohol bencílico`.
      }
      const ids = tokenize(name);
      assert.ok(ids, `no tiles for ${name}`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, i === 0 ? 'correct' : 'alternative', `${name}: ${verdict.message}`);
      assert.equal(verdict.name, naming.name);
      assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
      counts.names += 1;
      if (i > 0) {
        continue;
      }
      // Removed locants: the molecule must be the one drawn, or among those listed; never another verdict.
      for (const list of locantLists(parse(ids).tree)) {
        const reread = readName(ids.filter((_, j) => !list.includes(j)));
        counts.removed += 1;
        const where = `${name} → ${reread.text}: ${reread.kind}, ${reread.message}`;
        if (reread.kind === 'incomplete') {
          continue;
        }
        if (reread.kind === 'ambiguous') {
          assert.ok(reread.candidates.some((c) => c.text === name && aromaticKey(c.molecule) === key), where);
        } else {
          assert.ok(['missingLocants', 'correct', 'alternative'].includes(reread.kind), where);
          assert.equal(aromaticKey(reread.molecule), key, where);
          assert.equal(reread.filled, reread.kind === 'missingLocants' ? name : null, where);
        }
        counts.decisive += 1;
      } // End of the loop over the locant lists
    } // End of the loop over the names of a molecule
  } // End of the loop over the molecules
  assert.ok(molecules.length >= LOOP_MIN.molecules, `${molecules.length} molecules`);
  assert.ok(counts.names >= LOOP_MIN.names, `${counts.names} names read back`);
  assert.ok(counts.removed >= LOOP_MIN.removed, `${counts.removed} removed-locant mutations`);
  assert.ok(counts.decisive >= LOOP_MIN.decisive, `${counts.decisive} decisive verdicts`);
}); // End of test 'closed loop over the alcohol generators…'

test('closed loop (R-5a2): every generated name with a closing-bond locant `1(n)` reads back to its molecule', () => {
  const names = new Map();
  for (let seed = 1; seed <= 12; seed += 1) {
    for (const mol of [...generateAlcohols({ count: 300, seed, minSize: 3, maxSize: 10 }),
      ...generateMonocycles({ count: 200, seed, minSize: 3, maxSize: 10 })]) {
      const naming = nameMolecule(mol);
      if (naming.ok && /\d\(\d/.test(naming.name) && !names.has(naming.name)) {
        names.set(naming.name, aromaticKey(mol));
      }
    }
  } // End of the loop over the seeds
  assert.ok(names.size >= 6, `${names.size} names with a closing-bond locant`); // The seeds give 7.
  for (const [name, key] of names) {
    const ids = tokenize(name);
    assert.ok(ids && ids.includes(CLOSING_ID), `${name}: no 1(n) tile`);
    const verdict = readName(ids);
    assert.equal(verdict.kind, 'correct', `${name}: ${verdict.message}`);
    assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
  }
}); // End of test 'closed loop (R-5a2): every generated name with a closing-bond locant…'

// ---------------------------------------------------------------------------
// Diagnosis sweep over mutations (design.md §15.7).
// ---------------------------------------------------------------------------

/**
 * The tile id of a locant.
 *
 * @param {number} n - The locant.
 * @returns {string} Its tile id.
 */
function num(n) {
  return `num-${n}`;
}

/**
 * Rewrites the locants of a list in place and puts them back in ascending
 * order over the same positions.
 *
 * @param {string[]} out - Tile ids (changed in place).
 * @param {object[]} tiles - The parsed tiles.
 * @param {number[]} positions - The list's tile indices (numbers only).
 * @param {(value: number) => number} map - The new value of each locant.
 * @returns {void}
 */
function rewriteLocants(out, tiles, positions, map) {
  const values = positions.map((p) => map(tiles[p].value)).sort((a, b) => a - b);
  positions.forEach((p, k) => {
    out[p] = num(values[k]);
  });
}

/**
 * The diagnosis codes an `otherName` of each mutation family may give when
 * it is not deliberately null (diagnose.js header «Alcohols»).
 */
const FAMILY_CODES = Object.freeze({
  renumbered: ['NUMBERING', 'RING_NUMBERING'],
  swapped: ['NUMBERING', 'RING_NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS'],
  unsorted: ['ALPHABETICAL_ORDER'],
  ungrouped: ['UNGROUPED'],
  diBis: ['MULTIPLIER_KIND'],
  suffixOrder: ['LOCANT_ORDER'],
  suffixAdded: [],
});

/**
 * The families whose `otherName` verdicts may be deliberately null: the OH
 * numbered otherwise (N0), and needless suffix locants (`etan-1-ol`).
 */
const NULL_FAMILIES = Object.freeze(['renumbered', 'swapped', 'suffixAdded']);

/**
 * The mutations of one alcohol name: renumbered (reversed on a chain;
 * reflected and rotated on a ring; the suffix's locants with the prefixes'),
 * a prefix's locant swapped with another prefix's or with the suffix's,
 * prefixes in reverse order, identical prefixes written one by one, di ↔
 * bis, the suffix's locants out of order, and locants added to a suffix
 * that has none on a chain.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {{family: string, ids: string[]}[]} The mutations.
 */
function mutationsOf(ids) {
  const { tree } = parse(ids);
  const { tiles, items } = tree;
  const parent = tree.parent.chain;
  const { suffix } = tree.parent;
  const ring = parent.type !== 'chain' || parent.ring !== null;
  const n = parent.type === 'chain' ? tiles[parent.root].value : 6;
  const segments = parent.type === 'chain' ? parent.segments : [];
  const out = [];
  /**
   * Records one mutation unless it changes nothing.
   *
   * @param {string} family - Its family.
   * @param {string[]} mutated - Its tile ids.
   * @returns {void}
   */
  const push = (family, mutated) => {
    if (mutated.join() !== ids.join()) {
      out.push({ family, ids: mutated });
    }
  };
  const renumberings = ring ? [{ carbon: (v) => (v === 1 ? 1 : n + 2 - v), bond: (k) => (k === n ? 1 : n - k) }]
    : [{ carbon: (v) => n + 1 - v, bond: (k) => n - k }];
  for (let s = 1; ring && s < n; s += 1) {
    renumberings.push({ carbon: (v) => ((v - 1 + s) % n) + 1, bond: (k) => ((k - 1 + s) % n) + 1 });
  }
  const plain = segments.every((segment) => segment.locants.every((p) => tiles[p].kind === 'num'));
  for (const { carbon, bond } of plain ? renumberings : []) {
    const mutated = [...ids];
    items.forEach((item) => rewriteLocants(mutated, tiles, item.locants, carbon));
    segments.forEach((segment) => rewriteLocants(mutated, tiles, segment.locants, bond));
    if (suffix) {
      rewriteLocants(mutated, tiles, suffix.locants, carbon);
    }
    push('renumbered', mutated);
  } // End of the loop over the renumberings
  const single = items.filter((item) => item.locants.length === 1).map((item) => item.locants[0]);
  const swappable = suffix && suffix.locants.length === 1 ? [...single, suffix.locants[0]] : single;
  swappable.forEach((a, i) => swappable.slice(i + 1).forEach((b) => {
    const swapped = [...ids];
    [swapped[a], swapped[b]] = [ids[b], ids[a]];
    push('swapped', swapped);
  }));
  if (items.length >= 2) {
    const slices = items.map((item) => ids.slice(item.range[0], item.range[1]));
    push('unsorted', [...slices.reverse().flat(), ...ids.slice(tree.parent.range[0])]);
  }
  for (const item of items) {
    if (item.multiplier !== null && item.locants.length >= 2) {
      const sub = ids.slice(item.multiplier + 1, item.range[1]);
      push('ungrouped', [...ids.slice(0, item.range[0]), ...item.locants.flatMap((p) => [ids[p], ...sub]), ...ids.slice(item.range[1])]);
    }
    if (item.multiplier !== null) {
      const tile = tiles[item.multiplier];
      const swapped = [...ids];
      swapped[item.multiplier] = tile.kind === 'mult' ? `cmult-${tile.value}` : `mult-${tile.value}`;
      push('diBis', swapped);
    }
  } // End of the loop over the parent-level prefixes
  if (suffix && suffix.locants.length > 1) {
    const mutated = [...ids];
    const [first, last] = [suffix.locants[0], suffix.locants[suffix.locants.length - 1]];
    [mutated[first], mutated[last]] = [ids[last], ids[first]];
    push('suffixOrder', mutated);
  }
  if (suffix && suffix.locants.length === 0 && !ring) {
    const count = suffix.multiplier === null ? 1 : tiles[suffix.multiplier].value;
    push('suffixAdded', [...ids.slice(0, suffix.range[0]), ...Array.from({ length: count }, (_, k) => num(1 + k)),
      ...ids.slice(suffix.range[0])]);
  }
  return out;
} // End of function mutationsOf()

/**
 * How many mutations of the alcohol fixture names give `otherName`, by
 * family, and how many of them are deliberately null.
 */
const FIXTURE_OTHER_NAME = Object.freeze({
  renumbered: 189, swapped: 33, unsorted: 10, ungrouped: 8, diBis: 9, suffixOrder: 27, suffixAdded: 10,
});
const FIXTURE_NULLS = Object.freeze({ renumbered: 151, swapped: 23, suffixAdded: 10 });

test('mutations of every alcohol fixture name: a diagnosis of the family\'s codes or a deliberate null, every step resolves', async () => {
  const names = (await readFixtures()).filter((row) => isAlcohol(row.smiles)).flatMap((row) => row.names).filter(isAlcoholName);
  assert.equal(names.length, EXPECTED_NAMES);
  const otherName = {};
  const nulls = {};
  for (const name of names) {
    for (const mutation of mutationsOf(tokenize(name))) {
      const verdict = readName(mutation.ids);
      if (verdict.kind !== 'otherName') {
        continue;
      }
      otherName[mutation.family] = (otherName[mutation.family] || 0) + 1;
      const label = `${name} → ${mutation.family} ${verdict.text}`;
      const d = verdict.diagnosis;
      if (!d) {
        assert.ok(NULL_FAMILIES.includes(mutation.family), `${label}: no diagnosis`);
        nulls[mutation.family] = (nulls[mutation.family] || 0) + 1;
        continue;
      }
      assert.ok(FAMILY_CODES[mutation.family].includes(d.code), `${label}: ${d.code}, ${d.message}`);
      assert.ok(!/undefined|null|NaN|\[object/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), label);
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  assert.deepEqual(otherName, { ...FIXTURE_OTHER_NAME });
  assert.deepEqual(nulls, { ...FIXTURE_NULLS });
}); // End of test 'mutations of every alcohol fixture name…'

// ---------------------------------------------------------------------------
// Property and time budget.
// ---------------------------------------------------------------------------

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

test('property (R-5a2): random alcohol names — any parent, suffix locants or none, `hidroxi`, `fenol` — never crash', () => {
  const random = mulberry32(20261015);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const branches = ['hidroxi', 'cloro', 'met il', 'et il', 'START hidroxi met il END', 'START 2 hidroxi et il END',
    'START 4 hidroxi fenil END'];
  const parents = ['met ano', 'et ano', 'et eno', 'prop ano', 'but 1 eno', 'pent ano', 'ciclo hex ano', 'ciclo hex 1(n) eno',
    'ciclo prop 1 eno', 'benceno'];
  const multipliers = { 1: '', 2: 'di', 3: 'tri', 4: 'tetra' };
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const prefixes = Array.from({ length: int(0, 2) }, () => {
      const count = int(1, 3);
      const locants = random() < 0.6 ? Array.from({ length: count }, () => int(1, 6)).join(' ') : '';
      return [locants, multipliers[count], pick(branches)].join(' ');
    });
    let parent;
    if (random() < 0.2) {
      parent = 'fenol';
    } else {
      const count = int(1, 4);
      const locants = random() < 0.6 ? Array.from({ length: count }, () => int(1, 6)).join(' ') : '';
      parent = [pick(parents), locants, multipliers[count], 'ol'].join(' ');
    }
    const words = [...prefixes, parent].join(' ');
    const verdict = readName(seq(words), { budget: { ms: 200 } });
    kinds.set(verdict.kind, (kinds.get(verdict.kind) || 0) + 1);
    if (verdict.draw) {
      assert.ok(verdict.molecule && verdict.name, words);
    } else {
      assert.equal(verdict.molecule === null || verdict.kind === 'outOfScope', true, words);
    }
    if (verdict.kind === 'otherName' && verdict.diagnosis) {
      assert.ok(!/undefined|null|NaN|\[object/.test(verdict.diagnosis.message), `${words}: ${verdict.diagnosis.message}`);
    }
  } // End of the loop over the random names
  for (const kind of ['correct', 'missingLocants', 'otherName', 'ambiguous', 'invalid']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-5a2): random alcohol names…'

test('time budget: alcohol readName() calls, with their diagnosis, well within budget', () => {
  const names = ['pentano-1,2,3,4,5-pentol', 'bencenohexol', 'ciclohex-1(6)-eno-1,2,4-triol', 'propanol', 'butanodiol',
    'dimetilfenol', '[4,4-bis(hidroximetil)ciclohexil]clorometanol', 'butan-3-ol', '6-metilciclohexan-1-ol', 'metilciclohexanol',
    'ciclohexanotriol'];
  names.forEach((name) => read(name)); // Warm-up.
  for (const name of names) {
    const start = performance.now();
    const verdict = read(name);
    const ms = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', name);
    assert.ok(ms < PER_NAME_BUDGET_MS, `${name}: ${ms.toFixed(1)} ms`);
  }
}); // End of test 'time budget…'
