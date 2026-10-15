/**
 * @file Diagnosis of «¿Cómo se dibuja?» (design.md §15.3 `otherName`, §15.4,
 * §15.8 R-3; phase I-49a): for an `otherName` verdict of readName() — the
 * student's name describes one molecule, which the app names otherwise —
 * the student's **main mistake**, one diagnosis: the first rule of the list
 * below that applies. Pure, no DOM; open-chain hydrocarbons and, since
 * phase I-50d (design.md §15.8 R-4), hydrocarbons with one ring (`ciclo`,
 * `benceno`, `fenil`, the retained templates; see «Rings» below), their
 * halogen derivatives and alcohols (R-5a; «Halogens» and «Alcohols» below:
 * an alcohol's own mistakes are checked before rule 1) and their ethers
 * (R-5b; «Ethers» below: the wrong side of the oxygen, `di` for `bis` before
 * an alkoxy prefix, and the functional-class names, R-5b2), and their
 * aldehydes and ketones (R-5c1, R-5c2 — the acyl prefixes —, R-5c3a — the
 * retained names —, R-5c3b1, R-5c3b2; «Aldehydes and ketones» below: the
 * rules that hold for them, the principal C=O group's own mistakes, checked
 * before rule 1 as an alcohol's are, and a branch's own name — an acyl
 * group's word and chain, a ring branch's numbering —, checked before rule
 * 5), and their carboxylic acids (R-5d1, R-5d2 — the retained names —,
 * R-5d3; «Acids» below: the rules that hold for an acid name, and the
 * acid's own mistakes, checked first), and their esters (R-6a1, R-6a2a —
 * the retained names —, R-6a2b — the ester prefixes —, R-6a3a, R-6a3b;
 * «Esters» below: the rules that hold for an ester's acid part and for an
 * ester prefix, the principal –COO– group's own mistakes, checked first with
 * the acid's, then the O-bound side's, and an ester prefix's own words, among
 * the branch-name rules), and their nitriles (R-6b1, R-6b2 — the retained
 * names —, R-6b3; «Nitriles» below: the rules that hold for a nitrile name,
 * and the principal –C≡N group's own mistakes, checked first as the acid's
 * and the ester's are), and their amines (R-6c1, R-6c2 — the amino
 * prefixes —; «Amines» below: the rules that hold for an amine name and for
 * an amino prefix, the amine's own mistakes deliberate nulls, checked before
 * every other family's).
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
 *    multipliers and `tert-` ignored); since phase R-5c3b2 the branch-name
 *    rules come first, with its number (a branch's own name decides the
 *    words the order reads: «Aldehydes and ketones» below);
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
 * and an alkyl branch whose own chain or numbering is not the engine's
 * (`5-(butan-3-il)nonano`, `7-[2-(2-metilpropil)propil]tridecano`; an acyl
 * group's word and chain and a ring branch's numbering are named since phase
 * R-5c3b2, «Aldehydes and ketones» below).
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
 * the benzene ring), for an alcohol, an aldehyde, a ketone, an acid, an
 * ester or a nitrile `group`, `ringChain` or `groupChain`, for an ester's O-bound side `ester` or `diester`
 * (R-6a3b), and for an ether `ether`, R-5b2 — or, for an ether's class name, CLASS_NAME_STEP, the
 * step diagnosisExplanation() adds to them);
 * diagnosisExplanation() builds those steps and finds it, with
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
 *    fewerPrincipalGroups(), the student's count its chain's own, as P0 counts
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
 * its phase adds its messages — an amide's, R-6d —; the aldehydes, ketones,
 * acids, esters and nitriles have their own codes and phrases, below:
 * an OH on an aldehyde's
 * carbon makes an acid, `1-hidroxipropanal`, ACID_GROUP). A ring branch of
 * an alcohol's chain numbered otherwise (`2-(5-metilfenil)etan-1-ol`) is
 * BRANCH_RING_NUMBERING (phase R-5c3b2, «Aldehydes and ketones» below).
 *
 * **Ethers** (design.md §13.4 I-34, §15.8 R-5b; phase R-5b1). An alkoxy
 * prefix (`metoxi`, `isopropoxi`, `fenoxi`, `(pentiloxi)`) is a group bonded
 * through an ether oxygen: like a halogen it is no carbon of the chain it
 * hangs from and never lengthens it (rule 1 skips it, isHeteroGroup():
 * `1-metoxi-1-metilpropano` blames `metil`), it counts as a substituent
 * wherever the engine's trace counts it (P4, N3, N4: `2-metoxietano` is
 * NUMBERING, `1-metoxi-4-metilbenceno` RING_NUMBERING at N4, the Spanish
 * order `metil` < `metoxi`), the messages speak of «sustituyentes»
 * (MORE_SUBSTITUENTS, UNGROUPED: `1-metoxi-2-metoxietano`), and the form
 * rules read its words like any branch's: ALPHABETICAL_ORDER, UNGROUPED,
 * LOCANT_ORDER, NEEDLESS_LOCANTS (`1-metoxietano`; inside it,
 * `1-(propan-1-iloxi)propano` → «1-propoxi»), MISSING_LOCANTS; its shape for
 * the prefix style is its branch's after `O:` (specShape()), and di vs bis
 * follow render.js isCompoundPrefix() (isCompoundNode(): `bis(pentiloxi)`,
 * `dimetoxi`). The ether oxygen splits the carbon skeleton, and the engine
 * chooses the parent among the chains of every side (design.md §13.4 I-34);
 * a substituted `anisol` (`4-cloroanisol`, `p-cloroanisol`) is
 * SUBSTITUTED_TEMPLATE, named from `benceno`. The ether messages (phase
 * R-5b2, I-51b2):
 *
 * - `ETHER_SIDE` — the student's chain on the other side of an ether oxygen
 *   from the engine's parent (oxygenBetween(): no shared atom, an ether O on
 *   the path between them): the parent-choice draft the chain or ring rules
 *   give (RING_IS_PARENT, HYDROXY_PARENT, MORE_HYDROXY_GROUPS, LONGER_CHAIN,
 *   MORE_MULTIPLE_BONDS, MORE_DOUBLE_BONDS, MORE_SUBSTITUENTS, CHAIN_LOCANTS,
 *   CHAIN_ALPHABETICAL; acrossOxygen()) told from the oxygen — it cuts the
 *   molecule in two sides, the parent is sought on one of them with the usual
 *   rules, and why the other side wins, as the explanation's etherSideReason()
 *   reads the trace — with the engine's prefix that holds the student's chain
 *   (`etoximetano` → «…en ese lado hay una cadena de 2 carbonos, más larga que
 *   la tuya, de 1. Tu cadena, con el oxígeno, es el sustituyente «metoxi»:
 *   «metoxietano».»; `(clorometoxi)metano`, `fenoxietano`,
 *   `(2-hidroxietoxi)metano`, `2-propoxipropano` at N3), or, when the
 *   student's chain lies deeper inside that prefix, the prefix it is part of
 *   (nestedSide(): `(2-propoxietoxi)metano` → «Tu cadena forma parte del
 *   sustituyente «2-metoxietoxi»…»); it keeps the trace
 *   rule and the rule number of the draft it replaces, opens «Reconoce el
 *   éter» (`ether`) and points at the student's prefix that holds the
 *   engine's parent; the stripe and legend of the two chains are as for any
 *   parent-choice diagnosis. BRANCH_AT_END keeps its own message on the
 *   wrong side too (rule 1: the student's chain is no leaf-to-leaf path);
 * - `ALKOXY_MULTIPLIER` — rule 7 for di… before an alkoxy prefix that takes
 *   bis… for its form only, a branch + `oxi` with no prefixes of its own
 *   (`1,6-di(pentiloxi)hexano`, `1,6-di(propan-2-iloxi)hexano`: a prefix
 *   that is not shortened is compound, «un grupo más oxi»), and
 *   `1,6-di-tert-butoxihexano`, which the engine writes `bis-tert-butoxi`
 *   (render.js isCompoundPrefix() counts the systematic form's own branches,
 *   «1,1-dimetiletoxi»; IUPAC usage is `di-tert-butoxy`, an open question for
 *   the user, followed here as the engine writes it); step `substituents`;
 * - the functional-class names (`etil metil éter`; a track of their own,
 *   classNameDiagnosis(), before every other rule, compared with the
 *   verdict's own naming, which lists the class name): `CLASS_NAME_NONE` —
 *   the engine gives the molecule no class name (a group with branches other
 *   than isopropil / tert-butil, a ring, a multiple bond, another atom:
 *   `etenil metil éter`, `fenil metil éter`, `(2-cloroetil) metil éter`), the
 *   `éter` tile; `CLASS_GROUP_WORDS` — the student's group words are not the
 *   engine's (`metil (propan-2-il) éter`, `(1-metiletil) metil éter`, needless
 *   locants), the groups; `CLASS_DI` — a repeated group written twice or
 *   with `bis` (`etil etil éter`, `bisetil éter`); `CLASS_ORDER` — the two
 *   groups out of alphabetical order, `tert-` not counted, the plain word
 *   first on a tie (`metil etil éter`, `metil tert-butil éter` with the
 *   `tert-` hint, `tert-butil butil éter`); the student has no chain to
 *   stripe. Their rule numbers (2, 2, 6, 5) only place them in DIAGNOSES.
 *   No explain() step speaks of class names (its «Reconoce el éter» says an
 *   ether «nunca va al final del nombre», true of the substitutive name), so
 *   all four open a step of their own that diagnosisExplanation() adds right
 *   after «Reconoce el éter» (CLASS_NAME_STEP, «Monta el nombre con
 *   «éter»», classNameStep(); review of phase I-51b2): how the class name is
 *   formed — the two groups bonded to the oxygen named as branches, simplest
 *   form and no numbers, in alphabetical order without `tert-`, once with
 *   `di` when equal, the word `éter` last — and how it differs from the
 *   substitutive name the other steps explain, with the name the message
 *   recommends (Diagnosis `className`); for CLASS_NAME_NONE, which ethers get
 *   a class name and that this one is named only with its `-oxi` prefix.
 *
 * Deliberate, tested nulls: `di-tert-butil éter`, the IUPAC form, which the
 * engine writes `ditert-butil éter` (naming/index.js etherClassAlternative()
 * joins `di` and `tert-butil` without rule 5's hyphen; an open question for
 * the user — the tiles cannot write the engine's form, nor should the
 * message teach it), and, as for any branch, an alkoxy group written in a
 * prefix style the engine does not offer for the molecule
 * (`(1,1-dimetiletoxi)metano`, the other styles are offered only beside an
 * isopropyl group). A class name whose oxygen is an ester's (`(1-oxoetil)
 * metil éter`, the engine's `etanoato de metilo`: the molecule is no ether,
 * and CLASS_NAME_NONE's «-oxi» prefix would be false; review of phase
 * I-51c1) is ESTER_CLASS_NAME since phase R-6a3b («Esters» below).
 *
 * **Aldehydes and ketones** (design.md §13.4 I-32, I-40b, §15.8 R-5c;
 * phases R-5c1, R-5c2, R-5c3a, R-5c3b1). The C=O of an aldehyde (`al`,
 * `carbaldehído`, `benzaldehído`) or a ketone (`ona`) is the principal group:
 * the engine's trace has P0 (most C=O groups on the chain) and N0 (lowest
 * locants for them), as for an alcohol, and the messages call them «grupos
 * –CHO» or «grupos C=O», as the explanation does (DIAGNOSIS_PHRASES
 * `groupWords`). The rules keep working wherever they say something true of
 * a carbonyl name: BRANCH_AT_END (`1-metilpropan-1-ona`, a branch on the
 * ketone's end carbon; an `oxo` is a one-atom group, kind 'carbonyl', that
 * never lengthens a chain), LONGER_CHAIN and the other P1–P4 rules after a
 * P0 tie (`3-etilbutan-2-ona`), NUMBERING and RING_NUMBERING at N1–N4 after
 * an N0 tie (`4-metilpentan-3-ona`, `6-metilciclohexan-1-ona`),
 * ALPHABETICAL_ORDER (`oxo` under o: `4-oxo-2-metilpentanal`), UNGROUPED,
 * MULTIPLIER_KIND, LOCANT_ORDER (the suffix's too: `pentano-4,2-diona`),
 * MISSING_LOCANTS, and OLD_STYLE with the suffix's words (suffixWordOf():
 * `2-pentanona` → «…justo delante de «ona»», `2,4-pentanodiona` → «diona»;
 * `2-butenal` keeps the segment's «eno» o «ino»). The shapes for the prefix
 * style: `oxo` is `X:=O`, `formil` the engine's one-carbon formyl group with
 * its oxo.
 *
 * The principal C=O group's own mistakes (phase R-5c3b1) are checked right
 * after HYDROXY_PREFIX, before every other rule (carbonylChecks(), in this
 * order), each opening «Reconoce el grupo funcional» (`group`), which says
 * which group is principal, how it is written and, beside other oxygen
 * groups, the seniority aldehído > cetona > alcohol (design.md §13.4 I-32):
 *
 * 1. `CARBONYL_SENIORITY` — the student's suffix is a junior group's
 *    (naming/seniority.js seniorityRank(): `ona` beside the engine's
 *    aldehyde, `5-oxopentan-2-ona` → `4-oxopentanal`, `1-oxoacetona`; `ol`
 *    beside a C=O, `4-oxopentan-2-ol` → `4-hidroxipentan-2-ona`,
 *    `4-oxobutan-1-ol`; `fenol` beside a –CHO, `4-formilfenol` →
 *    `4-hidroxibenzaldehído`): the order, the principal group and how it is
 *    written, and the student's groups as prefixes (`oxo`, `hidroxi`,
 *    lexicon GROUP_PREFIXES, when their carbons are the engine's parent's;
 *    «en los prefijos» otherwise);
 * 1. `KETONE_NOT_ALDEHYDE` — the student's `al` (or an aldehyde template's
 *    –CHO) on a carbon a carbon branch of the student's bonds to a second
 *    carbon (`1-metilpropanal` → `butan-2-ona`, `1-acetilhexanal` →
 *    `octano-2,3-diona`, `1-metilbutanodial` → `4-oxopentanal`,
 *    `1-(4-metilfenil)acetaldehído`, `dimetilformaldehído` → `propanona`):
 *    that C=O is a ketone's; the branch named as the student wrote it;
 * 1. `ALDEHYDE_CARBON` — the –CHO's carbon on the other side of the parent:
 *    `carbaldehído` after a chain (`butano-1-carbaldehído` → `pentanal`: on a
 *    chain the –CHO's carbon is a chain carbon, `-al`), or the –CHO's carbon
 *    taken as the student's chain beside a ring (`ciclohexilformaldehído`,
 *    `ciclohexilmetanal` → `ciclohexanocarbaldehído`, `fenilformaldehído` →
 *    `benzaldehído`: on a ring it is neither a ring carbon nor a chain); only
 *    when the student's –CHO groups are the engine's own (their carbons
 *    among the engine's suffix –CHO carbons; review of phase I-51c3b1): an
 *    `al` ending a side chain beside the ring's –CHO
 *    (`2-(4-formilciclohexil)etanal`), or a ring's `carbaldehído` beside a
 *    chain with more –CHO groups, is the parent choice, CARBONYL_PARENT;
 * 1. `CARBONYL_PREFIX` — HYDROXY_PREFIX's analogue: a C=O the engine cites in
 *    the suffix written by the student as a parent-level prefix whose own C=O
 *    it is (ownCarbonylOxygen(): an `oxo`, a `formil`, an acyl prefix), while
 *    the student's suffix cites fewer groups than the engine's
 *    (`2-oxopropano` → `propanona`, `formilciclohexano`, `formilbenceno` →
 *    `benzaldehído`, `5-oxopentanal` → `pentanodial`, `oxoacetaldehído` →
 *    `etanodial`, `2-formilbutano` → `2-metilbutanal`); the carbon of a
 *    `formil` or an acyl prefix then joins the engine's parent chain
 *    («Su carbono entra en la cadena principal»), and a student's ring
 *    parent becomes a branch (`acetilbenceno` → `1-feniletan-1-ona`,
 *    `butanoilciclohexano`, `4-acetiltolueno`, `2-acetilpentano` →
 *    `3-metilhexan-2-ona`, `1-acetilpentano-2,4-diona` →
 *    `heptano-2,4,6-triona`). With as many groups in the student's suffix as
 *    in the engine's, an acyl prefix's carbon belongs to a chain the chain
 *    rules compare (`4-propanoilheptano-2,6-diona` → CHAIN_LOCANTS at N0);
 * 1. `CARBONYL_PARENT` — HYDROXY_PARENT's place and data for the C=O groups
 *    (principalParent()): the student's parent is an open chain and the
 *    engine's the ring, or the reverse (`1-(2-oxociclohexil)propan-2-ona`, a
 *    tie: the ring; `(4-formilfenil)metano`, the ring; `(2-oxoetil)ciclohexano`,
 *    the chain); step `ringChain` (`benzene` or `ring` without a `RINGCHAIN`
 *    step);
 * 2. `MORE_CARBONYL_GROUPS` — MORE_HYDROXY_GROUPS's place for the C=O
 *    groups: P0 dropped the student's chain (`3-(2-oxopropil)hexan-2-ona`,
 *    `2-(2-oxoetil)propanal`, `3-(2-oxoetil)pentano`, `(4-acetilfenil)metano`),
 *    also before BRANCH_AT_END as for an alcohol (fewerPrincipalGroups());
 *    step `groupChain`;
 * 3–4. at N0, CHAIN_LOCANTS, NUMBERING and RING_NUMBERING with the C=O
 *    groups' phrases (DIAGNOSIS_PHRASES `carbonylN0`: `pentan-4-ona`,
 *    `hexano-3,5-diona`, `ciclohexan-3-ona`, `benceno-1,5-dicarbaldehído`,
 *    `5-acetilciclohexan-2-ona`, `4-propanoilheptano-2,6-diona`);
 * 9. NEEDLESS_LOCANTS for the suffix's locants with the C=O group's words
 *    (suffixWhat(): `ciclohexan-1-ona` → «…solo hay una manera de colocar el
 *    grupo C=O.», `ciclohexano-1-carbaldehído` → «…el grupo –CHO.»).
 *
 * A C=O check's draft has the student's chain and the engine's parent like
 * any other, so the stripe and its legend need nothing new (src/ui
 * unchanged); its focus is the C=O groups concerned (and the branch of
 * KETONE_NOT_ALDEHYDE, the prefixes of CARBONYL_PREFIX), its tiles the
 * student's suffix (CARBONYL_SENIORITY, KETONE_NOT_ALDEHYDE, ALDEHYDE_CARBON)
 * or prefix (CARBONYL_PREFIX). After the checks, a student's suffix of
 * another kind than the engine's is a null no case is known for (BEYOND); a
 * suffix with fewer groups than the engine's, or none, or other –CHO groups
 * than the engine's on the other side of a parent, goes on to the parent
 * choice and the rules, whose P0 names a chain with fewer C=O groups.
 *
 * The acyl prefixes (R-5c2: `acetil`, `propanoil`, `(but-2-enoil)`,
 * `(2-metilpropanoil)`, `benzoil`, `(4-metilbenzoil)`,
 * `(ciclohexanocarbonil)`) are carbon branches bonded by their C=O carbon,
 * and the rules read them as any branch: their C=O carbon lengthens a chain
 * they stand on the end of (BRANCH_AT_END: `6-acetilhexanal` →
 * `7-oxooctanal`, `4-(4-yodobenzoil)butanal` → `5-oxo-5-(4-yodofenil)pentanal`);
 * the chain rules follow the trace (LONGER_CHAIN, MORE_SUBSTITUENTS,
 * CHAIN_LOCANTS, NUMBERING), MORE_SUBSTITUENTS speaking of «sustituyentes»
 * since the acyl prefix's C=O is an `oxo` of any chain through its carbon
 * (hasHalogen(): `4-acetilhexanal` → `4-etil-5-oxohexanal`); the form rules
 * read their words — ALPHABETICAL_ORDER (`acetil` under a, `benzoil` under b,
 * `(2-metilpropanoil)` under m, `(ciclohexanocarbonil)` under c), UNGROUPED,
 * MULTIPLIER_KIND (bis before one with prefixes of its own only:
 * `bis(2-metilpropanoil)`, but `diacetil`, `di(prop-2-enoil)`) — and
 * NEEDLESS_LOCANTS the locant 1 before `carbonil` that the engine leaves out
 * (shortForm(): `(ciclohexano-1-carbonil)` → `(ciclohexanocarbonil)`, never on
 * a ring with a multiple bond or prefixes of its own). Their shapes for the
 * prefix style are the engine's acyl groups' (specShape(): the chain with the
 * oxo on its carbon 1; a ring's, the one-carbon chain of its C=O carbon with
 * the oxo and the ring).
 *
 * A branch's own name (phase R-5c3b2; branchNames(), after the parent's
 * rules 1–4 and before ALPHABETICAL_ORDER, with its rule number 5: a
 * branch's name decides the words the order reads; each opens «Nombra los
 * sustituyentes», `substituents`, which describes that branch). A
 * parent-level prefix whose words are not the engine's for the same atoms
 * (the naming's `prefix` part, on the same parent) is searched, from itself
 * inward, for a branch whose own name the engine writes otherwise; the
 * message quotes the two words of that parent-level prefix, without its
 * locants (`acetil`, `4-acetilfenil`: the engine's from its naming, never
 * retyped):
 *
 * - `ACYL_NAME` — an acyl group written in words the engine does not use
 *   for it: `etanoil` for `acetil` and `metanoil` for `formil`, the acyl
 *   groups with a name of their own («…tiene nombre propio, que la IUPAC
 *   (2013) prefiere…», as the explanation's acyl sentence says), or its C=O
 *   written `oxo` on an alkyl group, `(1-oxoetil)` for `acetil`,
 *   `(1-oxopropil)` for `propanoil`, `(ciclohexiloxometil)` for
 *   `(ciclohexanocarbonil)` (an acyl group's C=O is named by its ending,
 *   `-oil`, or `-carbonil` on a ring);
 * - `ACYL_CHAIN` — the chain of an acyl group written with `oil` is not the
 *   engine's: it starts at the C=O carbon, its carbon 1, and is chosen like
 *   any chain, the longest first (`(3-metilpropanoil)` for `butanoil`,
 *   `(2-etilpropanoil)` for `(2-metilbutanoil)`, `(2-etenilbutanoil)` for
 *   `(2-etilbut-3-enoil)`), when a criterion that compares no words decides
 *   (review of phase I-51c3b2: chains that tie but for their prefixes' words,
 *   `[4-bromo-2-(2-cloroetil)butanoil]`, get null);
 * - `BRANCH_RING_NUMBERING` — a ring in a branch (`fenil`, `ciclohexil`,
 *   `fenoxi`, `benzoil`, `…carbonil`) numbered otherwise than from the carbon
 *   by which it is bonded, 1, then with the lowest locants for its multiple
 *   bonds and prefixes, then by the alphabetical order (`(6-metilbenzoil)`,
 *   `(6-metilciclohexano-1-carbonil)`, `(ciclohexano-2-carbonil)`,
 *   `(ciclohexan-2-il)`, and on `acetaldehído`, which admits a phenyl
 *   (tiles.js templateAdmits()), `2-(5-metilfenil)acetaldehído`); compared on
 *   the molecule, each prefix by its structure, a benzene by the engine's
 *   recognition whatever its spelling (review of phase I-51c3b2: its Kekulé
 *   bonds never count, `(6-metilciclohexa-1,3,5-trien-1-il)` → «…sus enlaces
 *   dobles no cuentan para numerar»), the reason the first criterion that
 *   differs, and the alphabetical tie-break only when the student's own
 *   words lose it too (`2-cloro-6-(1,1-dimetiletil)…` stands, as on any tie).
 *   Not an aldehyde's or a ketone's alone:
 *   a ring branch hangs from a chain parent only beside a principal group (a
 *   second ring is refused, and a hydrocarbon's ring is its parent, «Rings»
 *   above), so an alcohol's ring branch gets it too
 *   (`2-(5-metilfenil)etan-1-ol`).
 *
 * Rule 9 gains two cases (R-5c3b2): NEEDLESS_LOCANTS on a traditional name
 * the engine writes without locants (traditionalLocants():
 * `2-fenilacetaldehído` → «El nombre tradicional «fenilacetaldehído» se
 * escribe sin números…», the alternative of `2-feniletanal`; step
 * `assemble`, which lists it; on carbon 1 the phenyl makes a ketone,
 * KETONE_NOT_ALDEHYDE), and MISSING_LOCANTS inside a branch for the locant 1
 * the engine writes before `carbonil` on a ring with a multiple bond or
 * prefixes of its own (carbonylLocant(): `(ciclohex-2-enocarbonil)`,
 * `(2-metilciclohexanocarbonil)`; step `substituents`), the reverse of
 * shortForm()'s needless 1, only when the 1 gives the engine's own words (not
 * `(ciclohexa-1,3,5-trienocarbonil)`, a benzene: `benzoil`).
 *
 * Still null for an aldehyde or a ketone, as for any family («No rule
 * covers» above): an alkyl branch's own chain or numbering, and a branch in a
 * prefix style the engine does not offer, unless a rule names another mistake
 * in it; and a benzene ring in a branch written with `ciclo` and numbered as
 * the engine numbers it (`(2-metilciclohexa-1,3,5-trien-1-il)`,
 * `(ciclohexa-1,3,5-trienocarbonil)`: the parent's BENZENE_RING has no branch
 * form). An alkoxy group on a –CHO's carbon makes an ester (`1-metoxipropanal`
 * → `propanoato de metilo`), which «Esters» below names (ESTER_GROUP, since
 * phase R-6a3a); an OH there makes an acid, which «Acids» below names
 * (ACID_GROUP).
 *
 * The retained carbonyl templates (R-5c3a) take SUBSTITUTED_TEMPLATE like
 * the benzene ones where the engine never writes them with prefixes: on a
 * ring template (a ftalaldehído takes any prefixes, so only the other ring
 * rules judge it: `5-metilftalaldehído` → RING_NUMBERING), and on a chain
 * template (`formaldehído`, `acetaldehído`, `acetona`, `acetofenona`,
 * `fenilacetaldehído`) through substitutedChainTemplate(), before the chain's
 * rules, its message naming no parent (`1-cloroacetona` → «El nombre
 * tradicional «acetona» no admite sustituyentes: … «1-cloropropan-2-ona».»).
 *
 * **Acids** (design.md §13.4 I-33, I-40a, I-40b, §15.8 R-5d; phases R-5d1,
 * R-5d2, R-5d3). The –COOH of `oico` (terminal by rule, as `al`),
 * `carboxílico` or `benzoico` is the principal group, senior to every other:
 * the engine's trace has P0 (most –COOH groups on the chain) and N0 (lowest
 * locants for them), and, with a ring, a `RINGCHAIN` step; the messages call
 * them «grupos –COOH», as the explanation does (DIAGNOSIS_PHRASES
 * `groupWords`). The rules keep working wherever they say something true of
 * an acid name: BRANCH_AT_END (`ácido 4-metilbutanoico`; a branch on the
 * –COOH's own carbon is VALENCE, never `otherName`), LONGER_CHAIN and the
 * other P1–P4 rules after a P0 tie (`ácido 2-etilpropanoico`), ETHER_SIDE
 * for those reasons (`ácido 2-(2-carboxietoxi)etanoico`), NUMBERING and
 * RING_NUMBERING at N1–N4 after an N0 tie (`ácido 4-metilhexanodioico`,
 * `ácido 5-metilciclohexano-1-carboxílico`, `ácido 6-metilbenzoico`),
 * BENZENE_RING (`ácido ciclohexa-1,3,5-trienocarboxílico`), the branch-name
 * rules (`ácido 2-(5-metilfenil)propanoico`), ALPHABETICAL_ORDER (`carboxi`
 * under c), UNGROUPED, MULTIPLIER_KIND, LOCANT_ORDER, the prefixes' NEEDLESS
 * and MISSING_LOCANTS, OLD_STYLE with the segment's or the suffix's words
 * (`ácido 2-butenoico` → «eno», `ácido 1,4-ciclohexanodicarboxílico` →
 * «dicarboxílico»), LETTER_LOCANTS. `carboxi` (a retained word, the engine's
 * carboxy prefix) has the engine's shape for the prefix style (`X:COOH`).
 * The class word `ácido` is no ether class name (classNameDiagnosis() reads
 * `éter` only).
 *
 * The acid's own mistakes (phase R-5d3) are checked first, before
 * HYDROXY_PREFIX (acidChecks(), in this order; an OH of a –COOH is never a
 * `hidroxi` the engine cites in the suffix), each opening «Reconoce el grupo
 * funcional» (`group`), which says the three atoms of a –COOH are one group,
 * how it is written (`ácido` first, `-oico`, `-carboxílico`, `ácido
 * benzoico`) and, beside other oxygen groups, the seniority
 * ácido > aldehído > cetona > alcohol (design.md §13.4 I-33). The codes are the C=O groups'
 * where their message holds, with the –COOH's words keyed by the group
 * (`group` 'acid': «grupo –COOH», «con la palabra «ácido» al principio del
 * nombre y la terminación «-oico» al final», DIAGNOSIS_PHRASES.ending()),
 * and the acid's own where it must differ:
 *
 * 1. `ACID_GROUP` — any –COOH of the molecule written as two groups on one
 *    carbon, its C=O and its OH apart (`1-hidroxipropanal`,
 *    `1-oxopropan-1-ol`, `1-hidroxi-1-oxopropano` → `ácido propanoico`;
 *    `(hidroxioxometil)ciclohexano`; `ácido 4-hidroxi-4-oxobutanoico` →
 *    `ácido butanodioico`): no acid suffix and no `carboxi` of the student's
 *    has that carbon (moleculeCarboxyls(), studentCarboxylCarbons(),
 *    acidSplit()); the three atoms are one group, and the –COOH groups are
 *    the principal group — or, when the split –COOH is none of the engine's
 *    suffix groups, it is named with the prefix `carboxi` and the ending is
 *    the other –COOH groups' (review of phase I-51d3:
 *    `1-hidroxi-2-(4-carboxiciclohexil)etanal`, `ácido
 *    4-(2-hidroxi-2-oxoetil)ciclohexano-1-carboxílico`). Checked first, so
 *    no later message claims an aldehyde, a ketone or an alcohol that is
 *    really part of a –COOH;
 * 1. `CARBONYL_SENIORITY` — the student's suffix is a junior group's beside
 *    the –COOH, with the seniority ácido > aldehído > cetona > alcohol
 *    (`4-carboxibutan-2-ona` → `ácido 4-oxopentanoico`, `3-carboxipropanal` →
 *    `ácido 4-oxobutanoico`, `4-carboxifenol` → `ácido 4-hidroxibenzoico`,
 *    `4-carboxibenzaldehído` → `ácido 4-formilbenzoico`): an aldehyde's –CHO
 *    becomes `oxo` when its carbon is the parent's, `formil` when it hangs
 *    from it (juniorPrefix());
 * 1. `KETONE_NOT_ALDEHYDE` — an `al` beside the –COOH whose carbon a branch
 *    bonds to a second carbon (`1-carboxibutanal` → `ácido
 *    2-oxopentanoico`): no aldehyde at all, so CARBONYL_SENIORITY leaves it
 *    to this message rather than speak of «el –CHO del aldehído»;
 * 1. `ACID_CARBON` — ALDEHYDE_CARBON's twin: the –COOH's carbon on the other
 *    side of the parent, `carboxílico` after a chain (`ácido
 *    propano-1-carboxílico` → `ácido butanoico`, `ácido
 *    butano-1,4-dicarboxílico` → `ácido hexanodioico`), or the –COOH's carbon
 *    taken as the student's chain beside a ring (`ácido ciclohexilmetanoico`
 *    → `ácido ciclohexanocarboxílico`, `ácido fenilmetanoico`, the templates
 *    `ácido fenilfórmico`, `ácido (4-metilfenil)fórmico` → `ácido benzoico`,
 *    `ácido 4-metilbenzoico`); only when the student's –COOH groups are the
 *    engine's own (groupCarbon());
 * 1. `CARBONYL_PREFIX` — a principal –COOH written as a parent-level
 *    `carboxi` (ownCarbonylOxygen()), while the student's suffix cites fewer
 *    –COOH groups than the engine's or none (`carboxiciclohexano`,
 *    `carboxibenceno`, `4-carboxitolueno` → `ácido 4-metilbenzoico`, `ácido
 *    2-carboxiciclohexano-1-carboxílico`, the template `ácido
 *    4-carboxiftálico` → `ácido benceno-1,2,4-tricarboxílico`); on a chain its
 *    carbon joins the parent (`1-carboxipropano` → `ácido butanoico`, `ácido
 *    3-carboxipropanoico` → `ácido butanodioico`, `ácido 2-carboxiacético` →
 *    `ácido propanodioico`: «Su carbono entra en la cadena principal»);
 * 1. `CARBONYL_PARENT` — the ring or the chain chosen by the –COOH groups
 *    (principalParent(): `ácido 4-(1,2-dicarboxietil)ciclohexano-1-carboxílico`
 *    → `ácido 2-(4-carboxiciclohexil)butanodioico`, the chain with more;
 *    `ácido 2-(4-carboxiciclohexil)etanoico`, a tie, the ring;
 *    `(4-carboxifenil)metano`, `(2-carboxietil)ciclohexano`);
 * 2. `MORE_CARBONYL_GROUPS` — another chain with more –COOH groups (P0:
 *    `ácido 3-(carboximetil)pentanoico` → `ácido 3-etilpentanodioico`,
 *    `3-(carboximetil)pentano`), told from the ether oxygen as ETHER_SIDE
 *    (`(2-carboxietoxi)metano` → `ácido 3-metoxipropanoico`);
 * 4. `RING_NUMBERING` at N0 with the –COOH groups' phrase (`ácido
 *    ciclohexano-1,5-dicarboxílico`, `ácido benceno-1,5-dicarboxílico`,
 *    `ácido ciclohexano-2-carboxílico`); NUMBERING and CHAIN_LOCANTS at N0
 *    have the phrase too, though no acid name reaches them (a –COOH's carbon
 *    is always an end of a chain, locant 1 or the last, and `oico` puts it at
 *    1);
 * 9. NEEDLESS_LOCANTS for the suffix's locants with the –COOH's words
 *    (suffixWhat(): `ácido ciclohexano-1-carboxílico`, `ácido
 *    benceno-1-carboxílico` → «…solo hay una manera de colocar el grupo
 *    –COOH.»), and MISSING_LOCANTS names the –COOH groups when the suffix's
 *    locant is the one missing (missingLocants(); alone it is the verdict
 *    `missingLocants`, and no later rule meets it on an acid, so only
 *    diagnose() called on such a verdict says it).
 *
 * After the checks the student's suffix is an acid's (every other suffix is
 * junior to it): with fewer or other –COOH groups than the engine's it goes on
 * to the parent choice and the rules; a student's ester suffix beside the
 * –COOH is a junior group (CARBONYL_SENIORITY, R-6a3a, «Esters» below). The
 * one null left (BEYOND, never seen; tested with a made-up naming): a
 * student's acid suffix while the engine's principal group is no –COOH (an
 * acid's –COOH is the most senior group the app names).
 *
 * The retained acid names (R-5d2: `ácido fórmico`, `ácido acético`, `ácido
 * oxálico`, `ácido fenilacético`, the ftálicos; tiles.js isAcidTemplate())
 * are carbonyl templates whose word places the –COOH groups, so they need no
 * rule of their own: SUBSTITUTED_TEMPLATE speaks where the engine never
 * writes the prefixes (substitutedChainTemplate(): `ácido 2-cloroacético` →
 * «El nombre tradicional «ácido acético» no admite sustituyentes: …
 * «ácido 2-cloroetanoico».», `ácido metilfórmico`, `ácido
 * 2-clorofenilacético`; a prefix on `oxálico` never builds: its two carbons
 * are full), the ftálicos and a phenyl on `acético` (tiles.js
 * templateAdmits()) are judged by the other rules (`ácido 5-metilftálico` →
 * RING_NUMBERING, `ácido 2-(5-metilfenil)acético` → BRANCH_RING_NUMBERING),
 * and the locant the engine leaves out of `ácido fenilacético`, written, is
 * traditionalLocants()'s NEEDLESS_LOCANTS (`ácido 2-fenilacético`). A
 * template whose –COOH groups are not the engine's gets the acid's own
 * checks, acidChecks() coming first (ACID_CARBON, CARBONYL_PREFIX above).
 *
 * **Esters** (design.md §13.4 I-35, I-39c, I-40d, I-45c, §15.8 R-6a; phases
 * R-6a1, R-6a2a — the retained names —, R-6a2b — the ester prefixes —,
 * R-6a3a). The –COO– of `oato` (terminal by rule, as `oico`), `carboxilato`
 * or `benzoato` is the principal group, junior to an acid's –COOH only
 * (naming/seniority.js: ácido > éster > aldehído > cetona > alcohol); the
 * engine's trace has P0 (most –COO– groups on the chain) and N0, and the
 * parent is the acid part, the O-bound groups words of their own after
 * ` de `; the messages call them «grupos –COO–», as the explanation does
 * (DIAGNOSIS_PHRASES `groupWords`). The rules keep working wherever they say
 * something true of an ester name, on its acid part: BRANCH_AT_END
 * (`4-metilbutanoato de metilo`), LONGER_CHAIN and the other P1–P4 rules
 * (`2-etilpropanoato de metilo`), NUMBERING and RING_NUMBERING at N1–N4
 * (`3-metilbutanodioato de dimetilo`, `6-metilbenzoato de etilo`,
 * `5-metilciclohexano-1-carboxilato de metilo`), BENZENE_RING
 * (`ciclohexa-1,3,5-trienocarboxilato de metilo`), the branch-name rules
 * (`2-(5-metilfenil)etanoato de metilo`), ALPHABETICAL_ORDER, UNGROUPED,
 * MULTIPLIER_KIND, LOCANT_ORDER, the prefixes' NEEDLESS and MISSING_LOCANTS,
 * OLD_STYLE with the segment's or the suffix's words (`2-butenoato de
 * metilo` → «eno», `1,4-ciclohexanodicarboxilato de dimetilo` →
 * «dicarboxilato»), LETTER_LOCANTS. They read the acid part only: the
 * O-bound side is not one of the name's prefixes (branchOccurrences(),
 * prefixLists(), chainNodes() never see it; oBoundOccurrences() reads its
 * groups for the student's –COOH and –COO– groups), so the prefix style is
 * the acid part's.
 *
 * The ester's own mistakes (phase R-6a3a) are checked first, with the
 * acid's (esterChecks(), when the engine's principal group is an ester's;
 * acidChecks() when it is an acid's, the two never meet), in the acid's
 * order, each opening «Reconoce el grupo funcional» (`group`), which says the
 * three atoms of a –COO– are one group, how it is written (`-oato`,
 * `-carboxilato`, `benzoato`, then `de` and the O-bound group in `-ilo`) and,
 * beside other oxygen groups, the seniority. The codes are the C=O groups'
 * where their message holds, with the –COO–'s words keyed by the group
 * (`group` 'ester': «grupo –COO–», «con la terminación «-oato» y, después de
 * «de», el grupo unido al otro oxígeno, acabado en «-ilo»»,
 * DIAGNOSIS_PHRASES.ending()), and the ester's own where it must differ:
 *
 * 1. `ESTER_GROUP` — ACID_GROUP's twin: a –COO– of the engine's suffix
 *    written as two groups on one carbon, its C=O and its bridge oxygen with
 *    the group bonded to it apart (`1-metoxipropanal`,
 *    `1-metoxi-1-oxopropano` → `propanoato de metilo`;
 *    `3-metoxi-3-oxopropan-1-ol` → `3-hidroxipropanoato de metilo`;
 *    `4-metoxi-4-oxobutanoato de metilo` → `butanodioato de dimetilo`): no
 *    ester suffix and no ester prefix of the student's has that carbon
 *    (studentEsterCarbons(), esterSplit()). Only the engine's suffix groups:
 *    beside an acid the engine itself writes an ester whose C=O carbon is a
 *    chain carbon as `oxo` and an `-oxi` prefix;
 * 1. `CARBONYL_SENIORITY` — a junior suffix beside the –COO–
 *    (`3-(metoxicarbonil)pentan-2-ona` → `2-etil-3-oxobutanoato de metilo`),
 *    the junior groups in the O-bound group's name when their carbons are
 *    its (`2-(acetiloxi)heptanal` → «…va en el nombre del grupo unido al otro
 *    oxígeno, con el prefijo «oxo»», `etanoato de 1-oxoheptan-2-ilo`;
 *    juniorPlacement()); and a student's ester suffix beside an acid's
 *    –COOH, the junior `ester` (acidChecks(): `4-carboxibutanoato de metilo`
 *    → «…con dos prefijos con el mismo número: «oxo» … y uno acabado en
 *    «-oxi» …», `ácido 5-metoxi-5-oxopentanoico`; `etanoato de
 *    2-carboxietilo` → «…con el prefijo «acetiloxi»»), with the seniority
 *    ácido > éster > aldehído > cetona > alcohol;
 * 1. `KETONE_NOT_ALDEHYDE` — an `al` beside the –COO– on a carbon a branch
 *    bonds to a second carbon (`3-(acetiloxi)-1-metilpropanal`);
 * 1. `ESTER_CARBON` — ACID_CARBON's twin (groupCarbon()): `carboxilato`
 *    after a chain (`propano-1-carboxilato de metilo` → `butanoato de
 *    metilo`), or the –COO–'s carbon taken as the student's chain beside a
 *    ring (`ciclohexilmetanoato de metilo` → `ciclohexanocarboxilato de
 *    metilo`, `fenilmetanoato de metilo`, the template `fenilformiato de
 *    metilo` → `benzoato de metilo`, `(4-clorofenil)formiato de metilo`);
 * 1. `CARBONYL_PREFIX` — a principal –COO– written as an ester prefix while
 *    the student's ester suffix cites fewer –COO– groups (esterPrefix()): an
 *    alkoxycarbonyl prefix of the parent (`(metoxicarbonil)benceno` →
 *    `benzoato de metilo`; on a chain its carbon joins the parent,
 *    `1-(metoxicarbonil)propano` → `butanoato de metilo`,
 *    `3-(metoxicarbonil)propanoato de metilo` → `butanodioato de dimetilo`;
 *    one inside a compound branch is the parent choice below, as a `carboxi`
 *    is), or an acyloxy prefix at any depth, whose acyl group is the acid part
 *    and the student's chain or ring the O-bound group's (`(acetiloxi)metano`
 *    → `etanoato de metilo`, `(benzoiloxi)benceno` → `benzoato de fenilo`,
 *    `[2-(acetiloxi)etil]benceno` → `etanoato de 2-feniletilo`: «Tu cadena va
 *    en el grupo unido al otro oxígeno, después de «de».»; the parent-choice
 *    messages would make that ring «una rama»);
 * 1. `CARBONYL_PARENT` — the ring or the chain chosen by the –COO– groups
 *    (`[(metoxicarbonil)metil]ciclohexano` → `2-ciclohexiletanoato de
 *    metilo`, `[4-(metoxicarbonil)fenil]metano` → `4-metilbenzoato de
 *    metilo`);
 * 1. `ESTER_IN_CHAIN` — BRANCH_AT_END's twin beside an acid (branchAtEnd()):
 *    an alkoxycarbonyl prefix on an end of the student's chain, whose C=O
 *    carbon the engine takes into the chain and writes as `oxo` and an `-oxi`
 *    prefix (`ácido 3-(metoxicarbonil)propanoico` → `ácido
 *    4-metoxi-4-oxobutanoico`); step `groupChain`, which says the ester's
 *    carbon is a carbon of the chain;
 * 2. `MORE_CARBONYL_GROUPS` — another chain with more –COO– groups (P0:
 *    `2-[(metoxicarbonil)metil]propanoato de metilo` → `2-metilbutanodioato
 *    de dimetilo`, `3-[(metoxicarbonil)metil]pentano`), told from an ether
 *    oxygen as ETHER_SIDE (`[2-(metoxicarbonil)etoxi]metano` →
 *    `3-metoxipropanoato de metilo`);
 * 4. `RING_NUMBERING` at N0 with the –COO– groups' phrase
 *    (`ciclohexano-1,5-dicarboxilato de dimetilo`, `ciclohexano-2-carboxilato
 *    de metilo`); NUMBERING and CHAIN_LOCANTS at N0 have the phrase too,
 *    though no ester name reaches them (an ester's –COO– carbon ends a chain,
 *    as an acid's –COOH);
 * 9. NEEDLESS_LOCANTS for the suffix's locants (`ciclohexano-1-carboxilato
 *    de metilo`, `benceno-1-carboxilato de metilo` → «…solo hay una manera de
 *    colocar el grupo –COO–.»), and MISSING_LOCANTS names the –COO– groups
 *    when the suffix's locant is the one missing (as for an acid, only
 *    diagnose() on a `missingLocants` verdict says it).
 *
 * The O-bound side (phase R-6a3b): the words after ` de `, one word per
 * group (or one with its multiplier), each named like a branch ending in
 * `-ilo`. When it is none the engine writes for the molecule, in any style it
 * offers (esterSideDiffers(); not compared when the student's suffix cites
 * another number of –COO– groups, whose O-bound groups differ for that
 * reason: the number is the mistake, ESTER_GROUP or CARBONYL_PREFIX), the
 * O-bound checks name the mistake (oBoundChecks()), right after the ester
 * checks above and before the parent choice, whatever the acid part says
 * (`4-metilbutanoato de propan-1-ilo` → NEEDLESS_LOCANTS, not BRANCH_AT_END):
 * the explanation separates the two parts of the ester («Separa las dos
 * partes del éster», `ester`; «Separa las partes del diéster», `diester`)
 * right after the group step, before it looks for the chain. Each group is
 * compared on the molecule with the engine's group of the same atoms (seen
 * from its bridge oxygen, in every style offered: oBoundGroups()); the
 * codes are those of the rule whose message holds, with the O-bound side's
 * words (`oBound`), and new ones where none does; each opens the ester step
 * (or the diester's), which names the groups and says how two are written:
 *
 * 1. `ESTER_TRADITIONAL` (rule 2, beside SUBSTITUTED_TEMPLATE) — a retained
 *    ester word whose molecule the engine gives a traditional name, with an
 *    O-bound side the engine writes in another of its names only: the engine
 *    renders the traditional name from its main naming, in the default style
 *    (`acetato de propan-2-ilo`, `acetato de 1-metiletilo` → «…solo lo uso
 *    con el nombre del grupo unido al oxígeno que doy primero, «isopropilo»:
 *    «acetato de isopropilo». Con «propan-2-ilo», la primera palabra es la
 *    sistemática: «etanoato de propan-2-ilo».»); step `assemble`, which lists
 *    both names among the valid forms;
 * 2. the groups' own names, in the student's order, the first group none the
 *    engine writes: `BRANCH_RING_NUMBERING` with `oBound` (a ring numbered
 *    otherwise than from the carbon bonded to the oxygen: `etanoato de
 *    6-metilfenilo` → «2-metilfenilo»; branchRingNumbering() on the group)
 *    and `ESTER_ALKYL_CHAIN` (rule 5; its chain not the longest through the
 *    carbon bonded to the oxygen, `acetato de 1,2-dimetilpropilo` →
 *    «3-metilbutan-2-ilo», `etanoato de 1-metilpropilo`; nor the one with the
 *    most multiple bonds, `2-etenilbutilo`, then the most double bonds,
 *    `3-etenilhex-1-in-3-ilo`; or numbered so that this carbon
 *    does not get the lowest locant, `etanoato de butan-3-ilo` → «butan-2-ilo»,
 *    then its multiple bonds and prefixes, `4-metilpentan-3-ilo`), compared on
 *    the molecule as ACYL_CHAIN compares an acyl chain (alkylChainCriteria());
 *    then the branch-name checks on the branches inside the group
 *    (oBoundInner(): `etanoato de 2-(6-metilfenil)etilo` →
 *    BRANCH_RING_NUMBERING, «2-(2-metilfenil)etilo»). The engine's group is
 *    named in the group's own ester (oBoundMolecule()), as the engine does
 *    beside a second ring (`benzoato de 6-metilfenilo`);
 * 3. the side's form, as rules 5–7 read prefixes: `ALPHABETICAL_ORDER` with
 *    `oBound` (two different groups out of order, read as the engine cites
 *    them, as branches: `propanodioato de metilo y etilo` → «etilo y
 *    metilo», with the `tert-` hint), `UNGROUPED` with `oBound` (the same
 *    group written twice, `butanodioato de metilo y metilo` → «dimetilo», the
 *    engine's side in the student's style: `di(propan-2-ilo)`) and
 *    `MULTIPLIER_KIND` with `oBound` (`di(2-cloroetilo)` → «bis(2-cloroetilo)»,
 *    `bismetilo` → «dimetilo»: bis before a group with prefixes of its own,
 *    render.js esterAlkylParts());
 * 4. `NEEDLESS_LOCANTS` with `oBound` (rule 9's short forms on the group:
 *    `propan-1-ilo` → «propilo», `metan-1-ilo`, `ciclohexan-1-ilo`,
 *    `1-clorometilo`; oBoundShortForm());
 * 5. `ESTER_ALKYL_NAME` (rule 5) — any other group none the engine writes,
 *    with the engine's words for it (a style it does not offer for the group,
 *    `1,1-dimetiletilo` for `tert-butilo`; its own prefixes' order or grouping,
 *    `4-metil-2-clorofenilo`), as the ester step names it.
 *
 * Their rule numbers are those of the rule each parallels (they only place
 * the new codes in DIAGNOSES, as the class names'). The one null left
 * (BEYOND, never seen in the sweeps): a side that mixes the engine's styles, each group the
 * engine's in one of them (`pentanodioato de isopropilo y
 * 4-(propan-2-il)fenilo`, `propanodioato de 1,1-dimetiletilo y isopropilo`),
 * which no rule names, as for a name in two prefix styles.
 *
 * The retained ester names (R-6a2a: `formiato`, `acetato`, `fenilacetato`;
 * tiles.js isEsterTemplate()) are chain templates whose word places the
 * –COO–, so they need no rule of their own, as the retained acids:
 * SUBSTITUTED_TEMPLATE speaks where the engine never writes the prefixes
 * (substitutedChainTemplate(): `2-cloroacetato de metilo` → «El nombre
 * tradicional «acetato» no admite sustituyentes: … «2-cloroetanoato de
 * metilo».», `metilformiato de metilo` → «etanoato de metilo»); a phenyl on
 * `acetato` (templateAdmits()) is judged by the other rules
 * (`2-(5-metilfenil)acetato de etilo` → BRANCH_RING_NUMBERING), and the
 * locant `fenilacetato` leaves out, written, is traditionalLocants()'
 * NEEDLESS_LOCANTS (`2-fenilacetato de metilo`). The –COO–'s carbon on the
 * other side of a ring is ESTER_CARBON (`fenilformiato de metilo` →
 * `benzoato de metilo`); an O-bound side the engine does not write beside the
 * retained word is the O-bound checks' above (`acetato de propan-1-ilo` →
 * NEEDLESS_LOCANTS; `acetato de propan-2-ilo`, the traditional word with the
 * IUPAC-preferred group, ESTER_TRADITIONAL, since the engine writes `acetato
 * de isopropilo` only). An aryl prefix in another style than the engine's default beside
 * `acetato` (`2-[4-(propan-2-il)fenil]acetato de metilo`) stays null, no
 * ester's own mistake: as on the retained aldehyde and acid
 * (`2-[4-(propan-2-il)fenil]acetaldehído`), no rule covers a retained word's
 * prefix style.
 *
 * The ester prefixes (R-6a2b: an acyloxy prefix, `acetiloxi`,
 * `[(2-metilpropanoil)oxi]`, and an alkoxycarbonyl prefix, `metoxicarbonil`,
 * `[(propan-2-iloxi)carbonil]`; beside an acid, the only principal group the
 * engine puts above an ester) are read as prefixes like an alkoxy prefix,
 * so the rules read them as any prefix: their shape for the prefix style
 * (specShape(): an acyloxy group's acyl shape after `O:`, an alkoxycarbonyl
 * group's one carbon with its oxo and its alkoxy group, as the engine's
 * structures), a hetero group for rule 1 (an alkoxycarbonyl prefix on an end
 * beside an acid is ESTER_IN_CHAIN, above), ALPHABETICAL_ORDER under their
 * whole word (`acetiloxi` under a), UNGROUPED, MULTIPLIER_KIND with `bis`
 * (an alkoxycarbonyl prefix is a C=O carbon with groups of its own,
 * MULTIPLIER_KIND's reason; an acyloxy prefix an `oxi` prefix that is not
 * shortened, ALKOXY_MULTIPLIER's), NEEDLESS_LOCANTS inside them
 * (`[(propan-1-iloxi)carbonil]`), and the branch-name rules on their inner
 * acyl chain (ACYL_CHAIN: `[(3-metilpropanoil)oxi]`) and ring
 * (BRANCH_RING_NUMBERING: `[(6-metilbenzoil)oxi]`, `[(6-metilfenoxi)carbonil]`;
 * the engine's words with the opening mark its parts keep apart, partText()).
 * Beside no group senior to an ester the molecule is the ester itself: the
 * principal group's checks above (CARBONYL_PREFIX, CARBONYL_SENIORITY). An
 * ester prefix's own words (phase R-6a3b), first of the branch-name checks:
 * `ESTER_PREFIX_NAME` (rule 5) — the engine's ester prefix written as
 * another kind of branch, an acyloxy group as an alkoxy group with an `oxo`
 * (`(1-oxoetoxi)` → «acetiloxi», `(1-oxometoxi)` → «formiloxi»), an
 * alkoxycarbonyl group as a substituted methyl (`[(metoxi)oxometil]` →
 * «metoxicarbonil»): the message says how the explanation forms the two
 * kinds («aciloxi-»: the acyl group + `oxi`; «alcoxicarbonil-»: the alkoxy
 * prefix + `carbonil»), quoting the engine's part of it and the two words of
 * the parent-level prefix as ACYL_NAME does (esterPrefixName(); the reverse,
 * an ester prefix of the student's the engine names otherwise on the same
 * atoms, cannot happen: BEYOND); and `ACYL_NAME` for an acyloxy group's acyl
 * part with the general rule's word (`(etanoiloxi)` → «…«acetil», no
 * «etanoil». Se escribe «acetiloxi», no «etanoiloxi».»). Both open «Nombra
 * los sustituyentes», which describes the ester prefix.
 *
 * An ether class name whose oxygen is the bridge oxygen of one of the
 * engine's suffix –COO– groups (`(1-oxoetil) metil éter` → `etanoato de
 * metilo`; review of phase I-51c1) is `ESTER_CLASS_NAME` (rule 1, beside
 * ESTER_GROUP, its twin; esterClassNameDiagnosis(), before the class-name
 * rules): the oxygen and the C=O are one group, the molecule an ester, not an
 * ether, and how the engine writes the –COO– groups; step `group`; no
 * student's chain, as on any class name.
 *
 * **Nitriles** (design.md §13.4 I-38, I-39a, I-40c, §15.8 R-6b; phases
 * R-6b1, R-6b2 — the retained names —, R-6b3). The –C≡N of `nitrilo`
 * (terminal by rule, as `oico`: its carbon is the chain's end carbon),
 * `carbonitrilo` or `benzonitrilo` is the principal
 * group below an acid, an ester or an amide (naming/seniority.js: ácido >
 * éster > amida > nitrilo > aldehído > cetona > alcohol > amina); the
 * engine's trace has P0 (most –C≡N groups on the chain) and N0, and, with a
 * ring, a `RINGCHAIN` step; the messages call them «grupos –C≡N», as the
 * explanation does (DIAGNOSIS_PHRASES `groupWords`; the parser's and the
 * builder's messages keep their «grupo C≡N»). The rules keep working wherever
 * they say something true of a nitrile name: BRANCH_AT_END (`4-metilbutanonitrilo` →
 * `pentanonitrilo`), LONGER_CHAIN and the other P1–P4 rules after a P0 tie
 * (`2-etilpropanonitrilo`), NUMBERING and RING_NUMBERING at N1–N4 after an
 * N0 tie (`5-metilciclohexano-1-carbonitrilo`, `6-metilbenzonitrilo`),
 * BENZENE_RING (`ciclohexa-1,3,5-trienocarbonitrilo`), the branch-name rules
 * (`2-(5-metilfenil)etanonitrilo`), ALPHABETICAL_ORDER (`ciano` under c,
 * `3-ciano-2-cloro…`), UNGROUPED, MULTIPLIER_KIND, LOCANT_ORDER, the
 * prefixes' NEEDLESS and MISSING_LOCANTS, OLD_STYLE (`2-butenonitrilo` →
 * «eno»), LETTER_LOCANTS. `ciano` (a retained word, the engine's cyano
 * prefix, I-39a) has the engine's shape for the prefix style (`X:CN`), is a
 * hetero group for rule 1 (its carbon is never a carbon of the chain it
 * hangs from, so on an end it never lengthens it: isHeteroGroup()) and a
 * «sustituyente» for P4 (hasHalogen()); beside an acid or an ester it is
 * read as any prefix (`ácido 3-ciano-2-metilbutanoico`).
 *
 * The nitrile's own mistakes (phase R-6b3) are checked first, with the
 * acid's and the ester's (nitrileChecks(), when the engine's principal group
 * is a –C≡N; the three never meet), in the acid's order, each opening
 * «Reconoce el grupo funcional» (`group`), which says the –C≡N is one group
 * whose triple bond is no alkyne's, how it is written (`-nitrilo`,
 * `-carbonitrilo`, `benzonitrilo`) and, beside other groups, the seniority.
 * The codes are the C=O groups' where their message holds — a –C≡N has no
 * C=O, but the student reads only the message, which names the –C≡N —, with
 * its words keyed by the group (`group` 'nitrile', NAMED_GROUPS: «grupo
 * –C≡N», «con la terminación «-nitrilo», al final del nombre»,
 * DIAGNOSIS_PHRASES.ending()), and the nitrile's own where it must differ:
 *
 * 1. `CARBONYL_SENIORITY` — a junior suffix beside the –C≡N, with the whole
 *    seniority ácido > éster > amida > nitrilo > aldehído > cetona > alcohol
 *    > amina as the nitrile's group step says it (`4-cianobutan-2-ona` →
 *    `4-oxopentanonitrilo`, `4-cianofenol` → `4-hidroxibenzonitrilo`,
 *    `4-cianobenzaldehído` → `4-formilbenzonitrilo`); and a student's nitrile
 *    suffix beside an acid's –COOH or an ester's –COO–, the junior `nitrile`
 *    (acidChecks(), esterChecks(): `3-carboxipropanonitrilo` → `ácido
 *    3-cianopropanoico`, `2-(acetiloxi)etanonitrilo` → `etanoato de
 *    cianometilo`), with the seniority those groups' steps give beside a
 *    `ciano` (ácido > nitrilo > aldehído > cetona > alcohol; with an ester,
 *    ácido > éster > nitrilo > …): the –C≡N becomes `ciano` (juniorPrefix()),
 *    which includes its carbon, so that carbon — the student's `nitrilo` made
 *    it carbon 1 — no longer counts in the chain («…con el prefijo «ciano»,
 *    que incluye su carbono: ese carbono no se cuenta en la cadena
 *    principal», DIAGNOSIS_PHRASES `cyanoCarbon`; on a ring, «en el anillo»;
 *    in an ester's O-bound group, «en la cadena de ese grupo»), never the
 *    acid's words for an `oxo`, whose carbon stays in the chain;
 * 1. `KETONE_NOT_ALDEHYDE` — an `al` beside the –C≡N on a carbon a `ciano` or
 *    a carbon branch bonds to a second carbon (`1-cianobutanal` →
 *    `2-oxopentanonitrilo`);
 * 1. `NITRILE_CARBON` — ESTER_CARBON's twin (groupCarbon()): `carbonitrilo`
 *    after a chain (`propano-1-carbonitrilo` → `butanonitrilo`,
 *    `butano-1,4-dicarbonitrilo` → `hexanodinitrilo`), or the –C≡N's carbon
 *    taken as the student's chain beside a ring (`ciclohexilmetanonitrilo` →
 *    `ciclohexanocarbonitrilo`, `fenilmetanonitrilo` → `benzonitrilo`); only
 *    when the student's –C≡N groups are the engine's own;
 * 1. `CARBONYL_PREFIX` — a principal –C≡N written as a parent-level `ciano`
 *    (ownGroupAtom()) while the student's suffix cites fewer –C≡N groups or
 *    none (`cianometano` → `etanonitrilo`, `cianobenceno` → `benzonitrilo`,
 *    `4-cianotolueno` → `4-metilbenzonitrilo`, `4-cianobutanonitrilo` →
 *    `pentanodinitrilo`); on a chain its carbon joins the parent («Su carbono
 *    entra en la cadena principal»: the carbon a `ciano` includes is the
 *    chain's carbon 1 once the –C≡N is the suffix);
 * 1. `CARBONYL_PARENT` — the ring or the chain chosen by the –C≡N groups
 *    (`(2-cianoetil)ciclohexano` → `3-ciclohexilpropanonitrilo`,
 *    `2-(4-cianociclohexil)etanonitrilo`, a tie, the ring;
 *    `(4-cianofenil)metano` → `4-metilbenzonitrilo`);
 * 2. `MORE_CARBONYL_GROUPS` — another chain with more –C≡N groups (P0:
 *    `2-(cianometil)butanonitrilo` → `2-etilbutanodinitrilo`,
 *    `3-(cianometil)pentano`), told from an ether oxygen as ETHER_SIDE
 *    (`(2-cianoetoxi)metano` → `3-metoxipropanonitrilo`);
 * 4. `RING_NUMBERING` at N0 with the –C≡N groups' phrase
 *    (`ciclohexano-1,5-dicarbonitrilo`, `benceno-1,5-dicarbonitrilo`,
 *    `ciclohexano-2-carbonitrilo`); NUMBERING and CHAIN_LOCANTS at N0 have
 *    the phrase too, though no nitrile name reaches them (a –C≡N's carbon
 *    ends a chain, and `nitrilo` puts it at 1, as an acid's –COOH);
 * 9. NEEDLESS_LOCANTS for the suffix's locants (`ciclohexano-1-carbonitrilo`,
 *    `benceno-1-carbonitrilo` → «…solo hay una manera de colocar el grupo
 *    –C≡N.»), and MISSING_LOCANTS names the –C≡N groups when the suffix's
 *    locant is the one missing (as for an acid, only diagnose() on a
 *    `missingLocants` verdict says it).
 *
 * No check splits a –C≡N in two, as ACID_GROUP and ESTER_GROUP split theirs:
 * no tile writes its nitrogen apart. With the suffix's locant left out
 * (`5,2-dimetilbencenocarbonitrilo`), a placement that numbers the –C≡N
 * otherwise is RING_NUMBERING at N0 (rule 4), so the kindest reading names
 * the other mistake, as an acid's does (LOCANT_ORDER). The one null left
 * (BEYOND, never seen; tested with a made-up naming): a student's nitrile
 * suffix while the engine's principal group is junior to a –C≡N (a student's
 * `nitrilo` builds a –C≡N, which only an acid's or an ester's group outranks
 * among the groups the tiles write).
 *
 * The retained nitrile names (R-6b2: `acetonitrilo`, `fenilacetonitrilo`,
 * `ftalonitrilo`; tiles.js isNitrileTemplate()) are templates whose word
 * places the –C≡N groups, so they need no rule of their own, as the retained
 * acids: SUBSTITUTED_TEMPLATE speaks where the engine never writes the
 * prefixes (substitutedChainTemplate(): `2-cloroacetonitrilo` → «El nombre
 * tradicional «acetonitrilo» no admite sustituyentes: … «2-cloroetanonitrilo».»,
 * `metilacetonitrilo`, `2-clorofenilacetonitrilo`), `ftalonitrilo` with any
 * prefixes and a phenyl on `acetonitrilo` (tiles.js templateAdmits()) are
 * judged by the other rules (`5-metilftalonitrilo` → RING_NUMBERING at N1,
 * `2-(5-metilfenil)acetonitrilo` → BRANCH_RING_NUMBERING), and the locant the
 * engine leaves out of `fenilacetonitrilo`, written, is traditionalLocants()'s
 * NEEDLESS_LOCANTS (`2-fenilacetonitrilo`). A template whose –C≡N groups are
 * not the engine's gets the nitrile's own checks before SUBSTITUTED_TEMPLATE
 * (nitrileChecks() first, as the retained acids' acidChecks()): another –C≡N
 * written `ciano` beside the word is CARBONYL_PREFIX (`2-cianoacetonitrilo` →
 * `propanodinitrilo`, `4-cianoftalonitrilo` →
 * `benceno-1,2,4-tricarbonitrilo`), and the word beside a senior group the
 * acid's CARBONYL_SENIORITY with the junior `nitrile` (`2-carboxiacetonitrilo`
 * → `ácido 2-cianoetanoico`, `4-carboxiftalonitrilo` → `ácido
 * 3,4-dicianobenzoico`). No retained nitrile word puts the –C≡N's carbon on
 * the other side of a parent (the engine has no `formonitrilo`), so
 * NITRILE_CARBON never meets them.
 *
 * Amines (R-6c1, phase I-52c1): the suffix `amina` (`propan-2-amina`,
 * `butano-1,4-diamina`, `ciclohexanamina`, `bencen-1-amina`) and the locant
 * `N` of a group on the principal amine's nitrogen (`N-metiletanamina`,
 * `N,2-dimetilpropan-1-amina`). outsideRules() lets them through, and
 * amineChecks() runs first in firstRule(), before the nitrile's, the ester's
 * and the acid's checks (an amine is junior to all of them, so a student's
 * `amina` beside one of their groups must not reach their seniority code),
 * answering an AMINE_NULLS draft for the amine's own mistakes — a null that
 * keeps the rule number of the mistake among the name's readings, so the
 * kindest reading still wins (diagnose()) — which phase I-52c4 words, by
 * category (AMINE_NULLS `amine`; the tests read each one independently):
 *
 * - `seniority` — the student's suffix is `amina` and the engine's principal
 *   group is another (`2-hidroxietanamina` → «2-aminoetan-1-ol»,
 *   `3-oxobutan-1-amina` → «4-aminobutan-2-ona», `N-acetiletanamina` →
 *   «N-etiletanamida»: the acyl group on the nitrogen makes an amide), or
 *   the engine's is an amine and the student's suffix is not: since R-6c2 a
 *   principal amine written as an amino prefix (`aminoetano` →
 *   «etanamina», `2-aminopropano` → «propan-2-amina», `(metilamino)metano`
 *   → «N-metilmetanamina»);
 * - `count` — another number of amine groups: since R-6c2 an amine group of
 *   the parent written `amino` beside `amina` (`4-aminobutan-1-amina` →
 *   «butano-1,4-diamina»);
 * - `side` — the parent on the other side of the nitrogen: the student's
 *   parent carbon bonded to the amine's nitrogen is not the engine's
 *   (`N-etilmetanamina` → «N-metiletanamina», `N-ciclohexiletanamina`…);
 * - `parent` — the ring or chain the amine groups choose (principalParent(),
 *   P0: fewerPrincipalGroups(), chainDropped());
 * - `numbering` — the amine groups numbered otherwise (N0: chainDropped(),
 *   directionDraft(): `butan-3-amina`, `ciclohexano-1,5-diamina`);
 * - `suffix` — the suffix's needless or missing locants (`etan-1-amina`,
 *   `bencen-1-amina`, `N-metiletan-1-amina`; needlessLocants(),
 *   missingLocants()): the alcohol's rule, which holds, but its words speak
 *   of the OH; with groups on the nitrogen the omission is counted without
 *   them, as render.js carbonLocantPrefixes() does, and the carbon prefixes'
 *   locants are never needless beside an `N` (the engine always cites them
 *   then).
 *
 * Every other rule runs as for an alcohol name and says something true of an
 * amine name: BRANCH_AT_END, LONGER_CHAIN, MORE_SUBSTITUENTS (a group on the
 * nitrogen counts, as the engine counts it), CHAIN_LOCANTS (N1–N4),
 * NUMBERING, RING_NUMBERING (N1–N4), ALPHABETICAL_ORDER (`N-metil-N-etil…`),
 * UNGROUPED (`N-metil-N-metil…`), MULTIPLIER_KIND, LOCANT_ORDER
 * (`2,N-dimetil…`: `N` ranks below 1, as the engine sorts it), the
 * needless and missing locants of the prefixes and inside a branch, OLD_STYLE.
 * A prefix on the nitrogen (its occurrence's `parentAtom` the nitrogen, not
 * a carbon of the student's chain) never lengthens the chain (rule 1).
 *
 * The amino prefixes (R-6c2, phase I-52c2: `2-aminoetan-1-ol`,
 * `(metilamino)`, `(dimetilamino)`, `[etil(metil)amino]`, beside a senior
 * group or inside a branch) run the rules as any prefix, and every rule
 * that speaks was checked to say something true of them: an amino prefix is
 * a hetero group (isHeteroGroup(): its nitrogen splits the carbon skeleton,
 * so on an end it never lengthens the chain, rule 1, and the messages say
 * «sustituyentes»); its shape for the prefix style is its nitrogen with its
 * groups' shapes (aminoShape(), the same in every style), so its groups tell
 * the style (`[(propan-2-il)amino]`: `pin`); the groups on its nitrogen are a prefix
 * list of their own (prefixLists()), which ALPHABETICAL_ORDER
 * (`[metil(etil)amino]`: render.js cites them alphabetically, as any
 * prefixes), UNGROUPED (`[metil(metil)amino]` → «(dimetilamino)») and
 * MULTIPLIER_KIND (`(bismetilamino)`) read before any other list
 * (aminoGroups(): they decide the words the name-level order reads, a
 * multiplier inside the prefix counting); at the name level `di(metilamino)`
 * is MULTIPLIER_KIND «bis», an amino prefix with groups of its own being
 * compound; the parent on the
 * other side of an amino prefix's nitrogen gets the chain rules' own true
 * messages (`[(3-hidroxipropil)amino]metanol` → LONGER_CHAIN), as an ether's
 * oxygen did before ETHER_SIDE (a message told from the nitrogen is phase
 * I-52c4's). The amino prefix's own mistakes are the `seniority` and `count`
 * nulls above. An amino prefix on a C=O carbon makes an amide
 * (`1-aminobutanal` → «butanamida»): with the amide principal the molecule
 * is outside the rules (outsideRules(), the amides being phase R-6d's), the
 * null of the sweeps' `amide` category; beside an acid or an ester the amide
 * is a prefix the engine writes `amino` + `oxo` (`ácido
 * 4-amino-4-oxobutanoico`), and the rules run as for any prefixes.
 *
 * Every Spanish string is a draft pending teacher review (design.md §15,
 * last paragraph): all of them live in DIAGNOSIS_TEXTS and DIAGNOSIS_PHRASES
 * (the class-name step's in CLASS_NAME_STEP_TEXTS), and DIAGNOSES gives
 * example data for each code so the wording can be listed (R-7). Later
 * family phases (R-5a…R-6d) add their codes to DIAGNOSES / DIAGNOSIS_TEXTS
 * and their checks to FORM_RULES (or new trace rules to the chain walk).
 */

import { nameMolecule } from '../naming/index.js';
import { compareLocantLists, compareCitationKeys } from '../naming/numbering.js';
import { chainKey } from '../naming/parent.js';
import { locantText, esterParts } from '../naming/structure.js';
import { PREFIX_STYLES, nameSubstituent, suffixSites } from '../naming/substituent.js';
import { seniorityRank } from '../naming/seniority.js';
import { adjacency, rootedBranchKey } from '../model/graph.js';
import {
  stem, multiplier, compoundMultiplier, ENDINGS, ENCLOSING_MARKS, RETAINED_PREFIXES, FREE_VALENCE_SUFFIXES, omitsLocants,
  chainOmitsPrefixLocants, ringOmitsLocants, BENZENE_NAME, RING_PREFIX, POSITIONAL_LETTERS, TRADITIONAL_NAMES, SATURATED_INFIX,
  ALKOXY_ENDING, ETHER_CLASS_WORD, GROUP_PREFIXES, groupSuffix, ringGroupSuffix, ACYL_ENDING, RING_CARBONYL_ENDING, ESTER_LINK,
  ESTER_ALKYL_ENDING, ESTER_ALKYL_JOIN,
} from '../naming/lexicon.es.js';
import {
  assemble, itemText, isAlkoxyNode, isCompoundAlkoxy, alkoxyCore, isClassName, esterPrefixKind, esterGroupsOf, isAminoNode,
} from './assemble.js';
import { ownPrefixAtoms, specRings, isRing, isAromatic } from './build.js';
import {
  tileById, tileId, MAX_MULT, isAtomGroup, atomGroupOrder, HYDROXY_ELEMENT, HYDROXY_ID, OL_ID, PHENOL_ID, ALKOXY_ELEMENT,
  FORMYL_ID, ACETYL_ID, OXO_ID, OXO_ELEMENT, AL_ID, ONA_ID, CARBALDEHYDE_ID, BENZALDEHYDE_ID, BENZOYL_ID, RING_CARBONYL_ID,
  templateAdmits, isChainTemplate, ACID_KIND, CARBOXY_ID, ACID_WORD_ID, OICO_ID, CARBOXYLIC_ID, BENZOIC_ID, ESTER_KIND,
  isEsterTemplate, OATO_ID, CARBOXYLATE_ID, BENZOATE_ID, NITRILE_KIND, CYANO_ID, NITRILO_ID, CARBONITRILE_ID, BENZONITRILE_ID,
  AMINE_KIND, N_VALUE, AMINO_KIND, AMINO_ELEMENT,
} from './tiles.js';

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
  // Ethers (R-5b2).
  oxi: ALKOXY_ENDING,
  eter: ETHER_CLASS_WORD,
  propil: `${stem(3)}${FREE_VALENCE_SUFFIXES[1]}`,
  butil: `${stem(4)}${FREE_VALENCE_SUFFIXES[1]}`,
  il: FREE_VALENCE_SUFFIXES[1],
  isopropil: `${RETAINED_PREFIXES.isopropyl.italic}${RETAINED_PREFIXES.isopropyl.text}`,
  tertButil: `${RETAINED_PREFIXES['tert-butyl'].italic}${RETAINED_PREFIXES['tert-butyl'].text}`,
  /** The systematic form of `tert-butoxi` (explain.js alkoxyFormation() says it too). */
  dimetiletoxi: `1,1-${multiplier(2)}${stem(1)}${FREE_VALENCE_SUFFIXES[1]}${stem(2)}${ALKOXY_ENDING}`,
  // Aldehydes and ketones (R-5c3b1).
  oxo: tileById(OXO_ID).text,
  formil: tileById(FORMYL_ID).text,
  acetil: tileById(ACETYL_ID).text,
  al: tileById(AL_ID).text,
  ona: tileById(ONA_ID).text,
  carbaldehido: tileById(CARBALDEHYDE_ID).text,
  benzaldehido: tileById(BENZALDEHYDE_ID).text,
  // Acyl prefixes (R-5c3b2): the endings of their words.
  oil: ACYL_ENDING,
  carbonil: RING_CARBONYL_ENDING,
  benzoil: tileById(BENZOYL_ID).text,
  // Acids (R-5d3): the class word, the suffixes, the retained parent and the prefix.
  acido: tileById(ACID_WORD_ID).text,
  oico: tileById(OICO_ID).text,
  carboxilico: tileById(CARBOXYLIC_ID).text,
  acidoBenzoico: `${tileById(ACID_WORD_ID).text} ${tileById(BENZOIC_ID).text}`,
  carboxi: tileById(CARBOXY_ID).text,
  // Esters (R-6a3a): the suffixes, the retained parent, the link word and the O-bound group's ending.
  oato: tileById(OATO_ID).text,
  carboxilato: tileById(CARBOXYLATE_ID).text,
  benzoato: tileById(BENZOATE_ID).text,
  de: ESTER_LINK.trim(),
  ilo: `${FREE_VALENCE_SUFFIXES[1]}${ESTER_ALKYL_ENDING}`,
  // The O-bound side and the ester prefixes (R-6a3b): the join of two O-bound groups.
  and: ESTER_ALKYL_JOIN.trim(),
  // Nitriles (R-6b3): the suffixes and the retained parent.
  nitrilo: tileById(NITRILO_ID).text,
  carbonitrilo: tileById(CARBONITRILE_ID).text,
  benzonitrilo: tileById(BENZONITRILE_ID).text,
});

/** The style of the engine's functional-class alternative (naming/index.js etherClassAlternative(); R-5b2). */
const FUNCTIONAL_CLASS = 'functionalClass';

/** The SubstituentSpec kind of a `hidroxi` prefix (tiles.js; R-5a2). */
const HYDROXY_KIND = tileById(HYDROXY_ID).kind;

/** The principal group the alcohol messages speak of (the `ol` tile's value, a lexicon GROUP_SUFFIXES key; R-5a3b). */
const ALCOHOL = tileById(OL_ID).value;

/** The principal group of an aldehyde (the `al` tile's value, a lexicon GROUP_SUFFIXES key; R-5c3b1). */
const ALDEHYDE = tileById(AL_ID).value;

/** The principal group of a ketone (the `ona` tile's value, a lexicon GROUP_SUFFIXES key; R-5c3b1). */
const KETONE = tileById(ONA_ID).value;

/** The principal groups of the aldehydes and ketones (lexicon GROUP_SUFFIXES keys; file header «Aldehydes and ketones»). */
const CARBONYLS = Object.freeze([ALDEHYDE, KETONE]);

/** The principal group of a carboxylic acid (tiles.js ACID_KIND, a lexicon GROUP_SUFFIXES key; R-5d1, file header «Acids»). */
const ACID = ACID_KIND;

/**
 * The principal group of an ester (a lexicon GROUP_SUFFIXES key; tiles.js ESTER_KIND): no ether class name fits it
 * (classNameDiagnosis(); ESTER_CLASS_NAME, R-6a3b); its own mistakes are checked first with the acid's (file header «Esters»,
 * esterChecks(); R-6a3a), then the O-bound side's (oBoundChecks(), R-6a3b).
 */
const ESTER = ESTER_KIND;

/**
 * The principal groups with a C=O of their own — an aldehyde's –CHO, a
 * ketone's C=O, an acid's –COOH (R-5c3b1, R-5d3), an ester's –COO– (R-6a3a)
 * —, whose words the parent-choice, P0, N0, prefix and seniority messages
 * use (DIAGNOSIS_PHRASES `groupWords`, `carbonylN0`; carbonylGroup()).
 */
const CARBONYL_GROUPS = Object.freeze([ALDEHYDE, KETONE, ACID, ESTER]);

/** The `carboxi` tile's value (a retained word, R-5d1). */
const CARBOXY = tileById(CARBOXY_ID).value;

/**
 * The principal group of a nitrile (tiles.js NITRILE_KIND, a lexicon GROUP_SUFFIXES key; R-6b1, file header «Nitriles»): its
 * own mistakes are checked first, as the acid's and the ester's (nitrileChecks(), R-6b3).
 */
const NITRILE = NITRILE_KIND;

/**
 * The principal groups whose own words the parent-choice, P0, N0, prefix,
 * seniority and suffix-locant messages use, keyed by the group (DIAGNOSIS_PHRASES
 * `groupWords`, `carbonylN0`, `what`; carbonylGroup()): the C=O groups
 * (CARBONYL_GROUPS) and a nitrile's –C≡N (R-6b3), which has no C=O but takes
 * the same messages in its own words, «grupo –C≡N», as the explanation does.
 */
const NAMED_GROUPS = Object.freeze([...CARBONYL_GROUPS, NITRILE]);

/** The `ciano` tile's value (a retained word, R-6b1). */
const CYANO = tileById(CYANO_ID).value;

/**
 * The principal group of an amine (tiles.js AMINE_KIND, a lexicon GROUP_SUFFIXES key; R-6c1, file header «Amines»): its
 * own mistakes are deliberate nulls, checked first (amineChecks()).
 */
const AMINE = AMINE_KIND;

/** How the branch shapes write the –C≡N of `ciano` (R-6b1; specShape(), structureShape()). */
const CYANO_SHAPE = 'X:CN';

/** How the branch shapes write the –COOH of `carboxi` (R-5d1; specShape(), structureShape()). */
const CARBOXY_SHAPE = 'X:COOH';

/** The SubstituentSpec kind of an `oxo` prefix (tiles.js; R-5c1). */
const OXO_KIND = tileById(OXO_ID).kind;

/** The element of a carbon atom (model/elements.js; build.js keeps the same constant). */
const CARBON = 'C';

/**
 * The null of a check that finds a case no message covers (file header
 * «Aldehydes and ketones»: a student's carbonyl suffix of another kind than
 * the engine's that no C=O check names; «Acids»: a student's acid suffix
 * while the engine's principal group is no –COOH; «Esters»: an O-bound side
 * mixing the engine's prefix styles, an ester prefix of the student's the
 * engine names otherwise; «Nitriles»: a student's nitrile suffix while the
 * engine's principal group is junior to a –C≡N; all never seen in the
 * sweeps): a draft that stops the diagnosis — firstRule() answers null for
 * the reading, never a later rule.
 */
const BEYOND = Object.freeze({ code: null });

/**
 * The deliberate nulls of an amine's own mistakes (R-6c1, file header
 * «Amines»; phase I-52c4 words them), by category: drafts without a code
 * that keep the rule number the mistake holds among a name's readings, so
 * diagnose() still keeps the reading of the latest rule (with the suffix's
 * locant left out, `N-metil-N-metiletanamina` is also read with the amine on
 * carbon 2, an N0 null of rule 4, beside the UNGROUPED of rule 6 that the
 * kindest reading gets), and answers null when the kept one is such a null.
 */
const AMINE_NULLS = Object.freeze({
  seniority: Object.freeze({ code: null, amine: 'seniority', rule: 1 }),
  count: Object.freeze({ code: null, amine: 'count', rule: 1 }),
  side: Object.freeze({ code: null, amine: 'side', rule: 2 }),
  parent: Object.freeze({ code: null, amine: 'parent', rule: 2 }),
  numbering: Object.freeze({ code: null, amine: 'numbering', rule: 4 }),
  suffix: Object.freeze({ code: null, amine: 'suffix', rule: 9 }),
});

/**
 * Tells whether a draft is one of an amine's deliberate nulls (AMINE_NULLS).
 *
 * @param {object|null} draft - A draft, BEYOND or null.
 * @returns {boolean} True for an amine's null.
 */
function isAmineNull(draft) {
  return Boolean(draft) && Boolean(draft.amine);
}

/** The `formil` tile's value (a retained word, R-5c1). */
const FORMYL = tileById(FORMYL_ID).value;

/** The `tert-butil` tile's value (a retained word; ALKOXY_MULTIPLIER's `bis-tert-butoxi`, R-5b2). */
const TERT_BUTYL = tileById(tileId('retained', 'tert-butyl')).value;

/** The `acetil` tile's value (a retained word, R-5c2). */
const ACETYL = tileById(ACETYL_ID).value;

/** How the branch shapes write the double-bonded oxygen of `oxo` (R-5c1; specShape(), structureShape()). */
const DOUBLE_OXYGEN = '=O';

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
  // Acids (R-5d3, file header «Acids»): a –COOH written as two groups on one carbon — one of the suffix's (`principal`), or
  // one the engine writes as a `carboxi` prefix beside the –COOH groups of the suffix (review of phase I-51d3).
  ACID_GROUP: (d) => {
    const lead = 'Un C=O y un –OH en el mismo carbono no son dos grupos distintos: juntos forman un solo grupo, el –COOH de los '
      + 'ácidos carboxílicos (su –OH no es un alcohol, ni su C=O un aldehído o una cetona). ';
    if (d.principal === false) {
      return `${lead}Ese –COOH no da la terminación del nombre: se nombra con el prefijo «${WORDS.carboxi}», delante. La `
        + `terminación es para ${d.count === 1 ? 'el otro grupo –COOH, que se nombra' : 'los otros grupos –COOH, que se nombran todos '
          + 'juntos'} ${DIAGNOSIS_PHRASES.ending(d)}. Se escribe «${d.name}».`;
    }
    return `${lead}${d.count === 1 ? `El grupo –COOH es el grupo principal: se nombra ${DIAGNOSIS_PHRASES.ending(d)}.`
      : `Los grupos –COOH son el grupo principal: ${DIAGNOSIS_PHRASES.groupsOn[d.on]} se nombran todos juntos `
        + `${DIAGNOSIS_PHRASES.ending(d)}.`} Se escribe «${d.name}».`;
  }, // End of the ACID_GROUP template
  // Esters (R-6a3a, file header «Esters»): ACID_GROUP's twin, a –COO– of the engine's suffix written as two groups on one carbon.
  ESTER_GROUP: (d) => 'Un C=O y un oxígeno unido a otro grupo de carbonos, en el mismo carbono, no son dos grupos distintos: '
    + 'juntos forman un solo grupo, el –COO– de los ésteres (su C=O no es un aldehído ni una cetona, ni su oxígeno del medio '
    + `un éter). ${DIAGNOSIS_PHRASES.esterWritten(d)} Se escribe «${d.name}».`,
  // ESTER_GROUP's twin for an ether's class name whose oxygen is an ester's (R-6a3b, file header «Esters»).
  ESTER_CLASS_NAME: (d) => 'El oxígeno de tu nombre está unido a un carbono con un C=O: juntos forman un solo grupo, el –COO– de '
    + `los ésteres, así que la molécula es un éster, no un éter, y no se nombra con «${WORDS.eter}». `
    + `${DIAGNOSIS_PHRASES.esterWritten(d)} Se escribe «${d.name}».`,
  // Aldehydes and ketones (R-5c3b1, file header «Aldehydes and ketones»): the principal C=O group's own mistakes; and an
  // acid's (R-5d3, «Acids»), whose –COOH is senior to them all; and an ester's (R-6a3a, «Esters»), or an ester's suffix
  // beside an acid's –COOH (the junior `ester`).
  CARBONYL_SENIORITY: (d) => `Cuando hay grupos distintos, solo uno es el grupo principal, y se elige por este orden: `
    + `${DIAGNOSIS_PHRASES.seniorityOf(d)}. Aquí manda ${DIAGNOSIS_PHRASES.principal[d.group]}, que se nombra `
    + `${DIAGNOSIS_PHRASES.ending(d)}; ${DIAGNOSIS_PHRASES.junior[d.junior][d.count === 1 ? 0 : 1]} `
    + `${DIAGNOSIS_PHRASES.juniorPlace(d)}. Se escribe «${d.name}».`,
  KETONE_NOT_ALDEHYDE: (d) => 'El grupo –CHO de un aldehído va en un extremo de la cadena: su carbono solo puede unirse a un '
    + `carbono más. Aquí ${d.branch ? `la rama «${d.branch}» está en el carbono ${d.locant}, que así queda unido`
      : `el carbono ${d.locant} está unido`} a dos carbonos: su C=O es el de una cetona, no el de un aldehído. `
    + `Se escribe «${d.name}».`,
  ALDEHYDE_CARBON: (d) => groupCarbonText(d, '–CHO', WORDS.carbaldehido),
  // ALDEHYDE_CARBON's twin for the –COOH (R-5d3, file header «Acids»).
  ACID_CARBON: (d) => groupCarbonText(d, '–COOH', WORDS.carboxilico),
  // ACID_CARBON's twin for the –COO– (R-6a3a, file header «Esters»).
  ESTER_CARBON: (d) => groupCarbonText(d, '–COO–', WORDS.carboxilato),
  // ESTER_CARBON's twin for the –C≡N (R-6b3, file header «Nitriles»).
  NITRILE_CARBON: (d) => groupCarbonText(d, '–C≡N', WORDS.carbonitrilo),
  CARBONYL_PREFIX: (d) => {
    const words = DIAGNOSIS_PHRASES.groupWords[d.group];
    const how = `${d.acyl ? 'dentro del' : 'con el'} prefijo «${d.prefix}»`;
    const joins = d.joins ? ` Su carbono entra en la cadena principal${d.ringBranch ? ', y el anillo pasa a ser una rama' : ''}.` : '';
    if (d.group === ESTER) {
      // An ester (R-6a3a): its long ending last; an acyloxy prefix's carbons start the acid part, the student's chain goes after
      // «de» (`oBound`: `(acetiloxi)metano` → «etanoato de metilo»).
      const side = d.oBound ? ` ${d.studentRing ? 'Tu anillo' : 'Tu cadena'} va en el grupo unido al otro oxígeno, después de `
        + `«${WORDS.de}».` : '';
      return (d.count === 1
        ? `El ${words.one} es el grupo principal: no se nombra ${how}, sino ${DIAGNOSIS_PHRASES.ending(d)}.`
        : `Los ${words.many} son el grupo principal: ${DIAGNOSIS_PHRASES.groupsOn[d.on]} no se nombran ${how}, sino todos `
          + `juntos ${DIAGNOSIS_PHRASES.ending(d)}.`)
        + `${joins}${side} Se escribe «${d.name}».`;
    }
    return (d.count === 1
      ? `El ${words.one} es el grupo principal: se nombra ${DIAGNOSIS_PHRASES.ending(d)}, no ${how}.`
      : `Los ${words.many} son el grupo principal: ${DIAGNOSIS_PHRASES.groupsOn[d.on]} se nombran todos juntos `
        + `${DIAGNOSIS_PHRASES.ending(d)}, no ${how}.`)
      + `${joins} Se escribe «${d.name}».`;
  }, // End of the CARBONYL_PREFIX template
  HYDROXY_PARENT: (d) => 'La cadena principal es la que lleva más grupos –OH, sea el anillo o una cadena abierta; solo si '
    + `empatan manda el anillo. Aquí ${DIAGNOSIS_PHRASES.hydroxyChoice(d)}: «${d.name}».`,
  CARBONYL_PARENT: (d) => `La cadena principal es la que lleva más ${DIAGNOSIS_PHRASES.groupWords[d.group].many}, sea el anillo `
    + `o una cadena abierta; solo si empatan manda el anillo. Aquí ${DIAGNOSIS_PHRASES.hydroxyChoice(d)}: «${d.name}».`,
  BRANCH_AT_END: (d) => `La rama «${d.branch}» está en el extremo de la cadena, así que la alarga: `
    + `la cadena principal tiene ${d.length} carbonos.`,
  // BRANCH_AT_END's twin for an alkoxycarbonyl prefix beside an acid (R-6a3a, file header «Esters»): its C=O carbon joins the
  // chain, and the engine writes the ester as `oxo` and an `-oxi` prefix on that carbon (explain.js chainEsterNote()).
  ESTER_IN_CHAIN: (d) => `El prefijo «${d.prefix}» está en el extremo de la cadena, y el carbono de su C=O la alarga: la cadena `
    + `principal tiene ${d.length} carbonos. Con ese carbono en la cadena, el éster ya no se nombra «${d.prefix}», sino `
    + `${DIAGNOSIS_PHRASES.chainEster}. Se escribe «${d.name}».`,
  RING_IS_PARENT: (d) => 'El anillo es la cadena principal: un anillo manda siempre sobre una cadena abierta, aunque la cadena '
    + `sea más larga. Tu cadena de ${d.length} ${d.length === 1 ? 'carbono' : 'carbonos'} va en una rama del anillo: «${d.name}».`,
  MORE_HYDROXY_GROUPS: (d) => `Hay otra cadena con más grupos –OH (${d.app}; la tuya tiene ${d.student}). La cadena principal es `
    + 'la que lleva más grupos –OH, aunque no sea la más larga.',
  MORE_CARBONYL_GROUPS: (d) => `Hay otra cadena con más ${DIAGNOSIS_PHRASES.groupWords[d.group].many} (${d.app}; la tuya tiene `
    + `${d.student}). La cadena principal es la que lleva más ${DIAGNOSIS_PHRASES.groupWords[d.group].many}, aunque no sea la más `
    + 'larga.',
  // `etoximetano` (R-5b): an ether's student chain may have one carbon.
  LONGER_CHAIN: (d) => `Hay una cadena más larga que la tuya: la tuya tiene ${d.student} ${d.student === 1 ? 'carbono' : 'carbonos'} `
    + `y la cadena principal tiene ${d.length}.`,
  BENZENE_RING: (d) => 'Un anillo de 6 carbonos con tres enlaces dobles alternados, uno sí y uno no, es el benceno, y tiene '
    + `nombre propio: «${WORDS.benceno}».${d.name === WORDS.benceno ? '' : ` Se escribe «${d.name}».`}`,
  // A chain template (R-5c3a: `acetona`, `acetaldehído`…) has no ring: `parent` null, the systematic name.
  SUBSTITUTED_TEMPLATE: (d) => (d.parent === null
    ? `El nombre tradicional «${d.template}» no admite sustituyentes: con más grupos, la molécula se nombra con su nombre `
      + `sistemático: «${d.name}».`
    : `El nombre tradicional «${d.template}» no admite más sustituyentes: con más ramas en el anillo, `
      + `la molécula se nombra a partir de «${d.parent}», con todas las ramas delante: «${d.name}».`),
  // A retained ester word with an O-bound group in another style than its traditional name's (R-6a3b, file header «Esters»).
  ESTER_TRADITIONAL: (d) => `El nombre tradicional «${d.template}» solo lo uso con el nombre del grupo unido al oxígeno que doy `
    + `primero, «${d.side}»: «${d.traditional}». Con «${d.student}», la primera palabra es la sistemática: «${d.systematic}».`,
  PHENOL: (d) => `Un benceno con un solo grupo –OH tiene nombre propio: «${WORDS.fenol}», no «${WORDS.bencenol}».`
    + `${d.name === WORDS.fenol ? '' : ` Se escribe «${d.name}».`}`,
  MORE_MULTIPLE_BONDS: (d) => `Hay otra cadena igual de larga con más enlaces dobles o triples (${d.app}; la tuya tiene `
    + `${d.student}). Entre cadenas igual de largas, gana la que tiene más.`,
  MORE_DOUBLE_BONDS: (d) => `Hay otra cadena igual de larga, ${DIAGNOSIS_PHRASES.doubleBondTie.tie}, pero con más enlaces dobles `
    + `(${d.app}; la tuya tiene ${d.student}). En ese empate ${DIAGNOSIS_PHRASES.doubleBondTie.wins}.`,
  MORE_SUBSTITUENTS: (d) => `Hay otra cadena igual de larga con más sustituyentes (${d.app}; la tuya tiene ${d.student}). `
    + `Entre cadenas igual de largas, gana la que tiene más ${d.halogen ? 'sustituyentes' : 'ramas'}.`,
  CHAIN_LOCANTS: (d) => `Hay otra cadena igual de larga que, bien numerada, da números más bajos a `
    + `${lowerLocants(d)}${difference(d)}: esa es la cadena principal.`,
  CHAIN_ALPHABETICAL: () => 'Hay otra cadena igual de larga, con los mismos números, cuyo nombre va antes por orden '
    + 'alfabético: esa es la cadena principal.',
  NUMBERING: (d) => `Hay que numerar la cadena desde el otro extremo: ${numberingReason(d)}`
    + `${difference(d)}.${d.unwritten ? ` En «${d.name}» ese número ni siquiera se escribe.` : ''}`,
  RING_NUMBERING: (d) => 'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: '
    + `${numberingReason(d)}${difference(d)}.`
    + `${d.unwritten ? ` En «${d.name}» ese número ni siquiera se escribe.` : ''}`,
  // An ester prefix written as another kind of branch (R-6a3b, file header «Esters»), as the explanation describes the two kinds.
  ESTER_PREFIX_NAME: (d) => (d.kind === 'acyloxy'
    ? 'Un éster (–COO–) unido por su oxígeno del medio se nombra con el prefijo '
      + `«${DIAGNOSIS_PHRASES.esterPrefixes.acyloxy}»: el nombre del grupo acilo${d.part ? `, aquí «${d.part}»,` : ''} más `
      + `«${WORDS.oxi}», que es el oxígeno`
      + `${d.oxo ? `; su C=O no se nombra con «${WORDS.oxo}»` : ''}. `
      + `Se escribe «${d.right}», no «${d.student}».`
    : 'Un éster (–COO–) unido por el carbono de su C=O se nombra con un solo prefijo que lo incluye todo, '
      + `«${DIAGNOSIS_PHRASES.esterPrefixes.alkoxycarbonyl}»: el nombre del grupo unido al oxígeno acabado en «-${WORDS.oxi}»`
      + `${d.part ? `, aquí «${d.part}»,` : ''} más «${WORDS.carbonil}», que es el C=O`
      + `${d.oxo ? `; su C=O no se nombra con «${WORDS.oxo}»` : ''}. `
      + `Se escribe «${d.right}», no «${d.student}».`),
  // A branch's own name (R-5c3b2, file header «Aldehydes and ketones»): an acyl group's word and chain, a ring branch's numbering.
  ACYL_NAME: (d) => {
    if (d.word) {
      const holder = d.right === d.word ? '' : ` Se escribe «${d.right}», no «${d.student}».`;
      return `${DIAGNOSIS_PHRASES.acylGroup[d.carbons]} tiene nombre propio, que la IUPAC (2013) prefiere: «${d.word}», no `
        + `«${d.written}».${holder}`;
    }
    return 'Una rama que se une por el carbono de un C=O es un grupo acilo: su C=O no se nombra con el prefijo '
      + `«${WORDS.oxo}», sino con ${d.ring ? DIAGNOSIS_PHRASES.acylEnding.ring : DIAGNOSIS_PHRASES.acylEnding.chain}. `
      + `Se escribe «${d.right}», no «${d.student}».`;
  }, // End of the ACYL_NAME template
  ACYL_CHAIN: (d) => 'La cadena de un grupo acilo empieza en el carbono del C=O, que es el 1, y '
    + `${d.longer ? `es la más larga posible: aquí tiene ${d.length} carbonos, no ${d.studentLength}`
      : 'se elige con las mismas reglas que la cadena principal'}. Se escribe «${d.right}», no «${d.student}».`,
  // R-6a3b (`oBound`): a ring of an ester's O-bound group (`6-metilfenilo`), numbered from the carbon bonded to the oxygen.
  BRANCH_RING_NUMBERING: (d) => `${d.oBound ? 'Un anillo unido al oxígeno se numera empezando por el carbono unido al oxígeno'
    : 'Un anillo que va en una rama se numera empezando por el carbono por el que se une'}, que es el 1`
    + `${d.reason ? `, y siguiendo en el sentido que ${DIAGNOSIS_PHRASES.branchRingReasons[d.reason]}` : ''}: «${d.right}», `
    + `no «${d.student}».${d.unwritten ? ` En «${d.right}» ese 1 ni siquiera se escribe.` : ''}`
    + `${d.benzene ? ' Ese anillo es un benceno: sus enlaces dobles no cuentan para numerar.' : ''}`,
  // An ester's O-bound group (R-6a3b, file header «Esters»): its chain or numbering, or any other words the engine does not write.
  ESTER_ALKYL_CHAIN: (d) => {
    const through = d.starts ? 'empieza en' : 'pasa por';
    if (d.reason === 'longer') {
      return `La cadena del grupo unido al oxígeno es la más larga que ${through} el carbono unido al oxígeno: aquí tiene `
        + `${d.length} carbonos, no ${d.studentLength}. Se escribe «${d.right}», no «${d.student}».`;
    }
    if (d.reason === 'bonds') {
      return `La cadena del grupo unido al oxígeno ${through} el carbono unido al oxígeno y, entre las más largas, es la que tiene `
        + `más enlaces dobles o triples. Se escribe «${d.right}», no «${d.student}».`;
    }
    if (d.reason === 'doubles') {
      // The double-bond tie-break (review of phase I-52a3b), as MORE_DOUBLE_BONDS says it of the parent chain.
      return `La cadena del grupo unido al oxígeno ${through} el carbono unido al oxígeno y, entre las más largas, `
        + `${DIAGNOSIS_PHRASES.doubleBondTie.tie}, ${DIAGNOSIS_PHRASES.doubleBondTie.wins}. Se escribe «${d.right}», no «${d.student}».`;
    }
    return 'La cadena del grupo unido al oxígeno se numera para que el carbono unido al oxígeno lleve el número más bajo posible'
      + `${d.reason === 'valence' ? '' : `; si así empatan, en el sentido que ${DIAGNOSIS_PHRASES.branchRingReasons[d.reason]}`}: `
      + `«${d.right}», no «${d.student}».${d.unwritten ? ` En «${d.right}» ese número ni siquiera se escribe.` : ''}`;
  }, // End of the ESTER_ALKYL_CHAIN template
  ESTER_ALKYL_NAME: (d) => `El grupo unido al oxígeno se nombra como una rama, pero como palabra suelta y acabado en «-${WORDS.ilo}»: `
    + `aquí, «${d.right}», no «${d.student}».`,
  // R-6a3b (`oBound`): two different O-bound groups of an ester, quoted with the side (`etilo y metilo`).
  ALPHABETICAL_ORDER: (d) => (d.oBound
    ? `Los grupos unidos a los oxígenos se escriben por orden alfabético, unidos por «${WORDS.and}»: «${d.first}» va antes que `
      + `«${d.second}» (${d.why}).${d.hint ? ` ${d.hint}` : ''} Se escribe «${d.right}», no «${d.student}».`
    : `Los sustituyentes se escriben por orden alfabético: «${d.first}» va antes que «${d.second}» (${d.why}).`
      + `${d.hint ? ` ${d.hint}` : ''}`),
  // R-6a3b (`oBound`): the same O-bound group of an ester written apart (`metilo y metilo`).
  UNGROUPED: (d) => `${DIAGNOSIS_PHRASES.equalGroups(d)} se escriben una sola vez, con `
    + `${d.compound ? `«${WORDS.bis}», «${WORDS.tris}»…` : `«${WORDS.di}», «${WORDS.tri}»…`} delante: `
    + `«${d.right}», no «${d.student}».`,
  // R-6a3b (`oBound`): the multiplier of an ester's O-bound group, whose own branches the explanation calls «sustituyentes».
  MULTIPLIER_KIND: (d) => {
    const [one, many] = d.oBound ? ['un grupo que tiene sus propios sustituyentes', 'grupos que tienen sus propios sustituyentes']
      : ['una rama que tiene sus propias ramas', 'ramas que tienen sus propias ramas'];
    return d.compound
      ? `Delante de ${one} se usa «${WORDS.bis}», «${WORDS.tris}»…: «${d.right}», no «${d.student}».`
      : `«${WORDS.bis}», «${WORDS.tris}»… solo van delante de ${many}; aquí va «${WORDS.di}», «${WORDS.tri}»…: «${d.right}», `
        + `no «${d.student}».`;
  }, // End of the MULTIPLIER_KIND template
  LOCANT_ORDER: (d) => `Los números de un mismo grupo se escriben de menor a mayor: «${d.right}», no «${d.student}».`,
  NEEDLESS_LOCANTS: (d) => {
    if (d.traditional) {
      // R-5c3b2: a locant on a traditional name the engine writes without any (`2-fenilacetaldehído`).
      return `El nombre tradicional «${d.name}» se escribe sin números: «${d.name}», no «${d.student}».`;
    }
    if (d.oBound) {
      // R-6a3b: an ester's O-bound group written with locants the engine leaves out (`propan-1-ilo`).
      return `Sobran números en el nombre del grupo unido al oxígeno: se escribe «${d.right}», no «${d.student}».`;
    }
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
  MISSING_LOCANTS: (d) => (d.branch
    // R-5c3b2: the locant 1 the engine writes before `carbonil` on a ring with a multiple bond or prefixes of its own.
    ? 'Falta un número dentro de la rama: cuando el anillo lleva enlaces dobles o sustituyentes, el carbono unido al C=O, que es '
      + `el 1, lleva su número delante de «${WORDS.carbonil}»: «${d.right}», no «${d.student}».`
    : `Faltan números: hay que decir en qué carbono va cada rama${d.group ? `, cada enlace doble o triple y cada ${d.group}`
      : ' y cada enlace doble o triple'}, como en «${d.name}».`),
  SEGMENT_ORDER: (d) => `Cuando hay enlaces dobles y triples, «${WORDS.en}» se escribe antes que «${WORDS.ino}»: `
    + `«${d.name}», no «${d.student}».`,
  OLD_STYLE: (d) => `Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, justo delante de `
    + `${d.suffix ? `«${d.suffix}»` : `«${WORDS.eno}» o «${WORDS.ino}»`}: «${d.name}».`,
  LETTER_LOCANTS: (d) => `Las letras ${WORDS.letters.slice(0, -1).join(', ')} y ${WORDS.letters[WORDS.letters.length - 1]} `
    + `(orto, meta y para) son una forma antigua de decir dónde van dos grupos del benceno, y con estas ramas no se usan: `
    + `se escriben los números, «${d.name}».`,
  // Ethers (R-5b2, file header «Ethers»).
  ETHER_SIDE: (d) => `El oxígeno del éter (–O–) corta la molécula en dos lados, y la cadena principal no puede pasar por él: se `
    + 'busca en uno de los dos lados, con las reglas de siempre. Aquí la cadena principal está en el otro lado del oxígeno, no en '
    + `el de ${d.studentRing ? 'tu anillo' : 'tu cadena'}: ${DIAGNOSIS_PHRASES.etherSide(d)}. `
    + `${DIAGNOSIS_PHRASES.etherHolder(d)}: «${d.name}».`,
  ALKOXY_MULTIPLIER: (d) => (d.tertButoxy
    ? `«${d.prefix}» se cuenta como un prefijo compuesto, porque su forma sistemática, «${WORDS.dimetiletoxi}», lleva sus `
      + `propias ramas; delante va «${WORDS.bis}», «${WORDS.tris}»…: «${d.right}», no «${d.student}».`
    : `Un prefijo «-${WORDS.oxi}» que no se acorta, como «${d.prefix}», es un prefijo compuesto (un grupo más «${WORDS.oxi}») y `
      + `va entre paréntesis; delante de un prefijo compuesto se usa «${WORDS.bis}», «${WORDS.tris}»…: «${d.right}», `
      + `no «${d.student}».`),
  CLASS_NAME_NONE: (d) => `El nombre con «${WORDS.eter}» (nombre de clase funcional) solo lo doy cuando el oxígeno une dos `
    + `grupos sencillos: ${DIAGNOSIS_PHRASES.simpleGroups}. Esta molécula se nombra con un prefijo acabado en `
    + `«-${WORDS.oxi}»: «${d.name}».`,
  CLASS_GROUP_WORDS: (d) => `En el nombre con «${WORDS.eter}», cada grupo se nombra con su forma más sencilla, sin números: `
    + `${WORDS.metil}, ${WORDS.etil}, ${WORDS.propil}…, ${WORDS.isopropil} o ${WORDS.tertButil}. Se escribe «${d.name}».`,
  CLASS_ORDER: (d) => `En el nombre con «${WORDS.eter}», los dos grupos se escriben por orden alfabético: «${d.first}» va antes `
    + `que «${d.second}» (${d.why}).${d.hint ? ` ${d.hint}` : ''} Se escribe «${d.right}».`,
  CLASS_DI: (d) => `Si los dos grupos unidos al oxígeno son iguales, su nombre se escribe una sola vez, con «${WORDS.di}» delante: `
    + `«${d.right}», no «${d.student}».`,
});

/** The phrases the templates of DIAGNOSIS_TEXTS fill in (Spanish drafts, pending teacher review). */
export const DIAGNOSIS_PHRASES = Object.freeze({
  /**
   * The double-bond tie-break between chains as long, with as many multiple bonds (MORE_DOUBLE_BONDS; ESTER_ALKYL_CHAIN's
   * `doubles`, review of phase I-52a3b).
   */
  doubleBondTie: Object.freeze({ tie: 'con los mismos enlaces múltiples', wins: 'gana la que tiene más enlaces dobles' }),
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
  /**
   * N0 for an aldehyde, a ketone (R-5c3b1), an acid (R-5d3), an ester (R-6a3a) or a nitrile (R-6b3), by principal group:
   * why the other numbering is right (NUMBERING, RING_NUMBERING) and what another chain numbers lower (CHAIN_LOCANTS), as
   * `numberingReasons.N0` and `lowerLocantsOf.N0` say it of the OH groups and the explanation's numbering step of the C=O,
   * –COOH, –COO– and –C≡N groups.
   */
  carbonylN0: Object.freeze({
    numberingReasons: Object.freeze({
      aldehyde: 'los grupos –CHO (el grupo principal) tienen que llevar los números más bajos',
      ketone: 'los grupos C=O (el grupo principal) tienen que llevar los números más bajos',
      acid: 'los grupos –COOH (el grupo principal) tienen que llevar los números más bajos',
      ester: 'los grupos –COO– (el grupo principal) tienen que llevar los números más bajos',
      nitrile: 'los grupos –C≡N (el grupo principal) tienen que llevar los números más bajos',
    }),
    lowerLocantsOf: Object.freeze({
      aldehyde: 'los grupos –CHO', ketone: 'los grupos C=O', acid: 'los grupos –COOH', ester: 'los grupos –COO–',
      nitrile: 'los grupos –C≡N',
    }),
  }),
  /**
   * How the messages call one or several principal groups, by group (R-5c3b1; the explanation's SUFFIX_GROUP_WORDS): the
   * C=O of a ketone «grupo C=O», an aldehyde's «grupo –CHO», an acid's «grupo –COOH» (R-5d3), an ester's «grupo –COO–»
   * (R-6a3a), a nitrile's «grupo –C≡N» (R-6b3), as the explanation's group step says them.
   */
  groupWords: Object.freeze({
    alcohol: Object.freeze({ one: 'grupo –OH', many: 'grupos –OH' }),
    aldehyde: Object.freeze({ one: 'grupo –CHO', many: 'grupos –CHO' }),
    ketone: Object.freeze({ one: 'grupo C=O', many: 'grupos C=O' }),
    acid: Object.freeze({ one: 'grupo –COOH', many: 'grupos –COOH' }),
    ester: Object.freeze({ one: 'grupo –COO–', many: 'grupos –COO–' }),
    nitrile: Object.freeze({ one: 'grupo –C≡N', many: 'grupos –C≡N' }),
  }),
  /** The seniority of the principal groups the tiles write (CARBONYL_SENIORITY, R-5c3b1; design.md §13.4 I-32). */
  seniority: 'aldehído > cetona > alcohol',
  /** The same beside an acid (CARBONYL_SENIORITY, R-5d3; design.md §13.4 I-33), as the acid's group step words it. */
  acidSeniority: 'ácido > aldehído > cetona > alcohol',
  /**
   * The same with an ester (CARBONYL_SENIORITY, R-6a3a; design.md §13.4 I-35, naming/seniority.js SENIORITY), as the
   * explanation's ester group step and the acid's beside an ester prefix word it.
   */
  esterSeniority: 'ácido > éster > aldehído > cetona > alcohol',
  /**
   * The same with a nitrile as the principal group (CARBONYL_SENIORITY, R-6b3; design.md §13.4 I-38, naming/seniority.js
   * SENIORITY, every kind in its order), as the explanation's nitrile group step words it (explain.js nitrileGroupStep()).
   */
  nitrileSeniority: 'ácido > éster > amida > nitrilo > aldehído > cetona > alcohol > amina',
  /**
   * The same beside an acid's –COOH or an ester's –COO– when the student's junior suffix is a nitrile's (CARBONYL_SENIORITY,
   * R-6b3), as the acid's and the ester's group steps word it beside a `ciano` (explain.js acidGroupStep(), esterGroupStep()).
   */
  cyanoSeniority: Object.freeze({
    acid: 'ácido > nitrilo > aldehído > cetona > alcohol',
    ester: 'ácido > éster > nitrilo > aldehído > cetona > alcohol',
  }),
  /**
   * The seniority CARBONYL_SENIORITY states (R-6a3a, R-6b3): with a nitrile as the principal group, `nitrileSeniority`; with
   * the student's junior suffix a nitrile's, `cyanoSeniority` of the acid or the ester; with an ester, as the principal
   * group or as the student's junior suffix beside an acid, `esterSeniority`; beside an acid `acidSeniority`; else
   * `seniority`.
   *
   * @param {{group: string, junior: string}} d - The principal group and the student's junior one.
   * @returns {string} The phrase.
   */
  seniorityOf: (d) => {
    if (d.group === NITRILE) {
      return DIAGNOSIS_PHRASES.nitrileSeniority;
    }
    if (d.junior === NITRILE) {
      return DIAGNOSIS_PHRASES.cyanoSeniority[d.group === ESTER ? ESTER : ACID];
    }
    if (d.group === ESTER || d.junior === ESTER) {
      return DIAGNOSIS_PHRASES.esterSeniority;
    }
    return d.group === ACID ? DIAGNOSIS_PHRASES.acidSeniority : DIAGNOSIS_PHRASES.seniority;
  }, // End of the seniorityOf phrase
  /** The principal group that wins, by group (CARBONYL_SENIORITY). */
  principal: Object.freeze({
    aldehyde: 'el aldehído (–CHO)', ketone: 'la cetona (C=O)', acid: 'el ácido (–COOH)', ester: 'el éster (–COO–)',
    nitrile: 'el nitrilo (–C≡N)',
  }),
  /**
   * The student's junior group, written as the suffix, one or several (CARBONYL_SENIORITY; an aldehyde's beside an acid,
   * R-5d3; an ester's beside an acid, R-6a3a; a nitrile's beside an acid or an ester, R-6b3).
   */
  junior: Object.freeze({
    aldehyde: Object.freeze(['el –CHO del aldehído', 'cada –CHO']),
    ketone: Object.freeze(['el C=O de la cetona', 'cada C=O de cetona']),
    alcohol: Object.freeze(['el –OH', 'cada –OH']),
    ester: Object.freeze(['el –COO– del éster', 'cada –COO–']),
    nitrile: Object.freeze(['el –C≡N del nitrilo', 'cada –C≡N']),
  }),
  /**
   * What the prefix `ciano` takes with it, said of a student's nitrile suffix beside a senior group (CARBONYL_SENIORITY,
   * R-6b3; juniorPlace()), as the explanation's cyanoCarbonSentence() says it: the prefix includes the –C≡N's carbon, which
   * the student's `nitrilo` counted in the chain (its carbon 1) and which then counts in no chain — by where the `ciano`
   * goes: on the engine's chain parent, its ring, or the chain of an ester's group bonded to the other oxygen.
   */
  cyanoCarbon: Object.freeze({
    chain: 'que incluye su carbono: ese carbono no se cuenta en la cadena principal',
    ring: 'que incluye su carbono: ese carbono no se cuenta en el anillo',
    oBound: 'que incluye su carbono: ese carbono no se cuenta en la cadena de ese grupo',
  }),
  /**
   * How the engine writes an ester whose C=O carbon is a carbon of its parent chain beside an acid (R-6a3a: ESTER_IN_CHAIN,
   * CARBONYL_SENIORITY), as the explanation's chainEsterNote() says it: `oxo` and an `-oxi` prefix with the same number.
   */
  chainEster: `con dos prefijos con el mismo número: «${WORDS.oxo}» para su C=O y uno acabado en «-${WORDS.oxi}» para su oxígeno `
    + 'del medio con el grupo unido a él',
  /**
   * Where the student's junior groups go in the engine's name (CARBONYL_SENIORITY): in front, with their prefix (`oxo`,
   * `hidroxi`, `formil`; an ester's `acetiloxi` or `metoxicarbonil`, R-6a3a) or «en los prefijos»; an ester's C=O carbon in
   * the parent, as `oxo` and an `-oxi` prefix (`inChain`, R-6a3a); beside an ester, in the name of the group bonded to the
   * other oxygen (`side` 'oBound', R-6a3a: `etanoato de 1-oxoheptan-2-ilo`). A nitrile's `ciano` (R-6b3) says that it
   * includes the –C≡N's carbon, which then counts in no chain (`cyanoCarbon`, on the engine's ring when `ring`).
   *
   * @param {{prefix: string|null, inChain?: boolean, side?: string|null, junior: string, ring?: boolean}} d - The
   *   CARBONYL_SENIORITY data.
   * @returns {string} The phrase.
   */
  juniorPlace: (d) => {
    if (d.inChain) {
      return `va delante, ${DIAGNOSIS_PHRASES.chainEster}`;
    }
    let cyano = '';
    if (d.junior === NITRILE && d.prefix) {
      let where = d.ring ? 'ring' : 'chain';
      if (d.side === 'oBound') {
        where = 'oBound';
      }
      cyano = `, ${DIAGNOSIS_PHRASES.cyanoCarbon[where]}`;
    }
    if (d.side === 'oBound') {
      return `va en el nombre del grupo unido al otro oxígeno${d.prefix ? `, con el prefijo «${d.prefix}»` : ''}${cyano}`;
    }
    return `va delante, ${d.prefix ? `con el prefijo «${d.prefix}»` : 'en los prefijos'}${cyano}`;
  }, // End of the juniorPlace phrase
  /** Which of several principal groups the suffix cites together (CARBONYL_PREFIX), by where they are. */
  groupsOn: Object.freeze({
    chain: 'los de la cadena principal',
    ring: 'los del anillo',
    outside: 'los unidos al anillo',
  }),
  /**
   * How the engine's principal C=O group is written (R-5c3b1): its suffix at the end of the name (`-al`, `-diona`,
   * `-carbaldehído`), or, for benzene with one –CHO, the name `benzaldehído`; an acid's –COOH (R-5d3) with the class word
   * `ácido` first and its suffix last (`-oico`, `-dioico`, `-carboxílico`), or, for benzene with one –COOH, `ácido
   * benzoico`; an ester's –COO– (R-6a3a) with its suffix (`-oato`, `-dioato`, `-carboxilato`) or, for benzene with one
   * –COO–, `benzoato`, then `de` and the O-bound groups ending in `-ilo`, as the explanation's ester group step says it; a
   * nitrile's –C≡N (R-6b3) with its suffix (`-nitrilo`, `-dinitrilo`, `-carbonitrilo`) or, for benzene with one –C≡N,
   * `benzonitrilo`.
   *
   * @param {{ending: string, benzaldehyde: boolean, acid?: boolean, benzoic?: boolean, ester?: boolean, benzoate?: boolean,
   *   groups?: number, benzonitrile?: boolean}} d - The suffix's words (suffixWordOf()), the benzaldehído case, for an acid
   *   the `ácido benzoico` case, for an ester the `benzoato` case and how many –COO– groups, for a nitrile the
   *   `benzonitrilo` case (principalEnding()).
   * @returns {string} The phrase.
   */
  ending: (d) => {
    if (d.benzaldehyde) {
      return `con «${WORDS.benzaldehido}» (el benceno con un grupo –CHO)`;
    }
    if (d.benzoic) {
      return `con «${WORDS.acidoBenzoico}» (el benceno con un grupo –COOH)`;
    }
    if (d.benzonitrile) {
      return `con «${WORDS.benzonitrilo}» (el benceno con un grupo –C≡N)`;
    }
    if (d.ester) {
      const word = d.benzoate ? `con «${WORDS.benzoato}» (el benceno con un grupo –COO–)` : `con la terminación «-${d.ending}»`;
      const side = d.groups > 1 ? 'los grupos unidos a los otros oxígenos, acabados' : 'el grupo unido al otro oxígeno, acabado';
      return `${word} y, después de «${WORDS.de}», ${side} en «-${WORDS.ilo}»`;
    }
    return d.acid ? `con la palabra «${WORDS.acido}» al principio del nombre y la terminación «-${d.ending}» al final`
      : `con la terminación «-${d.ending}», al final del nombre`;
  }, // End of the ending phrase
  /**
   * How the engine writes its –COO– groups, a whole sentence (ESTER_GROUP, R-6a3a; ESTER_CLASS_NAME, R-6a3b): one group, or
   * several cited together where they are (`groupsOn`).
   *
   * @param {{count: number, on: string}} d - How many –COO– groups, where they are, and the ending() data.
   * @returns {string} The sentence.
   */
  esterWritten: (d) => (d.count === 1 ? `El grupo –COO– es el grupo principal: se nombra ${DIAGNOSIS_PHRASES.ending(d)}.`
    : `Los grupos –COO– son el grupo principal: ${DIAGNOSIS_PHRASES.groupsOn[d.on]} se nombran todos juntos `
      + `${DIAGNOSIS_PHRASES.ending(d)}.`),
  /**
   * What UNGROUPED says is written once (R-5a1, R-6a3b): «los grupos iguales unidos a los oxígenos» of an ester (`oBound`), «los
   * sustituyentes iguales» with a halogen or a one-atom group, else «las ramas iguales».
   *
   * @param {{oBound?: boolean, halogen: boolean}} d - The UNGROUPED data.
   * @returns {string} The phrase, capitalised (it starts the message).
   */
  equalGroups: (d) => {
    if (d.oBound) {
      return 'Los grupos iguales unidos a los oxígenos';
    }
    return d.halogen ? 'Los sustituyentes iguales' : 'Las ramas iguales';
  },
  /**
   * The general words of the two kinds of ester prefix (ESTER_PREFIX_NAME, R-6a3b), as the explanation's substituents step
   * says them (explain.js esterPrefixSentences(), its group step beside an acid: «aciloxi-», «alcoxicarbonil-»).
   */
  esterPrefixes: Object.freeze({ acyloxy: 'aciloxi-', alkoxycarbonyl: 'alcoxicarbonil-' }),
  /**
   * The acyl groups with a name of their own, by carbons (ACYL_NAME, R-5c3b2), as the explanation's acyl sentences say them
   * (explain.js acylIntro(): «Con 2 carbonos (CH₃–CO–) se llama «acetil»…»).
   */
  acylGroup: Object.freeze({
    1: 'El grupo acilo de 1 carbono (H–CO–, un –CHO)',
    2: 'El grupo acilo de 2 carbonos (CH₃–CO–)',
  }),
  /** How an acyl group's C=O is named in its word (ACYL_NAME, R-5c3b2): `-oil` after a chain, `-carbonil` after a ring. */
  acylEnding: Object.freeze({
    chain: `la terminación «-${WORDS.oil}» (salvo «${WORDS.formil}», de 1 carbono, y «${WORDS.acetil}», de 2)`,
    ring: `la terminación «-${WORDS.carbonil}», porque está unido a un anillo («${WORDS.benzoil}» con el benceno)`,
  }),
  /**
   * Which way a ring in a branch is numbered from its carbon 1 (BRANCH_RING_NUMBERING, R-5c3b2), by what decides it, as the
   * explanation's ring-branch sentences say it (explain.js ringDescription(), ringCarbonylDescription(),
   * benzeneOwnPrefixSentences()).
   */
  branchRingReasons: Object.freeze({
    lower: 'da los números más bajos a sus sustituyentes',
    bonds: 'da los números más bajos a sus enlaces dobles y triples, y luego a sus sustituyentes',
    bondsOnly: 'da los números más bajos a sus enlaces dobles y triples',
    alphabetical: 'da los números más bajos a sus sustituyentes y, con los mismos números, el más bajo al que va primero por '
      + 'orden alfabético',
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
    // The suffix's C=O groups (R-5c3b1: `ciclohexan-1-ona`, `ciclohexano-1-carbaldehído`).
    aldehyde: 'el grupo –CHO',
    aldehydes: 'los grupos –CHO',
    ketone: 'el grupo C=O',
    ketones: 'los grupos C=O',
    // The suffix's –COOH groups (R-5d3: `ácido ciclohexano-1-carboxílico`).
    acid: 'el grupo –COOH',
    acids: 'los grupos –COOH',
    // The suffix's –COO– groups (R-6a3a: `ciclohexano-1-carboxilato de metilo`).
    ester: 'el grupo –COO–',
    esters: 'los grupos –COO–',
    // The suffix's –C≡N groups (R-6b3: `ciclohexano-1-carbonitrilo`).
    nitrile: 'el grupo –C≡N',
    nitriles: 'los grupos –C≡N',
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
   * «Anillo o cadena» step says it the same way); or how many C=O groups (CARBONYL_PARENT, R-5c3b1: the phrase names no
   * group).
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
  /** Why a class name's groups go in that order when their letters tie (CLASS_ORDER, R-5b2: `butil tert-butil éter`). */
  plainFirst: `con las mismas letras, va primero el grupo sin «${WORDS.tert}»`,
  /**
   * The ethers the engine gives a class name, «…dos grupos sencillos: <this>» (CLASS_NAME_NONE and its explanation step,
   * R-5b2; naming/index.js etherClassAlternative()).
   */
  simpleGroups: `cadenas sin ramas unidas por su extremo (${WORDS.metil}, ${WORDS.etil}, ${WORDS.propil}…), ${WORDS.isopropil} o `
    + `${WORDS.tertButil}, sin enlaces dobles ni triples, sin anillos y sin más átomos que esos carbonos y el oxígeno`,
  /**
   * Why the parent is on the other side of the ether oxygen (ETHER_SIDE, R-5b2), by the chain or ring rule that chose it
   * (the code that rule gives on its own, `reason`, with its data), as the explanation's «Reconoce el éter» step words it
   * (explain.js etherSideReason()).
   *
   * @param {object} d - The ETHER_SIDE data: `reason`, the counts or locants of that rule, `benzene`; `group` for an aldehyde's
   *   or a ketone's C=O groups (R-5c3b1: CARBONYL_PARENT, MORE_CARBONYL_GROUPS, CHAIN_LOCANTS at N0), an acid's –COOH
   *   groups (R-5d3), an ester's –COO– groups (R-6a3a) or a nitrile's –C≡N groups (R-6b3).
   * @returns {string} The phrase.
   */
  etherSide: (d) => {
    const words = DIAGNOSIS_PHRASES.groupWords[NAMED_GROUPS.includes(d.group) ? d.group : ALCOHOL];
    /**
     * Some principal groups as the phrase says them.
     *
     * @param {number} n - The count.
     * @returns {string} «ningún grupo –OH», «un grupo –OH», «2 grupos –OH» (or –CHO, C=O).
     */
    const groups = (n) => [`ningún ${words.one}`, `un ${words.one}`][n] || `${n} ${words.many}`;
    /**
     * A count of OH groups after the first one is named.
     *
     * @param {number} n - The count.
     * @returns {string} «ninguno», «uno» or the number.
     */
    const count = (n) => ['ninguno', 'uno'][n] || String(n);
    const tied = 'las cadenas de los dos lados empatan en longitud';
    const lead = 'primero cuenta el grupo principal, y';
    switch (d.reason) {
      case 'RING_IS_PARENT':
        return `en ese lado ${d.benzene ? 'está el benceno' : 'hay un anillo'}, y un anillo manda siempre sobre una cadena abierta`;
      case 'HYDROXY_PARENT':
      case 'CARBONYL_PARENT': {
        const [there, mine] = d.chainParent ? [d.chain, d.ring] : [d.ring, d.chain];
        return there === mine
          ? `${lead} los dos lados llevan ${groups(there)} cada uno; en el empate, manda el anillo`
          : `${lead} en ese lado hay ${groups(there)} y en el tuyo, ${count(mine)}`;
      }
      case 'MORE_HYDROXY_GROUPS':
      case 'MORE_CARBONYL_GROUPS':
        return `${lead} en ese lado hay ${groups(d.app)} y en ${d.studentRing ? 'tu anillo' : 'tu cadena'}, ${count(d.student)}`;
      case 'LONGER_CHAIN':
        return `en ese lado hay una cadena de ${d.length} carbonos, más larga que la tuya, de ${d.student}`;
      case 'MORE_MULTIPLE_BONDS':
        return `${tied}, y la de ese lado tiene más enlaces dobles o triples (${d.app}; la tuya, ${d.student})`;
      case 'MORE_DOUBLE_BONDS':
        return `${tied} y en enlaces múltiples, y la de ese lado tiene más enlaces dobles (${d.app}; la tuya, ${d.student})`;
      case 'MORE_SUBSTITUENTS':
        return `${tied} y en enlaces dobles o triples, y la de ese lado tiene más sustituyentes (${d.app}; la tuya, ${d.student})`;
      case 'CHAIN_LOCANTS':
        return `${tied}, en enlaces múltiples y en sustituyentes, y la de ese lado, bien numerada, da números más bajos a `
          + `${lowerLocants(d)}${difference(d)}`;
      default: // CHAIN_ALPHABETICAL
        return `${tied} y en todo lo demás, y la de ese lado da un nombre que va antes por orden alfabético`;
    }
  }, // End of the etherSide phrase
  /**
   * Where the student's chain or ring goes in the engine's name (ETHER_SIDE, R-5b2 review): with the oxygen, the whole
   * substituent that holds it (`etoximetano`: «metoxi»), or a part of it when it lies deeper inside (`nested`:
   * `(2-propoxietoxi)metano`, the methyl inside «2-metoxietoxi»).
   *
   * @param {{studentRing: boolean, nested?: boolean, side: string|null}} d - The ETHER_SIDE data.
   * @returns {string} The phrase, capitalised (it starts a sentence).
   */
  etherHolder: (d) => {
    const mine = d.studentRing ? 'Tu anillo' : 'Tu cadena';
    if (d.nested) {
      return d.side ? `${mine} forma parte del sustituyente «${d.side}»` : `${mine} forma parte de un sustituyente`;
    }
    return `${mine}, con el oxígeno, `
      + `${d.side ? `es el sustituyente «${d.side}»` : `va en un sustituyente acabado en «-${WORDS.oxi}»`}`;
  },
});

/**
 * The id of the explanation step that diagnosisExplanation() adds, right
 * after «Reconoce el éter», for the diagnosis of an ether's functional-class
 * name (classNameStep(); review of phase I-51b2): no explain() step speaks of
 * class names.
 */
export const CLASS_NAME_STEP = 'etherClass';

/** The class-name diagnosis codes (R-5b2), which open CLASS_NAME_STEP. */
const CLASS_CODES = Object.freeze(['CLASS_NAME_NONE', 'CLASS_GROUP_WORDS', 'CLASS_ORDER', 'CLASS_DI']);

/**
 * The Spanish drafts (pending teacher review) of CLASS_NAME_STEP
 * (classNameStep(), review of phase I-51b2): its title and paragraphs, in the
 * explanation's glossary markup (`[[prefijo]]`). For an ether the engine
 * gives a class name: the substitutive name of the other steps and how the
 * class name differs from it, its groups, their order, `di`, the word
 * `éter` and the name; for one it gives none (CLASS_NAME_NONE): the class
 * name in general, which ethers get one, and the `-oxi` name of this one.
 */
export const CLASS_NAME_STEP_TEXTS = Object.freeze({
  title: `Monta el nombre con «${WORDS.eter}»`,
  substitutive: (d) => `El nombre que explican los otros pasos, «${d.substitutive}», es el que doy primero, el nombre `
    + 'sustitutivo: el oxígeno y uno de los dos grupos unidos a él van delante como [[prefijo]] acabado en '
    + `«-${WORDS.oxi}», y el otro grupo da la [[cadena principal]]. Un éter sencillo como este tiene también otro nombre válido, `
    + 'que la IUPAC (2013) acepta: el nombre de clase funcional. Se monta de otra manera, sin cadena principal y sin números.',
  groups: (d) => `Los dos grupos unidos al oxígeno se nombran como ramas, acabados en «-${WORDS.il}», cada uno con su forma más `
    + `sencilla y sin números (${WORDS.metil}, ${WORDS.etil}, ${WORDS.propil}…, ${WORDS.isopropil} o ${WORDS.tertButil}): aquí, `
    + `${d.groups[0] === d.groups[1] ? `los dos son «${d.groups[0]}»` : `«${d.groups[0]}» y «${d.groups[1]}»`}.`,
  order: 'Los dos grupos se escriben por orden alfabético, como los sustituyentes de un nombre: '
    + `«${WORDS.tert}» no cuenta para el orden, y si las letras empatan va primero el grupo sin «${WORDS.tert}» `
    + `(${WORDS.butil} ${WORDS.tertButil} ${WORDS.eter}).`,
  di: `Si los dos grupos son iguales, se escriben una sola vez, con «${WORDS.di}» delante: `
    + `«${WORDS.di}${WORDS.etil} ${WORDS.eter}», no «${WORDS.etil} ${WORDS.etil} ${WORDS.eter}».`,
  word: (d) => `Al final va la palabra «${WORDS.eter}», y las palabras van separadas por espacios. En el nombre sustitutivo, en `
    + `cambio, el éter nunca va al final: es el prefijo «-${WORDS.oxi}». Para esta molécula: «${d.name}».`,
  general: `Un éter sencillo tiene también un nombre de clase funcional, con la palabra «${WORDS.eter}» al final (en el nombre `
    + `sustitutivo, el que explican los otros pasos, el éter nunca va al final: es un prefijo «-${WORDS.oxi}»).`,
  generalForm: 'Ese nombre se monta sin cadena principal y sin números: los dos grupos unidos al oxígeno se nombran como ramas '
    + `acabadas en «-${WORDS.il}», por orden alfabético («${WORDS.tert}» no cuenta), una sola vez con «${WORDS.di}» delante si `
    + `son iguales, y al final va «${WORDS.eter}»: «${WORDS.etil} ${WORDS.metil} ${WORDS.eter}», `
    + `«${WORDS.di}${WORDS.etil} ${WORDS.eter}».`,
  only: `Ese nombre solo lo doy cuando el oxígeno une dos grupos sencillos: ${DIAGNOSIS_PHRASES.simpleGroups}.`,
  none: (d) => `Esta molécula no es uno de esos éteres sencillos, así que no tiene nombre con «${WORDS.eter}»: se nombra como en `
    + `los otros pasos, con el oxígeno en un [[prefijo]] acabado en «-${WORDS.oxi}»: «${d.substitutive}».`,
});

/**
 * Every diagnosis code, in the order of the rules (design.md §15.8 R-3; the
 * ring rules of R-4, the alcohol rules of R-5a, the aldehyde and ketone
 * rules of R-5c3b1, the acid rules of R-5d3 and the ester rules of R-6a3a
 * beside the rules whose place they take — ACID_GROUP and ESTER_GROUP first,
 * as acidChecks() and esterChecks() run first, ACID_CARBON and ESTER_CARBON
 * beside ALDEHYDE_CARBON, ESTER_IN_CHAIN beside BRANCH_AT_END —, the
 * branch-name rules of R-5c3b2 before ALPHABETICAL_ORDER, the ester codes
 * of R-6a3b beside the code each parallels — ESTER_CLASS_NAME after
 * ESTER_GROUP, ESTER_TRADITIONAL after SUBSTITUTED_TEMPLATE,
 * ESTER_PREFIX_NAME first of the branch-name rules, ESTER_ALKYL_CHAIN and
 * ESTER_ALKYL_NAME after BRANCH_RING_NUMBERING —, and the nitrile's own code
 * of R-6b3, NITRILE_CARBON, after ESTER_CARBON, its twin (the nitrile's other
 * mistakes take the shared codes with the –C≡N's words); file header): its
 * rule number (1–11), the
 * explanation step it points at (an explain() step id, design.md §5; a draft
 * may give its own case's step, `benzene` for RING_IS_PARENT on the benzene
 * ring, `ester` or `diester` for a rule read on an ester's O-bound side; the
 * class names CLASS_NAME_STEP, which diagnosisExplanation() adds)
 * and example data for its message (R-7 lists the drafts with it).
 * Frozen; later families add their codes.
 */
export const DIAGNOSES = Object.freeze({
  // Acids (R-5d3): acidChecks() runs first; a –COOH written as two groups on one carbon.
  ACID_GROUP: Object.freeze({
    rule: 1,
    step: 'group',
    example: Object.freeze({
      count: 1, ending: WORDS.oico, acid: true, benzoic: false, benzaldehyde: false, on: 'chain', principal: true,
      name: `${WORDS.acido} ${stem(3)}${SATURATED_INFIX}${WORDS.oico}`,
    }),
  }),
  // Esters (R-6a3a): esterChecks() runs with acidChecks(), first; a –COO– written as two groups on one carbon.
  ESTER_GROUP: Object.freeze({
    rule: 1,
    step: 'group',
    example: Object.freeze({
      count: 1, ending: WORDS.oato, ester: true, benzoate: false, groups: 1, benzaldehyde: false, on: 'chain',
      name: `${stem(3)}${SATURATED_INFIX}${WORDS.oato}${ESTER_LINK}${WORDS.metil}${ESTER_ALKYL_ENDING}`,
    }),
  }),
  // R-6a3b: ESTER_GROUP's twin for an ether's class name whose oxygen is an ester's (its own track, classNameDiagnosis()).
  ESTER_CLASS_NAME: Object.freeze({
    rule: 1,
    step: 'group',
    example: Object.freeze({
      count: 1, ending: WORDS.oato, ester: true, benzoate: false, groups: 1, benzaldehyde: false, on: 'chain',
      name: `${stem(2)}${SATURATED_INFIX}${WORDS.oato}${ESTER_LINK}${WORDS.metil}${ESTER_ALKYL_ENDING}`,
    }),
  }),
  HYDROXY_PREFIX: Object.freeze({
    rule: 1,
    step: 'group',
    example: Object.freeze({ count: 1, ending: WORDS.ol, ring: false, name: `${stem(3)}${SATURATED_INFIX}-2-${WORDS.ol}` }),
  }),
  // Aldehydes and ketones (R-5c3b1): the principal C=O group's own mistakes, beside HYDROXY_PREFIX, before the parent choice.
  CARBONYL_SENIORITY: Object.freeze({
    rule: 1,
    step: 'group',
    example: Object.freeze({
      group: ALDEHYDE, ending: WORDS.al, benzaldehyde: false, junior: KETONE, count: 1, prefix: WORDS.oxo,
      name: `4-${WORDS.oxo}${stem(5)}${SATURATED_INFIX}${WORDS.al}`,
    }),
  }),
  KETONE_NOT_ALDEHYDE: Object.freeze({
    rule: 1,
    step: 'group',
    example: Object.freeze({ branch: WORDS.metil, locant: 1, name: `${stem(4)}${SATURATED_INFIX}-2-${WORDS.ona}` }),
  }),
  ALDEHYDE_CARBON: Object.freeze({
    rule: 1,
    step: 'group',
    example: Object.freeze({ ring: false, ending: WORDS.al, benzaldehyde: false, name: `${stem(5)}${SATURATED_INFIX}${WORDS.al}` }),
  }),
  ACID_CARBON: Object.freeze({
    rule: 1,
    step: 'group',
    example: Object.freeze({
      ring: false, ending: WORDS.oico, acid: true, benzoic: false, benzaldehyde: false,
      name: `${WORDS.acido} ${stem(4)}${SATURATED_INFIX}${WORDS.oico}`,
    }),
  }),
  ESTER_CARBON: Object.freeze({
    rule: 1,
    step: 'group',
    example: Object.freeze({
      ring: false, ending: WORDS.oato, ester: true, benzoate: false, groups: 1, benzaldehyde: false,
      name: `${stem(4)}${SATURATED_INFIX}${WORDS.oato}${ESTER_LINK}${WORDS.metil}${ESTER_ALKYL_ENDING}`,
    }),
  }),
  // Nitriles (R-6b3): nitrileChecks() runs first; the –C≡N's carbon on the other side of the parent, ESTER_CARBON's twin.
  NITRILE_CARBON: Object.freeze({
    rule: 1,
    step: 'group',
    example: Object.freeze({
      ring: false, ending: WORDS.nitrilo, benzonitrile: false, benzaldehyde: false,
      name: `${stem(4)}${ENDINGS.saturated}${WORDS.nitrilo}`, // The parent's `o` kept before the consonant (`butanonitrilo`).
    }),
  }),
  CARBONYL_PREFIX: Object.freeze({
    rule: 1,
    step: 'group',
    example: Object.freeze({
      group: KETONE, count: 1, ending: WORDS.ona, benzaldehyde: false, prefix: WORDS.oxo, acyl: false, joins: false,
      ringBranch: false, on: 'chain', name: `${stem(3)}${SATURATED_INFIX}${WORDS.ona}`,
    }),
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
  CARBONYL_PARENT: Object.freeze({
    rule: 1,
    step: 'ringChain',
    example: Object.freeze({
      group: KETONE,
      ring: 1,
      chain: 1,
      chainParent: false,
      name: `2-(2-${WORDS.oxo}${stem(3)}${FREE_VALENCE_SUFFIXES[1]})${RING_PREFIX}${stem(6)}${SATURATED_INFIX}-1-${WORDS.ona}`,
    }),
  }),
  BRANCH_AT_END: Object.freeze({ rule: 1, step: 'chain', example: Object.freeze({ branch: WORDS.metil, length: 4 }) }),
  // R-6a3a: BRANCH_AT_END's twin for an alkoxycarbonyl prefix; its step says the ester's carbon is a carbon of the chain.
  ESTER_IN_CHAIN: Object.freeze({
    rule: 1,
    step: 'groupChain',
    example: Object.freeze({
      prefix: `${stem(1)}${WORDS.oxi}${WORDS.carbonil}`,
      length: 4,
      name: `${WORDS.acido} 4-${stem(1)}${WORDS.oxi}-4-${WORDS.oxo}${stem(4)}${SATURATED_INFIX}${WORDS.oico}`,
    }),
  }),
  RING_IS_PARENT: Object.freeze({
    rule: 1,
    step: 'ring',
    example: Object.freeze({ length: 3, name: `${stem(3)}${FREE_VALENCE_SUFFIXES[1]}${RING_PREFIX}${stem(6)}${ENDINGS.saturated}` }),
  }),
  MORE_HYDROXY_GROUPS: Object.freeze({
    rule: 2, step: 'groupChain', example: Object.freeze({ student: 1, app: 2, length: 3, halogen: false }),
  }),
  MORE_CARBONYL_GROUPS: Object.freeze({
    rule: 2, step: 'groupChain', example: Object.freeze({ group: KETONE, student: 1, app: 2, length: 6, halogen: false }),
  }),
  LONGER_CHAIN: Object.freeze({ rule: 2, step: 'chain', example: Object.freeze({ student: 4, length: 5 }) }),
  BENZENE_RING: Object.freeze({ rule: 2, step: 'benzene', example: Object.freeze({ name: `${WORDS.metil}${WORDS.benceno}` }) }),
  SUBSTITUTED_TEMPLATE: Object.freeze({
    rule: 2,
    step: 'benzene',
    example: Object.freeze({ template: WORDS.tolueno, parent: WORDS.benceno, name: `1,4-${WORDS.di}${WORDS.metil}${WORDS.benceno}` }),
  }),
  // R-6a3b: a retained ester word with an O-bound group in another style; beside SUBSTITUTED_TEMPLATE, a retained word's use.
  ESTER_TRADITIONAL: Object.freeze({
    rule: 2,
    step: 'assemble',
    example: Object.freeze({
      template: TRADITIONAL_NAMES.acetate,
      student: `${stem(3)}${SATURATED_INFIX}-2-${WORDS.ilo}`,
      side: `${WORDS.isopropil}${ESTER_ALKYL_ENDING}`,
      traditional: `${TRADITIONAL_NAMES.acetate}${ESTER_LINK}${WORDS.isopropil}${ESTER_ALKYL_ENDING}`,
      systematic: `${stem(2)}${SATURATED_INFIX}${WORDS.oato}${ESTER_LINK}${stem(3)}${SATURATED_INFIX}-2-${WORDS.ilo}`,
    }),
  }),
  PHENOL: Object.freeze({ rule: 2, step: 'group', example: Object.freeze({ name: `4-${WORDS.metil}${WORDS.fenol}` }) }),
  ETHER_SIDE: Object.freeze({
    rule: 2,
    step: 'ether',
    example: Object.freeze({
      reason: 'LONGER_CHAIN',
      student: 1,
      length: 2,
      benzene: false,
      studentRing: false,
      nested: false,
      side: `${stem(1)}${WORDS.oxi}`,
      name: `${stem(1)}${WORDS.oxi}${stem(2)}${ENDINGS.saturated}`,
    }),
  }),
  CLASS_NAME_NONE: Object.freeze({
    rule: 2, step: CLASS_NAME_STEP, example: Object.freeze({ name: `${stem(1)}${WORDS.oxi}${stem(2)}${ENDINGS.double}` }),
  }),
  CLASS_GROUP_WORDS: Object.freeze({
    rule: 2, step: CLASS_NAME_STEP, example: Object.freeze({ name: `${WORDS.isopropil} ${WORDS.metil} ${WORDS.eter}` }),
  }),
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
  // A branch's own name (R-5c3b2): after the parent's rules 1–4, before ALPHABETICAL_ORDER, which reads the branches' words; an
  // ester prefix's kind first (R-6a3b).
  ESTER_PREFIX_NAME: Object.freeze({
    rule: 5,
    step: 'substituents',
    example: Object.freeze({
      kind: 'acyloxy', part: WORDS.acetil, oxo: true, right: `${WORDS.acetil}${WORDS.oxi}`,
      student: `1-${WORDS.oxo}${stem(2)}${WORDS.oxi}`,
    }),
  }),
  ACYL_NAME: Object.freeze({
    rule: 5,
    step: 'substituents',
    example: Object.freeze({
      carbons: 2, word: WORDS.acetil, written: `${stem(2)}${SATURATED_INFIX}${WORDS.oil}`, ring: false, right: WORDS.acetil,
      student: `${stem(2)}${SATURATED_INFIX}${WORDS.oil}`,
    }),
  }),
  ACYL_CHAIN: Object.freeze({
    rule: 5,
    step: 'substituents',
    example: Object.freeze({
      longer: true, length: 4, studentLength: 3, right: `${stem(4)}${SATURATED_INFIX}${WORDS.oil}`,
      student: `3-${WORDS.metil}${stem(3)}${SATURATED_INFIX}${WORDS.oil}`,
    }),
  }),
  BRANCH_RING_NUMBERING: Object.freeze({
    rule: 5,
    step: 'substituents',
    example: Object.freeze({
      reason: 'lower', unwritten: false, benzene: false, right: `2-${WORDS.metil}${WORDS.benzoil}`,
      student: `6-${WORDS.metil}${WORDS.benzoil}`,
    }),
  }),
  // R-6a3b: an ester's O-bound group, named like a branch (its step names it: «Separa las dos partes del éster»).
  ESTER_ALKYL_CHAIN: Object.freeze({
    rule: 5,
    step: 'ester',
    example: Object.freeze({
      reason: 'valence', length: 4, studentLength: 4, starts: false, unwritten: false,
      right: `${stem(4)}${SATURATED_INFIX}-2-${WORDS.ilo}`, student: `${stem(4)}${SATURATED_INFIX}-3-${WORDS.ilo}`,
    }),
  }),
  ESTER_ALKYL_NAME: Object.freeze({
    rule: 5,
    step: 'ester',
    example: Object.freeze({
      right: `${WORDS.tertButil}${ESTER_ALKYL_ENDING}`, student: `1,1-${WORDS.di}${WORDS.metil}${WORDS.etil}${ESTER_ALKYL_ENDING}`,
    }),
  }),
  ALPHABETICAL_ORDER: Object.freeze({
    rule: 5,
    step: 'order',
    example: Object.freeze({
      first: WORDS.etil, second: WORDS.metil, why: DIAGNOSIS_PHRASES.why.letters(WORDS.etil[0], WORDS.metil[0]), hint: '',
    }),
  }),
  CLASS_ORDER: Object.freeze({
    rule: 5,
    step: CLASS_NAME_STEP,
    example: Object.freeze({
      first: WORDS.etil, second: WORDS.metil, why: DIAGNOSIS_PHRASES.why.letters(WORDS.etil[0], WORDS.metil[0]), hint: '',
      right: `${WORDS.etil} ${WORDS.metil} ${WORDS.eter}`,
    }),
  }),
  UNGROUPED: Object.freeze({
    rule: 6, step: 'substituents',
    example: Object.freeze({
      compound: false, halogen: false, right: `2,3-${WORDS.di}${WORDS.metil}`, student: `2-${WORDS.metil}-3-${WORDS.metil}`,
    }),
  }),
  CLASS_DI: Object.freeze({
    rule: 6,
    step: CLASS_NAME_STEP,
    example: Object.freeze({ right: `${WORDS.di}${WORDS.etil} ${WORDS.eter}`, student: `${WORDS.etil} ${WORDS.etil} ${WORDS.eter}` }),
  }),
  MULTIPLIER_KIND: Object.freeze({
    rule: 7, step: 'substituents',
    example: Object.freeze({ compound: false, right: `2,3-${WORDS.di}${WORDS.metil}`, student: `2,3-${WORDS.bis}${WORDS.metil}` }),
  }),
  ALKOXY_MULTIPLIER: Object.freeze({
    rule: 7,
    step: 'substituents',
    example: Object.freeze({
      tertButoxy: false,
      prefix: `${stem(5)}${FREE_VALENCE_SUFFIXES[1]}${WORDS.oxi}`,
      right: `1,6-${WORDS.bis}(${stem(5)}${FREE_VALENCE_SUFFIXES[1]}${WORDS.oxi})`,
      student: `1,6-${WORDS.di}(${stem(5)}${FREE_VALENCE_SUFFIXES[1]}${WORDS.oxi})`,
    }),
  }),
  LOCANT_ORDER: Object.freeze({
    rule: 8, step: 'assemble',
    example: Object.freeze({ right: `2,3-${WORDS.di}${WORDS.metil}`, student: `3,2-${WORDS.di}${WORDS.metil}` }),
  }),
  NEEDLESS_LOCANTS: Object.freeze({
    rule: 9,
    step: 'numbering',
    example: Object.freeze({
      traditional: false, branch: false, name: `${stem(3)}${WORDS.eno}`, what: DIAGNOSIS_PHRASES.what.double, right: '', student: '',
      kept: false, plural: false, on: '',
    }),
  }),
  MISSING_LOCANTS: Object.freeze({
    rule: 9,
    step: 'numbering',
    example: Object.freeze({ branch: false, group: null, name: `2-${WORDS.metil}${stem(5)}${ENDINGS.saturated}` }),
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
 * «Monta el nombre»); so do an aldehyde and a ketone (R-5c3b1: CARBONYL_PARENT
 * as HYDROXY_PARENT; `benzaldehído` has no numbering step), an acid
 * (R-5d3: `ácido benzoico` has none either), a nitrile (R-6b3: nor
 * `benzonitrilo`) and an ester (R-6a3a: `benzoato
 * de metilo` neither; ESTER_IN_CHAIN's `groupChain` is an acid's; an ester's
 * O-bound side, R-6a3b, opens «Separa las dos partes del éster», `ester`,
 * which a diester names `diester`, each the other's fallback); a branch-name
 * rule (R-5c3b2) points at a prefix of the engine's name, which therefore
 * has «Nombra los sustituyentes». An ether (R-5b2)
 * always has «Reconoce el éter»
 * (`ether`): its oxygen is an alkoxy prefix of the engine's name, at some
 * depth; the fallbacks are the chain or ring steps that follow it. The
 * class-name step (CLASS_NAME_STEP) is always among diagnosisExplanation()'s
 * steps; on explain()'s alone it falls back to «Reconoce el éter».
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
  ether: Object.freeze(['chain', 'ring', 'benzene', 'count']),
  ester: Object.freeze(['diester', 'group', 'count']),
  diester: Object.freeze(['ester', 'group', 'count']),
  [CLASS_NAME_STEP]: Object.freeze(['ether', 'chain', 'ring', 'benzene', 'count']),
});

/**
 * A diagnosis (design.md §15.3 `otherName`): JSON-safe data for the
 * results panel.
 *
 * @typedef {object} Diagnosis
 * @property {string} code - A DIAGNOSES key.
 * @property {number} rule - Its rule number in design.md §15.8 R-3 (1–11; a ring or alcohol rule takes the number of the
 *   rule whose place it takes, file header; ETHER_SIDE that of the draft it replaces, R-5b2).
 * @property {string|null} traceRule - The engine trace rule the diagnosis follows ('P0'…'P4', 'N0'…'N5'; 'RING' for
 *   RING_IS_PARENT; 'RINGCHAIN' or 'RING' for HYDROXY_PARENT and CARBONYL_PARENT; ETHER_SIDE that of the draft it replaces,
 *   R-5b2; 'P1' for BRANCH_AT_END and ESTER_IN_CHAIN, R-6a3a), or null for HYDROXY_PREFIX, the C=O checks
 *   CARBONYL_SENIORITY, KETONE_NOT_ALDEHYDE, ALDEHYDE_CARBON and CARBONYL_PREFIX (R-5c3b1), the acid checks ACID_GROUP and
 *   ACID_CARBON (R-5d3), the ester checks ESTER_GROUP and ESTER_CARBON (R-6a3a), ESTER_CLASS_NAME, ESTER_TRADITIONAL and the
 *   O-bound side's (R-6a3b), the nitrile check NITRILE_CARBON (R-6b3), BENZENE_RING, SUBSTITUTED_TEMPLATE, PHENOL, the
 *   class-name codes and rules 5–11.
 * @property {string} message - The Spanish message (DIAGNOSIS_TEXTS).
 * @property {string} step - The `id` of the explain() step that explains the rule, a step of the explanation of the naming
 *   in `style` (diagnosisExplanation() builds it and finds the step; diagnosisStepIndex()); for a class name,
 *   CLASS_NAME_STEP, the step diagnosisExplanation() adds; for an ester's O-bound side (R-6a3b) `ester` or `diester`.
 * @property {{name: string, groups: string[]}|null} [className] - Only on a class-name diagnosis (R-5b2): the class name
 *   its message recommends and its two group words in that order (a repeated group twice), or null for CLASS_NAME_NONE;
 *   the class-name step quotes them (classNameStep()).
 * @property {string} style - The prefix style compared with (substituent.js PREFIX_STYLES; the student's own), the
 *   explanation context: the trace, `parent` and `step` belong to nameMolecule(molecule, {prefixStyle: style})
 *   (diagnosisNaming(); the verdict's own naming for the default style). For a rule read on an ester's O-bound side, the
 *   style of the side its message quotes (shownNaming(); review of phase I-52a3b).
 * @property {{atoms: number[], bonds: number[]}} student - The student's parent chain (or ring, its closing bond last), in
 *   the student's locant order; empty for an ether's class name (R-5b2), which has none.
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
 * Why the other numbering is right (NUMBERING, RING_NUMBERING), by trace
 * rule: at N0 for an aldehyde or a ketone (R-5c3b1, the data's `group`) the
 * C=O groups' phrase, for an acid (R-5d3) the –COOH groups', for an ester
 * (R-6a3a) the –COO– groups', for a nitrile (R-6b3) the –C≡N groups', else
 * DIAGNOSIS_PHRASES.numberingReasons (N0: the OH groups).
 *
 * @param {{rule: string, group?: string}} d - The diagnosis data.
 * @returns {string} The phrase.
 */
function numberingReason(d) {
  return d.rule === 'N0' && NAMED_GROUPS.includes(d.group) ? DIAGNOSIS_PHRASES.carbonylN0.numberingReasons[d.group]
    : DIAGNOSIS_PHRASES.numberingReasons[d.rule];
}

/**
 * What another chain numbers lower (CHAIN_LOCANTS, and ETHER_SIDE told from
 * it), by trace rule: at N0 for an aldehyde or a ketone (R-5c3b1) the C=O
 * groups, for an acid (R-5d3) the –COOH groups, for an ester (R-6a3a) the
 * –COO– groups, for a nitrile (R-6b3) the –C≡N groups, else
 * DIAGNOSIS_PHRASES.lowerLocantsOf (N0: the OH groups).
 *
 * @param {{rule: string, group?: string}} d - The diagnosis data.
 * @returns {string} The phrase.
 */
function lowerLocants(d) {
  return d.rule === 'N0' && NAMED_GROUPS.includes(d.group) ? DIAGNOSIS_PHRASES.carbonylN0.lowerLocantsOf[d.group]
    : DIAGNOSIS_PHRASES.lowerLocantsOf[d.rule];
}

/**
 * The message of a principal group's carbon on the other side of the parent
 * (groupCarbon(): ALDEHYDE_CARBON, R-5c3b1; ACID_CARBON, R-5d3;
 * ESTER_CARBON, R-6a3a; NITRILE_CARBON, R-6b3): beside a ring, the group's
 * carbon is neither a ring carbon nor a chain of its own, and the ring is the
 * parent; on a chain, the ring's suffix (`-carbaldehído`, `-carboxílico`,
 * `-carboxilato`, `-carbonitrilo`) does not apply, the group's carbon being a
 * carbon of the chain, always an end one. Either way, how the engine writes
 * the group (DIAGNOSIS_PHRASES.ending()) and its name.
 *
 * @param {{ring: boolean, name: string}} d - The draft data, with principalEnding()'s words.
 * @param {string} group - The group as the message writes it: `–CHO`, `–COOH`, `–COO–` or `–C≡N`.
 * @param {string} suffix - Its ring suffix: `carbaldehído`, `carboxílico`, `carboxilato` or `carbonitrilo`.
 * @returns {string} The message.
 */
function groupCarbonText(d, group, suffix) {
  const how = `el grupo se nombra ${DIAGNOSIS_PHRASES.ending(d)}. Se escribe «${d.name}».`;
  return d.ring
    ? `Cuando el grupo ${group} está unido a un anillo, su carbono no forma parte del anillo ni es una cadena aparte: la cadena `
      + `principal es el anillo, y ${how}`
    : `La terminación «-${suffix}» solo se usa cuando el grupo ${group} está unido a un anillo. En una cadena, el carbono del `
      + `${group} es un carbono más de la cadena principal, siempre en un extremo, y ${how}`;
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
 * Tells whether a SubstituentSpec is a group bonded through a heteroatom,
 * which is no carbon of the chain it hangs from and never lengthens it: a
 * one-atom group (isHalogen()) or an alkoxy prefix (R-5b: `metoxi`, the
 * ether oxygen between the chain and its branch); and `ciano` (R-6b1, file
 * header «Nitriles»), whose carbon the engine never counts in a chain
 * (IUPAC 2013 P-66.5: `ácido 3-cianopropanoico`), so on an end it never
 * lengthens it either; and an amino prefix (R-6c2, file header «Amines»),
 * whose nitrogen splits the carbon skeleton as an ether oxygen does
 * (`1-aminopropan-2-ol`, `1-(metilamino)propan-2-ol`).
 *
 * @param {object} sub - A SubstituentSpec (interpret.js).
 * @returns {boolean} True for a halogen, `hidroxi`, an alkoxy prefix, `ciano` or an amino prefix.
 */
function isHeteroGroup(sub) {
  return isHalogen(sub) || Boolean(sub.alkoxy) || sub.retained === CYANO || sub.kind === AMINO_KIND;
}

/**
 * Tells whether some prefixes hold a one-atom group (a halogen, R-5a1;
 * `hidroxi`, R-5a2) or an alkoxy prefix (R-5b), at any depth: the messages
 * then speak of «sustituyentes», not «ramas»; so do they beside an acyl
 * prefix (R-5c2: `acetil`, `propanoil`, `benzoil`…; `formil`, R-5c1), whose
 * C=O is an `oxo` substituent of any chain through its carbon
 * (`4-acetilhexanal` → `4-etil-5-oxohexanal`: two substituents), and beside
 * `ciano` (R-6b1), a group whose carbon is never a chain's (isHeteroGroup()).
 *
 * @param {object[]} prefixes - PrefixSpecs (interpret.js).
 * @returns {boolean} True when one is among them or inside a compound branch.
 */
function hasHalogen(prefixes) {
  return prefixes.some((prefix) => isHeteroGroup(prefix.substituent) || prefix.substituent.acyl
    || prefix.substituent.retained === FORMYL || hasHalogen(prefix.substituent.prefixes));
}

/**
 * Tells whether a branch node takes bis/tris rather than di/tri when
 * multiplied: a compound branch with prefixes of its own (render.js
 * isCompoundPrefix() for hydrocarbon branches), or an alkoxy prefix written
 * as its branch + `oxi` (R-5b, assemble.js isCompoundAlkoxy():
 * `bis(pentiloxi)`; and `bis-tert-butoxi`, as the engine writes it); a
 * retained word or a plain chain, even enclosed for its own locants
 * (`di(propan-2-il)`), and a contracted alkoxy prefix (`dimetoxi`,
 * `diisopropoxi`) are simple.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A substituent node (parse.js chain, retained or branch).
 * @returns {boolean} True for bis/tris.
 */
function isCompoundNode(tiles, node) {
  return (node.type === 'branch' && node.items.length > 0) || isCompoundAlkoxy(tiles, node);
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
 * @property {string} style - That prefix style (substituent.js PREFIX_STYLES), in which the branch-name rules name a branch
 *   (R-5c3b2, engineBranch()).
 * @property {string[]} styles - The prefix styles the engine offers for the molecule, the default first (R-6a3b: an
 *   O-bound group is the engine's when written as in one of them, oBoundGroups()).
 * @property {object} verdictNaming - The verdict's own naming (the default style), with every alternative (R-6a3b).
 * @property {boolean} sideDiffers - An ester's O-bound side none the engine writes (esterSideDiffers(); R-6a3b,
 *   oBoundChecks()).
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
 * @property {number[]} atoms - Its atoms in the order build() created them: its own chain or ring first, in the student's
 *   locant order (build.js ownPrefixAtoms(); R-5c3b2, the branch-name rules).
 * @property {object} node - The student's prefix node (parse.js) it is an occurrence of (R-6a3a: the ester prefixes at any
 *   depth, esterPrefix()).
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
    const occurrence = { sub, ...join, atoms, node };
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

/**
 * The diagnosis code of a chain dropped at a trace rule (rule 3; P0 and P1 are rule 2; P0 and N0 count an alcohol's OH
 * groups — an aldehyde's or a ketone's C=O groups, an acid's –COOH groups, an ester's –COO– groups and a nitrile's –C≡N
 * groups at P0 are MORE_CARBONYL_GROUPS, chainDropped()).
 */
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
 * the chain; nor is an alkoxy prefix (R-5b), whose ether oxygen splits the
 * carbon skeleton (`1-metoxi-1-metilpropano` blames `metil`). An
 * alkoxycarbonyl prefix beside an acid (R-6a3a, file header «Esters») is
 * bonded by its C=O carbon, which the engine's parent takes in when it sits
 * on an end, writing the ester as `oxo` and an `-oxi` prefix: ESTER_IN_CHAIN
 * (`ácido 3-(metoxicarbonil)propanoico` → `ácido 4-metoxi-4-oxobutanoico`;
 * only when that carbon is the engine's parent's).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null when no carbon branch sits on an end (never for a chain missing from P1).
 */
function branchAtEnd(ctx) {
  const { reading, tree, naming, spec } = ctx;
  const n = reading.studentParent.atoms.length;
  const parent = new Set(naming.parent.atoms);
  /**
   * Tells whether a parent-level occurrence is an alkoxycarbonyl prefix whose C=O carbon the engine's parent takes in (R-6a3a).
   *
   * @param {object} o - A prefixAtoms entry.
   * @returns {boolean} True for such a prefix.
   */
  const inChain = (o) => Boolean(spec.prefixes[o.prefix].substituent.alkoxycarbonyl) && acidPrincipal(ctx)
    && parent.has(o.attachment);
  const end = reading.prefixAtoms
    .find((o) => (o.locant === 1 || o.locant === n) && (!isHeteroGroup(spec.prefixes[o.prefix].substituent) || inChain(o)));
  if (!end) {
    return null;
  }
  if (inChain(end)) {
    return {
      code: 'ESTER_IN_CHAIN',
      traceRule: 'P1',
      data: { prefix: wordsOf(tree, tree.items[end.prefix]), length: naming.parent.atoms.length, name: naming.name },
      focus: occurrenceIds([end]),
      tiles: end.tiles || spec.parent.tiles,
    };
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
 * more OH groups) and its N0 rule 3 (CHAIN_LOCANTS: lower locants for them);
 * an aldehyde's or a ketone's (R-5c3b1) are MORE_CARBONYL_GROUPS and
 * CHAIN_LOCANTS with the C=O groups' words (the data's `group`), and an
 * acid's (R-5d3) with the –COOH groups' words (`ácido
 * 3-(carboximetil)pentanoico`, P0; N0 never drops an acid's chain: its
 * –COOH groups are at its ends, locants 1 and the last), and an ester's
 * (R-6a3a) with the –COO– groups' (`2-[(metoxicarbonil)metil]propanoato de
 * metilo`, P0; nor N0 an ester's chain, for the same reason), and a
 * nitrile's (R-6b3, file header «Nitriles») with the –C≡N groups'
 * (`3-(cianometil)pentano`, P0; nor N0 a nitrile's chain: a –C≡N's carbon
 * ends it, as a –COOH's).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {object} step - The trace step that dropped the chain.
 * @param {(candidate: object) => boolean} sameChain - Tells the student's chain's candidates.
 * @returns {object|null} The draft, or null for a rule this phase does not know.
 */
function chainDropped(ctx, step, sameChain) {
  if (aminePrincipal(ctx) && ['P0', 'N0'].includes(step.rule)) {
    // The amine groups choose or number the chain (R-6c1, file header «Amines»): phase I-52c4.
    return step.rule === 'P0' ? AMINE_NULLS.parent : AMINE_NULLS.numbering;
  }
  const group = carbonylGroup(ctx);
  const code = step.rule === 'P0' && group ? 'MORE_CARBONYL_GROUPS' : DROPPED_AT[step.rule];
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
  if (group) {
    data.group = group; // The C=O groups' words at P0 and N0 (R-5c3b1).
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
 * them. The data are chainDropped()'s for a P step. An aldehyde's or a
 * ketone's C=O groups (R-5c3b1), an acid's –COOH groups (R-5d3), an
 * ester's –COO– groups (R-6a3a) and a nitrile's –C≡N groups (R-6b3) choose
 * the chain the same way: MORE_CARBONYL_GROUPS, with the group's words.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {object} step - The trace's first chain step.
 * @returns {object|null} The draft, or null when the step is not P0 or a chain it keeps contains the student's.
 */
function fewerPrincipalGroups(ctx, step) {
  if (step.rule !== 'P0') {
    return null; // No principal group (a hydrocarbon, a halogen derivative): the old path.
  }
  const { naming, reading, spec, molecule, adj } = ctx;
  const atoms = reading.studentParent.atoms;
  if (step.survivors.some((c) => atoms.every((id) => c.atoms.includes(id)))) {
    return null; // Lengthened through its end, the student's chain carries the most OH groups: rule 1.
  }
  if (aminePrincipal(ctx)) {
    return AMINE_NULLS.parent; // The amine groups choose the chain (R-6c1, file header «Amines»): phase I-52c4.
  }
  const winner = step.survivors[0];
  const app = valueOf(step, (c) => c.key === winner.key);
  const student = suffixSites(molecule, adj, atoms).length;
  if (student >= app) {
    return null; // Never: every chain that contains the student's carries at least its OH groups, and P0 dropped them all.
  }
  const group = carbonylGroup(ctx);
  const data = { student, app, length: naming.parent.atoms.length, halogen: hasHalogen(spec.prefixes) };
  return {
    code: group ? 'MORE_CARBONYL_GROUPS' : 'MORE_HYDROXY_GROUPS',
    traceRule: step.rule,
    data: group ? { ...data, group } : data,
    focus: outsideStudent(naming.parent, reading.studentParent),
    tiles: spec.parent.tiles,
  };
} // End of function fewerPrincipalGroups()

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
      groups.set(ids[i], { key, first: i, atoms: [], compound: isCompoundNode(ctx.tree.tiles, item.substituent) });
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
 * citation (render.js prefixNameKey()). A group on an amine's nitrogen
 * (R-6c1) has the locant `N` (N_VALUE) in every numbering.
 *
 * @param {string} rule - 'N4' or 'N5'.
 * @param {object[]} groups - citedGroups() of the reading.
 * @param {number[]} atoms - The numbering: the chain's or ring's atoms in locant order.
 * @returns {number[]|{alpha: string, numeric: number[], italic: string}} The value.
 */
function ownWordsValue(rule, groups, atoms) {
  const locantOf = new Map(atoms.map((id, k) => [id, k + 1]));
  // A group on an amine's nitrogen (R-6c1) keeps its locant `N` in every numbering, as numbering.js gives it (N_LOCANT).
  const located = groups.map((g) => g.atoms.map((id) => (locantOf.has(id) ? locantOf.get(id) : N_VALUE)).sort((p, q) => p - q));
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
 * fewerPrincipalGroups(): the OH or C=O groups decide before the length). An
 * alphabetical step (N4, N5) that did not read the student's chain in the
 * student's own words (judgedInOwnWords()) blames nothing, from then on:
 * neither the chain dropped there or later nor a direction dropped there (a
 * direction dropped before it, by a rule that compares no words, stays the
 * diagnosis). A `RINGCHAIN` step (an alcohol, an aldehyde or a ketone
 * whose chain parent beats its ring, R-5a3b) lists the best chains only and
 * drops none of them: a chain it does not list is followed into P0. P0 and
 * N0 speak of the engine's principal group (an aldehyde's or a ketone's C=O
 * groups since R-5c3b1: chainDropped(), directionDraft()).
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
  const first = trace.find((s) => s.rule === 'P0' || s.rule === 'P1'); // P0 only with a principal group (R-5a2, R-5c1).
  if (!first) {
    return null; // Never: a ring parent goes through ringRules() (firstRule()).
  }
  if (!first.candidatesBefore.some(sameChain)) {
    // A chain is chosen by its OH or C=O groups first: dropped at P0 however lengthened, the branch on the end is not the mistake.
    return fewerPrincipalGroups(ctx, first) || branchAtEnd(ctx);
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
  // Every numbering rule has its reason (N0: the alcohol's OH groups, R-5a3b, or the C=O groups, R-5c3b1); the guard keeps a
  // later family's rule safe.
  if (!direction || !direction.ownWords || !DIAGNOSIS_PHRASES.numberingReasons[direction.step.rule]) {
    return null;
  }
  return directionDraft(ctx, 'NUMBERING', direction.step, isStudent);
} // End of function chainRules()

/**
 * The engine's principal group when it is an aldehyde's or a ketone's C=O
 * (file header «Aldehydes and ketones», R-5c3b1), an acid's –COOH
 * («Acids», R-5d3), an ester's –COO– («Esters», R-6a3a) or a nitrile's –C≡N
 * («Nitriles», R-6b3; NAMED_GROUPS): the group whose words the
 * parent-choice, P0 and N0 messages use; null for an alcohol's OH (the
 * messages of R-5a3b) or no principal group.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {string|null} 'aldehyde', 'ketone', 'acid', 'ester', 'nitrile' or null.
 */
function carbonylGroup(ctx) {
  const { suffix } = ctx.naming.structure;
  return suffix && NAMED_GROUPS.includes(suffix.kind) ? suffix.kind : null;
}

/**
 * Tells whether the engine's principal group is a carboxylic acid's –COOH
 * (R-5d1, file header «Acids»): the acid's own checks then run
 * (acidChecks()).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {boolean} True for an acid.
 */
function acidPrincipal(ctx) {
  const { suffix } = ctx.naming.structure;
  return Boolean(suffix) && suffix.kind === ACID;
}

/**
 * Tells whether the engine's principal group is a nitrile's –C≡N (R-6b1,
 * file header «Nitriles»): the nitrile's own checks then run
 * (nitrileChecks(), R-6b3).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {boolean} True for a nitrile.
 */
function nitrilePrincipal(ctx) {
  const { suffix } = ctx.naming.structure;
  return Boolean(suffix) && suffix.kind === NITRILE;
}

/**
 * Tells whether the engine's principal group is an amine (R-6c1, file
 * header «Amines»): its parent choice, P0, N0 and suffix locants are then
 * deliberate nulls (phase I-52c4).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {boolean} True for an amine.
 */
function aminePrincipal(ctx) {
  const { suffix } = ctx.naming.structure;
  return Boolean(suffix) && suffix.kind === AMINE;
}

/**
 * The engine's prefix groups without their occurrences on an amine's
 * nitrogen (R-6c1; locant `N`, N_VALUE), as render.js carbonLocantPrefixes()
 * counts them for the omission of the locants (not imported: the reverse
 * modules never import the rendering), and whether there were any.
 *
 * @param {object[]} prefixes - The engine's prefix groups (structure.js PrefixGroup).
 * @returns {{prefixes: object[], nitrogen: boolean}} The carbon groups, and whether some group is on the nitrogen.
 */
function carbonPrefixGroups(prefixes) {
  const carbon = prefixes.map((group) => ({ ...group, locants: group.locants.filter((site) => site.locant !== N_VALUE) }))
    .filter((group) => group.locants.length > 0);
  const nitrogen = prefixes.some((group) => group.locants.some((site) => site.locant === N_VALUE));
  return { prefixes: carbon, nitrogen };
}

/**
 * The draft of a numbering mistake (rule 4: NUMBERING on a chain,
 * RING_NUMBERING on a ring): the trace step that dropped the student's
 * numbering while its chain or ring stayed, the first difference between
 * the survivors' value and the student's, and whether the engine's name
 * writes no locant at all (`propeno`, `metilciclohexano`); for an aldehyde or
 * a ketone (R-5c3b1) the principal group, whose words N0 uses
 * (`pentan-4-ona`, `ciclohexan-3-ona`), and likewise for an acid (R-5d3:
 * `ácido ciclohexano-1,5-dicarboxílico`, `ácido benceno-1,5-dicarboxílico`)
 * and an ester (R-6a3a: `ciclohexano-1,5-dicarboxilato de dimetilo`,
 * `ciclohexano-2-carboxilato de metilo`) and a nitrile (R-6b3:
 * `ciclohexano-1,5-dicarbonitrilo`, `benceno-1,5-dicarbonitrilo`).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {string} code - 'NUMBERING' or 'RING_NUMBERING'.
 * @param {object} step - The trace step that dropped the student's numbering.
 * @param {(candidate: object) => boolean} isStudent - Tells the student's directed candidate.
 * @returns {object} The draft.
 */
function directionDraft(ctx, code, step, isStudent) {
  if (step.rule === 'N0' && aminePrincipal(ctx)) {
    return AMINE_NULLS.numbering; // The amine groups number the chain or ring (R-6c1, file header «Amines»): phase I-52c4.
  }
  const { naming } = ctx;
  const winner = step.survivors[0];
  const terms = firstDifference(valueOf(step, (c) => c.key === winner.key), valueOf(step, isStudent));
  const unwritten = !naming.parts.some((p) => p.kind === 'locant');
  const group = carbonylGroup(ctx);
  return {
    code,
    traceRule: step.rule,
    data: { rule: step.rule, ...terms, unwritten, name: naming.name, ...(group ? { group } : {}) },
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
 * The parent choice between the ring and a chain made by the principal
 * groups (file header «Alcohols», R-5a3b; «Aldehydes and ketones», R-5c3b1;
 * design.md §13.4 I-40a): the student's parent is an open chain and the
 * engine's the ring, or the reverse, in a molecule with OH groups
 * (HYDROXY_PARENT) or with an aldehyde's or a ketone's C=O groups, an
 * acid's –COOH groups, an ester's –COO– groups or a nitrile's –C≡N groups
 * (CARBONYL_PARENT, the data's `group` naming them; R-5c3b1, R-5d3, R-6a3a,
 * R-6b3: `[(metoxicarbonil)metil]ciclohexano` → `2-ciclohexiletanoato de
 * metilo`, `(2-cianoetil)ciclohexano` → `3-ciclohexilpropanonitrilo`;
 * an ester prefix bonded by its oxygen, whose ring or chain goes into the
 * O-bound group, never a branch, is CARBONYL_PREFIX first, esterChecks()).
 * The engine's parent is
 * the one carrying more of them, the ring on a tie: the counts are the
 * `RINGCHAIN` step's (the ring's first, then the best chains'); without that
 * step the parent is the ring, which carries every one. The focus is the
 * engine's parent outside the student's; the tiles, the prefix that holds it.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft (with the step of its case), or null when the parents are of one kind or the molecule
 *   has no principal group.
 */
function principalParent(ctx) {
  const { naming, reading, spec } = ctx;
  const { structure } = naming;
  const ringParent = structure.parentKind === 'ring';
  if (!structure.suffix || isRing(spec.parent.kind) === ringParent) {
    return null;
  }
  if (aminePrincipal(ctx)) {
    return AMINE_NULLS.parent; // The amine groups choose the ring or the chain (R-6c1, file header «Amines»): phase I-52c4.
  }
  const choice = naming.trace.find((s) => s.rule === 'RINGCHAIN');
  const ring = choice ? choice.values[0] : structure.suffix.locants.length;
  const chain = choice && choice.values.length > 1 ? choice.values[1] : 0;
  let step = 'ringChain';
  if (!choice) {
    step = benzeneParent(naming) ? 'benzene' : 'ring';
  }
  const group = carbonylGroup(ctx);
  const data = { ring, chain, chainParent: !ringParent, name: naming.name };
  return {
    code: group ? 'CARBONYL_PARENT' : 'HYDROXY_PARENT',
    traceRule: choice ? 'RINGCHAIN' : 'RING',
    data: group ? { ...data, group } : data,
    focus: outsideStudent(naming.parent, reading.studentParent),
    tiles: parentHolderTiles(ctx),
    step,
  };
} // End of function principalParent()

/**
 * How the engine writes its principal C=O group (R-5c3b1, the messages'
 * DIAGNOSIS_PHRASES.ending()): the suffix's words (suffixWordOf(): `al`,
 * `diona`, `carbaldehído`), and whether the name is built on `benzaldehído`
 * instead (benzene with one –CHO: `4-metilbenzaldehído`); for an acid's
 * –COOH (R-5d3) `acid` (the class word `ácido` first: `oico`, `dioico`,
 * `carboxílico`), and whether the name is built on `ácido benzoico` (benzene
 * with one –COOH: `ácido 4-metilbenzoico`); for an ester's –COO– (R-6a3a)
 * `ester` (`oato`, `dioato`, `carboxilato`, then `de` and the O-bound
 * groups), whether the name is built on `benzoato` (benzene with one –COO–:
 * `4-metilbenzoato de etilo`) and how many –COO– groups there are (`groups`,
 * one O-bound group each); for a nitrile's –C≡N (R-6b3: `nitrilo`,
 * `dinitrilo`, `carbonitrilo`), whether the name is built on `benzonitrilo`
 * (benzene with one –C≡N: `4-metilbenzonitrilo`).
 *
 * @param {object} naming - The naming compared with, its suffix an aldehyde's, a ketone's, an acid's, an ester's or a nitrile's.
 * @returns {{ending: string, benzaldehyde: boolean, acid: boolean, benzoic: boolean, ester: boolean, benzoate: boolean,
 *   groups: number, benzonitrile: boolean}} The words.
 */
function principalEnding(naming) {
  const { suffix } = naming.structure;
  const one = benzeneParent(naming) && Boolean(suffix.outside) && suffix.locants.length === 1;
  return {
    ending: suffixWordOf(suffix),
    benzaldehyde: one && suffix.kind === ALDEHYDE,
    acid: suffix.kind === ACID,
    benzoic: one && suffix.kind === ACID,
    ester: suffix.kind === ESTER,
    benzoate: one && suffix.kind === ESTER,
    groups: suffix.locants.length,
    benzonitrile: one && suffix.kind === NITRILE,
  };
} // End of function principalEnding()

/**
 * The atoms and bonds of some suffix groups of the student's (build.js
 * `suffixAtoms` of the reading): each group's carbon — the –CHO's own carbon
 * of `carbaldehído`, else the parent carbon that carries it — and its oxygen,
 * with the bonds between them; a –COOH's OH too (R-5d3: `hydroxy`), and a
 * –COO–'s bridge oxygen (R-6a3a: `bridge`).
 *
 * @param {object[]} groups - The reading's suffixAtoms entries.
 * @returns {{atoms: number[], bonds: number[]}} The ids.
 */
function suffixFocus(groups) {
  /**
   * The OH of a –COOH group or the bridge O of a –COO– group, as atoms or bonds (none for another group).
   *
   * @param {object} g - A suffixAtoms entry.
   * @param {string} key - 'hydroxy', 'hydroxyBond', 'bridge' or 'bridgeBond'.
   * @returns {number[]} The id, or nothing.
   */
  const oh = (g, key) => (g[key] === undefined ? [] : [g[key]]);
  return {
    atoms: groups.flatMap((g) => [g.carbon === undefined ? g.parentAtom : g.carbon, g.attachment, ...oh(g, 'hydroxy'),
      ...oh(g, 'bridge')]),
    bonds: groups.flatMap((g) => [g.bond, ...oh(g, 'hydroxyBond'), ...oh(g, 'bridgeBond')]),
  };
} // End of function suffixFocus()

/**
 * The prefix the engine gives the student's junior suffix groups
 * (CARBONYL_SENIORITY): `oxo` or `hidroxi` (lexicon GROUP_PREFIXES) when
 * every one of their carbons is a carbon of the engine's parent; an
 * aldehyde's –CHO beside an acid (R-5d3) `oxo` when its own carbon is one of
 * the parent's (`3-carboxipropanal` → `ácido 4-oxobutanoico`), `formil` when
 * it hangs from the parent (`4-carboxibenzaldehído` → `ácido
 * 4-formilbenzoico`); a nitrile's –C≡N beside an acid or an ester (R-6b3)
 * `ciano` when its carbon hangs from the parent (`3-carboxipropanonitrilo` →
 * `ácido 3-cianopropanoico`: the engine never counts that carbon in a
 * chain); else null — part of another prefix (the ketone's carbon in an
 * `acetil` branch), or groups the engine writes otherwise.
 * Beside an ester (R-6a3a) the chain may be an O-bound group's own
 * (juniorPlacement()).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {string} kind - The student's suffix kind.
 * @param {object[]} groups - The reading's suffixAtoms entries.
 * @param {number[]} chain - The chain the prefix would go on: the engine's parent, or an O-bound group's chain.
 * @returns {string|null} The prefix's word, or null.
 */
function juniorPrefix(ctx, kind, groups, chain) {
  const parent = new Set(chain);
  if (groups.length === 0) {
    return null;
  }
  if (kind !== ALDEHYDE && kind !== NITRILE) {
    return groups.every((g) => parent.has(g.parentAtom)) ? GROUP_PREFIXES[kind] : null;
  }
  const carbons = aldehydeCarbons(groups, 'parentAtom');
  if (kind === ALDEHYDE && carbons.every((id) => parent.has(id))) {
    return GROUP_PREFIXES[kind];
  }
  const hanging = carbons.every((id) => !parent.has(id) && ctx.adj.get(id).some((n) => parent.has(n.atom)));
  if (!hanging) {
    return null;
  }
  return kind === ALDEHYDE ? WORDS.formil : GROUP_PREFIXES[kind];
} // End of function juniorPrefix()

/**
 * Where the engine writes the student's junior suffix groups
 * (CARBONYL_SENIORITY; DIAGNOSIS_PHRASES.juniorPlace()): their prefix on the
 * engine's parent (juniorPrefix()); beside an ester (R-6a3a, file header
 * «Esters») the groups whose carbons are an O-bound group's go into that
 * group's name (`side` 'oBound', the prefix on its own chain:
 * `2-(acetiloxi)heptanal` → `etanoato de 1-oxoheptan-2-ilo`); a student's
 * ester suffix beside an acid's –COOH (R-6a3a) is written `oxo` and an `-oxi`
 * prefix when its C=O carbon is the engine's parent's (`inChain`:
 * `4-carboxibutanoato de metilo` → `ácido 5-metoxi-5-oxopentanoico`), else
 * as the ester prefix of the engine's name that holds that carbon
 * (`etanoato de 2-carboxietilo` → `ácido 3-(acetiloxi)propanoico`), or null
 * when the groups are written otherwise. A student's nitrile suffix beside an
 * acid or an ester (R-6b3) becomes `ciano` on the parent, or on the O-bound
 * group that holds its carbon (`2-(acetiloxi)etanonitrilo` → `etanoato de
 * cianometilo`).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {string} kind - The student's suffix kind.
 * @param {object[]} groups - The reading's suffixAtoms entries.
 * @returns {{prefix: string|null, side?: string, inChain?: boolean}} The placement.
 */
function juniorPlacement(ctx, kind, groups) {
  const { naming } = ctx;
  if (kind === ESTER) {
    const carbons = aldehydeCarbons(groups, 'parentAtom');
    if (carbons.length > 0 && carbons.every((id) => naming.parent.atoms.includes(id))) {
      return { prefix: null, inChain: true };
    }
    const words = carbons.map((id) => {
      const part = (naming.parts || []).find((p) => p.kind === 'prefix' && (p.atoms || []).includes(id));
      const text = part ? partText(naming.parts, part) : '';
      return text.endsWith(WORDS.oxi) || text.endsWith(WORDS.carbonil) ? text : null; // `acetiloxi`, `metoxicarbonil`
    });
    return { prefix: words.length > 0 && words.every((w) => w && w === words[0]) ? words[0] : null };
  }
  const prefix = juniorPrefix(ctx, kind, groups, naming.parent.atoms);
  if (prefix || !esterPrincipal(ctx) || groups.length === 0) {
    return { prefix };
  }
  const own = kind === ALDEHYDE || kind === NITRILE; // A –CHO's or a –C≡N's own carbon (`carbaldehído`, `carbonitrilo`).
  const carbons = own ? aldehydeCarbons(groups, 'parentAtom') : groups.map((g) => g.parentAtom);
  const part = esterParts(naming.structure).find((p) => carbons.every((id) => p.alkyl.atoms.includes(id)));
  return part ? { prefix: juniorPrefix(ctx, kind, groups, part.alkyl.chain.atoms), side: 'oBound' } : { prefix: null };
} // End of function juniorPlacement()

/**
 * CARBONYL_SENIORITY (R-5c3b1, file header «Aldehydes and ketones»): the
 * student's suffix is a group junior to the engine's principal one
 * (naming/seniority.js seniorityRank(): `ona` beside an aldehyde,
 * `5-oxopentan-2-ona` → `4-oxopentanal`; `ol` beside a ketone,
 * `4-oxopentan-2-ol` → `4-hidroxipentan-2-ona`; `fenol` beside a –CHO; R-5d3,
 * «Acids»: any of them beside an acid's –COOH, `4-carboxibutan-2-ona` →
 * `ácido 4-oxopentanoico`, `4-carboxifenol` → `ácido 4-hidroxibenzoico`,
 * `3-carboxipropanal` → `ácido 4-oxobutanoico`; R-6a3a, «Esters»: any of
 * them beside an ester's –COO–, `3-(metoxicarbonil)pentan-2-ona` →
 * `2-etil-3-oxobutanoato de metilo`, `2-(acetiloxi)heptanal` → `etanoato de
 * 1-oxoheptan-2-ilo`, and an ester's suffix beside an acid's –COOH,
 * `4-carboxibutanoato de metilo`; R-6b3, «Nitriles»: any of the junior ones
 * beside a nitrile's –C≡N, `4-cianobutan-2-ona` → `4-oxopentanonitrilo`, and a
 * nitrile's suffix beside an acid's –COOH or an ester's –COO–,
 * `3-carboxipropanonitrilo` → `ácido 3-cianopropanoico`, whose `ciano` takes
 * the –C≡N's carbon out of the chain, `ring` telling the engine's ring
 * parent). The student's groups become prefixes of
 * the engine's name (juniorPlacement()), or part of another prefix (`prefix`
 * null). The focus is the student's suffix groups; the tiles, the
 * suffix's. An `al` beside an acid whose carbon a branch bonds to a second
 * carbon is no aldehyde at all (`1-carboxi-2,3-dietilbutanal`,
 * `1-(1,2-dicarboxietil)butanal`): KETONE_NOT_ALDEHYDE says what it is
 * (acidChecks()), never «el –CHO del aldehído».
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function carbonylSeniority(ctx) {
  const { naming, spec, reading, molecule, adj } = ctx;
  const mine = spec.suffix;
  const engine = naming.structure.suffix;
  if (!mine || seniorityRank(mine.kind) <= seniorityRank(engine.kind)) {
    return null;
  }
  const groups = reading.suffixAtoms || [];
  /**
   * Tells whether an `al` group's carbon is bonded to two carbons (a ketone's C=O, KETONE_NOT_ALDEHYDE).
   *
   * @param {object} g - A suffixAtoms entry.
   * @returns {boolean} True for such a carbon.
   */
  const ketone = (g) => adj.get(g.parentAtom).filter((n) => molecule.atoms.get(n.atom).element === CARBON).length >= 2;
  if (mine.kind === ALDEHYDE && !mine.outside && groups.some(ketone)) {
    return null;
  }
  return {
    code: 'CARBONYL_SENIORITY',
    data: {
      group: engine.kind,
      ...principalEnding(naming),
      junior: mine.kind,
      count: mine.slots.length,
      ...juniorPlacement(ctx, mine.kind, groups),
      ring: naming.structure.parentKind === 'ring',
      name: naming.name,
    },
    focus: suffixFocus(groups),
    tiles: [mine.tiles[0], mine.tiles[1]],
  };
} // End of function carbonylSeniority()

/**
 * KETONE_NOT_ALDEHYDE (R-5c3b1): the student's `al` (or an aldehyde
 * template's –CHO) on a carbon bonded to two carbons — by a carbon branch of
 * the student's on it (`1-metilpropanal` → `butan-2-ona`, `1-acetilhexanal`
 * → `octano-2,3-diona`, `1-metilbutanodial` → `4-oxopentanal`,
 * `1-(4-metilfenil)acetaldehído`): that C=O is a ketone's. The data name the
 * branch as the student wrote it and the carbon's locant; the focus is the
 * C=O and the branch; the tiles, the suffix's.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function ketoneNotAldehyde(ctx) {
  const { spec, reading, molecule, adj, tree, naming } = ctx;
  const mine = spec.suffix;
  if (!mine || mine.kind !== ALDEHYDE || mine.outside) {
    return null;
  }
  /**
   * The carbons bonded to an atom.
   *
   * @param {number} id - Atom id.
   * @returns {number} How many.
   */
  const carbons = (id) => adj.get(id).filter((n) => molecule.atoms.get(n.atom).element === CARBON).length;
  const group = (reading.suffixAtoms || []).find((g) => carbons(g.parentAtom) >= 2);
  if (!group) {
    return null;
  }
  const branch = reading.prefixAtoms
    .find((o) => o.parentAtom === group.parentAtom && !isHeteroGroup(spec.prefixes[o.prefix].substituent));
  const focus = suffixFocus([group]);
  if (branch) {
    focus.atoms.push(...branch.atoms);
    focus.bonds.push(branch.bond, ...branch.bonds);
  }
  return {
    code: 'KETONE_NOT_ALDEHYDE',
    data: { branch: branch ? wordsOf(tree, tree.items[branch.prefix]) : null, locant: group.locant, name: naming.name },
    focus,
    tiles: [mine.tiles[0], mine.tiles[1]],
  };
} // End of function ketoneNotAldehyde()

/**
 * The –CHO carbons of some suffix groups: a `carbaldehído` group's own carbon
 * (SuffixLocant or build.js suffixAtoms `carbon`), else the carbon that
 * carries the C=O (the engine's `atom`, the student's `parentAtom`).
 *
 * @param {object[]} groups - The engine's suffix sites, or the reading's suffixAtoms entries.
 * @param {string} key - The key of the carrying carbon: 'atom' (the engine's) or 'parentAtom' (the student's).
 * @returns {number[]} The carbons' atom ids.
 */
function aldehydeCarbons(groups, key) {
  return groups.map((g) => (g.carbon === undefined ? g[key] : g.carbon));
}

/**
 * The –CHO's or –COOH's carbon on the other side of the parent (R-5c3b1
 * ALDEHYDE_CARBON, R-5d3 ACID_CARBON): the student's suffix and the engine's
 * are the group `kind`, one placed outside the parent and the other not —
 * `carbaldehído` or `carboxílico` after a chain, whose group's carbon is a
 * chain carbon (`butano-1-carbaldehído` → `pentanal`, `ácido
 * propano-1-carboxílico` → `ácido butanoico`), or the group's carbon taken
 * into the student's chain beside a ring, which carries it outside
 * (`ciclohexilformaldehído` → `ciclohexanocarbaldehído`, `fenilformaldehído`
 * → `benzaldehído`; `ácido ciclohexilmetanoico` → `ácido
 * ciclohexanocarboxílico`, `ácido fenilfórmico` → `ácido benzoico`). Only
 * when the student's groups are the engine's own (every group carbon of the
 * student's suffix one of the engine's suffix group carbons; review of phase
 * I-51c3b1): with other groups the parent choice is the mistake
 * (`2-(4-formilciclohexil)etanal`, whose `al` ends a side chain while the
 * engine's `carbaldehído` is the ring's: CARBONYL_PARENT). The focus is the
 * student's groups; the tiles, the suffix's. The –COO– (R-6a3a,
 * ESTER_CARBON) and the –C≡N (R-6b3, NITRILE_CARBON: `propano-1-carbonitrilo`
 * → `butanonitrilo`, `ciclohexilmetanonitrilo` → `ciclohexanocarbonitrilo`)
 * the same way.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {string} kind - ALDEHYDE, ACID, ESTER or NITRILE.
 * @param {string} code - 'ALDEHYDE_CARBON', 'ACID_CARBON', 'ESTER_CARBON' or 'NITRILE_CARBON'.
 * @returns {object|null} The draft, or null.
 */
function groupCarbon(ctx, kind, code) {
  const { spec, naming, reading } = ctx;
  const mine = spec.suffix;
  const engine = naming.structure.suffix;
  if (!mine || mine.kind !== kind || engine.kind !== kind || Boolean(mine.outside) === Boolean(engine.outside)) {
    return null;
  }
  const groups = reading.suffixAtoms || [];
  const engineCarbons = new Set(aldehydeCarbons(engine.locants, 'atom'));
  if (groups.length === 0 || !aldehydeCarbons(groups, 'parentAtom').every((id) => engineCarbons.has(id))) {
    return null; // Other groups than the engine's: the parent choice or the chain rules speak.
  }
  return {
    code,
    data: { ring: Boolean(engine.outside), ...principalEnding(naming), name: naming.name },
    focus: suffixFocus(groups),
    tiles: [mine.tiles[0], mine.tiles[1]],
  };
} // End of function groupCarbon()

/**
 * ALDEHYDE_CARBON (R-5c3b1): the –CHO's carbon on the other side of the
 * parent (groupCarbon()).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function aldehydeCarbon(ctx) {
  return groupCarbon(ctx, ALDEHYDE, 'ALDEHYDE_CARBON');
}

/**
 * The oxygen of a parent-level prefix's own C=O (R-5c3b1): an `oxo`'s one
 * atom, or the oxygen double-bonded to the carbon by which a `formil`, an
 * acyl prefix (`acetil`, `propanoil`, `benzoil`, `…carbonil`) or, since
 * R-5d3, a `carboxi` is bonded; null for any other prefix (a C=O deeper
 * inside a compound branch is not its own).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {object} occurrence - A prefixAtoms entry of the reading.
 * @returns {number|null} The oxygen's atom id, or null.
 */
function ownCarbonylOxygen(ctx, occurrence) {
  const sub = ctx.spec.prefixes[occurrence.prefix].substituent;
  if (sub.kind === OXO_KIND) {
    return occurrence.attachment;
  }
  if (!sub.acyl && sub.retained !== FORMYL && sub.retained !== CARBOXY) {
    return null;
  }
  const link = ctx.adj.get(occurrence.attachment)
    .find((n) => n.order === 2 && ctx.molecule.atoms.get(n.atom).element === OXO_ELEMENT);
  return link ? link.atom : null;
} // End of function ownCarbonylOxygen()

/**
 * The atom of a parent-level prefix's own principal group, the one the
 * engine's suffix site names (SuffixLocant `attachAtom`; CARBONYL_PREFIX): the
 * oxygen of its own C=O (ownCarbonylOxygen()), or for a `ciano` (R-6b3, file
 * header «Nitriles») the nitrogen triple-bonded to the carbon by which it is
 * bonded, the –C≡N whose carbon it includes.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {object} occurrence - A prefixAtoms entry of the reading.
 * @returns {number|null} The atom's id, or null.
 */
function ownGroupAtom(ctx, occurrence) {
  if (ctx.spec.prefixes[occurrence.prefix].substituent.retained !== CYANO) {
    return ownCarbonylOxygen(ctx, occurrence);
  }
  const link = ctx.adj.get(occurrence.attachment).find((n) => n.order === 3);
  return link ? link.atom : null;
}

/**
 * CARBONYL_PREFIX (R-5c3b1), HYDROXY_PREFIX's analogue: a C=O the engine
 * cites in the suffix, written by the student as a parent-level prefix whose
 * own C=O it is (ownCarbonylOxygen(): `2-oxopropano`, `formilciclohexano`,
 * `5-oxopentanal` → `pentanodial`, `oxoacetaldehído` → `etanodial`; an acyl
 * prefix, `acetilbenceno` → `1-feniletan-1-ona`; R-5d3, «Acids»: the –COOH of
 * a `carboxi`, `carboxiciclohexano` → `ácido ciclohexanocarboxílico`, `ácido
 * 3-carboxipropanoico` → `ácido butanodioico`, `ácido 4-carboxiftálico`),
 * while the student's suffix cites fewer groups than the engine's (or none):
 * with as many, the student did write the principal groups in the suffix,
 * and the acyl prefix's carbon belongs to a chain the chain rules compare
 * (`4-propanoilheptano-2,6-diona` → CHAIN_LOCANTS at N0). A `formil`, acyl
 * or `carboxi` prefix's carbon then joins the engine's parent chain (`joins`,
 * unless the group is a ring's `carbaldehído` or `carboxílico`), and a
 * student's ring parent becomes a branch (`ringBranch`). R-6b3, «Nitriles»:
 * the –C≡N of a `ciano` (ownGroupAtom(): `cianometano` → `etanonitrilo`,
 * `cianobenceno` → `benzonitrilo`, `4-cianobutanonitrilo` →
 * `pentanodinitrilo`, the templates `2-cianoacetonitrilo`,
 * `4-cianoftalonitrilo`), whose carbon joins the chain as `nitrilo`'s carbon
 * 1 (or last), never a ring's. The focus is those prefixes; the tiles, the
 * first one's.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function carbonylPrefix(ctx) {
  const { naming, reading, spec, tree } = ctx;
  const { suffix, parentKind } = naming.structure;
  if ((spec.suffix ? spec.suffix.slots.length : 0) >= suffix.locants.length) {
    return null; // The student's suffix cites every principal group.
  }
  const atoms = new Set(suffix.locants.map((site) => site.attachAtom));
  const written = reading.prefixAtoms.filter((o) => atoms.has(ownGroupAtom(ctx, o)));
  if (written.length === 0) {
    return null;
  }
  const sub = spec.prefixes[written[0].prefix].substituent;
  const count = suffix.locants.length;
  const carbon = sub.acyl || [FORMYL, CARBOXY, CYANO].includes(sub.retained); // A prefix bonded by the group's own carbon.
  return {
    code: 'CARBONYL_PREFIX',
    data: {
      group: suffix.kind,
      count,
      ...principalEnding(naming),
      prefix: wordsOf(tree, tree.items[written[0].prefix]),
      acyl: Boolean(sub.acyl),
      joins: Boolean(carbon) && !suffix.outside,
      ringBranch: isRing(spec.parent.kind) && parentKind !== 'ring',
      on: groupsOnOf(naming.structure),
      name: naming.name,
    },
    focus: occurrenceIds(written),
    tiles: written[0].tiles || spec.parent.tiles,
  };
} // End of function carbonylPrefix()

/**
 * Every –COOH of a molecule (R-5d3, review of phase I-51d3): a carbon with an
 * oxygen double-bonded to it and an OH (an oxygen bonded to it alone; an
 * ester's oxygen has two bonds), wherever it is — the engine's suffix
 * groups, a `carboxi` prefix at any depth, or one the student wrote as two
 * groups.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {{carbon: number, oxygen: number, bond: number, hydroxy: number, hydroxyBond: number}[]} The groups.
 */
function moleculeCarboxyls(ctx) {
  const { molecule, adj } = ctx;
  /**
   * The bond from a carbon to an oxygen bonded to nothing else, of an order.
   *
   * @param {number} id - The carbon.
   * @param {number} order - 2 for the C=O, 1 for the OH.
   * @returns {{atom: number, bond: number}|undefined} The link.
   */
  const lone = (id, order) => adj.get(id).find((n) => n.order === order
    && molecule.atoms.get(n.atom).element === OXO_ELEMENT && adj.get(n.atom).length === 1);
  const groups = [];
  for (const [id, atom] of molecule.atoms) {
    const oxo = atom.element === CARBON ? lone(id, 2) : undefined;
    const oh = oxo ? lone(id, 1) : undefined;
    if (oh) {
      groups.push({ carbon: id, oxygen: oxo.atom, bond: oxo.bond, hydroxy: oh.atom, hydroxyBond: oh.bond });
    }
  }
  return groups;
} // End of function moleculeCarboxyls()

/**
 * Every branch the student wrote inside the O-bound groups of an ester, at
 * every depth, found on the molecule of one reading (R-6a3a): the O-bound
 * side is no prefix of the name (branchOccurrences() never sees it), but a
 * group written in it is the student's all the same (`etanoato de
 * 2-carboxietilo`: its `carboxi`, the engine's –COOH). Each O-bound group's
 * own branches are cut from its atoms (build.js ownPrefixAtoms(); reading
 * `esterAtoms`, in creation order) and joined by their one bond, as
 * branchOccurrences() does.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {{sub: object, attachment: number, parentAtom: number, order: number, atoms: number[]}[]} The occurrences.
 */
function oBoundOccurrences(ctx) {
  const { reading, spec, adj } = ctx;
  const out = [];
  /**
   * Records the own branches of a group's occurrence, then theirs.
   *
   * @param {object} sub - The group's SubstituentSpec.
   * @param {number[]} atoms - Its atoms in creation order.
   * @returns {void}
   */
  const visit = (sub, atoms) => {
    ownPrefixAtoms(sub, atoms).forEach((slices, k) => {
      for (const slice of slices) {
        const join = joinOf(slice, adj);
        if (join && sub.prefixes[k]) {
          out.push({ sub: sub.prefixes[k].substituent, ...join, atoms: slice });
          visit(sub.prefixes[k].substituent, slice);
        }
      }
    });
  }; // End of function visit()
  for (const occurrence of reading.esterAtoms || []) {
    const group = spec.ester && spec.ester.groups[occurrence.group];
    if (group) {
      visit(group.substituent, occurrence.atoms);
    }
  }
  return out;
} // End of function oBoundOccurrences()

/**
 * The student's –COOH groups found on the molecule of one reading (R-5d3):
 * the carbon of each group of an acid suffix (`oico`, `carboxílico`,
 * `benzoico`, a retained acid's word; build.js suffixAtoms with `hydroxy`)
 * and of each `carboxi` prefix, at any depth (branchOccurrences()), also
 * inside an ester's O-bound groups (R-6a3a, oBoundOccurrences(): `etanoato de
 * 2-carboxietilo`, the student's ester suffix beside the engine's –COOH).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {Set<number>} The groups' carbons.
 */
function studentCarboxylCarbons(ctx) {
  const { reading, tree, spec, molecule, adj } = ctx;
  const suffix = (reading.suffixAtoms || []).filter((g) => g.hydroxy !== undefined);
  const prefixes = [...branchOccurrences({ tree, spec }, reading, molecule, adj).all, ...oBoundOccurrences(ctx)]
    .filter((o) => o.sub.kind === 'retained' && o.sub.retained === CARBOXY);
  return new Set([...aldehydeCarbons(suffix, 'parentAtom'), ...prefixes.map((o) => o.attachment)]);
}

/**
 * ACID_GROUP (R-5d3, file header «Acids»): a –COOH of the molecule written
 * by the student as two groups on one carbon — its C=O and its OH apart,
 * each named as another group (`1-hidroxipropanal`, `1-oxopropan-1-ol`,
 * `1-hidroxi-1-oxopropano` → `ácido propanoico`; `(hidroxioxometil)ciclohexano`
 * → `ácido ciclohexanocarboxílico`): no `oico`, `carboxílico`, `benzoico`,
 * retained acid or `carboxi` of the student's has that carbon
 * (studentCarboxylCarbons()). Every –COOH of the molecule is inspected
 * (moleculeCarboxyls(); review of phase I-51d3), not only the engine's
 * suffix groups: one the engine writes as a `carboxi` prefix, split by the
 * student beside another –COOH (`1-hidroxi-2-(4-carboxiciclohexil)etanal` →
 * `ácido 4-(carboximetil)ciclohexano-1-carboxílico`), is ACID_GROUP too —
 * never a seniority message about an aldehyde, a ketone or an alcohol that
 * is really part of a –COOH. The message says the three atoms are one group
 * and how the engine writes that –COOH: the suffix's words when one of the
 * split groups is the engine's suffix group (`principal`), else the
 * `carboxi` prefix beside the –COOH groups that give the ending. The focus is
 * those groups (the carbon, both oxygens and their bonds); the tiles, those
 * of the student's parent-level prefix that holds one of their oxygens, else
 * the suffix's.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function acidSplit(ctx) {
  const { naming, reading, spec } = ctx;
  const { suffix } = naming.structure;
  const mine = studentCarboxylCarbons(ctx);
  const split = moleculeCarboxyls(ctx).filter((group) => !mine.has(group.carbon));
  if (split.length === 0) {
    return null;
  }
  const engine = new Set(aldehydeCarbons(suffix.locants, 'atom'));
  const oxygens = split.flatMap((group) => [group.oxygen, group.hydroxy]);
  const holder = reading.prefixAtoms.find((o) => o.atoms.some((id) => oxygens.includes(id)));
  let tiles = spec.suffix ? [spec.suffix.tiles[0], spec.suffix.tiles[1]] : spec.parent.tiles;
  if (holder && holder.tiles) {
    tiles = holder.tiles;
  }
  return {
    code: 'ACID_GROUP',
    data: {
      count: suffix.locants.length,
      ...principalEnding(naming),
      on: groupsOnOf(naming.structure),
      principal: split.some((group) => engine.has(group.carbon)),
      name: naming.name,
    },
    focus: {
      atoms: split.flatMap((group) => [group.carbon, group.oxygen, group.hydroxy]),
      bonds: split.flatMap((group) => [group.bond, group.hydroxyBond]),
    },
    tiles,
  };
} // End of function acidSplit()

/**
 * ACID_CARBON (R-5d3, file header «Acids»): the –COOH's carbon on the other
 * side of the parent (groupCarbon()), ALDEHYDE_CARBON's twin.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function acidCarbon(ctx) {
  return groupCarbon(ctx, ACID, 'ACID_CARBON');
}

/**
 * Tells whether the engine's principal group is an ester's –COO– (R-6a1,
 * file header «Esters»): its own checks then run (esterChecks(), R-6a3a).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {boolean} True for an ester.
 */
function esterPrincipal(ctx) {
  const { suffix } = ctx.naming.structure;
  return Boolean(suffix) && suffix.kind === ESTER;
}

/**
 * The C=O carbon of an occurrence of one of the student's ester prefixes
 * (R-6a3a): an alkoxycarbonyl prefix's carbon by which it is bonded
 * (`metoxicarbonil`), an acyloxy prefix's carbon on the other side of the
 * oxygen by which it is bonded (`acetiloxi`, `benzoiloxi`); null for any
 * other branch.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {BranchOccurrence} occurrence - A branch on the molecule (branchOccurrences()).
 * @returns {number|null} The carbon's atom id, or null.
 */
function esterPrefixCarbon(ctx, occurrence) {
  const kind = esterPrefixOf(occurrence.sub);
  if (kind === 'alkoxycarbonyl') {
    return occurrence.attachment;
  }
  if (kind !== 'acyloxy') {
    return null;
  }
  const link = ctx.adj.get(occurrence.attachment).find((n) => n.atom !== occurrence.parentAtom && occurrence.atoms.includes(n.atom));
  return link ? link.atom : null;
} // End of function esterPrefixCarbon()

/**
 * The carbons of the student's –COO– groups found on the molecule of one
 * reading (R-6a3a): each group of an ester suffix (`oato`, `carboxilato`,
 * `benzoato`, a retained ester word; build.js suffixAtoms with `bridge`) and
 * each ester prefix, at any depth (esterPrefixCarbon()), also inside the
 * O-bound groups (oBoundOccurrences()).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {Set<number>} The groups' C=O carbons.
 */
function studentEsterCarbons(ctx) {
  const { reading, tree, spec, molecule, adj } = ctx;
  const suffix = (reading.suffixAtoms || []).filter((g) => g.bridge !== undefined);
  const prefixes = [...branchOccurrences({ tree, spec }, reading, molecule, adj).all, ...oBoundOccurrences(ctx)]
    .map((o) => esterPrefixCarbon(ctx, o)).filter((id) => id !== null);
  return new Set([...aldehydeCarbons(suffix, 'parentAtom'), ...prefixes]);
}

/**
 * Where the engine's principal groups are written together (the
 * DIAGNOSIS_PHRASES `groupsOn` key): on a chain parent, on the ring, or
 * bonded to the ring (a –COOH's or –COO–'s carbon outside it).
 *
 * @param {object} structure - The engine's name structure, with a suffix.
 * @returns {'chain'|'ring'|'outside'} The key.
 */
function groupsOnOf(structure) {
  if (structure.parentKind !== 'ring') {
    return 'chain';
  }
  return structure.suffix.outside ? 'outside' : 'ring';
}

/**
 * ESTER_GROUP (R-6a3a, file header «Esters»), ACID_GROUP's twin: a –COO– of
 * the engine's suffix written by the student as two groups on one carbon —
 * its C=O and its bridge oxygen with the group bonded to it apart, each named
 * as another group (`1-metoxipropanal`, `1-metoxi-1-oxopropano` →
 * `propanoato de metilo`; `3-metoxi-3-oxopropan-1-ol` → `3-hidroxipropanoato
 * de metilo`; `4-metoxi-4-oxobutanoato de metilo` → `butanodioato de
 * dimetilo`): no ester suffix group and no ester prefix of the student's has
 * that carbon (studentEsterCarbons()). Only the engine's suffix groups are
 * inspected: beside an acid the engine itself writes an ester whose C=O
 * carbon is a chain carbon as `oxo` and an `-oxi` prefix, and an ester
 * prefix written as another kind of branch is a branch's own name
 * (ESTER_PREFIX_NAME, esterPrefixName()). The message says the three atoms are one group and
 * how the engine writes the –COO– groups; the focus is those groups (the
 * carbon, both oxygens and their bonds); the tiles, those of the student's
 * parent-level prefix that holds one of their oxygens, else the suffix's.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function esterSplit(ctx) {
  const { naming, reading, spec } = ctx;
  const { suffix } = naming.structure;
  const mine = studentEsterCarbons(ctx);
  const split = suffix.locants.filter((site) => !mine.has(site.carbon === undefined ? site.atom : site.carbon));
  if (split.length === 0) {
    return null;
  }
  const oxygens = split.flatMap((site) => [site.attachAtom, site.esterOxygen]);
  const holder = reading.prefixAtoms.find((o) => o.atoms.some((id) => oxygens.includes(id)));
  let tiles = spec.suffix ? [spec.suffix.tiles[0], spec.suffix.tiles[1]] : spec.parent.tiles;
  if (holder && holder.tiles) {
    tiles = holder.tiles;
  }
  return {
    code: 'ESTER_GROUP',
    data: { count: suffix.locants.length, ...principalEnding(naming), on: groupsOnOf(naming.structure), name: naming.name },
    focus: {
      atoms: split.flatMap((site) => [site.carbon === undefined ? site.atom : site.carbon, site.attachAtom, site.esterOxygen]),
      bonds: split.flatMap((site) => [site.bond, site.esterBond]),
    },
    tiles,
  };
} // End of function esterSplit()

/**
 * ESTER_CARBON (R-6a3a, file header «Esters»): the –COO–'s carbon on the
 * other side of the parent (groupCarbon()), ACID_CARBON's twin —
 * `carboxilato` after a chain (`propano-1-carboxilato de metilo` →
 * `butanoato de metilo`), or the –COO–'s carbon taken as the student's chain
 * beside a ring (`ciclohexilmetanoato de metilo` → `ciclohexanocarboxilato
 * de metilo`, `fenilmetanoato de metilo` and the template `fenilformiato de
 * metilo` → `benzoato de metilo`).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function esterCarbon(ctx) {
  return groupCarbon(ctx, ESTER, 'ESTER_CARBON');
}

/**
 * CARBONYL_PREFIX for an ester (R-6a3a, file header «Esters»): a –COO– the
 * engine cites in the suffix written by the student as an ester prefix —
 * an alkoxycarbonyl prefix of the parent (`(metoxicarbonil)benceno` →
 * `benzoato de metilo`, `1-(metoxicarbonil)propano` → `butanoato de metilo`,
 * `3-(metoxicarbonil)propanoato de metilo` → `butanodioato de dimetilo`: its
 * carbon joins the parent chain, `joins`; one inside a compound branch is the
 * parent choice, as a `carboxi` is, CARBONYL_PARENT or MORE_CARBONYL_GROUPS),
 * or an acyloxy prefix at any depth (`(acetiloxi)metano` → `etanoato de
 * metilo`, `(benzoiloxi)benceno` → `benzoato de fenilo`, `[2-(acetiloxi)etil]benceno`
 * → `etanoato de 2-feniletilo`: its acyl group is the acid part, and the
 * student's chain or ring goes into the group bonded to the other oxygen,
 * `oBound` — never «una rama», which the parent-choice messages would say) —
 * while the student's ester suffix cites fewer –COO– groups than the engine's
 * (or there is none). The focus is those prefixes; the tiles, the first
 * one's.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function esterPrefix(ctx) {
  const { naming, reading, spec, tree, molecule, adj } = ctx;
  const { suffix, parentKind } = naming.structure;
  if ((spec.suffix && spec.suffix.kind === ESTER ? spec.suffix.slots.length : 0) >= suffix.locants.length) {
    return null; // The student's suffix cites every –COO– group.
  }
  const carbons = new Set(aldehydeCarbons(suffix.locants, 'atom'));
  const written = branchOccurrences({ tree, spec }, reading, molecule, adj).all.filter((o) => {
    const kind = esterPrefixOf(o.sub);
    return (kind === 'acyloxy' || (kind === 'alkoxycarbonyl' && tree.items.includes(o.node))) && carbons.has(esterPrefixCarbon(ctx, o));
  });
  if (written.length === 0) {
    return null;
  }
  const [first] = written;
  const acyloxy = esterPrefixOf(first.sub) === 'acyloxy';
  const index = tree.items.indexOf(first.node);
  const placed = index >= 0 ? reading.prefixAtoms.find((o) => o.prefix === index) : null;
  const ids = written.map((o) => branchIds(ctx, o));
  const studentAtoms = reading.studentParent.atoms;
  return {
    code: 'CARBONYL_PREFIX',
    data: {
      group: ESTER,
      count: suffix.locants.length,
      ...principalEnding(naming),
      prefix: wordsOf(tree, first.node),
      acyl: false,
      joins: !acyloxy && !suffix.outside,
      ringBranch: !acyloxy && isRing(spec.parent.kind) && parentKind !== 'ring',
      oBound: acyloxy && esterParts(naming.structure).some((part) => studentAtoms.every((id) => part.alkyl.atoms.includes(id))),
      studentRing: isRing(spec.parent.kind),
      on: groupsOnOf(naming.structure),
      name: naming.name,
    },
    focus: { atoms: ids.flatMap((i) => i.atoms), bonds: ids.flatMap((i) => i.bonds) },
    tiles: placed && placed.tiles ? placed.tiles : [first.node.range[0], first.node.range[1]],
  };
} // End of function esterPrefix()

/**
 * The ester's own checks (R-6a1, R-6a3a; file header «Esters»), when the
 * engine's principal group is an ester's –COO–, first with the acid's (the
 * two never meet: an acid's –COOH is the principal group beside an ester),
 * in the acid's order: ESTER_GROUP (a –COO– written as two groups on one
 * carbon), CARBONYL_SENIORITY (a junior group as the suffix, `ácido > éster >
 * aldehído > cetona > alcohol`), KETONE_NOT_ALDEHYDE (an `al` a branch makes a
 * ketone's), ESTER_CARBON (the –COO–'s carbon on the other side of the
 * parent), CARBONYL_PREFIX (a principal –COO– written as an ester prefix,
 * esterPrefix()). After them the student's suffix is an ester's: with fewer
 * or other –COO– groups than the engine's it goes on to the parent choice
 * and the rules (CARBONYL_PARENT; P0, MORE_CARBONYL_GROUPS; N0), and the
 * rules that hold for an ester name run on its acid part. A student's ester
 * suffix beside an acid's –COOH is a junior group, acidChecks()'
 * CARBONYL_SENIORITY. The O-bound side's checks follow (oBoundChecks(),
 * R-6a3b), when the student's side is none the engine writes
 * (esterSideDiffers(), once for every reading).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null (no ester check applies, or the engine's principal group is no ester's).
 */
function esterChecks(ctx) {
  if (!esterPrincipal(ctx)) {
    return null;
  }
  return esterSplit(ctx) || carbonylSeniority(ctx) || ketoneNotAldehyde(ctx) || esterCarbon(ctx) || esterPrefix(ctx);
} // End of function esterChecks()

/**
 * The words after ` de ` of an ester's name (R-6a1, its O-bound side), in
 * NFC as the engine's names and the assembler's texts are compared, or null
 * for a name without them.
 *
 * @param {string} text - A name.
 * @returns {string|null} The O-bound side.
 */
function esterSideOf(text) {
  const normal = text.normalize('NFC');
  const at = normal.indexOf(ESTER_LINK);
  return at < 0 ? null : normal.slice(at + ESTER_LINK.length);
}

/**
 * Every name of a naming, in NFC: its name, then each alternative's.
 *
 * @param {object} naming - A successful naming.
 * @returns {string[]} The names.
 */
function namesOf(naming) {
  return [naming.name, ...(naming.alternatives || []).map((alt) => alt.name)].map((text) => text.normalize('NFC'));
}

/**
 * The engine's traditional names of a molecule given a retained ester word
 * as the student wrote it (R-6a2a: `formiato`, `acetato`, `fenilacetato`, on
 * its own or with the prefixes the engine writes on it, tiles.js
 * templateAdmits()): the naming's alternatives of style 'traditional', in
 * NFC, whose O-bound side is the default style's (naming/index.js
 * carbonylAlternative() renders it from the main naming); none for any other
 * name.
 *
 * @param {object} spec - The student's NameSpec.
 * @param {object} naming - The verdict's successful naming.
 * @returns {string[]} The names.
 */
function retainedEsterNames(spec, naming) {
  const { template } = spec.parent;
  const asWritten = template && isEsterTemplate(template.value)
    && (spec.prefixes.length === 0 || templateAdmits(template.value, spec.prefixes));
  return asWritten ? (naming.alternatives || []).filter((alt) => alt.style === 'traditional').map((alt) => alt.name.normalize('NFC'))
    : [];
}

/**
 * Tells whether the student's O-bound side of an ester (R-6a1, the words
 * after ` de `) is none the engine writes for the molecule, in any style it
 * offers (its name and every alternative): the O-bound checks then name the
 * mistake (oBoundChecks(), R-6a3b), right after the principal –COO– group's
 * own checks (esterChecks()) and before the parent choice, whatever the acid
 * part says (`4-metilbutanoato de propan-1-ilo` → NEEDLESS_LOCANTS on
 * `propilo`). Beside a retained ester word whose molecule the engine gives a
 * traditional name (retainedEsterNames()), the O-bound side must be the one
 * of that name, which the engine writes in the default style only
 * (`acetato de isopropilo`; `acetato de propan-2-ilo` mixes the traditional
 * word with the IUPAC-preferred group: ESTER_TRADITIONAL); a retained word
 * with prefixes the engine never writes on it (`2-cloroacetato de metilo`,
 * and `metilformiato de propan-2-ilo` even though its molecule has the
 * traditional name `acetato de isopropilo`) compares with every style, and
 * SUBSTITUTED_TEMPLATE speaks. A student's ester suffix that cites another
 * number of –COO– groups than the engine's has another number of O-bound
 * groups too, so its side is not compared: the number is the mistake, which
 * esterChecks() names (R-6a3a: `4-metoxi-4-oxobutanoato de metilo` →
 * ESTER_GROUP, «butanodioato de dimetilo»).
 *
 * @param {{tree: object, spec: object}} name - The student's parse() tree and NameSpec.
 * @param {object} naming - The verdict's successful naming.
 * @returns {boolean} True when the O-bound side is not the engine's.
 */
function esterSideDiffers(name, naming) {
  const { suffix } = naming.structure;
  const mine = name.spec.suffix;
  if (!name.tree.ester || !suffix || suffix.kind !== ESTER || !mine || mine.kind !== ESTER
    || mine.slots.length !== suffix.locants.length) {
    return false;
  }
  const traditional = retainedEsterNames(name.spec, naming);
  const names = traditional.length > 0 ? traditional : namesOf(naming);
  return !names.map(esterSideOf).includes(esterSideOf(assemble(name.tree).text));
} // End of function esterSideDiffers()

/**
 * One O-bound group of the student's ester, read on the molecule of one
 * reading (R-6a3b, oBoundGroups()).
 *
 * @typedef {object} OBoundGroup
 * @property {{items: object[], end: object}} node - Its tiles: its bare prefixes and the prefix node ending in `ilo`
 *   (assemble.js esterGroupsOf()).
 * @property {object} spec - Its EsterGroupSpec (interpret.js: `multiplier`, `substituent`, `tiles`).
 * @property {object[]} occurrences - Its occurrences on the molecule (the reading's `esterAtoms` of the group).
 * @property {BranchOccurrence|null} occurrence - The first one as a branch hanging from its bridge oxygen (null: not found).
 * @property {string} words - The student's words for it, without the multiplier (`propan-1-ilo`, `2-cloroetilo`).
 * @property {string[]} engine - The engine's words for its atoms, one per style offered (ReadingContext `styles`).
 * @property {string} right - The engine's words in the diagnosis's style (`style`).
 * @property {boolean} ok - The student's words are the engine's in one of the styles offered.
 * @property {string} identity - Its structure (graph.js rootedBranchKey() from the bridge oxygen), to tell equal groups.
 */

/**
 * The text of some O-bound groups as the assembler writes them (assemble.js
 * esterPieces(): in the given order, joined by the automatic ` y `, each
 * multiplier kept): the words after ` de ` of the student's name with those
 * groups for its O-bound side.
 *
 * @param {object} tree - The parse() tree (the student's, or one with tiles changed).
 * @param {{items: object[], end: object}[]} groups - O-bound groups (assemble.js esterGroupsOf(), maybe changed).
 * @returns {string} The words.
 */
function oBoundText(tree, groups) {
  const items = groups.flatMap((group) => [...group.items, group.end]);
  return esterSideOf(assemble({ ...tree, ester: { ...tree.ester, items } }).text) || '';
}

/**
 * The engine's words for one O-bound group in a naming (R-6a3b): the text of
 * the `prefix` part after the ester link whose atoms hold the group's carbon
 * bonded to the oxygen (render.js esterAlkylParts(): `metilo`,
 * `2-cloroetilo`; for identical groups written once, the multiplied part
 * without its enclosing marks or rule 5's hyphen: `(2-cloroetilo)`,
 * `-tert-butilo`), in NFC; null when no part holds it.
 *
 * @param {object[]} parts - The naming's parts.
 * @param {number} attachment - The group's carbon bonded to the bridge oxygen.
 * @returns {string|null} The words.
 */
function oBoundWordOf(parts, attachment) {
  const link = parts.findIndex((p) => p.kind === 'punct' && p.text === ESTER_LINK);
  const part = link < 0 ? null : parts.slice(link + 1).find((p) => p.kind === 'prefix' && (p.atoms || []).includes(attachment));
  return part ? unwrap(part.text.replace(/^-/, '')).normalize('NFC') : null;
}

/**
 * The student's O-bound groups (R-6a3b), in the student's order, each with
 * its occurrences on the molecule of the reading (`esterAtoms`, build.js
 * attachEsterGroups()), its words and the engine's words for the same atoms
 * in every style offered (oBoundWordOf() on the naming of each style, whose
 * O-bound groups the engine names from the bridge oxygen: substituent.js
 * esterAlkyl()).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {OBoundGroup[]} The groups.
 */
function oBoundGroups(ctx) {
  const { tree, spec, reading, molecule, adj, styles } = ctx;
  const parts = styles.map((style) => namingInStyle(ctx, style).parts || []);
  return esterGroupsOf(tree.tiles, tree.ester.items).groups.map((node, index) => {
    const group = spec.ester.groups[index];
    const occurrences = (reading.esterAtoms || []).filter((o) => o.group === index);
    const [first] = occurrences;
    const occurrence = first && group
      ? { sub: group.substituent, attachment: first.attachment, parentAtom: first.bridge, order: 1, atoms: first.atoms, node: node.end }
      : null;
    const words = oBoundText(tree, [{ items: node.items, end: { ...node.end, multiplier: null } }]);
    const engine = occurrence ? parts.map((list) => oBoundWordOf(list, first.attachment)) : [];
    return {
      node,
      spec: group,
      occurrences,
      occurrence,
      words,
      engine,
      right: engine[Math.max(0, styles.indexOf(ctx.style))] || words,
      ok: engine.includes(words),
      identity: occurrence ? rootedBranchKey(molecule, first.attachment, first.bridge, adj) : `words:${words}`,
    };
  }); // End of the map over the O-bound groups
} // End of function oBoundGroups()

/**
 * The atoms and bonds of some O-bound groups (`focus`): every occurrence's
 * atoms, the bonds between them and the bond to its bridge oxygen.
 *
 * @param {OBoundGroup[]} groups - The groups.
 * @returns {{atoms: number[], bonds: number[]}} The ids.
 */
function oBoundIds(groups) {
  const occurrences = groups.flatMap((group) => group.occurrences);
  return { atoms: occurrences.flatMap((o) => o.atoms), bonds: occurrences.flatMap((o) => [o.bond, ...o.bonds]) };
}

/**
 * The tile range of some O-bound groups, the first one's start to the last
 * one's end (EsterGroupSpec `tiles`, bare prefixes included).
 *
 * @param {OBoundGroup[]} groups - The groups, in tile order.
 * @returns {[number, number]} The range.
 */
function oBoundTiles(groups) {
  return [groups[0].spec.tiles[0], groups[groups.length - 1].spec.tiles[1]];
}

/**
 * The explanation step that names the O-bound groups (R-6a3b): «Separa las
 * dos partes del éster» (`ester`), or for two –COO– groups «Separa las partes
 * del diéster» (`diester`; explain.js esterStep(), diesterStep()), which
 * name each group like a branch, as a word of its own ending in `-ilo`, and
 * say how two of them are written.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {string} The step id.
 */
function oBoundStep(ctx) {
  return esterParts(ctx.naming.structure).length > 1 ? 'diester' : 'ester';
}

/**
 * The engine's name of the molecule in one of the styles offered (the
 * O-bound side, R-6a3b: the groups' words, UNGROUPED and MULTIPLIER_KIND):
 * the verdict's naming for the default style, else the alternative of that
 * style — its name and its parts.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {string} style - A style of `styles`.
 * @returns {{name: string, parts?: object[]}} The naming or alternative.
 */
function namingInStyle(ctx, style) {
  const { verdictNaming } = ctx;
  const alt = style === PREFIX_STYLES[0] ? null : (verdictNaming.alternatives || []).find((a) => a.style === style);
  return alt || verdictNaming;
}

/**
 * The style in which the engine writes an O-bound group as the student did
 * (the first style offered whose words for its atoms are the student's), else
 * the diagnosis's style.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {OBoundGroup} group - The group.
 * @returns {string} The style.
 */
function groupStyle(ctx, group) {
  const at = group.engine.indexOf(group.words);
  return at >= 0 ? ctx.styles[at] : ctx.style;
}

/**
 * The style in which the engine writes every O-bound group as the student did
 * (the first style offered whose words for each group are the student's;
 * review of phase I-52a3b), else the diagnosis's style.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {OBoundGroup[]} groups - The groups.
 * @returns {string} The style.
 */
function sideStyle(ctx, groups) {
  const at = ctx.styles.findIndex((_, k) => groups.every((group) => group.engine[k] === group.words));
  return at >= 0 ? ctx.styles[at] : ctx.style;
}

/**
 * ESTER_TRADITIONAL (R-6a3b): a retained ester word whose molecule the
 * engine gives a traditional name (retainedEsterNames()), with an O-bound
 * side the engine writes in another of its names, not in the traditional one
 * (`acetato de propan-2-ilo`, `acetato de 1-metiletilo`, `formiato de
 * propan-2-ilo`): the engine renders the traditional name from its main
 * naming, so the traditional word goes with the default style's group
 * (`acetato de isopropilo`), and the student's group with the systematic acid
 * part (`etanoato de propan-2-ilo`). The message quotes both names; its step
 * «Monta el nombre» lists them among the other valid forms. The tiles: the
 * O-bound side.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {OBoundGroup[]} groups - The O-bound groups.
 * @returns {object|null} The draft, or null.
 */
function esterTraditional(ctx, groups) {
  const { spec, tree, verdictNaming } = ctx;
  const traditional = retainedEsterNames(spec, verdictNaming);
  const mine = esterSideOf(assemble(tree).text);
  const systematic = namesOf(verdictNaming).filter((text) => !traditional.includes(text)).find((text) => esterSideOf(text) === mine);
  if (traditional.length === 0 || !systematic) {
    return null;
  }
  return {
    code: 'ESTER_TRADITIONAL',
    data: { template: spec.parent.template.word.text, student: mine, side: esterSideOf(traditional[0]), traditional: traditional[0],
      systematic },
    focus: oBoundIds(groups),
    tiles: [spec.ester.tiles[0], spec.ester.tiles[1]],
    step: 'assemble',
  };
} // End of function esterTraditional()

/**
 * What the engine's choice of an O-bound group's chain compares
 * (substituent.js buildSubstituent(): the longest chain through the carbon
 * bonded to the oxygen — from it, in the `substituted` style —, the most
 * multiple bonds, the most double bonds, then the numbering, the free
 * valence first: the lowest locant for the carbon bonded to the oxygen, then
 * for the multiple bonds and for the prefixes), for a chain read on the
 * molecule in a locant order (R-6a3b; acylChainCriteria()'s twin). Its
 * prefixes are every atom bonded to the chain outside it but the bridge
 * oxygen.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {number[]} chain - The chain's atoms, in locant order.
 * @param {number} carrier - The bridge oxygen.
 * @param {number} attachment - The carbon bonded to it.
 * @returns {number[][]} The criteria: [length], [multiple bonds], [double bonds], [free valence], bond locants, prefix locants.
 */
function alkylChainCriteria(ctx, chain, carrier, attachment) {
  const { adj } = ctx;
  const inside = new Set(chain);
  const bonds = [];
  let double = 0;
  for (let i = 0; i + 1 < chain.length; i += 1) {
    const link = adj.get(chain[i]).find((n) => n.atom === chain[i + 1]);
    if (link && link.order > 1) {
      bonds.push(i + 1);
      double += link.order === 2 ? 1 : 0;
    }
  }
  const prefixes = chain.flatMap((id, i) => adj.get(id).filter((n) => !inside.has(n.atom) && n.atom !== carrier).map(() => i + 1));
  return [[chain.length], [bonds.length], [double], [chain.indexOf(attachment) + 1], bonds, prefixes.sort((p, q) => p - q)];
} // End of function alkylChainCriteria()

/**
 * Why the engine's chain of an O-bound group wins, by the criterion of
 * alkylChainCriteria() that decides (ESTER_ALKYL_CHAIN `reason`): the
 * length, the multiple bonds, the double bonds among as many multiple bonds
 * (review of phase I-52a3b: `3-etenilhex-1-in-3-ilo`), the free valence,
 * then, with the carbon bonded to the oxygen numbered alike, the multiple
 * bonds' or the prefixes' locants (DIAGNOSIS_PHRASES.branchRingReasons keys).
 */
const ALKYL_CHAIN_REASONS = Object.freeze(['longer', 'bonds', 'doubles', 'valence', 'bondsOnly', 'lower']);

/**
 * ESTER_ALKYL_CHAIN (R-6a3b): an O-bound group written on a chain that is
 * not the engine's, or numbered otherwise — the chain is the longest through
 * the carbon bonded to the oxygen (`acetato de 1,2-dimetilpropilo` →
 * `3-metilbutan-2-ilo`: 4 carbons, not 3), and is numbered so that this
 * carbon gets the lowest locant (`etanoato de butan-3-ilo` → `butan-2-ilo`),
 * as the explanation's ester step says it (explain.js describeSubstituent():
 * «se numera para que el carbono unido al oxígeno lleve el número más bajo
 * posible»). Compared on the molecule (alkylChainCriteria()): the student's
 * chain is the first atoms build() created for the group, in the student's
 * locant order; the first criterion that differs, in the engine's favour,
 * decides; a tie (the words decide, or the same chain and numbering) is no
 * chain mistake. Not for a ring or a retained word (`tert-butilo`): the
 * engine's group must be a plain chain.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {OBoundGroup} group - The group.
 * @returns {object|null} The data, or null.
 */
function esterAlkylChain(ctx, group) {
  const { occurrence } = group;
  const sub = group.spec.substituent;
  if (sub.kind !== 'chain') {
    return null;
  }
  const engine = engineBranch(ctx, occurrence);
  if (!engine || engine.ring || engine.retained || !engine.chain) {
    return null;
  }
  const mine = occurrence.atoms.slice(0, sub.length);
  const theirs = engine.chain.atoms;
  const [a, b] = [mine, theirs].map((chain) => alkylChainCriteria(ctx, chain, occurrence.parentAtom, occurrence.attachment));
  // Length and bond counts: more is better; locants: lower is better. The first criterion that differs decides.
  const orders = a.map((criterion, i) => (i < 3 ? compareLocantLists(a[i], b[i]) : compareLocantLists(b[i], a[i])));
  const at = orders.findIndex((order) => order !== 0);
  if (at < 0 || orders[at] > 0) {
    return null; // The engine's chain and numbering, a tie the words decide, or (never) the student's ahead.
  }
  const reason = ALKYL_CHAIN_REASONS[at];
  return {
    reason,
    length: theirs.length,
    studentLength: mine.length,
    starts: ctx.style === 'substituted',
    unwritten: at >= 3 && !/\d/.test(group.right),
    right: group.right,
    student: group.words,
  };
} // End of function esterAlkylChain()

/**
 * The branches written inside an O-bound group (R-6a3b), at every depth, in
 * tile order, each with its first occurrence on the molecule (build.js
 * ownPrefixAtoms() on the group's atoms, joined by their one bond, as
 * branchOccurrences() reads a compound branch's), named by the engine in
 * the group's own ester (oBoundMolecule(), the occurrence's `molecule`).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {OBoundGroup} group - The group (found on the molecule).
 * @returns {{node: object, occurrence: BranchOccurrence}[]} The branches.
 */
function oBoundInner(ctx, group) {
  const out = [];
  const molecule = oBoundMolecule(ctx, group.occurrence);
  /**
   * Records the own branches of a branch's occurrence, then theirs.
   *
   * @param {object[]} items - Its own prefix nodes (the k-th is the k-th of its SubstituentSpec's prefixes).
   * @param {object} sub - Its SubstituentSpec.
   * @param {number[]} atoms - Its atoms in creation order.
   * @returns {void}
   */
  const visit = (items, sub, atoms) => {
    ownPrefixAtoms(sub, atoms).forEach((slices, k) => {
      const join = slices.length > 0 ? joinOf(slices[0], ctx.adj) : null;
      if (join && items[k] && sub.prefixes[k]) {
        const node = items[k];
        const occurrence = { sub: sub.prefixes[k].substituent, ...join, atoms: slices[0], node, molecule };
        out.push({ node, occurrence });
        visit(node.substituent.type === 'branch' ? node.substituent.items : [], occurrence.sub, slices[0]);
      }
    });
  }; // End of function visit()
  const { end, items } = group.node;
  visit(end.substituent.type === 'branch' ? end.substituent.items : items, group.spec.substituent, group.occurrence.atoms);
  return out;
} // End of function oBoundInner()

/**
 * The O-bound groups' own names (R-6a3b), as the branch-name rules read a
 * branch's (branchNames()): the first group, in the student's order, whose
 * words are none the engine writes for its atoms, with a ring numbered
 * otherwise (BRANCH_RING_NUMBERING with `oBound`: `etanoato de
 * 6-metilfenilo` → `2-metilfenilo`, numbered from the carbon bonded to the
 * oxygen; branchRingNumbering() on the group seen from its bridge oxygen), a
 * chain that is not the engine's (ESTER_ALKYL_CHAIN), or a branch inside it
 * whose own name the branch-name checks name (BRANCH_NAME_CHECKS on
 * oBoundInner(): `etanoato de 2-(6-metilfenil)etilo` → BRANCH_RING_NUMBERING,
 * «2-(2-metilfenil)etilo»; the message quotes the group's words). The step:
 * the explanation's ester step (oBoundStep()); the tiles: the group's, or the
 * inner branch's.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {OBoundGroup[]} groups - The O-bound groups.
 * @returns {object|null} The draft, or null.
 */
function oBoundNames(ctx, groups) {
  for (const group of groups.filter((g) => !g.ok && g.occurrence)) {
    const { end, items } = group.node;
    const draft = { focus: oBoundIds([group]), tiles: group.spec.tiles, step: oBoundStep(ctx) };
    if (isRing(group.spec.substituent.kind)) {
      // The ring's own prefixes: a compound branch's items, or the bare prefixes written before the group's word.
      const own = { substituent: { type: 'branch', items: end.substituent.type === 'branch' ? end.substituent.items : items } };
      const data = branchRingNumbering(ctx, own, group.occurrence, { right: group.right, student: group.words });
      if (data) {
        return { code: 'BRANCH_RING_NUMBERING', data: { ...data, oBound: true }, ...draft };
      }
    }
    const chain = esterAlkylChain(ctx, group);
    if (chain) {
      return { code: 'ESTER_ALKYL_CHAIN', data: chain, ...draft };
    }
    for (const { node, occurrence } of oBoundInner(ctx, group)) {
      for (const [code, check] of BRANCH_NAME_CHECKS) {
        const data = check(ctx, node, occurrence, { right: group.right, student: group.words });
        if (data === BEYOND) {
          return BEYOND; // An ester prefix of the student's the engine names otherwise (never seen; esterPrefixName()).
        }
        if (data) {
          return { code, data, focus: branchIds(ctx, occurrence), tiles: [node.range[0], node.range[1]], step: draft.step };
        }
      }
    } // End of the loop over the branches inside the group
  } // End of the loop over the O-bound groups not the engine's
  return null;
} // End of function oBoundNames()

/**
 * The words of an O-bound group without its ending's last letter (the `o` of
 * `-ilo`), so that the alphabetical order compares the group's name as a
 * branch, as the engine does (render.js esterAlkylParts(): `metil` before
 * `metilbutil`, where `metilo` would follow `metilbutilo`).
 *
 * @param {string} words - An O-bound group's words.
 * @returns {string} The words compared.
 */
function asBranchWords(words) {
  return words.endsWith(ESTER_ALKYL_ENDING) ? words.slice(0, -ESTER_ALKYL_ENDING.length) : words;
}

/**
 * ALPHABETICAL_ORDER on the O-bound side (R-6a3b, `oBound`): two different
 * O-bound groups not in alphabetical order (`propanodioato de metilo y
 * etilo` → «etilo y metilo»; render.js esterAlkylParts() cites them by
 * their names as branches, `tert-` and multipliers left out), read in the
 * student's words as rule 5 reads prefixes (citationKeyOf(),
 * compareCitationKeys(), with its `tert-` and multiplier hints). The right
 * form: the student's side with the two groups swapped; the draft carries the
 * style the student wrote every group in, when there is one (sideStyle()),
 * whose explanation the step opens.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {OBoundGroup[]} groups - The O-bound groups.
 * @returns {object|null} The draft, or null.
 */
function oBoundOrder(ctx, groups) {
  const { tree } = ctx;
  const words = groups.map((group) => asBranchWords(group.words));
  const keys = words.map((w) => citationKeyOf(w));
  for (let i = 0; i < groups.length; i += 1) {
    for (let j = i + 1; j < groups.length; j += 1) {
      if (compareCitationKeys(keys[i], keys[j]) <= 0 || groups[i].identity === groups[j].identity) {
        continue;
      }
      /**
       * The multiplier text of a group ('' without one).
       *
       * @param {OBoundGroup} group - A group.
       * @returns {string} The text.
       */
      const lead = (group) => (group.node.end.multiplier === null ? '' : tree.tiles[group.node.end.multiplier].text);
      let hint = '';
      /**
       * Tells whether the student's order is right counting multipliers or `tert-` as letters (ALPHABETICAL_ORDER's hints).
       *
       * @param {(k: number) => object} options - citationKeyOf() options for group k.
       * @returns {boolean} True when group i still goes first.
       */
      const rightWith = (options) => compareCitationKeys(citationKeyOf(words[i], options(i)), citationKeyOf(words[j], options(j))) <= 0;
      if (rightWith((k) => ({ lead: lead(groups[k]) }))) {
        hint = DIAGNOSIS_PHRASES.hints.multipliers;
      } else if (rightWith(() => ({ withItalic: true }))) {
        hint = DIAGNOSIS_PHRASES.hints.italic;
      }
      const order = groups.map((_, k) => {
        if (k === i || k === j) {
          return k === i ? j : i;
        }
        return k;
      });
      return {
        code: 'ALPHABETICAL_ORDER',
        data: {
          oBound: true,
          first: groups[j].words,
          second: groups[i].words,
          why: orderReason(keys[j], keys[i]),
          hint,
          right: oBoundText(tree, order.map((k) => groups[k].node)),
          student: oBoundText(tree, groups.map((group) => group.node)),
        },
        focus: oBoundIds([groups[i], groups[j]]),
        tiles: [groups[i].spec.tiles[0], groups[j].spec.tiles[1]],
        step: oBoundStep(ctx),
        style: sideStyle(ctx, groups),
      };
    } // End of the loop over the later groups
  } // End of the loop over the O-bound groups
  return null;
} // End of function oBoundOrder()

/**
 * UNGROUPED on the O-bound side (R-6a3b, `oBound`): the same O-bound group
 * (one structure, in any words) written apart instead of once with a
 * multiplier (`butanodioato de metilo y metilo` → «dimetilo»). The right
 * form is the engine's O-bound side in the style the student wrote the group
 * in (groupStyle(): `di(propan-2-ilo)` for `propan-2-ilo y propan-2-ilo`),
 * whose multiplier says di or bis (`compound`: render.js esterAlkylParts(),
 * bis for a group with prefixes of its own). Only when every O-bound group is
 * the same. The draft carries that style (`style`; review of phase I-52a3b),
 * so «Ver el paso» opens the explanation that writes the side so
 * (`1-metiletilo y 1-metiletilo` → «bis(1-metiletilo)», the substituted
 * style's diester step, not the default's `diisopropilo`).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {OBoundGroup[]} groups - The O-bound groups.
 * @returns {object|null} The draft, or null.
 */
function oBoundUngrouped(ctx, groups) {
  if (groups.length < 2 || groups.some((group) => group.identity !== groups[0].identity)) {
    return null;
  }
  const style = groupStyle(ctx, groups[0]);
  const right = esterSideOf(namingInStyle(ctx, style).name) || '';
  const count = groups.reduce((sum, group) => sum + group.spec.multiplier.count, 0);
  return {
    code: 'UNGROUPED',
    data: {
      oBound: true,
      compound: right.startsWith(compoundMultiplier(count)),
      halogen: false,
      right,
      student: oBoundText(ctx.tree, groups.map((group) => group.node)),
    },
    focus: oBoundIds(groups),
    tiles: oBoundTiles(groups),
    step: oBoundStep(ctx),
    style,
  };
} // End of function oBoundUngrouped()

/**
 * MULTIPLIER_KIND on the O-bound side (R-6a3b, `oBound`): the multiplier of
 * an O-bound group written once for several –COO– groups is not of the kind
 * the engine writes (render.js esterAlkylParts(): bis for a group with
 * prefixes of its own, `bis(2-cloroetilo)`; di for any other, `dimetilo`,
 * `di(propan-2-ilo)`) — read on the engine's O-bound side in the style the
 * student wrote the group in (groupStyle()). Only for a group whose words the
 * engine writes in that style (review of phase I-52a3b: `bis(1,1-dimetiletilo)`
 * must not borrow the `di` of `di-tert-butilo`, other words — the group's own
 * mistake is named by the checks after, ESTER_ALKYL_NAME). The right form:
 * the student's group with the other multiplier tile; the draft carries that
 * style (`style`), whose explanation the step opens.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {OBoundGroup[]} groups - The O-bound groups.
 * @returns {object|null} The draft, or null.
 */
function oBoundMultiplier(ctx, groups) {
  const { tree } = ctx;
  if (groups.length !== 1 || groups[0].node.end.multiplier === null || !groups[0].ok) {
    return null;
  }
  const [group] = groups;
  const at = group.node.end.multiplier;
  const tile = tree.tiles[at];
  const style = groupStyle(ctx, group);
  const right = esterSideOf(namingInStyle(ctx, style).name) || '';
  const compound = right.startsWith(compoundMultiplier(tile.value));
  if ((tile.kind === 'cmult') === compound) {
    return null;
  }
  const swapped = withTiles(tree, new Map([[at, tileById(tileId(compound ? 'cmult' : 'mult', tile.value))]]));
  return {
    code: 'MULTIPLIER_KIND',
    data: { oBound: true, compound, right: oBoundText(swapped, [group.node]), student: oBoundText(tree, [group.node]) },
    focus: oBoundIds(groups),
    tiles: [at, at + 1],
    step: oBoundStep(ctx),
    style,
  };
} // End of function oBoundMultiplier()

/**
 * The first chain of an O-bound group written with needless locants
 * (R-6a3b; shortForm(), as rule 9 reads a branch's chains): the group's own
 * chain (`propan-1-ilo` → `propilo`, `metan-1-ilo` → `metilo`,
 * `ciclohexan-1-ilo` → `ciclohexilo`), the locants of the prefixes of a
 * one-carbon group (`1-clorometilo` → `clorometilo`), or a chain of one of its
 * own prefixes; with the group as it reads fixed.
 *
 * @param {object} tree - The parse() tree.
 * @param {{items: object[], end: object}} node - The group's tiles.
 * @returns {{group: {items: object[], end: object}, positions: number[]}|null} The fixed group and the needless locants' tiles.
 */
function oBoundShortForm(tree, node) {
  const { items, end } = node;
  const branch = end.substituent.type === 'branch' ? end.substituent : null;
  const own = branch ? branch.items : items;
  const chains = [];
  /**
   * Collects the chains of a substituent node, each with the compound branch whose own chain it is.
   *
   * @param {object} sub - A substituent node.
   * @param {object|null} owner - Its compound branch, or null.
   * @returns {void}
   */
  const visit = (sub, owner) => {
    if (sub.type === 'chain') {
      chains.push({ chain: sub, owner });
    } else if (sub.type === 'branch') {
      sub.items.forEach((item) => visit(item.substituent, null));
      if (sub.chain) {
        visit(sub.chain, sub);
      }
    }
  };
  own.forEach((item) => visit(item.substituent, null));
  const groupChain = branch ? branch.chain : end.substituent;
  if (groupChain && groupChain.type === 'chain') {
    // The group's own chain: its prefixes are the compound branch's, or the bare prefixes written before its word.
    chains.push({ chain: groupChain, owner: branch || { type: 'bare', items: own } });
  }
  /**
   * Prefix nodes without their locants.
   *
   * @param {object[]} list - Prefix nodes.
   * @returns {object[]} The copies.
   */
  const unlocated = (list) => list.map((item) => ({ ...item, locants: [] }));
  for (const { chain, owner } of chains) {
    const bare = shortForm(tree, chain, owner);
    // The prefixes of a one-carbon group have one position only (`1-clorometilo`), as in a compound branch.
    const oneCarbon = owner && chain.ring === null && tree.tiles[chain.root].value === 1;
    const located = oneCarbon ? owner.items.flatMap((item) => item.locants) : [];
    if (!bare && located.length === 0) {
      continue;
    }
    let fixedItems = items;
    let fixedEnd = end;
    if (located.length > 0 && owner.type === 'bare') {
      fixedItems = unlocated(items);
    } else if (located.length > 0) {
      const copy = { ...owner, items: unlocated(owner.items) };
      fixedItems = items.map((item) => replaceNode(item, owner, copy));
      fixedEnd = replaceNode(end, owner, copy);
    }
    if (bare) {
      fixedItems = fixedItems.map((item) => replaceNode(item, chain, bare));
      fixedEnd = replaceNode(fixedEnd, chain, bare);
    }
    const ownPositions = bare ? [...chain.segments.flatMap((segment) => segment.locants), ...chain.fvLocants] : [];
    return { group: { items: fixedItems, end: fixedEnd }, positions: [...located, ...ownPositions] };
  } // End of the loop over the group's chains
  return null;
} // End of function oBoundShortForm()

/**
 * NEEDLESS_LOCANTS on the O-bound side (R-6a3b, `oBound`): an O-bound group
 * none the engine writes, with locants the engine leaves out
 * (oBoundShortForm(): `etanoato de propan-1-ilo` → «propilo»). The right
 * form: the student's group fixed (without its multiplier).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {OBoundGroup[]} groups - The O-bound groups.
 * @returns {object|null} The draft, or null.
 */
function oBoundLocants(ctx, groups) {
  for (const group of groups.filter((g) => !g.ok)) {
    const fixed = oBoundShortForm(ctx.tree, group.node);
    if (fixed && fixed.positions.length > 0) {
      const right = oBoundText(ctx.tree, [{ items: fixed.group.items, end: { ...fixed.group.end, multiplier: null } }]);
      return {
        code: 'NEEDLESS_LOCANTS',
        data: { oBound: true, branch: true, right, student: group.words },
        focus: oBoundIds([group]),
        tiles: rangeOf(fixed.positions),
        step: oBoundStep(ctx),
      };
    }
  } // End of the loop over the O-bound groups not the engine's
  return null;
} // End of function oBoundLocants()

/**
 * ESTER_ALKYL_NAME (R-6a3b): an O-bound group whose words are none the
 * engine writes for its atoms, for no reason the checks before name — a style
 * the engine does not offer for it (`etanoato de 1,1-dimetiletilo`, the
 * engine's `tert-butilo`), the order or grouping of its own prefixes
 * (`4-metil-2-clorofenilo`) —: the engine's words in the diagnosis's style,
 * as the explanation's ester step names the group.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {OBoundGroup[]} groups - The O-bound groups.
 * @returns {object|null} The draft, or null.
 */
function oBoundWords(ctx, groups) {
  const group = groups.find((g) => !g.ok && g.occurrence);
  if (!group) {
    return null;
  }
  return {
    code: 'ESTER_ALKYL_NAME',
    data: { right: group.right, student: group.words },
    focus: oBoundIds([group]),
    tiles: group.spec.tiles,
    step: oBoundStep(ctx),
  };
} // End of function oBoundWords()

/**
 * The O-bound side's checks (R-6a3b, file header «Esters»), when the
 * student's O-bound side is none the engine writes (esterSideDiffers(),
 * ReadingContext `sideDiffers`), right after the principal –COO– group's own
 * checks (esterChecks()) and before the parent choice, as the explanation
 * separates the two parts of the ester before it looks for the chain (its
 * ester step comes right after «Reconoce el grupo funcional»), in this order:
 * ESTER_TRADITIONAL (a retained word with the group in another style), the
 * groups' own names (oBoundNames(): BRANCH_RING_NUMBERING, ESTER_ALKYL_CHAIN),
 * the side's form as rules 5–7 read prefixes (ALPHABETICAL_ORDER, UNGROUPED,
 * MULTIPLIER_KIND, each with `oBound`), a group's needless locants
 * (NEEDLESS_LOCANTS with `oBound`), then any other group none the engine
 * writes (ESTER_ALKYL_NAME). BEYOND when none names the difference: a side
 * mixing styles, each group the engine's in one of them (never in the sweeps).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, BEYOND, or null (the O-bound side is the engine's).
 */
function oBoundChecks(ctx) {
  if (!ctx.sideDiffers) {
    return null;
  }
  const groups = oBoundGroups(ctx);
  const draft = esterTraditional(ctx, groups) || oBoundNames(ctx, groups) || oBoundOrder(ctx, groups) || oBoundUngrouped(ctx, groups)
    || oBoundMultiplier(ctx, groups) || oBoundLocants(ctx, groups) || oBoundWords(ctx, groups);
  return draft || BEYOND;
} // End of function oBoundChecks()

/**
 * NITRILE_CARBON (R-6b3, file header «Nitriles»): the –C≡N's carbon on the
 * other side of the parent (groupCarbon()), ESTER_CARBON's twin —
 * `carbonitrilo` after a chain (`propano-1-carbonitrilo` → `butanonitrilo`),
 * or the –C≡N's carbon taken as the student's chain beside a ring
 * (`ciclohexilmetanonitrilo` → `ciclohexanocarbonitrilo`,
 * `fenilmetanonitrilo` → `benzonitrilo`).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function nitrileCarbon(ctx) {
  return groupCarbon(ctx, NITRILE, 'NITRILE_CARBON');
}

/**
 * The nitrile's own checks (R-6b1, R-6b3; file header «Nitriles»), when the
 * engine's principal group is a nitrile's –C≡N (they never meet the ester's
 * or the acid's: either of those is the principal group beside a –C≡N), in
 * the acid's order: CARBONYL_SENIORITY (a junior group as the suffix,
 * `ácido > éster > amida > nitrilo > aldehído > cetona > alcohol > amina`:
 * `4-cianobutan-2-ona` → `4-oxopentanonitrilo`), KETONE_NOT_ALDEHYDE (an
 * `al` a branch or a `ciano` makes a ketone's: `1-cianobutanal` →
 * `2-oxopentanonitrilo`), NITRILE_CARBON (the –C≡N's carbon on the other
 * side of the parent), CARBONYL_PREFIX (a principal –C≡N written `ciano`:
 * `cianometano`, `4-cianobutanonitrilo`). No check splits a –C≡N in two: no
 * tile writes its nitrogen apart. After them the student's suffix is a
 * nitrile's, or there is none: with fewer or other –C≡N groups than the
 * engine's it goes on to the parent choice and the rules (CARBONYL_PARENT;
 * P0, MORE_CARBONYL_GROUPS; N0, RING_NUMBERING; the suffix's needless
 * locants), all in the –C≡N's words. A student's nitrile suffix beside an
 * acid's –COOH or an ester's –COO– is a junior group, their checks'
 * CARBONYL_SENIORITY (`3-carboxipropanonitrilo` → `ácido
 * 3-cianopropanoico`, the `ciano` taking the –C≡N's carbon out of the
 * chain); beside any other principal group it is a null (BEYOND; never
 * seen: a student's nitrile suffix builds a –C≡N, senior to every group the
 * tiles write but an acid's and an ester's).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, BEYOND, or null (no nitrile check applies, or the engine's principal group is no
 *   nitrile's).
 */
function nitrileChecks(ctx) {
  if (!nitrilePrincipal(ctx)) {
    const engine = ctx.naming.structure.suffix;
    const mine = ctx.spec.suffix;
    const junior = !engine || seniorityRank(engine.kind) > seniorityRank(NITRILE); // Beside an acid or an ester: their checks.
    return mine && mine.kind === NITRILE && junior ? BEYOND : null;
  }
  return carbonylSeniority(ctx) || ketoneNotAldehyde(ctx) || nitrileCarbon(ctx) || carbonylPrefix(ctx);
} // End of function nitrileChecks()

/**
 * The amine's own checks (R-6c1, file header «Amines»), first of all: a
 * student's `amina` while the engine's principal group is another, or the
 * engine's an amine while the student's suffix is not (`seniority`);
 * another number of amine groups (`count`); the student's parent on the
 * other side of the nitrogen — its carbon bonded to the amine's nitrogen is
 * not the engine's parent's (`side`). Each is an AMINE_NULLS draft, a
 * deliberate null worded in phase I-52c4; null when neither name is an
 * amine's, or when the other rules may speak (with their own AMINE_NULLS
 * guards for the parent choice, P0, N0 and the suffix's locants).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} An AMINE_NULLS draft, or null.
 */
function amineChecks(ctx) {
  const engine = ctx.naming.structure.suffix;
  const mine = ctx.spec.suffix;
  const student = Boolean(mine) && mine.kind === AMINE;
  if (!aminePrincipal(ctx)) {
    return student ? AMINE_NULLS.seniority : null;
  }
  if (!student) {
    return AMINE_NULLS.seniority;
  }
  if (mine.slots.length !== engine.locants.length) {
    return AMINE_NULLS.count;
  }
  const own = ctx.reading.suffixAtoms || [];
  const sides = engine.locants.map((site) => own.find((group) => group.attachment === site.attachAtom));
  if (sides.some((group, i) => !group || group.parentAtom !== engine.locants[i].atom)) {
    return AMINE_NULLS.side; // The parent on the other side of the nitrogen.
  }
  return null;
} // End of function amineChecks()

/**
 * The acid's own checks (R-5d3, file header «Acids»), when the engine's
 * principal group is a –COOH, in order: ACID_GROUP (a –COOH written as two
 * groups on one carbon), CARBONYL_SENIORITY (a junior group as the suffix),
 * KETONE_NOT_ALDEHYDE (an `al` on a carbon a branch bonds to a second
 * carbon, which CARBONYL_SENIORITY leaves to it: `1-carboxi-2,3-dietilbutanal`
 * → `ácido 3-etil-4-metil-2-oxohexanoico`), ACID_CARBON (the –COOH's carbon
 * on the other side of the parent), CARBONYL_PREFIX (a principal –COOH
 * written `carboxi`). Any other suffix is
 * junior to the –COOH, so after them the student's suffix is an acid's: with
 * fewer or other –COOH groups than the engine's it goes on to the parent
 * choice and the rules (CARBONYL_PARENT; P0, MORE_CARBONYL_GROUPS). A
 * student's ester suffix beside the –COOH is a junior group too
 * (CARBONYL_SENIORITY, R-6a3a: `4-carboxibutanoato de metilo`). A student's
 * acid suffix while the engine's principal group is no –COOH is a null
 * (BEYOND; never seen: a –COOH is the most senior group the app names).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, BEYOND, or null (no acid check applies, or neither name is an acid's).
 */
function acidChecks(ctx) {
  if (!acidPrincipal(ctx)) {
    const mine = ctx.spec.suffix;
    return mine && mine.kind === ACID ? BEYOND : null;
  }
  return acidSplit(ctx) || carbonylSeniority(ctx) || ketoneNotAldehyde(ctx) || acidCarbon(ctx) || carbonylPrefix(ctx);
} // End of function acidChecks()

/**
 * The principal C=O group's own checks (R-5c3b1, file header «Aldehydes and
 * ketones»), when the engine's principal group is an aldehyde's or a
 * ketone's, in order: CARBONYL_SENIORITY, KETONE_NOT_ALDEHYDE,
 * ALDEHYDE_CARBON, CARBONYL_PREFIX. After them a student's suffix of another
 * kind than the engine's is no case any message covers (never seen): the
 * null. A suffix with fewer groups than the engine's, or none, or other –CHO
 * groups than the engine's on the other side of a parent (review of phase
 * I-51c3b1: `2-(4-formilciclohexil)etanal`), goes on to the parent choice and
 * the rules (CARBONYL_PARENT; P0 names a chain with fewer C=O groups).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, BEYOND, or null (no C=O check applies, or the principal group is no aldehyde or ketone).
 */
function carbonylChecks(ctx) {
  const { suffix } = ctx.naming.structure;
  if (!suffix || !CARBONYLS.includes(suffix.kind)) {
    return null;
  }
  const draft = carbonylSeniority(ctx) || ketoneNotAldehyde(ctx) || aldehydeCarbon(ctx) || carbonylPrefix(ctx);
  if (draft) {
    return draft;
  }
  const mine = ctx.spec.suffix;
  return mine && mine.kind !== suffix.kind ? BEYOND : null;
} // End of function carbonylChecks()

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
    || !suffix || suffix.locants.length !== 1 || spec.suffix.kind !== ALCOHOL) { // Not `bencenocarbaldehído` (R-5c1).
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
 * SUBSTITUTED_TEMPLATE on a chain template (R-5c3a: `acetona`,
 * `formaldehído`, `acetaldehído`, `acetofenona`, `fenilacetaldehído`; R-5d2:
 * `ácido fórmico`, `ácido acético`, `ácido oxálico`, `ácido fenilacético`,
 * quoted with the class word; R-6a2a: `formiato`, `acetato`, `fenilacetato`;
 * R-6b2: `acetonitrilo`, `fenilacetonitrilo`)
 * with prefixes of the student's that the engine never writes on it
 * (tiles.js templateAdmits(): only `acetaldehído`, `acético`, `acetato` or
 * `acetonitrilo` with one phenyl, `2-(4-metilfenil)acetaldehído`): the molecule has its
 * systematic name (`1-cloroacetona` → «1-cloropropan-2-ona», `ácido
 * 2-cloroacético` → «ácido 2-cloroetanoico», `2-cloroacetato de metilo` →
 * «2-cloroetanoato de metilo», `2-cloroacetonitrilo` → «2-cloroetanonitrilo»),
 * whatever its parent; the
 * message names no parent (`parent` null). Rule 2, before the chain's and
 * the ring's rules, as for a substituted `tolueno`; its step is the choice
 * of the principal chain.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function substitutedChainTemplate(ctx) {
  const { naming, reading, spec } = ctx;
  const { template } = spec.parent;
  if (!template || !isChainTemplate(template.value) || spec.prefixes.length === 0 || templateAdmits(template.value, spec.prefixes)) {
    return null;
  }
  return {
    code: 'SUBSTITUTED_TEMPLATE',
    data: { template: template.word.text, parent: null, name: naming.name },
    focus: occurrenceIds(reading.prefixAtoms),
    tiles: template.word.tiles,
    step: 'groupChain',
  };
} // End of function substitutedChainTemplate()

/**
 * Ring rules 1, 2 and 4 (file header «Rings»), in place of the chain rules
 * 1–4 when the engine's parent is the ring: the ring as a branch of the
 * student's chain (a hydrocarbon's: an alcohol's is HYDROXY_PARENT, checked
 * first); a `ciclo` ring that is the benzene ring; a retained template with
 * the student's prefixes; `bencenol` for `fenol` (R-5a3b, PHENOL); the ring
 * numbered otherwise (followed through the engine's ring numbering trace
 * like rule 4 follows a chain's direction; N0 for an alcohol's OH groups or
 * an aldehyde's or a ketone's C=O groups).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null when the ring and its numbering are the engine's (or give the same name).
 */
function ringRules(ctx) {
  const { naming, reading, spec } = ctx;
  if (spec.parent.kind === 'chain') {
    // With a principal group (an ester's too, R-6a3a) the ring against a chain is principalParent()'s, checked first.
    return ringIsParent(ctx);
  }
  if (spec.parent.kind === 'ring' && benzeneParent(naming)) {
    return { code: 'BENZENE_RING', data: { name: naming.name }, focus: idsOf(null), tiles: spec.parent.tiles };
  }
  const { template } = spec.parent;
  if (template && spec.prefixes.length > 0 && !templateAdmits(template.value, spec.prefixes)) {
    // A retained phenol (R-5a3a) keeps its OH groups: with one (`cresol`) the molecule is named from `fenol`. The engine
    // writes a ftalaldehído with prefixes itself (R-5c3a: `4-metilftalaldehído`), so the other ring rules judge those.
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
      if (!ownWords || !DIAGNOSIS_PHRASES.numberingReasons[step.rule]) {
        return null;
      }
      return directionDraft(ctx, 'RING_NUMBERING', step, isStudent); // N0: the OH or the C=O groups (R-5a3b, R-5c3b1).
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
 * The engine's name of one of the student's branches, as a structure
 * (R-5c3b2, the branch-name rules): substituent.js nameSubstituent() of the
 * same atoms, seen from the same carrying atom, in the diagnosis's prefix
 * style — its chain (an acyl group's), its ring numbered as the engine
 * numbers it, whether it is an acyl group. An ester's O-bound group (R-6a3b,
 * hanging from its bridge oxygen) is named in the ester made of the group,
 * its bridge oxygen, the –COO–'s carbon and its =O (oBoundMolecule()), as the
 * engine names it beside a second ring (naming/index.js withSplitEster():
 * nameSubstituent() perceives one ring, `benzoato de 6-metilfenilo`), and so
 * is a branch inside it (its occurrence's `molecule`, oBoundInner()).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {BranchOccurrence} occurrence - The branch on the molecule.
 * @returns {object|null} The SubstituentStructure, or null.
 */
function engineBranch(ctx, occurrence) {
  let { molecule } = ctx;
  if (occurrence.molecule) {
    molecule = occurrence.molecule; // A branch inside an O-bound group (oBoundInner()).
  } else if (occurrence.sub && occurrence.sub.oBound) {
    molecule = oBoundMolecule(ctx, occurrence);
  }
  return nameSubstituent(molecule, occurrence.parentAtom, occurrence.attachment, ctx.style);
}

/**
 * The ester of an O-bound group alone (R-6a3b, engineBranch()): the group's
 * atoms, its bridge oxygen, the –COO–'s carbon and its =O, with the bonds
 * between them (atom and bond ids kept, as naming/index.js subMolecule()
 * keeps them): a methanoate of the group, with one ring at most.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {BranchOccurrence} occurrence - The O-bound group, hanging from its bridge oxygen.
 * @returns {object} The molecule.
 */
function oBoundMolecule(ctx, occurrence) {
  const { molecule, adj } = ctx;
  const link = adj.get(occurrence.parentAtom).find((n) => n.atom !== occurrence.attachment);
  const keep = new Set([...occurrence.atoms, occurrence.parentAtom]);
  if (link) {
    keep.add(link.atom);
    adj.get(link.atom).filter((n) => n.order === 2 && molecule.atoms.get(n.atom).element === OXO_ELEMENT)
      .forEach((n) => keep.add(n.atom));
  }
  const atoms = new Map([...molecule.atoms.values()].filter((a) => keep.has(a.id)).map((a) => [a.id, { id: a.id, element: a.element }]));
  const bonds = new Map([...molecule.bonds.values()].filter((b) => keep.has(b.a) && keep.has(b.b)).map((b) => [b.id, { ...b }]));
  return { atoms, bonds, nextAtomId: molecule.nextAtomId, nextBondId: molecule.nextBondId };
} // End of function oBoundMolecule()

/**
 * The ring of an engine's branch structure (R-5c3b2): the branch itself for
 * a ring bonded by one of its carbons (`fenil`, `ciclohexil`, also through an
 * ether oxygen, `fenoxi`), or the ring beyond the C=O of a ring's acyl group
 * (`benzoil`, `ciclohexanocarbonil`); its `chain.atoms` are the ring in the
 * engine's locant order, the attachment first.
 *
 * @param {object|null} structure - A SubstituentStructure (engineBranch()).
 * @returns {object|null} The ring's SubstituentStructure, or null for a branch without one.
 */
function engineRing(structure) {
  if (!structure) {
    return null;
  }
  if (structure.ring) {
    return structure;
  }
  if (structure.alkoxycarbonyl) {
    // R-6a2b: the ring of an alkoxycarbonyl prefix's alkoxy group, `[(2-metilfenoxi)carbonil]`.
    const alkoxy = structure.prefixes.find((g) => g.substituent.alkoxy);
    return alkoxy ? engineRing(alkoxy.substituent) : null;
  }
  const group = structure.ringCarbonyl ? structure.prefixes.find((g) => g.substituent.ring) : null;
  return group ? group.substituent : null;
}

/**
 * The prefix nodes of a parent-level prefix (R-5c3b2): itself, then the own
 * prefixes of its compound branch at every depth, in tile order.
 *
 * @param {object} item - A prefix node.
 * @returns {object[]} The nodes.
 */
function prefixNodes(item) {
  const sub = item.substituent;
  return [item, ...(sub.type === 'branch' ? sub.items.flatMap(prefixNodes) : [])];
}

/**
 * The atoms and bonds of one occurrence of a branch, at any depth (R-5c3b2):
 * its atoms, the bonds between them and the bond that joins it to the atom it
 * hangs from.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {BranchOccurrence} occurrence - The branch on the molecule.
 * @returns {{atoms: number[], bonds: number[]}} The ids.
 */
function branchIds(ctx, occurrence) {
  const inside = new Set(occurrence.atoms);
  const bonds = new Set();
  for (const id of occurrence.atoms) {
    for (const n of ctx.adj.get(id)) {
      if (inside.has(n.atom) || (id === occurrence.attachment && n.atom === occurrence.parentAtom)) {
        bonds.add(n.bond);
      }
    }
  }
  return { atoms: [...occurrence.atoms], bonds: [...bonds] };
} // End of function branchIds()

/**
 * Tells whether two atom lists hold the same atoms.
 *
 * @param {number[]} a - Atom ids.
 * @param {number[]} b - Atom ids.
 * @returns {boolean} True for the same set.
 */
function sameAtoms(a, b) {
  const set = new Set(a);
  return a.length === b.length && b.every((id) => set.has(id));
}

/**
 * Tells whether an acyl SubstituentSpec is one of the acyl groups with a
 * name of their own written by the general rule (ACYL_NAME): `etanoil`,
 * `metanoil` — a bare one- or two-carbon `oil` chain, with no prefixes and
 * no multiple bonds — whose names the engine writes `acetil`, `formil`.
 *
 * @param {object} sub - A SubstituentSpec.
 * @returns {boolean} True for `etanoil`, `metanoil` (also before `oxi`).
 */
function generalAcylWord(sub) {
  return Boolean(sub.acyl) && sub.kind === 'chain' && sub.length <= 2 && sub.prefixes.length === 0
    && sub.double.length + sub.triple.length === 0;
}

/**
 * ACYL_NAME (R-5c3b2): an acyl group — a branch bonded by the carbon of a
 * C=O of its own — written in words the engine does not use for it: the
 * acyl groups with a name of their own written by the general rule,
 * `etanoil` for `acetil` and `metanoil` for `formil` (`word`, the name, and
 * `written`, the student's), or the C=O written as an `oxo` prefix of an
 * alkyl group, `(1-oxoetil)` for `acetil`, `(1-oxopropil)` for `propanoil`
 * (the engine names it as an acyl group: `ring` when its C=O is bonded to a
 * ring, `-carbonil`). Not an ether's or ester's oxygen (an alkoxy prefix),
 * but since phase R-6a3b the acyl part of an acyloxy prefix written with the
 * general word (`(etanoiloxi)` for `(acetiloxi)`, `(metanoiloxi)` for
 * `(formiloxi)`; `written` without its `oxi`, acylPartWords()), the engine's
 * prefix an acyloxy one too (ESTER_PREFIX_NAME comes first).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {object} node - The student's prefix node.
 * @param {BranchOccurrence} occurrence - Its first occurrence on the molecule.
 * @param {{right: string, student: string}} words - The engine's and the student's words of the parent-level prefix that holds it.
 * @returns {object|null} The data, or null.
 */
function acylName(ctx, node, occurrence, words) {
  const { sub } = occurrence;
  const { molecule, adj } = ctx;
  if (esterPrefixOf(sub) === 'acyloxy') {
    // R-6a3b: an acyloxy prefix's acyl part with the general word (`etanoiloxi`, `metanoiloxi`); the engine's is an acyloxy too
    // (ESTER_PREFIX_NAME comes first).
    return generalAcylWord(sub) ? { carbons: sub.length, word: sub.length === 1 ? WORDS.formil : WORDS.acetil,
      written: acylPartWords(ctx.tree, node), ...words } : null;
  }
  const carbonyl = molecule.atoms.get(occurrence.attachment).element === CARBON && adj.get(occurrence.attachment)
    .some((n) => n.order === 2 && molecule.atoms.get(n.atom).element === OXO_ELEMENT && occurrence.atoms.includes(n.atom));
  if (sub.alkoxy || !carbonyl) {
    return null;
  }
  const engine = engineBranch(ctx, occurrence);
  if (!engine || !engine.acyl || engine.alkoxycarbonyl || engine.carbamoyl) {
    return null; // Not named as an acyl group by the engine (never seen for a C=O carbon bonded to a chain).
  }
  if (generalAcylWord(sub)) {
    // `etanoil`, `metanoil`: the engine writes `acetil`, `formil` (explain.js acylIntro()).
    return { carbons: sub.length, word: sub.length === 1 ? WORDS.formil : WORDS.acetil, written: wordsOf(ctx.tree, node), ...words };
  }
  if (sub.acyl || sub.retained === FORMYL || sub.retained === ACETYL) {
    return null; // Written as an acyl group: its chain or ring is ACYL_CHAIN's or BRANCH_RING_NUMBERING's.
  }
  return { ring: Boolean(engine.ringCarbonyl), ...words };
} // End of function acylName()

/**
 * What the engine's choice of a substituent's chain compares (substituent.js
 * buildSubstituent(): the longest, the most multiple bonds, the most double
 * bonds, then the numbering: the lowest locants for the multiple bonds and
 * for the prefixes), for an acyl chain read on the molecule from its C=O
 * carbon, carbon 1 (R-5c3b2 review). Its prefixes are every atom bonded to
 * the chain outside it, but the carrying atom and the acyl group's own =O.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {number[]} chain - The chain's atoms, the C=O carbon first.
 * @param {number} carrier - The atom the acyl group hangs from.
 * @returns {number[][]} The criteria, in order: [length], [multiple bonds], [double bonds], bond locants, prefix locants.
 */
function acylChainCriteria(ctx, chain, carrier) {
  const { adj, molecule } = ctx;
  const inside = new Set(chain);
  const bonds = [];
  let double = 0;
  for (let i = 0; i + 1 < chain.length; i += 1) {
    const link = adj.get(chain[i]).find((n) => n.atom === chain[i + 1]);
    if (link && link.order > 1) {
      bonds.push(i + 1);
      double += link.order === 2 ? 1 : 0;
    }
  }
  const prefixes = chain.flatMap((id, i) => adj.get(id)
    .filter((n) => !inside.has(n.atom) && n.atom !== carrier
      && !(i === 0 && n.order === 2 && molecule.atoms.get(n.atom).element === OXO_ELEMENT))
    .map(() => i + 1));
  return [[chain.length], [bonds.length], [double], bonds, prefixes.sort((p, q) => p - q)];
} // End of function acylChainCriteria()

/**
 * ACYL_CHAIN (R-5c3b2): the chain of an acyl group written with `oil` is not
 * the engine's — the chain starts at the C=O carbon, its carbon 1, and is
 * chosen like any chain (substituent.js: the longest, then the most
 * multiple bonds…): `(3-metilpropanoil)` for `butanoil`, `(2-etilpropanoil)`
 * for `(2-metilbutanoil)` (`longer`: the engine's chain has more carbons).
 * The student's chain is the first atoms build() created for the branch.
 * Only when a criterion that compares no words tells the two chains apart, in
 * the engine's favour (acylChainCriteria(): length, multiple and double bonds,
 * their locants, the prefixes' locants; review of phase I-51c3b2): two chains
 * that tie there are chosen by the alphabetical order of their prefixes' words,
 * which the student's own words may decide otherwise — null, as on any tie.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {object} node - The student's prefix node.
 * @param {BranchOccurrence} occurrence - Its first occurrence on the molecule.
 * @param {{right: string, student: string}} words - The engine's and the student's words of the parent-level prefix that holds it.
 * @returns {object|null} The data, or null.
 */
function acylChain(ctx, node, occurrence, words) {
  const { sub } = occurrence;
  if (!sub.acyl || sub.kind !== 'chain') {
    return null;
  }
  const engine = engineBranch(ctx, occurrence);
  if (!engine || !engine.acyl || engine.ringCarbonyl || !engine.chain) {
    return null;
  }
  const mine = occurrence.atoms.slice(0, sub.length);
  const theirs = engine.chain.atoms;
  if (sameAtoms(mine, theirs)) {
    return null;
  }
  const [a, b] = [mine, theirs].map((chain) => acylChainCriteria(ctx, chain, occurrence.parentAtom));
  // Length and bond counts: more is better; locants: lower is better. The first criterion that differs decides.
  const decided = a.map((criterion, i) => (i < 3 ? compareLocantLists(a[i], b[i]) : compareLocantLists(b[i], a[i])))
    .find((order) => order !== 0);
  if (decided === undefined || decided > 0) {
    return null; // A tie the words decide, or (never) the student's chain ahead.
  }
  return { longer: theirs.length > mine.length, length: theirs.length, studentLength: mine.length, ...words };
} // End of function acylChain()

/**
 * The locant of a ring bond between two atoms in a ring numbering: the lower
 * of the two, or n for the closing bond between carbons n and 1.
 *
 * @param {number[]} order - The ring's atoms in locant order.
 * @param {number} a - One atom of the bond.
 * @param {number} b - The other.
 * @returns {number} The locant.
 */
function ringBondLocant(order, a, b) {
  const [p, q] = [order.indexOf(a), order.indexOf(b)];
  return Math.abs(p - q) === 1 ? Math.min(p, q) + 1 : order.length;
}

/**
 * Tells whether the student's own words cite a ring branch's prefixes so that
 * the engine's numbering wins the alphabetical tie-break (R-5c3b2 review; the
 * ring's N4, as judgedInOwnWords() guards the parent's): the ring's own
 * prefixes grouped by structure, each group cited by the student's words
 * (citationKeyOf(); a group written in several words takes the one cited
 * first), in that citation order; each numbering's locants per group,
 * ascending, in that order; the engine's list lower than the student's.
 * A branch in a style the engine does not offer can be cited in another
 * order (`2-cloro-6-(1,1-dimetiletil)…`: `cloro` before `dimetiletil`), and
 * then the student's numbering is the right one for the student's words.
 *
 * @param {object[]} groups - The ring's own prefix groups: `key` (the student's citation key), `first` (tile order), `mine`
 *   and `theirs` (the locants in the student's and the engine's numbering).
 * @returns {boolean} True when the engine's numbering wins in the student's own words.
 */
function losesInOwnWords(groups) {
  const cited = [...groups].sort((g, h) => compareCitationKeys(g.key, h.key) || g.first - h.first);
  /**
   * One numbering's N4 value in the student's citation order.
   *
   * @param {string} side - 'mine' or 'theirs'.
   * @returns {number[]} The locants.
   */
  const value = (side) => cited.flatMap((g) => [...g[side]].sort((p, q) => p - q));
  return compareLocantLists(value('theirs'), value('mine')) < 0;
}

/**
 * BRANCH_RING_NUMBERING (R-5c3b2): a ring in a branch — `fenil`,
 * `ciclohexil`, `fenoxi`, `benzoil`, `…carbonil` — numbered otherwise than the
 * engine numbers it (substituent.js: from the carbon by which it is bonded,
 * 1, then the lowest locants for its multiple bonds and its prefixes, then
 * the alphabetical order): `(6-metilbenzoil)`, `(5-metilfenil)`,
 * `(6-metilciclohexano-1-carbonil)`, `(ciclohexano-2-carbonil)`. Compared on
 * the molecule: the student's ring is the first atoms build() created for the
 * branch, in the student's locant order; each of its own prefixes (by
 * structure, graph.js rootedBranchKey(), whatever its words) and each
 * multiple bond gets its locant in both numberings, and the carbon by which
 * the ring is bonded must be its carbon 1. Whether the ring is a benzene, whose
 * Kekulé bonds never count, is the engine's recognition (its ring's `retained`
 * 'benzene'), not the student's spelling: a benzene written with `ciclo`
 * (`(6-metilciclohexa-1,3,5-trien-1-il)`) is numbered as a `fenil` (review of
 * phase I-51c3b2), and the message says its double bonds do not count
 * (`benzene`). The reason is the first criterion that differs (review of phase
 * I-51c3b2): the multiple bonds' locants, then the prefixes' locants, then the
 * alphabetical tie-break, which compares words and is blamed only when the
 * engine's numbering also wins in the student's own words (losesInOwnWords());
 * otherwise, as on a tie, the student's numbering stands (null). The data:
 * that reason (`reason`, DIAGNOSIS_PHRASES.branchRingReasons; null for a bare
 * ring) and whether its numbers are not even written (`unwritten`:
 * `ciclohexanocarbonil`, `ciclohexil`).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {object} node - The student's prefix node.
 * @param {BranchOccurrence} occurrence - Its first occurrence on the molecule.
 * @param {{right: string, student: string}} words - The engine's and the student's words of the parent-level prefix that holds it.
 * @returns {object|null} The data, or null.
 */
function branchRingNumbering(ctx, node, occurrence, words) {
  const { sub } = occurrence;
  if (!isRing(sub.kind)) {
    return null;
  }
  const ring = engineRing(engineBranch(ctx, occurrence));
  const mine = occurrence.atoms.slice(0, sub.length);
  if (!ring || !ring.chain || !sameAtoms(mine, ring.chain.atoms)) {
    return null;
  }
  const theirs = ring.chain.atoms;
  const benzene = ring.chain.retained === 'benzene'; // The engine's aromatic recognition (naming/aromatic.js).
  const { molecule, adj, tree } = ctx;
  /**
   * A list as a comparable text, whatever its order.
   *
   * @param {Array<number|string>} list - Locants.
   * @returns {string} The text.
   */
  const bag = (list) => list.map(String).sort().join(',');
  const items = node.substituent.type === 'branch' ? node.substituent.items : [];
  const own = new Map(); // Each own prefix's locants in both numberings, by its structure, with the student's citation key.
  ownPrefixAtoms(sub, occurrence.atoms).forEach((slices, k) => {
    const key = citationKeyOf(items[k] ? wordsOf(tree, items[k]) : '');
    for (const slice of slices) {
      const join = joinOf(slice, adj);
      if (join) {
        const id = `${join.order}:${rootedBranchKey(molecule, join.attachment, join.parentAtom, adj)}`;
        const entry = own.get(id) || { key, first: k, mine: [], theirs: [] };
        if (compareCitationKeys(key, entry.key) < 0) {
          entry.key = key;
        }
        entry.mine.push(mine.indexOf(join.parentAtom) + 1);
        entry.theirs.push(theirs.indexOf(join.parentAtom) + 1);
        own.set(id, entry);
      }
    }
  }); // End of the loop over the ring's own prefixes
  const bonds = { mine: [], theirs: [] }; // Its multiple bonds (a benzene's Kekulé bonds never count).
  mine.forEach((id, i) => {
    const next = mine[(i + 1) % mine.length];
    const link = benzene ? null : adj.get(id).find((n) => n.atom === next);
    if (link && link.order > 1) {
      bonds.mine.push(`${link.order}:${i + 1}`);
      bonds.theirs.push(`${link.order}:${ringBondLocant(theirs, id, next)}`);
    }
  });
  const start = mine[0] !== theirs[0];
  const groups = [...own.values()];
  const all = (side) => bag(groups.flatMap((e) => e[side]));
  const bondsDiffer = bag(bonds.mine) !== bag(bonds.theirs);
  const groupsDiffer = groups.some((e) => bag(e.mine) !== bag(e.theirs));
  if (!start && !bondsDiffer && !groupsDiffer) {
    return null; // The engine's numbering, or one that gives the same locants.
  }
  let reason = null;
  if (bonds.mine.length > 0) {
    reason = groups.length > 0 ? 'bonds' : 'bondsOnly';
  } else if (groups.length > 0) {
    reason = 'lower';
  }
  if (!start && !bondsDiffer && all('mine') === all('theirs')) {
    // Only the alphabetical tie-break is left: blamed only when the student's own words lose it too.
    if (!losesInOwnWords(groups)) {
      return null;
    }
    reason = 'alphabetical';
  }
  return { reason, unwritten: reason === null, benzene: benzene && sub.kind === 'ring', ...words };
} // End of function branchRingNumbering()

/**
 * The engine's and the student's words of a parent-level prefix (R-5c3b2):
 * the naming's `prefix` part that holds the atoms of its first occurrence,
 * and the student's words (wordsOf()); only on the same parent as the
 * engine's (otherwise its branches are other atoms: an alphabetical step
 * read other words, chainRules()).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {number} index - The prefix's index in the tree's items.
 * @returns {{right: string, student: string, placed: object[]}|null} The words and the prefix's occurrences, or null.
 */
function prefixWords(ctx, index) {
  const { tree, naming, reading } = ctx;
  if (!sameAtoms(naming.parent.atoms, reading.studentParent.atoms)) {
    return null;
  }
  const placed = reading.prefixAtoms.filter((o) => o.prefix === index);
  const part = placed.length === 0 ? null
    : (naming.parts || []).find((p) => p.kind === 'prefix' && placed[0].atoms.every((id) => (p.atoms || []).includes(id)));
  return part ? { right: partText(naming.parts, part), student: wordsOf(tree, tree.items[index]), placed } : null;
}

/**
 * The kind of ester prefix a branch is (R-6a2b): 'acyloxy' for an acyl group
 * bonded through an ether oxygen (`acetiloxi`, `formiloxi`; a SubstituentSpec
 * with `alkoxy` and `acyl`, or `formil` before `oxi`; an engine structure with
 * `alkoxy` and `acyl`), 'alkoxycarbonyl' for an alkoxy group on a C=O carbon
 * (`metoxicarbonil`; `alkoxycarbonyl` set on either); null otherwise.
 *
 * @param {object} branch - A SubstituentSpec (interpret.js) or a SubstituentStructure (substituent.js).
 * @returns {'acyloxy'|'alkoxycarbonyl'|null} The kind.
 */
function esterPrefixOf(branch) {
  if (branch.alkoxycarbonyl) {
    return 'alkoxycarbonyl';
  }
  return branch.alkoxy && (branch.acyl || branch.retained === FORMYL) ? 'acyloxy' : null;
}

/**
 * Tells whether a SubstituentSpec or one of its own prefixes, at any depth,
 * is an `oxo` (ESTER_PREFIX_NAME, R-6a3b: the student named the ester's C=O
 * with `oxo`).
 *
 * @param {object} sub - A SubstituentSpec.
 * @returns {boolean} True when an `oxo` is among them.
 */
function hasOxo(sub) {
  return (sub.prefixes || []).some((prefix) => prefix.substituent.kind === OXO_KIND || hasOxo(prefix.substituent));
}

/**
 * ESTER_PREFIX_NAME (R-6a2b, R-6a3b; file header «Esters»), first of the
 * branch-name checks: the student wrote the engine's ester prefix as another
 * kind of branch — an acyloxy group as an alkoxy group with an `oxo` on its
 * carbon 1 (`(1-oxoetoxi)` for `(acetiloxi)`, `(1-oxometoxi)` for
 * `(formiloxi)`), an alkoxycarbonyl group as a substituted methyl
 * (`[(metoxi)oxometil]` for `(metoxicarbonil)`). The data: the engine's kind
 * (esterPrefixOf()), its part as the explanation names it — the acyl group
 * of an acyloxy prefix, `acetil`; the alkoxy group of an alkoxycarbonyl
 * prefix, `metoxi`: the engine's words of the prefix without their `oxi` or
 * `carbonil` and enclosing marks, when the prefix is a parent-level one (the
 * naming's parts hold no deeper words; null inside a compound branch) —,
 * whether the student named the C=O with `oxo` (hasOxo()), and the words of
 * the parent-level prefix that holds it. BEYOND for the reverse, an ester prefix of the
 * student's where the engine writes another kind of branch (never: on the
 * same atoms, an O–C=O hanging by its oxygen or a C=O carbon with an alkoxy
 * group is always an ester prefix for the engine). An acyloxy group's acyl
 * part with the general word (`(etanoiloxi)`) is ACYL_NAME's (acylName()).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {object} node - The student's prefix node.
 * @param {BranchOccurrence} occurrence - Its first occurrence on the molecule.
 * @param {{right: string, student: string}} words - The engine's and the student's words of the parent-level prefix that holds it.
 * @returns {object|null} The data, BEYOND, or null.
 */
function esterPrefixName(ctx, node, occurrence, words) {
  const { sub } = occurrence;
  const engine = engineBranch(ctx, occurrence);
  const theirs = engine ? esterPrefixOf(engine) : null;
  if (!engine || esterPrefixOf(sub) === theirs) {
    return null;
  }
  if (!theirs) {
    return BEYOND; // Never seen: an ester prefix of the student's that the engine names otherwise on the same atoms.
  }
  const ending = theirs === 'acyloxy' ? WORDS.oxi : WORDS.carbonil;
  const top = ctx.tree.items.includes(node) && words.right.endsWith(ending);
  return { kind: theirs, part: top ? unwrap(words.right.slice(0, -ending.length)) : null, oxo: hasOxo(sub), ...words };
} // End of function esterPrefixName()

/**
 * The words of the acyl part of the student's acyloxy prefix (ACYL_NAME,
 * R-6a3b): its words without the final `oxi` and their enclosing marks
 * (`etanoiloxi` → `etanoil`).
 *
 * @param {object} tree - The parse() tree.
 * @param {object} node - The acyloxy prefix's node.
 * @returns {string} The words.
 */
function acylPartWords(tree, node) {
  const words = wordsOf(tree, node);
  return unwrap(words.endsWith(WORDS.oxi) ? words.slice(0, -WORDS.oxi.length) : words);
}

/**
 * The branch-name checks (R-5c3b2), in order, each with its code
 * (branchNames()); an ester prefix's kind first (R-6a3b: esterPrefixName()).
 */
const BRANCH_NAME_CHECKS = Object.freeze([['ESTER_PREFIX_NAME', esterPrefixName], ['ACYL_NAME', acylName], ['ACYL_CHAIN', acylChain],
  ['BRANCH_RING_NUMBERING', branchRingNumbering]]);

/**
 * The branch-name rules (R-5c3b2, file header «Aldehydes and ketones»),
 * after the parent's rules 1–4 and before rule 5, ALPHABETICAL_ORDER, which
 * reads the branches' words: a parent-level prefix whose words are not the
 * engine's for the same atoms (the naming's `prefix` part that holds them,
 * on the same parent), then, from that prefix inward, the first of its
 * branches whose own name is not the engine's — an ester prefix written as
 * another kind of branch (ESTER_PREFIX_NAME, R-6a3b), an acyl group's word
 * (ACYL_NAME) or chain (ACYL_CHAIN), a ring's numbering
 * (BRANCH_RING_NUMBERING). The messages quote the two words of that
 * parent-level prefix, without its locants (the engine's from its naming,
 * never retyped). Null when no check names the difference: the form rules
 * that follow, or none (a branch in a style the engine does not offer, an
 * alkyl branch's own chain or numbering: «No rule covers»).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function branchNames(ctx) {
  const { tree } = ctx;
  for (const [index, item] of tree.items.entries()) {
    const found = prefixWords(ctx, index);
    if (!found || found.right.normalize('NFC') === found.student.normalize('NFC')) {
      continue;
    }
    const { placed, ...words } = found;
    for (const node of prefixNodes(item)) {
      const occurrence = ctx.occurrences.get(node);
      for (const [code, check] of occurrence ? BRANCH_NAME_CHECKS : []) {
        const data = check(ctx, node, occurrence, words);
        if (data === BEYOND) {
          return BEYOND; // An ester prefix of the student's the engine names otherwise (never seen; esterPrefixName()).
        }
        if (data) {
          return {
            code,
            data,
            focus: node === item ? occurrenceIds(placed) : branchIds(ctx, occurrence),
            tiles: [node.range[0], node.range[1]],
          };
        }
      }
    } // End of the loop over the branches of a parent-level prefix
  } // End of the loop over the parent-level prefixes
  return null;
} // End of function branchNames()

/**
 * Rules 5–7 on the groups of an amino prefix's nitrogen (R-6c2, file header
 * «Amines»), before any other list: those groups are written inside the
 * prefix's own name (`(dimetilamino)`, `[etil(metil)amino]`, alphabetised
 * under its first letter, a multiplier inside it counting), so their order,
 * grouping and multiplier decide the words the name-level order reads, as a
 * branch's own name does (branchNames()): `3-[metil(metil)amino]-2,2-dimetil…`
 * is UNGROUPED («(dimetilamino)»), not an order of `metil` against
 * `metil(metil)amino`. ALPHABETICAL_ORDER, UNGROUPED and MULTIPLIER_KIND
 * read those lists alone here, with their own codes and words, one list at
 * a time from the innermost out: an inner list's fix changes the words of
 * the list around it (`({[metil(metil)amino]metil}(etil)amino)` is UNGROUPED
 * inside, and `[(dimetilamino)metil]` then comes before `etil`).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function aminoGroups(ctx) {
  const lists = ctx.lists.filter((list) => list.owner && isAminoNode(ctx.tree.tiles, list.owner));
  // prefixLists() walks the tree in pre-order, so its reverse puts every list before the lists that enclose it.
  for (const list of lists.reverse()) {
    const inner = { ...ctx, lists: [list] };
    const draft = alphabeticalOrder(inner) || ungrouped(inner) || multiplierKind(inner);
    if (draft) {
      return draft;
    }
  }
  return null;
} // End of function aminoGroups()

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
    const compound = isCompoundNode(tree.tiles, group[0].substituent);
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
        // «Los sustituyentes iguales…» (R-5a1, R-5a2; R-5b: `1-metoxi-2-metoxietano`).
        halogen: isAtomGroup(group[0].substituent.type) || isAlkoxyNode(group[0].substituent),
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
 * prefixes of its own, or bis… before a simple one. An alkoxy prefix that
 * takes bis… only for its form (R-5b2, file header «Ethers»: a branch +
 * `oxi` with no prefixes of its own, `di(pentiloxi)`, `di(propan-2-iloxi)`,
 * and `di-tert-butoxi`, which the engine writes `bis-tert-butoxi`) gets
 * ALKOXY_MULTIPLIER, whose message gives that reason: MULTIPLIER_KIND's,
 * «una rama que tiene sus propias ramas», does not hold for it.
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
      const compound = isCompoundNode(tree.tiles, item.substituent);
      if ((tile.kind === 'cmult') === compound) {
        continue;
      }
      const ownBranches = item.substituent.type === 'branch' && item.substituent.items.length > 0;
      const swapped = withTiles(tree, new Map([[item.multiplier, tileById(tileId(compound ? 'cmult' : 'mult', tile.value))]]));
      const texts = { right: quoted(swapped, list, item), student: quoted(tree, list, item) };
      // R-6a2b: an alkoxycarbonyl prefix is a C=O carbon with its own groups, the alkoxy group and the =O (render.js
      // isCompoundPrefix()), so MULTIPLIER_KIND's reason holds (`di(metoxicarbonil)`); an acyloxy prefix is an `oxi` prefix
      // that is not shortened (`di(acetiloxi)`), ALKOXY_MULTIPLIER's.
      if (compound && !ownBranches && esterPrefixKind(tree.tiles, item.substituent) !== 'alkoxycarbonyl') {
        // `di(pentiloxi)`, `di-tert-butoxi` (R-5b2): bis… for the alkoxy prefix's form (assemble.js isCompoundAlkoxy()).
        const core = alkoxyCore(item.substituent);
        const tertButoxy = core.type === 'retained' && tree.tiles[core.tile].value === TERT_BUTYL;
        return {
          code: 'ALKOXY_MULTIPLIER',
          data: { tertButoxy, prefix: wordsOf(tree, item), ...texts },
          focus: prefixFocus(ctx, list, [index]),
          tiles: [item.multiplier, item.multiplier + 1],
        };
      }
      return {
        code: 'MULTIPLIER_KIND',
        data: { compound, ...texts },
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
 * `triclorometan-1-ol`), or of both (`1,1,1-triclorometan-1-ol`); an
 * aldehyde's or a ketone's (R-5c3b1) of its C=O groups (suffixWhat():
 * `ciclohexan-1-ona`, `propan-2-ona`, `ciclohexano-1-carbaldehído`); an
 * acid's (R-5d3) of its –COOH groups (`ácido ciclohexano-1-carboxílico`,
 * `ácido benceno-1-carboxílico` → «…el grupo –COOH»); an ester's (R-6a3a) of
 * its –COO– groups (`ciclohexano-1-carboxilato de metilo`,
 * `benceno-1-carboxilato de metilo` → «…el grupo –COO–»); a nitrile's
 * (R-6b3) of its –C≡N groups (`ciclohexano-1-carbonitrilo`,
 * `benceno-1-carbonitrilo` → «…el grupo –C≡N»).
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
  // R-6c1, file header «Amines»: the omission counted without the groups on the nitrogen; beside an `N` the carbon prefixes'
  // locants are always cited, and the suffix's needless locants are phase I-52c4's.
  const amine = Boolean(structure.suffix) && structure.suffix.kind === AMINE ? carbonPrefixGroups(structure.prefixes) : null;
  if (amine && suffixSlots.length > 0 && parentOmissions({ ...structure, prefixes: amine.prefixes }).prefixes) {
    return AMINE_NULLS.suffix;
  }
  if (prefixSlots.length + suffixSlots.length > 0 && omitted.prefixes && !(amine && amine.nitrogen)) {
    const { what, on } = DIAGNOSIS_PHRASES;
    const single = structure.prefixes.reduce((sum, group) => sum + group.locants.length, 0) === 1;
    const prefixWhat = single ? what.prefix : what.prefixes;
    const groupCount = structure.suffix ? structure.suffix.locants.length : 0;
    const groupWhat = suffixWhat(structure.suffix ? structure.suffix.kind : ALCOHOL, groupCount);
    let phrase = { text: prefixWhat, plural: !single };
    if (suffixSlots.length > 0) {
      phrase = prefixSlots.length > 0 ? { text: what.together(prefixWhat, groupWhat), plural: true }
        : { text: groupWhat, plural: groupCount > 1 };
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
  return traditionalLocants(ctx);
} // End of function needlessLocants()

/**
 * Rule 9 on a traditional name (R-5c3b2): locants on the prefixes of a
 * template the engine writes without them — the student's name with every
 * parent-level prefix locant left out is one of the engine's names
 * (`2-fenilacetaldehído` → `fenilacetaldehído`, the engine's alternative of
 * `2-feniletanal`; on `2-(3-metilfenil)acetaldehído` the engine writes the
 * 2; R-5d2: `ácido 2-fenilacético` → `ácido fenilacético`; R-6a2a:
 * `2-fenilacetato de metilo` → `fenilacetato de metilo`; R-6b2:
 * `2-fenilacetonitrilo` → `fenilacetonitrilo`). The message
 * quotes that name; its step is «Monta el nombre», which lists it among the
 * other valid forms.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function traditionalLocants(ctx) {
  const { tree, spec, naming } = ctx;
  const located = tree.items.flatMap((item) => item.locants);
  if (!spec.parent.template || located.length === 0) {
    return null;
  }
  const bare = assemble({ ...tree, items: tree.items.map((item) => ({ ...item, locants: [] })) }).text.normalize('NFC');
  const names = [naming.name, ...(naming.alternatives || []).map((alt) => alt.name)].map((name) => name.normalize('NFC'));
  if (!names.includes(bare)) {
    return null;
  }
  return {
    code: 'NEEDLESS_LOCANTS',
    data: { traditional: true, name: bare, student: assemble(tree).text },
    focus: idsOf(null),
    tiles: rangeOf(located),
    step: 'assemble',
  };
} // End of function traditionalLocants()

/**
 * What the suffix's groups are called in NEEDLESS_LOCANTS (DIAGNOSIS_PHRASES
 * `what`): «el grupo –OH» / «los grupos –OH» for an alcohol (R-5a3b), «el
 * grupo –CHO» or «el grupo C=O» and their plurals for an aldehyde or a ketone
 * (R-5c3b1), «el grupo –COOH» / «los grupos –COOH» for an acid (R-5d3), «el
 * grupo –COO–» / «los grupos –COO–» for an ester (R-6a3a), «el grupo –C≡N» /
 * «los grupos –C≡N» for a nitrile (R-6b3).
 *
 * @param {string} kind - The engine's suffix kind ('alcohol', 'aldehyde', 'ketone', 'acid', 'ester', 'nitrile').
 * @param {number} count - How many groups it cites.
 * @returns {string} The phrase.
 */
function suffixWhat(kind, count) {
  const { what } = DIAGNOSIS_PHRASES;
  const [one, many] = {
    [ALDEHYDE]: [what.aldehyde, what.aldehydes],
    [KETONE]: [what.ketone, what.ketones],
    [ACID]: [what.acid, what.acids],
    [ESTER]: [what.ester, what.esters],
    [NITRILE]: [what.nitrile, what.nitriles],
  }[kind] || [what.hydroxy, what.hydroxys];
  return count === 1 ? one : many;
}

/**
 * The engine's short form of a branch chain written with needless locants
 * (rule 9; render.js substituentTokens()): no `ano`, no free-valence
 * locant, and on a one- or two-carbon branch no locant at all
 * (`(metan-1-il)` → `metil`, `(et-1-enil)` → `etenil`); on a longer
 * saturated branch, the free valence 1 (`(propan-1-il)` → `propil`). A
 * compound branch's own chain whose free valence is not at its carbon 1
 * keeps it (R-5a1: `(1-cloroetan-2-il)` is `(2-cloroetil)` numbered from
 * the other end, not `(1-cloroetil)`, a numbering no rule names; likewise
 * `(1-metiletan-2-il)` is `propil`, not `(1-metiletil)`): null. A ring's
 * acyl prefix (R-5c2) keeps its whole ending and loses only the locant 1
 * before `carbonil`, which the engine writes unless the ring has neither a
 * multiple bond nor prefixes of its own (render.js ringCarbonylTokens():
 * `(ciclohexano-1-carbonil)` → `(ciclohexanocarbonil)`; never
 * `(ciclohex-2-eno-1-carbonil)`); `oil` takes no locant (parse.js).
 *
 * @param {object} tree - The parse() tree.
 * @param {object} chain - A branch's chain node (parse.js, with `fv`).
 * @param {object|null} [owner] - The compound branch whose own chain it is (chainNodes()), or null.
 * @returns {object|null} The chain node in its short form, or null when it has no needless locants.
 */
function shortForm(tree, chain, owner = null) {
  if (tree.tiles[chain.fv].kind === 'acyl') {
    const one = chain.fvLocants.length === 1 && tree.tiles[chain.fvLocants[0]].value === 1;
    const bare = chain.segments.length === 0 && !(owner && owner.items.length > 0);
    return one && bare ? { ...chain, fvLocants: [] } : null; // `(ciclohexano-1-carbonil)` → `(ciclohexanocarbonil)` (R-5c2)
  }
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
 * located). A missing locant of the suffix names its groups too (R-5d3, the
 * data's `group`: `ácido 2-clorociclohexanocarboxílico` read with another
 * mistake would say «…y cada grupo –COOH»; alone it is `missingLocants`,
 * never `otherName`, and no later rule meets it on an acid; R-6a3a: «…y cada
 * grupo –COO–» for an ester's; R-6b3: «…y cada grupo –C≡N» for a nitrile's).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function missingLocants(ctx) {
  const { spec, naming } = ctx;
  const parentBonds = new Set([...spec.parent.double, ...spec.parent.triple]);
  const parentPrefixes = new Set([...spec.prefixes.flatMap((prefix) => prefix.slots), ...(spec.suffix ? spec.suffix.slots : [])]);
  const omitted = parentOmissions(naming.structure);
  // R-6c1, file header «Amines»: the omission counted without the groups on the nitrogen, and beside an `N` every prefix's
  // locant cited.
  const { suffix } = naming.structure;
  const amine = Boolean(suffix) && suffix.kind === AMINE ? carbonPrefixGroups(naming.structure.prefixes) : null;
  const carbonOmitted = amine ? parentOmissions({ ...naming.structure, prefixes: amine.prefixes }).prefixes : omitted.prefixes;
  const cited = (slot) => (amine && amine.nitrogen && !(spec.suffix && spec.suffix.slots.includes(slot))) || !carbonOmitted;
  const missing = spec.leftOut.find((slot) => {
    if (slot.domain[1] <= slot.domain[0]) {
      return false; // One possible value: no name writes it (search.js filledTree()).
    }
    if (parentBonds.has(slot)) {
      return !omitted.bonds;
    }
    return parentPrefixes.has(slot) ? cited(slot) : true;
  });
  if (!missing) {
    return carbonylLocant(ctx);
  }
  const ofSuffix = Boolean(suffix) && Boolean(spec.suffix) && spec.suffix.slots.includes(missing);
  if (ofSuffix && suffix.kind === AMINE) {
    return AMINE_NULLS.suffix; // An amine's missing suffix locant (R-6c1, file header «Amines»): phase I-52c4.
  }
  const group = ofSuffix ? DIAGNOSIS_PHRASES.groupWords[NAMED_GROUPS.includes(suffix.kind) ? suffix.kind : ALCOHOL].one : null;
  return {
    code: 'MISSING_LOCANTS',
    data: { branch: false, name: naming.name, group },
    focus: idsOf(null),
    tiles: [missing.tiles[0], missing.tiles[1]],
  };
} // End of function missingLocants()

/**
 * Rule 9 inside a branch (R-5c3b2): the locant 1 before `carbonil` left out
 * where the engine writes it — on a ring with a multiple bond or prefixes of
 * its own (render.js ringCarbonylTokens(); shortForm() is the reverse case,
 * a needless 1 on a bare ring): `(ciclohex-2-enocarbonil)` →
 * `(ciclohex-2-eno-1-carbonil)`, `(2-metilciclohexanocarbonil)`. The right
 * form is the student's parent-level prefix with a number tile 1 put before
 * `carbonil`, and only when it is the engine's own words for that prefix
 * (prefixWords(); review of phase I-51c3b2: the student's spelling alone would
 * tell `(ciclohexa-1,3,5-trienocarbonil)` to write a 1 where the engine
 * writes `benzoil`); the step, «Nombra los sustituyentes», which says the
 * ring is numbered from the carbon bonded to the C=O.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function carbonylLocant(ctx) {
  const { tree } = ctx;
  for (const { chain, top, owner } of ctx.chains) {
    const ownPrefixes = Boolean(owner && owner.items.length > 0);
    if (!top || chain.fv === null || tree.tiles[chain.fv].id !== RING_CARBONYL_ID || chain.fvLocants.length > 0
      || (chain.segments.length === 0 && !ownPrefixes)) {
      continue;
    }
    const grown = { ...tree, tiles: [...tree.tiles, tileById(tileId('num', 1))] };
    const fixed = replaceNode(top, chain, { ...chain, fvLocants: [grown.tiles.length - 1] });
    const words = prefixWords(ctx, tree.items.indexOf(top));
    if (!words || wordsOf(grown, fixed).normalize('NFC') !== words.right.normalize('NFC')) {
      continue; // The engine writes that branch otherwise (a benzene ring spelt with `ciclo` is `benzoil`; review of I-51c3b2).
    }
    return {
      code: 'MISSING_LOCANTS',
      data: { branch: true, right: itemText(grown, fixed), student: itemText(tree, top) },
      focus: idsOf(null),
      tiles: [chain.fv, chain.fv + 1],
      step: 'substituents',
    };
  } // End of the loop over the branch chains
  return null;
} // End of function carbonylLocant()

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
 * a multiple bond or (R-5a3b) of the suffix (`2-propanol`, `1,2-etanodiol`;
 * R-5c1: `2-pentanona`, `2,4-pentanodiona`): the message then says they go
 * right before the suffix's words (`ol`, `diol`, `ona`, `diona`:
 * suffixWordOf()), not before «eno» or «ino».
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
  const words = tree.parent.legacySuffix && suffix ? suffixWordOf(suffix) : null;
  return { code: 'OLD_STYLE', data: { name: naming.name, suffix: words }, focus: idsOf(null), tiles: rangeOf(tree.parent.legacy) };
}

/**
 * The engine's suffix words for its suffix groups, from the lexicon as
 * render.js suffixWords() builds them (diagnose.js never imports render.js):
 * the multiplier, its final `a` elided before a vowel (`tetrol`), and the
 * suffix — `ol`, `diol` (R-5a3b); `ona`, `diona`, `dicarbaldehído` (R-5c1).
 *
 * @param {{kind: string, locants: object[], outside?: boolean}} suffix - The engine's SuffixStructure.
 * @returns {string} The words.
 */
function suffixWordOf(suffix) {
  const word = suffix.outside ? ringGroupSuffix(suffix.kind) : groupSuffix(suffix.kind);
  const full = suffix.locants.length > 1 ? multiplier(suffix.locants.length) : '';
  return `${full.endsWith('a') && /^[aeiou]/.test(word) ? full.slice(0, -1) : full}${word}`;
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
 * The parent-choice codes that ETHER_SIDE takes over when the student's chain
 * is on the other side of an ether oxygen from the engine's parent (R-5b2,
 * file header «Ethers»): the ring or chain choice and the chain rules 2–3.
 */
const ACROSS_OXYGEN = Object.freeze(['RING_IS_PARENT', 'HYDROXY_PARENT', 'CARBONYL_PARENT', 'MORE_HYDROXY_GROUPS',
  'MORE_CARBONYL_GROUPS', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS',
  'CHAIN_ALPHABETICAL']);

/**
 * The ether oxygen between the student's chain and the engine's parent
 * (R-5b2): when the two share no atom, the last ether oxygen (an O with two
 * bonds) on the shortest path from the student's chain to the parent — the
 * one next to the parent's side, whose alkoxy prefix holds the student's
 * chain. Null when they share an atom or no ether oxygen lies between them.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {number|null} The oxygen's atom id, or null.
 */
function oxygenBetween(ctx) {
  const { molecule, adj, reading, naming } = ctx;
  const parent = new Set(naming.parent.atoms);
  const start = reading.studentParent.atoms;
  if (start.some((id) => parent.has(id))) {
    return null;
  }
  const previous = new Map(start.map((id) => [id, null]));
  const queue = [...start];
  let reached = null;
  while (queue.length > 0 && reached === null) {
    const id = queue.shift();
    for (const n of adj.get(id)) {
      if (!previous.has(n.atom)) {
        previous.set(n.atom, id);
        if (parent.has(n.atom)) {
          reached = n.atom;
          break;
        }
        queue.push(n.atom);
      }
    }
  } // End of the breadth-first search from the student's chain
  for (let id = reached === null ? null : previous.get(reached); id !== null; id = previous.get(id)) {
    if (molecule.atoms.get(id).element === ALKOXY_ELEMENT && adj.get(id).length === 2) {
      return id;
    }
  }
  return null;
} // End of function oxygenBetween()

/**
 * The engine's prefix that holds the student's chain (R-5b2, ETHER_SIDE):
 * the text of the naming's `prefix` part whose atoms include every atom of
 * the student's chain — `metoxi` in `metoxietano`, the whole `(2-metoxietoxi)`
 * for a chain deeper inside —, or null.
 *
 * @param {object} naming - The naming compared with.
 * @param {number[]} atoms - The student's chain.
 * @returns {string|null} The prefix's text.
 */
function holdingPrefix(naming, atoms) {
  const part = (naming.parts || []).find((p) => p.kind === 'prefix' && atoms.every((id) => (p.atoms || []).includes(id)));
  return part ? partText(naming.parts, part) : null;
}

/**
 * The text of a naming's `prefix` part as the prefix's words (R-6a2b): the
 * part's text, with the opening marks the engine's parts keep apart before it
 * when its words start with an enclosed part of their own — an ester
 * prefix's inner part: `[(2-metilbenzoil)oxi]` gives the parts `[`, `(` and
 * `2-metilbenzoil)oxi`, so the words are `(2-metilbenzoil)oxi` — as many of
 * the punctuation parts right before it as its text has unmatched closing
 * marks; the text itself for every other prefix.
 *
 * @param {object[]} parts - The naming's parts.
 * @param {{text: string}} part - One of its `prefix` parts.
 * @returns {string} The words.
 */
function partText(parts, part) {
  const opens = ENCLOSING_MARKS.map(([open]) => open);
  const closes = ENCLOSING_MARKS.map(([, close]) => close);
  let depth = 0;
  let unmatched = 0;
  for (const ch of part.text) {
    if (opens.includes(ch)) {
      depth += 1;
    } else if (closes.includes(ch) && depth > 0) {
      depth -= 1;
    } else if (closes.includes(ch)) {
      unmatched += 1;
    }
  } // End of the loop over the part's characters
  const index = parts.indexOf(part);
  const lead = parts.slice(Math.max(0, index - unmatched), index).filter((p) => p.kind === 'punct' && opens.includes(p.text));
  return `${lead.map((p) => p.text).join('')}${part.text}`;
} // End of function partText()

/**
 * Tells whether the student's chain lies deeper inside the engine's
 * substituent that holds it (R-5b2 review, ETHER_SIDE): the substituent is
 * the student's chain (with its own branches) and the oxygen only when that
 * oxygen is bonded both to the student's chain and to the engine's parent
 * (`etoximetano`: «metoxi»; `cloro(propoxi)metano`: «clorometoxi»);
 * otherwise the student's chain is part of a larger substituent
 * (`(2-propoxietoxi)metano`: the methyl inside «2-metoxietoxi»;
 * `(2-etilpentiloxi)metano`: inside «metoximetil», whose oxygen does not
 * touch the parent).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {number} oxygen - The ether oxygen between the two (oxygenBetween()).
 * @returns {boolean} True when the student's chain is only part of the substituent.
 */
function nestedSide(ctx, oxygen) {
  const { adj, reading, naming } = ctx;
  /**
   * Tells whether the oxygen is bonded to an atom of a set.
   *
   * @param {number[]} atoms - The atoms.
   * @returns {boolean} True when one of them is bonded to the oxygen.
   */
  const bonded = (atoms) => adj.get(oxygen).some((n) => atoms.includes(n.atom));
  return !(bonded(reading.studentParent.atoms) && bonded(naming.parent.atoms));
}

/**
 * A parent-choice draft (ACROSS_OXYGEN) as ETHER_SIDE when the student's
 * chain is on the other side of an ether oxygen from the engine's parent
 * (R-5b2, file header «Ethers»: `etoximetano` for `metoxietano`,
 * `fenoxietano` for `etoxibenceno`): the same trace rule and data, its
 * reason told from the oxygen (DIAGNOSIS_PHRASES.etherSide()), the rule
 * number of the draft it replaces (the kindest reading still compares
 * them), the step «Reconoce el éter» (which says which side holds the parent
 * and why), the oxygen added to the focus and the tiles of the student's
 * prefix that holds the engine's parent; `nested` when the student's chain is
 * only part of the engine's substituent that holds it (nestedSide()). Any
 * other draft is returned as it is.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {object} draft - A draft of the parent rules.
 * @returns {object} The draft.
 */
function acrossOxygen(ctx, draft) {
  if (!ACROSS_OXYGEN.includes(draft.code)) {
    return draft;
  }
  const oxygen = oxygenBetween(ctx);
  if (oxygen === null) {
    return draft;
  }
  const { naming, reading, adj } = ctx;
  const focus = idsOf(draft.focus);
  return {
    code: 'ETHER_SIDE',
    rule: DIAGNOSES[draft.code].rule,
    traceRule: draft.traceRule,
    data: {
      ...draft.data,
      reason: draft.code,
      benzene: benzeneParent(naming),
      studentRing: isRing(ctx.spec.parent.kind),
      nested: nestedSide(ctx, oxygen),
      side: holdingPrefix(naming, reading.studentParent.atoms),
      name: naming.name,
    },
    focus: { atoms: [...focus.atoms, oxygen], bonds: [...focus.bonds, ...adj.get(oxygen).map((n) => n.bond)] },
    tiles: parentHolderTiles(ctx),
    step: 'ether',
  };
} // End of function acrossOxygen()

/**
 * The checks of rules 5–11, in order, the branch-name rules (R-5c3b2) first.
 * Later families insert theirs.
 */
const FORM_RULES = Object.freeze([branchNames, aminoGroups, alphabeticalOrder, ungrouped, multiplierKind, locantOrder, needlessLocants,
  missingLocants, segmentOrder, oldStyle, letterLocants]);

/**
 * The first rule that applies to one reading of the name: the nitrile's own
 * checks (nitrileChecks(), file header «Nitriles»), the ester's own
 * checks and its O-bound side's (esterChecks(), oBoundChecks(); file header
 * «Esters») or the acid's (acidChecks(), «Acids») — each when the engine's
 * principal group is its own, so they never meet —, an alcohol's OH written
 * `hidroxi` on the parent (hydroxyPrefix(), file header «Alcohols»),
 * the principal C=O group's own checks (carbonylChecks(), «Aldehydes and
 * ketones»), then the parent's kind decided by the principal groups (ring or
 * chain: principalParent()), the parent's rules (chainRules(), rules 1–4;
 * ringRules() when the engine's parent is the ring) — a parent choice told
 * from the ether oxygen when the student's chain is on its other side
 * (acrossOxygen(), R-5b2) —, then the form rules.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft `{code, rule?, traceRule?, data, focus, tiles, step?, style?}`, or null.
 */
function firstRule(ctx) {
  const principal = amineChecks(ctx) || nitrileChecks(ctx) || esterChecks(ctx) || oBoundChecks(ctx) || acidChecks(ctx) || hydroxyPrefix(ctx)
    || carbonylChecks(ctx) || principalParent(ctx);
  if (principal === BEYOND) {
    // A student's carbonyl suffix no C=O check names; a student's acid suffix beside another principal group; an O-bound
    // side mixing prefix styles; a student's nitrile suffix beside a principal group junior to it (all never seen; file
    // header «Aldehydes and ketones», «Acids», «Esters», «Nitriles»).
    return null;
  }
  if (isAmineNull(principal)) {
    return principal; // An amine's own mistake (R-6c1, «Amines»: phase I-52c4), kept with its rule among the readings.
  }
  if (principal) {
    return acrossOxygen(ctx, principal); // The ring or chain on the other side of an ether oxygen (R-5b2).
  }
  const parent = substitutedChainTemplate(ctx) || (ctx.naming.structure.parentKind === 'ring' ? ringRules(ctx) : chainRules(ctx));
  if (isAmineNull(parent)) {
    return parent; // The amine groups choose or number the parent (R-6c1, «Amines»: phase I-52c4).
  }
  if (parent) {
    return acrossOxygen(ctx, parent); // `etoximetano` (R-5b2).
  }
  for (const rule of FORM_RULES) {
    const draft = rule(ctx);
    if (draft === BEYOND) {
      return null; // An ester prefix of the student's the engine names otherwise (never seen; branchNames(), «Esters»).
    }
    if (isAmineNull(draft)) {
      return draft; // An amine suffix's needless or missing locants (R-6c1, «Amines»: phase I-52c4).
    }
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
 * The shape of an amino prefix for recognising the prefix style (R-6c2):
 * its nitrogen and the shapes of the groups on it, in a fixed order — the
 * same in every style, so only its groups' shapes tell a style.
 *
 * @param {string[]} nested - The shapes of the groups on the nitrogen, one per occurrence.
 * @returns {string} The shape.
 */
function aminoShape(nested) {
  return `${AMINO_ELEMENT}:(${[...nested].sort().join(',')})`;
}

/**
 * The shape of a branch as the student wrote it (a SubstituentSpec): a
 * halogen (R-5a1; the same in every style), a retained word, or chainShape()
 * of its chain; an alkoxy prefix (R-5b) is its branch's shape after `O:`
 * (`isopropoxi` is `O:R:isopropyl`, `(propan-2-iloxi)` `O:C3:2:1()`); `oxo`
 * (R-5c1) is `X:=O`, and `formil` the shape the engine gives its formyl
 * group, a one-carbon chain with an oxo (`C1:1:1(X:=O)`); an acyl prefix
 * (R-5c2) the engine's acyl group's, its chain with the oxo on its carbon 1
 * (`acetil` `C2:1:1(X:=O)`, `propanoil` `C3:1:1(X:=O)`), or for a ring's
 * (`(ciclohexanocarbonil)`, `benzoil`) the one-carbon chain of the C=O carbon
 * with its oxo and the ring; `carboxi` (R-5d1) the engine's carboxy prefix,
 * `X:COOH`; `ciano` (R-6b1) the engine's cyano prefix, `X:CN`.
 * Spelling mistakes the later rules name do not change it:
 * `(1-metiletan-1-il)` and `1-metiletil` have one shape.
 *
 * @param {object} sub - A SubstituentSpec (interpret.js).
 * @returns {string} The shape.
 */
function specShape(sub) {
  if (isHalogen(sub)) {
    // A halogen, or the O of `hidroxi` (R-5a2); the =O of `oxo` (R-5c1).
    return `X:${atomGroupOrder(sub.kind) === 2 ? DOUBLE_OXYGEN : sub.element}`;
  }
  const ether = sub.alkoxy ? `${ALKOXY_ELEMENT}:` : '';
  if (sub.alkoxycarbonyl) {
    // `metoxicarbonil` (R-6a2b): the engine's one-carbon group of the C=O carbon, its oxo and the alkoxy group on it.
    return chainShape(1, 1, 1, [`X:${DOUBLE_OXYGEN}`, specShape({ ...sub, alkoxycarbonyl: false })]);
  }
  if (sub.kind === 'retained' && sub.retained === FORMYL) {
    // `formil` (R-5c1): the engine's one-carbon acyl group with its oxo; after `O:`, `formiloxi` (R-6a2b).
    return `${ether}${chainShape(1, 1, 1, [`X:${DOUBLE_OXYGEN}`])}`;
  }
  if (sub.kind === 'retained' && sub.retained === ACETYL) {
    // `acetil` (R-5c2): the engine's two-carbon acyl group with its oxo; after `O:`, `acetiloxi` (R-6a2b).
    return `${ether}${chainShape(2, 1, 1, [`X:${DOUBLE_OXYGEN}`])}`;
  }
  if (sub.kind === 'retained' && sub.retained === CARBOXY) {
    return CARBOXY_SHAPE; // `carboxi` (R-5d1): the engine's carboxy prefix, no chain of its own.
  }
  if (sub.kind === 'retained' && sub.retained === CYANO) {
    return CYANO_SHAPE; // `ciano` (R-6b1): the engine's cyano prefix, no chain of its own.
  }
  if (sub.kind === AMINO_KIND) {
    // An amino prefix (R-6c2): its nitrogen and the shapes of the groups on it, as structureShape() writes the engine's.
    return aminoShape(sub.prefixes.flatMap((prefix) => prefix.slots.map(() => specShape(prefix.substituent))));
  }
  if (sub.kind === 'retained') {
    return `${ether}R:${sub.retained}`;
  }
  if (sub.acyl && isRing(sub.kind)) {
    // `(ciclohexanocarbonil)`, `benzoil` (R-5c2): the engine's one-carbon acyl group, its oxo and the ring on it; after `O:`,
    // `benzoiloxi` (R-6a2b).
    return `${ether}${chainShape(1, 1, 1, [`X:${DOUBLE_OXYGEN}`, specShape({ ...sub, acyl: false, alkoxy: false })])}`;
  }
  const nested = sub.prefixes.flatMap((prefix) => prefix.slots.map(() => specShape(prefix.substituent)));
  if (sub.acyl) {
    nested.push(`X:${DOUBLE_OXYGEN}`); // `propanoil` (R-5c2): the =O on its carbon 1, as the engine keeps it among the prefixes.
  }
  return `${ether}${chainShape(sub.length, sub.freeValence.slot.value, sub.freeValence.order, nested)}`;
} // End of function specShape()

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
  if (structure.oxo) {
    return `X:${DOUBLE_OXYGEN}`; // `oxo` (R-5c1), as specShape() writes it.
  }
  if (structure.carboxy) {
    return CARBOXY_SHAPE; // `carboxi` (R-5d1), as specShape() writes it.
  }
  if (structure.cyano) {
    return CYANO_SHAPE; // `ciano` (R-6b1), as specShape() writes it.
  }
  if (structure.amino) {
    // An amino prefix (R-6c2, substituent.js aminoSubstituent()), as specShape() writes it.
    return aminoShape((structure.prefixes || []).flatMap((group) => group.locants.map(() => structureShape(group.substituent))));
  }
  // An alkoxy group (R-5b, substituent.js alkoxySubstituent()): its alkyl group's shape after `O:`, as specShape() writes it.
  const ether = structure.alkoxy ? `${ALKOXY_ELEMENT}:` : '';
  if (structure.retained) {
    return `${ether}R:${structure.retained}`;
  }
  if (!structure.chain || !structure.freeValence) {
    return '';
  }
  const nested = (structure.prefixes || []).flatMap((group) => group.locants.map(() => structureShape(group.substituent)));
  return `${ether}${chainShape(structure.chain.length, structure.freeValence.locant, structure.freeValence.order, nested)}`;
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
 * null; file header «Alcohols»): a principal group other than the OH, an
 * aldehyde's or a ketone's C=O, an acid's –COOH or an ester's –COO–, which
 * the messages would misname (a later family's, until its phase adds its
 * messages: an amide's…), a student's suffix other than `ol` beside the
 * engine's OH (never: a C=O suffix makes the C=O principal), or, for a
 * molecule without a principal group, an engine's chain parent in a molecule
 * with a ring (never: such a ring is always the parent, design.md §13.5).
 * The aldehydes and ketones (R-5c3b1) run the rules, their own checks first
 * (carbonylChecks()); so do the acids (R-5d1, R-5d3: acidChecks()), the
 * esters (R-6a1, R-6a3a: esterChecks()) and the nitriles (R-6b1, R-6b3:
 * nitrileChecks()) — NAMED_GROUPS —, and the amines (R-6c1: amineChecks()).
 * An amide principal group (R-6d, a later family; since R-6c2 also an amino
 * prefix on a C=O carbon, `1-aminobutanal` → «butanamida») is outside them.
 *
 * @param {{spec: object}} name - The student's NameSpec.
 * @param {object} structure - The engine's name structure.
 * @returns {boolean} True when the diagnosis is null.
 */
function outsideRules(name, structure) {
  if ((structure.suffix && structure.suffix.kind === AMINE) || (name.spec.suffix && name.spec.suffix.kind === AMINE)) {
    return false; // R-6c1: file header «Amines» (amineChecks() first; the amine's own mistakes deliberate nulls).
  }
  if (structure.suffix && NAMED_GROUPS.includes(structure.suffix.kind)) {
    // R-5c3b1: file header «Aldehydes and ketones»; R-5d1, R-5d3: «Acids»; R-6a1, R-6a3a: «Esters»; R-6b1, R-6b3: «Nitriles»
    // (their checks first).
    return false;
  }
  if (structure.suffix) {
    return structure.suffix.kind !== ALCOHOL || Boolean(name.spec.suffix && name.spec.suffix.kind !== ALCOHOL);
  }
  return structure.parentKind === 'chain' && specRings(name.spec) > 0;
} // End of function outsideRules()

/**
 * The rule number of a draft: its own (ETHER_SIDE takes the number of the
 * rule it replaces, acrossOxygen()), else its code's.
 *
 * @param {{code: string, rule?: number}} draft - A draft.
 * @returns {number} The rule number.
 */
function ruleOf(draft) {
  return draft.rule || DIAGNOSES[draft.code].rule;
}

/**
 * The engine's functional-class name of an ether written from the student's
 * group words (R-5b2), as naming/index.js etherClassAlternative() writes it
 * (not exported there): the two words in alphabetical order without `tert-`
 * (compareClassWords()), `di` and the word once when they are the same, and
 * `éter`. Equal to the engine's alternative exactly when the student's words
 * are the engine's.
 *
 * @param {string[]} words - The two group words, a repeated group twice (`etil`, `etil`).
 * @returns {string} The name.
 */
function classNameOf(words) {
  const [a, b] = [...words].sort(compareClassWords);
  return a === b ? `${WORDS.di}${a} ${WORDS.eter}` : `${a} ${b} ${WORDS.eter}`;
}

/**
 * The order of two group words in an ether's class name (naming/index.js
 * etherClassAlternative()): alphabetical without `tert-`; on equal letters
 * the plain word first (`butil tert-butil éter`).
 *
 * @param {string} x - A group word.
 * @param {string} y - Another.
 * @returns {number} Negative when `x` goes first, positive when `y` does, 0 for the same word.
 */
function compareClassWords(x, y) {
  /**
   * A word without its italic `tert-`.
   *
   * @param {string} word - A group word.
   * @returns {string} Its letters.
   */
  const letters = (word) => (word.startsWith(WORDS.tert) ? word.slice(WORDS.tert.length) : word);
  if (letters(x) === letters(y)) {
    return x.length - y.length;
  }
  return letters(x) < letters(y) ? -1 : 1;
} // End of function compareClassWords()

/**
 * Why the first of two class-name group words goes first (CLASS_ORDER,
 * R-5b2): the first letters that differ (without `tert-`), the shorter word,
 * or — on equal letters — the plain word before the one with `tert-`.
 *
 * @param {string} first - The word that goes first.
 * @param {string} second - The other.
 * @returns {string} The phrase.
 */
function classOrderReason(first, second) {
  const [a, b] = [first, second].map((word) => (word.startsWith(WORDS.tert) ? word.slice(WORDS.tert.length) : word));
  if (a === b) {
    return DIAGNOSIS_PHRASES.plainFirst;
  }
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) {
      return DIAGNOSIS_PHRASES.why.letters(a[i], b[i]);
    }
  }
  return DIAGNOSIS_PHRASES.why.shorter;
} // End of function classOrderReason()

/**
 * The two group words of a class name as the engine writes it
 * (naming/index.js etherClassAlternative(): `etil metil éter`, or `di`, the
 * word and `éter` for two equal groups, `dietil éter`), in its order (review
 * of phase I-51b2, classNameStep()).
 *
 * @param {string} name - The engine's class name.
 * @returns {string[]} The two words (a repeated group twice).
 */
function classGroupsOf(name) {
  const words = name.split(' ').slice(0, -1);
  if (words.length === 2) {
    return words;
  }
  const word = words[0].slice(WORDS.di.length).replace(/^-/, '');
  return [word, word];
}

/**
 * The draft of an ether's functional-class name (R-5b2, file header
 * «Ethers»), in order: the engine gives the molecule no class name
 * (CLASS_NAME_NONE, the `éter` tile); the student's group words are not the
 * engine's (CLASS_GROUP_WORDS: `metil propan-2-il éter`, `(propan-1-il)…`,
 * the groups' tiles); a repeated group written twice or with `bis`
 * (CLASS_DI); the two groups out of order (CLASS_ORDER, with the `tert-`
 * hint when the student's order is right counting it). The right forms of
 * the last two are assembled from the student's tree. Every draft but
 * CLASS_NAME_NONE carries `className`, the name its message recommends and
 * its group words (classNameStep() quotes them). Null when none applies —
 * only `di-tert-butil éter`, which the engine writes `ditert-butil éter` (a
 * deliberate null, file header).
 *
 * @param {{tree: object, spec: object}} name - The student's tree and NameSpec.
 * @param {object} verdict - The `otherName` verdict (its naming and reading).
 * @returns {object|null} The draft `{code, data, className?, focus, tiles}`, or null.
 */
function classNameDraft(name, verdict) {
  const { tree } = name;
  const { tiles, items } = tree;
  const word = tree.parent.chain.tile;
  const { naming } = verdict;
  const offered = (naming.alternatives || []).find((alt) => alt.style === FUNCTIONAL_CLASS);
  if (!offered) {
    return { code: 'CLASS_NAME_NONE', data: { name: naming.name }, focus: idsOf(null), tiles: [word, word + 1] };
  }
  const groups = [items[0].range[0], items[items.length - 1].range[1]];
  const focus = occurrenceIds(verdict.prefixAtoms);
  const words = items.flatMap((item) => Array.from({ length: countOf(tiles, item) }, () => wordsOf(tree, item)));
  if (classNameOf(words) !== offered.name.normalize('NFC')) {
    return {
      code: 'CLASS_GROUP_WORDS',
      data: { name: offered.name },
      className: { name: offered.name, groups: classGroupsOf(offered.name) },
      focus,
      tiles: groups,
    };
  }
  const student = assemble(tree).text;
  if (words[0] === words[1] && (items.length > 1 || tiles[items[0].multiplier].kind === 'cmult')) {
    const fixed = [...tiles, tileById(tileId('mult', words.length))];
    const one = { ...items[0], multiplier: fixed.length - 1 };
    const right = assemble({ ...tree, tiles: fixed, items: [one] }).text;
    return {
      code: 'CLASS_DI', data: { right, student }, className: { name: right, groups: [words[0], words[0]] }, focus, tiles: groups,
    };
  }
  if (items.length > 1 && compareClassWords(words[0], words[1]) > 0) {
    // The student's order is right counting `tert-` as letters (`metil tert-butil éter`): the student seems to have counted it.
    const counted = words.some((w) => w.startsWith(WORDS.tert)) && words[0] < words[1];
    const hint = counted ? DIAGNOSIS_PHRASES.hints.italic : '';
    const right = assemble({ ...tree, items: [items[1], items[0]] }).text;
    return {
      code: 'CLASS_ORDER',
      data: { first: words[1], second: words[0], why: classOrderReason(words[1], words[0]), hint, right },
      className: { name: right, groups: [words[1], words[0]] },
      focus,
      tiles: groups,
    };
  }
  return null; // `di-tert-butil éter`: the engine writes `ditert-butil éter` (file header «Ethers»).
} // End of function classNameDraft()

/**
 * The diagnosis of an ether's functional-class name (R-5b2): classNameDraft()
 * as a Diagnosis, compared with the verdict's own naming (the class name is
 * offered beside the default style), the class-name step (CLASS_NAME_STEP,
 * which diagnosisExplanation() adds; review of phase I-51b2) with the name
 * the message recommends (`className`), no student's chain (a class name has
 * none: no stripe, no legend) and the engine's parent.
 *
 * @param {{tree: object, spec: object}} name - The student's tree and NameSpec.
 * @param {object} verdict - The `otherName` verdict.
 * @returns {Diagnosis|null} The diagnosis, or null.
 */
function classNameDiagnosis(name, verdict) {
  const draft = classNameDraft(name, verdict);
  if (!draft) {
    return null;
  }
  return {
    code: draft.code,
    rule: ruleOf(draft),
    traceRule: null,
    message: DIAGNOSIS_TEXTS[draft.code](draft.data),
    step: DIAGNOSES[draft.code].step,
    style: PREFIX_STYLES[0],
    student: idsOf(null),
    parent: idsOf(verdict.naming.parent),
    focus: idsOf(draft.focus),
    tiles: [draft.tiles[0], draft.tiles[1]],
    className: draft.className ? { name: draft.className.name, groups: [...draft.className.groups] } : null,
  };
} // End of function classNameDiagnosis()

/**
 * The diagnosis of an ether's functional-class name whose oxygen is the
 * bridge oxygen of one of the engine's suffix –COO– groups (ESTER_CLASS_NAME,
 * R-6a3b; review of phase I-51c1: `(1-oxoetil) metil éter`, `metil
 * (1-oxoetil) éter`, `(1-oxopropil) metil éter` → `etanoato de metilo`,
 * `propanoato de metilo`): the molecule is an ester, not an ether, so
 * CLASS_NAME_NONE's «-oxi» prefix would be false. As ESTER_GROUP, the message
 * says the oxygen and the C=O are one group and how the engine writes the
 * –COO– groups; the step «Reconoce el grupo funcional», which says the
 * molecule is an ester; the focus, that –COO– (its carbon, both oxygens and
 * their bonds); the tiles, the `éter` tile; no student's chain, as on any
 * class name. Null for any other class name (an ether oxygen beside an ester
 * elsewhere is the class-name rules', CLASS_NAME_NONE: its `-oxi` prefix is in
 * the engine's name).
 *
 * @param {{tree: object, spec: object}} name - The student's tree and NameSpec.
 * @param {object} verdict - The `otherName` verdict (its naming and reading: the class name's oxygen is its studentParent).
 * @returns {Diagnosis|null} The diagnosis, or null.
 */
function esterClassNameDiagnosis(name, verdict) {
  const { naming } = verdict;
  const { suffix } = naming.structure;
  const oxygen = verdict.studentParent.atoms[0];
  const site = suffix && suffix.kind === ESTER ? suffix.locants.find((s) => s.esterOxygen === oxygen) : null;
  if (!site) {
    return null;
  }
  const word = name.tree.parent.chain.tile;
  const data = { count: suffix.locants.length, ...principalEnding(naming), on: groupsOnOf(naming.structure), name: naming.name };
  return {
    code: 'ESTER_CLASS_NAME',
    rule: DIAGNOSES.ESTER_CLASS_NAME.rule,
    traceRule: null,
    message: DIAGNOSIS_TEXTS.ESTER_CLASS_NAME(data),
    step: DIAGNOSES.ESTER_CLASS_NAME.step,
    style: PREFIX_STYLES[0],
    student: idsOf(null),
    parent: idsOf(naming.parent),
    focus: {
      atoms: [site.carbon === undefined ? site.atom : site.carbon, site.attachAtom, site.esterOxygen],
      bonds: [site.bond, site.esterBond],
    },
    tiles: [word, word + 1],
  };
} // End of function esterClassNameDiagnosis()

/**
 * The style and naming a diagnosis refers to (its `style`, whose explanation
 * «Ver el paso» opens, and its `parent`): the student's prefix style compared
 * with, unless the draft names another style offered for the molecule — an
 * ester's O-bound side quoted as the engine writes it in the style of the
 * student's groups (UNGROUPED, MULTIPLIER_KIND, ALPHABETICAL_ORDER with
 * `oBound`; review of phase I-52a3b: `propanodioato de 1-metiletilo y
 * 1-metiletilo` → «bis(1-metiletilo)», the substituted style's explanation) —,
 * then the verdict's naming for the default style, else the engine's naming in
 * that style (as diagnosisNaming() names it again), the compared one should
 * that naming fail.
 *
 * @param {{style?: string}} draft - The draft kept.
 * @param {{style: string, naming: object}} compared - The style compared with and its naming.
 * @param {{molecule: object, naming: object}} verdict - The `otherName` verdict.
 * @param {(mol: object, options: object) => object} namer - The naming function.
 * @returns {{style: string, naming: object}} The style and naming.
 */
function shownNaming(draft, compared, verdict, namer) {
  if (!draft.style || draft.style === compared.style) {
    return compared;
  }
  if (draft.style === PREFIX_STYLES[0]) {
    return { style: draft.style, naming: verdict.naming };
  }
  const styled = namer(verdict.molecule, { prefixStyle: draft.style });
  return styled && styled.ok && styled.parent ? { style: draft.style, naming: styled } : compared;
} // End of function shownNaming()

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
  if (!['chain', 'ring'].includes(parentKind)) {
    return null;
  }
  if (isClassName(name.tree)) { // `éter` only: the class word `ácido` (R-5d1) starts a substitutive name.
    // `(1-oxoetil) metil éter` is an ester, not an ether (R-6a3b, ESTER_CLASS_NAME); `metil etil éter` (R-5b2, «Ethers»).
    return esterClassNameDiagnosis(name, verdict) || classNameDiagnosis(name, verdict);
  }
  if (outsideRules(name, verdict.naming.structure)) {
    return null;
  }
  const adj = adjacency(molecule);
  const drawn = branchOccurrences(name, verdict, molecule, adj);
  const { style, naming } = namingInStudentStyle(verdict.naming, molecule, drawn.all, namer);
  const offered = new Set((verdict.naming.alternatives || []).map((alt) => alt.style));
  const base = {
    tree: name.tree,
    spec: name.spec,
    naming,
    style,
    styles: PREFIX_STYLES.filter((s, i) => i === 0 || offered.has(s)),
    verdictNaming: verdict.naming,
    // An ester's O-bound side not the engine's (R-6a1): the O-bound checks name it (oBoundChecks(), R-6a3b, «Esters»).
    sideDiffers: esterSideDiffers(name, verdict.naming),
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
    if (!best || ruleOf(draft) > ruleOf(best.draft)) {
      best = { draft, reading };
    }
  } // End of the loop over the readings
  const { draft, reading } = best;
  if (isAmineNull(draft)) {
    return null; // The kindest reading's mistake is an amine's own (R-6c1, file header «Amines»): phase I-52c4.
  }
  const shown = shownNaming(draft, { style, naming }, verdict, namer);
  return {
    code: draft.code,
    rule: ruleOf(draft),
    traceRule: draft.traceRule || null,
    message: DIAGNOSIS_TEXTS[draft.code](draft.data),
    step: draft.step || DIAGNOSES[draft.code].step,
    style: shown.style,
    student: idsOf(reading.studentParent),
    parent: idsOf(shown.naming.parent),
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
 * The canvas marks of the class-name step (review of phase I-51b2): the two
 * groups bonded to the ether oxygen of a class name (the student's parent,
 * build.js etherOxygen()), each as a `substituent`, and the oxygen with its
 * two bonds as a `candidate`, as «Reconoce el éter» marks an oxygen. None
 * when that atom is not an ether oxygen (never seen).
 *
 * @param {object} molecule - The verdict's molecule.
 * @param {number|undefined} oxygen - The class name's oxygen (the verdict's studentParent).
 * @returns {{atoms: number[], bonds: number[], style: string}[]} The highlight specs.
 */
function classNameHighlight(molecule, oxygen) {
  const adj = adjacency(molecule);
  const atom = molecule.atoms.get(oxygen);
  if (!atom || atom.element !== ALKOXY_ELEMENT || adj.get(oxygen).length !== 2) {
    return [];
  }
  const sides = adj.get(oxygen).map((start) => {
    const atoms = new Set([start.atom]);
    const bonds = new Set();
    const queue = [start.atom];
    while (queue.length > 0) {
      const id = queue.shift();
      for (const n of adj.get(id)) {
        if (n.atom === oxygen) {
          continue; // The other side lies beyond the oxygen.
        }
        bonds.add(n.bond);
        if (!atoms.has(n.atom)) {
          atoms.add(n.atom);
          queue.push(n.atom);
        }
      }
    } // End of the breadth-first search of one side
    return { atoms: [...atoms], bonds: [...bonds], style: 'substituent' };
  }); // End of the map over the oxygen's two sides
  return [...sides, { atoms: [oxygen], bonds: adj.get(oxygen).map((n) => n.bond), style: 'candidate' }];
} // End of function classNameHighlight()

/**
 * The explanation step of a class-name diagnosis (CLASS_NAME_STEP, «Monta el
 * nombre con «éter»»; review of phase I-51b2): no explain() step speaks of
 * class names, and «Reconoce el éter» says an ether «nunca va al final del
 * nombre», true of the substitutive name only. For an ether the engine gives
 * a class name, how that name is formed and how it differs from the
 * substitutive name of the other steps, with the groups and the name the
 * diagnosis recommends (Diagnosis `className`); for CLASS_NAME_NONE, the
 * class name in general, which ethers get one and that this one is named only
 * with its `-oxi` prefix (CLASS_NAME_STEP_TEXTS). Marks: classNameHighlight().
 *
 * @param {{molecule: object, studentParent: {atoms: number[]}, diagnosis: Diagnosis}} verdict - The class-name verdict.
 * @param {object} naming - The naming its explanation explains (diagnosisNaming()).
 * @returns {{id: string, title: string, text: string[], highlight: object[], locants: null}} The step.
 */
function classNameStep(verdict, naming) {
  const texts = CLASS_NAME_STEP_TEXTS;
  const { className } = verdict.diagnosis;
  const text = className
    ? [texts.substitutive({ substitutive: naming.name }), texts.groups(className), texts.order, texts.di, texts.word(className)]
    : [texts.general, texts.generalForm, texts.only, texts.none({ substitutive: naming.name })];
  return {
    id: CLASS_NAME_STEP,
    title: texts.title,
    text,
    highlight: classNameHighlight(verdict.molecule, verdict.studentParent && verdict.studentParent.atoms[0]),
    locants: null,
  };
} // End of function classNameStep()

/**
 * The explanation steps a diagnosis shows (diagnosisExplanation()): the
 * naming's own steps, with the class-name step (classNameStep()) right after
 * «Reconoce el éter» for a class-name diagnosis (before the last step, «Monta
 * el nombre», should that step be missing; never seen: a class name always
 * builds an ether oxygen).
 *
 * @param {object[]} steps - The naming's explanation steps (explain()).
 * @param {{molecule: object, studentParent: {atoms: number[]}, diagnosis: Diagnosis}} verdict - The diagnosed verdict.
 * @param {object} naming - The naming the steps explain.
 * @returns {object[]} The steps to show.
 */
function diagnosisSteps(steps, verdict, naming) {
  if (!CLASS_CODES.includes(verdict.diagnosis.code) || steps.length === 0) {
    return steps;
  }
  const ether = steps.findIndex((step) => step.id === 'ether');
  const at = ether >= 0 ? ether + 1 : steps.length - 1;
  return [...steps.slice(0, at), classNameStep(verdict, naming), ...steps.slice(at)];
}

/**
 * The explanation a diagnosis opens (phase I-49b, «Ver el paso»): the
 * naming it compared with (diagnosisNaming()), that naming's explanation
 * steps — with the class-name step for a class-name diagnosis
 * (diagnosisSteps(), review of phase I-51b2) — and the index of the
 * diagnosis's step among them (diagnosisStepIndex()). The stepper must show
 * these steps — not those of the verdict's own naming, which in another
 * prefix style may number the chain as the student did and so contradict a
 * NUMBERING diagnosis (`6-metil-4-(propan-2-il)nonano`). The explanation is
 * injected (src/explain/explain.js explain()): src/reverse never imports it.
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
  const steps = diagnosisSteps(explainSteps(naming), verdict, naming);
  return { naming, steps, index: diagnosisStepIndex(steps, verdict.diagnosis) };
}
