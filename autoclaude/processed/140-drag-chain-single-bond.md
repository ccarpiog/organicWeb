# Single-bond tool: click-and-drag grows a chain (MolView-like)

User feedback. With the **Enlace simple** tool selected, pressing and dragging
(without releasing the button) should keep creating carbons, producing a long
chain along the drag, like MolView does. Today the drag creates only one new
carbon (design.md §6.1), and long chains need the separate **Cadena** tool.

Wanted:
- Single-bond tool, drag from empty space or from an atom: the chain grows
  bond by bond as the pointer moves away, with a live carbon counter like the
  Cadena tool; release commits as one undo transaction; Esc/pointer cancel
  restores the start state.
- Keep the existing behaviours that still make sense: a plain click still
  grows one carbon / creates a two-carbon fragment; releasing on an existing
  atom still bonds to it (decide how that combines with a multi-bond drag).
- Respect the angle rules of the current mode (see 150-right-angles.md: 90°
  mode only applies to the labelled-carbons view; skeletal stays zigzag).
- Decide whether **Cadena** stays as a separate tool or becomes redundant;
  document the decision in design.md §6.1 and update keyboard help/Ayuda.
- Double/triple tools: decide whether they get the same drag behaviour
  (probably not — only the first bond would carry the order); document it.
