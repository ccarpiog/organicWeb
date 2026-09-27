/**
 * @file SVG rendering of the molecule (design.md §6.3): bonds drawn as one,
 * two or three strokes, the two display modes (Esqueleto / Con carbonos),
 * the carbon dots of Esqueleto mode, heteroatom labels (`OH`, `NH₂`, `Cl`…,
 * shown in every mode, with the bond strokes stopped short of them), the 90° view's `=` / `≡` strokes that
 * stop short of the labels (labelSize(), rightAngleSegments()), hover
 * highlight, selection, the drag previews (bond, chain with its "N C"
 * counter, the Anillos ring, marquee), double bonds of a ring drawn with
 * their second stroke inside the ring (ringBondCentres()), the pan/zoom view
 * transform, and the highlight API used by the stepper (`highlight`,
 * `showLocants`).
 *
 * The geometry of the strokes, the label text and the view arithmetic
 * (bondSegments(), atomLabelText(), zoomView(), fitView()…) are pure and
 * unit-tested; createRenderer() is the only part touching the DOM, and only
 * when called, so the module can be imported under Node.
 */

import { neighbours } from '../model/molecule.js';
import { perceiveRings } from '../model/rings.js';
import { cross, LONE_LABEL_OFFSET } from './geometry.js';
import { atomLabel, labelSize, LABEL_HEIGHT } from './labels.js';

// The label text and size live in labels.js (shared with the DOM-free hit-testing
// of geometry.js); re-exported here for the existing callers.
export { atomLabel, labelSize, LABEL_HEIGHT };

/** SVG namespace. */
export const SVG_NS = 'http://www.w3.org/2000/svg';

/** Distance between the parallel strokes of a double or triple bond. */
export const BOND_SPACING = 6;

/** Highlight styles accepted by highlight() (design.md §6.3). */
export const HIGHLIGHT_STYLES = Object.freeze(['parent', 'candidate', 'substituent', 'locant']);

/** How far a locant number sits from its atom, in drawing units. */
const LOCANT_OFFSET = 18;

/** Fraction of an inner double-bond stroke trimmed at each end. */
const INNER_TRIM = 0.15;

/** Display modes: skeletal formula, or every carbon labelled with its hydrogens. */
export const DISPLAY_MODES = Object.freeze(['skeletal', 'condensed']);

/** Gap left between a bond stroke and a carbon label, in drawing units (condensed mode). */
export const LABEL_GAP = 11;

/**
 * Radius of the filled dot drawn on every carbon in skeletal mode, in drawing
 * units (it scales with the zoom like the bonds, which are 2 units wide).
 */
export const CARBON_DOT_RADIUS = 3.5;

/** Smallest zoom factor of the view. */
export const MIN_ZOOM = 0.25;

/** Largest zoom factor of the view. */
export const MAX_ZOOM = 4;

/** The initial view: drawing units = canvas (viewBox) units. */
export const IDENTITY_VIEW = Object.freeze({ scale: 1, x: 0, y: 0 });

/**
 * Condensed label of a carbon: C plus its implicit hydrogens (`CH₄`, `CH₃`,
 * `CH₂`, `CH`, `C`). Never contains `=`. Kept for the carbon-only callers;
 * it is atomLabel(), which also labels heteroatoms.
 *
 * @param {object} mol - The molecule.
 * @param {number} atomId - The carbon.
 * @returns {string} The label with Unicode subscripts.
 */
export function carbonLabel(mol, atomId) {
  return atomLabel(mol, atomId);
}

/**
 * Tells whether an atom is a heteroatom (anything but carbon), which is
 * always drawn with its label (design.md §6.3).
 *
 * @param {object} mol - The molecule.
 * @param {number} atomId - The atom.
 * @returns {boolean} True for O, N, F, Cl, Br and I.
 */
export function isHeteroatom(mol, atomId) {
  const atom = mol.atoms.get(atomId);
  return Boolean(atom) && atom.element !== 'C';
}

/**
 * Text shown on an atom in a display mode: in `condensed` (Con carbonos)
 * every atom shows its symbol plus its implicit hydrogens (`CH₃`, `CH₂`, `CH`,
 * `C`, `CH₄`, `OH`, `NH₂`…); in `skeletal` (Esqueleto) a carbon is labelled
 * only when it is lone (it has no bond to show it), while a heteroatom is
 * always labelled (`OH`, `O`, `NH₂`, `Cl`, `H₂O`…).
 *
 * @param {object} mol - The molecule.
 * @param {number} atomId - The atom.
 * @param {string} [mode] - 'skeletal' (default) or 'condensed'.
 * @returns {string|null} The label, or null when the carbon is drawn as a bare vertex.
 */
export function atomLabelText(mol, atomId, mode = 'skeletal') {
  if (mode === 'condensed' || isHeteroatom(mol, atomId) || neighbours(mol, atomId).length === 0) {
    return atomLabel(mol, atomId);
  }
  return null;
}

/**
 * Tells whether a display mode marks every carbon with a filled dot: only
 * Esqueleto does, so that no carbon vanishes where two bonds are nearly
 * collinear; Con carbonos already labels every carbon. Heteroatoms never get
 * a dot: their label marks them.
 *
 * @param {string} [mode] - 'skeletal' (default) or 'condensed'.
 * @returns {boolean} True when carbon dots are drawn.
 */
export function showsCarbonDots(mode = 'skeletal') {
  return mode === 'skeletal';
}

/**
 * Where an atom's label is drawn: on the atom, except for a lone carbon in
 * skeletal mode, whose `CH₄` label moves LONE_LABEL_OFFSET (geometry.js) below
 * its dot so both stay legible; hitTest() maps that label back to the carbon.
 *
 * @param {object} mol - The molecule.
 * @param {number} atomId - The atom.
 * @param {string} [mode] - 'skeletal' (default) or 'condensed'.
 * @returns {{x: number, y: number}} The label's centre, in drawing units.
 */
export function atomLabelPosition(mol, atomId, mode = 'skeletal') {
  const atom = mol.atoms.get(atomId);
  if (showsCarbonDots(mode) && atom.element === 'C' && neighbours(mol, atomId).length === 0) {
    return { x: atom.x, y: atom.y + LONE_LABEL_OFFSET };
  }
  return { x: atom.x, y: atom.y };
}

/**
 * Lengths cut from the two ends of a bond's strokes so they do not run into
 * atom labels: LABEL_GAP at every end in Con carbonos (every atom is
 * labelled), and only at heteroatom ends in Esqueleto.
 *
 * @param {object} mol - The molecule.
 * @param {number} bondId - The bond.
 * @param {string} [mode] - 'skeletal' (default) or 'condensed'.
 * @returns {[number, number]} The cuts at the bond's `a` and `b` ends.
 */
export function bondEndCuts(mol, bondId, mode = 'skeletal') {
  const bond = mol.bonds.get(bondId);
  const cut = (id) => (mode === 'condensed' || isHeteroatom(mol, id) ? LABEL_GAP : 0);
  return [cut(bond.a), cut(bond.b)];
}

/**
 * Gap left between a bond stroke and a carbon label in the 90° view (right
 * angles), measured from the label's estimated box.
 */
export const RIGHT_ANGLE_PAD = 4;

/**
 * Length cut from a bond end at a labelled carbon in the 90° view: half the
 * label's width for a horizontal bond, half its height for a vertical one,
 * plus RIGHT_ANGLE_PAD.
 *
 * @param {string} label - The carbon's label.
 * @param {boolean} horizontal - True for a horizontal bond.
 * @returns {number} The cut, in drawing units.
 */
export function rightAngleCut(label, horizontal) {
  const size = labelSize(label);
  return (horizontal ? size.width : size.height) / 2 + RIGHT_ANGLE_PAD;
}

/**
 * Strokes of a bond in the 90° view: one line, two (`=`) or three (`≡`)
 * parallel lines of equal length centred on the bond axis, each stopped
 * short of the two atom labels (rightAngleCut()).
 *
 * @param {object} mol - The molecule (at its displayed coordinates).
 * @param {number} bondId - The bond.
 * @returns {{x1: number, y1: number, x2: number, y2: number}[]} The strokes.
 */
export function rightAngleSegments(mol, bondId) {
  const bond = mol.bonds.get(bondId);
  const a = mol.atoms.get(bond.a);
  const b = mol.atoms.get(bond.b);
  const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
  const cutA = rightAngleCut(atomLabel(mol, bond.a), horizontal);
  const cutB = rightAngleCut(atomLabel(mol, bond.b), horizontal);
  const offsets = bond.order === 3 ? [-BOND_SPACING, 0, BOND_SPACING]
    : bond.order === 2 ? [-BOND_SPACING / 2, BOND_SPACING / 2] : [0];
  return offsets.map((offset) => trimSegment(shifted(a, b, offset, 0), cutA, cutB));
} // End of function rightAngleSegments()

/**
 * Position of a locant number in the 90° view: up and to the right of the
 * carbon label, clear of the four bond directions (left, right, up, down)
 * a right-angle drawing can use.
 *
 * @param {object} mol - The molecule (at its displayed coordinates).
 * @param {number} atomId - The numbered atom.
 * @returns {{x: number, y: number}} Where to draw the number.
 */
export function rightAngleLocantPosition(mol, atomId) {
  const atom = mol.atoms.get(atomId);
  return { x: atom.x + 14, y: atom.y - 17 };
}

/**
 * Shortens a segment by fixed lengths at each end (so a bond does not run
 * into a carbon label). A segment too short to cut is returned unchanged.
 *
 * @param {{x1: number, y1: number, x2: number, y2: number}} s - The segment.
 * @param {number} cutStart - Length removed at (x1, y1).
 * @param {number} cutEnd - Length removed at (x2, y2).
 * @returns {{x1: number, y1: number, x2: number, y2: number}} The shortened segment.
 */
export function trimSegment(s, cutStart, cutEnd) {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  const len = Math.hypot(dx, dy);
  if (len <= cutStart + cutEnd + 1) {
    return { ...s };
  }
  const ux = dx / len;
  const uy = dy / len;
  return { x1: s.x1 + ux * cutStart, y1: s.y1 + uy * cutStart, x2: s.x2 - ux * cutEnd, y2: s.y2 - uy * cutEnd };
}

/**
 * Clamps a zoom factor to [MIN_ZOOM, MAX_ZOOM].
 *
 * @param {number} scale - The scale.
 * @returns {number} The clamped scale.
 */
export function clampZoom(scale) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

/**
 * Zooms a view about a fixed canvas point (the point under the cursor or
 * between two fingers stays where it is). The view maps a drawing point p to
 * the canvas point `p · scale + (x, y)`.
 *
 * @param {{scale: number, x: number, y: number}} view - The view.
 * @param {{x: number, y: number}} point - Fixed point, in canvas (viewBox) units.
 * @param {number} factor - Multiplier of the scale (> 1 zooms in).
 * @returns {{scale: number, x: number, y: number}} The new view.
 */
export function zoomView(view, point, factor) {
  const scale = clampZoom(view.scale * factor);
  const ratio = scale / view.scale;
  return { scale, x: point.x - (point.x - view.x) * ratio, y: point.y - (point.y - view.y) * ratio };
}

/**
 * Pans a view.
 *
 * @param {{scale: number, x: number, y: number}} view - The view.
 * @param {number} dx - Shift in canvas units.
 * @param {number} dy - Shift in canvas units.
 * @returns {{scale: number, x: number, y: number}} The new view.
 */
export function panView(view, dx, dy) {
  return { scale: view.scale, x: view.x + dx, y: view.y + dy };
}

/**
 * Bounding box of the atoms.
 *
 * @param {object} mol - The molecule.
 * @returns {{minX: number, minY: number, maxX: number, maxY: number}|null} The box, or null when empty.
 */
export function moleculeBounds(mol) {
  if (mol.atoms.size === 0) {
    return null;
  }
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const atom of mol.atoms.values()) {
    box.minX = Math.min(box.minX, atom.x);
    box.minY = Math.min(box.minY, atom.y);
    box.maxX = Math.max(box.maxX, atom.x);
    box.maxY = Math.max(box.maxY, atom.y);
  }
  return box;
} // End of function moleculeBounds()

/**
 * The "Centrar" view: the molecule centred in the visible canvas rectangle,
 * scaled to fit with a margin but never above `maxScale` (a small molecule
 * is centred, not blown up). An empty drawing gets the identity view.
 *
 * @param {object} mol - The molecule.
 * @param {{x: number, y: number, width: number, height: number}} rect - Visible canvas area, canvas units.
 * @param {{padding?: number, maxScale?: number}} [options] - Margin (canvas units, default 40) and scale cap (default 1.5).
 * @returns {{scale: number, x: number, y: number}} The view.
 */
export function fitView(mol, rect, options = {}) {
  const box = moleculeBounds(mol);
  if (!box) {
    return { ...IDENTITY_VIEW };
  }
  const padding = options.padding ?? 40;
  const maxScale = options.maxScale ?? 1.5;
  const width = Math.max(box.maxX - box.minX, 1);
  const height = Math.max(box.maxY - box.minY, 1);
  const room = { w: Math.max(rect.width - 2 * padding, 1), h: Math.max(rect.height - 2 * padding, 1) };
  const scale = clampZoom(Math.min(maxScale, room.w / width, room.h / height));
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  return { scale, x: rect.x + rect.width / 2 - cx * scale, y: rect.y + rect.height / 2 - cy * scale };
} // End of function fitView()

/**
 * Normalises a marquee rectangle given by two corners.
 *
 * @param {{x: number, y: number}} p - One corner.
 * @param {{x: number, y: number}} q - The opposite corner.
 * @returns {{x: number, y: number, width: number, height: number}} The rectangle.
 */
export function rectFromCorners(p, q) {
  return { x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), width: Math.abs(q.x - p.x), height: Math.abs(q.y - p.y) };
}

/**
 * Side of a bond on which its other neighbours mostly lie (the "inside" of
 * the zigzag), used to place the second stroke of a double bond.
 *
 * @param {object} mol - The molecule.
 * @param {object} bond - The bond.
 * @returns {number} 1 or −1 for a side (along the left normal of a→b), 0 when balanced.
 */
function innerSide(mol, bond) {
  const a = mol.atoms.get(bond.a);
  const b = mol.atoms.get(bond.b);
  let sum = 0;
  for (const end of [bond.a, bond.b]) {
    for (const n of neighbours(mol, end)) {
      if (n.bond !== bond.id) {
        sum += Math.sign(Math.round(cross(a, b, mol.atoms.get(n.atom)) * 1e6));
      }
    }
  }
  return Math.sign(sum);
} // End of function innerSide()

/**
 * Offsets and trims a segment.
 *
 * @param {{x: number, y: number}} a - Segment start.
 * @param {{x: number, y: number}} b - Segment end.
 * @param {number} offset - Signed offset along the left normal of a→b.
 * @param {number} trim - Fraction of the length removed at each end.
 * @returns {{x1: number, y1: number, x2: number, y2: number}} The new segment.
 */
function shifted(a, b, offset, trim) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return {
    x1: a.x + dx * trim + nx * offset,
    y1: a.y + dy * trim + ny * offset,
    x2: b.x - dx * trim + nx * offset,
    y2: b.y - dy * trim + ny * offset,
  };
} // End of function shifted()

/**
 * Strokes of a bond drawn symmetrically about its axis (no neighbour
 * context): used for the drag preview and for balanced double bonds.
 *
 * @param {{x: number, y: number}} a - First end.
 * @param {{x: number, y: number}} b - Second end.
 * @param {number} order - Bond order 1, 2 or 3.
 * @returns {{x1: number, y1: number, x2: number, y2: number}[]} The strokes.
 */
export function symmetricSegments(a, b, order) {
  if (order === 2) {
    return [shifted(a, b, BOND_SPACING / 2, 0), shifted(a, b, -BOND_SPACING / 2, 0)];
  }
  if (order === 3) {
    return [shifted(a, b, 0, 0), shifted(a, b, BOND_SPACING, 0.1), shifted(a, b, -BOND_SPACING, 0.1)];
  }
  return [shifted(a, b, 0, 0)];
}

/**
 * Centre of the smallest ring through each ring bond (design.md §6.3): the
 * centroid of that ring's atoms, where the inner stroke of a ring double bond
 * goes. Ring bonds come from perceiveRings() (model/rings.js); the smallest
 * ring through a bond a–b is a shortest path from b back to a over the other
 * ring bonds (breadth-first, neighbours in ascending id order), so in a fused
 * system each bond takes the centre of the smaller ring it belongs to.
 *
 * @param {object} mol - The molecule, with coordinates.
 * @returns {Map<number, {x: number, y: number}>} Ring bond id → ring centre (acyclic bonds absent).
 */
export function ringBondCentres(mol) {
  const centres = new Map();
  const ringBonds = perceiveRings(mol).ringBonds;
  if (ringBonds.length === 0) {
    return centres;
  }
  const adj = new Map();
  for (const id of ringBonds) {
    const bond = mol.bonds.get(id);
    for (const [from, to] of [[bond.a, bond.b], [bond.b, bond.a]]) {
      if (!adj.has(from)) {
        adj.set(from, []);
      }
      adj.get(from).push({ atom: to, bond: id });
    }
  }
  for (const list of adj.values()) {
    list.sort((p, q) => p.atom - q.atom);
  }
  for (const id of ringBonds) {
    const bond = mol.bonds.get(id);
    const previous = new Map([[bond.b, null]]);
    const queue = [bond.b];
    for (let i = 0; i < queue.length && !previous.has(bond.a); i += 1) {
      for (const next of adj.get(queue[i])) {
        if (next.bond !== id && !previous.has(next.atom)) {
          previous.set(next.atom, queue[i]);
          queue.push(next.atom);
        }
      }
    }
    if (!previous.has(bond.a)) {
      continue; // Not closed through the other ring bonds (cannot happen for a ring bond).
    }
    let x = 0;
    let y = 0;
    let count = 0;
    for (let atom = bond.a; atom !== null; atom = previous.get(atom)) {
      x += mol.atoms.get(atom).x;
      y += mol.atoms.get(atom).y;
      count += 1;
    }
    centres.set(id, { x: x / count, y: y / count });
  } // End of the loop that finds the smallest ring through each ring bond
  return centres;
} // End of function ringBondCentres()

/**
 * Side of a ring bond on which its ring's centre lies: where the inner
 * stroke of a ring double bond goes (design.md §6.3). Pure.
 *
 * @param {{x: number, y: number}} a - First end of the bond.
 * @param {{x: number, y: number}} b - Second end of the bond.
 * @param {{x: number, y: number}} centre - The ring centre (ringBondCentres()).
 * @returns {number} 1 or −1 (along the left normal of a→b, as in bondSegments()), 0 when the centre is on the bond line.
 */
export function ringInnerSide(a, b, centre) {
  return Math.sign(Math.round(cross(a, b, centre) * 1e6));
}

/**
 * Strokes of a bond: one line for a single bond; for a double bond the main
 * line plus a shorter one offset toward the inside of its ring (for a ring
 * bond, the centre of the smallest ring through it) or else of the zigzag
 * (two centred lines when there is no inside, e.g. a terminal or linear
 * bond); three lines for a triple bond.
 *
 * @param {object} mol - The molecule.
 * @param {number} bondId - The bond.
 * @param {Map<number, {x: number, y: number}>} [centres] - ringBondCentres(mol), when the caller has
 *   it already (the renderer computes it once per drawing); computed when omitted.
 * @returns {{x1: number, y1: number, x2: number, y2: number}[]} The strokes, main line first.
 */
export function bondSegments(mol, bondId, centres) {
  const bond = mol.bonds.get(bondId);
  const a = mol.atoms.get(bond.a);
  const b = mol.atoms.get(bond.b);
  if (bond.order === 2) {
    const centre = (centres || ringBondCentres(mol)).get(bondId);
    const ringSide = centre ? ringInnerSide(a, b, centre) : 0;
    const side = ringSide !== 0 ? ringSide : innerSide(mol, bond);
    if (side !== 0) {
      return [shifted(a, b, 0, 0), shifted(a, b, side * BOND_SPACING, INNER_TRIM)];
    }
  }
  return symmetricSegments(a, b, bond.order);
} // End of function bondSegments()

/**
 * Normalises the argument of highlight(): one spec, an array of specs or
 * nothing.
 *
 * @param {object|object[]|null|undefined} spec - `{atoms, bonds, style}` or a list of them.
 * @returns {{atoms: number[], bonds: number[], style: string}[]} Clean specs.
 */
export function normalizeHighlight(spec) {
  if (!spec) {
    return [];
  }
  const list = Array.isArray(spec) ? spec : [spec];
  return list.map((item) => ({
    atoms: [...(item.atoms || [])],
    bonds: [...(item.bonds || [])],
    style: HIGHLIGHT_STYLES.includes(item.style) ? item.style : 'parent',
  }));
}

/**
 * Position of a locant number: away from the atom's bonds.
 *
 * @param {object} mol - The molecule.
 * @param {number} atomId - The numbered atom.
 * @returns {{x: number, y: number}} Where to draw the number.
 */
export function locantPosition(mol, atomId) {
  const atom = mol.atoms.get(atomId);
  let vx = 0;
  let vy = 0;
  for (const n of neighbours(mol, atomId)) {
    const other = mol.atoms.get(n.atom);
    const len = Math.hypot(other.x - atom.x, other.y - atom.y) || 1;
    vx -= (other.x - atom.x) / len;
    vy -= (other.y - atom.y) / len;
  }
  let len = Math.hypot(vx, vy);
  if (len < 1e-6) {
    // Balanced (or lone) atom: put the number above it, or beside a vertical bond.
    const list = neighbours(mol, atomId);
    const vertical = list.length === 2 && Math.abs(mol.atoms.get(list[0].atom).x - atom.x) < 1e-6;
    vx = vertical ? 1 : 0;
    vy = vertical ? 0 : -1;
    len = 1;
  }
  return { x: atom.x + (vx / len) * LOCANT_OFFSET, y: atom.y + (vy / len) * LOCANT_OFFSET };
} // End of function locantPosition()

/**
 * Creates the renderer for one SVG canvas. The molecule is drawn inside a
 * `g.mol-root` group that carries the pan/zoom transform, in layers:
 * highlight, selection, bonds, atoms, preview, locants, flash. In skeletal
 * mode the atoms layer holds a `circle.carbon-dot` per carbon, drawn above
 * the (transparent) hit circle and the underlying highlight/selection
 * layers, so hover, selection and stepper highlights surround the dot.
 *
 * @param {SVGSVGElement} svg - The canvas element.
 * @returns {object} `{render, highlight, clearHighlight, showLocants, flash, setMode, getMode, getView, setView,
 *   visibleRect, clientToCanvas, clientToModel, modelToClient, root}`.
 */
export function createRenderer(svg) {
  const doc = svg.ownerDocument;

  /**
   * Creates an SVG element with attributes and appends it.
   *
   * @param {string} name - Tag name.
   * @param {Record<string, string|number>} attrs - Attributes.
   * @param {Element} [parent] - Where to append it.
   * @returns {SVGElement} The element.
   */
  function el(name, attrs, parent) {
    const node = doc.createElementNS(SVG_NS, name);
    for (const [key, value] of Object.entries(attrs)) {
      node.setAttribute(key, String(value));
    }
    if (parent) {
      parent.appendChild(node);
    }
    return node;
  }

  const root = el('g', { class: 'mol-root' }, svg);
  const layers = {};
  for (const name of ['highlight', 'selection', 'bonds', 'atoms', 'preview', 'locants', 'flash']) {
    layers[name] = el('g', { class: `mol-${name}` }, root);
  }
  let highlights = [];
  let locants = null;
  let lastMol = null;
  let lastRightAngle = false;
  let mode = 'skeletal';
  let view = { ...IDENTITY_VIEW };

  /**
   * Draws one line segment.
   *
   * @param {{x1: number, y1: number, x2: number, y2: number}} s - The segment.
   * @param {string} cls - CSS class.
   * @param {Element} parent - Where to append it.
   * @returns {SVGLineElement} The line.
   */
  function line(s, cls, parent) {
    return el('line', { class: cls, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 }, parent);
  }

  /**
   * Draws a centred text.
   *
   * @param {string} cls - CSS class.
   * @param {{x: number, y: number}} p - Anchor point.
   * @param {string} content - The text.
   * @param {Element} parent - Where to append it.
   * @returns {SVGTextElement} The text node.
   */
  function text(cls, p, content, parent) {
    const node = el('text', { class: cls, x: p.x, y: p.y, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, parent);
    node.textContent = content;
    return node;
  }

  /**
   * Redraws the highlight layer from the stored specs.
   *
   * @returns {void}
   */
  function drawHighlights() {
    layers.highlight.replaceChildren();
    if (!lastMol) {
      return;
    }
    for (const spec of highlights) {
      for (const id of spec.bonds) {
        const bond = lastMol.bonds.get(id);
        if (bond) {
          const a = lastMol.atoms.get(bond.a);
          const b = lastMol.atoms.get(bond.b);
          const node = line({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }, `hl hl-bond hl-${spec.style}`, layers.highlight);
          node.dataset.bondId = String(id);
        }
      }
      for (const id of spec.atoms) {
        const atom = lastMol.atoms.get(id);
        if (atom) {
          const node = el('circle', { class: `hl hl-atom hl-${spec.style}`, cx: atom.x, cy: atom.y, r: 11 }, layers.highlight);
          node.dataset.atomId = String(id);
        }
      }
    } // End of the loop over the highlight specs
  } // End of function drawHighlights()

  /**
   * Redraws the locant layer from the stored map.
   *
   * @returns {void}
   */
  function drawLocants() {
    layers.locants.replaceChildren();
    if (!lastMol || !locants) {
      return;
    }
    for (const [id, number] of locants) {
      if (lastMol.atoms.has(id)) {
        const where = lastRightAngle ? rightAngleLocantPosition(lastMol, id) : locantPosition(lastMol, id);
        const node = text('locant', where, String(number), layers.locants);
        node.dataset.atomId = String(id);
      }
    }
  }

  /**
   * Draws the selected atoms and the bonds between two selected atoms.
   *
   * @param {object} mol - The molecule.
   * @param {Set<number>|null} selection - Selected atom ids.
   * @returns {void}
   */
  function drawSelection(mol, selection) {
    layers.selection.replaceChildren();
    if (!selection || selection.size === 0) {
      return;
    }
    for (const bond of mol.bonds.values()) {
      if (selection.has(bond.a) && selection.has(bond.b)) {
        const a = mol.atoms.get(bond.a);
        const b = mol.atoms.get(bond.b);
        line({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }, 'sel-bond', layers.selection);
      }
    }
    for (const id of selection) {
      const atom = mol.atoms.get(id);
      if (atom) {
        const node = el('circle', { class: 'sel-atom', cx: atom.x, cy: atom.y, r: 10 }, layers.selection);
        node.dataset.atomId = String(id);
      }
    }
  } // End of function drawSelection()

  /**
   * Redraws the transient previews: a ghost bond (with its "N C" counter when
   * it has a `count`), a ghost zigzag chain with its "N C" counter, or the
   * marquee rectangle, or the ghost ring of Anillos (its outline and the
   * bond that hangs it from an atom).
   *
   * @param {object|null} preview - `{type: 'bond', from, to, order, count?, element?, fromDot?}` (`element`:
   *   symbol of the new end atom of an element-tool drag; `fromDot: false` when the drag starts on a
   *   heteroatom, which gets no dot), `{type: 'chain', points, count}` or `{type: 'ring', points, bond}`.
   * @param {{x: number, y: number, width: number, height: number}|null} marquee - The marquee rectangle.
   * @returns {void}
   */
  function drawPreview(preview, marquee) {
    layers.preview.replaceChildren();
    if (marquee) {
      el('rect', { class: 'marquee', x: marquee.x, y: marquee.y, width: marquee.width, height: marquee.height }, layers.preview);
    }
    if (!preview) {
      return;
    }
    const dots = showsCarbonDots(mode);
    if (preview.type === 'ring') {
      const pts = preview.points;
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % pts.length];
        line({ x1: p.x, y1: p.y, x2: q.x, y2: q.y }, 'preview-line preview-ring', layers.preview);
      });
      if (preview.bond) {
        const { from, to } = preview.bond;
        line({ x1: from.x, y1: from.y, x2: to.x, y2: to.y }, 'preview-line preview-ring', layers.preview);
      }
      return;
    }
    if (preview.type === 'chain') {
      const pts = preview.points;
      for (let i = 1; i < pts.length; i += 1) {
        line({ x1: pts[i - 1].x, y1: pts[i - 1].y, x2: pts[i].x, y2: pts[i].y }, 'preview-line', layers.preview);
      }
      if (dots) {
        // Every future carbon but the last (which gets the end marker) is dotted.
        for (const p of pts.slice(0, -1)) {
          el('circle', { class: 'preview-dot', cx: p.x, cy: p.y, r: CARBON_DOT_RADIUS }, layers.preview);
        }
      }
      const end = pts[pts.length - 1];
      el('circle', { class: 'preview-end', cx: end.x, cy: end.y, r: 4 }, layers.preview);
      text('chain-counter', { x: end.x, y: end.y - 22 }, `${preview.count} C`, layers.preview);
      return;
    }
    for (const s of symmetricSegments(preview.from, preview.to, preview.order)) {
      line(s, 'preview-line', layers.preview);
    }
    if (dots && preview.fromDot !== false) {
      el('circle', { class: 'preview-dot', cx: preview.from.x, cy: preview.from.y, r: CARBON_DOT_RADIUS }, layers.preview);
    }
    el('circle', { class: 'preview-end', cx: preview.to.x, cy: preview.to.y, r: 4 }, layers.preview);
    if (preview.element && preview.element !== 'C') {
      // The element tool: the new atom at the end shows its symbol.
      text('preview-label', { x: preview.to.x, y: preview.to.y - 16 }, preview.element, layers.preview);
    }
    if (preview.count) {
      text('chain-counter', { x: preview.to.x, y: preview.to.y - 22 }, `${preview.count} C`, layers.preview);
    }
  } // End of function drawPreview()

  /**
   * Draws the molecule and the transient state. With `rightAngle` (the 90°
   * view, Con carbonos only) the molecule is expected at its projected
   * coordinates: multiple bonds become `=` / `≡` strokes centred on the bond
   * and every stroke stops short of the labels (rightAngleSegments()).
   *
   * @param {object} mol - The molecule, at the coordinates to draw.
   * @param {{hover?: {type: string, id: number}|null, preview?: object|null, selection?: Set<number>|null,
   *   marquee?: object|null, rightAngle?: boolean}} [state] - Hovered item, drag preview, selected atoms,
   *   marquee rectangle and whether the 90° view is drawn.
   * @returns {void}
   */
  function render(mol, state = {}) {
    if (mol !== lastMol) {
      // Rings of added carbons belong to the drawing they were put on.
      layers.flash.querySelectorAll('.added-ring').forEach((ring) => ring.remove());
    }
    lastMol = mol;
    const hover = state.hover || null;
    const condensed = mode === 'condensed';
    lastRightAngle = Boolean(state.rightAngle) && condensed;
    svg.classList.toggle('is-right-angle', lastRightAngle);
    layers.bonds.replaceChildren();
    layers.atoms.replaceChildren();
    const centres = lastRightAngle ? null : ringBondCentres(mol);
    for (const bond of mol.bonds.values()) {
      const group = el('g', { class: 'bond' }, layers.bonds);
      group.dataset.bondId = String(bond.id);
      group.dataset.order = String(bond.order);
      if (hover && hover.type === 'bond' && hover.id === bond.id) {
        group.classList.add('is-hover');
      }
      const a = mol.atoms.get(bond.a);
      const b = mol.atoms.get(bond.b);
      line({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }, 'bond-halo', group);
      if (lastRightAngle) {
        for (const s of rightAngleSegments(mol, bond.id)) {
          line(s, 'bond-line', group);
        }
        continue;
      }
      const [cutA, cutB] = bondEndCuts(mol, bond.id, mode);
      for (const s of bondSegments(mol, bond.id, centres)) {
        line(cutA > 0 || cutB > 0 ? trimSegment(s, cutA, cutB) : s, 'bond-line', group);
      }
    } // End of the loop that draws the bonds
    for (const atom of mol.atoms.values()) {
      const node = el('circle', { class: 'atom', cx: atom.x, cy: atom.y, r: 9 }, layers.atoms);
      node.dataset.atomId = String(atom.id);
      if (hover && hover.type === 'atom' && hover.id === atom.id) {
        node.classList.add('is-hover');
      }
      if (showsCarbonDots(mode) && atom.element === 'C') {
        const dot = el('circle', { class: 'carbon-dot', cx: atom.x, cy: atom.y, r: CARBON_DOT_RADIUS }, layers.atoms);
        dot.dataset.atomId = String(atom.id);
      }
      const label = atomLabelText(mol, atom.id, mode);
      if (label) {
        const cls = atom.element === 'C' ? 'atom-label' : `atom-label hetero-label element-${atom.element}`;
        const node = text(cls, atomLabelPosition(mol, atom.id, mode), label, layers.atoms);
        node.dataset.atomId = String(atom.id);
        node.dataset.element = atom.element;
      }
    } // End of the loop that draws the atoms
    drawSelection(mol, state.selection || null);
    drawPreview(state.preview || null, state.marquee || null);
    drawHighlights();
    drawLocants();
  } // End of function render()

  /**
   * Highlights atoms and bonds (the stepper's API). Replaces any previous
   * highlight; pass null to clear.
   *
   * @param {{atoms?: number[], bonds?: number[], style?: string}|object[]|null} spec - One spec or a list; style is parent|candidate|substituent|locant.
   * @returns {void}
   */
  function highlight(spec) {
    highlights = normalizeHighlight(spec);
    drawHighlights();
  }

  /**
   * Removes every highlight.
   *
   * @returns {void}
   */
  function clearHighlight() {
    highlight(null);
  }

  /**
   * Shows locant numbers next to atoms; pass null to hide them.
   *
   * @param {Map<number, number|string>|Array<[number, number|string]>|null} map - Atom id → number.
   * @returns {void}
   */
  function showLocants(map) {
    locants = map ? new Map(map) : null;
    drawLocants();
  }

  /**
   * Briefly marks atoms of the last drawing: by default the atoms involved in
   * a refused edit (red ring, while the canvas shakes); the 90° view passes
   * `added-ring` to show the carbons a gesture added. A newer flash replaces
   * an older one.
   *
   * @param {number[]} atomIds - Atoms to mark.
   * @param {{className?: string, duration?: number}} [options] - Ring class (default `reject-ring`) and
   *   how long the rings stay, in ms (default 700).
   * @returns {void}
   */
  function flash(atomIds, options = {}) {
    layers.flash.replaceChildren();
    const className = options.className || 'reject-ring';
    for (const id of atomIds || []) {
      const atom = lastMol && lastMol.atoms.get(id);
      if (atom) {
        el('circle', { class: className, cx: atom.x, cy: atom.y, r: 12 }, layers.flash);
      }
    }
    const win = doc.defaultView;
    if (win) {
      const rings = [...layers.flash.children];
      win.setTimeout(() => rings.forEach((ring) => ring.remove()), options.duration ?? 700);
    }
  } // End of function flash()

  /**
   * Sets the display mode (the caller re-renders).
   *
   * @param {string} name - One of DISPLAY_MODES.
   * @returns {void}
   * @throws {Error} For an unknown mode.
   */
  function setMode(name) {
    if (!DISPLAY_MODES.includes(name)) {
      throw new Error(`setMode: unknown display mode ${name}`);
    }
    mode = name;
    svg.dataset.displayMode = name;
  }

  /**
   * The display mode.
   *
   * @returns {string} One of DISPLAY_MODES.
   */
  function getMode() {
    return mode;
  }

  /**
   * The current pan/zoom view.
   *
   * @returns {{scale: number, x: number, y: number}} A copy of the view.
   */
  function getView() {
    return { ...view };
  }

  /**
   * Applies a pan/zoom view to the drawing (the zoom is clamped).
   *
   * @param {{scale: number, x: number, y: number}} next - The view.
   * @returns {void}
   */
  function setView(next) {
    view = { scale: clampZoom(next.scale), x: next.x, y: next.y };
    root.setAttribute('transform', `matrix(${view.scale} 0 0 ${view.scale} ${view.x} ${view.y})`);
  }

  /**
   * Converts client coordinates through a CTM.
   *
   * @param {DOMMatrix|null} matrix - Screen CTM of the target coordinate system.
   * @param {number} clientX - Client x.
   * @param {number} clientY - Client y.
   * @returns {{x: number, y: number}} The point.
   */
  function fromClient(matrix, clientX, clientY) {
    if (!matrix) {
      return { x: clientX, y: clientY };
    }
    const p = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
  }

  /**
   * Converts client (viewport) coordinates to canvas (viewBox) coordinates,
   * i.e. before the pan/zoom view.
   *
   * @param {number} clientX - Client x.
   * @param {number} clientY - Client y.
   * @returns {{x: number, y: number}} The canvas point.
   */
  function clientToCanvas(clientX, clientY) {
    return fromClient(svg.getScreenCTM(), clientX, clientY);
  }

  /**
   * The canvas area actually visible (the SVG box may be wider or taller
   * than its viewBox), in canvas units.
   *
   * @returns {{x: number, y: number, width: number, height: number}} The visible rectangle.
   */
  function visibleRect() {
    const box = svg.getBoundingClientRect();
    const p = clientToCanvas(box.left, box.top);
    const q = clientToCanvas(box.right, box.bottom);
    return rectFromCorners(p, q);
  }

  /**
   * Converts client (viewport) coordinates to drawing coordinates.
   *
   * @param {number} clientX - Client x.
   * @param {number} clientY - Client y.
   * @returns {{x: number, y: number}} The drawing point.
   */
  function clientToModel(clientX, clientY) {
    return fromClient(root.getScreenCTM(), clientX, clientY);
  }

  /**
   * Converts drawing coordinates to client (viewport) coordinates.
   *
   * @param {{x: number, y: number}} point - The drawing point.
   * @returns {{x: number, y: number}} The client point.
   */
  function modelToClient(point) {
    const matrix = root.getScreenCTM();
    if (!matrix) {
      return { x: point.x, y: point.y };
    }
    const p = new DOMPoint(point.x, point.y).matrixTransform(matrix);
    return { x: p.x, y: p.y };
  }

  svg.dataset.displayMode = mode;
  return {
    render,
    highlight,
    clearHighlight,
    showLocants,
    flash,
    setMode,
    getMode,
    getView,
    setView,
    visibleRect,
    clientToCanvas,
    clientToModel,
    modelToClient,
    root,
  };
} // End of function createRenderer()
