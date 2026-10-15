/**
 * @file Unit tests for the ester prefixes of «¿Cómo se dibuja?» (src/reverse/,
 * design.md §13.4 I-39c, I-40d, I-45c, §15.5.2, §15.5.3, §15.7, §15.8 R-6a;
 * phase I-52a2b, R-6a2b): an ester that is not the principal group — beside an
 * acid, the only group the engine puts above an ester — written as a prefix,
 * composed from the tiles that exist, as the forward engine writes it
 * (render.js alkoxyTokens(), alkoxycarbonylTokens()): an acyloxy prefix is an
 * acyl branch closed by `oxi` (`acetil oxi` → `(acetiloxi)`, `prop ano oil
 * oxi` → `(propanoiloxi)`, `benzoil oxi`, `ciclo hex ano carbonil oxi`), and
 * an alkoxycarbonyl prefix an alkoxy branch closed by `oxi` and `carbonil`
 * (`met il oxi carbonil` → `(metoxicarbonil)`, `prop ano 2 il oxi carbonil` →
 * `[(propan-2-iloxi)carbonil]`), both before the END of a compound branch
 * (`[(2-metilpropanoil)oxi]`, `[(2-cloroetoxi)carbonil]`). Parser (the trees,
 * malformed compositions with their tile ranges and hints), assembler (every
 * form against the engine's own text, the inner marks one level inside),
 * tokenizer, interpreter and builder (the ether oxygen after the acyl C=O, the
 * C=O carbon after the alkoxy oxygen, VALENCE), search (left-out locants of
 * and inside the prefixes), readName() verdicts with the molecule each name
 * describes (compared by aromatic key with a SMILES), the diagnosis of the
 * rules that hold for an ester prefix and of an ester prefix's own mistakes,
 * each with its category read independently (deliberate «Esters» nulls of
 * diagnose.js until phase I-52a3a, which names `inChain` and `seniority`,
 * and phase I-52a3b, which names `words`),
 * the fixture names with an ester prefix, a closed loop over the acids the
 * ester generators write (scripts/oracle/generate.mjs: the molecules the
 * ester closed loop of reverse-esters.test.js leaves out), the diagnosis
 * sweeps, the ordered drawing, the tooltips, robustness and time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import {
  assemble, esterPrefixKind, esterInnerEnclosed, enclosureLevel, isCompoundAlkoxy, isEnclosed,
} from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build, specAtoms, specCarbons, ownPrefixAtoms } from '../../src/reverse/build.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { ALKOXY_ID, RING_CARBONYL_ID, isAcyloxyHead, tileById } from '../../src/reverse/tiles.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { TILE_HINTS } from '../../src/ui/name-builder.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { PREFIX_STYLES, nameSubstituent } from '../../src/naming/substituent.js';
import { generateEsterPrefixes, generateRingEsters } from '../../scripts/oracle/generate.mjs';
import { seq, readFixtures, leafIndices, isAcid, isAcidMolecule, isAcidName, ESTER_PREFIX } from './reverse-words.js';

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
    ids = tokenize(name); // A name text: `ácido 2-(acetiloxi)etanoico`.
  }
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
 * The errors of a parse of tile words as `CODE[from,to)` strings.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {string[]} The errors.
 */
function errorsOf(words) {
  return parse(seq(words)).errors.map((e) => `${e.code}[${e.from},${e.to})`);
}

/**
 * The message of the first parse error with a code.
 *
 * @param {string} words - Space-separated tile words.
 * @param {string} code - The error code.
 * @returns {string} The message.
 */
function messageOf(words, code) {
  return parse(seq(words)).errors.find((e) => e.code === code).message;
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
 * The engine's names of a SMILES in every prefix style: each style's name
 * and alternatives.
 *
 * @param {string} smiles - The SMILES.
 * @returns {string[]} The names.
 */
function namesOf(smiles) {
  return PREFIX_STYLES.flatMap((prefixStyle) => {
    const naming = nameMolecule(parseSmiles(smiles), { prefixStyle });
    assert.ok(naming.ok, smiles);
    return [naming.name, ...naming.alternatives.map((alt) => alt.name)];
  });
}

/**
 * The bonds of each oxygen of a molecule: its neighbours' elements and the
 * bond orders (`C1 C1`: an ether or bridge oxygen; `C2`: a C=O; `C1`: an
 * OH), the oxygens sorted.
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

/**
 * Every ester prefix form as tile words, the SMILES of a molecule whose
 * engine names include it (in some prefix style) and the name.
 */
const FORMS = Object.freeze([
  // Acyloxy prefixes: an acyl branch closed by `oxi`.
  ['ácido 2 acetil oxi et ano oico', 'CC(=O)OCC(=O)O', 'ácido 2-(acetiloxi)etanoico'],
  ['ácido 2 formil oxi prop ano oico', 'O=COC(C)C(=O)O', 'ácido 2-(formiloxi)propanoico'],
  ['ácido 3 prop ano oil oxi prop ano oico', 'CCC(=O)OCCC(=O)O', 'ácido 3-(propanoiloxi)propanoico'],
  ['ácido 2 START 2 met il prop ano oil oxi END et ano oico', 'CC(C)C(=O)OCC(=O)O', 'ácido 2-[(2-metilpropanoil)oxi]etanoico'],
  ['ácido 3 prop 2 eno oil oxi prop ano oico', 'C=CC(=O)OCCC(=O)O', 'ácido 3-[(prop-2-enoil)oxi]propanoico'],
  ['ácido 2 START 2 cloro et ano oil oxi END et ano oico', 'ClCC(=O)OCC(=O)O', 'ácido 2-[(2-cloroetanoil)oxi]etanoico'],
  ['ácido 2 2 bis acetil oxi et ano oico', 'OC(=O)C(OC(C)=O)OC(C)=O', 'ácido 2,2-bis(acetiloxi)etanoico'],
  ['ácido 2 START 2 acetil oxi et ano oil oxi END et ano oico', 'OC(=O)COC(=O)COC(=O)C', 'ácido 2-{[2-(acetiloxi)etanoil]oxi}etanoico'],
  ['ácido 2 START acetil oxi met il END pent 4 ino oico', 'CC(=O)OCC(CC#C)C(=O)O', 'ácido 2-[(acetiloxi)metil]pent-4-inoico'],
  ['ácido 2 benzoil oxi et ano oico', 'O=C(OCC(=O)O)C1=CC=CC=C1', 'ácido 2-(benzoiloxi)etanoico'],
  ['ácido 2 ciclo hex ano carbonil oxi et ano oico', 'O=C(OCC(=O)O)C1CCCCC1', 'ácido 2-[(ciclohexanocarbonil)oxi]etanoico'],
  ['ácido 2 START 4 met il benzoil oxi END et ano oico', 'CC1=CC=C(C=C1)C(=O)OCC(=O)O', 'ácido 2-[(4-metilbenzoil)oxi]etanoico'],
  ['ácido 2 START 4 acetil oxi ciclo hex il END et ano oico', 'OC(=O)CC1CCC(OC(C)=O)CC1', 'ácido 2-[4-(acetiloxi)ciclohexil]etanoico'],
  ['ácido 4 acetil oxi ciclo hex ano 1 carboxílico', 'CC(=O)OC1CCC(C(=O)O)CC1', 'ácido 4-(acetiloxi)ciclohexano-1-carboxílico'],
  // Alkoxycarbonyl prefixes: an alkoxy branch closed by `oxi` and `carbonil`.
  ['ácido 3 met il oxi carbonil pent ano di oico', 'OC(=O)CC(C(=O)OC)CC(=O)O', 'ácido 3-(metoxicarbonil)pentanodioico'],
  ['ácido 3 isopropil oxi carbonil pent ano di oico', 'OC(=O)CC(C(=O)OC(C)C)CC(=O)O', 'ácido 3-(isopropoxicarbonil)pentanodioico'],
  ['ácido 3 prop ano 2 il oxi carbonil pent ano di oico', 'OC(=O)CC(C(=O)OC(C)C)CC(=O)O',
    'ácido 3-[(propan-2-iloxi)carbonil]pentanodioico'],
  ['ácido 3 START 1 met il et il oxi carbonil END pent ano di oico', 'OC(=O)CC(C(=O)OC(C)C)CC(=O)O',
    'ácido 3-[(1-metiletoxi)carbonil]pentanodioico'],
  ['ácido 3 START 2 cloro et il oxi carbonil END pent ano di oico', 'OC(=O)CC(C(=O)OCCCl)CC(=O)O',
    'ácido 3-[(2-cloroetoxi)carbonil]pentanodioico'],
  ['ácido 3 START 2 met il prop il oxi carbonil END pent ano di oico', 'OC(=O)CC(C(=O)OCC(C)C)CC(=O)O',
    'ácido 3-[(2-metilpropoxi)carbonil]pentanodioico'],
  ['ácido 2 2 bis met il oxi carbonil pent ano di oico', 'OC(=O)C(C(=O)OC)(C(=O)OC)CCC(=O)O', 'ácido 2,2-bis(metoxicarbonil)pentanodioico'],
  ['ácido 3 fenil oxi carbonil pent ano di oico', 'OC(=O)CC(C(=O)OC1=CC=CC=C1)CC(=O)O', 'ácido 3-(fenoxicarbonil)pentanodioico'],
  ['ácido 3 START 4 met il fenil oxi carbonil END pent ano di oico', 'OC(=O)CC(C(=O)OC1=CC=C(C)C=C1)CC(=O)O',
    'ácido 3-[(4-metilfenoxi)carbonil]pentanodioico'],
  ['ácido 3 ciclo hex il oxi carbonil pent ano di oico', 'OC(=O)CC(C(=O)OC1CCCCC1)CC(=O)O',
    'ácido 3-[(ciclohexiloxi)carbonil]pentanodioico'],
  ['ácido 3 pent il oxi carbonil pent ano di oico', 'OC(=O)CC(C(=O)OCCCCC)CC(=O)O', 'ácido 3-[(pentiloxi)carbonil]pentanodioico'],
  ['ácido 3 tert-butil oxi carbonil pent ano di oico', 'OC(=O)CC(C(=O)OC(C)(C)C)CC(=O)O', 'ácido 3-(tert-butoxicarbonil)pentanodioico'],
  // Rule 5's hyphen between a multiplier and `tert-`, an opening mark between them, as render.js writes it.
  ['ácido 2 3 bis tert-butil oxi carbonil pent ano di oico', 'OC(=O)CC(C(=O)OC(C)(C)C)C(C(=O)OC(C)(C)C)C(=O)O',
    'ácido 2,3-bis-(tert-butoxicarbonil)pentanodioico'],
  ['ácido 3 prop 2 eno 1 il oxi carbonil pent ano di oico', 'OC(=O)CC(C(=O)OCC=C)CC(=O)O',
    'ácido 3-[(prop-2-en-1-iloxi)carbonil]pentanodioico'],
  ['ácido 3 START 2 met il oxi 2 oxo et il oxi carbonil END pent ano di oico', 'OC(=O)CC(C(=O)OCC(=O)OC)CC(=O)O',
    'ácido 3-[(2-metoxi-2-oxoetoxi)carbonil]pentanodioico'],
  ['ácido 4 met il oxi carbonil ciclo hex ano 1 carboxílico', 'COC(=O)C1CCC(C(=O)O)CC1', 'ácido 4-(metoxicarbonil)ciclohexano-1-carboxílico'],
  // Both, nested in compound branches.
  ['ácido 2 START 3 hidroxi 2 START 4 hidroxi but ano oil oxi END prop il END 2 START hidroxi met il END prop ano di oico',
    'OC(=O)C(CO)(CC(OC(=O)CCCO)CO)C(=O)O', 'ácido 2-{3-hidroxi-2-[(4-hidroxibutanoil)oxi]propil}-2-(hidroximetil)propanodioico'],
]);

// ---------------------------------------------------------------------------
// Parser.
// ---------------------------------------------------------------------------

test('parser (R-6a2b): `oxi` after an acyl branch, `carbonil` after `oxi`; the trees stay lossless', () => {
  // 0:ácido 1:2 2:acetil 3:oxi 4:et 5:ano 6:oico
  let { tree, errors } = parse(seq('ácido 2 acetil oxi et ano oico'));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.items[0].substituent, { type: 'retained', tile: 2, oxi: 3, range: [2, 4] });
  // 0:ácido 1:3 2:prop 3:ano 4:oil 5:oxi …
  ({ tree, errors } = parse(seq('ácido 3 prop ano oil oxi prop ano oico')));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.items[0].substituent, {
    type: 'chain', ring: null, root: 2, ano: 3, segments: [], fvLocants: [], fv: 4, oxi: 5, range: [2, 6],
  });
  // 0:ácido 1:3 2:met 3:il 4:oxi 5:carbonil … : `carbonil` a field of the chain only when its tile follows `oxi`.
  ({ tree, errors } = parse(seq('ácido 3 met il oxi carbonil pent ano di oico')));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.items[0].substituent, {
    type: 'chain', ring: null, root: 2, ano: null, segments: [], fvLocants: [], fv: 3, oxi: 4, carbonil: 5, range: [2, 6],
  });
  ({ tree, errors } = parse(seq('ácido 3 isopropil oxi carbonil pent ano di oico')));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.items[0].substituent, { type: 'retained', tile: 2, oxi: 3, carbonil: 4, range: [2, 5] });
  // In a compound branch, both go before its END: its own chain carries them.
  ({ tree, errors } = parse(seq('ácido 2 START 2 met il prop ano oil oxi END et ano oico')));
  assert.deepEqual(errors, []);
  const branch = tree.items[0].substituent;
  assert.deepEqual([branch.type, branch.items.length, branch.chain.fv, branch.chain.oxi, branch.end], ['branch', 1, 8, 9, 10]);
  ({ tree, errors } = parse(seq('ácido 3 START 2 cloro et il oxi carbonil END pent ano di oico')));
  assert.deepEqual(errors, []);
  assert.deepEqual([tree.items[0].substituent.chain.oxi, tree.items[0].substituent.chain.carbonil], [7, 8]);
  // An alkoxy prefix keeps its shape: no `carbonil` field.
  ({ tree } = parse(seq('1 met il oxi prop ano')));
  assert.equal('carbonil' in tree.items[0].substituent, false);
  for (const [words] of FORMS) {
    const parsed = parse(seq(words));
    assert.deepEqual(parsed.errors, [], words);
    assert.deepEqual(leafIndices(parsed.tree).sort((a, b) => a - b), parsed.tree.tiles.map((_, i) => i), words);
  }
  // The heads of an acyloxy prefix (tiles.js isAcyloxyHead()): the acyl tiles and `formil`, never `carboxi` or `isopropil`.
  assert.deepEqual(['acetil', 'benzoil', 'formil', 'oil', 'carbonil', 'carboxi', 'isopropil', 'il'].map((w) => isAcyloxyHead(
    tileById(seq(w)[0]))), [true, true, true, true, true, false, false, false]);
}); // End of test 'parser (R-6a2b): `oxi` after an acyl branch…'

test('parser (R-6a2b): malformed compositions are errors with their tile ranges and hints', () => {
  const lead = 'Esta ficha no puede ir aquí: ';
  // `carbonil` after an acyloxy prefix: the oxygen between two C=O groups (an anhydride).
  assert.deepEqual(errorsOf('acetil oxi carbonil met ano'), ['TILE_ORDER[2,3)']);
  assert.equal(messageOf('acetil oxi carbonil met ano', 'TILE_ORDER'), `${lead}«carbonil» no va detrás de «acetil» y «oxi»: el `
    + 'oxígeno quedaría entre dos grupos C=O, y eso no es un éster. Un éster como rama es (acetiloxi) o (metoxicarbonil).');
  assert.deepEqual(errorsOf('ácido 2 prop ano oil oxi carbonil et ano oico'), ['TILE_ORDER[6,7)']);
  assert.match(messageOf('ácido 2 prop ano oil oxi carbonil et ano oico', 'TILE_ORDER'), /no va detrás de «oil» y «oxi»/);
  // `carbonil` after the END of a compound branch: it goes inside, after `oxi`.
  assert.deepEqual(errorsOf('ácido 2 START 2 cloro et il oxi END carbonil et ano oico'), ['TILE_ORDER[9,10)']);
  assert.equal(messageOf('ácido 2 START 2 cloro et il oxi END carbonil et ano oico', 'TILE_ORDER'), `${lead}en una rama compuesta, `
    + '«carbonil» va dentro de ella, antes de cerrarla; detrás de «oxi» forma un éster como rama: [(2-cloroetoxi)carbonil].');
  // `oxi` and `carbonil` with nothing before them: each out of place.
  assert.deepEqual(errorsOf('oxi carbonil et ano'), ['TILE_ORDER[0,1)', 'TILE_ORDER[1,2)']);
  // After the parent: tiles out of place.
  assert.ok(errorsOf('ácido met ano oxi carbonil').includes('TILE_ORDER[3,5)'));
  // `oxi` after `carboxi` stays an error (a carbonic acid's ester); after a double bond too, `carbonil` then kept silently.
  assert.deepEqual(errorsOf('carboxi oxi met ano'), ['TILE_ORDER[1,2)']);
  assert.deepEqual(errorsOf('met iliden oxi carbonil et ano'), ['TILE_ORDER[2,3)']);
  // `oxi` after a compound branch's END: it goes inside, before END.
  assert.deepEqual(errorsOf('START met il oxi carbonil END oxi et ano'), ['TILE_ORDER[6,7)']);
  // Two numbers without a multiplier: an ester prefix is compound, so `bis`.
  assert.deepEqual(errorsOf('ácido 2 2 acetil oxi et ano oico'), ['LOCANT_COUNT[1,3)']);
  assert.equal(messageOf('ácido 2 2 acetil oxi et ano oico', 'LOCANT_COUNT'), 'Con dos números hace falta «bis».');
  assert.equal(messageOf('ácido 2 2 met il oxi carbonil pent ano di oico', 'LOCANT_COUNT'), 'Con dos números hace falta «bis».');
  // A name that ends in an ester prefix; an ester prefix as a group of an ether's class name.
  assert.deepEqual(errorsOf('ácido 3 met il oxi carbonil'), ['ENDS_WITH_BRANCH[1,6)']);
  assert.equal(messageOf('ácido 3 met il oxi carbonil', 'ENDS_WITH_BRANCH'), 'El nombre acaba en un grupo («(metoxicarbonil)»): falta '
    + 'la cadena principal detrás.');
  assert.deepEqual(errorsOf('acetil oxi met il éter'), ['TILE_ORDER[1,2)']);
  assert.match(messageOf('acetil oxi met il éter', 'TILE_ORDER'), /en un nombre con «éter», el oxígeno ya lo dice «éter»/);
}); // End of test 'parser (R-6a2b): malformed compositions…'

// ---------------------------------------------------------------------------
// Assembler and tokenizer.
// ---------------------------------------------------------------------------


test('assembler (R-6a2b): every ester prefix form is the forward engine\'s own text; the tokenizer reads it back', () => {
  for (const [words, smiles, name] of FORMS) {
    assert.equal(text(words), name, words);
    assert.ok(namesOf(smiles).includes(name), `${name}: not among the engine's names of ${smiles}`);
    assert.deepEqual(tokenize(name), seq(words), name);
  }
}); // End of test 'assembler (R-6a2b): every ester prefix form…'

test('assembler (R-6a2b, design.md §15.5.2 rule 11): the inner marks one level inside, automatic; bis; one span per tile', () => {
  /**
   * The spans of tile words as `text@tile` strings (`@` alone for automatic text).
   *
   * @param {string} words - Space-separated tile words.
   * @returns {string[]} The spans.
   */
  const spansOf = (words) => {
    const out = assemble(parse(seq(words)).tree);
    assert.equal(out.spans.map((s) => out.text.slice(s.from, s.to)).join(''), out.text, words);
    return out.spans.map((s) => `${out.text.slice(s.from, s.to)}@${s.tile === null ? '' : s.tile}`);
  };
  // A compound branch: START and END carry the outer marks, the inner ones are automatic, the inner `)` right before `oxi`.
  assert.deepEqual(spansOf('ácido 2 START 2 met il prop ano oil oxi END et ano oico'), ['ácido@0', ' @', '2@1', '-@', '[@2', '(@',
    '2@3', '-@', 'met@4', 'il@5', 'prop@6', 'an@7', 'oil@8', ')@', 'oxi@9', ']@10', 'et@11', 'an@12', 'oico@13']);
  // A simple branch: both pairs of marks automatic; the inner `)` right before `carbonil`.
  assert.deepEqual(spansOf('ácido 3 prop ano 2 il oxi carbonil pent ano di oico'), ['ácido@0', ' @', '3@1', '-@', '[@', '(@', 'prop@2',
    'an@3', '-@', '2@4', '-@', 'il@5', 'oxi@6', ')@', 'carbonil@7', ']@', 'pent@8', 'ano@9', 'di@10', 'oico@11']);
  // Rule 5's hyphen after `bis` before a mark whose first word is `tert-` (render.js groupTokens()), automatic text.
  assert.deepEqual(spansOf('ácido 2 3 bis tert-butil oxi carbonil pent ano di oico').slice(6, 12), ['bis@3', '-@', '(@', 'tert-but@4',
    'oxi@5', 'carbonil@6']);
  // The same hyphen before a crowded alkoxy prefix's mark (R-5b), which the engine writes and the tiles could not read before.
  const crowded = 'ácido 4-[bis-(tert-butoxi)fluorometil]hexanoico';
  assert.ok(namesOf('OC(=O)CCC(CC)C(F)(OC(C)(C)C)OC(C)(C)C').includes(crowded));
  assert.deepEqual(tokenize(crowded), seq('ácido 4 START bis tert-butil oxi fluoro met il END hex ano oico'));
  assert.equal(read(crowded).kind, 'correct');
  // The contracted alkoxy part: its `il` writes nothing, no inner marks.
  assert.deepEqual(spansOf('ácido 3 met il oxi carbonil pent ano di oico').slice(2, 10), ['3@1', '-@', '(@', 'met@2', '@3', 'oxi@4',
    'carbonil@5', ')@']);
  // The kinds and levels (assemble.js esterPrefixKind(), esterInnerEnclosed(), enclosureLevel(), isEnclosed(), isCompoundAlkoxy()).
  for (const [words, kind, inner, level] of [
    ['ácido 2 acetil oxi et ano oico', 'acyloxy', false, 0], ['ácido 3 prop 2 eno oil oxi prop ano oico', 'acyloxy', true, 1],
    ['ácido 2 ciclo hex ano carbonil oxi et ano oico', 'acyloxy', true, 1],
    ['ácido 2 START 2 acetil oxi et ano oil oxi END et ano oico', 'acyloxy', true, 2],
    ['ácido 3 met il oxi carbonil pent ano di oico', 'alkoxycarbonyl', false, 0],
    ['ácido 3 fenil oxi carbonil pent ano di oico', 'alkoxycarbonyl', false, 0],
    ['ácido 3 pent il oxi carbonil pent ano di oico', 'alkoxycarbonyl', true, 1],
    ['ácido 3 START 2 cloro et il oxi carbonil END pent ano di oico', 'alkoxycarbonyl', true, 1],
    ['ácido 2 met il oxi et ano oico', null, false, 0], ['ácido 2 pent il oxi et ano oico', null, false, 0],
  ]) {
    const { tree } = parse(seq(words));
    const node = tree.items[0].substituent;
    assert.deepEqual([esterPrefixKind(tree.tiles, node), esterInnerEnclosed(tree.tiles, node), enclosureLevel(tree.tiles, node)],
      [kind, inner, level], words);
    if (kind) {
      assert.ok(isEnclosed(tree.tiles, node) && isCompoundAlkoxy(tree.tiles, node), words);
    }
  } // End of the loop over the kinds
  // The student's multiplier as chosen; the engine writes `bis`.
  assert.equal(text('ácido 2 2 di acetil oxi et ano oico'), 'ácido 2,2-di(acetiloxi)etanoico');
  assert.equal(text('ácido 2 2 di met il oxi carbonil pent ano di oico'), 'ácido 2,2-di(metoxicarbonil)pentanodioico');
  // A stray `carbonil` (after the END of a compound branch) is an ending, as on its tile.
  const stray = assemble(parse(seq('ácido 2 START 2 cloro et il oxi END carbonil et ano oico')).tree).spans.find((sp) => sp.tile === 9);
  assert.equal(stray.kind, 'ending');
  // An unfinished compound branch assembles too: its inner part is closed before `oxi`, the outer mark pending.
  assert.equal(text('ácido 2 START 2 met il prop ano oil oxi'), 'ácido 2-[(2-metilpropanoil)oxi');
}); // End of test 'assembler (R-6a2b, design.md §15.5.2 rule 11)…'

test('tokenizer (R-6a2b): forms the engine never writes never read', () => {
  for (const name of ['ácido 2-acetoxietanoico', 'ácido 2-acetiloxietanoico', 'ácido 2-[(acetil)oxi]etanoico',
    'ácido 2-(propanoil)oxietanoico', 'ácido 2-[(propanoil)oxi]etanoico', 'ácido 2-(prop-2-enoiloxi)etanoico',
    'ácido 3-[(metoxi)carbonil]pentanodioico', 'ácido 3-metoxicarbonilpentanodioico', 'ácido 3-(propan-2-iloxicarbonil)pentanodioico',
    'ácido 2-[(acetiloxi)carbonil]etanoico', 'ácido 2-(acetiloxicarbonil)etanoico', 'ácido 3-(metoxicarbonilo)pentanodioico',
    'ácido 2-(2-metilpropanoiloxi)etanoico', 'ácido 2-[(2-metilpropanoiloxi)]etanoico', 'ácido 3-(carboniloxi)pentanodioico']) {
    assert.equal(tokenize(name), null, name);
  }
  // The student's own words read when the assembler writes them so, and are judged.
  assert.deepEqual(tokenize('ácido 2-(etanoiloxi)etanoico'), seq('ácido 2 et ano oil oxi et ano oico'));
  assert.deepEqual(tokenize('ácido 2,2-di(acetiloxi)etanoico'), seq('ácido 2 2 di acetil oxi et ano oico'));
}); // End of test 'tokenizer (R-6a2b)…'

// ---------------------------------------------------------------------------
// Interpreter, builder and search.
// ---------------------------------------------------------------------------

test('interpreter (R-6a2b): an acyloxy prefix is its acyl branch with `alkoxy`; an alkoxycarbonyl prefix, `alkoxycarbonyl` too', () => {
  /**
   * The flags of the first prefix's substituent.
   *
   * @param {string} words - Tile words.
   * @returns {Array} [kind, retained, length, alkoxy, acyl, alkoxycarbonyl].
   */
  const flags = (words) => {
    const sub = specOf(words).prefixes[0].substituent;
    return [sub.kind, sub.retained, sub.length, sub.alkoxy, sub.acyl, Boolean(sub.alkoxycarbonyl)];
  };
  assert.deepEqual(flags('ácido 2 acetil oxi et ano oico'), ['retained', 'acetyl', null, true, true, false]);
  assert.deepEqual(flags('ácido 2 formil oxi prop ano oico'), ['retained', 'formyl', null, true, false, false]);
  assert.deepEqual(flags('ácido 3 prop ano oil oxi prop ano oico'), ['chain', null, 3, true, true, false]);
  assert.deepEqual(flags('ácido 2 benzoil oxi et ano oico'), ['phenyl', 'benzoyl', 6, true, true, false]);
  assert.deepEqual(flags('ácido 2 ciclo hex ano carbonil oxi et ano oico'), ['ring', null, 6, true, true, false]);
  assert.deepEqual(flags('ácido 3 met il oxi carbonil pent ano di oico'), ['chain', null, 1, true, false, true]);
  assert.deepEqual(flags('ácido 3 isopropil oxi carbonil pent ano di oico'), ['retained', 'isopropyl', null, true, false, true]);
  assert.deepEqual(flags('ácido 3 fenil oxi carbonil pent ano di oico'), ['phenyl', 'phenyl', 6, true, false, true]);
  assert.deepEqual(flags('ácido 3 START 2 cloro et il oxi carbonil END pent ano di oico'), ['chain', null, 2, true, false, true]);
  // The free valence: carbon 1 by rule, or the locant before `il` (`propan-2-iloxi`).
  let spec = specOf('ácido 3 prop ano 2 il oxi carbonil pent ano di oico');
  assert.deepEqual([spec.prefixes[0].substituent.freeValence.slot.kind, spec.prefixes[0].substituent.freeValence.slot.value],
    ['supplied', 2]);
  // An alkoxy prefix has no `alkoxycarbonyl` field at all (every other spec keeps its shape).
  assert.equal('alkoxycarbonyl' in specOf('ácido 2 met il oxi et ano oico').prefixes[0].substituent, false);
  // Left out: the prefix's own slot on the parent, and the slots inside it.
  spec = specOf('ácido met il oxi carbonil pent ano di oico');
  assert.deepEqual(spec.leftOut.map((slot) => [slot.role, slot.domain]), [['carbon', [1, 5]]]);
  spec = specOf('ácido 2 START cloro et il oxi carbonil END et ano oico');
  assert.deepEqual(spec.leftOut.map((slot) => [slot.role, slot.domain]), [['carbon', [1, 2]]]);
}); // End of test 'interpreter (R-6a2b)…'

test('builder (R-6a2b): the ether oxygen after the acyl C=O, the C=O carbon after the alkoxy oxygen; counts; VALENCE', () => {
  for (const [words, smiles] of FORMS) {
    const formSpec = specOf(words);
    // A one-carbon branch's prefix cites no locant (`(hidroximetil)`): its one value.
    assert.ok(formSpec.leftOut.every((slot) => slot.domain[0] === slot.domain[1]), words);
    const built = build(formSpec, formSpec.leftOut.map((slot) => slot.domain[0]));
    assert.ok(built.ok, words);
    assert.equal(aromaticKey(built.molecule), keyOf(smiles), `${words} builds another graph`);
  }
  // `acetiloxi`: the occurrence's attachment is the ether oxygen; `metoxicarbonil`: the C=O carbon.
  let built = build(specOf('ácido 2 acetil oxi et ano oico'));
  assert.deepEqual(oxygenBonds(built.molecule), ['C1', 'C1 C1', 'C2', 'C2']);
  assert.equal(built.molecule.atoms.get(built.prefixAtoms[0].attachment).element, 'O');
  built = build(specOf('ácido 3 met il oxi carbonil pent ano di oico'));
  assert.deepEqual(oxygenBonds(built.molecule), ['C1', 'C1', 'C1 C1', 'C2', 'C2', 'C2']);
  const x = built.prefixAtoms[0].attachment;
  assert.equal(built.molecule.atoms.get(x).element, 'C');
  assert.deepEqual(built.prefixAtoms[0].atoms.length, 4, 'the methyl, the ether oxygen, the C=O carbon and its =O');
  // Carbons and heavy atoms for the caps: pentanedioic acid (5 C, 4 O) + methoxycarbonyl (2 C, 2 O).
  let spec = specOf('ácido 3 met il oxi carbonil pent ano di oico');
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [7, 13]);
  spec = specOf('ácido 2 START 2 met il prop ano oil oxi END et ano oico'); // ethanoic acid (2 C, 2 O) + the acyloxy (4 C, 2 O)
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [6, 10]);
  spec = specOf('ácido 3 isopropil oxi carbonil pent ano di oico');
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [9, 15]);
  // A compound branch with an ester prefix of its own: build.js ownPrefixAtoms() cuts it from the branch's atoms.
  spec = specOf('ácido 2 START acetil oxi met il END pent 4 ino oico');
  built = build(spec, [1]); // The one-carbon branch's prefix cites no locant: its one value.
  assert.deepEqual(spec.leftOut.map((slot) => slot.domain), [[1, 1]]);
  const sub = spec.prefixes[0].substituent;
  const own = ownPrefixAtoms(sub, built.prefixAtoms[0].atoms);
  assert.deepEqual(own.map((slices) => slices.map((slice) => slice.map((id) => built.molecule.atoms.get(id).element).sort().join(''))),
    [['CCOO']]);
  // VALENCE: four ester prefixes on a carbon that also carries the –COOH's carbon.
  const tooMany = build(specOf('ácido 2 2 2 2 tetrakis acetil oxi et ano oico'));
  assert.deepEqual([tooMany.ok, tooMany.error.code, tooMany.error.message, tooMany.error.tiles], [false, 'VALENCE',
    'El carbono 2 tendría 5 enlaces, y un carbono solo puede tener 4.', [4, 5]]);
  assert.equal(read('ácido 2 2 2 tris acetil oxi et ano oico').kind, 'correct');
}); // End of test 'builder (R-6a2b)…'

test('search (R-6a2b): left-out locants of and inside the ester prefixes; ambiguous and filled lists; the budget', () => {
  let verdict = read('ácido acetil oxi et ano oico');
  assert.deepEqual([verdict.kind, verdict.filled], ['missingLocants', 'ácido 2-(acetiloxi)etanoico']);
  verdict = read('ácido met il oxi carbonil but ano di oico');
  assert.deepEqual([verdict.kind, verdict.filled], ['missingLocants', 'ácido 2-(metoxicarbonil)butanodioico']);
  verdict = read('ácido acetil oxi prop ano oico');
  assert.deepEqual([verdict.kind, verdict.message], ['ambiguous', 'Faltan números: puede ser ácido 2-(acetiloxi)propanoico o ácido '
    + '3-(acetiloxi)propanoico.']);
  verdict = read('ácido met il oxi carbonil pent ano di oico');
  assert.deepEqual([verdict.kind, verdict.candidates.length], ['ambiguous', 2]);
  verdict = read('ácido 4 acetil oxi ciclo hex ano carboxílico');
  assert.deepEqual([verdict.kind, verdict.filled], ['missingLocants', 'ácido 4-(acetiloxi)ciclohexano-1-carboxílico']);
  // Inside the prefix: the acyl part's own locants (3-methylpropanoyl is the butanoyl the engine names otherwise), the alkoxy
  // part's own.
  verdict = read('ácido 2 START met il prop ano oil oxi END et ano oico');
  assert.deepEqual([verdict.kind, verdict.filled], ['missingLocants', 'ácido 2-[(2-metilpropanoil)oxi]etanoico']);
  verdict = read('ácido 3 START cloro et il oxi carbonil END pent ano di oico');
  assert.deepEqual([verdict.kind, verdict.message], ['ambiguous', 'Faltan números: puede ser ácido '
    + '3-[(1-cloroetoxi)carbonil]pentanodioico o ácido 3-[(2-cloroetoxi)carbonil]pentanodioico.']);
  // The budget: no claim.
  assert.equal(read('ácido acetil oxi prop ano oico', { budget: { placements: 1 } }).kind, 'incomplete');
}); // End of test 'search (R-6a2b)…'

// ---------------------------------------------------------------------------
// readName() verdicts.
// ---------------------------------------------------------------------------

/**
 * Names with an ester prefix beyond the forms above: tile words or a name,
 * the SMILES of the molecule it describes (null when nothing is drawn), the
 * verdict and the engine's name.
 */
const CASES = Object.freeze([
  ['ácido 2-(acetiloxi)-3-metilbutanoico', 'CC(C)C(OC(C)=O)C(=O)O', 'correct', 'ácido 2-(acetiloxi)-3-metilbutanoico'],
  ['ácido 2,2,2-tris(acetiloxi)etanoico', 'OC(=O)C(OC(C)=O)(OC(C)=O)OC(C)=O', 'correct', 'ácido 2,2,2-tris(acetiloxi)etanoico'],
  ['ácido 4-(acetiloxi)-3-(metoxicarbonil)butanoico', 'CC(=O)OCC(C(=O)OC)CC(=O)O', null, null],
  // The engine names some molecules otherwise: the ester carbon in the chain, or an ester the principal group.
  ['ácido 3-(metoxicarbonil)propanoico', 'COC(=O)CCC(=O)O', 'otherName', 'ácido 4-metoxi-4-oxobutanoico'],
  ['(acetiloxi)metano', 'CC(=O)OC', 'otherName', 'etanoato de metilo'],
  ['2-(acetiloxi)heptanal', 'CCCCCC(OC(C)=O)C=O', 'otherName', 'etanoato de 1-oxoheptan-2-ilo'],
  ['(benzoiloxi)benceno', 'O=C(OC1=CC=CC=C1)C1=CC=CC=C1', 'otherName', 'benzoato de fenilo'],
  ['(acetiloxi)benceno', 'CC(=O)OC1=CC=CC=C1', 'otherName', 'etanoato de fenilo'],
  ['(metoxicarbonil)benceno', 'COC(=O)C1=CC=CC=C1', 'otherName', 'benzoato de metilo'],
  // The engine's refusals: an ester beside another ester, an ester prefix on a benzene ring beside an acid.
  ['2-(acetiloxi)etanoato de metilo', null, 'outOfScope', null],
  ['ácido 4-(acetiloxi)benzoico', null, 'outOfScope', null],
  ['ácido 4-(metoxicarbonil)benzoico', null, 'outOfScope', null],
  ['ácido 2-[4-(metoxicarbonil)fenil]etanoico', null, 'outOfScope', null],
  ['ácido 2,2,2,2-tetrakis(acetiloxi)etanoico', null, 'invalid', null],
]);

test('readName (R-6a2b): every form is the engine\'s verdict; other names, refusals and errors, against a SMILES', () => {
  for (const [words, smiles, name] of FORMS) {
    const verdict = read(words);
    const naming = nameMolecule(parseSmiles(smiles));
    assert.equal(verdict.kind, name === naming.name ? 'correct' : 'alternative', `${name}: ${verdict.message}`);
    assert.equal(verdict.name, naming.name);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${name} builds another graph`);
    assert.equal(verdict.draw, true);
  }
  for (const [words, smiles, kind, name] of CASES) {
    const verdict = read(words);
    if (kind === null) {
      // `ácido 4-(acetiloxi)-3-(metoxicarbonil)butanoico`: whatever the engine calls it, the molecule is the one written.
      assert.ok(['correct', 'alternative', 'otherName'].includes(verdict.kind), `${words}: ${verdict.kind}`);
      assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), words);
      continue;
    }
    assert.equal(verdict.kind, kind, `${words}: ${verdict.message}`);
    if (smiles) {
      assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), words);
      assert.equal(verdict.name, name, words);
    } else {
      assert.equal(verdict.draw, false, words);
    }
  } // End of the loop over the cases
}); // End of test 'readName (R-6a2b)…'

// ---------------------------------------------------------------------------
// Diagnosis.
// ---------------------------------------------------------------------------

/**
 * Mutations whose diagnosis is one of the rules that hold for an ester
 * prefix: tile words, the code and a phrase of its message.
 */
const MUTATIONS = Object.freeze([
  ['ácido 3 met il 2 acetil oxi but ano oico', 'ALPHABETICAL_ORDER', '«acetiloxi» va antes que «metil» (a antes que m)'],
  ['ácido 2 acetil oxi 2 acetil oxi et ano oico', 'UNGROUPED', '«2,2-bis(acetiloxi)», no «2-(acetiloxi)-2-(acetiloxi)»'],
  ['ácido 2 2 di acetil oxi et ano oico', 'ALKOXY_MULTIPLIER', 'Un prefijo «-oxi» que no se acorta, como «acetiloxi», es un prefijo '
    + 'compuesto (un grupo más «oxi») y va entre paréntesis; delante de un prefijo compuesto se usa «bis», «tris»…: '
    + '«2,2-bis(acetiloxi)», no «2,2-di(acetiloxi)».'],
  ['ácido 2 2 di met il oxi carbonil pent ano di oico', 'MULTIPLIER_KIND', 'Delante de una rama que tiene sus propias ramas se usa '
    + '«bis», «tris»…: «2,2-bis(metoxicarbonil)», no «2,2-di(metoxicarbonil)».'],
  ['ácido 3 prop ano 1 il oxi carbonil pent ano di oico', 'NEEDLESS_LOCANTS', 'Sobran números dentro de la rama: se escribe '
    + '«3-(propoxicarbonil)», no «3-[(propan-1-iloxi)carbonil]».'],
  ['ácido 2 START 3 met il prop ano oil oxi END et ano oico', 'ACYL_CHAIN', 'Se escribe «butanoiloxi», no «(3-metilpropanoil)oxi».'],
  ['ácido 2 START 6 met il benzoil oxi END et ano oico', 'BRANCH_RING_NUMBERING', '«(2-metilbenzoil)oxi», no «(6-metilbenzoil)oxi».'],
  ['ácido 2 ciclo hex ano 2 carbonil oxi et ano oico', 'BRANCH_RING_NUMBERING', '«(ciclohexanocarbonil)oxi», no '
    + '«(ciclohexano-2-carbonil)oxi». En «(ciclohexanocarbonil)oxi» ese 1 ni siquiera se escribe.'],
  ['ácido 3 START 6 met il fenil oxi carbonil END pent ano di oico', 'BRANCH_RING_NUMBERING', '«(2-metilfenoxi)carbonil», no '
    + '«(6-metilfenoxi)carbonil».'],
  ['ácido 4 4 bis met il oxi carbonil pent ano di oico', 'NUMBERING', 'Hay que numerar la cadena desde el otro extremo'],
  ['ácido 5 met il 4 START 2 met il prop ano oil oxi END pent ano oico', 'BRANCH_AT_END', 'La rama «metil» está en el extremo de la '
    + 'cadena, así que la alarga'],
  ['ácido 5 acetil oxi ciclo hex ano 2 carboxílico', 'RING_NUMBERING', 'los grupos –COOH (el grupo principal) tienen que llevar los '
    + 'números más bajos'],
]);

test('mutations (R-6a2b): the diagnosis of every rule that holds for an ester prefix, its message and step', () => {
  for (const [words, code, phrase] of MUTATIONS) {
    const verdict = read(words);
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    const d = verdict.diagnosis;
    assert.ok(d, `${words}: no diagnosis`);
    assert.equal(d.code, code, `${words}: ${d.message}`);
    assert.ok(d.message.includes(phrase), `${words}: ${d.message}`);
    assert.ok(!/undefined|null|NaN|\[object/.test(d.message), `${words}: ${d.message}`);
    const opened = diagnosisExplanation(verdict, explain);
    assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), words);
  } // End of the loop over the mutations
}); // End of test 'mutations (R-6a2b)…'

/**
 * The kind of ester prefix of a branch, read here apart from diagnose.js:
 * 'acyloxy' (an acyl group through an ether oxygen), 'alkoxycarbonyl' (an
 * alkoxy group on a C=O carbon), or null.
 *
 * @param {object} branch - A SubstituentSpec (interpret.js) or a SubstituentStructure (substituent.js).
 * @returns {string|null} The kind.
 */
function prefixKind(branch) {
  if (branch.alkoxycarbonyl) {
    return 'alkoxycarbonyl';
  }
  return branch.alkoxy && (branch.acyl || branch.retained === 'formyl') ? 'acyloxy' : null;
}

/**
 * The category of an ester prefix's own mistake, read independently of
 * diagnose.js from the engine's naming and the student's reading (each a
 * deliberate null of diagnose.js «Esters» until phase I-52a3a, which names
 * all but `words`, named since phase I-52a3b): `seniority` —
 * the student's suffix is no –COO– beside the engine's, or the reverse (an
 * ester prefix beside no group senior to an ester: `(acetiloxi)metano` →
 * `etanoato de metilo`); `inChain` — the C=O carbon of the student's
 * alkoxycarbonyl prefix is a carbon of the engine's parent, which writes the
 * ester as `alcoxi` and `oxo`, its chain the student's lengthened through that
 * carbon (`ácido 3-(metoxicarbonil)propanoico` → `ácido
 * 4-metoxi-4-oxobutanoico`); `words` — on the same atoms, the student's branch
 * and the engine's are not the same kind of ester prefix (`(1-oxoetoxi)` for
 * `(acetiloxi)`, `[(metoxi)oxometil]` for `(metoxicarbonil)`), or the student
 * wrote an acyloxy group's acyl part with the general word (`etanoiloxi`,
 * `metanoiloxi`). Null when none applies.
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} verdict - Its `otherName` verdict.
 * @returns {string|null} The category.
 */
function prefixCategory(ids, verdict) {
  const { tree } = parse(ids);
  const spec = interpret(tree);
  const engine = verdict.naming.structure.suffix;
  if ((Boolean(engine) && engine.kind === 'ester') !== (Boolean(spec.suffix) && spec.suffix.kind === 'ester')) {
    return 'seniority';
  }
  // The engine's parent is the student's chain lengthened through the alkoxycarbonyl prefix's C=O carbon (not another chain that
  // merely passes through it, whose choice the chain rules explain: MORE_SUBSTITUENTS, LONGER_CHAIN).
  const parent = new Set(verdict.naming.parent.atoms);
  const lengthened = verdict.studentParent.atoms.every((id) => parent.has(id));
  if (lengthened && verdict.prefixAtoms.some((o) => spec.prefixes[o.prefix].substituent.alkoxycarbonyl && parent.has(o.attachment))) {
    return 'inChain';
  }
  const differs = verdict.prefixAtoms.some((o) => {
    const theirs = nameSubstituent(verdict.molecule, o.parentAtom, o.attachment);
    return prefixKind(spec.prefixes[o.prefix].substituent) !== prefixKind(theirs);
  });
  return differs || /(?:et|met)anoiloxi/.test(verdict.text) ? 'words' : null;
} // End of function prefixCategory()

/**
 * The codes an ester prefix's own mistake gets, by category (prefixCategory();
 * diagnose.js «Esters», phase I-52a3a): an alkoxycarbonyl prefix whose C=O
 * carbon the engine takes into the chain (ESTER_IN_CHAIN); an ester prefix
 * beside no group senior to an ester, the molecule the ester itself — the
 * principal –COO– written as the prefix (CARBONYL_PREFIX) or beside a junior
 * suffix (CARBONYL_SENIORITY); and since phase I-52a3b an ester prefix
 * written as another kind of branch (ESTER_PREFIX_NAME) or an acyloxy
 * prefix's acyl part with the general word (ACYL_NAME).
 */
const CATEGORY_CODES = Object.freeze({
  inChain: ['ESTER_IN_CHAIN'],
  seniority: ['CARBONYL_PREFIX', 'CARBONYL_SENIORITY'],
  words: ['ESTER_PREFIX_NAME', 'ACYL_NAME'],
});

/**
 * The former deliberate «Esters» nulls of the ester prefixes (phase I-52a2b), named since phase I-52a3a: tile words, the
 * category, the code, the step «Ver el paso» opens and the whole message.
 */
const FORMER_NULLS = Object.freeze([
  ['ácido 3 met il oxi carbonil prop ano oico', 'inChain', 'ESTER_IN_CHAIN', 'groupChain', 'El prefijo «metoxicarbonil» está en el '
    + 'extremo de la cadena, y el carbono de su C=O la alarga: la cadena principal tiene 4 carbonos. Con ese carbono en la cadena, '
    + 'el éster ya no se nombra «metoxicarbonil», sino con dos prefijos con el mismo número: «oxo» para su C=O y uno acabado en '
    + '«-oxi» para su oxígeno del medio con el grupo unido a él. Se escribe «ácido 4-metoxi-4-oxobutanoico».'],
  ['ácido 6 met il oxi carbonil hex ano oico', 'inChain', 'ESTER_IN_CHAIN', 'groupChain', 'El prefijo «metoxicarbonil» está en el '
    + 'extremo de la cadena, y el carbono de su C=O la alarga: la cadena principal tiene 7 carbonos. Con ese carbono en la cadena, '
    + 'el éster ya no se nombra «metoxicarbonil», sino con dos prefijos con el mismo número: «oxo» para su C=O y uno acabado en '
    + '«-oxi» para su oxígeno del medio con el grupo unido a él. Se escribe «ácido 7-metoxi-7-oxoheptanoico».'],
  ['acetil oxi met ano', 'seniority', 'CARBONYL_PREFIX', 'group', 'El grupo –COO– es el grupo principal: no se nombra con el prefijo '
    + '«acetiloxi», sino con la terminación «-oato» y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo». Tu cadena '
    + 'va en el grupo unido al otro oxígeno, después de «de». Se escribe «etanoato de metilo».'],
  ['2 acetil oxi hept ano al', 'seniority', 'CARBONYL_SENIORITY', 'group', 'Cuando hay grupos distintos, solo uno es el grupo '
    + 'principal, y se elige por este orden: ácido > éster > aldehído > cetona > alcohol. Aquí manda el éster (–COO–), que se '
    + 'nombra con la terminación «-oato» y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo»; el –CHO del '
    + 'aldehído va en el nombre del grupo unido al otro oxígeno, con el prefijo «oxo». Se escribe «etanoato de 1-oxoheptan-2-ilo».'],
  ['benzoil oxi benceno', 'seniority', 'CARBONYL_PREFIX', 'group', 'El grupo –COO– es el grupo principal: no se nombra con el prefijo '
    + '«benzoiloxi», sino con «benzoato» (el benceno con un grupo –COO–) y, después de «de», el grupo unido al otro oxígeno, '
    + 'acabado en «-ilo». Tu anillo va en el grupo unido al otro oxígeno, después de «de». Se escribe «benzoato de fenilo».'],
  ['acetil oxi benceno', 'seniority', 'CARBONYL_PREFIX', 'group', 'El grupo –COO– es el grupo principal: no se nombra con el prefijo '
    + '«acetiloxi», sino con la terminación «-oato» y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo». Tu anillo '
    + 'va en el grupo unido al otro oxígeno, después de «de». Se escribe «etanoato de fenilo».'],
  ['met il oxi carbonil benceno', 'seniority', 'CARBONYL_PREFIX', 'group', 'El grupo –COO– es el grupo principal: no se nombra con '
    + 'el prefijo «metoxicarbonil», sino con «benzoato» (el benceno con un grupo –COO–) y, después de «de», el grupo unido al otro '
    + 'oxígeno, acabado en «-ilo». Se escribe «benzoato de metilo».'],
  ['3 met il oxi carbonil pent ano 2 ona', 'seniority', 'CARBONYL_SENIORITY', 'group', 'Cuando hay grupos distintos, solo uno es el '
    + 'grupo principal, y se elige por este orden: ácido > éster > aldehído > cetona > alcohol. Aquí manda el éster (–COO–), que se '
    + 'nombra con la terminación «-oato» y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo»; el C=O de la cetona '
    + 'va delante, con el prefijo «oxo». Se escribe «2-etil-3-oxobutanoato de metilo».'],
]);

test('the former deliberate «Esters» nulls of R-6a2b (diagnose.js): `inChain` and `seniority` have their I-52a3a codes', () => {
  for (const [words, category, code, opened, message] of FORMER_NULLS) {
    const ids = seq(words);
    const verdict = readName(ids);
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    assert.equal(prefixCategory(ids, verdict), category, words);
    assert.ok(verdict.diagnosis, `${words}: no diagnosis`);
    assert.deepEqual([verdict.diagnosis.code, verdict.diagnosis.message], [code, message], words);
    assert.ok(CATEGORY_CODES[category].includes(code), words);
    const explanation = diagnosisExplanation(verdict, explain);
    assert.equal(explanation.steps[explanation.index].id, opened, `${words}: the step «Ver el paso» opens`);
    assert.ok(verdict.draw && verdict.molecule, words);
  } // End of the loop over the former deliberate nulls
}); // End of test 'the former deliberate «Esters» nulls of R-6a2b…'

/** The start of an acyloxy prefix's ESTER_PREFIX_NAME (draft pending teacher review). */
const ACYLOXY_LEAD = 'Un éster (–COO–) unido por su oxígeno del medio se nombra con el prefijo «aciloxi-»: el nombre del grupo acilo, aquí ';

/**
 * The former deliberate «Esters» `words` nulls of the ester prefixes (phases I-52a2b, I-52a3a), named since phase I-52a3b:
 * tile words, the code, the step «Ver el paso» opens, the tiles and the whole message.
 */
const FORMER_WORDS_NULLS = Object.freeze([
  ['ácido 2 START 1 oxo et il oxi END et ano oico', 'ESTER_PREFIX_NAME', 'substituents', [1, 9], `${ACYLOXY_LEAD}«acetil», más «oxi», `
    + 'que es el oxígeno; su C=O no se nombra con «oxo». Se escribe «acetiloxi», no «1-oxoetoxi».'],
  ['ácido 2 START 1 oxo met il oxi END et ano oico', 'ESTER_PREFIX_NAME', 'substituents', [1, 9], `${ACYLOXY_LEAD}«formil», más «oxi», `
    + 'que es el oxígeno; su C=O no se nombra con «oxo». Se escribe «formiloxi», no «1-oxometoxi».'],
  ['ácido 2 et ano oil oxi et ano oico', 'ACYL_NAME', 'substituents', [1, 6], 'El grupo acilo de 2 carbonos (CH₃–CO–) tiene nombre '
    + 'propio, que la IUPAC (2013) prefiere: «acetil», no «etanoil». Se escribe «acetiloxi», no «etanoiloxi».'],
  ['ácido 2 met ano oil oxi et ano oico', 'ACYL_NAME', 'substituents', [1, 6], 'El grupo acilo de 1 carbono (H–CO–, un –CHO) tiene '
    + 'nombre propio, que la IUPAC (2013) prefiere: «formil», no «metanoil». Se escribe «formiloxi», no «metanoiloxi».'],
  ['ácido 3 START met il oxi oxo met il END pent ano di oico', 'ESTER_PREFIX_NAME', 'substituents', [1, 10], 'Un éster (–COO–) unido '
    + 'por el carbono de su C=O se nombra con un solo prefijo que lo incluye todo, «alcoxicarbonil-»: el nombre del grupo unido al '
    + 'oxígeno acabado en «-oxi», aquí «metoxi», más «carbonil», que es el C=O; su C=O no se nombra con «oxo». Se escribe '
    + '«metoxicarbonil», no «(metoxi)oxometil».'],
]);

test('the former deliberate «Esters» nulls of R-6a2b (diagnose.js): `words`, an ester prefix\'s own words, have their I-52a3b codes', () => {
  for (const [words, code, opened, tiles, message] of FORMER_WORDS_NULLS) {
    const ids = seq(words);
    const verdict = readName(ids);
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    assert.equal(prefixCategory(ids, verdict), 'words', words);
    const d = verdict.diagnosis;
    assert.ok(d, `${words}: no diagnosis`);
    assert.deepEqual([d.code, d.rule, d.traceRule, d.message], [code, 5, null, message], words);
    assert.ok(CATEGORY_CODES.words.includes(code), words);
    assert.deepEqual(d.tiles, tiles, `${words}: the prefix's tiles`);
    const explanation = diagnosisExplanation(verdict, explain);
    const step = explanation.steps[explanation.index];
    assert.equal(step.id, opened, `${words}: the step «Ver el paso» opens`);
    // The step describes the engine's ester prefix: its acyl group, or its alkoxy group and «carbonil».
    assert.match(step.text.join(' '), /es el \[\[prefijo\]\] de un éster \(–COO–\)/, words);
    assert.ok(verdict.draw && verdict.molecule, words);
  } // End of the loop over the former deliberate nulls
  // Not an «Esters» `words` case, a pre-existing pattern: a branch in a style the engine does not list for the molecule (it lists
  // the styles only beside an isopropyl group), as `1-(1,1-dimetiletoxi)butano` for `1-tert-butoxibutano`: no diagnosis.
  for (const words of ['ácido 3 START 1 1 di met il et il oxi carbonil END pent ano di oico', '1 START 1 1 di met il et il oxi END but ano']) {
    const ids = seq(words);
    const verdict = readName(ids);
    assert.deepEqual([verdict.kind, verdict.diagnosis], ['otherName', null], words);
    assert.equal(prefixCategory(ids, verdict), null, words);
  }
}); // End of test 'the former deliberate «Esters» nulls of R-6a2b: `words`…'

// ---------------------------------------------------------------------------
// Fixture round trip and closed loop (design.md §15.7).
// ---------------------------------------------------------------------------

/**
 * The fixture names with an ester prefix (ESTER_PREFIX): 24, all of acids
 * (I-39c, I-40d, I-45c), every one read back; one more, with an amide inside
 * an acyloxy prefix (`ácido 2-[(4-amino-4-oxobutanoil)oxi]etanoico`, R-6d),
 * never tokenizes.
 */
const EXPECTED_FIXTURE = Object.freeze({ names: 24, rows: 22, nitrogen: 1 });

test('fixture round trip (R-6a2b): every fixture name with an ester prefix reads back, graph compared with the SMILES', async () => {
  const rows = (await readFixtures()).filter((row) => row.names.some((name) => ESTER_PREFIX.test(name)));
  let names = 0;
  let nitrogen = 0;
  let elapsed = 0;
  const readRows = new Set();
  for (const row of rows) {
    if (!isAcid(row.smiles)) {
      nitrogen += 1; // An amide inside the prefix (R-6d).
      assert.ok(/N/.test(row.smiles), `names.tsv:${row.line}`);
      row.names.forEach((name) => assert.equal(tokenize(name), null, `names.tsv:${row.line}: ${name} reads before its phase`));
      continue;
    }
    for (const name of row.names.filter((n) => ESTER_PREFIX.test(n))) {
      assert.ok(!isAcidName(name), name);
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      assert.equal(assemble(parse(ids).tree).text, name, `names.tsv:${row.line}: assembly`);
      const start = performance.now();
      const verdict = readName(ids);
      elapsed += performance.now() - start;
      const isMain = name === row.names[0];
      assert.equal(verdict.kind, isMain ? 'correct' : 'alternative', `names.tsv:${row.line}: ${name} → ${verdict.message}`);
      assert.equal(verdict.name, row.names[0], `names.tsv:${row.line}`);
      assert.equal(aromaticKey(verdict.molecule), keyOf(row.smiles), `names.tsv:${row.line}: ${name} builds another graph`);
      names += 1;
      readRows.add(row);
    } // End of the loop over the names of a row
  } // End of the loop over the fixture rows
  assert.deepEqual({ names, rows: readRows.size, nitrogen }, { ...EXPECTED_FIXTURE });
  assert.ok(elapsed / names < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / names).toFixed(2)} ms on average`);
}); // End of test 'fixture round trip (R-6a2b)…'

/**
 * The closed loop's generators (scripts/oracle/generate.mjs; design.md
 * §15.7): those of the ester closed loop of reverse-esters.test.js, with its
 * seeds, whose acids (the molecules that loop leaves out, isAcidMolecule())
 * carry the ester prefixes.
 */
const LOOP = Object.freeze({
  prefixes: Object.freeze({ count: 400, seed: 6102, maxSize: 12 }),
  ringEsters: Object.freeze({ count: 400, seed: 6103, maxSize: 12 }),
});

/**
 * Minimum coverage of the closed loop: acid molecules with an ester prefix
 * (distinct by aromatic key), their names read back, those with an acyloxy
 * and with an alkoxycarbonyl prefix, removed-locant mutations and decisive
 * verdicts among them (the seeds give 262, 282, 146, 128, 779 and 779).
 */
const LOOP_MIN = Object.freeze({ molecules: 255, names: 275, acyloxy: 140, alkoxycarbonyl: 120, removed: 760, decisive: 760 });

/**
 * The closed loop's molecules: the acids of the ester generators with an
 * ester prefix in a name, distinct by aromatic key.
 *
 * @returns {object[]} The molecules.
 */
function loopMolecules() {
  const seen = new Set();
  const molecules = [];
  for (const mol of [...generateEsterPrefixes(LOOP.prefixes), ...generateRingEsters(LOOP.ringEsters)].filter(isAcidMolecule)) {
    const key = aromaticKey(mol);
    const naming = nameMolecule(mol);
    if (!seen.has(key) && naming.ok && [naming.name, ...naming.alternatives.map((alt) => alt.name)].some((n) => ESTER_PREFIX.test(n))) {
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

test('closed loop over the ester generators\' acids: engine name → tiles → readName() → the same graph, then without each locant list', () => {
  const molecules = loopMolecules();
  const counts = { names: 0, acyloxy: 0, alkoxycarbonyl: 0, removed: 0, decisive: 0 };
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
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
      const kinds = verdict.prefixAtoms.length > 0 ? interpret(parse(ids).tree).prefixes.map((p) => prefixKind(p.substituent)) : [];
      counts.acyloxy += kinds.includes('acyloxy') ? 1 : 0;
      counts.alkoxycarbonyl += kinds.includes('alkoxycarbonyl') ? 1 : 0;
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
}); // End of test 'closed loop over the ester generators\' acids…'

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
 * Tells whether a prefix node is a group bonded through a heteroatom or an
 * ester prefix (a halogen, `hidroxi`, `oxo`, an alkoxy prefix, an ester
 * prefix): moved to an end, it never lengthens the chain as a carbon branch
 * does.
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
  shifted: ['NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS'],
  reflected: ['RING_NUMBERING'],
  rotated: ['RING_NUMBERING'],
  // ESTER_IN_CHAIN (R-6a3a): an alkoxycarbonyl prefix swapped or moved onto an end carbon, whose C=O carbon the engine takes into
  // the chain (`ácido 6-(metoxicarbonil)hexanoico` → `ácido 7-metoxi-7-oxoheptanoico`).
  swapped: ['NUMBERING', 'RING_NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS',
    'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS', 'ESTER_IN_CHAIN'],
  unsorted: ['ALPHABETICAL_ORDER'],
  ungrouped: ['UNGROUPED'],
  diBis: ['MULTIPLIER_KIND', 'ALKOXY_MULTIPLIER'],
  toEnd: ['BRANCH_AT_END', 'NUMBERING'],
  heteroToEnd: ['NUMBERING', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS', 'ESTER_IN_CHAIN'],
  removed: [],
  added: ['NEEDLESS_LOCANTS', 'NUMBERING', 'RING_NUMBERING'],
});

/**
 * The mutations of one acid name with an ester prefix, as for an acid
 * (reverse-acids.test.js): renumbered (`shifted` on a chain with `oico`,
 * reflected and rotated on a ring, the suffix's locants too), locants swapped
 * between two prefixes, prefixes in reverse order (after `ácido`), identical
 * prefixes written one by one, di ↔ bis, a single-locant prefix moved to an
 * end of a chain (`heteroToEnd` for an ester prefix, a group through an
 * oxygen or a C=O carbon), a prefix's locants removed, or added where it has
 * none.
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
  const terminal = Boolean(tree.parent.suffix) && tiles[tree.parent.suffix.tile].text === 'oico'; // Its –COOH stays at carbon 1.
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
 * Reads every mutation of some names with an ester prefix: every `otherName`
 * carries a diagnosis of its family's codes whose step resolves in its
 * explanation; a null is unexpected (no deliberate «Esters» null is left
 * since phase I-52a3b, which names `words`). The ester prefixes' own
 * mistakes diagnosed since phase I-52a3a are counted by category, each with
 * a code of its category (CATEGORY_CODES).
 *
 * @param {string[]} names - Names (engine names or alternatives).
 * @returns {{otherName: Object<string, number>, codes: Set<string>, nulls: Object<string, number>, own: Object<string, number>,
 *   unexpected: string[]}} `otherName` counts by family, the codes seen, the deliberate nulls by category, the ester prefixes'
 *   own mistakes diagnosed by category and the unexpected nulls.
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
      const category = prefixCategory(mutation.ids, verdict);
      if (!d) {
        unexpected.push(`${label}${category ? ` (${category})` : ''}`);
        continue;
      }
      codes.add(d.code);
      if (category) {
        own[category] = (own[category] || 0) + 1;
        assert.ok(CATEGORY_CODES[category].includes(d.code), `${label}: ${category}, ${d.code}`);
      }
      assert.ok(FAMILY_CODES[mutation.family].includes(d.code), `${label}: ${d.code}, ${d.message}`);
      assert.ok(!/undefined|null|NaN|\[object|grupo –OH|grupos –OH|–CHO/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), label);
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return { otherName, codes, nulls, own, unexpected };
} // End of function sweep()

/**
 * How many mutations of the 24 fixture names with an ester prefix give
 * `otherName`, by family (31), every one diagnosed with one of its family's
 * codes, none a deliberate «Esters» null; among them the ester prefixes' own
 * mistakes by category: 3 `inChain`, an alkoxycarbonyl prefix moved or
 * swapped where the engine puts its C=O carbon in the chain (`ácido
 * 6-(metoxicarbonil)hexanoico` → `ácido 7-metoxi-7-oxoheptanoico`),
 * deliberate nulls until phase I-52a3a, now ESTER_IN_CHAIN. Removing or
 * adding locants never gives `otherName`.
 */
const FIXTURE_OTHER_NAME = Object.freeze({
  reversed: 0, shifted: 2, reflected: 1, rotated: 20, swapped: 2, unsorted: 1, ungrouped: 2, diBis: 2, toEnd: 0, heteroToEnd: 1,
  removed: 0, added: 0,
});
const FIXTURE_NULLS = Object.freeze({});
const FIXTURE_OWN = Object.freeze({ inChain: 3 });

test('mutations of every fixture name with an ester prefix: a diagnosis of the family\'s codes, or a deliberate «Esters» null', async () => {
  const names = (await readFixtures()).filter((row) => isAcid(row.smiles)).flatMap((row) => row.names)
    .filter((name) => ESTER_PREFIX.test(name));
  assert.equal(names.length, EXPECTED_FIXTURE.names);
  const { otherName, codes, nulls, own, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  assert.deepEqual(otherName, { ...FIXTURE_OTHER_NAME });
  assert.deepEqual([nulls, own], [{ ...FIXTURE_NULLS }, { ...FIXTURE_OWN }]);
  assert.deepEqual([...codes].sort(), ['ALKOXY_MULTIPLIER', 'ALPHABETICAL_ORDER', 'ESTER_IN_CHAIN', 'MORE_SUBSTITUENTS',
    'MULTIPLIER_KIND', 'NUMBERING', 'RING_NUMBERING', 'UNGROUPED']);
}); // End of test 'mutations of every fixture name with an ester prefix…'

test('mutations of the generated names with an ester prefix: every otherName is diagnosed or a deliberate «Esters» null', () => {
  const names = [];
  for (const mol of loopMolecules()) {
    const naming = nameMolecule(mol);
    names.push(...[naming.name, ...naming.alternatives.map((alt) => alt.name)].filter((name) => ESTER_PREFIX.test(name)));
  }
  assert.ok(names.length >= 275, `${names.length} names`); // The seeds give 282.
  const { otherName, codes, nulls, own, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  const total = Object.values(otherName).reduce((sum, count) => sum + count, 0);
  // The seeds give 853 `otherName`, every one diagnosed, none null; among them 64 `inChain` (an alkoxycarbonyl prefix moved to an
  // end of the chain or swapped where the engine puts its C=O carbon in the chain), deliberate «Esters» nulls until phase
  // I-52a3a, now ESTER_IN_CHAIN.
  assert.deepEqual([total, nulls, own], [853, {}, { inChain: 64 }]);
  assert.deepEqual([otherName.removed, otherName.added], [0, 0]);
  for (const code of ['NUMBERING', 'RING_NUMBERING', 'ALPHABETICAL_ORDER', 'UNGROUPED', 'MULTIPLIER_KIND', 'ALKOXY_MULTIPLIER',
    'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_SUBSTITUENTS', 'MORE_MULTIPLE_BONDS']) {
    assert.ok(codes.has(code), `${code}: ${[...codes]}`);
  }
}); // End of test 'mutations of the generated names with an ester prefix…'

// ---------------------------------------------------------------------------
// The drawing, the dialog, robustness and time.
// ---------------------------------------------------------------------------

test('«Dibujar» (R-6a2b): ester prefix verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const name of ['ácido 2-(acetiloxi)etanoico', 'ácido 3-(metoxicarbonil)pentanodioico', 'ácido 2-[(4-metilbenzoil)oxi]etanoico',
    'ácido 3-[(propan-2-iloxi)carbonil]pentanodioico', 'ácido 4-(acetiloxi)ciclohexano-1-carboxílico',
    'ácido 2-{[2-(acetiloxi)etanoil]oxi}etanoico', 'ácido 3-(metoxicarbonil)propanoico', '(benzoiloxi)benceno']) {
    const verdict = read(name);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-6a2b)…'

test('dialog (R-6a2b): the tooltips of `oxi` and `carbonil` say how they make an ester prefix', () => {
  assert.match(TILE_HINTS[ALKOXY_ID], /met, il y oxi dan metoxi/);
  assert.match(TILE_HINTS[ALKOXY_ID], /acetil y oxi dan \(acetiloxi\)\.$/);
  assert.match(TILE_HINTS[RING_CARBONYL_ID], /\(ciclohexanocarbonil\)/);
  assert.match(TILE_HINTS[RING_CARBONYL_ID], /met, il, oxi y carbonil dan \(metoxicarbonil\)\.$/);
}); // End of test 'dialog (R-6a2b)…'

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

test('property (R-6a2b): random names with ester prefixes — any head, `oxi`, `carbonil`, locants or none — never crash', () => {
  const random = mulberry32(20261016);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const branches = ['acetil oxi', 'formil oxi', 'benzoil oxi', 'prop ano oil oxi', 'ciclo hex ano carbonil oxi', 'met il oxi carbonil',
    'isopropil oxi carbonil', 'fenil oxi carbonil', 'prop ano 2 il oxi carbonil', 'START 2 met il prop ano oil oxi END',
    'START 2 cloro et il oxi carbonil END', 'acetil oxi carbonil', 'oxi carbonil', 'met il', 'cloro', 'hidroxi', 'carbonil', 'oxi'];
  const parents = ['et ano oico', 'prop ano oico', 'but ano di oico', 'pent ano di oico', 'ciclo hex ano carboxílico', 'benzoico',
    'hex ano', 'but ano al', 'et ano oato met ilo'];
  const multipliers = { 1: '', 2: 'di', 3: 'tri' };
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const prefixes = Array.from({ length: int(0, 2) }, () => {
      const count = int(1, 2);
      const located = random() < 0.7;
      const locants = located ? Array.from({ length: count }, () => int(1, 5)).join(' ') : '';
      return [locants, random() < 0.5 && count > 1 ? 'bis' : multipliers[count], pick(branches)].join(' ');
    });
    const words = [random() < 0.8 ? 'ácido' : '', ...prefixes, pick(parents)].join(' ');
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
  for (const kind of ['correct', 'otherName', 'invalid']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-6a2b)…'

test('time budget: readName() calls with ester prefixes, with their diagnosis, well within budget', () => {
  const names = FORMS.map(([, , name]) => name).concat(['ácido acetil oxi prop ano oico', 'ácido met il oxi carbonil pent ano di oico',
    'ácido 3-(metoxicarbonil)propanoico', 'ácido 2,2-di(acetiloxi)etanoico']);
  names.forEach((name) => read(name)); // Warm-up.
  for (const name of names) {
    const start = performance.now();
    const verdict = read(name);
    const ms = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', name);
    assert.ok(ms < PER_NAME_BUDGET_MS, `${name}: ${ms.toFixed(1)} ms`);
  }
}); // End of test 'time budget…'
