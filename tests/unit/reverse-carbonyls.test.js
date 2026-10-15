/**
 * @file Unit tests for the aldehydes and ketones in «¿Cómo se dibuja?»
 * (src/reverse/, design.md §15.5.2 item 6, §15.5.3, §15.7, §15.8 R-5c; phase
 * I-51c1, R-5c1): the «Grupos» row's suffixes `al` (a –CHO at the ends of a
 * chain, by rule), `ona` (a ketone's C=O) and `carbaldehído` (a –CHO whose
 * carbon is outside the parent), its prefixes `oxo` (a C=O that is not the
 * principal group) and `formil` (a –CHO as a branch), and the «Anillos»
 * row's `benzaldehído`. Parser (the suffix node, errors with their tile
 * ranges, partial names), assembler (the suffix morphology as render.js
 * suffixWords(): every form checked against the forward engine's own text),
 * tokenizer, interpreter and builder (the double-bonded oxygens, the –CHO's
 * own carbon, CARBONYL_POSITION, VALENCE, the caps), search (left-out
 * locants of `ona`, `carbaldehído` and the prefixes; the budget), readName()
 * verdicts with the molecule each describes (compared by aromatic key with a
 * SMILES), mutations and their diagnosis (the rules that hold for a carbonyl
 * name and, since phase R-5c3b1 (I-51c3b1), the principal C=O group's own
 * codes and P0/N0 phrases of diagnose.js «Aldehydes and ketones», whose
 * cases are in reverse-diagnose-carbonyls.test.js), the fixture round trip over every
 * aldehyde and ketone row of tests/fixtures/names.tsv, the closed loop over
 * the oracle's carbonyl generators (pure imports, no Java), the diagnosis
 * sweeps, the ordered drawing, the dialog's tooltips and time budgets.
 * Since phase R-5c2 (I-51c2) the round trip and the closed loop read the
 * names with acyl prefixes too; their own tests, sweeps included, are in
 * reverse-acyls.test.js. Since phase R-5c3a (I-51c3a) they read the retained
 * carbonyl names too (`acetona`, `ftalaldehído`…), and the fixture sweep
 * mutates them; their own tests are in reverse-carbonyl-templates.test.js.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse, isTerminalSuffix } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build, specAtoms, specCarbons } from '../../src/reverse/build.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { OXO_ID, FORMYL_ID, AL_ID, ONA_ID, CARBALDEHYDE_ID, BENZALDEHYDE_ID } from '../../src/reverse/tiles.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { TILE_HINTS } from '../../src/ui/name-builder.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { MAX_HEAVY_ATOMS, TOO_MANY_ATOMS_MESSAGE } from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import {
  generateCarbonyls, generateRingAcids, generateRingOutsideBenzenes, generateRingPolysuffixBenzenes, generateRingSubstituents,
  generateSubstitutedPhenyls, generateEthers,
} from '../../scripts/oracle/generate.mjs';
import {
  seq, readFixtures, isCarbonyl, isCarbonylMolecule, isCarbonylName, isAcylName, LATER_CARBONYL_WORDS, isCarbonylTemplateName,
} from './reverse-words.js';

/**
 * Aldehyde and ketone fixture rows (isCarbonyl(): carbons, halogens, OH and
 * ether oxygens and at least one aldehyde or ketone C=O; no acid, ester or
 * nitrogen), and those of them with at least one name the tiles write
 * (isCarbonylName()) — since the acyl prefixes of phase R-5c2, every one —,
 * by section: 42 of I-32, 5 of I-34 (beside an ether), 6 of I-39b (the acyl
 * section: `2-(2-formilbutoxi)butanodial`, and since R-5c2
 * `3-acetilpentano-2,4-diona`, `3,3-diacetilpentano-2,4-diona`,
 * `4-acetilheptano-2,6-diona`, `3-acetilhexanal`,
 * `2-acetil-2,3-dimetilbutanal`), 8 of I-40a (`4-acetilciclohexan-1-ona`
 * since R-5c2), 12 of I-40b (the ring acyl prefixes of
 * `3-(ciclohexanocarbonil)-`, `3-(2-metilciclohexano-1-carbonil)-` and
 * `3-benzoilpentano-2,4-diona` since R-5c2), 4 of I-43b, 2 of I-44, 2 of
 * I-45a and 2 of I-45b (`3-(4-metilbenzoil)pentano-2,4-diona`,
 * `2-(4-yodobenzoil)butanal`, R-5c2).
 */
const EXPECTED_ROWS = Object.freeze({
  total: 83, read: 83, i32: 42, i34: 5, i39b: 6, i40a: 8, i40b: 12, i43b: 4, i44: 2, i45a: 2, i45b: 2,
});

/**
 * Their names and alternatives the tiles write, read back (103 since the retained names of phase R-5c3a; 92 of them without
 * an acyl prefix, those the diagnosis sweeps below read: the acyl ones are swept in reverse-acyls.test.js), and those left
 * to later phases (none since R-5c3a, which reads the 8 retained names of the fixtures: `formaldehído`, `acetaldehído`,
 * `acetona`, `acetofenona`, `fenilacetaldehído`, `ftalaldehído`, `tereftalaldehído`, `2-(4-metilfenil)acetaldehído`).
 */
const EXPECTED_NAMES = 103;
const EXPECTED_SWEPT_NAMES = 92;
const EXPECTED_LATER_NAMES = 0;

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

// ---------------------------------------------------------------------------
// Parser.
// ---------------------------------------------------------------------------

test('parser (R-5c1): the suffixes in the parent node, `oxo` a one-atom group, `formil` a retained word, `benzaldehído` a whole word', () => {
  // 0:pent 1:ano 2:2 3:4 4:di 5:ona
  let { tree, errors } = parse(seq('pent ano 2 4 di ona'));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.parent.suffix, { type: 'suffix', locants: [2, 3], multiplier: 4, tile: 5, range: [2, 6] });
  ({ tree, errors } = parse(seq('4 oxo pent ano al')));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.items[0].substituent, { type: 'carbonyl', tile: 1, range: [1, 2] });
  assert.deepEqual([tree.parent.suffix.locants, tree.parent.suffix.tile], [[], 4]);
  ({ tree, errors } = parse(seq('2 START 4 formil ciclo hex il END prop ano di al')));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.items[0].substituent.items[0].substituent, { type: 'retained', tile: 3, oxi: null, range: [3, 4] });
  ({ tree, errors } = parse(seq('4 met il benzaldehído')));
  assert.deepEqual(errors, []);
  assert.deepEqual([tree.parent.chain.type, tree.parent.suffix], ['benzene', null]);
  // Old style: `2-butenal` gives its locant to the segment (`al` has no list to leave open); `2-pentanona` to the suffix.
  ({ tree } = parse(seq('2 but eno al')));
  assert.deepEqual([tree.parent.legacySegment, tree.parent.legacySuffix], [0, false]);
  ({ tree } = parse(seq('2 4 pent ano di ona')));
  assert.deepEqual([tree.parent.legacySegment, tree.parent.legacySuffix], [null, true]);
  // Partial names assemble too.
  assert.equal(text('pent ano 2'), 'pentano-2');
  assert.equal(text('pent ano 2 di'), 'pentano-2-di');
  assert.equal(text('START 2 oxo'), '(2-oxo');
}); // End of test 'parser (R-5c1)…'

test('parser (R-5c1): misplaced carbonyl tiles are errors with their tile ranges and hints', () => {
  const cases = [
    ['ciclo hex ano al', ['TILE_ORDER[3,4)']],
    ['benceno al', ['TILE_ORDER[1,2)']],
    ['but ano 1 al', ['TILE_ORDER[2,3)']],
    ['but ano 1 4 di al', ['TILE_ORDER[2,4)']],
    ['but ano 2 al', ['TILE_ORDER[2,3)']],
    ['1 but ano al', ['TILE_ORDER[0,1)']],
    ['1 4 but ano di al', ['TILE_ORDER[0,2)']],
    ['2 4 but eno al', ['LEGACY[0,2)']],
    ['pent ano 2 4 bis ona', ['TILE_ORDER[4,5)']],
    ['pent ano 2 4 ona', ['LOCANT_COUNT[2,4)']],
    ['ona', ['NO_PARENT[0,1)', 'TILE_ORDER[0,1)']],
    ['carbaldehído ciclo hex ano', ['TILE_ORDER[0,1)']],
    ['START 2 met il pent ano 2 ona END hex ano', ['ROOT_END[4,6)', 'TILE_ORDER[7,8)', 'TILE_ORDER[8,9)']], // `ona` in a branch
    ['1 benzaldehído', ['TEMPLATE_LOCANTS[0,1)']],
    ['p benzaldehído', ['TEMPLATE_LOCANTS[0,1)']],
    ['di benzaldehído', ['TILE_ORDER[0,1)']],
    ['benzaldehído al', ['TILE_ORDER[1,2)']],
    ['START benzaldehído END met ano', ['TILE_ORDER[1,2)', 'TILE_ORDER[2,3)']],
    ['formil met il éter', ['TILE_ORDER[0,1)']],
    ['oxo met il éter', ['TILE_ORDER[0,1)']],
    ['2 oxo', ['ENDS_WITH_BRANCH[0,2)']],
    ['START 2 oxo END et ano', ['TILE_ORDER[3,4)']],
  ];
  for (const [words, expected] of cases) {
    const errors = errorsOf(words);
    for (const error of expected) {
      assert.ok(errors.includes(error), `${words}: ${errors.join(' ')} lacks ${error}`);
    }
  }
  const lead = 'Esta ficha no puede ir aquí: ';
  assert.equal(messageOf('ciclo hex ano al'), `${lead}«al» solo va detrás de una cadena: en un anillo, el grupo CHO va unido a un `
    + 'carbono del anillo y se escribe «carbaldehído» (ciclohexanocarbaldehído).');
  assert.equal(messageOf('benceno al'), `${lead}«al» no va detrás de «benceno»: el benceno con un grupo CHO es el «benzaldehído», y `
    + 'con varios se usa «carbaldehído» (benceno-1,4-dicarbaldehído).');
  const alLocants = `${lead}el grupo CHO de «al» va siempre en un extremo de la cadena, en el carbono 1 (y en el último, con `
    + '«dial»), así que «al» no lleva números: butanal, butanodial.';
  assert.equal(messageOf('but ano 1 al'), alLocants);
  assert.equal(messageOf('1 but ano al'), alLocants);
  assert.equal(messageOf('pent ano 2 4 bis ona'), `${lead}delante de «ona» va «di», «tri»…, no «bis» ni «tris».`);
  assert.equal(parse(seq('ona')).errors.find((e) => e.code === 'TILE_ORDER').message, `${lead}«ona» va al final del nombre, detrás de la terminación de la cadena `
    + 'principal (pentan-2-ona, pentano-2,4-diona); en una rama, el grupo C=O se escribe «oxo».');
  assert.equal(parse(seq('al met ano')).errors[0].message, `${lead}«al» va al final del nombre, detrás de la terminación de la `
    + 'cadena principal (butanal, butanodial); en una rama, el grupo CHO se escribe con «oxo» ((2-oxoetil)) o, si su carbono no es '
    + 'de la rama, con «formil».');
  assert.equal(messageOf('carbaldehído ciclo hex ano'), `${lead}«carbaldehído» va al final del nombre, detrás del nombre del anillo `
    + 'principal (ciclohexanocarbaldehído); en una rama, el grupo CHO se escribe «formil».');
  assert.equal(messageOf('1 benzaldehído'), '«benzaldehído» ya dice dónde va su grupo CHO, en el carbono 1: no lleva números ni '
    + 'letras propios.');
  assert.equal(messageOf('START benzaldehído END met ano'), `${lead}«benzaldehído» es el nombre de toda la molécula y va al final; `
    + 'dentro de una rama, el anillo es «fenil» y su grupo CHO se escribe «formil», como en (4-formilfenil).');
  // Since phase R-6a2b `formil oxi` is an ester's acyloxy prefix (`(formiloxi)metano`, reverse-ester-prefixes.test.js): no error.
  assert.deepEqual(errorsOf('formil oxi met ano'), []);
  assert.equal(messageOf('formil met il éter'), `${lead}«formil» no va en un nombre con «éter»: un grupo CHO unido al oxígeno no `
    + 'forma un éter. Los dos grupos de un éter son cadenas o anillos de carbonos (etil metil éter).');
  assert.equal(messageOf('2 oxo'), 'El nombre acaba en un grupo («oxo»): falta la cadena principal detrás.');
}); // End of test 'parser (R-5c1): misplaced carbonyl tiles…'

// ---------------------------------------------------------------------------
// Assembler and tokenizer.
// ---------------------------------------------------------------------------

/**
 * Every assembly form of phase R-5c1, as tile words and the SMILES of a
 * molecule whose engine names include the form (render.js suffixWords():
 * the parent's `o` elided before a vowel — `al`, `ona` —, kept before a
 * consonant — `dial`, `diona`, `carbaldehído` —; `tetrona`; the prefixes).
 */
const FORMS = Object.freeze([
  ['met ano al', 'C=O'],
  ['but ano al', 'CCCC=O'],
  ['but ano di al', 'O=CCCC=O'],
  ['but 2 eno al', 'CC=CC=O'],
  ['prop 2 ino al', 'C#CC=O'],
  ['but 2 eno di al', 'O=CC=CC=O'],
  ['2 met il but ano al', 'CCC(C)C=O'],
  ['2 2 2 tri cloro et ano al', 'ClC(Cl)(Cl)C=O'],
  ['prop ano ona', 'CC(C)=O'],
  ['prop ano 2 ona', 'CC(C)=O'],
  ['pent ano 2 ona', 'CCCC(C)=O'],
  ['pent ano 2 4 di ona', 'CC(=O)CC(C)=O'],
  ['pent 3 eno 2 ona', 'CC=CC(C)=O'],
  ['but 3 ino 2 ona', 'C#CC(C)=O'],
  ['hex ano 2 3 4 5 tetra ona', 'CC(=O)C(=O)C(=O)C(C)=O'],
  ['ciclo hex ano ona', 'O=C1CCCCC1'],
  ['ciclo hex 2 eno 1 ona', 'O=C1C=CCCC1'],
  ['ciclo hex ano 1 4 di ona', 'O=C1CCC(=O)CC1'],
  ['2 met il ciclo hex ano 1 ona', 'CC1CCCCC1=O'],
  ['ciclo hex ano carbaldehído', 'O=CC1CCCCC1'],
  ['ciclo hex 3 eno 1 carbaldehído', 'O=CC1CC=CCC1'],
  ['ciclo hex ano 1 4 di carbaldehído', 'O=CC1CCC(C=O)CC1'],
  ['3 cloro ciclo hex ano 1 carbaldehído', 'O=CC1CCCC(Cl)C1'],
  ['benzaldehído', 'O=CC1=CC=CC=C1'],
  ['benceno carbaldehído', 'O=CC1=CC=CC=C1'],
  ['4 cloro benzaldehído', 'O=CC1=CC=C(Cl)C=C1'],
  ['4 cloro benceno 1 carbaldehído', 'O=CC1=CC=C(Cl)C=C1'],
  ['p cloro benzaldehído', 'O=CC1=CC=C(Cl)C=C1'],
  ['benceno 1 4 di carbaldehído', 'O=CC1=CC=C(C=O)C=C1'],
  ['4 oxo pent ano al', 'CC(=O)CCC=O'],
  ['2 3 di oxo but ano al', 'CC(=O)C(=O)C=O'],
  ['3 hidroxi but ano al', 'CC(O)CC=O'],
  ['4 hidroxi ciclo hex ano 1 ona', 'OC1CCC(=O)CC1'],
  ['4 START 2 oxo prop il END hept ano 2 6 di ona', 'CC(=O)CC(CC(C)=O)CC(C)=O'],
  ['2 START 2 oxo et il END ciclo hex ano 1 carbaldehído', 'O=CC1CCCCC1CC=O'],
  ['2 START 4 formil ciclo hex il END prop ano di al', 'O=CC(C=O)C1CCC(C=O)CC1'],
  ['2 START 2 formil but il oxi END but ano di al', 'O=CCC(C=O)OCC(C=O)CC'],
  ['1 fenil et ano 1 ona', 'CC(=O)C1=CC=CC=C1'],
  ['1 START 4 met il fenil END et ano 1 ona', 'CC(=O)C1=CC=C(C)C=C1'],
  ['3 met il oxi prop ano al', 'O=CCCOC'],
]);

test('assembler (R-5c1): every suffix and prefix form is the forward engine\'s own text; the tokenizer reads it back', () => {
  for (const [words, smiles] of FORMS) {
    const assembled = text(words);
    assert.ok(namesOf(smiles).includes(assembled), `${words} → ${assembled}, not among ${namesOf(smiles).join(', ')}`);
    assert.deepEqual(tokenize(assembled), seq(words), assembled);
  }
  // Rule 4, the suffix half: the multiplier of a suffix before a vowel loses its `a` (`tetrona`), and only then the parent's
  // last ending its `o` (`pentan-2-ona`, `but-2-enal`, but `butanodial`, `pentano-2,4-diona`, `ciclohexanocarbaldehído`).
  assert.equal(text('hex ano 2 3 4 5 tetra ona'), 'hexano-2,3,4,5-tetrona');
  assert.equal(text('ciclo hex 3 eno 1 carbaldehído'), 'ciclohex-3-eno-1-carbaldehído');
  // The spans: the suffix's words are endings of the parent, one span per tile.
  const { spans } = assemble(parse(seq('pent ano 2 4 di ona')).tree);
  assert.deepEqual(spans.filter((s) => s.tile !== null).map((s) => [s.tile, s.kind]),
    [[0, 'stem'], [1, 'ending'], [2, 'locant'], [3, 'locant'], [4, 'multiplier'], [5, 'ending']]);
  // Old style, assembled as written.
  assert.equal(text('2 pent ano ona'), '2-pentanona');
  assert.equal(text('2 but eno al'), '2-butenal');
  assert.deepEqual(tokenize('2-pentanona'), seq('2 pent ano ona'));
}); // End of test 'assembler (R-5c1)…'

test('tokenizer (R-5c1): texts that only read with errors never tokenize; the retained names of phase R-5c3a do', () => {
  for (const name of ['ciclohexanal', 'bencenal', 'butan-1-al', '1-butanal', 'butano-1,4-dial', 'pentano-2,4-bisona', 'ona', 'al',
    'carbaldehído', '1-benzaldehído', 'p-benzaldehído', 'benzaldehídoal', 'formoximetano', '(2-oxo)etano', 'oxo', '2-oxo',
    // Phase R-5c3a: a retained carbonyl name takes no numbers or letter of its own, and is the whole parent.
    '1-acetona', 'o-ftalaldehído', 'acetonaal', 'acetona-2-ona']) {
    assert.equal(tokenize(name), null, name);
  }
  // Phase R-5c3a: the retained names read, each as its one «Nombres tradicionales» tile (reverse-carbonyl-templates.test.js).
  for (const name of ['formaldehído', 'acetaldehído', 'acetona', 'acetofenona', 'fenilacetaldehído', 'ftalaldehído', 'isoftalaldehído',
    'tereftalaldehído']) {
    const ids = tokenize(name);
    assert.ok(ids && ids.length === 1 && ids[0].startsWith('template-'), name);
  }
  assert.deepEqual(LATER_CARBONYL_WORDS, []);
}); // End of test 'tokenizer (R-5c1)…'

// ---------------------------------------------------------------------------
// Interpreter and builder.
// ---------------------------------------------------------------------------

test('interpreter (R-5c1): the SuffixSpec of each suffix; `al` at the ends of a chain by rule; `oxo`, `formil`, `benzaldehído`', () => {
  // `al`: implicit at carbon 1, and at the last carbon with `dial`, on the `al` tiles; no left-out slot.
  let spec = specOf('pent ano di al');
  assert.deepEqual([spec.suffix.kind, spec.suffix.outside, spec.suffix.terminal, spec.suffix.placed], ['aldehyde', false, true, false]);
  assert.deepEqual(spec.suffix.slots.map((slot) => [slot.kind, slot.value, slot.tiles]), [['implicit', 1, [2, 4]], ['implicit', 5, [2, 4]]]);
  assert.deepEqual(spec.leftOut, []);
  // `ona`: supplied, old style or left out, carbons 1…n.
  spec = specOf('pent ano 2 ona');
  assert.deepEqual([spec.suffix.kind, spec.suffix.terminal, spec.suffix.slots.map((slot) => [slot.kind, slot.value])],
    ['ketone', false, [['supplied', 2]]]);
  spec = specOf('2 pent ano ona');
  assert.deepEqual([spec.oldStyle, spec.suffix.slots.map((slot) => [slot.kind, slot.value])], [true, [['supplied', 2]]]);
  spec = specOf('pent ano ona');
  assert.deepEqual(spec.leftOut.map((slot) => [slot.role, slot.domain]), [['carbon', [1, 5]]]);
  // `carbaldehído`: an aldehyde whose carbon is outside the parent.
  spec = specOf('ciclo hex ano carbaldehído');
  assert.deepEqual([spec.suffix.kind, spec.suffix.outside, spec.leftOut.length], ['aldehyde', true, 1]);
  // `benzaldehído`: the benzene parent with its –CHO at carbon 1, placed by the word.
  spec = specOf('4 met il benzaldehído');
  assert.deepEqual([spec.parent.kind, spec.suffix.kind, spec.suffix.outside, spec.suffix.placed, spec.suffix.phenol],
    ['benzene', 'aldehyde', true, true, false]);
  assert.deepEqual(spec.suffix.slots.map((slot) => [slot.kind, slot.value, slot.tiles]), [['implicit', 1, [3, 4]]]);
  // A letter counts the –CHO: `p-clorobenzaldehído` puts the chlorine at 4.
  assert.deepEqual(specOf('p cloro benzaldehído').prefixes[0].slots.map((slot) => slot.value), [4]);
  // `oxo`: a one-atom group, its oxygen; `formil`: a retained word.
  spec = specOf('4 oxo pent ano al');
  assert.deepEqual([spec.prefixes[0].substituent.kind, spec.prefixes[0].substituent.element], ['carbonyl', 'O']);
  spec = specOf('formil ciclo hex ano');
  assert.deepEqual([spec.prefixes[0].substituent.kind, spec.prefixes[0].substituent.retained], ['retained', 'formyl']);
}); // End of test 'interpreter (R-5c1)…'

test('builder (R-5c1): double-bonded oxygens, the –CHO\'s own carbon, `formil` and `oxo`; atoms counted for the caps', () => {
  let built = build(specOf('but ano di al'));
  assert.ok(built.ok);
  assert.deepEqual(oxygenBonds(built.molecule), [['C2'], ['C2']]);
  assert.deepEqual(built.suffixAtoms.map((g) => [g.locant, built.molecule.bonds.get(g.bond).order]), [[1, 2], [4, 2]]);
  assert.deepEqual(built.suffixAtoms.map((g) => g.parentAtom), [built.studentParent.atoms[0], built.studentParent.atoms[3]]);
  built = build(specOf('pent ano 2 4 di ona'));
  assert.deepEqual(built.suffixAtoms.map((g) => g.locant), [2, 4]);
  // `carbaldehído`: a carbon bonded to the ring's carbon by a single bond, the =O on it.
  built = build(specOf('ciclo hex ano 1 carbaldehído'));
  const [group] = built.suffixAtoms;
  assert.equal(built.molecule.atoms.get(group.carbon).element, 'C');
  assert.deepEqual([built.molecule.bonds.get(group.carbonBond).order, built.molecule.bonds.get(group.bond).order], [1, 2]);
  assert.equal(group.parentAtom, built.studentParent.atoms[0]);
  assert.equal(aromaticKey(built.molecule), keyOf('O=CC1CCCCC1'));
  built = build(specOf('benzaldehído'));
  assert.equal(aromaticKey(built.molecule), keyOf('O=CC1=CC=CC=C1'));
  // `oxo` and `formil`.
  assert.equal(aromaticKey(build(specOf('2 oxo prop ano')).molecule), keyOf('CC(C)=O'));
  assert.equal(aromaticKey(build(specOf('formil ciclo hex ano'), [1]).molecule), keyOf('O=CC1CCCCC1')); // Its left-out locant: 1.
  assert.equal(aromaticKey(build(specOf('2 START 4 formil ciclo hex il END prop ano di al')).molecule),
    keyOf('O=CC(C=O)C1CCC(C=O)CC1'));
  // The caps count the –CHO's carbon and every oxygen.
  let spec = specOf('benceno 1 2 3 4 5 6 hexa carbaldehído');
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [12, 18]);
  spec = specOf('2 START 4 formil ciclo hex il END prop ano di al');
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [10, 13]);
  const locants = Array.from({ length: 30 }, (_, i) => i + 1).join(' ');
  const verdict = read(`ciclo triacont ano ${locants} triaconta carbaldehído`);
  assert.deepEqual([verdict.kind, verdict.errors[0].code, verdict.message], ['invalid', 'TOO_BIG', TOO_MANY_ATOMS_MESSAGE]);
  assert.ok(60 + 30 > MAX_HEAVY_ATOMS);
}); // End of test 'builder (R-5c1)…'

test('builder (R-5c1): CARBONYL_POSITION, VALENCE and LOCANT_RANGE for the carbonyl groups, each with its tiles', () => {
  const ends = 'La cadena tiene dos extremos: con «al» lleva como mucho dos grupos CHO, uno en cada extremo (butanodial).';
  const ketone = 'La terminación «ona» va en un carbono unido a otros dos carbonos, como los del interior de la cadena; en un '
    + 'extremo sería un aldehído («al»).';
  const cases = [
    ['met ano di al', 'CARBONYL_POSITION', [2, 4], 'La cadena de 1 carbono solo tiene un extremo: lleva un solo grupo CHO (metanal).'],
    ['but ano tri al', 'CARBONYL_POSITION', [2, 4], ends],
    ['prop ano 1 ona', 'CARBONYL_POSITION', [2, 3], ketone],
    ['pent ano 1 3 di ona', 'CARBONYL_POSITION', [2, 3], ketone],
    ['met ano ona', 'CARBONYL_POSITION', [2, 3], ketone],
    ['et ano ona', 'CARBONYL_POSITION', [2, 3], ketone],
    ['1 cloro prop ano 1 ona', 'CARBONYL_POSITION', [4, 5], ketone],
    ['1 1 1 tri cloro et ano al', 'VALENCE', [1, 2],
      'El carbono 1 tendría 6 enlaces, y un carbono solo puede tener 4: el grupo CHO de «al» va en ese carbono.'],
    ['1 oxo but ano al', 'VALENCE', [0, 1],
      'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: el grupo CHO de «al» va en ese carbono.'],
    ['1 cloro benzaldehído', 'VALENCE', [0, 1],
      'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el benzaldehído, ese carbono ya lleva un grupo CHO.'],
    ['2 2 di oxo pent ano 3 ona', 'VALENCE', [1, 2], 'El carbono 2 tendría 6 enlaces, y un carbono solo puede tener 4.'],
    ['7 cloro benzaldehído', 'LOCANT_RANGE', [0, 1], 'El anillo del benzaldehído tiene 6 carbonos, del 1 al 6: no hay carbono 7.'],
    ['pent ano 6 ona', 'LOCANT_RANGE', [2, 3], 'La cadena de 5 carbonos va del 1 al 5: no hay carbono 6.'],
    ['ciclo hex ano 7 carbaldehído', 'LOCANT_RANGE', [3, 4], 'El anillo de 6 carbonos va del 1 al 6: no hay carbono 7.'],
  ];
  for (const [words, code, tiles, message] of cases) {
    const verdict = read(words);
    assert.equal(verdict.kind, 'invalid', `${words}: ${verdict.message}`);
    assert.deepEqual([verdict.errors[0].code, [verdict.errors[0].from, verdict.errors[0].to]], [code, tiles], words);
    assert.equal(verdict.message, message, words);
  }
  // A ketone's end carbon that a ring or a carbon branch makes a ketone of is right.
  assert.equal(read('1 fenil et ano 1 ona').kind, 'correct');
  assert.equal(read('1 met il prop ano 1 ona').kind, 'otherName');
  // `benceno` has no room for the C=O of `ona`: no placement fits.
  assert.deepEqual([read('benceno ona').kind, read('benceno ona').errors[0].code], ['invalid', 'VALENCE']);
}); // End of test 'builder (R-5c1): CARBONYL_POSITION…'

// ---------------------------------------------------------------------------
// readName(): verdicts, search, mutations.
// ---------------------------------------------------------------------------

/**
 * readName() cases: tile words or a name, the verdict, the engine's name
 * and the SMILES of the molecule drawn.
 */
const CASES = Object.freeze([
  ['butanal', 'correct', 'butanal', 'CCCC=O'],
  ['butanodial', 'correct', 'butanodial', 'O=CCCC=O'],
  ['2-metilbutanal', 'correct', '2-metilbutanal', 'CCC(C)C=O'],
  ['but-2-enal', 'correct', 'but-2-enal', 'CC=CC=O'],
  ['propanona', 'correct', 'propanona', 'CC(C)=O'],
  ['propan-2-ona', 'alternative', 'propanona', 'CC(C)=O'],
  ['pentan-2-ona', 'correct', 'pentan-2-ona', 'CCCC(C)=O'],
  ['pentano-2,4-diona', 'correct', 'pentano-2,4-diona', 'CC(=O)CC(C)=O'],
  ['ciclohexanona', 'correct', 'ciclohexanona', 'O=C1CCCCC1'],
  ['ciclohex-2-en-1-ona', 'correct', 'ciclohex-2-en-1-ona', 'O=C1C=CCCC1'],
  ['ciclohexanocarbaldehído', 'correct', 'ciclohexanocarbaldehído', 'O=CC1CCCCC1'],
  ['ciclohexano-1,4-dicarbaldehído', 'correct', 'ciclohexano-1,4-dicarbaldehído', 'O=CC1CCC(C=O)CC1'],
  ['benceno-1,4-dicarbaldehído', 'correct', 'benceno-1,4-dicarbaldehído', 'O=CC1=CC=C(C=O)C=C1'],
  ['benzaldehído', 'correct', 'benzaldehído', 'O=CC1=CC=CC=C1'],
  ['bencenocarbaldehído', 'alternative', 'benzaldehído', 'O=CC1=CC=CC=C1'],
  ['4-metilbenzaldehído', 'correct', '4-metilbenzaldehído', 'CC1=CC=C(C=O)C=C1'],
  ['2-clorobenzaldehído', 'correct', '2-clorobenzaldehído', 'O=CC1=CC=CC=C1Cl'],
  ['p-clorobenzaldehído', 'alternative', '4-clorobenzaldehído', 'O=CC1=CC=C(Cl)C=C1'],
  ['3-oxobutanal', 'correct', '3-oxobutanal', 'CC(=O)CC=O'],
  ['4-oxopentanal', 'correct', '4-oxopentanal', 'CC(=O)CCC=O'],
  ['4-oxociclohexano-1-carbaldehído', 'correct', '4-oxociclohexano-1-carbaldehído', 'O=CC1CCC(=O)CC1'],
  ['2-(4-formilciclohexil)propanodial', 'correct', '2-(4-formilciclohexil)propanodial', 'O=CC(C=O)C1CCC(C=O)CC1'],
  ['1-feniletan-1-ona', 'correct', '1-feniletan-1-ona', 'CC(=O)C1=CC=CC=C1'],
  ['4-metoxibutan-2-ona', 'correct', '4-metoxibutan-2-ona', 'CC(=O)CCOC'],
  // Left-out locants (search.js): the ketone's carbons 1…n, an end carbon refused by the builder unless a branch makes it a
  // ketone's.
  ['but ano ona', 'missingLocants', 'butan-2-ona', 'CCC(C)=O'],
  ['fenil et ano ona', 'missingLocants', '1-feniletan-1-ona', 'CC(=O)C1=CC=CC=C1'],
  ['ciclo hex ano carbaldehído', 'correct', 'ciclohexanocarbaldehído', 'O=CC1CCCCC1'],
  ['cloro et ano al', 'missingLocants', '2-cloroetanal', 'ClCC=O'],
  ['4 met il benceno carbaldehído', 'missingLocants', '4-metilbenzaldehído', 'CC1=CC=C(C=O)C=C1'],
  ['2 met il ciclo hex ano ona', 'missingLocants', '2-metilciclohexan-1-ona', 'CC1CCCCC1=O'],
  // `otherName`: the molecule the name describes.
  ['2-pentanona', 'otherName', 'pentan-2-ona', 'CCCC(C)=O'],
  ['butano-1-carbaldehído', 'otherName', 'pentanal', 'CCCCC=O'],
  ['2-oxopropano', 'otherName', 'propanona', 'CC(C)=O'],
  ['formilciclohexano', 'otherName', 'ciclohexanocarbaldehído', 'O=CC1CCCCC1'],
  ['(4-formilfenil)metano', 'otherName', '4-metilbenzaldehído', 'CC1=CC=C(C=O)C=C1'],
  ['5-oxopentanal', 'otherName', 'pentanodial', 'O=CCCCC=O'],
  ['1-metilpropanal', 'otherName', 'butan-2-ona', 'CCC(C)=O'],
  // An OH on the aldehyde's carbon makes an acid (phase R-5d): the molecule is drawn with its name.
  ['1-hidroxipropanal', 'otherName', 'ácido propanoico', 'CCC(=O)O'],
]);

test('readName (R-5c1): verdicts and the molecule each name describes, against a SMILES', () => {
  for (const [name, kind, engine, smiles] of CASES) {
    const verdict = read(name);
    assert.equal(verdict.kind, kind, `${name}: ${verdict.message}`);
    assert.equal(verdict.name, engine, name);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${name} builds another graph`);
    assert.equal(verdict.draw, true);
  }
  assert.equal(read('but ano ona').message, 'Casi: faltan los números. Se escribe «butan-2-ona».');
  assert.equal(read('4 met il benceno carbaldehído').message, 'Casi: faltan los números. Se escribe «4-metilbenceno-1-carbaldehído» '
    + '(forma sistemática, con el nombre del anillo (benceno), que usan algunos libros; la IUPAC (2013) prefiere el nombre '
    + 'tradicional). El nombre que doy primero es «4-metilbenzaldehído».');
  assert.equal(read('1-feniletan-1-ona').message, '¡Correcto! También se llama «acetofenona» (nombre tradicional, que la IUPAC '
    + '(2013) acepta).');
  // The suffix groups of the verdict, carried onto the drawn graph: the carbon of the C=O, its oxygen, the –CHO's own carbon.
  const verdict = read('ciclohexano-1,4-dicarbaldehído');
  assert.deepEqual(verdict.suffixAtoms.map((g) => [verdict.molecule.atoms.get(g.carbon).element,
    verdict.molecule.atoms.get(g.attachment).element, verdict.molecule.bonds.get(g.bond).order]), [['C', 'O', 2], ['C', 'O', 2]]);
  assert.ok(verdict.suffixAtoms.every((g) => verdict.studentParent.atoms.includes(g.parentAtom)));
}); // End of test 'readName (R-5c1): verdicts…'

test('search (R-5c1): left-out locants give ambiguous lists; a ketone nowhere is invalid; the budget gives incomplete', () => {
  const ambiguous = [
    ['pent ano ona', 'Faltan números: puede ser pentan-2-ona o pentan-3-ona.'],
    ['met il but ano al', 'Faltan números: puede ser 2-metilbutanal o 3-metilbutanal.'],
    ['oxo but ano al', 'Faltan números: puede ser 2-oxobutanal o 3-oxobutanal.'],
    ['but ano carbaldehído', 'Faltan números: puede ser pentanal o 2-metilbutanal.'],
    ['met il benzaldehído', 'Faltan números: puede ser 2-metilbenzaldehído, 3-metilbenzaldehído o 4-metilbenzaldehído.'],
    ['met il ciclo hex ano ona', 'Faltan números: puede ser 2-metilciclohexan-1-ona, 3-metilciclohexan-1-ona o '
      + '4-metilciclohexan-1-ona.'],
    ['hex ano di ona', 'Faltan números: puede ser hexano-2,3-diona, hexano-2,4-diona, hexano-2,5-diona u otra molécula.'],
  ];
  for (const [words, message] of ambiguous) {
    const verdict = read(words);
    assert.deepEqual([verdict.kind, verdict.message], ['ambiguous', message], words);
  }
  // The ketone's left-out carbon on a one-carbon or a two-carbon chain: every placement is an end with nothing else on it.
  for (const words of ['met ano ona', 'et ano ona']) {
    assert.equal(read(words).errors[0].code, 'CARBONYL_POSITION', words);
  }
  assert.equal(read('dodec ano hexa ona', { budget: { placements: 1 } }).kind, 'incomplete');
  assert.equal(read('met il ciclo hex ano ona', { budget: { namings: 1 } }).kind, 'incomplete');
}); // End of test 'search (R-5c1)…'

/**
 * Mutations of carbonyl names (design.md §15.7): tile words, the verdict and
 * the diagnosis code (null: a deliberate null of diagnose.js «Aldehydes and
 * ketones», the deliberate-null test below says why).
 */
const MUTATIONS = Object.freeze([
  // Rules that hold for a carbonyl name.
  ['4 met il pent ano 3 ona', 'otherName', 'NUMBERING'],
  ['6 met il ciclo hex ano 1 ona', 'otherName', 'RING_NUMBERING'],
  ['3 et il but ano 2 ona', 'otherName', 'LONGER_CHAIN'],
  ['1 met il prop ano 1 ona', 'otherName', 'BRANCH_AT_END'],
  ['1 cloro 1 met il prop ano 2 ona', 'otherName', 'BRANCH_AT_END'],
  ['4 oxo 2 met il pent ano al', 'otherName', 'ALPHABETICAL_ORDER'],
  ['3 cloro 2 bromo but ano al', 'otherName', 'ALPHABETICAL_ORDER'],
  ['2 met il 3 met il but ano al', 'otherName', 'UNGROUPED'],
  ['3 met il 3 met il pent ano 2 ona', 'otherName', 'UNGROUPED'],
  ['2 2 bis met il prop ano al', 'otherName', 'MULTIPLIER_KIND'],
  ['3 2 di met il but ano al', 'otherName', 'LOCANT_ORDER'],
  ['pent ano 4 2 di ona', 'otherName', 'LOCANT_ORDER'],
  ['2 pent ano ona', 'otherName', 'OLD_STYLE'],
  ['2 4 pent ano di ona', 'otherName', 'OLD_STYLE'],
  ['2 but eno al', 'otherName', 'OLD_STYLE'],
  ['4 cloro pent ano 3 ona', 'otherName', 'NUMBERING'],
  // The former deliberate nulls of phase R-5c1, worded by phase R-5c3b1 (reverse-diagnose-carbonyls.test.js).
  ['pent ano 4 ona', 'otherName', 'NUMBERING'],
  ['ciclo hex ano 3 ona', 'otherName', 'RING_NUMBERING'],
  ['ciclo hex ano 1 ona', 'otherName', 'NEEDLESS_LOCANTS'],
  ['2 oxo prop ano', 'otherName', 'CARBONYL_PREFIX'],
  ['5 oxo pent ano al', 'otherName', 'CARBONYL_PREFIX'],
  // Other verdicts.
  ['but ano 2 ona', 'correct', null],
  ['pent ano ona', 'ambiguous', null],
  ['but ano ona', 'missingLocants', null],
]);

test('mutations (R-5c1): the expected verdict, and the diagnosis of every rule that holds for a carbonyl name', () => {
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
    '2 pent ano ona': 'Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, justo delante de «ona»: '
      + '«pentan-2-ona».',
    '2 4 pent ano di ona': 'Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, justo delante de '
      + '«diona»: «pentano-2,4-diona».',
    '2 but eno al': 'Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, justo delante de «eno» o '
      + '«ino»: «but-2-enal».',
    'pent ano 4 2 di ona': 'Los números de un mismo grupo se escriben de menor a mayor: «pentano-2,4-diona», no «pentano-4,2-diona».',
    '4 oxo 2 met il pent ano al': 'Los sustituyentes se escriben por orden alfabético: «metil» va antes que «oxo» (m antes que o).',
    '3 et il but ano 2 ona': 'Hay una cadena más larga que la tuya: la tuya tiene 4 carbonos y la cadena principal tiene 5.',
    '4 met il pent ano 3 ona': 'Hay que numerar la cadena desde el otro extremo: los sustituyentes tienen que llevar los números más '
      + 'bajos (2 en vez de 4).',
  };
  for (const [words, message] of Object.entries(messages)) {
    assert.equal(read(words).diagnosis.message, message, words);
  }
}); // End of test 'mutations (R-5c1)…'

/**
 * Why the diagnosis of an aldehyde's or a ketone's `otherName` is null, read
 * independently of diagnose.js from the engine's naming: `otherFamily` — the
 * engine's principal group is a later family's (an amide's, a nitrile's…:
 * none of these names gives one). Since phase R-5c3b1 every other carbonyl
 * `otherName` of these names is diagnosed (the deliberate nulls of phase
 * R-5c1 — the student's suffix not the engine's, the parent's kind, P0/N0,
 * the suffix's needless locants — have their codes, test below), since
 * phase I-51d3 an acid's too (acidPrincipal()), and since phase I-52a3a an
 * ester's (esterPrincipal(): an alkoxy group moved onto the –CHO's carbon,
 * `1-metoxipropanal` → `propanoato de metilo`, ESTER_GROUP; until then a
 * deliberate «Esters» null). Null when none applies (an unexpected null).
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} verdict - Its `otherName` verdict.
 * @returns {string|null} The reason.
 */
function nullReason(ids, verdict) {
  const engine = verdict.naming.structure.suffix;
  return engine && !['aldehyde', 'ketone', 'acid', 'ester'].includes(engine.kind) ? 'otherFamily' : null;
} // End of function nullReason()

/**
 * Tells whether the engine's principal group of an `otherName` is an acid's
 * –COOH, read independently of diagnose.js from the engine's naming: an OH on
 * the –CHO's carbon makes an acid (`1-hidroxietanal` → `ácido etanoico`).
 * Until phase I-51d3 these were deliberate nulls (`otherFamily`, beside the
 * esters); since then diagnose.js «Acids» names them (ACID_GROUP: the C=O
 * and the OH of one carbon are one –COOH).
 *
 * @param {object} verdict - An `otherName` verdict.
 * @returns {boolean} True when the engine's principal group is an acid's.
 */
function acidPrincipal(verdict) {
  const engine = verdict.naming.structure.suffix;
  return Boolean(engine) && engine.kind === 'acid';
} // End of function acidPrincipal()

/**
 * Tells whether the engine's principal group of an `otherName` is an ester's
 * –COO–, read independently of diagnose.js from the engine's naming: an
 * alkoxy group on the –CHO's carbon makes an ester (`1-metoxipropanal` →
 * `propanoato de metilo`). Until phase I-52a3a these were deliberate
 * «Esters» nulls (`otherFamily` until phase I-52a1); since then diagnose.js
 * «Esters» names them (ESTER_GROUP: the C=O and the oxygen of one carbon are
 * one –COO–).
 *
 * @param {object} verdict - An `otherName` verdict.
 * @returns {boolean} True when the engine's principal group is an ester's.
 */
function esterPrincipal(verdict) {
  const engine = verdict.naming.structure.suffix;
  return Boolean(engine) && engine.kind === 'ester';
} // End of function esterPrincipal()

test('the former deliberate nulls of R-5c1 (diagnose.js «Aldehydes and ketones»): each now has its R-5c3b1 code', () => {
  const cases = [
    ['2 oxo prop ano', 'CARBONYL_PREFIX'], // the principal C=O written `oxo`
    ['formil ciclo hex ano', 'CARBONYL_PREFIX'], // … or `formil`
    ['START 4 formil fenil END met ano', 'CARBONYL_PARENT'], // … inside a branch: the ring carries the –CHO
    ['5 oxo pent ano al', 'CARBONYL_PREFIX'], // fewer groups in the suffix than the engine's
    ['5 oxo pent ano 2 ona', 'CARBONYL_SENIORITY'], // the ketone as the suffix beside an aldehyde
    ['4 oxo pent ano 2 ol', 'CARBONYL_SENIORITY'], // an alcohol's `ol` beside a ketone
    ['but ano 1 carbaldehído', 'ALDEHYDE_CARBON'], // `carbaldehído` on a chain: pentanal
    ['1 met il prop ano al', 'KETONE_NOT_ALDEHYDE'], // `al` on a carbon a branch makes a ketone's
    ['START 2 oxo et il END ciclo hex ano', 'CARBONYL_PARENT'], // the chain carries the –CHO, the ring none
    ['1 START 2 oxo ciclo hex il END prop ano 2 ona', 'CARBONYL_PARENT'], // a chain parent; the engine's, the ring (a tie)
    ['pent ano 4 ona', 'NUMBERING'], // N0: the ketone's carbon numbered from the other end
    ['ciclo hex ano 3 ona', 'RING_NUMBERING'],
    ['hex ano 3 5 di ona', 'NUMBERING'],
    ['ciclo hex ano 1 ona', 'NEEDLESS_LOCANTS'], // the engine writes `ciclohexanona`
    ['ciclo hex ano 1 carbaldehído', 'NEEDLESS_LOCANTS'],
  ];
  for (const [words, code] of cases) {
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    assert.equal(verdict.diagnosis && verdict.diagnosis.code, code, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(!/undefined|null|NaN|\[object|grupo –OH|grupos –OH/.test(verdict.diagnosis.message), words);
  }
  // An OH on the –CHO's carbon makes an acid: a null until phase I-51d3, now the acid's own code (diagnose.js «Acids»); an alkoxy
  // group there an ester: a null until phase I-52a3a, now the ester's own code (diagnose.js «Esters»).
  const acid = readName(seq('1 hidroxi prop ano al'));
  assert.deepEqual([acid.kind, acidPrincipal(acid), acid.diagnosis && acid.diagnosis.code], ['otherName', true, 'ACID_GROUP']);
  const ester = readName(seq('1 met il oxi prop ano al'));
  assert.deepEqual([ester.kind, esterPrincipal(ester), ester.diagnosis && ester.diagnosis.code], ['otherName', true, 'ESTER_GROUP']);
}); // End of test 'the former deliberate nulls of R-5c1…'

// ---------------------------------------------------------------------------
// Fixture round trip and closed loop (design.md §15.7).
// ---------------------------------------------------------------------------

test('fixture round trip (R-5c1): every aldehyde and ketone name the tiles write, graph compared with the SMILES', async () => {
  const fixtures = await readFixtures();
  const rows = fixtures.filter((row) => isCarbonyl(row.smiles));
  let covered = 0;
  let later = 0;
  let elapsed = 0;
  const read = new Set();
  for (const row of rows) {
    const expected = keyOf(row.smiles);
    for (const name of row.names) {
      if (!isCarbonylName(name)) {
        later += 1; // A name of a later phase (none since R-5c3a): no tiles yet.
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
      read.add(row);
    } // End of the loop over the names of a row
  } // End of the loop over the fixture rows
  /**
   * How many rows read of a fixture section.
   *
   * @param {string} id - The section's phase id (`I-32`…).
   * @returns {number} The count.
   */
  const inSection = (id) => [...read].filter((row) => /\((I-\d+[a-z]?)[),:]/.exec(row.section)[1] === id).length; // Its own id only.
  assert.equal(rows.length, EXPECTED_ROWS.total);
  assert.equal(read.size, EXPECTED_ROWS.read);
  assert.deepEqual(['I-32', 'I-34', 'I-39b', 'I-40a', 'I-40b', 'I-43b', 'I-44', 'I-45a', 'I-45b'].map(inSection),
    [EXPECTED_ROWS.i32, EXPECTED_ROWS.i34, EXPECTED_ROWS.i39b, EXPECTED_ROWS.i40a, EXPECTED_ROWS.i40b, EXPECTED_ROWS.i43b,
      EXPECTED_ROWS.i44, EXPECTED_ROWS.i45a, EXPECTED_ROWS.i45b]);
  assert.equal(covered, EXPECTED_NAMES);
  assert.equal(later, EXPECTED_LATER_NAMES);
  assert.ok(elapsed / covered < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / covered).toFixed(2)} ms on average`);
}); // End of test 'fixture round trip (R-5c1)…'

/** The closed loop's generators (scripts/oracle/generate.mjs; design.md §15.7), aldehyde and ketone molecules only. */
const LOOP = Object.freeze({
  carbonyls: Object.freeze({ count: 500, seed: 5301, minSize: 2, maxSize: 12 }),
  ringAcids: Object.freeze({ count: 300, seed: 5302, maxSize: 12 }),
  outside: Object.freeze({ count: 300, seed: 5303, minSize: 6, maxSize: 12 }),
  polysuffix: Object.freeze({ count: 300, seed: 5304, minSize: 6, maxSize: 12 }),
  ringSubstituents: Object.freeze({ count: 300, seed: 5305, maxSize: 12 }),
  phenyls: Object.freeze({ count: 300, seed: 5306, maxSize: 12 }),
  ethers: Object.freeze({ count: 300, seed: 5307, minSize: 2, maxSize: 12 }),
});

/**
 * Minimum coverage of the closed loop: aldehyde and ketone molecules
 * (distinct by aromatic key), names read back, the suffix and prefix forms
 * among them (names ending in `al`, `ona`, `carbaldehído`, `benzaldehído`;
 * names with `oxo`), names with an acyl prefix (R-5c2), names with a
 * retained carbonyl template (R-5c3a), removed-locant mutations and decisive
 * verdicts among them (the seeds give 805, 938, 345, 300, 185, 66, 135, 33,
 * 44, 2169 and 2168; before R-5c2 the 33 acyl names were left out, 861
 * names; before R-5c3a the 44 template names, 894 names).
 */
const LOOP_MIN = Object.freeze({
  molecules: 800, names: 925, al: 330, ona: 280, carbaldehido: 175, benzaldehido: 60, oxo: 125, acyl: 30, templates: 40,
  removed: 2150, decisive: 2150,
});

/**
 * The closed loop's molecules: the aldehydes and ketones of the
 * generators, distinct by aromatic key.
 *
 * @returns {object[]} The molecules.
 */
function loopMolecules() {
  const seen = new Set();
  const molecules = [];
  const all = [...generateCarbonyls(LOOP.carbonyls), ...generateRingAcids(LOOP.ringAcids), ...generateRingOutsideBenzenes(LOOP.outside),
    ...generateRingPolysuffixBenzenes(LOOP.polysuffix), ...generateRingSubstituents(LOOP.ringSubstituents),
    ...generateSubstitutedPhenyls(LOOP.phenyls), ...generateEthers(LOOP.ethers)];
  for (const mol of all.filter(isCarbonylMolecule)) {
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
   * Collects the segments of a chain or ring (none for `benceno`, a whole word, a retained word or a one-atom group).
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

test('closed loop over the carbonyl generators: engine name → tiles → readName() → the same graph, then without each locant list', () => {
  const molecules = loopMolecules();
  const counts = { names: 0, al: 0, ona: 0, carbaldehido: 0, benzaldehido: 0, oxo: 0, acyl: 0, templates: 0, removed: 0, decisive: 0 };
  const later = [];
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    assert.ok(naming.ok, naming.ok ? '' : naming.error.message);
    const key = aromaticKey(mol);
    const all = [naming.name, ...naming.alternatives.map((alt) => alt.name)];
    for (const [i, name] of all.entries()) {
      if (!isCarbonylName(name)) {
        later.push(name); // A name of a later phase (none since R-5c3a).
        continue;
      }
      const ids = tokenize(name);
      assert.ok(ids, `no tiles for ${name}`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, i === 0 ? 'correct' : 'alternative', `${name}: ${verdict.message}`);
      assert.equal(verdict.name, naming.name);
      assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
      counts.names += 1;
      counts.al += /al$/.test(name) ? 1 : 0;
      counts.ona += /ona$/.test(name) ? 1 : 0;
      counts.carbaldehido += /carbaldehído$/.test(name) ? 1 : 0;
      counts.benzaldehido += /benzaldehído$/.test(name) ? 1 : 0;
      counts.oxo += /oxo/.test(name) ? 1 : 0;
      counts.acyl += isAcylName(name) ? 1 : 0; // R-5c2
      counts.templates += isCarbonylTemplateName(name) ? 1 : 0; // R-5c3a
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
  assert.ok(later.every((name) => LATER_CARBONYL_WORDS.some((word) => name.includes(word))), report);
  for (const field of ['names', 'al', 'ona', 'carbaldehido', 'benzaldehido', 'oxo', 'acyl', 'templates', 'removed', 'decisive']) {
    assert.ok(counts[field] >= LOOP_MIN[field], `${field}: ${report}`);
  }
}); // End of test 'closed loop over the carbonyl generators…'

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
  // another molecule (`2-etilhexanal` → `5-etilhexanal`), whose chain the trace may choose otherwise.
  // A branch shifted onto the –CHO's carbon makes it a ketone's (R-5c3b1: KETONE_NOT_ALDEHYDE, `1-feniletanal`); an OH, an acid's
  // –COOH (R-5d3: ACID_GROUP, `1-hidroxietanal`); an alkoxy group, an ester's –COO– (R-6a3a: ESTER_GROUP, `1-metoxipropanal`).
  shifted: ['NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS',
    'ETHER_SIDE', 'KETONE_NOT_ALDEHYDE', 'ACID_GROUP', 'ESTER_GROUP'],
  reflected: ['RING_NUMBERING'],
  // `2-(4-metilfenil)acetaldehído` rotated puts its aryl on the –CHO's carbon: a ketone (R-5c3b1).
  rotated: ['RING_NUMBERING', 'KETONE_NOT_ALDEHYDE'],
  swapped: ['NUMBERING', 'RING_NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS',
    'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS', 'ETHER_SIDE'],
  unsorted: ['ALPHABETICAL_ORDER'],
  ungrouped: ['UNGROUPED'],
  diBis: ['MULTIPLIER_KIND'],
  // NUMBERING: the other end of a symmetric parent (`3-fenilpropan-2-ona`); KETONE_NOT_ALDEHYDE: a branch on the –CHO's carbon.
  toEnd: ['BRANCH_AT_END', 'NUMBERING', 'KETONE_NOT_ALDEHYDE'],
  // CARBONYL_PREFIX: an `oxo` moved to the bare end of an aldehyde's chain is a second –CHO (`5-oxopentanal`, R-5c3b1); ACID_GROUP:
  // a `hidroxi` moved onto the –CHO's carbon makes an acid's –COOH (`1-hidroxibutanal`, R-5d3); ESTER_GROUP: an alkoxy prefix
  // moved there, an ester's –COO– (`1-metoxibutanal`, R-6a3a).
  heteroToEnd: ['NUMBERING', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS', 'CARBONYL_PREFIX', 'ACID_GROUP', 'ESTER_GROUP'],
  removed: [],
  added: ['NEEDLESS_LOCANTS', 'NUMBERING', 'RING_NUMBERING'],
});

/**
 * The mutations of one carbonyl name: renumbered (reversed on a chain, the
 * suffix's locants too — `shifted` for a chain with `al`, whose –CHO stays
 * at carbon 1 —; reflected and rotated on a ring), locants swapped
 * between two prefixes, prefixes in reverse order, identical prefixes
 * written one by one, di ↔ bis, a single-locant prefix moved to an end of a
 * chain (a carbon branch: BRANCH_AT_END; an `oxo`, a halogen, `hidroxi` or
 * an alkoxy prefix: another molecule, never BRANCH_AT_END), a prefix's
 * locants removed, or added (1… and 2…) where it has none.
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
 * Reads every mutation of some carbonyl names: every `otherName` must carry a
 * diagnosis of its family's codes whose step resolves in its explanation, or
 * be a deliberate null with its reason (nullReason()). Those whose engine's
 * principal group is an acid's (acidPrincipal(): an OH moved onto the –CHO's
 * carbon; deliberate nulls until phase I-51d3) or an ester's (esterPrincipal():
 * an alkoxy group moved there; deliberate nulls until phase I-52a3a) are
 * counted by code.
 *
 * @param {string[]} names - Carbonyl names (engine names or alternatives).
 * @returns {{otherName: Object<string, number>, codes: Set<string>, nulls: Object<string, number>,
 *   acids: Object<string, number>, esters: Object<string, number>, unexpected: string[]}} `otherName` counts by family, the
 *   codes seen, the deliberate nulls by reason, the acids' and the esters' diagnoses by code and the nulls without a reason.
 */
function sweep(names) {
  const otherName = Object.fromEntries(Object.keys(FAMILY_CODES).map((family) => [family, 0]));
  const codes = new Set();
  const nulls = {};
  const acids = {};
  const esters = {};
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
      if (acidPrincipal(verdict)) {
        acids[d.code] = (acids[d.code] || 0) + 1;
      }
      if (esterPrincipal(verdict)) {
        esters[d.code] = (esters[d.code] || 0) + 1;
      }
      assert.ok(FAMILY_CODES[mutation.family].includes(d.code), `${label}: ${d.code}, ${d.message}`);
      assert.ok(!/undefined|null|NaN|\[object|grupo –OH|grupos –OH/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), label);
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return { otherName, codes, nulls, acids, esters, unexpected };
} // End of function sweep()

/**
 * How many mutations of the carbonyl fixture names give `otherName`, by
 * family, and how many of them are deliberate nulls, by reason
 * (nullReason()): none since phase I-52a3a. Every one is diagnosed with one
 * of its family's codes (since R-5c3b1 the renumberings at N0, formerly 87
 * `principal` nulls, and the C=O moved to an end, formerly 21 `suffix` nulls,
 * too; since R-5d3 the 3 where an OH moved onto the –CHO's carbon makes an
 * acid, formerly `otherFamily` nulls: ACID_GROUP; since R-6a3a the 8 where an
 * alkoxy group moved there makes an ester, formerly `otherFamily` and then
 * «Esters» `seniority` nulls: ESTER_GROUP). Removing or adding locants never
 * gives `otherName`.
 */
const FIXTURE_OTHER_NAME = Object.freeze({
  reversed: 16, shifted: 10, reflected: 12, rotated: 85, swapped: 2, unsorted: 3, ungrouped: 3, diBis: 3, toEnd: 24, heteroToEnd: 11,
  removed: 0, added: 0,
});
// R-5c3a: the retained names joined the sweep; one rotation of `2-(4-metilfenil)acetaldehído` puts its aryl on carbon 1, a
// ketone (`1-(4-metilfenil)etan-1-ona`): one more `rotated` otherName, KETONE_NOT_ALDEHYDE since R-5c3b1.
// The 11 `otherFamily` nulls before R-5d3: 3 acids (an OH moved onto the –CHO's carbon), ACID_GROUP since R-5d3; 8 esters (an
// alkoxy group moved there, `1-metoxipropanal`) — since R-6a1 deliberate «Esters» nulls (`seniority`), ESTER_GROUP since R-6a3a.
const FIXTURE_NULLS = Object.freeze({});
const FIXTURE_ACIDS = Object.freeze({ ACID_GROUP: 3 });
const FIXTURE_ESTERS = Object.freeze({ ESTER_GROUP: 8 });

test('mutations of every carbonyl fixture name: a diagnosis of the family\'s codes, or a deliberate null with its reason', async () => {
  const names = (await readFixtures()).filter((row) => isCarbonyl(row.smiles)).flatMap((row) => row.names)
    .filter((name) => isCarbonylName(name) && !isAcylName(name)); // The acyl names: reverse-acyls.test.js.
  assert.equal(names.length, EXPECTED_SWEPT_NAMES);
  const { otherName, codes, nulls, acids, esters, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  assert.deepEqual(otherName, { ...FIXTURE_OTHER_NAME });
  assert.deepEqual([nulls, acids, esters], [{ ...FIXTURE_NULLS }, { ...FIXTURE_ACIDS }, { ...FIXTURE_ESTERS }]);
  assert.deepEqual([...codes].sort(), ['ACID_GROUP', 'ALPHABETICAL_ORDER', 'BRANCH_AT_END', 'CARBONYL_PREFIX', 'ESTER_GROUP',
    'KETONE_NOT_ALDEHYDE', 'LONGER_CHAIN', 'MULTIPLIER_KIND', 'NUMBERING', 'RING_NUMBERING', 'UNGROUPED']);
}); // End of test 'mutations of every carbonyl fixture name…'

test('mutations of the generated carbonyls: every otherName is diagnosed or a deliberate null, every step resolves', () => {
  const names = [];
  for (const mol of loopMolecules().slice(0, 320)) {
    const naming = nameMolecule(mol);
    names.push(...[naming.name, ...naming.alternatives.map((alt) => alt.name)].filter((name) => isCarbonylName(name) && !isAcylName(name)));
  }
  assert.ok(names.length >= 300, `${names.length} names`);
  const { otherName, codes, nulls, acids, esters, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  const total = Object.values(otherName).reduce((sum, count) => sum + count, 0);
  // The seeds give 1443, every one diagnosed, none null (before R-5c3b1: 742 deliberate nulls; until R-5d3, 21 nulls, every one
  // an acid, `otherFamily`: an OH on the –CHO's carbon, now ACID_GROUP); no ester among them.
  assert.equal(total, 1443);
  assert.deepEqual([nulls, acids, esters], [{}, { ACID_GROUP: 21 }, {}]);
  assert.deepEqual([otherName.removed, otherName.added], [0, 0]);
  for (const code of ['NUMBERING', 'RING_NUMBERING', 'ALPHABETICAL_ORDER', 'UNGROUPED', 'MULTIPLIER_KIND', 'BRANCH_AT_END',
    'LONGER_CHAIN', 'MORE_SUBSTITUENTS', 'KETONE_NOT_ALDEHYDE', 'CARBONYL_PREFIX', 'ACID_GROUP']) {
    assert.ok(codes.has(code), `${code}: ${[...codes]}`);
  }
}); // End of test 'mutations of the generated carbonyls…'

// ---------------------------------------------------------------------------
// The drawing, the dialog, robustness and time.
// ---------------------------------------------------------------------------

test('«Dibujar» (R-5c1): carbonyl verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const name of ['butanal', 'pentano-2,4-diona', 'ciclohexanona', 'ciclohexano-1,4-dicarbaldehído', 'benzaldehído',
    '4-metilbenzaldehído', 'benceno-1,4-dicarbaldehído', '4-oxopentanal', '2-(4-formilciclohexil)propanodial', '1-feniletan-1-ona',
    '2-pentanona', 'formilciclohexano']) {
    const verdict = read(name);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-5c1)…'

test('dialog (R-5c1): the carbonyl tiles have tooltips', () => {
  for (const id of [OXO_ID, FORMYL_ID, AL_ID, ONA_ID, CARBALDEHYDE_ID, BENZALDEHYDE_ID]) {
    assert.ok(TILE_HINTS[id] && TILE_HINTS[id].endsWith('.'), id);
  }
  assert.match(TILE_HINTS[AL_ID], /butanal; con dos, butanodial/);
  assert.match(TILE_HINTS[ONA_ID], /pentan-2-ona/);
  assert.match(TILE_HINTS[CARBALDEHYDE_ID], /ciclohexanocarbaldehído/);
  assert.equal(TILE_HINTS[BENZALDEHYDE_ID], 'Benceno con un grupo CHO: bencenocarbaldehído.');
}); // End of test 'dialog (R-5c1)…'

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

test('property (R-5c1): random carbonyl names — any parent and suffix, locants or none, inside branches too — never crash', () => {
  const random = mulberry32(20261016);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const branches = ['oxo', 'formil', 'met il', 'cloro', 'hidroxi', 'met il oxi', 'START 2 oxo et il END', 'START 4 formil fenil END',
    'START 1 oxo prop ano 2 il END', 'fenil', 'ciclo hex il'];
  const parents = ['met ano al', 'et ano al', 'but ano di al', 'pent ano ona', 'pent ano 2 ona', 'hex ano 2 5 di ona',
    'ciclo hex ano ona', 'ciclo hex ano carbaldehído', 'ciclo pent ano 1 2 di carbaldehído', 'benceno carbaldehído',
    'benceno 1 3 di carbaldehído', 'benzaldehído', 'but 2 eno al', 'prop ano ona', 'et ano ol'];
  const multipliers = { 1: '', 2: 'di', 3: 'tri' };
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const prefixes = Array.from({ length: int(0, 2) }, () => {
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
      assert.ok(!/undefined|null|NaN|\[object|grupo –OH|grupos –OH/.test(verdict.diagnosis.message), `${words}: ${verdict.diagnosis.message}`);
    }
  } // End of the loop over the random names
  for (const kind of ['correct', 'otherName', 'ambiguous', 'invalid']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-5c1): random carbonyl names…'

test('time budget: carbonyl readName() calls, with their diagnosis, well within budget', () => {
  const names = ['pentano-2,4-diona', 'ciclohexano-1,4-dicarbaldehído', '2-(4-formilciclohexil)propanodial', 'benzaldehído',
    '4-oxopentanal', '2-pentanona', 'pent ano ona', 'met il ciclo hex ano ona', 'di met il benzaldehído', 'hex ano di ona',
    '4 met il pent ano 3 ona'];
  names.forEach((name) => read(name)); // Warm-up.
  for (const name of names) {
    const start = performance.now();
    const verdict = read(name);
    const ms = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', name);
    assert.ok(ms < PER_NAME_BUDGET_MS, `${name}: ${ms.toFixed(1)} ms`);
  }
}); // End of test 'time budget…'
