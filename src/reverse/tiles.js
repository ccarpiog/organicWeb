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
 * ETHER_CLASS_WORD, RING_GROUP_SUFFIXES, BENZENE_GROUP_NAMES, FORMYL_PREFIX,
 * ACETYL_PREFIX, ACYL_ENDING, BENZOYL_PREFIX, RING_CARBONYL_ENDING,
 * SUFFIX_CLASS_WORDS, ESTER_ALKYL_ENDING),
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
 *   OH groups are the principal group; R-5c3a: the retained carbonyl names
 *   `formaldehído`, `acetaldehído`, `acetona`, `acetofenona`,
 *   `fenilacetaldehído`, `ftalaldehído`, `isoftalaldehído`,
 *   `tereftalaldehído`, whose C=O is the principal group — the first five on
 *   an open chain; R-5d2: the retained acid names `fórmico`, `acético`,
 *   `oxálico`, `fenilacético`, `ftálico`, `isoftálico`, `tereftálico`, written
 *   after the class word `ácido`, whose –COOH groups are the principal group
 *   — the first four on an open chain; R-6a2a: the retained ester names
 *   `formiato`, `acetato`, `fenilacetato`, the acid part of an ester, whose
 *   –COO– is the principal group, followed by the O-bound side as after
 *   `oato` — all three on an open chain; R-6b2: the retained nitrile names
 *   `acetonitrilo`, `fenilacetonitrilo`, `ftalonitrilo`, whose –C≡N groups
 *   are the principal group — the first two on an open chain; R-6c3: the
 *   retained amine names `anilina` and `bencilamina`, whose nitrogen is the
 *   principal group and takes `N` locants — the second on an open chain;
 *   value the TEMPLATES key),
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
 *   and the acyl prefixes (R-5c2: a C=O carbon X bonded to the carbon the
 *   prefix's locant gives, render.js acylEndingTokens() / ringCarbonylTokens()):
 *   'acyl' (an acyl ending written in a branch's free-valence place, after
 *   the branch's own ending — `oil`, value 'chain': the chain's carbon 1 is
 *   X, `prop ano oil` → `propanoil`, `but 2 eno oil` → `(but-2-enoil)`; and
 *   `carbonil`, value 'ring': X is a new carbon bonded to the ring's carbon
 *   1, `ciclo hex ano carbonil` → `(ciclohexanocarbonil)`, `ciclo hex 2 eno 1
 *   carbonil` → `(ciclohex-2-eno-1-carbonil)`; the lexicon's ACYL_ENDING and
 *   RING_CARBONYL_ENDING), `acetil` (kind 'retained', value 'acetyl': CH₃–CO–,
 *   the engine's retained word for the unsubstituted two-carbon acyl group;
 *   ACETYL_PREFIX) and in the «Anillos» row `benzoil` (kind 'retained', value
 *   'benzoyl': the benzene ring bonded to X, which like `fenil` takes
 *   prefixes of its own inside a compound branch, `(4-metilbenzoil)`;
 *   BENZOYL_PREFIX);
 *   and for the carboxylic acids (R-5d1): the suffixes `oico` (value 'acid':
 *   a –COOH at an end of a chain, terminal by rule like `al` — `ácido
 *   butanoico`, `ácido butanodioico`) and `carboxílico` (value 'carboxylic':
 *   a –COOH whose carbon is outside the parent, bonded to the carbon its
 *   locant gives — `ácido ciclohexanocarboxílico`, `ácido
 *   benceno-1,3-dicarboxílico`), kind 'suffix' (SUFFIX_GROUPS); `carboxi`
 *   (kind 'retained', value 'carboxy': the –COOH as a branch, one carbon with
 *   its =O and its OH bonded by that carbon — `(carboximetil)`; the lexicon's
 *   GROUP_PREFIXES.acid); 'suffixClass' (the class word `ácido`, value 'acid',
 *   the lexicon's SUFFIX_CLASS_WORDS key: the first word of an acid's name,
 *   before the whole substitutive name — `ácido 2-metilpropanoico` —, the
 *   space after it automatic); and in the «Anillos» row `benzoico` (kind
 *   'benzene', value 'benzoic': the benzene parent with its –COOH at carbon
 *   1, as `benzaldehído` with its –CHO — `ácido 4-metilbenzoico`;
 *   GROUP_WORD_PARENTS);
 *   and for the esters (R-6a1): the suffixes `oato` (value 'ester': a –COO–
 *   at an end of a chain, terminal by rule like `oico` — `etanoato de
 *   metilo`, `butanodioato de dimetilo`) and `carboxilato` (value
 *   'carboxylate': a –COO– whose carbon is outside the parent, bonded to the
 *   carbon its locant gives — `ciclohexanocarboxilato de etilo`), kind
 *   'suffix' (SUFFIX_GROUPS, `bridge`: the group's carbon also carries the
 *   bridge oxygen, single-bonded, to which the O-bound group is bonded);
 *   'esterAlkyl' (the ending `ilo`, value 1: written in a branch's
 *   free-valence place, in place of `il`, it makes that branch an ester's
 *   O-bound group, the word after the automatic ` de ` — `met ilo` →
 *   `metilo`, `prop ano 2 ilo` → `propan-2-ilo` —, and after a retained word
 *   that ends in `il` it takes that `il`'s place, as `oxi` does —
 *   `isopropil ilo` → `isopropilo`, `tert-butil ilo` → `tert-butilo`, `fenil
 *   ilo` → `fenilo`; the lexicon's FREE_VALENCE_SUFFIXES[1] and
 *   ESTER_ALKYL_ENDING); and in the «Anillos» row `benzoato` (kind
 *   'benzene', value 'benzoate': the benzene parent with its –COO– at carbon
 *   1, as `benzoico` with its –COOH — `4-metilbenzoato de etilo`;
 *   GROUP_WORD_PARENTS);
 *   and for the ester prefixes (R-6a2b) no new tile: they compose from the
 *   tiles above, as render.js writes them — an acyloxy prefix is an acyl
 *   branch closed by `oxi` (`acetil oxi` → `(acetiloxi)`, `prop ano oil oxi`
 *   → `(propanoiloxi)`, isAcyloxyHead()), and an alkoxycarbonyl prefix an
 *   alkoxy branch closed by `oxi` and then the `carbonil` tile (`met il oxi
 *   carbonil` → `(metoxicarbonil)`, `prop ano 2 il oxi carbonil` →
 *   `[(propan-2-iloxi)carbonil]`); in a compound branch both go before its
 *   END (`START 2 met il prop ano oil oxi END` → `[(2-metilpropanoil)oxi]`);
 *   and for the nitriles (R-6b1): the suffixes `nitrilo` (value 'nitrile':
 *   a –C≡N at an end of a chain, terminal by rule like `oico` — its carbon
 *   is the chain's end carbon, its nitrogen triple-bonded to it:
 *   `butanonitrilo`, `butanodinitrilo`) and `carbonitrilo` (value
 *   'carbonitrile': a –C≡N whose carbon is outside the parent, bonded to the
 *   carbon its locant gives — `ciclohexanocarbonitrilo`,
 *   `benceno-1,4-dicarbonitrilo`), kind 'suffix' (SUFFIX_GROUPS, `element`
 *   'N': the group's atom is a nitrogen, not an oxygen); `ciano` (kind
 *   'retained', value 'cyano': the –C≡N as a prefix, one carbon with its
 *   nitrogen bonded by that carbon, which is never a carbon of the chain it
 *   hangs from — `ácido 3-cianopropanoico`, `(cianometil)`; the lexicon's
 *   GROUP_PREFIXES.nitrile); and in the «Anillos» row `benzonitrilo` (kind
 *   'benzene', value 'benzonitrile': the benzene parent with its –C≡N at
 *   carbon 1, as `benzoico` with its –COOH — `4-metilbenzonitrilo`;
 *   GROUP_WORD_PARENTS);
 *   and for the amines (R-6c1): the suffix `amina` (kind 'suffix', value
 *   'amine': an amine's nitrogen single-bonded to the carbon its locant
 *   gives, as `ol` puts an OH — `etanamina`, `propan-2-amina`,
 *   `butano-1,4-diamina`, `bencen-1-amina`; SUFFIX_GROUPS `element` 'N'; the
 *   lexicon's GROUP_SUFFIXES.amine) and 'nitrogen' (the locant `N`, value
 *   N_VALUE, the forward engine's own value for it, structure.js N_LOCANT: a
 *   prefix bonded to the nitrogen of the principal amine, not to a carbon —
 *   `N-metiletanamina`, `N,N-dimetilmetanamina`, `N,2-dimetilpropan-1-amina`;
 *   its text N_TEXT, structure.js locantText(N_LOCANT)), in the «Números»
 *   row after the numbers; the `amina` tile is also the class word of an
 *   amine's functional-class name (R-6c3: right after the groups on the
 *   nitrogen, with no parent before it — `met il amina` → `metilamina`, `et
 *   il di met il amina` → `etildimetilamina`; isAmineClassWord()); and
 *   (R-6c2) `amino` (kind 'retained', value
 *   AMINO_KIND: an amine's nitrogen as a prefix, single-bonded to the carbon its
 *   locant gives — `2-aminoetan-1-ol`, `ácido 2-aminopropanoico`; the lexicon's
 *   GROUP_PREFIXES.amine), which like `fenil` may be the own chain of a
 *   compound branch whose prefixes are then the groups on its nitrogen,
 *   written without locants, every one after the first enclosed by the
 *   assembler as render.js writes them (`START met il amino END` →
 *   `(metilamino)`, `START di met il amino END` → `(dimetilamino)`, `START et
 *   il met il amino END` → `[etil(metil)amino]`; isAminoTile());
 * - `row` — the tile row of the dialog (design.md §15.2): 'numbers' (the
 *   locant `N` after them from R-6c1),
 *   'multipliers', 'roots', 'endings', 'branches', 'rings' («Anillos», with
 *   the letters o, m, p from R-4c, `fenol` and `1(n)` from R-5a2,
 *   `benzaldehído` from R-5c1, `benzoil` from R-5c2, `benzoico` from R-5d1,
 *   `benzoato` from R-6a1, `benzonitrilo` from R-6b1),
 *   'groups' («Grupos», R-5a1: the halogens; R-5a2: `hidroxi` and `ol`; R-5b:
 *   `oxi`, and `éter` from R-5b2; R-5c1: `oxo`, `formil`, `al`, `ona`,
 *   `carbaldehído`; R-5c2: `acetil`, `oil`, `carbonil`, after `formil`;
 *   R-5d1: `ácido`, `carboxi`, `oico`, `carboxílico`; R-6a1: `oato`,
 *   `carboxilato`, `ilo`; R-6b1: `ciano`, `nitrilo`, `carbonitrilo`; R-6c1:
 *   `amina`, at the end; R-6c2: `amino`, after it),
 *   'traditional' («Nombres tradicionales», R-4c: the templates; R-5a3a:
 *   the retained phenols; R-5b: `anisol`; R-5c3a: the retained carbonyl
 *   names, `formaldehído` … `tereftalaldehído`; R-5d2: the retained acid
 *   names, `fórmico` … `tereftálico`; R-6a2a: the retained ester names,
 *   `formiato`, `acetato`, `fenilacetato`; R-6b2: the retained nitrile
 *   names, `acetonitrilo`, `fenilacetonitrilo`, `ftalonitrilo`; R-6c3: the
 *   retained amine names, `anilina`, `bencilamina`);
 * - `more` — the tile sits behind the row's «más» button (numbers 13–30,
 *   multipliers from hepta / heptakis, roots from undec).
 */

import {
  MAX_STEM, stem, multiplier, compoundMultiplier, ENDINGS, FREE_VALENCE_SUFFIXES, RETAINED_PREFIXES, ENCLOSING_MARKS,
  RING_PREFIX, BENZENE_NAME, TRADITIONAL_NAMES, BENZENE_DIGROUP_NAMES, POSITIONAL_LETTERS, HALOGEN_PREFIXES, GROUP_PREFIXES,
  GROUP_SUFFIXES, PHENOL_STEM, ALKOXY_ENDING, ETHER_CLASS_WORD, RING_GROUP_SUFFIXES, BENZENE_GROUP_NAMES, FORMYL_PREFIX, groupName,
  ACETYL_PREFIX, ACYL_ENDING, BENZOYL_PREFIX, RING_CARBONYL_ENDING, SUFFIX_CLASS_WORDS, ESTER_ALKYL_ENDING,
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

/** Id of the `acetil` tile (design.md §15.8 R-5c; phase R-5c2: the retained acyl prefix of CH₃–CO–). */
export const ACETYL_ID = 'retained-acetyl';

/** Id of the `benzoil` tile (design.md §15.8 R-5c; phase R-5c2: the benzene ring bonded to a C=O carbon, as a branch). */
export const BENZOYL_ID = 'retained-benzoyl';

/** Id of the `oil` tile (design.md §15.8 R-5c; phase R-5c2: the acyl ending of a chain branch, `propanoil`). */
export const ACYL_ID = 'acyl-chain';

/** Id of the `carbonil` tile (design.md §15.8 R-5c; phase R-5c2: the acyl ending of a ring branch, `ciclohexanocarbonil`). */
export const RING_CARBONYL_ID = 'acyl-ring';

/** Id of the `ácido` tile (design.md §15.8 R-5d; phase R-5d1: the class word that starts an acid's name). */
export const ACID_WORD_ID = 'class-acid';

/** Id of the `oico` tile (design.md §15.8 R-5d; phase R-5d1: the acid suffix of a chain, `ácido butanoico`). */
export const OICO_ID = 'suffix-acid';

/** Id of the `carboxílico` tile (design.md §15.8 R-5d; phase R-5d1: the –COOH suffix whose carbon is outside the parent). */
export const CARBOXYLIC_ID = 'suffix-carboxylic';

/** Id of the `benzoico` tile (design.md §15.8 R-5d; phase R-5d1: the benzene parent with its –COOH at carbon 1). */
export const BENZOIC_ID = 'ring-benzoic';

/** Id of the `carboxi` tile (design.md §15.8 R-5d; phase R-5d1: a –COOH bonded by its carbon, as a branch). */
export const CARBOXY_ID = 'retained-carboxy';

/** Id of the `oato` tile (design.md §15.8 R-6a; phase R-6a1: the ester suffix of a chain, `etanoato de metilo`). */
export const OATO_ID = 'suffix-ester';

/** Id of the `carboxilato` tile (design.md §15.8 R-6a; phase R-6a1: the –COO– suffix whose carbon is outside the parent). */
export const CARBOXYLATE_ID = 'suffix-carboxylate';

/** Id of the `benzoato` tile (design.md §15.8 R-6a; phase R-6a1: the benzene parent with its –COO– at carbon 1). */
export const BENZOATE_ID = 'ring-benzoate';

/**
 * Id of the `ilo` tile (design.md §15.5.2 item 6, §15.8 R-6a; phase R-6a1:
 * the ending of an ester's O-bound group, written in place of `il`:
 * `metilo`, `propan-2-ilo`, `isopropilo`).
 */
export const ESTER_ALKYL_ID = 'ester-alkyl';

/** Id of the `nitrilo` tile (design.md §15.8 R-6b; phase R-6b1: the nitrile suffix of a chain, `butanonitrilo`). */
export const NITRILO_ID = 'suffix-nitrile';

/** Id of the `carbonitrilo` tile (design.md §15.8 R-6b; phase R-6b1: the –C≡N suffix whose carbon is outside the parent). */
export const CARBONITRILE_ID = 'suffix-carbonitrile';

/** Id of the `benzonitrilo` tile (design.md §15.8 R-6b; phase R-6b1: the benzene parent with its –C≡N at carbon 1). */
export const BENZONITRILE_ID = 'ring-benzonitrile';

/** Id of the `ciano` tile (design.md §15.8 R-6b; phase R-6b1: a –C≡N bonded by its carbon, as a prefix). */
export const CYANO_ID = 'retained-cyano';

/** Id of the `amina` tile (design.md §15.8 R-6c; phase R-6c1: the amine suffix, `etanamina`, `propan-2-amina`). */
export const AMINA_ID = 'suffix-amine';

/**
 * Id of the locant tile `N` (design.md §15.5.2 item 6, §15.8 R-6c; phase
 * R-6c1: a prefix on the nitrogen of the principal amine, `N-metiletanamina`).
 */
export const NITROGEN_ID = 'locant-nitrogen';

/**
 * The value of the locant `N` (R-6c1): the forward engine's own
 * (structure.js N_LOCANT, 0), below every carbon locant, so a mixed list
 * sorts as the engine cites it (`N,2-dimetil`, `N,N-dimetil`) and a slot
 * that may take it has the domain `[N_VALUE, n]` (interpret.js). Kept here,
 * with N_TEXT, because the tiles, the parser and the assembler import
 * nothing of the engine but the lexicon (design.md §15.4); the tests check
 * both against structure.js.
 */
export const N_VALUE = 0;

/** The text of the locant `N` (R-6c1), as structure.js locantText(N_LOCANT) writes it. */
export const N_TEXT = 'N';

/**
 * The retained acyl words (R-5c2), by tile value: `acetil`, a two-carbon
 * chain whose carbon 1 is the C=O carbon (build.js), and `benzoil`, the
 * benzene ring bonded to a C=O carbon outside it (interpret.js reads it as
 * an acyl phenyl). `formil` (R-5c1) is the one-carbon acyl word.
 */
export const ACYL_RETAINED = Object.freeze(['acetyl', 'benzoyl']);

/**
 * Tells whether a tile is an acyl word or ending of R-5c2: `oil`, `carbonil`
 * (kind 'acyl'), `acetil` or `benzoil` (ACYL_RETAINED) — the C=O carbon of
 * the branch is bonded to what it hangs from. `formil` (R-5c1), the –CHO,
 * keeps its own messages and is not one of them.
 *
 * @param {{kind: string, value: *}} tile - A catalogue tile.
 * @returns {boolean} True for an acyl tile of R-5c2.
 */
export function isAcylTile(tile) {
  return tile.kind === 'acyl' || (tile.kind === 'retained' && ACYL_RETAINED.includes(tile.value));
}

/**
 * Tells whether a tile ends a branch whose carbon bonded to what it hangs
 * from is a C=O carbon, so that `oxi` after it makes an ester's acyloxy
 * prefix (R-6a2b; render.js alkoxyTokens(): the acyl prefix + `oxi`,
 * `acetiloxi`, `formiloxi`, `propanoiloxi`, `benzoiloxi`,
 * `[(ciclohexanocarbonil)oxi]`): an acyl tile of R-5c2 (isAcylTile()) or
 * `formil` (R-5c1), the one-carbon acyl group. `carboxi` is not one: its
 * carbon also carries an OH, and with `oxi` it would make a carbonic acid's
 * ester.
 *
 * @param {{kind: string, value: *}} tile - A catalogue tile.
 * @returns {boolean} True for `oil`, `carbonil`, `acetil`, `benzoil` and `formil`.
 */
export function isAcyloxyHead(tile) {
  return isAcylTile(tile) || (tile.kind === 'retained' && tile.value === 'formyl');
}

/**
 * The principal groups of the suffix tiles, by tile value (R-5a2, R-5c1,
 * R-5d1): the group (`kind`, a lexicon GROUP_SUFFIXES key, as the engine's
 * SuffixStructure says it), whether its carbon is outside the parent
 * (`outside`: `carbaldehído`, `carboxílico`, a new carbon bonded to the
 * parent's carbon, the =O on it — render.js suffixWords() `outside`), the
 * order of the bond from the carbon to its oxygen (`order`: 1 for the OH, 2
 * for a C=O), whether it sits at a chain end by rule (`terminal`: `al`,
 * `oico`, render.js TERMINAL_SUFFIXES; never cited on a chain) and, for an
 * acid (R-5d1: `oico`, `carboxílico`), `hydroxy`: the carbon of the C=O also
 * carries an OH, single-bonded (the –COOH); for an ester (R-6a1: `oato`,
 * terminal like `oico`, and `carboxilato`, outside like `carboxílico`),
 * `bridge`: the carbon of the C=O also carries the bridge oxygen,
 * single-bonded, to which the O-bound group is bonded (the –COO–); for a
 * nitrile (R-6b1: `nitrilo`, terminal like `oico`, and `carbonitrilo`,
 * outside like `carboxílico`), `element` 'N': the group's atom is a
 * nitrogen, bonded by a triple bond (`order` 3) to its carbon (the –C≡N;
 * suffixElement()).
 */
export const SUFFIX_GROUPS = Object.freeze({
  alcohol: Object.freeze({ kind: 'alcohol', outside: false, order: 1, terminal: false }),
  aldehyde: Object.freeze({ kind: 'aldehyde', outside: false, order: 2, terminal: true }),
  ketone: Object.freeze({ kind: 'ketone', outside: false, order: 2, terminal: false }),
  carbaldehyde: Object.freeze({ kind: 'aldehyde', outside: true, order: 2, terminal: false }),
  acid: Object.freeze({ kind: 'acid', outside: false, order: 2, terminal: true, hydroxy: true }),
  carboxylic: Object.freeze({ kind: 'acid', outside: true, order: 2, terminal: false, hydroxy: true }),
  // R-6a1: the esters.
  ester: Object.freeze({ kind: 'ester', outside: false, order: 2, terminal: true, bridge: true }),
  carboxylate: Object.freeze({ kind: 'ester', outside: true, order: 2, terminal: false, bridge: true }),
  // R-6b1: the nitriles, their nitrogen triple-bonded to the group's carbon.
  nitrile: Object.freeze({ kind: 'nitrile', outside: false, order: 3, terminal: true, element: 'N' }),
  carbonitrile: Object.freeze({ kind: 'nitrile', outside: true, order: 3, terminal: false, element: 'N' }),
  // R-6c1: the amines, their nitrogen single-bonded to the parent's carbon as an alcohol's OH is.
  amine: Object.freeze({ kind: 'amine', outside: false, order: 1, terminal: false, element: 'N' }),
});

/** The element of the atom a suffix group bonds to its carbon when the SUFFIX_GROUPS entry names none: an oxygen. */
const SUFFIX_OXYGEN = 'O';

/**
 * The element of the atom a suffix group bonds to its carbon (build.js): the
 * oxygen of an OH, a C=O, a –COOH or a –COO–, or (R-6b1) the nitrogen of a
 * –C≡N (SUFFIX_GROUPS `element`).
 *
 * @param {{element?: string}} group - A SUFFIX_GROUPS entry.
 * @returns {string} The element symbol.
 */
export function suffixElement(group) {
  return group.element || SUFFIX_OXYGEN;
}

/**
 * The bond order a suffix group takes from the parent's carbon that carries
 * it (search.js, build.js): one for a group whose carbon is outside the
 * parent (`carbaldehído`, `carboxílico`, `carboxilato`, `carbonitrilo`: the
 * single bond to that carbon), else the bond to its oxygen — one for the OH,
 * two for a C=O — and one more for the OH of an acid's –COOH (R-5d1: `oico`,
 * three) or the bridge oxygen of an ester's –COO– (R-6a1: `oato`, three), or
 * the triple bond to the nitrogen of a nitrile's –C≡N (R-6b1: `nitrilo`,
 * three).
 *
 * @param {{outside: boolean, order: number, hydroxy?: boolean, bridge?: boolean}} group - A SUFFIX_GROUPS entry.
 * @returns {number} 1, 2 or 3.
 */
export function suffixBondAmount(group) {
  if (group.outside) {
    return 1;
  }
  return group.order + (group.hydroxy || group.bridge ? 1 : 0);
}

/** The principal group of an ester (a lexicon GROUP_SUFFIXES key; R-6a1). */
export const ESTER_KIND = 'ester';

/**
 * Tells whether a suffix tile value is an ester's (R-6a1: `oato`,
 * `carboxilato`), whose name ends with the O-bound groups after ` de `.
 *
 * @param {string} value - A SUFFIX_GROUPS key.
 * @returns {boolean} True for an ester suffix.
 */
export function isEsterSuffix(value) {
  return Boolean(SUFFIX_GROUPS[value]) && SUFFIX_GROUPS[value].kind === ESTER_KIND;
}

/** How the messages call the –COO– of an ester (R-6a1), as «grupo COOH» for an acid's. */
export const ESTER_GROUP = 'grupo COO';

/** The principal group of an acid (a lexicon GROUP_SUFFIXES and SUFFIX_CLASS_WORDS key; R-5d1). */
export const ACID_KIND = 'acid';

/**
 * Tells whether a suffix tile value is an acid's (R-5d1: `oico`,
 * `carboxílico`), whose name starts with the class word `ácido`.
 *
 * @param {string} value - A SUFFIX_GROUPS key.
 * @returns {boolean} True for an acid suffix.
 */
export function isAcidSuffix(value) {
  return Boolean(SUFFIX_GROUPS[value]) && SUFFIX_GROUPS[value].kind === ACID_KIND;
}

/** How the messages call the –COOH of an acid (R-5d1), as «grupo CHO» for an aldehyde's. */
export const ACID_GROUP = 'grupo COOH';

/** The principal group of a nitrile (a lexicon GROUP_SUFFIXES key; R-6b1). */
export const NITRILE_KIND = 'nitrile';

/**
 * Tells whether a suffix tile value is a nitrile's (R-6b1: `nitrilo`,
 * `carbonitrilo`).
 *
 * @param {string} value - A SUFFIX_GROUPS key.
 * @returns {boolean} True for a nitrile suffix.
 */
export function isNitrileSuffix(value) {
  return Boolean(SUFFIX_GROUPS[value]) && SUFFIX_GROUPS[value].kind === NITRILE_KIND;
}

/** How the messages call the –C≡N of a nitrile (R-6b1), as «grupo COOH» for an acid's. */
export const NITRILE_GROUP = 'grupo C≡N';

/** The principal group of an amine (a lexicon GROUP_SUFFIXES key; R-6c1). */
export const AMINE_KIND = 'amine';

/**
 * Tells whether a suffix tile value is an amine's (R-6c1: `amina`).
 *
 * @param {string} value - A SUFFIX_GROUPS key.
 * @returns {boolean} True for an amine suffix.
 */
export function isAmineSuffix(value) {
  return Boolean(SUFFIX_GROUPS[value]) && SUFFIX_GROUPS[value].kind === AMINE_KIND;
}

/**
 * The bonds a nitrogen holds (R-6c1), as model/elements.js VALENCES.N (the
 * tests check it): an amine's nitrogen takes one from its carbon, so two are
 * left for the groups written `N` (AMINE_NITROGEN_FREE).
 */
export const NITROGEN_VALENCE = 3;

/** The bonds an amine's nitrogen has besides the one to its carbon (R-6c1): two, its NH₂ hydrogens, for groups on `N`. */
export const AMINE_NITROGEN_FREE = NITROGEN_VALENCE - 1;

/** How the messages call the nitrogen of an amine (R-6c1), as «grupo C≡N» for a nitrile's group. */
export const AMINE_NITROGEN = 'nitrógeno de la amina';

/**
 * How the messages call the group an amine template's word places (R-6c3:
 * the NH₂ of `anilina` and `bencilamina`), as «grupo C≡N» for a nitrile
 * template's.
 */
export const AMINE_GROUP = 'grupo NH₂';

/**
 * Tells whether a tile is the class word of an amine's functional-class name
 * (R-6c3: `metilamina`, `dimetilamina`, `etildimetilamina`): the `amina` tile
 * itself, the suffix of R-6c1. One tile, two places (decision of phase
 * I-52c3): after a parent's ending it is the suffix (`etanamina`), right
 * after the groups of a class name — a complete prefix, with no parent
 * before it — the class word (parse.js makeClassParent()); the student
 * picks the same `amina` either way, as the engine writes the same word.
 *
 * @param {{kind: string, value: *}} tile - A catalogue tile.
 * @returns {boolean} True for `amina`.
 */
export function isAmineClassWord(tile) {
  return tile.kind === 'suffix' && tile.value === AMINE_KIND;
}

/**
 * The most groups the nitrogen of an amine's class name carries (R-6c3):
 * its three bonds (`trimetilamina`); a fourth group is build.js's VALENCE on
 * the nitrogen.
 */
export const AMINE_CLASS_GROUPS = NITROGEN_VALENCE;

/**
 * Id of the `amino` tile (design.md §15.8 R-6c; phase R-6c2: an amine's
 * nitrogen as a prefix, `2-aminoetan-1-ol`; with the groups on its nitrogen,
 * the own chain of a compound branch, `(metilamino)`).
 */
export const AMINO_ID = 'retained-amino';

/**
 * The `amino` tile's value (R-6c2), a retained word's, and the interpret.js
 * SubstituentSpec kind of an amino prefix (language-neutral, as the tile ids;
 * the word on the tile is the lexicon's GROUP_PREFIXES.amine).
 */
export const AMINO_KIND = 'aminoGroup';

/** The element of the atom an `amino` prefix adds (R-6c2): its nitrogen, single-bonded to its carbon (its hydrogens implicit). */
export const AMINO_ELEMENT = 'N';

/** How the messages call the nitrogen of an `amino` prefix (R-6c2), as AMINE_NITROGEN for a principal amine's. */
export const AMINO_NITROGEN = 'nitrógeno del grupo amino';

/**
 * Tells whether a tile is the `amino` word (R-6c2): a retained word whose
 * nitrogen may carry groups of its own, written before it inside a compound
 * branch (`(metilamino)`).
 *
 * @param {{kind: string, value: *}} tile - A catalogue tile.
 * @returns {boolean} True for `amino`.
 */
export function isAminoTile(tile) {
  return tile.kind === 'retained' && tile.value === AMINO_KIND;
}

/**
 * The whole-word benzene parents that place their principal group at
 * carbon 1 themselves, by tile value: `fenol` (R-5a2, its OH),
 * `benzaldehído` (R-5c1, its –CHO, whose carbon is outside the ring) and
 * `benzoico` (R-5d1, its –COOH, likewise; written after the class word
 * `ácido`) and `benzoato` (R-6a1, its –COO–, likewise; the O-bound group
 * after it) and `benzonitrilo` (R-6b1, its –C≡N, likewise):
 * `suffix` the SUFFIX_GROUPS key of that group, `group` how the messages
 * call it (the parser's and the builder's «grupo OH», «grupo CHO»).
 */
export const GROUP_WORD_PARENTS = Object.freeze({
  phenol: Object.freeze({ suffix: 'alcohol', group: 'grupo OH' }),
  benzaldehyde: Object.freeze({ suffix: 'carbaldehyde', group: 'grupo CHO' }),
  benzoic: Object.freeze({ suffix: 'carboxylic', group: ACID_GROUP }),
  benzoate: Object.freeze({ suffix: 'carboxylate', group: ESTER_GROUP }),
  benzonitrile: Object.freeze({ suffix: 'carbonitrile', group: NITRILE_GROUP }),
});

/**
 * The name of a whole-word parent as the messages quote it: its tile's text
 * (`fenol`, `benzaldehído`, `tolueno`), with the class word before it for a
 * parent that places an acid's –COOH (R-5d1: «ácido benzoico»; R-5d2: a
 * retained acid name, «ácido acético», «ácido ftálico»), as the engine
 * writes the name (GROUP_WORD_PARENTS, isAcidTemplate()); a retained ester
 * word (R-6a2a) as on its tile, «acetato».
 *
 * @param {{kind: string, value: *, text: string}} tile - A catalogue tile (`benceno`, `fenol`, `benzoico`, a template…).
 * @returns {string} The name.
 */
export function parentWordName(tile) {
  const placed = tile.kind === 'benzene' ? GROUP_WORD_PARENTS[tile.value] : null;
  const acid = (placed && isAcidSuffix(placed.suffix)) || (tile.kind === 'template' && isAcidTemplate(tile.value));
  return acid ? `${SUFFIX_CLASS_WORDS[ACID_KIND]} ${tile.text}` : tile.text;
}

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

/** Carbons of the benzene ring of a template (interpret.js BENZENE_LENGTH, which imports this module). */
const BENZENE_CARBONS = 6;

/**
 * The defining group of `acetofenona` and `fenilacetaldehído` (R-5c3a): a
 * benzene ring bonded by its carbon 1, the phenyl group.
 */
const PHENYL = Object.freeze({ phenyl: true });

/**
 * The principal group a carbonyl template places itself (R-5c3a; R-5d2: an
 * acid template's –COOH groups): its SUFFIX_GROUPS key and the carbons of
 * its parent that carry it.
 *
 * @param {string} value - A SUFFIX_GROUPS key ('aldehyde', 'ketone', 'carbaldehyde'; R-5d2: 'acid', 'carboxylic').
 * @param {number[]} positions - The parent's carbons.
 * @returns {Readonly<{value: string, positions: readonly number[]}>} The group.
 */
function placedSuffix(value, positions) {
  return Object.freeze({ value, positions: Object.freeze([...positions]) });
}

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
 * R-5c3a adds the retained carbonyl names the forward engine gives
 * (principal.js carbonylTraditionalId(), aromatic.js retainedDigroupIds()),
 * whose `suffix` is the principal group their word places (placedSuffix():
 * the SUFFIX_GROUPS key and the parent's carbons; templateSuffix()):
 * `formaldehído` (metanal), `acetaldehído` (etanal), `acetona` (propanona)
 * and, with a phenyl as their defining group (PHENYL), `acetofenona`
 * (1-feniletan-1-ona: the phenyl and the C=O on carbon 1) and
 * `fenilacetaldehído` (2-feniletanal: the phenyl on carbon 2) — templates
 * whose parent is an open chain of `chain` carbons, numbered as the
 * systematic name (the C=O or –CHO carbon first, `acetona`'s at 2), so the
 * student's prefixes are numbered on that chain —, and the ftalaldehídos
 * `ftalaldehído`, `isoftalaldehído`, `tereftalaldehído` (benzene with two
 * –CHO, `carbaldehyde`, at 1 and 2 / 3 / 4; keyed by their
 * BENZENE_DIGROUP_NAMES id). The engine writes `formaldehído`, `acetona`,
 * `acetofenona` and `fenilacetaldehído` for the bare molecules only; the
 * ftalaldehídos also with prefixes (`substitutable`: `4-metilftalaldehído`),
 * and `acetaldehído` with one substituted phenyl on its carbon 2
 * (`arylPrefix`: `2-(4-metilfenil)acetaldehído`); templateAdmits() says so.
 * R-5d2 adds the retained acid names the forward engine gives (principal.js
 * carbonylTraditionalId(), aromatic.js retainedDigroupIds()), written after
 * the class word `ácido` (their tile text without it, isAcidTemplate()),
 * whose `suffix` places the –COOH groups as the carbonyl templates place
 * their C=O: `fórmico` (ácido metanoico), `acético` (ácido etanoico),
 * `oxálico` (ácido etanodioico: a –COOH at each carbon of a chain of two) and,
 * with a phenyl on carbon 2, `fenilacético` (ácido 2-feniletanoico) — chain
 * templates, the –COOH's carbon at 1 —, and the ftálico family `ftálico`,
 * `isoftálico`, `tereftálico` (benzene with two –COOH, `carboxylic`, at 1 and
 * 2 / 3 / 4; keyed by their BENZENE_DIGROUP_NAMES id). As for the carbonyl
 * names, the engine writes `fórmico`, `oxálico` and `fenilacético` for the
 * bare molecules only, the ftálicos also with prefixes (`substitutable`:
 * `ácido 4-metilftálico`) and `acético` with one substituted phenyl on its
 * carbon 2 (`arylPrefix`: `ácido 2-(3-metilfenil)acético`).
 * R-6a2a adds the retained ester names the forward engine gives
 * (principal.js carbonylTraditionalId(): 'formate', 'acetate',
 * 'phenylacetate', 'arylacetate'; render.js renderName() `traditional`), the
 * acid part of an ester (isEsterTemplate()), whose `suffix` places the
 * –COO– at the chain's carbon 1 as `acético` places its –COOH, the O-bound
 * side following as after `oato` (`acetato de etilo`): `formiato` (a
 * metanoato), `acetato` (an etanoato) and, with a phenyl on carbon 2,
 * `fenilacetato` (a 2-feniletanoato) — chain templates, keyed by their
 * TRADITIONAL_NAMES id. The engine writes `formiato` and `fenilacetato` for
 * a bare acid part only, whatever its O-bound group, and `acetato` also with
 * one substituted phenyl on its carbon 2 (`arylPrefix`, 'arylacetate', the
 * same word: `2-(4-metilfenil)acetato de etilo`); no diester (an
 * `etanodioato` is no acetate) and no benzene diester (the engine refuses
 * them) has a retained name.
 * R-6b2 adds the retained nitrile names the forward engine gives
 * (principal.js carbonylTraditionalId(): 'acetonitrile', 'phenylacetonitrile',
 * 'arylacetonitrile'; aromatic.js retainedDigroupIds(): 'phthalonitrile'),
 * whose `suffix` places the –C≡N groups as `acético` places its –COOH:
 * `acetonitrilo` (etanonitrilo) and, with a phenyl on carbon 2,
 * `fenilacetonitrilo` (2-feniletanonitrilo) — chain templates, the –C≡N's
 * carbon the chain's carbon 1 (SUFFIX_GROUPS `nitrile`), keyed by their
 * TRADITIONAL_NAMES id —, and `ftalonitrilo` (benzene with two –C≡N,
 * `carbonitrile`, outside the ring at 1 and 2; keyed by its
 * BENZENE_DIGROUP_NAMES id). The engine writes `fenilacetonitrilo` for the
 * bare molecule only, `acetonitrilo` also with one substituted phenyl on its
 * carbon 2 (`arylPrefix`, 'arylacetonitrile', the same word:
 * `2-(4-metilfenil)acetonitrilo`) and `ftalonitrilo` also with prefixes
 * (`substitutable`: `4-metilftalonitrilo`); it writes no `isoftalonitrilo` or
 * `tereftalonitrilo` (aromatic.js: of the benzene dinitriles only the 1,2 one
 * has a retained name), so neither is a tile.
 * R-6c3 adds the retained amine names the forward engine gives (aromatic.js
 * traditionalNameId(): 'aniline'; principal.js carbonylTraditionalId():
 * 'benzylamine'), whose `suffix` places the amine's nitrogen as `fenol`
 * places its OH (SUFFIX_GROUPS `amine`, at carbon 1): `anilina` (bencenamina:
 * benzene with its NH₂ at carbon 1; keyed by its TRADITIONAL_NAMES id) and
 * `bencilamina` (fenilmetanamina: a chain of one carbon with the NH₂ and a
 * phenyl on it, as `acetofenona` holds its C=O and its phenyl on carbon 1).
 * The engine writes `anilina` with every prefix it names on the ring and on
 * the nitrogen (`substitutable`: `4-cloroanilina`, `N-metilanilina`,
 * `N,4-dimetilanilina`, `p-bromo-N,N-dimetilanilina`; never for a diamine,
 * which has no anilina), and `bencilamina` for the bare molecule only; both
 * take `N` locants on their nitrogen like an `amina` suffix (parse.js
 * checkNitrogen()). A later phase adds the amides' (`acetamida`…).
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
  formaldehyde: Object.freeze({
    id: 'formaldehyde', chain: 1, group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix('aldehyde', [1]),
  }),
  acetaldehyde: Object.freeze({
    id: 'acetaldehyde', chain: 2, group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix('aldehyde', [1]),
    arylPrefix: true,
  }),
  acetone: Object.freeze({
    id: 'acetone', chain: 3, group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix('ketone', [2]),
    feminine: true,
  }),
  acetophenone: Object.freeze({
    id: 'acetophenone', chain: 2, group: PHENYL, count: 1, positions: Object.freeze([1]), hydroxy: NONE,
    suffix: placedSuffix('ketone', [1]), feminine: true,
  }),
  phenylacetaldehyde: Object.freeze({
    id: 'phenylacetaldehyde', chain: 2, group: PHENYL, count: 1, positions: Object.freeze([2]), hydroxy: NONE,
    suffix: placedSuffix('aldehyde', [1]),
  }),
  phthalaldehyde: Object.freeze({
    group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix('carbaldehyde', [1, 2]), substitutable: true,
  }),
  isophthalaldehyde: Object.freeze({
    group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix('carbaldehyde', [1, 3]), substitutable: true,
  }),
  terephthalaldehyde: Object.freeze({
    group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix('carbaldehyde', [1, 4]), substitutable: true,
  }),
  // R-5d2: the retained acid names, after the class word `ácido`.
  formicAcid: Object.freeze({
    id: 'formicAcid', chain: 1, group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix(ACID_KIND, [1]),
  }),
  aceticAcid: Object.freeze({
    id: 'aceticAcid', chain: 2, group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix(ACID_KIND, [1]),
    arylPrefix: true,
  }),
  oxalicAcid: Object.freeze({
    id: 'oxalicAcid', chain: 2, group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix(ACID_KIND, [1, 2]),
  }),
  phenylaceticAcid: Object.freeze({
    id: 'phenylaceticAcid', chain: 2, group: PHENYL, count: 1, positions: Object.freeze([2]), hydroxy: NONE,
    suffix: placedSuffix(ACID_KIND, [1]),
  }),
  phthalicAcid: Object.freeze({
    group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix('carboxylic', [1, 2]), substitutable: true,
  }),
  isophthalicAcid: Object.freeze({
    group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix('carboxylic', [1, 3]), substitutable: true,
  }),
  terephthalicAcid: Object.freeze({
    group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix('carboxylic', [1, 4]), substitutable: true,
  }),
  // R-6a2a: the retained ester names, the acid part of an ester; the O-bound side follows.
  formate: Object.freeze({
    id: 'formate', chain: 1, group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix(ESTER_KIND, [1]),
  }),
  acetate: Object.freeze({
    id: 'acetate', chain: 2, group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix(ESTER_KIND, [1]),
    arylPrefix: true,
  }),
  phenylacetate: Object.freeze({
    id: 'phenylacetate', chain: 2, group: PHENYL, count: 1, positions: Object.freeze([2]), hydroxy: NONE,
    suffix: placedSuffix(ESTER_KIND, [1]),
  }),
  // R-6b2: the retained nitrile names; the –C≡N's carbon is the chain's carbon 1, or outside the ring.
  acetonitrile: Object.freeze({
    id: 'acetonitrile', chain: 2, group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix(NITRILE_KIND, [1]),
    arylPrefix: true,
  }),
  phenylacetonitrile: Object.freeze({
    id: 'phenylacetonitrile', chain: 2, group: PHENYL, count: 1, positions: Object.freeze([2]), hydroxy: NONE,
    suffix: placedSuffix(NITRILE_KIND, [1]),
  }),
  phthalonitrile: Object.freeze({
    group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix('carbonitrile', [1, 2]), substitutable: true,
  }),
  // R-6c3: the retained amine names; the NH₂ at carbon 1 of the ring, or of the one-carbon chain with its phenyl.
  aniline: Object.freeze({
    id: 'aniline', group: null, count: 0, positions: NONE, hydroxy: NONE, suffix: placedSuffix(AMINE_KIND, [1]), substitutable: true,
    feminine: true,
  }),
  benzylamine: Object.freeze({
    id: 'benzylamine', chain: 1, group: PHENYL, count: 1, positions: Object.freeze([1]), hydroxy: NONE,
    suffix: placedSuffix(AMINE_KIND, [1]), feminine: true,
  }),
});

/**
 * Tells whether a template is one of the retained carbonyl names (R-5c3a:
 * `formaldehído`, `acetaldehído`, `acetona`, `acetofenona`,
 * `fenilacetaldehído`, the ftalaldehídos): its word places an aldehyde's or
 * a ketone's C=O (not an acid's –COOH: isAcidTemplate(); nor an ester's
 * –COO–, R-6a2a: isEsterTemplate(); nor a nitrile's –C≡N, R-6b2:
 * isNitrileTemplate(); nor an amine's nitrogen, R-6c3: isAmineTemplate()).
 *
 * @param {string} value - A TEMPLATES key.
 * @returns {boolean} True for a carbonyl template.
 */
export function isCarbonylTemplate(value) {
  const { suffix } = TEMPLATES[value];
  return Boolean(suffix) && !isAcidSuffix(suffix.value) && !isEsterSuffix(suffix.value) && !isNitrileSuffix(suffix.value)
    && !isAmineSuffix(suffix.value);
}

/**
 * Tells whether a template is one of the retained amine names (R-6c3:
 * `anilina`, `bencilamina`): its word places an amine's nitrogen at carbon 1,
 * which takes the student's `N` locants (`N-metilanilina`).
 *
 * @param {string} value - A TEMPLATES key.
 * @returns {boolean} True for an amine template.
 */
export function isAmineTemplate(value) {
  const { suffix } = TEMPLATES[value];
  return Boolean(suffix) && isAmineSuffix(suffix.value);
}

/**
 * Tells whether a template is one of the retained nitrile names (R-6b2:
 * `acetonitrilo`, `fenilacetonitrilo`, `ftalonitrilo`): its word places one
 * or two –C≡N groups, `acetonitrilo`'s carbon 1 the –C≡N's carbon,
 * `ftalonitrilo`'s outside the ring.
 *
 * @param {string} value - A TEMPLATES key.
 * @returns {boolean} True for a nitrile template.
 */
export function isNitrileTemplate(value) {
  const { suffix } = TEMPLATES[value];
  return Boolean(suffix) && isNitrileSuffix(suffix.value);
}

/**
 * Tells whether a template is one of the retained ester names (R-6a2a:
 * `formiato`, `acetato`, `fenilacetato`): its word is the acid part of an
 * ester and places its –COO– at carbon 1, and the O-bound side follows it
 * after the automatic ` de ` (`acetato de etilo`).
 *
 * @param {string} value - A TEMPLATES key.
 * @returns {boolean} True for an ester template.
 */
export function isEsterTemplate(value) {
  const { suffix } = TEMPLATES[value];
  return Boolean(suffix) && isEsterSuffix(suffix.value);
}

/**
 * Tells whether a template is one of the retained acid names (R-5d2:
 * `fórmico`, `acético`, `oxálico`, `fenilacético`, the ftálico family): its
 * word places one or two –COOH groups, and the name starts with the class
 * word `ácido` (`ácido acético`, `ácido 4-metilftálico`).
 *
 * @param {string} value - A TEMPLATES key.
 * @returns {boolean} True for an acid template.
 */
export function isAcidTemplate(value) {
  const { suffix } = TEMPLATES[value];
  return Boolean(suffix) && isAcidSuffix(suffix.value);
}

/**
 * The retained ester word of each retained acid that has one (R-6a2a), by
 * TEMPLATES key: the engine's `formiato`, `acetato` and `fenilacetato` are
 * the esters of `ácido fórmico`, `ácido acético` and `ácido fenilacético`
 * (principal.js carbonylTraditionalId(): 'formate', 'acetate',
 * 'phenylacetate'), so a parse message can send a student who writes the
 * acid's name before an O-bound group to the ester's word.
 */
export const ACID_ESTER_TEMPLATES = Object.freeze({ formicAcid: 'formate', aceticAcid: 'acetate', phenylaceticAcid: 'phenylacetate' });

/**
 * Tells whether a template's parent is an open chain (R-5c3a: `formaldehído`
 * one carbon, `acetaldehído`, `acetofenona` and `fenilacetaldehído` two,
 * `acetona` three; R-5d2: `fórmico` one, `acético`, `oxálico` and
 * `fenilacético` two; R-6a2a: `formiato` one, `acetato` and `fenilacetato`
 * two; R-6b2: `acetonitrilo` and `fenilacetonitrilo` two; R-6c3:
 * `bencilamina` one), not the benzene ring.
 *
 * @param {string} value - A TEMPLATES key.
 * @returns {boolean} True for a chain template.
 */
export function isChainTemplate(value) {
  return Boolean(TEMPLATES[value].chain);
}

/**
 * The carbons of a template's parent: its chain's (R-5c3a), else the six of
 * the benzene ring.
 *
 * @param {string} value - A TEMPLATES key.
 * @returns {number} The carbons.
 */
export function templateLength(value) {
  return TEMPLATES[value].chain || BENZENE_CARBONS;
}

/**
 * The principal group a template's word places itself, as a suffix group:
 * the OH groups of a retained phenol (R-5a3a: SUFFIX_GROUPS 'alcohol' at its
 * `hydroxy` carbons), the C=O of a carbonyl template (R-5c3a: `acetona`'s
 * ketone at 2, the two –CHO of `ftalaldehído` at 1 and 2) or the –COOH
 * groups of an acid template (R-5d2: `acético`'s at 1, `oxálico`'s at 1 and
 * 2, the two of `ftálico` outside the ring at 1 and 2) or the –COO– of an
 * ester template (R-6a2a: `acetato`'s at 1) or the –C≡N groups of a nitrile
 * template (R-6b2: `acetonitrilo`'s at 1, the two of `ftalonitrilo` outside
 * the ring at 1 and 2) or the nitrogen of an amine template (R-6c3:
 * `anilina`'s and `bencilamina`'s at 1); null for a template without one
 * (`tolueno`, `anisol`…).
 *
 * @param {string} value - A TEMPLATES key.
 * @returns {{value: string, positions: readonly number[]}|null} The SUFFIX_GROUPS key and the parent's carbons, or null.
 */
export function templateSuffix(value) {
  const template = TEMPLATES[value];
  if (template.suffix) {
    return template.suffix;
  }
  return template.hydroxy.length > 0 ? { value: 'alcohol', positions: template.hydroxy } : null;
}

/**
 * Tells whether the forward engine writes a template with prefixes, so that
 * a student's prefixes on it are no SUBSTITUTED_TEMPLATE mistake (R-5c3a):
 * the ftalaldehídos with any prefixes (aromatic.js retainedDigroupIds():
 * `4-metilftalaldehído`), and `acetaldehído` with one phenyl branch, with
 * prefixes of its own on its carbon 2 (principal.js carbonylTraditionalId()
 * 'arylacetaldehyde': `2-(4-metilfenil)acetaldehído`) or bare (the one word
 * `fenilacetaldehído`, 'phenylacetaldehyde'), wherever the student puts it;
 * likewise (R-5d2) the ftálicos (`ácido 4-metilftálico`) and `acético`
 * ('arylaceticAcid': `ácido 2-(3-metilfenil)acético`; bare, the one word
 * `fenilacético`), and (R-6a2a) `acetato` ('arylacetate': `2-(4-metilfenil)acetato
 * de etilo`; bare, the one word `fenilacetato`), and (R-6b2) `ftalonitrilo`
 * (`4-metilftalonitrilo`) and `acetonitrilo` ('arylacetonitrile':
 * `2-(4-metilfenil)acetonitrilo`; bare, the one word `fenilacetonitrilo`), and
 * (R-6c3) `anilina` with any prefixes, on the ring or on its nitrogen
 * (`4-cloroanilina`, `N,4-dimetilanilina`; `bencilamina` none). The
 * student's prefixes are given as interpret.js PrefixSpecs.
 *
 * @param {string} value - A TEMPLATES key.
 * @param {{slots: object[], substituent: {kind: string, retained: string|null, alkoxy: boolean, acyl: boolean,
 *   prefixes: object[]}}[]} prefixes - The student's prefixes.
 * @returns {boolean} True when the engine admits them.
 */
export function templateAdmits(value, prefixes) {
  const template = TEMPLATES[value];
  if (template.substitutable) {
    return true;
  }
  if (!template.arylPrefix || prefixes.length !== 1 || prefixes[0].slots.length !== 1) {
    return false;
  }
  const sub = prefixes[0].substituent;
  return sub.kind === 'phenyl' && sub.retained === 'phenyl' && !sub.alkoxy && !sub.acyl;
} // End of function templateAdmits()

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
 * the group is called by its prefix, never `metoxilo`); `fenilo` for the
 * phenyl of `acetofenona` and `fenilacetaldehído` (R-5c3a); null for a
 * template without a carbon group (the diols of R-5a3a, the other carbonyl
 * templates).
 *
 * @param {string} value - A TEMPLATES key.
 * @returns {string|null} The group's name.
 */
export function templateGroupWord(value) {
  const { group } = TEMPLATES[value];
  if (!group) {
    return null;
  }
  if (group.phenyl) {
    return groupName(RETAINED_PREFIXES.phenyl.text); // `fenilo`: the ring of `acetofenona`, `fenilacetaldehído` (R-5c3a).
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
 * R-5a3a, a ftalaldehído of R-5c3a, a ftálico of R-5d2 or `ftalonitrilo` of
 * R-6b2, its BENZENE_DIGROUP_NAMES word, keyed by the template's own key),
 * without the locants or letter the student writes on tiles of their own
 * (`1,2-xileno` → `xileno`, `o-cresol` → `cresol`) and without the class
 * word `ácido`, a tile of its own (R-5d2: `ácido acético` → `acético`).
 *
 * @param {string} value - A TEMPLATES key.
 * @returns {string} The word.
 */
function templateWord(value) {
  const template = TEMPLATES[value];
  const name = template.id ? TRADITIONAL_NAMES[template.id] : BENZENE_DIGROUP_NAMES[value];
  const lead = `${SUFFIX_CLASS_WORDS[ACID_KIND]} `;
  if (name.startsWith(lead)) {
    return name.slice(lead.length); // `ácido fórmico` → `fórmico` (R-5d2)
  }
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
 * `benceno`, `fenol`, `benzaldehído`, `benzoico`, `fenil`, `benzoil`, the
 * letters `o`, `m`, `p`, `1(n)`), groups (the halogens `fluoro`, `cloro`,
 * `bromo`, `yodo`, then `hidroxi`, `ol`, `oxi`, `éter`, `oxo`, `formil`,
 * `acetil`, `oil`, `carbonil`, `al`, `ona`, `carbaldehído`, then the acids'
 * `ácido`, `carboxi`, `oico` and `carboxílico`), traditional names (`tolueno`, `estireno`, `xileno`, `mesitileno`,
 * `anisol`, then the retained phenols `cresol`, `pirocatecol`, `catecol`,
 * `resorcinol`, `hidroquinona`, then the retained carbonyl names
 * `formaldehído`, `acetaldehído`, `acetona`, `acetofenona`,
 * `fenilacetaldehído`, `ftalaldehído`, `isoftalaldehído`, `tereftalaldehído`,
 * then the retained acid names `fórmico`, `acético`, `oxálico`,
 * `fenilacético`, `ftálico`, `isoftálico`, `tereftálico`, then the retained
 * ester names `formiato`, `acetato`, `fenilacetato`, R-6a2a, then the
 * retained nitrile names `acetonitrilo`, `fenilacetonitrilo`, `ftalonitrilo`,
 * R-6b2, then the retained amine names `anilina`, `bencilamina`, R-6c3); R-6a1 adds
 * `benzoato` to the rings, after `benzoico`, and `oato`, `carboxilato` and
 * `ilo` to the groups, at their end; R-6b1 `benzonitrilo` to the rings,
 * after `benzoato`, and `ciano`, `nitrilo` and `carbonitrilo` to the groups,
 * at their end; R-6c1 the locant `N` after the numbers and `amina` to the
 * groups, at their end; R-6c2 `amino` after `amina`.
 *
 * @returns {Readonly<object>[]} The tiles.
 */
function buildCatalogue() {
  const tiles = [];
  for (let n = 1; n <= MAX_NUM; n += 1) {
    tiles.push(makeTile(`num-${n}`, 'num', n, 'numbers', String(n), n > NUM_VISIBLE));
  }
  // R-6c1: the locant `N`, a prefix on the principal amine's nitrogen; shown with the numbers 1–12.
  tiles.push(makeTile(NITROGEN_ID, 'nitrogen', N_VALUE, 'numbers', N_TEXT));
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
  const benzoic = BENZENE_GROUP_NAMES.acid;
  tiles.push(makeTile(BENZOIC_ID, 'benzene', 'benzoic', 'rings', `${benzoic.stem}${benzoic.ending}`)); // `benzoico` (R-5d1)
  const benzoate = BENZENE_GROUP_NAMES[ESTER_KIND];
  tiles.push(makeTile(BENZOATE_ID, 'benzene', 'benzoate', 'rings', `${benzoate.stem}${benzoate.ending}`)); // `benzoato` (R-6a1)
  const benzonitrile = BENZENE_GROUP_NAMES[NITRILE_KIND];
  tiles.push(makeTile(BENZONITRILE_ID, 'benzene', 'benzonitrile', 'rings', `${benzonitrile.stem}${benzonitrile.ending}`)); // R-6b1
  const phenyl = RETAINED_PREFIXES.phenyl;
  tiles.push(makeTile(PHENYL_ID, 'retained', 'phenyl', 'rings', `${phenyl.italic}${phenyl.text}`, false, { italic: phenyl.italic }));
  tiles.push(makeTile(BENZOYL_ID, 'retained', 'benzoyl', 'rings', BENZOYL_PREFIX, false, { italic: '' })); // `benzoil` (R-5c2)
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
  tiles.push(makeTile(ACETYL_ID, 'retained', 'acetyl', 'groups', ACETYL_PREFIX, false, { italic: '' })); // `acetil` (R-5c2)
  tiles.push(makeTile(ACYL_ID, 'acyl', 'chain', 'groups', ACYL_ENDING)); // `oil` (R-5c2)
  tiles.push(makeTile(RING_CARBONYL_ID, 'acyl', 'ring', 'groups', RING_CARBONYL_ENDING)); // `carbonil` (R-5c2)
  tiles.push(makeTile(AL_ID, 'suffix', 'aldehyde', 'groups', GROUP_SUFFIXES.aldehyde)); // `al` (R-5c1)
  tiles.push(makeTile(ONA_ID, 'suffix', 'ketone', 'groups', GROUP_SUFFIXES.ketone)); // `ona` (R-5c1)
  tiles.push(makeTile(CARBALDEHYDE_ID, 'suffix', 'carbaldehyde', 'groups', RING_GROUP_SUFFIXES.aldehyde)); // R-5c1
  tiles.push(makeTile(ACID_WORD_ID, 'suffixClass', ACID_KIND, 'groups', SUFFIX_CLASS_WORDS[ACID_KIND])); // `ácido` (R-5d1)
  tiles.push(makeTile(CARBOXY_ID, 'retained', 'carboxy', 'groups', GROUP_PREFIXES[ACID_KIND], false, { italic: '' })); // `carboxi`
  tiles.push(makeTile(OICO_ID, 'suffix', ACID_KIND, 'groups', GROUP_SUFFIXES[ACID_KIND])); // `oico` (R-5d1)
  tiles.push(makeTile(CARBOXYLIC_ID, 'suffix', 'carboxylic', 'groups', RING_GROUP_SUFFIXES[ACID_KIND])); // `carboxílico` (R-5d1)
  tiles.push(makeTile(OATO_ID, 'suffix', ESTER_KIND, 'groups', GROUP_SUFFIXES[ESTER_KIND])); // `oato` (R-6a1)
  tiles.push(makeTile(CARBOXYLATE_ID, 'suffix', 'carboxylate', 'groups', RING_GROUP_SUFFIXES[ESTER_KIND])); // `carboxilato` (R-6a1)
  // `ilo` (R-6a1): `il` + the ester's `o`, the ending of an O-bound group (value 1: its single bond to the bridge oxygen).
  tiles.push(makeTile(ESTER_ALKYL_ID, 'esterAlkyl', 1, 'groups', `${FREE_VALENCE_SUFFIXES[1]}${ESTER_ALKYL_ENDING}`));
  // R-6b1: the nitriles' prefix `ciano` (a retained word, as `carboxi`) and their suffixes `nitrilo` and `carbonitrilo`.
  tiles.push(makeTile(CYANO_ID, 'retained', 'cyano', 'groups', GROUP_PREFIXES[NITRILE_KIND], false, { italic: '' }));
  tiles.push(makeTile(NITRILO_ID, 'suffix', NITRILE_KIND, 'groups', GROUP_SUFFIXES[NITRILE_KIND]));
  tiles.push(makeTile(CARBONITRILE_ID, 'suffix', 'carbonitrile', 'groups', RING_GROUP_SUFFIXES[NITRILE_KIND]));
  tiles.push(makeTile(AMINA_ID, 'suffix', AMINE_KIND, 'groups', GROUP_SUFFIXES[AMINE_KIND])); // `amina` (R-6c1)
  // `amino` (R-6c2): a retained word, as `ciano`; with the groups on its nitrogen, a compound branch's own chain, as `fenil`.
  tiles.push(makeTile(AMINO_ID, 'retained', AMINO_KIND, 'groups', GROUP_PREFIXES[AMINE_KIND], false, { italic: '' }));
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
