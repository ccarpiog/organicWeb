# organicWeb — Química orgánica

A static, offline web app for secondary-school students (ESO, Spain): draw an
acyclic hydrocarbon and get its IUPAC name **in Spanish** (IUPAC 2013
recommendations), with a step-by-step explanation and an optional redraw that
makes the main chain obvious. The user interface is in Spanish; code and
documentation are in English.

Status: molecule model done; naming covers unbranched chains and branched
molecules with simple alkyl substituents (metil, etil, propil…); branched,
unsaturated and doubly-attached substituents, editor and explanations in
progress. The design and phase plan live in
[`docs/design.md`](docs/design.md).

## Requirements

- Node.js 22 or later (developed on Node 26). No runtime dependencies.
- For end-to-end tests: `npm install` and `npx playwright install chromium`.

## Run

```sh
npm run serve        # http://127.0.0.1:8000/  (zero-dependency static server)
```

The app uses native ES modules, so open it through the server, not directly
from disk. Use the built file (below) for `file://`.

## Test

```sh
npm test             # unit tests (node --test)
npm run check        # syntax check of every .js/.mjs file + no alert/confirm/prompt
npm run e2e          # Playwright end-to-end tests (Chromium)
npm run oracle       # OPSIN cross-check (development only; not implemented yet)
```

## Build

```sh
npm run build        # → dist/index.html
```

`dist/index.html` is one self-contained file: every stylesheet and ES module is
inlined (the module graph is bundled into a single classic script), so it opens
from `file://` and can be copied to any static host.

## Layout

```
index.html        app shell (Spanish UI)
css/app.css       styles, light/dark colour tokens
src/              model, naming engine, explanations, editor, layout, UI
tests/unit/       node --test
tests/e2e/        Playwright
scripts/          build, static server, checks, oracle tooling
docs/design.md    design and implementation plan
```
