# Make every carbon clearly visible in skeletal mode

User feedback. In the default **Esqueleto** display, carbons are bare line
vertices (design.md §6.3). When two consecutive bonds are nearly collinear the
vertex disappears: a user screenshot shows a 4-carbon chain drawn by hand
(C1→C2 going down-right, C2→C3 almost flat, C3→C4 up-right) where it is really
hard to tell whether there are three or four carbons — the C2 and C3 bends
barely read as vertices.

Wanted: in skeletal mode, a student must be able to count the carbons at a
glance, whatever the drawn angles.

Suggested direction (the phase may choose better):
- Draw a small filled dot (or similar marker) on every carbon vertex in
  skeletal mode, sized so it does not clutter but is unmistakable; keep the
  hover/highlight styles working on top of it.
- Chain ends and lone carbons (methane) must be visible too.
- Consider whether it should also apply to the redrawn ("Ordenar dibujo")
  view and to the stepper highlights; keep **Con carbonos** mode unchanged.
- Update design.md §6.3 and the e2e/visual tests accordingly.
