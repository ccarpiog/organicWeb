/**
 * @file Unit tests for the halogens in «¿Cómo se dibuja?» (src/reverse/,
 * design.md §15.5, §15.7, §15.8 R-5a; phase I-51a1, R-5a1): the `fluoro`,
 * `cloro`, `bromo`, `yodo` tiles of the «Grupos» row read as prefixes on
 * chains, `ciclo` rings, `benceno`, the retained templates and inside
 * compound branches — parser (the halogen node, errors with their tile
 * ranges, partial names), assembler (no automatic text, never enclosed,
 * the student's order kept), interpreter and builder (one atom per halogen,
 * the carbon and heavy-atom caps, VALENCE), search (left-out halogens by the
 * carbons' free valence), the worked cases of §15.5.3 (`clorometano`,
 * `dicloroetano`, `dodecafluorociclohexano`) and our own, mutations with the
 * molecule each describes and their diagnosis, the fixture round trip over
 * every halogen row of tests/fixtures/names.tsv (I-30 and I-42a), the
 * closed loop over the oracle's halogen generators (generateHalogenated(),
 * generateBenzenes() with halogens only; pure imports, no Java), the ordered
 * drawing and time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build, ownPrefixAtoms, specAtoms, specCarbons } from '../../src/reverse/build.js';
import { searchStructures, slotGroups } from '../../src/reverse/search.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { HALOGEN_IDS } from '../../src/reverse/tiles.js';
import { DIAGNOSES, STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { MAX_HEAVY_ATOMS, TOO_MANY_ATOMS_MESSAGE } from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { generateHalogenated, generateBenzenes } from '../../scripts/oracle/generate.mjs';
import { seq, readFixtures, isHalogenDerivative } from './reverse-words.js';

/** Halogen fixture rows: 63 of the I-30 section, 8 of the I-42a section (polysubstituted benzenes). */
const EXPECTED_ROWS = Object.freeze({ total: 71, i30: 63, i42a: 8 });

/** Their names and alternatives (`5-cloro-5-isopropilnonano` has two, `1,4-diclorobenceno` one). */
const EXPECTED_NAMES = 74;

/** Average time budget of one readName() call over the fixture round trip, in milliseconds (phones are slower). */
const AVERAGE_BUDGET_MS = 50;

/** Time budget of one representative halogen readName() call, in milliseconds. */
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

test('parse (R-5a1): a halogen is a prefix\'s substituent of its own, never a compound branch\'s own chain', () => {
  // 0:2 1:bromo 2:1 3:cloro 4:prop 5:ano
  let { tree, errors } = parse(seq('2 bromo 1 cloro prop ano'));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.items.map((item) => [item.locants, item.multiplier, item.substituent]), [
    [[0], null, { type: 'halogen', tile: 1, range: [1, 2] }],
    [[2], null, { type: 'halogen', tile: 3, range: [3, 4] }],
  ]);
  // A multiplier and every halogen: 0:1 1:1 2:di 3:fluoro / yodo…
  ({ tree, errors } = parse(seq('1 1 di fluoro et ano')));
  assert.deepEqual([errors, tree.items[0].multiplier, tree.items[0].substituent.tile], [[], 2, 3]);
  for (const [element, id] of Object.entries(HALOGEN_IDS)) {
    const parsed = parse([id, 'root-1', 'ending-saturated']);
    assert.deepEqual([parsed.errors, parsed.tree.items[0].substituent.type], [[], 'halogen'], element);
  }
  // Inside a compound branch: 0:5 1:START 2:2 3:cloro 4:et 5:il 6:END 7:dec 8:ano — the halogen is a prefix of the branch.
  ({ tree, errors } = parse(seq('5 START 2 cloro et il END dec ano')));
  assert.deepEqual(errors, []);
  const branch = tree.items[0].substituent;
  assert.deepEqual([branch.items.length, branch.items[0].substituent.type, branch.chain.root], [1, 'halogen', 4]);
  // `(clorometil)`: 0:START 1:cloro 2:met 3:il 4:END 5:benceno — the halogen without a locant, the methyl the branch's own chain.
  ({ tree } = parse(seq('START cloro met il END benceno')));
  assert.deepEqual([tree.items[0].substituent.items[0].locants, tree.items[0].substituent.chain.root], [[], 2]);
}); // End of test 'parse (R-5a1): a halogen is a prefix's substituent of its own…'

test('parse (R-5a1): errors and partial names with halogens, each with its tile range', () => {
  // A name that ends in a halogen: a group, not a branch.
  assert.deepEqual(errorsOf('2 cloro'), ['ENDS_WITH_BRANCH[0,2)']);
  assert.equal(parse(seq('2 cloro')).errors[0].message, 'El nombre acaba en un grupo («cloro»): falta la cadena principal detrás.');
  assert.equal(parse(seq('cloro')).errors[0].message, 'El nombre acaba en un grupo («cloro»): falta la cadena principal detrás.');
  // A branch still reads as a branch.
  assert.equal(parse(seq('2 met il')).errors[0].message, 'El nombre acaba en una rama («metil»): falta la cadena principal detrás.');
  assert.deepEqual(errorsOf('2 cloro 2'), ['NO_PARENT[2,3)']);
  // A compound branch that ends in a halogen has no chain of its own.
  assert.deepEqual(errorsOf('START 2 cloro END et ano'), ['TILE_ORDER[3,4)']);
  assert.deepEqual(errorsOf('START cloro END met ano'), ['TILE_ORDER[2,3)']);
  // Locant counts, as for any prefix.
  assert.deepEqual(errorsOf('1 2 cloro et ano'), ['LOCANT_COUNT[0,2)']);
  assert.equal(parse(seq('1 2 cloro et ano')).errors[0].message, 'Con dos números hace falta «di».');
  assert.deepEqual(errorsOf('1 1 1 di cloro et ano'), ['LOCANT_COUNT[0,4)']);
  // `il` after a halogen is out of place.
  assert.deepEqual(errorsOf('cloro il prop ano'), ['TILE_ORDER[1,2)']);
  // o/m/p (design.md §14.4, checkLetters()): two different prefixes on benceno, three positions, a halogen on a chain.
  assert.deepEqual(errorsOf('o bromo cloro benceno'), ['POSITIONAL[0,1)']);
  assert.match(parse(seq('o bromo cloro benceno')).errors[0].message, /^Con dos grupos distintos en el benceno/);
  assert.deepEqual(errorsOf('p di cloro tolueno'), ['POSITIONAL[0,1)']);
  assert.match(parse(seq('p di cloro tolueno')).errors[0].message, /pone tres \(contando el metilo del tolueno\)/);
  assert.deepEqual(errorsOf('o di cloro et ano'), ['POSITIONAL[0,1)']);
  assert.deepEqual(errorsOf('START p cloro fenil END met ano'), ['POSITIONAL[1,2)']);
  // Accepted letters: two identical halogens on benceno, one beside the methyl of tolueno.
  assert.deepEqual(errorsOf('p di cloro benceno'), []);
  assert.deepEqual(errorsOf('m cloro tolueno'), []);
}); // End of test 'parse (R-5a1): errors and partial names with halogens…'

test('assemble (R-5a1): halogens take no automatic text and are never enclosed; the student\'s order and multipliers stay', () => {
  const text = (words) => assemble(parse(seq(words)).tree).text;
  assert.equal(text('2 bromo 1 cloro prop ano'), '2-bromo-1-cloropropano');
  assert.equal(text('1 cloro 2 bromo et ano'), '1-cloro-2-bromoetano', 'unsorted, as written');
  assert.equal(text('1 cloro 2 cloro et ano'), '1-cloro-2-cloroetano', 'ungrouped, as written');
  assert.equal(text('1 2 bis cloro et ano'), '1,2-biscloroetano', 'a wrong bis, as written');
  assert.equal(text('hexa cloro et ano'), 'hexacloroetano');
  assert.equal(text('dodeca fluoro ciclo hex ano'), 'dodecafluorociclohexano');
  assert.equal(text('hexa cloro but 1 3 di eno'), 'hexaclorobuta-1,3-dieno');
  // Crowded (no locants, several prefixes): render.js encloses only alkoxy and ring prefixes, never a halogen.
  assert.equal(text('bromo cloro fluoro yodo met ano'), 'bromoclorofluoroyodometano');
  assert.equal(text('START cloro fluoro met il END benceno'), '(clorofluorometil)benceno');
  assert.equal(text('cloro fenil met ano'), 'cloro(fenil)metano', 'the ring prefix after the first is enclosed');
  // Compound branches and multipliers.
  assert.equal(text('4 4 bis START cloro met il END hept ano'), '4,4-bis(clorometil)heptano');
  assert.equal(text('5 START 2 cloro prop ano 2 il END non ano'), '5-(2-cloropropan-2-il)nonano');
  assert.equal(text('1 START 4 cloro fenil END 4 met il benceno'), '1-(4-clorofenil)-4-metilbenceno');
  // Letters and templates.
  assert.equal(text('p di cloro benceno'), 'p-diclorobenceno');
  assert.equal(text('4 cloro tolueno'), '4-clorotolueno');
  // Spans: one per tile, the halogen a prefix part (as render.js gives `cloro` the kind 'prefix').
  const { spans } = assemble(parse(seq('2 cloro prop ano')).tree);
  assert.deepEqual(spans.filter((s) => s.tile !== null).map((s) => [s.tile, s.kind]), [[0, 'locant'], [1, 'prefix'], [2, 'stem'], [3, 'ending']]);
}); // End of test 'assemble (R-5a1): halogens take no automatic text…'

test('tokenize (R-5a1): halogen names read back to their tiles', () => {
  assert.deepEqual(tokenize('clorometano'), seq('cloro met ano'));
  assert.deepEqual(tokenize('2-bromo-1-cloropropano'), seq('2 bromo 1 cloro prop ano'));
  assert.deepEqual(tokenize('bromoclorofluoroyodometano'), seq('bromo cloro fluoro yodo met ano'));
  assert.deepEqual(tokenize('4,4-bis(clorometil)heptano'), seq('4 4 bis START cloro met il END hept ano'));
  assert.deepEqual(tokenize('5-(2-cloroetil)decano'), seq('5 START 2 cloro et il END dec ano'));
  assert.deepEqual(tokenize('(clorometil)benceno'), seq('START cloro met il END benceno'));
  assert.deepEqual(tokenize('p-diclorobenceno'), seq('p di cloro benceno'));
  assert.deepEqual(tokenize('1-cloropropa-1,2-dieno'), seq('1 cloro prop 1 2 di eno'));
  assert.deepEqual(tokenize('dodecafluorociclohexano'), seq('dodeca fluoro ciclo hex ano'));
  for (const text of ['cloro', '2-cloro', '(2-cloro)etano', 'clorofenil']) {
    assert.equal(tokenize(text), null, text);
  }
}); // End of test 'tokenize (R-5a1): halogen names read back to their tiles'

// ---------------------------------------------------------------------------
// Interpreter, builder, search.
// ---------------------------------------------------------------------------

test('interpret (R-5a1): a halogen is a SubstituentSpec of kind halogen, its slots carbon slots of what it hangs from', () => {
  const spec = specOf('1 1 di cloro 2 bromo et ano');
  const [cloro, bromo] = spec.prefixes;
  assert.deepEqual([cloro.substituent.kind, cloro.substituent.element, cloro.substituent.length, cloro.substituent.freeValence],
    ['halogen', 'Cl', null, null]);
  assert.deepEqual([cloro.substituent.word, cloro.substituent.prefixes, cloro.multiplier], [{ text: 'cloro', tiles: [3, 4] }, [],
    { count: 2, compound: false }]);
  assert.deepEqual(cloro.slots.map((slot) => [slot.kind, slot.value, slot.role, slot.domain]),
    [['supplied', 1, 'carbon', [1, 2]], ['supplied', 1, 'carbon', [1, 2]]]);
  assert.equal(bromo.substituent.element, 'Br');
  // Left out: carbon slots over the chain; on a phenyl, its carbons 2…6.
  assert.deepEqual(specOf('di cloro et ano').leftOut.map((slot) => [slot.role, slot.domain, slot.tiles]),
    [['carbon', [1, 2], [0, 2]], ['carbon', [1, 2], [0, 2]]]);
  // `(clorofenil)metano`: the phenyl on methane's one carbon, the chlorine on the phenyl's carbons 2…6.
  assert.deepEqual(specOf('START cloro fenil END met ano').leftOut.map((slot) => [slot.role, slot.domain]),
    [['carbon', [1, 1]], ['phenylCarbon', [2, 6]]]);
  assert.deepEqual(slotGroups(specOf('dodeca fluoro ciclo hex ano')).map((g) => [g.role, g.indices.length, g.domain]),
    [['carbon', 12, [1, 6]]], 'twelve identical occurrences, one multiset');
}); // End of test 'interpret (R-5a1): a halogen is a SubstituentSpec of kind halogen…'

test('build (R-5a1): one atom per halogen, single-bonded to its carbon; the caps count it as an atom, not a carbon', () => {
  const spec = specOf('2 bromo 1 cloro prop ano');
  const built = build(spec);
  assert.ok(built.ok);
  assert.equal(aromaticKey(built.molecule), keyOf('CC(Br)CCl'));
  const [bromo, cloro] = built.prefixAtoms;
  assert.deepEqual([bromo.locant, bromo.atoms.length, built.molecule.atoms.get(bromo.attachment).element], [2, 1, 'Br']);
  assert.equal(built.molecule.bonds.get(bromo.bond).order, 1);
  assert.equal(bromo.parentAtom, built.studentParent.atoms[1]);
  assert.deepEqual([cloro.locant, built.molecule.atoms.get(cloro.attachment).element], [1, 'Cl']);
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [3, 5]);
  // A compound branch's own halogens: one atom each, cut in build order (for the diagnosis).
  const compound = specOf('4 START 1 1 di cloro et il END oct ano');
  const branch = build(compound);
  const sub = compound.prefixes[0].substituent;
  const own = ownPrefixAtoms(sub, branch.prefixAtoms[0].atoms);
  assert.deepEqual(own.map((occurrences) => occurrences.map((atoms) => atoms.map((id) => branch.molecule.atoms.get(id).element))),
    [[['Cl'], ['Cl']]]);
  // The heavy-atom cap (model/validate.js): 30 carbons and 60 halogens is TOO_BIG with the engine's message.
  const big = read('triaconta fluoro triaconta cloro triacont ano');
  assert.deepEqual([big.kind, big.message, big.errors.map((e) => [e.code, e.from, e.to])],
    ['invalid', TOO_MANY_ATOMS_MESSAGE, [['TOO_BIG', 0, 6]]]);
  assert.ok(specAtoms(specOf('triaconta fluoro triaconta cloro triacont ano')) > MAX_HEAVY_ATOMS);
}); // End of test 'build (R-5a1): one atom per halogen…'

test('build and search (R-5a1): a halogen adds one bond to its carbon — VALENCE and ranges with their tiles', () => {
  /**
   * The invalid verdict of tile words as `[code, from, to, message]`.
   *
   * @param {string} words - Tile words.
   * @returns {Array} The first error.
   */
  const invalid = (words) => {
    const verdict = read(words);
    assert.equal(verdict.kind, 'invalid', words);
    const [error] = verdict.errors;
    return [error.code, error.from, error.to, error.message];
  };
  // Supplied locants: the locant that adds the fifth bond.
  assert.deepEqual(invalid('1 1 1 1 tetra cloro et ano'),
    ['VALENCE', 3, 4, 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4.']);
  // Left out, nowhere to fit (design.md: `pentaclorometano`).
  assert.deepEqual(invalid('penta cloro met ano'), ['VALENCE', 0, 2,
    'No caben: pongas donde pongas lo que va sin número, algún carbono tendría más de 4 enlaces.']);
  assert.deepEqual(invalid('hexa cloro tolueno').slice(0, 3), ['VALENCE', 0, 2]);
  // A ring carbon of a template that already carries its group.
  assert.deepEqual(invalid('1 cloro tolueno'), ['VALENCE', 0, 1,
    'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el tolueno, ese carbono ya lleva un metilo.']);
  // Ranges, as for any prefix.
  assert.deepEqual(invalid('3 cloro met ano'), ['LOCANT_RANGE', 0, 1, 'La cadena de 1 carbono solo tiene el carbono 1: no hay carbono 3.']);
  assert.deepEqual(invalid('7 cloro benceno'), ['LOCANT_RANGE', 0, 1, 'El benceno tiene 6 carbonos, del 1 al 6: no hay carbono 7.']);
  assert.deepEqual(invalid('START 1 cloro fenil END met ano'), ['LOCANT_RANGE', 1, 2, 'En «fenil», el carbono 1 es el que se une a la '
    + 'cadena: las ramas del fenil van en los carbonos del 2 al 6.']);
  // A retained word still takes no prefixes of its own.
  assert.deepEqual(invalid('START 2 cloro isopropil END met ano'), ['TILE_ORDER', 3, 4,
    'Esta ficha no puede ir aquí: «isopropil» ya es una rama entera y no lleva números ni ramas propias.']);
}); // End of test 'build and search (R-5a1): a halogen adds one bond to its carbon…'

test('search (R-5a1): `dodecafluorociclohexano` is one placement found at once; left-out halogens give the structures they fit', () => {
  const spec = specOf('dodeca fluoro ciclo hex ano');
  const start = performance.now();
  const search = searchStructures(spec, { namer: nameMolecule });
  const ms = performance.now() - start;
  assert.equal(search.status, 'complete');
  assert.deepEqual([search.structures.length, search.placements], [1, 1]);
  assert.deepEqual(search.structures[0].placements[0], [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
  assert.ok(ms < PER_NAME_BUDGET_MS, `${ms.toFixed(1)} ms`);
  // `hexaclorobuta-1,3-dieno`: the multiple bonds use the carbons' valence first, one placement too.
  assert.equal(searchStructures(specOf('hexa cloro but 1 3 di eno'), { namer: nameMolecule }).placements, 1);
  // `dicloroetano`: three placements, two structures (1,1 and 2,2 are one).
  const dichloro = searchStructures(specOf('di cloro et ano'), { namer: nameMolecule });
  assert.deepEqual(dichloro.structures.map((s) => [s.naming.name, s.placements.length]),
    [['1,1-dicloroetano', 2], ['1,2-dicloroetano', 1]]);
}); // End of test 'search (R-5a1): `dodecafluorociclohexano` is one placement found at once…'

// ---------------------------------------------------------------------------
// readName(): worked cases, our own cases, mutations, diagnosis.
// ---------------------------------------------------------------------------

/**
 * Halogen names read by readName(): [name (tile words or text), kind, the
 * engine's name, SMILES of the molecule described].
 */
const CASES = [
  // The worked cases of design.md §15.5.3.
  ['clorometano', 'correct', 'clorometano', 'CCl'],
  ['dodecafluorociclohexano', 'correct', 'dodecafluorociclohexano', 'FC1(F)C(F)(F)C(F)(F)C(F)(F)C(F)(F)C1(F)F'],
  // Chains, also with branches and multiple bonds.
  ['2-cloropropano', 'correct', '2-cloropropano', 'CC(Cl)C'],
  ['2-bromo-1-cloropropano', 'correct', '2-bromo-1-cloropropano', 'CC(Br)CCl'],
  ['1-bromo-2-metilpropano', 'correct', '1-bromo-2-metilpropano', 'BrCC(C)C'],
  ['3-cloro-2,2-dimetilbutano', 'correct', '3-cloro-2,2-dimetilbutano', 'CC(Cl)C(C)(C)C'],
  ['bromoclorofluoroyodometano', 'correct', 'bromoclorofluoroyodometano', 'ClC(Br)(I)F'],
  ['hexacloroetano', 'correct', 'hexacloroetano', 'ClC(Cl)(Cl)C(Cl)(Cl)Cl'],
  ['1,1,1-tricloro-2,2,2-trifluoroetano', 'correct', '1,1,1-tricloro-2,2,2-trifluoroetano', 'FC(F)(F)C(Cl)(Cl)Cl'],
  ['3-cloroprop-1-eno', 'correct', '3-cloroprop-1-eno', 'C=CCCl'],
  ['cloroetino', 'correct', 'cloroetino', 'ClC#C'],
  ['5-cloro-5-(propan-2-il)nonano', 'alternative', '5-cloro-5-isopropilnonano', 'CCCCC(C(C)C)(Cl)CCCC'],
  // Halogens inside compound branches.
  ['4,4-bis(clorometil)heptano', 'correct', '4,4-bis(clorometil)heptano', 'CCCC(CCl)(CCl)CCC'],
  ['5-(2-cloropropan-2-il)nonano', 'correct', '5-(2-cloropropan-2-il)nonano', 'CCCCC(C(C)(C)Cl)CCCC'],
  // Rings: `ciclo`, a ring branch, benceno, a substituted phenyl, the templates.
  ['1-cloro-2-metilciclohexano', 'correct', '1-cloro-2-metilciclohexano', 'ClC1CCCCC1C'],
  ['(2-cloroetil)ciclohexano', 'correct', '(2-cloroetil)ciclohexano', 'ClCCC1CCCCC1'],
  ['1-bromo-4-clorobenceno', 'correct', '1-bromo-4-clorobenceno', 'ClC1=CC=C(Br)C=C1'],
  ['hexaclorobenceno', 'correct', 'hexaclorobenceno', 'ClC1=C(Cl)C(Cl)=C(Cl)C(Cl)=C1Cl'],
  ['(triclorometil)benceno', 'correct', '(triclorometil)benceno', 'ClC(Cl)(Cl)C1=CC=CC=C1'],
  ['p-diclorobenceno', 'alternative', '1,4-diclorobenceno', 'ClC1=CC=C(Cl)C=C1'],
  ['1-(4-clorofenil)propano', 'otherName', '1-cloro-4-propilbenceno', 'CCCC1=CC=C(Cl)C=C1'],
  ['4-clorotolueno', 'otherName', '1-cloro-4-metilbenceno', 'CC1=CC=C(Cl)C=C1'],
  ['p-clorotolueno', 'otherName', '1-cloro-4-metilbenceno', 'CC1=CC=C(Cl)C=C1'],
  ['2-cloroestireno', 'otherName', '1-cloro-2-etenilbenceno', 'C=CC1=CC=CC=C1Cl'],
  // Left-out locants with one structure.
  ['1-cloropropeno', 'missingLocants', '1-cloroprop-1-eno', 'ClC=CC'],
  ['cloro-3-metilciclohexano', 'missingLocants', '1-cloro-3-metilciclohexano', 'ClC1CCCC(C)C1'],
];

test('readName (R-5a1): worked cases and our own — chains, branches, rings, benzenes, templates — with their molecules', () => {
  for (const [name, kind, engine, smiles] of CASES) {
    const verdict = read(name);
    assert.equal(verdict.kind, kind, `${name}: ${verdict.message}`);
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
}); // End of test 'readName (R-5a1): worked cases and our own…'

test('readName (R-5a1): left-out halogen locants list the structures (`dicloroetano`, design.md §15.5.3); never more', () => {
  for (const [name, candidates] of [
    ['dicloroetano', ['1,1-dicloroetano', '1,2-dicloroetano']],
    ['cloropropano', ['1-cloropropano', '2-cloropropano']],
    ['dicloroeteno', ['1,1-dicloroeteno', '1,2-dicloroeteno']],
    ['diclorobenceno', ['1,2-diclorobenceno', '1,3-diclorobenceno', '1,4-diclorobenceno']],
    ['clorotolueno', ['1-cloro-2-metilbenceno', '1-cloro-3-metilbenceno', '1-cloro-4-metilbenceno']],
    ['triclorotrifluoroetano', ['1,1,1-tricloro-2,2,2-trifluoroetano', '1,1,2-tricloro-1,2,2-trifluoroetano']],
    ['hexaclorobutadieno', ['hexaclorobuta-1,2-dieno', 'hexaclorobuta-1,3-dieno']],
    ['5-(cloroetil)nonano', ['5-(1-cloroetil)nonano', '5-(2-cloroetil)nonano']],
  ]) {
    const verdict = read(name);
    assert.equal(verdict.kind, 'ambiguous', `${name}: ${verdict.message}`);
    assert.deepEqual(verdict.candidates.map((c) => c.text), candidates, name);
    assert.deepEqual([verdict.molecule, verdict.draw], [null, false], name);
  } // End of the loop over the ambiguous names
  assert.equal(read('dicloroetano').message, 'Faltan números: puede ser 1,1-dicloroetano o 1,2-dicloroetano.');
  // Out of budget: incomplete, never a claim (30 fluorines over 30 carbons).
  assert.equal(read('triaconta fluoro triacont ano').kind, 'incomplete');
  assert.equal(read('di cloro et ano', { budget: { placements: 1 } }).kind, 'incomplete');
}); // End of test 'readName (R-5a1): left-out halogen locants list the structures…'

/**
 * Mutations of correct halogen names (design.md §15.7): [tile words,
 * assembled text, kind, the engine's name, SMILES of the molecule
 * described, diagnosis code of an `otherName` (null for none)].
 */
const MUTATIONS = [
  ['2 bromo 4 cloro pent ano', '2-bromo-4-cloropentano', 'correct', '2-bromo-4-cloropentano', 'CC(Cl)CC(Br)C', null],
  // Swapped locants: the same molecule numbered the other way.
  ['4 bromo 2 cloro pent ano', '4-bromo-2-cloropentano', 'otherName', '2-bromo-4-cloropentano', 'CC(Cl)CC(Br)C', 'NUMBERING'],
  // Swapped locants: another molecule.
  ['1 bromo 2 cloro prop ano', '1-bromo-2-cloropropano', 'correct', '1-bromo-2-cloropropano', 'BrCC(Cl)C', null],
  // Reversed numbering.
  ['3 cloro 2 met il prop ano', '3-cloro-2-metilpropano', 'otherName', '1-cloro-2-metilpropano', 'ClCC(C)C', 'NUMBERING'],
  ['4 cloro 3 met il hex ano', '4-cloro-3-metilhexano', 'otherName', '3-cloro-4-metilhexano', 'CCC(Cl)C(C)CC', 'NUMBERING'],
  ['2 cloro et ano', '2-cloroetano', 'otherName', 'cloroetano', 'CCCl', 'NUMBERING'],
  ['1 cloro 5 met il ciclo hex ano', '1-cloro-5-metilciclohexano', 'otherName', '1-cloro-3-metilciclohexano', 'ClC1CCCC(C)C1',
    'RING_NUMBERING'],
  ['3 bromo 1 cloro benceno', '3-bromo-1-clorobenceno', 'otherName', '1-bromo-3-clorobenceno', 'ClC1=CC(Br)=CC=C1', 'RING_NUMBERING'],
  // Unsorted prefixes.
  ['2 met il 1 cloro prop ano', '2-metil-1-cloropropano', 'otherName', '1-cloro-2-metilpropano', 'ClCC(C)C', 'ALPHABETICAL_ORDER'],
  ['1 1 di cloro 2 bromo et ano', '1,1-dicloro-2-bromoetano', 'otherName', '2-bromo-1,1-dicloroetano', 'BrCC(Cl)Cl',
    'ALPHABETICAL_ORDER'],
  ['4 cloro 1 bromo benceno', '4-cloro-1-bromobenceno', 'otherName', '1-bromo-4-clorobenceno', 'ClC1=CC=C(Br)C=C1',
    'ALPHABETICAL_ORDER'],
  // Ungrouped identical prefixes.
  ['1 cloro 2 cloro et ano', '1-cloro-2-cloroetano', 'otherName', '1,2-dicloroetano', 'ClCCCl', 'UNGROUPED'],
  ['1 cloro 4 cloro benceno', '1-cloro-4-clorobenceno', 'otherName', '1,4-diclorobenceno', 'ClC1=CC=C(Cl)C=C1', 'UNGROUPED'],
  // di ↔ bis, locants not ascending.
  ['1 2 bis cloro et ano', '1,2-biscloroetano', 'otherName', '1,2-dicloroetano', 'ClCCCl', 'MULTIPLIER_KIND'],
  ['2 1 di cloro prop ano', '2,1-dicloropropano', 'otherName', '1,2-dicloropropano', 'ClCC(Cl)C', 'LOCANT_ORDER'],
  // Needless locants: one- and two-carbon parents, a parent full of one halogen, a one-carbon branch.
  ['1 cloro met ano', '1-clorometano', 'otherName', 'clorometano', 'CCl', 'NEEDLESS_LOCANTS'],
  ['1 cloro et ano', '1-cloroetano', 'otherName', 'cloroetano', 'CCCl', 'NEEDLESS_LOCANTS'],
  ['1 1 1 2 2 2 hexa cloro et ano', '1,1,1,2,2,2-hexacloroetano', 'otherName', 'hexacloroetano', 'ClC(Cl)(Cl)C(Cl)(Cl)Cl',
    'NEEDLESS_LOCANTS'],
  ['1 cloro benceno', '1-clorobenceno', 'otherName', 'clorobenceno', 'ClC1=CC=CC=C1', 'NEEDLESS_LOCANTS'],
  ['4 START 1 cloro met il END oct ano', '4-(1-clorometil)octano', 'otherName', '4-(clorometil)octano', 'CCCC(CCl)CCCC',
    'NEEDLESS_LOCANTS'],
  // A carbon branch on an end lengthens the chain; a halogen there does not.
  ['1 cloro 1 met il prop ano', '1-cloro-1-metilpropano', 'otherName', '2-clorobutano', 'CC(Cl)CC', 'BRANCH_AT_END'],
  ['1 cloro prop ano', '1-cloropropano', 'correct', '1-cloropropano', 'CCCCl', null],
  // Removed locants (one structure fits).
  ['cloro 3 met il ciclo hex ano', 'cloro-3-metilciclohexano', 'missingLocants', '1-cloro-3-metilciclohexano', 'ClC1CCCC(C)C1', null],
  ['1 cloro ciclo hex eno', '1-clorociclohexeno', 'missingLocants', '1-clorociclohex-1-eno', 'ClC1=CCCCC1', null],
];

test('mutations of halogen names: swapped, reversed, unsorted, ungrouped, di/bis, needless and removed locants', () => {
  for (const [words, text, kind, name, smiles, code] of MUTATIONS) {
    const verdict = read(words);
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, kind, `${text}: ${verdict.message}`);
    assert.equal(verdict.name, name, text);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${text} builds another graph`);
    if (kind === 'otherName') {
      assert.ok(verdict.diagnosis, `${text}: no diagnosis`);
      assert.equal(verdict.diagnosis.code, code, `${text}: ${verdict.diagnosis.message}`);
    }
  } // End of the loop over the mutations
}); // End of test 'mutations of halogen names…'

test('diagnosis (R-5a1): the messages of the chain and ring rules with halogen prefixes', () => {
  for (const [words, code, message, tiles] of [
    ['1 cloro 1 met il prop ano', 'BRANCH_AT_END',
      'La rama «metil» está en el extremo de la cadena, así que la alarga: la cadena principal tiene 4 carbonos.', [2, 5]],
    ['2 START di cloro met iliden END but ano', 'MORE_MULTIPLE_BONDS', null, [7, 9]],
    // P4 counts the halogens: «sustituyentes», not «ramas», in a molecule with halogens.
    ['2 START cloro met il END but ano', 'MORE_SUBSTITUENTS', 'Hay otra cadena igual de larga con más sustituyentes (2; la tuya '
      + 'tiene 1). Entre cadenas igual de largas, gana la que tiene más sustituyentes.', [6, 8]],
    ['4 bromo 2 cloro pent ano', 'NUMBERING', 'Hay que numerar la cadena desde el otro extremo: con los mismos números, el sustituyente '
      + 'que va primero por orden alfabético tiene que llevar el más bajo (2 en vez de 4).', null],
    ['3 cloro 2 met il prop ano', 'NUMBERING', 'Hay que numerar la cadena desde el otro extremo: los sustituyentes tienen que llevar los '
      + 'números más bajos (1 en vez de 2).', null],
    ['2 cloro et ano', 'NUMBERING', 'Hay que numerar la cadena desde el otro extremo: los sustituyentes tienen que llevar los números '
      + 'más bajos (1 en vez de 2). En «cloroetano» ese número ni siquiera se escribe.', null],
    ['3 cloro 1 met il benceno', 'RING_NUMBERING', 'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando '
      + 'hacia el otro lado: con los mismos números, el sustituyente que va primero por orden alfabético tiene que llevar el más bajo '
      + '(1 en vez de 3).', null],
    ['2 met il 1 cloro prop ano', 'ALPHABETICAL_ORDER',
      'Los sustituyentes se escriben por orden alfabético: «cloro» va antes que «metil» (c antes que m).', [0, 5]],
    ['1 1 di cloro 2 bromo et ano', 'ALPHABETICAL_ORDER',
      'Los sustituyentes se escriben por orden alfabético: «bromo» va antes que «cloro» (b antes que c).', [0, 6]],
    ['4 yodo 2 met il pent ano', 'ALPHABETICAL_ORDER',
      'Los sustituyentes se escriben por orden alfabético: «metil» va antes que «yodo» (m antes que y).', [0, 5]],
    ['1 cloro 2 cloro et ano', 'UNGROUPED', 'Los sustituyentes iguales se escriben una sola vez, con «di», «tri»… delante: «1,2-dicloro», '
      + 'no «1-cloro-2-cloro».', [0, 4]],
    ['1 2 bis cloro et ano', 'MULTIPLIER_KIND', '«bis», «tris»… solo van delante de ramas que tienen sus propias ramas; aquí va «di», '
      + '«tri»…: «1,2-dicloro», no «1,2-biscloro».', [2, 3]],
    ['2 1 di cloro prop ano', 'LOCANT_ORDER', 'Los números de un mismo grupo se escriben de menor a mayor: «1,2-dicloro», '
      + 'no «2,1-dicloro».', [0, 2]],
    ['1 cloro met ano', 'NEEDLESS_LOCANTS',
      'En «clorometano» no se escriben números: solo hay una manera de colocar el sustituyente.', [0, 1]],
    ['1 1 1 2 2 2 hexa cloro et ano', 'NEEDLESS_LOCANTS',
      'En «hexacloroetano» no se escriben números: solo hay una manera de colocar los sustituyentes.', [0, 6]],
    ['5 START 2 cloro et ano 1 il END non ano', 'NEEDLESS_LOCANTS',
      'Sobran números dentro de la rama: se escribe «5-(2-cloroetil)», no «5-(2-cloroetan-1-il)».', [6, 7]],
    ['5 START 1 1 di cloro met ano 1 il END non ano', 'NEEDLESS_LOCANTS',
      'Sobran números dentro de la rama: se escribe «5-(diclorometil)», no «5-(1,1-diclorometan-1-il)».', [2, 9]],
    ['1 START 4 cloro fenil END prop ano', 'RING_IS_PARENT', 'El anillo es la cadena principal: un anillo manda siempre sobre una '
      + 'cadena abierta, aunque la cadena sea más larga. Tu cadena de 3 carbonos va en una rama del anillo: «1-cloro-4-propilbenceno».',
    [0, 6]],
    ['p cloro tolueno', 'SUBSTITUTED_TEMPLATE', 'El nombre tradicional «tolueno» no admite más sustituyentes: con más ramas en el anillo, '
      + 'la molécula se nombra a partir de «benceno», con todas las ramas delante: «1-cloro-4-metilbenceno».', [2, 3]],
  ]) {
    const verdict = read(words);
    const d = verdict.diagnosis;
    assert.equal(verdict.kind, 'otherName', `${verdict.text}: ${verdict.message}`);
    assert.ok(d, `${verdict.text}: no diagnosis`);
    assert.equal(d.code, code, `${verdict.text}: ${d.message}`);
    if (message) {
      assert.equal(d.message, message, verdict.text);
    }
    assert.deepEqual(d.tiles, tiles, `${verdict.text}: tiles`);
    // «Ver el paso» opens a step of the explanation of the naming it compared with.
    const opened = diagnosisExplanation(verdict, explain);
    assert.ok([d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), verdict.text);
  } // End of the loop over the diagnosis cases
  // The hydrocarbon wording stays the default (examples of the drafts, R-7).
  assert.equal(DIAGNOSES.MORE_SUBSTITUENTS.example.halogen, false);
  assert.equal(DIAGNOSES.UNGROUPED.example.halogen, false);
}); // End of test 'diagnosis (R-5a1): the messages of the chain and ring rules with halogen prefixes'

test('diagnosis (R-5a1): deliberate nulls — a compound branch numbered from the other end, which no rule names', () => {
  // `(1-cloroetan-2-il)` is `(2-cloroetil)` numbered from its other end: dropping its free-valence locant would move the
  // branch onto the chlorine's carbon (`(1-cloroetil)`, another molecule), so no NEEDLESS_LOCANTS; no rule covers a
  // branch's own numbering (diagnose.js header «No rule covers»).
  // The same fix holds for a hydrocarbon branch: `(1-metiletan-2-il)` is `propil`, never «se escribe (1-metiletil)».
  for (const words of ['5 START 1 cloro et ano 2 il END non ano', '5 START 1 cloro prop ano 3 il END non ano',
    '5 START 1 met il et ano 2 il END non ano']) {
    const verdict = read(words);
    assert.equal(verdict.kind, 'otherName', verdict.text);
    assert.equal(verdict.diagnosis, null, `${verdict.text}: ${verdict.diagnosis && verdict.diagnosis.message}`);
  }
  assert.equal(read('5 START 1 cloro et ano 2 il END non ano').name, '5-(2-cloroetil)nonano');
  assert.equal(read('5 START 1 met il et ano 2 il END non ano').name, '5-propilnonano');
  // Its free valence at carbon 1, the locants are needless as before.
  assert.equal(read('5 START 1 met il et ano 1 il END non ano').diagnosis.message,
    'Sobran números dentro de la rama: se escribe «5-(1-metiletil)», no «5-(1-metiletan-1-il)».');
}); // End of test 'diagnosis (R-5a1): deliberate nulls…'

test('«Dibujar» (R-5a1): halogen verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const name of ['clorometano', 'bromoclorofluoroyodometano', 'dodecafluorociclohexano', '1-bromo-4-clorobenceno',
    '4,4-bis(clorometil)heptano', 'hexaclorobenceno', '4-clorotolueno', '1-(4-clorofenil)propano', '2-metil-1-cloropropano']) {
    const verdict = read(name);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-5a1): halogen verdicts have an ordered drawing…'

// ---------------------------------------------------------------------------
// Fixture round trip and closed loop (design.md §15.7).
// ---------------------------------------------------------------------------

test('fixture round trip (R-5a1): every halogen row of I-30 and I-42a, graph compared with the SMILES', async () => {
  const fixtures = await readFixtures();
  const rows = fixtures.filter((row) => isHalogenDerivative(row.smiles));
  let covered = 0;
  let elapsed = 0;
  for (const row of rows) {
    const expected = keyOf(row.smiles);
    for (const name of row.names) {
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
  assert.equal(rows.length, EXPECTED_ROWS.total);
  assert.equal(rows.filter((row) => row.section.includes('(I-30)')).length, EXPECTED_ROWS.i30);
  assert.equal(rows.filter((row) => row.section.includes('(I-42a')).length, EXPECTED_ROWS.i42a);
  assert.equal(covered, EXPECTED_NAMES);
  assert.ok(elapsed / covered < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / covered).toFixed(2)} ms on average`);
  // Every I-30 row is a halogen derivative of a hydrocarbon: none is left for a later phase.
  assert.equal(fixtures.filter((row) => row.section.includes('(I-30)') && !isHalogenDerivative(row.smiles)).length, 0);
}); // End of test 'fixture round trip (R-5a1): every halogen row of I-30 and I-42a…'

/** The closed loop's halogen derivatives (scripts/oracle/generate.mjs; design.md §15.7). */
const LOOP = Object.freeze({
  halogenated: Object.freeze({ count: 400, seed: 5101, minSize: 1, maxSize: 12 }),
  benzenes: Object.freeze({ count: 400, seed: 5102, minSize: 6, maxSize: 12 }),
});

/**
 * Minimum coverage of the closed loop: molecules (400 from
 * generateHalogenated(), the halogen-only benzenes of generateBenzenes(),
 * distinct by aromatic key), names read back, removed-locant mutations and
 * decisive verdicts among them (the seeds give 512, 523, 1849 and 1847).
 */
const LOOP_MIN = Object.freeze({ molecules: 500, names: 510, removed: 1800, decisive: 1790 });

/**
 * Tells whether a molecule is a halogen derivative of a hydrocarbon:
 * carbons and halogens only, at least one halogen.
 *
 * @param {object} mol - A molecule.
 * @returns {boolean} True for a halogen derivative.
 */
function isHalogenMolecule(mol) {
  const elements = [...mol.atoms.values()].map((atom) => atom.element);
  return elements.every((e) => ['C', 'F', 'Cl', 'Br', 'I'].includes(e)) && elements.some((e) => e !== 'C');
}

/**
 * The closed loop's molecules, distinct by aromatic key.
 *
 * @returns {object[]} The molecules.
 */
function loopMolecules() {
  const seen = new Set();
  const molecules = [];
  for (const mol of [...generateHalogenated(LOOP.halogenated), ...generateBenzenes(LOOP.benzenes).filter(isHalogenMolecule)]) {
    const key = aromaticKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  }
  return molecules;
} // End of function loopMolecules()

/**
 * The locant lists of a tree a student can leave out: a prefix's and a
 * segment's, at any depth — never a free-valence locant.
 *
 * @param {object} tree - An error-free parse() tree.
 * @returns {number[][]} The lists of number tile indices.
 */
function locantLists(tree) {
  const lists = [];
  /**
   * Collects the segments of a chain or ring (none for `benceno`, a retained word or a halogen).
   *
   * @param {object} chain - A chain, benzene, template, retained or halogen node.
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
  return lists;
} // End of function locantLists()

test('closed loop over the halogen generators: engine name → tiles → readName() → the same graph, then without each locant list', () => {
  const molecules = loopMolecules();
  const counts = { names: 0, removed: 0, decisive: 0 };
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    assert.ok(naming.ok, naming.ok ? '' : naming.error.message);
    const key = aromaticKey(mol);
    const all = [naming.name, ...naming.alternatives.map((alt) => alt.name)];
    for (const [i, name] of all.entries()) {
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
}); // End of test 'closed loop over the halogen generators…'

// ---------------------------------------------------------------------------
// Diagnosis sweeps over mutations (design.md §15.7).
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
 * @param {number[]} positions - The list's tile indices.
 * @param {(value: number) => number} map - The new value of each locant.
 * @returns {void}
 */
function rewriteLocants(out, tiles, positions, map) {
  const values = positions.map((p) => map(tiles[p].value)).sort((a, b) => a - b);
  positions.forEach((p, k) => {
    out[p] = num(values[k]);
  });
}

/** The diagnosis codes an `otherName` of each mutation family may give (the trace's own rule for a new molecule). */
const FAMILY_CODES = Object.freeze({
  reversed: ['NUMBERING'],
  reflected: ['RING_NUMBERING'],
  rotated: ['RING_NUMBERING'],
  swapped: ['NUMBERING', 'RING_NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS'],
  unsorted: ['ALPHABETICAL_ORDER'],
  ungrouped: ['UNGROUPED'],
  diBis: ['MULTIPLIER_KIND'],
  toEnd: ['BRANCH_AT_END'],
  halogenToEnd: ['NUMBERING', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS'],
  removed: [],
  added: ['NEEDLESS_LOCANTS', 'NUMBERING', 'RING_NUMBERING'],
});

/**
 * The mutations of one halogen name: renumbered (reversed on a chain;
 * reflected and rotated on a ring), locants swapped between two prefixes,
 * prefixes in reverse order, identical prefixes written one by one, di ↔
 * bis, a single-locant prefix moved to an end of a chain (a carbon branch:
 * BRANCH_AT_END; a halogen: another molecule, never BRANCH_AT_END), a
 * prefix's locants removed, or added (1… and 2…) where it has none.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {{family: string, ids: string[]}[]} The mutations.
 */
function mutationsOf(ids) {
  const { tree } = parse(ids);
  const { tiles, items } = tree;
  const parent = tree.parent.chain;
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
  const renumberings = ring ? [{ family: 'reflected', carbon: (v) => (v === 1 ? 1 : n + 2 - v), bond: (k) => (k === n ? 1 : n - k) }]
    : [{ family: 'reversed', carbon: (v) => n + 1 - v, bond: (k) => n - k }];
  for (let s = 1; ring && s < n; s += 1) {
    renumberings.push({ family: 'rotated', carbon: (v) => ((v - 1 + s) % n) + 1, bond: (k) => ((k - 1 + s) % n) + 1 });
  }
  for (const { family, carbon, bond } of renumberings) {
    const mutated = [...ids];
    items.forEach((item) => rewriteLocants(mutated, tiles, item.locants, carbon));
    segments.forEach((segment) => rewriteLocants(mutated, tiles, segment.locants, bond));
    push(family, mutated);
  }
  const single = items.filter((item) => item.locants.length === 1);
  single.forEach((a, i) => single.slice(i + 1).forEach((b) => {
    const swapped = [...ids];
    [swapped[a.locants[0]], swapped[b.locants[0]]] = [ids[b.locants[0]], ids[a.locants[0]]];
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
    if (item.locants.length === 1 && !ring) {
      for (const end of [1, n].filter((e) => e !== tiles[item.locants[0]].value)) {
        const moved = [...ids];
        moved[item.locants[0]] = num(end);
        push(item.substituent.type === 'halogen' ? 'halogenToEnd' : 'toEnd', moved);
      }
    }
    if (item.locants.length > 0) {
      push('removed', ids.filter((_, k) => !item.locants.includes(k)));
    } else if (item.letter === null) {
      const count = item.multiplier === null ? 1 : tiles[item.multiplier].value;
      for (const start of [1, 2].filter((s) => s + count - 1 <= n)) {
        push('added', [...ids.slice(0, item.range[0]), ...Array.from({ length: count }, (_, k) => num(start + k)), ...ids.slice(item.range[0])]);
      }
    }
  } // End of the loop over the parent-level prefixes
  return out;
} // End of function mutationsOf()

/**
 * Reads every mutation of some halogen names: every `otherName` must carry
 * a diagnosis of its family's codes whose step resolves in its explanation.
 *
 * @param {string[]} names - Halogen names (engine names or alternatives).
 * @returns {{otherName: Object<string, number>, codes: Set<string>, nulls: string[]}} `otherName` counts by family, the
 *   codes seen and the texts of `otherName` verdicts without a diagnosis.
 */
function sweep(names) {
  const otherName = Object.fromEntries(Object.keys(FAMILY_CODES).map((family) => [family, 0]));
  const codes = new Set();
  const nulls = [];
  for (const name of names) {
    for (const mutation of mutationsOf(idsOf(name))) {
      const verdict = readName(mutation.ids);
      if (verdict.kind !== 'otherName') {
        continue;
      }
      otherName[mutation.family] += 1;
      const label = `${name} → ${mutation.family} ${verdict.text}`;
      const d = verdict.diagnosis;
      if (!d) {
        nulls.push(label);
        continue;
      }
      codes.add(d.code);
      assert.ok(FAMILY_CODES[mutation.family].includes(d.code), `${label}: ${d.code}, ${d.message}`);
      assert.ok(!/undefined|null|NaN|\[object/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), label);
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return { otherName, codes, nulls };
} // End of function sweep()

/**
 * How many mutations of the halogen fixture names give `otherName`, by
 * family; every one is diagnosed with one of its family's codes (no null).
 * Removing locants never gives `otherName`.
 */
const FIXTURE_OTHER_NAME = Object.freeze({
  reversed: 23, reflected: 8, rotated: 58, swapped: 16, unsorted: 25, ungrouped: 16, diBis: 28, toEnd: 24, halogenToEnd: 20,
  removed: 0, added: 31,
});

test('mutations of every halogen fixture name: a diagnosis of the family\'s codes for every otherName, and a coverage count', async () => {
  const names = (await readFixtures()).filter((row) => isHalogenDerivative(row.smiles)).flatMap((row) => row.names);
  assert.equal(names.length, EXPECTED_NAMES);
  const { otherName, codes, nulls } = sweep(names);
  assert.deepEqual(nulls, []);
  assert.deepEqual(otherName, { ...FIXTURE_OTHER_NAME });
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'BRANCH_AT_END', 'MULTIPLIER_KIND', 'NEEDLESS_LOCANTS', 'NUMBERING',
    'RING_NUMBERING', 'UNGROUPED']);
}); // End of test 'mutations of every halogen fixture name…'

test('mutations of the generated halogen derivatives: every otherName is diagnosed, every step resolves', () => {
  const names = [];
  for (const mol of loopMolecules().slice(0, 300)) {
    const naming = nameMolecule(mol);
    names.push(naming.name, ...naming.alternatives.map((alt) => alt.name));
  }
  assert.ok(names.length >= 300, `${names.length} names`);
  const { otherName, codes, nulls } = sweep(names);
  assert.deepEqual(nulls, []);
  const total = Object.values(otherName).reduce((sum, count) => sum + count, 0);
  assert.ok(total >= 1900, `${total} otherName verdicts`); // The seeds give 1960.
  assert.equal(otherName.removed, 0);
  for (const code of ['NUMBERING', 'RING_NUMBERING', 'ALPHABETICAL_ORDER', 'UNGROUPED', 'MULTIPLIER_KIND', 'NEEDLESS_LOCANTS',
    'BRANCH_AT_END', 'MORE_SUBSTITUENTS']) {
    assert.ok(codes.has(code), code);
  }
}); // End of test 'mutations of the generated halogen derivatives…'

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

test('property (R-5a1): random halogen names — any parent, locants or none, inside branches too — never crash', () => {
  const random = mulberry32(20261020);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const halogens = ['fluoro', 'cloro', 'bromo', 'yodo'];
  const branches = [...halogens, ...halogens, 'met il', 'et il', 'isopropil', 'START cloro met il END', 'START 2 bromo et il END',
    'START 4 cloro fenil END'];
  const parents = ['met ano', 'et ano', 'et eno', 'prop ano', 'but 1 eno', 'pent ano', 'ciclo hex ano', 'ciclo prop ano', 'benceno',
    'tolueno', 'xileno'];
  const multipliers = { 1: '', 2: 'di', 3: 'tri', 4: 'tetra' };
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const prefixes = Array.from({ length: int(1, 3) }, () => {
      const count = int(1, 4);
      const located = random() < 0.6;
      const locants = located ? Array.from({ length: count }, () => int(1, 6)).join(' ') : '';
      return [locants, multipliers[count], pick(branches)].join(' ');
    });
    const words = [...prefixes, pick(parents)].join(' ');
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
}); // End of test 'property (R-5a1): random halogen names…'

test('time budget: halogen readName() calls, with their diagnosis, well within budget', () => {
  const names = ['dodecafluorociclohexano', 'hexaclorobenceno', '1,1,1-tricloro-2,2,2-trifluoroetano', 'bromoclorofluoroyodometano',
    'dicloroetano', 'triclorotrifluoroetano', '1,1,1,2,2,2-hexacloroetano', '2-metil-1-cloropropano', '1-(4-clorofenil)propano',
    'hexaclorobutadieno', '2-cloro-4-etenil-1-etinil-3-fluorobenceno'];
  names.forEach((name) => read(name)); // Warm-up.
  for (const name of names) {
    const start = performance.now();
    const verdict = read(name);
    const ms = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', name);
    assert.ok(ms < PER_NAME_BUDGET_MS, `${name}: ${ms.toFixed(1)} ms`);
  }
}); // End of test 'time budget…'
