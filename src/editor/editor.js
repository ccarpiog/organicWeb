/**
 * @file SVG sketcher (design.md §6.1): tools, pointer gestures, transactions,
 * undo/redo, selection, pan/zoom, keyboard shortcuts and the highlight API.
 *
 * Two layers:
 * - createEditorCore(): all the editing logic, DOM-free (unit-tested). It
 *   receives pointer positions in drawing units and owns the molecule, the
 *   current tool, the in-progress gesture, the selection and the history.
 * - createEditor(svg): binds the core to an SVG canvas with pointer events
 *   (mouse, touch and pen), pan (space+drag, middle drag, two fingers), zoom
 *   (wheel, pinch), keyboard shortcuts, Esc to cancel, rendering, the display
 *   mode and the shake feedback.
 *
 * Edit events: every change notification carries `{reason, kind}`; `kind`
 * is 'chemical' (atoms, bonds or orders changed) or 'coordinates' (only
 * positions changed: Mover, a later redraw) for committed edits, undo, redo
 * and restore, and null otherwise. onEdit() subscribes to those edits only.
 * Only chemical edits may invalidate a shown name (design.md §6.3).
 *
 * Transaction rules: every gesture commits at most ONE undo entry, applied to
 * a draft copy of the molecule that must pass `validateStructure()` before it
 * replaces the current one; a refused edit leaves the molecule untouched and
 * reports a Spanish message. While a drag is in progress nothing is mutated
 * (only a preview is shown), so Esc or pointer cancel trivially restores the
 * starting state.
 *
 * Display projection (the 90° view, design.md §6.3): setProjector(fn) makes
 * the editor draw the molecule at the positions `fn(mol)` returns (computed
 * once per molecule version) instead of its own coordinates, which the
 * projection never changes. The projected drawing stays editable: the core
 * hit-tests pointer gestures on the projected positions (its `display`
 * option) and turns each gesture into an ordinary model edit, whose new
 * carbons get model coordinates by the §6.2 rules (projectedGesture rules in
 * createEditorCore()); the projection is then recomputed and the carbons the
 * gesture added (or whose bond changed) flash briefly (addedAtoms()). Only
 * Mover is unavailable there (a left drag with it pans), since moving a
 * projected carbon would change nothing visible. When the projector falls
 * back (empty drawing, loose pieces, no clean placement…) the normal drawing
 * is shown, and the first edit that makes the molecule projectable switches
 * to the projection by itself.
 *
 * Element tool (design.md §6.1): tool 'carbon' places and changes atoms of
 * the palette element picked with setElement() (carbon after setTool('carbon')).
 * A click on empty space places a lone atom of it; a click on an atom of
 * another element changes that atom (refused when its bonds exceed the new
 * valence), a click on an atom of the same element grows a new one from it
 * (single bond); a drag creates its new END atom with that element (a start
 * atom on empty space is a carbon; releasing on an existing atom only bonds).
 * Bond tools always create carbons and never change an element.
 *
 * Ring tool (Anillos, design.md §6.1): tool 'ring' places a regular ring of
 * setRingSize() carbons (3–8, single bonds, standard bond length): a click on
 * empty space draws a free ring centred there (flat side at the bottom); on
 * an atom, a ring hung from it by a single bond along its best free §6.2
 * direction; on a bond, a ring fused on that bond, on its side with fewer
 * neighbours. A new ring atom too near an existing atom refuses the whole
 * ring. A drag counts as a click where it started. While hovering (outside
 * the 90° view) the ring about to be placed is previewed.
 *
 * Test API: the instance exposes getMolecule(), getMoleculeJSON(), setTool(),
 * getTool(), setElement(), getElement(), setRingSize(), getRingSize(), undo(), redo(), clear(), loadMolecule(), setCoordinates(),
 * animateCoordinates(), isAnimating(), onEdit(), getSelection(),
 * getView(), setDisplayMode(), setProjector(), getProjection(), isProjected(),
 * getShownMolecule(), atomClientPoint(), bondClientPoint(), modelToClient()
 * and clientToModel(). The app publishes it as `window.__editor` (src/ui/app.js)
 * for end-to-end tests.
 */

import {
  createMolecule, addAtom, removeAtom, addBond, removeBond, setBondOrder, bondBetween, bondOrderSum,
  cloneMolecule, moleculeToJSON, moleculeFromJSON,
} from '../model/molecule.js';
import { validateStructure, valenceMessage, MESSAGES, MAX_CHAIN } from '../model/validate.js';
import { valenceOf, isSupportedElement, ELEMENT_NAMES_ES } from '../model/elements.js';
import { createHistory } from './history.js';
import {
  nextAtomPosition, snapEndpoint, hitTest, distance, straightenLinearCentres, overlappingAtoms,
  chainPoints, chooseChainSide, clearance, ATOM_HIT_RADIUS, BOND_LENGTH, MIN_CLEARANCE,
  RING_SIZES, freeRingPoints, attachedRingPoints, fusedRingPoints, fusedRingSide, ringAttachAngles, pointsClear,
} from './geometry.js';
import {
  createRenderer, rectFromCorners, moleculeBounds, zoomView, panView, fitView, IDENTITY_VIEW,
} from './render.js';

/**
 * Tool ids, in toolbar order (design.md §6.1). 'carbon' is the element tool
 * of the palette: it places and changes atoms of the selected element
 * (setElement(); carbon by default), keeping its historical id.
 */
export const TOOLS = Object.freeze(['carbon', 'single', 'double', 'triple', 'cycle', 'erase', 'move', 'ring']);

/** Ring size of the Anillos tool until setRingSize() picks another (design.md §6.1). */
export const DEFAULT_RING_SIZE = 6;

/** Bond order drawn by each bond-making tool. */
const TOOL_ORDER = Object.freeze({ carbon: 1, single: 1, double: 2, triple: 3 });

/** Default tool (design.md §6.1: simple bond). */
export const DEFAULT_TOOL = 'single';

/** Pointer travel (drawing units) above which a press becomes a drag. */
export const DRAG_THRESHOLD = 6;

/**
 * Spanish messages for refused edits (design.md §6.1). Messages about atoms
 * that may not be carbon say "átomo"; FULL is the carbon case of the
 * element-specific "ya tiene N enlaces" message (fullMessage()).
 */
export const EDIT_MESSAGES = Object.freeze({
  FULL: 'Este carbono ya tiene 4 enlaces.',
  VALENCE: MESSAGES.VALENCE,
  SELF: 'No se puede unir un átomo consigo mismo.',
  DUPLICATE: 'Estos dos átomos ya están unidos.',
  NO_ORDER: 'Este enlace no puede cambiar: sus átomos no admiten más enlaces.',
  OVERLAP: 'No hay sitio: ese átomo quedaría encima de otro.',
  INVALID: MESSAGES.INVALID,
});

/**
 * Keyboard shortcuts without modifiers (design.md §6.1): key → tool. `h`, the
 * shortcut of the former Cadena tool, selects Enlace simple, whose drag now
 * draws chains. `a` (anillo) selects Anillos; pressed again while Anillos is
 * the tool, it moves to the next ring size (the editor shell, nextRingSize()).
 */
const TOOL_KEYS = Object.freeze({
  1: 'single', 2: 'double', 3: 'triple', t: 'cycle', h: 'single', e: 'erase', delete: 'erase', m: 'move', a: 'ring',
});

/**
 * The ring size after `size` in RING_SIZES, wrapping from 8 back to 3 (the
 * `a` key while Anillos is already the tool). Pure.
 *
 * @param {number} size - The current ring size.
 * @returns {number} The next size (the first one when `size` is not offered).
 */
export function nextRingSize(size) {
  const index = RING_SIZES.indexOf(size);
  return RING_SIZES[(index + 1) % RING_SIZES.length];
}

/**
 * Keyboard shortcuts of the element palette (design.md §6.1): key → element
 * of the element tool: each symbol's first letter, except `l` for Cl (`c`
 * is carbon) and `b` for Br. No clash with the tool keys (`e` stays Borrar).
 */
export const ELEMENT_KEYS = Object.freeze({ c: 'C', o: 'O', n: 'N', f: 'F', l: 'Cl', b: 'Br', i: 'I' });

/**
 * Maps a key press to an editor command (design.md §6.1): `c o n f l b i`
 * pick carbono, oxígeno, nitrógeno, flúor, cloro, bromo or yodo for the
 * element tool, `1/2/3` bond tools (`h` also Enlace simple), `t` Cambiar
 * enlace, `e`/`Supr` Borrar, `m` Mover, `a` Anillos, Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z (or
 * Ctrl/Cmd+Y) redo. Pure.
 *
 * @param {{key: string, ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean, altKey?: boolean}} event - The key event.
 * @returns {{tool: string, element?: string}|{action: string}|null} The command (`element` for the
 *   palette keys, with tool 'carbon'), or null when the key is not a shortcut.
 */
export function shortcutFor(event) {
  if (!event || typeof event.key !== 'string' || event.altKey) {
    return null;
  }
  const key = event.key.toLowerCase();
  if (event.ctrlKey || event.metaKey) {
    if (key === 'z') {
      return { action: event.shiftKey ? 'redo' : 'undo' };
    }
    return key === 'y' && !event.shiftKey ? { action: 'redo' } : null;
  }
  if (Object.prototype.hasOwnProperty.call(ELEMENT_KEYS, key)) {
    return { tool: 'carbon', element: ELEMENT_KEYS[key] };
  }
  return Object.prototype.hasOwnProperty.call(TOOL_KEYS, key) ? { tool: TOOL_KEYS[key] } : null;
} // End of function shortcutFor()

/**
 * Spanish refusal for changing an atom to an element whose valence its
 * bonds already exceed, e.g. "No se puede cambiar a oxígeno: este átomo
 * tiene 3 enlaces y el oxígeno solo admite 2." Pure.
 *
 * @param {string} element - The element asked for.
 * @param {number} bonds - Sum of the atom's bond orders.
 * @returns {string} The message.
 */
export function elementChangeMessage(element, bonds) {
  const name = ELEMENT_NAMES_ES[element] || element;
  const max = valenceOf(element);
  return `No se puede cambiar a ${name}: este átomo tiene ${bonds} ${bonds === 1 ? 'enlace' : 'enlaces'} `
    + `y el ${name} solo admite ${max}.`;
}

/**
 * Classifies the change between two snapshots (moleculeToJSON() output):
 * 'chemical' when atoms, elements, bonds or orders differ, 'coordinates' when
 * only positions differ, 'none' when nothing does. Id counters are ignored.
 *
 * @param {object} before - Snapshot before.
 * @param {object} after - Snapshot after.
 * @returns {'chemical'|'coordinates'|'none'} The kind of edit.
 */
export function editKind(before, after) {
  const topology = (json) => JSON.stringify([
    json.atoms.map((a) => [a.id, a.element]),
    json.bonds.map((b) => [b.id, b.a, b.b, b.order]),
  ]);
  if (topology(before) !== topology(after)) {
    return 'chemical';
  }
  const coords = (json) => JSON.stringify(json.atoms.map((a) => [a.x, a.y]));
  return coords(before) === coords(after) ? 'none' : 'coordinates';
} // End of function editKind()

/**
 * Neutral valence of an atom of a molecule (elements.js), 0 when it is missing.
 *
 * @param {object} mol - The molecule.
 * @param {number} atomId - The atom.
 * @returns {number} The valence.
 */
function atomValence(mol, atomId) {
  const atom = mol.atoms.get(atomId);
  return atom ? valenceOf(atom.element) : 0;
}

/**
 * Spanish "already full" message for an element: EDIT_MESSAGES.FULL for
 * carbon, e.g. "Este oxígeno ya tiene 2 enlaces." otherwise.
 *
 * @param {string} element - The element symbol.
 * @returns {string} The message.
 */
function fullMessage(element) {
  if (element === 'C' || !ELEMENT_NAMES_ES[element]) {
    return EDIT_MESSAGES.FULL;
  }
  const max = valenceOf(element);
  return `Este ${ELEMENT_NAMES_ES[element]} ya tiene ${max} ${max === 1 ? 'enlace' : 'enlaces'}.`;
}

/**
 * Builds a refusal for atoms that would exceed their valence: "ya tiene N
 * enlaces" when one of them is already full, the element's valence message
 * otherwise (the carbon messages are unchanged).
 *
 * @param {object} mol - The molecule before the edit.
 * @param {number[]} atomIds - The atoms that would be over-bonded.
 * @returns {{message: string, atoms: number[]}} The refusal.
 */
function valenceRefusal(mol, atomIds) {
  const full = atomIds.find((id) => mol.atoms.has(id) && bondOrderSum(mol, id) >= atomValence(mol, id));
  if (full !== undefined) {
    return { message: fullMessage(mol.atoms.get(full).element), atoms: atomIds };
  }
  const first = atomIds.find((id) => mol.atoms.has(id));
  const message = first === undefined ? EDIT_MESSAGES.VALENCE : valenceMessage(mol.atoms.get(first).element);
  return { message, atoms: atomIds };
} // End of function valenceRefusal()

/**
 * Checks that adding `extra` bond order to each atom keeps it within valence.
 *
 * @param {object} mol - The molecule.
 * @param {number[]} atomIds - Atoms gaining bond order.
 * @param {number} extra - Order added to each.
 * @returns {{message: string, atoms: number[]}|null} A refusal, or null when there is room.
 */
function checkRoom(mol, atomIds, extra) {
  const over = atomIds.filter((id) => bondOrderSum(mol, id) + extra > atomValence(mol, id));
  return over.length > 0 ? valenceRefusal(mol, over) : null;
}

/**
 * Removes one item from an array, if present.
 *
 * @param {Array} list - The array (mutated).
 * @param {*} item - The item.
 * @returns {void}
 */
function removeFrom(list, item) {
  const index = list.indexOf(item);
  if (index >= 0) {
    list.splice(index, 1);
  }
}

/**
 * What the 90° view flashes after a gesture, since the projection re-lays
 * the drawing out (design.md §6.3): the atoms the edit added or, when it
 * added none, the atoms whose element changed and the ends of every bond it
 * added or whose order it changed. Pure.
 *
 * @param {object} before - The molecule before the edit.
 * @param {object} after - The molecule after the edit.
 * @returns {number[]} Atom ids (present in `after`), ascending.
 */
export function addedAtoms(before, after) {
  const atoms = new Set();
  for (const id of after.atoms.keys()) {
    if (!before.atoms.has(id)) {
      atoms.add(id);
    }
  }
  if (atoms.size > 0) {
    return [...atoms].sort((p, q) => p - q);
  }
  for (const atom of after.atoms.values()) {
    const old = before.atoms.get(atom.id);
    if (old && old.element !== atom.element) {
      atoms.add(atom.id);
    }
  }
  for (const bond of after.bonds.values()) {
    const old = before.bonds.get(bond.id);
    if (!old || old.a !== bond.a || old.b !== bond.b || old.order !== bond.order) {
      atoms.add(bond.a);
      atoms.add(bond.b);
    }
  }
  return [...atoms].sort((p, q) => p - q);
} // End of function addedAtoms()

/**
 * Creates the DOM-free editor core.
 *
 * Projected gestures (the 90° view, design.md §6.1/§6.3): `options.display()`
 * returns the molecule as drawn — the same atoms and bonds at projected
 * positions — or null when the model's own drawing is shown. A gesture keeps
 * the display it started on. With a display:
 * - hover, the pressed item, the release target and a snapped end landing on
 *   a carbon are all hit-tested on the projected positions, and drag previews
 *   are drawn there;
 * - a carbon grown from an existing carbon (click, one-bond drag to empty
 *   space, each carbon of an Enlace simple chain drag) gets its model
 *   position from nextAtomPosition() (§6.2 zigzag), since the drag direction
 *   has no meaning in the model; a chain drag adds as many carbons as the
 *   projected drag measures;
 * - a new loose piece (a click or drag on empty space) is placed at the
 *   pressed points in the model (both drawings share their centre), moved
 *   down by whole bond lengths until it clears every model atom (loosePoints());
 * - bond orders, joins and erasures act on the hit ids, as usual;
 * - Mover does nothing (the shell pans instead).
 *
 * @param {{onChange?: Function, onReject?: Function, onEdit?: Function, display?: function(): (object|null)}} [options]
 *   Listeners: onChange({reason, kind}) after every committed edit, undo, redo, restore, tool, gesture or
 *   selection change; onEdit({reason, kind}) only for changes of the molecule (kind 'chemical' or
 *   'coordinates'); onReject({message, atoms}) when an edit is refused. Events of an edit recorded
 *   with canvas views (setCoordinates() with `view`), and of its undo and redo, also carry the
 *   `view` to show. `display()`: the projected drawing, or null (see above).
 * @returns {object} The core API (see the returned object).
 */
export function createEditorCore(options = {}) {
  const displayOf = typeof options.display === 'function' ? options.display : () => null;
  let mol = createMolecule();
  let tool = DEFAULT_TOOL;
  let element = 'C'; // Element of the element tool ('carbon').
  let ringSize = DEFAULT_RING_SIZE; // Ring size of the Anillos tool ('ring').
  let gesture = null;
  let hover = null;
  let pointer = null; // Last pointer position without a gesture (the ring preview follows it).
  let selection = new Set();
  const history = createHistory();
  const changeListeners = options.onChange ? [options.onChange] : [];
  const rejectListeners = options.onReject ? [options.onReject] : [];
  const editListeners = options.onEdit ? [options.onEdit] : [];

  /**
   * Notifies change listeners and, for changes of the molecule, edit listeners.
   *
   * @param {string} reason - 'edit' | 'undo' | 'redo' | 'restore' | 'tool' | 'gesture' | 'selection'.
   * @param {'chemical'|'coordinates'|null} [kind] - What changed, for changes of the molecule.
   * @param {object|null} [view] - Canvas view that goes with the new state (a transaction
   *   recorded with views, see setCoordinates()); the event then carries it as `view`.
   * @returns {void}
   */
  function emit(reason, kind = null, view = null) {
    if (kind) {
      // Atoms that no longer exist leave the selection.
      selection = new Set([...selection].filter((id) => mol.atoms.has(id)));
      // A hover on an atom or bond that no longer exists is dropped too (the ring preview reads it).
      if (!targetExists(hover)) {
        hover = null;
      }
    }
    const event = view ? { reason, kind, view } : { reason, kind };
    for (const listener of changeListeners) {
      listener(event);
    }
    if (kind) {
      for (const listener of editListeners) {
        listener(event);
      }
    }
  } // End of function emit()

  /**
   * Tells whether a hit-test target still names an atom or bond of the
   * current molecule (a replaced molecule can leave a stale id behind).
   *
   * @param {{type: string, id: number}|null} target - An atom or bond target.
   * @returns {boolean} True when the target is null or exists in the molecule.
   */
  function targetExists(target) {
    if (!target) {
      return true;
    }
    return target.type === 'atom' ? mol.atoms.has(target.id) : mol.bonds.has(target.id);
  }

  /**
   * Notifies reject listeners.
   *
   * @param {{message: string, atoms?: number[]}} refusal - Why the edit was refused.
   * @returns {{ok: false, message: string, atoms: number[]}} The failed outcome.
   */
  function reject(refusal) {
    const outcome = { ok: false, message: refusal.message, atoms: refusal.atoms || [] };
    for (const listener of rejectListeners) {
      listener(outcome);
    }
    return outcome;
  }

  /**
   * Runs one transaction: mutates a draft copy, validates it, and commits it
   * as a single undo entry. `mutate` may return a refusal to abort.
   *
   * @param {string} label - English description (debugging).
   * @param {function(object): ({message: string, atoms?: number[]}|void)} mutate - Edits the draft.
   * @param {{before: object, after: object}|null} [view] - Canvas views before and after the
   *   transaction, recorded with it (undo/redo hand them back).
   * @returns {{ok: boolean, changed?: boolean, message?: string, atoms?: number[]}} The outcome.
   */
  function transact(label, mutate, view = null) {
    const draft = cloneMolecule(mol);
    let refusal;
    try {
      refusal = mutate(draft);
    } catch (err) {
      refusal = { message: EDIT_MESSAGES.INVALID };
    }
    if (refusal) {
      return reject(refusal);
    }
    const error = validateStructure(draft);
    if (error) {
      return reject(error.code === 'VALENCE' ? valenceRefusal(mol, error.atoms || []) : { message: error.message });
    }
    // Final guard, after snapping and straightening: never commit coincident atoms.
    const overlaps = overlappingAtoms(draft, mol);
    if (overlaps.length > 0) {
      return reject({ message: EDIT_MESSAGES.OVERLAP, atoms: overlaps });
    }
    const before = moleculeToJSON(mol);
    const after = moleculeToJSON(draft);
    if (JSON.stringify(before) === JSON.stringify(after)) {
      return { ok: true, changed: false };
    }
    mol = draft;
    history.record(before, after, label, view);
    emit('edit', editKind(before, after), view ? view.after : null);
    return { ok: true, changed: true };
  } // End of function transact()

  /**
   * Adds the new atom and its bond, then re-straightens linear centres.
   *
   * @param {object} draft - Draft molecule (mutated).
   * @param {number} atomId - The atom to grow from.
   * @param {number} order - Order of the new bond.
   * @param {{x: number, y: number}} position - Where the new atom goes.
   * @param {string} [newElement] - Element of the new atom (default carbon).
   * @returns {void}
   */
  function placeAtom(draft, atomId, order, position, newElement = 'C') {
    const newId = addAtom(draft, position, newElement);
    addBond(draft, atomId, newId, order);
    straightenLinearCentres(draft, [atomId, newId]);
  }

  /**
   * Grows a new atom (a carbon unless `newElement` says otherwise) from an
   * atom. A forced position (a drag end) is used only if the final
   * coordinates, after straightening, overlap no atom; otherwise the atom
   * goes to the best free angle (§6.2). The new atom's own valence is checked
   * by validateStructure() when the transaction commits.
   *
   * @param {object} draft - Draft molecule.
   * @param {number} atomId - The atom to grow from.
   * @param {number} order - Order of the new bond.
   * @param {{x: number, y: number}} [position] - Forced position (a drag end); computed when omitted.
   * @param {string} [newElement] - Element of the new atom (default carbon).
   * @returns {{message: string, atoms: number[]}|undefined} A refusal, if any.
   */
  function grow(draft, atomId, order, position, newElement = 'C') {
    const refusal = checkRoom(draft, [atomId], order);
    if (refusal) {
      return refusal;
    }
    if (position) {
      const trial = cloneMolecule(draft);
      placeAtom(trial, atomId, order, position, newElement);
      if (overlappingAtoms(trial, draft).length === 0) {
        Object.assign(draft, trial);
        return undefined;
      }
    }
    placeAtom(draft, atomId, order, nextAtomPosition(draft, atomId, { order }), newElement);
    return undefined;
  } // End of function grow()

  /**
   * Changes an atom's element (element tool on an atom of another element),
   * refusing it when the atom's bonds exceed the new element's valence.
   *
   * @param {object} draft - Draft molecule.
   * @param {number} atomId - The atom.
   * @param {string} newElement - The new element symbol.
   * @returns {{message: string, atoms: number[]}|undefined} A refusal, if any.
   */
  function changeElement(draft, atomId, newElement) {
    const bonds = bondOrderSum(draft, atomId);
    if (bonds > valenceOf(newElement)) {
      return { message: elementChangeMessage(newElement, bonds), atoms: [atomId] };
    }
    draft.atoms.get(atomId).element = newElement;
    return undefined;
  }

  /**
   * Element of the atom a gesture creates at its free end: the palette's
   * element with the element tool, carbon with the bond tools.
   *
   * @returns {string} An element symbol.
   */
  function newEndElement() {
    return tool === 'carbon' ? element : 'C';
  }

  /**
   * Bonds two existing atoms, refusing self, duplicate and over-valence bonds.
   *
   * @param {object} draft - Draft molecule.
   * @param {number} a - First atom.
   * @param {number} b - Second atom.
   * @param {number} order - Bond order.
   * @returns {{message: string, atoms: number[]}|undefined} A refusal, if any.
   */
  function join(draft, a, b, order) {
    if (a === b) {
      return { message: EDIT_MESSAGES.SELF, atoms: [a] };
    }
    if (bondBetween(draft, a, b)) {
      return { message: EDIT_MESSAGES.DUPLICATE, atoms: [a, b] };
    }
    const refusal = checkRoom(draft, [a, b], order);
    if (refusal) {
      return refusal;
    }
    addBond(draft, a, b, order);
    straightenLinearCentres(draft, [a, b]);
    return undefined;
  } // End of function join()

  /**
   * Sets a bond's order, refusing it if an end would exceed valence, and
   * re-straightens linear centres in the same transaction.
   *
   * @param {object} draft - Draft molecule.
   * @param {number} bondId - The bond.
   * @param {number} order - New order.
   * @returns {{message: string, atoms: number[]}|undefined} A refusal, if any.
   */
  function changeOrder(draft, bondId, order) {
    const bond = draft.bonds.get(bondId);
    const refusal = checkRoom(draft, [bond.a, bond.b], order - bond.order);
    if (refusal) {
      return refusal;
    }
    setBondOrder(draft, bondId, order);
    straightenLinearCentres(draft, [bond.a, bond.b]);
    return undefined;
  }

  /**
   * Cambiar enlace: next order in 1→2→3→1 that keeps valence.
   *
   * @param {object} draft - Draft molecule.
   * @param {number} bondId - The bond.
   * @returns {{message: string, atoms: number[]}|undefined} A refusal when no other order fits.
   */
  function cycleOrder(draft, bondId) {
    const bond = draft.bonds.get(bondId);
    for (const step of [1, 2]) {
      const order = ((bond.order - 1 + step) % 3) + 1;
      if (!checkRoom(draft, [bond.a, bond.b], order - bond.order)) {
        return changeOrder(draft, bondId, order);
      }
    }
    return { message: EDIT_MESSAGES.NO_ORDER, atoms: [bond.a, bond.b] };
  }

  /**
   * Borrar on a bond: removes the bond only; its end carbons always stay.
   * §6.1 also removes ends "created only as its endpoints", but the model
   * does not record how an atom was created, and guessing (e.g. "left without
   * bonds") would delete carbons the user placed on purpose with Carbono. A
   * leftover lone carbon is one Borrar click away.
   *
   * @param {object} draft - Draft molecule.
   * @param {number} bondId - The bond.
   * @returns {void}
   */
  function eraseBond(draft, bondId) {
    removeBond(draft, bondId);
  }

  /**
   * Model positions of a new loose piece started on empty space of the
   * projected drawing: the pressed points themselves (the projection is
   * centred on the model drawing), moved down together by whole bond lengths
   * until every point clears the model atoms by MIN_CLEARANCE, since those
   * atoms are not where the projection shows them.
   *
   * @param {{x: number, y: number}[]} points - The piece's points, in drawing units.
   * @returns {{x: number, y: number}[]} The points to use in the model.
   */
  function loosePoints(points) {
    for (let k = 0; k <= 60; k += 1) {
      const moved = points.map((p) => ({ x: p.x, y: p.y + k * BOND_LENGTH }));
      if (moved.every((p) => clearance(mol, p) >= MIN_CLEARANCE)) {
        return moved;
      }
    }
    return points.map((p) => ({ x: p.x, y: p.y }));
  } // End of function loosePoints()

  /**
   * Plans an Anillos placement (design.md §6.1) of a ring of the current
   * size on the model, without changing anything: a free ring centred at the
   * point on empty space (on the projected drawing, moved to loosePoints()),
   * a ring hung from an atom by a single bond (the first of
   * ringAttachAngles() whose ring clears every atom), or a ring fused on a
   * bond (fusedRingSide()). Refused when an atom it bonds to has no room for
   * one more bond or a new atom would land too near an existing one.
   *
   * @param {{type: string, id: number}|null} target - What was clicked (ids are model ids).
   * @param {{x: number, y: number}} point - Where (drawing units).
   * @param {object|null} [display] - The projected drawing the click was made on (null: the model's).
   * @returns {{kind: 'free'|'attach'|'fuse', points: {x: number, y: number}[], atom?: number, a?: number, b?: number}
   *   |{refusal: {message: string, atoms: number[]}}|null} The plan (`points`: new atoms in ring order; for
   *   'fuse', from the one bonded to `b` to the one bonded to `a`), the refusal, or null when the target
   *   names an atom or bond that no longer exists.
   */
  function ringPlan(target, point, display = null) {
    const overlap = (atoms) => ({ refusal: { message: EDIT_MESSAGES.OVERLAP, atoms } });
    if (!targetExists(target)) {
      return null;
    }
    if (!target) {
      const centred = freeRingPoints(point, ringSize);
      const points = display ? loosePoints(centred) : centred;
      return pointsClear(mol, points) ? { kind: 'free', points } : overlap([]);
    }
    if (target.type === 'atom') {
      const refusal = checkRoom(mol, [target.id], 1);
      if (refusal) {
        return { refusal };
      }
      const anchor = mol.atoms.get(target.id);
      for (const angle of ringAttachAngles(mol, target.id)) {
        const points = attachedRingPoints(anchor, angle, ringSize);
        if (pointsClear(mol, points)) {
          return { kind: 'attach', atom: target.id, points };
        }
      }
      return overlap([target.id]);
    }
    const bond = mol.bonds.get(target.id);
    const refusal = checkRoom(mol, [bond.a, bond.b], 1);
    if (refusal) {
      return { refusal };
    }
    const side = fusedRingSide(mol, bond.a, bond.b, ringSize);
    const points = fusedRingPoints(mol.atoms.get(bond.a), mol.atoms.get(bond.b), ringSize, side);
    return pointsClear(mol, points) ? { kind: 'fuse', a: bond.a, b: bond.b, points } : overlap([bond.a, bond.b]);
  } // End of function ringPlan()

  /**
   * Adds a planned ring (ringPlan()) to a draft: its new carbons and single
   * bonds, plus the attaching bond ('attach') or the bonds closing it onto
   * the shared bond's atoms ('fuse').
   *
   * @param {object} draft - Draft molecule (mutated).
   * @param {{kind: string, points: {x: number, y: number}[], atom?: number, a?: number, b?: number}} plan - The plan.
   * @returns {void}
   */
  function applyRing(draft, plan) {
    const ids = plan.points.map((p) => addAtom(draft, p));
    if (plan.kind === 'fuse') {
      let previous = plan.b;
      for (const id of ids) {
        addBond(draft, previous, id, 1);
        previous = id;
      }
      addBond(draft, previous, plan.a, 1);
      return;
    }
    ids.forEach((id, k) => addBond(draft, id, ids[(k + 1) % ids.length], 1));
    if (plan.kind === 'attach') {
      addBond(draft, plan.atom, ids[0], 1);
    }
  } // End of function applyRing()

  /**
   * Applies a click (press and release without dragging) with the current tool.
   *
   * @param {{type: string, id: number}|null} target - What was clicked.
   * @param {{x: number, y: number}} point - Where (drawing units).
   * @param {object|null} [display] - The projected drawing the click was made on (null: the model's).
   * @returns {object|null} The transaction outcome, or null when the click does nothing.
   */
  function click(target, point, display = null) {
    const order = TOOL_ORDER[tool];
    if (tool === 'move') {
      if (!display) {
        selectClicked(target);
      }
      return null;
    }
    if (tool === 'ring') {
      const plan = ringPlan(target, point, display);
      if (!plan) {
        return null;
      }
      return plan.refusal ? reject(plan.refusal) : transact('add ring', (d) => applyRing(d, plan));
    }
    const at = display ? loosePoints([point])[0] : point;
    if (tool === 'carbon' && !target) {
      return transact('add atom', (d) => {
        addAtom(d, at, element);
      });
    }
    if (tool === 'carbon' && target && target.type === 'atom') {
      // Element tool on an atom: another element changes it; the same element grows a new atom of it.
      if (mol.atoms.get(target.id).element !== element) {
        return transact('change element', (d) => changeElement(d, target.id, element));
      }
      return transact('grow atom', (d) => grow(d, target.id, 1, undefined, element));
    }
    if (order && target && target.type === 'atom') {
      return transact('grow carbon', (d) => grow(d, target.id, order));
    }
    if (order && !target) {
      return transact('add fragment', (d) => {
        const first = addAtom(d, at);
        return grow(d, first, order);
      });
    }
    if (order && tool !== 'carbon' && target.type === 'bond') {
      return transact('set bond order', (d) => changeOrder(d, target.id, order));
    }
    if (tool === 'cycle' && target && target.type === 'bond') {
      return transact('cycle bond order', (d) => cycleOrder(d, target.id));
    }
    if (tool === 'erase' && target) {
      return transact(`erase ${target.type}`, (d) => {
        if (target.type === 'atom') {
          removeAtom(d, target.id);
        } else {
          eraseBond(d, target.id);
        }
      });
    }
    return null;
  } // End of function click()

  /**
   * Resolves where a drag of a bond-making tool would go: source point/atom,
   * snapped end point or the atom under the pointer, all in the drawing the
   * gesture was made on (the projected one in the 90° view).
   *
   * @param {object} g - The gesture.
   * @returns {{sourceAtom: number|null, from: {x: number, y: number}, targetAtom: number|null, snapAtom: number|null, to: {x: number, y: number}}|null}
   *   The plan, or null when the drag creates nothing. `targetAtom`: released on an atom; `snapAtom`: the snapped end lands on one.
   */
  function dragPlan(g) {
    if (!TOOL_ORDER[tool] || (g.target && g.target.type !== 'atom')) {
      return null;
    }
    const drawn = g.display || mol;
    const sourceAtom = g.target ? g.target.id : null;
    const from = sourceAtom ? { ...drawn.atoms.get(sourceAtom) } : { ...g.start };
    const exclude = sourceAtom ? [sourceAtom] : [];
    const over = hitTest(drawn, g.current, { atomsOnly: true });
    const targetAtom = over ? over.id : null;
    let to = targetAtom ? { ...drawn.atoms.get(targetAtom) } : snapEndpoint(from, g.current);
    // A snapped end that falls on an existing atom means that atom, not a new one on top of it.
    const landing = targetAtom ? null : hitTest(drawn, to, { atomsOnly: true, exclude });
    const snapAtom = landing ? landing.id : null;
    if (snapAtom) {
      to = { ...drawn.atoms.get(snapAtom) };
    }
    return { sourceAtom, from: { x: from.x, y: from.y }, targetAtom, snapAtom, to: { x: to.x, y: to.y } };
  } // End of function dragPlan()

  /**
   * Mover click: selects the clicked atom (or both ends of the clicked bond);
   * a click on empty space clears the selection.
   *
   * @param {{type: string, id: number}|null} target - What was clicked.
   * @returns {void}
   */
  function selectClicked(target) {
    if (!target) {
      selection = new Set();
    } else if (target.type === 'atom') {
      selection = new Set([target.id]);
    } else {
      const bond = mol.bonds.get(target.id);
      selection = new Set([bond.a, bond.b]);
    }
    emit('selection');
  } // End of function selectClicked()

  /**
   * Resolves the zigzag chain of an Enlace simple drag (design.md §6.1): it
   * starts at the pressed atom, or at the press point on empty space. The drag
   * is a chain only for the single-bond tool, when the zigzag has at least two
   * bonds and the pointer is not over an existing atom; otherwise it is a
   * one-bond drag (dragPlan()), which keeps "release on an atom bonds to it".
   * The points are in the drawing the gesture was made on (the projected one
   * in the 90° view).
   *
   * @param {object} g - The gesture.
   * @returns {{sourceAtom: number|null, points: {x: number, y: number}[], count: number}|null}
   *   The plan (`count`: carbons the chain adds), or null when the drag is not a chain.
   */
  function chainPlan(g) {
    if (tool !== 'single' || (g.target && g.target.type !== 'atom')) {
      return null;
    }
    const drawn = g.display || mol;
    if (hitTest(drawn, g.current, { atomsOnly: true })) {
      return null;
    }
    const sourceAtom = g.target ? g.target.id : null;
    const start = sourceAtom ? drawn.atoms.get(sourceAtom) : g.start;
    const origin = { x: start.x, y: start.y };
    const side = chooseChainSide(drawn, sourceAtom, origin, g.current);
    const maxBonds = sourceAtom ? MAX_CHAIN : MAX_CHAIN - 1;
    const { points, bonds } = chainPoints(origin, g.current, { side, maxBonds });
    if (bonds < 2) {
      return null;
    }
    return { sourceAtom, points, count: sourceAtom ? bonds : bonds + 1 };
  } // End of function chainPlan()

  /**
   * Commits a chain drag as one transaction: every carbon of the chain, or
   * nothing (a full start carbon, or a chain carbon landing on an existing
   * atom, refuses the whole chain). On the projected drawing a chain from a
   * carbon grows `count` carbons one after another at their §6.2 positions,
   * and a chain from empty space goes to loosePoints().
   *
   * @param {{sourceAtom: number|null, points: {x: number, y: number}[], count: number}} plan - The chainPlan() result.
   * @param {object|null} [display] - The projected drawing the drag was made on (null: the model's).
   * @returns {object} The transaction outcome.
   */
  function finishChain(plan, display = null) {
    if (display && plan.sourceAtom) {
      return transact('draw chain', (d) => {
        let previous = plan.sourceAtom;
        for (let i = 0; i < plan.count; i += 1) {
          const refusal = grow(d, previous, 1);
          if (refusal) {
            return refusal;
          }
          previous = d.nextAtomId - 1; // grow() has just added this carbon.
        }
        return undefined;
      });
    }
    const points = display ? loosePoints(plan.points) : plan.points;
    return transact('draw chain', (d) => {
      if (plan.sourceAtom) {
        const refusal = checkRoom(d, [plan.sourceAtom], 1);
        if (refusal) {
          return refusal;
        }
      }
      let previous = plan.sourceAtom ?? addAtom(d, points[0]);
      for (const point of points.slice(1)) {
        const next = addAtom(d, point);
        addBond(d, previous, next, 1);
        previous = next;
      }
      if (plan.sourceAtom) {
        straightenLinearCentres(d, [plan.sourceAtom]);
      }
      return undefined;
    });
  } // End of function finishChain()

  /**
   * Atoms inside the marquee of a gesture.
   *
   * @param {object} g - A marquee gesture.
   * @returns {Set<number>} The enclosed atom ids.
   */
  function marqueeAtoms(g) {
    const r = rectFromCorners(g.start, g.current);
    const inside = new Set();
    for (const atom of mol.atoms.values()) {
      if (atom.x >= r.x && atom.x <= r.x + r.width && atom.y >= r.y && atom.y <= r.y + r.height) {
        inside.add(atom.id);
      }
    }
    return inside;
  } // End of function marqueeAtoms()

  /**
   * Decides what a Mover press grabs: the selection (pressed on a selected
   * atom, on a bond between selected atoms, or inside the selection's box),
   * a single atom, a bond's two atoms, or nothing (a marquee starts).
   *
   * @param {{type: string, id: number}|null} target - What was pressed.
   * @param {{x: number, y: number}} point - Where.
   * @returns {number[]|null} Atom ids to move, or null for a marquee.
   */
  function moveTargets(target, point) {
    const bond = target && target.type === 'bond' ? mol.bonds.get(target.id) : null;
    const onSelection = target
      ? (target.type === 'atom' ? selection.has(target.id) : selection.has(bond.a) && selection.has(bond.b))
      : false;
    if (onSelection) {
      return [...selection];
    }
    if (target) {
      return target.type === 'atom' ? [target.id] : [bond.a, bond.b];
    }
    if (selection.size > 0) {
      const box = moleculeBounds({ atoms: new Map([...selection].map((id) => [id, mol.atoms.get(id)])) });
      const pad = ATOM_HIT_RADIUS;
      if (point.x >= box.minX - pad && point.x <= box.maxX + pad && point.y >= box.minY - pad && point.y <= box.maxY + pad) {
        return [...selection];
      }
    }
    return null;
  } // End of function moveTargets()

  /**
   * Commits a Mover drag: a coordinate edit of the grabbed atoms, or the
   * marquee selection.
   *
   * @param {object} g - The gesture.
   * @returns {object|null} The transaction outcome, or null for a marquee.
   */
  function finishMove(g) {
    if (!g.moveIds) {
      selection = marqueeAtoms(g);
      emit('selection');
      return null;
    }
    const dx = g.current.x - g.start.x;
    const dy = g.current.y - g.start.y;
    return transact('move atoms', (d) => {
      for (const id of g.moveIds) {
        const atom = d.atoms.get(id);
        atom.x += dx;
        atom.y += dy;
      }
    });
  } // End of function finishMove()

  /**
   * Commits a finished drag.
   *
   * @param {object} g - The gesture.
   * @returns {object|null} The transaction outcome, or null when the drag does nothing.
   */
  function finishDrag(g) {
    const display = g.display || null;
    if (tool === 'ring') {
      return click(g.target, g.start, display); // A ring does not follow the drag: it goes where the press was.
    }
    const chain = chainPlan(g);
    if (chain) {
      return finishChain(chain, display);
    }
    if (tool === 'move') {
      return display ? null : finishMove(g);
    }
    const plan = dragPlan(g);
    if (!plan) {
      // Cambiar enlace / Borrar: a wobbly click still counts if it ends on the same item.
      const end = hitTest(display || mol, g.current);
      const same = end && g.target && end.type === g.target.type && end.id === g.target.id;
      return same ? click(g.target, g.start, display) : null;
    }
    const order = TOOL_ORDER[tool];
    // Model points: as drawn, except on the projected drawing, where a piece
    // started on empty space goes to loosePoints() and a carbon grown from an
    // existing one takes its §6.2 position (no forced end).
    const endpoint = plan.targetAtom ?? plan.snapAtom;
    if (display && !plan.sourceAtom && endpoint) {
      // From empty space onto a projected atom: the atom grows one new
      // carbon (the drag's start atom, carbon as everywhere) at its §6.2
      // model position, as a drag out of it would (the pressed point has no
      // model counterpart next to that atom).
      return transact('drag bond', (d) => grow(d, endpoint, order));
    }
    const endElement = newEndElement();
    let from = plan.from;
    let to = plan.to;
    if (display) {
      [from, to] = plan.sourceAtom ? [null, undefined] : loosePoints([plan.from, plan.to]);
    }
    return transact('drag bond', (d) => {
      const source = plan.sourceAtom ?? addAtom(d, from);
      if (plan.targetAtom) {
        return join(d, source, plan.targetAtom, order);
      }
      if (plan.snapAtom) {
        // Join the atom the snapped end lands on if that bond is valid; otherwise
        // grow a new carbon at the best free angle instead of on top of it.
        const trial = cloneMolecule(d);
        if (!join(trial, source, plan.snapAtom, order)) {
          Object.assign(d, trial);
          return undefined;
        }
        return grow(d, source, order, undefined, endElement);
      }
      return grow(d, source, order, to, endElement);
    });
  } // End of function finishDrag()

  /**
   * Starts a gesture (pointer pressed).
   *
   * @param {{x: number, y: number}} point - Pointer position in drawing units.
   * @returns {void}
   */
  function pointerDown(point) {
    if (gesture) {
      return;
    }
    const display = displayOf();
    if (display && tool === 'move') {
      return; // Mover does not act on the projected drawing (the shell pans instead).
    }
    const target = hitTest(display || mol, point);
    gesture = { start: { ...point }, current: { ...point }, target, moved: false, display };
    pointer = null;
    if (tool === 'move') {
      gesture.moveIds = moveTargets(target, point);
    }
    hover = null;
    emit('gesture');
  }

  /**
   * Pointer moved: updates the hover item, or the drag in progress.
   *
   * @param {{x: number, y: number}} point - Pointer position in drawing units.
   * @returns {void}
   */
  function pointerMove(point) {
    if (!gesture) {
      const display = displayOf();
      hover = display && tool === 'move' ? null : hitTest(display || mol, point);
      pointer = { ...point };
      return;
    }
    gesture.current = { ...point };
    if (distance(gesture.start, point) > DRAG_THRESHOLD) {
      gesture.moved = true;
    }
  }

  /**
   * Ends the gesture (pointer released) and commits it as one transaction.
   *
   * @param {{x: number, y: number}} [point] - Release position (defaults to the last move).
   * @returns {object|null} The transaction outcome, or null when nothing was attempted.
   */
  function pointerUp(point) {
    const g = gesture;
    if (!g) {
      return null;
    }
    gesture = null;
    if (point) {
      g.current = { ...point };
      g.moved = g.moved || distance(g.start, point) > DRAG_THRESHOLD;
    }
    const outcome = g.moved ? finishDrag(g) : click(g.target, g.start, g.display || null);
    emit('gesture');
    return outcome;
  } // End of function pointerUp()

  /**
   * Cancels the gesture in progress (Esc, pointer cancel). Nothing was
   * mutated yet, so the starting state is kept as is.
   *
   * @returns {boolean} True when a gesture was cancelled.
   */
  function cancelGesture() {
    if (!gesture) {
      return false;
    }
    gesture = null;
    emit('gesture');
    return true;
  }

  /**
   * Replaces the molecule from a snapshot.
   *
   * @param {object} snapshot - moleculeToJSON() output.
   * @returns {boolean} True on success.
   */
  function restore(snapshot) {
    const result = moleculeFromJSON(snapshot);
    if (!result.ok) {
      return false;
    }
    mol = result.mol;
    gesture = null;
    hover = null;
    return true;
  }

  /**
   * Undoes the last transaction.
   *
   * @returns {boolean} True when something was undone.
   */
  function undo() {
    const entry = history.undo();
    if (!entry || !restore(entry.before)) {
      return false;
    }
    emit('undo', editKind(entry.after, entry.before), entry.view ? entry.view.before : null);
    return true;
  }

  /**
   * Redoes the last undone transaction.
   *
   * @returns {boolean} True when something was redone.
   */
  function redo() {
    const entry = history.redo();
    if (!entry || !restore(entry.after)) {
      return false;
    }
    emit('redo', editKind(entry.before, entry.after), entry.view ? entry.view.after : null);
    return true;
  }

  /**
   * Replaces the molecule without an undo entry (autosave restore). The data
   * goes through moleculeFromJSON(), i.e. through validateStructure();
   * corrupt data leaves the molecule untouched.
   *
   * @param {object|string} data - moleculeToJSON() output, or its JSON text.
   * @returns {{ok: true}|{ok: false, error: object}} The outcome.
   */
  function replaceMolecule(data) {
    const result = moleculeFromJSON(data);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    mol = result.mol;
    gesture = null;
    hover = null;
    selection = new Set();
    history.clear();
    emit('restore', 'chemical');
    return { ok: true };
  } // End of function replaceMolecule()

  /**
   * Limpiar: removes everything as one undoable transaction (the in-page
   * confirmation is the UI's job).
   *
   * @returns {object} The transaction outcome.
   */
  function clear() {
    gesture = null;
    hover = null;
    return transact('clear', (d) => {
      d.atoms.clear();
      d.bonds.clear();
    });
  }

  /**
   * Loads a molecule as one undoable transaction (after validation).
   *
   * @param {object} source - A molecule or moleculeToJSON() output.
   * @returns {object} The transaction outcome.
   */
  function loadMolecule(source) {
    const result = moleculeFromJSON(source && source.atoms instanceof Map ? moleculeToJSON(source) : source);
    if (!result.ok) {
      return reject({ message: result.error.message });
    }
    gesture = null;
    hover = null;
    return transact('load', (d) => {
      d.atoms = result.mol.atoms;
      d.bonds = result.mol.bonds;
      d.nextAtomId = Math.max(d.nextAtomId, result.mol.nextAtomId);
      d.nextBondId = Math.max(d.nextBondId, result.mol.nextBondId);
    });
  } // End of function loadMolecule()

  /**
   * Moves atoms to new positions as one undoable coordinate edit (redraw,
   * design.md §7). Every atom must exist; atoms not listed keep their place.
   * With `options.view` the edit also re-centres the canvas: the views are
   * recorded with it, and the change events of the edit, its undo and its
   * redo carry the view to show (`after`, `before`, `after`).
   *
   * @param {Map<number, {x: number, y: number}>} positions - Atom id → new position.
   * @param {{view?: {before: object, after: object}}} [options] - Canvas views before and after.
   * @returns {object} The transaction outcome (`changed: false` when nothing moved).
   */
  function setCoordinates(positions, options = {}) {
    gesture = null;
    return transact('redraw', (d) => {
      for (const [id, p] of positions) {
        const atom = d.atoms.get(id);
        if (!atom || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
          return { message: EDIT_MESSAGES.INVALID };
        }
        atom.x = p.x;
        atom.y = p.y;
      }
      return undefined;
    }, options.view || null);
  } // End of function setCoordinates()

  /**
   * Selects a tool. Selecting the element tool ('carbon') this way picks
   * carbon; setElement() picks another element.
   *
   * @param {string} name - One of TOOLS.
   * @returns {void}
   * @throws {Error} For an unknown tool.
   */
  function setTool(name) {
    if (!TOOLS.includes(name)) {
      throw new Error(`setTool: unknown tool ${name}`);
    }
    gesture = null;
    selection = new Set();
    tool = name;
    if (name === 'carbon') {
      element = 'C';
    }
    emit('tool');
  }

  /**
   * Selects the Anillos tool with a ring size (design.md §6.1).
   *
   * @param {number} size - One of RING_SIZES (3 to 8).
   * @returns {void}
   * @throws {Error} For a size not offered.
   */
  function setRingSize(size) {
    if (!RING_SIZES.includes(size)) {
      throw new Error(`setRingSize: unsupported ring size ${size}`);
    }
    gesture = null;
    selection = new Set();
    tool = 'ring';
    ringSize = size;
    emit('tool');
  }

  /**
   * The ring size of the Anillos tool (kept while other tools are used).
   *
   * @returns {number} One of RING_SIZES.
   */
  function getRingSize() {
    return ringSize;
  }

  /**
   * The Anillos preview: the ring the pressed or hovered spot would get
   * (ringPlan()), as a closed outline plus its attaching bond, or null when
   * that placement would be refused, the pointer is off the canvas, or the
   * projected (90°) drawing is shown (its positions are not the model's).
   *
   * @returns {{type: 'ring', points: {x: number, y: number}[], bond: {from: object, to: object}|null}|null}
   *   The ring's vertices in ring order (shared atoms included) and the attaching bond.
   */
  function ringPreview() {
    const target = gesture ? gesture.target : hover;
    const point = gesture ? gesture.start : pointer;
    if (!point || (gesture ? gesture.display : displayOf())) {
      return null;
    }
    const plan = ringPlan(target, point);
    if (!plan || plan.refusal) {
      return null;
    }
    const at = (id) => ({ x: mol.atoms.get(id).x, y: mol.atoms.get(id).y });
    if (plan.kind === 'fuse') {
      return { type: 'ring', points: [at(plan.a), at(plan.b), ...plan.points], bond: null };
    }
    const bond = plan.kind === 'attach' ? { from: at(plan.atom), to: plan.points[0] } : null;
    return { type: 'ring', points: plan.points, bond };
  } // End of function ringPreview()

  /**
   * Selects the element tool with an element of the palette (design.md §6.1).
   *
   * @param {string} symbol - C, O, N, F, Cl, Br or I.
   * @returns {void}
   * @throws {Error} For an unsupported element.
   */
  function setElement(symbol) {
    if (!isSupportedElement(symbol)) {
      throw new Error(`setElement: unsupported element ${symbol}`);
    }
    gesture = null;
    selection = new Set();
    tool = 'carbon';
    element = symbol;
    emit('tool');
  } // End of function setElement()

  /**
   * The element of the element tool (meaningful while getTool() is 'carbon').
   *
   * @returns {string} An element symbol.
   */
  function getElement() {
    return element;
  }

  /**
   * The drag preview to draw, if a bond-making drag is in progress: a chain
   * (Enlace simple, two or more bonds) or one bond. With Enlace simple a
   * one-bond preview that creates a new carbon also carries the live counter
   * (`count`: carbons added, 2 from empty space). With the element tool on a
   * heteroatom, a new end atom carries its `element`; a drag from a
   * heteroatom has `fromDot: false` (no carbon dot there). With Anillos, the
   * ring about to be placed, pressed or only hovered (ringPreview()).
   *
   * @returns {{type: 'chain', points: object[], count: number}|{type: 'bond', from: object, to: object, order: number,
   *   count?: number, element?: string, fromDot?: boolean}|{type: 'ring', points: object[], bond: object|null}|null}
   *   The preview.
   */
  function getPreview() {
    if (tool === 'ring') {
      return ringPreview();
    }
    if (!gesture || !gesture.moved) {
      return null;
    }
    const chain = chainPlan(gesture);
    if (chain) {
      return { type: 'chain', points: chain.points, count: chain.count };
    }
    const plan = dragPlan(gesture);
    if (!plan) {
      return null;
    }
    const preview = { type: 'bond', from: plan.from, to: plan.to, order: TOOL_ORDER[tool] };
    if (tool === 'single' && !plan.targetAtom && !plan.snapAtom) {
      preview.count = plan.sourceAtom ? 1 : 2;
    }
    if (!plan.targetAtom && !plan.snapAtom && newEndElement() !== 'C') {
      preview.element = newEndElement();
    }
    if (plan.sourceAtom && mol.atoms.get(plan.sourceAtom).element !== 'C') {
      preview.fromDot = false;
    }
    return preview;
  } // End of function getPreview()

  /**
   * Everything the renderer needs: the molecule as displayed (with the atoms
   * being moved at their dragged positions), hover, preview, selection (with
   * the atoms inside a marquee in progress) and the marquee rectangle.
   *
   * @returns {{mol: object, hover: object|null, preview: object|null, selection: Set<number>, marquee: object|null}}
   *   The view state; `mol` must not be mutated.
   */
  function getViewState() {
    const state = { mol, hover, preview: getPreview(), selection, marquee: null };
    if (tool === 'move' && gesture && gesture.moved) {
      if (gesture.moveIds) {
        const shown = cloneMolecule(mol);
        for (const id of gesture.moveIds) {
          const atom = shown.atoms.get(id);
          atom.x += gesture.current.x - gesture.start.x;
          atom.y += gesture.current.y - gesture.start.y;
        }
        state.mol = shown;
      } else {
        state.marquee = rectFromCorners(gesture.start, gesture.current);
        state.selection = marqueeAtoms(gesture);
      }
    }
    return state;
  } // End of function getViewState()

  /**
   * The selected atoms (Mover).
   *
   * @returns {number[]} Selected atom ids, ascending.
   */
  function getSelection() {
    return [...selection].sort((p, q) => p - q);
  }

  /**
   * Empties the selection.
   *
   * @returns {boolean} True when something was selected.
   */
  function clearSelection() {
    if (selection.size === 0) {
      return false;
    }
    selection = new Set();
    emit('selection');
    return true;
  }

  /**
   * Subscribes to change notifications.
   *
   * @param {Function} listener - Called with `{reason}`.
   * @returns {Function} Unsubscribe function.
   */
  function onChange(listener) {
    changeListeners.push(listener);
    return () => removeFrom(changeListeners, listener);
  }

  /**
   * Subscribes to edits of the molecule only: `{reason, kind}` with kind
   * 'chemical' or 'coordinates' (design.md §6.3).
   *
   * @param {Function} listener - Called with `{reason, kind}`.
   * @returns {Function} Unsubscribe function.
   */
  function onEdit(listener) {
    editListeners.push(listener);
    return () => removeFrom(editListeners, listener);
  }

  /**
   * Subscribes to refusal notifications.
   *
   * @param {Function} listener - Called with `{message, atoms}`.
   * @returns {Function} Unsubscribe function.
   */
  function onReject(listener) {
    rejectListeners.push(listener);
    return () => removeFrom(rejectListeners, listener);
  }

  /**
   * The current tool.
   *
   * @returns {string} One of TOOLS.
   */
  function getTool() {
    return tool;
  }

  /**
   * The item under the pointer when no gesture is in progress.
   *
   * @returns {{type: string, id: number}|null} The hovered atom or bond.
   */
  function getHover() {
    return hover;
  }

  /**
   * Forgets the hovered item (pointer left the canvas).
   *
   * @returns {void}
   */
  function clearHover() {
    hover = null;
    pointer = null;
  }

  /**
   * Tells whether a gesture is in progress.
   *
   * @returns {boolean} True between pointerDown() and pointerUp()/cancelGesture().
   */
  function isGestureActive() {
    return gesture !== null;
  }

  /**
   * The live molecule, for rendering only: callers must not mutate it.
   *
   * @returns {object} The current molecule.
   */
  function peekMolecule() {
    return mol;
  }

  /**
   * A copy of the current molecule (test API).
   *
   * @returns {object} An independent copy.
   */
  function getMolecule() {
    return cloneMolecule(mol);
  }

  /**
   * The current molecule serialised (test API; plain data, crosses page boundaries).
   *
   * @returns {object} moleculeToJSON() output.
   */
  function getMoleculeJSON() {
    return moleculeToJSON(mol);
  }

  return {
    pointerDown,
    pointerMove,
    pointerUp,
    cancelGesture,
    undo,
    redo,
    clear,
    loadMolecule,
    replaceMolecule,
    setCoordinates,
    setTool,
    getTool,
    setElement,
    getElement,
    setRingSize,
    getRingSize,
    getPreview,
    getViewState,
    getSelection,
    clearSelection,
    getHover,
    clearHover,
    isGestureActive,
    onChange,
    onEdit,
    onReject,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    peekMolecule,
    getMolecule,
    getMoleculeJSON,
  };
} // End of function createEditorCore()

/** Wheel zoom sensitivity: scale factor = exp(−deltaY × this), deltaY in pixels. */
const WHEEL_ZOOM_RATE = 0.0015;

/**
 * Tells whether a key event comes from a text field (where letters are text,
 * not shortcuts).
 *
 * @param {EventTarget|null} target - The event target.
 * @returns {boolean} True for inputs, text areas, selects and editable content.
 */
function isTextField(target) {
  if (!target || typeof target.closest !== 'function') {
    return false;
  }
  return Boolean(target.isContentEditable || target.closest('input, textarea, select'));
}

/**
 * Creates an editor bound to an SVG element: pointer events (mouse, touch,
 * pen; one drawing pointer at a time), pan (space+drag, middle-button drag,
 * two-finger drag), zoom (wheel, pinch), keyboard shortcuts (shortcutFor()),
 * Esc to cancel the gesture in progress (or clear the selection), rendering
 * after every change, the display mode, the display projection (90° view:
 * gestures act through the projected drawing, Mover pans there), the flash
 * of the carbons a gesture added in that view, and shake + notification on
 * refused edits.
 *
 * @param {SVGSVGElement} svg - The canvas element.
 * @param {{notify?: function(string): void}} [options] - `notify(message)` shows a Spanish toast.
 * @returns {object} The editor API: the core API plus highlight(), clearHighlight(), showLocants(),
 *   animateCoordinates(), isAnimating(), setDisplayMode(), getDisplayMode(), setProjector(), getProjection(),
 *   isProjected(), getShownMolecule(), onViewChange(), getView(), setView(), centerView(), zoomBy(),
 *   atomClientPoint(), bondClientPoint(), modelToClient(), clientToModel(), render() and destroy().
 */
export function createEditor(svg, options = {}) {
  const doc = svg.ownerDocument;
  const renderer = createRenderer(svg);
  const core = createEditorCore({ display: projectedMolecule });
  let activePointer = null;
  let pan = null;
  let pinch = null;
  let spaceHeld = false;
  const touches = new Map();
  let animation = null; // Redraw animation in progress: {from, to, start, frame}.
  let projector = null; // Display projection (90° view): mol → {ok, positions} | {ok: false, reason}.
  let projection = null; // Cache: {source, projector, result, shown}.
  let pendingView = null; // Normal-drawing view of an undo/redo made while the 90° drawing was shown.
  const viewListeners = [];

  /**
   * The projection of the current molecule (computed once per molecule
   * version and projector); null when no projector is set. A projector that
   * throws, or returns positions not covering every atom, counts as a failure.
   *
   * @returns {{ok: boolean, reason?: string, positions?: Map<number, {x: number, y: number}>}|null} The projection.
   */
  function currentProjection() {
    if (!projector) {
      return null;
    }
    const mol = core.peekMolecule();
    if (!projection || projection.source !== mol || projection.projector !== projector) {
      let result;
      try {
        result = projector(mol);
      } catch (err) {
        result = { ok: false, reason: 'ERROR' };
      }
      let shown = null;
      if (result && result.ok) {
        const covers = result.positions instanceof Map && result.positions.size === mol.atoms.size &&
          [...mol.atoms.keys()].every((id) => result.positions.has(id));
        if (covers) {
          shown = cloneMolecule(mol);
          for (const [id, p] of result.positions) {
            shown.atoms.get(id).x = p.x;
            shown.atoms.get(id).y = p.y;
          }
        } else {
          result = { ok: false, reason: 'ERROR' };
        }
      }
      projection = { source: mol, projector, result: result || { ok: false, reason: 'ERROR' }, shown };
    } // End of the projection cache refresh
    return projection.result;
  } // End of function currentProjection()

  /**
   * The molecule as drawn: the projected copy when the projection succeeded,
   * else the molecule itself (during a redraw animation, at the interpolated positions).
   *
   * @returns {{mol: object, rightAngle: boolean}} The drawn molecule and whether it is projected.
   */
  function shownMolecule() {
    const result = currentProjection();
    if (result && result.ok) {
      return { mol: projection.shown, rightAngle: true };
    }
    return { mol: animation ? animation.shown : core.peekMolecule(), rightAngle: false };
  }

  /**
   * Tells whether the projected (90°) drawing is shown: a projection is set
   * and succeeded. Gestures then act through the projected positions, and
   * Mover is unavailable.
   *
   * @returns {boolean} True while the projected drawing is on screen.
   */
  function isProjected() {
    const result = currentProjection();
    return Boolean(result && result.ok);
  }

  /**
   * The projected drawing the core hit-tests gestures on, or null when the
   * model's own drawing is shown (the core's `display` option).
   *
   * @returns {object|null} The projected copy of the molecule.
   */
  function projectedMolecule() {
    return isProjected() ? projection.shown : null;
  }

  /**
   * Redraws the molecule with the current hover, preview and selection
   * (during a redraw animation, at the interpolated positions; with a
   * successful projection, at the projected positions, where the hover and
   * previews are computed too, and without Mover's selection). With the
   * projection shown and Mover picked, the canvas shows the pan cursor.
   *
   * @returns {void}
   */
  function refresh() {
    const state = core.getViewState();
    const shown = shownMolecule();
    const extra = shown.rightAngle ? { selection: null, marquee: null } : {};
    svg.classList.toggle('is-move-pans', shown.rightAngle && core.getTool() === 'move');
    // Outside the projection and animations, draw the view state's molecule:
    // it carries a move gesture's transient coordinates.
    const drawn = shown.rightAngle || animation ? shown.mol : state.mol;
    if (pendingView && !shown.rightAngle) {
      // Back to the normal drawing: show it in the view its undo/redo carried.
      renderer.setView(pendingView);
      pendingView = null;
    }
    renderer.render(drawn, { ...state, ...extra, rightAngle: shown.rightAngle });
  }

  /**
   * Shakes the canvas, marks the atoms involved and shows the message.
   *
   * @param {{message: string, atoms: number[]}} refusal - The refused edit.
   * @returns {void}
   */
  function onReject(refusal) {
    svg.classList.remove('shake');
    // Force a reflow so the animation restarts on consecutive refusals.
    void svg.getBoundingClientRect();
    svg.classList.add('shake');
    renderer.flash(refusal.atoms);
    if (options.notify) {
      options.notify(refusal.message);
    }
  }

  /**
   * Pointer position in drawing units.
   *
   * @param {PointerEvent} event - The event.
   * @returns {{x: number, y: number}} The point.
   */
  function toModel(event) {
    return renderer.clientToModel(event.clientX, event.clientY);
  }

  /**
   * Captures a pointer on the canvas, if the browser allows it.
   *
   * @param {PointerEvent} event - The event.
   * @returns {void}
   */
  function capture(event) {
    if (svg.setPointerCapture) {
      try {
        svg.setPointerCapture(event.pointerId);
      } catch (err) {
        // Synthetic events may not be capturable; the gesture still works.
      }
    }
  }

  /**
   * Midpoint and distance of the two touches, in canvas units.
   *
   * @returns {{mid: {x: number, y: number}, dist: number}} The pinch geometry.
   */
  function pinchGeometry() {
    const [p, q] = [...touches.values()].slice(0, 2).map((t) => renderer.clientToCanvas(t.x, t.y));
    return { mid: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, dist: Math.max(distance(p, q), 1) };
  }

  /**
   * Handles pointerdown: a second finger turns the gesture into a two-finger
   * pan/pinch; space+drag or the middle button pans; otherwise the first
   * pointer starts a drawing gesture (a further non-touch pointer cancels it).
   *
   * @param {PointerEvent} event - The event.
   * @returns {void}
   */
  function handleDown(event) {
    if (event.pointerType === 'touch') {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      // Capture every touch on the stable SVG root before any refresh: the
      // implicit capture target (an atom or bond) is replaced when the
      // drawing is re-rendered, and its pointer events would be lost.
      capture(event);
      if (touches.size >= 2) {
        event.preventDefault();
        core.cancelGesture();
        activePointer = null;
        pan = null;
        pinch = pinchGeometry();
        refresh();
        return;
      }
    }
    if (activePointer !== null || pan || pinch) {
      if (activePointer !== null) {
        core.cancelGesture();
        activePointer = null;
        refresh();
      }
      return;
    }
    const middle = event.pointerType === 'mouse' && event.button === 1;
    // Mover in the 90° view: the main button or a finger pans instead.
    const movePan = isProjected() && core.getTool() === 'move' && (event.pointerType !== 'mouse' || event.button === 0);
    if (middle || (spaceHeld && event.button === 0) || movePan) {
      event.preventDefault();
      capture(event);
      pan = { pointerId: event.pointerId, last: renderer.clientToCanvas(event.clientX, event.clientY) };
      svg.classList.add('is-panning');
      return;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    event.preventDefault();
    if (animation) {
      // The model already holds the final coordinates while the drawing shows
      // interpolated ones: a press would hit-test atoms the user cannot see
      // there. It only ends the animation (atoms jump to their final places).
      stopAnimation();
      refresh();
      return;
    }
    // Keyboard focus leaves the toolbar so that Space means "pan", not "press this button".
    const focused = doc.activeElement;
    if (focused && focused !== doc.body && typeof focused.blur === 'function') {
      focused.blur();
    }
    activePointer = event.pointerId;
    capture(event);
    core.pointerDown(toModel(event));
    refresh();
  } // End of function handleDown()

  /**
   * Handles pointermove: pinch, pan, hover or drag preview.
   *
   * @param {PointerEvent} event - The event.
   * @returns {void}
   */
  function handleMove(event) {
    if (touches.has(event.pointerId)) {
      touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pinch) {
      if (touches.size >= 2) {
        const now = pinchGeometry();
        const moved = panView(renderer.getView(), now.mid.x - pinch.mid.x, now.mid.y - pinch.mid.y);
        renderer.setView(zoomView(moved, now.mid, now.dist / pinch.dist));
        pinch = now;
      }
      return;
    }
    if (pan) {
      if (event.pointerId === pan.pointerId) {
        const p = renderer.clientToCanvas(event.clientX, event.clientY);
        renderer.setView(panView(renderer.getView(), p.x - pan.last.x, p.y - pan.last.y));
        pan.last = p;
      }
      return;
    }
    if (activePointer !== null && event.pointerId !== activePointer) {
      return;
    }
    core.pointerMove(toModel(event));
    refresh();
  } // End of function handleMove()

  /**
   * Handles pointerup, pointercancel and lost capture: ends a pinch or pan;
   * commits (up) or cancels (cancel, lost capture) the drawing gesture.
   *
   * @param {PointerEvent} event - The event.
   * @returns {void}
   */
  function handleEnd(event) {
    touches.delete(event.pointerId);
    if (pinch) {
      if (touches.size < 2) {
        pinch = null;
      }
      return;
    }
    if (pan) {
      if (event.pointerId === pan.pointerId) {
        pan = null;
        svg.classList.remove('is-panning');
      }
      return;
    }
    if (event.pointerId !== activePointer) {
      return;
    }
    activePointer = null;
    if (event.type === 'pointerup') {
      const before = core.peekMolecule();
      core.pointerUp(toModel(event));
      flashAdded(before);
    } else {
      core.cancelGesture();
    }
    refresh();
  } // End of function handleEnd()

  /**
   * In the 90° view, briefly rings the carbons a gesture added or re-bonded
   * (addedAtoms()), since the projection has just re-laid the drawing out.
   *
   * @param {object} before - The molecule before the gesture.
   * @returns {void}
   */
  function flashAdded(before) {
    const after = core.peekMolecule();
    if (after === before || !isProjected()) {
      return;
    }
    const atoms = addedAtoms(before, after);
    if (atoms.length > 0) {
      renderer.flash(atoms, { className: 'added-ring', duration: 1200 });
    }
  } // End of function flashAdded()

  /**
   * Handles lostpointercapture: a pointer the editor still tracks (a touch, the
   * pan pointer or the drawing pointer) will not deliver its pointerup here,
   * so it is treated as a pointercancel and the gesture state is cleaned up.
   * After a normal pointerup the pointer is no longer tracked and this is a
   * no-op. Only the SVG root's own capture counts: the event bubbles up from
   * descendants that lose an implicit capture when capture() moves it here.
   *
   * @param {PointerEvent} event - The event.
   * @returns {void}
   */
  function handleLostCapture(event) {
    if (event.target !== svg) {
      return;
    }
    const tracked = touches.has(event.pointerId) || (pan && pan.pointerId === event.pointerId) ||
      event.pointerId === activePointer;
    if (tracked) {
      handleEnd(event);
    }
  }

  /**
   * Handles pointerleave: drops the hover highlight.
   *
   * @returns {void}
   */
  function handleLeave() {
    if (activePointer === null) {
      core.clearHover();
      refresh();
    }
  }

  /**
   * Handles wheel: zooms about the pointer.
   *
   * @param {WheelEvent} event - The event.
   * @returns {void}
   */
  function handleWheel(event) {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
    const delta = Math.max(-200, Math.min(200, event.deltaY * unit));
    const point = renderer.clientToCanvas(event.clientX, event.clientY);
    renderer.setView(zoomView(renderer.getView(), point, Math.exp(-delta * WHEEL_ZOOM_RATE)));
  }

  /**
   * Handles keydown: Esc cancels the gesture (or clears the selection), Space
   * arms panning, and the §6.1 shortcuts switch tools or undo/redo. Keys typed
   * in text fields or while a dialog is open are left alone.
   *
   * @param {KeyboardEvent} event - The event.
   * @returns {void}
   */
  function handleKey(event) {
    if (isTextField(event.target) || doc.querySelector('dialog[open]')) {
      return;
    }
    if (event.key === 'Escape') {
      if (core.cancelGesture() || core.clearSelection()) {
        event.preventDefault();
        refresh();
      }
      return;
    }
    if (event.code === 'Space' || event.key === ' ') {
      const onControl = event.target && typeof event.target.closest === 'function' && event.target.closest('button, a, summary');
      if (!onControl) {
        event.preventDefault();
        spaceHeld = true;
        svg.classList.add('can-pan');
      }
      return;
    }
    const command = shortcutFor(event);
    if (!command) {
      return;
    }
    if (command.tool === 'move' && isProjected()) {
      return; // 90° view: Mover is unavailable.
    }
    event.preventDefault();
    if (command.element) {
      core.setElement(command.element);
    } else if (command.tool === 'ring') {
      // `a` picks Anillos; pressed again, the next ring size.
      core.setRingSize(core.getTool() === 'ring' ? nextRingSize(core.getRingSize()) : core.getRingSize());
    } else if (command.tool) {
      core.setTool(command.tool);
    } else if (command.action === 'undo') {
      core.undo();
    } else {
      core.redo();
    }
  } // End of function handleKey()

  /**
   * Handles keyup (and window blur): releases Space.
   *
   * @param {KeyboardEvent|FocusEvent} event - The event.
   * @returns {void}
   */
  function handleKeyUp(event) {
    if (event.type === 'blur' || event.code === 'Space' || event.key === ' ') {
      spaceHeld = false;
      svg.classList.remove('can-pan');
    }
  }

  /**
   * Removes the shake class once its animation ends.
   *
   * @returns {void}
   */
  function handleAnimationEnd() {
    svg.classList.remove('shake');
  }

  /**
   * Stops a redraw animation, leaving the atoms at their final positions.
   *
   * @returns {void}
   */
  function stopAnimation() {
    if (animation) {
      if (win && win.cancelAnimationFrame) {
        win.cancelAnimationFrame(animation.frame);
      }
      animation = null;
    }
  }

  /**
   * Tells whether the user asked the system to reduce motion.
   *
   * @returns {boolean} True under `prefers-reduced-motion: reduce`.
   */
  function prefersReducedMotion() {
    return Boolean(win && win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /**
   * Draws one frame of the redraw animation (ease-in-out), then schedules the next.
   *
   * @param {number} now - Frame timestamp (ms).
   * @returns {void}
   */
  function animationFrame(now) {
    if (!animation) {
      return;
    }
    if (animation.start === null) {
      animation.start = now;
    }
    const t = Math.min(1, (now - animation.start) / animation.duration);
    const k = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
    for (const [id, p] of animation.to) {
      const q = animation.from.get(id);
      const atom = animation.shown.atoms.get(id);
      atom.x = q.x + (p.x - q.x) * k;
      atom.y = q.y + (p.y - q.y) * k;
    }
    if (t >= 1) {
      animation = null;
    } else {
      animation.frame = win.requestAnimationFrame(animationFrame);
    }
    refresh();
  } // End of function animationFrame()

  /**
   * The view that fits the drawing once atoms are at new positions, when that
   * drawing would not fit the visible canvas in the current view (else null).
   * In the 90° view the model coordinates are not shown, so it is always null.
   *
   * @param {Map<number, {x: number, y: number}>} positions - Atom id → new position.
   * @returns {{scale: number, x: number, y: number}|null} The fitted view, or null to keep the current one.
   */
  function fittedView(positions) {
    if (isProjected()) {
      return null;
    }
    const next = core.getMolecule();
    for (const [id, p] of positions) {
      const atom = next.atoms.get(id);
      if (!atom) {
        return null; // setCoordinates() refuses it anyway.
      }
      atom.x = p.x;
      atom.y = p.y;
    }
    if (next.atoms.size === 0) {
      return null;
    }
    const box = moleculeBounds(next);
    const r = renderer.visibleRect();
    const view = renderer.getView();
    const toCanvas = (x, y) => ({ x: x * view.scale + view.x, y: y * view.scale + view.y });
    const p = toCanvas(box.minX, box.minY);
    const q = toCanvas(box.maxX, box.maxY);
    const fits = p.x >= r.x && p.y >= r.y && q.x <= r.x + r.width && q.y <= r.y + r.height;
    return fits ? null : fitView(next, r);
  } // End of function fittedView()

  /**
   * Shows the canvas view a change event carries: the fitted view of a
   * re-centring redraw (and of its redo), or the view before it on undo.
   * That view belongs to the normal drawing: while the 90° drawing is shown
   * its own view stays, and the carried one is kept for when the normal
   * drawing comes back (refresh()).
   *
   * @param {{view?: {scale: number, x: number, y: number}}} event - The core's change event.
   * @returns {void}
   */
  function applyEditView(event) {
    if (!event || !event.view) {
      return;
    }
    if (isProjected()) {
      pendingView = event.view;
    } else {
      pendingView = null;
      renderer.setView(event.view);
    }
  }

  /**
   * Moves atoms to new positions as one undoable coordinate edit
   * (setCoordinates()), animated over `duration` ms unless the system asks
   * for reduced motion. The model changes at once; only the drawing is
   * interpolated, and any other change ends the animation. With `fit`, the
   * view is re-centred when the new drawing does not fit the visible canvas;
   * that re-centring belongs to the undoable edit (undo restores the view).
   *
   * @param {Map<number, {x: number, y: number}>} positions - Atom id → new position.
   * @param {{duration?: number, fit?: boolean}} [opts] - Animation length (default 400 ms) and re-centring.
   * @returns {object} The transaction outcome.
   */
  function animateCoordinates(positions, opts = {}) {
    stopAnimation();
    const before = core.getMolecule();
    const fitted = opts.fit ? fittedView(positions) : null;
    // The re-centring is part of the edit: undo shows the old drawing in the
    // view it was drawn in (applyEditView()), redo in the fitted one.
    const view = fitted ? { before: renderer.getView(), after: fitted } : null;
    const outcome = core.setCoordinates(positions, { view });
    if (!outcome.ok || !outcome.changed) {
      return outcome;
    }
    const duration = opts.duration ?? 400;
    if (duration > 0 && !prefersReducedMotion() && win && win.requestAnimationFrame) {
      const from = new Map([...before.atoms.values()].map((a) => [a.id, { x: a.x, y: a.y }]));
      const to = new Map([...core.peekMolecule().atoms.values()].map((a) => [a.id, { x: a.x, y: a.y }]));
      animation = { from, to, shown: before, start: null, duration, frame: 0 };
      animation.frame = win.requestAnimationFrame(animationFrame);
      refresh();
    }
    return outcome;
  } // End of function animateCoordinates()

  const win = doc.defaultView;
  svg.addEventListener('pointerdown', handleDown);
  svg.addEventListener('pointermove', handleMove);
  svg.addEventListener('pointerup', handleEnd);
  svg.addEventListener('pointercancel', handleEnd);
  svg.addEventListener('lostpointercapture', handleLostCapture);
  svg.addEventListener('pointerleave', handleLeave);
  svg.addEventListener('wheel', handleWheel, { passive: false });
  svg.addEventListener('animationend', handleAnimationEnd);
  doc.addEventListener('keydown', handleKey);
  doc.addEventListener('keyup', handleKeyUp);
  if (win) {
    win.addEventListener('blur', handleKeyUp);
  }
  core.onChange(stopAnimation);
  core.onChange(applyEditView);
  core.onChange(refresh);
  core.onReject(onReject);
  refresh();

  /**
   * Client coordinates of an atom as drawn (for tests and tooltips).
   *
   * @param {number} atomId - The atom.
   * @returns {{x: number, y: number}|null} The client point, or null if absent.
   */
  function atomClientPoint(atomId) {
    const atom = shownMolecule().mol.atoms.get(atomId);
    return atom ? renderer.modelToClient(atom) : null;
  }

  /**
   * Client coordinates of a bond's midpoint.
   *
   * @param {number} bondId - The bond.
   * @returns {{x: number, y: number}|null} The client point, or null if absent.
   */
  function bondClientPoint(bondId) {
    const mol = shownMolecule().mol;
    const bond = mol.bonds.get(bondId);
    if (!bond) {
      return null;
    }
    const a = mol.atoms.get(bond.a);
    const b = mol.atoms.get(bond.b);
    return renderer.modelToClient({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  }

  /**
   * Switches between Esqueleto ('skeletal') and Con carbonos ('condensed').
   *
   * @param {string} mode - 'skeletal' or 'condensed'.
   * @returns {void}
   */
  function setDisplayMode(mode) {
    renderer.setMode(mode);
    refresh();
  }

  /**
   * "Centrar": fits the drawn molecule (projected in the 90° view) in the
   * visible canvas (identity view when empty).
   *
   * @returns {{scale: number, x: number, y: number}} The new view.
   */
  function centerView() {
    const mol = shownMolecule().mol;
    const view = mol.atoms.size > 0 ? fitView(mol, renderer.visibleRect()) : { ...IDENTITY_VIEW };
    renderer.setView(view);
    return renderer.getView();
  }

  /**
   * Sets or removes the display projection (the 90° view). While it
   * succeeds (isProjected()) gestures act through the projected drawing:
   * setting or removing it cancels any gesture in progress and clears the
   * hover and selection. The projection never changes the model's coordinates.
   *
   * @param {function(object): object|null} fn - `fn(mol)` → `{ok: true, positions: Map}` or
   *   `{ok: false, reason}`; null restores the normal drawing.
   * @returns {void}
   */
  function setProjector(fn) {
    const next = typeof fn === 'function' ? fn : null;
    if (next === projector) {
      return;
    }
    // Either way the drawn coordinates change under any gesture in progress:
    // it is cancelled (nothing was committed yet), as are hover and selection.
    stopAnimation();
    activePointer = null;
    core.cancelGesture();
    core.clearHover();
    core.clearSelection();
    projector = next;
    projection = null;
    refresh();
    for (const listener of viewListeners) {
      listener();
    }
  } // End of function setProjector()

  /**
   * Subscribes to projection changes (projector set or removed).
   *
   * @param {function(): void} listener - Called after setProjector() changes the projector.
   * @returns {function(): void} Unsubscribe function.
   */
  function onViewChange(listener) {
    viewListeners.push(listener);
    return () => {
      const i = viewListeners.indexOf(listener);
      if (i >= 0) {
        viewListeners.splice(i, 1);
      }
    };
  }

  /**
   * Zooms about the centre of the visible canvas (buttons, tests).
   *
   * @param {number} factor - Scale multiplier (> 1 zooms in).
   * @returns {{scale: number, x: number, y: number}} The new view.
   */
  function zoomBy(factor) {
    const r = renderer.visibleRect();
    renderer.setView(zoomView(renderer.getView(), { x: r.x + r.width / 2, y: r.y + r.height / 2 }, factor));
    return renderer.getView();
  }

  /**
   * Detaches every listener.
   *
   * @returns {void}
   */
  function destroy() {
    svg.removeEventListener('pointerdown', handleDown);
    svg.removeEventListener('pointermove', handleMove);
    svg.removeEventListener('pointerup', handleEnd);
    svg.removeEventListener('pointercancel', handleEnd);
    svg.removeEventListener('lostpointercapture', handleLostCapture);
    svg.removeEventListener('pointerleave', handleLeave);
    svg.removeEventListener('wheel', handleWheel);
    svg.removeEventListener('animationend', handleAnimationEnd);
    doc.removeEventListener('keydown', handleKey);
    doc.removeEventListener('keyup', handleKeyUp);
    if (win) {
      win.removeEventListener('blur', handleKeyUp);
    }
  }

  return {
    ...core,
    highlight: renderer.highlight,
    clearHighlight: renderer.clearHighlight,
    showLocants: renderer.showLocants,
    animateCoordinates,
    isAnimating: () => animation !== null,
    setDisplayMode,
    getDisplayMode: renderer.getMode,
    setProjector,
    getProjection: currentProjection,
    isProjected,
    getShownMolecule: () => shownMolecule().mol,
    onViewChange,
    getView: renderer.getView,
    setView: renderer.setView,
    centerView,
    zoomBy,
    atomClientPoint,
    bondClientPoint,
    modelToClient: renderer.modelToClient,
    clientToModel: renderer.clientToModel,
    render: refresh,
    destroy,
  };
} // End of function createEditor()
