# Let the student turn off the stepper highlights mid-explanation

User feedback. While going through "Ver paso a paso", each step colours the
canvas (parent / candidate / substituent / locant highlights, locant numbers;
design.md §6.3 and §9). There is currently no way to switch these off while
staying in the explanation, e.g. to look at the plain drawing, count carbons
or compare with the text.

Wanted:
- A visible control in the stepper (Spanish label, e.g. a "Resaltar en el
  dibujo" switch or an "Ocultar colores" button) that hides/shows the canvas
  highlights and locant numbers without leaving or resetting the stepper.
- Stepping to another step while highlights are off keeps them off (the
  text still advances); turning them back on shows the current step's
  highlight. Decide whether the choice is remembered (localStorage, in
  try/catch) or reset each time the stepper opens.
- Also covers the persistent parent highlight shown after "Ordenar dibujo"
  and the highlights drawn on the 90° view.
- Keyboard-accessible, with the right ARIA state (`aria-pressed` or a checkbox).
- Update design.md §9 and add unit/e2e coverage.
