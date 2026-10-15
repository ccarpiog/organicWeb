/**
 * @file Parser of «¿Cómo se dibuja?» (design.md §15.4, §15.5.1, §15.6;
 * phases R-1a, R-4a, R-4b, R-4c, R-5a1, R-5a2, R-5a3a, R-5b, R-5b2, R-5c1, R-5c2, R-5c3a): recursive descent over a tile sequence
 * into a lossless syntax tree. Pure, no DOM, no chemistry (the tree is not
 * checked against a molecule; that is interpret.js / build.js, R-1b).
 *
 * Grammar for open-chain and monocyclic hydrocarbons, their halogen
 * derivatives, their alcohols and their ethers (design.md §15.5.1; the ring
 * prefix `ciclo` from R-4a, `benceno` and `fenil` from R-4b, the retained
 * templates and the orto/meta/para letters from R-4c, the halogens from
 * R-5a1, the alcohols — `hidroxi`, the suffix `ol`, `fenol`, the
 * closing-bond locant `1(n)` — from R-5a2, the retained phenol templates
 * from R-5a3a, the alkoxy ending `oxi` and `anisol` from R-5b, the ether
 * functional-class names from R-5b2, the aldehydes and ketones — the
 * suffixes `al`, `ona`, `carbaldehído`, the prefixes `oxo` and `formil`,
 * `benzaldehído` — from R-5c1, the acyl prefixes — the endings `oil` and
 * `carbonil`, `acetil`, `benzoil` — from R-5c2, the retained carbonyl
 * templates from R-5c3a):
 *
 *   name        = { prefix } , parent
 *               | { classGroup } , éter ;   (* R-5b2: exactly two groups *)
 *   classGroup  = [ MULT | CMULT ] , ( simple | START , { prefix } , simple , END ) ;
 *   prefix      = [ locants ] , [ letter ] , [ MULT | CMULT ] , substituent ;
 *   substituent = simple | group | START , { prefix } , simple , END ;
 *   group       = fluoro | cloro | bromo | yodo | hidroxi | oxo ;
 *   simple      = stem , ( il [ oxi ] | iliden )
 *               | stem , [ ano ] , locant , ( il [ oxi ] | iliden )
 *               | stem , segments , [ locant ] , ( il [ oxi ] | iliden )
 *               | ROOT , ( ano | segments ) , oil              (* R-5c2: propanoil, (but-2-enoil) *)
 *               | ciclo , ROOT , ( ano | segments ) , [ locant ] , carbonil   (* (ciclohexanocarbonil) *)
 *               | ( isopropil | tert-butil | fenil ) , [ oxi ] | isopropiliden | formil | acetil | benzoil ;
 *   parent      = [ legacy ] , stem , ( ano | segments ) , [ suffix ]
 *               | [ legacy ] , benceno , [ suffix ] | fenol | benzaldehído
 *               | [ locants | letter ] , template ;
 *   suffix      = [ locants ] , [ MULT ] , ( ol | al | ona | carbaldehído ) ;
 *   template    = tolueno | estireno | xileno | mesitileno | anisol
 *               | cresol | pirocatecol | catecol | resorcinol | hidroquinona
 *               | formaldehído | acetaldehído | acetona | acetofenona | fenilacetaldehído   (* R-5c3a *)
 *               | ftalaldehído | isoftalaldehído | tereftalaldehído ;
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
 * An ether's functional-class name (R-5b2, design.md §2: `etil metil
 * éter`, `dietil éter`, `tert-butil metil éter`) ends in the class word
 * `éter`, which stands where the parent stands (its node a parent node
 * whose chain is a `classWord` node): the name-level prefixes before it are
 * the two groups bonded to the ether oxygen, each a branch as in a prefix —
 * a chain or ring ending in `il`, `isopropil`, `tert-butil`, `fenil`, or a
 * compound branch with prefixes of its own (`START 2 cloro et il END met il
 * éter`) —, one of them multiplied by `di` (or `bis`) when both are the
 * same (`di et il éter`). checkClassName() keeps that shape: a group takes
 * no locants or letter of its own (no parent chain to number them on), is
 * no one-atom group (`cloro`, `hidroxi`), no alkoxy group (`oxi`: the
 * oxygen is the class word's) and no doubly bonded branch (`iliden`,
 * `isopropiliden`: TILE_ORDER, each with its hint), and the groups count
 * two (ETHER_GROUPS); numbers or a multiplier right before `éter`, `éter`
 * inside a compound branch and tiles after it are TILE_ORDER. Which order
 * and which words the engine uses for the groups is the diagnosis's
 * business (diagnose.js «Ethers»), not the parser's.
 *
 * The aldehydes and ketones (R-5c1) take the other suffixes the same way:
 * `ona` (`pentan-2-ona`, `pentano-2,4-diona`, `ciclohexanona`, old style
 * `2-pentanona`) and `carbaldehído` (`ciclohexanocarbaldehído`,
 * `ciclohex-2-eno-1-carbaldehído`, `benceno-1,4-dicarbaldehído`; after a
 * chain too, read and judged by the engine: `butano-1-carbaldehído` is
 * pentanal). `al` puts the –CHO at the ends of a chain by rule (render.js
 * TERMINAL_SUFFIXES: `butanal`, `butanodial`, `2-metilbutanal`), so it has no
 * locants: numbers on it (`butan-1-al`, `butan-2-al`) or old-style ones that
 * could only be its (`1-butanal`) are TILE_ORDER, and the old-style locants
 * of `2-butenal` are the segment's; after a ring or `benceno` it is
 * TILE_ORDER too (their –CHO is `carbaldehído`; `bencenal`). How many –CHO a
 * chain can take (two ends) and where a ketone's C=O can be (a carbon with
 * two carbon neighbours) need the chemistry: build.js CARBONYL_POSITION.
 * `oxo` is a one-atom group like a halogen, its oxygen double-bonded
 * (`4-oxopentanal`, `(2-oxoetil)`); `formil` a retained branch word, the –CHO
 * bonded by its carbon (`(4-formilciclohexil)`; `oxi` after it, or `formil`
 * as a group of an ether's class name, are TILE_ORDER with their hints);
 * `benzaldehído` a whole-word parent like `fenol`, its –CHO at carbon 1
 * (groupWordOf(): no suffix, numbers or letter of its own; it counts as one
 * of the two positions of an orto/meta/para letter, `p-clorobenzaldehído`).
 *
 * The acyl prefixes (R-5c2) name a branch whose carbon bonded to what it
 * hangs from is a C=O carbon, as the engine writes them (render.js
 * acylEndingTokens(), ringCarbonylTokens()): the acyl ending stands where a
 * branch's `il` stands (the chain node's `fv`, a tile of kind 'acyl'), after
 * the branch's own ending as in a parent's name — `oil` after a chain
 * (`prop ano oil`: `propanoil`, the chain's carbon 1 the C=O carbon; `but 2
 * eno oil`: `(but-2-enoil)`), with no locant of its own (its C=O is always
 * its carbon 1), and `carbonil` after a `ciclo` ring (`ciclo hex ano
 * carbonil`: `(ciclohexanocarbonil)`, the C=O carbon outside the ring, bonded
 * to its carbon 1; `ciclo hex 2 eno 1 carbonil`: `(ciclohex-2-eno-1-carbonil)`,
 * the locant 1 written as the engine writes it). Either without the ending
 * before it (`prop oil`), `oil` on a ring, `carbonil` on a chain and numbers
 * before `oil` are TILE_ORDER, each with its hint, and so is `oxi` after an
 * acyl branch (an ester's prefix, R-6a) and an acyl group in an ether's class
 * name. `acetil` (CH₃–CO–, the engine's word for the unsubstituted acyl of
 * two carbons) is a retained word like `formil`, and `benzoil` (the benzene
 * ring bonded to a C=O carbon) one like `fenil`, which takes prefixes of its
 * own inside a compound branch (`START 4 met il benzoil END`:
 * `(4-metilbenzoil)`); an acyl tile anywhere else is TILE_ORDER.
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
 * The retained carbonyl templates (R-5c3a, tiles.js TEMPLATES with
 * `suffix`) say where their C=O is, so numbers or a letter on them are
 * TEMPLATE_LOCANTS too («acetona» ya dice dónde va su grupo C=O, en el
 * carbono 2…), the ftalaldehídos' two –CHO counting as occupied positions for
 * the letters as a diol's OH groups do; `formaldehído`, `acetaldehído`,
 * `acetona`, `acetofenona` and `fenilacetaldehído` are open chains, so a
 * letter on a prefix before them is POSITIONAL as before any chain.
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
 *            substituent: chain|retained|halogen|hydroxy|carbonyl|branch|null}` (null: numbers, a
 *            letter or a multiplier with nothing after them yet; `letter` the
 *            o / m / p tile, R-4c)
 * - chain   `{type: 'chain', ring: number|null, root: number|null, ano:
 *            number|null, segments: segment[], fvLocants: number[], fv:
 *            number|null, oxi: number|null}` (`ring` the `ciclo` tile of a
 *            ring, else null; `root` null only after a `ciclo` with no root,
 *            RING_ROOT; a branch's chain has `fv` — `il` / `iliden`, or the
 *            acyl ending `oil` / `carbonil`, R-5c2 —; the parent's has none;
 *            `oxi` the alkoxy ending after `fv`, R-5b)
 * - segment `{locants: number[], multiplier: number|null, ending: number}`
 * - retained `{type: 'retained', tile, oxi: number|null}` (`oxi` the alkoxy ending after it, R-5b)
 * - halogen `{type: 'halogen', tile}` (a halogen tile, R-5a1)
 * - hydroxy `{type: 'hydroxy', tile}` (the `hidroxi` tile, R-5a2)
 * - carbonyl `{type: 'carbonyl', tile}` (the `oxo` tile, R-5c1)
 * - branch  `{type: 'branch', start, items: (prefix|stray)[], chain:
 *            chain|retained|null, end: number|null}` (`chain` is the
 *            branch's own simple chain, cited last; `end` null while open)
 * - parent  `{type: 'parent', legacy: number[], letter: number|null, legacyMultiplier:
 *            number|null, legacySegment: number|null, legacySuffix: boolean,
 *            chain: chain|benzene|template|classWord, suffix: suffix|null}`
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
 *            `ol` tile with its locants and multiplier, R-5a2; `al`, `ona`,
 *            `carbaldehído`, R-5c1)
 * - benzene `{type: 'benzene', tile}` (the `benceno` tile, R-4b; also the
 *            `fenol` tile, R-5a2, value 'phenol', and the `benzaldehído`
 *            tile, R-5c1, value 'benzaldehyde': groupWordOf())
 * - template `{type: 'template', tile}` (a retained template tile, R-4c)
 * - classWord `{type: 'classWord', tile}` (the `éter` tile of a functional-class name, R-5b2: the
 *            name-level prefixes are its groups; locants, a letter or a
 *            multiplier before it stay in the parent node, out of place)
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
 * o / m / p letter where it has no meaning, design.md §14.4), and for the
 * ether class names (R-5b2) ETHER_GROUPS (not exactly two groups before
 * `éter`).
 * The structural codes (LOCANT_RANGE, BOND_RANGE, SAME_BOND, VALENCE,
 * TOO_BIG) need the chemistry and belong to R-1b. The Spanish messages are
 * drafts pending teacher review (design.md §15, last paragraph); their
 * example words come from the lexicon.
 */

import {
  stem, multiplier, compoundMultiplier, ENDINGS, FREE_VALENCE_SUFFIXES, ENCLOSING_MARKS, CONNECTING_VOWEL,
  MAX_MULTIPLIER, RING_PREFIX, BENZENE_NAME, RETAINED_PREFIXES, POSITIONAL_LETTERS, GROUP_SUFFIXES, GROUP_PREFIXES,
  HALOGEN_PREFIXES, ALKOXY_ENDING, ETHER_CLASS_WORD, RING_GROUP_SUFFIXES, FORMYL_PREFIX, ACYL_ENDING, RING_CARBONYL_ENDING,
  BENZOYL_PREFIX,
} from '../naming/lexicon.es.js';
import {
  toTiles, TEMPLATES, templateGroupWord, groupPlural, tileById, POSITIONAL_IDS, PHENOL_ID, isAtomGroup, closingText,
  isPhenolTemplate, withArticle, ALKOXY_RETAINED, ETHER_CLASS_GROUPS, SUFFIX_GROUPS, GROUP_WORD_PARENTS, BENZALDEHYDE_ID,
  isAcylTile, templateSuffix, isCarbonylTemplate, isChainTemplate,
} from './tiles.js';
import { itemText, isAlkoxyNode, isCompoundAlkoxy, alkoxyCore } from './assemble.js';

/**
 * The syntactic error codes of design.md §15.6 handled by the parser (RING_ROOT, RING_SIZE from R-4a; BENZENE_BONDS
 * from R-4b; TEMPLATE_LOCANTS, POSITIONAL from R-4c; ETHER_GROUPS from R-5b2).
 */
export const ERROR_CODES = Object.freeze([
  'EMPTY', 'NO_PARENT', 'ROOT_END', 'ENDS_WITH_BRANCH', 'BRANCH_OPEN', 'LOCANT_COUNT', 'LEGACY', 'TILE_ORDER',
  'RING_ROOT', 'RING_SIZE', 'BENZENE_BONDS', 'TEMPLATE_LOCANTS', 'POSITIONAL', 'ETHER_GROUPS',
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
const BENZALDEHIDO = tileById(BENZALDEHYDE_ID).text;
const AL = GROUP_SUFFIXES.aldehyde;
const ONA = GROUP_SUFFIXES.ketone;
const CARBALDEHIDO = RING_GROUP_SUFFIXES.aldehyde;
const OXO = GROUP_PREFIXES.ketone;
const ANO = ENDINGS.saturated;
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
  // R-5c1: the aldehydes and ketones.
  butanal: `${stem(4)}${ANO.slice(0, -1)}${AL}`,
  butanodial: `${stem(4)}${ANO}${multiplier(2)}${AL}`,
  pentan2ona: `${stem(5)}${ANO.slice(0, -1)}-2-${ONA}`,
  pentanodiona: `${stem(5)}${ANO}-2,4-${multiplier(2)}${ONA}`,
  ciclohexanocarbaldehido: `${RING_PREFIX}${stem(6)}${ANO}${CARBALDEHIDO}`,
  bencenodicarbaldehido: `${BENZENE_NAME}-1,4-${multiplier(2)}${CARBALDEHIDO}`,
  oxoetil: `${OPEN}2-${OXO}${stem(2)}${IL}${CLOSE}`,
  formilfenil: `${OPEN}4-${FORMYL_PREFIX}${FENIL}${CLOSE}`,
  // R-5c2: the acyl prefixes.
  propanoil: `${stem(3)}${ANO.slice(0, -1)}${ACYL_ENDING}`,
  butenoil: `${OPEN}${stem(4)}-2-${ENDINGS.double.slice(0, -1)}${ACYL_ENDING}${CLOSE}`,
  ciclohexanocarbonil: `${OPEN}${RING_PREFIX}${stem(6)}${ANO}${RING_CARBONYL_ENDING}${CLOSE}`,
  etilMetilEter: `${stem(2)}${IL} ${stem(1)}${IL} ${ETHER_CLASS_WORD}`,
  dietilEter: `${multiplier(2)}${stem(2)}${IL} ${ETHER_CLASS_WORD}`,
  cloroetilEter: `${OPEN}2-${HALOGEN_PREFIXES.Cl}${stem(2)}${IL}${CLOSE} ${stem(1)}${IL} ${ETHER_CLASS_WORD}`,
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
  phenolBranch: `«${FENOL}» es el nombre de toda la molécula y va al final; dentro de una rama, el anillo con su grupo OH `
    + `se escribe con «${HIDROXI}» y «${FENIL}», como en ${EXAMPLES.hidroxifenil}.`,
  closing: `«${closingText('n')}» es el número del enlace que cierra un anillo, del último carbono al 1, y solo va delante `
    + `de «${ENDINGS.double}» o «${ENDINGS.triple}» de un anillo (${EXAMPLES.ciclohexenotriol}).`,
  alkoxy: `«${ALKOXY_ENDING}» va justo detrás de una rama acabada en «${IL}», y la une a la cadena por un oxígeno: `
    + `${stem(1)}, ${IL} y ${ALKOXY_ENDING} dan ${EXAMPLES.metoxi}; también detrás de «${RETAINED_PREFIXES.isopropyl.text}», `
    + `«${RETAINED_PREFIXES['tert-butyl'].italic}${RETAINED_PREFIXES['tert-butyl'].text}» o «${FENIL}» (${EXAMPLES.isopropoxi}), `
    + `y en una rama compuesta, antes de cerrarla: ${EXAMPLES.metilpropoxi}.`,
  // R-5b2: the functional-class names of ethers.
  classWord: `«${ETHER_CLASS_WORD}» va al final del nombre, detrás de los dos grupos unidos al oxígeno (${EXAMPLES.etilMetilEter}); `
    + `dentro de una rama, el oxígeno se escribe con «${ALKOXY_ENDING}» (${EXAMPLES.metoxi}).`,
  afterClassWord: `el nombre termina con «${ETHER_CLASS_WORD}»; los dos grupos unidos al oxígeno van delante `
    + `(${EXAMPLES.etilMetilEter}).`,
  classLocant: `en un nombre con «${ETHER_CLASS_WORD}» no hay cadena principal que numerar: los grupos no llevan números `
    + `delante (${EXAMPLES.etilMetilEter}). Si un grupo lleva sus propias ramas, va en una rama compuesta, con sus números `
    + `dentro: ${EXAMPLES.cloroetilEter}.`,
  classMultiplier: `«${multiplier(2)}» va delante del grupo que se repite: ${multiplier(2)}, ${stem(2)}, ${IL} y `
    + `${ETHER_CLASS_WORD} dan ${EXAMPLES.dietilEter}.`,
  classAlkoxy: `en un nombre con «${ETHER_CLASS_WORD}», el oxígeno ya lo dice «${ETHER_CLASS_WORD}»: los grupos acaban en `
    + `«${IL}», sin «${ALKOXY_ENDING}» (${EXAMPLES.etilMetilEter}).`,
  // R-5c1: the aldehydes and ketones.
  alRing: `«${AL}» solo va detrás de una cadena: en un anillo, el grupo CHO va unido a un carbono del anillo y se escribe `
    + `«${CARBALDEHIDO}» (${EXAMPLES.ciclohexanocarbaldehido}).`,
  alBenzene: `«${AL}» no va detrás de «${BENZENE_NAME}»: el ${BENZENE_NAME} con un grupo CHO es el «${BENZALDEHIDO}», y con `
    + `varios se usa «${CARBALDEHIDO}» (${EXAMPLES.bencenodicarbaldehido}).`,
  alLocants: `el grupo CHO de «${AL}» va siempre en un extremo de la cadena, en el carbono 1 (y en el último, con `
    + `«${multiplier(2)}${AL}»), así que «${AL}» no lleva números: ${EXAMPLES.butanal}, ${EXAMPLES.butanodial}.`,
  benzaldehydeBranch: `«${BENZALDEHIDO}» es el nombre de toda la molécula y va al final; dentro de una rama, el anillo es `
    + `«${FENIL}» y su grupo CHO se escribe «${FORMYL_PREFIX}», como en ${EXAMPLES.formilfenil}.`,
  formylAlkoxy: `«${ALKOXY_ENDING}» no va detrás de «${FORMYL_PREFIX}»: un grupo CHO unido a un oxígeno no forma un éter.`,
  classFormyl: `«${FORMYL_PREFIX}» no va en un nombre con «${ETHER_CLASS_WORD}»: un grupo CHO unido al oxígeno no forma un `
    + `éter. Los dos grupos de un éter son cadenas o anillos de carbonos (${EXAMPLES.etilMetilEter}).`,
  // R-5c2: the acyl prefixes.
  oilEnding: `delante de «${ACYL_ENDING}» va la terminación de la rama, como en la cadena principal: ${stem(3)}, ${ANO} y `
    + `${ACYL_ENDING} dan ${EXAMPLES.propanoil}; ${stem(4)}, 2, ${ENDINGS.double} y ${ACYL_ENDING} dan ${EXAMPLES.butenoil}.`,
  carbonilEnding: `delante de «${RING_CARBONYL_ENDING}» va el nombre del anillo con su terminación: ${RING_PREFIX}, ${stem(6)}, `
    + `${ANO} y ${RING_CARBONYL_ENDING} dan ${EXAMPLES.ciclohexanocarbonil}.`,
  oilRing: `en un anillo, el grupo C=O unido a él se escribe con «${RING_CARBONYL_ENDING}», detrás del nombre del anillo: `
    + `${EXAMPLES.ciclohexanocarbonil}; el del ${BENZENE_NAME} es «${BENZOYL_PREFIX}».`,
  carbonilChain: `«${RING_CARBONYL_ENDING}» va detrás del nombre de un anillo: ${EXAMPLES.ciclohexanocarbonil}; en una cadena, la `
    + `rama acaba en «${ACYL_ENDING}»: ${EXAMPLES.propanoil}.`,
  oilLocants: `«${ACYL_ENDING}» no lleva números: su grupo C=O está siempre en el carbono 1 de la rama, el que se une a la cadena `
    + `(${EXAMPLES.propanoil}, ${EXAMPLES.butenoil}).`,
  benzeneAcyl: `«${BENZENE_NAME}» es el anillo principal y va al final del nombre; como rama unida a un grupo C=O, el ${BENZENE_NAME} `
    + `se escribe «${BENZOYL_PREFIX}».`,
});

/**
 * The TILE_ORDER hint of an acyl ending out of place (R-5c2): `oil` after a
 * chain's ending, `carbonil` after a ring's name; `benzoil` for the benzene
 * ring.
 *
 * @param {{value: string}} tile - The `oil` (value 'chain') or `carbonil` (value 'ring') tile.
 * @returns {string} The hint.
 */
function acylHint(tile) {
  if (tile.value === 'ring') {
    return `«${RING_CARBONYL_ENDING}» va justo detrás del nombre de un anillo con su terminación: ${RING_PREFIX}, ${stem(6)}, ${ANO} `
      + `y ${RING_CARBONYL_ENDING} dan ${EXAMPLES.ciclohexanocarbonil}; para el ${BENZENE_NAME} se usa «${BENZOYL_PREFIX}», y para `
      + `una cadena, «${ACYL_ENDING}» (${EXAMPLES.propanoil}).`;
  }
  return `«${ACYL_ENDING}» va justo detrás de la terminación de una rama, y la une a la cadena por su carbono 1, el del grupo `
    + `C=O: ${stem(3)}, ${ANO} y ${ACYL_ENDING} dan ${EXAMPLES.propanoil}; para un anillo se usa «${RING_CARBONYL_ENDING}» `
    + `(${EXAMPLES.ciclohexanocarbonil}) y para el ${BENZENE_NAME}, «${BENZOYL_PREFIX}».`;
} // End of function acylHint()

/**
 * The TILE_ORDER hint of `oxi` after an acyl branch (R-5c2): a C=O carbon
 * bonded to an oxygen is an ester's, not an ether's.
 *
 * @param {string} word - The acyl word or ending before it, as on its tile (`acetil`, `oil`…).
 * @returns {string} The hint.
 */
function acylAlkoxyHint(word) {
  return `«${ALKOXY_ENDING}» no va detrás de «${word}»: un grupo C=O unido a un oxígeno no forma un éter.`;
}

/**
 * The TILE_ORDER hint of an acyl group written as a group of an ether's class
 * name (R-5c2), as `formil`'s (R-5c1).
 *
 * @param {string} word - The acyl word or ending, as on its tile.
 * @returns {string} The hint.
 */
function classAcylHint(word) {
  return `«${word}» no va en un nombre con «${ETHER_CLASS_WORD}»: un grupo C=O unido al oxígeno no forma un éter. Los dos `
    + `grupos de un éter son cadenas o anillos de carbonos (${EXAMPLES.etilMetilEter}).`;
}

/**
 * The TILE_ORDER hint of a suffix tile out of place (R-5a2: `ol`; R-5c1:
 * `al`, `ona`, `carbaldehído`): it goes at the end of the name, after the
 * parent's ending; in a branch the group is a prefix.
 *
 * @param {{text: string, value: string}} tile - The suffix tile.
 * @returns {string} The hint.
 */
function suffixHint(tile) {
  switch (tile.value) {
    case 'aldehyde':
      return `«${AL}» va al final del nombre, detrás de la terminación de la cadena principal (${EXAMPLES.butanal}, `
        + `${EXAMPLES.butanodial}); en una rama, el grupo CHO se escribe con «${OXO}» (${EXAMPLES.oxoetil}) o, si su carbono no `
        + `es de la rama, con «${FORMYL_PREFIX}».`;
    case 'ketone':
      return `«${ONA}» va al final del nombre, detrás de la terminación de la cadena principal (${EXAMPLES.pentan2ona}, `
        + `${EXAMPLES.pentanodiona}); en una rama, el grupo C=O se escribe «${OXO}».`;
    case 'carbaldehyde':
      return `«${CARBALDEHIDO}» va al final del nombre, detrás del nombre del anillo principal `
        + `(${EXAMPLES.ciclohexanocarbaldehido}); en una rama, el grupo CHO se escribe «${FORMYL_PREFIX}».`;
    default:
      return HINTS.suffix;
  }
} // End of function suffixHint()

/**
 * The TILE_ORDER hint of `bis`, `tris`… before a suffix (R-5a2, R-5c1): a
 * suffix takes `di`, `tri`….
 *
 * @param {string} word - The suffix as on its tile (`ol`, `ona`…).
 * @returns {string} The hint.
 */
function cmultSuffixHint(word) {
  return `delante de «${word}» va «${multiplier(2)}», «${multiplier(3)}»…, no «${compoundMultiplier(2)}» ni `
    + `«${compoundMultiplier(3)}».`;
}

/**
 * Tells whether a suffix node is the aldehyde suffix `al` (R-5c1), whose
 * –CHO sits at an end of a chain by rule (tiles.js SUFFIX_GROUPS
 * `terminal`): it takes no locants.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object|null} suffix - A suffix node, or null.
 * @returns {boolean} True for `al`.
 */
export function isTerminalSuffix(tiles, suffix) {
  return Boolean(suffix) && SUFFIX_GROUPS[tiles[suffix.tile].value].terminal;
}

/**
 * The TILE_ORDER hint of a one-atom group (`cloro`, `hidroxi`) written as a
 * group of an ether's class name (R-5b2): the oxygen of `éter` carries two
 * carbon groups; a halogen or an OH goes inside a compound branch.
 *
 * @param {string} word - The group's word, as on its tile.
 * @returns {string} The hint.
 */
function classAtomGroupHint(word) {
  return `«${word}» no es un grupo de carbonos: en un nombre con «${ETHER_CLASS_WORD}», el oxígeno lleva dos grupos de `
    + `carbonos (${EXAMPLES.etilMetilEter}). Si un grupo lleva «${word}», va en una rama compuesta: ${EXAMPLES.cloroetilEter}.`;
}

/**
 * The TILE_ORDER hint of a doubly bonded branch (`iliden`, `isopropiliden`)
 * written as a group of an ether's class name (R-5b2): the oxygen takes
 * single bonds only.
 *
 * @param {string} word - The free-valence suffix or retained word, as on its tile.
 * @returns {string} The hint.
 */
function classDoubleHint(word) {
  return `en un éter, cada grupo se une al oxígeno por un enlace sencillo, así que acaba en «${IL}» `
    + `(${EXAMPLES.etilMetilEter}), no en «${word}».`;
}

/**
 * The ETHER_GROUPS message (R-5b2): an ether's class name has two groups
 * before `éter`, or one with `di` when both are the same.
 *
 * @param {number} count - The groups the name gives (multipliers counted).
 * @returns {string} The message.
 */
function etherGroupsMessage(count) {
  const both = `por orden alfabético (${EXAMPLES.etilMetilEter}), o uno solo con «${multiplier(2)}» delante si los dos son `
    + `iguales (${EXAMPLES.dietilEter})`;
  if (count === 0) {
    return `Delante de «${ETHER_CLASS_WORD}» van los dos grupos unidos al oxígeno, ${both}.`;
  }
  const written = count === 1 ? 'solo pone uno' : `pone ${numberWord(count)}`;
  return `Un éter lleva ${numberWord(ETHER_CLASS_GROUPS)} grupos unidos al oxígeno y tu nombre ${written}: escribe dos, ${both}.`;
} // End of function etherGroupsMessage()

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
 * How the messages call the principal group a template's word places, by
 * its SUFFIX_GROUPS key (templateSuffix()): the OH of a retained phenol
 * (R-5a3a), the –CHO of `formaldehído` or of a ftalaldehído and the C=O of
 * `acetona` (R-5c3a; GROUP_WORD_PARENTS: «grupo CHO»).
 */
const PLACED_GROUP_WORDS = Object.freeze({
  alcohol: Object.freeze({ one: PHENOL_GROUP, many: PHENOL_GROUPS }),
  aldehyde: Object.freeze({ one: GROUP_WORD_PARENTS.benzaldehyde.group, many: 'grupos CHO' }),
  carbaldehyde: Object.freeze({ one: GROUP_WORD_PARENTS.benzaldehyde.group, many: 'grupos CHO' }),
  ketone: Object.freeze({ one: 'grupo C=O', many: 'grupos C=O' }),
});

/**
 * The principal group a whole-word benzene parent places at its carbon 1
 * (tiles.js GROUP_WORD_PARENTS): the OH of `fenol` (R-5a2), the –CHO of
 * `benzaldehído` (R-5c1); null for `benceno` and any other node.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A chain, benzene, template or classWord node.
 * @returns {{suffix: string, group: string}|null} The group's SUFFIX_GROUPS key and its name in the messages, or null.
 */
export function groupWordOf(tiles, node) {
  return node.type === 'benzene' ? GROUP_WORD_PARENTS[tiles[node.tile].value] || null : null;
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
 * and for `cresol` its OH at 1 and its methyl where the letter says), the
 * OH of `fenol` at 1 (R-5a2) or the –CHO of `benzaldehído` at 1 (R-5c1:
 * «grupo CHO»); null for `benceno` and any other parent.
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
    const { count, positions, letterOnly } = TEMPLATES[tile.value];
    const group = templateGroupWord(tile.value);
    const suffix = templateSuffix(tile.value); // The OH groups of R-5a3a; the C=O of a carbonyl template (R-5c3a).
    const placed = suffix ? suffix.positions : [];
    const kinds = [
      ...(suffix ? [{ count: placed.length, ...PLACED_GROUP_WORDS[suffix.value] }] : []),
      ...(count > 0 ? [{ count, one: group, many: groupPlural(group) }] : []), // `metilos`; `grupos metoxi` (R-5b)
    ];
    return {
      count: count + placed.length,
      // `acetofenona` (R-5c3a): its C=O and its phenyl both on carbon 1, one position.
      positions: positions && [...new Set([...placed, ...positions])].sort((a, b) => a - b),
      kinds,
      letterOnly: Boolean(letterOnly),
      word: tile.text,
    };
  }
  const placed = groupWordOf(tiles, chain); // `fenol` (R-5a2), `benzaldehído` (R-5c1)
  if (placed) {
    const many = placed.group.replace(/^grupo /, 'grupos ');
    return { count: 1, positions: [1], kinds: [{ count: 1, one: placed.group, many }], letterOnly: false, word: tiles[chain.tile].text };
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
  if (where === 'branch' && tile.kind === 'template' && isCarbonylTemplate(tile.value)) {
    // `acetona`, `ftalaldehído` (R-5c3a): their C=O is written as a prefix there.
    return `«${tile.text}» es el nombre de toda la molécula y va al final; dentro de una rama, el grupo C=O se escribe `
      + `«${OXO}» y el grupo CHO, «${FORMYL_PREFIX}», como en ${EXAMPLES.oxoetil} o ${EXAMPLES.formilfenil}.`;
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
  if (before.value === 'formyl') {
    addTileOrder(state, oxi, oxi + 1, HINTS.formylAlkoxy); // `formil oxi` (R-5c1): an ester's prefix, not an ether's
  } else if (isAcylTile(before)) {
    addTileOrder(state, oxi, oxi + 1, acylAlkoxyHint(before.text)); // `acetil oxi`, `propanoil oxi` (R-5c2): an ester's too
  } else if (!single) {
    addTileOrder(state, oxi, oxi + 1, alkoxyAfterDoubleHint(before.text)); // `metiliden oxi`, `isopropiliden oxi`
  }
  return oxi;
} // End of function takeAlkoxy()

/**
 * Parses a chain from its stem — a root, or `ciclo` and a root for a ring
 * (RING_ROOT when no root follows `ciclo`, RING_SIZE for a ring of fewer
 * than MIN_RING carbons) —, then `ano` or unsaturation segments, then the
 * free-valence locant and suffix of a branch when they follow — or an acyl
 * ending, `oil` or `carbonil` (R-5c2, checkAcyl()) —, and the alkoxy ending
 * `oxi` after them (R-5b).
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
  if (at(state, 'freeValence') || at(state, 'acyl')) {
    chain.fvLocants = nums;
    chain.fv = state.pos;
    state.pos += 1;
    if (nums.length > 1) {
      addError(state, 'LOCANT_COUNT', nums[0], nums[nums.length - 1] + 1,
        `Una rama se une a la cadena por un solo carbono: delante de «${tiles[chain.fv].text}» va un solo número.`);
    }
    if (tiles[chain.fv].kind === 'acyl') {
      checkAcyl(state, chain); // `propanoil`, `ciclohexanocarbonil` (R-5c2)
    } else if (chain.ano !== null && nums.length === 0) {
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
 * Checks the acyl ending of a branch (R-5c2; its `fv` tile, of kind
 * 'acyl'): `oil` after a chain, `carbonil` after a `ciclo` ring, each after
 * the branch's own ending (`propanoil`, `ciclohexanocarbonil`), `oil` with
 * no number of its own (its C=O is its carbon 1); TILE_ORDER otherwise,
 * with its hint. A `ciclo` without its root already has RING_ROOT.
 *
 * @param {object} state - Parser state.
 * @param {object} chain - The branch's chain node, its `fv` the acyl tile.
 * @returns {void}
 */
function checkAcyl(state, chain) {
  const { fv } = chain;
  const ring = state.tiles[fv].value === 'ring';
  if (chain.root === null) {
    return;
  }
  if (ring !== (chain.ring !== null)) {
    addTileOrder(state, fv, fv + 1, ring ? HINTS.carbonilChain : HINTS.oilRing); // `prop ano carbonil`, `ciclo hex ano oil`
  } else if (!chainEnded(chain)) {
    addTileOrder(state, fv, fv + 1, ring ? HINTS.carbonilEnding : HINTS.oilEnding); // `prop oil`, `ciclo hex carbonil`
  } else if (!ring && chain.fvLocants.length > 0) {
    const nums = chain.fvLocants;
    addTileOrder(state, nums[0], nums[nums.length - 1] + 1, HINTS.oilLocants); // `prop ano 1 oil`
  }
} // End of function checkAcyl()

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
 * Parses the suffix after a parent's ending, when there is one (R-5a2:
 * `ol`; R-5c1: `al`, `ona`, `carbaldehído`): `[locants] [MULT] suffix`,
 * looking ahead so that numbers or a multiplier without a suffix after them
 * are left for what follows (tiles out of place after the parent). `bis`,
 * `tris`… before the suffix are TILE_ORDER; the locant count must match the
 * multiplier (LOCANT_COUNT; a list left out, or given before the root in the
 * old style, is not checked here; `al`'s place is makeParent()'s).
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
    addTileOrder(state, mult, mult + 1, cmultSuffixHint(tiles[suffix.tile].text));
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
 * Builds the parent node, with its suffix when one follows (R-5a2: `ol`;
 * R-5c1: `al`, `ona`, `carbaldehído`), and checks its old-style locants
 * (design.md §15.5.1 `legacy`): allowed only when exactly one locant list is
 * left open among the segments and the suffix, and their count matches its
 * multiplier (`2-buteno`, `2-propanol`, `1,2-etanodiol`, `2-pentanona`); any
 * other allocation is LEGACY (`2-butenol`: two lists left open). A
 * multiplier between them and the root is out of place. The aldehyde
 * suffix `al` (R-5c1) sits at the ends of a chain by rule, so it has no
 * locant list to leave open (`2-butenal` is `but-2-enal`), and locants of
 * its own, or old-style ones that could only be its, are TILE_ORDER
 * (`butan-1-al`, `1-butanal`); after a `ciclo` ring it is TILE_ORDER too
 * (the ring's –CHO is `carbaldehído`).
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
  // `al` (R-5c1): on a ring the –CHO is `carbaldehído`; on a chain it sits at the ends by rule and takes no locants.
  const terminal = isTerminalSuffix(tiles, suffix);
  if (terminal && chain.ring !== null) {
    addTileOrder(state, suffix.tile, suffix.tile + 1, HINTS.alRing); // `ciclohexanal`
  } else if (terminal && suffix.locants.length > 0) {
    addTileOrder(state, suffix.locants[0], suffix.locants[suffix.locants.length - 1] + 1, HINTS.alLocants); // `butan-1-al`
  }
  if (legacy.length > 0 && chainEnded(chain)) {
    const open = chain.segments.map((segment, i) => (segment.locants.length === 0 ? i : -1)).filter((i) => i >= 0);
    const suffixOpen = Boolean(suffix) && suffix.locants.length === 0 && !terminal; // `al` has no list to open (R-5c1).
    if (open.length === 1 && !suffixOpen && multiplierCount(tiles, chain.segments[open[0]].multiplier) === legacy.length) {
      parent.legacySegment = open[0]; // `2-buteno`; `2-butenal` (R-5c1).
    } else if (open.length === 0 && suffixOpen && multiplierCount(tiles, suffix.multiplier) === legacy.length) {
      parent.legacySuffix = true; // `2-propanol`, `1,2-etanodiol` (R-5a2); `2-pentanona` (R-5c1).
    } else if (open.length === 0 && terminal) {
      addTileOrder(state, legacy[0], legacy[legacy.length - 1] + 1, HINTS.alLocants); // `1-butanal` (R-5c1)
    } else {
      addError(state, 'LEGACY', legacy[0], legacy[legacy.length - 1] + 1, MESSAGES.LEGACY);
    }
  }
  return parent;
} // End of function makeParent()

/**
 * Builds the parent node of `benceno` (R-4b), `fenol` (R-5a2) or
 * `benzaldehído` (R-5c1), the tile at the parser position. `benceno` takes a
 * suffix (`benceno-1,2-diol`, `bencenohexol`; R-5c1: `bencenocarbaldehído`,
 * `benceno-1,4-dicarbaldehído`; `al` is TILE_ORDER there, the ring's –CHO
 * being `carbaldehído`); numbers or a multiplier before it are
 * BENZENE_BONDS (its double bonds are never numbered) — unless they are the
 * old-style locants of a suffix written without its own (`1,2-bencenodiol`)
 * —, kept in the node as `legacy` so the tree stays lossless; a letter
 * before it is out of place (checkLetters()). `fenol` places its own OH at
 * carbon 1, and `benzaldehído` its –CHO, so numbers or a letter before them
 * are TEMPLATE_LOCANTS and a multiplier TILE_ORDER; they take no suffix.
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
  const placed = Boolean(groupWordOf(tiles, chain)); // `fenol` (R-5a2), `benzaldehído` (R-5c1)
  const suffix = placed ? null : parseSuffix(state);
  const parent = {
    type: 'parent', legacy, letter, legacyMultiplier: mult, legacySegment: null, legacySuffix: false, chain, suffix, range: [start, state.pos],
  };
  if (isTerminalSuffix(tiles, suffix)) {
    addTileOrder(state, suffix.tile, suffix.tile + 1, HINTS.alBenzene); // `bencenal` (R-5c1)
  }
  if (placed) {
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
 * Builds the parent node of an ether's functional-class name (R-5b2), the
 * `éter` tile at the parser position: its chain a `classWord` node; the
 * name-level prefixes read so far are its groups (checkClassName()).
 * Numbers or a letter right before `éter`, and a multiplier there, are
 * TILE_ORDER (a group takes neither; `di` goes before the group it
 * repeats), kept in the node so the tree stays lossless.
 *
 * @param {object} state - Parser state (positioned on the `éter` tile).
 * @param {number[]} legacy - Locant tiles before it.
 * @param {number|null} letter - An o / m / p tile before it, or null.
 * @param {number|null} mult - Multiplier tile before it, or null.
 * @param {number} start - First tile index of the parent.
 * @returns {object} The parent node, its chain a classWord node.
 */
function makeClassParent(state, legacy, letter, mult, start) {
  const tile = state.pos;
  state.pos += 1;
  const marks = [...legacy, ...(letter === null ? [] : [letter])];
  if (marks.length > 0) {
    addTileOrder(state, marks[0], marks[marks.length - 1] + 1, HINTS.classLocant); // `etil metil 2 éter`
  }
  if (mult !== null) {
    addTileOrder(state, mult, mult + 1, HINTS.classMultiplier); // `etil di éter`
  }
  return {
    type: 'parent',
    legacy,
    letter,
    legacyMultiplier: mult,
    legacySegment: null,
    legacySuffix: false,
    chain: { type: 'classWord', tile, range: [tile, tile + 1] },
    suffix: null,
    range: [start, state.pos],
  };
} // End of function makeClassParent()

/**
 * Keeps the groups of an ether's functional-class name (R-5b2) to what an
 * ether oxygen carries: each name-level prefix a carbon group bonded by a
 * single bond — no locants or letter, no one-atom group, no alkoxy group,
 * no `iliden` or `isopropiliden` (TILE_ORDER, each with its hint; the
 * single-bonded retained words are those that take `oxi`, ALKOXY_RETAINED)
 * — and two of them in all,
 * multipliers counted (ETHER_GROUPS over the groups and `éter`). A prefix
 * left unfinished or a stray tile already has its error.
 *
 * @param {object} state - Parser state.
 * @param {object} tree - The name tree, its parent a class-name parent.
 * @returns {void}
 */
function checkClassName(state, tree) {
  const { tiles } = state;
  const groups = tree.items.filter((item) => item.type === 'prefix' && item.substituent);
  for (const item of groups) {
    const sub = item.substituent;
    const marks = [...item.locants, ...(item.letter === null ? [] : [item.letter])];
    if (marks.length > 0) {
      addTileOrder(state, marks[0], marks[marks.length - 1] + 1, HINTS.classLocant); // `2 met il …`, `o met il …`
    }
    const core = sub.type === 'branch' ? sub.chain : sub;
    if (isAtomGroup(sub.type)) {
      addTileOrder(state, sub.tile, sub.tile + 1, classAtomGroupHint(tiles[sub.tile].text)); // `cloro metil éter`
    } else if (isAlkoxyNode(sub)) {
      const { oxi } = alkoxyCore(sub);
      addTileOrder(state, oxi, oxi + 1, HINTS.classAlkoxy); // `metoxi etil éter`
    } else if (core && core.type === 'chain' && core.fv !== null && isAcylTile(tiles[core.fv])) {
      addTileOrder(state, core.fv, core.fv + 1, classAcylHint(tiles[core.fv].text)); // `propanoil metil éter` (R-5c2)
    } else if (core && core.type === 'chain' && core.fv !== null && tiles[core.fv].value !== 1) {
      addTileOrder(state, core.fv, core.fv + 1, classDoubleHint(tiles[core.fv].text)); // `metiliden metil éter`
    } else if (core && core.type === 'retained' && tiles[core.tile].value === 'formyl') {
      addTileOrder(state, core.tile, core.tile + 1, HINTS.classFormyl); // `formil metil éter` (R-5c1)
    } else if (core && core.type === 'retained' && isAcylTile(tiles[core.tile])) {
      addTileOrder(state, core.tile, core.tile + 1, classAcylHint(tiles[core.tile].text)); // `acetil metil éter` (R-5c2)
    } else if (core && core.type === 'retained' && !ALKOXY_RETAINED.includes(tiles[core.tile].value)) {
      addTileOrder(state, core.tile, core.tile + 1, classDoubleHint(tiles[core.tile].text)); // `isopropiliden metil éter`
    }
  } // End of the loop over the groups
  const count = groups.reduce((sum, item) => sum + multiplierCount(tiles, item.multiplier), 0);
  if (count !== ETHER_CLASS_GROUPS) {
    const word = tree.parent.chain.tile;
    addError(state, 'ETHER_GROUPS', groups.length > 0 ? groups[0].range[0] : word, word + 1, etherGroupsMessage(count));
  }
} // End of function checkClassName()

/**
 * The hint of a whole-word parent (`benceno`, `fenol`, `benzaldehído`, a
 * template) found inside a compound branch.
 *
 * @param {object} tile - The tile.
 * @returns {string} The hint.
 */
function wholeWordHint(tile) {
  if (tile.kind === 'benzene') {
    return { phenol: HINTS.phenolBranch, benzaldehyde: HINTS.benzaldehydeBranch }[tile.value] || HINTS.benzeneBranch;
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
  const classInBranch = first.kind === 'classWord' && context === 'branch'; // `éter` inside a compound branch (R-5b2)
  if (['ending', 'freeValence', 'end', 'suffix', 'alkoxy', 'acyl'].includes(first.kind) || wholeWord || classInBranch) { // `oxi` alone: R-5b
    state.pos += 1;
    const hint = (first.kind === 'end' && HINTS.endWithoutBranch) || (wholeWord && wholeWordHint(first))
      || (first.kind === 'suffix' && suffixHint(first)) || (first.kind === 'acyl' && acylHint(first)) // `oil` alone (R-5c2)
      || HINTS[first.kind]; // `ona`, `al`… out of place (R-5c1)
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
  if (next && next.kind === 'classWord' && context === 'name') {
    return makeClassParent(state, locants, letter, mult, start); // `etil metil éter` (R-5b2)
  }
  if (!next || !['start', 'retained', 'halogen', 'hydroxy', 'carbonyl', 'root', 'ring'].includes(next.kind)) {
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
    prefix.substituent = { type: next.kind, tile: state.pos, range: [state.pos, state.pos + 1] }; // `cloro`, `hidroxi`, `oxo`
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
  if (chain.type === 'classWord') {
    return; // The groups of an ether's class name take no letter: checkClassName() says so (R-5b2).
  }
  if (chain.type === 'template' && isChainTemplate(tiles[chain.tile].value)) {
    // `acetona` (R-5c3a): an open chain; a letter before the word itself is its TEMPLATE_LOCANTS (makeTemplateParent()).
    lettered.forEach((holder) => report(holder.letter, holder.letter + 1, POSITIONAL_MESSAGES.notBenzene));
    return;
  }
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
    const bonds = chain.type === 'benzene' && !groupWordOf(tiles, chain)
      && tiles.slice(state.pos).every((tile) => ['num', 'mult', 'ending'].includes(tile.kind));
    // `benceno carbonil` (R-5c2): the benzene ring bonded to a C=O carbon, as a branch, is `benzoil`.
    const acyl = chain.type === 'benzene' && !groupWordOf(tiles, chain) && tiles[state.pos].kind === 'acyl';
    if (bonds) {
      addError(state, 'BENZENE_BONDS', state.pos, tiles.length, MESSAGES.BENZENE_BONDS);
    } else if (acyl) {
      addTileOrder(state, state.pos, tiles.length, HINTS.benzeneAcyl);
    } else {
      addTileOrder(state, state.pos, tiles.length, chain.type === 'classWord' ? HINTS.afterClassWord : HINTS.afterParent);
    }
  }
  if (!tree.parent) {
    checkNameEnd(state, tree);
  } else if (tree.parent.chain.type === 'classWord') {
    checkClassName(state, tree); // `etil metil éter` (R-5b2)
  }
  checkLetters(state, tree);
  checkClosing(state, tree);
  const errors = state.errors.map((error, i) => ({ error, i }))
    .sort((a, b) => a.error.from - b.error.from || a.i - b.i)
    .map(({ error }) => error);
  return { tree, errors };
} // End of function parse()
