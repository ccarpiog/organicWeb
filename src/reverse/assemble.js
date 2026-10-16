/**
 * @file Assembler of «¿Cómo se dibuja?» (design.md §15.4, §15.5.2; phases
 * R-1a, R-4a, R-4b, R-4c, R-5a1, R-5a2, R-5b, R-5b2, R-5c1, R-5c2, R-5d1, R-6a1, R-6a2b, R-6b1, R-6c1, R-6c2, R-6c3, R-6d1, R-6d2): turns the lossless syntax tree of parse.js into
 * the name text and one span per piece of text. Pure, no DOM.
 *
 * The text comes from the tree — the student's own tiles, multipliers,
 * order and locants — never from the naming engine's grouping or rendering
 * (that would silently repair a wrong multiplier, order or locant). Only the
 * automatic rules of design.md §15.5.2 are applied, decided by each tile's
 * syntactic role and the piece that follows it, as render.js does:
 *
 * 1. a comma between consecutive locants, a hyphen between a locant and a
 *    word or an enclosing mark (none after an opening mark: `(2,2-…`);
 * 2. the connecting `a` after a root whose first unsaturation segment
 *    carries a multiplier (`buta-1,3-dieno`, but `hex-1-en-3,5-diino`;
 *    lexicon needsConnectingVowel());
 * 3. `eno` → `en` and `ino` → `in` before another segment or a free-valence
 *    suffix (`pent-1-en-4-ino`, `prop-2-en-1-il`, `prop-2-in-1-iliden`);
 * 4. `ano` → `an` before a free-valence suffix (`propan-2-il`), and the
 *    automatic `an` (lexicon SATURATED_INFIX) when the student cites the
 *    free-valence locant of a saturated branch without the `ano` tile; and
 *    its suffix half (R-5a2, render.js suffixWords() / renderEnding()): a
 *    suffix multiplier first loses its final `a` before a vowel-initial
 *    suffix (`tetra` + `ol` → `tetrol`, `penta` → `pentol`; `di`, `tri`
 *    unchanged), and only then does the parent's last ending — `ano`, the
 *    last `eno` / `ino`, or the word `benceno` — lose its final `o` when what
 *    follows (multiplier and suffix) starts with a vowel: `propan-2-ol`,
 *    `etanol`, `prop-2-en-1-ol`, `bencenol`, but `butano-1,4-diol`,
 *    `but-2-eno-1,4-diol`, `butano-1,2,3,4-tetrol`, `benceno-1,2-diol`,
 *    `bencenohexol`;
 * 5. enclosing marks as render.js needsEnclosure() / enclosureLevel(): a
 *    branch is enclosed when it has prefixes of its own, an unsaturated
 *    chain of three or more carbons, or a cited locant (`(propan-2-il)`,
 *    `(prop-2-en-1-il)`, `(2,2-dimetilpropil)`), never a retained word
 *    (`isopropil`, `tert-butil`); ( ) then [ ] then { } outwards; the
 *    student's multiplier kept as chosen (`di(propan-2-il)`,
 *    `bis(1-metiletil)`, even a wrong `bis(propan-2-il)`); a hyphen between
 *    a multiplier and an italic descriptor (`di-tert-butil`), also when an
 *    opening mark stands between them, as render.js groupTokens() writes it
 *    (R-6a2b: `bis-(tert-butoxicarbonil)`). The "crowded"
 *    case of render.js enclosedInName() — prefixes written without locants
 *    beside other prefixes, where a ring prefix after the first one is
 *    enclosed (`cloro(fenil)metanol`, `metil(ciclohexil)metano`) — is
 *    read on the student's tree: two or more prefixes at one level (the
 *    name, or a compound branch) and none of them with locants
 *    (crowdedLevel()). Its alkoxy half (R-5b): an alkoxy prefix of a crowded
 *    level is enclosed wherever it stands, first too (`cloro(metoxi)metano`,
 *    `dicloro(metoxi)metano`, `difluorodi(metoxi)metano`,
 *    `(metoxi)yodometano`; render.js enclosedInName() checks the alkoxy
 *    before the ring, so a crowded `(fenoxi)` too);
 * 6. the alkoxy contraction (R-5b, design.md §15.5.2 item 6; render.js
 *    alkoxyTokens() and isContractedAlkoxy()): the `oxi` tile after a branch
 *    replaces its `il` — the `il` tile then writes nothing (an empty span)
 *    and a retained word loses its `il` (`isopropil` → `isoprop`) — when the
 *    branch is a saturated chain of one to MAX_CONTRACTED_ALKOXY carbons
 *    bonded by its carbon 1 and citing no locant (`metoxi`, `etoxi`,
 *    `propoxi`, `butoxi`, also with prefixes of its own inside a compound
 *    branch: `(2-metilpropoxi)`, `(1-metiletoxi)`, `(2-cloroetoxi)`) or a
 *    retained word (`isopropoxi`, `tert-butoxi`, `fenoxi`, `(4-metilfenoxi)`);
 *    any other branch keeps its `il` before `oxi` and the alkoxy prefix is
 *    enclosed (render.js needsEnclosure(): `(pentiloxi)`, `(propan-2-iloxi)`,
 *    `(butan-2-iloxi)`, `(eteniloxi)`, `(prop-2-en-1-iloxi)`,
 *    `(ciclohexiloxi)`). Such an alkoxy prefix, and one with prefixes of its
 *    own, is compound (render.js isCompoundPrefix(): `bis(pentiloxi)`; also
 *    `bis-tert-butoxi`, isCompoundAlkoxy()), the other contracted ones
 *    simple (`dimetoxi`, `diisopropoxi`); the student's multiplier stays as
 *    chosen, with the hyphen of rule 5 before `tert-`. As with a chain's `il`, a cited locant
 *    (`prop 1 il oxi`) keeps the `il`: `(propan-1-iloxi)`, never a locant run
 *    into `oxi`.
 *
 * 7. an ether's functional-class name (R-5b2, design.md §2): its groups are
 *    separate words, a space between them and before the class word `éter`
 *    (`etil metil éter`, `dietil éter`, `di-tert-butil éter` with rule 5's
 *    hyphen); each group is enclosed as rule 5 encloses a prefix by itself
 *    (isEnclosed(): `(2-cloroetil) metil éter`, `bis(2-cloroetil) éter`,
 *    `metil (propan-2-il) éter`), never for standing beside the other group
 *    (no crowded level: the groups are words of their own). The engine's
 *    own class names (simple groups) are never enclosed.
 * 8. the acyl prefixes (R-5c2; render.js acylEndingTokens(),
 *    ringCarbonylTokens(), needsEnclosure(), isCompoundPrefix()): the acyl
 *    ending stands in a branch's free-valence place, and the ending before
 *    it loses its final vowel as before any vowel-initial word (rule 4:
 *    `prop` + `an` + `oil`, `but-2-en` + `oil`, `buta-2,3-dien` + `oil`), so
 *    it keeps it before `carbonil` (`ciclohexano` + `carbonil`,
 *    `ciclohex-2-eno-1-carbonil`); an acyl prefix of a chain is enclosed
 *    when it has prefixes of its own or a multiple bond (`propanoil`,
 *    `butanoil`, but `(2-metilpropanoil)`, `(but-2-enoil)`,
 *    `(prop-2-enoil)`), one of a ring always (`(ciclohexanocarbonil)`,
 *    `(ciclohex-2-eno-1-carbonil)`), the retained `acetil` and `benzoil`
 *    never by themselves (`3-acetilpentano-2,4-diona`, `3-benzoilpentano-2,4-diona`;
 *    with prefixes of its own a compound branch, `(4-metilbenzoil)`); bis… goes
 *    before an acyl prefix with prefixes of its own only (the student's
 *    multiplier kept as chosen, as rule 5: `diacetil`, `di(prop-2-enoil)`,
 *    `bis(2-metilpropanoil)`).
 * 9. an acid's class word (R-5d1, design.md §15.5.2 item 6: `ácido` +
 *    space; render.js renderName()): the `ácido` tile that starts the name
 *    is written first, part kind 'ending' as render.js gives it, and the
 *    space after it is automatic (a 'punct' piece, only when something
 *    follows); the rest of the name follows unchanged (`ácido
 *    2-metilpropanoico`: no hyphen after the space). The suffixes `oico` and
 *    `carboxílico` take rule 4 as `al` and `carbaldehído` do (`ácido
 *    butanoico`, `ácido but-2-enoico`, `ácido butanodioico`, `ácido
 *    ciclohexanocarboxílico`, `ácido ciclohexano-1,4-dicarboxílico`);
 *    `benzoico` is one whole word like `benzaldehído`, and `carboxi` a
 *    retained word like `formil`, never enclosed by itself (`(carboximetil)`
 *    is a compound branch).
 * 10. an ester's ` de `, ` y `, final `o` and own multipliers (R-6a1,
 *    design.md §15.5.2 item 6; render.js esterAlkylParts(), assembleEster()):
 *    the suffixes `oato` and `carboxilato` take rule 4 as `oico` and
 *    `carboxílico` do (`etanoato`, `but-2-enoato`, `butanodioato`,
 *    `ciclohexanocarboxilato`), `benzoato` is one whole word; after the
 *    parent, the automatic ` de ` (a 'punct' piece, only when something
 *    follows) and the O-bound groups (esterPieces()), the automatic ` y `
 *    between two different ones (`propanodioato de etilo y metilo`). The
 *    final `o` is the `ilo` tile's own (`il` + `o`), in the free-valence place
 *    of a chain (`metilo`, `propan-2-ilo`, `prop-2-en-1-ilo`, the ending
 *    elided before its vowel as before `il`) or after a retained word, whose
 *    `il` it replaces as `oxi` does (`isopropilo`, `tert-butilo`,
 *    `fenilo`); a group is never enclosed alone (`2-cloroetilo`,
 *    `4-metilfenilo`: a word of its own), and with the student's multiplier
 *    it is enclosed as a prefix by itself (`di(propan-2-ilo)`,
 *    `bis(2-cloroetilo)`, `dimetilo`, `diisopropilo`, `di-tert-butilo`).
 * 11. the ester prefixes (R-6a2b; render.js alkoxyTokens(),
 *    alkoxycarbonylTokens(), needsEnclosure(), enclosureLevel(),
 *    isCompoundPrefix()): an acyloxy prefix (`oxi` after an acyl branch,
 *    esterPrefixKind()) is its acyl prefix written whole + `oxi`, never
 *    contracted (`acetiloxi`, `formiloxi`, `propanoiloxi`, `benzoiloxi`), and
 *    an alkoxycarbonyl prefix (`carbonil` after `oxi`) its alkoxy prefix,
 *    contracted by rule 6 (`metoxi`, `isopropoxi`, `fenoxi`), + `carbonil`;
 *    both are always enclosed and compound (`(acetiloxi)`,
 *    `(metoxicarbonil)`, `bis(acetiloxi)`, `bis(metoxicarbonil)`, the
 *    student's multiplier kept as chosen), and their inner part — the acyl
 *    prefix before `oxi`, the alkoxy prefix before `carbonil` — has marks of
 *    its own, one level inside, when render.js encloses it
 *    (esterInnerEnclosed(): `[(prop-2-enoil)oxi]`,
 *    `[(ciclohexanocarbonil)oxi]`, `[(propan-2-iloxi)carbonil]`; with
 *    prefixes of its own, a compound branch whose START / END carry the outer
 *    marks, `[(2-metilpropanoil)oxi]`, `[(2-cloroetoxi)carbonil]`,
 *    `{[2-(acetiloxi)etanoil]oxi}`): the inner opening mark right after the
 *    outer one, the inner closing mark right before `oxi` or `carbonil`, both
 *    automatic pieces, so text order stays tile order.
 *
 * The nitriles (R-6b1) need no rule of their own: the suffixes `nitrilo` and
 * `carbonitrilo` start with a consonant, so rules 3 and 4 keep the parent's
 * final `o` before them and before their multiplier (`butanonitrilo`,
 * `prop-2-enonitrilo`, `butanodinitrilo`, `ciclohexanocarbonitrilo`,
 * `benceno-1,4-dicarbonitrilo`; render.js suffixWords(), P-16.7.1);
 * `benzonitrilo` is one whole word like `benzoico`, and `ciano` a retained
 * word like `carboxi`, never enclosed by itself (`diciano`, `(cianometil)` a
 * compound branch, `cianometilo` an ester's O-bound group).
 *
 * The amines (R-6c1) need no rule of their own either: the suffix `amina`
 * starts with a vowel, so rule 4 elides the parent's last vowel before it
 * and a multiplier's final `a` (`etanamina`, `propan-2-amina`,
 * `ciclohexanamina`, `bencenamina`, `bencen-1-amina`,
 * `butano-1,2,3,4-tetramina`, but `butano-1,4-diamina`), as render.js
 * suffixWords() does; the locant `N` is punctuated as any locant, in the
 * student's order (rule 1: `N-metiletanamina`, `N,N-dimetilmetanamina`,
 * `N,2-dimetilpropan-1-amina`, `1-cloro-N-metilmetanamina`).
 *
 * The amides (R-6d1) need no rule of their own either: the suffix `amida`
 * starts with a vowel, so rule 4 elides the parent's last vowel before it
 * (`etanamida`, `prop-2-enamida`), while `diamida` and `carboxamida` start
 * with a consonant and keep it (`etanodiamida`, `butanodiamida`,
 * `ciclohexanocarboxamida`, `ciclohexano-1,4-dicarboxamida`,
 * `ciclohex-1-eno-1-carboxamida`), as render.js suffixWords() does;
 * `benzamida` is one whole word like `benzonitrilo`, and the locant `N` is
 * punctuated as for an amine (`N-metiletanamida`, `N,N-dimetilbenzamida`,
 * `N,2-dimetilpropanamida`).
 *
 * 12. the amino prefixes (R-6c2; render.js substituentTokens(),
 *    needsEnclosure(), enclosureLevel(), isCompoundPrefix()): `amino` is a
 *    retained word, never enclosed by itself (`2-aminoetan-1-ol`,
 *    `diamino`, `(aminometil)` a compound branch, `aminoclorometil` on a
 *    crowded level); a compound branch whose own chain is `amino`
 *    (isAminoNode()) holds the groups on its nitrogen, written without
 *    locants, and every group after the first is enclosed whatever it is,
 *    with no crowded rule of its own (aminoLevel: `[etil(metil)amino]`,
 *    `[fenil(metil)amino]`), the first one only when it encloses itself
 *    (`[(propan-2-il)amino]`, `[(2-cloroetil)amino]`); being a branch with
 *    prefixes of its own it is enclosed and compound like any other
 *    (`(metilamino)`, `(dimetilamino)`, `bis(metilamino)`, the student's
 *    multipliers kept as chosen, with rule 5's hyphen before `tert-`:
 *    `bis-(tert-butilamino)`). The carbamoyl prefixes (R-6d2; render.js
 *    substituentTokens() and enclosureLevel() write a `carbamoil` prefix as
 *    an amino prefix, its groups those on the amide's nitrogen) take the
 *    same rule (isNitrogenGroupNode(): `carbamoil`, `dicarbamoil`,
 *    `(metilcarbamoil)`, `[etil(metil)carbamoil]`, `[(propan-2-il)carbamoil]`,
 *    `bis(metilcarbamoil)`), and so do the acylamino prefixes, an acyl
 *    group among the groups on an amino nitrogen (`(acetilamino)`,
 *    `[acetil(metil)amino]`, `[(2-metilpropanoil)amino]`,
 *    `[(ciclohexanocarbonil)amino]`: the first group enclosed only when it
 *    encloses itself, rule 8).
 * 13. an amine's functional-class name (R-6c3, design.md §2; naming/index.js
 *    amineClassName()): one word — the groups on the nitrogen written one
 *    after the other with no space and no mark between them, then the
 *    `amina` tile, the class word (`metilamina`, `dimetilamina`,
 *    `etildimetilamina`, `tert-butiletilamina`, and `butiltert-butilamina`,
 *    as the engine writes it, with no hyphen between two groups), rule 5's
 *    hyphen between a multiplier and `tert-` (`di-tert-butilamina`); each
 *    group enclosed as a prefix by itself, as rule 7 encloses an ether's
 *    (isEnclosed(): `(propan-2-il)amina`, `(2-cloroetil)metilamina`, the
 *    app's convention for names the engine never writes), never for its
 *    level. The engine's own class names (simple groups) are never enclosed.
 *
 * A ring (R-4a) is a chain with its `ciclo` tile before the root, and takes
 * the same rules: `ciclohexa-1,3-dieno` (rule 2), `ciclooct-1-en-3-ino` and
 * `(ciclohex-2-en-1-il)` (rule 3), `ciclohexil`, `ciclohexiliden` and an
 * unsaturated ring branch always enclosed (rule 5, render.js needsEnclosure(),
 * a ring having at least three carbons).
 *
 * The benzene words (R-4b) take no automatic text of their own: `benceno` is
 * the parent's whole stem, written after the prefixes (`1,2-dimetilbenceno`);
 * `fenil` is a simple branch never enclosed alone (`fenilmetano`,
 * `difenilmetano`), enclosed as a ring prefix after the first of a crowded
 * level (`metil(fenil)metano`, rule 5), and a compound branch with prefixes
 * of its own is enclosed like any other (`(4-metilfenil)`,
 * `[4-(propan-2-il)fenil]`; render.js isSubstitutedPhenyl()).
 *
 * The halogens (R-5a1: `fluoro`, `cloro`, `bromo`, `yodo`) are simple
 * prefixes with no automatic text of their own, never enclosed (render.js
 * needsEnclosure()), also when crowded (render.js encloses only alkoxy and
 * ring prefixes there: `bromoclorofluoroyodometano`, `(clorofluorometil)`);
 * the student's order, multipliers and locants stay as written
 * (`2-bromo-1-cloropropano`, `hexacloroetano`, `(2-cloroetil)`). So is
 * `hidroxi` (R-5a2: `(hidroximetil)`, `(4-hidroxifenil)`).
 *
 * The alcohol suffix (R-5a2) follows the parent's ending with its locants
 * (rule 1: `butano-1,4-diol`), its multiplier and `ol` (rule 4 above); the
 * `fenol` tile is one whole word, like `benceno`. The suffixes of the
 * aldehydes and ketones (R-5c1) take rule 4 as `ol` does, by the first
 * letter of multiplier + suffix (render.js suffixWords()): `butanal`,
 * `but-2-enal`, `prop-2-inal`, `pentan-2-ona`, `ciclohexanona`,
 * `ciclohex-2-en-1-ona`, but `butanodial`, `pentano-2,4-diona`,
 * `ciclohexano-1,4-diona`; `carbaldehído` starts with a consonant, so the
 * ending keeps its `o` (`ciclohexanocarbaldehído`,
 * `ciclohex-2-eno-1-carbaldehído`, `bencenocarbaldehído`,
 * `benceno-1,4-dicarbaldehído`); `al` never has locants on a chain
 * (parse.js). `benzaldehído` is one whole word like `fenol`, and `oxo` a
 * one-atom prefix like `hidroxi`, never enclosed by itself (`4-oxopentanal`,
 * `(2-oxoetil)`); `formil` a retained word like `isopropil`. The closing-bond locant
 * `1(n)` (R-5a2) is written with the ring's own size, `1(6)` on a ring of six
 * (structure.js locantText(): `ciclohex-1(6)-eno-1,2,4-triol`), and
 * punctuated as any locant (`ciclopropa-1,1(3),2-trieno`); out of place it
 * keeps the tile's text, `1(n)`.
 *
 * The retained templates (R-4c: `tolueno`, `estireno`, `xileno`,
 * `mesitileno`) are whole words like `benceno`, the positions of `xileno`'s
 * methyls written before it as locants (`1,2-xileno`, rule 1). An
 * orto/meta/para letter is written where its tile stands and punctuated as
 * a locant (render.js positionalParts() gives it the part kind 'locant'):
 * `o-xileno`, `o-dimetilbenceno`, `p-di-tert-butilbenceno`; a prefix with a
 * letter counts as one with locants for the crowded case.
 *
 * Rule 5 reads "a cited locant" for render.js's "free-valence locant above
 * 1 or unsaturation in a chain of three or more carbons": on every name the
 * engine writes the two coincide (it cites those locants exactly then), and
 * a student's `prop ano 1 il` or `et 1 eno 1 il` reads `(propan-1-il)`,
 * `(et-1-en-1-il)` instead of running its locants into the next word.
 *
 * Spans: `{tile, from, to, kind}` cover the text from start to end in order
 * (`text.slice(from, to)` is the piece); `tile` is the tile's index in the
 * sequence, or null for automatic text (punctuation, the connecting `a`,
 * the automatic `an`, the marks of an enclosed simple branch). Every tile
 * has exactly one span; the controls of a compound branch that needs no
 * marks get an empty one. `kind` follows render.js parts: 'locant',
 * 'multiplier', 'stem', 'ending' in the parent and before a prefix,
 * 'prefix' inside a branch, 'punct' for punctuation, marks and the spaces of
 * a class name (R-5b2), 'ending' for its class word `éter`. The opening
 * mark of an unfinished compound branch has `pending: true` (shown faintly,
 * design.md §15.2).
 */

import {
  ENDINGS, ENCLOSING_MARKS, CONNECTING_VOWEL, SATURATED_INFIX, FREE_VALENCE_SUFFIXES, ESTER_LINK, ESTER_ALKYL_JOIN,
} from '../naming/lexicon.es.js';
import {
  isAtomGroup, closingText, ALKOXY_RETAINED, isAcyloxyHead, isAminoTile, isAmineClassWord, isNitrogenGroupTile,
} from './tiles.js';

/**
 * Longest alkyl chain whose alkoxy prefix is contracted (rule 6, R-5b:
 * `butoxi`, but `pentiloxi`; IUPAC 2013 P-63.2.2.2). The same value as
 * render.js MAX_CONTRACTED_ALKOXY (the tests check it), kept here because the
 * assembler never imports the engine's rendering (design.md §15.4).
 */
export const MAX_CONTRACTED_ALKOXY = 4;

/** The free-valence suffix an alkoxy contraction drops (`met` + `il` → `met` + `oxi`; R-5b). */
const IL = FREE_VALENCE_SUFFIXES[1];

/**
 * The node of a substituent that carries the alkoxy ending `oxi` (R-5b):
 * the chain or retained node itself, or the own chain of a compound branch
 * (`START 2 met il prop il oxi END`); null for any other substituent.
 *
 * @param {object|null} node - A substituent node (parse.js chain, retained, halogen, hydroxy or branch), or null.
 * @returns {object|null} The chain or retained node with `oxi`, or null.
 */
export function alkoxyCore(node) {
  if (!node) {
    return null;
  }
  const core = node.type === 'branch' ? node.chain : node;
  return core && (core.type === 'chain' || core.type === 'retained') && core.oxi !== null && core.oxi !== undefined ? core : null;
}

/**
 * Tells whether a substituent is an amino prefix (R-6c2): the `amino` word,
 * or a compound branch whose own chain is `amino`, its prefixes the groups
 * on its nitrogen (`(metilamino)`, `[etil(metil)amino]`).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object|null} node - A substituent node (parse.js), or null.
 * @returns {boolean} True for an amino prefix.
 */
export function isAminoNode(tiles, node) {
  if (!node) {
    return false;
  }
  const core = node.type === 'branch' ? node.chain : node;
  return Boolean(core) && core.type === 'retained' && isAminoTile(tiles[core.tile]);
}

/**
 * Tells whether a substituent is a prefix whose nitrogen takes the groups
 * written before its word (rule 12): an amino prefix (R-6c2, isAminoNode())
 * or a carbamoyl prefix (R-6d2: the `carbamoil` word, or a compound branch
 * whose own chain is `carbamoil`, `(metilcarbamoil)`,
 * `[etil(metil)carbamoil]`; tiles.js isNitrogenGroupTile()).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object|null} node - A substituent node (parse.js), or null.
 * @returns {boolean} True for an amino or a carbamoyl prefix.
 */
export function isNitrogenGroupNode(tiles, node) {
  if (!node) {
    return false;
  }
  const core = node.type === 'branch' ? node.chain : node;
  return Boolean(core) && core.type === 'retained' && isNitrogenGroupTile(tiles[core.tile]);
}

/**
 * Tells whether a substituent is an alkoxy prefix (R-5b): its branch ends in
 * the `oxi` tile.
 *
 * @param {object|null} node - A substituent node, or null.
 * @returns {boolean} True for an alkoxy prefix.
 */
export function isAlkoxyNode(node) {
  return alkoxyCore(node) !== null;
}

/**
 * The tile before the `oxi` of an alkoxy prefix's core (R-5b): its chain's
 * free-valence tile (`il`, or an acyl ending `oil` / `carbonil`), or its
 * retained word (`isopropil`, `acetil`…).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} core - alkoxyCore() of a prefix.
 * @returns {object} The tile.
 */
function headTile(tiles, core) {
  return tiles[core.type === 'chain' ? core.fv : core.tile];
}

/**
 * The kind of ester prefix a substituent is (R-6a2b): 'acyloxy' for an acyl
 * branch closed by `oxi` (`acetiloxi`, `propanoiloxi`, `benzoiloxi`; tiles.js
 * isAcyloxyHead()), 'alkoxycarbonyl' for an alkoxy branch closed by `oxi` and
 * `carbonil` (`metoxicarbonil`, `isopropoxicarbonil`; parse.js `carbonil`);
 * null for any other substituent, alkoxy prefixes included.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object|null} node - A substituent node (parse.js), or null.
 * @returns {'acyloxy'|'alkoxycarbonyl'|null} The kind.
 */
export function esterPrefixKind(tiles, node) {
  const core = alkoxyCore(node);
  if (core === null) {
    return null;
  }
  if (core.carbonil !== undefined) {
    return 'alkoxycarbonyl';
  }
  return isAcyloxyHead(headTile(tiles, core)) ? 'acyloxy' : null;
} // End of function esterPrefixKind()

/**
 * Tells whether the inner part of an ester prefix (R-6a2b) — the acyl
 * prefix before `oxi` of an acyloxy group, the alkoxy prefix before
 * `carbonil` of an alkoxycarbonyl group — is enclosed inside the prefix's
 * own marks, as render.js alkoxyTokens() and alkoxycarbonylTokens() enclose
 * it: always with prefixes of its own (a compound branch:
 * `[(2-metilpropanoil)oxi]`, `[(2-cloroetoxi)carbonil]`); else, for an acyl
 * part, a chain's with a multiple bond or a cited locant or a `ciclo`
 * ring's (`[(prop-2-enoil)oxi]`, `[(ciclohexanocarbonil)oxi]`; never
 * `acetil`, `formil`, `benzoil` or `propanoil`, isEnclosed() of an acyl
 * prefix), and for an alkoxy part one that is not contracted
 * (`[(propan-2-iloxi)carbonil]`, `[(pentiloxi)carbonil]`; never `metoxi`,
 * `isopropoxi`, `fenoxi`).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A substituent node (parse.js).
 * @returns {boolean} True when the inner part has marks of its own.
 */
export function esterInnerEnclosed(tiles, node) {
  const kind = esterPrefixKind(tiles, node);
  if (kind === null) {
    return false;
  }
  if (node.type === 'branch' && node.items.length > 0) {
    return true;
  }
  const core = alkoxyCore(node);
  if (kind === 'alkoxycarbonyl') {
    return !isContractedCore(tiles, core);
  }
  return core.type === 'chain' && (core.ring !== null || core.segments.length > 0 || citesLocant(core));
} // End of function esterInnerEnclosed()

/**
 * The `ilo` tile that ends a substituent (R-6a1, an ester's O-bound group):
 * the free-valence tile of a chain when it is `ilo` (`metilo`,
 * `propan-2-ilo`), the `ilo` after a retained word (parse.js `ilo`:
 * `isopropilo`, `fenilo`), or that of a compound branch's own chain
 * (`START 2 cloro et ilo END`); null for any other substituent.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object|null} node - A substituent node (parse.js), or null.
 * @returns {number|null} The `ilo` tile index, or null.
 */
export function iloTileOf(tiles, node) {
  if (!node) {
    return null;
  }
  if (node.type === 'branch') {
    return iloTileOf(tiles, node.chain);
  }
  if (node.type === 'chain') {
    return node.fv !== null && tiles[node.fv].kind === 'esterAlkyl' ? node.fv : null;
  }
  return node.type === 'retained' && node.ilo !== undefined ? node.ilo : null;
} // End of function iloTileOf()

/**
 * The O-bound groups of an ester's O-bound side (R-6a1, parse.js `ester`
 * node), in the student's order: each group is the item whose substituent
 * ends in `ilo` (iloTileOf(): its chain, multiplier and, for a compound
 * branch, its own prefixes) with the bare prefixes written before it since
 * the previous group (`2 cloro et ilo` → `2-cloroetilo`: the prefix `2
 * cloro` and the chain `et ilo`); `rest` holds the items after the last
 * group, which belong to none.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object[]} items - The O-bound side's prefix and stray nodes.
 * @returns {{groups: {items: object[], end: object}[], rest: object[]}} The groups and the items left over.
 */
export function esterGroupsOf(tiles, items) {
  const groups = [];
  let pending = [];
  for (const item of items) {
    if (item.type === 'prefix' && iloTileOf(tiles, item.substituent) !== null) {
      groups.push({ items: pending, end: item });
      pending = [];
    } else {
      pending.push(item);
    }
  } // End of the loop over the O-bound side's items
  return { groups, rest: pending };
} // End of function esterGroupsOf()

/**
 * Tells whether an alkoxy prefix takes the short form (rule 6, R-5b;
 * render.js isContractedAlkoxy()): a retained word that takes `oxi`
 * (`isopropoxi`, `tert-butoxi`, `fenoxi`; tiles.js ALKOXY_RETAINED — never
 * an acyl word, R-5c2, whose `oxi` render.js writes after it whole,
 * `(acetiloxi)`, `(formiloxi)`: an ester's acyloxy prefix, R-6a2b), or a
 * saturated open chain of one to MAX_CONTRACTED_ALKOXY
 * carbons whose free valence sits at its carbon 1 by rule (`il` with no
 * locant, no `ano`): `metoxi`, `butoxi`.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} core - alkoxyCore() of the prefix.
 * @returns {boolean} True for the short form.
 */
export function isContractedCore(tiles, core) {
  if (core.type === 'retained') {
    return ALKOXY_RETAINED.includes(tiles[core.tile].value);
  }
  return core.ring === null && core.root !== null && core.ano === null && core.segments.length === 0
    && core.fvLocants.length === 0 && core.fv !== null && tiles[core.fv].value === 1
    && tiles[core.root].value <= MAX_CONTRACTED_ALKOXY;
} // End of function isContractedCore()

/** The retained word whose alkoxy prefix the engine multiplies with bis… (isCompoundAlkoxy(): `bis-tert-butoxi`). */
const COMPOUND_RETAINED_ALKOXY = 'tert-butyl';

/**
 * Tells whether an alkoxy prefix is compound for its multiplier (rule 6,
 * R-5b; render.js isCompoundPrefix()) because of its form: an ester prefix
 * (rule 11, R-6a2b: `bis(acetiloxi)`, `bis(metoxicarbonil)`), not contracted,
 * so written as its branch + `oxi` (`bis(pentiloxi)`, `bis(propan-2-iloxi)`),
 * or `tert-butoxi`, which render.js counts as compound because the engine's
 * tert-butyl structure carries its two methyls as prefixes
 * (`1,6-bis-tert-butoxihexano`; as an alkyl prefix it stays `di-tert-butil`);
 * `isopropoxi` and `fenoxi` are simple (`diisopropoxi`, `difenoxi`). A
 * compound branch with prefixes of its own is compound anyway.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object|null} node - A substituent node, or null.
 * @returns {boolean} True for an alkoxy prefix that takes bis, tris….
 */
export function isCompoundAlkoxy(tiles, node) {
  const core = alkoxyCore(node);
  if (core === null) {
    return false;
  }
  if (esterPrefixKind(tiles, node) !== null) {
    return true; // R-6a2b: an ester prefix is always compound (render.js isCompoundPrefix(): `bis(acetiloxi)`, `bis(metoxicarbonil)`).
  }
  return core.type === 'retained' ? tiles[core.tile].value === COMPOUND_RETAINED_ALKOXY : !isContractedCore(tiles, core);
}

/**
 * One piece of text before the automatic punctuation is added.
 *
 * @typedef {object} Piece
 * @property {string} text - The text ('' for a compound-branch control without marks).
 * @property {number|null} tile - Index of its tile, or null for automatic text.
 * @property {string} kind - render.js part kind.
 * @property {'locant'|'word'|'mult'|'open'|'close'|'space'} role - What the punctuation rules see ('space': the
 *   automatic space between the words of a class name, R-5b2).
 * @property {boolean} [italic] - The piece starts with an italic descriptor (`tert-`).
 * @property {boolean} [pending] - Opening mark of an unfinished compound branch.
 */

/**
 * Part kinds of the parent's pieces and of the pieces inside a branch
 * (render.js renders a whole prefix as one 'prefix' part).
 */
const KINDS = Object.freeze({
  parent: Object.freeze({ stem: 'stem', ending: 'ending', locant: 'locant', multiplier: 'multiplier' }),
  prefix: Object.freeze({ stem: 'prefix', ending: 'prefix', locant: 'prefix', multiplier: 'prefix' }),
});

/**
 * Creates a piece.
 *
 * @param {string} text - The text.
 * @param {number|null} tile - Tile index, or null.
 * @param {string} kind - Part kind.
 * @param {'locant'|'word'|'mult'|'open'|'close'|'space'} role - Punctuation role.
 * @param {object} [extra] - `italic` / `pending` flags.
 * @returns {Piece} The piece.
 */
function piece(text, tile, kind, role, extra = {}) {
  return { text, tile, kind, role, ...extra };
}

/**
 * Tells whether a chain of a branch cites a locant of its own: a segment's
 * locants or the free-valence locant.
 *
 * @param {object} chain - A chain node.
 * @returns {boolean} True when a locant is cited.
 */
function citesLocant(chain) {
  return chain.fvLocants.length > 0 || chain.segments.some((segment) => segment.locants.length > 0);
}

/**
 * Tells whether a substituent is written between enclosing marks
 * (rule 5, render.js needsEnclosure()), whatever stands beside it. An
 * ester prefix (rule 11, R-6a2b) always is: `(acetiloxi)`,
 * `(metoxicarbonil)`. An alkoxy prefix (rule 6, R-5b) is enclosed unless contracted:
 * `(pentiloxi)`, `(eteniloxi)`, but `metoxi`, `isopropoxi`. An acyl prefix
 * (rule 8, R-5c2) of a chain when it cites a multiple bond or a locant
 * (`(but-2-enoil)`; `propanoil` not), one of a ring always
 * (`(ciclohexanocarbonil)`).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A chain, retained, halogen or branch node.
 * @returns {boolean} True when enclosed.
 */
export function isEnclosed(tiles, node) {
  if (isAtomGroup(node.type)) {
    return false;
  }
  if (node.type === 'branch') {
    return node.items.length > 0 || (node.chain !== null && isEnclosed(tiles, node.chain));
  }
  if (esterPrefixKind(tiles, node) !== null) {
    return true; // R-6a2b: an ester prefix is always enclosed (render.js needsEnclosure(): `(acetiloxi)`, `(metoxicarbonil)`).
  }
  if (isAlkoxyNode(node)) {
    return !isContractedCore(tiles, node); // `(pentiloxi)`, `(propan-2-iloxi)`, `(ciclohexiloxi)` (R-5b).
  }
  if (node.type === 'retained') {
    return false;
  }
  const unsaturated = node.segments.length > 0;
  if (node.fv !== null && tiles[node.fv].kind === 'acyl') {
    return node.ring !== null || unsaturated || citesLocant(node); // `(ciclohexanocarbonil)`, `(but-2-enoil)` (R-5c2)
  }
  return citesLocant(node) || (unsaturated && node.root !== null && tiles[node.root].value > 2);
} // End of function isEnclosed()

/**
 * Tells whether the prefixes of one level (the name, or a compound branch)
 * are "crowded" as render.js renderPrefixes() / enclosureLevel() say: two or
 * more of them, all written without locants or a letter (a one-carbon parent
 * or branch: `metil(ciclohexil)metano`).
 *
 * @param {object[]} items - The level's prefix and stray nodes.
 * @returns {boolean} True when crowded.
 */
export function crowdedLevel(items) {
  const prefixes = items.filter((item) => item.type === 'prefix' && item.substituent);
  return prefixes.length > 1 && prefixes.every((item) => item.locants.length === 0 && item.letter === null);
}

/**
 * Tells whether the prefix at one position of a level is written between
 * enclosing marks (rule 5, render.js enclosedInName()): isEnclosed(), or,
 * on a crowded level, an alkoxy prefix wherever it stands (R-5b:
 * `cloro(metoxi)metano`) and a ring branch — `ciclo` or `fenil` — after the
 * first prefix (a ring prefix cited first reads unambiguously). A compound
 * branch without prefixes of its own (`START ciclo hex il END`) is judged by
 * its chain, like isEnclosed(). On the nitrogen of an amino prefix (rule 12,
 * R-6c2: `aminoLevel`) every group after the first is enclosed and there is
 * no crowded rule (render.js substituentTokens(): `[etil(metil)amino]`).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object[]} items - The level's prefix and stray nodes.
 * @param {number} index - The position of a prefix with a substituent.
 * @param {boolean} [aminoLevel] - The level is the groups on an amino prefix's nitrogen (default false).
 * @returns {boolean} True when enclosed.
 */
export function enclosedAt(tiles, items, index, aminoLevel = false) {
  const node = items[index].substituent;
  if (isEnclosed(tiles, node)) {
    return true;
  }
  if (aminoLevel) {
    return index > 0; // Every group after the first (R-6c2): `[etil(metil)amino]`.
  }
  const core = node.type === 'branch' && node.items.length === 0 ? node.chain : node;
  if (core !== null && isAlkoxyNode(core)) {
    return crowdedLevel(items); // The alkoxy before the ring, as render.js enclosedInName(): a crowded `(fenoxi)` too.
  }
  return index > 0 && core !== null && isRingBranch(tiles, core) && crowdedLevel(items);
} // End of function enclosedAt()

/**
 * Tells whether a simple branch is a ring: a `ciclo` chain or `fenil` (R-4b).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A chain or retained node.
 * @returns {boolean} True for a ring branch.
 */
function isRingBranch(tiles, node) {
  return (node.type === 'chain' && node.ring !== null) || (node.type === 'retained' && tiles[node.tile].value === 'phenyl');
}

/**
 * Nesting level of the enclosing marks of a substituent (render.js
 * enclosureLevel()): 0 for ( ), one more than the highest enclosed prefix
 * inside it; one more again for an ester prefix whose inner part has marks
 * of its own (rule 11, R-6a2b: `[(propan-2-iloxi)carbonil]`).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A chain, retained or branch node.
 * @returns {number} The level.
 */
export function enclosureLevel(tiles, node) {
  // R-6a2b: an ester prefix's marks go round its inner part's (render.js enclosureLevel()): `[(propan-2-iloxi)carbonil]`.
  const inner = esterInnerEnclosed(tiles, node) ? 1 : 0;
  if (node.type !== 'branch') {
    return inner;
  }
  let level = 0;
  const aminoLevel = isNitrogenGroupNode(tiles, node); // The groups on an amino (R-6c2) or carbamoyl (R-6d2) nitrogen, rule 12.
  node.items.forEach((item, i) => {
    if (item.type === 'prefix' && item.substituent && enclosedAt(tiles, node.items, i, aminoLevel)) {
      level = Math.max(level, enclosureLevel(tiles, item.substituent) + 1);
    }
  });
  return level + inner;
} // End of function enclosureLevel()

/**
 * The pieces of a tile out of place (TILE_ORDER): its plain text, with the
 * role its kind gives it.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {number} index - The tile index.
 * @param {Piece[]} out - Receives the piece.
 * @returns {void}
 */
function strayPieces(tiles, index, out) {
  const tile = tiles[index];
  const roles = {
    num: 'locant', positional: 'locant', closing: 'locant', nitrogen: 'locant', mult: 'mult', cmult: 'mult', start: 'open',
    end: 'close',
  };
  const kinds = {
    num: 'locant', positional: 'locant', closing: 'locant', mult: 'multiplier', cmult: 'multiplier', root: 'stem', ending: 'ending',
    nitrogen: 'locant', // A stray `N` (R-6c1).
    freeValence: 'ending', retained: 'prefix', halogen: 'prefix', hydroxy: 'prefix', carbonyl: 'prefix', suffix: 'ending', start: 'punct',
    end: 'punct',
    ring: 'stem', benzene: 'stem', template: 'stem', alkoxy: 'ending', classWord: 'ending', suffixClass: 'ending',
    acyl: 'ending', esterAlkyl: 'ending', // A stray `oil`, `carbonil` (R-5c2; after a compound branch's END, R-6a2b) or `ilo` (R-6a1).
  };
  out.push(piece(tile.text, index, kinds[tile.kind], roles[tile.kind] || 'word', tile.italic ? { italic: true } : {}));
}

/**
 * Tells whether a text starts with a vowel (render.js suffixWords(): the
 * elisions of rule 4).
 *
 * @param {string} text - The text.
 * @returns {boolean} True before a vowel.
 */
function startsWithVowel(text) {
  return /^[aeiou]/.test(text);
}

/**
 * The text of a suffix's multiplier (R-5a2, rule 4): its tile's text, the
 * final `a` elided before a vowel-initial suffix (`tetr` + `ol`); '' without
 * one.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} suffix - A suffix node (parse.js).
 * @returns {string} The text.
 */
function suffixMultiplierText(tiles, suffix) {
  if (suffix.multiplier === null) {
    return '';
  }
  const text = tiles[suffix.multiplier].text;
  return /a$/.test(text) && startsWithVowel(tiles[suffix.tile].text) ? text.slice(0, -1) : text; // As render.js suffixWords().
}

/**
 * Tells whether a suffix makes the parent's last ending lose its final
 * vowel (R-5a2, rule 4): its multiplier and word start with a vowel
 * (`an` + `ol`, but `ano` + `diol`, `ano` + `tetrol`).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object|null} suffix - A suffix node, or null.
 * @returns {boolean} True when the parent's final vowel is elided.
 */
function suffixElides(tiles, suffix) {
  return Boolean(suffix) && startsWithVowel(`${suffixMultiplierText(tiles, suffix)}${tiles[suffix.tile].text}`);
}

/**
 * The text of a locant tile: a number, or the closing-bond locant `1(n)`
 * (R-5a2) written with the size of the ring it numbers (`1(6)`), its tile's
 * text where no ring gives one.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {number} index - The tile index.
 * @param {number|null} [ring] - Carbons of the ring whose bond it numbers, or null.
 * @returns {string} The text.
 */
function locantText(tiles, index, ring = null) {
  const tile = tiles[index];
  return tile.kind === 'closing' && ring !== null ? closingText(ring) : tile.text;
}

/**
 * The pieces of a chain: `ciclo` for a ring, root, connecting `a` (rule 2),
 * `ano` / automatic `an` (rule 4), unsaturation segments with their locants,
 * multipliers and endings (rule 3), free-valence locant and suffix — or an
 * acyl ending (rule 8, R-5c2), before which the last ending loses its
 * vowel only when the ending starts with one (`propanoil`, but
 * `ciclohexanocarbonil`). A `ciclo` without its root (RING_ROOT) is all
 * there is.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} chain - A chain node.
 * @param {'parent'|'prefix'} style - Part kinds of the parent or of a branch.
 * @param {Piece[]} out - Receives the pieces.
 * @param {boolean} [beforeVowel] - The parent's suffix starts with a vowel: its last ending loses its `o` (rule 4, R-5a2).
 * @param {string[]|null} [inner] - The marks of an ester prefix's inner part (R-6a2b, rule 11): its closing mark goes
 *   before `oxi` (acyloxy) or `carbonil` (alkoxycarbonyl); null without them (default).
 * @returns {void}
 */
function chainPieces(tiles, chain, style, out, beforeVowel = false, inner = null) {
  const kinds = KINDS[style];
  const hasFreeValence = chain.fv !== null;
  // The last ending loses its vowel before `il`, `iliden` or `oil`, never before `carbonil` (rule 8, R-5c2).
  const elides = (hasFreeValence && startsWithVowel(tiles[chain.fv].text)) || beforeVowel;
  if (chain.ring !== null) {
    out.push(piece(tiles[chain.ring].text, chain.ring, kinds.stem, 'word')); // `ciclohexano`, `ciclohexil`
  }
  if (chain.root === null) {
    return;
  }
  out.push(piece(tiles[chain.root].text, chain.root, kinds.stem, 'word'));
  const ring = chain.ring === null ? null : tiles[chain.root].value; // `1(n)` is written with the ring's size (R-5a2).
  const first = chain.segments[0];
  if (first && first.multiplier !== null) {
    out.push(piece(CONNECTING_VOWEL, null, kinds.stem, 'word')); // `buta-1,3-dieno`
  }
  if (chain.ano !== null) {
    const text = elides ? ENDINGS.saturated.slice(0, -1) : ENDINGS.saturated;
    out.push(piece(text, chain.ano, kinds.ending, 'word')); // `propan-2-il`, `propan-2-ol`, `hexano`, `butano-1,4-diol`
  } else if (chain.segments.length === 0 && chain.fvLocants.length > 0) {
    out.push(piece(SATURATED_INFIX, null, kinds.ending, 'word')); // `prop 2 il` → `propan-2-il`
  }
  chain.segments.forEach((segment, i) => {
    segment.locants.forEach((index) => out.push(piece(locantText(tiles, index, ring), index, kinds.locant, 'locant')));
    if (segment.multiplier !== null) {
      out.push(piece(tiles[segment.multiplier].text, segment.multiplier, kinds.multiplier, 'mult'));
    }
    const text = tiles[segment.ending].text;
    const elided = i < chain.segments.length - 1 || elides; // `prop-2-en-1-ol` (R-5a2); `ciclohex-2-eno-1-carbonil` (R-5c2)
    out.push(piece(elided ? text.slice(0, -1) : text, segment.ending, kinds.ending, 'word'));
  });
  chain.fvLocants.forEach((index) => out.push(piece(tiles[index].text, index, kinds.locant, 'locant')));
  const alkoxy = isAlkoxyNode(chain);
  if (hasFreeValence) {
    // Rule 6 (R-5b): `oxi` replaces the `il` of a contracted alkoxy prefix (`met` + `oxi`), whose tile then writes nothing.
    const silent = alkoxy && isContractedCore(tiles, chain);
    out.push(piece(silent ? '' : tiles[chain.fv].text, chain.fv, kinds.ending, 'word'));
  }
  if (alkoxy) {
    esterEndingPieces(tiles, chain, kinds.ending, inner, out); // `metoxi`, `pentiloxi` (R-5b); `(propanoil)oxi`, `metoxicarbonil` (R-6a2b)
  }
} // End of function chainPieces()

/**
 * The pieces of an alkoxy prefix's `oxi` and, for an alkoxycarbonyl prefix
 * (R-6a2b, rule 11), its `carbonil`, with the closing mark of the ester
 * prefix's inner part where it goes: before `oxi` after an acyl part
 * (`(prop-2-enoil)` + `oxi`), before `carbonil` after an alkoxy part
 * (`(propan-2-iloxi)` + `carbonil`).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} core - alkoxyCore() of the prefix (a chain or retained node with `oxi`).
 * @param {string} kind - The part kind of the pieces.
 * @param {string[]|null} inner - The inner part's marks, or null.
 * @param {Piece[]} out - Receives the pieces.
 * @returns {void}
 */
function esterEndingPieces(tiles, core, kind, inner, out) {
  const carbonil = core.carbonil !== undefined;
  if (inner && !carbonil) {
    out.push(piece(inner[1], null, 'punct', 'close')); // `[(prop-2-enoil)oxi]`
  }
  out.push(piece(tiles[core.oxi].text, core.oxi, kind, 'word'));
  if (carbonil) {
    if (inner) {
      out.push(piece(inner[1], null, 'punct', 'close')); // `[(propan-2-iloxi)carbonil]`
    }
    out.push(piece(tiles[core.carbonil].text, core.carbonil, kind, 'word')); // `metoxicarbonil`
  }
} // End of function esterEndingPieces()

/**
 * The pieces of a substituent with its enclosing marks (rule 5): the
 * controls of a compound branch carry the marks (an unfinished branch
 * always shows its opening mark), a simple branch gets automatic ones; an
 * opening mark right before an italic descriptor takes its italic flag, so
 * a multiplier before it is followed by rule 5's hyphen, as render.js writes
 * it (`bis-(tert-butoxicarbonil)`, R-6a2b).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A chain, retained or branch node.
 * @param {boolean} enclosed - Whether it is enclosed where it stands (enclosedAt()).
 * @param {Piece[]} out - Receives the pieces.
 * @returns {void}
 */
function substituentPieces(tiles, node, enclosed, out) {
  const first = out.length;
  substituentPiecesOf(tiles, node, enclosed, out);
  // Rule 5's hyphen before an italic descriptor, as render.js groupTokens() writes it, also when the substituent's opening mark
  // stands between them (R-6a2b: `bis-(tert-butoxicarbonil)`): the mark takes the italic flag of the word right after it.
  const shown = out.slice(first).filter((p) => p.text !== '');
  if (shown.length > 1 && shown[0].role === 'open' && shown[1].italic) {
    shown[0].italic = true;
  }
} // End of function substituentPieces()

/**
 * The pieces of a substituent with its enclosing marks (substituentPieces(),
 * without rule 5's hyphen before a mark).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A chain, retained or branch node.
 * @param {boolean} enclosed - Whether it is enclosed where it stands (enclosedAt()).
 * @param {Piece[]} out - Receives the pieces.
 * @returns {void}
 */
function substituentPiecesOf(tiles, node, enclosed, out) {
  const level = enclosureLevel(tiles, node);
  const [open, close] = ENCLOSING_MARKS[level % ENCLOSING_MARKS.length];
  // R-6a2b (rule 11): an ester prefix's inner part, one level inside: `[(2-metilpropanoil)oxi]`, `[(propan-2-iloxi)carbonil]`.
  const inner = esterInnerEnclosed(tiles, node) ? ENCLOSING_MARKS[(level - 1) % ENCLOSING_MARKS.length] : null;
  if (node.type === 'branch') {
    const pending = node.end === null;
    out.push(piece(enclosed || pending ? open : '', node.start, 'punct', 'open', pending ? { pending: true } : {}));
    if (inner) {
      out.push(piece(inner[0], null, 'punct', 'open'));
    }
    const aminoLevel = isNitrogenGroupNode(tiles, node); // The groups on an amino (R-6c2) or carbamoyl (R-6d2) nitrogen, rule 12.
    node.items.forEach((item, i) => itemPieces(tiles, node.items, i, true, out, false, aminoLevel));
    if (node.chain) {
      ownChainPieces(tiles, node.chain, out, inner); // Inside the branch's marks, never enclosed again: `(3-metilbutan-2-il)`.
    }
    if (!pending) {
      out.push(piece(enclosed ? close : '', node.end, 'punct', 'close'));
    }
    return;
  }
  if (enclosed) {
    out.push(piece(open, null, 'punct', 'open'));
  }
  if (inner) {
    out.push(piece(inner[0], null, 'punct', 'open'));
  }
  ownChainPieces(tiles, node, out, inner);
  if (enclosed) {
    out.push(piece(close, null, 'punct', 'close'));
  }
} // End of function substituentPiecesOf()

/**
 * The pieces of a simple branch without enclosing marks: a retained word, a
 * one-atom group (a halogen, R-5a1; `hidroxi`, R-5a2) or a chain. A
 * retained word before `oxi` loses its `il` (rule 6, R-5b: `isoprop` +
 * `oxi`, `tert-but` + `oxi`, `fen` + `oxi`).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A chain, retained, halogen or hydroxy node.
 * @param {Piece[]} out - Receives the pieces.
 * @param {string[]|null} [inner] - The marks of an ester prefix's inner part (R-6a2b; esterEndingPieces()), or null (default).
 * @returns {void}
 */
function ownChainPieces(tiles, node, out, inner = null) {
  if (node.type === 'retained' || isAtomGroup(node.type)) {
    const tile = tiles[node.tile];
    const alkoxy = isAlkoxyNode(node);
    const ilo = node.type === 'retained' && node.ilo !== undefined; // `isopropil ilo` (R-6a1, rule 10)
    // As render.js alkoxyTokens(): `isoprop` + `oxi`, but `acetil` + `oxi` (R-6a2b, an ester's acyloxy prefix).
    const cut = ((alkoxy && node.type === 'retained' && isContractedCore(tiles, node)) || ilo) && tile.text.endsWith(IL);
    const text = cut ? tile.text.slice(0, -IL.length) : tile.text;
    out.push(piece(text, node.tile, 'prefix', 'word', tile.italic ? { italic: true } : {}));
    if (alkoxy) {
      esterEndingPieces(tiles, node, 'prefix', inner, out); // `isopropoxi`, `fenoxi` (R-5b); `acetiloxi`, `isopropoxicarbonil` (R-6a2b)
    }
    if (ilo) {
      out.push(piece(tiles[node.ilo].text, node.ilo, 'prefix', 'word')); // `isopropilo`, `tert-butilo`, `fenilo` (R-6a1)
    }
  } else {
    chainPieces(tiles, node, 'prefix', out, false, inner);
  }
} // End of function ownChainPieces()

/**
 * The pieces of a prefix (its locants, letter, multiplier and substituent)
 * or of a tile out of place, at one position of its level.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object[]} items - The level's prefix and stray nodes (the name's, or a compound branch's).
 * @param {number} index - The item's position in `items`.
 * @param {boolean} nested - Inside a compound branch (its locants and multiplier are part of the branch's prefix part).
 * @param {Piece[]} out - Receives the pieces.
 * @param {boolean} [classGroup] - A group of an ether's class name (R-5b2, rule 7): enclosed as a prefix by itself
 *   (isEnclosed()), never for its level (default false).
 * @param {boolean} [aminoLevel] - A group on an amino prefix's nitrogen (rule 12, R-6c2; enclosedAt(); default false).
 * @returns {void}
 */
function itemPieces(tiles, items, index, nested, out, classGroup = false, aminoLevel = false) {
  const item = items[index];
  if (item.type === 'stray') {
    strayPieces(tiles, item.tile, out);
    return;
  }
  const kinds = KINDS[nested ? 'prefix' : 'parent'];
  item.locants.forEach((i) => out.push(piece(tiles[i].text, i, kinds.locant, 'locant')));
  if (item.letter !== null) {
    out.push(piece(tiles[item.letter].text, item.letter, kinds.locant, 'locant')); // `o-dimetilbenceno`
  }
  if (item.multiplier !== null) {
    out.push(piece(tiles[item.multiplier].text, item.multiplier, kinds.multiplier, 'mult'));
  }
  if (item.substituent) {
    const enclosed = classGroup ? isEnclosed(tiles, item.substituent) : enclosedAt(tiles, items, index, aminoLevel);
    substituentPieces(tiles, item.substituent, enclosed, out);
  }
} // End of function itemPieces()

/**
 * The pieces of the alcohol suffix (R-5a2): its locants, its multiplier (the
 * final `a` elided before `ol`, rule 4: `tetrol`) and `ol`.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} suffix - A suffix node (parse.js).
 * @param {Piece[]} out - Receives the pieces.
 * @returns {void}
 */
function suffixPieces(tiles, suffix, out) {
  suffix.locants.forEach((index) => out.push(piece(tiles[index].text, index, 'locant', 'locant')));
  if (suffix.multiplier !== null) {
    out.push(piece(suffixMultiplierText(tiles, suffix), suffix.multiplier, 'multiplier', 'mult'));
  }
  out.push(piece(tiles[suffix.tile].text, suffix.tile, 'ending', 'word'));
}

/**
 * The pieces of the parent: the locants before its stem (old-style ones, or
 * the positions of `xileno`'s methyls) and a letter (`o-xileno`; out of place
 * before another stem), a multiplier out of place between them and the
 * stem, then its chain — or the `benceno` or `fenol` word (R-4b, R-5a2;
 * numbers before `benceno` are a BENZENE_BONDS error unless they are the
 * old-style locants of its suffix, kept as written), or a template word
 * (R-4c) —, then its suffix (R-5a2), before which the last ending loses its
 * `o` when the suffix starts with a vowel (rule 4: `propan-2-ol`, `bencenol`).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} parent - The parent node.
 * @param {Piece[]} out - Receives the pieces.
 * @returns {void}
 */
function parentPieces(tiles, parent, out) {
  parent.legacy.forEach((index) => out.push(piece(tiles[index].text, index, 'locant', 'locant')));
  if (parent.letter !== null) {
    out.push(piece(tiles[parent.letter].text, parent.letter, 'locant', 'locant')); // `o-xileno`
  }
  if (parent.legacyMultiplier !== null) {
    out.push(piece(tiles[parent.legacyMultiplier].text, parent.legacyMultiplier, 'multiplier', 'mult'));
  }
  const { suffix } = parent;
  const beforeVowel = suffixElides(tiles, suffix);
  if (parent.chain.type === 'classWord') {
    out.push(piece(tiles[parent.chain.tile].text, parent.chain.tile, KINDS.parent.ending, 'word')); // `éter` (R-5b2)
  } else if (parent.chain.type === 'benzene' || parent.chain.type === 'template') {
    const word = tiles[parent.chain.tile].text;
    // `1,2-dimetilbenceno`, `tolueno`, `fenol`; `bencenol`, `benceno-1,2-diol` (R-5a2).
    out.push(piece(beforeVowel ? word.slice(0, -1) : word, parent.chain.tile, KINDS.parent.stem, 'word'));
  } else {
    chainPieces(tiles, parent.chain, 'parent', out, beforeVowel);
  }
  if (suffix) {
    suffixPieces(tiles, suffix, out);
  }
} // End of function parentPieces()

/**
 * The automatic punctuation between two pieces (rules 1 and 5). Exported
 * for tokenize.js, which checks the punctuation it skips against it.
 *
 * @param {{role: string, italic?: boolean}|null} prev - The previous non-empty piece, or null at the start.
 * @param {{role: string, italic?: boolean}} next - The next piece.
 * @returns {string} '', ',' or '-'.
 */
export function separator(prev, next) {
  if (!prev || prev.role === 'space' || next.role === 'space') {
    return ''; // The space of a class name (R-5b2) is all there is between two of its words.
  }
  if (prev.role === 'locant') {
    return next.role === 'locant' ? ',' : '-';
  }
  if (next.role === 'locant') {
    return prev.role === 'open' ? '' : '-';
  }
  return prev.role === 'mult' && next.italic ? '-' : ''; // `di-tert-butil`
} // End of function separator()

/**
 * Joins pieces into the text and its spans, adding the automatic
 * punctuation. An empty opening control sits after the punctuation that
 * precedes the next piece, an empty closing control right after its branch.
 *
 * @param {Piece[]} pieces - The pieces in tile order.
 * @returns {{text: string, spans: {tile: number|null, from: number, to: number, kind: string, pending?: boolean}[]}} The result.
 */
function join(pieces) {
  let text = '';
  const spans = [];
  let prev = null;
  let deferred = [];
  /**
   * Appends a span for a piece at the end of the text.
   *
   * @param {Piece} p - The piece.
   * @returns {void}
   */
  const emit = (p) => {
    const span = { tile: p.tile, from: text.length, to: text.length + p.text.length, kind: p.kind };
    if (p.pending) {
      span.pending = true;
    }
    spans.push(span);
    text += p.text;
  };
  /**
   * Emits the deferred empty opening controls.
   *
   * @returns {void}
   */
  const flush = () => {
    deferred.forEach(emit);
    deferred = [];
  };
  for (const p of pieces) {
    if (p.text === '') {
      if (p.role === 'open') {
        deferred.push(p);
      } else {
        flush();
        emit(p);
      }
      continue;
    }
    const sep = separator(prev, p);
    if (sep) {
      emit(piece(sep, null, 'punct', 'word'));
    }
    flush();
    emit(p);
    prev = p;
  } // End of the loop over the pieces
  flush();
  return { text, spans };
} // End of function join()

/**
 * Assembles a syntax tree (parse.js) into the name text and its spans,
 * applying only the automatic rules of design.md §15.5.2. Incomplete and
 * wrong sequences assemble too: tiles out of place keep their plain text.
 *
 * @param {object} tree - The tree returned by parse().
 * @returns {{text: string, spans: {tile: number|null, from: number, to: number, kind: string, pending?: boolean}[]}} The text and its spans.
 */
export function assemble(tree) {
  const out = [];
  if (tree.suffixClass) {
    // `ácido` and its space (rule 9, R-5d1); the space only when something follows it.
    const { tile } = tree.suffixClass;
    out.push(piece(tree.tiles[tile].text, tile, KINDS.parent.ending, 'word'));
    if (tree.items.length > 0 || tree.parent || tree.trailing.length > 0) {
      out.push(spacePiece());
    }
  }
  const classWord = Boolean(tree.parent) && isClassName(tree);
  // `etil metil éter` (rule 7, R-5b2): spaced words; `etilmetilamina` (rule 13, R-6c3): one word.
  const spaced = classWord && !isAmineClassName(tree);
  tree.items.forEach((item, i) => {
    if (spaced && i > 0) {
      out.push(spacePiece());
    }
    itemPieces(tree.tiles, tree.items, i, false, out, classWord);
  });
  if (tree.parent) {
    if (spaced && tree.items.length > 0) {
      out.push(spacePiece());
    }
    parentPieces(tree.tiles, tree.parent, out);
  }
  if (tree.ester) {
    esterPieces(tree.tiles, tree.ester, out); // ` de metilo` (rule 10, R-6a1)
  }
  tree.trailing.forEach((stray) => strayPieces(tree.tiles, stray.tile, out));
  return join(out);
} // End of function assemble()

/**
 * The pieces of an ester's O-bound side (rule 10, R-6a1; render.js
 * esterAlkylParts(), assembleEster()): the automatic ` de ` (only when
 * something follows the parent), then each O-bound group (esterGroupsOf()),
 * the automatic ` y ` between two of them. A group's bare prefixes are the
 * prefixes of its chain, written as inside a compound branch (part kind
 * 'prefix', each enclosed as enclosedAt() says on their level:
 * `2-(4-metilfenil)etilo`); the group itself is a word of its own, never
 * enclosed alone (`2-cloroetilo`, `4-metilfenilo`, `propan-2-ilo`), and with
 * a multiplier enclosed as a prefix by itself is (isEnclosed():
 * `di(propan-2-ilo)`, `bis(2-cloroetilo)`, but `dimetilo`, `diisopropilo`,
 * `di-tert-butilo` with rule 5's hyphen), the student's multiplier kept as
 * chosen; its multiplier is a 'multiplier' part, as render.js gives it. Items
 * after the last group (an error) are written as they stand.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {{items: object[]}} side - The parse.js `ester` node.
 * @param {Piece[]} out - Receives the pieces.
 * @returns {void}
 */
function esterPieces(tiles, side, out) {
  if (side.items.length === 0) {
    return;
  }
  out.push(piece(ESTER_LINK, null, 'punct', 'space'));
  const { groups, rest } = esterGroupsOf(tiles, side.items);
  groups.forEach(({ items, end }, k) => {
    if (k > 0) {
      out.push(piece(ESTER_ALKYL_JOIN, null, 'punct', 'space')); // `etilo y metilo`
    }
    items.forEach((_, i) => itemPieces(tiles, items, i, true, out));
    end.locants.forEach((i) => out.push(piece(tiles[i].text, i, 'prefix', 'locant'))); // Out of place (parse.js), kept.
    if (end.letter !== null) {
      out.push(piece(tiles[end.letter].text, end.letter, 'prefix', 'locant'));
    }
    if (end.multiplier !== null) {
      out.push(piece(tiles[end.multiplier].text, end.multiplier, 'multiplier', 'mult'));
    }
    substituentPieces(tiles, end.substituent, end.multiplier !== null && isEnclosed(tiles, end.substituent), out);
  }); // End of the loop over the O-bound groups
  if (groups.length > 0 && rest.length > 0) {
    out.push(piece(ESTER_ALKYL_JOIN, null, 'punct', 'space'));
  }
  rest.forEach((_, i) => itemPieces(tiles, rest, i, true, out));
} // End of function esterPieces()

/**
 * Tells whether a tree is a functional-class name: an ether's (R-5b2), its
 * parent the class word `éter`, or an amine's (R-6c3), its parent the
 * `amina` tile read as the class word (isAmineClassName()).
 *
 * @param {object} tree - A parse() tree.
 * @returns {boolean} True for `etil metil éter`, `dietil éter`, `metilamina`…
 */
export function isClassName(tree) {
  return Boolean(tree.parent) && tree.parent.chain.type === 'classWord';
}

/**
 * Tells whether a tree is an amine's functional-class name (R-6c3:
 * `metilamina`, `dimetilamina`, `etildimetilamina`): its parent is the
 * `amina` tile read as the class word, right after the groups (parse.js
 * makeClassParent()).
 *
 * @param {object} tree - A parse() tree.
 * @returns {boolean} True for an amine's class name.
 */
export function isAmineClassName(tree) {
  return isClassName(tree) && isAmineClassWord(tree.tiles[tree.parent.chain.tile]);
}

/**
 * The automatic space between two words of an ether's class name (rule 7,
 * R-5b2), or after the class word `ácido` (rule 9, R-5d1).
 *
 * @returns {Piece} The piece.
 */
function spacePiece() {
  return piece(' ', null, 'punct', 'space');
}

/**
 * Text of one prefix (or tile out of place) of a tree as it reads on its
 * own, for messages: «2,3-dimetil», «5-(propan-2-il)» (never enclosed for
 * standing beside other prefixes).
 *
 * @param {object} tree - The tree returned by parse().
 * @param {object} item - One of its prefix or stray nodes.
 * @returns {string} The text.
 */
export function itemText(tree, item) {
  const out = [];
  itemPieces(tree.tiles, [item], 0, false, out);
  return join(out).text;
}
