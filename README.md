# organicWeb — Química orgánica

A static, offline web app for secondary-school students (ESO, Spain): draw an
acyclic hydrocarbon and get its IUPAC name **in Spanish**, with a
step-by-step explanation and a redraw that makes the main chain obvious. The
user interface is in Spanish; code and documentation are in English. The
design and phase plan live in [`docs/design.md`](docs/design.md).

## Features

- **Editor** (SVG, mouse, pen and touch): Carbono, single/double/triple
  bonds, Cambiar enlace, Cadena (drag to draw a zig-zag chain with a live
  carbon counter), Borrar, Mover (marquee selection), undo/redo, Limpiar
  (with an in-page confirmation), pan (Space + drag, middle drag, two
  fingers) and zoom (wheel, pinch), Centrar, skeletal or condensed display,
  live molecular formula, keyboard shortcuts, and autosave in the browser.
- **Naming** of every valid acyclic hydrocarbon (alkanes, alkenes, alkynes;
  any branching; branched, unsaturated and nested substituents; doubly
  attached `-iliden` substituents), with the name coloured by part
  (locants, multipliers, prefixes, stem, ending).
- **Otras formas válidas**: for isopropyl groups the name is also given in
  the IUPAC-preferred (`propan-2-il`) and classic (`1-metiletil`) styles.
- **Paso a paso**: an explanation stepper (count, longest chain, tie-breaks,
  numbering with a side-by-side comparison of the options, substituents,
  alphabetical order, assembly) that highlights each step on the drawing.
  Key terms are underlined and show a short definition.
- **Ordenar dibujo**: redraws the molecule with the main chain laid out left
  to right and numbered (one animated, undoable edit).
- **Ejemplos**: a menu of 14 molecules, one per feature.
- **Ayuda**: a short in-page guide to drawing, with illustrations, keyboard
  shortcuts and the glossary.
- Friendly Spanish messages for rings, disconnected pieces, an empty canvas
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

`npm run oracle` generates random acyclic hydrocarbons, names them with this
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

## Known limitations and future work

- Acyclic hydrocarbons only: rings (the editor can draw one; naming then
  explains that rings are not supported yet), benzene, heteroatoms and
  functional groups, stereochemistry (E/Z, R/S), charges and radicals are
  out of scope.
- Parent chain up to 30 carbons, whole molecule up to 60.
- Structure → name only; there is no name → structure.
- Future (design §12): rings and benzene, E/Z, a quiz mode ("¿Cómo se
  llama?" in reverse: read a name, draw it) and functional groups.
