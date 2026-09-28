/**
 * @file Unit tests for nitriles (design.md §13.4 I-38): the nitrile group
 * –C≡N is one characteristic group whose N is never an amine and whose
 * triple bond is never an alkyne (`-ino`); it sits below amides and above
 * aldehydes (ácido > éster > amida > nitrilo > aldehído > cetona > alcohol >
 * amina), is cited `-nitrilo` with its locant never written (its carbon is a
 * chain end, carbon 1; the N is not a chain atom) and the parent keeps its
 * final «o» (`etanonitrilo`, `prop-2-enonitrilo`, `butanodinitrilo`); other
 * groups are prefixes (`4-oxopentanonitrilo`, `3-hidroxibutanonitrilo`,
 * `2-aminopropanonitrilo`, `3-cloropropanonitrilo`); `acetonitrilo` under
 * "Otras formas válidas"; the refusals (`ringNitrile`, `manyNitriles`,
 * `cyanoPrefix`: `ciano-` waits for I-39); both lexicons; the explanation;
 * id invariance and Ordenar dibujo; the oracle generator. The names
 * themselves are also checked row by row in tests/fixtures/names.tsv.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { adjacency, canonicalKey } from '../../src/model/graph.js';
import {
  validateForNaming, isNitrileCarbon, isNitrileNitrogen, nitrileCarbons, isAmineNitrogen, hasNameableHeteroatoms, MESSAGES,
  RING_NITRILE_MESSAGE, MANY_NITRILES_MESSAGE, CYANO_PREFIX_MESSAGE,
} from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { selectParent } from '../../src/naming/parent.js';
import {
  groupKindOf, principalKindOf, isPrincipalOxygen, isSuffixOxygen, carbonylTraditionalId, NAMED_KINDS,
} from '../../src/naming/principal.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';
import { suffixGroupIds, TERMINAL_SUFFIXES } from '../../src/naming/render.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { lexiconEs } from '../../src/naming/lexicon.es.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateNitriles, nitrilate, randomHydrocarbon } from '../../scripts/oracle/generate.mjs';
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
 * The atom ids of a molecule with a given element, in id order.
 *
 * @param {object} mol - A molecule.
 * @param {string} element - Element symbol.
 * @returns {number[]} The ids.
 */
function idsOf(mol, element) {
  return [...mol.atoms.values()].filter((atom) => atom.element === element).map((atom) => atom.id);
}

/**
 * The whole explanation of a SMILES string as plain text.
 *
 * @param {string} smiles - The molecule.
 * @returns {string} Every paragraph of every step, joined.
 */
function explanationText(smiles) {
  return explain(named(smiles)).flatMap((step) => step.text.map(plainText)).join(' ');
}

test('validation: open-chain nitriles are admitted; cyanogen halides, cyanates and cyanamides keep the generic refusal', () => {
  for (const smiles of ['C#N', 'CC#N', 'CCC#N', 'CC(C)C#N', 'N#CCCC#N', 'N#CC#N', 'C=CC#N', 'C#CC#N', 'CC(=O)CCC#N',
    'CC(O)CC#N', 'CC(N)C#N', 'ClCCC#N', 'COCC#N', 'CN(C)CC#N', 'N#CC=O']) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
  }
  // Cyanogen chloride, a cyanate, a cyanamide, an isocyanide-like N≡C–N, an imine: not nitriles.
  for (const smiles of ['ClC#N', 'COC#N', 'CNC#N', 'CC=N']) {
    const error = validateForNaming(parseSmiles(smiles));
    assert.equal(error.code, 'HETEROATOM', smiles);
    assert.equal(error.message, MESSAGES.HETEROATOM, smiles);
    assert.equal(error.reason, undefined, smiles);
  }
  assert.match(MESSAGES.HETEROATOM, / y nitrilos \(con el grupo –C≡N: un carbono unido a un nitrógeno por un enlace triple\)\.$/);
  const mol = parseSmiles('NCCC#N');
  const adj = adjacency(mol);
  const [amine, nitrile] = idsOf(mol, 'N');
  assert.deepEqual([isNitrileNitrogen(mol, adj, amine), isNitrileNitrogen(mol, adj, nitrile)], [false, true]);
  assert.deepEqual([isAmineNitrogen(mol, adj, amine), isAmineNitrogen(mol, adj, nitrile)], [true, false]);
  assert.deepEqual(nitrileCarbons(mol), [4]);
  assert.equal(isNitrileCarbon(mol, adj, 4), true);
  assert.equal(isNitrileCarbon(mol, adj, 3), false);
  assert.equal(hasNameableHeteroatoms(mol, [amine, nitrile]), true);
});

test('a nitrile is one group: its N is never an amine, its C≡N never an alkyne', () => {
  const mol = parseSmiles('NCCC#N');
  const adj = adjacency(mol);
  const [amine, nitrile] = idsOf(mol, 'N');
  assert.equal(groupKindOf(mol, adj, nitrile), 'nitrile');
  assert.equal(groupKindOf(mol, adj, amine), 'amine');
  assert.equal(principalKindOf(mol, adj), 'nitrile');
  assert.equal(isPrincipalOxygen(mol, adj, nitrile, 'nitrile'), true);
  assert.equal(isSuffixOxygen(mol, adj, nitrile, 'nitrile'), true, 'the N stands for its group');
  assert.equal(isSuffixOxygen(mol, adj, amine, 'nitrile'), false);
  assert.ok(TERMINAL_SUFFIXES.includes('nitrile'));
  // The C≡N is not a chain bond: no `-ino`, no triple bond in the parent; the N is not a chain atom.
  for (const smiles of ['CC#N', 'CCC#N', 'N#CCCC#N', 'C=CC#N', 'CC(C)(C)C#N']) {
    const result = named(smiles);
    assert.equal(result.structure.parent.triple.length, 0, smiles);
    assert.doesNotMatch(result.name, /ino/, smiles);
    const nitrogens = new Set(idsOf(parseSmiles(smiles), 'N'));
    assert.ok(result.parent.atoms.every((id) => !nitrogens.has(id)), `${smiles}: the N is not a chain atom`);
  }
  // A real C≡C in the chain is still an `-ino`.
  assert.equal(nameOf('CC#CC#N'), 'but-2-inonitrilo');
  // The old v1 invariant (no triple bond leaves a longest chain) now holds for C≡C only: selectParent() accepts the C≡N.
  assert.doesNotThrow(() => selectParent(parseSmiles('CCC(C)C#N')));
  // The suffix group is the carbon, the N and the triple bond.
  const result = named('CC#N');
  const ids = suffixGroupIds(result.structure.suffix);
  assert.deepEqual(ids.atoms.sort(), [2, 3]);
  assert.equal(ids.bonds.length, 1);
});

test('seniority: ácido > éster > amida > nitrilo > aldehído > cetona > alcohol > amina', () => {
  assert.deepEqual(NAMED_KINDS, ['acid', 'ester', 'amide', 'nitrile', 'aldehyde', 'ketone', 'alcohol', 'amine']);
  const pairs = [
    ['CC(=O)CCC#N', '4-oxopentanonitrilo'],
    ['CC(=O)CC#N', '3-oxobutanonitrilo'],
    ['O=CCC#N', '3-oxopropanonitrilo'],
    ['CC(O)CC#N', '3-hidroxibutanonitrilo'],
    ['OCCC#N', '3-hidroxipropanonitrilo'],
    ['CC(N)C#N', '2-aminopropanonitrilo'],
    ['NCCC#N', '3-aminopropanonitrilo'],
    ['CNCC#N', '2-(metilamino)etanonitrilo'],
    ['CN(C)CC#N', '2-(dimetilamino)etanonitrilo'],
    ['COCC#N', '2-metoxietanonitrilo'],
    ['ClCCC#N', '3-cloropropanonitrilo'],
    ['ClCC#N', '2-cloroetanonitrilo'],
    ['FC(F)(F)C#N', '2,2,2-trifluoroetanonitrilo'],
  ];
  for (const [smiles, name] of pairs) {
    assert.equal(nameOf(smiles), name, smiles);
  }
});

test('simple and branched nitriles, dinitriles and unsaturated nitriles: the nitrile carbon is carbon 1, never cited', () => {
  const expected = [
    ['C#N', 'metanonitrilo'],
    ['CC#N', 'etanonitrilo'],
    ['CCC#N', 'propanonitrilo'],
    ['CCCCC#N', 'pentanonitrilo'],
    ['CC(C)C#N', '2-metilpropanonitrilo'],
    ['CC(C)(C)C#N', '2,2-dimetilpropanonitrilo'],
    ['CCC(CC)C#N', '2-etilbutanonitrilo'],
    ['CC(C)CC(C)C#N', '2,4-dimetilpentanonitrilo'],
    ['CCCC(CC#N)CC', '3-etilhexanonitrilo'],
    ['N#CC#N', 'etanodinitrilo'],
    ['N#CCC#N', 'propanodinitrilo'],
    ['N#CCCC#N', 'butanodinitrilo'],
    ['N#CC(C)(C)C#N', '2,2-dimetilpropanodinitrilo'],
    ['C=CC#N', 'prop-2-enonitrilo'],
    ['C#CC#N', 'prop-2-inonitrilo'],
    ['CC=CC#N', 'but-2-enonitrilo'],
  ];
  for (const [smiles, name] of expected) {
    assert.equal(nameOf(smiles), name, smiles);
  }
  // Branched nitriles: the parent is the longest chain that ends at the nitrile carbon (P0 before P1).
  const mol = parseSmiles('CCCCC(C#N)CCCCCC');
  const result = nameMolecule(mol);
  assert.equal(result.name, '2-butiloctanonitrilo');
  const [nitrogen] = idsOf(mol, 'N');
  const carbon = adjacency(mol).get(nitrogen)[0].atom;
  assert.equal(result.parent.atoms[0], carbon, 'the nitrile carbon is carbon 1 of the parent');
  assert.equal(result.structure.suffix.locants[0].locant, 1);
  // A dinitrile: both ends of the chain, even when a longer chain avoids one of them.
  assert.equal(nameOf('N#CCC(CCCCC)CC#N'), '3-pentilpentanodinitrilo');
});

test('refusals: rings, three or more nitriles, ciano- (below an acid, ester or amide, or on another piece)', () => {
  const refusals = [
    ['N#CC1CCCCC1', 'ringNitrile', RING_NITRILE_MESSAGE],
    ['N#CC1=CC=CC=C1', 'ringNitrile', RING_NITRILE_MESSAGE],
    ['N#CCC1CC1', 'ringNitrile', RING_NITRILE_MESSAGE],
    ['OC1CCC(CC#N)CC1', 'ringNitrile', RING_NITRILE_MESSAGE],
    ['N#CCC(C#N)CC#N', 'manyNitriles', MANY_NITRILES_MESSAGE],
    ['N#CC(C#N)(C#N)C#N', 'manyNitriles', MANY_NITRILES_MESSAGE],
    ['N#CCCC(=O)O', 'cyanoPrefix', CYANO_PREFIX_MESSAGE],
    ['N#CCC(=O)OC', 'cyanoPrefix', CYANO_PREFIX_MESSAGE],
    ['CC(=O)OCC#N', 'cyanoPrefix', CYANO_PREFIX_MESSAGE],
    ['N#CCCC(N)=O', 'cyanoPrefix', CYANO_PREFIX_MESSAGE],
    ['N#CCOCCC#N', 'cyanoPrefix', CYANO_PREFIX_MESSAGE],
    ['N#CCOCC#N', 'cyanoPrefix', CYANO_PREFIX_MESSAGE],
    ['N#CCNCC#N', 'cyanoPrefix', CYANO_PREFIX_MESSAGE],
  ];
  for (const [smiles, reason, message] of refusals) {
    const result = named(smiles);
    assert.equal(result.ok, false, smiles);
    assert.equal(result.error.code, 'HETEROATOM', smiles);
    assert.equal(result.error.reason, reason, smiles);
    assert.equal(result.error.message, message, smiles);
    assert.ok(result.groups, `${smiles}: the refusal carries the group analysis`);
    assert.ok(result.groups.items.some((g) => g.kind === 'nitrile'), `${smiles}: the nitrile is recognised`);
  }
  assert.deepEqual(validateForNaming(parseSmiles('N#CCC(C#N)CC#N')).nitriles, [2, 5, 8]);
  // Every message is Spanish, names the group and says why.
  for (const message of [RING_NITRILE_MESSAGE, MANY_NITRILES_MESSAGE, CYANO_PREFIX_MESSAGE]) {
    assert.match(message, /–C≡N/);
    assert.match(message, /sé (nombrar|hacerlo)/);
  }
  assert.match(RING_NITRILE_MESSAGE, /ciclohexanocarbonitrilo/);
  assert.match(RING_NITRILE_MESSAGE, /benzonitrilo/);
  assert.match(CYANO_PREFIX_MESSAGE, /«ciano-»/);
});

test('refusals are explained in the stepper like the others', () => {
  for (const smiles of ['N#CC1CCCCC1', 'N#CCC(C#N)CC#N', 'N#CCCC(=O)O']) {
    const result = named(smiles);
    const steps = explain(result);
    assert.deepEqual(steps.map((s) => s.id), ['groups', 'principal', 'affixes', 'notYet'], smiles);
    const text = steps.flatMap((step) => step.text.map(plainText)).join(' ');
    assert.ok(text.includes(result.error.message), `${smiles}: the refusal message is shown`);
    assert.match(text, /nitrilo/);
    assert.match(text, /el enlace triple de un nitrilo \(C≡N\) no es el de un alquino/);
  }
  assert.match(explanationText('N#CCCC(=O)O'), /El nitrilo: prefijo «ciano-»/);
});

test('traditional names: acetonitrilo for the bare etanonitrilo only', () => {
  const alternatives = (smiles) => named(smiles).alternatives.map((a) => `${a.style}=${a.name}`);
  assert.deepEqual(alternatives('CC#N'), ['traditional=acetonitrilo']);
  assert.equal(named('CC#N').alternatives[0].label, 'nombre tradicional, que la IUPAC (2013) conserva como preferido');
  // Not for HC≡N, a substituted acetonitrile, a longer or unsaturated chain, a dinitrile; never «cianuro de …».
  for (const smiles of ['C#N', 'ClCC#N', 'CCC#N', 'C=CC#N', 'N#CC#N', 'NCC#N']) {
    assert.ok(named(smiles).alternatives.every((a) => a.style !== 'traditional'), smiles);
    assert.equal(carbonylTraditionalId(named(smiles).structure), null, smiles);
  }
  for (const smiles of ['C#N', 'CC#N', 'CCC#N']) {
    assert.ok(named(smiles).alternatives.every((a) => !/cianuro/.test(a.name)), smiles);
    assert.ok(named(smiles).alternatives.every((a) => a.style !== 'amineClass'), `${smiles}: no alkylamine name`);
  }
  // The traditional word refers to the parent and the whole nitrile group.
  const alt = named('CC#N').alternatives[0];
  assert.equal(alt.parts.length, 1);
  assert.deepEqual([...alt.parts[0].atoms].sort(), [1, 2, 3]);
});

test('nitriles in both lexicons: Spanish «-nitrilo», English «-nitrile»', () => {
  const expected = [
    ['C#N', 'methanenitrile'],
    ['CC#N', 'ethanenitrile'],
    ['CC(C)C#N', '2-methylpropanenitrile'],
    ['N#CCCC#N', 'butanedinitrile'],
    ['C=CC#N', 'prop-2-enenitrile'],
    ['CC(=O)CCC#N', '4-oxopentanenitrile'],
    ['CC(O)CC#N', '3-hydroxybutanenitrile'],
    ['CC(N)C#N', '2-aminopropanenitrile'],
    ['ClCCC#N', '3-chloropropanenitrile'],
  ];
  for (const [smiles, name] of expected) {
    assert.equal(englishName(named(smiles).structure), name, smiles);
  }
  assert.equal(lexiconEs.traditionalName('acetonitrile'), 'acetonitrilo');
  assert.equal(lexiconEn.traditionalName('acetonitrile'), 'acetonitrile');
  assert.equal(lexiconEs.groupSuffix('nitrile'), 'nitrilo');
  assert.equal(lexiconEn.groupSuffix('nitrile'), 'nitrile');
});

test('the explanation: one –C≡N group, not an alkyne, carbon 1, formula with N', () => {
  const steps = explain(named('CC(C)C#N'));
  const byId = new Map(steps.map((step) => [step.id, step]));
  const group = byId.get('group').text.map(plainText).join(' ');
  assert.match(group, /la molécula es un nitrilo/);
  assert.match(group, /no es el de un alquino/);
  assert.match(group, /«-nitrilo»/);
  assert.match(group, /El nitrógeno no forma parte de la cadena/);
  const count = byId.get('count').text.map(plainText).join(' ');
  assert.match(count, /C₄H₇N/);
  assert.match(count, /se ve como N: sus 3 enlaces van a ese carbono, así que no lleva hidrógeno/);
  assert.match(byId.get('numbering').text.map(plainText).join(' '), /El carbono del grupo –C≡N siempre es el 1/);
  const assemble = byId.get('assemble').text.map(plainText).join(' ');
  assert.match(assemble, /El –C≡N no lleva número/);
  assert.match(assemble, /La «o» final de «-ano» se queda delante de «-nitrilo», porque empieza por consonante/);
  // The group step highlights the whole –C≡N (carbon, N, triple bond) as the principal group.
  const [spec] = byId.get('group').highlight;
  assert.equal(spec.style, 'parent');
  assert.equal(spec.atoms.length, 2);
  assert.equal(spec.bonds.length, 1);
  // Formulas: the C≡N takes three hydrogens from its carbon, the N adds one to the count.
  assert.deepEqual(atomCounts(named('CC#N').structure), { carbons: 2, hydrogens: 3, halogens: {}, nitrogens: 1, oxygens: 0 });
  assert.deepEqual(atomCounts(named('C#N').structure), { carbons: 1, hydrogens: 1, halogens: {}, nitrogens: 1, oxygens: 0 });
  assert.deepEqual(atomCounts(named('N#CCCC#N').structure), { carbons: 4, hydrogens: 4, halogens: {}, nitrogens: 2, oxygens: 0 });
  assert.deepEqual(atomCounts(named('CC(=O)CCC#N').structure), { carbons: 5, hydrogens: 7, halogens: {}, nitrogens: 1, oxygens: 1 });
  assert.deepEqual(atomCounts(named('CN(C)CC#N').structure), { carbons: 4, hydrogens: 8, halogens: {}, nitrogens: 2, oxygens: 0 });
  // An amino prefix beside the nitrile: both nitrogens described.
  const amine = explain(named('CN(C)CC#N')).find((step) => step.id === 'count').text.map(plainText).join(' ');
  assert.match(amine, /–C≡N\) se ve como N/);
  assert.match(amine, /Un nitrógeno unido a tres carbonos se ve como N, sin hidrógenos/);
  // Other groups: prefixes under the nitrile, with the full seniority order.
  const oxo = explanationText('CC(=O)CCC#N');
  assert.match(oxo, /ácido > éster > amida > nitrilo > aldehído > cetona > alcohol > amina/);
  assert.match(oxo, /Aquí manda el nitrilo/);
  assert.match(oxo, /el nitrilo va antes que el aldehído y la cetona/);
  assert.match(explanationText('CC(O)CC#N'), /el nitrilo \(–C≡N\) va antes que el alcohol/);
  assert.match(explanationText('CC(N)C#N'), /el nitrilo va antes que la amina/);
  assert.match(explanationText('N#CCCC#N'), /«-dinitrilo» \(«di» = 2\)/);
  assert.match(explanationText('CC#N'), /«acetonitrilo»/);
  // HC≡N: the nitrile carbon is the only chain carbon, no chain step.
  const hcn = explain(named('C#N'));
  assert.ok(hcn.every((step) => step.id !== 'groupChain' && step.id !== 'chain'));
  assert.match(hcn.find((step) => step.id === 'group').text.map(plainText).join(' '), /el único carbono de la \[?cadena principal/);
  // Every step of a range of nitriles renders without placeholders.
  for (const smiles of ['C#N', 'CC#N', 'CC(C)C#N', 'N#CCCC#N', 'N#CC#N', 'C=CC#N', 'C#CC#N', 'CC(=O)CCC#N', 'O=CCC#N',
    'CC(O)CC#N', 'CC(N)C#N', 'CN(C)CC(C)C#N', 'COCC#N', 'ClCC#N', 'FC(F)(F)C#N', 'CCCCC(C#N)CCCCCC']) {
    for (const step of explain(named(smiles))) {
      for (const paragraph of step.text) {
        assert.doesNotMatch(plainText(paragraph), /undefined|NaN|null|\[\[|\]\]/, `${smiles}: ${paragraph}`);
      }
    }
  }
});

test('the chain step gives the principal groups (P0), not the length, as the reason an unsaturation is left out', () => {
  // 2-etenilpropanodinitrilo: the 4-carbon chain through the C=C holds one –C≡N only; three carbons with both win (P0).
  const chainText = (smiles) => explain(named(smiles)).find((step) => step.id === 'groupChain').text.map(plainText).join(' ');
  assert.equal(nameOf('N#CC(C=C)C#N'), '2-etenilpropanodinitrilo');
  const nitrile = chainText('N#CC(C=C)C#N');
  assert.match(nitrile, /la cadena que lo incluye lleva menos grupos –C≡N/);
  assert.doesNotMatch(nitrile, /manda la longitud/);
  // The same code path for a diacid and a diamide.
  assert.equal(nameOf('OC(=O)C(C=C)C(=O)O'), 'ácido 2-etenilpropanodioico');
  assert.match(chainText('OC(=O)C(C=C)C(=O)O'), /la cadena que lo incluye lleva menos grupos –COOH/);
  assert.doesNotMatch(chainText('OC(=O)C(C=C)C(=O)O'), /manda la longitud/);
  assert.equal(nameOf('NC(=O)C(C=C)C(N)=O'), '2-etenilpropanodiamida');
  assert.match(chainText('NC(=O)C(C=C)C(N)=O'), /la cadena que lo incluye lleva menos grupos amida/);
  // Where the length really decides, the length sentence stays.
  const length = explain(named('C=CC(CCC)CCC')).find((step) => step.id === 'chain').text.map(plainText).join(' ');
  assert.match(length, /manda la longitud/);
});

test('names never depend on atom ids or drawing order', () => {
  const random = seededRandom(41);
  for (const smiles of ['C#N', 'CC#N', 'CC(C)C#N', 'N#CCCC#N', 'N#CC#N', 'C=CC#N', 'CC(=O)CCC#N', 'CC(O)CC#N', 'CC(N)C#N',
    'CN(C)CC(C)C#N', 'CCCCC(C#N)CCCCCC', 'N#CCC(CCCCC)CC#N', 'N#CC1CCCCC1', 'N#CCCC(=O)O', 'N#CCOCCC#N']) {
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

test('Ordenar dibujo lays out nitriles', () => {
  for (const smiles of ['C#N', 'CC#N', 'CC(C)C#N', 'N#CCCC#N', 'C=CC#N', 'CC(N)C#N']) {
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

test('the seeded nitrile generator: deterministic, distinct, valid, varied', () => {
  const molecules = generateNitriles({ count: 120, seed: 3 });
  assert.equal(molecules.length, 120);
  assert.deepEqual(generateNitriles({ count: 120, seed: 3 }).map(writeSmiles), molecules.map(writeSmiles), 'deterministic');
  assert.notDeepEqual(generateNitriles({ count: 120, seed: 4 }).map(writeSmiles), molecules.map(writeSmiles));
  assert.equal(new Set(molecules.map(canonicalKey)).size, 120, 'distinct');
  const names = [];
  for (const mol of molecules) {
    const smiles = writeSmiles(mol);
    assert.equal(validateForNaming(mol), null, smiles);
    assert.ok(nitrileCarbons(mol).length > 0, `${smiles}: at least one nitrile`);
    for (const prefixStyle of PREFIX_STYLES) {
      assert.equal(nameMolecule(mol, { prefixStyle }).ok, true, smiles);
    }
    names.push(nameMolecule(mol).name);
  } // End of the loop over the generated nitriles
  assert.ok(names.some((name) => name.endsWith('dinitrilo')), 'some dinitriles');
  assert.ok(names.some((name) => /oxo|hidroxi|amino|metoxi|etoxi/.test(name)), 'some other groups as prefixes');
  // nitrilate() only turns –CH₃ ends (or methane) into –C≡N.
  const random = seededRandom(5);
  const base = randomHydrocarbon(random, { size: 5, unsaturation: 0, branchiness: 0.5 });
  const nitrile = nitrilate(base, random, 2);
  assert.ok(nitrileCarbons(nitrile).length >= 1 && nitrileCarbons(nitrile).length <= 2);
  assert.equal(nitrile.atoms.size - base.atoms.size, nitrileCarbons(nitrile).length);
});
