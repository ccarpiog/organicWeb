/**
 * @file Redraw ("Ordenar dibujo", design.md §7): the parent chain as a
 * horizontal zigzag with locant 1 on the left, substituents drawn away from
 * it on the free side, recursively as zigzags, and linear centres (triple
 * bonds, cumulated double bonds) straightened.
 *
 * Collisions are resolved by a small local search over per-atom choices:
 * every substituent atom may flip the zigzag side of its own subtree and
 * turn its bond by a wider angle (±15°, ±30°, ±45°, ±60°), which rotates its
 * whole subtree. Starting from the default drawing, atoms are visited from
 * the parent outwards and the choice that most reduces the crowding penalty
 * (atoms closer than TARGET_SEPARATION bond lengths, bond crossings) is kept,
 * flips before widenings, until the drawing is clear or nothing improves.
 * If the result still has a crossing or atoms closer than MIN_SEPARATION,
 * the search restarts from other starting drawings with wider angles; the
 * caller checks layoutProblems() and refuses a layout that stays invalid.
 * An atom that continues a linear centre never turns.
 *
 * The parent is laid out by strategy: an open chain as the zigzag above, a
 * named single carbocycle (design.md §7, I-27b) as a regular polygon from
 * rings.js (locant 1 at the top, numbering clockwise) with its side chains
 * leaving outwards; the side chains of both are placed and searched by the
 * same code. For a ring, the branches of every atom are visited in the order
 * of their canonical keys (attachment bond order first), so the drawing does
 * not depend on atom ids. A ring side chain never enters the polygon: the
 * search only turns its first bond inside the exterior sector of its ring
 * atom, and a drawing with a side-chain atom or bond inside the ring is
 * penalised and never valid (layoutProblems() reports it too).
 *
 * A ring that is a substituent of a chain parent (design.md §13.4 I-40a:
 * `ciclohexil`, `fenil`) is drawn whole as a regular polygon hung from the
 * atom that carries it, its attachment atom on the line of that bond and
 * its atoms in the locant order of the ring prefix (branchRing()); its own
 * side chains leave outwards and are searched like any other; the search
 * may mirror the polygon (the zigzag flip of its attachment atom).
 *
 * Pure: no DOM. Only coordinates change; atom ids, bonds and orders are
 * copied unchanged. Coordinates are SVG drawing units (y grows downwards).
 */

import { cloneMolecule } from '../model/molecule.js';
import { adjacency, isTree, rootedBranchKey } from '../model/graph.js';
import { BOND_LENGTH } from '../editor/geometry.js';
import {
  isSingleRing, ringPolygon, ringBranchAngles, ringBranchSector, inRingSector, ringIntrusions, drawnRing,
} from './rings.js';

/** Zigzag half-angle of the parent chain: bonds go ±30° from the horizontal. */
const ZIGZAG = Math.PI / 6;

/** Bend between consecutive bonds of a substituent zigzag (120° bond angles). */
const BEND = Math.PI / 3;

/** Minimum wanted distance between two atoms, in bond lengths. */
export const TARGET_SEPARATION = 0.8;

/** Angle offsets a substituent bond may take, in the order they are preferred (radians). */
const WIDENINGS = [0, 15, -15, 30, -30, 45, -45, 60, -60].map((d) => (d * Math.PI) / 180);

/** Wider set of offsets, used when the default search cannot clear the drawing. */
const WIDE_WIDENINGS = [0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75, 90, -90, 120, -120].map((d) => (d * Math.PI) / 180);

/** Minimum distance between two atoms of a valid layout, in bond lengths (design.md §7). */
export const MIN_SEPARATION = 0.5;

/** Maximum number of improvement passes of the local search. */
const MAX_PASSES = 12;

/**
 * Tells whether an atom is a linear centre (a triple bond or two double bonds).
 *
 * @param {Map<number, object[]>} adj - Adjacency from adjacency().
 * @param {number} id - The atom.
 * @returns {boolean} True when its bonds must be drawn at 180°.
 */
function isLinear(adj, id) {
  const orders = adj.get(id).map((n) => n.order);
  return orders.includes(3) || orders.filter((o) => o === 2).length >= 2;
}

/**
 * Point at a given angle and distance from an origin.
 *
 * @param {{x: number, y: number}} p - Origin.
 * @param {number} angle - Direction (radians, y down).
 * @param {number} length - Distance.
 * @returns {{x: number, y: number}} The point.
 */
function step(p, angle, length) {
  return { x: p.x + length * Math.cos(angle), y: p.y + length * Math.sin(angle) };
}

/**
 * Normalises an angle to [0, 2π).
 *
 * @param {number} a - Angle in radians.
 * @returns {number} The same direction in [0, 2π).
 */
function wrap(a) {
  const full = 2 * Math.PI;
  return ((a % full) + full) % full;
}

/**
 * Directions for `k` new bonds around an atom whose existing bonds point at
 * `occupied`: evenly spread inside the largest free angular gap.
 *
 * @param {number[]} occupied - Directions of the bonds already drawn (radians).
 * @param {number} k - Number of new bonds.
 * @returns {number[]} The k directions.
 */
export function spreadInGap(occupied, k) {
  if (occupied.length === 0) {
    return Array.from({ length: k }, (_, j) => -Math.PI / 2 + (2 * Math.PI * j) / k);
  }
  const sorted = occupied.map(wrap).sort((p, q) => p - q);
  let start = sorted[sorted.length - 1];
  let size = sorted[0] + 2 * Math.PI - start;
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] - sorted[i - 1] > size + 1e-9) {
      start = sorted[i - 1];
      size = sorted[i] - sorted[i - 1];
    }
  }
  return Array.from({ length: k }, (_, j) => start + (size * (j + 1)) / (k + 1));
} // End of function spreadInGap()

/**
 * Tells whether segments p1–p2 and q1–q2 cross properly (touching does not count).
 *
 * @param {object} p1 - First segment start.
 * @param {object} p2 - First segment end.
 * @param {object} q1 - Second segment start.
 * @param {object} q2 - Second segment end.
 * @returns {boolean} True when they cross.
 */
function segmentsCross(p1, p2, q1, q2) {
  const side = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = side(q1, q2, p1);
  const d2 = side(q1, q2, p2);
  const d3 = side(p1, p2, q1);
  const d4 = side(p1, p2, q2);
  const eps = 1e-6;
  return ((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps));
}

/**
 * Directions of the bonds from a branch atom to its children, given the
 * direction of the bond that reached it: one child continues the zigzag
 * (a 60° bend to the `turn` side), a linear centre continues straight, and
 * several children are spread evenly around the atom.
 *
 * @param {boolean} linear - Whether the atom is a linear centre.
 * @param {number} angle - Direction of the incoming bond (from its parent to it).
 * @param {number} turn - Zigzag side (+1 or −1).
 * @param {number} k - Number of children.
 * @returns {{angle: number, turn: number}[]} Default direction and zigzag side of each child.
 */
function childDirections(linear, angle, turn, k) {
  if (k === 0) {
    return [];
  }
  if (linear || k === 1) {
    return [{ angle: angle + (linear ? 0 : turn * BEND), turn: linear ? turn : -turn }];
  }
  const result = [];
  for (let j = 0; j < k; j += 1) {
    const offset = Math.PI + (2 * Math.PI * (j + 1)) / (k + 1);
    const a = angle + (turn > 0 ? offset : -offset);
    const bend = wrap(a - angle + Math.PI) - Math.PI;
    result.push({ angle: a, turn: bend > 1e-9 ? -1 : bend < -1e-9 ? 1 : turn });
  }
  return result;
} // End of function childDirections()

/**
 * Lays out the parent chain: a horizontal zigzag from left to right (locant
 * 1 first); bonds touching a linear centre are drawn horizontally, so the
 * centre is straight.
 *
 * @param {Map<number, object[]>} adj - Adjacency.
 * @param {number[]} chain - Parent atoms in locant order.
 * @param {number} length - Bond length.
 * @returns {Map<number, {x: number, y: number}>} Positions of the parent atoms.
 */
function layoutParent(adj, chain, length) {
  const pos = new Map([[chain[0], { x: 0, y: 0 }]]);
  let lastSign = 1;
  for (let i = 1; i < chain.length; i += 1) {
    let angle = 0;
    if (!isLinear(adj, chain[i - 1]) && !isLinear(adj, chain[i])) {
      lastSign = -lastSign;
      angle = lastSign * ZIGZAG;
    }
    pos.set(chain[i], step(pos.get(chain[i - 1]), angle, length));
  }
  return pos;
} // End of function layoutParent()

/**
 * Crowding penalty of a drawing: Σ (target − d)² over atom pairs closer
 * than the target distance (tripled below half a target, where atoms start
 * to hide each other), plus a cost per bond crossing equal to that of two
 * atoms a third of a target too close.
 *
 * @param {Map<number, {x: number, y: number}>} pos - Positions of every atom.
 * @param {Array<number[]>} bonds - Bonds as atom-id pairs.
 * @param {number} target - Wanted minimum distance.
 * @returns {number} The penalty (0 when the drawing is clear).
 */
function crowding(pos, bonds, target) {
  const points = [...pos.values()];
  let penalty = 0;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      if (d < target) {
        penalty += (target - d) ** 2 * (d < target / 2 ? 3 : 1);
      }
    }
  }
  for (let i = 0; i < bonds.length; i += 1) {
    const [a, b] = bonds[i];
    for (let j = i + 1; j < bonds.length; j += 1) {
      const [c, d] = bonds[j];
      if (a !== c && a !== d && b !== c && b !== d && segmentsCross(pos.get(a), pos.get(b), pos.get(c), pos.get(d))) {
        penalty += (target * target) / 4;
      }
    }
  }
  return penalty;
} // End of function crowding()

/**
 * Counts proper crossings between bonds that share no atom.
 *
 * @param {Map<number, {x: number, y: number}>} pos - Positions of every atom.
 * @param {Array<number[]>} bonds - Bonds as atom-id pairs.
 * @returns {number} The number of crossing bond pairs.
 */
function countCrossings(pos, bonds) {
  let count = 0;
  for (let i = 0; i < bonds.length; i += 1) {
    const [a, b] = bonds[i];
    for (let j = i + 1; j < bonds.length; j += 1) {
      const [c, d] = bonds[j];
      if (a !== c && a !== d && b !== c && b !== d && segmentsCross(pos.get(a), pos.get(b), pos.get(c), pos.get(d))) {
        count += 1;
      }
    }
  }
  return count;
} // End of function countCrossings()

/**
 * Tells whether a drawing is valid: no bond crossings, no two atoms closer
 * than MIN_SEPARATION bond lengths and, for a ring, nothing inside the ring.
 *
 * @param {Map<number, {x: number, y: number}>} pos - Positions of every atom.
 * @param {Array<number[]>} bonds - Bonds as atom-id pairs.
 * @param {number} length - Bond length.
 * @param {number[]|null} [ring] - Ring atoms in ring order, or null for a chain.
 * @returns {boolean} True when valid.
 */
function isClear(pos, bonds, length, ring = null) {
  if (ring && ringIntrusions(pos, ring, bonds) > 0) {
    return false;
  }
  const points = [...pos.values()];
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      if (Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) < MIN_SEPARATION * length) {
        return false;
      }
    }
  }
  return countCrossings(pos, bonds) === 0;
}

/**
 * Drawing problems of a molecule: its closest atom pair, its bond crossings
 * and, for a single ring, the side-chain atoms and bonds drawn inside it.
 *
 * @param {object} mol - The molecule.
 * @param {number} [length] - Bond length (default BOND_LENGTH).
 * @returns {{closest: number, crossings: number, inside: number, ok: boolean}} Closest distance (drawing
 *   units), number of crossing bond pairs, number of ring intrusions (ringIntrusions(); 0 without a single
 *   ring), and whether the drawing is valid (no crossing, no intrusion, no atoms closer than MIN_SEPARATION).
 */
export function layoutProblems(mol, length = BOND_LENGTH) {
  const pos = new Map([...mol.atoms.values()].map((a) => [a.id, { x: a.x, y: a.y }]));
  const bonds = [...mol.bonds.values()].map((b) => [b.a, b.b]);
  const closest = closestApproach(mol);
  const crossings = countCrossings(pos, bonds);
  const ring = drawnRing(mol);
  const inside = ring ? ringIntrusions(pos, ring, bonds) : 0;
  return { closest, crossings, inside, ok: crossings === 0 && inside === 0 && closest >= MIN_SEPARATION * length };
}

/**
 * The ring prefix of a naming result whose parent is a chain (design.md
 * §13.4 I-40a): the ring atoms in the locant order of that prefix (the
 * attachment atom first), at any depth of the prefixes; null when there is
 * none.
 *
 * @param {object} structure - A name or substituent structure.
 * @returns {number[]|null} The ring atoms.
 */
function branchRing(structure) {
  for (const group of structure.prefixes) {
    const sub = group.substituent;
    if (sub.ring) {
      return [...sub.chain.atoms];
    }
    const inner = branchRing(sub);
    if (inner) {
      return inner;
    }
  }
  return null;
} // End of function branchRing()

/**
 * Computes canonical coordinates for a named molecule (design.md §7).
 *
 * @param {object} mol - The molecule (not mutated).
 * @param {object} result - Its successful naming result (nameMolecule()); only `parent.atoms` is read.
 * @param {{bondLength?: number, center?: {x: number, y: number}}} [options] - Bond length
 *   (default BOND_LENGTH) and the point the drawing is centred on (default: the centre of the
 *   molecule's current bounding box).
 * @returns {object} A copy of the molecule with new coordinates (same ids, bonds and orders).
 * @throws {Error} When the result is not a successful naming of this molecule, or the molecule is
 *   neither a connected tree nor a single ring whose ring is the parent.
 */
export function canonicalLayout(mol, result, options = {}) {
  if (!result || !result.ok || !result.parent || !Array.isArray(result.parent.atoms)) {
    throw new Error('canonicalLayout: a successful naming result is required');
  }
  const L = options.bondLength || BOND_LENGTH;
  const adj = adjacency(mol);
  const chain = result.parent.atoms;
  const ring = !isTree(mol);
  // A ring prefix on a chain parent (design.md §13.4 I-40a), drawn whole where the walk reaches it.
  const subRing = ring && !isSingleRing(mol, chain) && result.structure ? branchRing(result.structure) : null;
  if (ring && !isSingleRing(mol, chain) && !(subRing && isSingleRing(mol, subRing))) {
    // The breadth-first walk below assumes trees around the parent: another cycle would make it loop.
    throw new Error('canonicalLayout: the molecule is not a connected tree or a single ring');
  }
  const subRingSet = new Set(subRing || []);
  if (chain.length === 0 || chain.some((id) => !adj.has(id))) {
    throw new Error('canonicalLayout: the parent chain does not belong to this molecule');
  }
  const parentRing = ring && !subRing;
  const parentPos = parentRing ? ringPolygon(chain, L) : layoutParent(adj, chain, L);
  const inChain = new Set(chain);
  const n = chain.length;
  /**
   * Atoms bonded to `id` other than `up`; for a ring, sorted by the order of their bond to `id`, then
   * by the rooted key of their branch (id-independent: equal keys mean interchangeable branches).
   *
   * @param {number} id - The atom.
   * @param {number|null} up - The neighbour to leave out.
   * @param {Set<number>} [skip] - Further atoms to leave out.
   * @returns {number[]} The branch atoms.
   */
  const branchesOf = (id, up, skip) => {
    const links = adj.get(id).filter((b) => b.atom !== up && !(skip && skip.has(b.atom)));
    const atoms = links.map((b) => b.atom);
    if (!ring) {
      return atoms;
    }
    // The attachment bond order is part of the key: `=CH2` and `–CH3` have equal rooted keys.
    const keys = new Map(links.map((b) => [b.atom, `${b.order}${rootedBranchKey(mol, b.atom, id, adj)}`]));
    return atoms.sort((p, q) => (keys.get(p) < keys.get(q) ? -1 : keys.get(p) > keys.get(q) ? 1 : 0));
  };

  // Substituent atoms from the parent outwards: where each hangs from and its children.
  const bonds = parentRing ? chain.map((id, i) => [id, chain[(i + 1) % n]]) : chain.slice(1).map((id, i) => [chain[i], id]);
  const order = [];
  const from = new Map();
  const children = new Map();
  const roots = []; // Per parent atom: [{id, angle, turn, sector}] default placement of its branches.
  chain.forEach((id, i) => {
    const branches = branchesOf(id, null, inChain);
    if (parentRing) {
      // Outwards along the exterior bisector; two branches bend away from each other.
      ringBranchAngles(i, n, branches.length).forEach((angle, j) => {
        roots.push({
          id: branches[j], parent: id, angle, turn: j < (branches.length - 1) / 2 ? -1 : 1, sector: ringBranchSector(i, n),
        });
      });
      return;
    }
    const here = parentPos.get(id);
    const occupied = [chain[i - 1], chain[i + 1]]
      .filter((a) => a !== undefined)
      .map((a) => Math.atan2(parentPos.get(a).y - here.y, parentPos.get(a).x - here.x));
    spreadInGap(occupied, branches.length).forEach((angle, j) => {
      roots.push({ id: branches[j], parent: id, angle, turn: i % 2 === 0 ? 1 : -1, sector: null });
    });
  }); // End of the loop placing the branches of every parent atom
  const queue = roots.map((r) => [r.id, r.parent]);
  const ringHome = new Map(); // A side-chain atom of a ring prefix → the ring atom that carries it.
  for (let q = 0; q < queue.length; q += 1) {
    if (queue.length > mol.atoms.size) {
      throw new Error('canonicalLayout: the molecule is not a connected tree or a single ring');
    }
    const [id, up] = queue[q];
    order.push(id);
    from.set(id, up);
    bonds.push([up, id]);
    if (subRing && id === subRing[0]) {
      // The ring prefix: its bonds, then the side chains of every ring atom, in locant order.
      subRing.forEach((a, i) => bonds.push([a, subRing[(i + 1) % subRing.length]]));
      const kids = [];
      for (const a of subRing) {
        for (const kid of branchesOf(a, a === id ? up : null, subRingSet)) {
          kids.push(kid);
          ringHome.set(kid, a);
        }
      }
      children.set(id, kids);
      kids.forEach((kid) => queue.push([kid, ringHome.get(kid)]));
      continue;
    }
    const kids = branchesOf(id, up);
    children.set(id, kids);
    for (const kid of kids) {
      queue.push([kid, id]);
    }
  } // End of the breadth-first walk over the substituent atoms
  if (order.length + chain.length + Math.max(subRing ? subRing.length - 1 : 0, 0) !== mol.atoms.size) {
    throw new Error('canonicalLayout: the molecule is not a connected tree or a single ring');
  }

  // Per substituent atom: [widening index, flipped]; all start at the default drawing.
  let choice = new Map(order.map((id) => [id, [0, false]]));
  let widenings = WIDENINGS;
  let rootAngles = roots.map((r) => r.angle);
  const rootIndex = new Map(roots.map((r, i) => [r.id, i]));
  const ringAtoms = ring ? subRing || chain : null;

  /**
   * Tells whether a widening keeps a ring side chain's first bond in the exterior sector of its ring atom.
   *
   * @param {number} id - A substituent atom.
   * @param {number} w - Index into the current widenings.
   * @returns {boolean} False only for a ring root turned towards (or too close to) the ring.
   */
  const allowed = (id, w) => {
    const i = rootIndex.get(id);
    return i === undefined || !roots[i].sector || inRingSector(rootAngles[i] + widenings[w], roots[i].sector);
  };

  /**
   * Penalty of a drawing: its crowding plus, for a ring, a heavy cost per side-chain atom or bond inside it.
   *
   * @param {Map<number, {x: number, y: number}>} pos - Positions of every atom.
   * @returns {number} The penalty (0 when the drawing is clear).
   */
  const penaltyOf = (pos) => {
    const target = TARGET_SEPARATION * L;
    const base = crowding(pos, bonds, target);
    return ringAtoms ? base + 4 * target * target * ringIntrusions(pos, ringAtoms, bonds) : base;
  };

  /**
   * Positions of every atom for the current choices.
   *
   * @returns {Map<number, {x: number, y: number}>} Atom id → position.
   */
  function positions() {
    const pos = new Map(parentPos);
    /**
     * Places one substituent atom and its subtree.
     *
     * @param {number} id - The atom.
     * @param {number} angle - Default direction of its bond.
     * @param {number} turn - Default zigzag side of its children.
     * @param {boolean} fixed - True when it continues a linear centre (no turning).
     * @returns {void}
     */
    function put(id, angle, turn, fixed) {
      const [w, flipped] = choice.get(id);
      const actual = angle + (fixed ? 0 : widenings[w]);
      const side = flipped ? -turn : turn;
      pos.set(id, step(pos.get(from.get(id)), actual, L));
      const kids = children.get(id);
      if (subRing && id === subRing[0]) {
        putRing(actual, side, kids);
        return;
      }
      const linear = isLinear(adj, id);
      childDirections(linear, actual, side, kids.length).forEach((dir, j) => put(kids[j], dir.angle, dir.turn, linear));
    } // End of function put()
    /**
     * Places a ring prefix (design.md §13.4 I-40a) as a regular polygon
     * beyond its attachment atom (already placed), along the attachment
     * bond, winding one way or the other (`side`), then its side chains
     * outwards: one along the radial line, two ±30° from it; a second
     * exocyclic bond on the attachment atom 60° from the carrying bond.
     *
     * @param {number} angle - Direction of the attachment bond.
     * @param {number} side - Winding of the polygon (1 or −1).
     * @param {number[]} kids - The side-chain atoms of the ring (ringHome() gives their ring atom).
     * @returns {void}
     */
    function putRing(angle, side, kids) {
      const m = subRing.length;
      const radius = L / (2 * Math.sin(Math.PI / m));
      const centre = step(pos.get(subRing[0]), angle, radius);
      const radial = (k) => angle + Math.PI + side * k * ((2 * Math.PI) / m);
      subRing.forEach((a, k) => {
        if (k > 0) {
          pos.set(a, step(centre, radial(k), radius));
        }
      });
      subRing.forEach((a, k) => {
        const own = kids.filter((kid) => ringHome.get(kid) === a);
        let dirs = own.length === 1 ? [radial(k)] : [radial(k) - Math.PI / 6, radial(k) + Math.PI / 6];
        if (k === 0) {
          dirs = own.map(() => radial(0) + side * (Math.PI / 3)); // Beside the carrying bond (at most one).
        }
        own.forEach((kid, j) => put(kid, dirs[j], j === 0 ? -1 : 1, false));
      });
    } // End of function putRing()
    roots.forEach((root, i) => put(root.id, rootAngles[i], root.turn, false));
    return pos;
  } // End of function positions()

  /**
   * Local search from the current choices: per atom, keep the choice that
   * lowers the crowding the most, until the drawing is clear or nothing improves.
   *
   * @returns {number} The final crowding penalty.
   */
  function search() {
    let best = penaltyOf(positions());
    for (let pass = 0; pass < MAX_PASSES && best > 1e-9; pass += 1) {
      let improved = false;
      for (const id of order) {
        const current = choice.get(id);
        let pick = current;
        for (let w = 0; w < widenings.length; w += 1) {
          for (const flipped of [false, true]) {
            if ((w === current[0] && flipped === current[1]) || !allowed(id, w)) {
              continue;
            }
            choice.set(id, [w, flipped]);
            const penalty = penaltyOf(positions());
            if (penalty < best - 1e-9) {
              best = penalty;
              pick = [w, flipped];
              improved = true;
            }
          }
        } // End of the loop over the choices of one atom
        choice.set(id, pick);
        if (best <= 1e-9) {
          break;
        }
      } // End of the loop over the substituent atoms
      if (!improved) {
        break;
      }
    } // End of the local search passes
    return best;
  } // End of function search()

  // Default start first; when the search stalls on an invalid drawing, retry
  // from other starts (every zigzag flipped, branches of each parent atom
  // swapped) with wider angles, and keep the first valid drawing (else the
  // least crowded one).
  const swapped = roots.map((r, i) => {
    const same = roots.map((q, j) => [q, j]).filter(([q]) => q.parent === r.parent);
    const k = same.findIndex(([, j]) => j === i);
    return rootAngles[same[same.length - 1 - k][1]];
  });
  const starts = [
    { flip: false, angles: rootAngles, widen: WIDENINGS },
    { flip: false, angles: rootAngles, widen: WIDE_WIDENINGS },
    { flip: true, angles: rootAngles, widen: WIDE_WIDENINGS },
    { flip: false, angles: swapped, widen: WIDE_WIDENINGS },
    { flip: true, angles: swapped, widen: WIDE_WIDENINGS },
  ];
  let kept = null;
  for (const start of starts) {
    widenings = start.widen;
    rootAngles = start.angles;
    choice = new Map(order.map((id) => [id, [0, start.flip]]));
    const penalty = search();
    const pos = positions();
    const valid = isClear(pos, bonds, L, ringAtoms);
    if (!kept || (valid && !kept.valid) || (valid === kept.valid && penalty < kept.penalty - 1e-9)) {
      kept = { pos, penalty, valid };
    }
    if (valid) {
      break;
    }
  } // End of the loop over the search starts

  // Centre the new drawing where the old one was.
  const pos = kept.pos;
  const centre = (points) => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  };
  const target = options.center || centre([...mol.atoms.values()]);
  const current = centre([...pos.values()]);
  const out = cloneMolecule(mol);
  for (const [id, p] of pos) {
    const atom = out.atoms.get(id);
    atom.x = p.x - current.x + target.x;
    atom.y = p.y - current.y + target.y;
  }
  return out;
} // End of function canonicalLayout()

/**
 * Smallest distance between two atoms of a molecule (Infinity with fewer than two atoms).
 *
 * @param {object} mol - The molecule.
 * @returns {number} The distance in drawing units.
 */
export function closestApproach(mol) {
  const atoms = [...mol.atoms.values()];
  let best = Infinity;
  for (let i = 0; i < atoms.length; i += 1) {
    for (let j = i + 1; j < atoms.length; j += 1) {
      best = Math.min(best, Math.hypot(atoms[i].x - atoms[j].x, atoms[i].y - atoms[j].y));
    }
  }
  return best;
}
