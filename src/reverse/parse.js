/**
 * @file Parser of «¿Cómo se dibuja?» (design.md §15.4, §15.5.1, §15.6;
 * phases R-1a, R-4a, R-4b, R-4c, R-5a1, R-5a2, R-5a3a, R-5b): recursive descent over a tile sequence
 * into a lossless syntax tree. Pure, no DOM, no chemistry (the tree is not
 * checked against a molecule; that is interpret.js / build.js, R-1b).
 *
 * Grammar for open-chain and monocyclic hydrocarbons, their halogen
 * derivatives, their alcohols and their ethers (design.md §15.5.1; the ring
 * prefix `ciclo` from R-4a, `benceno` and `fenil` from R-4b, the retained
 * templates and the orto/meta/para letters from R-4c, the halogens from
 * R-5a1, the alcohols — `hidroxi`, the suffix `ol`, `fenol`, the
 * closing-bond locant `1(n)` — from R-5a2, the retained phenol templates
 * from R-5a3a, the alkoxy ending `oxi` and `anisol` from R-5b):
 *
 *   name        = { prefix } , parent ;
 *   prefix      = [ locants ] , [ letter ] , [ MULT | CMULT ] , substituent ;
 *   substituent = simple | group | START , { prefix } , simple , END ;
 *   group       = fluoro | cloro | bromo | yodo | hidroxi ;
 *   simple      = stem , ( il [ oxi ] | iliden )
 *               | stem , [ ano ] , locant , ( il [ oxi ] | iliden )
 *               | stem , segments , [ locant ] , ( il [ oxi ] | iliden )
 *               | ( isopropil | tert-butil | fenil ) , [ oxi ] | isopropiliden ;
 *   parent      = [ legacy ] , stem , ( ano | segments ) , [ suffix ]
 *               | [ legacy ] , benceno , [ suffix ] | fenol
 *               | [ locants | letter ] , template ;
 *   suffix      = [ locants ] , [ MULT ] , ol ;
 *   template    = tolueno | estireno | xileno | mesitileno | anisol
 *               | cresol | pirocatecol | catecol | resorcinol | hidroquinona ;
 *   letter      = o | m | p ;
 *   stem        = [ ciclo ] , ROOT ;   (* ciclo: a ring of ROOT carbons, at least 3 *)
 *   segments    = segment , [ segment ] ;
 *   segment     = [ locants ] , [ MULT ] , ( eno | ino ) ;
 *   locants     = locant , { locant } ;
 *   locant      = NUM | 1(n) ;   (* 1(n): only on a ring's eno / ino *)
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
 * A halogen (R-5a1) is a whole-word prefix like a retained branch word, a
 * substituent of its own (`2-cloropropano`, `1,1-dicloroetano`, also inside a
 * compound branch: `(2-cloroetil)`), but never a branch's own chain: it is
 * one atom and takes no prefixes, so a compound branch that ends in a halogen
 * has no chain of its own (`(2-cloro)`, TILE_ORDER at its END). `hidroxi`
 * (R-5a2) is such a one-atom group too (tiles.js isAtomGroup()): the OH
 * written as a prefix, `(hidroximetil)`, `(4-hidroxifenil)`.
 *
 * The alcohol suffix `ol` (R-5a2) follows the parent's ending (a chain, a
 * `ciclo` ring or `benceno`) with its own locants and multiplier
 * (`propan-2-ol`, `butano-1,4-diol`, `benceno-1,2-diol`, `ciclohexanol`):
 * the `suffix` node of the parent. Old-style locants before the root go to
 * the one locant list left open among the segments and the suffix
 * (`2-propanol`, `1,2-etanodiol`, `1,2-bencenodiol`; LEGACY with two open
 * lists, `2-butenol`). `bis`, `tris`… before `ol`, or `ol` anywhere else
 * (in a branch, the OH is `hidroxi`), are TILE_ORDER. `fenol` is a whole word
 * like `benceno`, the benzene parent with its OH at carbon 1 (the engine's
 * retained name, `4-metilfenol`): it takes no suffix, numbers or letter of
 * its own (TEMPLATE_LOCANTS, as a template that places its group), and
 * counts that OH as one of the two positions of an orto/meta/para letter
 * (`p-metilfenol`), as `tolueno` counts its methyl.
 *
 * The alkoxy ending `oxi` (R-5b) closes a simple branch that ends in `il`
 * — a chain or ring, `isopropil`, `tert-butil` or `fenil` —, also the own
 * chain of a compound branch, right before its END (`START 2 met il prop il
 * oxi END`: `(2-metilpropoxi)`): the branch is then bonded to an ether
 * oxygen, which is bonded to the carbon the prefix's locant gives
 * (`1 met il oxi prop ano`: `1-metoxipropano`). It is a field of the chain
 * or retained node (`oxi`), so every rule that reads a branch's chain reads
 * an alkoxy group's too; the assembler contracts it (render.js
 * alkoxyTokens(): `metoxi`, `isopropoxi`, but `(pentiloxi)`). After `iliden`
 * or `isopropiliden` (a double bond: an ether oxygen takes single bonds
 * only), or anywhere else — after a halogen, after the END of a compound
 * branch, alone —, it is TILE_ORDER with its own hint. `anisol` (R-5b) is a
 * retained template like `tolueno`, its methoxy group at carbon 1.
 *
 * The tile `1(n)` (R-5a2) is the compound locant of a ring's closing bond,
 * the one from its last carbon n back to carbon 1 (the engine cites it
 * `1(6)`, IUPAC 2013 P-31.1.4.2.4: `ciclohex-1(6)-eno-1,2,4-triol`,
 * `ciclopropa-1,1(3),2-trieno`): a locant of the `eno` / `ino` segments of
 * a ring only (the parent's or a ring branch's, written after the root);
 * anywhere else it is TILE_ORDER (checkClosing()).
 *
 * The retained templates (R-4c, tiles.js TEMPLATES) are whole-word parents
 * too, a benzene ring with groups of its own: `tolueno`, `estireno` and
 * `mesitileno` say where those groups are, so numbers or a letter right
 * before them are TEMPLATE_LOCANTS; `xileno` takes the two positions of its
 * methyls, two numbers (`1,2-xileno`; any other count is LOCANT_COUNT) or a
 * letter (`o-xileno`), or neither (left out, searched by search.js). A
 * multiplier before a template, or a template inside a compound branch, is
 * TILE_ORDER. The letters `o`, `m`, `p` (design.md §14.4) stand for two
 * occupied positions of the parent benzene ring — 1,2 / 1,3 / 1,4, the
 * template's group at 1 counting as one of them — and checkLetters() keeps
 * them to the forms that have a meaning (POSITIONAL otherwise): on a
 * name-level prefix or on `xileno` or `cresol`, with a benzene or template
 * parent, exactly two occupied positions, never two different prefixes on
 * `benceno`, never beside numbers on the same prefix.
 *
 * The retained phenols (R-5a3a, tiles.js TEMPLATES with `hydroxy`) are
 * templates too, whose OH groups count as occupied positions like a
 * template's groups: `pirocatecol`, `catecol`, `resorcinol` and
 * `hidroquinona` say where their two OH groups are (numbers or a letter on
 * them are TEMPLATE_LOCANTS); `cresol` has its OH at 1 and takes the position
 * of its methyl as a letter only (`p-cresol`, the engine's only form) —
 * numbers before it are TEMPLATE_LOCANTS, with their own message — or
 * neither (left out, searched); so a prefix on a lettered `cresol` makes
 * three positions (POSITIONAL, as `4-metil-o-xileno`). With prefixes of the
 * student's, neither a letter nor numbers can mend a `cresol`, so both
 * errors then point at the systematic name from `fenol`
 * (substitutedLetterOnlyMessage(): `2-cloro-4-metilfenol`), which the app
 * reads.
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
 * - prefix  `{type: 'prefix', locants: number[], letter: number|null, multiplier: number|null,
 *            substituent: chain|retained|halogen|hydroxy|branch|null}` (null: numbers, a
 *            letter or a multiplier with nothing after them yet; `letter` the
 *            o / m / p tile, R-4c)
 * - chain   `{type: 'chain', ring: number|null, root: number|null, ano:
 *            number|null, segments: segment[], fvLocants: number[], fv:
 *            number|null, oxi: number|null}` (`ring` the `ciclo` tile of a
 *            ring, else null; `root` null only after a `ciclo` with no root,
 *            RING_ROOT; a branch's chain has `fv`; the parent's has none;
 *            `oxi` the alkoxy ending after `fv`, R-5b)
 * - segment `{locants: number[], multiplier: number|null, ending: number}`
 * - retained `{type: 'retained', tile, oxi: number|null}` (`oxi` the alkoxy ending after it, R-5b)
 * - halogen `{type: 'halogen', tile}` (a halogen tile, R-5a1)
 * - hydroxy `{type: 'hydroxy', tile}` (the `hidroxi` tile, R-5a2)
 * - branch  `{type: 'branch', start, items: (prefix|stray)[], chain:
 *            chain|retained|null, end: number|null}` (`chain` is the
 *            branch's own simple chain, cited last; `end` null while open)
 * - parent  `{type: 'parent', legacy: number[], letter: number|null, legacyMultiplier:
 *            number|null, legacySegment: number|null, legacySuffix: boolean,
 *            chain: chain|benzene|template, suffix: suffix|null}`
 *            (`legacy`: the locants before the stem — old-style ones of a
 *            chain, `2-buteno`, or of its suffix, `2-propanol`, R-5a2;
 *            `legacySegment` the index of the segment they belong to once
 *            allocated, `legacySuffix` true when they belong to the suffix;
 *            for `benceno` they are BENZENE_BONDS unless its suffix takes
 *            them, `1,2-bencenodiol`; for `xileno` its methyls' positions,
 *            `1,2-xileno` —; `letter` an o / m / p before the stem, the
 *            methyls' positions of `o-xileno` or the methyl's of `o-cresol`
 *            (R-5a3a), out of place before any other stem; `suffix` the
 *            alcohol suffix, R-5a2)
 * - suffix  `{type: 'suffix', locants: number[], multiplier: number|null, tile}` (the
 *            `ol` tile with its locants and multiplier, R-5a2)
 * - benzene `{type: 'benzene', tile}` (the `benceno` tile, R-4b; also the
 *            `fenol` tile, R-5a2, value 'phenol': isPhenol())
 * - template `{type: 'template', tile}` (a retained template tile, R-4c)
 * - stray   `{type: 'stray', tile}` (a tile out of place)
 *
 * Error-tolerant: parsing never throws on a tile sequence; it always
 * returns a tree (so an incomplete name still assembles) and the syntactic
 * errors of design.md §15.6, each `{code, from, to, message}` with the
 * offending tile range `[from, to)`, sorted by position: EMPTY, NO_PARENT,
 * ROOT_END, ENDS_WITH_BRANCH, BRANCH_OPEN, LOCANT_COUNT, LEGACY, TILE_ORDER,
 * for rings (R-4a) RING_ROOT (`ciclo` without a root after it) and
 * RING_SIZE (a ring of fewer than three carbons), for benzene (R-4b)
 * BENZENE_BONDS (numbers of its own on `benceno`, which has none), and for
 * the templates and the letters (R-4c) TEMPLATE_LOCANTS (numbers or a letter
 * on a template that places its own groups — on `fenol` too, R-5a2 —, and
 * numbers on `cresol`, which takes a letter only, R-5a3a) and POSITIONAL (an
 * o / m / p letter where it has no meaning, design.md §14.4).
 * The structural codes (LOCANT_RANGE, BOND_RANGE, SAME_BOND, VALENCE,
 * TOO_BIG) need the chemistry and belong to R-1b. The Spanish messages are
 * drafts pending teacher review (design.md §15, last paragraph); their
 * example words come from the lexicon.
 */

import {
  stem, multiplier, compoundMultiplier, ENDINGS, FREE_VALENCE_SUFFIXES, ENCLOSING_MARKS, CONNECTING_VOWEL,
  MAX_MULTIPLIER, RING_PREFIX, BENZENE_NAME, RETAINED_PREFIXES, POSITIONAL_LETTERS, GROUP_SUFFIXES, GROUP_PREFIXES,
  HALOGEN_PREFIXES, ALKOXY_ENDING,
} from '../naming/lexicon.es.js';
import {
  toTiles, TEMPLATES, templateGroupWord, groupPlural, tileById, POSITIONAL_IDS, PHENOL_ID, isAtomGroup, closingText,
  isPhenolTemplate, withArticle, ALKOXY_RETAINED,
} from './tiles.js';
import { itemText, isAlkoxyNode, isCompoundAlkoxy } from './assemble.js';

/**
 * The syntactic error codes of design.md §15.6 handled by the parser (RING_ROOT, RING_SIZE from R-4a; BENZENE_BONDS
 * from R-4b; TEMPLATE_LOCANTS, POSITIONAL from R-4c).
 */
export const ERROR_CODES = Object.freeze([
  'EMPTY', 'NO_PARENT', 'ROOT_END', 'ENDS_WITH_BRANCH', 'BRANCH_OPEN', 'LOCANT_COUNT', 'LEGACY', 'TILE_ORDER',
  'RING_ROOT', 'RING_SIZE', 'BENZENE_BONDS', 'TEMPLATE_LOCANTS', 'POSITIONAL',
]);

/** Fewest carbons of a ring (`ciclopropano`). */
export const MIN_RING = 3;

const IL = FREE_VALENCE_SUFFIXES[1];
const ILIDEN = FREE_VALENCE_SUFFIXES[2];
const FENIL = `${RETAINED_PREFIXES.phenyl.italic}${RETAINED_PREFIXES.phenyl.text}`;
const [OPEN, CLOSE] = ENCLOSING_MARKS[0];
const XILENO = tileById('template-xylene').text;
const CRESOL = tileById('template-cresol').text;
const OL = GROUP_SUFFIXES.alcohol;
const HIDROXI = GROUP_PREFIXES.alcohol;
const FENOL = tileById(PHENOL_ID).text;
const [ORTO, META, PARA] = Object.keys(POSITIONAL_IDS).map((locant) => POSITIONAL_LETTERS[locant]);

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
  oDimetilbenceno: `${ORTO}-${multiplier(2)}${stem(1)}${IL}${BENZENE_NAME}`,
  metilbenceno: `${stem(1)}${IL}${BENZENE_NAME}`,
  trimetilbenceno: `1,2,4-${multiplier(3)}${stem(1)}${IL}${BENZENE_NAME}`,
  etilMetilbenceno: `1-${stem(2)}${IL}-2-${stem(1)}${IL}${BENZENE_NAME}`,
  metilfenil: `${OPEN}4-${stem(1)}${IL}${FENIL}${CLOSE}`,
  xileno12: `1,2-${XILENO}`,
  oXileno: `${ORTO}-${XILENO}`,
  pXileno: `${PARA}-${XILENO}`,
  oCresol: `${ORTO}-${CRESOL}`,
  mCresol: `${META}-${CRESOL}`,
  pCresol: `${PARA}-${CRESOL}`,
  propan2ol: `${stem(3)}${ENDINGS.saturated.slice(0, -1)}-2-${OL}`,
  butanodiol: `${stem(4)}${ENDINGS.saturated}-1,4-${multiplier(2)}${OL}`,
  hidroxifenil: `${OPEN}4-${HIDROXI}${FENIL}${CLOSE}`,
  cloroMetilfenol: `2-${HALOGEN_PREFIXES.Cl}-4-${stem(1)}${IL}${FENOL}`,
  ciclohexenotriol: `${RING_PREFIX}${stem(6)}-${closingText(6)}-${ENDINGS.double}-1,2,4-${multiplier(3)}${OL}`,
  metoxi: `${stem(1)}${ALKOXY_ENDING}`,
  isopropoxi: `${RETAINED_PREFIXES.isopropyl.text.slice(0, -IL.length)}${ALKOXY_ENDING}`,
  metilpropoxi: `${OPEN}2-${stem(1)}${IL}${stem(3)}${ALKOXY_ENDING}${CLOSE}`,
  metoxifenil: `${OPEN}4-${stem(1)}${ALKOXY_ENDING}${FENIL}${CLOSE}`,
});

/** The three letters as the messages quote them: «o», «m» y «p». */
const LETTERS = Object.keys(POSITIONAL_IDS).map((locant) => `«${POSITIONAL_LETTERS[locant]}»`);

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
  positional: `las letras ${LETTERS[0]}, ${LETTERS[1]} y ${LETTERS[2]} van delante de los dos grupos del ${BENZENE_NAME} `
    + `que sitúan (${EXAMPLES.oDimetilbenceno}) o delante de «${XILENO}» o «${CRESOL}» (${EXAMPLES.pXileno}, `
    + `${EXAMPLES.pCresol}).`,
  suffix: `«${OL}» va al final del nombre, detrás de la terminación de la cadena principal (${EXAMPLES.propan2ol}, `
    + `${EXAMPLES.butanodiol}); en una rama, el grupo OH se escribe «${HIDROXI}».`,
  cmultSuffix: `delante de «${OL}» va «${multiplier(2)}», «${multiplier(3)}»…, no «${compoundMultiplier(2)}» ni `
    + `«${compoundMultiplier(3)}».`,
  phenolBranch: `«${FENOL}» es el nombre de toda la molécula y va al final; dentro de una rama, el anillo con su grupo OH `
    + `se escribe con «${HIDROXI}» y «${FENIL}», como en ${EXAMPLES.hidroxifenil}.`,
  closing: `«${closingText('n')}» es el número del enlace que cierra un anillo, del último carbono al 1, y solo va delante `
    + `de «${ENDINGS.double}» o «${ENDINGS.triple}» de un anillo (${EXAMPLES.ciclohexenotriol}).`,
  alkoxy: `«${ALKOXY_ENDING}» va justo detrás de una rama acabada en «${IL}», y la une a la cadena por un oxígeno: `
    + `${stem(1)}, ${IL} y ${ALKOXY_ENDING} dan ${EXAMPLES.metoxi}; también detrás de «${RETAINED_PREFIXES.isopropyl.text}», `
    + `«${RETAINED_PREFIXES['tert-butyl'].italic}${RETAINED_PREFIXES['tert-butyl'].text}» o «${FENIL}» (${EXAMPLES.isopropoxi}), `
    + `y en una rama compuesta, antes de cerrarla: ${EXAMPLES.metilpropoxi}.`,
});

/**
 * The TILE_ORDER hint of `oxi` after a doubly bonded branch word (R-5b):
 * `iliden`, `isopropiliden` — an ether oxygen takes single bonds only.
 *
 * @param {string} word - The word before it, as on its tile.
 * @returns {string} The hint.
 */
function alkoxyAfterDoubleHint(word) {
  return `«${ALKOXY_ENDING}» no va detrás de «${word}»: el oxígeno se une a la rama por un enlace sencillo, así que la rama `
    + `acaba en «${IL}» (${EXAMPLES.metoxi}).`;
}

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
 * Messages of the POSITIONAL error (design.md §14.4; R-4c drafts, pending
 * teacher review), by what is wrong with the letter.
 */
const POSITIONAL_MESSAGES = Object.freeze({
  notBenzene: `Las letras ${LETTERS[0]}, ${LETTERS[1]} y ${LETTERS[2]} (orto, meta y para) solo se usan con el `
    + `${BENZENE_NAME}, para decir dónde están sus dos grupos (${EXAMPLES.oDimetilbenceno}); aquí van números.`,
  branch: `Dentro de una rama no se usan ${LETTERS[0]}, ${LETTERS[1]} ni ${LETTERS[2]}: escribe los números, como en `
    + `${EXAMPLES.metilfenil}.`,
  beforeStem: `${HINTS.positional.charAt(0).toUpperCase()}${HINTS.positional.slice(1)}`,
  both: `Escribe los números (${EXAMPLES.dimetilbenceno}) o la letra (${EXAMPLES.oDimetilbenceno}), no las dos cosas.`,
  bothXylene: `Escribe los números (${EXAMPLES.xileno12}) o la letra (${EXAMPLES.oXileno}), no las dos cosas.`,
  one: `Las letras ${LETTERS[0]}, ${LETTERS[1]} y ${LETTERS[2]} dicen dónde está el segundo de dos grupos del `
    + `${BENZENE_NAME}; con un solo grupo no hacen falta (${EXAMPLES.metilbenceno}).`,
  different: `Con dos grupos distintos en el ${BENZENE_NAME} no se usan ${LETTERS[0]}, ${LETTERS[1]} ni ${LETTERS[2]}: `
    + `escribe los números (${EXAMPLES.etilMetilbenceno}).`,
});

/** The group `fenol` places itself at carbon 1, as the messages say it (R-5a2), and its plural (R-5a3a: `catecol`). */
const PHENOL_GROUP = 'grupo OH';
const PHENOL_GROUPS = 'grupos OH';

/**
 * Tells whether a parent's chain node is `fenol` (R-5a2): a benzene node
 * whose tile is the `fenol` tile.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A chain, benzene or template node.
 * @returns {boolean} True for `fenol`.
 */
export function isPhenol(tiles, node) {
  return node.type === 'benzene' && tiles[node.tile].value === 'phenol';
}

/**
 * One kind of group a whole-word parent places itself, as the messages
 * count it: how many, and its name in the singular and the plural.
 *
 * @typedef {object} OwnGroupKind
 * @property {number} count - How many.
 * @property {string} one - The name of one (`metilo`, `grupo OH`).
 * @property {string} many - The plural (`metilos`, `grupos OH`).
 */

/**
 * The groups a whole-word benzene parent places itself (design.md §14.4,
 * §14.5): a retained template's (R-4c: the methyl of `tolueno` at 1, those
 * of `mesitileno` at 1, 3 and 5, the two of `xileno` where the student
 * says; R-5a3a: the OH groups of the retained phenols, `catecol` at 1 and 2,
 * and for `cresol` its OH at 1 and its methyl where the letter says) or the
 * OH of `fenol` at 1 (R-5a2); null for `benceno` and any other parent.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} chain - The parent's chain node.
 * @returns {{count: number, positions: number[]|null, kinds: OwnGroupKind[], letterOnly: boolean, word: string}|null} How
 *   many groups in all, where (null for `xileno` and `cresol`, whose positions the student gives), each kind of group (the
 *   OH groups first), whether those positions are a letter only (`cresol`) and the parent's word — or null.
 */
function ownGroups(tiles, chain) {
  if (chain.type === 'template') {
    const tile = tiles[chain.tile];
    const { count, positions, hydroxy, letterOnly } = TEMPLATES[tile.value];
    const group = templateGroupWord(tile.value);
    const kinds = [
      ...(hydroxy.length > 0 ? [{ count: hydroxy.length, one: PHENOL_GROUP, many: PHENOL_GROUPS }] : []),
      ...(count > 0 ? [{ count, one: group, many: groupPlural(group) }] : []), // `metilos`; `grupos metoxi` (R-5b)
    ];
    return {
      count: count + hydroxy.length,
      positions: positions && [...hydroxy, ...positions].sort((a, b) => a - b),
      kinds,
      letterOnly: Boolean(letterOnly),
      word: tile.text,
    };
  }
  if (isPhenol(tiles, chain)) {
    return {
      count: 1, positions: [1], kinds: [{ count: 1, one: PHENOL_GROUP, many: PHENOL_GROUPS }], letterOnly: false, word: tiles[chain.tile].text,
    };
  }
  return null;
} // End of function ownGroups()

/**
 * The groups of a whole-word parent with their articles, joined by «y»:
 * «el metilo», «los dos metilos», «el grupo OH y el metilo» (R-5a3a,
 * `cresol`).
 *
 * @param {OwnGroupKind[]} kinds - ownGroups() `kinds`.
 * @param {[string, string]} articles - The articles for one and for several: ['el', 'los'] or ['su', 'sus'].
 * @returns {string} The phrase.
 */
function ownGroupsPhrase(kinds, [one, many]) {
  return kinds.map((kind) => (kind.count === 1 ? `${one} ${kind.one}` : `${many} ${numberWord(kind.count)} ${kind.many}`)).join(' y ');
}

/**
 * The POSITIONAL message for a benzene with three or more occupied
 * positions, counting the groups a template (or `fenol`, R-5a2) places
 * itself (design.md §14.4: never with three or more positions).
 *
 * @param {number} positions - Occupied ring positions the name describes.
 * @param {{kinds: OwnGroupKind[], word: string}|null} owner - ownGroups() of the parent, or null for `benceno`.
 * @returns {string} The message.
 */
function threePositionsMessage(positions, owner) {
  const counted = owner ? ` (contando ${ownGroupsPhrase(owner.kinds, ['el', 'los'])} ${withArticle(owner.word, 'de')})` : '';
  return `Las letras ${LETTERS[0]}, ${LETTERS[1]} y ${LETTERS[2]} solo sirven cuando el ${BENZENE_NAME} lleva dos grupos, `
    + `y tu nombre pone ${numberWord(positions)}${counted}: escribe los números (${EXAMPLES.trimetilbenceno}).`;
} // End of function threePositionsMessage()

/**
 * The TEMPLATE_LOCANTS message (R-4c): a template that places its own groups
 * takes no numbers or letter of its own — «tolueno» ya dice dónde va su
 * metilo, en el carbono 1… —; nor does `fenol` (R-5a2): «fenol» ya dice
 * dónde va su grupo OH…; nor do the diols of R-5a3a: «catecol» ya dice dónde
 * van sus dos grupos OH, en los carbonos 1 y 2…
 *
 * @param {{count: number, positions: number[], kinds: OwnGroupKind[], word: string}} owner - ownGroups() of the parent.
 * @returns {string} The message.
 */
function templateLocantsMessage(owner) {
  const { count, positions } = owner;
  const where = positions.length === 1 ? `el carbono ${positions[0]}`
    : `los carbonos ${positions.slice(0, -1).join(', ')} y ${positions[positions.length - 1]}`;
  const which = `${count === 1 ? 'va' : 'van'} ${ownGroupsPhrase(owner.kinds, ['su', 'sus'])}`;
  return `«${owner.word}» ya dice dónde ${which}, en ${where}: no lleva números ni letras propios.`;
}

/**
 * The TEMPLATE_LOCANTS message of numbers before `cresol` (R-5a3a): the
 * engine writes its methyl's position as a letter only (`o-cresol`,
 * `m-cresol`, `p-cresol`; never `4-cresol`).
 *
 * @param {{kinds: OwnGroupKind[], word: string}} owner - ownGroups() of the `cresol` parent.
 * @returns {string} The message.
 */
function letterOnlyMessage(owner) {
  const group = owner.kinds[owner.kinds.length - 1].one;
  return `Con «${owner.word}» no van números: una letra dice dónde está su ${group} respecto al ${PHENOL_GROUP} `
    + `(${EXAMPLES.oCresol}, ${EXAMPLES.mCresol} o ${EXAMPLES.pCresol}).`;
}

/**
 * The message of a `cresol` with prefixes of the student's beside numbers
 * or a letter (R-5a3a review): neither can fix it — a letter makes three
 * ring positions, and `cresol` takes no numbers —, since the name admits no
 * more substituents; the way out is the systematic name, from `fenol`,
 * with numbers (`2-cloro-4-metilfenol`), which the app reads.
 *
 * @param {{word: string}} owner - ownGroups() of the `cresol` parent.
 * @returns {string} The message.
 */
function substitutedLetterOnlyMessage(owner) {
  return `El nombre «${owner.word}» no admite más sustituyentes, ni con números ni con letras: escribe el nombre a partir `
    + `de «${FENOL}», con el ${PHENOL_GROUP} en el carbono 1 y números para todos los demás grupos (${EXAMPLES.cloroMetilfenol}).`;
}

/**
 * The LOCANT_COUNT message of `xileno` (R-4c): two numbers, the positions of
 * its two methyls, or a letter.
 *
 * @param {{text: string, value: string}} tile - The `xileno` tile.
 * @returns {string} The message.
 */
function templateCountMessage(tile) {
  const { count } = TEMPLATES[tile.value];
  return `Con «${tile.text}» van ${numberWord(count)} números, los de sus ${numberWord(count)} `
    + `${groupPlural(templateGroupWord(tile.value))} (${EXAMPLES.xileno12}), o una letra (${EXAMPLES.oXileno}).`;
}

/**
 * The hint of a TILE_ORDER error on a template tile (R-4c): inside a
 * compound branch, or after a multiplier. A retained phenol (R-5a3a) in a
 * branch is written like `fenol` there, with `hidroxi` and `fenil`; `anisol`
 * (R-5b) with `metoxi` and `fenil`, `(4-metoxifenil)`.
 *
 * @param {{text: string, kind: string, value: string}} tile - The template tile.
 * @param {'branch'|'multiplier'} where - Where it stands.
 * @returns {string} The hint.
 */
function templateHint(tile, where) {
  if (where === 'branch' && tile.kind === 'template' && isPhenolTemplate(tile.value)) {
    return `«${tile.text}» es el nombre de toda la molécula y va al final; dentro de una rama, el anillo es «${FENIL}» y cada `
      + `${PHENOL_GROUP} se escribe «${HIDROXI}», como en ${EXAMPLES.hidroxifenil}.`;
  }
  if (where === 'branch' && tile.kind === 'template' && TEMPLATES[tile.value].group && TEMPLATES[tile.value].group.alkoxy) {
    // `anisol` (R-5b): its methoxy group is written as a prefix of `fenil` there.
    return `«${tile.text}» es el nombre de toda la molécula y va al final; dentro de una rama, el anillo es «${FENIL}» y su `
      + `${templateGroupWord(tile.value)} se escribe «${EXAMPLES.metoxi}», como en ${EXAMPLES.metoxifenil}.`;
  }
  if (where === 'branch') {
    return `«${tile.text}» es el nombre de toda la molécula y va al final; dentro de una rama, el anillo es «${FENIL}», `
      + `como en ${EXAMPLES.metilfenil}.`;
  }
  return `«${multiplier(2)}», «${multiplier(3)}»… van delante de una rama (${EXAMPLES.dimetil}), no delante de «${tile.text}».`;
}

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
 * Consumes a run of locant tiles: numbers, and the closing-bond locant
 * `1(n)` (R-5a2; checkClosing() keeps it to a ring's segments).
 *
 * @param {{tiles: object[], pos: number}} state - Parser state.
 * @returns {number[]} Their indices.
 */
function takeNums(state) {
  const nums = [];
  while (at(state, 'num') || at(state, 'closing')) {
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
 * Consumes an orto/meta/para letter tile when there is one (R-4c).
 *
 * @param {{tiles: object[], pos: number}} state - Parser state.
 * @returns {number|null} Its index, or null.
 */
function takeLetter(state) {
  if (at(state, 'positional')) {
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
 * Consumes the alkoxy ending `oxi` after a branch's free-valence suffix or
 * retained word when it follows (R-5b), recording TILE_ORDER when that
 * branch is bonded by a double bond (`iliden`, `isopropiliden`): the tile
 * stays in the node either way, so the tree stays lossless.
 *
 * @param {object} state - Parser state (right after the `il` / `iliden` tile or the retained word).
 * @param {object} before - The tile before it (`il`, `iliden` or a retained word).
 * @returns {number|null} The `oxi` tile index, or null.
 */
function takeAlkoxy(state, before) {
  if (!at(state, 'alkoxy')) {
    return null;
  }
  const oxi = state.pos;
  state.pos += 1;
  const single = before.kind === 'freeValence' ? before.value === 1 : ALKOXY_RETAINED.includes(before.value);
  if (!single) {
    addTileOrder(state, oxi, oxi + 1, alkoxyAfterDoubleHint(before.text)); // `metiliden oxi`, `isopropiliden oxi`
  }
  return oxi;
} // End of function takeAlkoxy()

/**
 * Parses a chain from its stem — a root, or `ciclo` and a root for a ring
 * (RING_ROOT when no root follows `ciclo`, RING_SIZE for a ring of fewer
 * than MIN_RING carbons) —, then `ano` or unsaturation segments, then the
 * free-valence locant and suffix of a branch when they follow, and the
 * alkoxy ending `oxi` after them (R-5b).
 *
 * @param {object} state - Parser state (positioned on a root or `ciclo` tile).
 * @returns {object} The chain node.
 */
function parseChain(state) {
  const { tiles } = state;
  const start = state.pos;
  const chain = { type: 'chain', ring: null, root: null, ano: null, segments: [], fvLocants: [], fv: null, oxi: null, range: null };
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
    chain.oxi = takeAlkoxy(state, tiles[chain.fv]); // `met il oxi`: `metoxi` (R-5b)
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
 * suffix, a retained word, a one-atom group (a halogen, R-5a1; `hidroxi`,
 * R-5a2), or a closed compound branch with its own chain.
 *
 * @param {object|null} node - A substituent node.
 * @returns {boolean} True when complete.
 */
export function isCompleteSubstituent(node) {
  if (!node) {
    return false;
  }
  if (node.type === 'retained' || isAtomGroup(node.type)) {
    return true;
  }
  if (node.type === 'branch') {
    return node.end !== null && node.chain !== null;
  }
  return node.fv !== null;
} // End of function isCompleteSubstituent()

/**
 * Tells whether an item of a compound branch is its own simple chain: no
 * locants, letter or multiplier, a complete chain or retained word (never a
 * one-atom group, R-5a1 / R-5a2: a halogen or `hidroxi` carries no prefixes).
 *
 * @param {object} item - A prefix or stray node.
 * @returns {boolean} True for the branch's own chain.
 */
function isOwnChain(item) {
  return item.type === 'prefix' && item.locants.length === 0 && item.letter === null && item.multiplier === null
    && Boolean(item.substituent) && item.substituent.type !== 'branch' && !isAtomGroup(item.substituent.type)
    && isCompleteSubstituent(item.substituent);
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
 * Parses the alcohol suffix after a parent's ending, when there is one
 * (R-5a2): `[locants] [MULT] ol`, looking ahead so that numbers or a
 * multiplier without `ol` after them are left for what follows (tiles out
 * of place after the parent). `bis`, `tris`… before `ol` are TILE_ORDER; the
 * locant count must match the multiplier (LOCANT_COUNT; a list left out, or
 * given before the root in the old style, is not checked here).
 *
 * @param {object} state - Parser state (right after the parent's ending).
 * @returns {object|null} The suffix node, or null.
 */
function parseSuffix(state) {
  const { tiles } = state;
  const save = state.pos;
  const locants = takeNums(state);
  const mult = takeMultiplier(state);
  if (!at(state, 'suffix')) {
    state.pos = save;
    return null;
  }
  const suffix = { type: 'suffix', locants, multiplier: mult, tile: state.pos, range: [save, state.pos + 1] };
  state.pos += 1;
  if (mult !== null && tiles[mult].kind === 'cmult') {
    addTileOrder(state, mult, mult + 1, HINTS.cmultSuffix);
  }
  checkLocantCount(state, locants, mult, 'grupos', false);
  return suffix;
} // End of function parseSuffix()

/**
 * How many locants a locant list takes: the multiplier's count, one without one.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {number|null} mult - Multiplier tile index, or null.
 * @returns {number} The count.
 */
function multiplierCount(tiles, mult) {
  return mult === null ? 1 : tiles[mult].value;
}

/**
 * Builds the parent node, with its alcohol suffix when one follows (R-5a2),
 * and checks its old-style locants (design.md §15.5.1 `legacy`): allowed
 * only when exactly one locant list is left open among the segments and the
 * suffix, and their count matches its multiplier (`2-buteno`, `2-propanol`,
 * `1,2-etanodiol`); any other allocation is LEGACY (`2-butenol`: two lists
 * left open). A multiplier between them and the root is out of place.
 *
 * A letter before the root stays in the node, out of place (checkLetters()).
 *
 * @param {object} state - Parser state.
 * @param {number[]} legacy - Locant tiles before the root.
 * @param {number|null} letter - An o / m / p tile before the root, or null.
 * @param {number|null} mult - Multiplier tile before the root, or null.
 * @param {object} chain - The parent chain.
 * @param {number} start - First tile index of the parent.
 * @returns {object} The parent node.
 */
function makeParent(state, legacy, letter, mult, chain, start) {
  const { tiles } = state;
  const suffix = chainEnded(chain) ? parseSuffix(state) : null;
  const parent = {
    type: 'parent', legacy, letter, legacyMultiplier: mult, legacySegment: null, legacySuffix: false, chain, suffix, range: [start, state.pos],
  };
  if (mult !== null) {
    addTileOrder(state, mult, mult + 1, HINTS.legacyMultiplier);
  }
  if (legacy.length > 0 && chainEnded(chain)) {
    const open = chain.segments.map((segment, i) => (segment.locants.length === 0 ? i : -1)).filter((i) => i >= 0);
    const suffixOpen = Boolean(suffix) && suffix.locants.length === 0;
    if (open.length === 1 && !suffixOpen && multiplierCount(tiles, chain.segments[open[0]].multiplier) === legacy.length) {
      parent.legacySegment = open[0];
    } else if (open.length === 0 && suffixOpen && multiplierCount(tiles, suffix.multiplier) === legacy.length) {
      parent.legacySuffix = true; // `2-propanol`, `1,2-etanodiol` (R-5a2).
    } else {
      addError(state, 'LEGACY', legacy[0], legacy[legacy.length - 1] + 1, MESSAGES.LEGACY);
    }
  }
  return parent;
} // End of function makeParent()

/**
 * Builds the parent node of `benceno` (R-4b) or `fenol` (R-5a2), the tile at
 * the parser position. `benceno` takes the alcohol suffix (`benceno-1,2-diol`,
 * `bencenohexol`); numbers or a multiplier before it are BENZENE_BONDS (its
 * double bonds are never numbered) — unless they are the old-style locants
 * of a suffix written without its own (`1,2-bencenodiol`) —, kept in the
 * node as `legacy` so the tree stays lossless; a letter before it is out of
 * place (checkLetters()). `fenol` places its own OH at carbon 1, so numbers
 * or a letter before it are TEMPLATE_LOCANTS and a multiplier TILE_ORDER;
 * it takes no suffix.
 *
 * @param {object} state - Parser state (positioned on the `benceno` or `fenol` tile).
 * @param {number[]} legacy - Locant tiles before it.
 * @param {number|null} letter - An o / m / p tile before it, or null.
 * @param {number|null} mult - Multiplier tile before it, or null.
 * @param {number} start - First tile index of the parent.
 * @returns {object} The parent node, its chain a benzene node.
 */
function makeBenzeneParent(state, legacy, letter, mult, start) {
  const { tiles } = state;
  const tile = state.pos;
  state.pos += 1;
  const chain = { type: 'benzene', tile, range: [tile, tile + 1] };
  const phenol = isPhenol(tiles, chain);
  const suffix = phenol ? null : parseSuffix(state);
  const parent = {
    type: 'parent', legacy, letter, legacyMultiplier: mult, legacySegment: null, legacySuffix: false, chain, suffix, range: [start, state.pos],
  };
  if (phenol) {
    if (legacy.length > 0 || letter !== null) {
      const from = legacy.length > 0 ? legacy[0] : letter;
      const to = (letter === null ? legacy[legacy.length - 1] : letter) + 1;
      addError(state, 'TEMPLATE_LOCANTS', from, to, templateLocantsMessage(ownGroups(tiles, chain)));
    }
    if (mult !== null) {
      addTileOrder(state, mult, mult + 1, templateHint(tiles[tile], 'multiplier'));
    }
    return parent;
  }
  const oldStyle = legacy.length > 0 && mult === null && Boolean(suffix) && suffix.locants.length === 0
    && multiplierCount(tiles, suffix.multiplier) === legacy.length;
  if (oldStyle) {
    parent.legacySuffix = true; // `1,2-bencenodiol` (R-5a2).
  } else if (legacy.length > 0 || mult !== null) {
    addError(state, 'BENZENE_BONDS', start, tile, MESSAGES.BENZENE_BONDS);
  }
  return parent;
} // End of function makeBenzeneParent()

/**
 * Builds the parent node of a retained template (R-4c), the tile at the
 * parser position. `xileno` takes the positions of its two methyls before
 * it, two numbers (`legacy`; another count is LOCANT_COUNT) or a letter
 * (`letter`, checked by checkLetters()) — or neither, left out; `cresol`
 * (R-5a3a) takes its methyl's position as a letter only, or none (numbers
 * before it are TEMPLATE_LOCANTS, letterOnlyMessage(); with prefixes of the
 * student's, substitutedLetterOnlyMessage()); the other templates
 * place their groups themselves (the diols of R-5a3a their OH groups), so
 * numbers or a letter before them are TEMPLATE_LOCANTS. A multiplier before
 * a template is TILE_ORDER. Everything stays in the node, so the tree stays
 * lossless.
 *
 * @param {object} state - Parser state (positioned on the template tile).
 * @param {number[]} legacy - Locant tiles before it.
 * @param {number|null} letter - An o / m / p tile before it, or null.
 * @param {number|null} mult - Multiplier tile before it, or null.
 * @param {number} start - First tile index of the parent.
 * @returns {object} The parent node, its chain a template node.
 */
function makeTemplateParent(state, legacy, letter, mult, start) {
  const { tiles } = state;
  const tile = state.pos;
  state.pos += 1;
  const chain = { type: 'template', tile, range: [tile, tile + 1] };
  const template = TEMPLATES[tiles[tile].value];
  if (template.positions && (legacy.length > 0 || letter !== null)) {
    const from = legacy.length > 0 ? legacy[0] : letter;
    const to = (letter === null ? legacy[legacy.length - 1] : letter) + 1;
    addError(state, 'TEMPLATE_LOCANTS', from, to, templateLocantsMessage(ownGroups(tiles, chain)));
  } else if (template.letterOnly && legacy.length > 0) {
    // `4-cresol`, `4-p-cresol` (R-5a3a): the numbers only; checkLetters() leaves the letter alone. With prefixes of the
    // student's (`2-cloro-4-cresol`) no letter would do either: the message points at the name from `fenol` (review).
    const owner = ownGroups(tiles, chain);
    const prefixed = state.items.some((item) => item.type === 'prefix');
    addError(state, 'TEMPLATE_LOCANTS', legacy[0], legacy[legacy.length - 1] + 1,
      prefixed ? substitutedLetterOnlyMessage(owner) : letterOnlyMessage(owner));
  } else if (!template.positions && letter === null && legacy.length > 0 && legacy.length !== template.count) {
    addError(state, 'LOCANT_COUNT', legacy[0], legacy[legacy.length - 1] + 1, templateCountMessage(tiles[tile]));
  }
  if (mult !== null) {
    addTileOrder(state, mult, mult + 1, templateHint(tiles[tile], 'multiplier'));
  }
  return {
    type: 'parent', legacy, letter, legacyMultiplier: mult, legacySegment: null, legacySuffix: false, chain, suffix: null, range: [start, state.pos],
  };
} // End of function makeTemplateParent()

/**
 * The hint of a whole-word parent (`benceno`, `fenol`, a template) found
 * inside a compound branch.
 *
 * @param {object} tile - The tile.
 * @returns {string} The hint.
 */
function wholeWordHint(tile) {
  if (tile.kind === 'benzene') {
    return tile.value === 'phenol' ? HINTS.phenolBranch : HINTS.benzeneBranch;
  }
  return templateHint(tile, 'branch');
}

/**
 * Parses one item at a prefix position: a prefix (locants, letter,
 * multiplier, substituent — a chain, a retained word, a one-atom group (a
 * halogen, `hidroxi`) or a compound branch), the parent (at name level, a
 * chain or ring without free valence, `benceno`, `fenol` or a template, with
 * its suffix), or a tile that cannot start either (a stray; also `benceno`,
 * `fenol` or a template inside a compound branch, and `ol` before a parent).
 *
 * @param {object} state - Parser state.
 * @param {'name'|'branch'} context - Name level or inside a compound branch.
 * @returns {object} A prefix, parent or stray node.
 */
function parseItem(state, context) {
  const { tiles } = state;
  const start = state.pos;
  const first = tiles[start];
  const wholeWord = (first.kind === 'benzene' || first.kind === 'template') && context === 'branch';
  if (['ending', 'freeValence', 'end', 'suffix', 'alkoxy'].includes(first.kind) || wholeWord) { // `oxi` alone: R-5b
    state.pos += 1;
    const hint = (first.kind === 'end' && HINTS.endWithoutBranch) || (wholeWord && wholeWordHint(first)) || HINTS[first.kind];
    addTileOrder(state, start, start + 1, hint);
    return { type: 'stray', tile: start, range: [start, start + 1] };
  }
  const locants = takeNums(state);
  const letter = takeLetter(state);
  const mult = takeMultiplier(state);
  const prefix = { type: 'prefix', locants, letter, multiplier: mult, substituent: null, range: [start, state.pos] };
  const next = tiles[state.pos];
  if (next && next.kind === 'benzene' && context === 'name') {
    return makeBenzeneParent(state, locants, letter, mult, start);
  }
  if (next && next.kind === 'template' && context === 'name') {
    return makeTemplateParent(state, locants, letter, mult, start);
  }
  if (!next || !['start', 'retained', 'halogen', 'hydroxy', 'root', 'ring'].includes(next.kind)) {
    if (next) {
      addTileOrder(state, start, state.pos, HINTS[first.kind]); // numbers, a letter or a multiplier with no branch after them
    }
    return prefix;
  }
  if (next.kind === 'start') {
    prefix.substituent = parseBranch(state);
  } else if (next.kind === 'retained') {
    const node = { type: 'retained', tile: state.pos, oxi: null, range: null }; // `isopropil`, `fenil`
    state.pos += 1;
    node.oxi = takeAlkoxy(state, next); // `isopropoxi`, `fenoxi` (R-5b)
    node.range = [node.tile, state.pos];
    prefix.substituent = node;
  } else if (isAtomGroup(next.kind)) {
    prefix.substituent = { type: next.kind, tile: state.pos, range: [state.pos, state.pos + 1] }; // `cloro`, `hidroxi`
    state.pos += 1;
  } else {
    const chain = parseChain(state);
    if (chain.fv === null) {
      const ended = chainEnded(chain);
      if (context === 'name' && (ended || state.pos === tiles.length)) {
        if (!ended) {
          addRootEnd(state, chain); // The name so far ends in a bare root: the parent being written.
        }
        return makeParent(state, locants, letter, mult, chain, start);
      }
      addRootEnd(state, chain);
    }
    prefix.substituent = chain;
  }
  prefix.range = [start, state.pos];
  // bis… for a compound branch, and for an alkoxy prefix written as its branch + `oxi` (R-5b: `bis(pentiloxi)`).
  const compound = prefix.substituent.type === 'branch' || isCompoundAlkoxy(tiles, prefix.substituent);
  checkLocantCount(state, locants, mult, 'grupos', compound);
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
 * it ends with a complete prefix («…acaba en un grupo («cloro»)…» for a
 * halogen, R-5a1), else NO_PARENT over the tiles after the
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
    const words = itemText(tree, { ...last, locants: [], letter: null, multiplier: null });
    // `2-cloro`, `2-hidroxi`, `2-metoxi`: a one-atom group or an alkoxy group is no branch (R-5a1, R-5a2, R-5b).
    const what = isAtomGroup(last.substituent.type) || isAlkoxyNode(last.substituent) ? 'un grupo' : 'una rama';
    addError(state, 'ENDS_WITH_BRANCH', last.range[0], last.range[1],
      `El nombre acaba en ${what} («${words}»): falta la cadena principal detrás.`);
    return;
  }
  const from = tree.items.reduce((end, item) => (isCompletePrefix(item) ? item.range[1] : end), 0);
  addError(state, 'NO_PARENT', from, tree.tiles.length, MESSAGES.NO_PARENT);
} // End of function checkNameEnd()

/**
 * Records POSITIONAL for each letter of a compound branch, at any depth: the
 * orto/meta/para forms belong to the parent benzene ring only (the engine
 * never writes them on a phenyl, design.md §14.4).
 *
 * @param {object} state - Parser state.
 * @param {object} branch - A branch node.
 * @returns {void}
 */
function checkBranchLetters(state, branch) {
  for (const item of branch.items) {
    if (item.type !== 'prefix') {
      continue;
    }
    if (item.letter !== null) {
      addError(state, 'POSITIONAL', item.letter, item.letter + 1, POSITIONAL_MESSAGES.branch);
    }
    if (item.substituent && item.substituent.type === 'branch') {
      checkBranchLetters(state, item.substituent);
    }
  } // End of the loop over the branch's items
} // End of function checkBranchLetters()

/**
 * Keeps the orto/meta/para letters (R-4c) to the forms that have a meaning
 * (design.md §14.4), recording POSITIONAL on each other one: a letter says
 * that the parent benzene ring has exactly two occupied positions, at 1,2 /
 * 1,3 / 1,4 — a template's own groups counting (the methyl of `tolueno` is
 * one), the groups on a prefix as many as its multiplier says. So a letter
 * stands on a name-level prefix (`o-dimetilbenceno`, `p-metiltolueno`) or on
 * `xileno` or `cresol` (`o-xileno`, `p-cresol`: R-5a3a, its OH and its methyl
 * the two positions); never inside a compound branch, with another
 * parent, before `benceno`, beside numbers on the same prefix, with one or
 * three or more occupied positions (`2-cloro-p-cresol`, `p-metilcatecol`:
 * the OH groups of a retained phenol count), nor for two different prefixes
 * on `benceno` (`m-etilmetilbenceno`). A letter before `tolueno`, `estireno`,
 * `mesitileno` or a diol of R-5a3a is their TEMPLATE_LOCANTS
 * (makeTemplateParent()), and so are numbers before `cresol`.
 *
 * @param {object} state - Parser state.
 * @param {object} tree - The name tree.
 * @returns {void}
 */
function checkLetters(state, tree) {
  const { tiles } = state;
  /**
   * Records POSITIONAL over a tile range.
   *
   * @param {number} from - First tile index.
   * @param {number} to - Tile index after the last one.
   * @param {string} message - The message.
   * @returns {void}
   */
  const report = (from, to, message) => addError(state, 'POSITIONAL', from, to, message);
  const prefixes = tree.items.filter((item) => item.type === 'prefix');
  prefixes.filter((item) => item.substituent && item.substituent.type === 'branch')
    .forEach((item) => checkBranchLetters(state, item.substituent));
  const { parent } = tree;
  if (!parent) {
    return; // NO_PARENT, or ENDS_WITH_BRANCH, says what is missing first.
  }
  const lettered = prefixes.filter((item) => item.letter !== null && item.substituent); // An unfinished one is TILE_ORDER.
  const { chain } = parent;
  if (chain.type === 'chain') {
    [...lettered, ...(parent.letter === null ? [] : [parent])]
      .forEach((holder) => report(holder.letter, holder.letter + 1, POSITIONAL_MESSAGES.notBenzene));
    return;
  }
  const owner = ownGroups(tiles, chain); // A template's groups (R-4c; the OH groups of R-5a3a), or the OH of `fenol` (R-5a2).
  if (chain.type === 'benzene' && parent.letter !== null && !owner) {
    report(parent.letter, parent.letter + 1, POSITIONAL_MESSAGES.beforeStem); // Before `fenol`: TEMPLATE_LOCANTS.
  }
  const own = owner && !owner.positions && parent.letter !== null ? [parent] : []; // `o-xileno`, `p-cresol` (R-5a3a)
  // The groups of a suffix on `benceno` (R-5a2) occupy ring positions too.
  const suffixGroups = parent.suffix ? multiplierCount(tiles, parent.suffix.multiplier) : 0;
  const positions = (owner ? owner.count : 0) + suffixGroups
    + prefixes.filter((item) => item.substituent)
      .reduce((sum, item) => sum + (item.multiplier === null ? 1 : tiles[item.multiplier].value), 0);
  for (const holder of [...lettered, ...own]) {
    const locants = holder.type === 'parent' ? holder.legacy : holder.locants;
    const count = holder.type === 'parent' || holder.multiplier === null ? 1 : tiles[holder.multiplier].value;
    if (locants.length > 0) {
      if (holder.type !== 'parent' || !owner.letterOnly) { // Numbers before `cresol` are its TEMPLATE_LOCANTS (R-5a3a).
        report(locants[0], holder.letter + 1, holder.type === 'parent' ? POSITIONAL_MESSAGES.bothXylene : POSITIONAL_MESSAGES.both);
      }
    } else if (positions >= 3) {
      // `2-cloro-p-cresol` (R-5a3a review): numbers would not do either, so the message points at the name from `fenol`.
      report(holder.letter, holder.letter + 1, owner && owner.letterOnly ? substitutedLetterOnlyMessage(owner)
        : threePositionsMessage(positions, owner));
    } else if (positions < 2) {
      report(holder.letter, holder.letter + 1, POSITIONAL_MESSAGES.one);
    } else if (!owner && count !== 2) {
      report(holder.letter, holder.letter + 1, POSITIONAL_MESSAGES.different);
    }
  } // End of the loop over the letters
} // End of function checkLetters()

/**
 * Keeps the closing-bond locant `1(n)` (R-5a2) to the `eno` / `ino`
 * segments of a ring — the parent's or a ring branch's, written after the
 * root —, recording TILE_ORDER on each one anywhere else: a prefix's
 * locants, a free-valence locant, a chain's segments, the old-style locants
 * before the root, the suffix's locants. A prefix left unfinished already
 * has its TILE_ORDER.
 *
 * @param {object} state - Parser state.
 * @param {object} tree - The name tree.
 * @returns {void}
 */
function checkClosing(state, tree) {
  const { tiles } = state;
  /**
   * Records TILE_ORDER on every `1(n)` of a locant list.
   *
   * @param {number[]} positions - The list's tile indices.
   * @returns {void}
   */
  const report = (positions) => positions.filter((i) => tiles[i].kind === 'closing')
    .forEach((i) => addTileOrder(state, i, i + 1, HINTS.closing));
  /**
   * Checks the lists of a chain node (nothing for the other substituents).
   *
   * @param {object|null} chain - A substituent or parent chain node.
   * @returns {void}
   */
  const visitChain = (chain) => {
    if (!chain || chain.type !== 'chain') {
      return;
    }
    report(chain.fvLocants);
    if (chain.ring === null) {
      chain.segments.forEach((segment) => report(segment.locants));
    }
  };
  /**
   * Checks a prefix and the lists inside its substituent.
   *
   * @param {object} item - A prefix or stray node.
   * @returns {void}
   */
  const visitItem = (item) => {
    if (item.type !== 'prefix' || !item.substituent) {
      return;
    }
    report(item.locants);
    const sub = item.substituent;
    if (sub.type === 'branch') {
      sub.items.forEach(visitItem);
      visitChain(sub.chain);
    } else {
      visitChain(sub);
    }
  }; // End of function visitItem()
  tree.items.forEach(visitItem);
  if (tree.parent) {
    report(tree.parent.legacy);
    visitChain(tree.parent.chain);
    if (tree.parent.suffix) {
      report(tree.parent.suffix.locants);
    }
  }
} // End of function checkClosing()

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
  const state = { tiles, pos: 0, errors: [], items: tree.items }; // `items`: the name-level prefixes read so far.
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
    const { chain } = tree.parent;
    const bonds = chain.type === 'benzene' && !isPhenol(tiles, chain)
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
  checkLetters(state, tree);
  checkClosing(state, tree);
  const errors = state.errors.map((error, i) => ({ error, i }))
    .sort((a, b) => a.error.from - b.error.from || a.i - b.i)
    .map(({ error }) => error);
  return { tree, errors };
} // End of function parse()
