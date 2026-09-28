/**
 * @file Full molecule-graph validation shared by every entry point (design.md §3.2):
 * editor transactions, JSON restoration and SMILES input.
 *
 * Two levels:
 * - validateStructure(): integrity checks that must always hold (ids unique
 *   and well-formed, supported elements only, bond endpoints exist, no
 *   self-bonds, no duplicate bonds, orders 1–3, neutral valence per element:
 *   C 4, N 3, O 2, halogens 1);
 * - validateForNaming(): the structural checks, then non-empty, connected,
 *   the ring scope (rings are classified by rings.js: a single carbocycle of
 *   at most 30 ring carbons is nameable, with or without side chains and ring
 *   multiple bonds — a benzene ring included, but only with at most one
 *   substituent (two or more: CYCLE, `ringReason` 'polysubstitutedBenzene'); a larger
 *   one gets TOO_BIG, any other ring system RING_SYSTEM with its kind), size caps (≤ 60 carbons, ≤ 80 heavy atoms),
 *   only elements the engine can name yet (carbon, halogens bonded to a
 *   carbon — design.md §13.4 I-30 —, OH groups on a carbon, I-31, the
 *   C=O of aldehydes and ketones, I-32, carboxyl groups –C(=O)OH, I-33,
 *   ether oxygens C–O–C, I-34, ester groups –C(=O)–O–R, I-35, amine
 *   nitrogens bonded to one to three carbons, I-36, amide groups
 *   –C(=O)–N, I-37, and nitrile groups –C≡N, I-38; on a
 *   molecule with a ring, no ester, no amide, no nitrile (acids and aldehydes, on the ring or on a side chain, are
 *   named since I-40b); at most two
 *   aldehydes per carbon piece when the aldehyde is principal (I-39b), at most two acids per carbon piece (I-40b; ring
 *   atoms left out of the pieces); without an acid at most two
 *   esters, both on one carbon piece and, with different O-bound groups, on an acid part that is the same seen from
 *   either end (I-39c; beside an acid any ester is a prefix); without an acid or ester at most two amides per carbon
 *   piece and, on a piece with two, no group on their N (beside an acid or ester, or on other pieces, amides are
 *   prefixes, I-39d);
 *   never a nitrile with an acid, ester or amide, at most two nitriles, both
 *   on one carbon piece), and
 *   longest carbon chain ≤ 30 (for a ring: every side chain ≤ 30; with
 *   ethers, the longest chain on either side of each O).
 *
 * Two kinds of failure are kept apart (design.md §13.1): an invalid structure
 * (INVALID, VALENCE — the drawing itself is wrong) and a valid molecule the
 * engine cannot name (CYCLE, RING_SYSTEM, HETEROATOM — see isNotNameableYet()).
 * Halogens bonded to a carbon are named since I-30, OH groups on a carbon
 * (alcohols, phenol) since I-31, aldehydes and ketones since I-32,
 * carboxylic acids since I-33, ethers since I-34, esters since I-35,
 * amines since I-36, amides since I-37, nitriles since I-38; any
 * other heteroatom (an N of an imide, imine or cyanamide, NH₃, an O of an
 * anhydride or carbonate, a peroxide, a halogen on a heteroatom or on a C=O carbon…) still
 * gets HETEROATOM, and so do an ester, amide or nitrile with a ring, and a
 * carbon piece with more than two principal aldehydes or more than two
 * acids (OH, ketone and amine groups on a ring's side chain are named since
 * I-40a, acids and aldehydes with a ring since I-40b).
 *
 * Errors are `{code, message}` objects with the Spanish messages of the §3.2
 * table; some carry extra data (`detail` in English for developers, `atoms`
 * for highlighting). This module never reads coordinates or the DOM.
 */

import {
  isConnected, hasCycle, longestChainLength, adjacency, carbonSkeleton, connectedComponents, rootedTreeKey, cycleCore,
} from './graph.js';
import { classifyRings } from './rings.js';
import { isSupportedElement, valenceOf, isHalogen, ELEMENT_NAMES_ES } from './elements.js';

/** Maximum number of carbons in a molecule the app will name (design.md §1.1). */
export const MAX_CARBONS = 60;

/** Maximum number of heavy (non-hydrogen) atoms in a molecule the app will name (design.md §13.1). */
export const MAX_HEAVY_ATOMS = 80;

/** Maximum parent-chain length the lexicon covers (design.md §1.1). */
export const MAX_CHAIN = 30;

/** Codes of valid molecules the engine cannot name yet (as opposed to invalid structures). */
export const NOT_NAMEABLE_YET = Object.freeze(['CYCLE', 'RING_SYSTEM', 'HETEROATOM']);

/** Spanish user-facing messages by error code (design.md §3.2). */
export const MESSAGES = Object.freeze({
  EMPTY: 'Dibuja primero una molécula.',
  DISCONNECTED: 'Hay piezas sueltas: todas las partes deben estar unidas.',
  CYCLE: 'Este benceno tiene varios sustituyentes. Solo sé nombrar el benceno con un sustituyente como máximo '
    + '(como el metilbenceno): los bencenos con dos o más sustituyentes quedan fuera de lo que sé nombrar.',
  RING_SYSTEM: 'Esta molécula tiene anillos que quedan fuera de lo que sé nombrar.',
  VALENCE: 'Este carbono tendría más de 4 enlaces.',
  TOO_BIG: 'La molécula es demasiado grande (máximo 60 carbonos, cadena de 30).',
  HETEROATOM: 'Esta molécula tiene átomos que no son carbono ni hidrógeno. '
    + 'Aún no sé nombrar este tipo de compuestos: de momento solo nombro hidrocarburos, '
    + 'derivados halogenados (con flúor, cloro, bromo o yodo unidos a un carbono), '
    + 'alcoholes (con grupos –OH unidos a un carbono), '
    + 'aldehídos y cetonas (con un oxígeno unido a un carbono por un enlace doble, C=O), '
    + 'ácidos carboxílicos (con el grupo –COOH), '
    + 'éteres (con un oxígeno unido a dos carbonos, C–O–C), '
    + 'ésteres (con el grupo –COO– entre dos cadenas de carbonos), '
    + 'aminas (con un nitrógeno unido a uno, dos o tres carbonos por enlaces sencillos, como el –NH₂), '
    + 'amidas (con el grupo –CONH₂: un C=O unido a un nitrógeno) '
    + 'y nitrilos (con el grupo –C≡N: un carbono unido a un nitrógeno por un enlace triple).',
  INVALID: 'Los datos de la molécula están dañados. Empieza un dibujo nuevo.',
});

/**
 * RING_SYSTEM messages by ring-system kind (rings.js classifyRings()):
 * valid molecules outside the scope of the app (design.md §13.1).
 */
export const RING_SYSTEM_MESSAGES = Object.freeze({
  heterocycle: 'Este anillo tiene átomos que no son carbono: es un heterociclo. '
    + 'Los heterociclos quedan fuera de lo que sé nombrar.',
  fused: 'Has dibujado anillos fusionados (dos anillos que comparten un enlace). '
    + 'Este tipo de moléculas queda fuera de lo que sé nombrar.',
  bridged: 'Has dibujado anillos con puente (dos anillos que comparten más de dos átomos). '
    + 'Este tipo de moléculas queda fuera de lo que sé nombrar.',
  spiro: 'Has dibujado un compuesto espiro (dos anillos que comparten un solo átomo). '
    + 'Este tipo de moléculas queda fuera de lo que sé nombrar.',
  several: 'Esta molécula tiene varios anillos. De momento solo podré nombrar moléculas con un único anillo.',
});

/**
 * HETEROATOM message for an open chain with more than two aldehyde groups
 * on one carbon piece, the aldehyde being the principal group (design.md
 * §13.4 I-32, narrowed by I-39b): a –CHO carbon is always a chain end, and
 * a chain has only two ends, so the parent cannot carry them all; IUPAC
 * 2013 expresses every principal group as a suffix when it can, so the
 * groups take the suffix `-carbaldehído` on a smaller parent
 * (`propano-1,2,3-tricarbaldehído`, not `4-formilheptanodial`; decided
 * from memory, like citric acid's `propano-1,2,3-tricarboxílico`), not
 * supported yet. Below a more senior group every –CHO is `oxo-` or
 * `formil-` and is named.
 */
export const MANY_ALDEHYDES_MESSAGE = 'Esta molécula tiene más de dos grupos –CHO (aldehído). '
  + 'Un –CHO siempre está en un extremo de la cadena y la cadena principal solo tiene dos extremos, '
  + 'así que no puede llevarlos todos. La IUPAC no nombra el tercero con el prefijo «formil-»: todos se nombran '
  + 'con «-carbaldehído» (como el propano-1,2,3-tricarbaldehído), y eso aún no sé hacerlo.';

/**
 * HETEROATOM message for more than two carboxyl groups on one carbon piece
 * (design.md §13.4 I-33, narrowed by I-40b; a piece is joined through C–C
 * bonds, ring atoms left out): a –COOH carbon is always a chain end and
 * the chain has only two ends, so the parent cannot carry them all; IUPAC
 * 2013 expresses every principal group as a suffix when it can, so the
 * groups take `-carboxílico` on a smaller parent (`ácido
 * propano-1,2,3-tricarboxílico`, citric acid; from memory), not `carboxi-`;
 * not supported yet. On other pieces (beyond an ether O or an amine N, or
 * on the ring) a –COOH is named with `carboxi-` or `-carboxílico`.
 */
export const MANY_ACIDS_MESSAGE = 'Esta molécula tiene más de dos grupos –COOH (ácido) en la misma cadena de carbonos. '
  + 'Un –COOH siempre está en un extremo de la cadena y la cadena principal solo tiene dos extremos, '
  + 'así que no puede llevarlos todos. La IUPAC no nombra el tercero con el prefijo «carboxi-»: todos se nombran '
  + 'con «-carboxílico» (como el ácido propano-1,2,3-tricarboxílico), y eso aún no sé hacerlo.';

/**
 * HETEROATOM message of the naming engine (naming/index.js) for a –COOH
 * cited neither as a suffix group (`-oico`, `-carboxílico`) nor as the
 * prefix `carboxi-` (design.md §13.4 I-33, I-40b). A safety net: validation
 * and the chain machinery make it unreachable.
 */
export const CARBOXY_SUBSTITUENT_MESSAGE = 'Esta molécula tiene un grupo –COOH que no sé situar en el nombre: '
  + 'ni como grupo principal (con «-oico», como en el ácido etanoico, o con «-carboxílico», como en el ácido '
  + 'ciclohexanocarboxílico) ni con el prefijo «carboxi-» (como en el ácido 3-(carboximetoxi)propanoico).';

/**
 * HETEROATOM message of the naming engine (naming/index.js) for an acyl
 * branch that has no acyl prefix in the app (design.md §13.4 I-32, I-39b):
 * a C=O carbon bonded to the chain that carries it and to a –C≡N, i.e.
 * –CO–C≡N. Its only chain carbon is the C=O carbon (the nitrile carbon
 * belongs to `ciano-`), and a `formil` cannot carry prefixes; IUPAC 2013
 * names the group `carbonocianidoil` (from memory), not supported. Every
 * other acyl branch is named since I-39b (`formil`, `acetil`,
 * `propanoil`…).
 */
export const ACYL_SUBSTITUENT_MESSAGE = 'Esta molécula tiene una rama –CO–C≡N: un grupo C=O unido a la cadena y, a la vez, '
  + 'a un grupo –C≡N. Esa rama no se nombra con «formil-» ni con «ciano-»: la IUPAC le da un nombre especial '
  + '(«carbonocianidoil-»), y eso aún no sé hacerlo. Sí sé nombrar las otras ramas con C=O (como «formil-», '
  + '«acetil-» o «propanoil-»).';

/**
 * HETEROATOM message of the naming engine (naming/index.js) for an ether
 * whose two sides are identical and each carries the principal group
 * (design.md §13.4 I-34), such as HO–CH₂–CH₂–O–CH₂–CH₂–OH: IUPAC 2013
 * names it with multiplicative nomenclature (`2,2′-oxidi(etan-1-ol)`,
 * P-15.3), not supported. The substitutive name
 * `2-(2-hidroxietoxi)etan-1-ol` would not be the preferred one.
 */
export const SYMMETRIC_ETHER_MESSAGE = 'Esta molécula tiene dos mitades iguales unidas por un oxígeno (–O–), '
  + 'y cada mitad lleva el grupo principal. La IUPAC la nombra con el prefijo «oxidi-», que junta las dos mitades '
  + '(como el 2,2′-oxidietanol), y eso aún no sé hacerlo.';

/**
 * HETEROATOM message for a molecule with a ring and an ester group –COO–
 * (design.md §13.4 I-35): the ring would be on the acid side (a
 * `-carboxilato`, `ciclohexanocarboxilato de metilo`), on the O side (a
 * ring group such as `fenilo`, `etanoato de fenilo`) or on a side chain
 * of either; the ring esters wait for I-40d.
 */
export const RING_ESTER_MESSAGE = 'Esta molécula tiene un anillo y un grupo –COO– (un éster). '
  + 'De momento solo sé nombrar los ésteres de cadena abierta (como el etanoato de metilo): '
  + 'los ésteres con anillo, como el etanoato de fenilo o el ciclohexanocarboxilato de metilo, aún no sé nombrarlos.';

/**
 * HETEROATOM message for an open chain with more than two ester groups
 * (design.md §13.4 I-35, narrowed by I-39c): an ester carbon is always a
 * chain end, so a third –COO– would be a branch, and IUPAC 2013 cites every
 * principal group as a suffix when it can (`propano-1,2,3-tricarboxilato
 * de trimetilo`), which the app does not support.
 */
export const MANY_ESTERS_MESSAGE = 'Esta molécula tiene más de dos grupos –COO– (éster). '
  + 'El carbono de un –COO– siempre está en un extremo de la cadena y la cadena principal solo tiene dos extremos, '
  + 'así que alguno quedaría en una rama. Estos compuestos se nombran con «-carboxilato» '
  + '(como el propano-1,2,3-tricarboxilato de trimetilo), y eso aún no sé hacerlo. '
  + 'Sí sé nombrar los ésteres con uno o dos grupos –COO– (como el etanoato de metilo o el butanodioato de dimetilo).';

/**
 * HETEROATOM message for a molecule with two ester groups and no acid
 * whose C=O carbons lie on different carbon pieces, with an O or an N
 * between them (design.md §13.4 I-39c, reason `esterPrefix`): a diol diester
 * (`diacetato de etano-1,2-diilo`: IUPAC 2013 multiplies the acid part) or
 * an ester inside the O-bound group of another (`3-(acetiloxi)propanoato de
 * metilo`): one ester would be a prefix of the other, or the name needs a
 * multiplied acid part, and the app does not choose between them.
 */
export const ESTER_PREFIX_MESSAGE = 'Esta molécula tiene dos grupos –COO– (éster) que no están en la misma '
  + 'cadena de carbonos: entre ellos hay un oxígeno o un nitrógeno que corta la cadena (como en el diacetato de etano-1,2-diilo, o cuando un éster '
  + 'está dentro del grupo unido al oxígeno del otro). Entonces uno de los dos se nombraría con un prefijo '
  + '(«aciloxi-», como «acetiloxi-», o «alcoxicarbonil-», como «metoxicarbonil-») o con un nombre especial, '
  + 'y eso aún no sé hacerlo. Sí sé nombrar los diésteres con los dos grupos –COO– en la misma cadena '
  + '(como el butanodioato de dimetilo) y los ésteres junto a un ácido (como el ácido 4-metoxi-4-oxobutanoico).';

/**
 * HETEROATOM message for a diester (design.md §13.4 I-39c, reason
 * `mixedDiester`) whose two O-bound groups differ and whose acid part is
 * not the same seen from either end: the name would need locants for the
 * groups (`2-metilbutanodioato de 1-etilo y 4-metilo`), whose IUPAC 2013
 * rules the app does not implement (decided: refused, not guessed).
 */
export const MIXED_DIESTER_MESSAGE = 'Esta molécula tiene dos grupos –COO– (éster) con grupos distintos unidos '
  + 'al oxígeno, y los dos extremos de la cadena no son iguales. Habría que decir con localizadores en qué extremo '
  + 'está cada grupo (como en el 2-metilbutanodioato de 1-etilo y 4-metilo), y eso aún no sé hacerlo. Sí sé nombrar '
  + 'los diésteres con los dos grupos iguales (como el 2-metilbutanodioato de dimetilo) o con una cadena que es igual '
  + 'vista desde los dos extremos (como el propanodioato de etilo y metilo).';

/**
 * HETEROATOM message of the naming engine (naming/index.js) for a
 * molecule whose parent is a chain and whose ring carries two or more
 * identical branches that each hold the principal group (design.md §13.4
 * I-40a), such as HOCH₂–C₆H₁₀–CH₂OH: IUPAC 2013 names it with
 * multiplicative nomenclature (`ciclohexano-1,4-diildimetanol`, P-15.3,
 * from memory), which the app does not support, as for ethers and amines
 * (SYMMETRIC_ETHER_MESSAGE, SYMMETRIC_AMINE_MESSAGE).
 */
export const SYMMETRIC_RING_MESSAGE = 'Esta molécula tiene un anillo con dos ramas iguales, y cada rama lleva el grupo '
  + 'principal. La IUPAC la nombra con un nombre que junta las partes iguales a través del anillo (como el '
  + 'ciclohexano-1,4-diildimetanol), y eso aún no sé hacerlo.';

/**
 * HETEROATOM message of the naming engine (naming/index.js) for a parent
 * with two or more amine groups where some nitrogen carries other groups
 * (design.md §13.4 I-36): IUPAC 2013 then tells the nitrogens apart with
 * locants such as N¹ and N² (`N¹-metiletano-1,2-diamina`), not supported.
 */
export const SUBSTITUTED_POLYAMINE_MESSAGE = 'Esta molécula tiene varios grupos amino en la cadena principal '
  + 'y alguno de sus nitrógenos lleva otros grupos unidos. Para decir en qué nitrógeno está cada grupo harían falta '
  + 'localizadores como N¹ y N², y eso aún no sé hacerlo. Sí sé nombrar las diaminas sin grupos en el nitrógeno '
  + '(como la etano-1,2-diamina) y las aminas con un solo nitrógeno (como la N-metiletanamina).';

/**
 * HETEROATOM message of the naming engine (naming/index.js) for an amine
 * nitrogen that is not the principal group and joins two or three
 * identical parts that each carry the principal group (design.md §13.4
 * I-36), such as HO–CH₂CH₂–NH–CH₂CH₂–OH: IUPAC 2013 names it with
 * multiplicative nomenclature (`2,2′-azanodiildi(etan-1-ol)`, P-15.3), not
 * supported (as for ethers, SYMMETRIC_ETHER_MESSAGE).
 */
export const SYMMETRIC_AMINE_MESSAGE = 'Esta molécula tiene partes iguales unidas por un nitrógeno, '
  + 'y cada una de esas partes lleva el grupo principal. La IUPAC la nombra con un nombre que junta las partes iguales '
  + '(como el 2,2′-azanodiildietanol), y eso aún no sé hacerlo.';

/**
 * HETEROATOM message for a molecule with a ring and an amide group
 * –C(=O)–N (design.md §13.4 I-37): the ring would carry the group as
 * `-carboxamida` (`ciclohexanocarboxamida`, `benzamida`), be a group on
 * its N (`N-feniletanamida`) or on a side chain; the ring functions wait
 * for I-40c.
 */
export const RING_AMIDE_MESSAGE = 'Esta molécula tiene un anillo y un grupo amida (–CONH₂, –CONH– o –CON–). '
  + 'De momento solo sé nombrar las amidas de cadena abierta (como la etanamida o la N-metiletanamida): '
  + 'las amidas con anillo, como la benzamida, la ciclohexanocarboxamida o la N-feniletanamida, aún no sé nombrarlas.';

/**
 * HETEROATOM message for an amide the naming engine could cite neither as
 * the suffix `-amida` nor as a prefix (design.md §13.4 I-37, I-39d: `amino`
 * + `oxo` on its carbon, `carbamoil-` bonded through its carbon,
 * `acilamino-` bonded through its N). A safety net (naming/index.js,
 * reason `amidePrefix`): validation and the chain machinery make it
 * unreachable.
 */
export const AMIDE_PREFIX_MESSAGE = 'Esta molécula tiene un grupo amida (–CONH₂, –CONH– o –CON–) que no sé situar en el nombre: '
  + 'ni como grupo principal (con la terminación «-amida», como en la etanamida) ni con prefijos («amino-» y «oxo-», '
  + '«carbamoil-» o «acilamino-», como en el ácido 4-amino-4-oxobutanoico), así que aún no sé nombrarla.';

/**
 * HETEROATOM message for more than two amide groups on one carbon piece
 * when the amide is the principal group (design.md §13.4 I-37, I-39d): the
 * C of a –CONH₂ is always a chain end and the chain has only two ends;
 * IUPAC 2013 then names every group with `-carboxamida` on a smaller
 * parent (`propano-1,2,3-tricarboxamida`), not supported yet. Beside an
 * acid or an ester, or on other carbon pieces, any number of amides is
 * named with prefixes.
 */
export const MANY_AMIDES_MESSAGE = 'Esta molécula tiene más de dos grupos amida en la misma cadena de carbonos. '
  + 'El carbono de una amida siempre está en un extremo de la cadena y la cadena principal solo tiene dos extremos. '
  + 'Estos compuestos se nombran con «-carboxamida» (como la propano-1,2,3-tricarboxamida), y eso aún no sé hacerlo.';

/**
 * HETEROATOM message for a diamide where some amide nitrogen carries other
 * groups (design.md §13.4 I-37): IUPAC 2013 then tells the two nitrogens
 * apart with locants such as N¹ and N⁴ (`N¹-metilbutanodiamida`), not
 * supported (as for amines, SUBSTITUTED_POLYAMINE_MESSAGE).
 */
export const SUBSTITUTED_POLYAMIDE_MESSAGE = 'Esta molécula tiene dos grupos amida y alguno de sus nitrógenos '
  + 'lleva otros grupos unidos. Para decir en qué nitrógeno está cada grupo harían falta localizadores como N¹ y N⁴, '
  + 'y eso aún no sé hacerlo. Sí sé nombrar las diamidas sin grupos en el nitrógeno (como la butanodiamida) '
  + 'y las amidas con un solo nitrógeno (como la N-metiletanamida).';

/**
 * HETEROATOM message for an imide (design.md §13.4 I-37): a nitrogen
 * bonded to two C=O carbons (–CO–NH–CO–), which is not an amide with a
 * group on its N but a family of its own, out of scope.
 */
export const IMIDE_MESSAGE = 'Esta molécula tiene un nitrógeno unido a dos grupos C=O (–CO–NH–CO–). '
  + 'Eso es una imida, no una amida con un grupo en el nitrógeno, y las imidas quedan fuera de lo que sé nombrar.';

/**
 * HETEROATOM message for a molecule with a ring and a nitrile group –C≡N
 * (design.md §13.4 I-38): a –C≡N carbon can never be a ring atom, so the
 * group is either bonded to the ring, named with the suffix
 * `-carbonitrilo` (`ciclohexanocarbonitrilo`, `benzonitrilo`), or on a
 * side chain, which then carries the principal group; both wait for I-40c.
 */
export const RING_NITRILE_MESSAGE = 'Esta molécula tiene un anillo y un grupo –C≡N (un nitrilo). '
  + 'Cuando el –C≡N va unido a un anillo, el nombre acaba en «-carbonitrilo» (como el ciclohexanocarbonitrilo '
  + 'o el benzonitrilo), y eso aún no sé nombrarlo. De momento solo sé nombrar los nitrilos de cadena abierta '
  + '(como el etanonitrilo).';

/**
 * HETEROATOM message for more than two nitrile groups on one carbon piece
 * when the nitrile is the principal group (design.md §13.4 I-38, I-39a):
 * the C of a –C≡N is always a chain end and the chain has only two ends;
 * IUPAC 2013 then names every group with `-carbonitrilo` on a smaller
 * parent (`propano-1,2,3-tricarbonitrilo`), not supported yet. Below an
 * acid, ester or amide, or on other carbon pieces, any number of nitriles
 * is named with `ciano-`.
 */
export const MANY_NITRILES_MESSAGE = 'Esta molécula tiene más de dos grupos –C≡N (nitrilo) en la misma cadena de carbonos. '
  + 'El carbono de un –C≡N siempre está en un extremo de la cadena y la cadena principal solo tiene dos extremos. '
  + 'Estos compuestos se nombran con «-carbonitrilo» (como el propano-1,2,3-tricarbonitrilo), y eso aún no sé hacerlo.';

/**
 * HETEROATOM message for a nitrile the naming engine could cite neither as
 * the suffix `-nitrilo` nor as the prefix `ciano-` (design.md §13.4 I-38,
 * I-39a). A safety net (naming/index.js): validation and the chain
 * machinery make it unreachable.
 */
export const CYANO_PREFIX_MESSAGE = 'Esta molécula tiene un grupo –C≡N (nitrilo) que no sé situar en el nombre: '
  + 'ni como grupo principal (con la terminación «-nitrilo», como en el etanonitrilo) '
  + 'ni con el prefijo «ciano-» (como en el ácido 3-cianopropanoico).';

/**
 * HETEROATOM message for a nitrile bonded directly to the carbon of an
 * acid, an ester or an amide (design.md §13.4 I-39a, `carbonocyanidic`):
 * NC–COOH is not `ácido cianometanoico` for IUPAC 2013 but a derivative of
 * carbonic acid, `ácido carbonocianídico` (P-65.2.1, from memory), a
 * family out of scope.
 */
export const CARBONOCYANIDIC_MESSAGE = 'Esta molécula tiene un grupo –C≡N (nitrilo) unido directamente al carbono '
  + 'de un grupo –COOH, –COO– o amida. La IUPAC no la nombra con el prefijo «ciano-»: la considera un derivado '
  + 'del ácido carbónico (como el ácido carbonocianídico, NC–COOH), y eso aún no sé nombrarlo.';

/** TOO_BIG message for a ring larger than the parent-size cap (MAX_CHAIN). */
export const RING_TOO_BIG_MESSAGE = 'El anillo es demasiado grande (máximo 30 carbonos en el anillo).';

/** TOO_BIG message when the heavy-atom cap (not the carbon cap) is exceeded. */
export const TOO_MANY_ATOMS_MESSAGE = 'La molécula es demasiado grande (máximo 80 átomos sin contar los hidrógenos).';

/**
 * Spanish valence message for an atom of a given element, e.g. "Este oxígeno
 * tendría más de 2 enlaces." (for carbon, exactly MESSAGES.VALENCE).
 *
 * @param {string} element - A supported element symbol.
 * @returns {string} The message.
 */
export function valenceMessage(element) {
  if (!isSupportedElement(element) || element === 'C') {
    return MESSAGES.VALENCE;
  }
  const max = valenceOf(element);
  return `Este ${ELEMENT_NAMES_ES[element]} tendría más de ${max} ${max === 1 ? 'enlace' : 'enlaces'}.`;
}

/**
 * Tells whether an error means "valid molecule, but it cannot be named yet"
 * (a ring, an atom other than carbon…) rather than "invalid structure".
 *
 * @param {{code: string}|null} error - A validation error, or null.
 * @returns {boolean} True for the not-nameable-yet codes.
 */
export function isNotNameableYet(error) {
  return Boolean(error) && NOT_NAMEABLE_YET.includes(error.code);
}

/**
 * Builds a validation error.
 *
 * @param {string} code - One of the MESSAGES keys.
 * @param {object} [extra] - Extra fields, e.g. `{detail}` or `{atoms}`.
 * @returns {{code: string, message: string}} The error object.
 */
export function validationError(code, extra = {}) {
  return { code, message: MESSAGES[code], ...extra };
}

/**
 * Largest atom or bond id accepted. Far above any real drawing, and far below
 * Number.MAX_SAFE_INTEGER, so incrementing id counters can never lose precision.
 */
export const MAX_ID = 1e9;

/**
 * Tells whether a value is a valid atom or bond id: an integer in 1…MAX_ID.
 *
 * @param {*} value - The value to test.
 * @returns {boolean} True for 1, 2, 3… up to MAX_ID.
 */
export function isId(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= MAX_ID;
}

/**
 * Tells whether a value is a valid id counter (the next id to hand out): an
 * integer in 1…MAX_ID + 1. A counter of MAX_ID + 1 is exhausted.
 *
 * @param {*} value - The value to test.
 * @returns {boolean} True for a usable or exhausted counter.
 */
export function isCounter(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= MAX_ID + 1;
}

/**
 * Describes an untrusted value for an English diagnostic without coercing it
 * (String() on a hostile object can throw or run arbitrary code).
 *
 * @param {*} value - Any value.
 * @returns {string} A short, safe description, e.g. `42`, `"abc"`, `an object`.
 */
export function describeValue(value) {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'undefined') {
    return `${value}`;
  }
  if (typeof value === 'string') {
    return JSON.stringify(value.length > 20 ? `${value.slice(0, 20)}…` : value);
  }
  return Array.isArray(value) ? 'an array' : `a value of type ${typeof value}`;
}

/** Atom fields that would describe charges, radicals or explicit hydrogens: never part of the model. */
const FORBIDDEN_ATOM_FIELDS = Object.freeze([
  'charge', 'formalCharge', 'radical', 'radicals', 'unpaired', 'hCount', 'hydrogens', 'explicitH', 'isotope',
]);

/**
 * Checks the atoms map: well-formed entries, ids unique (map key = atom id)
 * and positive integers, a supported element (elements.js), and no charge,
 * radical or explicit-hydrogen field (the model has none of those).
 *
 * @param {Map} atoms - The atoms map.
 * @returns {{code: string, message: string}|null} An INVALID error or null.
 */
function checkAtoms(atoms) {
  for (const [key, atom] of atoms) {
    if (atom === null || typeof atom !== 'object') {
      return validationError('INVALID', { detail: `atom entry ${describeValue(key)} is not an object` });
    }
    if (!isId(atom.id) || atom.id !== key) {
      return validationError('INVALID', { detail: `atom key ${describeValue(key)} does not match a valid id` });
    }
    if (!isSupportedElement(atom.element)) {
      return validationError('INVALID', { detail: `atom ${key} has unsupported element ${describeValue(atom.element)}` });
    }
    const forbidden = FORBIDDEN_ATOM_FIELDS.find((field) => Object.prototype.hasOwnProperty.call(atom, field));
    if (forbidden !== undefined) {
      return validationError('INVALID', { detail: `atom ${key} has unsupported field ${forbidden}` });
    }
  } // End of the loop over the atoms
  return null;
} // End of function checkAtoms()

/**
 * Checks the bonds map: ids unique and valid, endpoints exist, no self-bonds,
 * no duplicate bonds between the same pair, orders 1–3.
 *
 * @param {Map} atoms - The atoms map.
 * @param {Map} bonds - The bonds map.
 * @returns {{code: string, message: string}|null} An INVALID error or null.
 */
function checkBonds(atoms, bonds) {
  const pairs = new Set();
  for (const [key, bond] of bonds) {
    if (bond === null || typeof bond !== 'object') {
      return validationError('INVALID', { detail: `bond entry ${describeValue(key)} is not an object` });
    }
    if (!isId(bond.id) || bond.id !== key) {
      return validationError('INVALID', { detail: `bond key ${describeValue(key)} does not match a valid id` });
    }
    if (!atoms.has(bond.a) || !atoms.has(bond.b)) {
      return validationError('INVALID', { detail: `bond ${key} has a missing endpoint` });
    }
    if (bond.a === bond.b) {
      return validationError('INVALID', { detail: `bond ${key} joins atom ${bond.a} to itself` });
    }
    const pair = bond.a < bond.b ? `${bond.a}-${bond.b}` : `${bond.b}-${bond.a}`;
    if (pairs.has(pair)) {
      return validationError('INVALID', { detail: `duplicate bond between atoms ${pair}` });
    }
    pairs.add(pair);
    if (bond.order !== 1 && bond.order !== 2 && bond.order !== 3) {
      return validationError('INVALID', { detail: `bond ${key} has invalid order ${describeValue(bond.order)}` });
    }
  } // End of the loop over the bonds
  return null;
} // End of function checkBonds()

/**
 * Checks the id counters: valid counters that exceed every id in use, so the
 * next addAtom()/addBond() can never hand out an occupied id.
 *
 * @param {object} mol - The molecule (maps already checked).
 * @returns {{code: string, message: string}|null} An INVALID error or null.
 */
function checkCounters(mol) {
  const maxAtom = Math.max(0, ...mol.atoms.keys());
  const maxBond = Math.max(0, ...mol.bonds.keys());
  if (!isCounter(mol.nextAtomId) || mol.nextAtomId <= maxAtom) {
    return validationError('INVALID', { detail: `atom id counter ${describeValue(mol.nextAtomId)} is invalid` });
  }
  if (!isCounter(mol.nextBondId) || mol.nextBondId <= maxBond) {
    return validationError('INVALID', { detail: `bond id counter ${describeValue(mol.nextBondId)} is invalid` });
  }
  return null;
}

/**
 * Checks that no atom has more bonds (sum of orders) than its neutral
 * valence: C 4, N 3, O 2, halogens 1. The message names the element of the
 * lowest-id offending atom ("Este oxígeno tendría más de 2 enlaces.").
 *
 * @param {Map} atoms - The atoms map (already checked).
 * @param {Map} bonds - The bonds map (already checked).
 * @returns {{code: string, message: string, atoms: number[], element: string}|null} A VALENCE error listing the offending atoms, or null.
 */
function checkValence(atoms, bonds) {
  const sums = new Map();
  for (const bond of bonds.values()) {
    sums.set(bond.a, (sums.get(bond.a) || 0) + bond.order);
    sums.set(bond.b, (sums.get(bond.b) || 0) + bond.order);
  }
  const over = [...sums]
    .filter(([id, sum]) => sum > valenceOf(atoms.get(id).element))
    .map(([id]) => id)
    .sort((p, q) => p - q);
  if (over.length === 0) {
    return null;
  }
  const element = atoms.get(over[0]).element;
  return validationError('VALENCE', { message: valenceMessage(element), atoms: over, element });
} // End of function checkValence()

/**
 * Structural checks that must always hold (design.md §3.2). Never throws,
 * whatever the input.
 *
 * @param {object} mol - The molecule (possibly corrupt).
 * @returns {{code: string, message: string}|null} The first error found, or null when valid.
 */
export function validateStructure(mol) {
  try {
    if (mol === null || typeof mol !== 'object' || !(mol.atoms instanceof Map) || !(mol.bonds instanceof Map)) {
      return validationError('INVALID', { detail: 'not a molecule (atoms and bonds must be Maps)' });
    }
    return (
      checkAtoms(mol.atoms) ||
      checkBonds(mol.atoms, mol.bonds) ||
      checkCounters(mol) ||
      checkValence(mol.atoms, mol.bonds)
    );
  } catch (err) {
    // Hostile input (throwing getters, proxies…): report, never crash.
    return validationError('INVALID', { detail: 'unreadable molecule data' });
  }
} // End of function validateStructure()

/**
 * Tells whether a single ring is a benzene ring: six carbons whose ring
 * bonds alternate double and single (a Kekulé structure). Only this exact
 * pattern counts; aromaticity is never inferred from other alternations
 * (cycloocta-1,3,5,7-tetraeno is named normally).
 *
 * @param {object} mol - The molecule.
 * @param {{atoms: number[], bonds: number[]}} ring - The ring in ring order (perceiveRings()).
 * @returns {boolean} True for a benzene ring.
 */
export function isBenzeneRing(mol, ring) {
  if (ring.atoms.length !== 6) {
    return false;
  }
  const orders = ring.bonds.map((id) => mol.bonds.get(id).order);
  const alternates = (first) => orders.every((order, i) => order === (i % 2 === 0 ? first : 3 - first));
  return alternates(2) || alternates(1);
}

/**
 * Spanish CYCLE message for a benzene ring with `count` (≥ 2) substituents
 * (design.md §3.2, §13.1: monosubstituted benzenes only, no orto/meta/para).
 *
 * @param {number} count - Number of substituents on the ring.
 * @returns {string} The message.
 */
export function polysubstitutedBenzeneMessage(count) {
  return MESSAGES.CYCLE.replace('varios sustituyentes', `${count} sustituyentes`);
}

/**
 * The ring atoms of a single ring that carry a side chain (a bond to an atom
 * outside the ring), ascending.
 *
 * @param {object} mol - The molecule.
 * @param {{atoms: number[]}} ring - The ring (perceiveRings()).
 * @returns {number[]} The substituted ring atoms.
 */
export function substitutedRingAtoms(mol, ring) {
  const inRing = new Set(ring.atoms);
  const adj = adjacency(mol);
  return ring.atoms.filter((id) => adj.get(id).some((n) => !inRing.has(n.atom))).sort((p, q) => p - q);
}

/**
 * The scope check for a molecule with rings. A single carbocycle of at most
 * MAX_CHAIN carbons is in scope (null), with or without side chains and ring
 * multiple bonds (design.md §13.4 I-26; its side chains are checked later
 * by validateForNaming()). A benzene ring is in scope with at most one
 * substituent (I-28, named by naming/aromatic.js); with two or more it gets
 * CYCLE with `ringReason` 'polysubstitutedBenzene' (valid, but orto/meta/para
 * and polysubstituted benzenes are out of scope, design.md §13.1). A
 * benzene ring always carries at most one substituent per ring atom (each
 * ring atom already has three bonds). Otherwise: TOO_BIG for a larger ring,
 * and RING_SYSTEM with `ringKind` for a heterocycle, fused, bridged or spiro
 * system, or several rings (out of scope, design.md §13.1) — a benzene with
 * a ring in its substituent included. `atoms` lists every ring atom, for
 * highlighting.
 *
 * @param {object} mol - A structurally valid, connected molecule with at least one ring.
 * @returns {{code: string, message: string, atoms: number[]}|null} The error, or null for a nameable single carbocycle.
 */
function ringError(mol) {
  const { kind, perception } = classifyRings(mol);
  const atoms = perception.ringAtoms;
  if (kind !== 'carbocycle') {
    return validationError('RING_SYSTEM', { message: RING_SYSTEM_MESSAGES[kind], atoms, ringKind: kind });
  }
  if (atoms.length > MAX_CHAIN) {
    return validationError('TOO_BIG', { message: RING_TOO_BIG_MESSAGE, detail: `ring of ${atoms.length} carbons`, atoms });
  }
  const [ring] = perception.rings;
  if (isBenzeneRing(mol, ring)) {
    const substituted = substitutedRingAtoms(mol, ring);
    if (substituted.length > 1) {
      return validationError('CYCLE', {
        message: polysubstitutedBenzeneMessage(substituted.length),
        atoms,
        ringKind: kind,
        ringReason: 'polysubstitutedBenzene',
        substituted,
      });
    }
  }
  return null;
} // End of function ringError()

/**
 * Longest chain of the side chains of a single-ring molecule: the largest
 * number of carbons on a path that avoids the ring atoms (halogens are not
 * chain atoms, so they are left out). Each side chain is
 * a tree hanging from one ring atom, so its longest path is found with two
 * breadth-first sweeps (farthest atom, then farthest from it).
 *
 * @param {object} mol - A connected molecule with exactly one ring (validated structure).
 * @returns {number} The longest side-chain path in atoms; 0 without side chains.
 */
export function longestSideChain(mol) {
  const adj = adjacency(carbonSkeleton(mol));
  const ringAtoms = new Set(classifyRings(mol).perception.ringAtoms);
  const seen = new Set();
  /**
   * Breadth-first distances from one side-chain atom, never entering the ring.
   *
   * @param {number} from - A side-chain atom.
   * @returns {Map<number, number>} Distance (in bonds) of every atom of its side chain.
   */
  const sweep = (from) => {
    const dist = new Map([[from, 0]]);
    const queue = [from];
    for (let i = 0; i < queue.length; i += 1) {
      for (const n of adj.get(queue[i])) {
        if (!ringAtoms.has(n.atom) && !dist.has(n.atom)) {
          dist.set(n.atom, dist.get(queue[i]) + 1);
          queue.push(n.atom);
        }
      }
    }
    return dist;
  };
  /**
   * The atom farthest from the start of a sweep.
   *
   * @param {Map<number, number>} dist - Result of sweep().
   * @returns {number} The atom id.
   */
  const farthest = (dist) => [...dist].reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
  let longest = 0;
  for (const atom of adj.keys()) {
    if (ringAtoms.has(atom) || seen.has(atom)) {
      continue;
    }
    const first = sweep(atom);
    first.forEach((_, id) => seen.add(id));
    const second = sweep(farthest(first));
    longest = Math.max(longest, Math.max(...second.values()) + 1);
  } // End of the loop over the side chains
  return longest;
} // End of function longestSideChain()

/**
 * Tells whether every non-carbon atom of a molecule is a halogen bonded to
 * a carbon (a halogen derivative of a hydrocarbon, design.md §13.4 I-30):
 * each such halogen is a substituent prefix (fluoro-, cloro-, bromo-,
 * yodo-). A halogen bonded to another halogen (Cl–Cl), or a lone halogen
 * (HCl), is not.
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {number[]} hetero - Its non-carbon atom ids.
 * @returns {boolean} True when every one of them is a halogen on a carbon.
 */
export function isHalogenDerivative(mol, hetero) {
  const adj = adjacency(mol);
  return hetero.every((id) => {
    const links = adj.get(id);
    return isHalogen(mol.atoms.get(id).element) && links.length === 1 && mol.atoms.get(links[0].atom).element === 'C';
  });
}

/**
 * Tells whether an atom is the oxygen of an OH group on a carbon (an
 * alcohol or phenol group, design.md §13.4 I-31): an oxygen with exactly
 * one bond, a single bond, to a carbon. The OH of a carboxyl group matches
 * too: it is told apart by its carbon (isCarboxylCarbon(); the naming
 * engine's principal.js oxygenKind() classifies it as 'acid').
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {boolean} True for the O of a C–OH.
 */
export function isHydroxyOxygen(mol, adj, id) {
  const links = adj.get(id);
  return mol.atoms.get(id).element === 'O' && links.length === 1 && links[0].order === 1
    && mol.atoms.get(links[0].atom).element === 'C';
}

/**
 * Kind of the C=O an oxygen belongs to, when it is the oxygen of an
 * aldehyde or a ketone (design.md §13.4 I-32, §13.6): an oxygen with exactly
 * one bond, a double bond, to a carbon X whose other neighbours are all
 * carbons bonded by single bonds. X with at most one carbon neighbour is an
 * aldehyde (–CHO; methanal has none), with two a ketone (–CO–). Any other
 * C=O is not: an acid or ester (another O on X), an acyl halide (a halogen
 * on X), a ketene (X=C), CO₂…
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {'aldehyde'|'ketone'|null} The kind, or null when the atom is not such an oxygen.
 */
export function carbonylKind(mol, adj, id) {
  const links = adj.get(id);
  if (mol.atoms.get(id).element !== 'O' || links.length !== 1 || links[0].order !== 2) {
    return null;
  }
  const carbon = links[0].atom;
  if (mol.atoms.get(carbon).element !== 'C') {
    return null;
  }
  const others = adj.get(carbon).filter((n) => n.atom !== id);
  if (!others.every((n) => n.order === 1 && mol.atoms.get(n.atom).element === 'C')) {
    return null;
  }
  return others.length <= 1 ? 'aldehyde' : 'ketone';
} // End of function carbonylKind()

/**
 * Tells whether a carbon is the carbon X of a carboxyl group –C(=O)OH
 * (design.md §13.4 I-33, §13.6 table: X(=O)–OH with X bonded to at most
 * one R): exactly one oxygen double-bonded to it and one OH oxygen, both
 * bonded to nothing else, and at most one other neighbour, a carbon on a
 * single bond (none for methanoic acid). An ester (the O bonded to another
 * carbon), an acyl halide, carbonic acid (two OH), a peracid… are not.
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {boolean} True for the carbon of a –COOH.
 */
export function isCarboxylCarbon(mol, adj, id) {
  if (mol.atoms.get(id).element !== 'C') {
    return false;
  }
  const links = adj.get(id);
  const lone = (n) => mol.atoms.get(n.atom).element === 'O' && adj.get(n.atom).length === 1;
  const oxo = links.filter((n) => lone(n) && n.order === 2).length;
  const hydroxy = links.filter((n) => lone(n) && n.order === 1).length;
  const others = links.filter((n) => !lone(n));
  return oxo === 1 && hydroxy === 1 && others.length <= 1
    && others.every((n) => n.order === 1 && mol.atoms.get(n.atom).element === 'C');
} // End of function isCarboxylCarbon()

/**
 * Role of an oxygen in a carboxyl group –C(=O)OH (design.md §13.4 I-33):
 * 'carbonyl' for the O of the C=O, 'hydroxy' for the O of the OH, null
 * when the atom is not an oxygen of a carboxyl group (isCarboxylCarbon()).
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {'carbonyl'|'hydroxy'|null} The role.
 */
export function carboxylRole(mol, adj, id) {
  const links = adj.get(id);
  if (mol.atoms.get(id).element !== 'O' || links.length !== 1 || !isCarboxylCarbon(mol, adj, links[0].atom)) {
    return null;
  }
  return links[0].order === 2 ? 'carbonyl' : 'hydroxy';
}

/**
 * The carbons of the carboxyl groups of a molecule (isCarboxylCarbon()),
 * ascending.
 *
 * @param {object} mol - A structurally valid molecule.
 * @returns {number[]} The carbon ids.
 */
export function carboxylCarbons(mol) {
  const adj = adjacency(mol);
  return [...mol.atoms.keys()].filter((id) => isCarboxylCarbon(mol, adj, id)).sort((p, q) => p - q);
}

/**
 * Tells whether a carbon is the carbon X of an ester group –C(=O)–O–R
 * (design.md §13.4 I-35, §13.6 table: X(=O)–O–R with X bonded to at most
 * one carbon): exactly one oxygen double-bonded to it and bonded to nothing
 * else, one oxygen single-bonded to it whose only other neighbour is a
 * carbon R that is not a functional carbon (isFunctionalCarbon(): an
 * anhydride has a C=O carbon there), and at most one other neighbour, a
 * carbon on a single bond (none for a methanoate). An acid (an OH), a
 * carbonate (two single-bonded O on X), a peroxy ester, an acyl halide…
 * are not.
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {boolean} True for the carbon of a –COO– ester group.
 */
export function isEsterCarbon(mol, adj, id) {
  if (mol.atoms.get(id).element !== 'C') {
    return false;
  }
  const links = adj.get(id);
  const oxygen = (n) => mol.atoms.get(n.atom).element === 'O';
  const oxo = links.filter((n) => oxygen(n) && n.order === 2 && adj.get(n.atom).length === 1);
  const bridges = links.filter((n) => oxygen(n) && n.order === 1);
  const others = links.filter((n) => !oxygen(n));
  if (oxo.length !== 1 || bridges.length !== 1 || oxo.length + bridges.length + others.length !== links.length) {
    return false;
  }
  const beyond = adj.get(bridges[0].atom).filter((n) => n.atom !== id);
  const alkylOk = beyond.length === 1 && beyond[0].order === 1 && mol.atoms.get(beyond[0].atom).element === 'C'
    && !isFunctionalCarbon(mol, adj, beyond[0].atom);
  return alkylOk && others.length <= 1 && others.every((n) => n.order === 1 && mol.atoms.get(n.atom).element === 'C');
} // End of function isEsterCarbon()

/**
 * Role of an oxygen in an ester group –C(=O)–O–R (design.md §13.4 I-35):
 * 'carbonyl' for the O of the C=O, 'bridge' for the O between the C=O
 * carbon and the O-bound group R, null when the atom is not an oxygen of
 * an ester group (isEsterCarbon()).
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {'carbonyl'|'bridge'|null} The role.
 */
export function esterRole(mol, adj, id) {
  if (mol.atoms.get(id).element !== 'O') {
    return null;
  }
  const links = adj.get(id);
  if (links.length === 1) {
    return links[0].order === 2 && isEsterCarbon(mol, adj, links[0].atom) ? 'carbonyl' : null;
  }
  return links.length === 2 && links.some((n) => isEsterCarbon(mol, adj, n.atom)) ? 'bridge' : null;
} // End of function esterRole()

/**
 * The carbons of the ester groups of a molecule (isEsterCarbon()), ascending.
 *
 * @param {object} mol - A structurally valid molecule.
 * @returns {number[]} The carbon ids.
 */
export function esterCarbons(mol) {
  const adj = adjacency(mol);
  return [...mol.atoms.keys()].filter((id) => isEsterCarbon(mol, adj, id)).sort((p, q) => p - q);
}

/**
 * Tells whether a carbon is a functional carbon (design.md §13.6): one with
 * a double or triple bond to a heteroatom (the X of C=O, C=N, C≡N).
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {boolean} True for a carbon with a multiple bond to a heteroatom.
 */
export function isFunctionalCarbon(mol, adj, id) {
  return mol.atoms.get(id).element === 'C'
    && adj.get(id).some((n) => n.order > 1 && mol.atoms.get(n.atom).element !== 'C');
}

/**
 * Tells whether an atom is the oxygen of an ether C–O–C (design.md §13.4
 * I-34, §13.6 table: R–O–R): an oxygen with exactly two bonds, both single,
 * both to carbons, neither of them a functional carbon (a C=O carbon: that
 * would be an ester, `CC(=O)OC`, or an anhydride). A peroxide (O–O), an
 * O–N or O–halogen bond is not. An oxygen inside a ring never gets here:
 * the ring would be a heterocycle, refused first (RING_SYSTEM).
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {boolean} True for the O of a C–O–C ether.
 */
export function isEtherOxygen(mol, adj, id) {
  const links = adj.get(id);
  return mol.atoms.get(id).element === 'O' && links.length === 2
    && links.every((n) => n.order === 1 && mol.atoms.get(n.atom).element === 'C' && !isFunctionalCarbon(mol, adj, n.atom));
}

/**
 * The ether oxygens of a molecule (isEtherOxygen()), ascending.
 *
 * @param {object} mol - A structurally valid molecule.
 * @returns {number[]} The oxygen ids.
 */
export function etherOxygens(mol) {
  const adj = adjacency(mol);
  return [...mol.atoms.keys()].filter((id) => isEtherOxygen(mol, adj, id)).sort((p, q) => p - q);
}

/**
 * Tells whether an atom is the nitrogen of an amine (design.md §13.4 I-36,
 * §13.6 table: N with 1–3 R, single bonds only): a nitrogen with one, two
 * or three bonds, all single, all to carbons, none of them a functional
 * carbon (a C=O carbon makes an amide, I-37: isAmideCarbon()). NH₃ (no carbon), an
 * imine (C=N), a nitrile (C≡N, isNitrileNitrogen(), I-38), N–N, N–O or a halogen on N are not; a
 * charged N (ammonium) is never in the model (INVALID) and a fourth bond
 * is a VALENCE error. An N inside a ring never gets here: the ring would
 * be a heterocycle, refused first (RING_SYSTEM).
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {boolean} True for the N of a primary, secondary or tertiary amine.
 */
export function isAmineNitrogen(mol, adj, id) {
  const links = adj.get(id);
  return mol.atoms.get(id).element === 'N' && links.length >= 1 && links.length <= 3
    && links.every((n) => n.order === 1 && mol.atoms.get(n.atom).element === 'C' && !isFunctionalCarbon(mol, adj, n.atom));
}

/**
 * The amine nitrogens of a molecule (isAmineNitrogen()), ascending.
 *
 * @param {object} mol - A structurally valid molecule.
 * @returns {number[]} The nitrogen ids.
 */
export function amineNitrogens(mol) {
  const adj = adjacency(mol);
  return [...mol.atoms.keys()].filter((id) => isAmineNitrogen(mol, adj, id)).sort((p, q) => p - q);
}

/**
 * Tells whether a carbon is the carbon X of an amide group –C(=O)–N
 * (design.md §13.4 I-37, §13.6 table: X(=O)–N(R)0..2 with X bonded to at
 * most one carbon): exactly one oxygen double-bonded to it and bonded to
 * nothing else, exactly one nitrogen single-bonded to it whose other bonds
 * (none, one or two) are single bonds to carbons that are not functional
 * carbons (isFunctionalCarbon(): a second C=O on the N makes an imide,
 * imideNitrogens()), and at most one other neighbour, a carbon on a single
 * bond (none for methanamide). A urea (two N on X), a carbamate (an O and
 * an N on X), a hydrazide (N–N), an acyl halide… are not.
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {boolean} True for the carbon of a –CONH₂, –CONH– or –CON– group.
 */
export function isAmideCarbon(mol, adj, id) {
  if (mol.atoms.get(id).element !== 'C') {
    return false;
  }
  const links = adj.get(id);
  const element = (n) => mol.atoms.get(n.atom).element;
  const oxo = links.filter((n) => element(n) === 'O' && n.order === 2 && adj.get(n.atom).length === 1);
  const nitrogens = links.filter((n) => element(n) === 'N');
  const others = links.filter((n) => element(n) !== 'O' && element(n) !== 'N');
  if (oxo.length !== 1 || nitrogens.length !== 1 || nitrogens[0].order !== 1
    || oxo.length + nitrogens.length + others.length !== links.length) {
    return false;
  }
  const beyond = adj.get(nitrogens[0].atom).filter((n) => n.atom !== id);
  const nitrogenOk = beyond.every((n) => n.order === 1 && element(n) === 'C' && !isFunctionalCarbon(mol, adj, n.atom));
  return nitrogenOk && others.length <= 1 && others.every((n) => n.order === 1 && element(n) === 'C');
} // End of function isAmideCarbon()

/**
 * Role of an atom in an amide group –C(=O)–N (design.md §13.4 I-37):
 * 'carbonyl' for the O of the C=O, 'nitrogen' for the N, null when the
 * atom is neither (isAmideCarbon()). Both belong to the one group: the C=O
 * is never a ketone, the N never an amine.
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {'carbonyl'|'nitrogen'|null} The role.
 */
export function amideRole(mol, adj, id) {
  const element = mol.atoms.get(id).element;
  const links = adj.get(id);
  if (element === 'O') {
    return links.length === 1 && links[0].order === 2 && isAmideCarbon(mol, adj, links[0].atom) ? 'carbonyl' : null;
  }
  if (element === 'N') {
    return links.some((n) => n.order === 1 && isAmideCarbon(mol, adj, n.atom)) ? 'nitrogen' : null;
  }
  return null;
} // End of function amideRole()

/**
 * The carbons of the amide groups of a molecule (isAmideCarbon()),
 * ascending.
 *
 * @param {object} mol - A structurally valid molecule.
 * @returns {number[]} The carbon ids.
 */
export function amideCarbons(mol) {
  const adj = adjacency(mol);
  return [...mol.atoms.keys()].filter((id) => isAmideCarbon(mol, adj, id)).sort((p, q) => p - q);
}

/**
 * The nitrogen of the amide group whose carbon is `carbon` (isAmideCarbon()).
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} carbon - An amide carbon.
 * @returns {number} The N id.
 */
export function amideNitrogenOf(mol, adj, carbon) {
  return adj.get(carbon).find((n) => mol.atoms.get(n.atom).element === 'N').atom;
}

/**
 * The nitrogens of a molecule bonded by single bonds to carbons only, two
 * or three of them C=O carbons (a carbon with a lone oxygen on a double
 * bond): the N of an imide –CO–NH–CO– (design.md §13.4 I-37), ascending.
 * Such an N belongs to no amide (isAmideCarbon()) and is refused with its
 * own message (IMIDE_MESSAGE).
 *
 * @param {object} mol - A structurally valid molecule.
 * @returns {number[]} The nitrogen ids.
 */
export function imideNitrogens(mol) {
  const adj = adjacency(mol);
  const acyl = (id) => mol.atoms.get(id).element === 'C'
    && adj.get(id).some((n) => n.order === 2 && mol.atoms.get(n.atom).element === 'O' && adj.get(n.atom).length === 1);
  return [...mol.atoms.values()]
    .filter((atom) => atom.element === 'N')
    .filter((atom) => adj.get(atom.id).every((n) => n.order === 1 && mol.atoms.get(n.atom).element === 'C')
      && adj.get(atom.id).filter((n) => acyl(n.atom)).length >= 2)
    .map((atom) => atom.id)
    .sort((p, q) => p - q);
} // End of function imideNitrogens()

/**
 * Tells whether a carbon is the carbon X of a nitrile group –C≡N
 * (design.md §13.4 I-38, §13.6 table: X≡N with X bonded to at most one
 * carbon): exactly one nitrogen triple-bonded to it and bonded to nothing
 * else, and at most one other neighbour, a carbon on a single bond (none
 * for HC≡N, metanonitrilo). A cyanogen halide (Cl–C≡N), a cyanate
 * (O–C≡N), a cyanamide (N–C≡N)… are not.
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {boolean} True for the carbon of a –C≡N group.
 */
export function isNitrileCarbon(mol, adj, id) {
  if (mol.atoms.get(id).element !== 'C') {
    return false;
  }
  const links = adj.get(id);
  const nitrogens = links.filter((n) => mol.atoms.get(n.atom).element === 'N' && n.order === 3 && adj.get(n.atom).length === 1);
  const others = links.filter((n) => !nitrogens.includes(n));
  return nitrogens.length === 1 && others.length <= 1
    && others.every((n) => n.order === 1 && mol.atoms.get(n.atom).element === 'C');
} // End of function isNitrileCarbon()

/**
 * Tells whether an atom is the nitrogen of a nitrile group –C≡N (design.md
 * §13.4 I-38): a nitrogen whose only bond is a triple bond to a nitrile
 * carbon (isNitrileCarbon()). It is never an amine nitrogen (a triple
 * bond) and never a chain atom.
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {boolean} True for the N of a –C≡N.
 */
export function isNitrileNitrogen(mol, adj, id) {
  const links = adj.get(id);
  return mol.atoms.get(id).element === 'N' && links.length === 1 && links[0].order === 3
    && isNitrileCarbon(mol, adj, links[0].atom);
}

/**
 * The carbons of the nitrile groups of a molecule (isNitrileCarbon()),
 * ascending.
 *
 * @param {object} mol - A structurally valid molecule.
 * @returns {number[]} The carbon ids.
 */
export function nitrileCarbons(mol) {
  const adj = adjacency(mol);
  return [...mol.atoms.keys()].filter((id) => isNitrileCarbon(mol, adj, id)).sort((p, q) => p - q);
}

/**
 * Longest carbon chain of an acyclic molecule: the largest number of
 * carbons on a path of its carbon skeleton. Without ethers the skeleton is
 * one tree; each ether oxygen splits it (a carbon chain never runs through
 * an O, design.md §13.4 I-34), so the longest path of every piece counts.
 *
 * @param {object} mol - A connected acyclic molecule (validated structure).
 * @returns {number} The longest chain in carbons.
 */
export function longestCarbonChain(mol) {
  const skeleton = carbonSkeleton(mol);
  let longest = 0;
  for (const component of connectedComponents(skeleton)) {
    const ids = new Set(component);
    const piece = {
      atoms: new Map([...skeleton.atoms].filter(([id]) => ids.has(id))),
      bonds: new Map([...skeleton.bonds].filter(([, bond]) => ids.has(bond.a))),
    };
    longest = Math.max(longest, longestChainLength(piece));
  }
  return longest;
} // End of function longestCarbonChain()

/**
 * Tells whether every non-carbon atom of a molecule is one the engine can
 * name: a halogen bonded to a carbon (a prefix, I-30), the oxygen of an OH
 * on a carbon (the `-ol` suffix or the `hidroxi` prefix, I-31), the
 * oxygen of an aldehyde or ketone C=O (the `-al` / `-ona` suffix or the
 * `oxo` prefix, I-32; carbonylKind()) or an oxygen of a carboxyl group
 * (the `ácido …oico` suffix, I-33; carboxylRole()) or the oxygen of an
 * ether C–O–C (an `alcoxi-` prefix, I-34; isEtherOxygen()) or an oxygen
 * of an ester –COO– (`…oato de …ilo`, I-35; esterRole()), or the
 * nitrogen of an amine (`-amina` or `amino-`, I-36; isAmineNitrogen()), or
 * the O or N of an amide –CONH₂ (`-amida`, I-37; amideRole()), or the N
 * of a nitrile –C≡N (`-nitrilo`, I-38; isNitrileNitrogen()).
 * Any other O or N is not. The OH of an ester-like or otherwise unsupported C=O carbon
 * (`OC(=O)O`, a peracid) is refused through its C=O.
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {number[]} hetero - Its non-carbon atom ids.
 * @returns {boolean} True when every one of them is nameable.
 */
export function hasNameableHeteroatoms(mol, hetero) {
  const adj = adjacency(mol);
  const halogens = hetero.filter((id) => isHalogen(mol.atoms.get(id).element));
  return isHalogenDerivative(mol, halogens)
    && hetero.every((id) => isHalogen(mol.atoms.get(id).element) || isHydroxyOxygen(mol, adj, id)
      || carbonylKind(mol, adj, id) !== null || carboxylRole(mol, adj, id) !== null || isEtherOxygen(mol, adj, id)
      || esterRole(mol, adj, id) !== null || isAmineNitrogen(mol, adj, id) || amideRole(mol, adj, id) !== null
      || isNitrileNitrogen(mol, adj, id));
}

/**
 * The OH oxygens of a single-ring molecule whose carbon is not a ring atom
 * (an OH on a side chain), ascending. Refused until I-40a (the chain may
 * be the parent, with the ring as a `ciclohexil` / `fenil` prefix); kept
 * as a helper.
 *
 * @param {object} mol - A validated single-ring molecule whose heteroatoms are nameable.
 * @returns {number[]} The side-chain OH oxygens (empty when every OH is on the ring).
 */
export function sideChainHydroxyls(mol) {
  const ringAtoms = new Set(classifyRings(mol).perception.ringAtoms);
  const adj = adjacency(mol);
  return [...mol.atoms.values()]
    .filter((atom) => isHydroxyOxygen(mol, adj, atom.id) && !ringAtoms.has(adj.get(atom.id)[0].atom))
    .map((atom) => atom.id)
    .sort((p, q) => p - q);
}

/**
 * The C=O oxygens of a single-ring molecule whose carbon is not a ring atom,
 * ascending, with their kind (design.md §13.4 I-32): every aldehyde (a
 * –CHO carbon is never a ring atom) and every ketone on a side chain. Kept
 * as a helper: ketones on a side chain are named since I-40a (the chain
 * may be the parent, with the ring as a prefix: `1-feniletan-1-ona`),
 * aldehydes since I-40b (`ciclohexanocarbaldehído`, `2-feniletanal`).
 *
 * @param {object} mol - A validated single-ring molecule whose heteroatoms are nameable.
 * @returns {{atom: number, kind: 'aldehyde'|'ketone'}[]} The side-chain C=O oxygens.
 */
export function sideChainCarbonyls(mol) {
  const ringAtoms = new Set(classifyRings(mol).perception.ringAtoms);
  const adj = adjacency(mol);
  return [...mol.atoms.values()]
    .filter((atom) => carbonylKind(mol, adj, atom.id) !== null && !ringAtoms.has(adj.get(atom.id)[0].atom))
    .map((atom) => ({ atom: atom.id, kind: carbonylKind(mol, adj, atom.id) }))
    .sort((p, q) => p.atom - q.atom);
}

/**
 * The aldehyde oxygens of a molecule (carbonylKind() 'aldehyde'), ascending.
 *
 * @param {object} mol - A structurally valid molecule.
 * @returns {number[]} The oxygen ids.
 */
export function aldehydeOxygens(mol) {
  const adj = adjacency(mol);
  return [...mol.atoms.keys()].filter((id) => carbonylKind(mol, adj, id) === 'aldehyde').sort((p, q) => p - q);
}

/**
 * The `manyAldehydes` refusal of a nameable-heteroatom molecule
 * (design.md §13.4 I-32, narrowed by I-39b), or null: with the aldehyde
 * principal (no acid, ester, amide or nitrile), more than two aldehyde
 * groups on one carbon piece (chainPieces(): joined through C–C bonds
 * only, ring atoms left out, I-40b): a third –CHO would need
 * `-carbaldehído`. Any number of –CHO bonded to the ring is named
 * (`ciclohexano-1,2-dicarbaldehído`). Aldehydes on other pieces (beyond an
 * ether O or an amine N) are named inside their branch (`oxo-`,
 * `formil-`), and below a more senior group every –CHO is named
 * (`oxo-`, or `formil-` when its carbon is off the chain). `aldehydes`
 * lists every aldehyde oxygen.
 *
 * @param {object} mol - A validated molecule whose heteroatoms are nameable.
 * @param {number[]} hetero - Its non-carbon atom ids.
 * @param {boolean} senior - Whether it has an acid, an ester, an amide or a nitrile group.
 * @returns {{code: string, message: string}|null} The HETEROATOM error, or null.
 */
function manyAldehydesError(mol, hetero, senior) {
  const aldehydes = aldehydeOxygens(mol);
  if (senior || aldehydes.length <= 2) {
    return null;
  }
  const adj = adjacency(mol);
  const carbons = aldehydes.map((oxygen) => adj.get(oxygen)[0].atom);
  const pieces = chainPieces(mol);
  return pieces.some((piece) => carbons.filter((carbon) => piece.includes(carbon)).length > 2)
    ? validationError('HETEROATOM', { message: MANY_ALDEHYDES_MESSAGE, atoms: hetero, reason: 'manyAldehydes', aldehydes })
    : null;
} // End of function manyAldehydesError()

/**
 * The atoms of the O-bound group of an ester (design.md §13.4 I-35): the
 * subtree beyond its bridge O, seen from that O (the O itself excluded).
 *
 * @param {Map<number, object[]>} adj - Adjacency map of the molecule.
 * @param {number} bridge - The bridge O.
 * @param {number} far - The carbon bonded to the bridge O on the far side.
 * @returns {number[]} The atom ids of the group.
 */
function sideAtoms(adj, bridge, far) {
  const seen = new Set([bridge, far]);
  const atoms = [far];
  for (let i = 0; i < atoms.length; i += 1) {
    for (const n of adj.get(atoms[i])) {
      if (!seen.has(n.atom)) {
        seen.add(n.atom);
        atoms.push(n.atom);
      }
    }
  }
  return atoms;
} // End of function sideAtoms()

/**
 * Tells whether a diester needs locants for its O-bound groups (design.md
 * §13.4 I-39c): its two groups differ (rooted tree keys seen from their
 * bridge O) and its acid part — the molecule without the two O-bound
 * groups, both bridge O kept — is not the same seen from either ester
 * carbon (rooted tree keys from each carbon differ: in a tree, equal keys
 * mean a symmetry that swaps the two ends). `propanodioato de etilo y
 * metilo` needs none; `2-metilbutanodioato de 1-etilo y 4-metilo` does.
 *
 * @param {object} mol - A validated acyclic molecule.
 * @param {number[]} esters - Its two ester carbons, on one carbon piece.
 * @returns {boolean} True when locants would be needed.
 */
export function diesterNeedsLocants(mol, esters) {
  const adj = adjacency(mol);
  const cut = new Set();
  const keys = esters.map((carbon) => {
    const bridge = adj.get(carbon).find((n) => n.order === 1 && mol.atoms.get(n.atom).element === 'O').atom;
    const far = adj.get(bridge).find((n) => n.atom !== carbon).atom;
    sideAtoms(adj, bridge, far).forEach((id) => cut.add(id));
    return rootedTreeKey(mol, far, bridge, adj);
  });
  if (keys[0] === keys[1]) {
    return false;
  }
  const part = new Map([...adj].filter(([id]) => !cut.has(id)).map(([id, links]) => [id, links.filter((n) => !cut.has(n.atom))]));
  return rootedTreeKey(mol, esters[0], null, part) !== rootedTreeKey(mol, esters[1], null, part);
} // End of function diesterNeedsLocants()

/**
 * The refusal of an open-chain molecule without an acid whose ester groups
 * cannot all be cited as the suffix (design.md §13.4 I-35, I-39c), or
 * null: more than two esters (`manyEsters`: a third would need
 * `-carboxilato`); two whose C=O carbons lie on different carbon pieces
 * (`esterPrefix`: a diol diester such as `diacetato de etano-1,2-diilo`,
 * or an ester inside the O-bound group of another — one would be a
 * prefix); two with different O-bound groups on an acid part that differs
 * seen from each end (`mixedDiester`: locants for the groups,
 * diesterNeedsLocants()). Two esters on one carbon piece are both chain
 * ends of the parent (`butanodioato de dimetilo`, `propanodioato de etilo
 * y metilo`). `esters` lists the ester carbons.
 *
 * @param {object} mol - A validated acyclic molecule whose heteroatoms are nameable.
 * @param {number[]} hetero - Its non-carbon atom ids.
 * @param {number[]} esters - Its ester carbons (esterCarbons()).
 * @returns {{code: string, message: string}|null} The HETEROATOM error, or null.
 */
function esterPlacementError(mol, hetero, esters) {
  const refuse = (message, reason) => validationError('HETEROATOM', { message, atoms: hetero, reason, esters });
  if (esters.length > 2) {
    return refuse(MANY_ESTERS_MESSAGE, 'manyEsters');
  }
  if (esters.length < 2) {
    return null;
  }
  const pieces = connectedComponents(carbonSkeleton(mol));
  if (!pieces.some((piece) => piece.includes(esters[0]) && piece.includes(esters[1]))) {
    return refuse(ESTER_PREFIX_MESSAGE, 'esterPrefix');
  }
  return diesterNeedsLocants(mol, esters) ? refuse(MIXED_DIESTER_MESSAGE, 'mixedDiester') : null;
} // End of function esterPlacementError()

/**
 * The refusal of a nameable-heteroatom molecule whose oxygen groups the
 * engine cannot place yet (design.md §13.4 I-31, I-32, I-33, I-35), or null.
 * With a ring: an ester group (`ringEster`), then the amides and nitriles
 * below; a ketone C=O, an OH or an amine on a side chain is named since
 * I-40a and an acid or aldehyde since I-40b (the ring carries a –COOH or
 * –CHO bonded to it as `-carboxílico` / `-carbaldehído`; a chain carrying
 * more principal groups than the ring is the parent, the ring a
 * `ciclohexil` / `fenil` prefix). Then more than two carboxyl groups on one
 * carbon piece (chainPieces(), `manyAcids`: a third –COOH would need
 * `-carboxílico`; on other pieces it is `carboxi-`), then, without an acid (with one, every
 * ester is a prefix: `alcoxi…oxo`, `alcoxicarbonil-`, `aciloxi-`, I-39c),
 * the esters that cannot all be the suffix (esterPlacementError():
 * `manyEsters`, `esterPrefix`, `mixedDiester`), then the amides (amidePlacementError():
 * `ringAmide`, `manyAmides`, `substitutedPolyamide`), then
 * the nitriles (nitrilePlacementError(): `ringNitrile`, `carbonocyanidic`,
 * `manyNitriles`), then more than two aldehyde groups on one carbon piece
 * with the aldehyde principal (manyAldehydesError(), `manyAldehydes`). The error lists the heteroatoms (`atoms`) and the
 * offending groups (`acids`: the carboxyl carbons; `esters`: the ester
 * carbons; `aldehydes`: oxygens).
 *
 * @param {object} mol - A validated molecule whose heteroatoms are nameable.
 * @param {boolean} cyclic - Whether it has a ring.
 * @param {number[]} hetero - Its non-carbon atom ids.
 * @returns {{code: string, message: string}|null} The HETEROATOM error, or null.
 */
function oxygenPlacementError(mol, cyclic, hetero) {
  const acids = carboxylCarbons(mol);
  const esters = esterCarbons(mol);
  if (cyclic && esters.length > 0) {
    return validationError('HETEROATOM', { message: RING_ESTER_MESSAGE, atoms: hetero, reason: 'ringEster', esters });
  }
  const pieces = chainPieces(mol);
  if (pieces.some((piece) => acids.filter((carbon) => piece.includes(carbon)).length > 2)) {
    return validationError('HETEROATOM', { message: MANY_ACIDS_MESSAGE, atoms: hetero, reason: 'manyAcids', acids });
  }
  const diester = acids.length === 0 ? esterPlacementError(mol, hetero, esters) : null;
  if (diester) {
    return diester;
  }
  const amide = amidePlacementError(mol, cyclic, hetero, acids.length + esters.length > 0);
  if (amide) {
    return amide;
  }
  const nitrile = nitrilePlacementError(mol, cyclic, hetero, acids.length + esters.length + amideCarbons(mol).length > 0);
  if (nitrile) {
    return nitrile;
  }
  // Aldehydes and acids with a ring are named since I-40b (`-carbaldehído`, `-carboxílico`, or the ring as a prefix).
  return manyAldehydesError(mol, hetero, acids.length + esters.length + amideCarbons(mol).length + nitrileCarbons(mol).length > 0);
} // End of function oxygenPlacementError()

/**
 * The carbon pieces of a molecule whose chains can carry principal groups
 * (design.md §13.4 I-39b, I-40b): the connected parts of its carbon
 * skeleton (joined through C–C bonds only; an ether O or an amine N splits
 * them) without the ring atoms, so a –COOH or –CHO bonded to a ring is a
 * piece of its own. A chain has only two ends, so a piece with more than
 * two acid or aldehyde carbons cannot cite them all as suffix groups.
 *
 * @param {object} mol - A structurally valid molecule with at most one ring.
 * @returns {number[][]} The pieces, as ascending carbon-id arrays.
 */
function chainPieces(mol) {
  return connectedComponents(carbonSkeleton(mol, cycleCore(adjacency(mol))));
}

/**
 * The refusal of a nameable-heteroatom molecule whose amide groups the
 * engine cannot place (design.md §13.4 I-37, I-39d), or null. In order:
 * any amide with a ring (`ringAmide`: `-carboxamida`, `N-fenil…`, I-40c);
 * beside an acid or an ester (ácido > éster > amida) every amide is a
 * prefix and is named (`amino…oxo`, `carbamoil-`, `acilamino-`, I-39d);
 * otherwise more than two amides on one carbon piece (`manyAmides`: an
 * amide carbon is always a chain end, a third would need
 * `-carboxamida`); a piece with two amides, which then carries the suffix
 * (P0), where some of their N carries other groups (`substitutedPolyamide`:
 * N¹/N⁴ locants, also when that group holds another amide). Amides on
 * other carbon pieces (joined through an N or an O) are named: the parent
 * carries the most (P0), the others are prefixes (`2-(acetilamino)etanamida`).
 * The error lists the heteroatoms (`atoms`) and the amide carbons
 * (`amides`).
 *
 * @param {object} mol - A validated molecule whose heteroatoms are nameable.
 * @param {boolean} cyclic - Whether it has a ring.
 * @param {number[]} hetero - Its non-carbon atom ids.
 * @param {boolean} senior - Whether it has an acid or an ester group.
 * @returns {{code: string, message: string}|null} The HETEROATOM error, or null.
 */
function amidePlacementError(mol, cyclic, hetero, senior) {
  const amides = amideCarbons(mol);
  if (amides.length === 0) {
    return null;
  }
  const refuse = (message, reason) => validationError('HETEROATOM', { message, atoms: hetero, reason, amides });
  if (cyclic) {
    return refuse(RING_AMIDE_MESSAGE, 'ringAmide');
  }
  if (senior) {
    return null; // Beside an acid or an ester every amide is a prefix (I-39d): `amino…oxo`, `carbamoil-`, `acilamino-`.
  }
  const pieces = connectedComponents(carbonSkeleton(mol)).map((piece) => amides.filter((carbon) => piece.includes(carbon)));
  if (pieces.some((onPiece) => onPiece.length > 2)) {
    return refuse(MANY_AMIDES_MESSAGE, 'manyAmides');
  }
  const most = Math.max(...pieces.map((onPiece) => onPiece.length));
  const candidates = pieces.filter((onPiece) => onPiece.length === most);
  if (most === 2) {
    const adj = adjacency(mol);
    // A diamide that could carry the suffix with a group on some N (another amide's piece included): N¹/N⁴ locants.
    if (candidates.flat().some((carbon) => adj.get(amideNitrogenOf(mol, adj, carbon)).length > 1)) {
      return refuse(SUBSTITUTED_POLYAMIDE_MESSAGE, 'substitutedPolyamide');
    }
  }
  return null;
} // End of function amidePlacementError()

/**
 * The refusal of a nameable-heteroatom molecule whose nitrile groups the
 * engine cannot place (design.md §13.4 I-38, I-39a), or null. In order: any
 * nitrile with a ring (`ringNitrile`: `-carbonitrilo`, `benzonitrilo`, or
 * a ring on the chain that carries it, I-40c); beside an acid, an ester or
 * an amide (ácido > éster > amida > nitrilo) every nitrile is the prefix
 * `ciano-` (I-39a), except one bonded directly to the carbon of such a
 * group (`carbonocyanidic`: NC–COOH is a carbonic acid derivative for
 * IUPAC 2013); with the nitrile principal, more than two nitrile carbons
 * on one carbon piece (`manyNitriles`: a nitrile carbon is always a chain
 * end, so a third would need `-carbonitrilo`). Nitriles on other carbon
 * pieces (joined through an O or an N) are named: the parent carries the
 * most (P0), the others are `ciano-` inside a branch. The error lists the
 * heteroatoms (`atoms`) and the nitrile carbons (`nitriles`).
 *
 * @param {object} mol - A validated molecule whose heteroatoms are nameable.
 * @param {boolean} cyclic - Whether it has a ring.
 * @param {number[]} hetero - Its non-carbon atom ids.
 * @param {boolean} senior - Whether it has an acid, an ester or an amide group.
 * @returns {{code: string, message: string}|null} The HETEROATOM error, or null.
 */
function nitrilePlacementError(mol, cyclic, hetero, senior) {
  const nitriles = nitrileCarbons(mol);
  if (nitriles.length === 0) {
    return null;
  }
  const refuse = (message, reason) => validationError('HETEROATOM', { message, atoms: hetero, reason, nitriles });
  if (cyclic) {
    return refuse(RING_NITRILE_MESSAGE, 'ringNitrile');
  }
  const adj = adjacency(mol);
  if (senior) {
    const functional = (id) => isCarboxylCarbon(mol, adj, id) || isEsterCarbon(mol, adj, id) || isAmideCarbon(mol, adj, id);
    const onFunctional = nitriles.some((carbon) => adj.get(carbon).some((n) => functional(n.atom)));
    return onFunctional ? refuse(CARBONOCYANIDIC_MESSAGE, 'carbonocyanidic') : null;
  }
  const pieces = connectedComponents(carbonSkeleton(mol));
  if (pieces.some((piece) => nitriles.filter((carbon) => piece.includes(carbon)).length > 2)) {
    return refuse(MANY_NITRILES_MESSAGE, 'manyNitriles');
  }
  return null;
} // End of function nitrilePlacementError()

/**
 * Structural checks plus the naming checks, in order: non-empty, connected,
 * ring scope (ringError(): a single carbocycle of at most 30 carbons
 * passes; TOO_BIG or RING_SYSTEM otherwise), carbon and heavy-atom caps,
 * carbon, halogens on carbon, OH groups on carbon, aldehyde or ketone
 * C=O, carboxyl groups, ether C–O–C, ester –COO–, amine N, amide –CONH₂ and nitrile –C≡N only (HETEROATOM for any other atom: valid but
 * not nameable yet, with the `imide` reason for an imide N; also (an OH, a ketone C=O or an amine N on a ring's side
 * chain is named since I-40a, an acid or aldehyde with a ring since I-40b) for more than two
 * principal aldehydes or more than two acids on one carbon piece, and, without an acid, more than two esters, two
 * esters on different carbon pieces or a mixed diester that would need locants on a chain, any ester with a ring, and the amide and nitrile placements of
 * amidePlacementError() and nitrilePlacementError(): oxygenPlacementError()), chain cap — the
 * longest carbon chain of a tree, or the longest side chain of a ring
 * (design.md §3.2, §13.1). A molecule passing this is a hydrocarbon (or a
 * halogen derivative, alcohol, aldehyde, ketone, carboxylic acid, ether, ester, amine, amide or nitrile of one)
 * of at most 60 carbons that is either a tree
 * whose longest carbon chain has at most 30, or a single carbocycle of 3
 * to 30 carbons whose side chains have at most 30 carbons (a side chain
 * carrying more principal groups than the ring is the parent, design.md
 * §13.4 I-40a). The engine may still refuse a C=O
 * carbon that ends up bonded to the parent as a branch
 * (ACYL_SUBSTITUENT_MESSAGE, naming/index.js), an ether or amine whose
 * identical parts each carry the principal group (SYMMETRIC_ETHER_MESSAGE,
 * SYMMETRIC_AMINE_MESSAGE, SYMMETRIC_RING_MESSAGE) and a parent with several amine groups where
 * some N carries other groups (SUBSTITUTED_POLYAMINE_MESSAGE).
 *
 * @param {object} mol - The molecule (possibly corrupt).
 * @returns {{code: string, message: string}|null} The first error found, or null when the molecule can be named.
 */
export function validateForNaming(mol) {
  const structural = validateStructure(mol);
  if (structural) {
    return structural;
  }
  if (mol.atoms.size === 0) {
    return validationError('EMPTY');
  }
  if (!isConnected(mol)) {
    return validationError('DISCONNECTED');
  }
  const cyclic = hasCycle(mol);
  if (cyclic) {
    const ring = ringError(mol);
    if (ring) {
      return ring;
    }
  }
  const carbons = [...mol.atoms.values()].filter((atom) => atom.element === 'C').length;
  if (carbons > MAX_CARBONS) {
    return validationError('TOO_BIG', { detail: `${carbons} carbons` });
  }
  if (mol.atoms.size > MAX_HEAVY_ATOMS) {
    return validationError('TOO_BIG', { message: TOO_MANY_ATOMS_MESSAGE, detail: `${mol.atoms.size} heavy atoms` });
  }
  const hetero = [...mol.atoms.values()].filter((atom) => atom.element !== 'C').map((atom) => atom.id).sort((p, q) => p - q);
  if (hetero.length > 0 && !hasNameableHeteroatoms(mol, hetero)) {
    // A valid molecule, but the engine only names hydrocarbons, halogen derivatives, alcohols, aldehydes, ketones, acids, ethers, esters, amines, amides and nitriles so far.
    const imides = imideNitrogens(mol);
    return imides.length > 0
      ? validationError('HETEROATOM', { message: IMIDE_MESSAGE, atoms: hetero, reason: 'imide', imides })
      : validationError('HETEROATOM', { atoms: hetero });
  }
  const placement = hetero.length > 0 ? oxygenPlacementError(mol, cyclic, hetero) : null;
  if (placement) {
    return placement;
  }
  const chain = cyclic ? longestSideChain(mol) : longestCarbonChain(mol);
  if (chain > MAX_CHAIN) {
    return validationError('TOO_BIG', { detail: `${cyclic ? 'longest side chain' : 'longest chain'} has ${chain} carbons` });
  }
  return null;
} // End of function validateForNaming()

/**
 * Validates a molecule graph and wraps the outcome as a result object.
 *
 * @param {object} mol - The molecule to validate.
 * @param {{forNaming?: boolean}} [options] - `forNaming` (default true) adds the naming checks.
 * @returns {{ok: true}|{ok: false, error: {code: string, message: string}}} The validation result.
 */
export function validateMolecule(mol, options = {}) {
  const forNaming = options.forNaming !== false;
  const error = forNaming ? validateForNaming(mol) : validateStructure(mol);
  return error ? { ok: false, error } : { ok: true };
}

export { validateMolecule as validate };
