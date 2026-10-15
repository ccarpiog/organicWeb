/**
 * @file Tokenizer of «¿Cómo se dibuja?» (design.md §15.4; phases R-1a,
 * R-4a, R-4b, R-4c, R-5a1, R-5a2, R-5b, R-5b2, R-5c1, R-5c2, R-5d1, R-5d2, R-6a1, R-6a2a, R-6a2b, R-6b1, R-6b2, R-6c1, R-6c2, R-6c3): the inverse of the assembler, `tokenize(text) → tile
 * ids | null`, for the tests and the diagnosis (R-3). Pure, no DOM.
 *
 * A bounded depth-first search over the tiles' surface forms (each tile's
 * text, and the elided `an` / `en` / `in` of the endings), skipping the
 * automatic text of design.md §15.5.2: hyphens and commas, the connecting
 * `a`, and the marks of an enclosed simple branch. An opening mark is
 * either automatic or the START control, and its closing mark must be the
 * same choice. A sequence is kept only if it parses without errors and its
 * assembly gives the text back exactly, so every answer is checked by the
 * assembler itself; the first such sequence is returned.
 *
 * Preferences (tried first): longer surface forms (`tridec` before `tri`,
 * `iliden` before `il`), automatic marks before START / END (the controls
 * only for compound branches). The `an` of `propan-2-il` is always read as
 * the `ano` tile: the automatic `an` (assemble.js rule 4) gives the same
 * text, so a reading with it exists only when one with the tile does.
 *
 * Sound pruning, so that a dead end is seen at once instead of at the end
 * of the text: a kind-adjacency table of the grammar (design.md §15.5.1);
 * the punctuation skipped between two pieces must be exactly what the
 * assembler writes there (assemble.js separator()); an automatic enclosure
 * holds exactly one simple chain or ring (its stem first — `ciclo` or a
 * root —, its closing mark right after `il` / `iliden`, nothing nested), or
 * the one word `fenil` (a crowded ring prefix, `metil(fenil)metano`, R-4b).
 * `benceno` (R-4b) ends a name, right after its prefixes or at the start;
 * so does a retained template (R-4c: `tolueno`, `estireno`, `xileno`,
 * `mesitileno`; R-5c3a: `acetona`, `ftalaldehído`…), also right after
 * locants (`1,2-xileno`) or a letter; `fenilacetaldehído` (R-5c3a) reads as
 * its one tile, the longer surface form, never as `fenil` + `acetaldehído`. An
 * orto/meta/para letter (R-4c) only starts a name (`o-xileno`,
 * `o-dimetilbenceno`, `p-metiltolueno`): parse.js accepts it nowhere else,
 * and the hyphen the assembler writes after it prunes every other reading
 * of a leading `o`, `m` or `p` at once. A halogen (R-5a1: `fluoro`, `cloro`,
 * `bromo`, `yodo`) stands wherever a retained branch word may, and is never
 * enclosed by itself; so does `hidroxi` (R-5a2), and `oxo` (R-5c1). The alcohol suffix (R-5a2)
 * ends a name after the parent's ending (`an` / `en` / `in` or the whole
 * one, `benceno` or its elided `bencen`), its locants or its multiplier —
 * also the multiplier without its final `a` (`tetr` + `ol`, rule 4); `fenol`
 * ends a name like `benceno`. The suffixes `al`, `ona` and `carbaldehído`
 * (R-5c1) are read where `ol` is (`butanal`, `pentano-2,4-diona`,
 * `ciclohexanocarbaldehído`), `benzaldehído` where `fenol` is, and `formil`
 * where a retained branch word is. The closing-bond locant `1(6)` (R-5a2) is read
 * wherever a ring's bond locant may stand, as the `1(n)` tile (the assembler
 * checks the ring size). The alkoxy ending `oxi` (R-5b) is read after `il`
 * (`pentiloxi`, `propan-2-iloxi`), and, contracted (assemble.js rule 6),
 * right after a root as the `il` tile that writes nothing and the `oxi` tile
 * (`met` + `oxi`: one surface, two tiles) or after a retained word without
 * its `il` (`isoprop`, `tert-but`, `fen` + `oxi`, read only before `oxi`);
 * an automatic enclosure may hold `il` + `oxi` (`(pentiloxi)`) or a whole
 * contracted alkoxy prefix of a crowded level (`cloro(metoxi)metano`,
 * `(fenoxi)`). An ether's functional-class name (R-5b2: `etil metil éter`,
 * `dietil éter`, `butil tert-butil éter`) is read through its automatic
 * spaces (assemble.js rule 7): a space only after a complete group — `il`,
 * a retained word or `fenil`, a closed enclosure — outside every enclosing
 * mark, and after a space another group or the class word `éter`, which ends
 * the name. The acyl endings (R-5c2) end a branch where `il` does: `oil`
 * after a chain's elided ending (`propan` + `oil`, `but-2-en` + `oil`) and
 * `carbonil` after a ring's whole ending or its locant (`ciclohexano` +
 * `carbonil`, `ciclohex-2-eno-1-carbonil`), an automatic enclosure closing
 * right after either (`(but-2-enoil)`, `(ciclohexanocarbonil)`); `acetil` and
 * `benzoil` stand where a retained branch word does. An acid's name (R-5d1:
 * `ácido 2-metilpropanoico`) starts with the class word `ácido`, read only
 * at the start of the text and followed by exactly its automatic space
 * (assemble.js rule 9), after which the rest of the name reads as from the
 * start; `oico` and `carboxílico` are read where `ol` is, `benzoico` where
 * `fenol` is, `carboxi` where a retained branch word is, and the retained
 * acid names (R-5d2: `ácido acético`, `ácido 4-metilftálico`) as the other
 * templates, `fenilacético` as its one tile like `fenilacetaldehído`. An
 * ester's name (R-6a1: `etanoato de metilo`, `propanodioato de etilo y
 * metilo`) reads `oato` and `carboxilato` where `ol` is (class EST) and
 * `benzoato` where `fenol` is (PHEST), followed by exactly the automatic ` de
 * ` (assemble.js rule 10), then the O-bound groups: each ends in `ilo`
 * (class ILO), right after a root, an elided ending or a locant (`metilo`,
 * `etenilo`, `propan-2-ilo`) or after a retained word without its `il`
 * (`isoprop` + `ilo`, `fen` + `ilo`), an automatic enclosure closing right
 * after it (`di(propan-2-ilo)`), a compound branch's END too (`bis(2-cloroetilo)`,
 * which may end the name); the automatic ` y ` only after a complete group,
 * outside every mark. The retained ester names (R-6a2a: `formiato`,
 * `acetato`, `fenilacetato`; class TPLEST) stand where a template does and,
 * like `benzoato`, take exactly the automatic ` de ` after them (`acetato de
 * etilo`, `2-(4-metilfenil)acetato de etilo`); `fenilacetato` reads as its
 * one tile, the longer surface form. The ester prefixes (R-6a2b, assemble.js
 * rule 11) read `oxi` after an acyl ending or word (`(propanoiloxi)`,
 * `(acetiloxi)`: OIL, CARB and RET take OXI, an automatic enclosure may start
 * with RET and hold it with its `oxi`) and `carbonil` after `oxi` (class
 * ALKCARB, a second surface of the `carbonil` tile: `(metoxicarbonil)`); the
 * inner part of an ester prefix with marks of its own is a mark of its own
 * (`inner`), opened right inside an automatic opening mark
 * (`[(prop-2-enoil)oxi]`, `[(propan-2-iloxi)carbonil]`) or right after a START
 * control, then read like that compound branch's content (`compound`:
 * `[(2-metilpropanoil)oxi]`, `{[2-(acetiloxi)etanoil]oxi}`), and closed only
 * after an acyl part (then `oxi` must follow: INNER_ACYL) or an alkoxy part's
 * `oxi` (then `carbonil`: INNER_ALK). The nitriles (R-6b1) need no class of
 * their own: `nitrilo` and `carbonitrilo` are read where `ol` is (OL:
 * `butanonitrilo`, `ciclohexanocarbonitrilo`), `benzonitrilo` where `fenol` is
 * (PHOL) and `ciano` where a retained branch word is (RET: `(cianometil)`,
 * `cianometilo`); the retained nitrile names (R-6b2: `acetonitrilo`,
 * `ftalonitrilo`) are templates (TPL), `fenilacetonitrilo` read as its one
 * tile, the longer surface form. The amines (R-6c1) need none either: `amina`
 * is read where `ol` is (OL, with the elisions before its vowel:
 * `etanamina`, `bencen-1-amina`, `butano-1,2,3,4-tetramina`), and the locant
 * `N` where a number is (NUM: `N,2-dimetil…`; parse() keeps it to an amine's
 * prefixes). The amino prefixes (R-6c2) need none either: `amino` is read
 * where a retained branch word is (RET: `2-aminoetan-1-ol`, `diamino`,
 * `(aminometil)`), and as a compound branch's own chain it closes the groups
 * on its nitrogen, read inside the START / END controls as any prefixes,
 * every one after the first in an automatic enclosure (`(dimetilamino)`,
 * `[etil(metil)amino]`, `[(2-cloroetil)amino]`). The retained amine names
 * (R-6c3: `anilina`, `bencilamina`) are templates (TPL), after `N` locants
 * too (`N,N-dimetilanilina`), and an orto/meta/para letter may stand on a
 * later prefix as well (`N-etil-p-metilanilina`: POS after a complete
 * prefix); an amine's class name (R-6c3: `metilamina`, `etildimetilamina`,
 * `di-tert-butilamina`, `butiltert-butilamina`) reads its `amina` as class
 * AMCLASS right after a complete group — `il`, a retained word or `fenil`,
 * a closed enclosure —, one word with no space, which ends the name. A step
 * budget bounds the search: running out returns null, never a guess.
 */

import { CONNECTING_VOWEL, ENCLOSING_MARKS, FREE_VALENCE_SUFFIXES, ESTER_LINK, ESTER_ALKYL_JOIN } from '../naming/lexicon.es.js';
import {
  TILES, START_ID, END_ID, CLOSING_ID, ALKOXY_RETAINED, GROUP_WORD_PARENTS, tileId, isEsterSuffix, isEsterTemplate, isAmineClassWord,
} from './tiles.js';
import { parse } from './parse.js';
import { assemble, separator } from './assemble.js';

/** Default bound on the search steps of one tokenize() call. */
export const TOKENIZE_BUDGET = 20000;

/**
 * Longest text tokenize() reads. Every search step consumes at least one
 * character, so this also bounds the recursion depth (a longer text, such as
 * thousands of nested brackets, would exhaust the stack). Real names are far
 * shorter.
 */
export const TOKENIZE_MAX_LENGTH = 1000;

/** Characters of the automatic punctuation between pieces. */
const PUNCTUATION = ',-';

/**
 * Grammar class of a tile for the adjacency table: NUM, MULT, CMULT, ROOT,
 * ANO (`ano`), ENE (`eno` / `ino`), FV (`il` / `iliden`), RET (a retained
 * branch word), PHE (`fenil`, R-4b), BEN (`benceno`, R-4b), TPL (a retained
 * template, R-4c), POS (an orto/meta/para letter, R-4c), HAL (a one-atom
 * group: a halogen, R-5a1; `hidroxi`, R-5a2; `oxo`, R-5c1), OL (a suffix:
 * `ol`, R-5a2; `al`, `ona`, `carbaldehído`, R-5c1), PHOL (a whole-word
 * parent that places its group: `fenol`, R-5a2; `benzaldehído`, R-5c1), CLO
 * (the closing-bond locant `1(n)`, R-5a2), OXI
 * (the alkoxy ending `oxi` after `il` or a retained word, R-5b), START,
 * END, RING (`ciclo`). A is the automatic connecting vowel, AUTO_OPEN an
 * automatic opening mark; MULTE a multiplier without its final `a`, only
 * before `ol`, and BENE `benceno` without its `o`, only before `ol` or its
 * locants (rule 4: `tetrol`, `bencenol`, `bencen-1-ol`); for the alkoxy
 * contraction (R-5b, assemble.js rule 6) OXIC the `oxi` right after a root
 * (with the silent `il` tile before it: `metoxi`), RETX a retained word and
 * PHEX `fenil` without their `il`, only before `oxi` (`isopropoxi`,
 * `fenoxi`); for the class names (R-5b2) ETHER the class word `éter` and
 * SPACE the automatic space between their words; for the acyl prefixes
 * (R-5c2) OIL the ending `oil` and CARB the ending `carbonil`; for the acids
 * (R-5d1) ACID the class word `ácido` and ACIDSPACE the automatic space
 * after it; for the esters (R-6a1) EST the suffixes `oato` and
 * `carboxilato`, PHEST `benzoato`, ILO the ending `ilo` of an O-bound group,
 * DE the automatic ` de ` and Y the automatic ` y ` (RETX and PHEX also
 * before `ilo`: `isopropilo`, `fenilo`); for the retained ester names
 * (R-6a2a) TPLEST, a template whose word is an ester's acid part; for the
 * ester prefixes (R-6a2b) ALKCARB the `carbonil` after `oxi`, and INNER_ACYL /
 * INNER_ALK the closing mark of an ester prefix's inner part (innerClass()); for an amine's class name (R-6c3) AMCLASS, a
 * second surface of the `amina` tile right after the groups (`metilamina`).
 *
 * @param {object} tile - A catalogue tile.
 * @returns {string} The class.
 */
function tileClass(tile) {
  if (tile.kind === 'ending') {
    return tile.value === 'saturated' ? 'ANO' : 'ENE';
  }
  if (tile.kind === 'retained' && tile.value === 'phenyl') {
    return 'PHE';
  }
  if (tile.kind === 'benzene' && GROUP_WORD_PARENTS[tile.value]) {
    return isEsterSuffix(GROUP_WORD_PARENTS[tile.value].suffix) ? 'PHEST' : 'PHOL'; // `fenol` (R-5a2), `benzaldehído`; `benzoato` (R-6a1)
  }
  if (tile.kind === 'suffix' && isEsterSuffix(tile.value)) {
    return 'EST'; // `oato`, `carboxilato` (R-6a1): ` de ` follows
  }
  if (tile.kind === 'template' && isEsterTemplate(tile.value)) {
    return 'TPLEST'; // `formiato`, `acetato`, `fenilacetato` (R-6a2a): ` de ` follows
  }
  if (tile.kind === 'acyl') {
    return tile.value === 'ring' ? 'CARB' : 'OIL'; // `carbonil`, `oil` (R-5c2); `carbonil` after `oxi` is ALKCARB (R-6a2b)
  }
  const classes = {
    num: 'NUM', mult: 'MULT', cmult: 'CMULT', root: 'ROOT', freeValence: 'FV', retained: 'RET', start: 'START', end: 'END',
    ring: 'RING', benzene: 'BEN', template: 'TPL', positional: 'POS', halogen: 'HAL', hydroxy: 'HAL', carbonyl: 'HAL', suffix: 'OL',
    closing: 'CLO', alkoxy: 'OXI', classWord: 'ETHER', suffixClass: 'ACID', esterAlkyl: 'ILO',
    nitrogen: 'NUM', // The locant `N` (R-6c1), read wherever a number is; parse() keeps it to an amine's prefixes.
  };
  return classes[tile.kind];
} // End of function tileClass()

/** The automatic words of an ester's name (assemble.js rule 10, R-6a1): ` de ` after the acid part, ` y ` between groups. */
const ESTER_WORDS = Object.freeze({ link: ESTER_LINK, join: ESTER_ALKYL_JOIN });

/** The automatic space between the words of a class name (assemble.js rule 7, R-5b2). */
const SPACE = ' ';

/** Classes after which a class name's space may come: a complete group (its `il`, a retained word, `fenil`, END). */
const BEFORE_SPACE = new Set(['FV', 'RET', 'PHE', 'END']);

/** Classes that may begin a name, a prefix or a compound branch (RETX, PHEX: a retained word before `oxi`, R-5b). */
const PREFIX_STARTS = ['NUM', 'MULT', 'CMULT', 'ROOT', 'RING', 'RET', 'PHE', 'HAL', 'START', 'RETX', 'PHEX'];

/**
 * Classes that may follow a complete prefix: another prefix, the end of its compound branch, `benceno`, `fenol` or a template;
 * R-6c3: an orto/meta/para letter on the next prefix (`N-etil-p-metilanilina`: a group written `N` takes no ring position).
 */
const AFTER_PREFIX = [...PREFIX_STARTS, 'END', 'BEN', 'BENE', 'PHOL', 'PHEST', 'TPL', 'TPLEST', 'POS'];

/**
 * The classes that may follow each class in a valid name (design.md
 * §15.5.1); BEGIN is the start of the text. An automatic closing mark does
 * not change the class. `ciclo` stands wherever a root may start a stem, and
 * only a root follows it; `fenil` and a one-atom group wherever a retained
 * word may stand; `benceno` at the start, after a complete prefix or after
 * old-style locants, and only its suffix after it; `fenol` and a template
 * there too (a template also after locants or a letter), and nothing after
 * them; a letter at the start only, before a prefix or a template; the
 * suffix `ol` after the parent's ending, its locants or its multiplier, and
 * nothing after it; `1(n)` wherever a bond locant of a ring may stand; `oxi`
 * (R-5b) after `il`, after a retained word without its `il`, or contracted
 * right after a root, and a prefix's followers after it; `oil` (R-5c2) after
 * an ending, `carbonil` after an ending or a locant, a prefix's followers
 * after them; `ácido` (R-5d1) at the start only, and its space after it;
 * R-6a2b: `oxi` after an acyl ending or word too, `carbonil` (ALKCARB) after
 * `oxi`.
 */
const FOLLOW = Object.freeze({
  BEGIN: new Set([...PREFIX_STARTS, 'BEN', 'BENE', 'PHOL', 'PHEST', 'TPL', 'TPLEST', 'POS', 'ACID']),
  // R-5d1: `ácido`, then only its space (search()); after the space, the rest of the name as from the start.
  ACID: new Set(),
  ACIDSPACE: new Set([...PREFIX_STARTS, 'BEN', 'BENE', 'PHOL', 'TPL', 'POS']),
  AUTO_OPEN: new Set(['ROOT', 'RING', 'PHE', 'RETX', 'PHEX', 'RET']), // RET: `(acetiloxi)` (R-6a2b)
  NUM: new Set([...PREFIX_STARTS, 'ENE', 'FV', 'TPL', 'TPLEST', 'BEN', 'BENE', 'CLO', 'MULTE', 'OL', 'EST', 'CARB', 'ILO']),
  CLO: new Set(['NUM', 'CLO', 'MULT', 'ENE']),
  POS: new Set(['MULT', 'CMULT', 'ROOT', 'RING', 'RET', 'PHE', 'HAL', 'START', 'TPL', 'RETX', 'PHEX']),
  MULT: new Set(['ROOT', 'RING', 'RET', 'PHE', 'HAL', 'START', 'ENE', 'OL', 'EST', 'RETX', 'PHEX']),
  MULTE: new Set(['OL', 'EST']),
  CMULT: new Set(['ROOT', 'RING', 'RET', 'PHE', 'HAL', 'START', 'RETX', 'PHEX']),
  RING: new Set(['ROOT']),
  ROOT: new Set(['ANO', 'NUM', 'CLO', 'MULT', 'ENE', 'FV', 'A', 'OXIC', 'ILO']),
  A: new Set(['NUM', 'CLO', 'MULT']),
  ANO: new Set(['NUM', 'MULT', 'MULTE', 'OL', 'EST', 'OIL', 'CARB']),
  ENE: new Set(['NUM', 'CLO', 'MULT', 'MULTE', 'ENE', 'FV', 'OL', 'EST', 'OIL', 'CARB', 'ILO']),
  FV: new Set([...AFTER_PREFIX, 'OXI', 'AMCLASS']), // R-6c3: `metil` + `amina`, a class name
  RET: new Set([...AFTER_PREFIX, 'OXI', 'AMCLASS']), // `acetil` + `oxi` (R-6a2b); `isopropil` + `amina` (R-6c3)
  PHE: new Set([...AFTER_PREFIX, 'AMCLASS']),
  RETX: new Set(['OXI', 'ILO']), // `isoprop` + `oxi` (R-5b), + `ilo` (R-6a1)
  PHEX: new Set(['OXI', 'ILO']),
  OXI: new Set([...AFTER_PREFIX, 'ALKCARB']), // `oxi` + `carbonil` (R-6a2b)
  OXIC: new Set([...AFTER_PREFIX, 'ALKCARB']),
  OIL: new Set([...AFTER_PREFIX, 'OXI']), // R-5c2; `oil` + `oxi` (R-6a2b)
  CARB: new Set([...AFTER_PREFIX, 'OXI']),
  // R-6a2b: `carbonil` after `oxi`, an alkoxycarbonyl prefix; after the inner part of an ester prefix, `oxi` or `carbonil` only.
  ALKCARB: new Set(AFTER_PREFIX),
  INNER_ACYL: new Set(['OXI']),
  INNER_ALK: new Set(['ALKCARB']),
  HAL: new Set(AFTER_PREFIX),
  START: new Set(PREFIX_STARTS),
  END: new Set([...AFTER_PREFIX, 'AMCLASS']), // `(2-cloroetil)` + `amina` (R-6c3)
  BEN: new Set(['NUM', 'MULT', 'MULTE', 'OL', 'EST']),
  BENE: new Set(['NUM', 'OL']),
  OL: new Set(),
  PHOL: new Set(),
  TPL: new Set(),
  // R-5b2: after a class name's space, another group (its multiplier first) or `éter`, which ends the name.
  SPACE: new Set(['MULT', 'CMULT', 'ROOT', 'RING', 'RET', 'PHE', 'START', 'ETHER']),
  ETHER: new Set(),
  // R-6c3: the `amina` of an amine's class name, right after its groups (one word, no space), ends the name.
  AMCLASS: new Set(),
  // R-6a1: after an ester suffix or `benzoato`, only ` de ` (search()); after ` de ` or ` y `, an O-bound group (its
  // multiplier or its bare prefixes first); after `ilo`, the END of its compound branch, ` y ` or the end of the name.
  // R-6a2a: after a retained ester word too, only ` de `.
  EST: new Set(),
  PHEST: new Set(),
  TPLEST: new Set(),
  DE: new Set(PREFIX_STARTS),
  Y: new Set(PREFIX_STARTS),
  ILO: new Set(['END']),
});

/**
 * Classes a valid name may end with (the parent's ending, `benceno`, `fenol`, a template, the suffix `ol` or `éter`; R-6a1: an
 * ester's last O-bound group, `ilo`; R-6c3: the `amina` of an amine's class name).
 */
const FINAL = new Set(['ANO', 'ENE', 'BEN', 'PHOL', 'TPL', 'OL', 'ETHER', 'ILO', 'AMCLASS']);

/**
 * Classes after which an automatic enclosure closes: a chain's `il` / `iliden`, `fenil`, an alkoxy prefix's `oxi` (R-5b), or
 * an acyl ending (R-5c2: `(but-2-enoil)`, `(ciclohexanocarbonil)`), or an alkoxycarbonyl prefix's `carbonil` (R-6a2b).
 */
const AUTO_CLOSE = new Set(['FV', 'PHE', 'OXI', 'OXIC', 'OIL', 'CARB', 'ILO', 'ALKCARB']);

/**
 * What may follow a class inside an automatic enclosure before it closes:
 * `oxi` after `il` (R-5b: `(pentiloxi)`); and for the ester prefixes
 * (R-6a2b) `oxi` after an acyl ending or word (`(propanoiloxi)`,
 * `(acetiloxi)`) and `carbonil` after `oxi` (`(metoxicarbonil)`). Nothing
 * else: the enclosure holds one simple branch.
 */
const IN_ENCLOSURE = Object.freeze({
  FV: new Set(['OXI']),
  OIL: new Set(['OXI']),
  CARB: new Set(['OXI']),
  RET: new Set(['OXI']),
  OXI: new Set(['ALKCARB']),
  OXIC: new Set(['ALKCARB']),
});

/**
 * The class after the closing mark of an ester prefix's inner part (R-6a2b,
 * assemble.js rule 11), by the class before it: an acyl part (`oil`,
 * `carbonil`, `benzoil` in a compound branch) takes `oxi` next, an alkoxy
 * part (`oxi`) takes `carbonil`; null when no inner part ends there.
 *
 * @param {string} prev - The class before the closing mark.
 * @returns {string|null} 'INNER_ACYL', 'INNER_ALK' or null.
 */
function innerClass(prev) {
  if (prev === 'OXI' || prev === 'OXIC') {
    return 'INNER_ALK';
  }
  return prev === 'OIL' || prev === 'CARB' || prev === 'RET' ? 'INNER_ACYL' : null;
}

/** Punctuation roles of the pieces (assemble.js separator()). */
const WORD = Object.freeze({ role: 'word' });
const OPEN = Object.freeze({ role: 'open' });
/** An opening mark right before an italic descriptor: rule 5's hyphen after a multiplier (assemble.js, R-6a2b: `bis-(tert-…`). */
const OPEN_ITALIC = Object.freeze({ role: 'open', italic: true });
const CLOSE = Object.freeze({ role: 'close' });
const LOCANT = Object.freeze({ role: 'locant' });
const SPACE_ROLE = Object.freeze({ role: 'space' });

/**
 * The punctuation role of a tile's piece, as the assembler gives it.
 *
 * @param {object} tile - A catalogue tile.
 * @returns {{role: string, italic?: boolean}} The role.
 */
function pieceRole(tile) {
  if (tile.kind === 'num' || tile.kind === 'positional' || tile.kind === 'closing' || tile.kind === 'nitrogen') {
    return LOCANT; // `N` (R-6c1) too
  }
  if (tile.kind === 'mult' || tile.kind === 'cmult') {
    return Object.freeze({ role: 'mult' });
  }
  return tile.italic ? Object.freeze({ role: 'word', italic: true }) : WORD;
}

/**
 * Builds the surface forms of the tiles (START / END excepted: they are
 * read from the enclosing marks; and `1(n)`, read with its ring size by
 * search()), longest first: each tile's text, the elided endings `an`,
 * `en`, `in` (rules 3 and 4), before `ol` (R-5a2, rule 4) the
 * multipliers without their final `a` (`tetr`, class MULTE) and `bencen`
 * (class BENE), and for the alkoxy contraction (R-5b, rule 6) the retained
 * words without their `il` (`isoprop`, `tert-but`: class RETX; `fen`: PHEX)
 * and `oxi` read as two tiles, the silent `il` and `oxi` (class OXIC). Each
 * surface gives the tile ids it stands for (one, or two for OXIC).
 *
 * @returns {{text: string, ids: string[], cls: string, piece: object}[]} The surface forms.
 */
function buildSurfaces() {
  const surfaces = [];
  const il = FREE_VALENCE_SUFFIXES[1];
  for (const tile of TILES) {
    const cls = tileClass(tile);
    if (cls === 'START' || cls === 'END' || cls === 'CLO') {
      continue;
    }
    const piece = pieceRole(tile);
    const ids = [tile.id];
    surfaces.push({ text: tile.text, ids, cls, piece });
    if (tile.kind === 'ending') {
      surfaces.push({ text: tile.text.slice(0, -1), ids, cls, piece }); // `an`, `en`, `in` (rules 3 and 4)
    } else if (cls === 'MULT' && tile.text.endsWith('a')) {
      surfaces.push({ text: tile.text.slice(0, -1), ids, cls: 'MULTE', piece }); // `tetr` + `ol` (R-5a2)
    } else if (cls === 'BEN') {
      surfaces.push({ text: tile.text.slice(0, -1), ids, cls: 'BENE', piece }); // `bencen` + `ol` (R-5a2)
    } else if (tile.kind === 'retained' && ALKOXY_RETAINED.includes(tile.value)) {
      // `isoprop` / `tert-but` / `fen` + `oxi` (R-5b, rule 6).
      surfaces.push({ text: tile.text.slice(0, -il.length), ids, cls: cls === 'PHE' ? 'PHEX' : 'RETX', piece });
    } else if (cls === 'OXI') {
      surfaces.push({ text: tile.text, ids: [tileId('freeValence', 1), tile.id], cls: 'OXIC', piece }); // `met` + `oxi` (R-5b)
    } else if (cls === 'CARB') {
      surfaces.push({ text: tile.text, ids, cls: 'ALKCARB', piece }); // `carbonil` after `oxi`: `metoxicarbonil` (R-6a2b)
    } else if (isAmineClassWord(tile)) {
      surfaces.push({ text: tile.text, ids, cls: 'AMCLASS', piece }); // `amina` after the groups: `metilamina` (R-6c3)
    }
  } // End of the loop over the tiles
  return surfaces.map((surface, i) => ({ surface, i }))
    .sort((a, b) => b.surface.text.length - a.surface.text.length || a.i - b.i)
    .map(({ surface }) => surface);
} // End of function buildSurfaces()

/** Surface forms, longest first. */
const SURFACES = Object.freeze(buildSurfaces());

/** Opening and closing characters of the enclosing marks, by level. */
const OPENERS = ENCLOSING_MARKS.map(([open]) => open);
const CLOSERS = ENCLOSING_MARKS.map(([, close]) => close);

/**
 * The length of a closing-bond locant (R-5a2: `1(6)`, `1(12)`) starting at
 * a position of a text, or 0 when there is none.
 *
 * @param {string} text - The text.
 * @param {number} at - The position.
 * @returns {number} The locant's length in characters, or 0.
 */
function closingAt(text, at) {
  const lead = `1${OPENERS[0]}`;
  if (!text.startsWith(lead, at)) {
    return 0;
  }
  let end = at + lead.length;
  while (end < text.length && text[end] >= '0' && text[end] <= '9') {
    end += 1;
  }
  return end > at + lead.length && text[end] === CLOSERS[0] ? end + 1 - at : 0;
} // End of function closingAt()

/**
 * Tells whether a tile sequence is a valid reading of a text: it parses
 * without errors and assembles back to exactly that text.
 *
 * @param {string[]} ids - Tile ids.
 * @param {string} text - The text.
 * @returns {boolean} True when the sequence reads as the text.
 */
function readsAs(ids, text) {
  const { tree, errors } = parse(ids);
  return errors.length === 0 && assemble(tree).text === text;
}

/**
 * Writes a reading without its START and END controls, to tell two readings
 * of one text apart (tokenize()'s class-name check, R-6c3): the same tiles
 * with and without a compound branch's marks around one chain are one molecule.
 *
 * @param {string[]} ids - Tile ids.
 * @returns {string} The other ids, space-separated.
 */
function plainReading(ids) {
  return ids.filter((id) => id !== START_ID && id !== END_ID).join(' ');
}

/**
 * Finds the tiles of a name: the inverse of assemble() (design.md §15.4).
 *
 * @param {string} text - A name (compared in NFC, design.md §15.9 trap 7).
 * @param {{budget?: number}} [options] - `budget`: maximum search steps (default TOKENIZE_BUDGET).
 * @returns {string[]|null} The tile ids, or null when no sequence reads as the text within the budget
 *   (or the text is longer than TOKENIZE_MAX_LENGTH, or it is an amine's class name with two readings).
 */
export function tokenize(text, options = {}) {
  const target = String(text).normalize('NFC');
  if (target.length > TOKENIZE_MAX_LENGTH) {
    return null;
  }
  const budget = options.budget ?? TOKENIZE_BUDGET;
  const ids = [];
  const marks = [];
  let steps = 0;
  let ester = false; // Past an ester's ` de ` (R-6a1): ` y ` may join two O-bound groups.
  let finalClass = null; // Class of the last tile of the reading found.
  let rejected = null; // A reading the search may not return again (the class-name check below), as plainReading() writes it.

  /**
   * Explores the readings of the text from a position.
   *
   * @param {number} pos - Position in the text.
   * @param {string} prev - Class of the previous tile, automatic letter or automatic opening mark.
   * @param {{role: string}|null} last - Punctuation role of the previous piece, null at the start.
   * @returns {boolean|null} True when found (`ids` holds it), false when not, null when the budget ran out.
   */
  function search(pos, prev, last) {
    steps += 1;
    if (steps > budget) {
      return null;
    }
    let at = pos;
    while (at < target.length && PUNCTUATION.includes(target[at])) {
      at += 1;
    }
    const skipped = target.slice(pos, at);
    /**
     * Tells whether the skipped punctuation is what the assembler writes before a piece.
     *
     * @param {{role: string, italic?: boolean}} next - The next piece's role.
     * @returns {boolean} True when it fits.
     */
    const fits = (next) => separator(last, next) === skipped;
    if (at === target.length) {
      // An ester's last O-bound group may be a compound branch (R-6a1: `bis(2-cloroetilo)`), ending in its END.
      const final = FINAL.has(prev) || (ester && prev === 'END');
      const found = skipped === '' && marks.length === 0 && final && plainReading(ids) !== rejected && readsAs(ids, target);
      if (found) {
        finalClass = prev;
      }
      return found;
    }
    const ch = target[at];
    if (ch === SPACE) {
      if (prev === 'ACID') {
        // The space after `ácido` (R-5d1, assemble.js rule 9), nothing skipped before it.
        return skipped === '' ? search(at + SPACE.length, 'ACIDSPACE', SPACE_ROLE) : false;
      }
      // ` de ` after the acid part (R-6a1; R-6a2a: after a retained ester word too).
      const word = ['EST', 'PHEST', 'TPLEST'].includes(prev) ? ESTER_WORDS.link : null;
      const join = ester && (prev === 'ILO' || prev === 'END') ? ESTER_WORDS.join : null; // ` y ` between two O-bound groups
      if (word || join) {
        if (skipped !== '' || marks.length > 0 || !target.startsWith(word || join, at)) {
          return false;
        }
        const before = ester;
        ester = true;
        const found = search(at + (word || join).length, word ? 'DE' : 'Y', SPACE_ROLE);
        ester = before;
        return found;
      }
      // A class name's space (R-5b2): right after a complete group, outside every mark, with nothing skipped before it.
      const fitsSpace = skipped === '' && marks.length === 0 && BEFORE_SPACE.has(prev) && fits(SPACE_ROLE);
      return fitsSpace ? search(at + SPACE.length, 'SPACE', SPACE_ROLE) : false;
    }
    if (OPENERS.includes(ch)) {
      // After a multiplier, a hyphen before the mark when an italic descriptor follows it (`bis-(tert-butoxicarbonil)`, R-6a2b);
      // readsAs() checks which.
      return fits(OPEN) || fits(OPEN_ITALIC) ? searchOpening(at, prev, OPENERS.indexOf(ch)) : false;
    }
    if (CLOSERS.includes(ch)) {
      return fits(CLOSE) ? searchClosing(at, prev, CLOSERS.indexOf(ch)) : false;
    }
    const top = marks[marks.length - 1];
    let follow = FOLLOW[prev];
    if (top && top.automatic && !top.compound && (AUTO_CLOSE.has(prev) || prev === 'RET')) {
      // An automatic enclosure ends right after its chain's `il` / `iliden`, after `fenil`, or after `oxi` — but `il` may
      // still take `oxi` first (`(pentiloxi)`, R-5b), and an acyl branch `oxi`, `oxi` `carbonil` (`(acetiloxi)`,
      // `(metoxicarbonil)`, R-6a2b).
      if (!IN_ENCLOSURE[prev]) {
        return false;
      }
      follow = IN_ENCLOSURE[prev];
    }
    const closing = follow.has('CLO') ? closingAt(target, at) : 0;
    if (closing > 0 && fits(LOCANT)) {
      ids.push(CLOSING_ID); // `1(6)` (R-5a2): the assembly checks that the ring has six carbons.
      const found = search(at + closing, 'CLO', LOCANT);
      if (found !== false) {
        return found;
      }
      ids.pop();
    }
    for (const surface of SURFACES) {
      if (follow.has(surface.cls) && target.startsWith(surface.text, at) && fits(surface.piece)) {
        ids.push(...surface.ids);
        const found = search(at + surface.text.length, surface.cls, surface.piece);
        if (found !== false) {
          return found;
        }
        ids.length -= surface.ids.length;
      }
    } // End of the loop over the surface forms
    if (follow.has('A') && target.startsWith(CONNECTING_VOWEL, at) && fits(WORD)) {
      return search(at + CONNECTING_VOWEL.length, 'A', WORD);
    }
    return false;
  } // End of function search()

  /**
   * Explores an opening mark: automatic first (around one simple chain or
   * ring, or `fenil`, not inside another automatic enclosure — but for an
   * ester prefix's inner part right inside one, R-6a2b), then, right after
   * a START control, the inner part of an ester prefix written as that
   * compound branch (R-6a2b), then the START control.
   *
   * @param {number} pos - Position of the mark.
   * @param {string} prev - Class before it.
   * @param {number} level - Mark level (index in ENCLOSING_MARKS).
   * @returns {boolean|null} As search().
   */
  function searchOpening(pos, prev, level) {
    const top = marks[marks.length - 1];
    if (top && top.automatic && !top.compound) {
      if (prev !== 'AUTO_OPEN' || top.inner) {
        return false;
      }
      // R-6a2b: an ester prefix's inner part right inside its automatic marks: `[(prop-2-enoil)oxi]`, `[(propan-2-iloxi)carbonil]`.
      marks.push({ automatic: true, inner: true, level });
      const found = search(pos + 1, 'AUTO_OPEN', OPEN);
      marks.pop();
      return found;
    }
    if (FOLLOW[prev].has('ROOT')) {
      marks.push({ automatic: true, level });
      const found = search(pos + 1, 'AUTO_OPEN', OPEN);
      marks.pop();
      if (found !== false) {
        return found;
      }
    }
    if (prev === 'START') {
      // R-6a2b: an ester prefix's inner part with prefixes of its own, right inside the START of its compound branch, read like
      // that branch's content: `[(2-metilpropanoil)oxi]`, `[(2-cloroetoxi)carbonil]`, `{[2-(acetiloxi)etanoil]oxi}`.
      marks.push({ automatic: true, compound: true, inner: true, level });
      const found = search(pos + 1, 'START', OPEN);
      marks.pop();
      if (found !== false) {
        return found;
      }
    }
    if (!FOLLOW[prev].has('START')) {
      return false;
    }
    marks.push({ automatic: false, level });
    ids.push(START_ID);
    const found = search(pos + 1, 'START', OPEN);
    if (found === false) {
      ids.pop();
    }
    marks.pop();
    return found;
  } // End of function searchOpening()

  /**
   * Explores a closing mark: it closes the last opening mark, of the same
   * level and the same choice (automatic, right after `il` / `iliden` or
   * `fenil`; an ester prefix's inner part, R-6a2b, right after its acyl or
   * alkoxy part, innerClass(); or the END control).
   *
   * @param {number} pos - Position of the mark.
   * @param {string} prev - Class before it.
   * @param {number} level - Mark level.
   * @returns {boolean|null} As search().
   */
  function searchClosing(pos, prev, level) {
    const open = marks[marks.length - 1];
    // An ester prefix's inner part (R-6a2b) closes after its acyl part (then `oxi`) or its alkoxy part (then `carbonil`).
    const after = open && open.inner ? innerClass(prev) : prev;
    if (!open || open.level !== level || after === null || (open.automatic && !open.inner && !AUTO_CLOSE.has(prev))) {
      return false;
    }
    marks.pop();
    let found = false;
    if (open.automatic) {
      found = search(pos + 1, after, CLOSE);
    } else if (FOLLOW[prev].has('END')) {
      ids.push(END_ID);
      found = search(pos + 1, 'END', CLOSE);
      if (found === false) {
        ids.pop();
      }
    }
    marks.push(open);
    return found;
  } // End of function searchClosing()

  if (search(0, 'BEGIN', null) !== true) {
    return null;
  }
  const first = [...ids];
  if (finalClass !== 'AMCLASS') {
    return first;
  }
  // R-6c3: an amine's class name has no locants, so a multiplier may run into a root — `tridecilamina` is three decyl groups
  // (`tri` `dec` `il`, the forward engine's name of N(C10)3) or one tridecyl (`tridec` `il`). A text with a second reading is
  // ambiguous: null, never the first reading found. So is one whose check runs out of budget. A group's START and END around
  // the same chain as automatic marks (`(propan-2-il)amina`) are the same molecule, not a second reading (plainReading()).
  rejected = plainReading(first);
  ids.length = 0;
  steps = 0;
  return search(0, 'BEGIN', null) === false ? first : null;
} // End of function tokenize()
