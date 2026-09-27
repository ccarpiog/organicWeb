/**
 * @file 90° view ("Ángulos rectos", design.md §6.3): a display-only
 * projection of the molecule in the textbook semi-developed style, used in
 * Con carbonos mode. The parent chain (from the naming result, like
 * "Ordenar dibujo") lies on one horizontal line, locant 1 on the left;
 * branches hang straight up or down from their carbon and continue
 * horizontally or vertically.
 *
 * Placement is on an integer grid (column, row) and collision-free by
 * construction: every subtree is drawn inside its own rectangle, and the
 * rectangles of siblings never overlap.
 * - A branch leaving the chain (or going straight on) owns a half-plane: its
 *   carbon may continue straight ahead and turn to both sides.
 * - A branch that turned sideways owns a quadrant: it may only go on in its
 *   new direction or turn "forward" (away from the chain), so it never comes
 *   back toward the chain. A carbon with three children cannot be drawn in a
 *   quadrant; the search gives such a child the straight-ahead slot.
 * Bonds are lengthened (never bent) when a sibling rectangle is in the way;
 * among the valid choices the most compact drawing is kept. Chain carbons
 * are then spaced so that the rectangles of consecutive branches on the
 * same side (above or below the chain) never share a column.
 *
 * Grid cells become drawing units with a uniform column step wide enough
 * for the widest label plus a visible bond stroke (labelSize() in
 * editor/render.js) and a uniform row step. rightAngleProblems() checks a
 * drawing independently (axis-aligned bonds, no overlapping labels, no bond
 * through a label, no crossing or overlapping bonds); the caller refuses a
 * drawing it rejects.
 *
 * Pure: no DOM, never mutates the molecule; returns positions only, so the
 * model's own coordinates (and undo, autosave) are untouched.
 */

import { adjacency, hasCycle } from '../model/graph.js';
import { BOND_LENGTH } from '../editor/geometry.js';
import { atomLabel, labelSize, RIGHT_ANGLE_PAD } from '../editor/render.js';

/** Shortest visible bond stroke between two labels, in drawing units. */
export const MIN_STROKE = 16;

/** Weight of one extra grid step of bond length in the compactness cost. */
const COST_STRETCH = 4;

/** Weight of one grid column of width in the compactness cost. */
const COST_WIDTH = 2;

/** Weight of one grid row of height in the compactness cost. */
const COST_HEIGHT = 1;

/**
 * A subtree drawn in its local frame: the root at (0, 0), `f` the forward
 * axis (away from the parent, always ≥ 0) and `s` the side axis.
 *
 * @typedef {object} Sub
 * @property {Map<number, {s: number, f: number}>} cells - Atom id → grid cell.
 * @property {number} sMin - Smallest s.
 * @property {number} sMax - Largest s.
 * @property {number} fMax - Largest f.
 * @property {number} stretch - Extra grid steps of all its bonds (Σ (length − 1)).
 * @property {number} cost - Compactness cost (lower is better).
 */

/**
 * Builds a subtree record from its cells and stretch, computing the box and cost.
 *
 * @param {Map<number, {s: number, f: number}>} cells - Atom id → cell.
 * @param {number} stretch - Extra bond length.
 * @returns {Sub} The subtree.
 */
function makeSub(cells, stretch) {
  let sMin = 0;
  let sMax = 0;
  let fMax = 0;
  for (const c of cells.values()) {
    sMin = Math.min(sMin, c.s);
    sMax = Math.max(sMax, c.s);
    fMax = Math.max(fMax, c.f);
  }
  const cost = stretch * COST_STRETCH + (sMax - sMin + 1) * COST_WIDTH + (fMax + 1) * COST_HEIGHT;
  return { cells, sMin, sMax, fMax, stretch, cost };
} // End of function makeSub()

/**
 * Copies a child subtree's cells into a parent frame through a mapping.
 *
 * @param {Map<number, {s: number, f: number}>} into - Parent cells (mutated).
 * @param {Sub} sub - The child subtree.
 * @param {function({s: number, f: number}): {s: number, f: number}} map - Child cell → parent cell.
 * @returns {void}
 */
function place(into, sub, map) {
  for (const [id, c] of sub.cells) {
    into.set(id, map(c));
  }
}

/**
 * Keeps the cheaper of two candidate subtrees (null means "none yet").
 *
 * @param {Sub|null} best - Best so far.
 * @param {Sub|null} next - New candidate.
 * @returns {Sub|null} The cheaper one (the first on a tie).
 */
function cheaper(best, next) {
  if (!next) {
    return best;
  }
  return !best || next.cost < best.cost ? next : best;
}

/**
 * Lists every way of giving distinct slots to the children.
 *
 * @param {number[]} kids - Child atom ids.
 * @param {string[]} slots - Available slot names.
 * @returns {Array<Map<string, number>>} Slot → child assignments.
 */
function assignments(kids, slots) {
  if (kids.length === 0) {
    return [new Map()];
  }
  const out = [];
  const [first, ...rest] = kids;
  for (const slot of slots) {
    for (const tail of assignments(rest, slots.filter((x) => x !== slot))) {
      out.push(new Map([[slot, first], ...tail]));
    }
  }
  return out;
} // End of function assignments()

/**
 * Creates the recursive subtree solver for one molecule.
 *
 * @param {Map<number, object[]>} adj - Adjacency from adjacency().
 * @returns {{half: function(number, number): (Sub|null), quad: function(number, number): (Sub|null)}}
 *   `half(id, parent)` draws a subtree owning a half-plane, `quad(id, parent)` one owning a
 *   quadrant (turning only toward +s); null when it cannot be drawn.
 */
function createSolver(adj) {
  const memo = new Map();

  /**
   * Children of an atom seen from its parent.
   *
   * @param {number} id - The atom.
   * @param {number} parent - Its parent.
   * @returns {number[]} The child atom ids.
   */
  function kidsOf(id, parent) {
    return adj.get(id).filter((n) => n.atom !== parent).map((n) => n.atom);
  }

  /**
   * Draws a subtree that owns a quadrant: children only straight ahead (+f)
   * or turned toward +s; a turned child's own quadrant turns toward +f.
   *
   * @param {number} id - The subtree root.
   * @param {number} parent - Its parent atom.
   * @returns {Sub|null} The drawing, or null when a carbon has three children.
   */
  function quad(id, parent) {
    const key = `q${id}:${parent}`;
    if (memo.has(key)) {
      return memo.get(key);
    }
    const kids = kidsOf(id, parent);
    let best = null;
    if (kids.length <= 2) {
      for (const slots of assignments(kids, ['S', 'T'])) {
        const straight = slots.has('S') ? quad(slots.get('S'), id) : null;
        const turned = slots.has('T') ? quad(slots.get('T'), id) : null;
        if ((slots.has('S') && !straight) || (slots.has('T') && !turned)) {
          continue;
        }
        // Either the straight child clears the turned box (it goes further
        // ahead) or the turned child clears the straight box (further aside).
        const options = straight && turned
          ? [[turned.sMax + 1, 1], [1, straight.sMax + 1]]
          : [[1, 1]];
        for (const [lenS, lenT] of options) {
          const cells = new Map([[id, { s: 0, f: 0 }]]);
          let stretch = 0;
          if (straight) {
            place(cells, straight, (c) => ({ s: c.s, f: c.f + lenS }));
            stretch += straight.stretch + lenS - 1;
          }
          if (turned) {
            place(cells, turned, (c) => ({ s: lenT + c.f, f: c.s }));
            stretch += turned.stretch + lenT - 1;
          }
          best = cheaper(best, makeSub(cells, stretch));
        }
      } // End of the loop over the slot assignments
    }
    memo.set(key, best);
    return best;
  } // End of function quad()

  /**
   * Draws a subtree that owns a half-plane: children straight ahead (a
   * half-plane again) or turned left/right (quadrants turning forward).
   *
   * @param {number} id - The subtree root.
   * @param {number} parent - Its parent atom.
   * @returns {Sub|null} The drawing, or null when no child arrangement fits.
   */
  function half(id, parent) {
    const key = `h${id}:${parent}`;
    if (memo.has(key)) {
      return memo.get(key);
    }
    const kids = kidsOf(id, parent);
    let best = null;
    for (const slots of assignments(kids, ['S', 'L', 'R'])) {
      const straight = slots.has('S') ? half(slots.get('S'), id) : null;
      const left = slots.has('L') ? quad(slots.get('L'), id) : null;
      const right = slots.has('R') ? quad(slots.get('R'), id) : null;
      if ((slots.has('S') && !straight) || (slots.has('L') && !left) || (slots.has('R') && !right)) {
        continue;
      }
      // Each side box sits either beside the straight box or below it.
      const modes = [];
      for (const leftMode of left && straight ? ['beside', 'below'] : ['none']) {
        for (const rightMode of right && straight ? ['beside', 'below'] : ['none']) {
          modes.push([leftMode, rightMode]);
        }
      }
      for (const [leftMode, rightMode] of modes) {
        let lenS = 1;
        let lenL = 1;
        let lenR = 1;
        if (leftMode === 'beside') {
          lenL = 1 - straight.sMin;
        } else if (leftMode === 'below') {
          lenS = Math.max(lenS, left.sMax + 1);
        }
        if (rightMode === 'beside') {
          lenR = straight.sMax + 1;
        } else if (rightMode === 'below') {
          lenS = Math.max(lenS, right.sMax + 1);
        }
        const cells = new Map([[id, { s: 0, f: 0 }]]);
        let stretch = 0;
        if (straight) {
          place(cells, straight, (c) => ({ s: c.s, f: c.f + lenS }));
          stretch += straight.stretch + lenS - 1;
        }
        if (left) {
          place(cells, left, (c) => ({ s: -(lenL + c.f), f: c.s }));
          stretch += left.stretch + lenL - 1;
        }
        if (right) {
          place(cells, right, (c) => ({ s: lenR + c.f, f: c.s }));
          stretch += right.stretch + lenR - 1;
        }
        best = cheaper(best, makeSub(cells, stretch));
      } // End of the loop over the side-box placements
    } // End of the loop over the slot assignments
    memo.set(key, best);
    return best;
  } // End of function half()

  return { half, quad };
} // End of function createSolver()

/**
 * Places the parent chain on row 0 and its branches above (negative rows)
 * or below (positive rows), each branch in its own column range.
 *
 * @param {Map<number, object[]>} adj - Adjacency.
 * @param {number[]} chain - Parent atoms in locant order.
 * @returns {Map<number, {col: number, row: number}>|null} Grid cells, or null when impossible.
 */
function gridLayout(adj, chain) {
  const solver = createSolver(adj);
  const inChain = new Set(chain);
  const grid = new Map();
  const edge = { up: -Infinity, down: -Infinity }; // Rightmost column used on each side.
  let col = -1;
  for (const id of chain) {
    const branches = adj.get(id).filter((n) => !inChain.has(n.atom)).map((n) => n.atom);
    if (branches.length > 2) {
      return null;
    }
    const subs = branches.map((b) => solver.half(b, id));
    if (subs.some((sub) => !sub)) {
      return null;
    }
    // Try the possible sides; keep the one that needs the least room (ties: first listed).
    const sidings = branches.length === 2 ? [['up', 'down'], ['down', 'up']]
      : branches.length === 1 ? [['down'], ['up']] : [[]];
    let pick = null;
    for (const sides of sidings) {
      let at = col + 1;
      sides.forEach((side, i) => {
        at = Math.max(at, edge[side] - subs[i].sMin + 1);
      });
      if (!pick || at < pick.at) {
        pick = { at, sides };
      }
    }
    col = pick.at;
    grid.set(id, { col, row: 0 });
    pick.sides.forEach((side, i) => {
      const sign = side === 'up' ? -1 : 1;
      for (const [atom, c] of subs[i].cells) {
        grid.set(atom, { col: col + c.s, row: sign * (1 + c.f) });
      }
      edge[side] = Math.max(edge[side], col + subs[i].sMax);
    });
  } // End of the loop over the parent chain
  return grid;
} // End of function gridLayout()

/**
 * Grid steps of the drawing: a column step that fits the widest label on
 * both sides of a visible bond stroke, and a row step that does the same
 * for the label height. Never shorter than a bond of the normal drawing.
 *
 * @param {object} mol - The molecule.
 * @returns {{col: number, row: number}} Steps in drawing units.
 */
export function gridSteps(mol) {
  let width = 0;
  let height = 0;
  for (const id of mol.atoms.keys()) {
    const size = labelSize(atomLabel(mol, id));
    width = Math.max(width, size.width);
    height = Math.max(height, size.height);
  }
  return {
    col: Math.max(BOND_LENGTH, width + 2 * RIGHT_ANGLE_PAD + MIN_STROKE),
    row: Math.max(BOND_LENGTH, height + 2 * RIGHT_ANGLE_PAD + MIN_STROKE),
  };
} // End of function gridSteps()

/**
 * Computes the 90° view of a named molecule.
 *
 * @param {object} mol - The molecule (not mutated).
 * @param {object} result - Its successful naming result (nameMolecule()); only `parent.atoms` is read.
 * @param {{center?: {x: number, y: number}}} [options] - Point the drawing is centred on (default: the
 *   centre of the molecule's current bounding box, so the view does not jump).
 * @returns {{ok: true, positions: Map<number, {x: number, y: number}>}|{ok: false, reason: string}}
 *   The projected positions, or `NO_ROOM` when no collision-free drawing was found (`CYCLE` for a
 *   molecule with a ring, which the grid walk cannot place).
 * @throws {Error} When the result is not a successful naming of this molecule.
 */
export function rightAngleLayout(mol, result, options = {}) {
  if (!result || !result.ok || !result.parent || !Array.isArray(result.parent.atoms)) {
    throw new Error('rightAngleLayout: a successful naming result is required');
  }
  if (hasCycle(mol)) {
    // The grid walk assumes a tree; a ring falls back to the normal drawing.
    return { ok: false, reason: 'CYCLE' };
  }
  const adj = adjacency(mol);
  const chain = result.parent.atoms;
  if (chain.length === 0 || chain.some((id) => !adj.has(id))) {
    throw new Error('rightAngleLayout: the parent chain does not belong to this molecule');
  }
  const grid = gridLayout(adj, chain);
  if (!grid || grid.size !== mol.atoms.size) {
    return { ok: false, reason: 'NO_ROOM' };
  }
  const step = gridSteps(mol);
  const atoms = [...mol.atoms.values()];
  const target = options.center || {
    x: (Math.min(...atoms.map((a) => a.x)) + Math.max(...atoms.map((a) => a.x))) / 2,
    y: (Math.min(...atoms.map((a) => a.y)) + Math.max(...atoms.map((a) => a.y))) / 2,
  };
  const cols = [...grid.values()].map((c) => c.col);
  const rows = [...grid.values()].map((c) => c.row);
  const mid = { col: (Math.min(...cols) + Math.max(...cols)) / 2, row: (Math.min(...rows) + Math.max(...rows)) / 2 };
  const positions = new Map();
  for (const [id, c] of grid) {
    positions.set(id, { x: target.x + (c.col - mid.col) * step.col, y: target.y + (c.row - mid.row) * step.row });
  }
  if (rightAngleProblems(mol, positions).length > 0) {
    return { ok: false, reason: 'NO_ROOM' };
  }
  return { ok: true, positions };
} // End of function rightAngleLayout()

/**
 * Label box of a carbon at a position.
 *
 * @param {object} mol - The molecule.
 * @param {number} id - The carbon.
 * @param {{x: number, y: number}} p - Its displayed position.
 * @returns {{x1: number, y1: number, x2: number, y2: number}} The box.
 */
function labelBox(mol, id, p) {
  const size = labelSize(atomLabel(mol, id));
  return { x1: p.x - size.width / 2, y1: p.y - size.height / 2, x2: p.x + size.width / 2, y2: p.y + size.height / 2 };
}

/**
 * Tells whether two closed intervals overlap by more than `eps`.
 *
 * @param {number} a1 - First start.
 * @param {number} a2 - First end.
 * @param {number} b1 - Second start.
 * @param {number} b2 - Second end.
 * @param {number} [eps] - Tolerance.
 * @returns {boolean} True when they overlap.
 */
function overlaps(a1, a2, b1, b2, eps = 1e-6) {
  return Math.min(Math.max(a1, a2), Math.max(b1, b2)) - Math.max(Math.min(a1, a2), Math.min(b1, b2)) > eps;
}

/**
 * Checks a 90° drawing: every bond horizontal or vertical, no two labels
 * overlapping (with RIGHT_ANGLE_PAD between them), no bond passing through
 * a label other than its own two, no two bonds crossing or overlapping, and
 * every bond long enough to show MIN_STROKE between its labels.
 *
 * @param {object} mol - The molecule.
 * @param {Map<number, {x: number, y: number}>} positions - Atom id → displayed position.
 * @returns {string[]} Problems found (English, for developers); empty when the drawing is clean.
 */
export function rightAngleProblems(mol, positions) {
  const problems = [];
  const eps = 1e-6;
  const boxes = new Map([...mol.atoms.keys()].map((id) => [id, labelBox(mol, id, positions.get(id))]));
  const ids = [...boxes.keys()];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const p = boxes.get(ids[i]);
      const q = boxes.get(ids[j]);
      const pad = RIGHT_ANGLE_PAD;
      if (overlaps(p.x1 - pad, p.x2 + pad, q.x1, q.x2) && overlaps(p.y1 - pad, p.y2 + pad, q.y1, q.y2)) {
        problems.push(`labels of atoms ${ids[i]} and ${ids[j]} overlap`);
      }
    }
  } // End of the loop over label pairs
  const bonds = [...mol.bonds.values()].map((b) => ({ id: b.id, a: b.a, b: b.b, p: positions.get(b.a), q: positions.get(b.b) }));
  for (const bond of bonds) {
    const horizontal = Math.abs(bond.p.y - bond.q.y) < eps;
    const vertical = Math.abs(bond.p.x - bond.q.x) < eps;
    if (!horizontal && !vertical) {
      problems.push(`bond ${bond.id} is not axis-aligned`);
      continue;
    }
    const ends = [boxes.get(bond.a), boxes.get(bond.b)];
    const room = horizontal
      ? Math.abs(bond.q.x - bond.p.x) - (ends[0].x2 - ends[0].x1) / 2 - (ends[1].x2 - ends[1].x1) / 2
      : Math.abs(bond.q.y - bond.p.y) - (ends[0].y2 - ends[0].y1) / 2 - (ends[1].y2 - ends[1].y1) / 2;
    if (room < MIN_STROKE + 2 * RIGHT_ANGLE_PAD - eps) {
      problems.push(`bond ${bond.id} is too short to show between its labels`);
    }
    for (const [id, box] of boxes) {
      if (id === bond.a || id === bond.b) {
        continue;
      }
      if (overlaps(bond.p.x, bond.q.x, box.x1, box.x2, -eps) && overlaps(bond.p.y, bond.q.y, box.y1, box.y2, -eps)) {
        problems.push(`bond ${bond.id} runs through the label of atom ${id}`);
      }
    }
  } // End of the loop over the bonds
  for (let i = 0; i < bonds.length; i += 1) {
    for (let j = i + 1; j < bonds.length; j += 1) {
      const u = bonds[i];
      const v = bonds[j];
      const shared = [u.a, u.b].filter((x) => x === v.a || x === v.b).length > 0;
      const meetX = overlaps(u.p.x, u.q.x, v.p.x, v.q.x, -eps);
      const meetY = overlaps(u.p.y, u.q.y, v.p.y, v.q.y, -eps);
      if (!meetX || !meetY) {
        continue;
      }
      // Bonds sharing an atom may only touch at it: collinear overlap beyond the atom is a problem.
      const overlapLength = Math.max(
        Math.min(Math.max(u.p.x, u.q.x), Math.max(v.p.x, v.q.x)) - Math.max(Math.min(u.p.x, u.q.x), Math.min(v.p.x, v.q.x)),
        Math.min(Math.max(u.p.y, u.q.y), Math.max(v.p.y, v.q.y)) - Math.max(Math.min(u.p.y, u.q.y), Math.min(v.p.y, v.q.y)),
      );
      if (!shared || overlapLength > eps) {
        problems.push(`bonds ${u.id} and ${v.id} cross or overlap`);
      }
    }
  } // End of the loop over bond pairs
  return problems;
} // End of function rightAngleProblems()
