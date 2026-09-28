# organicWeb — Química orgánica

A static, offline web app for secondary-school students (ESO, Spain): draw an
acyclic hydrocarbon or a hydrocarbon with one ring (or a halogen derivative, alcohol, aldehyde, ketone or carboxylic acid of one) and get its IUPAC name **in Spanish**, with a
step-by-step explanation and a redraw that makes the main chain obvious. The
user interface is in Spanish; code and documentation are in English. The
design and phase plan live in [`docs/design.md`](docs/design.md).

## Features

- **Editor** (SVG, mouse, pen and touch): element palette (C, O, N, F,
  Cl, Br, I: place or change atoms; heteroatoms labelled `OH`, `NH₂`…), single/double/triple
  bonds (a single-bond drag draws a zig-zag chain with a live carbon
  counter), ring templates (Anillos, 3–8 carbons and a benzene hexagon with
  alternating double bonds: on empty space, hung from an atom or fused on a
  bond), Cambiar enlace, Borrar, Mover (marquee selection), undo/redo, Limpiar
  (with an in-page confirmation), pan (Space + drag, middle drag, two
  fingers) and zoom (wheel, pinch), Centrar, skeletal or condensed display,
  live molecular formula, keyboard shortcuts, and autosave in the browser.
- **Naming** of every valid acyclic hydrocarbon (alkanes, alkenes, alkynes;
  any branching; branched, unsaturated and nested substituents; doubly
  attached `-iliden` substituents) and of hydrocarbons with a single
  carbocycle of 3–30 carbons, with side chains and ring double or triple
  bonds (`ciclohexano`, `ciclohexa-1,3-dieno`, `3-metilciclohex-1-eno`,
  `metilidenciclohexano`…; the ring is always the parent chain), and of
  benzene and monosubstituted benzenes in either Kekulé drawing (`benceno`,
  `metilbenceno`, `etenilbenceno`, `isopropilbenceno`…; benzenes with two or
  more substituents get a clear refusal), and of their halogen derivatives
  (F, Cl, Br, I as prefixes: `clorometano`, `2-bromo-1-cloropropano`,
  `2-metil-4-yodopentano`, `clorociclohexano`, `clorobenceno`,
  `hexacloroetano`…), and of alcohols (OH groups as the suffix `-ol`:
  `etanol`, `propan-2-ol`, `prop-2-en-1-ol`, `etano-1,2-diol`,
  `2-(hidroximetil)propano-1,3-diol`, `2-cloroetan-1-ol`, `ciclohexanol`,
  `2-metilciclohexan-1-ol`, `fenol`…), and of aldehydes and ketones (C=O as
  the suffix `-al` / `-ona`, or the prefix `oxo-`: `metanal`, `etanal`,
  `butanodial`, `propanona`, `butan-2-ona`, `pentano-2,4-diona`,
  `4-oxopentanal`, `4-hidroxibutan-2-ona`, `ciclohexanona`…; on a ring
  `-carbaldehído`: `ciclohexanocarbaldehído`, `benzaldehído`), and of
  carboxylic acids (–COOH as `ácido …oico`: `ácido etanoico`,
  `ácido 2-metilpropanoico`, `ácido but-2-enoico`, `ácido butanodioico`,
  `ácido 4-oxopentanoico`, `ácido 2-hidroxipropanoico`…; on a ring
  `-carboxílico`: `ácido ciclohexanocarboxílico`, `ácido
  2-metilciclohexano-1-carboxílico`, `ácido ciclohexano-1,2-dicarboxílico`,
  `ácido benzoico`; a –COOH off the suffix as `carboxi-`: `ácido
  2-(carboximetil)ciclohexano-1-carboxílico`), and of ethers
  (the O and the other side as an `alcoxi-` prefix, the chain never
  running through the O: `metoxietano`, `etoxietano`, `1-isopropoxibutano`,
  `2-metoxietan-1-ol`, `ácido 2-metoxietanoico`, `metoxiciclohexano`,
  `metoxibenceno`…), and of esters (the acid part with `-oato` and the
  O-bound group as a separate word: `etanoato de metilo`, `propanoato de
  etilo`, `butanoato de isopropilo`, `2-metilpropanoato de tert-butilo`,
  `3-oxobutanoato de etilo`, `etanoato de 2-hidroxietilo`…; diesters on one
  chain: `butanodioato de dimetilo`, `propanodioato de etilo y metilo`;
  beside an acid the ester is a prefix: `ácido 4-metoxi-4-oxobutanoico`,
  `ácido 3-(metoxicarbonil)pentanodioico`, `ácido 2-(acetiloxi)etanoico`),
  and of amines
  (the N never in the chain, `-amina` with its locants, the other groups on
  the N as `N-` prefixes, `amino-` below a more senior group: `metanamina`,
  `propan-2-amina`, `butano-1,4-diamina`, `N-metiletanamina`,
  `N,N-dimetilmetanamina`, `N,2-dimetilpropan-1-amina`, `ciclohexanamina`,
  `bencenamina`, `2-aminoetan-1-ol`, `2-(dimetilamino)etan-1-ol`, `ácido
  2-aminopropanoico`…), and of amides (the C=O and the N one
  group, `-amida` with the amide carbon as carbon 1, the groups on the N as
  `N-` prefixes: `metanamida`, `etanamida`, `2-metilpropanamida`,
  `butanodiamida`, `prop-2-enamida`, `N-metiletanamida`,
  `N,N-dimetiletanamida`, `N-etil-N-metilpropanamida`, `4-oxopentanamida`,
  `2-aminopropanamida`…; beside an acid, an ester or another amide the
  amide is a prefix: `ácido 4-amino-4-oxobutanoico`, `ácido
  3-(metilcarbamoil)pentanodioico`, `ácido 2-(acetilamino)etanoico`,
  `2-(acetilamino)etanamida`; on a ring `-carboxamida`:
  `ciclohexanocarboxamida`, `N-metilciclohexanocarboxamida`, `benzamida`,
  `N-metilbenzamida`; a ring on the N: `N-feniletanamida`,
  `N-ciclohexiletanamida`), and of nitriles (the –C≡N one group,
  never an alkyne, `-nitrilo` with the nitrile carbon as carbon 1:
  `metanonitrilo`, `etanonitrilo`, `2-metilpropanonitrilo`,
  `butanodinitrilo`, `prop-2-enonitrilo`, `4-oxopentanonitrilo`,
  `2-aminopropanonitrilo`…; on a ring `-carbonitrilo`:
  `ciclohexanocarbonitrilo`, `ciclohexano-1,2-dicarbonitrilo`,
  `benzonitrilo`; below an acid `ciano-` / `carbamoil-` on the ring: `ácido
  4-cianociclohexano-1-carboxílico`), and, when the principal group (an OH, a
  ketone, an amine, an acid, an aldehyde, an amide or a nitrile) is on a chain rather than on
  the ring, of the chain with the ring as a prefix (`2-ciclohexiletan-1-ol`,
  `fenilmetanol`, `1-feniletan-1-ona`, `fenilmetanamina`,
  `2-fenoxietan-1-ol`, `2-(ciclohexilamino)etan-1-ol`, `ácido
  2-feniletanoico`, `3-fenilpropanal`, `2-feniletanonitrilo`,
  `3-ciclohexilpropanamida`…) or, when a C=O bonded to the ring is
  off the chain, a ring acyl prefix (`ácido 2-benzoilbutanoico`,
  `3-(ciclohexanocarbonil)pentano-2,4-diona`), with the name coloured by part
  (locants, multipliers, prefixes, stem, ending).
- **Otras formas válidas**: for isopropyl groups the name is also given in
  the IUPAC-preferred (`propan-2-il`) and classic (`1-metiletil`) styles;
  `tolueno` and `estireno` are listed as traditional names of
  `metilbenceno` and `etenilbenceno`; `propanona` also lists `propan-2-ona`
  (the IUPAC 2013 form) and `acetona`, `metanal` and `etanal` their
  traditional `formaldehído` and `acetaldehído`, and the ácidos metanoico,
  etanoico and etanodioico their traditional `ácido fórmico`, `ácido
  acético` and `ácido oxálico`, and a metanoato or etanoato ester its
  `formiato` / `acetato` form (`acetato de etilo`); `metoxibenceno` lists `anisol`, and a
  simple ether its functional-class name (`etil metil éter`, `dietil éter`);
  `bencenamina` lists `anilina` (`N-metilanilina`…), and a simple amine its
  traditional name (`metilamina`, `dimetilamina`, `trimetilamina`,
  `etilmetilamina`); `metanamida` and `etanamida` list `formamida` and
  `acetamida`, also with groups on the N (`N,N-dimetilformamida`), and
  `etanonitrilo` lists `acetonitrilo`; `1-feniletan-1-ona`,
  `fenilmetanol` and `fenilmetanamina` list `acetofenona`, `alcohol
  bencílico` and `bencilamina`; `ácido benzoico` and `benzaldehído` list
  the systematic `ácido bencenocarboxílico` and `bencenocarbaldehído`
  (`benzamida` and `benzonitrilo` likewise `bencenocarboxamida` and
  `bencenocarbonitrilo`), and `ácido 2-feniletanoico`, `2-feniletanal`,
  `2-feniletanonitrilo` and `2-feniletanamida` list `ácido fenilacético`,
  `fenilacetaldehído`, `fenilacetonitrilo` and `2-fenilacetamida`
  (`N-feniletanamida` lists `N-fenilacetamida`).
- **Paso a paso**: an explanation stepper (count, longest chain, tie-breaks,
  numbering with a side-by-side comparison of the options, substituents,
  alphabetical order, assembly) that highlights each step on the drawing;
  the remembered **Resaltar en el dibujo** switch hides or shows those marks.
  Key terms are underlined and show a short definition.
- **Ordenar dibujo**: redraws the molecule with the main chain laid out left
  to right and numbered, or a ring as a regular polygon with locant 1 on top
  and the numbering clockwise (one animated, undoable edit).
- **Ejemplos**: a menu of 14 molecules, one per feature.
- **Ayuda**: a short in-page guide to drawing, with illustrations, keyboard
  shortcuts and the glossary.
- Friendly Spanish messages for ring systems out of scope (several, fused, bridged or spiro rings, heterocycles, benzenes with two or more substituents), disconnected pieces, an empty canvas
  and impossible bonds. Light and dark theme following the system.
- Accessible: every control is reachable with the keyboard and has a visible
  focus ring and an accessible name; the name and the current explanation
  step are announced to screen readers. Works from 375 px phones (toolbar at
  the bottom) to desktops.

## How to use

1. Open `dist/index.html` (after `npm run build`) directly from disk, or
   run `npm run serve` and open <http://127.0.0.1:8000/>.
2. With **Enlace simple**, click the empty canvas to draw two joined
   carbons; click a carbon to add another one, or drag from it to choose the
   direction. Use **Enlace doble** / **Enlace triple** on a bond to change it.
3. Press **¿Cómo se llama?**, then **Ver paso a paso** to follow the
   reasoning, and **Ordenar dibujo** to see the main chain laid out.

The **Ayuda** button in the app explains the same in Spanish.

## Rules followed

Names follow the **IUPAC 2013 recommendations** (preferred IUPAC names),
adapted to Spanish: the longest chain is chosen first and unsaturation only
breaks ties; locants go right before the part they refer to (`hex-2-eno`,
`buta-1,3-dieno`, `pent-1-en-4-ino`); lowest locants for multiple bonds, then
double bonds, then prefixes, then the first-cited prefix; prefixes in
alphanumerical order; `di/tri` for simple prefixes and `bis/tris` for
compound ones; retained `tert-butil`; `isopropil` by default (a user
decision), with the PIN `propan-2-il` and the classic `1-metiletil` listed as
alternatives. The complete rule set, spelling decisions and locant-omission
table are in [`docs/design.md`](docs/design.md) §1 and §4.

## Development

Requirements: Node.js 22 or later. No runtime dependencies; Playwright is the
only dev dependency (`npm install`, then `npx playwright install chromium`).

```sh
npm run serve        # dev server: http://127.0.0.1:8000/ (native ES modules, no build step)
npm test             # unit tests (node --test)
npm run check        # syntax check of every .js/.mjs file + no alert/confirm/prompt
npm run build        # → dist/index.html, one self-contained file
npm run e2e          # Playwright end-to-end tests, on the source AND on dist/index.html
npm run e2e:source   # … only on the dev server
npm run e2e:dist     # … only on the built file, opened via file://
npm run oracle       # OPSIN cross-check (development only, needs Java)
npm run deploy       # upload dist/index.html to Fastmail Files (manual step, see Deployment)
```

The dev page uses native ES modules, so open it through the server, not
from disk. `dist/index.html` inlines every stylesheet, script and SVG (the
module graph is bundled into one classic script by `scripts/build.mjs`), so
it opens from `file://`, works offline and can be copied to any static host.

`npm run e2e` runs every spec in two Playwright projects (see
`playwright.config.js`): `source` (the dev server) and `dist` (the built file
via `file://`, rebuilt by the global set-up before the run). The final
acceptance test (`tests/e2e/acceptance.spec.js`) draws 4-etenilheptano with
real clicks, names it, steps through the whole explanation and redraws it.

End-to-end tests drive the editor through `window.__editor`, the editor
instance published by `src/ui/app.js` (test API documented in the header of
`src/editor/editor.js`).

### Oracle

`npm run oracle` generates random acyclic hydrocarbons, random
substituted or unsaturated monocycles, benzene derivatives, halogen
derivatives, alcohols, aldehydes, ketones and carboxylic acids of all of those (plus the cycloalkanes of the size
range), names them with this
engine and checks each name by parsing it back with
[OPSIN](https://github.com/dan2097/opsin) (after rendering the name in
English) and comparing the structures. It needs Java and downloads the OPSIN jar on
request; see [`scripts/oracle/README.md`](scripts/oracle/README.md).

### Layout

```
index.html        app shell (Spanish UI, Ayuda dialog)
css/app.css       styles, light/dark colour tokens, responsive layout
src/model/        molecule model, validation, graph utilities, SMILES subset
src/naming/       naming engine (pure: never reads coordinates or the DOM)
src/explain/      step-by-step explanation and glossary
src/layout/       canonical layout for "Ordenar dibujo"
src/editor/       SVG editor
src/ui/           application glue (toolbar, results, examples, help…)
tests/unit/       node --test
tests/e2e/        Playwright
scripts/          build, static server, checks, oracle tooling
docs/design.md    design and implementation plan
```

## Deployment

The app is published as a static site from Fastmail Files: the single-file
build is uploaded over WebDAV to
`https://myfiles.fastmail.com/OrganicWeb/index.html`. Deploying is always a
manual step run by the maintainer.

**Prerequisites (one time):**

1. In Fastmail, create an app password with access to **Files** only.
2. Store it in the macOS Keychain (the command prompts for the password, so
   it never lands in the shell history):

   ```sh
   security add-generic-password -s fastmail-webdav -a carlos@carpio.cc -w
   ```

3. In Fastmail's web UI (Files), make the `OrganicWeb` folder a public
   website. This is a one-time setting; uploads do not change it.

**Deploy:**

```sh
npm run deploy                     # checks, build, upload
npm run deploy -- --dry-run        # everything except the upload (no Keychain read)
npm run deploy -- --skip-checks    # skip npm test and npm run check
npm run deploy -- --force          # allow a dirty git working tree
npm run deploy -- --help
```

`scripts/deploy.mjs` refuses to run on a dirty git tree (unless `--force`),
runs `npm test` and `npm run check` (unless `--skip-checks`), builds
`dist/index.html`, reads the password with
`security find-generic-password -s fastmail-webdav -a carlos@carpio.cc -w`,
PUTs the file with `Content-Type: text/html; charset=utf-8` and prints the
HTTP status and size. Any non-2xx response exits with a non-zero status. The
password stays in memory (a Basic `Authorization` header for Node's `fetch`);
it is never logged, written to disk or passed on a command line.

Environment overrides: `FASTMAIL_USER` (WebDAV user, default
`carlos@carpio.cc`), `FASTMAIL_WEBDAV_URL` (destination file URL; must be `https://`) and
`FASTMAIL_KEYCHAIN_SERVICE` (Keychain service, default `fastmail-webdav`;
the Keychain account is the WebDAV user).

## Known limitations and future work

- Hydrocarbons, their halogen derivatives, alcohols, aldehydes, ketones,
  carboxylic acids, ethers, esters, amines, amides and nitriles only, with at most one ring (a carbocycle; an
  ester with a ring is refused); more than two
  aldehyde groups on a chain when the aldehyde is the principal group
  (`-carbaldehído`), more than two –COOH groups on a chain
  (`-tricarboxílico`), a –CO–C≡N
  branch (`carbonocianidoil-`), more than two ester groups without an acid,
  two esters on different carbon pieces (a diol diester such as
  `diacetato de etano-1,2-diilo`, or an ester inside the O-bound group of
  another), a diester with two different O-bound groups whose chain would
  need locants for them (`2-metilbutanodioato de 1-etilo y 4-metilo`), an
  ether or amine whose identical parts each carry the
  principal group (multiplicative names, `oxidi-`, `azanodiil-`), and
  several amine groups on the main chain when some N carries other groups
  (N¹/N² locants) are refused too, and so are more than two amides on one
  chain (`-carboxamida`), a diamide with groups on an N (on a chain or on
  a ring) and imides, and a nitrile bonded to the
  carbon of an acid, ester or amide (`ácido carbonocianídico`) and more
  than two nitriles on one chain when the nitrile is the principal group
  (`-carbonitrilo`); a nitrile below an acid, ester or amide, or on a
  branch, is named with the `ciano-` prefix, and a C=O carbon bonded to
  its chain as a branch with an acyl prefix (`formil-`, `acetil-`,
  `propanoil-`…);
  salts, ammonium ions and other acid derivatives are not named yet; several
  rings, fused, bridged and spiro rings, heterocycles, benzenes with two or
  more substituents (no orto/meta/para), other oxygen and nitrogen compounds,
  stereochemistry (E/Z, R/S), charges and
  radicals are not named. Traditional halogen and alcohol names
  (cloroformo, alcohol etílico, glicerina…) are not given (only `acetona`,
  `formaldehído` and `acetaldehído` among the carbonyls, and `ácido
  fórmico`, `ácido acético` and `ácido oxálico` among the acids, `formiato`
  and `acetato` among the esters, `anilina` and the alkylamine names such
  as `trimetilamina` among the amines, `formamida` and `acetamida` among
  the amides, `acetonitrilo` among the nitriles; amino-acid names such as alanina are
  not given); the 90° view keeps
  the normal drawing for any molecule with a heteroatom.
- Parent chain up to 30 carbons, whole molecule up to 60.
- Structure → name only; there is no name → structure.
- Future (design §12, §13): functional groups,
  E/Z and a quiz mode ("¿Cómo se llama?" in reverse: read a name, draw it).

## Author

Created by Carlos Carpio García, 2026. The page shows the credit
«Creado por Carlos Carpio García · 2026» in its footer.
