/**
 * @file Unit tests for phase I-26, substituted and unsaturated monocycles
 * (design.md §13.4, §13.5): the ring is always the parent (IUPAC 2013
 * P-44.1.2.2), every start atom and both directions are compared by the
 * lowest-locant rules (P-31.1.4), the ring locant-omission rule (design.md
 * §1.1), Spanish and English rendering, the alternatives on rings,
 * invariance under atom ids, bond order, ring rotation and direction and
 * coordinates, the explanation (ring-vs-chain sentence, numbering options,
 * highlights), the validation that remains (heteroatoms, polycycles, caps)
 * and the fallbacks of "Ordenar dibujo" and the 90° view.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles } from '../../src/model/smiles.js';
import { addAtom, addBond } from '../../src/model/molecule.js';
import { validateForNaming, longestSideChain, isNotNameableYet, MESSAGES } from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { ringCandidates } from '../../src/naming/rings.js';
import { ringOmitsLocants } from '../../src/naming/lexicon.es.js';
import { explain, plainText } from '../../src/explain/explain.js';
import { projectRightAngles } from '../../src/ui/canvasbar.js';
import { canArrange } from '../../src/ui/results.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom } from '../../scripts/oracle/generate.mjs';

/**
 * Names a SMILES string and checks that it succeeded.
 *
 * @param {string} smiles - The molecule.
 * @returns {object} The naming result.
 */
function named(smiles) {
  const result = nameMolecule(parseSmiles(smiles));
  assert.equal(result.ok, true, `${smiles}: ${JSON.stringify(result.error)}`);
  return result;
}

/**
 * What must not change between copies of the same molecule: the name, its
 * parts, the alternatives, and the explanation texts, comparison tables,
 * option counts and highlight shapes (never atom ids).
 *
 * @param {object} mol - A molecule with one ring.
 * @returns {object} The invariant summary.
 */
function summary(mol) {
  const result = nameMolecule(mol);
  assert.equal(result.ok, true, JSON.stringify(result.error));
  return {
    name: result.name,
    english: englishName(result.structure),
    parts: result.parts.map((p) => `${p.kind}:${p.text}:${p.atoms.length}:${p.bonds.length}`),
    alternatives: result.alternatives.map((a) => a.name),
    steps: explain(result).map((step) => ({
      id: step.id,
      text: step.text.map(plainText),
      highlight: step.highlight.map((spec) => `${spec.style}:${spec.atoms.length}:${spec.bonds.length}`),
      compare: step.compare ? step.compare.rows.map((row) => [row.rule, row.lists, row.winners]) : null,
      options: step.options ? step.options.length : 0,
      locants: step.locants ? step.locants.map(([, n]) => n).sort((a, b) => a - b) : null,
    })),
  };
} // End of function summary()

test('Spanish and English names of substituted and unsaturated rings', () => {
  const cases = [
    ['C1=CCCCC1', 'ciclohexeno', 'cyclohexene'],
    ['C1=CC=CCC1', 'ciclohexa-1,3-dieno', 'cyclohexa-1,3-diene'],
    ['C1#CCCCCCC1', 'ciclooctino', 'cyclooctyne'],
    ['CC1CCCCC1', 'metilciclohexano', 'methylcyclohexane'],
    ['CC1CCCC1C', '1,2-dimetilciclopentano', '1,2-dimethylcyclopentane'],
    ['CC1C=CCCC1', '3-metilciclohex-1-eno', '3-methylcyclohex-1-ene'],
    ['CCC1CCCC(C)C1', '1-etil-3-metilciclohexano', '1-ethyl-3-methylcyclohexane'],
    ['C=CC1CCCCC1', 'etenilciclohexano', 'ethenylcyclohexane'],
    ['C=C1CCCCC1', 'metilidenciclohexano', 'methylidenecyclohexane'],
    ['C1=CC#CCCCC1', 'ciclooct-1-en-3-ino', 'cyclooct-1-en-3-yne'],
    ['CC(C)(C)C1CCCCC1', 'tert-butilciclohexano', 'tert-butylcyclohexane'],
  ];
  for (const [smiles, spanish, english] of cases) {
    const result = named(smiles);
    assert.equal(result.name, spanish, smiles);
    assert.equal(result.parts.map((p) => p.text).join(''), spanish, smiles);
    assert.equal(englishName(result.structure), english, smiles);
    assert.equal(result.structure.parentKind, 'ring', smiles);
  }
}); // End of test 'Spanish and English names of substituted and unsaturated rings'

test('ring vs chain: the ring is the parent whatever the chain length or unsaturation (P-44.1.2.2)', () => {
  for (const [smiles, name, ringSize] of [
    ['CCCCCCCCCCC1CC1', 'decilciclopropano', 3],
    ['C=CC=CC=CC=CCC1CC1', '(nona-2,4,6,8-tetraen-1-il)ciclopropano', 3],
    ['C#CCCCCCC1CCC1', '(hept-6-in-1-il)ciclobutano', 4],
  ]) {
    const result = named(smiles);
    assert.equal(result.name, name, smiles);
    assert.equal(result.structure.parent.length, ringSize, smiles);
    assert.equal(result.trace[0].rule, 'RING', smiles);
    assert.equal(result.trace.some((step) => /^P[1-4]$/.test(step.rule)), false, 'no chain selection rules');
  }
  const ring = explain(named('CCCCCCCCCCC1CC1')).find((step) => step.id === 'ring');
  const text = ring.text.map(plainText).join(' ');
  assert.match(text, /un anillo manda siempre sobre una cadena abierta/);
  assert.match(text, /el anillo es la cadena principal/);
  assert.match(text, /una rama tiene 10 carbonos y el anillo solo 3/);
  assert.match(text, /ya no es así/);
}); // End of test 'ring vs chain'

test('ring numbering: 2n candidates, closure bond last, every rule recorded with ring bonds', () => {
  const mol = parseSmiles('CC1C=CCCC1');
  const result = nameMolecule(mol);
  const { parent } = result.structure;
  assert.equal(parent.atoms.length, 6);
  assert.equal(parent.bonds.length, 6);
  assert.equal(parent.closure, parent.bonds[5]);
  parent.bonds.forEach((id, i) => {
    const bond = mol.bonds.get(id);
    const ends = [parent.atoms[i], parent.atoms[(i + 1) % 6]].sort((a, b) => a - b);
    assert.deepEqual([bond.a, bond.b].sort((a, b) => a - b), ends, `bond ${id} joins locants ${i + 1} and ${(i + 1) % 6 + 1}`);
  });
  assert.equal(mol.bonds.get(parent.bonds[0]).order, 2, 'the double bond is 1-2');
  assert.deepEqual(result.trace.map((s) => s.rule), ['RING', 'N1', 'N2', 'N3']);
  const n1 = result.trace[1];
  assert.equal(n1.candidatesBefore.length, 12);
  assert.equal(n1.survivors.length, 2);
  for (const candidate of n1.candidatesBefore) {
    assert.equal(candidate.bonds.length, 6, 'each candidate lists its six ring bonds');
  }
  assert.deepEqual(result.trace[3].values.map((v) => v[0]).sort((a, b) => a - b), [3, 6]);
  // Every candidate walks the whole ring once.
  const perceived = { atoms: [1, 2, 3, 4], bonds: [10, 11, 12, 13] };
  const candidates = ringCandidates(perceived);
  assert.equal(candidates.length, 8);
  assert.deepEqual(candidates[1], { atoms: [1, 4, 3, 2], bonds: [13, 12, 11, 10], direction: 'reverse', key: '1-4-3-2', chainIndex: 0 });
  assert.equal(new Set(candidates.map((c) => c.key)).size, 8);
}); // End of test 'ring numbering…'

test('lowest locants: first point of difference, ene/yne before prefixes, double before triple', () => {
  assert.equal(named('CC1=CCCC1C').name, '1,5-dimetilciclopent-1-eno', '[1,5] beats [2,3]');
  assert.equal(named('CC1CC=CC=C1').name, '5-metilciclohexa-1,3-dieno', 'ene locants first');
  assert.equal(named('CC1CCC=C1').name, '3-metilciclopent-1-eno');
  assert.equal(named('C1=CC#CCCCC1').name, 'ciclooct-1-en-3-ino', 'N2 double bond lower');
  assert.equal(named('CC1=CCC(C)CC1').name, '1,4-dimetilciclohex-1-eno');
}); // End of test 'lowest locants…'

test('locant omission on rings (design.md §1.1): explicit rule', () => {
  const site = { locant: 1 };
  assert.deepEqual(ringOmitsLocants({ double: [site], triple: [] }, []), { parent: true, prefixes: false });
  assert.deepEqual(ringOmitsLocants({ double: [], triple: [site] }, []), { parent: true, prefixes: false });
  assert.deepEqual(ringOmitsLocants({ double: [site, site], triple: [] }, []), { parent: false, prefixes: false });
  assert.deepEqual(ringOmitsLocants({ double: [], triple: [] }, [{ locants: [site] }]), { parent: false, prefixes: true });
  assert.deepEqual(ringOmitsLocants({ double: [], triple: [] }, [{ locants: [site, site] }]), { parent: false, prefixes: false });
  assert.deepEqual(ringOmitsLocants({ double: [site], triple: [] }, [{ locants: [site] }]), { parent: false, prefixes: false });
  assert.equal(named('CC1=CCCCC1').name, '1-metilciclohex-1-eno', 'both locants kept with a prefix');
  assert.equal(named('CC1(C)CCCCC1').name, '1,1-dimetilciclohexano', 'two occurrences keep their locants');
  assert.equal(named('CCC1(C)CCCCC1').name, '1-etil-1-metilciclohexano');
}); // End of test 'locant omission on rings'

test('alternatives (isopropil / propan-2-il / 1-metiletil) work on rings and may change N4', () => {
  const result = named('CC(C)C1CCC(C)CC1');
  assert.equal(result.name, '1-isopropil-4-metilciclohexano');
  assert.deepEqual(result.alternatives.map((a) => [a.style, a.name]), [
    ['pin', '1-metil-4-(propan-2-il)ciclohexano'],
    ['substituted', '1-metil-4-(1-metiletil)ciclohexano'],
  ]);
  const pin = nameMolecule(parseSmiles('CC(C)C1CCC(C)CC1'), { prefixStyle: 'pin' });
  assert.equal(pin.name, '1-metil-4-(propan-2-il)ciclohexano');
  assert.deepEqual(pin.alternatives.map((a) => a.style), ['isopropil', 'substituted']);
  assert.deepEqual(named('CC1CCCCC1').alternatives, []);
}); // End of test 'alternatives…'

test('same result whatever the atom ids, bond order, ring rotation, direction and coordinates', () => {
  const random = seededRandom(26);
  const families = [
    ['CC1C=CCCC1', 'C1CC(C)C=CC1', 'C1=CC(C)CCC1', 'C1CCC(C)C=C1'],
    ['CCC1CCCC(C)C1', 'C1C(CC)CCCC1C', 'C(C)C1CC(C)CCC1'],
    ['CC(C)C1CCC(C)CC1', 'C1CC(C(C)C)CCC1C'],
    ['C1=CC=CCC1', 'C1CC=CC=C1', 'C1C=CC=CC1'],
    ['C=C1CCCCC1', 'C1CCC(=C)CC1'],
    ['CC1=CCCC1C', 'CC1CCC=C1C', 'C1(C)CCC=C1C'],
    ['CC1CC=CC=C1', 'C1=CC(C)CC=C1'],
    ['C1=CC#CCCCC1', 'C1CCC#CC=CC1'],
  ];
  for (const family of families) {
    const expected = summary(parseSmiles(family[0]));
    for (const smiles of family.slice(1)) {
      assert.deepEqual(summary(parseSmiles(smiles)), expected, `${smiles} vs ${family[0]}`);
    }
    for (let k = 0; k < 6; k += 1) {
      const copy = scrambleMolecule(parseSmiles(family[0]), random);
      for (const atom of copy.atoms.values()) {
        atom.x = random() * 1000;
        atom.y = random() * 1000;
      }
      assert.deepEqual(summary(copy), expected, `${family[0]}, scrambled copy ${k}`);
    }
  } // End of the loop over the families of equivalent inputs
}); // End of test 'same result whatever…'

test('explanation: ring-vs-chain, numbering options (winner first), substituents, highlights', () => {
  const mol = parseSmiles('CCC1CCCC(C)C1');
  const result = nameMolecule(mol);
  const steps = explain(result);
  assert.deepEqual(steps.map((s) => s.id), ['count', 'ring', 'ringNumbering', 'substituents', 'order', 'assemble']);
  const byId = Object.fromEntries(steps.map((s) => [s.id, s]));
  const closure = result.structure.parent.closure;
  assert.ok(byId.ring.highlight.some((spec) => spec.style === 'candidate' && spec.bonds.length === 1 && spec.bonds[0] === closure));
  assert.ok(byId.ring.highlight.some((spec) => spec.style === 'substituent'));
  const numbering = byId.ringNumbering;
  const text = numbering.text.map(plainText).join(' ');
  assert.match(text, /En un anillo no hay extremos/);
  assert.match(text, /pierden enseguida/);
  assert.match(text, /Gana la opción A/);
  assert.deepEqual(numbering.compare.rows.map((row) => row.rule), ['N3', 'N4']);
  assert.deepEqual(numbering.compare.rows[1].lists.filter(Boolean), [[1, 3], [3, 1]]);
  assert.equal(numbering.options.length, numbering.compare.labels.length);
  for (const option of numbering.options) {
    assert.equal(option.highlight[0].atoms.length, 6);
    assert.equal(option.highlight[0].bonds.length, 6, 'the whole ring, closure bond included');
    assert.deepEqual(option.locants.map(([, n]) => n), [1, 2, 3, 4, 5, 6]);
  }
  const ringAtoms = new Set(result.parent.atoms);
  assert.deepEqual(numbering.locants.map(([atom]) => ringAtoms.has(atom)), [true, true, true, true, true, true]);
  const allAtoms = new Set(mol.atoms.keys());
  for (const step of steps) {
    for (const spec of step.highlight) {
      spec.atoms.forEach((id) => assert.ok(allAtoms.has(id), `${step.id}: atom ${id} exists`));
      spec.bonds.forEach((id) => assert.ok(mol.bonds.has(id), `${step.id}: bond ${id} exists`));
    }
  }
  assert.match(byId.substituents.text.map(plainText).join(' '), /salen del anillo/);
  assert.deepEqual(byId.assemble.legend.map((l) => l.text), ['1', 'etil', '3', 'metil', 'ciclo-', 'hex', '-ano']);
  assert.notEqual(byId.assemble.locants, null);
}); // End of test 'explanation: ring-vs-chain…'

test('explanation: omitted locants are explained and not labelled', () => {
  const methyl = explain(named('CC1CCCCC1'));
  const numbering = methyl.find((s) => s.id === 'ringNumbering');
  assert.match(numbering.text.join(' '), /el número no se escribe: «metilciclohexano»/);
  assert.equal(numbering.compare, undefined, 'a single option needs no table');
  assert.match(methyl.find((s) => s.id === 'substituents').text.join(' '), /se escribe «metil», sin número/);
  const assemble = methyl.find((s) => s.id === 'assemble');
  assert.equal(assemble.locants, null);
  assert.deepEqual(assemble.legend.map((l) => l.text), ['metil', 'ciclo-', 'hex', '-ano']);
  const hexene = explain(named('C1=CCCCC1'));
  assert.deepEqual(hexene.map((s) => s.id), ['count', 'ring', 'ringNumbering', 'assemble']);
  assert.match(hexene.find((s) => s.id === 'ringNumbering').text.join(' '), /En «ciclohexeno» no hace falta el número/);
  const kept = explain(named('CC1C=CCCC1')).find((s) => s.id === 'ringNumbering');
  assert.match(kept.text.join(' '), /también el 1 del enlace doble/);
}); // End of test 'explanation: omitted locants…'

test('validation left for rings: heteroatoms, polycycles, heterocycles and the size caps', () => {
  assert.equal(validateForNaming(parseSmiles('NC1CCCCC1')).code, 'HETEROATOM');
  assert.equal(validateForNaming(parseSmiles('ClC1=CCCCC1')), null, 'halogen derivatives are named since I-30');
  assert.equal(validateForNaming(parseSmiles('ClC1CCC(O)CC1')), null, 'cycloalkanols are named since I-31');
  assert.equal(validateForNaming(parseSmiles('OCC1CCCCC1')).code, 'HETEROATOM', 'an OH on a side chain waits for I-40');
  assert.equal(validateForNaming(parseSmiles('CC1CCOCC1')).code, 'RING_SYSTEM');
  assert.equal(validateForNaming(parseSmiles('CC1CCC2CCCCC2C1')).code, 'RING_SYSTEM');
  assert.equal(validateForNaming(parseSmiles('C1CC1CC1CC1')).code, 'RING_SYSTEM');
  const tail = (n) => `${'C'.repeat(n)}C1CC1`;
  assert.equal(validateForNaming(parseSmiles(tail(30))), null);
  assert.equal(longestSideChain(parseSmiles(tail(30))), 30);
  const tooLong = validateForNaming(parseSmiles(tail(31)));
  assert.equal(tooLong.code, 'TOO_BIG');
  assert.match(tooLong.detail, /side chain has 31/);
  assert.equal(longestSideChain(parseSmiles('C1CCCCC1')), 0);
  assert.equal(longestSideChain(parseSmiles('CC(CC)C1CCC(CCC)CC1')), 4);
  // 61 carbons: a 30-ring with a 31st-to-61st carbon spread over short chains.
  const big = parseSmiles(`C1${'C'.repeat(29)}1`);
  const ringIds = [...big.atoms.keys()];
  for (let i = 0; i < 31; i += 1) {
    addBond(big, ringIds[i % 30], addAtom(big));
  }
  assert.equal(validateForNaming(big).code, 'TOO_BIG');
}); // End of test 'validation left for rings…'

test('a benzene ring (Kekulé hexagon) is named by aromatic.js since I-28; other alternations stay cycloalkenes', () => {
  for (const smiles of ['C1=CC=CC=C1', 'C1C=CC=CC=1', 'CC1=CC=CC=C1', 'C=CC1=CC=CC=C1']) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
    assert.match(named(smiles).name, /benceno$/, smiles);
  }
  // Two or more substituents: CYCLE with ringReason 'polysubstitutedBenzene' (no orto/meta/para).
  for (const smiles of ['CC1=CC=CC=C1C', 'CC1=CC(C)=CC=C1', 'CC1=CC=C(C)C=C1', 'CC1=C(C)C(C)=C(C)C(C)=C1C']) {
    const error = validateForNaming(parseSmiles(smiles));
    assert.equal(error.code, 'CYCLE', smiles);
    assert.equal(error.ringReason, 'polysubstitutedBenzene', smiles);
    assert.match(error.message, /^Este benceno tiene \d sustituyentes\./);
    assert.ok(isNotNameableYet(error));
    assert.equal(error.atoms.length, 6);
    assert.equal(nameMolecule(parseSmiles(smiles)).error.code, 'CYCLE', smiles);
  }
  assert.notEqual(MESSAGES.CYCLE, validateForNaming(parseSmiles('CC1=CC=CC=C1C')).message);
  assert.match(validateForNaming(parseSmiles('CC1=CC=CC=C1C')).message, /tiene 2 sustituyentes/);
  assert.equal(named('C1=CC=CC=CC=C1').name, 'cicloocta-1,3,5,7-tetraeno');
  assert.equal(named('C=C1C=CC=CC1').name, '5-metilidenciclohexa-1,3-dieno');
  assert.equal(named('C1=CC=CCC1').name, 'ciclohexa-1,3-dieno');
  assert.equal(named('C1=CC=C1').name, 'ciclobuta-1,3-dieno');
}); // End of test 'a benzene ring…'

test('Ordenar dibujo lays out substituted rings (I-27b); the 90° view still falls back', () => {
  for (const smiles of ['CC1CCCCC1', 'CC1C=CCCC1', 'C=C1CCCCC1']) {
    const mol = parseSmiles(smiles);
    const result = nameMolecule(mol);
    assert.equal(result.ok, true);
    assert.equal(canArrange(result), true, smiles);
    assert.deepEqual(projectRightAngles(mol), { ok: false, reason: 'CYCLE' }, smiles);
  }
}); // End of test 'Ordenar dibujo and the 90° view…'

test('explanation: more than 26 numbering options get unique labels (A…Z, AA…)', () => {
  const mol = parseSmiles('C1(C)' + 'C(C)'.repeat(26) + 'CCC1');
  const result = nameMolecule(mol);
  assert.equal(result.ok, true);
  const numbering = explain(result).find((s) => s.id === 'ringNumbering');
  const labels = numbering.compare.labels;
  assert.ok(labels.length > 26, `expected more than 26 options, got ${labels.length}`);
  assert.equal(new Set(labels).size, labels.length);
  assert.equal(labels[26], 'AA');
  const optionLabels = numbering.options.map((o) => o.label);
  assert.equal(new Set(optionLabels).size, optionLabels.length);
});
