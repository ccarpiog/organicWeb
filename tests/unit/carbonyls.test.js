/**
 * @file Unit tests for aldehydes and ketones (design.md §13.4 I-32): the C=O
 * as the principal characteristic group cited as the suffix `-al` / `-dial`
 * (the aldehyde carbon always in the chain, locant 1, never cited) or `-ona`
 * / `-diona` with locants; the parent chain with the most principal groups
 * (P0) and their lowest locants (N0); C=O never counted as a hydrocarbon
 * unsaturation; seniority aldehído > cetona > alcohol with the `oxo-` and
 * `hidroxi-` prefixes; a ketone left on a branch (`(2-oxopropil)`);
 * cycloalkanones; `propanona` with `propan-2-ona` and `acetona`, and
 * `formaldehído` / `acetaldehído`; the refusals (acids and other C=O
 * derivatives, an aldehyde with a ring, a ketone on a ring's side chain,
 * more than two aldehydes on a chain, an acyl branch); both lexicons; id
 * invariance; the explanation steps; the oracle generator. The names
 * themselves are checked row by row in tests/fixtures/names.tsv.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { formula } from '../../src/model/molecule.js';
import { adjacency } from '../../src/model/graph.js';
import {
  validateForNaming, carbonylKind, hasNameableHeteroatoms, sideChainCarbonyls, aldehydeOxygens, MESSAGES,
  RING_ALDEHYDE_MESSAGE, SIDE_CHAIN_CARBONYL_MESSAGE, MANY_ALDEHYDES_MESSAGE, ACYL_SUBSTITUENT_MESSAGE,
} from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { oxygenKind, principalKindOf, carbonylTraditionalId } from '../../src/naming/principal.js';
import { oxoSubstituent, nameSubstituent, suffixSites, hasAcylPrefix, PREFIX_STYLES } from '../../src/naming/substituent.js';
import { citationKey, substituentPrefix, needsEnclosure, isCompoundPrefix, suffixWords, renderName } from '../../src/naming/render.js';
import { lexiconEs, chainOmitsPrefixLocants } from '../../src/naming/lexicon.es.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { explain, plainText, atomCounts } from '../../src/explain/explain.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateCarbonyls, carbonylate } from '../../scripts/oracle/generate.mjs';
import { canonicalLayout, layoutProblems } from '../../src/layout/canonical.js';
import { projectRightAngles } from '../../src/ui/canvasbar.js';

/**
 * Names a SMILES string in the default style.
 *
 * @param {string} smiles - The molecule.
 * @returns {object} The naming result.
 */
function named(smiles) {
  return nameMolecule(parseSmiles(smiles));
}

/**
 * All the plain text of the explanation step with a given id.
 *
 * @param {string} smiles - The molecule.
 * @param {string} id - Step id.
 * @returns {string} The step's paragraphs joined, glossary marks removed ('' when the step is absent).
 */
function stepText(smiles, id) {
  const step = explain(named(smiles)).find((s) => s.id === id);
  return step ? step.text.map(plainText).join(' ') : '';
}

test('validation: aldehyde and ketone C=O are admitted; acids and other C=O derivatives keep the refusal', () => {
  for (const smiles of ['C=O', 'CC=O', 'O=CC=O', 'CC(C)=O', 'CC(=O)CC(C)=O', 'OCC=O', 'ClCC=O', 'O=C1CCCCC1', 'OC1CCC(=O)CC1']) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
  }
  // Acid, ester, acyl chloride, amide, ketene, CO₂, formic acid, carbonate: the C=O carbon has another heteroatom or a C=C.
  for (const smiles of ['CC(=O)O', 'CC(=O)OC', 'CC(=O)Cl', 'CC(N)=O', 'C=C=O', 'O=C=O', 'OC=O', 'OC(=O)O', 'NCC=O']) {
    const error = validateForNaming(parseSmiles(smiles));
    assert.equal(error.code, 'HETEROATOM', smiles);
    assert.equal(error.message, MESSAGES.HETEROATOM, smiles);
  }
  assert.match(MESSAGES.HETEROATOM, /y aldehídos y cetonas \(con un oxígeno unido a un carbono por un enlace doble, C=O\)/);
  const kinds = (smiles) => {
    const mol = parseSmiles(smiles);
    const adj = adjacency(mol);
    return [...mol.atoms.keys()].map((id) => carbonylKind(mol, adj, id));
  };
  assert.deepEqual(kinds('C=O'), [null, 'aldehyde']);
  assert.deepEqual(kinds('CC=O'), [null, null, 'aldehyde']);
  assert.deepEqual(kinds('CC(C)=O'), [null, null, null, 'ketone']);
  assert.deepEqual(kinds('CC(=O)O'), [null, null, null, null], 'the C=O of an acid is not an aldehyde');
  assert.deepEqual(kinds('C=C=O'), [null, null, null], 'a ketene is not an aldehyde');
  assert.equal(hasNameableHeteroatoms(parseSmiles('CC(=O)O'), [3, 4]), false);
  assert.equal(hasNameableHeteroatoms(parseSmiles('OCC(C)=O'), [1, 5]), true, 'an OH and a ketone');
});

test('refusals: an aldehyde with a ring, a ketone on a ring side chain, three aldehydes, an acyl branch', () => {
  const ring = named('O=CC1CCCCC1');
  assert.equal(ring.ok, false);
  assert.equal(ring.error.code, 'HETEROATOM');
  assert.equal(ring.error.reason, 'ringAldehyde');
  assert.equal(ring.error.message, RING_ALDEHYDE_MESSAGE);
  assert.match(ring.error.message, /carbaldehído/);
  assert.equal(ring.groups.principal, 'aldehyde', 'the refusal still explains the groups');
  assert.equal(named('O=CCC1CCCCC1').error.reason, 'ringAldehyde', 'an aldehyde on a side chain too');
  assert.equal(named('O=CC1=CC=CC=C1').error.reason, 'ringAldehyde', 'benzaldehyde waits for I-40');
  const side = named('CC(=O)C1CCCCC1');
  assert.equal(side.error.reason, 'sideChainCarbonyl');
  assert.equal(side.error.message, SIDE_CHAIN_CARBONYL_MESSAGE);
  assert.deepEqual(side.error.sideChain, [3]);
  assert.deepEqual(sideChainCarbonyls(parseSmiles('CC(=O)C1CCC(=O)CC1')), [{ atom: 3, kind: 'ketone' }]);
  assert.equal(named('CC(=O)C1=CC=CC=C1').error.reason, 'sideChainCarbonyl', 'acetophenone waits for I-40');
  assert.equal(named('OCC1CCC(=O)CC1').error.reason, 'sideChainAlcohol', 'ring ketone, OH on a branch');
  const three = named('O=CCC(C=O)CC=O');
  assert.equal(three.error.reason, 'manyAldehydes');
  assert.equal(three.error.message, MANY_ALDEHYDES_MESSAGE);
  assert.deepEqual(three.error.aldehydes, aldehydeOxygens(parseSmiles('O=CCC(C=O)CC=O')));
  assert.equal(named('O=CCCC=O').ok, true, 'two aldehydes: both ends of the chain');
  // A ketone carbon bonded to the parent as a branch (acetyl): refused by the engine, after validation.
  const acyl = parseSmiles('CC(=O)C(C(C)=O)C(C)=O');
  assert.equal(validateForNaming(acyl), null);
  const result = nameMolecule(acyl);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'HETEROATOM');
  assert.equal(result.error.reason, 'acylSubstituent');
  assert.equal(result.error.message, ACYL_SUBSTITUENT_MESSAGE);
  assert.deepEqual([...result.error.atoms].sort((p, q) => p - q).map((id) => acyl.atoms.get(id).element).sort(), ['C', 'O']);
  assert.equal(result.groups.principal, 'ketone');
  assert.equal(named('CCCC(C(C)=O)CC=O').error.reason, 'acylSubstituent', 'an aldehyde with an acetyl branch off a longer chain');
  assert.equal(named('CC(C(C)=O)CC=O').name, '3-metil-4-oxopentanal', 'as long through the ketone: P4 keeps it in the chain');
  // Never an acyl in any prefix style of a named molecule.
  for (const smiles of ['CC(=O)CC(CC(C)=O)CC(C)=O', 'CCC(C(C)=O)CC=O']) {
    for (const style of ['isopropil', 'pin']) {
      assert.equal(hasAcylPrefix(nameMolecule(parseSmiles(smiles), { prefixStyle: style }).structure), null, `${smiles} ${style}`);
    }
  }
  // Review I-32: the default style avoids the acyl (isopropil) but the pin
  // alternative needs one (1-oxoetil): refused in every style.
  for (const style of PREFIX_STYLES) {
    const refused = nameMolecule(parseSmiles('CC(C(C(C)=O)(C)C=O)C'), { prefixStyle: style });
    assert.equal(refused.ok, false, style);
    assert.equal(refused.error.reason, 'acylSubstituent', style);
  }
}); // End of test 'refusals'

test('terminal and internal carbonyls, several carbonyls, in both lexicons', () => {
  const pairs = [
    ['C=O', 'metanal', 'methanal'],
    ['CC=O', 'etanal', 'ethanal'],
    ['CCC=O', 'propanal', 'propanal'],
    ['O=CC=O', 'etanodial', 'ethanedial'],
    ['O=CCCC=O', 'butanodial', 'butanedial'],
    ['CC(C)C=O', '2-metilpropanal', '2-methylpropanal'],
    ['CC(C)=O', 'propanona', 'propanone'],
    ['CCC(C)=O', 'butan-2-ona', 'butan-2-one'],
    ['CC(=O)CC(C)=O', 'pentano-2,4-diona', 'pentane-2,4-dione'],
    ['CC(=O)C(=O)C(=O)C', 'pentano-2,3,4-triona', 'pentane-2,3,4-trione'],
    ['CC(=O)C(=O)C(=O)C(C)=O', 'hexano-2,3,4,5-tetrona', 'hexane-2,3,4,5-tetrone'],
    ['CC=CC(C)=O', 'pent-3-en-2-ona', 'pent-3-en-2-one'],
    ['C=CC=O', 'prop-2-enal', 'prop-2-enal'],
    ['C#CCC=O', 'but-3-inal', 'but-3-ynal'],
    ['O=CC=CC=O', 'but-2-enodial', 'but-2-enedial'],
    ['O=C1CCCCC1', 'ciclohexanona', 'cyclohexanone'],
    ['CC1CCCCC1=O', '2-metilciclohexan-1-ona', '2-methylcyclohexan-1-one'],
    ['O=C1CCC(=O)CC1', 'ciclohexano-1,4-diona', 'cyclohexane-1,4-dione'],
  ];
  for (const [smiles, es, en] of pairs) {
    const result = named(smiles);
    assert.equal(result.name, es, smiles);
    assert.equal(englishName(result.structure), en, smiles);
  }
  const one = { kind: 'ketone', locants: [{}] };
  const two = { kind: 'ketone', locants: [{}, {}] };
  const four = { kind: 'ketone', locants: [{}, {}, {}, {}] };
  assert.deepEqual(suffixWords(one, lexiconEs), { multiplier: '', word: 'ona', elides: true });
  assert.deepEqual(suffixWords(two, lexiconEs), { multiplier: 'di', word: 'ona', elides: false });
  assert.deepEqual(suffixWords(four, lexiconEs), { multiplier: 'tetr', word: 'ona', elides: false });
  assert.deepEqual(suffixWords({ kind: 'aldehyde', locants: [{}, {}] }, lexiconEn), { multiplier: 'di', word: 'al', elides: false });
}); // End of test 'terminal and internal carbonyls'

test('the aldehyde carbon is in the chain, locant 1, never cited; C=O is not a hydrocarbon unsaturation', () => {
  const result = named('CCCC(C)C=O');
  assert.equal(result.name, '2-metilpentanal');
  const { suffix, parent } = result.structure;
  assert.equal(suffix.kind, 'aldehyde');
  assert.deepEqual(suffix.locants.map((s) => s.locant), [1]);
  assert.equal(parent.length, 5, 'the CHO carbon counts in the chain');
  assert.equal(result.parent.atoms[0], suffix.locants[0].atom, 'the CHO carbon is chain atom 1');
  assert.equal(parent.double.length, 0, 'the C=O is not a double bond of the chain');
  assert.ok(!result.parts.some((p) => p.kind === 'locant' && p.atoms.includes(suffix.locants[0].attachAtom)), 'no locant for the CHO');
  // The `al` part points at the carbon and the oxygen.
  const al = result.parts.find((p) => p.text === 'al');
  assert.deepEqual([...al.atoms].sort((p, q) => p - q), [suffix.locants[0].atom, suffix.locants[0].attachAtom].sort((p, q) => p - q));
  assert.deepEqual(al.bonds, [suffix.locants[0].bond]);
  // P2 never counts a C=O: the chain through the C=C wins the tie-break, not the one "through" the C=O.
  assert.equal(named('C=CC(CC)CC=O').name, '3-etilpent-4-enal');
  assert.equal(named('CC(=O)C(C)C=C').name, '3-metilpent-4-en-2-ona');
  // No "-eno" for a C=O, ever: the parent has no double bond.
  for (const smiles of ['CC=O', 'CC(C)=O', 'O=C1CCCCC1', 'CC(=O)CCC=O', 'O=CCCC=O']) {
    assert.equal(named(smiles).structure.parent.double.length, 0, smiles);
  }
  // The suffix sites follow the principal kind.
  const mol = parseSmiles('OCCC(=O)CC=O');
  const adj = adjacency(mol);
  assert.equal(principalKindOf(mol, adj), 'aldehyde');
  assert.deepEqual([...mol.atoms.keys()].filter((id) => mol.atoms.get(id).element === 'O').map((id) => oxygenKind(mol, adj, id)),
    ['alcohol', 'ketone', 'aldehyde']);
  assert.equal(suffixSites(mol, adj, [...mol.atoms.keys()].filter((id) => mol.atoms.get(id).element === 'C')).length, 1);
}); // End of test 'aldehyde carbon in the chain'

test('P0 and N0: the parent carries the most principal groups; they get the lowest locants first', () => {
  // A longer chain without the ketone loses (P0 before P1).
  const result = named('CCCCCC(CC)C(C)=O');
  assert.equal(result.name, '3-etiloctan-2-ona');
  const hexanal = named('CCCCC(CCCCCC)C=O');
  assert.equal(hexanal.name, '2-butiloctanal');
  const [p0] = hexanal.trace;
  assert.equal(p0.rule, 'P0');
  // N0 before N1: the C=O carbon gets 2, the double bond 3.
  const enone = named('CC=CC(C)=O');
  const rules = enone.trace.map((s) => s.rule);
  assert.ok(rules.includes('N0') && !rules.includes('N1'), 'N0 decides');
  assert.equal(named('CC(=O)CC(C)C').name, '4-metilpentan-2-ona', 'N0 then N3');
  assert.equal(named('CC(=O)CC(=O)C(Cl)C').name, '5-clorohexano-2,4-diona', 'N0 then N3');
  assert.equal(named('ClCC(C)=O').name, '1-cloropropan-2-ona', 'N0 tie, then N3');
  // Ring: the C=O carbon is 1, then the double bond, then the prefixes.
  assert.equal(named('O=C1C=CCCC1').name, 'ciclohex-2-en-1-ona');
  assert.equal(named('CC1CCC(=O)CC1').name, '4-metilciclohexan-1-ona');
  assert.equal(named('CC1CCCCC1=O').trace[1].rule, 'N0');
}); // End of test 'P0 and N0'

test('seniority aldehído > cetona > alcohol: oxo- and hidroxi- prefixes, alphabetical with the others', () => {
  const pairs = [
    ['CC(=O)CCC=O', '4-oxopentanal', '4-oxopentanal'],
    ['CC(=O)C=O', '2-oxopropanal', '2-oxopropanal'],
    ['O=CCC(=O)CC=O', '3-oxopentanodial', '3-oxopentanedial'],
    ['CC(O)CC=O', '3-hidroxibutanal', '3-hydroxybutanal'],
    ['OCC=O', '2-hidroxietanal', '2-hydroxyethanal'],
    ['CC(=O)CCO', '4-hidroxibutan-2-ona', '4-hydroxybutan-2-one'],
    ['OCC(=O)CO', '1,3-dihidroxipropan-2-ona', '1,3-dihydroxypropan-2-one'],
    ['OCCC(=O)CC=O', '5-hidroxi-3-oxopentanal', '5-hydroxy-3-oxopentanal'],
    ['CC(=O)CC(C)(C)O', '4-hidroxi-4-metilpentan-2-ona', '4-hydroxy-4-methylpentan-2-one'],
    ['ClCC(=O)CC=O', '4-cloro-3-oxobutanal', '4-chloro-3-oxobutanal'],
    ['CC(Br)C(=O)CC=O', '4-bromo-3-oxopentanal', '4-bromo-3-oxopentanal'],
    ['OC1CCC(=O)CC1', '4-hidroxiciclohexan-1-ona', '4-hydroxycyclohexan-1-one'],
    ['CC(=O)CC(CC(C)=O)CC(C)=O', '4-(2-oxopropil)heptano-2,6-diona', '4-(2-oxopropyl)heptane-2,6-dione'],
    ['CCC(C(C)=O)CC=O', '3-etil-4-oxopentanal', '3-ethyl-4-oxopentanal'],
  ];
  for (const [smiles, es, en] of pairs) {
    const result = named(smiles);
    assert.equal(result.name, es, smiles);
    assert.equal(englishName(result.structure), en, smiles);
  }
  const oxo = named('CC(=O)CCC=O').structure.prefixes[0];
  assert.equal(oxo.substituent.oxo, true);
  assert.equal(oxo.locants[0].order, 2, 'attached by the C=O double bond');
  // oxo: a simple prefix, cited under o.
  const sub = oxoSubstituent(7);
  assert.equal(substituentPrefix(sub, lexiconEs), 'oxo');
  assert.equal(substituentPrefix(sub, lexiconEn), 'oxo');
  assert.equal(needsEnclosure(sub), false);
  assert.equal(isCompoundPrefix(sub), false);
  assert.deepEqual(citationKey(sub, lexiconEs), { alpha: 'oxo', numeric: [], italic: '' });
  assert.deepEqual(nameSubstituent(parseSmiles('C=O'), 1, 2), oxoSubstituent(2));
  // The C=O inside a branch is not a multiple bond of that branch.
  const branch = named('CC(=O)CC(CC(C)=O)CC(C)=O').structure.prefixes[0];
  assert.deepEqual(branch.locants[0].multipleBonds, []);
  assert.equal(branch.substituent.chain.double.length, 0);
}); // End of test 'seniority'

test('propanona: locant omitted, propan-2-ona and acetona as other valid forms; formaldehído, acetaldehído', () => {
  const acetone = named('CC(C)=O');
  assert.equal(acetone.name, 'propanona');
  assert.deepEqual(acetone.alternatives.map(({ style, name }) => [style, name]), [['locants', 'propan-2-ona'], ['traditional', 'acetona']]);
  assert.match(acetone.alternatives[1].label, /nombre tradicional/);
  const cited = acetone.alternatives[0];
  assert.deepEqual(cited.parts.map((p) => p.text), ['prop', 'an', '-', '2', '-', 'ona']);
  assert.equal(renderName(acetone.structure, lexiconEn, { citeLocants: true }).name, 'propan-2-one');
  assert.deepEqual(named('C=O').alternatives.map((a) => a.name), ['formaldehído']);
  assert.deepEqual(named('CC=O').alternatives.map((a) => a.name), ['acetaldehído']);
  // Only the bare molecules: substituted ones have no traditional name, longer ketones cite the locant.
  for (const smiles of ['ClCC=O', 'CCC=O', 'ClCC(C)=O', 'OCC(=O)CO', 'CCC(C)=O', 'O=CC=O']) {
    assert.deepEqual(named(smiles).alternatives, [], smiles);
  }
  assert.equal(carbonylTraditionalId(acetone.structure), 'acetone');
  assert.equal(carbonylTraditionalId(named('CCO').structure), null);
  assert.deepEqual(['formaldehyde', 'acetaldehyde', 'acetone'].map((id) => lexiconEs.traditionalName(id)), ['formaldehído', 'acetaldehído', 'acetona']);
  assert.deepEqual(['formaldehyde', 'acetaldehyde', 'acetone'].map((id) => lexiconEn.traditionalName(id)), ['formaldehyde', 'acetaldehyde', 'acetone']);
  const chain = (length) => ({ length, double: [], triple: [] });
  assert.equal(chainOmitsPrefixLocants(chain(3), [], 1, 'ketone'), true);
  assert.equal(chainOmitsPrefixLocants(chain(3), [], 1, 'alcohol'), false, 'propan-2-ol keeps it');
  assert.equal(chainOmitsPrefixLocants(chain(4), [], 1, 'ketone'), false, 'butan-2-ona keeps it');
  assert.equal(chainOmitsPrefixLocants(chain(2), [], 2, 'aldehyde'), false);
}); // End of test 'propanona'

test('formula and atom counts: each C=O takes the place of two hydrogens', () => {
  for (const [smiles, expected] of [
    ['C=O', { carbons: 1, hydrogens: 2, halogens: {}, oxygens: 1 }],
    ['CC(C)=O', { carbons: 3, hydrogens: 6, halogens: {}, oxygens: 1 }],
    ['CC(=O)CCC=O', { carbons: 5, hydrogens: 8, halogens: {}, oxygens: 2 }],
    ['OCC(=O)CO', { carbons: 3, hydrogens: 6, halogens: {}, oxygens: 3 }],
    ['CC(=O)CC(CC(C)=O)CC(C)=O', { carbons: 10, hydrogens: 16, halogens: {}, oxygens: 3 }],
    ['ClCC(=O)CC=O', { carbons: 4, hydrogens: 5, halogens: { Cl: 1 }, oxygens: 2 }],
    ['OC1CCC(=O)CC1', { carbons: 6, hydrogens: 10, halogens: {}, oxygens: 2 }],
  ]) {
    assert.deepEqual(atomCounts(named(smiles).structure), expected, smiles);
    const { carbons, hydrogens, halogens, oxygens } = expected;
    const hill = `C${carbons === 1 ? '' : carbons}H${hydrogens}${Object.entries(halogens).map(([el, n]) => `${el}${n === 1 ? '' : n}`).join('')}O${oxygens === 1 ? '' : oxygens}`;
    assert.equal(formula(parseSmiles(smiles)), hill, smiles);
  }
});

test('names never depend on atom ids or drawing order', () => {
  const random = seededRandom(32);
  for (const smiles of ['CC(C)C=O', 'CC(=O)CC(C)=O', 'CC(=O)CCC=O', 'OCC(=O)CO', 'CC(=O)CC(CC(C)=O)CC(C)=O', 'CC1CCCCC1=O',
    'OC1CCC(=O)CC1', 'CCC(C(C)=O)CC=O', 'CC(C)=O', 'CC(=O)C(C(C)=O)C(C)=O']) {
    const reference = named(smiles);
    for (let k = 0; k < 6; k += 1) {
      const result = nameMolecule(scrambleMolecule(parseSmiles(smiles), random));
      assert.equal(result.ok, reference.ok, smiles);
      assert.equal(result.ok ? result.name : result.error.reason, reference.ok ? reference.name : reference.error.reason, smiles);
      assert.deepEqual((result.alternatives || []).map((a) => a.name), (reference.alternatives || []).map((a) => a.name), smiles);
    }
  }
});

test('explanation: the C=O group, -al / -ona, the uncited aldehyde locant, oxo- and hidroxi-', () => {
  const ids = (smiles) => explain(named(smiles)).map((s) => s.id);
  assert.deepEqual(ids('C=O'), ['count', 'group', 'assemble']);
  assert.deepEqual(ids('CC=O'), ['count', 'group', 'groupChain', 'numbering', 'assemble']);
  assert.deepEqual(ids('O=C1CCCCC1'), ['count', 'group', 'ring', 'ringNumbering', 'assemble']);
  assert.match(stepText('CC(C)=O', 'count'), /3 carbonos, 6 hidrógenos y 1 átomo de oxígeno \(C₃H₆O\)/);
  assert.match(stepText('CC(C)=O', 'count'), /con un enlace doble \(C=O\) se ve como O: no lleva hidrógeno/);
  assert.match(stepText('CC(=O)CCO', 'count'), /El oxígeno del grupo –OH se ve como OH.*ocupa el sitio de dos/);
  assert.match(stepText('CCC=O', 'group'), /la molécula es un aldehído.*siempre está en un extremo de la cadena.*sufijo «-al»/);
  assert.match(stepText('CC(C)=O', 'group'), /la molécula es una cetona.*sufijo «-ona»/);
  assert.match(stepText('O=CCCC=O', 'group'), /uno en cada extremo de la cadena principal, así que el sufijo dice cuántos: «-dial»/);
  assert.match(stepText('CC(=O)CC(C)=O', 'group'), /2 grupos C=O en la cadena principal, así que el sufijo dice cuántos: «-diona»/);
  assert.match(stepText('CC(=O)CCC=O', 'group'), /aldehído > cetona > alcohol.*Aquí manda el aldehído, así que cada C=O de cetona se nombra con el prefijo «oxo-»/);
  assert.match(stepText('CC(=O)CCO', 'group'), /Aquí manda la cetona, así que cada –OH se nombra con el prefijo «hidroxi-»/);
  assert.match(stepText('CC(=O)CC(CC(C)=O)CC(C)=O', 'group'), /3 grupos C=O.*Un C=O queda en una rama.*«oxo-»/);
  assert.match(stepText('CC(=O)CC(CC(C)=O)CC(C)=O', 'groupChain'), /Ninguna cadena puede llevar todos los grupos C=O: el que queda en una rama se nombra con el prefijo «oxo-»/);
  assert.match(stepText('CCCCC(CCCCCC)C=O', 'groupChain'), /Hay una cadena más larga, de 11 carbonos, pero lleva menos grupos –CHO/);
  assert.match(stepText('CC(C)C=O', 'numbering'), /Regla: los grupos –CHO \(el grupo principal\) deben tener los localizadores más bajos/);
  assert.match(stepText('CC(C)C=O', 'numbering'), /El carbono del grupo –CHO siempre es el 1, así que su número no se escribe: «2-metilpropanal»/);
  assert.match(stepText('CCC=O', 'numbering'), /Aquí no hace falta numerar.*«propanal», nunca «-1-al»/);
  assert.match(stepText('O=CCCC=O', 'numbering'), /Los dos grupos –CHO están en los extremos, en los carbonos 1 y 4/);
  assert.match(stepText('C=CCC=O', 'numbering'), /el enlace doble tendría el número 1 en vez del 3, pero manda el –CHO/);
  assert.match(stepText('CC=CC(C)=O', 'numbering'), /Regla: los grupos C=O \(el grupo principal\)/);
  assert.match(stepText('CC(C)=O', 'numbering'), /En «propanona» no hace falta el número: .*solo puede estar en el carbono 2.*«propan-2-ona», que también es correcto/);
  assert.match(stepText('O=C1CCCCC1', 'ringNumbering'), /Empieza a contar por el carbono del grupo C=O/);
  assert.match(stepText('O=C1CCCCC1', 'ringNumbering'), /el número no se escribe: «ciclohexanona»/);
  assert.match(stepText('CC1CCCCC1=O', 'ringNumbering'), /aquí ese 1 se escribe \(«2-metilciclohexan-1-ona»\).*«ciclohexanona»/);
  assert.match(stepText('O=C1CCCCC1', 'ring'), /su carbono sí: el grupo C=O es el grupo principal y da la terminación «-ona»/);
  assert.match(stepText('CC(=O)CCC=O', 'substituents'), /En el carbono 4 hay un oxígeno unido con un enlace doble \(C=O\): se escribe «4-oxo»/);
  assert.match(stepText('CC(=O)CCO', 'substituents'), /En el carbono 4 hay un grupo –OH: se escribe «4-hidroxi»/);
  assert.match(stepText('CC(=O)CC(CC(C)=O)CC(C)=O', 'substituents'), /Es una rama con un grupo C=O.*no va en el sufijo «-ona»: se nombra con el prefijo «oxo-»/);
  assert.match(stepText('CCC(C(C)=O)CC=O', 'tiebreak'), /cuentan las ramas y también los grupos que van como prefijo/);
  assert.match(stepText('CC(C)=O', 'assemble'), /La «o» final de «-ano» se quita delante de «-ona».*«propan-2-ona»: con el localizador.*«acetona»: nombre tradicional/);
  assert.match(stepText('CC(=O)CC(C)=O', 'assemble'), /«di» quiere decir que hay 2 grupos C=O.*se queda delante de «-diona»/);
  assert.match(stepText('CCC=O', 'assemble'), /«-al», sin número\. El –CHO no lleva número/);
  const legend = explain(named('CCC(C)=O')).find((s) => s.id === 'assemble').legend;
  assert.deepEqual(legend.map((l) => l.text), ['but', '-an', '2', '-ona']);
  assert.equal(legend[2].meaning, 'carbono del grupo C=O');
  const aldehyde = explain(named('CC(C)C=O')).find((s) => s.id === 'assemble').legend;
  assert.deepEqual(aldehyde.map((l) => l.text), ['2', 'metil', 'prop', '-an', '-al'], 'no locant entry for the CHO');
  const numbering = explain(named('CC(C)C=O')).find((s) => s.id === 'numbering');
  assert.equal(numbering.compare.rows[0].label, 'Grupos –CHO');
  // Each C=O is highlighted whole: the suffix C and O in the group step, and an oxo- prefix with its carbon.
  const group = explain(named('CC(=O)CCC=O')).find((s) => s.id === 'group');
  const result = named('CC(=O)CCC=O');
  const [site] = result.structure.suffix.locants;
  assert.deepEqual(group.highlight[0], { atoms: [site.atom, site.attachAtom], bonds: [site.bond], style: 'parent' });
  const oxo = result.structure.prefixes[0].locants[0];
  assert.deepEqual(group.highlight[1], { atoms: [oxo.atom, oxo.attachAtom], bonds: [oxo.bond], style: 'substituent' });
  // The refusals get the group steps and their own message.
  const refused = explain(named('O=CC1CCCCC1'));
  assert.deepEqual(refused.map((s) => s.id), ['groups', 'principal', 'affixes', 'notYet']);
  assert.match(refused[3].text[0], /carbaldehído/);
}); // End of test 'explanation'

test('views that need a name: Ordenar dibujo lays out carbonyls; the 90° view keeps the normal drawing', () => {
  for (const smiles of ['C=O', 'CC(C)=O', 'O=CCCC=O', 'CC(=O)CC(CC(C)=O)CC(C)=O', 'O=C1CCCCC1', 'OC1CCC(=O)CC1', 'CCC(C(C)=O)CC=O']) {
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
  assert.deepEqual(projectRightAngles(parseSmiles('CC(C)=O')), { ok: false, reason: 'HETEROATOM' });
});

test('oracle generator: deterministic aldehydes and ketones, all named, C=O on ring carbons only', () => {
  const first = generateCarbonyls({ count: 60, seed: 3 }).map(writeSmiles);
  assert.deepEqual(generateCarbonyls({ count: 60, seed: 3 }).map(writeSmiles), first);
  assert.equal(first.length, 60);
  for (const smiles of first) {
    const mol = parseSmiles(smiles);
    const adj = adjacency(mol);
    assert.ok([...mol.atoms.keys()].some((id) => carbonylKind(mol, adj, id) !== null), smiles);
    assert.equal(nameMolecule(mol).ok, true, smiles);
  }
  const ring = carbonylate(parseSmiles('CC1CCCCC1'), seededRandom(1), 1, new Set([3]));
  assert.equal(nameMolecule(ring).name, '2-metilciclohexan-1-ona', 'only the allowed carbon gets the =O');
  assert.equal(writeSmiles(carbonylate(parseSmiles('CC'), seededRandom(1), 0)), 'CC', 'rate 0: unchanged');
});
