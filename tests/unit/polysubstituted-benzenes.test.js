/**
 * @file Unit tests for phase I-42a, benzene parents with two to six
 * detachable prefixes (design.md §14; src/naming/aromatic.js,
 * rings.js numberRing() `aromatic`, numbering.js runNumberingCascade()):
 * names and alternatives (present and absent), Kekulé-neutral numbering
 * (both drawings and atom-id scrambles give the same name, alternatives and
 * explanation), locant omission for complete substitution, the o/m/p alias
 * rule, the benzene numbering step of the explanation, and the refusals that
 * stay (a polysubstituted benzene with a functional group).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles } from '../../src/model/smiles.js';
import { validateForNaming } from '../../src/model/validate.js';
import { perceiveRings } from '../../src/model/rings.js';
import { nameMolecule } from '../../src/naming/index.js';
import { explain, plainText } from '../../src/explain/explain.js';
import { canArrange } from '../../src/ui/results.js';
import { projectRightAngles } from '../../src/ui/canvasbar.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom } from '../../scripts/oracle/generate.mjs';

/**
 * Names a SMILES string (optionally in another prefix style) and checks that it succeeded.
 *
 * @param {string|object} input - The molecule, as SMILES or as a molecule object.
 * @param {string} [prefixStyle] - Prefix style.
 * @returns {object} The naming result.
 */
function named(input, prefixStyle) {
  const mol = typeof input === 'string' ? parseSmiles(input) : input;
  const result = nameMolecule(mol, prefixStyle ? { prefixStyle } : {});
  assert.equal(result.ok, true, `${input}: ${JSON.stringify(result.error)}`);
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
 * alternatives, the English name and the explanation texts.
 *
 * @param {object} result - A naming result.
 * @returns {object} The comparable summary.
 */
function summary(result) {
  return {
    name: result.name,
    alternatives: result.alternatives.map((a) => [a.style, a.name, a.label]),
    english: englishName(result.structure),
    steps: explain(result).map((s) => [s.id, s.text.map(plainText)]),
  };
}

/** Label of the orto/meta/para form (design.md §14.4). */
const POSITIONAL = 'forma antigua con orto/meta/para; hoy se recomienda el número (1,2 / 1,3 / 1,4)';

/** Expected names and every alternative (style, name), in order: the list is complete, so absent ones are asserted too. */
const CASES = [
  ['CC1=CC=CC=C1C', '1,2-dimetilbenceno', [['traditional', '1,2-xileno'], ['traditional', 'o-xileno'], ['positional', 'o-dimetilbenceno']]],
  ['CC1=CC(C)=CC=C1', '1,3-dimetilbenceno', [['traditional', '1,3-xileno'], ['traditional', 'm-xileno'], ['positional', 'm-dimetilbenceno']]],
  ['CC1=CC=C(C)C=C1', '1,4-dimetilbenceno', [['traditional', '1,4-xileno'], ['traditional', 'p-xileno'], ['positional', 'p-dimetilbenceno']]],
  ['ClC1=CC(Br)=CC=C1', '1-bromo-3-clorobenceno', []],
  ['CCC1=CC(C)=C(C)C=C1', '4-etil-1,2-dimetilbenceno', []],
  ['CC1=CC(C)=CC(C)=C1', '1,3,5-trimetilbenceno', [['traditional', 'mesitileno']]],
  ['CC1=CC=CC(C)=C1C', '1,2,3-trimetilbenceno', []],
  ['ClC1=C(Cl)C(Cl)=C(Cl)C(Cl)=C1Cl', 'hexaclorobenceno', []],
  ['CC1=C(C)C(C)=C(C)C(C)=C1C', 'hexametilbenceno', []],
  ['CCC1=C(C)C(C)=C(C)C(C)=C1C', '1-etil-2,3,4,5,6-pentametilbenceno', []],
  ['COC1=CC=C(C)C=C1', '1-metil-4-metoxibenceno', []],
  ['CC1=CC=CC=C1I', '1-metil-2-yodobenceno', []],
  ['ClC1=CC=CC=C1Br', '1-bromo-2-clorobenceno', []],
  ['C=CC1=CC=C(C=C)C=C1', '1,4-dietenilbenceno', [['positional', 'p-dietenilbenceno']]],
  ['ClC1=CC=C(Cl)C=C1', '1,4-diclorobenceno', [['positional', 'p-diclorobenceno']]],
  ['CCC1=CC=CC(Cl)=C1', '1-cloro-3-etilbenceno', []],
  ['ClCC1=CC=C(C)C=C1', '1-(clorometil)-4-metilbenceno', []],
  ['CC(C)C1=CC=C(C)C=C1', '1-isopropil-4-metilbenceno',
    [['pin', '1-metil-4-(propan-2-il)benceno'], ['substituted', '1-metil-4-(1-metiletil)benceno']]],
  ['CC(C)C1=CC=CC=C1C(C)C', '1,2-diisopropilbenceno',
    [['pin', '1,2-di(propan-2-il)benceno'], ['substituted', '1,2-bis(1-metiletil)benceno'], ['positional', 'o-diisopropilbenceno']]],
];

test('benzenes with two to six prefixes are named, with exactly the expected alternatives', () => {
  for (const [smiles, name, alternatives] of CASES) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
    const result = named(smiles);
    assert.equal(result.name, name, smiles);
    assert.deepEqual(result.alternatives.map((a) => [a.style, a.name]), alternatives, smiles);
    // Never a substituted tolueno / xileno / anisol, never a positional name for different prefixes.
    for (const alt of result.alternatives) {
      assert.doesNotMatch(alt.name, /tolueno|anisol|estireno|cumeno/, smiles);
      assert.ok(alt.style !== 'positional' || alt.label === POSITIONAL, smiles);
      assert.doesNotMatch(alt.label, /desde 2013/, smiles);
    }
  }
}); // End of test 'benzenes with two to six prefixes are named, wi…'

test('the isopropyl prefix in its three styles: each style numbers on its own (alphabetical order differs)', () => {
  const smiles = 'CC(C)C1=CC=C(C)C=C1';
  assert.equal(named(smiles).name, '1-isopropil-4-metilbenceno');
  assert.equal(named(smiles, 'pin').name, '1-metil-4-(propan-2-il)benceno');
  assert.equal(named(smiles, 'substituted').name, '1-metil-4-(1-metiletil)benceno');
  assert.deepEqual(named(smiles, 'pin').alternatives.map((a) => a.style), ['isopropil', 'substituted']);
});

test('the traditional labels: xileno and mesitileno as accepted names, the o/m/p form with its own label', () => {
  const xylene = named('CC1=CC=C(C)C=C1');
  assert.deepEqual(xylene.alternatives.map((a) => a.label), [
    'nombre tradicional, que la IUPAC (2013) acepta',
    'nombre tradicional, que la IUPAC (2013) acepta',
    POSITIONAL,
  ]);
  // The positional form highlights the same atoms as the locants it replaces.
  const positional = xylene.alternatives[2];
  assert.deepEqual(positional.parts.map((p) => p.text), ['p', '-', 'di', 'metil', 'benceno']);
  const locantAtoms = xylene.parts.filter((p) => p.kind === 'locant').flatMap((p) => p.atoms);
  assert.deepEqual([...positional.parts[0].atoms].sort((a, b) => a - b), [...new Set(locantAtoms)].sort((a, b) => a - b));
  // Monosubstituted benzenes keep their outputs (tolueno, anisol; no positional form).
  assert.deepEqual(named('CC1=CC=CC=C1').alternatives.map((a) => [a.style, a.name]), [['traditional', 'tolueno']]);
  assert.deepEqual(named('COC1=CC=CC=C1').alternatives.map((a) => [a.style, a.name]), [['traditional', 'anisol']]);
  assert.deepEqual(named('ClC1=CC=CC=C1').alternatives, []);
}); // End of test 'the traditional labels: xileno and mesitileno a…'

test('Kekulé-neutral numbering: both drawings give the same name, alternatives and explanation', () => {
  for (const [smiles, name] of CASES) {
    const first = named(smiles);
    const second = named(kekuleSwap(smiles));
    assert.equal(second.name, name, `${smiles} (other Kekulé drawing)`);
    assert.deepEqual(summary(second), summary(first), smiles);
    // The real bond orders stay in the structure (highlighting): the two drawings put the double bonds apart.
    const doubles = (result) => result.structure.parent.double.map((site) => site.bond).sort((a, b) => a - b);
    assert.notDeepEqual(doubles(second), doubles(first), smiles);
    assert.equal(first.structure.parent.double.length, 3, smiles);
  }
  // The case Codex reproduced: o-xylene drawn with the substituted bond single gave 1,6- before I-42a.
  assert.equal(named('CC1C(C)=CC=CC=1').name, '1,2-dimetilbenceno');
}); // End of test 'Kekulé-neutral numbering: both drawings give th…'

test('names, alternatives and explanations are independent of atom ids, insertion order and coordinates', () => {
  const random = seededRandom(42);
  for (const [smiles] of CASES) {
    for (const mol of [parseSmiles(smiles), kekuleSwap(smiles)]) {
      const reference = summary(named(mol));
      for (let k = 0; k < 4; k += 1) {
        const copy = scrambleMolecule(mol, random);
        for (const atom of copy.atoms.values()) {
          atom.x = random() * 500;
          atom.y = random() * 500;
        }
        assert.deepEqual(summary(named(copy)), reference, `${smiles} scrambled`);
      }
    }
  }
}); // End of test 'names, alternatives and explanations are indepe…'

test('the numbering trace skips the Kekulé double bonds (no N1/N2) and keeps the prefix rules', () => {
  const rules = (smiles) => named(smiles).trace.map((step) => step.rule);
  assert.deepEqual(rules('ClC1=CC(Br)=CC=C1'), ['RING', 'N3', 'N4']);
  assert.ok(!rules('CC1=CC=CC=C1C').some((rule) => rule === 'N1' || rule === 'N2'));
  assert.deepEqual(rules('CC1=CC=CC=C1'), ['RING'], 'a single substituent: no numbering, as before');
  const hexa = named('CC1=C(C)C(C)=C(C)C(C)=C1C');
  assert.deepEqual(hexa.parts.map((p) => p.text), ['hexa', 'metil', 'benceno']);
});

test('the explanation numbers the benzene by its substituents, never by its double bonds', () => {
  const steps = (smiles) => explain(named(smiles));
  const textOf = (step) => step.text.map(plainText).join(' ');
  for (const [smiles] of CASES) {
    const all = steps(smiles);
    const ids = all.map((s) => s.id);
    assert.ok(ids.includes('ringNumbering'), smiles);
    assert.ok(ids.indexOf('benzene') < ids.indexOf('ringNumbering'), smiles);
    const numbering = all.find((s) => s.id === 'ringNumbering');
    assert.doesNotMatch(textOf(numbering), /enlace|doble/, smiles);
    assert.doesNotMatch(all.map(textOf).join(' '), /Con un solo sustituyente/, smiles);
  }
  const meta = steps('CCC1=CC=CC(Cl)=C1').find((s) => s.id === 'ringNumbering');
  assert.match(textOf(meta), /«cloro» y «etil» están en posición meta \(1,3\)/);
  assert.ok(Array.isArray(meta.locants) && meta.locants.length === 6, 'canvas locants');
  const ortho = steps('CC1=CC=CC=C1C').find((s) => s.id === 'ringNumbering');
  assert.match(textOf(ortho), /Los dos «metil» están en posición orto \(1,2\)/);
  // Three positions: no orto/meta/para sentence.
  assert.doesNotMatch(textOf(steps('CCC1=CC(C)=C(C)C=C1').find((s) => s.id === 'ringNumbering')), /posición (orto|meta|para)/);
  // Alphabetical order decides between 1-bromo-3-cloro and 3-bromo-1-cloro (P-14.4 (g)).
  const bromo = steps('ClC1=CC(Br)=CC=C1').find((s) => s.id === 'ringNumbering');
  assert.match(textOf(bromo), /orden alfabético/);
  assert.ok(bromo.compare && bromo.options.length >= 2);
  // Complete substitution: no numbers, no canvas locants.
  const hexa = steps('CC1=C(C)C(C)=C(C)C(C)=C1C').find((s) => s.id === 'ringNumbering');
  assert.equal(hexa.locants, null);
  assert.match(textOf(hexa), /no lleva números/);
  // The order step appears with two or more different prefixes.
  assert.ok(steps('ClC1=CC(Br)=CC=C1').some((s) => s.id === 'order'));
  // A single substituent keeps the old explanation (no numbering step).
  const toluene = steps('CC1=CC=CC=C1');
  assert.ok(!toluene.some((s) => s.id === 'ringNumbering'));
  assert.match(toluene.map(textOf).join(' '), /Con un solo sustituyente no hace falta numerar/);
}); // End of test 'the explanation numbers the benzene by its subs…'

test('Ordenar dibujo is offered; the 90° view still falls back', () => {
  for (const [smiles] of CASES) {
    assert.equal(canArrange(named(smiles)), true, smiles);
    assert.deepEqual(projectRightAngles(parseSmiles(smiles)), { ok: false, reason: 'CYCLE' }, smiles);
  }
});

test('the English rendering cites every locant too (oracle)', () => {
  assert.equal(englishName(named('ClC1=CC(Br)=CC=C1').structure), '1-bromo-3-chlorobenzene');
  assert.equal(englishName(named('CC1=CC=CC=C1C').structure), '1,2-dimethylbenzene');
  assert.equal(englishName(named('CC1=C(C)C(C)=C(C)C(C)=C1C').structure), 'hexamethylbenzene');
});

test('a polysubstituted benzene with a functional group stays refused with an accurate message', () => {
  const refused = [
    'OC1=CC=C(C)C=C1', // 4-metilfenol (I-43a)
    'NC1=CC=CC=C1Cl', // 2-cloroanilina (I-43a)
    'OC(=O)C1=CC=C(C)C=C1', // ácido 4-metilbenzoico (I-43b)
    'O=CC1=CC=C(Cl)C=C1', // 4-clorobenzaldehído (I-43b)
    'N#CC1=CC=CC(C)=C1', // 3-metilbenzonitrilo (I-43b)
    'CCC1=C(O)C(O)=CC=C1', // 3-etilbenceno-1,2-diol (I-44)
    'CC(=O)C1=CC=C(C)C=C1', // 1-(4-metilfenil)etan-1-ona (I-45a)
    'OCCOC1=CC=C(C)C=C1', // 2-(4-metilfenoxi)etan-1-ol (I-45a)
    'CCOC(=O)C1=CC=C(C)C=C1', // 4-metilbenzoato de etilo (I-45c)
  ];
  for (const smiles of refused) {
    const result = nameMolecule(parseSmiles(smiles));
    assert.equal(result.ok, false, smiles);
    assert.equal(result.error.code, 'CYCLE', smiles);
    assert.equal(result.error.ringReason, 'polysubstitutedBenzene', smiles);
    assert.match(result.error.message, /^Este benceno tiene \d sustituyentes y alguno de ellos es o lleva un grupo funcional/);
    assert.match(result.error.message, /ramas de carbono, halógenos .* o grupos alcoxi/);
  }
  // Two rings stay RING_SYSTEM, a benzoate of a substituted phenyl stays CYCLE.
  assert.equal(validateForNaming(parseSmiles('CC1=CC=C(C=C1)C1=CC=CC=C1')).code, 'RING_SYSTEM');
  assert.equal(validateForNaming(parseSmiles('O=C(OC1=CC=C(Cl)C=C1)C1=CC=CC=C1')).code, 'CYCLE');
}); // End of test 'a polysubstituted benzene with a functional gro…'

test('complete substitution: the assembly step names the multiplier the name uses (hexa- or hexakis)', () => {
  const assembly = (smiles) => explain(named(smiles)).map((s) => s.text.map(plainText).join(' ')).join(' ');
  assert.match(assembly('CC1=C(C)C(C)=C(C)C(C)=C1C'), /con «hexa-» porque hay 6/);
  const isobutyl = 'C1(CC(C)C)=C(CC(C)C)C(CC(C)C)=C(CC(C)C)C(CC(C)C)=C1(CC(C)C)';
  assert.equal(named(isobutyl).name, 'hexakis(2-metilpropil)benceno');
  const text = assembly(isobutyl);
  assert.match(text, /con «hexakis» y el sustituyente entre paréntesis porque hay 6/);
  assert.doesNotMatch(text, /«hexa-»/);
});
