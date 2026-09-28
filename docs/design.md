# Química orgánica — design and implementation plan

A browser app where a secondary-school student (ESO level, Spain) draws a
hydrocarbon and gets its IUPAC name **in Spanish**, plus a step-by-step
explanation of how the name was decided, with the molecule optionally redrawn
so the main chain is obvious.

This document is the single technical reference. Work is delivered in phases
through the autoclaude inbox (`autoclaude/inbox/NNN-*.md`); each inbox item
names the sections of this file it implements. The plan was reviewed by Codex
(`docs/reviews/plan-review-codex.md`); its findings are folded in below.

---

## 1. Product decisions (fixed)

| Topic | Decision |
|---|---|
| User-facing language | Spanish (Spain). Code, comments, docs: English. |
| Audience | ESO student. Short sentences, no jargon without a tooltip. |
| Nomenclature | **IUPAC 2013 recommendations, preferred IUPAC names (PINs)**, Spanish adaptation. Longest chain first, then unsaturation. Locants immediately before the part they refer to: `hex-2-eno`, `buta-1,3-dieno`. |
| v1 scope | **Acyclic hydrocarbons only**: alkanes, alkenes, alkynes, any branching, single/double/triple bonds, branched, unsaturated and doubly-attached (`-iliden`) substituents. |
| Out of scope v1 | Rings, benzene, heteroatoms, stereochemistry (E/Z, R/S), charges, radicals, name→structure. The editor can draw a ring; naming then says kindly that it is not supported yet. |
| v2 scope (in progress) | Rings and functional groups, level ESO + 1º Bachillerato — plan, phases I-21…I-41 and the user's final decisions in §13. Until a family's phase lands, a valid molecule of that family gets a kind "not nameable yet" message. |
| Platform | Static web app, no backend, works offline. Desktop + tablet (pointer events, touch). |
| Tech | Vanilla JavaScript ES modules, no framework, no build step for development. JSDoc on every function. Unit tests with Node's built-in runner (`node --test`), zero runtime dependencies. Playwright as a dev dependency for end-to-end tests. |
| Distribution | `npm run build` produces `dist/index.html`, one self-contained file (JS + CSS inlined) that opens from `file://` and can be put on any static host. |

### 1.1 Spelling and morphology (Spanish, IUPAC 2013)

- **Stems**: 1 met, 2 et, 3 prop, 4 but, 5 pent, 6 hex, 7 hept, 8 oct, 9 non,
  10 dec, 11 undec, 12 dodec, 13 tridec, 14 tetradec, 15 pentadec,
  16 hexadec, 17 heptadec, 18 octadec, 19 nonadec, 20 icos, 21 henicos,
  22 docos, 23 tricos, 24 tetracos, 25 pentacos, 26 hexacos, 27 heptacos,
  28 octacos, 29 nonacos, 30 triacont. Hard caps: parent chain ≤ 30 C, whole
  molecule ≤ 60 C (the editor refuses more, with a message).
- **Endings**: `-ano`, `-eno`, `-ino`. With both: `en` is always cited before
  `ino`, whatever the locants, and the non-final `eno` loses its `o`:
  `pent-3-en-1-ino`, `hexa-1,3-dien-5-ino`, `hex-1-en-3,5-diino`.
- **Connecting "a"**: keep the stem's `a` when the **first** unsaturation
  segment is multiplied: `buta-1,3-dieno`, `octa-1,7-diino`,
  `hexa-1,3-dien-5-ino`. Do **not** add it merely because a later segment is
  multiplied: `hex-1-en-3,5-diino`. Unsaturated alkanes with no multiplier:
  `but-1-eno`.
- **Multipliers**: di, tri, tetra, penta, hexa, hepta, octa, nona, deca,
  undeca, dodeca… for simple prefixes, even when parenthesised only for
  their own locants (`di(propan-2-il)`); bis, tris, tetrakis, pentakis… for
  compound (substituted) prefixes (`bis(2-metilpropil)`) (IUPAC 2013 P-16.9).
- **Suffixes** (I-31, alcohols; I-32, aldehydes and ketones; I-33,
  carboxylic acids): the principal
  characteristic group follows the parent's ending with its locants and a
  multiplier: `propan-2-ol`, `butano-1,4-diol`, `propano-1,2,3-triol`,
  `butan-2-ona`, `pentano-2,4-diona`, `butanodial` (an aldehyde's locants
  are never cited: its carbon is a chain end, IUPAC 2013 P-14.3.4.1). An
  acid's name starts with the class word `ácido` (lexicon
  `suffixClassWord()`; English has none, `-oic acid` is the suffix) and
  never cites its locants either: `ácido propanoico`, `ácido
  butanodioico`, `ácido 2-metilpropanoico`. An ester (I-35) is two words:
  the acid part with the suffix `-oato` (locant never cited, like an
  acid's) and the O-bound group as a group name, joined by `de` in
  Spanish and in the reverse order in English (`etanoato de metilo`,
  `methyl ethanoate`; lexicon `esterAlkylFirst`, `esterLink`,
  `esterAlkylEnding`; `render.js assembleEster()`). An amine (I-36) takes
  `-amina` with its locants (`propan-2-amina`, `butano-1,4-diamina`,
  `ciclohexanamina`; on benzene `bencenamina`, the `o` of `benceno` elided);
  the other groups on its nitrogen are prefixes with the locant `N`, cited
  before the numbers and always written (`N-metiletanamina`,
  `N,N-dimetilmetanamina`, `N,2-dimetilpropan-1-amina`; IUPAC 2013
  P-62.2.2.1, P-14.3.5: italic letter locants are lower than numbers;
  `structure.js N_LOCANT`), and a non-principal amine is the prefix
  `amino` (`2-aminoetan-1-ol`), with the groups on its N before it, without
  locants, every one after the first enclosed (`(metilamino)`,
  `(dimetilamino)`, `[etil(metil)amino]`: a compound prefix alphabetised
  under its first letter, `bis(metilamino)`; decided from memory of the
  IUPAC 2013 examples, confirmed by OPSIN). An amide (I-37) takes `-amida`
  with its locant never cited, like an acid (`etanamida`,
  `2-metilpropanamida`, `butanodiamida`, `prop-2-enamida`), and the groups
  on its N are `N` prefixes exactly as for an amine (`N-metiletanamida`,
  `N,N-dimetiletanamida`, `N,2-dimetilpropanamida`). A nitrile (I-38) takes
  `-nitrilo` with its locant never cited, like an acid (`etanonitrilo`,
  `2-metilpropanonitrilo`, `butanodinitrilo`); its C≡N is never an `-ino`
  and its N never a chain atom; a nitrile that is not principal, or lies on
  a branch, is the prefix `ciano` (I-39a), whose carbon is not a chain
  carbon (`ácido 3-cianopropanoico`); the parent keeps its final `o` before the
  consonant (`prop-2-enonitrilo`, English `prop-2-enenitrile`, P-16.7.1;
  decided from memory, confirmed by OPSIN). The final `o` of `-ano`,
  `-eno`, `-ino` is elided before a vowel and kept before a consonant
  (IUPAC 2013 P-16.7.1): `etanol`, `prop-2-en-1-ol`, `but-3-in-2-ol`, but
  `etano-1,2-diol`, `but-2-eno-1,4-diol` (English `ethanol`,
  `ethane-1,2-diol`). The connecting `a` still depends only on the first
  unsaturation segment (`penta-1,4-dien-3-ol`). An OH on benzene gives the
  retained `fenol` (P-63.1.1.1; `bencenol` is not used), rendered `fen` +
  `ol`. Decided (IUPAC 2013 P-16.7.1(c), fixtured): the final `a` of a
  suffix multiplier is elided before a vowel-initial suffix —
  `butano-1,2,3,4-tetrol`, `pentano-1,2,3,4,5-pentol` (English
  `butane-1,2,3,4-tetrol`); `di`/`tri` are unchanged (`diol`, `triol`) and
  prefix multipliers always keep their `a` (`tetrametil`, `tetracloro`)
  (`render.js suffixWords()`).
- **Group name vs. prefix**: groups named on their own take a final `o`
  (`metilo`, `etilo`, `metilideno`, `etilideno`, `isopropilo`); cited as a
  prefix inside a name they drop it (`metil`, `etil`, `metiliden`,
  `etiliden`, `isopropil`, `(propan-2-il)`). So `3-metilidenhexano`,
  `4-etilidenheptano`, `5-isopropilnonano`. Explanations use the standalone
  form when talking about the group ("el grupo metilo") and the prefix form
  when building the name. The O-bound group of an ester (I-35) is written
  in its standalone form, never enclosed: `etanoato de metilo`,
  `butanoato de isopropilo` (`propan-2-ilo`, `1-metiletilo` in the other
  styles), `etanoato de tert-butilo`, `etanoato de 2-cloroetilo`,
  `etanoato de prop-2-en-1-ilo` (`render.js esterAlkylName()`).
- **Substituent prefixes — user decision: `isopropil` by default.** The
  `–CH(CH₃)₂` group is cited as **`isopropil`** in the main name (a simple
  prefix: no parentheses, `di`/`tri` grouping — `2,3-diisopropil…` — and
  alphabetised under **i**, since `iso` counts). IUPAC 2013 accepts it in
  general nomenclature. Every other group uses the 2013 preferred prefix:
  `metil`, `etil`, `propil`, `butil`…; `butan-2-il` (not `sec-butil`),
  `2-metilpropil` (not `isobutil`), retained `tert-butil`, `etenil`,
  `etinil`, `prop-2-en-1-il` (not `alil`, not `prop-2-enil`),
  `prop-1-en-2-il`… Other common names (`vinilo`, `alilo`, `isobutilo`,
  `sec-butilo`) appear only in explanatory notes ("también se conoce como
  vinilo").
- **Alkoxy prefixes (ethers, I-34; `render.js alkoxyTokens()`,
  `isContractedAlkoxy()`).** An ether O with the group on its other side is
  one prefix. A saturated group of 1–4 carbons bonded to the O by its
  carbon 1 is contracted, also when substituted (IUPAC 2013 P-63.2.2.2):
  `metoxi`, `etoxi`, `propoxi`, `butoxi`, `(2-metilpropoxi)`,
  `(2-cloroetoxi)`, `(1-metiletoxi)`; the retained groups follow the
  prefix styles, `isopropoxi` (default) / `(propan-2-iloxi)` (pin) /
  `(1-metiletoxi)` (classic), and `tert-butoxi` (default and pin) /
  `(1,1-dimetiletoxi)`; every other group is its prefix + `oxi`, enclosed
  as a compound prefix and multiplied with bis: `(pentiloxi)`,
  `(butan-2-iloxi)`, `(eteniloxi)`, `(prop-2-en-1-iloxi)` (decided from
  memory: the 2013 recommendations may write `(propan-2-yl)oxy`; OPSIN reads
  both). The group is called by its prefix in explanations ("el grupo
  metoxi"), never `metoxilo`.
- **Alternative names ("Otras formas válidas").** Whenever the molecule
  contains an isopropyl group (or its doubly attached analogue, cited as
  `isopropiliden` by default, `propan-2-iliden` in PIN style and
  `1-metiletiliden` in the classic style), the result also lists the name in
  the other two accepted styles, each labelled:
  - `5-(propan-2-il)nonano` — "nombre preferido por la IUPAC (2013)";
  - `5-(1-metiletil)nonano` — "forma sistemática clásica".
  Changing the prefix changes its alphabetical position (`i` vs `p` vs `m`),
  which can change the citation order **and** the N4 numbering decision, so
  each alternative is produced by re-running prefix sorting and N4 (§4.4)
  under that style — never by substituting text in the main name. The
  engine takes a `prefixStyle` option: `'isopropil'` (default), `'pin'`,
  `'substituted'`. A benzene derivative with a traditional name that IUPAC
  2013 still retains (P-22.1.3; I-28) lists it last, style `traditional`:
  `metilbenceno` → `tolueno` ("nombre tradicional, que la IUPAC (2013)
  conserva como preferido": toluene is even the 2013 preferred name, but the
  systematic name comes first, §13.1), `etenilbenceno` → `estireno`
  ("nombre tradicional, que la IUPAC (2013) acepta"), `metoxibenceno` →
  `anisol` (I-34, "acepta": retained, its exact 2013 status from memory).
  Cumene is no longer retained, so `isopropilbenceno` gets no `cumeno`. An
  ether made of one O between two simple alkyl groups (unbranched ones
  bonded by their end, `isopropil`, `tert-butil`; no other atom, no ring,
  no multiple bond) also lists its functional-class name last, style
  `functionalClass` (I-34, P-63.2.2.1, accepted in general nomenclature and
  taught in Spanish textbooks): the group names in alphabetical order
  (`tert-` ignored, the plain name first on a tie) and `éter` —
  `etil metil éter`, `tert-butil metil éter`, `butil tert-butil éter`,
  `dietil éter`. An ester whose acid part is a bare metanoato or etanoato
  (I-35) lists its traditional form last, style `traditional`, whatever its
  O-bound group: `formiato de metilo`, `acetato de etilo`, `acetato de
  isopropilo` (the default-style group), labelled like `ácido acético`
  («nombre tradicional, que la IUPAC (2013) conserva como preferido»:
  acetate and formate follow the retained acids, P-65.6.3.2, from memory);
  no other ester names (propionato, butirato…). A benzene amine (I-36)
  lists `anilina` last, style `traditional`, with the groups on its N
  (`N-metilanilina`, `N,N-dimetilanilina`), labelled like `tolueno`
  (IUPAC 2013 retains aniline as the preferred name, P-62.2.1.1.1, from
  memory; the app keeps the systematic `bencenamina` first, as the plan
  asks for traditional names under "Otras formas válidas"). A monoamide
  (I-37) on a bare one- or two-carbon chain lists `formamida` / `acetamida`
  last, style `traditional`, with the groups on its N (`N-metilacetamida`,
  `N,N-dimetilformamida`), labelled like `tolueno` (IUPAC 2013 retains
  formamide and acetamide as preferred names, P-66.1.1.1.1, from memory);
  no other amide names (propionamida…). The bare etanonitrilo (I-38) lists
  `acetonitrilo` last, style `traditional`, labelled like `tolueno` (IUPAC
  2013 retains acetonitrile as the preferred name, P-66.5.1.1.1, from
  memory); no other nitrile name (`formonitrilo`, `propionitrilo`,
  `acrilonitrilo`) and no `cianuro de …` name. A molecule
  that is one amine N with one to three simple alkyl groups (the ether
  rule above) lists its traditional alkylamine name last, style
  `amineClass` («nombre tradicional (los grupos unidos al nitrógeno y la
  palabra «amina»), muy usado en los libros»; its IUPAC 2013 status is not
  claimed): the group names in alphabetical order (`tert-` and the
  multipliers ignored), identical ones multiplied, and `amina`, in one
  word — `metilamina`, `dimetilamina`, `trimetilamina`, `etilmetilamina`,
  `etildimetilamina`, `di-tert-butilamina`. No amino-acid names (alanina,
  glicina…) are offered.
- **Locant omission** is an explicit rule table, never inferred from "only
  one structural possibility":
  - Unsubstituted parents with omitted locants: `metano`, `etano`, `eteno`,
    `etino`, `propeno`, `propino`, `propadieno`.
  - Everything else keeps all locants: `2-metilpropano`,
    `2-metilprop-1-eno`, `but-1-eno`, `2,2-dimetilpropano`.
  - Substituent prefixes: `metil`, `etil`, `etenil`, `etinil`, `metiliden`,
    `etiliden` carry no internal locant; longer ones always do
    (`prop-2-en-1-il`, `propan-2-il`), except the named group `isopropil`.
  - Ring parents (I-26, `ringOmitsLocants()` in `lexicon.es.js`, shared by
    the English lexicon): an **unsubstituted monocycle with exactly one
    multiple bond** omits its locant — `ciclohexeno`, `ciclooctino` (every
    lowest-locant numbering puts the bond at 1; IUPAC 2013 P-31.1.4.2.4
    names these cyclohexene, cyclooctyne); a **saturated monocycle with
    exactly one substituent** omits that substituent's locant —
    `metilciclohexano`, `metilidenciclohexano`, `decilciclopropano`
    (P-14.3.4.2(c): the locant 1 is omitted in a monosubstituted parent
    hydride with only one kind of substitutable hydrogen). Everything else
    keeps all its locants, the `1` of a ring double bond included, as
    `but-1-eno` does: `3-metilciclohex-1-eno`, `1-metilciclohex-1-eno`,
    `ciclohexa-1,3-dieno`, `1,1-dimetilciclohexano`. The explanation notes
    that some textbooks drop that `1` (`3-metilciclohexeno`).
  - Benzene (I-28): the ring is the retained `benceno` (never
    `ciclohexa-1,3,5-trieno`, P-22.1.2), so its double bonds are never
    cited, and a single substituent has no locant (`metilbenceno`,
    P-14.3.4.2(c)); polysubstituted benzenes are refused (§3.2).
  - Halogen derivatives (I-30; `chainOmitsPrefixLocants()` in
    `lexicon.es.js`, shared with English). Hydrocarbon chains can never put
    prefixes on these parents, so only halogens reach the rule: a one-carbon
    parent cites no prefix locant (`clorometano`, `triclorometano`,
    `tetraclorometano`; P-14.3.4.2(a)); a two-carbon parent with exactly one
    substituent neither (`cloroetano`, `cloroeteno`, `cloroetino`;
    P-14.3.4.2(b)), but two substituents keep theirs (`1,1-dicloroetano`,
    `1,2-dicloroeteno`); a one- or two-carbon parent never cites the locant
    of its own multiple bond, prefixes or not (`cloroeteno`,
    `1,2-dicloroeteno`); and a parent whose every hydrogen is replaced by one
    and the same halogen omits all its prefix locants (`hexacloroetano`,
    `tetrafluoroeteno`, `dodecafluorociclohexano`; P-14.3.4, completely
    substituted parent) while keeping its unsaturation locants
    (`hexaclorobuta-1,3-dieno`: buta-1,2-dieno would be another C₄Cl₆).
    With two different halogens the locants stay
    (`1,1,1-tricloro-2,2,2-trifluoroetano`). Without locants, consecutive
    prefixes are written together (`clorotrifluorometano`). Inside a
    one-carbon substituent the nested prefix has no locant either
    (`(clorometil)`, `(trifluorometil)`).
  - Alcohols (I-31): the suffix locants follow the same rules as the prefix
    locants, counting every OH and every prefix as one substituent — a
    one-carbon parent cites none (`metanol`, `metanodiol`,
    `triclorometanol`), a two-carbon parent with exactly one substituent
    neither (`etanol`, `etenol`, `etinol`), but two substituents keep all
    their locants (`etano-1,2-diol`, `2-cloroetan-1-ol`, IUPAC 2013
    `2-chloroethan-1-ol`; `2-cloroeten-1-ol`); a saturated ring whose only
    substituent is one OH omits it (`ciclohexanol`), any other ring cites
    the 1 of the OH (`2-metilciclohexan-1-ol`, `ciclohex-2-en-1-ol`,
    `ciclohexano-1,4-diol`); from three chain carbons every locant is cited
    (`propan-1-ol`). A parent with a suffix never uses the unsubstituted
    table (`prop-2-en-1-ol`, not `propenol`) nor the fully-halogenated rule
    (`2,2,2-tricloroetan-1-ol`).
  - Aldehydes and ketones (I-32): an aldehyde never cites its suffix
    locants on a chain (`propanal`, `2-metilpropanal`, `butanodial`;
    IUPAC 2013 P-14.3.4.1); its prefixes follow the rules above
    (`2-cloroetanal`, as `2-cloroetan-1-ol`). A ketone's locants follow
    the alcohol rules (`butan-2-ona`, `ciclohexanona`,
    `2-metilciclohexan-1-ona`), plus one explicit case: bare `propanona`
    (a three-carbon saturated parent whose only substituent is one ketone
    suffix) omits its locant, as the design and Spanish school books write
    it; IUPAC 2013 cites it in the preferred name, so `propan-2-ona` is
    listed under "Otras formas válidas" (`renderName(…, {citeLocants})`).
  - Carboxylic acids (I-33): like an aldehyde, an acid never cites its
    suffix locants (`ácido etanoico`, `ácido butanodioico`); its prefixes
    follow the rules above (`ácido 2-cloroetanoico`, as `2-cloroetanal`),
    and with a suffix a multiple bond's locant is always cited (`ácido
    prop-2-enoico`, as `prop-2-enal`).
  - Esters (I-35): the acid part follows the acid rules (`etanoato de
    metilo`, `2-cloroetanoato de metilo`, `prop-2-enoato de metilo`); the
    O-bound group follows the substituent rules (`2-cloroetilo`,
    `prop-2-en-1-ilo`, `metoximetilo`).
  - Amines (I-36): the `-amina` locants follow the alcohol rules
    (`metanamina`, `etanamina`, `ciclohexanamina`, `triclorometanamina`, but
    `propan-1-amina`, `etano-1,2-diamina`, `2-cloroetan-1-amina`). The
    groups on the N are not on the parent hydride's carbons, so they do not
    count for the omission (`render.js carbonLocantPrefixes()`):
    `N-metiletanamina`, `N,N-dimetilmetanamina`, `N-metilciclohexanamina`,
    `N-metilbencenamina`. An `N` locant is never omitted, and when one is
    written the carbon prefix locants are written too (decided, as
    ChemDraw does; the 2013 text is not explicit): `1-cloro-N-metilmetanamina`,
    while the suffix keeps its own rule (no `-1-` on `metanamina`).
  - Amides (I-37): the `-amida` locant is never cited (a chain end, like an
    acid's); the prefixes follow the acid rules (`2-cloroetanamida`,
    `2-metilpropanamida`) and the groups on the N the amine rules
    (`N-metiletanamida`, `N,2-dimetilpropanamida`).
  - Nitriles (I-38): the `-nitrilo` locant is never cited (a chain end,
    like an acid's); the prefixes follow the acid rules
    (`2-cloroetanonitrilo`, `2-metilpropanonitrilo`, `2,2,2-trifluoroetanonitrilo`).
  - Ethers (I-34): an alkoxy prefix follows the halogen rules (`metoximetano`,
    `metoxietano`, `metoxieteno`, `metoxiciclohexano`, `metoxibenceno`; but
    `1-metoxipropano`, `1,2-dimetoxietano`, `2-metoxietan-1-ol`). Where the
    locants are omitted and other prefixes stand beside it (a one-carbon
    parent or group), the alkoxy prefix is enclosed so the words cannot run
    into one compound prefix (`render.js enclosedInName()`, P-16.5.1):
    `cloro(metoxi)metano` (`clorometoximetano` would read as
    `(clorometoxi)metano`), `dicloro(metoxi)metano`,
    `fluoro[fluoro(metoxi)metoxi](metoxi)metano`.
- **Punctuation**: numbers separated by commas, numbers and letters by
  hyphens; prefixes written together with the parent
  (`3-etil-2-metilhexano`); parentheses around compound prefixes.
- **Alphanumerical order** (§4.7): by the complete substituent-prefix name,
  ignoring its attachment locants and external grouping multipliers (di,
  bis…), but keeping multiplying syllables inside a compound prefix
  (`(2,2-dimetilpropil)` sorts under **d**). Ignore `tert-` (and `sec-`), keep
  `iso`. If alphabetic parts are equal, compare the numeric parts
  numerically. The Spanish name is alphabetised with its Spanish words
  (I-30): halogen prefixes sort as `bromo` < `cloro` < `fluoro` < `yodo`,
  mixed with the alkyl prefixes (`2-bromo-1-cloropropano`,
  `1-bromo-2-metilpropano`), and `yodo` goes under **y**, so the N4 tie-break
  can differ from the English name (`2-metil-4-yodopentano`, where English
  sorts iodo under i: 2-iodo-4-methylpentane). Alkoxy prefixes (I-34) sort
  by their whole word too: `metil` < `metoxi` (`2-metil-2-metoxipropano`,
  English `2-methoxy-2-methylpropane`), `bromo` < `butoxi` < `cloro`,
  `tert-butoxi` under **b**. The oracle renders the
  Spanish structure in English, so its English names keep the Spanish
  citation order (OPSIN reads them regardless).

---

## 2. Repository layout

```
index.html              app shell (Spanish UI)
css/app.css             styles, light/dark via tokens
src/
  model/molecule.js     graph: atoms, bonds, valence, implicit H, formula
  model/validate.js     full graph validation (§3.2), shared by every entry point
  model/smiles.js       tiny SMILES parser/writer (C O N F Cl Br I, branches, ring closures)
  model/graph.js        connectivity, cycle detection, paths, canonical tree and monocycle keys
  model/rings.js        ring perception (members, closures, blocks, attachments) and classification
  naming/lexicon.es.js  Spanish word tables (stems, multipliers, endings, retained prefixes)
  naming/lexicon.en.js  English tables — used only by the oracle (§8)
  naming/parent.js      parent-chain candidates and selection cascade
  naming/numbering.js   locant-list comparison, numbering cascade
  naming/substituent.js recursive substituent naming
  naming/rings.js       ring parents: cycloalkanes (ciclo + stem + ano, §13.4 I-25)
  naming/aromatic.js    benzene and monosubstituted benzenes, fenil prefix (§13.4 I-28)
  naming/structure.js   the language-neutral "name structure" (§4.7)
  naming/render.js      name structure + lexicon → string and coloured parts
  naming/index.js       nameMolecule(mol) → result (§4.1)
  explain/explain.js    trace → ordered Spanish steps with highlight data
  editor/editor.js      SVG sketcher: tools, pointer handling, transactions
  editor/history.js     undo/redo of transactions
  editor/geometry.js    placement angles, snapping, bond length
  editor/render.js      SVG rendering (skeletal and condensed modes)
  layout/canonical.js   redraw: main chain horizontal zigzag, branches placed
  layout/rings.js       redraw ring strategy: regular polygon, side-chain directions (§7)
  layout/rightangle.js  90° view: display-only right-angle projection (§6.3)
  ui/app.js             wires editor, toolbar, canvas bar, autosave, results panel
  ui/results.js         name button, coloured name, alternatives, errors, stepper
  ui/examples.js        example gallery
  ui/toolbar.js         drawing toolbar (tools, Deshacer/Rehacer/Limpiar)
  ui/feedback.js        in-page toast and confirmation dialog
  ui/canvasbar.js       bar under the canvas: formula, Esqueleto/Con carbonos, Ángulos rectos (90°), Centrar
  ui/autosave.js        localStorage autosave/restore (injected storage, try/catch)
tests/
  unit/*.test.js        node --test
  fixtures/names.tsv    SMILES <TAB> expected name <TAB> rule tested <TAB> justification
  fixtures/explain-snapshots.json  explain() output for ~60 fixtures (UPDATE_SNAPSHOTS=1 regenerates)
  e2e/*.spec.js         Playwright
scripts/
  build.mjs             inline everything into dist/index.html (no deps)
  oracle/               OPSIN cross-check tooling (§8), never bundled
docs/design.md          this file
```

`package.json` scripts: `test` (`node --test "tests/unit/**/*.test.js"`),
`e2e` (`playwright test`), `build` (`node scripts/build.mjs`), `serve`
(`node scripts/serve.mjs`, zero-dependency static server on port 8000, also
used by Playwright), `check` (`scripts/check.mjs`: `node --check` on every
`.js`/`.mjs` file under the root, `src/`, `tests/`, `scripts/`, plus a scan
for `alert`/`confirm`/`prompt` in app code), `oracle` (§8).

---

## 3. Molecule model

### 3.1 Data

- `Molecule { atoms: Map<id, Atom>, bonds: Map<id, Bond> }`; ids are
  incrementing integers, stable across undo/redo and redraw.
- `Atom { id, element, x, y }` with `element` ∈ C, O, N, F, Cl, Br, I
  (`model/elements.js`, since I-21; carbon is the default). Coordinates
  matter only to the editor and layout; **the naming engine must never read
  them.**
- `Bond { id, a, b, order: 1|2|3 }`.
- Neutral valences live in ONE table (`VALENCES` in `model/elements.js`):
  C 4, N 3, O 2, F/Cl/Br/I 1. `implicitH(atom) = valence(element) − Σ order`
  (never negative: validation guarantees it). No charges, radicals, isotopes
  or explicit H counts exist in the model.
- Derived: molecular formula in Hill order (`C₂H₆O`, `CH₃Cl`; alphabetical
  when there is no carbon: `H₂O`, `ClH`), neighbours, connected components,
  `hasCycle()`, `cyclomaticNumber()`, `isEmpty()`; ring perception and
  classification in `model/rings.js` (§13.2). Structural identity:
  `canonicalKey()` in `model/graph.js` — the unrooted canonical tree key for a
  tree, the monocycle key (smallest reading over every ring rotation and
  reflection, side chains as rooted tree keys) for one ring; polycycles have
  no key yet.
- JSON serialisation (autosave, undo snapshots), unchanged format (version 1):
  old carbon-only saves restore unchanged. Restoration rejects (as `INVALID`)
  a missing or unknown element and any atom or bond field beyond
  `id, element, x, y` / `id, a, b, order` (e.g. `charge`, `radical`,
  `hCount`, `aromatic`), so charges and radicals are never accepted by
  accident.
- `smiles.js`: parses the organic-subset atoms `C O N F Cl Br I` (implicit
  H from the element table), bracket atoms with one of those elements and an
  optional H count (`[CH4]`, `[OH]`, `[NH2]`; the count must equal the one
  the model derives, else `SMILES_HYDROGEN`), `=`, `#` (and an optional
  explicit `-`), parenthesised branches, ring closures `1`–`9` and `%nn`
  with an optional bond symbol on either end (`C1CC=1`, `C=1CC1`); rejects
  invalid closures (`SMILES_RING`: unclosed label, closure to the same atom
  `C11`, a second bond between the same pair `C1C1`, different orders on the
  two ends), other elements,
  aromatic lowercase atoms, charges, isotopes, atom classes, `[H]` atoms,
  dots, stereo marks, dangling bonds and unbalanced or empty parentheses —
  with an explicit error (developer-facing, English), never by silently
  dropping input. The writer (debugging, examples, oracle) writes every
  element as an organic-subset symbol, so round trips keep element identity,
  and writes every bond outside its depth-first tree as a ring closure (bond
  symbol at the opening end, smallest free label); acyclic output is
  unchanged. Parser and writer are iterative.
  Fixtures use SMILES, so the test suite never depends on coordinates.

### 3.2 Validation (single function, used everywhere)

`validate(mol)` (`validateStructure` + `validateForNaming` in
`model/validate.js`) checks: atom and bond ids unique; bond endpoints exist; no
self-bonds; no duplicate bonds between the same pair; orders ∈ {1,2,3};
supported elements only, with no charge/radical fields; Σ order ≤ the
element's neutral valence; then, for naming only: non-empty, connected,
ring scope (a ring is classified by `model/rings.js`: a single carbocycle
with at most 30 ring carbons passes, with or without side chains and ring
multiple bonds (I-25 bare rings, I-26 substituted and unsaturated ones), a
**benzene ring** — six ring carbons with alternating double and single
bonds, named by `naming/aromatic.js` since I-28 — included, but only with at
most one substituent: two or more → `CYCLE` with `ringReason`
`polysubstitutedBenzene` (and `substituted`, the substituted ring atoms; no
orto/meta/para, §13.1); a ring above 30 carbons → `TOO_BIG`; any other ring system →
`RING_SYSTEM` with `ringKind`; all carry the ring atoms in `atoms`), size
caps (≤ 60 carbons `MAX_CARBONS`, ≤ 80 heavy atoms `MAX_HEAVY_ATOMS`, rings
included), carbon, halogens bonded to a carbon (`isHalogenDerivative()`,
I-30), OH groups on a carbon (an oxygen with exactly one single bond, to
a carbon: `isHydroxyOxygen()`, `hasNameableHeteroatoms()`, I-31) and the
C=O of aldehydes and ketones (an oxygen with exactly one double bond, to a
carbon whose other neighbours are all carbons on single bonds:
`carbonylKind()`, 'aldehyde' with at most one of them, 'ketone' with two,
I-32) and the two O of a carboxyl group (a carbon with exactly one O on a
double bond and one OH, both bonded to nothing else, and at most one other
neighbour, a carbon on a single bond: `isCarboxylCarbon()`,
`carboxylRole()`, I-33) and ether oxygens (an O with exactly two single
bonds, both to carbons, neither a functional carbon with a multiple bond
to a heteroatom: `isEtherOxygen()`, I-34; an O inside a ring is a
heterocycle, `RING_SYSTEM` first) and the two O of an ester group (a
carbon with exactly one O on a double bond bonded to nothing else, one O
on a single bond whose only other neighbour is a carbon that is not a
functional carbon, and at most one other neighbour, a carbon on a single
bond: `isEsterCarbon()`, `esterRole()` 'carbonyl' / 'bridge', I-35; a
lactone is a heterocycle) and amine nitrogens (an N with one to three
bonds, all single, all to carbons that are not functional carbons:
`isAmineNitrogen()`, `amineNitrogens()`, I-36; an N inside a ring is a
heterocycle, `RING_SYSTEM` first) and the O and N of an amide group (a
carbon with exactly one O on a double bond bonded to nothing else, exactly
one N on a single bond whose other bonds are single bonds to carbons that
are not functional carbons, and at most one other neighbour, a carbon on a
single bond: `isAmideCarbon()`, `amideRole()` 'carbonyl' / 'nitrogen',
I-37; a lactam is a heterocycle) and the N of a nitrile group (an N whose
only bond is a triple bond to a carbon with at most one other neighbour, a
carbon on a single bond: `isNitrileCarbon()`, `isNitrileNitrogen()`,
`nitrileCarbons()`, I-38) only (`HETEROATOM` for any other atom — an N
of an imide (`reason` `imide`, `imides` the nitrogens, its own message), a urea, carbamate, hydrazide, imine, cyanamide, NH₃, N–N, N–O, an N bonded to a halogen, any
other O such as those of anhydrides, carbonates, peroxy esters, acyl halides, carbonic acid
or ketenes, O–O, a halogen bonded to a heteroatom or to nothing, or to a
nitrile carbon (Cl–C≡N), a cyanate O–C≡N;
charged atoms, so salts and ammonium ions, are already `INVALID`, and a
fourth bond on N is `VALENCE`), then the placement of the
oxygen groups (`oxygenPlacementError()`, `HETEROATOM` with a `reason`): with
a ring, no acid at all (`ringAcid`, `acids` the carboxyl carbons: a –COOH
carbon is never a ring atom, so it would be a `-carboxílico` or a side
chain, I-40), no ester at all (`ringEster`, `esters` the ester carbons:
the ring would be on the acid side, `-carboxilato`, on the O side,
`fenilo`/`ciclohexilo`, or on a side chain of either, I-40), no aldehyde at all (`ringAldehyde`: a –CHO carbon is never a ring atom, so it
would be a `-carbaldehído` or a side chain, I-40), no ketone C=O on a side
chain (`sideChainCarbonyl`) and no OH on a side chain (`sideChainAlcohol`),
each with `sideChain` the oxygens (`sideChainCarbonyls()`,
`sideChainHydroxyls()`: that parent would be the chain, with the ring as a
`ciclohexil`/`fenil` substituent, planned for I-40); at most two acids
(`manyAcids`, `acids`: a chain has two ends, a third –COOH would be a
`carboxi-` branch or all would need `-carboxílico`); no acid with an
ester (`esterPrefix`, `acids` and `esters`: the acid is principal, so the
ester would be an `alcoxicarbonil-` / `aciloxi-` prefix, I-39c); at most
one ester (`manyEsters`, `esters`: diesters and an ester inside the
O-bound group of another wait for I-39c); without a ring, at
most two aldehydes (`manyAldehydes`, `aldehydes`: a chain has two ends,
more need `-carbaldehído`), with a ring and the amine as the principal
group (no oxygen group other than ether oxygens), every amine N bonded to
a ring carbon (`aminePlacementError()`, `sideChainAmine`, `sideChain` the
nitrogens: `C₆H₅CH₂NH₂` would have the chain as parent, `fenilmetanamina`,
I-40; with an OH or ketone on the ring the amine is `amino-` anywhere),
and for amides (`amidePlacementError()`, `amides` the amide carbons): none
with a ring (`ringAmide`: `-carboxamida`, `benzamida`, `N-fenil…`, I-40),
none with an acid or an ester (`amidePrefix`: the amide would be a
`carbamoil-` / `acilamino-` prefix, I-39c), at most two (`manyAmides`), two
only on one carbon piece (`amidePrefix` otherwise: one would be a branch)
and with no group on either N (`substitutedPolyamide`: N¹/N⁴ locants),
and for nitriles (`nitrilePlacementError()`, `nitriles` the nitrile
carbons): none with a ring (`ringNitrile`: `-carbonitrilo`, `benzonitrilo`,
or a ring beside a nitrile chain, I-40), none bonded to the carbon of an
acid, an ester or an amide (`carbonocyanidic`: NC–COOH is a carbonic acid
derivative, `ácido carbonocianídico`, not `ácido cianometanoico`; I-39a),
and, with the nitrile principal (no acid, ester or amide), at most two on
one carbon piece (`manyNitriles`: a third would need `-carbonitrilo`);
any other nitrile beside an acid, ester or amide, or on another carbon
piece, is named with the `ciano-` prefix (I-39a),
parent chain
≤ 30 carbons (`MAX_CHAIN`, measured on the carbon skeleton, `carbonSkeleton()`
in `graph.js`, so a halogen never lengthens a chain and an ether O splits
it, every side of the O measured on its own, `longestCarbonChain()`; for a ring, every side
chain ≤ 30: `longestSideChain()`). The same checks guard editor transactions, JSON restoration
(corrupt autosave → start empty, no crash) and SMILES input.

Two kinds of naming failure are kept apart: an **invalid structure**
(`INVALID`, `VALENCE`: the drawing itself is wrong) and a **valid molecule
that cannot be named** (`CYCLE`, `RING_SYSTEM`, `HETEROATOM`; `isNotNameableYet()`).
Errors are codes with Spanish messages:

| Code | Message |
|---|---|
| `EMPTY` | Dibuja primero una molécula. |
| `DISCONNECTED` | Hay piezas sueltas: todas las partes deben estar unidas. |
| `CYCLE` | Since I-28 only a benzene ring with two or more substituents (`ringReason` `polysubstitutedBenzene`; valid, out of scope, §13.1), with the count: Este benceno tiene 2 sustituyentes. Solo sé nombrar el benceno con un sustituyente como máximo (como el metilbenceno): los bencenos con dos o más sustituyentes quedan fuera de lo que sé nombrar. (`MESSAGES.CYCLE` says «varios sustituyentes».) Benzene and monosubstituted benzenes, refused with `ringReason` `benzene` before I-28, are named; so are the substituted and unsaturated single carbocycles refused in I-24/I-25. A benzene with a ring in its substituent is `RING_SYSTEM` (`several`). |
| `RING_SYSTEM` | Out of scope (§13.1), one message per `ringKind`: `heterocycle` Este anillo tiene átomos que no son carbono: es un heterociclo. Los heterociclos quedan fuera de lo que sé nombrar. · `fused` Has dibujado anillos fusionados (dos anillos que comparten un enlace). Este tipo de moléculas queda fuera de lo que sé nombrar. · `bridged` Has dibujado anillos con puente (dos anillos que comparten más de dos átomos). … · `spiro` Has dibujado un compuesto espiro (dos anillos que comparten un solo átomo). … · `several` Esta molécula tiene varios anillos. De momento solo podré nombrar moléculas con un único anillo. (generic: Esta molécula tiene anillos que quedan fuera de lo que sé nombrar.) |
| `VALENCE` | Este carbono tendría más de 4 enlaces. — per element for the lowest-id offending atom: Este oxígeno tendría más de 2 enlaces. / Este nitrógeno tendría más de 3 enlaces. / Este cloro (flúor, bromo, yodo) tendría más de 1 enlace. (The editor's "full" refusal likewise: Este oxígeno ya tiene 2 enlaces.) |
| `TOO_BIG` | La molécula es demasiado grande (máximo 60 carbonos, cadena de 30). — also a ring side chain above 30 carbons — heavy-atom cap: La molécula es demasiado grande (máximo 80 átomos sin contar los hidrógenos). — a ring above 30 carbons: El anillo es demasiado grande (máximo 30 carbonos en el anillo). |
| `HETEROATOM` | Esta molécula tiene átomos que no son carbono ni hidrógeno. Aún no sé nombrar este tipo de compuestos: de momento solo nombro hidrocarburos, derivados halogenados (con flúor, cloro, bromo o yodo unidos a un carbono), alcoholes (con grupos –OH unidos a un carbono), aldehídos y cetonas (con un oxígeno unido a un carbono por un enlace doble, C=O), ácidos carboxílicos (con el grupo –COOH), éteres (con un oxígeno unido a dos carbonos, C–O–C), ésteres (con el grupo –COO– entre dos cadenas de carbonos), aminas (con un nitrógeno unido a uno, dos o tres carbonos por enlaces sencillos, como el –NH₂), amidas (con el grupo –CONH₂: un C=O unido a un nitrógeno) y nitrilos (con el grupo –C≡N: un carbono unido a un nitrógeno por un enlace triple). (valid, not nameable yet; `atoms` lists every heteroatom, halogens included; since I-29 the naming result also carries `groups`, §4.1, §13.6; since I-30 a molecule whose only heteroatoms are halogens bonded to carbons is named instead, since I-31 also one with OH groups on carbons, since I-32 also one with aldehyde or ketone C=O, since I-33 also one with carboxyl groups –COOH, since I-34 also one with ether oxygens, since I-35 also one with one ester group –COO–, since I-36 also one with amine nitrogens, since I-37 also one with amide groups, since I-38 also one with nitrile groups) — a nitrile with a ring (`reason` `ringNitrile`, `nitriles` the nitrile carbons): Esta molécula tiene un anillo y un grupo –C≡N (un nitrilo). Cuando el –C≡N va unido a un anillo, el nombre acaba en «-carbonitrilo» (como el ciclohexanocarbonitrilo o el benzonitrilo), y eso aún no sé nombrarlo. De momento solo sé nombrar los nitrilos de cadena abierta (como el etanonitrilo). — a nitrile bonded to the carbon of an acid, an ester or an amide (`carbonocyanidic`, I-39a): Esta molécula tiene un grupo –C≡N (nitrilo) unido directamente al carbono de un grupo –COOH, –COO– o amida. La IUPAC no la nombra con el prefijo «ciano-»: la considera un derivado del ácido carbónico (como el ácido carbonocianídico, NC–COOH), y eso aún no sé nombrarlo. — from the naming engine, a safety net, a nitrile cited neither as a suffix nor as `ciano` (`cyanoPrefix`): Esta molécula tiene un grupo –C≡N (nitrilo) que no sé situar en el nombre: ni como grupo principal (con la terminación «-nitrilo», como en el etanonitrilo) ni con el prefijo «ciano-» (como en el ácido 3-cianopropanoico). — more than two nitriles on one carbon piece with the nitrile principal (`manyNitriles`): Esta molécula tiene más de dos grupos –C≡N (nitrilo) en la misma cadena de carbonos. El carbono de un –C≡N siempre está en un extremo de la cadena y la cadena principal solo tiene dos extremos. Estos compuestos se nombran con «-carbonitrilo» (como el propano-1,2,3-tricarbonitrilo), y eso aún no sé hacerlo. — an amide with a ring (`reason` `ringAmide`, `amides` the amide carbons): Esta molécula tiene un anillo y un grupo amida (–CONH₂, –CONH– o –CON–). De momento solo sé nombrar las amidas de cadena abierta (como la etanamida o la N-metiletanamida): las amidas con anillo, como la benzamida, la ciclohexanocarboxamida o la N-feniletanamida, aún no sé nombrarlas. — an amide with an acid or an ester, or two amides on different carbon pieces (`amidePrefix`; also the engine's safety net for an amide left out of the suffix): Esta molécula tiene un grupo amida (–CONH₂, –CONH– o –CON–) que no puede ser el grupo principal: o hay un grupo que va antes que la amida (un ácido –COOH o un éster –COO–), o la amida queda en una rama, fuera de la cadena principal. Entonces la amida se nombraría con un prefijo («carbamoil-» o «acilamino-», como «acetilamino-»), y eso aún no sé hacerlo. — more than two amides (`manyAmides`): Esta molécula tiene más de dos grupos amida. El carbono de una amida siempre está en un extremo de la cadena y la cadena principal solo tiene dos extremos, así que alguna amida quedaría en una rama. Estos compuestos se nombran con el prefijo «carbamoil-» o con «-carboxamida», y eso aún no sé hacerlo. — a diamide with a group on some N (`substitutedPolyamide`): Esta molécula tiene dos grupos amida y alguno de sus nitrógenos lleva otros grupos unidos. Para decir en qué nitrógeno está cada grupo harían falta localizadores como N¹ y N⁴, y eso aún no sé hacerlo. Sí sé nombrar las diamidas sin grupos en el nitrógeno (como la butanodiamida) y las amidas con un solo nitrógeno (como la N-metiletanamida). — an imide, an N bonded to two C=O carbons (`imide`, `imides` the nitrogens): Esta molécula tiene un nitrógeno unido a dos grupos C=O (–CO–NH–CO–). Eso es una imida, no una amida con un grupo en el nitrógeno, y las imidas quedan fuera de lo que sé nombrar. — a ring molecule whose principal group is an amine with an N not bonded to a ring carbon (`reason` `sideChainAmine`, `sideChain` the nitrogens): Esta molécula tiene un anillo y un grupo amino (un nitrógeno, como el –NH₂) en una de sus ramas. De momento solo sé nombrar las aminas con anillo cuando el nitrógeno está unido directamente al anillo (como la ciclohexanamina o la bencenamina). — from the naming engine, a parent with two or more amine groups where some N carries other groups (`substitutedPolyamine`, `atoms` the suffix nitrogens; IUPAC 2013 would need N¹/N² locants): Esta molécula tiene varios grupos amino en la cadena principal y alguno de sus nitrógenos lleva otros grupos unidos. Para decir en qué nitrógeno está cada grupo harían falta localizadores como N¹ y N², y eso aún no sé hacerlo. Sí sé nombrar las diaminas sin grupos en el nitrógeno (como la etano-1,2-diamina) y las aminas con un solo nitrógeno (como la N-metiletanamina). — from the naming engine, an acyclic molecule with a non-principal amine N joining two or three identical parts that each carry the principal group (`symmetricAmine`, `atoms` the N and those parts; multiplicative nomenclature, `2,2′-azanodiildietanol`): Esta molécula tiene partes iguales unidas por un nitrógeno, y cada una de esas partes lleva el grupo principal. La IUPAC la nombra con un nombre que junta las partes iguales (como el 2,2′-azanodiildietanol), y eso aún no sé hacerlo. — an ester with a ring on either side or on a side chain (`reason` `ringEster`, `esters` the ester carbons): Esta molécula tiene un anillo y un grupo –COO– (un éster). De momento solo sé nombrar los ésteres de cadena abierta (como el etanoato de metilo): los ésteres con anillo, como el etanoato de fenilo o el ciclohexanocarboxilato de metilo, aún no sé nombrarlos. — more than one ester group (`manyEsters`): Esta molécula tiene más de un grupo –COO– (éster). De momento solo sé nombrar los ésteres con un único grupo –COO– (como el etanoato de metilo). — an acid with an ester (`esterPrefix`, `acids` and `esters`): Esta molécula tiene un grupo –COOH (ácido) y un grupo –COO– (éster). El ácido va antes que el éster, así que el éster se nombraría con un prefijo («alcoxicarbonil-», como «metoxicarbonil-», o «aciloxi-», como «acetiloxi-»), y eso aún no sé hacerlo. — an acid with a ring (`reason` `ringAcid`, `acids` the carboxyl carbons): Esta molécula tiene un anillo y un grupo –COOH (un ácido carboxílico). Cuando el –COOH va unido a un anillo, el nombre acaba en «-carboxílico» (como el ácido ciclohexanocarboxílico), y eso aún no sé nombrarlo. De momento solo sé nombrar los ácidos de cadena abierta (como el ácido etanoico). — more than two –COOH (`manyAcids`): Esta molécula tiene más de dos grupos –COOH (ácido). Un –COOH siempre está en un extremo de la cadena y la cadena principal solo tiene dos extremos, así que alguno quedaría en una rama. Estos compuestos se nombran con el prefijo «carboxi-» o con «-carboxílico», y eso aún no sé hacerlo. — an OH on a ring's side chain (`reason` `sideChainAlcohol`): Esta molécula tiene un anillo y un grupo –OH en una de sus ramas. De momento solo sé nombrar los alcoholes con anillo cuando el –OH está unido directamente al anillo (como el ciclohexanol o el fenol). — an aldehyde with a ring (`ringAldehyde`): Esta molécula tiene un anillo y un grupo –CHO (un aldehído). Cuando el –CHO va unido a un anillo, el nombre acaba en «-carbaldehído» (como el ciclohexanocarbaldehído), y eso aún no sé nombrarlo. De momento, con anillo solo sé nombrar las cetonas cuyo C=O forma parte del anillo (como la ciclohexanona). — a ketone C=O on a ring's side chain (`sideChainCarbonyl`): Esta molécula tiene un anillo y un grupo C=O en una de sus ramas. De momento solo sé nombrar las cetonas con anillo cuando el carbono del C=O forma parte del anillo (como la ciclohexanona). — more than two aldehydes on a chain (`manyAldehydes`): Esta molécula tiene más de dos grupos –CHO (aldehído). Un –CHO siempre está en un extremo de la cadena y la cadena principal solo tiene dos extremos, así que no puede llevarlos todos. Estos compuestos se nombran con «-carbaldehído», y eso aún no sé hacerlo. — from the naming engine, after validation, a C=O carbon bonded to the chain that carries it as a branch (`acylSubstituent`, `atoms` its C and O; decided on the default-style name): Esta molécula tiene un grupo C=O en una rama, con su carbono unido directamente a la cadena principal (un grupo acilo, como el acetilo, –CO–CH₃). Aún no sé nombrar estas ramas. — from the naming engine, a safety net that validation makes unreachable, a –COOH left out of the suffix (`carboxySubstituent`, `atoms` the carboxyl carbons): Esta molécula tiene un grupo –COOH en una rama. Se nombraría con el prefijo «carboxi-», y eso aún no sé hacerlo. — from the naming engine, an acyclic ether whose two sides are identical and carry the principal group (`symmetricEther`, `atoms` the O and both sides; IUPAC 2013 uses multiplicative nomenclature, `2,2′-oxidi(etan-1-ol)`): Esta molécula tiene dos mitades iguales unidas por un oxígeno (–O–), y cada mitad lleva el grupo principal. La IUPAC la nombra con el prefijo «oxidi-», que junta las dos mitades (como el 2,2′-oxidietanol), y eso aún no sé hacerlo. |
| `INVALID` | Los datos de la molécula están dañados. Empieza un dibujo nuevo. (internal/corrupt data) |

---

## 4. Naming engine

Pure functions, no DOM, no coordinates.

### 4.1 Result contract

```
nameMolecule(mol) →
  { ok: true,
    name: 'string',                 // Spanish name, default style (isopropil)
    parts: [{ text, kind, atoms, bonds }],  // kind: locant|multiplier|prefix|stem|ending|punct
    structure: NameStructure,       // language-neutral (§4.7)
    parent: { atoms: [id…] in locant order, bonds: [id…] },
    trace: [TraceStep…],
    alternatives: [{ style, label, name, parts }] }   // §1.1; empty if no isopropyl/isopropylidene group
| { ok: false, error: { code, message },
    groups? }                       // HETEROATOM only: GroupAnalysis (§13.6)
```

`groups` (I-29) is the characteristic-group analysis of a molecule refused
with `HETEROATOM`: `{ items, principal, unsupported }`, where `items` are the
group records of `naming/groups.js` plus `role` (`suffix`, `prefix`,
`unsupported`), `suffix` and `prefix` (Spanish forms), `principal` is the
most senior kind present (or null) and `unsupported` tells whether some
group was not recognised. It never turns the refusal into a name; hydrocarbon
results and other refusals have no `groups`.

An alcohol (I-31) has `structure.suffix` (`{kind: 'alcohol', locants}`,
one `{locant, atom, attachAtom, bond}` per OH on the parent, §4.7); an
aldehyde or ketone (I-32) likewise with `kind` 'aldehyde' / 'ketone' (one
entry per C=O whose carbon is a parent atom; `attachAtom` its oxygen); a
carboxylic acid (I-33) with `kind` 'acid' (one entry per –COOH: `atom` its
carbon, `attachAtom` / `bond` its C=O oxygen, `hydroxyAtom` / `hydroxyBond`
its OH oxygen); an ester (I-35) with `kind` 'ester' (one entry: `atom`
its C=O carbon, `attachAtom` / `bond` its C=O oxygen, `esterOxygen` /
`esterBond` its bridge O) and `structure.ester` (`{oxygen, bond, carbon,
alkylBond, alkyl}`: the bridge O, the C–O bond, the carbon across the O,
that O–C bond, and the O-bound group as a SubstituentStructure seen from
the O, `alkoxy` true); an amine (I-36) with `kind` 'amine' (one entry per
amine N bonded to the parent: `atom` its carbon, `attachAtom` / `bond`
the N and the C–N bond), the other groups on each such N being ordinary
prefix groups whose occurrences have `locant` `N_LOCANT` (0, cited `N`)
and `atom` the N; every other result has `suffix: null` and no
`ester`. Their
`alternatives` may end with `{style: 'locants'}` (`propan-2-ona` for
`propanona`) and a `{style: 'traditional'}` name (`formaldehído`,
`acetaldehído`, `acetona`, `ácido fórmico`, `ácido acético`, `ácido
oxálico`, `formiato de …`, `acetato de …`).

`TraceStep = { rule, candidatesBefore, values, survivors, note? }` where each
candidate is `{ atoms, direction?, key, bonds }` (`bonds`: the chain's bond ids,
added by `nameMolecule()` so the explanation can highlight every compared chain)
and `values` are the compared data
(counts for P0–P4, locant lists for N0–N3, the prefix locants flattened
in citation order for N4, the citation keys for N5, the atom-id tuple for
the tie-break). A ring parent (I-25, I-26) starts with a `RING` step instead
of P1–P4 — the ring as the only candidate, its size as the value: with one
ring the ring is always the parent (§13.5) — followed, when the ring is
substituted or unsaturated, by the ring numbering rules N1–N4 and TIE over
every start atom and direction (each candidate with its n ring bonds in
`bonds`); a bare cycloalkane has the `RING` step only. Trace order: P0, P1, P2, P3, N0, N1, N2, P4, N3, N4, N5, TIE (N5
only when the candidates left after N4 would give different names). Rules stop at the first one that leaves
a single candidate; P0 (most principal groups) and N0 (their lowest
locants, also on rings) appear only for an alcohol, aldehyde, ketone, acid or ester, P0
always recorded then; P1 is always
recorded, and N3/N4 are skipped when no candidate carries prefixes. The explanation layer (§5) consumes only the trace
and the result — it never re-derives chemistry.

### 4.2 Parent candidates

The validated molecule is a tree. Candidates are paths of its **carbon
skeleton** (`carbonSkeleton()`): a halogen (I-30) is never a chain atom,
only a substituent prefix, so it counts in P4, N3 and N4 like any other
prefix; nor is any oxygen: one of the principal kind (an OH, I-31, a
C=O, I-32, or a –COOH, I-33, counted once through its C=O oxygen:
`isSuffixOxygen()`) is counted by P0, any other is a prefix counted by
P4. The carbon of a C=O or a –COOH is a skeleton carbon (an aldehyde or
carboxyl carbon is always a leaf, a ketone carbon has two carbon
neighbours). A one-carbon skeleton (methane, `clorometano`, `metanol`,
`metanal`, `ácido metanoico`) is handled separately.
Extending a path never loses a principal group, so the leaf-to-leaf paths
still contain the best parent of an alcohol, aldehyde, ketone or acid. Otherwise enumerate the path between every pair of leaf carbons
and keep the longest. This is complete: a path ending at a non-leaf could be extended, so
it is not maximal. (With ≤ 60 atoms there are at most ~1 800 paths.)
**This leaf-to-leaf restriction applies to the parent only**, never to
substituents (§4.5).

Note: no triple bond can leave a longest parent (internal attachment would
exceed valence; terminal attachment would make the chain longer). Assert it.

### 4.3 Parent selection (direction-independent part)

Compare in order; stop when one chain remains:

0. **P0 Most principal groups** (I-31, I-32, I-33, I-35, I-36; only with a principal
   group) — the groups of the principal kind (ácido > éster > aldehído >
   cetona > alcohol > amina, `naming/principal.js`) on the chain's carbons (IUPAC 2013
   P-44.1.1: the maximum number of principal characteristic groups comes
   before the length): `CCCCC(CO)CCC` is `2-propilhexan-1-ol`, not an
   octane; `CCCCC(CCCCCC)C=O` is `2-butiloctanal`. An OH or ketone no
   chain can hold is a `hidroxi-` / `oxo-` prefix of its branch
   (`2-(hidroximetil)propano-1,3-diol`, `4-(2-oxopropil)heptano-2,6-diona`).
   The C=O bond is never a chain bond, so it counts in no P2/P3 (or N1/N2)
   comparison. An ether O (I-34) is not a skeleton atom: it splits the
   skeleton into pieces, one per side, and the leaf-to-leaf paths of every
   piece (a lone carbon is a one-atom path) compete in P0–P4 and the
   numbering rules, so the side with the principal groups, then the longer
   chain, then more multiple bonds, then more substituents holds the parent
   (`2-(pentiloxi)etan-1-ol`, `1-metoxipropano`, `etoxieteno`,
   `1-cloro-2-etoxietano`); equal sides reach the presentation tie-break
   and give the same name (`etoxietano`). The bridge O of an ester (I-35)
   splits the skeleton the same way: P0 always keeps the acid part (the
   side with the C=O carbon), however long the O-bound group
   (`etanoato de pentilo`). An amine N (I-36) splits the skeleton too, but
   every chain bonded to a principal N carries it, so P0 ties between the
   sides and the usual rules pick one (`N-metiletanamina`: P1;
   `N-etiletenamina`: P2; `2-cloro-N-etiletan-1-amina`: P4 counting the
   N-groups, which are the same number on every side; IUPAC 2013 P-62.2.2:
   the senior chain carries the suffix, the others become N-substituents).
1. **P1 Longest chain** — carbon count (IUPAC 2013 P-44.3).
2. **P2 Most multiple bonds** — double + triple bonds **lying within** the
   chain. A double bond connecting the chain to a substituent does not count
   (P-44.4.1.1).
3. **P3 Most double bonds** — within the chain (P-44.4.1.2).

Remaining chains go, together with both directions of each, to §4.4. The
IUPAC 2013 order puts the lowest locants for `eno`/`ino` (N1, N2) **before**
the number of substituent prefixes (P-45.2.1), so P4 is applied inside the
numbering cascade, after N2. Example: in `C=CCC(C=C(C)C)CCCCC` the non-1-ene
chain (one substituent) beats the non-2-ene chain (two substituents).

### 4.4 Numbering (and remaining parent choice)

Every candidate is a `(chain, direction)` pair. Compare **sorted locant
lists, keeping repeated locants, term by term, numerically, at the first
point of difference — never by sums**:

4. **N0** (I-31, I-32, I-33, I-35, I-36; only with a principal group) the principal
   groups, one locant per OH, C=O, –COOH, –COO– or amine N (IUPAC 2013 P-31.1.4.2.4: the principal
   characteristic groups come before the multiple bonds and the
   prefixes): `prop-2-en-1-ol`, `pent-4-en-2-ol`, `4-metilpentan-2-ol`,
   `but-3-enal` (the –CHO carbon is always 1), `pent-3-en-2-ona`.
5. **N1** all multiple bonds together (`eno` + `ino`); a bond's locant is the
   lower of its two atom locants.
6. **N2** double bonds.
7. **P4 Most substituents** — chain-level count, applied to the chains
   still represented among the candidates (P-45.2.1): number of individual
   substituent prefixes attached to the chain: two substituents on one carbon
   count as two; a doubly-attached substituent (`-iliden`) counts as one.
   Skipped when all remaining candidates belong to one chain.
8. **N3** all substituent prefixes together (an `-iliden` prefix contributes
   its parent attachment locant once).
9. **N4** prefixes in citation (alphanumerical) order: all prefix locants
   written as one sequence in the order they appear in the name (not
   sorted), compared term by term at the first point of difference
   (P-31.1.4.3.4). The sequence is flat, never compared group by group:
   chains with different prefix sets must compare the same way the names
   read, e.g. `5,6-di(butan-2-il)-3,7-dimetilidennon-4-eno` (5,6,3,7) beats
   `5-(butan-2-il)-6-(but-1-en-2-il)-7-metil-3-metilidennon-4-eno` (5,6,7,3).
   The groups on a principal amine's N (I-36) are prefixes of every
   candidate whose chain is bonded to that N, with the fixed locant `N`
   compared as lower than any number (`N_LOCANT` = 0, P-14.3.5): they count
   in P4, N3 and N4 (`CC(Cl)NC(C)Br` is
   `N-(1-bromoetil)-1-cloroetan-1-amina`: in citation order the N-group
   comes first, N,1 beats 1,N).
10. **N5** only when the survivors still give different names (different
   prefixes with the same locants, e.g. two chains each leaving a different
   group as substituent): the name that comes first in alphanumerical
   order, compared as a whole — every letter of the prefix part
   (multiplying prefixes and nested prefixes included) before any locant,
   not prefix by prefix (IUPAC 2013 P-45.5): `6-(2-metilbutil)-8-(2-metilheptil)hexadecano`
   beats `6-metil-8-[2-(2-metilbutil)heptil]hexadecano`. If letters and
   locants still tie while the names differ only in grouping (nested
   polyethers, I-34: `COCOCOCOCOC` gives `(metoxi){[(metoximetoxi)metoxi]metoxi}metano`
   or `(metoximetoxi)[(metoximetoxi)metoxi]metano` on different parents),
   the whole prefix text as written, punctuation included, decides
   (code-unit order; `render.js prefixNameKey()` `text`,
   `numbering.js compareNameKeys()`), a convention of the app that keeps the
   choice independent of atom ids: only identical names reach the tie-break.
11. **Presentation tie-break** — if every chemical criterion ties, the names
   are identical (symmetry). Pick the candidate with the lexicographically
   smallest ordered atom-id tuple **only to stabilise highlighting and
   redraw**; the trace records "las dos opciones dan el mismo nombre". This is
   not presented as an IUPAC rule.

All comparisons use structured keys; **never compare assembled name strings
with JavaScript string ordering.**

### 4.5 Substituents (recursive)

For each parent atom, each neighbour outside the parent roots a substituent
subtree. Record, as data, the **attachment atom** and **attachment bond order**
(1 → `-il`, 2 → `-iliden`); never infer these from strings.

Substituent chain selection:

- Candidate chains are paths within the subtree that **contain the attachment
  atom** — it need not be an endpoint (this is what yields `propan-2-il`,
  `butan-2-il`).
- Criteria in order: longest chain; most multiple bonds within it; most
  double bonds; then the §4.4 cascade with the free valence first: **FV
  lowest locant for the free valence**, N1 multiple bonds together, N2
  double bonds, P4 most substituents, N3 substituent prefixes, N4 citation
  order, N5, tie-break (`numberParent` with `freeValenceAtom`). Decision
  (phase I-5): most substituents comes after the ene/yne locants, as for
  the parent (IUPAC 2013 P-31.1.4 numbering criteria before P-45.2.1);
  FV cannot change the chain choice (every longest chain through the
  attachment atom uses the two deepest branches, so the free-valence
  locant is the same), it only fixes the direction.
- Retained prefixes, encoded explicitly in the lexicon: `tert-butil`
  (C(CH₃)₃ attached at the central carbon), and — in the default
  `'isopropil'` style only — `isopropil` (CH(CH₃)₂ attached at the central
  carbon). In `'pin'` style the latter is `propan-2-il`; in `'substituted'`
  style only chains that start at the attachment atom are candidates, so
  every group is named with the free valence at 1 (`1-metiletil`,
  `1,1-dimetiletil` for tert-butyl, `1-metiletenil`). Nothing else is
  retained in v1. Retained and common names are recognised by the rooted
  canonical key of the group (topology), never from name strings; common
  names (`vinilo`, `alilo`, `isobutilo`, `sec-butilo`) are exposed as the
  `commonName` id of the substituent structure, for explanations only.
- A style may need a nested `-iliden` group that the default style avoids
  (`substituted` gives `1-metilidenbutil` where `pin` gives
  `pent-1-en-2-il`); it is named like any other group (phase I-6).
- Naming: prefixes + stem + unsaturation + `il`/`iliden` with the free-valence
  locant: `propan-2-il`, `prop-2-en-1-il`, `prop-1-en-2-il`, `but-3-in-1-il`,
  `2-metilpropil`, `(2,2-dimetilpropil)`, `propan-2-iliden`. One- and
  two-carbon groups carry no locant: `metil`, `etil`, `etenil`, `etinil`,
  `metiliden`, `etiliden`. A saturated chain attached at its end takes the
  short form (`propil`, `2-metilpropil`, not `propan-1-il`): confirmed in
  phase I-5 against IUPAC 2013 P-29.2 (free valence at a chain end: `-ano` →
  `-il`, locant 1 implied; the `-an-n-il` form only when the free valence is
  inside the chain), recorded in the fixture justifications (`5-propilnonano`,
  `5-tert-butilnonano` for the retained `tert-butil`, P-29.6).
  Unsaturated groups always cite the free-valence locant (`prop-2-en-1-il`);
  the final `o` of `eno`/`ino` is dropped before it (`but-3-in-1-il`).
- Parentheses around any prefix that contains its own locants or its own
  substituents: `(propan-2-il)`, `(prop-2-en-1-il)`, `(2-metilpropil)`;
  nested enclosures use `( )` inside `[ ]` inside `{ }`
  (`7-[2-(propan-2-il)pentil]tridecano`, IUPAC 2013 P-16.5.4).
  Simple prefixes (`metil`, `etil`, `etenil`, `metiliden`, `isopropil`,
  `tert-butil`) get no parentheses.
- **Halogens** (I-30): a F, Cl, Br or I atom on a chain atom is one simple
  prefix, `fluoro`, `cloro`, `bromo`, `yodo` (IUPAC 2013 P-61.3.1; never a
  suffix, never a chain atom, never enclosed; `di`, `tri`, `tetra`… when
  repeated: `1,1,1-tricloroetano`). Its SubstituentStructure has `halogen`
  (the element), `chain: null`, no prefixes and a single-bond free valence
  (`halogenSubstituent()` in `substituent.js`); its identity key is
  `-Cl()` etc. A halogen on a substituent chain is a nested prefix of that
  group (`(clorometil)`, `(2-cloroetil)`, `(2-cloropropan-2-il)`), which
  makes it a compound prefix (`bis(clorometil)`) and never a retained one
  (a substituted isopropyl or tert-butyl group is named systematically).
  Substituent chains, like the parent, run over carbons only.
- **OH groups** (I-31): an OH on a parent atom is the principal group, the
  `-ol` suffix, never a substituent (`suffixSites()`; `collectSubstituents()`
  leaves it out). An OH on a substituent chain is the simple prefix
  `hidroxi` of that group (`hydroxySubstituent()`, `hydroxy: true`, identity
  key `-O()`, alphabetised under h, never enclosed): `(hidroximetil)`,
  `bis(hidroximetil)`, `3-(2-hidroxietil)pentano-1,2,5-triol`.
- **C=O groups** (I-32): with a C=O present the principal kind is the most
  senior oxygen group (aldehído > cetona > alcohol, `naming/principal.js`);
  on the parent only the oxygens of that kind are the suffix
  (`suffixSites()`), every other oxygen is a simple prefix, on the parent
  or in a branch: `oxo` for a C=O (`oxoSubstituent()`, `oxo: true`,
  identity key `=O()`, attached by the C=O double bond, alphabetised under
  o, never enclosed: `4-oxopentanal`, `(2-oxopropil)`) and `hidroxi` for an
  OH (`4-hidroxibutan-2-ona`). The C=O carbon is always a chain carbon of
  the parent or of a branch. A C=O carbon that is the attachment atom of a
  branch (an acyl group: `1-oxoetil` for acetilo) is not named: IUPAC 2013
  uses acyl prefixes (`acetil`, `propanoil`), so `hasAcylPrefix()` finds it
  in the default-style name and the engine returns `HETEROATOM`
  `acylSubstituent` (`3-acetilpentano-2,4-diona` is refused, while
  `3-etil-4-oxopentanal`, whose ketone carbon is in the parent, is named).
  The C=O bond of an `oxo` prefix is not a multiple bond of its branch
  (`multipleBonds` lists C–C bonds only).
- **–COOH groups** (I-33): with a –COOH present the principal kind is
  'acid' (ácido > aldehído > cetona > alcohol). Both oxygens of each –COOH
  are of that kind and are never prefixes; the C=O oxygen stands for the
  group (`isSuffixOxygen()`), so each –COOH is one suffix site whose OH
  travels with it (`hydroxyAtom`). Every other oxygen is `oxo` / `hidroxi`
  as above: a ketone, or the –CHO at the other end of the parent
  (`ácido 3-oxopropanoico`: the aldehyde carbon is in the chain, so `oxo`,
  never `formil`). With at most two –COOH on an open chain (validation) both
  carboxyl carbons are chain ends of the parent, so no `carboxi` prefix is
  ever needed; `nameMolecule()` still checks every emitted style and would
  refuse a –COOH left out of the suffix (`carboxySubstituent`).
- **Ether O** (I-34): an ether O bonded to a chain atom roots an alkoxy
  prefix (`alkoxySubstituent()`, `alkoxy: true`, `oxygen`): the group on
  the other side of the O is named like any branch whose carrying atom is
  the O (its chain, prefixes, free valence, retained `isopropil` /
  `tert-butil`), its identity key starts `-O(`, its atoms and bonds
  include the O and the O–C bond, and each occurrence records the carbon
  across the O (`etherCarbon`, `etherBond`) for the explanation. It is
  cited `metoxi`, `isopropoxi`, `(pentiloxi)`… (§1.1), at any depth: an
  alkoxy inside a branch (`(metoximetil)`) or inside another alkoxy
  (`(2-metoxietoxi)`) falls out of the recursion. An acyclic ether whose two
  identical sides carry the principal group is refused (`symmetricEther`,
  §3.2).
- **Amine N** (I-36): an amine N is never a chain atom. When the amine is
  principal, each N bonded to the parent is a suffix site (`suffixSites()`,
  the N as `attachAtom`) and every other neighbour of that N roots a branch
  named like any branch whose carrying atom is the N
  (`nitrogenSubstituents()`, entries flagged `nitrogen`, the shared
  `branchEntry()`), listed by `collectSubstituents()` after the others and
  given the locant `N_LOCANT` (`groupPrefixes()`, `numberingPrefix()`); on
  benzene they are not ring substituents (`N-metilbencenamina` is a
  monosubstituted benzene). Any other amine N bonded to a chain (below a
  more senior group, or on a branch) is an `amino` prefix
  (`aminoSubstituent()`, `amino: true`, `nitrogen`, `chain` null): its other
  neighbours are named as branches of the N (`substituentsOf([N])`) and
  grouped as its `prefixes`; its identity key starts `-N(`. The engine
  refuses a parent with two or more amine suffix groups and some N-group
  (`substitutedPolyamine`, checked on every emitted style) and an acyclic
  non-principal N joining identical parts that carry the principal group
  (`symmetricAmine`, `symmetricAmine()` beside `symmetricEther()`).
- **Ester –COO–** (I-35): with an ester present the principal kind is
  'ester' (ácido > éster > aldehído…; validation never lets an acid and an
  ester meet). Both oxygens of the –COO– are of that kind and are never
  prefixes; the C=O oxygen stands for the group (`isSuffixOxygen()`), the
  bridge O travels with it (`esterOxygen`). The group across the bridge O
  is never a prefix either: `esterAlkyl()` names it like an alkoxy group's
  alkyl (`alkoxySubstituent()` seen from the O: chain through the carbon on
  the O, free valence first, its own prefixes — halogens, `hidroxi`, `oxo`,
  alkoxy —, retained `isopropil` / `tert-butil` per style) and the name
  structure keeps it apart (`structure.ester`), cited as its own word
  (§4.7). An acyl branch inside it is refused like one on the parent
  (`acylSubstituent`, checked on both).
- Identical substituents are grouped: di/tri for simple prefixes, also when
  they are parenthesised for their own locants (`di(propan-2-il)`); bis/tris
  for compound, i.e. substituted, prefixes (`bis(2-metilpropil)`,
  `bis(1-metiletil)`) (IUPAC 2013 P-16.9). Enclosure and multiplier are
  separate decisions. A multiplier before
  an italic descriptor takes a hyphen (`di-tert-butil`).

### 4.6 Doubly-attached substituents (`-iliden`)

Under 2013 rules the longest chain wins even if a double bond leaves it.
`CH₂=C(CH₂CH₂CH₃)CH₂CH₂CH₃` → seven-carbon saturated parent →
**`4-metilidenheptano`**. The connecting double bond is represented on the
substituent, not counted in P2/P3/N1/N2, and its parent locant is part of the
prefix locants (N3/N4).

Decisions (phase I-6): a doubly attached group is named exactly like a singly
attached one (§4.5: chain through the attachment atom, FV first) with a free
valence of order 2 (`freeValence.order`), rendered `iliden`: `metiliden`,
`etiliden`, `propiliden` (short form at a chain end), `(butan-2-iliden)`,
`eteniliden` (=C=CH₂, no locants like `etenil`), `(prop-2-en-1-iliden)`.
=C(CH₃)₂ is the retained `isopropiliden` in the default style only
(alphabetised under **i**, simple prefix: `diisopropiliden`). It applies at any
depth (`2-metilidenpentil`). A triple bond can never connect a substituent
(the carrying atom would have no room for a branch), so orders 1 and 2 are
the only ones. Common names for explanations only: `vinilideno`,
`alilideno`, `isobutilideno`, `sec-butilideno`, `isopropilideno` (when not
retained). In alphanumerical order `metil` precedes `metiliden` (shorter
first when the letters coincide), and `etenil` precedes `etiliden`.

### 4.7 Name structure and rendering

The engine produces a **language-neutral name structure** (parent kind —
`parentKind` `chain` or `ring` —, parent length, unsaturation locant lists,
grouped prefixes each with locants and a nested structure). A ring parent
(`naming/rings.js`, I-25) holds the ring atoms in ring order and its bonds
with the closure bond (from `perceiveRings()`, or from the chosen numbering
in I-26: the bond from locant n back to 1) last; it renders as the
nondetachable prefix `ciclo`/`cyclo` + stem (IUPAC 2013 P-22.1.1) + the same
ending as a chain — connecting `a`, unsaturation locants and multipliers,
`ano`/`eno`/`ino` (`ciclohexa-1,3-dieno`, `ciclooct-1-en-3-ino`) — with
prefixes in front as for chains (`1-etil-3-metilciclohexano`,
`(propan-2-il)ciclohexano`); locants are omitted only per the ring rule of
§1.1. A benzene ring (`naming/aromatic.js`, I-28) is a ring parent with
`retained: 'benzene'`, rendered as the single word `benceno`/`benzene`
(the Kekulé double bonds, at locants 1, 3, 5 of the chosen numbering, stay
in the structure but are never cited); `fenil`/`phenyl` is a retained
substituent prefix (`retained: 'phenyl'`). An alcohol's structure also has `suffix` (I-31), rendered after the ending
(`renderEnding()`, `suffixWords()`: locants, multiplier, `ol`, and the
elided final vowel of the ending, §1.1); the `ol` part refers to every OH
and its carbon; a benzene parent with a suffix renders `fen` + `ol`. An
aldehyde or ketone suffix (I-32) renders the same way with `al` / `ona`
(`propanal`, `pentano-2,4-diona`), the part referring to each C=O carbon
and oxygen; on a chain an aldehyde never writes its locants
(`renderParent()`). An acid suffix (I-33) renders `oico` / `dioico` the
same way, never with locants, its parts referring to the carbon and both
oxygens of each –COOH (`suffixGroupIds()`); the name starts with the
lexicon's class word and a space (`ácido `, an `ending` part with the same
atoms; none in English, whose suffix is `oic acid`). An ester suffix
(I-35) renders `oato` the same way (parts referring to the carbon, both
oxygens and both C–O bonds); `assembleEster()` then adds the O-bound
group, `esterAlkylName()` (its substituent words + the lexicon's
`esterAlkylEnding`, a `prefix` part with its atoms and bonds), after the
acid part and `' de '` (a `punct` part) in Spanish, before it and a space
in English. With `renderName(…, {traditional})` the acid part is one
traditional word (`acetato de etilo`, `methyl acetate`). An amine suffix
(I-36) renders `amina` / `diamina` like `-ol` (parts referring to each
carbon, N and C–N bond); on benzene the stem is `bencen` (`benzen`), and
`renderName(…, {traditional: 'aniline'})` writes the N prefixes and the one
word `anilina`. Prefix locants equal to `N_LOCANT` are written `N`
(`structure.js locantText()`; citation keys read them back as 0,
`locantValue()`); an `amino` prefix is its N-groups' words without
locants, each one after the first enclosed, then `amino`
(`substituentTokens()`, `needsEnclosure()`, `isCompoundPrefix()`,
`enclosureLevel()`).
`render.js` turns it into the Spanish string and coloured parts
using `lexicon.es.js`; the oracle (§8) renders the same structure with
`lexicon.en.js`. No name is ever produced by substring translation.

Assembly order: group identical prefixes → sort alphanumerically (§1.1) →
parent = stem + connecting `a` (per §1.1) + unsaturation segments with
locants + ending → join with the punctuation rules, apply the locant-omission
table.

### 4.8 Fixtures (authority for choice rules)

`tests/fixtures/names.tsv`: `SMILES <TAB> expected name <TAB> rule tested
<TAB> justification <TAB> alternatives` (the last column: `style=name`
pairs separated by `;`, empty when there are none). At least 150 rows
(asserted by the test suite), grouped by feature. Every valid molecule is
named, so no row may be marked `pending(I-n)` (the test suite rejects the
marker). **Every row is a real SMILES and a justified name**; no fragments,
no open questions. Mandatory rows (from the Codex review):

| SMILES | Name | What it tests |
|---|---|---|
| `C=CC` | propeno | omitted locant in unsubstituted parent |
| `CC(C)C` | 2-metilpropano | substituent locant kept |
| `C=CC(CCC)CCC` | 4-etenilheptano | length beats a shorter unsaturated chain |
| `C#CC(CCC)CCC` | 4-etinilheptano | length beats the triple bond |
| `C=CCC(CCCC)CCCC` | 5-(prop-2-en-1-il)nonano | unsaturated substituent, explicit free-valence locant |
| `CCC(=C)CCC` | 3-metilidenhexano | `-iliden`, double bond outside parent |
| `CCCC(=CC)CCC` | 4-etilidenheptano | two-carbon `-iliden` |
| `CCCCC(C(C)C)CCCC` | 5-isopropilnonano | default style; alternatives `pin=5-(propan-2-il)nonano`, `substituted=5-(1-metiletil)nonano` |
| `CCCC(C)CC(C(C)C)CCC` | 4-isopropil-6-metilnonano | style changes N4: `pin=4-metil-6-(propan-2-il)nonano`, `substituted=4-metil-6-(1-metiletil)nonano` (i < m, but m < p and metil < metiletil) |
| `CCC(C(C)C)CC` | 3-etil-2-metilpentano | equal length: more substituents wins |
| `CCC(CC)C(C)CC` | 3-etil-4-metilhexano | equal locant sets: first cited (etil) gets lower |
| `CC(C)(C)C` | 2,2-dimetilpropano | repeated locants, symmetry |
| `C=CC=C` | buta-1,3-dieno | connecting `a` |
| `C=C=CC` | buta-1,2-dieno | cumulated double bonds |
| `C#CC=CC` | pent-3-en-1-ino | lowest multiple-bond locants beat "double bond first" |
| `C=CC=CC#C` | hexa-1,3-dien-5-ino | tie → double bonds lower; en before ino |
| `C=CC#CC#C` | hex-1-en-3,5-diino | later multiplier adds no `a` |

Plus: C1–C30 straight alkanes; `eteno`, `etino`, `propino`, `propadieno`,
`but-1-eno`, `but-2-eno`, `2-metilprop-1-eno`, `pent-1-en-4-ino`,
`hexa-1,3,5-trieno`; `tert-butil`, `di(…)` and `bis(…)` cases; alphabetisation of a
compound prefix under its inner multiplier; N4 cases; symmetric molecules;
cycloalkanes of several ring sizes (`ciclopropano` … `ciclotriacontano`, I-25);
substituted and unsaturated monocycles (I-26: symmetry, dienes, cycloalkynes,
alphabetical ties, unsaturation vs substituent locants, `-iliden`, a long
chain on a small ring, the ring locant-omission rule); halogen derivatives
(I-30: several halogens, halogen + alkyl, N3 before N4, alphabetical ties,
Spanish order with `yodo`, P4 counting halogens, halogens with double and
triple bonds, on rings and on benzene, inside substituents, and every
locant-omission case); alcohols (I-31: simple, branched, P0 against a longer
chain, N0 against multiple bonds and prefixes, enols and gem-diols, diols
and triols, `hidroxi-` branches, OH + halogens, cycloalkanols, `fenol`, and
the locant-omission and vowel-elision cases); aldehydes and ketones (I-32:
terminal and internal C=O, `-dial`, `-diona`, P0 and N0, C=O never a
multiple bond of the chain, `oxo-` and `hidroxi-` with the seniority
aldehído > cetona > alcohol, a ketone on a branch, halogens,
cycloalkanones, `propanona` with its alternatives); carboxylic acids (I-33:
one- and two-carbon acids, branched and unsaturated acids, diacids, P0
and N0, `oxo-` for a ketone or a terminal aldehyde and `hidroxi-` beside
an acid, halogens, `ácido fórmico` / `acético` / `oxálico`); esters (I-35:
one- and two-carbon acid parts, `formiato` / `acetato`, branched and
unsaturated groups on both sides in every style, P0 against a longer
O-bound group, `oxo-` / `hidroxi-` / halogens / alkoxy on either part);
amines (I-36: primary, secondary and tertiary, `N`-locants and their
grouping with carbon prefixes, diamines, ring amines, `bencenamina`, the
`amino-` prefix below every oxygen group, alkylamine and `anilina`
alternatives).

The oracle (§8) is the second line of defence, not a replacement.

---

## 5. Explanation (Spanish, ESO level)

`explain(result)` (`src/explain/explain.js`, pure) → array of steps
`{ id, title, text: [paragraph…], highlight: [{atoms, bonds, style}…],
locants: [[atomId, n]…] | null, options?, compare?, legend?, parts? }`.
`options` are `{label, text, highlight, locants}` the student can click
(each longest chain, each numbering, each substituent); `compare` is the
side-by-side table of the numbering step (`{labels, rows: [{rule, label,
lists, firstDifference, marks, winners}]}`; `marks[i]` are the positions
shown in bold: each losing list's first difference with the winning list,
and all of those points on the winning list); `legend` (`{text, kind, meaning}`) and
`parts` (the coloured name) belong to the last step. Glossary terms are
written `[[shown text|key]]` inside paragraphs (`parseMarkup()`, `GLOSSARY`).
Steps, in order; a step that decided nothing is skipped (or one short line
when instructive):

1. **Cuenta los carbonos** — "Tu molécula tiene 7 carbonos y 16 hidrógenos
   (C₇H₁₆)."
2. **Busca la cadena más larga** — each longest chain shown in turn ("Opción 1
   de 3"). "La cadena más larga tiene 6 carbonos. Hay 2 cadenas de 6."
   When an unsaturation stays outside the parent, say so explicitly: "El doble
   enlace no está en la cadena principal: con las normas actuales de la IUPAC
   manda la longitud." When an equally long chain holds it and loses a
   tie-break (P2/P3), say that instead ("…pierde en los desempates").
3. **Desempates** (multiple bonds / double bonds / substituents) — only when a
   tie existed, with counts per option.
4. **Numera la cadena** — the numberings compared by a deciding rule (N1–N5)
   side by side with their locant lists and the first point of difference
   highlighted. The engine never reads coordinates, so the options are
   labelled A, B… (each shows its numbers on the canvas) rather than "por la
   izquierda / por la derecha": "Opción A: 2, 4; opción B: 3, 5. En el primer
   número distinto, 2 es menor que 3. Gana la opción A." Numberings that give
   identical lists are merged.
5. **Nombra los sustituyentes** — each highlighted with its name; compound
   ones get a nested mini-explanation; common names as notes. For an
   isopropyl group, explain the three accepted names (`isopropil`,
   `propan-2-il`, `1-metiletil`) and why each is written that way.
6. **Ordena alfabéticamente** — "etil va antes que metil (e antes que m). Los
   prefijos di-, tri- no cuentan para el orden."
7. **Monta el nombre** — built piece by piece, coloured by part kind, with a
   legend: "hex = 6 carbonos, -eno = hay un doble enlace".

A cycloalkane (I-25) gets four steps: **Cuenta los carbonos** (plus why the
formula is CₙH₂ₙ, two hydrogens fewer than the open chain), **Busca el
anillo** (the chain closes on itself; the ring in the parent colour and the
closure bond apart; "hexano → ciclohexano"), **Numera el anillo** (all ring
carbons are equivalent: no numbers) and **Monta el nombre** (legend
`ciclo-`, stem, `-ano`; no locant labels on the canvas).

A substituted or unsaturated ring (I-26) gets **Cuenta los carbonos**,
**Busca el anillo** (as above, plus the ring-vs-chain rule of §13.5: "un
anillo manda siempre sobre una cadena abierta: el anillo es la cadena
principal…", and, when a side chain is longer than the ring, that the old
"longest chain wins" rule no longer applies), **Numera el anillo** (no ends:
every start atom and both directions; the rules in order; the options that
start with the lowest first number compared side by side like a chain's
Opción A/B — the others "pierden enseguida" — merged when equivalent and
ordered by their values, so the winner is A whatever the atom ids; one
sentence instead when a single option remains; the ring locant-omission
note), then **Nombra los sustituyentes**, **Ordena alfabéticamente** and
**Monta el nombre** as for a chain, worded for a ring ("salen del anillo",
"el nombre del anillo"). Locant labels appear on the canvas only when the
name has locants.

Benzene and a monosubstituted benzene (I-28) get **Cuenta los carbonos**,
**Reconoce el benceno** (step id `benzene`: the hexagon with three
alternating double bonds, highlighted apart from the single ring bonds,
has its own name «benceno», not «ciclohexatrieno»; the two Kekulé drawings
— double bonds on one set of sides or the other — are the same molecule
and get the same name; with a side chain, the ring is senior to the chain,
the old form with the ring as «fenilo» («feniletano») is not preferred,
and a single substituent needs no number), **Nombra los sustituyentes**
("sin número") and **Monta el nombre** (legend: prefix, `benceno`; the
traditional names under "También es correcto"). No numbering or order
step, no locant labels.

A halogen derivative (I-30) gets the steps of its parent kind (chain, ring
or benzene); where a halogen is present they say so: **Cuenta los
carbonos** counts the halogen atoms and gives the Hill formula (C₃H₆BrCl,
CCl₄: "ningún hidrógeno"), and that each halogen takes the place of a
hydrogen; **Busca la cadena más larga** / **Busca el anillo**, that
halogens are never part of the chain or ring, only substituents;
**Desempates**, that P4 counts halogens as well as branches; **Numera la
cadena**, the omitted-locant notes (`cloroetano`, `hexacloroetano`);
**Nombra los sustituyentes**, the prefixes fluoro-, cloro-, bromo-, yodo-
(never a suffix), "hay 2 átomos de cloro", and a halogenated group
(`clorometil`) as "una rama con halógenos"; **Ordena alfabéticamente**, that
halogens are ordered with the branches by their Spanish names («yodo» por
la y); **Monta el nombre**, that halogens never change the ending. The
"number is written anyway" note of short chains is not given for halogen
locants (they tell isomers apart).

An alcohol (I-31) gets one more step after **Cuenta los carbonos** (which
counts the oxygen atoms in the Hill formula, `C₂H₆O`, and says each O is
drawn as OH): **Reconoce el grupo funcional** (step id `group`: the –OH
group, the molecule is an alcohol or, on benzene, a fenol; the –OH is the
principal group, named with the suffix «-ol», «-diol», «-triol»; an OH on a
branch is «hidroxi-»; halogens are never principal). A chain parent then
gets **Busca la cadena principal** (id `groupChain`, from P0 and P1: the
chain must carry the most –OH groups before being the longest; a longer
chain with fewer –OH is shown as an option) instead of **Busca la cadena
más larga**. **Numera la cadena** / **Numera el anillo** explain N0 (the
–OH carbon gets the lowest number, before the multiple bonds and the
prefixes; "Fíjate: empezando por el otro extremo, el enlace doble tendría
el número 1…, pero manda el –OH"), and the omitted locants of `etanol` and
`ciclohexanol`; **Busca el anillo** says the –OH is not part of the ring;
**Reconoce el benceno** says a benzene with an –OH is «fenol»; **Monta el
nombre** explains the suffix and the final `o` of the ending («propan-2-ol»
but «etano-1,2-diol»), with legend entries for the OH locants and `-ol`.
An aldehyde or ketone (I-32) gets the same steps in its own words: the
group step names the –CHO (always at a chain end) or the C=O between two
carbons, says the C=O carbon is a chain (or ring) carbon and gives «-al» /
«-ona» («-dial», «-diona»); with other oxygen groups it states the order
aldehído > cetona > alcohol and the prefixes «oxo-» / «hidroxi-»; each C=O
is highlighted whole (carbon, oxygen and the double bond). **Cuenta los
carbonos** says a C=O oxygen is drawn as O and takes the place of two
hydrogens; **Numera la cadena** explains why an aldehyde's number is never
written («El carbono del grupo –CHO siempre es el 1…») and why
«propanona» needs none (with «propan-2-ona» as the IUPAC form);
**Nombra los sustituyentes** and the legend describe `oxo-` and `hidroxi-`.
A carboxylic acid (I-33) gets the same steps again: the group step
(`acidGroupStep()`) names the –COOH (a carbon with an O on a double bond
and an –OH, one group: its –OH is not an alcohol nor its C=O a ketone),
says its carbon is always a chain end counted in the chain (carbon 1),
gives «ácido …-oico» («-dioico») and, with other oxygen groups, the order
ácido > aldehído > cetona > alcohol and the prefixes «oxo-» (also for a
–CHO at the other end) / «hidroxi-»; each –COOH is highlighted whole
(carbon, both oxygens and both C–O bonds). **Cuenta los carbonos** says a
–COOH has both an O and an OH; **Numera la cadena** explains why the
acid's number is never written; **Monta el nombre** explains the word
«ácido» that starts the name (also the first legend entry).
An ether (I-34, any `alkoxy` prefix) gets one more step after the group
step (or after **Cuenta los carbonos**): **Reconoce el éter** (id `ether`,
`etherStep()`): the O bonded to two carbons, the molecule is an ether (or
"además, un éter" beside a principal group); an ether is never the
principal group nor a suffix, it is a prefix ending in «-oxi»; the chain
cannot run through the O, which splits the molecule into two sides whose
chains compete with the usual rules; which side holds the parent and why,
read from the trace (`etherSideReason()`: the first rule after which no
chain of the alkoxy side survives — the principal group P0, the length P1,
the multiple bonds P2/P3, the number of substituents P4 or a numbering
rule, or the presentation tie-break: both sides alike, same name; a ring
parent: the ring is always senior); and how the prefix is formed
(`alkoxyFormation()`: `met` + `oxi` = `metoxi`, the short form only up
to four carbons; `pentil` + `oxi` = `pentiloxi` in parentheses;
`isopropoxi` with `propan-2-iloxi` and `1-metiletoxi`; `tert-butoxi`).
The step highlights the parent side (parent), the alkoxy side
(substituent) and the O with its two C–O bonds (candidate); with several
ether oxygens on the parent, one option per O («Oxígeno 1 de 2»); an ether
inside a branch or inside the alkoxy group is mentioned. **Cuenta los
carbonos** says the ether O is drawn O, without hydrogen, and takes the
place of no hydrogen; **Busca la cadena** says the chain cannot run
through the O; **Nombra los sustituyentes**, **Ordena alfabéticamente**,
the legend and **Monta el nombre** describe the «-oxi» prefixes (called
"grupo metoxi", never "metoxilo"), their order among the others and the
functional-class name under the alternatives.
An ester (I-35, `structure.ester`) gets the acid's steps in its own words
(SUFFIX_GROUP_WORDS `ester`: «el grupo –COO–»): the group step
(`esterGroupStep()`) names the –COO– (a carbon with an O on a double bond
and a second O that joins it to another group of carbons, one group: its
C=O is not a ketone nor its middle O an ether), says its carbon is always
a chain end counted in the chain (carbon 1), that the name has two words
joined by «de» (the first ending in «-oato», the second the group ending in
«-ilo») and, with other oxygen groups on either part, the order ácido >
éster > aldehído > cetona > alcohol with «oxo-» / «hidroxi-» written in
their own part; the –COO– is highlighted whole. Then one more step,
**Separa las dos partes del éster** (id `ester`, `esterStep()`): the
middle O splits the molecule; the acid part (the chain with the C=O
carbon as carbon 1, named like its acid, «ácido etanoico» → «etanoato»)
and the O-bound group (named like a branch, as a word of its own ending
in «-ilo»; `esterGroupFormation()`: `isopropilo` with `propan-2-ilo` and
`1-metiletilo`, `tert-butilo`, the details of a branched, unsaturated or
substituted group) are explained and highlighted apart — acid part as
parent, group as substituent, the middle O with its two bonds as
candidate — with one option per part («Parte del ácido», «Grupo unido al
oxígeno»); then the Spanish order. **Cuenta los carbonos** says both O
of the –COO– are drawn O (one on a double bond, one between two carbons);
**Busca la cadena principal** says the chain cannot cross the middle O
(a longer O-bound group is shown as an option that loses at P0);
**Numera la cadena** says the –COO– carbon is always 1 («nunca
«-1-oato»»); the legend ends with `-oato`, `de` and the group; **Monta
el nombre** explains the two words, `-oato` without a locant, `de` and
the group, and that English writes the group first (a fixed example,
«methyl ethanoate»: the English lexicon is never bundled).

An amine (I-36, `structure.suffix.kind` 'amine') gets the alcohol's steps
in its own words (SUFFIX_GROUP_WORDS `amine`, glossary term `amina`): the
group step (`amineGroupStep()`) shows each N with its carbon, says whether
it is –NH₂, –NH– or –N– (primary, secondary, tertiary), gives «-amina»
(«-diamina»…), says the N is never in the chain, that the groups on the N
are written with the letter «N» instead of a number (they hang from the
nitrogen, not from a carbon), notes `amino-` for amines on branches and
`anilina` for `bencenamina`. When a more senior group is present, every
other group step adds «> amina» to the seniority order and says the amine
is written `amino-`. **Cuenta los carbonos** puts N in the formula (Hill
order …, I, N, O; H = 2C + 2 + N − 2π − 2·anillos − X; `atomCounts()`
returns `nitrogens` only when there is one) and says how the N is drawn
(NH₂, NH or N) and that it takes one hydrogen of each carbon it is bonded
to. **Busca la cadena principal** explains from the trace which side of
the N holds the parent (length, multiple bonds, substituents, numbering or
a tie; `amineSideReason()`, `amineSideSentences()`), one option per side;
the `N` locant is shown as `N` in the comparison tables, notes, legend
(«el grupo va unido al nitrógeno, no a un carbono»), order and assemble
steps but never drawn on the molecule; `amino` prefixes are described as
compound prefixes (`(dimetilamino)`, `[etil(metil)amino]`).

An amide (I-37, `structure.suffix.kind` 'amide') gets the acid's steps in
its own words (SUFFIX_GROUP_WORDS `amide`) plus the amine's `N` machinery:
the group step (`amideGroupStep()`) shows the whole group (C, O and N, the
groups on the N as substituents), says whether it is –CONH₂, –CONH– or
–CON–, that its C=O is not a ketone nor its N an amine, that its carbon is a
chain end counted in the chain (carbon 1), gives «-amida» («-diamida»),
explains the `N` prefixes, adds the seniority ácido > éster > amida >
aldehído > cetona > alcohol > amina with `oxo-` / `hidroxi-` / `amino-`
when other groups are present, and points at `formamida` / `acetamida`.
**Cuenta los carbonos** counts the amide as one C=O, one O and one N
(`atomCounts()`) and says the O and the N sit on the same carbon; the N is
drawn NH₂, NH or N like an amine's. **Busca la cadena principal** says the
chain cannot cross the N; **Numera la cadena** says the amide carbon is
always 1 (`terminalGroupNote()`); **Monta el nombre** says the amide takes
no number.

A nitrile (I-38, `structure.suffix.kind` 'nitrile') gets the acid's steps
in its own words (SUFFIX_GROUP_WORDS `nitrile`): the group step
(`nitrileGroupStep()`) shows the whole –C≡N (carbon, N and triple bond),
says the triple bond is not an alkyne's (no `-ino`: it joins a carbon and
a nitrogen), that its carbon is a chain end counted in the chain (carbon
1) and its N is not a chain atom, gives «-nitrilo» («-dinitrilo»), adds the
full seniority ácido > éster > amida > nitrilo > aldehído > cetona > alcohol
> amina with `oxo-` / `hidroxi-` / `amino-` when other groups are present,
and points at `acetonitrilo`. **Cuenta los carbonos** counts each nitrile
as one N and two π bonds (`atomCounts()`: the triple bond takes three
hydrogens of its carbon, the N adds one to the count) and says the N is
drawn N, without hydrogen (`allNitrogenSentences()`, before any amine N);
**Busca la cadena principal** says the N is not in the chain; **Numera la
cadena** says the nitrile carbon is always 1 (`terminalGroupNote()`);
**Monta el nombre** says the nitrile takes no number and that the parent
keeps its final «o» before «-nitrilo». A refused molecule with a nitrile
adds to «Reconoce los grupos» that its C≡N is not an alkyne's nor its N
an amine's.

A nitrile cited `ciano-` (I-39a, `cyano` substituents) is counted with its
carbon and N (two π bonds, the N drawn N) in **Cuenta los carbonos**; the
group step of the acid, ester or amide lists it («También tiene un grupo
–C≡N»), adds `nitrilo` to the seniority list, says it is cited `ciano-`
and that the prefix includes its carbon, not counted in any chain nor
numbered (`cyanoCarbonSentence()`), and highlights the –C≡N whole as a
substituent (`cyanoPrefixSpecs()`); with the nitrile principal, the group
step says which –C≡N stays on a branch. **Busca la cadena principal** says
the chain stops at the carbon bonded to the –C≡N («Sin contar el carbono
del –C≡N…» when the rest is one chain); **Nombra los sustituyentes** and
the legend describe `ciano` (and «Es una rama con un grupo –C≡N» for
`(cianometil)`).

Where the locant-omission table applies, a note explains it ("En «propeno» no
hace falta el número: el doble enlace solo puede estar en el carbono 1").
A molecule refused with `HETEROATOM` (I-29) gets four steps instead of
none: **Reconoce los grupos** (each characteristic group by family, with
what it looks like; the atoms of an acid, ester or amide are one group, not
alcohol/ether/amine plus ketone; an OH on benzene is a fenol), **Elige el
principal** (the order ácido > éster > amida > nitrilo > aldehído > cetona >
alcohol > amina; ethers and halogens are never principal), **Sufijo o
prefijo** (the principal group's suffix with an example, the prefixes of
the others) and **Aún no sé nombrarla** (the refusal message). The results
panel shows the error message with a "Ver paso a paso" stepper under it;
nothing is highlighted while that stepper is closed.

Glossary tooltips on underlined terms: *cadena principal*, *sustituyente
(radical)*, *localizador*, *insaturación*, *enlace doble/triple*, *anillo* (I-25),
*benceno* (I-28), *grupo funcional*, *grupo principal*, *sufijo*, *prefijo* (I-29);
*sustituyente* also covers an atom such as chlorine (I-30). Tone: second
person, short sentences, encouraging.

Snapshot tests: `explain()` output for ~60 fixtures stored as JSON and
compared.

---

## 6. Editor (MolView-like)

Full-size SVG canvas. Carbons are vertices, no "C" label by default (skeletal
formula). Toolbar with icons and Spanish tooltips; on narrow screens it wraps
to a bottom bar.

### 6.1 Tools

| Tool | Behaviour |
|---|---|
| **Elementos** (palette: C, O, N, F, Cl, Br, I; editor tool id `carbon`, element via `setElement()`) | Pick an element, then: click empty space → a lone atom of it (a lone carbon is how you draw methane). Click an atom of **another** element → change that atom to the picked one, as one undo step; refused in Spanish when its bonds exceed the new valence ("No se puede cambiar a oxígeno: este átomo tiene 3 enlaces y el oxígeno solo admite 2."). Click an atom of the **same** element → grow a new atom of it with a single bond at the best free angle (§6.2) — so Carbono on a carbon still grows a carbon. Drag from an atom or empty space → the one-bond drag of the bond tools (single bond): only the **new end atom** gets the picked element (its symbol shows in the preview); a start atom placed on empty space is a carbon, and releasing on an existing atom only bonds it — a drag never changes an element (a wobbly click that ends on the pressed atom is the self-bond refusal). |
| **Enlace simple / doble / triple** (default simple) | Bond tools always create **carbons** and never change an element; valence is checked per element (C 4, N 3, O 2, halogens 1), so C=O is drawn as a double bond with one end changed to O (or Enlace doble on a C–O bond) and C≡N likewise. Click empty space → new two-carbon fragment with that bond order. Click an atom → grow a new carbon bonded with that order. Drag from an atom or empty space → **one** new bond in the drag direction, snapped to 30°; releasing on an existing atom bonds the two (a ring is allowed; naming refuses it; the pressed atom itself → self-bond refusal). Click an existing bond → **set** it to the tool's order. |
| **Enlace simple: chain drag** (MolView-like) | With Enlace simple only, a drag long enough for a zigzag of two or more bonds (drag projected on the 30°-snapped axis ≥ 1.5 × `40·cos 30°`) grows a zigzag chain bond by bond along the drag (120° angles, fixed bond length, one bond per `40·cos 30°` of drag, side chosen away from the start atom's neighbours), with a live counter "5 C" = carbons the drag adds (from empty space, the whole chain; the one-bond preview shows "1 C"/"2 C" too). Release commits the whole chain as one transaction; a full start carbon refuses it ("Este carbono ya tiene 4 enlaces"), and a chain carbon landing on an existing atom refuses it (overlap message) — never a carbon on top of another. **Release on an atom:** whenever the pointer is over an existing atom, the drag is the one-bond drag above, whatever its length (the preview switches to that single bond), so "release on an atom bonds to it" keeps working; the chain never joins atoms. Doble/triple keep the one-bond drag: only the first bond of a chain could carry the order, which would be surprising. |
| **Anillos** (group of seven buttons: ring sizes 3–8 and **Benceno**; editor tool id `ring`, template via `setRingTemplate()` — a size, or `benzene` — or `setRingSize()`) | Places a regular ring of carbons joined by single bonds — or, with Benceno (I-28), a hexagon whose ring bonds alternate double and single (one Kekulé drawing; the hover preview shows the inner strokes of its three double bonds) — standard bond length (`freeRingPoints()`, `attachedRingPoints()`, `fusedRingPoints()` in `geometry.js`). Click empty space → a free ring centred at the pointer, one flat side at the bottom. Click an atom → a ring hung from it by a **single bond** (a cycloalkyl substituent), along the atom's best free direction (the §6.2 preferred angles, then the other 30° directions: the first where the whole ring fits), lying outward along it; refused with the valence message when the atom is full ("Este carbono ya tiene 4 enlaces."). Click a bond → a ring **fused** on it (sharing both atoms; the shared bond sets the side length), on the side with fewer neighbours of its two atoms, then the side with more room (`fusedRingSide()`); allowed although naming refuses fused rings (`RING_SYSTEM`); valence refusals apply. A benzene fused on a bond always gets exactly three alternating ring double bonds: on a double bond its two new bonds at the shared atoms are single (the shared bond is one of the three); on a single bond they are double, so both shared atoms need room for one; a triple bond, or a single bond without that room (e.g. the bond of a benzene drawn with it single, or an isobutane C–C), is refused: "Aquí no cabe un benceno: los átomos de este enlace no admiten los enlaces dobles alternados del benceno.". A new ring atom closer than 0.6 bond lengths to an existing atom refuses the whole ring with the overlap message; nothing changes. A drag counts as a click where it was pressed. Hovering previews the ring about to be placed (dashed, accent colour; no preview where the placement would be refused, nor over the 90° drawing). One undo step; `onEdit` kind `chemical`. In the 90° view a ring on a projected atom or bond is built on the model atoms, a free ring goes where loose pieces go (below), and the ring makes the view fall back to the normal drawing. |
| **Cambiar enlace** | Click a bond → cycle 1→2→3→1 (skipping orders that break valence, e.g. C=O → C–O; a C–Cl bond cannot change: "Este enlace no puede cambiar: sus átomos no admiten más enlaces."). |
| **Borrar** | Click atom → delete it and its bonds. Click bond → delete the bond only; both atoms stay (the model does not record how an atom was created, so an endpoint cannot be told apart from a carbon placed on its own). |
| **Mover** | Drag an atom (moves it) or a bond (moves its two atoms). Drag on empty space → marquee selection; then drag the selection (press on a selected atom, a bond between selected atoms, or inside the selection's box). Click selects an atom; click on empty space or Esc clears the selection. Dropping an atom on another is refused. Not available while the 90° drawing is shown (see below). |
| Pan / zoom | Space+drag, middle-drag or two-finger drag pans; wheel / pinch zooms; "Centrar" button fits the molecule. |
| Buttons | Deshacer, Rehacer, Limpiar (in-page confirmation dialog, never `window.confirm`), Ordenar dibujo (§7). |
| 90° view (editing) | While the "Ángulos rectos (90°)" drawing is actually shown (§6.3) every tool works on it except **Mover**. Gestures are hit-tested on the **projected** positions (hover, the pressed carbon or bond, the release target, a snapped end landing on a carbon) and previews are drawn there; each gesture becomes one ordinary model edit, after which the projection is recomputed and the carbons the gesture added (or, if none, the ends of the bond it added or changed) get a blue ring for about 1 s, since the re-layout may move things. **Mapping to the model:** a carbon grown from an existing carbon (Carbono or bond-tool click, one-bond drag to empty space, every carbon of an Enlace simple chain drag) gets its model position by the §6.2 rules — the drag direction has no meaning in the model — and a chain drag adds as many carbons as its projected length measures (the live counter); bond orders, joins (release on a carbon) and Borrar act on the hit ids; a new loose piece (click or drag on empty space) goes to the pressed points in the model (the projection is centred on the model drawing), moved down by whole bond lengths until it clears every model carbon by 0.6 bond lengths, so it is never refused for hitting an invisible atom. **Mover** and **Ordenar dibujo** are disabled there (they only change model coordinates, which the projection ignores), the `m` shortcut is ignored, and a drag with Mover still picked pans; the note under the canvas says "Puedes dibujar aquí. Para mover átomos u ordenar el dibujo, desactiva los ángulos rectos.". One undo step per gesture, Esc / pointer cancel and valence refusals work as everywhere. An edit that makes the molecule unprojectable (a loose piece, a ring…) falls back to the normal drawing (§6.3), and the first edit that makes it projectable again switches back to the 90° drawing by itself. |

Rules: every pointer gesture commits **one** undo transaction; Esc or pointer
cancel restores the starting state. Duplicate bonds ("Estos dos átomos ya
están unidos.") and self-bonds ("No se puede unir un átomo consigo mismo.")
are rejected; any valence violation is refused with a brief shake and a toast
("Este carbono ya tiene 4 enlaces", "Este oxígeno ya tiene 2 enlaces."). After a bond-order change, linear
geometry is recomputed (triple bonds and cumulated double bonds straightened
to 180°) as part of the same transaction.

The former **Cadena** tool was removed as redundant (one tool fewer for
students): the Enlace simple drag does the same, and its `h` shortcut now
selects Enlace simple, so the key still leads to chain drawing.

Keyboard: elements `c` carbono, `o` oxígeno, `n` nitrógeno, `f` flúor, `l` cloro,
`b` bromo, `i` yodo (`ELEMENT_KEYS` in `editor.js`); `1/2/3` bond tools (`h` also Enlace simple), `t` cambiar enlace,
`a` anillos (pressed again while Anillos is the tool: next template, 3→…→8→benceno→3, `nextRingTemplate()`; digits stay free because `3` is Enlace triple),
`e`/`Supr` borrar, `m` mover, `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` (also
`Ctrl/Cmd+Y`). Ignored in text fields and while a dialog is open.

### 6.2 Geometry

- Fixed bond length (40 px at zoom 1).
- New-atom angle from an atom with one neighbour: ±120° from it, choosing the
  side that continues the zigzag relative to that neighbour's other
  neighbour; with two neighbours: bisector of the largest gap; three: largest
  gap. Linear centres (triple bond, or two double bonds): 180°.
- Avoid overlapping existing atoms (try alternative angles, then a small
  nudge).

### 6.3 Rendering

- Double bonds: two parallel lines, second one offset toward the inside of the
  zigzag; triple: three lines. Bond multiplicity is shown only by strokes.
  A double bond that belongs to a ring (ring bonds from `perceiveRings()`)
  draws its shorter second line toward the ring's interior: the centroid of
  the smallest ring through that bond, so in a fused system the smaller
  ring's centre (`ringBondCentres()`, `ringInnerSide()` in `render.js`); the
  zigzag rule is the fallback only when that centre lies on the bond line.
  This applies in both display modes (Con carbonos draws the same strokes,
  trimmed at the labels); the 90° view is never drawn for a ring. Triple
  bonds in rings and acyclic double bonds are unchanged.
- Display toggle **Esqueleto / Con carbonos**. **Esqueleto** (default) draws
  every carbon as a line vertex marked with a small filled dot (radius 3.5
  drawing units against 2-unit bonds, so it scales with the zoom), so a
  student can count carbons even where two bonds are nearly collinear; chain
  ends are dotted too, and a lone carbon gets its dot plus a `CH₄` label just
  below it (clicking that label acts on the carbon, in both modes). The dot is drawn above the hover, selection and stepper highlight
  discs, which stay visible around it; drag previews (bond, chain) dot their
  future carbons in the accent colour, and the redraw animation re-renders
  the dots every frame. **Con carbonos** draws no dots and labels each carbon
  with C + implicit H only (`CH₃`, `CH₂`, `CH`, `C`) — never `=` in labels.
- **Heteroatoms** (O, N, F, Cl, Br, I) are labelled in **every** mode with
  their symbol + implicit H (`OH`, `O`, `NH₂`, `NH`, `N`, `Cl`…; a lone one
  shows its formula: `H₂O`, `NH₃`, `HF`, `HCl`, `HBr`, `HI`), centred on the
  atom, coloured by element (O red, N blue, halogens green), never dotted;
  bond strokes stop `LABEL_GAP` short of them (`atomLabel()` in `labels.js`,
  `bondEndCuts()` in `render.js`). A click anywhere on the label box — sized
  to the text (`labelSize()` + 1 unit, `heteroLabelBox()`/`onHeteroLabel()` in
  `geometry.js`) — acts on the atom; off that box, a visible bond stroke wins
  over the heteroatom's hit circle, so a bond between two close labels
  (O–O, N–Cl) stays editable (`hitTest()`).
  Carbon rendering is unchanged. The 90° view and "Ordenar dibujo" need a
  name, so a heteroatom molecule (naming error `HETEROATOM`) shows the normal
  drawing ("Hay átomos que no son carbono: se ve el dibujo normal.") and
  "Ordenar dibujo" shows the "aún no sé nombrar" message instead. A named
  halogen derivative (I-30) is ordered by "Ordenar dibujo" like any named
  molecule (halogens are placed as one-atom branches), but the 90° view
  keeps the normal drawing with the same note for any molecule with an atom
  other than carbon (`projectRightAngles()`; heteroatoms in the 90° view are
  I-41).
- **Ángulos rectos (90°)** toggle, shown in Con carbonos only (Esqueleto
  keeps the 120° zigzag and hides it; the preference is kept and remembered
  in `localStorage` like the display mode). It draws the textbook
  semi-developed formula: the parent chain (from the naming result, as in
  §7) on one horizontal line with locant 1 on the left, branches straight up
  or down from their carbon and continuing horizontally or vertically.
  - It is a **display-only projection** (`rightAngleLayout()` in
    `src/layout/rightangle.js`, pure; handed to the editor through
    `setProjector()`): the model's coordinates never change, so turning it
    off restores the drawing exactly, and undo, autosave and "is ordered"
    are unaffected. It is recomputed whenever the molecule changes (edit,
    undo, redo, example, restore).
  - Placement on an integer grid, collision-free by construction: a branch
    leaving the chain or going straight on owns a half-plane (it may turn to
    both sides); a branch that turned owns a quadrant (it may only go on or
    turn away from the chain). Bonds are lengthened, never bent, when a
    sibling's box is in the way; the most compact choice is kept; branches
    on the same side of the chain never share a column. A single branch
    hangs down (the user's reference picture), two go up and down.
  - Uniform column step = widest label (estimated by `labelSize()`) plus
    two 4-unit gaps and a 16-unit visible stroke; row step likewise for the
    label height. Strokes stop 4 units short of the label boxes; double and
    triple bonds become two/three equal parallel strokes (`=`, `≡`),
    horizontal or vertical. Locant numbers sit up-right of their label.
  - Every drawing is checked by `rightAngleProblems()` (axis-aligned bonds,
    no overlapping labels, no bond through a label, no crossing or
    overlapping bonds). **Fallback**: an empty drawing, an unnameable
    structure (several fragments, a ring…) or no clean placement (a carbon
    with three children inside a turned branch: none in 1 200 random 1–14 C
    molecules, ≈0.3 % of 15–40 C, ≈2 % of 40–60 C) draws the normal layout (every tool, Mover and Ordenar dibujo included)
    with a short note under the canvas ("Hay piezas sueltas: se ve el dibujo
    normal."; on an empty canvas the gentle hint "Los ángulos rectos
    aparecerán cuando dibujes una molécula.").
  - The projected drawing is **editable** (§6.1 "90° view (editing)";
    `isProjected()` = a projector is set and succeeded): the editor core
    receives the projected copy as its `display` and hit-tests gestures on
    it, while every edit is made on the model; only Mover and Ordenar dibujo
    are off there. The drawing switches to the projection as soon as an edit
    makes the molecule projectable, and back to the normal drawing if an
    edit or undo makes it unprojectable. Stepper highlights and locants are
    drawn on the projected positions (unless "Resaltar en el dibujo" is off, §9).
- Hover highlight on atoms and bonds. Highlight API for the stepper:
  `highlight({atoms, bonds, style})` with styles
  `parent|candidate|substituent|locant`, and `showLocants(Map atomId→n)`.
- Live molecular formula under the canvas ("Fórmula: C₅H₁₂").
- Autosave to `localStorage` (every access in try/catch; restore goes
  through `validate()`'s structural part, `validateStructure()`, since a
  drawing in progress may be disconnected; corrupt data is removed and the
  canvas starts empty). Restore is not an undo entry. The display mode is
  remembered too.
- The editor distinguishes **chemical edits** (atoms/bonds/orders) from
  **coordinate edits** (move, redraw): only chemical edits invalidate a
  shown name. Every edit, undo, redo and restore is classified by comparing
  snapshots (`editKind()`) and reported through `onEdit({reason, kind})`.

---

## 7. Redraw ("Ordenar dibujo")

`canonicalLayout(mol, result)` → new coordinates only (ids and topology
unchanged):

- Parent by strategy (`canonical.js`): an open chain as a horizontal
  zigzag, locant 1 on the left; a named single carbocycle (I-27b,
  `layout/rings.js`; bare, substituted or unsaturated, 3–30 carbons,
  benzene included since I-28) as a
  regular polygon with the standard bond length, **locant 1 at the top
  vertex and the numbering running clockwise** on screen, in the order of
  the naming result's ring numbering. Each side chain leaves its ring atom
  outwards along the bisector of the exterior angle; two on one ring atom
  are spread symmetrically inside the free exterior angle (± a sixth of it:
  ±40° on a hexagon, ±50° on a triangle, ±32° on a 30-ring). The branches
  of a ring atom (and of every side-chain atom) are taken in canonical-key
  order, so the drawing does not depend on atom ids, insertion order or
  input coordinates. The layout only walks the tree side chains (it checks
  first that the molecule has exactly one ring and that it is the parent),
  so it never loops on a cycle.
- Substituents drawn away from the parent on the zigzag's free side (or
  outwards from the ring), recursively as zigzags, by the same code for
  chains and rings; resolve collisions by flipping sides, then widening
  angles. Tested on densely branched examples (no two atoms closer than 0.5
  bond lengths, no bond crossings). If no such layout is found, the drawing
  is left unchanged and a Spanish message says so. A press on the canvas
  during the animation only ends it.
- Linear centres straightened.
- Applied as **one** undoable coordinate edit, animated ~400 ms
  (`prefers-reduced-motion` respected); pressing it on an already ordered
  drawing adds no undo step. When the ordered drawing would not fit the
  visible canvas, the canvas is re-centred on it as part of that edit: one
  Deshacer (also during the animation) brings the previous drawing back in
  the view it had, so every carbon is where it was on screen, and Rehacer
  shows the ordered drawing re-centred again. Undone or redone while the
  90° drawing is shown, the canvas keeps the 90° drawing's view, and the
  normal drawing gets its restored view when it comes back. The naming result stays (when no name is shown,
  the toolbar button names the molecule first); the parent is highlighted
  persistently while the ordered drawing is shown (i.e. until an atom moves
  or undo restores other coordinates; for a ring: all ring atoms and bonds,
  closure bond included); locant numbers appear next to parent atoms from
  the numbering step ("Numera la cadena" / "Numera el anillo") on, except
  on a bare ring, whose numbering step uses no numbers. A step's option views (Opción A/B,
  chain candidates) are shown unchanged. "Resaltar en el dibujo" off (§9)
  hides these marks too.
- After naming, a hint offers it: "¿Quieres ver la cadena principal
  ordenada?", or for a named ring "¿Quieres ver el anillo ordenado?". A
  molecule that cannot be named (polysubstituted benzenes, ring systems,
  heteroatoms…) gets no hint and the button shows its naming error.
  Benzene and monosubstituted benzenes (I-28) are ordered by the ring
  strategy like any named single carbocycle (locant 1, the substituted
  carbon, on top); their bond orders are kept as drawn.
- While the 90° drawing is shown (§6.3) "Ordenar dibujo" and its hint are disabled (the
  change would be invisible there; the message "Desactiva los ángulos rectos
  para ordenar el dibujo." answers a call anyway). The 90° view already puts
  the parent chain on one horizontal line; turning it off shows the ordered
  or unordered model drawing as it was.

---

## 8. Oracle cross-check (OPSIN) — development only

OPSIN (open-source name→structure, Java) reads English IUPAC names.

1. English names come from the **same name structure** rendered with
   `lexicon.en.js` (`met`→`meth`, `et`→`eth`, `-ano`→`-ane`, `-eno`→`-ene`,
   `-ino`→`-yne`, `-il`→`-yl`, `-iliden`→`-ylidene`, retained prefixes,
   punctuation) — never substring translation.
2. A seeded random generator produces valid acyclic hydrocarbons (4–14 C,
   random branching and unsaturation within valence), half as many random
   monocycles (a 3–10 C ring with random side chains and ring/side-chain
   double and triple bonds, I-26), a tenth as many benzene derivatives
   (benzene, then random monosubstituted benzenes in either Kekulé drawing,
   I-28; their traditional names `toluene` / `styrene` are checked too),
   half as many halogen derivatives (I-30, `generateHalogenated()`: random
   hydrocarbons of 1 C upward, monocycles and benzenes whose hydrogens are
   replaced at random by F, Cl, Br or I, `halogenate()`), half as many
   alcohols (I-31, `generateAlcohols()`: random hydrocarbons of 1 C upward
   and monocycles whose hydrogens become OH groups at random,
   `hydroxylate()` — on ring carbons only for a ring —, phenol, some also
   halogenated), half as many aldehydes and ketones (I-32,
   `generateCarbonyls()`: random hydrocarbons of 1 C upward and monocycles
   whose carbons with two hydrogens become C=O at random, `carbonylate()` —
   on ring carbons only for a ring —, some also with OH groups and halogens;
   only molecules the engine names are kept, so acyl branches are left
   out; acids too, which `generateAcids()` covers), half as many
   carboxylic acids (I-33, `generateAcids()`: random hydrocarbons of 1 C
   upward with one or two –CH₃ ends turned into –COOH, `carboxylate()`,
   some also with C=O, OH groups and halogens; only molecules the engine
   names in every prefix style are kept), half as many ethers (I-34,
   `generateEthers()`: random hydrocarbons of 2 C upward, monocycles and
   monosubstituted benzenes with an O put into one or two C–C single
   bonds outside the ring, `etherify()`, some also with a –COOH, C=O, OH
   groups and halogens; only molecules the engine names in every prefix
   style are kept), half as many esters (I-35, `generateEsters()`: a
   random hydrocarbon of 1 C upward with one –COOH, `carboxylate()`, whose
   OH is joined to a random hydrocarbon of 1–6 C by any carbon,
   `esterify()`, some also with C=O, OH groups and halogens on either part;
   only molecules with one ester that the engine names in every prefix
   style are kept), half as many amines (I-36, `generateAmines()`: random
   hydrocarbons of 1 C upward, monocycles and monosubstituted benzenes with
   `aminate()` — NH₂ on random carbons (ring carbons only for a ring), an
   N put into C–C single bonds outside the ring (for a ring, with one end on
   it), small alkyl groups grafted on the new N for secondary and tertiary
   amines —, some also with a –COOH, an ester, an ether O, C=O, OH groups
   and halogens, so `amino-` and substituted amino prefixes appear; only
   molecules with an amine N that the engine names in every prefix style
   are kept), half as many amides (I-37, `generateAmides()`: random
   hydrocarbons of 1 C upward with one or two –CONH₂ at chain ends,
   `amidate()`, a single amide often with 1–4 C alkyl groups on its N,
   some also with C=O, OH groups, amines, an ether O and halogens; only
   molecules with an amide that the engine names in every prefix style are
   kept), half as many nitriles (I-38, `generateNitriles()`: random
   hydrocarbons of 1 C upward with one or two –C≡N at chain ends,
   `nitrilate()`, some also with C=O, OH groups, amines, an ether O and
   halogens; only molecules with a nitrile that the engine names in every
   prefix style are kept), half as many `ciano-` molecules (I-39a,
   `generateCyano()`: an acid, an ester, an amide, or one or two nitriles
   with an ether O splitting the skeleton, then one to three –C≡N on any
   carbon, `cyanate()`, some also with C=O, OH groups, amines and
   halogens; only molecules named in every style with some `ciano` are
   kept), plus one cycloalkane per ring size in the carbon range
   (I-25).
   Each molecule is checked in every prefix style, plus its traditional
   name (`toluene`, `styrene`, `anisole`, `formaldehyde`, `acetaldehyde`,
   `acetone`, `formic acid`, `acetic acid`, `oxalic acid`, and the esters'
   `methyl acetate`, `ethyl formate`… rendered by `renderName(…,
   {traditional})`) and the
   `propan-2-one` form of `propanone`, `aniline` / `N-methylaniline`
   (`renderName(…, {traditional: 'aniline'})`), `acetamide` /
   `N,N-dimethylformamide` (`{traditional: 'acetamide'}`, I-37), `acetonitrile`
   (I-38) and the alkylamine names
   (`ethylmethylamine`, `naming/index.js amineClassName()` with the English
   lexicon); the functional-class ether names are not checked.
3. name → English → OPSIN → SMILES → a **dev-only fuller SMILES parser**
   (bracket atoms, explicit H) → hydrogen-suppressed molecule keeping every
   heavy atom and its element (I-22), rings kept (I-24) → compare with the
   original using `canonicalKey()` (unrooted tree key, or the monocycle key;
   elements + bond orders + ring closures) after checking that both have the
   same number of rings, plus a formula check. Aromatic (lowercase) OPSIN
   SMILES are kekulized first, and a benzene ring matches in either Kekulé
   drawing (both keys of the original are accepted, I-28). A formula match alone never
   passes; polycycles fail until they have a key. Unsupported OPSIN syntax is an adapter failure, not a naming
   failure.
4. OPSIN runs from a **pinned** CLI jar (version + SHA-256 recorded in
   `scripts/oracle/README.md`, downloaded to `scripts/oracle/vendor/`,
   gitignored) when Java is available. The public web service is optional
   and never part of acceptance. Unavailable → the check reports **skipped**,
   never passed.
5. Failures log seed, SMILES, Spanish name, English name, OPSIN version,
   OPSIN output.

A round trip proves the name **denotes** the right structure; it does not
prove the parent choice, numbering, locant omission or Spanish spelling are
the preferred ones. Fixtures (§4.8) remain the authority for those.

Also: **graph-invariance tests** — for random molecules, renumber atom ids
and shuffle bond insertion order; the name must not change.

Decisions (phase I-7): the pinned jar is OPSIN 2.9.0 (CLI, runs on Java 8).
Every molecule is checked in all three prefix styles (`isopropil`, `pin`,
`substituted`) and passes only if all three names round-trip. Unreadable
OPSIN SMILES is counted apart as an adapter failure; failures go to
`scripts/oracle/logs/` (gitignored). The generator draws molecules distinct
by canonical tree key and within the naming size caps; `--min`/`--max` widen
the default 4–14 C range. Oracle runs over ~35 000 molecules (1–60 C) and the
176 fixtures found no structural mismatch: OPSIN confirms the structures
denoted by `isopropiliden`, `eteniliden`, `propiliden`, `tert-butil`,
`di(propan-2-il)`, `bis(1-metiletil)` and nested `-iliden` groups (not their
preference, which the fixtures carry).

---

## 9. UI

Layout (desktop): toolbar | canvas | results panel (right; below the canvas
on narrow screens).

- Big button **"¿Cómo se llama?"** (always enabled; on an empty canvas it
  answers with the `EMPTY` message).
- Results panel: the name (large, coloured parts); below it, when present,
  **"Otras formas válidas"** listing each alternative with its label (§1.1);
  then **"Ver paso a
  paso"**: a stepper with Anterior / Siguiente and progress dots, each step
  driving the canvas highlight.
- **"Resaltar en el dibujo"** switch (a toggle button with `aria-pressed`,
  on by default): hides or shows every canvas mark of the result — the
  parent / candidate / substituent / locant highlights and the locant
  numbers — in the normal and the 90° view, including the persistent parent
  highlight of the ordered drawing (§7). It sits in the stepper's header;
  while the stepper is closed (when the canvas shows the whole name's marks)
  a second switch with the same state sits next to "Ver paso a paso", so
  exactly one is visible. Flipping it never leaves or resets the stepper;
  moving to another step with the marks off keeps them off (the text still
  advances), and switching back on shows the current step's marks. The hover
  highlight is not affected. **Decision: the choice is remembered** in
  `localStorage` (`organicWeb.highlights` = `on`|`off`, every access in
  try/catch, missing means on), like the display mode and the 90° view, so a
  student who prefers the plain drawing is not asked again; the switch is
  always visible next to the text, so a forgotten "off" is easy to spot.
- Errors in friendly Spanish (§3.2), with a short hint for `EMPTY` and
  `DISCONNECTED` (`src/ui/results.js`); `CYCLE` (polysubstituted benzene), `RING_SYSTEM`
  and `TOO_BIG` have no hint.
- A chemical edit clears the result (stale names must never show);
  coordinate edits do not.
- **Ejemplos** menu: 12–15 molecules from SMILES covering each feature,
  loaded with the canonical layout (one undoable edit). Menu labels describe
  the feature ("Alcano ramificado"), not the name, so the student still asks.
- **Ayuda** dialog: how to draw, short, with small inline SVG illustrations.
- Light/dark theme following the system, colour tokens in `:root`.
- Accessibility: keyboard reachable controls, visible focus, ARIA labels on
  tools, the name and each step text available to screen readers.

---

## 10. Quality gates (every phase)

- `npm test` and `npm run check` green; e2e green from phase 100 on (editor
  phases test graph mutations through the editor's API and simple e2e
  drawing tests; name-button e2e starts in phase 100).
- JSDoc on every function; closing-brace comments for blocks > 10 lines.
- No `alert/confirm/prompt`.
- Engine code never touches coordinates or the DOM.

### 10.1 Deployment (Fastmail Files)

The app is hosted as a static site from Fastmail Files. `npm run deploy`
(`scripts/deploy.mjs`) uploads the single-file build `dist/index.html` over
WebDAV with one HTTP PUT to `https://myfiles.fastmail.com/OrganicWeb/index.html`
(`Content-Type: text/html; charset=utf-8`). Deploying is a **manual user
step**; the autoclaude loop never runs it (only `--dry-run`).

- Prerequisites (one time): a Fastmail app password restricted to **Files**,
  stored in the macOS Keychain with
  `security add-generic-password -s fastmail-webdav -a carlos@carpio.cc -w`;
  and the `OrganicWeb` folder made a public website in Fastmail's web UI
  (a one-time setting that uploads do not change).
- Flow: refuse a dirty git tree (`git status --porcelain` non-empty) unless
  `--force` → `npm test` and `npm run check` unless `--skip-checks` →
  `writeBuild()` → read the password with
  `security find-generic-password -s <service> -a <user> -w` → PUT → print
  HTTP status and byte size. Any failure or non-2xx response exits non-zero.
  Unknown flags print the usage and exit with status 2.
- `--dry-run` does everything except the Keychain read and the PUT.
  **Decision:** the dry run does not read the Keychain, so it needs no
  credentials and provably never touches the network.
- Secrets: the password is the child's stdout (never in any argv), stays in
  memory as a Basic `Authorization` header for Node's global `fetch`, and is
  never logged or written. No secret is stored in the repository. The upload
  URL must be `https://` (checked before any side effect), and the PUT does
  not follow redirects, so a 3xx fails the deploy.
- Env overrides: `FASTMAIL_USER`, `FASTMAIL_WEBDAV_URL`,
  `FASTMAIL_KEYCHAIN_SERVICE` (the Keychain account is the WebDAV user).
- Tests (`tests/unit/deploy.test.js`) inject fakes for git, npm, the build,
  the Keychain and `fetch`; they never contact Fastmail or read the Keychain.

---

## 11. Phase list (delivered as inbox items)

Zero-padded so alphabetical order = execution order.

| # | Inbox file | Content |
|---|---|---|
| 1 | `010-scaffold.md` | Layout, package.json scripts, shell page, CSS tokens, test runner, build script with a packaging smoke test, Playwright set-up. |
| 2 | `020-model.md` | §3 model, validation, graph utils, canonical tree key, SMILES subset. |
| 3 | `030-naming-linear.md` | §4.1 contracts, §4.7 structure + Spanish lexicon + renderer, unbranched chains with unsaturation, omission table, first fixtures. |
| 4 | `040-naming-parent.md` | §4.2–4.4 parent selection and numbering with simple alkyl substituents, full trace. |
| 5 | `050-naming-substituents.md` | §4.5 recursive preferred substituents, grouping, alphanumerical order. |
| 6 | `060-naming-iliden-fixtures.md` | §4.6 `-iliden`, complete assembly, fixture set to ≥ 150 reviewed rows. |
| 7 | `070-oracle.md` | §8 OPSIN cross-check + graph-invariance tests; fix what they find. |
| 8 | `080-editor-core.md` | §6.1–6.3 core tools, transactions, undo/redo, rendering. |
| 9 | `090-editor-extras.md` | Chain tool, move/marquee, pan/zoom, condensed mode, formula, autosave, keyboard, touch. |
| 10 | `100-explain-results.md` | §5 explanations + §9 results panel and stepper wired to highlights; name-button e2e. |
| 11 | `110-redraw-examples.md` | §7 redraw + Ejemplos gallery. |
| 12 | `120-polish-release.md` | Ayuda, glossary, accessibility, responsive, `dist/index.html`, README, final acceptance. |

The v1 phases above were delivered as I-1…I-20 (see the progress archive).
The v2 phases I-21…I-41 are listed in §13.4.

## 12. Future (not v1)

Rings, benzene and functional groups are now planned as v2 (§13). Still
future: E/Z, quiz mode ("¿Cómo se llama?" in reverse: name → draw it).

---

## 13. v2 — rings and functional groups

Source: inbox item `autoclaude/processed/215-rings-functional-groups-confirmed.md`
(plan drafted with a Codex review of the codebase). v2 lifts the v1 limit
"acyclic hydrocarbons only". Every v2 phase keeps all existing hydrocarbon
behaviour, fixtures, snapshots and e2e green; unsupported combinations return
a clear Spanish "not nameable yet" message, never a crash or a wrong name.

### 13.1 User decisions (FINAL, 2026-09-27)

These answer the plan's open questions and are final, not provisional:

| Topic | Decision |
|---|---|
| Level | **ESO + 1º Bachillerato** — every family in the phase list below. |
| Displayed name | **Systematic IUPAC name first** (propanona, ácido etanoico, metilbenceno). Traditional names (acetona, ácido acético, tolueno…) are listed under "Otras formas válidas", as `isopropil` is today. |
| Benzene | **Monosubstituted derivatives only**; no orto/meta/para. |
| Out of scope | Stereochemistry (E/Z, cis/trans, R/S), charges, salts, heterocycles, polycycles (fused, bridged, spiro). |

Still to review per phase: new tables and exceptions need reviewed fixtures
before being presented as validated IUPAC 2013 coverage.

### 13.2 Model and data changes

- **Multi-element atoms** (I-21, done): `Atom.element` ∈ C, O, N, F, Cl,
  Br, I; neutral valences C 4, N 3, O 2, halogens 1 in one table
  (`model/elements.js`); implicit H per element; Hill formula; JSON, autosave,
  undo and ids backward compatible; element-specific valence errors; charges,
  radicals and unknown elements rejected on restore; "invalid structure" vs
  "valid but not nameable yet" (§3.2); separate caps on carbons (60), heavy
  atoms (80) and parent size (30).
- **Ring perception** (I-24, done), not just detection: `model/rings.js`
  `perceiveRings()` gives the cyclomatic number per component, ordered ring
  members (one fundamental cycle per closure bond of a breadth-first
  spanning forest), closure bonds, ring blocks (biconnected components),
  cyclic components and attachment points; `classifyRings()` says
  `acyclic`, `carbocycle`, `heterocycle`, `fused`, `bridged` (fused when
  every branch atom of a polycyclic block is bonded to another branch atom —
  exact for bicycles, a heuristic beyond), `spiro` or `several` (ring
  assemblies, rings joined by a chain), in that precedence over every ring
  block, so mixed systems do not depend on atom ids (fused + bridged blocks
  → `bridged`; a polycyclic block plus other rings → `fused`/`bridged`).
  SMILES ring labels are ring numbers (`1` ≡ `%01`). A single carbocycle
  (3–30 C) is named by `naming/rings.js`: bare since I-25 (`ciclopropano` …
  `ciclotriacontano`), with side chains and ring multiple bonds since I-26
  (§13.5), and a benzene ring with at most one substituent by
  `naming/aromatic.js` since I-28 (two or more: `CYCLE`); every other ring
  system gets `RING_SYSTEM` with an explicit message (§3.2).
- **`NameStructure` and trace** gain parent kind (`parentKind`, since
  I-25; a `RING` trace step for a ring parent), functional groups,
  principal group, suffixes, prefixes and locants on heteroatoms. Since
  I-29 the groups, the principal group and each group's suffix/prefix role
  are detected (`naming/groups.js`, `naming/seniority.js`, §13.6) and travel
  as `groups` on the `HETEROATOM` refusal (§4.1); the phases that name
  heteroatom molecules will put the same analysis on their results and add
  locants on heteroatoms to the structure. Halogen derivatives (I-30) need
  neither: a halogen is a prefix whose locant is its carbon's, carried as a
  `halogen` SubstituentStructure (§4.5), and their results carry no
  `groups`. Alcohols (I-31) add the locants on heteroatoms to the
  structure as `suffix` (§4.1, §4.7) and carry no `groups` either (the
  explanation reads the suffix); aldehydes and ketones (I-32) reuse that
  `suffix` with `kind` 'aldehyde' / 'ketone' and cite non-principal
  oxygen groups as `oxo` / `hydroxy` prefixes; carboxylic acids (I-33)
  use `kind` 'acid', each –COOH one entry carrying its OH oxygen
  (`hydroxyAtom`); ethers (I-34) are `alkoxy` prefixes (§4.5) whose
  locants carry the carbon across the O (`etherCarbon`, `etherBond`);
  esters (I-35) use `kind` 'ester', the one entry carrying its bridge O
  (`esterOxygen`), plus `structure.ester`, the O-bound group; amines
  (I-36) use `kind` 'amine' (the N as `attachAtom`), their N-groups prefix
  occurrences with the locant `N_LOCANT`, and non-principal amines
  `amino` prefixes; all of them
  carry no `groups` either. The engine stays pure; the
  explanation is derived only from the result.

### 13.3 v1 assumptions that break

- `parent.js` enumerates leaf-to-leaf paths: fails on rings and must be
  restricted to the relevant carbon skeleton for functional compounds.
- "Longest chain first" can no longer universally precede principal-group
  selection.
- Substituents are no longer always hydrocarbon subtrees; the ban on triple
  bonds outside the chain no longer holds universally (nitriles).
- `buildChainStructure()` requires n−1 bonds; a ring also needs the closure
  (rings.js gives the ordered members and the closure bond;
  `buildRingStructure()` takes n bonds, the last one closing the ring).
- "Longest chain first" (P1) does not decide between a ring and a chain: the
  ring is senior (§13.5), so a molecule with one ring never enters P1–P4.
- SMILES, valence messages and labels assume carbon (valence messages and H
  counts fixed in I-21; SMILES reads and writes O, N and halogens since I-22;
  canvas labels, the element palette and "átomo" wording in editor refusals
  since I-23, §6.1/§6.3).
- Tree keys include elements but do not support cycles; since I-24
  `canonicalKey()` adds a monocycle key (polycycles still have none), and the
  OPSIN adapter keeps rings and compares them with it.
- The 90° view and "Ordenar dibujo" assumed branched chains. Since I-27b
  "Ordenar dibujo" has a ring strategy (§7): every named single carbocycle
  is ordered as a regular polygon, and a molecule that cannot be named shows
  its naming error. The 90° view still draws the normal drawing for rings
  ("Hay un anillo…" / "Hay anillos…"); both layouts refuse any other cyclic
  molecule instead of looping.
- The explanation rebuilds counts from hydrocarbon structures: it must
  receive composition and groups from the engine.

### 13.4 Phases

Conventions: **N** = `src/naming/`, **E** = `src/explain/explain.js`.
Common validation per phase: justified fixtures, negative cases, invariance
under ids/order/coordinates, explanation snapshots, relevant editor tests;
`npm test`, `npm run check`, `npm run e2e` (dev server and `file://`). OPSIN
(when available) checks structure through the English lexicon; it never
certifies IUPAC preference or Spanish spelling.

| Id | Phase | Content | Key tests |
|---|---|---|---|
| I-21 | Multi-element model | `model/{elements,molecule,validate}.js`, autosave, contracts: neutral valences, element-specific errors; new nomenclature still blocked (`HETEROATOM`). | H counts, formulas, old saves, corruption; never accept charges or radicals. |
| I-22 | Multi-element SMILES and oracle | `model/smiles.js`, `scripts/oracle/{smiles-full,compare,generate}.mjs`: O/N/halogens, keep all heavy atoms; no visible change. | Round trips, same-formula isomers, explicit H; tell adapter failures apart. |
| I-23 | Element palette | `editor/{editor,render,geometry}.js`, `ui/toolbar.js`, Ayuda: select, place and change C/O/N/F/Cl/Br/I; heteroatoms always labelled; C=O and C≡N with the existing bond tools. | Valence, keyboard/touch, one transaction per gesture; no accidental element changes. |
| I-24 | Ring infrastructure | New `model/rings.js`, `graph.js`, SMILES, oracle: ring closures in SMILES, structural identity for monocycles, scope messages. | Rotations, invalid closures, polycycles; no infinite recursion, no formula-only comparisons. |
| I-25 | Simple cycloalkanes | New `N/rings.js`, `structure.js`, renderer, both lexicons, E: `ciclohexano`; explain the closure and carbon count. | Supported sizes, formulas; closure bond highlighted. |
| I-26 | Substituted and unsaturated rings | `N/rings.js`, `parent.js`, `numbering.js`, `substituent.js`, E: every start/direction; unsaturation and substituent locants; explicit ring-vs-chain choice per the 2013 rules. | Symmetry, dienes, side chains; old school rules not carried over automatically. |
| I-27 | Drawing and ordering rings | Split in two. **I-27a** (done): editor ring templates (Anillos tool, sizes 3–8: free, hung from an atom, fused on a bond; §6.1) and inner double-bond lines for ring bonds (§6.3). **I-27b** (done): new `layout/rings.js` and `canonical.js`: Ordenar dibujo by strategy for rings (regular polygon, locant 1 on top, numbering clockwise, side chains outwards; §7); `rightangle.js` unchanged: the 90° view keeps falling back to the normal drawing for rings. | Collisions, undo, locants; topology and editability kept. |
| I-28 | Benzene and hydrocarbon derivatives | **Done.** New `N/aromatic.js`: benzene (exactly a six-carbon ring with alternating ring bonds) named `benceno`, monosubstituted benzenes without locant (`metilbenceno`, `isopropilbenceno` with the prefix-style alternatives), traditional `tolueno` / `estireno` (P-22.1.3) as a last alternative (no `cumeno`); polysubstituted → `CYCLE` `polysubstitutedBenzene`; retained `fenil`/`phenyl` prefix (`phenylSubstituent()`, unused by hydrocarbons); both lexicons; E step "Reconoce el benceno" (Kekulé drawings, no numbers, ring senior, `fenilo` form not preferred); Benceno button in Anillos (`a` cycle); Ordenar dibujo via the ring strategy; OPSIN adapter kekulizes aromatic SMILES, accepts either Kekulé drawing and generates benzene derivatives. | Both Kekulé forms; aromaticity never inferred from any alternation. |
| I-29 | Functional groups and seniority | **Done.** New `N/groups.js`: clusters of heteroatoms and functional carbons (C=O, C=N, C≡N) matched whole against acid, ester, amide, nitrile, aldehyde, ketone, alcohol (`phenol` flag on benzene), ether, amine (primary/secondary/tertiary), halide; anything else (O–O, N–O, N–N, C=N, acyl halide, anhydride, carbonate, H₂O…) is one `unsupported` record; no atom in two groups (§13.6). New `N/seniority.js`: P-41 order, principal kind, suffix/prefix role; affix tables in both lexicons (`groupSuffix()`, `groupPrefix()`, `formylPrefix`, `groupFamilyName()`). The `HETEROATOM` refusal carries `groups` (§4.1); E steps "Reconoce los grupos", "Elige el principal", "Sufijo o prefijo", "Aún no sé nombrarla", shown by a stepper under the error. I-29 itself names no heteroatom molecule. | Acid/ester/amide vs alcohol/ether/amine/ketone, aldehyde vs ketone, phenol; pair matrix; unsupported patterns; id invariance; snapshots `tests/fixtures/explain-group-snapshots.json`. |
| I-30 | Halogen derivatives | **Done.** A molecule whose only heteroatoms are halogens bonded to carbons passes validation (`isHalogenDerivative()`; caps on the carbon skeleton) and is named on chains, monocycles and monosubstituted benzene: prefixes fluoro-, cloro-, bromo-, yodo- (`halogenPrefix()` in both lexicons, `halogen` substituents in `N/substituent.js`), never a suffix nor a chain atom; multipliers; Spanish alphabetical order with the alkyl prefixes; P4/N3/N4 count halogens after the multiple bonds; halogens nested in substituents (`(clorometil)`); locant omission for one-carbon, monosubstituted two-carbon and fully halogenated parents (§1.1). No traditional names (cloroformo…) are offered. E: formula with halogens and halogen notes in every step (§5). Any O or N keeps the `HETEROATOM` refusal. Oracle generates halogen derivatives. | Several halogens and ties; ordering of translated prefixes (`yodo`); fixtures, `tests/unit/halogens.test.js`, snapshots, `tests/e2e/halogens.spec.js`. |
| I-31 | Alcohols | **Done.** A molecule whose heteroatoms are halogens on carbons and OH groups on carbons passes validation (`isHydroxyOxygen()`, `hasNameableHeteroatoms()`); with a ring every OH must be on a ring carbon (else `HETEROATOM` `sideChainAlcohol`, §3.2). The OH is the principal group, cited as the suffix `-ol`/`-diol`/`-triol` (`structure.suffix`, `buildSuffix()`, `suffixSites()`); P0 (most OH groups, before the length) in `N/parent.js`, N0 (lowest OH locants, before N1) in `N/numbering.js` for chains and rings; an OH on a branch is the `hidroxi` prefix (`hydroxySubstituent()`); vowel elision (`propan-2-ol`, `etano-1,2-diol`) and locant omission (`metanol`, `etanol`, `ciclohexanol`, §1.1); cycloalkanols (`2-metilciclohexan-1-ol`) and the retained `fenol` brought forward from I-40. Enols (`etenol`, `prop-1-en-2-ol`) and gem-diols (`propano-2,2-diol`) are named systematically. No traditional names (alcohol etílico, etilenglicol, glicerina) are offered: the design asks for none. "Show OH": every O is labelled OH on the canvas (§6.3, since I-23) and the explanation highlights each OH group and its carbon. E: steps `group` and `groupChain`, N0 texts (§5). Oracle generates alcohols. | Branched and unsaturated; alcohol vs phenol vs carboxylic OH; fixtures, `tests/unit/alcohols.test.js`, snapshots, `tests/e2e/alcohols.spec.js`. |
| I-32 | Aldehydes and ketones | **Done.** A molecule whose heteroatoms are halogens on carbons, OH groups on carbons and aldehyde or ketone C=O (`carbonylKind()`: an O double-bonded to a carbon whose other neighbours are carbons on single bonds; acids, esters, acyl halides, ketenes… keep `HETEROATOM`) passes validation, with the placement checks of `oxygenPlacementError()` (§3.2): with a ring no aldehyde (`ringAldehyde`, `-carbaldehído`, I-40) and no ketone or OH on a side chain (`sideChainCarbonyl`, `sideChainAlcohol`); on a chain at most two aldehydes (`manyAldehydes`). New `N/principal.js`: oxygen kind and principal kind (aldehído > cetona > alcohol); P0/N0 (`N/parent.js`, `N/numbering.js`) count the groups of the principal kind; the suffix `-al` / `-dial` (aldehyde carbon in the chain, locant 1, never cited, P-14.3.4.1) or `-ona` / `-diona` with locants (`structure.suffix.kind`); the C=O is never a hydrocarbon unsaturation; non-principal groups are the prefixes `oxo` (`oxoSubstituent()`) and `hidroxi` on the parent or in a branch (`4-oxopentanal`, `4-hidroxibutan-2-ona`, `4-(2-oxopropil)heptano-2,6-diona`). A C=O carbon bonded to its chain as a branch (acyl: `acetil`) is refused by the engine (`acylSubstituent`, `hasAcylPrefix()`, decided on the default-style name); `formil-` is never needed, since a chain holds both ends' –CHO and more are refused. Cycloalkanones (`ciclohexanona`, `2-metilciclohexan-1-ona`, `4-hidroxiciclohexan-1-ona`) brought forward from I-40: they fall out of the I-31 ring machinery. `propanona` omits its locant (design decision, §1.1) and lists `propan-2-ona` (the IUPAC 2013 form) and the traditional `acetona`; `formaldehído` and `acetaldehído` are offered for the bare `metanal` and `etanal` (retained by IUPAC 2013 and the usual school names); no other traditional names. Both lexicons. E: group step for C=O (`carbonylGroupStep()`), count, chain, numbering (`aldehydeNote()`), ring, substituents and legend texts per kind; each C=O highlighted whole. Oracle generates aldehydes and ketones (`generateCarbonyls()`). | Terminal/internal, several carbonyls, ald + ket, ket + OH, halogens, id invariance, refusals; fixtures, `tests/unit/carbonyls.test.js`, snapshots, `tests/e2e/carbonyls.spec.js`. |
| I-33 | Carboxylic acids | **Done.** A molecule whose heteroatoms are halogens on carbons, OH groups on carbons, aldehyde or ketone C=O and carboxyl groups (`isCarboxylCarbon()`: a carbon with one O on a double bond and one OH, both bonded to nothing else, and at most one carbon neighbour on a single bond; `carboxylRole()`; esters, anhydrides, acyl halides, carbonic acid, peracids keep `HETEROATOM`, salts are `INVALID`) passes validation, with the placement checks of `oxygenPlacementError()` (§3.2): no acid with a ring (`ringAcid`, `-carboxílico`, I-40) and at most two –COOH (`manyAcids`: a third would be a `carboxi-` branch). `N/principal.js`: kind 'acid' for both O of a –COOH, most senior (ácido > aldehído > cetona > alcohol); `isSuffixOxygen()` lets the C=O oxygen stand for the group, so P0/N0 (`N/parent.js`, `N/numbering.js`) count each –COOH once and `suffixSites()` gives one site carrying its OH (`hydroxyAtom`, `hydroxyBond`). The carboxyl carbon is a chain end, locant 1, never cited; the suffix `-oico` / `-dioico` (`ácido etanoico`, `ácido 2-metilpropanoico`, `ácido but-2-enoico`, `ácido prop-2-enoico`, `ácido butanodioico`, `ácido hexanodioico`) and the class word `ácido` (lexicon `suffixClassWord()`, its own part; English `-oic acid`, no class word). Other oxygen groups are `oxo` / `hidroxi` prefixes: `ácido 4-oxopentanoico`, `ácido 2-hidroxipropanoico`, `ácido 3-oxopropanoico` (a terminal aldehyde beside an acid is in the chain, so `oxo`, as in IUPAC 2013's 3-oxopropanoic acid; `formil` never needed). With two –COOH both are always the parent's ends, so `carboxi-` never arises; the engine still refuses a –COOH left out of the suffix (`carboxySubstituent`, a safety net). Traditional `ácido fórmico`, `ácido acético` and `ácido oxálico` for the bare methanoic, ethanoic and ethanedioic acids, labelled like `tolueno` («que la IUPAC (2013) conserva como preferido»: all three are retained PINs); no other school names (propiónico, malónico, succínico, láctico…). Both lexicons. E: group step (`acidGroupStep()`: one –COOH group, OH not an alcohol nor C=O a ketone, carbon counted in the chain as carbon 1, «ácido …-oico», seniority with `oxo-`/`hidroxi-`), count, chain, numbering (`terminalGroupNote()`), substituents, assemble and legend texts (the word «ácido»); each –COOH highlighted whole (C and both O). Oracle generates acids (`generateAcids()`, `carboxylate()`). | Branching, numbering, diacids, acid + ketone/aldehyde/alcohol, halogens, id invariance, refusals (3+ COOH, ring + COOH, esters, acyl halides, anhydrides, salts); fixtures, `tests/unit/acids.test.js`, snapshots, `tests/e2e/acids.spec.js`. |
| I-34 | Ethers | **Done.** A molecule whose heteroatoms are the ones named so far plus ether oxygens (`isEtherOxygen()`: an O with two single bonds to carbons, neither a functional carbon — esters, anhydrides, peroxides keep `HETEROATOM`; an O in a ring is a heterocycle, `RING_SYSTEM`) passes validation; the chain cap is measured on each side of the O (`longestCarbonChain()`). The ether is never principal nor a suffix (`N/principal.js` kind 'ether', skipped by `principalKindOf()`): the O splits the carbon skeleton, `leafToLeafPaths()` (`N/parent.js`) gives the paths of every piece (a lone carbon a one-atom path), and the usual cascade picks the parent side — the principal group (P0), a ring (always senior), the length (P1), multiple bonds (P2/P3), the number of substituents (P4), numbering rules; symmetric sides reach the presentation tie-break, same name. The O with the other side is an alkoxy prefix (`alkoxySubstituent()` in `N/substituent.js`; `alkoxyTokens()`, `isContractedAlkoxy()`, `enclosedInName()` in `N/render.js`; `alkoxyEnding` in both lexicons): contracted `metoxi`/`etoxi`/`propoxi`/`butoxi` (also substituted, `(2-cloroetoxi)`), retained `isopropoxi` (with `(propan-2-iloxi)` and `(1-metiletoxi)` as the styled alternatives, like `isopropil`) and `tert-butoxi`, else the prefix + `oxi` in parentheses (`(pentiloxi)`, `(butan-2-iloxi)`, `(prop-2-en-1-iloxi)`); Spanish alphabetical order with the other prefixes (`2-metil-2-metoxipropano`); locant omission as for halogens (`metoximetano`, `metoxietano`, `1-metoxipropano`, `1,2-dimetoxietano`), an alkoxy among locant-less prefixes enclosed (`cloro(metoxi)metano`). Ethers with every named group: `2-metoxietan-1-ol`, `3-metoxipropanal`, `4-metoxibutan-2-ona`, `ácido 2-metoxietanoico`, `2-metoxiciclohexan-1-ol`, `metoxiciclohexano`, `metoxibenceno`; ethers inside branches (`(metoximetil)ciclopentano`) and inside alkoxy groups (`1-(2-metoxietoxi)propano`) fall out. A ring is never on the alkoxy side (the ring is the parent; a principal group on the chain side is refused as before, `sideChainAlcohol`…), so `ciclohexiloxi`/`fenoxi` never arise (I-40). Refused by the engine: an acyclic ether whose identical halves carry the principal group (`symmetricEther`, multiplicative `oxidi-`, §3.2). Other valid forms: the functional-class name of a simple R–O–R′ (`etil metil éter`, `dietil éter`, `tert-butil metil éter`; style `functionalClass`) and `anisol` for `metoxibenceno`; no other traditional names. E: step «Reconoce el éter» (`etherStep()`: both sides of the O highlighted apart, why the O is never in the chain, which side is the parent and why from the trace, how the prefix is formed), ether notes in count, chain, substituents, order, legend and assemble (§5). Oracle generates ethers (`generateEthers()`, `etherify()`). | Symmetric/asymmetric, branched; each named group; refusals; id invariance; a carbon chain never runs through O; fixtures, `tests/unit/ethers.test.js`, snapshots, `tests/e2e/ethers.spec.js`. |
| I-35 | Esters | **Done.** A molecule whose heteroatoms are the ones named so far plus one ester group (`isEsterCarbon()`: a carbon with one O on a double bond bonded to nothing else, one O on a single bond whose only other neighbour is a carbon that is not a functional carbon, and at most one carbon neighbour on a single bond; `esterRole()` 'carbonyl' / 'bridge', `esterCarbons()`; anhydrides, carbonates, peroxy esters keep `HETEROATOM`, a lactone is a heterocycle, `RING_SYSTEM`) passes validation, with the placement checks of `oxygenPlacementError()` (§3.2): no ester with a ring on either side or on a side chain (`ringEster`: `-carboxilato`, `fenilo`, `ciclohexilo`, I-40), no acid with an ester (`esterPrefix`: the ester would be an `alcoxicarbonil-` / `aciloxi-` prefix, I-39) and at most one ester (`manyEsters`: diesters and an ester inside another's O-bound group, I-39). `N/principal.js`: kind 'ester' for both O of the –COO– (after 'acid' in `OXYGEN_KINDS`, ácido > éster > aldehído > cetona > alcohol); `isSuffixOxygen()` lets the C=O oxygen stand for the group, so P0/N0 count it once and `suffixSites()` gives one site carrying its bridge O (`esterOxygen`, `esterBond`). The bridge O splits the carbon skeleton like an ether O, and P0 keeps the acid part whatever the length of the other side (`etanoato de pentilo`); the C=O carbon is a chain end, locant 1, never cited (`TERMINAL_SUFFIXES` in `N/render.js`), suffix `-oato`. The O-bound group is named by `esterAlkyl()` (`N/substituent.js`: `alkoxySubstituent()` seen from the O, so the substituent machinery and the prefix styles apply) and kept as `structure.ester`; `assembleEster()` / `esterAlkylName()` (`N/render.js`) write it as its own word, `prefix + o`, after `de` in Spanish and first in English (lexicon `esterAlkylFirst`, `esterLink`, `esterAlkylEnding`): `etanoato de metilo` / `methyl ethanoate`, `propanoato de etilo`, `butanoato de isopropilo` (with `propan-2-ilo`, `1-metiletilo` as the styled alternatives: `hasRetainedPrefix()` looks into the group), `2-metilpropanoato de tert-butilo`, `metanoato de metilo`, `etanoato de butan-2-ilo`, `etanoato de etenilo`, `etanoato de prop-2-en-1-ilo`. Other groups on the acid part are prefixes as for acids (`3-oxobutanoato de etilo`, `3-oxopropanoato de metilo`, `2-hidroxipropanoato de etilo`, `2-cloroetanoato de metilo`, `2-metoxietanoato de metilo`); groups on the O-bound part are prefixes inside the group name (decided: named, as IUPAC 2013 does, never refused — `etanoato de 2-hidroxietilo`, `etanoato de 2-oxopropilo`, `etanoato de 2-cloroetilo`, `etanoato de 2-metoxietilo`); an acyl (formyl) branch on either part is refused (`acylSubstituent`). Other valid forms: `formiato de …` / `acetato de …` for a bare metanoato / etanoato acid part, whatever the group (`carbonylTraditionalId()` 'formate' / 'acetate', `renderName(…, {traditional})`), labelled like `ácido acético`; no other traditional ester names. Both lexicons. E: group step (`esterGroupStep()`), step «Separa las dos partes del éster» (`esterStep()`: acid part and O-bound group explained and highlighted apart, one option each, the Spanish order), ester notes in count, groupChain, numbering (`terminalGroupNote()`), substituents, legend (`-oato`, `de`, the group) and assemble (the two words, English order by a fixed example) (§5). Oracle generates esters (`generateEsters()`, `esterify()`), traditional names included. | Branched alkyls on both sides in every style, oxo/hidroxi/halogen/alkoxy on either part, Spanish vs English order, id invariance, refusals; fixtures, `tests/unit/esters.test.js`, snapshots, `tests/e2e/esters.spec.js`. |
| I-36 | Amines | **Done.** A molecule whose heteroatoms are the ones named so far plus amine nitrogens (`isAmineNitrogen()`: an N with one to three single bonds, all to carbons that are not functional carbons; amides, nitriles, imines, NH₃, N–N, N–O, N–halogen keep `HETEROATOM`; an N in a ring is a heterocycle, `RING_SYSTEM`; ammonium needs a charge, `INVALID`, or a fourth bond, `VALENCE`) passes validation; with a ring and the amine principal every amine N must be bonded to a ring carbon (`aminePlacementError()`, `sideChainAmine`: `fenilmetanamina` waits for I-40). `N/principal.js`: every validated N is kind 'amine' (`groupKindOf()`, last of `NAMED_KINDS`: ácido > éster > aldehído > cetona > alcohol > amina); the N of a principal amine stands for its suffix group (`isSuffixOxygen()`), so P0/N0 count one per N and `suffixSites()` gives one site per N bonded to the parent. The N is never a chain atom (it splits the skeleton like an ether O); every chain bonded to a principal N carries it, so P0 ties across the sides and P1–P4 and the numbering rules choose the parent (IUPAC 2013 P-62.2.2: the senior chain carries the suffix): suffix `-amina` with locants (`metanamina`, `etanamina`, `propan-2-amina`, `butano-1,4-diamina`, `etenamina`, `prop-2-en-1-amina`). The other groups on that N are prefixes with the locant `N` (`nitrogenSubstituents()`, `N_LOCANT` = 0 in `N/structure.js`, cited `N` by `locantText()`, compared as lower than any number in P4/N3/N4, P-14.3.5), grouped with identical carbon prefixes and never omitted: `N-metiletanamina`, `N-etiletanamina`, `N,N-dimetilmetanamina`, `N-etil-N-metilpropan-1-amina`, `N-isopropilpropan-1-amina` (with `N-(propan-2-il)…`, `N-(1-metiletil)…`), `N,2-dimetilpropan-1-amina`, `2-cloro-N-metiletan-1-amina`, `1-cloro-N-metilmetanamina` (decided: carbon locants written beside an N locant, the suffix keeps its omission), `N-(1-bromoetil)-1-cloroetan-1-amina` (N4 with the N-group first). Below a more senior group the amine is the `amino` prefix (`aminoSubstituent()`: the N and its groups, cited without locants, every group after the first enclosed — decided from memory): `2-aminoetan-1-ol`, `2-(metilamino)etan-1-ol`, `2-(dimetilamino)etan-1-ol`, `2-[etil(metil)amino]etan-1-ol`, `1,3-bis(metilamino)propan-2-ol`, `4-aminobutanal`, `1-(dimetilamino)propan-2-ona`, `ácido 2-aminopropanoico`, `2-aminoetanoato de metilo`, `etanoato de 2-(dimetilamino)etilo`, `4-(aminometil)ciclohexan-1-ol`. Rings brought forward from I-40: `ciclohexanamina`, `ciclohexano-1,4-diamina`, `N,N-dimetilciclohexanamina`, `2-aminociclohexan-1-ol`, and on benzene `bencenamina` (`N-metilbencenamina`: the N-groups are not ring substituents). Refused by the engine: several amine suffix groups with a group on some N (`substitutedPolyamine`: N¹/N² locants, `N¹-metiletano-1,2-diamina`) and a non-principal N joining identical parts that carry the principal group (`symmetricAmine`: multiplicative `2,2′-azanodiildietanol`). Other valid forms: `anilina` (`N-metilanilina`; retained PIN, labelled like `tolueno`) and the alkylamine names of a lone N with simple alkyl groups (`metilamina`, `dimetilamina`, `trimetilamina`, `etilmetilamina`; style `amineClass`, `amineClassName()`); no amino-acid names. Both lexicons. The canvas already labels N as NH₂ / NH / N (I-23). E: amine group step, N-side choice, `N` locants in every step, N in the formula (§5). Oracle generates amines (`generateAmines()`, `aminate()`), `aniline` and the alkylamine names included. | N-substitution, N-locant grouping and omission, diamines, ring and benzene amines, amino prefixes under every oxygen group, both lexicons, id invariance, refusals (ammonium, heterocycles, amides, nitriles, N–N/N–O, polyamines, symmetric amines, side-chain amines); fixtures, `tests/unit/amines.test.js`, snapshots, `tests/e2e/amines.spec.js`. |
| I-37 | Amides | **Done.** A molecule whose heteroatoms are the ones named so far plus amide groups (`isAmideCarbon()`: a carbon with one lone O on a double bond, one N on a single bond whose other bonds go to non-functional carbons, and at most one carbon; `amideRole()` 'carbonyl' / 'nitrogen'; `amideCarbons()`) passes validation; the C=O is never a ketone (`carbonylKind()` null) and the N never an amine (`isAmineNitrogen()` false). Refused in validation (`amidePlacementError()`): any amide with a ring (`ringAmide`: `benzamida`, `ciclohexanocarboxamida`, `N-feniletanamida` wait for I-40), an amide with an acid or an ester (`amidePrefix`: `carbamoil-` / `acilamino-`, I-39), more than two (`manyAmides`), two on different carbon pieces (`amidePrefix`: one would be an `acilamino-` branch), a diamide with a group on some N (`substitutedPolyamide`: N¹/N⁴ locants); an N bonded to two C=O carbons is an imide (`imide`, `imideNitrogens()`); ureas, carbamates, hydrazides and N-halo amides keep the generic `HETEROATOM`; a lactam is a heterocycle. `N/principal.js`: the amide C=O oxygen and N are kind 'amide' (`NAMED_KINDS`: ácido > éster > amida > aldehído > cetona > alcohol > amina); the C=O oxygen stands for the group (`isSuffixOxygen()`), the N travels with it (`suffixSites()` / SuffixLocant `amideNitrogen`, `amideBond`; `render.js suffixGroupIds()`). The amide carbon is a chain end, locant 1, never cited (`TERMINAL_SUFFIXES`): `metanamida`, `etanamida`, `propanamida`, `2-metilpropanamida`, `2,2-dimetilpropanamida`, `etanodiamida`, `butanodiamida`, `prop-2-enamida`, `but-2-enamida`, `prop-2-inamida`. The groups on the N are `N` prefixes through I-36's machinery (`nitrogenSubstituents()` now also for a principal amide; `N_LOCANT`): `N-metiletanamida`, `N,N-dimetiletanamida`, `N-etil-N-metilpropanamida`, `N,N-dimetilmetanamida`, `N,2-dimetilpropanamida`, `N-isopropilpropanamida` (with `N-(propan-2-il)…`, `N-(1-metiletil)…`), `N-(2-hidroxietil)etanamida`; a longer group on the N never becomes the parent (P0). Other groups are prefixes: `4-oxopentanamida`, `3-oxopropanamida`, `3-hidroxibutanamida`, `2-aminopropanamida`, `3-amino-N-metilpropanamida`, `3-metoxipropanamida`, `2-cloroetanamida`. The engine refuses an amide left out of the suffix (`amidePrefix` safety net). Other valid forms: `formamida` / `acetamida` for a bare monoamide of one or two carbons, also with groups on the N (`N-metilacetamida`, `N,N-dimetilformamida`; `carbonylTraditionalId()`, `render.js` renders the N prefixes before the word; retained PINs from memory). Both lexicons. The canvas already labels the amide N as NH₂ / NH / N. E: amide group step (`amideGroupStep()`: one group, never ketone + amine, carbon 1, `-amida`, `N` locants, seniority), count step (C=O and N on one carbon, N in the formula), chain, numbering (`terminalGroupNote()`) and assemble sentences (§5). Oracle generates amides (`generateAmides()`, `amidate()`), `acetamide` / `N,N-dimethylformamide` included. | N-substitution, diamides, unsaturated and branched amides, prefixes under the amide, never ketone + amine, both lexicons, traditional names, explanation, id invariance, Ordenar dibujo, refusals (ring, prefix, many, substituted diamide, imide); fixtures, `tests/unit/amides.test.js`, snapshots, `tests/e2e/amides.spec.js`. |
| I-38 | Nitriles | **Done.** A molecule whose heteroatoms are the ones named so far plus nitrile groups (`isNitrileCarbon()`: a carbon with one lone N on a triple bond and at most one carbon, on a single bond; `isNitrileNitrogen()`, `nitrileCarbons()`) passes validation; the N is never an amine (`isAmineNitrogen()` false: a triple bond). Refused in validation (`nitrilePlacementError()`): any nitrile with a ring (`ringNitrile`: `ciclohexanocarbonitrilo`, `benzonitrilo` wait for I-40), a nitrile with an acid, an ester or an amide (`cyanoPrefix`, lifted by I-39a: the `ciano-` prefix takes the nitrile carbon out of the skeleton), more than two (`manyNitriles`, narrowed by I-39a to three on one carbon piece with the nitrile principal), two on different carbon pieces (`cyanoPrefix`, lifted by I-39a: one is a `ciano-` inside a branch); Cl–C≡N, cyanates and cyanamides keep the generic `HETEROATOM`. `N/principal.js`: the nitrile N is kind 'nitrile' (`NAMED_KINDS`: ácido > éster > amida > nitrilo > aldehído > cetona > alcohol > amina) and stands for its group like an amine's N (`isSuffixOxygen()`, `suffixSites()`). The nitrile carbon is a chain end, locant 1, never cited (`TERMINAL_SUFFIXES`); the C≡N is never a chain bond, so never an `-ino`; the v1 invariant "no triple bond leaves a longest chain" (`parent.js assertNoTripleBondLeaves()`) now checks C≡C only: `metanonitrilo` (HC≡N admitted: one chain carbon, like `metanamida`), `etanonitrilo`, `propanonitrilo`, `2-metilpropanonitrilo`, `2,2-dimetilpropanonitrilo`, `2-butiloctanonitrilo` (the parent ends at the nitrile carbon, P0), `etanodinitrilo`, `propanodinitrilo`, `butanodinitrilo`, `3-pentilpentanodinitrilo`, `prop-2-enonitrilo`, `prop-2-inonitrilo`, `but-2-inonitrilo`. Elision (decided from memory, IUPAC 2013 P-16.7.1, confirmed by OPSIN): the parent keeps its final `o` before the consonant of `-nitrilo`, as before `-diol` (`prop-2-enonitrilo`, English `prop-2-enenitrile`). Other groups are prefixes: `4-oxopentanonitrilo`, `3-oxopropanonitrilo`, `3-hidroxibutanonitrilo`, `2-aminopropanonitrilo`, `2-(dimetilamino)etanonitrilo`, `2-metoxietanonitrilo`, `3-cloropropanonitrilo`, `2-cloroetanonitrilo`. The engine refuses a nitrile left out of the suffix (`cyanoPrefix` safety net; since I-39a, a nitrile cited neither as a suffix nor as `ciano`). Other valid forms: `acetonitrilo` for the bare etanonitrilo only (retained PIN, from memory); no `formonitrilo`, `cianuro de hidrógeno`, `cianuro de metilo`, `propionitrilo` or `acrilonitrilo`. Both lexicons. The canvas already labels the nitrile N as N (no hydrogen) and draws the C≡N as a triple bond; Ordenar dibujo keeps C–C≡N straight (a linear centre). E: nitrile group step (`nitrileGroupStep()`: one group, not an alkyne, carbon 1, N outside the chain, `-nitrilo`, full seniority), count step (N drawn N, two π bonds, N in the formula; `allNitrogenSentences()`), chain, numbering (`terminalGroupNote()`), prefix descriptions («el nitrilo va antes que…») and assemble sentences (§5); a refused nitrile's group step says its C≡N is not an alkyne. Oracle generates nitriles (`generateNitriles()`, `nitrilate()`), `acetonitrile` included. | Branched nitriles, simple dinitriles, unsaturated nitriles, prefixes under the nitrile, never an alkyne or an amine, both lexicons, traditional name, explanation, id invariance, Ordenar dibujo, refusals (ring, many, ciano-); the old assertions that nitriles are refused and the "no triple bond outside the chain" invariant adjusted; fixtures, `tests/unit/nitriles.test.js`, snapshots, `tests/e2e/nitriles.spec.js`. |
| I-39a | `ciano-` prefix | **Done.** A nitrile that is not the principal group (an acid, an ester or an amide beside it: ácido > éster > amida > nitrilo) or that lies on another carbon piece (beyond an ether O or an amine N, the nitrile principal) is the prefix `ciano-`, which includes the nitrile carbon (IUPAC 2013 P-66.5; decided from memory): that carbon is the first functional carbon kept outside the parent (§13.6 "Where X belongs": `N/principal.js outsideCarbons()`, every nitrile carbon when the nitrile is not principal; `parent.js leafToLeafPaths(mol, exclude)` over `carbonSkeleton(mol, exclude)`, so it counts in no P1 length and the carbon bearing it can end a chain; P4 counts it as one substituent). `N/substituent.js`: a nitrile carbon bonded to a chain atom and not in the chain is the simple prefix `ciano` (`cyanoSubstituent()`, `cyanoEntry()`: atoms X and N, bond the C≡N; unenclosed, `diciano`, alphabetised under c: `ciano` < `cloro`), on the parent, in a branch (`buildSubstituent()` never lets a branch chain run through X), in an alkoxy group, an ester's O-bound group or a group on an amide's N: `ácido 3-cianopropanoico`, `ácido 2-cianoetanoico` (locant cited: two substituents on ethane), `ácido 2,2-dicianoetanoico`, `ácido 2,3,4-tricianobutanoico`, `ácido 3-(2-cianoetil)hexanoico` (without X the propyl arm is the longer), `ácido 3-ciano-2-(cianometil)propanoico`, `ácido 2-ciano-2-cloroetanoico`, `2-cianoetanoato de metilo`, `etanoato de cianometilo` (with `acetato de cianometilo`), `3-cianopropanamida`, `N-(cianometil)etanamida`, `3-(cianometoxi)propanonitrilo`, `3-(cianometoxi)pentanodinitrilo`, `3-[(cianometil)(metil)amino]propanonitrilo`. Validation (`nitrilePlacementError()`): `cyanoPrefix` is gone; beside an acid, ester or amide any number of nitriles is named; a nitrile bonded to the carbon of an acid, ester or amide is refused (`carbonocyanidic`, `CARBONOCYANIDIC_MESSAGE`: NC–COOH is `ácido carbonocianídico`, a carbonic acid derivative, decided from memory, P-65.2.1); with the nitrile principal, three or more nitriles on one carbon piece stay `manyNitriles` (they need `-carbonitrilo`, `propano-1,2,3-tricarbonitrilo`; the message says so), on several pieces the parent carries the most (P0) and the rest are `ciano-`. Identical halves with a principal nitrile each stay `symmetricEther` / `symmetricAmine`. The engine's `cyanoPrefix` safety net checks that every nitrile is a suffix group or one `ciano` (`index.js cyanoCount()`). Both lexicons (`ciano` / `cyano`). E: the group steps of an acid, ester, amide list the nitrile (seniority with `nitrilo`), say it is cited `ciano-` and that the prefix includes its carbon, not counted in the chain nor numbered (`cyanoCarbonSentence()`); a nitrile left on a branch when the nitrile is principal is described in the nitrile group step; count (X and N counted, two π, the N drawn N), chain («Sin contar el carbono del –C≡N…», the chain stops at the carbon bonded to it), substituents (`describeSubstituent()` `cyano`, «Es una rama con un grupo –C≡N») and legend; the –C≡N is highlighted whole (X, N, both bonds). Oracle: `generateCyano()`, `cyanate()` (nitriles on any carbon beside an acid, ester, amide, or on a branch piece of a nitrile). | Acid/ester/amide + nitrile, dinitriles on two pieces, ciano- in branches, alkoxy groups, ester O-bound groups and amide N groups, the parent choice without X, alphabetical order, both lexicons, id invariance, Ordenar dibujo, refusals (`carbonocyanidic`, `manyNitriles`, the I-39b/I-39c ones unchanged); the old `cyanoPrefix` assertions updated; fixtures, `tests/unit/cyano.test.js`, snapshots, `tests/e2e/cyano.spec.js`. |
| I-39b | Acyl prefixes | A C=O carbon bonded to its chain as a branch (refused since I-32, `acylSubstituent`): `formil-` for a –CHO whose carbon cannot be in the parent, `acetil`, `propanoil`… for an acyl branch; X is the branch's attachment atom, kept outside the chain through `principal.js outsideCarbons()` (I-39a). | Acyl branches at any depth, the parent choice without X, both lexicons, explanation; the `acylSubstituent` refusals lifted. |
| I-39c | Ester and amide prefixes | The remaining pair matrix of the seniority ácido > éster > amida > nitrilo > aldehído > cetona > alcohol > amina (aldehído > cetona > alcohol with oxo-/hidroxi- since I-32, ácido above them since I-33, éster since I-35, amina with `amino-` since I-36, amida since I-37, nitrilo since I-38, `ciano-` since I-39a): an ester beside an acid (`alcoxicarbonil-` / `aciloxi-`, refused since I-35, `esterPrefix`), diesters (`manyEsters`), an amide beside an acid or ester or on another carbon piece (`carbamoil-` / `acilamino-`, refused since I-37, `amidePrefix`); only covered combinations enabled. | Pair matrix and counter-examples; the `esterPrefix`, `manyEsters` and `amidePrefix` refusals lifted where covered. |
| I-40 | Functions on rings | Selected monosubstituted derivatives (cycloalkanols and `fenol` are done since I-31, cycloalkanones since I-32); rings as substituents of a chain carrying the principal group (`ciclohexil`, `fenil`: e.g. an OH on a ring's side chain, refused since I-31, or a ketone C=O there, refused since I-32); -carboxílico (any acid with a ring, refused since I-33), ring esters (`-carboxilato`, `…ato de fenilo`; refused since I-35, `ringEster`), -carbaldehído (any aldehyde with a ring, refused since I-32), -carbonitrilo (any nitrile with a ring, refused since I-38, `ringNitrile`). | Counting and numbering; small aromatic functional catalogue. |
| I-41 | Condensed formulas and wrap-up | Render, both layouts, Ayuda, examples, docs: OH per atom; CHO/COOH as optional abbreviations mapped to all their atoms; 90° view for acyclic heteroatoms. | Selection, highlight, collisions, accessibility; abbreviations never change the graph. |

### 13.5 Ring vs chain and ring numbering (I-26)

**Ring vs chain.** IUPAC 2013 chooses the parent hydride by seniority of
rings over chains (P-44.1.2.2: within the same class, rings and ring systems are senior to
chains; P-52.2.8: the ring is the parent whatever the number of atoms of the
chain). With the scope of this app (one carbocycle,
acyclic hydrocarbon side chains, no principal characteristic group) the
decision table is:

| Molecule | Parent | Example |
|---|---|---|
| No ring | The chain chosen by P1–P4 (§4.3–4.4) | `3-metilhexano` |
| One carbocycle, side chains shorter than the ring | The ring; chains are prefixes | `1-etil-3-metilciclohexano` |
| One carbocycle, a side chain longer than the ring | The ring (length does not matter) | `decilciclopropano` |
| One carbocycle, the side chain holds the unsaturation | The ring (unsaturation does not matter) | `etenilciclohexano`, `metilidenciclohexano` |
| Several rings, fused/bridged/spiro rings, heterocycles | Refused (`RING_SYSTEM`) | — |
| Benzene ring, at most one side chain (I-28) | The ring, named `benceno` (P-22.1.2); the chain is a prefix without locant, whatever its length or unsaturation — never `1-feniletano` | `benceno`, `etilbenceno`, `etenilbenceno` |
| Benzene ring, two or more side chains | Refused (`CYCLE`, `polysubstitutedBenzene`; no orto/meta/para) | — |
| One carbocycle with OH groups on ring carbons (I-31) | The ring, carrying the `-ol` suffix (it holds every principal group); OH carbon numbered first | `ciclohexanol`, `2-metilciclohexan-1-ol`, `fenol` |
| One carbocycle with an OH on a side chain (I-31) | Refused (`HETEROATOM`, `sideChainAlcohol`): the chain would carry more principal groups (P-44.1.1) and be the parent, with the ring as a prefix (I-40) | — |
| One carbocycle with ketone C=O whose carbons are ring atoms (I-32) | The ring, carrying the `-ona` suffix; C=O carbon numbered first; an OH on the ring is `hidroxi-` (cetona > alcohol) | `ciclohexanona`, `2-metilciclohexan-1-ona`, `4-hidroxiciclohexan-1-ona` |
| One carbocycle with a ketone C=O on a side chain, or any aldehyde (I-32) | Refused (`HETEROATOM`, `sideChainCarbonyl` / `ringAldehyde`): the chain would be the parent, or the ring would take `-carbaldehído` (I-40) | — |
| One carbocycle and any –COOH (I-33) | Refused (`HETEROATOM`, `ringAcid`): the chain would be the parent, or the ring would take `-carboxílico` (I-40) | — |
| One carbocycle and any ester –COO– (I-35) | Refused (`HETEROATOM`, `ringEster`): the ring would be on the acid side (`-carboxilato`), on the O side (`fenilo`, `ciclohexilo`) or on a side chain of either (I-40) | — |
| One carbocycle with amine N bonded to ring carbons, the amine principal (I-36) | The ring, carrying the `-amina` suffix (ring senior to chain when both carry the amine, P-44.1.2.2); the other groups on the N are `N-` prefixes | `ciclohexanamina`, `N,N-dimetilciclohexanamina`, `bencenamina`, `N-metilbencenamina` |
| One carbocycle, the amine principal, an N not bonded to the ring (I-36) | Refused (`HETEROATOM`, `sideChainAmine`): the chain would be the parent, with the ring as a prefix (I-40) | — |
| One carbocycle with an OH or ketone on the ring and an amine anywhere (I-36) | The ring with the oxygen suffix; the amine is `amino-` | `2-aminociclohexan-1-ol`, `4-(aminometil)ciclohexan-1-ol` |
| One carbocycle and any amide (I-37) | Refused (`HETEROATOM`, `ringAmide`): the ring would take `-carboxamida` (`benzamida`), be a group on the N (`N-fenil…`) or the amide would be on a side chain (I-40) | — |
| One carbocycle and any nitrile (I-38) | Refused (`HETEROATOM`, `ringNitrile`): the ring would take `-carbonitrilo` (`ciclohexanocarbonitrilo`, `benzonitrilo`) or the nitrile would be on a side chain (I-40) | — |
| One carbocycle and an ether O, on the ring or on a side chain (I-34) | The ring (it is senior to the chain on the other side of the O); the O with that side is an alkoxy prefix, or part of a branch | `metoxiciclohexano`, `metoxibenceno`, `2-metoxiciclohexan-1-ol`, `(metoximetil)ciclopentano` |

The school rule "the longest chain wins over a smaller ring"
(`1-ciclopropildecano`) belongs to older recommendations and is **not**
carried over; the explanation says so when a side chain is longer than the
ring. Functional groups move the choice when a principal group sits on a
chain (IUPAC 2013 P-44.1.1 before P-44.1.2.2); since I-31 such alcohols
are refused (since I-32 also such ketones and every aldehyde with a ring,
since I-33 every acid with a ring), and I-40 will name them.

**Ring numbering.** Every start atom and both directions are candidates
(2n). Each lists its ring bonds in locant order; the bond joining locant n
back to 1 is compared as locant n, the highest, in every lowest-locant
rule (as in CAS/common practice: `ciclohexa-1,3-dieno`,
`ciclonona-1,2-dieno`, `ciclohex-2-eno-1,2-diol`), so it is only chosen
when the principal-group locants (N0, I-31, I-32) force it. When it is chosen,
its lower atom locant is 1 and, because the two atom locants differ by
more than one, it is cited with the compound locant `1(n)` (IUPAC 2013
P-31.1.4.2.4) in names, coloured parts, explanations and English:
`ciclohex-1(6)-eno-1,2,4-triol` (`structure.js siteLocantText()`). The chain cascade is reused as is
(`numbering.js runNumberingCascade()`), which is the IUPAC 2013 P-31.1.4
order for this scope: N1 multiple bonds (ene + yne) together, N2 double
bonds, N3 all detachable prefixes together, N4 prefixes in citation order
(P-31.1.4.3.4); P4 and N5 never apply (one parent, the same prefixes in every
numbering); the presentation tie-break (smallest atom-id tuple) picks one of
several numberings that give the same name, so names never depend on atom
ids, bond order or coordinates. A bare cycloalkane is not numbered.
Locant omission for rings: §1.1.

### 13.6 Characteristic groups and seniority (I-29)

**Detection** (`naming/groups.js`, pure). A *functional carbon* has a double
or triple bond to a heteroatom. The heteroatoms and functional carbons are
split into *clusters*, joined by every bond that touches a heteroatom (two
functional carbons bonded to each other stay apart: `O=CC=O` is two
aldehydes). Each cluster is matched as a whole against one pattern, so the
larger pattern always wins and no atom is in two groups:

| Kind | Pattern (X functional carbon, R an outside carbon) | Suffix | Prefix |
|---|---|---|---|
| acid | X(=O)–OH, X with ≤ 1 R | ácido …-oico | carboxi- |
| ester | X(=O)–O–R, X with ≤ 1 R | …-oato de …-ilo | alcoxicarbonil- (bonded through X) or aciloxi- (through the O) |
| amide | X(=O)–N with 0–2 R | -amida | carbamoil- (bonded through X) or acilamino- (through the N) |
| nitrile | X≡N, X with ≤ 1 R | -nitrilo | ciano- |
| aldehyde | X=O, X with 0–1 R (so it has an H) | -al | oxo- (formil- when X is outside the parent) |
| ketone | X=O, X with 2 R | -ona | oxo- |
| alcohol | R–OH (`phenol` when R is a benzene carbon) | -ol | hidroxi- |
| amine | N with 1–3 R, single bonds only | -amina | amino- |
| ether | R–O–R | — | alcoxi- |
| halide | R–F, R–Cl, R–Br, R–I | — | fluoro-, cloro-, bromo-, yodo- |

Every other cluster is one `unsupported` record with a `reason`:
`heteroatomBond` (O–O, N–O, N–N, a halogen on O or N…), `imine` (C=N),
`noCarbon` (H₂O, NH₃, HX) or `carbonylDerivative` (acyl halide, anhydride,
carbonate, imide, urea, ketene, CO₂, Cl–C≡N…). Each record lists `atoms`
(heteroatoms plus X), inner `bonds`, `carbon` (X or null), `attachedTo`
(the outside carbons), `canBeSuffix`, `roles` (atom ids by role) and the
kind flags (`phenol`, `amineClass`, `substitution`, `element`, `reason`).
Records are ordered by seniority, then by smallest atom id; the set found
never depends on atom ids or bond order.

**Where X belongs.** X is part of its group (so no other group can claim
it) and also a skeleton carbon: for an acyclic parent IUPAC 2013 counts the
carbon of -oico, -oato, -amida, -nitrilo and -al in the parent chain
(P-65.1.2, P-66.1.1, P-66.5.1, P-66.6.1); a ketone carbon is always a chain
or ring carbon. Only a group on a ring parent named with -carboxílico,
-carbaldehído or -carbonitrilo (I-40), or cited as a prefix that includes
X (carboxi-, formil-, ciano-…), leaves X outside the parent. The naming
phases I-31…I-38 must therefore count `carbon` as a chain carbon. Since
I-32 an aldehyde or ketone carbon is always a chain or ring carbon (of the
parent, or of a branch whose `oxo-` prefix it carries); `formil-` and the
acyl prefixes (`acetil`), where X would be a branch's attachment atom, are
refused until I-39b/I-40. Since I-33 a carboxyl carbon is always a chain
end of the parent (at most two –COOH, no ring); `carboxi-` is never
produced (`manyAcids`, `ringAcid`, and the engine's `carboxySubstituent`
safety net). Since I-35 an ester carbon is always a chain end of the
parent too (one –COO–, no ring, no acid beside it: P0 keeps it on the
parent); `alcoxicarbonil-` and `aciloxi-` are never produced
(`esterPrefix`, `manyEsters`, `ringEster`). Since I-38 a nitrile carbon is
always a chain end of the parent (at most two –C≡N on one carbon piece, no
ring, no acid, ester or amide beside it: P0 keeps both on the parent); its
N is never a chain atom and the C≡N is never a chain bond (no `-ino`).
Since I-39a a nitrile that is not the principal group (an acid, ester or
amide beside it) or that lies off the parent (on a branch piece, beyond an
O or an N, when the nitrile is principal) is the `ciano-` prefix, and its
carbon is the first X kept outside the parent: `principal.js
outsideCarbons()` lists the carbons that are never skeleton carbons (every
nitrile carbon when the nitrile is not principal), `parent.js
leafToLeafPaths()` builds the candidates on `carbonSkeleton(mol, exclude)`
without them (so they count in no P1 length and the carbon bearing one can
end a chain), `substituent.js` cites a nitrile carbon bonded to any chain
atom as the simple prefix `ciano` (`cyanoSubstituent()`: its atoms are X
and the N, its bond the C≡N) and never lets a branch chain run through it
(`buildSubstituent()` skips it): `ácido 3-cianopropanoico` (a three-carbon
parent), `3-(2-cianoetil)hexanoico` (without X the propyl arm is the
longer), `3-(cianometoxi)propanonitrilo`. The engine's `cyanoPrefix`
safety net checks that every nitrile is a suffix group or one `ciano`
(`index.js cyanoCount()`). I-39b reuses `outsideCarbons()` for the acyl
prefixes (`formil-`, `acetil`), whose X is a branch's attachment atom.

**Seniority** (`naming/seniority.js`, IUPAC 2013 P-41 restricted to the
scope): ácido > éster > amida > nitrilo > aldehído > cetona > alcohol (and
fenol) > amina. The principal group is the most senior kind present; every
group of that kind is a suffix, every other recognised group a prefix;
ethers and halides are always prefixes. A prefix ester or amide gets
`attachment`: the end that faces the principal group, found by walking the
graph from each end without crossing the group (`attachmentTowards()`):
`carbonyl` → `alcoxicarbonil-` / `carbamoil-`, `heteroatom` → `aciloxi-` /
`acilamino-` (`CC(=O)OCC(=O)O` is an acetiloxi acid, `CCOC(=O)CC(=O)O` an
etoxicarbonil acid). When both ends or neither reach a principal group the
end is undecided: `attachment` and `prefix` are null, `prefixes` holds both
forms and the explanation states the condition for each. Unsupported groups get no role
(`unsupported`); the principal is still chosen among the recognised groups
so the explanation can show the reasoning.

**Transport.** Detection does not enable naming: `validateForNaming()` still
returns `HETEROATOM` for any molecule with an N that is not an amine N
(one to three single bonds to carbons that are not C=O carbons), an amide N
or a nitrile N, or with an O that is neither an
OH on a carbon, nor the O of an aldehyde or ketone C=O, nor an O of a
carboxyl group, nor an ether O between two carbons that are not C=O
carbons, nor an O of an ester group (halogens bonded to carbons are named since I-30, OH groups
on carbons since I-31, aldehydes and ketones since I-32, carboxylic acids
since I-33, ethers since I-34 — always as `alcoxi-` prefixes —, esters
since I-35 — one –COO–, always the principal group, never an
`alcoxicarbonil-` / `aciloxi-` prefix —, amines since I-36 — `-amina`
with `N-` prefixes, or `amino-` —, amides since I-37 — `-amida` with `N-`
prefixes, always the principal group —, nitriles since I-38 — `-nitrilo`,
or `ciano-` since I-39a —, all without going through the group analysis: validation
checks the atoms directly — `isHydroxyOxygen()`, `carbonylKind()`,
`isCarboxylCarbon()` / `carboxylRole()`, `isEtherOxygen()`, `isEsterCarbon()` / `esterRole()`,
`isAmineNitrogen()`, `isAmideCarbon()` / `amideRole()`, `isNitrileCarbon()` / `isNitrileNitrogen()` — since `model/` cannot import
`naming/groups.js`, and the engine finds the principal kind with
`naming/principal.js`, whose acid test is `isCarboxylCarbon()`, whose ester test is `isEsterCarbon()` and whose
aldehyde/ketone split is the `X` with 0–1 / 2 R rule of the table above),
and for the placements named later (§3.2: `ringAcid`, `ringEster`, `manyAcids`, `esterPrefix`, `manyEsters`,
`ringAldehyde`, `sideChainCarbonyl`, `sideChainAlcohol`,
`manyAldehydes`, `sideChainAmine`, `ringAmide`, `amidePrefix`, `manyAmides`, `substitutedPolyamide`, `imide`,
`ringNitrile`, `carbonocyanidic`, `manyNitriles`); the engine adds `symmetricEther` and
`symmetricAmine` before naming and `acylSubstituent`,
`substitutedPolyamine` (and the `carboxySubstituent`, `amidePrefix` and `cyanoPrefix` safety nets) after
choosing the parent. The engine's principal kind covers the amine, the amide and the nitrile too
(`principal.js groupKindOf()`: a validated N is 'nitrile' when `isNitrileNitrogen()`
says so, 'amide' when `amideRole()` does, else 'amine', the last of `NAMED_KINDS`). `nameMolecule()` adds `groups`
(`analyzeGroups()`) to every `HETEROATOM` refusal only (a detection failure
leaves the refusal without `groups`). The explanation reads nothing else (§5).
