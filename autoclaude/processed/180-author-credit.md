# Credit the author of the web page

User request: show the creator of the web page, **Carlos Carpio García**,
with the year **2026**.

Wanted:
- A discreet footer (or equivalent place visible on every screen size, e.g.
  at the bottom of the page or in the Ayuda panel) reading, in Spanish:
  "Creado por Carlos Carpio García · 2026" (or "© 2026 Carlos Carpio García";
  pick one and keep it consistent).
- Add `<meta name="author" content="Carlos Carpio García">` to the page head.
- Must be present in both the dev page and `dist/index.html`; add an e2e check.
- Also add the author to README and `package.json` (`"author"`) if missing.
- Keep it accessible (sufficient contrast in light/dark) and make sure it
  does not cover the canvas or toolbar on narrow screens.
