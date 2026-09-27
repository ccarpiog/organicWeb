/**
 * @file SVG sketcher (design.md §6.1): tools, pointer gestures, transactions,
 * undo/redo and the highlight API.
 *
 * Two layers:
 * - createEditorCore(): all the editing logic, DOM-free (unit-tested). It
 *   receives pointer positions in drawing units and owns the molecule, the
 *   current tool, the in-progress gesture and the history.
 * - createEditor(svg): binds the core to an SVG canvas with pointer events
 *   (mouse, touch and pen), Esc to cancel, rendering, and the shake feedback.
 *
 * Transaction rules: every gesture commits at most ONE undo entry, applied to
 * a draft copy of the molecule that must pass `validateStructure()` before it
 * replaces the current one; a refused edit leaves the molecule untouched and
 * reports a Spanish message. While a drag is in progress nothing is mutated
 * (only a preview is shown), so Esc or pointer cancel trivially restores the
 * starting state.
 *
 * Test API: the instance exposes getMolecule(), getMoleculeJSON(), setTool(),
 * getTool(), undo(), redo(), clear(), loadMolecule(), atomClientPoint() and
 * bondClientPoint(). The app publishes it as `window.__editor` (src/ui/app.js)
 * for end-to-end tests.
 */

import {
  createMolecule, addAtom, removeAtom, addBond, removeBond, setBondOrder, bondBetween, bondOrderSum,
  cloneMolecule, moleculeToJSON, moleculeFromJSON, CARBON_VALENCE,
} from '../model/molecule.js';
import { validateStructure, MESSAGES } from '../model/validate.js';
import { createHistory } from './history.js';
import {
  nextAtomPosition, snapEndpoint, hitTest, distance, straightenLinearCentres, overlappingAtoms,
} from './geometry.js';
import { createRenderer } from './render.js';

/** Tool ids, in toolbar order. */
export const TOOLS = Object.freeze(['carbon', 'single', 'double', 'triple', 'cycle', 'erase']);

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
 * @param {{onChange?: Function, onReject?: Function}} [options] - Listeners: onChange({reason}) after
 *   every committed edit, undo, redo, load or tool change; onReject({message, atoms}) when an edit is refused.
 * @returns {object} The core API (see the returned object).
 */
export function createEditorCore(options = {}) {
  let mol = createMolecule();
  let tool = DEFAULT_TOOL;
  let gesture = null;
  let hover = null;
  const history = createHistory();
  const changeListeners = options.onChange ? [options.onChange] : [];
  const rejectListeners = options.onReject ? [options.onReject] : [];

  /**
   * Notifies change listeners.
   *
   * @param {string} reason - 'edit' | 'undo' | 'redo' | 'load' | 'tool' | 'gesture'.
   * @returns {void}
   */
  function emit(reason) {
    for (const listener of changeListeners) {
      listener({ reason });
    }
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
    emit('edit');
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
   * Commits a finished drag.
   *
   * @param {object} g - The gesture.
   * @returns {object|null} The transaction outcome, or null when the drag does nothing.
   */
  function finishDrag(g) {
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
    gesture = { start: { ...point }, current: { ...point }, target: hitTest(mol, point), moved: false };
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
    emit('undo');
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
    emit('redo');
    return true;
  }

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
    tool = name;
    emit('tool');
  }

  /**
   * The drag preview to draw, if a bond-making drag is in progress.
   *
   * @returns {{from: object, to: object, order: number}|null} The preview.
   */
  function getPreview() {
    const plan = gesture && gesture.moved ? dragPlan(gesture) : null;
    return plan ? { from: plan.from, to: plan.to, order: TOOL_ORDER[tool] } : null;
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
    setTool,
    getTool,
    getPreview,
    getHover,
    clearHover,
    isGestureActive,
    onChange,
    onReject,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    peekMolecule,
    getMolecule,
    getMoleculeJSON,
  };
} // End of function createEditorCore()

/**
 * Creates an editor bound to an SVG element: pointer events (mouse, touch,
 * pen; one pointer at a time), Esc to cancel the gesture in progress,
 * rendering after every change, and shake + notification on refused edits.
 *
 * @param {SVGSVGElement} svg - The canvas element.
 * @param {{notify?: function(string): void}} [options] - `notify(message)` shows a Spanish toast.
 * @returns {object} The editor API: the core API plus highlight(), clearHighlight(), showLocants(),
 *   atomClientPoint(), bondClientPoint(), render() and destroy().
 */
export function createEditor(svg, options = {}) {
  const doc = svg.ownerDocument;
  const renderer = createRenderer(svg);
  const core = createEditorCore();
  let activePointer = null;

  /**
   * Redraws the molecule with the current hover and preview.
   *
   * @returns {void}
   */
  function refresh() {
    renderer.render(core.peekMolecule(), { hover: core.getHover(), preview: core.getPreview() });
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
   * Handles pointerdown: starts a gesture for the first pointer; a second
   * pointer (e.g. a second finger) cancels it.
   *
   * @param {PointerEvent} event - The event.
   * @returns {void}
   */
  function handleDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    if (activePointer !== null) {
      core.cancelGesture();
      activePointer = null;
      refresh();
      return;
    }
    event.preventDefault();
    activePointer = event.pointerId;
    if (svg.setPointerCapture) {
      try {
        svg.setPointerCapture(event.pointerId);
      } catch (err) {
        // Synthetic events may not be capturable; the gesture still works.
      }
    }
    core.pointerDown(toModel(event));
    refresh();
  } // End of function handleDown()

  /**
   * Handles pointermove: hover, or drag preview.
   *
   * @param {PointerEvent} event - The event.
   * @returns {void}
   */
  function handleMove(event) {
    if (activePointer !== null && event.pointerId !== activePointer) {
      return;
    }
    core.pointerMove(toModel(event));
    refresh();
  }

  /**
   * Handles pointerup: commits the gesture.
   *
   * @param {PointerEvent} event - The event.
   * @returns {void}
   */
  function handleUp(event) {
    if (event.pointerId !== activePointer) {
      return;
    }
    activePointer = null;
    core.pointerUp(toModel(event));
    refresh();
  }

  /**
   * Handles pointercancel: restores the starting state.
   *
   * @param {PointerEvent} event - The event.
   * @returns {void}
   */
  function handleCancel(event) {
    if (event.pointerId !== activePointer) {
      return;
    }
    activePointer = null;
    core.cancelGesture();
    refresh();
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
   * Handles keydown: Esc cancels the gesture in progress.
   *
   * @param {KeyboardEvent} event - The event.
   * @returns {void}
   */
  function handleKey(event) {
    if (event.key === 'Escape' && core.cancelGesture()) {
      event.preventDefault();
      refresh();
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

  svg.addEventListener('pointerdown', handleDown);
  svg.addEventListener('pointermove', handleMove);
  svg.addEventListener('pointerup', handleUp);
  svg.addEventListener('pointercancel', handleCancel);
  svg.addEventListener('pointerleave', handleLeave);
  svg.addEventListener('animationend', handleAnimationEnd);
  doc.addEventListener('keydown', handleKey);
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
   * Detaches every listener.
   *
   * @returns {void}
   */
  function destroy() {
    svg.removeEventListener('pointerdown', handleDown);
    svg.removeEventListener('pointermove', handleMove);
    svg.removeEventListener('pointerup', handleUp);
    svg.removeEventListener('pointercancel', handleCancel);
    svg.removeEventListener('pointerleave', handleLeave);
    svg.removeEventListener('animationend', handleAnimationEnd);
    doc.removeEventListener('keydown', handleKey);
  }

  return {
    ...core,
    highlight: renderer.highlight,
    clearHighlight: renderer.clearHighlight,
    showLocants: renderer.showLocants,
    atomClientPoint,
    bondClientPoint,
    render: refresh,
    destroy,
  };
} // End of function createEditor()
