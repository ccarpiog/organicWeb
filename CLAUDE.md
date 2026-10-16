# organicWeb — Química orgánica para ESO

Static web app: draw an acyclic hydrocarbon or a hydrocarbon with one ring (or a halogen derivative, alcohol, aldehyde, ketone, carboxylic acid, ether, ester, amine, amide or nitrile of one; an ester may have a ring on each side; a benzene may carry two to six substituents), get its IUPAC name in Spanish with
a step-by-step explanation, and optionally redraw it so the main chain is clear.

- **User-facing text: Spanish (Spain), ESO level.** Code, comments and docs: English.
- **Nomenclature: IUPAC 2013 recommendations** (longest chain first, then
  unsaturation; `hex-2-eno` style). Full rules and decisions: `docs/design.md`.
- User decision: the `–CH(CH₃)₂` group is named `isopropil` by default; the
  app also shows the `propan-2-il` (IUPAC preferred) and `1-metiletil` forms.
- Scope: v1 (acyclic hydrocarbons), v2 (rings and functional groups, ESO +
  1º Bachillerato, `docs/design.md` §13, phases I-21…I-41) and v3
  (polysubstituted benzenes, §14, phases I-42a…I-46) are all done —
  benzenes with two to six branch, halogen or alkoxy prefixes are named, also
  beside one or several identical principal groups on the ring — OH, amine,
  –COOH, –CHO, –C≡N or amide — with junior groups as prefixes (`4-metilfenol`,
  `4-metilbencen-1-amina`, `ácido 4-hidroxibenzoico`, `3-cianobenzamida`,
  `3-etilbenceno-1,2-diol`, `ácido benceno-1,3-dicarboxílico`), and such a
  benzene with prefixes is also a substituted phenyl, phenoxy or benzoyl
  prefix of a chain parent (`1-(4-metilfenil)etan-1-ona`,
  `2-(4-metilfenoxi)etan-1-ol`, `ácido 2-(4-metilbenzoil)butanoico`) or
  either ring of an ester (`4-metilbenzoato de etilo`, `etanoato de
  4-metilfenilo`, `4-metilbenzoato de 4-clorofenilo`).
  v4 (name → drawing, «¿Cómo se dibuja?», §15, phases I-47a…I-53b) is
  done: the student builds a name from tiles, the app draws it and judges
  it. Engine: pure modules in `src/reverse/` — `tiles.js` (catalogue from
  the lexicon), `parse.js`, `assemble.js`, `tokenize.js`, `interpret.js`,
  `build.js`, `search.js` (left-out locants, with a budget) and
  `readName()` in `index.js`; `diagnose.js` names the main mistake of an
  `otherName` verdict and the explanation step «Ver el paso» opens. Dialog:
  `src/ui/name-builder.js` + DOM-free `name-builder-state.js`; «Dibujar»:
  `src/ui/draw-name.js` + `results.js` `showVerdict()` (ordered drawing,
  verdict block, the student's chain striped beside the parent). It reads
  every family the forward engine names: hydrocarbons (chains, compound
  branches, `ciclo`, `benceno`, `fenil`, old-style locants), halogens,
  alcohols and phenols, ethers (alkoxy prefixes, class names), aldehydes,
  ketones and acyl prefixes, acids, esters (and ester prefixes), nitriles,
  amines (`N`, `amino`, class names) and amides (`carbamoil`, acylamino),
  with the retained names and the o/m/p letters. Verdicts: correct,
  alternative, missingLocants, otherName (with its diagnosis), ambiguous,
  incomplete, invalid (wrong tiles marked) and outOfScope. The closed loop
  `tests/unit/reverse-closed-loop.test.js` reads back every form the
  forward engine writes for every generator and fixture (pins asserted).
  Spanish wording pending teacher review: `docs/teacher-review-v4.md`;
  open user questions: `docs/open-questions.md`. I-54, o/m/p letters for
  two different prefixes on plain `benceno`
  (`autoclaude/processed/240-omp-two-different-groups.md`): the drawing →
  name half (I-54a) is done — `1-cloro-3-etilbenceno` lists
  `m-cloroetilbenceno` under «Otras formas válidas», one form per prefix
  style (`aromatic.js` `positionalParts()`), and the explanation says why
  the numbers are recommended; OPSIN reads `p-clorometilbenceno`-type forms
  as one substituted group, a known disagreement recorded in
  `scripts/oracle/README.md`. Next: the name → drawing half (I-54b), whose
  reader still refuses these letters (`parse.js` `checkLetters()`; pinned in
  the closed loop).
  Out of scope: stereo (E/Z, cis/trans, R/S), charges, salts, heterocycles,
  polycycles, and benzenes with functional groups on the ring and on a side
  chain (or on two side chains) or an ester beside another ring group.
  Systematic name first; traditional names and the old orto/meta/para forms
  go under "Otras formas válidas".
- Tech: vanilla JavaScript ES modules, no framework, no runtime dependencies.
  Tests: `npm test` (`node --test`), static checks: `npm run check`,
  end-to-end: `npm run e2e` (Playwright; runs every spec on the dev server
  and on `dist/index.html` via `file://`), OPSIN cross-check (dev only, needs
  Java): `npm run oracle` (`scripts/oracle/README.md`). Dev server: `npm run serve`.
  Single-file build: `npm run build` → `dist/index.html`. Deployment to
  Fastmail Files: `npm run deploy` — a manual user step; agents may only run
  it with `--dry-run` (README "Deployment", design §10.1).
- The naming engine (`src/naming/`) is pure: it never reads atom coordinates or the DOM.
- Never use `alert`/`confirm`/`prompt`; use in-page dialogs.
- Work is planned in `docs/design.md` and delivered through the autoclaude inbox
  (`autoclaude/inbox/`).
