/**
 * @file Unit tests for the amides in «¿Cómo se dibuja?» (src/reverse/,
 * design.md §15.5.2, §15.5.3, §15.7, §15.8 R-6d; phase I-52d1, R-6d1): the
 * «Grupos» row's suffixes `amida` (the –CONH₂ at the ends of a chain by
 * rule, its carbon the chain's end carbon, no locants: `etanamida`,
 * `butanodiamida`, `prop-2-enamida`) and `carboxamida` (the –CONH₂'s carbon
 * outside a ring: `ciclohexanocarboxamida`, `ciclohexano-1,4-dicarboxamida`),
 * the «Anillos» row's `benzamida` (`4-metilbenzamida`, `p-metilbenzamida`),
 * and the «Números» row's locant `N` on the amide's nitrogen
 * (`N-metiletanamida`, `N,N-dimetilbenzamida`, `N,2-dimetilpropanamida`).
 * Parser (the suffix node, `N` kept to an amide's name-level prefixes, the
 * misplaced tiles with their tile ranges and hints, TEMPLATE_LOCANTS and
 * POSITIONAL on `benzamida`), assembler (every form checked against the
 * forward engine's own text), tokenizer (`carbamoil` and the acylamino
 * prefixes read since R-6d2, swept in reverse-amide-prefixes.test.js; the
 * retained `formamida`, `acetamida`, `ftalamida` since R-6d3, swept in
 * reverse-amide-templates.test.js), interpreter (the amide SuffixSpec, the
 * `N` slots and their domain), builder (the =O and the nitrogen on each
 * –CONH₂'s carbon, the groups written `N` on that nitrogen, VALENCE on a
 * third group, CARBONYL_POSITION, the caps), search (left-out locants, `N`
 * included: missingLocants, ambiguous, incomplete), readName() verdicts with
 * the molecule each describes (compared by aromatic key with a SMILES), the
 * engine's refusals (`substitutedPolyamide`, `manyAmides`, an imide, two
 * rings, a halogen or an oxygen on the nitrogen), mutations and their
 * diagnosis (the rules that hold for an amide name; the amide's own mistakes,
 * deliberate nulls of diagnose.js «Amides» until phase I-52d4, each with its
 * category read independently), the fixture round trip over every row with
 * an amide group of tests/fixtures/names.tsv and the closed loop over the
 * oracle's amide generators (pure imports, no Java), the diagnosis sweeps
 * with exact counts, the ordered drawing, the dialog's tooltips, robustness
 * and time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build, specAtoms } from '../../src/reverse/build.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { slotGroups } from '../../src/reverse/search.js';
import { AMIDA_ID, CARBOXAMIDE_ID, BENZAMIDE_ID, NITROGEN_ID, N_VALUE } from '../../src/reverse/tiles.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { TILE_HINTS } from '../../src/ui/name-builder.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import {
  generateAmides, generateAmidePrefixes, generateRingNitrilesAmides, generateRingOutsideBenzenes, generateRingPolysuffixBenzenes,
  generateSubstitutedPhenyls, generateSubstitutedBenzoyls, generateCyano,
} from '../../scripts/oracle/generate.mjs';
import {
  seq, readFixtures, isAmide, isAmideMolecule, isAmideName, isLaterAmideName, isR6d1AmideName, isR6d2AmideName, LATER_AMIDE_WORDS,
  isAmideTemplateName, AMIDE_TEMPLATE_WORDS,
} from './reverse-words.js';

/** Average time budget of one readName() call over the fixture round trip, in milliseconds (phones are slower). */
const AVERAGE_BUDGET_MS = 50;

/** Time budget of one representative readName() call, in milliseconds. */
const PER_NAME_BUDGET_MS = 250;

/**
 * Fixture rows with an amide group (isAmide(): a C=O carbon single-bonded to
 * a nitrogen): 106, all of which the tiles read since phase R-6d2 (71 in
 * R-6d1: every row whose amide is the principal group, written with `amida`,
 * `carboxamida` or `benzamida`, and the amide prefixes written `amino` +
 * `oxo` beside a senior group, phase R-6c2, swept in reverse-amino.test.js;
 * the other 35 with `carbamoil` or an acylamino prefix, R-6d2, swept in
 * reverse-amide-prefixes.test.js), by section: I-37 26, I-39a 3, I-39b 1,
 * I-39d 35, I-40c 26, I-40d 2, I-43b 6, I-44 2, I-45a 2, I-45b 3.
 */
const EXPECTED_ROWS = Object.freeze({
  total: 106, read: 106, i37: 26, i39a: 3, i39b: 1, i39d: 35, i40c: 26, i40d: 2, i43b: 6, i44: 2, i45a: 2, i45b: 3,
});

/**
 * Their names and alternatives: 143 the tiles write, read back — 73 of the
 * amide as the principal group (R-6d1: swept below), 13 amide prefixes
 * written `amino` + `oxo` (R-6c2), 42 with an amide prefix, `carbamoil` or
 * acylamino (R-6d2: `amidePrefix`, swept in reverse-amide-prefixes.test.js),
 * and 15 with the retained amide names (R-6d3: `templates`, `formamida`,
 * `acetamida`, `N-metilacetamida`, `2-fenilacetamida`, `ftalamida`…, swept in
 * reverse-amide-templates.test.js; never tokenized before that phase) —;
 * none left for a later phase.
 */
const EXPECTED_NAMES = Object.freeze({ read: 143, principal: 73, prefix: 13, amidePrefix: 42, templates: 15, later: 0 });

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
    ids = null; // A name text: `N-metiletanamida`.
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
 * bond orders (`C1 C1 C1` for N,N-dimethylethanamide's), the nitrogens
 * sorted.
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

// ---------------------------------------------------------------------------
// Parser.
// ---------------------------------------------------------------------------

test('parser (R-6d1): `amida` and `carboxamida` in the parent node, `benzamida` a whole word; `N` on an amide\'s prefixes', () => {
  const { tree, errors } = parse(seq('N 2 di met il prop ano amida'));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.items.map((item) => [item.locants, item.multiplier]), [[[0, 1], 2]]);
  assert.deepEqual([tree.parent.suffix.locants, tree.parent.suffix.multiplier, tree.parent.suffix.tile], [[], null, 7]);
  assert.deepEqual([tree.tiles[0].id, tree.tiles[7].id], [NITROGEN_ID, AMIDA_ID]);
  const ring = parse(seq('ciclo hex ano 1 4 di carboxamida')).tree;
  assert.deepEqual([ring.parent.suffix.locants, ring.parent.suffix.multiplier, ring.tiles[ring.parent.suffix.tile].id], [[3, 4], 5,
    CARBOXAMIDE_ID]);
  const benzene = parse(seq('N et il 4 met il benzamida')).tree;
  assert.deepEqual([benzene.parent.chain.type, benzene.tiles[benzene.parent.chain.tile].id, benzene.parent.suffix], ['benzene',
    BENZAMIDE_ID, null]);
  for (const words of ['et ano di amida', 'prop 2 eno amida', 'N met il ciclo hex ano carboxamida', 'N N di met il benzamida',
    'N et il p met il benzamida', 'p bromo N N di met il benzamida', 'benceno 1 4 di carboxamida', 'N START 2 amino 2 oxo et il END but ano amida',
    // `carboxamida` after a chain is read too, and judged by the engine (`propano-1-carboxamida` is butanamida).
    'prop ano 1 carboxamida']) {
    assert.deepEqual(errorsOf(words), [], words);
  }
  // Old style: the locants before the root belong to the segment, never to `amida` (`2-butenamida`, as `2-butenonitrilo`).
  const old = parse(seq('2 but eno amida')).tree;
  assert.deepEqual([old.parent.legacy, old.parent.legacySegment, old.parent.legacySuffix], [[0], 0, false]);
  // Partial names: a prefix with `N` and no parent yet has no `N` error of its own.
  assert.deepEqual(errorsOf('N met il'), ['ENDS_WITH_BRANCH[0,3)']);
}); // End of test 'parser (R-6d1): `amida`…'

test('parser (R-6d1): misplaced amide tiles and `N` are errors with their tile ranges and hints', () => {
  const lead = 'Esta ficha no puede ir aquí: ';
  const cases = [
    // `amida` puts its group at the chain's ends by rule: no locants of its own, none in the old style.
    ['et ano 1 amida', ['TILE_ORDER[2,3)'], `${lead}el grupo amida de «amida» va siempre en un extremo de la cadena, en el carbono 1 (y `
      + 'en el último, con «diamida»), así que «amida» no lleva números: etanamida, butanodiamida.'],
    ['1 but ano amida', ['TILE_ORDER[0,1)'], null],
    // On a ring the group is `carboxamida`; on `benceno` too, or the word `benzamida`.
    ['ciclo hex ano amida', ['TILE_ORDER[3,4)'], `${lead}«amida» solo va detrás de una cadena: en un anillo, el grupo amida va unido a un `
      + 'carbono del anillo y se escribe «carboxamida» (ciclohexanocarboxamida).'],
    ['benceno amida', ['TILE_ORDER[1,2)'], `${lead}«amida» no va detrás de «benceno»: el benceno con un grupo amida es la «benzamida», y `
      + 'con varios se usa «carboxamida» (benceno-1,4-dicarboxamida).'],
    // Out of place: their own hints; `bis` before a suffix.
    // R-6d2: in a branch the amide group is `carbamoil` (the hints gain that clause, as the nitriles' name `ciano`).
    ['amida et ano', ['TILE_ORDER[0,1)'], `${lead}«amida» va al final del nombre, detrás de la terminación de la cadena principal `
      + '(etanamida, butanodiamida); en una rama, el grupo amida se escribe «carbamoil» ((4-carbamoilciclohexil)).'],
    ['carboxamida ciclo hex ano', ['TILE_ORDER[0,1)'], `${lead}«carboxamida» va al final del nombre, detrás del nombre del anillo `
      + 'principal (ciclohexanocarboxamida); en una rama, el grupo amida se escribe «carbamoil».'],
    ['but ano bis amida', ['TILE_ORDER[2,3)'], `${lead}delante de «amida» va «di», «tri»…, no «bis» ni «tris».`],
    // Review of phase I-52d2: the example a complete name the engine writes; a benzene with an amide group in a branch is refused.
    ['START 4 met il benzamida END met ano', ['TILE_ORDER[4,5)', 'TILE_ORDER[5,6)'], `${lead}«benzamida» es el nombre de toda la `
      + 'molécula y va al final (4-metilbenzamida). En una rama, el grupo amida se escribe «carbamoil» (ácido '
      + '2-(4-carbamoilciclohexil)etanoico), pero de momento no sé nombrar una rama con un benceno que lleve un grupo amida.'],
    // `benzamida` places its group at carbon 1: no numbers or letter of its own.
    ['1 benzamida', ['TEMPLATE_LOCANTS[0,1)'], '«benzamida» ya dice dónde va su grupo amida, en el carbono 1: no lleva números ni '
      + 'letras propios.'],
    // An `N` and a letter on one prefix: no used form (the engine writes `N,4-dimetilbenzamida`).
    ['N p di met il benzamida', ['POSITIONAL[0,2)'], '«N» y las letras «o», «m» y «p» no van juntas delante de un mismo grupo: con un '
      + 'grupo en el nitrógeno y otro en el anillo, escribe «N» para el del nitrógeno y un número para el del anillo '
      + '(N,4-dimetilbenzamida).'],
    // A group without numbers beside a letter: three positions, and the hint of `N`, with the amide's example.
    ['et il p met il benzamida', ['POSITIONAL[2,3)'], 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu '
      + 'nombre pone tres (contando el grupo amida de la benzamida): escribe los números (1,2,4-trimetilbenceno). Si un grupo va unido al '
      + 'nitrógeno, escribe «N» delante (N-etil-p-metilbenzamida).'],
    // `N` in an amide's name anywhere but a name-level prefix: the amide's hint.
    ['N et ano amida', ['TILE_ORDER[0,1)'], `${lead}«N» va delante de una rama unida al nitrógeno de la amida, como un número más de esa `
      + 'rama (N-metiletanamida, N,2-dimetilpropanamida); no va delante de la cadena principal, de «eno», «ino» o de la terminación de la '
      + 'amida, ni dentro de una rama compuesta.'],
    ['ciclo hex ano N carboxamida', ['TILE_ORDER[3,4)'], null],
    ['START N met il et il END et ano amida', ['TILE_ORDER[1,2)'], null],
    ['prop N eno amida', ['TILE_ORDER[1,2)'], null],
    // `N` without an amine's or an amide's suffix: the hint names both.
    ['N met il et ano oico', ['TILE_ORDER[0,1)', 'ACID_WORD[5,6)'], null],
    ['N met il et ano nitrilo', ['TILE_ORDER[0,1)'], `${lead}«N» dice que un grupo va unido al nitrógeno de una amina o de una amida, así `
      + 'que solo va en un nombre que acaba en «amina» o en «amida» (N-metiletanamina, N-metiletanamida).'],
    // The class word `ácido` and an O-bound side belong to other families.
    ['ácido et ano amida', ['ACID_WORD[0,1)'], null],
    ['et ano amida met ilo', ['ESTER_SUFFIX[3,5)'], null],
    // A count that does not match: LOCANT_COUNT, `N` counted as any locant.
    ['N N met il et ano amida', ['LOCANT_COUNT[0,2)'], null],
  ];
  for (const [words, errors, message] of cases) {
    assert.deepEqual(errorsOf(words), errors, words);
    if (message) {
      const error = parse(seq(words)).errors.find((e) => e.message === message);
      assert.ok(error, `${words}: ${parse(seq(words)).errors.map((e) => e.message).join(' | ')}`);
    }
  }
  assert.match(messageOf('1 but ano amida'), /así que «amida» no lleva números/);
}); // End of test 'parser (R-6d1): misplaced amide tiles…'

// ---------------------------------------------------------------------------
// Assembler and tokenizer.
// ---------------------------------------------------------------------------

/** Amide forms (tile words) and a SMILES whose engine names include the assembled text. */
const FORMS = Object.freeze([
  ['met ano amida', 'NC=O'],
  ['et ano amida', 'CC(N)=O'],
  ['prop ano amida', 'CCC(N)=O'],
  ['2 met il prop ano amida', 'CC(C)C(N)=O'],
  ['et ano di amida', 'NC(=O)C(N)=O'],
  ['but ano di amida', 'NC(=O)CCC(N)=O'],
  ['prop 2 eno amida', 'C=CC(N)=O'],
  ['prop 2 ino amida', 'C#CC(N)=O'],
  ['4 oxo pent ano amida', 'CC(=O)CCC(N)=O'],
  ['3 hidroxi but ano amida', 'CC(O)CC(N)=O'],
  ['2 amino prop ano amida', 'CC(N)C(N)=O'],
  ['2 cloro et ano amida', 'ClCC(N)=O'],
  ['3 ciano prop ano amida', 'N#CCCC(N)=O'],
  ['ciclo hex ano carboxamida', 'NC(=O)C1CCCCC1'],
  ['4 cloro ciclo hex ano 1 carboxamida', 'NC(=O)C1CCC(Cl)CC1'],
  ['ciclo hex 1 eno 1 carboxamida', 'O=C(N)C1=CCCCC1'],
  ['ciclo hex ano 1 4 di carboxamida', 'NC(=O)C1CCC(C(N)=O)CC1'],
  ['benceno carboxamida', 'NC(=O)C1=CC=CC=C1'],
  ['4 met il benceno 1 carboxamida', 'NC(=O)C1=CC=C(C)C=C1'],
  ['benceno 1 4 di carboxamida', 'NC(=O)C1=CC=C(C(N)=O)C=C1'],
  ['benzamida', 'NC(=O)C1=CC=CC=C1'],
  ['4 met il benzamida', 'NC(=O)C1=CC=C(C)C=C1'],
  ['p met il benzamida', 'NC(=O)C1=CC=C(C)C=C1'],
  ['N met il et ano amida', 'CC(=O)NC'],
  ['N N di met il et ano amida', 'CC(=O)N(C)C'],
  ['N et il N met il prop ano amida', 'CCC(=O)N(C)CC'],
  ['N 2 di met il prop ano amida', 'CC(C)C(=O)NC'],
  ['N isopropil prop ano amida', 'CCC(=O)NC(C)C'],
  ['N prop ano 2 il prop ano amida', 'CCC(=O)NC(C)C'],
  ['N START 1 met il et il END prop ano amida', 'CCC(=O)NC(C)C'],
  ['N START 2 hidroxi et il END et ano amida', 'CC(=O)NCCO'],
  ['N fenil et ano amida', 'CC(=O)NC1=CC=CC=C1'],
  ['N ciclo hex il et ano amida', 'CC(=O)NC1CCCCC1'],
  ['N fenil N met il et ano amida', 'CC(=O)N(C)C1=CC=CC=C1'],
  ['2 fenil N met il et ano amida', 'CNC(=O)CC1=CC=CC=C1'],
  ['N met il ciclo hex ano carboxamida', 'CNC(=O)C1CCCCC1'],
  ['N et il 2 met il ciclo hex ano 1 carboxamida', 'CCNC(=O)C1CCCCC1C'],
  ['N met il benzamida', 'CNC(=O)C1=CC=CC=C1'],
  ['N N di met il benzamida', 'CN(C)C(=O)C1=CC=CC=C1'],
  ['N et il 4 met il benzamida', 'CCNC(=O)C1=CC=C(C)C=C1'],
  ['4 bromo N N di met il benzamida', 'CN(C)C(=O)C1=CC=C(Br)C=C1'],
  ['N et il p met il benzamida', 'CCNC(=O)C1=CC=C(C)C=C1'],
  ['p bromo N N di met il benzamida', 'CN(C)C(=O)C1=CC=C(Br)C=C1'],
  ['N START 2 amino 2 oxo et il END but ano amida', 'CCCC(=O)NCC(N)=O'],
]);

test('assembler (R-6d1): every amide form is the forward engine\'s own text; the tokenizer reads it back', () => {
  const texts = [];
  for (const [words, smiles] of FORMS) {
    const assembled = text(words);
    texts.push(assembled);
    assert.ok(namesOf(smiles).includes(assembled), `${words} → ${assembled}`);
    const ids = tokenize(assembled);
    assert.ok(ids, `no tiles for ${assembled}`);
    assert.equal(assemble(parse(ids).tree).text, assembled);
  }
  // The parent's `o` elided before `amida`'s vowel, kept before `diamida` and `carboxamida`.
  assert.deepEqual(texts.slice(0, 8), ['metanamida', 'etanamida', 'propanamida', '2-metilpropanamida', 'etanodiamida', 'butanodiamida',
    'prop-2-enamida', 'prop-2-inamida']);
  assert.deepEqual(texts.slice(13, 23), ['ciclohexanocarboxamida', '4-clorociclohexano-1-carboxamida', 'ciclohex-1-eno-1-carboxamida',
    'ciclohexano-1,4-dicarboxamida', 'bencenocarboxamida', '4-metilbenceno-1-carboxamida', 'benceno-1,4-dicarboxamida', 'benzamida',
    '4-metilbenzamida', 'p-metilbenzamida']);
  assert.deepEqual(texts.slice(23, 30), ['N-metiletanamida', 'N,N-dimetiletanamida', 'N-etil-N-metilpropanamida', 'N,2-dimetilpropanamida',
    'N-isopropilpropanamida', 'N-(propan-2-il)propanamida', 'N-(1-metiletil)propanamida']);
  // The spans: `N` is a locant like the numbers; `amida` an ending.
  const { spans } = assemble(parse(seq('N 2 di met il prop ano amida')).tree);
  const kinds = spans.filter((span) => span.tile !== null).map((span) => span.kind);
  assert.deepEqual([kinds[0], kinds[1], kinds[kinds.length - 1]], ['locant', 'locant', 'ending']);
}); // End of test 'assembler (R-6d1)…'

test('tokenizer (R-6d1): the amide prefixes (R-6d2) and the retained amide names (R-6d3) read; no later words left', () => {
  // R-6d3: the retained amide names, «Nombres tradicionales» tiles (reverse-amide-templates.test.js).
  for (const name of ['formamida', 'acetamida', 'N-metilacetamida', 'N,N-dimetilformamida', 'N-fenilacetamida', '2-fenilacetamida',
    '2-(4-metilfenil)acetamida', 'ftalamida']) {
    assert.ok(tokenize(name), name);
    assert.ok(isAmideTemplateName(name) && !isLaterAmideName(name) && !isR6d1AmideName(name), name);
  }
  assert.deepEqual(LATER_AMIDE_WORDS, []);
  assert.deepEqual(AMIDE_TEMPLATE_WORDS, ['formamida', 'acetamida', 'ftalamida']);
  // R-6d2: `carbamoil` and the acylamino prefixes read (reverse-amide-prefixes.test.js).
  for (const name of ['ácido 3-carbamoilpentanodioico', 'ácido 3-(metilcarbamoil)pentanodioico', '2-(4-carbamoilciclohexil)butanodiamida',
    '2-(acetilamino)etanamida', '3-(acetilamino)propanamida', 'ácido 2-(acetilamino)etanoico']) {
    assert.ok(tokenize(name), name);
    assert.ok(isR6d2AmideName(name) && !isR6d1AmideName(name) && !isLaterAmideName(name), name);
  }
  // An acyl group on an amino prefix's nitrogen is no TILE_ORDER since R-6d2: the acylamino prefix of an amide.
  assert.deepEqual(errorsOf('2 START acetil amino END et ano amida'), []);
  assert.equal(read('2 START acetil amino END et ano amida').kind, 'correct');
  // The R-6d1 names read.
  for (const name of ['etanamida', 'N-metiletanamida', 'ciclohexanocarboxamida', 'bencenocarboxamida', 'benzamida', 'p-metilbenzamida',
    'N,2-dimetilpropanamida', 'N-(2-amino-2-oxoetil)butanamida', '3-amino-N-metilpropanamida']) {
    assert.ok(tokenize(name), name);
    assert.ok(isR6d1AmideName(name) && isAmideName(name) && !isLaterAmideName(name), name);
  }
}); // End of test 'tokenizer (R-6d1)…'

// ---------------------------------------------------------------------------
// Interpreter and builder.
// ---------------------------------------------------------------------------

test('interpreter (R-6d1): the amide SuffixSpec; `N` slots with the domain [N, n]; left-out slots that may take `N`', () => {
  const spec = specOf('N 2 di met il prop ano amida');
  assert.deepEqual([spec.suffix.kind, spec.suffix.outside, spec.suffix.terminal, spec.suffix.amideNitrogen,
    spec.suffix.slots.map((slot) => [slot.kind, slot.value])], ['amide', false, true, true, [['implicit', 1]]]);
  assert.deepEqual(spec.prefixes[0].slots.map((slot) => [slot.kind, slot.value, slot.domain, Boolean(slot.nitrogen)]),
    [['supplied', N_VALUE, [0, 3], true], ['supplied', 2, [1, 3], false]]);
  // `butanodiamida`: the ends by rule; `carboxamida` with its locants, outside; `benzamida` placed at 1, outside.
  assert.deepEqual(specOf('but ano di amida').suffix.slots.map((slot) => [slot.kind, slot.value]), [['implicit', 1], ['implicit', 4]]);
  const ring = specOf('ciclo hex ano 1 4 di carboxamida').suffix;
  assert.deepEqual([ring.kind, ring.outside, ring.terminal, ring.amideNitrogen, ring.slots.map((slot) => slot.value)],
    ['amide', true, false, true, [1, 4]]);
  const word = specOf('benzamida').suffix;
  assert.deepEqual([word.kind, word.outside, word.placed, word.amideNitrogen, word.word.text], ['amide', true, true, true, 'benzamida']);
  // Left out: a carbon branch on a one-group amide may take `N`; a halogen, an alkoxy or an acyl group may not.
  assert.deepEqual(slotGroups(specOf('met il et ano amida')).map((g) => g.domain), [[0, 2]]);
  assert.deepEqual(slotGroups(specOf('cloro et ano amida')).map((g) => g.domain), [[1, 2]]);
  assert.deepEqual(slotGroups(specOf('met il oxi et ano amida')).map((g) => g.domain), [[1, 2]]);
  assert.deepEqual(slotGroups(specOf('isopropil benzamida')).map((g) => g.domain), [[0, 6]]);
  assert.deepEqual(slotGroups(specOf('fenil et ano amida')).map((g) => g.domain), [[0, 2]]);
  // Two amide groups: the engine never names a group on one of their nitrogens (substitutedPolyamide), so `N` is not searched.
  assert.deepEqual(slotGroups(specOf('met il but ano di amida')).map((g) => g.domain), [[1, 4]]);
}); // End of test 'interpreter (R-6d1)…'

test('builder (R-6d1): the =O and the nitrogen on each –CONH₂ carbon; the groups written `N` on it; atoms counted for the caps', () => {
  const cases = [
    ['et ano amida', ['C1']],
    ['N met il et ano amida', ['C1 C1']],
    ['N N di met il et ano amida', ['C1 C1 C1']],
    ['but ano di amida', ['C1', 'C1']],
    ['ciclo hex ano carboxamida', ['C1']],
    ['N met il benzamida', ['C1 C1']],
  ];
  for (const [words, bonds] of cases) {
    const built = build(specOf(words), specOf(words).leftOut.map(() => 1));
    assert.ok(built.ok, words);
    assert.deepEqual(nitrogenBonds(built.molecule), bonds, words);
    for (const group of built.suffixAtoms) {
      const { molecule } = built;
      assert.equal(molecule.atoms.get(group.attachment).element, 'O', words);
      assert.equal(molecule.atoms.get(group.amideNitrogen).element, 'N', words);
      assert.equal(molecule.bonds.get(group.bond).order, 2, words);
      assert.equal(molecule.bonds.get(group.amideBond).order, 1, words);
    }
  } // End of the loop over the builder cases
  // The prefix occurrence on the nitrogen: its locant `N` (N_VALUE), bonded to the amide's nitrogen, not to a carbon of the parent.
  const built = build(specOf('N met il et ano amida'), []);
  const [occurrence] = built.prefixAtoms;
  assert.deepEqual([occurrence.locant, occurrence.parentAtom], [N_VALUE, built.suffixAtoms[0].amideNitrogen]);
  assert.ok(!built.studentParent.atoms.includes(occurrence.parentAtom));
  // The heavy atoms: an oxygen and a nitrogen per group, its carbon too outside a ring.
  assert.deepEqual(['et ano amida', 'but ano di amida', 'ciclo hex ano carboxamida', 'benzamida', 'N N di met il et ano amida']
    .map((words) => specAtoms(specOf(words))), [4, 8, 9, 9, 6]);
}); // End of test 'builder (R-6d1): the =O and the nitrogen…'

test('builder (R-6d1): VALENCE on a third group on the nitrogen and on an amide\'s end; CARBONYL_POSITION; LOCANT_RANGE', () => {
  const cases = [
    ['N N N tri met il et ano amida', 'VALENCE', [2, 3], 'El nitrógeno de la amida tendría 4 enlaces, y un nitrógeno solo puede tener 3.'],
    ['N met il N N di et il benzamida', 'VALENCE', [4, 5],
      'El nitrógeno de la amida tendría 4 enlaces, y un nitrógeno solo puede tener 3.'],
    ['1 met il but ano amida', 'VALENCE', [0, 1], 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: el grupo amida de '
      + '«amida» va en ese carbono.'],
    ['1 met il benzamida', 'VALENCE', [0, 1], 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en la benzamida, ese '
      + 'carbono ya lleva un grupo amida.'],
    ['met ano di amida', 'CARBONYL_POSITION', [2, 4], 'La cadena de 1 carbono solo tiene un extremo: lleva un solo grupo amida '
      + '(metanamida).'],
    ['but ano tri amida', 'CARBONYL_POSITION', [2, 4], 'La cadena tiene dos extremos: con «amida» lleva como mucho dos grupos amida, uno '
      + 'en cada extremo (butanodiamida).'],
    ['7 met il benzamida', 'LOCANT_RANGE', [0, 1], 'El anillo de la benzamida tiene 6 carbonos, del 1 al 6: no hay carbono 7.'],
    ['ciclo hex ano 7 carboxamida', 'LOCANT_RANGE', [3, 4], 'El anillo de 6 carbonos va del 1 al 6: no hay carbono 7.'],
  ];
  for (const [words, code, tiles, message] of cases) {
    const verdict = read(words);
    assert.equal(verdict.kind, 'invalid', `${words}: ${verdict.message}`);
    assert.deepEqual([verdict.errors[0].code, [verdict.errors[0].from, verdict.errors[0].to]], [code, tiles], words);
    assert.equal(verdict.message, message, words);
  }
  // A third group left out has no room on the nitrogen: two `N` at most, the others on a carbon.
  const three = read('tri met il et ano amida');
  assert.deepEqual([three.kind, three.message], ['ambiguous', 'Faltan números: puede ser N,N-dimetilpropanamida, '
    + 'N,2-dimetilpropanamida o 2,2-dimetilpropanamida.']);
}); // End of test 'builder (R-6d1): VALENCE…'

// ---------------------------------------------------------------------------
// readName(): verdicts, search, out-of-scope amides.
// ---------------------------------------------------------------------------

/**
 * readName() cases: tile words or a name, the verdict, the engine's name
 * and the SMILES of the molecule drawn.
 */
const CASES = Object.freeze([
  ['etanamida', 'correct', 'etanamida', 'CC(N)=O'],
  ['propanamida', 'correct', 'propanamida', 'CCC(N)=O'],
  ['2-metilpropanamida', 'correct', '2-metilpropanamida', 'CC(C)C(N)=O'],
  ['butanodiamida', 'correct', 'butanodiamida', 'NC(=O)CCC(N)=O'],
  ['etanodiamida', 'correct', 'etanodiamida', 'NC(=O)C(N)=O'],
  ['prop-2-enamida', 'correct', 'prop-2-enamida', 'C=CC(N)=O'],
  ['4-oxopentanamida', 'correct', '4-oxopentanamida', 'CC(=O)CCC(N)=O'],
  ['3-hidroxibutanamida', 'correct', '3-hidroxibutanamida', 'CC(O)CC(N)=O'],
  ['2-aminopropanamida', 'correct', '2-aminopropanamida', 'CC(N)C(N)=O'],
  ['2-cloroetanamida', 'correct', '2-cloroetanamida', 'ClCC(N)=O'],
  ['3-cianopropanamida', 'correct', '3-cianopropanamida', 'N#CCCC(N)=O'],
  ['ciclohexanocarboxamida', 'correct', 'ciclohexanocarboxamida', 'NC(=O)C1CCCCC1'],
  ['4-clorociclohexano-1-carboxamida', 'correct', '4-clorociclohexano-1-carboxamida', 'NC(=O)C1CCC(Cl)CC1'],
  ['ciclohex-1-eno-1-carboxamida', 'correct', 'ciclohex-1-eno-1-carboxamida', 'O=C(N)C1=CCCCC1'],
  ['ciclohexano-1,4-dicarboxamida', 'correct', 'ciclohexano-1,4-dicarboxamida', 'NC(=O)C1CCC(C(N)=O)CC1'],
  ['bencenocarboxamida', 'alternative', 'benzamida', 'NC(=O)C1=CC=CC=C1'],
  ['4-metilbenceno-1-carboxamida', 'alternative', '4-metilbenzamida', 'NC(=O)C1=CC=C(C)C=C1'],
  ['benzamida', 'correct', 'benzamida', 'NC(=O)C1=CC=CC=C1'],
  ['4-metilbenzamida', 'correct', '4-metilbenzamida', 'NC(=O)C1=CC=C(C)C=C1'],
  ['p-metilbenzamida', 'alternative', '4-metilbenzamida', 'NC(=O)C1=CC=C(C)C=C1'],
  ['benceno-1,4-dicarboxamida', 'correct', 'benceno-1,4-dicarboxamida', 'NC(=O)C1=CC=C(C(N)=O)C=C1'],
  ['N-metiletanamida', 'correct', 'N-metiletanamida', 'CC(=O)NC'],
  ['N,N-dimetiletanamida', 'correct', 'N,N-dimetiletanamida', 'CC(=O)N(C)C'],
  ['N-etil-N-metilpropanamida', 'correct', 'N-etil-N-metilpropanamida', 'CCC(=O)N(C)CC'],
  ['N,2-dimetilpropanamida', 'correct', 'N,2-dimetilpropanamida', 'CC(C)C(=O)NC'],
  ['N-isopropilpropanamida', 'correct', 'N-isopropilpropanamida', 'CCC(=O)NC(C)C'],
  ['N-(propan-2-il)propanamida', 'alternative', 'N-isopropilpropanamida', 'CCC(=O)NC(C)C'],
  ['N-(1-metiletil)propanamida', 'alternative', 'N-isopropilpropanamida', 'CCC(=O)NC(C)C'],
  ['N-(2-hidroxietil)etanamida', 'correct', 'N-(2-hidroxietil)etanamida', 'CC(=O)NCCO'],
  ['N-feniletanamida', 'correct', 'N-feniletanamida', 'CC(=O)NC1=CC=CC=C1'],
  ['N-ciclohexiletanamida', 'correct', 'N-ciclohexiletanamida', 'CC(=O)NC1CCCCC1'],
  ['N-fenil-N-metiletanamida', 'correct', 'N-fenil-N-metiletanamida', 'CC(=O)N(C)C1=CC=CC=C1'],
  ['2-fenil-N-metiletanamida', 'correct', '2-fenil-N-metiletanamida', 'CNC(=O)CC1=CC=CC=C1'],
  ['N-metilciclohexanocarboxamida', 'correct', 'N-metilciclohexanocarboxamida', 'CNC(=O)C1CCCCC1'],
  ['N-etil-2-metilciclohexano-1-carboxamida', 'correct', 'N-etil-2-metilciclohexano-1-carboxamida', 'CCNC(=O)C1CCCCC1C'],
  ['N-metilbenzamida', 'correct', 'N-metilbenzamida', 'CNC(=O)C1=CC=CC=C1'],
  ['N,N-dimetilbenzamida', 'correct', 'N,N-dimetilbenzamida', 'CN(C)C(=O)C1=CC=CC=C1'],
  ['N-etil-4-metilbenzamida', 'correct', 'N-etil-4-metilbenzamida', 'CCNC(=O)C1=CC=C(C)C=C1'],
  ['4-bromo-N,N-dimetilbenzamida', 'correct', '4-bromo-N,N-dimetilbenzamida', 'CN(C)C(=O)C1=CC=C(Br)C=C1'],
  ['N-etil-p-metilbenzamida', 'alternative', 'N-etil-4-metilbenzamida', 'CCNC(=O)C1=CC=C(C)C=C1'],
  ['p-bromo-N,N-dimetilbenzamida', 'alternative', '4-bromo-N,N-dimetilbenzamida', 'CN(C)C(=O)C1=CC=C(Br)C=C1'],
  ['N-(2-amino-2-oxoetil)butanamida', 'correct', 'N-(2-amino-2-oxoetil)butanamida', 'CCCC(=O)NCC(N)=O'],
  ['N-etilmetanamida', 'correct', 'N-etilmetanamida', 'CCNC=O'], // N-ethylformamide: the amide's carbon is always the parent's.
  ['3-amino-N-metilpropanamida', 'correct', '3-amino-N-metilpropanamida', 'NCCC(=O)NC'],
  // Left-out locants (search.js), `N` among the places searched.
  ['met il et ano amida', 'missingLocants', 'N-metiletanamida', 'CC(=O)NC'],
  ['di met il et ano amida', 'missingLocants', 'N,N-dimetiletanamida', 'CC(=O)N(C)C'],
  ['met il met ano amida', 'missingLocants', 'N-metilmetanamida', 'CNC=O'],
  ['ciclo hex il met ano amida', 'missingLocants', 'N-ciclohexilmetanamida', 'O=CNC1CCCCC1'],
  ['cloro N met il et ano amida', 'missingLocants', '2-cloro-N-metiletanamida', 'ClCC(=O)NC'],
  ['N met il ciclo hex 2 eno carboxamida', 'missingLocants', 'N-metilciclohex-2-eno-1-carboxamida', 'CNC(=O)C1CCCC=C1'],
  ['2 met il ciclo hex ano carboxamida', 'missingLocants', '2-metilciclohexano-1-carboxamida', 'NC(=O)C1CCCCC1C'],
  // `otherName`: the molecule the name describes.
  ['propano-1-carboxamida', 'otherName', 'butanamida', 'CCCC(N)=O'],
  ['1-ciclohexilmetanamida', 'otherName', 'ciclohexanocarboxamida', 'NC(=O)C1CCCCC1'],
  ['ciclohexano-1-carboxamida', 'otherName', 'ciclohexanocarboxamida', 'NC(=O)C1CCCCC1'],
  ['benceno-1-carboxamida', 'otherName', 'benzamida', 'NC(=O)C1=CC=CC=C1'],
  ['2-metil-N-metilpropanamida', 'otherName', 'N,2-dimetilpropanamida', 'CC(C)C(=O)NC'],
  ['2,N-dimetilpropanamida', 'otherName', 'N,2-dimetilpropanamida', 'CC(C)C(=O)NC'],
  ['2-butenamida', 'otherName', 'but-2-enamida', 'CC=CC(N)=O'],
  ['1-aminobutanal', 'otherName', 'butanamida', 'CCCC(N)=O'],
  ['N-acetiletanamina', 'otherName', 'N-etiletanamida', 'CCNC(C)=O'],
]);

test('readName (R-6d1): verdicts and the molecule each name describes, against a SMILES', () => {
  for (const [name, kind, engine, smiles] of CASES) {
    const verdict = read(name);
    assert.equal(verdict.kind, kind, `${name}: ${verdict.message}`);
    assert.equal(verdict.name, engine, name);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${name} builds another graph`);
    assert.equal(verdict.draw, true, name);
  }
  assert.equal(read('met il et ano amida').message, 'Casi: faltan los números. Se escribe «N-metiletanamida».');
  assert.equal(read('etanamida').message, '¡Correcto! También se llama «acetamida» (nombre tradicional, que la IUPAC (2013) conserva '
    + 'como preferido).');
  // The student's reading: the =O and the nitrogen of each group, the `N` prefix on that nitrogen.
  const verdict = read('N,2-dimetilpropanamida');
  assert.deepEqual(verdict.suffixAtoms.map((g) => [verdict.molecule.atoms.get(g.attachment).element,
    verdict.molecule.atoms.get(g.amideNitrogen).element]), [['O', 'N']]);
  assert.deepEqual(verdict.prefixAtoms.map((o) => o.locant), [N_VALUE, 2]);
  assert.equal(verdict.prefixAtoms[0].parentAtom, verdict.suffixAtoms[0].amideNitrogen);
}); // End of test 'readName (R-6d1): verdicts…'

test('search (R-6d1): left-out locants, `N` included, give ambiguous lists; the budget gives incomplete; out-of-scope amides', () => {
  const ambiguous = [
    ['met il prop ano amida', 'Faltan números: puede ser N-metilpropanamida o 2-metilpropanamida.'],
    ['met il benzamida', 'Faltan números: puede ser N-metilbenzamida, 2-metilbenzamida, 3-metilbenzamida u otra molécula.'],
    ['et il 4 met il benzamida', 'Faltan números: puede ser N-etil-4-metilbenzamida, 2-etil-4-metilbenzamida o '
      + '3-etil-4-metilbenzamida.'],
    ['met il ciclo hex ano carboxamida', 'Faltan números: puede ser N-metilciclohexanocarboxamida, 1-metilciclohexano-1-carboxamida, '
      + '2-metilciclohexano-1-carboxamida u otras 2 moléculas.'],
    ['ciclo hex ano di carboxamida', 'Faltan números: puede ser ciclohexano-1,1-dicarboxamida, ciclohexano-1,2-dicarboxamida, '
      + 'ciclohexano-1,3-dicarboxamida u otra molécula.'],
  ];
  for (const [words, message] of ambiguous) {
    const verdict = read(words);
    assert.deepEqual([verdict.kind, verdict.message], ['ambiguous', message], words);
  }
  assert.equal(read('tetra met il hex ano amida', { budget: { placements: 1 } }).kind, 'incomplete');
  assert.equal(read('met il ciclo hex ano carboxamida', { budget: { namings: 1 } }).kind, 'incomplete');
  // The engine's refusals: a group on one nitrogen of a diamide (substitutedPolyamide, read from the name before any placement:
  // build.js polyamideRefusal(), on `benceno` with its own message), more than two amides on one chain (manyAmides), an imide, a
  // halogen or an oxygen on the nitrogen, two rings (RING_SYSTEM).
  const lead = 'Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar: ';
  for (const [words, start] of [
    ['N met il but ano di amida', 'Esta molécula tiene dos grupos amida y alguno de sus nitrógenos lleva otros grupos unidos'],
    ['N met il ciclo hex ano 1 4 di carboxamida', 'Esta molécula tiene dos grupos amida y alguno de sus nitrógenos'],
    ['N met il benceno 1 4 di carboxamida', 'Este benceno tiene varios grupos amida unidos al anillo'],
    ['N-metil-4-oxociclohexano-1,3-dicarboxamida', 'Esta molécula tiene dos grupos amida y alguno de sus nitrógenos'],
    ['propano-1,2,3-tricarboxamida', 'Esta molécula tiene más de dos grupos amida en la misma cadena de carbonos'],
    ['N acetil et ano amida', 'Esta molécula tiene un nitrógeno unido a dos grupos C=O'],
    ['N cloro et ano amida', 'Esta molécula tiene átomos que no son carbono ni hidrógeno'],
    ['N met il oxi et ano amida', 'Esta molécula tiene átomos que no son carbono ni hidrógeno'],
    ['N fenil benzamida', 'Esta molécula tiene varios anillos'],
    ['N ciclo hex il ciclo hex ano carboxamida', 'Esta molécula tiene varios anillos'],
    ['4 fenil benzamida', 'Esta molécula tiene varios anillos']]) {
    const refused = read(words);
    assert.equal(refused.kind, 'outOfScope', `${words}: ${refused.message}`);
    assert.ok(refused.message.startsWith(`${lead}${start}`), refused.message);
    assert.equal(refused.draw, false);
  }
}); // End of test 'search (R-6d1)…'

// ---------------------------------------------------------------------------
// Mutations and the diagnosis.
// ---------------------------------------------------------------------------

/**
 * Mutations of amide names (design.md §15.7): tile words, the verdict and the
 * diagnosis code of a rule that holds for an amide name (the amide's own
 * mistakes are the deliberate nulls of the next test).
 */
const MUTATIONS = Object.freeze([
  ['2 et il prop ano amida', 'otherName', 'LONGER_CHAIN'],
  ['3 met il but ano amida', 'correct', null],
  ['N et il 1 met il met ano amida', 'otherName', 'BRANCH_AT_END'],
  ['6 met il benzamida', 'otherName', 'RING_NUMBERING'],
  ['N et il 6 met il ciclo hex ano 1 carboxamida', 'otherName', 'RING_NUMBERING'],
  ['N met il N et il et ano amida', 'otherName', 'ALPHABETICAL_ORDER'],
  ['2 cloro N START 2 cloro et il END et ano amida', 'correct', null],
  ['N met il N met il et ano amida', 'otherName', 'UNGROUPED'],
  ['2 met il N met il prop ano amida', 'otherName', 'UNGROUPED'],
  ['N met il N met il ciclo hex ano carboxamida', 'otherName', 'UNGROUPED'],
  ['N N bis met il et ano amida', 'otherName', 'MULTIPLIER_KIND'],
  ['2 N di met il prop ano amida', 'otherName', 'LOCANT_ORDER'],
  ['2 but eno amida', 'otherName', 'OLD_STYLE'],
  ['2 START 5 met il fenil END et ano amida', 'otherName', 'BRANCH_RING_NUMBERING'],
  ['N START 1 cloro met il END et ano amida', 'otherName', 'NEEDLESS_LOCANTS'],
  ['ciclo hex 1 3 5 tri eno carboxamida', 'otherName', 'BENZENE_RING'],
  // Other verdicts.
  ['N met il et ano amida', 'correct', null],
  ['met il prop ano amida', 'ambiguous', null],
  ['met il et ano amida', 'missingLocants', null],
]);

test('mutations (R-6d1): the expected verdict, and the diagnosis of every rule that holds for an amide name', () => {
  for (const [words, kind, code] of MUTATIONS) {
    const verdict = read(words);
    assert.equal(verdict.kind, kind, `${words}: ${verdict.message}`);
    if (kind !== 'otherName') {
      continue;
    }
    assert.equal(verdict.diagnosis ? verdict.diagnosis.code : null, code, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(!/undefined|null|NaN|\[object|grupos? –?OH|–CHO|C=O|COOH|C≡N/.test(verdict.diagnosis.message), words);
    const opened = diagnosisExplanation(verdict, explain);
    const { step } = verdict.diagnosis;
    assert.ok(opened.index >= 0 && [step, ...STEP_FALLBACKS[step]].includes(opened.steps[opened.index].id), words);
  } // End of the loop over the mutations
  const messages = {
    'N met il N met il et ano amida': 'Las ramas iguales se escriben una sola vez, con «di», «tri»… delante: «N,N-dimetil», no '
      + '«N-metil-N-metil».',
    '2 met il N met il prop ano amida': 'Las ramas iguales se escriben una sola vez, con «di», «tri»… delante: «N,2-dimetil», no '
      + '«2-metil-N-metil».',
    '2 N di met il prop ano amida': 'Los números de un mismo grupo se escriben de menor a mayor, y la letra «N» va antes que los '
      + 'números: «N,2-dimetil», no «2,N-dimetil».',
    'N met il N et il et ano amida': 'Los sustituyentes se escriben por orden alfabético: «etil» va antes que «metil» (e antes que m).',
    '6 met il benzamida': 'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: los '
      + 'sustituyentes tienen que llevar los números más bajos (2 en vez de 6).',
    'N et il 1 met il met ano amida': 'La rama «metil» está en el extremo de la cadena, así que la alarga: la cadena principal tiene 2 '
      + 'carbonos.',
  };
  for (const [words, message] of Object.entries(messages)) {
    assert.equal(read(words).diagnosis.message, message, words);
  }
  // A group on the nitrogen never lengthens the chain (it is no carbon of the chain's end): the name is the engine's.
  assert.equal(read('N met il prop ano amida').kind, 'correct');
}); // End of test 'mutations (R-6d1)…'

/**
 * The category of an amide's own mistake, read independently of diagnose.js
 * from the engine's naming and the student's reading (diagnose.js «Amides»:
 * deliberate nulls until phase I-52d4): `seniority` — the student's suffix is
 * an amide's while the engine's principal group is another
 * (`4-carboxibutanamida`), or the engine's is an amide and the student's
 * suffix is none or another, an amine's aside (the amine's
 * CARBONYL_SENIORITY, `N-acetiletanamina`): `1-aminobutanal`,
 * `1-amino-1-oxobutano`; `count` — another number of amide groups
 * (`4-amino-4-oxobutanamida`); `carbon` — the student's amide carbon outside
 * the parent where the engine's is in it, or the reverse
 * (`propano-1-carboxamida`, `1-ciclohexilmetanamida`); `parent` — other amide
 * groups than the engine's suffix's (their =O), the student's parent a ring
 * and the engine's a chain or the reverse, or no chain the engine's P0 keeps
 * contains the student's; `numbering` — the same groups on the same parent,
 * numbered otherwise (N0: `ciclohexano-1,5-dicarboxamida`); `suffix` — the
 * suffix's locants, which the engine leaves out (`ciclohexano-1-carboxamida`,
 * `benceno-1-carboxamida`, `N-metilciclohexano-1-carboxamida`). Null when
 * none applies or neither name is an amide's.
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} verdict - Its `otherName` verdict.
 * @returns {string|null} The category.
 */
function amideCategory(ids, verdict) {
  const engine = verdict.naming.structure.suffix;
  const { tree } = parse(ids);
  const spec = interpret(tree);
  const mine = spec.suffix && spec.suffix.kind === 'amide' ? spec.suffix : null;
  if (!engine || engine.kind !== 'amide') {
    return mine ? 'seniority' : null;
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
  if (!sameSet(groups.map((g) => g.attachment), engine.locants.map((site) => site.attachAtom))) {
    return 'parent';
  }
  if (!sameSet(groups.map((g) => g.locant), engine.locants.map((site) => site.locant))
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
} // End of function amideCategory()

test('the deliberate nulls of R-6d1 (diagnose.js «Amides»): each category, read independently, gets no diagnosis', () => {
  const cases = [
    // [tile words, category]
    ['4 carboxi but ano amida', 'seniority'],
    ['2 START acetil oxi END et ano amida', 'seniority'],
    ['1 amino but ano al', 'seniority'], // The `amide` null of phase I-52c2, kept.
    ['1 amino 1 oxo but ano', 'seniority'],
    ['4 amino 4 oxo but ano amida', 'count'],
    ['prop ano 1 carboxamida', 'carbon'],
    ['1 ciclo hex il met ano amida', 'carbon'],
    ['1 fenil met ano amida', 'carbon'],
    ['N START 2 amino 2 oxo et il END et ano amida', 'parent'],
    ['ciclo hex ano 1 5 di carboxamida', 'numbering'],
    ['benceno 1 5 di carboxamida', 'numbering'],
    ['ciclo hex ano 1 carboxamida', 'suffix'],
    ['benceno 1 carboxamida', 'suffix'],
    ['N met il ciclo hex ano 1 carboxamida', 'suffix'],
    ['2 START amida et il END prop ano', null], // `amida` inside a branch: TILE_ORDER, no verdict to categorize
  ];
  for (const [words, category] of cases) {
    const ids = seq(words);
    const verdict = readName(ids);
    if (category === null) {
      assert.equal(verdict.kind, 'invalid', words);
      continue;
    }
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    assert.equal(amideCategory(ids, verdict), category, words);
    assert.equal(verdict.diagnosis, null, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(verdict.draw && verdict.molecule, words);
  } // End of the loop over the deliberate nulls
  // A student's `amina` beside an amide keeps the amine's CARBONYL_SENIORITY (phase I-52c4a), checked before the amide's nulls.
  assert.equal(read('N acetil et ano amina').diagnosis.code, 'CARBONYL_SENIORITY');
  // The shared rules that hold still speak when theirs is the earlier mistake.
  assert.equal(read('2 et il prop ano amida').diagnosis.code, 'LONGER_CHAIN');
  assert.equal(read('N met il N met il ciclo hex ano carboxamida').diagnosis.code, 'UNGROUPED');
}); // End of test 'the deliberate nulls of R-6d1…'

// ---------------------------------------------------------------------------
// Fixture round trip and closed loop (design.md §15.7).
// ---------------------------------------------------------------------------

test('fixture round trip (R-6d1, R-6d2, R-6d3): every amide name, read back; graph compared with the SMILES; no later names', async () => {
  const fixtures = await readFixtures();
  const rows = fixtures.filter((row) => isAmide(row.smiles));
  const counts = { read: 0, principal: 0, prefix: 0, amidePrefix: 0, templates: 0, later: 0 };
  let elapsed = 0;
  const readRows = new Set();
  for (const row of rows) {
    const expected = keyOf(row.smiles);
    for (const name of row.names) {
      if (isLaterAmideName(name)) {
        counts.later += 1; // None since phase R-6d3.
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
      counts.read += 1;
      // The amide the principal group (its suffix, R-6d1), an amide prefix `carbamoil` or acylamino (R-6d2), a retained amide
      // name (R-6d3), or a prefix written `amino` + `oxo` beside a senior group (R-6c2).
      let kind = 'prefix';
      if (isAmideTemplateName(name)) {
        kind = 'templates';
      } else if (isR6d2AmideName(name)) {
        kind = 'amidePrefix';
      } else if (isAmideName(name)) {
        kind = 'principal';
      }
      counts[kind] += 1;
      readRows.add(row);
    } // End of the loop over the names of a row
  } // End of the loop over the fixture rows
  /**
   * How many rows read of a fixture section.
   *
   * @param {string} id - The section's phase id (`I-37`…).
   * @returns {number} The count.
   */
  const inSection = (id) => [...readRows].filter((row) => /\((I-\d+[a-z]?)[),:]/.exec(row.section)[1] === id).length; // Its own id only.
  assert.equal(rows.length, EXPECTED_ROWS.total);
  assert.equal(readRows.size, EXPECTED_ROWS.read);
  assert.deepEqual(['I-37', 'I-39a', 'I-39b', 'I-39d', 'I-40c', 'I-40d', 'I-43b', 'I-44', 'I-45a', 'I-45b'].map(inSection),
    [EXPECTED_ROWS.i37, EXPECTED_ROWS.i39a, EXPECTED_ROWS.i39b, EXPECTED_ROWS.i39d, EXPECTED_ROWS.i40c, EXPECTED_ROWS.i40d,
      EXPECTED_ROWS.i43b, EXPECTED_ROWS.i44, EXPECTED_ROWS.i45a, EXPECTED_ROWS.i45b]);
  assert.deepEqual(counts, { ...EXPECTED_NAMES });
  assert.ok(elapsed / counts.read < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / counts.read).toFixed(2)} ms on average`);
}); // End of test 'fixture round trip (R-6d1, R-6d2, R-6d3)…'

/** The closed loop's generators (scripts/oracle/generate.mjs; design.md §15.7), molecules whose principal group is an amide only. */
const LOOP = Object.freeze([
  [generateAmides, { count: 600, seed: 6501, maxSize: 12 }],
  [generateAmidePrefixes, { count: 300, seed: 6502, maxSize: 12 }],
  [generateRingNitrilesAmides, { count: 400, seed: 6503, maxSize: 12 }],
  [generateRingOutsideBenzenes, { count: 400, seed: 6504, minSize: 6, maxSize: 12 }],
  [generateRingPolysuffixBenzenes, { count: 300, seed: 6505, minSize: 6, maxSize: 12 }],
  [generateSubstitutedPhenyls, { count: 300, seed: 6506, maxSize: 12 }],
  [generateSubstitutedBenzoyls, { count: 300, seed: 6507, maxSize: 12 }],
  [generateCyano, { count: 400, seed: 6508, maxSize: 12 }],
]);

/**
 * Minimum coverage of the closed loop: amide molecules (distinct by aromatic
 * key), names read back, the forms among them (names with `N`, ring amides
 * with `carboxamida`, `benzamida` names, benzene ones with `carboxamida`,
 * diamides and polyamides), removed-locant mutations and decisive verdicts
 * among them, the names with an amide prefix read since phase R-6d2
 * (`carbamoil`, acylamino), and those with a retained amide name read since
 * R-6d3 (`templates`, never tokenized before; their sweeps in
 * reverse-amide-templates.test.js); none with a later word (`later`, exact).
 * The seeds give 1227 molecules, 1574 names (1454 before R-6d3), 802 with
 * `N` (700 before), 83, 149, 171, 218, 3263, 3263, 31 and 120 (R-6d1 gave
 * 1423 names, 151 later).
 */
const LOOP_MIN = Object.freeze({
  molecules: 1200, names: 1570, nitrogen: 800, ring: 80, benzamide: 145, benzene: 165, poly: 215, removed: 3250, decisive: 3250,
  amidePrefix: 30, templates: 115, later: 0,
});

/**
 * The closed loop's molecules: those of the generators whose principal
 * group the engine names as an amide (its suffix kind 'amide'), distinct by
 * aromatic key.
 *
 * @returns {object[]} The molecules.
 */
function loopMolecules() {
  const seen = new Set();
  const molecules = [];
  for (const [generate, options] of LOOP) {
    for (const mol of generate(options).filter(isAmideMolecule)) {
      const key = aromaticKey(mol);
      const naming = seen.has(key) ? null : nameMolecule(mol);
      if (naming && naming.ok && naming.structure.suffix && naming.structure.suffix.kind === 'amide') {
        seen.add(key);
        molecules.push(mol);
      }
    } // End of the loop over a generator's molecules
  } // End of the loop over the generators
  return molecules;
} // End of function loopMolecules()

/**
 * The locant lists of a tree a student can leave out: a prefix's (`N`
 * included), a segment's and the suffix's, at any depth — never a
 * free-valence locant.
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
  return lists;
} // End of function locantLists()

test('closed loop over the amide generators: engine name → tiles → readName() → the same graph, then without each locant list', () => {
  const molecules = loopMolecules();
  const counts = {
    names: 0, nitrogen: 0, ring: 0, benzamide: 0, benzene: 0, poly: 0, removed: 0, decisive: 0, amidePrefix: 0, templates: 0, later: 0,
  };
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    const key = aromaticKey(mol);
    const all = [naming.name, ...naming.alternatives.map((alt) => alt.name)];
    for (const [i, name] of all.entries()) {
      if (isLaterAmideName(name)) {
        counts.later += 1; // None since phase R-6d3.
        assert.equal(tokenize(name), null, name);
        continue;
      }
      counts.amidePrefix += isR6d2AmideName(name) ? 1 : 0; // R-6d2: `carbamoil`, the acylamino prefixes (read since then).
      counts.templates += isAmideTemplateName(name) ? 1 : 0; // R-6d3: the retained amide names (read since then).
      const ids = tokenize(name);
      assert.ok(ids, `no tiles for ${name}`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, i === 0 ? 'correct' : 'alternative', `${name}: ${verdict.message}`);
      assert.equal(verdict.name, naming.name);
      assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
      counts.names += 1;
      counts.nitrogen += /(?:^|[-,])N[-,]/.test(name) ? 1 : 0;
      counts.ring += /ciclo[a-z-,\d]*carboxamida$/.test(name) ? 1 : 0;
      counts.benzamide += /benzamida$/.test(name) ? 1 : 0;
      counts.benzene += /benceno[a-z-,\d]*carboxamida$/.test(name) ? 1 : 0;
      counts.poly += /(?:di|tri|tetra|penta|hexa)(?:carbox)?amida$/.test(name) ? 1 : 0;
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
  assert.equal(counts.later, 0, report);
}); // End of test 'closed loop over the amide generators…'

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
 * ascending order over the same positions; an `N` stays where it is (it
 * names the nitrogen, not a carbon, and sorts first).
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
 * halogen, `hidroxi`, `oxo`, an alkoxy prefix, `ciano`, `amino`): moved to an
 * end, it never lengthens the chain.
 *
 * @param {object[]} tiles - The parsed tiles.
 * @param {object} node - A substituent node (parse.js).
 * @returns {boolean} True for such a group.
 */
function isHeteroNode(tiles, node) {
  const core = node.type === 'branch' ? node.chain : node;
  const retained = core && core.type === 'retained' ? tiles[core.tile].value : null;
  return ['halogen', 'hydroxy', 'carbonyl'].includes(node.type) || Boolean(core && core.oxi !== null && core.oxi !== undefined)
    || ['cyano', 'aminoGroup'].includes(retained);
}

/**
 * The chain rules a renumbered or moved prefix may meet on an amide's chain:
 * its carbon 1 is the amide's by rule, so renumbering the prefixes alone
 * describes another molecule, whose own trace rule speaks (an acyl prefix
 * moved to the far end lengthens the chain, `4-acetilpentanamida`:
 * LONGER_CHAIN).
 */
const CHAIN_CODES = Object.freeze(['BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS', 'MORE_SUBSTITUENTS',
  'CHAIN_LOCANTS', 'NUMBERING']);

/** The diagnosis codes an `otherName` of each mutation family may give (the trace's own rule for a new molecule). */
const FAMILY_CODES = Object.freeze({
  reversed: CHAIN_CODES,
  reflected: ['RING_NUMBERING'],
  rotated: ['RING_NUMBERING'],
  swapped: [...CHAIN_CODES, 'RING_NUMBERING'],
  unsorted: ['ALPHABETICAL_ORDER'],
  ungrouped: ['UNGROUPED'],
  diBis: ['MULTIPLIER_KIND'],
  toEnd: CHAIN_CODES,
  heteroToEnd: CHAIN_CODES,
  removed: [],
  added: ['NEEDLESS_LOCANTS', 'NUMBERING', 'RING_NUMBERING'],
});

/**
 * The mutations of one amide name: renumbered (`reversed` on a chain,
 * reflected and rotated on a ring, the suffix's locants too; an `N` stays),
 * carbon locants swapped between two single-locant prefixes, prefixes in
 * reverse order, identical prefixes written one by one, di ↔ bis, a
 * single-carbon-locant prefix moved to an end of a chain (a carbon branch:
 * BRANCH_AT_END; a group bonded through a heteroatom: another molecule), a
 * prefix's locants removed, or added (1… and 2…) where it has none.
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
  const carbonLocant = (item) => item.locants.length === 1 && tiles[item.locants[0]].kind === 'num';
  const single = items.filter(carbonLocant);
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
  return out;
} // End of function mutationsOf()

/**
 * Reads every mutation of some amide names: every `otherName` must carry a
 * diagnosis of its family's codes whose step resolves in its explanation, or
 * be one of the amide's own mistakes, a deliberate null of diagnose.js
 * «Amides» (counted by category, amideCategory()); a null with no category is
 * unexpected, and so is a diagnosis on a mutation of an amide category.
 *
 * @param {string[]} names - Amide names (engine names or alternatives).
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
      const category = amideCategory(mutation.ids, verdict);
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
      assert.ok(!/undefined|null|NaN|\[object|grupos? –?OH|–CHO|C=O|COOH|C≡N/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), label);
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return { otherName, codes, own, unexpected };
} // End of function sweep()

/**
 * How many mutations of the amide fixture names give `otherName`, by family
 * (every one diagnosed with one of its family's codes, or a deliberate
 * «Amides» null of its category), and how many of them are the amide's own
 * mistakes by category: 59 `numbering`, a ring amide's groups numbered
 * otherwise by a reflection or a rotation (`benceno-1,5-dicarboxamida`) —
 * deliberate nulls until phase I-52d4. Pinned by the test below.
 */
const FIXTURE_OTHER_NAME = Object.freeze({
  reversed: 2, reflected: 5, rotated: 66, swapped: 0, unsorted: 14, ungrouped: 11, diBis: 11, toEnd: 4, heteroToEnd: 0, removed: 0,
  added: 0,
});
const FIXTURE_OWN = Object.freeze({ numbering: 59 });

test('mutations of every amide fixture name: a diagnosis of the family\'s codes, or a deliberate «Amides» null', async () => {
  // The names of phase R-6d1, the amide as the principal group (also those of the amine, amino, nitrile and acyl round trips,
  // swept here, not there); the amide prefixes written `amino` + `oxo` are swept in reverse-amino.test.js.
  const names = (await readFixtures()).filter((row) => isAmide(row.smiles)).flatMap((row) => row.names).filter(isR6d1AmideName);
  assert.equal(names.length, EXPECTED_NAMES.principal);
  const { otherName, codes, own, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  assert.deepEqual(otherName, { ...FIXTURE_OTHER_NAME });
  assert.deepEqual(own, { ...FIXTURE_OWN });
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_SUBSTITUENTS', 'MULTIPLIER_KIND',
    'RING_NUMBERING', 'UNGROUPED']);
}); // End of test 'mutations of every amide fixture name…'

test('mutations of the generated amides: every otherName is diagnosed or a deliberate «Amides» null, every step resolves', () => {
  const names = [];
  for (const mol of loopMolecules().filter((_, i) => i % 3 === 0)) { // Every generator's amides: chains, rings, benzenes.
    const naming = nameMolecule(mol);
    names.push(...[naming.name, ...naming.alternatives.map((alt) => alt.name)].filter(isR6d1AmideName));
  }
  const { otherName, codes, own, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  const total = Object.values(otherName).reduce((sum, count) => sum + count, 0);
  // The seeds give 480 names and 1362 `otherName`; 374 of them the amide's own mistakes, deliberate nulls until phase I-52d4: 373 a
  // ring amide's groups numbered otherwise (`numbering`), 1 an amide prefix moved onto the chain's end, where it is a second amide
  // group (`count`: `7-amino-3-(2-cianoetanoil)-7-oxoheptanamida`).
  assert.deepEqual([names.length, total, own], [480, 1362, { numbering: 373, count: 1 }]);
  assert.deepEqual([otherName.removed, otherName.added], [0, 0]);
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_SUBSTITUENTS',
    'MULTIPLIER_KIND', 'NUMBERING', 'RING_NUMBERING', 'UNGROUPED']);
}); // End of test 'mutations of the generated amides…'

// ---------------------------------------------------------------------------
// The drawing, the dialog, robustness and time.
// ---------------------------------------------------------------------------

test('«Dibujar» (R-6d1): amide verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const name of ['etanamida', 'butanodiamida', 'prop-2-enamida', 'ciclohexanocarboxamida', 'ciclohexano-1,4-dicarboxamida',
    'benzamida', '4-metilbenzamida', 'N-metiletanamida', 'N,N-dimetiletanamida', 'N-feniletanamida', 'N,N-dimetilbenzamida',
    'N-(2-amino-2-oxoetil)butanamida', 'propano-1-carboxamida', 'met il et ano amida']) {
    const verdict = read(name);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-6d1)…'

test('dialog (R-6d1): the `amida`, `carboxamida` and `benzamida` tiles have tooltips; the `N` tooltip names the amides', () => {
  for (const id of [AMIDA_ID, CARBOXAMIDE_ID, BENZAMIDE_ID, NITROGEN_ID]) {
    assert.ok(TILE_HINTS[id] && TILE_HINTS[id].endsWith('.'), id);
  }
  assert.match(TILE_HINTS[AMIDA_ID], /propanamida; con dos, butanodiamida. Las ramas unidas al nitrógeno llevan «N»: N-metiletanamida/);
  assert.match(TILE_HINTS[CARBOXAMIDE_ID], /ciclohexanocarboxamida, ciclohexano-1,4-dicarboxamida/);
  assert.match(TILE_HINTS[BENZAMIDE_ID], /bencenocarboxamida.*N-metilbenzamida/);
  assert.match(TILE_HINTS[NITROGEN_ID], /amidas, para las ramas unidas a su nitrógeno: N-metiletanamida, N,N-dimetilbenzamida/);
}); // End of test 'dialog (R-6d1)…'

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

test('property (R-6d1): random amide names — any parent, `amida`, `carboxamida` or `benzamida`, `N` anywhere — never crash', () => {
  const random = mulberry32(20261018);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const branches = ['met il', 'et il', 'cloro', 'hidroxi', 'oxo', 'met il oxi', 'START 2 cloro et il END', 'fenil', 'ciclo hex il',
    'isopropil', 'acetil', 'ciano', 'amino', 'met iliden', 'START 2 amino 2 oxo et il END'];
  const parents = ['met ano amida', 'et ano amida', 'but ano di amida', 'pent ano amida', 'prop 2 eno amida', 'ciclo hex ano carboxamida',
    'ciclo hex ano 1 3 di carboxamida', 'benzamida', 'benceno carboxamida', 'benceno 1 4 di carboxamida', 'prop ano 1 carboxamida',
    'ciclo hex ano di carboxamida', 'et ano amina'];
  const multipliers = { 1: '', 2: 'di', 3: 'tri' };
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const prefixes = Array.from({ length: int(0, 2) }, () => {
      const count = int(1, 3);
      const located = random() < 0.7;
      const locants = located ? Array.from({ length: count }, () => (random() < 0.4 ? 'N' : String(int(1, 6)))).join(' ') : '';
      return [locants, multipliers[count], pick(branches)].join(' ');
    });
    const words = [...prefixes, pick(parents)].join(' ');
    const verdict = readName(seq(words), { budget: { ms: 200 } });
    kinds.set(verdict.kind, (kinds.get(verdict.kind) || 0) + 1);
    assert.ok(!/undefined|NaN|\[object/.test(verdict.message), `${words}: ${verdict.message}`);
    if (verdict.draw) {
      assert.ok(verdict.molecule && verdict.name, words);
    }
    if (verdict.kind === 'otherName' && verdict.diagnosis) {
      assert.ok(!/undefined|null|NaN|\[object|grupos? –?OH/.test(verdict.diagnosis.message), `${words}: ${verdict.diagnosis.message}`);
    }
  } // End of the loop over the random names
  for (const kind of ['correct', 'otherName', 'ambiguous', 'invalid', 'outOfScope']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-6d1): random amide names…'

test('time budget: amide readName() calls, with their diagnosis, well within budget', () => {
  const names = ['butanodiamida', 'N,2-dimetilpropanamida', 'N-etil-N-metilpropanamida', 'N-etil-4-metilbenzamida',
    'N-etil-2-metilciclohexano-1-carboxamida', 'met il et ano amida', 'di met il et ano amida', 'met il prop ano amida',
    'met il ciclo hex ano carboxamida', 'met il benzamida', 'propano-1-carboxamida', 'ciclohexano-1,5-dicarboxamida'];
  names.forEach((name) => read(name)); // Warm-up.
  for (const name of names) {
    const start = performance.now();
    const verdict = read(name);
    const ms = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', name);
    assert.ok(ms < PER_NAME_BUDGET_MS, `${name}: ${ms.toFixed(1)} ms`);
  }
}); // End of test 'time budget…'
