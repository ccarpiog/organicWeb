/**
 * @file Editor geometry (design.md §6.2): fixed bond length, 30° snapping,
 * zigzag-aware placement of new atoms, linear centres at 180°, overlap
 * avoidance, hit-testing and straightening of linear centres.
 *
 * Coordinates are SVG user units of the drawing (y grows downwards, so an
 * angle of −30° points up and to the right). Everything here is pure: no DOM.
 * This module is editor-only; the naming engine never imports it.
 */

import { neighbours } from '../model/molecule.js';

/** Bond length in drawing units (40 px at zoom 1). */
export const BOND_LENGTH = 40;

/** Snapping step for dragged bonds, in degrees. */
export const SNAP_DEGREES = 30;

/** A pointer closer than this to an atom centre hits the atom. */
export const ATOM_HIT_RADIUS = 12;

/** A pointer closer than this to a bond segment hits the bond. */
export const BOND_HIT_DISTANCE = 7;

/** A proposed atom closer than this to an existing atom counts as overlapping. */
export const MIN_CLEARANCE = BOND_LENGTH * 0.6;

/** Angle of the first bond grown from a lone atom: up and to the right. */
const FIRST_BOND_ANGLE = -Math.PI / 6;

const FULL_TURN = 2 * Math.PI;
const EPSILON = 1e-9;

/**
 * Converts degrees to radians.
 *
 * @param {number} degrees - Angle in degrees.
 * @returns {number} Angle in radians.
 */
export function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 *
 * @param {number} radians - Angle in radians.
 * @returns {number} Angle in degrees.
 */
export function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

/**
 * Normalises an angle to the range [0, 2π).
 *
 * @param {number} angle - Angle in radians.
 * @returns {number} The equivalent angle in [0, 2π).
 */
export function normalizeAngle(angle) {
  const result = angle % FULL_TURN;
  const positive = result < 0 ? result + FULL_TURN : result;
  // Values a hair below 2π are treated as 0 so snapped angles compare cleanly.
  return FULL_TURN - positive < EPSILON ? 0 : positive;
}

/**
 * Smallest absolute difference between two angles.
 *
 * @param {number} p - First angle in radians.
 * @param {number} q - Second angle in radians.
 * @returns {number} The difference in [0, π].
 */
export function angleDifference(p, q) {
  const d = normalizeAngle(p - q);
  return d > Math.PI ? FULL_TURN - d : d;
}

/**
 * Euclidean distance between two points.
 *
 * @param {{x: number, y: number}} p - First point.
 * @param {{x: number, y: number}} q - Second point.
 * @returns {number} The distance.
 */
export function distance(p, q) {
  return Math.hypot(q.x - p.x, q.y - p.y);
}

/**
 * Direction angle of the vector from one point to another.
 *
 * @param {{x: number, y: number}} from - Origin.
 * @param {{x: number, y: number}} to - Target.
 * @returns {number} Angle in radians, in (−π, π].
 */
export function angleBetween(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/**
 * Point at a given angle and distance from an origin.
 *
 * @param {{x: number, y: number}} origin - Origin.
 * @param {number} angle - Direction in radians.
 * @param {number} [length] - Distance (default BOND_LENGTH).
 * @returns {{x: number, y: number}} The point.
 */
export function pointAt(origin, angle, length = BOND_LENGTH) {
  return { x: origin.x + length * Math.cos(angle), y: origin.y + length * Math.sin(angle) };
}

/**
 * Snaps an angle to the nearest multiple of a step.
 *
 * @param {number} angle - Angle in radians.
 * @param {number} [stepDegrees] - Snapping step in degrees (default 30).
 * @returns {number} The snapped angle, normalised to [0, 2π).
 */
export function snapAngle(angle, stepDegrees = SNAP_DEGREES) {
  const step = toRadians(stepDegrees);
  return normalizeAngle(Math.round(angle / step) * step);
}

/**
 * End point of a dragged bond: fixed length, direction snapped to 30°.
 *
 * @param {{x: number, y: number}} start - Where the drag started (atom or empty space).
 * @param {{x: number, y: number}} pointer - Current pointer position.
 * @param {number} [length] - Bond length (default BOND_LENGTH).
 * @returns {{x: number, y: number}} The snapped end point.
 */
export function snapEndpoint(start, pointer, length = BOND_LENGTH) {
  return pointAt(start, snapAngle(angleBetween(start, pointer)), length);
}

/**
 * Signed area test: which side of the directed line p→q the point r is on.
 *
 * @param {{x: number, y: number}} p - Line start.
 * @param {{x: number, y: number}} q - Line end.
 * @param {{x: number, y: number}} r - Point to classify.
 * @returns {number} Positive on one side, negative on the other, ~0 on the line.
 */
export function cross(p, q, r) {
  return (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
}

/**
 * Tells whether an atom is (or would become) a linear centre: it carries a
 * triple bond, or two double bonds (cumulated). `extraOrder` adds a
 * hypothetical new bond of that order before deciding.
 *
 * @param {object} mol - The molecule.
 * @param {number} atomId - The atom.
 * @param {number} [extraOrder] - Order of a bond about to be added (0 for none).
 * @returns {boolean} True when the atom's bonds must be drawn at 180°.
 */
export function isLinearCentre(mol, atomId, extraOrder = 0) {
  const orders = neighbours(mol, atomId).map((n) => n.order);
  if (extraOrder > 0) {
    orders.push(extraOrder);
  }
  return orders.includes(3) || orders.filter((o) => o === 2).length >= 2;
}

/**
 * Chooses between the two ±120° candidates for an atom with one neighbour so
 * the chain keeps zigzagging: the new atom goes on the opposite side of the
 * neighbour bond from the neighbour's own other neighbour. Without such a
 * reference atom, the candidate pointing more to the right (then more
 * upwards) wins.
 *
 * @param {object} mol - The molecule.
 * @param {number} atomId - The atom being grown from.
 * @param {number} neighbourId - Its only neighbour.
 * @param {number[]} candidates - The two candidate angles.
 * @returns {number[]} The candidates, preferred first.
 */
function orderZigzagCandidates(mol, atomId, neighbourId, candidates) {
  const atom = mol.atoms.get(atomId);
  const neighbour = mol.atoms.get(neighbourId);
  const reference = neighbours(mol, neighbourId).find((n) => n.atom !== atomId);
  if (reference) {
    const refSide = cross(neighbour, atom, mol.atoms.get(reference.atom));
    if (Math.abs(refSide) > EPSILON) {
      const side = (angle) => cross(neighbour, atom, pointAt(atom, angle));
      return [...candidates].sort((p, q) => Math.sign(side(p)) * Math.sign(refSide) - Math.sign(side(q)) * Math.sign(refSide));
    }
  }
  return [...candidates].sort((p, q) => {
    const dx = Math.cos(q) - Math.cos(p);
    return Math.abs(dx) > EPSILON ? dx : Math.sin(p) - Math.sin(q);
  });
} // End of function orderZigzagCandidates()

/**
 * Preferred directions for a new bond from an atom, best first, before any
 * overlap check (design.md §6.2): lone atom → up-right; one neighbour → the
 * zigzag-continuing ±120° (or 180° for a linear centre); two or more → the
 * bisector of the largest free gap, then of the other gaps.
 *
 * @param {object} mol - The molecule.
 * @param {number} atomId - The atom to grow from.
 * @param {number} [order] - Order of the bond about to be added (default 1).
 * @returns {number[]} Angles in radians, best first.
 */
export function preferredAngles(mol, atomId, order = 1) {
  const atom = mol.atoms.get(atomId);
  const list = neighbours(mol, atomId);
  if (list.length === 0) {
    return [FIRST_BOND_ANGLE];
  }
  const angles = list.map((n) => normalizeAngle(angleBetween(atom, mol.atoms.get(n.atom))));
  if (list.length === 1) {
    const back = angles[0];
    const zigzag = orderZigzagCandidates(mol, atomId, list[0].atom, [
      normalizeAngle(back + toRadians(120)),
      normalizeAngle(back - toRadians(120)),
    ]);
    const straight = normalizeAngle(back + Math.PI);
    return isLinearCentre(mol, atomId, order) ? [straight, ...zigzag] : [...zigzag, straight];
  }
  const sorted = [...angles].sort((p, q) => p - q);
  const gaps = sorted.map((angle, i) => {
    const next = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + FULL_TURN;
    return { size: next - angle, bisector: normalizeAngle(angle + (next - angle) / 2) };
  });
  gaps.sort((p, q) => q.size - p.size);
  return gaps.map((gap) => gap.bisector);
} // End of function preferredAngles()

/**
 * Distance from a point to the nearest atom of the molecule.
 *
 * @param {object} mol - The molecule.
 * @param {{x: number, y: number}} point - The point.
 * @param {number[]} [exclude] - Atom ids to ignore.
 * @returns {number} The clearance (Infinity when there is no other atom).
 */
export function clearance(mol, point, exclude = []) {
  let best = Infinity;
  for (const atom of mol.atoms.values()) {
    if (!exclude.includes(atom.id)) {
      best = Math.min(best, distance(atom, point));
    }
  }
  return best;
}

/**
 * Proposes the position of a new atom bonded to an existing one: the best
 * preferred angle whose position does not overlap another atom; failing
 * that, every other 30° direction by closeness to the preferred one; failing
 * that, a small nudge (longer bond) to the spot with the most room.
 *
 * @param {object} mol - The molecule with coordinates.
 * @param {number} atomId - The atom to grow from.
 * @param {{order?: number, length?: number}} [options] - Order of the new bond (default 1), bond length.
 * @returns {{x: number, y: number}} The proposed position.
 */
export function nextAtomPosition(mol, atomId, options = {}) {
  const order = options.order || 1;
  const length = options.length || BOND_LENGTH;
  const atom = mol.atoms.get(atomId);
  const preferred = preferredAngles(mol, atomId, order);
  const fallback = [];
  for (let k = 0; k < 360 / SNAP_DEGREES; k += 1) {
    fallback.push(normalizeAngle(preferred[0] + toRadians(k * SNAP_DEGREES)));
  }
  fallback.sort((p, q) => angleDifference(p, preferred[0]) - angleDifference(q, preferred[0]));
  const candidates = [...preferred, ...fallback];
  for (const angle of candidates) {
    const point = pointAt(atom, angle, length);
    if (clearance(mol, point, [atomId]) >= MIN_CLEARANCE) {
      return point;
    }
  }
  // Everything is crowded: nudge outwards and keep the roomiest spot.
  let best = null;
  let bestRoom = -1;
  for (const factor of [1, 1.25, 1.5]) {
    for (const angle of candidates) {
      const point = pointAt(atom, angle, length * factor);
      const room = clearance(mol, point, [atomId]);
      if (room > bestRoom + EPSILON) {
        best = point;
        bestRoom = room;
      }
    }
  }
  return best;
} // End of function nextAtomPosition()

/**
 * Distance from a point to a segment.
 *
 * @param {{x: number, y: number}} p - The point.
 * @param {{x: number, y: number}} a - Segment start.
 * @param {{x: number, y: number}} b - Segment end.
 * @returns {number} The distance.
 */
export function distanceToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < EPSILON) {
    return distance(p, a);
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/**
 * Finds what lies under a point: the nearest atom within ATOM_HIT_RADIUS,
 * else the nearest bond within BOND_HIT_DISTANCE, else nothing.
 *
 * @param {object} mol - The molecule.
 * @param {{x: number, y: number}} point - The point in drawing units.
 * @param {{atomsOnly?: boolean, exclude?: number[]}} [options] - Restrict to atoms; atom ids to ignore.
 * @returns {{type: 'atom'|'bond', id: number}|null} The hit, or null.
 */
export function hitTest(mol, point, options = {}) {
  const exclude = options.exclude || [];
  let best = null;
  let bestDistance = ATOM_HIT_RADIUS;
  for (const atom of mol.atoms.values()) {
    const d = distance(atom, point);
    if (d <= bestDistance && !exclude.includes(atom.id)) {
      best = { type: 'atom', id: atom.id };
      bestDistance = d;
    }
  }
  if (best || options.atomsOnly) {
    return best;
  }
  bestDistance = BOND_HIT_DISTANCE;
  for (const bond of mol.bonds.values()) {
    const d = distanceToSegment(point, mol.atoms.get(bond.a), mol.atoms.get(bond.b));
    if (d <= bestDistance) {
      best = { type: 'bond', id: bond.id };
      bestDistance = d;
    }
  }
  return best;
} // End of function hitTest()

/**
 * Atoms reachable from `start` without passing through `centre`.
 *
 * @param {object} mol - The molecule.
 * @param {number} start - First atom of the side.
 * @param {number} centre - Atom that is not crossed.
 * @returns {Set<number>} The side's atom ids (includes `start`).
 */
function sideOf(mol, start, centre) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const n of neighbours(mol, current)) {
      if (n.atom !== centre && !seen.has(n.atom)) {
        seen.add(n.atom);
        queue.push(n.atom);
      }
    }
  }
  return seen;
} // End of function sideOf()

/**
 * Rotates a set of atoms about a centre.
 *
 * @param {object} mol - The molecule (coordinates mutated).
 * @param {Iterable<number>} atomIds - Atoms to rotate.
 * @param {{x: number, y: number}} centre - Rotation centre.
 * @param {number} delta - Rotation angle in radians.
 * @returns {void}
 */
function rotateAtoms(mol, atomIds, centre, delta) {
  const cos = Math.cos(delta);
  const sin = Math.sin(delta);
  for (const id of atomIds) {
    const atom = mol.atoms.get(id);
    const dx = atom.x - centre.x;
    const dy = atom.y - centre.y;
    atom.x = centre.x + dx * cos - dy * sin;
    atom.y = centre.y + dx * sin + dy * cos;
  }
}

/**
 * Rotation that straightens a linear centre by moving one side: the moving
 * neighbour goes opposite the fixed one.
 *
 * @param {object} mol - The molecule.
 * @param {object} centre - The centre atom.
 * @param {number} fixedId - Neighbour that stays put.
 * @param {number} movingId - Neighbour whose side rotates.
 * @returns {number} The rotation angle in radians.
 */
function straighteningDelta(mol, centre, fixedId, movingId) {
  const target = angleBetween(centre, mol.atoms.get(fixedId)) + Math.PI;
  return target - angleBetween(centre, mol.atoms.get(movingId));
}

/**
 * Tells whether rotating a side about a centre would put one of its atoms on
 * top of (within ATOM_HIT_RADIUS of) an atom outside that side.
 *
 * @param {object} mol - The molecule.
 * @param {Set<number>} side - Atoms that would rotate.
 * @param {{x: number, y: number}} centre - Rotation centre.
 * @param {number} delta - Rotation angle in radians.
 * @returns {boolean} True when the rotation would create an overlap.
 */
function rotationCollides(mol, side, centre, delta) {
  const cos = Math.cos(delta);
  const sin = Math.sin(delta);
  for (const id of side) {
    const atom = mol.atoms.get(id);
    const dx = atom.x - centre.x;
    const dy = atom.y - centre.y;
    const p = { x: centre.x + dx * cos - dy * sin, y: centre.y + dx * sin + dy * cos };
    for (const other of mol.atoms.values()) {
      if (!side.has(other.id) && distance(other, p) < ATOM_HIT_RADIUS) {
        return true;
      }
    }
  }
  return false;
} // End of function rotationCollides()

/**
 * Re-straightens linear centres (triple bond or cumulated double bonds) to
 * 180°: for each listed atom that is a linear centre with two neighbours, one
 * side of the molecule is rotated rigidly about the centre — the smaller side
 * (on a tie, the side of the more recently bonded neighbour), unless that
 * rotation would land an atom on another one and rotating the other side
 * would not. Sides joined by a ring cannot be rotated independently and are
 * left alone. Rigid rotation keeps every other angle, so centres straightened
 * earlier stay straight. Remaining overlaps (both options collide) are left
 * for the caller to detect with overlappingAtoms().
 *
 * @param {object} mol - The molecule (coordinates mutated).
 * @param {Iterable<number>} atomIds - Atoms to consider (e.g. the ends of a changed bond).
 * @returns {number[]} Ids of the atoms that moved.
 */
export function straightenLinearCentres(mol, atomIds) {
  const moved = new Set();
  for (const centreId of atomIds) {
    const centre = mol.atoms.get(centreId);
    const list = centre ? neighbours(mol, centreId) : [];
    if (list.length !== 2 || !isLinearCentre(mol, centreId)) {
      continue;
    }
    const [first, second] = list.map((n) => n.atom);
    const firstSide = sideOf(mol, first, centreId);
    if (firstSide.has(second)) {
      continue; // Both neighbours are in one ring: nothing can rotate alone.
    }
    const secondSide = sideOf(mol, second, centreId);
    const preferred = secondSide.size <= firstSide.size
      ? { side: secondSide, delta: straighteningDelta(mol, centre, first, second) }
      : { side: firstSide, delta: straighteningDelta(mol, centre, second, first) };
    const other = preferred.side === secondSide
      ? { side: firstSide, delta: straighteningDelta(mol, centre, second, first) }
      : { side: secondSide, delta: straighteningDelta(mol, centre, first, second) };
    if (angleDifference(preferred.delta, 0) <= 1e-6) {
      continue;
    }
    const choice = rotationCollides(mol, preferred.side, centre, preferred.delta)
      && !rotationCollides(mol, other.side, centre, other.delta) ? other : preferred;
    rotateAtoms(mol, choice.side, centre, choice.delta);
    choice.side.forEach((id) => moved.add(id));
  } // End of the loop over the candidate linear centres
  return [...moved];
} // End of function straightenLinearCentres()

/**
 * Atoms that overlap after an edit: every atom that is new or has moved with
 * respect to `before` and lies within `radius` of another atom, together with
 * that other atom. An edit must never commit two atoms at the same spot.
 *
 * @param {object} after - The edited molecule.
 * @param {object} before - The molecule before the edit.
 * @param {number} [radius] - Overlap distance (default ATOM_HIT_RADIUS).
 * @returns {number[]} Ids of the overlapping atoms, ascending (empty when none).
 */
export function overlappingAtoms(after, before, radius = ATOM_HIT_RADIUS) {
  const found = new Set();
  for (const atom of after.atoms.values()) {
    const old = before.atoms.get(atom.id);
    if (old && old.x === atom.x && old.y === atom.y) {
      continue;
    }
    for (const other of after.atoms.values()) {
      if (other.id !== atom.id && distance(atom, other) < radius) {
        found.add(atom.id);
        found.add(other.id);
      }
    }
  }
  return [...found].sort((p, q) => p - q);
} // End of function overlappingAtoms()

/** Advance along the drag axis per zigzag bond (bond at ±30° from the axis). */
export const CHAIN_STEP = BOND_LENGTH * Math.cos(Math.PI / 6);

/** Sideways offset of the odd atoms of a zigzag chain from the drag axis. */
export const CHAIN_OFFSET = BOND_LENGTH * Math.sin(Math.PI / 6);

/**
 * Zigzag chain for the Cadena tool (design.md §6.1): the drag direction is
 * snapped to 30°, and the number of bonds is the drag length projected on
 * that axis divided by CHAIN_STEP (at least one). Every bond has length
 * BOND_LENGTH and makes 120° with the next one.
 *
 * @param {{x: number, y: number}} start - First atom of the chain (where the drag began).
 * @param {{x: number, y: number}} pointer - Current pointer position.
 * @param {{side?: number, maxBonds?: number}} [options] - `side` 1 (default) puts the first bond on the
 *   left of the axis (up when dragging to the right), −1 on the right; `maxBonds` caps the chain.
 * @returns {{points: {x: number, y: number}[], bonds: number}} The atom positions, `points[0]` = start.
 */
export function chainPoints(start, pointer, options = {}) {
  const side = options.side === -1 ? -1 : 1;
  const maxBonds = options.maxBonds || Infinity;
  const angle = snapAngle(angleBetween(start, pointer));
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  // Left normal of the axis in screen terms (y grows downwards): (dy, −dx).
  const normal = { x: dir.y, y: -dir.x };
  const projected = (pointer.x - start.x) * dir.x + (pointer.y - start.y) * dir.y;
  const bonds = Math.min(maxBonds, Math.max(1, Math.round(projected / CHAIN_STEP)));
  const points = [];
  for (let i = 0; i <= bonds; i += 1) {
    const lateral = i % 2 === 1 ? side * CHAIN_OFFSET : 0;
    points.push({
      x: start.x + dir.x * CHAIN_STEP * i + normal.x * lateral,
      y: start.y + dir.y * CHAIN_STEP * i + normal.y * lateral,
    });
  }
  return { points, bonds };
} // End of function chainPoints()

/**
 * Chooses the zigzag side of a chain grown from an existing atom: the side
 * whose first new atom lies farther from the other atoms (so the chain
 * continues away from the atom's neighbours). Ties keep side 1.
 *
 * @param {object} mol - The molecule.
 * @param {number|null} atomId - The start atom, or null for a chain drawn on empty space.
 * @param {{x: number, y: number}} start - Start point of the chain.
 * @param {{x: number, y: number}} pointer - Current pointer position.
 * @returns {number} 1 or −1 (see chainPoints()).
 */
export function chooseChainSide(mol, atomId, start, pointer) {
  if (atomId === null || atomId === undefined) {
    return 1;
  }
  const exclude = [atomId];
  const up = chainPoints(start, pointer, { side: 1, maxBonds: 1 }).points[1];
  const down = chainPoints(start, pointer, { side: -1, maxBonds: 1 }).points[1];
  return clearance(mol, down, exclude) > clearance(mol, up, exclude) + EPSILON ? -1 : 1;
}
