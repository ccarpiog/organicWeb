# «¿Cómo se dibuja?» (v4) — Spanish wording pending teacher review

## How to use this list

This is every Spanish text that v4 of the app («¿Cómo se dibuja?»: the
student builds a name from tiles, the app draws the molecule and judges the
name) shows to a student, in one place, for review by a chemistry teacher.
All of it is the app's own phrasing (`docs/design.md` §15.9). For each item,
write **OK**, or **cambiar a: «…»** with the wording you prefer, or a short
comment, next to its id (T-3, E-12, D-40…), and send the list back; the ids
are stable, so a reply may list only the items that change. Text in «…» is
what the app shows today, word for word (the inner «» are part of it). Where
a message changes with the molecule, one real example is quoted and the
other wordings follow as «…» fragments. The chemical names inside a message
are the app's own names (reviewed with the naming engine), not part of the
wording to review, unless the item says otherwise. The part in brackets
(phase id · file or constant) is for the developer.

Not listed here: the tile texts themselves (`met`, `eno`, `isopropil`,
`ácido`, `acetona`…), which are the naming engine's own words; the labels of
«Otras formas válidas» and the forward engine's refusal messages, which v1–v3
already show when a drawing is named (they appear inside some v4 messages,
after «Entiendo tu nombre, pero esa molécula queda fuera de lo que sé
dibujar:»); and the explanation steps («Ver paso a paso»), except the two
steps v4 added (§5).

Sections: 1. The dialog and its tiles (T-) · 2. Verdicts and the results
panel (V-) · 3. Structural errors (E-) · 4. Search messages (S-) ·
5. Diagnosis messages (D-) · 6. Ayuda «Del nombre al dibujo» (A-) ·
7. Points the developers flagged for the teacher (C-) · 8. I-54: orto,
meta y para with two different groups (O-).

## 1. The dialog and its tiles

### 1.1 Launcher, dialog and editing

- T-1 Launcher button under «¿Cómo se llama?», also the dialog's title —
  «¿Cómo se dibuja?» [I-48a · `index.html`]
- T-2 Hint in the empty results panel — «Dibuja una molécula en el lienzo y
  pulsa «¿Cómo se llama?», o forma un nombre con «¿Cómo se dibuja?».» [I-48a
  · `results.js` `IDLE_HINT`, `index.html`]
- T-3 Dialog buttons — «Cerrar», «Borrar ficha», «Borrar todo», «Dibujar»
  [I-48a · `index.html`]
- T-4 Empty name line — «Pulsa las fichas de abajo para formar un nombre.»
  [I-48a · `name-builder.js` `PLACEHOLDER`]
- T-5 Names read by a screen reader — the name line «Nombre formado con las
  fichas»; the place before the first tile «Principio del nombre»; a tile
  that writes nothing (the `il` of `metoxi`) «il (no se escribe)» [I-48a;
  the last one I-51b1 · `index.html`, `name-builder.js` `START_LABEL`,
  `silentLabel()`]
- T-6 When the name is full — «Ya hay 100 fichas, el máximo: borra alguna
  para añadir otra.» [I-48a · `name-builder.js` `fullMessage()`]
- T-7 «Dibujar» on a molecule that cannot be laid out — «He entendido el
  nombre, pero no consigo dibujar esta molécula sin que se crucen enlaces.»
  [I-48b · `draw-name.js` `CANNOT_DRAW`]

### 1.2 Tile rows and controls

- T-8 Row titles, in dialog order — «Raíces», «Números», «¿Cuántos?»,
  «Terminaciones», «Ramas», «Anillos», «Grupos», «Nombres tradicionales»;
  beside «Raíces» the hint «(solo el número de carbonos: met = 1, et = 2,
  prop = 3…)» and beside «¿Cuántos?» «(de ramas, grupos o terminaciones
  iguales: dimetil, dicloro, dieno…)», because the root `oct` and the
  multiplier `octa` look alike in the name [I-48a; «Anillos» I-50a,
  «Nombres tradicionales» I-50c, «Grupos» I-51a1; order and hints after a
  user report (`octa` picked as a root) · `name-builder.js` `ROWS`]
- T-9 The button that shows a row's other tiles — «más» / «menos» (read as
  «más (Números)») [I-48a · `MORE_LABEL`, `LESS_LABEL`]
- T-10 The two compound-branch controls of the «Ramas» row — «empieza rama
  compuesta» / «acaba rama» [I-48a · `CONTROL_LABELS`]
- T-11 The orto/meta/para tiles — the letters «o», «m», «p» with the small
  words «orto», «meta», «para»; tooltip and spoken name «o (orto, 1,2)»,
  «m (meta, 1,3)», «p (para, 1,4)» [I-50c · `positionalLabel()`]

### 1.3 Tile tooltips

Shown when the pointer rests on a tile (`name-builder.js` `TILE_HINTS`).
Tiles not listed have no tooltip.

**Rings row and alcohols.**

- T-12 `1(n)` — «Número del enlace que cierra un anillo, del último carbono al 1: se escribe 1(6) en un anillo de 6 carbonos.» [I-51a2]

**Ethers.**

- T-13 `oxi` — «Va detrás de una rama acabada en «il» y la une a la cadena por un oxígeno: met, il y oxi dan metoxi; pent, il y oxi dan (pentiloxi). Detrás de una rama con un C=O forma un éster como rama: acetil y oxi dan (acetiloxi).» [I-51b1; the last sentence I-52a2b]
- T-14 `éter` — «Va al final, detrás de los dos grupos unidos al oxígeno, por orden alfabético: et, il, met, il y éter dan etil metil éter; con dos grupos iguales, di, et, il y éter dan dietil éter.» [I-51b2]
- T-15 `anisol` — «Benceno con un grupo metoxi: metoxibenceno.» [I-51b1]

**Aldehydes, ketones and acyl prefixes.**

- T-16 `oxo` — «Un oxígeno unido a un carbono por un enlace doble (C=O) que no es el grupo principal: 4-oxopentanal; en una rama, (2-oxoetil).» [I-51c1]
- T-17 `formil` — «Un grupo CHO unido por su carbono, cuando ese carbono no es de la cadena ni del anillo: (4-formilciclohexil).» [I-51c1]
- T-18 `al` — «Aldehído (grupo CHO). Va al final, detrás de la terminación de una cadena; el grupo CHO está siempre en un extremo, así que no lleva números: butanal; con dos, butanodial.» [I-51c1]
- T-19 `ona` — «Cetona (C=O en un carbono del interior). Va al final, detrás de la terminación, con su número: pentan-2-ona, ciclohexanona.» [I-51c1]
- T-20 `carbaldehído` — «Grupo CHO unido a un anillo. Va al final, detrás del nombre del anillo: ciclohexanocarbaldehído, benceno-1,4-dicarbaldehído.» [I-51c1]
- T-21 `benzaldehído` — «Benceno con un grupo CHO: bencenocarbaldehído.» [I-51c1]
- T-22 `acetil` — «El grupo CH₃–CO– como rama, unido por el carbono del C=O: 3-acetilpentano-2,4-diona. Si lleva ramas propias, se escribe con et, ano y oil: (2-cloroetanoil).» [I-51c2]
- T-23 `oil` — «Va detrás de la terminación de una rama y la une a la cadena por su carbono 1, que lleva un C=O: prop, ano y oil dan propanoil; but, 2, eno y oil dan (but-2-enoil).» [I-51c2]
- T-24 `carbonil` — «Va detrás del nombre de un anillo: un grupo C=O unido al anillo, como rama, por el carbono del C=O: ciclo, hex, ano y carbonil dan (ciclohexanocarbonil); con números, (ciclohex-2-eno-1-carbonil). Detrás de «oxi» forma un éster como rama: met, il, oxi y carbonil dan (metoxicarbonil).» [I-51c2; the last sentence I-52a2b]
- T-25 `benzoil` — «Benceno unido a un grupo C=O, como rama, por el carbono del C=O: 3-benzoilpentano-2,4-diona; con ramas en el anillo, (4-metilbenzoil).» [I-51c2]

**Acids.**

- T-26 `ácido` — «Va al principio del nombre de un ácido (grupo COOH), delante de todo lo demás: ácido, but, ano y oico dan ácido butanoico; ácido, 2, met, il, prop, ano y oico dan ácido 2-metilpropanoico.» [I-51d1]
- T-27 `carboxi` — «Un grupo COOH unido por su carbono, cuando no es el grupo principal y su carbono no es de la cadena ni del anillo: (carboximetil).» [I-51d1]
- T-28 `oico` — «Ácido (grupo COOH). Va al final, detrás de la terminación de una cadena, y el nombre empieza por «ácido»; el grupo COOH está siempre en un extremo, así que no lleva números: ácido butanoico; con dos, ácido butanodioico.» [I-51d1]
- T-29 `carboxílico` — «Grupo COOH unido a un anillo. Va al final, detrás del nombre del anillo, y el nombre empieza por «ácido»: ácido ciclohexanocarboxílico, ácido benceno-1,3-dicarboxílico.» [I-51d1]
- T-30 `benzoico` — «Benceno con un grupo COOH: ácido bencenocarboxílico. Va detrás de «ácido»: ácido benzoico.» [I-51d1]

**Esters.**

- T-31 `oato` — «Éster (grupo COO). Va detrás de la terminación de una cadena, y luego el grupo unido al oxígeno, acabado en «ilo» (el «de» lo pone la app); el grupo COO está siempre en un extremo, así que no lleva números: et, ano, oato, met e ilo dan etanoato de metilo; con dos, butanodioato de dimetilo.» [I-52a1]
- T-32 `carboxilato` — «Grupo COO unido a un anillo. Va detrás del nombre del anillo, y luego el grupo unido al oxígeno: ciclohexanocarboxilato de etilo, ciclohexano-1,4-dicarboxilato de dimetilo.» [I-52a1]
- T-33 `benzoato` — «Benceno con un grupo COO: bencenocarboxilato. Detrás va el grupo unido al oxígeno: benzoato de metilo.» [I-52a1]
- T-34 `ilo` — «Acaba el grupo unido al oxígeno de un éster, en lugar de «il»: met e ilo dan metilo; prop, ano, 2 e ilo dan propan-2-ilo; detrás de isopropil, tert-butil o fenil, isopropilo, tert-butilo, fenilo. Sus ramas van delante (etanoato de 2-cloroetilo); con «di», el grupo se repite (butanodioato de dimetilo); dos grupos distintos, uno tras otro (propanodioato de etilo y metilo).» [I-52a1]

**Nitriles.**

- T-35 `ciano` — «Un grupo C≡N unido por su carbono, cuando no es el grupo principal; su carbono no cuenta en la cadena: ácido 3-cianopropanoico; en una rama, (cianometil).» [I-52b1]
- T-36 `nitrilo` — «Nitrilo (grupo C≡N). Va al final, detrás de la terminación de una cadena; el carbono del grupo C≡N es el carbono 1 de la cadena (con dos, también el último), así que no lleva números: butanonitrilo; con dos, butanodinitrilo.» [I-52b1]
- T-37 `carbonitrilo` — «Grupo C≡N unido a un anillo. Va al final, detrás del nombre del anillo: ciclohexanocarbonitrilo, benceno-1,4-dicarbonitrilo.» [I-52b1]
- T-38 `benzonitrilo` — «Benceno con un grupo C≡N: bencenocarbonitrilo.» [I-52b1]

**Amines.**

- T-39 `amina` — «Amina (grupo NH₂). Va al final, detrás de la terminación de la cadena o del anillo, con su número: propan-2-amina, butano-1,4-diamina, ciclohexanamina, bencenamina. También va justo detrás de los grupos unidos al nitrógeno, sin números: met, il y amina dan metilamina; di, met, il y amina, dimetilamina.» [I-52c1; the last sentence I-52c3]
- T-40 `N` — «Dice que una rama va unida al nitrógeno de la amina, no a un carbono. Va delante de la rama, como un número: N-metiletanamina; con dos ramas, N,N-dimetilmetanamina; junto a números, N,2-dimetilpropan-1-amina. También en las amidas, para las ramas unidas a su nitrógeno: N-metiletanamida, N,N-dimetilbenzamida.» [I-52c1; the last sentence I-52d1]
- T-41 `amino` — «Un grupo NH₂ unido a un carbono, cuando la amina no es el grupo principal: 2-aminoetan-1-ol, ácido 2-aminopropanoico. Si el nitrógeno lleva ramas, van delante de «amino», sin números, en una rama compuesta: (metilamino), (dimetilamino), [etil(metil)amino]. Con un grupo C=O unido al nitrógeno es una amida como rama: (acetilamino), [acetil(metil)amino].» [I-52c2; the last sentence I-52d2]

**Amides.**

- T-42 `amida` — «Amida (un C=O unido a un nitrógeno, –CONH₂). Va al final, detrás de la terminación de una cadena; el carbono del grupo amida es el carbono 1 de la cadena (con dos, también el último), así que no lleva números: propanamida; con dos, butanodiamida. Las ramas unidas al nitrógeno llevan «N»: N-metiletanamida.» [I-52d1]
- T-43 `carboxamida` — «Grupo amida unido a un anillo. Va al final, detrás del nombre del anillo: ciclohexanocarboxamida, ciclohexano-1,4-dicarboxamida.» [I-52d1]
- T-44 `benzamida` — «Benceno con un grupo amida: bencenocarboxamida. Las ramas unidas al nitrógeno llevan «N»: N-metilbenzamida.» [I-52d1]
- T-45 `carbamoil` — «Un grupo amida (–CONH₂) unido por el carbono del C=O, cuando no es el grupo principal y ese carbono no es de la cadena ni del anillo: ácido 3-carbamoilpentanodioico, ácido 4-carbamoilbenzoico. Si el nitrógeno lleva ramas, van delante de «carbamoil», sin números, en una rama compuesta: (metilcarbamoil), [etil(metil)carbamoil].» [I-52d2]

**Traditional names («Nombres tradicionales» row).**

- T-46 `cresol` — «Fenol con un metilo. Delante va una letra que dice dónde está el metilo: o-cresol, m-cresol o p-cresol.» [I-51a3a]
- T-47 `pirocatecol` — «Benceno con dos grupos OH en carbonos vecinos: benceno-1,2-diol. También se llama catecol.» [I-51a3a]
- T-48 `catecol` — «Benceno con dos grupos OH en carbonos vecinos: benceno-1,2-diol. La IUPAC (2013) acepta pirocatecol.» [I-51a3a]
- T-49 `resorcinol` — «Benceno con dos grupos OH en los carbonos 1 y 3: benceno-1,3-diol.» [I-51a3a]
- T-50 `hidroquinona` — «Benceno con dos grupos OH en los carbonos 1 y 4: benceno-1,4-diol.» [I-51a3a]
- T-51 `formaldehído` — «Un solo carbono con un grupo CHO: metanal.» [I-51c3a]
- T-52 `acetaldehído` — «Cadena de 2 carbonos con un grupo CHO: etanal. Admite un fenil en el carbono 2: 2-(4-metilfenil)acetaldehído.» [I-51c3a]
- T-53 `acetona` — «Cadena de 3 carbonos con el C=O en el carbono del medio: propanona.» [I-51c3a]
- T-54 `acetofenona` — «Un grupo C=O unido a un metilo y a un benceno: 1-feniletan-1-ona.» [I-51c3a]
- T-55 `fenilacetaldehído` — «Etanal con un fenil en el carbono 2: 2-feniletanal.» [I-51c3a]
- T-56 `ftalaldehído` — «Benceno con dos grupos CHO en carbonos vecinos: benceno-1,2-dicarbaldehído. Admite ramas en el anillo: 4-metilftalaldehído.» [I-51c3a]
- T-57 `isoftalaldehído` — «Benceno con dos grupos CHO en los carbonos 1 y 3: benceno-1,3-dicarbaldehído.» [I-51c3a]
- T-58 `tereftalaldehído` — «Benceno con dos grupos CHO en los carbonos 1 y 4: benceno-1,4-dicarbaldehído.» [I-51c3a]
- T-59 `fórmico` — «Un solo carbono con un grupo COOH: ácido metanoico. Va detrás de «ácido»: ácido fórmico.» [I-51d2]
- T-60 `acético` — «Cadena de 2 carbonos con un grupo COOH: ácido etanoico. Va detrás de «ácido»: ácido acético. Admite un fenil en el carbono 2: ácido 2-(3-metilfenil)acético.» [I-51d2]
- T-61 `oxálico` — «Cadena de 2 carbonos con un grupo COOH en cada uno: ácido etanodioico. Va detrás de «ácido»: ácido oxálico.» [I-51d2]
- T-62 `fenilacético` — «Ácido etanoico con un fenil en el carbono 2: ácido 2-feniletanoico. Va detrás de «ácido»: ácido fenilacético.» [I-51d2]
- T-63 `ftálico` — «Benceno con dos grupos COOH en carbonos vecinos: ácido benceno-1,2-dicarboxílico. Va detrás de «ácido» y admite ramas en el anillo: ácido 4-metilftálico.» [I-51d2]
- T-64 `isoftálico` — «Benceno con dos grupos COOH en los carbonos 1 y 3: ácido benceno-1,3-dicarboxílico. Va detrás de «ácido»: ácido isoftálico.» [I-51d2]
- T-65 `tereftálico` — «Benceno con dos grupos COOH en los carbonos 1 y 4: ácido benceno-1,4-dicarboxílico. Va detrás de «ácido»: ácido tereftálico.» [I-51d2]
- T-66 `formiato` — «Un solo carbono con un grupo COO: metanoato. Detrás va el grupo unido al oxígeno: formiato de metilo.» [I-52a2a]
- T-67 `acetato` — «Cadena de 2 carbonos con un grupo COO: etanoato. Detrás va el grupo unido al oxígeno: acetato de etilo. Admite un fenil en el carbono 2: 2-(4-metilfenil)acetato de etilo.» [I-52a2a]
- T-68 `fenilacetato` — «Etanoato con un fenil en el carbono 2: 2-feniletanoato. Detrás va el grupo unido al oxígeno: fenilacetato de metilo.» [I-52a2a]
- T-69 `acetonitrilo` — «Cadena de 2 carbonos con un grupo C≡N: etanonitrilo. Admite un fenil en el carbono 2: 2-(4-metilfenil)acetonitrilo.» [I-52b2]
- T-70 `fenilacetonitrilo` — «Etanonitrilo con un fenil en el carbono 2: 2-feniletanonitrilo.» [I-52b2]
- T-71 `ftalonitrilo` — «Benceno con dos grupos C≡N en carbonos vecinos: benceno-1,2-dicarbonitrilo. Admite ramas en el anillo: 4-metilftalonitrilo.» [I-52b2]
- T-72 `anilina` — «Benceno con un grupo NH₂: bencenamina. Admite ramas en el anillo y, con «N», en el nitrógeno: 4-cloroanilina, N-metilanilina, N,4-dimetilanilina.» [I-52c3]
- T-73 `bencilamina` — «Un carbono con un grupo NH₂ y un fenil: fenilmetanamina.» [I-52c3]
- T-74 `formamida` — «Un solo carbono con un grupo amida: metanamida. Admite ramas en el nitrógeno, con «N»: N,N-dimetilformamida.» [I-52d3]
- T-75 `acetamida` — «Cadena de 2 carbonos con un grupo amida: etanamida. Admite ramas en el nitrógeno, con «N» (N-metilacetamida), o un fenil en el carbono 2 (2-fenilacetamida, 2-(4-metilfenil)acetamida).» [I-52d3]
- T-76 `ftalamida` — «Benceno con dos grupos amida en carbonos vecinos: benceno-1,2-dicarboxamida. Admite ramas en el anillo: 4-metilftalamida.» [I-52d3]

## 2. Verdicts and the results panel

After «Dibujar», a name the app understands is drawn and judged in the
results panel, above «Se llama:». The other verdicts stay in the dialog
(§3, §4).

- V-1 The name is the app's — «¡Correcto!» [I-47b · `index.js`
  `VERDICT_TEXTS.correct`]
- V-2 The name is the app's and the molecule also has a traditional name —
  «¡Correcto! También se llama «acetona» (nombre tradicional, que la IUPAC
  (2013) acepta).» (the label in brackets is the forward engine's) [I-47b ·
  `index.js` `readName()`]
- V-3 The name is another valid form — «¡Correcto! «o-xileno» es una forma
  válida (nombre tradicional, que la IUPAC (2013) acepta). El nombre que doy
  primero es «1,2-dimetilbenceno».» [I-47b · `readName()`]
- V-4 Numbers left out, one molecule fits — «Casi: faltan los números. Se
  escribe «2-metilprop-1-eno».»; when the filled-in name is another valid
  form: «Casi: faltan los números. Se escribe «4-(propan-2-il)heptano»
  (nombre preferido por la IUPAC (2013)). El nombre que doy primero es
  «4-isopropilheptano».» [I-47c · `VERDICT_TEXTS.almost`]
- V-5 Another name — «Esta es la molécula que describe tu nombre, pero se
  llama «propano».», then the diagnosis (§5), then «Pulsa «Ver paso a paso»
  para ver por qué.» [I-47b; the diagnosis between the two sentences I-49b ·
  `VERDICT_TEXTS.stepByStep`]
- V-6 Old-style numbers (`2-buteno`) — the note «Es la forma antigua de
  escribirlo; hoy se escribe «but-2-eno».» (left out when the diagnosis
  OLD_STYLE already says it) [I-47b · `VERDICT_TEXTS.oldStyle`]
- V-7 The first line of the verdict block — «Tu nombre: metiletano» (the
  block is read as «Tu nombre») [I-48b · `draw-name.js` `STUDENT_LABEL`,
  `results.js`]
- V-8 The button beside a diagnosis that opens the explanation at its step —
  «Ver el paso» [I-49b · `DIAGNOSIS_STEP_LABEL`]
- V-9 When the explanation follows the student's style of prefixes — «Con
  las ramas escritas como en tu nombre, se escribe
  «4-metil-6-(propan-2-il)nonano» (nombre preferido por la IUPAC (2013)). El
  paso a paso usa ese nombre.» [I-49b · `styleLine()`]
- V-10 The legend of the two chains marked on the drawing — read as «Qué se
  ve en el dibujo»; entries «Cadena principal» (solid) and «Tu cadena»
  (striped), «Tu cadena (es la misma)» when the student chose the right
  chain but numbered it otherwise; on a ring «Cadena principal (el
  anillo)», «Tu anillo», «Tu anillo (es el mismo)» [I-49b; the ring entries
  I-50d · `LEGEND_TEXTS`]

## 3. Structural errors (the dialog: nothing is drawn, the wrong tiles are marked in red)

When the tiles do not make a readable name, or make one that cannot be built, «Dibujar» draws nothing: the
dialog shows one message in the error style and marks the offending tiles in red. If the name has several
mistakes, every one of them marks its tiles, but only the first one (in tile order) is shown as text. The
names in parentheses inside the messages are examples the app writes itself. Where a message has variable
parts, one rendered example is quoted and the other wordings follow as «…» fragments.

### 3.1 Parser errors by code

- E-1 **EMPTY** — «Elige fichas para formar un nombre.» («Dibujar» with no tiles; nothing is marked.) [I-47a · parse.js]
- E-2 **NO_PARENT** — «Falta la cadena principal: una raíz (met, et, prop…) y su terminación (ano, eno, ino).» (The name has no parent at all, e.g. only «2», «di», «o» or «ácido».) [I-47a · parse.js]
- E-3 **ROOT_END** — «Después de «but» va una terminación: «ano», «eno» o «ino» si es la cadena principal, o «il» si es una rama.» Variants: after a ring root, «Después de «ciclohex» va una terminación: «ano», «eno» o «ino» si es el anillo principal, o «il» si es una rama.» (I-50a); in an ester's O-bound side, «Después de «met» va «ilo» si es el grupo unido al oxígeno del éster (etanoato de metilo, etanoato de propan-2-ilo), o «il» si es una rama de ese grupo.» (I-52a1). [I-47a, I-50a, I-52a1 · parse.js]
- E-4 **ENDS_WITH_BRANCH** — «El nombre acaba en una rama («metil»): falta la cadena principal detrás.» The quoted part is the student's last prefix without its numbers («(2-metilpropil)», «(butan-1-il)», «fenil»). For a group that is not a carbon branch: «El nombre acaba en un grupo («cloro»): falta la cadena principal detrás.», with «cloro» (I-51a1), «hidroxi» (I-51a2), «metoxi» (I-51b1), «oxo» (I-51c1), «ciano» (I-52b1), «amino», «(metilamino)» (I-52c2), «carbamoil», «(metilcarbamoil)» (I-52d2). [I-47a, I-51a1, I-51a2, I-51b1, I-51c1, I-52b1, I-52c2, I-52d2 · parse.js]
- E-5 **BRANCH_OPEN** — «Falta cerrar la rama compuesta.» [I-47a · parse.js]
- E-6 **LOCANT_COUNT** (numbers against the multiplier) — «Has puesto 2 números (2,3), pero «tri» quiere decir tres grupos.»; «Con dos números hace falta «di».» Variants: before a compound branch «Con dos números hace falta «bis».»; from eleven numbers on, the count in digits, «Con 11 números hace falta «undeca».»; «Con 100 números hace falta un multiplicador.» exists in the code but cannot be reached under the 100-tile cap. With the letter N (I-52c4a): «Has puesto 1 letra N (N), pero «di» quiere decir dos grupos.»; «Has puesto 1 letra N y 1 número (N,2), pero «tri» quiere decir tres grupos.»; «Has puesto 2 letras N y 1 número (N,N,2), pero «di» quiere decir dos grupos.»; «Con una letra N y un número hace falta «di».»; «Con dos letras N hace falta «di».» (changed since the I-52c1 draft, which counted the N as a number: «Has puesto 1 número (N)…».) [I-47a, I-52c1, I-52c4a · parse.js]
- E-7 **LOCANT_COUNT** (two numbers before «il») — «Una rama se une a la cadena por un solo carbono: delante de «il» va un solo número.» The ending quoted is the student's («iliden», «oil»). In an ester's O-bound group: «El grupo unido al oxígeno se une a él por un solo carbono: delante de «ilo» va un solo número.» (I-52a1). [I-47a, I-52a1 · parse.js]
- E-8 **LOCANT_COUNT** (xileno) — «Con «xileno» van dos números, los de sus dos metilos (1,2-xileno), o una letra (o-xileno).» [I-50c · parse.js]
- E-9 **LEGACY** — «Con la forma antigua no sé a qué enlace va cada número: escríbelos detrás de la raíz (hex-1-en-3-ino).» (Old-style numbers before the root that cannot be assigned to the bonds: «1,3-hexenino», or a count that does not match.) [I-47a · parse.js]
- E-10 **RING_ROOT** — «Después de «ciclo» va una raíz que dice cuántos carbonos tiene el anillo: ciclopropano, ciclohexano, ciclohexil…» [I-50a · parse.js]
- E-11 **RING_SIZE** — «Un anillo tiene por lo menos 3 carbonos: el más pequeño es el ciclopropano.» («cicloetano», «ciclometano») [I-50a · parse.js]
- E-12 **BENZENE_BONDS** — «El benceno no lleva números propios: sus enlaces dobles no se numeran. Los números van delante de cada rama (1,2-dimetilbenceno).» («1,2-benceno», «benceno-1,3,5-trieno») [I-50b · parse.js]
- E-13 **TEMPLATE_LOCANTS** (numbers or a letter on a word that places its own groups) — ««tolueno» ya dice dónde va su metilo, en el carbono 1: no lleva números ni letras propios.» The middle part names the word's own groups and where they are: «estireno» «va su etenilo, en el carbono 1», «mesitileno» «van sus tres metilos, en los carbonos 1, 3 y 5» (I-50c); «fenol» «va su grupo OH» (I-51a2); «catecol», «pirocatecol» «van sus dos grupos OH, en los carbonos 1 y 2», «resorcinol» «…1 y 3», «hidroquinona» «…1 y 4» (I-51a3a); «anisol» «va su grupo metoxi» (I-51b1); «benzaldehído» «va su grupo CHO» (I-51c1); «formaldehído», «acetaldehído» «va su grupo CHO, en el carbono 1», «acetona» «va su grupo C=O, en el carbono 2», «acetofenona» «van su grupo C=O y su fenilo, en el carbono 1», «fenilacetaldehído» «van su grupo CHO y su fenilo, en los carbonos 1 y 2», «ftalaldehído» «van sus dos grupos CHO, en los carbonos 1 y 2» («isoftalaldehído» 1 y 3, «tereftalaldehído» 1 y 4) (I-51c3a); «ácido benzoico» «va su grupo COOH» (I-51d1); «ácido fórmico», «ácido acético» «va su grupo COOH, en el carbono 1», «ácido oxálico» «van sus dos grupos COOH, en los carbonos 1 y 2», «ácido fenilacético» «van su grupo COOH y su fenilo, en los carbonos 1 y 2», «ácido ftálico» («isoftálico», «tereftálico») (I-51d2); «benzoato» «va su grupo COO» (I-52a1); «formiato», «acetato» «va su grupo COO», «fenilacetato» «van su grupo COO y su fenilo, en los carbonos 1 y 2» (I-52a2a); «benzonitrilo» «va su grupo C≡N» (I-52b1); «acetonitrilo», «fenilacetonitrilo», «ftalonitrilo» «van sus dos grupos C≡N, en los carbonos 1 y 2» (I-52b2); «anilina» «va su grupo NH₂», «bencilamina» «van su grupo NH₂ y su fenilo, en el carbono 1» (I-52c3); «benzamida» «va su grupo amida» (I-52d1); «formamida», «acetamida» «va su grupo amida», «ftalamida» «van sus dos grupos amida, en los carbonos 1 y 2» (I-52d3). [I-50c, I-51a2, I-51a3a, I-51b1, I-51c1, I-51c3a, I-51d1, I-51d2, I-52a1, I-52a2a, I-52b1, I-52b2, I-52c3, I-52d1, I-52d3 · parse.js]
- E-14 **TEMPLATE_LOCANTS** (numbers on «cresol») — «Con «cresol» no van números: una letra dice dónde está su metilo respecto al grupo OH (o-cresol, m-cresol o p-cresol).» [I-51a3a · parse.js]
- E-15 **TEMPLATE_LOCANTS** / **POSITIONAL** («cresol» with more groups, with numbers or with a letter) — «El nombre «cresol» no admite más sustituyentes, ni con números ni con letras: escribe el nombre a partir de «fenol», con el grupo OH en el carbono 1 y números para todos los demás grupos (2-cloro-4-metilfenol).» («2-cloro-4-cresol», «2-cloro-p-cresol») [I-51a3a · parse.js]
- E-16 **POSITIONAL** (a letter where there is no benzene) — «Las letras «o», «m» y «p» (orto, meta y para) solo se usan con el benceno, para decir dónde están sus dos grupos (o-dimetilbenceno); aquí van números.» (On a chain or «ciclo» parent, «o-metilhexano»; since I-51c3a also on a prefix of an open-chain retained word such as «acetona».) [I-50c, I-51c3a · parse.js]
- E-17 **POSITIONAL** (a letter inside a compound branch) — «Dentro de una rama no se usan «o», «m» ni «p»: escribe los números, como en (4-metilfenil).» [I-50c · parse.js]
- E-18 **POSITIONAL** (a letter right before «benceno») — «Las letras «o», «m» y «p» van delante de los dos grupos del benceno que sitúan (o-dimetilbenceno) o delante de «xileno» o «cresol» (p-xileno, p-cresol).» («o-benceno», «2-metil-o-benceno»; the same sentence is the TILE_ORDER hint E-48.) (changed since the I-50c draft: «o «cresol»… p-cresol» added in I-51a3a) [I-50c, I-51a3a · parse.js]
- E-19 **POSITIONAL** (numbers and a letter together) — «Escribe los números (1,2-dimetilbenceno) o la letra (o-dimetilbenceno), no las dos cosas.» Before «xileno»: «Escribe los números (1,2-xileno) o la letra (o-xileno), no las dos cosas.» [I-50c · parse.js]
- E-20 **POSITIONAL** (a letter with a single group) — «Las letras «o», «m» y «p» dicen dónde está el segundo de dos grupos del benceno; con un solo grupo no hacen falta (metilbenceno).» [I-50c · parse.js]
- E-21 **POSITIONAL** (a letter on «benceno» with a group written after it) — «Con un grupo escrito detrás de «benceno» no se usan «o», «m» ni «p»: escribe los números, o usa «fenol», de la fila «Anillos», con la letra (p-metilfenol).» («p-clorobencenol») The word and its example follow the group: «benzaldehído» (p-metilbenzaldehído), «ácido benzoico» (ácido p-metilbenzoico), «benzoato» (p-metilbenzoato de metilo), «benzonitrilo» (p-metilbenzonitrilo), «benzamida» (p-metilbenzamida); the word of the group's kind also after a suffix that cannot follow «benceno» («p-clorobencenal» → «benzaldehído»), and with no whole word for the group («p-clorobencenona») the message ends at «escribe los números.» (I-54b review). (changed in I-54b: it was «Con dos grupos distintos en el benceno no se usan «o», «m» ni «p»: escribe los números (1-etil-2-metilbenceno).», shown for every letter beside two different groups; since I-54b two different groups on «benceno» take one letter, O-3…O-5.) [I-50c, I-54b · parse.js]
- E-22 **POSITIONAL** (a letter with three or more ring positions) — «Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu nombre pone tres (contando el metilo del tolueno): escribe los números (1,2,4-trimetilbenceno).» Variants: on «benceno» itself, no parenthesis («…y tu nombre pone tres: escribe los números…»); the count «cuatro», «cinco»…; the parenthesis counts the word's own groups: «(contando los dos metilos del xileno)», «(contando los tres metilos del mesitileno)», «(contando el etenilo del estireno)» (I-50c); «(contando el grupo OH del fenol)» (I-51a2); «(contando los dos grupos OH del catecol)», «…de la hidroquinona» (I-51a3a); «(contando el grupo metoxi del anisol)» (I-51b1); «(contando el grupo CHO del benzaldehído)» (I-51c1); «(contando los dos grupos CHO del ftalaldehído)» (I-51c3a); «(contando el grupo COOH del ácido benzoico)» (I-51d1); «(contando los dos grupos COOH del ácido ftálico)» (I-51d2); «(contando el grupo C≡N del benzonitrilo)» (I-52b1); «(contando los dos grupos C≡N del ftalonitrilo)» (I-52b2); «(contando el grupo NH₂ de la anilina)» (I-52c3); «(contando el grupo amida de la benzamida)» (I-52d1); «(contando los dos grupos amida de la ftalamida)» (I-52d3). On an amine or an amide whose name has a carbon group without numbers, a sentence is added: «Si un grupo va unido al nitrógeno, escribe «N» delante (N-etil-p-metilanilina).» (I-52c3) / «…(N-etil-p-metilbenzamida).» (I-52d1). [I-50c, I-51a2, I-51a3a, I-51b1, I-51c1, I-51c3a, I-51d1, I-51d2, I-52b1, I-52b2, I-52c3, I-52d1, I-52d3 · parse.js]
- E-23 **POSITIONAL** (a letter in an ester's O-bound group) — «En el grupo unido al oxígeno de un éster no se usan «o», «m» ni «p»: escribe los números, como en etanoato de 4-metilfenilo.» [I-52a1 · parse.js]
- E-24 **POSITIONAL** («N» and a letter on one prefix) — ««N» y las letras «o», «m» y «p» no van juntas delante de un mismo grupo: con un grupo en el nitrógeno y otro en el anillo, escribe «N» para el del nitrógeno y un número para el del anillo (N,4-dimetilanilina).» On «benzamida» or «ftalamida»: «…(N,4-dimetilbenzamida).» (changed since the I-52c3 draft, which ended «…escribe los números (N,4-dimetilanilina).»; reworded in I-52c4b; amide example I-52d1) [I-52c3, I-52c4b, I-52d1, I-52d3 · parse.js]
- E-25 **POSITIONAL** (a letter on «bencenamina») — «Con «bencenamina» no se usan «o», «m» ni «p»: escribe los números (4-metilbencen-1-amina) o usa «anilina», de «Nombres tradicionales» (p-metilanilina).» [I-52c3 · parse.js]
- E-26 **ETHER_GROUPS** — «Delante de «éter» van los dos grupos unidos al oxígeno, por orden alfabético (etil metil éter), o uno solo con «di» delante si los dos son iguales (dietil éter).» (no group before «éter»). With one or three groups: «Un éter lleva dos grupos unidos al oxígeno y tu nombre solo pone uno: escribe dos, por orden alfabético (etil metil éter), o uno solo con «di» delante si los dos son iguales (dietil éter).»; «…y tu nombre pone tres: escribe dos, …». [I-51b2 · parse.js]
- E-27 **ACID_WORD** («ácido» with no acid ending) — «La palabra «ácido» va delante del nombre de un ácido, que termina en «oico» (ácido butanoico), en «carboxílico» (ácido ciclohexanocarboxílico) o en «benzoico» (ácido benzoico).» («ácido butanal») [I-51d1 · parse.js]
- E-28 **ACID_WORD** (an acid ending without «ácido») — «El nombre de un ácido empieza por la palabra «ácido»: pon esa ficha al principio, como en ácido butanoico.» With a retained acid word the example is the student's own word: «…como en ácido acético.» (I-51d2). [I-51d1, I-51d2 · parse.js]
- E-29 **ACID_WORD** («ácido» before a retained name that is not an acid's) — «La palabra «ácido» va delante del nombre de un ácido, y «acetona» no es el nombre de un ácido. Los nombres tradicionales que van detrás de «ácido» son fórmico, acético, oxálico, fenilacético, ftálico, isoftálico y tereftálico (ácido acético).» [I-51d2 · parse.js]
- E-30 **ACID_WORD** («ácido» before a retained ester word) — «La palabra «ácido» va delante del nombre de un ácido, y «acetato» es el nombre de la parte ácida de un éster, que se escribe sin «ácido»: acetato de metilo.» (also «formiato», «fenilacetato») [I-52a2a · parse.js]
- E-31 **ESTER_GROUPS** — No O-bound group: «Detrás de «oato» va el grupo unido al oxígeno del éster, acabado en «ilo» (la palabra «de» la pone la app): et, ano, oato, met e ilo dan etanoato de metilo.»; the quoted ending is the student's («dioato», «carboxilato», «dicarboxilato», «benzoato»), always with the «etanoato de metilo» example (worth checking: with «benzoato» or «carboxilato» the example does not use the student's ending). With a retained ester word: «Detrás de «acetato» va el grupo unido al oxígeno del éster, acabado en «ilo» (la palabra «de» la pone la app): acetato, met e ilo dan acetato de metilo.» (I-52a2a). Too many groups for one –COO–: «Con «oato» hay un solo grupo COO, que lleva un solo grupo unido al oxígeno, y tu nombre pone dos: etanoato de metilo.» («Con «formiato» … formiato de metilo.», I-52a2a). Wrong number for two –COO–: «Con «dioato» hay dos grupos COO, y cada uno lleva su grupo unido al oxígeno; tu nombre pone uno: escribe dos, por orden alfabético (propanodioato de etilo y metilo), o uno solo con «di» delante si son iguales (butanodioato de dimetilo).» («…tu nombre pone tres: …»). [I-52a1, I-52a2a · parse.js]
- E-32 **ESTER_SUFFIX** (a group ending in «ilo» after a parent that is no ester) — «El grupo acabado en «ilo» es el que va unido al oxígeno de un éster, detrás de la parte ácida, y el nombre de esa parte termina en «oato» (etanoato de metilo), en «carboxilato» (ciclohexanocarboxilato de etilo) o en «benzoato» (benzoato de metilo).» («etano de metilo», «ácido etanoico de metilo») [I-52a1 · parse.js]
- E-33 **ESTER_SUFFIX** (a retained acid name before the O-bound group) — «El grupo acabado en «ilo» va unido al oxígeno de un éster, y «ácido acético» es el nombre de un ácido. En el éster, el ácido acético se nombra «acetato», sin la palabra «ácido»: acetato de metilo.» (also «ácido fórmico» → «formiato», «ácido fenilacético» → «fenilacetato») [I-52a2a · parse.js]

### 3.2 «Esta ficha no puede ir aquí: …» hints (TILE_ORDER), by tile

Every TILE_ORDER message starts «Esta ficha no puede ir aquí: » when it marks one tile and «Estas fichas no pueden ir aquí: » when it marks several (I-47a); the hint after the colon depends on the tile and the place. All are in parse.js unless marked build.js.

**Hydrocarbons**

- E-34 **TILE_ORDER · numbers with no branch or ending after them** — «Esta ficha no puede ir aquí: los números van delante de una rama (2-metil) o de una terminación (but-2-eno).» [I-47a · parse.js]
- E-35 **TILE_ORDER · «di», «tri»… with nothing to multiply** — «Esta ficha no puede ir aquí: «di», «tri»… van delante de una rama (dimetil) o de una terminación (buta-1,3-dieno).» [I-47a · parse.js]
- E-36 **TILE_ORDER · «bis», «tris»… before a simple branch** — «Esta ficha no puede ir aquí: «bis», «tris»… van delante de una rama compuesta: bis(2-metilpropil).» [I-47a · parse.js]
- E-37 **TILE_ORDER · «ano», «eno», «ino» without a root** — «Esta ficha no puede ir aquí: «ano», «eno» e «ino» van detrás de una raíz (butano, but-2-eno).» [I-47a · parse.js]
- E-38 **TILE_ORDER · «il», «iliden» without a root** — «Esta ficha no puede ir aquí: «il» e «iliden» van detrás de la raíz de una rama (metil, metiliden).» [I-47a · parse.js]
- E-39 **TILE_ORDER · «)» with no open branch** — «Esta ficha no puede ir aquí: no hay ninguna rama compuesta abierta que cerrar.» [I-47a · parse.js]
- E-40 **TILE_ORDER · «)» before the branch's own chain** — «Esta ficha no puede ir aquí: antes de cerrar la rama compuesta va su propia cadena, acabada en «il» (2-metilpropil).» [I-47a · parse.js]
- E-41 **TILE_ORDER · tiles after the parent** — «Estas fichas no pueden ir aquí: el nombre termina con la cadena principal (la raíz y su terminación); las ramas van delante.» [I-47a · parse.js]
- E-42 **TILE_ORDER · «ano» before «il»** — «Esta ficha no puede ir aquí: en una rama sin número no se pone «ano»: metil, no metanil.» [I-47a · parse.js]
- E-43 **TILE_ORDER · «di» before the root (old style)** — «Esta ficha no puede ir aquí: «di», «tri»… van detrás de la raíz, delante de «eno» o «ino» (buta-1,3-dieno).» [I-47a · parse.js]
- E-44 **TILE_ORDER · a third ending** — «Estas fichas no pueden ir aquí: una cadena lleva como mucho dos terminaciones, una de «eno» y otra de «ino» (hexa-1,3-dien-5-ino).» [I-47a · parse.js]
- E-45 **TILE_ORDER · «bis» before «eno» or «ino»** — «Esta ficha no puede ir aquí: delante de «eno» o «ino» va «di», «tri»…, no «bis» ni «tris».» [I-47a · parse.js]
- E-46 **TILE_ORDER · a retained branch word given numbers or branches of its own** — «Esta ficha no puede ir aquí: «isopropil» ya es una rama entera y no lleva números ni ramas propias.» Same for «isopropiliden», «tert-butil», «formil» (I-51c1), «carboxi» (I-51d1), «ciano» (I-52b1). For «acetil» a sentence is added: «Esta ficha no puede ir aquí: «acetil» ya es una rama entera y no lleva números ni ramas propias. Con ramas propias, el grupo se escribe a partir de «etanoil», como en (2-cloroetanoil).» (I-51c2). [I-47b, I-51c1, I-51c2, I-51d1, I-52b1 · build.js]

**Rings and benzene**

- E-47 **TILE_ORDER · «benceno» inside a branch** — «Esta ficha no puede ir aquí: «benceno» es el anillo principal y va al final del nombre; como rama, el benceno se escribe «fenil».» [I-50b · parse.js]

**Retained names and o/m/p letters**

- E-48 **TILE_ORDER · a letter with no branch after it** — «Esta ficha no puede ir aquí: las letras «o», «m» y «p» van delante de los dos grupos del benceno que sitúan (o-dimetilbenceno) o delante de «xileno» o «cresol» (p-xileno, p-cresol).» («o,1,2-xileno») (changed since the I-50c draft: «o «cresol»… p-cresol» added in I-51a3a) [I-50c, I-51a3a · parse.js]
- E-49 **TILE_ORDER · «di», «tri»… before a whole-word parent** — «Esta ficha no puede ir aquí: «di», «tri»… van delante de una rama (dimetil), no delante de «tolueno».» Any retained or benzene word: «…no delante de «fenol».» (I-51a2), «…«catecol».» (I-51a3a), «…«anisol».», «…«acetona».»… [I-50c, I-51a2 and later · parse.js]
- E-50 **TILE_ORDER · a retained hydrocarbon name inside a branch** — «Esta ficha no puede ir aquí: «tolueno» es el nombre de toda la molécula y va al final; dentro de una rama, el anillo es «fenil», como en (4-metilfenil).» (also «estireno», «xileno», «mesitileno») [I-50c · parse.js]

**Halogens**: no hint of their own; «cloro», «fluoro», «bromo» and «yodo» appear in the ether and amine class-name hints (E-64, E-133).

**Alcohols and phenols**

- E-51 **TILE_ORDER · «ol» out of place** — «Esta ficha no puede ir aquí: «ol» va al final del nombre, detrás de la terminación de la cadena principal (propan-2-ol, butano-1,4-diol); en una rama, el grupo OH se escribe «hidroxi».» [I-51a2 · parse.js]
- E-52 **TILE_ORDER · «bis» before a suffix** — «Esta ficha no puede ir aquí: delante de «ol» va «di», «tri»…, no «bis» ni «tris».» The suffix quoted is the student's: «ona», «al», «carbaldehído» (I-51c1), «oico» (I-51d1), «oato» (I-52a1), «nitrilo» (I-52b1), «amina» (I-52c1), «amida» (I-52d1)… [I-51a2, I-51c1 and later · parse.js]
- E-53 **TILE_ORDER · «fenol» inside a branch** — «Esta ficha no puede ir aquí: «fenol» es el nombre de toda la molécula y va al final; dentro de una rama, el anillo con su grupo OH se escribe con «hidroxi» y «fenil», como en (4-hidroxifenil).» [I-51a2 · parse.js]
- E-54 **TILE_ORDER · «1(n)» outside a ring's «eno» or «ino»** — «Esta ficha no puede ir aquí: «1(n)» es el número del enlace que cierra un anillo, del último carbono al 1, y solo va delante de «eno» o «ino» de un anillo (ciclohex-1(6)-eno-1,2,4-triol).» [I-51a2 · parse.js]
- E-55 **TILE_ORDER · a retained phenol inside a branch** — «Esta ficha no puede ir aquí: «catecol» es el nombre de toda la molécula y va al final; dentro de una rama, el anillo es «fenil» y cada grupo OH se escribe «hidroxi», como en (4-hidroxifenil).» (also «cresol», «pirocatecol», «resorcinol», «hidroquinona») [I-51a3a · parse.js]

**Ethers**

- E-56 **TILE_ORDER · «oxi» out of place** — «Esta ficha no puede ir aquí: «oxi» va justo detrás de una rama acabada en «il», y la une a la cadena por un oxígeno: met, il y oxi dan metoxi; también detrás de «isopropil», «tert-butil» o «fenil» (isopropoxi), y en una rama compuesta, antes de cerrarla: (2-metilpropoxi).» [I-51b1 · parse.js]
- E-57 **TILE_ORDER · «oxi» after a doubly bonded branch** — «Esta ficha no puede ir aquí: «oxi» no va detrás de «iliden»: el oxígeno se une a la rama por un enlace sencillo, así que la rama acaba en «il» (metoxi).» (also «…detrás de «isopropiliden»…») [I-51b1 · parse.js]
- E-58 **TILE_ORDER · «anisol» inside a branch** — «Esta ficha no puede ir aquí: «anisol» es el nombre de toda la molécula y va al final; dentro de una rama, el anillo es «fenil» y su grupo metoxi se escribe «metoxi», como en (4-metoxifenil).» [I-51b1 · parse.js]
- E-59 **TILE_ORDER · «éter» inside a branch** — «Esta ficha no puede ir aquí: «éter» va al final del nombre, detrás de los dos grupos unidos al oxígeno (etil metil éter); dentro de una rama, el oxígeno se escribe con «oxi» (metoxi).» [I-51b2 · parse.js]
- E-60 **TILE_ORDER · tiles after «éter»** — «Estas fichas no pueden ir aquí: el nombre termina con «éter»; los dos grupos unidos al oxígeno van delante (etil metil éter).» [I-51b2 · parse.js]
- E-61 **TILE_ORDER · numbers or a letter in a name with «éter»** — «Esta ficha no puede ir aquí: en un nombre con «éter» no hay cadena principal que numerar: los grupos no llevan números delante (etil metil éter). Si un grupo lleva sus propias ramas, va en una rama compuesta, con sus números dentro: (2-cloroetil) metil éter.» [I-51b2 · parse.js]
- E-62 **TILE_ORDER · «di» misplaced in a name with «éter»** — «Esta ficha no puede ir aquí: «di» va delante del grupo que se repite: di, et, il y éter dan dietil éter.» [I-51b2 · parse.js]
- E-63 **TILE_ORDER · «oxi» in a name with «éter»** — «Esta ficha no puede ir aquí: en un nombre con «éter», el oxígeno ya lo dice «éter»: los grupos acaban en «il», sin «oxi» (etil metil éter).» [I-51b2 · parse.js]
- E-64 **TILE_ORDER · a one-atom group in a name with «éter»** — «Esta ficha no puede ir aquí: «cloro» no es un grupo de carbonos: en un nombre con «éter», el oxígeno lleva dos grupos de carbonos (etil metil éter). Si un grupo lleva «cloro», va en una rama compuesta: (2-cloroetil) metil éter.» (also «fluoro», «bromo», «yodo», «hidroxi», and since I-51c1 «oxo»; the example stays «(2-cloroetil)» for every word) [I-51b2, I-51c1 · parse.js]
- E-65 **TILE_ORDER · a doubly bonded group in a name with «éter»** — «Esta ficha no puede ir aquí: en un éter, cada grupo se une al oxígeno por un enlace sencillo, así que acaba en «il» (etil metil éter), no en «iliden».» (also «isopropiliden») [I-51b2 · parse.js]

**Aldehydes and ketones**

- E-66 **TILE_ORDER · «al» after a ring** — «Esta ficha no puede ir aquí: «al» solo va detrás de una cadena: en un anillo, el grupo CHO va unido a un carbono del anillo y se escribe «carbaldehído» (ciclohexanocarbaldehído).» [I-51c1 · parse.js]
- E-67 **TILE_ORDER · «al» after «benceno»** — «Esta ficha no puede ir aquí: «al» no va detrás de «benceno»: el benceno con un grupo CHO es el «benzaldehído», y con varios se usa «carbaldehído» (benceno-1,4-dicarbaldehído).» [I-51c1 · parse.js]
- E-68 **TILE_ORDER · numbers before «al»** — «Esta ficha no puede ir aquí: el grupo CHO de «al» va siempre en un extremo de la cadena, en el carbono 1 (y en el último, con «dial»), así que «al» no lleva números: butanal, butanodial.» [I-51c1 · parse.js]
- E-69 **TILE_ORDER · «al» out of place** — «Esta ficha no puede ir aquí: «al» va al final del nombre, detrás de la terminación de la cadena principal (butanal, butanodial); en una rama, el grupo CHO se escribe con «oxo» ((2-oxoetil)) o, si su carbono no es de la rama, con «formil».» [I-51c1 · parse.js]
- E-70 **TILE_ORDER · «ona» out of place** — «Esta ficha no puede ir aquí: «ona» va al final del nombre, detrás de la terminación de la cadena principal (pentan-2-ona, pentano-2,4-diona); en una rama, el grupo C=O se escribe «oxo».» [I-51c1 · parse.js]
- E-71 **TILE_ORDER · «carbaldehído» out of place** — «Esta ficha no puede ir aquí: «carbaldehído» va al final del nombre, detrás del nombre del anillo principal (ciclohexanocarbaldehído); en una rama, el grupo CHO se escribe «formil».» [I-51c1 · parse.js]
- E-72 **TILE_ORDER · «benzaldehído» inside a branch** — «Esta ficha no puede ir aquí: «benzaldehído» es el nombre de toda la molécula y va al final; dentro de una rama, el anillo es «fenil» y su grupo CHO se escribe «formil», como en (4-formilfenil).» [I-51c1 · parse.js]
- E-73 **TILE_ORDER · «formil» in a name with «éter»** — «Esta ficha no puede ir aquí: «formil» no va en un nombre con «éter»: un grupo CHO unido al oxígeno no forma un éter. Los dos grupos de un éter son cadenas o anillos de carbonos (etil metil éter).» [I-51c1 · parse.js]

**Acyl groups**

- E-74 **TILE_ORDER · «oil» right after a root** — «Esta ficha no puede ir aquí: delante de «oil» va la terminación de la rama, como en la cadena principal: prop, ano y oil dan propanoil; but, 2, eno y oil dan (but-2-enoil).» [I-51c2 · parse.js]
- E-75 **TILE_ORDER · «carbonil» right after a ring root** — «Esta ficha no puede ir aquí: delante de «carbonil» va el nombre del anillo con su terminación: ciclo, hex, ano y carbonil dan (ciclohexanocarbonil).» [I-51c2 · parse.js]
- E-76 **TILE_ORDER · «oil» after a ring** — «Esta ficha no puede ir aquí: en un anillo, el grupo C=O unido a él se escribe con «carbonil», detrás del nombre del anillo: (ciclohexanocarbonil); el del benceno es «benzoil».» [I-51c2 · parse.js]
- E-77 **TILE_ORDER · «carbonil» after a chain** — «Esta ficha no puede ir aquí: «carbonil» va detrás del nombre de un anillo: (ciclohexanocarbonil); en una cadena, la rama acaba en «oil»: propanoil.» [I-51c2 · parse.js]
- E-78 **TILE_ORDER · numbers before «oil»** — «Esta ficha no puede ir aquí: «oil» no lleva números: su grupo C=O está siempre en el carbono 1 de la rama, el que se une a la cadena (propanoil, (but-2-enoil)).» [I-51c2 · parse.js]
- E-79 **TILE_ORDER · «oil» alone** — «Esta ficha no puede ir aquí: «oil» va justo detrás de la terminación de una rama, y la une a la cadena por su carbono 1, el del grupo C=O: prop, ano y oil dan propanoil; para un anillo se usa «carbonil» ((ciclohexanocarbonil)) y para el benceno, «benzoil».» [I-51c2 · parse.js]
- E-80 **TILE_ORDER · «carbonil» alone** — «Esta ficha no puede ir aquí: «carbonil» va justo detrás del nombre de un anillo con su terminación: ciclo, hex, ano y carbonil dan (ciclohexanocarbonil); para el benceno se usa «benzoil», y para una cadena, «oil» (propanoil).» [I-51c2 · parse.js]
- E-81 **TILE_ORDER · «carbonil» after «benceno»** — «Esta ficha no puede ir aquí: «benceno» es el anillo principal y va al final del nombre; como rama unida a un grupo C=O, el benceno se escribe «benzoil».» [I-51c2 · parse.js]
- E-82 **TILE_ORDER · an acyl group in a name with «éter»** — «Esta ficha no puede ir aquí: «acetil» no va en un nombre con «éter»: un grupo C=O unido al oxígeno no forma un éter. Los dos grupos de un éter son cadenas o anillos de carbonos (etil metil éter).» (also «oil», «carbonil», «benzoil») [I-51c2 · parse.js]

**Retained aldehyde and ketone names**

- E-83 **TILE_ORDER · a retained carbonyl name inside a branch** — «Esta ficha no puede ir aquí: «acetona» es el nombre de toda la molécula y va al final; dentro de una rama, el grupo C=O se escribe «oxo» y el grupo CHO, «formil», como en (2-oxoetil) o (4-formilfenil).» (also «formaldehído», «acetaldehído», «acetofenona», «fenilacetaldehído», «ftalaldehído», «isoftalaldehído», «tereftalaldehído») [I-51c3a · parse.js]

**Acids**

- E-84 **TILE_ORDER · «ácido» not first** — «Esta ficha no puede ir aquí: «ácido» va una sola vez, al principio del nombre, delante de todo lo demás: ácido 2-metilpropanoico.» [I-51d1 · parse.js]
- E-85 **TILE_ORDER · «oico» after a ring** — «Esta ficha no puede ir aquí: «oico» solo va detrás de una cadena: en un anillo, el grupo COOH va unido a un carbono del anillo y se escribe «carboxílico» (ácido ciclohexanocarboxílico).» [I-51d1 · parse.js]
- E-86 **TILE_ORDER · «oico» after «benceno»** — «Esta ficha no puede ir aquí: «oico» no va detrás de «benceno»: el benceno con un grupo COOH es el «ácido benzoico», y con varios se usa «carboxílico» (ácido benceno-1,4-dicarboxílico).» [I-51d1 · parse.js]
- E-87 **TILE_ORDER · numbers before «oico»** — «Esta ficha no puede ir aquí: el grupo COOH de «oico» va siempre en un extremo de la cadena, en el carbono 1 (y en el último, con «dioico»), así que «oico» no lleva números: ácido butanoico, ácido butanodioico.» [I-51d1 · parse.js]
- E-88 **TILE_ORDER · «oico» out of place** — «Esta ficha no puede ir aquí: «oico» va al final del nombre, detrás de la terminación de la cadena principal (ácido butanoico, ácido butanodioico); en una rama, el grupo COOH se escribe «carboxi» ((carboximetil)).» [I-51d1 · parse.js]
- E-89 **TILE_ORDER · «carboxílico» out of place** — «Esta ficha no puede ir aquí: «carboxílico» va al final del nombre, detrás del nombre del anillo principal (ácido ciclohexanocarboxílico); en una rama, el grupo COOH se escribe «carboxi».» [I-51d1 · parse.js]
- E-90 **TILE_ORDER · «benzoico» inside a branch** — «Esta ficha no puede ir aquí: «benzoico» es el nombre de toda la molécula y va al final, detrás de «ácido»; dentro de una rama, el anillo es «fenil» y su grupo COOH se escribe «carboxi», como en (4-carboxifenil).» [I-51d1 · parse.js]
- E-91 **TILE_ORDER · «oxi» after «carboxi»** — «Esta ficha no puede ir aquí: «oxi» no va detrás de «carboxi»: un grupo COOH unido a un oxígeno no forma un éter.» [I-51d1 · parse.js]
- E-92 **TILE_ORDER · «carboxi» in a name with «éter»** — «Esta ficha no puede ir aquí: «carboxi» no va en un nombre con «éter»: un grupo COOH unido al oxígeno no forma un éter. Los dos grupos de un éter son cadenas o anillos de carbonos (etil metil éter).» [I-51d1 · parse.js]
- E-93 **TILE_ORDER · a retained acid name inside a branch** — «Esta ficha no puede ir aquí: «acético» es el nombre de toda la molécula y va al final, detrás de «ácido»; dentro de una rama, el grupo COOH se escribe «carboxi», como en (carboximetil) o (4-carboxifenil).» (also «fórmico», «oxálico», «fenilacético», «ftálico», «isoftálico», «tereftálico») [I-51d2 · parse.js]

**Esters**

- E-94 **TILE_ORDER · «oato» after a ring** — «Esta ficha no puede ir aquí: «oato» solo va detrás de una cadena: en un anillo, el grupo COO va unido a un carbono del anillo y se escribe «carboxilato» (ciclohexanocarboxilato de etilo).» [I-52a1 · parse.js]
- E-95 **TILE_ORDER · «oato» after «benceno»** — «Esta ficha no puede ir aquí: «oato» no va detrás de «benceno»: el benceno con un grupo COO es el «benzoato» (benzoato de metilo).» [I-52a1 · parse.js]
- E-96 **TILE_ORDER · numbers before «oato»** — «Esta ficha no puede ir aquí: el grupo COO de «oato» va siempre en un extremo de la cadena, en el carbono 1 (y en el último, con «dioato»), así que «oato» no lleva números: etanoato de metilo, butanodioato de dimetilo.» [I-52a1 · parse.js]
- E-97 **TILE_ORDER · «oato» out of place** — «Esta ficha no puede ir aquí: «oato» va detrás de la terminación de la cadena principal de un éster, y luego el grupo unido al oxígeno, acabado en «ilo» (etanoato de metilo, butanodioato de dimetilo).» [I-52a1 · parse.js]
- E-98 **TILE_ORDER · «carboxilato» out of place** — «Esta ficha no puede ir aquí: «carboxilato» va detrás del nombre del anillo principal de un éster, y luego el grupo unido al oxígeno, acabado en «ilo» (ciclohexanocarboxilato de etilo).» [I-52a1 · parse.js]
- E-99 **TILE_ORDER · «benzoato» inside a branch** — «Esta ficha no puede ir aquí: «benzoato» es el nombre de la parte ácida de un éster y va delante del grupo unido al oxígeno (benzoato de metilo); dentro de una rama, el anillo es «fenil».» [I-52a1 · parse.js]
- E-100 **TILE_ORDER · «ilo» out of place** — «Esta ficha no puede ir aquí: «ilo» acaba el grupo unido al oxígeno de un éster, que va al final del nombre, detrás de la parte ácida (etanoato de metilo); en una rama se escribe «il» (metil).» [I-52a1 · parse.js]
- E-101 **TILE_ORDER · numbers before the O-bound group** — «Esta ficha no puede ir aquí: el grupo unido al oxígeno de un éster no lleva números delante (etanoato de metilo); si se une al oxígeno por otro carbono, ese número va justo delante de «ilo» (etanoato de propan-2-ilo), y sus ramas, con sus números, delante de su cadena (etanoato de 2-cloroetilo).» [I-52a1 · parse.js]
- E-102 **TILE_ORDER · the O-bound group ending in «il»** — «Esta ficha no puede ir aquí: el grupo unido al oxígeno de un éster acaba en «ilo», no en «il»: met e ilo dan metilo (etanoato de metilo).» («etanoato de metil», «etanoato de isopropil», «etanoato de fenil») [I-52a1 · parse.js]
- E-103 **TILE_ORDER · branches with no O-bound chain after them** — «Estas fichas no pueden ir aquí: detrás de las ramas del grupo unido al oxígeno va la cadena de ese grupo, acabada en «ilo»: etanoato de 2-cloroetilo.» [I-52a1 · parse.js]
- E-104 **TILE_ORDER · branches before a multiplied O-bound group** — «Estas fichas no pueden ir aquí: con «di» o «bis» delante, un grupo unido al oxígeno que lleva ramas propias va entero en una rama compuesta, entre «(» y «)»: butanodioato de bis(2-cloroetilo).» [I-52a1 · parse.js]
- E-105 **TILE_ORDER · branches outside an enclosed O-bound group** — «Estas fichas no pueden ir aquí: si el grupo unido al oxígeno va en una rama compuesta, entre «(» y «)», sus ramas van dentro de ella, delante de su cadena: butanodioato de bis(2-cloroetilo).» [I-52a1 · parse.js]
- E-106 **TILE_ORDER · numbers or «di» with no O-bound group after them** — «Esta ficha no puede ir aquí: detrás de los números y de «di», «tri»… va el grupo unido al oxígeno, o una rama suya, y el grupo acaba en «ilo»: etanoato de 2-cloroetilo, butanodioato de dimetilo.» [I-52a1 · parse.js]
- E-107 **TILE_ORDER · «oxi» after «ilo»** — «Esta ficha no puede ir aquí: «oxi» no va detrás de «ilo»: el grupo acabado en «ilo» ya va unido al oxígeno del éster (etanoato de metilo).» [I-52a1 · parse.js]
- E-108 **TILE_ORDER · «benceno» as the O-bound group** — «Esta ficha no puede ir aquí: el benceno unido al oxígeno de un éster se escribe con «fenil» e «ilo»: benzoato de fenilo.» [I-52a1 · parse.js]
- E-109 **TILE_ORDER · «ano» before «ilo»** — «Esta ficha no puede ir aquí: en el grupo unido al oxígeno sin número no se pone «ano»: metilo, no metanilo.» [I-52a1 · parse.js]
- E-110 **TILE_ORDER · a doubly bonded O-bound group** — «Esta ficha no puede ir aquí: el grupo unido al oxígeno de un éster se une a él por un enlace sencillo, así que acaba en «ilo» (metilo), no en «isopropiliden».» [I-52a1 · parse.js]
- E-111 **TILE_ORDER · a functional group as the O-bound group** — «Esta ficha no puede ir aquí: «acetil» no va unido al oxígeno de un éster: el grupo unido al oxígeno es una cadena o un anillo de carbonos que acaba en «ilo» (etanoato de metilo).» Also «formil», «carboxi», «benzoil», «oil», «carbonil» (I-52a1), «ciano» (I-52b1), «amino» (I-52c2), «carbamoil» (I-52d2). [I-52a1, I-52b1, I-52c2, I-52d2 · parse.js]
- E-112 **TILE_ORDER · a retained ester word inside a branch or in the O-bound side** — «Esta ficha no puede ir aquí: «acetato» es el nombre de la parte ácida de un éster y va delante del grupo unido al oxígeno (acetato de metilo).» (also «formiato», «fenilacetato») [I-52a2a · parse.js]

**Ester prefixes**

- E-113 **TILE_ORDER · «carbonil» after an acyl group and «oxi»** — «Esta ficha no puede ir aquí: «carbonil» no va detrás de «acetil» y «oxi»: el oxígeno quedaría entre dos grupos C=O, y eso no es un éster. Un éster como rama es (acetiloxi) o (metoxicarbonil).» (also «formil», «benzoil», «oil», «carbonil») [I-52a2b · parse.js]
- E-114 **TILE_ORDER · «carbonil» after «)»** — «Esta ficha no puede ir aquí: en una rama compuesta, «carbonil» va dentro de ella, antes de cerrarla; detrás de «oxi» forma un éster como rama: [(2-cloroetoxi)carbonil].» [I-52a2b · parse.js]

**Nitriles**

- E-115 **TILE_ORDER · «nitrilo» after a ring** — «Esta ficha no puede ir aquí: «nitrilo» solo va detrás de una cadena: en un anillo, el grupo C≡N va unido a un carbono del anillo y se escribe «carbonitrilo» (ciclohexanocarbonitrilo).» [I-52b1 · parse.js]
- E-116 **TILE_ORDER · «nitrilo» after «benceno»** — «Esta ficha no puede ir aquí: «nitrilo» no va detrás de «benceno»: el benceno con un grupo C≡N es el «benzonitrilo», y con varios se usa «carbonitrilo» (benceno-1,4-dicarbonitrilo).» [I-52b1 · parse.js]
- E-117 **TILE_ORDER · numbers before «nitrilo»** — «Esta ficha no puede ir aquí: el grupo C≡N de «nitrilo» va siempre en un extremo de la cadena, en el carbono 1 (y en el último, con «dinitrilo»), así que «nitrilo» no lleva números: butanonitrilo, butanodinitrilo.» [I-52b1 · parse.js]
- E-118 **TILE_ORDER · «nitrilo» out of place** — «Esta ficha no puede ir aquí: «nitrilo» va al final del nombre, detrás de la terminación de la cadena principal (butanonitrilo, butanodinitrilo); en una rama, el grupo C≡N se escribe «ciano» ((cianometil)).» [I-52b1 · parse.js]
- E-119 **TILE_ORDER · «carbonitrilo» out of place** — «Esta ficha no puede ir aquí: «carbonitrilo» va al final del nombre, detrás del nombre del anillo principal (ciclohexanocarbonitrilo); en una rama, el grupo C≡N se escribe «ciano».» [I-52b1 · parse.js]
- E-120 **TILE_ORDER · «benzonitrilo» inside a branch** — «Esta ficha no puede ir aquí: «benzonitrilo» es el nombre de toda la molécula y va al final; dentro de una rama, el anillo es «fenil» y su grupo C≡N se escribe «ciano», como en (4-cianofenil).» [I-52b1 · parse.js]
- E-121 **TILE_ORDER · «oxi» after «ciano»** — «Esta ficha no puede ir aquí: «oxi» no va detrás de «ciano»: un grupo C≡N unido a un oxígeno no forma un éter.» [I-52b1 · parse.js]
- E-122 **TILE_ORDER · «ciano» in a name with «éter»** — «Esta ficha no puede ir aquí: «ciano» no va en un nombre con «éter»: un grupo C≡N unido al oxígeno no forma un éter. Los dos grupos de un éter son cadenas o anillos de carbonos (etil metil éter).» [I-52b1 · parse.js]
- E-123 **TILE_ORDER · a retained nitrile name inside a branch or in the O-bound side** — «Esta ficha no puede ir aquí: «acetonitrilo» es el nombre de toda la molécula y va al final; dentro de una rama, el grupo C≡N se escribe «ciano», como en (cianometil) o (4-cianofenil).» (also «fenilacetonitrilo», «ftalonitrilo») [I-52b2 · parse.js]

**Amines**

- E-124 **TILE_ORDER · «N» in a name that ends in neither «amina» nor «amida»** — «Esta ficha no puede ir aquí: «N» dice que un grupo va unido al nitrógeno de una amina o de una amida, así que solo va en un nombre que acaba en «amina» o en «amida» (N-metiletanamina, N-metiletanamida).» (changed since the I-52c1 draft, which spoke of amines only: «…solo va en un nombre que acaba en «amina» (N-metiletanamina).»; widened in I-52d1) [I-52c1, I-52d1 · parse.js]
- E-125 **TILE_ORDER · «N» in the wrong place of an amine's name** — «Esta ficha no puede ir aquí: «N» va delante de una rama unida al nitrógeno de la amina, como un número más de esa rama (N-metiletanamina, N,2-dimetilpropan-1-amina); no va delante de la cadena principal, de «eno», «ino» o «amina», ni dentro de una rama compuesta.» («etan-N-amina», «2-(N-metilpropil)etanamina») [I-52c1 · parse.js]
- E-126 **TILE_ORDER · «amina» out of place** — «Esta ficha no puede ir aquí: «amina» va al final del nombre, detrás de la terminación de la cadena o del anillo principal (propan-2-amina, butano-1,4-diamina, ciclohexanamina).» [I-52c1 · parse.js]

**Amino prefixes**

- E-127 **TILE_ORDER · numbers, a letter or «N» before a group on the nitrogen of «amino»** — «Esta ficha no puede ir aquí: los grupos unidos al nitrógeno de «amino» van delante de «amino», sin números ni letras: (metilamino), (dimetilamino), [etil(metil)amino]. Si un grupo lleva sus propias ramas, va en su propia rama compuesta, con sus números dentro: [(2-cloroetil)amino].» [I-52c2 · parse.js]
- E-128 **TILE_ORDER · «oxi» after «amino»** — «Esta ficha no puede ir aquí: «oxi» no va detrás de «amino»: un grupo amino unido a un oxígeno no forma un éter.» [I-52c2 · parse.js]
- E-129 **TILE_ORDER · «amino» in a name with «éter»** — «Esta ficha no puede ir aquí: «amino» no va en un nombre con «éter»: un grupo amino unido al oxígeno no forma un éter. Los dos grupos de un éter son cadenas o anillos de carbonos (etil metil éter).» [I-52c2 · parse.js]

**Amine class names («metilamina») and «anilina»**

- E-130 **TILE_ORDER · numbers, a letter or «N» in a name like «dimetilamina»** — «Esta ficha no puede ir aquí: en un nombre como «dimetilamina» no hay cadena principal que numerar: los grupos unidos al nitrógeno van delante de «amina», sin números ni «N» (etilmetilamina).» [I-52c3 · parse.js]
- E-131 **TILE_ORDER · «di» misplaced in a name like «dimetilamina»** — «Esta ficha no puede ir aquí: «di», «tri»… van delante del grupo que se repite: di, met, il y amina dan dimetilamina.» [I-52c3 · parse.js]
- E-132 **TILE_ORDER · tiles after the class word «amina»** — «Estas fichas no pueden ir aquí: el nombre termina con «amina»; los grupos unidos al nitrógeno van delante (etilmetilamina).» [I-52c3 · parse.js]
- E-133 **TILE_ORDER · a group that is no carbon group in a name like «metilamina»** — «Esta ficha no puede ir aquí: «cloro» no va en un nombre como «metilamina»: delante de «amina» solo van los grupos de carbonos unidos al nitrógeno, acabados en «il» (etilmetilamina).» Also «fluoro», «bromo», «yodo», «hidroxi», «oxo», «oxi», «ciano», «carboxi», «amino» and, since I-52d2, «carbamoil». [I-52c3, I-52d2 · parse.js]
- E-134 **TILE_ORDER · an acyl group in a name like «metilamina»** — «Esta ficha no puede ir aquí: «acetil» no va unido al nitrógeno de una amina: un grupo C=O unido al nitrógeno no forma una amina, sino una amida.» (also «formil», «benzoil», «oil», «carbonil») [I-52c3 · parse.js]
- E-135 **TILE_ORDER · a doubly bonded group in a name like «metilamina»** — «Esta ficha no puede ir aquí: en un nombre como «metilamina», cada grupo se une al nitrógeno por un enlace sencillo, así que acaba en «il» (etilmetilamina), no en «iliden».» (also «isopropiliden») [I-52c3 · parse.js]
- E-136 **TILE_ORDER · «anilina» or «bencilamina» inside a branch** — «Esta ficha no puede ir aquí: «anilina» es el nombre de toda la molécula y va al final; dentro de una rama, el grupo NH₂ se escribe «amino», como en (4-aminofenil) o (aminometil).» (also «bencilamina») [I-52c3 · parse.js]

**Amides**

- E-137 **TILE_ORDER · «N» in the wrong place of an amide's name** — «Esta ficha no puede ir aquí: «N» va delante de una rama unida al nitrógeno de la amida, como un número más de esa rama (N-metiletanamida, N,2-dimetilpropanamida); no va delante de la cadena principal, de «eno», «ino» o de la terminación de la amida, ni dentro de una rama compuesta.» [I-52d1 · parse.js]
- E-138 **TILE_ORDER · «amida» after a ring** — «Esta ficha no puede ir aquí: «amida» solo va detrás de una cadena: en un anillo, el grupo amida va unido a un carbono del anillo y se escribe «carboxamida» (ciclohexanocarboxamida).» [I-52d1 · parse.js]
- E-139 **TILE_ORDER · «amida» after «benceno»** — «Esta ficha no puede ir aquí: «amida» no va detrás de «benceno»: el benceno con un grupo amida es la «benzamida», y con varios se usa «carboxamida» (benceno-1,4-dicarboxamida).» [I-52d1 · parse.js]
- E-140 **TILE_ORDER · numbers (or «N») before «amida»** — «Esta ficha no puede ir aquí: el grupo amida de «amida» va siempre en un extremo de la cadena, en el carbono 1 (y en el último, con «diamida»), así que «amida» no lleva números: etanamida, butanodiamida.» («etan-1-amida», also «etan-N-amida») [I-52d1 · parse.js]
- E-141 **TILE_ORDER · «amida» out of place** — «Esta ficha no puede ir aquí: «amida» va al final del nombre, detrás de la terminación de la cadena principal (etanamida, butanodiamida); en una rama, el grupo amida se escribe «carbamoil» ((4-carbamoilciclohexil)).» (changed since the I-52d1 draft: the «carbamoil» clause added in I-52d2) [I-52d1, I-52d2 · parse.js]
- E-142 **TILE_ORDER · «carboxamida» out of place** — «Esta ficha no puede ir aquí: «carboxamida» va al final del nombre, detrás del nombre del anillo principal (ciclohexanocarboxamida); en una rama, el grupo amida se escribe «carbamoil».» (changed since the I-52d1 draft: the «carbamoil» clause added in I-52d2) [I-52d1, I-52d2 · parse.js]
- E-143 **TILE_ORDER · «benzamida» inside a branch** — «Esta ficha no puede ir aquí: «benzamida» es el nombre de toda la molécula y va al final (4-metilbenzamida). En una rama, el grupo amida se escribe «carbamoil» (ácido 2-(4-carbamoilciclohexil)etanoico), pero de momento no sé nombrar una rama con un benceno que lleve un grupo amida.» (changed since the I-52d1 draft «…dentro de una rama, el anillo es «fenil».»; rewritten in the I-52d2 review) [I-52d1, I-52d2 · parse.js]

**Carbamoyl and acylamino prefixes**

- E-144 **TILE_ORDER · numbers, a letter or «N» before a group on the nitrogen of «carbamoil»** — «Esta ficha no puede ir aquí: los grupos unidos al nitrógeno de «carbamoil» van delante de «carbamoil», sin números ni letras: (metilcarbamoil), (dimetilcarbamoil), [etil(metil)carbamoil]. Si un grupo lleva sus propias ramas, va en su propia rama compuesta, con sus números dentro: [(2-cloroetil)carbamoil].» [I-52d2 · parse.js]
- E-145 **TILE_ORDER · «oxi» after «carbamoil»** — «Esta ficha no puede ir aquí: «oxi» no va detrás de «carbamoil»: un grupo amida unido a un oxígeno no forma un éter.» [I-52d2 · parse.js]
- E-146 **TILE_ORDER · «carbamoil» in a name with «éter»** — «Esta ficha no puede ir aquí: «carbamoil» no va en un nombre con «éter»: un grupo amida unido al oxígeno no forma un éter. Los dos grupos de un éter son cadenas o anillos de carbonos (etil metil éter).» [I-52d2 · parse.js]

**Retained amide names**

- E-147 **TILE_ORDER · «acetamida» or «formamida» inside a branch or in the O-bound side** — «Esta ficha no puede ir aquí: «acetamida» es el nombre de toda la molécula y va al final; dentro de una rama, el grupo amida se escribe con «amino» y «oxo» en un mismo carbono de la rama, como en (2-amino-2-oxoetil), o con «carbamoil» si su carbono no es de la rama (ácido 2-(4-carbamoilciclohexil)etanoico).» [I-52d3 · parse.js]
- E-148 **TILE_ORDER · «ftalamida» inside a branch** — «Esta ficha no puede ir aquí: «ftalamida» es el nombre de toda la molécula y va al final; dentro de una rama, el grupo amida se escribe «carbamoil» (ácido 2-(4-carbamoilciclohexil)etanoico), pero de momento no sé nombrar una rama con un benceno que lleve un grupo amida.» [I-52d3 · parse.js]

### 3.3 Build errors by code

These come after the parser has accepted the tiles, when the molecule is put together (build.js). The retained word with its own branches (E-46) is also a build error.

- E-149 **LOCANT_RANGE** (a number past the end) — «La cadena de 5 carbonos va del 1 al 5: no hay carbono 7.» Variants: «La cadena de 1 carbono solo tiene el carbono 1: no hay carbono 3.»; in a branch «La rama de 3 carbonos va del 1 al 3: no hay carbono 4.», «La rama de 1 carbono solo tiene el carbono 1: no hay carbono 2.» (I-47b); a ring «El anillo de 6 carbonos va del 1 al 6: no hay carbono 8.», a ring in a branch (also «fenil») «El anillo de la rama va del 1 al 6: no hay carbono 7.» (I-50a); «El benceno tiene 6 carbonos, del 1 al 6: no hay carbono 7.» (I-50b). [I-47b, I-50a, I-50b · build.js]
- E-150 **LOCANT_RANGE** (a ring word: benzene words and retained ring names) — «El anillo del tolueno tiene 6 carbonos, del 1 al 6: no hay carbono 7.» The word changes, with «del» or «de la»: «del estireno», «del xileno», «del mesitileno» (I-50c); «del fenol» (I-51a2); «del cresol», «del catecol», «del pirocatecol», «del resorcinol», «de la hidroquinona» (I-51a3a); «del anisol» (I-51b1); «del benzaldehído» (I-51c1); «del ftalaldehído», «del isoftalaldehído», «del tereftalaldehído» (I-51c3a); «del ácido benzoico» (I-51d1); «del ácido ftálico», «isoftálico», «tereftálico» (I-51d2); «del benzoato» (I-52a1); «del benzonitrilo» (I-52b1); «del ftalonitrilo» (I-52b2); «de la anilina» (I-52c3); «de la benzamida» (I-52d1); «de la ftalamida» (I-52d3). [I-50c, I-51a2, I-51a3a, I-51b1, I-51c1, I-51c3a, I-51d1, I-51d2, I-52a1, I-52b1, I-52b2, I-52c3, I-52d1, I-52d3 · build.js]
- E-151 **LOCANT_RANGE** (an open-chain retained name) — «La cadena de la acetona tiene 3 carbonos, del 1 al 3: no hay carbono 5.»; one carbon: «El formaldehído solo tiene 1 carbono: no hay carbono 2.» Variants: «La cadena del acetaldehído…» (I-51c3a); «La cadena del ácido acético…», «La cadena del ácido oxálico…», «El ácido fórmico solo tiene 1 carbono…» (I-51d2); «La cadena del acetato…», «El formiato solo tiene 1 carbono…» (I-52a2a); «La cadena del acetonitrilo…» (I-52b2); «La cadena de la acetamida…», «La formamida solo tiene 1 carbono…» (I-52d3). [I-51c3a, I-51d2, I-52a2a, I-52b2, I-52d3 · build.js]
- E-152 **LOCANT_RANGE** (an open-chain retained name that includes a benzene ring) — «La cadena de la acetofenona tiene 2 carbonos, del 1 al 2: no hay carbono 4. En «acetofenona» el anillo no se numera: con grupos en el anillo, escribe el nombre sistemático (1-(4-metilfenil)etan-1-ona).» Variants: «fenilacetaldehído» «…(2-(4-metilfenil)etanal).» (I-51c3a); «ácido fenilacético» «…(ácido 2-(4-metilfenil)etanoico).» (I-51d2); «fenilacetato» «…(2-(4-metilfenil)etanoato de metilo).» (I-52a2a); «fenilacetonitrilo» «…(2-(4-metilfenil)etanonitrilo).» (I-52b2); «La bencilamina solo tiene 1 carbono: no hay carbono 2. En «bencilamina» el anillo no se numera: con grupos en el anillo, escribe el nombre sistemático: «(4-metilfenil)metanamina».» (I-52c3). [I-51c3a, I-51d2, I-52a2a, I-52b2, I-52c3 · build.js]
- E-153 **LOCANT_RANGE** (an ester's O-bound group) — «El grupo unido al oxígeno tiene 3 carbonos, del 1 al 3: no hay carbono 5.» Variants: «El grupo unido al oxígeno tiene 1 carbono: no hay carbono 2.»; «El anillo del grupo unido al oxígeno va del 1 al 6: no hay carbono 7.» [I-52a1 · build.js]
- E-154 **LOCANT_RANGE** (number 1 on a phenyl or benzoyl group) — «En «fenil», el carbono 1 es el que se une a la cadena: las ramas del fenil van en los carbonos del 2 al 6.» Variants: «En «benzoil», el carbono 1 es el que se une al grupo C=O: las ramas del benzoil van en los carbonos del 2 al 6.» (I-51c2); on an ester's O-bound phenyl «En «fenil», el carbono 1 es el que se une al oxígeno: las ramas del fenil van en los carbonos del 2 al 6.» (I-52a1). [I-50b, I-51c2, I-52a1 · build.js]
- E-155 **BOND_RANGE** — «El enlace doble del carbono 5 iría al carbono 6, y la cadena solo tiene 5 carbonos.» Variants: «El enlace triple…»; «…y la rama solo tiene 3 carbonos.»; one carbon «El enlace doble del carbono 1 iría al carbono 2, y la cadena solo tiene 1 carbono.» (I-47b); «…y el grupo unido al oxígeno solo tiene 3 carbonos.» (I-52a1). [I-47b, I-52a1 · build.js]
- E-156 **SAME_BOND** — «Hay dos enlaces múltiples en el mismo sitio (2).» The closing ring bond is quoted as written: «Hay dos enlaces múltiples en el mismo sitio (1(6)).» (I-51a2). [I-47b, I-51a2 · build.js]
- E-157 **VALENCE** (a carbon with more than four bonds) — «El carbono 2 tendría 5 enlaces, y un carbono solo puede tener 4.» Variants: «El carbono 1 de la rama tendría 5 enlaces, y un carbono solo puede tener 4.» (I-47b); «El carbono 1 del grupo unido al oxígeno tendría 5 enlaces, y un carbono solo puede tener 4.» (I-52a1). [I-47b, I-52a1 · build.js]
- E-158 **VALENCE** (the carbon already holds a retained word's own group) — «El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el tolueno, ese carbono ya lleva un metilo.» The ending names the word and its group: «en el estireno, ese carbono ya lleva un etenilo», «en el mesitileno… un metilo» (I-50c); «en el fenol… un grupo OH» (I-51a2); «en el catecol», «en el cresol», «en la hidroquinona… un grupo OH» (I-51a3a); «en el anisol… un grupo metoxi» (I-51b1); «en el benzaldehído… un grupo CHO» (I-51c1); «en la acetona… un grupo C=O», «en la acetofenona, ese carbono ya lleva un fenilo», «en el ftalaldehído… un grupo CHO» (I-51c3a); «en el ácido benzoico… un grupo COOH» (I-51d1); «en el ácido acético», «en el ácido oxálico», «en el ácido ftálico… un grupo COOH» (I-51d2); «en el benzoato… un grupo COO» (I-52a1); «en el acetato», «en el fenilacetato… un grupo COO» (I-52a2a); «en el benzonitrilo… un grupo C≡N» (I-52b1); «en el acetonitrilo», «en el ftalonitrilo… un grupo C≡N» (I-52b2); «en la anilina… un grupo NH₂» (I-52c3); «en la benzamida… un grupo amida» (I-52d1); «en la acetamida», «en la ftalamida… un grupo amida» (I-52d3). [I-50c, I-51a2, I-51a3a, I-51b1, I-51c1, I-51c3a, I-51d1, I-51d2, I-52a1, I-52a2a, I-52b1, I-52b2, I-52c3, I-52d1, I-52d3 · build.js]
- E-159 **VALENCE** (an end carbon that a terminal ending takes) — «El carbono 1 tendría 6 enlaces, y un carbono solo puede tener 4: el grupo CHO de «al» va en ese carbono.» («1,1,1-tricloroetanal») Variants: «…: el grupo COOH de «oico» va en ese carbono.» (I-51d1); «…: el grupo COO de «oato» va en ese carbono.» (I-52a1); «…: el grupo C≡N de «nitrilo» va en ese carbono.» (I-52b1); «…: el grupo amida de «amida» va en ese carbono.» (I-52d1). [I-51c1, I-51d1, I-52a1, I-52b1, I-52d1 · build.js]
- E-160 **VALENCE** (carbon 1 of an acyl branch) — «El carbono 1 de la rama tendría 5 enlaces, y un carbono solo puede tener 4: el grupo C=O de «oil» va en ese carbono.» («2-(1-cloropropanoil)hexano») [I-51c2 · build.js]
- E-161 **VALENCE** (a nitrogen with more than three bonds) — «El nitrógeno de la amina tendría 4 enlaces, y un nitrógeno solo puede tener 3.» («N,N,N-trimetilmetanamina»; also a class name with four groups, «metilmetilmetilmetilamina», I-52c3) Variants: «El nitrógeno del grupo amino tendría 4 enlaces…» (I-52c2); «El nitrógeno de la amida tendría 4 enlaces…» (I-52d1); «El nitrógeno del grupo carbamoil tendría 4 enlaces…» (I-52d2). [I-52c1, I-52c2, I-52c3, I-52d1, I-52d2 · build.js]
- E-162 **CARBONYL_POSITION** (more terminal groups than chain ends) — «La cadena de 1 carbono solo tiene un extremo: lleva un solo grupo CHO (metanal).»; «La cadena tiene dos extremos: con «al» lleva como mucho dos grupos CHO, uno en cada extremo (butanodial).» Variants: «…un solo grupo COOH (ácido metanoico).», «…con «oico» lleva como mucho dos grupos COOH, uno en cada extremo (ácido butanodioico).» (I-51d1); «…un solo grupo COO (metanoato de metilo).», «…con «oato» lleva como mucho dos grupos COO, uno en cada extremo (butanodioato de dimetilo).» (I-52a1); «…un solo grupo C≡N (metanonitrilo).», «…con «nitrilo» lleva como mucho dos grupos C≡N, uno en cada extremo (butanodinitrilo).» (I-52b1); «…un solo grupo amida (metanamida).», «…con «amida» lleva como mucho dos grupos amida, uno en cada extremo (butanodiamida).» (I-52d1). [I-51c1, I-51d1, I-52a1, I-52b1, I-52d1 · build.js]
- E-163 **CARBONYL_POSITION** («ona» on an end carbon) — «La terminación «ona» va en un carbono unido a otros dos carbonos, como los del interior de la cadena; en un extremo sería un aldehído («al»).» («propan-1-ona») [I-51c1 · build.js]
- E-164 **TOO_BIG** — the engine's own messages (model/validate.js), not v4 wording: «La molécula es demasiado grande (máximo 60 carbonos, cadena de 30).» (I-47b) and, once halogens and other heavy atoms count, «La molécula es demasiado grande (máximo 80 átomos sin contar los hidrógenos).» (I-51a1). [I-47b, I-51a1 · build.js, engine message]

### 3.4 Refusals («fuera de lo que sé dibujar»)

These are not mistakes of the student: the name is understood, but the molecule is outside what the app names, so nothing is drawn. The verdict is «outOfScope»: a fixed v4 lead followed by the engine's own message (model/validate.js, src/naming/), which belongs to the engine's catalogue and is not listed here except where v4 reads it from the name before building.

- E-165 **outOfScope lead** — «Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar:» followed by the engine's message, e.g. «Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar: Esta molécula tiene un nitrógeno unido a dos grupos C=O (–CO–NH–CO–). Eso es una imida, no una amida con un grupo en el nitrógeno, y las imidas quedan fuera de lo que sé nombrar.» («ácido 3-(acetilcarbamoil)propanoico») [I-47b, I-47c · index.js]
- E-166 **Rings** (read from the name: two rings bonded to each other, or more than two rings) — the lead plus the engine's RING_SYSTEM message: «…: Esta molécula tiene varios anillos. De momento solo sé nombrar moléculas con un único anillo, o con dos anillos separados por un grupo –COO– (éster), uno a cada lado (como el benzoato de fenilo).» («ciclohexilciclohexano», «fenilbenceno», «difenilmetano», «1,2,3-triciclohexilpropano») [I-50a, I-50b · build.js ringRefusal(), engine message]
- E-167 **Several amino groups and an «N»** (read from the name) — the lead plus the engine's message: «…: Esta molécula tiene varios grupos amino en la cadena principal y alguno de sus nitrógenos lleva otros grupos unidos. Para decir en qué nitrógeno está cada grupo harían falta localizadores como N¹ y N², y eso aún no sé hacerlo. Sí sé nombrar las diaminas sin grupos en el nitrógeno (como la etano-1,2-diamina) y las aminas con un solo nitrógeno (como la N-metiletanamina).» («N-metiletano-1,2-diamina»; on «benceno» the engine's benzene version, «Este benceno tiene varios grupos amino unidos al anillo…») [I-52c1 · build.js polyamineRefusal(), engine message]
- E-168 **Several amide groups and an «N»** (read from the name) — the lead plus the engine's message: «…: Esta molécula tiene dos grupos amida y alguno de sus nitrógenos lleva otros grupos unidos. Para decir en qué nitrógeno está cada grupo harían falta localizadores como N¹ y N⁴, y eso aún no sé hacerlo. Sí sé nombrar las diamidas sin grupos en el nitrógeno (como la butanodiamida) y las amidas con un solo nitrógeno (como la N-metiletanamida).» («N-metilbutanodiamida»; on «benceno» and on «ftalamida», since I-52d3, the benzene version «Este benceno tiene varios grupos amida unidos al anillo…») [I-52d1, I-52d3 · build.js polyamideRefusal(), engine message]

## 4. Search messages (left-out numbers)

When the student leaves out numbers, the app tries every placement. These messages say what it found when the result is not one molecule. None of them draws anything.

- S-1 **ambiguous** (several molecules fit) — «Faltan números: puede ser but-1-eno o but-2-eno.» At most three names are listed, then the rest are counted: «Faltan números: puede ser 2,2-dimetilpentano, 2,3-dimetilpentano, 2,4-dimetilpentano u otra molécula.»; «…u otras 3 moléculas.» The names are the student's own name with the numbers filled in when that is a name the app gives, otherwise the app's name. The last «o» becomes «u» before a word that starts with an /o/ sound, «8» or «11» («… u otra molécula», «… u 8-…»). [I-47c · index.js]
- S-2 **ambiguous** (only the letter of «cresol» is missing) — «Falta la letra: puede ser o-cresol, m-cresol o p-cresol.» [I-51a3a · index.js]
- S-3 **ambiguous** («cresol» with more groups and no letter) — «El nombre «cresol» no admite más sustituyentes: se escribe con números. Puede ser 4-cloro-2-metilfenol o 4-cloro-3-metilfenol.» («4-clorocresol») [I-51a3a · index.js]
- S-4 **ambiguous** (no candidate has a name) — «Faltan números: tu nombre puede describir 3 moléculas distintas.» A defensive wording: in the current code a name whose every candidate is refused gets the «outOfScope» verdict instead (E-165), so students should not see it. [I-47c · index.js]
- S-5 **incomplete** (the search ran out of time or placements) — «Faltan números: escribe en qué carbono va cada grupo.» [I-47b, I-47c · index.js]
- S-6 **SAME_BOND** (more multiple bonds than the chain has bonds) — «No caben tantos enlaces múltiples: la cadena de 3 carbonos solo tiene 2 enlaces entre carbonos.» («propatrieno») Variants: «…la cadena de 2 carbonos solo tiene 1 enlace entre carbonos.», «…la rama de 3 carbonos…» (I-47c); «…el anillo de 3 carbonos solo tiene 3 enlaces entre carbonos.» (I-50a); «…el grupo unido al oxígeno de 3 carbonos solo tiene 2 enlaces entre carbonos.» (I-52a1). The tiles marked are those of the left-out bond group. [I-47c, I-50a, I-52a1 · search.js]
- S-7 **VALENCE** (the left-out groups fit nowhere) — «No caben: pongas donde pongas lo que va sin número, algún carbono tendría más de 4 enlaces.» («pentaclorometano», «propadiino») The tiles marked are those of every left-out group. [I-47c · search.js]

## 5. Diagnosis messages (an «otro nombre» verdict: the student's main mistake)

When the student's name describes a real molecule that the app names differently, the verdict is «otro nombre». The results panel then shows «Esta es la molécula que describe tu nombre, pero se llama «X».», then **one** diagnosis message (from the first rule, in the order below, that finds a mistake), then «Pulsa «Ver paso a paso» para ver por qué.». The «Ver el paso» button opens the step-by-step explanation at the step listed for each item. If the molecule's explanation has no such step, the nearest one opens.

How to read the items:

- Each item shows one message exactly as the student sees it, then the student name that produces it, in `code`. After that come the other wordings of the same message («…» stands for text identical to the first message). The names inside a message change with the molecule.
- From 5.5 on, the shared numbering and locant messages only change their group words (NUMBERING, RING_NUMBERING, CHAIN_LOCANTS, NEEDLESS_LOCANTS, MISSING_LOCANTS, OLD_STYLE, CARBONYL_PARENT, MORE_CARBONYL_GROUPS). Each family lists its words in one bullet.
- The seniority lists of CARBONYL_SENIORITY and the reasons of ETHER_SIDE / AMINE_SIDE are reviewed once, in 5.13.

| step | «Ver el paso» opens |
|---|---|
| `group` | «Reconoce el grupo funcional» |
| `ringChain` | «Anillo o cadena» |
| `ring` / `benzene` | «Busca el anillo» / «Reconoce el benceno» |
| `chain` / `groupChain` | «Busca la cadena más larga» / «Busca la cadena principal» |
| `tiebreak` | «Desempates» |
| `numbering` / `ringNumbering` | «Numera la cadena» / «Numera el anillo» |
| `substituents` | «Nombra los sustituyentes» |
| `order` | «Ordena alfabéticamente» |
| `assemble` | «Monta el nombre» |
| `ether` | «Reconoce el éter» |
| `ester` / `diester` | «Separa las dos partes del éster» / «Separa las partes del diéster» |
| `etherClass` | «Monta el nombre con «éter»» (diagnosis-only step, D-37) |
| `amineClass` | «Monta el nombre tradicional de la amina» (diagnosis-only step, D-84) |

### 5.1 Hydrocarbons (chains)

- D-1 **BRANCH_AT_END** (step: chain) — «La rama «metil» está en el extremo de la cadena, así que la alarga: la cadena principal tiene 5 carbonos.» (`1-metilbutano`). [I-49a · DIAGNOSIS_TEXTS]
- D-2 **LONGER_CHAIN** (step: chain) — «Hay una cadena más larga que la tuya: la tuya tiene 4 carbonos y la cadena principal tiene 5.» (`2-etilbutano`). Variants: «la tuya tiene 1 carbono» (singular, I-51b1). [I-49a · DIAGNOSIS_TEXTS]
- D-3 **MORE_MULTIPLE_BONDS** (step: tiebreak) — «Hay otra cadena igual de larga con más enlaces dobles o triples (1; la tuya tiene 0). Entre cadenas igual de largas, gana la que tiene más.» (`3-etilidenpentano`). [I-49a · DIAGNOSIS_TEXTS]
- D-4 **MORE_DOUBLE_BONDS** (step: tiebreak) — «Hay otra cadena igual de larga, con los mismos enlaces múltiples, pero con más enlaces dobles (1; la tuya tiene 0). En ese empate gana la que tiene más enlaces dobles.» (`3-etenilhex-1-ino`). [I-49a · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.doubleBondTie]
- D-5 **MORE_SUBSTITUENTS** (step: tiebreak) — «Hay otra cadena igual de larga con más sustituyentes (2; la tuya tiene 1). Entre cadenas igual de largas, gana la que tiene más ramas.» (`3-isopropilpentano`). Variants: «…gana la que tiene más sustituyentes.» (D-25). [I-49a · DIAGNOSIS_TEXTS]
- D-6 **CHAIN_LOCANTS** (step: numbering) — «Hay otra cadena igual de larga que, bien numerada, da números más bajos a los enlaces dobles y triples (1 en vez de 2): esa es la cadena principal.» (`2-metil-4-(prop-2-en-1-il)non-2-eno`). Variants: «…a los enlaces dobles…»; «…a los sustituyentes…»; «…a los sustituyentes, leídos en orden alfabético (3 en vez de 7)…» (`5-(butan-2-il)-6-(but-1-en-2-il)-7-metil-3-metilidennon-4-eno`). [I-49a · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.lowerLocantsOf]
- D-7 **CHAIN_ALPHABETICAL** (step: numbering) — «Hay otra cadena igual de larga, con los mismos números, cuyo nombre va antes por orden alfabético: esa es la cadena principal.» (`6-metil-8-[2-(2-metilbutil)heptil]hexadecano`). [I-49a · DIAGNOSIS_TEXTS]
- D-8 **NUMBERING** (step: numbering) — «Hay que numerar la cadena desde el otro extremo: los enlaces dobles y triples tienen que llevar los números más bajos (2 en vez de 4).» (`hex-4-eno`). Variants (the reason after the colon): «con los mismos números para los enlaces múltiples, los enlaces dobles tienen que llevar los más bajos» (`but-3-en-1-ino`); «los sustituyentes tienen que llevar los números más bajos»; «con los mismos números, el sustituyente que va primero por orden alfabético tiene que llevar el más bajo» (`4-etil-3-metilhexano`); «con los mismos números, gana la numeración cuyo nombre va antes por orden alfabético» (no test reaches it, I-49a); added sentence «En «propeno» ese número ni siquiera se escribe.» (`prop-2-eno`). [I-49a · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.numberingReasons]
- D-9 **ALPHABETICAL_ORDER** (step: order) — «Los sustituyentes se escriben por orden alfabético: «etil» va antes que «metil» (e antes que m). Los prefijos di-, tri-… no cuentan para el orden.» (`2,3-dimetil-5-etilheptano`). Variants: the reason «(la palabra más corta va primero)» (`7-(3-metiliden-2-metilbutil)tridecano`) or «(con las mismas letras, va primero la del número más bajo)»; the hint ««tert-» no cuenta para el orden.» (`4-isopropil-5-tert-butilnonano`: «tert-butil» va antes que «isopropil» (b antes que i)); with the letter of two different groups on «benceno», O-6 (I-54b). [I-49a · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.why, .hints]
- D-10 **UNGROUPED** (step: substituents) — «Las ramas iguales se escriben una sola vez, con «di», «tri»… delante: «2,3-dimetil», no «2-metil-3-metil».» (`2-metil-3-metilpentano`). Variants: «…con «bis», «tris»… delante…» (a branch with branches of its own); «Los sustituyentes iguales…» (D-24); «Los grupos iguales unidos a los oxígenos…» (D-65). [I-49a · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.equalGroups]
- D-11 **MULTIPLIER_KIND** (step: substituents) — ««bis», «tris»… solo van delante de ramas que tienen sus propias ramas; aquí va «di», «tri»…: «2,3-dimetil», no «2,3-bismetil».» (`2,3-bismetilpentano`). Variants: «Delante de una rama que tiene sus propias ramas se usa «bis», «tris»…: «5,5-bis(2,2-dimetilpropil)», no «5,5-di(2,2-dimetilpropil)».» (`5,5-di(2,2-dimetilpropil)nonano`). [I-49a · DIAGNOSIS_TEXTS]
- D-12 **LOCANT_ORDER** (step: assemble) — «Los números de un mismo grupo se escriben de menor a mayor: «2,3-dimetil», no «3,2-dimetil».» (`3,2-dimetilpentano`; also `hexa-3,1-dieno` → «hexa-1,3-dieno»). [I-49a · DIAGNOSIS_TEXTS]
- D-13 **NEEDLESS_LOCANTS** (step: numbering) — «En «propeno» no se escriben números: solo hay una manera de colocar el enlace doble.» (`prop-1-eno`). Variants: «…el enlace triple», «…los enlaces dobles» (`propa-1,2-dieno` → «propadieno»), «…los enlaces triples», «…los enlaces dobles y triples», «…los sustituyentes»; inside a branch: «Sobran números dentro de la rama: se escribe «4-propil», no «4-(propan-1-il)».» (`4-(propan-1-il)heptano`). [I-49a · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.what]
- D-14 **MISSING_LOCANTS** (step: numbering) — «Faltan números: hay que decir en qué carbono va cada rama y cada enlace doble o triple, como en «but-1-en-3-ino».» (tiles but · ino · eno, «butineno»; alone a missing number is the verdict «faltan números», so this message appears only as the kindest reading of a name with several possible placements). [I-49a · DIAGNOSIS_TEXTS]
- D-15 **SEGMENT_ORDER** (step: assemble) — «Cuando hay enlaces dobles y triples, «en» se escribe antes que «ino»: «pent-1-en-4-ino», no «pent-4-in-1-eno».» (`pent-4-in-1-eno`). [I-49a · DIAGNOSIS_TEXTS]
- D-16 **OLD_STYLE** (step: assemble) — «Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, justo delante de «eno» o «ino»: «but-2-eno».» (`2-buteno`). Variants: «…justo delante de «X»…» with the suffix (each family's words bullet). [I-49a · DIAGNOSIS_TEXTS]

### 5.2 Rings and benzene

- D-17 **RING_IS_PARENT** (step: ring; benzene on a benzene ring) — «El anillo es la cadena principal: un anillo manda siempre sobre una cadena abierta, aunque la cadena sea más larga. Tu cadena de 3 carbonos va en una rama del anillo: «propilciclohexano».» (`1-ciclohexilpropano`). Variants: «Tu cadena de 1 carbono…» (`ciclohexilmetano` → «metilciclohexano»). [I-50d · DIAGNOSIS_TEXTS]
- D-18 **BENZENE_RING** (step: benzene) — «Un anillo de 6 carbonos con tres enlaces dobles alternados, uno sí y uno no, es el benceno, y tiene nombre propio: «benceno». Se escribe «metilbenceno».» (`metilciclohexa-1,3,5-trieno`). Variants: without «Se escribe…» when the name is «benceno» itself (`ciclohexa-1,3,5-trieno`). [I-50d · DIAGNOSIS_TEXTS]
- D-19 **RING_NUMBERING** (step: ringNumbering) — «Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: los sustituyentes tienen que llevar los números más bajos (3 en vez de 5).» (`1,5-dimetilciclohexano`). Variants: the reasons of D-8 (`ciclohexa-2,4-dieno`, `1-metil-2-etilbenceno`); «…(1 en vez de 2). En «metilciclohexano» ese número ni siquiera se escribe.» (`2-metilciclohexano`). [I-50d · DIAGNOSIS_TEXTS]
- D-20 **NEEDLESS_LOCANTS** (ring forms; step: numbering) — «En «metilciclohexano» no se escriben números: solo hay una manera de colocar el sustituyente.» (`1-metilciclohexano`; also `1-metilbenceno`, `ciclohex-1-eno`, `1,2,3,4,5,6-hexametilbenceno` → «…los sustituyentes»). Variants when the app's name keeps numbers inside a branch: «En «(butan-2-il)benceno» no se escribe el número que dice en qué carbono del anillo va el sustituyente: solo hay una manera de colocarlo. Los números de dentro de la rama sí se escriben.» (`1-(butan-2-il)benceno`); plural «…no se escriben los números que dicen en qué carbonos del anillo van los sustituyentes: solo hay una manera de colocarlos. Los números de dentro de las ramas sí se escriben.» (`1,2,3,4,5,6-hexa(propan-2-il)benceno`); on a chain parent «En «(2-metilciclohexil)metanol» no se escribe el número que dice en qué carbono de la cadena va el grupo –OH: …» (`(2-metilciclohexil)metan-1-ol`). [I-50d · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.on]

### 5.3 Traditional names and o/m/p letters

- D-21 **SUBSTITUTED_TEMPLATE** (step: benzene for a ring template, groupChain for a chain template) — «El nombre tradicional «tolueno» no admite más sustituyentes: con más ramas en el anillo, la molécula se nombra a partir de «benceno», con todas las ramas delante: «1,4-dimetilbenceno».» (`4-metiltolueno`, also `p-metiltolueno`). Variants:
  - the same sentence for «estireno», «xileno», «mesitileno» [I-50d], «catecol», «pirocatecol», «resorcinol», «hidroquinona» [I-51a3a] and «anisol» [I-51b1] (`2-cloroanisol` → «1-cloro-2-metoxibenceno»);
  - «…a partir de «fenol»…» for «cresol» (`tetrametilcresol` → «2,3,4,5,6-pentametilfenol») [I-51a3a];
  - for a chain template: «El nombre tradicional «acetona» no admite sustituyentes: con más grupos, la molécula se nombra con su nombre sistemático: «1-cloropropan-2-ona».» (`1-cloroacetona`). The same sentence is used for «acetaldehído», «acetofenona» (`2-metilacetofenona` → «1-fenilpropan-1-ona») [I-51c3a], «ácido acético» (`ácido 2-cloroacético` → «ácido 2-cloroetanoico») [I-51d2], «acetato» (`2-cloroacetato de metilo`) [I-52a2a], «acetonitrilo», «fenilacetonitrilo» [I-52b2] and «bencilamina» (`N-metilbencilamina` → «1-fenil-N-metilmetanamina») [I-52c3];
  - for a retained amide: «El nombre tradicional «acetamida» solo admite grupos en el nitrógeno, con «N» (N-metilacetamida), o solo un fenil en el carbono 2 (2-fenilacetamida): con otros grupos, la molécula se nombra con su nombre sistemático: «2-cloroetanamida».» (`2-cloroacetamida`); «El nombre tradicional «formamida» solo admite grupos en el nitrógeno, con «N» (N-metilformamida): con otros grupos…» [I-52d3].

  [I-50d and later · DIAGNOSIS_TEXTS]
- D-22 **NEEDLESS_LOCANTS** (traditional names; step: assemble) — «El nombre tradicional «fenilacetaldehído» se escribe sin números: «fenilacetaldehído», no «2-fenilacetaldehído».» (`2-fenilacetaldehído`). Variants: the same for «ácido fenilacético» [I-51d2], «fenilacetato de metilo» [I-52a2a] and «fenilacetonitrilo» [I-52b2]. [I-51c3b2 · DIAGNOSIS_TEXTS]
- D-23 **LETTER_LOCANTS** (step: ringNumbering) — «Las letras «o», «m» y «p» (orto, meta y para) son una forma antigua de decir dónde van dos grupos del benceno, y con estas ramas no se usan: se escriben los números, «1,4-di(propan-2-il)benceno».» (`p-di(propan-2-il)benceno`). [I-50d · DIAGNOSIS_TEXTS]

### 5.4 Halogens

- D-24 **UNGROUPED** (step: substituents) — «Los sustituyentes iguales se escriben una sola vez, con «di», «tri»… delante: «1,2-dicloro», no «1-cloro-2-cloro».» (`1-cloro-2-clorociclohexano`). It also covers `hidroxi` and alkoxy prefixes. [I-51a1 · DIAGNOSIS_PHRASES.equalGroups]
- D-25 **MORE_SUBSTITUENTS** (step: tiebreak) — «Hay otra cadena igual de larga con más sustituyentes (2; la tuya tiene 1). Entre cadenas igual de largas, gana la que tiene más sustituyentes.» (`3-(1-cloroetil)pentano`). Later phases also use it beside `hidroxi`, alkoxy, acyl, `formil`, `ciano` and `carbamoil` prefixes (e.g. `N-(2-amino-2-oxoetil)etanamida`). [I-51a1 · DIAGNOSIS_TEXTS]

### 5.5 Alcohols and phenols

- D-26 **HYDROXY_PREFIX** (step: group) — «El grupo –OH es el grupo principal: se nombra con la terminación «-ol», al final del nombre, no con el prefijo «hidroxi». Se escribe «propan-2-ol».» (`2-hidroxipropano`; also `hidroxibenceno` → «fenol»). Variants: «Los grupos –OH son el grupo principal: los de la cadena principal se nombran todos juntos con la terminación «-diol», al final del nombre, no con el prefijo «hidroxi». Se escribe «butano-1,4-diol».» (`1,4-dihidroxibutano`); «…los del anillo… «-triol»…» (`4-hidroxicatecol` → «benceno-1,2,4-triol»). [I-51a3b · DIAGNOSIS_TEXTS]
- D-27 **HYDROXY_PARENT** (step: ringChain; benzene or ring when no side chain has an OH) — «La cadena principal es la que lleva más grupos –OH, sea el anillo o una cadena abierta; solo si empatan manda el anillo. Aquí el anillo no lleva ninguno y la mejor cadena, uno, así que gana la cadena y el anillo va en una rama: «2-ciclohexiletan-1-ol».» (`(2-hidroxietil)ciclohexano`). Variants (the clause after «Aquí», shared with CARBONYL_PARENT): «el anillo lleva uno y las cadenas no llevan ninguno, así que gana el anillo» (`(4-hidroxifenil)metano` → «4-metilfenol»); «el anillo y la mejor cadena llevan uno cada uno, así que gana el anillo»; «el anillo lleva 2 y la mejor cadena, uno, así que gana el anillo»; «el anillo lleva uno y la mejor cadena, 2, así que gana la cadena y el anillo va en una rama». [I-51a3b · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.hydroxyChoice]
- D-28 **MORE_HYDROXY_GROUPS** (step: groupChain) — «Hay otra cadena con más grupos –OH (2; la tuya tiene 1). La cadena principal es la que lleva más grupos –OH, aunque no sea la más larga.» (`2-(hidroximetil)propan-1-ol`). [I-51a3b · DIAGNOSIS_TEXTS]
- D-29 **PHENOL** (step: group) — «Un benceno con un solo grupo –OH tiene nombre propio: «fenol», no «bencenol». Se escribe «4-metilfenol».» (`4-metilbencen-1-ol`). Variants: without «Se escribe…» (`bencenol`). [I-51a3b · DIAGNOSIS_TEXTS]
- D-30 **Alcohol words in the shared codes** — NUMBERING / RING_NUMBERING: «los grupos –OH (el grupo principal) tienen que llevar los números más bajos» (`butan-3-ol`, (2 en vez de 3); `ciclohexan-2-ol` adds «En «ciclohexanol» ese número ni siquiera se escribe.»). CHAIN_LOCANTS: «…da números más bajos a los grupos –OH (1 en vez de 2)…» (`3-(2-hidroxietil)pentano-2,4-diol`). OLD_STYLE: «…justo delante de «ol»: «propan-2-ol».» (`2-propanol`), «…de «diol»: «etano-1,2-diol».» (`1,2-etanodiol`). NEEDLESS_LOCANTS: «…solo hay una manera de colocar el grupo –OH.» (`etan-1-ol`), «…los grupos –OH», «…los sustituyentes y el grupo –OH» (`1,1,1-triclorometan-1-ol`). MISSING_LOCANTS: «…y cada grupo –OH» (since I-51d3). [I-51a3b · DIAGNOSIS_PHRASES.numberingReasons.N0, .lowerLocantsOf.N0, .what]

### 5.6 Ethers

- D-31 **ETHER_SIDE** (step: ether) — «El oxígeno del éter (–O–) corta la molécula en dos lados, y la cadena principal no puede pasar por él: se busca en uno de los dos lados, con las reglas de siempre. Aquí la cadena principal está en el otro lado del oxígeno, no en el de tu cadena: en ese lado hay una cadena de 2 carbonos, más larga que la tuya, de 1. Tu cadena, con el oxígeno, es el sustituyente «metoxi»: «metoxietano».» (`etoximetano`). Variants: «…no en el de tu anillo…» and «Tu anillo, con el oxígeno, es el sustituyente «ciclohexiloxi»» (`(2-hidroxietoxi)ciclohexano` → «2-(ciclohexiloxi)etan-1-ol»); «Tu cadena forma parte del sustituyente «2-metoxietoxi»» (`(2-propoxietoxi)metano` → «1-(2-metoxietoxi)propano»); the fallbacks «…va en un sustituyente acabado en «-oxi»» and «…forma parte de un sustituyente» (no test reaches them). Reasons: D-93. [I-51b2 · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.etherHolder]
- D-32 **ALKOXY_MULTIPLIER** (step: substituents) — «Un prefijo «-oxi» que no se acorta, como «pentiloxi», es un prefijo compuesto (un grupo más «oxi») y va entre paréntesis; delante de un prefijo compuesto se usa «bis», «tris»…: «1,6-bis(pentiloxi)», no «1,6-di(pentiloxi)».» (`1,6-di(pentiloxi)hexano`). Variants: ««tert-butoxi» se cuenta como un prefijo compuesto, porque su forma sistemática, «1,1-dimetiletoxi», lleva sus propias ramas; delante va «bis», «tris»…: «1,6-bis-tert-butoxi», no «1,6-di-tert-butoxi».» (`1,6-di-tert-butoxihexano`). [I-51b2 · DIAGNOSIS_TEXTS]
- D-33 **CLASS_NAME_NONE** (step: etherClass) — «El nombre con «éter» (nombre de clase funcional) solo lo doy cuando el oxígeno une dos grupos sencillos: cadenas sin ramas unidas por su extremo (metil, etil, propil…), isopropil o tert-butil, sin enlaces dobles ni triples, sin anillos y sin más átomos que esos carbonos y el oxígeno. Esta molécula se nombra con un prefijo acabado en «-oxi»: «metoxieteno».» (`etenil metil éter`; also `fenil metil éter` → «metoxibenceno»). [I-51b2 · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.simpleGroups]
- D-34 **CLASS_GROUP_WORDS** (step: etherClass) — «En el nombre con «éter», cada grupo se nombra con su forma más sencilla, sin números: metil, etil, propil…, isopropil o tert-butil. Se escribe «isopropil metil éter».» (`metil (propan-2-il) éter`). [I-51b2 · DIAGNOSIS_TEXTS]
- D-35 **CLASS_ORDER** (step: etherClass) — «En el nombre con «éter», los dos grupos se escriben por orden alfabético: «etil» va antes que «metil» (e antes que m). Se escribe «etil metil éter».» (`metil etil éter`). Variants: hint ««tert-» no cuenta para el orden.» (`metil tert-butil éter`); reason «(con las mismas letras, va primero el grupo sin «tert-»)» (`tert-butil butil éter` → «butil tert-butil éter»). [I-51b2 · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.plainFirst]
- D-36 **CLASS_DI** (step: etherClass) — «Si los dos grupos unidos al oxígeno son iguales, su nombre se escribe una sola vez, con «di» delante: «dietil éter», no «etil etil éter».» (`etil etil éter`; also `bisisopropil éter` → «diisopropil éter», `tert-butil tert-butil éter` → «di-tert-butil éter»). [I-51b2 · DIAGNOSIS_TEXTS]
- D-37 **Step «Monta el nombre con «éter»»** (the etherClass step, which the explanation adds only for an ether class-name diagnosis; «prefijo» and «cadena principal» are glossary links). Title «Monta el nombre con «éter»». For an ether that has a class name:
  - «El nombre que explican los otros pasos, «metoxietano», es el que doy primero, el nombre sustitutivo: el oxígeno y uno de los dos grupos unidos a él van delante como prefijo acabado en «-oxi», y el otro grupo da la cadena principal. Un éter sencillo como este tiene también otro nombre válido, que la IUPAC (2013) acepta: el nombre de clase funcional. Se monta de otra manera, sin cadena principal y sin números.»
  - «Los dos grupos unidos al oxígeno se nombran como ramas, acabados en «-il», cada uno con su forma más sencilla y sin números (metil, etil, propil…, isopropil o tert-butil): aquí, «etil» y «metil».» (or «aquí, los dos son «etil».»)
  - «Los dos grupos se escriben por orden alfabético, como los sustituyentes de un nombre: «tert-» no cuenta para el orden, y si las letras empatan va primero el grupo sin «tert-» (butil tert-butil éter).»
  - «Si los dos grupos son iguales, se escriben una sola vez, con «di» delante: «dietil éter», no «etil etil éter».»
  - «Al final va la palabra «éter», y las palabras van separadas por espacios. En el nombre sustitutivo, en cambio, el éter nunca va al final: es el prefijo «-oxi». Para esta molécula: «etil metil éter».»

  For one that has none (CLASS_NAME_NONE):
  - «Un éter sencillo tiene también un nombre de clase funcional, con la palabra «éter» al final (en el nombre sustitutivo, el que explican los otros pasos, el éter nunca va al final: es un prefijo «-oxi»).»
  - «Ese nombre se monta sin cadena principal y sin números: los dos grupos unidos al oxígeno se nombran como ramas acabadas en «-il», por orden alfabético («tert-» no cuenta), una sola vez con «di» delante si son iguales, y al final va «éter»: «etil metil éter», «dietil éter».»
  - «Ese nombre solo lo doy cuando el oxígeno une dos grupos sencillos: cadenas sin ramas unidas por su extremo (metil, etil, propil…), isopropil o tert-butil, sin enlaces dobles ni triples, sin anillos y sin más átomos que esos carbonos y el oxígeno.»
  - «Esta molécula no es uno de esos éteres sencillos, así que no tiene nombre con «éter»: se nombra como en los otros pasos, con el oxígeno en un prefijo acabado en «-oxi»: «metoxieteno».»

  [I-51b2 review · CLASS_NAME_STEP_TEXTS]

### 5.7 Aldehydes, ketones and acyl prefixes

- D-38 **CARBONYL_SENIORITY** (step: group) — «Cuando hay grupos distintos, solo uno es el grupo principal, y se elige por este orden: aldehído > cetona > alcohol. Aquí manda el aldehído (–CHO), que se nombra con la terminación «-al», al final del nombre; el C=O de la cetona va delante, con el prefijo «oxo». Se escribe «4-oxopentanal».» (`5-oxopentan-2-ona`). Variants: «Aquí manda la cetona (C=O), que se nombra con la terminación «-ona», al final del nombre; el –OH va delante, con el prefijo «hidroxi».» (`4-oxopentan-2-ol`); «…que se nombra con «benzaldehído» (el benceno con un grupo –CHO)…» (`4-formilfenol` → «4-hidroxibenzaldehído»); «el C=O de la cetona va delante, en los prefijos» (`3-formilhexan-2-ona` → «2-acetilpentanal»); several groups: «cada C=O de cetona», «cada –OH». The seniority lists: D-92. [I-51c3b1 · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.principal, .junior, .juniorPlace, .ending]
- D-39 **KETONE_NOT_ALDEHYDE** (step: group) — «El grupo –CHO de un aldehído va en un extremo de la cadena: su carbono solo puede unirse a un carbono más. Aquí la rama «metil» está en el carbono 1, que así queda unido a dos carbonos: su C=O es el de una cetona, no el de un aldehído. Se escribe «butan-2-ona».» (`1-metilpropanal`). Variants: «Aquí el carbono 1 está unido a dos carbonos: …» (`1-cianobutanal` → «2-oxopentanonitrilo»). The branch may be any prefix the student wrote: «la rama «acetil»», «la rama «4-metilfenil»», «la rama «carboxi»» (`1-carboxibutanal` → «ácido 2-oxopentanoico»), «la rama «carbamoil»» (`1-carbamoilbutanal` → «2-oxopentanamida»). [I-51c3b1 · DIAGNOSIS_TEXTS]
- D-40 **ALDEHYDE_CARBON** (step: group) — «La terminación «-carbaldehído» solo se usa cuando el grupo –CHO está unido a un anillo. En una cadena, el carbono del –CHO es un carbono más de la cadena principal, siempre en un extremo, y el grupo se nombra con la terminación «-al», al final del nombre. Se escribe «pentanal».» (`butano-1-carbaldehído`). Variants: «…con la terminación «-dial»…» (`butano-1,4-dicarbaldehído` → «hexanodial»); «Cuando el grupo –CHO está unido a un anillo, su carbono no forma parte del anillo ni es una cadena aparte: la cadena principal es el anillo, y el grupo se nombra con la terminación «-carbaldehído», al final del nombre. Se escribe «ciclohexanocarbaldehído».» (`ciclohexilformaldehído`); «…«-dicarbaldehído»…» (`(4-formilciclohexil)metanal`); «…y el grupo se nombra con «benzaldehído» (el benceno con un grupo –CHO). Se escribe «benzaldehído».» (`fenilformaldehído`). [I-51c3b1 · DIAGNOSIS_TEXTS (groupCarbonText)]
- D-41 **CARBONYL_PREFIX** (step: group) — «El grupo C=O es el grupo principal: se nombra con la terminación «-ona», al final del nombre, no con el prefijo «oxo». Se escribe «propanona».» (`2-oxopropano`). Variants: «El grupo –CHO es el grupo principal: se nombra con la terminación «-carbaldehído», al final del nombre, no con el prefijo «formil».» (`formilciclohexano`); «…con «benzaldehído» (el benceno con un grupo –CHO), no con el prefijo «formil».» (`formilbenceno`); «…Su carbono entra en la cadena principal.» (`2-formilbutano` → «2-metilbutanal»); «Los grupos –CHO son el grupo principal: los de la cadena principal se nombran todos juntos con la terminación «-dial», al final del nombre, no con el prefijo «oxo».» (`5-oxopentanal`); «Los grupos C=O son el grupo principal: los del anillo se nombran todos juntos con la terminación «-diona»…» (`4-oxociclohexan-1-ona`); «…los unidos al anillo… «-dicarbaldehído»… «formil»» (`1,3-diformilciclohexano`); an acyl prefix: «…no dentro del prefijo «acetil». Su carbono entra en la cadena principal, y el anillo pasa a ser una rama. Se escribe «1-feniletan-1-ona».» (`acetilbenceno`). [I-51c3b1 · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.groupsOn]
- D-42 **CARBONYL_PARENT** (step: ringChain) — «La cadena principal es la que lleva más grupos C=O, sea el anillo o una cadena abierta; solo si empatan manda el anillo. Aquí el anillo y la mejor cadena llevan uno cada uno, así que gana el anillo: «2-(2-oxopropil)ciclohexan-1-ona».» (`1-(2-oxociclohexil)propan-2-ona`). Variants: «…más grupos –CHO…» (`(2-oxoetil)ciclohexano` → «2-ciclohexiletanal»); the clauses of D-27. [I-51c3b1 · DIAGNOSIS_TEXTS]
- D-43 **MORE_CARBONYL_GROUPS** (step: groupChain) — «Hay otra cadena con más grupos C=O (2; la tuya tiene 1). La cadena principal es la que lleva más grupos C=O, aunque no sea la más larga.» (`3-(2-oxopropil)hexan-2-ona`). Variants: «…grupos –CHO…» (`2-(2-oxoetil)propanal`). [I-51c3b1 · DIAGNOSIS_TEXTS]
- D-44 **Aldehyde and ketone words in the shared codes** — NUMBERING / RING_NUMBERING: «los grupos –CHO (el grupo principal) tienen que llevar los números más bajos», «los grupos C=O (el grupo principal) tienen que llevar los números más bajos» (`pentan-4-ona`, (2 en vez de 4); `benceno-1,5-dicarbaldehído`). CHAIN_LOCANTS: «…a los grupos C=O (5 en vez de 6)…» (`4-propanoilheptano-2,6-diona`), «…a los grupos –CHO…». NEEDLESS_LOCANTS: «…el grupo C=O» (`ciclohexan-1-ona`), «…el grupo –CHO» (`ciclohexano-1-carbaldehído`), «…los grupos C=O», «…los grupos –CHO». OLD_STYLE: «…delante de «ona»: «pentan-2-ona».» (`2-pentanona`), «…«diona»…» (`2,4-pentanodiona`), «…«dicarbaldehído»…» (`1,3-ciclohexanodicarbaldehído`). MISSING_LOCANTS: «…y cada grupo –CHO», «…y cada grupo C=O» (since I-51d3). [I-51c3b1 · DIAGNOSIS_PHRASES.carbonylN0, .groupWords, .what]
- D-45 **ACYL_NAME** (step: substituents) — «El grupo acilo de 2 carbonos (CH₃–CO–) tiene nombre propio, que la IUPAC (2013) prefiere: «acetil», no «etanoil».» Variants: «El grupo acilo de 1 carbono (H–CO–, un –CHO) tiene nombre propio, que la IUPAC (2013) prefiere: «formil», no «metanoil».»; inside a longer prefix it adds «Se escribe «2-formilciclohexil», no «2-metanoilciclohexil».» or, on an ester prefix, «Se escribe «acetiloxi», no «etanoiloxi».» (`ácido 2-(etanoiloxi)etanoico`, I-52a3b); «Una rama que se une por el carbono de un C=O es un grupo acilo: su C=O no se nombra con el prefijo «oxo», sino con la terminación «-oil» (salvo «formil», de 1 carbono, y «acetil», de 2). Se escribe «propanoil», no «1-oxopropil».»; «…sino con la terminación «-carbonil», porque está unido a un anillo («benzoil» con el benceno). Se escribe «ciclohexanocarbonil», no «ciclohexiloxometil».» [I-51c3b2 · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.acylGroup, .acylEnding]
- D-46 **ACYL_CHAIN** (step: substituents) — «La cadena de un grupo acilo empieza en el carbono del C=O, que es el 1, y es la más larga posible: aquí tiene 4 carbonos, no 3. Se escribe «butanoil», no «3-metilpropanoil».» Variants: «…que es el 1, y se elige con las mismas reglas que la cadena principal. Se escribe «2-etilbut-3-enoil», no «2-etenilbutanoil».» (`2-(2-etenilbutanoil)heptanal`). [I-51c3b2 · DIAGNOSIS_TEXTS]
- D-47 **BRANCH_RING_NUMBERING** (step: substituents) — «Un anillo que va en una rama se numera empezando por el carbono por el que se une, que es el 1, y siguiendo en el sentido que da los números más bajos a sus sustituyentes: «2-metilfenil», no «6-metilfenil».» (`2-(6-metilfenil)heptanal`; also `2-(5-metilfenil)etan-1-ol`, `1-(5-metilfenoxi)propan-2-ona`). Variants: «…que da los números más bajos a sus enlaces dobles y triples» (`2-(ciclohex-5-en-1-il)propanal`); «…a sus enlaces dobles y triples, y luego a sus sustituyentes»; «…a sus sustituyentes y, con los mismos números, el más bajo al que va primero por orden alfabético» (`2-(6-cloro-2-metilfenil)propanal`); with no direction to choose: «…que es el 1: «ciclohexanocarbonil», no «ciclohexano-2-carbonil». En «ciclohexanocarbonil» ese 1 ni siquiera se escribe.»; for benzene written with `ciclo` it adds «Ese anillo es un benceno: sus enlaces dobles no cuentan para numerar.» (`2-(6-metilciclohexa-1,3,5-trien-1-il)heptanal`). [I-51c3b2 · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.branchRingReasons]
- D-48 **MISSING_LOCANTS** (inside a branch; step: numbering) — «Falta un número dentro de la rama: cuando el anillo lleva enlaces dobles o sustituyentes, el carbono unido al C=O, que es el 1, lleva su número delante de «carbonil»: «2-(ciclohex-2-eno-1-carbonil)», no «2-(ciclohex-2-enocarbonil)».» [I-51c3b2 · DIAGNOSIS_TEXTS]

### 5.8 Acids

- D-49 **ACID_GROUP** (step: group) — «Un C=O y un –OH en el mismo carbono no son dos grupos distintos: juntos forman un solo grupo, el –COOH de los ácidos carboxílicos (su –OH no es un alcohol, ni su C=O un aldehído o una cetona). El grupo –COOH es el grupo principal: se nombra con la palabra «ácido» al principio del nombre y la terminación «-oico» al final. Se escribe «ácido propanoico».» (`1-hidroxipropanal`). Variants: «…Los grupos –COOH son el grupo principal: los de la cadena principal se nombran todos juntos con la palabra «ácido» al principio del nombre y la terminación «-dioico» al final. Se escribe «ácido butanodioico».» (`ácido 4-hidroxi-4-oxobutanoico`); «…los unidos al anillo… «-dicarboxílico»…» (`1,4-di(hidroxioxometil)ciclohexano`); when that –COOH is not the suffix's: «…Ese –COOH no da la terminación del nombre: se nombra con el prefijo «carboxi», delante. La terminación es para el otro grupo –COOH, que se nombra con la palabra «ácido» al principio del nombre y la terminación «-carboxílico» al final. Se escribe «ácido 2-(carboximetil)ciclohexano-1-carboxílico».» (`ácido 2-[(hidroxioxometil)metil]ciclohexano-1-carboxílico`); «…para los otros grupos –COOH, que se nombran todos juntos…». [I-51d3 · DIAGNOSIS_TEXTS]
- D-50 **ACID_CARBON** (step: group) — «La terminación «-carboxílico» solo se usa cuando el grupo –COOH está unido a un anillo. En una cadena, el carbono del –COOH es un carbono más de la cadena principal, siempre en un extremo, y el grupo se nombra con la palabra «ácido» al principio del nombre y la terminación «-oico» al final. Se escribe «ácido butanoico».» (`ácido propano-1-carboxílico`). Variants: «…«-dioico»…» (`ácido butano-1,4-dicarboxílico` → «ácido hexanodioico»); «Cuando el grupo –COOH está unido a un anillo, su carbono no forma parte del anillo ni es una cadena aparte: la cadena principal es el anillo, y el grupo se nombra con la palabra «ácido» al principio del nombre y la terminación «-carboxílico» al final.» (`ácido ciclohexilmetanoico`); «…y el grupo se nombra con «ácido benzoico» (el benceno con un grupo –COOH).» (`ácido fenilmetanoico`, `ácido (4-metilfenil)fórmico`). [I-51d3 · DIAGNOSIS_TEXTS (groupCarbonText)]
- D-51 **CARBONYL_PREFIX** (acids; step: group) — «El grupo –COOH es el grupo principal: se nombra con la palabra «ácido» al principio del nombre y la terminación «-oico» al final, no con el prefijo «carboxi». Su carbono entra en la cadena principal. Se escribe «ácido butanoico».» (`1-carboxipropano`). Variants: «…con «ácido benzoico» (el benceno con un grupo –COOH), no con el prefijo «carboxi».» (`carboxibenceno`); «Los grupos –COOH son el grupo principal: los de la cadena principal se nombran todos juntos… «-dioico»…» (`ácido 3-carboxipropanoico`); «…los unidos al anillo… «-dicarboxílico»…» (`1,3-dicarboxiciclohexano`). [I-51d3 · DIAGNOSIS_TEXTS]
- D-52 **CARBONYL_SENIORITY** (acids; step: group) — «…Aquí manda el ácido (–COOH), que se nombra con la palabra «ácido» al principio del nombre y la terminación «-oico» al final; el C=O de la cetona va delante, con el prefijo «oxo». Se escribe «ácido 4-oxopentanoico».» (`4-carboxibutan-2-ona`). Variants: «el –CHO del aldehído va delante, con el prefijo «oxo»» (`3-carboxipropanal`) or «…con el prefijo «formil»» (`4-carboxiciclohexano-1-carbaldehído`); «…que se nombra con «ácido benzoico» (el benceno con un grupo –COOH)…» (`4-carboxibenzaldehído`); «cada –CHO». [I-51d3 · DIAGNOSIS_TEXTS]
- D-53 **Acid words in the shared codes** — CARBONYL_PARENT: «…más grupos –COOH…» (`(2-carboxietil)ciclohexano` → «ácido 3-ciclohexilpropanoico»). MORE_CARBONYL_GROUPS: «Hay otra cadena con más grupos –COOH…» (`ácido 3-(carboximetil)pentanoico`). NUMBERING / RING_NUMBERING: «los grupos –COOH (el grupo principal) tienen que llevar los números más bajos» (`ácido ciclohexano-1,5-dicarboxílico`). CHAIN_LOCANTS: «…a los grupos –COOH…». NEEDLESS_LOCANTS: «En «ácido ciclohexanocarboxílico» no se escriben números: solo hay una manera de colocar el grupo –COOH.» (`ácido ciclohexano-1-carboxílico`), «…los grupos –COOH». MISSING_LOCANTS (the suffix's locant, first added here for every family): «Faltan números: hay que decir en qué carbono va cada rama, cada enlace doble o triple y cada grupo –COOH, como en «ácido 2-clorociclohexano-1-carboxílico».». OLD_STYLE: «…«dicarboxílico»: «ácido ciclohexano-1,4-dicarboxílico».» (`ácido 1,4-ciclohexanodicarboxílico`). [I-51d3 · DIAGNOSIS_PHRASES.carbonylN0, .groupWords, .what]

### 5.9 Esters

The principal –COO– group:

- D-54 **ESTER_GROUP** (step: group) — «Un C=O y un oxígeno unido a otro grupo de carbonos, en el mismo carbono, no son dos grupos distintos: juntos forman un solo grupo, el –COO– de los ésteres (su C=O no es un aldehído ni una cetona, ni su oxígeno del medio un éter). El grupo –COO– es el grupo principal: se nombra con la terminación «-oato» y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo». Se escribe «propanoato de metilo».» (`1-metoxipropanal`). Variants: «…Los grupos –COO– son el grupo principal: los de la cadena principal se nombran todos juntos con la terminación «-dioato» y, después de «de», los grupos unidos a los otros oxígenos, acabados en «-ilo».» (`4-metoxi-4-oxobutanoato de metilo`); «…los del anillo» / «…los unidos al anillo»; «…se nombra con «benzoato» (el benceno con un grupo –COO–) y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo».». [I-52a3a · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.esterWritten]
- D-55 **ESTER_CARBON** (step: group) — «La terminación «-carboxilato» solo se usa cuando el grupo –COO– está unido a un anillo. En una cadena, el carbono del –COO– es un carbono más de la cadena principal, siempre en un extremo, y el grupo se nombra con la terminación «-oato» y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo». Se escribe «butanoato de metilo».» (`propano-1-carboxilato de metilo`). Variants: «Cuando el grupo –COO– está unido a un anillo, su carbono no forma parte del anillo ni es una cadena aparte: la cadena principal es el anillo, y el grupo se nombra con la terminación «-carboxilato» y…» (`ciclohexilmetanoato de metilo`); «…con «benzoato» (el benceno con un grupo –COO–) y…» (`fenilmetanoato de metilo`). [I-52a3a · DIAGNOSIS_TEXTS (groupCarbonText)]
- D-56 **ESTER_IN_CHAIN** (step: groupChain) — «El prefijo «metoxicarbonil» está en el extremo de la cadena, y el carbono de su C=O la alarga: la cadena principal tiene 4 carbonos. Con ese carbono en la cadena, el éster ya no se nombra «metoxicarbonil», sino con dos prefijos con el mismo número: «oxo» para su C=O y uno acabado en «-oxi» para su oxígeno del medio con el grupo unido a él. Se escribe «ácido 4-metoxi-4-oxobutanoico».» (`ácido 3-(metoxicarbonil)propanoico`). [I-52a3a · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.chainEster]
- D-57 **CARBONYL_PREFIX** (esters; step: group) — «El grupo –COO– es el grupo principal: no se nombra con el prefijo «acetiloxi», sino con la terminación «-oato» y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo». Tu cadena va en el grupo unido al otro oxígeno, después de «de». Se escribe «etanoato de metilo».» (`(acetiloxi)metano`). Variants: «Tu anillo va en el grupo unido al otro oxígeno…» (`(acetiloxi)benceno` → «etanoato de fenilo»); «…no se nombra con el prefijo «metoxicarbonil», sino con la terminación «-oato»… Su carbono entra en la cadena principal.» (`1-(metoxicarbonil)propano` → «butanoato de metilo»); «…sino con «benzoato» (el benceno con un grupo –COO–) y…» (`(metoxicarbonil)benceno`); «Los grupos –COO– son el grupo principal: los de la cadena principal no se nombran con el prefijo «metoxicarbonil», sino todos juntos con la terminación «-dioato» y, después de «de», los grupos unidos a los otros oxígenos, acabados en «-ilo».» (`3-(metoxicarbonil)propanoato de metilo`); «…los unidos al anillo… «-dicarboxilato»…» (`1,3-bis(metoxicarbonil)ciclohexano`). [I-52a3a · DIAGNOSIS_TEXTS]
- D-58 **CARBONYL_SENIORITY** (esters; step: group) — «…Aquí manda el éster (–COO–), que se nombra con la terminación «-oato» y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo»; el C=O de la cetona va delante, con el prefijo «oxo». Se escribe «2-etil-3-oxobutanoato de metilo».» (`3-(metoxicarbonil)pentan-2-ona`). Variants: «el –CHO del aldehído va en el nombre del grupo unido al otro oxígeno, con el prefijo «oxo»» (`2-(acetiloxi)heptanal` → «etanoato de 1-oxoheptan-2-ilo»); «el –OH va en el nombre del grupo unido al otro oxígeno, con el prefijo «hidroxi»» (`2-(acetiloxi)etan-1-ol`); beside an acid: «el –COO– del éster va delante, con dos prefijos con el mismo número: «oxo» para su C=O y uno acabado en «-oxi» para su oxígeno del medio con el grupo unido a él» (`4-carboxibutanoato de metilo` → «ácido 5-metoxi-5-oxopentanoico»); «el –COO– del éster va delante, con el prefijo «acetiloxi»» (`etanoato de 2-carboxietilo` → «ácido 3-(acetiloxi)propanoico»); «cada –COO–». [I-52a3a · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.juniorPlace]
- D-59 **Ester words in the shared codes** — CARBONYL_PARENT: «…más grupos –COO–…» (`[(metoxicarbonil)metil]ciclohexano` → «2-ciclohexiletanoato de metilo»). MORE_CARBONYL_GROUPS: «…más grupos –COO–…» (`2-[(metoxicarbonil)metil]propanoato de metilo`). NUMBERING / RING_NUMBERING: «los grupos –COO– (el grupo principal) tienen que llevar los números más bajos» (`ciclohexano-1,5-dicarboxilato de dimetilo`). CHAIN_LOCANTS: «…a los grupos –COO–…». NEEDLESS_LOCANTS: «En «benzoato de metilo» no se escriben números: solo hay una manera de colocar el grupo –COO–.» (`benceno-1-carboxilato de metilo`), «…los grupos –COO–». MISSING_LOCANTS: «…y cada grupo –COO–». OLD_STYLE: «…«dicarboxilato»: «ciclohexano-1,4-dicarboxilato de dimetilo».» [I-52a3a · DIAGNOSIS_PHRASES.carbonylN0, .groupWords, .what]

The group bonded to the other oxygen (step: ester, or diester for a diester):

- D-60 **ESTER_TRADITIONAL** (step: assemble) — «El nombre tradicional «acetato» solo lo uso con el nombre del grupo unido al oxígeno que doy primero, «isopropilo»: «acetato de isopropilo». Con «propan-2-ilo», la primera palabra es la sistemática: «etanoato de propan-2-ilo».» (`acetato de propan-2-ilo`). [I-52a3b · DIAGNOSIS_TEXTS]
- D-61 **ESTER_ALKYL_CHAIN** (step: ester) — «La cadena del grupo unido al oxígeno se numera para que el carbono unido al oxígeno lleve el número más bajo posible: «butan-2-ilo», no «butan-3-ilo».» (`etanoato de butan-3-ilo`). Variants: «…: «propilo», no «propan-3-ilo». En «propilo» ese número ni siquiera se escribe.» (`etanoato de propan-3-ilo`); «…lleve el número más bajo posible; si así empatan, en el sentido que da los números más bajos a sus sustituyentes: «2-metilpentan-3-ilo», no «4-metilpentan-3-ilo».» (`etanoato de 4-metilpentan-3-ilo`), «…a sus enlaces dobles y triples»; «La cadena del grupo unido al oxígeno es la más larga que pasa por el carbono unido al oxígeno: aquí tiene 4 carbonos, no 3. Se escribe «butan-2-ilo», no «1-metilpropilo».» (`etanoato de 1-metilpropilo`); «…que empieza en el carbono unido al oxígeno…» (instead of «pasa por», when the student names branches in the «1-metiletil» style); «La cadena del grupo unido al oxígeno pasa por el carbono unido al oxígeno y, entre las más largas, es la que tiene más enlaces dobles o triples. Se escribe «2-etilbut-3-en-1-ilo», no «2-etenilbutilo».» (`etanoato de 2-etenilbutilo`); «…y, entre las más largas, con los mismos enlaces múltiples, gana la que tiene más enlaces dobles. Se escribe «3-etinilhex-1-en-3-ilo», no «3-etenilhex-1-in-3-ilo».» (`etanoato de 3-etenilhex-1-in-3-ilo`). [I-52a3b · DIAGNOSIS_TEXTS]
- D-62 **ESTER_ALKYL_NAME** (step: ester) — «El grupo unido al oxígeno se nombra como una rama, pero como palabra suelta y acabado en «-ilo»: aquí, «tert-butilo», no «1,1-dimetiletilo».» (`etanoato de 1,1-dimetiletilo`; also `etanoato de 4-metil-2-clorofenilo` → «2-cloro-4-metilfenilo»). [I-52a3b · DIAGNOSIS_TEXTS]
- D-63 **BRANCH_RING_NUMBERING** (O-bound ring; step: ester) — «Un anillo unido al oxígeno se numera empezando por el carbono unido al oxígeno, que es el 1, y siguiendo en el sentido que da los números más bajos a sus sustituyentes: «2-metilfenilo», no «6-metilfenilo».» (`etanoato de 6-metilfenilo`). Other reasons as D-47. [I-52a3b · DIAGNOSIS_TEXTS]
- D-64 **ALPHABETICAL_ORDER** (two O-bound groups; step: diester) — «Los grupos unidos a los oxígenos se escriben por orden alfabético, unidos por «y»: «etilo» va antes que «metilo» (e antes que m). Se escribe «etilo y metilo», no «metilo y etilo».» (`propanodioato de metilo y etilo`). [I-52a3b · DIAGNOSIS_TEXTS]
- D-65 **UNGROUPED** (O-bound groups; step: diester) — «Los grupos iguales unidos a los oxígenos se escriben una sola vez, con «di», «tri»… delante: «dimetilo», no «metilo y metilo».» (`butanodioato de metilo y metilo`; also «di(propan-2-ilo)»). Variants: «…con «bis», «tris»… delante: «bis(1-metiletilo)», no «1-metiletilo y 1-metiletilo».» [I-52a3b · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.equalGroups]
- D-66 **MULTIPLIER_KIND** (O-bound groups; step: diester) — «Delante de un grupo que tiene sus propios sustituyentes se usa «bis», «tris»…: «bis(2-cloroetilo)», no «di(2-cloroetilo)».» (`butanodioato de di(2-cloroetilo)`). Variants: ««bis», «tris»… solo van delante de grupos que tienen sus propios sustituyentes; aquí va «di», «tri»…: «dimetilo», no «bismetilo».» (`butanodioato de bismetilo`). [I-52a3b · DIAGNOSIS_TEXTS]
- D-67 **NEEDLESS_LOCANTS** (O-bound group; step: ester) — «Sobran números en el nombre del grupo unido al oxígeno: se escribe «propilo», no «propan-1-ilo».» (`etanoato de propan-1-ilo`; also «clorometilo» for `1-clorometilo`, «ciclohexilo» for `ciclohexan-1-ilo`). [I-52a3b · DIAGNOSIS_TEXTS]

Ester prefixes and an ester written as an ether:

- D-68 **ESTER_PREFIX_NAME** (step: substituents) — «Un éster (–COO–) unido por su oxígeno del medio se nombra con el prefijo «aciloxi-»: el nombre del grupo acilo, aquí «acetil», más «oxi», que es el oxígeno; su C=O no se nombra con «oxo». Se escribe «acetiloxi», no «1-oxoetoxi».» (`ácido 2-(1-oxoetoxi)etanoico`). Variants: «Un éster (–COO–) unido por el carbono de su C=O se nombra con un solo prefijo que lo incluye todo, «alcoxicarbonil-»: el nombre del grupo unido al oxígeno acabado en «-oxi», aquí «metoxi», más «carbonil», que es el C=O; su C=O no se nombra con «oxo». Se escribe «metoxicarbonil», no «(metoxi)oxometil».» (`ácido 3-[(metoxi)oxometil]pentanodioico`); either may drop «, aquí «…»,» and «; su C=O no se nombra con «oxo»». ACYL_NAME on these prefixes: D-45. [I-52a3b · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.esterPrefixes]
- D-69 **ESTER_CLASS_NAME** (step: group) — «El oxígeno de tu nombre está unido a un carbono con un C=O: juntos forman un solo grupo, el –COO– de los ésteres, así que la molécula es un éster, no un éter, y no se nombra con «éter». El grupo –COO– es el grupo principal: se nombra con la terminación «-oato» y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo». Se escribe «etanoato de metilo».» (`(1-oxoetil) metil éter`). [I-52a3b · DIAGNOSIS_TEXTS]

### 5.10 Nitriles

- D-70 **NITRILE_CARBON** (step: group) — «La terminación «-carbonitrilo» solo se usa cuando el grupo –C≡N está unido a un anillo. En una cadena, el carbono del –C≡N es un carbono más de la cadena principal, siempre en un extremo, y el grupo se nombra con la terminación «-nitrilo», al final del nombre. Se escribe «butanonitrilo».» (`propano-1-carbonitrilo`). Variants: «…«-dinitrilo»…» (`butano-1,4-dicarbonitrilo` → «hexanodinitrilo»); «Cuando el grupo –C≡N está unido a un anillo, su carbono no forma parte del anillo ni es una cadena aparte: la cadena principal es el anillo, y el grupo se nombra con la terminación «-carbonitrilo», al final del nombre.» (`ciclohexilmetanonitrilo`); «…con «benzonitrilo» (el benceno con un grupo –C≡N).» (`fenilmetanonitrilo`). [I-52b3 · DIAGNOSIS_TEXTS (groupCarbonText)]
- D-71 **CARBONYL_PREFIX** (nitriles; step: group) — «El grupo –C≡N es el grupo principal: se nombra con la terminación «-nitrilo», al final del nombre, no con el prefijo «ciano». Su carbono entra en la cadena principal. Se escribe «etanonitrilo».» (`cianometano`). Variants: «…«-carbonitrilo»…» (`cianociclohexano`); «…con «benzonitrilo» (el benceno con un grupo –C≡N), no con el prefijo «ciano».» (`cianobenceno`); «Los grupos –C≡N son el grupo principal: los de la cadena principal se nombran todos juntos con la terminación «-dinitrilo»…» (`4-cianobutanonitrilo`); «…los unidos al anillo… «-dicarbonitrilo»…», «…«-tricarbonitrilo»…» (`4-cianoftalonitrilo` → «benceno-1,2,4-tricarbonitrilo»). [I-52b3 · DIAGNOSIS_TEXTS]
- D-72 **CARBONYL_SENIORITY** (nitriles; step: group) — «…Aquí manda el nitrilo (–C≡N), que se nombra con la terminación «-nitrilo», al final del nombre; el C=O de la cetona va delante, con el prefijo «oxo». Se escribe «4-oxopentanonitrilo».» (`4-cianobutan-2-ona`). Variants: «…con «benzonitrilo» (el benceno con un grupo –C≡N)…» (`4-cianofenol`); a junior nitrile: «Aquí manda el ácido (–COOH)…; el –C≡N del nitrilo va delante, con el prefijo «ciano», que incluye su carbono: ese carbono no se cuenta en la cadena principal. Se escribe «ácido 3-cianopropanoico».» (`3-carboxipropanonitrilo`); «…ese carbono no se cuenta en el anillo» (`4-carboxibenzonitrilo`); beside an ester: «…el –C≡N del nitrilo va en el nombre del grupo unido al otro oxígeno, con el prefijo «ciano», que incluye su carbono: ese carbono no se cuenta en la cadena de ese grupo.» (`2-(acetiloxi)etanonitrilo` → «etanoato de cianometilo»); «cada –C≡N» (`4-carboxiftalonitrilo`). [I-52b3 · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.cyanoCarbon]
- D-73 **Nitrile words in the shared codes** — CARBONYL_PARENT: «…más grupos –C≡N…» (`(cianometil)benceno` → «2-feniletanonitrilo»). MORE_CARBONYL_GROUPS: «…más grupos –C≡N…» (`2-(cianometil)butanonitrilo`). NUMBERING / RING_NUMBERING: «los grupos –C≡N (el grupo principal) tienen que llevar los números más bajos» (`ciclohexano-1,5-dicarbonitrilo`). CHAIN_LOCANTS: «…a los grupos –C≡N…». NEEDLESS_LOCANTS: «En «benzonitrilo» no se escriben números: solo hay una manera de colocar el grupo –C≡N.» (`benceno-1-carbonitrilo`), «…los grupos –C≡N». MISSING_LOCANTS: «…y cada grupo –C≡N». OLD_STYLE: «…«dicarbonitrilo»: «ciclohexano-1,4-dicarbonitrilo».» [I-52b3 · DIAGNOSIS_PHRASES.carbonylN0, .groupWords, .what]

### 5.11 Amines

- D-74 **AMINE_SIDE** (step: groupChain; ring or benzene when the parent is a ring) — «El nitrógeno de la amina está unido a varios grupos de carbonos, y la cadena principal no puede pasar por él: es uno de esos grupos, y se elige con las reglas de siempre. Aquí la cadena principal está en el otro lado del nitrógeno, no en el de tu cadena: en ese lado hay una cadena de 2 carbonos, más larga que la tuya, de 1. Tu cadena es el sustituyente «metil», que va unido al nitrógeno y se escribe con la letra «N» delante: «N-metiletanamina».» (`N-etilmetanamina`). Variants: «…en ese lado está el benceno, y un anillo manda siempre sobre una cadena abierta.» (`N-fenilmetanamina` → «N-metilbencenamina»); «…más larga que la de tu lado, de 2. La rama «metil» está en el extremo de tu cadena, así que la alarga: es parte de la cadena de tu lado. Tu cadena es el sustituyente «etil»…» (`N-propil-1-metilmetanamina`, I-52c4a review); the fallback «Tu cadena va unida al nitrógeno, y se escribe con la letra «N» delante» (no test reaches it). Reasons: D-93. [I-52c4a · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.amineHolder, .endBranch]
- D-75 **CARBONYL_PREFIX** (amines; step: group) — «El grupo amino es el grupo principal: se nombra con la terminación «-amina», al final del nombre, no con el prefijo «amino». Se escribe «etanamina».» (`aminoetano`; also `aminobenceno` → «bencenamina»). Variants: «…no con el prefijo «metilamino». El otro grupo unido al nitrógeno va delante, con la letra «N» en vez de un número. Se escribe «N-metilmetanamina».» (`(metilamino)metano`); «Los otros grupos unidos al nitrógeno van delante, con la letra «N» en vez de un número.» (`1-(dimetilamino)propano`); «Los grupos amino son el grupo principal: los de la cadena principal se nombran todos juntos con la terminación «-diamina»…» (`4-aminobutan-1-amina`); «…los del anillo…» (`4-aminoanilina` → «benceno-1,4-diamina»). [I-52c4a · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.nitrogenGroups]
- D-76 **CARBONYL_SENIORITY** (a junior amine; step: group) — «…Aquí manda el alcohol (–OH), que se nombra con la terminación «-ol», al final del nombre; el grupo amino va delante, con el prefijo «amino». Se escribe «2-aminoetan-1-ol».» (`2-hidroxietan-1-amina`). Variants: «…con «fenol» (el benceno con un grupo –OH)…» (`4-hidroxianilina` → «4-aminofenol»); «…con el prefijo «dimetilamino»» (`N,N-dimetil-2-hidroxietan-1-amina`); «cada grupo amino va delante, con el prefijo «amino»» (`2-hidroxipropano-1,3-diamina`); «Aquí manda la amida (un C=O unido a un nitrógeno), que se nombra con la terminación «-amida», al final del nombre; el grupo amino no va aparte: su nitrógeno, con el C=O unido a él, forma la amida. Se escribe «N-etiletanamida».» (`N-acetiletanamina`); «…con «benzamida» (el benceno con un grupo amida)…» (`N-benzoiletanamina`); «…forma una amida» (several); «cada grupo amino va delante, con el prefijo «amino», salvo el que forma la amida con el C=O unido a su nitrógeno» (`4-oxobutano-1,4-diamina` → «4-aminobutanamida»); «el grupo amino va en el nombre del grupo unido al otro oxígeno, con el prefijo «amino»» (`2-(acetiloxi)etan-1-amina` → «etanoato de 2-aminoetilo»); on a class name: «…con el prefijo «metilamino». Se escribe «2-(metilamino)etan-1-ol».» (`(2-hidroxietil)metilamina`, I-52c4b). [I-52c4a · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.juniorPlace]
- D-77 **Amine words in the shared codes** — CARBONYL_PARENT: «…más grupos amino…» (`(aminometil)benceno` → «fenilmetanamina»). MORE_CARBONYL_GROUPS: «…más grupos amino…» (`2-(aminometil)butan-1-amina`). NUMBERING / RING_NUMBERING: «los grupos amino (el grupo principal) tienen que llevar los números más bajos» (`butan-3-amina`). CHAIN_LOCANTS: «…a los grupos amino…». NEEDLESS_LOCANTS: «En «etanamina» no se escriben números: solo hay una manera de colocar el grupo amino.» (`etan-1-amina`), «…los grupos amino». MISSING_LOCANTS: «…y cada grupo amino». OLD_STYLE: «…delante de «amina»: «butan-2-amina».» (`2-butanamina`), «…«diamina»…». [I-52c4a · DIAGNOSIS_PHRASES.carbonylN0, .groupWords, .what]
- D-78 **NEEDLESS_LOCANTS** (beside an «N»; step: numbering) — «En «1-cloro-N-metilmetanamina» no se escribe el número que dice en qué carbono de la cadena va el grupo amino: solo hay una manera de colocarlo. Los números de los sustituyentes sí se escriben: cuando hay una «N», se escriben siempre, para que quede claro qué va en un carbono y qué en el nitrógeno.» (`1-cloro-N-metilmetan-1-amina`). [I-52c4a · DIAGNOSIS_PHRASES.nitrogenKept]
- D-79 **LOCANT_ORDER** (with «N»; step: assemble) — «Los números de un mismo grupo se escriben de menor a mayor, y la letra «N» va antes que los números: «N,2-dimetil», no «2,N-dimetil».» (`2,N-dimetilpropan-1-amina`). [I-52c4a · DIAGNOSIS_TEXTS]

Amine class names (step: amineClass):

- D-80 **CLASS_NAME_NONE** (amines) — «Un nombre como «etilmetilamina» (los grupos unidos al nitrógeno y la palabra «amina», todo junto) solo lo doy cuando el nitrógeno lleva grupos sencillos: cadenas sin ramas unidas por su extremo (metil, etil, propil…), isopropil o tert-butil, sin enlaces dobles ni triples, sin anillos y sin más átomos que esos carbonos y el nitrógeno. Esta molécula se nombra con la terminación «-amina»: «ciclohexanamina».» (`ciclohexilamina`). Variants: «…: «bencenamina» (también vale «anilina»).» (`fenilamina`), «…«N-metilbencenamina» (también vale «N-metilanilina»).» (`fenilmetilamina`). [I-52c4b · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.simpleAmineGroups]
- D-81 **CLASS_GROUP_WORDS** (amines) — «En un nombre como «metilamina», cada grupo unido al nitrógeno se nombra con su forma más sencilla, sin números: metil, etil, propil…, isopropil o tert-butil. Se escribe «isopropilamina».» (`(propan-2-il)amina`). [I-52c4b · DIAGNOSIS_TEXTS]
- D-82 **CLASS_ORDER** (amines) — «En un nombre como «metilamina», los grupos unidos al nitrógeno se escriben por orden alfabético: «etil» va antes que «metil» (e antes que m). Se escribe «etilmetilamina».» (`metiletilamina`). Variants: hint ««tert-» no cuenta para el orden.» (`metiltert-butilamina` → «tert-butilmetilamina»); hint «Los prefijos di-, tri-… no cuentan para el orden.» (`dimetiletilamina` → «etildimetilamina»); reason «(con las mismas letras, va primero el grupo sin «tert-»)» (`tert-butilbutilamina` → «butiltert-butilamina»). [I-52c4b · DIAGNOSIS_TEXTS]
- D-83 **CLASS_DI** (amines) — «En un nombre como «metilamina», los grupos iguales unidos al nitrógeno se escriben una sola vez, con «di» o «tri» delante: «dimetilamina», no «metilmetilamina».» (`metilmetilamina`; also `etilmetilmetilamina` → «etildimetilamina»). Variants: «…con «di» o «tri» delante («bis», «tris»… solo van delante de grupos que tienen sus propios sustituyentes): «dimetilamina», no «bismetilamina».» [I-52c4b · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.compoundOnly]
- D-84 **Step «Monta el nombre tradicional de la amina»** (the amineClass step, which the explanation adds only for an amine class-name diagnosis; «cadena principal» and «sufijo» are glossary links). For an amine that has a class name:
  - «El nombre que explican los otros pasos, «N,N-dimetiletanamina», es el que doy primero, el nombre sustitutivo, con la cadena principal y el sufijo «-amina». Una amina sencilla como esta tiene también otro nombre, el nombre tradicional, muy usado en los libros. Se monta de otra manera, sin cadena principal y sin números.»
  - «Los grupos unidos al nitrógeno se nombran como ramas, acabados en «-il», cada uno con su forma más sencilla y sin números (metil, etil, propil…, isopropil o tert-butil): aquí, «etil» y dos «metil».» (or «aquí, «metil».», «los dos son «metil»», «los tres son «metil»», ««etil», «metil» y «propil»»)
  - «Los grupos se escriben por orden alfabético, como los sustituyentes de un nombre: «tert-» no cuenta para el orden («tert-butilmetilamina»), y si las letras empatan va primero el grupo sin «tert-».»
  - «Si hay grupos iguales, se escriben una sola vez, con «di» o «tri» delante, que tampoco cuentan para el orden: «dimetilamina», no «metilmetilamina»; «etildimetilamina».»
  - «Al final va la palabra «amina», y todo se escribe junto, en una sola palabra. Para esta molécula: «etildimetilamina».»

  For one that has none (CLASS_NAME_NONE):
  - «Una amina sencilla tiene también un nombre tradicional, muy usado en los libros: los grupos unidos al nitrógeno y la palabra «amina», todo junto, como «etilmetilamina» (el nombre sustitutivo, el que explican los otros pasos, se monta de otra manera, con el sufijo «-amina»).»
  - «Ese nombre se monta sin cadena principal y sin números: los grupos unidos al nitrógeno se nombran como ramas acabadas en «-il», por orden alfabético («tert-», «di» y «tri» no cuentan), una sola vez con «di» o «tri» delante si son iguales, y al final va «amina», todo junto: «metilamina», «dimetilamina», «etilmetilamina».»
  - «Ese nombre solo lo doy cuando el nitrógeno lleva grupos sencillos: cadenas sin ramas unidas por su extremo (metil, etil, propil…), isopropil o tert-butil, sin enlaces dobles ni triples, sin anillos y sin más átomos que esos carbonos y el nitrógeno.»
  - «Esta molécula no es una de esas aminas sencillas, así que no tiene ese nombre: se nombra como en los otros pasos, con la terminación «-amina»: «bencenamina» (también vale «anilina»).»

  [I-52c4b · AMINE_CLASS_STEP_TEXTS, DIAGNOSIS_PHRASES.amineClassGroups]

### 5.12 Amides

- D-85 **AMIDE_GROUP** (step: group) — «Un C=O y un nitrógeno en el mismo carbono no son dos grupos distintos: juntos forman un solo grupo, el grupo amida (su C=O no es un aldehído ni una cetona, ni su nitrógeno una amina). El grupo amida es el grupo principal: se nombra con la terminación «-amida», al final del nombre. Se escribe «butanamida».» (`1-aminobutanal`). Variants: «…El otro grupo unido al nitrógeno va delante, con la letra «N» en vez de un número. Se escribe «N-metilbutanamida».» (`1-(metilamino)butanal`); «Los otros grupos unidos al nitrógeno van delante…» (`1-(dimetilamino)propanal`); «Los grupos amida son el grupo principal: los de la cadena principal se nombran todos juntos con la terminación «-diamida», al final del nombre.» (`4-amino-4-oxobutanamida`); «…los unidos al anillo… «-dicarboxamida»…»; «…se nombra con la terminación «-carboxamida»…» (`(aminooxometil)ciclohexano`); «…se nombra con «benzamida» (el benceno con un grupo amida).» (`(aminooxometil)benceno`). [I-52d4 · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.amideWritten]
- D-86 **AMIDE_CARBON** (step: group) — «La terminación «-carboxamida» solo se usa cuando el grupo amida está unido a un anillo. En una cadena, el carbono del grupo amida es un carbono más de la cadena principal, siempre en un extremo, y el grupo se nombra con la terminación «-amida», al final del nombre. Se escribe «butanamida».» (`propano-1-carboxamida`). Variants: «…«-diamida»…» (`butano-1,4-dicarboxamida` → «hexanodiamida»); «Cuando el grupo amida está unido a un anillo, su carbono no forma parte del anillo ni es una cadena aparte: la cadena principal es el anillo, y el grupo se nombra con la terminación «-carboxamida», al final del nombre.» (`1-ciclohexilmetanamida`); «…con «benzamida» (el benceno con un grupo amida).» (`1-fenilmetanamida`, `N-metil-1-fenilmetanamida` → «N-metilbenzamida»). [I-52d4 · DIAGNOSIS_TEXTS (groupCarbonText)]
- D-87 **AMIDE_IN_CHAIN** (step: groupChain) — «El prefijo «carbamoil» está en el extremo de la cadena, y el carbono de su C=O la alarga: la cadena principal tiene 4 carbonos. Con ese carbono en la cadena, la amida ya no se nombra «carbamoil», sino con dos prefijos con el mismo número: «oxo» para su C=O y «amino» para su nitrógeno, con los grupos unidos a él. Se escribe «ácido 4-amino-4-oxobutanoico».» (`ácido 3-carbamoilpropanoico`; also `ácido 3-(metilcarbamoil)propanoico` → «ácido 4-(metilamino)-4-oxobutanoico»). [I-52d4 · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.chainAmide]
- D-88 **AMIDE_PREFIX_NAME** (step: substituents; ester on an ester's O-bound side) — «Un grupo amida unido por el carbono de su C=O, cuando ese carbono no es de una cadena, se nombra con un solo prefijo que lo incluye todo, «carbamoil»: el C=O con su nitrógeno; su C=O no se nombra con «oxo». Se escribe «carbamoil», no «aminooxometil».» (`ácido 2-(aminooxometil)butanodioico`). Variants: «…el C=O con su nitrógeno, con los grupos unidos al nitrógeno delante, sin números; …Se escribe «metilcarbamoil», no «(metilamino)oxometil».» (`ácido 2-[(metilamino)oxometil]butanodioico`); «El carbono del C=O de un grupo amida cuenta como un carbono más para la cadena de la rama, que se elige con las reglas de siempre: aquí esa cadena pasa por él, así que la amida no forma una rama aparte, «carbamoil», sino que se nombra con dos prefijos con el mismo número: «oxo» para su C=O y «amino» para su nitrógeno, con los grupos unidos a él. Se escribe «2-amino-2-oxoetil», no «carbamoilmetil».» (`ácido 2-(carbamoilmetil)butanodioico`); «…para la cadena del grupo unido al oxígeno…» (`etanoato de 2-carbamoiletilo` → «3-amino-3-oxopropilo»). [I-52d4 · DIAGNOSIS_TEXTS]
- D-89 **CARBONYL_PREFIX** (amides; step: group) — «El grupo amida es el grupo principal: se nombra con la terminación «-carboxamida», al final del nombre, no con el prefijo «carbamoil». Se escribe «ciclohexanocarboxamida».» (`carbamoilciclohexano`). Variants: «…con «benzamida» (el benceno con un grupo amida), no con el prefijo «carbamoil».» (`carbamoilbenceno`); «…con la terminación «-amida»… Su carbono entra en la cadena principal.» (`1-carbamoilpropano` → «butanamida»); «Los grupos amida son el grupo principal: los de la cadena principal… «-diamida»…» (`4-carbamoilbutanamida`), «…los unidos al anillo… «-dicarboxamida»…»; «…no con el prefijo «metilcarbamoil». El otro grupo unido al nitrógeno va delante, con la letra «N» en vez de un número.» (`(metilcarbamoil)ciclohexano`); an acylamino prefix: «…no con el prefijo «acetilamino». Tu cadena es el sustituyente «isopropil», que va unido al nitrógeno y se escribe con la letra «N» delante. Se escribe «N-isopropiletanamida».» (`2-(acetilamino)propano`); «Tu anillo es el sustituyente «fenil»…» (`(acetilamino)benceno`); the fallbacks «Tu cadena va unida al nitrógeno, y se escribe con la letra «N» delante.» / «Tu anillo va unido…» (no test reaches them). [I-52d4 · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.amineHolder]
- D-90 **CARBONYL_SENIORITY** (amides; step: group) — «…Aquí manda la amida (un C=O unido a un nitrógeno), que se nombra con la terminación «-amida», al final del nombre; el –C≡N del nitrilo va delante, con el prefijo «ciano», que incluye su carbono: ese carbono no se cuenta en la cadena principal. Se escribe «2-cianobutanamida».» (`2-carbamoilbutanonitrilo`). Variants: «…con «benzamida» (el benceno con un grupo amida)…» (`4-carbamoilfenol`); «el –OH va delante, en los prefijos» (`2-(acetilamino)etan-1-ol` → «N-(2-hidroxietil)etanamida»); a junior amide: «Aquí manda el ácido (–COOH)…; el grupo amida va delante, con dos prefijos con el mismo número: «oxo» para su C=O y «amino» para su nitrógeno, con los grupos unidos a él. Se escribe «ácido 5-amino-5-oxopentanoico».» (`4-carboxibutanamida`); «el grupo amida va delante, con el prefijo «carbamoil»» (`4-carboxibenzamida`), «…con el prefijo «acetilamino»» (`N-(carboximetil)etanamida`); beside an ester: «el grupo amida va en el nombre del grupo unido al otro oxígeno, con dos prefijos con el mismo número…» (`2-(acetiloxi)etanamida` → «etanoato de 2-amino-2-oxoetilo»); «cada grupo amida». [I-52d4 · DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES.juniorPlace]
- D-91 **Amide words in the shared codes** — CARBONYL_PARENT: «…más grupos amida…» (`(carbamoilmetil)benceno` → «2-feniletanamida»). MORE_CARBONYL_GROUPS: «…más grupos amida…» (`2-(carbamoilmetil)butanamida`). NUMBERING / RING_NUMBERING: «los grupos amida (el grupo principal) tienen que llevar los números más bajos» (`ciclohexano-1,5-dicarboxamida`). CHAIN_LOCANTS: «…a los grupos amida…». NEEDLESS_LOCANTS: «En «benzamida» no se escriben números: solo hay una manera de colocar el grupo amida.» (`benceno-1-carboxamida`), «…los grupos amida». MISSING_LOCANTS: «…y cada grupo amida». OLD_STYLE: «…«dicarboxamida»: «ciclohexano-1,4-dicarboxamida».» [I-52d4 · DIAGNOSIS_PHRASES.carbonylN0, .groupWords, .what]

### 5.13 Shared phrases

- D-92 **The seniority lists of CARBONYL_SENIORITY** — the message opens «Cuando hay grupos distintos, solo uno es el grupo principal, y se elige por este orden: X.» and X depends on the groups in play:
  - «aldehído > cetona > alcohol» (aldehydes, ketones and alcohols only) [I-51c3b1];
  - «ácido > aldehído > cetona > alcohol» (beside an acid) [I-51d3];
  - «ácido > éster > aldehído > cetona > alcohol» (with an ester) [I-52a3a];
  - «ácido > nitrilo > aldehído > cetona > alcohol» (an acid's –COOH, the student's suffix a nitrile's) [I-52b3];
  - «ácido > éster > nitrilo > aldehído > cetona > alcohol» (an ester's –COO–, the student's suffix a nitrile's) [I-52b3];
  - «ácido > éster > amida > nitrilo > aldehído > cetona > alcohol > amina» (the whole order: a nitrile as the principal group [I-52b3], the student's suffix an amine's [I-52c4a], an amide as the principal group or as the student's suffix [I-52d4]).

  [DIAGNOSIS_PHRASES.seniority, .acidSeniority, .esterSeniority, .cyanoSeniority, .nitrileSeniority, .amineSeniority, .amideSeniority]
- D-93 **Why the parent is on the other side (ETHER_SIDE, AMINE_SIDE)** — the clause after «no en el de tu cadena:» (or «…de tu anillo:»), by the rule that decided:
  - «en ese lado hay un anillo, y un anillo manda siempre sobre una cadena abierta» / «en ese lado está el benceno, y…»;
  - «primero cuenta el grupo principal, y en ese lado hay un grupo –OH y en el tuyo, ninguno» (also «…y en tu cadena, ninguno», «…en tu anillo…», «…en tu lado…»; counts «2 grupos –OH» and «…, uno»);
  - «primero cuenta el grupo principal, y los dos lados llevan un grupo –OH cada uno; en el empate, manda el anillo»;
  - «en ese lado hay una cadena de 2 carbonos, más larga que la tuya, de 1» (or «…que la de tu lado…»);
  - «las cadenas de los dos lados empatan en longitud, y la de ese lado tiene más enlaces dobles o triples (1; la tuya, 0)»;
  - «las cadenas de los dos lados empatan en longitud y en enlaces múltiples, y la de ese lado tiene más enlaces dobles (1; la tuya, 0)»;
  - «las cadenas de los dos lados empatan en longitud y en enlaces dobles o triples, y la de ese lado tiene más sustituyentes (2; la tuya, 1)»;
  - «las cadenas de los dos lados empatan en longitud, en enlaces múltiples y en sustituyentes, y la de ese lado, bien numerada, da números más bajos a los sustituyentes (1 en vez de 2)» (or to any of the things in D-6, or to «los grupos amino» etc.);
  - «las cadenas de los dos lados empatan en longitud y en todo lo demás, y la de ese lado da un nombre que va antes por orden alfabético».

  The group words follow the principal group: «un grupo C=O», «un grupo –CHO», «un grupo –COOH», «un grupo –COO–», «un grupo –C≡N», «un grupo amino», «un grupo amida». («la de tu lado», «en tu lado» I-52c4a review.) [I-51b2 · DIAGNOSIS_PHRASES.etherSide]

## 6. Ayuda «Del nombre al dibujo»

The section of the Ayuda dialog (button «Ayuda») about «¿Cómo se dibuja?»,
paragraph by paragraph, as it reads today (`index.html`).

- A-1 Subtitle — «Del nombre al dibujo» [I-48b]
- A-2 Introduction (`#help-name-to-drawing`) — «También puedes hacerlo al revés: pulsa «¿Cómo se dibuja?», debajo de «¿Cómo se llama?», y forma un nombre con las fichas, sin escribir: números, «¿Cuántos?» (di, tri…), raíces (met, et, prop…), terminaciones (ano, eno, ino) y ramas (il…). Los guiones, las comas, los paréntesis y los espacios los pongo yo. Una rama que lleva sus propias ramas, como (2-metilpropil), va entre las fichas «empieza rama compuesta» y «acaba rama», de la fila «Ramas». Para corregir, pulsa una ficha del nombre: la siguiente que elijas irá detrás, y «Borrar ficha» la quita. Leo nombres de hidrocarburos de cadena abierta (alcanos, alquenos y alquinos, con sus ramas) o con un anillo, y de sus derivados halogenados, alcoholes y fenoles, éteres, aldehídos y cetonas, ácidos carboxílicos, ésteres, nitrilos, aminas y amidas.» [I-48b; the family list grew with each family phase (I-50c … I-52d3); the compound-branch sentence and the list as one list I-53b]
- A-3 Anillos (`#help-name-to-drawing-rings`) — «Anillos. En la fila «Anillos», «ciclo» va delante de la raíz: ciclohexano, ciclohexeno o, como rama, ciclohexil. Si un enlace doble va del último carbono del anillo al 1, su número se escribe con la ficha «1(n)»: ciclohex-1(6)-eno-1,2,4-triol. El benceno es una ficha entera que va al final del nombre (1,2-dimetilbenceno); como rama se escribe «fenil», y si lleva sus propias ramas va en una rama compuesta: (4-metilfenil). En «Nombres tradicionales» están el tolueno, el estireno, el xileno y el mesitileno, y también unos fenoles: el cresol, el pirocatecol o catecol, el resorcinol y la hidroquinona. El xileno lleva delante los números de sus dos metilos (1,2-xileno) o una letra: o (orto) = 1,2, m (meta) = 1,3 y p (para) = 1,4, como en el p-xileno. El cresol, un fenol con un metilo, solo lleva la letra (p-cresol). Esas letras sirven también para dos grupos en el benceno, iguales (p-dimetilbenceno) o distintos: entonces la letra va al principio del nombre y los dos grupos, seguidos y por orden alfabético (m-cloroetilbenceno, que con números es el 1-cloro-3-etilbenceno). Y sirven para un segundo grupo en el fenol, la anilina, el benzaldehído, el ácido benzoico, el benzoato, el benzonitrilo y la benzamida (p-metilfenol, p-cloroanilina), pero no con tres grupos. Si le pones ramas a un nombre tradicional (4-metiltolueno, 4-clorocatecol), dibujo la molécula y te digo cómo se llama, porque esos nombres solo valen para la molécula sin más ramas.» (changed in I-54b: the letters sentence read «Esas letras sirven también para dos grupos iguales en el benceno (p-dimetilbenceno) y para un segundo grupo en el fenol, … (p-metilfenol, p-cloroanilina), pero no con tres grupos ni con dos grupos distintos en «benceno» (1-bromo-4-clorobenceno).»; listed again as O-7.) [I-50c; the phenols I-51a3a; the «1(n)» sentence and the letters for a second group on fenol, anilina… I-53b; two different groups I-54b]
- A-4 Grupos (halogens, alcohols) (`#help-name-to-drawing-groups`) — «Grupos. En la fila «Grupos» están los halógenos: fluoro, cloro, bromo y yodo. Van delante de la cadena principal, como las ramas, con sus números y en orden alfabético junto a ellas (2-bromo-1-cloropropano, 1-cloro-2-metilpropano), también en el benceno (1-bromo-4-clorobenceno) o dentro de una rama compuesta: (2-cloroetil). En un alcohol, «ol» va al final, detrás de la terminación de la cadena principal y de sus números: prop, ano, 2 y ol dan propan-2-ol (la «o» de «ano» la quito yo), y con «di», «tri»… butano-1,4-diol. En una rama, el grupo OH se escribe «hidroxi»: (hidroximetil). El fenol es una ficha entera de la fila «Anillos» (4-metilfenol).» [I-51a1; the alcohol and phenol sentences I-51a3a]
- A-5 Éteres (`#help-name-to-drawing-ethers`) — «Éteres. En un éter, «oxi» va detrás de una rama y la une a la cadena por un oxígeno: met, il y oxi dan metoxi, como en 1-metoxipropano. La «il» de las ramas cortas la quito yo (metoxi, etoxi, propoxi, butoxi, isopropoxi, tert-butoxi, fenoxi); las demás la conservan y van entre paréntesis: (pentiloxi), (propan-2-iloxi). Si la rama lleva sus propias ramas, «oxi» va dentro de la rama compuesta, antes de cerrarla: (2-metilpropoxi). El anisol (metoxibenceno) está en «Nombres tradicionales»; como los demás nombres tradicionales, solo vale sin más ramas. Un éter sencillo también se puede nombrar con la palabra «éter», que está en «Grupos»: van primero los dos grupos unidos al oxígeno, por orden alfabético y sin números, y al final «éter» (et, il, met, il y éter dan etil metil éter, otro nombre del metoxietano); si los dos grupos son iguales, se escriben una vez con «di»: dietil éter. Este nombre solo lo doy para los éteres más sencillos, con dos grupos sin ramas unidos por su extremo, isopropil o tert-butil (tert-butil metil éter).» [I-51b1; the «éter» class name I-51b2]
- A-6 Aldehídos y cetonas (`#help-name-to-drawing-carbonyls`) — «Aldehídos y cetonas. En un aldehído, «al» va al final, detrás de la terminación de la cadena, y no lleva números, porque el grupo CHO siempre está en un extremo: but, ano y al dan butanal. En una cetona, «ona» va al final con su número: pent, ano, 2 y ona dan pentan-2-ona. Un grupo CHO unido a un anillo se escribe «carbaldehído» (ciclohexanocarbaldehído), y el benzaldehído es una ficha entera de la fila «Anillos». Si el C=O no es el grupo principal, se escribe «oxo» (4-oxopentanal), y el grupo CHO como rama, «formil». Una rama unida a la cadena por el carbono de un C=O se escribe con «acetil» (3-acetilpentano-2,4-diona), con «oil» detrás de la terminación de la rama (propanoil) o con «carbonil» detrás del nombre de un anillo (ciclohexanocarbonil); el benceno así unido es «benzoil». En «Nombres tradicionales» están el formaldehído, el acetaldehído, la acetona, la acetofenona, el fenilacetaldehído y los ftalaldehídos (ftalaldehído, isoftalaldehído y tereftalaldehído). Los ftalaldehídos admiten ramas en el anillo (4-metilftalaldehído) y el acetaldehído, un fenil con ramas en el carbono 2 (2-(4-metilfenil)acetaldehído); los demás solo valen sin más ramas.» [I-51c3a]
- A-7 Ácidos (`#help-name-to-drawing-acids`) — «Ácidos. El nombre de un ácido empieza por la palabra «ácido», que está en «Grupos»: va la primera, delante de todo lo demás, y el espacio de detrás lo pongo yo. En una cadena, «oico» va al final, detrás de la terminación, y no lleva números, porque el grupo COOH siempre está en un extremo: ácido, but, ano y oico dan ácido butanoico, y con «di», ácido butanodioico. Un grupo COOH unido a un anillo se escribe «carboxílico» (ácido ciclohexanocarboxílico), y el ácido benzoico se escribe con «ácido» y la ficha «benzoico» de la fila «Anillos». Si el grupo COOH no es el grupo principal, se escribe «carboxi»: (carboximetil). En «Nombres tradicionales» están el fórmico, el acético, el oxálico, el fenilacético y los ftálicos (ftálico, isoftálico y tereftálico), que también van detrás de «ácido»: ácido acético. Los ftálicos admiten ramas en el anillo (ácido 4-metilftálico) y el acético, un fenil con ramas en el carbono 2 (ácido 2-(3-metilfenil)acético); los demás solo valen sin más ramas.» [I-51d2]
- A-8 Ésteres (`#help-name-to-drawing-esters`) — «Ésteres. El nombre de un éster tiene dos partes: primero la parte ácida y, detrás, el grupo unido al oxígeno. En una cadena, la parte ácida acaba en «oato», que no lleva números, porque el grupo COO siempre está en un extremo; si el grupo COO va unido a un anillo, se escribe «carboxilato» (ciclohexanocarboxilato de etilo), y el benzoato es una ficha entera de la fila «Anillos». El grupo unido al oxígeno acaba en «ilo», que está en «Grupos», en lugar de «il»: et, ano, oato, met e ilo dan etanoato de metilo, y fenil e ilo, fenilo. La palabra «de» la pongo yo, y también la «y» entre dos grupos distintos (propanodioato de etilo y metilo); si los dos grupos son iguales, se escriben una vez con «di»: butanodioato de dimetilo. En «Nombres tradicionales» están el formiato, el acetato y el fenilacetato, que también van delante del grupo unido al oxígeno: acetato de etilo. El acetato admite un fenil con ramas en el carbono 2 (2-(4-metilfenil)acetato de etilo); los demás solo valen sin más ramas. Un éster que no es el grupo principal (junto a un ácido) se escribe como prefijo: «oxi» detrás de una rama con un C=O (acetil y oxi dan acetiloxi, como en ácido 2-(acetiloxi)etanoico), o «carbonil» detrás de «oxi» (met, il, oxi y carbonil dan metoxicarbonil); en una rama compuesta, los dos van dentro, antes de cerrarla: [(2-metilpropanoil)oxi].» [I-52a2a; the ester-prefix sentence I-52a2b]
- A-9 Nitrilos (`#help-name-to-drawing-nitriles`) — «Nitrilos. En un nitrilo, «nitrilo» va al final, detrás de la terminación de la cadena, y no lleva números, porque el carbono del grupo C≡N es siempre el carbono 1 de la cadena (y, con «di», también el último): but, ano y nitrilo dan butanonitrilo, y con «di», butanodinitrilo. Un grupo C≡N unido a un anillo se escribe «carbonitrilo» (ciclohexanocarbonitrilo), y el benzonitrilo es una ficha entera de la fila «Anillos». Si el grupo C≡N no es el grupo principal (junto a un ácido o un éster), se escribe «ciano», y su carbono no cuenta en la cadena: ácido 3-cianopropanoico. En «Nombres tradicionales» están el acetonitrilo, el fenilacetonitrilo y el ftalonitrilo. El ftalonitrilo admite ramas en el anillo (4-metilftalonitrilo) y el acetonitrilo, un fenil con ramas en el carbono 2 (2-(4-metilfenil)acetonitrilo); el fenilacetonitrilo solo vale sin más ramas.» [I-52b2]
- A-10 Aminas (`#help-name-to-drawing-amines`) — «Aminas. En una amina, «amina» va al final con su número, como «ol»: prop, ano, 2 y amina dan propan-2-amina (la «o» de «ano» la quito yo). Una rama unida al nitrógeno lleva delante «N», de la fila «Números», en lugar de un número: N-metiletanamina, N,N-dimetilmetanamina. Si la amina no es el grupo principal, el grupo NH₂ se escribe «amino» (2-aminoetan-1-ol), y las ramas de su nitrógeno van delante, en una rama compuesta: (dimetilamino). En «Nombres tradicionales» están la anilina, que admite ramas en el anillo y en el nitrógeno (4-cloroanilina, N-metilanilina), y la bencilamina, que solo vale sin más ramas. Una amina sencilla también se nombra con los grupos unidos al nitrógeno, por orden alfabético y sin números, y «amina» detrás, todo junto: met, il y amina dan metilamina; di, met, il y amina, dimetilamina. Este nombre solo lo doy para las aminas más sencillas, con grupos sin ramas unidos por su extremo, isopropil o tert-butil (etilmetilamina, tert-butilamina).» [I-52c3]
- A-11 Amidas (`#help-name-to-drawing-amides`) — «Amidas. En una amida, «amida» va al final, detrás de la terminación de la cadena, y no lleva números, porque el carbono del grupo amida es siempre el carbono 1 de la cadena (y, con «di», también el último): et, ano y amida dan etanamida (la «o» de «ano» la quito yo), y con «di», butanodiamida. Un grupo amida unido a un anillo se escribe «carboxamida» (ciclohexanocarboxamida), y la benzamida es una ficha entera de la fila «Anillos». Una rama unida al nitrógeno lleva delante «N», como en las aminas: N-metiletanamida, N,N-dimetilbenzamida. Si la amida no es el grupo principal (junto a un ácido o un éster) y su carbono es de la cadena, se escribe con «amino» y «oxo» en ese carbono (ácido 4-amino-4-oxobutanoico); si no lo es, el grupo amida entero se escribe «carbamoil» (ácido 4-carbamoilbenzoico), con las ramas de su nitrógeno delante, en una rama compuesta: (metilcarbamoil). Un grupo C=O unido al nitrógeno de «amino» también forma una amida como rama: acetil y amino dan (acetilamino). En «Nombres tradicionales» están la formamida, la acetamida y la ftalamida. La formamida y la acetamida admiten ramas en el nitrógeno (N,N-dimetilformamida, N-metilacetamida), y la acetamida, en su lugar, un fenil en el carbono 2 (2-fenilacetamida, 2-(4-metilfenil)acetamida); la ftalamida admite ramas en el anillo (4-metilftalamida).» [I-52d3]
- A-12 Qué queda fuera (`#help-name-to-drawing-scope`) — «Qué queda fuera. Solo dibujo lo que sé nombrar. No hay fichas para la estereoquímica (cis/trans, E/Z, R/S), las cargas, las sales ni los heterociclos (anillos con oxígeno o nitrógeno). Tampoco dibujo moléculas con varios anillos, como dos anillos unidos entre sí (ciclohexilbenceno) o tres anillos; solo un éster puede llevar un anillo a cada lado (benzoato de fenilo). Si tu nombre describe una de esas moléculas, o alguna otra que no sé nombrar, te digo por qué.» [I-53b]
- A-13 Before the verdict list — «Pulsa «Dibujar»: la molécula sustituye al dibujo del lienzo, ordenada y con la cadena principal resaltada (con «Deshacer» recuperas el dibujo anterior), y encima del nombre te digo qué tal está el tuyo:» [I-48b]
- A-14 Verdict list, item 1 — ««¡Correcto!»: tu nombre es el que doy yo, o una de las «Otras formas válidas» (entonces te digo cuál doy primero).» [I-48b]
- A-15 Verdict list, item 2 — ««Casi»: te faltan números; te digo cómo se escribe con ellos.» [I-48b]
- A-16 Verdict list, item 3 — ««Esta es la molécula que describe tu nombre, pero se llama…»: la molécula es esa, pero su nombre es otro. Casi siempre te digo también cuál es tu error principal; con «Ver paso a paso» verás cómo se llega al nombre.» [I-48b; «Casi siempre te digo también cuál es tu error principal» I-49b]
- A-17 Verdict list, item 4 — «Si el nombre tiene un error, si le faltan números y puede ser más de una molécula, o si la molécula queda fuera de lo que sé dibujar, no dibujo nada: te lo explico en la ventana y, si alguna ficha está mal, la marco en rojo.» [I-48b; «o si la molécula queda fuera de lo que sé dibujar» I-53b]
- A-18 The diagnosis on the drawing (`#help-diagnosis`) — «Cuando te digo tu error, en el dibujo marco con rayas tu cadena (la que usa tu nombre) junto a la cadena principal, que va en color, y el botón «Ver el paso» abre el paso a paso justo en el paso que explica ese error.» [I-49b]
- A-19 What «correcto» means (`#help-verdict-scope`) — «Cuando digo «correcto», hablo del nombre que doy yo: el de las normas de la IUPAC de 2013 tal como yo las aplico, que mezclan nombres preferidos, generales y tradicionales. No es el único nombre correcto: un libro puede usar otra forma válida, o la forma antigua de escribir los números, como «2-buteno» (hoy, «but-2-eno»).» [I-48b]

## 7. Points the developers flagged for the teacher

Not wordings to approve one by one, but choices about what a message says,
recorded while the phases were built. Decisions that are the project
owner's, not a teacher's (spellings the naming engine writes, which names to
read), are in `docs/open-questions.md`.

- C-1 **The seniority order, whole or short.** Beside a nitrile as the
  principal group, an amine or an amide, CARBONYL_SENIORITY shows the whole
  order «ácido > éster > amida > nitrilo > aldehído > cetona > alcohol >
  amina», while the explanation step it opens may show a shorter one
  («alcohol > amina», «ácido > amida > aldehído > cetona > alcohol»);
  otherwise it shows only the groups in play («aldehído > cetona >
  alcohol», «ácido > éster > aldehído > cetona > alcohol»: D-92), and
  beside an acid with a `ciano` elsewhere it leaves «nitrilo» out. Should
  the message show the whole order every time, only the groups in play, or
  the step's order? [I-52b3, I-52c4a, I-52d4 · `diagnose.js`
  `DIAGNOSIS_PHRASES`]
- C-2 **A `ciano` carbon that joins the chain.** `4-cianobutan-2-ona` →
  «…Aquí manda el nitrilo (–C≡N), que se nombra con la terminación
  «-nitrilo», al final del nombre; el C=O de la cetona va delante, con el
  prefijo «oxo». Se escribe «4-oxopentanonitrilo».»: the message does not
  say that the student's `ciano` carbon becomes carbon 1 of the chain (the
  name and the step show it); KETONE_NOT_ALDEHYDE beside a nitrile, an acid
  or an ester does not mention that group either. [I-52a3a, I-52b3]
- C-3 **The letter N among the numbers.** LOCANT_ORDER says «Los números de
  un mismo grupo se escriben de menor a mayor, y la letra «N» va antes que
  los números…»; TEMPLATE_LOCANTS on an `N` alone before `anilina`,
  `benzamida` or `acetamida` still says «…no lleva números ni letras
  propios». Is that clear enough? [I-52c1, I-52c4a, I-52d3]
- C-4 **A halogen or an oxygen on an amine's nitrogen** (`N-cloroetanamina`,
  `N-metoxietanamina`) gets the naming engine's general refusal «Esta
  molécula tiene átomos que no son carbono ni hidrógeno. Aún no sé nombrar
  este tipo de compuestos: …», which lists every family the app names. A
  message about the nitrogen itself would be clearer. [I-52c1]
- C-5 **«Los prefijos di-, tri-… no cuentan para el orden.»** is reused in
  an amine's class name (`metilamina`); there «multiplicadores» may read
  better than «prefijos». [I-52c4b]
- C-6 **Two amides on two carbon pieces** (`N-(2-amino-2-oxoetil)etanamida`
  → «2-(acetilamino)etanamida») get MORE_SUBSTITUENTS «Hay otra cadena igual
  de larga con más sustituyentes (1; la tuya tiene 0). Entre cadenas igual
  de largas, gana la que tiene más sustituyentes.» — true, but it does not
  say that the chain cannot pass through the amide's nitrogen. [I-52d4]
- C-7 **«Ver el paso» on a benzene.** For a benzene that ties with a chain
  (CARBONYL_PARENT) and for AMINE_SIDE on a benzene, the button opens
  «Reconoce el benceno», which does not mention the tie or that a ring wins
  over a chain (the message itself says it). [I-52c4a, I-52d4]
- C-8 **`acetamida` with a group on the nitrogen and a phenyl**
  (`N-metil-2-fenilacetamida`) → «El nombre tradicional «acetamida» solo
  admite grupos en el nitrógeno, con «N» (N-metilacetamida), o solo un fenil
  en el carbono 2 (2-fenilacetamida): con otros grupos, la molécula se
  nombra con su nombre sistemático: «2-fenil-N-metiletanamida».» — each
  group is admitted alone, not both; is the «o solo» clear? [I-52d3]
- C-9 **«el nitrógeno del grupo carbamoil»** (VALENCE) names the group by
  its prefix, as «del grupo amino»; Spanish usage also has «carbamoílo».
  [I-52d2]
- C-10 **`ciclohexilmetanamida`** (no number) reads as «Casi: faltan los
  números. Se escribe «N-ciclohexilmetanamida».» (the ring on the
  nitrogen), while `1-ciclohexilmetanamida` is the other molecule
  («…pero se llama «ciclohexanocarboxamida».»). Is the first reading the
  one a student means? [I-52d1]
- C-11 **KETONE_NOT_ALDEHYDE beside `carbamoil`** calls it «la rama
  «carbamoil»» (its carbon is a carbon group on the –CHO's carbon), as for
  an acyl prefix. [I-52d4]
- C-12 **An O-bound group's own prefixes out of order beside another
  group** (`butanodioato de 2-metil-3-cloropropilo y metilo`) get
  ALPHABETICAL_ORDER «…«metilo» va antes que «2-metil-3-cloropropilo» (la
  palabra más corta va primero). Se escribe «metilo y
  2-metil-3-cloropropilo»…», which is not the app's name («butanodioato de
  3-cloro-2-metilpropilo y metilo»); and ESTER_ALKYL_NAME is the generic
  message for any mistake inside an O-bound group's own prefixes
  (`4-metil-2-clorofenilo`). Left for a later ester review. [I-52a3b,
  I-52d2]
- C-13 **`ciclohex-1-eno`** → «…pero se llama «ciclohexeno».» with
  NEEDLESS_LOCANTS «En «ciclohexeno» no se escriben números: solo hay una
  manera de colocar el enlace doble.» Many books write the number; the app
  never does. [I-50a]
- C-14 **Hint examples the app does not name.** The hints of `fenol`,
  `benzaldehído`, `benzoico`, `benzonitrilo` and of the retained names in a
  branch cite `(4-hidroxifenil)`, `(4-formilfenil)`, `(4-carboxifenil)`,
  `(4-cianofenil)`; a molecule with one of them is refused (a benzene with
  groups on the ring and on a side chain), so a student who follows the
  hint gets «fuera de lo que sé dibujar». Whether to change them is
  `docs/open-questions.md` Q14; the teacher may say how the hint should
  read. [I-51a2, I-51c1, I-51d1, I-52b1; noted in I-52d2]
- C-15 **Labels from memory.** The labels in brackets after a valid form
  («nombre tradicional, que la IUPAC (2013) conserva como preferido» for
  `formamida` and `acetamida`, «…acepta», «…conserva»…) are the naming
  engine's, written from memory of IUPAC 2013 (`src/naming/lexicon.es.js`).
  [I-52d3; forward engine]

## 8. I-54: orto, meta y para with two different groups (O-)

A user decision after v4 (`autoclaude/processed/240-omp-two-different-groups.md`):
a benzene with two different groups and nothing else (`1-cloro-3-etilbenceno`)
also gets the old letter form (`m-cloroetilbenceno`) under «Otras formas
válidas», with the existing label «forma antigua con orto/meta/para; hoy se
recomienda el número (1,2 / 1,3 / 1,4)». Phase I-54a (drawing → name) added
O-1 and O-2; I-54b («¿Cómo se dibuja?», name → drawing: the student writes
one letter before the first of the two groups, `m cloro et il benceno`, and
the app draws the molecule with the «forma válida» verdict) added O-3…O-7.
The letter forms themselves (`p-metil(metoxi)benceno`,
`p-clorometilbenceno`…) are the naming engine's (design.md §14.4).

- O-1 «Numera el anillo», two different groups on `benceno` (the sentence
  that ends the step's position note) — ««cloro» y «etil» están en posición
  meta (1,3). Antes se decía orto (1,2), meta (1,3) o para (1,4), y este
  compuesto se llamaba «m-cloroetilbenceno». Hoy se recomienda escribir los
  números, porque con la letra los dos grupos se escriben seguidos, sin
  números, y se pueden confundir con un solo grupo: «m-cloroetilbenceno» se
  puede leer como «(cloroetil)benceno».» When a group of the letter form is
  between parentheses (`p-metil(metoxi)benceno`) or the second group is no
  carbon branch (`m-bromoclorobenceno`, `o-metilyodobenceno`) the end reads
  «…sin números, y a veces se pueden confundir con un solo grupo.», without
  the look-alike. The first sentence was already shown since v3; «Monta el
  nombre» lists the letter form under «También es correcto:» with its
  existing label, as for every alternative. [I-54a · `explain.js`
  `benzenePositionSentence()`, `twoPrefixLetterSentence()`]
- O-2 Ayuda «Orto, meta y para» (`#help-omp`), the new example after «Por
  ejemplo, el 1,4-diclorobenceno es el p-diclorobenceno.» — «Si los dos
  grupos son distintos, se escriben seguidos, sin números: el
  1-cloro-3-etilbenceno es el m-cloroetilbenceno.» [I-54a · `index.html`]
- O-3 **POSITIONAL** (the letter before the second of two different groups
  on «benceno») — «Con dos grupos distintos en el benceno, la letra va al
  principio del nombre, delante del primer grupo, que va en el carbono 1: la
  letra dice dónde está el segundo (m-cloroetilbenceno).»
  («cloro-m-etilbenceno»; the letter is marked) [I-54b · parse.js
  `POSITIONAL_MESSAGES.pairPlace`]
- O-4 **POSITIONAL** (a second letter on two different groups) — «Con dos
  grupos distintos en el benceno se escribe una sola letra, al principio del
  nombre: el primer grupo va en el carbono 1 y la letra dice dónde está el
  segundo (m-cloroetilbenceno).» («m-cloro-m-etilbenceno»; the second letter
  is marked) [I-54b · parse.js `POSITIONAL_MESSAGES.pairTwice`]
- O-5 **POSITIONAL** (a letter and numbers on two different groups) —
  «Escribe los números de los dos grupos (1-cloro-3-etilbenceno) o una sola
  letra al principio del nombre (m-cloroetilbenceno), no las dos cosas.»
  («m-cloro-3-etilbenceno», «1-cloro-m-etilbenceno», «1,m-cloroetilbenceno»;
  the letter is marked, with the numbers of its own group) [I-54b · parse.js
  `POSITIONAL_MESSAGES.pairMixed`]
- O-6 **ALPHABETICAL_ORDER** (the letter form with its two groups out of
  alphabetical order; step: order) — «Los sustituyentes se escriben por
  orden alfabético, también con la letra «p» delante: «cloro» va antes que
  «metil» (c antes que m). Se escribe «p-clorometilbenceno», no
  «p-metilclorobenceno».» (`p-metilclorobenceno`; also «o-yodometilbenceno»
  → «o-metilyodobenceno», «p-metil(etoxi)benceno» → «p-(etoxi)metilbenceno»)
  The verdict is «otro nombre»: the molecule is drawn and named
  «1-cloro-4-metilbenceno». [I-54b · diagnose.js `DIAGNOSIS_TEXTS`,
  `letterPairOrder()`]
- O-7 Ayuda «Del nombre al dibujo», rings line (`#help-name-to-drawing-rings`,
  the whole paragraph is A-3), the sentence on the letters — «Esas letras
  sirven también para dos grupos en el benceno, iguales (p-dimetilbenceno) o
  distintos: entonces la letra va al principio del nombre y los dos grupos,
  seguidos y por orden alfabético (m-cloroetilbenceno, que con números es el
  1-cloro-3-etilbenceno). Y sirven para un segundo grupo en el fenol, la
  anilina, el benzaldehído, el ácido benzoico, el benzoato, el benzonitrilo y
  la benzamida (p-metilfenol, p-cloroanilina), pero no con tres grupos.»
  [I-54b · `index.html`]
