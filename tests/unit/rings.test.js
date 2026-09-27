/**
 * @file Unit tests for ring infrastructure (design.md §13.2, phase I-24):
 * ring perception and classification (src/model/rings.js), the monocycle
 * key (src/model/graph.js), SMILES ring closures (src/model/smiles.js), the
 * scope errors (src/model/validate.js), and the guards that keep every graph
 * walker bounded on cyclic molecules.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalKey, canonicalTreeKey, monocycleKey, cyclomaticNumber, rootedTreeKey, adjacency,
} from '../../src/model/graph.js';
import { perceiveRings, classifyRings, RING_KINDS } from '../../src/model/rings.js';
import { parseSmiles, writeSmiles, SmilesError } from '../../src/model/smiles.js';
import {
  createMolecule, addAtom, addBond, moleculeToJSON, moleculeFromJSON, formula,
} from '../../src/model/molecule.js';
import {
  validateForNaming, isNotNameableYet, RING_SYSTEM_MESSAGES, RING_TOO_BIG_MESSAGE,
} from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { canonicalLayout } from '../../src/layout/canonical.js';
import { rightAngleLayout } from '../../src/layout/rightangle.js';
import { projectRightAngles } from '../../src/ui/canvasbar.js';
import { compareWithOpsin } from '../../scripts/oracle/compare.mjs';
import { parseFullSmiles } from '../../scripts/oracle/smiles-full.mjs';

/**
 * Rebuilds a molecule with permuted atom ids and reversed bond insertion
 * order and endpoints, so only the topology is kept.
 *
 * @param {object} mol - The source molecule.
 * @param {number} [seed] - Permutation seed.
 * @returns {object} An isomorphic molecule with different ids.
 */
function relabel(mol, seed = 3) {
  const data = moleculeToJSON(mol);
  const ids = data.atoms.map((t) => t.id);
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  let step = 7;
  while (gcd(step, ids.length) !== 1) {
    step += 1;
  }
  const map = new Map(ids.map((id, i) => [id, 100 + ids[(i * step + seed) % ids.length]]));
  data.atoms = data.atoms.map((t) => ({ ...t, id: map.get(t.id) })).reverse();
  data.bonds = data.bonds.map((t) => ({ ...t, id: t.id + 50, a: map.get(t.b), b: map.get(t.a) })).reverse();
  return moleculeFromJSON(data).mol;
}

/**
 * Builds an unbranched ring or chain of carbons without going through SMILES.
 *
 * @param {number} size - Number of carbons.
 * @param {boolean} closed - True for a ring.
 * @returns {object} The molecule.
 */
function carbonPath(size, closed) {
  const mol = createMolecule();
  const ids = [];
  for (let i = 0; i < size; i += 1) {
    ids.push(addAtom(mol));
    if (i > 0) {
      addBond(mol, ids[i - 1], ids[i]);
    }
  }
  if (closed) {
    addBond(mol, ids[size - 1], ids[0]);
  }
  return mol;
}

test('SMILES ring closures: digits, %nn, bond symbols on either end, label reuse', () => {
  const hexane = parseSmiles('C1CCCCC1');
  assert.equal(hexane.atoms.size, 6);
  assert.equal(hexane.bonds.size, 6);
  for (const smiles of ['C1CC=1', 'C=1CC1', 'C=1CC=1']) {
    const mol = parseSmiles(smiles);
    const closure = [...mol.bonds.values()].find((b) => (b.a === 1 && b.b === 3) || (b.a === 3 && b.b === 1));
    assert.equal(closure.order, 2, smiles);
  }
  assert.equal(parseSmiles('C%10CC%10').bonds.size, 3);
  assert.equal(parseSmiles('C%99CC%99').bonds.size, 3);
  assert.equal(cyclomaticNumber(parseSmiles('C1CC1C1CC1')), 2, 'a closed label can be reused');
  assert.equal(cyclomaticNumber(parseSmiles('C12CCCCC1CCCC2')), 2);
  assert.equal(cyclomaticNumber(parseSmiles('C1CC(CC1)C')), 1, 'closure inside a branch');
});

test('SMILES rejects invalid ring closures with explicit errors', () => {
  const cases = [
    ['C1CC', /never closed/], ['C1CC2CC1', /"2" is never closed/], ['C11', /atom that opened it/],
    ['C1C1', /duplicates an existing bond/], ['C12CC12', /duplicates an existing bond/],
    ['C=1CC#1', /different bond orders/], ['C=1CC-1', /different bond orders/], ['C%1CC', /two digits/],
    ['1CC', /no atom before it/],
  ];
  for (const [smiles, message] of cases) {
    assert.throws(() => parseSmiles(smiles), (err) => err instanceof SmilesError && err.code === 'SMILES_RING' && message.test(err.message), smiles);
  }
});

test('writer: ring closures round-trip to the same structure; acyclic output unchanged', () => {
  const cyclic = [
    'C1CCCCC1', 'C1CC1', 'CC1CCCC1', 'C1=CCCCC1', 'CC1=CCCCC1', 'C=C1CCCC1', 'CC(C)C1CCC(CC)CC1', 'C1CCOCC1',
    'OC1CCCCC1', 'C1#CCCCCCC1', 'C12CCCCC1CCCC2', 'C1CC2CCC1C2', 'C1CCC2(C1)CCCC2', 'C1CCC(CC1)C1CCCCC1',
    'C1CC1C1CC1', 'C1CCC(C(C1)C)C=C',
  ];
  for (const smiles of cyclic) {
    const mol = parseSmiles(smiles);
    const written = writeSmiles(mol);
    const back = parseSmiles(written);
    assert.equal(formula(back), formula(mol), `${smiles} → ${written}`);
    assert.equal(cyclomaticNumber(back), cyclomaticNumber(mol), `${smiles} → ${written}`);
    if (cyclomaticNumber(mol) <= 1) {
      assert.equal(canonicalKey(back), canonicalKey(mol), `${smiles} → ${written}`);
    } else {
      assert.equal(classifyRings(back).kind, classifyRings(mol).kind, `${smiles} → ${written}`);
    }
    assert.equal(writeSmiles(back), written, 'writing is stable');
  } // End of the loop over the cyclic SMILES
  assert.equal(writeSmiles(parseSmiles('C1CCCCC1')), 'C1CCCCC1');
  assert.equal(writeSmiles(parseSmiles('C1CC=1')), 'C=1CC1');
  assert.equal(writeSmiles(parseSmiles('CC(C)C=C')), 'CC(C)C=C');
}); // End of test 'writer: ring closures round-trip…'

test('monocycle key: invariant under rotation, reflection, ids and input order', () => {
  const groups = [
    ['C1CCCCC1', 'C(C1)CCCC1', 'C1CCC(CC1)'],
    ['C1=CCCCC1', 'C1CC=CCC1', 'C1CCCC=C1', 'C=1CCCCC1', 'C1CCCCC=1'],
    ['CC1CCCCC1', 'C1CCC(C)CC1', 'C1CCCCC1C', 'C1(C)CCCCC1'],
    ['CC1=CCCCC1', 'C1(C)=CCCCC1', 'C1(C)CCCCC=1', 'C1CCC=C(C)C1'],
    ['CC1CCC(C)CC1', 'C1C(C)CCC(C)C1'],
    ['OC1CCCCC1', 'C1CCCCC1O', 'C1CC(O)CCC1'],
  ];
  for (const group of groups) {
    const keys = group.map((smiles) => canonicalKey(parseSmiles(smiles)));
    assert.equal(new Set(keys).size, 1, group.join(' / '));
    for (const smiles of group) {
      for (const seed of [1, 2, 5]) {
        assert.equal(canonicalKey(relabel(parseSmiles(smiles), seed)), keys[0], `${smiles} relabelled (${seed})`);
      }
    }
  } // End of the loop over the groups of equal structures
  assert.match(monocycleKey(parseSmiles('C1CCCCC1')), /^%R6:/);
});

test('canonical keys tell non-isomorphic same-formula structures apart', () => {
  const groups = [
    ['CC1CCCC1', 'C1CCCCC1', 'C=CCCCC', 'CC=CCCC', 'CCC1CC1C'], // C6H12
    ['CC1CCCCC1C', 'CC1CCCC(C)C1', 'CC1CCC(C)CC1', 'CC1(C)CCCCC1', 'CCC1CCCCC1'], // C8H16
    ['C1=CCCCC1', 'C=C1CCCC1', 'CC1=CCCC1', 'CC1C=CCC1', 'C#CCCCC'], // C6H10
    ['C1CCOCC1', 'CC1CCCO1', 'OC1CCCC1', 'COC1CCC1', 'C=CCCCO'], // C5H10O
  ];
  for (const group of groups) {
    const mols = group.map((smiles) => parseSmiles(smiles));
    assert.equal(new Set(mols.map(formula)).size, 1, `${group.join(' / ')} share a formula`);
    assert.equal(new Set(mols.map(canonicalKey)).size, group.length, `${group.join(' / ')} are different structures`);
  }
  // Tree keys are unchanged: canonicalKey() of a tree is canonicalTreeKey().
  for (const smiles of ['C', 'CC(C)CC', 'C#CC(C=C)C(CC)C', 'OCC(N)C(=O)Cl']) {
    assert.equal(canonicalKey(parseSmiles(smiles)), canonicalTreeKey(parseSmiles(smiles)));
  }
  assert.equal(canonicalKey(createMolecule()), '');
  assert.throws(() => canonicalKey(parseSmiles('C12CCCCC1CCCC2')), /polycyclic/);
  const pieces = parseSmiles('C1CC1');
  addAtom(pieces);
  assert.throws(() => canonicalKey(pieces), /disconnected/);
}); // End of test 'canonical keys tell non-isomorphic same-formula structures apart'

test('perception: ordered ring, closure bond, cyclic components and attachment points', () => {
  const mol = parseSmiles('CC(C)C1CCC(CC)CC1');
  const p = perceiveRings(mol);
  assert.equal(p.cyclomatic, 1);
  assert.equal(p.rings.length, 1);
  assert.equal(p.closureBonds.length, 1);
  const ring = p.rings[0];
  assert.equal(ring.atoms.length, 6);
  assert.equal(ring.bonds.length, 6);
  assert.equal(ring.bonds[ring.bonds.length - 1], ring.closure);
  const adj = adjacency(mol);
  ring.atoms.forEach((atom, i) => {
    const next = ring.atoms[(i + 1) % ring.atoms.length];
    const link = adj.get(atom).find((n) => n.atom === next);
    assert.ok(link, 'consecutive ring atoms are bonded');
    assert.equal(link.bond, ring.bonds[i]);
  });
  assert.deepEqual(p.ringAtoms, [...ring.atoms].sort((a, b) => a - b));
  assert.deepEqual(p.attachments, [{ atom: 4, neighbours: [2] }, { atom: 7, neighbours: [8] }]);
  assert.deepEqual(p.cyclicComponents, [[...mol.atoms.keys()]]);
  const acyclic = perceiveRings(parseSmiles('CC(C)C'));
  assert.equal(acyclic.cyclomatic, 0);
  assert.deepEqual(acyclic.rings, []);
  assert.deepEqual(acyclic.ringAtoms, []);
  // Two pieces, one of them cyclic.
  const pieces = parseSmiles('C1CC1');
  addBond(pieces, addAtom(pieces), addAtom(pieces));
  const q = perceiveRings(pieces);
  assert.deepEqual(q.components.map((c) => c.cyclomatic), [1, 0]);
  assert.deepEqual(q.cyclicComponents, [[1, 2, 3]]);
}); // End of test 'perception: ordered ring, closure bond…'

test('classification: acyclic, carbocycle, heterocycle, fused, bridged, spiro, several', () => {
  const cases = [
    ['CCCC', 'acyclic'],
    ['C1CCCCC1', 'carbocycle'],
    ['OC1CCCCC1', 'carbocycle'],
    ['C1=CCCCC1C', 'carbocycle'],
    ['C1CCOCC1', 'heterocycle'],
    ['C1CN1', 'heterocycle'],
    ['C1CCC2CCCCC2C1', 'fused'], // decalin
    ['C1=CC=C2C=CC=CC2=C1', 'fused'], // naphthalene (Kekulé)
    ['C1CC2C1C2', 'fused'], // bicyclo[2.1.0]pentane: the rings share a bond
    ['C1CC2CCC1C2', 'bridged'], // norbornane
    ['C1CC2CCC1CC2', 'bridged'], // bicyclo[2.2.2]octane
    ['C1C2CC3CC1CC(C2)C3', 'bridged'], // adamantane
    ['C1CCC2(C1)CCCC2', 'spiro'], // spiro[4.4]nonane
    ['C1CC11CC1', 'spiro'], // spiro[2.3]hexane
    ['C1CCC(CC1)C1CCCCC1', 'several'], // bicyclohexyl, a ring assembly (biphenyl-like)
    ['C1CCC(CC1)CC1CCCCC1', 'several'], // two rings joined by a chain
    ['C1CCOCC1C1CCCCC1', 'several'],
  ];
  for (const [smiles, kind] of cases) {
    const result = classifyRings(parseSmiles(smiles));
    assert.equal(result.kind, kind, smiles);
    assert.ok(RING_KINDS.includes(result.kind));
    assert.equal(classifyRings(relabel(parseSmiles(smiles))).kind, kind, `${smiles} relabelled`);
  }
  assert.equal(classifyRings(parseSmiles('C1CCOCC1')).hetero, true);
  assert.equal(classifyRings(parseSmiles('OC1CCCCC1')).hetero, false, 'an O outside the ring is not a heteroatom of the ring');
  const decalin = perceiveRings(parseSmiles('C1CCC2CCCCC2C1'));
  assert.equal(decalin.blocks.length, 1);
  assert.equal(decalin.blocks[0].cyclomatic, 2);
  assert.equal(decalin.rings.length, 2);
  assert.equal(perceiveRings(parseSmiles('C1CCC2(C1)CCCC2')).blocks.length, 2);
}); // End of test 'classification…'

test('validation: a substituted carbocycle is nameable (I-26), other ring systems are out of scope; naming never crashes', () => {
  assert.equal(validateForNaming(parseSmiles('CC1CCCCC1')), null);
  assert.equal(nameMolecule(parseSmiles('CC1CCCCC1')).name, 'metilciclohexano');
  const cases = [
    ['C1CCOCC1', 'heterocycle', /heterociclo/],
    ['C1CCC2CCCCC2C1', 'fused', /fusionados/],
    ['C1CC2CCC1C2', 'bridged', /puente/],
    ['C1CCC2(C1)CCCC2', 'spiro', /espiro/],
    ['C1CCC(CC1)C1CCCCC1', 'several', /varios anillos/],
  ];
  for (const [smiles, kind, text] of cases) {
    const mol = parseSmiles(smiles);
    const error = validateForNaming(mol);
    assert.equal(error.code, 'RING_SYSTEM', smiles);
    assert.equal(error.ringKind, kind, smiles);
    assert.equal(error.message, RING_SYSTEM_MESSAGES[kind]);
    assert.match(error.message, text);
    assert.ok(isNotNameableYet(error));
    const result = nameMolecule(mol);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'RING_SYSTEM');
  } // End of the loop over the out-of-scope ring systems
  assert.equal(nameMolecule(parseSmiles('C1CCCCC1')).name, 'ciclohexano');
  // A bare ring bigger than the parent-size cap gets the ring-size message.
  assert.equal(validateForNaming(carbonPath(70, true)).code, 'TOO_BIG');
  assert.equal(validateForNaming(carbonPath(70, true)).message, RING_TOO_BIG_MESSAGE);
}); // End of test 'validation…'

test('no unbounded recursion: large rings and long chains', () => {
  const bigRing = carbonPath(1000, true);
  assert.match(canonicalKey(bigRing), /^%R1000:/);
  assert.equal(canonicalKey(relabel(bigRing)), canonicalKey(bigRing));
  assert.equal(classifyRings(bigRing).kind, 'carbocycle');
  assert.equal(perceiveRings(bigRing).rings[0].atoms.length, 1000);
  assert.equal(cyclomaticNumber(parseSmiles(writeSmiles(bigRing))), 1);
  const longChain = carbonPath(12000, false);
  assert.equal(canonicalTreeKey(longChain).length > 0, true);
  assert.equal(classifyRings(longChain).kind, 'acyclic');
  const written = writeSmiles(longChain);
  assert.equal(written.length, 12000);
  assert.equal(parseSmiles(written).atoms.size, 12000);
  assert.equal(validateForNaming(longChain).code, 'TOO_BIG');
  // A ring with a long side chain.
  const tailed = carbonPath(6000, false);
  addBond(tailed, 1, 6);
  assert.match(canonicalKey(tailed), /^%R6:/);
  assert.equal(validateForNaming(tailed).code, 'TOO_BIG');
}); // End of test 'no unbounded recursion…'

test('tree-only walkers refuse rings instead of looping', () => {
  const ring = parseSmiles('C1CCCCC1');
  assert.throws(() => rootedTreeKey(ring, 1, null), /cycle/);
  assert.throws(() => rootedTreeKey(ring, 1, 2), /cycle/);
  assert.throws(() => canonicalTreeKey(ring), /not a tree/);
  const fake = { ok: true, parent: { atoms: [1, 2, 3, 4, 5, 6], bonds: [] } };
  assert.throws(() => canonicalLayout(ring, fake), /not a connected tree/);
  assert.deepEqual(rightAngleLayout(ring, fake), { ok: false, reason: 'CYCLE' });
  assert.equal(projectRightAngles(ring).reason, 'CYCLE');
  assert.equal(projectRightAngles(parseSmiles('C1CCC2CCCCC2C1')).reason, 'RING_SYSTEM');
});

test('oracle comparison: rings are compared structurally, never by formula alone', () => {
  const hexene = parseSmiles('C=CCCCC');
  const failed = compareWithOpsin(hexene, 'C1CCCCC1');
  assert.equal(failed.status, 'failed', 'cyclohexane has the formula of hex-1-ene but is not it');
  assert.match(failed.reason, /ring/);
  const methylcyclopentane = parseSmiles('CC1CCCC1');
  assert.deepEqual(compareWithOpsin(methylcyclopentane, 'C1CCC(C)C1'), { status: 'passed', reason: null });
  assert.equal(compareWithOpsin(methylcyclopentane, 'C1CCCCC1').status, 'failed');
  assert.equal(compareWithOpsin(parseSmiles('CC1CCCCC1C'), 'CC1CCCC(C)C1').status, 'failed', '1,2- vs 1,3-dimethylcyclohexane');
  assert.equal(compareWithOpsin(parseSmiles('CC1CCCCC1C'), 'C1CCC(C)C(C)C1').status, 'passed');
  assert.equal(compareWithOpsin(parseSmiles('C1CCCCC1C1CCCCC1'), 'C1CCCCC1C1CCCCC1').status, 'failed', 'no key for polycycles yet');
});

/**
 * Lists a molecule's bonds as sorted `a-b:order` strings (exact connectivity).
 *
 * @param {object} mol - The molecule.
 * @returns {string[]} The bonds.
 */
function bondSet(mol) {
  return [...mol.bonds.values()].map((b) => `${Math.min(b.a, b.b)}-${Math.max(b.a, b.b)}:${b.order}`).sort();
}

test('ring labels are ring numbers: `1` and `%01` are the same label (parser and oracle parser)', () => {
  const plain = bondSet(parseSmiles('C1CCCCC1'));
  for (const mixed of ['C%01CCCCC1', 'C1CCCCC%01', 'C%01CCCCC%01']) {
    assert.deepEqual(bondSet(parseSmiles(mixed)), plain, mixed);
  }
  // Reuse after closure, across spellings: two separate cyclopropanes joined by a bond.
  assert.deepEqual(
    bondSet(parseSmiles('C1CC%01C%01CC1')),
    ['1-2:1', '1-3:1', '2-3:1', '3-4:1', '4-5:1', '4-6:1', '5-6:1'],
  );
  assert.deepEqual(bondSet(parseSmiles('C=%01CC1')), ['1-2:1', '1-3:2', '2-3:1']);
  assert.throws(() => parseSmiles('C%01C1'), /duplicates an existing bond/);
  assert.throws(() => parseSmiles('C1%01'), /atom that opened it/);
  assert.throws(() => parseSmiles('C=%01CC#1'), /different bond orders/);
  assert.throws(() => parseSmiles('C%01CC'), /"%01" is never closed/);
  // The oracle's fuller parser matches labels the same way.
  const full = (smiles) => parseFullSmiles(smiles).bonds.map((b) => `${Math.min(b.a, b.b)}-${Math.max(b.a, b.b)}`).sort();
  assert.deepEqual(full('C%01CCCCC1'), full('C1CCCCC1'));
  assert.deepEqual(full('C1CC%01C%01CC1'), full('C1CC1C1CC1'));
}); // End of test 'ring labels are ring numbers…'

test('classification of mixed systems does not depend on atom ids or order', () => {
  const cases = [
    ['C1CCC2CCCCC2C1C1CC2CCC1C2', 'bridged'], // decalin (fused) bonded to norbornane (bridged)
    ['C1CC2CCC1C2C1CCC2CCCCC2C1', 'bridged'], // the same, written the other way round
    ['C1CCC2CCCCC2C1C1CCCCC1', 'fused'], // fused block + a separate ring
    ['C1CCC2CCCCC2C11CCCC1', 'fused'], // fused block + a spiro ring
    ['C1CC2CCC1C2C1CCCCC1', 'bridged'],
    ['C1CCC2(C1)CCCC2C1CCCCC1', 'spiro'], // spiro pair + a separate ring
  ];
  for (const [smiles, kind] of cases) {
    const mol = parseSmiles(smiles);
    assert.equal(classifyRings(mol).kind, kind, smiles);
    for (const seed of [0, 1, 2, 3, 5, 8]) {
      assert.equal(classifyRings(relabel(mol, seed)).kind, kind, `${smiles} relabelled (${seed})`);
    }
    // Reversed atom order: atom i gets id n + 1 − i.
    const data = moleculeToJSON(mol);
    const n = data.atoms.length;
    data.atoms = data.atoms.map((t) => ({ ...t, id: n + 1 - t.id })).reverse();
    data.bonds = data.bonds.map((t) => ({ ...t, a: n + 1 - t.a, b: n + 1 - t.b })).reverse();
    const reversed = moleculeFromJSON(data).mol;
    assert.equal(classifyRings(reversed).kind, kind, `${smiles} reversed`);
    assert.equal(validateForNaming(reversed).ringKind, kind, `${smiles} reversed (validation)`);
  } // End of the loop over the mixed ring systems
}); // End of test 'classification of mixed systems…'
