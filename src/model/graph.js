/**
 * @file Graph utilities: connectivity, cycle detection, cyclomatic number,
 * paths, leaves, tree centre and diameter, and the canonical structure keys
 * (design.md §3, §4.2, §8, §13.2): the unrooted canonical tree key and the
 * monocycle key.
 *
 * Every function works on the topology only (`mol.atoms` ids, `mol.bonds`
 * endpoints and orders); coordinates are never read. The module imports
 * nothing so validate.js, molecule.js and rings.js can depend on it without
 * cycles. Every walk is iterative (explicit queues or stacks) and marks the
 * atoms it has visited, so no input — a ring, a long chain — can recurse
 * without bound or loop forever.
 *
 * After validation for naming (validate.js) the molecule is a tree: connected
 * and acyclic, so there is exactly one path between any two atoms (§4.2).
 * Ring perception and classification live in rings.js.
 */

/** Bond-order symbols used by the canonical key (SMILES-like). */
const BOND_SYMBOL = { 1: '-', 2: '=', 3: '#' };

/**
 * Builds an adjacency map of the molecule. Atom lists and neighbour lists are
 * in ascending id order, so results never depend on insertion order.
 *
 * @param {object} mol - The molecule.
 * @returns {Map<number, {atom: number, bond: number, order: number}[]>} Atom id → neighbours.
 */
export function adjacency(mol) {
  const adj = new Map();
  const ids = [...mol.atoms.keys()].sort((p, q) => p - q);
  for (const id of ids) {
    adj.set(id, []);
  }
  for (const bond of mol.bonds.values()) {
    if (adj.has(bond.a) && adj.has(bond.b)) {
      adj.get(bond.a).push({ atom: bond.b, bond: bond.id, order: bond.order });
      adj.get(bond.b).push({ atom: bond.a, bond: bond.id, order: bond.order });
    }
  }
  for (const list of adj.values()) {
    list.sort((p, q) => p.atom - q.atom || p.bond - q.bond);
  }
  return adj;
} // End of function adjacency()

/**
 * The carbon skeleton of a molecule: its carbon atoms and the bonds between
 * two carbons, as a molecule-like `{atoms, bonds}` pair the functions of this
 * module accept. Halogens are monovalent end atoms, so the skeleton of a
 * connected hydrocarbon or halogen derivative stays connected; chain lengths
 * (design.md §1.1 caps, §4.2 parent candidates) are measured on it.
 *
 * @param {object} mol - The molecule.
 * @returns {{atoms: Map<number, object>, bonds: Map<number, object>}} The carbon atoms and C–C bonds (same objects, not copies).
 */
export function carbonSkeleton(mol) {
  const atoms = new Map([...mol.atoms].filter(([, atom]) => atom.element === 'C'));
  const bonds = new Map([...mol.bonds].filter(([, bond]) => atoms.has(bond.a) && atoms.has(bond.b)));
  return { atoms, bonds };
}

/**
 * Breadth-first search from one atom.
 *
 * @param {Map<number, object[]>} adj - Adjacency from adjacency().
 * @param {number} start - Start atom id.
 * @returns {{order: number[], parent: Map<number, number|null>, dist: Map<number, number>}} Visit order, BFS parents and distances (in bonds).
 */
function bfs(adj, start) {
  const parent = new Map([[start, null]]);
  const dist = new Map([[start, 0]]);
  const order = [start];
  for (let i = 0; i < order.length; i += 1) {
    const current = order[i];
    for (const n of adj.get(current)) {
      if (!parent.has(n.atom)) {
        parent.set(n.atom, current);
        dist.set(n.atom, dist.get(current) + 1);
        order.push(n.atom);
      }
    }
  }
  return { order, parent, dist };
} // End of function bfs()

/**
 * Splits the molecule into connected components.
 *
 * @param {object} mol - The molecule.
 * @returns {number[][]} Components as ascending atom-id arrays, ordered by their smallest id.
 */
export function connectedComponents(mol) {
  const adj = adjacency(mol);
  const seen = new Set();
  const components = [];
  for (const id of adj.keys()) {
    if (!seen.has(id)) {
      const { order } = bfs(adj, id);
      order.forEach((a) => seen.add(a));
      components.push(order.sort((p, q) => p - q));
    }
  }
  return components;
} // End of function connectedComponents()

/**
 * Tells whether all atoms form a single piece (an empty molecule counts as connected).
 *
 * @param {object} mol - The molecule.
 * @returns {boolean} True when there is at most one connected component.
 */
export function isConnected(mol) {
  return connectedComponents(mol).length <= 1;
}

/**
 * Detects a cycle (ring) with union-find over the bonds. A second bond
 * between the same two atoms also counts as a cycle.
 *
 * @param {object} mol - The molecule.
 * @returns {boolean} True when the bond graph contains a cycle.
 */
export function hasCycle(mol) {
  const root = new Map();
  /**
   * Finds the representative of an atom's set (with path halving).
   *
   * @param {number} x - Atom id.
   * @returns {number} Representative atom id.
   */
  const find = (x) => {
    if (!root.has(x)) {
      root.set(x, x);
    }
    let r = x;
    while (root.get(r) !== r) {
      root.set(r, root.get(root.get(r)));
      r = root.get(r);
    }
    return r;
  };
  for (const bond of mol.bonds.values()) {
    const ra = find(bond.a);
    const rb = find(bond.b);
    if (ra === rb) {
      return true;
    }
    root.set(ra, rb);
  }
  return false;
} // End of function hasCycle()

/**
 * Tells whether the molecule is a (non-empty) tree: connected and acyclic.
 *
 * @param {object} mol - The molecule.
 * @returns {boolean} True for a tree.
 */
export function isTree(mol) {
  return mol.atoms.size > 0 && isConnected(mol) && !hasCycle(mol);
}

/**
 * Cyclomatic number (circuit rank) of the bond graph: bonds − atoms +
 * connected components, i.e. the number of independent rings. 0 for a tree
 * or a forest, 1 for a single ring (with any side chains), 2 for decalin…
 * Bonds with a missing endpoint are ignored.
 *
 * @param {object} mol - The molecule.
 * @returns {number} The number of independent rings.
 */
export function cyclomaticNumber(mol) {
  const bonds = [...mol.bonds.values()].filter((b) => mol.atoms.has(b.a) && mol.atoms.has(b.b)).length;
  return bonds - mol.atoms.size + connectedComponents(mol).length;
}

/**
 * Finds the path between two atoms (the unique one in a tree; a shortest one otherwise).
 *
 * @param {object} mol - The molecule.
 * @param {number} from - Start atom id.
 * @param {number} to - End atom id.
 * @returns {number[]|null} Atom ids from `from` to `to` inclusive, or null if unreachable or missing.
 */
export function pathBetween(mol, from, to) {
  const adj = adjacency(mol);
  if (!adj.has(from) || !adj.has(to)) {
    return null;
  }
  const { parent } = bfs(adj, from);
  if (!parent.has(to)) {
    return null;
  }
  const path = [];
  for (let current = to; current !== null; current = parent.get(current)) {
    path.push(current);
  }
  return path.reverse();
} // End of function pathBetween()

/**
 * Lists the bond ids along a path of atoms.
 *
 * @param {object} mol - The molecule.
 * @param {number[]} path - Consecutive, bonded atom ids.
 * @returns {number[]} Bond ids joining consecutive atoms.
 * @throws {Error} If two consecutive atoms are not bonded.
 */
export function pathBonds(mol, path) {
  const adj = adjacency(mol);
  const bonds = [];
  for (let i = 1; i < path.length; i += 1) {
    const link = (adj.get(path[i - 1]) || []).find((n) => n.atom === path[i]);
    if (!link) {
      throw new Error(`pathBonds: atoms ${path[i - 1]} and ${path[i]} are not bonded`);
    }
    bonds.push(link.bond);
  }
  return bonds;
} // End of function pathBonds()

/**
 * Lists the leaves (atoms with exactly one neighbour). A lone atom (methane)
 * has no neighbours and is not a leaf.
 *
 * @param {object} mol - The molecule.
 * @returns {number[]} Ascending leaf atom ids.
 */
export function leaves(mol) {
  const result = [];
  for (const [id, list] of adjacency(mol)) {
    if (list.length === 1) {
      result.push(id);
    }
  }
  return result;
}

/**
 * Finds a longest path (diameter) of a tree by double BFS. Ties are broken
 * by the smallest atom id, so the result is deterministic.
 *
 * @param {object} mol - A tree molecule.
 * @returns {number[]} Atom ids along a longest path; `[]` for an empty molecule.
 */
export function treeDiameterPath(mol) {
  const adj = adjacency(mol);
  if (adj.size === 0) {
    return [];
  }
  /**
   * Picks the farthest atom reached by a BFS (smallest id on ties).
   *
   * @param {Map<number, number>} dist - BFS distances.
   * @returns {number} The farthest atom id.
   */
  const farthest = (dist) => {
    let best = null;
    for (const [id, d] of dist) {
      if (best === null || d > dist.get(best) || (d === dist.get(best) && id < best)) {
        best = id;
      }
    }
    return best;
  };
  const first = adj.keys().next().value;
  const x = farthest(bfs(adj, first).dist);
  const { dist, parent } = bfs(adj, x);
  const path = [];
  for (let current = farthest(dist); current !== null; current = parent.get(current)) {
    path.push(current);
  }
  return path;
} // End of function treeDiameterPath()

/**
 * Number of carbons in the longest chain of a tree (its diameter in atoms).
 *
 * @param {object} mol - A tree molecule.
 * @returns {number} Longest-chain length; 0 for an empty molecule.
 */
export function longestChainLength(mol) {
  return treeDiameterPath(mol).length;
}

/**
 * Finds the centre of a tree: the middle atom of any longest path, or the
 * middle two atoms (bicentred tree) when that path has an even atom count.
 * The centre is unique whichever longest path is used.
 *
 * @param {object} mol - A tree molecule.
 * @returns {number[]} One or two atom ids (ascending); `[]` for an empty molecule.
 */
export function treeCentre(mol) {
  const path = treeDiameterPath(mol);
  if (path.length === 0) {
    return [];
  }
  const half = Math.floor((path.length - 1) / 2);
  if (path.length % 2 === 1) {
    return [path[half]];
  }
  return [path[half], path[half + 1]].sort((p, q) => p - q);
}

/**
 * AHU encoding of the subtree rooted at `atom` (seen from `parent`):
 * `El(<child>,<child>…)` where each child is `<bond symbol><encoding>` and the
 * children are sorted, so isomorphic subtrees give identical strings.
 * Iterative (post-order over an explicit stack), so a long chain cannot
 * overflow the call stack; reaching an atom twice means the branch is not a
 * tree, which throws instead of looping.
 *
 * @param {object} mol - The molecule.
 * @param {Map<number, object[]>} adj - Adjacency from adjacency().
 * @param {number} atom - Subtree root.
 * @param {number|null} parent - The neighbour to exclude (towards the tree root).
 * @returns {string} The rooted canonical encoding.
 * @throws {Error} If the branch contains a cycle.
 */
function encodeRooted(mol, adj, atom, parent) {
  const codes = new Map();
  const seen = new Set([atom]);
  const stack = [{ atom, parent, expanded: false }];
  while (stack.length > 0) {
    const frame = stack.pop();
    const branches = adj.get(frame.atom).filter((n) => n.atom !== frame.parent);
    if (!frame.expanded) {
      stack.push({ ...frame, expanded: true });
      for (const n of branches) {
        if (seen.has(n.atom)) {
          throw new Error('rootedTreeKey: the branch contains a cycle');
        }
        seen.add(n.atom);
        stack.push({ atom: n.atom, parent: frame.atom, expanded: false });
      }
    } else {
      const children = branches.map((n) => BOND_SYMBOL[n.order] + codes.get(n.atom)).sort();
      branches.forEach((n) => codes.delete(n.atom)); // Keep only the open frontier in memory.
      codes.set(frame.atom, `${mol.atoms.get(frame.atom).element}(${children.join(',')})`);
    }
  } // End of the post-order walk over the branch
  return codes.get(atom);
} // End of function encodeRooted()

/**
 * Computes the canonical key of the branch that starts at `root` and leads
 * away from `exclude` (e.g. a substituent seen from the parent chain atom it
 * hangs from). Two branches have equal keys if and only if they are
 * isomorphic, rooted at corresponding atoms, with the same bond orders.
 *
 * @param {object} mol - A tree molecule.
 * @param {number} root - First atom of the branch.
 * @param {number|null} exclude - Neighbour of `root` that is not part of the branch (null: whole tree).
 * @param {Map<number, object[]>} [adj] - Adjacency from adjacency() (computed when omitted).
 * @returns {string} The rooted canonical key.
 * @throws {Error} If the branch contains a cycle.
 */
export function rootedTreeKey(mol, root, exclude, adj = adjacency(mol)) {
  return encodeRooted(mol, adj, root, exclude);
}

/**
 * Computes the unrooted canonical key of a tree molecule (elements + bond
 * orders; ids, insertion order and coordinates are irrelevant). The tree is
 * rooted at its centre and encoded AHU-style; a bicentred tree is rooted at
 * its central bond, the two halves being ordered so that the key is the same
 * whichever centre is written first. Two trees have equal keys if and only if
 * they are isomorphic with the same bond orders.
 *
 * @param {object} mol - The molecule; must be a tree (validated for naming).
 * @returns {string} The canonical key; empty string for an empty molecule.
 * @throws {Error} If the molecule is disconnected or contains a cycle.
 */
export function canonicalTreeKey(mol) {
  if (mol.atoms.size === 0) {
    return '';
  }
  if (!isConnected(mol) || hasCycle(mol)) {
    throw new Error('canonicalTreeKey: the molecule is not a tree');
  }
  const adj = adjacency(mol);
  const centre = treeCentre(mol);
  if (centre.length === 1) {
    return `@${encodeRooted(mol, adj, centre[0], null)}`;
  }
  const [u, v] = centre;
  const order = adj.get(u).find((n) => n.atom === v).order;
  const halves = [encodeRooted(mol, adj, u, v), encodeRooted(mol, adj, v, u)].sort();
  return `@@${halves[0]}${BOND_SYMBOL[order]}${halves[1]}`;
} // End of function canonicalTreeKey()

/**
 * Finds the ring of a connected molecule with exactly one ring, in cycle
 * order: side chains are pruned leaf by leaf (iteratively) until only the
 * ring is left, which is then walked from its smallest atom id towards its
 * smaller-id neighbour.
 *
 * @param {Map<number, object[]>} adj - Adjacency of a connected, monocyclic molecule.
 * @returns {{atoms: number[], orders: number[]}} Ring atoms in cycle order, and `orders[i]`, the order of
 *   the ring bond from `atoms[i]` to `atoms[(i + 1) % n]`.
 * @throws {Error} If the remaining atoms do not form a simple cycle (two bonds between the same pair).
 */
export function monocycleOrder(adj) {
  const degree = new Map([...adj].map(([id, list]) => [id, list.length]));
  const queue = [...adj.keys()].filter((id) => degree.get(id) <= 1);
  const removed = new Set();
  for (let i = 0; i < queue.length; i += 1) {
    const id = queue[i];
    removed.add(id);
    for (const n of adj.get(id)) {
      if (!removed.has(n.atom)) {
        degree.set(n.atom, degree.get(n.atom) - 1);
        if (degree.get(n.atom) === 1) {
          queue.push(n.atom);
        }
      }
    }
  } // End of the leaf pruning
  const ring = [...adj.keys()].filter((id) => !removed.has(id));
  const inRing = new Set(ring);
  const atoms = [ring[0]];
  const orders = [];
  let previous = null;
  for (let current = ring[0]; atoms.length <= ring.length;) {
    const next = adj.get(current).find((n) => inRing.has(n.atom) && n.atom !== previous);
    if (!next) {
      throw new Error('monocycleKey: the ring is not a simple cycle (duplicate bond?)');
    }
    orders.push(next.order);
    if (next.atom === ring[0]) {
      break;
    }
    atoms.push(next.atom);
    previous = current;
    current = next.atom;
  } // End of the walk around the ring
  return { atoms, orders };
} // End of function monocycleOrder()

/**
 * Computes the canonical key of a connected molecule with exactly one ring
 * (any ring size, elements, ring bond orders and side chains). Each ring
 * atom is written as its element plus the sorted rooted keys of its side
 * chains (`C(-C())`); the ring is read as atom, bond symbol, atom… from every
 * start atom in both directions, and the smallest reading is the key. It is
 * therefore invariant under ring rotation and reflection, atom ids, bond ids
 * and input order, and two monocycles have equal keys if and only if they
 * are isomorphic with the same elements and bond orders.
 *
 * @param {object} mol - A connected molecule with cyclomatic number 1.
 * @returns {string} The key, `%R<size>:<reading>` (never equal to a tree key, which starts with `@`).
 * @throws {Error} If the molecule is not a connected monocycle.
 */
export function monocycleKey(mol) {
  if (mol.atoms.size === 0 || !isConnected(mol) || cyclomaticNumber(mol) !== 1) {
    throw new Error('monocycleKey: the molecule is not a connected monocycle');
  }
  const adj = adjacency(mol);
  const ring = monocycleOrder(adj);
  const n = ring.atoms.length;
  const inRing = new Set(ring.atoms);
  const tokens = ring.atoms.map((id) => {
    const branches = adj.get(id)
      .filter((nb) => !inRing.has(nb.atom))
      .map((nb) => BOND_SYMBOL[nb.order] + encodeRooted(mol, adj, nb.atom, id))
      .sort();
    return `${mol.atoms.get(id).element}(${branches.join(',')})`;
  });
  let best = null;
  for (let start = 0; start < n; start += 1) {
    for (const step of [1, -1]) {
      let text = '';
      for (let k = 0; k < n; k += 1) {
        const i = (((start + step * k) % n) + n) % n;
        // Bond from reading position k to k + 1: forwards orders[i], backwards orders[i - 1].
        const bond = step === 1 ? ring.orders[i] : ring.orders[(i - 1 + n) % n];
        text += tokens[i] + BOND_SYMBOL[bond];
      }
      if (best === null || text < best) {
        best = text;
      }
    }
  } // End of the loop over every start atom and direction
  return `%R${n}:${best}`;
} // End of function monocycleKey()

/**
 * Structural identity of a connected molecule that is a tree or has exactly
 * one ring: canonicalTreeKey() for a tree (unchanged), monocycleKey() for a
 * monocycle. Polycyclic molecules have no key yet.
 *
 * @param {object} mol - The molecule.
 * @returns {string} The canonical key; empty string for an empty molecule.
 * @throws {Error} If the molecule is disconnected or has more than one ring.
 */
export function canonicalKey(mol) {
  if (mol.atoms.size === 0) {
    return '';
  }
  if (!isConnected(mol)) {
    throw new Error('canonicalKey: the molecule is disconnected');
  }
  const rings = cyclomaticNumber(mol);
  if (rings === 0) {
    return canonicalTreeKey(mol);
  }
  if (rings === 1) {
    return monocycleKey(mol);
  }
  throw new Error(`canonicalKey: polycyclic molecules (${rings} rings) have no key yet`);
} // End of function canonicalKey()
