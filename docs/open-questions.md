# Open questions for the user

This file lists, in one place, every question that waits for a decision from you (the project owner). It does not cover
work an agent can do alone. To answer, reply with the question number and the option you choose (for example «Q5 a»), or
give your own answer. An answered question is removed from this file, and the decision goes into `docs/design.md` or the
archive of the phase that carries it out. Spanish wording that only needs a teacher's review is in
`docs/teacher-review-v4.md`, not here.

## Summary

| Q | Topic | Area | Source phase |
|---|---|---|---|
| Q1 | Commit `docs/design.md` §15 and the Codex plan review | Project / documentation | v4 plan (2026-10-14), I-53b, I-54 |
| Q2 | Size of the closed loop against `npm test` time | Project / tests | I-53a |
| Q3 | Stepper and ordered drawing in the student's prefix style | Results panel | I-49b |
| Q4 | Announce a class name on a `correct` verdict | Results panel | I-52c3, I-52c4b |
| Q5 | `ditert-butil éter` without the hyphen | Forward-engine spelling | I-51b2, I-53a |
| Q6 | `bis-tert-butoxi` vs `di-tert-butoxi` | Forward-engine spelling | I-51b1, I-51b2 |
| Q7 | Hyphen before the bracket: `bis-(tert-butoxicarbonil)` | Forward-engine spelling | I-52a2b, I-52c2 |
| Q8 | `butiltert-butilamina` | Forward-engine spelling | I-52c3 |
| Q9 | `tridecilamina` for N(C₁₀H₂₁)₃ | Forward-engine spelling | I-52c3, I-53a |
| Q10 | «y» before «i» in an ester's O-bound groups | Forward-engine spelling | I-52a3b |
| Q11 | `alcohol bencílico` cannot be built from tiles | Reverse-engine coverage | I-52c3, I-53a |
| Q12 | A prefix style the engine does not write there (retained words first) | Diagnosis approach | I-52a2a … I-52d4 |
| Q13 | The ring-numbering message may change the branch's style | Diagnosis approach | I-51c3b2 |
| Q14 | Hints that cite substituted-phenyl prefixes the engine never writes | Diagnosis / hint approach | I-52d2 |
| Q15 | «Reconoce el éter» says an ether «nunca va al final del nombre» | Explanation wording approach | I-51b2 |
| Q16 | `p-clorometilbenceno` reads as `(clorometil)benceno` to OPSIN | Forward-engine spelling | I-54a |

## Q1 — Commit `docs/design.md` §15 and the Codex plan review

**Question.** The v4 plan (design.md §15, about 370 added lines) and `docs/reviews/v4-plan-codex.md` have been uncommitted
changes in your working tree since 2026-10-14. Phases read them but may not edit, commit or revert them. Will you commit them,
and who should then make the design.md updates that are waiting?

**Current behaviour.** In the §15.8 table, R-1a…R-7 still say «Pending», although R-1a…R-7a are done. PROGRESS.md tracks
their status instead. The design.md cleanup planned for I-53b is written down in the I-53b archive and not applied. I-54
(o/m/p letters for two different prefixes on `benceno`, your decision of 2026-10-15) reverses design.md §14.4: I-54a wrote
its §14 edits (§14.4, the explanation paragraph, the pending-review note) in `docs/progress-archive/i-54a.md` and did not
apply them; the §15 R-4 row and its o/m/p notes are I-54b's. Both records are blocked for the same reason.

**Options.**
- (a) Commit both files as they are, yourself or by asking an agent to commit them by explicit path. The next phase then
  updates the §15.8 Status column and applies the I-53b cleanup notes, and I-54 edits §14.4, §14.1 and §15 directly.
- (b) Make those design.md edits yourself, from the notes in the I-53b archive and in
  `autoclaude/processed/240-omp-two-different-groups.md`, then commit.
- (c) Leave both files uncommitted. Phases keep recording the design.md edits they intend in their archives, and I-54 records
  the decision change in its own archive and flags it.

**Where the code would change.** No code. Only `docs/design.md` (the §15.8 table, §14.4, §14.1, the §15 R-4 row) and the
PROGRESS.md *Open risks* entry «design.md §15 uncommitted».

**Source.** PROGRESS.md *Open risks* («design.md §15 uncommitted») and *Inbox* (pickup 12);
`autoclaude/processed/240-omp-two-different-groups.md` «How to take this item»; every v4 archive's note «design.md
§15.8's Status column is not updated».

## Q2 — Size of the closed loop against `npm test` time

**Question.** The closed loop of I-53a reads back every name the forward engine writes. It made `npm test` the slowest it has
been. Is the coverage worth the time?

**Current behaviour.** `tests/unit/reverse-closed-loop.test.js` runs 27 generators of 1200 molecules each (seeds 7101…7126),
plus every row of `names.tsv` and 8 REACH molecules: 30 899 molecules and 37 581 names. The file takes about 41 s alone.
`npm test` wall time went from 52 s to 79 s.

**Options.**
- (a) Keep 1200 per generator.
- (b) Lower `count` in `GENERATORS`, for example to 400, and the `{molecules, names}` floors on each row with it.
- (c) Keep the size, but run this file outside `npm test`, as an npm script of its own run before each commit.

**Where the code would change.** `tests/unit/reverse-closed-loop.test.js` `GENERATORS` (its counts and floors). For (c), also
`package.json` scripts and the README test section.

**Source.** I-53a (`docs/progress-archive/i-53a.md` «Open questions for the user» 5); PROGRESS.md *Open risks* I-53a.

## Q3 — Stepper and ordered drawing in the student's prefix style

**Question.** Take an `otherName` verdict with a diagnosis, where the student wrote a branch in another prefix style
(`propan-2-il` rather than `isopropil`). Today both «Ver paso a paso» and «Ver el paso» explain the naming in the student's
style. As a result, the ordered drawing's locants follow that naming even while the stepper is closed. Keep this?

**Current behaviour.** `6-metil-4-(propan-2-il)nonano` gets a NUMBERING diagnosis, and «Se llama» says
`4-isopropil-6-metilnonano`. A line before the diagnosis says «Con las ramas escritas como en tu nombre, se escribe
«4-metil-6-(propan-2-il)nonano» (…). El paso a paso usa ese nombre.». The canvas is numbered as
`4-metil-6-(propan-2-il)nonano`, with the methyl at 4, while «Se llama» has the isopropyl at 4. What this gains: the canvas
never backs the student's numbering, and it agrees with the steps.

**Options.**
- (a) Keep the current behaviour (decided by I-49b, open to your preference).
- (b) While the stepper is closed, the ordered drawing follows «Se llama» (the default style). It switches to the
  student's-style naming when the stepper opens.
- (c) Explain in the default style everywhere. The I-49a review found that this makes the numbering step endorse the
  student's numbering (`6-metil-4-(propan-2-il)nonano`), which is why the current design exists.

**Where the code would change.** `src/ui/results.js` `verdictExplanation()` and `showVerdict()` (the ordered marks);
`src/ui/draw-name.js` `verdictEntries()` and `styleLine()`; `src/reverse/diagnose.js` `diagnosisExplanation()`. Tests:
`tests/unit/draw-name.test.js`, `tests/unit/highlights.test.js`, `tests/e2e/diagnosis.spec.js`.

**Source.** I-49b (`i-49b.md` Decisions, «Student's prefix style»); I-49a review fix 3 (`i-49a.md`); PROGRESS.md *Open
risks*, first item.

## Q4 — Announce a class name on a `correct` verdict

**Question.** A `correct` verdict already announces a traditional name («También se llama «acetona» …»). Should it also
announce the molecule's amine or ether class name?

**Current behaviour.** `propanona` → «¡Correcto! También se llama «acetona» (nombre tradicional, que la IUPAC (2013)
acepta).». But `metanamina` → «¡Correcto!» only, and `etoxietano` → «¡Correcto!» only, although «Otras formas válidas» lists
`metilamina` and `dietil éter`. Only alternatives of style `traditional` are announced. The amine class name's own label
calls it «nombre tradicional (los grupos unidos al nitrógeno y la palabra «amina»), muy usado en los libros».

**Options.**
- (a) Keep the current behaviour.
- (b) Announce amine class names (`amineClass`) only.
- (c) Announce both amine and ether class names (`amineClass`, `functionalClass`).

**Where the code would change.** `src/reverse/index.js` `TRADITIONAL_STYLES` and the `correct` message built from it in
`readName()`. Tests: `tests/unit/reverse-amine-classes.test.js` asserts that `metanamina` says nothing more. No ether or
e2e test pins the bare «¡Correcto!» on a substitutive ether name.

**Source.** I-52c3 (`i-52c3.md` «Deviations / open questions»), I-52c4b; PROGRESS.md *Open risks* I-52c1…I-52c4b (3).

## Q5 — `ditert-butil éter` without the hyphen

**Question.** Should the forward engine write the di-tert-butyl ether's class name as `di-tert-butil éter`?

**Current behaviour.** `etherClassAlternative()` writes `di` + `tert-butil` with no hyphen: `ditert-butil éter`, for the
molecule whose first name is `2-tert-butoxi-2-metilpropano`. Everywhere else the engine writes that hyphen (`di-tert-butil`,
`di-tert-butilamina`). With tiles a student gets `di-tert-butil éter`, which reads as `otherName` «…se llama
«2-tert-butoxi-2-metilpropano»» with no diagnosis. The engine's own form cannot be built from tiles (pinned).

**Options.**
- (a) Add the hyphen, as `amineClassName()` does. Recommended by the archives, which call this a forward-engine bug.
- (b) Keep the current spelling.

**Where the code would change.** `src/naming/index.js` `etherClassAlternative()`. `tests/unit/reverse-closed-loop.test.js`
`PINS['ditert-butil éter']` would be removed, and its REACH molecule then reads back. The reverse engine already assembles
the hyphenated form, so it needs no change.

**Source.** I-51b2 (`i-51b2.md` «Deviations / open risks»); I-53a (`i-53a.md` «Open questions» 1); PROGRESS.md *Open risks*
I-51b1/I-51b2 (1).

## Q6 — `bis-tert-butoxi` vs `di-tert-butoxi`

**Question.** The forward engine treats `tert-butoxi` as a compound prefix and multiplies it with `bis`. IUPAC usage, from
memory, treats it as simple: `di-tert-butoxi`, like `diisopropoxi` and `di-tert-butil`. Change it?

**Current behaviour.** The engine writes `1,6-bis-tert-butoxihexano` and `2,2-bis-tert-butoxipropan-1-ol`. The reverse engine
follows it, so a student's `1,6-di-tert-butoxihexano` is `otherName` with the ALKOXY_MULTIPLIER diagnosis: «…«tert-butoxi» se
cuenta como un prefijo compuesto, porque su forma sistemática, «1,1-dimetiletoxi», lleva sus propias ramas; delante va «bis»,
«tris»…: «1,6-bis-tert-butoxi», no «1,6-di-tert-butoxi».». In other words, the app currently teaches the `bis` form.

**Options.**
- (a) Write `di-tert-butoxi`.
- (b) Keep `bis-tert-butoxi`.

**Where the code would change.** `src/naming/render.js` `isCompoundPrefix()` (its alkoxy branch). In the reverse engine,
remove `COMPOUND_RETAINED_ALKOXY` (`src/reverse/assemble.js`) and the `tertButoxy` variant of ALKOXY_MULTIPLIER
(`src/reverse/diagnose.js`). Tests: `reverse-ethers`, `reverse-diagnose-ethers`, the REACH entry of the closed loop. No
`names.tsv` row has the form.

**Source.** I-51b1 (`i-51b1.md` «Deviations / open risks»), I-51b2; I-53a «Open questions» 4; PROGRESS.md *Open risks*
I-51b1/I-51b2 (3).

## Q7 — Hyphen before the bracket: `bis-(tert-butoxicarbonil)`

**Question.** The forward engine puts a hyphen between a multiplier and an italic descriptor even when a bracket stands
between them. IUPAC usage, from memory, writes `bis(tert-butoxicarbonil)`. Change it?

**Current behaviour.** The engine writes `ácido 3,3-bis-(tert-butoxicarbonil)hexanodioico` and
`2,2-bis-(tert-butilamino)etan-1-ol`. The reverse assembler writes the same hyphen automatically, so a student cannot write
`bis(tert-…)`, and the hyphenated name reads as `correct`.

**Options.**
- (a) A hyphen only when the descriptor follows the multiplier directly (`di-tert-butil`), none before a bracket.
- (b) Keep the hyphen.

**Where the code would change.** `src/naming/render.js` `groupTokens()` (the hyphen added when `words[0].kind === 'italic'`).
In the reverse engine, the matching automatic-hyphen rule in `src/reverse/assemble.js` (rule 5) and the tokenizer. Tests:
`reverse-ester-prefixes`, `reverse-amino`, the closed-loop REACH entry.

**Source.** I-52a2b (`i-52a2b.md` «Deviations / open risks»); I-52c2 (`2,2-bis-(tert-butilamino)etan-1-ol`); I-53a «Open
questions» 4; PROGRESS.md *Open risks* I-51d1…I-52a2b (2).

## Q8 — `butiltert-butilamina`

**Question.** In the amine class name of N-tert-butylbutylamine, the groups run together: `butiltert-butilamina`. Should they
be separated?

**Current behaviour.** `amineClassName()` concatenates the groups. `tert-butil` sorts by «butil», and the plain name goes
first on a tie, so only `butil` can stand before it (otherwise `tert-butiletilamina`). The engine lists `butiltert-butilamina`
as an alternative of `N-tert-butilbutan-1-amina`. The reverse engine follows: from tiles it reads as `alternative`, and
CLASS_ORDER quotes it for `tert-butilbutilamina`. Ether class names are not affected: their groups are separated by spaces
(`butil tert-butil éter`).

**Options.**
- (a) Enclose the second group: `butil(tert-butil)amina`, the usage cited from memory.
- (b) Add a hyphen: `butil-tert-butilamina`.
- (c) Keep the current spelling.

**Where the code would change.** `src/naming/index.js` `amineClassName()`; the class-name assembly in
`src/reverse/assemble.js`, plus the parser and tokenizer for (a); CLASS_ORDER's quote in `src/reverse/diagnose.js`. Tests:
`tests/unit/reverse-amine-classes.test.js`, the closed-loop REACH entry.

**Source.** I-52c3 (`i-52c3.md` «Deviations / open questions»); I-53a «Open questions» 4; PROGRESS.md *Open risks*
I-52c1…I-52c4b (1).

## Q9 — `tridecilamina` for N(C₁₀H₂₁)₃

**Question.** The class name of tridecylamine N(C₁₀H₂₁)₃ is `tri` + `decil` + `amina`. That is the same text as the class
name of tridecan-1-amina (`tridecil` + `amina`). Change it?

**Current behaviour.** The engine lists `tridecilamina` for both molecules. In the dialog each tile sequence means only one
thing: `tri dec il amina` builds N(C₁₀H₂₁)₃ and `tridec il amina` builds the C₁₃ amine, both read as `alternative`. As a text,
though, the name is ambiguous: `tokenize()` returns null for it (pinned twice in REACH). This is the only such collision the
archives found. Amines have at most three groups, and the only multiplier + root pair that collides is `tri` + `decil`.

**Options.**
- (a) Write `tris(decil)amina` (or `tri(decil)amina`) for N(C₁₀H₂₁)₃, the usage cited from memory. The reverse engine would
  then need enclosed groups in an amine class name.
- (b) Offer no class name when its text would also name another molecule.
- (c) Keep the current name (pinned).

**Where the code would change.** `src/naming/index.js` `amineClassName()`; for (a), also the class-name reading in
`src/reverse/parse.js` and `assemble.js`. Tests: `tests/unit/reverse-closed-loop.test.js` `PINS.tridecilamina`, and the
tokenize review-fix test in `tests/unit/reverse-amine-classes.test.js`.

**Source.** I-52c3 (`i-52c3.md` Review); I-53a (`i-53a.md` «Open questions» 2); PROGRESS.md *Open risks* I-52c1…I-52c4b (2).

## Q10 — «y» before «i» in an ester's O-bound groups

**Question.** The forward engine always joins two different O-bound groups with «y», but Spanish writes «e» before a word
that starts with the sound /i/: `etilo e isopropilo`. Change it?

**Current behaviour.** The engine writes `propanodioato de etilo y isopropilo` (lexicon `ESTER_ALKYL_JOIN = ' y '`). The
reverse assembler writes the same « y » automatically, so the name reads as `correct`, and a student cannot write « e ». No
`names.tsv` row is affected.

**Options.**
- (a) Write «e» before a group that starts with «i» or «hi» (in practice `isopropilo`).
- (b) Keep «y».

**Where the code would change.** `src/naming/lexicon.es.js` `ESTER_ALKYL_JOIN` (it would depend on the next group) and
`src/naming/render.js` `esterAlkylParts()`. In the reverse engine: the automatic join in `src/reverse/assemble.js`,
`ESTER_WORDS` in `tokenize.js`, and the `and` phrase in `diagnose.js`. Tests: the closed-loop REACH entry and the ester
suites.

**Source.** I-52a3b (`i-52a3b.md` «Deviations / open risks»); I-53a «Open questions» 4; PROGRESS.md *Open risks* I-52a3b.

## Q11 — `alcohol bencílico` cannot be built from tiles

**Question.** The engine offers `alcohol bencílico` as a traditional name, but the tiles cannot write it, because no tile
gives the class word «alcohol». Should a later phase make it readable, or should it stay unread?

**Current behaviour.** `fenilmetanol` → «¡Correcto! También se llama «alcohol bencílico» (nombre tradicional, que la IUPAC
(2013) acepta).». So the app suggests a name the student cannot then build. The closed loop pins it as `noTiles`: once in
`generateRingSubstituents`, once at `names.tsv:771`, once in REACH. No planned phase covers it.

**Options.**
- (a) Keep it unread (the pin stays).
- (b) Add one whole-word tile, `alcohol bencílico`, to «Nombres tradicionales», for the bare molecule only, like
  `bencilamina`.
- (c) Add a class word `alcohol` with adjective tiles. This only makes sense if the forward engine also learns other
  `alcohol …` names; today it writes no other.

**Where the code would change.** `src/reverse/tiles.js` (`TEMPLATES`, the «Nombres tradicionales» row) and the tokenizer
(a two-word name). `tests/unit/reverse-closed-loop.test.js` `PINS['alcohol bencílico']` would be removed. Also the
names `tests/unit/reverse-alcohols.test.js` leaves for later phases (around lines 51, 630 and 756), the helper note in
`tests/unit/reverse-words.js`, and the Ayuda alcohol line in `index.html`.

**Source.** I-52c3 (`i-52c3.md` «Deviations / open questions»); I-53a (`i-53a.md` «Open questions» 3); PROGRESS.md *Open
risks* I-53a.

## Q12 — A prefix style the engine does not write there (retained words first)

**Question.** Some names differ from the engine's only by a prefix style the engine never writes in that place. The main
case is a retained word with its prefix in the IUPAC-preferred `propan-2-il` style. What should the student be told? The
plan is one message shared by every family, and it waits for your wording.

**Current behaviour.** These names read as `otherName` («…pero se llama «…»») with no diagnosis, so there is no message and
no «Ver el paso»:
- Retained words: `2-[4-(propan-2-il)fenil]acetato de metilo`, `2-[4-(propan-2-il)fenil]acetaldehído`, `ácido
  4-(propan-2-il)ftálico`, `4-(propan-2-il)ftalaldehído`, `4-(propan-2-il)ftalonitrilo` (Codex's I-52b2 should-fix),
  `4-(propan-2-il)anilina`, `N-(propan-2-il)acetamida`, `4-(propan-2-il)ftalamida`.

  The engine writes its retained names in the default style only. For example, `4-isopropilftalonitrilo` reads as
  `alternative`, while systematic names get all three styles.
- Related nulls, which I-52d1 counts as part of this question:
  - A style the engine never offers, such as `(1,1-dimetiletil)` for tert-butyl: `ácido
    3-[(1,1-dimetiletoxi)carbonil]pentanodioico`, `2-[4-(1,1-dimetiletil)fenil]propanal`. Only isopropyl has style
    alternatives (`STYLE_DEPENDENT_PREFIXES`).
  - The systematic benzene form in the pin style: `N-(propan-2-il)bencenocarboxamida`.
  - Two styles mixed in one name: `1-tert-butil-4-(1-metiletil)benceno`, `pentanodioato de isopropilo y
    4-(propan-2-il)fenilo`.

**Options.**
- (a) One new diagnosis message for retained words only, in your wording. The archives propose no Spanish text.
- (b) The same message, extended to every style the engine does not write in that place: the retained words, the styles
  never offered, and mixed styles.
- (c) Make the forward engine write its retained names in every prefix style. `4-(propan-2-il)ftalonitrilo` would then be
  an `alternative` and need no message. «Otras formas válidas» would grow, and the fixtures would change.
- (d) Keep the null; the verdict still gives the engine's name.

**Where the code would change.**
- (a)/(b): a new code in `src/reverse/diagnose.js`, checked after the family checks. Pinned nulls would flip in
  `tests/unit/reverse-amide-templates.test.js` (NULLS, 4 `style` rows), `tests/unit/reverse-amine-templates.test.js` (NULLS,
  `4 prop ano 2 il anilina`) and `tests/unit/reverse-ester-templates.test.js` (three names, around line 583). For (b), also
  the tert-butyl case in `tests/unit/reverse-diagnose-carbonyls.test.js` (around line 608).
- (c): `src/naming/index.js` (traditional alternatives built in the default style only), the `names.tsv` alternative lists,
  and the closed-loop floors.

**Source.** I-52a2a (first recorded); I-52b2 (`docs/reviews/I-52b2.md` should-fix, `i-52b2.md` Review); I-52a2b, I-52a3b,
I-52c3, I-52c4b, I-52d1, I-52d3, I-52d4; PROGRESS.md *Open risks* I-51d1…I-52a2b (1).

## Q13 — The ring-numbering message may change the branch's style

**Question.** BRANCH_RING_NUMBERING (a ring branch numbered otherwise) quotes the engine's form of the whole prefix. When
the student wrote a group inside it in a style the engine does not offer, that quote also changes the style, without saying
so. Is this acceptable?

**Current behaviour.**
- When the style is offered, the quote keeps it: `2-[5-(propan-2-il)fenil]etan-1-ol` → «…«3-(propan-2-il)fenil», no
  «5-(propan-2-il)fenil».».
- When it is not offered, the quote changes it: `2-[5-(1,1-dimetiletil)fenil]etan-1-ol` → «…«3-tert-butilfenil», no
  «5-(1,1-dimetiletil)fenil».».
- Numbered right, `2-[3-(1,1-dimetiletil)fenil]etan-1-ol` gets no diagnosis at all (the Q12 null).

**Options.**
- (a) Keep the current message.
- (b) Add a short clause when the quoted words change style, saying that the app writes that branch as «tert-butil». If Q12
  brings a style message, this clause could reuse it.
- (c) Quote only the locant change, in the student's words («3-(1,1-dimetiletil)fenil»). That is a form the engine never
  writes, so the message would endorse a spelling the app does not accept as `alternative`.

**Where the code would change.** `src/reverse/diagnose.js` BRANCH_RING_NUMBERING (`branchRingNumbering()` and its
`DIAGNOSIS_TEXTS` entry). Tests: `tests/unit/reverse-diagnose-carbonyls.test.js`. No test pins the style-change case today.

**Source.** I-51c3b2 (`i-51c3b2.md` Decisions, «Ring numbering compared on the molecule»); PROGRESS.md *Open risks*
I-51c1…I-51c3b2.

## Q14 — Hints that cite substituted-phenyl prefixes the engine never writes

**Question.** Some TILE_ORDER hints show the student how to write a group on a phenyl branch, with an example like
`(4-cianofenil)`. The forward engine never writes such a prefix. Should these hints change, as the `benzamida` hint did in
I-52d2?

**Current behaviour.** These hints appear when a ring word is used inside a branch:
- `fenol` → «(4-hidroxifenil)»
- `benzaldehído` → «(4-formilfenil)»
- `ácido benzoico` → «(4-carboxifenil)»
- `benzonitrilo` → «(4-cianofenil)»
- `templateHint()` for the retained phenols, acids, amines («(4-aminofenil)»), nitriles and carbonyls

A student who follows them gets one of two results:
- Beside another functional group, `outOfScope`, because a benzene with groups on the ring and on a side chain is refused:
  `ácido 2-(4-cianofenil)etanoico`, `(4-cianofenil)metanol`.
- On a hydrocarbon chain, `otherName` with the ring as the parent: `1-(4-cianofenil)propano` → «4-propilbenzonitrilo».

Since I-52d2, `benzamideBranch` cites a ring the engine does name in a branch, `(4-carbamoilciclohexil)`, and adds «de
momento no sé nombrar una rama con un benceno que lleve un grupo amida».

**Options.**
- (a) Change the earlier hints the same way `benzamideBranch` changed.
- (b) Keep them as they are. The example still shows how the group is written as a prefix.
- (c) Keep the phenyl example and add the «de momento no sé…» clause.

**Where the code would change.** `src/reverse/parse.js`: `HINTS` (`phenolBranch`, `benzaldehydeBranch`, `benzoicBranch`,
`benzonitrileBranch`), `templateHint()`, and the `EXAMPLES` entries `hidroxifenil`, `formilfenil`, `carboxifenil`,
`cianofenil`, `aminofenil`. Also the family tests that assert those hint texts, and a check that each cited example reads,
like the one in `tests/unit/reverse-amide-prefixes.test.js` (around line 252).

**Source.** I-52d2 (`i-52d2.md` «Open questions / deviations»: «for the user / teacher to decide»); PROGRESS.md *Open risks*
I-52d1…I-52d4.

## Q15 — «Reconoce el éter» says an ether «nunca va al final del nombre»

**Question.** The forward explanation tells every student that an ether never goes at the end of the name. That is true of
the substitutive name only: the class name ends in «éter». Should the step be qualified?

**Current behaviour.** `src/explain/explain.js` `etherStep()` says: «Un éter nunca es el grupo principal y nunca va al final
del nombre: se nombra con un prefijo acabado en «-oxi»…». It says this for every ether, including those whose class name
(`dietil éter`) is listed under «Otras formas válidas» and read by «¿Cómo se dibuja?». In the reverse diagnosis, the
diagnosis-only step «Monta el nombre con «éter»» (CLASS_NAME_STEP, added in the I-51b2 review) already says «nunca va al
final» of the substitutive name only. explain() itself has no class-name path.

**Options.**
- (a) Qualify the sentence for every ether («en el nombre sustitutivo…»).
- (b) Qualify it, and add one sentence about the class name, only when the molecule has an ether class-name alternative.
- (c) Keep the sentence: the stepper explains the substitutive name, and the reverse's class-name step covers the other
  form.

**Where the code would change.** `src/explain/explain.js` `etherStep()`; `tests/fixtures/explain-snapshots.json` and
`tests/unit/explain.test.js`; possibly the contrast in `CLASS_NAME_STEP_TEXTS` (`src/reverse/diagnose.js`) and its test in
`tests/unit/reverse-diagnose-ethers.test.js`.

**Source.** I-51b2 (`i-51b2.md` Review fixes: «a forward wording question, left to the user»); PROGRESS.md *Open risks*
I-51b1/I-51b2 (2).

## Q16 — `p-clorometilbenceno` reads as `(clorometil)benceno` to OPSIN

**Question.** The orto/meta/para form of two different prefixes on plain benzene (I-54a) writes the two prefixes one after
the other, as the item you approved asks (`p-clorometilbenceno`). OPSIN, the oracle's name-to-structure program, reads a
halogen or an alkoxy prefix followed by an unbracketed chain prefix as one substituted group: `p-chloromethylbenzene` →
`(chloromethyl)benzene`, `p-(ethoxy)methylbenzene` → `(ethoxymethyl)benzene`. Keep the form, or bracket the second prefix?

**Current behaviour.** `src/naming/aromatic.js` `positionalParts()` writes `p-clorometilbenceno`, `m-cloroetilbenceno`,
`p-(etoxi)metilbenceno` under «Otras formas válidas»; the «Numera el anillo» step warns that the letter form can be read as
one group. `npm run oracle` now exits 1 on every seed: each failure is this class, labelled «known» only when OPSIN's
structure is that isomer (`isKnownDisagreement()` in `scripts/oracle/run.mjs`, README «Known disagreements»).

**Options.**
- (a) Keep the form you chose (the ambiguity is the one the explanation names); the oracle keeps exiting 1 with the known
  label.
- (b) Bracket a chain prefix that follows a halogen or alkoxy prefix (`p-cloro(metil)benceno`, `p-(etoxi)(metil)benceno`),
  which OPSIN reads as two ring prefixes; the oracle would exit 0 again.
- (c) Drop the letter form for exactly those cases (halogen or alkoxy before an unbracketed chain prefix).

**Where the code would change.** `src/naming/aromatic.js` `positionalParts()`; `tests/fixtures/names.tsv` and
`tests/unit/polysubstituted-benzenes.test.js`; `src/explain/explain.js` `twoPrefixLetterSentence()`; the reverse reader of
I-54b (`src/reverse/parse.js` `checkLetters()`) and its tests; `scripts/oracle/run.mjs`, `README.md`,
`tests/unit/oracle.test.js`.

**Source.** I-54a (`docs/progress-archive/i-54a.md`, worker report and Codex review `docs/reviews/I-54a.md`).
