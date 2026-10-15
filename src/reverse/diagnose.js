/**
 * @file Diagnosis of «¿Cómo se dibuja?» (design.md §15.3 `otherName`, §15.4,
 * §15.8 R-3; phase I-49a): for an `otherName` verdict of readName() — the
 * student's name describes one molecule, which the app names otherwise —
 * the student's **main mistake**, one diagnosis: the first rule of the list
 * below that applies. Pure, no DOM; open-chain hydrocarbons and, since
 * phase I-50d (design.md §15.8 R-4), hydrocarbons with one ring (`ciclo`,
 * `benceno`, `fenil`, the retained templates; see «Rings» below), their
 * halogen derivatives and alcohols (R-5a; «Halogens» and «Alcohols» below:
 * an alcohol's own mistakes are checked before rule 1).
 *
 * The rules, in order (first match wins):
 *
 * 1. `BRANCH_AT_END` — a branch on an end carbon lengthens the chain
 *    (`metiletano`, `1-metilpropano`);
 * 2. `LONGER_CHAIN` — a longer chain exists (`2-etilbutano`);
 * 3. the engine's trace rule at which the student's chain was dropped among
 *    the chains as long as the parent: `MORE_MULTIPLE_BONDS` (P2),
 *    `MORE_DOUBLE_BONDS` (P3), `MORE_SUBSTITUENTS` (P4), `CHAIN_LOCANTS`
 *    (N1–N4: another chain gives lower locants) or `CHAIN_ALPHABETICAL`
 *    (N5);
 * 4. `NUMBERING` — the student's chain is the parent (or one that gives the
 *    same name) but numbered from the other end (`4-metilpentano`,
 *    `hex-4-eno`), with the trace rule (N1–N5) that decided;
 * 5. `ALPHABETICAL_ORDER` — prefixes not in alphabetical order (di/tri…
 *    multipliers and `tert-` ignored);
 * 6. `UNGROUPED` — identical branches not grouped (`2-metil-3-metil…`);
 * 7. `MULTIPLIER_KIND` — di vs bis;
 * 8. `LOCANT_ORDER` — locants not ascending (`3,2-dimetil…`);
 * 9. `NEEDLESS_LOCANTS` (`prop-1-eno`, `(propan-1-il)`) or
 *    `MISSING_LOCANTS` (left-out locants the name needs);
 * 10. `SEGMENT_ORDER` — `eno` after `ino` (`pent-4-in-1-eno`);
 * 11. `OLD_STYLE` — old-style locants before the root (`2-buteno`).
 *
 * **Chain rules agree with the engine by construction**: rules 1–4 never
 * compare chains themselves; they follow the student's chain (studentParent,
 * in the student's locant order) through the naming result's own trace
 * (design.md §4.1, §4.3–4.4): a chain missing from the P1 candidates is not
 * a leaf-to-leaf path, so a branch sits on one of its ends (rule 1); the
 * first step whose survivors no longer hold the chain names the rule that
 * dropped it (P1 → rule 2; P2, P3, P4, N1–N5 → rule 3); otherwise the first
 * numbering step that drops the student's direction while the chain stays
 * gives rule 4. A chain or direction that reaches the presentation
 * tie-break (TIE) gives the same name as the parent, so it is no mistake.
 * The counts and locants quoted are the trace's own values.
 *
 * **Rings** (design.md §13.5, §14; phase I-50d). When the engine's parent
 * is the ring (always, for a hydrocarbon with one ring: a ring is senior to
 * any chain), its trace has no chain choice (no P1: a `RING` step, then the
 * ring numbering), so rules 1–4 give way to the ring rules, each numbered
 * as the rule whose place it takes, then rules 5–11 run as for a chain:
 *
 * 1. `RING_IS_PARENT` — the student's parent is an open chain and the ring
 *    a branch of it (`1-(4-metilfenil)propano`, `1-ciclohexilhexano`);
 *    trace rule `RING`, the step that makes the ring the parent;
 * 2. `BENZENE_RING` — a `ciclo` parent that is the benzene ring
 *    (`ciclohexa-1,3,5-trieno`: the ring has a name of its own), and
 *    `SUBSTITUTED_TEMPLATE` — a retained template with prefixes of the
 *    student's (`4-metiltolueno`, `p-metiltolueno`, `4-metil-1,2-xileno`,
 *    `pentametiltolueno`, `4-metilestireno`): the engine never substitutes
 *    tolueno, xileno, estireno or mesitileno (design.md §14.5), so the
 *    molecule is named from `benceno`; nor, since phase R-5a3a, the retained
 *    phenols (`4-clorocatecol`, `2-metilhidroquinona`, `tetrametilcresol`),
 *    named from `benceno` with their two OH groups as the suffix
 *    (`4-clorobenceno-1,2-diol`) or, with one (`cresol`), from `fenol`
 *    (`2,3,4,5,6-pentametilfenol`) — the message names that parent;
 * 4. `RING_NUMBERING` — the student's ring numbering (start and direction,
 *    studentParent in the student's locant order) leaves the engine's ring
 *    numbering trace (N1–N4, design.md §13.5; N1 and N2 never on benzene,
 *    §14.2) before the presentation tie-break: the rule that dropped it,
 *    found exactly as rule 4 finds a chain's direction (directionDraft();
 *    N4 only when it read the student's own words, «The student's words in
 *    the alphabetical rules» below);
 * 11. `LETTER_LOCANTS` — after every other rule, an orto/meta/para letter
 *    (design.md §14.4) the engine does not offer on that name, which written
 *    as its numbers is the engine's name: the old form exists only beside
 *    the default prefix style (`p-diisopropilbenceno`, never
 *    `p-di(propan-2-il)benceno`).
 *
 * Rules 5–11 read a ring parent as a chain: the ring's omission rules
 * (lexicon ringOmitsLocants(): `metilciclohexano`, `ciclohexeno`,
 * `metilbenceno`, `hexametilbenceno`) decide rule 9; a monosubstituted
 * benzene has no numbering trace (the engine does not number it), so a
 * locant on its one prefix, whichever, is needless (`1-metilbenceno`,
 * `2-metilbenceno`), while on `ciclo` a locant other than 1 is a numbering
 * mistake whose number is not even written (`2-metilciclohexano`).
 *
 * Ring cases no rule covers or that cannot occur (tested as they behave):
 * a ring parent the engine passes over for a chain needs a principal group
 * on the chain (design.md §13.5), so for a hydrocarbon the reverse of
 * RING_IS_PARENT never happens (for an alcohol both directions are
 * HYDROXY_PARENT, «Alcohols» below); a ring branch always hangs from a chain
 * parent (two rings bonded atom to atom, or three rings, are refused before
 * any search), so a ring branch numbered wrong (`1-(6-metilciclohexil)…`,
 * `(5-metilfenil)…`) is always preceded by RING_IS_PARENT; and, as on a
 * chain, a branch of the ring whose own chain or numbering is not the
 * engine's (`(butan-3-il)ciclohexano`) or written in a style the engine does
 * not offer (`(1,1-dimetiletil)benceno`) gets null, beside a letter too
 * (`p-di(butan-3-il)benceno`).
 *
 * **The student's prefix style** (design.md §1.1: `isopropil`, `pin`,
 * `substituted`): the citation order, hence N4, N5 and sometimes the parent
 * itself, depends on the words of the prefixes (`4-isopropil-6-metilnonano`
 * but `4-metil-6-(propan-2-il)nonano`). When the engine gives the molecule
 * names in other styles, the style is recognised **through the structure
 * of the student's branches**, never their spelling: every branch the
 * student wrote, at every depth, is found on the molecule and named there
 * by the engine in each style offered (substituent.js nameSubstituent());
 * the style in which the most of the student's branches have the engine's
 * shape (a retained word, or the length of the branch's own chain, where
 * its free valence sits and the shapes of its own branches — locants,
 * multipliers and `an` left out, so the form mistakes the later rules name
 * do not hide the style: `(1-metiletan-1-il)` is the `substituted` style's
 * `1-metiletil`) is chosen, the default on a tie. The molecule is then
 * named in that style by the engine (nameMolecule() `prefixStyle`); its
 * trace, parent and name are the ones every rule compares with and quotes,
 * and its explanation is the one the diagnosis's `step` belongs to
 * (diagnosisNaming(), diagnosisExplanation()).
 *
 * **The student's words in the alphabetical rules** (phase I-50d review).
 * The style recognised is the one most of the student's branches have, so
 * a branch written in a style the engine does not offer for the molecule
 * (`1-metilpropil` where the engine has only `butan-2-il`), or a name in
 * two styles, can put the student's prefixes in another citation order
 * than the trace's: `1-etil-2-(1-metilpropil)benceno` cites `etil` first
 * and numbers right for its own words, while the engine cites `butan-2-il`
 * first. The trace's N4 and N5 steps compare citation orders and names, so
 * rules 3 and 4 (and RING_NUMBERING) blame a chain or numbering only if
 * every such step up to the one that drops it compared, for the student's
 * chain or ring, the values the student's own words give
 * (judgedInOwnWords()); otherwise they blame nothing, as for any branch in
 * a style the engine does not offer (below), and the form rules 5–11, which
 * read the student's own words, still run (`2-(1-metilpropil)-1-etilbenceno`:
 * ALPHABETICAL_ORDER). A numbering diagnosis therefore never contradicts
 * the order of the student's words, nor does the explanation it opens.
 *
 * Rules 5–11 read the student's tiles (the lossless parse tree and its
 * NameSpec) and compare them with the naming rules the engine applies:
 * citation keys compared with numbering.js compareCitationKeys() (built
 * from the student's own words, so a name in any prefix style is judged in
 * its own words), identical branches by their structural key at every
 * depth (graph.js rootedBranchKey() of the first occurrence on the
 * molecule, with the bond order that attaches it: `metil` and
 * `(metan-1-il)` are one branch, inside a compound branch too; build.js
 * ownPrefixAtoms() finds a compound branch's own branches), di vs bis as
 * render.js isCompoundPrefix() decides for hydrocarbon branches (bis for a
 * branch with prefixes of its own), the omitted locants by the lexicon's
 * own omission rules (omitsLocants(), chainOmitsPrefixLocants()) and the
 * engine's short branch forms (`propil`, `etenil`: render.js
 * substituentTokens()). The right forms quoted are assembled from the
 * student's tree (assemble.js), never retyped; rule 6's grouped form takes
 * the short form of a branch written with needless locants
 * (`2,2-dimetil`, not `2,2-di(metan-1-il)`).
 *
 * Rules that cannot occur, or occur only beside an earlier one, for an
 * open-chain hydrocarbon `otherName` (tested as they behave):
 *
 * - a wrong multiplier count (`2,3-trimetil`) or a locant past the chain is
 *   `invalid` (parse.js LOCANT_COUNT, build.js LOCANT_RANGE), never
 *   `otherName`;
 * - needless *prefix* locants (`1-…metano`): the engine omits prefix
 *   locants only on a one- or two-carbon parent, where every carbon is an
 *   end, so rule 1 always comes first;
 * - `MISSING_LOCANTS` alone gives `missingLocants`, not `otherName`: it is
 *   the diagnosis only beside a later mistake (`butineno` → but-1-en-3-ino,
 *   whose `ino` before `eno` is rule 10);
 * - `NUMBERING` at N5: N5 never decides between the two directions of one
 *   chain (equal locants in citation order give the same name), only
 *   between chains (`CHAIN_ALPHABETICAL`).
 *
 * No rule covers (the diagnosis is null; the verdict stands alone): a
 * branch named in a prefix style the engine does not offer for the molecule
 * (`4-(1,1-dimetiletil)heptano`: the other styles are offered only beside an
 * isopropyl group, design.md §1.1), also when its words change the citation
 * order the numbering follows (`5-etil-7-(1-metilpropil)undecano`, above),
 * and a branch whose own chain or numbering is not the engine's
 * (`5-(butan-3-il)nonano`, `7-[2-(2-metilpropil)propil]tridecano`).
 *
 * A name with left-out locants (`metiletano`) is read through one placement
 * (readName() draws the first); every placement of the drawn structure is a
 * reading of the same name, so diagnose() tries the readings it is given and
 * keeps the most charitable diagnosis, the one of the latest rule (`butineno`
 * read as `but-3-in-1-eno` would be a numbering mistake, read as
 * `but-1-in-3-eno` it numbers like the engine and misses its locants). A
 * reading on which no rule applies is the most charitable of all: the
 * diagnosis is then null (phase I-50d: `(butan-3-il)ciclohexano`, read with
 * the branch on ring carbon 1, numbers the ring as the engine does and only
 * the branch's own numbering is wrong, which no rule covers; on the other
 * placements a ring numbering the student never wrote would be blamed).
 *
 * The result is a plain JSON-safe object (Diagnosis) carrying what the
 * results panel needs (phase I-49b): the code, the Spanish message, the
 * explanation step to open (`step`: the `id` of a step of
 * src/explain/explain.js explain() for the naming in the diagnosis's
 * `style` — `chain`, `tiebreak`, `numbering`, `substituents`, `order` or
 * `assemble`, for a ring `ring`, `benzene` or `ringNumbering` (a draft
 * may name the step of its own case: `ring` on a `ciclo` ring, `benzene` on
 * the benzene ring), and for an alcohol `group`, `ringChain` or
 * `groupChain`); diagnosisExplanation() builds those steps and finds it, with
 * the fallbacks of diagnosisStepIndex()), the student's chain and the
 * parent (atom and bond ids of the verdict's molecule, each in its own
 * locant order), the atoms the message is about and the student's tiles it
 * is about. The explanation must be that of the naming in the diagnosis's
 * style, not the verdict's own (default-style) naming: for
 * `6-metil-4-(propan-2-il)nonano` the default style numbers the chain as
 * the student did, and its numbering step would contradict the diagnosis.
 *
 * **Halogens** (design.md §15.8 R-5a; phase R-5a1). A halogen prefix
 * (`cloro`) is one atom, never a carbon: it never lengthens a chain, so rule
 * 1 blames only a carbon branch on an end (`1-cloro-1-metilpropano` →
 * `metil`); it counts as a substituent wherever the engine's trace counts it
 * (P4, N3, N4 — `2-cloroetano` is NUMBERING, `4-bromo-2-cloropentano` is
 * NUMBERING at N4), and the form rules read it like any branch word:
 * alphabetical order (`bromo < cloro < etil < fluoro < metil < yodo`,
 * multipliers ignored), identical halogens not grouped (UNGROUPED, said of
 * «sustituyentes»: `1-cloro-2-cloroetano`), locants not ascending, and the
 * needless prefix locants of a one- or two-carbon parent or of a parent
 * fully substituted by one halogen (`1-clorometano`, `1-cloroetano`,
 * `1,1,1,2,2,2-hexacloroetano`; with halogens these are no longer always
 * preceded by rule 1). The prefix style is recognised as before, a halogen
 * having the same shape in every style (`X:Cl`). Halogen cases no rule
 * covers give null, as for hydrocarbons: a compound branch whose own
 * numbering is not the engine's (`5-(1-cloroetan-2-il)…`, no style offers
 * it), as in «No rule covers» above.
 *
 * **Alcohols** (design.md §13.6, §15.8 R-5a; phases R-5a2, R-5a3a, R-5a3b).
 * The OH is the principal group: the engine's trace has P0 (most OH groups
 * on the chain) before P1 and N0 (lowest locants for the OH groups) before
 * N1, and, with a ring, a `RINGCHAIN` step when a side chain carries OH
 * groups too (the parent is the ring or the chain with more OH groups, the
 * ring on a tie: design.md §13.4 I-40a). The rules above keep working
 * wherever they say something true of an alcohol, and these name an
 * alcohol's own mistakes:
 *
 * 1. `HYDROXY_PREFIX` — checked before every other rule (the explanation
 *    names the principal group before it looks for the chain): an OH the
 *    engine cites in the suffix, written by the student as a `hidroxi`
 *    prefix of the parent (`2-hidroxipropano`, `2-hidroxipropan-1-ol`,
 *    `4-hidroxitolueno`; on a retained phenol `4-hidroxicatecol`,
 *    `2-hidroxihidroquinona`, `5-hidroxiresorcinol`, which the engine names
 *    from `benceno` with all their OH groups in the suffix, never as
 *    SUBSTITUTED_TEMPLATE); step `group`;
 * 1. `HYDROXY_PARENT` — next, in place of RING_IS_PARENT: the student's
 *    parent is an open chain and the engine's the ring, or the reverse, in a
 *    molecule with OH groups (`(4-hidroxifenil)metano`,
 *    `(4-hidroxiciclohexil)metanol`; `(2-hidroxietil)ciclohexano`): the
 *    message gives the OH counts of the ring and of the best chain from the
 *    `RINGCHAIN` step (without one, every OH is on the ring). RING_IS_PARENT
 *    («un anillo manda siempre») is never said of an alcohol, whose ring
 *    always carries an OH when it is the parent. Trace rule `RINGCHAIN`
 *    (`RING` without that step), step `ringChain` (`benzene` or `ring`
 *    without it);
 * 2. `MORE_HYDROXY_GROUPS` — the student's chain was dropped at P0: another
 *    chain carries more OH groups (`2-(hidroximetil)propan-1-ol`,
 *    `2-(hidroximetil)pentano`); step `groupChain`. The leaf-to-leaf test of
 *    rule 1 reads the first chain step, P0 (every leaf-to-leaf chain) when
 *    the trace has it, and this rule comes before BRANCH_AT_END there: a
 *    chain with a branch on its end that no chain P0 keeps contains — one
 *    P0 drops however lengthened — is MORE_HYDROXY_GROUPS
 *    (`1-metil-2-(hidroximetil)hexan-1-ol` → `2-butilbutano-1,3-diol`;
 *    fewerHydroxyGroups(), the student's count its chain's own, as P0 counts
 *    it), since the OH groups choose the chain before its length;
 *    BRANCH_AT_END stays for a chain that a chain P0 keeps contains
 *    (`1-metilpropan-2-ol`, `1-(hidroximetil)propan-1-ol` →
 *    `butano-1,2-diol`);
 * 2. `PHENOL` — beside BENZENE_RING: benzene with one OH written with
 *    `benceno` and `ol` (`bencenol`, `4-metilbencenol`), which has a name of
 *    its own, `fenol`; step `group`;
 * 3. `CHAIN_LOCANTS` at N0 — another chain as long, with as many OH groups
 *    (other ones), gives them lower locants
 *    (`3-(2-hidroxietil)pentano-2,4-diol` → `3-(1-hidroxietil)pentano-1,4-diol`);
 * 4. `NUMBERING` and `RING_NUMBERING` at N0 — the chain or ring numbered so
 *    that the OH groups do not get the lowest locants (`butan-3-ol`,
 *    `ciclohexan-2-ol`, `benceno-1,5-diol`); N1–N4 after an N0 tie keep
 *    their rule (`pent-4-en-3-ol` → NUMBERING at N1,
 *    `6-metilciclohexan-1-ol` → RING_NUMBERING at N3). Both read the N0
 *    phrases of DIAGNOSIS_PHRASES.
 *
 * The form rules read the suffix too: its locants out of order are
 * LOCANT_ORDER (`butano-4,1-diol`); its needless locants NEEDLESS_LOCANTS
 * («…de colocar el grupo –OH»: `etan-1-ol`, `ciclohexan-1-ol`,
 * `triclorometan-1-ol`; the engine omits the suffix's locants together with
 * the prefixes', lexicon chainOmitsPrefixLocants() and ringOmitsLocants());
 * its missing ones follow the same omission rule (`bencenol` is PHENOL, not
 * MISSING_LOCANTS); and its old-style locants are OLD_STYLE with the
 * suffix's words («justo delante de «ol»»: `2-propanol` → `propan-2-ol`,
 * `1,2-etanodiol` → «diol»), which the results panel shows in place of the
 * verdict's old-style note, as for a segment's (`3-buten-2-ol`, «eno»).
 * `hidroxi` is a one-atom group like a halogen (never lengthens a chain,
 * `X:O` in every style, «sustituyentes») wherever the engine writes it too
 * (inside a compound branch: `(hidroximetil)`). The closing-bond locant
 * `1(n)` sorts between 1 and 2 (`1,1(3),2`). A retained phenol with
 * prefixes of the student's other than `hidroxi` (R-5a3a: `4-clorocatecol`)
 * is SUBSTITUTED_TEMPLATE (above): its OH groups are the suffix the engine
 * writes too; it needs no message of its own otherwise (its bare forms are
 * alternatives, its numbers and letters refused by the parser, a letter
 * beside a prefix being three positions). The alcohol messages speak of OH
 * groups, so they are given only when the engine's principal group is the
 * OH (outsideRules(): a principal group of a later family gets null until
 * its phase adds its messages; no tile writes one today).
 *
 * Every Spanish string is a draft pending teacher review (design.md §15,
 * last paragraph): all of them live in DIAGNOSIS_TEXTS, and DIAGNOSES gives
 * example data for each code so the wording can be listed (R-7). Later
 * family phases (R-5a…R-6d) add their codes to DIAGNOSES / DIAGNOSIS_TEXTS
 * and their checks to FORM_RULES (or new trace rules to the chain walk).
 */

import { nameMolecule } from '../naming/index.js';
import { compareLocantLists, compareCitationKeys } from '../naming/numbering.js';
import { chainKey } from '../naming/parent.js';
import { locantText } from '../naming/structure.js';
import { PREFIX_STYLES, nameSubstituent, suffixSites } from '../naming/substituent.js';
import { adjacency, rootedBranchKey } from '../model/graph.js';
import {
  stem, multiplier, compoundMultiplier, ENDINGS, ENCLOSING_MARKS, RETAINED_PREFIXES, FREE_VALENCE_SUFFIXES, omitsLocants,
  chainOmitsPrefixLocants, ringOmitsLocants, BENZENE_NAME, RING_PREFIX, POSITIONAL_LETTERS, TRADITIONAL_NAMES, SATURATED_INFIX,
} from '../naming/lexicon.es.js';
import { assemble, itemText } from './assemble.js';
import { ownPrefixAtoms, specRings, isRing } from './build.js';
import { tileById, tileId, MAX_MULT, isAtomGroup, HYDROXY_ELEMENT, HYDROXY_ID, OL_ID, PHENOL_ID } from './tiles.js';

/** Most placements of a name with left-out locants that readName() hands over as readings (the drawn one first). */
export const MAX_READINGS = 16;

/** Words quoted by the messages, from the lexicon (never retyped). */
const WORDS = Object.freeze({
  di: multiplier(2),
  tri: multiplier(3),
  bis: compoundMultiplier(2),
  tris: compoundMultiplier(3),
  eno: ENDINGS.double,
  ino: ENDINGS.triple,
  en: ENDINGS.double.slice(0, -1),
  tert: RETAINED_PREFIXES['tert-butyl'].italic,
  metil: `${stem(1)}${FREE_VALENCE_SUFFIXES[1]}`,
  etil: `${stem(2)}${FREE_VALENCE_SUFFIXES[1]}`,
  benceno: BENZENE_NAME,
  fenol: tileById(PHENOL_ID).text,
  hidroxi: tileById(HYDROXY_ID).text,
  ol: tileById(OL_ID).text,
  /** Benzene with the suffix `ol` by the general rules (the `o` of `benceno` elided before the vowel; R-5a2). */
  bencenol: `${BENZENE_NAME.slice(0, -1)}${tileById(OL_ID).text}`,
  tolueno: TRADITIONAL_NAMES.toluene,
  /** The orto/meta/para letters, quoted «o», «m» y «p». */
  letters: Object.values(POSITIONAL_LETTERS).map((letter) => `«${letter}»`),
});

/** The SubstituentSpec kind of a `hidroxi` prefix (tiles.js; R-5a2). */
const HYDROXY_KIND = tileById(HYDROXY_ID).kind;

/** The principal group the alcohol messages speak of (the `ol` tile's value, a lexicon GROUP_SUFFIXES key; R-5a3b). */
const ALCOHOL = tileById(OL_ID).value;

/** Italic descriptors of the retained branch words (`tert-`), left out of alphabetical order. */
const ITALIC_DESCRIPTORS = Object.freeze([...new Set(Object.values(RETAINED_PREFIXES).map((r) => r.italic).filter(Boolean))]);

/**
 * The Spanish drafts (pending teacher review) of every diagnosis: one
 * template per code, called with the code's data, and the phrases they use.
 */
export const DIAGNOSIS_TEXTS = Object.freeze({
  HYDROXY_PREFIX: (d) => (d.count === 1
    ? `El grupo –OH es el grupo principal: se nombra con la terminación «-${d.ending}», al final del nombre, no con el prefijo `
      + `«${WORDS.hidroxi}». Se escribe «${d.name}».`
    : `Los grupos –OH son el grupo principal: los ${d.ring ? 'del anillo' : 'de la cadena principal'} se nombran todos juntos `
      + `con la terminación «-${d.ending}», al final del nombre, no con el prefijo «${WORDS.hidroxi}». Se escribe «${d.name}».`),
  HYDROXY_PARENT: (d) => 'La cadena principal es la que lleva más grupos –OH, sea el anillo o una cadena abierta; solo si '
    + `empatan manda el anillo. Aquí ${DIAGNOSIS_PHRASES.hydroxyChoice(d)}: «${d.name}».`,
  BRANCH_AT_END: (d) => `La rama «${d.branch}» está en el extremo de la cadena, así que la alarga: `
    + `la cadena principal tiene ${d.length} carbonos.`,
  RING_IS_PARENT: (d) => 'El anillo es la cadena principal: un anillo manda siempre sobre una cadena abierta, aunque la cadena '
    + `sea más larga. Tu cadena de ${d.length} ${d.length === 1 ? 'carbono' : 'carbonos'} va en una rama del anillo: «${d.name}».`,
  MORE_HYDROXY_GROUPS: (d) => `Hay otra cadena con más grupos –OH (${d.app}; la tuya tiene ${d.student}). La cadena principal es `
    + 'la que lleva más grupos –OH, aunque no sea la más larga.',
  LONGER_CHAIN: (d) => `Hay una cadena más larga que la tuya: la tuya tiene ${d.student} carbonos y la cadena principal `
    + `tiene ${d.length}.`,
  BENZENE_RING: (d) => 'Un anillo de 6 carbonos con tres enlaces dobles alternados, uno sí y uno no, es el benceno, y tiene '
    + `nombre propio: «${WORDS.benceno}».${d.name === WORDS.benceno ? '' : ` Se escribe «${d.name}».`}`,
  SUBSTITUTED_TEMPLATE: (d) => `El nombre tradicional «${d.template}» no admite más sustituyentes: con más ramas en el anillo, `
    + `la molécula se nombra a partir de «${d.parent}», con todas las ramas delante: «${d.name}».`,
  PHENOL: (d) => `Un benceno con un solo grupo –OH tiene nombre propio: «${WORDS.fenol}», no «${WORDS.bencenol}».`
    + `${d.name === WORDS.fenol ? '' : ` Se escribe «${d.name}».`}`,
  MORE_MULTIPLE_BONDS: (d) => `Hay otra cadena igual de larga con más enlaces dobles o triples (${d.app}; la tuya tiene `
    + `${d.student}). Entre cadenas igual de largas, gana la que tiene más.`,
  MORE_DOUBLE_BONDS: (d) => `Hay otra cadena igual de larga, con los mismos enlaces múltiples, pero con más enlaces dobles `
    + `(${d.app}; la tuya tiene ${d.student}). En ese empate gana la que tiene más enlaces dobles.`,
  MORE_SUBSTITUENTS: (d) => `Hay otra cadena igual de larga con más sustituyentes (${d.app}; la tuya tiene ${d.student}). `
    + `Entre cadenas igual de largas, gana la que tiene más ${d.halogen ? 'sustituyentes' : 'ramas'}.`,
  CHAIN_LOCANTS: (d) => `Hay otra cadena igual de larga que, bien numerada, da números más bajos a `
    + `${DIAGNOSIS_PHRASES.lowerLocantsOf[d.rule]}${difference(d)}: esa es la cadena principal.`,
  CHAIN_ALPHABETICAL: () => 'Hay otra cadena igual de larga, con los mismos números, cuyo nombre va antes por orden '
    + 'alfabético: esa es la cadena principal.',
  NUMBERING: (d) => `Hay que numerar la cadena desde el otro extremo: ${DIAGNOSIS_PHRASES.numberingReasons[d.rule]}`
    + `${difference(d)}.${d.unwritten ? ` En «${d.name}» ese número ni siquiera se escribe.` : ''}`,
  RING_NUMBERING: (d) => 'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: '
    + `${DIAGNOSIS_PHRASES.numberingReasons[d.rule]}${difference(d)}.`
    + `${d.unwritten ? ` En «${d.name}» ese número ni siquiera se escribe.` : ''}`,
  ALPHABETICAL_ORDER: (d) => `Los sustituyentes se escriben por orden alfabético: «${d.first}» va antes que «${d.second}» `
    + `(${d.why}).${d.hint ? ` ${d.hint}` : ''}`,
  UNGROUPED: (d) => `${d.halogen ? 'Los sustituyentes iguales' : 'Las ramas iguales'} se escriben una sola vez, con `
    + `${d.compound ? `«${WORDS.bis}», «${WORDS.tris}»…` : `«${WORDS.di}», «${WORDS.tri}»…`} delante: `
    + `«${d.right}», no «${d.student}».`,
  MULTIPLIER_KIND: (d) => (d.compound
    ? `Delante de una rama que tiene sus propias ramas se usa «${WORDS.bis}», «${WORDS.tris}»…: «${d.right}», `
      + `no «${d.student}».`
    : `«${WORDS.bis}», «${WORDS.tris}»… solo van delante de ramas que tienen sus propias ramas; aquí va `
      + `«${WORDS.di}», «${WORDS.tri}»…: «${d.right}», no «${d.student}».`),
  LOCANT_ORDER: (d) => `Los números de un mismo grupo se escriben de menor a mayor: «${d.right}», no «${d.student}».`,
  NEEDLESS_LOCANTS: (d) => {
    if (d.branch) {
      return `Sobran números dentro de la rama: se escribe «${d.right}», no «${d.student}».`;
    }
    if (!d.kept) {
      return `En «${d.name}» no se escriben números: solo hay una manera de colocar ${d.what}.`;
    }
    // The app's name still has numbers, inside its branches: only the parent's locants are left out.
    return d.plural
      ? `En «${d.name}» no se escriben los números que dicen en qué carbonos ${d.on} van ${d.what}: solo hay una manera `
        + 'de colocarlos. Los números de dentro de las ramas sí se escriben.'
      : `En «${d.name}» no se escribe el número que dice en qué carbono ${d.on} va ${d.what}: solo hay una manera `
        + 'de colocarlo. Los números de dentro de la rama sí se escriben.';
  }, // End of the NEEDLESS_LOCANTS template
  MISSING_LOCANTS: (d) => `Faltan números: hay que decir en qué carbono va cada rama y cada enlace doble o triple, `
    + `como en «${d.name}».`,
  SEGMENT_ORDER: (d) => `Cuando hay enlaces dobles y triples, «${WORDS.en}» se escribe antes que «${WORDS.ino}»: `
    + `«${d.name}», no «${d.student}».`,
  OLD_STYLE: (d) => `Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, justo delante de `
    + `${d.suffix ? `«${d.suffix}»` : `«${WORDS.eno}» o «${WORDS.ino}»`}: «${d.name}».`,
  LETTER_LOCANTS: (d) => `Las letras ${WORDS.letters.slice(0, -1).join(', ')} y ${WORDS.letters[WORDS.letters.length - 1]} `
    + `(orto, meta y para) son una forma antigua de decir dónde van dos grupos del benceno, y con estas ramas no se usan: `
    + `se escriben los números, «${d.name}».`,
});

/** The phrases the templates of DIAGNOSIS_TEXTS fill in (Spanish drafts, pending teacher review). */
export const DIAGNOSIS_PHRASES = Object.freeze({
  /** What another chain numbers lower (CHAIN_LOCANTS), by trace rule (N0: an alcohol's OH groups, R-5a3b). */
  lowerLocantsOf: Object.freeze({
    N0: 'los grupos –OH',
    N1: 'los enlaces dobles y triples',
    N2: 'los enlaces dobles',
    N3: 'los sustituyentes',
    N4: 'los sustituyentes, leídos en orden alfabético',
  }),
  /**
   * Why the other end is right (NUMBERING, RING_NUMBERING), by trace rule; N0 (R-5a3b) as the explanation's numbering step
   * words it, «los grupos –OH (el grupo principal) deben tener los localizadores más bajos», for one OH too.
   */
  numberingReasons: Object.freeze({
    N0: 'los grupos –OH (el grupo principal) tienen que llevar los números más bajos',
    N1: 'los enlaces dobles y triples tienen que llevar los números más bajos',
    N2: 'con los mismos números para los enlaces múltiples, los enlaces dobles tienen que llevar los más bajos',
    N3: 'los sustituyentes tienen que llevar los números más bajos',
    N4: 'con los mismos números, el sustituyente que va primero por orden alfabético tiene que llevar el más bajo',
    N5: 'con los mismos números, gana la numeración cuyo nombre va antes por orden alfabético',
  }),
  /** Why one prefix goes before another (ALPHABETICAL_ORDER). */
  why: Object.freeze({
    letters: (a, b) => `${a} antes que ${b}`,
    shorter: 'la palabra más corta va primero',
    numbers: 'con las mismas letras, va primero la del número más bajo',
  }),
  /** Hints added to ALPHABETICAL_ORDER when the student seems to have counted a multiplier or `tert-`. */
  hints: Object.freeze({
    multipliers: `Los prefijos ${WORDS.di}-, ${WORDS.tri}-… no cuentan para el orden.`,
    italic: `«${WORDS.tert}» no cuenta para el orden.`,
  }),
  /** What a parent without locants has in one place only (NEEDLESS_LOCANTS). */
  what: Object.freeze({
    double: 'el enlace doble',
    triple: 'el enlace triple',
    doubles: 'los enlaces dobles',
    triples: 'los enlaces triples',
    both: 'los enlaces dobles y triples',
    prefix: 'el sustituyente',
    prefixes: 'los sustituyentes',
    hydroxy: 'el grupo –OH',
    hydroxys: 'los grupos –OH',
    /** The prefixes and the suffix's OH groups, both written with needless locants (`1,1,1-triclorometan-1-ol`). */
    together: (prefixes, hydroxy) => `${prefixes} y ${hydroxy}`,
  }),
  /** Where the left-out prefix locants would place the prefixes (NEEDLESS_LOCANTS, a name whose branches keep numbers). */
  on: Object.freeze({
    ring: 'del anillo',
    chain: 'de la cadena',
  }),
  /**
   * How many OH groups the ring and the best chain carry, and which one wins (HYDROXY_PARENT, R-5a3b; the explanation's
   * «Anillo o cadena» step says it the same way).
   *
   * @param {{ring: number, chain: number, chainParent: boolean}} d - The counts, and whether the chain is the parent.
   * @returns {string} The phrase.
   */
  hydroxyChoice: (d) => {
    /**
     * A count of OH groups as the phrase says it.
     *
     * @param {number} n - The count.
     * @returns {string} «ninguno», «uno» or the number.
     */
    const count = (n) => ['ninguno', 'uno'][n] || String(n);
    if (d.chainParent) {
      return `el anillo ${d.ring === 0 ? 'no lleva ninguno' : `lleva ${count(d.ring)}`} y la mejor cadena, ${count(d.chain)}, `
        + 'así que gana la cadena y el anillo va en una rama';
    }
    if (d.ring === d.chain) {
      return `el anillo y la mejor cadena llevan ${count(d.ring)} cada uno, así que gana el anillo`;
    }
    const chains = d.chain === 0 ? 'las cadenas no llevan ninguno' : `la mejor cadena, ${count(d.chain)}`;
    return `el anillo lleva ${count(d.ring)} y ${chains}, así que gana el anillo`;
  }, // End of the hydroxyChoice phrase
});

/**
 * Every diagnosis code, in the order of the rules (design.md §15.8 R-3; the
 * ring rules of R-4 and the alcohol rules of R-5a beside the chain rules
 * whose place they take, file header): its rule number (1–11), the
 * explanation step it points at (an explain() step id, design.md §5; a draft
 * may give its own case's step, `benzene` for RING_IS_PARENT on the benzene
 * ring) and example data for its message (R-7 lists the drafts with it).
 * Frozen; later families add their codes.
 */
export const DIAGNOSES = Object.freeze({
  HYDROXY_PREFIX: Object.freeze({
    rule: 1,
    step: 'group',
    example: Object.freeze({ count: 1, ending: WORDS.ol, ring: false, name: `${stem(3)}${SATURATED_INFIX}-2-${WORDS.ol}` }),
  }),
  HYDROXY_PARENT: Object.freeze({
    rule: 1,
    step: 'ringChain',
    example: Object.freeze({
      ring: 0,
      chain: 1,
      chainParent: true,
      name: `2-${RING_PREFIX}${stem(6)}${FREE_VALENCE_SUFFIXES[1]}${stem(2)}${SATURATED_INFIX}-1-${WORDS.ol}`,
    }),
  }),
  BRANCH_AT_END: Object.freeze({ rule: 1, step: 'chain', example: Object.freeze({ branch: WORDS.metil, length: 4 }) }),
  RING_IS_PARENT: Object.freeze({
    rule: 1,
    step: 'ring',
    example: Object.freeze({ length: 3, name: `${stem(3)}${FREE_VALENCE_SUFFIXES[1]}${RING_PREFIX}${stem(6)}${ENDINGS.saturated}` }),
  }),
  MORE_HYDROXY_GROUPS: Object.freeze({
    rule: 2, step: 'groupChain', example: Object.freeze({ student: 1, app: 2, length: 3, halogen: false }),
  }),
  LONGER_CHAIN: Object.freeze({ rule: 2, step: 'chain', example: Object.freeze({ student: 4, length: 5 }) }),
  BENZENE_RING: Object.freeze({ rule: 2, step: 'benzene', example: Object.freeze({ name: `${WORDS.metil}${WORDS.benceno}` }) }),
  SUBSTITUTED_TEMPLATE: Object.freeze({
    rule: 2,
    step: 'benzene',
    example: Object.freeze({ template: WORDS.tolueno, parent: WORDS.benceno, name: `1,4-${WORDS.di}${WORDS.metil}${WORDS.benceno}` }),
  }),
  PHENOL: Object.freeze({ rule: 2, step: 'group', example: Object.freeze({ name: `4-${WORDS.metil}${WORDS.fenol}` }) }),
  MORE_MULTIPLE_BONDS: Object.freeze({ rule: 3, step: 'tiebreak', example: Object.freeze({ student: 0, app: 1 }) }),
  MORE_DOUBLE_BONDS: Object.freeze({ rule: 3, step: 'tiebreak', example: Object.freeze({ student: 0, app: 1 }) }),
  MORE_SUBSTITUENTS: Object.freeze({ rule: 3, step: 'tiebreak', example: Object.freeze({ student: 1, app: 2, halogen: false }) }),
  CHAIN_LOCANTS: Object.freeze({ rule: 3, step: 'numbering', example: Object.freeze({ rule: 'N1', app: '1', student: '2' }) }),
  CHAIN_ALPHABETICAL: Object.freeze({ rule: 3, step: 'numbering', example: Object.freeze({}) }),
  NUMBERING: Object.freeze({
    rule: 4, step: 'numbering', example: Object.freeze({ rule: 'N3', app: '2', student: '4', unwritten: false, name: '' }),
  }),
  RING_NUMBERING: Object.freeze({
    rule: 4, step: 'ringNumbering', example: Object.freeze({ rule: 'N3', app: '3', student: '5', unwritten: false, name: '' }),
  }),
  ALPHABETICAL_ORDER: Object.freeze({
    rule: 5,
    step: 'order',
    example: Object.freeze({
      first: WORDS.etil, second: WORDS.metil, why: DIAGNOSIS_PHRASES.why.letters(WORDS.etil[0], WORDS.metil[0]), hint: '',
    }),
  }),
  UNGROUPED: Object.freeze({
    rule: 6, step: 'substituents',
    example: Object.freeze({
      compound: false, halogen: false, right: `2,3-${WORDS.di}${WORDS.metil}`, student: `2-${WORDS.metil}-3-${WORDS.metil}`,
    }),
  }),
  MULTIPLIER_KIND: Object.freeze({
    rule: 7, step: 'substituents',
    example: Object.freeze({ compound: false, right: `2,3-${WORDS.di}${WORDS.metil}`, student: `2,3-${WORDS.bis}${WORDS.metil}` }),
  }),
  LOCANT_ORDER: Object.freeze({
    rule: 8, step: 'assemble',
    example: Object.freeze({ right: `2,3-${WORDS.di}${WORDS.metil}`, student: `3,2-${WORDS.di}${WORDS.metil}` }),
  }),
  NEEDLESS_LOCANTS: Object.freeze({
    rule: 9,
    step: 'numbering',
    example: Object.freeze({
      branch: false, name: `${stem(3)}${WORDS.eno}`, what: DIAGNOSIS_PHRASES.what.double, right: '', student: '', kept: false,
      plural: false, on: '',
    }),
  }),
  MISSING_LOCANTS: Object.freeze({
    rule: 9, step: 'numbering', example: Object.freeze({ name: `2-${WORDS.metil}${stem(5)}${ENDINGS.saturated}` }),
  }),
  SEGMENT_ORDER: Object.freeze({
    rule: 10,
    step: 'assemble',
    example: Object.freeze({
      name: `${stem(5)}-1-${WORDS.en}-4-${WORDS.ino}`, student: `${stem(5)}-4-${WORDS.ino.slice(0, -1)}-1-${WORDS.eno}`,
    }),
  }),
  OLD_STYLE: Object.freeze({ rule: 11, step: 'assemble', example: Object.freeze({ name: `${stem(4)}-2-${WORDS.eno}`, suffix: null }) }),
  LETTER_LOCANTS: Object.freeze({
    rule: 11, step: 'ringNumbering', example: Object.freeze({ name: `1,4-${WORDS.di}(${stem(3)}an-2-${FREE_VALENCE_SUFFIXES[1]})${WORDS.benceno}` }),
  }),
});

/** The diagnosis codes, in rule order. */
export const DIAGNOSIS_CODES = Object.freeze(Object.keys(DIAGNOSES));

/**
 * Explanation steps to open when a diagnosis's own step is missing from
 * the steps shown (diagnosisStepIndex()): the nearest step that still
 * explains the rule. For an open-chain hydrocarbon the step of every
 * diagnosis of the tested corpus exists, except `order` for a mistake
 * inside the one compound branch of a parent with a single prefix group
 * (explain() skips the order step then; `substituents` explains the
 * branch's prefixes, tested); the fallbacks also keep later families safe.
 * On a ring (phase I-50d) a rule of the chain's `numbering` step opens
 * «Numera el anillo» (`ringNumbering`), which a monosubstituted benzene does
 * not have (the engine does not number it): «Monta el nombre» says the
 * locant is not written (`1-metilbenceno`, tested). An alcohol (R-5a3b) always
 * has `group` and, on a chain parent, `groupChain`; `ringChain` exists only
 * when a side chain carries OH groups too, which HYDROXY_PARENT checks
 * itself (it names `benzene` or `ring` otherwise); a monosubstituted
 * benzene or a one-carbon parent has no numbering step (`triclorometanol`:
 * «Monta el nombre»).
 */
export const STEP_FALLBACKS = Object.freeze({
  group: Object.freeze(['count']),
  ringChain: Object.freeze(['ring', 'benzene', 'groupChain']),
  groupChain: Object.freeze(['chain', 'count']),
  chain: Object.freeze(['groupChain', 'count']),
  tiebreak: Object.freeze(['chain', 'groupChain']),
  numbering: Object.freeze(['ringNumbering', 'assemble']),
  substituents: Object.freeze(['assemble']),
  order: Object.freeze(['substituents', 'assemble']),
  assemble: Object.freeze([]),
  ring: Object.freeze(['benzene', 'count']),
  benzene: Object.freeze(['ring', 'count']),
  ringNumbering: Object.freeze(['numbering', 'assemble']),
});

/**
 * A diagnosis (design.md §15.3 `otherName`): JSON-safe data for the
 * results panel.
 *
 * @typedef {object} Diagnosis
 * @property {string} code - A DIAGNOSES key.
 * @property {number} rule - Its rule number in design.md §15.8 R-3 (1–11; a ring or alcohol rule takes the number of the
 *   rule whose place it takes, file header).
 * @property {string|null} traceRule - The engine trace rule the diagnosis follows ('P0'…'P4', 'N0'…'N5'; 'RING' for
 *   RING_IS_PARENT; 'RINGCHAIN' or 'RING' for HYDROXY_PARENT), or null for HYDROXY_PREFIX, BENZENE_RING,
 *   SUBSTITUTED_TEMPLATE, PHENOL and rules 5–11.
 * @property {string} message - The Spanish message (DIAGNOSIS_TEXTS).
 * @property {string} step - The `id` of the explain() step that explains the rule, a step of the explanation of the naming
 *   in `style` (diagnosisExplanation() builds it and finds the step; diagnosisStepIndex()).
 * @property {string} style - The prefix style compared with (substituent.js PREFIX_STYLES; the student's own), the
 *   explanation context: the trace, `parent` and `step` belong to nameMolecule(molecule, {prefixStyle: style})
 *   (diagnosisNaming(); the verdict's own naming for the default style).
 * @property {{atoms: number[], bonds: number[]}} student - The student's parent chain (or ring, its closing bond last), in
 *   the student's locant order.
 * @property {{atoms: number[], bonds: number[]}} parent - The app's parent chain or ring in that style (the naming's
 *   `parent`; the verdict's naming for the default style), in its locant order.
 * @property {{atoms: number[], bonds: number[]}} focus - The atoms and bonds the message is about (empty when none).
 * @property {[number, number]|null} tiles - The student's tiles the message is about, `[from, to)`, or null.
 */

/**
 * The parenthetical «(2 en vez de 4)» of a locant comparison, or nothing
 * when there are no locants to show.
 *
 * @param {{app?: string|null, student?: string|null}} d - The diagnosis data.
 * @returns {string} The text, with its leading space.
 */
function difference(d) {
  return d.app === null || d.app === undefined ? '' : ` (${d.app} en vez de ${d.student})`;
}

/**
 * A copy of an atoms-and-bonds selection.
 *
 * @param {{atoms: number[], bonds: number[]}|null|undefined} ids - The selection.
 * @returns {{atoms: number[], bonds: number[]}} The copy (empty lists for none).
 */
function idsOf(ids) {
  return { atoms: ids ? [...ids.atoms] : [], bonds: ids ? [...ids.bonds] : [] };
}

/**
 * The atoms and bonds of some prefix occurrences (build.js prefixAtoms
 * entries): each branch with the bond that joins it to the chain.
 *
 * @param {object[]} occurrences - prefixAtoms entries.
 * @returns {{atoms: number[], bonds: number[]}} The ids.
 */
function occurrenceIds(occurrences) {
  return {
    atoms: occurrences.flatMap((o) => o.atoms),
    bonds: occurrences.flatMap((o) => [o.bond, ...o.bonds]),
  };
}

/**
 * The text of a substituent without the enclosing marks around the whole of
 * it: `(2-metilpropil)` → `2-metilpropil`.
 *
 * @param {string} text - The text.
 * @returns {string} The text without its outer marks.
 */
function unwrap(text) {
  for (const [open, close] of ENCLOSING_MARKS) {
    if (text.length > open.length + close.length && text.startsWith(open) && text.endsWith(close)) {
      return text.slice(open.length, text.length - close.length);
    }
  }
  return text;
}

/**
 * The words of a prefix as the student wrote them, without its locants,
 * multiplier and outer enclosing marks: `metil`, `propan-2-il`,
 * `2,2-dimetilpropil`, `tert-butil`.
 *
 * @param {object} tree - The parse() tree.
 * @param {object} item - One of its prefix nodes.
 * @returns {string} The words.
 */
function wordsOf(tree, item) {
  return unwrap(itemText(tree, { ...item, locants: [], multiplier: null }));
}

/**
 * The alphanumerical citation key of a prefix written by the student
 * (design.md §1.1, render.js citationKey()): the letters of its words
 * (external multiplier, locants, punctuation and italic descriptors left
 * out; multipliers inside a compound branch kept), its numbers in order,
 * its italic descriptors. Compared with numbering.js compareCitationKeys().
 *
 * @param {string} words - wordsOf() the prefix.
 * @param {{withItalic?: boolean, lead?: string}} [options] - Count the italic descriptors as letters, or put a multiplier's letters first (the hints of ALPHABETICAL_ORDER).
 * @returns {{alpha: string, numeric: number[], italic: string}} The key.
 */
function citationKeyOf(words, options = {}) {
  let rest = words;
  let italic = '';
  if (!options.withItalic) {
    for (const descriptor of ITALIC_DESCRIPTORS) {
      if (rest.includes(descriptor)) {
        italic += descriptor;
        rest = rest.split(descriptor).join('');
      }
    }
  }
  return {
    alpha: `${options.lead || ''}${rest}`.toLowerCase().replace(/[^a-z]/g, ''),
    numeric: (rest.match(/\d+/g) || []).map(Number),
    italic,
  };
} // End of function citationKeyOf()

/**
 * Why one citation key goes before another (ALPHABETICAL_ORDER): the first
 * letters that differ, the shorter word, or the numbers.
 *
 * @param {{alpha: string}} first - The key that goes first.
 * @param {{alpha: string}} second - The key written first by the student.
 * @returns {string} The phrase.
 */
function orderReason(first, second) {
  const n = Math.min(first.alpha.length, second.alpha.length);
  for (let i = 0; i < n; i += 1) {
    if (first.alpha[i] !== second.alpha[i]) {
      return DIAGNOSIS_PHRASES.why.letters(first.alpha[i], second.alpha[i]);
    }
  }
  return first.alpha.length === second.alpha.length ? DIAGNOSIS_PHRASES.why.numbers : DIAGNOSIS_PHRASES.why.shorter;
}

/**
 * Tells whether a SubstituentSpec is a one-atom group: a halogen (R-5a1:
 * `cloro`…) or `hidroxi` (R-5a2).
 *
 * @param {object} sub - A SubstituentSpec (interpret.js).
 * @returns {boolean} True for a one-atom group.
 */
function isHalogen(sub) {
  return isAtomGroup(sub.kind);
}

/**
 * Tells whether some prefixes hold a one-atom group (a halogen, R-5a1;
 * `hidroxi`, R-5a2), at any depth: the messages then speak of
 * «sustituyentes», not «ramas».
 *
 * @param {object[]} prefixes - PrefixSpecs (interpret.js).
 * @returns {boolean} True when one is among them or inside a compound branch.
 */
function hasHalogen(prefixes) {
  return prefixes.some((prefix) => isHalogen(prefix.substituent) || hasHalogen(prefix.substituent.prefixes));
}

/**
 * Tells whether a branch node takes bis/tris rather than di/tri when
 * multiplied: a compound branch with prefixes of its own (render.js
 * isCompoundPrefix() for hydrocarbon branches); a retained word or a
 * plain chain, even enclosed for its own locants (`di(propan-2-il)`), is
 * simple.
 *
 * @param {object} node - A substituent node (parse.js chain, retained or branch).
 * @returns {boolean} True for bis/tris.
 */
function isCompoundNode(node) {
  return node.type === 'branch' && node.items.length > 0;
}

/**
 * How many occurrences a prefix node stands for: its multiplier, or one.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} item - A prefix node.
 * @returns {number} The count.
 */
function countOf(tiles, item) {
  return item.multiplier === null ? 1 : tiles[item.multiplier].value;
}

/**
 * A tree whose tiles at some positions are replaced (the tree's nodes keep
 * pointing at the same positions): the student's name with a tile changed.
 *
 * @param {object} tree - The parse() tree.
 * @param {Map<number, object>} changes - New tile by position.
 * @returns {object} The changed tree.
 */
function withTiles(tree, changes) {
  return { ...tree, tiles: tree.tiles.map((tile, i) => (changes.has(i) ? changes.get(i) : tile)) };
}

/**
 * The value a locant tile sorts by: its number, or for the closing-bond
 * locant `1(n)` (R-5a2) a value between 1 and 2, where the engine cites it
 * (structure.js compoundLocant(): 1 < 1(n) < 2).
 *
 * @param {object} tile - A number or `1(n)` tile.
 * @returns {number} The sort value.
 */
function sortValue(tile) {
  return tile.kind === 'closing' ? 1.5 : tile.value;
}

/**
 * The changes that put a locant list in ascending order (its own number
 * tiles, reordered over the same positions).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {number[]} positions - The list's tile indices.
 * @returns {Map<number, object>} New tile by position.
 */
function sortedLocants(tiles, positions) {
  const sorted = positions.map((p) => tiles[p]).sort((a, b) => sortValue(a) - sortValue(b));
  return new Map(positions.map((p, k) => [p, sorted[k]]));
}

/**
 * Tells whether a locant list is in ascending order (repeats allowed).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {number[]} positions - The list's tile indices.
 * @returns {boolean} True when ascending.
 */
function ascending(tiles, positions) {
  return positions.every((p, k) => k === 0 || sortValue(tiles[positions[k - 1]]) <= sortValue(tiles[p]));
}

/**
 * A copy of a node of the tree with one node inside it (a chain or a
 * compound branch) replaced, at any depth.
 *
 * @param {object} node - A prefix, branch, chain or retained node.
 * @param {object} target - The node to replace.
 * @param {object} replacement - Its replacement.
 * @returns {object} The copy.
 */
function replaceNode(node, target, replacement) {
  if (node === target) {
    return replacement;
  }
  if (node.type === 'prefix') {
    return { ...node, substituent: replaceNode(node.substituent, target, replacement) };
  }
  if (node.type === 'branch') {
    return {
      ...node,
      items: node.items.map((item) => replaceNode(item, target, replacement)),
      chain: node.chain && replaceNode(node.chain, target, replacement),
    };
  }
  return node;
} // End of function replaceNode()

/**
 * One list of prefixes written together: the parent's, or a compound
 * branch's own.
 *
 * @typedef {object} PrefixList
 * @property {object[]} items - The prefix nodes, in tile order.
 * @property {boolean} top - The parent's prefixes.
 * @property {object|null} owner - The compound branch node whose prefixes they are (null for the parent's).
 * @property {object|null} outer - The parent-level prefix that holds that branch (null for the parent's), quoted whole
 *   in the messages: «5-(2,2-dimetilpropil)», not «2,2-dimetil».
 */

/**
 * What every rule reads for one reading of the name (diagnose()).
 *
 * @typedef {object} ReadingContext
 * @property {object} tree - The student's parse() tree.
 * @property {object} spec - Its NameSpec (interpret.js).
 * @property {object} naming - The engine's naming in the student's prefix style (trace, parent, structure, name, parts).
 * @property {object} molecule - The verdict's molecule (the ids of every reading and of the naming).
 * @property {Map<number, object[]>} adj - Its adjacency (graph.js adjacency()).
 * @property {PrefixList[]} lists - prefixLists() of the tree.
 * @property {{chain: object, top: object|null, owner: object|null}[]} chains - chainNodes() of the tree.
 * @property {{studentParent: {atoms: number[], bonds: number[]}, prefixAtoms: object[]}} reading - The student's reading.
 * @property {Map<object, BranchOccurrence>} occurrences - The first occurrence on the molecule of every prefix node, at
 *   every depth (branchOccurrences() `first`, for this reading).
 */

/**
 * One occurrence of a branch the student wrote, found on the molecule.
 *
 * @typedef {object} BranchOccurrence
 * @property {object} sub - The branch's SubstituentSpec (interpret.js).
 * @property {number} attachment - The atom with the free valence.
 * @property {number} parentAtom - The atom it hangs from (on the parent, or on the chain of a compound branch).
 * @property {number} order - The order of the bond between them (1 `il`, 2 `iliden`).
 */

/**
 * Where a branch whose atoms are known joins the rest of the molecule: an
 * open-chain molecule is a tree, so one bond leaves the branch (with one
 * ring, a branch holds the whole ring or none of it, and still one bond
 * leaves it).
 *
 * @param {number[]} atoms - The branch's atoms.
 * @param {Map<number, object[]>} adj - The molecule's adjacency.
 * @returns {{attachment: number, parentAtom: number, order: number}|null} The joining bond's ends and order (null: none).
 */
function joinOf(atoms, adj) {
  const inside = new Set(atoms);
  for (const id of atoms) {
    const link = adj.get(id).find((n) => !inside.has(n.atom));
    if (link) {
      return { attachment: id, parentAtom: link.atom, order: link.order };
    }
  }
  return null;
} // End of function joinOf()

/**
 * Every branch the student wrote, at every depth, found on the molecule of
 * one reading: the parent-level occurrences are the reading's
 * `prefixAtoms`; a compound branch's own branches are cut from its atoms
 * (build.js ownPrefixAtoms()) and joined by their one bond.
 *
 * @param {{tree: object, spec: object}} name - The student's tree and NameSpec.
 * @param {{prefixAtoms: object[]}} reading - The reading.
 * @param {object} molecule - The verdict's molecule.
 * @param {Map<number, object[]>} adj - Its adjacency.
 * @returns {{first: Map<object, BranchOccurrence>, all: BranchOccurrence[]}} The first occurrence of each prefix node
 *   (parse.js prefix nodes, at every depth), and every occurrence.
 */
function branchOccurrences(name, reading, molecule, adj) {
  const first = new Map();
  const all = [];
  /**
   * Records an occurrence of a prefix, then those of its branch's own prefixes.
   *
   * @param {object} node - The prefix node (parse.js).
   * @param {object} sub - Its SubstituentSpec.
   * @param {{attachment: number, parentAtom: number, order: number}} join - Where it joins.
   * @param {number[]} atoms - Its atoms in creation order.
   * @returns {void}
   */
  const record = (node, sub, join, atoms) => {
    const occurrence = { sub, ...join };
    all.push(occurrence);
    if (!first.has(node)) {
      first.set(node, occurrence);
    }
    const own = node.substituent.type === 'branch' ? node.substituent.items : [];
    ownPrefixAtoms(sub, atoms).forEach((slices, k) => {
      for (const slice of slices) {
        const nested = joinOf(slice, adj);
        if (nested && own[k]) {
          record(own[k], sub.prefixes[k].substituent, nested, slice);
        }
      }
    });
  }; // End of function record()
  for (const o of reading.prefixAtoms) {
    const join = { attachment: o.attachment, parentAtom: o.parentAtom, order: molecule.bonds.get(o.bond).order };
    record(name.tree.items[o.prefix], name.spec.prefixes[o.prefix].substituent, join, o.atoms);
  }
  return { first, all };
} // End of function branchOccurrences()

/**
 * The prefix lists of a name: the parent's prefixes, then the prefixes of
 * each compound branch, in tile order.
 *
 * @param {object} tree - The parse() tree.
 * @returns {PrefixList[]} The lists.
 */
function prefixLists(tree) {
  const lists = [{ items: tree.items, top: true, owner: null, outer: null }];
  /**
   * Collects the compound branches of some prefixes.
   *
   * @param {object[]} items - Prefix nodes.
   * @param {object|null} outer - The parent-level prefix they belong to (null at the parent level).
   * @returns {void}
   */
  const visit = (items, outer) => {
    for (const item of items) {
      if (item.substituent.type === 'branch') {
        const holder = outer || item;
        lists.push({ items: item.substituent.items, top: false, owner: item.substituent, outer: holder });
        visit(item.substituent.items, holder);
      }
    }
  };
  visit(tree.items, null);
  return lists;
} // End of function prefixLists()

/**
 * The text quoted for a prefix of a list, before and after a fix: the
 * prefix itself at the parent level, else the whole parent-level prefix
 * that holds its branch (with the branch's prefixes replaced when given).
 *
 * @param {object} tree - The tree to read the tiles from (the student's, or one with tiles changed).
 * @param {PrefixList} list - The list.
 * @param {object} item - The prefix of the list quoted at the parent level.
 * @param {object[]} [items] - New prefixes for the list's branch (rule 6), or none.
 * @returns {string} The text.
 */
function quoted(tree, list, item, items = null) {
  if (!list.outer) {
    return itemText(tree, item);
  }
  return itemText(tree, items ? replaceNode(list.outer, list.owner, { ...list.owner, items }) : list.outer);
}

/**
 * The chain nodes of a name: the parent's, then every branch's, in tile
 * order, each with the parent-level prefix it belongs to (null for the
 * parent) and the compound branch whose own chain it is (null for the
 * parent and for a simple branch). A `ciclo` ring is a chain node too; the
 * `benceno` and template parents (whole words with no endings or segments,
 * parse.js) are not.
 *
 * @param {object} tree - The parse() tree.
 * @returns {{chain: object, top: object|null, owner: object|null}[]} The chains.
 */
function chainNodes(tree) {
  const out = tree.parent.chain.type === 'chain' ? [{ chain: tree.parent.chain, top: null, owner: null }] : [];
  /**
   * Collects the chains of a substituent.
   *
   * @param {object} node - A substituent node.
   * @param {object} top - The parent-level prefix it belongs to.
   * @param {object|null} owner - The compound branch whose own chain `node` is, or null.
   * @returns {void}
   */
  const visit = (node, top, owner) => {
    if (node.type === 'chain') {
      out.push({ chain: node, top, owner });
    } else if (node.type === 'branch') {
      node.items.forEach((item) => visit(item.substituent, top, null));
      if (node.chain) {
        visit(node.chain, top, node);
      }
    }
  };
  tree.items.forEach((item) => visit(item.substituent, item, null));
  return out;
} // End of function chainNodes()

/**
 * The tile range `[from, to)` of some tile indices.
 *
 * @param {number[]} positions - Tile indices (not empty).
 * @returns {[number, number]} The range.
 */
function rangeOf(positions) {
  return [Math.min(...positions), Math.max(...positions) + 1];
}

/**
 * The tile range `[from, to)` covering some slots (interpret.js Slot `tiles`).
 *
 * @param {{tiles: [number, number]}[]} slots - The slots (not empty).
 * @returns {[number, number]} The range.
 */
function slotRange(slots) {
  return [Math.min(...slots.map((slot) => slot.tiles[0])), Math.max(...slots.map((slot) => slot.tiles[1]))];
}

/**
 * The first difference between two locant lists, as text: the app's term
 * and the student's at the first point of difference (design.md §4.4); the
 * whole lists when one is a prefix of the other; nulls for values that are
 * not locant lists (N5 name keys).
 *
 * @param {Array<number|object>} app - The app's list.
 * @param {Array<number|object>} student - The student's list.
 * @returns {{app: string|null, student: string|null}} The terms.
 */
function firstDifference(app, student) {
  if (!Array.isArray(app) || !Array.isArray(student) || [...app, ...student].some((v) => typeof v !== 'number')) {
    return { app: null, student: null };
  }
  const n = Math.min(app.length, student.length);
  for (let i = 0; i < n; i += 1) {
    if (app[i] !== student[i]) {
      return { app: locantText(app[i]), student: locantText(student[i]) };
    }
  }
  return { app: app.map(locantText).join(','), student: student.map(locantText).join(',') };
} // End of function firstDifference()

/**
 * The value a step compared for one candidate.
 *
 * @param {object} step - A trace step.
 * @param {(candidate: object) => boolean} test - Picks the candidate.
 * @returns {*} Its value, or undefined.
 */
function valueOf(step, test) {
  const i = step.candidatesBefore.findIndex(test);
  return i < 0 ? undefined : step.values[i];
}

/**
 * The atoms and bonds of the parent that are not in the student's chain.
 *
 * @param {{atoms: number[], bonds: number[]}} parent - The app's parent.
 * @param {{atoms: number[], bonds: number[]}} student - The student's chain.
 * @returns {{atoms: number[], bonds: number[]}} The difference.
 */
function outsideStudent(parent, student) {
  const atoms = new Set(student.atoms);
  const bonds = new Set(student.bonds);
  return { atoms: parent.atoms.filter((id) => !atoms.has(id)), bonds: parent.bonds.filter((id) => !bonds.has(id)) };
}

/** The diagnosis code of a chain dropped at a trace rule (rule 3; P0 and P1 are rule 2; P0 and N0 count an alcohol's OH groups). */
const DROPPED_AT = Object.freeze({
  P0: 'MORE_HYDROXY_GROUPS',
  P1: 'LONGER_CHAIN',
  P2: 'MORE_MULTIPLE_BONDS',
  P3: 'MORE_DOUBLE_BONDS',
  P4: 'MORE_SUBSTITUENTS',
  N0: 'CHAIN_LOCANTS',
  N1: 'CHAIN_LOCANTS',
  N2: 'CHAIN_LOCANTS',
  N3: 'CHAIN_LOCANTS',
  N4: 'CHAIN_LOCANTS',
  N5: 'CHAIN_ALPHABETICAL',
});

/**
 * Rule 1: the branch on an end carbon of the student's chain (the first in
 * tile order), which the trace shows is not a leaf-to-leaf path. A halogen
 * (R-5a1) on an end is no such branch: it is no carbon and never lengthens
 * the chain.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null when no carbon branch sits on an end (never for a chain missing from P1).
 */
function branchAtEnd(ctx) {
  const { reading, tree, naming, spec } = ctx;
  const n = reading.studentParent.atoms.length;
  const end = reading.prefixAtoms
    .find((o) => (o.locant === 1 || o.locant === n) && !isHalogen(spec.prefixes[o.prefix].substituent));
  if (!end) {
    return null;
  }
  return {
    code: 'BRANCH_AT_END',
    traceRule: 'P1',
    data: { branch: wordsOf(tree, tree.items[end.prefix]), length: naming.parent.atoms.length },
    focus: occurrenceIds([end]),
    tiles: end.tiles || spec.parent.tiles,
  };
} // End of function branchAtEnd()

/**
 * Rules 2 and 3: the student's chain was dropped by a trace step; the data
 * are the step's own values (the student's best one and the survivors').
 * An alcohol's P0 is rule 2 too (MORE_HYDROXY_GROUPS: another chain carries
 * more OH groups) and its N0 rule 3 (CHAIN_LOCANTS: lower locants for them).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {object} step - The trace step that dropped the chain.
 * @param {(candidate: object) => boolean} sameChain - Tells the student's chain's candidates.
 * @returns {object|null} The draft, or null for a rule this phase does not know (later families).
 */
function chainDropped(ctx, step, sameChain) {
  const code = DROPPED_AT[step.rule];
  if (!code) {
    return null;
  }
  const { naming, reading, spec } = ctx;
  const winner = step.survivors[0];
  const app = valueOf(step, (c) => c.key === winner.key);
  const mine = step.candidatesBefore.map((c, i) => ({ c, v: step.values[i] })).filter(({ c }) => sameChain(c)).map(({ v }) => v);
  if (mine.length === 0) {
    return null; // Never: the caller found the chain among the step's candidates.
  }
  let data;
  if (step.rule.startsWith('P')) {
    // P4 counts the halogens too (R-5a1): the message then speaks of «sustituyentes», not «ramas».
    data = { student: mine[0], app, length: naming.parent.atoms.length, halogen: hasHalogen(spec.prefixes) };
  } else {
    const best = mine.reduce((a, b) => (Array.isArray(a) && Array.isArray(b) && compareLocantLists(b, a) < 0 ? b : a));
    data = { rule: step.rule, ...firstDifference(app, best) };
  }
  return {
    code,
    traceRule: step.rule,
    data,
    focus: outsideStudent(naming.parent, reading.studentParent),
    tiles: spec.parent.tiles,
  };
} // End of function chainDropped()

/**
 * Rule 2 before rule 1 for an alcohol (file header «Alcohols»; phase
 * I-51a3b review): the student's chain is no leaf-to-leaf path, so P0 never
 * compared it, and no chain P0 keeps contains it — lengthened through its
 * ends, whichever way, it still carries fewer OH groups than they do. The
 * OH groups choose the chain before its length (P0 before P1), so that is
 * the main mistake (MORE_HYDROXY_GROUPS), not the branch on its end
 * (`1-metil-2-(hidroximetil)hexan-1-ol` → `2-butilbutano-1,3-diol`). When a
 * chain P0 keeps contains it, the branch on its end is the mistake (rule 1:
 * `1-metilpropan-2-ol`, and `1-(hidroximetil)propan-1-ol` →
 * `butano-1,2-diol`, whose one chain the explanation shows). The student's
 * count is its chain's own, as P0 counts it: the engine's suffix sites on
 * its carbons (substituent.js suffixSites()), however the student wrote
 * them. The data are chainDropped()'s for a P step.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {object} step - The trace's first chain step.
 * @returns {object|null} The draft, or null when the step is not P0 or a chain it keeps contains the student's.
 */
function fewerHydroxyGroups(ctx, step) {
  if (step.rule !== 'P0') {
    return null; // No principal group (a hydrocarbon, a halogen derivative): the old path.
  }
  const { naming, reading, spec, molecule, adj } = ctx;
  const atoms = reading.studentParent.atoms;
  if (step.survivors.some((c) => atoms.every((id) => c.atoms.includes(id)))) {
    return null; // Lengthened through its end, the student's chain carries the most OH groups: rule 1.
  }
  const winner = step.survivors[0];
  const app = valueOf(step, (c) => c.key === winner.key);
  const student = suffixSites(molecule, adj, atoms).length;
  if (student >= app) {
    return null; // Never: every chain that contains the student's carries at least its OH groups, and P0 dropped them all.
  }
  return {
    code: 'MORE_HYDROXY_GROUPS',
    traceRule: step.rule,
    data: { student, app, length: naming.parent.atoms.length, halogen: hasHalogen(spec.prefixes) },
    focus: outsideStudent(naming.parent, reading.studentParent),
    tiles: spec.parent.tiles,
  };
} // End of function fewerHydroxyGroups()

/**
 * The student's parent-level branches as the alphabetical rules of the
 * numbering (N4, N5) group and cite them, read in the student's own words:
 * identical branches in one group (identityOf(), whatever words each one
 * was written in), each group with the parent atoms that carry it, the
 * citation key of the student's words (citationKeyOf(); a group written in
 * several words takes the one cited first) and whether it takes bis/tris;
 * the groups in the citation order of those keys (tile order on a tie).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {{key: {alpha: string, numeric: number[], italic: string}, atoms: number[], compound: boolean}[]} The groups,
 *   in the student's citation order.
 */
function citedGroups(ctx) {
  const list = ctx.lists[0];
  const ids = list.items.map((_, i) => identityOf(ctx, list, i));
  const groups = new Map();
  list.items.forEach((item, i) => {
    const key = citationKeyOf(wordsOf(ctx.tree, item));
    const group = groups.get(ids[i]);
    if (!group) {
      groups.set(ids[i], { key, first: i, atoms: [], compound: isCompoundNode(item.substituent) });
    } else if (compareCitationKeys(key, group.key) < 0) {
      group.key = key;
    }
  });
  ctx.reading.prefixAtoms.forEach((o) => groups.get(ids[o.prefix]).atoms.push(o.parentAtom));
  return [...groups.values()].sort((g, h) => compareCitationKeys(g.key, h.key) || g.first - h.first);
} // End of function citedGroups()

/**
 * The value an alphabetical numbering rule compares for one numbering of
 * the student's chain or ring, read in the student's own words
 * (citedGroups()), as numbering.js builds it from the engine's words: for
 * N4 every group's locants, ascending, in citation order; for N5 the
 * complete-name key — the letters of every prefix with its multiplier
 * (di…, bis…), its italic descriptors, then every locant in order of
 * citation (render.js prefixNameKey()).
 *
 * @param {string} rule - 'N4' or 'N5'.
 * @param {object[]} groups - citedGroups() of the reading.
 * @param {number[]} atoms - The numbering: the chain's or ring's atoms in locant order.
 * @returns {number[]|{alpha: string, numeric: number[], italic: string}} The value.
 */
function ownWordsValue(rule, groups, atoms) {
  const locantOf = new Map(atoms.map((id, k) => [id, k + 1]));
  const located = groups.map((g) => g.atoms.map((id) => locantOf.get(id)).sort((p, q) => p - q));
  if (rule === 'N4') {
    return located.flat();
  }
  /**
   * The multiplier a group is cited with ('' for one occurrence).
   *
   * @param {{atoms: number[], compound: boolean}} g - A group.
   * @returns {string} The multiplier.
   */
  const lead = (g) => {
    if (g.atoms.length < 2) {
      return '';
    }
    return g.compound ? compoundMultiplier(g.atoms.length) : multiplier(g.atoms.length);
  };
  return {
    alpha: groups.map((g) => `${lead(g)}${g.key.alpha}`).join('').toLowerCase().replace(/[^a-z]/g, ''),
    numeric: groups.flatMap((g, k) => [...located[k], ...g.key.numeric]),
    italic: groups.map((g) => g.key.italic).join(''),
  };
} // End of function ownWordsValue()

/**
 * Tells whether a step of the engine's trace compared the student's chain
 * or ring in the student's own words (file header, «The student's words in
 * the alphabetical rules»). Only N4 and N5 compare words: for every
 * numbering of the student's chain or ring among the step's candidates
 * (both directions of a chain; every start and direction of a ring) the
 * value the step compared must be the one the student's words give
 * (ownWordsValue()). A branch written in a style the engine does not offer
 * for the molecule, or two styles in one name, can be cited elsewhere in
 * the student's words: `1-etil-2-(1-metilpropil)benceno` cites `etil`
 * first, while the engine cites `butan-2-il` first and so numbers the other
 * way.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {object} step - A trace step.
 * @param {(candidate: object) => boolean} mine - Tells the candidates of the student's chain or ring.
 * @returns {boolean} True when the step reads the student's own words (always, for a step that compares no words).
 */
function judgedInOwnWords(ctx, step, mine) {
  if (step.rule !== 'N4' && step.rule !== 'N5') {
    return true;
  }
  const groups = citedGroups(ctx);
  return step.candidatesBefore.every((c, i) => {
    if (!mine(c)) {
      return true;
    }
    const own = ownWordsValue(step.rule, groups, c.atoms);
    return step.rule === 'N4' ? compareLocantLists(own, step.values[i]) === 0 : compareCitationKeys(own, step.values[i][0]) === 0;
  });
} // End of function judgedInOwnWords()

/**
 * Rules 1–4 from the engine's trace (design.md §4.1): where the student's
 * chain, then its numbering direction, leave the parent choice. A chain
 * missing from the first chain step — P0 for an alcohol (every leaf-to-leaf
 * chain, before their OH groups are counted), else P1 — is no leaf-to-leaf
 * path (rule 1), unless no chain P0 keeps contains it (rule 2,
 * fewerHydroxyGroups(): the OH groups decide before the length). An
 * alphabetical step (N4, N5) that did not read the student's chain in the
 * student's own words (judgedInOwnWords()) blames nothing, from then on:
 * neither the chain dropped there or later nor a direction dropped there (a
 * direction dropped before it, by a rule that compares no words, stays the
 * diagnosis). A `RINGCHAIN` step (an alcohol
 * whose chain parent beats its ring, R-5a3b) lists the best chains only and
 * drops none of them: a chain it does not list is followed into P0.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null when the chain and its numbering are the engine's (or give the same name), or
 *   when the step that drops them compared other words than the student's.
 */
function chainRules(ctx) {
  const { naming, reading } = ctx;
  const { trace } = naming;
  const atoms = reading.studentParent.atoms;
  const undirected = chainKey(atoms);
  const directed = atoms.join('-');
  /**
   * Tells whether a trace candidate is the student's chain (either direction).
   *
   * @param {{atoms: number[]}} c - A candidate.
   * @returns {boolean} True for the student's chain.
   */
  const sameChain = (c) => chainKey(c.atoms) === undirected;
  /**
   * Tells whether a directed trace candidate is the student's numbering.
   *
   * @param {{key: string, direction?: string}} c - A candidate.
   * @returns {boolean} True for the student's chain in the student's direction.
   */
  const isStudent = (c) => c.direction !== undefined && c.key === directed;
  const first = trace.find((s) => s.rule === 'P0' || s.rule === 'P1'); // P0 only for an alcohol (R-5a2).
  if (!first) {
    return null; // Never: a ring parent goes through ringRules() (firstRule()).
  }
  if (!first.candidatesBefore.some(sameChain)) {
    // An alcohol's chain is chosen by its OH groups first: dropped at P0 however lengthened, the branch on the end is not the mistake.
    return fewerHydroxyGroups(ctx, first) || branchAtEnd(ctx);
  }
  let direction = null;
  let ownWords = true; // Every alphabetical step so far read the student's chain in the student's words.
  for (const step of trace) {
    if (step.rule === 'TIE') {
      break; // Every candidate left gives the same name.
    }
    if (!step.candidatesBefore.some(sameChain)) {
      continue;
    }
    ownWords = ownWords && judgedInOwnWords(ctx, step, sameChain);
    if (!step.survivors.some(sameChain)) {
      return ownWords ? chainDropped(ctx, step, sameChain) : null;
    }
    if (!direction && step.candidatesBefore.some(isStudent) && !step.survivors.some(isStudent)) {
      direction = { step, ownWords };
    }
  } // End of the loop over the trace steps
  // Every numbering rule has its reason (N0: the alcohol's OH groups, R-5a3b); the guard keeps a later family's rule safe.
  return direction && direction.ownWords && DIAGNOSIS_PHRASES.numberingReasons[direction.step.rule]
    ? directionDraft(ctx, 'NUMBERING', direction.step, isStudent) : null;
} // End of function chainRules()

/**
 * The draft of a numbering mistake (rule 4: NUMBERING on a chain,
 * RING_NUMBERING on a ring): the trace step that dropped the student's
 * numbering while its chain or ring stayed, the first difference between
 * the survivors' value and the student's, and whether the engine's name
 * writes no locant at all (`propeno`, `metilciclohexano`).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {string} code - 'NUMBERING' or 'RING_NUMBERING'.
 * @param {object} step - The trace step that dropped the student's numbering.
 * @param {(candidate: object) => boolean} isStudent - Tells the student's directed candidate.
 * @returns {object} The draft.
 */
function directionDraft(ctx, code, step, isStudent) {
  const { naming } = ctx;
  const winner = step.survivors[0];
  const terms = firstDifference(valueOf(step, (c) => c.key === winner.key), valueOf(step, isStudent));
  const unwritten = !naming.parts.some((p) => p.kind === 'locant');
  return {
    code,
    traceRule: step.rule,
    data: { rule: step.rule, ...terms, unwritten, name: naming.name },
    focus: idsOf(null),
    tiles: null,
  };
} // End of function directionDraft()

/**
 * Tells whether the engine's parent is the benzene ring (aromatic.js: a
 * ring structure with `retained` 'benzene').
 *
 * @param {object} naming - A successful naming.
 * @returns {boolean} True for a benzene parent.
 */
function benzeneParent(naming) {
  return naming.structure.parentKind === 'ring' && naming.structure.parent.retained === 'benzene';
}

/**
 * Ring rule 1: the student's parent is an open chain, the ring one of its
 * branches, and the engine's parent is the ring (design.md §13.5: a ring is
 * senior to any chain, whatever its length or unsaturation). The focus is
 * the ring; the tiles, the parent-level prefix that holds it.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object} The draft (with the step of its ring: `ring` or `benzene`).
 */
function ringIsParent(ctx) {
  const { naming, reading } = ctx;
  return {
    code: 'RING_IS_PARENT',
    traceRule: 'RING',
    data: { length: reading.studentParent.atoms.length, name: naming.name },
    focus: outsideStudent(naming.parent, reading.studentParent),
    tiles: parentHolderTiles(ctx),
    step: benzeneParent(naming) ? 'benzene' : 'ring',
  };
} // End of function ringIsParent()

/**
 * The engine's suffix word for some OH groups, from the lexicon as render.js
 * suffixWords() builds it (diagnose.js never imports render.js): the
 * multiplier, its final `a` elided before the vowel of `ol` (`tetrol`), and
 * `ol` — `ol`, `diol`, `triol`.
 *
 * @param {number} count - How many OH groups the suffix cites.
 * @returns {string} The word.
 */
function hydroxySuffix(count) {
  const full = count > 1 ? multiplier(count) : '';
  return `${full.endsWith('a') ? full.slice(0, -1) : full}${WORDS.ol}`;
}

/**
 * The tiles a parent-choice message points at (RING_IS_PARENT,
 * HYDROXY_PARENT): those of the student's parent-level prefix that holds
 * atoms of the engine's parent — the ring, or the chain, the student made a
 * branch of.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {[number, number]} The tiles of the first such prefix, else the student's parent's.
 */
function parentHolderTiles(ctx) {
  const { naming, reading, spec } = ctx;
  const parent = naming.parent.atoms;
  const holder = reading.prefixAtoms.find((o) => o.atoms.some((id) => parent.includes(id)));
  return holder && holder.tiles ? holder.tiles : spec.parent.tiles;
}

/**
 * The alcohol's first check (file header «Alcohols», R-5a3b): an OH that
 * the engine cites in the suffix — the principal group — written by the
 * student as a `hidroxi` prefix of the parent (`2-hidroxipropano`,
 * `4-hidroxitolueno`, `4-hidroxicatecol`). Such a prefix's one atom is one of
 * the engine's suffix oxygens (SuffixLocant `attachAtom`); a `hidroxi` the
 * engine writes too (inside a compound branch, or on a chain or ring that is
 * not the parent) never is. The focus is those OH groups; the tiles, the
 * first `hidroxi` prefix's.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function hydroxyPrefix(ctx) {
  const { naming, reading, spec } = ctx;
  const { suffix, parentKind } = naming.structure;
  if (!suffix) {
    return null;
  }
  const oxygens = new Set(suffix.locants.map((site) => site.attachAtom));
  const written = reading.prefixAtoms
    .filter((o) => spec.prefixes[o.prefix].substituent.kind === HYDROXY_KIND && oxygens.has(o.attachment));
  if (written.length === 0) {
    return null;
  }
  const count = suffix.locants.length;
  return {
    code: 'HYDROXY_PREFIX',
    data: { count, ending: hydroxySuffix(count), ring: parentKind === 'ring', name: naming.name },
    focus: occurrenceIds(written),
    tiles: written[0].tiles || spec.parent.tiles,
  };
} // End of function hydroxyPrefix()

/**
 * The alcohol's parent choice between the ring and a chain (file header
 * «Alcohols», R-5a3b; design.md §13.4 I-40a): the student's parent is an
 * open chain and the engine's the ring, or the reverse, in a molecule with
 * OH groups. The engine's parent is the one carrying more OH groups, the
 * ring on a tie: the counts are the `RINGCHAIN` step's (the ring's first,
 * then the best chains'); without that step the parent is the ring, which
 * carries every OH. The focus is the engine's parent outside the student's;
 * the tiles, the prefix that holds it.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft (with the step of its case), or null when the parents are of one kind or the molecule
 *   has no OH group.
 */
function hydroxyParent(ctx) {
  const { naming, reading, spec } = ctx;
  const { structure } = naming;
  const ringParent = structure.parentKind === 'ring';
  if (!structure.suffix || isRing(spec.parent.kind) === ringParent) {
    return null;
  }
  const choice = naming.trace.find((s) => s.rule === 'RINGCHAIN');
  const ring = choice ? choice.values[0] : structure.suffix.locants.length;
  const chain = choice && choice.values.length > 1 ? choice.values[1] : 0;
  let step = 'ringChain';
  if (!choice) {
    step = benzeneParent(naming) ? 'benzene' : 'ring';
  }
  return {
    code: 'HYDROXY_PARENT',
    traceRule: choice ? 'RINGCHAIN' : 'RING',
    data: { ring, chain, chainParent: !ringParent, name: naming.name },
    focus: outsideStudent(naming.parent, reading.studentParent),
    tiles: parentHolderTiles(ctx),
    step,
  };
} // End of function hydroxyParent()

/**
 * Ring rule 2 for an alcohol (R-5a3b, PHENOL): benzene with one OH written
 * with the `benceno` tile and `ol` (`bencenol`, `4-metilbencenol`), which the
 * engine names from `fenol` (a name of its own, as `benceno` is for the
 * ring; `fenol` and the retained phenols place their OH groups themselves,
 * SuffixSpec `phenol`). The tiles: the parent word and the suffix.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function bencenol(ctx) {
  const { naming, spec } = ctx;
  const { suffix } = naming.structure;
  if (spec.parent.kind !== 'benzene' || spec.parent.template || !spec.suffix || spec.suffix.phenol || !benzeneParent(naming)
    || !suffix || suffix.locants.length !== 1) {
    return null;
  }
  return {
    code: 'PHENOL',
    data: { name: naming.name },
    focus: idsOf(null),
    tiles: [Math.min(spec.parent.tiles[0], spec.suffix.tiles[0]), Math.max(spec.parent.tiles[1], spec.suffix.tiles[1])],
  };
} // End of function bencenol()

/**
 * Ring rules 1, 2 and 4 (file header «Rings»), in place of the chain rules
 * 1–4 when the engine's parent is the ring: the ring as a branch of the
 * student's chain (a hydrocarbon's: an alcohol's is HYDROXY_PARENT, checked
 * first); a `ciclo` ring that is the benzene ring; a retained template with
 * the student's prefixes; `bencenol` for `fenol` (R-5a3b, PHENOL); the ring
 * numbered otherwise (followed through the engine's ring numbering trace
 * like rule 4 follows a chain's direction; N0 for an alcohol's OH groups).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null when the ring and its numbering are the engine's (or give the same name).
 */
function ringRules(ctx) {
  const { naming, reading, spec } = ctx;
  if (spec.parent.kind === 'chain') {
    return ringIsParent(ctx);
  }
  if (spec.parent.kind === 'ring' && benzeneParent(naming)) {
    return { code: 'BENZENE_RING', data: { name: naming.name }, focus: idsOf(null), tiles: spec.parent.tiles };
  }
  const { template } = spec.parent;
  if (template && spec.prefixes.length > 0) {
    // A retained phenol (R-5a3a) keeps its OH groups: with one (`cresol`) the molecule is named from `fenol`.
    const one = spec.suffix && spec.suffix.slots.length === 1;
    return {
      code: 'SUBSTITUTED_TEMPLATE',
      data: { template: template.word.text, parent: one ? WORDS.fenol : WORDS.benceno, name: naming.name },
      focus: occurrenceIds(reading.prefixAtoms),
      tiles: template.word.tiles,
    };
  }
  const phenol = bencenol(ctx);
  if (phenol) {
    return phenol;
  }
  const directed = reading.studentParent.atoms.join('-');
  /**
   * Tells whether a ring numbering candidate is the student's numbering (start and direction).
   *
   * @param {{key: string, direction?: string}} c - A candidate.
   * @returns {boolean} True for the student's numbering.
   */
  const isStudent = (c) => c.direction !== undefined && c.key === directed;
  /**
   * Tells whether a trace candidate is a numbering of the ring (every one, after the RING step).
   *
   * @param {{direction?: string}} c - A candidate.
   * @returns {boolean} True for a numbering.
   */
  const numbering = (c) => c.direction !== undefined;
  let ownWords = true; // Every alphabetical step so far read the ring in the student's words.
  for (const step of naming.trace) {
    if (step.rule === 'TIE') {
      break; // Every numbering left gives the same name.
    }
    if (!step.candidatesBefore.some(isStudent)) {
      continue; // The RING step (no directions), or a numbering the student's is not among (never: all 2n are).
    }
    ownWords = ownWords && judgedInOwnWords(ctx, step, numbering);
    if (!step.survivors.some(isStudent)) {
      // An alphabetical step that compared other words than the student's blames nothing (judgedInOwnWords()).
      return ownWords && DIAGNOSIS_PHRASES.numberingReasons[step.rule] ? directionDraft(ctx, 'RING_NUMBERING', step, isStudent) : null;
    }
  } // End of the loop over the ring numbering trace
  return null;
} // End of function ringRules()

/**
 * The identity of a prefix of a list, to tell identical branches apart, at
 * every depth: the structural key of its first occurrence on the molecule
 * (graph.js rootedBranchKey(), rooted at the atom with the free valence,
 * and the order of the bond that attaches it): `isopropil` and
 * `(propan-2-il)` are the same branch, and so are `metil` and
 * `(metan-1-il)` inside `[2-metil-2-(metan-1-il)propil]`. Its words only
 * should the prefix not be found on the molecule (never for a built name).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {PrefixList} list - The prefix list.
 * @param {number} index - The prefix's index in the list.
 * @returns {string} The identity.
 */
function identityOf(ctx, list, index) {
  const item = list.items[index];
  const occurrence = ctx.occurrences.get(item);
  if (occurrence) {
    return `${occurrence.order}:${rootedBranchKey(ctx.molecule, occurrence.attachment, occurrence.parentAtom, ctx.adj)}`;
  }
  return `words:${wordsOf(ctx.tree, item)}`;
}

/**
 * The atoms of some parent-level prefixes (for `focus`): their occurrences
 * on the molecule; nothing for a list inside a compound branch.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {PrefixList} list - The prefix list.
 * @param {number[]} indices - The prefixes' indices in the list.
 * @returns {{atoms: number[], bonds: number[]}} The ids.
 */
function prefixFocus(ctx, list, indices) {
  if (!list.top) {
    return idsOf(null);
  }
  return occurrenceIds(ctx.reading.prefixAtoms.filter((o) => indices.includes(o.prefix)));
}

/**
 * Rule 5: two different branches of one list not in alphabetical order
 * (compareCitationKeys() over the student's words; identical branches are
 * rule 6's).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function alphabeticalOrder(ctx) {
  const { tree } = ctx;
  for (const list of ctx.lists) {
    const words = list.items.map((item) => wordsOf(tree, item));
    const keys = words.map((w) => citationKeyOf(w));
    const ids = list.items.map((_, i) => identityOf(ctx, list, i));
    for (let i = 0; i < list.items.length; i += 1) {
      for (let j = i + 1; j < list.items.length; j += 1) {
        if (compareCitationKeys(keys[i], keys[j]) <= 0 || ids[i] === ids[j]) {
          continue;
        }
        const [a, b] = [list.items[i], list.items[j]];
        /**
         * The multiplier text of a prefix ('' without one).
         *
         * @param {object} item - A prefix node.
         * @returns {string} The text.
         */
        const lead = (item) => (item.multiplier === null ? '' : tree.tiles[item.multiplier].text);
        let hint = '';
        if (compareCitationKeys(citationKeyOf(words[i], { lead: lead(a) }), citationKeyOf(words[j], { lead: lead(b) })) <= 0) {
          hint = DIAGNOSIS_PHRASES.hints.multipliers;
        } else if (compareCitationKeys(citationKeyOf(words[i], { withItalic: true }), citationKeyOf(words[j], { withItalic: true })) <= 0) {
          hint = DIAGNOSIS_PHRASES.hints.italic;
        }
        return {
          code: 'ALPHABETICAL_ORDER',
          data: { first: words[j], second: words[i], why: orderReason(keys[j], keys[i]), hint },
          focus: prefixFocus(ctx, list, [i, j]),
          tiles: [a.range[0], b.range[1]],
        };
      } // End of the loop over the later prefixes
    } // End of the loop over the prefixes of a list
  } // End of the loop over the prefix lists
  return null;
} // End of function alphabeticalOrder()

/**
 * Rule 6: identical branches written as separate prefixes of one list (one
 * structure, in any words: identityOf()). The right form groups them as
 * the assembler writes them: every locant in ascending order, the
 * multiplier (di… or bis… as rule 7 says), the first one's words — in the
 * engine's short form should they carry needless locants (shortForm():
 * `2,2-dimetil` for `2-(metan-1-il)-2-metil`).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function ungrouped(ctx) {
  const { tree } = ctx;
  for (const list of ctx.lists) {
    const ids = list.items.map((_, i) => identityOf(ctx, list, i));
    const first = ids.findIndex((id, i) => ids.indexOf(id, i + 1) >= 0);
    if (first < 0) {
      continue;
    }
    const indices = ids.map((id, i) => (id === ids[first] ? i : -1)).filter((i) => i >= 0);
    const group = indices.map((i) => list.items[i]);
    const count = group.reduce((sum, item) => sum + countOf(tree.tiles, item), 0);
    if (count > MAX_MULT) {
      continue; // No multiplier tile so large (never within the engine's caps).
    }
    const compound = isCompoundNode(group[0].substituent);
    const locants = group.flatMap((item) => item.locants);
    const grouped = { ...tree, tiles: [...tree.tiles, tileById(tileId(compound ? 'cmult' : 'mult', count))] };
    const sorted = [...locants].sort((p, q) => tree.tiles[p].value - tree.tiles[q].value);
    const words = group[0].substituent;
    const substituent = (words.type === 'chain' && shortForm(tree, words)) || words;
    const item = { ...group[0], substituent, locants: locants.length === count ? sorted : [], multiplier: grouped.tiles.length - 1 };
    const located = group.every((g) => g.locants.length > 0);
    // At the parent level the prefixes alone («2,3-dimetil»); inside a branch, the whole parent-level prefix.
    const items = list.items.filter((_, i) => i === first || !indices.includes(i)).map((g, i) => (i === first ? item : g));
    return {
      code: 'UNGROUPED',
      data: {
        compound,
        halogen: isAtomGroup(group[0].substituent.type), // «Los sustituyentes iguales…» (R-5a1, R-5a2).
        right: list.outer ? quoted(grouped, list, item, items) : itemText(grouped, item),
        student: list.outer ? quoted(tree, list, item) : group.map((g) => itemText(tree, g)).join(located ? '-' : ''),
      },
      focus: prefixFocus(ctx, list, indices),
      tiles: [group[0].range[0], group[group.length - 1].range[1]],
    };
  } // End of the loop over the prefix lists
  return null;
} // End of function ungrouped()

/**
 * Rule 7: a multiplier of the wrong kind — di… before a branch with
 * prefixes of its own, or bis… before a simple one.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function multiplierKind(ctx) {
  const { tree } = ctx;
  for (const list of ctx.lists) {
    for (const [index, item] of list.items.entries()) {
      if (item.multiplier === null) {
        continue;
      }
      const tile = tree.tiles[item.multiplier];
      const compound = isCompoundNode(item.substituent);
      if ((tile.kind === 'cmult') === compound) {
        continue;
      }
      const swapped = withTiles(tree, new Map([[item.multiplier, tileById(tileId(compound ? 'cmult' : 'mult', tile.value))]]));
      return {
        code: 'MULTIPLIER_KIND',
        data: { compound, right: quoted(swapped, list, item), student: quoted(tree, list, item) },
        focus: prefixFocus(ctx, list, [index]),
        tiles: [item.multiplier, item.multiplier + 1],
      };
    } // End of the loop over the prefixes of a list
  } // End of the loop over the prefix lists
  return null;
} // End of function multiplierKind()

/**
 * Rule 8: a locant list not in ascending order — a prefix's (quoted alone),
 * a chain's multiple bonds, the suffix's (R-5a2) or the old-style locants
 * (quoted with the whole name, or with the parent-level prefix of a branch).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function locantOrder(ctx) {
  const { tree } = ctx;
  for (const list of ctx.lists) {
    for (const [index, item] of list.items.entries()) {
      if (!ascending(tree.tiles, item.locants)) {
        const fixed = withTiles(tree, sortedLocants(tree.tiles, item.locants));
        return {
          code: 'LOCANT_ORDER',
          data: { right: quoted(fixed, list, item), student: quoted(tree, list, item) },
          focus: prefixFocus(ctx, list, [index]),
          tiles: rangeOf(item.locants),
        };
      }
    }
  } // End of the loop over the prefix lists
  const others = [
    { positions: tree.parent.legacy, top: null },
    ...ctx.chains.flatMap(({ chain, top }) => chain.segments.map((segment) => ({ positions: segment.locants, top }))),
    ...(tree.parent.suffix ? [{ positions: tree.parent.suffix.locants, top: null }] : []), // `butano-4,1-diol` (R-5a2)
  ];
  for (const { positions, top } of others) {
    if (!ascending(tree.tiles, positions)) {
      const fixed = withTiles(tree, sortedLocants(tree.tiles, positions));
      /**
       * The text quoted: the parent-level prefix of a branch's chain, else the whole name.
       *
       * @param {object} t - The tree (the student's or the fixed one).
       * @returns {string} The text.
       */
      const text = (t) => (top ? itemText(t, top) : assemble(t).text);
      return { code: 'LOCANT_ORDER', data: { right: text(fixed), student: text(tree) }, focus: idsOf(null), tiles: rangeOf(positions) };
    }
  } // End of the loop over the multiple-bond and old-style locant lists
  return null;
} // End of function locantOrder()

/**
 * What a parent written without locants has in one place only (the
 * NEEDLESS_LOCANTS phrase), from the engine's parent.
 *
 * @param {{double: object[], triple: object[]}} parent - The engine's parent structure.
 * @returns {string} The phrase.
 */
function unsaturationWhat(parent) {
  const { what } = DIAGNOSIS_PHRASES;
  if (parent.double.length > 0 && parent.triple.length > 0) {
    return what.both;
  }
  if (parent.triple.length > 0) {
    return parent.triple.length > 1 ? what.triples : what.triple;
  }
  return parent.double.length > 1 ? what.doubles : what.double;
}

/**
 * Which locants of the engine's parent its name leaves out by rule
 * (design.md §1.1): on a chain, the multiple bonds of `propeno`, `eteno`…
 * (lexicon omitsLocants()) and the prefixes of a one- or two-carbon parent
 * (chainOmitsPrefixLocants()); on a ring, the one multiple bond of a bare
 * ring (`ciclohexeno`), the one prefix of a saturated ring or of benzene
 * (`metilciclohexano`, `metilbenceno`) and the six identical prefixes of a
 * complete benzene (`hexametilbenceno`; lexicon ringOmitsLocants()).
 *
 * @param {object} structure - The engine's name structure.
 * @returns {{bonds: boolean, prefixes: boolean}} Whether the parent's multiple-bond locants and its prefix locants are left out.
 */
function parentOmissions(structure) {
  const suffixCount = structure.suffix ? structure.suffix.locants.length : 0;
  if (structure.parentKind === 'ring') {
    const ring = ringOmitsLocants(structure.parent, structure.prefixes, suffixCount);
    return { bonds: ring.parent, prefixes: ring.prefixes };
  }
  return {
    bonds: omitsLocants(structure.parent, structure.prefixes.length > 0 || suffixCount > 0),
    prefixes: chainOmitsPrefixLocants(structure.parent, structure.prefixes, suffixCount, structure.suffix ? structure.suffix.kind : null),
  };
} // End of function parentOmissions()

/**
 * Rule 9, needless locants: locants the engine's name omits
 * (parentOmissions(): `propeno`, `ciclohexeno`, `metilciclohexano`,
 * `metilbenceno`, `clorometano`, `cloroetano`, `hexacloroetano`), or
 * locants inside a branch that the engine's short forms never write (any on
 * a one- or two-carbon branch, `etenil`; the free valence 1 of a saturated
 * branch, `propil` — render.js substituentTokens(); and, since halogens
 * (R-5a1) can sit on one, the locants of the prefixes of a one-carbon
 * compound branch, `(clorometil)`, `(triclorometil)`, which has a single
 * position, render.js groupTokens() `omitLocants`). When the engine's name
 * still writes numbers inside a branch (`(butan-2-il)benceno`,
 * `hexa(propan-2-il)benceno`), the message says that only the numbers
 * placing the prefixes on the parent are left out (`kept`); the parent's
 * own multiple-bond locants are left out only on a parent without prefixes
 * (`propeno`, `ciclohexeno`; with a branch on `eteno` rule 1 comes first),
 * whose name has no numbers at all. An alcohol's suffix locants (R-5a3b) are
 * omitted with the prefixes' (render.js omitsPrefixLocants()): the message
 * then speaks of the OH groups (`etan-1-ol` → `etanol`, `ciclohexan-1-ol`,
 * `triclorometan-1-ol`), or of both (`1,1,1-triclorometan-1-ol`).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function needlessLocants(ctx) {
  const { tree, spec, naming } = ctx;
  const { structure } = naming;
  /**
   * The slots the student wrote (interpret.js `supplied`).
   *
   * @param {object[]} slots - Slots.
   * @returns {object[]} The supplied ones.
   */
  const supplied = (slots) => slots.filter((slot) => slot.kind === 'supplied');
  const omitted = parentOmissions(structure);
  const bondSlots = supplied([...spec.parent.double, ...spec.parent.triple]);
  if (bondSlots.length > 0 && omitted.bonds) {
    return {
      code: 'NEEDLESS_LOCANTS',
      data: { branch: false, name: naming.name, what: unsaturationWhat(structure.parent) },
      focus: idsOf(null),
      tiles: slotRange(bondSlots),
    };
  }
  const prefixSlots = supplied(spec.prefixes.flatMap((prefix) => prefix.slots));
  // The suffix's locants (R-5a3b: `etan-1-ol`, `ciclohexan-1-ol`) are omitted together with the prefixes'.
  const suffixSlots = spec.suffix ? supplied(spec.suffix.slots) : [];
  if (prefixSlots.length + suffixSlots.length > 0 && omitted.prefixes) {
    const { what, on } = DIAGNOSIS_PHRASES;
    const single = structure.prefixes.reduce((sum, group) => sum + group.locants.length, 0) === 1;
    const prefixWhat = single ? what.prefix : what.prefixes;
    const hydroxyCount = structure.suffix ? structure.suffix.locants.length : 0;
    const hydroxyWhat = hydroxyCount === 1 ? what.hydroxy : what.hydroxys;
    let phrase = { text: prefixWhat, plural: !single };
    if (suffixSlots.length > 0) {
      phrase = prefixSlots.length > 0 ? { text: what.together(prefixWhat, hydroxyWhat), plural: true }
        : { text: hydroxyWhat, plural: hydroxyCount > 1 };
    }
    return {
      code: 'NEEDLESS_LOCANTS',
      data: {
        branch: false,
        name: naming.name,
        what: phrase.text,
        // Numbers inside a branch stay (`(butan-2-il)benceno`): the message then names only the parent's locants.
        kept: /\d/.test(naming.name),
        plural: phrase.plural,
        on: structure.parentKind === 'ring' ? on.ring : on.chain,
      },
      focus: idsOf(null),
      tiles: slotRange([...prefixSlots, ...suffixSlots]),
    };
  } // End of the parent's prefix and suffix locants
  for (const { chain, top, owner } of ctx.chains) {
    if (!top) {
      continue; // The parent's own locants: parentOmissions() above.
    }
    const bare = shortForm(tree, chain, owner);
    // The prefixes of a one-carbon compound branch have one position only: `(1-clorometil)` → `(clorometil)` (R-5a1).
    const oneCarbon = owner && chain.ring === null && tree.tiles[chain.root].value === 1;
    const located = oneCarbon ? owner.items.flatMap((item) => item.locants) : [];
    if (!bare && located.length === 0) {
      continue;
    }
    const unlocated = owner && { ...owner, items: owner.items.map((item) => ({ ...item, locants: [] })), chain: bare || chain };
    const fixed = located.length > 0 ? replaceNode(top, owner, unlocated) : replaceNode(top, chain, bare);
    const own = bare ? [...chain.segments.flatMap((seg) => seg.locants), ...chain.fvLocants] : [];
    return {
      code: 'NEEDLESS_LOCANTS',
      data: { branch: true, right: itemText(tree, fixed), student: itemText(tree, top) },
      focus: idsOf(null),
      tiles: rangeOf([...located, ...own]),
    };
  } // End of the loop over the branch chains
  return null;
} // End of function needlessLocants()

/**
 * The engine's short form of a branch chain written with needless locants
 * (rule 9; render.js substituentTokens()): no `ano`, no free-valence
 * locant, and on a one- or two-carbon branch no locant at all
 * (`(metan-1-il)` → `metil`, `(et-1-enil)` → `etenil`); on a longer
 * saturated branch, the free valence 1 (`(propan-1-il)` → `propil`). A
 * compound branch's own chain whose free valence is not at its carbon 1
 * keeps it (R-5a1: `(1-cloroetan-2-il)` is `(2-cloroetil)` numbered from
 * the other end, not `(1-cloroetil)`, a numbering no rule names; likewise
 * `(1-metiletan-2-il)` is `propil`, not `(1-metiletil)`): null.
 *
 * @param {object} tree - The parse() tree.
 * @param {object} chain - A branch's chain node (parse.js, with `fv`).
 * @param {object|null} [owner] - The compound branch whose own chain it is (chainNodes()), or null.
 * @returns {object|null} The chain node in its short form, or null when it has no needless locants.
 */
function shortForm(tree, chain, owner = null) {
  const length = tree.tiles[chain.root].value;
  const positions = [...chain.segments.flatMap((s) => s.locants), ...chain.fvLocants];
  if (owner && owner.items.length > 0 && chain.fvLocants.some((index) => tree.tiles[index].value !== 1)) {
    return null; // Dropping the free-valence locant would move it to carbon 1, under the branch's own prefixes.
  }
  const short = length <= 2 && positions.length > 0;
  const saturatedOne = length > 2 && chain.segments.length === 0 && chain.fvLocants.length === 1
    && tree.tiles[chain.fvLocants[0]].value === 1;
  if (!short && !saturatedOne) {
    return null;
  }
  const segments = short ? chain.segments.map((s) => ({ ...s, locants: [] })) : chain.segments;
  return { ...chain, ano: null, fvLocants: [], segments };
} // End of function shortForm()

/**
 * Rule 9, missing locants: a left-out locant with more than one possible
 * value (search.js domains) where the engine's name writes one — the
 * parent's multiple bonds and prefixes unless the omission rules leave
 * them out (parentOmissions(), chain or ring; the suffix's, R-5a2, with the
 * prefixes': render.js omitsPrefixLocants() omits both together), and
 * always inside a branch (and on `xileno`, whose methyls are always
 * located).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function missingLocants(ctx) {
  const { spec, naming } = ctx;
  const parentBonds = new Set([...spec.parent.double, ...spec.parent.triple]);
  const parentPrefixes = new Set([...spec.prefixes.flatMap((prefix) => prefix.slots), ...(spec.suffix ? spec.suffix.slots : [])]);
  const omitted = parentOmissions(naming.structure);
  const missing = spec.leftOut.find((slot) => {
    if (slot.domain[1] <= slot.domain[0]) {
      return false; // One possible value: no name writes it (search.js filledTree()).
    }
    if (parentBonds.has(slot)) {
      return !omitted.bonds;
    }
    return parentPrefixes.has(slot) ? !omitted.prefixes : true;
  });
  if (!missing) {
    return null;
  }
  return { code: 'MISSING_LOCANTS', data: { name: naming.name }, focus: idsOf(null), tiles: [missing.tiles[0], missing.tiles[1]] };
} // End of function missingLocants()

/**
 * Rule 10: a chain whose `ino` segment is written before its `eno` segment.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function segmentOrder(ctx) {
  const { tree, naming } = ctx;
  for (const { chain } of ctx.chains) {
    const kinds = chain.segments.map((s) => tree.tiles[s.ending].value);
    if (kinds.length === 2 && kinds[0] === 'triple' && kinds[1] === 'double') {
      return {
        code: 'SEGMENT_ORDER',
        data: { name: naming.name, student: assemble(tree).text },
        focus: idsOf(null),
        tiles: [chain.segments[0].range[0], chain.segments[1].range[1]],
      };
    }
  }
  return null;
} // End of function segmentOrder()

/**
 * Rule 11: old-style locants before the parent's root (`2-buteno`), those of
 * a multiple bond or (R-5a3b) of the suffix (`2-propanol`, `1,2-etanodiol`):
 * the message then says they go right before the suffix's words (`ol`,
 * `diol`), not before «eno» or «ino».
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function oldStyle(ctx) {
  const { spec, tree, naming } = ctx;
  if (!spec.oldStyle) {
    return null;
  }
  const { suffix } = naming.structure;
  const words = tree.parent.legacySuffix && suffix ? hydroxySuffix(suffix.locants.length) : null;
  return { code: 'OLD_STYLE', data: { name: naming.name, suffix: words }, focus: idsOf(null), tiles: rangeOf(tree.parent.legacy) };
}

/**
 * The student's tree with the orto/meta/para letter of each name-level
 * prefix written as the numbers it stands for (interpret.js: the prefix's
 * supplied slots with `letter`): `p-di(propan-2-il)benceno` →
 * `1,4-di(propan-2-il)benceno`. The number tiles are appended to the tiles
 * and the prefixes point at them, as rule 6 does with its multiplier. (A
 * letter on `xileno` never gets here: alone it is an alternative, beside
 * prefixes SUBSTITUTED_TEMPLATE comes first.)
 *
 * @param {object} tree - The parse() tree.
 * @param {object} spec - Its NameSpec.
 * @returns {object} The tree with numbers for the letters.
 */
function withNumbersForLetters(tree, spec) {
  const tiles = [...tree.tiles];
  /**
   * Number tiles for the letter slots of a prefix, in ascending order.
   *
   * @param {object[]} slots - The prefix's slots.
   * @returns {number[]} The indices of the new number tiles.
   */
  const numbers = (slots) => slots.filter((slot) => slot.letter).map((slot) => slot.value).sort((p, q) => p - q)
    .map((value) => tiles.push(tileById(tileId('num', value))) - 1);
  const items = tree.items.map((item, k) => (item.letter === null ? item
    : { ...item, letter: null, locants: numbers(spec.prefixes[k].slots) }));
  return { ...tree, tiles, items };
} // End of function withNumbersForLetters()

/**
 * Rule 11 on benzene (phase I-50d): an orto/meta/para letter (design.md
 * §14.4; interpret.js slots with `letter`) where the engine writes numbers
 * only — the name with the letter written as its numbers is one of the
 * engine's names, so the letter is the whole mistake: the old form is
 * offered only in the default prefix style (`p-diisopropilbenceno`, never
 * `p-di(propan-2-il)benceno`). Another mistake no rule covers beside the
 * letter (`p-di(butan-3-il)benceno`) gives null.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function letterLocants(ctx) {
  const { spec, naming, tree } = ctx;
  const slots = spec.prefixes.flatMap((prefix) => prefix.slots).filter((slot) => slot.letter);
  if (slots.length === 0) {
    return null;
  }
  const text = assemble(withNumbersForLetters(tree, spec)).text.normalize('NFC');
  const names = [naming.name, ...(naming.alternatives || []).map((alt) => alt.name)].map((name) => name.normalize('NFC'));
  if (!names.includes(text)) {
    return null;
  }
  return { code: 'LETTER_LOCANTS', data: { name: text }, focus: idsOf(null), tiles: slotRange(slots) };
} // End of function letterLocants()

/**
 * The checks of rules 5–11, in order. Later families insert theirs.
 */
const FORM_RULES = Object.freeze([alphabeticalOrder, ungrouped, multiplierKind, locantOrder, needlessLocants, missingLocants,
  segmentOrder, oldStyle, letterLocants]);

/**
 * The first rule that applies to one reading of the name: an alcohol's OH
 * written `hidroxi` on the parent, then its parent's kind (ring or chain:
 * hydroxyPrefix(), hydroxyParent(); file header «Alcohols»), the parent's
 * rules (chainRules(), rules 1–4; ringRules() when the engine's parent is
 * the ring), then the form rules.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft `{code, traceRule?, data, focus, tiles, step?}`, or null.
 */
function firstRule(ctx) {
  const alcohol = hydroxyPrefix(ctx) || hydroxyParent(ctx);
  if (alcohol) {
    return alcohol;
  }
  const parent = ctx.naming.structure.parentKind === 'ring' ? ringRules(ctx) : chainRules(ctx);
  if (parent) {
    return parent;
  }
  for (const rule of FORM_RULES) {
    const draft = rule(ctx);
    if (draft) {
      return draft;
    }
  }
  return null;
} // End of function firstRule()

/**
 * The shape of a branch chain for recognising the prefix style (file
 * header): its length, where its free valence sits counted from the nearer
 * end (a branch numbered the wrong way keeps its shape), the bond order
 * that attaches it, and the shapes of its own branches in a fixed order
 * (their locants, multipliers and order of citation left out).
 *
 * @param {number} length - Carbons of the branch's own chain.
 * @param {number} locant - Its free-valence locant.
 * @param {number} order - The attaching bond's order.
 * @param {string[]} nested - The shapes of its own branches, one per occurrence.
 * @returns {string} The shape.
 */
function chainShape(length, locant, order, nested) {
  return `C${length}:${Math.min(locant, length + 1 - locant)}:${order}(${[...nested].sort().join(',')})`;
}

/**
 * The shape of a branch as the student wrote it (a SubstituentSpec): a
 * halogen (R-5a1; the same in every style), a retained word, or chainShape()
 * of its chain. Spelling mistakes the later rules name do not change it:
 * `(1-metiletan-1-il)` and `1-metiletil` have one shape.
 *
 * @param {object} sub - A SubstituentSpec (interpret.js).
 * @returns {string} The shape.
 */
function specShape(sub) {
  if (isHalogen(sub)) {
    return `X:${sub.element}`; // A halogen, or the O of `hidroxi` (R-5a2).
  }
  if (sub.kind === 'retained') {
    return `R:${sub.retained}`;
  }
  const nested = sub.prefixes.flatMap((prefix) => prefix.slots.map(() => specShape(prefix.substituent)));
  return chainShape(sub.length, sub.freeValence.slot.value, sub.freeValence.order, nested);
}

/**
 * The shape of a branch as the engine names it (a SubstituentStructure,
 * substituent.js nameSubstituent()), comparable with specShape().
 *
 * @param {object|null} structure - The engine's substituent structure.
 * @returns {string} The shape ('' for none, or for a branch the reverse parser cannot write).
 */
function structureShape(structure) {
  if (!structure) {
    return '';
  }
  if (structure.halogen) {
    return `X:${structure.halogen}`; // A halogen prefix (R-5a1), as specShape() writes it.
  }
  if (structure.hydroxy) {
    return `X:${HYDROXY_ELEMENT}`; // `hidroxi` (R-5a2).
  }
  if (structure.retained) {
    return `R:${structure.retained}`;
  }
  if (!structure.chain || !structure.freeValence) {
    return '';
  }
  const nested = (structure.prefixes || []).flatMap((group) => group.locants.map(() => structureShape(group.substituent)));
  return chainShape(structure.chain.length, structure.freeValence.locant, structure.freeValence.order, nested);
} // End of function structureShape()

/**
 * The naming in the student's prefix style (file header): the verdict's
 * own (the default style) unless the engine offers the molecule in other
 * styles and, in one of them, more of the student's branches (at every
 * depth, found on the molecule) have the shape the engine gives that very
 * branch (specShape() against structureShape() of nameSubstituent() in
 * that style); that style is then named by the engine. A tie keeps the
 * earlier style of PREFIX_STYLES (the default first).
 *
 * @param {object} naming - The verdict's successful naming (default style).
 * @param {object} molecule - The verdict's molecule.
 * @param {BranchOccurrence[]} occurrences - Every branch the student wrote, on the molecule (branchOccurrences() `all`).
 * @param {(mol: object, options: object) => object} namer - The naming function (nameMolecule()).
 * @returns {{style: string, naming: object}} The style and its naming.
 */
function namingInStudentStyle(naming, molecule, occurrences, namer) {
  const fallback = { style: PREFIX_STYLES[0], naming };
  const offered = new Set((naming.alternatives || []).map((alt) => alt.style));
  const styles = PREFIX_STYLES.filter((style, i) => i === 0 || offered.has(style));
  if (styles.length === 1 || occurrences.length === 0) {
    return fallback;
  }
  const shapes = occurrences.map((o) => specShape(o.sub));
  /**
   * How many of the student's branches have, in a style, the shape the engine gives them.
   *
   * @param {string} style - A prefix style.
   * @returns {number} The count.
   */
  const score = (style) => occurrences
    .filter((o, i) => structureShape(nameSubstituent(molecule, o.parentAtom, o.attachment, style)) === shapes[i]).length;
  let best = { style: styles[0], score: score(styles[0]) };
  for (const style of styles.slice(1)) {
    const value = score(style);
    if (value > best.score) {
      best = { style, score: value };
    }
  }
  if (best.style === PREFIX_STYLES[0]) {
    return fallback;
  }
  const styled = namer(molecule, { prefixStyle: best.style });
  return styled && styled.ok && styled.trace ? { style: best.style, naming: styled } : fallback;
} // End of function namingInStudentStyle()

/**
 * Tells whether an `otherName` lies outside every rule (the diagnosis is
 * null; file header «Alcohols»): a principal group other than the OH, which
 * the alcohol messages would misname (a later family's, until its phase adds
 * its messages; no tile writes one today), or, for a molecule without a
 * principal group, an engine's chain parent in a molecule with a ring (never:
 * such a ring is always the parent, design.md §13.5).
 *
 * @param {{spec: object}} name - The student's NameSpec.
 * @param {object} structure - The engine's name structure.
 * @returns {boolean} True when the diagnosis is null.
 */
function outsideRules(name, structure) {
  if (structure.suffix) {
    return structure.suffix.kind !== ALCOHOL || Boolean(name.spec.suffix && name.spec.suffix.kind !== ALCOHOL);
  }
  return structure.parentKind === 'chain' && specRings(name.spec) > 0;
} // End of function outsideRules()

/**
 * Names the main mistake of an `otherName` verdict (design.md §15.3, §15.8
 * R-3): the first rule of the list (file header) that applies, compared with
 * the engine's naming in the student's prefix style, on the most charitable
 * reading of the name.
 *
 * @param {{tree: object, spec: object}} name - The student's name: its error-free parse() tree and its NameSpec (interpret.js).
 * @param {{molecule: object, naming: object, studentParent: {atoms: number[], bonds: number[]}, prefixAtoms: object[]}} verdict -
 *   The `otherName` verdict (readName()): the molecule, the engine's successful naming of it, and the student's reading on it.
 * @param {{studentParent: {atoms: number[], bonds: number[]}, prefixAtoms: object[]}[]} [readings] - Other readings of the
 *   same name on the same molecule (the other placements of a name with left-out locants, search.js placementReading());
 *   the verdict's own reading is tried first, and the diagnosis of the latest rule is kept.
 * @param {(mol: object, options: object) => object} [namer] - Names the molecule in another prefix style (default nameMolecule()).
 * @returns {Diagnosis|null} The diagnosis, or null when no rule applies (or the naming is a refusal).
 */
export function diagnose(name, verdict, readings = [], namer = nameMolecule) {
  const { molecule } = verdict;
  if (!verdict.naming || !verdict.naming.ok || !verdict.studentParent || !verdict.naming.structure) {
    return null;
  }
  const { parentKind } = verdict.naming.structure;
  if (!['chain', 'ring'].includes(parentKind) || outsideRules(name, verdict.naming.structure)) {
    return null;
  }
  const adj = adjacency(molecule);
  const drawn = branchOccurrences(name, verdict, molecule, adj);
  const { style, naming } = namingInStudentStyle(verdict.naming, molecule, drawn.all, namer);
  const base = {
    tree: name.tree,
    spec: name.spec,
    naming,
    molecule,
    adj,
    lists: prefixLists(name.tree),
    chains: chainNodes(name.tree),
  };
  let best = null;
  for (const reading of [verdict, ...readings]) {
    const occurrences = reading === verdict ? drawn.first : branchOccurrences(name, reading, molecule, adj).first;
    const draft = firstRule({ ...base, reading, occurrences });
    if (!draft) {
      return null; // The kindest reading of all: no rule names a mistake on it (file header).
    }
    if (!best || DIAGNOSES[draft.code].rule > DIAGNOSES[best.draft.code].rule) {
      best = { draft, reading };
    }
  } // End of the loop over the readings
  const { draft, reading } = best;
  return {
    code: draft.code,
    rule: DIAGNOSES[draft.code].rule,
    traceRule: draft.traceRule || null,
    message: DIAGNOSIS_TEXTS[draft.code](draft.data),
    step: draft.step || DIAGNOSES[draft.code].step,
    style,
    student: idsOf(reading.studentParent),
    parent: idsOf(naming.parent),
    focus: idsOf(draft.focus),
    tiles: draft.tiles ? [draft.tiles[0], draft.tiles[1]] : null,
  };
} // End of function diagnose()

/**
 * The step of an explanation to open for a diagnosis (phase I-49b, «Ver el
 * paso»): the step whose `id` is the diagnosis's `step`, else the first of
 * its STEP_FALLBACKS present, else the last step.
 *
 * @param {{id: string}[]} steps - The explanation steps: explain() of diagnosisNaming() — the naming in the diagnosis's
 *   `style`, which is not the verdict's own naming outside the default style (diagnosisExplanation() builds them).
 * @param {{step: string}} diagnosis - The diagnosis.
 * @returns {number} The step index (-1 without steps).
 */
export function diagnosisStepIndex(steps, diagnosis) {
  for (const id of [diagnosis.step, ...(STEP_FALLBACKS[diagnosis.step] || [])]) {
    const index = steps.findIndex((step) => step.id === id);
    if (index >= 0) {
      return index;
    }
  }
  return steps.length - 1;
}

/**
 * The naming a diagnosis compared with, whose trace, parent and
 * explanation it refers to: the verdict's own naming for the default
 * style, else the engine's naming of the verdict's molecule in the
 * diagnosis's `style` (the same call diagnose() made, so the same result).
 *
 * @param {{molecule: object, naming: object, diagnosis?: Diagnosis|null}} verdict - An `otherName` verdict (readName()).
 * @param {(mol: object, options: object) => object} [namer] - The naming function diagnose() was given (default nameMolecule()).
 * @returns {object|null} The naming, or null without a diagnosis.
 */
export function diagnosisNaming(verdict, namer = nameMolecule) {
  const { diagnosis } = verdict;
  if (!diagnosis) {
    return null;
  }
  return diagnosis.style === PREFIX_STYLES[0] ? verdict.naming : namer(verdict.molecule, { prefixStyle: diagnosis.style });
}

/**
 * The explanation a diagnosis opens (phase I-49b, «Ver el paso»): the
 * naming it compared with (diagnosisNaming()), that naming's explanation
 * steps and the index of the diagnosis's step among them
 * (diagnosisStepIndex()). The stepper must show these steps — not those of
 * the verdict's own naming, which in another prefix style may number the
 * chain as the student did and so contradict a NUMBERING diagnosis
 * (`6-metil-4-(propan-2-il)nonano`). The explanation is injected
 * (src/explain/explain.js explain()): src/reverse never imports it.
 *
 * @param {{molecule: object, naming: object, diagnosis?: Diagnosis|null}} verdict - An `otherName` verdict (readName()).
 * @param {(naming: object) => {id: string}[]} explainSteps - Builds the explanation steps of a naming (explain()).
 * @param {(mol: object, options: object) => object} [namer] - The naming function diagnose() was given (default nameMolecule()).
 * @returns {{naming: object, steps: object[], index: number}|null} The naming, its steps and the step to open (-1 without
 *   steps), or null without a diagnosis.
 */
export function diagnosisExplanation(verdict, explainSteps, namer = nameMolecule) {
  const naming = diagnosisNaming(verdict, namer);
  if (!naming) {
    return null;
  }
  const steps = explainSteps(naming);
  return { naming, steps, index: diagnosisStepIndex(steps, verdict.diagnosis) };
}
