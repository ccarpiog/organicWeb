/**
 * @file Unit tests for the acyl prefixes (design.md §13.4 I-39b): a C=O
 * carbon X bonded to its chain as a branch starts an acyl branch whose own
 * chain begins at X (locant 1), cited `formil` (a –CHO), `acetil`
 * (CH₃–CO–, retained), or the acid's name with `-oico` changed to `-oil`
 * (`propanoil`, `(2-metilpropanoil)`, `(but-2-enoil)`): `3-acetilpentano-
 * 2,4-diona`, `ácido 3-formilpentanodioico`. Covers the parent choice (X is
 * an ordinary skeleton carbon, so a ketone that can be in the chain stays
 * there as `oxo-`), the prefix itself (substituent.js `acyl`, render.js
 * citedPrefixes() / acylEndingTokens()), enclosure and multipliers, the
 * alphabetical order, both lexicons, the refusals that stay (`–CO–C≡N`:
 * `acylSubstituent`; three aldehydes on one piece with the aldehyde
 * principal: `manyAldehydes`; rings), the explanation, id invariance,
 * Ordenar dibujo and the oracle generator. The names themselves are also
 * checked row by row in tests/fixtures/names.tsv.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { adjacency, canonicalKey } from '../../src/model/graph.js';
import { validateForNaming, ACYL_SUBSTITUENT_MESSAGE, MANY_ALDEHYDES_MESSAGE } from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { outsideCarbons, principalKindOf } from '../../src/naming/principal.js';
import { PREFIX_STYLES, nameSubstituent, acylOxygenOf } from '../../src/naming/substituent.js';
import { needsEnclosure, isCompoundPrefix, substituentPrefix, citedPrefixes, citationKey } from '../../src/naming/render.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { lexiconEs } from '../../src/naming/lexicon.es.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateAcyl, acylate, randomHydrocarbon } from '../../scripts/oracle/generate.mjs';
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
 * The text of one explanation step of a SMILES string, as plain text.
 *
 * @param {string} smiles - The molecule.
 * @param {string} id - The step id.
 * @returns {string} Its paragraphs, joined.
 */
function stepText(smiles, id) {
  const step = explain(named(smiles)).find((s) => s.id === id);
  return step ? step.text.map(plainText).join(' ') : '';
}

/**
 * The substituent structure of the branch rooted at the C=O carbon bonded
 * to a given carbon (the first acyl branch found on that carbon).
 *
 * @param {string} smiles - The molecule.
 * @param {number} carrier - The id of the carrying carbon.
 * @returns {object} The SubstituentStructure.
 */
function acylBranch(smiles, carrier) {
  const mol = parseSmiles(smiles);
  const adj = adjacency(mol);
  const ctx = { mol, adj };
  const x = adj.get(carrier).find((n) => acylOxygenOf(ctx, n.atom) !== null).atom;
  return nameSubstituent(mol, carrier, x);
}

/** Molecules named with acyl prefixes (SMILES → name), as in the task and the fixtures. */
const NAMED = [
  ['CC(=O)C(C(C)=O)C(C)=O', '3-acetilpentano-2,4-diona'],
  ['CC(=O)C(C(C)=O)(C(C)=O)C(C)=O', '3,3-diacetilpentano-2,4-diona'],
  ['OC(=O)CC(C=O)CC(=O)O', 'ácido 3-formilpentanodioico'],
  ['OC(=O)C(C=O)CC', 'ácido 2-formilbutanoico'],
  ['O=CCC(C=O)CC(=O)O', 'ácido 3-formil-5-oxopentanoico'],
  ['OC(=O)C(C(C)=O)CCCC', 'ácido 2-acetilhexanoico'],
  ['OC(=O)C(C(=O)CC)CCCCC', 'ácido 2-propanoilheptanoico'],
  ['OC(=O)C(C(=O)C(C)C)CCCCCC', 'ácido 2-(2-metilpropanoil)octanoico'],
  ['OC(=O)C(C(=O)C=CC)CCCCCC', 'ácido 2-(but-2-enoil)octanoico'],
  ['OC(=O)C(C(=O)CCl)CCCC', 'ácido 2-(2-cloroetanoil)hexanoico'],
  ['OC(=O)C(C(=O)CC(C)=O)CCCCCCC', 'ácido 2-(3-oxobutanoil)nonanoico'],
  ['OC(=O)C(C(=O)C)(C(=O)C)CCCC', 'ácido 2,2-diacetilhexanoico'],
  ['CCOC(=O)CC(C=O)CC', '3-formilpentanoato de etilo'],
  ['CC(=O)OCC(C=O)CC', 'etanoato de 2-formilbutilo'],
  ['NC(=O)C(C(C)=O)CCC', '2-acetilpentanamida'],
  ['N#CC(C(C)=O)CCC', '2-acetilpentanonitrilo'],
  ['CCCC(C(C)=O)CC=O', '3-acetilhexanal'],
  ['OC(=O)CCC(CC(C(C)=O)CCC)CCC', 'ácido 6-acetil-4-propilnonanoico'],
  ['O=CCC(C=O)OCC(C=O)CC', '2-(2-formilbutoxi)butanodial'],
];

test('acyl branches are named with formil, acetil and -oil prefixes, at any depth', () => {
  for (const [smiles, name] of NAMED) {
    assert.equal(nameOf(smiles), name, smiles);
    for (const prefixStyle of PREFIX_STYLES) {
      assert.equal(named(smiles, prefixStyle).ok, true, `${smiles} in the ${prefixStyle} style`);
    }
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
  }
  // Traditional names of the acid part keep the acyl group.
  assert.deepEqual(named('CC(=O)OCC(C=O)CC').alternatives.map((a) => a.name), ['acetato de 2-formilbutilo']);
  // In an acyl branch inside another branch (2-acetilpentil) the acyl is nested.
  const nested = named('OC(=O)C(CC(C(C)=O)CCC)CCCCCCCC');
  assert.equal(nested.name, 'ácido 2-(2-acetilpentil)decanoico');
  const branch = nested.structure.prefixes[0].substituent;
  assert.equal(branch.acyl, undefined);
  assert.equal(branch.prefixes.find((g) => g.substituent.acyl).locants[0].locant, 2);
}); // End of test 'acyl branches are named…'

test('the C=O carbon is an ordinary skeleton carbon: acyl only when the chain misses it', () => {
  // X never joins outsideCarbons() (unlike a ciano- carbon): the ketone of 4-oxopentanoic acid stays in the chain.
  const mol = parseSmiles('CC(=O)CCC(=O)O');
  const adj = adjacency(mol);
  assert.equal(outsideCarbons(mol, adj, principalKindOf(mol, adj)).size, 0);
  assert.equal(nameOf('CC(=O)CCC(=O)O'), 'ácido 4-oxopentanoico');
  // Longest chain first: through the CHO the chain would be shorter, so formil.
  assert.equal(nameOf('OC(=O)C(C=O)CC'), 'ácido 2-formilbutanoico');
  // On a length tie the chain through the C=O has more prefixes (P-45.2.1): oxo, never formil.
  assert.equal(nameOf('OC(=O)CC(C)C=O'), 'ácido 3-metil-4-oxobutanoico');
  assert.equal(nameOf('CC(C(C)=O)CC=O'), '3-metil-4-oxopentanal');
  // Alphanumerical order decides the remaining ties (P-45.5): acetil before cloroetil, before isopropil.
  assert.equal(nameOf('CC(Cl)C(C(C)=O)C(=O)O'), 'ácido 2-acetil-3-clorobutanoico');
  for (const style of PREFIX_STYLES) {
    assert.equal(named('CC(C(C(C)=O)(C)C=O)C', style).name, '2-acetil-2,3-dimetilbutanal', style);
  }
  // The acyl chain starts at X: X is its carbon 1, the parent does not contain it.
  const result = named('CC(=O)C(C(C)=O)C(C)=O');
  const [group] = result.structure.prefixes;
  const acyl = group.substituent;
  assert.equal(acyl.acyl, true);
  assert.equal(acyl.freeValence.locant, 1);
  assert.equal(acyl.chain.length, 2);
  assert.ok(!result.parent.atoms.includes(acyl.chain.atoms[0]));
  assert.equal(group.locants[0].attachAtom, acyl.chain.atoms[0]);
}); // End of test 'the C=O carbon is an ordinary skeleton carbon…'

test('the acyl prefix: formil, acetil, -oil; enclosure, multipliers, both lexicons', () => {
  // HOOC–CH(COX)–…: the substituent rooted at X, carried by atom 4 (the acid's carbon 2).
  const formyl = acylBranch('OC(=O)C(C=O)CC', 4);
  assert.equal(formyl.acyl, true);
  assert.equal(substituentPrefix(formyl, lexiconEs), 'formil');
  assert.equal(substituentPrefix(formyl, lexiconEn), 'formyl');
  assert.equal(needsEnclosure(formyl), false);
  assert.equal(isCompoundPrefix(formyl), false);
  assert.deepEqual(citedPrefixes(formyl), [], 'the C=O of X is cited by the prefix itself');
  assert.equal(formyl.prefixes.length, 1, 'but kept in the structure as its oxo');
  const acetyl = acylBranch('OC(=O)C(C(C)=O)CCCC', 4);
  assert.equal(substituentPrefix(acetyl, lexiconEs), 'acetil');
  assert.equal(substituentPrefix(acetyl, lexiconEn), 'acetyl');
  assert.equal(needsEnclosure(acetyl), false);
  const propanoyl = acylBranch('OC(=O)C(C(=O)CC)CCCCC', 4);
  assert.equal(substituentPrefix(propanoyl, lexiconEs), 'propanoil');
  assert.equal(substituentPrefix(propanoyl, lexiconEn), 'propanoyl');
  assert.equal(needsEnclosure(propanoyl), false);
  const branched = acylBranch('OC(=O)C(C(=O)C(C)C)CCCCCC', 4);
  assert.equal(substituentPrefix(branched, lexiconEs), '2-metilpropanoil');
  assert.equal(needsEnclosure(branched), true);
  assert.equal(isCompoundPrefix(branched), true);
  assert.equal(citationKey(branched, lexiconEs).alpha, 'metilpropanoil', 'alphabetised under m, by its complete name');
  const unsaturated = acylBranch('OC(=O)C(C(=O)C=CC)CCCCCC', 4);
  assert.equal(substituentPrefix(unsaturated, lexiconEs), 'but-2-enoil');
  assert.equal(substituentPrefix(unsaturated, lexiconEn), 'but-2-enoyl');
  assert.equal(needsEnclosure(unsaturated), true);
  assert.equal(isCompoundPrefix(unsaturated), false, 'enclosed for its locant, still di(…)');
  assert.equal(substituentPrefix(acylBranch('OC(=O)C(C(=O)C#CC)CCCCCC', 4), lexiconEn), 'but-2-ynoyl');
  assert.equal(substituentPrefix(acylBranch('OC(=O)C(C(=O)C=CC=C)CCCCCC', 4), lexiconEs), 'penta-2,4-dienoil');
  assert.equal(substituentPrefix(acylBranch('OC(=O)C(C(=O)CCl)CCCC', 4), lexiconEs), '2-cloroetanoil', 'a substituted acetyl is systematic');
  assert.equal(lexiconEs.acetylPrefix, 'acetil');
  assert.equal(lexiconEs.acylEnding, 'oil');
  assert.equal(lexiconEn.acylEnding, 'oyl');
  // Alphabetical order among other prefixes: acetil < cloro < formil < metil < oxo < propanoil.
  assert.equal(nameOf('OC(=O)C(C(=O)CC)C(C)CCCC'), 'ácido 3-metil-2-propanoilheptanoico');
  assert.equal(nameOf('ClCCC(C=O)CC(=O)O'), 'ácido 5-cloro-3-formilpentanoico');
  // English names (the oracle's form).
  const english = [
    ['CC(=O)C(C(C)=O)C(C)=O', '3-acetylpentane-2,4-dione'],
    ['OC(=O)CC(C=O)CC(=O)O', '3-formylpentanedioic acid'],
    ['OC(=O)C(C(=O)C(C)C)CCCCCC', '2-(2-methylpropanoyl)octanoic acid'],
    ['OC(=O)C(C(=O)C=CC)CCCCCC', '2-(but-2-enoyl)octanoic acid'],
    ['CC(=O)OCC(C=O)CC', '2-formylbutyl ethanoate'],
    ['CC(=O)C(C(C)=O)(C(C)=O)C(C)=O', '3,3-diacetylpentane-2,4-dione'],
  ];
  for (const [smiles, name] of english) {
    assert.equal(englishName(named(smiles).structure), name, smiles);
  }
}); // End of test 'the acyl prefix…'

test('refusals that stay: –CO–C≡N, three aldehydes with the aldehyde principal, rings', () => {
  for (const smiles of ['OC(=O)C(C(=O)C#N)CC', 'NC(=O)C(C(=O)C#N)CCCC']) {
    const result = named(smiles);
    assert.equal(result.ok, false, smiles);
    assert.equal(result.error.reason, 'acylSubstituent', smiles);
    assert.equal(result.error.message, ACYL_SUBSTITUENT_MESSAGE);
    assert.match(result.error.message, /carbonocianidoil/);
  }
  // manyAldehydes: three –CHO on one piece with the aldehyde principal need -carbaldehído (not 4-formilheptanodial).
  const three = named('O=CCCC(C=O)CCC=O');
  assert.equal(three.error.reason, 'manyAldehydes');
  assert.equal(three.error.message, MANY_ALDEHYDES_MESSAGE);
  assert.match(MANY_ALDEHYDES_MESSAGE, /formil/);
  // Below a more senior group, or spread over two carbon pieces, they are named.
  assert.equal(nameOf('O=CCC(C=O)CC(=O)O'), 'ácido 3-formil-5-oxopentanoico');
  assert.equal(nameOf('O=CCC(C=O)CC#N'), '3-formil-5-oxopentanonitrilo');
  assert.equal(nameOf('O=CCC(C=O)OCC(C=O)CC'), '2-(2-formilbutoxi)butanodial');
  // Ketones on a ring's side chain are named since I-40a (the ring a prefix); aldehydes with a ring wait for I-40b.
  assert.equal(nameOf('CC(=O)C1CCCCC1'), '1-ciclohexiletan-1-ona');
  assert.equal(nameOf('O=CC1CCCCC1'), 'HETEROATOM ringAldehyde');
  assert.equal(nameOf('CC(=O)C(C1CCCCC1)C(C)=O'), '3-ciclohexilpentano-2,4-diona');
  assert.equal(nameOf('CC(=O)C1CCC(=O)CC1'), '4-acetilciclohexan-1-ona', 'a ring ketone with an acyl branch');
}); // End of test 'refusals that stay…'

test('the explanation: acyl branches, their carbon outside the chain, the prefix', () => {
  // Ketone principal: the third C=O is an acyl branch, not an oxo-.
  const group = stepText('CC(=O)C(C(C)=O)C(C)=O', 'group');
  assert.match(group, /Tu molécula tiene 3 grupos C=O/);
  assert.match(group, /forma una rama que empieza en ese carbono \(un grupo acilo\)\. Ese no va en el sufijo: se nombra con el prefijo «acetil-»/);
  assert.match(group, /El carbono de ese C=O no se cuenta en la cadena principal/);
  assert.doesNotMatch(group, /prefijo «oxo-» delante/);
  assert.match(stepText('CC(=O)C(C(C)=O)C(C)=O', 'groupChain'), /forma una rama que empieza en él \(un grupo acilo\), y se nombra con «acetil-»/);
  // Acid principal: formil and the other acyls in the seniority sentences.
  const acid = stepText('OC(=O)CC(C=O)CC(=O)O', 'group');
  assert.match(acid, /También tiene un grupo –CHO cuyo carbono no está en la cadena \(un aldehído\)/);
  assert.match(acid, /cada –CHO cuyo carbono no está en la cadena se nombra con el prefijo «formil-»/);
  assert.match(acid, /El carbono de ese –CHO no se cuenta en la cadena principal/);
  assert.doesNotMatch(acid, /«oxo-»,/);
  const acyl = stepText('OC(=O)C(C(=O)C(C)C)CCCCCC', 'group');
  assert.match(acyl, /se nombra con su propio prefijo \(aquí, «2-metilpropanoil-»\)/);
  // Chain step: the acyl carbon is not a chain carbon.
  assert.match(stepText('OC(=O)C(C(=O)C(C)C)CCCCCC', 'groupChain'), /El carbono del C=O de la rama «2-metilpropanoil» no forma parte de la cadena/);
  // Substituents step: what the prefix means.
  const subs = stepText('OC(=O)C(C(=O)C(C)C)CCCCCC', 'substituents');
  assert.match(subs, /Una rama que se une a la cadena principal por el carbono de un C=O es un grupo acilo/);
  assert.match(subs, /«2-metilpropanoil» es el prefijo de un grupo acilo: una rama de 4 carbonos/);
  assert.match(subs, /del «ácido propanoico» sale «propanoil»/);
  assert.match(subs, /se numera desde el carbono del C=O, que es el 1\. En ella hay: «metil» en el carbono 2\./);
  assert.doesNotMatch(subs, /«oxo» en el carbono 1/);
  assert.match(stepText('CC(=O)C(C(C)=O)C(C)=O', 'substituents'), /se llama «acetil»: es un nombre tradicional que la IUPAC \(2013\) prefiere a «etanoil»/);
  assert.match(stepText('OC(=O)CC(C=O)CC(=O)O', 'substituents'), /«formil» es el prefijo de un grupo –CHO \(un aldehído\) cuyo carbono no está en la cadena/);
  assert.match(stepText('OC(=O)C(C(=O)CCl)CCCC', 'substituents'), /del «ácido etanoico» sale «etanoil»/);
  // Count step: the acyl carbon and O are counted.
  assert.deepEqual(atomCounts(named('CC(=O)C(C(C)=O)C(C)=O').structure), { carbons: 7, hydrogens: 10, halogens: {}, oxygens: 3 });
  assert.deepEqual(atomCounts(named('OC(=O)CC(C=O)CC(=O)O').structure), { carbons: 6, hydrogens: 8, halogens: {}, oxygens: 5 });
  assert.deepEqual(atomCounts(named('CC(=O)OCC(C=O)CC').structure), { carbons: 7, hydrogens: 12, halogens: {}, oxygens: 3 });
  // Legend.
  const legend = explain(named('OC(=O)C(C(=O)CC)CCCCC')).find((s) => s.id === 'assemble').legend;
  assert.ok(legend.some((entry) => entry.text === 'propanoil' && /3 carbonos/.test(entry.meaning)));
  // Highlights: the group step marks the acyl branch whole (C=O carbon, O, and its chain) as a substituent.
  const mol = parseSmiles('OC(=O)C(C(=O)CC)CCCCC');
  const result = nameMolecule(mol);
  const branch = result.structure.prefixes.find((g) => g.substituent.acyl);
  const spec = explain(result).find((s) => s.id === 'group').highlight.find((h) => h.style === 'substituent');
  assert.deepEqual([...spec.atoms].sort((p, q) => p - q), [...branch.locants[0].atoms].sort((p, q) => p - q));
  assert.equal(spec.atoms.length, 4, 'three carbons and the O');
  // Every step renders without placeholders.
  for (const [smiles] of NAMED) {
    for (const step of explain(named(smiles))) {
      for (const paragraph of step.text) {
        assert.doesNotMatch(plainText(paragraph), /undefined|NaN|null|\[\[|\]\]/, `${smiles}: ${paragraph}`);
      }
    }
  }
}); // End of test 'the explanation…'

test('review I-39b: the C=O oxygen of X takes no part in choosing the acyl chain', () => {
  // Counted as an oxo prefix it made the chain through the ketone win (2-(1-cloroetil)-3-oxobutanoil).
  const smiles = 'OC(=O)C(C(=O)C(C(=O)C)C(Cl)C)CCCCCC';
  for (const prefixStyle of PREFIX_STYLES) {
    const result = named(smiles, prefixStyle);
    assert.equal(result.name, 'ácido 2-(2-acetil-3-clorobutanoil)octanoico', prefixStyle);
    assert.equal(englishName(result.structure), '2-(2-acetyl-3-chlorobutanoyl)octanoic acid', prefixStyle);
  }
  // The oxygen is still in the structure (counts), only left out of the name.
  assert.deepEqual(atomCounts(named(smiles).structure), { carbons: 14, hydrogens: 23, halogens: { Cl: 1 }, oxygens: 4 });
}); // End of test 'review I-39b…'

test('names never depend on atom ids or drawing order', () => {
  const random = seededRandom(47);
  for (const [smiles] of NAMED) {
    const reference = named(smiles);
    for (let k = 0; k < 8; k += 1) {
      const result = nameMolecule(scrambleMolecule(parseSmiles(smiles), random));
      assert.equal(result.name, reference.name, smiles);
      assert.deepEqual(result.alternatives.map((a) => a.name), reference.alternatives.map((a) => a.name), smiles);
      assert.equal(englishName(result.structure), englishName(reference.structure), smiles);
    }
  } // End of the loop over the molecules
}); // End of test 'names never depend on atom ids or drawing order'

test('Ordenar dibujo lays out acyl molecules', () => {
  for (const smiles of ['CC(=O)C(C(C)=O)C(C)=O', 'OC(=O)CC(C=O)CC(=O)O', 'OC(=O)C(C(=O)C(C)C)CCCCCC', 'CC(=O)OCC(C=O)CC']) {
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
}); // End of test 'Ordenar dibujo lays out acyl molecules'

test('the seeded acyl generator: deterministic, distinct, valid, varied', () => {
  const molecules = generateAcyl({ count: 120, seed: 3 });
  assert.equal(molecules.length, 120);
  assert.deepEqual(generateAcyl({ count: 120, seed: 3 }).map(writeSmiles), molecules.map(writeSmiles), 'deterministic');
  assert.notDeepEqual(generateAcyl({ count: 120, seed: 4 }).map(writeSmiles), molecules.map(writeSmiles));
  assert.equal(new Set(molecules.map(canonicalKey)).size, 120, 'distinct');
  const names = molecules.map((mol) => {
    assert.equal(validateForNaming(mol), null, writeSmiles(mol));
    return nameMolecule(mol).name;
  });
  assert.ok(names.some((name) => /formil/.test(name)), 'some formil');
  assert.ok(names.some((name) => /acetil/.test(name)), 'some acetil');
  assert.ok(names.some((name) => /[aei]noil/.test(name)), 'some -oil');
  assert.ok(names.some((name) => name.startsWith('ácido ')), 'some acids');
  assert.ok(names.some((name) => / de /.test(name)), 'some esters');
  assert.ok(names.some((name) => name.endsWith('ona')), 'some ketones');
  // acylate() adds one C=O carbon and its O per group, plus the acyl chain.
  const random = seededRandom(5);
  const base = randomHydrocarbon(random, { size: 4, unsaturation: 0, branchiness: 0.5 });
  const acylated = acylate(base, random, 0);
  assert.equal([...acylated.atoms.values()].filter((atom) => atom.element === 'O').length, 1);
  assert.ok(acylated.atoms.size - base.atoms.size >= 2);
}); // End of test 'the seeded acyl generator…'
