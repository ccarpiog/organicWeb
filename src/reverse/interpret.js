/**
 * @file Interpreter of «¿Cómo se dibuja?» (design.md §15.4, §15.5.3; phases
 * R-1b, R-4a, R-4b, R-4c, R-5a1, R-5a2, R-5a3a, R-5b, R-5b2, R-5c1, R-5c2, R-5c3a, R-5d1, R-6a1, R-6a2a, R-6a2b, R-6b1, R-6b2, R-6c1, R-6c2, R-6c3, R-6d1, R-6d2, R-6d3, I-54b): turns the lossless syntax tree of parse.js into a
 * `NameSpec`, the language-neutral reading of the name — which chain or
 * ring, which multiple bonds, which branches on which carbons — with no atom
 * ids and no chemistry checks (ranges, valence and size are build.js's).
 * Pure, no DOM.
 *
 * Every locant position of the name is a **slot** typed by how the student
 * gave it (design.md §15.5.3 step 2):
 *
 * - `supplied` — written by the student (a number tile; the closing-bond
 *   locant `1(n)` of a ring, R-5a2, is the ring's bond n, the one from
 *   carbon n to carbon 1, with `closing` n), also the
 *   old-style locants written before the root (`2-buteno`, `2-propanol`),
 *   which belong to the one segment or suffix without locants of their own
 *   (parse.js `legacySegment`, `legacySuffix`); the name is then marked
 *   `oldStyle`; and the positions
 *   an orto/meta/para letter stands for (R-4c: `o-dimetilbenceno` 1 and 2,
 *   `p-metiltolueno` 4, `o-xileno` 1 and 2; I-54b: `m-cloroetilbenceno`, the
 *   first prefix 1 and the second 3, parse.js pairLetter()), each slot of the
 *   letter's tile with `letter` set;
 * - `implicit` — given by rule: `il` / `iliden` without a locant puts the
 *   free valence at the branch's carbon 1 (on a ring branch too:
 *   `ciclohexil`, `ciclohexiliden`), and so does `fenil` (R-4b); a retained
 *   template's groups are at the carbons it says (R-4c: `tolueno` 1,
 *   `mesitileno` 1, 3 and 5), and the OH of `fenol` at carbon 1 (R-5a2), the
 *   OH groups of a retained phenol where its word says (R-5a3a: `catecol` 1
 *   and 2, `cresol` 1);
 * - `leftOut` — not written: a prefix, a segment or a suffix without its
 *   locants (`etanol`, `ciclohexanol`, `propanol`, R-5a2).
 *   build.js needs a value for each, the *placement*, which search.js
 *   searches (R-1c).
 *
 * Each slot carries the tile range it comes from (`[from, to)`, as the
 * parser's ranges: the number tile of a supplied locant, the `il` / `iliden`
 * tile of an implicit one, the prefix or segment that lacks its locants for
 * a left-out one), its role (`carbon` for a prefix's or a free valence's
 * position, `phenylCarbon` for a prefix's position on a `fenil` branch,
 * `bond` for a multiple bond of a chain, numbered by its lower carbon,
 * `ringBond` for a multiple bond of a ring, bond n joining carbons n and 1)
 * and the domain of that role on its chain or ring, `[min, max]` inclusive,
 * from search.js slotDomain(): carbons 1…n, the carbons 2…6 of a phenyl
 * (its carbon 1 is bonded to what it hangs from), chain bonds 1…n−1 (empty
 * on a one-carbon chain), ring bonds 1…n.
 *
 * A ring (the `ciclo` tile, R-4a) is read like a chain of its carbons with
 * one more bond: the parent's `kind` and a branch's `kind` are 'ring'. The
 * benzene ring (R-4b) is six carbons whose double bonds are never numbered
 * (build.js draws them): `benceno` is a parent of kind 'benzene', `fenil` a
 * branch of kind 'phenyl', bonded by its carbon 1 by rule, whose own
 * prefixes (`(4-metilfenil)`) are numbered on it.
 *
 * A halogen (R-5a1: `fluoro`, `cloro`, `bromo`, `yodo`) is a branch of kind
 * 'halogen': one atom of its `element`, bonded by a single bond to the
 * carbon its prefix's slot gives, with no chain, free-valence slot or
 * prefixes of its own; its carbon slots are those of any prefix (a prefix's
 * role, `carbon` or `phenylCarbon`), so its left-out locants are searched
 * like a branch's.
 *
 * `hidroxi` (R-5a2) is such a one-atom branch too, kind 'hydroxy', its atom
 * an oxygen (tiles.js HYDROXY_ELEMENT; its hydrogen implicit).
 *
 * An alkoxy prefix (R-5b: a branch closed by the `oxi` tile — `metoxi`,
 * `isopropoxi`, `fenoxi`, `(pentiloxi)`, `(2-metilpropoxi)`) is the
 * SubstituentSpec of its branch with `alkoxy` set, as the forward engine's
 * substituent structure is its alkyl group's with `alkoxy` (substituent.js
 * alkoxySubstituent()): the branch's chain, free valence and own prefixes
 * are read as for any branch, and build.js puts an ether oxygen between the
 * branch's free-valence carbon and the carbon the prefix's slot gives, so
 * the prefix's slots are carbon slots of what it hangs from and the
 * branch's own slots are those of its chain, searched alike. `anisol`
 * (R-5b) is a template whose one group is such a methoxy group, at carbon 1.
 *
 * The alcohol suffix (R-5a2: `ol`, after a chain, a `ciclo` ring or
 * `benceno`) is the name's `suffix`: one carbon slot per OH on the parent
 * (role `carbon`, the parent's carbons 1…n, as a prefix's; design.md
 * §15.5.3 step 2), its multiplier, the `ol` tile. `fenol` is the benzene
 * parent with that suffix already placed: one implicit slot at carbon 1 on
 * the `fenol` tile (`phenol` set), so the student's prefixes are numbered
 * from it (`4-metilfenol`) and an orto/meta/para letter counts it
 * (`p-metilfenol`: the methyl at 4).
 *
 * A retained template (R-4c, tiles.js TEMPLATES: `tolueno`, `estireno`,
 * `xileno`, `mesitileno`) is a benzene parent too, kind 'benzene', whose
 * `template` holds its own groups as PrefixSpecs (a methyl, the ethenyl of
 * `estireno`) at the carbons it places them — `xileno`'s two methyls where
 * the student says, `1,2-xileno` / `o-xileno`, or left out — so build.js and
 * search.js treat them like the student's prefixes on the ring, and the
 * student's prefixes are numbered on the same ring (`4-metiltolueno`: a
 * methyl at 1, by the template, and one at 4). The template is kept apart
 * from `prefixes` (it is not one of the student's prefixes) and named in
 * `traditional`. (design.md §15.4 sketches a ParentSpec kind per template;
 * a benzene kind with a `template` field keeps every benzene rule of R-4b
 * for them unchanged.)
 *
 * A retained phenol (R-5a3a: `cresol`, `pirocatecol`, `catecol`,
 * `resorcinol`, `hidroquinona`) is such a template whose OH groups are the
 * name's suffix, placed by its word as `fenol`'s is: one implicit slot per
 * OH on the template tile (`catecol` 1 and 2; SuffixSpec `phenol` set), so
 * the search and the builder treat them as `fenol`'s OH. `cresol` also has
 * one methyl among its groups, at the position its letter gives — the
 * letter's locant, its carbon 1 being the OH's (`p-cresol`: 4) — or left
 * out (one left-out slot on the template tile, searched).
 *
 * A retained carbonyl template (R-5c3a, tiles.js TEMPLATES `suffix`) is such
 * a template whose C=O is the name's suffix, placed by its word (SuffixSpec
 * `placed`, one implicit slot per group on the template tile: the two –CHO
 * of `ftalaldehído` at 1 and 2, `carbaldehído`'s outside carbons). Five of
 * them have an open chain as their parent (`chain`: ParentSpec kind 'chain',
 * saturated, of `formaldehído`'s 1, `acetaldehído`'s 2, `acetona`'s 3
 * carbons…), numbered as the systematic name — the –CHO's or C=O's carbon
 * at 1, `acetona`'s at 2 — so the student's prefixes are numbered on that
 * chain (`2-(4-metilfenil)acetaldehído`); `acetofenona` and
 * `fenilacetaldehído` have a phenyl as their one group (`fenil` at 1 and at
 * 2), as `tolueno` has its methyl. A retained acid template (R-5d2:
 * `fórmico`, `acético`, `oxálico`, `fenilacético` on an open chain, the
 * ftálicos on benzene) is read the same way, its –COOH groups the placed
 * suffix (kind 'acid', `hydroxy`; `outside` for the ftálicos, as
 * `carboxílico`), after the class word `ácido` (`classWord`).
 *
 * The aldehydes and ketones (R-5c1) read their suffix like the alcohol's:
 * `ona` and `carbaldehído` with carbon slots of the parent (supplied, old
 * style, or left out: `pentanona`, `ciclohexanocarbaldehído`), SuffixSpec
 * `kind` 'ketone' / 'aldehyde' (tiles.js SUFFIX_GROUPS), `outside` for
 * `carbaldehído` (the –CHO's carbon is not the parent's); `al` on a chain
 * with its slots at the ends by rule (implicit, `terminal`: carbon 1, and the
 * last carbon with `dial`, design.md §15.5.3 step 2); `benzaldehído` the
 * benzene parent with its –CHO placed at carbon 1 by the word, as `fenol`'s
 * OH (`placed`). `oxo` is a one-atom group, kind 'carbonyl', its oxygen
 * double-bonded (build.js); `formil` a retained word.
 *
 * An acyl prefix (R-5c2) is the SubstituentSpec of its branch with `acyl`
 * set, as the forward engine's acyl structure is a chain whose attachment
 * atom is a C=O carbon (substituent.js `acyl`, `ringCarbonyl`): `oil` after a
 * chain (`propanoil`, `(but-2-enoil)`) a chain branch bonded by its carbon 1,
 * implicit on the `oil` tile, which build.js makes the C=O carbon; `carbonil`
 * after a `ciclo` ring (`(ciclohexanocarbonil)`) a ring branch whose free
 * valence (carbon 1 by rule, or the locant before `carbonil`) bonds the C=O
 * carbon build.js adds outside it; `benzoil` a phenyl branch bonded to such a
 * carbon, its own prefixes numbered on its ring (`(4-metilbenzoil)`, carbons
 * 2…6); `acetil` a retained word (build.js knows its atoms). The prefix's
 * slots are carbon slots of what it hangs from, as for any branch.
 *
 * The ester prefixes (R-6a2b) need no kind of their own: an acyloxy prefix
 * (`acetil oxi`, `prop ano oil oxi`) is the acyl branch's SubstituentSpec
 * with `alkoxy` set too, as the forward engine's acyloxy structure is its
 * acyl group's with `alkoxy` (build.js puts the C=O first, then the ether
 * oxygen); an alkoxycarbonyl prefix (`met il oxi carbonil`) the alkoxy
 * group's with `alkoxycarbonyl` set (build.js adds the C=O carbon between
 * the ether oxygen and the carbon the prefix hangs from). Their slots are
 * those of any branch: the prefix's on what it hangs from, the inner
 * branch's own on its chain.
 *
 * The carboxylic acids (R-5d1) read their suffix like the aldehydes': `oico`
 * on a chain with its slots at the ends by rule (implicit, `terminal`: carbon
 * 1, and the last carbon with `dioico`), `carboxílico` with carbon slots of
 * the parent (supplied, old style or left out) and `outside` (the –COOH's
 * carbon is not the parent's), `benzoico` the benzene parent with its –COOH
 * placed at carbon 1 by the word (`placed`, `outside`); SuffixSpec `kind`
 * 'acid' and `hydroxy` set (build.js puts an OH beside the =O on the group's
 * carbon). The class word `ácido` before the name is the NameSpec's
 * `classWord` (`{kind: 'acid', text, tiles}`); `carboxi` is a retained word
 * (build.js knows its atoms: one carbon with its =O and its OH).
 *
 * The esters (R-6a1) read their suffix like the acids': `oato` on a chain
 * with its slots at the ends by rule (implicit, `terminal`: `etanoato`,
 * `butanodioato`), `carboxilato` with carbon slots of the parent and
 * `outside`, `benzoato` the benzene parent with its –COO– placed at carbon 1
 * (`placed`, `outside`); SuffixSpec `kind` 'ester' and `bridge` set (build.js
 * puts the bridge oxygen beside the =O on the group's carbon). The O-bound
 * side is the NameSpec's `ester` (EsterSpec): each O-bound group the
 * SubstituentSpec of its chain or ring ending in `ilo` (a free-valence slot
 * like `il`'s, implicit at carbon 1 or supplied, `propan-2-ilo`), of
 * `isopropil`, `tert-butil` or `fenil` before `ilo`, its own prefixes those
 * the student wrote before its chain or inside its compound branch, numbered
 * on it, their slots searched as any branch's; its multiplier the student's.
 * A retained ester word (R-6a2a: `formiato`, `acetato`, `fenilacetato`) is a
 * chain template like `acético`, its –COO– the placed suffix (kind 'ester',
 * `bridge`, at carbon 1), the O-bound side after it read as after `oato`.
 *
 * The nitriles (R-6b1) read their suffix like the acids': `nitrilo` on a
 * chain with its slots at the ends by rule (implicit, `terminal`:
 * `butanonitrilo`, `butanodinitrilo`), `carbonitrilo` with carbon slots of
 * the parent and `outside`, `benzonitrilo` the benzene parent with its –C≡N
 * placed at carbon 1 (`placed`, `outside`); SuffixSpec `kind` 'nitrile'
 * (build.js puts a nitrogen triple-bonded to the group's carbon, tiles.js
 * suffixElement()). `ciano` is a retained word (build.js knows its atoms: one
 * carbon with its nitrogen). A retained nitrile word (R-6b2: `acetonitrilo`,
 * `fenilacetonitrilo`) is a chain template like `acético`, its –C≡N the placed
 * suffix (kind 'nitrile', at carbon 1, the chain's own carbon), and
 * `ftalonitrilo` a benzene template like `ftálico`, its two –C≡N placed
 * outside the ring at 1 and 2.
 *
 * An ether's functional-class name (R-5b2: `etil metil éter`, `dietil
 * éter`) has no parent chain: its parent is the ether oxygen itself
 * (ParentSpec kind 'ether', one atom, no carbons, no bonds of its own), and
 * its two groups are the name's prefixes, each bonded to that oxygen — one
 * implicit slot per occurrence at the oxygen's only position (role
 * `carbon`, domain 1…1, on the group's tiles), so build.js and search.js
 * attach them as any prefix and the left-out locants inside a compound
 * group (`(cloroetil) metil éter`) are searched as usual. `classWord` holds
 * the class word and its tile.
 *
 * The amines (R-6c1): the suffix `amina` is read as `ol` is (one carbon
 * slot per group, kind 'amine'), its nitrogen single-bonded to the carbon
 * (build.js). The locant `N` (tiles.js N_VALUE, the engine's N_LOCANT, 0)
 * of a name-level prefix puts that prefix on the nitrogen of the principal
 * amine (`N-metiletanamina`): its slot is a carbon slot whose value is
 * N_VALUE, its domain widened to `[N_VALUE, n]` (nitrogenSlots()), so the
 * ranges, the search's multisets and the student's order treat `N` as the
 * locant below 1, as the engine ranks it (`N,2-dimetil`). A left-out slot
 * of such a prefix may take `N` too when the amine is one group and the
 * prefix is a group the engine puts on an amine's nitrogen — a carbon
 * branch bonded by a single bond through a carbon of its own (a chain or
 * ring ending in `il`, `fenil`, `isopropil`, `tert-butil`; no `iliden`, no
 * acyl, alkoxy or one-atom group, nor `formil`, `carboxi`, `ciano`, nor an
 * amino prefix, R-6c2): `metiletanamina` is searched on carbons 1, 2 and `N`.
 *
 * An amine's functional-class name (R-6c3: `metilamina`, `dimetilamina`,
 * `etildimetilamina`, its class word the `amina` tile) is read as an ether's:
 * its parent is the amine's nitrogen (ParentSpec kind 'amine', one atom, no
 * carbons), its groups the name's prefixes, one implicit slot per occurrence
 * at the nitrogen; it has no suffix, so no `N` slot (every group already
 * stands on the nitrogen). The retained amine names (R-6c3: `anilina`, a
 * benzene template, and `bencilamina`, a chain template of one carbon with
 * its phenyl) are read like `benzonitrilo` and `fenilacetonitrilo`: their
 * nitrogen is the placed suffix (kind 'amine', at carbon 1), so
 * nitrogenSlots() gives their prefixes' `N` slots as an `amina` suffix's.
 *
 * The amides (R-6d1) read their suffix like the nitriles': `amida` on a
 * chain with its slots at the ends by rule (implicit, `terminal`:
 * `etanamida`, `butanodiamida`), `carboxamida` with carbon slots of the
 * parent and `outside`, `benzamida` the benzene parent with its –CONH₂
 * placed at carbon 1 (`placed`, `outside`); SuffixSpec `kind` 'amide' and
 * `amideNitrogen` set (build.js puts the amide's nitrogen beside the =O on
 * the group's carbon). The amide's nitrogen takes the locant `N` as an
 * amine's does (nitrogenSlots(): `N-metiletanamida`, `N,N-dimetilbenzamida`;
 * a left-out slot of a carbon branch on a one-group amide may take `N` too,
 * `metiletanamida` searched on carbons 1, 2 and `N`), the engine putting the
 * same groups there (model/validate.js isAmideCarbon(): single bonds to
 * carbons that are no functional carbon). The retained amide names (R-6d3:
 * `formamida`, `acetamida`, chain templates of one and two carbons, and
 * `ftalamida`, a benzene template) are read like the retained nitriles:
 * their –CONH₂ groups are the placed suffix (kind 'amide', `amideNitrogen`;
 * `ftalamida`'s two `outside`), so nitrogenSlots() gives the prefixes of a
 * one-amide word their `N` slots as an `amida` suffix's
 * (`N,N-dimetilformamida`; `metilacetamida` searched on carbon 2 and `N`).
 *
 * An amino prefix (R-6c2: `amino`, alone or as the own chain of a compound
 * branch whose prefixes are the groups on its nitrogen, `(metilamino)`,
 * `[etil(metil)amino]`) is a branch of kind 'aminoGroup' (tiles.js
 * AMINO_KIND; nitrogenGroupSubstituent()): one nitrogen (`length` 1, as the oxygen
 * of an ether's class name is a one-atom parent), bonded by a single bond to
 * the carbon its prefix's slot gives (its free valence implicit at that one
 * atom, on the `amino` tile); each group on it a PrefixSpec with one
 * implicit slot per occurrence at
 * that one atom (role `carbon`, domain 1…1, on the group's tiles), as the
 * groups of a class name on its oxygen, so build.js and search.js attach
 * them as any prefix and the left-out locants inside a group
 * (`[(cloroetil)amino]`) are searched as usual.
 *
 * A carbamoyl prefix (R-6d2: `carbamoil`, alone or as the own chain of a
 * compound branch whose prefixes are the groups on the amide's nitrogen,
 * `(metilcarbamoil)`, `[etil(metil)carbamoil]`) is read exactly as an amino
 * prefix (nitrogenGroupSubstituent()), its kind 'carbamoylGroup' (tiles.js
 * CARBAMOYL_KIND): `length` 1 stands for its nitrogen, which takes the
 * groups' implicit slots; build.js puts the C=O carbon and its =O between
 * that nitrogen and the carbon the prefix hangs from. An acyl group on an
 * amino prefix's nitrogen (R-6d2, the acylamino prefixes: `(acetilamino)`,
 * `[acetil(metil)amino]`) needs nothing of its own: it is a group on the
 * nitrogen like any other, its SubstituentSpec an acyl branch's.
 */

import { slotDomain } from './search.js';
import {
  TEMPLATES, SUFFIX_GROUPS, isAtomGroup, atomGroupElement, isAcylTile, templateSuffix, isChainTemplate,
  templateLength, parentWordName, N_VALUE, AMINE_KIND, isNitrogenSuffix, isNitrogenGroupTile, isNitrogenGroupKind,
} from './tiles.js';
import { groupWordOf, pairLetter } from './parse.js';
import { esterGroupsOf } from './assemble.js';

/**
 * A locant position (design.md §15.4).
 *
 * @typedef {object} Slot
 * @property {'supplied'|'implicit'|'leftOut'} kind - How the student gave it.
 * @property {number} [value] - The locant (supplied and implicit slots only).
 * @property {'carbon'|'phenylCarbon'|'bond'|'ringBond'} role - What the locant numbers.
 * @property {[number, number]} domain - Values the role allows on its chain, `[min, max]` inclusive (min > max when none).
 * @property {[number, number]} tiles - Tile range `[from, to)` it comes from.
 * @property {boolean} [letter] - Given by an orto/meta/para letter (R-4c; a supplied slot).
 * @property {number} [closing] - Written as the closing-bond locant `1(n)` (R-5a2; a supplied ring-bond slot): the ring's
 *   carbons n, which is also its `value` (bond n joins carbon n to carbon 1).
 * @property {boolean} [nitrogen] - May name the principal amine's nitrogen (R-6c1: a name-level prefix's slot of an amine
 *   name, written `N` or left out for a group the engine puts there; R-6d1: or the amide's; nitrogenSlots()): its domain
 *   starts at N_VALUE.
 */

/**
 * A group of identical prefixes: `2,3-dimetil` is one PrefixSpec with two
 * slots.
 *
 * @typedef {object} PrefixSpec
 * @property {Slot[]} slots - One carbon slot per occurrence, in the student's order.
 * @property {{count: number, compound: boolean}} multiplier - The student's multiplier (count 1 without one; `compound` for bis, tris…).
 * @property {SubstituentSpec} substituent - The branch, shared by every occurrence.
 * @property {[number, number]} tiles - Tile range of the whole prefix.
 */

/**
 * A branch: a chain or a ring with its free valence (and, for a compound
 * branch, its own prefixes), a phenyl (`fenil`, R-4b; with prefixes of its
 * own in a compound branch), a retained word (isopropil, isopropiliden,
 * tert-butil; build.js knows their atoms) or a halogen atom (R-5a1).
 *
 * @typedef {object} SubstituentSpec
 * @property {'chain'|'ring'|'phenyl'|'retained'|'halogen'|'hydroxy'|'carbonyl'|'aminoGroup'|'carbamoylGroup'} kind - A numbered
 *   chain, a numbered ring (`ciclohexil`), a benzene ring bonded by its carbon 1 (`fenil`), a retained word, a halogen atom
 *   (`cloro`), the oxygen of `hidroxi` or `oxo`, or (R-6c2) the nitrogen of an amino prefix with the groups on it (length 1),
 *   or (R-6d2) a carbamoyl prefix, its length 1 the amide's nitrogen with the groups on it (its C=O carbon build.js's).
 * @property {number|null} length - Carbons of the chain or ring (6 for a phenyl; null for a retained word or a one-atom group).
 * @property {{slot: Slot, order: 1|2}|null} freeValence - Where the branch attaches and with which bond order (`il` 1, `iliden` 2;
 *   a phenyl's carbon 1, order 1); null for a retained word or a one-atom group (bonded by a single bond).
 * @property {Slot[]} double - Double-bond slots of the branch's chain or ring.
 * @property {Slot[]} triple - Triple-bond slots of the branch's chain or ring.
 * @property {PrefixSpec[]} prefixes - Prefixes of a compound branch, numbered on its own chain.
 * @property {string|null} retained - Retained-name id (lexicon RETAINED_PREFIXES key; 'phenyl' for a phenyl), or null.
 * @property {{text: string, tiles: [number, number]}|null} word - The retained word or the one-atom group as on its tile and
 *   its tile range (for messages), or null.
 * @property {string} [element] - A one-atom group's element symbol: a halogen's ('F', 'Cl', 'Br', 'I'; the tile's value), or
 *   'O' for `hidroxi` (R-5a2); on those only.
 * @property {boolean} alkoxy - An alkoxy prefix (R-5b): the branch is bonded through an ether oxygen (its `oxi` tile).
 * @property {boolean} acyl - An acyl prefix (R-5c2): the branch is bonded by a C=O carbon — its chain's carbon 1 (`oil`,
 *   `acetil`), or a carbon outside its ring bonded to the ring's free-valence carbon (`carbonil`, `benzoil`).
 * @property {boolean} compound - Written as a compound branch (START … END).
 * @property {[number, number]} tiles - Tile range of the branch.
 * @property {boolean} [oBound] - An ester's O-bound group (R-6a1, EsterSpec): bonded to the bridge oxygen.
 * @property {boolean} [alkoxycarbonyl] - An ester's alkoxycarbonyl prefix (R-6a2b; set only then): the alkoxy group (`alkoxy`
 *   set) is bonded through its ether oxygen to a C=O carbon, which is bonded to the carbon the prefix hangs from.
 */

/**
 * One O-bound group of an ester (R-6a1): `metilo`, `dimetilo`,
 * `2-cloroetilo`, `bis(2-cloroetilo)`.
 *
 * @typedef {object} EsterGroupSpec
 * @property {{count: number, compound: boolean}} multiplier - The student's multiplier (count 1 without one).
 * @property {SubstituentSpec} substituent - The group (`oBound` set), shared by every occurrence.
 * @property {[number, number]} tiles - Tile range of the group (its bare prefixes included).
 */

/**
 * The O-bound side of an ester (R-6a1): its groups in the student's order;
 * expanded by their multipliers, occurrence k is bonded to the bridge oxygen
 * of the suffix's k-th –COO– (build.js), as many of each by parse.js
 * ESTER_GROUPS.
 *
 * @typedef {object} EsterSpec
 * @property {EsterGroupSpec[]} groups - The O-bound groups.
 * @property {[number, number]} tiles - Tile range of the O-bound side.
 */

/**
 * The retained template of a benzene parent (R-4c).
 *
 * @typedef {object} TemplateSpec
 * @property {string} value - Its tiles.js TEMPLATES key ('toluene', 'styrene', 'xylene', 'mesitylene'; R-5a3a 'cresol',
 *   'pyrocatechol', 'catechol', 'resorcinol', 'hydroquinone'; R-5c3a 'acetone', 'phthalaldehyde'…; R-5d2 'aceticAcid',
 *   'phthalicAcid'…; R-6a2a 'formate', 'acetate', 'phenylacetate'; R-6b2 'acetonitrile', 'phenylacetonitrile',
 *   'phthalonitrile').
 * @property {{text: string, tiles: [number, number]}} word - The template word as the messages quote it (tiles.js
 *   parentWordName(): its tile's text, with the class word for an acid template, R-5d2: «ácido acético») and its tile range.
 * @property {PrefixSpec[]} groups - Its own carbon groups on the ring (one PrefixSpec: `xileno`'s two methyls share one;
 *   none for the diols of R-5a3a, whose OH groups are the NameSpec's suffix).
 */

/**
 * The parent chain or ring.
 *
 * @typedef {object} ParentSpec
 * @property {'chain'|'ring'|'benzene'|'ether'|'amine'} kind - An open chain, a ring (`ciclo`, R-4a) or the benzene ring
 *   (`benceno`, R-4b; also a retained template, R-4c); 'ether' for the oxygen of an ether's functional-class name (R-5b2),
 *   'amine' for the nitrogen of an amine's (R-6c3).
 * @property {number} length - Carbons (for 'ether' and 'amine', its one atom: the oxygen or the nitrogen, no carbon;
 *   build.js parentCarbons()).
 * @property {Slot[]} double - Double-bond slots.
 * @property {Slot[]} triple - Triple-bond slots.
 * @property {TemplateSpec|null} template - The retained template (`tolueno`…, R-4c), or null.
 * @property {[number, number]} tiles - Tile range of the parent (old-style locants and a template's locants included).
 */

/**
 * The principal characteristic group cited as a suffix (R-5a2: `ol`; R-5c1:
 * `al`, `ona`, `carbaldehído`; R-5d1: `oico`, `carboxílico`; R-6a1: `oato`,
 * `carboxilato`; R-6b1: `nitrilo`, `carbonitrilo`; R-6c1: `amina`; R-6d1:
 * `amida`, `carboxamida`).
 *
 * @typedef {object} SuffixSpec
 * @property {'alcohol'|'aldehyde'|'ketone'|'acid'|'ester'|'nitrile'|'amine'|'amide'} kind - The group (lexicon GROUP_SUFFIXES
 *   key, as the engine's SuffixStructure; R-6c1: 'amine', `amina`; R-6d1: 'amide', `amida`, `carboxamida`, `benzamida`).
 * @property {boolean} outside - The group's carbon is outside the parent (R-5c1: `carbaldehído`, `benzaldehído`; R-5d1:
 *   `carboxílico`, `benzoico`; R-6b1: `carbonitrilo`, `benzonitrilo`): build.js adds that carbon, bonded to the parent's
 *   carbon, with the =O (the N of a –C≡N) on it.
 * @property {boolean} hydroxy - An acid's –COOH (R-5d1): the group's carbon also carries an OH, single-bonded.
 * @property {boolean} bridge - An ester's –COO– (R-6a1: `oato`, `carboxilato`, `benzoato`): the group's carbon also carries
 *   the bridge oxygen, single-bonded, to which an O-bound group (NameSpec `ester`) is bonded.
 * @property {boolean} amideNitrogen - An amide's –CONH₂ (R-6d1: `amida`, `carboxamida`, `benzamida`): the group's carbon also
 *   carries the amide's nitrogen, single-bonded, to which the groups written `N` are bonded.
 * @property {Slot[]} slots - One carbon slot of the parent per group, in the student's order (`fenol` and `benzaldehído`: one
 *   implicit at 1; a retained phenol, R-5a3a: one implicit per OH, `catecol` 1 and 2; `al` on a chain, R-5c1: implicit at
 *   carbon 1, and at the last carbon with `dial`).
 * @property {{count: number, compound: boolean}} multiplier - The student's multiplier (count 1 without one; a retained
 *   phenol's OH count).
 * @property {{text: string, tiles: [number, number]}} word - The suffix as on its tile (`ol`; the `fenol` tile for `fenol`,
 *   the template tile for a retained phenol, the `benzaldehído` tile for `benzaldehído`; for `benzoico`, R-5d1, the word
 *   as the messages quote it, «ácido benzoico», tiles.js parentWordName()).
 * @property {boolean} phenol - The OH groups of `fenol` or of a retained phenol (R-5a3a), placed by the parent's word.
 * @property {boolean} placed - The group is placed by the parent's word: `phenol`, or the –CHO of `benzaldehído` (R-5c1), or
 *   the –COOH of `benzoico` (R-5d1), the –COO– of `benzoato` (R-6a1), the –C≡N of `benzonitrilo` (R-6b1).
 * @property {boolean} terminal - The aldehyde suffix `al` on a chain (R-5c1), or the acid suffix `oico` (R-5d1), the ester
 *   suffix `oato` (R-6a1), the nitrile suffix `nitrilo` (R-6b1): its slots sit at the chain's ends by rule.
 * @property {[number, number]} tiles - Tile range of the suffix (its locants, multiplier and suffix tile; the `fenol`,
 *   `benzaldehído` or template tile).
 */

/**
 * The reading of a whole name (design.md §15.4).
 *
 * @typedef {object} NameSpec
 * @property {ParentSpec} parent - The parent chain or ring.
 * @property {PrefixSpec[]} prefixes - The prefixes in the student's order.
 * @property {SuffixSpec|null} suffix - The principal characteristic group cited as a suffix (R-5a2: the alcohol's `ol`, or the
 *   OH of `fenol`), or null.
 * @property {{kind: 'ether'|'amine'|'acid', text: string, tiles: [number, number]}|null} classWord - The class word of a
 *   functional-class name (R-5b2: `éter`, its tile range; R-6c3: `amina`, kind 'amine'), or the class word `ácido` that
 *   starts an acid's name (R-5d1); null otherwise.
 * @property {EsterSpec|null} ester - The O-bound side of an ester (R-6a1), or null.
 * @property {{value: string, tiles: [number, number]}|null} traditional - A traditional name tile: the retained template
 *   (R-4c; its TEMPLATES key and tile range), or null.
 * @property {boolean} oldStyle - Old-style locants before the root (`2-buteno`, `2-propanol`, `1,2-bencenodiol`).
 * @property {[number, number]} tiles - The whole tile range.
 * @property {Slot[]} leftOut - Every left-out slot, in tile order: the placement of build.js gives one value per entry.
 */

/**
 * Creates a slot.
 *
 * @param {'supplied'|'implicit'|'leftOut'} kind - Slot kind.
 * @param {number|null} value - The locant, or null for a left-out slot.
 * @param {'carbon'|'phenylCarbon'|'bond'|'ringBond'} role - What it numbers.
 * @param {number} length - Carbons of the chain it numbers.
 * @param {[number, number]} tiles - Tile range.
 * @returns {Slot} The slot.
 */
function makeSlot(kind, value, role, length, tiles) {
  const slot = { kind, role, domain: slotDomain(role, length), tiles: [tiles[0], tiles[1]] };
  if (value !== null) {
    slot.value = value;
  }
  return slot;
}

/**
 * The slots of one locant list: one supplied slot per number tile (the
 * closing-bond locant `1(n)` of a ring, R-5a2, is its bond n), or as many
 * left-out slots as the multiplier says when the list is missing.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {number[]} locants - Number tile indices (may be empty).
 * @param {number} count - How many slots the multiplier asks for.
 * @param {'carbon'|'phenylCarbon'|'bond'|'ringBond'} role - What they number.
 * @param {number} length - Carbons of the chain they number.
 * @param {[number, number]} missing - Tile range a left-out slot points at.
 * @returns {Slot[]} The slots.
 */
function locantSlots(ctx, locants, count, role, length, missing) {
  if (locants.length > 0) {
    return locants.map((index) => {
      if (ctx.tiles[index].kind === 'closing') {
        // `1(6)` (R-5a2): the ring's bond n, from carbon n to carbon 1 (parse.js allows it on a ring's segments only).
        return { ...makeSlot('supplied', length, role, length, [index, index + 1]), closing: length };
      }
      return makeSlot('supplied', ctx.tiles[index].value, role, length, [index, index + 1]);
    });
  }
  const slots = Array.from({ length: count }, () => makeSlot('leftOut', null, role, length, missing));
  ctx.leftOut.push(...slots);
  return slots;
} // End of function locantSlots()

/**
 * The slots of an orto/meta/para letter (R-4c, design.md §14.4): the ring
 * carbons 1 and the letter's locant (2 for `o`, 3 for `m`, 4 for `p`),
 * less those a template's own groups already take (`p-metiltolueno`: the
 * methyl of `tolueno` is at 1, the letter's prefix at 4). Supplied, from the
 * letter's tile; parse.js has checked that the counts agree.
 *
 * @param {{tiles: object[]}} ctx - Interpreter context.
 * @param {number} letter - The letter's tile index.
 * @param {number[]} taken - Ring carbons a template's groups take.
 * @param {'carbon'} role - What the slots number.
 * @param {number} length - Carbons of the ring.
 * @returns {Slot[]} The slots, in increasing order.
 */
function letterSlots(ctx, letter, taken, role, length) {
  return [1, ctx.tiles[letter].value].filter((value) => !taken.includes(value))
    .map((value) => ({ ...makeSlot('supplied', value, role, length, [letter, letter + 1]), letter: true }));
}

/**
 * The multiplier of a prefix or segment as the student wrote it.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {number|null} index - Multiplier tile index, or null.
 * @returns {{count: number, compound: boolean}} Its count (1 without one) and whether it is bis, tris…
 */
function multiplierOf(tiles, index) {
  return index === null ? { count: 1, compound: false } : { count: tiles[index].value, compound: tiles[index].kind === 'cmult' };
}

/**
 * The kind of a chain node: 'ring' with its `ciclo` tile, else 'chain'.
 *
 * @param {object} chain - A chain node (parse.js).
 * @returns {'chain'|'ring'} The kind.
 */
function chainKind(chain) {
  return chain.ring === null ? 'chain' : 'ring';
}

/**
 * The double- and triple-bond slots of a chain's or ring's unsaturation
 * segments, in tile order (role `bond` on a chain, `ringBond` on a ring);
 * the old-style locants go to the segment they belong to.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} chain - A chain node (parse.js).
 * @param {number} length - Its carbons.
 * @param {{locants: number[], segment: number|null}} legacy - Old-style locants and their segment (none for a branch).
 * @returns {{double: Slot[], triple: Slot[]}} The slots by bond order.
 */
function segmentSlots(ctx, chain, length, legacy) {
  const out = { double: [], triple: [] };
  const role = chainKind(chain) === 'ring' ? 'ringBond' : 'bond';
  chain.segments.forEach((segment, i) => {
    const locants = i === legacy.segment ? legacy.locants : segment.locants;
    const { count } = multiplierOf(ctx.tiles, segment.multiplier);
    const slots = locantSlots(ctx, locants, count, role, length, segment.range);
    out[ctx.tiles[segment.ending].value].push(...slots); // 'double' | 'triple' (the ENDINGS keys)
  });
  return out;
} // End of function segmentSlots()

/**
 * The SubstituentSpec of a chain or ring branch: its prefixes (compound
 * branch), its multiple bonds, then its free valence, in tile order.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} chain - The branch's chain node (with `fv`).
 * @param {object[]} items - The prefix nodes of a compound branch (empty for a simple one).
 * @param {boolean} compound - Written between START and END.
 * @param {[number, number]} range - Tile range of the branch.
 * @returns {SubstituentSpec} The branch.
 */
function chainSubstituent(ctx, chain, items, compound, range) {
  const { tiles } = ctx;
  const length = tiles[chain.root].value;
  const prefixes = items.map((item) => prefixSpec(ctx, item, length));
  const bonds = segmentSlots(ctx, chain, length, { locants: [], segment: null });
  const fvTile = [chain.fv, chain.fv + 1];
  const slot = chain.fvLocants.length > 0
    ? makeSlot('supplied', tiles[chain.fvLocants[0]].value, 'carbon', length, [chain.fvLocants[0], chain.fvLocants[0] + 1])
    : makeSlot('implicit', 1, 'carbon', length, fvTile); // `il` without a locant: carbon 1 by rule; `oil`, `carbonil` too (R-5c2)
  const acyl = tiles[chain.fv].kind === 'acyl'; // `propanoil`, `ciclohexanocarbonil`: a single bond from the C=O carbon (R-5c2)
  return withAlkoxycarbonyl({
    kind: chainKind(chain),
    length,
    freeValence: { slot, order: acyl ? 1 : tiles[chain.fv].value },
    double: bonds.double,
    triple: bonds.triple,
    prefixes,
    retained: null,
    word: null,
    alkoxy: hasAlkoxy(chain), // `met il oxi`: `metoxi` (R-5b); with an acyl, `propanoiloxi` (R-6a2b)
    acyl,
    compound,
    tiles: [range[0], range[1]],
  }, chain);
} // End of function chainSubstituent()

/**
 * A SubstituentSpec with `alkoxycarbonyl` set when its node ends in `oxi`
 * and `carbonil` (R-6a2b, parse.js `carbonil`: `metoxicarbonil`), as the
 * forward engine's substituent structure has it; unchanged otherwise (the
 * field only when set, so every other spec keeps its shape).
 *
 * @param {object} spec - The branch's SubstituentSpec (its `alkoxy` set from `oxi`).
 * @param {object} node - Its chain or retained node (parse.js).
 * @returns {object} The spec.
 */
function withAlkoxycarbonyl(spec, node) {
  return node.carbonil === undefined ? spec : { ...spec, alkoxycarbonyl: true };
}

/**
 * Tells whether a chain or retained node ends in the alkoxy ending `oxi`
 * (R-5b, parse.js `oxi`).
 *
 * @param {object} node - A chain or retained node (parse.js).
 * @returns {boolean} True for an alkoxy group's branch.
 */
function hasAlkoxy(node) {
  return node.oxi !== null && node.oxi !== undefined;
}

/**
 * The SubstituentSpec of a retained word, alone or as the own chain of a
 * compound branch (whose prefixes build.js then refuses: a retained word
 * has no numbering of its own).
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {number} tile - The retained tile index.
 * @param {object[]} items - Prefix nodes of a compound branch (empty for a bare word).
 * @param {boolean} compound - Written between START and END.
 * @param {[number, number]} range - Tile range of the branch.
 * @param {boolean} alkoxy - Followed by `oxi` (R-5b: `isopropoxi`, `tert-butoxi`).
 * @returns {SubstituentSpec} The branch.
 */
function retainedSubstituent(ctx, tile, items, compound, range, alkoxy) {
  return {
    kind: 'retained',
    length: null,
    freeValence: null,
    double: [],
    triple: [],
    prefixes: items.map((item) => prefixSpec(ctx, item, 0)),
    retained: ctx.tiles[tile].value,
    word: { text: ctx.tiles[tile].text, tiles: [tile, tile + 1] },
    alkoxy,
    acyl: isAcylTile(ctx.tiles[tile]), // `acetil` (R-5c2)
    compound,
    tiles: [range[0], range[1]],
  };
} // End of function retainedSubstituent()

/** Carbons of the benzene ring (`benceno`, `fenil`; R-4b). */
export const BENZENE_LENGTH = 6;

/** The retained words that are a benzene ring bonded by its carbon 1: `fenil` (R-4b), `benzoil` (R-5c2, through a C=O carbon). */
const PHENYL_RINGS = Object.freeze(['phenyl', 'benzoyl']);

/**
 * The SubstituentSpec of a `fenil` tile (R-4b), alone or as the own chain of
 * a compound branch: the benzene ring bonded by its carbon 1 (implicit, the
 * `fenil` tile), its own prefixes numbered on it (role `phenylCarbon`:
 * carbons 2…6); for `benzoil` (R-5c2) the same ring with `acyl` set, its
 * carbon 1 bonded to the C=O carbon build.js adds (`retained` 'benzoyl').
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {number} tile - The `fenil` tile index.
 * @param {object[]} items - Prefix nodes of a compound branch (empty for a bare `fenil`).
 * @param {boolean} compound - Written between START and END.
 * @param {[number, number]} range - Tile range of the branch.
 * @param {boolean} alkoxy - Followed by `oxi` (R-5b: `fenoxi`, `(4-metilfenoxi)`).
 * @returns {SubstituentSpec} The branch.
 */
function phenylSubstituent(ctx, tile, items, compound, range, alkoxy) {
  const prefixes = items.map((item) => prefixSpec(ctx, item, BENZENE_LENGTH, 'phenylCarbon'));
  return {
    kind: 'phenyl',
    length: BENZENE_LENGTH,
    freeValence: { slot: makeSlot('implicit', 1, 'carbon', BENZENE_LENGTH, [tile, tile + 1]), order: 1 },
    double: [],
    triple: [],
    prefixes,
    retained: ctx.tiles[tile].value,
    word: { text: ctx.tiles[tile].text, tiles: [tile, tile + 1] },
    alkoxy,
    acyl: isAcylTile(ctx.tiles[tile]), // `benzoil` (R-5c2)
    compound,
    tiles: [range[0], range[1]],
  };
} // End of function phenylSubstituent()

/**
 * The SubstituentSpec of a retained word or `fenil` (R-4b; `benzoil`, R-5c2,
 * a phenyl too), alone or as the own chain of a compound branch, and an
 * alkoxy group's when `oxi` follows it (R-5b).
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} node - The retained node (parse.js).
 * @param {object[]} items - Prefix nodes of a compound branch (empty for a bare word).
 * @param {boolean} compound - Written between START and END.
 * @param {[number, number]} range - Tile range of the branch.
 * @returns {SubstituentSpec} The branch.
 */
function wordSubstituent(ctx, node, items, compound, range) {
  const { tile } = node;
  if (isNitrogenGroupTile(ctx.tiles[tile])) {
    return nitrogenGroupSubstituent(ctx, tile, items, compound, range); // `amino`, `(metilamino)` (R-6c2); `carbamoil` (R-6d2)
  }
  return withAlkoxycarbonyl(PHENYL_RINGS.includes(ctx.tiles[tile].value)
    ? phenylSubstituent(ctx, tile, items, compound, range, hasAlkoxy(node))
    : retainedSubstituent(ctx, tile, items, compound, range, hasAlkoxy(node)), node); // `isopropoxicarbonil` (R-6a2b)
}

/**
 * The SubstituentSpec of an amino prefix (R-6c2; file header): the `amino`
 * word's nitrogen (kind 'aminoGroup', length 1), bonded by a single bond
 * (its free valence implicit at its one atom, on the `amino` tile), with the
 * groups on it — a compound branch's prefixes, `(metilamino)`,
 * `[etil(metil)amino]`, an acyl group too since R-6d2, `(acetilamino)` —
 * each a PrefixSpec with one implicit slot per occurrence at that atom (its
 * multiplier the student's: `(dimetilamino)`, two methyls), on the group's
 * tiles; or of a carbamoyl prefix (R-6d2: kind 'carbamoylGroup', the tile's
 * value), read the same way, its one atom the amide's nitrogen
 * (`(metilcarbamoil)`).
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {number} tile - The `amino` or `carbamoil` tile index.
 * @param {object[]} items - The groups on the nitrogen: prefix nodes of a compound branch (empty for a bare word).
 * @param {boolean} compound - Written between START and END.
 * @param {[number, number]} range - Tile range of the branch.
 * @returns {SubstituentSpec} The branch.
 */
function nitrogenGroupSubstituent(ctx, tile, items, compound, range) {
  const own = [tile, tile + 1];
  const prefixes = items.map((item) => {
    const multiplier = multiplierOf(ctx.tiles, item.multiplier);
    return {
      slots: Array.from({ length: multiplier.count }, () => makeSlot('implicit', 1, 'carbon', 1, item.range)),
      multiplier,
      substituent: substituentSpec(ctx, item.substituent),
      tiles: [item.range[0], item.range[1]],
    };
  });
  const kind = ctx.tiles[tile].value; // AMINO_KIND, or CARBAMOYL_KIND (R-6d2)
  return {
    kind,
    length: 1,
    freeValence: { slot: makeSlot('implicit', 1, 'carbon', 1, own), order: 1 },
    double: [],
    triple: [],
    prefixes,
    retained: kind,
    word: { text: ctx.tiles[tile].text, tiles: own },
    alkoxy: false,
    acyl: false,
    compound,
    tiles: [range[0], range[1]],
  };
} // End of function nitrogenGroupSubstituent()

/**
 * The SubstituentSpec of a one-atom group tile — a halogen (R-5a1),
 * `hidroxi` (R-5a2, an oxygen) or `oxo` (R-5c1, an oxygen double-bonded to
 * its carbon): one atom, no chain, no slot or prefix of its own (parse.js
 * never makes it a branch's own chain).
 *
 * @param {{tiles: object[]}} ctx - Interpreter context.
 * @param {number} tile - The group's tile index.
 * @returns {SubstituentSpec} The branch.
 */
function atomGroupSubstituent(ctx, tile) {
  const { kind, value, text } = ctx.tiles[tile];
  return {
    kind,
    length: null,
    freeValence: null,
    double: [],
    triple: [],
    prefixes: [],
    retained: null,
    word: { text, tiles: [tile, tile + 1] },
    element: atomGroupElement(kind, value), // R-5c1: the oxygen of `oxo` too
    alkoxy: false,
    acyl: false,
    compound: false,
    tiles: [tile, tile + 1],
  };
} // End of function atomGroupSubstituent()

/**
 * The SubstituentSpec of a prefix's substituent node.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} node - A chain, retained, halogen, hydroxy or branch node (parse.js).
 * @returns {SubstituentSpec} The branch.
 */
function substituentSpec(ctx, node) {
  if (isAtomGroup(node.type)) {
    return atomGroupSubstituent(ctx, node.tile);
  }
  if (node.type === 'retained') {
    return wordSubstituent(ctx, node, [], false, node.range);
  }
  if (node.type === 'chain') {
    return chainSubstituent(ctx, node, [], false, node.range);
  }
  const own = node.chain;
  return own.type === 'retained'
    ? wordSubstituent(ctx, own, node.items, true, node.range)
    : chainSubstituent(ctx, own, node.items, true, node.range);
} // End of function substituentSpec()

/**
 * The PrefixSpec of a prefix node: its carbon slots on the chain it hangs
 * from — its locants, or the positions of its orto/meta/para letter (R-4c,
 * name level only) —, its multiplier and its substituent.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} node - A prefix node (parse.js) with a complete substituent.
 * @param {number} length - Carbons of the chain the prefix hangs from.
 * @param {'carbon'|'phenylCarbon'} [role] - Role of its carbon slots (default 'carbon'; 'phenylCarbon' on a phenyl).
 * @param {number[]} [taken] - Ring carbons a template's own groups take (for a letter; default none).
 * @returns {PrefixSpec} The prefix.
 */
function prefixSpec(ctx, node, length, role = 'carbon', taken = []) {
  const multiplier = multiplierOf(ctx.tiles, node.multiplier);
  const slots = node.letter === null || node.letter === undefined
    ? locantSlots(ctx, node.locants, multiplier.count, role, length, node.range)
    : letterSlots(ctx, node.letter, taken, role, length);
  return { slots, multiplier, substituent: substituentSpec(ctx, node.substituent), tiles: [node.range[0], node.range[1]] };
}

/**
 * The SubstituentSpec of a template's own group (R-4c): an unbranched chain
 * bonded by its carbon 1, its double bonds at the locants the template says
 * (the ethenyl of `estireno`), every slot implicit, on the template's tile;
 * for `anisol` (R-5b) that chain is bonded through an ether oxygen (the
 * methoxy group, `alkoxy` set); for `acetofenona` and `fenilacetaldehído`
 * (R-5c3a) a phenyl, the benzene ring bonded by its carbon 1, as `fenil`.
 *
 * @param {{length?: number, double?: number[], alkoxy?: boolean, phenyl?: boolean}} group - The tiles.js TEMPLATES group.
 * @param {[number, number]} tiles - The template tile's range.
 * @returns {SubstituentSpec} The branch.
 */
function templateGroupSpec(group, tiles) {
  if (group.phenyl) {
    return {
      kind: 'phenyl',
      length: BENZENE_LENGTH,
      freeValence: { slot: makeSlot('implicit', 1, 'carbon', BENZENE_LENGTH, tiles), order: 1 },
      double: [],
      triple: [],
      prefixes: [],
      retained: PHENYL_RINGS[0], // 'phenyl'
      word: null,
      alkoxy: false,
      acyl: false,
      compound: false,
      tiles: [tiles[0], tiles[1]],
    };
  }
  return {
    kind: 'chain',
    length: group.length,
    freeValence: { slot: makeSlot('implicit', 1, 'carbon', group.length, tiles), order: 1 },
    double: group.double.map((value) => makeSlot('implicit', value, 'bond', group.length, tiles)),
    triple: [],
    prefixes: [],
    retained: null,
    word: null,
    alkoxy: Boolean(group.alkoxy),
    acyl: false,
    compound: false,
    tiles: [tiles[0], tiles[1]],
  };
} // End of function templateGroupSpec()

/**
 * The TemplateSpec of a template parent node (R-4c): its groups at the ring
 * carbons it places them (implicit), or — `xileno` — at the two the student
 * gives: two numbers (supplied), a letter (supplied, 1 and the letter's
 * locant) or nothing (two left-out slots on the template tile, searched);
 * `cresol` (R-5a3a) its one methyl at the letter's locant (its carbon 1 is
 * the OH's) or left out. A diol of R-5a3a has no carbon group: no PrefixSpec.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} parent - The parent node (parse.js), its chain a template node.
 * @returns {TemplateSpec} The template.
 */
function templateSpec(ctx, parent) {
  const { tile } = parent.chain;
  const value = ctx.tiles[tile].value;
  const template = TEMPLATES[value];
  const own = [tile, tile + 1];
  const word = { text: parentWordName(ctx.tiles[tile]), tiles: own }; // «ácido acético» (R-5d2): as the name is written.
  if (template.count === 0) {
    return { value, word, groups: [] }; // `catecol`… (R-5a3a), `acetona` (R-5c3a): their OH or C=O is the suffix (suffixSpec()).
  }
  let slots;
  if (template.positions) {
    // On the template's parent: the ring, or the chain of `acetofenona` and `fenilacetaldehído` (R-5c3a).
    slots = template.positions.map((locant) => makeSlot('implicit', locant, 'carbon', templateLength(value), own));
  } else if (parent.letter !== null) {
    slots = letterSlots(ctx, parent.letter, template.hydroxy, 'carbon', BENZENE_LENGTH); // `p-cresol`: 4 (its OH at 1).
  } else {
    slots = locantSlots(ctx, parent.legacy, template.count, 'carbon', BENZENE_LENGTH, parent.chain.range);
  }
  const group = {
    slots,
    multiplier: { count: template.count, compound: false },
    substituent: templateGroupSpec(template.group, own),
    tiles: [parent.range[0], parent.range[1]],
  };
  return { value, word, groups: [group] };
} // End of function templateSpec()

/**
 * The SuffixSpec of a parent (R-5a2): the suffix node (`ol`; R-5c1: `ona`,
 * `carbaldehído`; R-5d1: `carboxílico`) with its slots on the parent's carbons — its own locants,
 * the old-style ones before the root (parse.js `legacySuffix`: `2-propanol`,
 * `2-pentanona`) or as many left-out slots as its multiplier says (`etanol`,
 * `propanol`, `pentanona`) —, `al` on a chain (R-5c1) or `oico` (R-5d1) with
 * its slots at the chain's ends by rule (implicit: carbon 1, and the last with
 * `dial`, `dioico`), or the group of a whole-word parent (one implicit slot at
 * carbon 1, on its tile: the OH of `fenol`, the –CHO of `benzaldehído`, R-5c1,
 * the –COOH of `benzoico`, R-5d1), or the OH groups of
 * a retained phenol (R-5a3a: one implicit slot per OH where its word puts
 * it, on the template tile — `catecol` 1 and 2, `cresol` 1); null without
 * any.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} parent - The parent node (parse.js).
 * @returns {SuffixSpec|null} The suffix.
 */
function suffixSpec(ctx, parent) {
  const { chain, suffix } = parent;
  const template = chain.type === 'template' ? ctx.tiles[chain.tile].value : null;
  const length = (chain.type === 'chain' && ctx.tiles[chain.root].value) || (template && templateLength(template)) || BENZENE_LENGTH;
  const word = groupWordOf(ctx.tiles, chain); // `fenol` (R-5a2), `benzaldehído` (R-5c1)
  // The OH groups of a retained phenol (R-5a3a), the C=O of a carbonyl template (R-5c3a).
  const own = template && templateSuffix(template);
  const placed = (word && [1]) || (own && own.positions);
  if (placed) {
    const tiles = [chain.tile, chain.tile + 1];
    const group = SUFFIX_GROUPS[(word && word.suffix) || (own && own.value) || 'alcohol'];
    return {
      kind: group.kind,
      outside: group.outside,
      slots: placed.map((locant) => makeSlot('implicit', locant, 'carbon', length, tiles)),
      multiplier: { count: placed.length, compound: false },
      word: { text: parentWordName(ctx.tiles[chain.tile]), tiles }, // «ácido benzoico» (R-5d1)
      hydroxy: Boolean(group.hydroxy),
      bridge: Boolean(group.bridge), // The bridge oxygen of `benzoato`'s –COO– (R-6a1)
      amideNitrogen: Boolean(group.amideNitrogen), // The nitrogen of `benzamida`'s –CONH₂ (R-6d1)
      phenol: group.kind === 'alcohol',
      placed: true,
      terminal: false,
      tiles,
    };
  }
  if (!suffix) {
    return null;
  }
  const multiplier = multiplierOf(ctx.tiles, suffix.multiplier);
  const group = SUFFIX_GROUPS[ctx.tiles[suffix.tile].value];
  // `al` on a chain (R-5c1), `oico` (R-5d1): carbon 1 by rule, and the last carbon with `dial`, `dioico` (parse.js keeps their
  // locants out; more than two groups are build.js checkSpec()'s CARBONYL_POSITION).
  const terminal = group.terminal && chain.type === 'chain';
  const locants = parent.legacySuffix ? parent.legacy : suffix.locants;
  const slots = terminal
    ? Array.from({ length: multiplier.count }, (_, i) => makeSlot('implicit', i === 1 ? length : 1, 'carbon', length, suffix.range))
    : locantSlots(ctx, locants, multiplier.count, 'carbon', length, suffix.range);
  return {
    kind: group.kind, // 'alcohol', 'aldehyde', 'ketone', 'acid', 'ester', 'nitrile', 'amine' or 'amide' (GROUP_SUFFIXES keys)
    outside: group.outside, // `carbaldehído` (R-5c1), `carboxílico` (R-5d1), `carboxilato` (R-6a1), `carboxamida` (R-6d1)
    hydroxy: Boolean(group.hydroxy), // The OH of a –COOH (R-5d1)
    bridge: Boolean(group.bridge), // The bridge oxygen of a –COO– (R-6a1)
    amideNitrogen: Boolean(group.amideNitrogen), // The nitrogen of a –CONH₂ (R-6d1)
    slots,
    multiplier,
    word: { text: ctx.tiles[suffix.tile].text, tiles: [suffix.tile, suffix.tile + 1] },
    phenol: false,
    placed: false,
    terminal,
    tiles: [suffix.range[0], suffix.range[1]],
  };
} // End of function suffixSpec()

/**
 * The NameSpec of an ether's functional-class name (R-5b2; file header): the
 * ether oxygen as the parent (kind 'ether', one atom), each group a
 * PrefixSpec with one implicit slot per occurrence at the oxygen (`dietil
 * éter`: two), in the student's order; of an amine's (R-6c3: `metilamina`,
 * `dimetilamina`), the amine's nitrogen as the parent (kind 'amine', one
 * atom), its groups the same way (`trimetilamina`: three).
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} tree - An error-free parse() tree whose parent is the class word.
 * @returns {NameSpec} The reading of the name.
 */
function classNameSpec(ctx, tree) {
  const word = tree.parent.chain.tile;
  const own = [word, word + 1];
  const prefixes = tree.items.map((item) => {
    const multiplier = multiplierOf(ctx.tiles, item.multiplier);
    return {
      slots: Array.from({ length: multiplier.count }, () => makeSlot('implicit', 1, 'carbon', 1, item.range)),
      multiplier,
      substituent: substituentSpec(ctx, item.substituent),
      tiles: [item.range[0], item.range[1]],
    };
  });
  // The `amina` tile read as the class word (R-6c3): its value is the amine's GROUP_SUFFIXES key, 'amine'.
  const kind = ctx.tiles[word].value === AMINE_KIND ? AMINE_KIND : 'ether';
  return {
    parent: { kind, length: 1, double: [], triple: [], template: null, tiles: own },
    prefixes,
    suffix: null,
    classWord: { kind: ctx.tiles[word].value, text: ctx.tiles[word].text, tiles: [own[0], own[1]] },
    ester: null,
    traditional: null,
    oldStyle: false,
    tiles: [0, tree.tiles.length],
    leftOut: ctx.leftOut,
  };
} // End of function classNameSpec()

/**
 * The EsterSpec of an ester's O-bound side (R-6a1; file header): each
 * O-bound group (assemble.js esterGroupsOf()) as the SubstituentSpec of its
 * chain, ring or retained word — its bare prefixes numbered on its own chain
 * (`2-cloroetilo`), or a compound branch's own (`bis(2-cloroetilo)`) —, its
 * free valence the carbon bonded to the bridge oxygen (carbon 1 by rule, on
 * the `ilo` tile, or the locant before it: `propan-2-ilo`), flagged `oBound`
 * (build.js words its messages for it), with the student's multiplier.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} tree - An error-free parse() tree with an `ester` node.
 * @returns {EsterSpec} The O-bound side.
 */
function esterSpec(ctx, tree) {
  const { groups } = esterGroupsOf(ctx.tiles, tree.ester.items);
  return {
    groups: groups.map(({ items, end }) => {
      const node = end.substituent;
      const range = [items.length > 0 ? items[0].range[0] : end.range[0], end.range[1]];
      let substituent;
      if (node.type === 'branch') {
        substituent = substituentSpec(ctx, node); // `bis(2-cloroetilo)`: parse.js puts no bare prefix before it.
      } else if (node.type === 'retained') {
        substituent = wordSubstituent(ctx, node, items, false, range); // `fenilo`, `4-metilfenilo`, `isopropilo`
      } else {
        substituent = chainSubstituent(ctx, node, items, false, range); // `metilo`, `2-cloroetilo`, `propan-2-ilo`
      }
      substituent.oBound = true;
      return { multiplier: multiplierOf(ctx.tiles, end.multiplier), substituent, tiles: range };
    }),
    tiles: [tree.ester.range[0], tree.ester.range[1]],
  };
} // End of function esterSpec()

/** The retained branch words the engine puts on an amine's nitrogen (R-6c1): carbon branches bonded by a single bond. */
const NITROGEN_RETAINED = Object.freeze(['isopropyl', 'tert-butyl']);

/**
 * Tells whether a branch is one the engine puts on an amine's nitrogen as an
 * `N` prefix (R-6c1; model/validate.js isAmineNitrogen(): single bonds to
 * carbons that are no functional carbon): a chain, ring or phenyl bonded by
 * a single bond (`il`, `fenil`), `isopropil` or `tert-butil` — no `iliden`,
 * acyl, alkoxy or one-atom group, nor `formil`, `carboxi` or `ciano`, nor an
 * amino prefix (R-6c2: a nitrogen on the nitrogen), nor a carbamoyl prefix
 * (R-6d2: a C=O carbon on it, an imide or a urea).
 *
 * @param {SubstituentSpec} sub - The branch.
 * @returns {boolean} True when a left-out locant of it may be `N`.
 */
function bondsToNitrogen(sub) {
  if (sub.alkoxy || sub.acyl || isAtomGroup(sub.kind) || isNitrogenGroupKind(sub.kind)) {
    return false;
  }
  return sub.kind === 'retained' ? NITROGEN_RETAINED.includes(sub.retained) : sub.freeValence.order === 1;
}

/**
 * Widens the slots of the name-level prefixes of an amine name that may
 * name the amine's nitrogen (R-6c1; file header): a supplied `N` (value
 * N_VALUE), and, when the amine is one group, a left-out slot of a branch
 * the engine puts on the nitrogen (bondsToNitrogen()) — domain `[N_VALUE,
 * n]`, `nitrogen` set. An amide name's (R-6d1: `amida`, `carboxamida`,
 * `benzamida`) the same way, on the amide's nitrogen (tiles.js
 * isNitrogenSuffix()). A name without either has no `N` (parse.js
 * checkNitrogen()).
 *
 * @param {PrefixSpec[]} prefixes - The name-level prefixes.
 * @param {SuffixSpec|null} suffix - The name's suffix.
 * @param {number} length - Carbons of the parent.
 * @returns {void}
 */
function nitrogenSlots(prefixes, suffix, length) {
  if (!suffix || !isNitrogenSuffix(suffix.kind)) {
    return;
  }
  const single = suffix.slots.length === 1;
  for (const prefix of prefixes) {
    for (const slot of prefix.slots) {
      const named = slot.kind === 'supplied' && slot.value === N_VALUE;
      if (named || (slot.kind === 'leftOut' && single && bondsToNitrogen(prefix.substituent))) {
        slot.domain = [N_VALUE, length];
        slot.nitrogen = true;
      }
    } // End of the loop over a prefix's slots
  } // End of the loop over the prefixes
} // End of function nitrogenSlots()

/**
 * Tells whether a tree is one interpret() accepts: a parent, no tile out of
 * place, every prefix complete (what an error-free parse gives), an ester's
 * O-bound side too (R-6a1).
 *
 * @param {object} tree - A parse() tree.
 * @returns {boolean} True when it can be interpreted.
 */
function isComplete(tree) {
  const complete = (items) => items.every((item) => item.type === 'prefix' && Boolean(item.substituent));
  return Boolean(tree.parent) && tree.trailing.length === 0 && complete(tree.items) && (!tree.ester || complete(tree.ester.items));
}

/**
 * Reads a syntax tree as a NameSpec (design.md §15.4, §15.5.3 steps 1–2).
 *
 * @param {object} tree - The tree of a parse() without errors.
 * @returns {NameSpec} The reading of the name.
 * @throws {Error} When the tree is incomplete (the parser reported errors).
 */
export function interpret(tree) {
  if (!isComplete(tree)) {
    throw new Error('interpret: the tree is incomplete (parse() reported errors)');
  }
  const ctx = { tiles: tree.tiles, leftOut: [] };
  if (tree.parent.chain.type === 'classWord') {
    return classNameSpec(ctx, tree); // `etil metil éter` (R-5b2), `metilamina` (R-6c3)
  }
  const { chain, legacy, legacySegment, legacySuffix, suffix } = tree.parent;
  // `benceno` (R-4b), `fenol` (R-5a2) or a template (R-4c): no segments, no old-style locants of their own (parse.js
  // BENZENE_BONDS, TEMPLATE_LOCANTS; those of a suffix, `1,2-bencenodiol`, are the suffix's). A chain template (R-5c3a:
  // `acetona`) is an open chain of its carbons, saturated.
  const value = chain.type === 'template' ? ctx.tiles[chain.tile].value : null;
  const chainTemplate = value !== null && isChainTemplate(value);
  const benzene = chain.type === 'benzene' || (value !== null && !chainTemplate);
  let length = benzene ? BENZENE_LENGTH : null;
  length = length || (chainTemplate ? templateLength(value) : ctx.tiles[chain.root].value);
  let placed = [];
  if (value !== null) {
    // A template's groups (R-4c), OH groups (R-5a3a) and C=O (R-5c3a) where its word puts them (`xileno`'s and `cresol`'s
    // methyls aside).
    const { positions } = TEMPLATES[value];
    const own = templateSuffix(value);
    placed = [...(own ? own.positions : []), ...(positions || [])];
  } else if (groupWordOf(ctx.tiles, chain)) {
    // The OH of `fenol` (R-5a2) or the –CHO of `benzaldehído` (R-5c1), for an orto/meta/para letter: `p-metilfenol` puts the
    // methyl at 4.
    placed = [1];
  }
  // I-54b: the old form of two prefixes on `benceno` (`m-cloroetilbenceno`): its one letter, before the first prefix, puts
  // that prefix at 1 and the second at the letter's locant, both supplied by the letter's tile.
  const pair = pairLetter(ctx.tiles, tree);
  const second = pair === null ? null : ctx.tiles[pair].value;
  const prefixes = tree.items.map((item, k) => (pair === null ? prefixSpec(ctx, item, length, 'carbon', placed)
    : prefixSpec(ctx, { ...item, letter: pair }, length, 'carbon', k === 0 ? [second] : [1])));
  const template = chain.type === 'template' ? templateSpec(ctx, tree.parent) : null; // After the prefixes: tile order.
  const segmentLegacy = legacy.length > 0 && !legacySuffix ? legacySegment : null;
  const bonds = benzene || chainTemplate
    ? { double: [], triple: [] }
    : segmentSlots(ctx, chain, length, { locants: legacy, segment: segmentLegacy });
  const suffixRead = suffixSpec(ctx, tree.parent); // After the segments: tile order (R-5a2).
  nitrogenSlots(prefixes, suffixRead, length); // The locant `N` of an amine's prefixes (R-6c1), or an amide's (R-6d1).
  const ester = tree.ester ? esterSpec(ctx, tree) : null; // After the suffix: tile order (R-6a1).
  const lead = tree.suffixClass ? tree.suffixClass.tile : null; // `ácido` (R-5d1)
  return {
    parent: {
      kind: (benzene && 'benzene') || (chainTemplate && 'chain') || chainKind(chain),
      length,
      double: bonds.double,
      triple: bonds.triple,
      template,
      tiles: [tree.parent.range[0], suffix ? suffix.range[0] : tree.parent.range[1]],
    },
    prefixes,
    suffix: suffixRead,
    classWord: lead === null ? null : { kind: ctx.tiles[lead].value, text: ctx.tiles[lead].text, tiles: [lead, lead + 1] },
    ester,
    traditional: template ? { value: template.value, tiles: [template.word.tiles[0], template.word.tiles[1]] } : null,
    oldStyle: (chain.type === 'chain' && legacy.length > 0) || legacySuffix,
    tiles: [0, tree.tiles.length],
    leftOut: ctx.leftOut,
  };
} // End of function interpret()
