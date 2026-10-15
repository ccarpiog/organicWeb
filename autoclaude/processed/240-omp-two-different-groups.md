# orto/meta/para for two different groups on benzene (user decision, 2026-10-15)

User request (2026-10-15): add the orto/meta/para naming of a benzene with
two **different** groups in both directions — drawing → name (the engine,
«Otras formas válidas») and name → drawing («¿Cómo se dibuja?»). This
reverses the app decision of design.md §14.4 "Never for two different
prefixes on plain benzene (`m-cloroetilbenceno` reads like a substituted
ethyl)" and the matching R-4c refusal (`src/reverse/parse.js`
`checkLetters()`, POSITIONAL message `different`).

## User decisions (final)

- **Scope: only two different prefixes on a plain `benceno` parent.** The
  user was offered and did not choose the full words `orto-` / `meta-` /
  `para-`, two identical principal groups (`p-bencenodiol`) and o/m/p
  inside other names (substituted phenyl branches, an ester's O-bound
  phenyl): those stay as §14.4 says.
- **Order: after v4.** Queue this after the last remaining v4 phase (the
  R-7 wrap-up); do not interrupt or reorder v4.

## The rule (drafted for the user; app decisions the phase may refine with evidence)

- **When:** the parent is plain `benceno` (no principal group, no retained
  parent), exactly two ring positions are occupied, by two different
  prefixes, each cited once. Every prefix a benzene parent takes counts:
  hydrocarbon branches (any branching), halogens, alkoxy. Unchanged:
  three or more positions (none); identical prefixes (`o-dimetilbenceno`,
  done); a retained parent plus one prefix (`p-metilfenol`, done);
  `tolueno` and `anisol` stay unsubstituted (no `p-clorotolueno`,
  no `p-metilanisol`, §14.5).
- **Form:** the letter of the second locant, then the prefixes in the
  order of the name it is built on (alphabetical), with no locants or
  hyphens between them, then `benceno`:
  `1-cloro-3-etilbenceno` → `m-cloroetilbenceno`;
  `1-etil-3-metilbenceno` → `m-etilmetilbenceno`;
  `1-bromo-2-clorobenceno` → `o-bromoclorobenceno`;
  `1-cloro-4-metilbenceno` → `p-clorometilbenceno`;
  `1-metil-2-yodobenceno` → `o-metilyodobenceno`;
  `1-tert-butil-4-metilbenceno` → `p-tert-butilmetilbenceno`.
- **Enclosure:** prefixes written without locants beside another prefix
  follow the engine's existing crowded rule (`src/naming/render.js`
  `enclosedInName(substituent, crowded = true, first)`). An alkoxy prefix
  is enclosed: `1-metil-4-metoxibenceno` → `p-metil(metoxi)benceno`;
  `1-etoxi-4-metilbenceno` → `p-(etoxi)metilbenceno`. A prefix the main
  name already encloses stays enclosed:
  `1-metil-4-(propan-2-il)benceno` → `p-metil(propan-2-il)benceno`;
  `1-cloro-4-(clorometil)benceno` → `p-cloro(clorometil)benceno`. A plain
  alkyl is not enclosed: `p-clorometilbenceno` stays distinct from
  `(clorometil)benceno`, because the app always encloses a compound
  prefix. The explanation names the risk (below). The user saw
  `p-clorometilbenceno` as the example form and chose it.
- **One positional alternative per prefix style**, built on that style's
  name as today: `p-isopropilmetilbenceno` on the main name,
  `p-metil(propan-2-il)benceno` in the `pin` style. The reverse then finds
  each (`src/reverse/index.js` already matches the alternatives of every
  style, design.md §15.9 trap 8).
- **Label and place:** the existing `positional` style and label
  («forma antigua con orto/meta/para; hoy se recomienda el número…»),
  under «Otras formas válidas» where the identical-prefix form goes today.
  Its `parts` keep their atoms and bonds; the letter points at both ring
  carbons, as in the identical-prefix case, so the colour key and the
  highlights work.

## Drawing → name

- `src/naming/aromatic.js` `positionalParts()`: a new branch for the case
  above. Because the crowded enclosure changes the prefix tokens, render
  the prefixes again without locants; do not edit the main name's text.
  Keep it lexicon-agnostic: `scripts/oracle/run.mjs` calls it with English
  parts. Update its docstring and the one of `positionalAlternative()`.
- `src/explain/explain.js` `benzenePositionSentence()`: for two different
  prefixes, keep «"cloro" y "etil" están en posición meta (1,3)». Then add
  the old name and say why the numbers are recommended: the letter form
  writes the two groups one after the other, so it can be mistaken for one
  group (`m-cloroetilbenceno` against `(cloroetil)benceno`). ESO-level
  Spanish. Fix the docstring: "for two different prefixes it gives no
  orto/meta/para name at all".
- Ayuda `#help-omp` (`index.html`): add an example with two different
  groups (`1-cloro-3-etilbenceno` = `m-cloroetilbenceno`). Keep "Solo
  algunos nombres…", which still holds.
- Fixtures (`tests/fixtures/names.tsv`): the rows with two different
  prefixes on benzene (≈933–947: `1-bromo-3-clorobenceno`,
  `1-bromo-2-clorobenceno`, `1-metil-2-yodobenceno`,
  `1-metil-4-metoxibenceno`, `1-cloro-3-etilbenceno`,
  `1-isopropil-4-metilbenceno`, …; find them all) gain their
  `positional=…` alternatives. Their justifications lose "no orto/meta/para
  form for two different prefixes". Add rows for an enclosed alkoxy, an
  alkoxy cited first, a compound prefix, and a prefix style with its own
  positional form. Update the snapshots deliberately; no main name changes.
- Oracle: `run.mjs` checks positional forms through the English parts.
  English alphabetical order differs (`p-methoxymethylbenzene` against
  `p-metil(metoxi)benceno`), and OPSIN may refuse a form or read
  `p-chloromethylbenzene` as something else. Run it, and record real
  disagreements as known ones in `scripts/oracle/README.md`, as for other
  forms; never loosen the check.

## Name → drawing («¿Cómo se dibuja?»)

- `parse.js` `checkLetters()`: lift the `different` refusal for the case
  above. The letter goes before the first prefix, where the systematic
  name's first locant goes. These stay POSITIONAL errors, with a message
  saying where the letter goes (new wording):
  - a letter before the second prefix (`cloro-m-etilbenceno`);
  - a second letter;
  - a letter on one prefix and numbers on the other.

  Remove the `different` message, or reword it for whatever it still
  refuses.
- `interpret.js` / `search.js`: the letter supplies both prefixes'
  positions, one at 1 and the other at 2, 3 or 4, so nothing is searched.
  A name with no letter and no numbers (`clorometilbenceno`) keeps today's
  search verdict. If that message lists ways to complete the name, it
  mentions the letter too.
- Verdicts:
  - `alternative` when the assembly equals the engine's form, in any prefix
    style;
  - prefixes out of alphabetical order (`p-metilclorobenceno`) are
    `otherName`. `diagnose.js` names it with the existing alphabetical-order
    rule, worded for the letter form where needed;
  - the diagnosis «an o/m/p letter the app does not offer» no longer fires
    for this case.
- Ayuda «Del nombre al dibujo» rings line: the letters now also work with
  two different groups.

## Tests

- Round trip over the new fixture alternatives: the assembly equals the
  engine's text and the built graph equals the fixture's.
- The closed loop over generated benzenes includes the new form.
- Mutations:
  - the letter on the second prefix;
  - two letters;
  - a letter plus numbers;
  - three positions;
  - a letter on `tolueno`;
  - non-alphabetical order.
- One e2e per direction:
  - drawing `1-cloro-3-etilbenceno` lists `m-cloroetilbenceno` under
    «Otras formas válidas»;
  - the tiles `m` `cloro` `etil` `benceno` draw it with the `alternative`
    verdict.

## How to take this item

- Queue it after the last v4 phase. Most likely one phase; split it into
  the engine (drawing → name) and the reader (name → drawing) if it does
  not fit one session.
- Record the decision change where the old one is written:
  - design.md §14.4;
  - the §14.1 orto/meta/para row if it needs it;
  - the R-4 row and o/m/p notes of §15;
  - the CLAUDE.md scope line if it mentions it.
- Every output, fixture, snapshot and e2e stays green, except the intended
  additions to the alternative lists. Main names never change.
- All new Spanish wording is the app's own phrasing and stays pending
  teacher review (add it to the pending-review notes of §14 and §15).
