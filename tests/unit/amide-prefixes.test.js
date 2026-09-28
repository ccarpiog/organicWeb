/**
 * @file Unit tests for the amide prefixes and the pair matrix (design.md
 * §13.4 I-39d). Beside an acid or an ester (ácido > éster > amida) an amide
 * is a prefix: its C=O carbon stays a chain carbon whenever the chain rules
 * reach it, cited `amino` + `oxo` at that locant (`ácido
 * 4-amino-4-oxobutanoico`, `ácido 4-(metilamino)-4-oxobutanoico`); when
 * the chain misses it the whole amide is `carbamoil` (`ácido
 * 3-(metilcarbamoil)pentanodioico`); bonded through its N it is
 * `acilamino` (`ácido 2-(acetilamino)etanoico`). Two amides on different
 * carbon pieces: the parent follows the usual rules and the other amide is
 * a prefix (`2-(acetilamino)etanamida`). Covers the names in every style
 * and both lexicons, enclosure and multipliers, every pair of the
 * seniority ácido > éster > amida > nitrilo > aldehído > cetona > alcohol >
 * amina, the refusals that stay (`manyAmides`, `substitutedPolyamide`,
 * `imide`, rings, `carbonocyanidic`, multiplicative names), the
 * explanation, id invariance, Ordenar dibujo and the oracle generator. The
 * names themselves are also checked row by row in tests/fixtures/names.tsv.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { canonicalKey, adjacency } from '../../src/model/graph.js';
import {
  validateForNaming, amideCarbons, MANY_AMIDES_MESSAGE, SUBSTITUTED_POLYAMIDE_MESSAGE, AMIDE_PREFIX_MESSAGE,
} from '../../src/model/validate.js';
import { nameMolecule, amidePrefixCount } from '../../src/naming/index.js';
import { PREFIX_STYLES, nameSubstituent, amideAttachment } from '../../src/naming/substituent.js';
import { needsEnclosure, isCompoundPrefix, substituentPrefix, citationKey } from '../../src/naming/render.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { lexiconEs } from '../../src/naming/lexicon.es.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import {
  scrambleMolecule, seededRandom, generateAmidePrefixes, amideGraft, randomHydrocarbon,
} from '../../scripts/oracle/generate.mjs';
import { canonicalLayout, layoutProblems } from '../../src/layout/canonical.js';
import { explain, plainText, atomCounts } from '../../src/explain/explain.js';

/**
 * Names a SMILES string in a prefix style (default 'isopropil').
 *
 * @param {string} smiles - The molecule.
 * @param {string} [prefixStyle] - Prefix style.
 * @returns {object} The naming result.
 */
function named(smiles, prefixStyle = PREFIX_STYLES[0]) {
  return nameMolecule(parseSmiles(smiles), { prefixStyle });
}

/**
 * The Spanish name of a SMILES string, or the refusal code and reason.
 *
 * @param {string} smiles - The molecule.
 * @returns {string} The name, or `CODE reason`.
 */
function nameOf(smiles) {
  const result = named(smiles);
  return result.ok ? result.name : `${result.error.code} ${result.error.reason || ''}`.trim();
}

/**
 * The text of one explanation step of a SMILES string, as plain text (its
 * paragraphs and its options).
 *
 * @param {string} smiles - The molecule.
 * @param {string} id - The step id.
 * @returns {string} Its paragraphs, joined ('' when the step is absent).
 */
function stepText(smiles, id) {
  const step = explain(named(smiles)).find((s) => s.id === id);
  return step ? [...step.text, ...(step.options || []).map((o) => o.text)].map(plainText).join(' ') : '';
}

/** Named molecules: SMILES, Spanish name (default style), English name. */
const NAMED = [
  ['NC(=O)CCC(=O)O', 'ácido 4-amino-4-oxobutanoico', '4-amino-4-oxobutanoic acid'],
  ['NC(=O)CC(=O)O', 'ácido 3-amino-3-oxopropanoico', '3-amino-3-oxopropanoic acid'],
  ['OC(=O)C(N)=O', 'ácido 2-amino-2-oxoetanoico', '2-amino-2-oxoethanoic acid'],
  ['CNC(=O)CCC(=O)O', 'ácido 4-(metilamino)-4-oxobutanoico', '4-(methylamino)-4-oxobutanoic acid'],
  ['CN(C)C(=O)CCC(=O)O', 'ácido 4-(dimetilamino)-4-oxobutanoico', '4-(dimethylamino)-4-oxobutanoic acid'],
  ['OC(=O)CC(C)C(N)=O', 'ácido 4-amino-3-metil-4-oxobutanoico', '4-amino-3-methyl-4-oxobutanoic acid'],
  ['OC(=O)CC(N)C(N)=O', 'ácido 3,4-diamino-4-oxobutanoico', '3,4-diamino-4-oxobutanoic acid'],
  ['OC(=O)CC(C(N)=O)CC(=O)O', 'ácido 3-carbamoilpentanodioico', '3-carbamoylpentanedioic acid'],
  ['OC(=O)CC(C(=O)NC)CC(=O)O', 'ácido 3-(metilcarbamoil)pentanodioico', '3-(methylcarbamoyl)pentanedioic acid'],
  ['OC(=O)CC(C(=O)N(C)C)CC(=O)O', 'ácido 3-(dimetilcarbamoil)pentanodioico', '3-(dimethylcarbamoyl)pentanedioic acid'],
  ['OC(=O)CC(C(=O)N(C)CC)CC(=O)O', 'ácido 3-[etil(metil)carbamoil]pentanodioico', '3-[ethyl(methyl)carbamoyl]pentanedioic acid'],
  ['OC(=O)C(C(N)=O)(C(N)=O)CC', 'ácido 2,2-dicarbamoilbutanoico', '2,2-dicarbamoylbutanoic acid'],
  ['OC(=O)C(C(=O)NC)(C(=O)NC)CC', 'ácido 2,2-bis(metilcarbamoil)butanoico', '2,2-bis(methylcarbamoyl)butanoic acid'],
  ['OC(=O)CCC(C(N)=O)CC', 'ácido 4-carbamoilhexanoico', '4-carbamoylhexanoic acid'],
  ['OC(=O)CC(CC(N)=O)CCC', 'ácido 3-(2-amino-2-oxoetil)hexanoico', '3-(2-amino-2-oxoethyl)hexanoic acid'],
  ['CC(=O)NCC(=O)O', 'ácido 2-(acetilamino)etanoico', '2-(acetylamino)ethanoic acid'],
  ['O=CNCC(=O)O', 'ácido 2-(formilamino)etanoico', '2-(formylamino)ethanoic acid'],
  ['CCC(=O)NCC(=O)O', 'ácido 2-(propanoilamino)etanoico', '2-(propanoylamino)ethanoic acid'],
  ['CC(=O)N(C)CC(=O)O', 'ácido 2-[acetil(metil)amino]etanoico', '2-[acetyl(methyl)amino]ethanoic acid'],
  ['CC(C)C(=O)NCC(=O)O', 'ácido 2-[(2-metilpropanoil)amino]etanoico', '2-[(2-methylpropanoyl)amino]ethanoic acid'],
  ['C=CC(=O)NCC(=O)O', 'ácido 2-[(prop-2-enoil)amino]etanoico', '2-[(prop-2-enoyl)amino]ethanoic acid'],
  ['OC(=O)C(NC(C)=O)NC(C)=O', 'ácido 2,2-bis(acetilamino)etanoico', '2,2-bis(acetylamino)ethanoic acid'],
  ['NC(=O)CCC(=O)OC', '4-amino-4-oxobutanoato de metilo', 'methyl 4-amino-4-oxobutanoate'],
  ['CC(=O)NCC(=O)OC', '2-(acetilamino)etanoato de metilo', 'methyl 2-(acetylamino)ethanoate'],
  ['COC(=O)CC(C(N)=O)CC(=O)OC', '3-carbamoilpentanodioato de dimetilo', 'dimethyl 3-carbamoylpentanedioate'],
  ['CC(=O)NCCOC(C)=O', 'etanoato de 2-(acetilamino)etilo', '2-(acetylamino)ethyl ethanoate'],
  ['NC(=O)CCC(=O)OCC(=O)O', 'ácido 2-[(4-amino-4-oxobutanoil)oxi]etanoico', '2-[(4-amino-4-oxobutanoyl)oxy]ethanoic acid'],
  ['CC(=O)NCC(=O)N', '2-(acetilamino)etanamida', '2-(acetylamino)ethanamide'],
  ['CC(=O)NCCC(N)=O', '3-(acetilamino)propanamida', '3-(acetylamino)propanamide'],
  ['CCCC(=O)NCC(=O)N', 'N-(2-amino-2-oxoetil)butanamida', 'N-(2-amino-2-oxoethyl)butanamide'],
  ['CNC(=O)CNC(C)=O', '2-(acetilamino)-N-metiletanamida', '2-(acetylamino)-N-methylethanamide'],
  ['NC(=O)CC(CC(N)=O)NC(C)=O', '3-(acetilamino)pentanodiamida', '3-(acetylamino)pentanediamide'],
  ['NC(=O)CNC(=O)CNC(C)=O', '2-(acetilamino)-N-(2-amino-2-oxoetil)etanamida', '2-(acetylamino)-N-(2-amino-2-oxoethyl)ethanamide'],
];

test('amides beside an acid or an ester, and a second amide, are named in both lexicons', () => {
  for (const [smiles, spanish, english] of NAMED) {
    const result = named(smiles);
    assert.equal(result.ok, true, `${smiles}: ${result.error && result.error.reason}`);
    assert.equal(result.name, spanish, smiles);
    assert.equal(englishName(result.structure), english, smiles);
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
    // The engine's count: every amide is the suffix or one prefix.
    const suffixes = result.structure.suffix && result.structure.suffix.kind === 'amide' ? result.structure.suffix.locants.length : 0;
    assert.equal(suffixes + amidePrefixCount(result.structure), amideCarbons(parseSmiles(smiles)).length, smiles);
  }
}); // End of test 'amides beside an acid or an ester, and a second amide, are named in both lexicons'

test('the amide carbon stays a chain carbon whenever the chain rules reach it', () => {
  // The longest chain through the amide carbon: amino + oxo at that carbon, never carbamoil.
  assert.equal(nameOf('NC(=O)CCC(=O)O'), 'ácido 4-amino-4-oxobutanoico');
  assert.doesNotMatch(nameOf('NC(=O)CCCCC(=O)O'), /carbamoil/);
  // A length tie: more prefixes through the amide carbon (P-45.2.1), as for esters (I-39c).
  assert.equal(nameOf('OC(=O)CC(C)C(N)=O'), 'ácido 4-amino-3-metil-4-oxobutanoico');
  // The chain misses the carbon: two acids on the parent, or a longer arm.
  assert.equal(nameOf('OC(=O)CC(C(N)=O)CC(=O)O'), 'ácido 3-carbamoilpentanodioico');
  assert.equal(nameOf('OC(=O)CCC(C(N)=O)CC'), 'ácido 4-carbamoilhexanoico');
  // The `amide` flag marks the oxo and amino occurrences on the amide carbon.
  const { prefixes } = named('CNC(=O)CCC(=O)O').structure;
  assert.deepEqual(prefixes.map((g) => [substituentPrefix(g.substituent), g.locants.map((s) => [s.locant, Boolean(s.amide)])]),
    [['metilamino', [[4, true]]], ['oxo', [[4, true]]]]);
  // A true amine beside the amide's N is the same prefix, each occurrence flagged apart (asparagine).
  const both = named('OC(=O)CC(N)C(N)=O');
  assert.deepEqual(both.structure.prefixes[0].locants.map((s) => [s.locant, Boolean(s.amide)]), [[3, false], [4, true]]);
}); // End of test 'the amide carbon stays a chain carbon whenever the chain rules reach it'

test('the prefixes: carbamoil and acilamino, enclosure, multipliers, order, styles', () => {
  const mol = parseSmiles('OC(=O)CC(C(=O)NC)CC(=O)O');
  const adj = adjacency(mol);
  const ctx = { mol, adj };
  const [x] = amideCarbons(mol);
  const carrier = adj.get(x).find((n) => mol.atoms.get(n.atom).element === 'C').atom;
  const nitrogen = adj.get(x).find((n) => mol.atoms.get(n.atom).element === 'N').atom;
  assert.equal(amideAttachment(ctx, carrier, x), 'carbon');
  assert.equal(amideAttachment(ctx, nitrogen, x), 'nitrogen');
  assert.equal(amideAttachment(ctx, x, carrier), null);
  const carbamoyl = nameSubstituent(mol, carrier, x);
  assert.equal(carbamoyl.carbamoyl, true);
  assert.equal(substituentPrefix(carbamoyl, lexiconEs), 'metilcarbamoil');
  assert.equal(substituentPrefix(carbamoyl, lexiconEn), 'methylcarbamoyl');
  assert.equal(needsEnclosure(carbamoyl), true);
  assert.equal(isCompoundPrefix(carbamoyl), true);
  assert.equal(citationKey(carbamoyl).alpha, 'metilcarbamoil', 'alphabetised by its complete name');
  // A bare carbamoil is simple: no parentheses, di.
  const bare = named('OC(=O)CC(C(N)=O)CC(=O)O').structure.prefixes[0].substituent;
  assert.equal(needsEnclosure(bare), false);
  assert.equal(isCompoundPrefix(bare), false);
  // The prefix styles reach the groups on the N.
  assert.deepEqual(PREFIX_STYLES.map((style) => named('OC(=O)CC(C(=O)NC(C)C)CC(=O)O', style).name), [
    'ácido 3-(isopropilcarbamoil)pentanodioico', 'ácido 3-[(propan-2-il)carbamoil]pentanodioico',
    'ácido 3-[(1-metiletil)carbamoil]pentanodioico']);
  assert.deepEqual(named('CC(C)NC(=O)CCC(=O)O').alternatives.map((a) => a.name), [
    'ácido 4-oxo-4-[(propan-2-il)amino]butanoico', 'ácido 4-[(1-metiletil)amino]-4-oxobutanoico']);
  // An acilamino prefix: an amino group whose N carries the acyl group of the amide (amideAcyl).
  const acylamino = named('CC(=O)N(C)CC(=O)O').structure.prefixes[0].substituent;
  assert.equal(acylamino.amino, true);
  assert.deepEqual(acylamino.prefixes.map((g) => [substituentPrefix(g.substituent), Boolean(g.substituent.amideAcyl)]),
    [['acetil', true], ['metil', false]]);
  assert.equal(substituentPrefix(acylamino), 'acetil(metil)amino');
  assert.equal(substituentPrefix(acylamino, lexiconEn), 'acetyl(methyl)amino');
  assert.equal(nameOf('OC(=O)C(NC(C)=O)NC(C)=O'), 'ácido 2,2-bis(acetilamino)etanoico');
  // The acyl part keeps its own marks and the acyl rules of I-39b: formil, acetil, -oil.
  assert.equal(nameOf('CC(C)C(=O)NCC(=O)O'), 'ácido 2-[(2-metilpropanoil)amino]etanoico');
  assert.equal(nameOf('O=CNCC(=O)O'), 'ácido 2-(formilamino)etanoico');
  // The acyl part of an acilamino is no acyl branch of a ketone: never refused as acylSubstituent.
  assert.equal(nameOf('CC(=O)NC(C)C(=O)O'), 'ácido 2-(acetilamino)propanoico');
}); // End of test 'the prefixes: carbamoil and acilamino, enclosure, multipliers, order, styles'

test('two amides on different carbon pieces: the usual chain rules, P4 counts the prefixes on the chain', () => {
  // P0 and P1 tie; the acetamide piece would carry its prefix on the N (N-(2-amino-2-oxoetil)), the other on carbon 2.
  const result = named('CC(=O)NCC(=O)N');
  assert.equal(result.name, '2-(acetilamino)etanamida');
  const p4 = result.trace.find((step) => step.rule === 'P4');
  assert.deepEqual([...p4.values].sort(), [0, 1], 'a group on the suffix N is not counted by P4');
  // A longer piece wins first (P1), with the other amide on its N.
  assert.equal(nameOf('CCCC(=O)NCC(=O)N'), 'N-(2-amino-2-oxoetil)butanamida');
  // A diamide piece wins P0; a third amide on another piece is a prefix.
  assert.equal(nameOf('NC(=O)CC(CC(N)=O)NC(C)=O'), '3-(acetilamino)pentanodiamida');
  // The P4 change leaves single amines and amides alone (the group on the N is always there).
  assert.equal(nameOf('CCNCC(C)CC'), 'N-etil-2-metilbutan-1-amina');
  assert.equal(nameOf('CCCCN(C)C(C)=O'), 'N-butil-N-metiletanamida');
  // The explanation says why.
  assert.match(stepText('CC(=O)NCC(=O)N', 'tiebreak'), /no los grupos unidos al nitrógeno del grupo amida principal/);
  assert.match(stepText('CC(=O)NCC(=O)N', 'group'), /Tiene además otro grupo amida, que no está en la cadena principal/);
}); // End of test 'two amides on different carbon pieces…'

/**
 * Every pair of the seniority ácido > éster > amida > nitrilo > aldehído >
 * cetona > alcohol > amina: the senior group is the suffix, the junior one
 * a prefix. SMILES, name, suffix kind.
 */
const PAIRS = [
  ['COC(=O)CCC(=O)O', 'ácido 4-metoxi-4-oxobutanoico', 'acid'],
  ['NC(=O)CCC(=O)O', 'ácido 4-amino-4-oxobutanoico', 'acid'],
  ['N#CCCC(=O)O', 'ácido 3-cianopropanoico', 'acid'],
  ['O=CCCC(=O)O', 'ácido 4-oxobutanoico', 'acid'],
  ['CC(=O)CCC(=O)O', 'ácido 4-oxopentanoico', 'acid'],
  ['OCCC(=O)O', 'ácido 3-hidroxipropanoico', 'acid'],
  ['NCCC(=O)O', 'ácido 3-aminopropanoico', 'acid'],
  ['NC(=O)CCC(=O)OC', '4-amino-4-oxobutanoato de metilo', 'ester'],
  ['N#CCC(=O)OC', '2-cianoetanoato de metilo', 'ester'],
  ['O=CCC(=O)OC', '3-oxopropanoato de metilo', 'ester'],
  ['CC(=O)CC(=O)OCC', '3-oxobutanoato de etilo', 'ester'],
  ['OCCC(=O)OC', '3-hidroxipropanoato de metilo', 'ester'],
  ['NCCC(=O)OC', '3-aminopropanoato de metilo', 'ester'],
  ['N#CCCC(N)=O', '3-cianopropanamida', 'amide'],
  ['O=CCC(N)=O', '3-oxopropanamida', 'amide'],
  ['CC(=O)CCC(N)=O', '4-oxopentanamida', 'amide'],
  ['CC(O)CC(N)=O', '3-hidroxibutanamida', 'amide'],
  ['CC(N)C(N)=O', '2-aminopropanamida', 'amide'],
  ['O=CCC#N', '3-oxopropanonitrilo', 'nitrile'],
  ['CC(=O)CC#N', '3-oxobutanonitrilo', 'nitrile'],
  ['OCCC#N', '3-hidroxipropanonitrilo', 'nitrile'],
  ['NCCC#N', '3-aminopropanonitrilo', 'nitrile'],
  ['CC(=O)CCC=O', '4-oxopentanal', 'aldehyde'],
  ['OCCC=O', '3-hidroxipropanal', 'aldehyde'],
  ['NCCC=O', '3-aminopropanal', 'aldehyde'],
  ['CC(=O)CCO', '4-hidroxibutan-2-ona', 'ketone'],
  ['CC(=O)CCN', '4-aminobutan-2-ona', 'ketone'],
  ['NCCO', '2-aminoetan-1-ol', 'alcohol'],
];

test('the pair matrix: every pair of the seniority, the senior group principal, the junior a prefix', () => {
  assert.equal(PAIRS.length, 28, 'eight kinds, 28 pairs');
  for (const [smiles, name, kind] of PAIRS) {
    const result = named(smiles);
    assert.equal(result.ok, true, `${smiles}: ${result.error && result.error.reason}`);
    assert.equal(result.name, name, smiles);
    assert.equal(result.structure.suffix.kind, kind, smiles);
    assert.equal(result.structure.suffix.locants.length, 1, `${smiles}: one suffix group`);
    assert.ok(result.structure.prefixes.length > 0, `${smiles}: the junior group is a prefix`);
  }
  // The other forms of the prefix groups, bonded through their carbon or their heteroatom.
  const forms = [
    ['OC(=O)CC(C(=O)OC)CC(=O)O', 'ácido 3-(metoxicarbonil)pentanodioico'],
    ['CC(=O)OCC(=O)O', 'ácido 2-(acetiloxi)etanoico'],
    ['OC(=O)CC(C(N)=O)CC(=O)O', 'ácido 3-carbamoilpentanodioico'],
    ['CC(=O)NCC(=O)O', 'ácido 2-(acetilamino)etanoico'],
    ['COC(=O)CC(C(N)=O)CC(=O)OC', '3-carbamoilpentanodioato de dimetilo'],
    ['CC(=O)NCC(=O)OC', '2-(acetilamino)etanoato de metilo'],
    ['OC(=O)C(C=O)CC', 'ácido 2-formilbutanoico'],
    ['CC(=O)C(C(N)=O)CC', '2-etil-3-oxobutanamida'],
    ['N#CCOCCC#N', '3-(cianometoxi)propanonitrilo'],
  ];
  for (const [smiles, name] of forms) {
    assert.equal(nameOf(smiles), name, smiles);
  }
  // The same kind twice on different carbon pieces: the junior one a prefix, when the rules decide.
  assert.equal(nameOf('CC(=O)NCC(=O)N'), '2-(acetilamino)etanamida');
}); // End of test 'the pair matrix…'

test('refusals that stay, with their counter-examples', () => {
  const refusals = [
    // Three amides on one piece with the amide principal: -carboxamida.
    ['NC(=O)CC(C(N)=O)CC(N)=O', 'manyAmides', MANY_AMIDES_MESSAGE],
    // A diamide with a group on some N (another amide's piece included): N¹/N⁴ locants.
    ['NC(=O)CCC(=O)NCC(N)=O', 'substitutedPolyamide', SUBSTITUTED_POLYAMIDE_MESSAGE],
    ['CNC(=O)CCC(N)=O', 'substitutedPolyamide', SUBSTITUTED_POLYAMIDE_MESSAGE],
  ];
  for (const [smiles, reason, message] of refusals) {
    const result = named(smiles);
    assert.equal(result.error.reason, reason, smiles);
    assert.equal(result.error.message, message, smiles);
    assert.ok(result.groups, `${smiles}: the refusal carries the group analysis`);
  }
  // Below an acid the same shapes are named: any number of amides are prefixes.
  assert.equal(nameOf('NC(=O)CC(C(N)=O)C(C(N)=O)C(=O)O'), 'ácido 5-amino-2,3-dicarbamoil-5-oxopentanoico');
  assert.equal(nameOf('NC(=O)CCC(N)=O'), 'butanodiamida', 'a diamide without groups on its N');
  const others = [
    ['CC(=O)NC(C)=O', 'imide'],
    ['N#CC(=O)NCC(=O)O', 'carbonocyanidic'],
    ['NC(=O)CNCC(N)=O', 'symmetricAmine'],
    ['NC(=O)CCOCCC(N)=O', 'symmetricEther'],
    ['CC(=O)OCCOC(C)=O', 'esterPrefix'],
  ];
  // Amides with a ring are named since I-40c: a ring on the N, `carbamoil-` on a ring.
  assert.equal(nameOf('CC(=O)NC1CCCCC1'), 'N-ciclohexiletanamida');
  assert.equal(nameOf('NC(=O)C1CCC(C(=O)O)CC1'), 'ácido 4-carbamoilciclohexano-1-carboxílico');
  // A –COOH on the O side of an ester beside an acid is `carboxi-` since I-40b.
  assert.equal(nameOf('OC(=O)CC(=O)OCC(=O)O'), 'ácido 3-(carboximetoxi)-3-oxopropanoico');
  for (const [smiles, reason] of others) {
    assert.equal(nameOf(smiles), `HETEROATOM ${reason}`, smiles);
  }
  // The engine safety net keeps its message (unreachable through validation).
  assert.match(AMIDE_PREFIX_MESSAGE, /no sé situar/);
}); // End of test 'refusals that stay, with their counter-examples'

test('the explanation: the amide is not the principal group, how each prefix is formed', () => {
  const group = stepText('NC(=O)CCC(=O)O', 'group');
  assert.match(group, /También tiene un grupo amida \(–CONH₂, –CONH– o –CON–\)/);
  assert.match(group, /ácido > amida > aldehído/);
  assert.match(group, /su C=O se nombra con «oxo-», y su nitrógeno, junto con los grupos unidos a él, con el prefijo «amino-» \(aquí, «amino»\)/);
  // Never an aldehyde, a ketone nor an amine.
  assert.doesNotMatch(group, /–CHO en el otro extremo|una amina|cetona\)/);
  assert.doesNotMatch(stepText('CC(=O)NCC(=O)O', 'group'), /\(una amina\)|grupos? amino \(/);
  assert.match(stepText('OC(=O)CC(C(=O)NC)CC(=O)O', 'group'), /«carbamoil-».*\(aquí, «metilcarbamoil»\)/);
  assert.match(stepText('CC(=O)NCC(=O)O', 'group'), /«acilamino-».*\(aquí, «acetilamino»\)/);
  assert.match(stepText('NC(=O)CCC(=O)OC', 'group'), /ácido > éster > amida >/);
  // The chain step: the amide carbon is a chain carbon, or outside the chain.
  assert.match(stepText('NC(=O)CCC(=O)O', 'groupChain'), /El carbono de la amida que se nombra con «4-amino» y «4-oxo» sí forma parte de la cadena/);
  assert.match(stepText('OC(=O)CCC(C(N)=O)CC', 'groupChain'), /no pasa por el carbono de la amida de «carbamoil»/);
  assert.match(stepText('CC(=O)NCC(=O)O', 'groupChain'), /el carbono del C=O de «acetilamino» queda al otro lado/);
  assert.doesNotMatch(stepText('CC(=O)NCC(=O)O', 'groupChain'), /nitrógeno de un grupo amino/);
  // The substituents step.
  const subs = stepText('NC(=O)CCC(=O)O', 'substituents');
  assert.match(subs, /En el carbono 4, «amino» no es una amina: es el nitrógeno de una amida/);
  assert.match(subs, /El C=O del carbono 4 es el de una amida/);
  assert.match(stepText('OC(=O)CC(C(=O)NC)CC(=O)O', 'substituents'), /«metilcarbamoil» es el prefijo de una amida unida a la cadena principal por el carbono de su C=O/);
  assert.match(stepText('CC(=O)NCC(=O)O', 'substituents'), /«acetilamino» es el prefijo de una amida unida a la cadena principal por su nitrógeno/);
  assert.match(stepText('OC(=O)CC(CC(N)=O)CCC', 'substituents'), /El carbono 2 de la rama es el carbono de una amida/);
  assert.match(stepText('NC(=O)CCC(=O)O', 'order'), /«amino» y «oxo», aunque describan la misma amida/);
  assert.match(stepText('CC(=O)NCC(=O)O', 'assemble'), /La amida que no es el grupo principal va delante/);
  assert.doesNotMatch(stepText('CC(=O)NCC(=O)O', 'assemble'), /La amina que no es el grupo principal/);
  // Count step: the amide's C=O and N on one carbon, and the formula.
  assert.match(stepText('NC(=O)CCC(=O)O', 'count'), /En el grupo amida están los dos/);
  assert.deepEqual(atomCounts(named('CC(=O)N(C)CC(=O)O').structure), { carbons: 5, hydrogens: 9, halogens: {}, nitrogens: 1, oxygens: 3 });
}); // End of test 'the explanation…'

test('the explanation highlights each amide whole', () => {
  // The amide whose carbon is in the chain: its carbon, its O and its N with its groups.
  const mol = parseSmiles('CNC(=O)CCC(=O)O');
  const group = explain(nameMolecule(mol)).find((s) => s.id === 'group');
  const [x] = amideCarbons(mol);
  const adj = adjacency(mol);
  const amide = [x, ...adj.get(x).filter((n) => mol.atoms.get(n.atom).element !== 'C').map((n) => n.atom)];
  const nitrogen = amide.find((id) => mol.atoms.get(id).element === 'N');
  const methyl = adj.get(nitrogen).find((n) => n.atom !== x).atom;
  assert.ok(group.highlight.some((spec) => [...amide, methyl].every((id) => spec.atoms.includes(id))), 'one spec covers the whole amide');
  // A carbamoil or acilamino group is highlighted with its occurrence.
  for (const smiles of ['OC(=O)CC(C(=O)NC)CC(=O)O', 'CC(=O)N(C)CC(=O)O', 'CC(=O)NCC(=O)N']) {
    const other = parseSmiles(smiles);
    const step = explain(nameMolecule(other)).find((s) => s.id === 'group');
    const amides = amideCarbons(other);
    const prefixAmide = amides.find((c) => step.highlight.some((spec) => spec.style === 'substituent' && spec.atoms.includes(c)));
    assert.ok(prefixAmide !== undefined, `${smiles}: the prefix amide is highlighted`);
  }
}); // End of test 'the explanation highlights each amide whole'

test('names never depend on atom ids or drawing order', () => {
  const random = seededRandom(59);
  for (const [smiles] of [...NAMED, ...PAIRS]) {
    const reference = named(smiles);
    for (let k = 0; k < 8; k += 1) {
      const result = nameMolecule(scrambleMolecule(parseSmiles(smiles), random));
      assert.equal(result.name, reference.name, smiles);
      assert.deepEqual(result.alternatives.map((a) => a.name), reference.alternatives.map((a) => a.name), smiles);
      assert.equal(englishName(result.structure), englishName(reference.structure), smiles);
    }
  } // End of the loop over the molecules
  for (let k = 0; k < 8; k += 1) {
    assert.equal(nameMolecule(scrambleMolecule(parseSmiles('NC(=O)CCC(=O)NCC(N)=O'), random)).error.reason, 'substitutedPolyamide');
  }
}); // End of test 'names never depend on atom ids or drawing order'

test('Ordenar dibujo lays out amide-prefix molecules', () => {
  for (const smiles of ['NC(=O)CCC(=O)O', 'OC(=O)CC(C(=O)N(C)CC)CC(=O)O', 'CC(=O)N(C)CC(=O)O', 'CC(=O)NCC(=O)N', 'NC(=O)CNC(=O)CNC(C)=O']) {
    const mol = parseSmiles(smiles);
    let i = 0;
    for (const atom of mol.atoms.values()) {
      atom.x = (i * 37) % 200;
      atom.y = (i * 53) % 170;
      i += 1;
    }
    const laid = canonicalLayout(mol, nameMolecule(mol));
    assert.equal(layoutProblems(laid).ok, true, smiles);
    assert.equal(laid.atoms.size, mol.atoms.size);
  }
}); // End of test 'Ordenar dibujo lays out amide-prefix molecules'

test('the seeded amide-prefix generator: deterministic, distinct, valid, varied', () => {
  const molecules = generateAmidePrefixes({ count: 120, seed: 3 });
  assert.equal(molecules.length, 120);
  assert.deepEqual(generateAmidePrefixes({ count: 120, seed: 3 }).map(writeSmiles), molecules.map(writeSmiles), 'deterministic');
  assert.notDeepEqual(generateAmidePrefixes({ count: 120, seed: 4 }).map(writeSmiles), molecules.map(writeSmiles));
  assert.equal(new Set(molecules.map(canonicalKey)).size, 120, 'distinct');
  const names = molecules.map((mol) => {
    assert.equal(validateForNaming(mol), null, writeSmiles(mol));
    return nameMolecule(mol).name;
  });
  assert.ok(names.some((name) => /carbamoil/.test(name)), 'some carbamoil');
  assert.ok(names.some((name) => /(acetil|formil|oil\)?)amino/.test(name)), 'some acilamino');
  assert.ok(names.some((name) => /amino-\d+-oxo|amino\)-\d+-oxo/.test(name)), 'some amino…oxo');
  assert.ok(names.some((name) => /^ácido/.test(name)) && names.some((name) => / de /.test(name)) && names.some((name) => /amida$/.test(name)),
    'beside acids, esters and amides');
  // amideGraft() adds one amide group (C, O, N and its chains) per chosen hydrogen.
  const random = seededRandom(5);
  const base = randomHydrocarbon(random, { size: 4, unsaturation: 0, branchiness: 0.5 });
  const grafted = amideGraft(base, random, 0);
  assert.equal([...grafted.atoms.values()].filter((atom) => atom.element === 'N').length, 1);
  assert.equal(amideCarbons(grafted).length, 1);
}); // End of test 'the seeded amide-prefix generator…'
