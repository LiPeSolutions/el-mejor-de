# Personajes 2.0 · El Mejor de

Esta spec sirve para implementar el sistema nuevo de personajes: 17 bichos, personalización por zonas, vista de tres cuartos, 6 poses y avatar redondo.

- **Repo:** `LiPeSolutions/el-mejor-de`, rama `claude/adoring-bardeen-19q4va`.
- **Estilo elegido:** **1a «Pulido»**. Es el dibujo plano y sin contorno de hoy, con las terminaciones parejas.
- Los personajes que ya están guardados se tienen que seguir viendo igual (ver §8).

---

## 1. Contexto del proyecto

*El Mejor de* es una app de retos diarios para jugar en grupo. El **personaje** es el avatar de cada jugador y también la mascota de cada juego. Se dibuja en SVG, en código, sin imágenes.

**Archivos clave:**

| Archivo | Qué hace hoy |
|---|---|
| `apps/web/src/components/personaje/Personaje.tsx` | Dibuja el personaje: `SPECIES`, `BodyColors`, `PersonajeProps`. Usa `h = React.createElement` y un esqueleto por especie en un viewBox de 100 × 120. |
| `apps/web/src/components/personaje/avatar.ts` | `AVATAR_PALETTE`, `COLOR_NAMES`, `SPECIES_NAMES` y `avatarLook(avatar)`, que convierte el `Avatar` en las props de `Personaje`. |
| `packages/shared/src/accounts.ts` | `AVATAR_SPECIES` (8), `AVATAR_COLORS`, `AVATAR_ACCESSORIES` (boina, gorra, anteojos, bufanda, mate), `Avatar`, `DEFAULT_AVATAR` y `parseAvatar()`, con sus pruebas en `accounts.test.ts`. |
| `components/crowns/CrownCelebration.tsx` | Le suma `"corona"` a `acc` al que tiene la corona. |
| `lib/games.ts` | La mascota de cada juego (`mascot`: `sp`, `c`, `prop`) y `resultFace`. |

**Quién usa `<Personaje>`** (según la búsqueda en el repo):
- **Cuenta:** CharacterForm, ProfileScreen, SignInForm y CreateAccountIntro.
- **Inicio:** HomeScreen.
- **Ranking:** Ranking (filas y podio).
- **Corona:** CrownCelebration.
- **Juegos:** GameIntro, GameResultView, RestingGame, PracticeHome, tubitos/LevelWin, largada (Intro, Result y Car) y place/PlaceFlow.
- **Batallas:** BattleCountdown, BattleHistory, BattleLargada, BattleLetters, BattleLettersWords, BattlePodium, BattleQuestion, JoinBattle y battle/parts.
- **Grupos:** groups/GroupSettings, GroupsHome y parts.
- **Otros:** not-found.

**La API de hoy tiene que seguir funcionando:**
- `sp`, `size`, `face` (`happy`, `joy`, `wow`, `wink` o `sleep`), `acc[]`, `prop` (`letra`, `pregunta`, `rayo`, `bandera` o `tubo`), `c`, `scarf`, `anim`, `className` y `title`.
- `frame`, que usa `largada/Car.tsx` para recortar alrededor de los ojos.

## 2. Qué cambia

1. **Dibujo pulido:** mismas formas y medidas, con detalles parejos en todos los bichos.
   - Una sombra suave de la cabeza sobre el cuerpo.
   - Brillo en los ojos proporcional a su tamaño.
   - **Colas pegadas al cuerpo.** El hornero de hoy tiene la cola despegada y queda corregida.
2. **17 especies:** las 8 de hoy, más **yaguareté, tero, mulita, cóndor, ñandú, oso hormiguero, vizcacha, perro y gato**.
3. **Personalización:**
   - Segundo color de detalle.
   - Ojos, pelo y marcas.
   - Ropa, con color y número.
   - **Un accesorio por zona:** cabeza, cara, cuello y mano.
   - Fondo del avatar redondo.
4. **Vistas:** de frente y **tres cuartos** (mirando a la izquierda o a la derecha).
5. **Poses:** quieto, saludo, festejo, salto, **corona** (abrazándola) y dormido.
6. **Avatar redondo:** medio cuerpo dentro de un círculo de color.

**No es parte de este paquete:**
- La pantalla del **editor** de personaje (ver §11).
- Los estilos 1b, 1c y 2c, que se exploraron y se descartaron.

## 3. Qué hay en este zip

| Ruta | Qué es |
|---|---|
| `PERSONAJES.md` | Este documento. |
| `fuente/personajes.js` | **La fuente de verdad del dibujo:** todas las especies, opciones, vistas y poses. Es JS sin dependencias. Portalo a `Personaje.tsx` (ver §4). |
| `fuente/Personajes finales.dc.html` | La hoja de modelos. Se abre en el navegador si la carpeta queda junta (`support.js`, `fonts/` y `personajes.js`). |
| `pantallas/01-hoja-de-modelos.png` | Los 17 bichos de frente, en ¾ hacia los dos lados, en las 6 poses y como avatar. **Es la referencia visual principal.** |
| `pantallas/02-con-todo-puesto.png` | 8 personajes personalizados en cada vista y pose. |
| `pantallas/03-donde-va-cada-pose.png` | Inicio, podio, festejo de la corona y ranking. |
| `svg/especies/<especie>/NN-<vista>.svg` | 153 SVG de referencia (17 bichos por 9 vistas), uno por celda de la hoja. |
| `svg/ejemplos/<nombre>/…svg` | Los 8 personajes de ejemplo en 6 vistas. Sus datos están en `datos/avatares-ejemplo.json`. |
| `svg/opciones/…svg` | Cada opción por separado, puesta en el hornero: ojos, pelo, marcas, ropa, cabeza, cara, cuello, mano y corona. También el color de detalle sobre un gato gris. |
| `datos/especies.json` | Ids, nombres visibles y cuáles son nuevas. |
| `datos/avatares-ejemplo.json` | 8 `Avatar` con el formato nuevo (§5), para pruebas y para una página de desarrollo. |

**Sobre los SVG:**
- Llevan un 14 % de margen alrededor del área de dibujo (100 × 120), para que no se corten colas, gorros ni brazos levantados.
- En la app usá `overflow: visible`, como hoy.
- Para generar cualquier combinación nueva: abrí la hoja en el navegador y corré `EmPersonajes.toSVG({ sp: 'gato', pose: 'salto', ... })` en la consola.

## 4. Cómo leer `fuente/personajes.js`

**Portá solo el estilo `fiel`** (= 1a Pulido). Todo lo que dependa de `style === 'suave' | 'sticker' | 'linea'` se borra:
- los degradés (`grad`, `blush`);
- las capas `border` y `outline`;
- la escala 1,06 de la cabeza del sticker;
- la sombra plana.

### 4.1 Nodos
Cada pieza es un nodo `{ t, a, f, s, sw, op, tr, … }`. Los helpers son: `E` (elipse), `C` (círculo), `R` (rect), `PG` (polígono), `PA` (path relleno), `ST` (trazo), `RING` (anillo) y `G` (grupo).

**Colores (`f` y `s`):** pueden ser un hex o un **token**:
- `m` (principal), `l` (claro), `d` (oscuro / detalle), `b` (pico y patas de las aves), `x` e `y` (extras de cada especie);
- `p`: las patas, `mix(l, m, .45)`;
- `eye` `#3C1E00`, `cheek` `#FF9EB5`, `ink` `#23263A`, `w` (blanco) y `tongue` `#FF7A8A`.

**Marcas que no se dibujan:**

| Marca | Para qué sirve |
|---|---|
| `belly` | La pieza se oculta con ropa. |
| `arm: 'L' \| 'R'` | Brazo o ala: se mueve en las poses. |
| `piv` | Pivote de un grupo-ala (cóndor). |
| `mv` | Se corre en ¾ (los ojos de la rana). |
| `sil` / `allSil` | Silueta. Solo la usaba el sticker: se puede ignorar. |

### 4.2 Esqueleto de cada especie: `SP[sp]()`
Cada especie devuelve:
- `c`: sus colores naturales.
- `A`: sus puntos de anclaje (tabla de abajo).
- Sus listas de piezas: `back` (detrás de todo: colas, orejas de atrás, alas del cóndor), `body`, `natBody` (marcas propias del cuerpo, recortadas al cuerpo), `deco` (la manta de la llama, que se oculta con ropa), `bodyTop` (cuellos largos, la gola del cóndor), `head`, `natHead` (marcas propias de la cabeza, recortadas a la cabeza) y `front` (hocico, pico, panza delantera).
- Opcionales: `headClip` y `bodyClip`.

| Ancla | Significado |
|---|---|
| `T` | Borde de arriba de la cabeza (donde apoyan gorros y pelo). |
| `hw`, `hc` | Medio ancho de la cabeza y su centro en `y` (la cabeza estándar es r 32 en 50,48). |
| `eyeY`, `eyeDX` | Altura de los ojos y su distancia al centro. Con `eyeDX < 8` los ojos son un 22 % más chicos; `eyeScale` es un ajuste fino. |
| `mouthY`, `mouthW` | Boca. Con `beak`, la boca va en el pico. Con `noMouth`, no se dibuja boca. |
| `cheekY`, `cheekDX`, `cheekR` | Cachetes. |
| `neckY`, `nw` | Altura del cuello y su ancho (escala los accesorios del cuello). |
| `hb` | Base de la cabeza: pivote de la inclinación en las poses. |
| `body: [cy, rx, ry]` | Elipse del cuerpo (la estándar es 89, 22, 19). |
| `hand: [x, y]` | Dónde va el objeto de la mano (la estándar es 73, 86). |
| `arms: [dx, cy]` | Hombros: los usan las mangas. |
| `skin`, `eyeWhite`, `eyeRing`, `neckUnder`, `hugY` | Tono de la piel alrededor del ojo, ojos con blanco (rana), anillo del ojo (tero), hocico delante del cuello (oso) y altura de la corona abrazada. |

### 4.3 Orden de capas (de atrás hacia adelante)
1. Sombra del piso.
2. `back`.
3. `body`, sin las piezas `belly` si lleva ropa.
4. `deco`, solo sin ropa.
5. **Capa del cuerpo** (`natBody`, marcas, ropa y sombra suave de la cabeza), recortada al cuerpo.
6. Mangas.
7. `bodyTop`, sin `belly` si lleva ropa.
8. Cuello (si es `neckUnder`) y corona abrazada (si es `neckUnder`).
9. **Cabeza:** `head`, la capa de la cabeza (`natHead` y marcas, recortadas a la cabeza), `front`, la cara, el accesorio de cara, el pelo y el de cabeza.
10. Cuello y corona abrazada, en el resto de las especies.
11. Objeto de la mano.
12. `prop`.

**Transformaciones:**
- Los accesorios de cabeza y el pelo se dibujan para la cabeza estándar y se adaptan con `translate(50 T) scale(hw/32) translate(-50 -16)`.
- Las marcas de la cabeza y del cuerpo se adaptan igual, a `hc` y `hw` o a `body`.
- Los del cuello se escalan con `nw/21` (de 0,6 a 1).

### 4.4 La cara
- **Cachetes:** r `cheekR` (4), al 75 %.
- **Ojos:** r 3,7, multiplicado por:
  - 1,28 con `grandes`;
  - 1,12 con `brillo` o con la cara `wow`.
- **Brillo:** r 0,3 del ojo, en (+0,36 r, −0,4 r).
- **Opciones de ojos:** `pestanas` agrega pestañas, `dormilon` el párpado, `almendra` ojos en elipse y `brillo` una estrella.
- **Caras:** `joy` (ojos arco hacia arriba y boca abierta), `sleep` (ojos arco hacia abajo y «z»), `wink` y `wow`, como hoy.
- Las marcas `pecas`, `antifaz` y `parche` van con la cara.

## 5. Modelo de datos (`packages/shared/src/accounts.ts`)

```ts
export const AVATAR_SPECIES = ['carpincho', 'hornero', 'pinguino', 'zorro', 'rana', 'llama', 'pelusa', 'nioqui',
  'yaguarete', 'tero', 'mulita', 'condor', 'nandu', 'oso', 'vizcacha', 'perro', 'gato'] as const;
export const AVATAR_EYES = ['redondos', 'grandes', 'almendra', 'pestanas', 'dormilon', 'brillo'] as const;
export const AVATAR_HAIR = ['copete', 'jopo', 'rulos', 'cresta', 'pluma', 'flequillo'] as const;
export const AVATAR_MARKS = ['manchas', 'rayas', 'pecas', 'antifaz', 'parche'] as const;
export const AVATAR_OUTFITS = ['remera', 'camiseta', 'rayada', 'buzo'] as const;
export const AVATAR_HEADWEAR = ['boina', 'gorra', 'gorro', 'vincha', 'auriculares', 'mono', 'sombrero'] as const;
export const AVATAR_FACEWEAR = ['anteojos', 'lentes', 'curita', 'pintura'] as const;
export const AVATAR_NECKWEAR = ['bufanda', 'panuelo', 'monito', 'collar'] as const;
export const AVATAR_HELD = ['mate', 'pelota', 'celu', 'termo', 'banderin'] as const;

type PaletteColor = Exclude<AvatarColor, 'natural'>;
export interface Avatar {
  species: AvatarSpecies;
  color: AvatarColor;
  /** v1 single accessory. Still read: mapped to its zone when the zone field is absent. New saves write null. */
  accessory: AvatarAccessory | null;
  detail?: PaletteColor | null;      // null/absent = the species' own dark tone
  eyes?: AvatarEyes;                 // absent = 'redondos'
  hair?: AvatarHair | null;
  marks?: AvatarMarks | null;
  outfit?: AvatarOutfit | null;
  outfitColor?: PaletteColor;        // absent = 'azul'
  number?: number;                   // 0–99, only shown on 'camiseta'; absent = 10
  head?: AvatarHeadwear | null;
  face?: AvatarFacewear | null;
  neck?: AvatarNeckwear | null;
  hand?: AvatarHeld | null;
  background?: PaletteColor;         // badge background; absent = brand light #E6EAFF
}
```

**`parseAvatar`:**
- Sigue aceptando la forma de 3 campos.
- Si un campo opcional falta, vale su valor de base.
- Si está pero es inválido, devuelve `null`, como hoy.
- Sumá pruebas para la forma vieja, la nueva y valores inválidos.

**Del `accessory` viejo a las zonas:**
- `boina` y `gorra` van a `head`;
- `anteojos` va a `face`;
- `bufanda` va a `neck`;
- `mate` va a `hand`.

**La corona** no se guarda: `CrownCelebration` y el ranking la agregan solos.

`DEFAULT_AVATAR` queda igual.

## 6. Opciones (cómo se dibujan)

| Grupo | Valores | Reglas |
|---|---|---|
| `detail` | 7 colores | Reemplaza el token `d`: orejas, alas, patas oscuras, marcas, pelo. |
| `eyes` | ver §4.4 | |
| `hair` | copete, jopo, rulos, cresta, pluma, flequillo | Se pinta con `d`. **Boina, gorra, gorro, sombrero y corona tapan el pelo**, salvo el flequillo. Vincha, auriculares y moño lo dejan ver. |
| `marks` | manchas, rayas, pecas, antifaz, parche | Manchas y rayas van en la cabeza y el cuerpo, recortadas a cada uno. Pecas, antifaz y parche van con la cara. |
| `outfit` | remera, camiseta, rayada, buzo | Tapa la panza (las piezas `belly`). Suma mangas cortas en los hombros (`arms`). El buzo cubre los brazos enteros. En la llama reemplaza la manta. El número de la camiseta va en Outfit 800 de 14, en blanco o tinta según la luminancia del color. |
| `head` | boina, gorra, gorro, vincha, auriculares, moño, sombrero | Más la corona automática, que reemplaza lo que haya en la cabeza. |
| `face` | anteojos, lentes (de sol), curita, pintura | Pintura usa el color de la ropa. |
| `neck` | bufanda, pañuelo, moñito, collar | En el oso, el hocico queda delante. |
| `hand` | mate, pelota, celu, termo, banderín | Va en `A.hand`. **Los props de las mascotas** (`letra`, `pregunta`, `rayo`, `bandera`, `tubo`) siguen saliendo como hoy: **`letra` y `pregunta` no están en `personajes.js`, así que dejá los de `Personaje.tsx` tal cual.** |

## 7. Vistas, poses y avatar redondo

**Props nuevas** (los nombres en inglés son una propuesta):
- `view?: 'front' | 'threeQuarter'`;
- `facing?: 'left' | 'right'` (hacia qué lado de la pantalla mira);
- `pose?: 'idle' | 'wave' | 'cheer' | 'jump' | 'hugCrown' | 'sleep'`;
- `badge?: boolean` y `badgeColor?: PaletteColor`.

### 7.1 Tres cuartos (`turn` = +1 a la derecha, −1 a la izquierda)
- Los ojos se juntan: `eyeDX − 1,6`.
- `front`, la cara y el accesorio de cara se corren **5,5 × turn**. Lo mismo las piezas `mv` (los ojos de la rana).
- Pelo, accesorio de cabeza y de cuello, y la capa del cuerpo (marcas y ropa) se corren **2,5 × turn**.
- La panza se corre **3 × turn**.
- La cola, las orejas de atrás y la silueta no se mueven.

### 7.2 Poses
**Inclinación de la cabeza:** `rotate(tilt, 50, hb)`, con:
- saludo +4°;
- festejo −5°;
- salto −4°;
- corona +5°;
- dormido +7°.

**Cara:** en festejo, salto y corona, la cara de base es `joy`. En dormido, es `sleep`.

| Pose | Qué cambia |
|---|---|
| `wave` (saludo) | Solo el brazo `L` (el de la izquierda de la pantalla): centro (−6, −17) y `rotate(−30)` sobre el centro nuevo. Si es un grupo-ala (cóndor): `rotate(+135, piv)`. |
| `cheer` (festejo) | Los dos brazos, igual que el saludo: `R` va con (+6, −17) y `rotate(+30)`, y su ala con `rotate(−135, piv)`. `A.hand` pasa a (+5, −30), así el objeto sube con la mano. |
| `jump` (salto) | Como el festejo, con **todo el cuerpo en `translate(0, −10)`** salvo la sombra. La sombra pasa a `E(50, 116, 16, 2,6)` al 7 %. |
| `hugCrown` (corona) | Ver el detalle abajo. |
| `sleep` (dormido) | Cara `sleep`. En el ranking: fondo gris, opacidad 45 % y borde punteado `#B8BDD6` de 2 px. |

**`hugCrown` (corona), en detalle:**
- Sin corona en la cabeza y sin objeto en la mano.
- La corona se dibuja a la altura `cy = A.hugY ?? body.cy + 4` (pelusa 90, ñoqui 88, llama 101):
  - **Puntas:** polígono `32,cy+5 32,cy−9 41,cy−1 50,cy−15 59,cy−1 68,cy−9 68,cy+5`, en `#FFC53D`, con bolitas en las puntas.
  - **Banda:** `R(31, cy+3, 38, 9, rx 3)` en `#FFC53D`, con una franja de `#E09A1A`.
  - **Gemas:** coral, azul, verde y rosa.
- Los brazos van **delante** de la corona: centro (50 ± 16, cy + 3), rx 6, ry 10 y `rotate(±40)` (el `L` en −40).
- Las alas del cóndor van con `rotate(±18, piv)`.
- La llama no tiene brazos: la corona queda parada adelante, apoyada en el piso.

### 7.3 Avatar redondo
- `top = T − 12`, `s = neckY + 24 − top`.
- **Círculo:** centro (50, top + s/2), r = s/2 − 1. Se rellena con el **claro** de la paleta (`background`) o `#E6EAFF` si no hay fondo.
- **Recorte:** el círculo, más un rectángulo arriba del centro (`x 50−s`, `y top−30`, `w 2s`, `h s/2+30`). Así orejas, crestas y gorros se salen por arriba, y abajo y a los costados se recorta.
- `viewBox = (50 − s/2) top s s`, sin sombra del piso.

## 8. Lo que ya está guardado se ve igual

En las 8 especies de hoy solo cambian detalles mínimos:
- Ojos de r 3,7 (antes 3,6) y brillo proporcional.
- Una sombra suave bajo la cabeza: elipse en (50, hb + 1,5), rx `hw × 0,52`, ry 3,6, tinta al 8 %, recortada al cuerpo.
- **La cola del hornero:** antes era `30,98 10,108 30,106` y ahora `38,94 9,107 40,104`, que nace detrás del cuerpo.

**Mismo color, mismo bicho, mismo accesorio**: el accesorio viejo se mapea a su zona.

## 9. Dónde va cada pose (propuesta, ver `pantallas/03`)

| Pantalla | Hoy | Propuesta |
|---|---|---|
| `HomeScreen` (personaje grande) | `face`, `anim="bob"` | `pose="wave"` |
| `CrownCelebration` | `acc` con `"corona"`, `joy`, 170 | `pose="hugCrown"`, sin `"corona"` en `acc` |
| Podio (`Ranking`, `LargadaResult`) | De frente | 1º `pose="jump"`. 2º y 3º en `view="threeQuarter"`, mirando hacia el 1º: el 2º (a la izquierda) con `facing="right"` y el 3º con `facing="left"` |
| `PlaceFlow` (festejo del puesto) | `joy`, 150 | `pose="cheer"` |
| Récord nuevo / nivel superado (`tubitos/LevelWin`, resultados con récord) | `resultFace` | `pose="jump"` |
| `RestingGame` | `face="sleep"` | `pose="sleep"` |
| Filas del ranking, `BattlePodium`, grupos, chips y `battle/parts` | Cuerpo entero de 22 a 36 px | `badge` con `badgeColor` del jugador |
| Quien todavía no jugó hoy | — | `badge` + `pose="sleep"` en gris, al 45 %, con borde punteado |
| El resto (perfil, editor, listas) | De frente | Sin cambios |

## 10. Plan de implementación

1. **`packages/shared`:** las listas y el `Avatar` nuevos, `parseAvatar` y sus pruebas (§5).
2. **`Personaje.tsx`:** portá de `personajes.js` (solo `fiel`) los esqueletos, las opciones, las vistas, las poses y el avatar.
   - Mantené las props de hoy y sumá las nuevas.
   - Conviene separar el esqueleto en datos (`species.ts`) y las piezas en funciones puras, con pruebas: que cada especie, en cada pose y vista, dibuje sin errores; y que el «tres cuartos» corra la cara.
3. **`avatar.ts`:**
   - `SPECIES_NAMES` para las 17 (ver `datos/especies.json`).
   - Que `avatarLook()` devuelva las props nuevas y mapee el `accessory` viejo a su zona.
   - Una función `badgeLook()` para las filas.
4. **Pantallas:** aplicá la tabla de §9.
5. **Revisión visual:** una ruta solo de desarrollo (por ejemplo `/dev/personajes`) que dibuje la misma grilla que `pantallas/01`, más los 8 de `datos/avatares-ejemplo.json`. Se compara a ojo con los SVG de `svg/`.
6. **Documentación** (como pide `CLAUDE.md`):
   - la entrada en `docs/BITACORA.md`;
   - las decisiones en `docs/PLAN.md`;
   - los cambios en `docs/diseno/CAMBIOS-AL-DISENO.md`.

## 11. Fuera de este paquete y decisiones abiertas

- **El editor de personaje** (4 pestañas: Bicho, Cara, Ropa y Accesorios, más «Al azar») se diseñó pero **no va en este paquete**. Hasta que exista, los campos nuevos no se pueden elegir. Se pueden implementar los datos y el dibujo ahora, y el editor después.
- **Los nombres de las props** (`pose`, `view`, `facing`, `badge`) son una propuesta: usá la convención del repo.
- **Qué pose usa cada pantalla** (§9) es una propuesta para confirmar con producto.
- **Animaciones** (opcional):
  - pasar de quieto a festejo en 300 ms con el «pop» de la app;
  - el salto como `translateY(−10 → 0)` con rebote;
  - todo apagado con `prefers-reduced-motion`.

## 12. Criterios de aceptación

- [ ] Las 17 especies se dibujan como en `pantallas/01` y en `svg/especies/*/01-frente.svg`. Las colas nacen detrás del cuerpo.
- [ ] Un avatar guardado con la forma vieja se ve igual que antes, salvo la cola del hornero.
- [ ] Cada opción de §6 se ve como su SVG en `svg/opciones/`. Gorros que tapan el pelo, ropa que tapa la panza (y la manta de la llama) y el hocico del oso delante del cuello funcionan.
- [ ] El tres cuartos funciona hacia los dos lados en todas las especies, con y sin accesorios.
- [ ] Las 6 poses coinciden con su columna de la hoja. Con `hugCrown` no hay corona en la cabeza ni objeto en la mano. En el salto, la sombra queda en el piso.
- [ ] El avatar redondo recorta abajo y a los costados, deja salir orejas y gorros por arriba y usa el fondo elegido.
- [ ] `largada/Car.tsx` (`frame`), las mascotas con `prop` y `scarf` siguen funcionando.
- [ ] `parseAvatar` acepta la forma vieja y la nueva, y rechaza valores inválidos. Las pruebas pasan.
