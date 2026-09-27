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
 * Test API: the instance exposes getMolecule(), getMoleculeJSON(), setTool(),
 * getTool(), undo(), redo(), clear(), loadMolecule(), setCoordinates(),
 * animateCoordinates(), isAnimating(), onEdit(), getSelection(),
 * getView(), setDisplayMode(), atomClientPoint(), bondClientPoint(),
 * modelToClient() and clientToModel(). The app publishes it as `window.__editor` (src/ui/app.js)
 * for end-to-end tests.
 */

import {
  createMolecule, addAtom, removeAtom, addBond, removeBond, setBondOrder, bondBetween, bondOrderSum,
  cloneMolecule, moleculeToJSON, moleculeFromJSON, CARBON_VALENCE,
} from '../model/molecule.js';
import { validateStructure, MESSAGES, MAX_CHAIN } from '../model/validate.js';
import { createHistory } from './history.js';
import {
  nextAtomPosition, snapEndpoint, hitTest, distance, straightenLinearCentres, overlappingAtoms,
  chainPoints, chooseChainSide, ATOM_HIT_RADIUS,
} from './geometry.js';
import {
  createRenderer, rectFromCorners, moleculeBounds, zoomView, panView, fitView, IDENTITY_VIEW,
} from './render.js';

/** Tool ids, in toolbar order (design.md §6.1). */
export const TOOLS = Object.freeze(['carbon', 'single', 'double', 'triple', 'cycle', 'chain', 'erase', 'move']);

/** Bond order drawn by each bond-making tool. */
const TOOL_ORDER = Object.freeze({ carbon: 1, single: 1, double: 2, triple: 3 });

/** Default tool (design.md §6.1: simple bond). */
export const DEFAULT_TOOL = 'single';

/** Pointer travel (drawing units) above which a press becomes a drag. */
export const DRAG_THRESHOLD = 6;

/** Spanish messages for refused edits (design.md §6.1). */
export const EDIT_MESSAGES = Object.freeze({
  FULL: 'Este carbono ya tiene 4 enlaces.',
  VALENCE: MESSAGES.VALENCE,
  SELF: 'No se puede unir un carbono consigo mismo.',
  DUPLICATE: 'Estos dos carbonos ya están unidos.',
  NO_ORDER: 'Este enlace no puede cambiar: sus carbonos ya tienen 4 enlaces.',
  OVERLAP: 'No hay sitio: ese carbono quedaría encima de otro.',
  INVALID: MESSAGES.INVALID,
});

/** Keyboard shortcuts without modifiers (design.md §6.1): key → tool. */
const TOOL_KEYS = Object.freeze({
  c: 'carbon', 1: 'single', 2: 'double', 3: 'triple', t: 'cycle', h: 'chain', e: 'erase', delete: 'erase', m: 'move',
});

/**
 * Maps a key press to an editor command (design.md §6.1): `c` Carbono,
 * `1/2/3` bond tools, `t` Cambiar enlace, `h` Cadena, `e`/`Supr` Borrar,
 * `m` Mover, Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z (or Ctrl/Cmd+Y) redo. Pure.
 *
 * @param {{key: string, ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean, altKey?: boolean}} event - The key event.
 * @returns {{tool: string}|{action: string}|null} The command, or null when the key is not a shortcut.
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
  return Object.prototype.hasOwnProperty.call(TOOL_KEYS, key) ? { tool: TOOL_KEYS[key] } : null;
} // End of function shortcutFor()

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
 * Builds a refusal for atoms that would exceed carbon valence: "ya tiene 4
 * enlaces" when one of them is already full, the generic valence message
 * otherwise.
 *
 * @param {object} mol - The molecule before the edit.
 * @param {number[]} atomIds - The atoms that would be over-bonded.
 * @returns {{message: string, atoms: number[]}} The refusal.
 */
function valenceRefusal(mol, atomIds) {
  const full = atomIds.some((id) => mol.atoms.has(id) && bondOrderSum(mol, id) >= CARBON_VALENCE);
  return { message: full ? EDIT_MESSAGES.FULL : EDIT_MESSAGES.VALENCE, atoms: atomIds };
}

/**
 * Checks that adding `extra` bond order to each atom keeps it within valence.
 *
 * @param {object} mol - The molecule.
 * @param {number[]} atomIds - Atoms gaining bond order.
 * @param {number} extra - Order added to each.
 * @returns {{message: string, atoms: number[]}|null} A refusal, or null when there is room.
 */
function checkRoom(mol, atomIds, extra) {
  const over = atomIds.filter((id) => bondOrderSum(mol, id) + extra > CARBON_VALENCE);
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
 * Creates the DOM-free editor core.
 *
 * @param {{onChange?: Function, onReject?: Function, onEdit?: Function}} [options] - Listeners:
 *   onChange({reason, kind}) after every committed edit, undo, redo, restore, tool, gesture or selection
 *   change; onEdit({reason, kind}) only for changes of the molecule (kind 'chemical' or 'coordinates');
 *   onReject({message, atoms}) when an edit is refused.
 * @returns {object} The core API (see the returned object).
 */
export function createEditorCore(options = {}) {
  let mol = createMolecule();
  let tool = DEFAULT_TOOL;
  let gesture = null;
  let hover = null;
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
   * @returns {void}
   */
  function emit(reason, kind = null) {
    if (kind) {
      // Atoms that no longer exist leave the selection.
      selection = new Set([...selection].filter((id) => mol.atoms.has(id)));
    }
    for (const listener of changeListeners) {
      listener({ reason, kind });
    }
    if (kind) {
      for (const listener of editListeners) {
        listener({ reason, kind });
      }
    }
  } // End of function emit()

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
   * @returns {{ok: boolean, changed?: boolean, message?: string, atoms?: number[]}} The outcome.
   */
  function transact(label, mutate) {
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
    history.record(before, after, label);
    emit('edit', editKind(before, after));
    return { ok: true, changed: true };
  } // End of function transact()

  /**
   * Adds the new carbon and its bond, then re-straightens linear centres.
   *
   * @param {object} draft - Draft molecule (mutated).
   * @param {number} atomId - The atom to grow from.
   * @param {number} order - Order of the new bond.
   * @param {{x: number, y: number}} position - Where the new carbon goes.
   * @returns {void}
   */
  function placeCarbon(draft, atomId, order, position) {
    const newId = addAtom(draft, position);
    addBond(draft, atomId, newId, order);
    straightenLinearCentres(draft, [atomId, newId]);
  }

  /**
   * Grows a new carbon from an atom. A forced position (a drag end) is used
   * only if the final coordinates, after straightening, overlap no atom;
   * otherwise the carbon goes to the best free angle (§6.2).
   *
   * @param {object} draft - Draft molecule.
   * @param {number} atomId - The atom to grow from.
   * @param {number} order - Order of the new bond.
   * @param {{x: number, y: number}} [position] - Forced position (a drag end); computed when omitted.
   * @returns {{message: string, atoms: number[]}|undefined} A refusal, if any.
   */
  function grow(draft, atomId, order, position) {
    const refusal = checkRoom(draft, [atomId], order);
    if (refusal) {
      return refusal;
    }
    if (position) {
      const trial = cloneMolecule(draft);
      placeCarbon(trial, atomId, order, position);
      if (overlappingAtoms(trial, draft).length === 0) {
        Object.assign(draft, trial);
        return undefined;
      }
    }
    placeCarbon(draft, atomId, order, nextAtomPosition(draft, atomId, { order }));
    return undefined;
  } // End of function grow()

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
   * Applies a click (press and release without dragging) with the current tool.
   *
   * @param {{type: string, id: number}|null} target - What was clicked.
   * @param {{x: number, y: number}} point - Where (drawing units).
   * @returns {object|null} The transaction outcome, or null when the click does nothing.
   */
  function click(target, point) {
    const order = TOOL_ORDER[tool];
    if (tool === 'move') {
      selectClicked(target);
      return null;
    }
    if (tool === 'carbon' && !target) {
      return transact('add carbon', (d) => {
        addAtom(d, point);
      });
    }
    if (order && target && target.type === 'atom') {
      return transact('grow carbon', (d) => grow(d, target.id, order));
    }
    if (order && !target) {
      return transact('add fragment', (d) => {
        const first = addAtom(d, point);
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
   * snapped end point or the atom under the pointer.
   *
   * @param {object} g - The gesture.
   * @returns {{sourceAtom: number|null, from: {x: number, y: number}, targetAtom: number|null, snapAtom: number|null, to: {x: number, y: number}}|null}
   *   The plan, or null when the drag creates nothing. `targetAtom`: released on an atom; `snapAtom`: the snapped end lands on one.
   */
  function dragPlan(g) {
    if (!TOOL_ORDER[tool] || (g.target && g.target.type !== 'atom')) {
      return null;
    }
    const sourceAtom = g.target ? g.target.id : null;
    const from = sourceAtom ? { ...mol.atoms.get(sourceAtom) } : { ...g.start };
    const exclude = sourceAtom ? [sourceAtom] : [];
    const over = hitTest(mol, g.current, { atomsOnly: true });
    const targetAtom = over ? over.id : null;
    let to = targetAtom ? { ...mol.atoms.get(targetAtom) } : snapEndpoint(from, g.current);
    // A snapped end that falls on an existing atom means that atom, not a new one on top of it.
    const landing = targetAtom ? null : hitTest(mol, to, { atomsOnly: true, exclude });
    const snapAtom = landing ? landing.id : null;
    if (snapAtom) {
      to = { ...mol.atoms.get(snapAtom) };
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
   * Resolves the zigzag chain of a Cadena drag (design.md §6.1): it starts at
   * the pressed atom, or at the press point on empty space.
   *
   * @param {object} g - The gesture.
   * @returns {{sourceAtom: number|null, points: {x: number, y: number}[], count: number}|null}
   *   The plan (`count`: carbons the chain adds), or null when the drag started on a bond.
   */
  function chainPlan(g) {
    if (g.target && g.target.type !== 'atom') {
      return null;
    }
    const sourceAtom = g.target ? g.target.id : null;
    const start = sourceAtom ? mol.atoms.get(sourceAtom) : g.start;
    const origin = { x: start.x, y: start.y };
    const side = chooseChainSide(mol, sourceAtom, origin, g.current);
    const maxBonds = sourceAtom ? MAX_CHAIN : MAX_CHAIN - 1;
    const { points, bonds } = chainPoints(origin, g.current, { side, maxBonds });
    return { sourceAtom, points, count: sourceAtom ? bonds : bonds + 1 };
  } // End of function chainPlan()

  /**
   * Commits a Cadena drag as one transaction.
   *
   * @param {object} g - The gesture.
   * @returns {object|null} The transaction outcome, or null when the drag does nothing.
   */
  function finishChain(g) {
    const plan = chainPlan(g);
    if (!plan) {
      return null;
    }
    return transact('draw chain', (d) => {
      if (plan.sourceAtom) {
        const refusal = checkRoom(d, [plan.sourceAtom], 1);
        if (refusal) {
          return refusal;
        }
      }
      let previous = plan.sourceAtom ?? addAtom(d, plan.points[0]);
      for (const point of plan.points.slice(1)) {
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
    if (tool === 'chain') {
      return finishChain(g);
    }
    if (tool === 'move') {
      return finishMove(g);
    }
    const plan = dragPlan(g);
    if (!plan) {
      // Cambiar enlace / Borrar: a wobbly click still counts if it ends on the same item.
      const end = hitTest(mol, g.current);
      const same = end && g.target && end.type === g.target.type && end.id === g.target.id;
      return same ? click(g.target, g.start) : null;
    }
    const order = TOOL_ORDER[tool];
    return transact('drag bond', (d) => {
      const source = plan.sourceAtom ?? addAtom(d, plan.from);
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
        return grow(d, source, order);
      }
      return grow(d, source, order, plan.to);
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
    const target = hitTest(mol, point);
    gesture = { start: { ...point }, current: { ...point }, target, moved: false };
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
      hover = hitTest(mol, point);
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
    const outcome = g.moved ? finishDrag(g) : click(g.target, g.start);
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
    emit('undo', editKind(entry.after, entry.before));
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
    emit('redo', editKind(entry.before, entry.after));
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
   *
   * @param {Map<number, {x: number, y: number}>} positions - Atom id → new position.
   * @returns {object} The transaction outcome (`changed: false` when nothing moved).
   */
  function setCoordinates(positions) {
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
    });
  } // End of function setCoordinates()

  /**
   * Selects a tool.
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
    emit('tool');
  }

  /**
   * The drag preview to draw, if a bond-making drag is in progress.
   *
   * @returns {{from: object, to: object, order: number}|null} The preview.
   */
  function getPreview() {
    if (!gesture || !gesture.moved) {
      return null;
    }
    if (tool === 'chain') {
      const chain = chainPlan(gesture);
      return chain ? { type: 'chain', points: chain.points, count: chain.count } : null;
    }
    const plan = dragPlan(gesture);
    return plan ? { type: 'bond', from: plan.from, to: plan.to, order: TOOL_ORDER[tool] } : null;
  }

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
 * after every change, the display mode, and shake + notification on refused
 * edits.
 *
 * @param {SVGSVGElement} svg - The canvas element.
 * @param {{notify?: function(string): void}} [options] - `notify(message)` shows a Spanish toast.
 * @returns {object} The editor API: the core API plus highlight(), clearHighlight(), showLocants(),
 *   animateCoordinates(), isAnimating(), setDisplayMode(), getDisplayMode(), getView(), setView(), centerView(), zoomBy(), atomClientPoint(),
 *   bondClientPoint(), modelToClient(), clientToModel(), render() and destroy().
 */
export function createEditor(svg, options = {}) {
  const doc = svg.ownerDocument;
  const renderer = createRenderer(svg);
  const core = createEditorCore();
  let activePointer = null;
  let pan = null;
  let pinch = null;
  let spaceHeld = false;
  const touches = new Map();
  let animation = null; // Redraw animation in progress: {from, to, start, frame}.

  /**
   * Redraws the molecule with the current hover, preview and selection
   * (during a redraw animation, at the interpolated positions).
   *
   * @returns {void}
   */
  function refresh() {
    const state = core.getViewState();
    renderer.render(animation ? animation.shown : state.mol, state);
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
    if (middle || (spaceHeld && event.button === 0)) {
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
      core.pointerUp(toModel(event));
    } else {
      core.cancelGesture();
    }
    refresh();
  } // End of function handleEnd()

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
    event.preventDefault();
    if (command.tool) {
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
   * Moves atoms to new positions as one undoable coordinate edit
   * (setCoordinates()), animated over `duration` ms unless the system asks
   * for reduced motion. The model changes at once; only the drawing is
   * interpolated, and any other change ends the animation. With `fit`, the
   * view is re-centred when the new drawing does not fit the visible canvas.
   *
   * @param {Map<number, {x: number, y: number}>} positions - Atom id → new position.
   * @param {{duration?: number, fit?: boolean}} [opts] - Animation length (default 400 ms) and re-centring.
   * @returns {object} The transaction outcome.
   */
  function animateCoordinates(positions, opts = {}) {
    stopAnimation();
    const before = core.getMolecule();
    const outcome = core.setCoordinates(positions);
    if (!outcome.ok || !outcome.changed) {
      return outcome;
    }
    if (opts.fit) {
      const box = moleculeBounds(core.peekMolecule());
      const r = renderer.visibleRect();
      const view = renderer.getView();
      const toCanvas = (x, y) => ({ x: x * view.scale + view.x, y: y * view.scale + view.y });
      const p = toCanvas(box.minX, box.minY);
      const q = toCanvas(box.maxX, box.maxY);
      if (p.x < r.x || p.y < r.y || q.x > r.x + r.width || q.y > r.y + r.height) {
        centerView();
      }
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
  core.onChange(refresh);
  core.onReject(onReject);
  refresh();

  /**
   * Client coordinates of an atom (for tests and tooltips).
   *
   * @param {number} atomId - The atom.
   * @returns {{x: number, y: number}|null} The client point, or null if absent.
   */
  function atomClientPoint(atomId) {
    const atom = core.peekMolecule().atoms.get(atomId);
    return atom ? renderer.modelToClient(atom) : null;
  }

  /**
   * Client coordinates of a bond's midpoint.
   *
   * @param {number} bondId - The bond.
   * @returns {{x: number, y: number}|null} The client point, or null if absent.
   */
  function bondClientPoint(bondId) {
    const mol = core.peekMolecule();
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
   * "Centrar": fits the molecule in the visible canvas (identity view when empty).
   *
   * @returns {{scale: number, x: number, y: number}} The new view.
   */
  function centerView() {
    const view = core.peekMolecule().atoms.size > 0 ? fitView(core.peekMolecule(), renderer.visibleRect()) : { ...IDENTITY_VIEW };
    renderer.setView(view);
    return renderer.getView();
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
