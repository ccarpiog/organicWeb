/**
 * @file Unit tests for halogen derivatives (design.md §13.4 I-30): the
 * prefixes fluoro-, cloro-, bromo-, yodo- (never a suffix), multipliers,
 * Spanish alphabetical order together with the alkyl prefixes, the
 * numbering rules (halogens count with every other prefix, after the
 * multiple bonds; ties go to the prefix cited first), locant omission,
 * validation (only halogens bonded to a carbon lift the HETEROATOM refusal),
 * id invariance, the explanation steps and the views that need a name.
 * The names themselves are checked row by row in tests/fixtures/names.tsv.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { createMolecule, addAtom, addBond } from '../../src/model/molecule.js';
import { HALOGEN_ELEMENTS, isHalogen } from '../../src/model/elements.js';
import { carbonSkeleton } from '../../src/model/graph.js';
import {
  validateForNaming, isHalogenDerivative, longestSideChain, MESSAGES,
} from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { PREFIX_STYLES, halogenSubstituent, nameSubstituent } from '../../src/naming/substituent.js';
import { citationKey, substituentPrefix, needsEnclosure, isCompoundPrefix } from '../../src/naming/render.js';
import {
  lexiconEs, chainOmitsPrefixLocants, fullyHalogenated, parentHydrogens, omitsLocants, ringOmitsLocants,
} from '../../src/naming/lexicon.es.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { compareCitationKeys } from '../../src/naming/numbering.js';
import { explain, plainText, atomCounts } from '../../src/explain/explain.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom } from '../../scripts/oracle/generate.mjs';
import { canonicalLayout, layoutProblems } from '../../src/layout/canonical.js';
import { projectRightAngles, rightAngleNote, FALLBACK_NOTES } from '../../src/ui/canvasbar.js';

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

test('halogen prefixes in both lexicons; halogens are recognised by element', () => {
  assert.deepEqual(HALOGEN_ELEMENTS, ['F', 'Cl', 'Br', 'I']);
  assert.deepEqual(['F', 'Cl', 'Br', 'I', 'C', 'O', 'N', 'cl', 'toString'].map(isHalogen), [true, true, true, true, false, false, false, false, false]);
  assert.deepEqual(HALOGEN_ELEMENTS.map(lexiconEs.halogenPrefix), ['fluoro', 'cloro', 'bromo', 'yodo']);
  assert.deepEqual(HALOGEN_ELEMENTS.map(lexiconEn.halogenPrefix), ['fluoro', 'chloro', 'bromo', 'iodo']);
  assert.throws(() => lexiconEs.halogenPrefix('C'), /not a halogen/);
  assert.throws(() => lexiconEn.halogenPrefix('toString'), /not a halogen/);
  // The group lexicon (I-29) and the prefix agree.
  assert.deepEqual(HALOGEN_ELEMENTS.map((el) => lexiconEs.groupPrefix('halide', el)), HALOGEN_ELEMENTS.map(lexiconEs.halogenPrefix));
});

test('a halogen substituent: a simple prefix with no chain, never enclosed, di/tri when repeated', () => {
  const sub = halogenSubstituent(7, 'Cl');
  assert.deepEqual(sub, {
    halogen: 'Cl', chain: null, prefixes: [], freeValence: { locant: 1, order: 1 }, retained: null, commonName: null, atoms: [7], bonds: [],
  });
  assert.equal(substituentPrefix(sub, lexiconEs), 'cloro');
  assert.equal(substituentPrefix(sub, lexiconEn), 'chloro');
  assert.equal(needsEnclosure(sub), false);
  assert.equal(isCompoundPrefix(sub), false);
  assert.deepEqual(citationKey(sub, lexiconEs), { alpha: 'cloro', numeric: [], italic: '' });
  const mol = parseSmiles('CCBr');
  const bond = [...mol.bonds.values()].find((b) => mol.atoms.get(b.a).element === 'Br' || mol.atoms.get(b.b).element === 'Br');
  const [carbon, bromine] = mol.atoms.get(bond.a).element === 'Br' ? [bond.b, bond.a] : [bond.a, bond.b];
  assert.equal(nameSubstituent(mol, carbon, bromine).halogen, 'Br');
  assert.equal(nameSubstituent(mol, bromine, carbon === 1 ? 2 : 1), null, 'not bonded');
  assert.equal(named('ClC(Cl)(Cl)CC').name, '1,1,1-tricloropropano', 'tri, a simple prefix');
  assert.equal(named('CCCC(CCl)(CCl)CCC').name, '4,4-bis(clorometil)heptano', 'a halogenated group is compound: bis');
});

test('Spanish alphabetical order of the translated prefixes, multipliers ignored', () => {
  const key = (el) => citationKey(halogenSubstituent(1, el), lexiconEs);
  const sorted = [...HALOGEN_ELEMENTS].sort((a, b) => compareCitationKeys(key(a), key(b)));
  assert.deepEqual(sorted.map(lexiconEs.halogenPrefix), ['bromo', 'cloro', 'fluoro', 'yodo']);
  assert.equal(named('ClC(Br)(I)F').name, 'bromoclorofluoroyodometano');
  assert.equal(named('FC(F)(F)Cl').name, 'clorotrifluorometano', 'tri- does not count: cloro (c) before trifluoro (f)');
  assert.equal(named('CC(I)CC(C)C').name, '2-metil-4-yodopentano', 'yodo sorts under y, after metil');
  assert.equal(named('CC(F)CC(C)C').name, '2-fluoro-4-metilpentano', 'fluoro before metil');
  assert.equal(named('CCC(CC)C(Cl)CC').name, '3-cloro-4-etilhexano', 'cloro before etil');
  // English rendering of the same structure (the oracle): the words change, the numbering does not.
  assert.equal(englishName(named('CC(I)CC(C)C').structure), '2-methyl-4-iodopentane');
});

test('numbering: halogens with every other prefix, after the multiple bonds; ties to the first cited', () => {
  const rules = (smiles) => named(smiles).trace.filter((s) => /^(N\d|P\d|TIE)$/.test(s.rule) && s.survivors.length < s.candidatesBefore.length).map((s) => s.rule);
  // N3 (all prefixes together) decides before the alphabetical rule N4.
  assert.equal(named('CC(Br)CCl').name, '2-bromo-1-cloropropano');
  assert.deepEqual(rules('CC(Br)CCl'), ['N3']);
  // A real tie: N4 gives the lower locant to bromo (cited first).
  assert.equal(named('BrCCCl').name, '1-bromo-2-cloroetano');
  assert.deepEqual(rules('CC(Cl)CC(Br)C'), ['N4']);
  assert.equal(named('CC(Cl)CC(Br)C').name, '2-bromo-4-cloropentano');
  // Multiple bonds first (N1), whatever the halogen.
  assert.equal(named('C=CCCl').name, '3-cloroprop-1-eno');
  assert.equal(named('CC(Cl)C#C').name, '3-clorobut-1-ino');
  assert.equal(named('ClC1CCC=CC1').name, '4-clorociclohex-1-eno');
  // Halogens count in P4 (most substituents): the chains through CH2Br win.
  const bromo = named('BrCC(C)C');
  assert.equal(bromo.name, '1-bromo-2-metilpropano');
  const p4 = bromo.trace.find((s) => s.rule === 'P4');
  assert.deepEqual([...p4.values].sort(), [1, 2, 2]);
  // Halogens are never chain atoms: the parent is measured in carbons.
  assert.deepEqual(named('ClCCCl').parent.atoms.length, 2);
  assert.equal(named('ClC(Cl)(Cl)Cl').parent.atoms.length, 1);
});

test('locant omission: one-carbon, monosubstituted two-carbon and fully halogenated parents', () => {
  const chain = (length, double = 0, triple = 0) => ({
    length, double: Array(double).fill({ locant: 1 }), triple: Array(triple).fill({ locant: 1 }),
  });
  const group = (el, n) => ({ substituent: el ? halogenSubstituent(1, el) : { prefixes: [] }, locants: Array(n).fill({ locant: 1 }) });
  assert.equal(parentHydrogens(chain(2)), 6);
  assert.equal(parentHydrogens(chain(2, 1)), 4);
  assert.equal(parentHydrogens(chain(2, 0, 1)), 2);
  assert.equal(parentHydrogens({ kind: 'ring', ...chain(6) }), 12);
  assert.equal(chainOmitsPrefixLocants(chain(1), [group('Cl', 3)]), true);
  assert.equal(chainOmitsPrefixLocants(chain(2), [group('Cl', 1)]), true);
  assert.equal(chainOmitsPrefixLocants(chain(2), [group('Cl', 2)]), false);
  assert.equal(chainOmitsPrefixLocants(chain(2), [group('Cl', 6)]), true);
  assert.equal(chainOmitsPrefixLocants(chain(2), [group('Cl', 3), group('F', 3)]), false, 'two halogens: locants needed');
  assert.equal(chainOmitsPrefixLocants(chain(3), [group('Cl', 1)]), false);
  assert.equal(chainOmitsPrefixLocants(chain(3), []), false);
  assert.equal(fullyHalogenated(chain(2, 1), [group('F', 4)]), true);
  assert.equal(fullyHalogenated(chain(2), [group(null, 6)]), false, 'only halogens');
  assert.equal(omitsLocants(chain(2, 1), true), true, 'eteno keeps no ene locant with prefixes');
  assert.equal(omitsLocants(chain(3, 1), true), false, 'propeno does');
  assert.deepEqual(ringOmitsLocants({ kind: 'ring', ...chain(3) }, [group('F', 6)]), { parent: false, prefixes: true });
  const names = [
    ['CCl', 'clorometano'], ['CCCl', 'cloroetano'], ['C=CCl', 'cloroeteno'], ['ClC#C', 'cloroetino'],
    ['ClC=CCl', '1,2-dicloroeteno'], ['CC(Cl)Cl', '1,1-dicloroetano'], ['ClC(Cl)(Cl)C(Cl)(Cl)Cl', 'hexacloroetano'],
    ['ClC(Cl)=C(Cl)Cl', 'tetracloroeteno'], ['ClC(Cl)=C(Cl)C(Cl)=C(Cl)Cl', 'hexaclorobuta-1,3-dieno'],
    ['FC(F)(F)C(Cl)(Cl)Cl', '1,1,1-tricloro-2,2,2-trifluoroetano'], ['CC(Cl)C', '2-cloropropano'],
    ['ClC1CCCCC1', 'clorociclohexano'], ['ClC1=CCCCC1', '1-clorociclohex-1-eno'], ['ClC1=CC=CC=C1', 'clorobenceno'],
    ['IC1=CC=CC=C1', 'yodobenceno'], ['ClCC1=CC=CC=C1', '(clorometil)benceno'], ['CCCC(CCl)CCCC', '4-(clorometil)octano'],
    // One-carbon groups cite no locants, so mixed prefixes run together (I-30 review).
    ['ClC(Br)C1=CC=CC=C1', '(bromoclorometil)benceno'], ['CCCC(=C(Cl)Br)CCC', '4-(bromoclorometiliden)heptano'],
    ['CCCC(C(F)(Cl)Br)CCCC', '4-(bromoclorofluorometil)octano'], ['CCCC(CC(Cl)Br)CCCC', '4-(2-bromo-2-cloroetil)octano'],
  ];
  for (const [smiles, name] of names) {
    assert.equal(named(smiles).name, name, smiles);
  }
});

test('validation: halogens bonded to a carbon are named; other O and N molecules keep the refusal', () => {
  for (const smiles of ['CCl', 'ClC1CCCCC1', 'ClC1=CC=CC=C1', 'C=CCBr', 'FC(F)(F)F']) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
  }
  // Alcohols with halogens are named since I-31 (tests/unit/alcohols.test.js).
  for (const smiles of ['ClCCO', 'OC1CCC(Cl)CC1']) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
  }
  // Ethers with halogens are named since I-34 (tests/unit/ethers.test.js).
  // Esters with halogens are named since I-35 (tests/unit/esters.test.js).
  // Amines with halogens are named since I-36 (tests/unit/amines.test.js), nitriles since I-38 (`2,2,2-trifluoroetanonitrilo`);
  // cyanogen chloride (Cl on the nitrile carbon) keeps the refusal.
  for (const smiles of ['ClCCOOC', 'ClC(=O)C', 'ONCCBr', 'ClCOC(=O)OC', 'ClC#N', 'ClCC(=O)OC(C)=O']) {
    const mol = parseSmiles(smiles);
    const result = nameMolecule(mol);
    assert.equal(result.ok, false, smiles);
    assert.equal(result.error.code, 'HETEROATOM', smiles);
    assert.equal(result.error.message, MESSAGES.HETEROATOM);
    const hetero = [...mol.atoms.values()].filter((a) => a.element !== 'C').map((a) => a.id).sort((p, q) => p - q);
    assert.deepEqual(result.error.atoms, hetero, `${smiles}: every heteroatom listed, halogens included`);
    assert.ok(result.groups.items.some((g) => g.kind !== 'halide'), `${smiles}: an O or N group is present`);
  }
  // Halogens not bonded to a carbon: refused as before.
  const lone = createMolecule();
  addAtom(lone, {}, 'Cl');
  assert.equal(validateForNaming(lone).code, 'HETEROATOM');
  const dichlorine = createMolecule();
  addBond(dichlorine, addAtom(dichlorine, {}, 'Cl'), addAtom(dichlorine, {}, 'Cl'));
  assert.equal(nameMolecule(dichlorine).error.code, 'HETEROATOM');
  assert.equal(isHalogenDerivative(parseSmiles('CCCl'), [3]), true);
  assert.equal(isHalogenDerivative(parseSmiles('CCO'), [3]), false);
  // A polysubstituted benzene is still CYCLE, halogens or not.
  assert.equal(validateForNaming(parseSmiles('ClC1=CC=C(Cl)C=C1')).code, 'CYCLE');
  assert.equal(validateForNaming(parseSmiles('CC1=CC=C(Br)C=C1')).code, 'CYCLE');
  assert.match(MESSAGES.HETEROATOM, /derivados halogenados/);
  // An OH on the side chain of a ring (the benzene here) is named since I-40a: the chain is the parent.
  assert.equal(validateForNaming(parseSmiles('ClC(O)C1=CC=CC=C1')), null);
  assert.equal(nameMolecule(parseSmiles('ClC(O)C1=CC=CC=C1')).name, 'cloro(fenil)metanol');
});

test('size caps count carbons: a halogen never lengthens the chain', () => {
  const tail = (n) => `Cl${'C'.repeat(n)}Cl`;
  assert.equal(validateForNaming(parseSmiles(tail(30))), null, '30 carbons between two chlorines');
  assert.equal(validateForNaming(parseSmiles(tail(31))).code, 'TOO_BIG');
  assert.equal(carbonSkeleton(parseSmiles(tail(3))).atoms.size, 3);
  assert.equal(longestSideChain(parseSmiles(`Cl${'C'.repeat(30)}C1CC1`)), 30);
  assert.equal(validateForNaming(parseSmiles(`Cl${'C'.repeat(30)}C1CC1`)), null);
  assert.equal(named(tail(30)).name, '1,30-diclorotriacontano');
});

test('names never depend on atom ids, bond order or drawing order', () => {
  const random = seededRandom(30);
  const smiles = [
    'CC(Br)CCl', 'CC(I)CC(C)C', 'BrCC(C)C', 'ClC(Br)(I)F', 'ClC1CCCC(C)C1', 'ClC1=CC=CC=C1', 'ClC1C=CC=CC=1',
    'CCCCC(C(C)C)(Cl)CCCC', 'FC(F)(F)C(Cl)(Cl)Cl', 'CCCC(CCl)C(C)CCC', 'ClC(Cl)=C(Cl)C(Cl)=C(Cl)Cl',
  ];
  for (const s of smiles) {
    const mol = parseSmiles(s);
    for (const prefixStyle of PREFIX_STYLES) {
      const expected = nameMolecule(mol, { prefixStyle }).name;
      for (let k = 0; k < 5; k += 1) {
        const copy = scrambleMolecule(mol, random);
        assert.equal(writeSmiles(copy).length > 0, true);
        assert.equal(nameMolecule(copy, { prefixStyle }).name, expected, `${s} (${prefixStyle})`);
      }
    }
  } // End of the loop over the molecules
});

test('explanation: formula with halogens, halogens off the chain, prefixes, order and omitted locants', () => {
  assert.deepEqual(atomCounts(named('CC(Br)CCl').structure), { carbons: 3, hydrogens: 6, halogens: { Br: 1, Cl: 1 }, oxygens: 0 });
  assert.deepEqual(atomCounts(named('ClC(Cl)(Cl)Cl').structure), { carbons: 1, hydrogens: 0, halogens: { Cl: 4 }, oxygens: 0 });
  assert.deepEqual(atomCounts(named('CCCC(CCl)CCCC').structure), { carbons: 9, hydrogens: 19, halogens: { Cl: 1 }, oxygens: 0 });
  assert.match(stepText('CC(Br)CCl', 'count'), /3 carbonos, 6 hidrógenos, 1 átomo de bromo y 1 átomo de cloro \(C₃H₆BrCl\)/);
  assert.match(stepText('ClC(Cl)(Cl)Cl', 'count'), /ningún hidrógeno y 4 átomos de cloro \(CCl₄\)/);
  assert.match(stepText('CC(Br)CCl', 'chain'), /nunca forman parte de la cadena: solo cuentan los carbonos/);
  assert.match(stepText('CC(Br)CCl', 'substituents'), /Se nombran con un prefijo: «fluoro-» \(F\), «cloro-» \(Cl\), «bromo-» \(Br\) o «yodo-» \(I\)/);
  assert.match(stepText('CC(Br)CCl', 'substituents'), /En el carbono 2 hay un átomo de bromo: se escribe «2-bromo»/);
  assert.match(stepText('CC(Br)CCl', 'order'), /«bromo» va antes que «cloro» \(b va antes que c\)/);
  assert.match(stepText('CC(I)CC(C)C', 'order'), /«metil» va antes que «yodo».*«yodo» por la y/);
  assert.match(stepText('CC(Cl)CC(Br)C', 'numbering'), /el número más bajo es para el sustituyente que se escribe primero \(por orden alfabético\)/);
  assert.match(stepText('BrCC(C)C', 'tiebreak'), /cuentan las ramas y también los halógenos/);
  assert.match(stepText('CCCl', 'numbering'), /En «cloroetano» no hace falta el número/);
  assert.match(stepText('ClC(Cl)(Cl)C(Cl)(Cl)Cl', 'numbering'), /todos los hidrógenos se han cambiado por cloro/);
  assert.match(stepText('ClC(Cl)Cl', 'substituents'), /En el carbono hay 3 átomos de cloro: se escribe «tricloro», sin números. «tri» significa 3\./);
  assert.match(stepText('ClC1CCCCC1', 'ring'), /Los átomos de halógeno unidos al anillo no forman parte de él/);
  assert.match(stepText('ClC1=CC=CC=C1', 'benzene'), /El átomo de cloro unido al anillo es un sustituyente/);
  assert.match(stepText('CCCC(CCl)CCCC', 'substituents'), /Es una rama con halógenos.*no hace falta ningún número/);
  assert.match(stepText('CC(Br)CCl', 'assemble'), /nunca cambian la terminación/);
  // No "Aunque aquí no hay otra posibilidad, el número se escribe" note for halogen locants (they are informative).
  assert.doesNotMatch(stepText('CC(Cl)C', 'numbering'), /no hay otra posibilidad/);
  // Legend and locant labels: an omitted locant is not drawn.
  const steps = explain(named('CCCl'));
  const subs = steps.find((s) => s.id === 'substituents');
  assert.equal(subs.locants, null);
  const legend = steps.find((s) => s.id === 'assemble').legend;
  assert.deepEqual(legend[0], { text: 'cloro', kind: 'prefix', meaning: 'sustituyente: átomo de cloro (Cl), un halógeno' });
  // A successful halogen result is not a refusal: no group steps, no `groups`.
  assert.equal('groups' in named('CCCl'), false);
  assert.ok(steps.every((s) => !['groups', 'principal', 'affixes', 'notYet'].includes(s.id)));
});

test('views that need a name: Ordenar dibujo lays out halogen derivatives; the 90° view keeps the normal drawing', () => {
  for (const smiles of ['ClC(Cl)(Cl)Cl', 'CC(Br)CCl', 'ClC1=CC=CC=C1', 'FC(F)(F)C1CCCCC1', 'CCCCC(C(Cl)(Cl)Cl)CCCC']) {
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
  const projection = projectRightAngles(parseSmiles('CC(Br)CCl'));
  assert.deepEqual(projection, { ok: false, reason: 'HETEROATOM' });
  assert.equal(rightAngleNote(projection), FALLBACK_NOTES.HETEROATOM);
  assert.equal(projectRightAngles(parseSmiles('CCCC')).ok, true, 'hydrocarbons unchanged');
});
