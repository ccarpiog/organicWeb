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
  `4-oxopentanal`, `4-hidroxibutan-2-ona`, `ciclohexanona`…), and of
  carboxylic acids (–COOH as `ácido …oico`: `ácido etanoico`,
  `ácido 2-metilpropanoico`, `ácido but-2-enoico`, `ácido butanodioico`,
  `ácido 4-oxopentanoico`, `ácido 2-hidroxipropanoico`…), and of ethers
  (the O and the other side as an `alcoxi-` prefix, the chain never
  running through the O: `metoxietano`, `etoxietano`, `1-isopropoxibutano`,
  `2-metoxietan-1-ol`, `ácido 2-metoxietanoico`, `metoxiciclohexano`,
  `metoxibenceno`…), with the name coloured by part
  (locants, multipliers, prefixes, stem, ending).
- **Otras formas válidas**: for isopropyl groups the name is also given in
  the IUPAC-preferred (`propan-2-il`) and classic (`1-metiletil`) styles;
  `tolueno` and `estireno` are listed as traditional names of
  `metilbenceno` and `etenilbenceno`; `propanona` also lists `propan-2-ona`
  (the IUPAC 2013 form) and `acetona`, `metanal` and `etanal` their
  traditional `formaldehído` and `acetaldehído`, and the ácidos metanoico,
  etanoico and etanodioico their traditional `ácido fórmico`, `ácido
  acético` and `ácido oxálico`; `metoxibenceno` lists `anisol`, and a
  simple ether its functional-class name (`etil metil éter`, `dietil éter`).
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
  carboxylic acids and ethers only, with at most one ring (a carbocycle; an
  OH or a ketone C=O must then be on a ring carbon, and aldehydes and acids
  with a ring are refused); a C=O carbon bonded to the main chain as a
  branch (acetilo…), more than two aldehyde or more than two –COOH groups
  on a chain, and an ether with two identical halves that each carry the
  principal group (named with `oxidi-`) are refused too; esters, salts and
  other acid derivatives are not named yet; several
  rings, fused, bridged and spiro rings, heterocycles, benzenes with two or
  more substituents (no orto/meta/para), other oxygen and nitrogen compounds
  (functional groups, planned), stereochemistry (E/Z, R/S), charges and
  radicals are not named. Traditional halogen and alcohol names
  (cloroformo, alcohol etílico, glicerina…) are not given (only `acetona`,
  `formaldehído` and `acetaldehído` among the carbonyls, and `ácido
  fórmico`, `ácido acético` and `ácido oxálico` among the acids); the 90° view keeps
  the normal drawing for any molecule with a heteroatom.
- Parent chain up to 30 carbons, whole molecule up to 60.
- Structure → name only; there is no name → structure.
- Future (design §12, §13): functional groups,
  E/Z and a quiz mode ("¿Cómo se llama?" in reverse: read a name, draw it).

## Author

Created by Carlos Carpio García, 2026. The page shows the credit
«Creado por Carlos Carpio García · 2026» in its footer.
