/**
 * @file Locant-list comparison and the numbering cascade (design.md §4.4),
 * which also finishes the parent choice.
 *
 * Every candidate is a `(chain, direction)` pair. Locant rules compare
 * sorted locant lists, keeping repeated locants, term by term, numerically,
 * at the first point of difference — never by sums, never by assembled
 * strings. IUPAC 2013 compares the unsaturation locants before the number
 * of substituent prefixes, so the order is:
 *
 *   N1 all multiple bonds together (a bond's locant is its lower atom locant);
 *   N2 double bonds;
 *   P4 most substituent prefixes (a chain-level count, direction-independent);
 *   N3 all substituent prefixes together;
 *   N4 prefixes in citation (alphanumerical) order, group by group;
 *   TIE presentation tie-break (smallest atom-id tuple; not an IUPAC rule).
 *
 * The cascade stops as soon as one candidate remains. Pure: reads topology only.
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
 * Compares two lists of locant lists (N4): the first lists are compared with
 * compareLocantLists, then the second ones, … until a difference appears.
 *
 * @param {number[][]} a - First candidate's locant lists, in citation order.
 * @param {number[][]} b - Second candidate's locant lists, in citation order.
 * @returns {number} Negative when `a` is lower, positive when `b` is lower, 0 when equal.
 */
export function compareLocantGroups(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const diff = compareLocantLists(a[i], b[i]);
    if (diff !== 0) {
      return diff;
    }
  }
  return a.length - b.length;
}

/**
 * Compares two alphanumerical citation keys (design.md §1.1): first the
 * letters of the prefix name (multipliers such as di/tri and locants are not
 * part of them), letter by letter; if they are equal, the numeric parts as
 * locant lists. The key is structured data built from the prefix words only;
 * whole assembled names are never compared.
 *
 * @param {{alpha: string, numeric: number[]}} a - First key.
 * @param {{alpha: string, numeric: number[]}} b - Second key.
 * @returns {number} Negative when `a` is cited first, positive when `b` is, 0 when equal.
 */
export function compareCitationKeys(a, b) {
  const n = Math.min(a.alpha.length, b.alpha.length);
  for (let i = 0; i < n; i += 1) {
    const diff = a.alpha.charCodeAt(i) - b.alpha.charCodeAt(i);
    if (diff !== 0) {
      return diff;
    }
  }
  return a.alpha.length - b.alpha.length || compareLocantLists(a.numeric, b.numeric);
}

/**
 * Keeps the candidates whose value is lowest under a comparator and records
 * the comparison as a trace step.
 *
 * @param {string} rule - Rule id, e.g. 'N1'.
 * @param {object[]} candidates - Candidates `{atoms, direction, key}`.
 * @param {Array<number[]|number[][]>} values - Compared value of each candidate (same order).
 * @param {function(*, *): number} [compare] - Comparator (default: compareLocantLists).
 * @returns {{step: object, survivors: object[]}} The trace step and the surviving candidates.
 */
export function applyLocantRule(rule, candidates, values, compare = compareLocantLists) {
  let best = values[0];
  for (const value of values) {
    if (compare(value, best) < 0) {
      best = value;
    }
  }
  const survivors = candidates.filter((_, i) => compare(values[i], best) === 0);
  const step = {
    rule,
    candidatesBefore: candidates.map(traceCandidate),
    values: values.map(copyValue),
    survivors: survivors.map(traceCandidate),
  };
  return { step, survivors };
} // End of function applyLocantRule()

/**
 * Deep-copies a compared value (a locant list or a list of locant lists).
 *
 * @param {Array<number|number[]>} value - The value.
 * @returns {Array<number|number[]>} An independent copy.
 */
function copyValue(value) {
  return value.map((item) => (Array.isArray(item) ? [...item] : item));
}

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
 * `chainIndex` is the index of the source chain in `chains`.
 *
 * @param {number[][]} chains - Chains as atom-id paths (either end first).
 * @returns {{atoms: number[], direction: string, key: string, chainIndex: number}[]} The candidates.
 */
export function directedCandidates(chains) {
  const candidates = [];
  chains.forEach((chain, chainIndex) => {
    const forward = chain[0] <= chain[chain.length - 1] ? [...chain] : [...chain].reverse();
    candidates.push({ atoms: forward, direction: 'forward', key: forward.join('-'), chainIndex });
    if (chain.length > 1) {
      const reverse = [...forward].reverse();
      candidates.push({ atoms: reverse, direction: 'reverse', key: reverse.join('-'), chainIndex });
    }
  });
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
 * Locants of every prefix of a numbered candidate, grouped by identity and
 * ordered by citation (alphanumerical) order.
 *
 * @param {{atom: number, key: string, citation: object|null}[]} prefixes - The chain's prefixes.
 * @param {Map<number, number>} locantOf - Atom id → locant in this candidate.
 * @returns {{all: number[], groups: {key: string, citation: object|null, locants: number[]}[]}} All prefix locants (sorted) and the groups in citation order.
 */
function prefixLocants(prefixes, locantOf) {
  const byKey = new Map();
  for (const prefix of prefixes) {
    if (!byKey.has(prefix.key)) {
      byKey.set(prefix.key, { key: prefix.key, citation: prefix.citation, locants: [] });
    }
    byKey.get(prefix.key).locants.push(locantOf.get(prefix.atom));
  }
  const groups = [...byKey.values()];
  groups.forEach((group) => group.locants.sort((p, q) => p - q));
  if (groups.every((group) => group.citation)) {
    groups.sort((g, h) => compareCitationKeys(g.citation, h.citation) || (g.key < h.key ? -1 : 1));
  }
  const all = prefixes.map((prefix) => locantOf.get(prefix.atom)).sort((p, q) => p - q);
  return { all, groups };
} // End of function prefixLocants()

/**
 * Tells whether two candidates' prefix groups are identical (same identities
 * in the same order with the same locants), i.e. they give the same name.
 *
 * @param {{key: string, locants: number[]}[]} a - First candidate's groups.
 * @param {{key: string, locants: number[]}[]} b - Second candidate's groups.
 * @returns {boolean} True when identical.
 */
function sameGroups(a, b) {
  return a.length === b.length
    && a.every((g, i) => g.key === b[i].key && compareLocantLists(g.locants, b[i].locants) === 0);
}

/**
 * P4 (design.md §4.3–4.4): keeps the candidates whose chain carries the most
 * substituent prefixes. The trace step lists each remaining chain once
 * (without direction) with its prefix count.
 *
 * @param {object[]} candidates - Directed candidates `{atoms, direction, key, chainIndex}`.
 * @param {number[]} counts - Prefix count of each source chain (by chainIndex).
 * @returns {{step: object, survivors: object[]}} The trace step and the surviving directed candidates.
 */
function applySubstituentCountRule(candidates, counts) {
  const chains = [];
  for (const c of candidates) {
    if (!chains.some((chain) => chain.chainIndex === c.chainIndex)) {
      const atoms = c.direction === 'reverse' ? [...c.atoms].reverse() : [...c.atoms];
      chains.push({ atoms, key: atoms.join('-'), chainIndex: c.chainIndex });
    }
  }
  const values = chains.map((chain) => counts[chain.chainIndex]);
  const best = Math.max(...values);
  const kept = chains.filter((_, i) => values[i] === best);
  const step = {
    rule: 'P4',
    candidatesBefore: chains.map(({ atoms, key }) => ({ atoms: [...atoms], key })),
    values,
    survivors: kept.map(({ atoms, key }) => ({ atoms: [...atoms], key })),
  };
  const survivors = candidates.filter((c) => counts[c.chainIndex] === best);
  return { step, survivors };
} // End of function applySubstituentCountRule()

/**
 * Chooses the parent and its numbering among the given chains (both
 * directions of each), applying N1, N2, P4, N3, N4 and then the presentation tie-break
 * (smallest ordered atom-id tuple — not an IUPAC rule; it only stabilises
 * highlighting and redraw). The cascade stops as soon as one candidate
 * remains; each rule applied is recorded with the compared values. P4 is
 * skipped when the remaining candidates all come from one chain; N3 and N4
 * when no candidate carries prefixes (nothing to compare).
 *
 * The result is `unsupported` when N4 must compare a prefix the engine cannot
 * name yet (no citation key), or when candidates left for the tie-break would
 * give different names; the caller then reports `NOT_YET`.
 *
 * @param {object} mol - A validated acyclic hydrocarbon.
 * @param {number[][]} chains - The remaining parent chains (atom-id paths).
 * @param {function(number[]): {atom: number, key: string, citation: ({alpha: string, numeric: number[]}|null)}[]} [prefixesOf] - Prefixes of a chain (called with each array of `chains`): carrying atom, identity key and citation key (null when it cannot be named yet).
 * @returns {{atoms: number[], bonds: number[], orders: number[], direction: string, key: string, chainIndex: number, trace: object[], unsupported: boolean}} The chosen numbering and its trace.
 */
export function numberParent(mol, chains, prefixesOf = () => []) {
  const adj = adjacency(mol);
  const prefixesByChain = chains.map((chain) => prefixesOf(chain));
  const data = new Map();
  let candidates = directedCandidates(chains);
  for (const candidate of candidates) {
    const locantOf = new Map(candidate.atoms.map((atom, i) => [atom, i + 1]));
    const { bonds, orders } = chainBonds(adj, candidate.atoms);
    data.set(candidate.key, { bonds, orders, ...prefixLocants(prefixesByChain[candidate.chainIndex], locantOf) });
  }
  const hasPrefixes = prefixesByChain.some((list) => list.length > 0);
  const rules = [
    { rule: 'N1', value: (d) => bondLocants(d.orders, (order) => order >= 2) },
    { rule: 'N2', value: (d) => bondLocants(d.orders, (order) => order === 2) },
    { rule: 'P4' },
    { rule: 'N3', value: (d) => d.all, skip: !hasPrefixes },
    { rule: 'N4', value: (d) => d.groups.map((g) => g.locants), skip: !hasPrefixes, compare: compareLocantGroups },
  ];
  const trace = [];
  let unsupported = false;
  for (const { rule, value, skip, compare } of rules) {
    if (candidates.length < 2 || skip) {
      continue;
    }
    if (rule === 'P4') {
      if (new Set(candidates.map((c) => c.chainIndex)).size > 1) {
        const { step, survivors } = applySubstituentCountRule(candidates, prefixesByChain.map((list) => list.length));
        trace.push(step);
        candidates = survivors;
      }
      continue;
    }
    if (rule === 'N4' && candidates.some((c) => data.get(c.key).groups.some((g) => !g.citation))) {
      unsupported = true; // Citation order of a prefix not named yet.
      break;
    }
    const { step, survivors } = applyLocantRule(rule, candidates, candidates.map((c) => value(data.get(c.key))), compare);
    trace.push(step);
    candidates = survivors;
  } // End of the loop over the rules N1, N2, P4, N3, N4
  if (!unsupported && candidates.length > 1) {
    const first = data.get(candidates[0].key).groups;
    unsupported = candidates.some((c) => !sameGroups(data.get(c.key).groups, first));
    const { step, survivors } = applyLocantRule('TIE', candidates, candidates.map((c) => c.atoms));
    step.note = TIE_NOTE;
    trace.push(step);
    candidates = survivors;
  }
  const chosen = candidates[0];
  const { bonds, orders } = data.get(chosen.key);
  return {
    atoms: [...chosen.atoms],
    bonds,
    orders,
    direction: chosen.direction,
    key: chosen.key,
    chainIndex: chosen.chainIndex,
    trace,
    unsupported,
  };
} // End of function numberParent()
