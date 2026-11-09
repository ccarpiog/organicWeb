# «¿Cómo se dibuja?»: a clear message when a multiplier tile stands where a root goes (user request, 2026-11-09)

User report: the tiles `4` `met` `il` `ciclo` `hexa` `1` `eno` (name line
`4-metilciclohexa-1-eno`) get the `invalid` verdict with the RING_ROOT
message «Después de «ciclo» va una raíz que dice cuántos carbonos tiene el
anillo: ciclopropano, ciclohexano, ciclohexil…». The verdict is right. The
`hexa` tile is `mult-6` from «¿Cuántos?», not a root, and the right name is
`4-metilciclohex-1-eno`. The message is the problem: it never says that
`hexa` is a multiplier or that the root is `hex`. A student who has seen
`ciclohexa-1,3-dieno` will reasonably take `hexa` for the root.

Commit fd63b26 handled the same mix-up (`oct` / `octa`) only through the
row order and the row hints. The parser's messages did not change.

## Reproduced (2026-11-09, `readName()` in `src/reverse/index.js`)

- `num-4 root-1 fv-1 ring-cyclo mult-6 num-1 ending-double` → `invalid`.
  The first error is RING_ROOT, which marks the `ciclo` tile, not `hexa`.
  NO_PARENT and two TILE_ORDER errors follow.
- `mult-8 ending-saturated` (`octa` `ano`, meant as `octano`) → `invalid`.
  The first error is TILE_ORDER with `HINTS.mult`: «"di", "tri"… van
  delante de una rama (dimetil) o de una terminación (buta-1,3-dieno).».
  NO_PARENT and a TILE_ORDER for `ano` follow.
- For comparison, these read as `correct`:
  - `ring-cyclo root-6 num-1 ending-double` → `ciclohex-1-eno`;
  - `ring-cyclo root-6 num-1 num-3 mult-2 ending-double` →
    `ciclohexa-1,3-dieno`, where the assembler adds the `a` itself.

## The rule (drafted for the user; the phase may refine these app decisions with evidence)

- **Look-alike multiplier:** a multiplier whose text is the root of the
  same number plus `a`. That is 5…30, from `penta` / `pent` to
  `triaconta` / `triacont`. For 2–4 the pairs do not look alike (`di` /
  `et`, `tri` / `prop`, `tetra` / `but`). Compute the test from the
  lexicon (`stem(n)`, `multiplier(n)` in `src/naming/lexicon.es.js`).
  Do not hard-code a list.
- **Where the new message fires:**
  1. **Right after `ciclo`:** `parseChain()`, `src/reverse/parse.js`
     around the RING_ROOT check (~line 1902). A root is required there.
     - It fires for every look-alike.
     - `tri` and `tetra` may get the same message if it reads well
       («la raíz de tres carbonos es «prop»: ciclopropano»).
     - `di` keeps RING_ROOT, because a ring of two carbons is impossible.
  2. **Where a parent chain starts:** `parseItem()`, the TILE_ORDER with
     `HINTS.mult` (~line 2539). It fires for a look-alike multiplier when
     all of these hold:
     - no locants and no o/m/p letter come before it;
     - the next tile is one that follows a root: an ending (`ano`,
       `eno`, `ino`), a locant, a suffix and so on.

     It does not fire in these cases:
     - a branch follows (`hexametil` is a real multiplier);
     - the multiplier is `di`, `tri` or `tetra` (`1` `3` `di` `eno` is a
       forgotten root, so today's message stays).
  3. Check the other places that require a root (a branch's root, inside
     a compound branch). Use the same message wherever the same confusion
     can happen.
- **Message (draft, ESO-level Spanish):** «"hexa" es de «¿Cuántos?»: dice
  cuántos grupos iguales hay (hexametil). La raíz de seis carbonos es
  «hex», de «Raíces»: ciclohex-1-eno.»
  - When an unsaturation ending follows (or always; the phase decides),
    add: «La «a» de ciclohexa-1,3-dieno la pone la aplicación sola delante
    de «di».»
  - Build the example from the student's own name if that is easy
    (`ciclohex-1-eno`, `octano`); otherwise use fixed examples.
  - Write the number as a digit or a word, whichever the existing messages
    already do.
- **Marking and order:** mark the multiplier tile, not `ciclo`. Make this
  error the first one, because the verdict shows `errors[0]`
  (`src/reverse/index.js` ~line 699).
- **Recovery:** after recording the error, read the multiplier as the root
  of the same number if that fits cleanly. The rest of the name then keeps
  parsing (`1` `eno` reads as the ring's ending), and the follow-on
  NO_PARENT / TILE_ORDER errors do not pile up. The verdict stays
  `invalid`.
- **Code:** either a new error code (for example `MULT_AS_ROOT`, added to
  `ERROR_CODES` in `parse.js`) or the existing codes with the new message.
  The phase decides. A new code is easier to assert.

## Tests

- **Unit:** both reproductions above give the new message as the first
  error, marking the multiplier tile, with no cascade errors in front of
  it.
- **Unit, more multipliers:** one case each for `penta`, `undeca`,
  `icosa` and `triaconta`, in both places.
- **Unit, unchanged:**
  - `hexa` `met` `il` (a real multiplier);
  - `1` `3` `di` `eno`;
  - `ciclo` `di` `ano`, which keeps RING_ROOT;
  - every existing reverse test.
- **e2e:** in the dialog, the tiles of the report show the new message,
  with the `hexa` tile marked.
- The closed loop (`tests/unit/reverse-closed-loop.test.js`) stays green.
  No name the forward engine writes contains this mistake.

## How to take this item

- One small phase. It touches only the reader (`src/reverse/`) and its
  tests. The forward engine and the main names do not change.
- Record the new code or message in design.md §15.6. design.md has
  uncommitted user edits. Unless the user has committed them by then,
  handle them as I-53b and I-54b did: record the intended §15 edits for
  the user and do not commit the file.
- Add the new Spanish wording to `docs/teacher-review-v4.md` (pending
  teacher review), next to item T-8 (the row hints of fd63b26).
