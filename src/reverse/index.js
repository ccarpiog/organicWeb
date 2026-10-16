/**
 * @file «¿Cómo se dibuja?» entry point (design.md §15.3, §15.5.3; phases
 * R-1b, R-1c, R-4a, R-4b, R-4c, R-5a1, R-5a2, R-5a3a, R-5b, R-5b2, R-5c1, R-5c2, R-5c3a, R-5d1, R-5d2, R-6a1, R-6a2a, R-6a2b, R-6b1, R-6b2, R-6c1, R-6c2, R-6c3): `readName(tiles) → verdict` for
 * open-chain and monocyclic hydrocarbon names (`ciclo` parents and ring
 * branches; the `benceno` parent with branch prefixes, `fenil` and
 * substituted `(4-metilfenil)` branches; the retained templates `tolueno`,
 * `estireno`, `xileno`, `mesitileno` and the orto/meta/para letters), their
 * halogen derivatives (`fluoro`, `cloro`, `bromo`, `yodo` prefixes, also
 * inside compound branches: `(2-cloroetil)`) and their alcohols (R-5a2: the
 * suffix `ol` on chains, rings and `benceno`, `fenol`, the prefix `hidroxi`,
 * the closing-bond locant `1(6)`; R-5a3a: the retained phenols `cresol`,
 * `pirocatecol`, `catecol`, `resorcinol`, `hidroquinona`) and their ethers
 * (R-5b: alkoxy prefixes — `metoxi`, `isopropoxi`, `fenoxi`, `(pentiloxi)`,
 * `(2-metilpropoxi)` — and the retained `anisol`) and their aldehydes and
 * ketones (R-5c1: the suffixes `al`, `ona`, `carbaldehído`, the prefixes
 * `oxo` and `formil`, `benzaldehído`; R-5c2: the acyl prefixes `acetil`,
 * `propanoil`, `(but-2-enoil)`, `benzoil`, `(4-metilbenzoil)`,
 * `(ciclohexanocarbonil)`; R-5c3a: the retained `formaldehído`,
 * `acetaldehído`, `acetona`, `acetofenona`, `fenilacetaldehído` and the
 * ftalaldehídos) and their carboxylic acids (R-5d1: the class word `ácido`,
 * the suffixes `oico` and `carboxílico`, `ácido benzoico`, the prefix
 * `carboxi`; R-5d2: the retained `ácido fórmico`, `ácido acético`, `ácido
 * oxálico`, `ácido fenilacético` and the ftálicos) and their esters (R-6a1:
 * the suffixes `oato` and `carboxilato`, `benzoato`, the O-bound groups
 * ending in `ilo` after the automatic ` de `; R-6a2a: the retained
 * `formiato`, `acetato` and `fenilacetato`; R-6a2b: the ester prefixes,
 * `acetiloxi`, `[(2-metilpropanoil)oxi]`, `metoxicarbonil`,
 * `[(propan-2-iloxi)carbonil]`) and their nitriles (R-6b1: the suffixes
 * `nitrilo` and `carbonitrilo`, `benzonitrilo`, the prefix `ciano`; R-6b2:
 * the retained `acetonitrilo`, `fenilacetonitrilo` and `ftalonitrilo`) and
 * their amines (R-6c1: the suffix `amina` and the locant `N` of a group on
 * the principal amine's nitrogen; R-6c2: the amino prefixes, `amino`,
 * `(metilamino)`, `(dimetilamino)`, `[etil(metil)amino]`; R-6c3: the
 * retained `anilina` and `bencilamina` and the class names, `metilamina`,
 * `dimetilamina`, `trimetilamina`). Pure, no DOM.
 *
 * The retained amine names and the amines' class names (R-6c3) need nothing
 * of their own here either: the parser reads `anilina` and `bencilamina` as
 * templates whose nitrogen takes `N` locants, and the `amina` tile right
 * after the groups as a class name's class word; the assembler writes a
 * class name in one word; the builder puts the template's nitrogen at its
 * carbon 1, or makes a class name's nitrogen the parent; and the engine names
 * the molecule (`anilina`, `N-metilanilina`, `N,4-dimetilanilina`,
 * `4-cloroanilina`, `p-cloroanilina`, `p-bromo-N,N-dimetilanilina`,
 * `bencilamina`, `metilamina`, `dimetilamina`, `trimetilamina`,
 * `etildimetilamina`, `di-tert-butilamina` → `alternative`; `metilanilina`,
 * `cloroanilina` → `ambiguous`; `N-metilbencilamina`, `4-hidroxianilina`,
 * `metiletilamina`, `ciclohexilamina` → `otherName`; `N,p-dimetilanilina` →
 * `invalid` POSITIONAL; `tetrametilamina`, `N,N,N-trimetilanilina` →
 * `invalid` VALENCE on the nitrogen; `N-fenilanilina`, `difenilamina` →
 * `outOfScope`, two rings). Their own mistakes are diagnose.js «Amines»'s
 * (phase I-52c4a: `4-hidroxianilina` CARBONYL_SENIORITY, `4-aminoanilina`
 * CARBONYL_PREFIX), with SUBSTITUTED_TEMPLATE on `bencilamina` and the shared
 * rules on `anilina`'s prefixes; the class names' own mistakes too (phase
 * I-52c4b: `metiletilamina` CLASS_ORDER, `metilmetilamina` CLASS_DI,
 * `ciclohexilamina` CLASS_NAME_NONE, each opening the class-name step).
 *
 * The amino prefixes (R-6c2) need nothing of their own here either: the
 * parser reads `amino` as a retained word and, as a compound branch's own
 * chain, the groups on its nitrogen before it, the assembler encloses every
 * group after the first as render.js does, the builder puts the nitrogen
 * with its groups on the carbon the prefix's locant gives, the search places
 * a left-out locant of the prefix (never on an amine's nitrogen), and the
 * engine names the molecule (`2-aminoetan-1-ol`, `2-[etil(metil)amino]etan-1-ol`,
 * `ácido 2-aminopropanoico`, `etanoato de 2-aminoetilo`, `4-aminobenzonitrilo`
 * → `correct`; `2-[(propan-2-il)amino]etan-1-ol` → `alternative`;
 * `aminoetanol` → `ambiguous`; `aminoetano` → `otherName` «etanamina»;
 * `2-(trimetilamino)etan-1-ol` → `invalid` VALENCE on the nitrogen;
 * `2-(cloroamino)etan-1-ol` → `outOfScope`, the engine's HETEROATOM). An
 * acyl group on the nitrogen (`(acetilamino)`, an amide's prefix) is a parse
 * error until the amides' phase (R-6d).
 *
 * The amines (R-6c1) need nothing of their own here either: the parser
 * reads `amina` as a suffix and `N` among a name-level prefix's locants, the
 * interpreter gives an `N` slot the value N_VALUE below every carbon, the
 * builder bonds such a prefix to the amine's nitrogen, the search places
 * left-out locants on the nitrogen too (search.js fillVariants() also tries
 * the suffix's list alone left out, as the engine omits it beside an `N`),
 * and the engine names the molecule (`N-metiletanamina`,
 * `N,2-dimetilpropan-1-amina`, `bencenamina` → `correct`;
 * `N-(propan-2-il)ciclohexanamina` → `alternative`; `metiletanamina` →
 * `missingLocants` «N-metiletanamina»; `metilpropan-2-amina` → `ambiguous`;
 * `N-etilmetanamina` → `otherName`; `N,N,N-trimetiletanamina` → `invalid`
 * VALENCE; `N-metilbutano-1,4-diamina` → `outOfScope`, the engine's
 * `substitutedPolyamine`). An amine's own mistakes are diagnose.js
 * «Amines»'s (phase I-52c4a: `N-etilmetanamina` AMINE_SIDE).
 *
 * The nitriles (R-6b1) need nothing of their own here either: the parser
 * reads their tiles, the assembler writes them as render.js does, the
 * builder puts the –C≡N's nitrogen on the parent's end carbon or on a carbon
 * outside it, and the engine names the molecule (`butanonitrilo`,
 * `ciclohexano-1,4-dicarbonitrilo`, `4-metilbenzonitrilo`, `ácido
 * 3-cianopropanoico` → `correct`; `bencenocarbonitrilo`,
 * `p-metilbenzonitrilo` → `alternative`; `metilpropanonitrilo` →
 * `missingLocants`; `metilbutanonitrilo` → `ambiguous`;
 * `4-metilbutanonitrilo` → `otherName`; `metanodinitrilo` → `invalid`
 * CARBONYL_POSITION; `propano-1,2,3-tricarbonitrilo` → `outOfScope`, the
 * engine's `manyNitriles`; `ácido cianometanoico` → `outOfScope`, its
 * `carbonocyanidic`). A nitrile's own mistakes are diagnose.js «Nitriles»'s
 * (R-6b3): the –C≡N's carbon on the other side of the parent
 * (NITRILE_CARBON: `propano-1-carbonitrilo`), and the shared codes with the
 * –C≡N's words (`cianometano` → CARBONYL_PREFIX, `3-carboxipropanonitrilo` →
 * CARBONYL_SENIORITY, `ciclohexano-1,5-dicarbonitrilo` → RING_NUMBERING at N0).
 *
 * The ester prefixes (R-6a2b) need nothing of their own here either: the
 * parser reads `oxi` after an acyl branch and `carbonil` after `oxi`, the
 * assembler writes them as render.js does, the builder puts the ether oxygen
 * after the acyl group's C=O or a C=O carbon after the alkoxy group's
 * oxygen, and the engine names the molecule (`ácido 2-(acetiloxi)etanoico`,
 * `ácido 3-(metoxicarbonil)pentanodioico`, `ácido
 * 4-(acetiloxi)ciclohexano-1-carboxílico` → `correct`; `ácido
 * 3-[(propan-2-iloxi)carbonil]pentanodioico` → `alternative`; `ácido
 * (acetiloxi)etanoico` → `missingLocants`; `ácido (acetiloxi)propanoico` →
 * `ambiguous`; `ácido 3-(metoxicarbonil)propanoico` → `otherName`, the
 * engine's `ácido 4-metoxi-4-oxobutanoico`; `2-(acetiloxi)etanoato de
 * metilo` → `outOfScope`, the engine's `esterPrefix`). Their own mistakes
 * are diagnose.js «Esters»'s: an alkoxycarbonyl prefix whose C=O carbon the
 * engine takes into the chain (ESTER_IN_CHAIN, R-6a3a), an ester prefix
 * written as another kind of branch (ESTER_PREFIX_NAME, R-6a3b) or with the
 * general acyl word (ACYL_NAME).
 *
 * The esters (R-6a1) need nothing of their own here either: the parser
 * reads the O-bound side after the ester suffix, the assembler writes the
 * automatic ` de ` and ` y ` (`propanodioato de etilo y metilo`), the
 * builder bonds each O-bound group to the bridge oxygen of its –COO–, and the
 * engine names the molecule (`etanoato de metilo`, `butanodioato de
 * dimetilo`, `ciclohexanocarboxilato de etilo`, `4-metilbenzoato de etilo`,
 * `benzoato de fenilo` → `correct`; `etanoato de propan-2-ilo`,
 * `bencenocarboxilato de metilo`, `p-metilbenzoato de etilo` →
 * `alternative`; `ciclohexanodicarboxilato de dimetilo` → `ambiguous`;
 * `metilpropanoato de metilo` → `missingLocants`; `4-metilbutanoato de
 * metilo` → `otherName`; `benceno-1,4-dicarboxilato de dimetilo`,
 * `2-metilbutanodioato de etilo y metilo` → `outOfScope`, the engine's
 * refusals). An ester's own mistakes are diagnose.js «Esters»'s (R-6a3a:
 * the principal –COO– group's; R-6a3b: the O-bound side's, and an ether
 * class name whose oxygen is an ester's, ESTER_CLASS_NAME).
 *
 * The retained nitrile names (R-6b2) need nothing of their own here either,
 * as the retained acids: the engine gives them as alternatives
 * (`acetonitrilo`, `fenilacetonitrilo`, `ftalonitrilo`, also
 * `2-(4-metilfenil)acetonitrilo` and `4-metilftalonitrilo`), so they are
 * `alternative`; one with any other prefix (`2-cloroacetonitrilo`) describes
 * its molecule and gets `otherName`; `(4-metilfenil)acetonitrilo` is
 * `missingLocants`, `metilftalonitrilo` `ambiguous`.
 *
 * The retained ester names (R-6a2a) need nothing of their own here either,
 * as the retained acids: the engine gives them as alternatives, with the
 * O-bound group in the default style only (`formiato de metilo`, `acetato
 * de isopropilo`, `acetato de fenilo`, `fenilacetato de metilo`, also
 * `2-(4-metilfenil)acetato de etilo`), so they are `alternative`; one with
 * another style of O-bound group (`acetato de propan-2-ilo`) or any other
 * prefix (`2-cloroacetato de metilo`) describes its molecule and gets
 * `otherName`; `(4-metilfenil)acetato de etilo` is `missingLocants`.
 *
 * The retained acid names need nothing of their own here either, as the
 * carbonyl ones: the engine gives them as alternatives (`ácido acético`,
 * `ácido ftálico`, also `ácido 4-metilftálico` and `ácido
 * 2-(3-metilfenil)acético`), so they are `alternative`; any other prefix on
 * one (`ácido 2-cloroacético`) describes its molecule and gets `otherName`
 * (diagnose.js SUBSTITUTED_TEMPLATE), or `invalid` where it cannot go
 * (`ácido 2-clorooxálico`: VALENCE); `ácido metilftálico` is `ambiguous`,
 * `ácido (4-metilfenil)acético` `missingLocants`.
 *
 * The acids need nothing of their own here either: the class word is read
 * by the parser and written by the assembler (`ácido 2-metilpropanoico`),
 * the –COOH is built on the parent or outside it (build.js) and searched
 * like the aldehydes' –CHO (search.js), and the engine names the molecule
 * (`ácido butanoico`, `ácido ciclohexano-1,4-dicarboxílico`, `ácido
 * 4-metilbenzoico` → `correct`; `ácido bencenocarboxílico`, `ácido
 * p-metilbenzoico` → `alternative`; `ácido metilbutanoico` → `ambiguous`;
 * `ácido 4-metilbutanoico` → `otherName`; `ácido metanodioico` → `invalid`
 * CARBONYL_POSITION; `ácido propano-1,2,3-tricarboxílico` → `outOfScope`, the
 * engine's `manyAcids`). An acid's own mistakes have their diagnoses
 * (diagnose.js «Acids»: `1-hidroxipropanal` → ACID_GROUP, `ácido
 * propano-1-carboxílico` → ACID_CARBON, `carboxiciclohexano` →
 * CARBONYL_PREFIX).
 *
 * The retained carbonyl names need nothing of their own here either: the
 * engine gives them as alternatives (`acetona`, `ftalaldehído`, also
 * `4-metilftalaldehído` and `2-(4-metilfenil)acetaldehído`), so they are
 * `alternative`; any other prefix on one (`1-cloroacetona`) describes its
 * molecule and gets `otherName` (diagnose.js SUBSTITUTED_TEMPLATE);
 * `metilftalaldehído` is `ambiguous`, `(4-metilfenil)acetaldehído`
 * `missingLocants`.
 *
 * The acyl prefixes need nothing of their own here either: their branch and
 * its C=O are built like any branch (build.js) and searched like one
 * (search.js), and the engine names the molecule (`3-acetilpentano-2,4-diona`,
 * `2-(2-metilpropanoil)heptanal`, `2-(ciclohex-2-eno-1-carbonil)heptanal`,
 * `4-acetilciclohexano-1-carbaldehído` → `correct`;
 * `2-[4-(propan-2-il)benzoil]heptanal` → `alternative`; `acetilpentanodiona`
 * → `missingLocants`; `propanoilheptanal` → `ambiguous`; an acyl on a
 * hydrocarbon ring, on benzene or on a template is a ketone whose chain is the
 * parent, `butanoilciclohexano` → `otherName` «1-ciclohexilbutan-1-ona»; two
 * rings through the C=O carbon, `benzoilbenceno`, → `outOfScope`, the engine's
 * several rings).
 *
 * The aldehydes and ketones need nothing of their own here either: their
 * groups are built on the parent (build.js) and searched like the alcohol's
 * (search.js), and the engine names the molecule (`butanal`,
 * `pentano-2,4-diona`, `ciclohexanocarbaldehído`, `4-metilbenzaldehído` →
 * `correct`; `bencenocarbaldehído`, `p-clorobenzaldehído`, `propan-2-ona` →
 * `alternative`; `butanona` → `missingLocants` (`butan-2-ona`);
 * `pentanona` → `ambiguous`; `2-pentanona` → `otherName` with the note
 * «…hoy se escribe «pentan-2-ona»»; `propano-1,2,3-tricarbaldehído` →
 * `outOfScope`, the engine's `manyAldehydes`).
 *
 * The ethers need nothing of their own here either: an alkoxy prefix is
 * built as its branch and an ether oxygen (build.js) and searched like any
 * prefix (search.js), and the engine names the molecule (`metoxietano`,
 * `cloro(metoxi)metano`, `1-(propan-2-iloxi)butano` → `correct` /
 * `alternative`; `metoxipropano` → `ambiguous`; `anisol` → `alternative`, a
 * substituted `4-cloroanisol` → `otherName`). A molecule the engine refuses
 * gets `outOfScope` with its message: two rings joined by an ether oxygen
 * (`fenoxibenceno`, several rings), or an ether whose two identical halves
 * carry the principal group (`2-(2-hidroxietoxi)etan-1-ol`, the engine's
 * `symmetricEther`, named with `oxidi-`). An ether's functional-class name
 * (R-5b2: `etil metil éter`, `dietil éter`, `tert-butil metil éter`) is
 * built from its oxygen and its two groups (interpret.js, build.js) and
 * judged like any name: the engine lists it among the alternatives (style
 * `functionalClass`) of the simple ethers only, so the exact comparison
 * makes it `alternative`; one in another order or with other words
 * (`metil etil éter`, `metil (propan-2-il) éter`), or for an ether the engine
 * gives no class name (`etenil metil éter`, `(2-cloroetil) metil éter`),
 * describes its molecule and gets `otherName` (diagnose.js «Ethers»); one
 * whose molecule the engine refuses gets `outOfScope` (`difenil éter`, two
 * rings; `bis(2-hidroxietil) éter`, `symmetricEther`).
 *
 * The retained phenols need nothing of their own here either, but one
 * message: the engine gives `o-cresol`, `pirocatecol`, `catecol`,
 * `resorcinol`, `hidroquinona` as alternatives of the bare molecules
 * (design.md §14.5), so they are `alternative`; a substituted one
 * (`4-clorocatecol`) describes its molecule and gets `otherName`; `cresol`
 * without its letter is three structures, filled as `o-cresol`, `m-cresol`
 * and `p-cresol`, and since what is missing is a letter, not a number (the
 * engine writes no `4-cresol`), the `ambiguous` message says so: «Falta la
 * letra: puede ser o-cresol, m-cresol o p-cresol.»; a `cresol` with prefixes
 * of the student's and no letter (`4-clorocresol`) can take neither a letter
 * nor numbers, so its message sends the student to the engine's names it
 * lists («El nombre «cresol» no admite más sustituyentes: se escribe con
 * números. Puede ser 4-cloro-2-metilfenol o 4-cloro-3-metilfenol.»).
 *
 * The alcohols need nothing of their own here either: the suffix's OH
 * groups are built on the parent (build.js) and searched like a prefix's
 * carbon slots (search.js), so `etanol`, `ciclohexanol`, `fenol` are
 * `correct`, `propanol` `ambiguous` («puede ser propan-1-ol o
 * propan-2-ol»); the filled comparison keeps the suffix's locants out
 * together with the prefixes' (search.js fillVariants()), as the engine
 * omits them; `p-metilfenol` is the engine's positional alternative. The
 * old-style `2-propanol` gets the note «…hoy se escribe «propan-2-ol»».
 *
 * The halogens need nothing of their own here either: they are prefixes
 * like any branch (build.js adds one atom each; search.js places left-out
 * ones by the carbons' free valence), and the engine names their molecules
 * (`clorometano` → `correct`, `dicloroetano` → `ambiguous`,
 * `dodecafluorociclohexano` → `correct`, one placement).
 *
 * The templates and the letters need nothing of their own here: the engine
 * gives `tolueno`, `1,2-xileno`, `o-xileno`, `mesitileno`… and
 * `o-dimetilbenceno` as alternatives of the bare molecules (design.md
 * §14.4–§14.5), so the exact comparison of step 5 finds them (`alternative`,
 * with the engine's own label: the traditional one for `p-xileno`, the
 * orto/meta/para one for `p-dimetilbenceno`); a template with prefixes of the
 * student's (`4-metiltolueno`), which the engine never writes, describes its
 * molecule and gets `otherName`, or `ambiguous` with left-out locants;
 * `xileno` alone is three structures, listed as `1,2-xileno`, `1,3-xileno`
 * and `1,4-xileno` (step 6).
 *
 * Pipeline (design.md §15.5.3):
 *
 * 1. parse (parse.js) → assemble the student's text (assemble.js, from the
 *    tree, never through the engine's rendering) → NameSpec
 *    (interpret.js) → definite structural errors (build.js checkSpec()),
 *    then a name whose molecule the structural key cannot handle (build.js
 *    ringRefusal(): three rings, or two bonded atom to atom —
 *    `ciclohexilciclohexano`, `fenilbenceno`) → `outOfScope` with the
 *    engine's own message, nothing built;
 * 2–4. search.js: every placement of the left-out locants (none when the
 *    name gives them all), built (build.js), merged by structural key — the
 *    aromatic-equivalence key (model/graph.js aromaticKey(), R-4b), so the
 *    two Kekulé drawings of a benzene ring are one structure: `dimetilbenceno`
 *    is three structures, not four — and named once each
 *    (naming/index.js nameMolecule(), cached by key);
 * 5. **Exact**: a structure whose name or any alternative (§15.9 trap 8)
 *    equals the text, in NFC (trap 7) → `correct` / `alternative`;
 * 6. **Filled**: with left-out locants, each placement is written into the
 *    student's tree and assembled (search.js filledTree(), assemble.js) —
 *    every list filled, and also with the lists the engine omits by rule
 *    kept without locants (search.js fillVariants(): the name-level prefix
 *    lists, the parent's multiple-bond lists; R-4a, a monosubstituted ring
 *    omits its prefix locant); the structures whose name or an alternative
 *    equals a filled text of one of their placements → one:
 *    `missingLocants` (with that filled name), several: `ambiguous`;
 * 7. **One structure** (all placements equivalent, or no left-out locant)
 *    → `otherName`, with the student's main mistake (diagnose.js, R-3 and,
 *    for a name with a ring — `ciclo`, benzene, a template — the ring rules
 *    of R-4d: `diagnosis`, null when no rule applies), or `outOfScope`
 *    when the engine refuses it;
 * 8. several structures, none matching → `ambiguous`, with their names; but
 *    when the engine refuses every one of them (`diciclohexilpropano`: two
 *    rings, wherever they go) → `outOfScope` with the first refusal's
 *    message, no molecule.
 *
 * Verdicts (design.md §15.3; Spanish drafts pending teacher review):
 * `correct`, `alternative`, `missingLocants`, `otherName`, `ambiguous`,
 * `incomplete` (the search ran out of budget: it claims nothing about the
 * name), `outOfScope` and `invalid` (parse or structural errors, also a
 * name whose left-out locants fit nowhere). An `ambiguous` message lists at
 * most MAX_LISTED names in search order (lowest locants first) and counts
 * the rest («…, C u otras 2 moléculas»); `candidates` holds them all.
 *
 * The molecule shown is (a copy of) the graph the engine named, so every
 * atom and bond id in `naming` is one of its own; the student's reading is
 * carried onto it: for a name with left-out locants, the placement whose
 * filled text is the name matched (else the first placement found, lowest
 * locants first) is built and mapped through an isomorphism up to the
 * Kekulé drawing of its benzene rings (search.js placementReading()) to give
 * `studentParent` and `prefixAtoms`.
 *
 * The search's time limit (search.js `deadline`) holds through steps 5–8
 * too: a verdict chosen after it has passed is replaced by `incomplete`.
 *
 * Old-style names (`2-buteno`) are built and judged like any other — their
 * filled text keeps the old style, so they never match a name — and every
 * verdict past the structural checks carries a note with the modern writing
 * of the student's own name (`but-2-eno`).
 */

import { nameMolecule } from '../naming/index.js';
import { parse } from './parse.js';
import { assemble } from './assemble.js';
import { interpret } from './interpret.js';
import { checkSpec, ringRefusal, polyamineRefusal } from './build.js';
import { searchStructures, filledTree, fillVariants, placementReading } from './search.js';
import { diagnose, MAX_READINGS } from './diagnose.js';
import { TEMPLATES } from './tiles.js';

/** Verdict kinds (design.md §15.3), in the order of its table. */
export const VERDICT_KINDS = Object.freeze([
  'correct', 'alternative', 'missingLocants', 'otherName', 'ambiguous', 'incomplete', 'invalid', 'outOfScope',
]);

/** Names an `ambiguous` message lists before counting the rest (design.md §15.3: «at most three»). */
export const MAX_LISTED = 3;

/** Alternative styles that are traditional names, announced by `correct` («También se llama…», design.md §15.1). */
const TRADITIONAL_STYLES = Object.freeze(['traditional']);

/** Fixed verdict texts (design.md §15.3 drafts, pending teacher review). */
export const VERDICT_TEXTS = Object.freeze({
  correct: '¡Correcto!',
  almost: 'Casi: faltan los números.',
  stepByStep: 'Pulsa «Ver paso a paso» para ver por qué.',
  ambiguous: 'Faltan números: puede ser',
  /** Start of an `ambiguous` message when only the letter of `cresol` is missing (R-5a3a). */
  ambiguousLetter: 'Falta la letra: puede ser',
  incomplete: 'Faltan números: escribe en qué carbono va cada grupo.',
  outOfScope: 'Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar:',
  /** Start of the old-style note (`notes`), followed by the modern writing in «…» and a full stop. */
  oldStyle: 'Es la forma antigua de escribirlo; hoy se escribe',
});

/**
 * One tile range with its error (the parser's shape, design.md §15.6).
 *
 * @typedef {object} VerdictError
 * @property {string} code - Error code (parse.js ERROR_CODES or build.js BUILD_ERROR_CODES).
 * @property {string} message - Spanish message.
 * @property {number} from - First tile index.
 * @property {number} to - Tile index after the last one.
 */

/**
 * One structure an `ambiguous` name can describe.
 *
 * @typedef {object} Candidate
 * @property {string|null} text - The form shown: the student's name with its locants filled in when that is a name
 *   of the structure (step 6), else the engine's name (step 8); null when the engine refuses the structure.
 * @property {string|null} name - The engine's name (null when refused).
 * @property {object} molecule - The structure (model/molecule.js; atoms without meaningful coordinates).
 */

/**
 * The result of readName(): one shape for every kind, so the UI phases can
 * rely on it (fields that do not apply are null or empty).
 *
 * @typedef {object} Verdict
 * @property {'correct'|'alternative'|'missingLocants'|'otherName'|'ambiguous'|'incomplete'|'invalid'|'outOfScope'} kind - The verdict.
 * @property {string} message - What the app says (Spanish), ready to show.
 * @property {string} text - The assembled name (NFC), as on the dialog's name line.
 * @property {{tile: number|null, from: number, to: number, kind: string, pending?: boolean}[]} spans - assemble() spans of `text`.
 * @property {string|null} name - The engine's name of the molecule (when one structure is named).
 * @property {{style: string, label: string, name: string, parts: object[]}[]} alternatives - The engine's alternatives (when named; else []).
 * @property {{style: string, label: string, name: string}|null} matched - The alternative equal to the text (`alternative`) or to the
 *   filled text (`missingLocants`); else null.
 * @property {string|null} filled - `missingLocants`: the student's name with its left-out locants filled in; else null.
 * @property {Candidate[]} candidates - `ambiguous`: every structure the name can describe, in search order; else [].
 * @property {object|null} molecule - The one molecule the name describes (model/molecule.js; atoms without meaningful
 *   coordinates): correct, alternative, missingLocants, otherName, outOfScope of one structure; else null (also an
 *   outOfScope name with too many rings, or whose every structure the engine refuses).
 * @property {{atoms: number[], bonds: number[]}|null} studentParent - The parent in the student's locant order (with `molecule`).
 * @property {object[]} prefixAtoms - Atoms of each prefix occurrence (build.js build()); [] without `molecule`.
 * @property {object[]} suffixAtoms - The carbon and oxygen of each suffix group (R-5a2, build.js build()); [] without
 *   `molecule` or without a suffix.
 * @property {object[]} esterAtoms - The atoms of each occurrence of an ester's O-bound groups and the bond to its bridge
 *   oxygen (R-6a1, build.js attachEsterGroups()); [] without `molecule` or without an ester.
 * @property {object|null} naming - The engine's whole result (nameMolecule(); a refusal for outOfScope), when named.
 * @property {VerdictError[]} errors - `invalid`: the parser's errors, or the one structural error; else [].
 * @property {string[]} notes - Extra lines shown beside the verdict (the old-style note).
 * @property {boolean} draw - Whether the UI draws `molecule` (correct, alternative, missingLocants, otherName).
 * @property {object|null} [diagnosis] - `otherName` only (no other verdict has the field): the student's main mistake
 *   (diagnose.js Diagnosis), or null when no rule applies. `message` stays the §15.3 text; the results panel puts the
 *   diagnosis's message between its two sentences. Its `step` belongs to the explanation of the naming in its `style`
 *   (diagnose.js diagnosisExplanation()), not always to that of `naming`.
 */

/**
 * Compares two names as the student and the engine write them: equal in
 * Unicode NFC (design.md §15.9 trap 7: `ácido`, `éter`, `aldehído`).
 *
 * @param {string} a - A name.
 * @param {string} b - Another name.
 * @returns {boolean} True when they are the same text.
 */
export function sameName(a, b) {
  return String(a).normalize('NFC') === String(b).normalize('NFC');
}

/**
 * The modern writing of an old-style name: its old-style locants moved
 * behind the root, into the segment or the suffix they belong to
 * (`2-buteno` → `but-2-eno`, `1,3-butadieno` → `buta-1,3-dieno`,
 * `2-propanol` → `propan-2-ol`), assembled from the tree.
 *
 * @param {object} tree - An error-free parse() tree with old-style locants.
 * @returns {string} The text.
 */
export function modernText(tree) {
  const { parent } = tree;
  if (parent.legacySuffix) {
    // `2-propanol` → `propan-2-ol`, `1,2-bencenodiol` → `benceno-1,2-diol` (R-5a2).
    return assemble({ ...tree, parent: { ...parent, legacy: [], legacySuffix: false, suffix: { ...parent.suffix, locants: parent.legacy } } }).text;
  }
  const segments = parent.chain.segments.map((segment, i) => (i === parent.legacySegment ? { ...segment, locants: parent.legacy } : segment));
  return assemble({ ...tree, parent: { ...parent, legacy: [], chain: { ...parent.chain, segments } } }).text;
}

/**
 * The Spanish «o» before a word, «u» when the word sounds /o/ at the start
 * (`u octano`, `u 8-metil…`, `u 11-metil…`, `u otras`).
 *
 * @param {string} next - The word that follows.
 * @returns {string} 'o' or 'u'.
 */
export function orBefore(next) {
  return /^(?:h?o|8|11(?!\d))/i.test(next) ? 'u' : 'o';
}

/**
 * The `ambiguous` message (design.md §15.3): «Faltan números: puede ser
 * but-1-eno o but-2-eno.», names unquoted as in the draft, at most
 * MAX_LISTED of them, then «u otra molécula» / «u otras N moléculas» for
 * the rest (refused structures, which have no name, are counted there
 * too).
 *
 * @param {Candidate[]} candidates - The structures, in search order.
 * @param {string} [lead] - The start of the message (default VERDICT_TEXTS.ambiguous; another for `cresol`, R-5a3a:
 *   ambiguousLead()).
 * @returns {string} The message.
 */
export function ambiguousMessage(candidates, lead = VERDICT_TEXTS.ambiguous) {
  const texts = candidates.map((c) => c.text).filter((text) => text !== null);
  const shown = texts.slice(0, MAX_LISTED);
  const rest = candidates.length - shown.length;
  if (shown.length === 0) {
    return `Faltan números: tu nombre puede describir ${candidates.length} moléculas distintas.`;
  }
  if (rest > 0) {
    const others = rest === 1 ? 'otra molécula' : `otras ${rest} moléculas`;
    return `${lead} ${shown.join(', ')} ${orBefore(others)} ${others}.`;
  }
  if (shown.length === 1) {
    return `${lead} ${shown[0]}.`; // Defensive: an ambiguous verdict has several structures.
  }
  const last = shown[shown.length - 1];
  return `${lead} ${shown.slice(0, -1).join(', ')} ${orBefore(last)} ${last}.`;
} // End of function ambiguousMessage()

/**
 * The start of an `ambiguous` message, by what is missing: «Faltan números:
 * puede ser» as a rule; for a template that takes its position as a letter
 * only (R-5a3a: `cresol`, whose methyl's place the engine writes `o-`, `m-`
 * or `p-`, never as a number), «Falta la letra: puede ser» when the bare
 * template leaves out its letter, and — with prefixes of the student's
 * (`4-clorocresol`), where neither a letter (three ring positions,
 * POSITIONAL) nor a number (TEMPLATE_LOCANTS) would be accepted — a lead
 * that sends the student to the names listed, the engine's own, with
 * numbers (review of I-51a3a: no loop between messages).
 *
 * @param {object} spec - A NameSpec with left-out locants.
 * @returns {string} The lead.
 */
function ambiguousLead(spec) {
  const { template } = spec.parent;
  if (!template || !TEMPLATES[template.value].letterOnly) {
    return VERDICT_TEXTS.ambiguous;
  }
  const own = new Set(template.groups.flatMap((group) => group.slots));
  if (!spec.leftOut.some((slot) => own.has(slot))) {
    return VERDICT_TEXTS.ambiguous; // Never: a letter beside prefixes is POSITIONAL, numbers TEMPLATE_LOCANTS.
  }
  return spec.prefixes.length === 0 ? VERDICT_TEXTS.ambiguousLetter : substitutedLead(template.word.text);
} // End of function ambiguousLead()

/**
 * The lead of the `ambiguous` message of a substituted letter-only template
 * (R-5a3a review: `4-clorocresol`): «El nombre «cresol» no admite más
 * sustituyentes: se escribe con números. Puede ser» — the engine's names
 * follow (`4-cloro-2-metilfenol`…), which the app reads.
 *
 * @param {string} word - The template's word.
 * @returns {string} The lead.
 */
export function substitutedLead(word) {
  return `El nombre «${word}» no admite más sustituyentes: se escribe con números. Puede ser`;
}

/**
 * A verdict with every field at its empty value.
 *
 * @param {string} kind - Verdict kind.
 * @param {string} message - Spanish message.
 * @param {{text: string, spans: object[]}} assembled - The assembled name.
 * @param {object} [extra] - Fields to set.
 * @returns {Verdict} The verdict.
 */
function verdict(kind, message, assembled, extra = {}) {
  return {
    kind,
    message,
    text: assembled.text.normalize('NFC'),
    spans: assembled.spans,
    name: null,
    alternatives: [],
    matched: null,
    filled: null,
    candidates: [],
    molecule: null,
    studentParent: null,
    prefixAtoms: [],
    suffixAtoms: [],
    esterAtoms: [],
    naming: null,
    errors: [],
    notes: [],
    draw: false,
    ...extra,
  };
} // End of function verdict()

/**
 * Which name of a successful naming a text is: the name given first, one
 * of the alternatives (every style, design.md §15.9 trap 8), or none.
 *
 * @param {object} naming - A successful nameMolecule() result.
 * @param {string} text - A name.
 * @returns {{main: boolean, alternative: object|null}|null} `main` for the name given first, else the alternative; null when neither.
 */
function nameMatch(naming, text) {
  if (sameName(text, naming.name)) {
    return { main: true, alternative: null };
  }
  const alternative = (naming.alternatives || []).find((alt) => sameName(text, alt.name));
  return alternative ? { main: false, alternative } : null;
}

/**
 * The public fields of a matched alternative.
 *
 * @param {object|null} alternative - An engine alternative, or null.
 * @returns {{style: string, label: string, name: string}|null} Its style, label and name.
 */
function matchedFields(alternative) {
  return alternative ? { style: alternative.style, label: alternative.label, name: alternative.name } : null;
}

/**
 * The fields of a verdict that draws one structure: the student's reading
 * of one placement and the engine's naming. The molecule is a copy of the
 * graph the naming was computed on, so every atom and bond id the naming
 * cites is one of its own, and the reading of the drawn placement is
 * carried onto it (search.js placementReading() explains why that way
 * round).
 *
 * @param {object} spec - The NameSpec.
 * @param {object} structure - A named search.js Structure.
 * @param {number[]} placement - One of its placements.
 * @returns {object} `molecule`, `studentParent`, `prefixAtoms`, `naming` and, when named, `name` and `alternatives`.
 */
function drawnFields(spec, structure, placement) {
  const { naming } = structure;
  return {
    ...placementReading(spec, structure, placement),
    naming,
    ...(naming.ok ? { name: naming.name, alternatives: naming.alternatives || [] } : {}),
  };
} // End of function drawnFields()

/**
 * The diagnosis of an `otherName` verdict (diagnose.js), or null should
 * the diagnosis itself fail (a bug): the verdict, which draws the molecule
 * and gives its name, never depends on it.
 *
 * @param {{tree: object, spec: object}} name - The student's tree and NameSpec.
 * @param {object} fields - drawnFields() of the drawn placement (molecule, naming, the student's reading).
 * @param {() => object[]} others - Gives the readings of the structure's other placements (left-out locants), built only here.
 * @param {(mol: object, options?: object) => object} namer - readName()'s naming function (for the student's prefix style).
 * @returns {object|null} The diagnosis, or null.
 */
function diagnoseSafely(name, fields, others, namer) {
  try {
    return diagnose(name, fields, others(), namer);
  } catch (err) {
    return null;
  }
}

/**
 * Reads a name built from tiles and judges it (design.md §15.3, §15.5.3):
 * the molecule it describes and how the app names that molecule.
 *
 * @param {(string|object)[]} tiles - Tile ids or catalogue tiles (tiles.js), in the student's order.
 * @param {{namer?: (mol: object, options?: object) => object, budget?: {placements?: number, namings?: number, ms?: number},
 *   now?: () => number, cache?: Map<string, object>}} [options] - `namer`: the naming function (default
 *   nameMolecule(); tests inject a refusal, since the engine names every open-chain hydrocarbon within its caps; the
 *   diagnosis of an `otherName` also calls it with `{prefixStyle}` for a name in another prefix style, diagnose.js);
 *   `budget`, `now`, `cache`: the search's limits, clock and naming cache (search.js searchStructures(); its time
 *   limit also bounds steps 5–8 here).
 * @returns {Verdict} The verdict.
 * @throws {Error} Only for an unknown tile id.
 */
export function readName(tiles, options = {}) {
  const namer = options.namer || nameMolecule;
  const { tree, errors } = parse(tiles);
  const assembled = assemble(tree);
  if (errors.length > 0) {
    return verdict('invalid', errors[0].message, assembled, { errors: errors.map((e) => ({ ...e })) });
  }
  const text = assembled.text.normalize('NFC');
  const spec = interpret(tree);
  /**
   * The `invalid` verdict of a structural error.
   *
   * @param {{code: string, message: string, tiles: [number, number]}} error - The build error.
   * @returns {Verdict} The verdict.
   */
  const invalid = (error) => verdict('invalid', error.message, assembled, {
    errors: [{ code: error.code, message: error.message, from: error.tiles[0], to: error.tiles[1] }],
  });
  const early = checkSpec(spec);
  if (early) {
    return invalid(early);
  }
  const notes = spec.oldStyle ? [`${VERDICT_TEXTS.oldStyle} «${modernText(tree)}».`] : [];
  const refusal = ringRefusal(spec) || polyamineRefusal(spec);
  if (refusal) {
    return verdict('outOfScope', `${VERDICT_TEXTS.outOfScope} ${refusal.message}`, assembled, { notes });
  }
  const now = options.now || Date.now;
  const search = searchStructures(spec, { namer, budget: options.budget, now, cache: options.cache });
  if (search.status === 'none') {
    return invalid(search.error);
  }
  const incomplete = verdict('incomplete', VERDICT_TEXTS.incomplete, assembled, { notes });
  if (search.status === 'budget') {
    return incomplete;
  }
  let late = false;
  /**
   * Tells whether the search's time limit has passed (design.md §15.5.3
   * step 3), and keeps saying so once it has: the filled-text comparisons
   * and the verdict selection count against the same `deadline`.
   *
   * @returns {boolean} True once the clock has read past the deadline.
   */
  const overTime = () => {
    late = late || now() > search.deadline;
    return late;
  };
  const { structures } = search;
  const named = structures.filter((s) => s.naming.ok);
  const memo = new Map();
  const variants = fillVariants(spec);
  /**
   * The first placement of a structure whose filled text is one of its
   * names (the name given first preferred), memoised: every left-out list
   * filled, or with the lists the engine omits by rule kept without locants
   * (search.js fillVariants()). It stops early once the time limit has
   * passed (then readName() answers `incomplete` whatever it found).
   *
   * @param {object} structure - A named Structure.
   * @returns {{placement: number[], filled: string, main: boolean, alternative: object|null}|null} The match, or null.
   */
  const filledMatch = (structure) => {
    if (!memo.has(structure)) {
      let found = null;
      for (const placement of spec.leftOut.length > 0 ? structure.placements : []) {
        if (overTime()) {
          break;
        }
        for (const keep of variants) {
          const filled = assemble(filledTree(tree, spec, placement, keep)).text.normalize('NFC');
          const match = nameMatch(structure.naming, filled);
          if (match && (!found || (match.main && !found.main))) {
            found = { placement, filled, ...match };
          }
          if (found && found.main) {
            break;
          }
        } // End of the loop over the ways of filling one placement
        if (found && found.main) {
          break;
        }
      } // End of the loop over the placements of one structure
      memo.set(structure, found);
    }
    return memo.get(structure);
  }; // End of function filledMatch()
  /**
   * An `ambiguous` verdict over some candidates.
   *
   * @param {{text: string|null, structure: object}[]} list - The candidates and the form each is shown with.
   * @returns {Verdict} The verdict.
   */
  const ambiguous = (list) => {
    const candidates = list.map(({ text: shown, structure }) => ({
      text: shown, name: structure.naming.ok ? structure.naming.name : null, molecule: structure.built.molecule,
    }));
    return verdict('ambiguous', ambiguousMessage(candidates, ambiguousLead(spec)), assembled, { candidates, notes });
  };

  /**
   * Steps 5–8: the verdict over the named structures.
   *
   * @returns {Verdict} The verdict.
   */
  const judge = () => {
    // Step 5, Exact: the text is a name of a structure.
    const exact = named.filter((s) => nameMatch(s.naming, text));
    if (exact.length > 1) {
      return ambiguous(exact.map((s) => ({ text: s.naming.name, structure: s }))); // Never seen: names are unambiguous.
    }
    if (exact.length === 1) {
      const [structure] = exact;
      const match = nameMatch(structure.naming, text);
      const fields = drawnFields(spec, structure, (filledMatch(structure) || { placement: structure.placements[0] }).placement);
      if (match.main) {
        const also = (structure.naming.alternatives || []).filter((alt) => TRADITIONAL_STYLES.includes(alt.style))
          .map((alt) => ` También se llama «${alt.name}» (${alt.label}).`).join('');
        return verdict('correct', `${VERDICT_TEXTS.correct}${also}`, assembled, { ...fields, notes, draw: true });
      }
      return verdict('alternative', `${VERDICT_TEXTS.correct} «${text}» es una forma válida (${match.alternative.label}). `
        + `El nombre que doy primero es «${structure.naming.name}».`, assembled, {
        ...fields, matched: matchedFields(match.alternative), notes, draw: true,
      });
    } // End of step 5

    // Step 6, Filled: the text with its left-out locants filled in is a name of a structure.
    const filled = named.filter((s) => filledMatch(s));
    if (filled.length > 1) {
      return ambiguous(filled.map((s) => ({ text: filledMatch(s).filled, structure: s })));
    }
    if (filled.length === 1) {
      const [structure] = filled;
      const match = filledMatch(structure);
      const message = match.main
        ? `${VERDICT_TEXTS.almost} Se escribe «${match.filled}».`
        : `${VERDICT_TEXTS.almost} Se escribe «${match.filled}» (${match.alternative.label}). `
          + `El nombre que doy primero es «${structure.naming.name}».`;
      return verdict('missingLocants', message, assembled, {
        ...drawnFields(spec, structure, match.placement), matched: matchedFields(match.alternative), filled: match.filled, notes, draw: true,
      });
    } // End of step 6

    // Step 7, one structure.
    if (structures.length === 1) {
      const [structure] = structures;
      const fields = drawnFields(spec, structure, structure.placements[0]);
      if (!structure.naming.ok) {
        return verdict('outOfScope', `${VERDICT_TEXTS.outOfScope} ${structure.naming.error.message}`, assembled, { ...fields, notes });
      }
      // The other placements of left-out locants are other readings of the same name (diagnose() keeps the kindest).
      const others = spec.leftOut.length > 0 ? structure.placements.slice(1, MAX_READINGS) : [];
      const diagnosis = diagnoseSafely({ tree, spec }, fields, () => others.map((p) => placementReading(spec, structure, p)), namer);
      return verdict('otherName', `Esta es la molécula que describe tu nombre, pero se llama «${structure.naming.name}». `
        + `${VERDICT_TEXTS.stepByStep}`, assembled, { ...fields, notes, draw: true, diagnosis });
    }

    // Step 8, several structures, none matching: named ones first, refusals kept apart. Every one refused: whatever the
    // left-out locants, the app cannot draw the molecule.
    if (named.length === 0) {
      return verdict('outOfScope', `${VERDICT_TEXTS.outOfScope} ${structures[0].naming.error.message}`, assembled, { notes });
    }
    const refused = structures.filter((s) => !s.naming.ok);
    return ambiguous([...named.map((s) => ({ text: s.naming.name, structure: s })), ...refused.map((s) => ({ text: null, structure: s }))]);
  }; // End of function judge()
  const judged = judge();
  // The search's time limit holds through steps 5–8 (the filled-text comparisons, the drawn reading): a verdict chosen
  // after it has passed is never claimed (design.md §15.5.3 step 3).
  return overTime() ? incomplete : judged;
} // End of function readName()
