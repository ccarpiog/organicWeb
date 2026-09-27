# Phase 010 — Project scaffold

Spec: `docs/design.md` §1, §2, §10. Project rules: `CLAUDE.md`.

## Task
Create the repository skeleton so later phases only add code.

- Directory layout of §2 (empty modules may export a JSDoc'd stub).
- `package.json` (type: module, no runtime dependencies) with scripts `test`,
  `check`, `e2e`, `build`, `serve`, `oracle` (oracle may print "not yet
  implemented" and exit 0 until phase 070).
- `index.html` shell in Spanish: header "Química orgánica", toolbar area,
  SVG canvas area, results panel, big button "¿Cómo se llama?" (disabled for
  now). `css/app.css` with colour tokens on `:root`, dark mode via
  `prefers-color-scheme`, responsive layout (results panel below the canvas
  under ~800 px).
- `scripts/build.mjs`: inlines every CSS and ES module into
  `dist/index.html` (no dependencies; resolve the module graph and emit one
  classic or module script so the page works from `file://`). Add a unit test
  that builds and checks the output contains no external `src=`/`href=` to
  local files.
- Playwright dev dependency + config serving the repo root; one smoke e2e test:
  page loads, title and canvas present, no console errors.
- `.gitignore`: `node_modules/`, `dist/`, `test-results/`, `playwright-report/`,
  `scripts/oracle/vendor/`.
- `README.md` (English): what it is, how to run, test, build.

## Acceptance criteria
- `npm test`, `npm run check`, `npm run e2e`, `npm run build` all exit 0.
- `dist/index.html` opens from `file://` and shows the shell (verified by an
  e2e test loading the `file://` URL).
