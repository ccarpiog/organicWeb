/**
 * @file Unit tests for the `ciano-` prefix (design.md §13.4 I-39a): a
 * nitrile that is not the principal group (ácido > éster > amida > nitrilo)
 * or that lies on a branch piece is cited `ciano-`, and its carbon is
 * outside every chain (IUPAC 2013 counts it in the prefix): `ácido
 * 3-cianopropanoico` has a three-carbon parent. Covers the parent choice
 * without the nitrile carbon (principal.js outsideCarbons(), parent.js),
 * the prefix itself (substituent.js cyanoSubstituent(), render.js), the
 * alphabetical order, both lexicons, the refusals that stay (a nitrile on
 * an acid, ester or amide carbon: `carbonocyanidic`; `manyNitriles`,
 * `ringNitrile`, `esterPrefix`, `manyEsters`, `amidePrefix`; an acetyl
 * beside a nitrile is named since I-39b), the explanation, id invariance, Ordenar dibujo and the
 * oracle generator. The names themselves are also checked row by row in
 * tests/fixtures/names.tsv.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { adjacency, canonicalKey, carbonSkeleton } from '../../src/model/graph.js';
import { validateForNaming, nitrileCarbons, CARBONOCYANIDIC_MESSAGE } from '../../src/model/validate.js';
import { nameMolecule, cyanoCount } from '../../src/naming/index.js';
import { selectParent, leafToLeafPaths } from '../../src/naming/parent.js';
import { outsideCarbons, principalKindOf } from '../../src/naming/principal.js';
import { PREFIX_STYLES, nameSubstituent } from '../../src/naming/substituent.js';
import { needsEnclosure, isCompoundPrefix, substituentPrefix } from '../../src/naming/render.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { lexiconEs } from '../../src/naming/lexicon.es.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateCyano, cyanate, randomHydrocarbon } from '../../scripts/oracle/generate.mjs';
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

/** Molecules named with `ciano-` (SMILES → name), as in the task and the fixtures. */
const NAMED = [
  ['N#CCCC(=O)O', 'ácido 3-cianopropanoico'],
  ['N#CCC(=O)O', 'ácido 2-cianoetanoico'],
  ['CCC(C#N)C(=O)O', 'ácido 2-cianobutanoico'],
  ['N#CC(C#N)C(=O)O', 'ácido 2,2-dicianoetanoico'],
  ['N#CCC(C#N)C(C#N)C(=O)O', 'ácido 2,3,4-tricianobutanoico'],
  ['OC(=O)CC(CCC#N)CCC', 'ácido 3-(2-cianoetil)hexanoico'],
  ['N#CCC(CC#N)C(=O)O', 'ácido 3-ciano-2-(cianometil)propanoico'],
  ['N#CCC(=O)OC', '2-cianoetanoato de metilo'],
  ['CC(=O)OCC#N', 'etanoato de cianometilo'],
  ['N#CCCC(N)=O', '3-cianopropanamida'],
  ['CC(=O)NCC#N', 'N-(cianometil)etanamida'],
  ['N#CCCOCC#N', '3-(cianometoxi)propanonitrilo'],
  ['N#CCC(OCC#N)CC#N', '3-(cianometoxi)pentanodinitrilo'],
  ['N#CCN(C)CCC#N', '3-[(cianometil)(metil)amino]propanonitrilo'],
];

test('nitriles beside an acid, ester or amide, or on a branch piece, are named with ciano-', () => {
  for (const [smiles, name] of NAMED) {
    assert.equal(nameOf(smiles), name, smiles);
    for (const prefixStyle of PREFIX_STYLES) {
      assert.equal(named(smiles, prefixStyle).ok, true, `${smiles} in the ${prefixStyle} style`);
    }
    // Every nitrile is either a suffix group or one `ciano` prefix.
    const result = named(smiles);
    const suffixes = result.structure.suffix.kind === 'nitrile' ? result.structure.suffix.locants.length : 0;
    assert.equal(suffixes + cyanoCount(result.structure), nitrileCarbons(parseSmiles(smiles)).length, smiles);
  }
  // Traditional names of the acid part keep the ciano group.
  assert.deepEqual(named('CC(=O)OCC#N').alternatives.map((a) => a.name), ['acetato de cianometilo']);
  assert.deepEqual(named('CC(=O)NCC#N').alternatives.map((a) => a.name), ['N-(cianometil)acetamida']);
}); // End of test 'nitriles beside an acid, ester or amide, or on a branch piec…'

test('the nitrile carbon of a ciano- group is outside the parent chain', () => {
  const mol = parseSmiles('N#CCCC(=O)O');
  const adj = adjacency(mol);
  const [carbon] = nitrileCarbons(mol);
  const principal = principalKindOf(mol, adj);
  assert.equal(principal, 'acid');
  assert.deepEqual([...outsideCarbons(mol, adj, principal)], [carbon]);
  // No candidate chain contains it, so the carbon bearing it can end a chain.
  assert.ok(leafToLeafPaths(mol, outsideCarbons(mol, adj, principal)).every((path) => !path.includes(carbon)));
  assert.ok(selectParent(mol).trace.every((step) => step.candidatesBefore.every((c) => !c.atoms.includes(carbon))));
  const result = nameMolecule(mol);
  assert.equal(result.parent.atoms.length, 3);
  assert.ok(!result.parent.atoms.includes(carbon));
  // The prefix is the carbon and the N, bonded to carbon 3.
  const [group] = result.structure.prefixes;
  assert.equal(group.substituent.cyano, true);
  assert.equal(group.substituent.chain, null);
  assert.deepEqual(group.locants.map((site) => site.locant), [3]);
  assert.deepEqual(group.locants[0].atoms, [carbon, adj.get(carbon).find((n) => n.order === 3).atom]);
  assert.equal(group.locants[0].attachAtom, carbon);
  assert.equal(group.locants[0].atom, result.parent.atoms[2]);
  // With a principal nitrile every nitrile carbon may end the parent.
  const dinitrile = parseSmiles('N#CCCC#N');
  assert.equal(outsideCarbons(dinitrile, adjacency(dinitrile), 'nitrile').size, 0);
  assert.equal(nameMolecule(dinitrile).parent.atoms.length, 4);
  // The carbon skeleton can leave the ciano carbons out.
  assert.equal(carbonSkeleton(mol, new Set([carbon])).atoms.size, 3);
}); // End of test 'the nitrile carbon of a ciano- group is outside the parent chain'

test('the nitrile carbon counts in no chain length: the parent choice changes', () => {
  // Counted, both arms of C3 would be three carbons long; without it the propyl arm wins.
  assert.equal(nameOf('OC(=O)CC(CCC#N)CCC'), 'ácido 3-(2-cianoetil)hexanoico');
  // A branch chain never runs through the nitrile carbon either: (2-cianoetil), not (3-nitrilopropil).
  const result = named('OC(=O)CC(CCC#N)CCC');
  const branch = result.structure.prefixes.find((g) => !g.substituent.cyano).substituent;
  assert.equal(branch.chain.length, 2);
  assert.deepEqual(branch.prefixes.map((g) => [substituentPrefix(g.substituent, lexiconEs), g.locants.map((s) => s.locant)]), [['ciano', [2]]]);
  // A nitrile on another carbon piece is ciano- inside the branch, whichever side is longer.
  assert.equal(nameOf('N#CCCCOCC#N'), '4-(cianometoxi)butanonitrilo');
  assert.equal(nameOf('N#CCCOCCCC#N'), '4-(2-cianoetoxi)butanonitrilo');
}); // End of test 'the nitrile carbon counts in no chain length: the parent cho…'

test('the ciano prefix: simple, unenclosed, alphabetised under c, in both lexicons', () => {
  const mol = parseSmiles('N#CCC(=O)O');
  const [carbon] = nitrileCarbons(mol);
  const sub = nameSubstituent(mol, adjacency(mol).get(carbon).find((n) => n.order === 1).atom, carbon);
  assert.equal(sub.cyano, true);
  assert.equal(needsEnclosure(sub), false);
  assert.equal(isCompoundPrefix(sub), false);
  assert.equal(substituentPrefix(sub, lexiconEs), 'ciano');
  assert.equal(substituentPrefix(sub, lexiconEn), 'cyano');
  assert.equal(lexiconEs.groupPrefix('nitrile'), 'ciano');
  assert.equal(lexiconEn.groupPrefix('nitrile'), 'cyano');
  // Alphabetical order: amino < ciano < cloro < hidroxi < metil < oxo.
  assert.equal(nameOf('ClC(C#N)C(=O)O'), 'ácido 2-ciano-2-cloroetanoico');
  assert.equal(nameOf('NCCC(C#N)C(=O)O'), 'ácido 4-amino-2-cianobutanoico');
  assert.equal(nameOf('N#CC(O)C(=O)O'), 'ácido 2-ciano-2-hidroxietanoico');
  assert.equal(nameOf('CC(C)C(C#N)C(=O)O'), 'ácido 2-ciano-3-metilbutanoico');
  assert.equal(nameOf('N#CCC(=O)CC(=O)O'), 'ácido 4-ciano-3-oxobutanoico');
  // English names (the oracle's form).
  const english = [
    ['N#CCCC(=O)O', '3-cyanopropanoic acid'],
    ['N#CCC(=O)OC', 'methyl 2-cyanoethanoate'],
    ['CC(=O)OCC#N', 'cyanomethyl ethanoate'],
    ['N#CCCC(N)=O', '3-cyanopropanamide'],
    ['N#CCCOCC#N', '3-(cyanomethoxy)propanenitrile'],
    ['N#CC(C#N)C(=O)O', '2,2-dicyanoethanoic acid'],
  ];
  for (const [smiles, name] of english) {
    assert.equal(englishName(named(smiles).structure), name, smiles);
  }
}); // End of test 'the ciano prefix: simple, unenclosed, alphabetised under c, …'

test('refusals that stay: a nitrile on an acid, ester or amide carbon, many nitriles, rings, ester and amide prefixes', () => {
  for (const smiles of ['N#CC(=O)O', 'N#CC(=O)OC', 'NC(=O)C#N', 'CN(C)C(=O)C#N']) {
    const result = named(smiles);
    assert.equal(result.error.reason, 'carbonocyanidic', smiles);
    assert.equal(result.error.message, CARBONOCYANIDIC_MESSAGE, smiles);
    assert.ok(result.groups.items.some((g) => g.kind === 'nitrile' && g.role === 'prefix'), `${smiles}: the nitrile is a prefix`);
  }
  // Three nitriles on one piece with the nitrile principal: -tricarbonitrilo, refused; below an acid, all ciano-.
  assert.equal(nameOf('N#CCC(C#N)CC#N'), 'HETEROATOM manyNitriles');
  assert.equal(nameOf('N#CCC(C#N)C(C#N)C(=O)O'), 'ácido 2,3,4-tricianobutanoico');
  // Unchanged refusals beside a nitrile (I-39b, I-39c, I-40).
  assert.equal(nameOf('N#CC1CCCCC1'), 'HETEROATOM ringNitrile');
  assert.equal(nameOf('N#CC1CCC(C(=O)O)CC1'), 'HETEROATOM ringAcid');
  assert.equal(nameOf('N#CCC(=O)OCC(=O)O'), 'HETEROATOM esterPrefix');
  assert.equal(nameOf('COC(=O)CC(C#N)CC(=O)OC'), 'HETEROATOM manyEsters');
  assert.equal(nameOf('N#CCC(=O)NCC(=O)O'), 'HETEROATOM amidePrefix');
  assert.equal(nameOf('CC(=O)C(C#N)C(C)=O'), '2-acetil-3-oxobutanonitrilo', 'acyl prefixes, I-39b');
  // Identical halves each with the principal nitrile: multiplicative names.
  assert.equal(nameOf('N#CCOCC#N'), 'HETEROATOM symmetricEther');
  assert.equal(nameOf('N#CCNCC#N'), 'HETEROATOM symmetricAmine');
  assert.equal(validateForNaming(parseSmiles('N#CCCC(=O)O')), null);
}); // End of test 'refusals that stay: a nitrile on an acid, ester or amide car…'

test('the explanation: ciano- is not the principal group and its carbon is not a chain carbon', () => {
  const group = stepText('N#CCCC(=O)O', 'group');
  assert.match(group, /También tiene un grupo –C≡N \(un nitrilo\)/);
  assert.match(group, /ácido > nitrilo > aldehído > cetona > alcohol/);
  assert.match(group, /cada –C≡N se nombra con el prefijo «ciano-»/);
  assert.match(group, /El prefijo «ciano-» incluye el carbono del –C≡N: ese carbono no se cuenta en la cadena principal ni se numera/);
  assert.match(stepText('N#CCC(=O)OC', 'group'), /ácido > éster > nitrilo > aldehído/);
  assert.match(stepText('N#CCCC(N)=O', 'group'), /ácido > éster > amida > nitrilo > aldehído/);
  // A nitrile left on a branch when the nitrile is principal.
  const branch = stepText('N#CCCOCC#N', 'group');
  assert.match(branch, /Otro –C≡N queda en una rama, fuera de la cadena principal/);
  assert.match(branch, /ni en la principal ni en la de una rama/);
  // Count step: the ciano carbon and N are counted, the N drawn N.
  const count = stepText('N#CCCC(=O)O', 'count');
  assert.match(count, /4 carbonos, 5 hidrógenos, 1 átomo de nitrógeno y 2 átomos de oxígeno \(C₄H₅NO₂\)/);
  assert.match(count, /–C≡N\) se ve como N/);
  assert.deepEqual(atomCounts(named('N#CCCC(=O)O').structure), { carbons: 4, hydrogens: 5, halogens: {}, nitrogens: 1, oxygens: 2 });
  assert.deepEqual(atomCounts(named('CC(=O)OCC#N').structure), { carbons: 4, hydrogens: 5, halogens: {}, nitrogens: 1, oxygens: 2 });
  assert.deepEqual(atomCounts(named('N#CCCOCC#N').structure), { carbons: 5, hydrogens: 6, halogens: {}, nitrogens: 2, oxygens: 1 });
  // Chain step: the –C≡N carbon is outside the chain; the chain need not end where it hangs (review I-39a).
  assert.match(stepText('N#CCCC(=O)O', 'groupChain'), /Sin contar el carbono del –C≡N, que va en el prefijo «ciano-», los demás carbonos forman una sola cadena/);
  assert.match(stepText('CCC(CC)(C#N)CCC(N)=O', 'groupChain'), /El carbono del –C≡N que se nombra con el prefijo «ciano-» no forma parte de la cadena/);
  assert.equal(stepText('CCC(CC)(C#N)CCC(N)=O', 'groupChain').includes('La cadena termina'), false);
  assert.equal(stepText('CCC(C#N)C(C)C(=O)O', 'groupChain').includes('La cadena termina'), false);
  assert.equal(nameOf('CCC(C#N)C(C)C(=O)O'), 'ácido 3-ciano-2-metilpentanoico');
  // Substituents step and legend.
  const subs = stepText('N#CCCC(=O)O', 'substituents');
  assert.match(subs, /En el carbono 3 hay un grupo –C≡N: se escribe «3-ciano»/);
  assert.match(subs, /el ácido carboxílico va antes que el nitrilo/);
  assert.match(stepText('CC(=O)NCC#N', 'substituents'), /Un –C≡N que está en una rama se nombra con el prefijo «ciano-»/);
  const legend = explain(named('N#CCCC(=O)O')).find((s) => s.id === 'assemble').legend;
  assert.ok(legend.some((entry) => entry.text === 'ciano' && /grupo –C≡N/.test(entry.meaning)));
  // Highlights: the group step marks the –C≡N whole (carbon, N, both bonds) as a substituent.
  const mol = parseSmiles('N#CCCC(=O)O');
  const [carbon] = nitrileCarbons(mol);
  const spec = explain(nameMolecule(mol)).find((s) => s.id === 'group').highlight.find((h) => h.style === 'substituent');
  assert.deepEqual([...spec.atoms].sort(), [carbon, adjacency(mol).get(carbon).find((n) => n.order === 3).atom].sort());
  assert.equal(spec.bonds.length, 2);
  // Every step renders without placeholders.
  for (const [smiles] of NAMED) {
    for (const step of explain(named(smiles))) {
      for (const paragraph of step.text) {
        assert.doesNotMatch(plainText(paragraph), /undefined|NaN|null|\[\[|\]\]/, `${smiles}: ${paragraph}`);
      }
    }
  }
}); // End of test 'the explanation: ciano- is not the principal group and its c…'

test('names never depend on atom ids or drawing order', () => {
  const random = seededRandom(43);
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

test('Ordenar dibujo lays out ciano- molecules', () => {
  for (const smiles of ['N#CCCC(=O)O', 'N#CC(C#N)C(=O)O', 'CC(=O)OCC#N', 'N#CCCOCC#N']) {
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
}); // End of test 'Ordenar dibujo lays out ciano- molecules'

test('the seeded ciano- generator: deterministic, distinct, valid, varied', () => {
  const molecules = generateCyano({ count: 120, seed: 3 });
  assert.equal(molecules.length, 120);
  assert.deepEqual(generateCyano({ count: 120, seed: 3 }).map(writeSmiles), molecules.map(writeSmiles), 'deterministic');
  assert.notDeepEqual(generateCyano({ count: 120, seed: 4 }).map(writeSmiles), molecules.map(writeSmiles));
  assert.equal(new Set(molecules.map(canonicalKey)).size, 120, 'distinct');
  const names = molecules.map((mol) => {
    assert.equal(validateForNaming(mol), null, writeSmiles(mol));
    return nameMolecule(mol).name;
  });
  assert.ok(names.every((name) => /ciano/.test(name)));
  assert.ok(names.some((name) => name.startsWith('ácido ')), 'some acids');
  assert.ok(names.some((name) => / de /.test(name)), 'some esters');
  assert.ok(names.some((name) => name.endsWith('amida')), 'some amides');
  assert.ok(names.some((name) => name.endsWith('nitrilo')), 'some nitriles with ciano- on a branch');
  // cyanate() adds one new carbon and one N per –C≡N, and at least one.
  const random = seededRandom(5);
  const base = randomHydrocarbon(random, { size: 4, unsaturation: 0, branchiness: 0.5 });
  const cyano = cyanate(base, random, 0);
  assert.equal(nitrileCarbons(cyano).length, 1);
  assert.equal(cyano.atoms.size - base.atoms.size, 2);
}); // End of test 'the seeded ciano- generator: deterministic, distinct, valid, varied'
