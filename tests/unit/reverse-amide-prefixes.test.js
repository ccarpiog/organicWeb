/**
 * @file Unit tests for the amide prefixes in «¿Cómo se dibuja?» (src/reverse/,
 * design.md §15.5.2, §15.5.3, §15.7, §15.8 R-6d; phase I-52d2, R-6d2): the
 * «Grupos» row's `carbamoil` (the whole –CONH₂ as a prefix, bonded by its
 * C=O carbon: `ácido 3-carbamoilpentanodioico`, `ácido
 * 2,2-dicarbamoilbutanoico`, `ácido 4-carbamoilbenzoico`) with the groups on
 * its nitrogen written before it as the own chain of a compound branch, as
 * the forward engine writes them (`(metilcarbamoil)`, `(dimetilcarbamoil)`,
 * `[etil(metil)carbamoil]`, `bis(metilcarbamoil)`), and the acylamino
 * prefixes, an acyl word or ending among the groups on an amino prefix's
 * nitrogen (`(acetilamino)`, `(formilamino)`, `[acetil(metil)amino]`,
 * `[(2-metilpropanoil)amino]`, `(benzoilamino)`). Parser (the tree, the
 * groups' locants refused with their tile ranges and hints, `carbamoil` out of
 * place), assembler (every form checked against the forward engine's own
 * text) and tokenizer, interpreter (the carbamoyl SubstituentSpec, its
 * groups' implicit slots), builder (the C=O carbon, its =O and the nitrogen
 * with its groups, VALENCE on a third group, the caps), search (left-out
 * locants: missingLocants, ambiguous, incomplete), readName() verdicts with
 * the molecule each describes (compared by aromatic key with a SMILES), the
 * engine's refusals (an imide, a halogen on the nitrogen), mutations and
 * their diagnosis (the shared rules, which hold for these prefixes; the
 * amide's own mistakes deliberate nulls of diagnose.js «Amides» until phase
 * I-52d4, each with its category read independently), the fixture round trip
 * over every row of tests/fixtures/names.tsv with an amide prefix and the
 * closed loop over the oracle's generators that write them (pure imports, no
 * Java), the diagnosis sweeps with exact counts, the ordered drawing, the
 * dialog's tooltips, robustness and time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse, isTerminalSuffix } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build, specAtoms, specCarbons } from '../../src/reverse/build.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { slotGroups } from '../../src/reverse/search.js';
import {
  CARBAMOYL_ID, CARBAMOYL_KIND, AMINO_ID, AMINO_KIND, AMIDA_ID, CARBOXAMIDE_ID, BENZAMIDE_ID, isChainTemplate, templateLength,
} from '../../src/reverse/tiles.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { TILE_HINTS } from '../../src/ui/name-builder.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { esterParts } from '../../src/naming/structure.js';
import {
  generateAmidePrefixes, generateSubstitutedBenzoyls, generateRingNitrilesAmides, generateRingOutsideBenzenes,
  generateRingPolysuffixBenzenes, generateAcyl,
} from '../../scripts/oracle/generate.mjs';
import {
  seq, readFixtures, isAmide, isAmidePrefixName, isR6d2AmideName, isLaterAmideName, isAmideTemplateName, hasAcylamino, CARBAMOYL_WORD,
} from './reverse-words.js';

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
    ids = null; // A name text: `ácido 3-(metilcarbamoil)pentanodioico`.
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
 * How many times a word stands in a text.
 *
 * @param {string} name - The text.
 * @param {string} word - The word.
 * @returns {number} The count.
 */
function countOf(name, word) {
  return name.split(word).length - 1;
}

// ---------------------------------------------------------------------------
// Parser.
// ---------------------------------------------------------------------------

test('parser (R-6d2): `carbamoil` a retained word, alone or the own chain of a compound branch; an acyl group on `amino`\'s nitrogen', () => {
  // 0:ácido 1:3 2:START 3:met 4:il 5:carbamoil 6:END 7:pent 8:ano 9:di 10:oico
  const { tree, errors } = parse(seq('ácido 3 START met il carbamoil END pent ano di oico'));
  assert.deepEqual(errors, []);
  const branch = tree.items[0].substituent;
  assert.deepEqual([branch.type, branch.chain.type, tree.tiles[branch.chain.tile].id, branch.items.length], ['branch', 'retained',
    CARBAMOYL_ID, 1]);
  assert.deepEqual(branch.items[0].locants, []);
  // Bare, multiplied, inside a compound branch, on a ring, beside the other families; an acyl group on an amino prefix's nitrogen.
  for (const words of ['ácido 3 carbamoil pent ano di oico', 'ácido 2 2 di carbamoil but ano oico', 'ácido 4 carbamoil benzoico',
    'ácido 2 2 bis START met il carbamoil END but ano oico', '2 START 4 carbamoil ciclo hex il END but ano di amida',
    '3 carbamoil pent ano di oato di met ilo', 'ácido 2 START acetil amino END et ano oico', 'ácido 2 START acetil met il amino END et ano oico',
    'ácido 2 START prop ano oil amino END et ano oico', 'ácido 2 START ciclo hex ano carbonil amino END et ano oico',
    'ácido 2 START START 4 met il benzoil END amino END et ano oico', '2 START acetil amino END N met il et ano amida',
    // The chemistry of these is build.js's and the engine's (VALENCE; an imide; a halogen on the nitrogen).
    'ácido 3 START tri met il carbamoil END pent ano di oico', 'ácido 3 START acetil carbamoil END pent ano di oico',
    'ácido 2 START di acetil amino END et ano oico', 'ácido 3 START cloro carbamoil END pent ano di oico']) {
    assert.deepEqual(errorsOf(words), [], words);
  }
}); // End of test 'parser (R-6d2): `carbamoil` a retained word…'

test('parser (R-6d2): the groups on a carbamoyl prefix\'s nitrogen take no locants or letters; `carbamoil` out of place', () => {
  const place = 'Esta ficha no puede ir aquí: los grupos unidos al nitrógeno de «carbamoil» van delante de «carbamoil», sin números ni '
    + 'letras: (metilcarbamoil), (dimetilcarbamoil), [etil(metil)carbamoil]. Si un grupo lleva sus propias ramas, va en su propia rama '
    + 'compuesta, con sus números dentro: [(2-cloroetil)carbamoil].';
  for (const [words, errors] of [
    ['ácido 3 START 2 met il carbamoil END pent ano di oico', ['TILE_ORDER[3,4)']],
    ['ácido 3 START N met il carbamoil END pent ano di oico', ['TILE_ORDER[3,4)']], // not the `N` locant's own hint
    ['ácido 3 START o met il carbamoil END pent ano di oico', ['TILE_ORDER[3,4)']], // no POSITIONAL besides
    ['3 START o met il carbamoil END pent ano di oato di met ilo', ['TILE_ORDER[2,3)']],
  ]) {
    assert.deepEqual(errorsOf(words), errors, words);
    assert.equal(messageOf(words), place, words);
  }
  // An amino prefix keeps its own hint, also around an acyl group.
  assert.match(messageOf('ácido 2 START 1 acetil amino END et ano oico'), /los grupos unidos al nitrógeno de «amino» van delante de «amino»/);
  // `oxi` after `carbamoil`, `carbamoil` in an ether's class name or as an ester's O-bound group.
  const lead = 'Esta ficha no puede ir aquí: ';
  for (const [words, errors, message] of [
    ['ácido 3 carbamoil oxi pent ano di oico', ['TILE_ORDER[3,4)'], `${lead}«oxi» no va detrás de «carbamoil»: un grupo amida unido a un `
      + 'oxígeno no forma un éter.'],
    ['carbamoil met il éter', ['TILE_ORDER[0,1)'], `${lead}«carbamoil» no va en un nombre con «éter»: un grupo amida unido al oxígeno no `
      + 'forma un éter. Los dos grupos de un éter son cadenas o anillos de carbonos (etil metil éter).'],
    ['et ano oato carbamoil ilo', ['TILE_ORDER[3,4)'], `${lead}«carbamoil» no va unido al oxígeno de un éster: el grupo unido al oxígeno es `
      + 'una cadena o un anillo de carbonos que acaba en «ilo» (etanoato de metilo).'],
    // A name that ends in a carbamoyl prefix ends in «un grupo»; two locants before a compound one ask for `bis`.
    ['3 carbamoil', ['ENDS_WITH_BRANCH[0,2)'], 'El nombre acaba en un grupo («carbamoil»): falta la cadena principal detrás.'],
    ['START met il carbamoil END', ['ENDS_WITH_BRANCH[0,5)'], 'El nombre acaba en un grupo («(metilcarbamoil)»): falta la cadena '
      + 'principal detrás.'],
    ['ácido 2 START acetil amino END', ['ENDS_WITH_BRANCH[1,6)'], 'El nombre acaba en un grupo («(acetilamino)»): falta la cadena '
      + 'principal detrás.'],
    ['ácido 2 2 START met il carbamoil END but ano oico', ['LOCANT_COUNT[1,3)'], 'Con dos números hace falta «bis».'],
    // After the parent, `carbamoil` is a branch out of place.
    ['et ano amida carbamoil', ['TILE_ORDER[3,4)'], null],
  ]) {
    assert.deepEqual(errorsOf(words), errors, words);
    if (message) {
      assert.equal(messageOf(words), message, words);
    }
  } // End of the loop over the misplaced tiles
}); // End of test 'parser (R-6d2): the groups on a carbamoyl prefix\'s nitrogen…'

test('parser (R-6d2): the amide hints name `carbamoil`, the amides\' branch form, as the nitrile hints name `ciano`', () => {
  const lead = 'Esta ficha no puede ir aquí: ';
  assert.equal(messageOf('amida et ano'), `${lead}«amida» va al final del nombre, detrás de la terminación de la cadena principal `
    + '(etanamida, butanodiamida); en una rama, el grupo amida se escribe «carbamoil» ((4-carbamoilciclohexil)).');
  assert.equal(messageOf('carboxamida ciclo hex ano'), `${lead}«carboxamida» va al final del nombre, detrás del nombre del anillo principal `
    + '(ciclohexanocarboxamida); en una rama, el grupo amida se escribe «carbamoil».');
  // Review of phase I-52d2: no `(4-carbamoilfenil)` — a benzene with an amide group in a branch is the engine's CYCLE refusal
  // (`ácido 2-(4-carbamoilfenil)etanoico` is outOfScope) —, but a complete name the engine writes, and the limit said.
  assert.equal(parse(seq('START 4 met il benzamida END met ano')).errors[0].message, `${lead}«benzamida» es el nombre de toda la molécula `
    + 'y va al final (4-metilbenzamida). En una rama, el grupo amida se escribe «carbamoil» (ácido 2-(4-carbamoilciclohexil)etanoico), '
    + 'pero de momento no sé nombrar una rama con un benceno que lleve un grupo amida.');
  assert.equal(read('ácido 2-(4-carbamoilfenil)etanoico').kind, 'outOfScope');
  // The example the `amida` hint gives is the engine's own form.
  assert.ok(namesOf('OC(=O)CC1CCC(C(N)=O)CC1').includes('ácido 2-(4-carbamoilciclohexil)etanoico'));
  // Every example the hints and tooltips of this phase cite reads as the engine's name (a branch form inside a complete name of
  // the engine's: FORMS); `etil metil éter` (classCarbamoyl's, from R-5b2) is the engine's functional-class alternative.
  const cited = [
    'etanamida', 'butanodiamida', 'ácido 2-(4-carbamoilciclohexil)etanoico', // amida
    'ciclohexanocarboxamida', '4-metilbenzamida', // carboxamida, benzamida (with amida's complete name)
    'ácido 3-(metilcarbamoil)pentanodioico', 'ácido 3-(dimetilcarbamoil)pentanodioico', 'ácido 3-[etil(metil)carbamoil]pentanodioico',
    'ácido 3-[(2-cloroetil)carbamoil]pentanodioico', // carbamoylLocant
    'etanoato de metilo', // `carbamoil` as an ester's O-bound group
    'ácido 3-carbamoilpentanodioico', 'ácido 4-carbamoilbenzoico', // the `carbamoil` tooltip (with the carbamoylLocant forms)
    'ácido 2-(acetilamino)etanoico', 'ácido 2-[acetil(metil)amino]etanoico', // the `amino` tooltip's acylamino forms
  ];
  for (const name of cited) {
    const verdict = read(name);
    assert.equal(verdict.kind, 'correct', `${name}: ${verdict.kind} ${verdict.message || ''}`);
  }
  assert.equal(read('etil metil éter').kind, 'alternative');
}); // End of test 'parser (R-6d2): the amide hints…'

// ---------------------------------------------------------------------------
// Assembler and tokenizer.
// ---------------------------------------------------------------------------

/** Amide-prefix forms (tile words) and a SMILES whose engine names include the assembled text. */
const FORMS = Object.freeze([
  ['ácido 3 carbamoil pent ano di oico', 'OC(=O)CC(C(N)=O)CC(=O)O'],
  ['ácido 2 2 di carbamoil but ano oico', 'OC(=O)C(C(N)=O)(C(N)=O)CC'],
  ['ácido 4 carbamoil ciclo hex ano 1 carboxílico', 'OC(=O)C1CCC(C(N)=O)CC1'],
  ['3 carbamoil pent ano di oato di met ilo', 'COC(=O)CC(C(N)=O)CC(=O)OC'],
  ['2 START 4 carbamoil ciclo hex il END but ano di amida', 'NC(=O)CC(C(N)=O)C1CCC(C(N)=O)CC1'],
  ['ácido 4 carbamoil benzoico', 'NC(=O)C1=CC=C(C(O)=O)C=C1'],
  ['ácido p carbamoil benzoico', 'NC(=O)C1=CC=C(C(O)=O)C=C1'],
  ['ácido 4 carbamoil benceno 1 carboxílico', 'NC(=O)C1=CC=C(C(O)=O)C=C1'],
  ['ácido 3 START met il carbamoil END pent ano di oico', 'OC(=O)CC(C(=O)NC)CC(=O)O'],
  ['ácido 3 START di met il carbamoil END pent ano di oico', 'OC(=O)CC(C(=O)N(C)C)CC(=O)O'],
  ['ácido 3 START et il met il carbamoil END pent ano di oico', 'OC(=O)CC(C(=O)N(C)CC)CC(=O)O'],
  ['ácido 3 START di et il carbamoil END pent ano di oico', 'OC(=O)CC(C(=O)N(CC)CC)CC(=O)O'],
  ['ácido 3 START isopropil carbamoil END pent ano di oico', 'OC(=O)CC(C(=O)NC(C)C)CC(=O)O'],
  ['ácido 3 START prop ano 2 il carbamoil END pent ano di oico', 'OC(=O)CC(C(=O)NC(C)C)CC(=O)O'],
  ['ácido 3 START START 1 met il et il END carbamoil END pent ano di oico', 'OC(=O)CC(C(=O)NC(C)C)CC(=O)O'],
  ['ácido 3 START tert-butil carbamoil END pent ano di oico', 'OC(=O)CC(C(=O)NC(C)(C)C)CC(=O)O'],
  ['ácido 2 2 bis START met il carbamoil END but ano oico', 'OC(=O)C(C(=O)NC)(C(=O)NC)CC'],
  ['ácido 3 START fenil carbamoil END pent ano di oico', 'OC(=O)CC(C(=O)NC1=CC=CC=C1)CC(=O)O'],
  ['ácido 3 START ciclo hex il carbamoil END pent ano di oico', 'OC(=O)CC(C(=O)NC1CCCCC1)CC(=O)O'],
  ['ácido 3 START START 2 cloro et il END carbamoil END pent ano di oico', 'OC(=O)CC(C(=O)NCCCl)CC(=O)O'],
  ['ácido 3 START bis START 2 cloro et il END carbamoil END pent ano di oico', 'OC(=O)CC(C(=O)N(CCCl)CCCl)CC(=O)O'],
  ['ácido 3 START prop 2 eno 1 il carbamoil END pent ano di oico', 'OC(=O)CC(C(=O)NCC=C)CC(=O)O'],
  ['ácido 3 START START 4 met il fenil END carbamoil END pent ano di oico', 'OC(=O)CC(C(=O)NC1=CC=C(C)C=C1)CC(=O)O'],
  ['ácido 4 START met il carbamoil END ciclo hex ano 1 carboxílico', 'OC(=O)C1CCC(C(=O)NC)CC1'],
  ['ácido 4 START met il carbamoil END benzoico', 'CNC(=O)C1=CC=C(C(O)=O)C=C1'],
  ['ácido 4 carbamoil hex ano oico', 'OC(=O)CCC(C(N)=O)CC'],
  ['ácido 2 START 4 carbamoil ciclo hex il END et ano oico', 'OC(=O)CC1CCC(C(N)=O)CC1'],
  ['4 carbamoil ciclo hex ano 1 carboxilato met ilo', 'COC(=O)C1CCC(C(N)=O)CC1'],
  ['ácido 2 START acetil amino END et ano oico', 'CC(=O)NCC(=O)O'],
  ['ácido 2 START formil amino END et ano oico', 'O=CNCC(=O)O'],
  ['ácido 2 START prop ano oil amino END et ano oico', 'CCC(=O)NCC(=O)O'],
  ['ácido 2 START acetil met il amino END et ano oico', 'CC(=O)N(C)CC(=O)O'],
  ['ácido 2 START met il prop ano oil amino END et ano oico', 'CCC(=O)N(C)CC(=O)O'],
  ['2 START acetil amino END et ano amida', 'CC(=O)NCC(N)=O'],
  ['3 START acetil amino END prop ano amida', 'CC(=O)NCCC(N)=O'],
  ['2 START acetil amino END N met il et ano amida', 'CNC(=O)CNC(C)=O'],
  ['3 START acetil amino END pent ano di amida', 'NC(=O)CC(CC(N)=O)NC(C)=O'],
  ['2 START acetil amino END N START 2 amino 2 oxo et il END et ano amida', 'NC(=O)CNC(=O)CNC(C)=O'],
  ['ácido 2 START benzoil amino END et ano oico', 'OC(=O)CNC(=O)C1=CC=CC=C1'],
  ['ácido 2 START ciclo hex ano carbonil amino END et ano oico', 'OC(=O)CNC(=O)C1CCCCC1'],
  ['ácido 2 START START 2 met il prop ano oil END amino END et ano oico', 'OC(=O)CNC(=O)C(C)C'],
  ['ácido 2 START prop 2 eno oil amino END et ano oico', 'OC(=O)CNC(=O)C=C'],
  ['ácido 2 START START 4 met il benzoil END amino END et ano oico', 'OC(=O)CNC(=O)C1=CC=C(C)C=C1'],
  ['ácido 2 START START 2 cloro et ano oil END amino END et ano oico', 'OC(=O)CNC(=O)CCl'],
  ['ácido 2 2 bis START acetil amino END et ano oico', 'OC(=O)C(NC(C)=O)NC(C)=O'],
  ['2 START acetil amino END et ano oato met ilo', 'CC(=O)NCC(=O)OC'],
  ['et ano oato 2 START acetil amino END et ilo', 'CC(=O)NCCOC(C)=O'],
  ['acetato 2 START acetil amino END et ilo', 'CC(=O)NCCOC(C)=O'],
  ['ácido 4 START acetil amino END ciclo hex ano 1 carboxílico', 'OC(=O)C1CCC(NC(C)=O)CC1'],
  ['4 START acetil amino END ciclo hex ano 1 carboxilato met ilo', 'COC(=O)C1CCC(NC(C)=O)CC1'],
  ['ácido 2 START START acetil amino END met il END but ano di oico', 'OC(=O)CC(CNC(C)=O)C(=O)O'],
]);

test('assembler (R-6d2): every carbamoyl and acylamino form is the forward engine\'s own text; the tokenizer reads it back', () => {
  const texts = [];
  for (const [words, smiles] of FORMS) {
    const assembled = text(words);
    texts.push(assembled);
    assert.ok(namesOf(smiles).includes(assembled), `${words} → ${assembled}`);
    const ids = tokenize(assembled);
    assert.ok(ids, `no tiles for ${assembled}`);
    assert.equal(assemble(parse(ids).tree).text, assembled);
  } // End of the loop over the forms
  // The brief's forms: `carbamoil` simple (di, no marks); with groups on its nitrogen enclosed and compound (bis); acylamino enclosed.
  assert.deepEqual(texts.slice(0, 6), ['ácido 3-carbamoilpentanodioico', 'ácido 2,2-dicarbamoilbutanoico',
    'ácido 4-carbamoilciclohexano-1-carboxílico', '3-carbamoilpentanodioato de dimetilo', '2-(4-carbamoilciclohexil)butanodiamida',
    'ácido 4-carbamoilbenzoico']);
  assert.deepEqual(texts.slice(8, 17), ['ácido 3-(metilcarbamoil)pentanodioico', 'ácido 3-(dimetilcarbamoil)pentanodioico',
    'ácido 3-[etil(metil)carbamoil]pentanodioico', 'ácido 3-(dietilcarbamoil)pentanodioico', 'ácido 3-(isopropilcarbamoil)pentanodioico',
    'ácido 3-[(propan-2-il)carbamoil]pentanodioico', 'ácido 3-[(1-metiletil)carbamoil]pentanodioico',
    'ácido 3-(tert-butilcarbamoil)pentanodioico', 'ácido 2,2-bis(metilcarbamoil)butanoico']);
  assert.deepEqual([texts[28], texts[29], texts[31], texts[33], texts[37]], ['ácido 2-(acetilamino)etanoico', 'ácido 2-(formilamino)etanoico',
    'ácido 2-[acetil(metil)amino]etanoico', '2-(acetilamino)etanamida', '2-(acetilamino)-N-(2-amino-2-oxoetil)etanamida']);
  // The student's multipliers and order are kept: the diagnosis names them.
  assert.deepEqual(['ácido 3 START met il et il carbamoil END pent ano di oico', 'ácido 3 START met il met il carbamoil END pent ano di oico',
    'ácido 2 2 di START met il carbamoil END but ano oico', 'ácido 2 2 bis carbamoil but ano oico',
    'ácido 2 START met il acetil amino END et ano oico'].map(text), ['ácido 3-[metil(etil)carbamoil]pentanodioico',
    'ácido 3-[metil(metil)carbamoil]pentanodioico', 'ácido 2,2-di(metilcarbamoil)butanoico', 'ácido 2,2-biscarbamoilbutanoico',
    'ácido 2-[metil(acetil)amino]etanoico']);
  // The spans: the controls carry the outer marks, the automatic ones around every group after the first have no tile.
  const words = 'ácido 3 START et il met il carbamoil END pent ano di oico';
  const { spans } = assemble(parse(seq(words)).tree);
  assert.deepEqual(spans.slice(3, 13).map((span) => [span.tile, text(words).slice(span.from, span.to)]), [[null, '-'], [2, '['], [3, 'et'],
    [4, 'il'], [null, '('], [5, 'met'], [6, 'il'], [null, ')'], [7, 'carbamoil'], [8, ']']]);
}); // End of test 'assembler (R-6d2)…'

test('tokenizer (R-6d2): the amide prefixes read; the retained amide names read since R-6d3, swept apart', () => {
  assert.deepEqual(tokenize('ácido 3-[etil(metil)carbamoil]pentanodioico'), seq('ácido 3 START et il met il carbamoil END pent ano di oico'));
  assert.deepEqual(tokenize('ácido 2,2-dicarbamoilbutanoico'), seq('ácido 2 2 di carbamoil but ano oico'));
  assert.deepEqual(tokenize('ácido 2-[acetil(metil)amino]etanoico'), seq('ácido 2 START acetil met il amino END et ano oico'));
  assert.deepEqual(tokenize('ácido 2-(benzoilamino)etanoico'), seq('ácido 2 START benzoil amino END et ano oico'));
  // R-6d3: the retained amide names are «Nombres tradicionales» tiles (reverse-amide-templates.test.js), never R-6d2 names.
  for (const name of ['acetamida', 'N-metilacetamida', '2-fenilacetamida', 'ftalamida', 'N,N-dimetilformamida']) {
    assert.ok(tokenize(name), name);
    assert.ok(isAmideTemplateName(name) && !isLaterAmideName(name) && !isR6d2AmideName(name), name);
  }
  // The helpers that set the R-6d2 names apart (reverse-words.js).
  assert.deepEqual(['ácido 3-carbamoilpentanodioico', 'ácido 2-(acetilamino)etanoico', 'ácido 4-amino-4-oxobutanoico', 'etanamida',
    'N-(cianometil)acetamida'].map(isR6d2AmideName), [true, true, false, false, false]);
  assert.deepEqual(['ácido 3-carbamoilpentanodioico', 'ácido 2-(acetilamino)etanoico', '2-[(2-acetiletil)amino]etan-1-ol']
    .map(isAmidePrefixName), [true, true, false]);
  assert.equal(CARBAMOYL_WORD, 'carbamoil');
}); // End of test 'tokenizer (R-6d2)…'

// ---------------------------------------------------------------------------
// Interpreter and builder.
// ---------------------------------------------------------------------------

test('interpreter (R-6d2): the carbamoyl SubstituentSpec — the nitrogen\'s groups at its one place; an acyl group on `amino`\'s nitrogen', () => {
  const sub = specOf('ácido 3 START di met il carbamoil END pent ano di oico').prefixes[0].substituent;
  assert.deepEqual([sub.kind, sub.length, sub.retained, sub.acyl, sub.alkoxy, sub.compound], [CARBAMOYL_KIND, 1, CARBAMOYL_KIND, false,
    false, true]);
  assert.deepEqual([sub.freeValence.slot.kind, sub.freeValence.slot.value, sub.freeValence.order], ['implicit', 1, 1]);
  assert.deepEqual(sub.prefixes.map((p) => [p.multiplier.count, p.slots.map((slot) => [slot.kind, slot.value, slot.domain])]),
    [[2, [['implicit', 1, [1, 1]], ['implicit', 1, [1, 1]]]]]);
  const bare = specOf('ácido 3 carbamoil pent ano di oico').prefixes[0].substituent;
  assert.deepEqual([bare.kind, bare.prefixes, bare.word.text], [CARBAMOYL_KIND, [], 'carbamoil']);
  // An acylamino prefix: an amino prefix whose group is an acyl branch.
  const amino = specOf('ácido 2 START acetil met il amino END et ano oico').prefixes[0].substituent;
  assert.deepEqual([amino.kind, amino.prefixes.map((p) => [p.substituent.retained, p.substituent.acyl])], [AMINO_KIND,
    [['acetyl', true], [null, false]]]);
  // Left out: the prefix's own locant; never `N` (a carbamoyl prefix on an amide's nitrogen would be an imide).
  assert.deepEqual(slotGroups(specOf('ácido carbamoil pent ano di oico')).map((g) => g.domain), [[1, 5]]);
  assert.deepEqual(slotGroups(specOf('carbamoil N met il et ano amida')).map((g) => g.domain), [[1, 2]]);
}); // End of test 'interpreter (R-6d2)…'

/**
 * The bonds of each nitrogen of a molecule: its neighbours' elements and
 * bond orders, the nitrogens sorted.
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

test('builder (R-6d2): the C=O carbon, its =O and the nitrogen of `carbamoil`; the groups on that nitrogen; the caps; VALENCE', () => {
  const cases = [
    ['ácido 3 carbamoil pent ano di oico', ['C1']],
    ['ácido 3 START met il carbamoil END pent ano di oico', ['C1 C1']],
    ['ácido 3 START di met il carbamoil END pent ano di oico', ['C1 C1 C1']],
    ['ácido 2 START acetil amino END et ano oico', ['C1 C1']],
    ['ácido 2 START acetil met il amino END et ano oico', ['C1 C1 C1']],
  ];
  for (const [words, bonds] of cases) {
    const built = build(specOf(words), []);
    assert.ok(built.ok, words);
    assert.deepEqual(nitrogenBonds(built.molecule), bonds, words);
  }
  // The occurrence of a carbamoyl prefix: its C=O carbon the attachment, the =O and the nitrogen on it, then the groups.
  const built = build(specOf('ácido 3 START met il carbamoil END pent ano di oico'), []);
  const [occurrence] = built.prefixAtoms;
  const { molecule } = built;
  const [carbon, oxygen, nitrogen, methyl] = occurrence.atoms;
  assert.deepEqual([occurrence.attachment, occurrence.locant, occurrence.atoms.length], [carbon, 3, 4]);
  assert.deepEqual([carbon, oxygen, nitrogen, methyl].map((id) => molecule.atoms.get(id).element), ['C', 'O', 'N', 'C']);
  // Every bond of the C=O carbon: the parent's carbon 3 (1), its =O (2) and the nitrogen (1); the carbon is full.
  const orders = [...molecule.bonds.values()].filter((b) => b.a === carbon || b.b === carbon).map((b) => b.order).sort();
  assert.deepEqual(orders, [1, 1, 2]);
  // The caps: a carbamoyl prefix is one carbon and three heavy atoms besides its groups.
  assert.deepEqual(['ácido 3 carbamoil pent ano di oico', 'ácido 3 START di met il carbamoil END pent ano di oico',
    'ácido 2 START acetil amino END et ano oico'].map((words) => [specCarbons(specOf(words)), specAtoms(specOf(words))]),
  [[6, 12], [8, 14], [4, 8]]);
  // VALENCE on a third group on the nitrogen, blamed on the group that adds it.
  for (const [words, tiles, message] of [
    ['ácido 3 START tri met il carbamoil END pent ano di oico', [3, 6], 'El nitrógeno del grupo carbamoil tendría 4 enlaces, y un '
      + 'nitrógeno solo puede tener 3.'],
    ['ácido 3 START et il di met il carbamoil END pent ano di oico', [5, 8], 'El nitrógeno del grupo carbamoil tendría 4 enlaces, y un '
      + 'nitrógeno solo puede tener 3.'],
    ['ácido 2 START acetil di met il amino END et ano oico', [4, 7], 'El nitrógeno del grupo amino tendría 4 enlaces, y un nitrógeno solo '
      + 'puede tener 3.'],
  ]) {
    const verdict = read(words);
    assert.equal(verdict.kind, 'invalid', `${words}: ${verdict.message}`);
    assert.deepEqual([verdict.errors[0].code, [verdict.errors[0].from, verdict.errors[0].to]], ['VALENCE', tiles], words);
    assert.equal(verdict.message, message, words);
  } // End of the loop over the VALENCE cases
  // A carbamoyl prefix on a carbon that has no bond left: VALENCE on that carbon.
  assert.equal(read('2 2 2 2 tetra carbamoil et ano oico').kind, 'invalid');
}); // End of test 'builder (R-6d2)…'

// ---------------------------------------------------------------------------
// readName(): verdicts, search, out-of-scope names.
// ---------------------------------------------------------------------------

/**
 * readName() cases: tile words or a name, the verdict, the engine's name
 * and the SMILES of the molecule drawn.
 */
const CASES = Object.freeze([
  // The brief's names.
  ['ácido 3-carbamoilpentanodioico', 'correct', 'ácido 3-carbamoilpentanodioico', 'OC(=O)CC(C(N)=O)CC(=O)O'],
  ['ácido 2,2-dicarbamoilbutanoico', 'correct', 'ácido 2,2-dicarbamoilbutanoico', 'OC(=O)C(C(N)=O)(C(N)=O)CC'],
  ['ácido 4-carbamoilciclohexano-1-carboxílico', 'correct', 'ácido 4-carbamoilciclohexano-1-carboxílico', 'OC(=O)C1CCC(C(N)=O)CC1'],
  ['3-carbamoilpentanodioato de dimetilo', 'correct', '3-carbamoilpentanodioato de dimetilo', 'COC(=O)CC(C(N)=O)CC(=O)OC'],
  ['2-(4-carbamoilciclohexil)butanodiamida', 'correct', '2-(4-carbamoilciclohexil)butanodiamida', 'NC(=O)CC(C(N)=O)C1CCC(C(N)=O)CC1'],
  ['ácido 4-carbamoilbenzoico', 'correct', 'ácido 4-carbamoilbenzoico', 'NC(=O)C1=CC=C(C(O)=O)C=C1'],
  ['ácido 3-(metilcarbamoil)pentanodioico', 'correct', 'ácido 3-(metilcarbamoil)pentanodioico', 'OC(=O)CC(C(=O)NC)CC(=O)O'],
  ['ácido 3-(dimetilcarbamoil)pentanodioico', 'correct', 'ácido 3-(dimetilcarbamoil)pentanodioico', 'OC(=O)CC(C(=O)N(C)C)CC(=O)O'],
  ['ácido 3-[etil(metil)carbamoil]pentanodioico', 'correct', 'ácido 3-[etil(metil)carbamoil]pentanodioico', 'OC(=O)CC(C(=O)N(C)CC)CC(=O)O'],
  ['ácido 3-(isopropilcarbamoil)pentanodioico', 'correct', 'ácido 3-(isopropilcarbamoil)pentanodioico', 'OC(=O)CC(C(=O)NC(C)C)CC(=O)O'],
  ['ácido 3-[(propan-2-il)carbamoil]pentanodioico', 'alternative', 'ácido 3-(isopropilcarbamoil)pentanodioico',
    'OC(=O)CC(C(=O)NC(C)C)CC(=O)O'],
  ['ácido 3-[(1-metiletil)carbamoil]pentanodioico', 'alternative', 'ácido 3-(isopropilcarbamoil)pentanodioico',
    'OC(=O)CC(C(=O)NC(C)C)CC(=O)O'],
  ['ácido 2,2-bis(metilcarbamoil)butanoico', 'correct', 'ácido 2,2-bis(metilcarbamoil)butanoico', 'OC(=O)C(C(=O)NC)(C(=O)NC)CC'],
  ['ácido 2-(acetilamino)etanoico', 'correct', 'ácido 2-(acetilamino)etanoico', 'CC(=O)NCC(=O)O'],
  ['ácido 2-(formilamino)etanoico', 'correct', 'ácido 2-(formilamino)etanoico', 'O=CNCC(=O)O'],
  ['ácido 2-[acetil(metil)amino]etanoico', 'correct', 'ácido 2-[acetil(metil)amino]etanoico', 'CC(=O)N(C)CC(=O)O'],
  ['2-(acetilamino)etanamida', 'correct', '2-(acetilamino)etanamida', 'CC(=O)NCC(N)=O'],
  ['2-(acetilamino)-N-(2-amino-2-oxoetil)etanamida', 'correct', '2-(acetilamino)-N-(2-amino-2-oxoetil)etanamida', 'NC(=O)CNC(=O)CNC(C)=O'],
  // More forms: rings, benzene, esters, the other acyl words, inside a compound branch, the old letters, the systematic benzene.
  ['ácido p-carbamoilbenzoico', 'alternative', 'ácido 4-carbamoilbenzoico', 'NC(=O)C1=CC=C(C(O)=O)C=C1'],
  ['ácido 4-carbamoilbenceno-1-carboxílico', 'alternative', 'ácido 4-carbamoilbenzoico', 'NC(=O)C1=CC=C(C(O)=O)C=C1'],
  ['ácido 4-(metilcarbamoil)benzoico', 'correct', 'ácido 4-(metilcarbamoil)benzoico', 'CNC(=O)C1=CC=C(C(O)=O)C=C1'],
  ['ácido 3-(fenilcarbamoil)pentanodioico', 'correct', 'ácido 3-(fenilcarbamoil)pentanodioico', 'OC(=O)CC(C(=O)NC1=CC=CC=C1)CC(=O)O'],
  ['4-carbamoilciclohexano-1-carboxilato de metilo', 'correct', '4-carbamoilciclohexano-1-carboxilato de metilo', 'COC(=O)C1CCC(C(N)=O)CC1'],
  ['ácido 2-(benzoilamino)etanoico', 'correct', 'ácido 2-(benzoilamino)etanoico', 'OC(=O)CNC(=O)C1=CC=CC=C1'],
  ['ácido 2-[(ciclohexanocarbonil)amino]etanoico', 'correct', 'ácido 2-[(ciclohexanocarbonil)amino]etanoico', 'OC(=O)CNC(=O)C1CCCCC1'],
  ['ácido 2-[(4-metilbenzoil)amino]etanoico', 'correct', 'ácido 2-[(4-metilbenzoil)amino]etanoico', 'OC(=O)CNC(=O)C1=CC=C(C)C=C1'],
  ['3-(acetilamino)pentanodiamida', 'correct', '3-(acetilamino)pentanodiamida', 'NC(=O)CC(CC(N)=O)NC(C)=O'],
  ['etanoato de 2-(acetilamino)etilo', 'correct', 'etanoato de 2-(acetilamino)etilo', 'CC(=O)NCCOC(C)=O'],
  ['acetato de 2-(acetilamino)etilo', 'alternative', 'etanoato de 2-(acetilamino)etilo', 'CC(=O)NCCOC(C)=O'],
  ['ácido 2-[(acetilamino)metil]butanodioico', 'correct', 'ácido 2-[(acetilamino)metil]butanodioico', 'OC(=O)CC(CNC(C)=O)C(=O)O'],
  ['ácido 4-(acetilamino)ciclohexano-1-carboxílico', 'correct', 'ácido 4-(acetilamino)ciclohexano-1-carboxílico', 'OC(=O)C1CCC(NC(C)=O)CC1'],
  // Left-out locants (search.js).
  ['ácido (acetilamino)etanoico', 'missingLocants', 'ácido 2-(acetilamino)etanoico', 'CC(=O)NCC(=O)O'],
  ['(acetilamino)etanamida', 'missingLocants', '2-(acetilamino)etanamida', 'CC(=O)NCC(N)=O'],
  ['ácido 4-carbamoilciclohexanocarboxílico', 'missingLocants', 'ácido 4-carbamoilciclohexano-1-carboxílico', 'OC(=O)C1CCC(C(N)=O)CC1'],
  ['ácido 4-(metilcarbamoil)ciclohexanocarboxílico', 'missingLocants', 'ácido 4-(metilcarbamoil)ciclohexano-1-carboxílico',
    'OC(=O)C1CCC(C(=O)NC)CC1'],
  // `otherName`: the molecule the name describes.
  ['ácido 3-[metil(etil)carbamoil]pentanodioico', 'otherName', 'ácido 3-[etil(metil)carbamoil]pentanodioico', 'OC(=O)CC(C(=O)N(C)CC)CC(=O)O'],
  ['ácido 3-carbamoilpropanoico', 'otherName', 'ácido 4-amino-4-oxobutanoico', 'NC(=O)CCC(=O)O'],
  ['carbamoilciclohexano', 'otherName', 'ciclohexanocarboxamida', 'NC(=O)C1CCCCC1'],
  ['2-(acetilamino)etan-1-ol', 'otherName', 'N-(2-hidroxietil)etanamida', 'CC(=O)NCCO'],
  ['2-carbamoilbutanonitrilo', 'otherName', '2-cianobutanamida', 'CCC(C#N)C(N)=O'],
]);

test('readName (R-6d2): verdicts and the molecule each name describes, against a SMILES', () => {
  for (const [name, kind, engine, smiles] of CASES) {
    const verdict = read(name);
    assert.equal(verdict.kind, kind, `${name}: ${verdict.message}`);
    assert.equal(verdict.name, engine, name);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${name} builds another graph`);
    assert.equal(verdict.draw, true, name);
  } // End of the loop over the cases
  assert.equal(read('ácido (acetilamino)etanoico').message, 'Casi: faltan los números. Se escribe «ácido 2-(acetilamino)etanoico».');
  assert.equal(read('ácido 3-[(propan-2-il)carbamoil]pentanodioico').message, '¡Correcto! «ácido 3-[(propan-2-il)carbamoil]pentanodioico» '
    + 'es una forma válida (nombre preferido por la IUPAC (2013)). El nombre que doy primero es «ácido 3-(isopropilcarbamoil)pentanodioico».');
  // The student's reading: the carbamoyl prefix's C=O carbon on the parent's carbon 3.
  const verdict = read('ácido 3-(metilcarbamoil)pentanodioico');
  const [occurrence] = verdict.prefixAtoms;
  assert.equal(occurrence.parentAtom, verdict.studentParent.atoms[2]);
  assert.equal(verdict.molecule.atoms.get(occurrence.attachment).element, 'C');
}); // End of test 'readName (R-6d2): verdicts…'

test('search (R-6d2): left-out locants give ambiguous lists; the budget gives incomplete; the engine\'s refusals are out of scope', () => {
  const ambiguous = [
    ['ácido carbamoilpentanodioico', 'Faltan números: puede ser ácido 2-carbamoilpentanodioico o ácido 3-carbamoilpentanodioico.'],
    ['carbamoilpentanodioato de dimetilo', 'Faltan números: puede ser 2-carbamoilpentanodioato de dimetilo o '
      + '3-carbamoilpentanodioato de dimetilo.'],
    ['ácido carbamoilbenzoico', 'Faltan números: puede ser ácido 2-carbamoilbenzoico, ácido 3-carbamoilbenzoico o ácido '
      + '4-carbamoilbenzoico.'],
    ['ácido (acetilamino)propanoico', 'Faltan números: puede ser ácido 2-(acetilamino)propanoico o ácido 3-(acetilamino)propanoico.'],
  ];
  for (const [words, message] of ambiguous) {
    const verdict = read(words);
    assert.deepEqual([verdict.kind, verdict.message], ['ambiguous', message], words);
  }
  assert.equal(read('ácido di START met il carbamoil END hept ano di oico', { budget: { placements: 1 } }).kind, 'incomplete');
  assert.equal(read('ácido carbamoil ciclo hex ano carboxílico', { budget: { namings: 1 } }).kind, 'incomplete');
  // The engine's refusals: an imide (an acyl group on a carbamoyl prefix's nitrogen, two on an amino prefix's), a halogen or an
  // oxygen on the nitrogen, a benzene with groups on the ring and on a side chain.
  const lead = 'Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar: ';
  for (const [words, start] of [
    ['ácido 3 START acetil carbamoil END pent ano di oico', 'Esta molécula tiene un nitrógeno unido a dos grupos C=O'],
    ['ácido 2 START di acetil amino END et ano oico', 'Esta molécula tiene un nitrógeno unido a dos grupos C=O'],
    ['ácido 3 START cloro carbamoil END pent ano di oico', 'Esta molécula tiene átomos que no son carbono ni hidrógeno'],
    ['ácido 3 START hidroxi carbamoil END pent ano di oico', 'Esta molécula tiene átomos que no son carbono ni hidrógeno'],
    ['ácido 4 START acetil amino END benzoico', 'Este benceno tiene 2 sustituyentes'],
  ]) {
    const refused = read(words);
    assert.equal(refused.kind, 'outOfScope', `${words}: ${refused.message}`);
    assert.ok(refused.message.startsWith(`${lead}${start}`), refused.message);
    assert.equal(refused.draw, false);
  } // End of the loop over the refusals
}); // End of test 'search (R-6d2)…'

// ---------------------------------------------------------------------------
// Mutations and the diagnosis.
// ---------------------------------------------------------------------------

/**
 * Mutations of amide-prefix names (design.md §15.7): tile words, the verdict
 * and the diagnosis code of a rule that holds for these prefixes (the
 * amide's own mistakes are the deliberate nulls of the next test).
 */
const MUTATIONS = Object.freeze([
  ['ácido 3 START met il et il carbamoil END pent ano di oico', 'otherName', 'ALPHABETICAL_ORDER'],
  ['ácido 3 START met il met il carbamoil END pent ano di oico', 'otherName', 'UNGROUPED'],
  ['ácido 3 START bis met il carbamoil END pent ano di oico', 'otherName', 'MULTIPLIER_KIND'],
  ['ácido 2 2 di START met il carbamoil END but ano oico', 'otherName', 'MULTIPLIER_KIND'],
  ['ácido 2 2 bis carbamoil but ano oico', 'otherName', 'MULTIPLIER_KIND'],
  ['ácido 2 START met il acetil amino END et ano oico', 'otherName', 'ALPHABETICAL_ORDER'],
  ['ácido 2 START propanoil met il amino END et ano oico'.replace('propanoil', 'prop ano oil'), 'otherName', 'ALPHABETICAL_ORDER'],
  ['ácido 2 2 di START acetil amino END et ano oico', 'otherName', 'MULTIPLIER_KIND'],
  ['ácido 2 met il 3 carbamoil pent ano di oico', 'otherName', 'ALPHABETICAL_ORDER'],
  ['ácido 4 carbamoil pent ano di oico', 'otherName', 'NUMBERING'],
  ['ácido 6 carbamoil benzoico', 'otherName', 'RING_NUMBERING'],
  ['ácido 3 START et ano oil amino END prop ano oico', 'otherName', 'ACYL_NAME'],
  ['ácido 3 START START 1 oxo et il END amino END prop ano oico', 'otherName', 'ACYL_NAME'],
  ['ácido 3 START START 3 met il prop ano oil END amino END prop ano oico', 'otherName', 'ACYL_CHAIN'],
  ['ácido 4 START START 6 met il benzoil END amino END but ano oico', 'otherName', 'BRANCH_RING_NUMBERING'],
  ['ácido 4 START START 1 met il et il END carbamoil END ciclo hex ano 1 carboxílico', 'alternative', null],
  // Other verdicts.
  ['ácido 3 carbamoil pent ano di oico', 'correct', null],
  ['ácido carbamoil pent ano di oico', 'ambiguous', null],
  ['ácido START acetil amino END et ano oico', 'missingLocants', null],
]);

test('mutations (R-6d2): the expected verdict, and the diagnosis of every rule that holds for an amide prefix', () => {
  for (const [words, kind, code] of MUTATIONS) {
    const verdict = read(words);
    assert.equal(verdict.kind, kind, `${words}: ${verdict.message}`);
    if (kind !== 'otherName') {
      continue;
    }
    assert.equal(verdict.diagnosis ? verdict.diagnosis.code : null, code, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(!/undefined|null|NaN|\[object|grupos? –?OH|–CHO|C≡N/.test(verdict.diagnosis.message), words);
    const opened = diagnosisExplanation(verdict, explain);
    const { step } = verdict.diagnosis;
    assert.ok(opened.index >= 0 && [step, ...STEP_FALLBACKS[step]].includes(opened.steps[opened.index].id), words);
  } // End of the loop over the mutations
  const messages = {
    'ácido 3 START met il et il carbamoil END pent ano di oico': 'Los sustituyentes se escriben por orden alfabético: «etil» va antes que '
      + '«metil» (e antes que m).',
    'ácido 3 START met il met il carbamoil END pent ano di oico': 'Las ramas iguales se escriben una sola vez, con «di», «tri»… delante: '
      + '«3-(dimetilcarbamoil)», no «3-[metil(metil)carbamoil]».',
    'ácido 2 2 di START met il carbamoil END but ano oico': 'Delante de una rama que tiene sus propias ramas se usa «bis», «tris»…: '
      + '«2,2-bis(metilcarbamoil)», no «2,2-di(metilcarbamoil)».',
    'ácido 2 START met il acetil amino END et ano oico': 'Los sustituyentes se escriben por orden alfabético: «acetil» va antes que «metil» '
      + '(a antes que m).',
    'ácido 2 met il 3 carbamoil pent ano di oico': 'Los sustituyentes se escriben por orden alfabético: «carbamoil» va antes que «metil» '
      + '(c antes que m).',
    'ácido 3 START et ano oil amino END prop ano oico': 'El grupo acilo de 2 carbonos (CH₃–CO–) tiene nombre propio, que la IUPAC (2013) '
      + 'prefiere: «acetil», no «etanoil». Se escribe «acetilamino», no «etanoilamino».',
  };
  for (const [words, message] of Object.entries(messages)) {
    assert.equal(read(words).diagnosis.message, message, words);
  }
}); // End of test 'mutations (R-6d2)…'

/**
 * How many carbamoyl prefixes some of the student's prefixes write, at any
 * depth, each counted as often as its multipliers say.
 *
 * @param {object[]} prefixes - PrefixSpecs (interpret.js).
 * @returns {number} The count.
 */
function studentCarbamoyls(prefixes) {
  return prefixes.reduce((sum, p) => sum + p.slots.length * ((p.substituent.kind === CARBAMOYL_KIND ? 1 : 0)
    + studentCarbamoyls(p.substituent.prefixes || [])), 0);
}

/**
 * How many carbamoyl groups some prefixes of the engine's name structure
 * write, at any depth, each counted as often as its locants say.
 *
 * @param {object[]} prefixes - PrefixGroups of a SubstituentStructure (or of the name's structure).
 * @returns {number} The count.
 */
function engineCarbamoyls(prefixes) {
  return (prefixes || []).reduce((sum, g) => sum + g.locants.length * ((g.substituent.carbamoyl ? 1 : 0)
    + engineCarbamoyls(g.substituent.prefixes)), 0);
}

/**
 * The amide prefixes' own category on an ester's O-bound side (R-6d2, review
 * of phase I-52d2), read independently of diagnose.js: more carbamoyl groups
 * in the student's O-bound groups (each counted as often as its multiplier
 * says) than in the engine's (esterParts()) is `inChain` — a chain of a group
 * takes one in: `etanoato de 3-(carbamoilmetil)heptilo` →
 * «3-(2-amino-2-oxoetil)heptilo», `etanoato de 2-carbamoiletilo` →
 * «3-amino-3-oxopropilo» —; fewer is `words` — the engine's `carbamoil`
 * written otherwise: `etanoato de 3-(aminooxometil)heptilo` →
 * «3-carbamoilheptilo».
 *
 * @param {object} spec - The student's NameSpec.
 * @param {object} verdict - Its `otherName` verdict.
 * @returns {string|null} The category, or null (no ester, or as many carbamoyl groups).
 */
function oBoundCarbamoylCategory(spec, verdict) {
  if (!spec.ester) {
    return null;
  }
  const student = spec.ester.groups.reduce((sum, g) => sum + g.multiplier.count * studentCarbamoyls(g.substituent.prefixes || []), 0);
  const engine = esterParts(verdict.naming.structure).reduce((sum, part) => sum + engineCarbamoyls(part.alkyl.prefixes), 0);
  if (student === engine) {
    return null;
  }
  return student > engine ? 'inChain' : 'words';
} // End of function oBoundCarbamoylCategory()

/**
 * The amide prefixes' own categories (R-6d2), read independently of
 * diagnose.js, in the order the rules meet them: `inChain` — a carbamoyl
 * prefix on an end of the student's chain whose C=O carbon the engine's
 * parent takes in (rule 1: `ácido 3-carbamoilpropanoico`), or, on the same
 * parent, fewer carbamoyl groups in the engine's name than in the student's
 * (a compound branch's chain taking one in, rule 5: `ácido
 * 2-(carbamoilmetil)butanodioico`); `words` — on the same parent, more (the
 * engine's `carbamoil` written otherwise: `ácido 2-(aminooxometil)butanodioico`).
 * With another parent, a chain rule speaks first (MORE_SUBSTITUENTS for
 * `ácido 3-carbamoilbutanoico`: the chain through the C=O carbon carries
 * three prefixes).
 *
 * An ester's O-bound side is read first (oBoundCarbamoylCategory()), as
 * diagnose.js reads it before the parent.
 *
 * @param {object} spec - The student's NameSpec.
 * @param {object} verdict - Its `otherName` verdict.
 * @returns {string|null} The category.
 */
function carbamoylCategory(spec, verdict) {
  const oBound = oBoundCarbamoylCategory(spec, verdict);
  if (oBound) {
    return oBound;
  }
  const { naming } = verdict;
  const parent = new Set(naming.parent.atoms);
  const n = verdict.studentParent.atoms.length;
  const atEnd = verdict.prefixAtoms.some((o) => spec.prefixes[o.prefix].substituent.kind === CARBAMOYL_KIND
    && (o.locant === 1 || o.locant === n) && parent.has(o.attachment));
  if (atEnd) {
    return 'inChain';
  }
  const sorted = (list) => [...list].sort((p, q) => p - q).join();
  if (sorted(verdict.studentParent.atoms) !== sorted(naming.parent.atoms)) {
    return null;
  }
  const student = studentCarbamoyls(spec.prefixes);
  const engine = engineCarbamoyls(naming.structure.prefixes);
  if (student > engine) {
    return 'inChain';
  }
  return student < engine ? 'words' : null;
} // End of function carbamoylCategory()

/**
 * The category of an amide's own mistake, read independently of diagnose.js
 * from the engine's naming and the student's reading (diagnose.js «Amides»:
 * deliberate nulls until phase I-52d4): the R-6d1 categories (`seniority` —
 * the student's suffix an amide's while the engine's principal group is
 * another, or the engine's an amide and the student's suffix none or
 * another, an amine's aside: `carbamoilciclohexano`,
 * `2-(acetilamino)etan-1-ol`; `count` — another number of amide groups:
 * `4-carbamoilbutanamida`; `carbon`, `parent`, `numbering`, `suffix`, as in
 * reverse-amides.test.js amideCategory()), then those of the amide prefixes
 * (carbamoylCategory(): `inChain`, `words`). Null when none applies or
 * neither name is an amide's.
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} verdict - Its `otherName` verdict.
 * @returns {string|null} The category.
 */
function amidePrefixCategory(ids, verdict) {
  const engine = verdict.naming.structure.suffix;
  const { tree } = parse(ids);
  const spec = interpret(tree);
  const mine = spec.suffix && spec.suffix.kind === 'amide' ? spec.suffix : null;
  if (!engine || engine.kind !== 'amide') {
    return mine ? 'seniority' : carbamoylCategory(spec, verdict);
  }
  if (!mine) {
    return spec.suffix && spec.suffix.kind === 'amine' ? null : 'seniority';
  }
  if (mine.slots.length !== engine.locants.length) {
    return 'count';
  }
  if (Boolean(mine.outside) !== Boolean(engine.outside)) {
    return 'carbon';
  }
  const groups = verdict.suffixAtoms || [];
  const sorted = (list) => [...list].sort((p, q) => p - q).join();
  if (sorted(groups.map((g) => g.attachment)) !== sorted(engine.locants.map((site) => site.attachAtom))) {
    return 'parent';
  }
  if (sorted(groups.map((g) => g.locant)) !== sorted(engine.locants.map((site) => site.locant))
    && sorted(verdict.studentParent.atoms) === sorted(verdict.naming.parent.atoms)) {
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
  if (!studentRing && p0 && !p0.survivors.some((c) => student.every((id) => c.atoms.includes(id)))) {
    return 'parent';
  }
  return carbamoylCategory(spec, verdict);
} // End of function amidePrefixCategory()

test('the deliberate nulls of R-6d2 (diagnose.js «Amides»): each category, read independently, gets no diagnosis', () => {
  const cases = [
    // [tile words, category]
    ['ácido 3 carbamoil prop ano oico', 'inChain'], // «ácido 4-amino-4-oxobutanoico»
    ['ácido 2 carbamoil et ano oico', 'inChain'],
    ['ácido 2 met il 3 carbamoil prop ano oico', 'inChain'],
    ['3 carbamoil prop ano oato met ilo', 'inChain'],
    ['ácido 2 START carbamoil met il END but ano di oico', 'inChain'], // «…2-(2-amino-2-oxoetil)…»: the branch's own chain
    ['ácido 3 START met il carbamoil END prop ano oico', 'inChain'],
    ['ácido 2 START met il carbamoil END et ano oico', 'inChain'], // «ácido 3-(metilamino)-3-oxopropanoico»
    ['ácido 2 START amino oxo met il END but ano di oico', 'words'], // «ácido 2-carbamoilbutanodioico»
    ['ácido 2 START 1 amino 1 oxo met il END but ano di oico', 'words'], // not NEEDLESS_LOCANTS «(aminooxometil)»
    ['ácido 4 START amino oxo met il END benzoico', 'words'],
    ['carbamoil ciclo hex ano', 'seniority'], // «ciclohexanocarboxamida»: the principal amide written `carbamoil`
    ['carbamoil benceno', 'seniority'],
    ['2 START acetil amino END et ano 1 ol', 'seniority'], // «N-(2-hidroxietil)etanamida»: the amide principal
    ['2 START acetil amino END prop ano', 'seniority'],
    ['2 carbamoil but ano nitrilo', 'seniority'], // «2-cianobutanamida»
    ['4 carbamoil but ano amida', 'count'], // «pentanodiamida»
  ];
  for (const [words, category] of cases) {
    const ids = seq(words);
    const verdict = readName(ids);
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    assert.equal(amidePrefixCategory(ids, verdict), category, words);
    assert.equal(verdict.diagnosis, null, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(verdict.draw && verdict.molecule, words);
  } // End of the loop over the deliberate nulls
  assert.equal(read('ácido 3 carbamoil prop ano oico').name, 'ácido 4-amino-4-oxobutanoico');
  assert.equal(read('ácido 2 START amino oxo met il END but ano di oico').name, 'ácido 2-carbamoilbutanodioico');
  // The shared rules that hold still speak when theirs is the earlier mistake: off an end, the chain through the C=O carbon is
  // compared by the trace (three prefixes, `amino`, `metil`, `oxo`, against one).
  assert.equal(read('ácido 4 carbamoil pent ano di oico').diagnosis.code, 'NUMBERING');
  assert.equal(read('ácido 3 carbamoil but ano oico').diagnosis.message, 'Hay otra cadena igual de larga con más sustituyentes (3; la '
    + 'tuya tiene 1). Entre cadenas igual de largas, gana la que tiene más sustituyentes.');
  assert.equal(read('ácido 3 START met il met il carbamoil END pent ano di oico').diagnosis.code, 'UNGROUPED');
}); // End of test 'the deliberate nulls of R-6d2…'

test('the deliberate nulls of R-6d2 on an ester\'s O-bound side (review of phase I-52d2): no right form that is none of the engine\'s', () => {
  // The review's input: NEEDLESS_LOCANTS offered «3-(carbamoilmetil)heptilo», itself another name (the engine takes the C=O carbon
  // into the branch's chain: «3-(2-amino-2-oxoetil)heptilo»).
  assert.equal(read('etanoato de 3-(carbamoilmetil)heptilo').kind, 'otherName');
  assert.equal(read('etanoato de 3-(carbamoilmetil)heptilo').name, 'etanoato de 3-(2-amino-2-oxoetil)heptilo');
  assert.equal(read('etanoato de 3-(aminooxometil)heptilo').name, 'etanoato de 3-carbamoilheptilo');
  const cases = [
    // [name, category]: a carbamoyl prefix whose C=O carbon the engine's name of the O-bound group takes into a chain …
    ['etanoato de 3-(1-carbamoilmetil)heptilo', 'inChain'], // not NEEDLESS_LOCANTS «3-(carbamoilmetil)heptilo»
    ['etanoato de 3-(carbamoilmetil)heptilo', 'inChain'], // not ESTER_ALKYL_NAME: the amide written `amino` + `oxo` is I-52d4's
    ['acetato de 3-(1-carbamoilmetil)heptilo', 'inChain'], // beside a retained ester word
    ['etanoato de 4-(1-carbamoilmetil)ciclohexilo', 'inChain'], // on a ring group
    ['etanoato de 3-(2-carbamoiletil)heptilo', 'inChain'],
    ['etanoato de 2-carbamoiletilo', 'inChain'], // the group's own chain: «3-amino-3-oxopropilo», as on the parent's end
    ['etanoato de carbamoilmetilo', 'inChain'],
    ['etanoato de 1-carbamoilpropan-2-ilo', 'inChain'],
    ['butanodioato de bis(carbamoilmetilo)', 'inChain'],
    ['butanodioato de metilo y carbamoilmetilo', 'inChain'], // before ALPHABETICAL_ORDER
    ['etanoato de 3-[(1-carbamoilmetil)amino]propilo', 'inChain'], // a group on an amino prefix's nitrogen
    ['etanoato de 3-(1-carbamoilmetoxi)propilo', 'inChain'], // inside an alkoxy prefix
    // … and a branch the engine names `carbamoil` written as another kind.
    ['etanoato de 3-(aminooxometil)heptilo', 'words'],
    ['etanoato de 3-(1-amino-1-oxometil)heptilo', 'words'], // not NEEDLESS_LOCANTS «3-(aminooxometil)heptilo»
    ['etanoato de 4-(1-amino-1-oxometil)ciclohexilo', 'words'],
    ['etanoato de 5-(aminooxometil)ciclohexilo', 'words'], // before BRANCH_RING_NUMBERING
  ];
  for (const [name, category] of cases) {
    const ids = idsOf(name);
    const verdict = readName(ids);
    assert.equal(verdict.kind, 'otherName', `${name}: ${verdict.message}`);
    assert.equal(amidePrefixCategory(ids, verdict), category, name);
    assert.equal(verdict.diagnosis, null, `${name}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(verdict.draw && verdict.molecule, name);
  } // End of the loop over the O-bound deliberate nulls
  // An `amino` + `oxo` branch whose C=O carbon the engine also writes `amino` + `oxo`, in a longer chain: the chain is the mistake
  // (ESTER_ALKYL_CHAIN, its right form an engine's name); inside a compound branch, as carbamoylWritten() on the parent, a null
  // rather than NEEDLESS_LOCANTS «3-[(aminooxometil)metil]heptilo».
  const chain = read('etanoato de 2-(1-amino-1-oxometil)etilo').diagnosis;
  assert.equal(chain.code, 'ESTER_ALKYL_CHAIN');
  assert.match(chain.message, /Se escribe «3-amino-3-oxopropilo»/);
  assert.equal(read('etanoato de 3-amino-3-oxopropilo').kind, 'correct');
  assert.equal(read('etanoato de 3-[(1-amino-1-oxometil)metil]heptilo').diagnosis, null);
  // Controls: the O-bound rules still speak where the engine writes the student's `carbamoil`, each right form an engine's name.
  for (const [name, code, right] of [
    ['etanoato de 3-carbamoilheptan-1-ilo', 'NEEDLESS_LOCANTS', '3-carbamoilheptilo'],
    ['etanoato de 5-carbamoilciclohexilo', 'BRANCH_RING_NUMBERING', '3-carbamoilciclohexilo'],
    ['etanoato de 2-(metilcarbamoil)butan-1-ilo', 'NEEDLESS_LOCANTS', '2-(metilcarbamoil)butilo'],
    ['etanoato de 2-[(1-oxoetil)amino]etilo', 'ACYL_NAME', '2-(acetilamino)etilo'],
  ]) {
    const { diagnosis } = read(name);
    assert.equal(diagnosis && diagnosis.code, code, name);
    assert.ok(diagnosis.message.includes(`«${right}»`), `${name}: ${diagnosis.message}`);
    assert.equal(read(`etanoato de ${right}`).kind, 'correct', right);
  } // End of the loop over the controls
}); // End of test 'the deliberate nulls of R-6d2 on an ester\'s O-bound side…'

// ---------------------------------------------------------------------------
// Fixture round trip and closed loop (design.md §15.7).
// ---------------------------------------------------------------------------

/**
 * Fixture rows with an amide prefix in a name (isAmide() and
 * isAmidePrefixName()): 35 — by section I-39d 23 (`carbamoil` on a diacid or
 * a diester, `bis(metilcarbamoil)`, the acylamino prefixes beside an acid, an
 * ester or another amide), I-40c 6 (on a ring acid, beside a ring amide;
 * `(benzoilamino)`), I-40d 2 (on a ring ester), I-43b 2 (`ácido
 * 4-carbamoilbenzoico`, `ácido 4-(metilcarbamoil)benzoico`), I-45b 2
 * (`[(4-metilbenzoil)amino]`) — every one read since phase R-6d2.
 */
const EXPECTED_ROWS = Object.freeze({ total: 35, i39d: 23, i40c: 6, i40d: 2, i43b: 2, i45b: 2 });

/**
 * Their names and alternatives with an amide prefix, read back: 42 — 21 with
 * `carbamoil` (12 with groups on its nitrogen), 21 with an acylamino prefix
 * —; none with the retained amide names (R-6d3).
 */
const EXPECTED_NAMES = Object.freeze({ read: 42, carbamoyl: 21, substituted: 12, acylamino: 21, later: 0 });

test('fixture round trip (R-6d2): every amide-prefix name the tiles write, read back; graph compared with the SMILES', async () => {
  const fixtures = await readFixtures();
  const rows = fixtures.filter((row) => isAmide(row.smiles) && row.names.some(isAmidePrefixName));
  const counts = { read: 0, carbamoyl: 0, substituted: 0, acylamino: 0, later: 0 };
  let elapsed = 0;
  for (const row of rows) {
    const expected = keyOf(row.smiles);
    for (const name of row.names.filter(isAmidePrefixName)) {
      if (!isR6d2AmideName(name)) {
        counts.later += 1; // A retained amide name too (R-6d3), read in reverse-amide-templates.test.js: none.
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
      counts.read += 1;
      counts.carbamoyl += name.includes(CARBAMOYL_WORD) ? 1 : 0;
      counts.substituted += /[a-z)]carbamoil/.test(name) ? 1 : 0;
      counts.acylamino += hasAcylamino(name) ? 1 : 0;
    } // End of the loop over the names of a row
  } // End of the loop over the fixture rows
  /**
   * How many rows of a fixture section.
   *
   * @param {string} id - The section's phase id (`I-39d`…).
   * @returns {number} The count.
   */
  const inSection = (id) => rows.filter((row) => /\((I-\d+[a-z]?)[),:]/.exec(row.section)[1] === id).length; // Its own id only.
  assert.equal(rows.length, EXPECTED_ROWS.total);
  assert.deepEqual(['I-39d', 'I-40c', 'I-40d', 'I-43b', 'I-45b'].map(inSection), [EXPECTED_ROWS.i39d, EXPECTED_ROWS.i40c, EXPECTED_ROWS.i40d,
    EXPECTED_ROWS.i43b, EXPECTED_ROWS.i45b]);
  assert.deepEqual(counts, { ...EXPECTED_NAMES });
  assert.ok(elapsed / counts.read < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / counts.read).toFixed(2)} ms on average`);
}); // End of test 'fixture round trip (R-6d2)…'

/**
 * The closed loop's generators (scripts/oracle/generate.mjs; design.md
 * §15.7): those whose molecules the engine names with an amide prefix — the
 * amide prefixes beside an acid, an ester or another amide, the substituted
 * benzoyl groups on an amino nitrogen, the ring amides below a ring acid,
 * the benzenes with a –CONH₂ beside a senior group, the acyl molecules.
 */
const LOOP = Object.freeze([
  [generateAmidePrefixes, { count: 600, seed: 6601, maxSize: 12 }],
  [generateSubstitutedBenzoyls, { count: 400, seed: 6602, maxSize: 12 }],
  [generateRingNitrilesAmides, { count: 500, seed: 6603, maxSize: 12 }],
  [generateRingOutsideBenzenes, { count: 500, seed: 6604, minSize: 6, maxSize: 12 }],
  [generateRingPolysuffixBenzenes, { count: 400, seed: 6605, minSize: 6, maxSize: 12 }],
  [generateAcyl, { count: 400, seed: 6606, maxSize: 12 }],
]);

/**
 * Minimum coverage of the closed loop: molecules with an amide-prefix name
 * (distinct by aromatic key), those names read back, the forms among them (a
 * `carbamoil` prefix, with groups on its nitrogen, an acylamino prefix, with
 * another group beside the acyl on the nitrogen, on a ring or benzene
 * parent, multiplied), removed-locant mutations and decisive verdicts among
 * them, every one (the seeds give 655, 746, 218, 95, 540, 72, 94, 12, 1808 and
 * 1808).
 */
const LOOP_MIN = Object.freeze({
  molecules: 650, names: 740, carbamoyl: 215, substituted: 90, acylamino: 535, mixed: 70, ring: 90, multiplied: 10, removed: 1800,
  decisive: 1800,
});

/**
 * The closed loop's molecules: those of the generators that the engine names
 * with an amide prefix in some name, distinct by aromatic key.
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
      if (naming.ok && [naming.name, ...naming.alternatives.map((alt) => alt.name)].some(isR6d2AmideName)) {
        molecules.push(mol);
      }
    } // End of the loop over a generator's molecules
  } // End of the loop over the generators
  return molecules;
} // End of function loopMolecules()

/**
 * The locant lists of a tree a student can leave out: a prefix's, a
 * segment's and the suffix's, at any depth (an ester's O-bound side too) —
 * never a free-valence locant, nor a group's on a nitrogen (it has none).
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

test('closed loop over the generators\' amide-prefix names: engine name → tiles → readName() → the same graph, then without each locant list', () => {
  const molecules = loopMolecules();
  const counts = {
    names: 0, carbamoyl: 0, substituted: 0, acylamino: 0, mixed: 0, ring: 0, multiplied: 0, removed: 0, decisive: 0,
  };
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    const key = aromaticKey(mol);
    const all = [naming.name, ...naming.alternatives.map((alt) => alt.name)];
    for (const [i, name] of all.entries()) {
      if (!isR6d2AmideName(name)) {
        continue; // Read by its own family's loop, or a retained amide name (R-6d3: reverse-amide-templates.test.js).
      }
      const ids = tokenize(name);
      assert.ok(ids, `no tiles for ${name}`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, i === 0 ? 'correct' : 'alternative', `${name}: ${verdict.message}`);
      assert.equal(verdict.name, naming.name);
      assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
      counts.names += 1;
      counts.carbamoyl += name.includes(CARBAMOYL_WORD) ? 1 : 0;
      counts.substituted += /[a-z)]carbamoil/.test(name) ? 1 : 0;
      counts.acylamino += hasAcylamino(name) ? 1 : 0;
      counts.mixed += /\[[a-z]+\([a-z]+\)amino\]/.test(name) && hasAcylamino(name) ? 1 : 0;
      counts.ring += /ciclo[a-z-,\d]*(?:carbox|$)|benzo|benc/.test(name.replace(/ciclo[a-z]*il|benzoil|fenil/g, '')) ? 1 : 0;
      counts.multiplied += /(?:di|bis\(|tris\()[a-z]*carbamoil|bis\([a-z]*amino/.test(name) ? 1 : 0;
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
}); // End of test 'closed loop over the generators\' amide-prefix names…'

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
 * halogen, `hidroxi`, `oxo`, an alkoxy prefix, `ciano`, an amino prefix — an
 * acylamino one too): moved to an end, it never lengthens the chain. A
 * carbamoyl prefix is none: its C=O carbon may lengthen it.
 *
 * @param {object[]} tiles - The parsed tiles.
 * @param {object} node - A substituent node (parse.js).
 * @returns {boolean} True for such a group.
 */
function isHeteroNode(tiles, node) {
  const core = node.type === 'branch' ? node.chain : node;
  const retained = core && core.type === 'retained' ? tiles[core.tile].id : null;
  return ['halogen', 'hydroxy', 'carbonyl'].includes(node.type) || Boolean(core && core.oxi !== null && core.oxi !== undefined)
    || ['retained-cyano', AMINO_ID].includes(retained);
}

/** The diagnosis codes an `otherName` of each mutation family may give (the trace's own rule for a new molecule). */
const FAMILY_CODES = Object.freeze({
  reversed: ['NUMBERING', 'CHAIN_LOCANTS'],
  // A chain with a terminal suffix keeps its group at carbon 1: renumbered from the other end, its prefixes move, so the name
  // describes another molecule, whose chain the trace may choose otherwise.
  shifted: ['NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS',
    'ESTER_IN_CHAIN'],
  reflected: ['RING_NUMBERING'],
  rotated: ['RING_NUMBERING'],
  swapped: ['NUMBERING', 'RING_NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS',
    'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS', 'ESTER_IN_CHAIN'],
  unsorted: ['ALPHABETICAL_ORDER'],
  ungrouped: ['UNGROUPED'],
  diBis: ['MULTIPLIER_KIND'],
  toEnd: ['BRANCH_AT_END', 'NUMBERING', 'LONGER_CHAIN', 'CHAIN_LOCANTS', 'MORE_SUBSTITUENTS', 'ESTER_IN_CHAIN'],
  heteroToEnd: ['NUMBERING', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS'],
  removed: [],
  added: ['NEEDLESS_LOCANTS', 'NUMBERING', 'RING_NUMBERING'],
  // The groups on an amino or carbamoyl prefix's nitrogen: out of order, written one by one, di ↔ bis.
  nitrogenOrder: ['ALPHABETICAL_ORDER'],
  nitrogenUngrouped: ['UNGROUPED'],
  nitrogenDiBis: ['MULTIPLIER_KIND'],
});

/**
 * The mutations of the groups on the nitrogen of every amino or carbamoyl
 * prefix of a tree, at any depth: the groups in reverse order
 * (`nitrogenOrder`), a group of two written one by one
 * (`nitrogenUngrouped`), di ↔ bis (`nitrogenDiBis`).
 *
 * @param {object} tree - The parse() tree.
 * @param {string[]} ids - The name's tile ids.
 * @param {(family: string, mutated: string[]) => void} push - Records one mutation.
 * @returns {void}
 */
function nitrogenMutations(tree, ids, push) {
  const { tiles } = tree;
  /**
   * Mutates the nitrogen groups of one level and of the compound branches inside it.
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
      if (sub.chain && sub.chain.type === 'retained' && [AMINO_ID, CARBAMOYL_ID].includes(tiles[sub.chain.tile].id)) {
        const groups = sub.items;
        if (groups.length >= 2) {
          const slices = groups.map((g) => ids.slice(g.range[0], g.range[1]));
          push('nitrogenOrder', [...ids.slice(0, groups[0].range[0]), ...slices.reverse().flat(),
            ...ids.slice(groups[groups.length - 1].range[1])]);
        }
        for (const group of groups.filter((g) => g.multiplier !== null)) {
          const tile = tiles[group.multiplier];
          const swapped = [...ids];
          swapped[group.multiplier] = tile.kind === 'mult' ? `cmult-${tile.value}` : `mult-${tile.value}`;
          push('nitrogenDiBis', swapped);
          if (tile.value === 2) {
            const body = ids.slice(group.multiplier + 1, group.range[1]);
            push('nitrogenUngrouped', [...ids.slice(0, group.range[0]), ...body, ...body, ...ids.slice(group.range[1])]);
          }
        } // End of the loop over the multiplied groups on the nitrogen
      }
      visit(sub.items);
    } // End of the loop over the level's items
  }; // End of function visit()
  visit(tree.items);
} // End of function nitrogenMutations()

/**
 * The mutations of one amide-prefix name: renumbered (on a chain with a
 * terminal suffix or a chain template, whose group stays at carbon 1,
 * `shifted`; `reversed` on another chain; reflected and rotated on a ring,
 * the suffix's locants too), carbon locants swapped between two
 * single-locant prefixes, prefixes in reverse order, identical prefixes
 * written one by one, di ↔ bis, a single-carbon-locant prefix moved to an
 * end of a chain (a carbon branch or a carbamoyl prefix: `toEnd`; a group
 * bonded through a heteroatom: `heteroToEnd`), a prefix's locants removed,
 * or added (1… and 2…) where it has none; and the mutations of the groups on
 * a nitrogen (nitrogenMutations()).
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
  nitrogenMutations(tree, ids, push);
  return out;
} // End of function mutationsOf()

/**
 * Reads every mutation of some amide-prefix names: every `otherName` must
 * carry a diagnosis of its family's codes whose step resolves in its
 * explanation, or be one of the amide's own mistakes, a deliberate null of
 * diagnose.js «Amides» (counted by category, amidePrefixCategory()); a null
 * with no category is unexpected, and so is a diagnosis on a mutation of an
 * amide category.
 *
 * @param {string[]} names - Amide-prefix names (engine names or alternatives).
 * @returns {{otherName: Object<string, number>, codes: Set<string>, own: Object<string, number>, unexpected: string[]}}
 *   `otherName` counts by family, the codes seen, the amide's own mistakes by category and the unexpected cases.
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
      const category = amidePrefixCategory(mutation.ids, verdict);
      if (!d) {
        if (category) {
          own[category] = (own[category] || 0) + 1;
        } else {
          unexpected.push(label);
        }
        continue;
      }
      if (category) {
        unexpected.push(`${label}: ${category} diagnosed ${d.code}`);
      }
      codes.add(d.code);
      assert.ok(FAMILY_CODES[mutation.family].includes(d.code), `${label}: ${d.code}, ${d.message}`);
      assert.ok(!/undefined|null|NaN|\[object|grupos? –?OH|–CHO|C≡N/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), label);
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return { otherName, codes, own, unexpected };
} // End of function sweep()

/**
 * How many mutations of the amide-prefix fixture names give `otherName`, by
 * family (every one diagnosed with one of its family's codes, or a
 * deliberate «Amides» null of its category), and how many of them are the
 * amide's own mistakes by category: 1 `inChain`, a carbamoyl prefix moved to
 * the chain's end (`ácido 4-carbamoilhexanoico` → `ácido
 * 6-carbamoilhexanoico`, which the engine names «ácido
 * 7-amino-7-oxoheptanoico») — a deliberate null until phase I-52d4. Pinned by
 * the test below.
 */
const FIXTURE_OTHER_NAME = Object.freeze({
  reversed: 0, shifted: 3, reflected: 0, rotated: 39, swapped: 0, unsorted: 2, ungrouped: 3, diBis: 3, toEnd: 1, heteroToEnd: 0, removed: 0,
  added: 0, nitrogenOrder: 2, nitrogenUngrouped: 1, nitrogenDiBis: 1,
});
const FIXTURE_OWN = Object.freeze({ inChain: 1 });

test('mutations of every amide-prefix fixture name: a diagnosis of the family\'s codes, or a deliberate «Amides» null', async () => {
  // The names of phase R-6d2 (also those of the amide, amino, acyl and ester round trips, swept here, not there).
  const names = (await readFixtures()).filter((row) => isAmide(row.smiles)).flatMap((row) => row.names).filter(isR6d2AmideName);
  assert.equal(names.length, EXPECTED_NAMES.read);
  const { otherName, codes, own, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  assert.deepEqual(otherName, { ...FIXTURE_OTHER_NAME });
  assert.deepEqual(own, { ...FIXTURE_OWN });
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'MORE_SUBSTITUENTS', 'MULTIPLIER_KIND', 'NUMBERING', 'RING_NUMBERING',
    'UNGROUPED']);
}); // End of test 'mutations of every amide-prefix fixture name…'

test('mutations of the generated amide-prefix names: every otherName is diagnosed or a deliberate «Amides» null, every step resolves', () => {
  const names = [];
  for (const mol of loopMolecules().filter((_, i) => i % 3 === 0)) { // Every generator's amide prefixes: chains, rings, benzenes.
    const naming = nameMolecule(mol);
    names.push(...[naming.name, ...naming.alternatives.map((alt) => alt.name)].filter(isR6d2AmideName));
  }
  const { otherName, codes, own, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  const total = Object.values(otherName).reduce((sum, count) => sum + count, 0);
  // The seeds give 247 names and 514 `otherName`; 30 of them the amide's own mistakes, deliberate nulls until phase I-52d4: a
  // carbamoyl prefix moved onto the chain's end (15 `toEnd`, 15 `swapped`), whose C=O carbon the engine's chain then takes
  // (`inChain`: `2-carbamoilpentanoato de isopropilo` → `5-carbamoil…`, «6-amino-6-oxohexanoato de isopropilo»).
  assert.deepEqual([names.length, total, own], [247, 514, { inChain: 30 }]);
  assert.deepEqual([otherName.removed, otherName.added, otherName.nitrogenOrder, otherName.nitrogenUngrouped, otherName.nitrogenDiBis],
    [0, 0, 41, 4, 4]);
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_SUBSTITUENTS',
    'MULTIPLIER_KIND', 'NUMBERING', 'RING_NUMBERING', 'UNGROUPED']);
}); // End of test 'mutations of the generated amide-prefix names…'

// ---------------------------------------------------------------------------
// The drawing, the dialog, robustness and time.
// ---------------------------------------------------------------------------

test('«Dibujar» (R-6d2): amide-prefix verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const name of ['ácido 3-carbamoilpentanodioico', 'ácido 2,2-dicarbamoilbutanoico', 'ácido 4-carbamoilbenzoico',
    'ácido 3-[etil(metil)carbamoil]pentanodioico', '2-(4-carbamoilciclohexil)butanodiamida', 'ácido 2-(acetilamino)etanoico',
    'ácido 2-[acetil(metil)amino]etanoico', '2-(acetilamino)-N-(2-amino-2-oxoetil)etanamida', 'ácido 2-(benzoilamino)etanoico',
    'ácido 3-carbamoilpropanoico', 'ácido (acetilamino)etanoico']) {
    const verdict = read(name);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-6d2)…'

test('dialog (R-6d2): the `carbamoil` tile has a tooltip; `amino`\'s names the acylamino prefixes', () => {
  assert.ok(TILE_HINTS[CARBAMOYL_ID] && TILE_HINTS[CARBAMOYL_ID].endsWith('.'));
  assert.match(TILE_HINTS[CARBAMOYL_ID], /^Un grupo amida \(–CONH₂\) unido por el carbono del C=O, cuando no es el grupo principal/);
  assert.match(TILE_HINTS[CARBAMOYL_ID], /ácido 3-carbamoilpentanodioico, ácido 4-carbamoilbenzoico.*\(metilcarbamoil\), \[etil\(metil\)carbamoil\]/);
  assert.match(TILE_HINTS[AMINO_ID], /Con un grupo C=O unido al nitrógeno es una amida como rama: \(acetilamino\), \[acetil\(metil\)amino\]\./);
  // Every form the tooltips quote is the engine's own.
  for (const [name, smiles] of [['ácido 3-carbamoilpentanodioico', 'OC(=O)CC(C(N)=O)CC(=O)O'],
    ['ácido 4-carbamoilbenzoico', 'NC(=O)C1=CC=C(C(O)=O)C=C1']]) {
    assert.ok(namesOf(smiles).includes(name), name);
  }
  assert.ok([AMIDA_ID, CARBOXAMIDE_ID, BENZAMIDE_ID].every((id) => TILE_HINTS[id]));
}); // End of test 'dialog (R-6d2)…'

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

test('property (R-6d2): random amide-prefix names — `carbamoil` and acylamino anywhere — never crash', () => {
  const random = mulberry32(20261016);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const branches = ['carbamoil', 'START met il carbamoil END', 'START di met il carbamoil END', 'START et il met il carbamoil END',
    'START acetil amino END', 'START acetil met il amino END', 'START formil amino END', 'START benzoil amino END',
    'START prop ano oil amino END', 'START START 2 met il prop ano oil END amino END', 'met il', 'cloro', 'hidroxi', 'oxo', 'amino',
    'START tri met il carbamoil END', 'START acetil carbamoil END', 'START cloro carbamoil END', 'START 2 met il carbamoil END'];
  const parents = ['ácido et ano oico', 'ácido pent ano di oico', 'ácido but ano oico', 'ácido benzoico', 'ácido ciclo hex ano carboxílico',
    'pent ano di oato di met ilo', 'et ano amida', 'but ano di amida', 'prop ano 1 ol', 'ciclo hex ano', 'but ano nitrilo'];
  const multipliers = { 1: '', 2: 'di', 3: 'tri' };
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const prefixes = Array.from({ length: int(1, 2) }, () => {
      const count = int(1, 2);
      const located = random() < 0.75;
      const locants = located ? Array.from({ length: count }, () => String(int(1, 6))).join(' ') : '';
      const branch = pick(branches);
      const mult = count > 1 && branch.startsWith('START') && random() < 0.7 ? 'bis' : multipliers[count];
      return [locants, mult, branch].join(' ');
    });
    const words = [...prefixes, pick(parents)].join(' ').replace(/\s+/g, ' ').trim();
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
}); // End of test 'property (R-6d2): random amide-prefix names…'

test('time budget: amide-prefix readName() calls, with their diagnosis, well within budget', () => {
  const names = ['ácido 3-[etil(metil)carbamoil]pentanodioico', 'ácido 2,2-bis(metilcarbamoil)butanoico', 'ácido 4-carbamoilbenzoico',
    '2-(4-carbamoilciclohexil)butanodiamida', '2-(acetilamino)-N-(2-amino-2-oxoetil)etanamida', 'ácido 2-[acetil(metil)amino]etanoico',
    'ácido carbamoilpentanodioico', 'ácido carbamoilbenzoico', 'ácido (acetilamino)propanoico', 'ácido 3-carbamoilpropanoico',
    'ácido 3-[metil(etil)carbamoil]pentanodioico'];
  names.forEach((name) => read(name)); // Warm-up.
  for (const name of names) {
    const start = performance.now();
    const verdict = read(name);
    const ms = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', name);
    assert.ok(ms < PER_NAME_BUDGET_MS, `${name}: ${ms.toFixed(1)} ms`);
  }
}); // End of test 'time budget…'
