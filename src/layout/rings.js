/**
 * @file Ring strategy of "Ordenar dibujo" (design.md §7): a named single
 * carbocycle drawn as a regular polygon with a fixed convention, plus the
 * default directions of its side chains. canonical.js places the side chains
 * (recursive zigzags, collision search) exactly as it does for a chain.
 *
 * Convention: locant 1 is the top vertex of the polygon and the numbering
 * runs clockwise on screen (y grows downwards), so the drawing reads like
 * the numbering chosen by the naming engine. Every side chain leaves its
 * ring atom outwards, along the bisector of the exterior angle (the radial
 * direction of a regular polygon); two side chains on one ring atom are
 * spread symmetrically inside the free exterior angle. A side chain never
 * enters the polygon: its first bond stays in the exterior sector
 * (ringBranchSector()) and no side-chain atom or bond may lie inside the
 * ring (ringIntrusions()).
 *
 * Pure: no DOM; only ringIntrusions() and drawnRing() read coordinates
 * (to check a drawing); the ring is never walked as a tree.
 */

import { adjacency, cyclomaticNumber, isConnected, monocycleOrder } from '../model/graph.js';

/** Direction of locant 1 from the ring centre: straight up (radians, y down). */
export const RING_START_ANGLE = -Math.PI / 2;

/** Numbering direction on screen: +1 = clockwise (angles grow clockwise with y down). */
export const RING_DIRECTION = 1;

/** Smallest angle between a side-chain bond and a ring bond at the same ring atom (radians). */
export const RING_SECTOR_MARGIN = Math.PI / 6;

/**
 * Circumradius of a regular polygon with `n` sides of length `length`.
 *
 * @param {number} n - Number of sides (ring size, ≥ 3).
 * @param {number} length - Side (bond) length.
 * @returns {number} The radius.
 */
export function ringRadius(n, length) {
  return length / (2 * Math.sin(Math.PI / n));
}

/**
 * Direction from the ring centre to the ring atom with a given index
 * (0 = locant 1), following the convention above.
 *
 * @param {number} i - Index of the atom in ring (numbering) order.
 * @param {number} n - Ring size.
 * @returns {number} The angle (radians, y down).
 */
export function ringAtomAngle(i, n) {
  return RING_START_ANGLE + (RING_DIRECTION * 2 * Math.PI * i) / n;
}

/**
 * Tells whether a molecule is one connected single ring (with tree side
 * chains) whose ring is exactly `ring`, given in ring order (consecutive
 * atoms bonded, the last one bonded back to the first).
 *
 * @param {object} mol - The molecule.
 * @param {number[]} ring - Candidate ring atoms in ring order.
 * @returns {boolean} True when the ring strategy applies.
 */
export function isSingleRing(mol, ring) {
  if (!Array.isArray(ring) || ring.length < 3 || new Set(ring).size !== ring.length) {
    return false;
  }
  if (!isConnected(mol) || cyclomaticNumber(mol) !== 1) {
    return false;
  }
  const adj = adjacency(mol);
  return ring.every((id, i) => {
    const next = ring[(i + 1) % ring.length];
    return adj.has(id) && adj.get(id).some((n) => n.atom === next);
  });
}

/**
 * Positions of the ring atoms on a regular polygon centred on the origin:
 * locant 1 at the top vertex, numbering clockwise, every side `length` long.
 *
 * @param {number[]} ring - Ring atoms in ring (numbering) order.
 * @param {number} length - Bond length.
 * @returns {Map<number, {x: number, y: number}>} Atom id → position.
 */
export function ringPolygon(ring, length) {
  const n = ring.length;
  const r = ringRadius(n, length);
  return new Map(ring.map((id, i) => {
    const a = ringAtomAngle(i, n);
    return [id, { x: r * Math.cos(a), y: r * Math.sin(a) }];
  }));
}

/**
 * Default directions of the side chains of one ring atom: outwards along
 * the bisector of the exterior angle, several branches spread evenly inside
 * that free angle (two branches: ± a sixth of it, 40° for a hexagon).
 *
 * @param {number} i - Index of the ring atom in ring order.
 * @param {number} n - Ring size.
 * @param {number} k - Number of side chains on that atom.
 * @returns {number[]} The k directions (radians, y down), clockwise order.
 */
export function ringBranchAngles(i, n, k) {
  const radial = ringAtomAngle(i, n);
  const gap = Math.PI + (2 * Math.PI) / n; // 360° minus the interior angle.
  return Array.from({ length: k }, (_, j) => radial + RING_DIRECTION * (gap * ((j + 1) / (k + 1) - 0.5)));
}

/**
 * Exterior sector of a ring atom: the directions a side-chain bond may take
 * from it, i.e. the free exterior angle less RING_SECTOR_MARGIN on each
 * side, so the bond never points into the polygon nor hugs a ring bond.
 *
 * @param {number} i - Index of the ring atom in ring order.
 * @param {number} n - Ring size.
 * @returns {{radial: number, limit: number}} Exterior bisector and the largest allowed deviation from it (radians).
 */
export function ringBranchSector(i, n) {
  const gap = Math.PI + (2 * Math.PI) / n;
  return { radial: ringAtomAngle(i, n), limit: gap / 2 - RING_SECTOR_MARGIN };
}

/**
 * Tells whether a direction lies inside a sector from ringBranchSector().
 *
 * @param {number} angle - The direction (radians).
 * @param {{radial: number, limit: number}} sector - The sector.
 * @returns {boolean} True when |angle − radial| ≤ limit (angles taken modulo 2π).
 */
export function inRingSector(angle, sector) {
  const full = 2 * Math.PI;
  const d = ((((angle - sector.radial + Math.PI) % full) + full) % full) - Math.PI;
  return Math.abs(d) <= sector.limit + 1e-9;
}

/**
 * Tells whether a point lies strictly inside a polygon (even-odd rule).
 *
 * @param {{x: number, y: number}} p - The point.
 * @param {Array<{x: number, y: number}>} polygon - Vertices in order.
 * @returns {boolean} True when inside.
 */
function insidePolygon(p, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Counts how a drawing intrudes into its ring: side-chain atoms inside the
 * ring polygon plus side-chain bonds whose midpoint is inside it (a bond
 * pointing into the ring from a ring atom). A bond passing through the ring
 * with both ends outside crosses ring bonds, which the crossing check reports.
 *
 * @param {Map<number, {x: number, y: number}>} pos - Positions of every atom.
 * @param {number[]} ring - Ring atoms in ring order.
 * @param {Array<number[]>} bonds - Bonds as atom-id pairs.
 * @returns {number} The number of intrusions (0 when the ring interior is empty).
 */
export function ringIntrusions(pos, ring, bonds) {
  const polygon = ring.map((id) => pos.get(id));
  const inRing = new Set(ring);
  let count = 0;
  for (const [id, p] of pos) {
    if (!inRing.has(id) && insidePolygon(p, polygon)) {
      count += 1;
    }
  }
  for (const [a, b] of bonds) {
    if (!(inRing.has(a) && inRing.has(b))) {
      const p = pos.get(a);
      const q = pos.get(b);
      if (insidePolygon({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, polygon)) {
        count += 1;
      }
    }
  }
  return count;
} // End of function ringIntrusions()

/**
 * The ring of a drawn molecule, when it is one connected single ring.
 *
 * @param {object} mol - The molecule.
 * @returns {number[]|null} Ring atoms in ring order, or null for a tree, a polycycle or a disconnected drawing.
 */
export function drawnRing(mol) {
  if (mol.atoms.size < 3 || !isConnected(mol) || cyclomaticNumber(mol) !== 1) {
    return null;
  }
  try {
    return monocycleOrder(adjacency(mol)).atoms;
  } catch {
    return null; // Two bonds between the same pair: not a polygon to check.
  }
}
