/**
 * @file Unit tests for carboxylic acids (design.md §13.4 I-33): the –COOH as
 * the most senior principal group (ácido > aldehído > cetona > alcohol),
 * cited as `ácido …oico` / `ácido …dioico` (the carboxyl carbon always in
 * the chain, a chain end, locant 1, never cited); P0 and N0 counting each
 * –COOH once; the `oxo-` (ketone or terminal aldehyde) and `hidroxi-`
 * prefixes beside an acid; `ácido fórmico`, `ácido acético` and `ácido
 * oxálico` as other valid forms; the refusals (more than two –COOH, an acid
 * with a ring, the `carboxi-` safety net, esters, acyl halides, anhydrides,
 * salts and other C=O derivatives); both lexicons; id invariance; the
 * explanation steps; the oracle generator. The names themselves are checked
 * row by row in tests/fixtures/names.tsv.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { formula, createMolecule, addAtom, addBond } from '../../src/model/molecule.js';
import { adjacency } from '../../src/model/graph.js';
import {
  validateForNaming, isCarboxylCarbon, carboxylRole, carboxylCarbons, hasNameableHeteroatoms, MESSAGES,
  RING_ACID_MESSAGE, MANY_ACIDS_MESSAGE, CARBOXY_SUBSTITUENT_MESSAGE,
} from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import {
  oxygenKind, principalKindOf, isPrincipalOxygen, isSuffixOxygen, carbonylTraditionalId, OXYGEN_KINDS,
} from '../../src/naming/principal.js';
import { suffixSites, PREFIX_STYLES } from '../../src/naming/substituent.js';
import { selectParent } from '../../src/naming/parent.js';
import { suffixWords, renderName, suffixGroupIds } from '../../src/naming/render.js';
import { lexiconEs } from '../../src/naming/lexicon.es.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { explain, plainText, atomCounts } from '../../src/explain/explain.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateAcids, carboxylate } from '../../scripts/oracle/generate.mjs';
import { canonicalLayout, layoutProblems } from '../../src/layout/canonical.js';

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

test('validation: a –COOH is admitted; esters, acyl halides, anhydrides and other C=O derivatives keep the refusal', () => {
  for (const smiles of ['OC=O', 'CC(=O)O', 'OC(=O)C(=O)O', 'CC(O)C(=O)O', 'O=CCC(=O)O', 'ClCC(=O)O', 'C=CC(=O)O']) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
  }
  // Ester, acyl chloride, anhydride, peracid, carbonic acid, amide, an acid with an amine, formate ester.
  for (const smiles of ['CC(=O)OC', 'CC(=O)Cl', 'CC(=O)OC(=O)C', 'CC(=O)OO', 'OC(=O)O', 'CC(N)=O', 'NCC(=O)O', 'O=COC']) {
    const error = validateForNaming(parseSmiles(smiles));
    assert.equal(error.code, 'HETEROATOM', smiles);
    assert.equal(error.message, MESSAGES.HETEROATOM, smiles);
  }
  assert.match(MESSAGES.HETEROATOM, /y ácidos carboxílicos \(con el grupo –COOH\)/);
  // A salt (a metal, a charge) is not even a valid structure: charges and metals are out of scope.
  const salt = createMolecule();
  const c1 = addAtom(salt);
  const c2 = addAtom(salt);
  const o1 = addAtom(salt, {}, 'O');
  const o2 = addAtom(salt, {}, 'O');
  addBond(salt, c1, c2);
  addBond(salt, c2, o1, 2);
  addBond(salt, c2, o2);
  salt.atoms.get(o2).charge = -1;
  assert.notEqual(validateForNaming(salt), null, 'a carboxylate anion is refused');
  const roles = (smiles) => {
    const mol = parseSmiles(smiles);
    const adj = adjacency(mol);
    return [...mol.atoms.keys()].map((id) => carboxylRole(mol, adj, id));
  };
  // CC(=O)O: atoms 1 C, 2 C, 3 =O, 4 OH.
  assert.deepEqual(roles('CC(=O)O'), [null, null, 'carbonyl', 'hydroxy']);
  assert.deepEqual(roles('CC(=O)OC'), [null, null, null, null, null], 'an ester is not an acid');
  assert.deepEqual(roles('OC(=O)O'), [null, null, null, null], 'carbonic acid: two OH on the carbon');
  const acetic = parseSmiles('CC(=O)O');
  const adj = adjacency(acetic);
  assert.deepEqual([...acetic.atoms.keys()].map((id) => isCarboxylCarbon(acetic, adj, id)), [false, true, false, false]);
  assert.deepEqual(carboxylCarbons(parseSmiles('OC(=O)CCC(=O)O')), [2, 6]);
  assert.equal(hasNameableHeteroatoms(acetic, [3, 4]), true);
}); // End of test 'validation'

test('refusals: more than two –COOH, an acid with a ring, the carboxi- safety net', () => {
  const three = named('OC(=O)CC(CC(=O)O)C(=O)O');
  assert.equal(three.ok, false);
  assert.equal(three.error.code, 'HETEROATOM');
  assert.equal(three.error.reason, 'manyAcids');
  assert.equal(three.error.message, MANY_ACIDS_MESSAGE);
  assert.match(three.error.message, /carboxi-/);
  assert.deepEqual(three.error.acids, carboxylCarbons(parseSmiles('OC(=O)CC(CC(=O)O)C(=O)O')));
  assert.equal(three.groups.principal, 'acid', 'the refusal still explains the groups');
  assert.equal(named('OC(=O)CC(O)(CC(=O)O)C(=O)O').error.reason, 'manyAcids', 'citric acid waits');
  const ring = named('OC(=O)C1CCCCC1');
  assert.equal(ring.error.reason, 'ringAcid');
  assert.equal(ring.error.message, RING_ACID_MESSAGE);
  assert.match(ring.error.message, /carboxílico/);
  assert.equal(named('OC(=O)C1=CC=CC=C1').error.reason, 'ringAcid', 'benzoic acid waits for I-40');
  assert.equal(named('OC(=O)CC1CCCCC1').error.reason, 'ringAcid', 'an acid on a ring side chain');
  assert.equal(named('OC(=O)CCC1CCC(=O)CC1').error.reason, 'ringAcid', 'before the ring ketone check');
  // Two –COOH are always both chain ends of the parent, so the safety net never fires on a validated molecule.
  assert.match(CARBOXY_SUBSTITUENT_MESSAGE, /carboxi-/);
  for (const smiles of ['OC(=O)CC(CC)(CC)CC(=O)O', 'OC(=O)C(CCCCC)C(=O)O', 'OC(=O)C(C(=O)O)(CCCCC)CCCCC']) {
    for (const prefixStyle of PREFIX_STYLES) {
      const result = nameMolecule(parseSmiles(smiles), { prefixStyle });
      assert.equal(result.ok, true, `${smiles} ${prefixStyle}`);
      assert.equal(result.structure.suffix.locants.length, 2, `${smiles} ${prefixStyle}: both –COOH in the suffix`);
    }
  }
  assert.equal(named('OC(=O)C(CCCCC)C(=O)O').name, 'ácido 2-pentilpropanodioico', 'the chain joins both –COOH, not the longest');
  // An acyl branch next to an acid is still refused by the engine.
  assert.equal(named('CC(=O)C(C(=O)O)C(C)=O').error.reason, 'acylSubstituent');
}); // End of test 'refusals'

test('acids and diacids in both lexicons', () => {
  const pairs = [
    ['OC=O', 'ácido metanoico', 'methanoic acid'],
    ['CC(=O)O', 'ácido etanoico', 'ethanoic acid'],
    ['CCC(=O)O', 'ácido propanoico', 'propanoic acid'],
    ['CC(C)C(=O)O', 'ácido 2-metilpropanoico', '2-methylpropanoic acid'],
    ['CC=CC(=O)O', 'ácido but-2-enoico', 'but-2-enoic acid'],
    ['C=CC(=O)O', 'ácido prop-2-enoico', 'prop-2-enoic acid'],
    ['C#CC(=O)O', 'ácido prop-2-inoico', 'prop-2-ynoic acid'],
    ['ClCCC(=O)O', 'ácido 3-cloropropanoico', '3-chloropropanoic acid'],
    ['OC(=O)C(=O)O', 'ácido etanodioico', 'ethanedioic acid'],
    ['OC(=O)CC(=O)O', 'ácido propanodioico', 'propanedioic acid'],
    ['OC(=O)CCC(=O)O', 'ácido butanodioico', 'butanedioic acid'],
    ['OC(=O)CCCCC(=O)O', 'ácido hexanodioico', 'hexanedioic acid'],
    ['OC(=O)C=CC(=O)O', 'ácido but-2-enodioico', 'but-2-enedioic acid'],
  ];
  for (const [smiles, es, en] of pairs) {
    const result = named(smiles);
    assert.equal(result.name, es, smiles);
    assert.equal(englishName(result.structure), en, smiles);
  }
  assert.deepEqual(suffixWords({ kind: 'acid', locants: [{}] }, lexiconEs), { multiplier: '', word: 'oico', elides: true });
  assert.deepEqual(suffixWords({ kind: 'acid', locants: [{}, {}] }, lexiconEs), { multiplier: 'di', word: 'oico', elides: false });
  assert.deepEqual(suffixWords({ kind: 'acid', locants: [{}, {}] }, lexiconEn), { multiplier: 'di', word: 'oic acid', elides: false });
  assert.equal(lexiconEs.suffixClassWord('acid'), 'ácido');
  assert.equal(lexiconEs.suffixClassWord('alcohol'), null);
  assert.equal(lexiconEn.suffixClassWord('acid'), null, 'English writes "acid" as part of the suffix');
  // The word `ácido` is its own part, pointing at the whole –COOH, followed by a space.
  const result = named('CCC(=O)O');
  assert.deepEqual(result.parts.map((p) => [p.text, p.kind]), [['ácido', 'ending'], [' ', 'punct'], ['prop', 'stem'], ['an', 'ending'], ['oico', 'ending']]);
  const [site] = result.structure.suffix.locants;
  const group = [site.atom, site.attachAtom, site.hydroxyAtom].sort((p, q) => p - q);
  assert.deepEqual([...result.parts[0].atoms].sort((p, q) => p - q), group);
  assert.deepEqual([...result.parts[4].atoms].sort((p, q) => p - q), group);
  assert.deepEqual(result.parts[4].bonds, [site.bond, site.hydroxyBond]);
  assert.deepEqual(suffixGroupIds(result.structure.suffix), { atoms: [site.atom, site.attachAtom, site.hydroxyAtom], bonds: [site.bond, site.hydroxyBond] });
}); // End of test 'acids and diacids'

test('the carboxyl carbon is in the chain, locant 1, never cited; each –COOH counts once', () => {
  const result = named('CCCC(C)C(=O)O');
  assert.equal(result.name, 'ácido 2-metilpentanoico');
  const { suffix, parent } = result.structure;
  assert.equal(suffix.kind, 'acid');
  assert.deepEqual(suffix.locants.map((s) => s.locant), [1]);
  assert.equal(parent.length, 5, 'the COOH carbon counts in the chain');
  assert.equal(result.parent.atoms[0], suffix.locants[0].atom, 'the COOH carbon is chain atom 1');
  assert.equal(parent.double.length, 0, 'the C=O is not a double bond of the chain');
  assert.ok(!result.parts.some((p) => p.kind === 'locant' && p.atoms.includes(suffix.locants[0].attachAtom)), 'no locant for the COOH');
  // Both oxygens are of kind 'acid'; only the C=O oxygen stands for the group.
  const mol = parseSmiles('OCCC(=O)O');
  const adj = adjacency(mol);
  assert.equal(principalKindOf(mol, adj), 'acid');
  assert.equal(OXYGEN_KINDS[0], 'acid', 'the most senior oxygen kind');
  const oxygens = [...mol.atoms.keys()].filter((id) => mol.atoms.get(id).element === 'O');
  assert.deepEqual(oxygens.map((id) => oxygenKind(mol, adj, id)), ['alcohol', 'acid', 'acid']);
  assert.deepEqual(oxygens.map((id) => isPrincipalOxygen(mol, adj, id, 'acid')), [false, true, true]);
  assert.deepEqual(oxygens.map((id) => isSuffixOxygen(mol, adj, id, 'acid')), [false, true, false]);
  const sites = suffixSites(mol, adj, [...mol.atoms.keys()].filter((id) => mol.atoms.get(id).element === 'C'));
  assert.equal(sites.length, 1, 'one site per –COOH');
  assert.equal(mol.atoms.get(sites[0].hydroxyAtom).element, 'O');
  // P0 counts each –COOH once: a diacid's parent has the value 2.
  const p0 = selectParent(parseSmiles('OC(=O)CC(CCCC)CC(=O)O')).trace.find((s) => s.rule === 'P0');
  assert.equal(Math.max(...p0.values), 2);
  assert.equal(named('OC(=O)CC(CCCC)CC(=O)O').name, 'ácido 3-butilpentanodioico', 'P0 before P1');
  // N0 before N1 and prefixes.
  assert.equal(named('C=CC(C)C(=O)O').name, 'ácido 2-metilbut-3-enoico');
  assert.ok(named('C=CC(C)C(=O)O').trace.some((s) => s.rule === 'N0'));
  assert.equal(named('CC(C)CC(=O)O').name, 'ácido 3-metilbutanoico');
}); // End of test 'carboxyl carbon in the chain'

test('seniority ácido > aldehído > cetona > alcohol: oxo- and hidroxi- beside an acid', () => {
  const pairs = [
    ['CC(=O)CCC(=O)O', 'ácido 4-oxopentanoico', '4-oxopentanoic acid'],
    ['CC(O)C(=O)O', 'ácido 2-hidroxipropanoico', '2-hydroxypropanoic acid'],
    ['O=CCC(=O)O', 'ácido 3-oxopropanoico', '3-oxopropanoic acid'],
    ['OC(=O)CC(C)=O', 'ácido 3-oxobutanoico', '3-oxobutanoic acid'],
    ['OCC(=O)O', 'ácido 2-hidroxietanoico', '2-hydroxyethanoic acid'],
    ['CC(=O)CC(O)C(=O)O', 'ácido 2-hidroxi-4-oxopentanoico', '2-hydroxy-4-oxopentanoic acid'],
    ['OC(=O)CC(O)C(=O)O', 'ácido 2-hidroxibutanodioico', '2-hydroxybutanedioic acid'],
    ['OC(=O)C(C=O)C', 'ácido 2-metil-3-oxopropanoico', '2-methyl-3-oxopropanoic acid'],
    ['CC(=O)CC(CC(=O)O)CC(C)=O', 'ácido 5-oxo-3-(2-oxopropil)hexanoico', '5-oxo-3-(2-oxopropyl)hexanoic acid'],
  ];
  for (const [smiles, es, en] of pairs) {
    const result = named(smiles);
    assert.equal(result.name, es, smiles);
    assert.equal(englishName(result.structure), en, smiles);
  }
  // The terminal aldehyde is in the chain: an oxo prefix on the last carbon, never formil-.
  const oxo = named('O=CCC(=O)O').structure.prefixes[0];
  assert.equal(oxo.substituent.oxo, true);
  assert.deepEqual(oxo.locants.map((s) => s.locant), [3]);
}); // End of test 'seniority'

test('ácido fórmico, ácido acético and ácido oxálico as other valid forms, only for the bare molecules', () => {
  const acetic = named('CC(=O)O');
  assert.deepEqual(acetic.alternatives.map(({ style, name }) => [style, name]), [['traditional', 'ácido acético']]);
  assert.equal(acetic.alternatives[0].label, 'nombre tradicional, que la IUPAC (2013) conserva como preferido');
  const [part] = acetic.alternatives[0].parts;
  assert.equal(part.text, 'ácido acético');
  assert.deepEqual([...part.atoms].sort((p, q) => p - q), [1, 2, 3, 4], 'the whole molecule');
  assert.deepEqual(named('OC=O').alternatives.map((a) => a.name), ['ácido fórmico']);
  assert.deepEqual(named('OC(=O)C(=O)O').alternatives.map((a) => a.name), ['ácido oxálico']);
  for (const smiles of ['CCC(=O)O', 'ClCC(=O)O', 'OCC(=O)O', 'OC(=O)CC(=O)O', 'C=CC(=O)O', 'O=CC(=O)O']) {
    assert.deepEqual(named(smiles).alternatives, [], smiles);
  }
  assert.equal(carbonylTraditionalId(acetic.structure), 'aceticAcid');
  assert.deepEqual(['formicAcid', 'aceticAcid', 'oxalicAcid'].map((id) => lexiconEs.traditionalName(id)), ['ácido fórmico', 'ácido acético', 'ácido oxálico']);
  assert.deepEqual(['formicAcid', 'aceticAcid', 'oxalicAcid'].map((id) => lexiconEn.traditionalName(id)), ['formic acid', 'acetic acid', 'oxalic acid']);
  // A diacid with more than two carbons, or a dialdehyde, gets no oxalic name.
  assert.equal(carbonylTraditionalId(named('O=CC=O').structure), null);
  assert.equal(renderName(acetic.structure, lexiconEn).name, 'ethanoic acid');
}); // End of test 'traditional names'

test('formula and atom counts: a –COOH is two oxygens and one C=O', () => {
  for (const [smiles, expected] of [
    ['OC=O', { carbons: 1, hydrogens: 2, halogens: {}, oxygens: 2 }],
    ['CC(=O)O', { carbons: 2, hydrogens: 4, halogens: {}, oxygens: 2 }],
    ['OC(=O)C(=O)O', { carbons: 2, hydrogens: 2, halogens: {}, oxygens: 4 }],
    ['CC(O)C(=O)O', { carbons: 3, hydrogens: 6, halogens: {}, oxygens: 3 }],
    ['CC(=O)CCC(=O)O', { carbons: 5, hydrogens: 8, halogens: {}, oxygens: 3 }],
    ['ClCC(=O)O', { carbons: 2, hydrogens: 3, halogens: { Cl: 1 }, oxygens: 2 }],
    ['C=CC(=O)O', { carbons: 3, hydrogens: 4, halogens: {}, oxygens: 2 }],
  ]) {
    assert.deepEqual(atomCounts(named(smiles).structure), expected, smiles);
    const { carbons, hydrogens, halogens, oxygens } = expected;
    const hill = `C${carbons === 1 ? '' : carbons}H${hydrogens}${Object.entries(halogens).map(([el, n]) => `${el}${n === 1 ? '' : n}`).join('')}O${oxygens === 1 ? '' : oxygens}`;
    assert.equal(formula(parseSmiles(smiles)), hill, smiles);
  }
});

test('names never depend on atom ids or drawing order', () => {
  const random = seededRandom(33);
  for (const smiles of ['CC(C)C(=O)O', 'OC(=O)CCC(=O)O', 'CC(=O)CC(O)C(=O)O', 'O=CCC(=O)O', 'CC(=O)O', 'OC=O',
    'CC(=O)CC(CC(=O)O)CC(C)=O', 'OC(=O)CC(CCCC)CC(=O)O', 'OC(=O)CC(CC(=O)O)C(=O)O', 'CC(=O)C(C(=O)O)C(C)=O']) {
    const reference = named(smiles);
    for (let k = 0; k < 6; k += 1) {
      const result = nameMolecule(scrambleMolecule(parseSmiles(smiles), random));
      assert.equal(result.ok, reference.ok, smiles);
      assert.equal(result.ok ? result.name : result.error.reason, reference.ok ? reference.name : reference.error.reason, smiles);
      assert.deepEqual((result.alternatives || []).map((a) => a.name), (reference.alternatives || []).map((a) => a.name), smiles);
    }
  }
});

test('explanation: the –COOH group, ácido …oico, the uncited locant, oxo- and hidroxi-', () => {
  const ids = (smiles) => explain(named(smiles)).map((s) => s.id);
  assert.deepEqual(ids('OC=O'), ['count', 'group', 'assemble']);
  assert.deepEqual(ids('CC(=O)O'), ['count', 'group', 'groupChain', 'numbering', 'assemble']);
  assert.match(stepText('CC(=O)O', 'count'), /2 carbonos, 4 hidrógenos y 2 átomos de oxígeno \(C₂H₄O₂\)/);
  assert.match(stepText('CC(=O)O', 'count'), /En el grupo –COOH están los dos: el O con enlace doble y el OH/);
  assert.match(stepText('CCC(=O)O', 'group'), /un grupo –COOH.*la molécula es un ácido carboxílico/);
  assert.match(stepText('CCC(=O)O', 'group'), /el –OH del –COOH no es un alcohol, ni su C=O una cetona/);
  assert.match(stepText('CCC(=O)O', 'group'), /siempre está en un extremo de la cadena.*se cuenta al buscarla y al numerarla, y siempre es el carbono 1/);
  assert.match(stepText('CCC(=O)O', 'group'), /el nombre empieza por la palabra «ácido» y termina con el sufijo «-oico»/);
  assert.match(stepText('OC=O', 'group'), /el único carbono de la molécula/);
  assert.match(stepText('OC(=O)CCC(=O)O', 'group'), /2 grupos –COOH, uno en cada extremo de la cadena principal, así que el sufijo dice cuántos: «-dioico»/);
  assert.match(stepText('CC(=O)CCC(=O)O', 'group'), /un grupo C=O entre dos carbonos \(una cetona\).*ácido > aldehído > cetona > alcohol.*Aquí manda el ácido/);
  assert.match(stepText('O=CCC(=O)O', 'group'), /un grupo –CHO en el otro extremo \(un aldehído\).*«oxo-» \(también el del –CHO/);
  assert.match(stepText('CC(O)C(=O)O', 'group'), /un grupo –OH \(un alcohol\).*cada –OH que no es del ácido se nombra con el prefijo «hidroxi-»/);
  assert.match(stepText('CC(=O)CC(CC(=O)O)CC(C)=O', 'group'), /un grupo C=O en una rama/);
  assert.match(stepText('CC(=O)CC(CC(=O)O)CC(C)=O', 'groupChain'), /El carbono de cada –COOH forma parte de la cadena, en un extremo/);
  assert.match(stepText('OC(=O)CC(CCCC)CC(=O)O', 'groupChain'), /Hay una cadena más larga, de \d+ carbonos, pero lleva menos grupos –COOH/);
  assert.match(stepText('CC(C)C(=O)O', 'numbering'), /Regla: los grupos –COOH \(el grupo principal\) deben tener los localizadores más bajos/);
  assert.match(stepText('CC(C)C(=O)O', 'numbering'), /El carbono del grupo –COOH siempre es el 1, así que su número no se escribe: «ácido 2-metilpropanoico», nunca «-1-oico»/);
  assert.match(stepText('CCC(=O)O', 'numbering'), /Aquí no hace falta numerar/);
  assert.match(stepText('OC(=O)CCC(=O)O', 'numbering'), /Los dos grupos –COOH están en los extremos, en los carbonos 1 y 4/);
  assert.match(stepText('C=CC(C)C(=O)O', 'numbering'), /el enlace doble tendría el número 1 en vez del 3, pero manda el –COOH/);
  assert.match(stepText('CC(O)C(=O)O', 'substituents'), /En el carbono 2 hay un grupo –OH: se escribe «2-hidroxi».*el ácido \(–COOH\) va antes que el alcohol/);
  assert.match(stepText('O=CCC(=O)O', 'substituents'), /«3-oxo».*el ácido va antes que el aldehído y la cetona/);
  assert.match(stepText('CC(=O)O', 'assemble'), /«-oico», sin número\. El –COOH no lleva número.*Delante de todo va la palabra «ácido».*La «o» final de «-ano» se quita delante de «-oico».*«ácido acético»: nombre tradicional/);
  assert.match(stepText('OC(=O)CCC(=O)O', 'assemble'), /«di» quiere decir que hay 2 grupos –COOH.*se queda delante de «-dioico»/);
  const legend = explain(named('CC(C)C(=O)O')).find((s) => s.id === 'assemble').legend;
  assert.deepEqual(legend.map((l) => l.text), ['ácido', '2', 'metil', 'prop', '-an', '-oico'], 'no locant entry for the COOH');
  assert.match(legend[0].meaning, /ácido carboxílico/);
  const numbering = explain(named('CC(C)C(=O)O')).find((s) => s.id === 'numbering');
  assert.equal(numbering.compare.rows[0].label, 'Grupos –COOH');
  // The –COOH is highlighted whole (carbon and both oxygens) in the group step, an oxo- prefix with its carbon.
  const result = named('CC(=O)CCC(=O)O');
  const group = explain(result).find((s) => s.id === 'group');
  const [site] = result.structure.suffix.locants;
  assert.deepEqual(group.highlight[0], {
    atoms: [site.atom, site.attachAtom, site.hydroxyAtom], bonds: [site.bond, site.hydroxyBond], style: 'parent',
  });
  const oxo = result.structure.prefixes[0].locants[0];
  assert.deepEqual(group.highlight[1], { atoms: [oxo.atom, oxo.attachAtom], bonds: [oxo.bond], style: 'substituent' });
  // The refusals get the group steps and their own message.
  const refused = explain(named('OC(=O)C1CCCCC1'));
  assert.deepEqual(refused.map((s) => s.id), ['groups', 'principal', 'affixes', 'notYet']);
  assert.match(refused[3].text[0], /carboxílico/);
}); // End of test 'explanation'

test('Ordenar dibujo lays out acids', () => {
  for (const smiles of ['OC=O', 'CC(=O)O', 'OC(=O)CCC(=O)O', 'CC(=O)CC(O)C(=O)O', 'CC(=O)CC(CC(=O)O)CC(C)=O']) {
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

test('oracle generator: deterministic acids, all named in every style, one or two –COOH', () => {
  const first = generateAcids({ count: 60, seed: 3 }).map(writeSmiles);
  assert.deepEqual(generateAcids({ count: 60, seed: 3 }).map(writeSmiles), first);
  assert.equal(first.length, 60);
  for (const smiles of first) {
    const mol = parseSmiles(smiles);
    const acids = carboxylCarbons(mol).length;
    assert.ok(acids === 1 || acids === 2, smiles);
    for (const prefixStyle of PREFIX_STYLES) {
      assert.equal(nameMolecule(mol, { prefixStyle }).ok, true, `${smiles} ${prefixStyle}`);
    }
  }
  assert.equal(nameMolecule(carboxylate(parseSmiles('C'), seededRandom(1), 1)).name, 'ácido metanoico');
  assert.equal(nameMolecule(carboxylate(parseSmiles('CC'), seededRandom(1), 2)).name, 'ácido etanodioico');
  assert.equal(writeSmiles(carboxylate(parseSmiles('C1CC1'), seededRandom(1), 1)), writeSmiles(parseSmiles('C1CC1')), 'no end carbon: unchanged');
});
