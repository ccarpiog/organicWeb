/**
 * @file Unit tests for the nitriles in «¿Cómo se dibuja?» (src/reverse/,
 * design.md §15.5.2, §15.5.3, §15.7, §15.8 R-6b; phase I-52b1, R-6b1): the
 * «Grupos» row's suffixes `nitrilo` (a –C≡N at the ends of a chain, by rule:
 * its carbon is the chain's end carbon) and `carbonitrilo` (a –C≡N whose
 * carbon is outside the parent), its prefix `ciano` (a –C≡N bonded by its
 * carbon, never a carbon of the chain it hangs from), and the «Anillos»
 * row's `benzonitrilo`. Parser (the suffix nodes, the misplaced tiles with
 * their tile ranges and hints, partial names), assembler (every form checked
 * against the forward engine's own text), tokenizer (the retained nitrile
 * names of phase I-52b2 and the amines' and amides' names never read),
 * interpreter and builder (the nitrogen triple-bonded to each –C≡N's carbon,
 * the –C≡N's own carbon, CARBONYL_POSITION, VALENCE, LOCANT_RANGE, the caps),
 * search (left-out locants of `carbonitrilo` and of the prefixes; the budget),
 * readName() verdicts with the molecule each describes (compared by aromatic
 * key with a SMILES), out-of-scope nitriles (the engine's `manyNitriles` and
 * `carbonocyanidic`), mutations and their diagnosis (the rules that hold for
 * a nitrile name; the nitrile's own mistakes, deliberate nulls of
 * diagnose.js «Nitriles» until phase I-52b3, each with its category read
 * independently), the fixture round trip over every row with a –C≡N of
 * tests/fixtures/names.tsv, the closed loop over the oracle's nitrile
 * generators (pure imports, no Java), the diagnosis sweeps with exact counts,
 * the ordered drawing, the dialog's tooltips and time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse, isTerminalSuffix } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build, specAtoms, specCarbons } from '../../src/reverse/build.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { NITRILO_ID, CARBONITRILE_ID, BENZONITRILE_ID, CYANO_ID } from '../../src/reverse/tiles.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { TILE_HINTS } from '../../src/ui/name-builder.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { MAX_HEAVY_ATOMS, TOO_MANY_ATOMS_MESSAGE } from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import {
  generateNitriles, generateCyano, generateRingNitrilesAmides, generateRingOutsideBenzenes, generateRingPolysuffixBenzenes,
  generateSubstitutedPhenyls, generateSubstitutedBenzoyls, generateAcyl,
} from '../../scripts/oracle/generate.mjs';
import {
  seq, readFixtures, leafIndices, isNitrile, isNitrileMolecule, isNitrileName, LATER_NITRILE_WORDS, NITRILE_WORD, isEster,
} from './reverse-words.js';

/**
 * Fixture rows with a –C≡N (a `C#N` in the SMILES): 74, of which 64 are
 * nitriles the tiles read (isNitrile(): carbons, halogens, oxygens and the
 * nitrogens of –C≡N groups only), by section: 17 of I-38 (the nitriles' own
 * section), 20 of I-39a (`ciano` beside an acid or an ester, and two nitriles
 * on two carbon pieces), 2 of I-39b (acyl prefixes), 1 of I-39c, 15 of I-40c
 * (ring nitriles), 1 of I-40d, 3 of I-43b (benzonitriles with ring prefixes,
 * `ácido 4-cianobenzoico`), 3 of I-44 (benzene polynitriles), 1 of I-45a and
 * 1 of I-45b; and 10 with an amine's or an amide's nitrogen (R-6c, R-6d:
 * `2-aminopropanonitrilo`, `3-cianopropanamida`, `4-aminobenzonitrilo`…),
 * which never tokenize.
 */
const EXPECTED_ROWS = Object.freeze({
  total: 74, read: 64, i38: 17, i39a: 20, i39b: 2, i39c: 1, i40c: 15, i40d: 1, i43b: 3, i44: 3, i45a: 1, i45b: 1, later: 10,
});

/**
 * Their names and alternatives: 75 the tiles write, read back, and 4 retained
 * nitrile names of phase I-52b2 (`acetonitrilo`, `fenilacetonitrilo`,
 * `2-(4-metilfenil)acetonitrilo`, `ftalonitrilo`: LATER_NITRILE_WORDS), which
 * never tokenize.
 */
const EXPECTED_NAMES = 75;
const EXPECTED_LATER_NAMES = 4;

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
    ids = null; // A name text: `2-metilpropanonitrilo`, `ácido 3-cianopropanoico`.
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
 * The bonds of each nitrogen of a molecule: its neighbour's element and the
 * bond order (the N of a –C≡N is `C3`), the nitrogens sorted.
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

test('parser (R-6b1): the nitrile suffixes in the parent node, `benzonitrilo` a whole word, `ciano` a retained word', () => {
  // 0:2 1:met 2:il 3:prop 4:ano 5:nitrilo
  let { tree, errors } = parse(seq('2 met il prop ano nitrilo'));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.parent.suffix, { type: 'suffix', locants: [], multiplier: null, tile: 5, range: [5, 6] });
  assert.ok(isTerminalSuffix(tree.tiles, tree.parent.suffix), '`nitrilo` is terminal by rule, as `oico`');
  ({ tree, errors } = parse(seq('but ano di nitrilo')));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.parent.suffix, { type: 'suffix', locants: [], multiplier: 2, tile: 3, range: [2, 4] });
  ({ tree, errors } = parse(seq('ciclo hex ano 1 4 di carbonitrilo')));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.parent.suffix, { type: 'suffix', locants: [3, 4], multiplier: 5, tile: 6, range: [3, 7] });
  assert.ok(!isTerminalSuffix(tree.tiles, tree.parent.suffix));
  ({ tree, errors } = parse(seq('4 met il benzonitrilo')));
  assert.deepEqual(errors, []);
  assert.deepEqual([tree.parent.chain, tree.parent.suffix], [{ type: 'benzene', tile: 3, range: [3, 4] }, null]);
  ({ tree, errors } = parse(seq('ácido 3 ciano prop ano oico')));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.items[0].substituent, { type: 'retained', tile: 2, oxi: null, range: [2, 3] });
  ({ tree, errors } = parse(seq('4 START ciano met il END ciclo hex ano 1 carbonitrilo')));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.items[0].substituent.items[0].substituent, { type: 'retained', tile: 2, oxi: null, range: [2, 3] });
  // Old style: `2-butenonitrilo` gives its locant to the segment (`nitrilo` has no list to leave open); `1,4-…dicarbonitrilo` to
  // the suffix.
  ({ tree } = parse(seq('2 but eno nitrilo')));
  assert.deepEqual([tree.parent.legacySegment, tree.parent.legacySuffix], [0, false]);
  ({ tree } = parse(seq('1 4 ciclo hex ano di carbonitrilo')));
  assert.deepEqual([tree.parent.legacySegment, tree.parent.legacySuffix], [null, true]);
  // Lossless: every tile once, in order.
  for (const words of ['2 met il prop ano nitrilo', '4 met il benzonitrilo', 'ciclo hex ano 1 4 di carbonitrilo',
    'ácido 3 START 2 ciano et il END hex ano oico', 'et ano oato ciano met ilo', 'nitrilo', 'ciano', 'ciano oxi met ano',
    'but ano nitrilo ciano', 'START benzonitrilo END met ano nitrilo']) {
    assert.deepEqual(leafIndices(parse(seq(words)).tree), seq(words).map((_, i) => i), words);
  }
  // Partial names assemble too.
  assert.equal(text('but ano 1 4 di'), 'butano-1,4-di');
  assert.equal(text('2 ciano'), '2-ciano');
  assert.equal(text('ciclo hex ano 1'), 'ciclohexano-1');
}); // End of test 'parser (R-6b1)…'

test('parser (R-6b1): misplaced nitrile tiles are errors with their tile ranges and hints; no new error code', () => {
  const cases = [
    ['ciclo hex ano nitrilo', ['TILE_ORDER[3,4)']],
    ['benceno nitrilo', ['TILE_ORDER[1,2)']],
    ['but ano 1 nitrilo', ['TILE_ORDER[2,3)']],
    ['but ano 1 4 di nitrilo', ['TILE_ORDER[2,4)']],
    ['1 but ano nitrilo', ['TILE_ORDER[0,1)']],
    ['but ano 1 4 bis nitrilo', ['TILE_ORDER[2,4)', 'TILE_ORDER[4,5)']],
    ['ciclo hex ano 1 4 bis carbonitrilo', ['TILE_ORDER[5,6)']],
    ['ciclo hex ano 1 4 carbonitrilo', ['LOCANT_COUNT[3,5)']],
    ['nitrilo met ano', ['TILE_ORDER[0,1)']],
    ['carbonitrilo ciclo hex ano', ['TILE_ORDER[0,1)']],
    ['START 2 met il pent ano nitrilo END hex ano nitrilo', ['TILE_ORDER[6,7)']], // `nitrilo` in a branch
    ['1 benzonitrilo', ['TEMPLATE_LOCANTS[0,1)']],
    ['p benzonitrilo', ['TEMPLATE_LOCANTS[0,1)']],
    ['di benzonitrilo', ['TILE_ORDER[0,1)']],
    ['benzonitrilo nitrilo', ['TILE_ORDER[1,2)']],
    ['START benzonitrilo END met ano nitrilo', ['TILE_ORDER[1,2)']],
    ['ciano oxi met ano', ['TILE_ORDER[1,2)']],
    ['ciano met il éter', ['TILE_ORDER[0,1)']],
    ['et ano oato ciano ilo', ['TILE_ORDER[3,4)']],
    ['2 ciano', ['ENDS_WITH_BRANCH[0,2)']],
    ['START 2 ciano END et ano', ['TILE_ORDER[3,4)']],
    ['ácido but ano nitrilo', ['ACID_WORD[0,1)']],
    ['ácido benzonitrilo', ['ACID_WORD[0,1)']],
    ['but ano nitrilo met ilo', ['ESTER_SUFFIX[3,5)']],
    ['p di met il benzonitrilo', ['POSITIONAL[0,1)']],
  ];
  for (const [words, expected] of cases) {
    const errors = errorsOf(words);
    for (const error of expected) {
      assert.ok(errors.includes(error), `${words}: ${errors.join(' ')} lacks ${error}`);
    }
  }
  const lead = 'Esta ficha no puede ir aquí: ';
  assert.equal(messageOf('ciclo hex ano nitrilo'), `${lead}«nitrilo» solo va detrás de una cadena: en un anillo, el grupo C≡N va `
    + 'unido a un carbono del anillo y se escribe «carbonitrilo» (ciclohexanocarbonitrilo).');
  assert.equal(messageOf('benceno nitrilo'), `${lead}«nitrilo» no va detrás de «benceno»: el benceno con un grupo C≡N es el `
    + '«benzonitrilo», y con varios se usa «carbonitrilo» (benceno-1,4-dicarbonitrilo).');
  const nitriloLocants = `${lead}el grupo C≡N de «nitrilo» va siempre en un extremo de la cadena, en el carbono 1 (y en el último, `
    + 'con «dinitrilo»), así que «nitrilo» no lleva números: butanonitrilo, butanodinitrilo.';
  assert.equal(messageOf('but ano 1 nitrilo'), nitriloLocants);
  assert.equal(messageOf('1 but ano nitrilo'), nitriloLocants);
  assert.equal(parse(seq('but ano 1 4 bis nitrilo')).errors[1].message, `${lead}delante de «nitrilo» va «di», «tri»…, no «bis» ni `
    + '«tris».');
  assert.equal(messageOf('nitrilo met ano'), `${lead}«nitrilo» va al final del nombre, detrás de la terminación de la cadena `
    + 'principal (butanonitrilo, butanodinitrilo); en una rama, el grupo C≡N se escribe «ciano» ((cianometil)).');
  assert.equal(messageOf('carbonitrilo ciclo hex ano'), `${lead}«carbonitrilo» va al final del nombre, detrás del nombre del anillo `
    + 'principal (ciclohexanocarbonitrilo); en una rama, el grupo C≡N se escribe «ciano».');
  assert.equal(messageOf('1 benzonitrilo'), '«benzonitrilo» ya dice dónde va su grupo C≡N, en el carbono 1: no lleva números ni '
    + 'letras propios.');
  assert.equal(messageOf('START benzonitrilo END met ano nitrilo'), `${lead}«benzonitrilo» es el nombre de toda la molécula y va al `
    + 'final; dentro de una rama, el anillo es «fenil» y su grupo C≡N se escribe «ciano», como en (4-cianofenil).');
  assert.equal(messageOf('ciano oxi met ano'), `${lead}«oxi» no va detrás de «ciano»: un grupo C≡N unido a un oxígeno no forma un éter.`);
  assert.equal(messageOf('ciano met il éter'), `${lead}«ciano» no va en un nombre con «éter»: un grupo C≡N unido al oxígeno no forma `
    + 'un éter. Los dos grupos de un éter son cadenas o anillos de carbonos (etil metil éter).');
  assert.equal(messageOf('et ano oato ciano ilo'), `${lead}«ciano» no va unido al oxígeno de un éster: el grupo unido al oxígeno es `
    + 'una cadena o un anillo de carbonos que acaba en «ilo» (etanoato de metilo).');
  assert.equal(messageOf('2 ciano'), 'El nombre acaba en un grupo («ciano»): falta la cadena principal detrás.');
  assert.equal(messageOf('p di met il benzonitrilo'), 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu '
    + 'nombre pone tres (contando el grupo C≡N del benzonitrilo): escribe los números (1,2,4-trimetilbenceno).');
  // A letter counts the –C≡N of `benzonitrilo` as one of its two positions.
  assert.deepEqual(errorsOf('p met il benzonitrilo'), []);
  // `carbonitrilo` after a chain is read, as `carboxílico` and `carbaldehído` are, and judged by the engine (`propano-1-carbonitrilo`
  // is butanonitrilo: readName() below, a deliberate «Nitriles» null for phase I-52b3).
  assert.deepEqual(errorsOf('prop ano 1 carbonitrilo'), []);
}); // End of test 'parser (R-6b1): misplaced nitrile tiles…'

// ---------------------------------------------------------------------------
// Assembler and tokenizer.
// ---------------------------------------------------------------------------

/**
 * Every assembly form of phase R-6b1, as tile words and the SMILES of a
 * molecule whose engine names include the form (render.js suffixWords(): the
 * parent's `o` kept before the consonant of `nitrilo`, `dinitrilo` and
 * `carbonitrilo`; substituentTokens(): `ciano` a simple prefix, never enclosed
 * by itself; the other families' words around them).
 */
const FORMS = Object.freeze([
  ['met ano nitrilo', 'C#N'],
  ['et ano nitrilo', 'CC#N'],
  ['but ano nitrilo', 'CCCC#N'],
  ['et ano di nitrilo', 'N#CC#N'],
  ['but ano di nitrilo', 'N#CCCC#N'],
  ['prop 2 eno nitrilo', 'C=CC#N'],
  ['prop 2 ino nitrilo', 'C#CC#N'],
  ['but 2 eno di nitrilo', 'N#CC=CC#N'],
  ['2 met il prop ano nitrilo', 'CC(C)C#N'],
  ['2 met il prop ano di nitrilo', 'CC(C#N)C#N'],
  ['3 pent il pent ano di nitrilo', 'N#CCC(CCCCC)CC#N'],
  ['2 2 2 tri fluoro et ano nitrilo', 'FC(F)(F)C#N'],
  ['4 oxo pent ano nitrilo', 'CC(=O)CCC#N'],
  ['3 hidroxi but ano nitrilo', 'CC(O)CC#N'],
  ['2 met il oxi et ano nitrilo', 'COCC#N'],
  ['2 acetil pent ano nitrilo', 'N#CC(C(C)=O)CCC'],
  ['3 START ciano met il oxi END prop ano nitrilo', 'N#CCCOCC#N'],
  ['3 START ciano met il oxi END pent ano di nitrilo', 'N#CCC(OCC#N)CC#N'],
  ['ciclo hex ano carbonitrilo', 'N#CC1CCCCC1'],
  ['ciclo hex 2 eno 1 carbonitrilo', 'N#CC1C=CCCC1'],
  ['ciclo hex ano 1 4 di carbonitrilo', 'N#CC1CCC(C#N)CC1'],
  ['ciclo hex ano 1 3 5 tri carbonitrilo', 'N#CC1CC(C#N)CC(C#N)C1'],
  ['2 met il ciclo hex ano 1 carbonitrilo', 'N#CC1CCCCC1C'],
  ['4 START ciano met il END ciclo hex ano 1 carbonitrilo', 'N#CCC1CCC(C#N)CC1'],
  ['4 isopropil ciclo hex ano 1 carbonitrilo', 'CC(C)C1CCC(C#N)CC1'],
  ['4 prop ano 2 il ciclo hex ano 1 carbonitrilo', 'CC(C)C1CCC(C#N)CC1'],
  ['benzonitrilo', 'N#CC1=CC=CC=C1'],
  ['benceno carbonitrilo', 'N#CC1=CC=CC=C1'],
  ['4 met il benzonitrilo', 'N#CC1=CC=C(C)C=C1'],
  ['4 met il benceno 1 carbonitrilo', 'N#CC1=CC=C(C)C=C1'],
  ['p met il benzonitrilo', 'N#CC1=CC=C(C)C=C1'],
  ['4 formil benzonitrilo', 'N#CC1=CC=C(C=O)C=C1'],
  ['benceno 1 4 di carbonitrilo', 'N#CC1=CC=C(C#N)C=C1'],
  ['benceno 1 3 5 tri carbonitrilo', 'N#CC1=CC(C#N)=CC(C#N)=C1'],
  ['2 fenil et ano nitrilo', 'N#CCC1=CC=CC=C1'],
  ['2 START 4 met il fenil END et ano nitrilo', 'N#CCC1=CC=C(C)C=C1'],
  ['2 START 4 met il benzoil END but ano nitrilo', 'N#CC(CC)C(=O)C1=CC=C(C)C=C1'],
  // `ciano` beside an acid or an ester (I-39a, I-40c, I-43b).
  ['ácido 3 ciano prop ano oico', 'N#CCCC(=O)O'],
  ['ácido 2 2 di ciano et ano oico', 'N#CC(C#N)C(=O)O'],
  ['ácido 2 ciano 2 cloro et ano oico', 'ClC(C#N)C(=O)O'],
  ['ácido 3 START 2 ciano et il END hex ano oico', 'OC(=O)CC(CCC#N)CCC'],
  ['ácido 3 ciano 2 START ciano met il END prop ano oico', 'N#CCC(CC#N)C(=O)O'],
  ['ácido 4 ciano ciclo hex ano 1 carboxílico', 'OC(=O)C1CCC(C#N)CC1'],
  ['ácido 2 START 4 ciano ciclo hex il END prop ano di oico', 'OC(=O)C(C(=O)O)C1CCC(C#N)CC1'],
  ['ácido 4 ciano benzoico', 'OC(=O)C1=CC=C(C#N)C=C1'],
  ['ácido p ciano benzoico', 'OC(=O)C1=CC=C(C#N)C=C1'],
  ['2 ciano et ano oato met ilo', 'N#CCC(=O)OC'],
  ['et ano oato ciano met ilo', 'CC(=O)OCC#N'],
  ['acetato ciano met ilo', 'CC(=O)OCC#N'],
  ['et ano oato 1 ciano et ilo', 'CC(C#N)OC(=O)C'],
  ['3 ciano pent ano di oato di met ilo', 'COC(=O)CC(C#N)CC(=O)OC'],
  ['4 ciano ciclo hex ano 1 carboxilato met ilo', 'COC(=O)C1CCC(C#N)CC1'],
]);

test('assembler (R-6b1): every nitrile form is the forward engine\'s own text; the tokenizer reads it back', () => {
  for (const [words, smiles] of FORMS) {
    const assembled = text(words);
    assert.ok(namesOf(smiles).includes(assembled), `${words} → ${assembled}, not among ${namesOf(smiles).join(', ')}`);
    assert.deepEqual(tokenize(assembled), seq(words), assembled);
  }
  // Rules 3 and 4, the suffix half: the parent's `o` kept before the consonant of `nitrilo`, `dinitrilo` and `carbonitrilo`.
  assert.equal(text('but ano nitrilo'), 'butanonitrilo');
  assert.equal(text('prop 2 eno nitrilo'), 'prop-2-enonitrilo');
  assert.equal(text('ciclo hex 2 eno 1 carbonitrilo'), 'ciclohex-2-eno-1-carbonitrilo');
  // The suffix is an 'ending' part, `benzonitrilo` a 'stem' (the parent), `ciano` a 'prefix', as render.js gives them.
  const kinds = (words) => assemble(parse(seq(words)).tree).spans.filter((s) => s.tile !== null).map((s) => s.kind);
  assert.deepEqual(kinds('2 ciano prop ano nitrilo'), ['locant', 'prefix', 'stem', 'ending', 'ending']);
  assert.deepEqual(kinds('4 met il benzonitrilo'), ['locant', 'prefix', 'prefix', 'stem']);
  // Old style, assembled as written.
  assert.equal(text('2 but eno nitrilo'), '2-butenonitrilo');
  assert.deepEqual(tokenize('2-butenonitrilo'), seq('2 but eno nitrilo'));
  assert.equal(text('1 4 ciclo hex ano di carbonitrilo'), '1,4-ciclohexanodicarbonitrilo');
}); // End of test 'assembler (R-6b1)…'

test('tokenizer (R-6b1): texts that only read with errors, the retained nitrile names and later families never tokenize', () => {
  for (const name of ['nitrilo', 'butanonitril', 'butannitrilo', 'butan-1-onitrilo', 'butano-1-nitrilo', '1-butanonitrilo',
    'ciclohexanonitrilo', 'bencenonitrilo', 'ciclohexanocarbonitril', '1-benzonitrilo', 'p-benzonitrilo', 'benzonitrilonitrilo',
    '(cianooxi)metano', 'ciano', '2-ciano', 'ácido butanonitrilo', 'butanonitrilo de metilo', 'etanoato de cianilo',
    // Phase I-52b2: the retained nitrile names (LATER_NITRILE_WORDS).
    'acetonitrilo', 'fenilacetonitrilo', '2-(4-metilfenil)acetonitrilo', 'ftalonitrilo', '4-metilftalonitrilo',
    // Phases R-6c, R-6d: amines and amides beside a nitrile.
    '2-aminopropanonitrilo', '4-aminobenzonitrilo', '3-cianopropanamida', '4-cianociclohexano-1-carboxamida',
    '3-cianobenzamida']) {
    assert.equal(tokenize(name), null, name);
  }
  assert.deepEqual(LATER_NITRILE_WORDS, ['acetonitrilo', 'ftalonitrilo']);
  assert.ok(['butanonitrilo', 'ciclohexanocarbonitrilo', 'benzonitrilo', 'ácido 3-cianopropanoico'].every((n) => NITRILE_WORD.test(n)));
  assert.ok(!NITRILE_WORD.test('ácido butanoico'));
}); // End of test 'tokenizer (R-6b1)…'

// ---------------------------------------------------------------------------
// Interpreter and builder.
// ---------------------------------------------------------------------------

test('interpreter (R-6b1): the SuffixSpec of each nitrile suffix; `nitrilo` at the ends of a chain by rule; `ciano` a retained word', () => {
  // `nitrilo`: implicit at carbon 1, and at the last carbon with `dinitrilo`, on the `nitrilo` tiles; no left-out slot.
  let spec = specOf('pent ano di nitrilo');
  assert.deepEqual([spec.suffix.kind, spec.suffix.outside, spec.suffix.hydroxy, spec.suffix.bridge, spec.suffix.terminal,
    spec.suffix.placed], ['nitrile', false, false, false, true, false]);
  assert.deepEqual(spec.suffix.slots.map((slot) => [slot.kind, slot.value, slot.tiles]), [['implicit', 1, [2, 4]], ['implicit', 5, [2, 4]]]);
  assert.deepEqual([spec.leftOut, spec.classWord], [[], null]);
  // `carbonitrilo`: supplied, old style or left out, carbons 1…n, outside.
  spec = specOf('ciclo hex ano carbonitrilo');
  assert.deepEqual([spec.suffix.kind, spec.suffix.outside, spec.suffix.terminal], ['nitrile', true, false]);
  assert.deepEqual(spec.leftOut.map((slot) => [slot.role, slot.domain, slot.tiles]), [['carbon', [1, 6], [3, 4]]]);
  spec = specOf('1 4 ciclo hex ano di carbonitrilo');
  assert.deepEqual([spec.oldStyle, spec.suffix.slots.map((slot) => [slot.kind, slot.value])], [true, [['supplied', 1], ['supplied', 4]]]);
  // `benzonitrilo`: the benzene parent with its –C≡N at carbon 1, placed by the word.
  spec = specOf('4 met il benzonitrilo');
  assert.deepEqual([spec.parent.kind, spec.suffix.kind, spec.suffix.outside, spec.suffix.placed, spec.suffix.phenol, spec.suffix.word.text],
    ['benzene', 'nitrile', true, true, false, 'benzonitrilo']);
  assert.deepEqual(spec.suffix.slots.map((slot) => [slot.kind, slot.value, slot.tiles]), [['implicit', 1, [3, 4]]]);
  // A letter counts the –C≡N: `p-metilbenzonitrilo` puts the methyl at 4.
  assert.deepEqual(specOf('p met il benzonitrilo').prefixes[0].slots.map((slot) => slot.value), [4]);
  // `ciano`: a retained word, at any depth.
  spec = specOf('ácido 3 START 2 ciano et il END hex ano oico');
  assert.equal(spec.prefixes[0].substituent.prefixes[0].substituent.retained, 'cyano');
  assert.equal(specOf('ácido 3 ciano prop ano oico').prefixes[0].substituent.retained, 'cyano');
}); // End of test 'interpreter (R-6b1)…'

test('builder (R-6b1): the N of each –C≡N, triple-bonded, its own carbon outside a ring, `ciano`; atoms counted for the caps', () => {
  let built = build(specOf('but ano di nitrilo'));
  assert.ok(built.ok);
  assert.deepEqual(nitrogenBonds(built.molecule), ['C3', 'C3']);
  assert.deepEqual(built.suffixAtoms.map((g) => [g.locant, built.molecule.bonds.get(g.bond).order,
    built.molecule.atoms.get(g.attachment).element, g.hydroxy, g.bridge]), [[1, 3, 'N', undefined, undefined], [4, 3, 'N', undefined,
    undefined]]);
  assert.deepEqual(built.suffixAtoms.map((g) => g.parentAtom), [built.studentParent.atoms[0], built.studentParent.atoms[3]]);
  assert.equal(aromaticKey(built.molecule), keyOf('N#CCCC#N'));
  // `carbonitrilo`: a carbon bonded to the ring's carbon by a single bond, the N on it by a triple one.
  built = build(specOf('ciclo hex ano 1 carbonitrilo'));
  const [group] = built.suffixAtoms;
  assert.equal(built.molecule.atoms.get(group.carbon).element, 'C');
  assert.deepEqual([built.molecule.bonds.get(group.carbonBond).order, built.molecule.bonds.get(group.bond).order], [1, 3]);
  assert.equal(group.parentAtom, built.studentParent.atoms[0]);
  assert.equal(aromaticKey(built.molecule), keyOf('N#CC1CCCCC1'));
  assert.equal(aromaticKey(build(specOf('benzonitrilo')).molecule), keyOf('N#CC1=CC=CC=C1'));
  assert.equal(aromaticKey(build(specOf('met ano nitrilo')).molecule), keyOf('C#N'));
  // `ciano`: one carbon with its N, bonded by that carbon, never a carbon of the chain.
  built = build(specOf('ácido 3 ciano prop ano oico'));
  assert.equal(aromaticKey(built.molecule), keyOf('N#CCCC(=O)O'));
  assert.deepEqual(nitrogenBonds(built.molecule), ['C3']);
  assert.equal(built.studentParent.atoms.length, 3);
  assert.equal(aromaticKey(build(specOf('ciano ciclo hex ano'), [1]).molecule), keyOf('N#CC1CCCCC1')); // Its left-out locant: 1.
  // The caps count the –C≡N's carbon and its N.
  let spec = specOf('benceno 1 2 3 4 5 6 hexa carbonitrilo');
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [12, 18]);
  spec = specOf('4 START ciano met il END ciclo hex ano 1 carbonitrilo');
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [9, 11]);
  assert.deepEqual([specCarbons(specOf('but ano di nitrilo')), specAtoms(specOf('but ano di nitrilo'))], [4, 6]);
  const locants = Array.from({ length: 30 }, (_, i) => i + 1).join(' ');
  const verdict = read(`ciclo triacont ano ${locants} triaconta carbonitrilo`);
  assert.deepEqual([verdict.kind, verdict.errors[0].code, verdict.message], ['invalid', 'TOO_BIG', TOO_MANY_ATOMS_MESSAGE]);
  assert.ok(30 + 30 + 30 > MAX_HEAVY_ATOMS);
}); // End of test 'builder (R-6b1)…'

test('builder (R-6b1): CARBONYL_POSITION, VALENCE and LOCANT_RANGE for the nitrile groups, each with its tiles', () => {
  const cases = [
    ['met ano di nitrilo', 'CARBONYL_POSITION', [2, 4], 'La cadena de 1 carbono solo tiene un extremo: lleva un solo grupo C≡N '
      + '(metanonitrilo).'],
    ['but ano tri nitrilo', 'CARBONYL_POSITION', [2, 4],
      'La cadena tiene dos extremos: con «nitrilo» lleva como mucho dos grupos C≡N, uno en cada extremo (butanodinitrilo).'],
    ['1 cloro prop ano nitrilo', 'VALENCE', [0, 1],
      'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: el grupo C≡N de «nitrilo» va en ese carbono.'],
    ['1 met il prop ano nitrilo', 'VALENCE', [0, 1],
      'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: el grupo C≡N de «nitrilo» va en ese carbono.'],
    ['1 cloro benzonitrilo', 'VALENCE', [0, 1],
      'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el benzonitrilo, ese carbono ya lleva un grupo C≡N.'],
    ['7 cloro benzonitrilo', 'LOCANT_RANGE', [0, 1], 'El anillo del benzonitrilo tiene 6 carbonos, del 1 al 6: no hay carbono 7.'],
    ['ciclo hex ano 7 carbonitrilo', 'LOCANT_RANGE', [3, 4], 'El anillo de 6 carbonos va del 1 al 6: no hay carbono 7.'],
    ['2 2 di ciano met ano nitrilo', 'LOCANT_RANGE', [0, 1], 'La cadena de 1 carbono solo tiene el carbono 1: no hay carbono 2.'],
    // Below an acid any number of `ciano` is named (`ácido 2,2,2-tricianoetanoico`), as many as the carbon takes.
    ['ácido 2 2 2 2 tetra ciano et ano oico', 'VALENCE', [4, 5], 'El carbono 2 tendría 5 enlaces, y un carbono solo puede tener 4.'],
  ];
  for (const [words, code, tiles, message] of cases) {
    const verdict = read(words);
    assert.equal(verdict.kind, 'invalid', `${words}: ${verdict.message}`);
    assert.deepEqual([verdict.errors[0].code, [verdict.errors[0].from, verdict.errors[0].to]], [code, tiles], words);
    assert.equal(verdict.message, message, words);
  }
  // A –C≡N on a carbon with a double bond to the chain is no room: VALENCE on the bond's locant.
  assert.equal(read('prop 1 eno nitrilo').errors[0].code, 'VALENCE');
}); // End of test 'builder (R-6b1): CARBONYL_POSITION…'

// ---------------------------------------------------------------------------
// readName(): verdicts, search, out-of-scope nitriles.
// ---------------------------------------------------------------------------

/**
 * readName() cases: tile words or a name, the verdict, the engine's name
 * and the SMILES of the molecule drawn.
 */
const CASES = Object.freeze([
  ['etanonitrilo', 'correct', 'etanonitrilo', 'CC#N'],
  ['butanonitrilo', 'correct', 'butanonitrilo', 'CCCC#N'],
  ['butanodinitrilo', 'correct', 'butanodinitrilo', 'N#CCCC#N'],
  ['2-metilpropanonitrilo', 'correct', '2-metilpropanonitrilo', 'CC(C)C#N'],
  ['prop-2-enonitrilo', 'correct', 'prop-2-enonitrilo', 'C=CC#N'],
  ['metanonitrilo', 'correct', 'metanonitrilo', 'C#N'],
  ['4-oxopentanonitrilo', 'correct', '4-oxopentanonitrilo', 'CC(=O)CCC#N'],
  ['ciclohexanocarbonitrilo', 'correct', 'ciclohexanocarbonitrilo', 'N#CC1CCCCC1'],
  ['ciclohexano-1,4-dicarbonitrilo', 'correct', 'ciclohexano-1,4-dicarbonitrilo', 'N#CC1CCC(C#N)CC1'],
  ['benceno-1,4-dicarbonitrilo', 'correct', 'benceno-1,4-dicarbonitrilo', 'N#CC1=CC=C(C#N)C=C1'],
  ['benzonitrilo', 'correct', 'benzonitrilo', 'N#CC1=CC=CC=C1'],
  ['bencenocarbonitrilo', 'alternative', 'benzonitrilo', 'N#CC1=CC=CC=C1'],
  ['4-metilbenzonitrilo', 'correct', '4-metilbenzonitrilo', 'N#CC1=CC=C(C)C=C1'],
  ['p-metilbenzonitrilo', 'alternative', '4-metilbenzonitrilo', 'N#CC1=CC=C(C)C=C1'],
  ['4-(cianometil)ciclohexano-1-carbonitrilo', 'correct', '4-(cianometil)ciclohexano-1-carbonitrilo', 'N#CCC1CCC(C#N)CC1'],
  ['ácido 3-cianopropanoico', 'correct', 'ácido 3-cianopropanoico', 'N#CCCC(=O)O'],
  ['ácido 4-cianobenzoico', 'correct', 'ácido 4-cianobenzoico', 'OC(=O)C1=CC=C(C#N)C=C1'],
  ['2-cianoetanoato de metilo', 'correct', '2-cianoetanoato de metilo', 'N#CCC(=O)OC'],
  ['etanoato de cianometilo', 'correct', 'etanoato de cianometilo', 'CC(=O)OCC#N'],
  ['acetato de cianometilo', 'alternative', 'etanoato de cianometilo', 'CC(=O)OCC#N'],
  // Left-out locants (search.js).
  ['met il prop ano nitrilo', 'missingLocants', '2-metilpropanonitrilo', 'CC(C)C#N'],
  ['cloro et ano nitrilo', 'missingLocants', '2-cloroetanonitrilo', 'ClCC#N'],
  ['4 met il benceno carbonitrilo', 'missingLocants', '4-metilbenzonitrilo', 'N#CC1=CC=C(C)C=C1'],
  ['2 met il ciclo hex ano carbonitrilo', 'missingLocants', '2-metilciclohexano-1-carbonitrilo', 'N#CC1CCCCC1C'],
  ['ácido ciano et ano oico', 'missingLocants', 'ácido 2-cianoetanoico', 'N#CCC(=O)O'],
  // `otherName`: the molecule the name describes.
  ['2-butenonitrilo', 'otherName', 'but-2-enonitrilo', 'CC=CC#N'],
  ['4-metilbutanonitrilo', 'otherName', 'pentanonitrilo', 'CCCCC#N'],
  ['propano-1-carbonitrilo', 'otherName', 'butanonitrilo', 'CCCC#N'],
  ['cianometano', 'otherName', 'etanonitrilo', 'CC#N'],
  ['cianobenceno', 'otherName', 'benzonitrilo', 'N#CC1=CC=CC=C1'],
  ['4-cianobutanonitrilo', 'otherName', 'pentanodinitrilo', 'N#CCCCC#N'],
  ['3-carboxipropanonitrilo', 'otherName', 'ácido 3-cianopropanoico', 'N#CCCC(=O)O'],
]);

test('readName (R-6b1): verdicts and the molecule each name describes, against a SMILES', () => {
  for (const [name, kind, engine, smiles] of CASES) {
    const verdict = read(name);
    assert.equal(verdict.kind, kind, `${name}: ${verdict.message}`);
    assert.equal(verdict.name, engine, name);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${name} builds another graph`);
    assert.equal(verdict.draw, true);
  }
  assert.equal(read('met il prop ano nitrilo').message, 'Casi: faltan los números. Se escribe «2-metilpropanonitrilo».');
  assert.equal(read('etanonitrilo').message, '¡Correcto! También se llama «acetonitrilo» (nombre tradicional, que la IUPAC (2013) '
    + 'conserva como preferido).');
  assert.equal(read('2-butenonitrilo').notes[0], 'Es la forma antigua de escribirlo; hoy se escribe «but-2-enonitrilo».');
  // The suffix groups of the verdict, carried onto the drawn graph: the –C≡N's carbon and its N.
  const verdict = read('ciclohexano-1,4-dicarbonitrilo');
  assert.deepEqual(verdict.suffixAtoms.map((g) => [verdict.molecule.atoms.get(g.carbon).element,
    verdict.molecule.atoms.get(g.attachment).element, verdict.molecule.bonds.get(g.bond).order]), [['C', 'N', 3], ['C', 'N', 3]]);
  assert.ok(verdict.suffixAtoms.every((g) => verdict.studentParent.atoms.includes(g.parentAtom)));
}); // End of test 'readName (R-6b1): verdicts…'

test('search (R-6b1): left-out locants give ambiguous lists; the budget gives incomplete; out-of-scope nitriles', () => {
  const ambiguous = [
    ['met il but ano nitrilo', 'Faltan números: puede ser 2-metilbutanonitrilo o 3-metilbutanonitrilo.'],
    ['ciclo hex ano di carbonitrilo', 'Faltan números: puede ser ciclohexano-1,1-dicarbonitrilo, ciclohexano-1,2-dicarbonitrilo, '
      + 'ciclohexano-1,3-dicarbonitrilo u otra molécula.'],
    ['met il benzonitrilo', 'Faltan números: puede ser 2-metilbenzonitrilo, 3-metilbenzonitrilo o 4-metilbenzonitrilo.'],
    ['ácido ciano prop ano oico', 'Faltan números: puede ser ácido 2-cianopropanoico o ácido 3-cianopropanoico.'],
  ];
  for (const [words, message] of ambiguous) {
    const verdict = read(words);
    assert.deepEqual([verdict.kind, verdict.message], ['ambiguous', message], words);
  }
  assert.equal(read('ciclo dodec ano hexa carbonitrilo', { budget: { placements: 1 } }).kind, 'incomplete');
  assert.equal(read('met il ciclo hex ano carbonitrilo', { budget: { namings: 1 } }).kind, 'incomplete');
  // The engine's refusals: more than two –C≡N on one carbon piece (manyNitriles), a –C≡N on an acid's carbon (carbonocyanidic).
  const lead = 'Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar: ';
  for (const [words, start] of [['prop ano 1 2 3 tri carbonitrilo', 'Esta molécula tiene más de dos grupos –C≡N (nitrilo)'],
    ['2 START ciano met il END but ano di nitrilo', 'Esta molécula tiene más de dos grupos –C≡N (nitrilo)'],
    ['ácido ciano met ano oico', 'Esta molécula tiene un grupo –C≡N (nitrilo) unido directamente al carbono'],
    ['ciano met ano oato met ilo', 'Esta molécula tiene un grupo –C≡N (nitrilo) unido directamente al carbono']]) {
    const refused = read(words);
    assert.equal(refused.kind, 'outOfScope', `${words}: ${refused.message}`);
    assert.ok(refused.message.startsWith(`${lead}${start}`), refused.message);
    assert.equal(refused.draw, false);
  }
  // A ring group beside a side chain's principal group, and two rings bonded together: the engine's refusals too.
  assert.equal(read('ácido 2 START 4 ciano fenil END et ano oico').kind, 'outOfScope');
  assert.equal(read('4 fenil benzonitrilo').kind, 'outOfScope');
}); // End of test 'search (R-6b1)…'

// ---------------------------------------------------------------------------
// Mutations and the diagnosis.
// ---------------------------------------------------------------------------

/**
 * Mutations of nitrile names (design.md §15.7): tile words, the verdict and
 * the diagnosis code of a rule that holds for a nitrile name (the nitrile's
 * own mistakes are the deliberate nulls of the next test).
 */
const MUTATIONS = Object.freeze([
  ['4 met il but ano nitrilo', 'otherName', 'BRANCH_AT_END'],
  ['2 et il prop ano nitrilo', 'otherName', 'LONGER_CHAIN'],
  ['4 met il hex ano di nitrilo', 'otherName', 'NUMBERING'],
  ['5 met il ciclo hex ano 1 carbonitrilo', 'otherName', 'RING_NUMBERING'],
  ['6 met il benzonitrilo', 'otherName', 'RING_NUMBERING'],
  ['3 met il 2 cloro but ano nitrilo', 'otherName', 'ALPHABETICAL_ORDER'],
  ['ácido 3 met il 2 ciano but ano oico', 'otherName', 'ALPHABETICAL_ORDER'], // `ciano` under c
  ['ácido 2 cloro 2 ciano et ano oico', 'otherName', 'ALPHABETICAL_ORDER'], // ciano before cloro: i before l
  ['2 met il 2 met il prop ano nitrilo', 'otherName', 'UNGROUPED'],
  ['ácido 2 ciano 2 ciano et ano oico', 'otherName', 'UNGROUPED'],
  ['2 2 bis met il prop ano nitrilo', 'otherName', 'MULTIPLIER_KIND'],
  ['3 2 di met il but ano nitrilo', 'otherName', 'LOCANT_ORDER'],
  ['ciclo hex ano 4 1 di carbonitrilo', 'otherName', 'LOCANT_ORDER'],
  ['2 but eno nitrilo', 'otherName', 'OLD_STYLE'],
  ['ciclo hex 1 3 5 tri eno carbonitrilo', 'otherName', 'BENZENE_RING'],
  ['2 START 5 met il fenil END et ano nitrilo', 'otherName', 'BRANCH_RING_NUMBERING'],
  ['2 et ano oil pent ano nitrilo', 'otherName', 'ACYL_NAME'],
  ['ácido 3 START 1 ciano met il END hex ano oico', 'otherName', 'NEEDLESS_LOCANTS'],
  // Other verdicts.
  ['but ano nitrilo', 'correct', null],
  ['met il but ano nitrilo', 'ambiguous', null],
  ['met il prop ano nitrilo', 'missingLocants', null],
]);

test('mutations (R-6b1): the expected verdict, and the diagnosis of every rule that holds for a nitrile name', () => {
  for (const [words, kind, code] of MUTATIONS) {
    const verdict = read(words);
    assert.equal(verdict.kind, kind, `${words}: ${verdict.message}`);
    if (kind !== 'otherName') {
      continue;
    }
    assert.equal(verdict.diagnosis ? verdict.diagnosis.code : null, code, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(!/undefined|null|NaN|\[object|grupo –OH|grupos –OH|–CHO|C=O/.test(verdict.diagnosis.message), words);
    const opened = diagnosisExplanation(verdict, explain);
    const { step } = verdict.diagnosis;
    assert.ok(opened.index >= 0 && [step, ...STEP_FALLBACKS[step]].includes(opened.steps[opened.index].id), words);
  } // End of the loop over the mutations
  const messages = {
    '4 met il but ano nitrilo': 'La rama «metil» está en el extremo de la cadena, así que la alarga: la cadena principal tiene 5 '
      + 'carbonos.',
    '2 et il prop ano nitrilo': 'Hay una cadena más larga que la tuya: la tuya tiene 3 carbonos y la cadena principal tiene 4.',
    '6 met il benzonitrilo': 'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: los '
      + 'sustituyentes tienen que llevar los números más bajos (2 en vez de 6).',
    'ácido 2 cloro 2 ciano et ano oico': 'Los sustituyentes se escriben por orden alfabético: «ciano» va antes que «cloro» (i antes que '
      + 'l).',
    '2 but eno nitrilo': 'Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, justo delante de «eno» o '
      + '«ino»: «but-2-enonitrilo».',
    'ciclo hex 1 3 5 tri eno carbonitrilo': 'Un anillo de 6 carbonos con tres enlaces dobles alternados, uno sí y uno no, es el '
      + 'benceno, y tiene nombre propio: «benceno». Se escribe «benzonitrilo».',
  };
  for (const [words, message] of Object.entries(messages)) {
    assert.equal(read(words).diagnosis.message, message, words);
  }
  // A `ciano` on an end of the chain never lengthens it (diagnose.js isHeteroGroup()): with the acid's other mistake, that is
  // the one named, never BRANCH_AT_END.
  assert.equal(read('ácido 4 ciano 3 met il but ano oico').kind, 'correct');
  assert.equal(read('ácido 3 met il 4 ciano but ano oico').diagnosis.code, 'ALPHABETICAL_ORDER');
}); // End of test 'mutations (R-6b1)…'

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
 * The category of a nitrile's own mistake, read independently of diagnose.js
 * from the engine's naming and the student's reading (diagnose.js «Nitriles»:
 * deliberate nulls until phase I-52b3): `seniority` — the student's suffix
 * cites no –C≡N while the engine's principal group is one (a junior group's
 * suffix or none: `cianometano`), or cites one while the engine's principal
 * group is senior (`3-carboxipropanonitrilo`); `count` — the student's
 * nitrile suffix cites another number of –C≡N groups (`4-cianobutanonitrilo`);
 * `carbon` — the –C≡N's carbon on the other side of the parent
 * (`propano-1-carbonitrilo`, `ciclohexilmetanonitrilo`); `numbering` — the
 * same –C≡N groups numbered otherwise (N0: `ciclohexano-1,5-dicarbonitrilo`);
 * `suffix` — the suffix's locants, which the engine leaves out
 * (`ciclohexano-1-carbonitrilo`); `parent` — the –C≡N groups choose another
 * parent: the student's is a ring and the engine's a chain or the reverse
 * (`RINGCHAIN`, principalParent()), or no chain the engine's P0 keeps
 * contains the student's (chainDropped(), fewerPrincipalGroups()). Null when
 * none applies or neither name is a nitrile's.
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} verdict - Its `otherName` verdict.
 * @returns {string|null} The category.
 */
function nitrileCategory(ids, verdict) {
  const engine = verdict.naming.structure.suffix;
  const mine = (verdict.suffixAtoms || []).filter((g) => verdict.molecule.atoms.get(g.attachment).element === 'N');
  if (!engine || engine.kind !== 'nitrile') {
    return mine.length > 0 ? 'seniority' : null;
  }
  if (mine.length === 0) {
    return 'seniority';
  }
  if (mine.length !== engine.locants.length) {
    return 'count';
  }
  if (mine.some((g) => g.carbon !== undefined) !== Boolean(engine.outside)) {
    return 'carbon';
  }
  if (sameSet(mine.map((g) => g.parentAtom), engine.locants.map((site) => site.atom))
    && !sameSet(mine.map((g) => g.locant), engine.locants.map((site) => site.locant))) {
    return 'numbering';
  }
  const { tree } = parse(ids);
  if (tree.parent.suffix && tree.parent.suffix.locants.length > 0) {
    const bare = assemble({ ...tree, parent: { ...tree.parent, suffix: { ...tree.parent.suffix, locants: [] } } }).text;
    if ([verdict.naming.name, ...verdict.naming.alternatives.map((alt) => alt.name)].includes(bare)) {
      return 'suffix';
    }
  }
  const chain = tree.parent.chain;
  const studentRing = chain.type === 'benzene' || chain.type === 'template' || (chain.type === 'chain' && chain.ring !== null);
  if (studentRing !== (verdict.naming.structure.parentKind === 'ring')) {
    return 'parent';
  }
  const student = verdict.studentParent.atoms;
  const p0 = verdict.naming.trace.find((step) => step.rule === 'P0');
  return !studentRing && p0 && !p0.survivors.some((c) => student.every((id) => c.atoms.includes(id))) ? 'parent' : null;
} // End of function nitrileCategory()

test('the deliberate nulls of R-6b1 (diagnose.js «Nitriles»): each category, read independently, gets no diagnosis', () => {
  const cases = [
    // [tile words, category]
    ['ciano met ano', 'seniority'],
    ['1 ciano prop ano', 'seniority'],
    ['ciano benceno', 'seniority'],
    ['4 ciano but an 2 ona', 'seniority'],
    ['3 carboxi prop ano nitrilo', 'seniority'],
    ['4 ciano but ano nitrilo', 'count'],
    ['3 ciano 2 cloro prop ano nitrilo', 'count'],
    ['prop ano 1 carbonitrilo', 'carbon'],
    ['ciclo hex il met ano nitrilo', 'carbon'],
    ['fenil met ano nitrilo', 'carbon'],
    ['ciclo hex ano 1 5 di carbonitrilo', 'numbering'],
    ['benceno 1 5 di carbonitrilo', 'numbering'],
    ['ciclo hex ano 1 carbonitrilo', 'suffix'],
    ['benceno 1 carbonitrilo', 'suffix'],
  ];
  for (const [words, category] of cases) {
    const ids = seq(words.replace('an 2', 'ano 2'));
    const verdict = readName(ids);
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    assert.equal(nitrileCategory(ids, verdict), category, words);
    assert.equal(verdict.diagnosis, null, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(verdict.draw && verdict.molecule, words);
  } // End of the loop over the deliberate nulls
  // With the suffix's locant left out, every placement of one molecule is a reading of the name (search.js, diagnose()); one on
  // which the –C≡N is numbered otherwise is the nitrile's own mistake (N0), so the diagnosis is null, where an acid's names the
  // other mistake (LOCANT_ORDER, RING_NUMBERING) until phase I-52b3 words the N0 of the –C≡N groups.
  for (const words of ['5 2 di met il benceno carbonitrilo', '3 6 di met il oxi benceno carbonitrilo']) {
    const verdict = read(words);
    assert.deepEqual([verdict.kind, verdict.diagnosis], ['otherName', null], words);
  }
  assert.deepEqual(['ácido 5 2 di met il benceno carboxílico', 'ácido 3 6 di met il oxi benceno carboxílico']
    .map((words) => read(words).diagnosis.code), ['LOCANT_ORDER', 'RING_NUMBERING']);
}); // End of test 'the deliberate nulls of R-6b1…'

// ---------------------------------------------------------------------------
// Fixture round trip and closed loop (design.md §15.7).
// ---------------------------------------------------------------------------

test('fixture round trip (R-6b1): every nitrile name the tiles write, read back; graph compared with the SMILES; later names never tokenize', async () => {
  const fixtures = await readFixtures();
  const rows = fixtures.filter((row) => /C#N|N#C/.test(row.smiles));
  let covered = 0;
  let later = 0;
  let laterRows = 0;
  let elapsed = 0;
  const readRows = new Set();
  for (const row of rows) {
    if (!isNitrile(row.smiles)) {
      laterRows += 1; // An amine or an amide beside the nitrile (R-6c, R-6d).
      row.names.forEach((name) => assert.equal(tokenize(name), null, `names.tsv:${row.line}: ${name} reads before its phase`));
      continue;
    }
    const expected = keyOf(row.smiles);
    for (const name of row.names) {
      if (!isNitrileName(name)) {
        later += 1; // A retained nitrile name (I-52b2).
        assert.equal(tokenize(name), null, `names.tsv:${row.line}: ${name} reads before its phase`);
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
      readRows.add(row);
    } // End of the loop over the names of a row
  } // End of the loop over the fixture rows
  /**
   * How many rows read of a fixture section.
   *
   * @param {string} id - The section's phase id (`I-38`…).
   * @returns {number} The count.
   */
  const inSection = (id) => [...readRows].filter((row) => /\((I-\d+[a-z]?)[),:]/.exec(row.section)[1] === id).length; // Its own id only.
  assert.equal(rows.length, EXPECTED_ROWS.total);
  assert.equal(readRows.size, EXPECTED_ROWS.read);
  assert.equal(laterRows, EXPECTED_ROWS.later);
  assert.deepEqual(['I-38', 'I-39a', 'I-39b', 'I-39c', 'I-40c', 'I-40d', 'I-43b', 'I-44', 'I-45a', 'I-45b'].map(inSection),
    [EXPECTED_ROWS.i38, EXPECTED_ROWS.i39a, EXPECTED_ROWS.i39b, EXPECTED_ROWS.i39c, EXPECTED_ROWS.i40c, EXPECTED_ROWS.i40d,
      EXPECTED_ROWS.i43b, EXPECTED_ROWS.i44, EXPECTED_ROWS.i45a, EXPECTED_ROWS.i45b]);
  assert.equal(covered, EXPECTED_NAMES);
  assert.equal(later, EXPECTED_LATER_NAMES);
  assert.ok(elapsed / covered < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / covered).toFixed(2)} ms on average`);
}); // End of test 'fixture round trip (R-6b1)…'

/** The closed loop's generators (scripts/oracle/generate.mjs; design.md §15.7), nitrile molecules only. */
const LOOP = Object.freeze({
  nitriles: Object.freeze({ count: 500, seed: 6201, maxSize: 12 }),
  cyano: Object.freeze({ count: 500, seed: 6202, maxSize: 12 }),
  ringNitriles: Object.freeze({ count: 400, seed: 6203, maxSize: 12 }),
  outside: Object.freeze({ count: 300, seed: 6204, minSize: 6, maxSize: 12 }),
  polysuffix: Object.freeze({ count: 300, seed: 6205, minSize: 6, maxSize: 12 }),
  phenyls: Object.freeze({ count: 300, seed: 6206, maxSize: 12 }),
  benzoyls: Object.freeze({ count: 200, seed: 6207 }),
  acyl: Object.freeze({ count: 300, seed: 6208, maxSize: 12 }),
});

/**
 * Minimum coverage of the closed loop: nitrile molecules (distinct by
 * aromatic key), names read back, the forms among them (names ending in
 * `nitrilo` other than `carbonitrilo` and `benzonitrilo`, `carbonitrilo`,
 * `benzonitrilo`, names with `ciano`), removed-locant mutations and decisive
 * verdicts among them (the seeds give 1224, 1360, 694, 187, 65, 471, 2797
 * and 2796: one removal runs out of budget, `incomplete`).
 */
const LOOP_MIN = Object.freeze({
  molecules: 1200, names: 1340, nitrilo: 680, carbonitrilo: 180, benzonitrilo: 60, ciano: 460, removed: 2770, decisive: 2770,
});

/**
 * The retained nitrile names among the closed loop's names, left for phase
 * I-52b2 (`acetonitrilo`, `fenilacetonitrilo`, `2-(4-metilfenil)acetonitrilo`,
 * the ftalonitrilos: LATER_NITRILE_WORDS): the seeds give 15, none of which
 * tokenizes.
 */
const LOOP_LATER = 15;

/**
 * The closed loop's molecules: the nitriles of the generators, distinct by
 * aromatic key, that the engine names.
 *
 * @returns {object[]} The molecules.
 */
function loopMolecules() {
  const seen = new Set();
  const molecules = [];
  const all = [...generateNitriles(LOOP.nitriles), ...generateCyano(LOOP.cyano), ...generateRingNitrilesAmides(LOOP.ringNitriles),
    ...generateRingOutsideBenzenes(LOOP.outside), ...generateRingPolysuffixBenzenes(LOOP.polysuffix),
    ...generateSubstitutedPhenyls(LOOP.phenyls), ...generateSubstitutedBenzoyls(LOOP.benzoyls), ...generateAcyl(LOOP.acyl)];
  for (const mol of all.filter(isNitrileMolecule)) {
    const key = aromaticKey(mol);
    if (!seen.has(key) && nameMolecule(mol).ok) {
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
  return lists;
} // End of function locantLists()

test('closed loop over the nitrile generators: engine name → tiles → readName() → the same graph, then without each locant list', () => {
  const molecules = loopMolecules();
  const counts = { names: 0, nitrilo: 0, carbonitrilo: 0, benzonitrilo: 0, ciano: 0, removed: 0, decisive: 0 };
  const later = [];
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    const key = aromaticKey(mol);
    const all = [naming.name, ...naming.alternatives.map((alt) => alt.name)];
    for (const [i, name] of all.entries()) {
      if (!isNitrileName(name)) {
        later.push(name); // A retained nitrile name (I-52b2).
        assert.equal(tokenize(name), null, name);
        continue;
      }
      const ids = tokenize(name);
      assert.ok(ids, `no tiles for ${name}`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, i === 0 ? 'correct' : 'alternative', `${name}: ${verdict.message}`);
      assert.equal(verdict.name, naming.name);
      assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
      counts.names += 1;
      counts.nitrilo += /nitrilo$/.test(name) && !/(?:carbo|benzo)nitrilo$/.test(name) ? 1 : 0;
      counts.carbonitrilo += /carbonitrilo$/.test(name) ? 1 : 0;
      counts.benzonitrilo += /benzonitrilo$/.test(name) ? 1 : 0;
      counts.ciano += /ciano/.test(name) ? 1 : 0;
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
  const report = JSON.stringify({ molecules: molecules.length, ...counts, later: later.length });
  assert.ok(molecules.length >= LOOP_MIN.molecules, report);
  assert.equal(later.length, LOOP_LATER, report);
  assert.ok(later.every((name) => LATER_NITRILE_WORDS.some((word) => name.includes(word))), report);
  for (const field of Object.keys(counts)) {
    assert.ok(counts[field] >= LOOP_MIN[field], `${field}: ${report}`);
  }
}); // End of test 'closed loop over the nitrile generators…'

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
 * halogen, `hidroxi`, `oxo`, an alkoxy prefix) or `ciano`, whose carbon is
 * never a chain's: moved to an end, it never lengthens the chain.
 *
 * @param {object[]} tiles - The parsed tiles.
 * @param {object} node - A substituent node (parse.js).
 * @returns {boolean} True for such a group.
 */
function isHeteroNode(tiles, node) {
  const core = node.type === 'branch' ? node.chain : node;
  return ['halogen', 'hydroxy', 'carbonyl'].includes(node.type) || Boolean(core && core.oxi !== null && core.oxi !== undefined)
    || (node.type === 'retained' && tiles[node.tile].id === CYANO_ID);
}

/** The diagnosis codes an `otherName` of each mutation family may give (the trace's own rule for a new molecule). */
const FAMILY_CODES = Object.freeze({
  reversed: ['NUMBERING'],
  // A chain with `nitrilo` keeps its –C≡N at carbon 1: renumbered from the other end, its prefixes move, so the name describes
  // another molecule, whose chain the trace may choose otherwise.
  shifted: ['NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS',
    'ETHER_SIDE'],
  reflected: ['RING_NUMBERING'],
  rotated: ['RING_NUMBERING'],
  swapped: ['NUMBERING', 'RING_NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS',
    'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS', 'ETHER_SIDE'],
  unsorted: ['ALPHABETICAL_ORDER'],
  ungrouped: ['UNGROUPED'],
  diBis: ['MULTIPLIER_KIND'],
  toEnd: ['BRANCH_AT_END', 'NUMBERING'],
  heteroToEnd: ['NUMBERING', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS'],
  removed: [],
  added: ['NEEDLESS_LOCANTS', 'NUMBERING', 'RING_NUMBERING'],
});

/**
 * The mutations of one nitrile name: renumbered (on a chain with `nitrilo`,
 * whose –C≡N stays at carbon 1, `shifted`; `reversed` on another chain;
 * reflected and rotated on a ring, the suffix's locants too), locants swapped
 * between two prefixes, prefixes in reverse order (after `ácido`), identical
 * prefixes written one by one, di ↔ bis, a single-locant prefix moved to an
 * end of a chain (a carbon branch: BRANCH_AT_END; `ciano`, an `oxo`, a
 * halogen, `hidroxi` or an alkoxy prefix: another molecule), a prefix's
 * locants removed, or added (1… and 2…) where it has none. An ester's O-bound
 * side stays as it is, after the parent.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {{family: string, ids: string[]}[]} The mutations.
 */
function mutationsOf(ids) {
  const { tree } = parse(ids);
  const { tiles, items } = tree;
  const parent = tree.parent.chain;
  const ring = parent.type === 'chain' ? parent.ring !== null : true;
  const n = (parent.type === 'chain' && tiles[parent.root].value) || 6;
  const segments = parent.type === 'chain' ? parent.segments : [];
  const suffix = tree.parent.suffix ? tree.parent.suffix.locants : [];
  const lead = tree.suffixClass ? tree.suffixClass.range[1] : 0; // `ácido` stays first.
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
  const terminal = isTerminalSuffix(tiles, tree.parent.suffix) || (tree.parent.suffix === null && parent.type === 'template');
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
  const single = items.filter((item) => item.locants.length === 1);
  single.forEach((a, i) => single.slice(i + 1).forEach((b) => {
    const swapped = [...ids];
    [swapped[a.locants[0]], swapped[b.locants[0]]] = [ids[b.locants[0]], ids[a.locants[0]]];
    push('swapped', swapped);
  }));
  if (items.length >= 2) {
    const slices = items.map((item) => ids.slice(item.range[0], item.range[1]));
    push('unsorted', [...ids.slice(0, lead), ...slices.reverse().flat(), ...ids.slice(tree.parent.range[0])]);
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
  return out;
} // End of function mutationsOf()

/**
 * Reads every mutation of some nitrile names: every `otherName` either
 * carries a diagnosis of its family's codes whose step resolves in its
 * explanation, or is a nitrile's own mistake (nitrileCategory()), a
 * deliberate null of diagnose.js «Nitriles» until phase I-52b3, counted by
 * category; any other null is unexpected.
 *
 * @param {string[]} names - Nitrile names (engine names or alternatives).
 * @returns {{otherName: Object<string, number>, codes: Set<string>, nulls: Object<string, number>, unexpected: string[]}}
 *   `otherName` counts by family, the codes seen, the deliberate nulls by category and the unexpected nulls.
 */
function sweep(names) {
  const otherName = Object.fromEntries(Object.keys(FAMILY_CODES).map((family) => [family, 0]));
  const codes = new Set();
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
      const category = nitrileCategory(mutation.ids, verdict);
      const d = verdict.diagnosis;
      if (category) {
        nulls[category] = (nulls[category] || 0) + 1;
        assert.equal(d, null, `${label}: ${category}, ${d && d.message}`);
        continue;
      }
      if (!d) {
        unexpected.push(label);
        continue;
      }
      codes.add(d.code);
      assert.ok(FAMILY_CODES[mutation.family].includes(d.code), `${label}: ${d.code}, ${d.message}`);
      assert.ok(!/undefined|null|NaN|\[object|grupo –OH|grupos –OH|–CHO|C=O/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), label);
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return { otherName, codes, nulls, unexpected };
} // End of function sweep()

/**
 * How many mutations of the nitrile fixture names (the 75 the tiles write)
 * give `otherName`, by family (122), and the nitrile's own mistakes among them
 * by category: 72 `numbering`, a ring nitrile's –C≡N groups numbered
 * otherwise by a reflection or a rotation (`2-metilciclohexano-1-carbonitrilo`
 * rotated to `3-metilciclohexano-2-carbonitrilo`), deliberate nulls of
 * diagnose.js «Nitriles» until phase I-52b3 (N0). The other 50 are diagnosed
 * by the rules that hold for a nitrile name. Removing or adding locants never
 * gives `otherName`.
 */
const FIXTURE_OTHER_NAME = Object.freeze({
  reversed: 0, shifted: 4, reflected: 6, rotated: 91, swapped: 1, unsorted: 6, ungrouped: 3, diBis: 3, toEnd: 8, heteroToEnd: 0,
  removed: 0, added: 0,
});
const FIXTURE_NULLS = Object.freeze({ numbering: 72 });

test('mutations of every nitrile fixture name: a diagnosis of the family\'s codes, or a deliberate «Nitriles» null with its category', async () => {
  const names = (await readFixtures()).filter((row) => isNitrile(row.smiles)).flatMap((row) => row.names).filter(isNitrileName);
  assert.equal(names.length, EXPECTED_NAMES);
  const { otherName, codes, nulls, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  assert.deepEqual(otherName, { ...FIXTURE_OTHER_NAME });
  assert.deepEqual(nulls, { ...FIXTURE_NULLS });
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_SUBSTITUENTS', 'MULTIPLIER_KIND',
    'RING_NUMBERING', 'UNGROUPED']);
}); // End of test 'mutations of every nitrile fixture name…'

test('mutations of the generated nitriles: every otherName is diagnosed or a deliberate null, every step resolves', () => {
  const names = [];
  for (const mol of loopMolecules().filter((_, i) => i % 3 === 0)) { // Every generator's nitriles: chains, rings, benzenes.
    const naming = nameMolecule(mol);
    names.push(...[naming.name, ...naming.alternatives.map((alt) => alt.name)].filter(isNitrileName));
  }
  assert.ok(names.length >= 450, `${names.length} names`); // The seeds give 460.
  const { otherName, codes, nulls, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  const total = Object.values(otherName).reduce((sum, count) => sum + count, 0);
  // The seeds give 1149 `otherName`, 866 diagnosed and 283 the nitrile's own mistakes, a ring nitrile's –C≡N groups numbered
  // otherwise (`numbering`: deliberate nulls of diagnose.js «Nitriles» until phase I-52b3).
  assert.deepEqual([total, nulls], [1149, { numbering: 283 }]);
  assert.deepEqual([otherName.removed, otherName.added], [0, 0]);
  for (const code of ['NUMBERING', 'RING_NUMBERING', 'ALPHABETICAL_ORDER', 'UNGROUPED', 'MULTIPLIER_KIND', 'BRANCH_AT_END',
    'LONGER_CHAIN', 'MORE_SUBSTITUENTS', 'MORE_MULTIPLE_BONDS', 'CHAIN_LOCANTS']) {
    assert.ok(codes.has(code), `${code}: ${[...codes]}`);
  }
}); // End of test 'mutations of the generated nitriles…'

// ---------------------------------------------------------------------------
// The drawing, the dialog, robustness and time.
// ---------------------------------------------------------------------------

test('«Dibujar» (R-6b1): nitrile verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const name of ['butanonitrilo', 'butanodinitrilo', 'ciclohexanocarbonitrilo', 'ciclohexano-1,4-dicarbonitrilo', 'benzonitrilo',
    '4-metilbenzonitrilo', 'benceno-1,3,5-tricarbonitrilo', 'ácido 3-cianopropanoico', '4-(cianometil)ciclohexano-1-carbonitrilo',
    'etanoato de cianometilo', '2-butenonitrilo', 'cianometano']) {
    const verdict = read(name);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-6b1)…'

test('dialog (R-6b1): the nitrile tiles have tooltips', () => {
  for (const id of [CYANO_ID, NITRILO_ID, CARBONITRILE_ID, BENZONITRILE_ID]) {
    assert.ok(TILE_HINTS[id] && TILE_HINTS[id].endsWith('.'), id);
  }
  assert.match(TILE_HINTS[NITRILO_ID], /butanonitrilo; con dos, butanodinitrilo/);
  assert.match(TILE_HINTS[CARBONITRILE_ID], /ciclohexanocarbonitrilo/);
  assert.match(TILE_HINTS[CYANO_ID], /su carbono no cuenta en la cadena: ácido 3-cianopropanoico; en una rama, \(cianometil\)/);
  assert.equal(TILE_HINTS[BENZONITRILE_ID], 'Benceno con un grupo C≡N: bencenocarbonitrilo.');
}); // End of test 'dialog (R-6b1)…'

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

test('property (R-6b1): random nitrile names — any parent and suffix, locants or none, `ciano` anywhere — never crash', () => {
  const random = mulberry32(20261016);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const branches = ['ciano', 'met il', 'cloro', 'hidroxi', 'oxo', 'met il oxi', 'START ciano met il END', 'START 4 ciano fenil END',
    'acetil', 'fenil', 'ciclo hex il', 'carboxi'];
  const parents = ['met ano nitrilo', 'et ano nitrilo', 'but ano di nitrilo', 'pent ano nitrilo', 'prop 2 eno nitrilo',
    'ciclo hex ano carbonitrilo', 'ciclo hex ano 1 4 di carbonitrilo', 'benceno carbonitrilo', 'benceno 1 3 di carbonitrilo',
    'benzonitrilo', 'ciclo pent ano carbonitrilo', 'ácido but ano oico', 'prop ano oato met ilo', 'but ano al'];
  const multipliers = { 1: '', 2: 'di', 3: 'tri' };
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const prefixes = Array.from({ length: int(0, 2) }, () => {
      const count = int(1, 3);
      const located = random() < 0.6;
      const locants = located ? Array.from({ length: count }, () => int(1, 6)).join(' ') : '';
      return [locants, multipliers[count], pick(branches)].join(' ');
    });
    const parent = pick(parents);
    const words = parent.startsWith('ácido') ? `ácido ${prefixes.join(' ')} ${parent.slice(6)}` : [...prefixes, parent].join(' ');
    const verdict = readName(seq(words), { budget: { ms: 200 } });
    kinds.set(verdict.kind, (kinds.get(verdict.kind) || 0) + 1);
    if (verdict.draw) {
      assert.ok(verdict.molecule && verdict.name, words);
    } else {
      assert.equal(verdict.molecule === null || verdict.kind === 'outOfScope', true, words);
    }
    if (verdict.kind === 'otherName' && verdict.diagnosis) {
      assert.ok(!/undefined|null|NaN|\[object|grupo –OH|grupos –OH/.test(verdict.diagnosis.message), `${words}: ${verdict.diagnosis.message}`);
    }
  } // End of the loop over the random names
  for (const kind of ['correct', 'otherName', 'ambiguous', 'invalid']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-6b1): random nitrile names…'

test('time budget: nitrile readName() calls, with their diagnosis, well within budget', () => {
  const names = ['butanodinitrilo', 'ciclohexano-1,4-dicarbonitrilo', '4-(cianometil)ciclohexano-1-carbonitrilo', 'benzonitrilo',
    'ácido 3-cianopropanoico', '2-butenonitrilo', 'met il but ano nitrilo', 'met il ciclo hex ano carbonitrilo',
    'di met il benzonitrilo', '4 met il hex ano di nitrilo'];
  names.forEach((name) => read(name)); // Warm-up.
  for (const name of names) {
    const start = performance.now();
    const verdict = read(name);
    const ms = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', name);
    assert.ok(ms < PER_NAME_BUDGET_MS, `${name}: ${ms.toFixed(1)} ms`);
  }
}); // End of test 'time budget…'

// The ester rows with a `ciano` prefix read in both round trips (reverse-esters.test.js counts them apart).
test('the nitrile esters of the fixtures are esters of the ester round trip too', async () => {
  const rows = (await readFixtures()).filter((row) => isNitrile(row.smiles) && isEster(row.smiles, { nitrile: true }));
  assert.equal(rows.length, 6);
});
