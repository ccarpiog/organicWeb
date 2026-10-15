/**
 * @file Unit tests for the carboxylic acids in «¿Cómo se dibuja?»
 * (src/reverse/, design.md §15.5.2 item 6, §15.5.3, §15.7, §15.8 R-5d; phase
 * I-51d1, R-5d1): the «Grupos» row's class word `ácido` (the first word of
 * an acid's name, the space after it automatic), its suffixes `oico` (a
 * –COOH at the ends of a chain, by rule) and `carboxílico` (a –COOH whose
 * carbon is outside the parent), its prefix `carboxi` (a –COOH as a branch),
 * and the «Anillos» row's `benzoico`. Parser (the class word and the suffix
 * nodes, ACID_WORD and the misplaced tiles with their tile ranges, partial
 * names), assembler (every form checked against the forward engine's own
 * text), tokenizer (the later families' names never read; since phase
 * I-51d2 the retained acid names read, their own tests in
 * reverse-acid-templates.test.js, and the round trips, closed loop and
 * sweeps here count them apart), interpreter and
 * builder (the =O and the OH of each –COOH, the –COOH's own carbon,
 * CARBONYL_POSITION, VALENCE, LOCANT_RANGE, the caps), search (left-out
 * locants of `carboxílico` and of the prefixes; the budget), readName()
 * verdicts with the molecule each describes (compared by aromatic key with a
 * SMILES), out-of-scope acids, mutations and their diagnosis (the rules that
 * hold for an acid name; the acid's own mistakes, deliberate nulls of
 * diagnose.js «Acids» until phase I-51d3, each with its category read
 * independently and, since I-51d3, its code — the messages themselves are
 * tested in reverse-diagnose-acids.test.js), the fixture round trip over
 * every acid row of tests/fixtures/names.tsv (since phase I-52a2b with the
 * names with an ester prefix, whose own tests and sweeps are in
 * reverse-ester-prefixes.test.js), the closed loop over the oracle's acid
 * generators (pure imports, no Java), the diagnosis sweeps (no null left),
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
import {
  ACID_WORD_ID, OICO_ID, CARBOXYLIC_ID, BENZOIC_ID, CARBOXY_ID, tileById, isChainTemplate, templateLength,
} from '../../src/reverse/tiles.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { TILE_HINTS } from '../../src/ui/name-builder.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { MAX_HEAVY_ATOMS, TOO_MANY_ATOMS_MESSAGE } from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import {
  generateAcids, generateRingAcids, generateRingOutsideBenzenes, generateRingPolysuffixBenzenes, generateRingSubstituents,
  generateSubstitutedPhenyls, generateSubstitutedBenzoyls, generateEthers,
} from '../../scripts/oracle/generate.mjs';
import {
  seq, readFixtures, leafIndices, isAcid, isAcidMolecule, isAcidName, LATER_ACID_WORDS, ESTER_PREFIX, ACID_WORD, isAcidTemplateName,
} from './reverse-words.js';

/**
 * Acid fixture rows (isAcid(): carbons, halogens and oxygens, at least one
 * –COOH; no nitrogen), every one read back since phase R-6a2b, by section: 30
 * of I-33 (the acids' own section), 2 of I-34 (beside an ether), 20 of I-39b
 * (acyl prefixes), 23 of I-39c (7 with an ester written as `alcoxi` and `oxo`,
 * `ácido 4-metoxi-4-oxobutanoico`, and 16 with an ester prefix, R-6a2b), 30
 * of I-40b (ring acids), 6 of I-40d (5 with an ester prefix), 7 of I-43b
 * (benzoic acids with ring prefixes), 6 of I-44 (benzene polyacids), 2 of
 * I-45a, 10 of I-45b and 2 of I-45c (1 with an ester prefix). Until phase
 * R-6a2b, 116 rows (isAcidName(): no ester prefix).
 */
const EXPECTED_ROWS = Object.freeze({
  total: 138, read: 138, i33: 30, i34: 2, i39b: 20, i39c: 23, i40b: 30, i40d: 6, i43b: 7, i44: 6, i45a: 2, i45b: 10, i45c: 2,
});

/**
 * Their names and alternatives, read back: 146 the tiles write since phase R-5d2 (isAcidName(): the 136 of phase R-5d1 and the
 * 10 retained acid names — `ácido fórmico`, `ácido acético`, `ácido oxálico`, `ácido fenilacético`, `ácido
 * 2-(3-metilfenil)acético`, `ácido ftálico`, `ácido isoftálico`, `ácido tereftálico`, `ácido 4-metilftálico`, `ácido
 * 5-cloroisoftálico`) and, since phase R-6a2b, the 24 with an ester prefix (`acetiloxi`, `metoxicarbonil`…; ESTER_PREFIX,
 * swept apart in reverse-ester-prefixes.test.js); none left to later phases.
 */
const EXPECTED_NAMES = 146;
const EXPECTED_TEMPLATE_NAMES = 10;
const EXPECTED_PREFIX_NAMES = 24;
const EXPECTED_LATER_NAMES = Object.freeze({ retained: 0, ester: 0 });

/** Average time budget of one readName() call over the fixture round trip, in milliseconds (phones are slower). */
const AVERAGE_BUDGET_MS = 50;

/** Time budget of one representative readName() call, in milliseconds. */
const PER_NAME_BUDGET_MS = 250;

/**
 * The tile ids of a name: space-separated tile words (reverse-words.js) when
 * every word is a tile, else a name text read by the tokenizer (an acid's
 * name has a space after `ácido`).
 *
 * @param {string} name - Tile words or a name.
 * @returns {string[]} The tile ids.
 */
function idsOf(name) {
  let ids = null;
  try {
    ids = seq(name);
  } catch (err) {
    ids = null; // A name text: `ácido 2-metilpropanoico`.
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
 * The bond orders from each oxygen of a molecule to its neighbours, with
 * their elements, sorted (`C2`: double-bonded to a carbon).
 *
 * @param {object} mol - A molecule.
 * @returns {string[][]} Per oxygen, its bonds, the oxygens sorted.
 */
function oxygenBonds(mol) {
  const bonds = [...mol.bonds.values()];
  return [...mol.atoms].filter(([, atom]) => atom.element === 'O').map(([id]) => bonds
    .filter((bond) => bond.a === id || bond.b === id)
    .map((bond) => `${mol.atoms.get(bond.a === id ? bond.b : bond.a).element}${bond.order}`)
    .sort().join(' ')).sort();
}

// ---------------------------------------------------------------------------
// Parser.
// ---------------------------------------------------------------------------

test('parser (R-5d1): `ácido` first, the acid suffixes in the parent node, `benzoico` a whole word, `carboxi` a retained word', () => {
  // 0:ácido 1:2 2:met 3:il 4:prop 5:ano 6:oico
  let { tree, errors } = parse(seq('ácido 2 met il prop ano oico'));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.suffixClass, { type: 'suffixClass', tile: 0, range: [0, 1] });
  assert.deepEqual(tree.items.map((item) => item.range), [[1, 4]]);
  assert.deepEqual(tree.parent.suffix, { type: 'suffix', locants: [], multiplier: null, tile: 6, range: [6, 7] });
  assert.ok(isTerminalSuffix(tree.tiles, tree.parent.suffix), '`oico` is terminal by rule, as `al`');
  ({ tree, errors } = parse(seq('ácido ciclo hex ano 1 4 di carboxílico')));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.parent.suffix, { type: 'suffix', locants: [4, 5], multiplier: 6, tile: 7, range: [4, 8] });
  assert.ok(!isTerminalSuffix(tree.tiles, tree.parent.suffix));
  ({ tree, errors } = parse(seq('ácido 4 met il benzoico')));
  assert.deepEqual(errors, []);
  assert.deepEqual([tree.parent.chain, tree.parent.suffix], [{ type: 'benzene', tile: 4, range: [4, 5] }, null]);
  ({ tree, errors } = parse(seq('ácido 2 START carboxi met il END but ano di oico')));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.items[0].substituent.items[0].substituent, { type: 'retained', tile: 3, oxi: null, range: [3, 4] });
  // Old style: `ácido 2-butenoico` gives its locant to the segment (`oico` has no list to leave open); `1,4-…dicarboxílico` to the
  // suffix.
  ({ tree } = parse(seq('ácido 2 but eno oico')));
  assert.deepEqual([tree.parent.legacySegment, tree.parent.legacySuffix], [0, false]);
  ({ tree } = parse(seq('ácido 1 4 ciclo hex ano di carboxílico')));
  assert.deepEqual([tree.parent.legacySegment, tree.parent.legacySuffix], [null, true]);
  // Lossless: every tile once, in order, the class word first.
  for (const words of ['ácido 2 met il prop ano oico', 'ácido 4 met il benzoico', 'ácido 2 START 3 met il fenil END prop ano oico',
    'ácido but ano al', 'but ano oico', 'ácido', 'ácido 2 met il', '2 met il ácido prop ano oico', 'ácido but ano oico ácido']) {
    assert.deepEqual(leafIndices(parse(seq(words)).tree), seq(words).map((_, i) => i), words);
  }
  // Partial names assemble too; the space after `ácido` only when something follows it.
  assert.equal(text('ácido'), 'ácido');
  assert.equal(text('ácido but'), 'ácido but');
  assert.equal(text('ácido 2 met il'), 'ácido 2-metil');
  assert.equal(text('ácido but ano 1 4 di'), 'ácido butano-1,4-di');
}); // End of test 'parser (R-5d1)…'

test('parser (R-5d1): ACID_WORD, and misplaced acid tiles, are errors with their tile ranges and hints', () => {
  const cases = [
    ['but ano oico', ['ACID_WORD[2,3)']],
    ['ciclo hex ano carboxílico', ['ACID_WORD[3,4)']],
    ['benzoico', ['ACID_WORD[0,1)']],
    ['4 met il benzoico', ['ACID_WORD[3,4)']],
    ['ácido but ano al', ['ACID_WORD[0,1)']],
    ['ácido but ano', ['ACID_WORD[0,1)']],
    ['ácido benceno', ['ACID_WORD[0,1)']],
    ['ácido et il met il éter', ['ACID_WORD[0,1)']],
    ['ácido', ['NO_PARENT[1,1)']],
    ['ácido 2 met il', ['ENDS_WITH_BRANCH[1,4)']],
    ['2 met il ácido prop ano oico', ['TILE_ORDER[3,4)']],
    ['ácido but ano oico ácido', ['TILE_ORDER[4,5)']],
    ['ácido ácido but ano oico', ['TILE_ORDER[1,2)']],
    ['ácido START ácido met il END but ano oico', ['TILE_ORDER[2,3)']],
    ['ácido ciclo hex ano oico', ['TILE_ORDER[4,5)']],
    ['ácido benceno oico', ['TILE_ORDER[2,3)']],
    ['ácido but ano 1 oico', ['TILE_ORDER[3,4)']],
    ['ácido but ano 1 4 di oico', ['TILE_ORDER[3,5)']],
    ['ácido 1 but ano oico', ['TILE_ORDER[1,2)']],
    ['ácido but ano 1 4 bis oico', ['TILE_ORDER[3,5)', 'TILE_ORDER[5,6)']],
    ['ácido ciclo hex ano 1 4 bis carboxílico', ['TILE_ORDER[6,7)']],
    ['ácido ciclo hex ano 1 4 carboxílico', ['LOCANT_COUNT[4,6)']],
    ['oico met ano', ['TILE_ORDER[0,1)']],
    ['carboxílico ciclo hex ano', ['TILE_ORDER[0,1)']],
    ['ácido START 2 met il pent ano oico END hex ano oico', ['TILE_ORDER[7,8)']], // `oico` in a branch
    ['ácido 1 benzoico', ['TEMPLATE_LOCANTS[1,2)']],
    ['ácido p benzoico', ['TEMPLATE_LOCANTS[1,2)']],
    ['ácido di benzoico', ['TILE_ORDER[1,2)']],
    ['ácido benzoico oico', ['TILE_ORDER[2,3)']],
    ['ácido START benzoico END met ano oico', ['TILE_ORDER[2,3)']],
    ['carboxi oxi met ano', ['TILE_ORDER[1,2)']],
    ['carboxi met il éter', ['TILE_ORDER[0,1)']],
    ['2 carboxi', ['ENDS_WITH_BRANCH[0,2)']],
    ['START 2 carboxi END et ano', ['TILE_ORDER[3,4)']],
  ];
  for (const [words, expected] of cases) {
    const errors = errorsOf(words);
    for (const error of expected) {
      assert.ok(errors.includes(error), `${words}: ${errors.join(' ')} lacks ${error}`);
    }
  }
  // An acid suffix with `ácido` out of place has the TILE_ORDER of `ácido` only, never ACID_WORD too.
  assert.deepEqual(errorsOf('2 met il ácido prop ano oico'), ['TILE_ORDER[3,4)']);
  const lead = 'Esta ficha no puede ir aquí: ';
  const missing = 'El nombre de un ácido empieza por la palabra «ácido»: pon esa ficha al principio, como en ácido butanoico.';
  assert.equal(messageOf('but ano oico'), missing);
  assert.equal(messageOf('benzoico'), missing);
  assert.equal(messageOf('ácido but ano al'), 'La palabra «ácido» va delante del nombre de un ácido, que termina en «oico» (ácido '
    + 'butanoico), en «carboxílico» (ácido ciclohexanocarboxílico) o en «benzoico» (ácido benzoico).');
  const first = `${lead}«ácido» va una sola vez, al principio del nombre, delante de todo lo demás: ácido 2-metilpropanoico.`;
  assert.equal(messageOf('2 met il ácido prop ano oico'), first);
  assert.equal(messageOf('ácido but ano oico ácido'), first);
  assert.equal(messageOf('ácido ciclo hex ano oico'), `${lead}«oico» solo va detrás de una cadena: en un anillo, el grupo COOH va `
    + 'unido a un carbono del anillo y se escribe «carboxílico» (ácido ciclohexanocarboxílico).');
  assert.equal(messageOf('ácido benceno oico'), `${lead}«oico» no va detrás de «benceno»: el benceno con un grupo COOH es el «ácido `
    + 'benzoico», y con varios se usa «carboxílico» (ácido benceno-1,4-dicarboxílico).');
  const oicoLocants = `${lead}el grupo COOH de «oico» va siempre en un extremo de la cadena, en el carbono 1 (y en el último, con `
    + '«dioico»), así que «oico» no lleva números: ácido butanoico, ácido butanodioico.';
  assert.equal(messageOf('ácido but ano 1 oico'), oicoLocants);
  assert.equal(messageOf('ácido 1 but ano oico'), oicoLocants);
  assert.equal(parse(seq('ácido but ano 1 4 bis oico')).errors[1].message, `${lead}delante de «oico» va «di», «tri»…, no «bis» ni `
    + '«tris».');
  assert.equal(messageOf('oico met ano'), `${lead}«oico» va al final del nombre, detrás de la terminación de la cadena principal `
    + '(ácido butanoico, ácido butanodioico); en una rama, el grupo COOH se escribe «carboxi» ((carboximetil)).');
  assert.equal(messageOf('carboxílico ciclo hex ano'), `${lead}«carboxílico» va al final del nombre, detrás del nombre del anillo `
    + 'principal (ácido ciclohexanocarboxílico); en una rama, el grupo COOH se escribe «carboxi».');
  assert.equal(messageOf('ácido 1 benzoico'), '«ácido benzoico» ya dice dónde va su grupo COOH, en el carbono 1: no lleva números ni '
    + 'letras propios.');
  assert.equal(messageOf('ácido START benzoico END met ano oico'), `${lead}«benzoico» es el nombre de toda la molécula y va al final, `
    + 'detrás de «ácido»; dentro de una rama, el anillo es «fenil» y su grupo COOH se escribe «carboxi», como en (4-carboxifenil).');
  assert.equal(messageOf('carboxi oxi met ano'), `${lead}«oxi» no va detrás de «carboxi»: un grupo COOH unido a un oxígeno no forma `
    + 'un éter.');
  assert.equal(messageOf('carboxi met il éter'), `${lead}«carboxi» no va en un nombre con «éter»: un grupo COOH unido al oxígeno no `
    + 'forma un éter. Los dos grupos de un éter son cadenas o anillos de carbonos (etil metil éter).');
  // A letter counts the –COOH of `benzoico` as one of its two positions.
  assert.deepEqual(errorsOf('ácido p met il benzoico'), []);
  assert.deepEqual(errorsOf('ácido p di met il benzoico'), ['POSITIONAL[1,2)']);
}); // End of test 'parser (R-5d1): ACID_WORD…'

// ---------------------------------------------------------------------------
// Assembler and tokenizer.
// ---------------------------------------------------------------------------

/**
 * Every assembly form of phase R-5d1, as tile words and the SMILES of a
 * molecule whose engine names include the form (render.js renderName(): the
 * class word and its space; suffixWords(): the parent's `o` elided before
 * `oico`, kept before `dioico` and `carboxílico`; the prefixes).
 */
const FORMS = Object.freeze([
  ['ácido met ano oico', 'OC=O'],
  ['ácido et ano oico', 'CC(=O)O'],
  ['ácido but ano oico', 'CCCC(=O)O'],
  ['ácido but ano di oico', 'OC(=O)CCC(=O)O'],
  ['ácido et ano di oico', 'OC(=O)C(=O)O'],
  ['ácido prop 2 eno oico', 'C=CC(=O)O'],
  ['ácido but 2 ino oico', 'CC#CC(=O)O'],
  ['ácido but 2 eno di oico', 'OC(=O)C=CC(=O)O'],
  ['ácido 2 met il prop ano oico', 'CC(C)C(=O)O'],
  ['ácido 2 2 2 tri cloro et ano oico', 'ClC(Cl)(Cl)C(=O)O'],
  ['ácido 3 oxo but ano oico', 'CC(=O)CC(=O)O'],
  ['ácido 2 hidroxi prop ano oico', 'CC(O)C(=O)O'],
  ['ácido 2 met il oxi et ano oico', 'COCC(=O)O'],
  ['ácido 2 acetil hex ano oico', 'OC(=O)C(C(C)=O)CCCC'],
  ['ácido 4 met il oxi 4 oxo but ano oico', 'COC(=O)CCC(=O)O'],
  ['ácido ciclo hex ano carboxílico', 'OC(=O)C1CCCCC1'],
  ['ácido ciclo hex 2 eno 1 carboxílico', 'OC(=O)C1C=CCCC1'],
  ['ácido ciclo hex ano 1 4 di carboxílico', 'OC(=O)C1CCC(C(=O)O)CC1'],
  ['ácido 4 cloro ciclo hex ano 1 carboxílico', 'OC(=O)C1CCC(Cl)CC1'],
  ['ácido benzoico', 'OC(=O)C1=CC=CC=C1'],
  ['ácido benceno carboxílico', 'OC(=O)C1=CC=CC=C1'],
  ['ácido 4 hidroxi benzoico', 'OC(=O)C1=CC=C(O)C=C1'],
  ['ácido 4 met il benceno 1 carboxílico', 'CC1=CC=C(C(=O)O)C=C1'],
  ['ácido p met il benzoico', 'CC1=CC=C(C(=O)O)C=C1'],
  ['ácido benceno 1 3 di carboxílico', 'OC(=O)C1=CC=CC(C(=O)O)=C1'],
  ['ácido benceno 1 3 5 tri carboxílico', 'OC(=O)C1=CC(C(O)=O)=CC(C(O)=O)=C1'],
  ['ácido 2 START 3 met il fenil END prop ano oico', 'CC(C1=CC=CC(C)=C1)C(=O)O'],
  ['ácido 2 START carboxi met il END ciclo hex ano 1 carboxílico', 'OC(=O)C1CCCCC1CC(=O)O'],
  ['ácido 3 5 bis START carboxi met il END ciclo hex ano 1 carboxílico', 'OC(=O)C1CC(CC(=O)O)CC(CC(=O)O)C1'],
  ['ácido 2 START 4 carboxi ciclo hex il END prop ano di oico', 'OC(=O)C(C(=O)O)C1CCC(C(=O)O)CC1'],
  ['ácido 3 START carboxi met il oxi END prop ano oico', 'OC(=O)COCCC(=O)O'],
  ['ácido 2 START 4 cloro fenil oxi END et ano oico', 'OC(=O)COC1=CC=C(Cl)C=C1'],
]);

test('assembler (R-5d1): every acid form is the forward engine\'s own text; the tokenizer reads it back', () => {
  for (const [words, smiles] of FORMS) {
    const assembled = text(words);
    assert.ok(namesOf(smiles).includes(assembled), `${words} → ${assembled}, not among ${namesOf(smiles).join(', ')}`);
    assert.deepEqual(tokenize(assembled), seq(words), assembled);
  }
  // Rule 9: the class word, an 'ending' part as render.js gives it, then the automatic space (a 'punct' span), never a hyphen.
  const { spans } = assemble(parse(seq('ácido 2 met il prop ano oico')).tree);
  assert.deepEqual(spans.slice(0, 3).map((s) => [s.tile, s.kind, s.from, s.to]), [[0, 'ending', 0, 5], [null, 'punct', 5, 6],
    [1, 'locant', 6, 7]]);
  assert.equal(assemble(parse(seq('ácido but ano oico')).tree).spans.find((s) => s.tile === 3).kind, 'ending');
  // Rule 4, the suffix half: the parent's `o` elided before `oico`, kept before `dioico` and `carboxílico`.
  assert.equal(text('ácido but 2 eno oico'), 'ácido but-2-enoico');
  assert.equal(text('ácido but 2 eno di oico'), 'ácido but-2-enodioico');
  assert.equal(text('ácido ciclo hex 2 eno 1 carboxílico'), 'ácido ciclohex-2-eno-1-carboxílico');
  // Old style, assembled as written.
  assert.equal(text('ácido 2 but eno oico'), 'ácido 2-butenoico');
  assert.deepEqual(tokenize('ácido 2-butenoico'), seq('ácido 2 but eno oico'));
  assert.equal(text('ácido 1 4 ciclo hex ano di carboxílico'), 'ácido 1,4-ciclohexanodicarboxílico');
}); // End of test 'assembler (R-5d1)…'

test('tokenizer (R-5d1): texts that only read with errors, and the later families\' names, never tokenize', () => {
  for (const name of ['butanoico', 'benzoico', 'ácido', 'ácido ', 'ácido  butanoico', 'ácido-butanoico', 'ácidobutanoico', 'ácido butanal',
    'ácido ciclohexanoico', 'ácido bencenoico', 'ácido butan-1-oico', 'ácido 1-butanoico', 'ácido 1-benzoico', 'ácido p-benzoico',
    'ácido benzoicooico', '2-metilácido propanoico', 'ácido butanoico ácido', 'ácido ácido butanoico', '(carboxioxi)metano',
    'ácido butano-1,4-bisoico', 'carboxi',
    // Phases R-6b…R-6d: nitriles, amines, amides.
    'ácido 3-cianopropanoico', 'ácido 2-aminopropanoico', 'ácido 4-carbamoilbenzoico', 'etanamida', 'etanonitrilo', 'benzamida',
    'benzonitrilo']) {
    assert.equal(tokenize(name), null, name);
  }
  // Phase R-6a2b: an ester prefix beside an acid reads (reverse-ester-prefixes.test.js).
  assert.deepEqual(tokenize('ácido 2-(acetiloxi)etanoico'), seq('ácido 2 acetil oxi et ano oico'));
  assert.deepEqual(tokenize('ácido 3-(metoxicarbonil)pentanodioico'), seq('ácido 3 met il oxi carbonil pent ano di oico'));
  // Phase I-51d2: the retained acid names read (reverse-acid-templates.test.js); none is left for later.
  assert.deepEqual(LATER_ACID_WORDS, []);
  for (const name of ['ácido fórmico', 'ácido acético', 'ácido oxálico', 'ácido fenilacético', 'ácido 2-(3-metilfenil)acético',
    'ácido ftálico', 'ácido isoftálico', 'ácido tereftálico', 'ácido 4-metilftálico']) {
    assert.ok(tokenize(name), name);
  }
  assert.equal(ACID_WORD, tileById(ACID_WORD_ID).text);
  assert.ok(ESTER_PREFIX.test('ácido 2-[(2-metilpropanoil)oxi]etanoico') && !ESTER_PREFIX.test('ácido 3-(pentiloxi)propanoico'));
}); // End of test 'tokenizer (R-5d1)…'

// ---------------------------------------------------------------------------
// Interpreter and builder.
// ---------------------------------------------------------------------------

test('interpreter (R-5d1): the class word, the SuffixSpec of each acid suffix; `oico` at the ends of a chain by rule', () => {
  // `oico`: implicit at carbon 1, and at the last carbon with `dioico`, on the `oico` tiles; no left-out slot.
  let spec = specOf('ácido pent ano di oico');
  assert.deepEqual(spec.classWord, { kind: 'acid', text: 'ácido', tiles: [0, 1] });
  assert.deepEqual([spec.suffix.kind, spec.suffix.outside, spec.suffix.hydroxy, spec.suffix.terminal, spec.suffix.placed],
    ['acid', false, true, true, false]);
  assert.deepEqual(spec.suffix.slots.map((slot) => [slot.kind, slot.value, slot.tiles]), [['implicit', 1, [3, 5]], ['implicit', 5, [3, 5]]]);
  assert.deepEqual([spec.leftOut, spec.tiles, spec.parent.tiles], [[], [0, 5], [1, 3]]);
  // `carboxílico`: supplied, old style or left out, carbons 1…n, outside.
  spec = specOf('ácido ciclo hex ano carboxílico');
  assert.deepEqual([spec.suffix.kind, spec.suffix.outside, spec.suffix.hydroxy, spec.suffix.terminal], ['acid', true, true, false]);
  assert.deepEqual(spec.leftOut.map((slot) => [slot.role, slot.domain, slot.tiles]), [['carbon', [1, 6], [4, 5]]]);
  spec = specOf('ácido 1 4 ciclo hex ano di carboxílico');
  assert.deepEqual([spec.oldStyle, spec.suffix.slots.map((slot) => [slot.kind, slot.value])], [true, [['supplied', 1], ['supplied', 4]]]);
  // `benzoico`: the benzene parent with its –COOH at carbon 1, placed by the word, quoted «ácido benzoico».
  spec = specOf('ácido 4 met il benzoico');
  assert.deepEqual([spec.parent.kind, spec.suffix.kind, spec.suffix.outside, spec.suffix.placed, spec.suffix.phenol, spec.suffix.word.text],
    ['benzene', 'acid', true, true, false, 'ácido benzoico']);
  assert.deepEqual(spec.suffix.slots.map((slot) => [slot.kind, slot.value, slot.tiles]), [['implicit', 1, [4, 5]]]);
  // A letter counts the –COOH: `ácido p-metilbenzoico` puts the methyl at 4.
  assert.deepEqual(specOf('ácido p met il benzoico').prefixes[0].slots.map((slot) => slot.value), [4]);
  // `carboxi`: a retained word; without `ácido` no class word.
  spec = specOf('START carboxi met il END ciclo hex ano');
  assert.deepEqual([spec.classWord, spec.prefixes[0].substituent.prefixes[0].substituent.retained], [null, 'carboxy']);
}); // End of test 'interpreter (R-5d1)…'

test('builder (R-5d1): the =O and the OH of each –COOH, its own carbon outside a ring, `carboxi`; atoms counted for the caps', () => {
  let built = build(specOf('ácido but ano di oico'));
  assert.ok(built.ok);
  assert.deepEqual(oxygenBonds(built.molecule), ['C1', 'C1', 'C2', 'C2']);
  assert.deepEqual(built.suffixAtoms.map((g) => [g.locant, built.molecule.bonds.get(g.bond).order,
    built.molecule.bonds.get(g.hydroxyBond).order, built.molecule.atoms.get(g.hydroxy).element]), [[1, 2, 1, 'O'], [4, 2, 1, 'O']]);
  assert.deepEqual(built.suffixAtoms.map((g) => g.parentAtom), [built.studentParent.atoms[0], built.studentParent.atoms[3]]);
  assert.equal(aromaticKey(built.molecule), keyOf('OC(=O)CCC(=O)O'));
  // `carboxílico`: a carbon bonded to the ring's carbon by a single bond, the =O and the OH on it.
  built = build(specOf('ácido ciclo hex ano 1 carboxílico'));
  const [group] = built.suffixAtoms;
  assert.equal(built.molecule.atoms.get(group.carbon).element, 'C');
  assert.deepEqual([built.molecule.bonds.get(group.carbonBond).order, built.molecule.bonds.get(group.bond).order,
    built.molecule.bonds.get(group.hydroxyBond).order], [1, 2, 1]);
  assert.equal(group.parentAtom, built.studentParent.atoms[0]);
  assert.equal(aromaticKey(built.molecule), keyOf('OC(=O)C1CCCCC1'));
  assert.equal(aromaticKey(build(specOf('ácido benzoico')).molecule), keyOf('OC(=O)C1=CC=CC=C1'));
  assert.equal(aromaticKey(build(specOf('ácido met ano oico')).molecule), keyOf('OC=O'));
  // `carboxi`: one carbon with its =O and its OH, bonded by that carbon.
  // Its left-out locant inside the one-carbon branch has one value: 1.
  assert.equal(aromaticKey(build(specOf('ácido 2 START carboxi met il END ciclo hex ano 1 carboxílico'), [1]).molecule),
    keyOf('OC(=O)C1CCCCC1CC(=O)O'));
  assert.equal(aromaticKey(build(specOf('carboxi ciclo hex ano'), [1]).molecule), keyOf('OC(=O)C1CCCCC1')); // Its left-out locant: 1.
  // The caps count the –COOH's carbon and both its oxygens.
  let spec = specOf('ácido benceno 1 2 3 4 5 6 hexa carboxílico');
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [12, 24]);
  spec = specOf('ácido 2 START carboxi met il END ciclo hex ano 1 carboxílico');
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [9, 13]);
  assert.deepEqual([specCarbons(specOf('ácido but ano di oico')), specAtoms(specOf('ácido but ano di oico'))], [4, 8]);
  const locants = Array.from({ length: 30 }, (_, i) => i + 1).join(' ');
  const verdict = read(`ácido ciclo triacont ano ${locants} triaconta carboxílico`);
  assert.deepEqual([verdict.kind, verdict.errors[0].code, verdict.message], ['invalid', 'TOO_BIG', TOO_MANY_ATOMS_MESSAGE]);
  assert.ok(60 + 60 > MAX_HEAVY_ATOMS);
}); // End of test 'builder (R-5d1)…'

test('builder (R-5d1): CARBONYL_POSITION, VALENCE and LOCANT_RANGE for the acid groups, each with its tiles', () => {
  const cases = [
    ['ácido met ano di oico', 'CARBONYL_POSITION', [3, 5],
      'La cadena de 1 carbono solo tiene un extremo: lleva un solo grupo COOH (ácido metanoico).'],
    ['ácido but ano tri oico', 'CARBONYL_POSITION', [3, 5],
      'La cadena tiene dos extremos: con «oico» lleva como mucho dos grupos COOH, uno en cada extremo (ácido butanodioico).'],
    ['ácido 1 cloro prop ano oico', 'VALENCE', [1, 2],
      'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: el grupo COOH de «oico» va en ese carbono.'],
    ['ácido 1 met il prop ano oico', 'VALENCE', [1, 2],
      'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: el grupo COOH de «oico» va en ese carbono.'],
    ['ácido 1 cloro benzoico', 'VALENCE', [1, 2],
      'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el ácido benzoico, ese carbono ya lleva un grupo COOH.'],
    ['ácido 7 cloro benzoico', 'LOCANT_RANGE', [1, 2], 'El anillo del ácido benzoico tiene 6 carbonos, del 1 al 6: no hay carbono 7.'],
    ['ácido ciclo hex ano 7 carboxílico', 'LOCANT_RANGE', [4, 5], 'El anillo de 6 carbonos va del 1 al 6: no hay carbono 7.'],
    ['ácido 2 2 di carboxi met ano oico', 'LOCANT_RANGE', [1, 2], 'La cadena de 1 carbono solo tiene el carbono 1: no hay carbono 2.'],
  ];
  for (const [words, code, tiles, message] of cases) {
    const verdict = read(words);
    assert.equal(verdict.kind, 'invalid', `${words}: ${verdict.message}`);
    assert.deepEqual([verdict.errors[0].code, [verdict.errors[0].from, verdict.errors[0].to]], [code, tiles], words);
    assert.equal(verdict.message, message, words);
  }
  // `benceno` has no room for the –COOH of a chain: `oico` there is TILE_ORDER (parse.js), and a `carboxílico` beyond six fits nowhere.
  assert.equal(read('ácido benceno hepta carboxílico').errors[0].code, 'VALENCE');
}); // End of test 'builder (R-5d1): CARBONYL_POSITION…'

// ---------------------------------------------------------------------------
// readName(): verdicts, search, out-of-scope acids.
// ---------------------------------------------------------------------------

/**
 * readName() cases: tile words or a name, the verdict, the engine's name
 * and the SMILES of the molecule drawn.
 */
const CASES = Object.freeze([
  ['ácido propanoico', 'correct', 'ácido propanoico', 'CCC(=O)O'],
  ['ácido butanodioico', 'correct', 'ácido butanodioico', 'OC(=O)CCC(=O)O'],
  ['ácido 2-metilpropanoico', 'correct', 'ácido 2-metilpropanoico', 'CC(C)C(=O)O'],
  ['ácido 3-oxobutanoico', 'correct', 'ácido 3-oxobutanoico', 'CC(=O)CC(=O)O'],
  ['ácido prop-2-enoico', 'correct', 'ácido prop-2-enoico', 'C=CC(=O)O'],
  ['ácido metanoico', 'correct', 'ácido metanoico', 'OC=O'],
  ['ácido etanodioico', 'correct', 'ácido etanodioico', 'OC(=O)C(=O)O'],
  ['ácido ciclohexanocarboxílico', 'correct', 'ácido ciclohexanocarboxílico', 'OC(=O)C1CCCCC1'],
  ['ácido ciclohexano-1,4-dicarboxílico', 'correct', 'ácido ciclohexano-1,4-dicarboxílico', 'OC(=O)C1CCC(C(=O)O)CC1'],
  ['ácido benceno-1,3-dicarboxílico', 'correct', 'ácido benceno-1,3-dicarboxílico', 'OC(=O)C1=CC=CC(C(=O)O)=C1'],
  ['ácido benzoico', 'correct', 'ácido benzoico', 'OC(=O)C1=CC=CC=C1'],
  ['ácido bencenocarboxílico', 'alternative', 'ácido benzoico', 'OC(=O)C1=CC=CC=C1'],
  ['ácido 4-hidroxibenzoico', 'correct', 'ácido 4-hidroxibenzoico', 'OC(=O)C1=CC=C(O)C=C1'],
  ['ácido p-metilbenzoico', 'alternative', 'ácido 4-metilbenzoico', 'CC1=CC=C(C(=O)O)C=C1'],
  ['ácido 2-(3-metilfenil)propanoico', 'correct', 'ácido 2-(3-metilfenil)propanoico', 'CC(C1=CC=CC(C)=C1)C(=O)O'],
  ['ácido 2-(carboximetil)ciclohexano-1-carboxílico', 'correct', 'ácido 2-(carboximetil)ciclohexano-1-carboxílico',
    'OC(=O)C1CCCCC1CC(=O)O'],
  ['ácido 2-metoxietanoico', 'correct', 'ácido 2-metoxietanoico', 'COCC(=O)O'],
  ['ácido 4-metoxi-4-oxobutanoico', 'correct', 'ácido 4-metoxi-4-oxobutanoico', 'COC(=O)CCC(=O)O'],
  // Left-out locants (search.js).
  ['ácido 2 met il prop ano oico', 'correct', 'ácido 2-metilpropanoico', 'CC(C)C(=O)O'],
  ['ácido met il prop ano oico', 'missingLocants', 'ácido 2-metilpropanoico', 'CC(C)C(=O)O'],
  ['ácido cloro et ano oico', 'missingLocants', 'ácido 2-cloroetanoico', 'ClCC(=O)O'],
  ['ácido ciclo hex ano 1 carboxílico', 'otherName', 'ácido ciclohexanocarboxílico', 'OC(=O)C1CCCCC1'],
  ['ácido 4 met il benceno carboxílico', 'missingLocants', 'ácido 4-metilbenzoico', 'CC1=CC=C(C(=O)O)C=C1'],
  ['ácido 2 met il ciclo hex ano carboxílico', 'missingLocants', 'ácido 2-metilciclohexano-1-carboxílico', 'CC1CCCCC1C(=O)O'],
  // `otherName`: the molecule the name describes.
  ['ácido 2-butenoico', 'otherName', 'ácido but-2-enoico', 'CC=CC(=O)O'],
  ['ácido 4-metilbutanoico', 'otherName', 'ácido pentanoico', 'CCCCC(=O)O'],
  ['ácido propano-1-carboxílico', 'otherName', 'ácido butanoico', 'CCCC(=O)O'],
  ['carboxiciclohexano', 'otherName', 'ácido ciclohexanocarboxílico', 'OC(=O)C1CCCCC1'],
  ['ácido 3-carboxipropanoico', 'otherName', 'ácido butanodioico', 'OC(=O)CCC(=O)O'],
  ['1-hidroxipropanal', 'otherName', 'ácido propanoico', 'CCC(=O)O'],
]);

test('readName (R-5d1): verdicts and the molecule each name describes, against a SMILES', () => {
  for (const [name, kind, engine, smiles] of CASES) {
    const verdict = read(name);
    assert.equal(verdict.kind, kind, `${name}: ${verdict.message}`);
    assert.equal(verdict.name, engine, name);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${name} builds another graph`);
    assert.equal(verdict.draw, true);
  }
  assert.equal(read('ácido met il prop ano oico').message, 'Casi: faltan los números. Se escribe «ácido 2-metilpropanoico».');
  assert.equal(read('ácido metanoico').message, '¡Correcto! También se llama «ácido fórmico» (nombre tradicional, que la IUPAC (2013) '
    + 'conserva como preferido).');
  assert.equal(read('ácido 2-butenoico').notes[0], 'Es la forma antigua de escribirlo; hoy se escribe «ácido but-2-enoico».');
  // The suffix groups of the verdict, carried onto the drawn graph: the –COOH's carbon, its =O and its OH.
  const verdict = read('ácido ciclohexano-1,4-dicarboxílico');
  assert.deepEqual(verdict.suffixAtoms.map((g) => [verdict.molecule.atoms.get(g.carbon).element,
    verdict.molecule.atoms.get(g.attachment).element, verdict.molecule.bonds.get(g.bond).order,
    verdict.molecule.atoms.get(g.hydroxy).element, verdict.molecule.bonds.get(g.hydroxyBond).order]),
  [['C', 'O', 2, 'O', 1], ['C', 'O', 2, 'O', 1]]);
  assert.ok(verdict.suffixAtoms.every((g) => verdict.studentParent.atoms.includes(g.parentAtom)));
}); // End of test 'readName (R-5d1): verdicts…'

test('search (R-5d1): left-out locants give ambiguous lists; the budget gives incomplete; out-of-scope acids', () => {
  const ambiguous = [
    ['ácido met il but ano oico', 'Faltan números: puede ser ácido 2-metilbutanoico o ácido 3-metilbutanoico.'],
    ['ácido ciclo hex ano di carboxílico', 'Faltan números: puede ser ácido ciclohexano-1,1-dicarboxílico, ácido '
      + 'ciclohexano-1,2-dicarboxílico, ácido ciclohexano-1,3-dicarboxílico u otra molécula.'],
    ['ácido met il benzoico', 'Faltan números: puede ser ácido 2-metilbenzoico, ácido 3-metilbenzoico o ácido 4-metilbenzoico.'],
    ['ácido hidroxi prop ano oico', 'Faltan números: puede ser ácido 2-hidroxipropanoico o ácido 3-hidroxipropanoico.'],
  ];
  for (const [words, message] of ambiguous) {
    const verdict = read(words);
    assert.deepEqual([verdict.kind, verdict.message], ['ambiguous', message], words);
  }
  assert.equal(read('ácido ciclo dodec ano hexa carboxílico', { budget: { placements: 1 } }).kind, 'incomplete');
  assert.equal(read('ácido met il ciclo hex ano carboxílico', { budget: { namings: 1 } }).kind, 'incomplete');
  // The engine's refusal (manyAcids: a third –COOH on one carbon piece): outOfScope with its message, no drawing.
  const refused = read('ácido prop ano 1 2 3 tri carboxílico');
  assert.equal(refused.kind, 'outOfScope');
  assert.match(refused.message, /^Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar: Esta molécula tiene más de dos grupos –COOH/);
  assert.equal(refused.draw, false);
  assert.equal(read('ácido 2 START carboxi met il END but ano di oico').kind, 'outOfScope');
  // Two rings joined through a –COOH's neighbour are the engine's several rings, refused before any search.
  assert.equal(read('ácido 4 fenil benzoico').kind, 'outOfScope');
}); // End of test 'search (R-5d1)…'

// ---------------------------------------------------------------------------
// Mutations and the diagnosis.
// ---------------------------------------------------------------------------

/**
 * Mutations of acid names (design.md §15.7): tile words, the verdict and
 * the diagnosis code (the acid's own mistakes: the test of the former
 * deliberate nulls below).
 */
const MUTATIONS = Object.freeze([
  // Rules that hold for an acid name.
  ['ácido 4 met il but ano oico', 'otherName', 'BRANCH_AT_END'],
  ['ácido 2 et il prop ano oico', 'otherName', 'LONGER_CHAIN'],
  ['ácido 4 met il hex ano di oico', 'otherName', 'NUMBERING'],
  ['ácido 5 met il ciclo hex ano 1 carboxílico', 'otherName', 'RING_NUMBERING'],
  ['ácido 6 met il benzoico', 'otherName', 'RING_NUMBERING'],
  ['ácido 3 met il 2 cloro but ano oico', 'otherName', 'ALPHABETICAL_ORDER'],
  ['ácido 4 START carboxi met il END 2 bromo ciclo hex ano 1 carboxílico', 'otherName', 'ALPHABETICAL_ORDER'], // `carboxi…` under c
  ['ácido 2 met il 2 met il prop ano oico', 'otherName', 'UNGROUPED'],
  ['ácido 2 2 bis met il prop ano oico', 'otherName', 'MULTIPLIER_KIND'],
  ['ácido 3 2 di met il but ano oico', 'otherName', 'LOCANT_ORDER'],
  ['ácido ciclo hex ano 4 1 di carboxílico', 'otherName', 'LOCANT_ORDER'],
  ['ácido 2 but eno oico', 'otherName', 'OLD_STYLE'],
  ['ácido 1 4 ciclo hex ano di carboxílico', 'otherName', 'OLD_STYLE'],
  ['ácido ciclo hex 1 3 5 tri eno carboxílico', 'otherName', 'BENZENE_RING'],
  ['ácido 2 START 5 met il fenil END prop ano oico', 'otherName', 'BRANCH_RING_NUMBERING'],
  ['ácido 2 et ano oil hex ano oico', 'otherName', 'ACYL_NAME'],
  ['ácido 2 START 2 carboxi et il oxi END et ano oico', 'otherName', 'ETHER_SIDE'],
  // Other verdicts.
  ['ácido but ano oico', 'correct', null],
  ['ácido met il but ano oico', 'ambiguous', null],
  ['ácido met il prop ano oico', 'missingLocants', null],
]);

test('mutations (R-5d1): the expected verdict, and the diagnosis of every rule that holds for an acid name', () => {
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
    'ácido 4 met il but ano oico': 'La rama «metil» está en el extremo de la cadena, así que la alarga: la cadena principal tiene 5 '
      + 'carbonos.',
    'ácido 2 et il prop ano oico': 'Hay una cadena más larga que la tuya: la tuya tiene 3 carbonos y la cadena principal tiene 4.',
    'ácido 4 met il hex ano di oico': 'Hay que numerar la cadena desde el otro extremo: los sustituyentes tienen que llevar los números '
      + 'más bajos (3 en vez de 4).',
    'ácido 6 met il benzoico': 'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: los '
      + 'sustituyentes tienen que llevar los números más bajos (2 en vez de 6).',
    'ácido 3 met il 2 cloro but ano oico': 'Los sustituyentes se escriben por orden alfabético: «cloro» va antes que «metil» (c antes '
      + 'que m).',
    'ácido 2 but eno oico': 'Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, justo delante de «eno» o '
      + '«ino»: «ácido but-2-enoico».',
    'ácido 1 4 ciclo hex ano di carboxílico': 'Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, justo '
      + 'delante de «dicarboxílico»: «ácido ciclohexano-1,4-dicarboxílico».',
    'ácido ciclo hex 1 3 5 tri eno carboxílico': 'Un anillo de 6 carbonos con tres enlaces dobles alternados, uno sí y uno no, es el '
      + 'benceno, y tiene nombre propio: «benceno». Se escribe «ácido benzoico».',
  };
  for (const [words, message] of Object.entries(messages)) {
    assert.equal(read(words).diagnosis.message, message, words);
  }
}); // End of test 'mutations (R-5d1)…'

/**
 * The category of an acid's own mistake, read independently of diagnose.js
 * from the engine's naming and the student's reading (diagnose.js «Acids»;
 * until phase I-51d3 each was a deliberate null): `seniority` — the
 * student's suffix is no –COOH (a junior group's, or none:
 * `1-hidroxipropanal`, `carboxiciclohexano`); `count` — the student's –COOH
 * suffix cites another number of groups (`ácido 3-carboxipropanoico`);
 * `carbon` — the –COOH's carbon on the other side of the parent (`ácido
 * propano-1-carboxílico`, `ácido ciclohexilmetanoico`); `numbering` — the
 * same –COOH groups numbered otherwise (N0: `ácido
 * ciclohexano-1,5-dicarboxílico`); `suffix` — the suffix's locants, which the
 * engine leaves out (`ácido ciclohexano-1-carboxílico`). Null when none
 * applies or when the principal group is no –COOH.
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} verdict - Its `otherName` verdict.
 * @returns {string|null} The category.
 */
function acidCategory(ids, verdict) {
  const engine = verdict.naming.structure.suffix;
  if (!engine || engine.kind !== 'acid') {
    return null;
  }
  const mine = verdict.suffixAtoms.filter((g) => g.hydroxy !== undefined); // A –COOH has its OH (build.js).
  if (mine.length === 0) {
    return 'seniority';
  }
  if (mine.length !== engine.locants.length) {
    return 'count';
  }
  if (mine.some((g) => g.carbon !== undefined) !== Boolean(engine.outside)) {
    return 'carbon';
  }
  const sorted = (list) => [...list].sort((p, q) => p - q).join();
  if (sorted(mine.map((g) => g.parentAtom)) === sorted(engine.locants.map((site) => site.atom))
    && sorted(mine.map((g) => g.locant)) !== sorted(engine.locants.map((site) => site.locant))) {
    return 'numbering';
  }
  const { tree } = parse(ids);
  if (tree.parent.suffix && tree.parent.suffix.locants.length > 0) {
    const bare = assemble({ ...tree, parent: { ...tree.parent, suffix: { ...tree.parent.suffix, locants: [] } } }).text;
    if ([verdict.naming.name, ...verdict.naming.alternatives.map((alt) => alt.name)].includes(bare)) {
      return 'suffix';
    }
  }
  return null;
} // End of function acidCategory()

/**
 * The codes an acid's own mistake gets, by category (acidCategory();
 * diagnose.js «Acids», phase I-51d3): the –COOH written as two groups
 * (ACID_GROUP), beside a junior suffix (CARBONYL_SENIORITY) or as `carboxi`
 * (CARBONYL_PREFIX); a principal –COOH written `carboxi` or the groups of
 * another parent (CARBONYL_PREFIX, CARBONYL_PARENT, MORE_CARBONYL_GROUPS);
 * the –COOH's carbon (ACID_CARBON); N0 (RING_NUMBERING); the suffix's
 * needless locants (NEEDLESS_LOCANTS).
 */
const CATEGORY_CODES = Object.freeze({
  seniority: ['ACID_GROUP', 'CARBONYL_SENIORITY', 'CARBONYL_PREFIX'],
  count: ['CARBONYL_PREFIX', 'CARBONYL_PARENT', 'MORE_CARBONYL_GROUPS'],
  carbon: ['ACID_CARBON'],
  numbering: ['RING_NUMBERING'],
  suffix: ['NEEDLESS_LOCANTS'],
});

test('the former deliberate nulls of R-5d1 (diagnose.js «Acids»): each category has its I-51d3 code, step and words', () => {
  const cases = [
    // [tile words, category, code, step, a phrase of the message]
    ['1 hidroxi prop ano al', 'seniority', 'ACID_GROUP', 'group', 'juntos forman un solo grupo, el –COOH'],
    ['carboxi ciclo hex ano', 'seniority', 'CARBONYL_PREFIX', 'group', 'no con el prefijo «carboxi»'],
    ['1 oxo prop ano 1 ol', 'seniority', 'ACID_GROUP', 'group', 'su –OH no es un alcohol'],
    ['ácido 3 carboxi prop ano oico', 'count', 'CARBONYL_PREFIX', 'group', 'Su carbono entra en la cadena principal'],
    ['ácido 2 carboxi ciclo hex ano 1 carboxílico', 'count', 'CARBONYL_PREFIX', 'group', 'los unidos al anillo'],
    ['ácido 4 START 1 2 di carboxi et il END ciclo hex ano 1 carboxílico', 'count', 'CARBONYL_PARENT', 'ringChain',
      'la que lleva más grupos –COOH'],
    ['ácido prop ano 1 carboxílico', 'carbon', 'ACID_CARBON', 'group', 'solo se usa cuando el grupo –COOH está unido a un anillo'],
    ['ácido ciclo hex il met ano oico', 'carbon', 'ACID_CARBON', 'group', 'su carbono no forma parte del anillo'],
    ['ácido fenil met ano oico', 'carbon', 'ACID_CARBON', 'group', '«ácido benzoico» (el benceno con un grupo –COOH)'],
    ['ácido ciclo hex ano 1 5 di carboxílico', 'numbering', 'RING_NUMBERING', 'ringNumbering', 'los grupos –COOH (el grupo principal)'],
    ['ácido benceno 1 5 di carboxílico', 'numbering', 'RING_NUMBERING', 'ringNumbering', 'los grupos –COOH (el grupo principal)'],
    ['ácido ciclo hex ano 1 carboxílico', 'suffix', 'NEEDLESS_LOCANTS', 'ringNumbering', 'de colocar el grupo –COOH'],
    ['ácido benceno 1 carboxílico', 'suffix', 'NEEDLESS_LOCANTS', 'assemble', 'de colocar el grupo –COOH'],
  ];
  for (const [words, category, code, opened, phrase] of cases) {
    const ids = seq(words);
    const verdict = readName(ids);
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    assert.equal(verdict.naming.structure.suffix.kind, 'acid', words);
    assert.equal(acidCategory(ids, verdict), category, words);
    const d = verdict.diagnosis;
    assert.ok(d, `${words}: no diagnosis`);
    assert.equal(d.code, code, `${words}: ${d.message}`);
    assert.ok(CATEGORY_CODES[category].includes(d.code), words);
    assert.ok(d.message.includes(phrase), `${words}: ${d.message}`);
    assert.ok(!/undefined|null|NaN|\[object|grupo –OH|grupos –OH|–CHO/.test(d.message), `${words}: ${d.message}`);
    const explanation = diagnosisExplanation(verdict, explain);
    assert.equal(explanation.steps[explanation.index].id, opened, `${words}: the step «Ver el paso» opens`);
    assert.ok(verdict.draw && verdict.molecule, words);
  } // End of the loop over the former deliberate nulls
}); // End of test 'the former deliberate nulls of R-5d1…' 

// ---------------------------------------------------------------------------
// Fixture round trip and closed loop (design.md §15.7).
// ---------------------------------------------------------------------------

test('fixture round trip (R-5d1, R-5d2, R-6a2b): every acid name, ester prefixes included, read back; graph compared with the SMILES', async () => {
  const fixtures = await readFixtures();
  const rows = fixtures.filter((row) => isAcid(row.smiles));
  let covered = 0;
  let templates = 0;
  let prefixes = 0;
  const later = { retained: 0, ester: 0 };
  let elapsed = 0;
  const readRows = new Set();
  for (const row of rows) {
    const expected = keyOf(row.smiles);
    for (const name of row.names) {
      const prefixed = ESTER_PREFIX.test(name); // An ester prefix beside the acid, read since phase R-6a2b.
      if (!isAcidName(name) && !prefixed) {
        later.retained += 1; // No retained acid name since R-5d2, no ester prefix since R-6a2b.
        assert.equal(tokenize(name), null, `names.tsv:${row.line}: ${name} reads before its phase`);
        continue;
      }
      prefixes += prefixed ? 1 : 0;
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
      templates += isAcidTemplateName(name) ? 1 : 0; // R-5d2
      readRows.add(row);
    } // End of the loop over the names of a row
  } // End of the loop over the fixture rows
  /**
   * How many rows read of a fixture section.
   *
   * @param {string} id - The section's phase id (`I-33`…).
   * @returns {number} The count.
   */
  const inSection = (id) => [...readRows].filter((row) => /\((I-\d+[a-z]?)[),:]/.exec(row.section)[1] === id).length; // Its own id only.
  assert.equal(rows.length, EXPECTED_ROWS.total);
  assert.equal(readRows.size, EXPECTED_ROWS.read);
  assert.deepEqual(['I-33', 'I-34', 'I-39b', 'I-39c', 'I-40b', 'I-40d', 'I-43b', 'I-44', 'I-45a', 'I-45b', 'I-45c'].map(inSection),
    [EXPECTED_ROWS.i33, EXPECTED_ROWS.i34, EXPECTED_ROWS.i39b, EXPECTED_ROWS.i39c, EXPECTED_ROWS.i40b, EXPECTED_ROWS.i40d,
      EXPECTED_ROWS.i43b, EXPECTED_ROWS.i44, EXPECTED_ROWS.i45a, EXPECTED_ROWS.i45b, EXPECTED_ROWS.i45c]);
  assert.equal(covered, EXPECTED_NAMES + EXPECTED_PREFIX_NAMES);
  assert.equal(templates, EXPECTED_TEMPLATE_NAMES);
  assert.equal(prefixes, EXPECTED_PREFIX_NAMES);
  assert.deepEqual(later, { ...EXPECTED_LATER_NAMES });
  assert.ok(elapsed / covered < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / covered).toFixed(2)} ms on average`);
}); // End of test 'fixture round trip (R-5d1, R-5d2)…'

/** The closed loop's generators (scripts/oracle/generate.mjs; design.md §15.7), acid molecules only. */
const LOOP = Object.freeze({
  acids: Object.freeze({ count: 500, seed: 5501, maxSize: 12 }),
  ringAcids: Object.freeze({ count: 400, seed: 5502, maxSize: 12 }),
  outside: Object.freeze({ count: 300, seed: 5503, minSize: 6, maxSize: 12 }),
  polysuffix: Object.freeze({ count: 300, seed: 5504, minSize: 6, maxSize: 12 }),
  ringSubstituents: Object.freeze({ count: 300, seed: 5505, maxSize: 12 }),
  phenyls: Object.freeze({ count: 300, seed: 5506, maxSize: 12 }),
  benzoyls: Object.freeze({ count: 200, seed: 5507 }),
  ethers: Object.freeze({ count: 300, seed: 5508, minSize: 2, maxSize: 12 }),
});

/**
 * Minimum coverage of the closed loop: acid molecules (distinct by aromatic
 * key), names read back, the suffix forms among them (names ending in
 * `oico` other than `benzoico`, `carboxílico`, `benzoico`), names with
 * `carboxi`, retained acid names (R-5d2), removed-locant mutations and
 * decisive verdicts among them (the seeds give 884, 995, 682, 230, 53, 8, 30,
 * 2035 and 2035; before R-5d2, 965 names, the 30 retained acid names left
 * out; no name of a later phase is left out).
 */
const LOOP_MIN = Object.freeze({
  molecules: 870, names: 980, oico: 670, carboxilico: 225, benzoico: 50, carboxi: 8, templates: 28, removed: 2000, decisive: 2000,
});

/**
 * The closed loop's molecules: the acids of the generators, distinct by
 * aromatic key, that the engine names.
 *
 * @returns {object[]} The molecules.
 */
function loopMolecules() {
  const seen = new Set();
  const molecules = [];
  const all = [...generateAcids(LOOP.acids), ...generateRingAcids(LOOP.ringAcids), ...generateRingOutsideBenzenes(LOOP.outside),
    ...generateRingPolysuffixBenzenes(LOOP.polysuffix), ...generateRingSubstituents(LOOP.ringSubstituents),
    ...generateSubstitutedPhenyls(LOOP.phenyls), ...generateSubstitutedBenzoyls(LOOP.benzoyls), ...generateEthers(LOOP.ethers)];
  for (const mol of all.filter(isAcidMolecule)) {
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

test('closed loop over the acid generators: engine name → tiles → readName() → the same graph, then without each locant list', () => {
  const molecules = loopMolecules();
  const counts = { names: 0, oico: 0, carboxilico: 0, benzoico: 0, carboxi: 0, templates: 0, removed: 0, decisive: 0 };
  const later = [];
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    const key = aromaticKey(mol);
    const all = [naming.name, ...naming.alternatives.map((alt) => alt.name)];
    for (const [i, name] of all.entries()) {
      if (!isAcidName(name) && !ESTER_PREFIX.test(name)) {
        later.push(name); // None: the retained acid names read since R-5d2, the ester prefixes since R-6a2b (the generators write none).
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
      counts.oico += /[^z]oico$/.test(name) ? 1 : 0;
      counts.carboxilico += /carboxílico$/.test(name) ? 1 : 0;
      counts.benzoico += /benzoico$/.test(name) ? 1 : 0;
      counts.carboxi += /carboxi[^l]/.test(name) ? 1 : 0;
      counts.templates += isAcidTemplateName(name) ? 1 : 0; // R-5d2
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
  assert.deepEqual(later, [], report);
  for (const field of Object.keys(counts)) {
    assert.ok(counts[field] >= LOOP_MIN[field], `${field}: ${report}`);
  }
}); // End of test 'closed loop over the acid generators…'

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
 * halogen, `hidroxi`, `oxo`, an alkoxy prefix): moved to an end, it never
 * lengthens the chain.
 *
 * @param {object} node - A substituent node (parse.js).
 * @returns {boolean} True for such a group.
 */
function isHeteroNode(node) {
  const core = node.type === 'branch' ? node.chain : node;
  return ['halogen', 'hydroxy', 'carbonyl'].includes(node.type) || Boolean(core && core.oxi !== null && core.oxi !== undefined);
}

/** The diagnosis codes an `otherName` of each mutation family may give (the trace's own rule for a new molecule). */
const FAMILY_CODES = Object.freeze({
  reversed: ['NUMBERING'],
  // A chain with `oico` keeps its –COOH at carbon 1: renumbered from the other end, its prefixes move, so the name describes
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
 * The mutations of one acid name: renumbered (on a chain with `oico`, whose
 * –COOH stays at carbon 1, `shifted`; `reversed` on another chain; reflected
 * and rotated on a ring, the suffix's locants too), locants swapped between
 * two prefixes, prefixes in reverse order (after `ácido`), identical
 * prefixes written one by one, di ↔ bis, a single-locant prefix moved to an
 * end of a chain (a carbon branch: BRANCH_AT_END; an `oxo`, a halogen,
 * `hidroxi` or an alkoxy prefix: another molecule), a prefix's locants
 * removed, or added (1… and 2…) where it has none. A retained acid template
 * (R-5d2) is numbered on its parent: the benzene ring of the ftálicos, the
 * chain of `acético` (`reversed`, its –COOH placed by the word).
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {{family: string, ids: string[]}[]} The mutations.
 */
function mutationsOf(ids) {
  const { tree } = parse(ids);
  const { tiles, items } = tree;
  const parent = tree.parent.chain;
  const template = parent.type === 'template' ? tiles[parent.tile].value : null;
  const chainTemplate = template !== null && isChainTemplate(template); // `acético` (R-5d2)
  const ring = parent.type === 'chain' ? parent.ring !== null : !chainTemplate;
  const n = (parent.type === 'chain' && tiles[parent.root].value) || (chainTemplate && templateLength(template)) || 6;
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
  const terminal = isTerminalSuffix(tiles, tree.parent.suffix); // `oico`: its –COOH stays at carbon 1.
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
 * Reads every mutation of some acid names: every `otherName` must carry a
 * diagnosis of its family's codes whose step resolves in its explanation;
 * none is null (since phase I-51d3, diagnose.js «Acids»). The acid's own
 * mistakes among them, the deliberate nulls of phases I-51d1 and I-51d2, are
 * counted by category (acidCategory()), each with a code of its category
 * (CATEGORY_CODES) and, for `numbering`, the trace rule N0.
 *
 * @param {string[]} names - Acid names (engine names or alternatives).
 * @returns {{otherName: Object<string, number>, codes: Set<string>, own: Object<string, number>, unexpected: string[]}}
 *   `otherName` counts by family, the codes seen, the acid's own mistakes by category and the nulls.
 */
function sweep(names) {
  const otherName = Object.fromEntries(Object.keys(FAMILY_CODES).map((family) => [family, 0]));
  const codes = new Set();
  const own = {};
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
      if (!d) {
        unexpected.push(label);
        continue;
      }
      codes.add(d.code);
      assert.ok(FAMILY_CODES[mutation.family].includes(d.code), `${label}: ${d.code}, ${d.message}`);
      assert.ok(!/undefined|null|NaN|\[object|grupo –OH|grupos –OH|–CHO|C=O/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), label);
      const category = acidCategory(mutation.ids, verdict);
      if (category) {
        own[category] = (own[category] || 0) + 1;
        assert.ok(CATEGORY_CODES[category].includes(d.code), `${label}: ${category}, ${d.code}`);
        assert.ok(category !== 'numbering' || (d.traceRule === 'N0' && d.message.includes('los grupos –COOH')), `${label}: ${d.message}`);
      }
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return { otherName, codes, own, unexpected };
} // End of function sweep()

/**
 * How many mutations of the acid fixture names of phase R-5d1 (the 136 names
 * without a retained acid word) give `otherName`, by family: every one is
 * diagnosed with one of its family's codes (306). Among them, the acid's own
 * mistakes by category (acidCategory()): 145 `numbering`, a ring acid's
 * –COOH groups numbered otherwise by a reflection or a rotation —
 * deliberate nulls until phase I-51d3, now RING_NUMBERING at N0. Removing or
 * adding locants never gives `otherName`. These counts are unchanged by
 * phases R-5d2 and R-5d3.
 */
const FIXTURE_OTHER_NAME = Object.freeze({
  reversed: 0, shifted: 37, reflected: 11, rotated: 151, swapped: 11, unsorted: 25, ungrouped: 13, diBis: 13, toEnd: 43, heteroToEnd: 2,
  removed: 0, added: 0,
});
const FIXTURE_OWN = Object.freeze({ numbering: 145 });

/**
 * The same for the 10 retained acid names of the fixtures (phase R-5d2),
 * swept apart: 3 `otherName`, the substituted ftálicos rotated (`ácido
 * 5-metilftálico`, `ácido 6-metilftálico`, `ácido 6-cloroisoftálico`), every
 * one RING_NUMBERING; none of the acid's own. (The other rotations give
 * another molecule's valid form, `ácido 3-metilftálico`, or a carbon its word
 * already fills.)
 */
const TEMPLATE_FIXTURE_OTHER_NAME = Object.freeze({
  reversed: 0, shifted: 0, reflected: 0, rotated: 3, swapped: 0, unsorted: 0, ungrouped: 0, diBis: 0, toEnd: 0, heteroToEnd: 0,
  removed: 0, added: 0,
});
const TEMPLATE_FIXTURE_OWN = Object.freeze({});

test('mutations of every acid fixture name: a diagnosis of the family\'s codes, never null', async () => {
  const names = (await readFixtures()).filter((row) => isAcid(row.smiles)).flatMap((row) => row.names).filter(isAcidName);
  assert.equal(names.length, EXPECTED_NAMES);
  // The names of phase R-5d1: the same counts as before the retained acid names read.
  const earlier = names.filter((name) => !isAcidTemplateName(name));
  assert.equal(earlier.length, EXPECTED_NAMES - EXPECTED_TEMPLATE_NAMES);
  const { otherName, codes, own, unexpected } = sweep(earlier);
  assert.deepEqual(unexpected, []);
  assert.deepEqual(otherName, { ...FIXTURE_OTHER_NAME });
  assert.deepEqual(own, { ...FIXTURE_OWN });
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'BRANCH_AT_END', 'CHAIN_LOCANTS', 'LONGER_CHAIN', 'MORE_SUBSTITUENTS',
    'MULTIPLIER_KIND', 'NUMBERING', 'RING_NUMBERING', 'UNGROUPED']);
  // The retained acid names (R-5d2), swept apart.
  const templates = sweep(names.filter(isAcidTemplateName));
  assert.deepEqual(templates.unexpected, []);
  assert.deepEqual(templates.otherName, { ...TEMPLATE_FIXTURE_OTHER_NAME });
  assert.deepEqual(templates.own, { ...TEMPLATE_FIXTURE_OWN });
  assert.deepEqual([...templates.codes], ['RING_NUMBERING']);
}); // End of test 'mutations of every acid fixture name…'

test('mutations of the generated acids: every otherName is diagnosed, every step resolves', () => {
  const names = [];
  for (const mol of loopMolecules().filter((_, i) => i % 3 === 0)) { // Every generator's acids: chains, rings, benzenes.
    const naming = nameMolecule(mol);
    names.push(...[naming.name, ...naming.alternatives.map((alt) => alt.name)].filter(isAcidName));
  }
  // The names of phase R-5d1 (the seeds give 323) and, swept apart, the retained acid names of phase R-5d2 (11: the seeds give
  // 13 `otherName`, every one diagnosed — RING_NUMBERING on a ftálico renumbered, ALPHABETICAL_ORDER, UNGROUPED and
  // MULTIPLIER_KIND —, none of the acid's own).
  const earlier = names.filter((name) => !isAcidTemplateName(name));
  assert.ok(earlier.length >= 320, `${earlier.length} names`);
  const templates = sweep(names.filter(isAcidTemplateName));
  assert.deepEqual(templates.unexpected, []);
  assert.equal(names.length - earlier.length, 11);
  assert.deepEqual([Object.values(templates.otherName).reduce((sum, count) => sum + count, 0), templates.own], [13, {}]);
  assert.deepEqual([...templates.codes].sort(), ['ALPHABETICAL_ORDER', 'MULTIPLIER_KIND', 'RING_NUMBERING', 'UNGROUPED']);
  const { otherName, codes, own, unexpected } = sweep(earlier);
  assert.deepEqual(unexpected, []);
  const total = Object.values(otherName).reduce((sum, count) => sum + count, 0);
  // The seeds give 911, unchanged by phases R-5d2 and R-5d3, every one diagnosed; 380 of them the acid's own mistakes, a ring
  // acid's –COOH groups numbered otherwise (`numbering`: deliberate nulls until phase I-51d3, now RING_NUMBERING at N0).
  assert.deepEqual([total, own], [911, { numbering: 380 }]);
  assert.deepEqual([otherName.removed, otherName.added], [0, 0]);
  for (const code of ['NUMBERING', 'RING_NUMBERING', 'ALPHABETICAL_ORDER', 'UNGROUPED', 'MULTIPLIER_KIND', 'BRANCH_AT_END',
    'LONGER_CHAIN', 'MORE_SUBSTITUENTS', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS']) {
    assert.ok(codes.has(code), `${code}: ${[...codes]}`);
  }
}); // End of test 'mutations of the generated acids…' 

// ---------------------------------------------------------------------------
// The drawing, the dialog, robustness and time.
// ---------------------------------------------------------------------------

test('«Dibujar» (R-5d1): acid verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const name of ['ácido butanoico', 'ácido butanodioico', 'ácido ciclohexanocarboxílico', 'ácido ciclohexano-1,4-dicarboxílico',
    'ácido benzoico', 'ácido 4-metilbenzoico', 'ácido benceno-1,3-dicarboxílico', 'ácido 3-oxobutanoico',
    'ácido 2-(carboximetil)ciclohexano-1-carboxílico', 'ácido 2-butenoico', 'carboxiciclohexano']) {
    const verdict = read(name);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-5d1)…'

test('dialog (R-5d1): the acid tiles have tooltips', () => {
  for (const id of [ACID_WORD_ID, CARBOXY_ID, OICO_ID, CARBOXYLIC_ID, BENZOIC_ID]) {
    assert.ok(TILE_HINTS[id] && TILE_HINTS[id].endsWith('.'), id);
  }
  assert.match(TILE_HINTS[ACID_WORD_ID], /al principio del nombre/);
  assert.match(TILE_HINTS[OICO_ID], /ácido butanoico; con dos, ácido butanodioico/);
  assert.match(TILE_HINTS[CARBOXYLIC_ID], /ácido ciclohexanocarboxílico/);
  assert.match(TILE_HINTS[CARBOXY_ID], /\(carboximetil\)/);
  assert.equal(TILE_HINTS[BENZOIC_ID], 'Benceno con un grupo COOH: ácido bencenocarboxílico. Va detrás de «ácido»: ácido benzoico.');
}); // End of test 'dialog (R-5d1)…'

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

test('property (R-5d1): random acid names — any parent and suffix, locants or none, `ácido` or not — never crash', () => {
  const random = mulberry32(20261015);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const branches = ['carboxi', 'met il', 'cloro', 'hidroxi', 'oxo', 'met il oxi', 'START carboxi met il END', 'START 4 carboxi fenil END',
    'acetil', 'fenil', 'ciclo hex il'];
  const parents = ['met ano oico', 'et ano oico', 'but ano di oico', 'pent ano oico', 'prop 2 eno oico', 'ciclo hex ano carboxílico',
    'ciclo hex ano 1 4 di carboxílico', 'benceno carboxílico', 'benceno 1 3 di carboxílico', 'benzoico', 'ciclo pent ano carboxílico',
    'but ano al', 'prop ano ona'];
  const multipliers = { 1: '', 2: 'di', 3: 'tri' };
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const prefixes = Array.from({ length: int(0, 2) }, () => {
      const count = int(1, 3);
      const located = random() < 0.6;
      const locants = located ? Array.from({ length: count }, () => int(1, 6)).join(' ') : '';
      return [locants, multipliers[count], pick(branches)].join(' ');
    });
    const words = [random() < 0.9 ? 'ácido' : '', ...prefixes, pick(parents)].join(' ');
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
}); // End of test 'property (R-5d1): random acid names…'

test('time budget: acid readName() calls, with their diagnosis, well within budget', () => {
  const names = ['ácido butanodioico', 'ácido ciclohexano-1,4-dicarboxílico', 'ácido 2-(carboximetil)ciclohexano-1-carboxílico',
    'ácido benzoico', 'ácido 3-oxobutanoico', 'ácido 2-butenoico', 'ácido met il but ano oico', 'ácido met il ciclo hex ano carboxílico',
    'ácido di met il benzoico', 'ácido 4 met il hex ano di oico'];
  names.forEach((name) => read(name)); // Warm-up.
  for (const name of names) {
    const start = performance.now();
    const verdict = read(name);
    const ms = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', name);
    assert.ok(ms < PER_NAME_BUDGET_MS, `${name}: ${ms.toFixed(1)} ms`);
  }
}); // End of test 'time budget…'
