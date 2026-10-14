/**
 * @file Parser of «¿Cómo se dibuja?» (design.md §15.4, §15.5.1, §15.6;
 * phases R-1a, R-4a, R-4b): recursive descent over a tile sequence into a
 * lossless syntax tree. Pure, no DOM, no chemistry (the tree is not checked
 * against a molecule; that is interpret.js / build.js, R-1b).
 *
 * Grammar for open-chain and monocyclic hydrocarbons (design.md §15.5.1;
 * the ring prefix `ciclo` from R-4a, `benceno` and `fenil` from R-4b):
 *
 *   name        = { prefix } , parent ;
 *   prefix      = [ locants ] , [ MULT | CMULT ] , substituent ;
 *   substituent = simple | START , { prefix } , simple , END ;
 *   simple      = stem , ( il | iliden )
 *               | stem , [ ano ] , locant , ( il | iliden )
 *               | stem , segments , [ locant ] , ( il | iliden )
 *               | isopropil | isopropiliden | tert-butil | fenil ;
 *   parent      = [ legacy ] , stem , ( ano | segments ) | benceno ;
 *   stem        = [ ciclo ] , ROOT ;   (* ciclo: a ring of ROOT carbons, at least 3 *)
 *   segments    = segment , [ segment ] ;
 *   segment     = [ locants ] , [ MULT ] , ( eno | ino ) ;
 *   locants     = NUM , { NUM } ;
 *
 * A ring takes the same endings, segments and free-valence suffixes as a
 * chain (`ciclohexano`, `ciclohexa-1,3-dieno`, `ciclohexil`,
 * `ciclohexiliden`, `ciclohex-2-en-1-il`), so it is a chain node with its
 * `ciclo` tile; the ring's bonds and its free valence at carbon 1 are
 * interpret.js's. Old-style locants work as on a chain (`1,3-ciclohexadieno`).
 *
 * The benzene ring (R-4b) is two whole words: `benceno`, the parent, and
 * `fenil`, a retained branch word like `isopropil` (bonded by its carbon 1),
 * which alone among them may be the own chain of a compound branch with
 * prefixes (`START 4 met il fenil END`: `(4-metilfenil)`; build.js refuses
 * prefixes on the other retained words). Its double bonds are never
 * numbered: numbers or a multiplier right before `benceno` (`1,3,5-benceno`),
 * or numbers, a multiplier or an ending after it, are BENZENE_BONDS; inside a
 * compound branch `benceno` is out of place (TILE_ORDER: as a branch it is
 * `fenil`).
 *
 * A stem starts a branch or the parent: what follows it decides (a
 * free-valence suffix makes a branch), so leading numbers are never
 * consumed greedily — `2 met il 2 but eno` is the prefix `2-metil` and the
 * old-style parent `2-buteno`.
 *
 * The tree keeps every tile exactly once, in order, with its role — the
 * student's own multipliers (di vs bis), order and locants, mistakes
 * included — and assemble.js writes it back. Leaves are tile indices into
 * `tree.tiles`. Nodes (each with `range: [from, to)` of tile indices):
 *
 * - name    `{type: 'name', tiles, items: (prefix|stray)[], parent, trailing: stray[]}`
 * - prefix  `{type: 'prefix', locants: number[], multiplier: number|null,
 *            substituent: chain|retained|branch|null}` (null: numbers or a
 *            multiplier with nothing after them yet)
 * - chain   `{type: 'chain', ring: number|null, root: number|null, ano:
 *            number|null, segments: segment[], fvLocants: number[], fv:
 *            number|null}` (`ring` the `ciclo` tile of a ring, else null;
 *            `root` null only after a `ciclo` with no root, RING_ROOT; a
 *            branch's chain has `fv`; the parent's has none)
 * - segment `{locants: number[], multiplier: number|null, ending: number}`
 * - retained `{type: 'retained', tile}`
 * - branch  `{type: 'branch', start, items: (prefix|stray)[], chain:
 *            chain|retained|null, end: number|null}` (`chain` is the
 *            branch's own simple chain, cited last; `end` null while open)
 * - parent  `{type: 'parent', legacy: number[], legacyMultiplier:
 *            number|null, legacySegment: number|null, chain: chain|benzene}`
 *            (`legacy`: old-style locants before the root, `2-buteno`;
 *            `legacySegment` the index of the segment they belong to once
 *            allocated; for `benceno` they are BENZENE_BONDS)
 * - benzene `{type: 'benzene', tile}` (the `benceno` tile, R-4b)
 * - stray   `{type: 'stray', tile}` (a tile out of place)
 *
 * Error-tolerant: parsing never throws on a tile sequence; it always
 * returns a tree (so an incomplete name still assembles) and the syntactic
 * errors of design.md §15.6, each `{code, from, to, message}` with the
 * offending tile range `[from, to)`, sorted by position: EMPTY, NO_PARENT,
 * ROOT_END, ENDS_WITH_BRANCH, BRANCH_OPEN, LOCANT_COUNT, LEGACY, TILE_ORDER,
 * for rings (R-4a) RING_ROOT (`ciclo` without a root after it) and
 * RING_SIZE (a ring of fewer than three carbons), and for benzene (R-4b)
 * BENZENE_BONDS (numbers of its own on `benceno`, which has none).
 * The structural codes (LOCANT_RANGE, BOND_RANGE, SAME_BOND, VALENCE,
 * TOO_BIG) need the chemistry and belong to R-1b. The Spanish messages are
 * drafts pending teacher review (design.md §15, last paragraph); their
 * example words come from the lexicon.
 */

import {
  stem, multiplier, compoundMultiplier, ENDINGS, FREE_VALENCE_SUFFIXES, ENCLOSING_MARKS, CONNECTING_VOWEL,
  MAX_MULTIPLIER, RING_PREFIX, BENZENE_NAME, RETAINED_PREFIXES,
} from '../naming/lexicon.es.js';
import { toTiles } from './tiles.js';
import { itemText } from './assemble.js';

/** The syntactic error codes of design.md §15.6 handled by the parser (RING_ROOT, RING_SIZE from R-4a; BENZENE_BONDS from R-4b). */
export const ERROR_CODES = Object.freeze([
  'EMPTY', 'NO_PARENT', 'ROOT_END', 'ENDS_WITH_BRANCH', 'BRANCH_OPEN', 'LOCANT_COUNT', 'LEGACY', 'TILE_ORDER',
  'RING_ROOT', 'RING_SIZE', 'BENZENE_BONDS',
]);

/** Fewest carbons of a ring (`ciclopropano`). */
export const MIN_RING = 3;

const IL = FREE_VALENCE_SUFFIXES[1];
const ILIDEN = FREE_VALENCE_SUFFIXES[2];
const FENIL = `${RETAINED_PREFIXES.phenyl.italic}${RETAINED_PREFIXES.phenyl.text}`;
const [OPEN, CLOSE] = ENCLOSING_MARKS[0];

/** Spanish number words for the LOCANT_COUNT messages (digits from 11 on). */
const NUMBER_WORDS = Object.freeze(['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']);

/**
 * A number as a Spanish word up to ten, else in digits.
 *
 * @param {number} n - The number.
 * @returns {string} 'dos', 'tres'… or '12'.
 */
function numberWord(n) {
  return n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n);
}

/** Example words of the messages, built from the lexicon. */
const EXAMPLES = Object.freeze({
  metil: `${stem(1)}${IL}`,
  metiliden: `${stem(1)}${ILIDEN}`,
  metanil: `${stem(1)}${ENDINGS.saturated.slice(0, -1)}${IL}`,
  locantMetil: `2-${stem(1)}${IL}`,
  dimetil: `${multiplier(2)}${stem(1)}${IL}`,
  butano: `${stem(4)}${ENDINGS.saturated}`,
  but2eno: `${stem(4)}-2-${ENDINGS.double}`,
  butadieno: `${stem(4)}${CONNECTING_VOWEL}-1,3-${multiplier(2)}${ENDINGS.double}`,
  metilpropil: `2-${stem(1)}${IL}${stem(3)}${IL}`,
  bisMetilpropil: `${compoundMultiplier(2)}${OPEN}2-${stem(1)}${IL}${stem(3)}${IL}${CLOSE}`,
  hexEnIno: `${stem(6)}-1-${ENDINGS.double.slice(0, -1)}-3-${ENDINGS.triple}`,
  hexadienino: `${stem(6)}${CONNECTING_VOWEL}-1,3-${multiplier(2)}${ENDINGS.double.slice(0, -1)}-5-${ENDINGS.triple}`,
  ciclopropano: `${RING_PREFIX}${stem(3)}${ENDINGS.saturated}`,
  ciclohexano: `${RING_PREFIX}${stem(6)}${ENDINGS.saturated}`,
  ciclohexil: `${RING_PREFIX}${stem(6)}${IL}`,
  dimetilbenceno: `1,2-${multiplier(2)}${stem(1)}${IL}${BENZENE_NAME}`,
});

/** Hints of the TILE_ORDER message, by situation (drafts pending teacher review). */
const HINTS = Object.freeze({
  num: `los números van delante de una rama (${EXAMPLES.locantMetil}) o de una terminación (${EXAMPLES.but2eno}).`,
  mult: `«${multiplier(2)}», «${multiplier(3)}»… van delante de una rama (${EXAMPLES.dimetil}) `
    + `o de una terminación (${EXAMPLES.butadieno}).`,
  cmult: `«${compoundMultiplier(2)}», «${compoundMultiplier(3)}»… van delante de una rama compuesta: ${EXAMPLES.bisMetilpropil}.`,
  ending: `«${ENDINGS.saturated}», «${ENDINGS.double}» e «${ENDINGS.triple}» van detrás de una raíz `
    + `(${EXAMPLES.butano}, ${EXAMPLES.but2eno}).`,
  freeValence: `«${IL}» e «${ILIDEN}» van detrás de la raíz de una rama (${EXAMPLES.metil}, ${EXAMPLES.metiliden}).`,
  endWithoutBranch: 'no hay ninguna rama compuesta abierta que cerrar.',
  branchWithoutChain: `antes de cerrar la rama compuesta va su propia cadena, acabada en «${IL}» (${EXAMPLES.metilpropil}).`,
  afterParent: 'el nombre termina con la cadena principal (la raíz y su terminación); las ramas van delante.',
  anoBeforeIl: `en una rama sin número no se pone «${ENDINGS.saturated}»: ${EXAMPLES.metil}, no ${EXAMPLES.metanil}.`,
  legacyMultiplier: `«${multiplier(2)}», «${multiplier(3)}»… van detrás de la raíz, delante de «${ENDINGS.double}» `
    + `o «${ENDINGS.triple}» (${EXAMPLES.butadieno}).`,
  thirdSegment: `una cadena lleva como mucho dos terminaciones, una de «${ENDINGS.double}» y otra de `
    + `«${ENDINGS.triple}» (${EXAMPLES.hexadienino}).`,
  cmultSegment: `delante de «${ENDINGS.double}» o «${ENDINGS.triple}» va «${multiplier(2)}», «${multiplier(3)}»…, `
    + `no «${compoundMultiplier(2)}» ni «${compoundMultiplier(3)}».`,
  benzeneBranch: `«${BENZENE_NAME}» es el anillo principal y va al final del nombre; como rama, el benceno se escribe `
    + `«${FENIL}».`,
});

/** Messages of the error codes that take no detail (design.md §15.6 drafts). */
const MESSAGES = Object.freeze({
  EMPTY: 'Elige fichas para formar un nombre.',
  NO_PARENT: `Falta la cadena principal: una raíz (${stem(1)}, ${stem(2)}, ${stem(3)}…) y su terminación `
    + `(${ENDINGS.saturated}, ${ENDINGS.double}, ${ENDINGS.triple}).`,
  BRANCH_OPEN: 'Falta cerrar la rama compuesta.',
  LEGACY: `Con la forma antigua no sé a qué enlace va cada número: escríbelos detrás de la raíz (${EXAMPLES.hexEnIno}).`,
  RING_ROOT: `Después de «${RING_PREFIX}» va una raíz que dice cuántos carbonos tiene el anillo: `
    + `${EXAMPLES.ciclopropano}, ${EXAMPLES.ciclohexano}, ${EXAMPLES.ciclohexil}…`,
  RING_SIZE: `Un anillo tiene por lo menos ${MIN_RING} carbonos: el más pequeño es el ${EXAMPLES.ciclopropano}.`,
  BENZENE_BONDS: `El ${BENZENE_NAME} no lleva números propios: sus enlaces dobles no se numeran. Los números van delante `
    + `de cada rama (${EXAMPLES.dimetilbenceno}).`,
});

/**
 * Records an error.
 *
 * @param {{errors: object[]}} state - Parser state.
 * @param {string} code - Error code.
 * @param {number} from - First tile index.
 * @param {number} to - Tile index after the last one.
 * @param {string} message - Spanish message.
 * @returns {void}
 */
function addError(state, code, from, to, message) {
  state.errors.push({ code, from, to, message });
}

/**
 * Records a TILE_ORDER error over a tile range.
 *
 * @param {{errors: object[]}} state - Parser state.
 * @param {number} from - First tile index.
 * @param {number} to - Tile index after the last one.
 * @param {string} hint - The hint (HINTS).
 * @returns {void}
 */
function addTileOrder(state, from, to, hint) {
  const lead = to - from > 1 ? 'Estas fichas no pueden ir aquí' : 'Esta ficha no puede ir aquí';
  addError(state, 'TILE_ORDER', from, to, `${lead}: ${hint}`);
}

/**
 * Tells whether the tile at the parser position is of a kind (and value).
 *
 * @param {{tiles: object[], pos: number}} state - Parser state.
 * @param {string} kind - Tile kind.
 * @param {*} [value] - Tile value (any when omitted).
 * @returns {boolean} True on a match.
 */
function at(state, kind, value) {
  const tile = state.tiles[state.pos];
  return Boolean(tile) && tile.kind === kind && (value === undefined || tile.value === value);
}

/**
 * Consumes a run of number tiles.
 *
 * @param {{tiles: object[], pos: number}} state - Parser state.
 * @returns {number[]} Their indices.
 */
function takeNums(state) {
  const nums = [];
  while (at(state, 'num')) {
    nums.push(state.pos);
    state.pos += 1;
  }
  return nums;
}

/**
 * Consumes a multiplier tile (simple or compound) when there is one.
 *
 * @param {{tiles: object[], pos: number}} state - Parser state.
 * @returns {number|null} Its index, or null.
 */
function takeMultiplier(state) {
  if (at(state, 'mult') || at(state, 'cmult')) {
    state.pos += 1;
    return state.pos - 1;
  }
  return null;
}

/**
 * Checks that a locant list has as many numbers as its multiplier says
 * (one without a multiplier; design.md §15.5.1). A list left out is not
 * checked (left-out locants, R-1c).
 *
 * @param {{tiles: object[], errors: object[]}} state - Parser state.
 * @param {number[]} locants - Locant tile indices.
 * @param {number|null} mult - Multiplier tile index (right after the locants), or null.
 * @param {string} counted - What the multiplier counts: 'grupos', 'enlaces dobles', 'enlaces triples'.
 * @param {boolean} compound - Name `bis`… rather than `di`… when the multiplier is missing.
 * @returns {void}
 */
function checkLocantCount(state, locants, mult, counted, compound) {
  const { tiles } = state;
  const count = locants.length;
  const expected = mult === null ? 1 : tiles[mult].value;
  if (count === 0 || count === expected) {
    return;
  }
  const from = locants[0];
  const to = (mult === null ? locants[count - 1] : mult) + 1;
  let message;
  if (mult !== null) {
    const list = locants.map((i) => tiles[i].text).join(',');
    message = `Has puesto ${count} ${count === 1 ? 'número' : 'números'} (${list}), pero «${tiles[mult].text}» `
      + `quiere decir ${numberWord(expected)} ${counted}.`;
  } else if (count <= MAX_MULTIPLIER) {
    message = `Con ${numberWord(count)} números hace falta «${compound ? compoundMultiplier(count) : multiplier(count)}».`;
  } else {
    message = `Con ${count} números hace falta un multiplicador.`;
  }
  addError(state, 'LOCANT_COUNT', from, to, message);
} // End of function checkLocantCount()

/**
 * Parses the unsaturation segments after a root: `[locants] [MULT] eno|ino`,
 * looking ahead so that numbers not followed by a segment are left for the
 * free-valence locant or for what comes next.
 *
 * @param {object} state - Parser state.
 * @param {object} chain - The chain node being built.
 * @returns {void}
 */
function parseSegments(state, chain) {
  const { tiles } = state;
  for (;;) {
    const save = state.pos;
    const locants = takeNums(state);
    const mult = takeMultiplier(state);
    if (!at(state, 'ending', 'double') && !at(state, 'ending', 'triple')) {
      state.pos = save;
      return;
    }
    const segment = { locants, multiplier: mult, ending: state.pos, range: [save, state.pos + 1] };
    state.pos += 1;
    if (mult !== null && tiles[mult].kind === 'cmult') {
      addTileOrder(state, mult, mult + 1, HINTS.cmultSegment);
    }
    if (chain.segments.length >= 2) {
      addTileOrder(state, segment.range[0], segment.range[1], HINTS.thirdSegment);
    }
    const counted = tiles[segment.ending].value === 'double' ? 'enlaces dobles' : 'enlaces triples';
    checkLocantCount(state, locants, mult, counted, false);
    chain.segments.push(segment);
  } // End of the loop over the segments
} // End of function parseSegments()

/**
 * Parses a chain from its stem — a root, or `ciclo` and a root for a ring
 * (RING_ROOT when no root follows `ciclo`, RING_SIZE for a ring of fewer
 * than MIN_RING carbons) —, then `ano` or unsaturation segments, then the
 * free-valence locant and suffix of a branch when they follow.
 *
 * @param {object} state - Parser state (positioned on a root or `ciclo` tile).
 * @returns {object} The chain node.
 */
function parseChain(state) {
  const { tiles } = state;
  const start = state.pos;
  const chain = { type: 'chain', ring: null, root: null, ano: null, segments: [], fvLocants: [], fv: null, range: null };
  if (at(state, 'ring')) {
    chain.ring = state.pos;
    state.pos += 1;
    if (!at(state, 'root')) {
      chain.range = [start, state.pos];
      addError(state, 'RING_ROOT', chain.ring, chain.ring + 1, MESSAGES.RING_ROOT);
      return chain; // An unfinished ring: what follows is read on its own.
    }
    if (tiles[state.pos].value < MIN_RING) {
      addError(state, 'RING_SIZE', chain.ring, state.pos + 1, MESSAGES.RING_SIZE);
    }
  }
  chain.root = state.pos;
  state.pos += 1;
  if (at(state, 'ending', 'saturated')) {
    chain.ano = state.pos;
    state.pos += 1;
  } else {
    parseSegments(state, chain);
  }
  const save = state.pos;
  const nums = takeNums(state);
  if (at(state, 'freeValence')) {
    chain.fvLocants = nums;
    chain.fv = state.pos;
    state.pos += 1;
    if (nums.length > 1) {
      addError(state, 'LOCANT_COUNT', nums[0], nums[nums.length - 1] + 1,
        `Una rama se une a la cadena por un solo carbono: delante de «${tiles[chain.fv].text}» va un solo número.`);
    }
    if (chain.ano !== null && nums.length === 0) {
      addTileOrder(state, chain.ano, chain.ano + 1, HINTS.anoBeforeIl); // `prop ano il`: `propil`
    }
  } else {
    state.pos = save;
  }
  chain.range = [start, state.pos];
  return chain;
} // End of function parseChain()

/**
 * Tells whether a chain has its ending (`ano` or a segment).
 *
 * @param {object} chain - A chain node.
 * @returns {boolean} True when ended.
 */
function chainEnded(chain) {
  return chain.ano !== null || chain.segments.length > 0;
}

/**
 * Records ROOT_END for a chain without its ending (or, inside a compound
 * branch, without `il`): «Después de «but»…», «Después de «ciclohex»… si es
 * el anillo principal…» for a ring. Nothing for a `ciclo` without its root
 * (RING_ROOT says it).
 *
 * @param {object} state - Parser state.
 * @param {object} chain - The chain node.
 * @returns {void}
 */
function addRootEnd(state, chain) {
  if (chain.root === null) {
    return;
  }
  const ring = chain.ring !== null;
  const word = `${ring ? state.tiles[chain.ring].text : ''}${state.tiles[chain.root].text}`;
  addError(state, 'ROOT_END', chain.range[0], chain.range[1],
    `Después de «${word}» va una terminación: «${ENDINGS.saturated}», «${ENDINGS.double}» o «${ENDINGS.triple}» `
    + `si es ${ring ? 'el anillo principal' : 'la cadena principal'}, o «${IL}» si es una rama.`);
} // End of function addRootEnd()

/**
 * Tells whether a substituent is complete: a chain with its free-valence
 * suffix, a retained word, or a closed compound branch with its own chain.
 *
 * @param {object|null} node - A substituent node.
 * @returns {boolean} True when complete.
 */
export function isCompleteSubstituent(node) {
  if (!node) {
    return false;
  }
  if (node.type === 'retained') {
    return true;
  }
  if (node.type === 'branch') {
    return node.end !== null && node.chain !== null;
  }
  return node.fv !== null;
} // End of function isCompleteSubstituent()

/**
 * Tells whether an item of a compound branch is its own simple chain: no
 * locants, no multiplier, a complete chain or retained word.
 *
 * @param {object} item - A prefix or stray node.
 * @returns {boolean} True for the branch's own chain.
 */
function isOwnChain(item) {
  return item.type === 'prefix' && item.locants.length === 0 && item.multiplier === null
    && Boolean(item.substituent) && item.substituent.type !== 'branch' && isCompleteSubstituent(item.substituent);
}

/**
 * Parses a compound branch from its START control: its prefixes, its own
 * chain (the last simple one) and END.
 *
 * @param {object} state - Parser state (positioned on START).
 * @returns {object} The branch node.
 */
function parseBranch(state) {
  const { tiles } = state;
  const start = state.pos;
  const branch = { type: 'branch', start, items: [], chain: null, end: null, range: null };
  state.pos += 1;
  while (state.pos < tiles.length && !at(state, 'end')) {
    branch.items.push(parseItem(state, 'branch'));
  }
  if (state.pos < tiles.length) {
    branch.end = state.pos;
    state.pos += 1;
  }
  const last = branch.items[branch.items.length - 1];
  if (last && isOwnChain(last)) {
    branch.chain = last.substituent;
    branch.items.pop();
  }
  branch.range = [start, state.pos];
  if (branch.end === null) {
    addError(state, 'BRANCH_OPEN', start, state.pos, MESSAGES.BRANCH_OPEN);
  } else if (branch.chain === null) {
    addTileOrder(state, branch.end, branch.end + 1, HINTS.branchWithoutChain);
  }
  return branch;
} // End of function parseBranch()

/**
 * Builds the parent node and checks its old-style locants (design.md
 * §15.5.1 `legacy`): allowed only when exactly one segment has no locants
 * and their count matches its multiplier; any other allocation is LEGACY.
 * A multiplier between them and the root is out of place.
 *
 * @param {object} state - Parser state.
 * @param {number[]} legacy - Locant tiles before the root.
 * @param {number|null} mult - Multiplier tile before the root, or null.
 * @param {object} chain - The parent chain.
 * @param {number} start - First tile index of the parent.
 * @returns {object} The parent node.
 */
function makeParent(state, legacy, mult, chain, start) {
  const { tiles } = state;
  const parent = { type: 'parent', legacy, legacyMultiplier: mult, legacySegment: null, chain, range: [start, state.pos] };
  if (mult !== null) {
    addTileOrder(state, mult, mult + 1, HINTS.legacyMultiplier);
  }
  if (legacy.length > 0 && chainEnded(chain)) {
    const open = chain.segments.map((segment, i) => (segment.locants.length === 0 ? i : -1)).filter((i) => i >= 0);
    const target = open.length === 1 ? chain.segments[open[0]] : null;
    const count = target && target.multiplier !== null ? tiles[target.multiplier].value : 1;
    if (target && count === legacy.length) {
      parent.legacySegment = open[0];
    } else {
      addError(state, 'LEGACY', legacy[0], legacy[legacy.length - 1] + 1, MESSAGES.LEGACY);
    }
  }
  return parent;
} // End of function makeParent()

/**
 * Builds the parent node of `benceno` (R-4b), the tile at the parser
 * position: numbers or a multiplier before it are BENZENE_BONDS (its double
 * bonds are never numbered), kept in the node as `legacy` so the tree stays
 * lossless.
 *
 * @param {object} state - Parser state (positioned on the `benceno` tile).
 * @param {number[]} legacy - Locant tiles before it.
 * @param {number|null} mult - Multiplier tile before it, or null.
 * @param {number} start - First tile index of the parent.
 * @returns {object} The parent node, its chain a benzene node.
 */
function makeBenzeneParent(state, legacy, mult, start) {
  const tile = state.pos;
  state.pos += 1;
  if (legacy.length > 0 || mult !== null) {
    addError(state, 'BENZENE_BONDS', start, tile, MESSAGES.BENZENE_BONDS);
  }
  const chain = { type: 'benzene', tile, range: [tile, tile + 1] };
  return { type: 'parent', legacy, legacyMultiplier: mult, legacySegment: null, chain, range: [start, state.pos] };
}

/**
 * Parses one item at a prefix position: a prefix (locants, multiplier,
 * substituent), the parent (at name level, a chain or ring without free
 * valence, or `benceno`), or a tile that cannot start either (a stray; also
 * `benceno` inside a compound branch).
 *
 * @param {object} state - Parser state.
 * @param {'name'|'branch'} context - Name level or inside a compound branch.
 * @returns {object} A prefix, parent or stray node.
 */
function parseItem(state, context) {
  const { tiles } = state;
  const start = state.pos;
  const first = tiles[start];
  const benzeneBranch = first.kind === 'benzene' && context === 'branch';
  if (first.kind === 'ending' || first.kind === 'freeValence' || first.kind === 'end' || benzeneBranch) {
    state.pos += 1;
    const hint = (first.kind === 'end' && HINTS.endWithoutBranch) || (benzeneBranch && HINTS.benzeneBranch) || HINTS[first.kind];
    addTileOrder(state, start, start + 1, hint);
    return { type: 'stray', tile: start, range: [start, start + 1] };
  }
  const locants = takeNums(state);
  const mult = takeMultiplier(state);
  const prefix = { type: 'prefix', locants, multiplier: mult, substituent: null, range: [start, state.pos] };
  const next = tiles[state.pos];
  if (next && next.kind === 'benzene' && context === 'name') {
    return makeBenzeneParent(state, locants, mult, start);
  }
  if (!next || !['start', 'retained', 'root', 'ring'].includes(next.kind)) {
    if (next) {
      addTileOrder(state, start, state.pos, HINTS[first.kind]); // numbers or a multiplier with no branch after them
    }
    return prefix;
  }
  if (next.kind === 'start') {
    prefix.substituent = parseBranch(state);
  } else if (next.kind === 'retained') {
    prefix.substituent = { type: 'retained', tile: state.pos, range: [state.pos, state.pos + 1] };
    state.pos += 1;
  } else {
    const chain = parseChain(state);
    if (chain.fv === null) {
      const ended = chainEnded(chain);
      if (context === 'name' && (ended || state.pos === tiles.length)) {
        if (!ended) {
          addRootEnd(state, chain); // The name so far ends in a bare root: the parent being written.
        }
        return makeParent(state, locants, mult, chain, start);
      }
      addRootEnd(state, chain);
    }
    prefix.substituent = chain;
  }
  prefix.range = [start, state.pos];
  checkLocantCount(state, locants, mult, 'grupos', prefix.substituent.type === 'branch');
  return prefix;
} // End of function parseItem()

/**
 * Tells whether an item is a complete prefix.
 *
 * @param {object} item - A prefix or stray node.
 * @returns {boolean} True for a prefix with a complete substituent.
 */
function isCompletePrefix(item) {
  return item.type === 'prefix' && isCompleteSubstituent(item.substituent);
}

/**
 * Records why a name without a parent is incomplete: ENDS_WITH_BRANCH when
 * it ends with a complete prefix, else NO_PARENT over the tiles after the
 * last complete prefix. Nothing when a compound branch is still open
 * (BRANCH_OPEN says it first).
 *
 * @param {object} state - Parser state.
 * @param {object} tree - The name tree.
 * @returns {void}
 */
function checkNameEnd(state, tree) {
  if (state.errors.some((error) => error.code === 'BRANCH_OPEN')) {
    return;
  }
  const last = tree.items[tree.items.length - 1];
  if (last && isCompletePrefix(last)) {
    const words = itemText(tree, { ...last, locants: [], multiplier: null });
    addError(state, 'ENDS_WITH_BRANCH', last.range[0], last.range[1],
      `El nombre acaba en una rama («${words}»): falta la cadena principal detrás.`);
    return;
  }
  const from = tree.items.reduce((end, item) => (isCompletePrefix(item) ? item.range[1] : end), 0);
  addError(state, 'NO_PARENT', from, tree.tiles.length, MESSAGES.NO_PARENT);
} // End of function checkNameEnd()

/**
 * Parses a tile sequence into its lossless syntax tree and the syntactic
 * errors (design.md §15.5.1, §15.6). Never throws on a tile sequence.
 *
 * @param {(string|object)[]} sequence - Tile ids or catalogue tiles (tiles.js).
 * @returns {{tree: object, errors: {code: string, from: number, to: number, message: string}[]}} The tree and the errors, by position.
 * @throws {Error} Only for an unknown tile id.
 */
export function parse(sequence) {
  const tiles = toTiles(sequence);
  const tree = { type: 'name', tiles, items: [], parent: null, trailing: [], range: [0, tiles.length] };
  const state = { tiles, pos: 0, errors: [] };
  if (tiles.length === 0) {
    addError(state, 'EMPTY', 0, 0, MESSAGES.EMPTY);
    return { tree, errors: state.errors };
  }
  while (state.pos < tiles.length) {
    const item = parseItem(state, 'name');
    if (item.type === 'parent') {
      tree.parent = item;
      break;
    }
    tree.items.push(item);
  }
  if (state.pos < tiles.length) {
    for (let i = state.pos; i < tiles.length; i += 1) {
      tree.trailing.push({ type: 'stray', tile: i, range: [i, i + 1] });
    }
    // After `benceno`, numbers, multipliers and endings would number its double bonds (`benceno-1,3,5-trieno`).
    const bonds = tree.parent.chain.type === 'benzene'
      && tiles.slice(state.pos).every((tile) => ['num', 'mult', 'ending'].includes(tile.kind));
    if (bonds) {
      addError(state, 'BENZENE_BONDS', state.pos, tiles.length, MESSAGES.BENZENE_BONDS);
    } else {
      addTileOrder(state, state.pos, tiles.length, HINTS.afterParent);
    }
  }
  if (!tree.parent) {
    checkNameEnd(state, tree);
  }
  const errors = state.errors.map((error, i) => ({ error, i }))
    .sort((a, b) => a.error.from - b.error.from || a.i - b.i)
    .map(({ error }) => error);
  return { tree, errors };
} // End of function parse()
