/**
 * @file Unit tests for phase I-45a, substituted phenyl and phenoxy groups as
 * substituents of a chain parent (design.md §14; src/model/validate.js
 * polysubstitutedBenzeneScope() / substitutedPhenylOnly(),
 * src/naming/substituent.js ringSubstituent(), src/naming/render.js
 * isSubstitutedPhenyl(), src/naming/principal.js carbonylTraditionalId(),
 * src/explain/explain.js substitutedPhenylDescription()): the names
 * (`1-(4-metilfenil)etan-1-ona`, `2-(4-clorofenil)etan-1-ol`,
 * `ácido 2-(3-metilfenil)etanoico`, `2-(4-metilfenoxi)etan-1-ol`,
 * `N-(4-metilfenil)etanamida`), the alternatives present and absent (no
 * `acetofenona`, `alcohol bencílico` or `bencilamina` for a substituted
 * phenyl; the acetic forms kept), Kekulé and atom-id invariance, the
 * explanation, the refusals that stay (two substituted rings, substituted
 * benzoyl (named since I-45b), esters with a substituted ring, a junior group on the ring,
 * groups on two branches) and the oracle generator.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import {
  validateForNaming, substitutedPhenylOnly, phenylParentError, SUBSTITUTED_BENZENE_ESTER_MESSAGE,
  polysubstitutedBenzeneMessage,
} from '../../src/model/validate.js';
import { perceiveRings } from '../../src/model/rings.js';
import { nameMolecule } from '../../src/naming/index.js';
import { isSubstitutedPhenyl, isCompoundPrefix, needsEnclosure } from '../../src/naming/render.js';
import { explain, plainText } from '../../src/explain/explain.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateSubstitutedPhenyls } from '../../scripts/oracle/generate.mjs';

/**
 * Names a SMILES string or a molecule and checks that it succeeded.
 *
 * @param {string|object} input - The molecule, as SMILES or as a molecule object.
 * @returns {object} The naming result.
 */
function named(input) {
  const mol = typeof input === 'string' ? parseSmiles(input) : input;
  const result = nameMolecule(mol);
  assert.equal(result.ok, true, `${typeof input === 'string' ? input : writeSmiles(input)}: ${JSON.stringify(result.error)}`);
  return result;
}

/**
 * The other Kekulé drawing of a molecule with one benzene ring: every ring
 * bond order swapped (1 ↔ 2).
 *
 * @param {string} smiles - The molecule.
 * @returns {object} The molecule with the double bonds on the other three sides.
 */
function kekuleSwap(smiles) {
  const mol = parseSmiles(smiles);
  for (const id of perceiveRings(mol).rings[0].bonds) {
    const bond = mol.bonds.get(id);
    bond.order = 3 - bond.order;
  }
  return mol;
}

/**
 * What must not change between drawings of one molecule: the name, the
 * alternatives, the English name and the explanation texts. With scrambled
 * atom ids the chain numbering step may list its two options in the other
 * order (option A / B follow the atom ids, as for any chain parent), so
 * only the other steps are compared then.
 *
 * @param {object} result - A naming result.
 * @param {boolean} [sameIds] - The atom ids are those of the reference drawing (default true).
 * @returns {object} The comparable summary.
 */
function summary(result, sameIds = true) {
  return {
    name: result.name,
    alternatives: result.alternatives.map((a) => [a.style, a.name, a.label]),
    english: englishName(result.structure),
    steps: explain(result).filter((s) => sameIds || s.id !== 'numbering').map((s) => [s.id, s.text.map(plainText)]),
  };
}

/**
 * The whole explanation of a SMILES string as plain text.
 *
 * @param {string} smiles - The molecule.
 * @returns {string} Every step's text, joined.
 */
function explanation(smiles) {
  return explain(named(smiles)).map((s) => s.text.map(plainText).join(' ')).join(' ');
}

/** Label of the retained names IUPAC 2013 accepts for general nomenclature. */
const ACCEPTED = 'nombre tradicional, que la IUPAC (2013) acepta';

/** Expected names and every alternative (style, name), in order: the list is complete, so absent ones are asserted too. */
const CASES = [
  ['CC(=O)C1=CC=C(C)C=C1', '1-(4-metilfenil)etan-1-ona', []],
  ['OCCC1=CC=C(Cl)C=C1', '2-(4-clorofenil)etan-1-ol', []],
  ['OC(=O)CC1=CC(C)=CC=C1', 'ácido 2-(3-metilfenil)etanoico', [['traditional', 'ácido 2-(3-metilfenil)acético']]],
  ['OCCOC1=CC=C(C)C=C1', '2-(4-metilfenoxi)etan-1-ol', []],
  ['CC(=O)NC1=CC=C(C)C=C1', 'N-(4-metilfenil)etanamida', [['traditional', 'N-(4-metilfenil)acetamida']]],
  ['CC(O)C1=C(C)C=C(C)C=C1', '1-(2,4-dimetilfenil)etan-1-ol', []],
  ['OCC1=CC=C(Cl)C=C1C', '(4-cloro-2-metilfenil)metanol', []],
  ['NCC1=CC=C(Cl)C=C1', '(4-clorofenil)metanamina', []],
  ['OC(=O)COC1=CC=C(Cl)C=C1', 'ácido 2-(4-clorofenoxi)etanoico', []],
  ['OCCC1=C(C)C=CC=C1Cl', '2-(2-cloro-6-metilfenil)etan-1-ol', []],
  ['OCCC1=CC(C)=CC(Br)=C1', '2-(3-bromo-5-metilfenil)etan-1-ol', []],
  ['OCC(C)C1=CC=C(Cl)C(C)=C1', '2-(4-cloro-3-metilfenil)propan-1-ol', []],
  ['OCCNC1=CC=C(C)C=C1', '2-[(4-metilfenil)amino]etan-1-ol', []],
  ['OC(C1=CC=C(Cl)C=C1)CCl', '2-cloro-1-(4-clorofenil)etan-1-ol', []],
  ['OCC(C)(C)C1=CC=C(I)C=C1', '2-metil-2-(4-yodofenil)propan-1-ol', []],
  ['N#CCC1=CC=C(C)C=C1', '2-(4-metilfenil)etanonitrilo', [['traditional', '2-(4-metilfenil)acetonitrilo']]],
  ['NC(=O)CC1=CC=C(C)C=C1', '2-(4-metilfenil)etanamida', [['traditional', '2-(4-metilfenil)acetamida']]],
  ['O=CCC1=CC=C(C)C=C1', '2-(4-metilfenil)etanal', [['traditional', '2-(4-metilfenil)acetaldehído']]],
  ['OCCC1=CC=C(OC)C=C1', '2-(4-metoxifenil)etan-1-ol', []],
  ['OCCC1=CC=C(C(C)C)C=C1', '2-(4-isopropilfenil)etan-1-ol',
    [['pin', '2-[4-(propan-2-il)fenil]etan-1-ol'], ['substituted', '2-[4-(1-metiletil)fenil]etan-1-ol']]],
];

test('substituted phenyl and phenoxy prefixes are named, with exactly the expected alternatives', () => {
  for (const [smiles, name, alternatives] of CASES) {
    const mol = parseSmiles(smiles);
    assert.equal(validateForNaming(mol), null, smiles);
    assert.equal(substitutedPhenylOnly(mol), true, smiles);
    const result = named(smiles);
    assert.equal(result.name, name, smiles);
    assert.deepEqual(result.alternatives.map((a) => [a.style, a.name]), alternatives, smiles);
    assert.equal(result.structure.parentKind, 'chain', smiles);
    for (const alt of result.alternatives.filter((a) => a.style === 'traditional')) {
      assert.equal(alt.label, alt.name.includes('acetamida') && alt.name.startsWith('N-')
        ? 'nombre tradicional, que la IUPAC (2013) conserva como preferido' : ACCEPTED, smiles);
    }
    // Never a name that hides the phenyl's own prefixes; the substituted phenyl is always enclosed.
    for (const text of [result.name, ...result.alternatives.map((a) => a.name)]) {
      assert.doesNotMatch(text, /acetofenona|bencílico|bencilamina|fenilacét|fenilacetaldehído|fenilacetonitrilo/, smiles);
      assert.match(text, /[([]\S*fen(il|oxi)[)\]]/, `${smiles}: an enclosed fenil/fenoxi`);
    }
  } // End of the loop over the cases
});

test('the unsubstituted phenyl keeps its names and traditional aliases (no change from I-40a…I-40d)', () => {
  const unchanged = [
    ['CC(=O)C1=CC=CC=C1', '1-feniletan-1-ona', 'acetofenona'],
    ['OC(=O)CC1=CC=CC=C1', 'ácido 2-feniletanoico', 'ácido fenilacético'],
    ['CC(=O)NC1=CC=CC=C1', 'N-feniletanamida', 'N-fenilacetamida'],
    ['OCC1=CC=CC=C1', 'fenilmetanol', 'alcohol bencílico'],
    ['NCC1=CC=CC=C1', 'fenilmetanamina', 'bencilamina'],
    ['OCCOC1=CC=CC=C1', '2-fenoxietan-1-ol', null],
  ];
  for (const [smiles, name, traditional] of unchanged) {
    const result = named(smiles);
    assert.equal(result.name, name, smiles);
    assert.deepEqual(result.alternatives.filter((a) => a.style === 'traditional').map((a) => a.name), traditional ? [traditional] : []);
    assert.equal(substitutedPhenylOnly(parseSmiles(smiles)), false, smiles);
  }
});

test('the substituted phenyl is a compound prefix: enclosed, bis-multiplied, sorted under its first letter', () => {
  const result = named('OCCC1=CC=C(Cl)C=C1');
  const phenyl = result.structure.prefixes.find((g) => g.substituent.retained === 'phenyl').substituent;
  assert.equal(isSubstitutedPhenyl(phenyl), true);
  assert.equal(needsEnclosure(phenyl), true);
  assert.equal(isCompoundPrefix(phenyl), true);
  assert.deepEqual(phenyl.prefixes.map((g) => g.locants.map((s) => s.locant)), [[4]]);
  const bare = named('OCCC1=CC=CC=C1').structure.prefixes[0].substituent;
  assert.equal(isSubstitutedPhenyl(bare), false);
  assert.equal(needsEnclosure(bare), false);
  assert.equal(named('OCCC1=CC=CC=C1').name, '2-feniletan-1-ol');
  // English rendering (oracle) follows the same structure.
  assert.equal(englishName(result.structure), '2-(4-chlorophenyl)ethan-1-ol');
  assert.equal(englishName(named('OCCOC1=CC=C(C)C=C1').structure), '2-(4-methylphenoxy)ethan-1-ol');
});

test('both Kekulé drawings and atom-id scrambles give the same name, alternatives and explanation', () => {
  const random = seededRandom(45);
  for (const [smiles] of CASES) {
    assert.deepEqual(summary(named(kekuleSwap(smiles))), summary(named(smiles)), `${smiles}: Kekulé swap`);
    const reference = summary(named(smiles), false);
    for (const mol of [parseSmiles(smiles), kekuleSwap(smiles)]) {
      for (let k = 0; k < 3; k += 1) {
        assert.deepEqual(summary(named(scrambleMolecule(mol, random)), false), reference, `${smiles}: scrambled ids`);
      }
    }
  } // End of the loop over the cases
});

test('the explanation describes the phenyl numbering and prefixes, never as a lone substituent', () => {
  const ketone = explanation('CC(=O)C1=CC=C(C)C=C1');
  assert.match(ketone, /«4-metilfenil» es un anillo de benceno unido a la cadena principal por uno de sus carbonos/);
  assert.match(ketone, /Sus carbonos se numeran empezando por el que está unido a la cadena principal, que es el 1/);
  assert.match(ketone, /Los enlaces dobles del benceno no cuentan para numerar/);
  assert.match(ketone, /El anillo lleva «metil» en el carbono 4, delante de «fenil»/);
  assert.match(ketone, /Va entre paréntesis porque tiene sus propios sustituyentes y números/);
  assert.match(ketone, /«4-metilfenil» \(el benceno como sustituyente, con sus propios sustituyentes\)/);
  assert.doesNotMatch(ketone, /un solo sustituyente|acetofenona|C₆H₅–, el benceno/);
  const alphabetical = explanation('OCCC1=C(C)C=CC=C1Cl');
  assert.match(alphabetical, /como los dos sentidos dan los mismos números, el número más bajo es para el sustituyente que va antes por orden alfabético/);
  assert.match(alphabetical, /«cloro» en el carbono 2 y «metil» en el carbono 6, que se escriben en orden alfabético/);
  assert.match(alphabetical, /«2-cloro-6-metilfenil» va por la «c»/);
  assert.doesNotMatch(explanation('OCC(C)C1=CC=C(Cl)C(C)=C1'), /los dos sentidos dan los mismos números/);
  const ether = explanation('OCCOC1=CC=C(C)C=C1');
  assert.match(ether, /«4-metilfenoxi» viene de «4-metilfenil» \(el benceno como sustituyente, con sus propios sustituyentes\)/);
  assert.match(ether, /Sus carbonos se numeran empezando por el que está unido al oxígeno, que es el 1/);
  const amide = explanation('CC(=O)NC1=CC=C(C)C=C1');
  assert.match(amide, /«4-metilfenil» es un anillo de benceno unido al nitrógeno/);
  assert.match(amide, /«N-\(4-metilfenil\)acetamida»/);
  const acid = explanation('OC(=O)CC1=CC(C)=CC=C1');
  assert.match(acid, /«ácido 2-\(3-metilfenil\)acético»: nombre tradicional, que la IUPAC \(2013\) acepta/);
});

test('out-of-scope molecules stay refused with accurate messages', () => {
  // Two substituted rings: several rings, RING_SYSTEM (bis(4-clorofenil)metanol).
  for (const smiles of ['ClC1=CC=C(C=C1)C(O)C1=CC=C(Cl)C=C1', 'OC(C1=CC=C(C)C=C1)C1CC1']) {
    const result = nameMolecule(parseSmiles(smiles));
    assert.equal(`${result.error.code} ${result.error.ringKind}`, 'RING_SYSTEM several', smiles);
  }
  // A substituted benzoyl prefix is named since I-45b (tests/unit/substituted-benzoyl.test.js).
  assert.equal(named('OC(=O)C(CC)C(=O)C1=CC=C(C)C=C1').name, 'ácido 2-(4-metilbenzoil)butanoico');
  assert.equal(named('OC(=O)CNC(=O)C1=CC=C(C)C=C1').name, 'ácido 2-[(4-metilbenzoil)amino]etanoico');
  assert.equal(named('OC(=O)C(CC)C(=O)C1=CC=CC=C1').name, 'ácido 2-benzoilbutanoico', 'an unsubstituted benzoyl is still named');
  // Esters with a substituted ring are named since I-45c (tests/unit/substituted-esters.test.js); beside another
  // functional group of the ring they stay refused, the ring-split ones included.
  for (const smiles of ['CC(=O)OC1=CC=C(O)C=C1', 'CCOC(=O)C1=CC=C(CO)C=C1', 'OC1=CC=C(C=C1)C(=O)OC1=CC=CC=C1',
    'O=C(OC1=CC=C(N)C=C1)C1=CC=CC=C1', 'OC(=O)CCC(=O)OC1=CC=C(O)C=C1', 'COC(=O)CC1=CC=C(CO)C=C1']) {
    const result = nameMolecule(parseSmiles(smiles));
    assert.equal(`${result.error.code} ${result.error.ringReason}`, 'CYCLE polysubstitutedBenzene', smiles);
    assert.equal(result.error.message, SUBSTITUTED_BENZENE_ESTER_MESSAGE, smiles);
  }
  // A junior group on the ring beside the functional branch, or groups on two branches.
  for (const [smiles, count] of [['OC(=O)CC1=CC=C(O)C=C1', 2], ['OCCC1=CC=C(CCO)C=C1', 2], ['CC(=O)C1=CC(O)=CC(O)=C1', 3]]) {
    const mol = parseSmiles(smiles);
    const result = nameMolecule(mol);
    assert.equal(`${result.error.code} ${result.error.ringReason}`, 'CYCLE polysubstitutedBenzene', smiles);
    assert.equal(result.error.message, polysubstitutedBenzeneMessage(count), smiles);
    assert.match(result.error.message, /como sustituyente \(fenil, fenoxi o benzoil\)/);
    assert.equal(substitutedPhenylOnly(mol), false, smiles);
  }
  // The safety net for a ring that wins the parent choice after all: the polysubstituted-benzene message.
  const error = phenylParentError(parseSmiles('OCCC1=CC=C(Cl)C=C1'));
  assert.equal(`${error.code} ${error.ringReason}`, 'CYCLE polysubstitutedBenzene');
  assert.equal(error.message, polysubstitutedBenzeneMessage(2));
});

test('the oracle generator draws substituted phenyl prefixes on a chain parent, deterministically', () => {
  const molecules = generateSubstitutedPhenyls({ count: 40, seed: 3 });
  assert.equal(molecules.length, 40);
  assert.deepEqual(generateSubstitutedPhenyls({ count: 40, seed: 3 }).map(writeSmiles), molecules.map(writeSmiles), 'deterministic');
  for (const mol of molecules) {
    assert.equal(validateForNaming(mol), null);
    const result = named(mol);
    assert.equal(result.structure.parentKind, 'chain');
    assert.match(result.name, /fen(il|oxi)/);
  }
});
