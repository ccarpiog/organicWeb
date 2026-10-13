/**
 * @file Unit tests for phase I-45b, substituted benzoyl prefixes (design.md
 * §14; src/naming/render.js needsEnclosure() / ringCarbonylTokens(),
 * src/explain/explain.js ringCarbonylDescription() /
 * benzeneOwnPrefixSentences(), scripts/oracle/generate.mjs
 * generateSubstitutedBenzoyls()): the names (`ácido
 * 2-(4-metilbenzoil)butanoico`, `3-(4-metilbenzoil)pentano-2,4-diona`,
 * `ácido 2-[(4-clorobenzoil)amino]etanoico`…), the alternatives present
 * and absent (no `toluoil`, no o/m/p forms), Kekulé and atom-id
 * invariance, the explanation of the benzoyl's own numbering, the
 * refusals that stay (two rings, an ester, a junior group on the ring) and
 * the oracle generator.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import {
  validateForNaming, SUBSTITUTED_BENZENE_ESTER_MESSAGE, polysubstitutedBenzeneMessage,
} from '../../src/model/validate.js';
import { perceiveRings } from '../../src/model/rings.js';
import { nameMolecule } from '../../src/naming/index.js';
import {
  isSubstitutedPhenyl, isCompoundPrefix, needsEnclosure, ringCarbonylRing,
} from '../../src/naming/render.js';
import { explain, plainText } from '../../src/explain/explain.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateSubstitutedBenzoyls } from '../../scripts/oracle/generate.mjs';

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
 * alternatives, the English name and the explanation texts (with scrambled
 * atom ids the chain numbering step may list its options in the other
 * order, as for any chain parent, so it is left out then).
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

/** Expected names, English names and every alternative (style, name), in order: the list is complete, so absent ones are asserted too. */
const CASES = [
  ['OC(=O)C(CC)C(=O)C1=CC=C(C)C=C1', 'ácido 2-(4-metilbenzoil)butanoico', '2-(4-methylbenzoyl)butanoic acid', []],
  ['OC(=O)C(CC)C(=O)C1=CC(C)=CC=C1', 'ácido 2-(3-metilbenzoil)butanoico', '2-(3-methylbenzoyl)butanoic acid', []],
  ['OC(=O)C(CC)C(=O)C1=CC=CC=C1C', 'ácido 2-(2-metilbenzoil)butanoico', '2-(2-methylbenzoyl)butanoic acid', []],
  ['OC(=O)C(CC)C(=O)C1=C(C)C=CC=C1Cl', 'ácido 2-(2-cloro-6-metilbenzoil)butanoico', '2-(2-chloro-6-methylbenzoyl)butanoic acid', []],
  ['OC(=O)C(CC)C(=O)C1=CC=C(Cl)C=C1Cl', 'ácido 2-(2,4-diclorobenzoil)butanoico', '2-(2,4-dichlorobenzoyl)butanoic acid', []],
  ['OC(=O)C(CC)C(=O)C1=CC=C(OC)C=C1', 'ácido 2-(4-metoxibenzoil)butanoico', '2-(4-methoxybenzoyl)butanoic acid', []],
  ['OC(=O)C(CC)C(=O)C1=C(C)C=C(C)C=C1C', 'ácido 2-(2,4,6-trimetilbenzoil)butanoico', '2-(2,4,6-trimethylbenzoyl)butanoic acid', []],
  ['OC(=O)C(CC(C)C)C(=O)C1=CC=C(C)C=C1', 'ácido 4-metil-2-(4-metilbenzoil)pentanoico', '4-methyl-2-(4-methylbenzoyl)pentanoic acid', []],
  ['OC(=O)C(CC(C)C)C(=O)C1=CC=C(Cl)C=C1', 'ácido 2-(4-clorobenzoil)-4-metilpentanoico', '2-(4-chlorobenzoyl)-4-methylpentanoic acid', []],
  ['CC(=O)C(C(=O)C1=CC=C(C)C=C1)C(C)=O', '3-(4-metilbenzoil)pentano-2,4-diona', '3-(4-methylbenzoyl)pentane-2,4-dione', []],
  ['OC(=O)CNC(=O)C1=CC=C(Cl)C=C1', 'ácido 2-[(4-clorobenzoil)amino]etanoico', '2-[(4-chlorobenzoyl)amino]ethanoic acid', []],
  ['OC(=O)CNC(=O)C1=CC=C(C)C=C1C', 'ácido 2-[(2,4-dimetilbenzoil)amino]etanoico', '2-[(2,4-dimethylbenzoyl)amino]ethanoic acid', []],
  ['N#CC(CC)C(=O)C1=CC=C(C)C=C1', '2-(4-metilbenzoil)butanonitrilo', '2-(4-methylbenzoyl)butanenitrile', []],
  ['NC(=O)C(CC)C(=O)C1=CC=C(Br)C=C1', '2-(4-bromobenzoil)butanamida', '2-(4-bromobenzoyl)butanamide', []],
  ['O=CC(CC)C(=O)C1=CC=C(I)C=C1', '2-(4-yodobenzoil)butanal', '2-(4-iodobenzoyl)butanal', []],
  ['OC(=O)C(CC)C(=O)C1=CC=C(C(C)C)C=C1', 'ácido 2-(4-isopropilbenzoil)butanoico', '2-(4-isopropylbenzoyl)butanoic acid',
    [['pin', 'ácido 2-[4-(propan-2-il)benzoil]butanoico'], ['substituted', 'ácido 2-[4-(1-metiletil)benzoil]butanoico']]],
];

test('substituted benzoyl prefixes are named, with exactly the expected alternatives', () => {
  for (const [smiles, name, english, alternatives] of CASES) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
    const result = named(smiles);
    assert.equal(result.name, name, smiles);
    assert.equal(englishName(result.structure), english, smiles);
    assert.deepEqual(result.alternatives.map((a) => [a.style, a.name]), alternatives, smiles);
    assert.equal(result.structure.parentKind, 'chain', smiles);
    // Never a name that hides the ring's own prefixes; never `toluoil`, `anisoil` or an o/m/p form.
    for (const text of [result.name, ...result.alternatives.map((a) => a.name)]) {
      assert.match(text, /[([]\S*benzoil[)\]]/, `${smiles}: an enclosed benzoil`);
      assert.doesNotMatch(text, /toluoil|anisoil|toluil|(^|[^a-z])[omp]-/, smiles);
    }
  } // End of the loop over the cases
});

test('the unsubstituted benzoyl keeps its names (no change from I-40b / I-40c)', () => {
  const unchanged = [
    ['OC(=O)C(CC)C(=O)C1=CC=CC=C1', 'ácido 2-benzoilbutanoico'],
    ['OC(=O)C(CC(C)C)C(=O)C1=CC=CC=C1', 'ácido 2-benzoil-4-metilpentanoico'],
    ['CC(=O)C(C(=O)C1=CC=CC=C1)C(C)=O', '3-benzoilpentano-2,4-diona'],
    ['OC(=O)CNC(=O)C1=CC=CC=C1', 'ácido 2-(benzoilamino)etanoico'],
  ];
  for (const [smiles, name] of unchanged) {
    const result = named(smiles);
    assert.equal(result.name, name, smiles);
    assert.deepEqual(result.alternatives, [], smiles);
  }
});

test('when the chain reaches the C=O, the ring stays a substituted phenyl with an oxo (design §13.6)', () => {
  assert.equal(named('OC(=O)CC(=O)C1=CC=C(C)C=C1').name, 'ácido 3-(4-metilfenil)-3-oxopropanoico');
  assert.equal(named('OC(=O)C(C)C(=O)C1=CC=C(C)C=C1').name, 'ácido 2-metil-3-(4-metilfenil)-3-oxopropanoico');
});

test('the substituted benzoyl is a compound prefix: enclosed, numbered from the ring atom on the C=O, sorted under its first letter', () => {
  const result = named('OC(=O)C(CC)C(=O)C1=CC=C(Cl)C=C1');
  const benzoyl = result.structure.prefixes.find((g) => g.substituent.ringCarbonyl).substituent;
  const ring = ringCarbonylRing(benzoyl);
  assert.equal(isSubstitutedPhenyl(ring), true);
  assert.equal(needsEnclosure(benzoyl), true);
  assert.equal(isCompoundPrefix(benzoyl), true);
  assert.deepEqual(ring.prefixes.map((g) => g.locants.map((s) => s.locant)), [[4]]);
  const bare = named('OC(=O)C(CC)C(=O)C1=CC=CC=C1').structure.prefixes.find((g) => g.substituent.ringCarbonyl).substituent;
  assert.equal(needsEnclosure(bare), false);
  assert.equal(isCompoundPrefix(bare), false);
  // Alphabetical order by the whole prefix: `clorobenzoil` (c) before `metil` (m), `metil` before `metilbenzoil`.
  assert.equal(named('OC(=O)C(CC(C)C)C(=O)C1=CC=C(Cl)C=C1').name, 'ácido 2-(4-clorobenzoil)-4-metilpentanoico');
  assert.equal(named('OC(=O)C(CC(C)C)C(=O)C1=CC=C(C)C=C1').name, 'ácido 4-metil-2-(4-metilbenzoil)pentanoico');
});

test('both Kekulé drawings and atom-id scrambles give the same name, alternatives and explanation', () => {
  const random = seededRandom(451);
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

test('the explanation describes the benzoyl ring numbering and prefixes', () => {
  const acid = explanation('OC(=O)C(CC)C(=O)C1=CC=C(C)C=C1');
  assert.match(acid, /Con el benceno se llama «benzoil»: sale del nombre del ácido, «ácido benzoico»/);
  assert.match(acid, /Sus carbonos se numeran empezando por el que está unido al C=O, que es el 1/);
  assert.match(acid, /Los enlaces dobles del benceno no cuentan para numerar/);
  assert.match(acid, /El anillo lleva «metil» en el carbono 4, delante de «benzoil»/);
  assert.match(acid, /Va entre paréntesis porque tiene sus propios sustituyentes y números\. En el orden alfabético del nombre completo cuenta su primera letra: «4-metilbenzoil» va por la «m»/);
  assert.match(acid, /se nombra «4-metilbenzoil» \(el benceno con sus propios sustituyentes, junto con el C=O unido a él\)/);
  assert.doesNotMatch(acid, /«4-metilfenil»|un solo sustituyente/);
  const tie = explanation('OC(=O)C(CC)C(=O)C1=C(C)C=CC=C1Cl');
  assert.match(tie, /como los dos sentidos dan los mismos números, el número más bajo es para el sustituyente que va antes por orden alfabético/);
  assert.match(tie, /«cloro» en el carbono 2 y «metil» en el carbono 6, que se escriben en orden alfabético, delante de «benzoil»/);
  assert.doesNotMatch(explanation('OC(=O)C(CC)C(=O)C1=CC=C(Cl)C=C1Cl'), /los dos sentidos dan los mismos números/);
  // Inside an `acilamino` prefix: the benzoyl's own description, never «formil».
  const amide = explanation('OC(=O)CNC(=O)C1=CC=C(Cl)C=C1');
  assert.match(amide, /que empieza un grupo acilo, «4-clorobenzoil»/);
  assert.match(amide, /El anillo lleva «cloro» en el carbono 4, delante de «benzoil»/);
  assert.match(amide, /En el nombre va entre corchetes \[ \]/);
  assert.doesNotMatch(amide, /se llama «formil»/);
  assert.doesNotMatch(explanation('OC(=O)CNC(=O)C1=CC=CC=C1'), /se llama «formil»/);
  // The marks follow the real nesting depth (render.js enclosureLevel()).
  const nested = explanation('OC(=O)CNC(=O)C1=CC=C(CC(C)C)C=C1');
  assert.match(nested, /Va entre corchetes \[ \] porque tiene sus propios sustituyentes y números, y ya lleva paréntesis dentro/);
  assert.match(nested, /En el nombre va entre llaves \{ \}, porque es un prefijo compuesto y ya lleva corchetes y paréntesis dentro/);
  assert.doesNotMatch(nested, /Va entre paréntesis|va entre corchetes \[ \], porque/);
  assert.match(explanation('OC(=O)C(CC)C(=O)C1=CC=C(CC(C)C)C=C1'), /Va entre corchetes \[ \] porque tiene sus propios sustituyentes y números/);
  assert.match(explanation('OCCC1=CC=C(CC(C)C)C=C1'), /Va entre corchetes \[ \] porque tiene sus propios sustituyentes y números/);
  assert.match(explanation('OC(=O)CNC(=O)C1=CC=CC=C1'), /En el nombre va entre paréntesis, porque es un prefijo compuesto: un grupo más «amino»/);
});

test('out-of-scope molecules stay refused with accurate messages', () => {
  // Two rings (a benzoyl and another benzoyl or phenyl): RING_SYSTEM several.
  for (const smiles of ['OC(=O)C(C(=O)C1=CC=C(C)C=C1)C(=O)C1=CC=CC=C1', 'OC(=O)C(C(=O)C1=CC=C(C)C=C1)C(=O)C1=CC=C(C)C=C1']) {
    const result = nameMolecule(parseSmiles(smiles));
    assert.equal(`${result.error.code} ${result.error.ringKind}`, 'RING_SYSTEM several', smiles);
  }
  // An ester in the molecule (I-45c).
  const ester = nameMolecule(parseSmiles('CCOC(=O)C(CC)C(=O)C1=CC=C(C)C=C1'));
  assert.equal(`${ester.error.code} ${ester.error.ringReason}`, 'CYCLE polysubstitutedBenzene');
  assert.equal(ester.error.message, SUBSTITUTED_BENZENE_ESTER_MESSAGE);
  // A functional group on the benzoyl's ring or on another of its branches.
  for (const smiles of ['OC(=O)C(CC)C(=O)C1=CC=C(O)C=C1', 'OC(=O)C(CC)C(=O)C1=CC=C(C(=O)O)C=C1', 'OC(=O)C(CC)C(=O)C1=CC=C(CO)C=C1']) {
    const result = nameMolecule(parseSmiles(smiles));
    assert.equal(`${result.error.code} ${result.error.ringReason}`, 'CYCLE polysubstitutedBenzene', smiles);
    assert.equal(result.error.message, polysubstitutedBenzeneMessage(2), smiles);
    assert.match(result.error.message, /como sustituyente \(fenil, fenoxi o benzoil\)/);
    assert.match(result.error.message, /el ácido 2-\(4-metilbenzoil\)butanoico/);
  }
});

test('the oracle generator draws substituted benzoyl prefixes on a chain parent, deterministically', () => {
  const molecules = generateSubstitutedBenzoyls({ count: 30, seed: 3 });
  assert.equal(molecules.length, 30);
  assert.deepEqual(generateSubstitutedBenzoyls({ count: 30, seed: 3 }).map(writeSmiles), molecules.map(writeSmiles), 'deterministic');
  for (const mol of molecules) {
    assert.equal(validateForNaming(mol), null);
    const result = named(mol);
    assert.equal(result.structure.parentKind, 'chain');
    assert.match(result.name, /\S+benzoil[)\]]/);
  }
});
