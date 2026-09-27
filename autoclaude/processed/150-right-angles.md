# 90° condensed-formula view when carbons are labelled (toggle)

User feedback (revised). Keep the current 120° zigzag in the default
**Esqueleto** view, where carbons and hydrogens are not written. When the
display shows carbons with their hydrogens (**Con carbonos**, e.g.
`CH₃–CH=CH–CH₂–…`), add a toggle to draw the molecule with **90° angles**, in
the textbook semi-developed ("fórmula semidesarrollada") style.

Reference picture from the user (2,2,4-trimethylpentane):

```
        CH3
        |
  CH3 – C – CH2 – CH – CH3
        |         |
        CH3       CH3
```

Main chain on one horizontal line, bonds as horizontal dashes between the
groups, and substituents hanging vertically (up/down) from their carbon, also
written as CH₃, CH₂, etc.

Wanted:
- A toggle (Spanish label, remembered in localStorage like the display mode)
  available in "Con carbonos" mode; in "Esqueleto" mode, keep the zigzag.
- In 90° mode the main chain is horizontal, and branches go straight up or
  down (and continue horizontally or vertically if they are longer), with
  collision-free placement. The main chain probably comes from the naming
  engine's parent chain, just like "Ordenar dibujo" (layout/canonical.js).
  Decide whether this is a display-only projection of the model (atom
  coordinates untouched) or a re-layout, and how editing works while it is on
  (maybe read-only, or new atoms snap to the grid).
- Spacing must fit the text labels (CH₃ is wider than a vertex), and bond
  strokes must not overlap the labels. Double/triple bonds keep their
  multiplicity (`=`, `≡` style strokes between groups).
- Also consider it for the result panel / stepper highlights.
- Update design.md §6.3 / §7 and tests (layout, e2e).
