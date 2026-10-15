/**
 * @file «¿Cómo se dibuja?» dialog (design.md §15.2; phase R-2a): the student
 * builds a name from tiles — never free text — and «Dibujar» reads it with
 * readName() (src/reverse/index.js).
 *
 * The page holds the skeleton (`#name-builder-dialog` in index.html, next to
 * `#help-dialog`, and the `#draw-name-button` launcher under «¿Cómo se
 * llama?», outside `.results-body`, which results.js replaces). This module
 * fills the tile rows from the catalogue (src/reverse/tiles.js: a tile
 * exists only once the parser supports it), renders the editing state
 * (src/ui/name-builder-state.js, DOM-free) and wires the controls:
 *
 * - the name line: the assembled name, coloured by part kind like the
 *   result name (`part part-<kind>`), one span per tile; a listbox whose
 *   options (the tiles, plus the insertion point before the first one) are
 *   selected by click or with the arrow keys, Home and End (roving
 *   tabindex, `aria-selected`); `aria-live`, so every change is announced;
 *   the opening mark of an unfinished compound branch shows faintly; a tile
 *   that writes nothing (a compound-branch control without marks, the `il`
 *   of a contracted alkoxy prefix, R-5b: `met il oxi` → `metoxi`) is a small
 *   dashed box with an accessible name of its own;
 * - the tile rows («Números», «¿Cuántos?», «Raíces (cuántos carbonos)»,
 *   «Terminaciones», «Ramas», «Anillos» — the `ciclo` tile, phase R-4a,
 *   `benceno` and `fenil`, phase R-4b, the letters `o`, `m`, `p`, phase
 *   R-4c, each with its word (orto, meta, para) beside it, `fenol` and the
 *   closing-bond locant `1(n)`, phase R-5a2, the latter with a tooltip —,
 *   «Grupos» — the halogens `fluoro`, `cloro`, `bromo`, `yodo`, phase R-5a1,
 *   `hidroxi` and the suffix `ol`, phase R-5a2, the alkoxy ending `oxi`,
 *   phase R-5b, and the class word `éter` of an ether's functional-class
 *   name, phase R-5b2, both with a tooltip; `oxo`, `formil` and the
 *   suffixes `al`, `ona`, `carbaldehído`, phase R-5c1, each with a tooltip,
 *   as `benzaldehído` in «Anillos»; the acyl prefixes `acetil` and the
 *   endings `oil` and `carbonil`, phase R-5c2, each with a tooltip, as
 *   `benzoil` in «Anillos»; the acids' class word `ácido`, `carboxi` and the
 *   suffixes `oico` and `carboxílico`, phase R-5d1, each with a tooltip, as
 *   `benzoico` in «Anillos»; the esters' suffixes `oato` and `carboxilato`
 *   and the ending `ilo` of an O-bound group, phase R-6a1, each with a
 *   tooltip, as `benzoato` in «Anillos» —, «Nombres tradicionales» — `tolueno`,
 *   `estireno`, `xileno`, `mesitileno`, phase R-4c, `anisol`, phase R-5b, and
 *   the retained phenols `cresol`, `pirocatecol`, `catecol`, `resorcinol`,
 *   `hidroquinona`, phase R-5a3a, the retained carbonyl names
 *   `formaldehído`, `acetaldehído`, `acetona`, `acetofenona`,
 *   `fenilacetaldehído`, `ftalaldehído`, `isoftalaldehído`,
 *   `tereftalaldehído`, phase R-5c3a, the retained acid names `fórmico`,
 *   `acético`, `oxálico`, `fenilacético`, `ftálico`, `isoftálico`,
 *   `tereftálico`, phase R-5d2, the retained ester names `formiato`,
 *   `acetato`, `fenilacetato`, phase R-6a2a, these and `anisol` each with a tooltip
 *   saying what it is; drafts pending teacher review), each with a «más»
 *   button for the tiles the catalogue keeps behind it;
 * - «Borrar ficha» (also Backspace while the focus is in the dialog),
 *   «Borrar todo», «Dibujar» and «Cerrar» (also Escape and a click on the
 *   backdrop); the focus goes into the dialog on opening and back to the
 *   launcher on closing, as in help.js.
 *
 * «Dibujar» calls `read(tileIds)` (readName() by default; DOM-free). A
 * failure verdict (invalid, ambiguous, incomplete, outOfScope — an empty
 * name is `invalid`) keeps the dialog open, shows the message under the
 * name line (role=status) and marks the wrong tiles (`aria-invalid`); the
 * canvas is never touched here. A success verdict goes to the injected
 * `onDraw(verdict, builder)` handler (src/ui/draw-name.js drawVerdict(),
 * wired in app.js), which draws the molecule and closes the dialog, or
 * reports a molecule it cannot draw with `builder.showFailure()`; any edit
 * clears a stale message and marks. The tiles live in memory only: they
 * survive closing and reopening the dialog, never a reload.
 *
 * The DOM is built with createElement/textContent only (never innerHTML).
 */

import {
  TILES, START_ID, END_ID, POSITIONAL_IDS, CLOSING_ID, ALKOXY_ID, ETHER_CLASS_ID, OXO_ID, FORMYL_ID, AL_ID, ONA_ID, CARBALDEHYDE_ID,
  BENZALDEHYDE_ID, ACETYL_ID, ACYL_ID, RING_CARBONYL_ID, BENZOYL_ID, ACID_WORD_ID, CARBOXY_ID, OICO_ID, CARBOXYLIC_ID, BENZOIC_ID,
  OATO_ID, CARBOXYLATE_ID, BENZOATE_ID, ESTER_ALKYL_ID, tileById,
} from '../reverse/tiles.js';
import { readName } from '../reverse/index.js';
import { createNameBuilderState, isSuccess, verdictFeedback, START } from './name-builder-state.js';

/** The tile rows in dialog order, with their labels (design.md §15.2; drafts pending teacher review). */
export const ROWS = Object.freeze([
  Object.freeze({ id: 'numbers', label: 'Números' }),
  Object.freeze({ id: 'multipliers', label: '¿Cuántos?' }),
  Object.freeze({ id: 'roots', label: 'Raíces (cuántos carbonos)' }),
  Object.freeze({ id: 'endings', label: 'Terminaciones' }),
  Object.freeze({ id: 'branches', label: 'Ramas' }),
  Object.freeze({ id: 'rings', label: 'Anillos' }),
  Object.freeze({ id: 'groups', label: 'Grupos' }),
  Object.freeze({ id: 'traditional', label: 'Nombres tradicionales' }),
]);

/** Labels of the two compound-branch controls (design.md §15.2). */
export const CONTROL_LABELS = Object.freeze({ [START_ID]: 'empieza rama compuesta', [END_ID]: 'acaba rama' });

/**
 * The words of the orto/meta/para letter tiles (design.md §14.4; phase R-4c),
 * shown small beside the letter and read in its accessible name with the
 * positions it stands for: «o (orto, 1,2)».
 */
export const POSITIONAL_WORDS = Object.freeze({
  [POSITIONAL_IDS[2]]: 'orto', [POSITIONAL_IDS[3]]: 'meta', [POSITIONAL_IDS[4]]: 'para',
});

/**
 * The accessible name of an orto/meta/para letter tile: the letter, its word
 * and the positions it stands for.
 *
 * @param {{id: string, text: string, value: number}} tile - A 'positional' catalogue tile.
 * @returns {string} The name, e.g. «p (para, 1,4)».
 */
export function positionalLabel(tile) {
  return `${tile.text} (${POSITIONAL_WORDS[tile.id]}, 1,${tile.value})`;
}

/**
 * Tooltips of tiles whose text needs a word of explanation (R-5a2: the
 * closing-bond locant `1(n)`; R-5a3a: the retained phenols, which say
 * nothing of their groups — what molecule each is, and that `cresol` takes
 * a letter; R-5b: the alkoxy ending `oxi`, where it goes and that the app
 * writes the short forms, and `anisol`; R-5b2: `éter`, after the two groups
 * of the oxygen; R-5c1: `oxo`, `formil`, `al`, `ona`, `carbaldehído` and
 * `benzaldehído`, what group each is and where it goes; R-5c2: `acetil`,
 * `oil`, `carbonil` and `benzoil`, the C=O group bonded by its carbon as a
 * branch and where each goes; R-5c3a: the retained carbonyl names, what
 * molecule each is, and which take prefixes; R-5d1: `ácido`, `carboxi`,
 * `oico`, `carboxílico` and `benzoico`, what each is and where it goes;
 * R-5d2: the retained acid names, what molecule each is, that they go after
 * `ácido`, and which take prefixes; R-6a1: `oato`, `carboxilato`, `benzoato`
 * and `ilo`, what each is, where it goes and that ` de ` and ` y ` are the
 * app's; R-6a2a: the retained ester names, what acid part each is, that the
 * O-bound group follows, and which takes a phenyl; R-6a2b: `oxi` and
 * `carbonil` also say how they make an ester's prefix; drafts pending
 * teacher review).
 * The tile's text stays its accessible name.
 */
export const TILE_HINTS = Object.freeze({
  [CLOSING_ID]: 'Número del enlace que cierra un anillo, del último carbono al 1: se escribe 1(6) en un anillo de 6 carbonos.',
  [ALKOXY_ID]: 'Va detrás de una rama acabada en «il» y la une a la cadena por un oxígeno: met, il y oxi dan metoxi; pent, il y '
    + 'oxi dan (pentiloxi). Detrás de una rama con un C=O forma un éster como rama: acetil y oxi dan (acetiloxi).',
  [ETHER_CLASS_ID]: 'Va al final, detrás de los dos grupos unidos al oxígeno, por orden alfabético: et, il, met, il y éter dan '
    + 'etil metil éter; con dos grupos iguales, di, et, il y éter dan dietil éter.',
  // R-5c1: the aldehydes and ketones.
  [OXO_ID]: 'Un oxígeno unido a un carbono por un enlace doble (C=O) que no es el grupo principal: 4-oxopentanal; en una rama, '
    + '(2-oxoetil).',
  [FORMYL_ID]: 'Un grupo CHO unido por su carbono, cuando ese carbono no es de la cadena ni del anillo: (4-formilciclohexil).',
  [AL_ID]: 'Aldehído (grupo CHO). Va al final, detrás de la terminación de una cadena; el grupo CHO está siempre en un extremo, '
    + 'así que no lleva números: butanal; con dos, butanodial.',
  [ONA_ID]: 'Cetona (C=O en un carbono del interior). Va al final, detrás de la terminación, con su número: pentan-2-ona, '
    + 'ciclohexanona.',
  [CARBALDEHYDE_ID]: 'Grupo CHO unido a un anillo. Va al final, detrás del nombre del anillo: ciclohexanocarbaldehído, '
    + 'benceno-1,4-dicarbaldehído.',
  [BENZALDEHYDE_ID]: 'Benceno con un grupo CHO: bencenocarbaldehído.',
  // R-5c2: the acyl prefixes.
  [ACETYL_ID]: 'El grupo CH₃–CO– como rama, unido por el carbono del C=O: 3-acetilpentano-2,4-diona. Si lleva ramas propias, se '
    + 'escribe con et, ano y oil: (2-cloroetanoil).',
  [ACYL_ID]: 'Va detrás de la terminación de una rama y la une a la cadena por su carbono 1, que lleva un C=O: prop, ano y oil '
    + 'dan propanoil; but, 2, eno y oil dan (but-2-enoil).',
  [RING_CARBONYL_ID]: 'Va detrás del nombre de un anillo: un grupo C=O unido al anillo, como rama, por el carbono del C=O: ciclo, '
    + 'hex, ano y carbonil dan (ciclohexanocarbonil); con números, (ciclohex-2-eno-1-carbonil). Detrás de «oxi» forma un éster '
    + 'como rama: met, il, oxi y carbonil dan (metoxicarbonil).',
  [BENZOYL_ID]: 'Benceno unido a un grupo C=O, como rama, por el carbono del C=O: 3-benzoilpentano-2,4-diona; con ramas en el '
    + 'anillo, (4-metilbenzoil).',
  // R-5d1: the carboxylic acids.
  [ACID_WORD_ID]: 'Va al principio del nombre de un ácido (grupo COOH), delante de todo lo demás: ácido, but, ano y oico dan ácido '
    + 'butanoico; ácido, 2, met, il, prop, ano y oico dan ácido 2-metilpropanoico.',
  [CARBOXY_ID]: 'Un grupo COOH unido por su carbono, cuando no es el grupo principal y su carbono no es de la cadena ni del anillo: '
    + '(carboximetil).',
  [OICO_ID]: 'Ácido (grupo COOH). Va al final, detrás de la terminación de una cadena, y el nombre empieza por «ácido»; el grupo '
    + 'COOH está siempre en un extremo, así que no lleva números: ácido butanoico; con dos, ácido butanodioico.',
  [CARBOXYLIC_ID]: 'Grupo COOH unido a un anillo. Va al final, detrás del nombre del anillo, y el nombre empieza por «ácido»: ácido '
    + 'ciclohexanocarboxílico, ácido benceno-1,3-dicarboxílico.',
  [BENZOIC_ID]: 'Benceno con un grupo COOH: ácido bencenocarboxílico. Va detrás de «ácido»: ácido benzoico.',
  // R-6a1: the esters.
  [OATO_ID]: 'Éster (grupo COO). Va detrás de la terminación de una cadena, y luego el grupo unido al oxígeno, acabado en «ilo» '
    + '(el «de» lo pone la app); el grupo COO está siempre en un extremo, así que no lleva números: et, ano, oato, met e ilo dan '
    + 'etanoato de metilo; con dos, butanodioato de dimetilo.',
  [CARBOXYLATE_ID]: 'Grupo COO unido a un anillo. Va detrás del nombre del anillo, y luego el grupo unido al oxígeno: '
    + 'ciclohexanocarboxilato de etilo, ciclohexano-1,4-dicarboxilato de dimetilo.',
  [BENZOATE_ID]: 'Benceno con un grupo COO: bencenocarboxilato. Detrás va el grupo unido al oxígeno: benzoato de metilo.',
  [ESTER_ALKYL_ID]: 'Acaba el grupo unido al oxígeno de un éster, en lugar de «il»: met e ilo dan metilo; prop, ano, 2 e ilo dan '
    + 'propan-2-ilo; detrás de isopropil, tert-butil o fenil, isopropilo, tert-butilo, fenilo. Sus ramas van delante (etanoato de '
    + '2-cloroetilo); con «di», el grupo se repite (butanodioato de dimetilo); dos grupos distintos, uno tras otro (propanodioato de '
    + 'etilo y metilo).',
  'template-anisole': 'Benceno con un grupo metoxi: metoxibenceno.',
  'template-cresol': 'Fenol con un metilo. Delante va una letra que dice dónde está el metilo: o-cresol, m-cresol o p-cresol.',
  'template-pyrocatechol': 'Benceno con dos grupos OH en carbonos vecinos: benceno-1,2-diol. También se llama catecol.',
  'template-catechol': 'Benceno con dos grupos OH en carbonos vecinos: benceno-1,2-diol. La IUPAC (2013) acepta pirocatecol.',
  'template-resorcinol': 'Benceno con dos grupos OH en los carbonos 1 y 3: benceno-1,3-diol.',
  'template-hydroquinone': 'Benceno con dos grupos OH en los carbonos 1 y 4: benceno-1,4-diol.',
  // R-5c3a: the retained carbonyl names.
  'template-formaldehyde': 'Un solo carbono con un grupo CHO: metanal.',
  'template-acetaldehyde': 'Cadena de 2 carbonos con un grupo CHO: etanal. Admite un fenil en el carbono 2: '
    + '2-(4-metilfenil)acetaldehído.',
  'template-acetone': 'Cadena de 3 carbonos con el C=O en el carbono del medio: propanona.',
  'template-acetophenone': 'Un grupo C=O unido a un metilo y a un benceno: 1-feniletan-1-ona.',
  'template-phenylacetaldehyde': 'Etanal con un fenil en el carbono 2: 2-feniletanal.',
  'template-phthalaldehyde': 'Benceno con dos grupos CHO en carbonos vecinos: benceno-1,2-dicarbaldehído. Admite ramas en el '
    + 'anillo: 4-metilftalaldehído.',
  'template-isophthalaldehyde': 'Benceno con dos grupos CHO en los carbonos 1 y 3: benceno-1,3-dicarbaldehído.',
  'template-terephthalaldehyde': 'Benceno con dos grupos CHO en los carbonos 1 y 4: benceno-1,4-dicarbaldehído.',
  // R-5d2: the retained acid names, after `ácido`.
  'template-formicAcid': 'Un solo carbono con un grupo COOH: ácido metanoico. Va detrás de «ácido»: ácido fórmico.',
  'template-aceticAcid': 'Cadena de 2 carbonos con un grupo COOH: ácido etanoico. Va detrás de «ácido»: ácido acético. Admite '
    + 'un fenil en el carbono 2: ácido 2-(3-metilfenil)acético.',
  'template-oxalicAcid': 'Cadena de 2 carbonos con un grupo COOH en cada uno: ácido etanodioico. Va detrás de «ácido»: ácido '
    + 'oxálico.',
  'template-phenylaceticAcid': 'Ácido etanoico con un fenil en el carbono 2: ácido 2-feniletanoico. Va detrás de «ácido»: ácido '
    + 'fenilacético.',
  'template-phthalicAcid': 'Benceno con dos grupos COOH en carbonos vecinos: ácido benceno-1,2-dicarboxílico. Va detrás de '
    + '«ácido» y admite ramas en el anillo: ácido 4-metilftálico.',
  'template-isophthalicAcid': 'Benceno con dos grupos COOH en los carbonos 1 y 3: ácido benceno-1,3-dicarboxílico. Va detrás de '
    + '«ácido»: ácido isoftálico.',
  'template-terephthalicAcid': 'Benceno con dos grupos COOH en los carbonos 1 y 4: ácido benceno-1,4-dicarboxílico. Va detrás de '
    + '«ácido»: ácido tereftálico.',
  // R-6a2a: the retained ester names, the acid part of an ester; the O-bound group follows.
  'template-formate': 'Un solo carbono con un grupo COO: metanoato. Detrás va el grupo unido al oxígeno: formiato de metilo.',
  'template-acetate': 'Cadena de 2 carbonos con un grupo COO: etanoato. Detrás va el grupo unido al oxígeno: acetato de etilo. '
    + 'Admite un fenil en el carbono 2: 2-(4-metilfenil)acetato de etilo.',
  'template-phenylacetate': 'Etanoato con un fenil en el carbono 2: 2-feniletanoato. Detrás va el grupo unido al oxígeno: '
    + 'fenilacetato de metilo.',
});

/** Text of the empty name line. */
export const PLACEHOLDER = 'Pulsa las fichas de abajo para formar un nombre.';

/**
 * The accessible name of a tile of the name line that writes nothing where
 * it stands (R-5b: the `il` of `metoxi`, which `oxi` replaces; draft pending
 * teacher review): its text and that it is not written.
 *
 * @param {string} text - The tile's text.
 * @returns {string} The name, e.g. «il (no se escribe)».
 */
export function silentLabel(text) {
  return `${text} (no se escribe)`;
}

/** Accessible name of the insertion point before the first tile. */
export const START_LABEL = 'Principio del nombre';

/** Text of a row's button that shows the rest of its tiles. */
export const MORE_LABEL = 'más';

/** Text of that button while the rest is shown. */
export const LESS_LABEL = 'menos';

/**
 * Message shown while the name has the most tiles allowed.
 *
 * @param {number} cap - Most tiles allowed (name-builder-state.js MAX_TILES by default).
 * @returns {string} The Spanish message.
 */
export function fullMessage(cap) {
  return `Ya hay ${cap} fichas, el máximo: borra alguna para añadir otra.`;
}

/**
 * Creates an element with a class and optional text.
 *
 * @param {Document} doc - The document.
 * @param {string} tag - Tag name.
 * @param {string} [className] - Class attribute.
 * @param {string} [text] - Text content.
 * @returns {HTMLElement} The element.
 */
function make(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

/**
 * Builds one tile button. The compound-branch controls show their label
 * beside their mark (the mark hidden from screen readers); an orto/meta/para
 * letter shows its word, small, beside the letter (R-4c); a tile of
 * TILE_HINTS gets its tooltip (R-5a2: `1(n)`; R-5a3a: the retained phenols; R-5c3a: the retained carbonyl names; R-5d2: the
 * retained acid names; R-6a2a: the retained ester names).
 *
 * @param {Document} doc - The document.
 * @param {{id: string, kind: string, text: string, more: boolean}} tile - A catalogue tile.
 * @returns {HTMLButtonElement} The button.
 */
function makeTileButton(doc, tile) {
  const button = make(doc, 'button', `nb-tile nb-tile--${tile.kind}`);
  button.type = 'button';
  button.dataset.tile = tile.id;
  const label = CONTROL_LABELS[tile.id];
  if (label) {
    const mark = make(doc, 'span', 'nb-tile-mark', tile.text);
    mark.setAttribute('aria-hidden', 'true');
    const words = doc.createTextNode(label);
    if (tile.kind === 'end') {
      button.append(words, mark);
    } else {
      button.append(mark, words);
    }
  } else if (tile.kind === 'positional') {
    const hint = make(doc, 'span', 'nb-tile-hint', POSITIONAL_WORDS[tile.id]);
    hint.setAttribute('aria-hidden', 'true');
    button.append(doc.createTextNode(tile.text), hint);
    button.setAttribute('aria-label', positionalLabel(tile));
    button.title = positionalLabel(tile);
  } else {
    button.textContent = tile.text;
  }
  if (TILE_HINTS[tile.id]) {
    button.title = TILE_HINTS[tile.id];
  }
  if (tile.more) {
    button.classList.add('nb-tile--extra');
    button.hidden = true;
  }
  return button;
} // End of function makeTileButton()

/**
 * Builds a row's «más» button, which shows or hides the row's extra tiles
 * (`aria-expanded`; «menos» while they are shown).
 *
 * @param {Document} doc - The document.
 * @param {HTMLElement} group - The row's tile group.
 * @param {string} rowLabel - The row's label, for the button's accessible name.
 * @returns {HTMLButtonElement} The button.
 */
function makeMoreButton(doc, group, rowLabel) {
  const more = make(doc, 'button', 'nb-more', MORE_LABEL);
  more.type = 'button';
  more.setAttribute('aria-expanded', 'false');
  more.setAttribute('aria-label', `${MORE_LABEL} (${rowLabel})`);
  /**
   * Shows the extra tiles, or hides them again.
   *
   * @returns {void}
   */
  function toggle() {
    const expanded = more.getAttribute('aria-expanded') !== 'true';
    group.querySelectorAll('.nb-tile--extra').forEach((button) => { button.hidden = !expanded; });
    more.setAttribute('aria-expanded', String(expanded));
    more.textContent = expanded ? LESS_LABEL : MORE_LABEL;
    more.setAttribute('aria-label', `${expanded ? LESS_LABEL : MORE_LABEL} (${rowLabel})`);
  }
  more.addEventListener('click', toggle);
  return more;
} // End of function makeMoreButton()

/**
 * Fills the rows container with one labelled row per tile row, each with a
 * «más» button when the catalogue keeps tiles behind it.
 *
 * @param {HTMLElement} container - The `#name-builder-rows` element.
 * @returns {void}
 */
export function fillRows(container) {
  const doc = container.ownerDocument;
  container.replaceChildren();
  for (const row of ROWS) {
    const tiles = TILES.filter((tile) => tile.row === row.id);
    if (tiles.length === 0) {
      continue;
    }
    const titleId = `name-builder-row-${row.id}`;
    const section = make(doc, 'section', 'nb-row');
    section.dataset.row = row.id;
    const title = make(doc, 'h3', 'nb-row-title', row.label);
    title.id = titleId;
    const group = make(doc, 'div', 'nb-tiles');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-labelledby', titleId);
    tiles.forEach((tile) => group.appendChild(makeTileButton(doc, tile)));
    if (tiles.some((tile) => tile.more)) {
      group.appendChild(makeMoreButton(doc, group, row.label));
    }
    section.append(title, group);
    container.appendChild(section);
  } // End of the loop over the rows
} // End of function fillRows()

/**
 * Builds the «¿Cómo se dibuja?» dialog on the page's skeleton and wires its
 * launcher.
 *
 * @param {Document} doc - The document holding `#name-builder-dialog` and `#draw-name-button`.
 * @param {{onDraw?: (verdict: object, builder: object) => void, read?: (tiles: string[]) => object,
 *   cap?: number}} [options] - `onDraw`: what a success verdict does (default: show its message in the dialog);
 *   `read`: the reader (default readName()); `cap`: most tiles (default MAX_TILES).
 * @returns {{open: function(): void, close: function(): void, draw: function(): object,
 *   showVerdict: function(object): void, showFailure: function(string): void, state: object}|null} Handles, or null
 *   when the page has no dialog.
 */
export function buildNameBuilder(doc, options = {}) {
  const dialog = doc.getElementById('name-builder-dialog');
  const launcher = doc.getElementById('draw-name-button');
  if (!dialog || !launcher || typeof dialog.showModal !== 'function') {
    return null;
  }
  const heading = dialog.querySelector('#name-builder-title');
  const nameLine = dialog.querySelector('#name-builder-name');
  const message = dialog.querySelector('#name-builder-message');
  const limit = dialog.querySelector('#name-builder-limit');
  const rows = dialog.querySelector('#name-builder-rows');
  const state = createNameBuilderState(options.cap === undefined ? {} : { cap: options.cap });
  const read = options.read || readName;
  fillRows(rows);

  /**
   * The option the name line's roving tabindex points at: the selection,
   * else the last tile.
   *
   * @returns {number} A tile index or START (-1 too when there are no tiles).
   */
  function activeIndex() {
    const selection = state.selection();
    return selection === null ? state.count() - 1 : selection;
  }

  /**
   * Updates the selected option and the roving tabindex in place (no
   * rebuild, so the focus stays where it is).
   *
   * @returns {void}
   */
  function syncSelection() {
    const selection = state.selection();
    const active = activeIndex();
    for (const option of nameLine.querySelectorAll('[role="option"]')) {
      const index = Number(option.dataset.index);
      option.setAttribute('aria-selected', String(index === selection));
      option.classList.toggle('is-selected', index === selection);
      option.tabIndex = index === active ? 0 : -1;
    }
  }

  /**
   * Moves the focus to the active option (to the name line itself when it
   * has none).
   *
   * @returns {void}
   */
  function focusActive() {
    const option = nameLine.querySelector(`[role="option"][data-index="${activeIndex()}"]`);
    (option || nameLine).focus();
  }

  /**
   * Rebuilds the name line from the state: the placeholder, or the
   * insertion point and one span per piece. The focus, when it was in the
   * name line, goes to the active option again.
   *
   * @returns {void}
   */
  function renderName() {
    const view = state.view();
    const refocus = nameLine.contains(doc.activeElement);
    const nodes = [];
    if (view.count === 0) {
      nodes.push(make(doc, 'span', 'nb-placeholder', PLACEHOLDER));
    } else {
      const start = make(doc, 'span', 'nb-start');
      start.setAttribute('role', 'option');
      start.setAttribute('aria-label', START_LABEL);
      start.dataset.index = String(START);
      nodes.push(start);
    }
    for (const piece of view.pieces) {
      if (piece.tile === null) {
        if (piece.text !== '') {
          nodes.push(make(doc, 'span', `part part-${piece.kind}`, piece.text)); // Automatic text: punctuation, connecting vowel.
        }
        continue;
      }
      const span = make(doc, 'span', `nb-piece part part-${piece.kind}`, piece.text);
      span.setAttribute('role', 'option');
      span.dataset.index = String(piece.tile);
      span.dataset.tile = piece.id;
      if (CONTROL_LABELS[piece.id]) {
        span.setAttribute('aria-label', CONTROL_LABELS[piece.id]);
      } else if (piece.text === '') {
        span.setAttribute('aria-label', silentLabel(tileById(piece.id).text)); // The `il` of `metoxi` (R-5b).
      }
      span.classList.toggle('nb-piece--pending', piece.pending);
      span.classList.toggle('nb-piece--silent', piece.text === '');
      if (piece.invalid) {
        span.setAttribute('aria-invalid', 'true');
        span.classList.add('nb-piece--invalid');
      }
      nodes.push(span);
    } // End of the loop over the pieces
    nameLine.replaceChildren(...nodes);
    syncSelection();
    if (refocus) {
      focusActive();
    }
  } // End of function renderName()

  /**
   * Shows the feedback of the last «Dibujar» (or nothing) under the name
   * line, and the cap message with the tile buttons marked unavailable.
   *
   * @returns {void}
   */
  function renderMessages() {
    const feedback = state.feedback();
    message.className = feedback ? `nb-message nb-message--${feedback.tone}` : 'nb-message';
    message.replaceChildren(...(feedback ? feedback.lines.map((line) => make(doc, 'span', 'nb-message-line', line)) : []));
    const full = state.isFull();
    if (limit) {
      limit.textContent = full ? fullMessage(state.cap) : '';
    }
    for (const button of rows.querySelectorAll('[data-tile]')) {
      if (full) {
        button.setAttribute('aria-disabled', 'true');
      } else {
        button.removeAttribute('aria-disabled');
      }
    }
  } // End of function renderMessages()

  /**
   * Renders the whole state.
   *
   * @returns {void}
   */
  function render() {
    renderName();
    renderMessages();
  }

  /**
   * «Borrar ficha»: removes the selected (else the last) tile.
   *
   * @returns {void}
   */
  function deleteTile() {
    if (state.remove()) {
      render();
    }
  }

  /**
   * Shows a verdict's message in the dialog: in the error style with the
   * wrong tiles marked for a failure, in the plain style for a success.
   *
   * @param {object} verdict - A readName() verdict.
   * @returns {void}
   */
  function showVerdict(verdict) {
    state.setFeedback(verdictFeedback(verdict, state.count()));
    render();
  }

  /**
   * Shows a failure that is not the reader's (the molecule of an understood
   * name cannot be drawn) in the error style, announced like the others; no
   * tile is marked, since no tile is wrong.
   *
   * @param {string} text - The Spanish message.
   * @returns {void}
   */
  function showFailure(text) {
    state.setFeedback({ tone: 'error', lines: [text], invalid: [] });
    render();
  }

  /**
   * Opens the dialog with the focus on its heading.
   *
   * @returns {void}
   */
  function open() {
    if (dialog.open) {
      return;
    }
    render();
    dialog.showModal();
    (heading || dialog).focus({ preventScroll: true });
  }

  /**
   * Closes the dialog (the tiles are kept).
   *
   * @returns {void}
   */
  function close() {
    if (dialog.open) {
      dialog.close();
    }
  }

  const handle = { open, close, draw: null, showVerdict, showFailure, state };
  const onDraw = options.onDraw || ((verdict, builder) => builder.showVerdict(verdict));

  /**
   * «Dibujar»: reads the name; a failure stays in the dialog, a success goes
   * to the onDraw handler.
   *
   * @returns {object} The verdict.
   */
  function draw() {
    const verdict = read(state.tiles());
    if (isSuccess(verdict)) {
      state.clearFeedback();
      render();
      onDraw(verdict, handle);
    } else {
      showVerdict(verdict);
    }
    return verdict;
  } // End of function draw()
  handle.draw = draw;

  /**
   * A tile button adds its tile (unless the cap is reached).
   *
   * @param {MouseEvent} event - A click in the tile rows.
   * @returns {void}
   */
  function onTileClick(event) {
    const button = event.target.closest('[data-tile]');
    if (!button || button.getAttribute('aria-disabled') === 'true') {
      return;
    }
    if (state.insert(button.dataset.tile)) {
      render();
    }
  }

  /**
   * «Borrar todo».
   *
   * @returns {void}
   */
  function clearAll() {
    state.clear();
    render();
  }

  /**
   * A click on a span of the name line selects it.
   *
   * @param {MouseEvent} event - A click in the name line.
   * @returns {void}
   */
  function onNameClick(event) {
    const option = event.target.closest('[role="option"]');
    if (!option) {
      return;
    }
    state.select(Number(option.dataset.index));
    syncSelection();
    option.focus();
  }

  /**
   * The selection follows the focus (Tab into the name line, a tap).
   *
   * @param {FocusEvent} event - A focusin in the name line.
   * @returns {void}
   */
  function onNameFocus(event) {
    const option = event.target.closest('[role="option"]');
    if (option && state.select(Number(option.dataset.index))) {
      syncSelection();
    }
  }

  /**
   * Arrow keys, Home and End move the selection on the name line.
   *
   * @param {KeyboardEvent} event - A keydown in the name line.
   * @returns {void}
   */
  function onNameKey(event) {
    const steps = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
    if (event.key in steps) {
      state.moveSelection(steps[event.key]);
    } else if (event.key === 'Home') {
      state.select(START);
    } else if (event.key === 'End') {
      state.select(state.count() - 1);
    } else {
      return;
    }
    event.preventDefault();
    syncSelection();
    focusActive();
  } // End of function onNameKey()

  /**
   * Backspace = «Borrar ficha» while the focus is in the dialog (the editor
   * ignores keys while a dialog is open).
   *
   * @param {KeyboardEvent} event - A keydown in the dialog.
   * @returns {void}
   */
  function onDialogKey(event) {
    if (event.key === 'Backspace' && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      deleteTile();
    }
  }

  /**
   * A click on the backdrop (outside the dialog box) closes the dialog.
   *
   * @param {MouseEvent} event - A click on the dialog element.
   * @returns {void}
   */
  function onBackdropClick(event) {
    if (event.target !== dialog) {
      return;
    }
    const box = dialog.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right
      && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) {
      close();
    }
  } // End of function onBackdropClick()

  rows.addEventListener('click', onTileClick);
  dialog.querySelector('[data-role="delete"]').addEventListener('click', deleteTile);
  dialog.querySelector('[data-role="clear"]').addEventListener('click', clearAll);
  dialog.querySelector('[data-role="draw"]').addEventListener('click', draw);
  dialog.querySelector('[data-role="close"]').addEventListener('click', close);
  nameLine.addEventListener('click', onNameClick);
  nameLine.addEventListener('focusin', onNameFocus);
  nameLine.addEventListener('keydown', onNameKey);
  dialog.addEventListener('keydown', onDialogKey);
  dialog.addEventListener('click', onBackdropClick);
  dialog.addEventListener('close', () => launcher.focus());
  launcher.addEventListener('click', open);
  launcher.disabled = false;
  render();
  return handle;
} // End of function buildNameBuilder()
