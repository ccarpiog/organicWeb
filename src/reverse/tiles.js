/**
 * @file Tile catalogue of «¿Cómo se dibuja?» (design.md §15.4, §15.5.1;
 * phase R-1a): the pieces a student picks to build a name — numbers,
 * multipliers, word roots, endings, branch words and the two compound-branch
 * controls. Pure data, no DOM.
 *
 * Every Spanish text comes from the naming lexicon (lexicon.es.js: stem(),
 * multiplier(), compoundMultiplier(), ENDINGS, FREE_VALENCE_SUFFIXES,
 * RETAINED_PREFIXES, ENCLOSING_MARKS, RING_PREFIX, BENZENE_NAME,
 * TRADITIONAL_NAMES, BENZENE_DIGROUP_NAMES, POSITIONAL_LETTERS,
 * HALOGEN_PREFIXES, GROUP_PREFIXES, GROUP_SUFFIXES, PHENOL_STEM, ALKOXY_ENDING,
 * ETHER_CLASS_WORD, RING_GROUP_SUFFIXES, BENZENE_GROUP_NAMES, FORMYL_PREFIX),
 * never retyped here;
 * numbers are digits. Tile ids are language-neutral (`root-4`, `ending-double`,
 * `retained-tert-butyl`), so a sequence of ids survives a change of wording.
 *
 * A tile is `{id, kind, value, row, text, more}`:
 * - `kind` — 'num' (a locant 1–30), 'mult' (di…triaconta), 'cmult'
 *   (bis, tris, tetrakis…), 'root' (met…triacont, 1–30 carbons), 'ending'
 *   (ano / eno / ino; value 'saturated' | 'double' | 'triple', the ENDINGS
 *   keys), 'freeValence' (il / iliden; value 1 | 2, the attachment bond
 *   order), 'retained' (isopropil, isopropiliden, tert-butil; value the
 *   RETAINED_PREFIXES id, with `italic` the descriptor ignored in
 *   alphabetical order; also `fenil`, value 'phenyl', in the «Anillos» row
 *   from R-4b: the benzene ring as a branch, bonded by its carbon 1, which
 *   unlike the other retained words takes prefixes of its own inside a
 *   compound branch, `(4-metilfenil)`), 'start' / 'end' (the controls
 *   «empieza rama compuesta» / «acaba rama»; their text is the plain
 *   enclosing mark, the assembler picks the real one), 'ring' (the
 *   nondetachable prefix `ciclo` before a root: a ring of that many carbons,
 *   as the parent — `ciclohexano` — or a branch — `ciclohexil`; value
 *   'cyclo'), 'benzene' (the retained parent `benceno`, a whole word: the
 *   benzene ring as the parent, R-4b; value 'benzene'), 'template' (a
 *   retained benzene parent with groups of its own, R-4c: `tolueno`,
 *   `estireno`, `xileno`, `mesitileno`; R-5a3a: the retained phenols
 *   `cresol`, `pirocatecol`, `catecol`, `resorcinol`, `hidroquinona`, whose
 *   OH groups are the principal group; value the TEMPLATES key),
 *   'positional' (the old orto/meta/para letters `o`, `m`, `p`, R-4c: the two
 *   occupied positions of a benzene ring; value the locant of the second
 *   one, 2 | 3 | 4, the POSITIONAL_LETTERS keys), 'halogen' (the halogen
 *   prefixes `fluoro`, `cloro`, `bromo`, `yodo`, R-5a1: one atom bonded to
 *   the carbon its locant says, never a chain of its own; value the element
 *   symbol, the HALOGEN_PREFIXES keys), 'hydroxy' (the prefix `hidroxi`,
 *   R-5a2: the OH of an alcohol that is not the principal group, one oxygen
 *   bonded to its carbon like a halogen; value 'alcohol', the
 *   GROUP_PREFIXES key; HYDROXY_ELEMENT is its atom), 'suffix' (the
 *   principal-group suffix `ol`, R-5a2: after the parent's ending, with its
 *   locants and multiplier, `propan-2-ol`, `butano-1,4-diol`; value
 *   'alcohol', the GROUP_SUFFIXES key), and in the «Anillos» row `fenol`
 *   (R-5a2: kind 'benzene', value 'phenol' — the benzene parent with its
 *   OH at carbon 1, `4-metilfenol`) and 'closing' (`1(n)`, R-5a2: the
 *   compound locant of a ring's closing bond, from its last carbon n to
 *   carbon 1, written `1(6)` on a ring of six — `ciclohex-1(6)-eno-1,2,4-triol`,
 *   `ciclopropa-1,1(3),2-trieno`; value null), 'alkoxy' (the ending `oxi`,
 *   R-5b: written right after a branch that ends in `il` — a chain or ring,
 *   `isopropil`, `tert-butil`, `fenil`, also the own chain of a compound
 *   branch, before its END — it makes that branch an alkoxy prefix, the
 *   branch bonded to an ether oxygen that is bonded to the carbon the
 *   prefix's locant says; the assembler contracts it as render.js
 *   alkoxyTokens() does: `met il oxi` → `metoxi`, `isopropil oxi` →
 *   `isopropoxi`, but `pent il oxi` → `(pentiloxi)`; value 'ether'),
 *   'classWord' (the word `éter` of an ether's functional-class name, R-5b2:
 *   the last tile of the name, after the two groups bonded to the oxygen —
 *   `et il met il éter` → `etil metil éter`, `di et il éter` → `dietil
 *   éter`; the spaces are automatic; value 'ether');
 *   and for the aldehydes and ketones (R-5c1): the suffixes `al` (value
 *   'aldehyde': a –CHO at an end of a chain, terminal by rule — `butanal`,
 *   `butanodial`), `ona` (value 'ketone': a C=O on a carbon of the parent —
 *   `pentan-2-ona`, `ciclohexanona`) and `carbaldehído` (value
 *   'carbaldehyde': a –CHO whose carbon is outside the parent, bonded to the
 *   carbon its locant gives — `ciclohexanocarbaldehído`,
 *   `benceno-1,4-dicarbaldehído`), kind 'suffix' like `ol` (SUFFIX_GROUPS);
 *   'carbonyl' (the prefix `oxo`: one oxygen double-bonded to its carbon, a
 *   one-atom group like a halogen — `4-oxopentanal`, `(2-oxoetil)`; value
 *   'ketone', the GROUP_PREFIXES key); `formil` (kind 'retained', value
 *   'formyl': the –CHO as a branch, one carbon with its =O bonded by that
 *   carbon — `(4-formilciclohexil)`; the lexicon's FORMYL_PREFIX); and in the
 *   «Anillos» row `benzaldehído` (kind 'benzene', value 'benzaldehyde': the
 *   benzene parent with its –CHO at carbon 1, as `fenol` with its OH —
 *   `4-metilbenzaldehído`; GROUP_WORD_PARENTS);
 * - `row` — the tile row of the dialog (design.md §15.2): 'numbers',
 *   'multipliers', 'roots', 'endings', 'branches', 'rings' («Anillos», with
 *   the letters o, m, p from R-4c, `fenol` and `1(n)` from R-5a2,
 *   `benzaldehído` from R-5c1), 'groups' («Grupos», R-5a1: the halogens;
 *   R-5a2: `hidroxi` and `ol`; R-5b: `oxi`, and `éter` from R-5b2; R-5c1:
 *   `oxo`, `formil`, `al`, `ona`, `carbaldehído`),
 *   'traditional' («Nombres tradicionales», R-4c: the templates; R-5a3a:
 *   the retained phenols; R-5b: `anisol`; later phases add acetona, ácido
 *   acético…);
 * - `more` — the tile sits behind the row's «más» button (numbers 13–30,
 *   multipliers from hepta / heptakis, roots from undec).
 */

import {
  MAX_STEM, stem, multiplier, compoundMultiplier, ENDINGS, FREE_VALENCE_SUFFIXES, RETAINED_PREFIXES, ENCLOSING_MARKS,
  RING_PREFIX, BENZENE_NAME, TRADITIONAL_NAMES, BENZENE_DIGROUP_NAMES, POSITIONAL_LETTERS, HALOGEN_PREFIXES, GROUP_PREFIXES,
  GROUP_SUFFIXES, PHENOL_STEM, ALKOXY_ENDING, ETHER_CLASS_WORD, RING_GROUP_SUFFIXES, BENZENE_GROUP_NAMES, FORMYL_PREFIX, groupName,
} from '../naming/lexicon.es.js';

/** Largest locant tile (the longest supported chain, design.md §1.1). */
export const MAX_NUM = MAX_STEM;

/** Largest multiplier tile (`triaconta`, `triacontakis`; design.md §15.5.1). */
export const MAX_MULT = MAX_STEM;

/** Last number shown before «más» (design.md §15.2: 1–12, then 13–30). */
const NUM_VISIBLE = 12;

/** Last multiplier shown before «más» (design.md §15.2: di…hexa, then hepta…triaconta). */
const MULT_VISIBLE = 6;

/** Last root shown before «más» (design.md §15.2: met…dec, then undec…triacont). */
const ROOT_VISIBLE = 10;

/** Retained branch words of the «Ramas» row (design.md §15.5.1); `phenyl` sits in the «Anillos» row (R-4b). */
const RETAINED_IDS = Object.freeze(['isopropyl', 'isopropylidene', 'tert-butyl']);

/** Id of the «empieza rama compuesta» control. */
export const START_ID = 'branch-start';

/** Id of the «acaba rama» control. */
export const END_ID = 'branch-end';

/** Id of the `ciclo` tile (design.md §15.8 R-4: `ciclo` parents and ring branches). */
export const RING_ID = 'ring-cyclo';

/** Id of the `benceno` tile (design.md §15.8 R-4, phase R-4b: the benzene parent). */
export const BENZENE_ID = 'ring-benzene';

/** Id of the `fenil` tile (design.md §15.8 R-4, phase R-4b: the benzene ring as a branch). */
export const PHENYL_ID = 'retained-phenyl';

/** Ids of the orto/meta/para letters by the locant of the second occupied position (design.md §14.4; phase R-4c). */
export const POSITIONAL_IDS = Object.freeze({ 2: 'positional-ortho', 3: 'positional-meta', 4: 'positional-para' });

/**
 * Ids of the halogen tiles by element symbol (design.md §15.8 R-5a; phase
 * R-5a1), in the lexicon's HALOGEN_PREFIXES order: `fluoro`, `cloro`,
 * `bromo`, `yodo`.
 */
export const HALOGEN_IDS = Object.freeze(Object.fromEntries(
  Object.keys(HALOGEN_PREFIXES).map((element) => [element, `halogen-${element}`]),
));

/** Id of the `hidroxi` tile (design.md §15.8 R-5a; phase R-5a2: the OH as a prefix). */
export const HYDROXY_ID = 'group-hydroxy';

/** The element of the atom a `hidroxi` prefix adds (its hydrogen is implicit, model/molecule.js). */
export const HYDROXY_ELEMENT = 'O';

/** Id of the `ol` tile (design.md §15.8 R-5a; phase R-5a2: the alcohol suffix). */
export const OL_ID = 'suffix-alcohol';

/** Id of the `fenol` tile (design.md §15.8 R-5a; phase R-5a2: the benzene parent with its OH at carbon 1). */
export const PHENOL_ID = 'ring-phenol';

/** Id of the `1(n)` tile (design.md §15.4 Slot `closing`, §15.5.2 item 6; phase R-5a2: a ring's closing bond). */
export const CLOSING_ID = 'ring-closing';

/** Id of the `oxi` tile (design.md §15.5.2 item 6, §15.8 R-5b; phase R-5b: a branch bonded through an ether oxygen). */
export const ALKOXY_ID = 'group-alkoxy';

/** The element of the ether oxygen an alkoxy prefix adds between its branch and the carbon it hangs from (R-5b). */
export const ALKOXY_ELEMENT = 'O';

/**
 * Id of the `éter` tile (design.md §2, §15.8 R-5b; phase R-5b2: the class
 * word of an ether's functional-class name, `etil metil éter`).
 */
export const ETHER_CLASS_ID = 'class-ether';

/** How many groups the oxygen of an ether's functional-class name carries (`etil metil éter`, `dietil éter`; R-5b2). */
export const ETHER_CLASS_GROUPS = 2;

/** Id of the `oxo` tile (design.md §15.8 R-5c; phase R-5c1: a C=O that is not the principal group, as a prefix). */
export const OXO_ID = 'group-oxo';

/** The element of the atom an `oxo` prefix adds, double-bonded to its carbon (R-5c1). */
export const OXO_ELEMENT = 'O';

/** Id of the `formil` tile (design.md §15.8 R-5c; phase R-5c1: a –CHO bonded by its carbon, as a branch). */
export const FORMYL_ID = 'retained-formyl';

/** Id of the `al` tile (design.md §15.8 R-5c; phase R-5c1: the aldehyde suffix of a chain). */
export const AL_ID = 'suffix-aldehyde';

/** Id of the `ona` tile (design.md §15.8 R-5c; phase R-5c1: the ketone suffix). */
export const ONA_ID = 'suffix-ketone';

/** Id of the `carbaldehído` tile (design.md §15.8 R-5c; phase R-5c1: the –CHO suffix whose carbon is outside the parent). */
export const CARBALDEHYDE_ID = 'suffix-carbaldehyde';

/** Id of the `benzaldehído` tile (design.md §15.8 R-5c; phase R-5c1: the benzene parent with its –CHO at carbon 1). */
export const BENZALDEHYDE_ID = 'ring-benzaldehyde';

/**
 * The principal groups of the suffix tiles, by tile value (R-5a2, R-5c1):
 * the group (`kind`, a lexicon GROUP_SUFFIXES key, as the engine's
 * SuffixStructure says it), whether its carbon is outside the parent
 * (`outside`: `carbaldehído`, a new carbon bonded to the parent's carbon,
 * the =O on it — render.js suffixWords() `outside`), the order of the bond
 * from the carbon to its oxygen (`order`: 1 for the OH, 2 for a C=O) and
 * whether it sits at a chain end by rule (`terminal`: `al`, render.js
 * TERMINAL_SUFFIXES; never cited on a chain).
 */
export const SUFFIX_GROUPS = Object.freeze({
  alcohol: Object.freeze({ kind: 'alcohol', outside: false, order: 1, terminal: false }),
  aldehyde: Object.freeze({ kind: 'aldehyde', outside: false, order: 2, terminal: true }),
  ketone: Object.freeze({ kind: 'ketone', outside: false, order: 2, terminal: false }),
  carbaldehyde: Object.freeze({ kind: 'aldehyde', outside: true, order: 2, terminal: false }),
});

/**
 * The whole-word benzene parents that place their principal group at
 * carbon 1 themselves, by tile value: `fenol` (R-5a2, its OH) and
 * `benzaldehído` (R-5c1, its –CHO, whose carbon is outside the ring):
 * `suffix` the SUFFIX_GROUPS key of that group, `group` how the messages
 * call it (the parser's and the builder's «grupo OH», «grupo CHO»).
 */
export const GROUP_WORD_PARENTS = Object.freeze({
  phenol: Object.freeze({ suffix: 'alcohol', group: 'grupo OH' }),
  benzaldehyde: Object.freeze({ suffix: 'carbaldehyde', group: 'grupo CHO' }),
});

/**
 * The retained branch words that take `oxi` (R-5b, render.js
 * isContractedAlkoxy(): `isopropoxi`, `tert-butoxi`, `fenoxi`, always
 * contracted); `isopropiliden` does not (an iliden is a double bond, an
 * ether oxygen takes single bonds only).
 */
export const ALKOXY_RETAINED = Object.freeze(['isopropyl', 'tert-butyl', 'phenyl']);

/**
 * Tells whether a tile kind, a parse.js node type or an interpret.js
 * SubstituentSpec kind is a one-atom group prefix: a halogen (R-5a1),
 * `hidroxi` (R-5a2) or `oxo` (R-5c1) — one heteroatom bonded to its carbon
 * (single-bonded, or double-bonded for `oxo`: atomGroupOrder()), never a
 * chain of its own, never enclosed by itself, no prefixes, no slots of its
 * own.
 *
 * @param {string} kind - A tile kind, node type or spec kind.
 * @returns {boolean} True for 'halogen', 'hydroxy' and 'carbonyl' (`oxo`).
 */
export function isAtomGroup(kind) {
  return kind === 'halogen' || kind === 'hydroxy' || kind === 'carbonyl';
}

/**
 * The order of the bond from a one-atom group to its carbon: 2 for the =O
 * of `oxo` (R-5c1), 1 for a halogen or the OH of `hidroxi`.
 *
 * @param {string} kind - A one-atom group's kind (isAtomGroup()).
 * @returns {number} 1 or 2.
 */
export function atomGroupOrder(kind) {
  return kind === 'carbonyl' ? 2 : 1;
}

/**
 * The element of a one-atom group's atom: the oxygen of `hidroxi` (R-5a2)
 * or `oxo` (R-5c1), else the halogen tile's value.
 *
 * @param {string} kind - A one-atom group's kind (isAtomGroup()).
 * @param {string} value - Its tile's value.
 * @returns {string} The element symbol.
 */
export function atomGroupElement(kind, value) {
  if (kind === 'hydroxy') {
    return HYDROXY_ELEMENT;
  }
  return kind === 'carbonyl' ? OXO_ELEMENT : value;
}

/**
 * The text of the `1(n)` tile, or of the compound locant it writes on a
 * ring of `n` carbons (structure.js locantText() of compoundLocant(1, n):
 * `1(6)`).
 *
 * @param {number|string} n - The ring's carbons, or the letter `n` for the tile itself.
 * @returns {string} `1(6)`, or `1(n)`.
 */
export function closingText(n) {
  const [open, close] = ENCLOSING_MARKS[0];
  return `1${open}${n}${close}`;
}

/**
 * The defining group of a retained benzene template: its chain of carbons
 * bonded by carbon 1, with the double bonds of that chain by their lower
 * locant (a methyl; the ethenyl of `estireno`).
 */
const METHYL = Object.freeze({ length: 1, double: Object.freeze([]) });
const ETHENYL = Object.freeze({ length: 2, double: Object.freeze([1]) });

/** The defining group of `anisol` (R-5b): a methyl bonded to the ring through an ether oxygen, the methoxy group. */
const METHOXY = Object.freeze({ length: 1, double: Object.freeze([]), alkoxy: true });

/** No ring carbons: a template without OH groups. */
const NONE = Object.freeze([]);

/**
 * The retained benzene parents of the «Nombres tradicionales» row (design.md
 * §14.5, §15.8 R-4 and R-5a; phases R-4c and R-5a3a), keyed by the tile
 * value: a benzene ring with `count` identical defining groups `group`, at
 * the ring carbons `positions` — or, for `xileno` and `cresol` (`positions`
 * null), where the student says (`1,2-xileno`, two number tiles, or
 * `o-xileno`, a letter; `cresol` a letter only, `letterOnly`: the engine
 * writes `o-cresol`, never a number; left out, they are searched) — and, for
 * the retained phenols (R-5a3a), OH groups at the ring carbons `hydroxy`, the
 * principal group cited by the word itself as `fenol` cites its OH (the
 * suffix of the reading, interpret.js): `cresol` (one OH at 1 and a methyl,
 * the letter giving the methyl's position, `p-cresol` = 4-metilfenol),
 * `pirocatecol` and `catecol` (OH at 1 and 2), `resorcinol` (1 and 3),
 * `hidroquinona` (1 and 4), which have no carbon group (`count` 0, `group`
 * null, `positions` empty). `id` is the TRADITIONAL_NAMES id of the tile's
 * text; a diol has none, its key being its BENZENE_DIGROUP_NAMES id. The forward engine
 * gives these names for the bare molecules only (never a substituted
 * tolueno, estireno, xileno, mesitileno, cresol, catecol, resorcinol or
 * hidroquinona, aromatic.js); a student's prefixes on a template are still
 * read, numbered on its ring, the defining groups at the carbons the
 * template says. `feminine` marks a word the messages quote with «la»
 * (`de la hidroquinona`; withArticle()). R-5b adds `anisol`, the benzene
 * ring with one methoxy group at carbon 1 (its `group` an alkoxy group,
 * `alkoxy` set: a methyl bonded to the ring through an ether oxygen; the
 * forward engine gives `anisol` for the bare metoxibenceno only, as
 * `tolueno` for the bare metilbenceno, aromatic.js traditionalNameId()).
 * Later phases add the retained parents with another principal group
 * (`anilina`, `ácido benzoico`…).
 */
export const TEMPLATES = Object.freeze({
  toluene: Object.freeze({ id: 'toluene', group: METHYL, count: 1, positions: Object.freeze([1]), hydroxy: NONE }),
  styrene: Object.freeze({ id: 'styrene', group: ETHENYL, count: 1, positions: Object.freeze([1]), hydroxy: NONE }),
  xylene: Object.freeze({ id: 'xylene12', group: METHYL, count: 2, positions: null, hydroxy: NONE }),
  mesitylene: Object.freeze({ id: 'mesitylene', group: METHYL, count: 3, positions: Object.freeze([1, 3, 5]), hydroxy: NONE }),
  anisole: Object.freeze({ id: 'anisole', group: METHOXY, count: 1, positions: Object.freeze([1]), hydroxy: NONE }),
  cresol: Object.freeze({ id: 'oCresol', group: METHYL, count: 1, positions: null, letterOnly: true, hydroxy: Object.freeze([1]) }),
  pyrocatechol: Object.freeze({ group: null, count: 0, positions: NONE, hydroxy: Object.freeze([1, 2]) }),
  catechol: Object.freeze({ group: null, count: 0, positions: NONE, hydroxy: Object.freeze([1, 2]) }),
  resorcinol: Object.freeze({ group: null, count: 0, positions: NONE, hydroxy: Object.freeze([1, 3]) }),
  hydroquinone: Object.freeze({ group: null, count: 0, positions: NONE, hydroxy: Object.freeze([1, 4]), feminine: true }),
});

/**
 * Tells whether a template is a retained phenol (R-5a3a: `cresol`,
 * `pirocatecol`, `catecol`, `resorcinol`, `hidroquinona`): its word places
 * OH groups on the ring.
 *
 * @param {string} value - A TEMPLATES key.
 * @returns {boolean} True for a retained phenol.
 */
export function isPhenolTemplate(value) {
  return TEMPLATES[value].hydroxy.length > 0;
}

/** How the messages call an alkoxy group (design.md §1.1: «el grupo metoxi», never `metoxilo`; R-5b). */
const GROUP_WORD = 'grupo';

/**
 * The name of a template's defining group as the messages say it
 * (lexicon groupName()): `metilo`, `etenilo`; for the alkoxy group of
 * `anisol` (R-5b) its prefix after «grupo», `grupo metoxi` (design.md §1.1:
 * the group is called by its prefix, never `metoxilo`); null for a template
 * without a carbon group (the diols of R-5a3a).
 *
 * @param {string} value - A TEMPLATES key.
 * @returns {string|null} The group's name.
 */
export function templateGroupWord(value) {
  const { group } = TEMPLATES[value];
  if (!group) {
    return null;
  }
  if (group.alkoxy) {
    return `${GROUP_WORD} ${stem(group.length)}${ALKOXY_ENDING}`; // `grupo metoxi` (a contracted alkoxy prefix).
  }
  const unsaturation = group.double.length > 0 ? ENDINGS.double.slice(0, -1) : '';
  return groupName(`${stem(group.length)}${unsaturation}${FREE_VALENCE_SUFFIXES[1]}`);
} // End of function templateGroupWord()

/**
 * The plural of a group's name as the messages say it: `metilos`; `grupos
 * metoxi` for an alkoxy group (R-5b), whose prefix stays as it is.
 *
 * @param {string} word - templateGroupWord() of a template.
 * @returns {string} The plural.
 */
export function groupPlural(word) {
  const lead = `${GROUP_WORD} `;
  return word.startsWith(lead) ? `${GROUP_WORD}s ${word.slice(lead.length)}` : `${word}s`;
}

/**
 * The text of a template tile: its TRADITIONAL_NAMES name (or, for a diol of
 * R-5a3a, its BENZENE_DIGROUP_NAMES word, keyed by the template's own key),
 * without the locants or letter the student writes on tiles of their own
 * (`1,2-xileno` → `xileno`, `o-cresol` → `cresol`).
 *
 * @param {string} value - A TEMPLATES key.
 * @returns {string} The word.
 */
function templateWord(value) {
  const template = TEMPLATES[value];
  const name = template.id ? TRADITIONAL_NAMES[template.id] : BENZENE_DIGROUP_NAMES[value];
  return template.positions ? name : name.slice(name.indexOf('-') + 1);
}

/**
 * Creates one frozen tile.
 *
 * @param {string} id - Language-neutral id.
 * @param {string} kind - Tile kind (see the file header).
 * @param {number|string|null} value - The tile's meaning.
 * @param {string} row - Dialog row id.
 * @param {string} text - The Spanish text, from the lexicon.
 * @param {boolean} [more] - Behind the row's «más» button (default false).
 * @param {object} [extra] - Extra fields (`italic` for a retained branch).
 * @returns {Readonly<object>} The tile.
 */
function makeTile(id, kind, value, row, text, more = false, extra = {}) {
  return Object.freeze({ id, kind, value, row, text, more, ...extra });
}

/**
 * Builds the whole catalogue in dialog order: numbers, multipliers (simple,
 * then compound), roots, endings, branch words and controls, rings (`ciclo`,
 * `benceno`, `fenol`, `benzaldehído`, `fenil`, the letters `o`, `m`, `p`,
 * `1(n)`), groups (the halogens `fluoro`, `cloro`, `bromo`, `yodo`, then
 * `hidroxi`, `ol`, `oxi`, `éter`, `oxo`, `formil`, `al`, `ona` and
 * `carbaldehído`), traditional names (`tolueno`, `estireno`, `xileno`, `mesitileno`,
 * `anisol`, then the retained phenols `cresol`, `pirocatecol`, `catecol`,
 * `resorcinol`, `hidroquinona`).
 *
 * @returns {Readonly<object>[]} The tiles.
 */
function buildCatalogue() {
  const tiles = [];
  for (let n = 1; n <= MAX_NUM; n += 1) {
    tiles.push(makeTile(`num-${n}`, 'num', n, 'numbers', String(n), n > NUM_VISIBLE));
  }
  for (let n = 2; n <= MAX_MULT; n += 1) {
    tiles.push(makeTile(`mult-${n}`, 'mult', n, 'multipliers', multiplier(n), n > MULT_VISIBLE));
  }
  for (let n = 2; n <= MAX_MULT; n += 1) {
    tiles.push(makeTile(`cmult-${n}`, 'cmult', n, 'multipliers', compoundMultiplier(n), n > MULT_VISIBLE));
  }
  for (let n = 1; n <= MAX_STEM; n += 1) {
    tiles.push(makeTile(`root-${n}`, 'root', n, 'roots', stem(n), n > ROOT_VISIBLE));
  }
  for (const key of ['saturated', 'double', 'triple']) {
    tiles.push(makeTile(`ending-${key}`, 'ending', key, 'endings', ENDINGS[key]));
  }
  for (const order of [1, 2]) {
    tiles.push(makeTile(`fv-${order}`, 'freeValence', order, 'branches', FREE_VALENCE_SUFFIXES[order]));
  }
  for (const id of RETAINED_IDS) {
    const { italic, text } = RETAINED_PREFIXES[id];
    tiles.push(makeTile(`retained-${id}`, 'retained', id, 'branches', `${italic}${text}`, false, { italic }));
  }
  const [open, close] = ENCLOSING_MARKS[0];
  tiles.push(makeTile(START_ID, 'start', null, 'branches', open));
  tiles.push(makeTile(END_ID, 'end', null, 'branches', close));
  tiles.push(makeTile(RING_ID, 'ring', 'cyclo', 'rings', RING_PREFIX));
  tiles.push(makeTile(BENZENE_ID, 'benzene', 'benzene', 'rings', BENZENE_NAME));
  tiles.push(makeTile(PHENOL_ID, 'benzene', 'phenol', 'rings', `${PHENOL_STEM}${GROUP_SUFFIXES.alcohol}`)); // `fenol` (R-5a2)
  const benzaldehyde = BENZENE_GROUP_NAMES.aldehyde;
  tiles.push(makeTile(BENZALDEHYDE_ID, 'benzene', 'benzaldehyde', 'rings', `${benzaldehyde.stem}${benzaldehyde.ending}`)); // R-5c1
  const phenyl = RETAINED_PREFIXES.phenyl;
  tiles.push(makeTile(PHENYL_ID, 'retained', 'phenyl', 'rings', `${phenyl.italic}${phenyl.text}`, false, { italic: phenyl.italic }));
  for (const [locant, id] of Object.entries(POSITIONAL_IDS)) {
    tiles.push(makeTile(id, 'positional', Number(locant), 'rings', POSITIONAL_LETTERS[locant]));
  }
  tiles.push(makeTile(CLOSING_ID, 'closing', null, 'rings', closingText('n'))); // `1(n)` (R-5a2)
  for (const [element, id] of Object.entries(HALOGEN_IDS)) {
    tiles.push(makeTile(id, 'halogen', element, 'groups', HALOGEN_PREFIXES[element]));
  }
  tiles.push(makeTile(HYDROXY_ID, 'hydroxy', 'alcohol', 'groups', GROUP_PREFIXES.alcohol)); // `hidroxi` (R-5a2)
  tiles.push(makeTile(OL_ID, 'suffix', 'alcohol', 'groups', GROUP_SUFFIXES.alcohol)); // `ol` (R-5a2)
  tiles.push(makeTile(ALKOXY_ID, 'alkoxy', 'ether', 'groups', ALKOXY_ENDING)); // `oxi` (R-5b)
  tiles.push(makeTile(ETHER_CLASS_ID, 'classWord', 'ether', 'groups', ETHER_CLASS_WORD)); // `éter` (R-5b2)
  tiles.push(makeTile(OXO_ID, 'carbonyl', 'ketone', 'groups', GROUP_PREFIXES.ketone)); // `oxo` (R-5c1)
  tiles.push(makeTile(FORMYL_ID, 'retained', 'formyl', 'groups', FORMYL_PREFIX, false, { italic: '' })); // `formil` (R-5c1)
  tiles.push(makeTile(AL_ID, 'suffix', 'aldehyde', 'groups', GROUP_SUFFIXES.aldehyde)); // `al` (R-5c1)
  tiles.push(makeTile(ONA_ID, 'suffix', 'ketone', 'groups', GROUP_SUFFIXES.ketone)); // `ona` (R-5c1)
  tiles.push(makeTile(CARBALDEHYDE_ID, 'suffix', 'carbaldehyde', 'groups', RING_GROUP_SUFFIXES.aldehyde)); // R-5c1
  for (const value of Object.keys(TEMPLATES)) {
    tiles.push(makeTile(`template-${value}`, 'template', value, 'traditional', templateWord(value)));
  }
  return tiles;
} // End of function buildCatalogue()

/** Every tile, in dialog order. */
export const TILES = Object.freeze(buildCatalogue());

/** The tiles keyed by id. */
const BY_ID = new Map(TILES.map((tile) => [tile.id, tile]));

/**
 * A parent's word with its Spanish definite article, after a preposition
 * when one is given, as the messages quote it: «del tolueno», «en el
 * fenol», and for a feminine template (TEMPLATES `feminine`, R-5a3a) «de la
 * hidroquinona», «en la hidroquinona» (`de` + `el` contract to `del`).
 *
 * @param {string} word - A whole-word parent as on its tile (`tolueno`, `fenol`, `hidroquinona`).
 * @param {string} [preposition] - `de`, `en`… (default none).
 * @returns {string} The phrase.
 */
export function withArticle(word, preposition = '') {
  const template = TILES.find((tile) => tile.kind === 'template' && tile.text === word);
  const article = template && TEMPLATES[template.value].feminine ? 'la' : 'el';
  if (preposition === 'de' && article === 'el') {
    return `del ${word}`;
  }
  return preposition ? `${preposition} ${article} ${word}` : `${article} ${word}`;
} // End of function withArticle()

/**
 * Returns the tile with an id.
 *
 * @param {string} id - A tile id.
 * @returns {Readonly<object>} The tile.
 * @throws {Error} For an unknown id.
 */
export function tileById(id) {
  const tile = BY_ID.get(id);
  if (!tile) {
    throw new Error(`tileById: unknown tile ${id}`);
  }
  return tile;
}

/**
 * Returns the id of the tile of a kind with a value: `tileId('root', 4)` →
 * 'root-4', `tileId('ending', 'double')` → 'ending-double', `tileId('start')`.
 *
 * @param {string} kind - Tile kind.
 * @param {number|string|null} [value] - Tile value (none for 'start' / 'end').
 * @returns {string} The id.
 * @throws {Error} When no tile has that kind and value.
 */
export function tileId(kind, value = null) {
  const tile = TILES.find((t) => t.kind === kind && t.value === value);
  if (!tile) {
    throw new Error(`tileId: no ${kind} tile with value ${value}`);
  }
  return tile.id;
}

/**
 * Turns a tile sequence given as ids or tiles into tiles.
 *
 * @param {(string|object)[]} sequence - Tile ids or catalogue tiles.
 * @returns {Readonly<object>[]} The tiles.
 * @throws {Error} For an unknown id.
 */
export function toTiles(sequence) {
  return sequence.map((item) => (typeof item === 'string' ? tileById(item) : tileById(item.id)));
}
