/**
 * @file Unit tests for parent selection (src/naming/parent.js), the locant
 * and citation comparators and the numbering cascade (src/naming/numbering.js).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles } from '../../src/model/smiles.js';
import { leafToLeafPaths, selectParent, chainKey } from '../../src/naming/parent.js';
import { collectSubstituents } from '../../src/naming/substituent.js';
import {
  compareLocantLists, compareCitationKeys, numberParent,
} from '../../src/naming/numbering.js';

test('compareLocantLists: first point of difference, never sums', () => {
  assert.ok(compareLocantLists([2, 5, 5], [3, 3, 6]) < 0); // equal sums (12)
  assert.ok(compareLocantLists([1, 5], [2, 4]) < 0); // equal sums (6)
  assert.ok(compareLocantLists([2, 3, 7], [2, 4, 4]) < 0); // equal sums, second term decides
  assert.ok(compareLocantLists([2, 2, 4], [2, 4, 4]) < 0); // repeated locants kept
  assert.ok(compareLocantLists([2, 4, 4], [2, 2, 4]) > 0);
  assert.ok(compareLocantLists([3, 3], [3, 3, 3]) < 0); // prefix list is lower
  assert.equal(compareLocantLists([2, 2, 3], [2, 2, 3]), 0);
});

test('compareCitationKeys orders letters, then numeric parts', () => {
  const key = (alpha, numeric = []) => ({ alpha, numeric });
  assert.ok(compareCitationKeys(key('etil'), key('metil')) < 0);
  assert.ok(compareCitationKeys(key('metil'), key('metiletil')) < 0);
  assert.ok(compareCitationKeys(key('butil'), key('propil')) < 0);
  assert.ok(compareCitationKeys(key('metilpropil', [1]), key('metilpropil', [2])) < 0);
  assert.equal(compareCitationKeys(key('etil'), key('etil')), 0);
});

test('leaf-to-leaf paths of a tree', () => {
  assert.deepEqual(leafToLeafPaths(parseSmiles('C')), [[1]]);
  assert.deepEqual(leafToLeafPaths(parseSmiles('CC')), [[1, 2]]);
  const paths = leafToLeafPaths(parseSmiles('CC(C)(C)C'));
  assert.equal(paths.length, 6); // 4 leaves, every pair
  paths.forEach((p) => assert.equal(p.length, 3));
  assert.equal(chainKey([5, 3, 1]), '1-3-5');
});

test('P1 keeps the longest chains even when a shorter one holds the double bond', () => {
  const { chains, trace } = selectParent(parseSmiles('C=CC(CCC)CCC'));
  assert.equal(trace[0].rule, 'P1');
  assert.equal(chains.length, 1);
  assert.equal(chains[0].length, 7);
  assert.deepEqual(trace.map((step) => step.rule), ['P1']);
});

test('P2 and P3 decide between chains of equal length', () => {
  const p2 = selectParent(parseSmiles('C=CC(CC)CC'));
  assert.deepEqual(p2.trace.map((s) => s.rule), ['P1', 'P2', 'P3']);
  assert.equal(p2.chains.length, 2);

  // Hex-1-ene vs hex-1-yne chains: one multiple bond each; P3 keeps the double bond.
  const p3 = selectParent(parseSmiles('C=CC(C#C)CCC'));
  const step = p3.trace.find((s) => s.rule === 'P3');
  assert.deepEqual(p3.trace.find((s) => s.rule === 'P2').values, [1, 1]);
  assert.deepEqual(step.values, [1, 0]);
  assert.deepEqual(p3.chains, [[1, 2, 3, 6, 7, 8]]);
  assert.equal(p3.trace.at(-1).rule, 'P3');
});

/**
 * Runs selectParent and numberParent with the real substituent list of each
 * chain (citation keys are irrelevant before N4, so a fixed one is used).
 *
 * @param {object} mol - A validated molecule.
 * @returns {{chains: number[][], numbering: object, trace: object[]}} Selection, numbering and the whole trace.
 */
function selectAndNumber(mol) {
  const { chains, trace } = selectParent(mol);
  const prefixesOf = (chain) => collectSubstituents(mol, chain).map((sub) => ({
    atom: sub.chainAtom, key: sub.key, citation: { alpha: 'x', numeric: [] },
  }));
  const numbering = numberParent(mol, chains, prefixesOf);
  return { chains, numbering, trace: [...trace, ...numbering.trace] };
}

test('P4 counts two substituents on one carbon as two', () => {
  // Every 3-carbon chain of neopentane carries two methyls on its C2.
  const { trace } = selectAndNumber(parseSmiles('CC(C)(C)C'));
  const p4 = trace.find((s) => s.rule === 'P4');
  assert.deepEqual(p4.values, [2, 2, 2, 2, 2, 2]);
  p4.candidatesBefore.forEach((c) => assert.equal(c.direction, undefined));
});

test('N1 is applied before P4: the non-1-ene chain survives with fewer substituents', () => {
  // C1=C2-C3-C4(-C5=C6(C7)C8)-C9…C13: two 9-carbon chains with one double bond each.
  // Chain 1-2-3-4-9…13 (one substituent) gives the double bond locant 1; chain
  // 7-6-5-4-9…13 (two substituents) gives it 2. IUPAC 2013 compares the
  // unsaturation locants first, so the first chain wins and P4 is never reached.
  const { chains, numbering, trace } = selectAndNumber(parseSmiles('C=CCC(C=C(C)C)CCCCC'));
  assert.equal(chains.length, 3); // C7 and C8 are equivalent chain ends
  assert.deepEqual(numbering.atoms, [1, 2, 3, 4, 9, 10, 11, 12, 13]);
  assert.equal(trace.find((s) => s.rule === 'N1').survivors.length, 1);
  assert.equal(trace.some((s) => s.rule === 'P4'), false);
});

test('a triple bond leaving a longest chain breaks the invariant', () => {
  // Hand-built, invalid on purpose (C3 would have 5 bonds): selectParent does not validate.
  const atoms = new Map([1, 2, 3, 4, 5, 6].map((id) => [id, { id, element: 'C' }]));
  const pairs = [[1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1], [3, 6, 3]];
  const bonds = new Map(pairs.map(([a, b, order], i) => [i + 1, { id: i + 1, a, b, order }]));
  assert.throws(() => selectParent({ atoms, bonds }), /triple bond/);
});

test('numberParent without prefixes keeps the I-3 behaviour', () => {
  const result = numberParent(parseSmiles('C=CCC'), [[1, 2, 3, 4]]);
  assert.deepEqual(result.atoms, [1, 2, 3, 4]);
  assert.deepEqual(result.trace.map((s) => s.rule), ['N1']);
  assert.equal('unsupported' in result, false); // every prefix has a citation key since phase I-6
});

test('numberParent: an -iliden prefix counts once in N3 and N4', () => {
  const mol = parseSmiles('CCC(=C)C(C)CC'); // 3-metiliden-4-metilhexane skeleton
  const prefixesOf = () => [
    { atom: 3, key: '=C()', citation: { alpha: 'metiliden', numeric: [] } },
    { atom: 5, key: '-C()', citation: { alpha: 'metil', numeric: [] } },
  ];
  const result = numberParent(mol, [[1, 2, 3, 5, 7, 8]], prefixesOf);
  assert.deepEqual(result.trace.map((s) => s.rule), ['N1', 'N2', 'N3', 'N4']);
  assert.deepEqual(result.trace[2].values, [[3, 4], [3, 4]]);
  // metil is cited before metiliden, so it gets the lower locant.
  assert.deepEqual(result.atoms, [8, 7, 5, 3, 2, 1]);
});

test('numberParent: N4 compares one flat citation-order sequence across chains', () => {
  // Two 9-carbon chains of CCC(=C)C=C(C(C)CC)C(C(C)CC)C(=C)CC tie up to N3
  // ([3,5,6,7]) but carry different prefix sets. Chain A cites butan-2-il (5),
  // but-1-en-2-il (6), metil (7), metiliden (3); chain B cites the grouped
  // di(butan-2-il) (5,6) and dimetiliden (3,7). Group by group, [5] < [5,6]
  // would wrongly pick A; the flat sequences 5,6,7,3 vs 5,6,3,7 pick B.
  const mol = parseSmiles('CCC(=C)C=C(C(C)CC)C(C(C)CC)C(=C)CC');
  const chainA = [1, 2, 3, 5, 6, 11, 12, 14, 15];
  const chainB = [1, 2, 3, 5, 6, 11, 16, 18, 19];
  const prefix = (atom, key, alpha) => ({ atom, key, citation: { alpha, numeric: [] } });
  const prefixesOf = (chain) => (chain === chainA
    ? [prefix(3, 'metiliden', 'metiliden'), prefix(6, 'butanil', 'butanil'),
      prefix(11, 'butenil', 'butenil'), prefix(12, 'metil', 'metil')]
    : [prefix(3, 'metiliden', 'metiliden'), prefix(6, 'butanil', 'butanil'),
      prefix(11, 'butanil', 'butanil'), prefix(16, 'metiliden', 'metiliden')]);
  const result = numberParent(mol, [chainA, chainB], prefixesOf);
  const n4 = result.trace.find((s) => s.rule === 'N4');
  assert.deepEqual(n4.values, [[5, 6, 7, 3], [5, 6, 3, 7]]);
  assert.equal(n4.survivors.length, 1);
  assert.deepEqual(result.atoms, chainB);
  assert.equal(result.trace.at(-1).rule, 'N4');
});
