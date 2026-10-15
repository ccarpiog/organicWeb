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
 * 5).
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
 * the benzene ring), for an alcohol, an aldehyde or a ketone `group`,
 * `ringChain` or `groupChain`, and for an ether `ether`, R-5b2 — or, for an
 * ether's class name, CLASS_NAME_STEP, the step diagnosisExplanation() adds to them);
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
 * its phase adds its messages — an acid, which an OH on an aldehyde's carbon
 * makes, `1-hidroxipropanal` —; the aldehydes and ketones have their own
 * codes and phrases, below). A ring branch of an alcohol's chain numbered
 * otherwise (`2-(5-metilfenil)etan-1-ol`) is BRANCH_RING_NUMBERING (phase
 * R-5c3b2, «Aldehydes and ketones» below).
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
 * isopropyl group); and a class name whose oxygen is an ester's
 * (`(1-oxoetil) metil éter`, the engine's `etanoato de metilo`: the molecule
 * is no ether, and CLASS_NAME_NONE's «-oxi» prefix would be false; review of
 * phase I-51c1 — the ester messages are R-6a's).
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
 * in it; a benzene ring in a branch written with `ciclo` and numbered as the
 * engine numbers it (`(2-metilciclohexa-1,3,5-trien-1-il)`,
 * `(ciclohexa-1,3,5-trienocarbonil)`: the parent's BENZENE_RING has no branch
 * form); and an `otherName` whose principal group is a later family's (an
 * acid, which an OH on a –CHO's carbon makes: R-5d, outsideRules()).
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
import { locantText } from '../naming/structure.js';
import { PREFIX_STYLES, nameSubstituent, suffixSites } from '../naming/substituent.js';
import { seniorityRank } from '../naming/seniority.js';
import { adjacency, rootedBranchKey } from '../model/graph.js';
import {
  stem, multiplier, compoundMultiplier, ENDINGS, ENCLOSING_MARKS, RETAINED_PREFIXES, FREE_VALENCE_SUFFIXES, omitsLocants,
  chainOmitsPrefixLocants, ringOmitsLocants, BENZENE_NAME, RING_PREFIX, POSITIONAL_LETTERS, TRADITIONAL_NAMES, SATURATED_INFIX,
  ALKOXY_ENDING, ETHER_CLASS_WORD, GROUP_PREFIXES, groupSuffix, ringGroupSuffix, ACYL_ENDING, RING_CARBONYL_ENDING,
} from '../naming/lexicon.es.js';
import { assemble, itemText, isAlkoxyNode, isCompoundAlkoxy, alkoxyCore } from './assemble.js';
import { ownPrefixAtoms, specRings, isRing, isAromatic } from './build.js';
import {
  tileById, tileId, MAX_MULT, isAtomGroup, atomGroupOrder, HYDROXY_ELEMENT, HYDROXY_ID, OL_ID, PHENOL_ID, ALKOXY_ELEMENT,
  FORMYL_ID, ACETYL_ID, OXO_ID, OXO_ELEMENT, AL_ID, ONA_ID, CARBALDEHYDE_ID, BENZALDEHYDE_ID, BENZOYL_ID, RING_CARBONYL_ID,
  templateAdmits, isChainTemplate,
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

/** The SubstituentSpec kind of an `oxo` prefix (tiles.js; R-5c1). */
const OXO_KIND = tileById(OXO_ID).kind;

/** The element of a carbon atom (model/elements.js; build.js keeps the same constant). */
const CARBON = 'C';

/** The principal group of an ester (a lexicon GROUP_SUFFIXES key): no ether class name fits it (classNameDiagnosis()). */
const ESTER = 'ester';

/**
 * The null of a check that finds a case no message covers (file header
 * «Aldehydes and ketones»: a student's carbonyl suffix of another kind than
 * the engine's that no C=O check names, never seen): a draft that stops the
 * diagnosis — firstRule() answers null for the reading, never a later rule.
 */
const BEYOND = Object.freeze({ code: null });

/** The `formil` tile's value (a retained word, R-5c1). */
const FORMYL = tileById(FORMYL_ID).value;

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
  // Aldehydes and ketones (R-5c3b1, file header «Aldehydes and ketones»): the principal C=O group's own mistakes.
  CARBONYL_SENIORITY: (d) => `Cuando hay grupos distintos, solo uno es el grupo principal, y se elige por este orden: `
    + `${DIAGNOSIS_PHRASES.seniority}. Aquí manda ${DIAGNOSIS_PHRASES.principal[d.group]}, que se nombra `
    + `${DIAGNOSIS_PHRASES.ending(d)}; ${DIAGNOSIS_PHRASES.junior[d.junior][d.count === 1 ? 0 : 1]} va delante, `
    + `${d.prefix ? `con el prefijo «${d.prefix}»` : 'en los prefijos'}. Se escribe «${d.name}».`,
  KETONE_NOT_ALDEHYDE: (d) => 'El grupo –CHO de un aldehído va en un extremo de la cadena: su carbono solo puede unirse a un '
    + `carbono más. Aquí ${d.branch ? `la rama «${d.branch}» está en el carbono ${d.locant}, que así queda unido`
      : `el carbono ${d.locant} está unido`} a dos carbonos: su C=O es el de una cetona, no el de un aldehído. `
    + `Se escribe «${d.name}».`,
  ALDEHYDE_CARBON: (d) => (d.ring
    ? 'Cuando el grupo –CHO está unido a un anillo, su carbono no forma parte del anillo ni es una cadena aparte: la cadena '
      + `principal es el anillo, y el grupo se nombra ${DIAGNOSIS_PHRASES.ending(d)}. Se escribe «${d.name}».`
    : `La terminación «-${WORDS.carbaldehido}» solo se usa cuando el grupo –CHO está unido a un anillo. En una cadena, el `
      + 'carbono del –CHO es un carbono más de la cadena principal, siempre en un extremo, y el grupo se nombra '
      + `${DIAGNOSIS_PHRASES.ending(d)}. Se escribe «${d.name}».`),
  CARBONYL_PREFIX: (d) => {
    const words = DIAGNOSIS_PHRASES.groupWords[d.group];
    const how = `${d.acyl ? 'dentro del' : 'con el'} prefijo «${d.prefix}»`;
    const joins = d.joins ? ` Su carbono entra en la cadena principal${d.ringBranch ? ', y el anillo pasa a ser una rama' : ''}.` : '';
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
  PHENOL: (d) => `Un benceno con un solo grupo –OH tiene nombre propio: «${WORDS.fenol}», no «${WORDS.bencenol}».`
    + `${d.name === WORDS.fenol ? '' : ` Se escribe «${d.name}».`}`,
  MORE_MULTIPLE_BONDS: (d) => `Hay otra cadena igual de larga con más enlaces dobles o triples (${d.app}; la tuya tiene `
    + `${d.student}). Entre cadenas igual de largas, gana la que tiene más.`,
  MORE_DOUBLE_BONDS: (d) => `Hay otra cadena igual de larga, con los mismos enlaces múltiples, pero con más enlaces dobles `
    + `(${d.app}; la tuya tiene ${d.student}). En ese empate gana la que tiene más enlaces dobles.`,
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
  BRANCH_RING_NUMBERING: (d) => 'Un anillo que va en una rama se numera empezando por el carbono por el que se une, que es el 1'
    + `${d.reason ? `, y siguiendo en el sentido que ${DIAGNOSIS_PHRASES.branchRingReasons[d.reason]}` : ''}: «${d.right}», `
    + `no «${d.student}».${d.unwritten ? ` En «${d.right}» ese 1 ni siquiera se escribe.` : ''}`
    + `${d.benzene ? ' Ese anillo es un benceno: sus enlaces dobles no cuentan para numerar.' : ''}`,
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
    if (d.traditional) {
      // R-5c3b2: a locant on a traditional name the engine writes without any (`2-fenilacetaldehído`).
      return `El nombre tradicional «${d.name}» se escribe sin números: «${d.name}», no «${d.student}».`;
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
    : `Faltan números: hay que decir en qué carbono va cada rama y cada enlace doble o triple, como en «${d.name}».`),
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
   * N0 for an aldehyde or a ketone (R-5c3b1), by principal group: why the other numbering is right (NUMBERING,
   * RING_NUMBERING) and what another chain numbers lower (CHAIN_LOCANTS), as `numberingReasons.N0` and `lowerLocantsOf.N0`
   * say it of the OH groups and the explanation's numbering step of the C=O groups.
   */
  carbonylN0: Object.freeze({
    numberingReasons: Object.freeze({
      aldehyde: 'los grupos –CHO (el grupo principal) tienen que llevar los números más bajos',
      ketone: 'los grupos C=O (el grupo principal) tienen que llevar los números más bajos',
    }),
    lowerLocantsOf: Object.freeze({ aldehyde: 'los grupos –CHO', ketone: 'los grupos C=O' }),
  }),
  /**
   * How the messages call one or several principal groups, by group (R-5c3b1; the explanation's SUFFIX_GROUP_WORDS): the
   * C=O of a ketone «grupo C=O», an aldehyde's «grupo –CHO», as the explanation's group step says them.
   */
  groupWords: Object.freeze({
    alcohol: Object.freeze({ one: 'grupo –OH', many: 'grupos –OH' }),
    aldehyde: Object.freeze({ one: 'grupo –CHO', many: 'grupos –CHO' }),
    ketone: Object.freeze({ one: 'grupo C=O', many: 'grupos C=O' }),
  }),
  /** The seniority of the principal groups the tiles write (CARBONYL_SENIORITY, R-5c3b1; design.md §13.4 I-32). */
  seniority: 'aldehído > cetona > alcohol',
  /** The principal group that wins, by group (CARBONYL_SENIORITY). */
  principal: Object.freeze({ aldehyde: 'el aldehído (–CHO)', ketone: 'la cetona (C=O)' }),
  /** The student's junior group, written as the suffix, one or several (CARBONYL_SENIORITY). */
  junior: Object.freeze({
    ketone: Object.freeze(['el C=O de la cetona', 'cada C=O de cetona']),
    alcohol: Object.freeze(['el –OH', 'cada –OH']),
  }),
  /** Which of several principal groups the suffix cites together (CARBONYL_PREFIX), by where they are. */
  groupsOn: Object.freeze({
    chain: 'los de la cadena principal',
    ring: 'los del anillo',
    outside: 'los unidos al anillo',
  }),
  /**
   * How the engine's principal C=O group is written (R-5c3b1): its suffix at the end of the name (`-al`, `-diona`,
   * `-carbaldehído`), or, for benzene with one –CHO, the name `benzaldehído`.
   *
   * @param {{ending: string, benzaldehyde: boolean}} d - The suffix's words (suffixWordOf()) and the benzaldehído case.
   * @returns {string} The phrase.
   */
  ending: (d) => (d.benzaldehyde ? `con «${WORDS.benzaldehido}» (el benceno con un grupo –CHO)`
    : `con la terminación «-${d.ending}», al final del nombre`),
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
   *   or a ketone's C=O groups (R-5c3b1: CARBONYL_PARENT, MORE_CARBONYL_GROUPS, CHAIN_LOCANTS at N0).
   * @returns {string} The phrase.
   */
  etherSide: (d) => {
    const words = DIAGNOSIS_PHRASES.groupWords[CARBONYLS.includes(d.group) ? d.group : ALCOHOL];
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
 * ring rules of R-4, the alcohol rules of R-5a and the aldehyde and ketone
 * rules of R-5c3b1 beside the rules whose place they take, the branch-name
 * rules of R-5c3b2 before ALPHABETICAL_ORDER, file header): its
 * rule number (1–11), the
 * explanation step it points at (an explain() step id, design.md §5; a draft
 * may give its own case's step, `benzene` for RING_IS_PARENT on the benzene
 * ring; the class names CLASS_NAME_STEP, which diagnosisExplanation() adds)
 * and example data for its message (R-7 lists the drafts with it).
 * Frozen; later families add their codes.
 */
export const DIAGNOSES = Object.freeze({
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
  // A branch's own name (R-5c3b2): after the parent's rules 1–4, before ALPHABETICAL_ORDER, which reads the branches' words.
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
    rule: 9, step: 'numbering', example: Object.freeze({ branch: false, name: `2-${WORDS.metil}${stem(5)}${ENDINGS.saturated}` }),
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
 * as HYDROXY_PARENT; `benzaldehído` has no numbering step); a branch-name
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
 *   R-5b2), or null for HYDROXY_PREFIX, the C=O checks CARBONYL_SENIORITY, KETONE_NOT_ALDEHYDE, ALDEHYDE_CARBON and
 *   CARBONYL_PREFIX (R-5c3b1), BENZENE_RING, SUBSTITUTED_TEMPLATE, PHENOL, the class-name codes and rules 5–11.
 * @property {string} message - The Spanish message (DIAGNOSIS_TEXTS).
 * @property {string} step - The `id` of the explain() step that explains the rule, a step of the explanation of the naming
 *   in `style` (diagnosisExplanation() builds it and finds the step; diagnosisStepIndex()); for a class name,
 *   CLASS_NAME_STEP, the step diagnosisExplanation() adds.
 * @property {{name: string, groups: string[]}|null} [className] - Only on a class-name diagnosis (R-5b2): the class name
 *   its message recommends and its two group words in that order (a repeated group twice), or null for CLASS_NAME_NONE;
 *   the class-name step quotes them (classNameStep()).
 * @property {string} style - The prefix style compared with (substituent.js PREFIX_STYLES; the student's own), the
 *   explanation context: the trace, `parent` and `step` belong to nameMolecule(molecule, {prefixStyle: style})
 *   (diagnosisNaming(); the verdict's own naming for the default style).
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
 * C=O groups' phrase, else DIAGNOSIS_PHRASES.numberingReasons (N0: the OH
 * groups).
 *
 * @param {{rule: string, group?: string}} d - The diagnosis data.
 * @returns {string} The phrase.
 */
function numberingReason(d) {
  return d.rule === 'N0' && CARBONYLS.includes(d.group) ? DIAGNOSIS_PHRASES.carbonylN0.numberingReasons[d.group]
    : DIAGNOSIS_PHRASES.numberingReasons[d.rule];
}

/**
 * What another chain numbers lower (CHAIN_LOCANTS, and ETHER_SIDE told from
 * it), by trace rule: at N0 for an aldehyde or a ketone (R-5c3b1) the C=O
 * groups, else DIAGNOSIS_PHRASES.lowerLocantsOf (N0: the OH groups).
 *
 * @param {{rule: string, group?: string}} d - The diagnosis data.
 * @returns {string} The phrase.
 */
function lowerLocants(d) {
  return d.rule === 'N0' && CARBONYLS.includes(d.group) ? DIAGNOSIS_PHRASES.carbonylN0.lowerLocantsOf[d.group]
    : DIAGNOSIS_PHRASES.lowerLocantsOf[d.rule];
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
 * ether oxygen between the chain and its branch).
 *
 * @param {object} sub - A SubstituentSpec (interpret.js).
 * @returns {boolean} True for a halogen, `hidroxi` or an alkoxy prefix.
 */
function isHeteroGroup(sub) {
  return isHalogen(sub) || Boolean(sub.alkoxy);
}

/**
 * Tells whether some prefixes hold a one-atom group (a halogen, R-5a1;
 * `hidroxi`, R-5a2) or an alkoxy prefix (R-5b), at any depth: the messages
 * then speak of «sustituyentes», not «ramas»; so do they beside an acyl
 * prefix (R-5c2: `acetil`, `propanoil`, `benzoil`…; `formil`, R-5c1), whose
 * C=O is an `oxo` substituent of any chain through its carbon
 * (`4-acetilhexanal` → `4-etil-5-oxohexanal`: two substituents).
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
    const occurrence = { sub, ...join, atoms };
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
 * groups — an aldehyde's or a ketone's C=O groups at P0 are MORE_CARBONYL_GROUPS, chainDropped()).
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
 * carbon skeleton (`1-metoxi-1-metilpropano` blames `metil`).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null when no carbon branch sits on an end (never for a chain missing from P1).
 */
function branchAtEnd(ctx) {
  const { reading, tree, naming, spec } = ctx;
  const n = reading.studentParent.atoms.length;
  const end = reading.prefixAtoms
    .find((o) => (o.locant === 1 || o.locant === n) && !isHeteroGroup(spec.prefixes[o.prefix].substituent));
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
 * more OH groups) and its N0 rule 3 (CHAIN_LOCANTS: lower locants for them);
 * an aldehyde's or a ketone's (R-5c3b1) are MORE_CARBONYL_GROUPS and
 * CHAIN_LOCANTS with the C=O groups' words (the data's `group`).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {object} step - The trace step that dropped the chain.
 * @param {(candidate: object) => boolean} sameChain - Tells the student's chain's candidates.
 * @returns {object|null} The draft, or null for a rule this phase does not know (later families).
 */
function chainDropped(ctx, step, sameChain) {
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
 * ketone's C=O groups (R-5c3b1) choose the chain the same way:
 * MORE_CARBONYL_GROUPS, with the group's words.
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
 * (file header «Aldehydes and ketones», R-5c3b1): the group whose words the
 * P0 and N0 messages and the C=O checks use; null for an alcohol's OH (the
 * messages of R-5a3b) or no principal group.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {string|null} 'aldehyde', 'ketone' or null.
 */
function carbonylGroup(ctx) {
  const { suffix } = ctx.naming.structure;
  return suffix && CARBONYLS.includes(suffix.kind) ? suffix.kind : null;
}

/**
 * The draft of a numbering mistake (rule 4: NUMBERING on a chain,
 * RING_NUMBERING on a ring): the trace step that dropped the student's
 * numbering while its chain or ring stayed, the first difference between
 * the survivors' value and the student's, and whether the engine's name
 * writes no locant at all (`propeno`, `metilciclohexano`); for an aldehyde or
 * a ketone (R-5c3b1) the principal group, whose words N0 uses
 * (`pentan-4-ona`, `ciclohexan-3-ona`).
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
 * (HYDROXY_PARENT) or with an aldehyde's or a ketone's C=O groups
 * (CARBONYL_PARENT, the data's `group` naming them). The engine's parent is
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
 * instead (benzene with one –CHO: `4-metilbenzaldehído`).
 *
 * @param {object} naming - The naming compared with, its suffix an aldehyde's or a ketone's.
 * @returns {{ending: string, benzaldehyde: boolean}} The words.
 */
function principalEnding(naming) {
  const { suffix } = naming.structure;
  const benzaldehyde = benzeneParent(naming) && suffix.kind === ALDEHYDE && Boolean(suffix.outside) && suffix.locants.length === 1;
  return { ending: suffixWordOf(suffix), benzaldehyde };
}

/**
 * The atoms and bonds of some suffix groups of the student's (build.js
 * `suffixAtoms` of the reading): each group's carbon — the –CHO's own carbon
 * of `carbaldehído`, else the parent carbon that carries it — and its oxygen,
 * with the bonds between them.
 *
 * @param {object[]} groups - The reading's suffixAtoms entries.
 * @returns {{atoms: number[], bonds: number[]}} The ids.
 */
function suffixFocus(groups) {
  return {
    atoms: groups.flatMap((g) => [g.carbon === undefined ? g.parentAtom : g.carbon, g.attachment]),
    bonds: groups.flatMap((g) => [g.bond]),
  };
}

/**
 * CARBONYL_SENIORITY (R-5c3b1, file header «Aldehydes and ketones»): the
 * student's suffix is a group junior to the engine's principal one
 * (naming/seniority.js seniorityRank(): `ona` beside an aldehyde,
 * `5-oxopentan-2-ona` → `4-oxopentanal`; `ol` beside a ketone,
 * `4-oxopentan-2-ol` → `4-hidroxipentan-2-ona`; `fenol` beside a –CHO). The
 * student's groups become prefixes of the engine's name: `oxo` or `hidroxi`
 * (lexicon GROUP_PREFIXES) when every one of their carbons is a carbon of
 * the engine's parent, else part of another prefix (`prefix` null: the
 * ketone's carbon in an `acetil` branch). The focus is the student's suffix
 * groups; the tiles, the suffix's.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function carbonylSeniority(ctx) {
  const { naming, spec, reading } = ctx;
  const mine = spec.suffix;
  const engine = naming.structure.suffix;
  if (!mine || seniorityRank(mine.kind) <= seniorityRank(engine.kind)) {
    return null;
  }
  const groups = reading.suffixAtoms || [];
  const parent = new Set(naming.parent.atoms);
  const onParent = groups.length > 0 && groups.every((g) => parent.has(g.parentAtom));
  return {
    code: 'CARBONYL_SENIORITY',
    data: {
      group: engine.kind,
      ...principalEnding(naming),
      junior: mine.kind,
      count: mine.slots.length,
      prefix: onParent ? GROUP_PREFIXES[mine.kind] : null,
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
 * ALDEHYDE_CARBON (R-5c3b1): the –CHO's carbon on the other side of the
 * parent — `carbaldehído` after a chain, whose –CHO carbon is a chain carbon
 * (`butano-1-carbaldehído` → `pentanal`), or the –CHO's carbon taken into
 * the student's chain beside a ring, which carries it as `carbaldehído`
 * (`ciclohexilformaldehído`, `ciclohexilmetanal` →
 * `ciclohexanocarbaldehído`; `fenilformaldehído` → `benzaldehído`). Only
 * when the student's –CHO groups are the engine's own (every –CHO carbon of
 * the student's suffix one of the engine's suffix –CHO carbons; review of
 * phase I-51c3b1): with other groups the parent choice is the mistake
 * (`2-(4-formilciclohexil)etanal`, whose `al` ends a side chain while the
 * engine's `carbaldehído` is the ring's: CARBONYL_PARENT). The focus is the
 * student's –CHO groups; the tiles, the suffix's.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function aldehydeCarbon(ctx) {
  const { spec, naming, reading } = ctx;
  const mine = spec.suffix;
  const engine = naming.structure.suffix;
  if (!mine || mine.kind !== ALDEHYDE || engine.kind !== ALDEHYDE || Boolean(mine.outside) === Boolean(engine.outside)) {
    return null;
  }
  const groups = reading.suffixAtoms || [];
  const engineCarbons = new Set(aldehydeCarbons(engine.locants, 'atom'));
  if (groups.length === 0 || !aldehydeCarbons(groups, 'parentAtom').every((id) => engineCarbons.has(id))) {
    return null; // Other –CHO groups than the engine's: the parent choice or the chain rules speak.
  }
  return {
    code: 'ALDEHYDE_CARBON',
    data: { ring: Boolean(engine.outside), ...principalEnding(naming), name: naming.name },
    focus: suffixFocus(reading.suffixAtoms || []),
    tiles: [mine.tiles[0], mine.tiles[1]],
  };
} // End of function aldehydeCarbon()

/**
 * The oxygen of a parent-level prefix's own C=O (R-5c3b1): an `oxo`'s one
 * atom, or the oxygen double-bonded to the carbon by which a `formil` or an
 * acyl prefix (`acetil`, `propanoil`, `benzoil`, `…carbonil`) is bonded;
 * null for any other prefix (a C=O deeper inside a compound branch is not
 * its own).
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
  if (!sub.acyl && sub.retained !== FORMYL) {
    return null;
  }
  const link = ctx.adj.get(occurrence.attachment)
    .find((n) => n.order === 2 && ctx.molecule.atoms.get(n.atom).element === OXO_ELEMENT);
  return link ? link.atom : null;
} // End of function ownCarbonylOxygen()

/**
 * CARBONYL_PREFIX (R-5c3b1), HYDROXY_PREFIX's analogue: a C=O the engine
 * cites in the suffix, written by the student as a parent-level prefix whose
 * own C=O it is (ownCarbonylOxygen(): `2-oxopropano`, `formilciclohexano`,
 * `5-oxopentanal` → `pentanodial`, `oxoacetaldehído` → `etanodial`; an acyl
 * prefix, `acetilbenceno` → `1-feniletan-1-ona`), while the student's
 * suffix cites fewer groups than the engine's (or none): with as many, the
 * student did write the principal groups in the suffix, and the acyl
 * prefix's carbon belongs to a chain the chain rules compare
 * (`4-propanoilheptano-2,6-diona` → CHAIN_LOCANTS at N0). A `formil` or acyl
 * prefix's carbon then joins the engine's parent chain (`joins`, unless the
 * –CHO is a ring's `carbaldehído`), and a student's ring parent becomes a
 * branch (`ringBranch`). The focus is those prefixes; the tiles, the first
 * one's.
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
  const oxygens = new Set(suffix.locants.map((site) => site.attachAtom));
  const written = reading.prefixAtoms.filter((o) => oxygens.has(ownCarbonylOxygen(ctx, o)));
  if (written.length === 0) {
    return null;
  }
  const sub = spec.prefixes[written[0].prefix].substituent;
  const count = suffix.locants.length;
  let on = 'chain';
  if (parentKind === 'ring') {
    on = suffix.outside ? 'outside' : 'ring';
  }
  return {
    code: 'CARBONYL_PREFIX',
    data: {
      group: suffix.kind,
      count,
      ...principalEnding(naming),
      prefix: wordsOf(tree, tree.items[written[0].prefix]),
      acyl: Boolean(sub.acyl),
      joins: Boolean(sub.acyl || sub.retained === FORMYL) && !suffix.outside,
      ringBranch: isRing(spec.parent.kind) && parentKind !== 'ring',
      on,
      name: naming.name,
    },
    focus: occurrenceIds(written),
    tiles: written[0].tiles || spec.parent.tiles,
  };
} // End of function carbonylPrefix()

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
 * @returns {object|null} The draft, BEYOND, or null (no C=O check applies, or the principal group is no C=O).
 */
function carbonylChecks(ctx) {
  if (!carbonylGroup(ctx)) {
    return null;
  }
  const draft = carbonylSeniority(ctx) || ketoneNotAldehyde(ctx) || aldehydeCarbon(ctx) || carbonylPrefix(ctx);
  if (draft) {
    return draft;
  }
  const mine = ctx.spec.suffix;
  return mine && mine.kind !== ctx.naming.structure.suffix.kind ? BEYOND : null;
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
 * `formaldehído`, `acetaldehído`, `acetofenona`, `fenilacetaldehído`) with
 * prefixes of the student's that the engine never writes on it
 * (tiles.js templateAdmits(): only `acetaldehído` with one phenyl,
 * `2-(4-metilfenil)acetaldehído`): the molecule has its systematic name
 * (`1-cloroacetona` → «1-cloropropan-2-ona»), whatever its parent; the
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
 * numbers it, whether it is an acyl group.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {BranchOccurrence} occurrence - The branch on the molecule.
 * @returns {object|null} The SubstituentStructure, or null.
 */
function engineBranch(ctx, occurrence) {
  return nameSubstituent(ctx.molecule, occurrence.parentAtom, occurrence.attachment, ctx.style);
}

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
 * ACYL_NAME (R-5c3b2): an acyl group — a branch bonded by the carbon of a
 * C=O of its own — written in words the engine does not use for it: the
 * acyl groups with a name of their own written by the general rule,
 * `etanoil` for `acetil` and `metanoil` for `formil` (`word`, the name, and
 * `written`, the student's), or the C=O written as an `oxo` prefix of an
 * alkyl group, `(1-oxoetil)` for `acetil`, `(1-oxopropil)` for `propanoil`
 * (the engine names it as an acyl group: `ring` when its C=O is bonded to a
 * ring, `-carbonil`). Not an ether's or ester's oxygen (an alkoxy prefix).
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
  const carbonyl = molecule.atoms.get(occurrence.attachment).element === CARBON && adj.get(occurrence.attachment)
    .some((n) => n.order === 2 && molecule.atoms.get(n.atom).element === OXO_ELEMENT && occurrence.atoms.includes(n.atom));
  if (sub.alkoxy || !carbonyl) {
    return null;
  }
  const engine = engineBranch(ctx, occurrence);
  if (!engine || !engine.acyl || engine.alkoxycarbonyl || engine.carbamoyl) {
    return null; // Not named as an acyl group by the engine (never seen for a C=O carbon bonded to a chain).
  }
  if (sub.acyl && sub.kind === 'chain' && sub.length <= 2 && sub.prefixes.length === 0 && sub.double.length + sub.triple.length === 0) {
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
  return part ? { right: part.text, student: wordsOf(tree, tree.items[index]), placed } : null;
}

/** The branch-name checks (R-5c3b2), in order, each with its code (branchNames()). */
const BRANCH_NAME_CHECKS = Object.freeze([['ACYL_NAME', acylName], ['ACYL_CHAIN', acylChain],
  ['BRANCH_RING_NUMBERING', branchRingNumbering]]);

/**
 * The branch-name rules (R-5c3b2, file header «Aldehydes and ketones»),
 * after the parent's rules 1–4 and before rule 5, ALPHABETICAL_ORDER, which
 * reads the branches' words: a parent-level prefix whose words are not the
 * engine's for the same atoms (the naming's `prefix` part that holds them,
 * on the same parent), then, from that prefix inward, the first of its
 * branches whose own name is not the engine's — an acyl group's word
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
      if (compound && !ownBranches) {
        // `di(pentiloxi)`, `di-tert-butoxi` (R-5b2): bis… for the alkoxy prefix's form (assemble.js isCompoundAlkoxy()).
        const core = alkoxyCore(item.substituent);
        return {
          code: 'ALKOXY_MULTIPLIER',
          data: { tertButoxy: core.type === 'retained', prefix: wordsOf(tree, item), ...texts },
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
 * `ciclohexan-1-ona`, `propan-2-ona`, `ciclohexano-1-carbaldehído`).
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
 * 2). The message quotes that name; its step is «Monta el nombre», which
 * lists it among the other valid forms.
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
 * (R-5c3b1).
 *
 * @param {string} kind - The engine's suffix kind ('alcohol', 'aldehyde', 'ketone').
 * @param {number} count - How many groups it cites.
 * @returns {string} The phrase.
 */
function suffixWhat(kind, count) {
  const { what } = DIAGNOSIS_PHRASES;
  const [one, many] = {
    [ALDEHYDE]: [what.aldehyde, what.aldehydes],
    [KETONE]: [what.ketone, what.ketones],
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
    return carbonylLocant(ctx);
  }
  return {
    code: 'MISSING_LOCANTS', data: { branch: false, name: naming.name }, focus: idsOf(null), tiles: [missing.tiles[0], missing.tiles[1]],
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
  return part ? part.text : null;
}

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
const FORM_RULES = Object.freeze([branchNames, alphabeticalOrder, ungrouped, multiplierKind, locantOrder, needlessLocants,
  missingLocants, segmentOrder, oldStyle, letterLocants]);

/**
 * The first rule that applies to one reading of the name: an alcohol's OH
 * written `hidroxi` on the parent (hydroxyPrefix(), file header «Alcohols»),
 * the principal C=O group's own checks (carbonylChecks(), «Aldehydes and
 * ketones»), then the parent's kind decided by the principal groups (ring or
 * chain: principalParent()), the parent's rules (chainRules(), rules 1–4;
 * ringRules() when the engine's parent is the ring) — a parent choice told
 * from the ether oxygen when the student's chain is on its other side
 * (acrossOxygen(), R-5b2) —, then the form rules.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft `{code, rule?, traceRule?, data, focus, tiles, step?}`, or null.
 */
function firstRule(ctx) {
  const principal = hydroxyPrefix(ctx) || carbonylChecks(ctx) || principalParent(ctx);
  if (principal === BEYOND) {
    return null; // A student's carbonyl suffix no C=O check names (never seen; file header «Aldehydes and ketones»).
  }
  if (principal) {
    return acrossOxygen(ctx, principal); // The ring or chain on the other side of an ether oxygen (R-5b2).
  }
  const parent = substitutedChainTemplate(ctx) || (ctx.naming.structure.parentKind === 'ring' ? ringRules(ctx) : chainRules(ctx));
  if (parent) {
    return acrossOxygen(ctx, parent); // `etoximetano` (R-5b2).
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
 * of its chain; an alkoxy prefix (R-5b) is its branch's shape after `O:`
 * (`isopropoxi` is `O:R:isopropyl`, `(propan-2-iloxi)` `O:C3:2:1()`); `oxo`
 * (R-5c1) is `X:=O`, and `formil` the shape the engine gives its formyl
 * group, a one-carbon chain with an oxo (`C1:1:1(X:=O)`); an acyl prefix
 * (R-5c2) the engine's acyl group's, its chain with the oxo on its carbon 1
 * (`acetil` `C2:1:1(X:=O)`, `propanoil` `C3:1:1(X:=O)`), or for a ring's
 * (`(ciclohexanocarbonil)`, `benzoil`) the one-carbon chain of the C=O carbon
 * with its oxo and the ring.
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
  if (sub.kind === 'retained' && sub.retained === FORMYL) {
    return chainShape(1, 1, 1, [`X:${DOUBLE_OXYGEN}`]); // `formil` (R-5c1): the engine's one-carbon acyl group with its oxo.
  }
  if (sub.kind === 'retained' && sub.retained === ACETYL) {
    return chainShape(2, 1, 1, [`X:${DOUBLE_OXYGEN}`]); // `acetil` (R-5c2): the engine's two-carbon acyl group with its oxo.
  }
  if (sub.kind === 'retained') {
    return `${ether}R:${sub.retained}`;
  }
  if (sub.acyl && isRing(sub.kind)) {
    // `(ciclohexanocarbonil)`, `benzoil` (R-5c2): the engine's one-carbon acyl group, its oxo and the ring on it.
    return chainShape(1, 1, 1, [`X:${DOUBLE_OXYGEN}`, specShape({ ...sub, acyl: false })]);
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
 * null; file header «Alcohols»): a principal group other than the OH or an
 * aldehyde's or a ketone's C=O, which the messages would misname (a later
 * family's, until its phase adds its messages: an acid, which
 * `1-hidroxipropanal` builds), a student's suffix other than `ol` beside the
 * engine's OH (never: a C=O suffix makes the C=O principal), or, for a
 * molecule without a principal group, an engine's chain parent in a molecule
 * with a ring (never: such a ring is always the parent, design.md §13.5).
 * The aldehydes and ketones (R-5c3b1) run the rules, their own checks first
 * (carbonylChecks()).
 *
 * @param {{spec: object}} name - The student's NameSpec.
 * @param {object} structure - The engine's name structure.
 * @returns {boolean} True when the diagnosis is null.
 */
function outsideRules(name, structure) {
  if (structure.suffix && CARBONYLS.includes(structure.suffix.kind)) {
    return false; // R-5c3b1: file header «Aldehydes and ketones».
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
  if (name.spec.classWord) {
    if (verdict.naming.structure.suffix && verdict.naming.structure.suffix.kind === ESTER) {
      return null; // `(1-oxoetil) metil éter` is an ester, not an ether (file header «Ethers»; review of phase I-51c1).
    }
    return classNameDiagnosis(name, verdict); // `metil etil éter` (R-5b2, file header «Ethers»)
  }
  if (outsideRules(name, verdict.naming.structure)) {
    return null;
  }
  const adj = adjacency(molecule);
  const drawn = branchOccurrences(name, verdict, molecule, adj);
  const { style, naming } = namingInStudentStyle(verdict.naming, molecule, drawn.all, namer);
  const base = {
    tree: name.tree,
    spec: name.spec,
    naming,
    style,
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
  return {
    code: draft.code,
    rule: ruleOf(draft),
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
