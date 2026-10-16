/**
 * @file Unit tests for the amino prefixes in «¿Cómo se dibuja?» (src/reverse/,
 * design.md §15.5.2, §15.5.3, §15.7, §15.8 R-6c; phase I-52c2, R-6c2): the
 * «Grupos» row's `amino` (an amine's nitrogen as a prefix, single-bonded to
 * the carbon its locant gives: `2-aminoetan-1-ol`, `ácido 2-aminopropanoico`,
 * `etanoato de 2-aminoetilo`, `4-aminobenzonitrilo`) and the N-substituted
 * amino prefixes the forward engine writes (render.js substituentTokens():
 * the groups on the nitrogen before `amino`, without locants, every one
 * after the first enclosed — `(metilamino)`, `(dimetilamino)`,
 * `[etil(metil)amino]`, `bis(metilamino)`), composed from the tiles as a
 * compound branch whose own chain is `amino`. Parser (the tree, the groups'
 * locants and acyl groups refused with their tile ranges and hints, `oxi`,
 * class names and O-bound groups), assembler (every form checked against
 * the forward engine's own text), tokenizer (the amides' later words never
 * read; their suffixes, beside an amino prefix too, since phase R-6d1),
 * interpreter (the amino SubstituentSpec, its groups' implicit slots, the
 * left-out slots), builder (the nitrogen and its groups, VALENCE on a third
 * group), search (left-out locants: missingLocants, ambiguous, incomplete),
 * readName() verdicts with the molecule each describes (compared by aromatic
 * key with a SMILES), the engine's refusals, mutations and their diagnosis
 * (the shared rules, which hold for an amino prefix; the amino prefix's own
 * mistakes deliberate nulls of diagnose.js «Amines», each with its category
 * read independently), the fixture round trip over every row of
 * tests/fixtures/names.tsv with an amino name and the closed loop over the
 * oracle's generators that write them (pure imports, no Java), the
 * diagnosis sweeps with exact counts, the ordered drawing, the dialog's
 * tooltip, robustness and time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse, isTerminalSuffix } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build, specAtoms } from '../../src/reverse/build.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { slotGroups } from '../../src/reverse/search.js';
import { AMINO_ID, AMINO_KIND, isChainTemplate, templateLength } from '../../src/reverse/tiles.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { TILE_HINTS } from '../../src/ui/name-builder.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import {
  generateAmines, generateRingOutsideBenzenes, generateSubstitutedPhenyls, generateNitriles, generateCyano, generateAcyl,
  generateRingAcids, generateRingNitrilesAmides, generateRingPrincipalBenzenes, generateRingPolysuffixBenzenes,
  generateRingSubstituents, generateAmidePrefixes, generateAmides,
} from '../../scripts/oracle/generate.mjs';
import {
  seq, readFixtures, isAmine, isAmide, isAmideMolecule, isAminoName, isAmineName, isAmideName, hasAcylamino, AMINO_WORD,
  isLaterAmideName,
} from './reverse-words.js';

/**
 * Fixture rows with an amino name (isAminoName()): 67, of which 47 the tiles
 * read — 36 with an amine nitrogen (the amino prefix's; isAmine()) and 11
 * amides: the amide prefixes the engine writes `amino` + `oxo` on one carbon
 * (isAmide(), I-39d: `ácido 4-amino-4-oxobutanoico`) and, since phase R-6d1,
 * an amino prefix beside an amide suffix (`2-aminopropanamida`,
 * `N-(2-amino-2-oxoetil)butanamida`) —, by section: I-36 15, I-37 2, I-38 2,
 * I-39a 2, I-39d 12, I-40a 3, I-40b 1, I-40c 1, I-43a 3, I-43b 4, I-44 1,
 * I-45a 1; the other 20 rows are amides whose names have the amides' later
 * words (isLaterAmideName(), phases R-6d2 and R-6d3: `carbamoil`, acylamino,
 * the retained amide names). Until phase R-6d1 43 rows were read (33 and
 * 10).
 */
const EXPECTED_ROWS = Object.freeze({
  total: 67, read: 47, amine: 36, amide: 11, i36: 15, i37: 2, i38: 2, i39a: 2, i39d: 12, i40a: 3, i40b: 1, i40c: 1, i43a: 3, i43b: 4,
  i44: 1, i45a: 1,
});

/**
 * Their names and alternatives: 58 the tiles write, read back, 4 of them
 * amide names read since phase R-6d1 (swept in reverse-amides.test.js); 21
 * with the amides' later words, never tokenized (until phase R-6d1, 54 and
 * 25).
 */
const EXPECTED_NAMES = Object.freeze({ read: 58, amides: 4, later: 21 });

/** Average time budget of one readName() call over the fixture round trip, in milliseconds (phones are slower). */
const AVERAGE_BUDGET_MS = 50;

/** Time budget of one representative readName() call, in milliseconds. */
const PER_NAME_BUDGET_MS = 250;

/**
 * The tile ids of a name: space-separated tile words (reverse-words.js) when
 * every word is a tile, else a name text read by the tokenizer.
 *
 * @param {string} name - Tile words or a name.
 * @returns {string[]} The tile ids.
 */
function idsOf(name) {
  let ids = null;
  try {
    ids = seq(name);
  } catch (err) {
    ids = null; // A name text: `2-(metilamino)etan-1-ol`.
  }
  ids = ids || tokenize(name);
  assert.ok(ids, `no tiles for ${name}`);
  return ids;
} // End of function idsOf()

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
 * The first parse error's message.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {string} The message.
 */
function messageOf(words) {
  return parse(seq(words)).errors[0].message;
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
 * The aromatic key of a SMILES (both Kekulé drawings of a benzene ring alike).
 *
 * @param {string} smiles - The SMILES.
 * @returns {string} The key.
 */
function keyOf(smiles) {
  return aromaticKey(parseSmiles(smiles));
}

/**
 * The engine's names of a SMILES: its name and every alternative.
 *
 * @param {string} smiles - The SMILES.
 * @returns {string[]} The names.
 */
function namesOf(smiles) {
  const naming = nameMolecule(parseSmiles(smiles));
  assert.ok(naming.ok, smiles);
  return [naming.name, ...naming.alternatives.map((alt) => alt.name)];
}

/**
 * The bonds of each nitrogen of a molecule: its neighbours' elements and
 * bond orders (`C1 C1 C1` for a dimethylamino group's), the nitrogens sorted.
 *
 * @param {object} mol - A molecule.
 * @returns {string[]} Per nitrogen, its bonds.
 */
function nitrogenBonds(mol) {
  const bonds = [...mol.bonds.values()];
  return [...mol.atoms].filter(([, atom]) => atom.element === 'N').map(([id]) => bonds
    .filter((bond) => bond.a === id || bond.b === id)
    .map((bond) => `${mol.atoms.get(bond.a === id ? bond.b : bond.a).element}${bond.order}`)
    .sort().join(' ')).sort();
}

// ---------------------------------------------------------------------------
// Parser.
// ---------------------------------------------------------------------------

test('parser (R-6c2): `amino` a retained word; as a compound branch\'s own chain, the groups on its nitrogen before it', () => {
  const bare = parse(seq('2 amino et ano 1 ol'));
  assert.deepEqual(bare.errors, []);
  assert.deepEqual([bare.tree.items[0].locants, bare.tree.items[0].substituent.type, bare.tree.tiles[1].id], [[0], 'retained', AMINO_ID]);
  const { tree, errors } = parse(seq('2 START et il met il amino END et ano 1 ol'));
  assert.deepEqual(errors, []);
  const branch = tree.items[0].substituent;
  assert.deepEqual([branch.type, branch.chain.type, tree.tiles[branch.chain.tile].id], ['branch', 'retained', AMINO_ID]);
  assert.deepEqual(branch.items.map((item) => [item.locants, item.multiplier, item.range]), [[[], null, [2, 4]], [[], null, [4, 6]]]);
  // `amino` before a chain is a prefix of that chain (`(aminometil)`); a group on the nitrogen may hold one (`[(2-aminoetil)amino]`).
  assert.equal(parse(seq('START amino met il END ciclo hex ano ol')).tree.items[0].substituent.chain.type, 'chain');
  for (const words of ['2 START di met il amino END et ano 1 ol', '1 3 bis START met il amino END prop ano 2 ol',
    '2 START START 2 cloro et il END amino END et ano 1 ol', '2 START START 2 amino et il END amino END et ano 1 ol',
    'et ano oato 2 START et il met il amino END et ilo', '2 START tri met il amino END et ano 1 ol', '1 2 bis amino et ano ol',
    '2 START amino amino END et ano 1 ol', '2 START cloro amino END et ano 1 ol', '2 START acetil oxi amino END et ano 1 ol']) {
    assert.deepEqual(errorsOf(words), [], words); // The chemistry of the last five is build.js's and the engine's.
  }
}); // End of test 'parser (R-6c2): `amino` a retained word…'

test('parser (R-6c2): the groups on an amino prefix\'s nitrogen take no locants or acyl groups; `amino` out of place', () => {
  const place = 'Esta ficha no puede ir aquí: los grupos unidos al nitrógeno de «amino» van delante de «amino», sin números ni letras: '
    + '(metilamino), (dimetilamino), [etil(metil)amino]. Si un grupo lleva sus propias ramas, va en su propia rama compuesta, con '
    + 'sus números dentro: [(2-cloroetil)amino].';
  for (const [words, errors] of [
    ['2 START 1 met il amino END et ano 1 ol', ['TILE_ORDER[2,3)']],
    ['2 START N met il amino END et ano 1 ol', ['TILE_ORDER[2,3)']], // not the `N` locant's own hint (R-6c1)
    ['2 START o met il amino END et ano 1 ol', ['TILE_ORDER[2,3)']], // no POSITIONAL besides
    ['et ano oato 2 START o met il amino END et ilo', ['TILE_ORDER[5,6)']],
  ]) {
    assert.deepEqual(errorsOf(words), errors, words);
    assert.equal(messageOf(words), place, words);
  }
  assert.deepEqual(errorsOf('2 START 1 2 di met il amino END et ano 1 ol'), ['TILE_ORDER[2,4)']);
  assert.match(messageOf('2 START 1 2 di met il amino END et ano 1 ol'), /^Estas fichas no pueden ir aquí: los grupos unidos/);
  // An acyl group on the nitrogen makes an amide (the acylamino prefixes, phase R-6d).
  const acyl = (word) => `Esta ficha no puede ir aquí: «${word}» no va unido al nitrógeno de «amino»: un grupo C=O unido al nitrógeno no `
    + 'forma una amina, sino una amida.';
  for (const [words, range, word] of [
    ['2 START acetil amino END et ano 1 ol', [2, 3], 'acetil'],
    ['2 START formil amino END et ano 1 ol', [2, 3], 'formil'],
    ['2 START benzoil amino END et ano 1 ol', [2, 3], 'benzoil'],
    ['2 START prop ano oil amino END et ano 1 ol', [4, 5], 'oil'],
    ['2 START ciclo hex ano carbonil amino END et ano 1 ol', [5, 6], 'carbonil'],
    ['2 START START 2 met il prop ano oil END amino END et ano 1 ol', [8, 9], 'oil'],
    ['2 START acetil met il amino END et ano 1 ol', [2, 3], 'acetil'],
  ]) {
    assert.deepEqual(errorsOf(words), [`TILE_ORDER[${range[0]},${range[1]})`], words);
    assert.equal(messageOf(words), acyl(word), words);
  }
  // `oxi` after `amino`, `amino` in an ether's class name or as an ester's O-bound group.
  assert.deepEqual(errorsOf('amino oxi et ano ol'), ['TILE_ORDER[1,2)']);
  assert.equal(messageOf('amino oxi et ano ol'), 'Esta ficha no puede ir aquí: «oxi» no va detrás de «amino»: un grupo amino unido a un '
    + 'oxígeno no forma un éter.');
  assert.deepEqual(errorsOf('amino met il éter'), ['TILE_ORDER[0,1)']);
  assert.match(messageOf('amino met il éter'), /«amino» no va en un nombre con «éter»: un grupo amino unido al oxígeno no forma un éter/);
  assert.deepEqual(errorsOf('et ano oato amino ilo'), ['TILE_ORDER[3,4)']);
  assert.match(messageOf('et ano oato amino ilo'), /«amino» no va unido al oxígeno de un éster: el grupo unido al oxígeno es una cadena/);
  // A name that ends in an amino prefix ends in «un grupo»; two locants before an amino prefix with groups ask for `bis`.
  assert.deepEqual(errorsOf('2 amino'), ['ENDS_WITH_BRANCH[0,2)']);
  assert.equal(messageOf('2 amino'), 'El nombre acaba en un grupo («amino»): falta la cadena principal detrás.');
  assert.equal(messageOf('START met il amino END'), 'El nombre acaba en un grupo («(metilamino)»): falta la cadena principal detrás.');
  assert.deepEqual(errorsOf('1 2 START met il amino END et ano ol'), ['LOCANT_COUNT[0,2)']);
  assert.equal(messageOf('1 2 START met il amino END et ano ol'), 'Con dos números hace falta «bis».');
}); // End of test 'parser (R-6c2): the groups on an amino prefix\'s nitrogen…'

// ---------------------------------------------------------------------------
// Assembler and tokenizer.
// ---------------------------------------------------------------------------

/** Amino forms (tile words) and a SMILES whose engine names include the assembled text. */
const FORMS = Object.freeze([
  ['2 amino et ano 1 ol', 'NCCO'],
  ['1 3 di amino prop ano 2 ol', 'NCC(O)CN'],
  ['2 2 di amino et ano 1 ol', 'NC(N)CO'],
  ['ácido 2 amino prop ano oico', 'CC(N)C(=O)O'],
  ['4 amino but ano al', 'NCCCC=O'],
  ['4 amino but ano 2 ona', 'NCCC(C)=O'],
  ['2 amino prop ano nitrilo', 'CC(N)C#N'],
  ['2 amino et ano oato met ilo', 'NCC(=O)OC'],
  ['et ano oato 2 amino et ilo', 'CC(=O)OCCN'],
  ['2 amino ciclo hex ano 1 ol', 'NC1CCCCC1O'],
  ['4 amino fenol', 'NC1=CC=C(O)C=C1'],
  ['4 amino benzonitrilo', 'NC1=CC=C(C#N)C=C1'],
  ['ácido 4 amino ciclo hex ano 1 carboxílico', 'NC1CCC(C(=O)O)CC1'],
  ['2 START met il amino END et ano 1 ol', 'CNCCO'],
  ['2 START di met il amino END et ano 1 ol', 'CN(C)CCO'],
  ['2 START et il met il amino END et ano 1 ol', 'CCN(C)CCO'],
  ['2 START di et il amino END et ano 1 ol', 'OCCN(CC)CC'],
  ['2 START et il prop il amino END et ano 1 ol', 'CCCN(CC)CCO'],
  ['2 START isopropil amino END et ano 1 ol', 'CC(C)NCCO'],
  ['2 START prop ano 2 il amino END et ano 1 ol', 'CC(C)NCCO'],
  ['2 START START 1 met il et il END amino END et ano 1 ol', 'CC(C)NCCO'],
  ['2 START di isopropil amino END et ano 1 ol', 'OCCN(C(C)C)C(C)C'],
  ['2 START di prop ano 2 il amino END et ano 1 ol', 'OCCN(C(C)C)C(C)C'],
  ['2 START bis START 1 met il et il END amino END et ano 1 ol', 'OCCN(C(C)C)C(C)C'],
  ['2 START tert-butil amino END et ano 1 ol', 'CC(C)(C)NCCO'],
  ['2 2 bis START tert-butil amino END et ano 1 ol', 'CC(C)(C)NC(NC(C)(C)C)CO'],
  ['2 START fenil amino END et ano 1 ol', 'OCCNC1=CC=CC=C1'],
  ['2 START fenil met il amino END et ano 1 ol', 'OCCN(C)C1=CC=CC=C1'],
  ['2 START START 4 met il fenil END amino END et ano 1 ol', 'OCCNC1=CC=C(C)C=C1'],
  ['2 START ciclo hex il amino END et ano 1 ol', 'OCCNC1CCCCC1'],
  ['2 START START 2 cloro et il END amino END et ano 1 ol', 'OCCNCCCl'],
  ['2 START bis START 2 cloro et il END amino END et ano 1 ol', 'OCCN(CCCl)CCCl'],
  ['2 START prop 2 eno 1 il amino END et ano 1 ol', 'OCCNCC=C'],
  ['2 START START 2 amino et il END amino END et ano 1 ol', 'OCCNCCN'],
  ['1 3 bis START met il amino END prop ano 2 ol', 'CNCC(O)CNC'],
  ['2 2 bis START di met il amino END et ano 1 ol', 'CN(C)C(N(C)C)CO'],
  ['4 START amino met il END ciclo hex ano 1 ol', 'NCC1CCC(O)CC1'],
  ['4 START START met il amino END met il END ciclo hex ano 1 ol', 'CNCC1CCC(O)CC1'],
  ['4 START amino cloro met il END ciclo hex ano 1 ol', 'OC1CCC(CC1)C(N)Cl'],
  ['4 START cloro START met il amino END met il END ciclo hex ano 1 ol', 'OC1CCC(CC1)C(NC)Cl'],
  ['2 START 2 START met il amino END et il oxi END et ano 1 ol', 'OCCOCCNC'],
  ['1 START di met il amino END prop ano 2 ona', 'CC(=O)CN(C)C'],
  ['ácido 4 START di met il amino END benzoico', 'CN(C)C1=CC=C(C(O)=O)C=C1'],
  ['p amino benzonitrilo', 'NC1=CC=C(C#N)C=C1'],
  ['ácido 4 amino ftálico', 'NC1=CC=C(C(=O)O)C(C(=O)O)=C1'],
  ['4 amino ftalonitrilo', 'NC1=CC(C#N)=C(C#N)C=C1'],
  ['et ano oato 2 START di met il amino END et ilo', 'CC(=O)OCCN(C)C'],
  ['acetato 2 START di met il amino END et ilo', 'CC(=O)OCCN(C)C'],
  ['3 START START ciano met il END met il amino END prop ano nitrilo', 'N#CCN(C)CCC#N'],
  ['ácido 4 amino 4 oxo but ano oico', 'NC(=O)CCC(=O)O'],
  ['ácido 4 START met il amino END 4 oxo but ano oico', 'CNC(=O)CCC(=O)O'],
  ['4 START amino met il END ciclo hex ano 1 amina', 'NCC1CCC(N)CC1'],
]);

test('assembler (R-6c2, rule 12): every amino form is the forward engine\'s own text; the tokenizer reads it back', () => {
  const texts = [];
  for (const [words, smiles] of FORMS) {
    const assembled = text(words);
    texts.push(assembled);
    assert.ok(namesOf(smiles).includes(assembled), `${words} → ${assembled}`);
    const ids = tokenize(assembled);
    assert.ok(ids, `no tiles for ${assembled}`);
    assert.equal(assemble(parse(ids).tree).text, assembled);
  }
  assert.deepEqual(texts.slice(13, 16), ['2-(metilamino)etan-1-ol', '2-(dimetilamino)etan-1-ol', '2-[etil(metil)amino]etan-1-ol']);
  assert.deepEqual([text('2 2 bis START tert-butil amino END et ano 1 ol'), text('2 START bis START 2 cloro et il END amino END et ano 1 ol'),
    text('4 START cloro START met il amino END met il END ciclo hex ano 1 ol')],
  ['2,2-bis-(tert-butilamino)etan-1-ol', '2-[bis(2-cloroetil)amino]etan-1-ol', '4-[cloro(metilamino)metil]ciclohexan-1-ol']);
  // The student's multipliers and order are kept: the diagnosis names them.
  assert.deepEqual(['2 START met il et il amino END et ano 1 ol', '2 START bis met il amino END et ano 1 ol', '2 START met il met il amino END '
    + 'et ano 1 ol', '1 3 di START met il amino END prop ano 2 ol'].map(text), ['2-[metil(etil)amino]etan-1-ol', '2-(bismetilamino)etan-1-ol',
    '2-[metil(metil)amino]etan-1-ol', '1,3-di(metilamino)propan-2-ol']);
  // The spans: the controls carry the outer marks, the automatic ones around every group after the first have no tile.
  const { spans } = assemble(parse(seq('2 START et il met il amino END et ano 1 ol')).tree);
  assert.deepEqual(spans.slice(1, 11).map((span) => [span.tile, text('2 START et il met il amino END et ano 1 ol').slice(span.from, span.to)]),
    [[null, '-'], [1, '['], [2, 'et'], [3, 'il'], [null, '('], [4, 'met'], [5, 'il'], [null, ')'], [6, 'amino'], [7, ']']]);
}); // End of test 'assembler (R-6c2, rule 12)…'

test('tokenizer (R-6c2): amino names read; the amides\' words never tokenize', () => {
  assert.deepEqual(tokenize('2-[etil(metil)amino]etan-1-ol'), seq('2 START et il met il amino END et ano 1 ol'));
  assert.deepEqual(tokenize('2-[(2-cloroetil)amino]etan-1-ol'), seq('2 START START 2 cloro et il END amino END et ano 1 ol'));
  assert.deepEqual(tokenize('4-(aminoclorometil)ciclohexan-1-ol'), seq('4 START amino cloro met il END ciclo hex ano 1 ol'));
  assert.deepEqual(tokenize('etanoato de 2-aminoetilo'), seq('et ano oato 2 amino et ilo'));
  for (const name of ['2-(acetilamino)etan-1-ol', 'ácido 2-(acetilamino)etanoico', 'ácido 2-[acetil(metil)amino]etanoico',
    'ácido 2-(benzoilamino)etanoico', 'ácido 2-[(2-metilpropanoil)amino]etanoico', 'ácido 3-carbamoilpropanoico']) {
    assert.equal(tokenize(name), null, name);
  }
  // Since phase R-6d1 the amide suffixes read, an amino prefix beside them too (reverse-amides.test.js).
  for (const name of ['2-aminopropanamida', '3-amino-N-metilpropanamida', '4-aminociclohexano-1-carboxamida']) {
    assert.ok(tokenize(name), name);
  }
  // Since phase R-6c3 the retained amine names and the class names read (reverse-amine-templates.test.js).
  for (const name of ['anilina', '4-metilanilina', 'metilamina', 'dimetilamina', 'trimetilamina', 'bencilamina']) {
    assert.ok(tokenize(name), name);
  }
  // The helper that sets the amides' names apart (reverse-words.js): an acyl group among the groups on an amino prefix's nitrogen.
  assert.deepEqual(['ácido 2-[acetil(metil)amino]etanoico', 'ácido 2-{[4-(2-metilpropil)benzoil]amino}etanoico',
    'ácido 2,2-bis(acetilamino)etanoico', '3-[(3-oxopropanoil)(propan-2-il)amino]pentano', 'ácido 4-amino-4-oxobutanoico',
    '2-acetil-3-aminobutanal', '2-[(2-acetiletil)amino]etan-1-ol', '3-[(cianometil)(metil)amino]propanonitrilo'].map(hasAcylamino),
  [true, true, true, true, false, false, false, false]);
  assert.ok(isAmideName('etanamida') && isAmideName('ácido 3-carbamoilpropanoico') && !isAmideName('ácido 4-amino-4-oxobutanoico'));
  // Since phase R-6d1: the amides' later words (R-6d2: `carbamoil`, acylamino; R-6d3: the retained amide names).
  assert.deepEqual(['etanamida', 'ácido 3-carbamoilpropanoico', '2-(acetilamino)etan-1-ol', 'acetamida', 'N-metilbenzamida']
    .map(isLaterAmideName), [false, true, true, true, false]);
  assert.equal(AMINO_WORD, 'amino');
}); // End of test 'tokenizer (R-6c2)…'

// ---------------------------------------------------------------------------
// Interpreter and builder.
// ---------------------------------------------------------------------------

test('interpreter (R-6c2): the amino SubstituentSpec — one nitrogen, the groups on it at its one place; left-out slots', () => {
  const spec = specOf('2 START di met il amino END et ano 1 ol');
  const amino = spec.prefixes[0].substituent;
  assert.deepEqual([amino.kind, amino.length, amino.retained, amino.word.text, amino.compound, amino.alkoxy, amino.acyl],
    [AMINO_KIND, 1, AMINO_KIND, 'amino', true, false, false]);
  assert.deepEqual([amino.freeValence.slot.kind, amino.freeValence.slot.value, amino.freeValence.order], ['implicit', 1, 1]);
  assert.deepEqual(amino.prefixes.map((p) => [p.multiplier, p.slots.map((s) => [s.kind, s.value, s.domain]), p.substituent.kind]),
    [[{ count: 2, compound: false }, [['implicit', 1, [1, 1]], ['implicit', 1, [1, 1]]], 'chain']]);
  assert.deepEqual(specOf('2 amino et ano 1 ol').prefixes[0].substituent.prefixes, []);
  // Left out: the amino prefix's own slot on the parent, never the nitrogen of an amine (a nitrogen on a nitrogen); a group's
  // own locants inside it.
  assert.deepEqual(slotGroups(specOf('amino et ano ol')).map((g) => g.domain), [[1, 2], [1, 2]]);
  assert.deepEqual(slotGroups(specOf('amino et ano amina')).map((g) => g.domain), [[1, 2], [1, 2]]);
  assert.deepEqual(slotGroups(specOf('2 START START cloro et il END amino END et ano 1 ol')).map((g) => g.domain), [[1, 2]]);
  assert.deepEqual(specOf('2 START di met il amino END et ano 1 ol').leftOut, []);
}); // End of test 'interpreter (R-6c2)…'

test('builder (R-6c2): the amino nitrogen with its groups, single-bonded to its carbon; VALENCE on a third group; the caps', () => {
  const cases = [
    ['2 amino et ano 1 ol', ['C1']],
    ['2 START met il amino END et ano 1 ol', ['C1 C1']],
    ['2 START di met il amino END et ano 1 ol', ['C1 C1 C1']],
    ['2 START et il met il amino END et ano 1 ol', ['C1 C1 C1']],
    ['1 3 bis START met il amino END prop ano 2 ol', ['C1 C1', 'C1 C1']],
    ['2 START START 2 amino et il END amino END et ano 1 ol', ['C1', 'C1 C1']],
  ];
  for (const [words, bonds] of cases) {
    const built = build(specOf(words), []);
    assert.ok(built.ok, words);
    assert.deepEqual(nitrogenBonds(built.molecule), bonds, words);
  }
  // The prefix occurrence: its attachment is the nitrogen, bonded to the parent's carbon 2; its atoms the nitrogen first.
  const built = build(specOf('2 START di met il amino END et ano 1 ol'), []);
  const [occurrence] = built.prefixAtoms;
  assert.deepEqual([occurrence.locant, built.molecule.atoms.get(occurrence.attachment).element, occurrence.atoms.length], [2, 'N', 3]);
  assert.equal(occurrence.atoms[0], occurrence.attachment);
  assert.ok(built.studentParent.atoms.includes(occurrence.parentAtom));
  // The heavy atoms: the nitrogen and its groups.
  assert.deepEqual(['2 amino et ano 1 ol', '2 START di met il amino END et ano 1 ol', '1 3 bis START met il amino END prop ano 2 ol']
    .map((words) => specAtoms(specOf(words))), [4, 6, 8]);
  const message = 'El nitrógeno del grupo amino tendría 4 enlaces, y un nitrógeno solo puede tener 3.';
  for (const [words, tiles] of [['2 START tri met il amino END et ano 1 ol', [2, 5]], ['2 START et il met il prop il amino END et ano 1 ol',
    [6, 8]], ['2 START di met il et il amino END et ano 1 ol', [5, 7]]]) {
    const verdict = read(words);
    assert.equal(verdict.kind, 'invalid', `${words}: ${verdict.message}`);
    assert.deepEqual([verdict.errors[0].code, [verdict.errors[0].from, verdict.errors[0].to], verdict.message], ['VALENCE', tiles, message],
      words);
  }
  // The carbons' valence as usual: an amino prefix adds one bond to its carbon.
  assert.deepEqual([read('1 1 1 tri amino et ano 1 ol').kind, read('1 1 1 tri amino et ano 1 ol').message], ['invalid',
    'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4.']);
}); // End of test 'builder (R-6c2)…'

// ---------------------------------------------------------------------------
// readName(): verdicts, search, out-of-scope amino prefixes.
// ---------------------------------------------------------------------------

/**
 * readName() cases: tile words or a name, the verdict, the engine's name
 * and the SMILES of the molecule drawn.
 */
const CASES = Object.freeze([
  ['2-aminoetan-1-ol', 'correct', '2-aminoetan-1-ol', 'NCCO'],
  ['ácido 2-aminopropanoico', 'correct', 'ácido 2-aminopropanoico', 'CC(N)C(=O)O'],
  ['etanoato de 2-aminoetilo', 'correct', 'etanoato de 2-aminoetilo', 'CC(=O)OCCN'],
  ['acetato de 2-aminoetilo', 'alternative', 'etanoato de 2-aminoetilo', 'CC(=O)OCCN'],
  ['4-aminobenzonitrilo', 'correct', '4-aminobenzonitrilo', 'NC1=CC=C(C#N)C=C1'],
  ['p-aminobenzonitrilo', 'alternative', '4-aminobenzonitrilo', 'NC1=CC=C(C#N)C=C1'],
  ['2-(metilamino)etan-1-ol', 'correct', '2-(metilamino)etan-1-ol', 'CNCCO'],
  ['2-(dimetilamino)etan-1-ol', 'correct', '2-(dimetilamino)etan-1-ol', 'CN(C)CCO'],
  ['2-[etil(metil)amino]etan-1-ol', 'correct', '2-[etil(metil)amino]etan-1-ol', 'CCN(C)CCO'],
  ['2-[(propan-2-il)amino]etan-1-ol', 'alternative', '2-(isopropilamino)etan-1-ol', 'CC(C)NCCO'],
  ['1,3-bis(metilamino)propan-2-ol', 'correct', '1,3-bis(metilamino)propan-2-ol', 'CNCC(O)CNC'],
  ['1,3-diaminopropan-2-ol', 'correct', '1,3-diaminopropan-2-ol', 'NCC(O)CN'],
  ['2,2-bis(dimetilamino)etan-1-ol', 'correct', '2,2-bis(dimetilamino)etan-1-ol', 'CN(C)C(N(C)C)CO'],
  ['4-(aminometil)ciclohexan-1-ol', 'correct', '4-(aminometil)ciclohexan-1-ol', 'NCC1CCC(O)CC1'],
  ['4-[(metilamino)metil]ciclohexan-1-ol', 'correct', '4-[(metilamino)metil]ciclohexan-1-ol', 'CNCC1CCC(O)CC1'],
  ['2-aminociclohexan-1-ol', 'correct', '2-aminociclohexan-1-ol', 'NC1CCCCC1O'],
  ['4-aminofenol', 'correct', '4-aminofenol', 'NC1=CC=C(O)C=C1'],
  ['ácido 4-(dimetilamino)benzoico', 'correct', 'ácido 4-(dimetilamino)benzoico', 'CN(C)C1=CC=C(C(O)=O)C=C1'],
  ['ácido 4-aminoftálico', 'alternative', 'ácido 4-aminobenceno-1,2-dicarboxílico', 'NC1=CC=C(C(=O)O)C(C(=O)O)=C1'],
  ['2-[(2-cloroetil)amino]etan-1-ol', 'correct', '2-[(2-cloroetil)amino]etan-1-ol', 'OCCNCCCl'],
  ['2-(fenilamino)etan-1-ol', 'correct', '2-(fenilamino)etan-1-ol', 'OCCNC1=CC=CC=C1'],
  ['1-(dimetilamino)propan-2-ona', 'correct', '1-(dimetilamino)propan-2-ona', 'CC(=O)CN(C)C'],
  ['4-(aminometil)ciclohexan-1-amina', 'correct', '4-(aminometil)ciclohexan-1-amina', 'NCC1CCC(N)CC1'],
  ['ácido 4-amino-4-oxobutanoico', 'correct', 'ácido 4-amino-4-oxobutanoico', 'NC(=O)CCC(=O)O'],
  // Left-out locants (search.js).
  ['ácido amino et ano oico', 'missingLocants', 'ácido 2-aminoetanoico', 'NCC(=O)O'],
  ['amino prop ano ona', 'missingLocants', '1-aminopropan-2-ona', 'NCC(C)=O'],
  ['START di met il amino END prop ano ona', 'missingLocants', '1-(dimetilamino)propan-2-ona', 'CC(=O)CN(C)C'],
  // `otherName`: the molecule the name describes.
  ['aminoetano', 'otherName', 'etanamina', 'CCN'],
  ['4-aminobutan-1-amina', 'otherName', 'butano-1,4-diamina', 'NCCCCN'],
  ['2-metil-2-aminopropan-1-ol', 'otherName', '2-amino-2-metilpropan-1-ol', 'CC(C)(N)CO'],
  ['2-[metil(etil)amino]etan-1-ol', 'otherName', '2-[etil(metil)amino]etan-1-ol', 'CCN(C)CCO'],
  ['2-aminoacetaldehído', 'otherName', '2-aminoetanal', 'NCC=O'],
  ['1-aminobutanal', 'otherName', 'butanamida', 'CCCC(N)=O'],
]);

test('readName (R-6c2): verdicts and the molecule each name describes, against a SMILES', () => {
  for (const [name, kind, engine, smiles] of CASES) {
    const verdict = read(name);
    assert.equal(verdict.kind, kind, `${name}: ${verdict.message}`);
    assert.equal(verdict.name, engine, name);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${name} builds another graph`);
    assert.equal(verdict.draw, true, name);
  }
  assert.equal(read('ácido amino et ano oico').message, 'Casi: faltan los números. Se escribe «ácido 2-aminoetanoico».');
  assert.equal(read('etanoato de 2-aminoetilo').message, '¡Correcto! También se llama «acetato de 2-aminoetilo» (nombre tradicional, '
    + 'que la IUPAC (2013) conserva como preferido).');
  // The student's reading: the amino prefix's nitrogen on the student's carbon 2.
  const verdict = read('2-(dimetilamino)etan-1-ol');
  assert.deepEqual(verdict.prefixAtoms.map((o) => [o.locant, verdict.molecule.atoms.get(o.attachment).element]), [[2, 'N']]);
}); // End of test 'readName (R-6c2): verdicts…'

test('search (R-6c2): left-out amino locants give ambiguous lists; the budget gives incomplete; the engine\'s refusals', () => {
  const ambiguous = [
    ['amino et ano ol', 'Faltan números: puede ser 1-aminoetan-1-ol o 2-aminoetan-1-ol.'],
    ['START et il met il amino END et ano ol', 'Faltan números: puede ser 1-[etil(metil)amino]etan-1-ol o 2-[etil(metil)amino]etan-1-ol.'],
    ['amino benzonitrilo', 'Faltan números: puede ser 2-aminobenzonitrilo, 3-aminobenzonitrilo o 4-aminobenzonitrilo.'],
    ['START met il amino END fenol', 'Faltan números: puede ser 2-(metilamino)fenol, 3-(metilamino)fenol o 4-(metilamino)fenol.'],
    ['di amino prop ano 2 ol', 'Faltan números: puede ser 1,1-diaminopropan-2-ol, 1,2-diaminopropan-2-ol o 1,3-diaminopropan-2-ol.'],
    ['4 START START cloro et il END amino END ciclo hex ano 1 ol', 'Faltan números: puede ser 4-[(1-cloroetil)amino]ciclohexan-1-ol o '
      + '4-[(2-cloroetil)amino]ciclohexan-1-ol.'],
  ];
  for (const [words, message] of ambiguous) {
    const verdict = read(words);
    assert.deepEqual([verdict.kind, verdict.message], ['ambiguous', message], words);
  }
  assert.equal(read('tetra amino hex ano ol', { budget: { placements: 1 } }).kind, 'incomplete');
  assert.equal(read('amino ciclo hex ano ol', { budget: { namings: 1 } }).kind, 'incomplete');
  // The engine's refusals: a halogen, an oxygen, a double bond, a nitrogen or a functional carbon on the nitrogen (HETEROATOM);
  // equal parts joined by the nitrogen, each with the principal group; two rings; a benzene with groups on the ring and on a branch.
  const lead = 'Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar: ';
  for (const [words, start] of [
    ['2 START cloro amino END et ano 1 ol', 'Esta molécula tiene átomos que no son carbono ni hidrógeno'],
    ['2 START met il oxi amino END et ano 1 ol', 'Esta molécula tiene átomos que no son carbono ni hidrógeno'],
    ['2 START met iliden amino END et ano 1 ol', 'Esta molécula tiene átomos que no son carbono ni hidrógeno'],
    ['2 START amino amino END et ano 1 ol', 'Esta molécula tiene átomos que no son carbono ni hidrógeno'],
    ['2 START carboxi amino END et ano 1 ol', 'Esta molécula tiene átomos que no son carbono ni hidrógeno'],
    ['2 START ciano amino END et ano 1 ol', 'Esta molécula tiene átomos que no son carbono ni hidrógeno'],
    ['2 START acetil oxi amino END et ano 1 ol', 'Esta molécula tiene átomos que no son carbono ni hidrógeno'],
    ['2 START START 2 hidroxi et il END amino END et ano 1 ol', 'Esta molécula tiene partes iguales unidas por un nitrógeno'],
    ['START fenil amino END benceno', 'Esta molécula tiene varios anillos'],
    ['2 START di fenil amino END et ano 1 ol', 'Esta molécula tiene varios anillos'],
    ['ácido 2 amino 3 START 4 hidroxi fenil END prop ano oico', 'Este benceno tiene 2 sustituyentes'],
  ]) {
    const refused = read(words);
    assert.equal(refused.kind, 'outOfScope', `${words}: ${refused.message}`);
    assert.ok(refused.message.startsWith(`${lead}${start}`), refused.message);
    assert.equal(refused.draw, false);
  }
}); // End of test 'search (R-6c2)…'

// ---------------------------------------------------------------------------
// Mutations and the diagnosis.
// ---------------------------------------------------------------------------

/**
 * Mutations of amino names (design.md §15.7): tile words, the verdict and
 * the diagnosis code of a rule that holds for an amino prefix (the amino
 * prefix's own mistakes are the deliberate nulls of the next test).
 */
const MUTATIONS = Object.freeze([
  ['1 amino et ano 2 ol', 'otherName', 'NUMBERING'],
  ['3 START di met il amino END prop ano 2 ona', 'otherName', 'NUMBERING'],
  ['2 met il 2 amino prop ano 1 ol', 'otherName', 'ALPHABETICAL_ORDER'],
  ['2 START met il et il amino END et ano 1 ol', 'otherName', 'ALPHABETICAL_ORDER'],
  ['2 START met il met il amino END et ano 1 ol', 'otherName', 'UNGROUPED'],
  ['2 START met il amino END 2 START met il amino END et ano 1 ol', 'otherName', 'UNGROUPED'],
  // A nested amino list first (review I-52c2): its fix puts `[(dimetilamino)metil]` before `etil`.
  ['START START START met il met il amino END met il END et il amino END met ano ol', 'otherName', 'UNGROUPED'],
  ['START START START met il et il amino END met il END et il amino END met ano ol', 'otherName', 'ALPHABETICAL_ORDER'],
  ['START START START di met il amino END met il END et il amino END met ano ol', 'correct', null],
  ['2 START bis met il amino END et ano 1 ol', 'otherName', 'MULTIPLIER_KIND'],
  ['1 3 di START met il amino END prop ano 2 ol', 'otherName', 'MULTIPLIER_KIND'],
  ['1 2 bis amino prop ano 2 ol', 'otherName', 'MULTIPLIER_KIND'],
  ['3 1 di amino prop ano 2 ol', 'otherName', 'LOCANT_ORDER'],
  ['4 amino 5 met il fenol', 'otherName', 'RING_NUMBERING'],
  ['2 START 2 amino et il END et ano 1 ol', 'otherName', 'BRANCH_AT_END'],
  ['START START 3 hidroxi prop il END amino END met ano ol', 'otherName', 'LONGER_CHAIN'],
  ['2 START START carboxi met il END amino END et ano 1 ol', 'otherName', 'CARBONYL_SENIORITY'],
  ['2 amino acetaldehído', 'otherName', 'SUBSTITUTED_TEMPLATE'],
  ['2 START START 1 cloro met il END amino END et ano 1 ol', 'otherName', 'NEEDLESS_LOCANTS'],
  // Other verdicts.
  ['2 START di met il amino END et ano 1 ol', 'correct', null],
  ['amino et ano ol', 'ambiguous', null],
  ['ácido amino et ano oico', 'missingLocants', null],
]);

test('mutations (R-6c2): the expected verdict, and the diagnosis of every shared rule that holds for an amino prefix', () => {
  for (const [words, kind, code] of MUTATIONS) {
    const verdict = read(words);
    assert.equal(verdict.kind, kind, `${words}: ${verdict.message}`);
    if (kind !== 'otherName') {
      continue;
    }
    assert.equal(verdict.diagnosis ? verdict.diagnosis.code : null, code, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(!/undefined|null|NaN|\[object/.test(verdict.diagnosis.message), words);
    const opened = diagnosisExplanation(verdict, explain);
    const { step } = verdict.diagnosis;
    assert.ok(opened.index >= 0 && [step, ...STEP_FALLBACKS[step]].includes(opened.steps[opened.index].id), words);
  } // End of the loop over the mutations
  const messages = {
    '2 START met il et il amino END et ano 1 ol': 'Los sustituyentes se escriben por orden alfabético: «etil» va antes que «metil» (e antes '
      + 'que m).',
    '2 START met il met il amino END et ano 1 ol': 'Las ramas iguales se escriben una sola vez, con «di», «tri»… delante: «2-(dimetilamino)», '
      + 'no «2-[metil(metil)amino]».',
    '2 START bis met il amino END et ano 1 ol': '«bis», «tris»… solo van delante de ramas que tienen sus propias ramas; aquí va «di», '
      + '«tri»…: «2-(dimetilamino)», no «2-(bismetilamino)».',
    '1 3 di START met il amino END prop ano 2 ol': 'Delante de una rama que tiene sus propias ramas se usa «bis», «tris»…: '
      + '«1,3-bis(metilamino)», no «1,3-di(metilamino)».',
    '2 met il 2 amino prop ano 1 ol': 'Los sustituyentes se escriben por orden alfabético: «amino» va antes que «metil» (a antes que m).',
    '2 START 2 amino et il END et ano 1 ol': 'La rama «2-aminoetil» está en el extremo de la cadena, así que la alarga: la cadena '
      + 'principal tiene 4 carbonos.',
    'START START 3 hidroxi prop il END amino END met ano ol': 'Hay una cadena más larga que la tuya: la tuya tiene 1 carbono y la cadena '
      + 'principal tiene 3.',
  };
  for (const [words, message] of Object.entries(messages)) {
    assert.equal(read(words).diagnosis.message, message, words);
  }
  // An amino prefix on an end never lengthens the chain (its nitrogen is no chain atom, isHeteroGroup()): a branch's rule speaks.
  assert.equal(read('1 amino 1 met il prop ano 2 ol').diagnosis.code, 'BRANCH_AT_END');
  assert.match(read('1 amino 1 met il prop ano 2 ol').diagnosis.message, /La rama «metil» está en el extremo/);
  // The prefix style is told by the groups on the nitrogen (aminoShape()): the pin style's name is quoted.
  assert.equal(read('1 START prop ano 2 il amino END et ano 2 ol').name, '2-(isopropilamino)etan-1-ol');
  assert.match(read('1 START prop ano 2 il amino END et ano 2 ol').diagnosis.message, /^Hay que numerar la cadena desde el otro extremo/);
  assert.equal(read('1 START prop ano 2 il amino END et ano 2 ol').diagnosis.style, 'pin');
}); // End of test 'mutations (R-6c2)…'

/**
 * Tells whether two lists hold the same values.
 *
 * @param {number[]} a - A list.
 * @param {number[]} b - Another.
 * @returns {boolean} True for the same values, in any order.
 */
function sameSet(a, b) {
  const sorted = (list) => [...list].sort((p, q) => p - q).join();
  return sorted(a) === sorted(b);
}

/**
 * The category of an amino prefix's own mistake (or of an amine's beside
 * one), read independently of diagnose.js from the engine's naming and the
 * student's reading (diagnose.js «Amines»: deliberate nulls until phase
 * I-52c4a): `amide` — the engine's principal group is an amide and the
 * student wrote no `amina` (an amino prefix on a C=O carbon, `1-aminobutanal`
 * → «butanamida»: outside the rules, the amides being phase R-6d's, still a
 * null); else as reverse-amines.test.js amineCategory(): `seniority` — a
 * principal amine written as an amino prefix (`aminoetano`), or the
 * student's `amina` beside a senior group, an amide's too; `count` — another
 * number of amine groups (`4-aminobutan-1-amina`); `side` — the same
 * nitrogen as the engine's, bonded to the student's parent by another
 * carbon; `numbering` — the amine groups numbered otherwise on the engine's
 * chain or ring; `suffix` — the suffix's needless or missing locants;
 * `parent` — the amine groups choose another parent (another nitrogen, ring
 * against chain, or no chain the engine's P0 keeps; until phase I-52c4a
 * another nitrogen was counted as `side`). Null when none applies.
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} verdict - Its `otherName` verdict.
 * @returns {string|null} The category.
 */
function aminoCategory(ids, verdict) {
  const engine = verdict.naming.structure.suffix;
  const { tree } = parse(ids);
  const spec = interpret(tree);
  // The student's amine groups: its suffix's, when it is `amina` (or `anilina`, `bencilamina`), never a nitrile's nitrogen.
  const mine = spec.suffix && spec.suffix.kind === 'amine' ? verdict.suffixAtoms || [] : [];
  if (engine && engine.kind === 'amide') {
    return mine.length > 0 ? 'seniority' : 'amide';
  }
  if (!engine || engine.kind !== 'amine') {
    return mine.length > 0 ? 'seniority' : null;
  }
  if (mine.length === 0) {
    return 'seniority';
  }
  if (mine.length !== engine.locants.length) {
    return 'count';
  }
  if (!sameSet(mine.map((g) => g.attachment), engine.locants.map((site) => site.attachAtom))) {
    return 'parent';
  }
  if (!sameSet(mine.map((g) => g.parentAtom), engine.locants.map((site) => site.atom))) {
    return 'side';
  }
  if (!sameSet(mine.map((g) => g.locant), engine.locants.map((site) => site.locant))
    && sameSet(verdict.studentParent.atoms, verdict.naming.parent.atoms)) {
    return 'numbering';
  }
  if (tree.parent.suffix && tree.parent.suffix.locants.length > 0) {
    const bare = assemble({ ...tree, parent: { ...tree.parent, suffix: { ...tree.parent.suffix, locants: [] } } }).text;
    if ([verdict.naming.name, ...verdict.naming.alternatives.map((alt) => alt.name)].includes(bare)) {
      return 'suffix';
    }
  }
  const chain = tree.parent.chain;
  const studentRing = chain.type === 'benzene' || (chain.type === 'chain' && chain.ring !== null);
  if (studentRing !== (verdict.naming.structure.parentKind === 'ring')) {
    return 'parent';
  }
  const student = verdict.studentParent.atoms;
  const p0 = verdict.naming.trace.find((step) => step.rule === 'P0');
  return !studentRing && p0 && !p0.survivors.some((c) => student.every((id) => c.atoms.includes(id))) ? 'parent' : null;
} // End of function aminoCategory()

/**
 * The codes an amino prefix's own mistake (or an amine's beside one) gets, by
 * category (aminoCategory(); diagnose.js «Amines», phase I-52c4a), as
 * reverse-amines.test.js CATEGORY_CODES; `amide` has none (a null, phase
 * R-6d's).
 */
const CATEGORY_CODES = Object.freeze({
  seniority: ['CARBONYL_SENIORITY', 'CARBONYL_PREFIX', 'CARBONYL_PARENT', 'MORE_CARBONYL_GROUPS', 'ETHER_SIDE', 'BRANCH_AT_END'],
  count: ['CARBONYL_PREFIX', 'CARBONYL_PARENT', 'MORE_CARBONYL_GROUPS', 'BRANCH_AT_END'],
  side: ['AMINE_SIDE'],
  numbering: ['NUMBERING', 'RING_NUMBERING'],
  suffix: ['NEEDLESS_LOCANTS'],
  parent: ['CARBONYL_PARENT', 'MORE_CARBONYL_GROUPS', 'ETHER_SIDE', 'BRANCH_AT_END'],
});

test('the former deliberate nulls of R-6c2 (diagnose.js «Amines»): each category has its I-52c4a code, step and words', () => {
  const cases = [
    // [tile words, category, code, step, a phrase of the message]
    ['amino et ano', 'seniority', 'CARBONYL_PREFIX', 'group', 'no con el prefijo «amino». Se escribe «etanamina»'],
    ['2 amino prop ano', 'seniority', 'CARBONYL_PREFIX', 'group', 'Se escribe «propan-2-amina»'],
    ['START met il amino END met ano', 'seniority', 'CARBONYL_PREFIX', 'group', 'no con el prefijo «metilamino». El otro grupo '
      + 'unido al nitrógeno va delante, con la letra «N» en vez de un número. Se escribe «N-metilmetanamina»'],
    ['1 START di met il amino END prop ano', 'seniority', 'CARBONYL_PREFIX', 'group', 'Los otros grupos unidos al nitrógeno van '
      + 'delante'],
    ['4 amino but ano 1 amina', 'count', 'CARBONYL_PREFIX', 'group', 'se nombran todos juntos con la terminación «-diamina»'],
    ['2 amino et ano 1 amina', 'count', 'CARBONYL_PREFIX', 'group', 'Se escribe «etano-1,2-diamina»'],
    // The student's amine on the other carbon piece: another nitrogen as the suffix, a tie the ring wins.
    ['1 START 4 amino ciclo hex il END met ano amina', 'parent', 'CARBONYL_PARENT', 'ringChain', 'llevan uno cada uno, así que gana '
      + 'el anillo: «4-(aminometil)ciclohexan-1-amina»'],
    ['5 START amino met il END ciclo hex ano 2 amina', 'numbering', 'RING_NUMBERING', 'ringNumbering', 'los grupos amino (el grupo '
      + 'principal) tienen que llevar los números más bajos (1 en vez de 2)'],
  ];
  for (const [words, category, code, opened, phrase] of cases) {
    const ids = seq(words);
    const verdict = readName(ids);
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    assert.equal(aminoCategory(ids, verdict), category, words);
    const d = verdict.diagnosis;
    assert.ok(d, `${words}: no diagnosis`);
    assert.equal(d.code, code, `${words}: ${d.message}`);
    assert.ok(CATEGORY_CODES[category].includes(d.code), words);
    assert.ok(d.message.includes(phrase), `${words}: ${d.message}`);
    const explanation = diagnosisExplanation(verdict, explain);
    assert.equal(explanation.steps[explanation.index].id, opened, `${words}: the step «Ver el paso» opens`);
    assert.ok(verdict.draw && verdict.molecule, words);
  } // End of the loop over the former deliberate nulls
  // The amide nulls stay (phase R-6d): an amino prefix on the –CHO's carbon is an amide, «butanamida».
  for (const words of ['1 amino but ano al', '1 START et il met il amino END et ano al']) {
    const ids = seq(words);
    const verdict = readName(ids);
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    assert.equal(aminoCategory(ids, verdict), 'amide', words);
    assert.equal(verdict.diagnosis, null, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
  }
  assert.equal(read('amino et ano').name, 'etanamina');
  assert.equal(read('1 amino but ano al').name, 'butanamida');
}); // End of test 'the former deliberate nulls of R-6c2…'

// ---------------------------------------------------------------------------
// Fixture round trip and closed loop (design.md §15.7).
// ---------------------------------------------------------------------------

test('fixture round trip (R-6c2): every amino name the tiles write, read back; graph compared with the SMILES; the amides\' never tokenize', async () => {
  const fixtures = await readFixtures();
  const rows = fixtures.filter((row) => row.names.some(isAminoName));
  const counts = { read: 0, amides: 0, later: 0 };
  const kinds = { amine: 0, amide: 0 };
  let elapsed = 0;
  const readRows = new Set();
  for (const row of rows) {
    const expected = keyOf(row.smiles);
    for (const name of row.names) {
      if (isLaterAmideName(name)) {
        counts.later += 1; // The amides' later words (R-6d2: `carbamoil`, acylamino; R-6d3: the retained amide names).
        assert.ok(isAmideName(name), name);
        assert.equal(tokenize(name), null, `names.tsv:${row.line}: ${name} reads before its phase`);
        continue;
      }
      counts.amides += isAmideName(name) ? 1 : 0; // R-6d1: an amino prefix beside an amide suffix (`2-aminopropanamida`).
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
      counts.read += 1;
      if (!readRows.has(row)) {
        kinds[isAmine(row.smiles) ? 'amine' : 'amide'] += 1;
        assert.ok(isAmine(row.smiles) || isAmide(row.smiles), `names.tsv:${row.line}`);
      }
      readRows.add(row);
    } // End of the loop over the names of a row
  } // End of the loop over the fixture rows
  /**
   * How many rows read of a fixture section.
   *
   * @param {string} id - The section's phase id (`I-36`…).
   * @returns {number} The count.
   */
  const inSection = (id) => [...readRows].filter((row) => /\((I-\d+[a-z]?)[),:]/.exec(row.section)[1] === id).length; // Its own id only.
  assert.equal(rows.length, EXPECTED_ROWS.total);
  assert.equal(readRows.size, EXPECTED_ROWS.read);
  assert.deepEqual(kinds, { amine: EXPECTED_ROWS.amine, amide: EXPECTED_ROWS.amide });
  assert.deepEqual(['I-36', 'I-37', 'I-38', 'I-39a', 'I-39d', 'I-40a', 'I-40b', 'I-40c', 'I-43a', 'I-43b', 'I-44', 'I-45a'].map(inSection),
    [EXPECTED_ROWS.i36, EXPECTED_ROWS.i37, EXPECTED_ROWS.i38, EXPECTED_ROWS.i39a, EXPECTED_ROWS.i39d, EXPECTED_ROWS.i40a,
      EXPECTED_ROWS.i40b, EXPECTED_ROWS.i40c, EXPECTED_ROWS.i43a, EXPECTED_ROWS.i43b, EXPECTED_ROWS.i44, EXPECTED_ROWS.i45a]);
  assert.deepEqual(counts, { ...EXPECTED_NAMES });
  assert.ok(elapsed / counts.read < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / counts.read).toFixed(2)} ms on average`);
}); // End of test 'fixture round trip (R-6c2)…'

/**
 * The closed loop's generators (scripts/oracle/generate.mjs; design.md
 * §15.7): those whose molecules the engine names with an amino prefix — an
 * amine beside a senior group, on a ring or benzene, inside a branch, an
 * ester's or a nitrile's, and the amide prefixes written `amino` + `oxo`.
 */
const LOOP = Object.freeze([
  [generateAmines, { count: 500, seed: 6401, maxSize: 12 }],
  [generateRingOutsideBenzenes, { count: 250, seed: 6402, minSize: 6, maxSize: 12 }],
  [generateSubstitutedPhenyls, { count: 250, seed: 6403, maxSize: 12 }],
  [generateNitriles, { count: 300, seed: 6404, maxSize: 12 }],
  [generateCyano, { count: 300, seed: 6405, maxSize: 12 }],
  [generateAcyl, { count: 300, seed: 6406, maxSize: 12 }],
  [generateRingAcids, { count: 300, seed: 6407, maxSize: 12 }],
  [generateRingNitrilesAmides, { count: 300, seed: 6408, maxSize: 12 }],
  [generateRingPrincipalBenzenes, { count: 250, seed: 6409, minSize: 6, maxSize: 12 }],
  [generateRingPolysuffixBenzenes, { count: 250, seed: 6410, minSize: 6, maxSize: 12 }],
  [generateRingSubstituents, { count: 300, seed: 6411, maxSize: 12 }],
  [generateAmidePrefixes, { count: 250, seed: 6412, maxSize: 12 }],
  [generateAmides, { count: 250, seed: 6413, maxSize: 12 }],
]);

/**
 * Minimum coverage of the closed loop: molecules with an amino name
 * (distinct by aromatic key), amino names read back, the forms among them
 * (an N-substituted amino prefix, an amino prefix inside a compound branch,
 * on a ring or benzene parent, an amide prefix written `amino` + `oxo`, a
 * multiplied one), removed-locant mutations and decisive verdicts among them
 * (two run out of budget, `incomplete`), since phase R-6d1 the amino names
 * beside an amide suffix among them; and the amino names with the amides'
 * later words (R-6d2, R-6d3) never tokenized (the seeds give 677, 682, 441,
 * 43, 229, 183, 55, 91, 1728, 1726 and 161; until phase R-6d1 591 names, 386
 * substituted, 36 nested, 202 ring, 92 amide, 52 multiplied, 1468 removals,
 * 1466 decisive, 252 later).
 */
const LOOP_MIN = Object.freeze({
  molecules: 670, names: 670, substituted: 430, nested: 40, ring: 220, amide: 175, multiplied: 50, amideNames: 85, removed: 1700,
  decisive: 1700, later: 155,
});

/**
 * The closed loop's molecules: those of the generators that the engine names
 * with an amino prefix in some name, distinct by aromatic key.
 *
 * @returns {object[]} The molecules.
 */
function loopMolecules() {
  const seen = new Set();
  const molecules = [];
  for (const [generate, options] of LOOP) {
    for (const mol of generate(options)) {
      const key = aromaticKey(mol);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const naming = nameMolecule(mol);
      if (naming.ok && [naming.name, ...naming.alternatives.map((alt) => alt.name)].some(isAminoName)) {
        molecules.push(mol);
      }
    } // End of the loop over a generator's molecules
  } // End of the loop over the generators
  return molecules;
} // End of function loopMolecules()

/**
 * The locant lists of a tree a student can leave out: a prefix's, a
 * segment's and the suffix's, at any depth — never a free-valence locant,
 * nor a group's on an amino prefix's nitrogen (it has none).
 *
 * @param {object} tree - An error-free parse() tree.
 * @returns {number[][]} The lists of locant tile indices.
 */
function locantLists(tree) {
  const lists = [];
  /**
   * Collects the segments of a chain or ring (none for a whole word, a retained word or a one-atom group).
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
  if (tree.ester) {
    tree.ester.items.forEach(visitItem);
  }
  return lists;
} // End of function locantLists()

test('closed loop over the generators\' amino names: engine name → tiles → readName() → the same graph, then without each locant list', () => {
  const molecules = loopMolecules();
  const counts = {
    names: 0, substituted: 0, nested: 0, ring: 0, amide: 0, multiplied: 0, amideNames: 0, removed: 0, decisive: 0, later: 0,
  };
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    const key = aromaticKey(mol);
    const all = [naming.name, ...naming.alternatives.map((alt) => alt.name)];
    for (const [i, name] of all.entries()) {
      if (!isAminoName(name)) {
        continue; // Read by its own family's loop.
      }
      if (isLaterAmideName(name)) {
        counts.later += 1; // The amides' later words (R-6d2: `carbamoil`, acylamino; R-6d3: the retained amide names).
        assert.equal(tokenize(name), null, name);
        continue;
      }
      counts.amideNames += isAmideName(name) ? 1 : 0; // R-6d1: an amino prefix beside an amide suffix, read since then.
      const ids = tokenize(name);
      assert.ok(ids, `no tiles for ${name}`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, i === 0 ? 'correct' : 'alternative', `${name}: ${verdict.message}`);
      assert.equal(verdict.name, naming.name);
      assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
      counts.names += 1;
      counts.substituted += /[a-z)]amino/.test(name) ? 1 : 0;
      counts.nested += /\([^()]*amino[^()]*[a-z]il\)/.test(name) ? 1 : 0;
      counts.ring += /ciclo|benc|fenol|benzo|ftal/.test(name.replace(/fenil|benzoil|ciclo[a-z]*il/g, '')) ? 1 : 0;
      counts.amide += isAmideMolecule(mol) ? 1 : 0;
      counts.multiplied += /(?:di|bis\(|tris\()[a-z]*amino|(?:di|tri)amino/.test(name) ? 1 : 0;
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
          assert.ok(reread.candidates.some((c) => aromaticKey(c.molecule) === key), where);
        } else {
          assert.ok(['missingLocants', 'correct', 'alternative', 'otherName'].includes(reread.kind), where);
          assert.equal(aromaticKey(reread.molecule), key, where);
          if (reread.kind === 'missingLocants') {
            assert.equal(reread.filled, name, where);
          }
        }
        counts.decisive += 1;
      } // End of the loop over the locant lists
    } // End of the loop over the names of a molecule
  } // End of the loop over the molecules
  const report = JSON.stringify({ molecules: molecules.length, ...counts });
  assert.ok(molecules.length >= LOOP_MIN.molecules, report);
  for (const field of Object.keys(counts)) {
    assert.ok(counts[field] >= LOOP_MIN[field], `${field}: ${report}`);
  }
}); // End of test 'closed loop over the generators\' amino names…'

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
 * Rewrites the carbon locants of a list in place and puts them back in
 * ascending order over the same positions; an `N` stays where it is.
 *
 * @param {string[]} out - Tile ids (changed in place).
 * @param {object[]} tiles - The parsed tiles.
 * @param {number[]} positions - The list's tile indices.
 * @param {(value: number) => number} map - The new value of each carbon locant.
 * @returns {void}
 */
function rewriteLocants(out, tiles, positions, map) {
  const carbons = positions.filter((p) => tiles[p].kind === 'num');
  const values = carbons.map((p) => map(tiles[p].value)).sort((a, b) => a - b);
  carbons.forEach((p, k) => {
    out[p] = num(values[k]);
  });
}

/**
 * Tells whether a prefix node is a group bonded through a heteroatom (a
 * halogen, `hidroxi`, `oxo`, an alkoxy prefix, an amino prefix): moved to an
 * end, it never lengthens the chain.
 *
 * @param {object[]} tiles - The parsed tiles.
 * @param {object} node - A substituent node (parse.js).
 * @returns {boolean} True for such a group.
 */
function isHeteroNode(tiles, node) {
  const core = node.type === 'branch' ? node.chain : node;
  const amino = Boolean(core) && core.type === 'retained' && tiles[core.tile].id === AMINO_ID;
  return ['halogen', 'hydroxy', 'carbonyl'].includes(node.type) || Boolean(core && core.oxi !== null && core.oxi !== undefined) || amino;
}

/** The diagnosis codes an `otherName` of each mutation family may give (the trace's own rule for a new molecule). */
const FAMILY_CODES = Object.freeze({
  reversed: ['NUMBERING', 'CHAIN_LOCANTS'],
  // A chain with a terminal suffix (`al`, `oico`, `oato`, `nitrilo`) or a chain template keeps its group at carbon 1: renumbered
  // from the other end, its prefixes move, so the name describes another molecule, whose chain the trace may choose otherwise.
  shifted: ['NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS',
    'ETHER_SIDE', 'KETONE_NOT_ALDEHYDE', 'CARBONYL_PREFIX'],
  reflected: ['RING_NUMBERING'],
  rotated: ['RING_NUMBERING'],
  // Locants swapped between two prefixes: another molecule, also one where a moved prefix makes another group with one beside it
  // (an `oxo` beside a `hidroxi`: ACID_GROUP; an alkoxycarbonyl on an end of an acid's chain: ESTER_IN_CHAIN).
  swapped: ['NUMBERING', 'RING_NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS',
    'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS', 'KETONE_NOT_ALDEHYDE', 'CARBONYL_PREFIX', 'ACID_GROUP', 'ESTER_IN_CHAIN'],
  unsorted: ['ALPHABETICAL_ORDER'],
  ungrouped: ['UNGROUPED'],
  diBis: ['MULTIPLIER_KIND'],
  toEnd: ['BRANCH_AT_END', 'NUMBERING', 'LONGER_CHAIN', 'CHAIN_LOCANTS', 'MORE_SUBSTITUENTS', 'KETONE_NOT_ALDEHYDE'],
  heteroToEnd: ['NUMBERING', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS', 'CARBONYL_PREFIX', 'ACID_GROUP'],
  removed: [],
  added: ['NEEDLESS_LOCANTS', 'NUMBERING', 'RING_NUMBERING'],
  // The groups on an amino prefix's nitrogen (R-6c2): out of order, written one by one, di ↔ bis.
  aminoOrder: ['ALPHABETICAL_ORDER'],
  aminoUngrouped: ['UNGROUPED'],
  aminoDiBis: ['MULTIPLIER_KIND'],
});

/**
 * The mutations of the groups on the nitrogen of every amino prefix of a
 * tree (R-6c2), at any depth: the groups in reverse order (`aminoOrder`),
 * a group of two written one by one (`aminoUngrouped`), di ↔ bis
 * (`aminoDiBis`).
 *
 * @param {object} tree - The parse() tree.
 * @param {string[]} ids - The name's tile ids.
 * @param {(family: string, mutated: string[]) => void} push - Records one mutation.
 * @returns {void}
 */
function aminoMutations(tree, ids, push) {
  const { tiles } = tree;
  /**
   * Mutates the amino prefixes of one level and of the compound branches inside it.
   *
   * @param {object[]} items - Prefix nodes.
   * @returns {void}
   */
  const visit = (items) => {
    for (const item of items) {
      const sub = item.substituent;
      if (!sub || sub.type !== 'branch') {
        continue;
      }
      if (sub.chain && sub.chain.type === 'retained' && tiles[sub.chain.tile].id === AMINO_ID) {
        const groups = sub.items;
        if (groups.length >= 2) {
          const slices = groups.map((g) => ids.slice(g.range[0], g.range[1]));
          push('aminoOrder', [...ids.slice(0, groups[0].range[0]), ...slices.reverse().flat(), ...ids.slice(groups[groups.length - 1].range[1])]);
        }
        for (const group of groups.filter((g) => g.multiplier !== null)) {
          const tile = tiles[group.multiplier];
          const swapped = [...ids];
          swapped[group.multiplier] = tile.kind === 'mult' ? `cmult-${tile.value}` : `mult-${tile.value}`;
          push('aminoDiBis', swapped);
          if (tile.value === 2) {
            const body = ids.slice(group.multiplier + 1, group.range[1]);
            push('aminoUngrouped', [...ids.slice(0, group.range[0]), ...body, ...body, ...ids.slice(group.range[1])]);
          }
        } // End of the loop over the multiplied groups on the nitrogen
      }
      visit(sub.items);
    } // End of the loop over the level's items
  }; // End of function visit()
  visit(tree.items);
} // End of function aminoMutations()

/**
 * The mutations of one amino name: renumbered (on a chain with a terminal
 * suffix or a chain template, whose group stays at carbon 1, `shifted`;
 * `reversed` on another chain; reflected and rotated on a ring, the
 * suffix's locants too), carbon
 * locants swapped between two single-locant prefixes, prefixes in reverse
 * order, identical prefixes written one by one, di ↔ bis, a
 * single-carbon-locant prefix moved to an end of a chain (a carbon branch:
 * BRANCH_AT_END; a halogen, `hidroxi`, `oxo`, an alkoxy or an amino prefix:
 * another molecule), a prefix's locants removed, or added (1… and 2…) where
 * it has none; and the mutations of the groups on an amino prefix's
 * nitrogen (aminoMutations()).
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {{family: string, ids: string[]}[]} The mutations.
 */
function mutationsOf(ids) {
  const { tree } = parse(ids);
  const { tiles, items } = tree;
  const parent = tree.parent.chain;
  const template = parent.type === 'template' ? tiles[parent.tile].value : null;
  const ring = parent.type === 'chain' ? parent.ring !== null : !(template && isChainTemplate(template));
  const n = (parent.type === 'chain' && tiles[parent.root].value) || (template ? templateLength(template) : 6);
  const segments = parent.type === 'chain' ? parent.segments : [];
  const suffix = tree.parent.suffix ? tree.parent.suffix.locants : [];
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
  const terminal = isTerminalSuffix(tiles, tree.parent.suffix) || (template !== null && isChainTemplate(template));
  const renumberings = ring ? [{ family: 'reflected', carbon: (v) => (v === 1 ? 1 : n + 2 - v), bond: (k) => (k === n ? 1 : n - k) }]
    : [{ family: terminal ? 'shifted' : 'reversed', carbon: (v) => n + 1 - v, bond: (k) => n - k }];
  for (let s = 1; ring && s < n; s += 1) {
    renumberings.push({ family: 'rotated', carbon: (v) => ((v - 1 + s) % n) + 1, bond: (k) => ((k - 1 + s) % n) + 1 });
  }
  for (const { family, carbon, bond } of renumberings) {
    const mutated = [...ids];
    items.forEach((item) => rewriteLocants(mutated, tiles, item.locants, carbon));
    segments.forEach((segment) => rewriteLocants(mutated, tiles, segment.locants, bond));
    rewriteLocants(mutated, tiles, suffix, carbon);
    push(family, mutated);
  }
  const carbonLocant = (item) => item.locants.length === 1 && tiles[item.locants[0]].kind === 'num';
  const single = items.filter(carbonLocant);
  single.forEach((a, i) => single.slice(i + 1).forEach((b) => {
    const swapped = [...ids];
    [swapped[a.locants[0]], swapped[b.locants[0]]] = [ids[b.locants[0]], ids[a.locants[0]]];
    push('swapped', swapped);
  }));
  if (items.length >= 2) {
    const slices = items.map((item) => ids.slice(item.range[0], item.range[1]));
    push('unsorted', [...ids.slice(0, items[0].range[0]), ...slices.reverse().flat(), ...ids.slice(tree.parent.range[0])]);
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
    if (carbonLocant(item) && !ring) {
      for (const end of [1, n].filter((e) => e !== tiles[item.locants[0]].value)) {
        const moved = [...ids];
        moved[item.locants[0]] = num(end);
        push(isHeteroNode(tiles, item.substituent) ? 'heteroToEnd' : 'toEnd', moved);
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
  aminoMutations(tree, ids, push);
  return out;
} // End of function mutationsOf()

/**
 * Reads every mutation of some amino names: every `otherName` carries a
 * diagnosis of its family's codes whose step resolves in its explanation —
 * the own mistakes among them, deliberate nulls until phase I-52c4a, counted
 * by category (aminoCategory()), each with a code of its category
 * (CATEGORY_CODES) and, for `numbering`, the trace rule N0 and the amino
 * groups' words —, or is an amide null (`amide`: an amino prefix on a C=O
 * carbon, phase R-6d's); any other null is unexpected.
 *
 * @param {string[]} names - Amino names (engine names or alternatives).
 * @returns {{otherName: Object<string, number>, codes: Set<string>, own: Object<string, number>, nulls: Object<string, number>,
 *   unexpected: string[]}} `otherName` counts by family, the codes seen, the own mistakes diagnosed by category, the amide nulls
 *   and the unexpected nulls.
 */
function sweep(names) {
  const otherName = Object.fromEntries(Object.keys(FAMILY_CODES).map((family) => [family, 0]));
  const codes = new Set();
  const own = {};
  const nulls = {};
  const unexpected = [];
  for (const name of names) {
    for (const mutation of mutationsOf(idsOf(name))) {
      const verdict = readName(mutation.ids);
      if (verdict.kind !== 'otherName') {
        continue;
      }
      otherName[mutation.family] += 1;
      const label = `${name} → ${mutation.family} ${verdict.text}`;
      const d = verdict.diagnosis;
      const category = aminoCategory(mutation.ids, verdict);
      if (!d) {
        if (category === 'amide') {
          nulls.amide = (nulls.amide || 0) + 1;
        } else {
          unexpected.push(label);
        }
        continue;
      }
      codes.add(d.code);
      assert.ok(FAMILY_CODES[mutation.family].includes(d.code), `${label}: ${d.code}, ${d.message}`);
      assert.ok(!/undefined|null|NaN|\[object/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), label);
      if (category) {
        own[category] = (own[category] || 0) + 1;
        assert.ok((CATEGORY_CODES[category] || []).includes(d.code), `${label}: ${category}, ${d.code}`);
        assert.ok(category !== 'numbering' || (d.traceRule === 'N0' && d.message.includes('los grupos amino')), `${label}: ${d.message}`);
      }
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return { otherName, codes, own, nulls, unexpected };
} // End of function sweep()

/**
 * How many mutations of the amino fixture names give `otherName`, by family,
 * how many of them are own mistakes by category (FIXTURE_OWN: deliberate
 * nulls until phase I-52c4a, now diagnosed with their category's codes) and
 * how many stay amide nulls (FIXTURE_NULLS, phase R-6d's): pinned by the
 * test below.
 */
const FIXTURE_OTHER_NAME = Object.freeze({
  reversed: 7, shifted: 2, reflected: 7, rotated: 58, swapped: 2, unsorted: 15, ungrouped: 3, diBis: 3, toEnd: 1, heteroToEnd: 3,
  removed: 0, added: 0, aminoOrder: 2, aminoUngrouped: 7, aminoDiBis: 7,
});
const FIXTURE_OWN = Object.freeze({ numbering: 5 });
const FIXTURE_NULLS = Object.freeze({ amide: 2 });

test('mutations of every amino fixture name: a diagnosis of the family\'s codes, or an amide null', async () => {
  // The amide names among them (R-6d1) are swept in reverse-amides.test.js.
  const names = (await readFixtures()).filter((row) => row.names.some(isAminoName)).flatMap((row) => row.names).filter(isAmineName);
  assert.equal(names.length, EXPECTED_NAMES.read - EXPECTED_NAMES.amides);
  const { otherName, codes, own, nulls, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  assert.deepEqual(otherName, { ...FIXTURE_OTHER_NAME });
  assert.deepEqual([own, nulls], [{ ...FIXTURE_OWN }, { ...FIXTURE_NULLS }]);
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'BRANCH_AT_END', 'MORE_SUBSTITUENTS', 'MULTIPLIER_KIND', 'NUMBERING',
    'RING_NUMBERING', 'UNGROUPED']);
}); // End of test 'mutations of every amino fixture name…'

test('mutations of the generated amino names: every otherName is diagnosed or an amide null, every step resolves', () => {
  const names = [];
  for (const mol of loopMolecules().filter((_, i) => i % 3 === 0)) {
    const naming = nameMolecule(mol);
    names.push(...[naming.name, ...naming.alternatives.map((alt) => alt.name)].filter((name) => isAminoName(name) && isAmineName(name)));
  }
  const { otherName, codes, own, nulls, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  const total = Object.values(otherName).reduce((sum, count) => sum + count, 0);
  // Until phase I-52c4a the own mistakes (`count` 2, `numbering` 2) were deliberate nulls; the amide nulls stay (phase R-6d).
  assert.deepEqual([names.length, total, own, nulls], [189, 707, { count: 2, numbering: 2 }, { amide: 12 }]);
  assert.deepEqual([otherName.aminoOrder, otherName.aminoUngrouped, otherName.aminoDiBis], [36, 15, 15]);
  assert.deepEqual([...codes].sort(), ['ACID_GROUP', 'ALPHABETICAL_ORDER', 'BRANCH_AT_END', 'CHAIN_LOCANTS', 'ESTER_IN_CHAIN',
    'KETONE_NOT_ALDEHYDE', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MULTIPLIER_KIND', 'NEEDLESS_LOCANTS', 'NUMBERING', 'RING_NUMBERING',
    'UNGROUPED']);
}); // End of test 'mutations of the generated amino names…'

// ---------------------------------------------------------------------------
// The drawing, the dialog, robustness and time.
// ---------------------------------------------------------------------------

test('«Dibujar» (R-6c2): amino verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const name of ['2-aminoetan-1-ol', '2-(dimetilamino)etan-1-ol', '2-[etil(metil)amino]etan-1-ol', '1,3-bis(metilamino)propan-2-ol',
    'ácido 2-aminopropanoico', 'etanoato de 2-aminoetilo', '4-aminobenzonitrilo', '4-[(metilamino)metil]ciclohexan-1-ol',
    '2-[(4-metilfenil)amino]etan-1-ol', 'aminoetano', '2-[metil(etil)amino]etan-1-ol', 'ácido amino et ano oico']) {
    const verdict = read(name);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-6c2)…'

test('dialog (R-6c2): the `amino` tile has a tooltip', () => {
  assert.ok(TILE_HINTS[AMINO_ID] && TILE_HINTS[AMINO_ID].endsWith('.'));
  assert.match(TILE_HINTS[AMINO_ID], /2-aminoetan-1-ol, ácido 2-aminopropanoico/);
  assert.match(TILE_HINTS[AMINO_ID], /\(metilamino\), \(dimetilamino\), \[etil\(metil\)amino\]/);
}); // End of test 'dialog (R-6c2)…'

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

test('property (R-6c2): random amino names — any parent, amino prefixes with groups or none, locants or none — never crash', () => {
  const random = mulberry32(20261018);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const groups = ['met il', 'et il', 'di met il', 'isopropil', 'fenil', 'ciclo hex il', 'START 2 cloro et il END', 'cloro', 'acetil',
    'met il oxi', 'amino', 'tri met il', 'et il met il', '1 met il', 'met iliden'];
  const aminos = ['amino', ...groups.map((g) => `START ${g} amino END`), 'START START 2 amino et il END amino END'];
  const parents = ['et ano ol', 'prop ano 2 ol', 'ácido prop ano oico', 'but ano al', 'pent ano 2 ona', 'prop ano nitrilo', 'et ano amina',
    'ciclo hex ano ol', 'fenol', 'benzonitrilo', 'et ano oato met ilo', 'et ano', 'benceno'];
  const multipliers = { 1: '', 2: 'di', 3: 'tri' };
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const prefixes = Array.from({ length: int(1, 2) }, () => {
      const count = int(1, 2);
      const located = random() < 0.7;
      const locants = located ? Array.from({ length: count }, () => String(int(1, 4))).join(' ') : '';
      const amino = pick(aminos);
      const mult = count === 1 ? '' : (amino === 'amino' ? multipliers[count] : 'bis');
      return [locants, mult, amino].join(' ');
    });
    const words = [...prefixes, pick(parents)].join(' ');
    const verdict = readName(seq(words), { budget: { ms: 200 } });
    kinds.set(verdict.kind, (kinds.get(verdict.kind) || 0) + 1);
    assert.ok(!/undefined|NaN|\[object/.test(verdict.message), `${words}: ${verdict.message}`);
    if (verdict.draw) {
      assert.ok(verdict.molecule && verdict.name, words);
    }
    if (verdict.kind === 'otherName' && verdict.diagnosis) {
      assert.ok(!/undefined|null|NaN|\[object/.test(verdict.diagnosis.message), `${words}: ${verdict.diagnosis.message}`);
    }
  } // End of the loop over the random names
  for (const kind of ['correct', 'otherName', 'ambiguous', 'invalid', 'outOfScope']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-6c2): random amino names…'

test('time budget: amino readName() calls, with their diagnosis, well within budget', () => {
  const names = ['2-[etil(metil)amino]etan-1-ol', '1,3-bis(metilamino)propan-2-ol', '2-[bis(2-cloroetil)amino]etan-1-ol',
    'ácido 4-(dimetilamino)benzoico', 'amino et ano ol', 'START met il amino END fenol', 'di amino prop ano 2 ol',
    '4 START START cloro et il END amino END ciclo hex ano 1 ol', '2-[metil(etil)amino]etan-1-ol', 'aminoetano'];
  names.forEach((name) => read(name)); // Warm-up.
  for (const name of names) {
    const start = performance.now();
    const verdict = read(name);
    const ms = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', name);
    assert.ok(ms < PER_NAME_BUDGET_MS, `${name}: ${ms.toFixed(1)} ms`);
  }
}); // End of test 'time budget…'
