/**
 * @file Locant-list comparison and the numbering cascade (design.md §4.4).
 *
 * Every candidate is a `(chain, direction)` pair. Rules compare sorted
 * locant lists, keeping repeated locants, term by term, numerically, at the
 * first point of difference — never by sums, never by assembled strings.
 * Implemented so far: N1 (all multiple bonds together), N2 (double bonds)
 * and the presentation tie-break. Phase 040 adds N3/N4 (substituent
 * prefixes) to the same cascade. Pure: reads topology only.
 */

import { adjacency } from '../model/graph.js';

/** Trace note of the presentation tie-break (shown to the student). */
export const TIE_NOTE = 'Las dos opciones dan el mismo nombre.';

/**
 * Compares two locant lists term by term, numerically, at the first point
 * of difference. Both lists must already be sorted ascending; repeated
 * locants are kept. If one list is a prefix of the other, the shorter wins.
 *
 * @param {number[]} a - First sorted locant list.
 * @param {number[]} b - Second sorted locant list.
 * @returns {number} Negative when `a` is lower, positive when `b` is lower, 0 when equal.
 */
export function compareLocantLists(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return a.length - b.length;
}

/**
 * Keeps the candidates whose value is lowest under compareLocantLists and
 * records the comparison as a trace step.
 *
 * @param {string} rule - Rule id, e.g. 'N1'.
 * @param {object[]} candidates - Candidates `{atoms, direction, key}`.
 * @param {number[][]} values - Sorted locant list of each candidate (same order).
 * @returns {{step: object, survivors: object[]}} The trace step and the surviving candidates.
 */
export function applyLocantRule(rule, candidates, values) {
  let best = values[0];
  for (const value of values) {
    if (compareLocantLists(value, best) < 0) {
      best = value;
    }
  }
  const survivors = candidates.filter((_, i) => compareLocantLists(values[i], best) === 0);
  const step = {
    rule,
    candidatesBefore: candidates.map(traceCandidate),
    values: values.map((value) => [...value]),
    survivors: survivors.map(traceCandidate),
  };
  return { step, survivors };
} // End of function applyLocantRule()

/**
 * Copies a candidate into the shape stored in the trace.
 *
 * @param {{atoms: number[], direction: string, key: string}} candidate - The candidate.
 * @returns {{atoms: number[], direction: string, key: string}} An independent copy.
 */
function traceCandidate(candidate) {
  return { atoms: [...candidate.atoms], direction: candidate.direction, key: candidate.key };
}

/**
 * Builds both numbering directions of each chain. 'forward' starts at the
 * chain end with the smaller atom id. A one-atom chain has one direction.
 *
 * @param {number[][]} chains - Chains as atom-id paths (either end first).
 * @returns {{atoms: number[], direction: string, key: string}[]} The candidates.
 */
export function directedCandidates(chains) {
  const candidates = [];
  for (const chain of chains) {
    const forward = chain[0] <= chain[chain.length - 1] ? [...chain] : [...chain].reverse();
    candidates.push({ atoms: forward, direction: 'forward', key: forward.join('-') });
    if (chain.length > 1) {
      const reverse = [...forward].reverse();
      candidates.push({ atoms: reverse, direction: 'reverse', key: reverse.join('-') });
    }
  }
  return candidates;
}

/**
 * Lists the bonds along a chain in locant order, with their orders.
 *
 * @param {Map<number, {atom: number, bond: number, order: number}[]>} adj - Adjacency map (graph.js).
 * @param {number[]} atoms - Chain atom ids in locant order.
 * @returns {{bonds: number[], orders: number[]}} Bond ids and orders; bonds[i] joins atoms[i] and atoms[i + 1].
 * @throws {Error} When two consecutive atoms are not bonded.
 */
export function chainBonds(adj, atoms) {
  const bonds = [];
  const orders = [];
  for (let i = 0; i + 1 < atoms.length; i += 1) {
    const link = (adj.get(atoms[i]) || []).find((n) => n.atom === atoms[i + 1]);
    if (!link) {
      throw new Error(`chainBonds: atoms ${atoms[i]} and ${atoms[i + 1]} are not bonded`);
    }
    bonds.push(link.bond);
    orders.push(link.order);
  }
  return { bonds, orders };
}

/**
 * Sorted locants of the chain bonds whose order satisfies a test. A bond's
 * locant is the lower of its two atom locants, i.e. its index + 1.
 *
 * @param {number[]} orders - Bond orders in locant order.
 * @param {function(number): boolean} test - Which orders to keep.
 * @returns {number[]} Ascending locants.
 */
function bondLocants(orders, test) {
  const locants = [];
  orders.forEach((order, i) => {
    if (test(order)) {
      locants.push(i + 1);
    }
  });
  return locants;
}

/**
 * Chooses the numbering of the parent among the given chains (both
 * directions of each): N1 lowest locants to all multiple bonds together, N2
 * lowest locants to double bonds, then the presentation tie-break (smallest
 * ordered atom-id tuple — not an IUPAC rule; only stabilises highlighting).
 * The cascade stops as soon as one candidate remains; each rule applied is
 * recorded with the compared locant lists.
 *
 * @param {object} mol - A validated acyclic hydrocarbon.
 * @param {number[][]} chains - The remaining parent chains (atom-id paths).
 * @returns {{atoms: number[], bonds: number[], orders: number[], direction: string, key: string, trace: object[]}} The chosen numbering and its trace.
 */
export function numberParent(mol, chains) {
  const adj = adjacency(mol);
  const bondData = new Map();
  let candidates = directedCandidates(chains);
  for (const candidate of candidates) {
    bondData.set(candidate.key, chainBonds(adj, candidate.atoms));
  }
  const trace = [];
  const rules = [
    { rule: 'N1', test: (order) => order >= 2 },
    { rule: 'N2', test: (order) => order === 2 },
  ];
  for (const { rule, test } of rules) {
    if (candidates.length < 2) {
      break;
    }
    const values = candidates.map((c) => bondLocants(bondData.get(c.key).orders, test));
    const { step, survivors } = applyLocantRule(rule, candidates, values);
    trace.push(step);
    candidates = survivors;
  }
  if (candidates.length > 1) {
    const { step, survivors } = applyLocantRule('TIE', candidates, candidates.map((c) => c.atoms));
    step.note = TIE_NOTE;
    trace.push(step);
    candidates = survivors;
  }
  const chosen = candidates[0];
  const { bonds, orders } = bondData.get(chosen.key);
  return { atoms: [...chosen.atoms], bonds, orders, direction: chosen.direction, key: chosen.key, trace };
} // End of function numberParent()
