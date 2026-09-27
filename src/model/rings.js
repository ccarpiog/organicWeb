/**
 * @file Ring perception and classification (design.md §13.2): not just "is
 * there a ring?", but which atoms and bonds form each ring, in cycle order,
 * which bonds close them, which connected components are cyclic, where side
 * chains attach, and what kind of ring system the molecule is.
 *
 * Perception (perceiveRings()):
 * - cyclomatic number (independent rings) per connected component;
 * - a spanning forest built by breadth-first search from the smallest atom id
 *   of each component (neighbours in ascending id order); the bonds outside
 *   it are the **closure bonds**, one per independent ring;
 * - one ring per closure bond: the fundamental cycle it closes (for a
 *   monocycle, exactly the ring), as ordered atoms and bonds;
 * - ring blocks: the biconnected components that contain a ring (found with
 *   an iterative Tarjan walk), each with its own cyclomatic number;
 * - attachment points: ring atoms with neighbours outside the rings.
 *
 * Classification (classifyRings()), in this order of precedence:
 * `acyclic`; `bridged`, then `fused` (a ring block with two or more rings:
 * fused when every branch atom of the block is bonded to another branch
 * atom, as in decalin; bridged otherwise, as in norbornane — a heuristic
 * that is exact for bicycles and enough for the scope messages); `spiro`
 * (two ring blocks share one atom); `several` (two or more separate rings:
 * ring assemblies such as biphenyl, or rings joined by a chain); and, for a
 * single simple ring, `heterocycle` (a ring atom is not carbon) or
 * `carbocycle`. Every block is examined, so a mixed system gets the kind of
 * its highest-precedence part whatever the atom ids: a fused block joined to
 * a bridged one is `bridged`; a polycyclic block plus other rings (joined by
 * a bond or sharing an atom) is still `fused`/`bridged`, never `spiro` or
 * `several`. Only `acyclic` and `carbocycle` are in scope (§13.1).
 *
 * Pure: reads atom ids, elements and bonds only, never coordinates or the
 * DOM. Every walk is iterative and bounded by the number of atoms and bonds.
 */

import { adjacency, connectedComponents } from './graph.js';

/** Ring-system kinds returned by classifyRings(). */
export const RING_KINDS = Object.freeze(['acyclic', 'carbocycle', 'heterocycle', 'fused', 'bridged', 'spiro', 'several']);

/**
 * Builds a breadth-first spanning forest and returns its non-tree bonds.
 *
 * @param {Map<number, object[]>} adj - Adjacency from graph.js adjacency().
 * @returns {{parent: Map<number, {atom: number, bond: number}|null>, depth: Map<number, number>,
 *   closures: {bond: number, a: number, b: number, order: number}[]}} Tree parents (atom and bond),
 *   depths, and the closure bonds in discovery order (`a` found first).
 */
function spanningForest(adj) {
  const parent = new Map();
  const depth = new Map();
  const treeBonds = new Set();
  const closures = [];
  const seenBonds = new Set();
  for (const root of adj.keys()) {
    if (parent.has(root)) {
      continue;
    }
    parent.set(root, null);
    depth.set(root, 0);
    const queue = [root];
    for (let i = 0; i < queue.length; i += 1) {
      const current = queue[i];
      for (const n of adj.get(current)) {
        if (!parent.has(n.atom)) {
          parent.set(n.atom, { atom: current, bond: n.bond });
          depth.set(n.atom, depth.get(current) + 1);
          treeBonds.add(n.bond);
          seenBonds.add(n.bond);
          queue.push(n.atom);
        } else if (!treeBonds.has(n.bond) && !seenBonds.has(n.bond)) {
          seenBonds.add(n.bond);
          closures.push({ bond: n.bond, a: n.atom, b: current, order: n.order });
        }
      }
    } // End of the breadth-first walk over one component
  } // End of the loop over the component roots
  return { parent, depth, closures };
} // End of function spanningForest()

/**
 * The fundamental cycle closed by one closure bond: the tree paths from both
 * ends up to their lowest common ancestor, plus the closure bond.
 *
 * @param {{parent: Map, depth: Map}} forest - From spanningForest().
 * @param {{bond: number, a: number, b: number}} closure - The closure bond.
 * @returns {{atoms: number[], bonds: number[], closure: number}} Atoms in cycle order starting at the
 *   closure's `a` end, and `bonds[i]` joining `atoms[i]` to `atoms[i + 1]` (the last one, the closure,
 *   joins the last atom back to the first).
 */
function fundamentalCycle(forest, closure) {
  const up = (atom) => forest.parent.get(atom);
  const left = [closure.a];
  const leftBonds = [];
  const right = [closure.b];
  const rightBonds = [];
  let x = closure.a;
  let y = closure.b;
  while (forest.depth.get(x) > forest.depth.get(y)) {
    leftBonds.push(up(x).bond);
    x = up(x).atom;
    left.push(x);
  }
  while (forest.depth.get(y) > forest.depth.get(x)) {
    rightBonds.push(up(y).bond);
    y = up(y).atom;
    right.push(y);
  }
  while (x !== y) {
    leftBonds.push(up(x).bond);
    x = up(x).atom;
    left.push(x);
    rightBonds.push(up(y).bond);
    y = up(y).atom;
    right.push(y);
  } // End of the climb to the lowest common ancestor
  // left ends at the ancestor; right ends at it too (drop the duplicate) and is walked back down.
  const atoms = [...left, ...right.slice(0, -1).reverse()];
  const bonds = [...leftBonds, ...rightBonds.reverse(), closure.bond];
  return { atoms, bonds, closure: closure.bond };
} // End of function fundamentalCycle()

/**
 * Biconnected components (blocks) of the bond graph, with an iterative
 * Tarjan walk (explicit stack; no recursion).
 *
 * @param {Map<number, object[]>} adj - Adjacency from graph.js adjacency().
 * @returns {number[][]} Each block as its bond ids (a bridge is a one-bond block).
 */
function biconnectedBlocks(adj) {
  const disc = new Map();
  const low = new Map();
  const blocks = [];
  let time = 0;
  for (const root of adj.keys()) {
    if (disc.has(root)) {
      continue;
    }
    disc.set(root, time);
    low.set(root, time);
    time += 1;
    const stack = [{ atom: root, viaBond: null, next: 0 }];
    const edges = [];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const list = adj.get(frame.atom);
      if (frame.next < list.length) {
        const n = list[frame.next];
        frame.next += 1;
        if (n.bond === frame.viaBond) {
          continue;
        }
        if (!disc.has(n.atom)) {
          edges.push(n.bond);
          disc.set(n.atom, time);
          low.set(n.atom, time);
          time += 1;
          stack.push({ atom: n.atom, viaBond: n.bond, next: 0 });
        } else if (disc.get(n.atom) < disc.get(frame.atom)) {
          // Back bond to an ancestor, seen from the descendant (once).
          edges.push(n.bond);
          low.set(frame.atom, Math.min(low.get(frame.atom), disc.get(n.atom)));
        }
      } else {
        stack.pop();
        if (stack.length > 0) {
          const above = stack[stack.length - 1];
          low.set(above.atom, Math.min(low.get(above.atom), low.get(frame.atom)));
          if (low.get(frame.atom) >= disc.get(above.atom)) {
            const block = [];
            let bond;
            do {
              bond = edges.pop();
              block.push(bond);
            } while (bond !== frame.viaBond);
            blocks.push(block);
          }
        }
      }
    } // End of the depth-first walk over one component
  } // End of the loop over the component roots
  return blocks;
} // End of function biconnectedBlocks()

/**
 * Perceives the rings of a molecule (any molecule: disconnected, polycyclic…).
 *
 * @param {object} mol - The molecule (structurally valid: validate.js validateStructure()).
 * @returns {{
 *   cyclomatic: number,
 *   components: {atoms: number[], cyclomatic: number}[],
 *   cyclicComponents: number[][],
 *   rings: {atoms: number[], bonds: number[], closure: number}[],
 *   closureBonds: number[],
 *   blocks: {atoms: number[], bonds: number[], cyclomatic: number}[],
 *   ringAtoms: number[],
 *   ringBonds: number[],
 *   attachments: {atom: number, neighbours: number[]}[],
 * }} Perception: total and per-component cyclomatic numbers; the cyclic components; one ordered
 *   ring per closure bond (fundamental cycles); the ring blocks (biconnected components with a
 *   ring); every ring atom and ring bond (ascending); and the ring atoms carrying non-ring
 *   neighbours (ascending).
 */
export function perceiveRings(mol) {
  const adj = adjacency(mol);
  const bondsOf = new Map([...mol.bonds.values()].filter((b) => adj.has(b.a) && adj.has(b.b)).map((b) => [b.id, b]));
  const components = connectedComponents(mol).map((atoms) => {
    const inside = new Set(atoms);
    const bonds = [...bondsOf.values()].filter((b) => inside.has(b.a)).length;
    return { atoms, cyclomatic: bonds - atoms.length + 1 };
  });
  const forest = spanningForest(adj);
  const rings = forest.closures.map((closure) => fundamentalCycle(forest, closure));
  const blocks = biconnectedBlocks(adj)
    .map((bonds) => {
      const atoms = new Set();
      for (const id of bonds) {
        atoms.add(bondsOf.get(id).a);
        atoms.add(bondsOf.get(id).b);
      }
      return {
        atoms: [...atoms].sort((p, q) => p - q),
        bonds: [...bonds].sort((p, q) => p - q),
        cyclomatic: bonds.length - atoms.size + 1,
      };
    })
    .filter((block) => block.cyclomatic > 0)
    .sort((p, q) => p.atoms[0] - q.atoms[0]);
  const ringAtomSet = new Set(blocks.flatMap((block) => block.atoms));
  const ringBondSet = new Set(blocks.flatMap((block) => block.bonds));
  const attachments = [...ringAtomSet]
    .sort((p, q) => p - q)
    .map((atom) => ({
      atom,
      neighbours: adj.get(atom).filter((n) => !ringBondSet.has(n.bond)).map((n) => n.atom),
    }))
    .filter((entry) => entry.neighbours.length > 0);
  return {
    cyclomatic: components.reduce((sum, c) => sum + c.cyclomatic, 0),
    components,
    cyclicComponents: components.filter((c) => c.cyclomatic > 0).map((c) => c.atoms),
    rings,
    closureBonds: rings.map((ring) => ring.closure),
    blocks,
    ringAtoms: [...ringAtomSet].sort((p, q) => p - q),
    ringBonds: [...ringBondSet].sort((p, q) => p - q),
    attachments,
  };
} // End of function perceiveRings()

/**
 * Tells whether a polycyclic ring block is fused (rings sharing bonds, as in
 * decalin or naphthalene) rather than bridged (norbornane, adamantane): every
 * branch atom of the block (three or more ring bonds inside it) must be
 * bonded to another branch atom. Exact for bicycles (the two branch atoms
 * are bonded only when the rings share a bond); a heuristic beyond.
 *
 * @param {object} mol - The molecule.
 * @param {{atoms: number[], bonds: number[]}} block - A ring block with cyclomatic number ≥ 2.
 * @returns {boolean} True for a fused block.
 */
function isFusedBlock(mol, block) {
  const inBlock = new Set(block.bonds);
  const neighbours = new Map(block.atoms.map((id) => [id, []]));
  for (const id of inBlock) {
    const bond = mol.bonds.get(id);
    neighbours.get(bond.a).push(bond.b);
    neighbours.get(bond.b).push(bond.a);
  }
  const branch = new Set(block.atoms.filter((id) => neighbours.get(id).length >= 3));
  return [...branch].every((id) => neighbours.get(id).some((other) => branch.has(other)));
} // End of function isFusedBlock()

/**
 * Classifies the ring system of a molecule (see the file header for the
 * kinds and their precedence).
 *
 * @param {object} mol - The molecule (structurally valid).
 * @returns {{kind: string, hetero: boolean, perception: object}} The kind (one of RING_KINDS), whether
 *   some ring atom is not carbon, and the full perception (perceiveRings()).
 */
export function classifyRings(mol) {
  const perception = perceiveRings(mol);
  const hetero = perception.ringAtoms.some((id) => mol.atoms.get(id).element !== 'C');
  /**
   * Wraps a kind into the result.
   *
   * @param {string} kind - One of RING_KINDS.
   * @returns {{kind: string, hetero: boolean, perception: object}} The classification.
   */
  const result = (kind) => ({ kind, hetero, perception });
  const { blocks } = perception;
  if (blocks.length === 0) {
    return result('acyclic');
  }
  const poly = blocks.filter((block) => block.cyclomatic >= 2);
  if (poly.length > 0) {
    return result(poly.every((block) => isFusedBlock(mol, block)) ? 'fused' : 'bridged');
  }
  const seen = new Set();
  for (const block of blocks) {
    if (block.atoms.some((id) => seen.has(id))) {
      return result('spiro');
    }
    block.atoms.forEach((id) => seen.add(id));
  }
  if (blocks.length >= 2) {
    return result('several');
  }
  return result(hetero ? 'heterocycle' : 'carbocycle');
} // End of function classifyRings()
