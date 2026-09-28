/**
 * @file Unit tests for the ester prefixes and diesters (design.md §13.4
 * I-39c). Beside an acid (ácido > éster) an ester is a prefix: its C=O
 * carbon stays a chain carbon whenever the chain rules reach it, cited
 * `alcoxi` + `oxo` at that locant (`ácido 4-metoxi-4-oxobutanoico`); when
 * the chain misses it the whole ester is `alcoxicarbonil`
 * (`ácido 3-(metoxicarbonil)pentanodioico`); bonded through its O it is
 * `aciloxi` (`ácido 2-(acetiloxi)etanoico`). Two esters on one carbon
 * piece are both chain ends of the parent (`butanodioato de dimetilo`,
 * `propanodioato de etilo y metilo`). Covers the names in every style and
 * both lexicons, enclosure and multipliers, the refusals that stay
 * (`esterPrefix`, `manyEsters`, `mixedDiester`, rings), the
 * explanation, id invariance, Ordenar dibujo and the oracle generator. The
 * names themselves are also checked row by row in tests/fixtures/names.tsv.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { canonicalKey } from '../../src/model/graph.js';
import {
  validateForNaming, diesterNeedsLocants, esterCarbons, ESTER_PREFIX_MESSAGE, MANY_ESTERS_MESSAGE, MIXED_DIESTER_MESSAGE,
} from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { carbonylTraditionalId } from '../../src/naming/principal.js';
import { PREFIX_STYLES, nameSubstituent, esterAttachment } from '../../src/naming/substituent.js';
import { needsEnclosure, isCompoundPrefix, isContractedAlkoxy, substituentPrefix, citationKey } from '../../src/naming/render.js';
import { esterParts } from '../../src/naming/structure.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { lexiconEs } from '../../src/naming/lexicon.es.js';
import { adjacency } from '../../src/model/graph.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateEsterPrefixes, esterGraft, randomHydrocarbon } from '../../scripts/oracle/generate.mjs';
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
  ['COC(=O)CCC(=O)O', 'ácido 4-metoxi-4-oxobutanoico', '4-methoxy-4-oxobutanoic acid'],
  ['CCOC(=O)CC(=O)O', 'ácido 3-etoxi-3-oxopropanoico', '3-ethoxy-3-oxopropanoic acid'],
  ['CCOC(=O)C(=O)O', 'ácido 2-etoxi-2-oxoetanoico', '2-ethoxy-2-oxoethanoic acid'],
  ['OC(=O)CC(C)C(=O)OC', 'ácido 3-metil-4-metoxi-4-oxobutanoico', '3-methyl-4-methoxy-4-oxobutanoic acid'],
  ['OC(=O)CC(C(=O)OC)CC(=O)O', 'ácido 3-(metoxicarbonil)pentanodioico', '3-(methoxycarbonyl)pentanedioic acid'],
  ['OC(=O)C(C(=O)OC)CCCC', 'ácido 2-(metoxicarbonil)hexanoico', '2-(methoxycarbonyl)hexanoic acid'],
  ['OC(=O)CC(C(=O)OCCCl)CC(=O)O', 'ácido 3-[(2-cloroetoxi)carbonil]pentanodioico', '3-[(2-chloroethoxy)carbonyl]pentanedioic acid'],
  ['OC(=O)C(C(=O)OC)(C(=O)OC)CCC(=O)O', 'ácido 2,2-bis(metoxicarbonil)pentanodioico', '2,2-bis(methoxycarbonyl)pentanedioic acid'],
  ['OC(=O)C(C(=O)OC)C(=O)OC', 'ácido 3-metoxi-2-(metoxicarbonil)-3-oxopropanoico', '3-methoxy-2-(methoxycarbonyl)-3-oxopropanoic acid'],
  ['OC(=O)CC(CC(=O)OC)CCC', 'ácido 3-(2-metoxi-2-oxoetil)hexanoico', '3-(2-methoxy-2-oxoethyl)hexanoic acid'],
  ['CC(=O)OCC(=O)O', 'ácido 2-(acetiloxi)etanoico', '2-(acetyloxy)ethanoic acid'],
  ['O=COC(C)C(=O)O', 'ácido 2-(formiloxi)propanoico', '2-(formyloxy)propanoic acid'],
  ['CCC(=O)OCCC(=O)O', 'ácido 3-(propanoiloxi)propanoico', '3-(propanoyloxy)propanoic acid'],
  ['CC(C)C(=O)OCC(=O)O', 'ácido 2-[(2-metilpropanoil)oxi]etanoico', '2-[(2-methylpropanoyl)oxy]ethanoic acid'],
  ['C=CC(=O)OCCC(=O)O', 'ácido 3-[(prop-2-enoil)oxi]propanoico', '3-[(prop-2-enoyl)oxy]propanoic acid'],
  ['OC(=O)C(OC(C)=O)OC(C)=O', 'ácido 2,2-bis(acetiloxi)etanoico', '2,2-bis(acetyloxy)ethanoic acid'],
  ['OC(=O)COC(=O)COC(=O)C', 'ácido 2-{[2-(acetiloxi)etanoil]oxi}etanoico', '2-{[2-(acetyloxy)ethanoyl]oxy}ethanoic acid'],
  ['COC(=O)CCC(=O)OC', 'butanodioato de dimetilo', 'dimethyl butanedioate'],
  ['COC(=O)C(=O)OC', 'etanodioato de dimetilo', 'dimethyl ethanedioate'],
  ['COC(=O)CC(=O)OCC', 'propanodioato de etilo y metilo', 'ethyl methyl propanedioate'],
  ['CC(C)(C)OC(=O)CC(=O)OC(C)(C)C', 'propanodioato de di-tert-butilo', 'di-tert-butyl propanedioate'],
  ['ClCCOC(=O)CCC(=O)OCCCl', 'butanodioato de bis(2-cloroetilo)', 'bis(2-chloroethyl) butanedioate'],
  ['COC(=O)CC(C)C(=O)OC', '2-metilbutanodioato de dimetilo', 'dimethyl 2-methylbutanedioate'],
  ['CCOC(=O)C(C(C)=O)C(=O)OCC', '2-acetilpropanodioato de dietilo', 'diethyl 2-acetylpropanedioate'],
  ['COC(=O)CC(C#N)CC(=O)OC', '3-cianopentanodioato de dimetilo', 'dimethyl 3-cyanopentanedioate'],
];

test('esters beside an acid and diesters are named, in both lexicons', () => {
  for (const [smiles, spanish, english] of NAMED) {
    const result = named(smiles);
    assert.equal(result.ok, true, `${smiles}: ${result.error && result.error.reason}`);
    assert.equal(result.name, spanish, smiles);
    assert.equal(englishName(result.structure), english, smiles);
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
  }
}); // End of test 'esters beside an acid and diesters are named, in both lexicons'

test('the ester carbon stays a chain carbon whenever the chain rules reach it', () => {
  // The longest chain through the ester carbon: alcoxi + oxo at that carbon, never alcoxicarbonil.
  assert.equal(nameOf('COC(=O)CCC(=O)O'), 'ácido 4-metoxi-4-oxobutanoico');
  assert.doesNotMatch(nameOf('COC(=O)CCCCC(=O)O'), /carbonil/);
  // A length tie: more prefixes through the ester carbon (P-45.2.1), as ácido 3-metil-4-oxobutanoico (I-39b).
  assert.equal(nameOf('OC(=O)CC(C)C(=O)OC'), 'ácido 3-metil-4-metoxi-4-oxobutanoico');
  // The chain misses the carbon: two acids on the parent, or a longer arm.
  assert.equal(nameOf('OC(=O)CC(C(=O)OC)CC(=O)O'), 'ácido 3-(metoxicarbonil)pentanodioico');
  assert.equal(nameOf('OC(=O)C(C(=O)OC)CCCC'), 'ácido 2-(metoxicarbonil)hexanoico');
  // Inside a branch the ester carbon ends the branch chain.
  assert.equal(nameOf('OC(=O)CC(CC(=O)OC)CCC'), 'ácido 3-(2-metoxi-2-oxoetil)hexanoico');
  // The `ester` flag marks the oxo and alcoxi occurrences on the ester carbon.
  const { prefixes } = named('COC(=O)CCC(=O)O').structure;
  assert.deepEqual(prefixes.map((g) => [substituentPrefix(g.substituent), g.locants.map((s) => [s.locant, Boolean(s.ester)])]),
    [['metoxi', [[4, true]]], ['oxo', [[4, true]]]]);
  // A true ether methoxy beside the ester's is grouped with it (the same prefix), each occurrence flagged apart.
  const both = named('COC(=O)CC(OC)C(=O)O');
  assert.equal(both.name, 'ácido 2,4-dimetoxi-4-oxobutanoico');
  assert.deepEqual(both.structure.prefixes[0].locants.map((s) => [s.locant, Boolean(s.ester)]), [[2, false], [4, true]]);
}); // End of test 'the ester carbon stays a chain carbon whenever the chain rules reach it'

test('the prefixes: alcoxicarbonil and aciloxi, enclosure, multipliers, order, styles', () => {
  const mol = parseSmiles('OC(=O)CC(C(=O)OC(C)C)CC(=O)O');
  const adj = adjacency(mol);
  const ctx = { mol, adj };
  const x = [...mol.atoms.keys()].find((id) => esterCarbons(mol).includes(id));
  const carrier = adj.get(x).find((n) => mol.atoms.get(n.atom).element === 'C').atom;
  const bridge = adj.get(x).find((n) => n.order === 1 && mol.atoms.get(n.atom).element === 'O').atom;
  assert.equal(esterAttachment(ctx, carrier, x), 'carbon');
  assert.equal(esterAttachment(ctx, bridge, x), 'bridge');
  assert.equal(esterAttachment(ctx, x, carrier), null);
  const sub = nameSubstituent(mol, carrier, x);
  assert.equal(sub.alkoxycarbonyl, true);
  assert.equal(substituentPrefix(sub, lexiconEs), 'isopropoxicarbonil');
  assert.equal(substituentPrefix(sub, lexiconEn), 'isopropoxycarbonyl');
  assert.equal(needsEnclosure(sub), true);
  assert.equal(isCompoundPrefix(sub), true);
  assert.equal(citationKey(sub).alpha, 'isopropoxicarbonil');
  // The prefix styles reach the alkoxy part: `[(propan-2-iloxi)carbonil]`, `[(1-metiletoxi)carbonil]`.
  assert.deepEqual(PREFIX_STYLES.map((style) => named('OC(=O)CC(C(=O)OC(C)C)CC(=O)O', style).name), [
    'ácido 3-(isopropoxicarbonil)pentanodioico', 'ácido 3-[(propan-2-iloxi)carbonil]pentanodioico',
    'ácido 3-[(1-metiletoxi)carbonil]pentanodioico']);
  assert.deepEqual(named('CC(C)OC(=O)CCC(=O)O').alternatives.map((a) => a.name), [
    'ácido 4-oxo-4-(propan-2-iloxi)butanoico', 'ácido 4-(1-metiletoxi)-4-oxobutanoico']);
  // An acyloxy prefix: acyl + oxi, never the short `acetoxi`; enclosed, compound (bis).
  const acyloxy = named('CC(=O)OCC(=O)O').structure.prefixes[0].substituent;
  assert.equal(acyloxy.alkoxy && acyloxy.acyl, true);
  assert.equal(isContractedAlkoxy(acyloxy), false);
  assert.equal(substituentPrefix(acyloxy), 'acetiloxi');
  assert.equal(substituentPrefix(acyloxy, lexiconEn), 'acetyloxy');
  assert.equal(needsEnclosure(acyloxy), true);
  assert.equal(isCompoundPrefix(acyloxy), true);
  assert.equal(nameOf('OC(=O)C(OC(C)=O)OC(C)=O'), 'ácido 2,2-bis(acetiloxi)etanoico');
  // The acyl part keeps its own marks: `[(2-metilpropanoil)oxi]`; alphabetised under m (the complete prefix).
  assert.equal(nameOf('OC(=O)C(OC(=O)CC(C)C)COC(=O)C(C)C'), 'ácido 2-[(3-metilbutanoil)oxi]-3-[(2-metilpropanoil)oxi]propanoico');
  // alcoxicarbonil before oxo, metoxi before metoxicarbonil (letters).
  assert.equal(nameOf('OC(=O)C(C(=O)OC)C(=O)OC'), 'ácido 3-metoxi-2-(metoxicarbonil)-3-oxopropanoico');
}); // End of test 'the prefixes: alcoxicarbonil and aciloxi, enclosure, multipliers, order, styles'

test('diesters: both ester carbons are chain ends; di / bis, or two groups joined by y', () => {
  const result = named('COC(=O)CC(=O)OCC');
  assert.equal(result.structure.suffix.locants.length, 2);
  assert.equal(esterParts(result.structure).length, 2);
  assert.equal(result.structure.ester, result.structure.esters[0]);
  // The O-bound group parts refer to their own atoms; the join is punctuation.
  assert.deepEqual(result.parts.slice(-3).map((p) => [p.text, p.kind]), [['etilo', 'prefix'], [' y ', 'punct'], ['metilo', 'prefix']]);
  const mol = parseSmiles('COC(=O)CC(=O)OCC');
  const covered = new Set(result.parts.flatMap((p) => p.atoms));
  assert.deepEqual([...mol.atoms.keys()].filter((id) => !covered.has(id)), [], 'every atom is in some part');
  // Every style, retained groups included; English order.
  assert.deepEqual(PREFIX_STYLES.map((style) => named('CC(C)OC(=O)CCC(=O)OC(C)C', style).name), [
    'butanodioato de diisopropilo', 'butanodioato de di(propan-2-ilo)', 'butanodioato de bis(1-metiletilo)']);
  assert.deepEqual(PREFIX_STYLES.map((style) => englishName(named('CC(C)OC(=O)CCC(=O)OC(C)C', style).structure)), [
    'diisopropyl butanedioate', 'di(propan-2-yl) butanedioate', 'bis(1-methylethyl) butanedioate']);
  assert.deepEqual(PREFIX_STYLES.map((style) => named('CCCOC(=O)CC(=O)OC(C)C', style).name), [
    'propanodioato de isopropilo y propilo', 'propanodioato de propan-2-ilo y propilo', 'propanodioato de 1-metiletilo y propilo']);
  // No traditional name for a diester (an ethanedioate is no acetate).
  assert.equal(carbonylTraditionalId(named('COC(=O)C(=O)OC').structure), null);
  assert.deepEqual(named('COC(=O)C(=O)OC').alternatives, []);
  assert.equal(named('CC(=O)OC').alternatives.at(-1).name, 'acetato de metilo', 'monoesters keep theirs');
  // Counts of a diester: both –COO– and both groups.
  assert.deepEqual(atomCounts(result.structure), { carbons: 6, hydrogens: 10, halogens: {}, oxygens: 4 });
}); // End of test 'diesters: both ester carbons are chain ends; di / bis, or two groups joined by y'

test('refusals that stay: esters on different pieces, three esters, a mixed diester that needs locants, rings, amides', () => {
  // Two esters on different carbon pieces, no acid: one would be a prefix of the other (esterPrefix).
  for (const smiles of ['CC(=O)OCCOC(C)=O', 'CC(=O)OCC(=O)OC', 'COC(=O)CNCC(=O)OC', 'CCOC(=O)COCC(=O)OC']) {
    const result = named(smiles);
    assert.equal(result.error.reason, 'esterPrefix', smiles);
    assert.equal(result.error.message, ESTER_PREFIX_MESSAGE, smiles);
    assert.equal(result.groups.principal, 'ester', smiles);
  }
  assert.match(ESTER_PREFIX_MESSAGE, /diacetato de etano-1,2-diilo/);
  // Three esters: a -carboxilato, refused (manyEsters), also with two on one piece.
  for (const smiles of ['COC(=O)CC(C(=O)OC)CC(=O)OC', 'COC(=O)CCC(=O)OCCOC(C)=O']) {
    assert.equal(nameOf(smiles), 'HETEROATOM manyEsters', smiles);
  }
  assert.match(MANY_ESTERS_MESSAGE, /más de dos grupos –COO–/);
  // Different groups on an acid part that differs seen from each end: locants would be needed (mixedDiester).
  const mixed = named('COC(=O)CC(C)C(=O)OCC');
  assert.equal(mixed.error.reason, 'mixedDiester');
  assert.equal(mixed.error.message, MIXED_DIESTER_MESSAGE);
  assert.deepEqual(mixed.error.esters, esterCarbons(parseSmiles('COC(=O)CC(C)C(=O)OCC')));
  assert.equal(diesterNeedsLocants(parseSmiles('COC(=O)CC(C)C(=O)OCC'), esterCarbons(parseSmiles('COC(=O)CC(C)C(=O)OCC'))), true);
  assert.equal(diesterNeedsLocants(parseSmiles('COC(=O)CC(=O)OCC'), esterCarbons(parseSmiles('COC(=O)CC(=O)OCC'))), false);
  assert.equal(diesterNeedsLocants(parseSmiles('COC(=O)CC(C)C(=O)OC'), esterCarbons(parseSmiles('COC(=O)CC(C)C(=O)OC'))), false);
  // A symmetric acid part with a substituent on the middle carbon needs no locants either.
  assert.equal(nameOf('COC(=O)CC(C)CC(=O)OCC'), '3-metilpentanodioato de etilo y metilo');
  // Rings keep ringEster (I-40d; ring acids are named since I-40b); amides beside an ester or acid are prefixes since I-39d.
  assert.equal(nameOf('COC(=O)C1CCC(C(=O)O)CC1'), 'HETEROATOM ringEster');
  assert.equal(nameOf('COC(=O)CC1CCC(CC(=O)OC)CC1'), 'HETEROATOM ringEster');
  assert.equal(nameOf('NC(=O)CC(=O)OC'), '3-amino-3-oxopropanoato de metilo');
  assert.equal(nameOf('NC(=O)CCC(=O)OCC(=O)O'), 'ácido 2-[(4-amino-4-oxobutanoil)oxi]etanoico');
  // Two acids on different pieces joined by an ester: a `carboxi-` branch since I-40b.
  assert.equal(nameOf('OC(=O)CC(=O)OCC(=O)O'), 'ácido 3-(carboximetoxi)-3-oxopropanoico');
}); // End of test 'refusals that stay…'

test('the explanation: the ester is not the principal group, how each prefix is formed, the diester', () => {
  const group = stepText('COC(=O)CCC(=O)O', 'group');
  assert.match(group, /También tiene un grupo –COO– \(un éster\)/);
  assert.match(group, /ácido > éster > aldehído > cetona > alcohol/);
  assert.match(group, /su C=O se nombra con «oxo-», y su oxígeno del medio, junto con el grupo unido a él, con un prefijo acabado en «-oxi» \(aquí, «metoxi»\)/);
  assert.doesNotMatch(group, /–CHO en el otro extremo/, 'the ester C=O is not an aldehyde');
  // No ether step for the middle O of an ester prefix; a true ether keeps it.
  assert.equal(stepText('COC(=O)CCC(=O)O', 'ether'), '');
  assert.equal(stepText('CC(=O)OCC(=O)O', 'ether'), '');
  assert.match(stepText('COC(=O)CC(OC)C(=O)O', 'ether'), /El oxígeno del medio del –COO– no cuenta/);
  assert.match(stepText('OC(=O)CC(C(=O)OC)CC(=O)O', 'group'), /«alcoxicarbonil-».*\(aquí, «metoxicarbonil»\)/);
  assert.match(stepText('CC(=O)OCC(=O)O', 'group'), /«aciloxi-».*\(aquí, «acetiloxi»\)\. La IUPAC prefiere «acetiloxi» a la forma corta «acetoxi»/);
  // The chain step: the ester carbon is a chain carbon, or outside the chain.
  assert.match(stepText('COC(=O)CCC(=O)O', 'groupChain'), /El carbono del éster que se nombra con «4-metoxi» y «4-oxo» sí forma parte de la cadena/);
  assert.match(stepText('OC(=O)C(C(=O)OC)CCCC', 'groupChain'), /no pasa por el carbono del –COO– de «metoxicarbonil»/);
  assert.match(stepText('CC(=O)OCC(=O)O', 'groupChain'), /el carbono del C=O de «acetiloxi» queda al otro lado/);
  assert.doesNotMatch(stepText('CC(=O)OCC(=O)O', 'groupChain'), /grupo acilo\), y el prefijo/);
  // The substituents step.
  const subs = stepText('COC(=O)CCC(=O)O', 'substituents');
  assert.match(subs, /En el carbono 4, «metoxi» no es un éter: es el oxígeno del medio de un éster/);
  assert.match(subs, /El C=O del carbono 4 es el de un éster/);
  assert.match(stepText('OC(=O)CC(C(=O)OC)CC(=O)O', 'substituents'), /metoxi \+ carbonil = metoxicarbonil/);
  assert.match(stepText('CC(=O)OCC(=O)O', 'substituents'), /acetil \+ oxi = acetiloxi/);
  assert.match(stepText('OC(=O)CC(CC(=O)OC)CCC', 'substituents'), /El carbono 2 de la rama es el carbono de un éster/);
  // Count step: both O of each –COO– drawn O.
  assert.match(stepText('COC(=O)CCC(=O)O', 'count'), /En el grupo –COO– hay dos oxígenos/);
  // The diester: its own step, the groups, the Spanish and English order.
  const diester = explain(named('COC(=O)CC(=O)OCC'));
  assert.deepEqual(diester.map((s) => s.id), ['count', 'group', 'diester', 'groupChain', 'numbering', 'assemble']);
  const split = stepText('COC(=O)CC(=O)OCC', 'diester');
  assert.match(split, /separan la molécula en tres partes/);
  assert.match(split, /Los dos grupos son distintos: se escriben los dos, en orden alfabético y unidos por «y»: «etilo y metilo»/);
  assert.match(stepText('COC(=O)CCC(=O)OC', 'diester'), /con «di» delante \(«di» = 2\): «dimetilo»/);
  assert.match(stepText('ClCCOC(=O)CCC(=O)OCCCl', 'diester'), /con «bis» delante y entre paréntesis/);
  assert.match(stepText('COC(=O)CC(=O)OCC', 'assemble'), /«dimethyl butanedioate»/);
  const legend = diester.at(-1).legend.map((e) => e.text);
  assert.deepEqual(legend.slice(-4), ['de', 'etilo', 'y', 'metilo']);
}); // End of test 'the explanation…'

test('the explanation highlights each ester whole', () => {
  // The ester whose carbon is in the chain: its carbon, both O and the O-bound group.
  const mol = parseSmiles('COC(=O)CCC(=O)O');
  const group = explain(nameMolecule(mol)).find((s) => s.id === 'group');
  const x = esterCarbons(mol)[0];
  const adj = adjacency(mol);
  const esterAtoms = [x, ...adj.get(x).filter((n) => mol.atoms.get(n.atom).element === 'O').map((n) => n.atom)];
  const methyl = [...mol.atoms.keys()].find((id) => adj.get(id).length === 1 && mol.atoms.get(id).element === 'C');
  assert.ok(group.highlight.some((spec) => [...esterAtoms, methyl].every((id) => spec.atoms.includes(id))), 'one spec covers the whole ester');
  // The diester step's specs cover every atom and bond exactly once.
  for (const smiles of ['COC(=O)CC(=O)OCC', 'ClCCOC(=O)CCC(=O)OCCCl', 'COC(=O)CC(C)C(=O)OC']) {
    const diester = parseSmiles(smiles);
    const step = explain(nameMolecule(diester)).find((s) => s.id === 'diester');
    const atoms = step.highlight.flatMap((spec) => spec.atoms);
    const bonds = step.highlight.flatMap((spec) => spec.bonds);
    assert.deepEqual([...atoms].sort((p, q) => p - q), [...diester.atoms.keys()].sort((p, q) => p - q), smiles);
    assert.deepEqual([...bonds].sort((p, q) => p - q), [...diester.bonds.keys()].sort((p, q) => p - q), smiles);
  }
}); // End of test 'the explanation highlights each ester whole'

test('names never depend on atom ids or drawing order', () => {
  const random = seededRandom(53);
  for (const [smiles] of NAMED) {
    const reference = named(smiles);
    for (let k = 0; k < 8; k += 1) {
      const result = nameMolecule(scrambleMolecule(parseSmiles(smiles), random));
      assert.equal(result.name, reference.name, smiles);
      assert.deepEqual(result.alternatives.map((a) => a.name), reference.alternatives.map((a) => a.name), smiles);
      assert.equal(englishName(result.structure), englishName(reference.structure), smiles);
    }
  } // End of the loop over the molecules
  for (let k = 0; k < 8; k += 1) {
    assert.equal(nameMolecule(scrambleMolecule(parseSmiles('COC(=O)CC(C)C(=O)OCC'), random)).error.reason, 'mixedDiester');
  }
}); // End of test 'names never depend on atom ids or drawing order'

test('Ordenar dibujo lays out ester-prefix molecules and diesters', () => {
  for (const smiles of ['COC(=O)CCC(=O)O', 'OC(=O)CC(C(=O)OC(C)C)CC(=O)O', 'CC(=O)OCC(=O)O', 'COC(=O)CC(=O)OCC', 'ClCCOC(=O)CCC(=O)OCCCl']) {
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
}); // End of test 'Ordenar dibujo lays out ester-prefix molecules and diesters'

test('the seeded ester-prefix generator: deterministic, distinct, valid, varied', () => {
  const molecules = generateEsterPrefixes({ count: 120, seed: 3 });
  assert.equal(molecules.length, 120);
  assert.deepEqual(generateEsterPrefixes({ count: 120, seed: 3 }).map(writeSmiles), molecules.map(writeSmiles), 'deterministic');
  assert.notDeepEqual(generateEsterPrefixes({ count: 120, seed: 4 }).map(writeSmiles), molecules.map(writeSmiles));
  assert.equal(new Set(molecules.map(canonicalKey)).size, 120, 'distinct');
  const names = molecules.map((mol) => {
    assert.equal(validateForNaming(mol), null, writeSmiles(mol));
    return nameMolecule(mol).name;
  });
  assert.ok(names.some((name) => /carbonil/.test(name)), 'some alcoxicarbonil');
  assert.ok(names.some((name) => /(acetil|formil|oil\)?)oxi/.test(name)), 'some aciloxi');
  assert.ok(names.some((name) => /oxi-\d+-oxo|oxi.*-oxo[a-z]+oico/.test(name)), 'some alcoxi…oxo');
  assert.ok(names.some((name) => /dioato de di/.test(name)), 'some diesters with identical groups');
  assert.ok(names.some((name) => /dioato de .+ y /.test(name)), 'some diesters with two groups');
  // esterGraft() adds one ester group (C, two O and its chain) per chosen hydrogen.
  const random = seededRandom(5);
  const base = randomHydrocarbon(random, { size: 4, unsaturation: 0, branchiness: 0.5 });
  const grafted = esterGraft(base, random, 0);
  assert.equal([...grafted.atoms.values()].filter((atom) => atom.element === 'O').length, 2);
  assert.equal(esterCarbons(grafted).length, 1);
}); // End of test 'the seeded ester-prefix generator…'
