/**
 * @file Unit tests for the acyl prefixes in «¿Cómo se dibuja?» (src/reverse/,
 * design.md §15.5.2, §15.5.3, §15.7, §15.8 R-5c; phase I-51c2, R-5c2): a
 * branch bonded by a C=O carbon, written as the forward engine writes it
 * (render.js acylEndingTokens(), ringCarbonylTokens(), needsEnclosure(),
 * isCompoundPrefix(); design.md §13.4 I-39b, I-40b, I-45b) — the «Grupos»
 * row's `oil` after a chain's ending (`propanoil`, `(but-2-enoil)`),
 * `carbonil` after a ring's (`(ciclohexanocarbonil)`,
 * `(ciclohex-2-eno-1-carbonil)`) and `acetil`, and the «Anillos» row's
 * `benzoil` (`(4-metilbenzoil)` inside a compound branch). Parser (the acyl
 * ending in a branch's free-valence place, errors with their tile ranges and
 * hints), assembler (rule 8: the elision before `oil`, none before
 * `carbonil`; enclosure; multipliers — every form checked against the
 * engine's own text), tokenizer, interpreter and builder (the =O, the C=O
 * carbon outside a ring, the caps, VALENCE and LOCANT_RANGE), search
 * (left-out acyl locants), readName() verdicts with the molecule each
 * describes (against a SMILES) on chains, rings, benzene, templates and
 * inside compound branches, mutations and their diagnosis (the rules that
 * hold; since phase R-5c3b1 the principal C=O group's codes — an acyl prefix
 * whose C=O the engine's chain takes, CARBONYL_PREFIX, or on an `al`'s
 * carbon, KETONE_NOT_ALDEHYDE —; since phase R-5c3b2 the acyl words the
 * engine does not write, formerly deliberate nulls — ACYL_NAME, ACYL_CHAIN,
 * BRANCH_RING_NUMBERING, MISSING_LOCANTS inside the branch), the fixture
 * round trip over every row with an acyl prefix
 * (the aldehydes and ketones read back; acids, esters, amides and nitriles,
 * later phases, never tokenize), the closed loop over the oracle's acyl
 * generators (generateAcyl(), generateSubstitutedBenzoyls(),
 * generateRingAcids(); pure imports, no Java) and a set of ring acyl
 * molecules, the diagnosis sweeps, the ordered drawing, the dialog's
 * tooltips and time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse, isTerminalSuffix } from '../../src/reverse/parse.js';
import { assemble, itemText } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build, specAtoms, specCarbons, ringRefusal } from '../../src/reverse/build.js';
import { slotGroups } from '../../src/reverse/search.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import {
  ACETYL_ID, BENZOYL_ID, ACYL_ID, RING_CARBONYL_ID, START_ID, END_ID, OXO_ID, PHENYL_ID, tileId,
} from '../../src/reverse/tiles.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { TILE_HINTS } from '../../src/ui/name-builder.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { MAX_CARBONS, MAX_HEAVY_ATOMS, TOO_MANY_ATOMS_MESSAGE } from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { FORMYL_PREFIX, multiplier } from '../../src/naming/lexicon.es.js';
import { generateAcyl, generateSubstitutedBenzoyls, generateRingAcids } from '../../scripts/oracle/generate.mjs';
import {
  seq, readFixtures, isCarbonyl, isCarbonylMolecule, isCarbonylName, isAcylName, ACYL_WORDS, isAcid, isAcidName, ESTER_PREFIX,
} from './reverse-words.js';

/**
 * The fixture rows with an acyl prefix in a name (isAcylName()): 104, of
 * which 41 are read back: 11 aldehydes or ketones (isCarbonyl()) — 5 of I-39b
 * (`3-acetilpentano-2,4-diona`, `3,3-diacetilpentano-2,4-diona`,
 * `4-acetilheptano-2,6-diona`, `3-acetilhexanal`,
 * `2-acetil-2,3-dimetilbutanal`), 1 of I-40a (`4-acetilciclohexan-1-ona`), 3
 * of I-40b (`3-(ciclohexanocarbonil)-`, `3-(2-metilciclohexano-1-carbonil)-`,
 * `3-benzoilpentano-2,4-diona`) and 2 of I-45b
 * (`3-(4-metilbenzoil)pentano-2,4-diona`, `2-(4-yodobenzoil)butanal`) — and,
 * since phase R-5d1, 30 acids (isAcid(): 16 of I-39b, `ácido
 * 2-acetilhexanoico`…, 4 of I-40b, 10 of I-45b; until then later rows) —, and
 * 63 of later families, which never tokenize: 29 esters (R-6a: ` de `, and
 * since phase R-5d1 the 21 acids with an ester prefix, `acetiloxi`,
 * `alcoxicarbonil`), 31 amides (R-6d: and the 23 acids with `acetilamino`,
 * `carbamoil`…) and 3 nitriles (R-6b). No acid row is left: the retained acid
 * names of phase I-51d2 carry no acyl prefix.
 */
const EXPECTED_ROWS = Object.freeze({
  total: 104, read: 41, i39b: 21, i40a: 1, i40b: 7, i45b: 12, acid: 0, ester: 29, amide: 31, nitrile: 3,
});

/**
 * Their acyl names: 43 read back (11 of the aldehydes and ketones, one per row, no alternative; 32 of the acids, R-5d1), 73 of
 * later families (33 esters, 37 amides, 3 nitriles; until phase R-5d1 the 84 acid names were later ones too).
 */
const EXPECTED_NAMES = Object.freeze({ read: 43, acid: 0, ester: 33, amide: 37, nitrile: 3 });

/** The acid rows among those read back, and their acyl names (phase R-5d1). */
const EXPECTED_ACID_ROWS = Object.freeze({ rows: 30, names: 32 });

/** Average time budget of one readName() call over the fixture round trip, in milliseconds (phones are slower). */
const AVERAGE_BUDGET_MS = 50;

/** Time budget of one representative readName() call, in milliseconds. */
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
 * @returns {string[][]} Per oxygen, its bonds.
 */
function oxygenBonds(mol) {
  const bonds = [...mol.bonds.values()];
  return [...mol.atoms].filter(([, atom]) => atom.element === 'O').map(([id]) => bonds
    .filter((bond) => bond.a === id || bond.b === id)
    .map((bond) => `${mol.atoms.get(bond.a === id ? bond.b : bond.a).element}${bond.order}`)
    .sort());
}

/**
 * The family of a name with an acyl prefix that a later phase reads, by its
 * words: an ester (` de `, or an ester prefix beside an acid — `acetiloxi`,
 * `metoxicarbonil` —, R-6a), a nitrile (`nitrilo`, `ciano`, R-6b), an amide
 * (`amida`, `amino`, `carbamoil`, R-6d), or an acid the tiles do not write
 * yet (`ácido`: none since phase R-5d2, which reads the retained acid names,
 * the other acids reading since phase R-5d1).
 *
 * @param {string} name - A name.
 * @returns {string} 'acid', 'ester', 'nitrile', 'amide' or 'other'.
 */
function laterFamily(name) {
  if (/ de /.test(name) || ESTER_PREFIX.test(name)) {
    return 'ester';
  }
  if (/nitrilo|ciano/.test(name)) {
    return 'nitrile';
  }
  if (/amida|amino|carbamoil/.test(name)) {
    return 'amide';
  }
  return /^ácido /.test(name) ? 'acid' : 'other';
} // End of function laterFamily()

// ---------------------------------------------------------------------------
// Parser.
// ---------------------------------------------------------------------------

test('parser (R-5c2): the acyl ending in the branch\'s free-valence place; `acetil` and `benzoil` retained words', () => {
  // 0:2 1:prop 2:ano 3:oil 4:hept 5:ano 6:al
  let { tree, errors } = parse(seq('2 prop ano oil hept ano al'));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.items[0].substituent, {
    type: 'chain', ring: null, root: 1, ano: 2, segments: [], fvLocants: [], fv: 3, oxi: null, range: [1, 4],
  });
  // 0:2 1:ciclo 2:hex 3:2 4:eno 5:1 6:carbonil …
  ({ tree, errors } = parse(seq('2 ciclo hex 2 eno 1 carbonil hept ano al')));
  assert.deepEqual(errors, []);
  const ring = tree.items[0].substituent;
  assert.deepEqual([ring.ring, ring.root, ring.segments.map((s) => s.locants), ring.fvLocants, ring.fv], [1, 2, [[3]], [5], 6]);
  ({ tree, errors } = parse(seq('3 acetil pent ano 2 4 di ona')));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.items[0].substituent, { type: 'retained', tile: 1, oxi: null, range: [1, 2] });
  // `benzoil` is the own chain of a compound branch with prefixes of its own, as `fenil`.
  ({ tree, errors } = parse(seq('2 START 4 met il benzoil END hept ano al')));
  assert.deepEqual(errors, []);
  assert.deepEqual([tree.items[0].substituent.type, tree.items[0].substituent.chain], ['branch', { type: 'retained', tile: 5, oxi: null,
    range: [5, 6] }]);
  // A name that ends in an acyl branch is no parent.
  assert.deepEqual(errorsOf('prop ano oil'), ['ENDS_WITH_BRANCH[0,3)']);
  assert.equal(messageOf('prop ano oil'), 'El nombre acaba en una rama («propanoil»): falta la cadena principal detrás.');
  // Partial names assemble too.
  assert.equal(text('START 4 met il benzoil'), '(4-metilbenzoil');
  assert.equal(text('ciclo hex ano'), 'ciclohexano');
}); // End of test 'parser (R-5c2): the acyl ending…'

test('parser (R-5c2): misplaced acyl tiles are errors with their tile ranges and hints', () => {
  const lead = 'Esta ficha no puede ir aquí: ';
  const cases = [
    ['prop oil hept ano al', 'TILE_ORDER[1,2)', `${lead}delante de «oil» va la terminación de la rama, como en la cadena principal: prop, ano y `
      + 'oil dan propanoil; but, 2, eno y oil dan (but-2-enoil).'],
    ['ciclo hex carbonil hept ano al', 'TILE_ORDER[2,3)', `${lead}delante de «carbonil» va el nombre del anillo con su terminación: `
      + 'ciclo, hex, ano y carbonil dan (ciclohexanocarbonil).'],
    ['ciclo hex ano oil hept ano al', 'TILE_ORDER[3,4)', `${lead}en un anillo, el grupo C=O unido a él se escribe con «carbonil», `
      + 'detrás del nombre del anillo: (ciclohexanocarbonil); el del benceno es «benzoil».'],
    ['prop ano carbonil hept ano al', 'TILE_ORDER[2,3)', `${lead}«carbonil» va detrás del nombre de un anillo: (ciclohexanocarbonil); `
      + 'en una cadena, la rama acaba en «oil»: propanoil.'],
    ['prop ano 1 oil hept ano al', 'TILE_ORDER[2,3)', `${lead}«oil» no lleva números: su grupo C=O está siempre en el carbono 1 de la `
      + 'rama, el que se une a la cadena (propanoil, (but-2-enoil)).'],
    ['ciclo hex ano 1 2 carbonil hept ano al', 'LOCANT_COUNT[3,5)', 'Una rama se une a la cadena por un solo carbono: delante de '
      + '«carbonil» va un solo número.'],
    ['oil hept ano al', 'TILE_ORDER[0,1)', `${lead}«oil» va justo detrás de la terminación de una rama, y la une a la cadena por su `
      + 'carbono 1, el del grupo C=O: prop, ano y oil dan propanoil; para un anillo se usa «carbonil» ((ciclohexanocarbonil)) y para '
      + 'el benceno, «benzoil».'],
    ['fenil carbonil hept ano al', 'TILE_ORDER[1,2)', `${lead}«carbonil» va justo detrás del nombre de un anillo con su terminación: `
      + 'ciclo, hex, ano y carbonil dan (ciclohexanocarbonil); para el benceno se usa «benzoil», y para una cadena, «oil» (propanoil).'],
    ['benceno carbonil', 'TILE_ORDER[1,2)', `${lead}«benceno» es el anillo principal y va al final del nombre; como rama unida a un `
      + 'grupo C=O, el benceno se escribe «benzoil».'],
    ['acetil oxi met ano', 'TILE_ORDER[1,2)', `${lead}«oxi» no va detrás de «acetil»: un grupo C=O unido a un oxígeno no forma un éter.`],
    ['prop ano oil oxi met ano', 'TILE_ORDER[3,4)', `${lead}«oxi» no va detrás de «oil»: un grupo C=O unido a un oxígeno no forma un `
      + 'éter.'],
    ['benzoil oxi met ano', 'TILE_ORDER[1,2)', `${lead}«oxi» no va detrás de «benzoil»: un grupo C=O unido a un oxígeno no forma un éter.`],
    ['acetil met il éter', 'TILE_ORDER[0,1)', `${lead}«acetil» no va en un nombre con «éter»: un grupo C=O unido al oxígeno no forma un `
      + 'éter. Los dos grupos de un éter son cadenas o anillos de carbonos (etil metil éter).'],
    ['prop ano oil met il éter', 'TILE_ORDER[2,3)', `${lead}«oil» no va en un nombre con «éter»: un grupo C=O unido al oxígeno no forma `
      + 'un éter. Los dos grupos de un éter son cadenas o anillos de carbonos (etil metil éter).'],
    ['benzoil met il éter', 'TILE_ORDER[0,1)', `${lead}«benzoil» no va en un nombre con «éter»: un grupo C=O unido al oxígeno no forma un `
      + 'éter. Los dos grupos de un éter son cadenas o anillos de carbonos (etil metil éter).'],
    ['START 4 met il benzoil', 'BRANCH_OPEN[0,5)', 'Falta cerrar la rama compuesta.'],
  ];
  for (const [words, error, message] of cases) {
    const errors = errorsOf(words);
    assert.ok(errors.includes(error), `${words}: ${errors.join(' ')} lacks ${error}`);
    const found = parse(seq(words)).errors.find((e) => `${e.code}[${e.from},${e.to})` === error);
    assert.equal(found.message, message, words);
  } // End of the loop over the cases
  // Assembled as written, the acyl word whole before `oxi` (render.js writes `(acetiloxi)`, an ester's prefix: R-6a).
  assert.equal(text('acetil oxi met ano'), '(acetiloxi)metano');
  assert.equal(text('prop ano 1 oil hept ano al'), '(propan-1-oil)heptanal');
}); // End of test 'parser (R-5c2): misplaced acyl tiles…'

// ---------------------------------------------------------------------------
// Assembler and tokenizer.
// ---------------------------------------------------------------------------

/**
 * Every acyl form of phase R-5c2 as tile words and the SMILES of a molecule
 * whose engine names include the form (render.js acylEndingTokens(),
 * ringCarbonylTokens(), needsEnclosure(), isCompoundPrefix(),
 * enclosureLevel()).
 */
const FORMS = Object.freeze([
  ['3 acetil pent ano 2 4 di ona', 'CC(=O)C(C(C)=O)C(C)=O'],
  ['3 3 di acetil pent ano 2 4 di ona', 'CC(=O)C(C(C)=O)(C(C)=O)C(C)=O'],
  ['2 prop ano oil hept ano al', 'O=CC(CCCCC)C(=O)CC'],
  ['2 but ano oil hept ano al', 'O=CC(CCCCC)C(=O)CCC'],
  ['2 START 2 met il prop ano oil END hept ano al', 'O=CC(CCCCC)C(=O)C(C)C'],
  ['2 START 2 2 di met il prop ano oil END hept ano al', 'O=CC(CCCCC)C(=O)C(C)(C)C'],
  ['2 prop 2 eno oil hept ano al', 'O=CC(CCCCC)C(=O)C=C'],
  ['2 but 2 eno oil hept ano al', 'O=CC(CCCCC)C(=O)C=CC'],
  ['2 but 2 ino oil hept ano al', 'O=CC(CCCCC)C(=O)C#CC'],
  ['2 but 2 3 di eno oil hept ano al', 'O=CC(CCCCC)C(=O)C=C=C'],
  ['2 START 3 oxo but ano oil END hept ano al', 'O=CC(CCCCC)C(=O)CC(C)=O'],
  ['2 START 2 cloro et ano oil END hept ano al', 'O=CC(CCCCC)C(=O)CCl'],
  ['2 START 2 met il oxi et ano oil END hept ano al', 'O=CC(CCCCC)C(=O)COC'],
  ['2 START 3 hidroxi prop ano oil END hept ano al', 'O=CC(CCCCC)C(=O)CCO'],
  ['2 benzoil hept ano al', 'O=CC(CCCCC)C(=O)C1=CC=CC=C1'],
  ['2 START 4 met il benzoil END hept ano al', 'O=CC(CCCCC)C(=O)C1=CC=C(C)C=C1'],
  ['2 START 2 4 di cloro benzoil END hept ano al', 'O=CC(CCCCC)C(=O)C1=CC=C(Cl)C=C1Cl'],
  ['2 START 4 met il oxi benzoil END hept ano al', 'O=CC(CCCCC)C(=O)C1=CC=C(OC)C=C1'],
  ['2 START 4 isopropil benzoil END hept ano al', 'O=CC(CCCCC)C(=O)C1=CC=C(C(C)C)C=C1'],
  ['2 START 4 prop ano 2 il benzoil END hept ano al', 'O=CC(CCCCC)C(=O)C1=CC=C(C(C)C)C=C1'],
  ['2 ciclo hex ano carbonil hept ano al', 'O=CC(CCCCC)C(=O)C1CCCCC1'],
  ['2 ciclo prop ano carbonil hept ano al', 'O=CC(CCCCC)C(=O)C1CC1'],
  ['2 ciclo hex 2 eno 1 carbonil hept ano al', 'O=CC(CCCCC)C(=O)C1C=CCCC1'],
  ['2 ciclo hex 1 eno 1 carbonil hept ano al', 'O=CC(CCCCC)C(=O)C1=CCCCC1'],
  ['2 ciclo hex 2 4 di eno 1 carbonil hept ano al', 'O=CC(CCCCC)C(=O)C1C=CC=CC1'],
  ['2 START 2 met il ciclo hex ano 1 carbonil END hept ano al', 'O=CC(CCCCC)C(=O)C1CCCCC1C'],
  ['3 ciclo hex ano carbonil pent ano 2 4 di ona', 'CC(=O)C(C(=O)C1CCCCC1)C(C)=O'],
  ['4 acetil ciclo hex ano 1 carbaldehído', 'O=CC1CCC(C(C)=O)CC1'],
  ['4 acetil ciclo hex ano 1 ona', 'CC(=O)C1CCC(=O)CC1'],
  ['2 START 4 acetil ciclo hex il END but ano al', 'O=CC(CC)C1CCC(C(C)=O)CC1'],
  ['2 START 3 acetil 5 oxo hex ano 2 il END but ano di al', 'O=CCC(C=O)C(C)C(C(C)=O)CC(C)=O'],
  ['2 2 di acetil hept ano al', 'O=CC(CCCCC)(C(C)=O)C(C)=O'],
  ['2 2 di prop 2 eno oil hept ano al', 'O=CC(CCCCC)(C(=O)C=C)C(=O)C=C'],
  ['2 2 bis START 2 met il prop ano oil END hept ano al', 'O=CC(CCCCC)(C(=O)C(C)C)C(=O)C(C)C'],
  ['2 acetil 2 3 di met il but ano al', 'CC(C(C(C)=O)(C)C=O)C'],
  ['2 benzoil 2 met il hept ano al', 'O=CC(C)(CCCCC)C(=O)C1=CC=CC=C1'],
]);

test('assembler (R-5c2): every acyl form is the forward engine\'s own text; the tokenizer reads it back', () => {
  for (const [words, smiles] of FORMS) {
    const assembled = text(words);
    assert.ok(namesOf(smiles).includes(assembled), `${words} → ${assembled}, not among ${namesOf(smiles).join(', ')}`);
    assert.deepEqual(tokenize(assembled), seq(words), assembled);
  }
}); // End of test 'assembler (R-5c2): every acyl form…'

test('assembler (R-5c2, design.md §15.5.2 rule 8): one test per rule — elision, enclosure, multipliers, nesting, spans', () => {
  // The ending before the acyl ending loses its vowel before `oil` (rule 4's elision), keeps it before `carbonil`.
  assert.deepEqual(['prop ano oil met ano', 'but 2 eno oil met ano', 'but 2 ino oil met ano'].map(text),
    ['propanoilmetano', '(but-2-enoil)metano', '(but-2-inoil)metano']);
  assert.deepEqual(['ciclo hex ano carbonil met ano', 'ciclo hex 2 eno 1 carbonil met ano'].map(text),
    ['(ciclohexanocarbonil)metano', '(ciclohex-2-eno-1-carbonil)metano']);
  // The connecting `a` (rule 2) before a multiplied first segment, on a chain's and on a ring's acyl prefix.
  assert.equal(text('but 2 3 di eno oil met ano'), '(buta-2,3-dienoil)metano');
  assert.equal(text('ciclo hex 2 4 di eno 1 carbonil met ano'), '(ciclohexa-2,4-dieno-1-carbonil)metano');
  // Enclosure: a chain's acyl prefix only with a multiple bond or prefixes of its own; a ring's always; `acetil` and `benzoil`
  // never by themselves, `benzoil` with prefixes of its own a compound branch.
  assert.deepEqual(['2 prop ano oil hept ano al', '2 prop 2 eno oil hept ano al', '2 prop eno oil hept ano al'].map(text),
    ['2-propanoilheptanal', '2-(prop-2-enoil)heptanal', '2-(propenoil)heptanal']);
  assert.equal(text('2 START 2 met il prop ano oil END hept ano al'), '2-(2-metilpropanoil)heptanal');
  assert.equal(text('2 ciclo prop ano carbonil hept ano al'), '2-(ciclopropanocarbonil)heptanal');
  assert.deepEqual(['2 acetil hept ano al', '2 benzoil hept ano al', '2 START benzoil END hept ano al'].map(text),
    ['2-acetilheptanal', '2-benzoilheptanal', '2-benzoilheptanal']);
  // Nesting: an enclosed prefix inside `benzoil` takes the brackets outside.
  assert.equal(text('2 START 4 prop ano 2 il benzoil END hept ano al'), '2-[4-(propan-2-il)benzoil]heptanal');
  // Multipliers as the student chose them: di before a simple acyl prefix, even enclosed; bis before a compound one; and wrong
  // ones kept as written.
  assert.deepEqual(['2 2 di acetil hept ano al', '2 2 di prop 2 eno oil hept ano al', '2 2 bis prop 2 eno oil hept ano al',
    '2 2 bis START 2 met il prop ano oil END hept ano al', '2 2 di START 2 met il prop ano oil END hept ano al'].map(text),
  ['2,2-diacetilheptanal', '2,2-di(prop-2-enoil)heptanal', '2,2-bis(prop-2-enoil)heptanal', '2,2-bis(2-metilpropanoil)heptanal',
    '2,2-di(2-metilpropanoil)heptanal']);
  // The spans: the acyl ending is a piece of the prefix part, one span per tile.
  const { spans } = assemble(parse(seq('2 prop ano oil hept ano al')).tree);
  assert.deepEqual(spans.filter((s) => s.tile !== null).map((s) => [s.tile, s.kind]),
    [[0, 'locant'], [1, 'prefix'], [2, 'prefix'], [3, 'prefix'], [4, 'stem'], [5, 'ending'], [6, 'ending']]);
  const nested = assemble(parse(seq('2 START 2 met il prop ano oil END hept ano al')).tree).spans;
  assert.deepEqual(nested.filter((s) => s.tile !== null && s.tile >= 2 && s.tile <= 7).map((s) => s.kind),
    ['prefix', 'prefix', 'prefix', 'prefix', 'prefix', 'prefix']);
}); // End of test 'assembler (R-5c2, design.md §15.5.2 rule 8)…'

test('tokenizer (R-5c2): acyl names read back; forms the engine never writes, and later families, never read', () => {
  for (const name of ['2-propanoilheptanal', '2-(2-metilpropanoil)heptanal', '2-(ciclohexanocarbonil)heptanal', '3-benzoilpentano-2,4-diona',
    '2-(4-metilbenzoil)heptanal', '2-[4-(propan-2-il)benzoil]heptanal']) {
    assert.ok(tokenize(name), name);
  }
  for (const name of ['2-propoilheptanal', '2-(ciclohexancarbonil)heptanal', '2-ciclohexanocarbonilheptanal', '2-(propanoil)heptanal',
    '2-acetoxiheptanal', '2-(acetiloxi)heptanal', 'propanoil', '2-(propan-1-oil)heptanal', 'bencenocarbonilmetano',
    // Later families: esters (R-6a; an ester prefix beside an acid too), amides (R-6d), nitriles (R-6b).
    'etanoato de 2-acetilhexilo', '2-acetilpentanamida', '2-acetilpentanonitrilo', 'ácido 2-(acetilamino)etanoico',
    'ácido 2-(acetiloxi)etanoico']) {
    assert.equal(tokenize(name), null, name);
  }
  assert.ok(tokenize('ácido 2-acetilhexanoico'), 'an acid with an acyl prefix reads since phase R-5d1');
  assert.deepEqual(ACYL_WORDS, ['acetil', 'oil', 'carbonil', 'benzoil']);
}); // End of test 'tokenizer (R-5c2)…'

// ---------------------------------------------------------------------------
// Interpreter, builder and search.
// ---------------------------------------------------------------------------

test('interpreter (R-5c2): an acyl prefix is its branch\'s SubstituentSpec with `acyl`, bonded by a single bond', () => {
  // `oil`: a chain bonded by its carbon 1, implicit on the `oil` tile.
  let sub = specOf('2 prop ano oil hept ano al').prefixes[0].substituent;
  assert.deepEqual([sub.kind, sub.length, sub.acyl, sub.alkoxy, sub.freeValence.order], ['chain', 3, true, false, 1]);
  assert.deepEqual([sub.freeValence.slot.kind, sub.freeValence.slot.value, sub.freeValence.slot.tiles], ['implicit', 1, [3, 4]]);
  // `carbonil`: a ring, its free valence at the locant written before `carbonil` (or carbon 1 by rule).
  sub = specOf('2 ciclo hex 2 eno 1 carbonil hept ano al').prefixes[0].substituent;
  assert.deepEqual([sub.kind, sub.length, sub.acyl, sub.freeValence.slot.kind, sub.freeValence.slot.value],
    ['ring', 6, true, 'supplied', 1]);
  sub = specOf('2 ciclo hex ano carbonil hept ano al').prefixes[0].substituent;
  assert.deepEqual([sub.freeValence.slot.kind, sub.freeValence.slot.value], ['implicit', 1]);
  // `benzoil`: a phenyl with `acyl`, its own prefixes on carbons 2…6.
  sub = specOf('2 START 4 met il benzoil END hept ano al').prefixes[0].substituent;
  assert.deepEqual([sub.kind, sub.retained, sub.acyl, sub.prefixes[0].slots[0].role], ['phenyl', 'benzoyl', true, 'phenylCarbon']);
  // `acetil`: a retained word; every other branch has `acyl` false.
  sub = specOf('3 acetil pent ano 2 4 di ona').prefixes[0].substituent;
  assert.deepEqual([sub.kind, sub.retained, sub.acyl], ['retained', 'acetyl', true]);
  assert.deepEqual(['2 met il hept ano al', '2 fenil hept ano al', '2 formil hept ano al', '2 cloro hept ano al']
    .map((words) => specOf(words).prefixes[0].substituent.acyl), [false, false, false, false]);
}); // End of test 'interpreter (R-5c2)…'

test('builder (R-5c2): the =O on the acyl carbon, the C=O carbon outside a ring; atoms counted for the caps', () => {
  let built = build(specOf('2 prop ano oil hept ano al'));
  assert.ok(built.ok);
  assert.equal(aromaticKey(built.molecule), keyOf('O=CC(CCCCC)C(=O)CC'));
  assert.deepEqual(oxygenBonds(built.molecule), [['C2'], ['C2']]);
  // The occurrence's attachment is the C=O carbon, bonded to the parent's carbon 2.
  let [occurrence] = built.prefixAtoms;
  assert.equal(occurrence.parentAtom, built.studentParent.atoms[1]);
  assert.ok(oxygenBonds(built.molecule).length === 2 && built.molecule.atoms.get(occurrence.attachment).element === 'C');
  // `carbonil`, `benzoil`: a new carbon between the ring and the parent, the =O on it.
  built = build(specOf('2 ciclo hex ano carbonil hept ano al'));
  assert.equal(aromaticKey(built.molecule), keyOf('O=CC(CCCCC)C(=O)C1CCCCC1'));
  [occurrence] = built.prefixAtoms;
  const bondsOf = (id) => [...built.molecule.bonds.values()].filter((bond) => bond.a === id || bond.b === id);
  assert.deepEqual(bondsOf(occurrence.attachment).map((bond) => bond.order).sort(), [1, 1, 2]);
  assert.equal(aromaticKey(build(specOf('2 START 4 met il benzoil END hept ano al')).molecule), keyOf('O=CC(CCCCC)C(=O)C1=CC=C(C)C=C1'));
  assert.equal(aromaticKey(build(specOf('3 acetil pent ano 2 4 di ona')).molecule), keyOf('CC(=O)C(C(C)=O)C(C)=O'));
  // The caps: a ring's acyl prefix adds one carbon and two heavy atoms; a chain's, its =O.
  let spec = specOf('2 ciclo hex ano carbonil hept ano al');
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [14, 16]);
  spec = specOf('2 2 di prop ano oil hept ano al');
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [13, 16]);
  spec = specOf('2 START 4 met il benzoil END hept ano al');
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [15, 17]);
  // 21 acetyl groups on an 18-carbon chain: 60 carbons, within the cap, but 81 heavy atoms with their oxygens.
  const locants = [...Array.from({ length: 18 }, (_, i) => i + 1), 2, 3, 4].sort((a, b) => a - b).join(' ');
  const verdict = read(`${locants} ${multiplier(21)} acetil octadec ano`);
  assert.deepEqual([verdict.kind, verdict.errors[0].code, verdict.message], ['invalid', 'TOO_BIG', TOO_MANY_ATOMS_MESSAGE]);
  assert.ok(18 + 21 * 2 <= MAX_CARBONS && 18 + 21 * 3 > MAX_HEAVY_ATOMS);
  // Two rings through the C=O carbon are not bonded atom to atom: the molecule is built and the engine refuses it itself.
  assert.equal(ringRefusal(specOf('benzoil benceno')), null);
  assert.equal(ringRefusal(specOf('ciclo hex il benceno')).code, 'RING_SYSTEM');
}); // End of test 'builder (R-5c2): the =O…'

test('builder (R-5c2): VALENCE, LOCANT_RANGE and TILE_ORDER for the acyl prefixes, each with its tiles', () => {
  const cases = [
    ['2 START 1 cloro prop ano oil END hept ano al', 'VALENCE', [6, 7],
      'El carbono 1 de la rama tendría 5 enlaces, y un carbono solo puede tener 4: el grupo C=O de «oil» va en ese carbono.'],
    ['2 START prop 1 eno oil END hept ano al', 'VALENCE', [5, 6],
      'El carbono 1 de la rama tendría 5 enlaces, y un carbono solo puede tener 4: el grupo C=O de «oil» va en ese carbono.'],
    ['2 et eno oil hept ano al', 'VALENCE', [2, 3],
      'No caben: pongas donde pongas lo que va sin número, algún carbono tendría más de 4 enlaces.'],
    ['2 2 2 2 tetra acetil pent ano al', 'VALENCE', [2, 3], 'El carbono 2 tendría 6 enlaces, y un carbono solo puede tener 4.'],
    ['2 START 1 met il benzoil END hept ano al', 'LOCANT_RANGE', [2, 3],
      'En «benzoil», el carbono 1 es el que se une al grupo C=O: las ramas del benzoil van en los carbonos del 2 al 6.'],
    ['2 START 7 met il benzoil END hept ano al', 'LOCANT_RANGE', [2, 3], 'El anillo de la rama va del 1 al 6: no hay carbono 7.'],
    ['2 START 7 met il ciclo hex ano 1 carbonil END hept ano al', 'LOCANT_RANGE', [2, 3],
      'El anillo de la rama va del 1 al 6: no hay carbono 7.'],
    ['START 2 cloro acetil END hept ano al', 'TILE_ORDER', [3, 4], 'Esta ficha no puede ir aquí: «acetil» ya es una rama entera y no '
      + 'lleva números ni ramas propias. Con ramas propias, el grupo se escribe a partir de «etanoil», como en (2-cloroetanoil).'],
  ];
  for (const [words, code, tiles, message] of cases) {
    const verdict = read(words);
    assert.equal(verdict.kind, 'invalid', `${words}: ${verdict.message}`);
    assert.deepEqual([verdict.errors[0].code, [verdict.errors[0].from, verdict.errors[0].to]], [code, tiles], words);
    assert.equal(verdict.message, message, words);
  } // End of the loop over the cases
}); // End of test 'builder (R-5c2): VALENCE…'

test('search (R-5c2): left-out acyl locants — groups, the =O counted, ambiguous and filled lists, the budget', () => {
  // The acyl prefix's own left-out locants are carbon slots of its chain, the =O already on its carbon 1.
  assert.deepEqual(slotGroups(specOf('2 START cloro prop ano oil END hept ano al')).map((g) => [g.role, g.domain]), [['carbon', [1, 3]]]);
  assert.equal(read('2 START cloro prop ano oil END hept ano al').message,
    'Faltan números: puede ser 2-(2-cloropropanoil)heptanal o 2-(3-cloropropanoil)heptanal.');
  const cases = [
    ['acetil pent ano di ona', 'missingLocants', 'Casi: faltan los números. Se escribe «3-acetilpentano-2,4-diona».'],
    ['4 acetil ciclo hex ano carbaldehído', 'missingLocants', 'Casi: faltan los números. Se escribe «4-acetilciclohexano-1-carbaldehído».'],
    ['2 prop eno oil hept ano al', 'missingLocants', 'Casi: faltan los números. Se escribe «2-(prop-2-enoil)heptanal».'],
    ['prop ano oil hept ano al', 'ambiguous', 'Faltan números: puede ser 2-propanoilheptanal o 3-propanoilheptanal.'],
    ['2 START met il benzoil END hept ano al', 'ambiguous',
      'Faltan números: puede ser 2-(2-metilbenzoil)heptanal, 2-(3-metilbenzoil)heptanal o 2-(4-metilbenzoil)heptanal.'],
    ['2 ciclo hex eno 1 carbonil hept ano al', 'ambiguous', 'Faltan números: puede ser 2-(ciclohex-1-eno-1-carbonil)heptanal, '
      + '2-(ciclohex-2-eno-1-carbonil)heptanal o 2-(ciclohex-3-eno-1-carbonil)heptanal.'],
  ];
  for (const [words, kind, message] of cases) {
    const verdict = read(words);
    assert.deepEqual([verdict.kind, verdict.message], [kind, message], words);
  }
  assert.equal(read('2 START met il benzoil END hept ano al', { budget: { placements: 1 } }).kind, 'incomplete');
  assert.equal(read('prop ano oil hept ano al', { budget: { namings: 1 } }).kind, 'incomplete');
}); // End of test 'search (R-5c2)…'

// ---------------------------------------------------------------------------
// readName(): verdicts, mutations, diagnosis.
// ---------------------------------------------------------------------------

/**
 * readName() cases: tile words or a name, the verdict, the engine's name and
 * the SMILES of the molecule drawn — chains, rings, benzene, templates,
 * compound branches.
 */
const CASES = Object.freeze([
  ['3-acetilpentano-2,4-diona', 'correct', '3-acetilpentano-2,4-diona', 'CC(=O)C(C(C)=O)C(C)=O'],
  ['2-propanoilheptanal', 'correct', '2-propanoilheptanal', 'O=CC(CCCCC)C(=O)CC'],
  ['2-(2-metilpropanoil)heptanal', 'correct', '2-(2-metilpropanoil)heptanal', 'O=CC(CCCCC)C(=O)C(C)C'],
  ['2-(prop-2-enoil)heptanal', 'correct', '2-(prop-2-enoil)heptanal', 'O=CC(CCCCC)C(=O)C=C'],
  ['2-(3-oxobutanoil)heptanal', 'correct', '2-(3-oxobutanoil)heptanal', 'O=CC(CCCCC)C(=O)CC(C)=O'],
  ['2-(2-cloroetanoil)heptanal', 'correct', '2-(2-cloroetanoil)heptanal', 'O=CC(CCCCC)C(=O)CCl'],
  ['2-benzoilheptanal', 'correct', '2-benzoilheptanal', 'O=CC(CCCCC)C(=O)C1=CC=CC=C1'],
  ['2-(4-metilbenzoil)heptanal', 'correct', '2-(4-metilbenzoil)heptanal', 'O=CC(CCCCC)C(=O)C1=CC=C(C)C=C1'],
  ['2-[4-(propan-2-il)benzoil]heptanal', 'alternative', '2-(4-isopropilbenzoil)heptanal', 'O=CC(CCCCC)C(=O)C1=CC=C(C(C)C)C=C1'],
  ['2-(ciclohexanocarbonil)heptanal', 'correct', '2-(ciclohexanocarbonil)heptanal', 'O=CC(CCCCC)C(=O)C1CCCCC1'],
  ['2-(ciclohex-2-eno-1-carbonil)heptanal', 'correct', '2-(ciclohex-2-eno-1-carbonil)heptanal', 'O=CC(CCCCC)C(=O)C1C=CCCC1'],
  ['3-(2-metilciclohexano-1-carbonil)pentano-2,4-diona', 'correct', '3-(2-metilciclohexano-1-carbonil)pentano-2,4-diona',
    'CC(=O)C(C(=O)C1CCCCC1C)C(C)=O'],
  // A ring parent; an acyl prefix inside a compound branch, on a chain's and on a ring's.
  ['4-acetilciclohexano-1-carbaldehído', 'correct', '4-acetilciclohexano-1-carbaldehído', 'O=CC1CCC(C(C)=O)CC1'],
  ['2-(4-acetilciclohexil)butanal', 'correct', '2-(4-acetilciclohexil)butanal', 'O=CC(CC)C1CCC(C(C)=O)CC1'],
  ['2-(3-acetil-5-oxohexan-2-il)butanodial', 'correct', '2-(3-acetil-5-oxohexan-2-il)butanodial', 'O=CCC(C=O)C(C)C(C(C)=O)CC(C)=O'],
  // On a hydrocarbon ring, on benzene and on a template, the C=O is a ketone's whose chain is the parent: another name.
  ['but ano oil ciclo hex ano', 'otherName', '1-ciclohexilbutan-1-ona', 'CCCC(=O)C1CCCCC1'],
  ['acetil benceno', 'otherName', '1-feniletan-1-ona', 'CC(=O)C1=CC=CC=C1'],
  ['4 acetil tolueno', 'otherName', '1-(4-metilfenil)etan-1-ona', 'CC(=O)C1=CC=C(C)C=C1'],
  // Acyl words the engine writes otherwise.
  ['2 et ano oil hept ano al', 'otherName', '2-acetilheptanal', 'O=CC(CCCCC)C(C)=O'],
  ['2 met ano oil hept ano al', 'otherName', '2-pentilpropanodial', 'O=CC(CCCCC)C=O'],
]);

test('readName (R-5c2): verdicts and the molecule each name describes, against a SMILES', () => {
  for (const [name, kind, engine, smiles] of CASES) {
    const verdict = read(name);
    assert.equal(verdict.kind, kind, `${name}: ${verdict.message}`);
    assert.equal(verdict.name, engine, name);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${name} builds another graph`);
    assert.equal(verdict.draw, true);
  }
  // What the app cannot draw: two rings through the C=O carbon, or a benzene with a C=O on the ring and on a branch.
  for (const [words, reason] of [['benzoil benceno', /varios anillos/], ['2 2 di benzoil hept ano al', /varios anillos/],
    ['4 acetil benzaldehído', /Este benceno tiene 2 sustituyentes/], ['1 4 di acetil benceno', /Este benceno tiene 2 sustituyentes/]]) {
    const verdict = read(words);
    assert.equal(verdict.kind, 'outOfScope', `${words}: ${verdict.message}`);
    assert.match(verdict.message, reason, words);
  }
}); // End of test 'readName (R-5c2): verdicts…'

/**
 * Mutations of acyl names (design.md §15.7): tile words, the verdict and the
 * diagnosis code.
 */
const MUTATIONS = Object.freeze([
  ['3 acetil 3 acetil pent ano 2 4 di ona', 'otherName', 'UNGROUPED'],
  ['3 3 bis acetil pent ano 2 4 di ona', 'otherName', 'MULTIPLIER_KIND'],
  ['2 2 bis prop 2 eno oil hept ano al', 'otherName', 'MULTIPLIER_KIND'],
  ['2 2 di START 2 met il prop ano oil END hept ano al', 'otherName', 'MULTIPLIER_KIND'],
  ['2 met il 2 benzoil hept ano al', 'otherName', 'ALPHABETICAL_ORDER'],
  ['2 met il 2 ciclo hex ano carbonil hept ano al', 'otherName', 'ALPHABETICAL_ORDER'],
  ['2 3 di met il 2 acetil but ano al', 'otherName', 'ALPHABETICAL_ORDER'],
  ['6 acetil hex ano al', 'otherName', 'BRANCH_AT_END'],
  ['4 START 4 yodo benzoil END but ano al', 'otherName', 'BRANCH_AT_END'],
  ['4 acetil hex ano al', 'otherName', 'MORE_SUBSTITUENTS'],
  ['3 START 4 yodo benzoil END but ano al', 'otherName', 'MORE_SUBSTITUENTS'],
  ['3 acetil 2 3 di met il but ano al', 'otherName', 'LONGER_CHAIN'],
  ['4 prop ano oil pent ano di al', 'otherName', 'NUMBERING'],
  ['3 oxo 2 pent ano oil but ano di al', 'otherName', 'NUMBERING'],
  ['2 ciclo hex ano 1 carbonil hept ano al', 'otherName', 'NEEDLESS_LOCANTS'],
  // The principal C=O group's codes (phase R-5c3b1): the acyl prefix's C=O is the engine's ketone, or on the `al`'s carbon.
  ['acetil benceno', 'otherName', 'CARBONYL_PREFIX'],
  ['1 acetil hex ano al', 'otherName', 'KETONE_NOT_ALDEHYDE'],
  // The branch-name codes (phase R-5c3b2, formerly deliberate nulls): acyl words the engine does not write.
  ['2 et ano oil hept ano al', 'otherName', 'ACYL_NAME'],
  ['2 START 3 met il prop ano oil END hept ano al', 'otherName', 'ACYL_CHAIN'],
  ['2 START 6 met il benzoil END hept ano al', 'otherName', 'BRANCH_RING_NUMBERING'],
  ['2 ciclo hex 2 eno carbonil hept ano al', 'otherName', 'MISSING_LOCANTS'],
  // Other verdicts.
  ['2 prop ano oil hept ano al', 'correct', null],
  ['acetil pent ano di ona', 'missingLocants', null],
  ['prop ano oil hept ano al', 'ambiguous', null],
]);

test('mutations (R-5c2): the expected verdict, and the diagnosis of every rule that holds for an acyl prefix', () => {
  for (const [words, kind, code] of MUTATIONS) {
    const verdict = read(words);
    assert.equal(verdict.kind, kind, `${words}: ${verdict.message}`);
    if (kind !== 'otherName') {
      continue;
    }
    assert.equal(verdict.diagnosis ? verdict.diagnosis.code : null, code, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    if (verdict.diagnosis) {
      const opened = diagnosisExplanation(verdict, explain);
      const { step } = verdict.diagnosis;
      assert.ok(opened.index >= 0 && [step, ...STEP_FALLBACKS[step]].includes(opened.steps[opened.index].id), words);
    }
  } // End of the loop over the mutations
  const messages = {
    '3 acetil 3 acetil pent ano 2 4 di ona': 'Las ramas iguales se escriben una sola vez, con «di», «tri»… delante: «3,3-diacetil», no '
      + '«3-acetil-3-acetil».',
    '3 3 bis acetil pent ano 2 4 di ona': '«bis», «tris»… solo van delante de ramas que tienen sus propias ramas; aquí va «di», '
      + '«tri»…: «3,3-diacetil», no «3,3-bisacetil».',
    '2 2 bis prop 2 eno oil hept ano al': '«bis», «tris»… solo van delante de ramas que tienen sus propias ramas; aquí va «di», '
      + '«tri»…: «2,2-di(prop-2-enoil)», no «2,2-bis(prop-2-enoil)».',
    '2 2 di START 2 met il prop ano oil END hept ano al': 'Delante de una rama que tiene sus propias ramas se usa «bis», «tris»…: '
      + '«2,2-bis(2-metilpropanoil)», no «2,2-di(2-metilpropanoil)».',
    '2 met il 2 ciclo hex ano carbonil hept ano al': 'Los sustituyentes se escriben por orden alfabético: «ciclohexanocarbonil» va antes '
      + 'que «metil» (c antes que m).',
    '6 acetil hex ano al': 'La rama «acetil» está en el extremo de la cadena, así que la alarga: la cadena principal tiene 8 carbonos.',
    '4 START 4 yodo benzoil END but ano al': 'La rama «4-yodobenzoil» está en el extremo de la cadena, así que la alarga: la cadena '
      + 'principal tiene 5 carbonos.',
    // The acyl prefix's C=O is an `oxo` substituent of the chain through its carbon: «sustituyentes», not «ramas».
    '4 acetil hex ano al': 'Hay otra cadena igual de larga con más sustituyentes (2; la tuya tiene 1). Entre cadenas igual de largas, '
      + 'gana la que tiene más sustituyentes.',
    '3 acetil 2 3 di met il but ano al': 'Hay una cadena más larga que la tuya: la tuya tiene 4 carbonos y la cadena principal tiene 5.',
    '4 prop ano oil pent ano di al': 'Hay que numerar la cadena desde el otro extremo: los sustituyentes tienen que llevar los números '
      + 'más bajos (2 en vez de 4).',
    '2 ciclo hex ano 1 carbonil hept ano al': 'Sobran números dentro de la rama: se escribe «2-(ciclohexanocarbonil)», no '
      + '«2-(ciclohexano-1-carbonil)».',
  };
  for (const [words, message] of Object.entries(messages)) {
    assert.equal(read(words).diagnosis.message, message, words);
  }
}); // End of test 'mutations (R-5c2)…'

/** The acyl words of the engine's prefixes (ACYL_WORDS, and `formil`), for onlyAcylWordsDiffer(). */
const ENGINE_ACYL_WORDS = Object.freeze([...ACYL_WORDS, FORMYL_PREFIX]);

/**
 * Tells whether the student's name and the engine's differ only in the words
 * of one acyl prefix (the former deliberate nulls of R-5c2, coded since phase
 * R-5c3b2; read independently of diagnose.js): the engine's name with one
 * of its prefix parts that has an acyl word, and the student's with the words
 * of one of its prefixes, each replaced by a mark, read alike once the
 * enclosing marks are left out (the first occurrence of the student's words is
 * replaced; the cases this decides have one).
 *
 * @param {object} tree - The student's parse() tree.
 * @param {object} verdict - Its `otherName` verdict.
 * @returns {boolean} True when only an acyl prefix's words differ.
 */
function onlyAcylWordsDiffer(tree, verdict) {
  /**
   * A text without enclosing marks.
   *
   * @param {string} t - The text.
   * @returns {string} The text.
   */
  const bare = (t) => t.replace(/[()[\]{}]/g, '');
  const student = bare(verdict.text);
  const engine = verdict.naming.parts.map((p) => p.text);
  return verdict.naming.parts.some((part, i) => {
    if (part.kind !== 'prefix' || !ENGINE_ACYL_WORDS.some((word) => part.text.includes(word))) {
      return false;
    }
    const marked = bare([...engine.slice(0, i), '#', ...engine.slice(i + 1)].join(''));
    return tree.items.some((item) => {
      const words = bare(itemText(tree, { ...item, locants: [], letter: null, multiplier: null }));
      return student.replace(words, '#') === marked;
    });
  });
} // End of function onlyAcylWordsDiffer()

/**
 * Why the diagnosis of an acyl name's `otherName` is null, read independently
 * of diagnose.js from the engine's naming (file header «Aldehydes and
 * ketones» of diagnose.js): `otherFamily` as in reverse-carbonyls.test.js (an
 * OH on a –CHO's carbon makes an acid, phase R-5d). Since phase R-5c3b1 the
 * principal C=O group's former reasons have their codes, and since phase
 * R-5c3b2 the acyl words the engine does not write, formerly `acylWords`
 * (tests below). Null when none applies (an unexpected null).
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} verdict - Its `otherName` verdict.
 * @returns {string|null} The reason.
 */
function nullReason(ids, verdict) {
  const engine = verdict.naming.structure.suffix;
  return engine && !['aldehyde', 'ketone'].includes(engine.kind) ? 'otherFamily' : null;
} // End of function nullReason()

test('the former deliberate nulls of R-5c2, acyl words the engine does not write: each now has its R-5c3b2 code', () => {
  const cases = [
    ['2 et ano oil hept ano al', 'ACYL_NAME'], // `etanoil` for the engine's `acetil`
    ['3 START 1 oxo et il END pent ano 2 4 di ona', 'ACYL_NAME'], // `(1-oxoetil)` for `acetil`
    ['2 START 1 oxo prop il END hept ano al', 'ACYL_NAME'], // `(1-oxopropil)` for `propanoil`
    ['2 START 3 met il prop ano oil END hept ano al', 'ACYL_CHAIN'], // the acyl's own chain not the engine's: `butanoil`
    ['2 START 2 et il prop ano oil END hept ano al', 'ACYL_CHAIN'], // `(2-metilbutanoil)`
    ['2 START 6 met il benzoil END hept ano al', 'BRANCH_RING_NUMBERING'], // the benzoyl numbered from the other side
    ['2 START 6 met il ciclo hex ano 1 carbonil END hept ano al', 'BRANCH_RING_NUMBERING'], // `(2-metilciclohexano-1-carbonil)`
    ['2 ciclo hex 2 eno carbonil hept ano al', 'MISSING_LOCANTS'], // the locant 1 the engine writes left out
    ['2 ciclo hex ano 2 carbonil hept ano al', 'BRANCH_RING_NUMBERING'], // a free-valence locant other than 1 on the ring
  ];
  for (const [words, code] of cases) {
    const ids = seq(words);
    const verdict = readName(ids);
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    // Only the words of one acyl prefix differ from the engine's name (read without diagnose.js).
    assert.ok(onlyAcylWordsDiffer(parse(ids).tree, verdict), words);
    assert.equal(verdict.diagnosis && verdict.diagnosis.code, code, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.equal(verdict.diagnosis.step, 'substituents', words);
    const opened = diagnosisExplanation(verdict, explain);
    assert.equal(opened.steps[opened.index].id, 'substituents', words);
    assert.equal(nullReason(ids, verdict), null, words);
  } // End of the loop over the former nulls
}); // End of test 'the former deliberate nulls of R-5c2, acyl words…'

test('the former deliberate nulls of R-5c2 that concern the principal C=O group: each now has its R-5c3b1 code', () => {
  const cases = [
    ['acetil benceno', 'CARBONYL_PREFIX'], // no suffix: the ketone's chain is the parent, `1-feniletan-1-ona`
    ['but ano oil ciclo hex ano', 'CARBONYL_PREFIX'],
    ['4 acetil tolueno', 'CARBONYL_PREFIX'],
    ['1 acetil hex ano al', 'KETONE_NOT_ALDEHYDE'], // the acyl's C=O in the chain: `octano-2,3-diona`
    ['2 met ano oil hept ano al', 'CARBONYL_PREFIX'], // `metanoil`, a –CHO: `2-pentilpropanodial`
    ['5 acetil ciclo hex ano 2 ona', 'RING_NUMBERING'], // the ring numbered otherwise at N0
  ];
  for (const [words, code] of cases) {
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    assert.equal(verdict.diagnosis && verdict.diagnosis.code, code, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(!/undefined|null|NaN|\[object|grupo –OH|grupos –OH/.test(verdict.diagnosis.message), words);
  }
  assert.equal(read('acetil benceno').diagnosis.message, 'El grupo C=O es el grupo principal: se nombra con la terminación «-ona», '
    + 'al final del nombre, no dentro del prefijo «acetil». Su carbono entra en la cadena principal, y el anillo pasa a ser una '
    + 'rama. Se escribe «1-feniletan-1-ona».');
}); // End of test 'the former deliberate nulls of R-5c2…'

// ---------------------------------------------------------------------------
// Fixture round trip and closed loop (design.md §15.7).
// ---------------------------------------------------------------------------

test('fixture round trip (R-5c2, R-5d1): every acyl name of an aldehyde, a ketone or an acid reads back; later families never tokenize', async () => {
  const fixtures = await readFixtures();
  const rows = fixtures.filter((row) => row.names.some(isAcylName));
  const read = new Set();
  const names = { read: 0, acid: 0, ester: 0, amide: 0, nitrile: 0 };
  const later = { acid: 0, ester: 0, amide: 0, nitrile: 0 };
  const acids = { rows: 0, names: 0 };
  let elapsed = 0;
  for (const row of rows) {
    // Since phase R-5d1 an acid's acyl names read too, but for an ester prefix beside it (R-6a: isAcidName()).
    const acid = isAcid(row.smiles);
    const readable = isCarbonyl(row.smiles) || acid
      ? row.names.filter((n) => isAcylName(n) && isCarbonylName(n) && (!acid || isAcidName(n))) : [];
    if (!isCarbonyl(row.smiles) && readable.length === 0) {
      later[laterFamily(row.names.find(isAcylName))] += 1;
      for (const name of row.names.filter(isAcylName)) {
        names[laterFamily(name)] += 1;
        assert.equal(tokenize(name), null, `names.tsv:${row.line}: ${name} reads before its phase`);
      }
      continue;
    }
    acids.rows += acid ? 1 : 0;
    acids.names += acid ? readable.length : 0;
    const expected = keyOf(row.smiles);
    for (const name of readable) {
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      assert.equal(assemble(parse(ids).tree).text, name, `names.tsv:${row.line}: assembly`);
      const start = performance.now();
      const verdict = readName(ids);
      elapsed += performance.now() - start;
      const isMain = name === row.names[0];
      assert.equal(verdict.kind, isMain ? 'correct' : 'alternative', `names.tsv:${row.line}: ${name} → ${verdict.message}`);
      assert.equal(verdict.name, row.names[0], `names.tsv:${row.line}`);
      assert.equal(aromaticKey(verdict.molecule), expected, `names.tsv:${row.line}: ${name} builds another graph`);
      names.read += 1;
      read.add(row);
    } // End of the loop over the names of a row
  } // End of the loop over the fixture rows
  /**
   * How many rows read of a fixture section.
   *
   * @param {string} id - The section's phase id (`I-39b`…).
   * @returns {number} The count.
   */
  const inSection = (id) => [...read].filter((row) => /\((I-\d+[a-z]?)[),:]/.exec(row.section)[1] === id).length;
  assert.equal(rows.length, EXPECTED_ROWS.total);
  assert.equal(read.size, EXPECTED_ROWS.read);
  assert.deepEqual(['I-39b', 'I-40a', 'I-40b', 'I-45b'].map(inSection), [EXPECTED_ROWS.i39b, EXPECTED_ROWS.i40a, EXPECTED_ROWS.i40b,
    EXPECTED_ROWS.i45b]);
  assert.deepEqual(later, { acid: EXPECTED_ROWS.acid, ester: EXPECTED_ROWS.ester, amide: EXPECTED_ROWS.amide, nitrile: EXPECTED_ROWS.nitrile });
  assert.deepEqual(names, { ...EXPECTED_NAMES });
  assert.deepEqual(acids, { rows: EXPECTED_ACID_ROWS.rows, names: EXPECTED_ACID_ROWS.names });
  assert.ok(elapsed / names.read < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / names.read).toFixed(2)} ms on average`);
}); // End of test 'fixture round trip (R-5c2)…'

/** The closed loop's generators (scripts/oracle/generate.mjs; design.md §15.7), aldehyde and ketone molecules with an acyl prefix only. */
const LOOP = Object.freeze({
  acyl: Object.freeze({ count: 600, seed: 5401, maxSize: 12 }),
  benzoyls: Object.freeze({ count: 300, seed: 5402 }),
  ringAcids: Object.freeze({ count: 300, seed: 5403, maxSize: 12 }),
});

/**
 * The parents of the ring acyl molecules (ringAcylMolecules()): an aldehyde or
 * ketone chain with `*` where the acyl prefix goes (heptanal's carbon 2,
 * pentane-2,4-dione's 3, pentanedial's 3).
 */
const RING_ACYL_PARENTS = Object.freeze(['O=CC(*)CCCCC', 'CC(=O)C(*)C(C)=O', 'O=CCC(*)CC=O']);

/**
 * The ring acyl groups of ringAcylMolecules(), as SMILES branches from their
 * C=O carbon: saturated and unsaturated rings of 3 to 7 carbons, with prefixes
 * of their own, and benzoyl groups with branches, halogens and alkoxy groups.
 */
const RING_ACYLS = Object.freeze([
  'C(=O)C1CC1', 'C(=O)C1CCC1', 'C(=O)C1CCCC1', 'C(=O)C1CCCCC1', 'C(=O)C1CCCCCC1', 'C(=O)C1C=CCCC1', 'C(=O)C1CC=CCC1', 'C(=O)C1=CCCCC1',
  'C(=O)C1C=CC=CC1', 'C(=O)C1CCCCC1C', 'C(=O)C1CCC(Cl)CC1', 'C(=O)C1CCC(C)(C)CC1', 'C(=O)C1=CC=CC=C1', 'C(=O)C1=CC=C(C)C=C1',
  'C(=O)C1=CC=CC=C1Br', 'C(=O)C1=CC(OC)=CC=C1', 'C(=O)C1=CC(C(C)C)=CC=C1',
]);

/**
 * The ring acyl molecules of the closed loop: every ring acyl group of
 * RING_ACYLS on every parent of RING_ACYL_PARENTS (the oracle's generators
 * give few `carbonil` prefixes beside an aldehyde or a ketone).
 *
 * @returns {object[]} The molecules.
 */
function ringAcylMolecules() {
  return RING_ACYL_PARENTS.flatMap((parent) => RING_ACYLS.map((acyl) => parseSmiles(parent.replace('*', acyl))));
}

/**
 * Minimum coverage of the closed loop: molecules (distinct by aromatic key),
 * acyl names read back, those with each acyl word (`acetil`; an `oil` ending
 * other than `benzoil`'s; `carbonil`; `benzoil`), removed-locant mutations and
 * decisive verdicts among them (the seeds give 175, 185, 41, 54, 36, 58, 510
 * and 510).
 */
const LOOP_MIN = Object.freeze({ molecules: 170, names: 180, acetil: 38, oil: 50, carbonil: 34, benzoil: 55, removed: 500, decisive: 500 });

/**
 * The closed loop's molecules: the aldehydes and ketones of the generators
 * and the ring acyl set whose names have an acyl prefix, distinct by
 * aromatic key.
 *
 * @returns {object[]} The molecules.
 */
function loopMolecules() {
  const seen = new Set();
  const molecules = [];
  const all = [...generateAcyl(LOOP.acyl), ...generateSubstitutedBenzoyls(LOOP.benzoyls), ...generateRingAcids(LOOP.ringAcids),
    ...ringAcylMolecules()];
  for (const mol of all.filter(isCarbonylMolecule)) {
    const key = aromaticKey(mol);
    const naming = nameMolecule(mol);
    if (!seen.has(key) && naming.ok && [naming.name, ...naming.alternatives.map((alt) => alt.name)].some(isAcylName)) {
      seen.add(key);
      molecules.push(mol);
    }
  }
  return molecules;
} // End of function loopMolecules()

/**
 * The locant lists of a tree a student can leave out: a prefix's, a
 * segment's and the suffix's, at any depth, and the locant 1 before
 * `carbonil` (R-5c2) — never another free-valence locant.
 *
 * @param {object} tree - An error-free parse() tree.
 * @returns {number[][]} The lists of number tile indices.
 */
function locantLists(tree) {
  const lists = [];
  /**
   * Collects the segments of a chain or ring and the locant before its `carbonil` (none for a whole word or a one-atom group).
   *
   * @param {object} chain - A substituent or parent chain node.
   * @returns {void}
   */
  const visitChain = (chain) => {
    (chain.segments || []).forEach((segment) => segment.locants.length > 0 && lists.push(segment.locants));
    if (chain.fv !== null && chain.fv !== undefined && tree.tiles[chain.fv].kind === 'acyl' && chain.fvLocants.length > 0) {
      lists.push(chain.fvLocants);
    }
  };
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

test('closed loop over the acyl generators: engine name → tiles → readName() → the same graph, then without each locant list', () => {
  const molecules = loopMolecules();
  const counts = { names: 0, acetil: 0, oil: 0, carbonil: 0, benzoil: 0, removed: 0, decisive: 0 };
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    const key = aromaticKey(mol);
    const all = [naming.name, ...naming.alternatives.map((alt) => alt.name)];
    for (const [i, name] of all.entries()) {
      if (!isAcylName(name)) {
        continue; // Read by the carbonyl closed loop (reverse-carbonyls.test.js).
      }
      const ids = tokenize(name);
      assert.ok(ids, `no tiles for ${name}`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, i === 0 ? 'correct' : 'alternative', `${name}: ${verdict.message}`);
      assert.equal(verdict.name, naming.name);
      assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
      counts.names += 1;
      counts.acetil += /acetil/.test(name) ? 1 : 0;
      counts.oil += /[^z]oil/.test(name) ? 1 : 0;
      counts.carbonil += /carbonil/.test(name) ? 1 : 0;
      counts.benzoil += /benzoil/.test(name) ? 1 : 0;
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
  for (const field of ['names', 'acetil', 'oil', 'carbonil', 'benzoil', 'removed', 'decisive']) {
    assert.ok(counts[field] >= LOOP_MIN[field], `${field}: ${report}`);
  }
}); // End of test 'closed loop over the acyl generators…'

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
  // A chain with `al` keeps its –CHO at carbon 1: renumbered from the other end, its prefixes move, so the name describes
  // another molecule, whose chain the trace may choose otherwise (the acyl's C=O carbon may join it).
  shifted: ['NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS'],
  reflected: ['RING_NUMBERING'],
  rotated: ['RING_NUMBERING'],
  // CARBONYL_PREFIX (R-5c3b1): an acyl prefix swapped onto an end carbon, whose C=O the chain then takes.
  swapped: ['NUMBERING', 'RING_NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS',
    'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS', 'CARBONYL_PREFIX'],
  unsorted: ['ALPHABETICAL_ORDER'],
  ungrouped: ['UNGROUPED'],
  diBis: ['MULTIPLIER_KIND'],
  // R-5c3b1: an acyl prefix on an end carbon whose C=O the chain takes (CARBONYL_PREFIX: `1-acetilpentano-2,4-diona` →
  // `heptano-2,4,6-triona`), or a branch on an `al`'s carbon (KETONE_NOT_ALDEHYDE: `1-acetilhexanal`).
  toEnd: ['BRANCH_AT_END', 'NUMBERING', 'CARBONYL_PREFIX', 'KETONE_NOT_ALDEHYDE'],
  // CARBONYL_PREFIX: an `oxo` moved to the bare end of an aldehyde's chain is a second –CHO (R-5c3b1).
  heteroToEnd: ['NUMBERING', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS', 'CARBONYL_PREFIX'],
  removed: [],
  added: ['NEEDLESS_LOCANTS', 'NUMBERING', 'RING_NUMBERING'],
});

/**
 * The mutations of one acyl name, as reverse-carbonyls.test.js makes them:
 * renumbered (reversed on a chain, the suffix's locants too — `shifted` for a
 * chain with `al`, whose –CHO stays at carbon 1 —; reflected and rotated on a
 * ring), locants swapped between two prefixes, prefixes in reverse order,
 * identical prefixes written one by one, di ↔ bis, a single-locant prefix
 * moved to an end of a chain (an acyl prefix is a carbon branch: its C=O
 * carbon lengthens the chain there), a prefix's locants removed, or added
 * (1… and 2…) where it has none.
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
  const terminal = isTerminalSuffix(tiles, tree.parent.suffix); // `al`: its –CHO stays at carbon 1.
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
 * Reads every mutation of some acyl names: every `otherName` must carry a
 * diagnosis of its family's codes whose step resolves in its explanation, or
 * be a deliberate null with its reason (nullReason()).
 *
 * @param {string[]} names - Acyl names (engine names or alternatives).
 * @returns {{otherName: Object<string, number>, codes: Set<string>, nulls: Object<string, number>, unexpected: string[]}}
 *   `otherName` counts by family, the codes seen, the deliberate nulls by reason and the nulls without one.
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
      const d = verdict.diagnosis;
      if (!d) {
        const reason = nullReason(mutation.ids, verdict);
        if (reason) {
          nulls[reason] = (nulls[reason] || 0) + 1;
        } else {
          unexpected.push(label);
        }
        continue;
      }
      codes.add(d.code);
      assert.ok(FAMILY_CODES[mutation.family].includes(d.code), `${label}: ${d.code}, ${d.message}`);
      assert.ok(!/undefined|null|NaN|\[object|grupo –OH|grupos –OH/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), label);
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return { otherName, codes, nulls, unexpected };
} // End of function sweep()

/**
 * How many mutations of the acyl fixture names give `otherName`, by family,
 * and how many of them are deliberate nulls, by reason (nullReason()): none
 * since phase R-5c3b1 — an acyl prefix moved to an end carbon of a chain
 * whose C=O groups then choose another chain (formerly 15 `suffix` nulls) is
 * CARBONYL_PREFIX or KETONE_NOT_ALDEHYDE, a ring numbered otherwise at N0
 * (formerly 5 `principal` nulls) RING_NUMBERING. Every one is diagnosed with
 * one of its family's codes.
 */
const FIXTURE_OTHER_NAME = Object.freeze({
  reversed: 0, shifted: 3, reflected: 0, rotated: 5, swapped: 0, unsorted: 1, ungrouped: 2, diBis: 2, toEnd: 18, heteroToEnd: 0,
  removed: 0, added: 0,
});
const FIXTURE_NULLS = Object.freeze({});

test('mutations of every acyl fixture name: a diagnosis of the family\'s codes, or a deliberate null with its reason', async () => {
  const names = (await readFixtures()).filter((row) => isCarbonyl(row.smiles)).flatMap((row) => row.names)
    .filter((name) => isCarbonylName(name) && isAcylName(name));
  // The acids' acyl names (R-5d1) are swept with the acids (reverse-acids.test.js).
  assert.equal(names.length, EXPECTED_NAMES.read - EXPECTED_ACID_ROWS.names);
  const { otherName, codes, nulls, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  assert.deepEqual(otherName, { ...FIXTURE_OTHER_NAME });
  assert.deepEqual(nulls, { ...FIXTURE_NULLS });
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'BRANCH_AT_END', 'CARBONYL_PREFIX', 'KETONE_NOT_ALDEHYDE', 'LONGER_CHAIN',
    'MORE_SUBSTITUENTS', 'MULTIPLIER_KIND', 'RING_NUMBERING', 'UNGROUPED']);
}); // End of test 'mutations of every acyl fixture name…'

test('mutations of the generated acyl names: every otherName is diagnosed or a deliberate null, every step resolves', () => {
  const names = [];
  for (const mol of loopMolecules()) {
    const naming = nameMolecule(mol);
    names.push(...[naming.name, ...naming.alternatives.map((alt) => alt.name)].filter(isAcylName));
  }
  assert.ok(names.length >= 180, `${names.length} names`); // The seeds give 185.
  const { otherName, codes, nulls, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  const total = Object.values(otherName).reduce((sum, count) => sum + count, 0);
  const deliberate = Object.values(nulls).reduce((sum, count) => sum + count, 0);
  // The seeds give 791: 6 nulls, every one an acid (`otherFamily`); 785 diagnosed (before R-5c3b1: 362 deliberate nulls,
  // 340 suffix, 16 principal, 6 otherFamily).
  assert.ok(total >= 780, `${total} otherName verdicts`);
  assert.deepEqual([otherName.removed, otherName.added], [0, 0]);
  for (const code of ['NUMBERING', 'ALPHABETICAL_ORDER', 'UNGROUPED', 'MULTIPLIER_KIND', 'BRANCH_AT_END', 'LONGER_CHAIN',
    'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS', 'RING_NUMBERING', 'CARBONYL_PREFIX', 'KETONE_NOT_ALDEHYDE']) {
    assert.ok(codes.has(code), `${code}: ${[...codes]}`);
  }
  assert.ok(Object.keys(nulls).every((reason) => reason === 'otherFamily'), JSON.stringify(nulls));
  assert.ok(deliberate < total / 20, JSON.stringify(nulls));
}); // End of test 'mutations of the generated acyl names…'

/** The tile id of the free-valence ending `il` (a branch's `il`, R-1a), and of `ano`. */
const IL_ID = tileId('freeValence', 1);
const ANO_ID = tileId('ending', 'saturated');

/** The branch-name code each branch-internal mutation family must give (phase R-5c3b2, diagnose.js branchNames()). */
const BRANCH_FAMILY_CODES = Object.freeze({
  etanoil: 'ACYL_NAME', oxoetil: 'ACYL_NAME', oxoalkyl: 'ACYL_NAME', acylChain: 'ACYL_CHAIN', ringReflect: 'BRANCH_RING_NUMBERING',
  noOne: 'MISSING_LOCANTS',
});

/**
 * The mutations inside the branches of one acyl name (phase R-5c3b2): `acetil`
 * written `etanoil` or `(1-oxoetil)`; a chain's acyl group `Xanoil` written
 * as an `oxo` alkyl group, `(1-oxoXil)` (inside its compound branch, or as one);
 * a parent-level `Xanoil` (four carbons or more) written on a chain one carbon
 * shorter with a methyl on its end, `(n-metil…anoil)`; a ring in a compound
 * branch (`ciclo`, `fenil`, `benzoil`) with its own locants reflected around
 * its carbon 1, each list kept ascending; the locant 1 before `carbonil` left
 * out.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {{family: string, ids: string[]}[]} The mutations.
 */
function branchMutationsOf(ids) {
  const { tree } = parse(ids);
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
  ids.forEach((id, i) => {
    if (id === ACETYL_ID) {
      push('etanoil', [...ids.slice(0, i), tileId('root', 2), ANO_ID, ACYL_ID, ...ids.slice(i + 1)]);
      push('oxoetil', [...ids.slice(0, i), START_ID, num(1), OXO_ID, tileId('root', 2), IL_ID, END_ID, ...ids.slice(i + 1)]);
    }
    if (id === RING_CARBONYL_ID && ids[i - 1] === num(1)) {
      push('noOne', [...ids.slice(0, i - 1), ...ids.slice(i)]);
    }
  });
  /**
   * Collects the mutations of a prefix's branch, then of its own prefixes'.
   *
   * @param {object} item - A prefix node.
   * @param {boolean} top - A parent-level prefix.
   * @returns {void}
   */
  const visit = (item, top) => {
    const sub = item.substituent;
    const chain = sub.type === 'branch' ? sub.chain : sub;
    if (chain && chain.type === 'chain' && chain.ring === null && ids[chain.fv] === ACYL_ID && chain.segments.length === 0) {
      const core = [num(1), OXO_ID, ids[chain.root], IL_ID];
      push('oxoalkyl', [...ids.slice(0, chain.range[0]), ...(sub.type === 'branch' ? core : [START_ID, ...core, END_ID]),
        ...ids.slice(chain.range[1])]);
      const n = tree.tiles[chain.root].value;
      if (top && sub.type === 'chain' && n >= 4) {
        push('acylChain', [...ids.slice(0, chain.range[0]), START_ID, num(n - 1), tileId('root', 1), IL_ID, tileId('root', n - 1),
          ANO_ID, ACYL_ID, END_ID, ...ids.slice(chain.range[1])]);
      }
    }
    if (sub.type !== 'branch') {
      return;
    }
    sub.items.forEach((own) => visit(own, false));
    let n = null;
    if (chain.type === 'chain' && chain.ring !== null) {
      n = tree.tiles[chain.root].value;
    } else if (chain.type === 'retained' && [PHENYL_ID, BENZOYL_ID].includes(ids[chain.tile])) {
      n = 6;
    }
    if (n !== null) {
      const reflected = [...ids];
      for (const list of [...sub.items.map((own) => own.locants), ...(chain.segments || []).map((segment) => segment.locants)]) {
        const values = list.map((p) => tree.tiles[p].value).map((v) => (v === 1 ? 1 : n + 2 - v)).sort((a, b) => a - b);
        list.forEach((p, k) => {
          reflected[p] = num(values[k]);
        });
      }
      push('ringReflect', reflected);
    }
  }; // End of function visit()
  tree.items.forEach((item) => visit(item, true));
  return out;
} // End of function branchMutationsOf()

/**
 * Minimum branch-internal mutations of the generated acyl names that give
 * `otherName`, by family (the seeds give 41, 41, 47, 10, 51 and 21, 211 in
 * all; before phase R-5c3b2, 156 of them were nulls and 55 ALPHABETICAL_ORDER
 * or UNGROUPED, read in the student's own words before the branch's name).
 */
const BRANCH_SWEEP_MIN = Object.freeze({ etanoil: 40, oxoetil: 40, oxoalkyl: 45, acylChain: 10, ringReflect: 50, noOne: 20 });

test('mutations inside the branches of the generated acyl names (R-5c3b2): every otherName has its branch-name code', () => {
  const names = [];
  for (const mol of loopMolecules()) {
    const naming = nameMolecule(mol);
    names.push(...[naming.name, ...naming.alternatives.map((alt) => alt.name)].filter(isAcylName));
  }
  const counts = Object.fromEntries(Object.keys(BRANCH_FAMILY_CODES).map((family) => [family, 0]));
  for (const name of names) {
    for (const mutation of branchMutationsOf(tokenize(name))) {
      const verdict = readName(mutation.ids);
      const label = `${name} → ${mutation.family} ${verdict.text}`;
      // A reflection that gives the same locants is the engine's name; the others name the same molecule otherwise.
      assert.ok(['otherName', 'correct', 'alternative'].includes(verdict.kind), `${label}: ${verdict.kind}, ${verdict.message}`);
      if (verdict.kind !== 'otherName') {
        continue;
      }
      counts[mutation.family] += 1;
      const d = verdict.diagnosis;
      assert.ok(d, `${label}: no diagnosis`);
      assert.equal(d.code, BRANCH_FAMILY_CODES[mutation.family], `${label}: ${d.message}`);
      assert.equal(verdict.name, readName(tokenize(name)).name, `${label}: the same molecule`);
      assert.ok(!/undefined|null|NaN|\[object/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.equal(opened.steps[opened.index].id, 'substituents', label);
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  for (const [family, min] of Object.entries(BRANCH_SWEEP_MIN)) {
    assert.ok(counts[family] >= min, `${family}: ${JSON.stringify(counts)}`);
  }
}); // End of test 'mutations inside the branches of the generated acyl names…'

// ---------------------------------------------------------------------------
// The drawing, the dialog, robustness and time.
// ---------------------------------------------------------------------------

test('«Dibujar» (R-5c2): acyl verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const name of ['3-acetilpentano-2,4-diona', '2-(2-metilpropanoil)heptanal', '2-(prop-2-enoil)heptanal', '2-benzoilheptanal',
    '2-(4-metilbenzoil)heptanal', '2-(ciclohexanocarbonil)heptanal', '2-(ciclohex-2-eno-1-carbonil)heptanal',
    '4-acetilciclohexano-1-carbaldehído', '2-(4-acetilciclohexil)butanal', 'acetil benceno', '2 et ano oil hept ano al']) {
    const verdict = read(name);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-5c2)…'

test('dialog (R-5c2): the acyl tiles have tooltips', () => {
  for (const id of [ACETYL_ID, ACYL_ID, RING_CARBONYL_ID, BENZOYL_ID]) {
    assert.ok(TILE_HINTS[id] && TILE_HINTS[id].endsWith('.'), id);
  }
  assert.match(TILE_HINTS[ACETYL_ID], /3-acetilpentano-2,4-diona/);
  assert.match(TILE_HINTS[ACYL_ID], /prop, ano y oil dan propanoil/);
  assert.match(TILE_HINTS[RING_CARBONYL_ID], /\(ciclohexanocarbonil\)/);
  assert.match(TILE_HINTS[BENZOYL_ID], /\(4-metilbenzoil\)/);
}); // End of test 'dialog (R-5c2)…'

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

test('property (R-5c2): random acyl names — any parent, locants or none, inside branches too — never crash', () => {
  const random = mulberry32(20261017);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const branches = ['acetil', 'prop ano oil', 'prop 2 eno oil', 'but eno oil', 'START 2 met il prop ano oil END', 'benzoil',
    'START 4 met il benzoil END', 'ciclo hex ano carbonil', 'ciclo hex 2 eno 1 carbonil', 'START cloro et ano oil END', 'met ano oil',
    'oxo', 'met il', 'START 4 acetil ciclo hex il END'];
  const parents = ['hept ano al', 'pent ano 2 4 di ona', 'pent ano di al', 'ciclo hex ano ona', 'ciclo hex ano carbaldehído',
    'benceno', 'tolueno', 'hex ano', 'ciclo hex ano', 'benzaldehído', 'but ano di al'];
  const multipliers = { 1: '', 2: 'di', 3: 'tri' };
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const prefixes = Array.from({ length: int(1, 2) }, () => {
      const count = int(1, 2);
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
      assert.ok(!/undefined|null|NaN|\[object|grupo –OH|grupos –OH/.test(verdict.diagnosis.message), `${words}: ${verdict.diagnosis.message}`);
    }
  } // End of the loop over the random names
  for (const kind of ['correct', 'otherName', 'ambiguous', 'invalid']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-5c2): random acyl names…'

test('time budget: acyl readName() calls, with their diagnosis, well within budget', () => {
  const names = ['3-acetilpentano-2,4-diona', '2-(2-metilpropanoil)heptanal', '2-[4-(propan-2-il)benzoil]heptanal',
    '2-(ciclohex-2-eno-1-carbonil)heptanal', 'prop ano oil hept ano al', '2 START met il benzoil END hept ano al',
    '2 ciclo hex eno 1 carbonil hept ano al', '4 acetil hex ano al', 'acetil pent ano di ona', '2 met il 2 benzoil hept ano al'];
  names.forEach((name) => read(name)); // Warm-up.
  for (const name of names) {
    const start = performance.now();
    const verdict = read(name);
    const ms = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', name);
    assert.ok(ms < PER_NAME_BUDGET_MS, `${name}: ${ms.toFixed(1)} ms`);
  }
}); // End of test 'time budget…'
