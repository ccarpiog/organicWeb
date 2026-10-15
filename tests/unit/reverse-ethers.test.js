/**
 * @file Unit tests for the ethers in «¿Cómo se dibuja?» (src/reverse/,
 * design.md §15.5.2 item 6, §15.5.3, §15.7, §15.8 R-5b; phase I-51b1,
 * R-5b1): the `oxi` tile of the «Grupos» row after a branch that ends in
 * `il` — a chain or ring, `isopropil`, `tert-butil`, `fenil`, a compound
 * branch's own chain — makes an alkoxy prefix, and `anisol` is a retained
 * template of the «Nombres tradicionales» row. Parser (the `oxi` field,
 * errors with their tile ranges, partial names), assembler (the alkoxy
 * contraction and enclosure as render.js alkoxyTokens(),
 * isContractedAlkoxy(), needsEnclosure(), enclosedInName() and
 * enclosureLevel(): every form checked against the forward engine's own
 * text), tokenizer, interpreter and builder (an ether oxygen between the
 * branch and its carbon; the caps; VALENCE), search (left-out alkoxy
 * locants by the carbons' free valence, the budget), readName() verdicts
 * with the molecule each describes (compared by aromatic key with a SMILES),
 * mutations and their diagnosis, the deliberate diagnosis nulls left for
 * phase R-5b2 (diagnose.js header «Ethers»), the fixture round trip over
 * every ether row of tests/fixtures/names.tsv but the class names (R-5b2),
 * the closed loop over the oracle's ether generators (generateEthers(),
 * generateBenzenes(), generateSubstitutedPhenyls(),
 * generateRingPrincipalBenzenes(), ether molecules only; pure imports, no
 * Java), the diagnosis sweeps, the ordered drawing and time budgets.
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
import { ALKOXY_ID, TILES } from '../../src/reverse/tiles.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { TILE_HINTS, silentLabel } from '../../src/ui/name-builder.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { MAX_HEAVY_ATOMS, TOO_MANY_ATOMS_MESSAGE } from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import {
  generateEthers, generateBenzenes, generateSubstitutedPhenyls, generateRingPrincipalBenzenes,
} from '../../scripts/oracle/generate.mjs';
import { seq, readFixtures, leafIndices, isEther, isEtherMolecule, isEtherClassName } from './reverse-words.js';

/**
 * Ether fixture rows (isEther(): carbons, halogens, OH groups and at least
 * one ether oxygen; no C=O): 33 of the I-34 section, 2 of I-40a (rings as
 * substituents: `2-fenoxietan-1-ol`…), 2 of I-42a (the alkoxy benzenes the
 * benzene round trip left out until this phase), 1 of I-43a (a phenol with an
 * alkoxy prefix) and 2 of I-45a (substituted phenoxy).
 */
const EXPECTED_ROWS = Object.freeze({ total: 40, i34: 33, i40a: 2, i42a: 2, i43a: 1, i45a: 2 });

/** Their names and alternatives read back (every one but the functional-class names, phase R-5b2). */
const EXPECTED_NAMES = 46;

/** The functional-class names of those rows (`dimetil éter`, `dietil éter`…), left for phase R-5b2 (I-51b2). */
const EXPECTED_CLASS_NAMES = 11;

/** The I-34 rows with a C=O beside the ether (an acid, an aldehyde, a ketone): their phases R-5c and R-5d. */
const EXPECTED_CARBONYL_ROWS = 7;

/** Average time budget of one readName() call over the fixture round trip, in milliseconds (phones are slower). */
const AVERAGE_BUDGET_MS = 50;

/** Time budget of one representative ether readName() call, in milliseconds. */
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
 * The aromatic-equivalence key of a SMILES molecule.
 *
 * @param {string} smiles - A SMILES (Kekulé form).
 * @returns {string} aromaticKey() of its graph.
 */
function keyOf(smiles) {
  return aromaticKey(parseSmiles(smiles));
}

/**
 * Every name the forward engine gives a SMILES molecule: the name given
 * first, then its alternatives.
 *
 * @param {string} smiles - A SMILES (Kekulé form).
 * @returns {string[]} The names.
 */
function engineNames(smiles) {
  const naming = nameMolecule(parseSmiles(smiles));
  assert.ok(naming.ok, `${smiles}: ${naming.ok ? '' : naming.error.message}`);
  return [naming.name, ...(naming.alternatives || []).map((alt) => alt.name)];
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

test('parse (R-5b): `oxi` closes a branch that ends in `il` or a retained word — a chain, a ring, `fenil`, a compound branch', () => {
  // 0:met 1:il 2:oxi 3:et 4:ano — the alkoxy ending is a field of the branch's chain node.
  let { tree, errors } = parse(seq('met il oxi et ano'));
  assert.deepEqual(errors, []);
  const chain = tree.items[0].substituent;
  assert.deepEqual([chain.type, chain.root, chain.fv, chain.oxi, chain.range], ['chain', 0, 1, 2, [0, 3]]);
  assert.equal(tree.parent.chain.oxi, null, 'the parent chain has none');
  // A retained word: 0:isopropil 1:oxi 2:but 3:ano.
  ({ tree } = parse(seq('isopropil oxi but ano')));
  assert.deepEqual(tree.items[0].substituent, { type: 'retained', tile: 0, oxi: 1, range: [0, 2] });
  // A ring: 0:ciclo 1:hex 2:il 3:oxi 4:met 5:ano.
  ({ tree } = parse(seq('ciclo hex il oxi met ano')));
  assert.deepEqual([tree.items[0].substituent.ring, tree.items[0].substituent.oxi], [0, 3]);
  // The own chain of a compound branch, before END: 0:START 1:2 2:met 3:il 4:prop 5:il 6:oxi 7:END 8:met 9:ano.
  ({ tree, errors } = parse(seq('START 2 met il prop il oxi END met ano')));
  assert.deepEqual(errors, []);
  const branch = tree.items[0].substituent;
  assert.deepEqual([branch.items.length, branch.chain.root, branch.chain.oxi, branch.end], [1, 4, 6, 7]);
  // A substituted phenyl: 0:START 1:4 2:met 3:il 4:fenil 5:oxi 6:END.
  ({ tree } = parse(seq('START 4 met il fenil oxi END met ano')));
  assert.deepEqual([tree.items[0].substituent.chain.type, tree.items[0].substituent.chain.oxi], ['retained', 5]);
  // Nested alkoxy prefixes and `anisol`; the tree keeps every tile once, in order.
  for (const words of ['START 2 met il oxi et il oxi END et ano', '1 2 di met il oxi et ano', 'anisol', '4 cloro anisol',
    '1 6 bis tert-butil oxi hex ano', 'START 2 pent il oxi et il oxi END met ano', 'cloro met il oxi met ano']) {
    const parsed = parse(seq(words));
    assert.deepEqual(parsed.errors, [], words);
    assert.deepEqual(leafIndices(parsed.tree), parsed.tree.tiles.map((_, i) => i), words);
  }
}); // End of test 'parse (R-5b): `oxi` closes a branch…'

test('parse (R-5b): `oxi` out of place, counts and `anisol` errors, each with its tile range and message', () => {
  const hint = 'Esta ficha no puede ir aquí: «oxi» va justo detrás de una rama acabada en «il», y la une a la cadena por un '
    + 'oxígeno: met, il y oxi dan metoxi; también detrás de «isopropil», «tert-butil» o «fenil» (isopropoxi), y en una rama '
    + 'compuesta, antes de cerrarla: (2-metilpropoxi).';
  for (const [words, errors] of [
    ['oxi et ano', ['TILE_ORDER[0,1)']],
    ['met oxi et ano', ['ROOT_END[0,1)', 'TILE_ORDER[1,2)']],
    ['cloro oxi met ano', ['TILE_ORDER[1,2)']],
    ['hidroxi oxi met ano', ['TILE_ORDER[1,2)']],
    ['START met il END oxi et ano', ['TILE_ORDER[4,5)']],
  ]) {
    assert.deepEqual(errorsOf(words), errors, words);
    assert.equal(parse(seq(words)).errors.find((e) => e.code === 'TILE_ORDER').message, hint, words);
  }
  // After a double bond (`iliden`, `isopropiliden`): the oxygen takes single bonds only.
  assert.deepEqual(errorsOf('met iliden oxi et ano'), ['TILE_ORDER[2,3)']);
  assert.equal(parse(seq('met iliden oxi et ano')).errors[0].message, 'Esta ficha no puede ir aquí: «oxi» no va detrás de '
    + '«iliden»: el oxígeno se une a la rama por un enlace sencillo, así que la rama acaba en «il» (metoxi).');
  assert.deepEqual(errorsOf('isopropiliden oxi et ano'), ['TILE_ORDER[1,2)']);
  assert.match(parse(seq('isopropiliden oxi et ano')).errors[0].message, /no va detrás de «isopropiliden»/);
  // A name that ends in an alkoxy prefix: a group, not a branch.
  assert.deepEqual(errorsOf('2 met il oxi'), ['ENDS_WITH_BRANCH[0,4)']);
  assert.equal(parse(seq('2 met il oxi')).errors[0].message, 'El nombre acaba en un grupo («metoxi»): falta la cadena principal detrás.');
  // Locant counts: bis for an alkoxy prefix written as its branch + `oxi` (and `tert-butoxi`, as the engine), di otherwise.
  assert.equal(parse(seq('1 2 pent il oxi et ano')).errors[0].message, 'Con dos números hace falta «bis».');
  assert.equal(parse(seq('1 6 tert-butil oxi hex ano')).errors[0].message, 'Con dos números hace falta «bis».');
  assert.equal(parse(seq('1 2 met il oxi et ano')).errors[0].message, 'Con dos números hace falta «di».');
  assert.equal(parse(seq('1 2 isopropil oxi et ano')).errors[0].message, 'Con dos números hace falta «di».');
  // `anisol` places its methoxy group itself.
  for (const words of ['1 anisol', 'p anisol']) {
    assert.deepEqual(errorsOf(words), ['TEMPLATE_LOCANTS[0,1)'], words);
    assert.equal(parse(seq(words)).errors[0].message,
      '«anisol» ya dice dónde va su grupo metoxi, en el carbono 1: no lleva números ni letras propios.');
  }
  assert.deepEqual(errorsOf('di anisol'), ['TILE_ORDER[0,1)']);
  assert.deepEqual(errorsOf('START anisol END met ano'), ['TILE_ORDER[1,2)', 'TILE_ORDER[2,3)']);
  assert.equal(parse(seq('START anisol END met ano')).errors[0].message, 'Esta ficha no puede ir aquí: «anisol» es el nombre de '
    + 'toda la molécula y va al final; dentro de una rama, el anillo es «fenil» y su grupo metoxi se escribe «metoxi», como en '
    + '(4-metoxifenil).');
  // Letters (design.md §14.4): the methoxy group of `anisol` is one of the two positions.
  assert.deepEqual(errorsOf('p cloro anisol'), []);
  assert.deepEqual(errorsOf('p di cloro anisol'), ['POSITIONAL[0,1)']);
  assert.match(parse(seq('p di cloro anisol')).errors[0].message, /pone tres \(contando el grupo metoxi del anisol\)/);
}); // End of test 'parse (R-5b): `oxi` out of place…'

/**
 * The alkoxy forms of design.md §15.5.2 item 6 and §1.1 (render.js
 * alkoxyTokens(), isContractedAlkoxy(), needsEnclosure(), enclosedInName(),
 * enclosureLevel(), isCompoundPrefix()): [tile words, assembled text, SMILES
 * of a molecule whose engine names include that text].
 */
const FORMS = [
  // Contracted: a saturated chain of one to four carbons bonded by its carbon 1, citing no locant.
  ['met il oxi et ano', 'metoxietano', 'CCOC'],
  ['et il oxi benceno', 'etoxibenceno', 'CCOC1=CC=CC=C1'],
  ['1 prop il oxi but ano', '1-propoxibutano', 'CCCOCCCC'],
  ['1 but il oxi pent ano', '1-butoxipentano', 'CCCCOCCCCC'],
  // Contracted with prefixes of its own: enclosed, as a compound branch.
  ['1 START 2 met il prop il oxi END but ano', '1-(2-metilpropoxi)butano', 'CC(C)COCCCC'],
  ['1 START 1 met il et il oxi END but ano', '1-(1-metiletoxi)butano', 'CC(C)OCCCC'],
  ['1 START 1 1 di met il et il oxi END 4 START 1 met il et il END benceno', '1-(1,1-dimetiletoxi)-4-(1-metiletil)benceno',
    'CC(C)(C)OC1=CC=C(C(C)C)C=C1'],
  ['1 cloro 2 START 2 cloro et il oxi END et ano', '1-cloro-2-(2-cloroetoxi)etano', 'ClCCOCCCl'],
  // The retained words, always contracted: isopropoxi, tert-butoxi, fenoxi, a substituted fenoxi.
  ['1 isopropil oxi but ano', '1-isopropoxibutano', 'CC(C)OCCCC'],
  ['1 tert-butil oxi but ano', '1-tert-butoxibutano', 'CC(C)(C)OCCCC'],
  ['2 fenil oxi et ano 1 ol', '2-fenoxietan-1-ol', 'OCCOC1=CC=CC=C1'],
  ['2 START 4 met il fenil oxi END et ano 1 ol', '2-(4-metilfenoxi)etan-1-ol', 'OCCOC1=CC=C(C)C=C1'],
  // Every other branch keeps its `il` before `oxi`, enclosed: longer, unsaturated, a cited locant, a ring.
  ['1 pent il oxi hex ano', '1-(pentiloxi)hexano', 'CCCCCOCCCCCC'],
  ['1 prop ano 2 il oxi but ano', '1-(propan-2-iloxi)butano', 'CC(C)OCCCC'],
  ['1 but ano 2 il oxi hex ano', '1-(butan-2-iloxi)hexano', 'CCC(C)OCCCCCC'],
  ['1 et eno il oxi but ano', '1-(eteniloxi)butano', 'C=COCCCC'],
  ['1 prop 2 eno 1 il oxi but ano', '1-(prop-2-en-1-iloxi)butano', 'C=CCOCCCC'],
  ['2 ciclo hex il oxi et ano 1 ol', '2-(ciclohexiloxi)etan-1-ol', 'OCCOC1CCCCC1'],
  // Crowded (prefixes without locants beside it): the alkoxy prefix enclosed wherever it stands, first too.
  ['cloro met il oxi met ano', 'cloro(metoxi)metano', 'ClCOC'],
  ['di cloro met il oxi met ano', 'dicloro(metoxi)metano', 'COC(Cl)Cl'],
  ['di fluoro di met il oxi met ano', 'difluorodi(metoxi)metano', 'FC(F)(OC)OC'],
  ['met il oxi yodo met ano', '(metoxi)yodometano', 'ICOC'],
  // Multipliers: di for the simple ones, bis for the compound ones (`bis-tert-butoxi` as the engine writes it).
  ['1 2 di met il oxi et ano', '1,2-dimetoxietano', 'COCCOC'],
  ['1 6 di isopropil oxi hex ano', '1,6-diisopropoxihexano', 'CC(C)OCCCCCCOC(C)C'],
  ['1 6 bis prop ano 2 il oxi hex ano', '1,6-bis(propan-2-iloxi)hexano', 'CC(C)OCCCCCCOC(C)C'],
  ['1 6 bis pent il oxi hex ano', '1,6-bis(pentiloxi)hexano', 'CCCCCOCCCCCCOCCCCC'],
  ['1 6 bis tert-butil oxi hex ano', '1,6-bis-tert-butoxihexano', 'CC(C)(C)OCCCCCCOC(C)(C)C'],
  ['1 1 di et il oxi et ano', '1,1-dietoxietano', 'CCOC(C)OCC'],
  // Nested: an alkoxy prefix inside an alkoxy prefix or a branch, with ( ) then [ ].
  ['1 START 2 met il oxi et il oxi END prop ano', '1-(2-metoxietoxi)propano', 'COCCOCCC'],
  ['1 START 2 pent il oxi et il oxi END pent ano', '1-[2-(pentiloxi)etoxi]pentano', 'CCCCCOCCOCCCCC'],
  ['START met il oxi met il END benceno', '(metoximetil)benceno', 'COCC1=CC=CC=C1'],
  // On benzene, in Spanish alphabetical order, with the old o/m/p form; `anisol`.
  ['1 met il 4 met il oxi benceno', '1-metil-4-metoxibenceno', 'COC1=CC=C(C)C=C1'],
  ['p di isopropil oxi benceno', 'p-diisopropoxibenceno', 'CC(C)OC1=CC=C(OC(C)C)C=C1'],
  ['anisol', 'anisol', 'COC1=CC=CC=C1'],
];

test('assemble (R-5b, design.md §15.5.2 item 6): every alkoxy form is exactly the forward engine\'s text', () => {
  for (const [words, expected, smiles] of FORMS) {
    assert.equal(text(words), expected, words);
    assert.ok(engineNames(smiles).includes(expected), `${expected} is no name the engine gives ${smiles}: ${engineNames(smiles)}`);
  }
}); // End of test 'assemble (R-5b, design.md §15.5.2 item 6)…'

test('assemble (R-5b): one test per rule — contraction, the silent `il`, enclosure, crowding, multipliers, nesting levels', () => {
  // The contraction: `oxi` replaces `il`, whose tile writes nothing (an empty span, still one per tile, in tile order).
  let { spans } = assemble(parse(seq('met il oxi et ano')).tree);
  assert.deepEqual(spans.filter((s) => s.tile !== null).map((s) => [s.tile, s.to - s.from, s.kind]),
    [[0, 3, 'prefix'], [1, 0, 'prefix'], [2, 3, 'prefix'], [3, 2, 'stem'], [4, 3, 'ending']]);
  // A retained word loses its `il` (render.js alkoxyTokens() cuts it from the word): `isoprop`, `tert-but`, `fen`.
  ({ spans } = assemble(parse(seq('isopropil oxi but ano')).tree));
  assert.deepEqual(spans.filter((s) => s.tile !== null).map((s) => [s.tile, s.to - s.from]), [[0, 7], [1, 3], [2, 3], [3, 3]]);
  assert.equal(text('tert-butil oxi met ano'), 'tert-butoximetano');
  assert.equal(text('fenil oxi met ano ol'), 'fenoximetanol');
  // Not contracted: five carbons or more, a double bond, a cited locant (also locant 1), a ring — `il` kept, enclosed.
  assert.equal(text('pent il oxi met ano'), '(pentiloxi)metano');
  assert.equal(text('et eno il oxi met ano'), '(eteniloxi)metano');
  assert.equal(text('prop 1 il oxi met ano'), '(propan-1-iloxi)metano', 'a cited locant is never run into `oxi`');
  assert.equal(text('prop 2 il oxi met ano'), '(propan-2-iloxi)metano', 'the automatic `an`');
  assert.equal(text('ciclo prop il oxi met ano'), '(ciclopropiloxi)metano');
  // Crowded: on a one-carbon level without locants an alkoxy prefix is enclosed, first or not; a halogen never is.
  assert.equal(text('cloro met il oxi met ano'), 'cloro(metoxi)metano');
  assert.equal(text('met il oxi yodo met ano'), '(metoxi)yodometano');
  assert.equal(text('cloro isopropil oxi met ano'), 'cloro(isopropoxi)metano');
  assert.equal(text('cloro fenil oxi met ano'), 'cloro(fenoxi)metano');
  assert.equal(text('START cloro met il oxi met il END benceno'), '[cloro(metoxi)metil]benceno', 'one level up: [ ]');
  assert.equal(text('met il oxi met ano'), 'metoximetano', 'one prefix is no crowd');
  assert.equal(text('di met il oxi met ano'), 'dimetoximetano', 'one multiplied prefix is no crowd');
  // Multipliers as chosen, the hyphen before an italic descriptor; marks ( ), then [ ].
  assert.equal(text('1 2 bis met il oxi et ano'), '1,2-bismetoxietano', 'a wrong bis, as written');
  assert.equal(text('1 2 di pent il oxi et ano'), '1,2-di(pentiloxi)etano', 'a wrong di, as written');
  assert.equal(text('1 6 di tert-butil oxi hex ano'), '1,6-di-tert-butoxihexano');
  assert.equal(text('START 2 START 2 met il prop il oxi END et il oxi END met ano'), '[2-(2-metilpropoxi)etoxi]metano');
  // Out of place, the tiles keep their plain text.
  assert.equal(text('met oxi et ano'), 'metoxietano');
  assert.equal(text('START met il END oxi et ano'), 'metiloxietano');
}); // End of test 'assemble (R-5b): one test per rule…'

test('tokenize (R-5b): alkoxy names read back to their tiles; wrong contractions never read', () => {
  for (const [name, words] of [
    ['metoximetano', 'met il oxi met ano'],
    ['1-isopropoxibutano', '1 isopropil oxi but ano'],
    ['2-tert-butoxi-2-metilpropano', '2 tert-butil oxi 2 met il prop ano'],
    ['fenoxietano', 'fenil oxi et ano'],
    ['(2-metilpropoxi)metano', 'START 2 met il prop il oxi END met ano'],
    ['1-(pentiloxi)hexano', '1 pent il oxi hex ano'],
    ['2-(propan-2-iloxi)propano', '2 prop ano 2 il oxi prop ano'],
    ['cloro(metoxi)metano', 'cloro met il oxi met ano'],
    ['difluorodi(metoxi)metano', 'di fluoro di met il oxi met ano'],
    ['1,6-bis-tert-butoxihexano', '1 6 bis tert-butil oxi hex ano'],
    ['1-[2-(pentiloxi)etoxi]pentano', '1 START 2 pent il oxi et il oxi END pent ano'],
    ['2-(4-metilfenoxi)etan-1-ol', '2 START 4 met il fenil oxi END et ano 1 ol'],
    ['p-dimetoxibenceno', 'p di met il oxi benceno'],
    ['anisol', 'anisol'],
    ['4-cloroanisol', '4 cloro anisol'],
  ]) {
    assert.deepEqual(tokenize(name), seq(words), name);
  }
  // `pentoxi`, `metiloxi`, `isopropiloxi`, `(metoxi)propano`, `fenoxil`… are no assembly of any tiles.
  for (const name of ['pentoximetano', 'metiloximetano', 'isopropiloxibutano', '(metoxi)propano', '1-(metoxi)propano',
    'metoxi', 'oxi', 'oxietano', 'metoxiletano', '(pentil)oximetano', '2-anisol']) {
    assert.equal(tokenize(name), null, name);
  }
}); // End of test 'tokenize (R-5b): alkoxy names read back to their tiles…'

// ---------------------------------------------------------------------------
// Interpreter, builder, search.
// ---------------------------------------------------------------------------

test('interpret (R-5b): an alkoxy prefix is its branch\'s SubstituentSpec with `alkoxy`; `anisol` a template with a methoxy group', () => {
  const spec = specOf('1 START 2 met il prop il oxi END 3 isopropil oxi hex ano');
  const [compound, retained] = spec.prefixes;
  assert.deepEqual([compound.substituent.kind, compound.substituent.length, compound.substituent.alkoxy, compound.substituent.compound],
    ['chain', 3, true, true]);
  assert.deepEqual([compound.substituent.freeValence.slot.kind, compound.substituent.freeValence.slot.value,
    compound.substituent.freeValence.order], ['implicit', 1, 1]);
  assert.deepEqual([retained.substituent.kind, retained.substituent.retained, retained.substituent.alkoxy], ['retained', 'isopropyl', true]);
  assert.equal(specOf('2 met il prop ano').prefixes[0].substituent.alkoxy, false, 'an alkyl branch');
  assert.equal(specOf('2 cloro prop ano').prefixes[0].substituent.alkoxy, false, 'a halogen');
  assert.deepEqual([specOf('fenil oxi met ano ol').prefixes[0].substituent.kind, specOf('fenil oxi met ano ol').prefixes[0].substituent.alkoxy],
    ['phenyl', true]);
  // Left out: the prefix's slots are carbon slots of what it hangs from; its own chain's are its own.
  assert.deepEqual(specOf('di met il oxi et ano').leftOut.map((slot) => [slot.role, slot.domain]), [['carbon', [1, 2]], ['carbon', [1, 2]]]);
  assert.deepEqual(slotGroups(specOf('START met il oxi fenil END met ano')).map((g) => [g.role, g.indices.length, g.domain]),
    [['carbon', 1, [1, 1]], ['phenylCarbon', 1, [2, 6]]]);
  // `anisol`: the benzene ring with one methoxy group at carbon 1, by its word.
  const anisole = specOf('anisol');
  assert.deepEqual([anisole.parent.kind, anisole.parent.template.value, anisole.traditional.value], ['benzene', 'anisole', 'anisole']);
  const [group] = anisole.parent.template.groups;
  assert.deepEqual([group.slots.map((slot) => [slot.kind, slot.value]), group.substituent.length, group.substituent.alkoxy],
    [[['implicit', 1]], 1, true]);
}); // End of test 'interpret (R-5b)…'

test('build (R-5b): an ether oxygen between the branch and its carbon; the caps count it as an atom, not a carbon', () => {
  const spec = specOf('1 met il oxi prop ano');
  const built = build(spec);
  assert.ok(built.ok);
  assert.equal(aromaticKey(built.molecule), keyOf('CCCOC'));
  const [methoxy] = built.prefixAtoms;
  const { atoms, bonds } = built.molecule;
  // The occurrence's attachment is the oxygen, bonded to the parent's carbon 1 and to the methyl, both single.
  assert.deepEqual([methoxy.locant, atoms.get(methoxy.attachment).element, methoxy.parentAtom], [1, 'O', built.studentParent.atoms[0]]);
  const oxygenBonds = [...bonds.values()].filter((bond) => bond.a === methoxy.attachment || bond.b === methoxy.attachment);
  assert.deepEqual(oxygenBonds.map((bond) => bond.order), [1, 1]);
  assert.deepEqual(methoxy.atoms.map((id) => atoms.get(id).element), ['C', 'O'], 'the branch\'s carbon, then its oxygen');
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [4, 5]);
  // A compound alkoxy prefix's own prefixes are cut before its oxygen (for the diagnosis).
  const compound = specOf('1 START 2 met il prop il oxi END but ano');
  const branch = build(compound);
  const own = ownPrefixAtoms(compound.prefixes[0].substituent, branch.prefixAtoms[0].atoms);
  assert.deepEqual(own.map((occurrences) => occurrences.map((list) => list.map((id) => branch.molecule.atoms.get(id).element))), [[['C']]]);
  assert.equal(branch.molecule.atoms.get(branch.prefixAtoms[0].atoms.at(-1)).element, 'O');
  // `anisol`: the ring and its methoxy group; two rings through an oxygen are not bonded atom to atom (no RING_SYSTEM before
  // naming: the engine refuses `fenoxibenceno` itself).
  assert.equal(aromaticKey(build(specOf('anisol')).molecule), keyOf('COC1=CC=CC=C1'));
  assert.ok(build(specOf('fenil oxi benceno'), [1]).ok);
  // The heavy-atom cap (model/validate.js): 30 carbons and 30 methoxy groups is TOO_BIG with the engine's message.
  const big = read('triaconta met il oxi triacont ano');
  assert.deepEqual([big.kind, big.message, big.errors.map((e) => [e.code, e.from, e.to])],
    ['invalid', TOO_MANY_ATOMS_MESSAGE, [['TOO_BIG', 0, 6]]]);
  assert.ok(specAtoms(specOf('triaconta met il oxi triacont ano')) > MAX_HEAVY_ATOMS);
}); // End of test 'build (R-5b): an ether oxygen…'

test('build and search (R-5b): an alkoxy prefix adds one bond to its carbon — VALENCE and ranges with their tiles', () => {
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
  assert.deepEqual(invalid('1 1 1 1 tetra met il oxi et ano'),
    ['VALENCE', 3, 4, 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4.']);
  assert.deepEqual(invalid('penta met il oxi met ano'), ['VALENCE', 0, 4,
    'No caben: pongas donde pongas lo que va sin número, algún carbono tendría más de 4 enlaces.']);
  assert.deepEqual(invalid('1 cloro anisol'), ['VALENCE', 0, 1,
    'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el anisol, ese carbono ya lleva un grupo metoxi.']);
  // Ranges inside the alkoxy branch, as inside any branch.
  assert.deepEqual(invalid('START 4 met il prop il oxi END met ano'),
    ['LOCANT_RANGE', 1, 2, 'La rama de 3 carbonos va del 1 al 3: no hay carbono 4.']);
  assert.deepEqual(invalid('7 met il oxi benceno'), ['LOCANT_RANGE', 0, 1, 'El benceno tiene 6 carbonos, del 1 al 6: no hay carbono 7.']);
  assert.deepEqual(invalid('START 1 met il fenil oxi END met ano'), ['LOCANT_RANGE', 1, 2, 'En «fenil», el carbono 1 es el que se '
    + 'une a la cadena: las ramas del fenil van en los carbonos del 2 al 6.']);
  // A retained word still takes no prefixes of its own.
  assert.deepEqual(invalid('START 2 met il isopropil oxi END met ano'), ['TILE_ORDER', 4, 5,
    'Esta ficha no puede ir aquí: «isopropil» ya es una rama entera y no lleva números ni ramas propias.']);
}); // End of test 'build and search (R-5b): an alkoxy prefix adds one bond…'

test('search (R-5b): left-out alkoxy locants — the structures they fit, the budget', () => {
  const methoxypropane = searchStructures(specOf('met il oxi prop ano'), { namer: nameMolecule });
  assert.equal(methoxypropane.status, 'complete');
  assert.deepEqual(methoxypropane.structures.map((s) => [s.naming.name, s.placements.length]),
    [['1-metoxipropano', 2], ['2-metoxipropano', 1]]);
  // One carbon only has room: `1,1,1-tricloro-metoxietano` is one placement.
  assert.equal(searchStructures(specOf('1 1 1 tri cloro met il oxi et ano'), { namer: nameMolecule }).placements, 1);
  // Ten left-out methoxy groups over ten carbons: past the placement budget, never a claim.
  assert.equal(searchStructures(specOf('deca met il oxi dec ano'), { namer: nameMolecule }).status, 'budget');
}); // End of test 'search (R-5b): left-out alkoxy locants…'

// ---------------------------------------------------------------------------
// readName(): worked cases, our own cases, mutations, diagnosis.
// ---------------------------------------------------------------------------

/**
 * Ether names read by readName(): [name (tile words or text), kind, the
 * engine's name, SMILES of the molecule described].
 */
const CASES = [
  // Chains: the forms of design.md §1.1 (I-34) and every prefix style.
  ['metoximetano', 'correct', 'metoximetano', 'COC'],
  ['metoxietano', 'correct', 'metoxietano', 'CCOC'],
  ['etoxietano', 'correct', 'etoxietano', 'CCOCC'],
  ['1-metoxipropano', 'correct', '1-metoxipropano', 'CCCOC'],
  ['1,2-dimetoxietano', 'correct', '1,2-dimetoxietano', 'COCCOC'],
  ['metoxieteno', 'correct', 'metoxieteno', 'C=COC'],
  ['3-metoxiprop-1-eno', 'correct', '3-metoxiprop-1-eno', 'C=CCOC'],
  ['2-metil-2-metoxipropano', 'correct', '2-metil-2-metoxipropano', 'CC(C)(C)OC'],
  ['1-isopropoxibutano', 'correct', '1-isopropoxibutano', 'CC(C)OCCCC'],
  ['1-(propan-2-iloxi)butano', 'alternative', '1-isopropoxibutano', 'CC(C)OCCCC'],
  ['1-(1-metiletoxi)butano', 'alternative', '1-isopropoxibutano', 'CC(C)OCCCC'],
  ['1-tert-butoxibutano', 'correct', '1-tert-butoxibutano', 'CC(C)(C)OCCCC'],
  ['1-(pentiloxi)hexano', 'correct', '1-(pentiloxi)hexano', 'CCCCCOCCCCCC'],
  ['1,6-bis-tert-butoxihexano', 'correct', '1,6-bis-tert-butoxihexano', 'CC(C)(C)OCCCCCCOC(C)(C)C'],
  // The crowded case left open since I-47, and other halogens.
  ['cloro(metoxi)metano', 'correct', 'cloro(metoxi)metano', 'ClCOC'],
  ['dicloro(metoxi)metano', 'correct', 'dicloro(metoxi)metano', 'COC(Cl)Cl'],
  ['tricloro(metoxi)metano', 'correct', 'tricloro(metoxi)metano', 'COC(Cl)(Cl)Cl'],
  ['1-cloro-2-etoxietano', 'correct', '1-cloro-2-etoxietano', 'ClCCOCC'],
  // Compound branches: an alkoxy inside a branch, a branch inside an alkoxy.
  ['(metoximetil)benceno', 'correct', '(metoximetil)benceno', 'COCC1=CC=CC=C1'],
  ['1-(2-metoxietoxi)propano', 'correct', '1-(2-metoxietoxi)propano', 'COCCOCCC'],
  ['1-(2-metilpropoxi)butano', 'correct', '1-(2-metilpropoxi)butano', 'CC(C)COCCCC'],
  ['4-(2-metoxietil)heptano', 'correct', '4-(2-metoxietil)heptano', 'CCCC(CCOC)CCC'],
  ['(clorometoxi)benceno', 'correct', '(clorometoxi)benceno', 'ClCOC1=CC=CC=C1'],
  ['clorodi(metoxi)metano', 'correct', 'clorodi(metoxi)metano', 'ClC(OC)OC'],
  // Rings, benzene, `anisol`.
  ['metoxiciclohexano', 'correct', 'metoxiciclohexano', 'COC1CCCCC1'],
  ['metoxibenceno', 'correct', 'metoxibenceno', 'COC1=CC=CC=C1'],
  ['anisol', 'alternative', 'metoxibenceno', 'COC1=CC=CC=C1'],
  ['1-metil-4-metoxibenceno', 'correct', '1-metil-4-metoxibenceno', 'COC1=CC=C(C)C=C1'],
  ['1-cloro-4-metoxibenceno', 'correct', '1-cloro-4-metoxibenceno', 'COC1=CC=C(Cl)C=C1'],
  ['p-dimetoxibenceno', 'alternative', '1,4-dimetoxibenceno', 'COC1=CC=C(OC)C=C1'],
  ['o-dimetoxibenceno', 'alternative', '1,2-dimetoxibenceno', 'COC1=CC=CC=C1OC'],
  ['isopropoxibenceno', 'correct', 'isopropoxibenceno', 'CC(C)OC1=CC=CC=C1'],
  // With OH groups: the alcohol is the parent; phenoxy and substituted phenoxy prefixes.
  ['2-metoxietan-1-ol', 'correct', '2-metoxietan-1-ol', 'OCCOC'],
  ['4-metoxifenol', 'correct', '4-metoxifenol', 'OC1=CC=C(OC)C=C1'],
  ['2-fenoxietan-1-ol', 'correct', '2-fenoxietan-1-ol', 'OCCOC1=CC=CC=C1'],
  ['2-(4-metilfenoxi)etan-1-ol', 'correct', '2-(4-metilfenoxi)etan-1-ol', 'OCCOC1=CC=C(C)C=C1'],
  ['2-(ciclohexiloxi)etan-1-ol', 'correct', '2-(ciclohexiloxi)etan-1-ol', 'OCCOC1CCCCC1'],
  // An alkoxy prefix on a substituted phenyl or a ring branch (I-45a forms).
  ['(4-metoxifenil)metanol', 'correct', '(4-metoxifenil)metanol', 'OCC1=CC=C(OC)C=C1'],
  ['(4-metoxiciclohexil)metanol', 'correct', '(4-metoxiciclohexil)metanol', 'OCC1CCC(OC)CC1'],
  // Substituted templates, the wrong side of the oxygen: one molecule, named otherwise.
  ['4-cloroanisol', 'otherName', '1-cloro-4-metoxibenceno', 'COC1=CC=C(Cl)C=C1'],
  ['p-cloroanisol', 'otherName', '1-cloro-4-metoxibenceno', 'COC1=CC=C(Cl)C=C1'],
  ['4-metoxitolueno', 'otherName', '1-metil-4-metoxibenceno', 'COC1=CC=C(C)C=C1'],
  ['etoximetano', 'otherName', 'metoxietano', 'CCOC'],
  ['fenoxietano', 'otherName', 'etoxibenceno', 'CCOC1=CC=CC=C1'],
  ['(clorometoxi)metano', 'otherName', 'cloro(metoxi)metano', 'ClCOC'],
  // Left-out locants with one structure.
  ['2,2-dimetilmetoxipropano', 'missingLocants', '2,2-dimetil-1-metoxipropano', 'COCC(C)(C)C'],
  ['1,1,1-triclorometoxietano', 'missingLocants', '1,1,1-tricloro-2-metoxietano', 'COCC(Cl)(Cl)Cl'],
  ['2-metoxietanol', 'missingLocants', '2-metoxietan-1-ol', 'OCCOC'],
];

test('readName (R-5b): worked cases and our own — chains, rings, benzene, `anisol`, compound branches, OH and halogens', () => {
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
  // `anisol` is the engine's traditional alternative, with its label; `metoxibenceno` says so.
  assert.equal(read('anisol').message, '¡Correcto! «anisol» es una forma válida (nombre tradicional, que la IUPAC (2013) acepta). '
    + 'El nombre que doy primero es «metoxibenceno».');
  assert.equal(read('metoxibenceno').message, '¡Correcto! También se llama «anisol» (nombre tradicional, que la IUPAC (2013) acepta).');
}); // End of test 'readName (R-5b): worked cases and our own…'

test('readName (R-5b): left-out alkoxy locants list the structures; the budget; what the app cannot draw', () => {
  for (const [name, candidates] of [
    ['metoxipropano', ['1-metoxipropano', '2-metoxipropano']],
    ['dimetoxietano', ['1,1-dimetoxietano', '1,2-dimetoxietano']],
    ['dimetoxibenceno', ['1,2-dimetoxibenceno', '1,3-dimetoxibenceno', '1,4-dimetoxibenceno']],
    ['metoxifenol', ['2-metoxifenol', '3-metoxifenol', '4-metoxifenol']],
    ['metoxitolueno', ['1-metil-2-metoxibenceno', '1-metil-3-metoxibenceno', '1-metil-4-metoxibenceno']],
    ['(metoxietil)benceno', ['(1-metoxietil)benceno', '(2-metoxietil)benceno']],
  ]) {
    const verdict = read(name);
    assert.equal(verdict.kind, 'ambiguous', `${name}: ${verdict.message}`);
    assert.deepEqual(verdict.candidates.map((c) => c.text), candidates, name);
    assert.deepEqual([verdict.molecule, verdict.draw], [null, false], name);
  } // End of the loop over the ambiguous names
  assert.equal(read('metoxipropano').message, 'Faltan números: puede ser 1-metoxipropano o 2-metoxipropano.');
  // Out of budget: incomplete, never a claim.
  assert.equal(read('deca met il oxi dec ano').kind, 'incomplete');
  assert.equal(read('met il oxi prop ano', { budget: { placements: 1 } }).kind, 'incomplete');
  // The engine refuses: two rings joined by an oxygen; identical halves that carry the principal group (`oxidi-`).
  for (const name of ['fenoxibenceno', '(ciclohexiloxi)ciclohexano', '1,2-difenoxietano']) {
    const verdict = read(name);
    assert.equal(verdict.kind, 'outOfScope', name);
    assert.match(verdict.message, /varios anillos/, name);
  }
  const symmetric = read('2-(2-hidroxietoxi)etan-1-ol');
  assert.equal(symmetric.kind, 'outOfScope');
  assert.match(symmetric.message, /dos mitades iguales unidas por un oxígeno/);
  // A symmetric ether without a principal group is the engine's own `etoxietano`; its class name `dietil éter` has no
  // tiles yet (phase R-5b2).
  assert.equal(read('etoxietano').kind, 'correct');
  assert.ok(read('etoxietano').alternatives.some((alt) => isEtherClassName(alt.name)));
  assert.equal(TILES.some((tile) => tile.text.includes('éter')), false);
}); // End of test 'readName (R-5b): left-out alkoxy locants list the structures…'

/**
 * Mutations of correct ether names (design.md §15.7): [tile words,
 * assembled text, kind, the engine's name, SMILES of the molecule
 * described, diagnosis code of an `otherName` (null for none)].
 */
const MUTATIONS = [
  ['1 met il oxi prop ano', '1-metoxipropano', 'correct', '1-metoxipropano', 'CCCOC', null],
  // Reversed numbering.
  ['3 met il oxi prop ano', '3-metoxipropano', 'otherName', '1-metoxipropano', 'CCCOC', 'NUMBERING'],
  ['2 met il oxi et ano', '2-metoxietano', 'otherName', 'metoxietano', 'CCOC', 'NUMBERING'],
  ['4 met il 1 met il oxi benceno', '4-metil-1-metoxibenceno', 'otherName', '1-metil-4-metoxibenceno', 'COC1=CC=C(C)C=C1',
    'RING_NUMBERING'],
  // Numbered in the English order: the Spanish one cites `metil` first, so it takes the 1 (N4).
  ['1 met il oxi 4 met il benceno', '1-metoxi-4-metilbenceno', 'otherName', '1-metil-4-metoxibenceno', 'COC1=CC=C(C)C=C1',
    'RING_NUMBERING'],
  // Unsorted prefixes (Spanish order: metil < metoxi).
  ['2 met il oxi 1 met il benceno', '2-metoxi-1-metilbenceno', 'otherName', '1-metil-2-metoxibenceno', 'COC1=CC=CC=C1C',
    'ALPHABETICAL_ORDER'],
  ['2 met il oxi 2 met il prop ano', '2-metoxi-2-metilpropano', 'otherName', '2-metil-2-metoxipropano', 'CC(C)(C)OC',
    'ALPHABETICAL_ORDER'],
  // Ungrouped identical prefixes, di ↔ bis, locants not ascending.
  ['1 met il oxi 2 met il oxi et ano', '1-metoxi-2-metoxietano', 'otherName', '1,2-dimetoxietano', 'COCCOC', 'UNGROUPED'],
  ['1 2 bis met il oxi et ano', '1,2-bismetoxietano', 'otherName', '1,2-dimetoxietano', 'COCCOC', 'MULTIPLIER_KIND'],
  ['1 6 di START 2 met il prop il oxi END hex ano', '1,6-di(2-metilpropoxi)hexano', 'otherName', '1,6-bis(2-metilpropoxi)hexano',
    'CC(C)COCCCCCCOCC(C)C', 'MULTIPLIER_KIND'],
  ['2 1 di met il oxi prop ano', '2,1-dimetoxipropano', 'otherName', '1,2-dimetoxipropano', 'COCC(C)OC', 'LOCANT_ORDER'],
  // Needless locants: a two-carbon parent; inside the alkoxy branch.
  ['1 met il oxi et ano', '1-metoxietano', 'otherName', 'metoxietano', 'CCOC', 'NEEDLESS_LOCANTS'],
  ['1 met il oxi benceno', '1-metoxibenceno', 'otherName', 'metoxibenceno', 'COC1=CC=CC=C1', 'NEEDLESS_LOCANTS'],
  ['1 prop 1 il oxi prop ano', '1-(propan-1-iloxi)propano', 'otherName', '1-propoxipropano', 'CCCOCCC', 'NEEDLESS_LOCANTS'],
  ['START 1 cloro met il oxi END benceno', '(1-clorometoxi)benceno', 'otherName', '(clorometoxi)benceno', 'ClCOC1=CC=CC=C1',
    'NEEDLESS_LOCANTS'],
  // Old-style locants.
  ['1 met il oxi 2 but eno', '1-metoxi-2-buteno', 'otherName', '1-metoxibut-2-eno', 'COCC=CC', 'OLD_STYLE'],
  // A carbon branch on an end lengthens the chain; an alkoxy prefix there does not.
  ['1 met il oxi 1 met il prop ano', '1-metoxi-1-metilpropano', 'otherName', '2-metoxibutano', 'CCC(C)OC', 'BRANCH_AT_END'],
  // The wrong side of the oxygen as the parent: the chain rules' own messages (diagnose.js header «Ethers»).
  ['et il oxi met ano', 'etoximetano', 'otherName', 'metoxietano', 'CCOC', 'LONGER_CHAIN'],
  ['START cloro met il oxi END met ano', '(clorometoxi)metano', 'otherName', 'cloro(metoxi)metano', 'ClCOC', 'MORE_SUBSTITUENTS'],
  ['fenil oxi et ano', 'fenoxietano', 'otherName', 'etoxibenceno', 'CCOC1=CC=CC=C1', 'RING_IS_PARENT'],
  ['START 2 hidroxi et il oxi END met ano', '(2-hidroxietoxi)metano', 'otherName', '2-metoxietan-1-ol', 'OCCOC',
    'MORE_HYDROXY_GROUPS'],
  // A substituted `anisol`.
  ['4 cloro anisol', '4-cloroanisol', 'otherName', '1-cloro-4-metoxibenceno', 'COC1=CC=C(Cl)C=C1', 'SUBSTITUTED_TEMPLATE'],
  // Removed locants (one structure fits).
  ['2 2 di met il met il oxi prop ano', '2,2-dimetilmetoxipropano', 'missingLocants', '2,2-dimetil-1-metoxipropano', 'COCC(C)(C)C',
    null],
];

test('mutations of ether names: reversed, unsorted, ungrouped, di/bis, needless and removed locants, the wrong side', () => {
  for (const [words, assembled, kind, name, smiles, code] of MUTATIONS) {
    const verdict = read(words);
    assert.equal(verdict.text, assembled, words);
    assert.equal(verdict.kind, kind, `${assembled}: ${verdict.message}`);
    assert.equal(verdict.name, name, assembled);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${assembled} builds another graph`);
    if (kind === 'otherName') {
      assert.ok(verdict.diagnosis, `${assembled}: no diagnosis`);
      assert.equal(verdict.diagnosis.code, code, `${assembled}: ${verdict.diagnosis.message}`);
    }
  } // End of the loop over the mutations
}); // End of test 'mutations of ether names…'

test('diagnosis (R-5b): the messages of the chain, ring and form rules with alkoxy prefixes', () => {
  for (const [words, code, message, tiles] of [
    // An alkoxy prefix on an end never lengthens the chain: rule 1 blames the carbon branch.
    ['1 met il oxi 1 met il prop ano', 'BRANCH_AT_END',
      'La rama «metil» está en el extremo de la cadena, así que la alarga: la cadena principal tiene 4 carbonos.', [4, 7]],
    ['et il oxi met ano', 'LONGER_CHAIN', 'Hay una cadena más larga que la tuya: la tuya tiene 1 carbono y la cadena principal tiene 2.',
      [3, 5]],
    ['START cloro met il oxi END met ano', 'MORE_SUBSTITUENTS', 'Hay otra cadena igual de larga con más sustituyentes (2; la tuya '
      + 'tiene 1). Entre cadenas igual de largas, gana la que tiene más sustituyentes.', [6, 8]],
    ['3 met il oxi prop ano', 'NUMBERING', 'Hay que numerar la cadena desde el otro extremo: los sustituyentes tienen que llevar los '
      + 'números más bajos (1 en vez de 3).', null],
    ['4 met il 1 met il oxi benceno', 'RING_NUMBERING', 'Hay que numerar el anillo de otra manera, empezando en otro carbono o '
      + 'contando hacia el otro lado: con los mismos números, el sustituyente que va primero por orden alfabético tiene que llevar '
      + 'el más bajo (1 en vez de 4).', null],
    ['fenil oxi et ano', 'RING_IS_PARENT', 'El anillo es la cadena principal: un anillo manda siempre sobre una cadena abierta, aunque '
      + 'la cadena sea más larga. Tu cadena de 2 carbonos va en una rama del anillo: «etoxibenceno».', [0, 2]],
    ['2 met il oxi 2 met il prop ano', 'ALPHABETICAL_ORDER',
      'Los sustituyentes se escriben por orden alfabético: «metil» va antes que «metoxi» (i antes que o).', [0, 7]],
    ['1 met il oxi 2 met il oxi et ano', 'UNGROUPED', 'Los sustituyentes iguales se escriben una sola vez, con «di», «tri»… '
      + 'delante: «1,2-dimetoxi», no «1-metoxi-2-metoxi».', [0, 8]],
    ['1 6 bis pent il oxi 3 met il oxi hex ano', 'ALPHABETICAL_ORDER',
      'Los sustituyentes se escriben por orden alfabético: «metoxi» va antes que «pentiloxi» (m antes que p). Los prefijos di-, '
      + 'tri-… no cuentan para el orden.', [0, 10]], // «bis» read as letters would put it first.
    ['1 2 bis met il oxi et ano', 'MULTIPLIER_KIND', '«bis», «tris»… solo van delante de ramas que tienen sus propias ramas; aquí '
      + 'va «di», «tri»…: «1,2-dimetoxi», no «1,2-bismetoxi».', [2, 3]],
    ['2 1 di met il oxi prop ano', 'LOCANT_ORDER', 'Los números de un mismo grupo se escriben de menor a mayor: «1,2-dimetoxi», '
      + 'no «2,1-dimetoxi».', [0, 2]],
    ['1 met il oxi et ano', 'NEEDLESS_LOCANTS',
      'En «metoxietano» no se escriben números: solo hay una manera de colocar el sustituyente.', [0, 1]],
    ['1 prop 1 il oxi prop ano', 'NEEDLESS_LOCANTS',
      'Sobran números dentro de la rama: se escribe «1-propoxi», no «1-(propan-1-iloxi)».', [2, 3]],
    ['4 cloro anisol', 'SUBSTITUTED_TEMPLATE', 'El nombre tradicional «anisol» no admite más sustituyentes: con más ramas en el anillo, '
      + 'la molécula se nombra a partir de «benceno», con todas las ramas delante: «1-cloro-4-metoxibenceno».', [2, 3]],
  ]) {
    const verdict = read(words);
    const d = verdict.diagnosis;
    assert.equal(verdict.kind, 'otherName', `${verdict.text}: ${verdict.message}`);
    assert.ok(d, `${verdict.text}: no diagnosis`);
    assert.equal(d.code, code, `${verdict.text}: ${d.message}`);
    assert.equal(d.message, message, verdict.text);
    assert.deepEqual(d.tiles, tiles, `${verdict.text}: tiles`);
    // «Ver el paso» opens a step of the explanation of the naming it compared with.
    const opened = diagnosisExplanation(verdict, explain);
    assert.ok([d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), verdict.text);
  } // End of the loop over the diagnosis cases
  // The prefix style is recognised through the alkoxy branches too: a pin-style name numbered for the default style's words.
  const pin = read('4 met il 2 prop ano 2 il oxi pent ano');
  assert.deepEqual([pin.diagnosis.code, pin.diagnosis.style, pin.diagnosis.traceRule], ['NUMBERING', 'pin', 'N4']);
}); // End of test 'diagnosis (R-5b): the messages of the chain, ring and form rules with alkoxy prefixes'

test('diagnosis (R-5b): deliberate nulls for phase R-5b2 — di before an alkoxy prefix compound only for its form', () => {
  // `di(pentiloxi)`: render.js multiplies `(pentiloxi)` with bis, but rule 7's reason («una rama que tiene sus propias
  // ramas») does not hold for it, so no message (diagnose.js header «Ethers»); likewise `di(propan-2-iloxi)` in the pin style
  // and `di-tert-butoxi`, which the engine writes `bis-tert-butoxi`.
  for (const [words, name] of [
    ['1 6 di pent il oxi hex ano', '1,6-bis(pentiloxi)hexano'],
    ['1 6 di prop ano 2 il oxi hex ano', '1,6-diisopropoxihexano'],
    ['1 6 di tert-butil oxi hex ano', '1,6-bis-tert-butoxihexano'],
  ]) {
    const verdict = read(words);
    assert.equal(verdict.kind, 'otherName', verdict.text);
    assert.equal(verdict.name, name, verdict.text);
    assert.equal(verdict.diagnosis, null, `${verdict.text}: ${verdict.diagnosis && verdict.diagnosis.message}`);
  }
  // With prefixes of its own the reason holds: MULTIPLIER_KIND as for any compound branch.
  assert.equal(read('1 6 di START 2 met il prop il oxi END hex ano').diagnosis.message, 'Delante de una rama que tiene sus '
    + 'propias ramas se usa «bis», «tris»…: «1,6-bis(2-metilpropoxi)», no «1,6-di(2-metilpropoxi)».');
}); // End of test 'diagnosis (R-5b): deliberate nulls…'

test('«Dibujar» (R-5b): ether verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const name of ['metoximetano', '1,2-dimetoxietano', 'cloro(metoxi)metano', 'anisol', '1-metil-4-metoxibenceno',
    '1-[2-(pentiloxi)etoxi]pentano', '2-(4-metilfenoxi)etan-1-ol', '4-cloroanisol', 'etoximetano', 'fenoxietano',
    '1,6-bis-tert-butoxihexano']) {
    const verdict = read(name);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-5b): ether verdicts have an ordered drawing…'

test('dialog (R-5b): `oxi` and `anisol` have tooltips; the silent `il` of `metoxi` has an accessible name', () => {
  assert.ok(TILE_HINTS[ALKOXY_ID].endsWith('.'));
  assert.match(TILE_HINTS[ALKOXY_ID], /met, il y oxi dan metoxi/);
  assert.equal(TILE_HINTS['template-anisole'], 'Benceno con un grupo metoxi: metoxibenceno.');
  assert.equal(silentLabel('il'), 'il (no se escribe)');
}); // End of test 'dialog (R-5b)…'

// ---------------------------------------------------------------------------
// Fixture round trip and closed loop (design.md §15.7).
// ---------------------------------------------------------------------------

test('fixture round trip (R-5b1): every ether row but the class names, graph compared with the SMILES', async () => {
  const fixtures = await readFixtures();
  const rows = fixtures.filter((row) => isEther(row.smiles));
  let covered = 0;
  let classNames = 0;
  let elapsed = 0;
  for (const row of rows) {
    const expected = keyOf(row.smiles);
    for (const name of row.names) {
      if (isEtherClassName(name)) {
        classNames += 1; // `dietil éter`…: phase R-5b2 (I-51b2).
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
   * How many rows of a fixture section.
   *
   * @param {string} id - The section's phase id (`I-34`…).
   * @returns {number} The count.
   */
  const inSection = (id) => rows.filter((row) => row.section.includes(`(${id})`) || row.section.includes(`(${id},`)).length;
  assert.equal(rows.length, EXPECTED_ROWS.total);
  assert.deepEqual([inSection('I-34'), inSection('I-40a'), inSection('I-42a'), inSection('I-43a'), inSection('I-45a')],
    [EXPECTED_ROWS.i34, EXPECTED_ROWS.i40a, EXPECTED_ROWS.i42a, EXPECTED_ROWS.i43a, EXPECTED_ROWS.i45a]);
  assert.equal(covered, EXPECTED_NAMES);
  assert.equal(classNames, EXPECTED_CLASS_NAMES);
  assert.ok(elapsed / covered < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / covered).toFixed(2)} ms on average`);
  // Every I-34 row is read but those with a C=O beside the ether (acids, aldehydes, ketones: phases R-5c, R-5d).
  const later = fixtures.filter((row) => row.section.includes('(I-34)') && !isEther(row.smiles));
  assert.equal(later.length, EXPECTED_CARBONYL_ROWS);
  assert.ok(later.every((row) => /=O|O=/.test(row.smiles)), 'every I-34 row left out has a C=O');
}); // End of test 'fixture round trip (R-5b1): every ether row but the class names…'

/** The closed loop's generators (scripts/oracle/generate.mjs; design.md §15.7), ether molecules only. */
const LOOP = Object.freeze({
  ethers: Object.freeze({ count: 400, seed: 5201, minSize: 2, maxSize: 12 }),
  benzenes: Object.freeze({ count: 400, seed: 5202, minSize: 6, maxSize: 12 }),
  phenyls: Object.freeze({ count: 200, seed: 5203, maxSize: 12 }),
  phenols: Object.freeze({ count: 200, seed: 5204, minSize: 6, maxSize: 12 }),
});

/**
 * Minimum coverage of the closed loop: ether molecules (distinct by
 * aromatic key), names read back (class names left out), the alkoxy forms
 * among them (written as branch + `oxi`, phenoxy, `isopropoxi`), removed-locant
 * mutations and decisive verdicts among them (the seeds give 563, 600, 141,
 * 4, 12, 1563 and 1563).
 */
const LOOP_MIN = Object.freeze({ molecules: 550, names: 590, iloxi: 130, fenoxi: 4, isopropoxi: 10, removed: 1550, decisive: 1550 });

/**
 * The closed loop's molecules: the ether molecules of the generators,
 * distinct by aromatic key.
 *
 * @returns {object[]} The molecules.
 */
function loopMolecules() {
  const seen = new Set();
  const molecules = [];
  const all = [...generateEthers(LOOP.ethers), ...generateBenzenes(LOOP.benzenes), ...generateSubstitutedPhenyls(LOOP.phenyls),
    ...generateRingPrincipalBenzenes(LOOP.phenols)];
  for (const mol of all.filter(isEtherMolecule)) {
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
 * segment's and the suffix's, at any depth — never a free-valence locant.
 *
 * @param {object} tree - An error-free parse() tree.
 * @returns {number[][]} The lists of number tile indices.
 */
function locantLists(tree) {
  const lists = [];
  /**
   * Collects the segments of a chain or ring (none for `benceno`, a template, a retained word or a one-atom group).
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

test('closed loop over the ether generators: engine name → tiles → readName() → the same graph, then without each locant list', () => {
  const molecules = loopMolecules();
  const counts = { names: 0, iloxi: 0, fenoxi: 0, isopropoxi: 0, removed: 0, decisive: 0 };
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    assert.ok(naming.ok, naming.ok ? '' : naming.error.message);
    const key = aromaticKey(mol);
    const all = [naming.name, ...naming.alternatives.map((alt) => alt.name)];
    for (const [i, name] of all.entries()) {
      if (isEtherClassName(name)) {
        continue; // Phase R-5b2.
      }
      const ids = tokenize(name);
      assert.ok(ids, `no tiles for ${name}`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, i === 0 ? 'correct' : 'alternative', `${name}: ${verdict.message}`);
      assert.equal(verdict.name, naming.name);
      assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
      counts.names += 1;
      counts.iloxi += /iloxi/.test(name) ? 1 : 0;
      counts.fenoxi += /fenoxi/.test(name) ? 1 : 0;
      counts.isopropoxi += /isopropoxi/.test(name) ? 1 : 0;
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
  for (const field of ['names', 'iloxi', 'fenoxi', 'isopropoxi', 'removed', 'decisive']) {
    assert.ok(counts[field] >= LOOP_MIN[field], `${field}: ${report}`);
  }
}); // End of test 'closed loop over the ether generators…'

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

/**
 * Tells whether a prefix node is a group bonded through a heteroatom (a
 * halogen, `hidroxi`, an alkoxy prefix): moved to an end, it never
 * lengthens the chain.
 *
 * @param {object} node - A substituent node (parse.js).
 * @returns {boolean} True for such a group.
 */
function isHeteroNode(node) {
  const core = node.type === 'branch' ? node.chain : node;
  return ['halogen', 'hydroxy'].includes(node.type) || Boolean(core && core.oxi !== null && core.oxi !== undefined);
}

/** The diagnosis codes an `otherName` of each mutation family may give (the trace's own rule for a new molecule). */
const FAMILY_CODES = Object.freeze({
  reversed: ['NUMBERING'],
  reflected: ['RING_NUMBERING'],
  rotated: ['RING_NUMBERING'],
  swapped: ['NUMBERING', 'RING_NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS',
    'MORE_HYDROXY_GROUPS'],
  unsorted: ['ALPHABETICAL_ORDER'],
  ungrouped: ['UNGROUPED'],
  diBis: ['MULTIPLIER_KIND'],
  toEnd: ['BRANCH_AT_END'],
  heteroToEnd: ['NUMBERING', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS'],
  removed: [],
  added: ['NEEDLESS_LOCANTS', 'NUMBERING', 'RING_NUMBERING'],
});

/**
 * The mutations of one ether name: renumbered (reversed on a chain, the
 * suffix's locants too; reflected and rotated on a ring), locants swapped
 * between two prefixes, prefixes in reverse order, identical prefixes
 * written one by one, di ↔ bis, a single-locant prefix moved to an end of a
 * chain (a carbon branch: BRANCH_AT_END; an alkoxy prefix, a halogen or
 * `hidroxi`: another molecule, never BRANCH_AT_END), a prefix's locants
 * removed, or added (1… and 2…) where it has none.
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
  const renumberings = ring ? [{ family: 'reflected', carbon: (v) => (v === 1 ? 1 : n + 2 - v), bond: (k) => (k === n ? 1 : n - k) }]
    : [{ family: 'reversed', carbon: (v) => n + 1 - v, bond: (k) => n - k }];
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
        push(isHeteroNode(item.substituent) ? 'heteroToEnd' : 'toEnd', moved);
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
 * Reads every mutation of some ether names: every `otherName` must carry a
 * diagnosis of its family's codes whose step resolves in its explanation.
 *
 * @param {string[]} names - Ether names (engine names or alternatives).
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
 * How many mutations of the ether fixture names give `otherName`, by
 * family; every one is diagnosed with one of its family's codes (no null:
 * the deliberate nulls of «Ethers» need `di(…oxi)` before a compound-form
 * alkoxy prefix, which no fixture name has). Removing locants never gives
 * `otherName`.
 */
const FIXTURE_OTHER_NAME = Object.freeze({
  reversed: 20, reflected: 2, rotated: 22, swapped: 10, unsorted: 7, ungrouped: 2, diBis: 4, toEnd: 4, heteroToEnd: 17, removed: 0,
  added: 22,
});

test('mutations of every ether fixture name: a diagnosis of the family\'s codes for every otherName, and a coverage count', async () => {
  const names = (await readFixtures()).filter((row) => isEther(row.smiles)).flatMap((row) => row.names)
    .filter((name) => !isEtherClassName(name));
  assert.equal(names.length, EXPECTED_NAMES);
  const { otherName, codes, nulls } = sweep(names);
  assert.deepEqual(nulls, []);
  assert.deepEqual(otherName, { ...FIXTURE_OTHER_NAME });
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'BRANCH_AT_END', 'MULTIPLIER_KIND', 'NEEDLESS_LOCANTS', 'NUMBERING',
    'RING_NUMBERING', 'UNGROUPED']);
}); // End of test 'mutations of every ether fixture name…'

test('mutations of the generated ethers: every otherName is diagnosed, every step resolves', () => {
  const names = [];
  for (const mol of loopMolecules().slice(0, 300)) {
    const naming = nameMolecule(mol);
    names.push(naming.name, ...naming.alternatives.map((alt) => alt.name).filter((name) => !isEtherClassName(name)));
  }
  assert.ok(names.length >= 300, `${names.length} names`);
  const { otherName, codes, nulls } = sweep(names);
  assert.deepEqual(nulls, []);
  const total = Object.values(otherName).reduce((sum, count) => sum + count, 0);
  assert.ok(total >= 1200, `${total} otherName verdicts`); // The seeds give 1262.
  assert.equal(otherName.removed, 0);
  for (const code of ['NUMBERING', 'RING_NUMBERING', 'ALPHABETICAL_ORDER', 'UNGROUPED', 'MULTIPLIER_KIND', 'NEEDLESS_LOCANTS',
    'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_SUBSTITUENTS']) {
    assert.ok(codes.has(code), code);
  }
}); // End of test 'mutations of the generated ethers…'

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

test('property (R-5b): random ether names — any parent, locants or none, inside branches too — never crash', () => {
  const random = mulberry32(20261015);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const branches = ['met il oxi', 'et il oxi', 'prop il oxi', 'pent il oxi', 'isopropil oxi', 'tert-butil oxi', 'fenil oxi',
    'prop 2 il oxi', 'START 2 met il prop il oxi END', 'START 4 cloro fenil oxi END', 'START met il oxi met il END', 'cloro', 'met il',
    'hidroxi', 'oxi', 'met iliden oxi'];
  const parents = ['met ano', 'et ano', 'et eno', 'prop ano', 'but 1 eno', 'pent ano', 'ciclo hex ano', 'benceno', 'anisol', 'tolueno',
    'et ano ol', 'fenol'];
  const multipliers = { 1: '', 2: 'di', 3: 'tri' };
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const prefixes = Array.from({ length: int(1, 3) }, () => {
      const count = int(1, 3);
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
  for (const kind of ['correct', 'otherName', 'ambiguous', 'invalid']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-5b): random ether names…'

test('time budget: ether readName() calls, with their diagnosis, well within budget', () => {
  const names = ['1,6-bis(pentiloxi)hexano', '1-[2-(pentiloxi)etoxi]pentano', 'difluorodi(metoxi)metano', 'metoxipropano',
    'dimetoxibenceno', '2-metoxi-2-metilpropano', '1-(propan-2-iloxi)butano', 'anisol', '4-cloroanisol', 'etoximetano',
    '2-(4-metilfenoxi)etan-1-ol'];
  names.forEach((name) => read(name)); // Warm-up.
  for (const name of names) {
    const start = performance.now();
    const verdict = read(name);
    const ms = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', name);
    assert.ok(ms < PER_NAME_BUDGET_MS, `${name}: ${ms.toFixed(1)} ms`);
  }
}); // End of test 'time budget…'
