/**
 * @file Builder of «¿Cómo se dibuja?» (design.md §15.4, §15.6; phases R-1b,
 * R-4a, R-4b, R-4c, R-5a1, R-5a2, R-5a3a, R-5b, R-5b2, R-5c1, R-5c2, R-5c3a, R-5d1, R-6a1, R-6a2a, R-6a2b, R-6b1, R-6c1): a NameSpec (interpret.js) and one placement — a value for each
 * left-out slot — become a molecule (model/molecule.js), or a structural
 * error with the offending tiles. Pure, no DOM; atoms are created without
 * meaningful coordinates (the UI lays the molecule out, design.md §15.2).
 *
 * A ring (parent or branch, kind 'ring') is built as its chain of carbons
 * closed by bond n, which joins carbon n to carbon 1 (design.md §15.5.3:
 * ring bonds 1…n), so a multiple bond on bond n is the closing one and
 * never out of range. A benzene ring (`benceno`, kind 'benzene'; `fenil`,
 * kind 'phenyl'; R-4b) is a ring of six carbons drawn in one Kekulé form,
 * double bonds on bonds 1, 3 and 5: which of the two forms is drawn never
 * matters, since search.js merges and maps structures up to it
 * (model/graph.js aromaticKey(), aromaticIsomorphism()). The ring's own
 * double bonds belong to the ring, like its single bonds, so a VALENCE
 * error blames the locant that adds a fourth bond too many, never the
 * `benceno` tile. A phenyl hangs by its carbon 1; its own prefixes go on
 * carbons 2…6 (a locant 1 there is LOCANT_RANGE with its own message).
 * A retained template (R-4c: `tolueno`, `estireno`, `xileno`, `mesitileno`)
 * is the benzene ring with its own groups (templateGroups(), interpret.js
 * TemplateSpec) attached like prefixes, before the student's; a group the
 * template places by rule belongs to the ring like its double bonds, so a
 * student's branch on that carbon is the VALENCE culprit, with a message
 * that says the template already put a group there.
 * A halogen (R-5a1, kind 'halogen') is one atom of its element bonded by a
 * single bond to its carbon: it adds one bond to that carbon (so
 * `pentaclorometano` is VALENCE) and is never a carbon itself (it counts
 * for the heavy-atom cap, not for the carbon cap or the chains); so is the
 * oxygen of `hidroxi` (R-5a2, kind 'hydroxy', its hydrogen implicit).
 * The alcohol suffix (R-5a2, NameSpec `suffix`) puts one OH oxygen on each
 * of its parent carbons, single-bonded, after the parent is built and
 * before its prefixes; the OH of `fenol`, placed at carbon 1 by the word, is
 * the ring's own like a template's group (a student's branch on that carbon
 * is the VALENCE culprit, «…en el fenol, ese carbono ya lleva un grupo OH»),
 * and so are the OH groups of a retained phenol (R-5a3a: «…en el catecol,
 * ese carbono ya lleva un grupo OH»), whose methyl (`cresol`) is a template
 * group placed by its letter.
 * The suffix's oxygens count for the heavy-atom cap and are listed in
 * `suffixAtoms`. The aldehydes and ketones (R-5c1) put a double-bonded
 * oxygen there instead: `ona` on its carbons (a carbon that ends up bonded
 * to fewer than two carbons is CARBONYL_POSITION, ketoneEndError():
 * `propan-1-ona` would be propanal, `1-feniletan-1-ona` is right), `al` on
 * the ends of the chain by rule (more groups than ends is CARBONYL_POSITION,
 * checkSuffix(); the end carbon remembers the rule for the VALENCE message,
 * which blames the student's locant that overloads it:
 * `1,1,1-tricloroetanal`); `carbaldehído` and `benzaldehído` a new carbon
 * single-bonded to the parent's carbon with the =O on it (one more carbon
 * and two more heavy atoms per group; `benzaldehído`'s –CHO, placed at 1 by
 * the word, is the ring's own like `fenol`'s OH). `oxo` (R-5c1) is a
 * one-atom group whose oxygen is double-bonded to its carbon (two bonds of
 * it), and `formil` a retained word: one carbon with its =O.
 * The carboxylic acids (R-5d1) are built as the aldehydes, with an OH
 * single-bonded beside the =O on the group's carbon (SuffixSpec `hydroxy`):
 * `oico` at the ends of the chain by rule (the carbon gets three bonds from
 * its –COOH; more groups than ends is CARBONYL_POSITION, worded for the
 * –COOH; the VALENCE note of an end carbon names «oico»), `carboxílico` and
 * `benzoico` a new carbon outside the parent with its =O and its OH (one more
 * carbon and three more heavy atoms per group; `benzoico`'s, placed at 1 by
 * the word, the ring's own, «…en el ácido benzoico, ese carbono ya lleva un
 * grupo COOH»); `carboxi` is a retained word, one carbon with its =O and its
 * OH, bonded by that carbon.
 * The esters (R-6a1) are built as the acids, with the bridge oxygen
 * single-bonded beside the =O on the group's carbon (SuffixSpec `bridge`,
 * suffixAtoms `bridge` / `bridgeBond`) in place of the OH: `oato` at the ends
 * of the chain by rule (more groups than ends is CARBONYL_POSITION, worded for
 * the –COO–; the VALENCE note of an end carbon names «oato»), `carboxilato`
 * and `benzoato` a new carbon outside the parent («…en el benzoato, ese
 * carbono ya lleva un grupo COO»). Each O-bound group (NameSpec `ester`) is
 * then built as a branch and bonded by its free-valence carbon to the bridge
 * oxygen of its –COO– (attachEsterGroups(), `esterAtoms`); its carbons and
 * atoms count for the caps, its rings for ringRefusal() (`benzoato de
 * fenilo`: two rings, keyed), and its messages name «el grupo unido al
 * oxígeno» (LOCANT_RANGE, BOND_RANGE, VALENCE). A retained ester word
 * (R-6a2a: `formiato`, `acetato`, `fenilacetato`) is a chain template whose
 * –COO–, placed at carbon 1 by the word, is the chain's own like `acético`'s
 * –COOH («…en el acetato, ese carbono ya lleva un grupo COO»).
 * The nitriles (R-6b1) are built as the aldehydes, with a nitrogen
 * triple-bonded to the group's carbon in place of the =O (tiles.js
 * suffixElement()): `nitrilo` at the ends of the chain by rule (the carbon
 * gets three bonds from its –C≡N; more groups than ends is
 * CARBONYL_POSITION, worded for the –C≡N; the VALENCE note of an end carbon
 * names «nitrilo»), `carbonitrilo` and `benzonitrilo` a new carbon outside the
 * parent with its nitrogen (one more carbon and two more heavy atoms per
 * group; `benzonitrilo`'s, placed at 1 by the word, the ring's own, «…en el
 * benzonitrilo, ese carbono ya lleva un grupo C≡N»); `ciano` is a retained
 * word, one carbon with its nitrogen, bonded by that carbon. A retained
 * nitrile word (R-6b2: `acetonitrilo`, `fenilacetonitrilo`, a chain template
 * whose –C≡N, placed at carbon 1 by the word, is the chain's own like
 * `acético`'s –COOH, «…en el acetonitrilo, ese carbono ya lleva un grupo
 * C≡N»; `ftalonitrilo`, two outside the ring like `ftálico`'s) is built the
 * same way.
 * The amines (R-6c1) are built as the alcohols, with a nitrogen
 * single-bonded to the group's carbon in place of the OH (`amina`; tiles.js
 * suffixElement()); a name-level prefix whose slot is `N` (tiles.js N_VALUE)
 * is bonded to that nitrogen — the first amine group's, the only one the
 * engine names with groups on it (more amine groups with an `N` are its
 * `substitutedPolyamine` refusal, read from the name by polyamineRefusal()
 * even beside a senior group) — instead of a parent carbon. The nitrogen
 * holds three bonds (tiles.js NITROGEN_VALENCE), so a third group on it is VALENCE,
 * blamed on the `N` that adds it («El nitrógeno de la amina tendría 4
 * enlaces, y un nitrógeno solo puede tener 3.»). Which groups may stand on
 * it is the engine's: a halogen, an oxygen or a double bond there is a
 * molecule it refuses (`outOfScope`), an acyl group makes an amide it names.
 * An alkoxy prefix (R-5b, SubstituentSpec `alkoxy`) is its branch built as
 * any other — chain, ring, phenyl or retained word, with its own prefixes —
 * and then an ether oxygen, created last, bonded by single bonds to the
 * branch's free-valence carbon and to the carbon the prefix hangs from: the
 * oxygen is the occurrence's `attachment`, it counts for the heavy-atom cap
 * (never for the carbon cap or the chains), its two bonds are within its
 * valence, and the branch's carbon gets the bond to it as it would get the
 * bond to the chain (VALENCE). A ring bonded through an ether oxygen is not
 * bonded atom to atom to the ring it hangs from (ringRefusal():
 * `fenoxibenceno` has a structural key; the engine refuses it, two rings).
 * `anisol` (R-5b) is a template whose methoxy group is built that way.
 * An acyl prefix (R-5c2, SubstituentSpec `acyl`) is its branch built as any
 * other and then its C=O (acylCarbonyl()): on a chain (`propanoil`) an
 * oxygen double-bonded to the chain's carbon 1, the carbon bonded to what
 * the branch hangs from (two bonds of it, blamed on the `oil` tile, which
 * the VALENCE message names: `(prop-1-enoil)` would give that carbon five);
 * on a ring (`(ciclohexanocarbonil)`, `benzoil`) a new carbon single-bonded
 * to the ring's free-valence carbon, with the =O on it, which is the
 * occurrence's `attachment` (one more carbon and two more heavy atoms per
 * occurrence). `acetil` is a retained word, two carbons with the =O on the
 * one bonded to the chain. A ring bonded through that carbon is not bonded
 * atom to atom to the ring it hangs from (`benzoilbenceno` has a structural
 * key; the engine refuses it, two rings).
 * The ester prefixes (R-6a2b) are built from those two: an acyloxy prefix
 * (SubstituentSpec `acyl` and `alkoxy`: `acetiloxi`, `propanoiloxi`,
 * `benzoiloxi`) is its acyl branch with its C=O, then the ether oxygen bonded
 * to the C=O carbon, the oxygen the occurrence's `attachment`; an
 * alkoxycarbonyl prefix (`alkoxy` and `alkoxycarbonyl`: `metoxicarbonil`) its
 * alkoxy group with its ether oxygen, then a new C=O carbon single-bonded to
 * that oxygen with its =O (esterCarbonyl(); one more carbon and two more
 * heavy atoms per occurrence), the carbon the occurrence's `attachment`.
 * Neither can overload a carbon of its own beyond what its branch does, and
 * a ring inside one is bonded to what it hangs from through an oxygen or a
 * C=O carbon, never atom to atom (ringRefusal()).
 * An ether's functional-class name (R-5b2, ParentSpec kind 'ether': `etil
 * metil éter`) is built from its oxygen: the parent is that one atom
 * (etherOxygen(); `studentParent` lists it alone), its two groups attached
 * to it as prefixes, each by a single bond (parse.js keeps `iliden` out).
 * The oxygen counts for the heavy-atom cap, never for the carbons
 * (parentCarbons()).
 *
 * The molecule is the student's reading, numbered as the student numbered
 * it: `studentParent` lists the parent's atoms in the student's locant
 * order, `prefixAtoms` the atoms of each prefix occurrence and `suffixAtoms`
 * the oxygen of each suffix group (for the highlights and the diagnosis of
 * later phases).
 *
 * Structural errors (design.md §15.6; Spanish drafts pending teacher
 * review), each `{code, message, tiles: [from, to)}`, checked in this order:
 *
 * 1. In tile order: a retained word given prefixes of its own inside a
 *    compound branch (`TILE_ORDER`, it has no numbering); a locant beyond
 *    its chain or ring (`LOCANT_RANGE`; the chain of the prefix, the
 *    branch's own chain inside a branch, the branch for its free-valence
 *    locant, the parent for a suffix's locant); a multiple bond from the
 *    last carbon of a chain (`BOND_RANGE`,
 *    also any multiple bond on a one-carbon chain; on a ring that is the
 *    closing bond); two multiple bonds on one bond (`SAME_BOND`). An
 *    `iliden` is the double bond to the carbon it hangs from, so it counts
 *    in the valence below.
 * 2. `TOO_BIG`, the engine's caps (model/validate.js) checked before
 *    building and naming: more than MAX_CARBONS carbons, then more than
 *    MAX_HEAVY_ATOMS atoms (halogens included, R-5a1; both counted on the
 *    NameSpec), then, once built, a chain longer than MAX_CHAIN (with a
 *    ring, a side chain longer than MAX_CHAIN, as the engine counts it).
 * 3. `VALENCE`: a carbon with more than four bonds; the tiles are those of
 *    the locant (or `il` / `iliden`) whose bond takes it over four, adding
 *    the bonds in tile order. Then (R-5c1) `CARBONYL_POSITION`: a ketone's
 *    C=O (`ona`) on a carbon bonded to fewer than two carbons
 *    (ketoneEndError()); the –CHO groups of `al` beyond the chain's ends are
 *    checked with the ranges (checkSuffix()).
 *
 * checkSpec() runs step 1 and the carbon count without a placement, so a
 * name with left-out locants still gets its definite errors before
 * search.js fills the left-out slots (R-1c), which also uses
 * attachmentOrder() to prune by valence.
 *
 * ringRefusal() is no structural error but a limit of the app: a name that
 * describes more rings than MAX_KEYED_RINGS (`diciclohexilciclohexano`,
 * `trifenilmetano`), or a ring bonded straight to another ring
 * (`ciclohexilciclohexano`, `ciclohexilidenciclohexano`, `fenilbenceno`,
 * `fenilciclohexano`), gives a molecule with no structural key
 * (model/graph.js canonicalKey() keys two rings only when no atom of one is
 * bonded to the other), which the engine refuses anyway (RING_SYSTEM,
 * several rings); readName() answers `outOfScope` with the engine's own
 * message before any search.
 */

import { createMolecule, addAtom, addBond, setBondOrder, bondOrderSum, CARBON_VALENCE } from '../model/molecule.js';
import {
  MAX_CARBONS, MAX_HEAVY_ATOMS, MAX_CHAIN, MESSAGES as VALIDATION_MESSAGES, RING_SYSTEM_MESSAGES, TOO_MANY_ATOMS_MESSAGE,
  SUBSTITUTED_POLYAMINE_MESSAGE, SUBSTITUTED_BENZENE_POLYAMINE_MESSAGE, longestCarbonChain, longestSideChain,
} from '../model/validate.js';
import {
  BENZENE_NAME, RETAINED_PREFIXES, GROUP_SUFFIXES, ENDINGS, HALOGEN_PREFIXES, ACYL_ENDING, ENCLOSING_MARKS, FREE_VALENCE_SUFFIXES, stem,
  multiplier, SUFFIX_CLASS_WORDS, ESTER_LINK, ESTER_ALKYL_ENDING,
} from '../naming/lexicon.es.js';
import {
  templateGroupWord, isAtomGroup, atomGroupOrder, closingText, HYDROXY_ELEMENT, ALKOXY_ELEMENT, OXO_ELEMENT, SUFFIX_GROUPS,
  GROUP_WORD_PARENTS, withArticle, suffixBondAmount, ACID_KIND, ACID_GROUP, ESTER_KIND, ESTER_GROUP, NITRILE_KIND, NITRILE_GROUP,
  suffixElement, AMINE_KIND, N_VALUE, AMINE_NITROGEN, NITROGEN_VALENCE,
} from './tiles.js';

/**
 * The structural error codes of design.md §15.6 (TILE_ORDER reused for a retained word with prefixes; R-5c1:
 * CARBONYL_POSITION, a C=O of a suffix where its group cannot be).
 */
export const BUILD_ERROR_CODES = Object.freeze([
  'TILE_ORDER', 'LOCANT_RANGE', 'BOND_RANGE', 'SAME_BOND', 'VALENCE', 'TOO_BIG', 'CARBONYL_POSITION',
]);

/** The element of the carbon an outside suffix group adds (R-5c1: the –CHO of `carbaldehído`, `benzaldehído`). */
const CARBON = 'C';

/** The element of the nitrogen of `ciano`'s –C≡N (R-6b1), as tiles.js suffixElement() gives a nitrile suffix's. */
const NITRILE_NITROGEN = suffixElement(SUFFIX_GROUPS[NITRILE_KIND]);

/**
 * Atoms of the retained branch words (design.md §4.5), numbered as their
 * systematic names: isopropil = propan-2-il, isopropiliden =
 * propan-2-iliden, tert-butil = 2-metilpropan-2-il; and `formil` (R-5c1),
 * the –CHO: one carbon with its =O. `attach` is the carbon with the free
 * valence, `order` its bond order, `methyls` the carbons that carry one more
 * methyl, `oxo` those that carry a double-bonded oxygen, `hydroxy` those that
 * carry an OH (R-5d1: `carboxi`, the –COOH bonded by its carbon), `nitrile`
 * those that carry a triple-bonded nitrogen (R-6b1: `ciano`, the –C≡N bonded
 * by its carbon).
 */
const NONE = Object.freeze([]);
const ONE = Object.freeze([1]);
const RETAINED_TEMPLATES = Object.freeze({
  isopropyl: Object.freeze({ length: 3, attach: 2, order: 1, methyls: NONE, oxo: NONE, hydroxy: NONE, nitrile: NONE }),
  isopropylidene: Object.freeze({ length: 3, attach: 2, order: 2, methyls: NONE, oxo: NONE, hydroxy: NONE, nitrile: NONE }),
  'tert-butyl': Object.freeze({ length: 3, attach: 2, order: 1, methyls: Object.freeze([2]), oxo: NONE, hydroxy: NONE, nitrile: NONE }),
  // R-5c1: `formil`, the –CHO bonded by its carbon (the engine's one-carbon acyl group with its =O at 1, I-39b).
  formyl: Object.freeze({ length: 1, attach: 1, order: 1, methyls: NONE, oxo: ONE, hydroxy: NONE, nitrile: NONE }),
  // R-5c2: `acetil`, CH₃–CO– bonded by its C=O carbon (the engine's two-carbon acyl group, I-39b).
  acetyl: Object.freeze({ length: 2, attach: 1, order: 1, methyls: NONE, oxo: ONE, hydroxy: NONE, nitrile: NONE }),
  // R-5d1: `carboxi`, the –COOH bonded by its carbon (the engine's carboxy prefix, I-40b).
  carboxy: Object.freeze({ length: 1, attach: 1, order: 1, methyls: NONE, oxo: ONE, hydroxy: ONE, nitrile: NONE }),
  // R-6b1: `ciano`, the –C≡N bonded by its carbon (the engine's cyano prefix, I-39a: its carbon never a chain carbon).
  cyano: Object.freeze({ length: 1, attach: 1, order: 1, methyls: NONE, oxo: NONE, hydroxy: NONE, nitrile: ONE }),
});

/** Spanish words of the bond orders in the messages. */
const BOND_WORDS = Object.freeze({ 2: 'doble', 3: 'triple' });

/**
 * Most rings a molecule built from a name may have and still be compared by
 * structure: model/graph.js canonicalKey() keys trees, monocycles and two
 * separate rings only (the engine names one ring, or two across an ester).
 */
export const MAX_KEYED_RINGS = 2;

/**
 * A structural error.
 *
 * @param {string} code - Error code.
 * @param {string} message - Spanish message.
 * @param {[number, number]} tiles - Tile range `[from, to)`.
 * @returns {{code: string, message: string, tiles: [number, number]}} The error.
 */
function buildError(code, message, tiles) {
  return { code, message, tiles: [tiles[0], tiles[1]] };
}

/**
 * «1 carbono», «5 carbonos».
 *
 * @param {number} n - A count.
 * @returns {string} The count with its noun.
 */
function carbons(n) {
  return `${n} ${n === 1 ? 'carbono' : 'carbonos'}`;
}

/** The `fenil` word in the messages (lexicon RETAINED_PREFIXES). */
const FENIL = `${RETAINED_PREFIXES.phenyl.italic}${RETAINED_PREFIXES.phenyl.text}`;

/**
 * The LOCANT_RANGE message (design.md §15.6): «La cadena de 5 carbonos va
 * del 1 al 5: no hay carbono 7.»; «La rama…» inside a branch; «El anillo de
 * 6 carbonos va del 1 al 6…», «El anillo de la rama va del 1 al 6…» for a
 * ring; «El benceno tiene 6 carbonos, del 1 al 6…» for `benceno` (R-4b).
 *
 * @param {{length: number, branch: boolean, ring?: boolean, benzene?: boolean, template?: string|null}} owner - The chain
 *   or ring numbered (`template`: the word of a template parent, R-4c: «El anillo del xileno tiene 6 carbonos…», or of
 *   `fenol`, R-5a2; «El anillo de la hidroquinona…», R-5a3a; of a chain template, R-5c3a: «La cadena de la acetona tiene 3
 *   carbonos…», chainTemplateRangeMessage()).
 * @param {number} value - The locant.
 * @returns {string} The message.
 */
function rangeMessage(owner, value) {
  if (owner.oBound) {
    return oBoundRangeMessage(owner, value); // An ester's O-bound group (R-6a1)
  }
  if (owner.template && !owner.ring && !owner.benzene) {
    return chainTemplateRangeMessage(owner, value); // `acetona` (R-5c3a)
  }
  if (owner.template) {
    return `El anillo ${withArticle(owner.template, 'de')} tiene ${carbons(owner.length)}, del 1 al ${owner.length}: `
      + `no hay carbono ${value}.`;
  }
  if (owner.benzene && !owner.branch) {
    return `El ${BENZENE_NAME} tiene ${carbons(owner.length)}, del 1 al ${owner.length}: no hay carbono ${value}.`;
  }
  if (owner.ring) {
    const noun = owner.branch ? 'El anillo de la rama' : `El anillo de ${carbons(owner.length)}`;
    return `${noun} va del 1 al ${owner.length}: no hay carbono ${value}.`;
  }
  const noun = owner.branch ? 'La rama' : 'La cadena';
  if (owner.length === 1) {
    return `${noun} de 1 carbono solo tiene el carbono 1: no hay carbono ${value}.`;
  }
  return `${noun} de ${carbons(owner.length)} va del 1 al ${owner.length}: no hay carbono ${value}.`;
}

/**
 * The LOCANT_RANGE message of an ester's O-bound group (R-6a1; drafts
 * pending teacher review): «El grupo unido al oxígeno tiene 3 carbonos, del
 * 1 al 3: no hay carbono 5.», «El anillo del grupo unido al oxígeno va del 1
 * al 6…», «…solo tiene el carbono 1…» for a one-carbon group.
 *
 * @param {{length: number, ring?: boolean}} owner - The O-bound group's chain or ring.
 * @param {number} value - The locant.
 * @returns {string} The message.
 */
function oBoundRangeMessage(owner, value) {
  if (owner.ring) {
    return `El anillo del grupo unido al oxígeno va del 1 al ${owner.length}: no hay carbono ${value}.`;
  }
  if (owner.length === 1) {
    return `El grupo unido al oxígeno tiene 1 carbono: no hay carbono ${value}.`;
  }
  return `El grupo unido al oxígeno tiene ${carbons(owner.length)}, del 1 al ${owner.length}: no hay carbono ${value}.`;
} // End of function oBoundRangeMessage()

/**
 * The systematic names the LOCANT_RANGE message of a chain template whose
 * word holds a ring (R-5c3a) offers for a group on that ring, by TEMPLATES
 * key: `1-(4-metilfenil)etan-1-ona`, `2-(4-metilfenil)etanal`; R-5d2: `ácido
 * 2-(4-metilfenil)etanoico` for `fenilacético`; R-6a2a: `2-(4-metilfenil)etanoato
 * de metilo` for `fenilacetato`; R-6b2: `2-(4-metilfenil)etanonitrilo` for
 * `fenilacetonitrilo` (the `o` of `etano` kept before the consonant).
 */
const RING_TEMPLATE_EXAMPLES = Object.freeze({
  acetophenone: `1-${ENCLOSING_MARKS[0][0]}4-${stem(1)}${FREE_VALENCE_SUFFIXES[1]}${FENIL}${ENCLOSING_MARKS[0][1]}`
    + `${stem(2)}${ENDINGS.saturated.slice(0, -1)}-1-${GROUP_SUFFIXES.ketone}`,
  phenylacetaldehyde: `2-${ENCLOSING_MARKS[0][0]}4-${stem(1)}${FREE_VALENCE_SUFFIXES[1]}${FENIL}${ENCLOSING_MARKS[0][1]}`
    + `${stem(2)}${ENDINGS.saturated.slice(0, -1)}${GROUP_SUFFIXES.aldehyde}`,
  phenylaceticAcid: `${SUFFIX_CLASS_WORDS[ACID_KIND]} 2-${ENCLOSING_MARKS[0][0]}4-${stem(1)}${FREE_VALENCE_SUFFIXES[1]}${FENIL}`
    + `${ENCLOSING_MARKS[0][1]}${stem(2)}${ENDINGS.saturated.slice(0, -1)}${GROUP_SUFFIXES[ACID_KIND]}`,
  phenylacetate: `2-${ENCLOSING_MARKS[0][0]}4-${stem(1)}${FREE_VALENCE_SUFFIXES[1]}${FENIL}${ENCLOSING_MARKS[0][1]}${stem(2)}`
    + `${ENDINGS.saturated.slice(0, -1)}${GROUP_SUFFIXES[ESTER_KIND]}${ESTER_LINK}${stem(1)}${FREE_VALENCE_SUFFIXES[1]}${ESTER_ALKYL_ENDING}`,
  phenylacetonitrile: `2-${ENCLOSING_MARKS[0][0]}4-${stem(1)}${FREE_VALENCE_SUFFIXES[1]}${FENIL}${ENCLOSING_MARKS[0][1]}${stem(2)}`
    + `${ENDINGS.saturated}${GROUP_SUFFIXES[NITRILE_KIND]}`,
});

/**
 * The LOCANT_RANGE message of a chain template (R-5c3a; drafts pending
 * teacher review): «La cadena de la acetona tiene 3 carbonos, del 1 al 3: no
 * hay carbono 4.», «El formaldehído solo tiene 1 carbono: no hay carbono 2.»;
 * for one whose word holds a ring too (`acetofenona`, `fenilacetaldehído`:
 * RING_TEMPLATE_EXAMPLES) it adds that the name does not number the ring and
 * gives the systematic name with a group on it, which the app reads.
 *
 * @param {{length: number, template: string, templateValue?: string|null}} owner - The chain template's parent
 *   (`template`: its word; `templateValue`: its TEMPLATES key).
 * @param {number} value - The locant.
 * @returns {string} The message.
 */
function chainTemplateRangeMessage(owner, value) {
  const lead = withArticle(owner.template);
  const base = owner.length === 1
    ? `${lead.charAt(0).toUpperCase()}${lead.slice(1)} solo tiene 1 carbono: no hay carbono ${value}.`
    : `La cadena ${withArticle(owner.template, 'de')} tiene ${carbons(owner.length)}, del 1 al ${owner.length}: no hay carbono ${value}.`;
  const example = RING_TEMPLATE_EXAMPLES[owner.templateValue];
  return example
    ? `${base} En «${owner.template}» el anillo no se numera: con grupos en el anillo, escribe el nombre sistemático (${example}).`
    : base;
}

/**
 * The value of a slot: its own, or the placement's for a left-out slot
 * (null when there is none yet).
 *
 * @param {object} slot - A Slot (interpret.js).
 * @param {Map<object, number>|null} values - Placement values by slot, or null.
 * @returns {number|null} The value.
 */
function slotValue(slot, values) {
  if (slot.kind !== 'leftOut') {
    return slot.value;
  }
  return values && values.has(slot) ? values.get(slot) : null;
}

/**
 * Checks a carbon slot against its chain: within it, and on a phenyl
 * (R-4b, role `phenylCarbon`) not on carbon 1, the one bonded to what the
 * phenyl hangs from (below the slot's domain; on `benzoil`, R-5c2, the one
 * bonded to its C=O carbon).
 *
 * @param {object} slot - A carbon Slot.
 * @param {{length: number, branch: boolean, word?: string|null, acyl?: boolean}} owner - The chain it numbers (`word`: a
 *   phenyl's own word, `fenil` or `benzoil`; `acyl`: a ring bonded through a C=O carbon).
 * @param {Map<object, number>|null} values - Placement values, or null.
 * @returns {object|null} A LOCANT_RANGE error, or null.
 */
function checkCarbon(slot, owner, values) {
  const value = slotValue(slot, values);
  if (value === null || (value >= slot.domain[0] && value <= owner.length)) {
    return null;
  }
  if (value >= 1 && value <= owner.length) {
    const word = owner.word || FENIL;
    let joined = owner.acyl ? 'al grupo C=O' : 'a la cadena';
    joined = owner.oBound ? 'al oxígeno' : joined; // `fenilo` (R-6a1): the ester's O-bound phenyl.
    return buildError('LOCANT_RANGE', `En «${word}», el carbono 1 es el que se une ${joined}: `
      + `las ramas del ${word} van en los carbonos del ${slot.domain[0]} al ${owner.length}.`, slot.tiles);
  }
  return buildError('LOCANT_RANGE', rangeMessage(owner, value), slot.tiles);
} // End of function checkCarbon()

/**
 * Checks the multiple-bond slots of a chain or ring in tile order: each
 * within it (LOCANT_RANGE beyond its last carbon; on a chain BOND_RANGE
 * from its last carbon or on a one-carbon chain, while bond n of a ring is
 * its closing bond) and no bond taken twice (SAME_BOND, the tiles from the
 * first slot to the second).
 *
 * @param {{length: number, branch: boolean, ring?: boolean, double: object[], triple: object[]}} owner - The chain or ring.
 * @param {Map<object, number>|null} values - Placement values, or null.
 * @returns {object|null} The first error, or null.
 */
function checkBonds(owner, values) {
  const slots = [...owner.double.map((slot) => ({ slot, order: 2 })), ...owner.triple.map((slot) => ({ slot, order: 3 }))]
    .sort((p, q) => p.slot.tiles[0] - q.slot.tiles[0]);
  const taken = new Map();
  for (const { slot, order } of slots) {
    const empty = slot.domain[0] > slot.domain[1];
    const value = empty && slot.kind === 'leftOut' ? 1 : slotValue(slot, values);
    if (value === null) {
      continue; // A left-out slot not placed yet.
    }
    if (value > owner.length) {
      return buildError('LOCANT_RANGE', rangeMessage(owner, value), slot.tiles);
    }
    if (value === owner.length && !owner.ring) {
      let noun = owner.branch ? 'la rama' : 'la cadena';
      noun = owner.oBound ? 'el grupo unido al oxígeno' : noun; // R-6a1
      return buildError('BOND_RANGE', `El enlace ${BOND_WORDS[order]} del carbono ${value} iría al carbono ${value + 1}, `
        + `y ${noun} solo tiene ${carbons(owner.length)}.`, slot.tiles);
    }
    if (taken.has(value)) {
      const first = taken.get(value);
      const where = slot.closing ? closingText(slot.closing) : value; // `1(6)` as written (R-5a2).
      return buildError('SAME_BOND', `Hay dos enlaces múltiples en el mismo sitio (${where}).`, [first.tiles[0], slot.tiles[1]]);
    }
    taken.set(value, slot);
  } // End of the loop over the bond slots
  return null;
} // End of function checkBonds()

/**
 * Checks the prefixes hanging from a chain, in tile order: each prefix's
 * carbon slots, then its substituent.
 *
 * @param {object[]} prefixes - PrefixSpecs.
 * @param {{length: number, branch: boolean, ring?: boolean}} owner - The chain or ring they hang from.
 * @param {Map<object, number>|null} values - Placement values, or null.
 * @returns {object|null} The first error, or null.
 */
function checkPrefixes(prefixes, owner, values) {
  for (const prefix of prefixes) {
    for (const slot of prefix.slots) {
      const error = checkCarbon(slot, owner, values);
      if (error) {
        return error;
      }
    }
    const error = checkSubstituent(prefix.substituent, values);
    if (error) {
      return error;
    }
  } // End of the loop over the prefixes
  return null;
} // End of function checkPrefixes()

/**
 * Checks a branch in tile order: a retained word with prefixes of its own,
 * then its prefixes, multiple bonds and free-valence locant (a one-atom
 * group, R-5a1 / R-5a2, has none of them).
 *
 * @param {object} sub - A SubstituentSpec.
 * @param {Map<object, number>|null} values - Placement values, or null.
 * @returns {object|null} The first error, or null.
 */
function checkSubstituent(sub, values) {
  if (isAtomGroup(sub.kind)) {
    return null;
  }
  if (sub.kind === 'retained') {
    if (sub.prefixes.length === 0) {
      return null;
    }
    // `acetil` (R-5c2): with branches of its own, the group is written from `etanoil`, `(2-cloroetanoil)`.
    const acetyl = sub.retained === ACETYL ? ` Con ramas propias, el grupo se escribe a partir de «${ACETYL_WORDS.etanoil}», como en `
      + `${ACETYL_WORDS.cloroetanoil}.` : '';
    return buildError('TILE_ORDER', `Esta ficha no puede ir aquí: «${sub.word.text}» ya es una rama entera y no lleva `
      + `números ni ramas propias.${acetyl}`, sub.word.tiles);
  }
  const owner = {
    length: sub.length, branch: true, ring: isRing(sub.kind), double: sub.double, triple: sub.triple,
    word: sub.word && sub.word.text, acyl: sub.acyl, // `benzoil` (R-5c2): its carbon 1 is bonded to the C=O carbon.
    oBound: Boolean(sub.oBound), // An ester's O-bound group (R-6a1): its messages say so.
  };
  return checkPrefixes(sub.prefixes, owner, values) || checkBonds(owner, values)
    || checkCarbon(sub.freeValence.slot, owner, values);
} // End of function checkSubstituent()

/** The retained acyl word `acetil` (R-5c2), by its SubstituentSpec `retained` value (tiles.js ACYL_RETAINED). */
const ACETYL = 'acetyl';

/** Words of the TILE_ORDER message of `acetil` with prefixes of its own (R-5c2), from the lexicon. */
const ACETYL_WORDS = Object.freeze({
  etanoil: `${stem(2)}${ENDINGS.saturated.slice(0, -1)}${ACYL_ENDING}`,
  cloroetanoil: `${ENCLOSING_MARKS[0][0]}2-${HALOGEN_PREFIXES.Cl}${stem(2)}${ENDINGS.saturated.slice(0, -1)}${ACYL_ENDING}`
    + `${ENCLOSING_MARKS[0][1]}`,
});

/**
 * Tells whether a branch is an acyl prefix of a ring (R-5c2: `carbonil`,
 * `benzoil`): its C=O carbon is outside the ring, one more carbon.
 *
 * @param {object} sub - A SubstituentSpec.
 * @returns {boolean} True for a ring bonded through a C=O carbon.
 */
function isRingAcyl(sub) {
  return Boolean(sub.acyl) && isRing(sub.kind);
}

/**
 * Carbons of a branch, its own prefixes included (none for a one-atom
 * group: a halogen, R-5a1; `hidroxi`, R-5a2; the C=O carbon of a ring's
 * acyl prefix, R-5c2, outside the ring).
 *
 * @param {object} sub - A SubstituentSpec.
 * @returns {number} The count.
 */
function substituentCarbons(sub) {
  if (isAtomGroup(sub.kind)) {
    return 0;
  }
  if (sub.kind === 'retained') {
    const template = RETAINED_TEMPLATES[sub.retained];
    return template.length + template.methyls.length + esterCarbonCount(sub); // `isopropoxicarbonil` (R-6a2b)
  }
  // `ciclohexanocarbonil` (R-5c2); the C=O carbon of an alkoxycarbonyl prefix (R-6a2b).
  return sub.length + prefixCarbons(sub.prefixes) + (isRingAcyl(sub) ? 1 : 0) + esterCarbonCount(sub);
}

/**
 * The C=O carbon an alkoxycarbonyl prefix adds (R-6a2b, SubstituentSpec
 * `alkoxycarbonyl`: `metoxicarbonil`), outside the alkoxy group; none for
 * any other branch.
 *
 * @param {object} sub - A SubstituentSpec.
 * @returns {number} 1 or 0.
 */
function esterCarbonCount(sub) {
  return sub.alkoxycarbonyl ? 1 : 0;
}

/**
 * Carbons of a list of prefixes, each counted as often as its multiplier says.
 *
 * @param {object[]} prefixes - PrefixSpecs.
 * @returns {number} The count.
 */
function prefixCarbons(prefixes) {
  return prefixes.reduce((sum, prefix) => sum + prefix.slots.length * substituentCarbons(prefix.substituent), 0);
}

/**
 * Atoms build() creates for one occurrence of a branch, its own prefixes
 * included: its carbons, one atom per one-atom group (a halogen, R-5a1;
 * the oxygen of `hidroxi`, R-5a2), the ether oxygen of an alkoxy prefix
 * (R-5b), the =O of an acyl prefix (R-5c2; with its C=O carbon on a
 * ring) and the heteroatoms of a retained word (`formil`'s =O; `carboxi`'s =O
 * and OH, R-5d1; `ciano`'s nitrogen, R-6b1).
 *
 * @param {object} sub - A SubstituentSpec.
 * @returns {number} The count.
 */
function substituentAtoms(sub) {
  if (isAtomGroup(sub.kind)) {
    return 1;
  }
  // The ether oxygen of an alkoxy prefix (R-5b); the =O of an alkoxycarbonyl prefix's C=O carbon (R-6a2b), counted by
  // substituentCarbons().
  const oxygen = (sub.alkoxy ? 1 : 0) + esterCarbonCount(sub);
  if (sub.kind === 'retained') {
    // The =O of `formil` (R-5c1); the =O and the OH of `carboxi` (R-5d1); the N of `ciano` (R-6b1).
    const template = RETAINED_TEMPLATES[sub.retained];
    return substituentCarbons(sub) + template.oxo.length + template.hydroxy.length + template.nitrile.length + oxygen;
  }
  // R-5c2: the =O of `propanoil`, `benzoil`, and the C=O carbon of a ring's acyl prefix.
  const acyl = (sub.acyl ? 1 : 0) + (isRingAcyl(sub) ? 1 : 0);
  return sub.length + prefixAtomCount(sub.prefixes) + oxygen + acyl + esterCarbonCount(sub); // R-6a2b: the C=O carbon
}

/**
 * Atoms of a list of prefixes, each counted as often as its multiplier says.
 *
 * @param {object[]} prefixes - PrefixSpecs.
 * @returns {number} The count.
 */
function prefixAtomCount(prefixes) {
  return prefixes.reduce((sum, prefix) => sum + prefix.slots.length * substituentAtoms(prefix.substituent), 0);
}

/**
 * The own groups of a NameSpec's template parent (R-4c, interpret.js
 * TemplateSpec `groups`: PrefixSpecs on the ring), or none.
 *
 * @param {object} spec - A NameSpec.
 * @returns {object[]} The PrefixSpecs.
 */
export function templateGroups(spec) {
  return spec.parent.template ? spec.parent.template.groups : [];
}

/**
 * Carbons of the molecule a NameSpec describes (independent of the
 * locants), a template's own groups included.
 *
 * @param {object} spec - A NameSpec.
 * @returns {number} The count.
 */
export function specCarbons(spec) {
  return parentCarbons(spec.parent) + prefixCarbons(spec.prefixes) + prefixCarbons(templateGroups(spec)) + suffixCarbons(spec)
    + esterTotal(spec, substituentCarbons);
}

/**
 * A count over every occurrence of an ester's O-bound groups (R-6a1,
 * NameSpec `ester`): each group's count times its multiplier; 0 without
 * them.
 *
 * @param {object} spec - A NameSpec.
 * @param {(sub: object) => number} count - Counts one occurrence (substituentCarbons(), substituentAtoms(), substituentRings()).
 * @returns {number} The total.
 */
function esterTotal(spec, count) {
  return spec.ester ? spec.ester.groups.reduce((sum, group) => sum + group.multiplier.count * count(group.substituent), 0) : 0;
}

/**
 * The carbons of a NameSpec's suffix groups (R-5c1): one per group whose
 * carbon is outside the parent (`carbaldehído`, `benzaldehído`), none for
 * the others (the OH, and the C=O of `al` and `ona`, sit on the parent's
 * carbons).
 *
 * @param {object} spec - A NameSpec.
 * @returns {number} The count.
 */
function suffixCarbons(spec) {
  return spec.suffix && spec.suffix.outside ? spec.suffix.slots.length : 0;
}

/**
 * Carbons of a NameSpec's parent: its length, or none for the oxygen of an
 * ether's functional-class name (R-5b2, kind 'ether': one atom, an oxygen).
 *
 * @param {{kind: string, length: number}} parent - A ParentSpec.
 * @returns {number} The count.
 */
function parentCarbons(parent) {
  return parent.kind === 'ether' ? 0 : parent.length;
}

/**
 * The atoms of a NameSpec's suffix groups (R-5a2: one oxygen per OH; R-5c1:
 * one per C=O of `al` and `ona`, two — the carbon and its oxygen — per –CHO
 * of `carbaldehído` and `benzaldehído`; R-5d1: one more per –COOH, its OH;
 * R-6b1: one nitrogen per –C≡N, two — with its carbon — for `carbonitrilo`
 * and `benzonitrilo`; none without a suffix).
 *
 * @param {object} spec - A NameSpec.
 * @returns {number} The count.
 */
function suffixAtomCount(spec) {
  if (!spec.suffix) {
    return 0;
  }
  // A –COOH's OH (R-5d1), a –COO–'s bridge oxygen (R-6a1): two oxygens per group.
  return spec.suffix.slots.length * (spec.suffix.hydroxy || spec.suffix.bridge ? 2 : 1) + suffixCarbons(spec);
}

/**
 * Heavy atoms of the molecule a NameSpec describes (independent of the
 * locants): its carbons, its halogens (R-5a1) and its oxygens (R-5a2:
 * `hidroxi` and the suffix's OH groups; R-5b: the ether oxygen of each
 * alkoxy prefix and of `anisol`'s methoxy; R-5b2: the oxygen parent of a
 * class name, its one atom), as model/validate.js counts them
 * against MAX_HEAVY_ATOMS.
 *
 * @param {object} spec - A NameSpec.
 * @returns {number} The count.
 */
export function specAtoms(spec) {
  return spec.parent.length + prefixAtomCount(spec.prefixes) + prefixAtomCount(templateGroups(spec)) + suffixAtomCount(spec)
    + esterTotal(spec, substituentAtoms); // An ester's O-bound groups (R-6a1)
}

/**
 * Tells whether a ParentSpec or SubstituentSpec kind is a ring: a `ciclo`
 * ring, or the benzene ring (`benceno`, `fenil`; R-4b).
 *
 * @param {string} kind - The spec's kind.
 * @returns {boolean} True for a ring.
 */
export function isRing(kind) {
  return kind === 'ring' || kind === 'benzene' || kind === 'phenyl';
}

/**
 * Tells whether a ParentSpec or SubstituentSpec kind is the benzene ring
 * (`benceno`, `fenil`; R-4b), drawn with its Kekulé double bonds.
 *
 * @param {string} kind - The spec's kind.
 * @returns {boolean} True for a benzene ring.
 */
export function isAromatic(kind) {
  return kind === 'benzene' || kind === 'phenyl';
}

/**
 * Rings of a branch, its own prefixes included.
 *
 * @param {object} sub - A SubstituentSpec.
 * @returns {number} The count.
 */
function substituentRings(sub) {
  return (isRing(sub.kind) ? 1 : 0) + prefixRings(sub.prefixes);
}

/**
 * Rings of a list of prefixes, each counted as often as its multiplier says.
 *
 * @param {object[]} prefixes - PrefixSpecs.
 * @returns {number} The count.
 */
function prefixRings(prefixes) {
  return prefixes.reduce((sum, prefix) => sum + prefix.slots.length * substituentRings(prefix.substituent), 0);
}

/**
 * Rings of the molecule a NameSpec describes (independent of the locants;
 * every ring of a name is separate, joined to the rest by one bond).
 *
 * @param {object} spec - A NameSpec.
 * @returns {number} The count.
 */
export function specRings(spec) {
  return (isRing(spec.parent.kind) ? 1 : 0) + prefixRings(spec.prefixes) + prefixRings(templateGroups(spec))
    + esterTotal(spec, substituentRings); // `benzoato de fenilo` (R-6a1): a ring on each side of the –COO–
}

/**
 * Tells whether a ring branch hangs straight from a ring — the parent or
 * another ring branch, at any depth — so that the two rings are bonded
 * atom to atom.
 *
 * @param {{prefixes: object[]}} owner - A ParentSpec with the name's prefixes, or a SubstituentSpec.
 * @param {boolean} ring - The owner is a ring.
 * @returns {boolean} True when two rings are bonded.
 */
function ringOnRing(owner, ring) {
  return owner.prefixes.some((prefix) => {
    const sub = prefix.substituent;
    // An alkoxy ring (R-5b: `fenoxi`, `(ciclohexiloxi)`) is bonded through its ether oxygen, never atom to atom; a ring's
    // acyl prefix (R-5c2: `benzoil`, `(ciclohexanocarbonil)`) through its C=O carbon.
    return (ring && isRing(sub.kind) && !sub.alkoxy && !sub.acyl) || (hasOwnChain(sub) && ringOnRing(sub, isRing(sub.kind)));
  });
}

/**
 * The engine's refusal of a name whose molecule has no structural key (file
 * header): more rings than MAX_KEYED_RINGS, or two rings bonded atom to
 * atom. Whatever the locants, it is the RING_SYSTEM message for several
 * rings (model/validate.js), which the engine gives such molecules.
 *
 * @param {object} spec - A NameSpec.
 * @returns {{code: string, message: string, tiles: [number, number]}|null} The refusal, or null.
 */
export function ringRefusal(spec) {
  // An ester's O-bound group (R-6a1) hangs from the bridge oxygen: only a ring inside it can touch another ring.
  const groups = spec.ester ? spec.ester.groups.map((group) => group.substituent).filter(hasOwnChain) : [];
  const unkeyed = specRings(spec) > MAX_KEYED_RINGS || ringOnRing({ prefixes: spec.prefixes }, isRing(spec.parent.kind))
    || groups.some((sub) => ringOnRing(sub, isRing(sub.kind)));
  return unkeyed ? buildError('RING_SYSTEM', RING_SYSTEM_MESSAGES.several, spec.tiles) : null;
}

/**
 * The engine's `substitutedPolyamine` refusal, read from the name (R-6c1): a
 * supplied `N` beside an amine suffix of two or more groups names no one
 * nitrogen — IUPAC 2013 tells them apart with N¹, N²…, which the app does
 * not write. The engine refuses such a molecule while the amine is its
 * principal group; beside a senior group (`N-metil-4-oxociclohexano-1,3-
 * diamina`) it names it, so the builder would put the group on a nitrogen
 * of its own choosing (attachSuffix() keeps the first): refused before any
 * placement instead, with the engine's message (the benzene one on
 * `benceno`).
 *
 * @param {object} spec - A NameSpec.
 * @returns {{code: string, message: string, tiles: [number, number]}|null} The refusal, or null.
 */
export function polyamineRefusal(spec) {
  const { suffix } = spec;
  if (!suffix || suffix.kind !== AMINE_KIND || suffix.slots.length < 2) {
    return null;
  }
  const named = spec.prefixes.some((prefix) => prefix.slots.some((slot) => slot.kind === 'supplied' && slot.value === N_VALUE));
  if (!named) {
    return null;
  }
  const message = spec.parent.kind === 'benzene' ? SUBSTITUTED_BENZENE_POLYAMINE_MESSAGE : SUBSTITUTED_POLYAMINE_MESSAGE;
  return buildError('HETEROATOM', message, spec.tiles);
}

/**
 * The structural errors that need no placement, or that a placement's
 * values give (design.md §15.6): retained words with prefixes, ranges (a
 * template's own locants too, R-4c), repeated bonds (left-out slots without
 * a value are skipped, except that a multiple bond on a one-carbon chain has
 * nowhere to go), the ranges of the suffix's locants (R-5a2), then the
 * carbon cap and the heavy-atom cap (halogens, R-5a1; oxygens, R-5a2).
 *
 * @param {object} spec - A NameSpec (interpret.js).
 * @param {Map<object, number>|null} [values] - Placement values by slot (none: the supplied and implicit slots only).
 * @returns {{code: string, message: string, tiles: [number, number]}|null} The first error, or null.
 */
export function checkSpec(spec, values = null) {
  const parent = {
    length: spec.parent.length,
    branch: false,
    ring: isRing(spec.parent.kind),
    benzene: spec.parent.kind === 'benzene',
    // «El anillo del xileno tiene 6 carbonos…» (R-4c); «El anillo del fenol…» (R-5a2); «…del benzaldehído…» (R-5c1).
    template: (spec.parent.template && spec.parent.template.word.text) || (spec.suffix && spec.suffix.placed ? spec.suffix.word.text : null),
    templateValue: spec.parent.template ? spec.parent.template.value : null, // `acetofenona` (R-5c3a): chainTemplateRangeMessage()
    double: spec.parent.double,
    triple: spec.parent.triple,
  };
  // The template's own groups come after the prefixes in the tiles (`4-metil-1,2-xileno`), the suffix after the parent's
  // bonds (`but-3-en-2-ol`, R-5a2).
  const error = checkPrefixes(spec.prefixes, parent, values) || checkPrefixes(templateGroups(spec), parent, values)
    || checkBonds(parent, values) || checkSuffix(spec, parent, values) || checkEsterGroups(spec, values);
  if (error) {
    return error;
  }
  if (specCarbons(spec) > MAX_CARBONS) {
    return buildError('TOO_BIG', VALIDATION_MESSAGES.TOO_BIG, spec.tiles);
  }
  if (specAtoms(spec) > MAX_HEAVY_ATOMS) {
    return buildError('TOO_BIG', TOO_MANY_ATOMS_MESSAGE, spec.tiles); // Halogens count (R-5a1).
  }
  return null;
} // End of function checkSpec()

/**
 * Checks an ester's O-bound groups in tile order (R-6a1, NameSpec `ester`):
 * each as a branch (checkSubstituent(): its own prefixes, bonds and
 * free-valence locant, the messages worded for the group bonded to the
 * oxygen).
 *
 * @param {object} spec - A NameSpec.
 * @param {Map<object, number>|null} values - Placement values, or null.
 * @returns {object|null} The first error, or null.
 */
function checkEsterGroups(spec, values) {
  for (const group of spec.ester ? spec.ester.groups : []) {
    const error = checkSubstituent(group.substituent, values);
    if (error) {
      return error;
    }
  }
  return null;
} // End of function checkEsterGroups()

/** Words of the CARBONYL_POSITION messages (R-5c1; R-5d1: the acids'; R-6a1: the esters'; R-6b1: the nitriles'), from the lexicon. */
const CARBONYL_WORDS = Object.freeze({
  al: GROUP_SUFFIXES.aldehyde,
  ona: GROUP_SUFFIXES.ketone,
  metanal: `${stem(1)}${ENDINGS.saturated.slice(0, -1)}${GROUP_SUFFIXES.aldehyde}`,
  butanodial: `${stem(4)}${ENDINGS.saturated}${multiplier(2)}${GROUP_SUFFIXES.aldehyde}`,
  oico: GROUP_SUFFIXES[ACID_KIND],
  acidoMetanoico: `${SUFFIX_CLASS_WORDS[ACID_KIND]} ${stem(1)}${ENDINGS.saturated.slice(0, -1)}${GROUP_SUFFIXES[ACID_KIND]}`,
  acidoButanodioico: `${SUFFIX_CLASS_WORDS[ACID_KIND]} ${stem(4)}${ENDINGS.saturated}${multiplier(2)}${GROUP_SUFFIXES[ACID_KIND]}`,
  oato: GROUP_SUFFIXES[ESTER_KIND],
  metanoatoDeMetilo: `${stem(1)}${ENDINGS.saturated.slice(0, -1)}${GROUP_SUFFIXES[ESTER_KIND]}${ESTER_LINK}${stem(1)}`
    + `${FREE_VALENCE_SUFFIXES[1]}${ESTER_ALKYL_ENDING}`,
  butanodioatoDeDimetilo: `${stem(4)}${ENDINGS.saturated}${multiplier(2)}${GROUP_SUFFIXES[ESTER_KIND]}${ESTER_LINK}${multiplier(2)}`
    + `${stem(1)}${FREE_VALENCE_SUFFIXES[1]}${ESTER_ALKYL_ENDING}`,
  nitrilo: GROUP_SUFFIXES[NITRILE_KIND],
  metanonitrilo: `${stem(1)}${ENDINGS.saturated}${GROUP_SUFFIXES[NITRILE_KIND]}`,
  butanodinitrilo: `${stem(4)}${ENDINGS.saturated}${multiplier(2)}${GROUP_SUFFIXES[NITRILE_KIND]}`,
});

/**
 * The CARBONYL_POSITION messages (R-5c1; drafts pending teacher review):
 * more –CHO groups of `al` than the chain has ends, and a ketone's C=O on a
 * carbon bonded to fewer than two carbons (design.md §15.5.3 step 2: «La
 * terminación «ona» va en un carbono del interior de la cadena; en un
 * extremo sería un aldehído («al»).», with the end carbon a ring or a branch
 * makes a ketone of, `1-feniletan-1-ona`).
 */
const CARBONYL_MESSAGES = Object.freeze({
  ends: (length) => (length === 1
    ? `La cadena de 1 carbono solo tiene un extremo: lleva un solo grupo CHO (${CARBONYL_WORDS.metanal}).`
    : `La cadena tiene dos extremos: con «${CARBONYL_WORDS.al}» lleva como mucho dos grupos CHO, uno en cada extremo `
      + `(${CARBONYL_WORDS.butanodial}).`),
  // R-5d1: the same for the –COOH groups of `oico`.
  acidEnds: (length) => (length === 1
    ? `La cadena de 1 carbono solo tiene un extremo: lleva un solo ${ACID_GROUP} (${CARBONYL_WORDS.acidoMetanoico}).`
    : `La cadena tiene dos extremos: con «${CARBONYL_WORDS.oico}» lleva como mucho dos grupos COOH, uno en cada extremo `
      + `(${CARBONYL_WORDS.acidoButanodioico}).`),
  ketoneEnd: `La terminación «${CARBONYL_WORDS.ona}» va en un carbono unido a otros dos carbonos, como los del interior de la `
    + `cadena; en un extremo sería un aldehído («${CARBONYL_WORDS.al}»).`,
  /** The end of VALENCE on a chain end that `al` takes by rule: «…solo puede tener 4: el grupo CHO de «al» va en ese carbono.» */
  terminalNote: `el grupo CHO de «${CARBONYL_WORDS.al}» va en ese carbono`,
  /** The same for `oico` (R-5d1): «…el grupo COOH de «oico» va en ese carbono.» */
  acidTerminalNote: `el ${ACID_GROUP} de «${CARBONYL_WORDS.oico}» va en ese carbono`,
  // R-6a1: the same for the –COO– groups of `oato`.
  esterEnds: (length) => (length === 1
    ? `La cadena de 1 carbono solo tiene un extremo: lleva un solo ${ESTER_GROUP} (${CARBONYL_WORDS.metanoatoDeMetilo}).`
    : `La cadena tiene dos extremos: con «${CARBONYL_WORDS.oato}» lleva como mucho dos grupos COO, uno en cada extremo `
      + `(${CARBONYL_WORDS.butanodioatoDeDimetilo}).`),
  /** The end of VALENCE on a chain end that `oato` takes by rule (R-6a1): «…el grupo COO de «oato» va en ese carbono.» */
  esterTerminalNote: `el ${ESTER_GROUP} de «${CARBONYL_WORDS.oato}» va en ese carbono`,
  // R-6b1: the same for the –C≡N groups of `nitrilo`.
  nitrileEnds: (length) => (length === 1
    ? `La cadena de 1 carbono solo tiene un extremo: lleva un solo ${NITRILE_GROUP} (${CARBONYL_WORDS.metanonitrilo}).`
    : `La cadena tiene dos extremos: con «${CARBONYL_WORDS.nitrilo}» lleva como mucho dos grupos C≡N, uno en cada extremo `
      + `(${CARBONYL_WORDS.butanodinitrilo}).`),
  /** The end of VALENCE on a chain end that `nitrilo` takes by rule (R-6b1): «…el grupo C≡N de «nitrilo» va en ese carbono.» */
  nitrileTerminalNote: `el ${NITRILE_GROUP} de «${CARBONYL_WORDS.nitrilo}» va en ese carbono`,
});

/**
 * The CARBONYL_POSITION message of more groups of a terminal suffix than
 * the chain has ends, and the end of the VALENCE message on an end it takes
 * by rule, by the suffix's group (R-5c1: the –CHO of `al`; R-5d1: the –COOH
 * of `oico`; R-6a1: the –COO– of `oato`; R-6b1: the –C≡N of `nitrilo`).
 *
 * @param {string} kind - The SuffixSpec's kind ('aldehyde', 'acid', 'ester' or 'nitrile').
 * @returns {{ends: (length: number) => string, note: string}} The message and the note.
 */
function terminalWords(kind) {
  if (kind === ACID_KIND) {
    return { ends: CARBONYL_MESSAGES.acidEnds, note: CARBONYL_MESSAGES.acidTerminalNote };
  }
  if (kind === ESTER_KIND) {
    return { ends: CARBONYL_MESSAGES.esterEnds, note: CARBONYL_MESSAGES.esterTerminalNote };
  }
  if (kind === NITRILE_KIND) {
    return { ends: CARBONYL_MESSAGES.nitrileEnds, note: CARBONYL_MESSAGES.nitrileTerminalNote };
  }
  return { ends: CARBONYL_MESSAGES.ends, note: CARBONYL_MESSAGES.terminalNote };
}

/**
 * Checks the suffix's carbon slots against the parent (R-5a2): each within
 * it (LOCANT_RANGE); and (R-5c1) no more –CHO groups of `al` than the chain
 * has ends (CARBONYL_POSITION: two, one on a one-carbon chain, whose only
 * carbon would take two =O), nor –COOH groups of `oico` (R-5d1), –COO– of
 * `oato` (R-6a1) or –C≡N of `nitrilo` (R-6b1).
 *
 * @param {object} spec - A NameSpec.
 * @param {{length: number, branch: boolean}} parent - The parent, as checkSpec() describes it.
 * @param {Map<object, number>|null} values - Placement values, or null.
 * @returns {object|null} The first error, or null.
 */
function checkSuffix(spec, parent, values) {
  if (spec.suffix && spec.suffix.terminal && spec.suffix.slots.length > Math.min(2, parent.length)) {
    // `metanodial`, `butanotrial`; `ácido metanodioico` (R-5d1); `metanodioato de dimetilo` (R-6a1); `metanodinitrilo` (R-6b1).
    return buildError('CARBONYL_POSITION', terminalWords(spec.suffix.kind).ends(parent.length), spec.suffix.tiles);
  }
  for (const slot of spec.suffix ? spec.suffix.slots : []) {
    const error = checkCarbon(slot, parent, values);
    if (error) {
      return error;
    }
  }
  return null;
} // End of function checkSuffix()

/**
 * The bond order with which a branch attaches to the carbon it hangs from:
 * its `il` (1) or `iliden` (2), its retained template's, 1 for a one-atom
 * group (a halogen, R-5a1; `hidroxi`, R-5a2) and for an alkoxy prefix (R-5b:
 * the ether oxygen's single bond), 2 for `oxo` (R-5c1: its =O).
 *
 * @param {object} sub - A SubstituentSpec.
 * @returns {number} 1 or 2.
 */
export function attachmentOrder(sub) {
  if (isAtomGroup(sub.kind)) {
    return atomGroupOrder(sub.kind); // 2 for the =O of `oxo` (R-5c1)
  }
  if (sub.alkoxy) {
    return 1;
  }
  return sub.kind === 'retained' ? RETAINED_TEMPLATES[sub.retained].order : sub.freeValence.order;
}

/**
 * Tells whether a branch has a chain or ring of its own, numbered, that the
 * search models (search.js): not a retained word, nor a one-atom group (a
 * halogen, R-5a1; `hidroxi`, R-5a2).
 *
 * @param {object} sub - A SubstituentSpec.
 * @returns {boolean} True for a chain, ring or phenyl branch.
 */
export function hasOwnChain(sub) {
  return sub.kind !== 'retained' && !isAtomGroup(sub.kind);
}

/**
 * Records that a slot adds bond order to an atom (for the VALENCE tiles).
 *
 * @param {object} state - Build state.
 * @param {number} atom - Atom id.
 * @param {[number, number]} tiles - The slot's tile range.
 * @param {number} amount - Bond order added beyond the chain's single bonds.
 * @returns {void}
 */
function contribute(state, atom, tiles, amount) {
  state.atoms.get(atom).added.push({ tiles, amount });
}

/**
 * Creates the carbons and single bonds of a chain (closed by bond n from
 * carbon n to carbon 1 for a ring; a benzene ring with its Kekulé double
 * bonds on bonds 1, 3 and 5, R-4b), then its multiple bonds and the
 * prefixes hanging from it.
 *
 * @param {object} state - Build state (`mol`, `values`, `atoms` info by id).
 * @param {{kind?: string, length: number, double: object[], triple: object[], prefixes: object[]}} owner - ParentSpec,
 *   chain, ring or phenyl SubstituentSpec.
 * @param {boolean} branch - A branch's chain (for the messages).
 * @returns {{atoms: number[], bonds: number[]}} Its atoms and bonds in locant order (a ring's closing bond last).
 */
function buildChain(state, owner, branch) {
  const { mol, values } = state;
  const atoms = [];
  const bonds = [];
  for (let locant = 1; locant <= owner.length; locant += 1) {
    const id = addAtom(mol);
    state.atoms.set(id, { locant, branch, added: [] });
    atoms.push(id);
    if (locant > 1) {
      bonds.push(addBond(mol, atoms[locant - 2], id, 1));
    }
  } // End of the loop that creates the carbons
  const ring = isRing(owner.kind);
  if (ring) {
    bonds.push(addBond(mol, atoms[owner.length - 1], atoms[0], 1)); // Bond n closes the ring.
  }
  if (isAromatic(owner.kind)) {
    // One Kekulé form; its double bonds are the ring's own (no `contribute`: a VALENCE error blames a locant).
    bonds.forEach((bond, i) => i % 2 === 0 && setBondOrder(mol, bond, 2));
  }
  for (const [order, slots] of [[2, owner.double], [3, owner.triple]]) {
    for (const slot of slots) {
      const value = slotValue(slot, values);
      setBondOrder(mol, bonds[value - 1], order);
      contribute(state, atoms[value - 1], slot.tiles, order - 1);
      contribute(state, atoms[ring ? value % owner.length : value], slot.tiles, order - 1);
    }
  }
  attachPrefixes(state, owner.prefixes || [], atoms);
  return { atoms, bonds };
} // End of function buildChain()

/**
 * Creates the parent of an ether's functional-class name (R-5b2): its
 * oxygen, one atom whose two groups are attached as prefixes (two single
 * bonds: never over its valence).
 *
 * @param {object} state - Build state.
 * @returns {{atoms: number[], bonds: number[]}} The oxygen, and no bonds.
 */
function etherOxygen(state) {
  const oxygen = addAtom(state.mol, {}, ALKOXY_ELEMENT);
  state.atoms.set(oxygen, { locant: 1, branch: false, added: [] });
  return { atoms: [oxygen], bonds: [] };
}

/**
 * Creates a branch: a one-atom group (a halogen atom, R-5a1; the oxygen of
 * `hidroxi`, R-5a2, or of `oxo`, R-5c1, double-bonded), a retained word from
 * its template (`formil` with its =O, R-5c1; `acetil`, R-5c2; `ciano` with
 * its triple-bonded nitrogen, R-6b1), or a chain;
 * for an alkoxy prefix (R-5b) that branch and then its ether oxygen
 * (alkoxyOxygen()); for an acyl prefix (R-5c2) that branch and then its C=O
 * (acylCarbonyl()).
 *
 * @param {object} state - Build state.
 * @param {object} sub - A SubstituentSpec.
 * @returns {{attach: number, order: number, tiles: [number, number]}} The atom with the free valence, its bond order and the tiles that set it.
 */
function buildSubstituent(state, sub) {
  if (isAtomGroup(sub.kind)) {
    const atom = addAtom(state.mol, {}, sub.element);
    state.atoms.set(atom, { locant: 1, branch: true, added: [] }); // One bond (a double one for `oxo`): never over its valence.
    return { attach: atom, order: atomGroupOrder(sub.kind), tiles: sub.tiles };
  }
  let branch;
  if (sub.kind === 'retained') {
    const template = RETAINED_TEMPLATES[sub.retained];
    const chain = buildChain(state, { length: template.length, double: [], triple: [] }, true);
    for (const locant of template.methyls) {
      const methyl = addAtom(state.mol);
      state.atoms.set(methyl, { locant: 1, branch: true, added: [] });
      addBond(state.mol, chain.atoms[locant - 1], methyl, 1);
      contribute(state, chain.atoms[locant - 1], sub.tiles, 1);
      contribute(state, methyl, sub.tiles, 1);
    }
    for (const locant of template.oxo) { // The =O of `formil` (R-5c1) and `carboxi` (R-5d1).
      const oxygen = addAtom(state.mol, {}, OXO_ELEMENT);
      state.atoms.set(oxygen, { locant: 1, branch: true, added: [] });
      addBond(state.mol, chain.atoms[locant - 1], oxygen, 2);
      contribute(state, chain.atoms[locant - 1], sub.tiles, 2);
    }
    for (const locant of template.hydroxy) { // The OH of `carboxi` (R-5d1).
      const oxygen = addAtom(state.mol, {}, HYDROXY_ELEMENT);
      state.atoms.set(oxygen, { locant: 1, branch: true, added: [] });
      addBond(state.mol, chain.atoms[locant - 1], oxygen, 1);
      contribute(state, chain.atoms[locant - 1], sub.tiles, 1);
    }
    for (const locant of template.nitrile) { // The N of `ciano` (R-6b1): its one triple bond, never over its valence.
      const nitrogen = addAtom(state.mol, {}, NITRILE_NITROGEN);
      state.atoms.set(nitrogen, { locant: 1, branch: true, added: [] });
      addBond(state.mol, chain.atoms[locant - 1], nitrogen, 3);
      contribute(state, chain.atoms[locant - 1], sub.tiles, 3);
    }
    branch = { attach: chain.atoms[template.attach - 1], order: template.order, tiles: sub.tiles };
  } else {
    const chain = buildChain(state, sub, true);
    const { slot, order } = sub.freeValence;
    branch = { attach: chain.atoms[slotValue(slot, state.values) - 1], order, tiles: slot.tiles };
    if (sub.acyl) {
      branch = acylCarbonyl(state, sub, branch); // `propanoil`, `(ciclohexanocarbonil)`, `benzoil` (R-5c2)
    }
  }
  if (!sub.alkoxy) {
    return branch;
  }
  // `metoxi` (R-5b); after an acyl branch, `acetiloxi`, `propanoiloxi` (R-6a2b): the ether oxygen after the C=O.
  const alkoxy = alkoxyOxygen(state, sub, branch);
  return sub.alkoxycarbonyl ? esterCarbonyl(state, sub, alkoxy) : alkoxy; // `metoxicarbonil` (R-6a2b)
} // End of function buildSubstituent()

/**
 * Puts the C=O carbon of an alkoxycarbonyl prefix (R-6a2b) on its alkoxy
 * group, already built with its ether oxygen: a new carbon single-bonded to
 * that oxygen, with an oxygen double-bonded to it (three bonds: never over
 * its valence), created after every atom of the group (ownPrefixAtoms() cuts
 * a branch's own prefixes from its atoms in creation order), left with one
 * bond to make, to the carbon the prefix hangs from.
 *
 * @param {object} state - Build state.
 * @param {object} sub - The alkoxycarbonyl SubstituentSpec.
 * @param {{attach: number, order: number, tiles: [number, number]}} alkoxy - The alkoxy group's ether oxygen.
 * @returns {{attach: number, order: number, tiles: [number, number]}} The C=O carbon, bond order 1, and the prefix's tiles.
 */
function esterCarbonyl(state, sub, alkoxy) {
  const { mol } = state;
  const carbon = addAtom(mol, {}, CARBON);
  state.atoms.set(carbon, { locant: 1, branch: true, added: [] });
  addBond(mol, alkoxy.attach, carbon, 1);
  const oxygen = addAtom(mol, {}, OXO_ELEMENT);
  state.atoms.set(oxygen, { locant: 1, branch: true, added: [] }); // One double bond: never over its valence.
  addBond(mol, carbon, oxygen, 2);
  return { attach: carbon, order: 1, tiles: sub.tiles };
} // End of function esterCarbonyl()

/**
 * The end of VALENCE on the C=O carbon of a chain's acyl prefix (R-5c2): «…solo puede tener 4: el grupo C=O de «oil» va en
 * ese carbono.»
 */
const ACYL_NOTE = `el grupo C=O de «${ACYL_ENDING}» va en ese carbono`;

/**
 * Puts the C=O of an acyl prefix (R-5c2) on its branch, already built, after
 * every atom of the branch (ownPrefixAtoms() cuts a branch's own prefixes
 * from its atoms in creation order). On a chain (`oil`: `propanoil`) its
 * free-valence carbon, carbon 1, is the C=O carbon: an oxygen double-bonded
 * to it, the two bonds blamed on the branch's free-valence tiles (the `oil`
 * tile) and the carbon remembering it for the VALENCE message. On a ring
 * (`carbonil`, `benzoil`) a new carbon, single-bonded to the ring's
 * free-valence carbon (which gets that bond from the tiles that place its
 * free valence, as it would get the bond to the chain), with an oxygen
 * double-bonded to it (three bonds: never over its valence), left with one
 * bond to make, to the carbon the prefix hangs from.
 *
 * @param {object} state - Build state.
 * @param {object} sub - The acyl SubstituentSpec.
 * @param {{attach: number, order: number, tiles: [number, number]}} branch - The built branch's free valence.
 * @returns {{attach: number, order: number, tiles: [number, number]}} The C=O carbon, bond order 1, and the tiles to blame.
 */
function acylCarbonyl(state, sub, branch) {
  const { mol } = state;
  let carbon = branch.attach;
  if (isRing(sub.kind)) {
    carbon = addAtom(mol, {}, CARBON);
    state.atoms.set(carbon, { locant: 1, branch: true, added: [] });
    addBond(mol, branch.attach, carbon, 1);
    contribute(state, branch.attach, branch.tiles, 1);
  }
  const oxygen = addAtom(mol, {}, OXO_ELEMENT);
  state.atoms.set(oxygen, { locant: 1, branch: true, added: [] }); // One double bond: never over its valence.
  addBond(mol, carbon, oxygen, 2);
  if (isRing(sub.kind)) {
    return { attach: carbon, order: 1, tiles: sub.tiles };
  }
  contribute(state, carbon, branch.tiles, 2);
  state.atoms.get(carbon).note = ACYL_NOTE;
  return { attach: carbon, order: 1, tiles: branch.tiles };
} // End of function acylCarbonyl()

/**
 * Puts the ether oxygen of an alkoxy prefix (R-5b) on its branch, already
 * built: one oxygen, created after every atom of the branch
 * (ownPrefixAtoms() cuts a branch's own prefixes from its atoms in creation
 * order), single-bonded to the branch's free-valence carbon — which gets
 * that bond, from the tiles that place its free valence, as it would get the
 * bond to the chain — and left with one bond to make, to the carbon the
 * prefix hangs from.
 *
 * @param {object} state - Build state.
 * @param {object} sub - The alkoxy SubstituentSpec.
 * @param {{attach: number, order: number, tiles: [number, number]}} branch - The built branch's free valence.
 * @returns {{attach: number, order: number, tiles: [number, number]}} The oxygen, bond order 1, and the alkoxy prefix's tiles.
 */
function alkoxyOxygen(state, sub, branch) {
  const oxygen = addAtom(state.mol, {}, ALKOXY_ELEMENT);
  state.atoms.set(oxygen, { locant: 1, branch: true, added: [] }); // Two single bonds: never over its valence.
  addBond(state.mol, branch.attach, oxygen, 1);
  contribute(state, branch.attach, branch.tiles, 1);
  return { attach: oxygen, order: 1, tiles: sub.tiles };
} // End of function alkoxyOxygen()

/**
 * Builds every occurrence of some prefixes and bonds each to its carbon
 * of a chain; at the parent level, records the atoms of each occurrence.
 * A template's own groups (R-4c) are attached the same way, except that a
 * group the template places by rule (an implicit slot) is the ring's own:
 * it adds no bond order to blame, and its ring carbon remembers the
 * template for the VALENCE message.
 *
 * @param {object} state - Build state.
 * @param {object[]} prefixes - PrefixSpecs.
 * @param {number[]} atoms - The chain's atoms in locant order.
 * @param {object[]|null} [record] - Receives one entry per occurrence (parent level only).
 * @param {object|null} [template] - The TemplateSpec whose groups these are (none for the student's prefixes).
 * @returns {void}
 */
function attachPrefixes(state, prefixes, atoms, record = null, template = null) {
  const { mol, values } = state;
  prefixes.forEach((prefix, index) => {
    prefix.slots.forEach((slot, occurrence) => {
      const firstAtom = mol.nextAtomId;
      const firstBond = mol.nextBondId;
      const branch = buildSubstituent(state, prefix.substituent);
      const locant = slotValue(slot, values);
      // `N` (R-6c1): the principal amine's nitrogen (a name-level prefix only, parse.js checkNitrogen()).
      const target = locant === N_VALUE && state.nitrogen !== undefined ? state.nitrogen : atoms[locant - 1];
      const bond = addBond(mol, target, branch.attach, branch.order);
      if (template && slot.kind === 'implicit') {
        state.atoms.get(target).template = { word: template.word.text, group: templateGroupWord(template.value) };
      } else {
        contribute(state, target, slot.tiles, branch.order);
      }
      contribute(state, branch.attach, branch.tiles, branch.order);
      if (record) {
        record.push({
          prefix: index,
          occurrence,
          tiles: [prefix.tiles[0], prefix.tiles[1]],
          locant,
          parentAtom: target,
          attachment: branch.attach,
          bond,
          atoms: idsBetween(firstAtom, mol.nextAtomId),
          bonds: idsBetween(firstBond, mol.nextBondId).filter((id) => id !== bond),
        });
      }
    }); // End of the loop over the occurrences of a prefix
  }); // End of the loop over the prefixes
} // End of function attachPrefixes()

/**
 * The atoms of each occurrence of a branch's own prefixes (a compound
 * branch's), cut from the atoms of one occurrence of the branch in the
 * order build() created them — prefixAtoms `atoms`, an order search.js
 * placementReading() keeps: buildSubstituent() creates the branch's own
 * chain first (a retained word's whole template), then attachPrefixes()
 * each own prefix's occurrences one after another, in tile order, each
 * with all of its atoms before the next (a one-atom group is its one atom,
 * R-5a1, R-5a2; an alkoxy prefix its branch's atoms, then its ether oxygen,
 * R-5b), and an alkoxy branch's own ether oxygen last of all (so are an acyl
 * branch's C=O carbon outside its ring and its =O, R-5c2, before that
 * oxygen in an acyloxy prefix, and an alkoxycarbonyl prefix's C=O carbon
 * and its =O after it, R-6a2b).
 * For the diagnosis (diagnose.js), which compares branches inside a compound
 * branch by their structure.
 *
 * @param {object} sub - The branch's SubstituentSpec.
 * @param {number[]} atoms - The atoms of one occurrence of the branch, in creation order.
 * @returns {number[][][]} Per own prefix (spec order), per occurrence (slot order), its atoms in creation order.
 */
export function ownPrefixAtoms(sub, atoms) {
  const template = sub.kind === 'retained' ? RETAINED_TEMPLATES[sub.retained] : null;
  let next = template ? template.length + template.methyls.length : sub.length;
  return sub.prefixes.map((prefix) => prefix.slots.map(() => {
    const size = substituentAtoms(prefix.substituent);
    const slice = atoms.slice(next, next + size);
    next += size;
    return slice;
  }));
}

/** How the VALENCE message calls the C=O a ketone template places (R-5c3a: «…en la acetona, ese carbono ya lleva un grupo C=O»). */
const KETONE_GROUP = 'grupo C=O';

/**
 * The group a whole-word parent places at its carbon 1, as the VALENCE
 * message says it (R-5a2: «…en el fenol, ese carbono ya lleva un grupo OH»;
 * R-5c1: «…en el benzaldehído, ese carbono ya lleva un grupo CHO»; the
 * retained phenols of R-5a3a: «grupo OH»; the carbonyl templates of
 * R-5c3a: «grupo CHO», and «grupo C=O» for `acetona` and `acetofenona`;
 * R-5d1: «grupo COOH» for `benzoico`; R-6b1: «grupo C≡N» for `benzonitrilo`;
 * R-6b2: and for the retained nitrile words, `acetonitrilo`, `ftalonitrilo`).
 *
 * @param {{kind: string}} suffix - A SuffixSpec placed by its parent's word.
 * @returns {string} The group's name.
 */
function placedGroupWord(suffix) {
  if (suffix.kind === 'ketone') {
    return KETONE_GROUP; // `acetona`, `acetofenona` (R-5c3a)
  }
  if (suffix.kind === ACID_KIND) {
    return ACID_GROUP; // `benzoico` (R-5d1)
  }
  if (suffix.kind === ESTER_KIND) {
    return ESTER_GROUP; // `benzoato` (R-6a1)
  }
  if (suffix.kind === NITRILE_KIND) {
    return NITRILE_GROUP; // `benzonitrilo` (R-6b1); `acetonitrilo`, `ftalonitrilo` (R-6b2)
  }
  return suffix.kind === 'alcohol' ? GROUP_WORD_PARENTS.phenol.group : GROUP_WORD_PARENTS.benzaldehyde.group;
}

/**
 * Puts each suffix group on its parent carbon: its oxygen (R-5a2: the OH of
 * an alcohol, single-bonded; R-5c1: the =O of `al` and `ona`,
 * double-bonded) or its nitrogen (R-6b1: the N of `nitrilo`, triple-bonded;
 * tiles.js suffixElement()), or (R-5c1: `carbaldehído`, `benzaldehído`;
 * R-6b1: `carbonitrilo`, `benzonitrilo`) a new carbon single-bonded to the
 * parent's carbon with the =O (or the N) on it; an acid's –COOH
 * (R-5d1: `oico`, `carboxílico`, `benzoico`) has an OH too, single-bonded
 * to the =O's carbon after the =O (`hydroxy`, `hydroxyBond`). A slot the
 * parent's word places by rule (the OH of `fenol`, the –CHO of
 * `benzaldehído`, implicit and `placed`) is the ring's own, as a template's
 * group: it adds no bond order to blame, and its carbon remembers the word
 * for the VALENCE message; the ends of a chain that `al` or `oico` takes by
 * rule (implicit, not placed) remember the rule, and the VALENCE message
 * blames the student's locant that overloads them.
 *
 * @param {object} state - Build state.
 * @param {object|null} suffix - The NameSpec's SuffixSpec, or null.
 * @param {number[]} atoms - The parent's atoms in locant order.
 * @returns {{locant: number, parentAtom: number, attachment: number, bond: number, tiles: [number, number], carbon?: number,
 *   carbonBond?: number, hydroxy?: number, hydroxyBond?: number}[]} One entry per suffix group, in slot order: the parent's
 *   carbon, the oxygen and the bond to it (from the parent's carbon, or from the group's own carbon `carbon`, bonded to the
 *   parent's by `carbonBond`), and an acid's OH and its bond (R-5d1).
 */
function attachSuffix(state, suffix, atoms) {
  if (!suffix) {
    return [];
  }
  const { mol, values } = state;
  const { order } = SUFFIX_GROUPS[suffix.kind];
  const element = suffixElement(SUFFIX_GROUPS[suffix.kind]); // The N of a –C≡N (R-6b1), else an oxygen.
  // 3 for `oico` (R-5d1), `oato` (R-6a1) and `nitrilo` (R-6b1).
  const amount = suffixBondAmount({ outside: suffix.outside, order, hydroxy: suffix.hydroxy, bridge: suffix.bridge });
  return suffix.slots.map((slot) => {
    const locant = slotValue(slot, values);
    const target = atoms[locant - 1];
    const extra = {};
    let holder = target;
    if (suffix.outside) {
      holder = addAtom(mol, {}, CARBON); // The –CHO's own carbon (R-5c1): three bonds, never over its valence.
      state.atoms.set(holder, { locant: 1, branch: true, added: [] });
      extra.carbon = holder;
      extra.carbonBond = addBond(mol, target, holder, 1);
    }
    const oxygen = addAtom(mol, {}, element);
    state.atoms.set(oxygen, { locant: 1, branch: true, added: [] }); // One bond (a triple one for a –C≡N): never over its valence.
    if (suffix.kind === AMINE_KIND) {
      // An amine's nitrogen (R-6c1): three bonds at most, two left for the groups written `N` (valenceError()).
      Object.assign(state.atoms.get(oxygen), { valence: NITROGEN_VALENCE, amine: true });
      state.nitrogen = state.nitrogen === undefined ? oxygen : state.nitrogen;
    }
    const bond = addBond(mol, holder, oxygen, order);
    if (suffix.hydroxy) {
      // The OH of a –COOH (R-5d1), after its =O: three bonds of the group's carbon, never over its valence on its own.
      extra.hydroxy = addAtom(mol, {}, HYDROXY_ELEMENT);
      state.atoms.set(extra.hydroxy, { locant: 1, branch: true, added: [] });
      extra.hydroxyBond = addBond(mol, holder, extra.hydroxy, 1);
    }
    if (suffix.bridge) {
      // The bridge oxygen of a –COO– (R-6a1), after its =O; its O-bound group is bonded to it later (attachEsterGroups()).
      extra.bridge = addAtom(mol, {}, ALKOXY_ELEMENT);
      state.atoms.set(extra.bridge, { locant: 1, branch: true, added: [] });
      extra.bridgeBond = addBond(mol, holder, extra.bridge, 1);
    }
    if (slot.kind === 'implicit' && suffix.placed) {
      state.atoms.get(target).template = { word: suffix.word.text, group: placedGroupWord(suffix) };
    } else if (slot.kind === 'implicit') {
      // `al` (R-5c1), `oico` (R-5d1), `oato` (R-6a1), `nitrilo` (R-6b1): blame the locant that overloads its end.
      state.atoms.get(target).note = terminalWords(suffix.kind).note;
    } else {
      contribute(state, target, slot.tiles, amount);
    }
    return { locant, parentAtom: target, attachment: oxygen, bond, tiles: [slot.tiles[0], slot.tiles[1]], ...extra };
  });
} // End of function attachSuffix()

/**
 * Builds every occurrence of an ester's O-bound groups (R-6a1, NameSpec
 * `ester`) and bonds each to the bridge oxygen of its –COO– (attachSuffix()
 * `bridge`): occurrence k of the groups, expanded by their multipliers in the
 * student's order, to the suffix's k-th group (parse.js ESTER_GROUPS makes
 * them as many), by a single bond from the group's free-valence carbon (carbon
 * 1 by rule, or the locant before `ilo`), which gets that bond from the tiles
 * that place its free valence. The carbons of the group's own chain remember
 * it for the VALENCE message («…del grupo unido al oxígeno…»).
 *
 * @param {object} state - Build state.
 * @param {object} spec - The NameSpec.
 * @param {object[]} groups - attachSuffix() of its suffix (each –COO– with its `bridge`).
 * @returns {{group: number, occurrence: number, tiles: [number, number], bridge: number, attachment: number, bond: number,
 *   atoms: number[], bonds: number[]}[]} One entry per occurrence: the bridge oxygen, the group's carbon bonded to it and that
 *   bond, and the group's atoms and inner bonds.
 */
function attachEsterGroups(state, spec, groups) {
  if (!spec.ester) {
    return [];
  }
  const { mol } = state;
  const sites = groups.filter((group) => group.bridge !== undefined);
  const record = [];
  spec.ester.groups.forEach((group, index) => {
    for (let occurrence = 0; occurrence < group.multiplier.count; occurrence += 1) {
      const site = sites[record.length];
      if (!site) {
        return; // Never: parse.js ESTER_GROUPS gives one O-bound group per –COO–.
      }
      const firstAtom = mol.nextAtomId;
      const firstBond = mol.nextBondId;
      const sub = group.substituent;
      const branch = buildSubstituent(state, sub);
      const own = sub.kind === 'retained' ? RETAINED_TEMPLATES[sub.retained].length : sub.length;
      idsBetween(firstAtom, firstAtom + own).forEach((id) => { state.atoms.get(id).oBound = true; });
      const bond = addBond(mol, site.bridge, branch.attach, branch.order);
      contribute(state, branch.attach, branch.tiles, branch.order);
      record.push({
        group: index,
        occurrence,
        tiles: [group.tiles[0], group.tiles[1]],
        bridge: site.bridge,
        attachment: branch.attach,
        bond,
        atoms: idsBetween(firstAtom, mol.nextAtomId),
        bonds: idsBetween(firstBond, mol.nextBondId).filter((id) => id !== bond),
      });
    } // End of the loop over the occurrences of a group
  }); // End of the loop over the O-bound groups
  return record;
} // End of function attachEsterGroups()

/**
 * The CARBONYL_POSITION error of a ketone's C=O (R-5c1, `ona`) on a carbon
 * bonded to fewer than two carbons, once the whole molecule is built: an
 * end of a chain with nothing else on it (`propan-1-ona` would be propanal,
 * an aldehyde), or a one-carbon chain; an end carbon that a ring or another
 * carbon branch makes a ketone of is right (`1-feniletan-1-ona`).
 *
 * @param {object} state - Build state.
 * @param {object|null} suffix - The NameSpec's SuffixSpec, or null.
 * @param {object[]} groups - attachSuffix() of it.
 * @returns {object|null} The error over the first such group's tiles, or null.
 */
function ketoneEndError(state, suffix, groups) {
  if (!suffix || suffix.kind !== 'ketone' || suffix.outside) {
    return null;
  }
  const { mol } = state;
  /**
   * The carbons bonded to an atom.
   *
   * @param {number} id - Atom id.
   * @returns {number} How many.
   */
  const carbonNeighbours = (id) => [...mol.bonds.values()]
    .filter((bond) => bond.a === id || bond.b === id)
    .filter((bond) => mol.atoms.get(bond.a === id ? bond.b : bond.a).element === CARBON).length;
  const misplaced = groups.find((group) => carbonNeighbours(group.parentAtom) < 2);
  return misplaced ? buildError('CARBONYL_POSITION', CARBONYL_MESSAGES.ketoneEnd, misplaced.tiles) : null;
} // End of function ketoneEndError()

/**
 * The ids handed out between two counter values (model/molecule.js hands
 * them out in increasing order).
 *
 * @param {number} from - First id.
 * @param {number} to - Id after the last one.
 * @returns {number[]} The ids.
 */
function idsBetween(from, to) {
  return Array.from({ length: to - from }, (_, i) => from + i);
}

/**
 * Finds the carbon with more than four bonds whose excess comes first in
 * the tiles: for each over-valent atom, its added bonds are summed in tile
 * order over the chain's single bonds, and the slot that takes the sum over
 * four gives the tiles.
 *
 * @param {object} state - Build state.
 * @returns {object|null} The VALENCE error, or null.
 */
function valenceError(state) {
  let best = null;
  for (const [id, info] of state.atoms) {
    const total = bondOrderSum(state.mol, id);
    const valence = info.valence || CARBON_VALENCE; // An amine's nitrogen: three (R-6c1).
    if (total <= valence) {
      continue;
    }
    const added = [...info.added].sort((p, q) => p.tiles[0] - q.tiles[0]);
    let sum = total - added.reduce((s, a) => s + a.amount, 0);
    const culprit = added.find((a) => {
      sum += a.amount;
      return sum > valence;
    }) || { tiles: state.tiles }; // Never reached: a chain's own single bonds are at most two.
    if (!best || culprit.tiles[0] < best.tiles[0]) {
      best = { tiles: culprit.tiles, total, info };
    }
  } // End of the loop over the atoms
  if (!best) {
    return null;
  }
  if (best.info.amine) {
    // R-6c1: «El nitrógeno de la amina tendría 4 enlaces, y un nitrógeno solo puede tener 3.»
    return buildError('VALENCE', `El ${AMINE_NITROGEN} tendría ${best.total} enlaces, y un nitrógeno solo puede tener `
      + `${best.info.valence}.`, best.tiles);
  }
  let where = best.info.branch ? `El carbono ${best.info.locant} de la rama` : `El carbono ${best.info.locant}`;
  where = best.info.oBound ? `El carbono ${best.info.locant} del grupo unido al oxígeno` : where; // R-6a1
  const { template, note } = best.info; // A carbon a template placed its group on (R-4c); one `al` takes by rule (R-5c1).
  let why = template ? `: ${withArticle(template.word, 'en')}, ese carbono ya lleva un ${template.group}` : '';
  why = why || (note ? `: ${note}` : '');
  return buildError('VALENCE', `${where} tendría ${best.total} enlaces, y un carbono solo puede tener ${CARBON_VALENCE}${why}.`, best.tiles);
} // End of function valenceError()

/**
 * Builds the molecule of a NameSpec with one placement (design.md §15.4).
 *
 * @param {object} spec - A NameSpec (interpret.js).
 * @param {number[]} [placement] - One value per `spec.leftOut` entry (empty when there is none).
 * @returns {{ok: true, molecule: object, studentParent: {atoms: number[], bonds: number[]}, prefixAtoms: object[],
 *   suffixAtoms: object[], esterAtoms: object[]}|{ok: false, error: {code: string, message: string, tiles: [number, number]}}}
 *   The molecule (atoms without meaningful coordinates), the parent's atoms and bonds in the student's locant order, per
 *   prefix occurrence `{prefix, occurrence, tiles, locant, parentAtom, attachment, bond, atoms, bonds}` (the branch's atoms
 *   and inner bonds; `bond` joins `attachment` to `parentAtom`), per suffix group (R-5a2) `{locant, parentAtom,
 *   attachment, bond, tiles}` (`attachment` its oxygen; R-6a1: an ester's `bridge` and `bridgeBond`), and per occurrence
 *   of an ester's O-bound groups (R-6a1) `{group, occurrence, tiles, bridge, attachment, bond, atoms, bonds}`
 *   (attachEsterGroups()) — or the first structural error.
 * @throws {Error} When the placement does not give one value per left-out slot.
 */
export function build(spec, placement = []) {
  if (placement.length !== spec.leftOut.length) {
    throw new Error(`build: ${spec.leftOut.length} left-out slots, ${placement.length} values`);
  }
  const values = new Map(spec.leftOut.map((slot, i) => [slot, placement[i]]));
  const error = checkSpec(spec, values);
  if (error) {
    return { ok: false, error };
  }
  const state = { mol: createMolecule(), values, atoms: new Map(), tiles: spec.tiles };
  // The oxygen of an ether's class name (R-5b2), else the parent chain or ring.
  const parent = spec.parent.kind === 'ether' ? etherOxygen(state) : buildChain(state, { ...spec.parent, prefixes: [] }, false);
  const suffixAtoms = attachSuffix(state, spec.suffix, parent.atoms); // `propan-2-ol`, `fenol` (R-5a2).
  if (spec.parent.template) {
    attachPrefixes(state, spec.parent.template.groups, parent.atoms, null, spec.parent.template); // `tolueno`'s methyl…
  }
  const prefixAtoms = [];
  attachPrefixes(state, spec.prefixes, parent.atoms, prefixAtoms);
  const esterAtoms = attachEsterGroups(state, spec, suffixAtoms); // `etanoato de metilo` (R-6a1)
  const valence = valenceError(state) || ketoneEndError(state, spec.suffix, suffixAtoms); // R-5c1: `propan-1-ona`
  if (valence) {
    return { ok: false, error: valence };
  }
  // The engine's chain cap (model/validate.js validateForNaming()): with a ring, the longest side chain.
  const chain = specRings(spec) > 0 ? longestSideChain(state.mol) : longestCarbonChain(state.mol);
  if (chain > MAX_CHAIN) {
    return { ok: false, error: buildError('TOO_BIG', VALIDATION_MESSAGES.TOO_BIG, spec.tiles) };
  }
  return {
    ok: true, molecule: state.mol, studentParent: { atoms: parent.atoms, bonds: parent.bonds }, prefixAtoms, suffixAtoms, esterAtoms,
  };
} // End of function build()
