/**
 * @file Unit tests for esters (design.md §13.4 I-35): the –COO– as the
 * principal group after the acids (ácido > éster > aldehído > cetona >
 * alcohol), named in two words — the acid part (the chain with the C=O
 * carbon, locant 1, never cited, suffix `-oato`) and the O-bound group
 * (named like a branch, `metilo`, `isopropilo`, `2-cloroetilo`) —
 * assembled `…oato de …ilo` in Spanish and `…yl …oate` in English;
 * branched groups on both sides; `oxo-`, `hidroxi-`, halogen and alkoxy
 * prefixes on either part; `formiato` / `acetato` as other valid forms;
 * the refusals (more than one ester, an ester with an acid, an ester with a
 * ring, anhydrides, carbonates, lactones); id invariance; the explanation
 * steps; the oracle generator. The names themselves are checked row by row
 * in tests/fixtures/names.tsv.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { formula } from '../../src/model/molecule.js';
import { adjacency } from '../../src/model/graph.js';
import {
  validateForNaming, isEsterCarbon, esterRole, esterCarbons, hasNameableHeteroatoms, isEtherOxygen, MESSAGES,
  RING_ESTER_MESSAGE, MANY_ESTERS_MESSAGE, ESTER_PREFIX_MESSAGE, RING_SYSTEM_MESSAGES,
} from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import {
  oxygenKind, principalKindOf, isPrincipalOxygen, isSuffixOxygen, carbonylTraditionalId, OXYGEN_KINDS,
} from '../../src/naming/principal.js';
import { suffixSites, PREFIX_STYLES } from '../../src/naming/substituent.js';
import { renderName, suffixGroupIds, esterAlkylName } from '../../src/naming/render.js';
import { lexiconEs } from '../../src/naming/lexicon.es.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { explain, plainText, atomCounts } from '../../src/explain/explain.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { buildCases } from '../../scripts/oracle/run.mjs';
import {
  scrambleMolecule, seededRandom, generateEsters, esterify, randomHydrocarbon,
} from '../../scripts/oracle/generate.mjs';
import { canonicalLayout, layoutProblems } from '../../src/layout/canonical.js';

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

test('validation: an ester –COO– is admitted; anhydrides, carbonates, peroxy esters and lactones keep their refusal', () => {
  for (const smiles of ['CC(=O)OC', 'O=COC', 'CCC(=O)OCC', 'CC(=O)OC=C', 'ClCC(=O)OC', 'CC(=O)OCCO', 'CC(=O)CC(=O)OCC', 'CC(=O)OCOC']) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
  }
  // Anhydride, carbonate, peroxy ester, an ester with a nitrile (with an amine, `2-aminoetanoato de metilo`, named since I-36).
  for (const smiles of ['CC(=O)OC(C)=O', 'COC(=O)OC', 'CC(=O)OOC', 'N#CCC(=O)OC']) {
    const error = validateForNaming(parseSmiles(smiles));
    assert.equal(error.code, 'HETEROATOM', smiles);
    assert.equal(error.message, MESSAGES.HETEROATOM, smiles);
  }
  assert.match(MESSAGES.HETEROATOM, /, ésteres \(con el grupo –COO– entre dos cadenas de carbonos\) y aminas/);
  // A lactone is a heterocycle: out of scope.
  for (const smiles of ['O=C1CCCO1', 'O=C1CCCCO1']) {
    const error = validateForNaming(parseSmiles(smiles));
    assert.equal(error.code, 'RING_SYSTEM', smiles);
    assert.equal(error.message, RING_SYSTEM_MESSAGES.heterocycle);
  }
  // CC(=O)OC: atoms 1 C, 2 C (ester carbon), 3 =O, 4 bridge O, 5 C.
  const mol = parseSmiles('CC(=O)OC');
  const adj = adjacency(mol);
  assert.deepEqual([...mol.atoms.keys()].map((id) => isEsterCarbon(mol, adj, id)), [false, true, false, false, false]);
  assert.deepEqual([...mol.atoms.keys()].map((id) => esterRole(mol, adj, id)), [null, null, 'carbonyl', 'bridge', null]);
  assert.equal(isEtherOxygen(mol, adj, 4), false, 'the bridge O is not an ether O');
  assert.deepEqual(esterCarbons(parseSmiles('O=COC')), [2]);
  assert.deepEqual(esterCarbons(parseSmiles('CC(=O)OC(C)=O')), [], 'an anhydride has no ester carbon');
  assert.deepEqual(esterCarbons(parseSmiles('COC(=O)OC')), [], 'a carbonate has no ester carbon');
  assert.deepEqual(esterCarbons(parseSmiles('CC(=O)O')), [], 'an acid is not an ester');
  assert.equal(hasNameableHeteroatoms(mol, [3, 4]), true);
});

test('refusals: two esters, an ester with an acid, an ester with a ring on either side', () => {
  const two = named('COC(=O)CCC(=O)OC');
  assert.equal(two.ok, false);
  assert.equal(two.error.code, 'HETEROATOM');
  assert.equal(two.error.reason, 'manyEsters');
  assert.equal(two.error.message, MANY_ESTERS_MESSAGE);
  assert.deepEqual(two.error.esters, [3, 7]);
  assert.equal(two.groups.principal, 'ester', 'the refusal still explains the groups');
  assert.equal(named('CC(=O)OCCOC(C)=O').error.reason, 'manyEsters', 'a diester of a diol');
  assert.equal(named('CC(=O)OCC(=O)OC').error.reason, 'manyEsters', 'an ester inside the O-bound group of another');
  for (const smiles of ['CC(=O)OCC(=O)O', 'CCOC(=O)CC(=O)O']) {
    const both = named(smiles);
    assert.equal(both.error.reason, 'esterPrefix', smiles);
    assert.equal(both.error.message, ESTER_PREFIX_MESSAGE);
    assert.match(both.error.message, /alcoxicarbonil-.*aciloxi-/);
  }
  for (const smiles of ['CC(=O)OC1CCCCC1', 'COC(=O)C1CCCCC1', 'CC(=O)OC1=CC=CC=C1', 'COC(=O)C1=CC=CC=C1', 'CC(=O)OCC1CCCCC1', 'COC(=O)CC1CCCCC1']) {
    const ring = named(smiles);
    assert.equal(ring.error.reason, 'ringEster', smiles);
    assert.equal(ring.error.message, RING_ESTER_MESSAGE);
  }
  assert.match(RING_ESTER_MESSAGE, /etanoato de fenilo/);
  // The refusals get the group steps and their own message.
  const refused = explain(named('CC(=O)OC1CCCCC1'));
  assert.deepEqual(refused.map((s) => s.id), ['groups', 'principal', 'affixes', 'notYet']);
  assert.equal(refused[3].text[0], RING_ESTER_MESSAGE);
});

test('esters in both lexicons: Spanish «…oato de …ilo», English «…yl …oate»', () => {
  const pairs = [
    ['CC(=O)OC', 'etanoato de metilo', 'methyl ethanoate'],
    ['CCC(=O)OCC', 'propanoato de etilo', 'ethyl propanoate'],
    ['CCCC(=O)OC(C)C', 'butanoato de isopropilo', 'isopropyl butanoate'],
    ['CC(C)C(=O)OC(C)(C)C', '2-metilpropanoato de tert-butilo', 'tert-butyl 2-methylpropanoate'],
    ['O=COC', 'metanoato de metilo', 'methyl methanoate'],
    ['CC(=O)CC(=O)OCC', '3-oxobutanoato de etilo', 'ethyl 3-oxobutanoate'],
    ['C=CC(=O)OC', 'prop-2-enoato de metilo', 'methyl prop-2-enoate'],
    ['CC(=O)OCC=C', 'etanoato de prop-2-en-1-ilo', 'prop-2-en-1-yl ethanoate'],
    ['CC(=O)OC=C', 'etanoato de etenilo', 'ethenyl ethanoate'],
    ['CC(=O)OC(C)CC', 'etanoato de butan-2-ilo', 'butan-2-yl ethanoate'],
    ['CC(=O)OCCCl', 'etanoato de 2-cloroetilo', '2-chloroethyl ethanoate'],
    ['CC(=O)OCCO', 'etanoato de 2-hidroxietilo', '2-hydroxyethyl ethanoate'],
    ['CC(O)C(=O)OCC', '2-hidroxipropanoato de etilo', 'ethyl 2-hydroxypropanoate'],
    ['COCC(=O)OC', '2-metoxietanoato de metilo', 'methyl 2-methoxyethanoate'],
    ['CC(=O)OCCOC', 'etanoato de 2-metoxietilo', '2-methoxyethyl ethanoate'],
    ['FC(F)(F)C(=O)OCC', '2,2,2-trifluoroetanoato de etilo', 'ethyl 2,2,2-trifluoroethanoate'],
  ];
  for (const [smiles, es, en] of pairs) {
    const result = named(smiles);
    assert.equal(result.name, es, smiles);
    assert.equal(englishName(result.structure), en, smiles);
  }
  assert.equal(lexiconEs.esterLink, ' de ');
  assert.equal(lexiconEs.esterAlkylFirst, false);
  assert.equal(lexiconEn.esterAlkylFirst, true);
  assert.equal(lexiconEs.groupSuffix('ester'), 'oato');
  assert.equal(lexiconEn.groupSuffix('ester'), 'oate');
  assert.equal(lexiconEs.suffixClassWord('ester'), null, 'no class word: the name is two words, acid part and group');
  // Parts: the acid part, ` de `, the O-bound group (Spanish); the group first in English.
  const result = named('CCC(=O)OC');
  assert.deepEqual(result.parts.map((p) => [p.text, p.kind]), [
    ['prop', 'stem'], ['an', 'ending'], ['oato', 'ending'], [' de ', 'punct'], ['metilo', 'prefix'],
  ]);
  const english = renderName(result.structure, lexiconEn);
  assert.deepEqual(english.parts.map((p) => p.text), ['methyl', ' ', 'prop', 'an', 'oate']);
  // `oato` points at the whole –COO– (carbon, both O); the group at its own atoms, not the bridge O.
  const [site] = result.structure.suffix.locants;
  const { ester } = result.structure;
  assert.deepEqual(suffixGroupIds(result.structure.suffix), {
    atoms: [site.atom, site.attachAtom, site.esterOxygen], bonds: [site.bond, site.esterBond],
  });
  assert.deepEqual(result.parts[2].atoms, [site.atom, site.attachAtom, site.esterOxygen]);
  assert.equal(ester.oxygen, site.esterOxygen);
  assert.equal(ester.bond, site.esterBond);
  assert.deepEqual(result.parts[4].atoms, [ester.carbon]);
  assert.deepEqual(result.parts[4].bonds, [ester.alkylBond]);
  assert.equal(esterAlkylName(ester.alkyl, lexiconEs), 'metilo');
  assert.equal(esterAlkylName(ester.alkyl, lexiconEn), 'methyl');
}); // End of test 'esters in both lexicons'

test('the acid part holds the C=O carbon at locant 1 (never cited); the O-bound group is never the parent', () => {
  const result = named('CCCC(C)C(=O)OCCCCCC');
  assert.equal(result.name, '2-metilpentanoato de hexilo');
  const { suffix, parent } = result.structure;
  assert.equal(suffix.kind, 'ester');
  assert.deepEqual(suffix.locants.map((s) => s.locant), [1]);
  assert.equal(parent.length, 5, 'the C=O carbon counts in the chain');
  assert.equal(result.parent.atoms[0], suffix.locants[0].atom, 'the C=O carbon is chain atom 1');
  assert.ok(!result.parts.some((p) => p.kind === 'locant' && p.atoms.includes(suffix.locants[0].attachAtom)), 'no locant for the –COO–');
  // The six-carbon O-bound group is longer, but the parent must carry the principal group (P0 before P1).
  const p0 = result.trace.find((s) => s.rule === 'P0');
  assert.ok(p0.candidatesBefore.some((c) => c.atoms.length === 6));
  assert.ok(p0.survivors.every((c) => c.atoms.includes(suffix.locants[0].atom)));
  // Both oxygens are of kind 'ester'; only the C=O oxygen stands for the group.
  const mol = parseSmiles('OCC(=O)OC');
  const adj = adjacency(mol);
  assert.equal(principalKindOf(mol, adj), 'ester');
  assert.deepEqual(OXYGEN_KINDS.slice(0, 2), ['acid', 'ester'], 'ácido > éster');
  const oxygens = [...mol.atoms.keys()].filter((id) => mol.atoms.get(id).element === 'O');
  assert.deepEqual(oxygens.map((id) => oxygenKind(mol, adj, id)), ['alcohol', 'ester', 'ester']);
  assert.deepEqual(oxygens.map((id) => isPrincipalOxygen(mol, adj, id, 'ester')), [false, true, true]);
  assert.deepEqual(oxygens.map((id) => isSuffixOxygen(mol, adj, id, 'ester')), [false, true, false]);
  const sites = suffixSites(mol, adj, [2, 3]);
  assert.equal(sites.length, 1);
  assert.equal(sites[0].esterOxygen, 5);
  assert.equal(named('OCC(=O)OC').name, '2-hidroxietanoato de metilo', 'ester > alcohol');
});

test('branched groups on either side, in every prefix style', () => {
  const cases = [
    ['CC(=O)OC(C)C', ['etanoato de isopropilo', 'etanoato de propan-2-ilo', 'etanoato de 1-metiletilo']],
    ['CC(C)C(=O)OC(C)C', ['2-metilpropanoato de isopropilo', '2-metilpropanoato de propan-2-ilo', '2-metilpropanoato de 1-metiletilo']],
    ['CC(=O)OC(C)(C)C', ['etanoato de tert-butilo', 'etanoato de tert-butilo', 'etanoato de 1,1-dimetiletilo']],
    ['CC(C)CC(=O)OCC(C)C', ['3-metilbutanoato de 2-metilpropilo', '3-metilbutanoato de 2-metilpropilo', '3-metilbutanoato de 2-metilpropilo']],
    ['CCC(C)C(=O)OC(C)CC', ['2-metilbutanoato de butan-2-ilo', '2-metilbutanoato de butan-2-ilo', '2-metilbutanoato de 1-metilpropilo']],
    ['CC(C)CC(=O)OC(C)C(C)C', ['3-metilbutanoato de 3-metilbutan-2-ilo', '3-metilbutanoato de 3-metilbutan-2-ilo', '3-metilbutanoato de 1,2-dimetilpropilo']],
  ];
  for (const [smiles, names] of cases) {
    assert.deepEqual(PREFIX_STYLES.map((style) => named(smiles, style).name), names, smiles);
  }
  // The isopropyl group gives the other two styles as alternatives, and the ester is still an acetate.
  assert.deepEqual(named('CC(=O)OC(C)C').alternatives.map((a) => [a.style, a.name]), [
    ['pin', 'etanoato de propan-2-ilo'], ['substituted', 'etanoato de 1-metiletilo'], ['traditional', 'acetato de isopropilo'],
  ]);
  // An isopropyl inside the acid part does too.
  assert.deepEqual(named('CC(C)C(C)C(=O)OC').alternatives.map((a) => a.name), []);
  assert.deepEqual(named('CCCC(C(C)C)C(=O)OC').alternatives.map((a) => a.name), [
    '2-(propan-2-il)pentanoato de metilo', '2-(1-metiletil)pentanoato de metilo',
  ]);
  assert.equal(named('CCCC(C(C)C)C(=O)OC').name, '2-isopropilpentanoato de metilo');
}); // End of test 'branched groups on either side'

test('ester principal: oxo-, hidroxi-, halogen and alkoxy prefixes on either part', () => {
  const pairs = [
    ['CC(=O)CC(=O)OCC', '3-oxobutanoato de etilo'],
    ['O=CCC(=O)OC', '3-oxopropanoato de metilo'],
    ['CC(=O)CCC(=O)OC', '4-oxopentanoato de metilo'],
    ['CC(O)C(=O)OCC', '2-hidroxipropanoato de etilo'],
    ['CC(=O)CC(O)C(=O)OC', '2-hidroxi-4-oxopentanoato de metilo'],
    ['ClCC(=O)OC', '2-cloroetanoato de metilo'],
    ['BrCCCC(=O)OCC', '4-bromobutanoato de etilo'],
    ['COCC(=O)OC', '2-metoxietanoato de metilo'],
    ['CCOC(C)C(=O)OC', '2-etoxipropanoato de metilo'],
    ['CC(=O)OCCO', 'etanoato de 2-hidroxietilo'],
    ['CC(=O)OCC(C)=O', 'etanoato de 2-oxopropilo'],
    ['CC(=O)OCC=O', 'etanoato de 2-oxoetilo'],
    ['CC(=O)OCC(F)(F)F', 'etanoato de 2,2,2-trifluoroetilo'],
    ['CC(=O)OCCOC', 'etanoato de 2-metoxietilo'],
    ['CC(=O)OC(C)CO', 'etanoato de 1-hidroxipropan-2-ilo'],
  ];
  for (const [smiles, name] of pairs) {
    assert.equal(named(smiles).name, name, smiles);
  }
  // A C=O carbon bonded directly to the chain of the O-bound group (a formyl branch) is refused, as on the parent (I-32).
  assert.equal(named('CC(=O)OCC(C=O)CC').error.reason, 'acylSubstituent');
  assert.equal(named('CC(=O)OCC(C(C)=O)CC').name, 'etanoato de 2-etil-3-oxobutilo', 'a C=O inside the group chain is oxo-');
  assert.equal(named('CC(=O)C(C)C(=O)OC').name, '2-metil-3-oxobutanoato de metilo');
});

test('formiato and acetato as other valid forms, only for a bare acid part', () => {
  const acetate = named('CC(=O)OCC');
  assert.deepEqual(acetate.alternatives.map(({ style, name }) => [style, name]), [['traditional', 'acetato de etilo']]);
  assert.equal(acetate.alternatives[0].label, 'nombre tradicional, que la IUPAC (2013) conserva como preferido');
  assert.deepEqual(acetate.alternatives[0].parts.map((p) => p.text), ['acetato', ' de ', 'etilo']);
  assert.deepEqual(named('O=COC').alternatives.map((a) => a.name), ['formiato de metilo']);
  assert.deepEqual(named('CC(=O)OCCCl').alternatives.map((a) => a.name), ['acetato de 2-cloroetilo'], 'whatever the O-bound group');
  for (const smiles of ['CCC(=O)OC', 'ClCC(=O)OC', 'C=CC(=O)OC', 'OCC(=O)OC', 'CCCC(=O)OCC']) {
    assert.deepEqual(named(smiles).alternatives, [], smiles);
  }
  assert.equal(carbonylTraditionalId(acetate.structure), 'acetate');
  assert.equal(carbonylTraditionalId(named('O=COCC').structure), 'formate');
  assert.equal(renderName(acetate.structure, lexiconEn, { traditional: 'acetate' }).name, 'ethyl acetate');
  assert.equal(renderName(named('O=COC').structure, lexiconEn, { traditional: 'formate' }).name, 'methyl formate');
  // The oracle checks the traditional name as OPSIN reads it.
  const [entry] = buildCases([parseSmiles('CC(=O)OC(C)C')]);
  assert.deepEqual(entry.names.map((n) => [n.style, n.english]), [
    ['isopropil', 'isopropyl ethanoate'], ['traditional', 'isopropyl acetate'],
    ['pin', 'propan-2-yl ethanoate'], ['substituted', '1-methylethyl ethanoate'],
  ]);
}); // End of test 'formiato and acetato'

test('formula and atom counts: a –COO– is two oxygens and one C=O', () => {
  for (const smiles of ['O=COC', 'CC(=O)OC', 'CC(=O)CC(=O)OCC', 'CC(=O)OCCO', 'CC(=O)OCCCl', 'CC(=O)OCC=C', 'COCC(=O)OC',
    'CC(=O)OCCOC', 'FC(F)(F)C(=O)OCC', 'CC(C)C(=O)OC(C)(C)C']) {
    const mol = parseSmiles(smiles);
    const { carbons, hydrogens, oxygens, halogens } = atomCounts(nameMolecule(mol).structure);
    const hill = `C${carbons}H${hydrogens}${Object.entries(halogens).map(([el, n]) => `${el}${n === 1 ? '' : n}`).join('')}O${oxygens === 1 ? '' : oxygens}`;
    assert.equal(hill, formula(mol).replace(/^C(?=H)/, 'C1'), smiles);
  }
  assert.match(stepText('CC(=O)OC', 'count'), /3 carbonos, 6 hidrógenos y 2 átomos de oxígeno \(C₃H₆O₂\)/);
  assert.match(stepText('CC(=O)OC', 'count'), /En el grupo –COO– hay dos oxígenos, y los dos se ven como O/);
  assert.match(stepText('CC(=O)OCCO', 'count'), /El oxígeno del grupo –OH se ve como OH/);
});

test('names never depend on atom ids or drawing order', () => {
  const random = seededRandom(35);
  for (const smiles of ['CC(=O)OC', 'O=COC', 'CCCC(=O)OC(C)C', 'CC(C)C(=O)OC(C)(C)C', 'CC(=O)CC(=O)OCC', 'CC(=O)OCCO',
    'CCOC(C)C(=O)OC', 'CC(=O)OCC(C)(C)C=C', 'COC(=O)CCC(=O)OC', 'CC(=O)OCC(=O)O', 'CC(=O)OCC(C(C)=O)CC', 'CC(=O)OCCCCC']) {
    const reference = named(smiles);
    for (let k = 0; k < 8; k += 1) {
      const result = nameMolecule(scrambleMolecule(parseSmiles(smiles), random));
      assert.equal(result.ok, reference.ok, smiles);
      assert.equal(result.ok ? result.name : result.error.reason, reference.ok ? reference.name : reference.error.reason, smiles);
      assert.deepEqual((result.alternatives || []).map((a) => a.name), (reference.alternatives || []).map((a) => a.name), smiles);
      if (result.ok) {
        assert.equal(englishName(result.structure), englishName(reference.structure), smiles);
      }
    }
  } // End of the loop over the molecules
});

test('explanation: the –COO– group, the two parts apart, -oato, the uncited locant and the order «… de …»', () => {
  const ids = (smiles) => explain(named(smiles)).map((s) => s.id);
  assert.deepEqual(ids('O=COC'), ['count', 'group', 'ester', 'assemble']);
  assert.deepEqual(ids('CC(=O)OC'), ['count', 'group', 'ester', 'groupChain', 'numbering', 'assemble']);
  assert.match(stepText('CCC(=O)OC', 'group'), /un grupo –COO–.*la molécula es un éster/);
  assert.match(stepText('CCC(=O)OC', 'group'), /el C=O del –COO– no es una cetona, ni su oxígeno del medio un éter/);
  assert.match(stepText('CCC(=O)OC', 'group'), /siempre está en un extremo de la cadena.*siempre es el carbono 1/);
  assert.match(stepText('CC(=O)CC(=O)OCC', 'group'), /ácido > éster > aldehído > cetona > alcohol.*Aquí manda el éster/);
  assert.match(stepText('CC(=O)OCCO', 'group'), /un grupo –OH \(un alcohol\).*«hidroxi-»/);
  // The ester step explains and highlights the two parts apart.
  assert.match(stepText('CCC(=O)OC', 'ester'), /La parte del ácido.*carbono 1 de la cadena.*«ácido propanoico», cambiando «-oico» por «-oato»: «propanoato»/);
  assert.match(stepText('CCC(=O)OC', 'ester'), /La otra parte es el grupo unido al otro lado del oxígeno, de 1 carbono.*«metilo»/);
  assert.match(stepText('CCC(=O)OC', 'ester'), /primero la parte del ácido, luego «de» y al final el grupo: «propanoato de metilo»/);
  assert.match(stepText('CCCC(=O)OC(C)C', 'ester'), /«propan-2-ilo» \(el preferido por la IUPAC\) y «1-metiletilo»/);
  assert.match(stepText('CC(=O)OCC=C', 'ester'), /El número 1 que va justo antes de «-ilo»/);
  assert.doesNotMatch(stepText('CC(=O)OCCCl', 'ester'), /paréntesis/);
  const result = named('CCC(=O)OC');
  const step = explain(result).find((s) => s.id === 'ester');
  const [site] = result.structure.suffix.locants;
  const { ester } = result.structure;
  assert.deepEqual(step.options.map((o) => o.label), ['Parte del ácido', 'Grupo unido al oxígeno']);
  assert.deepEqual(step.options[0].highlight, [{
    atoms: [...result.parent.atoms, site.attachAtom], bonds: [...result.parent.bonds, site.bond], style: 'parent',
  }]);
  assert.deepEqual(step.options[1].highlight, [
    { atoms: [ester.carbon], bonds: [], style: 'substituent' },
    { atoms: [ester.oxygen], bonds: [ester.bond, ester.alkylBond], style: 'candidate' },
  ]);
  // The chain never crosses the middle O; the acid part wins over a longer O-bound group.
  assert.match(stepText('CC(=O)OCCCCC', 'groupChain'), /la cadena no puede atravesar el oxígeno del medio/);
  assert.match(stepText('CC(=O)OCCCCC', 'groupChain'), /Hay una cadena más larga, de 5 carbonos, pero lleva menos grupos –COO–/);
  assert.match(stepText('CC(C)C(=O)OC', 'numbering'), /El carbono del grupo –COO– siempre es el 1, así que su número no se escribe: «2-metilpropanoato de metilo», nunca «-1-oato»/);
  assert.match(stepText('CC(O)C(=O)OCC', 'substituents'), /«2-hidroxi».*el éster \(–COO–\) va antes que el alcohol/);
  const assemble = stepText('CC(=O)OC', 'assemble');
  assert.match(assemble, /El nombre de un éster tiene dos palabras/);
  assert.match(assemble, /La primera palabra acaba con el sufijo del grupo principal, «-oato», sin número/);
  assert.match(assemble, /Después va la palabra «de» y la segunda palabra, el nombre del grupo unido al oxígeno, acabado en «-ilo»: «metilo»/);
  assert.match(assemble, /En inglés el orden es al revés.*«methyl ethanoate»/);
  assert.match(assemble, /«acetato de metilo»: nombre tradicional/);
  const legend = explain(named('CC(C)C(=O)OC(C)C')).find((s) => s.id === 'assemble').legend;
  assert.deepEqual(legend.map((l) => l.text), ['2', 'metil', 'prop', '-an', '-oato', 'de', 'isopropilo']);
  assert.match(legend[6].meaning, /grupo unido al oxígeno del –COO– \(3 carbonos\)/);
}); // End of test 'explanation'

test('Ordenar dibujo lays out esters', () => {
  for (const smiles of ['O=COC', 'CC(=O)OC', 'CCCC(=O)OC(C)C', 'CC(=O)CC(=O)OCC', 'CC(C)C(=O)OC(C)(C)C']) {
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
});

test('oracle generator: deterministic esters, one –COO– each, all named in every style', () => {
  const first = generateEsters({ count: 60, seed: 3 }).map(writeSmiles);
  assert.deepEqual(generateEsters({ count: 60, seed: 3 }).map(writeSmiles), first);
  assert.equal(first.length, 60);
  for (const smiles of first) {
    const mol = parseSmiles(smiles);
    assert.equal(esterCarbons(mol).length, 1, smiles);
    for (const prefixStyle of PREFIX_STYLES) {
      assert.equal(nameMolecule(mol, { prefixStyle }).ok, true, `${smiles} ${prefixStyle}`);
    }
  }
  const random = seededRandom(1);
  assert.equal(nameMolecule(esterify(parseSmiles('CC(=O)O'), random, randomHydrocarbon(random, { size: 1 }))).name, 'etanoato de metilo');
  assert.equal(writeSmiles(esterify(parseSmiles('CCO'), random, parseSmiles('C'))), writeSmiles(parseSmiles('CCO')), 'no –COOH: unchanged');
});

test('the ester step covers every atom and bond once: acid part with its branches, O-bound group, middle O (review I-35)', () => {
  for (const smiles of ['CC(C)C(=O)OC', 'CC(C)C(=O)OC(C)(C)C', 'CC(=O)CC(Cl)C(=O)OCC(C)CO', 'COCC(=O)OCCOC', 'O=COC', 'C=CC(C)(CC)C(=O)OC=C']) {
    const mol = parseSmiles(smiles);
    const result = nameMolecule(mol);
    const step = explain(result).find((s) => s.id === 'ester');
    const [acid, alkyl, bridge] = step.highlight;
    assert.deepEqual([acid.style, alkyl.style, bridge.style], ['parent', 'substituent', 'candidate'], smiles);
    const atoms = [...acid.atoms, ...alkyl.atoms, ...bridge.atoms].sort((p, q) => p - q);
    const bonds = [...acid.bonds, ...alkyl.bonds, ...bridge.bonds].sort((p, q) => p - q);
    assert.deepEqual(atoms, [...mol.atoms.keys()].sort((p, q) => p - q), `${smiles}: every atom exactly once`);
    assert.deepEqual(bonds, [...mol.bonds.keys()].sort((p, q) => p - q), `${smiles}: every bond exactly once`);
    assert.deepEqual(bridge.atoms, [result.structure.ester.oxygen], `${smiles}: the middle O apart`);
    assert.deepEqual(step.options[0].highlight, [acid], smiles);
  } // End of the loop over the esters
  // CC(C)C(=O)OC: the methyl branch (atom 3) belongs to the acid part, 2-metilpropanoato.
  const acid = explain(named('CC(C)C(=O)OC')).find((s) => s.id === 'ester').highlight[0];
  assert.ok(acid.atoms.includes(3));
});

test('ethers inside the O-bound group are counted, explained and highlighted; the middle O never is (review I-35)', () => {
  const both = explain(named('COCC(=O)OCCOC')).find((s) => s.id === 'ether');
  const text = both.text.map(plainText).join(' ');
  assert.match(text, /tiene 2 oxígenos unidos cada uno a dos carbonos \(C–O–C\): 2 grupos éter/);
  assert.match(text, /El oxígeno del medio del –COO– no cuenta/);
  assert.match(text, /Otro oxígeno entre dos carbonos está dentro del grupo unido al oxígeno del éster.*«2-metoxietilo»/);
  const result = named('CC(=O)OCCOC');
  assert.equal(result.name, 'etanoato de 2-metoxietilo');
  const alkylOnly = explain(result).find((s) => s.id === 'ether');
  assert.ok(alkylOnly, 'an ether only on the O-bound side still gets the ether step');
  const only = alkylOnly.text.map(plainText).join(' ');
  assert.match(only, /tiene un oxígeno unido a dos carbonos \(C–O–C\): un éter/);
  assert.match(only, /El oxígeno entre dos carbonos está dentro del grupo unido al oxígeno del éster.*«2-metoxietilo»/);
  const { ester } = result.structure;
  const group = alkylOnly.highlight.find((spec) => spec.style === 'substituent');
  assert.deepEqual(group.atoms, ester.alkyl.atoms.filter((id) => id !== ester.oxygen));
  assert.ok(!alkylOnly.highlight.some((spec) => spec.atoms.includes(ester.oxygen)), 'the middle O is not marked as an ether');
  // No ether at all: only the ester's middle O between two carbons.
  assert.equal(explain(named('CC(=O)OCC')).find((s) => s.id === 'ether'), undefined);
});
