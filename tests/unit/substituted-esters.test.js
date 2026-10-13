/**
 * @file Unit tests for phase I-45c, esters with substituted benzene rings
 * (design.md §14; src/model/validate.js polysubstitutedBenzeneScope()
 * 'benzoate' / 'phenyl', SUBSTITUTED_BENZENE_ESTER_MESSAGE;
 * src/naming/principal.js 'arylacetate'; src/explain/explain.js
 * esterGroupFormation(); scripts/oracle/generate.mjs
 * generateSubstitutedEsters()): the names (`4-metilbenzoato de etilo`,
 * `etanoato de 4-metilfenilo` with `acetato de 4-metilfenilo`, `benzoato de
 * 4-clorofenilo`, the two-ring `4-metilbenzoato de 4-clorofenilo`…), the
 * alternatives present and absent (no `toluato`, no `tolilo`, the o/m/p form
 * only for a benzoate with one prefix), Kekulé and atom-id invariance, the
 * explanation of both parts, Ordenar dibujo, the refusals that stay (another
 * functional group on the ring) and the oracle generator.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { canonicalKey } from '../../src/model/graph.js';
import { validateForNaming, SUBSTITUTED_BENZENE_ESTER_MESSAGE, substitutedPhenylOnly } from '../../src/model/validate.js';
import { perceiveRings } from '../../src/model/rings.js';
import { nameMolecule } from '../../src/naming/index.js';
import { canArrange } from '../../src/ui/results.js';
import { explain, plainText } from '../../src/explain/explain.js';
import { canonicalLayout, layoutProblems } from '../../src/layout/canonical.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateSubstitutedEsters } from '../../scripts/oracle/generate.mjs';

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
 * The other Kekulé drawing of a molecule: every bond of every benzene ring
 * swapped (1 ↔ 2), so both rings of a split ester change at once.
 *
 * @param {string} smiles - The molecule.
 * @returns {object} The molecule with the double bonds on the other three sides of each ring.
 */
function kekuleSwap(smiles) {
  const mol = parseSmiles(smiles);
  for (const ring of perceiveRings(mol).rings) {
    const orders = ring.bonds.map((id) => mol.bonds.get(id).order);
    if (ring.atoms.length === 6 && orders.every((order) => order === 1 || order === 2) && orders.includes(2)) {
      for (const id of ring.bonds) {
        const bond = mol.bonds.get(id);
        bond.order = 3 - bond.order;
      }
    }
  } // End of the loop over the rings
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
  ['CCOC(=O)C1=CC=C(C)C=C1', '4-metilbenzoato de etilo', 'ethyl 4-methylbenzoate',
    [['benzeneSystematic', '4-metilbenceno-1-carboxilato de etilo'], ['positional', 'p-metilbenzoato de etilo']]],
  ['CC(=O)OC1=CC=C(C)C=C1', 'etanoato de 4-metilfenilo', '4-methylphenyl ethanoate', [['traditional', 'acetato de 4-metilfenilo']]],
  ['O=C(OC1=CC=C(Cl)C=C1)C1=CC=CC=C1', 'benzoato de 4-clorofenilo', '4-chlorophenyl benzoate',
    [['benzeneSystematic', 'bencenocarboxilato de 4-clorofenilo']]],
  ['CC1=CC=C(C=C1)C(=O)OC1=CC=C(Cl)C=C1', '4-metilbenzoato de 4-clorofenilo', '4-chlorophenyl 4-methylbenzoate',
    [['benzeneSystematic', '4-metilbenceno-1-carboxilato de 4-clorofenilo'], ['positional', 'p-metilbenzoato de 4-clorofenilo']]],
  ['O=C(OC1=CC=C(C)C=C1)C1=CC=CC=C1', 'benzoato de 4-metilfenilo', '4-methylphenyl benzoate',
    [['benzeneSystematic', 'bencenocarboxilato de 4-metilfenilo']]],
  ['CC1=CC=C(C=C1)C(=O)OC1=CC=CC=C1', '4-metilbenzoato de fenilo', 'phenyl 4-methylbenzoate',
    [['benzeneSystematic', '4-metilbenceno-1-carboxilato de fenilo'], ['positional', 'p-metilbenzoato de fenilo']]],
  ['CC(=O)OC1=CC=C(Cl)C=C1Cl', 'etanoato de 2,4-diclorofenilo', '2,4-dichlorophenyl ethanoate', [['traditional', 'acetato de 2,4-diclorofenilo']]],
  ['CC(=O)OC1=CC=C(Cl)C=C1C', 'etanoato de 4-cloro-2-metilfenilo', '4-chloro-2-methylphenyl ethanoate',
    [['traditional', 'acetato de 4-cloro-2-metilfenilo']]],
  ['CC(=O)OC1=C(C)C=CC=C1Cl', 'etanoato de 2-cloro-6-metilfenilo', '2-chloro-6-methylphenyl ethanoate',
    [['traditional', 'acetato de 2-cloro-6-metilfenilo']]],
  ['CCOC(=O)C1=C(C)C=CC=C1Cl', '2-cloro-6-metilbenzoato de etilo', 'ethyl 2-chloro-6-methylbenzoate',
    [['benzeneSystematic', '2-cloro-6-metilbenceno-1-carboxilato de etilo']]],
  ['CCOC(=O)C1=CC(C)=CC=C1', '3-metilbenzoato de etilo', 'ethyl 3-methylbenzoate',
    [['benzeneSystematic', '3-metilbenceno-1-carboxilato de etilo'], ['positional', 'm-metilbenzoato de etilo']]],
  ['COC(=O)C1=CC=C(OC)C=C1', '4-metoxibenzoato de metilo', 'methyl 4-methoxybenzoate',
    [['benzeneSystematic', '4-metoxibenceno-1-carboxilato de metilo'], ['positional', 'p-metoxibenzoato de metilo']]],
  ['CCOC(=O)C1=CC=C(I)C=C1Br', '2-bromo-4-yodobenzoato de etilo', 'ethyl 2-bromo-4-iodobenzoate',
    [['benzeneSystematic', '2-bromo-4-yodobenceno-1-carboxilato de etilo']]],
  ['CC(C)OC(=O)C1=CC=C(C(C)C)C=C1', '4-isopropilbenzoato de isopropilo', 'isopropyl 4-isopropylbenzoate', [
    ['pin', '4-(propan-2-il)benzoato de propan-2-ilo'], ['substituted', '4-(1-metiletil)benzoato de 1-metiletilo'],
    ['benzeneSystematic', '4-isopropilbenceno-1-carboxilato de isopropilo'], ['positional', 'p-isopropilbenzoato de isopropilo']]],
  ['CC(C)C1=CC=C(OC(C)=O)C=C1', 'etanoato de 4-isopropilfenilo', '4-isopropylphenyl ethanoate', [
    ['pin', 'etanoato de 4-(propan-2-il)fenilo'], ['substituted', 'etanoato de 4-(1-metiletil)fenilo'],
    ['traditional', 'acetato de 4-isopropilfenilo']]],
  ['CCOC(=O)CC1=CC=C(C)C=C1', '2-(4-metilfenil)etanoato de etilo', 'ethyl 2-(4-methylphenyl)ethanoate',
    [['traditional', '2-(4-metilfenil)acetato de etilo']]],
  ['CC(=O)OCCC1=CC=C(C)C=C1', 'etanoato de 2-(4-metilfenil)etilo', '2-(4-methylphenyl)ethyl ethanoate',
    [['traditional', 'acetato de 2-(4-metilfenil)etilo']]],
  ['CCOC(=O)COC1=CC=C(C)C=C1', '2-(4-metilfenoxi)etanoato de etilo', 'ethyl 2-(4-methylphenoxy)ethanoate', []],
  ['CCOC(=O)C(CC)C(=O)C1=CC=C(C)C=C1', '2-(4-metilbenzoil)butanoato de etilo', 'ethyl 2-(4-methylbenzoyl)butanoate', []],
  ['ClC1=CC=C(C=C1)C(=O)OC1CCC(C)CC1', '4-clorobenzoato de 4-metilciclohexilo', '4-methylcyclohexyl 4-chlorobenzoate',
    [['benzeneSystematic', '4-clorobenceno-1-carboxilato de 4-metilciclohexilo'], ['positional', 'p-clorobenzoato de 4-metilciclohexilo']]],
  ['CC1=CC(C)=CC(C)=C1C(=O)OC1=C(C)C=C(C)C=C1C', '2,4,6-trimetilbenzoato de 2,4,6-trimetilfenilo',
    '2,4,6-trimethylphenyl 2,4,6-trimethylbenzoate', [['benzeneSystematic', '2,4,6-trimetilbenceno-1-carboxilato de 2,4,6-trimetilfenilo']]],
  ['O=COC1=CC=C(C)C=C1', 'metanoato de 4-metilfenilo', '4-methylphenyl methanoate', [['traditional', 'formiato de 4-metilfenilo']]],
  ['OC(=O)CCC(=O)OC1=CC=C(C)C=C1', 'ácido 4-(4-metilfenoxi)-4-oxobutanoico', '4-(4-methylphenoxy)-4-oxobutanoic acid', []],
  ['OC(=O)CCOC(=O)C1=CC=C(C)C=C1', 'ácido 3-[(4-metilbenzoil)oxi]propanoico', '3-[(4-methylbenzoyl)oxy]propanoic acid', []],
];

test('esters with substituted benzene rings are named, with exactly the expected alternatives', () => {
  for (const [smiles, name, english, alternatives] of CASES) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
    const result = named(smiles);
    assert.equal(result.name, name, smiles);
    assert.equal(englishName(result.structure), english, smiles);
    assert.deepEqual(result.alternatives.map((a) => [a.style, a.name]), alternatives, smiles);
    // Never `toluato`, `tolilo`, `anisato` or `cresilo`; an o/m/p form never on the O-bound phenyl.
    for (const text of [result.name, ...result.alternatives.map((a) => a.name)]) {
      assert.doesNotMatch(text, /tolu|tolil|anis|cresil|de [omp]-/, smiles);
    }
  } // End of the loop over the cases
});

test('the target names of the phase, and their parent and suffix structure', () => {
  const benzoate = named('CCOC(=O)C1=CC=C(C)C=C1');
  assert.equal(benzoate.structure.parentKind, 'ring');
  assert.equal(benzoate.structure.parent.retained, 'benzene');
  assert.equal(benzoate.structure.suffix.kind, 'ester');
  assert.deepEqual(benzoate.structure.prefixes.map((g) => g.locants.map((s) => s.locant)), [[4]]);
  const aryl = named('CC(=O)OC1=CC=C(C)C=C1');
  assert.equal(aryl.structure.parentKind, 'chain');
  assert.equal(aryl.structure.ester.alkyl.retained, 'phenyl');
  assert.deepEqual(aryl.structure.ester.alkyl.prefixes.map((g) => g.locants.map((s) => s.locant)), [[4]]);
  assert.equal(aryl.alternatives.find((a) => a.style === 'traditional').name, 'acetato de 4-metilfenilo');
  assert.equal(named('O=C(OC1=CC=C(Cl)C=C1)C1=CC=CC=C1').name, 'benzoato de 4-clorofenilo');
  // A ring that is the parent of its ester is not a phenyl that must stay a prefix (index.js safety net).
  assert.equal(substitutedPhenylOnly(parseSmiles('CCOC(=O)C1=CC=C(C)C=C1')), false);
  assert.equal(substitutedPhenylOnly(parseSmiles('CC(=O)OC1=CC=C(C)C=C1')), true);
});

test('the unsubstituted ring esters keep their names (no change from I-40d)', () => {
  const unchanged = [
    ['COC(=O)C1=CC=CC=C1', 'benzoato de metilo', ['bencenocarboxilato de metilo']],
    ['CC(=O)OC1=CC=CC=C1', 'etanoato de fenilo', ['acetato de fenilo']],
    ['O=C(OC1=CC=CC=C1)C1=CC=CC=C1', 'benzoato de fenilo', ['bencenocarboxilato de fenilo']],
    ['COC(=O)CC1=CC=CC=C1', '2-feniletanoato de metilo', ['fenilacetato de metilo']],
  ];
  for (const [smiles, name, alternatives] of unchanged) {
    const result = named(smiles);
    assert.equal(result.name, name, smiles);
    assert.deepEqual(result.alternatives.map((a) => a.name), alternatives, smiles);
  }
});

test('both Kekulé drawings and atom-id scrambles give the same name, alternatives and explanation', () => {
  const random = seededRandom(453);
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

test('the explanation describes the substituted benzoate and the substituted O-bound phenyl', () => {
  const benzoate = explanation('CCOC(=O)C1=CC=C(C)C=C1');
  assert.match(benzoate, /La parte del ácido es el benceno, con el carbono del C=O, que está fuera del anillo\. Se nombra como el ácido del que viene, «ácido 4-metilbenzoico», cambiando «-oico» por «-oato»: «4-metilbenzoato»/);
  assert.match(benzoate, /el carbono del anillo unido al –COO– es siempre el 1/);
  assert.match(benzoate, /En la forma sistemática sí se escribe: «4-metilbenceno-1-carboxilato de etilo»/);
  assert.doesNotMatch(benzoate, /con un solo sustituyente/);
  const aryl = explanation('CC(=O)OC1=CC=C(Cl)C=C1C');
  assert.match(aryl, /«4-cloro-2-metilfenilo» es un anillo de benceno unido al oxígeno por uno de sus carbonos: el grupo «fenil» \(el benceno como sustituyente\) \+ «-o», que además lleva sus propios sustituyentes/);
  assert.match(aryl, /Sus carbonos se numeran empezando por el que está unido al oxígeno, que es el 1, y siguiendo el anillo en el sentido que da los números más bajos a sus sustituyentes\. Los enlaces dobles del benceno no cuentan para numerar/);
  assert.match(aryl, /El anillo lleva «cloro» en el carbono 4 y «metil» en el carbono 2, que se escriben en orden alfabético, delante de «fenilo»/);
  assert.match(aryl, /No va entre paréntesis: es una palabra suelta, la segunda del nombre/);
  const tie = explanation('CC(=O)OC1=C(C)C=CC=C1Cl');
  assert.match(tie, /como los dos sentidos dan los mismos números, el número más bajo es para el sustituyente que va antes por orden alfabético/);
  // Both rings of a split ester.
  const split = explanation('CC1=CC=C(C=C1)C(=O)OC1=CC=C(Cl)C=C1');
  assert.match(split, /«ácido 4-metilbenzoico», cambiando «-oico» por «-oato»: «4-metilbenzoato»/);
  assert.match(split, /«4-clorofenilo» es un anillo de benceno unido al oxígeno/);
  assert.match(split, /El anillo lleva «cloro» en el carbono 4, delante de «fenilo»/);
  // The plain phenyl keeps its I-40d sentence.
  assert.match(explanation('CC(=O)OC1=CC=CC=C1'), /«fenilo» es el benceno como grupo, unido al oxígeno por uno de sus carbonos: «fenil» \+ «-o»/);
  for (const [smiles] of CASES) {
    assert.doesNotMatch(explanation(smiles), /undefined|NaN|null|\[\[/, smiles);
  }
});

test('Ordenar dibujo lays out the substituted esters, two rings included', () => {
  for (const [smiles] of CASES) {
    const mol = parseSmiles(smiles);
    let i = 0;
    for (const atom of mol.atoms.values()) {
      atom.x = (i * 37) % 200;
      atom.y = (i * 53) % 170;
      i += 1;
    }
    const result = nameMolecule(mol);
    assert.equal(canArrange(result), true, smiles);
    const laid = canonicalLayout(mol, result);
    assert.equal(layoutProblems(laid).ok, true, smiles);
    assert.equal(laid.atoms.size, mol.atoms.size, smiles);
  } // End of the loop over the cases
});

test('an ester beside another functional group of a substituted benzene stays refused with an accurate message', () => {
  const refused = [
    'CC(=O)OC1=CC=C(O)C=C1', // an OH on the O-bound phenyl
    'CCOC(=O)C1=CC=C(N)C=C1', // an amine on the benzoate ring
    'CCOC(=O)C1=CC=C(C)C=C1C(C)=O', // a ketone on the benzoate ring
    'CCOC(=O)C1=CC=C(C(=O)OCC)C=C1', // a ring diester of benzene
    'CC(=O)OC1=CC=C(OC(C)=O)C=C1', // two esters bonded through their O
    'CCOC(=O)CCC1=CC=C(CCO)C=C1', // groups on two branches
    'OC1=CC=C(C=C1)C(=O)OC1=CC=C(C)C=C1', // an OH on the acid ring of a split ester
    'O=C(OC1=CC=C(N)C=C1)C1=CC=CC=C1', // an amine on the O-bound ring of a split ester
  ];
  for (const smiles of refused) {
    const result = nameMolecule(parseSmiles(smiles));
    assert.equal(`${result.error.code} ${result.error.ringReason}`, 'CYCLE polysubstitutedBenzene', smiles);
    assert.equal(result.error.message, SUBSTITUTED_BENZENE_ESTER_MESSAGE, smiles);
  }
  assert.match(SUBSTITUTED_BENZENE_ESTER_MESSAGE, /su benceno lleva, además del éster, otro grupo funcional/);
  assert.match(SUBSTITUTED_BENZENE_ESTER_MESSAGE, /4-metilbenzoato de etilo, el etanoato de 4-metilfenilo o el benzoato de 4-clorofenilo/);
  assert.doesNotMatch(SUBSTITUTED_BENZENE_ESTER_MESSAGE, /no lleva nada más/);
  // The other ester refusals are untouched.
  assert.equal(nameMolecule(parseSmiles('CCOC(=O)C1CCCCC1C(=O)OC')).error.reason, 'mixedDiester');
  assert.equal(nameMolecule(parseSmiles('COC(=O)CC1CCC(CC(=O)OC)CC1')).error.reason, 'symmetricRing');
  assert.equal(nameMolecule(parseSmiles('CC1CC(=O)OC1')).error.ringReason, 'lactone');
  assert.equal(nameMolecule(parseSmiles('CCOC(=O)CCOC(=O)C1=CC=C(C)C=C1')).error.reason, 'esterPrefix');
  // Three rings stay RING_SYSTEM.
  assert.equal(nameMolecule(parseSmiles('CC1=CC=C(C=C1)C(=O)OC1=CC=C(C2CC2)C=C1')).error.code, 'RING_SYSTEM');
});

test('the oracle generator draws esters with substituted benzene rings, deterministically', () => {
  const molecules = generateSubstitutedEsters({ count: 40, seed: 3 });
  assert.equal(molecules.length, 40);
  assert.deepEqual(generateSubstitutedEsters({ count: 40, seed: 3 }).map(writeSmiles), molecules.map(writeSmiles), 'deterministic');
  assert.equal(new Set(molecules.map(canonicalKey)).size, 40, 'distinct');
  const results = molecules.map((mol) => {
    assert.equal(validateForNaming(mol), null, writeSmiles(mol));
    return named(mol);
  });
  assert.ok(results.some((r) => /benzoato de/.test(r.name) && r.structure.prefixes.length > 0), 'some substituted benzoates');
  assert.ok(results.some((r) => /de \S*\d\S*fenilo$/.test(r.name)), 'some substituted phenyl O-bound groups');
  assert.ok(results.some((r) => /\d\S*benzoato de \S*fenilo$/.test(r.name)), 'some esters split between two rings');
});
