/**
 * @file Parser of «¿Cómo se dibuja?» (design.md §15.4, §15.5.1, §15.6;
 * phases R-1a, R-4a, R-4b, R-4c, R-5a1, R-5a2, R-5a3a, R-5b, R-5b2, R-5c1, R-5c2, R-5c3a, R-5d1, R-5d2, R-6a1, R-6a2a, R-6a2b, R-6b1, R-6b2, R-6c1, R-6c2): recursive descent over a tile sequence
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
 * templates from R-5c3a, the carboxylic acids — the class word `ácido`, the
 * suffixes `oico` and `carboxílico`, `benzoico`, the prefix `carboxi` — from
 * R-5d1, the retained acid templates from R-5d2, the esters — the suffixes
 * `oato` and `carboxilato`, `benzoato`, the O-bound side with the ending
 * `ilo` — from R-6a1, the retained ester templates from R-6a2a, the ester
 * prefixes — `oxi` after an acyl branch, `carbonil` after `oxi` — from
 * R-6a2b, the nitriles — the suffixes `nitrilo` and `carbonitrilo`,
 * `benzonitrilo`, the prefix `ciano` — from R-6b1, the retained nitrile
 * templates from R-6b2, the amines — the suffix `amina` and the locant `N`
 * — from R-6c1, the prefix `amino` and the groups on its nitrogen from
 * R-6c2):
 *
 *   name        = [ ácido ] , { prefix } , parent   (* R-5d1: `ácido` with an acid suffix only *)
 *               , [ esterSide ]                   (* R-6a1: after an ester suffix only; R-6a2a: or an ester template *)
 *               | { classGroup } , éter ;   (* R-5b2: exactly two groups *)
 *   esterSide   = esterGroup , { esterGroup } ;   (* R-6a1: one group per –COO–, multipliers counted *)
 *   esterGroup  = { prefix } , oBound
 *               | ( MULT | CMULT ) , ( oBound | START , { prefix } , oBound , END ) ;
 *   oBound      = stem , [ ano ] , [ locant ] , ilo | stem , segments , [ locant ] , ilo
 *               | ( isopropil | tert-butil | fenil ) , ilo ;
 *   classGroup  = [ MULT | CMULT ] , ( simple | START , { prefix } , simple , END ) ;
 *   prefix      = [ locants ] , [ letter ] , [ MULT | CMULT ] , substituent ;
 *   substituent = simple | group | START , { prefix } , simple , END ;
 *   group       = fluoro | cloro | bromo | yodo | hidroxi | oxo ;
 *   simple      = stem , ( il [ alkoxy ] | iliden )
 *               | stem , [ ano ] , locant , ( il [ alkoxy ] | iliden )
 *               | stem , segments , [ locant ] , ( il [ alkoxy ] | iliden )
 *               | ROOT , ( ano | segments ) , oil , [ oxi ]   (* R-5c2: propanoil; R-6a2b: (propanoiloxi) *)
 *               | ciclo , ROOT , ( ano | segments ) , [ locant ] , carbonil , [ oxi ]   (* (ciclohexanocarbonil) *)
 *               | ( isopropil | tert-butil | fenil ) , [ alkoxy ] | isopropiliden
 *               | ( formil | acetil | benzoil ) , [ oxi ] | carboxi | ciano   (* R-6a2b: (acetiloxi); R-6b1: ciano *)
 *               | amino ;   (* R-6c2; as a compound branch's own chain, its prefixes are the groups on its N: (metilamino) *)
 *   alkoxy      = oxi , [ carbonil ] ;   (* R-6a2b: carbonil, an alkoxycarbonyl prefix, (metoxicarbonil) *)
 *   parent      = [ legacy ] , stem , ( ano | segments ) , [ suffix ]
 *               | [ legacy ] , benceno , [ suffix ] | fenol | benzaldehído | benzoico | benzoato | benzonitrilo
 *               | [ locants | letter ] , template ;
 *   suffix      = [ locants ] , [ MULT ] , ( ol | al | ona | carbaldehído | oico | carboxílico | oato | carboxilato
 *                                         | nitrilo | carbonitrilo | amina ) ;   (* R-6b1; R-6c1: amina *)
 *   template    = tolueno | estireno | xileno | mesitileno | anisol
 *               | cresol | pirocatecol | catecol | resorcinol | hidroquinona
 *               | formaldehído | acetaldehído | acetona | acetofenona | fenilacetaldehído   (* R-5c3a *)
 *               | ftalaldehído | isoftalaldehído | tereftalaldehído
 *               | fórmico | acético | oxálico | fenilacético                    (* R-5d2, after `ácido` *)
 *               | ftálico | isoftálico | tereftálico
 *               | formiato | acetato | fenilacetato                       (* R-6a2a, before the O-bound side *)
 *               | acetonitrilo | fenilacetonitrilo | ftalonitrilo ;     (* R-6b2 *)
 *   letter      = o | m | p ;
 *   stem        = [ ciclo ] , ROOT ;   (* ciclo: a ring of ROOT carbons, at least 3 *)
 *   segments    = segment , [ segment ] ;
 *   segment     = [ locants ] , [ MULT ] , ( eno | ino ) ;
 *   locants     = locant , { locant } ;
 *   locant      = NUM | 1(n) | N ;   (* 1(n): only on a ring's eno / ino; N (R-6c1): only on a name-level prefix of an amine *)
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
 * before `oil` are TILE_ORDER, each with its hint, and so is an acyl group
 * in an ether's class name. `acetil` (CH₃–CO–, the engine's word for the unsubstituted acyl of
 * two carbons) is a retained word like `formil`, and `benzoil` (the benzene
 * ring bonded to a C=O carbon) one like `fenil`, which takes prefixes of its
 * own inside a compound branch (`START 4 met il benzoil END`:
 * `(4-metilbenzoil)`); an acyl tile anywhere else is TILE_ORDER.
 *
 * The carboxylic acids (R-5d1) are named as the engine names them (render.js
 * renderName(): the class word, a space, the substitutive name): the class
 * word `ácido` is the first tile of the name, a slot before the whole
 * substitutive name, whose prefixes come after it (`ácido 2-metilpropanoico`,
 * `ácido 2-(3-metilfenil)propanoico`); the tree keeps it apart
 * (`suffixClass`), and the assembler writes the space after it. The suffix
 * `oico` puts the –COOH at the ends of a chain by rule, as `al` puts the –CHO
 * (`ácido butanoico`, `ácido butanodioico`): numbers on it are TILE_ORDER,
 * and so is `oico` after a ring or `benceno` (their –COOH is `carboxílico`);
 * `carboxílico` takes locants like `carbaldehído` (`ácido
 * ciclohexano-1,4-dicarboxílico`, `ácido benceno-1,3-dicarboxílico`, after a
 * chain too, read and judged by the engine); `benzoico` is a whole-word
 * parent like `benzaldehído`, its –COOH at carbon 1 (`ácido 4-metilbenzoico`;
 * numbers or a letter of its own are TEMPLATE_LOCANTS); `carboxi` a retained
 * word like `formil`, the –COOH bonded by its carbon (`(carboximetil)`; `oxi`
 * after it, or `carboxi` as a group of an ether's class name, are TILE_ORDER
 * with their hints). `ácido` goes with an acid suffix (`oico`, `carboxílico`
 * or `benzoico`) and an acid suffix with `ácido` (ACID_WORD, each with its
 * message and tile); `ácido` anywhere but first is TILE_ORDER.
 *
 * The esters (R-6a1) are named as the engine names them (render.js
 * assembleEster(): the acid part, ` de `, the O-bound groups): the suffix
 * `oato` puts the –COO– at the ends of a chain by rule, as `oico` puts the
 * –COOH (`etanoato`, `butanodioato`; numbers on it, or `oato` after a ring or
 * `benceno`, are TILE_ORDER with their hints), `carboxilato` takes locants
 * like `carboxílico` (`ciclohexano-1,4-dicarboxilato`), and `benzoato` is a
 * whole-word parent like `benzoico` (`4-metilbenzoato`; numbers or a letter
 * of its own are TEMPLATE_LOCANTS). Every tile after the parent is then the
 * O-bound side (the name's `ester` node), read as the items of a compound
 * branch: each O-bound group ends in `ilo`, which takes the free-valence
 * place of `il` in a chain or ring (`met ilo` → `metilo`, `prop ano 2 ilo` →
 * `propan-2-ilo`, `ciclo hex ilo`) and the `il` of `isopropil`, `tert-butil`
 * or `fenil` (a field of the retained node, `ilo`: `isopropilo`, `fenilo`);
 * its own prefixes stand before its chain, without marks (`2 cloro et ilo`:
 * `2-cloroetilo`, a word of its own as the engine writes it), unless a
 * multiplier repeats the group, which then needs a compound branch (`bis
 * START 2 cloro et ilo END`: `bis(2-cloroetilo)`; `di met ilo`: `dimetilo`);
 * two different groups follow each other (the automatic ` y `:
 * `propanodioato de etilo y metilo`). checkEsterSide() keeps that shape
 * (ESTER_GROUPS, ESTER_SUFFIX and the TILE_ORDER hints of the O-bound side);
 * an `ilo` anywhere else is TILE_ORDER, and `oxi` after it too.
 *
 * The ester prefixes (R-6a2b) compose from these tiles, as the engine
 * writes them (render.js alkoxyTokens(), alkoxycarbonylTokens()): an
 * acyloxy prefix is an acyl branch closed by `oxi` — `oxi` after `oil`,
 * `carbonil`, `acetil`, `benzoil` or `formil` (tiles.js isAcyloxyHead(); a
 * TILE_ORDER error before R-6a2b): `acetil oxi` → `(acetiloxi)`, `prop ano
 * oil oxi` → `(propanoiloxi)`, `ciclo hex ano carbonil oxi` →
 * `[(ciclohexanocarbonil)oxi]` —, and an alkoxycarbonyl prefix an alkoxy
 * branch closed by `oxi` and then the `carbonil` tile (the node's `carbonil`
 * field, takeAlkoxycarbonyl(): `met il oxi carbonil` → `(metoxicarbonil)`,
 * `isopropil oxi carbonil` → `(isopropoxicarbonil)`); in a compound branch
 * both go before its END, as `oxi` does (`START 2 met il prop ano oil oxi END`
 * → `[(2-metilpropanoil)oxi]`, `START 2 cloro et il oxi carbonil END` →
 * `[(2-cloroetoxi)carbonil]`). `carbonil` after an acyloxy prefix (`acetil
 * oxi carbonil`: the oxygen between two C=O groups) and `carbonil` right
 * after a compound branch's END are TILE_ORDER with their hints; `oxi` after
 * `carboxi` stays TILE_ORDER (a carbonic acid's ester).
 *
 * The nitriles (R-6b1) are named as the engine names them (render.js
 * suffixWords(), substituentTokens()): the suffix `nitrilo` puts the –C≡N at
 * the ends of a chain by rule, as `oico` puts the –COOH (`butanonitrilo`,
 * `butanodinitrilo`, `prop-2-enonitrilo`: the parent's `o` kept before its
 * consonant); numbers on it, or `nitrilo` after a ring or `benceno`, are
 * TILE_ORDER with their hints (terminalHints()); `carbonitrilo` takes
 * locants like `carboxílico` (`ciclohexano-1,4-dicarbonitrilo`,
 * `benceno-1,4-dicarbonitrilo`; after a chain it is read too, and judged by
 * the engine: `propano-1-carbonitrilo` is butanonitrilo); `benzonitrilo` is a
 * whole-word parent like `benzoico` (`4-metilbenzonitrilo`; numbers or a
 * letter of its own are TEMPLATE_LOCANTS, «grupo C≡N»); `ciano` a retained
 * word like `carboxi`, the –C≡N bonded by its carbon (`ácido
 * 3-cianopropanoico`, `(cianometil)`, `etanoato de cianometilo`; `oxi` after
 * it, `ciano` as a group of an ether's class name or as an ester's O-bound
 * group are TILE_ORDER with their hints). No new error code.
 *
 * The amines (R-6c1) are named as the engine names them (render.js
 * suffixWords(), renderPrefixes()): the suffix `amina` follows the parent's
 * ending with its own locants and multiplier, exactly as `ol` (`etanamina`,
 * `propan-2-amina`, `butano-1,4-diamina`, `ciclohexanamina`, `bencenamina`,
 * `bencen-1-amina`; out of place it is TILE_ORDER with its own hint). The
 * locant `N` (a tile of kind 'nitrogen') names the nitrogen of the principal
 * amine as the place of a prefix: it is read wherever a number is
 * (takeNums()), so the tree stays lossless, and checkNitrogen() keeps it to
 * the locants of a name-level prefix of a name whose parent carries `amina`
 * (`N-metiletanamina`, `N,N-dimetilmetanamina`, mixed with numbers in the
 * student's order, `N,2-dimetilpropan-1-amina`); without `amina`, inside a
 * compound branch, on a segment, before the root or on the suffix it is
 * TILE_ORDER with its hints. Which group may stand on the nitrogen, and how
 * many, is the chemistry's (build.js VALENCE, the engine's refusals). No new
 * error code.
 *
 * The amino prefixes (R-6c2) are named as the engine names them (render.js
 * substituentTokens(): the groups on the nitrogen without locants, every one
 * after the first enclosed, then `amino`): `amino` is a retained word like
 * `ciano`, an amine's nitrogen single-bonded to the carbon its prefix's
 * locant gives (`2-aminoetan-1-ol`, `ácido 2-aminopropanoico`, `diamino`), and,
 * like `fenil`, it may be the own chain of a compound branch, whose prefixes
 * are then the groups on its nitrogen (`START met il amino END` →
 * `(metilamino)`, `START di met il amino END` → `(dimetilamino)`, `START et
 * il met il amino END` → `[etil(metil)amino]`, `START START 2 cloro et il END
 * amino END` → `[(2-cloroetil)amino]`; multiplied with bis, `bis START met il
 * amino END`). checkAminoGroups() keeps those groups as the engine writes
 * them: no locants or letter of their own (the nitrogen has one place; a
 * group with prefixes of its own is a compound branch of its own), and no
 * group bonded by a C=O carbon (`acetil`, `formil`, `benzoil`, an acyl
 * ending), which on the nitrogen makes an amide, no amine (the acylamino
 * prefixes, `(acetilamino)`, belong to the amides): TILE_ORDER with their
 * hints. Which other groups may stand on the nitrogen, and how many, is the
 * chemistry's (build.js VALENCE: the nitrogen's three bonds; the engine's
 * refusals: a halogen, an oxygen or a double bond on it). `oxi` after `amino`,
 * `amino` as a group of an ether's class name or as an ester's O-bound group
 * are TILE_ORDER with their hints; a name that ends in an amino prefix says
 * «un grupo». No new error code.
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
 * The retained acid templates (R-5d2: `fórmico`, `acético`, `oxálico`,
 * `fenilacético` on an open chain, the ftálico family on benzene; tiles.js
 * isAcidTemplate()) are carbonyl templates whose word places –COOH groups:
 * they follow the class word `ácido` like `benzoico` (ACID_WORD both ways,
 * acidSuffixTile(): `acético` without `ácido`, the error on the template's
 * tile, its message's example the student's own word, `ácido acético`;
 * `ácido acetona`, the error on `ácido`, with a message naming the retained
 * acid words), take numbers or a letter of their own as TEMPLATE_LOCANTS
 * («ácido acético» ya dice dónde va su grupo COOH…), and inside a compound
 * branch their hint says the –COOH is written `carboxi` there.
 *
 * The retained ester templates (R-6a2a: `formiato`, `acetato`,
 * `fenilacetato`, open chains; tiles.js isEsterTemplate()) are the acid part
 * of an ester, as `benzoato` is: their word places the –COO– at carbon 1
 * (esterSuffixOf(): one –COO–, so one O-bound group), and the O-bound side
 * follows exactly as after `oato` (`acetato de etilo`, `formiato de
 * isopropilo`, `acetato de fenilo`); without it they are ESTER_GROUPS, with
 * the template's own word as the example (`acetato de metilo`); numbers or a
 * letter on them are TEMPLATE_LOCANTS («acetato» ya dice dónde va su grupo
 * COO…); `ácido` before one is ACID_WORD («acetato» names the acid part of
 * an ester, written without `ácido`), and an O-bound side after the retained
 * acid each one belongs to (`ácido acético de metilo`; tiles.js
 * ACID_ESTER_TEMPLATES) is ESTER_SUFFIX with that ester's word (`acetato de
 * metilo`); inside a compound branch or the O-bound side their hint says
 * they name the acid part, before the O-bound group.
 *
 * The retained nitrile templates (R-6b2: `acetonitrilo` and
 * `fenilacetonitrilo`, open chains, and `ftalonitrilo` on benzene; tiles.js
 * isNitrileTemplate()) are templates whose word places –C≡N groups, as the
 * carbonyl templates place their C=O: no class word and no O-bound side
 * (`ácido acetonitrilo` is ACID_WORD on `ácido`, `acetonitrilo de metilo`
 * ESTER_SUFFIX, a nitrile suffix after the word TILE_ORDER, as after any
 * template); numbers or a letter on them are TEMPLATE_LOCANTS («acetonitrilo»
 * ya dice dónde va su grupo C≡N…), the two –C≡N of `ftalonitrilo` count as
 * occupied positions for the letters (POSITIONAL), and inside a compound
 * branch their hint says the –C≡N is written `ciano` there. No new error
 * code.
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
 * - name    `{type: 'name', tiles, suffixClass, items: (prefix|stray)[], parent, ester, trailing: stray[]}` (`suffixClass`
 *            the `ácido` tile that starts the name, R-5d1, else null; `ester` the O-bound side of an ester, R-6a1, else null)
 * - suffixClass `{type: 'suffixClass', tile}` (the class word `ácido` before the whole name, R-5d1)
 * - ester   `{type: 'ester', items: (prefix|stray)[]}` (the tiles after an ester's parent, R-6a1: its O-bound groups, each
 *            the item whose substituent ends in `ilo` with the bare prefixes before it, assemble.js esterGroupsOf())
 * - prefix  `{type: 'prefix', locants: number[], letter: number|null, multiplier: number|null,
 *            substituent: chain|retained|halogen|hydroxy|carbonyl|branch|null}` (null: numbers, a
 *            letter or a multiplier with nothing after them yet; `letter` the
 *            o / m / p tile, R-4c)
 * - chain   `{type: 'chain', ring: number|null, root: number|null, ano:
 *            number|null, segments: segment[], fvLocants: number[], fv:
 *            number|null, oxi: number|null, carbonil?: number}` (`ring` the `ciclo` tile of a
 *            ring, else null; `root` null only after a `ciclo` with no root,
 *            RING_ROOT; a branch's chain has `fv` — `il` / `iliden`, or the
 *            acyl ending `oil` / `carbonil`, R-5c2, or the ending `ilo` of an
 *            ester's O-bound group, R-6a1 —; the parent's has none;
 *            `oxi` the alkoxy ending after `fv`, R-5b; `carbonil`, only when
 *            that tile follows `oxi`, an alkoxycarbonyl prefix, R-6a2b)
 * - segment `{locants: number[], multiplier: number|null, ending: number}`
 * - retained `{type: 'retained', tile, oxi: number|null, carbonil?: number, ilo?: number}` (`oxi` the alkoxy ending after
 *            it, R-5b; `carbonil`, only when that tile follows `oxi`, an alkoxycarbonyl prefix, R-6a2b: `isopropoxicarbonil`;
 *            `ilo`, only when that tile follows it, the ending of an ester's O-bound group, R-6a1: `isopropilo`, `fenilo`)
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
 *            `fenol` tile, R-5a2, value 'phenol', the `benzaldehído`
 *            tile, R-5c1, value 'benzaldehyde', the `benzoico` tile, R-5d1,
 *            value 'benzoic', the `benzoato` tile, R-6a1, value 'benzoate', and
 *            the `benzonitrilo` tile, R-6b1, value 'benzonitrile': groupWordOf())
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
 * `éter`), and for the acids (R-5d1) ACID_WORD (`ácido` without an acid
 * suffix, or an acid suffix without `ácido`), and for the esters (R-6a1)
 * ESTER_GROUPS (not one O-bound group per –COO– of the suffix) and
 * ESTER_SUFFIX (an O-bound group after a parent with no ester suffix).
 * The structural codes (LOCANT_RANGE, BOND_RANGE, SAME_BOND, VALENCE,
 * TOO_BIG) need the chemistry and belong to R-1b. The Spanish messages are
 * drafts pending teacher review (design.md §15, last paragraph); their
 * example words come from the lexicon.
 */

import {
  stem, multiplier, compoundMultiplier, ENDINGS, FREE_VALENCE_SUFFIXES, ENCLOSING_MARKS, CONNECTING_VOWEL,
  MAX_MULTIPLIER, RING_PREFIX, BENZENE_NAME, RETAINED_PREFIXES, POSITIONAL_LETTERS, GROUP_SUFFIXES, GROUP_PREFIXES,
  HALOGEN_PREFIXES, ALKOXY_ENDING, ETHER_CLASS_WORD, RING_GROUP_SUFFIXES, FORMYL_PREFIX, ACYL_ENDING, RING_CARBONYL_ENDING,
  BENZOYL_PREFIX, SUFFIX_CLASS_WORDS, ESTER_LINK, ESTER_ALKYL_JOIN, ACETYL_PREFIX,
} from '../naming/lexicon.es.js';
import {
  toTiles, TEMPLATES, templateGroupWord, groupPlural, tileById, POSITIONAL_IDS, PHENOL_ID, isAtomGroup, closingText,
  isPhenolTemplate, withArticle, ALKOXY_RETAINED, ETHER_CLASS_GROUPS, SUFFIX_GROUPS, GROUP_WORD_PARENTS, BENZALDEHYDE_ID,
  isAcylTile, templateSuffix, isCarbonylTemplate, isChainTemplate, BENZOIC_ID, ACID_KIND, isAcidSuffix, parentWordName,
  isAcidTemplate, ACID_GROUP, ESTER_KIND, isEsterSuffix, ESTER_GROUP, BENZOATE_ID, ESTER_ALKYL_ID, isEsterTemplate,
  ACID_ESTER_TEMPLATES, isAcyloxyHead, NITRILE_KIND, BENZONITRILE_ID, NITRILE_GROUP, isNitrileTemplate, AMINE_KIND, isAmineSuffix,
  NITROGEN_ID, isAminoTile,
} from './tiles.js';
import { itemText, isAlkoxyNode, isCompoundAlkoxy, alkoxyCore, iloTileOf, esterGroupsOf, isAminoNode } from './assemble.js';

/**
 * The syntactic error codes of design.md §15.6 handled by the parser (RING_ROOT, RING_SIZE from R-4a; BENZENE_BONDS
 * from R-4b; TEMPLATE_LOCANTS, POSITIONAL from R-4c; ETHER_GROUPS from R-5b2; ACID_WORD from R-5d1; ESTER_GROUPS,
 * ESTER_SUFFIX from R-6a1).
 */
export const ERROR_CODES = Object.freeze([
  'EMPTY', 'NO_PARENT', 'ROOT_END', 'ENDS_WITH_BRANCH', 'BRANCH_OPEN', 'LOCANT_COUNT', 'LEGACY', 'TILE_ORDER',
  'RING_ROOT', 'RING_SIZE', 'BENZENE_BONDS', 'TEMPLATE_LOCANTS', 'POSITIONAL', 'ETHER_GROUPS', 'ACID_WORD', 'ESTER_GROUPS',
  'ESTER_SUFFIX',
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
// R-5d1: the acids.
const ACIDO = SUFFIX_CLASS_WORDS[ACID_KIND];
const OICO = GROUP_SUFFIXES[ACID_KIND];
const CARBOXILICO = RING_GROUP_SUFFIXES[ACID_KIND];
const CARBOXI = GROUP_PREFIXES[ACID_KIND];
const BENZOICO = tileById(BENZOIC_ID).text;
// R-6a1: the esters.
const OATO = GROUP_SUFFIXES[ESTER_KIND];
const CARBOXILATO = RING_GROUP_SUFFIXES[ESTER_KIND];
const BENZOATO = tileById(BENZOATE_ID).text;
const ILO = tileById(ESTER_ALKYL_ID).text;
// R-6b1: the nitriles.
const NITRILO = GROUP_SUFFIXES[NITRILE_KIND];
const CARBONITRILO = RING_GROUP_SUFFIXES[NITRILE_KIND];
const CIANO = GROUP_PREFIXES[NITRILE_KIND];
const BENZONITRILO = tileById(BENZONITRILE_ID).text;
// R-6c1: the amines.
const AMINA = GROUP_SUFFIXES[AMINE_KIND];
const N_TEXT = tileById(NITROGEN_ID).text;
// R-6c2: the amino prefixes.
const AMINO = GROUP_PREFIXES[AMINE_KIND];
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
  // R-5d1: the acids.
  acidoButanoico: `${ACIDO} ${stem(4)}${ANO.slice(0, -1)}${OICO}`,
  acidoButanodioico: `${ACIDO} ${stem(4)}${ANO}${multiplier(2)}${OICO}`,
  acidoMetilpropanoico: `${ACIDO} 2-${stem(1)}${IL}${stem(3)}${ANO.slice(0, -1)}${OICO}`,
  acidoCiclohexanocarboxilico: `${ACIDO} ${RING_PREFIX}${stem(6)}${ANO}${CARBOXILICO}`,
  acidoBencenodicarboxilico: `${ACIDO} ${BENZENE_NAME}-1,4-${multiplier(2)}${CARBOXILICO}`,
  acidoBenzoico: `${ACIDO} ${BENZOICO}`,
  carboximetil: `${OPEN}${CARBOXI}${stem(1)}${IL}${CLOSE}`,
  carboxifenil: `${OPEN}4-${CARBOXI}${FENIL}${CLOSE}`,
  // R-6a1: the esters.
  metilo: `${stem(1)}${ILO}`,
  metanilo: `${stem(1)}${ENDINGS.saturated.slice(0, -1)}${ILO}`,
  etanoatoDeMetilo: `${stem(2)}${ANO.slice(0, -1)}${OATO}${ESTER_LINK}${stem(1)}${ILO}`,
  metanoatoDeMetilo: `${stem(1)}${ANO.slice(0, -1)}${OATO}${ESTER_LINK}${stem(1)}${ILO}`,
  butanodioatoDeDimetilo: `${stem(4)}${ANO}${multiplier(2)}${OATO}${ESTER_LINK}${multiplier(2)}${stem(1)}${ILO}`,
  propanodioatoDeEtiloYMetilo: `${stem(3)}${ANO}${multiplier(2)}${OATO}${ESTER_LINK}${stem(2)}${ILO}${ESTER_ALKYL_JOIN}${stem(1)}${ILO}`,
  ciclohexanocarboxilatoDeEtilo: `${RING_PREFIX}${stem(6)}${ANO}${CARBOXILATO}${ESTER_LINK}${stem(2)}${ILO}`,
  benzoatoDeMetilo: `${BENZOATO}${ESTER_LINK}${stem(1)}${ILO}`,
  benzoatoDeFenilo: `${BENZOATO}${ESTER_LINK}${FENIL.slice(0, -IL.length)}${ILO}`,
  etanoatoDeCloroetilo: `${stem(2)}${ANO.slice(0, -1)}${OATO}${ESTER_LINK}2-${HALOGEN_PREFIXES.Cl}${stem(2)}${ILO}`,
  butanodioatoDeBisCloroetilo: `${stem(4)}${ANO}${multiplier(2)}${OATO}${ESTER_LINK}${compoundMultiplier(2)}${OPEN}2-`
    + `${HALOGEN_PREFIXES.Cl}${stem(2)}${ILO}${CLOSE}`,
  etanoatoDePropan2ilo: `${stem(2)}${ANO.slice(0, -1)}${OATO}${ESTER_LINK}${stem(3)}${ANO.slice(0, -1)}-2-${ILO}`,
  etanoatoDeMetilfenilo: `${stem(2)}${ANO.slice(0, -1)}${OATO}${ESTER_LINK}4-${stem(1)}${IL}${FENIL.slice(0, -IL.length)}${ILO}`,
  // R-6a2b: the ester prefixes.
  acetiloxi: `${OPEN}${ACETYL_PREFIX}${ALKOXY_ENDING}${CLOSE}`,
  metoxicarbonil: `${OPEN}${stem(1)}${ALKOXY_ENDING}${RING_CARBONYL_ENDING}${CLOSE}`,
  cloroetoxicarbonil: `${ENCLOSING_MARKS[1][0]}${OPEN}2-${HALOGEN_PREFIXES.Cl}${stem(2)}${ALKOXY_ENDING}${CLOSE}${RING_CARBONYL_ENDING}`
    + `${ENCLOSING_MARKS[1][1]}`,
  // R-6b1: the nitriles.
  butanonitrilo: `${stem(4)}${ANO}${NITRILO}`,
  butanodinitrilo: `${stem(4)}${ANO}${multiplier(2)}${NITRILO}`,
  ciclohexanocarbonitrilo: `${RING_PREFIX}${stem(6)}${ANO}${CARBONITRILO}`,
  bencenodicarbonitrilo: `${BENZENE_NAME}-1,4-${multiplier(2)}${CARBONITRILO}`,
  cianometil: `${OPEN}${CIANO}${stem(1)}${IL}${CLOSE}`,
  cianofenil: `${OPEN}4-${CIANO}${FENIL}${CLOSE}`,
  // R-6c1: the amines.
  propan2amina: `${stem(3)}${ANO.slice(0, -1)}-2-${AMINA}`,
  butanodiamina: `${stem(4)}${ANO}-1,4-${multiplier(2)}${AMINA}`,
  ciclohexanamina: `${RING_PREFIX}${stem(6)}${ANO.slice(0, -1)}${AMINA}`,
  nMetiletanamina: `${N_TEXT}-${stem(1)}${IL}${stem(2)}${ANO.slice(0, -1)}${AMINA}`,
  nDimetilpropanamina: `${N_TEXT},2-${multiplier(2)}${stem(1)}${IL}${stem(3)}${ANO.slice(0, -1)}-1-${AMINA}`,
  // R-6c2: the amino prefixes.
  metilamino: `${OPEN}${stem(1)}${IL}${AMINO}${CLOSE}`,
  dimetilamino: `${OPEN}${multiplier(2)}${stem(1)}${IL}${AMINO}${CLOSE}`,
  etilMetilamino: `${ENCLOSING_MARKS[1][0]}${stem(2)}${IL}${OPEN}${stem(1)}${IL}${CLOSE}${AMINO}${ENCLOSING_MARKS[1][1]}`,
  cloroetilamino: `${ENCLOSING_MARKS[1][0]}${OPEN}2-${HALOGEN_PREFIXES.Cl}${stem(2)}${IL}${CLOSE}${AMINO}${ENCLOSING_MARKS[1][1]}`,
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
  anoBeforeIlo: `en el grupo unido al oxígeno sin número no se pone «${ENDINGS.saturated}»: ${EXAMPLES.metilo}, no `
    + `${EXAMPLES.metanilo}.`, // R-6a1
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
  // R-5d1: the acids.
  acidWord: `«${ACIDO}» va una sola vez, al principio del nombre, delante de todo lo demás: ${EXAMPLES.acidoMetilpropanoico}.`,
  oicoRing: `«${OICO}» solo va detrás de una cadena: en un anillo, el grupo COOH va unido a un carbono del anillo y se escribe `
    + `«${CARBOXILICO}» (${EXAMPLES.acidoCiclohexanocarboxilico}).`,
  oicoBenzene: `«${OICO}» no va detrás de «${BENZENE_NAME}»: el ${BENZENE_NAME} con un grupo COOH es el «${EXAMPLES.acidoBenzoico}», y `
    + `con varios se usa «${CARBOXILICO}» (${EXAMPLES.acidoBencenodicarboxilico}).`,
  oicoLocants: `el grupo COOH de «${OICO}» va siempre en un extremo de la cadena, en el carbono 1 (y en el último, con `
    + `«${multiplier(2)}${OICO}»), así que «${OICO}» no lleva números: ${EXAMPLES.acidoButanoico}, ${EXAMPLES.acidoButanodioico}.`,
  benzoicBranch: `«${BENZOICO}» es el nombre de toda la molécula y va al final, detrás de «${ACIDO}»; dentro de una rama, el anillo es `
    + `«${FENIL}» y su grupo COOH se escribe «${CARBOXI}», como en ${EXAMPLES.carboxifenil}.`,
  carboxyAlkoxy: `«${ALKOXY_ENDING}» no va detrás de «${CARBOXI}»: un grupo COOH unido a un oxígeno no forma un éter.`,
  classCarboxy: `«${CARBOXI}» no va en un nombre con «${ETHER_CLASS_WORD}»: un grupo COOH unido al oxígeno no forma un éter. Los `
    + `dos grupos de un éter son cadenas o anillos de carbonos (${EXAMPLES.etilMetilEter}).`,
  // R-6a1: the esters.
  oatoRing: `«${OATO}» solo va detrás de una cadena: en un anillo, el grupo COO va unido a un carbono del anillo y se escribe `
    + `«${CARBOXILATO}» (${EXAMPLES.ciclohexanocarboxilatoDeEtilo}).`,
  oatoBenzene: `«${OATO}» no va detrás de «${BENZENE_NAME}»: el ${BENZENE_NAME} con un grupo COO es el «${BENZOATO}» `
    + `(${EXAMPLES.benzoatoDeMetilo}).`,
  oatoLocants: `el grupo COO de «${OATO}» va siempre en un extremo de la cadena, en el carbono 1 (y en el último, con `
    + `«${multiplier(2)}${OATO}»), así que «${OATO}» no lleva números: ${EXAMPLES.etanoatoDeMetilo}, ${EXAMPLES.butanodioatoDeDimetilo}.`,
  benzoateBranch: `«${BENZOATO}» es el nombre de la parte ácida de un éster y va delante del grupo unido al oxígeno `
    + `(${EXAMPLES.benzoatoDeMetilo}); dentro de una rama, el anillo es «${FENIL}».`,
  iloPlace: `«${ILO}» acaba el grupo unido al oxígeno de un éster, que va al final del nombre, detrás de la parte ácida `
    + `(${EXAMPLES.etanoatoDeMetilo}); en una rama se escribe «${IL}» (${EXAMPLES.metil}).`,
  esterLocant: `el grupo unido al oxígeno de un éster no lleva números delante (${EXAMPLES.etanoatoDeMetilo}); si se une al `
    + `oxígeno por otro carbono, ese número va justo delante de «${ILO}» (${EXAMPLES.etanoatoDePropan2ilo}), y sus ramas, con sus `
    + `números, delante de su cadena (${EXAMPLES.etanoatoDeCloroetilo}).`,
  esterIl: `el grupo unido al oxígeno de un éster acaba en «${ILO}», no en «${IL}»: ${stem(1)} e ${ILO} dan ${EXAMPLES.metilo} `
    + `(${EXAMPLES.etanoatoDeMetilo}).`,
  esterBranches: `detrás de las ramas del grupo unido al oxígeno va la cadena de ese grupo, acabada en «${ILO}»: `
    + `${EXAMPLES.etanoatoDeCloroetilo}.`,
  esterMultiplied: `con «${multiplier(2)}» o «${compoundMultiplier(2)}» delante, un grupo unido al oxígeno que lleva ramas propias va `
    + `entero en una rama compuesta, entre «${OPEN}» y «${CLOSE}»: ${EXAMPLES.butanodioatoDeBisCloroetilo}.`,
  esterCompound: `si el grupo unido al oxígeno va en una rama compuesta, entre «${OPEN}» y «${CLOSE}», sus ramas van dentro de ella, `
    + `delante de su cadena: ${EXAMPLES.butanodioatoDeBisCloroetilo}.`,
  esterUnfinished: `detrás de los números y de «${multiplier(2)}», «${multiplier(3)}»… va el grupo unido al oxígeno, o una rama suya, `
    + `y el grupo acaba en «${ILO}»: ${EXAMPLES.etanoatoDeCloroetilo}, ${EXAMPLES.butanodioatoDeDimetilo}.`,
  iloAlkoxy: `«${ALKOXY_ENDING}» no va detrás de «${ILO}»: el grupo acabado en «${ILO}» ya va unido al oxígeno del éster `
    + `(${EXAMPLES.etanoatoDeMetilo}).`,
  benzeneEster: `el ${BENZENE_NAME} unido al oxígeno de un éster se escribe con «${FENIL}» e «${ILO}»: ${EXAMPLES.benzoatoDeFenilo}.`,
  // R-6b1: the nitriles.
  nitriloRing: `«${NITRILO}» solo va detrás de una cadena: en un anillo, el grupo C≡N va unido a un carbono del anillo y se `
    + `escribe «${CARBONITRILO}» (${EXAMPLES.ciclohexanocarbonitrilo}).`,
  nitriloBenzene: `«${NITRILO}» no va detrás de «${BENZENE_NAME}»: el ${BENZENE_NAME} con un grupo C≡N es el «${BENZONITRILO}», y con `
    + `varios se usa «${CARBONITRILO}» (${EXAMPLES.bencenodicarbonitrilo}).`,
  nitriloLocants: `el grupo C≡N de «${NITRILO}» va siempre en un extremo de la cadena, en el carbono 1 (y en el último, con `
    + `«${multiplier(2)}${NITRILO}»), así que «${NITRILO}» no lleva números: ${EXAMPLES.butanonitrilo}, ${EXAMPLES.butanodinitrilo}.`,
  benzonitrileBranch: `«${BENZONITRILO}» es el nombre de toda la molécula y va al final; dentro de una rama, el anillo es «${FENIL}» y `
    + `su grupo C≡N se escribe «${CIANO}», como en ${EXAMPLES.cianofenil}.`,
  cyanoAlkoxy: `«${ALKOXY_ENDING}» no va detrás de «${CIANO}»: un grupo C≡N unido a un oxígeno no forma un éter.`,
  classCyano: `«${CIANO}» no va en un nombre con «${ETHER_CLASS_WORD}»: un grupo C≡N unido al oxígeno no forma un éter. Los dos `
    + `grupos de un éter son cadenas o anillos de carbonos (${EXAMPLES.etilMetilEter}).`,
  // R-6c1: the locant `N` of the amines.
  nitrogen: `«${N_TEXT}» dice que un grupo va unido al nitrógeno de una amina, así que solo va en un nombre que acaba en `
    + `«${AMINA}» (${EXAMPLES.nMetiletanamina}).`,
  nitrogenPlace: `«${N_TEXT}» va delante de una rama unida al nitrógeno de la amina, como un número más de esa rama `
    + `(${EXAMPLES.nMetiletanamina}, ${EXAMPLES.nDimetilpropanamina}); no va delante de la cadena principal, de «${ENDINGS.double}», `
    + `«${ENDINGS.triple}» o «${AMINA}», ni dentro de una rama compuesta.`,
  // R-6a2b: `carbonil` after the END of a compound branch.
  carbonilAfterEnd: `en una rama compuesta, «${RING_CARBONYL_ENDING}» va dentro de ella, antes de cerrarla; detrás de «${ALKOXY_ENDING}» `
    + `forma un éster como rama: ${EXAMPLES.cloroetoxicarbonil}.`,
  // R-6c2: the amino prefixes.
  aminoAlkoxy: `«${ALKOXY_ENDING}» no va detrás de «${AMINO}»: un grupo amino unido a un oxígeno no forma un éter.`,
  classAmino: `«${AMINO}» no va en un nombre con «${ETHER_CLASS_WORD}»: un grupo amino unido al oxígeno no forma un éter. Los dos `
    + `grupos de un éter son cadenas o anillos de carbonos (${EXAMPLES.etilMetilEter}).`,
  aminoLocant: `los grupos unidos al nitrógeno de «${AMINO}» van delante de «${AMINO}», sin números ni letras: ${EXAMPLES.metilamino}, `
    + `${EXAMPLES.dimetilamino}, ${EXAMPLES.etilMetilamino}. Si un grupo lleva sus propias ramas, va en su propia rama compuesta, con `
    + `sus números dentro: ${EXAMPLES.cloroetilamino}.`,
});

/**
 * The TILE_ORDER hint of a group bonded by a C=O carbon written on the
 * nitrogen of an amino prefix (R-6c2: `acetil`, `formil`, `benzoil`, an acyl
 * ending): the C=O carbon on the nitrogen makes an amide, not an amine.
 *
 * @param {string} word - The acyl word or ending, as on its tile.
 * @returns {string} The hint.
 */
function aminoAcylHint(word) {
  return `«${word}» no va unido al nitrógeno de «${AMINO}»: un grupo C=O unido al nitrógeno no forma una amina, sino una amida.`;
}

/**
 * The TILE_ORDER hint of an O-bound group of an ester (R-6a1) that is no
 * carbon group bonded by a single bond: a doubly bonded word (`isopropiliden`),
 * or a group bonded through a C=O carbon or an oxygen (`formil`, `acetil`,
 * `carboxi`, `benzoil`, an acyl ending, `oxi`), which with the ester's oxygen
 * would make another family's compound.
 *
 * @param {string} word - The word or ending, as on its tile.
 * @param {boolean} double - A doubly bonded word.
 * @returns {string} The hint.
 */
function esterGroupHint(word, double) {
  if (double) {
    return `el grupo unido al oxígeno de un éster se une a él por un enlace sencillo, así que acaba en «${ILO}» `
      + `(${EXAMPLES.metilo}), no en «${word}».`;
  }
  return `«${word}» no va unido al oxígeno de un éster: el grupo unido al oxígeno es una cadena o un anillo de carbonos que acaba `
    + `en «${ILO}» (${EXAMPLES.etanoatoDeMetilo}).`;
} // End of function esterGroupHint()

/**
 * The ESTER_GROUPS message (R-6a1): an ester's name has after ` de ` one
 * O-bound group per –COO– of its suffix — two different ones joined by
 * ` y `, or one with `di` when both are the same. For a retained ester word
 * (R-6a2a: `acetato`, one –COO–) the example is that word's own ester:
 * `acetato de metilo`.
 *
 * @param {string} suffix - The ester suffix as the student wrote it, with its multiplier (`oato`, `dioato`, `benzoato`…), or
 *   the retained ester word (`acetato`).
 * @param {number} esters - The –COO– groups the suffix gives.
 * @param {number} count - The O-bound groups the name gives (multipliers counted).
 * @param {boolean} [template] - `suffix` is a retained ester word (R-6a2a; default false).
 * @returns {string} The message.
 */
function esterGroupsMessage(suffix, esters, count, template = false) {
  const the = esters === 1 ? `un solo ${ESTER_GROUP}` : `${numberWord(esters)} ${ESTER_GROUP.replace(/^grupo /, 'grupos ')}`;
  const example = template ? `${suffix}${ESTER_LINK}${EXAMPLES.metilo}` : EXAMPLES.etanoatoDeMetilo; // `acetato de metilo` (R-6a2a)
  if (count === 0) {
    const tiles = template ? `${suffix}, ${stem(1)} e ${ILO}` : `${stem(2)}, ${ANO}, ${OATO}, ${stem(1)} e ${ILO}`;
    return `Detrás de «${suffix}» va el grupo unido al oxígeno del éster, acabado en «${ILO}» (la palabra «de» la pone la app): `
      + `${tiles} dan ${example}.`;
  }
  const written = count === 1 ? 'pone uno' : `pone ${numberWord(count)}`;
  if (esters === 1) {
    return `Con «${suffix}» hay ${the}, que lleva un solo grupo unido al oxígeno, y tu nombre ${written}: `
      + `${example}.`;
  }
  return `Con «${suffix}» hay ${the}, y cada uno lleva su grupo unido al oxígeno; tu nombre ${written}: escribe `
    + `${numberWord(esters)}, por orden alfabético (${EXAMPLES.propanodioatoDeEtiloYMetilo}), o uno solo con «${multiplier(esters)}» `
    + `delante si son iguales (${EXAMPLES.butanodioatoDeDimetilo}).`;
} // End of function esterGroupsMessage()

/**
 * The TILE_ORDER hints of a terminal suffix out of its place (R-5c1: `al`;
 * R-5d1: `oico`; R-6a1: `oato`; R-6b1: `nitrilo`), whose group sits at the
 * ends of a chain by rule: after a `ciclo` ring (`ring`), after `benceno`
 * (`benzene`) and with locants of its own (`locants`).
 *
 * @param {{value: string}} tile - The `al`, `oico`, `oato` or `nitrilo` tile.
 * @returns {{ring: string, benzene: string, locants: string}} The hints.
 */
function terminalHints(tile) {
  if (tile.value === ESTER_KIND) {
    return { ring: HINTS.oatoRing, benzene: HINTS.oatoBenzene, locants: HINTS.oatoLocants }; // `oato` (R-6a1)
  }
  if (tile.value === NITRILE_KIND) {
    return { ring: HINTS.nitriloRing, benzene: HINTS.nitriloBenzene, locants: HINTS.nitriloLocants }; // `nitrilo` (R-6b1)
  }
  return tile.value === ACID_KIND
    ? { ring: HINTS.oicoRing, benzene: HINTS.oicoBenzene, locants: HINTS.oicoLocants }
    : { ring: HINTS.alRing, benzene: HINTS.alBenzene, locants: HINTS.alLocants };
}

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
 * `al`, `ona`, `carbaldehído`; R-5d1: `oico`, `carboxílico`; R-6a1: `oato`,
 * `carboxilato`; R-6b1: `nitrilo`, `carbonitrilo`): it goes at the end of the
 * name, after the parent's ending (an ester's, before its O-bound group); in
 * a branch the group is a prefix.
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
    case ACID_KIND: // `oico` (R-5d1)
      return `«${OICO}» va al final del nombre, detrás de la terminación de la cadena principal (${EXAMPLES.acidoButanoico}, `
        + `${EXAMPLES.acidoButanodioico}); en una rama, el grupo COOH se escribe «${CARBOXI}» (${EXAMPLES.carboximetil}).`;
    case 'carboxylic': // `carboxílico` (R-5d1)
      return `«${CARBOXILICO}» va al final del nombre, detrás del nombre del anillo principal `
        + `(${EXAMPLES.acidoCiclohexanocarboxilico}); en una rama, el grupo COOH se escribe «${CARBOXI}».`;
    case ESTER_KIND: // `oato` (R-6a1)
      return `«${OATO}» va detrás de la terminación de la cadena principal de un éster, y luego el grupo unido al oxígeno, `
        + `acabado en «${ILO}» (${EXAMPLES.etanoatoDeMetilo}, ${EXAMPLES.butanodioatoDeDimetilo}).`;
    case 'carboxylate': // `carboxilato` (R-6a1)
      return `«${CARBOXILATO}» va detrás del nombre del anillo principal de un éster, y luego el grupo unido al oxígeno, acabado en `
        + `«${ILO}» (${EXAMPLES.ciclohexanocarboxilatoDeEtilo}).`;
    case NITRILE_KIND: // `nitrilo` (R-6b1)
      return `«${NITRILO}» va al final del nombre, detrás de la terminación de la cadena principal (${EXAMPLES.butanonitrilo}, `
        + `${EXAMPLES.butanodinitrilo}); en una rama, el grupo C≡N se escribe «${CIANO}» (${EXAMPLES.cianometil}).`;
    case 'carbonitrile': // `carbonitrilo` (R-6b1)
      return `«${CARBONITRILO}» va al final del nombre, detrás del nombre del anillo principal `
        + `(${EXAMPLES.ciclohexanocarbonitrilo}); en una rama, el grupo C≡N se escribe «${CIANO}».`;
    case AMINE_KIND: // `amina` (R-6c1)
      return `«${AMINA}» va al final del nombre, detrás de la terminación de la cadena o del anillo principal `
        + `(${EXAMPLES.propan2amina}, ${EXAMPLES.butanodiamina}, ${EXAMPLES.ciclohexanamina}).`;
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
 * Tells whether a suffix node is the aldehyde suffix `al` (R-5c1), the
 * acid suffix `oico` (R-5d1), the ester suffix `oato` (R-6a1) or the
 * nitrile suffix `nitrilo` (R-6b1), whose –CHO, –COOH, –COO– or –C≡N sits at
 * an end of a chain by rule (tiles.js SUFFIX_GROUPS `terminal`): it takes no
 * locants.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object|null} suffix - A suffix node, or null.
 * @returns {boolean} True for `al`, `oico`, `oato` and `nitrilo`.
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

/**
 * The ACID_WORD message of an acid suffix without `ácido` (R-5d1), with an
 * example of the name written right: `ácido butanoico`, or (R-5d2) the
 * student's own retained acid name, `ácido acético`.
 *
 * @param {string} example - The example name.
 * @returns {string} The message.
 */
function acidWordMissingMessage(example) {
  return `El nombre de un ácido empieza por la palabra «${ACIDO}»: pon esa ficha al principio, como en ${example}.`;
}

/** Messages of the error codes that take no detail (design.md §15.6 drafts). */
const MESSAGES = Object.freeze({
  // R-5d1: `ácido` without an acid suffix, and an acid suffix without `ácido` (ACID_WORD).
  ACID_WORD_ALONE: `La palabra «${ACIDO}» va delante del nombre de un ácido, que termina en «${OICO}» (${EXAMPLES.acidoButanoico}), `
    + `en «${CARBOXILICO}» (${EXAMPLES.acidoCiclohexanocarboxilico}) o en «${BENZOICO}» (${EXAMPLES.acidoBenzoico}).`,
  ACID_WORD_MISSING: acidWordMissingMessage(EXAMPLES.acidoButanoico),
  // R-6a1: an O-bound group (`ilo`) after a parent with no ester suffix (ESTER_SUFFIX).
  ESTER_SUFFIX: `El grupo acabado en «${ILO}» es el que va unido al oxígeno de un éster, detrás de la parte ácida, y el nombre de esa `
    + `parte termina en «${OATO}» (${EXAMPLES.etanoatoDeMetilo}), en «${CARBOXILATO}» (${EXAMPLES.ciclohexanocarboxilatoDeEtilo}) o en `
    + `«${BENZOATO}» (${EXAMPLES.benzoatoDeMetilo}).`,
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
  // R-6a1: a letter in an ester's O-bound group.
  ester: `En el grupo unido al oxígeno de un éster no se usan ${LETTERS[0]}, ${LETTERS[1]} ni ${LETTERS[2]}: escribe los números, `
    + `como en ${EXAMPLES.etanoatoDeMetilfenilo}.`,
});

/** The group `fenol` places itself at carbon 1, as the messages say it (R-5a2), and its plural (R-5a3a: `catecol`). */
const PHENOL_GROUP = 'grupo OH';
const PHENOL_GROUPS = 'grupos OH';

/** The plural of the –COOH of an acid as the messages say it (tiles.js ACID_GROUP; R-5d2: `oxálico`, the ftálicos). */
const ACID_GROUPS = ACID_GROUP.replace(/^grupo /, 'grupos ');

/** The plural of the –C≡N of a nitrile as the messages say it (tiles.js NITRILE_GROUP; R-6b2: `ftalonitrilo`). */
const NITRILE_GROUPS = NITRILE_GROUP.replace(/^grupo /, 'grupos ');

/**
 * How the messages call the principal group a template's word places, by
 * its SUFFIX_GROUPS key (templateSuffix()): the OH of a retained phenol
 * (R-5a3a), the –CHO of `formaldehído` or of a ftalaldehído and the C=O of
 * `acetona` (R-5c3a; GROUP_WORD_PARENTS: «grupo CHO»), the –COOH of an acid
 * template (R-5d2: «grupo COOH», «grupos COOH»), the –COO– of an ester
 * template (R-6a2a: «grupo COO»), the –C≡N of a nitrile template (R-6b2:
 * `acetonitrilo`'s on its chain, `ftalonitrilo`'s two outside the ring:
 * «grupo C≡N», «grupos C≡N»).
 */
const PLACED_GROUP_WORDS = Object.freeze({
  alcohol: Object.freeze({ one: PHENOL_GROUP, many: PHENOL_GROUPS }),
  aldehyde: Object.freeze({ one: GROUP_WORD_PARENTS.benzaldehyde.group, many: 'grupos CHO' }),
  carbaldehyde: Object.freeze({ one: GROUP_WORD_PARENTS.benzaldehyde.group, many: 'grupos CHO' }),
  ketone: Object.freeze({ one: 'grupo C=O', many: 'grupos C=O' }),
  // R-5d2: the –COOH groups of an acid template (`acético`, `oxálico`, the ftálicos).
  [ACID_KIND]: Object.freeze({ one: ACID_GROUP, many: ACID_GROUPS }),
  carboxylic: Object.freeze({ one: ACID_GROUP, many: ACID_GROUPS }),
  // R-6a2a: the –COO– of an ester template (`formiato`, `acetato`, `fenilacetato`).
  [ESTER_KIND]: Object.freeze({ one: ESTER_GROUP, many: ESTER_GROUP.replace(/^grupo /, 'grupos ') }),
  // R-6b2: the –C≡N groups of a nitrile template (`acetonitrilo`, `fenilacetonitrilo`, `ftalonitrilo`).
  [NITRILE_KIND]: Object.freeze({ one: NITRILE_GROUP, many: NITRILE_GROUPS }),
  carbonitrile: Object.freeze({ one: NITRILE_GROUP, many: NITRILE_GROUPS }),
});

/**
 * The principal group a whole-word benzene parent places at its carbon 1
 * (tiles.js GROUP_WORD_PARENTS): the OH of `fenol` (R-5a2), the –CHO of
 * `benzaldehído` (R-5c1), the –COOH of `benzoico` (R-5d1); null for
 * `benceno` and any other node.
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
 * OH of `fenol` at 1 (R-5a2), the –CHO of `benzaldehído` at 1 (R-5c1:
 * «grupo CHO») or the –COOH of `benzoico` at 1 (R-5d1: «grupo COOH», the
 * word quoted «ácido benzoico»); null for `benceno` and any other parent.
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
      word: parentWordName(tile), // «ácido acético» (R-5d2): the class word with the word, as the name is written.
    };
  }
  const placed = groupWordOf(tiles, chain); // `fenol` (R-5a2), `benzaldehído` (R-5c1), `benzoico` (R-5d1)
  if (placed) {
    const many = placed.group.replace(/^grupo /, 'grupos ');
    // «ácido benzoico» (R-5d1): the class word with the word, as the name is written.
    return { count: 1, positions: [1], kinds: [{ count: 1, one: placed.group, many }], letterOnly: false, word: parentWordName(tiles[chain.tile]) };
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
 * (R-5b) with `metoxi` and `fenil`, `(4-metoxifenil)`; a carbonyl template
 * (R-5c3a) with `oxo` or `formil`; an acid template (R-5d2) with `carboxi`;
 * an ester template (R-6a2a), in a branch or in the O-bound side, names the
 * acid part of an ester, before its O-bound group (`acetato de metilo`); a
 * nitrile template (R-6b2) with `ciano`.
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
  if (where === 'branch' && tile.kind === 'template' && isAcidTemplate(tile.value)) {
    // `acético`, `ftálico` (R-5d2): their –COOH is written `carboxi` there.
    return `«${tile.text}» es el nombre de toda la molécula y va al final, detrás de «${ACIDO}»; dentro de una rama, el grupo `
      + `COOH se escribe «${CARBOXI}», como en ${EXAMPLES.carboximetil} o ${EXAMPLES.carboxifenil}.`;
  }
  if (where === 'branch' && tile.kind === 'template' && isEsterTemplate(tile.value)) {
    // `acetato` (R-6a2a): the acid part of an ester, before its O-bound group, as `benzoato`.
    return `«${tile.text}» es el nombre de la parte ácida de un éster y va delante del grupo unido al oxígeno `
      + `(${tile.text}${ESTER_LINK}${EXAMPLES.metilo}).`;
  }
  if (where === 'branch' && tile.kind === 'template' && isNitrileTemplate(tile.value)) {
    // `acetonitrilo`, `ftalonitrilo` (R-6b2): their –C≡N is written `ciano` there, as `benzonitrilo`'s.
    return `«${tile.text}» es el nombre de toda la molécula y va al final; dentro de una rama, el ${NITRILE_GROUP} se escribe `
      + `«${CIANO}», como en ${EXAMPLES.cianometil} o ${EXAMPLES.cianofenil}.`;
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
} // End of function templateHint()

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
 * Consumes a run of locant tiles: numbers, the closing-bond locant `1(n)`
 * (R-5a2; checkClosing() keeps it to a ring's segments) and the locant `N`
 * (R-6c1; checkNitrogen() keeps it to an amine's name-level prefixes).
 *
 * @param {{tiles: object[], pos: number}} state - Parser state.
 * @returns {number[]} Their indices.
 */
function takeNums(state) {
  const nums = [];
  while (at(state, 'num') || at(state, 'closing') || at(state, 'nitrogen')) {
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
  if (before.kind === 'esterAlkyl') {
    addTileOrder(state, oxi, oxi + 1, HINTS.iloAlkoxy); // `met ilo oxi` (R-6a1): the group is bonded to the ester's oxygen already
  } else if (before.value === 'carboxy') {
    addTileOrder(state, oxi, oxi + 1, HINTS.carboxyAlkoxy); // `carboxi oxi` (R-5d1): no ether, nor an ester's prefix either
  } else if (before.value === 'cyano') {
    addTileOrder(state, oxi, oxi + 1, HINTS.cyanoAlkoxy); // `ciano oxi` (R-6b1): no ether either
  } else if (isAminoTile(before)) {
    addTileOrder(state, oxi, oxi + 1, HINTS.aminoAlkoxy); // `amino oxi` (R-6c2): no ether either
  } else if (!single && !isAcyloxyHead(before)) {
    addTileOrder(state, oxi, oxi + 1, alkoxyAfterDoubleHint(before.text)); // `metiliden oxi`, `isopropiliden oxi`
  }
  // R-6a2b: after an acyl branch (`acetil`, `formil`, `benzoil`, `oil`, `carbonil`) `oxi` makes an ester's acyloxy prefix.
  return oxi;
} // End of function takeAlkoxy()

/**
 * Consumes the `carbonil` tile right after an alkoxy ending `oxi` when it
 * follows (R-6a2b): the alkoxy group then hangs from a C=O carbon, the
 * ester's alkoxycarbonyl prefix (render.js alkoxycarbonylTokens(): `met il
 * oxi carbonil` → `(metoxicarbonil)`, `isopropil oxi carbonil` →
 * `(isopropoxicarbonil)`, in a compound branch before its END: `START 2 cloro
 * et il oxi carbonil END` → `[(2-cloroetoxi)carbonil]`). After an acyloxy
 * prefix it is TILE_ORDER (`acetil oxi carbonil`: the oxygen between two C=O
 * groups, an anhydride, no ester); the tile stays in the node either way, so
 * the tree stays lossless.
 *
 * @param {object} state - Parser state (right after the `oxi` tile).
 * @param {object} before - The tile before `oxi` (`il`, a retained word, an acyl ending…).
 * @returns {number|null} The `carbonil` tile index, or null.
 */
function takeAlkoxycarbonyl(state, before) {
  if (!at(state, 'acyl', 'ring')) {
    return null;
  }
  const carbonil = state.pos;
  state.pos += 1;
  if (isAcyloxyHead(before)) {
    addTileOrder(state, carbonil, carbonil + 1, anhydrideHint(before.text)); // `acetil oxi carbonil`
  }
  return carbonil;
} // End of function takeAlkoxycarbonyl()

/**
 * The TILE_ORDER hint of `carbonil` after an acyloxy prefix (R-6a2b): the
 * oxygen would sit between two C=O groups (an anhydride), which is no ester.
 *
 * @param {string} word - The acyl word or ending before `oxi`, as on its tile (`acetil`, `oil`…).
 * @returns {string} The hint.
 */
function anhydrideHint(word) {
  return `«${RING_CARBONYL_ENDING}» no va detrás de «${word}» y «${ALKOXY_ENDING}»: el oxígeno quedaría entre dos grupos C=O, y eso `
    + `no es un éster. Un éster como rama es ${EXAMPLES.acetiloxi} o ${EXAMPLES.metoxicarbonil}.`;
}

/**
 * Consumes the ending `ilo` right after a retained word when it follows
 * (R-6a1: `isopropil ilo` → `isopropilo`, `fenil ilo` → `fenilo`, an
 * ester's O-bound group), so the tree stays lossless; whether it may stand
 * there is checkEsterSide()'s.
 *
 * @param {object} state - Parser state (right after the retained word).
 * @returns {number|null} The `ilo` tile index, or null.
 */
function takeEsterEnding(state) {
  if (!at(state, 'esterAlkyl')) {
    return null;
  }
  state.pos += 1;
  return state.pos - 1;
}

/**
 * Parses a chain from its stem — a root, or `ciclo` and a root for a ring
 * (RING_ROOT when no root follows `ciclo`, RING_SIZE for a ring of fewer
 * than MIN_RING carbons) —, then `ano` or unsaturation segments, then the
 * free-valence locant and suffix of a branch when they follow — or an acyl
 * ending, `oil` or `carbonil` (R-5c2, checkAcyl()), or the ending `ilo` of an
 * ester's O-bound group (R-6a1, in the free-valence place: `metilo`,
 * `propan-2-ilo`) —, and the alkoxy ending `oxi` after them (R-5b).
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
  if (at(state, 'freeValence') || at(state, 'acyl') || at(state, 'esterAlkyl')) { // `ilo` (R-6a1): `metilo`, `propan-2-ilo`
    chain.fvLocants = nums;
    chain.fv = state.pos;
    state.pos += 1;
    if (nums.length > 1) {
      const who = tiles[chain.fv].kind === 'esterAlkyl' ? 'El grupo unido al oxígeno se une a él' : 'Una rama se une a la cadena';
      addError(state, 'LOCANT_COUNT', nums[0], nums[nums.length - 1] + 1,
        `${who} por un solo carbono: delante de «${tiles[chain.fv].text}» va un solo número.`);
    }
    if (tiles[chain.fv].kind === 'acyl') {
      checkAcyl(state, chain); // `propanoil`, `ciclohexanocarbonil` (R-5c2)
    } else if (chain.ano !== null && nums.length === 0) {
      // `prop ano il`: `propil`; `prop ano ilo`: `propilo` (R-6a1).
      addTileOrder(state, chain.ano, chain.ano + 1, tiles[chain.fv].kind === 'esterAlkyl' ? HINTS.anoBeforeIlo : HINTS.anoBeforeIl);
    }
    chain.oxi = takeAlkoxy(state, tiles[chain.fv]); // `met il oxi`: `metoxi` (R-5b); `prop ano oil oxi`: `propanoiloxi` (R-6a2b)
    const carbonil = chain.oxi === null ? null : takeAlkoxycarbonyl(state, tiles[chain.fv]);
    if (carbonil !== null) {
      chain.carbonil = carbonil; // `met il oxi carbonil`: `metoxicarbonil` (R-6a2b); only with the tile, so other trees keep their shape.
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
 * In an ester's O-bound side (R-6a1) the chain is the O-bound group or a
 * branch of it: «Después de «met» va «ilo» si es el grupo unido al
 * oxígeno…».
 *
 * @param {object} state - Parser state.
 * @param {object} chain - The chain node.
 * @param {boolean} [ester] - The chain stands in an ester's O-bound side (default false).
 * @returns {void}
 */
function addRootEnd(state, chain, ester = false) {
  if (chain.root === null) {
    return;
  }
  const ring = chain.ring !== null;
  const word = `${ring ? state.tiles[chain.ring].text : ''}${state.tiles[chain.root].text}`;
  if (ester) {
    addError(state, 'ROOT_END', chain.range[0], chain.range[1],
      `Después de «${word}» va «${ILO}» si es el grupo unido al oxígeno del éster (${EXAMPLES.etanoatoDeMetilo}, `
      + `${EXAMPLES.etanoatoDePropan2ilo}), o «${IL}» si es una rama de ese grupo.`);
    return;
  }
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
  // `al` (R-5c1), `oico` (R-5d1): on a ring the –CHO is `carbaldehído`, the –COOH `carboxílico`; on a chain the group sits at
  // the ends by rule and takes no locants.
  const terminal = isTerminalSuffix(tiles, suffix);
  const hints = terminal ? terminalHints(tiles[suffix.tile]) : null;
  if (terminal && chain.ring !== null) {
    addTileOrder(state, suffix.tile, suffix.tile + 1, hints.ring); // `ciclohexanal`, `ácido ciclohexanoico`
  } else if (terminal && suffix.locants.length > 0) {
    addTileOrder(state, suffix.locants[0], suffix.locants[suffix.locants.length - 1] + 1, hints.locants); // `butan-1-al`
  }
  if (legacy.length > 0 && chainEnded(chain)) {
    const open = chain.segments.map((segment, i) => (segment.locants.length === 0 ? i : -1)).filter((i) => i >= 0);
    const suffixOpen = Boolean(suffix) && suffix.locants.length === 0 && !terminal; // `al` has no list to open (R-5c1).
    if (open.length === 1 && !suffixOpen && multiplierCount(tiles, chain.segments[open[0]].multiplier) === legacy.length) {
      parent.legacySegment = open[0]; // `2-buteno`; `2-butenal` (R-5c1).
    } else if (open.length === 0 && suffixOpen && multiplierCount(tiles, suffix.multiplier) === legacy.length) {
      parent.legacySuffix = true; // `2-propanol`, `1,2-etanodiol` (R-5a2); `2-pentanona` (R-5c1).
    } else if (open.length === 0 && terminal) {
      addTileOrder(state, legacy[0], legacy[legacy.length - 1] + 1, hints.locants); // `1-butanal` (R-5c1), `ácido 1-butanoico`
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
  const placed = Boolean(groupWordOf(tiles, chain)); // `fenol` (R-5a2), `benzaldehído` (R-5c1), `benzoico` (R-5d1)
  const suffix = placed ? null : parseSuffix(state);
  const parent = {
    type: 'parent', legacy, letter, legacyMultiplier: mult, legacySegment: null, legacySuffix: false, chain, suffix, range: [start, state.pos],
  };
  if (isTerminalSuffix(tiles, suffix)) {
    addTileOrder(state, suffix.tile, suffix.tile + 1, terminalHints(tiles[suffix.tile]).benzene); // `bencenal` (R-5c1); `bencenoico`
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
    } else if (core && core.type === 'retained' && tiles[core.tile].value === 'carboxy') {
      addTileOrder(state, core.tile, core.tile + 1, HINTS.classCarboxy); // `carboxi metil éter` (R-5d1)
    } else if (core && core.type === 'retained' && tiles[core.tile].value === 'cyano') {
      addTileOrder(state, core.tile, core.tile + 1, HINTS.classCyano); // `ciano metil éter` (R-6b1)
    } else if (core && core.type === 'retained' && isAminoTile(tiles[core.tile])) {
      addTileOrder(state, core.tile, core.tile + 1, HINTS.classAmino); // `amino metil éter` (R-6c2)
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
 * The hint of a whole-word parent (`benceno`, `fenol`, `benzaldehído`,
 * `benzoico`, `benzoato`, `benzonitrilo`, a template) found inside a compound
 * branch, or in an ester's O-bound side (R-6a1).
 *
 * @param {object} tile - The tile.
 * @param {boolean} [ester] - In an ester's O-bound side (default false).
 * @returns {string} The hint.
 */
function wholeWordHint(tile, ester = false) {
  if (tile.kind === 'benzene' && ester && tile.value === 'benzene') {
    return HINTS.benzeneEster; // `benceno` in an ester's O-bound side (R-6a1): `fenilo`.
  }
  if (tile.kind === 'benzene') {
    return {
      phenol: HINTS.phenolBranch, benzaldehyde: HINTS.benzaldehydeBranch, benzoic: HINTS.benzoicBranch, benzoate: HINTS.benzoateBranch,
      benzonitrile: HINTS.benzonitrileBranch, // R-6b1
    }[tile.value] || HINTS.benzeneBranch;
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
 * In an ester's O-bound side (R-6a1, context 'ester') the items are read as
 * inside a compound branch (no parent: whole words are strays), the O-bound
 * groups being those that end in `ilo` (checkEsterSide()).
 *
 * @param {object} state - Parser state.
 * @param {'name'|'branch'|'ester'} context - Name level, inside a compound branch, or an ester's O-bound side (R-6a1).
 * @returns {object} A prefix, parent or stray node.
 */
function parseItem(state, context) {
  const { tiles } = state;
  const start = state.pos;
  const first = tiles[start];
  const wholeWord = (first.kind === 'benzene' || first.kind === 'template') && context !== 'name';
  const classInBranch = first.kind === 'classWord' && context !== 'name'; // `éter` inside a compound branch (R-5b2)
  // `oxi` alone: R-5b; `ácido` anywhere but first: R-5d1; `ilo` alone: R-6a1.
  if (['ending', 'freeValence', 'end', 'suffix', 'alkoxy', 'acyl', 'suffixClass', 'esterAlkyl'].includes(first.kind) || wholeWord
    || classInBranch) {
    state.pos += 1;
    // `carbonil` right after a compound branch's END (R-6a2b): it goes inside, after `oxi` (`[(2-cloroetoxi)carbonil]`).
    const afterEnd = first.kind === 'acyl' && first.value === 'ring' && start > 0 && tiles[start - 1].kind === 'end';
    const hint = (first.kind === 'end' && HINTS.endWithoutBranch) || (wholeWord && wholeWordHint(first, context === 'ester'))
      || (first.kind === 'suffix' && suffixHint(first)) || (afterEnd && HINTS.carbonilAfterEnd)
      || (first.kind === 'acyl' && acylHint(first)) // `oil` alone (R-5c2)
      || (first.kind === 'suffixClass' && HINTS.acidWord) || (first.kind === 'esterAlkyl' && HINTS.iloPlace) // `ilo` alone (R-6a1)
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
    node.oxi = takeAlkoxy(state, next); // `isopropoxi`, `fenoxi` (R-5b); `acetiloxi`, `benzoiloxi` (R-6a2b)
    const carbonil = node.oxi === null ? null : takeAlkoxycarbonyl(state, next);
    if (carbonil !== null) {
      node.carbonil = carbonil; // `isopropoxicarbonil`, `fenoxicarbonil` (R-6a2b): only with the tile.
    }
    const ilo = node.oxi === null ? takeEsterEnding(state) : null;
    if (ilo !== null) {
      node.ilo = ilo; // `isopropilo`, `fenilo` (R-6a1): an ester's O-bound group; only with the tile, so other trees keep their shape.
    }
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
      addRootEnd(state, chain, state.ester); // In an ester's O-bound side, «…va «ilo»…» (R-6a1).
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
    // `2-cloro`, `2-hidroxi`, `2-metoxi`: a one-atom group or an alkoxy group is no branch (R-5a1, R-5a2, R-5b); nor is the
    // –C≡N of `2-ciano` (R-6b1), whose carbon is never a chain's; nor an amino prefix (R-6c2: `2-amino`, `2-(metilamino)`).
    const cyano = last.substituent.type === 'retained' && state.tiles[last.substituent.tile].value === 'cyano';
    const amino = isAminoNode(state.tiles, last.substituent);
    const what = isAtomGroup(last.substituent.type) || isAlkoxyNode(last.substituent) || cyano || amino ? 'un grupo' : 'una rama';
    addError(state, 'ENDS_WITH_BRANCH', last.range[0], last.range[1],
      `El nombre acaba en ${what} («${words}»): falta la cadena principal detrás.`);
    return;
  }
  const lead = tree.suffixClass ? tree.suffixClass.range[1] : 0; // After `ácido` (R-5d1), which is not what is missing.
  const from = tree.items.reduce((end, item) => (isCompletePrefix(item) ? item.range[1] : end), lead);
  addError(state, 'NO_PARENT', from, tree.tiles.length, MESSAGES.NO_PARENT);
} // End of function checkNameEnd()

/**
 * Records POSITIONAL for each letter of a compound branch, at any depth: the
 * orto/meta/para forms belong to the parent benzene ring only (the engine
 * never writes them on a phenyl, design.md §14.4). A letter on a group of an
 * amino prefix's nitrogen (R-6c2) is checkAminoGroups()'s, whose hint says
 * that group takes neither numbers nor letters.
 *
 * @param {object} state - Parser state.
 * @param {object} branch - A branch node.
 * @returns {void}
 */
function checkBranchLetters(state, branch) {
  const amino = isAminoNode(state.tiles, branch);
  for (const item of branch.items) {
    if (item.type !== 'prefix') {
      continue;
    }
    if (item.letter !== null && !amino) {
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
  if (tree.ester) {
    tree.ester.items.forEach(visitItem); // The O-bound groups (R-6a1): a ring group's segments take `1(n)` too.
  }
} // End of function checkClosing()

/**
 * Keeps the locant `N` (R-6c1) to the locants of the name-level prefixes of
 * a name whose parent carries the amine suffix `amina` (the nitrogen it
 * names is that suffix's), recording TILE_ORDER on each one anywhere else: a
 * name without `amina` (HINTS.nitrogen), or in such a name a compound
 * branch's own prefixes, a free-valence locant, a segment, the old-style
 * locants before the root or the suffix's locants (HINTS.nitrogenPlace), and
 * an ester's O-bound side. A name with no parent yet has its own error, and
 * so has a tile already inside another error's range.
 *
 * @param {object} state - Parser state.
 * @param {object} tree - The name tree.
 * @returns {void}
 */
function checkNitrogen(state, tree) {
  const { tiles } = state;
  if (!tree.parent || !tiles.some((tile) => tile.kind === 'nitrogen')) {
    return;
  }
  const { suffix } = tree.parent;
  const amine = Boolean(suffix) && isAmineSuffix(tiles[suffix.tile].value);
  const allowed = new Set(amine ? tree.items.filter((item) => item.type === 'prefix').flatMap((item) => item.locants) : []);
  // A tile already inside another error's range (a stray `N`, numbers with no branch after them) keeps that error alone.
  const covered = (i) => state.errors.some((error) => error.from <= i && i < error.to);
  tiles.forEach((tile, i) => {
    if (tile.kind === 'nitrogen' && !allowed.has(i) && !covered(i)) {
      addTileOrder(state, i, i + 1, amine ? HINTS.nitrogenPlace : HINTS.nitrogen);
    }
  });
} // End of function checkNitrogen()

/**
 * Keeps the groups on the nitrogen of an amino prefix (R-6c2: the prefixes
 * of a compound branch whose own chain is `amino`, at any depth, in the
 * name, inside a compound branch or in an ester's O-bound side) to what the
 * engine writes there: no locants or letter of their own — the nitrogen has
 * one place, so `(metilamino)` cites none (render.js substituentTokens()),
 * and a group with prefixes of its own is a compound branch of its own,
 * `[(2-cloroetil)amino]` — and no group bonded by a C=O carbon (`acetil`,
 * `formil`, `benzoil`, `oil`, `carbonil`), which on the nitrogen makes an
 * amide, no amine (aminoAcylHint()); TILE_ORDER with its hint on each. It
 * runs before checkNitrogen(), so an `N` there keeps this hint.
 *
 * @param {object} state - Parser state.
 * @param {object} tree - The name tree.
 * @returns {void}
 */
function checkAminoGroups(state, tree) {
  const { tiles } = state;
  /**
   * Checks the groups of one amino prefix's nitrogen.
   *
   * @param {object[]} items - The prefix and stray nodes of a compound branch whose own chain is `amino`.
   * @returns {void}
   */
  const checkGroups = (items) => {
    for (const item of items) {
      if (item.type !== 'prefix') {
        continue;
      }
      const marks = [...item.locants, ...(item.letter === null ? [] : [item.letter])];
      if (marks.length > 0) {
        addTileOrder(state, marks[0], marks[marks.length - 1] + 1, HINTS.aminoLocant); // `START 2 met il amino END`
      }
      const sub = item.substituent;
      const core = sub && sub.type === 'branch' ? sub.chain : sub;
      let head = null; // The tile that bonds the group to the nitrogen: a chain's ending, or a retained word.
      if (core && core.type === 'chain' && core.fv !== null) {
        head = core.fv;
      } else if (core && core.type === 'retained') {
        head = core.tile;
      }
      if (head !== null && isAcyloxyHead(tiles[head]) && !isAlkoxyNode(core)) {
        addTileOrder(state, head, head + 1, aminoAcylHint(tiles[head].text)); // `START acetil amino END`: an amide (acylamino)
      }
    } // End of the loop over the groups on the nitrogen
  }; // End of function checkGroups()
  /**
   * Visits the prefixes of one level and the compound branches inside them.
   *
   * @param {object[]} items - Prefix and stray nodes.
   * @returns {void}
   */
  const visit = (items) => {
    for (const item of items) {
      if (item.type !== 'prefix' || !item.substituent || item.substituent.type !== 'branch') {
        continue;
      }
      const branch = item.substituent;
      if (isAminoNode(tiles, branch)) {
        checkGroups(branch.items);
      }
      visit(branch.items);
    } // End of the loop over the level's items
  }; // End of function visit()
  visit(tree.items);
  if (tree.ester) {
    visit(tree.ester.items);
  }
} // End of function checkAminoGroups()

/**
 * The tile of a parent's acid suffix (R-5d1): its `oico` or `carboxílico`
 * suffix tile, or the `benzoico` word, which places its –COOH, or (R-5d2) a
 * retained acid template, which places its –COOH groups (`acético`,
 * `ftálico`); null for a parent without one.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} parent - A parent node.
 * @returns {number|null} The tile index, or null.
 */
export function acidSuffixTile(tiles, parent) {
  if (parent.suffix && isAcidSuffix(tiles[parent.suffix.tile].value)) {
    return parent.suffix.tile;
  }
  if (parent.chain.type === 'template') {
    return isAcidTemplate(tiles[parent.chain.tile].value) ? parent.chain.tile : null; // R-5d2
  }
  const placed = groupWordOf(tiles, parent.chain);
  return placed && isAcidSuffix(placed.suffix) ? parent.chain.tile : null;
}

/** The words of the retained acid templates (R-5d2), in tile order, as the ACID_WORD message lists them. */
const ACID_TEMPLATE_WORDS = Object.freeze(Object.keys(TEMPLATES).filter(isAcidTemplate).map((value) => tileById(`template-${value}`).text));

/**
 * The ACID_WORD message of `ácido` before a retained template that is no
 * acid's (R-5d2: `ácido acetona`): the template's word is not an acid's name,
 * and the retained acid words that do go after `ácido` (drafts pending
 * teacher review).
 *
 * @param {{text: string}} tile - The template tile.
 * @returns {string} The message.
 */
function acidWordTemplateMessage(tile) {
  const words = `${ACID_TEMPLATE_WORDS.slice(0, -1).join(', ')} y ${ACID_TEMPLATE_WORDS[ACID_TEMPLATE_WORDS.length - 1]}`;
  return `La palabra «${ACIDO}» va delante del nombre de un ácido, y «${tile.text}» no es el nombre de un ácido. Los nombres `
    + `tradicionales que van detrás de «${ACIDO}» son ${words} (${ACIDO} ${tileById('template-aceticAcid').text}).`;
}

/**
 * The ACID_WORD message of `ácido` before a retained ester word (R-6a2a:
 * `ácido acetato de metilo`): the word names the acid part of an ester,
 * which is written without `ácido` (draft pending teacher review).
 *
 * @param {{text: string}} tile - The ester template tile.
 * @returns {string} The message.
 */
function acidWordEsterMessage(tile) {
  return `La palabra «${ACIDO}» va delante del nombre de un ácido, y «${tile.text}» es el nombre de la parte ácida de un éster, `
    + `que se escribe sin «${ACIDO}»: ${tile.text}${ESTER_LINK}${EXAMPLES.metilo}.`;
}

/**
 * The ESTER_SUFFIX message of an O-bound side after a retained acid name
 * that has a retained ester word (R-6a2a: `ácido acético de metilo`): the
 * acid's name is no ester's acid part; in the ester the acid is named with
 * its ester word, without `ácido` (`acetato de metilo`). Any other parent
 * gets MESSAGES.ESTER_SUFFIX (draft pending teacher review).
 *
 * @param {{text: string, value: string}} tile - The acid template tile (`acético`).
 * @returns {string} The message.
 */
function esterSuffixTemplateMessage(tile) {
  const ester = tileById(`template-${ACID_ESTER_TEMPLATES[tile.value]}`).text;
  const acid = parentWordName(tile);
  return `El grupo acabado en «${ILO}» va unido al oxígeno de un éster, y «${acid}» es el nombre de un ácido. En el éster, el `
    + `${acid} se nombra «${ester}», sin la palabra «${ACIDO}»: ${ester}${ESTER_LINK}${EXAMPLES.metilo}.`;
}

/**
 * Keeps the class word `ácido` and an acid suffix together (R-5d1,
 * ACID_WORD): `ácido` first with a parent that has no acid suffix (`ácido
 * butanal`), the error on `ácido`; an acid suffix (`oico`, `carboxílico`,
 * `benzoico`) without `ácido` anywhere (`butanoico`), the error on the
 * suffix's tile. R-5d2: a retained acid template is such a suffix
 * (`acético`, the message's example then the student's own word, `ácido
 * acético`), and `ácido` before another template (`ácido acetona`) names the
 * retained acid words; R-6a2a: before a retained ester word (`ácido
 * acetato`), that the ester's acid part is written without `ácido`. An
 * `ácido` out of place already has its TILE_ORDER; a name without a parent
 * its NO_PARENT, ENDS_WITH_BRANCH or BRANCH_OPEN.
 *
 * @param {object} state - Parser state.
 * @param {object} tree - The name tree.
 * @returns {void}
 */
function checkAcidWord(state, tree) {
  const { tiles } = state;
  if (!tree.parent) {
    return;
  }
  const acid = acidSuffixTile(tiles, tree.parent);
  const { chain } = tree.parent;
  const template = chain.type === 'template' ? tiles[chain.tile] : null; // R-5d2
  if (tree.suffixClass && acid === null) {
    // `ácido acetona` (R-5d2); `ácido acetato` (R-6a2a): a retained ester word is written without `ácido`.
    const templateMessage = template && (isEsterTemplate(template.value) ? acidWordEsterMessage : acidWordTemplateMessage);
    addError(state, 'ACID_WORD', tree.suffixClass.tile, tree.suffixClass.tile + 1,
      templateMessage ? templateMessage(template) : MESSAGES.ACID_WORD_ALONE);
  } else if (!tree.suffixClass && acid !== null && !tiles.some((tile) => tile.kind === 'suffixClass')) {
    addError(state, 'ACID_WORD', acid, acid + 1, template ? acidWordMissingMessage(`${ACIDO} ${template.text}`)
      : MESSAGES.ACID_WORD_MISSING);
  }
} // End of function checkAcidWord()

/**
 * The ester suffix of a parent (R-6a1): its `oato` or `carboxilato` suffix
 * — the tile, how many –COO– groups its multiplier gives, and the suffix as
 * the student wrote it with its multiplier (`dioato`, the multiplier's final
 * `a` elided before the vowel as render.js suffixWords() does) —, or the
 * `benzoato` word, which places one, or (R-6a2a) a retained ester word
 * (`formiato`, `acetato`, `fenilacetato`), which places one too, with
 * `template` set (only then, so the other results keep their shape); null for
 * a parent without one.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} parent - A parent node.
 * @returns {{tile: number, count: number, word: string, template?: boolean}|null} The ester suffix, or null.
 */
export function esterSuffixOf(tiles, parent) {
  const { suffix, chain } = parent;
  if (suffix && isEsterSuffix(tiles[suffix.tile].value)) {
    const text = tiles[suffix.tile].text;
    const full = suffix.multiplier === null ? '' : tiles[suffix.multiplier].text;
    const lead = /a$/.test(full) && /^[aeiou]/.test(text) ? full.slice(0, -1) : full;
    return { tile: suffix.tile, count: multiplierCount(tiles, suffix.multiplier), word: `${lead}${text}` };
  }
  if (chain.type === 'template') {
    // `formiato`, `acetato`, `fenilacetato` (R-6a2a): the word places one –COO–.
    const tile = tiles[chain.tile];
    return isEsterTemplate(tile.value) ? { tile: chain.tile, count: 1, word: tile.text, template: true } : null;
  }
  const placed = groupWordOf(tiles, chain);
  return placed && isEsterSuffix(placed.suffix) ? { tile: chain.tile, count: 1, word: tiles[chain.tile].text } : null; // `benzoato`
} // End of function esterSuffixOf()

/**
 * Records TILE_ORDER on every `ilo` (R-6a1) that ends no O-bound group of an
 * ester: one on a prefix of the name (`met ilo et ano oato`), inside a
 * compound branch at any depth, in an ether's class name — anywhere but the
 * own chain of an item of the ester's O-bound side (`top`).
 *
 * @param {object} state - Parser state.
 * @param {object[]} items - Prefix and stray nodes of one level.
 * @param {boolean} top - The level is the ester's O-bound side, whose items may end in `ilo`.
 * @returns {void}
 */
function checkIloPlaces(state, items, top) {
  for (const item of items) {
    if (item.type !== 'prefix' || !item.substituent) {
      continue;
    }
    const sub = item.substituent;
    const ilo = iloTileOf(state.tiles, sub);
    if (!top && ilo !== null) {
      addTileOrder(state, ilo, ilo + 1, HINTS.iloPlace);
    }
    if (sub.type === 'branch') {
      checkIloPlaces(state, sub.items, false);
    }
  } // End of the loop over the level's items
} // End of function checkIloPlaces()

/**
 * Records POSITIONAL on every orto/meta/para letter of an ester's O-bound
 * side (R-6a1), at any depth: the engine never writes them on an O-bound
 * group (design.md §14.4, I-45c), so its locants are numbers. A letter on a
 * group of an amino prefix's nitrogen (R-6c2) is checkAminoGroups()'s.
 *
 * @param {object} state - Parser state.
 * @param {object[]} items - Prefix and stray nodes of one level of the O-bound side.
 * @param {boolean} [amino] - The level is the groups on an amino prefix's nitrogen (default false).
 * @returns {void}
 */
function checkEsterLetters(state, items, amino = false) {
  for (const item of items) {
    if (item.type !== 'prefix') {
      continue;
    }
    if (item.letter !== null && !amino) {
      addError(state, 'POSITIONAL', item.letter, item.letter + 1, POSITIONAL_MESSAGES.ester);
    }
    if (item.substituent && item.substituent.type === 'branch') {
      checkEsterLetters(state, item.substituent.items, isAminoNode(state.tiles, item.substituent));
    }
  } // End of the loop over the level's items
} // End of function checkEsterLetters()

/**
 * Keeps an ester's name (R-6a1, design.md §15.5.2 item 6) to the shape the
 * engine writes: the acid part (the name's prefixes and its parent with the
 * ester suffix `oato` or `carboxilato`, or `benzoato`), then — after the
 * automatic ` de ` — its O-bound side: one O-bound group per –COO– group,
 * each a carbon group ending in `ilo` (a chain or ring, `isopropil`,
 * `tert-butil` or `fenil`, the O-bound group bonded to the bridge oxygen by
 * its carbon 1 or by the carbon whose locant stands before `ilo`), its own
 * prefixes written before its chain (`2 cloro et ilo` → `2-cloroetilo`, no
 * enclosing marks: a word of its own), or, with a multiplier, the whole
 * group in a compound branch (`bis START 2 cloro et ilo END` →
 * `bis(2-cloroetilo)`); two different groups follow each other (the
 * automatic ` y `). The errors, each with its tiles: TILE_ORDER for an `ilo`
 * anywhere else (checkIloPlaces()), locants before a group (they belong
 * inside it), bare prefixes before a multiplied or compound group, prefixes
 * after the last group, a group ending in `il`, and a group that is no carbon
 * group bonded by a single bond (`isopropiliden`, `formil`, `acetil`,
 * `carboxi`, `benzoil`); POSITIONAL for a letter in the O-bound side;
 * ESTER_SUFFIX for an O-bound side after a parent with no ester suffix; and
 * ESTER_GROUPS when the groups (multipliers counted) are not as many as the
 * suffix's –COO– groups (none at all: `etanoato`). Which groups, in which
 * order and words, is the diagnosis's business, not the parser's.
 *
 * @param {object} state - Parser state.
 * @param {object} tree - The name tree.
 * @returns {void}
 */
function checkEsterSide(state, tree) {
  const { tiles } = state;
  checkIloPlaces(state, tree.items, false);
  const ester = tree.parent ? esterSuffixOf(tiles, tree.parent) : null;
  const side = tree.ester;
  if (!side) {
    if (ester) {
      addError(state, 'ESTER_GROUPS', ester.tile, ester.tile + 1, esterGroupsMessage(ester.word, ester.count, 0, ester.template));
    }
    return;
  }
  checkIloPlaces(state, side.items, true);
  checkEsterLetters(state, side.items);
  const { groups, rest } = esterGroupsOf(tiles, side.items);
  let misshapen = false; // A group whose shape is wrong: its count would be another message about the same tiles.
  for (const { items, end } of groups) {
    if (end.locants.length > 0) {
      addTileOrder(state, end.locants[0], end.locants[end.locants.length - 1] + 1, HINTS.esterLocant); // `2 prop ilo`
    }
    const bare = items.filter((item) => item.type === 'prefix');
    if (bare.length > 0 && (end.multiplier !== null || end.substituent.type === 'branch')) {
      // `2 cloro di et ilo`; `2 cloro START et ilo END`.
      const hint = end.multiplier !== null ? HINTS.esterMultiplied : HINTS.esterCompound;
      addTileOrder(state, bare[0].range[0], bare[bare.length - 1].range[1], hint);
      misshapen = true;
    }
    const core = end.substituent.type === 'branch' ? end.substituent.chain : end.substituent;
    if (core.type === 'retained' && !ALKOXY_RETAINED.includes(tiles[core.tile].value)) {
      const word = tiles[core.tile];
      // `isopropiliden ilo`; `acetil ilo`, `carboxi ilo`, `ciano ilo`; `amino ilo` (R-6c2).
      addTileOrder(state, core.tile, core.tile + 1, esterGroupHint(word.text, !isAcylTile(word) && word.value !== 'formyl'
        && word.value !== 'carboxy' && word.value !== 'cyano' && !isAminoTile(word)));
    }
  } // End of the loop over the O-bound groups
  // Numbers or a multiplier with nothing after them (`et ano oato 2`): the name context's NO_PARENT, here a TILE_ORDER of its own.
  rest.filter((item) => item.type === 'prefix' && !item.substituent)
    .forEach((item) => addTileOrder(state, item.range[0], item.range[1], HINTS.esterUnfinished));
  const left = rest.filter((item) => item.type === 'prefix' && isCompleteSubstituent(item.substituent));
  if (left.length > 0) {
    const last = left[left.length - 1];
    const core = last.substituent.type === 'branch' ? last.substituent.chain : last.substituent;
    // The group's own chain or word written with `il`, or without the `ilo` after it: `met il`, `START 2 cloro et il END`,
    // `isopropil`.
    let il = null;
    if (core.type === 'chain' && tiles[core.fv].kind === 'freeValence' && tiles[core.fv].value === 1) {
      il = core.fv;
    } else if (core.type === 'retained' && ALKOXY_RETAINED.includes(tiles[core.tile].value) && core.oxi === null) {
      il = core.tile;
    }
    if (left.length === 1 && last.locants.length === 0 && il !== null) {
      addTileOrder(state, il, il + 1, HINTS.esterIl); // `et ano oato met il`: `metilo`
    } else {
      addTileOrder(state, left[0].range[0], last.range[1], HINTS.esterBranches); // `et ano oato 2 cloro`
    }
  }
  if (!ester) {
    // `etano met ilo`; `ácido acético met ilo` (R-6a2a): the acid's ester word, `acetato`.
    const { chain } = tree.parent;
    const twin = chain.type === 'template' && ACID_ESTER_TEMPLATES[tiles[chain.tile].value];
    addError(state, 'ESTER_SUFFIX', side.range[0], side.range[1], twin ? esterSuffixTemplateMessage(tiles[chain.tile])
      : MESSAGES.ESTER_SUFFIX);
    return;
  }
  const count = groups.reduce((sum, { end }) => sum + multiplierCount(tiles, end.multiplier), 0);
  if (rest.length === 0 && !misshapen && count !== ester.count) {
    addError(state, 'ESTER_GROUPS', ester.tile, side.range[1], esterGroupsMessage(ester.word, ester.count, count, ester.template));
  }
} // End of function checkEsterSide()

/**
 * Tells whether the tiles after the parent are an ester's O-bound side
 * (R-6a1): the parent has an ester suffix, or an `ilo` tile follows (an
 * O-bound group after a parent with none: ESTER_SUFFIX).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} parent - The parent node.
 * @param {number} pos - The position after the parent.
 * @returns {boolean} True for an O-bound side.
 */
function startsEsterSide(tiles, parent, pos) {
  return esterSuffixOf(tiles, parent) !== null || tiles.slice(pos).some((tile) => tile.kind === 'esterAlkyl');
}

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
  const tree = { type: 'name', tiles, suffixClass: null, items: [], parent: null, ester: null, trailing: [], range: [0, tiles.length] };
  // `items`: the name-level prefixes read so far; `ester`: reading an ester's O-bound side (R-6a1).
  const state = { tiles, pos: 0, errors: [], items: tree.items, ester: false };
  if (tiles.length === 0) {
    addError(state, 'EMPTY', 0, 0, MESSAGES.EMPTY);
    return { tree, errors: state.errors };
  }
  if (tiles[0].kind === 'suffixClass') {
    tree.suffixClass = { type: 'suffixClass', tile: 0, range: [0, 1] }; // `ácido` first (R-5d1)
    state.pos = 1;
  }
  while (state.pos < tiles.length) {
    const item = parseItem(state, 'name');
    if (item.type === 'parent') {
      tree.parent = item;
      break;
    }
    tree.items.push(item);
  }
  if (state.pos < tiles.length && tree.parent && startsEsterSide(tiles, tree.parent, state.pos)) {
    // An ester's O-bound side (R-6a1): every tile left, read as the items of a compound branch.
    const side = { type: 'ester', items: [], range: null };
    const start = state.pos;
    state.ester = true;
    while (state.pos < tiles.length) {
      side.items.push(parseItem(state, 'ester'));
    }
    state.ester = false;
    side.range = [start, state.pos];
    tree.ester = side;
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
    } else if (tiles[state.pos].kind === 'suffixClass') {
      addTileOrder(state, state.pos, tiles.length, HINTS.acidWord); // `ácido` after the parent (R-5d1)
    } else {
      addTileOrder(state, state.pos, tiles.length, chain.type === 'classWord' ? HINTS.afterClassWord : HINTS.afterParent);
    }
  }
  if (!tree.parent) {
    checkNameEnd(state, tree);
  } else if (tree.parent.chain.type === 'classWord') {
    checkClassName(state, tree); // `etil metil éter` (R-5b2)
  }
  checkAcidWord(state, tree); // `ácido` and the acid suffix go together (R-5d1)
  checkEsterSide(state, tree); // The ester suffix and its O-bound groups go together (R-6a1)
  checkLetters(state, tree);
  checkClosing(state, tree);
  checkAminoGroups(state, tree); // The groups on an amino prefix's nitrogen (R-6c2), before checkNitrogen()
  checkNitrogen(state, tree); // The locant `N` on an amine's prefixes only (R-6c1)
  const errors = state.errors.map((error, i) => ({ error, i }))
    .sort((a, b) => a.error.from - b.error.from || a.i - b.i)
    .map(({ error }) => error);
  return { tree, errors };
} // End of function parse()
