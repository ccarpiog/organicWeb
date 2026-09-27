/**
 * @file SVG rendering of the molecule (design.md §6.3): skeletal bonds drawn
 * as one, two or three strokes, hover highlight, the drag preview, and the
 * highlight API used by the stepper (`highlight`, `showLocants`).
 *
 * The geometry of the strokes (bondSegments(), carbonLabel()) is pure and
 * unit-tested; createRenderer() is the only part touching the DOM, and only
 * when called, so the module can be imported under Node.
 */

import { implicitH, neighbours, toSubscript } from '../model/molecule.js';
import { cross } from './geometry.js';

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

/**
 * Condensed label of a carbon: C plus its implicit hydrogens (`CH₄`, `CH₃`,
 * `CH₂`, `CH`, `C`). Never contains `=`.
 *
 * @param {object} mol - The molecule.
 * @param {number} atomId - The carbon.
 * @returns {string} The label with Unicode subscripts.
 */
export function carbonLabel(mol, atomId) {
  const h = implicitH(mol, atomId);
  if (h === 0) {
    return 'C';
  }
  return h === 1 ? 'CH' : `CH${toSubscript(h)}`;
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
 * Strokes of a bond: one line for a single bond; for a double bond the main
 * line plus a shorter one offset toward the inside of the zigzag (two
 * centred lines when there is no inside, e.g. a terminal or linear bond);
 * three lines for a triple bond.
 *
 * @param {object} mol - The molecule.
 * @param {number} bondId - The bond.
 * @returns {{x1: number, y1: number, x2: number, y2: number}[]} The strokes, main line first.
 */
export function bondSegments(mol, bondId) {
  const bond = mol.bonds.get(bondId);
  const a = mol.atoms.get(bond.a);
  const b = mol.atoms.get(bond.b);
  if (bond.order === 2) {
    const side = innerSide(mol, bond);
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
 * `g.mol-root` group (later phases put the pan/zoom transform on it), in
 * layers: highlight, bonds, atoms, preview, locants.
 *
 * @param {SVGSVGElement} svg - The canvas element.
 * @returns {object} `{render, highlight, clearHighlight, showLocants, flash, clientToModel, modelToClient, root}`.
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
  for (const name of ['highlight', 'bonds', 'atoms', 'preview', 'locants', 'flash']) {
    layers[name] = el('g', { class: `mol-${name}` }, root);
  }
  let highlights = [];
  let locants = null;
  let lastMol = null;

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
        const p = locantPosition(lastMol, id);
        const text = el('text', { class: 'locant', x: p.x, y: p.y, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, layers.locants);
        text.dataset.atomId = String(id);
        text.textContent = String(number);
      }
    }
  } // End of function drawLocants()

  /**
   * Redraws the drag preview (a ghost bond).
   *
   * @param {{from: {x: number, y: number}, to: {x: number, y: number}, order: number}|null} preview - The preview.
   * @returns {void}
   */
  function drawPreview(preview) {
    layers.preview.replaceChildren();
    if (!preview) {
      return;
    }
    for (const s of symmetricSegments(preview.from, preview.to, preview.order)) {
      line(s, 'preview-line', layers.preview);
    }
    el('circle', { class: 'preview-end', cx: preview.to.x, cy: preview.to.y, r: 4 }, layers.preview);
  }

  /**
   * Draws the molecule and the transient state.
   *
   * @param {object} mol - The molecule.
   * @param {{hover?: {type: string, id: number}|null, preview?: object|null}} [state] - Hovered item and drag preview.
   * @returns {void}
   */
  function render(mol, state = {}) {
    lastMol = mol;
    const hover = state.hover || null;
    layers.bonds.replaceChildren();
    layers.atoms.replaceChildren();
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
      for (const s of bondSegments(mol, bond.id)) {
        line(s, 'bond-line', group);
      }
    } // End of the loop that draws the bonds
    for (const atom of mol.atoms.values()) {
      const isolated = neighbours(mol, atom.id).length === 0;
      const node = el('circle', { class: 'atom', cx: atom.x, cy: atom.y, r: 9 }, layers.atoms);
      node.dataset.atomId = String(atom.id);
      if (hover && hover.type === 'atom' && hover.id === atom.id) {
        node.classList.add('is-hover');
      }
      if (isolated) {
        // A lone carbon has no bond to show it: label it (methane is CH₄).
        const text = el('text', { class: 'atom-label', x: atom.x, y: atom.y, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, layers.atoms);
        text.dataset.atomId = String(atom.id);
        text.textContent = carbonLabel(mol, atom.id);
      }
    } // End of the loop that draws the atoms
    drawPreview(state.preview || null);
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
   * Briefly marks atoms involved in a refused edit (red ring that shakes).
   *
   * @param {number[]} atomIds - Atoms to mark.
   * @returns {void}
   */
  function flash(atomIds) {
    layers.flash.replaceChildren();
    for (const id of atomIds || []) {
      const atom = lastMol && lastMol.atoms.get(id);
      if (atom) {
        el('circle', { class: 'reject-ring', cx: atom.x, cy: atom.y, r: 12 }, layers.flash);
      }
    }
    const view = doc.defaultView;
    if (view) {
      view.setTimeout(() => layers.flash.replaceChildren(), 700);
    }
  } // End of function flash()

  /**
   * Converts client (viewport) coordinates to drawing coordinates.
   *
   * @param {number} clientX - Client x.
   * @param {number} clientY - Client y.
   * @returns {{x: number, y: number}} The drawing point.
   */
  function clientToModel(clientX, clientY) {
    const matrix = root.getScreenCTM();
    if (!matrix) {
      return { x: clientX, y: clientY };
    }
    const p = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
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

  return {
    render,
    highlight,
    clearHighlight,
    showLocants,
    flash,
    clientToModel,
    modelToClient,
    root,
  };
} // End of function createRenderer()
