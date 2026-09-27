# Allow editing (add carbons, bonds…) in the labelled-carbons 90° view

User feedback: "It should be possible to add carbons, links, etc, in the
'Con carbonos' view". Today, while the "Ángulos rectos (90°)" drawing is shown
under **Con carbonos**, the editor is read-only (design.md §6.1 "90° view
(read-only)" row and §6.3): every tool is disabled with the note "Desactiva
los ángulos rectos para editar.". The student has to switch views to change
the molecule. (If plain "Con carbonos" without 90° has any tool that does
not work, fix that too — every tool must work in every view.)

Wanted:
- All editing tools work while the 90° drawing is shown: Carbono (click a
  carbon label → grow a carbon), Enlace simple/doble/triple (grow, set bond
  order, bond two existing carbons), Cambiar enlace, Cadena and the single-
  bond chain drag, Borrar, and ideally Mover.
- The 90° drawing is a projection of the model (the real atom coordinates are
  untouched). Decide and document how edits map back: e.g. hit-testing on the
  projected positions and translating the gesture into a model edit whose new
  atom gets sensible model coordinates (zigzag rules of §6.2), after which
  the projection is recomputed. Mover may need a clear rule (move in the
  model? disabled with a note?).
- The gestures must stay predictable although the projection re-lays out
  after each edit (the main chain may change): the new atom should appear
  where the student expects, or at least the change must be obvious.
- Keep: one undo transaction per gesture, Esc/pointer-cancel restore, the
  valence refusals and toasts, the fallback to the normal drawing when the
  molecule cannot be projected.
- Remove the read-only note and update design.md §6.1/§6.3, the Ayuda text
  and the tests (unit + e2e on both the dev server and dist).
