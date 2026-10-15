/**
 * @file Unit tests for the esters in «¿Cómo se dibuja?» (src/reverse/,
 * design.md §15.5.2 item 6, §15.5.3, §15.7, §15.8 R-6a; phase I-52a1,
 * R-6a1): the «Grupos» row's suffixes `oato` (a –COO– at the ends of a chain,
 * by rule) and `carboxilato` (a –COO– whose carbon is outside the parent),
 * the ending `ilo` of an ester's O-bound group (in place of `il`), and the
 * «Anillos» row's `benzoato`; the automatic ` de ` and ` y ` of the O-bound
 * side and its own multipliers (`de dimetilo`, `de di(propan-2-ilo)`, `de
 * bis(2-cloroetilo)`). Parser (the O-bound side, ESTER_GROUPS, ESTER_SUFFIX
 * and the misplaced tiles with their tile ranges, partial names), assembler
 * (every form checked against the forward engine's own text), tokenizer (the
 * later families' names never read; the retained `formiato` / `acetato` read
 * since phase R-6a2a, reverse-ester-templates.test.js, and the ester
 * prefixes since phase R-6a2b, reverse-ester-prefixes.test.js), interpreter
 * and builder (the =O
 * and the bridge oxygen of each –COO–, the O-bound groups bonded to it,
 * CARBONYL_POSITION, VALENCE, LOCANT_RANGE, BOND_RANGE with the O-bound
 * group's words, the caps), search (left-out locants of the acid part, of
 * `carboxilato` and inside an O-bound group; the budget), readName()
 * verdicts with the molecule each describes (compared by aromatic key with a
 * SMILES), out-of-scope esters, mutations and their diagnosis (the rules that
 * hold for an ester's acid part; the ester's own mistakes, each with its
 * category read independently — deliberate nulls of diagnose.js «Esters»
 * until phase I-52a3a, which names them, the O-bound side until phase
 * I-52a3b), the fixture round trip over every ester row of
 * tests/fixtures/names.tsv and the closed loop over the oracle's ester
 * generators (pure imports, no Java), the retained names of phase R-6a2a
 * included, the diagnosis sweeps over the names of phase R-6a1 (the ester's
 * own mistakes counted by category with their codes, no null left; the
 * retained names are swept apart,
 * reverse-ester-templates.test.js), the ordered drawing, the dialog's
 * tooltips and time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse, isTerminalSuffix, esterSuffixOf } from '../../src/reverse/parse.js';
import { assemble, esterGroupsOf } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build, specAtoms, specCarbons, specRings } from '../../src/reverse/build.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { OATO_ID, CARBOXYLATE_ID, BENZOATE_ID, ESTER_ALKYL_ID, tileById } from '../../src/reverse/tiles.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { TILE_HINTS } from '../../src/ui/name-builder.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { TOO_MANY_ATOMS_MESSAGE } from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { ESTER_LINK, ESTER_ALKYL_JOIN } from '../../src/naming/lexicon.es.js';
import {
  generateEsters, generateEsterPrefixes, generateRingEsters, generateSubstitutedEsters,
} from '../../scripts/oracle/generate.mjs';
import {
  seq, readFixtures, leafIndices, isEster, isEsterMolecule, isEsterName, LATER_ESTER_WORDS, ESTER_PREFIX, ESTER_WORD,
  isEsterTemplateName, ESTER_TEMPLATE_WORDS,
} from './reverse-words.js';

/**
 * Ester fixture rows (an ester's name, with ` de `): 119, of which 104 are
 * esters the tiles read (isEster(): carbons, halogens and oxygens, at least
 * one –COO–, no –COOH) — 39 of I-35 (the esters' own section), 3 of I-39b
 * (acyl prefixes), 11 of I-39c (diesters), 28 of I-40d (ring esters), 23 of
 * I-45c (substituted-ring esters) — and 15 with a nitrogen, of later phases
 * (amines R-6c, nitriles R-6b, amides R-6d), which never tokenize.
 */
const EXPECTED_ROWS = Object.freeze({ total: 119, read: 104, i35: 39, i39b: 3, i39c: 11, i40d: 28, i45c: 23, nitrogen: 15 });

/**
 * Their names and alternatives the tiles write, read back (184): those of
 * phase R-6a1 (145, swept below) and, since phase R-6a2a, the retained
 * `formiato`, `acetato`, `fenilacetato` and `2-(4-metilfenil)acetato` names
 * (39, swept apart in reverse-ester-templates.test.js); none left for later.
 */
const EXPECTED_NAMES = 184;
const EXPECTED_TEMPLATE_NAMES = 39;
const EXPECTED_LATER_NAMES = 0;

/** Average time budget of one readName() call over the fixture round trip, in milliseconds (phones are slower). */
const AVERAGE_BUDGET_MS = 50;

/** Time budget of one representative readName() call, in milliseconds. */
const PER_NAME_BUDGET_MS = 250;

/**
 * The tile ids of a name: space-separated tile words (reverse-words.js) when
 * every word is a tile, else a name text read by the tokenizer (an ester's
 * name has ` de `).
 *
 * @param {string} name - Tile words or a name.
 * @returns {string[]} The tile ids.
 */
function idsOf(name) {
  let ids = null;
  try {
    ids = seq(name);
  } catch (err) {
    ids = null; // A name text: `etanoato de metilo`.
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
 * The bonds of each oxygen of a molecule: its neighbours' elements and the
 * bond orders (`C1 C1`: an ester's bridge oxygen; `C2`: a C=O), the oxygens
 * sorted.
 *
 * @param {object} mol - A molecule.
 * @returns {string[]} Per oxygen, its bonds.
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

test('parser (R-6a1): the ester suffix in the parent node, every tile after it the O-bound side, its groups ending in `ilo`', () => {
  // 0:et 1:ano 2:oato 3:met 4:ilo
  let { tree, errors } = parse(seq('et ano oato met ilo'));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.parent.suffix, { type: 'suffix', locants: [], multiplier: null, tile: 2, range: [2, 3] });
  assert.ok(isTerminalSuffix(tree.tiles, tree.parent.suffix), '`oato` is terminal by rule, as `oico`');
  assert.deepEqual(esterSuffixOf(tree.tiles, tree.parent), { tile: 2, count: 1, word: 'oato' });
  assert.deepEqual([tree.ester.type, tree.ester.range, tree.ester.items.length], ['ester', [3, 5], 1]);
  assert.deepEqual(tree.ester.items[0].substituent, {
    type: 'chain', ring: null, root: 3, ano: null, segments: [], fvLocants: [], fv: 4, oxi: null, range: [3, 5],
  });
  // A retained word takes `ilo` in its `il`'s place: the field `ilo`, only when the tile follows it.
  ({ tree, errors } = parse(seq('benzoato fenil ilo')));
  assert.deepEqual(errors, []);
  assert.deepEqual([tree.parent.chain, tree.parent.suffix], [{ type: 'benzene', tile: 0, range: [0, 1] }, null]);
  assert.deepEqual(esterSuffixOf(tree.tiles, tree.parent), { tile: 0, count: 1, word: 'benzoato' });
  assert.deepEqual(tree.ester.items[0].substituent, { type: 'retained', tile: 1, oxi: null, ilo: 2, range: [1, 3] });
  assert.equal('ilo' in parse(seq('2 isopropil hex ano')).tree.items[0].substituent, false);
  // Two groups; bare prefixes belong to the group they stand before; a multiplied group with prefixes is a compound branch.
  ({ tree } = parse(seq('prop ano di oato et ilo met ilo')));
  assert.deepEqual(esterSuffixOf(tree.tiles, tree.parent), { tile: 3, count: 2, word: 'dioato' });
  let { groups, rest } = esterGroupsOf(tree.tiles, tree.ester.items);
  assert.deepEqual([groups.map((g) => [g.items.length, g.end.range]), rest], [[[0, [4, 6]], [0, [6, 8]]], []]);
  ({ tree } = parse(seq('et ano oato 2 cloro et ilo')));
  ({ groups } = esterGroupsOf(tree.tiles, tree.ester.items));
  assert.deepEqual(groups.map((g) => [g.items.map((item) => item.range), g.end.range]), [[[[3, 5]], [5, 7]]]);
  ({ tree } = parse(seq('but ano di oato bis START 2 cloro et ilo END')));
  ({ groups } = esterGroupsOf(tree.tiles, tree.ester.items));
  assert.deepEqual([groups.length, groups[0].end.multiplier, groups[0].end.substituent.type, groups[0].end.substituent.items.length],
    [1, 4, 'branch', 1]);
  // Old style: `2-butenoato` gives its locant to the segment, `1,4-…dicarboxilato` to the suffix.
  ({ tree } = parse(seq('2 but eno oato met ilo')));
  assert.deepEqual([tree.parent.legacySegment, tree.parent.legacySuffix], [0, false]);
  ({ tree } = parse(seq('1 4 ciclo hex ano di carboxilato di met ilo')));
  assert.deepEqual([tree.parent.legacySegment, tree.parent.legacySuffix], [null, true]);
  // Lossless: every tile once, in order, the O-bound side last.
  for (const words of ['et ano oato met ilo', 'benzoato fenil ilo', 'prop ano di oato isopropil ilo prop ilo', 'et ano oato 2 START 4 met '
    + 'il fenil END et ilo', 'but ano di oato bis START 2 cloro et ilo END', 'et ano oato', 'et ano met ilo', 'met ilo et ano oato',
  'et ano oato met ilo 2 cloro', 'et ano oato tert-butil ilo', 'et ano oato isopropiliden ilo', 'ilo']) {
    assert.deepEqual(leafIndices(parse(seq(words)).tree), seq(words).map((_, i) => i), words);
  }
  // Partial names assemble too; ` de ` only when something follows the acid part, ` y ` before a second group.
  assert.equal(text('et ano oato'), 'etanoato');
  assert.equal(text('et ano oato met'), 'etanoato de met');
  assert.equal(text('et ano oato met il'), 'etanoato de metil');
  assert.equal(text('et ano oato met ilo 2 cloro'), 'etanoato de metilo y 2-cloro');
  assert.equal(text('et ano met ilo'), 'etano de metilo');
}); // End of test 'parser (R-6a1): the ester suffix…'

test('parser (R-6a1): ESTER_GROUPS, ESTER_SUFFIX and misplaced ester tiles are errors with their tile ranges and hints', () => {
  const cases = [
    ['et ano oato', ['ESTER_GROUPS[2,3)']],
    ['but ano di oato met ilo', ['ESTER_GROUPS[3,6)']],
    ['et ano oato di met ilo', ['ESTER_GROUPS[2,6)']],
    ['benzoato', ['ESTER_GROUPS[0,1)']],
    ['et ano met ilo', ['ESTER_SUFFIX[2,4)']],
    ['ácido et ano oico met ilo', ['ESTER_SUFFIX[4,6)']],
    ['et il met il éter met ilo', ['ESTER_SUFFIX[5,7)']],
    ['et ano oato met il', ['TILE_ORDER[4,5)']],
    ['et ano oato isopropil', ['TILE_ORDER[3,4)']],
    ['et ano oato START 2 met il prop il END', ['TILE_ORDER[8,9)']],
    ['met ilo et ano oato', ['TILE_ORDER[1,2)', 'ESTER_GROUPS[4,5)']],
    ['START met ilo END et ano oato met ilo', ['TILE_ORDER[2,3)']],
    ['et ano oato START 2 met ilo prop il END', ['TILE_ORDER[6,7)']],
    ['et ano 1 oato met ilo', ['TILE_ORDER[2,3)']],
    ['et ano 1 oato met ilo', ['TILE_ORDER[2,3)']],
    ['1 et ano oato met ilo', ['TILE_ORDER[0,1)']],
    ['ciclo hex ano oato met ilo', ['TILE_ORDER[3,4)']],
    ['benceno oato met ilo', ['TILE_ORDER[1,2)']],
    ['but ano bis oato di met ilo', ['TILE_ORDER[2,3)']],
    ['et ano oato 2 prop ilo', ['TILE_ORDER[3,4)']],
    ['et ano oato 2 cloro di et ilo', ['TILE_ORDER[3,5)']],
    ['et ano oato 2 cloro START et ilo END', ['TILE_ORDER[3,5)']],
    ['et ano oato met ilo 2 cloro', ['TILE_ORDER[5,7)']],
    ['et ano oato isopropiliden ilo', ['TILE_ORDER[3,4)']],
    ['et ano oato acetil ilo', ['TILE_ORDER[3,4)']],
    ['et ano oato met ilo oxi', ['TILE_ORDER[5,6)']],
    ['et ano oato prop ano ilo', ['TILE_ORDER[4,5)']],
    ['et ano oato prop 1 2 ilo', ['LOCANT_COUNT[4,6)']],
    ['et ano oato met', ['ROOT_END[3,4)']],
    ['et ano oato benceno', ['TILE_ORDER[3,4)']],
    ['et ano oato ilo', ['TILE_ORDER[3,4)']],
    ['et ano oato p met il fenil ilo', ['POSITIONAL[3,4)']],
    ['1 benzoato met ilo', ['TEMPLATE_LOCANTS[0,1)']],
    ['p benzoato met ilo', ['TEMPLATE_LOCANTS[0,1)']],
    ['di benzoato met ilo', ['TILE_ORDER[0,1)']],
    ['START benzoato END met ano', ['TILE_ORDER[1,2)']],
    ['START et ano oato END met ano', ['TILE_ORDER[3,4)']],
    ['ácido et ano oato met ilo', ['ACID_WORD[0,1)']],
  ];
  for (const [words, expected] of cases) {
    const errors = errorsOf(words);
    for (const error of expected) {
      assert.ok(errors.includes(error), `${words}: ${errors.join(' ')} lacks ${error}`);
    }
  }
  // One message per mistake: a group's shape, when wrong, is not counted too.
  assert.deepEqual(errorsOf('et ano oato 2 cloro di et ilo'), ['TILE_ORDER[3,5)']);
  assert.deepEqual(errorsOf('et ano oato met il'), ['TILE_ORDER[4,5)']);
  const lead = 'Esta ficha no puede ir aquí: ';
  const leads = 'Estas fichas no pueden ir aquí: ';
  assert.equal(messageOf('et ano oato'), 'Detrás de «oato» va el grupo unido al oxígeno del éster, acabado en «ilo» (la palabra «de» la '
    + 'pone la app): et, ano, oato, met e ilo dan etanoato de metilo.');
  assert.equal(messageOf('but ano di oato met ilo'), 'Con «dioato» hay dos grupos COO, y cada uno lleva su grupo unido al oxígeno; tu '
    + 'nombre pone uno: escribe dos, por orden alfabético (propanodioato de etilo y metilo), o uno solo con «di» delante si son iguales '
    + '(butanodioato de dimetilo).');
  assert.equal(messageOf('et ano oato di met ilo'), 'Con «oato» hay un solo grupo COO, que lleva un solo grupo unido al oxígeno, y tu '
    + 'nombre pone dos: etanoato de metilo.');
  assert.equal(messageOf('et ano met ilo'), 'El grupo acabado en «ilo» es el que va unido al oxígeno de un éster, detrás de la parte '
    + 'ácida, y el nombre de esa parte termina en «oato» (etanoato de metilo), en «carboxilato» (ciclohexanocarboxilato de etilo) o en '
    + '«benzoato» (benzoato de metilo).');
  assert.equal(messageOf('et ano oato met il'), `${lead}el grupo unido al oxígeno de un éster acaba en «ilo», no en «il»: met e ilo `
    + 'dan metilo (etanoato de metilo).');
  assert.equal(messageOf('met ilo et ano oato'), `${lead}«ilo» acaba el grupo unido al oxígeno de un éster, que va al final del `
    + 'nombre, detrás de la parte ácida (etanoato de metilo); en una rama se escribe «il» (metil).');
  assert.equal(messageOf('et ano 1 oato met ilo'), `${lead}el grupo COO de «oato» va siempre en un extremo de la cadena, en el carbono 1 `
    + '(y en el último, con «dioato»), así que «oato» no lleva números: etanoato de metilo, butanodioato de dimetilo.');
  assert.equal(messageOf('ciclo hex ano oato met ilo'), `${lead}«oato» solo va detrás de una cadena: en un anillo, el grupo COO va unido `
    + 'a un carbono del anillo y se escribe «carboxilato» (ciclohexanocarboxilato de etilo).');
  assert.equal(messageOf('benceno oato met ilo'), `${lead}«oato» no va detrás de «benceno»: el benceno con un grupo COO es el «benzoato» `
    + '(benzoato de metilo).');
  assert.equal(messageOf('et ano oato 2 prop ilo'), `${lead}el grupo unido al oxígeno de un éster no lleva números delante (etanoato de `
    + 'metilo); si se une al oxígeno por otro carbono, ese número va justo delante de «ilo» (etanoato de propan-2-ilo), y sus ramas, con '
    + 'sus números, delante de su cadena (etanoato de 2-cloroetilo).');
  assert.equal(messageOf('et ano oato 2 cloro di et ilo'), `${leads}con «di» o «bis» delante, un grupo unido al oxígeno que lleva ramas `
    + 'propias va entero en una rama compuesta, entre «(» y «)»: butanodioato de bis(2-cloroetilo).');
  assert.equal(messageOf('et ano oato 2 cloro START et ilo END'), `${leads}si el grupo unido al oxígeno va en una rama compuesta, entre `
    + '«(» y «)», sus ramas van dentro de ella, delante de su cadena: butanodioato de bis(2-cloroetilo).');
  assert.equal(messageOf('et ano oato met ilo 2 cloro'), `${leads}detrás de las ramas del grupo unido al oxígeno va la cadena de ese `
    + 'grupo, acabada en «ilo»: etanoato de 2-cloroetilo.');
  assert.equal(messageOf('et ano oato isopropiliden ilo'), `${lead}el grupo unido al oxígeno de un éster se une a él por un enlace `
    + 'sencillo, así que acaba en «ilo» (metilo), no en «isopropiliden».');
  assert.equal(messageOf('et ano oato acetil ilo'), `${lead}«acetil» no va unido al oxígeno de un éster: el grupo unido al oxígeno es una `
    + 'cadena o un anillo de carbonos que acaba en «ilo» (etanoato de metilo).');
  assert.equal(messageOf('et ano oato met ilo oxi'), `${lead}«oxi» no va detrás de «ilo»: el grupo acabado en «ilo» ya va unido al `
    + 'oxígeno del éster (etanoato de metilo).');
  assert.equal(messageOf('et ano oato prop ano ilo'), `${lead}en el grupo unido al oxígeno sin número no se pone «ano»: metilo, no `
    + 'metanilo.');
  assert.equal(messageOf('et ano oato prop 1 2 ilo'), 'El grupo unido al oxígeno se une a él por un solo carbono: delante de «ilo» va '
    + 'un solo número.');
  assert.equal(messageOf('et ano oato met'), 'Después de «met» va «ilo» si es el grupo unido al oxígeno del éster (etanoato de metilo, '
    + 'etanoato de propan-2-ilo), o «il» si es una rama de ese grupo.');
  assert.equal(messageOf('et ano oato benceno'), `${lead}el benceno unido al oxígeno de un éster se escribe con «fenil» e «ilo»: `
    + 'benzoato de fenilo.');
  assert.equal(messageOf('et ano oato p met il fenil ilo'), 'En el grupo unido al oxígeno de un éster no se usan «o», «m» ni «p»: '
    + 'escribe los números, como en etanoato de 4-metilfenilo.');
  assert.equal(messageOf('1 benzoato met ilo'), '«benzoato» ya dice dónde va su grupo COO, en el carbono 1: no lleva números ni letras '
    + 'propios.');
  assert.equal(messageOf('START benzoato END met ano'), `${lead}«benzoato» es el nombre de la parte ácida de un éster y va delante del `
    + 'grupo unido al oxígeno (benzoato de metilo); dentro de una rama, el anillo es «fenil».');
  assert.equal(parse(seq('START et ano oato END met ano')).errors[1].message, `${lead}«oato» va detrás de la terminación de la cadena `
    + 'principal de un éster, y luego el grupo unido al oxígeno, acabado en «ilo» (etanoato de metilo, butanodioato de dimetilo).');
  // A letter counts the –COO– of `benzoato` as one of its two positions.
  assert.deepEqual(errorsOf('p met il benzoato et ilo'), []);
  assert.deepEqual(errorsOf('p di met il benzoato et ilo'), ['POSITIONAL[0,1)']);
}); // End of test 'parser (R-6a1): ESTER_GROUPS…'

// ---------------------------------------------------------------------------
// Assembler and tokenizer.
// ---------------------------------------------------------------------------

/**
 * Every assembly form of phase R-6a1, as tile words and the SMILES of a
 * molecule whose engine names include the form (render.js assembleEster():
 * the acid part, ` de `, the O-bound groups, ` y ` between two; esterAlkylName():
 * the group's prefix words and `o`, never enclosed alone; esterAlkylParts():
 * a multiplied group enclosed as a prefix by itself; suffixWords(): the
 * parent's `o` elided before `oato`, kept before `dioato` and `carboxilato`).
 */
const FORMS = Object.freeze([
  ['met ano oato met ilo', 'O=COC'],
  ['et ano oato met ilo', 'CC(=O)OC'],
  ['prop ano oato et ilo', 'CCC(=O)OCC'],
  ['et ano oato isopropil ilo', 'CC(=O)OC(C)C'],
  ['et ano oato prop ano 2 ilo', 'CC(=O)OC(C)C'],
  ['et ano oato 1 met il et ilo', 'CC(=O)OC(C)C'],
  ['2 met il prop ano oato tert-butil ilo', 'CC(C)C(=O)OC(C)(C)C'],
  ['et ano oato 2 met il prop ilo', 'CC(=O)OCC(C)C'],
  ['et ano oato but ano 2 ilo', 'CC(=O)OC(C)CC'],
  ['et ano oato 2 2 di met il prop ilo', 'CC(=O)OCC(C)(C)C'],
  ['prop 2 eno oato met ilo', 'C=CC(=O)OC'],
  ['but 2 eno oato et ilo', 'CC=CC(=O)OCC'],
  ['et ano oato et eno ilo', 'CC(=O)OC=C'],
  ['et ano oato prop 2 eno 1 ilo', 'CC(=O)OCC=C'],
  ['et ano oato prop 2 ino 1 ilo', 'CC(=O)OCC#C'],
  ['2 2 2 tri fluoro et ano oato et ilo', 'FC(F)(F)C(=O)OCC'],
  ['et ano oato 2 cloro et ilo', 'CC(=O)OCCCl'],
  ['2 hidroxi prop ano oato et ilo', 'CC(O)C(=O)OCC'],
  ['et ano oato 2 hidroxi et ilo', 'CC(=O)OCCO'],
  ['3 oxo but ano oato et ilo', 'CC(=O)CC(=O)OCC'],
  ['et ano oato 2 oxo prop ilo', 'CC(=O)OCC(C)=O'],
  ['et ano oato 2 met il oxi et ilo', 'CC(=O)OCCOC'],
  ['et ano oato met il oxi met ilo', 'CC(=O)OCOC'],
  ['3 formil pent ano oato et ilo', 'CCOC(=O)CC(C=O)CC'],
  ['et ano oato 2 acetil hex ilo', 'CC(=O)OCC(C(C)=O)CCCC'],
  ['but ano di oato di met ilo', 'COC(=O)CCC(=O)OC'],
  ['et ano di oato di met ilo', 'COC(=O)C(=O)OC'],
  ['prop ano di oato et ilo met ilo', 'COC(=O)CC(=O)OCC'],
  ['prop ano di oato isopropil ilo prop ilo', 'CCCOC(=O)CC(=O)OC(C)C'],
  ['prop ano di oato 1 met il et ilo prop ilo', 'CCCOC(=O)CC(=O)OC(C)C'],
  ['but ano di oato di isopropil ilo', 'CC(C)OC(=O)CCC(=O)OC(C)C'],
  ['but ano di oato di prop ano 2 ilo', 'CC(C)OC(=O)CCC(=O)OC(C)C'],
  ['but ano di oato bis START 1 met il et ilo END', 'CC(C)OC(=O)CCC(=O)OC(C)C'],
  ['prop ano di oato di tert-butil ilo', 'CC(C)(C)OC(=O)CC(=O)OC(C)(C)C'],
  ['but ano di oato bis START 2 cloro et ilo END', 'ClCCOC(=O)CCC(=O)OCCCl'],
  ['2 acetil prop ano di oato di et ilo', 'CCOC(=O)C(C(C)=O)C(=O)OCC'],
  ['but 2 eno di oato di met ilo', 'COC(=O)C=CC(=O)OC'],
  ['benzoato met ilo', 'COC(=O)C1=CC=CC=C1'],
  ['benceno carboxilato met ilo', 'COC(=O)C1=CC=CC=C1'],
  ['ciclo hex ano carboxilato et ilo', 'CCOC(=O)C1CCCCC1'],
  ['2 met il ciclo hex ano 1 carboxilato met ilo', 'COC(=O)C1CCCCC1C'],
  ['ciclo hex 2 eno 1 carboxilato met ilo', 'COC(=O)C1C=CCCC1'],
  ['ciclo hex ano 1 4 di carboxilato di met ilo', 'COC(=O)C1CCC(C(=O)OC)CC1'],
  ['et ano oato fenil ilo', 'CC(=O)OC1=CC=CC=C1'],
  ['et ano oato ciclo hex ilo', 'CC(=O)OC1CCCCC1'],
  ['et ano oato 2 met il ciclo hex ilo', 'CC(=O)OC1CCCCC1C'],
  ['et ano oato ciclo hex 2 eno 1 ilo', 'CC(=O)OC1C=CCCC1'],
  ['et ano oato ciclo hex il met ilo', 'CC(=O)OCC1CCCCC1'],
  ['benzoato fenil ilo', 'O=C(OC1=CC=CC=C1)C1=CC=CC=C1'],
  ['2 fenil et ano oato fenil ilo', 'O=C(OC1=CC=CC=C1)CC1=CC=CC=C1'],
  ['4 met il benzoato et ilo', 'CCOC(=O)C1=CC=C(C)C=C1'],
  ['p met il benzoato et ilo', 'CCOC(=O)C1=CC=C(C)C=C1'],
  ['4 met il benceno 1 carboxilato et ilo', 'CCOC(=O)C1=CC=C(C)C=C1'],
  ['et ano oato 4 met il fenil ilo', 'CC(=O)OC1=CC=C(C)C=C1'],
  ['4 met il benzoato 4 cloro fenil ilo', 'CC1=CC=C(C=C1)C(=O)OC1=CC=C(Cl)C=C1'],
  ['et ano oato 2 4 di cloro fenil ilo', 'CC(=O)OC1=CC=C(Cl)C=C1Cl'],
  ['et ano oato 4 cloro 2 met il fenil ilo', 'CC(=O)OC1=CC=C(Cl)C=C1C'],
  ['et ano oato 2 START 4 met il fenil END et ilo', 'CC(=O)OCCC1=CC=C(C)C=C1'],
  ['et ano oato 4 prop ano 2 il fenil ilo', 'CC(C)C1=CC=C(OC(C)=O)C=C1'],
  ['2 START 4 met il fenil END et ano oato et ilo', 'CCOC(=O)CC1=CC=C(C)C=C1'],
  ['2 START 4 met il benzoil END but ano oato et ilo', 'CCOC(=O)C(CC)C(=O)C1=CC=C(C)C=C1'],
  ['2 START 4 met il fenil oxi END et ano oato et ilo', 'CCOC(=O)COC1=CC=C(C)C=C1'],
  ['4 cloro benzoato 4 met il ciclo hex ilo', 'ClC1=CC=C(C=C1)C(=O)OC1CCC(C)CC1'],
]);

test('assembler (R-6a1): every ester form is the forward engine\'s own text; the tokenizer reads it back', () => {
  for (const [words, smiles] of FORMS) {
    const assembled = text(words);
    assert.ok(namesOf(smiles).includes(assembled), `${words} → ${assembled}, not among ${namesOf(smiles).join(', ')}`);
    assert.deepEqual(tokenize(assembled), seq(words), assembled);
  }
  // Rule 10: ` de ` and ` y `, 'punct' spans of no tile, as render.js gives them; the group's multiplier a 'multiplier' part,
  // the rest of the group 'prefix'.
  let { spans, text: written } = assemble(parse(seq('prop ano di oato et ilo met ilo')).tree);
  assert.equal(written, `propanodioato${ESTER_LINK}etilo${ESTER_ALKYL_JOIN}metilo`);
  assert.deepEqual(spans.map((s) => [s.tile, s.kind, written.slice(s.from, s.to)]), [[0, 'stem', 'prop'], [1, 'ending', 'ano'],
    [2, 'multiplier', 'di'], [3, 'ending', 'oato'], [null, 'punct', ' de '], [4, 'prefix', 'et'], [5, 'prefix', 'ilo'],
    [null, 'punct', ' y '], [6, 'prefix', 'met'], [7, 'prefix', 'ilo']]);
  ({ spans, text: written } = assemble(parse(seq('but ano di oato di isopropil ilo')).tree));
  assert.deepEqual(spans.slice(5).map((s) => [s.tile, s.kind, written.slice(s.from, s.to)]), [[4, 'multiplier', 'di'],
    [5, 'prefix', 'isoprop'], [6, 'prefix', 'ilo']]);
  // A group alone is never enclosed, also written as a compound branch (its marks then write nothing).
  assert.equal(text('et ano oato START 2 cloro et ilo END'), 'etanoato de 2-cloroetilo');
  // The student's multiplier is kept as chosen: `di(2-cloroetilo)`, `bismetilo` — names the engine does not write.
  assert.equal(text('but ano di oato di START 2 cloro et ilo END'), 'butanodioato de di(2-cloroetilo)');
  assert.equal(text('but ano di oato bis met ilo'), 'butanodioato de bismetilo');
  // Rule 4, the suffix half: the parent's `o` elided before `oato`, kept before `dioato` and `carboxilato`.
  assert.equal(text('but 2 eno oato met ilo'), 'but-2-enoato de metilo');
  assert.equal(text('ciclo hex 2 eno 1 carboxilato met ilo'), 'ciclohex-2-eno-1-carboxilato de metilo');
  // Old style, assembled as written.
  assert.equal(text('2 but eno oato met ilo'), '2-butenoato de metilo');
  assert.deepEqual(tokenize('2-butenoato de metilo'), seq('2 but eno oato met ilo'));
  assert.equal(text('1 4 ciclo hex ano di carboxilato di met ilo'), '1,4-ciclohexanodicarboxilato de dimetilo');
}); // End of test 'assembler (R-6a1)…'

test('tokenizer (R-6a1): texts that only read with errors and the later families\' names never tokenize; the ester prefixes do', () => {
  for (const name of ['etanoato', 'etanoato de', 'etanoato de ', 'etanoato  de metilo', 'etanoatode metilo', 'etanoato de metil',
    'etanoato de metilo y', 'etanoato de metilo etilo', 'etanoato y metilo', 'etano de metilo', 'metilo', 'metilo etanoato',
    'etanoato de metilo de etilo', 'etanoato de (2-cloroetilo)', 'ciclohexanoato de metilo', 'bencenoato de metilo',
    'etan-1-oato de metilo', 'butano-1,4-dioato de dimetilo', 'etanoato de 2-propilo', 'etanoato de propanilo', 'benzoato',
    'etanoato de metiloxi', 'ácido etanoato de metilo',
    // Phases R-6b…R-6d: nitriles, amines, amides beside an ester.
    '2-aminoetanoato de metilo', '2-cianoetanoato de metilo', 'etanoato de 2-(dimetilamino)etilo', '4-amino-4-oxobutanoato de metilo']) {
    assert.equal(tokenize(name), null, name);
  }
  // Phase R-6a2a: the retained ester names read (reverse-ester-templates.test.js); none is left for later.
  assert.deepEqual(LATER_ESTER_WORDS, []);
  assert.deepEqual(ESTER_TEMPLATE_WORDS, ['formiato', 'acetato', 'fenilacetato']);
  for (const name of ['acetato de metilo', 'formiato de etilo', 'fenilacetato de metilo', '2-(4-metilfenil)acetato de etilo',
    'acetato de fenilo']) {
    assert.ok(tokenize(name), name);
    assert.ok(isEsterName(name) && isEsterTemplateName(name), name);
  }
  assert.equal(ESTER_WORD, ESTER_LINK);
  assert.ok(isEsterName('butanodioato de dimetilo') && !isEsterTemplateName('butanodioato de dimetilo') && !isEsterName('ácido etanoico'));
  assert.ok(!isEsterName('ácido 2-(acetiloxi)etanoico') && !isEsterTemplateName('etanoato de 2-acetilhexilo'));
  // Phase R-6a2b: the ester prefixes read (reverse-ester-prefixes.test.js), beside an acid; beside an ester the engine refuses the
  // molecule (`esterPrefix`), so `2-(acetiloxi)etanoato de metilo` reads and is out of scope.
  assert.ok(tokenize('ácido 2-(acetiloxi)etanoico') && tokenize('ácido 3-(metoxicarbonil)pentanodioico'));
  assert.equal(readName(tokenize('2-(acetiloxi)etanoato de metilo')).kind, 'outOfScope');
  assert.equal(tokenize('butanodioato de di(2-cloroetilo)').length, 11, 'the student\'s own multiplier reads (the engine writes bis)');
}); // End of test 'tokenizer (R-6a1)…'

// ---------------------------------------------------------------------------
// Interpreter and builder.
// ---------------------------------------------------------------------------

test('interpreter (R-6a1): the ester suffix, `bridge` set; the O-bound groups as SubstituentSpecs with their own slots', () => {
  // `oato`: implicit at carbon 1, and at the last carbon with `dioato`; no left-out slot.
  let spec = specOf('but ano di oato di met ilo');
  assert.deepEqual([spec.suffix.kind, spec.suffix.outside, spec.suffix.bridge, spec.suffix.hydroxy, spec.suffix.terminal,
    spec.suffix.placed], ['ester', false, true, false, true, false]);
  assert.deepEqual(spec.suffix.slots.map((slot) => [slot.kind, slot.value]), [['implicit', 1], ['implicit', 4]]);
  assert.deepEqual([spec.leftOut, spec.classWord, spec.ester.tiles], [[], null, [4, 7]]);
  assert.deepEqual(spec.ester.groups.map((g) => [g.multiplier, g.substituent.kind, g.substituent.length, g.substituent.oBound,
    g.substituent.freeValence.slot.kind, g.substituent.freeValence.slot.value, g.tiles]),
  [[{ count: 2, compound: false }, 'chain', 1, true, 'implicit', 1, [4, 7]]]);
  // `propan-2-ilo`: the free valence supplied; `2-cloroetilo`: the bare prefix numbered on the group's chain.
  spec = specOf('et ano oato prop ano 2 ilo');
  assert.deepEqual([spec.ester.groups[0].substituent.freeValence.slot.kind, spec.ester.groups[0].substituent.freeValence.slot.value],
    ['supplied', 2]);
  spec = specOf('et ano oato 2 cloro et ilo');
  const [group] = spec.ester.groups;
  assert.deepEqual([group.tiles, group.substituent.prefixes.length, group.substituent.prefixes[0].slots.map((slot) => slot.value),
    group.substituent.prefixes[0].substituent.element], [[3, 7], 1, [2], 'Cl']);
  // Left out inside an O-bound group: a carbon slot of its own chain, searched.
  spec = specOf('et ano oato cloro et ilo');
  assert.deepEqual(spec.leftOut.map((slot) => [slot.role, slot.domain, slot.tiles]), [['carbon', [1, 2], [3, 4]]]);
  // `carboxilato`: carbon slots of the ring, outside; `benzoato`: placed at 1, outside, quoted as on its tile.
  spec = specOf('ciclo hex ano carboxilato et ilo');
  assert.deepEqual([spec.suffix.kind, spec.suffix.outside, spec.suffix.bridge, spec.leftOut.map((slot) => slot.domain)],
    ['ester', true, true, [[1, 6]]]);
  spec = specOf('4 met il benzoato fenil ilo');
  assert.deepEqual([spec.parent.kind, spec.suffix.placed, spec.suffix.outside, spec.suffix.bridge, spec.suffix.word.text,
    spec.ester.groups[0].substituent.kind], ['benzene', true, true, true, 'benzoato', 'phenyl']);
  // Two different groups, in the student's order.
  spec = specOf('prop ano di oato et ilo met ilo');
  assert.deepEqual(spec.ester.groups.map((g) => g.substituent.length), [2, 1]);
  // Any other name has no O-bound side.
  assert.equal(specOf('ácido et ano oico').ester, null);
}); // End of test 'interpreter (R-6a1)…'

test('builder (R-6a1): the =O and the bridge oxygen of each –COO–, the O-bound groups bonded to it; atoms counted for the caps', () => {
  let built = build(specOf('et ano oato met ilo'));
  assert.ok(built.ok);
  assert.deepEqual(oxygenBonds(built.molecule), ['C1 C1', 'C2']);
  assert.equal(aromaticKey(built.molecule), keyOf('CC(=O)OC'));
  const [site] = built.suffixAtoms;
  assert.deepEqual([built.molecule.bonds.get(site.bond).order, built.molecule.bonds.get(site.bridgeBond).order,
    built.molecule.atoms.get(site.bridge).element, site.hydroxy], [2, 1, 'O', undefined]);
  assert.deepEqual(built.esterAtoms.map((o) => [o.group, o.occurrence, o.tiles, o.bridge === site.bridge, o.atoms.length, o.bonds.length,
    built.molecule.bonds.get(o.bond).order]), [[0, 0, [3, 5], true, 1, 0, 1]]);
  // A diester: each O-bound group on its own bridge oxygen, in suffix order.
  built = build(specOf('prop ano di oato et ilo met ilo'));
  assert.equal(aromaticKey(built.molecule), keyOf('CCOC(=O)CC(=O)OC'));
  assert.deepEqual(built.esterAtoms.map((o) => [o.group, o.atoms.length]), [[0, 2], [1, 1]]);
  assert.deepEqual(built.esterAtoms.map((o) => o.bridge), built.suffixAtoms.map((g) => g.bridge));
  assert.equal(aromaticKey(build(specOf('but ano di oato bis START 2 cloro et ilo END')).molecule), keyOf('ClCCOC(=O)CCC(=O)OCCCl'));
  // `carboxilato` and `benzoato`: the –COO–'s carbon outside the ring; a ring on each side.
  built = build(specOf('ciclo hex ano 1 4 di carboxilato di met ilo'));
  assert.equal(aromaticKey(built.molecule), keyOf('COC(=O)C1CCC(C(=O)OC)CC1'));
  assert.ok(built.suffixAtoms.every((g) => built.molecule.atoms.get(g.carbon).element === 'C' && g.bridge !== undefined));
  assert.equal(aromaticKey(build(specOf('benzoato fenil ilo')).molecule), keyOf('O=C(OC1=CC=CC=C1)C1=CC=CC=C1'));
  assert.equal(aromaticKey(build(specOf('et ano oato isopropil ilo')).molecule), keyOf('CC(=O)OC(C)C'));
  // The caps and the rings count the O-bound groups and the bridge oxygens.
  let spec = specOf('but ano di oato di met ilo');
  assert.deepEqual([specCarbons(spec), specAtoms(spec), specRings(spec)], [6, 10, 0]);
  spec = specOf('4 met il benzoato 4 cloro fenil ilo');
  assert.deepEqual([specCarbons(spec), specAtoms(spec), specRings(spec)], [14, 17, 2]);
  const verdict = read('triacont ano di oato di triacont ilo');
  assert.deepEqual([verdict.kind, verdict.errors[0].code, verdict.message], ['invalid', 'TOO_BIG', TOO_MANY_ATOMS_MESSAGE.replace(
    TOO_MANY_ATOMS_MESSAGE, verdict.message)]);
}); // End of test 'builder (R-6a1)…'

test('builder (R-6a1): CARBONYL_POSITION, VALENCE, LOCANT_RANGE and BOND_RANGE for the ester groups, each with its tiles', () => {
  const cases = [
    ['met ano di oato di met ilo', 'CARBONYL_POSITION', [2, 4],
      'La cadena de 1 carbono solo tiene un extremo: lleva un solo grupo COO (metanoato de metilo).'],
    ['but ano tri oato tri met ilo', 'CARBONYL_POSITION', [2, 4],
      'La cadena tiene dos extremos: con «oato» lleva como mucho dos grupos COO, uno en cada extremo (butanodioato de dimetilo).'],
    ['1 cloro prop ano oato met ilo', 'VALENCE', [0, 1],
      'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: el grupo COO de «oato» va en ese carbono.'],
    ['1 cloro benzoato met ilo', 'VALENCE', [0, 1],
      'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el benzoato, ese carbono ya lleva un grupo COO.'],
    ['7 cloro benzoato met ilo', 'LOCANT_RANGE', [0, 1], 'El anillo del benzoato tiene 6 carbonos, del 1 al 6: no hay carbono 7.'],
    ['ciclo hex ano 7 carboxilato met ilo', 'LOCANT_RANGE', [3, 4], 'El anillo de 6 carbonos va del 1 al 6: no hay carbono 7.'],
    ['et ano oato prop ano 5 ilo', 'LOCANT_RANGE', [5, 6], 'El grupo unido al oxígeno tiene 3 carbonos, del 1 al 3: no hay carbono 5.'],
    ['et ano oato 2 cloro met ilo', 'LOCANT_RANGE', [3, 4], 'El grupo unido al oxígeno tiene 1 carbono: no hay carbono 2.'],
    ['et ano oato 1 met il fenil ilo', 'LOCANT_RANGE', [3, 4],
      'En «fenil», el carbono 1 es el que se une al oxígeno: las ramas del fenil van en los carbonos del 2 al 6.'],
    ['et ano oato 1 1 1 tri met il et ilo', 'VALENCE', [10, 11],
      'El carbono 1 del grupo unido al oxígeno tendría 5 enlaces, y un carbono solo puede tener 4.'],
    ['et ano oato prop 3 eno 1 ilo', 'BOND_RANGE', [4, 5],
      'El enlace doble del carbono 3 iría al carbono 4, y el grupo unido al oxígeno solo tiene 3 carbonos.'],
    ['et ano oato START 2 met il isopropil ilo END', 'TILE_ORDER', [7, 8],
      'Esta ficha no puede ir aquí: «isopropil» ya es una rama entera y no lleva números ni ramas propias.'],
  ];
  for (const [words, code, tiles, message] of cases) {
    const verdict = read(words);
    assert.equal(verdict.kind, 'invalid', `${words}: ${verdict.message}`);
    assert.deepEqual([verdict.errors[0].code, [verdict.errors[0].from, verdict.errors[0].to]], [code, tiles], words);
    assert.equal(verdict.message, message, words);
  }
  // `benceno` has no room for seven –COO– groups: they fit nowhere.
  assert.equal(read('benceno hepta carboxilato hepta met ilo').errors[0].code, 'VALENCE');
}); // End of test 'builder (R-6a1): CARBONYL_POSITION…'

// ---------------------------------------------------------------------------
// readName(): verdicts, search, out-of-scope esters.
// ---------------------------------------------------------------------------

/**
 * readName() cases: tile words or a name, the verdict, the engine's name
 * and the SMILES of the molecule drawn (design.md §15.5.3 worked cases for
 * the esters).
 */
const CASES = Object.freeze([
  ['etanoato de metilo', 'correct', 'etanoato de metilo', 'CC(=O)OC'],
  ['metanoato de metilo', 'correct', 'metanoato de metilo', 'O=COC'],
  ['butanodioato de dimetilo', 'correct', 'butanodioato de dimetilo', 'COC(=O)CCC(=O)OC'],
  ['propanodioato de etilo y metilo', 'correct', 'propanodioato de etilo y metilo', 'COC(=O)CC(=O)OCC'],
  ['propanodioato de isopropilo y propilo', 'correct', 'propanodioato de isopropilo y propilo', 'CCCOC(=O)CC(=O)OC(C)C'],
  ['propanodioato de propan-2-ilo y propilo', 'alternative', 'propanodioato de isopropilo y propilo', 'CCCOC(=O)CC(=O)OC(C)C'],
  ['butanodioato de diisopropilo', 'correct', 'butanodioato de diisopropilo', 'CC(C)OC(=O)CCC(=O)OC(C)C'],
  ['butanodioato de di(propan-2-ilo)', 'alternative', 'butanodioato de diisopropilo', 'CC(C)OC(=O)CCC(=O)OC(C)C'],
  ['butanodioato de bis(1-metiletilo)', 'alternative', 'butanodioato de diisopropilo', 'CC(C)OC(=O)CCC(=O)OC(C)C'],
  ['butanodioato de bis(2-cloroetilo)', 'correct', 'butanodioato de bis(2-cloroetilo)', 'ClCCOC(=O)CCC(=O)OCCCl'],
  ['propanodioato de di-tert-butilo', 'correct', 'propanodioato de di-tert-butilo', 'CC(C)(C)OC(=O)CC(=O)OC(C)(C)C'],
  ['etanoato de propan-2-ilo', 'alternative', 'etanoato de isopropilo', 'CC(=O)OC(C)C'],
  ['2-metilpropanoato de tert-butilo', 'correct', '2-metilpropanoato de tert-butilo', 'CC(C)C(=O)OC(C)(C)C'],
  ['etanoato de 2-cloroetilo', 'correct', 'etanoato de 2-cloroetilo', 'CC(=O)OCCCl'],
  ['ciclohexanocarboxilato de etilo', 'correct', 'ciclohexanocarboxilato de etilo', 'CCOC(=O)C1CCCCC1'],
  ['ciclohexano-1,4-dicarboxilato de dimetilo', 'correct', 'ciclohexano-1,4-dicarboxilato de dimetilo', 'COC(=O)C1CCC(C(=O)OC)CC1'],
  ['benzoato de metilo', 'correct', 'benzoato de metilo', 'COC(=O)C1=CC=CC=C1'],
  ['bencenocarboxilato de metilo', 'alternative', 'benzoato de metilo', 'COC(=O)C1=CC=CC=C1'],
  ['4-metilbenzoato de etilo', 'correct', '4-metilbenzoato de etilo', 'CCOC(=O)C1=CC=C(C)C=C1'],
  ['p-metilbenzoato de etilo', 'alternative', '4-metilbenzoato de etilo', 'CCOC(=O)C1=CC=C(C)C=C1'],
  ['etanoato de fenilo', 'correct', 'etanoato de fenilo', 'CC(=O)OC1=CC=CC=C1'],
  ['etanoato de 4-metilfenilo', 'correct', 'etanoato de 4-metilfenilo', 'CC(=O)OC1=CC=C(C)C=C1'],
  ['benzoato de fenilo', 'correct', 'benzoato de fenilo', 'O=C(OC1=CC=CC=C1)C1=CC=CC=C1'],
  ['4-metilbenzoato de 4-clorofenilo', 'correct', '4-metilbenzoato de 4-clorofenilo', 'CC1=CC=C(C=C1)C(=O)OC1=CC=C(Cl)C=C1'],
  ['etanoato de ciclohexilo', 'correct', 'etanoato de ciclohexilo', 'CC(=O)OC1CCCCC1'],
  // Left-out locants (search.js): of the acid part, of the suffix, inside an O-bound group.
  ['met il prop ano oato met ilo', 'missingLocants', '2-metilpropanoato de metilo', 'CC(C)C(=O)OC'],
  ['cloro et ano oato met ilo', 'missingLocants', '2-cloroetanoato de metilo', 'ClCC(=O)OC'],
  ['et ano oato met il oxi met ilo', 'correct', 'etanoato de metoximetilo', 'CC(=O)OCOC'],
  ['4 met il benceno carboxilato et ilo', 'missingLocants', '4-metilbenzoato de etilo', 'CCOC(=O)C1=CC=C(C)C=C1'],
  ['et ano oato met il prop ilo', 'missingLocants', 'etanoato de 2-metilpropilo', 'CC(=O)OCC(C)C'],
  // `otherName`: the molecule the name describes.
  ['4-metilbutanoato de metilo', 'otherName', 'pentanoato de metilo', 'CCCCC(=O)OC'],
  ['2-butenoato de metilo', 'otherName', 'but-2-enoato de metilo', 'CC=CC(=O)OC'],
  ['etanoato de propan-1-ilo', 'otherName', 'etanoato de propilo', 'CC(=O)OCCC'],
  ['propanodioato de metilo y etilo', 'otherName', 'propanodioato de etilo y metilo', 'COC(=O)CC(=O)OCC'],
  ['ciclohexilmetanoato de metilo', 'otherName', 'ciclohexanocarboxilato de metilo', 'COC(=O)C1CCCCC1'],
  ['propano-1-carboxilato de metilo', 'otherName', 'butanoato de metilo', 'CCCC(=O)OC'],
  ['1-metoxipropanal', 'otherName', 'propanoato de metilo', 'CCC(=O)OC'],
]);

test('readName (R-6a1): verdicts and the molecule each name describes, against a SMILES', () => {
  for (const [name, kind, engine, smiles] of CASES) {
    const verdict = read(name);
    assert.equal(verdict.kind, kind, `${name}: ${verdict.message}`);
    assert.equal(verdict.name, engine, name);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${name} builds another graph`);
    assert.equal(verdict.draw, true);
  }
  assert.equal(read('met il prop ano oato met ilo').message, 'Casi: faltan los números. Se escribe «2-metilpropanoato de metilo».');
  assert.equal(read('etanoato de metilo').message, '¡Correcto! También se llama «acetato de metilo» (nombre tradicional, que la IUPAC '
    + '(2013) conserva como preferido).');
  assert.equal(read('2-butenoato de metilo').notes[0], 'Es la forma antigua de escribirlo; hoy se escribe «but-2-enoato de metilo».');
  // The suffix groups and the O-bound groups of the verdict, carried onto the drawn graph.
  const verdict = read('propanodioato de etilo y metilo');
  const { molecule } = verdict;
  assert.deepEqual(verdict.suffixAtoms.map((g) => [molecule.atoms.get(g.attachment).element, molecule.bonds.get(g.bond).order,
    molecule.atoms.get(g.bridge).element, molecule.bonds.get(g.bridgeBond).order]), [['O', 2, 'O', 1], ['O', 2, 'O', 1]]);
  assert.deepEqual(verdict.esterAtoms.map((o) => [o.atoms.length, molecule.bonds.get(o.bond).order, o.atoms.includes(o.attachment)]),
    [[2, 1, true], [1, 1, true]]);
  const bridges = new Set(verdict.suffixAtoms.map((g) => g.bridge));
  assert.ok(verdict.esterAtoms.every((o) => bridges.has(o.bridge)));
  assert.ok(verdict.suffixAtoms.every((g) => verdict.studentParent.atoms.includes(g.parentAtom)));
  assert.deepEqual(read('et ano oato').esterAtoms, []);
}); // End of test 'readName (R-6a1): verdicts…'

test('search (R-6a1): left-out locants give ambiguous lists; the budget gives incomplete; out-of-scope esters', () => {
  const ambiguous = [
    ['met il but ano oato met ilo', 'Faltan números: puede ser 2-metilbutanoato de metilo o 3-metilbutanoato de metilo.'],
    ['ciclo hex ano di carboxilato di met ilo', 'Faltan números: puede ser ciclohexano-1,1-dicarboxilato de dimetilo, '
      + 'ciclohexano-1,2-dicarboxilato de dimetilo, ciclohexano-1,3-dicarboxilato de dimetilo u otra molécula.'],
    ['met il benzoato et ilo', 'Faltan números: puede ser 2-metilbenzoato de etilo, 3-metilbenzoato de etilo o 4-metilbenzoato de '
      + 'etilo.'],
    ['et ano oato cloro et ilo', 'Faltan números: puede ser etanoato de 1-cloroetilo o etanoato de 2-cloroetilo.'],
    ['et ano oato met il fenil ilo', 'Faltan números: puede ser etanoato de 2-metilfenilo, etanoato de 3-metilfenilo o etanoato de '
      + '4-metilfenilo.'],
  ];
  for (const [words, message] of ambiguous) {
    const verdict = read(words);
    assert.deepEqual([verdict.kind, verdict.message], ['ambiguous', message], words);
  }
  assert.equal(read('ciclo dodec ano hexa carboxilato hexa met ilo', { budget: { placements: 1 } }).kind, 'incomplete');
  assert.equal(read('met il ciclo hex ano carboxilato met ilo', { budget: { namings: 1 } }).kind, 'incomplete');
  // The engine's refusals: outOfScope with its message, no drawing.
  const refusals = [
    ['benceno 1 4 di carboxilato di met ilo', /su benceno lleva, además del éster, otro grupo funcional/], // benzene diesters
    ['4 hidroxi benzoato met ilo', /su benceno lleva, además del éster, otro grupo funcional/],
    ['2 met il but ano di oato et ilo met ilo', /grupos distintos unidos al oxígeno, y los dos extremos de la cadena no son iguales/],
    ['ciclo hex ano 1 4 di carboxilato et ilo met ilo', /unidos al anillo con grupos distintos unidos al oxígeno/],
    ['prop ano 1 2 3 tri carboxilato tri met ilo', /más de dos grupos –COO–/], // manyEsters
  ];
  for (const [words, pattern] of refusals) {
    const refused = read(words);
    assert.equal(refused.kind, 'outOfScope', `${words}: ${refused.message}`);
    assert.match(refused.message, /^Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar: /);
    assert.match(refused.message, pattern, words);
    assert.equal(refused.draw, false);
  }
  // Three rings (two on the O-bound side) are the engine's several rings, refused before any search.
  const rings = read('benzoato 4 fenil fenil ilo');
  assert.deepEqual([rings.kind, rings.molecule], ['outOfScope', null]);
}); // End of test 'search (R-6a1)…'

// ---------------------------------------------------------------------------
// Mutations and the diagnosis.
// ---------------------------------------------------------------------------

/**
 * Mutations of ester names (design.md §15.7): tile words, the verdict and
 * the diagnosis code of a rule that holds for an ester's acid part (null:
 * a deliberate «Esters» null, below).
 */
const MUTATIONS = Object.freeze([
  ['4 met il but ano oato met ilo', 'otherName', 'BRANCH_AT_END'],
  ['2 et il prop ano oato met ilo', 'otherName', 'LONGER_CHAIN'],
  ['3 met il but ano di oato di met ilo', 'otherName', 'NUMBERING'],
  ['5 met il ciclo hex ano 1 carboxilato met ilo', 'otherName', 'RING_NUMBERING'],
  ['6 met il benzoato et ilo', 'otherName', 'RING_NUMBERING'],
  ['3 met il 2 cloro but ano oato met ilo', 'otherName', 'ALPHABETICAL_ORDER'],
  ['2 met il 2 met il prop ano oato met ilo', 'otherName', 'UNGROUPED'],
  ['2 2 bis met il prop ano oato met ilo', 'otherName', 'MULTIPLIER_KIND'],
  ['3 2 di met il but ano oato met ilo', 'otherName', 'LOCANT_ORDER'],
  ['2 but eno oato met ilo', 'otherName', 'OLD_STYLE'],
  ['1 4 ciclo hex ano di carboxilato di met ilo', 'otherName', 'OLD_STYLE'],
  ['ciclo hex 1 3 5 tri eno carboxilato met ilo', 'otherName', 'BENZENE_RING'],
  ['2 START 5 met il fenil END et ano oato met ilo', 'otherName', 'BRANCH_RING_NUMBERING'],
  ['2 et ano oil pent ano oato et ilo', 'otherName', 'ACYL_NAME'],
  ['2 et ano oil but ano oato et ilo', 'otherName', 'MORE_SUBSTITUENTS'], // The acetyl's C=O carbon makes a chain as long.
  ['2 START et ano 1 il END hex ano oato met ilo', 'otherName', 'NEEDLESS_LOCANTS'],
  ['p prop ano 2 il benzoato et ilo', 'otherName', 'LETTER_LOCANTS'],
  // Other verdicts.
  ['et ano oato met ilo', 'correct', null],
  ['met il but ano oato met ilo', 'ambiguous', null],
  ['met il prop ano oato met ilo', 'missingLocants', null],
]);

test('mutations (R-6a1): the expected verdict, and the diagnosis of every rule that holds for an ester\'s acid part', () => {
  for (const [words, kind, code] of MUTATIONS) {
    const verdict = read(words);
    assert.equal(verdict.kind, kind, `${words}: ${verdict.message}`);
    if (kind !== 'otherName') {
      continue;
    }
    assert.equal(verdict.diagnosis ? verdict.diagnosis.code : null, code, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(!/undefined|null|NaN|\[object|–OH|–CHO|–COOH|C=O/.test(verdict.diagnosis.message), words);
    const opened = diagnosisExplanation(verdict, explain);
    const { step } = verdict.diagnosis;
    assert.ok(opened.index >= 0 && [step, ...STEP_FALLBACKS[step]].includes(opened.steps[opened.index].id), words);
  } // End of the loop over the mutations
  const messages = {
    '4 met il but ano oato met ilo': 'La rama «metil» está en el extremo de la cadena, así que la alarga: la cadena principal tiene 5 '
      + 'carbonos.',
    '2 et il prop ano oato met ilo': 'Hay una cadena más larga que la tuya: la tuya tiene 3 carbonos y la cadena principal tiene 4.',
    '3 met il but ano di oato di met ilo': 'Hay que numerar la cadena desde el otro extremo: los sustituyentes tienen que llevar los '
      + 'números más bajos (2 en vez de 3).',
    '6 met il benzoato et ilo': 'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: los '
      + 'sustituyentes tienen que llevar los números más bajos (2 en vez de 6).',
    '2 but eno oato met ilo': 'Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, justo delante de «eno» o '
      + '«ino»: «but-2-enoato de metilo».',
    '1 4 ciclo hex ano di carboxilato di met ilo': 'Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, '
      + 'justo delante de «dicarboxilato»: «ciclohexano-1,4-dicarboxilato de dimetilo».',
    'ciclo hex 1 3 5 tri eno carboxilato met ilo': 'Un anillo de 6 carbonos con tres enlaces dobles alternados, uno sí y uno no, es el '
      + 'benceno, y tiene nombre propio: «benceno». Se escribe «benzoato de metilo».',
  };
  for (const [words, message] of Object.entries(messages)) {
    assert.equal(read(words).diagnosis.message, message, words);
  }
}); // End of test 'mutations (R-6a1)…'

/**
 * The category of an ester's own mistake, read independently of
 * diagnose.js from the engine's naming and the student's reading (each a
 * deliberate null of diagnose.js «Esters» until phase I-52a3a, which names
 * all but `oBound`, named since phase I-52a3b): `seniority` —
 * the student's suffix is no –COO– beside the engine's, or the reverse
 * (`1-metoxipropanal`); `count` — another number of –COO– groups; `carbon` —
 * the –COO–'s carbon on the other side of the parent (`propano-1-carboxilato
 * de metilo`, `ciclohexilmetanoato de metilo`); `oBound` — the O-bound side
 * none the engine writes, in any style (`etanoato de propan-1-ilo`,
 * `propanodioato de metilo y etilo`); `numbering` — the same –COO– groups
 * numbered otherwise (N0: `ciclohexano-1,5-dicarboxilato de dimetilo`);
 * `suffix` — the suffix's locants, which the engine leaves out
 * (`ciclohexano-1-carboxilato de metilo`). Null when none applies, or when
 * neither name is an ester's.
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} verdict - Its `otherName` verdict.
 * @returns {string|null} The category.
 */
function esterCategory(ids, verdict) {
  const engine = verdict.naming.structure.suffix;
  const { tree } = parse(ids);
  const mine = interpret(tree).suffix;
  const theirs = Boolean(engine) && engine.kind === 'ester';
  const own = Boolean(mine) && mine.kind === 'ester';
  if (!theirs && !own) {
    return null;
  }
  if (theirs !== own) {
    return 'seniority';
  }
  const groups = verdict.suffixAtoms.filter((g) => g.bridge !== undefined); // A –COO– has its bridge oxygen (build.js).
  if (groups.length !== engine.locants.length) {
    return 'count';
  }
  if (groups.some((g) => g.carbon !== undefined) !== Boolean(engine.outside)) {
    return 'carbon';
  }
  const names = [verdict.naming.name, ...verdict.naming.alternatives.map((alt) => alt.name)];
  const side = (name) => name.slice(name.indexOf(ESTER_LINK) + ESTER_LINK.length);
  if (!names.map(side).includes(side(verdict.text))) {
    return 'oBound';
  }
  const sorted = (list) => [...list].sort((p, q) => p - q).join();
  if (sorted(groups.map((g) => g.parentAtom)) === sorted(engine.locants.map((site) => site.atom))
    && sorted(groups.map((g) => g.locant)) !== sorted(engine.locants.map((site) => site.locant))) {
    return 'numbering';
  }
  if (tree.parent.suffix && tree.parent.suffix.locants.length > 0) {
    const bare = assemble({ ...tree, parent: { ...tree.parent, suffix: { ...tree.parent.suffix, locants: [] } } }).text;
    if (names.includes(bare)) {
      return 'suffix';
    }
  }
  return null;
} // End of function esterCategory()

/**
 * The codes an ester's own mistake gets, by category (esterCategory();
 * diagnose.js «Esters», phase I-52a3a): the –COO– written as two groups
 * (ESTER_GROUP), beside a junior suffix (CARBONYL_SENIORITY) or as an ester
 * prefix (CARBONYL_PREFIX); another number of –COO– groups: written as two
 * groups or as an ester prefix, or the groups of another parent
 * (CARBONYL_PARENT, MORE_CARBONYL_GROUPS); the –COO–'s carbon (ESTER_CARBON);
 * N0 (RING_NUMBERING); the suffix's needless locants (NEEDLESS_LOCANTS);
 * and since phase I-52a3b the O-bound side (oBoundChecks()): a retained
 * word with the group in another style (ESTER_TRADITIONAL), a group's ring
 * numbering or chain (BRANCH_RING_NUMBERING, ESTER_ALKYL_CHAIN), the side's
 * order, grouping and multiplier (ALPHABETICAL_ORDER, UNGROUPED,
 * MULTIPLIER_KIND), a group's needless locants (NEEDLESS_LOCANTS) or other
 * words (ESTER_ALKYL_NAME).
 */
const CATEGORY_CODES = Object.freeze({
  seniority: ['ESTER_GROUP', 'CARBONYL_SENIORITY', 'CARBONYL_PREFIX'],
  count: ['ESTER_GROUP', 'CARBONYL_PREFIX', 'CARBONYL_PARENT', 'MORE_CARBONYL_GROUPS'],
  carbon: ['ESTER_CARBON'],
  oBound: ['ESTER_TRADITIONAL', 'BRANCH_RING_NUMBERING', 'ESTER_ALKYL_CHAIN', 'ALPHABETICAL_ORDER', 'UNGROUPED', 'MULTIPLIER_KIND',
    'NEEDLESS_LOCANTS', 'ESTER_ALKYL_NAME'],
  numbering: ['RING_NUMBERING'],
  suffix: ['NEEDLESS_LOCANTS'],
});

test('the former deliberate «Esters» nulls of R-6a1 (diagnose.js): each category but `oBound` has its I-52a3a code, step and words', () => {
  const cases = [
    // [tile words, category, code, the step «Ver el paso» opens, a phrase of the message]
    ['1 met il oxi prop ano al', 'seniority', 'ESTER_GROUP', 'group', 'juntos forman un solo grupo, el –COO– de los ésteres'],
    ['1 met il oxi 1 oxo prop ano', 'seniority', 'ESTER_GROUP', 'group', 'su C=O no es un aldehído ni una cetona'],
    ['3 met il oxi 3 oxo prop ano 1 ol', 'seniority', 'ESTER_GROUP', 'group', 'Se escribe «3-hidroxipropanoato de metilo»'],
    ['4 met il oxi 4 oxo but ano oato met ilo', 'count', 'ESTER_GROUP', 'group', 'los de la cadena principal se nombran todos juntos'],
    ['prop ano 1 carboxilato met ilo', 'carbon', 'ESTER_CARBON', 'group', 'solo se usa cuando el grupo –COO– está unido a un anillo'],
    ['ciclo hex il met ano oato met ilo', 'carbon', 'ESTER_CARBON', 'group', 'su carbono no forma parte del anillo'],
    ['fenil met ano oato met ilo', 'carbon', 'ESTER_CARBON', 'group', '«benzoato» (el benceno con un grupo –COO–)'],
    ['ciclo hex ano 1 5 di carboxilato di met ilo', 'numbering', 'RING_NUMBERING', 'ringNumbering', 'los grupos –COO– (el grupo '
      + 'principal)'],
    ['ciclo hex ano 2 carboxilato met ilo', 'numbering', 'RING_NUMBERING', 'ringNumbering', 'ese número ni siquiera se escribe'],
    ['ciclo hex ano 1 carboxilato met ilo', 'suffix', 'NEEDLESS_LOCANTS', 'ringNumbering', 'de colocar el grupo –COO–'],
    ['benceno 1 carboxilato met ilo', 'suffix', 'NEEDLESS_LOCANTS', 'assemble', 'de colocar el grupo –COO–'],
  ];
  for (const [words, category, code, opened, phrase] of cases) {
    const ids = seq(words);
    const verdict = readName(ids);
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    assert.equal(verdict.naming.structure.suffix.kind, 'ester', words);
    assert.equal(esterCategory(ids, verdict), category, words);
    const d = verdict.diagnosis;
    assert.ok(d, `${words}: no diagnosis`);
    assert.equal(d.code, code, `${words}: ${d.message}`);
    assert.ok(CATEGORY_CODES[category].includes(d.code), words);
    assert.ok(d.message.includes(phrase), `${words}: ${d.message}`);
    assert.ok(!/undefined|null|NaN|\[object|–OH|–COOH|grupo –CHO/.test(d.message), `${words}: ${d.message}`);
    const explanation = diagnosisExplanation(verdict, explain);
    assert.equal(explanation.steps[explanation.index].id, opened, `${words}: the step «Ver el paso» opens`);
    assert.ok(verdict.draw && verdict.molecule, words);
  } // End of the loop over the former deliberate nulls
}); // End of test 'the former deliberate «Esters» nulls of R-6a1…'

/**
 * The former deliberate «Esters» `oBound` nulls of R-6a1 (diagnose.js), named since phase I-52a3b: [tile words, the code, the step
 * «Ver el paso» opens, the tiles, the message].
 */
const FORMER_OBOUND_NULLS = Object.freeze([
  ['et ano oato prop ano 1 ilo', 'NEEDLESS_LOCANTS', 'ester', [5, 6], 'Sobran números en el nombre del grupo unido al oxígeno: se '
    + 'escribe «propilo», no «propan-1-ilo».'],
  ['et ano oato met ano 1 ilo', 'NEEDLESS_LOCANTS', 'ester', [5, 6], 'Sobran números en el nombre del grupo unido al oxígeno: se '
    + 'escribe «metilo», no «metan-1-ilo».'],
  ['prop ano di oato met ilo et ilo', 'ALPHABETICAL_ORDER', 'diester', [4, 8], 'Los grupos unidos a los oxígenos se escriben por '
    + 'orden alfabético, unidos por «y»: «etilo» va antes que «metilo» (e antes que m). Se escribe «etilo y metilo», no «metilo y '
    + 'etilo».'],
  ['but ano di oato met ilo met ilo', 'UNGROUPED', 'diester', [4, 8], 'Los grupos iguales unidos a los oxígenos se escriben una sola '
    + 'vez, con «di», «tri»… delante: «dimetilo», no «metilo y metilo».'],
  ['but ano di oato di START 2 cloro et ilo END', 'MULTIPLIER_KIND', 'diester', [4, 5], 'Delante de un grupo que tiene sus propios '
    + 'sustituyentes se usa «bis», «tris»…: «bis(2-cloroetilo)», no «di(2-cloroetilo)».'],
  ['but ano di oato bis met ilo', 'MULTIPLIER_KIND', 'diester', [4, 5], '«bis», «tris»… solo van delante de grupos que tienen sus '
    + 'propios sustituyentes; aquí va «di», «tri»…: «dimetilo», no «bismetilo».'],
  ['et ano oato but ano 3 ilo', 'ESTER_ALKYL_CHAIN', 'ester', [3, 7], 'La cadena del grupo unido al oxígeno se numera para que el '
    + 'carbono unido al oxígeno lleve el número más bajo posible: «butan-2-ilo», no «butan-3-ilo».'],
  ['et ano oato 6 met il fenil ilo', 'BRANCH_RING_NUMBERING', 'ester', [3, 8], 'Un anillo unido al oxígeno se numera empezando por el '
    + 'carbono unido al oxígeno, que es el 1, y siguiendo en el sentido que da los números más bajos a sus sustituyentes: '
    + '«2-metilfenilo», no «6-metilfenilo».'],
]);

test('the former deliberate «Esters» nulls of R-6a1 (diagnose.js): an O-bound side the engine does not write, with its I-52a3b code', () => {
  for (const [words, code, opened, tiles, message] of FORMER_OBOUND_NULLS) {
    const ids = seq(words);
    const verdict = readName(ids);
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    assert.equal(verdict.naming.structure.suffix.kind, 'ester', words);
    assert.equal(esterCategory(ids, verdict), 'oBound', words);
    const d = verdict.diagnosis;
    assert.ok(d, `${words}: no diagnosis`);
    assert.deepEqual([d.code, d.traceRule, d.message], [code, null, message], words);
    assert.ok(CATEGORY_CODES.oBound.includes(code), words);
    assert.deepEqual(d.tiles, tiles, `${words}: tiles`);
    // The focus: the O-bound groups the message is about; the student's chain is the acid part's, the engine's parent.
    assert.ok(d.focus.atoms.length > 0 && d.focus.atoms.every((id) => !d.parent.atoms.includes(id)), words);
    assert.deepEqual(d.student, d.parent, `${words}: the acid part is right`);
    const explanation = diagnosisExplanation(verdict, explain);
    const step = explanation.steps[explanation.index];
    assert.equal(step.id, opened, `${words}: the step «Ver el paso» opens`);
    assert.match(step.text.join(' '), /acabado en «-ilo»/, `${words}: the step names the O-bound group`);
    assert.ok(verdict.draw && verdict.molecule, words);
  } // End of the loop over the former deliberate nulls
  // The O-bound checks come right after the principal –COO– group's own, before the acid part's rules (the explanation separates
  // the two parts before it looks for the chain); with the O-bound side the engine's, the acid part's rule speaks.
  assert.equal(read('4 met il but ano oato prop ano 1 ilo').diagnosis.code, 'NEEDLESS_LOCANTS');
  assert.equal(read('4 met il but ano oato prop ilo').diagnosis.code, 'BRANCH_AT_END');
  assert.equal(read('4 met il but ano oato prop ano 2 ilo').diagnosis.code, 'BRANCH_AT_END', 'the pin style of the O-bound group');
  // Another number of –COO– groups is the mistake, not the O-bound side that follows from it (R-6a3a); the –COO–'s carbon on the
  // other side of the parent comes first too (esterChecks()).
  assert.equal(read('4 met il oxi 4 oxo but ano oato met ilo').diagnosis.code, 'ESTER_GROUP');
  assert.equal(read('prop ano 1 carboxilato prop ano 1 ilo').diagnosis.code, 'ESTER_CARBON');
  // A group the engine names with a retained word, written in a style it does not offer for it: the general message.
  assert.equal(read('et ano oato 1 1 di met il et ilo').diagnosis.message, 'El grupo unido al oxígeno se nombra como una rama, pero '
    + 'como palabra suelta y acabado en «-ilo»: aquí, «tert-butilo», no «1,1-dimetiletilo».');
  // The side's order read without `tert-`, with its hint when the student's order is right counting it.
  assert.equal(read('prop ano di oato tert-butil ilo et ilo').kind, 'correct');
  assert.ok(read('prop ano di oato et ilo tert-butil ilo').diagnosis.message.endsWith('«tert-butilo» va antes que «etilo» (b antes que '
    + 'e). «tert-» no cuenta para el orden. Se escribe «tert-butilo y etilo», no «etilo y tert-butilo».'));
}); // End of test 'the former deliberate «Esters» nulls of R-6a1: an O-bound side…'

// ---------------------------------------------------------------------------
// Fixture round trip and closed loop (design.md §15.7).
// ---------------------------------------------------------------------------

test('fixture round trip (R-6a1, R-6a2a): every ester name the tiles write, graph compared with the SMILES; later names never tokenize', async () => {
  const fixtures = await readFixtures();
  const rows = fixtures.filter((row) => row.names[0].includes(ESTER_WORD));
  let covered = 0;
  let templates = 0;
  let later = 0;
  let nitrogen = 0;
  let elapsed = 0;
  const readRows = new Set();
  for (const row of rows) {
    if (!isEster(row.smiles)) {
      nitrogen += 1; // An amine, a nitrile or an amide beside the ester (R-6b…R-6d).
      assert.ok(/N/.test(row.smiles), `names.tsv:${row.line}`);
      row.names.forEach((name) => assert.equal(tokenize(name), null, `names.tsv:${row.line}: ${name} reads before its phase`));
      continue;
    }
    const expected = keyOf(row.smiles);
    for (const name of row.names) {
      if (!isEsterName(name)) {
        later += 1; // An ester prefix (read since R-6a2b, beside an acid): none among the esters' own rows.
        assert.ok(ESTER_PREFIX.test(name), name);
        assert.equal(tokenize(name), null, `names.tsv:${row.line}: ${name} reads before its phase`);
        continue;
      }
      templates += isEsterTemplateName(name) ? 1 : 0; // `formiato`, `acetato`, `fenilacetato` (R-6a2a).
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
   * @param {string} id - The section's phase id (`I-35`…).
   * @returns {number} The count.
   */
  const inSection = (id) => [...readRows].filter((row) => /\((I-\d+[a-z]?)[),:]/.exec(row.section)[1] === id).length; // Its own id only.
  assert.equal(rows.length, EXPECTED_ROWS.total);
  assert.equal(readRows.size, EXPECTED_ROWS.read);
  assert.equal(nitrogen, EXPECTED_ROWS.nitrogen);
  assert.deepEqual(['I-35', 'I-39b', 'I-39c', 'I-40d', 'I-45c'].map(inSection),
    [EXPECTED_ROWS.i35, EXPECTED_ROWS.i39b, EXPECTED_ROWS.i39c, EXPECTED_ROWS.i40d, EXPECTED_ROWS.i45c]);
  assert.equal(covered, EXPECTED_NAMES);
  assert.equal(templates, EXPECTED_TEMPLATE_NAMES);
  assert.equal(later, EXPECTED_LATER_NAMES);
  assert.ok(elapsed / covered < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / covered).toFixed(2)} ms on average`);
}); // End of test 'fixture round trip (R-6a1)…'

/** The closed loop's generators (scripts/oracle/generate.mjs; design.md §15.7), ester molecules only. */
const LOOP = Object.freeze({
  esters: Object.freeze({ count: 500, seed: 6101, maxSize: 12 }),
  prefixes: Object.freeze({ count: 400, seed: 6102, maxSize: 12 }),
  ringEsters: Object.freeze({ count: 400, seed: 6103, maxSize: 12 }),
  substituted: Object.freeze({ count: 300, seed: 6104, maxSize: 12 }),
});

/**
 * Minimum coverage of the closed loop: ester molecules (distinct by aromatic
 * key), names read back, the forms among them (names with `oato` but not
 * `benzoato`, `carboxilato`, `benzoato`, diesters with ` y ` or a
 * multiplied O-bound side, and since phase R-6a2a the retained `formiato`,
 * `acetato` and `fenilacetato` names, until then left out), removed-locant
 * mutations and decisive verdicts among them (the seeds give 1184, 1716, 951,
 * 333, 245, 48, 52, 187, 2305 and 2305; no name is left for later).
 */
const LOOP_MIN = Object.freeze({
  molecules: 1170, names: 1700, oato: 940, carboxilato: 325, benzoato: 240, join: 45, multiplied: 50, templates: 185, removed: 2280,
  decisive: 2280,
});

/**
 * The closed loop's molecules: the esters of the generators, distinct by
 * aromatic key, that the engine names.
 *
 * @returns {object[]} The molecules.
 */
function loopMolecules() {
  const seen = new Set();
  const molecules = [];
  const all = [...generateEsters(LOOP.esters), ...generateEsterPrefixes(LOOP.prefixes), ...generateRingEsters(LOOP.ringEsters),
    ...generateSubstitutedEsters(LOOP.substituted)];
  for (const mol of all.filter(isEsterMolecule)) {
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
 * segment's and the suffix's, at any depth — never a free-valence locant —,
 * the O-bound side's too (R-6a1).
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
  (tree.ester ? tree.ester.items : []).forEach(visitItem);
  return lists;
} // End of function locantLists()

test('closed loop over the ester generators: engine name → tiles → readName() → the same graph, then without each locant list', () => {
  const molecules = loopMolecules();
  const counts = { names: 0, oato: 0, carboxilato: 0, benzoato: 0, join: 0, multiplied: 0, templates: 0, removed: 0, decisive: 0 };
  const later = [];
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    const key = aromaticKey(mol);
    const all = [naming.name, ...naming.alternatives.map((alt) => alt.name)];
    for (const [i, name] of all.entries()) {
      if (!isEsterName(name)) {
        later.push(name); // None since phase R-6a2a (the generators write no ester prefix beside an ester).
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
      counts.oato += /[^z]oato de /.test(name) ? 1 : 0;
      counts.carboxilato += /carboxilato de /.test(name) ? 1 : 0;
      counts.benzoato += /benzoato de /.test(name) ? 1 : 0;
      counts.join += name.includes(ESTER_ALKYL_JOIN) ? 1 : 0;
      counts.multiplied += / de (?:di|bis)/.test(name) ? 1 : 0;
      counts.templates += isEsterTemplateName(name) ? 1 : 0; // `acetato de etilo` (R-6a2a)
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
}); // End of test 'closed loop over the ester generators…'

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
  // A chain with `oato` keeps its –COO– at carbon 1: renumbered from the other end, its prefixes move, so the name describes
  // another molecule, whose chain the trace may choose otherwise.
  shifted: ['NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS'],
  reflected: ['RING_NUMBERING'],
  rotated: ['RING_NUMBERING'],
  swapped: ['NUMBERING', 'RING_NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS',
    'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS'],
  unsorted: ['ALPHABETICAL_ORDER'],
  ungrouped: ['UNGROUPED'],
  diBis: ['MULTIPLIER_KIND'],
  toEnd: ['BRANCH_AT_END', 'NUMBERING'],
  heteroToEnd: ['NUMBERING', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS'],
  removed: [],
  added: ['NEEDLESS_LOCANTS', 'NUMBERING', 'RING_NUMBERING'],
  groupsSwapped: ['ALPHABETICAL_ORDER'], // R-6a3b: two different O-bound groups in the other order (a deliberate null until then).
});

/**
 * The mutations of one ester name: those of its acid part, as for an acid
 * (renumbered — on a chain with `oato`, whose –COO– stays at carbon 1,
 * `shifted`; reflected and rotated on a ring, the suffix's locants too —,
 * locants swapped between two prefixes, prefixes in reverse order, identical
 * prefixes written one by one, di ↔ bis, a single-locant prefix moved to an
 * end of a chain, a prefix's locants removed, or added where it has none),
 * and of its O-bound side: two different groups in the other order
 * (`groupsSwapped`, never the engine's).
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
  const terminal = isTerminalSuffix(tiles, tree.parent.suffix); // `oato`: its –COO– stays at carbon 1.
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
  const { groups } = esterGroupsOf(tiles, tree.ester.items);
  if (groups.length === 2) {
    const slices = groups.map((g) => ids.slice((g.items[0] || g.end).range[0], g.end.range[1]));
    push('groupsSwapped', [...ids.slice(0, tree.ester.range[0]), ...slices[1], ...slices[0]]);
  }
  return out;
} // End of function mutationsOf()

/**
 * Reads every mutation of some ester names: every `otherName` carries a
 * diagnosis of its family's codes whose step resolves in its explanation; a
 * null is unexpected (the deliberate «Esters» `oBound` nulls are named since
 * phase I-52a3b). The ester's own mistakes diagnosed since phase I-52a3a are
 * counted by category (esterCategory()), each with a code of its category
 * (CATEGORY_CODES) and, for `numbering`, the trace rule N0 and the –COO–
 * groups' words; for `oBound`, the step that names the O-bound groups.
 *
 * @param {string[]} names - Ester names (engine names or alternatives).
 * @returns {{otherName: Object<string, number>, codes: Set<string>, nulls: Object<string, number>, own: Object<string, number>,
 *   unexpected: string[]}} `otherName` counts by family, the codes seen, the deliberate nulls by category, the ester's own
 *   mistakes diagnosed by category and the unexpected nulls.
 */
function sweep(names) {
  const otherName = Object.fromEntries(Object.keys(FAMILY_CODES).map((family) => [family, 0]));
  const codes = new Set();
  const nulls = {};
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
      const category = esterCategory(mutation.ids, verdict);
      if (!d) {
        unexpected.push(`${label}${category ? ` (${category})` : ''}`);
        continue;
      }
      codes.add(d.code);
      if (category) {
        own[category] = (own[category] || 0) + 1;
        assert.ok(CATEGORY_CODES[category].includes(d.code), `${label}: ${category}, ${d.code}`);
        assert.ok(category !== 'numbering' || (d.traceRule === 'N0' && d.message.includes('los grupos –COO–')), `${label}: ${d.message}`);
        assert.ok(category !== 'oBound' || ['ester', 'diester'].includes(d.step), `${label}: ${d.step}`);
      }
      assert.ok(FAMILY_CODES[mutation.family].includes(d.code), `${label}: ${d.code}, ${d.message}`);
      assert.ok(!/undefined|null|NaN|\[object|–OH|–CHO|–COOH|C=O/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), label);
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return { otherName, codes, nulls, own, unexpected };
} // End of function sweep()

/**
 * How many mutations of the ester fixture names of phase R-6a1 (the 145 the
 * tiles write, the retained names of phase R-6a2a swept apart in
 * reverse-ester-templates.test.js) give `otherName`, by family (155), and the
 * ester's own mistakes among them by category, every one diagnosed with one of
 * its family's codes: 90 `numbering`, a ring ester's –COO– groups numbered
 * otherwise by a rotation or a reflection (`2-metilciclohexano-1-carboxilato`
 * rotated to `3-metilciclohexano-2-…`), deliberate nulls until phase I-52a3a,
 * now RING_NUMBERING at N0; 4 `oBound`, two different O-bound groups in the
 * other order (`propanodioato de metilo y etilo`), deliberate nulls until
 * phase I-52a3b, now ALPHABETICAL_ORDER on the O-bound side. Removing or
 * adding locants never gives `otherName`.
 */
const FIXTURE_OTHER_NAME = Object.freeze({
  reversed: 0, shifted: 4, reflected: 11, rotated: 113, swapped: 2, unsorted: 6, ungrouped: 3, diBis: 3, toEnd: 9, heteroToEnd: 0,
  removed: 0, added: 0, groupsSwapped: 4,
});
const FIXTURE_NULLS = Object.freeze({});
const FIXTURE_OWN = Object.freeze({ oBound: 4, numbering: 90 });

test('mutations of every ester fixture name: a diagnosis of the family\'s codes, or a deliberate «Esters» null with its category', async () => {
  const names = (await readFixtures()).filter((row) => isEster(row.smiles)).flatMap((row) => row.names)
    .filter((name) => isEsterName(name) && !isEsterTemplateName(name));
  assert.equal(names.length, EXPECTED_NAMES - EXPECTED_TEMPLATE_NAMES);
  const { otherName, codes, nulls, own, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  assert.deepEqual(otherName, { ...FIXTURE_OTHER_NAME });
  assert.deepEqual([nulls, own], [{ ...FIXTURE_NULLS }, { ...FIXTURE_OWN }]);
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_SUBSTITUENTS', 'MULTIPLIER_KIND',
    'NUMBERING', 'RING_NUMBERING', 'UNGROUPED']);
}); // End of test 'mutations of every ester fixture name…'

test('mutations of the generated esters: every otherName is diagnosed or a deliberate «Esters» null, every step resolves', () => {
  const names = [];
  for (const mol of loopMolecules().filter((_, i) => i % 3 === 0)) { // Every generator's esters: chains, diesters, rings, benzenes.
    const naming = nameMolecule(mol);
    // The names of phase R-6a1; the retained names (R-6a2a) are swept apart (reverse-ester-templates.test.js).
    names.push(...[naming.name, ...naming.alternatives.map((alt) => alt.name)].filter((name) => isEsterName(name)
      && !isEsterTemplateName(name)));
  }
  assert.ok(names.length >= 500, `${names.length} names`); // The seeds give 507.
  const { otherName, codes, nulls, own, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  const total = Object.values(otherName).reduce((sum, count) => sum + count, 0);
  // The seeds give 1040, every one diagnosed. Until phase I-52a3a 384 were `numbering` nulls (a ring ester's –COO– groups
  // numbered otherwise by a rotation or a reflection), now RING_NUMBERING at N0; until phase I-52a3b 23 were `oBound` nulls (two
  // different O-bound groups in the other order), now ALPHABETICAL_ORDER on the O-bound side.
  assert.deepEqual([total, nulls, own], [1040, {}, { oBound: 23, numbering: 384 }]);
  assert.deepEqual([otherName.removed, otherName.added], [0, 0]);
  for (const code of ['NUMBERING', 'RING_NUMBERING', 'ALPHABETICAL_ORDER', 'UNGROUPED', 'MULTIPLIER_KIND', 'BRANCH_AT_END']) {
    assert.ok(codes.has(code), `${code}: ${[...codes]}`);
  }
}); // End of test 'mutations of the generated esters…'

// ---------------------------------------------------------------------------
// The drawing, the dialog, robustness and time.
// ---------------------------------------------------------------------------

test('«Dibujar» (R-6a1): ester verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const name of ['etanoato de metilo', 'butanodioato de dimetilo', 'propanodioato de etilo y metilo', 'butanodioato de '
    + 'bis(2-cloroetilo)', 'ciclohexanocarboxilato de etilo', 'ciclohexano-1,4-dicarboxilato de dimetilo', 'benzoato de metilo',
  '4-metilbenzoato de etilo', 'etanoato de fenilo', 'benzoato de fenilo', '2-butenoato de metilo', 'etanoato de propan-1-ilo']) {
    const verdict = read(name);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-6a1)…'

test('dialog (R-6a1): the ester tiles have tooltips', () => {
  for (const id of [OATO_ID, CARBOXYLATE_ID, BENZOATE_ID, ESTER_ALKYL_ID]) {
    assert.ok(TILE_HINTS[id] && TILE_HINTS[id].endsWith('.'), id);
  }
  assert.match(TILE_HINTS[OATO_ID], /etanoato de metilo; con dos, butanodioato de dimetilo/);
  assert.match(TILE_HINTS[OATO_ID], /el «de» lo pone la app/);
  assert.match(TILE_HINTS[CARBOXYLATE_ID], /ciclohexanocarboxilato de etilo/);
  assert.match(TILE_HINTS[ESTER_ALKYL_ID], /en lugar de «il»: met e ilo dan metilo/);
  assert.match(TILE_HINTS[ESTER_ALKYL_ID], /propanodioato de etilo y metilo/);
  assert.equal(TILE_HINTS[BENZOATE_ID], 'Benceno con un grupo COO: bencenocarboxilato. Detrás va el grupo unido al oxígeno: benzoato de '
    + 'metilo.');
  assert.deepEqual([OATO_ID, CARBOXYLATE_ID, BENZOATE_ID, ESTER_ALKYL_ID].map((id) => tileById(id).text),
    ['oato', 'carboxilato', 'benzoato', 'ilo']);
}); // End of test 'dialog (R-6a1)…'

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

test('property (R-6a1): random ester names — any acid part, O-bound groups, locants or none — never crash', () => {
  const random = mulberry32(20261016);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const branches = ['met il', 'cloro', 'hidroxi', 'oxo', 'met il oxi', 'fenil', 'ciclo hex il', 'acetil'];
  const parents = ['met ano oato', 'et ano oato', 'but ano di oato', 'pent ano oato', 'prop 2 eno oato', 'ciclo hex ano carboxilato',
    'ciclo hex ano 1 4 di carboxilato', 'benceno carboxilato', 'benzoato', 'prop ano di oato', 'but ano al', 'et ano'];
  const groups = ['met ilo', 'et ilo', 'isopropil ilo', 'tert-butil ilo', 'fenil ilo', 'prop ano 2 ilo', 'ciclo hex ilo', '2 cloro et ilo',
    'cloro et ilo', 'di met ilo', 'bis START 2 cloro et ilo END', 'met il fenil ilo', 'met il'];
  const multipliers = { 1: '', 2: 'di', 3: 'tri' };
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const prefixes = Array.from({ length: int(0, 2) }, () => {
      const count = int(1, 3);
      const located = random() < 0.6;
      const locants = located ? Array.from({ length: count }, () => int(1, 6)).join(' ') : '';
      return [locants, multipliers[count], pick(branches)].join(' ');
    });
    const words = [...prefixes, pick(parents), ...Array.from({ length: int(0, 2) }, () => pick(groups))].join(' ');
    const verdict = readName(seq(words), { budget: { ms: 200 } });
    kinds.set(verdict.kind, (kinds.get(verdict.kind) || 0) + 1);
    if (verdict.draw) {
      assert.ok(verdict.molecule && verdict.name, words);
    } else {
      assert.equal(verdict.molecule === null || verdict.kind === 'outOfScope', true, words);
    }
    if (verdict.kind === 'otherName' && verdict.diagnosis) {
      assert.ok(!/undefined|null|NaN|\[object|–OH|–COOH/.test(verdict.diagnosis.message), `${words}: ${verdict.diagnosis.message}`);
    }
  } // End of the loop over the random names
  for (const kind of ['correct', 'otherName', 'ambiguous', 'invalid']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-6a1): random ester names…'

test('partial names (R-6a1): every start of an ester\'s tiles reads as a verdict, an error with its tiles when unfinished', () => {
  const kinds = new Set();
  for (const words of ['but ano di oato bis START 2 cloro et ilo END', 'prop ano di oato 1 met il et ilo prop ilo',
    '4 met il benzoato 4 cloro fenil ilo', 'et ano oato 2 START 4 met il fenil END et ilo', 'ciclo hex ano 1 4 di carboxilato di met ilo',
    'but ano di oato di prop ano 2 ilo', 'et ano oato ciclo hex 2 eno 1 ilo']) {
    const ids = seq(words);
    for (let k = 1; k <= ids.length; k += 1) {
      const verdict = readName(ids.slice(0, k));
      kinds.add(verdict.kind);
      if (verdict.kind === 'invalid') {
        assert.ok(verdict.errors.length > 0 && verdict.errors.every((e) => e.from <= e.to && e.to <= k), `${words} [${k}]`);
      }
    } // End of the loop over the starts of a name
  } // End of the loop over the names
  assert.ok(kinds.has('invalid') && kinds.has('correct'), [...kinds].join());
  // Numbers or a multiplier with nothing after them in the O-bound side.
  for (const words of ['et ano oato 2', 'et ano oato di', 'et ano oato met ilo 2', 'et ano oato bis']) {
    assert.deepEqual(readName(seq(words)).errors.map((e) => e.code), ['TILE_ORDER'], words);
  }
  assert.equal(messageOf('et ano oato 2'), 'Esta ficha no puede ir aquí: detrás de los números y de «di», «tri»… va el grupo unido al '
    + 'oxígeno, o una rama suya, y el grupo acaba en «ilo»: etanoato de 2-cloroetilo, butanodioato de dimetilo.');
}); // End of test 'partial names (R-6a1)…'

test('time budget: ester readName() calls, with their diagnosis, well within budget', () => {
  const names = ['butanodioato de dimetilo', 'propanodioato de etilo y metilo', 'ciclohexano-1,4-dicarboxilato de dimetilo',
    '4-metilbenzoato de 4-clorofenilo', 'butanodioato de bis(2-cloroetilo)', '2-butenoato de metilo', 'met il but ano oato met ilo',
    'met il ciclo hex ano carboxilato met ilo', 'di met il benzoato et ilo', '3 met il but ano di oato di met ilo',
    'et ano oato met il fenil ilo'];
  names.forEach((name) => read(name)); // Warm-up.
  for (const name of names) {
    const start = performance.now();
    const verdict = read(name);
    const ms = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', name);
    assert.ok(ms < PER_NAME_BUDGET_MS, `${name}: ${ms.toFixed(1)} ms`);
  }
}); // End of test 'time budget…'
