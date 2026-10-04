# Editor de personaje · 1a «Vitrina fija»

Esta spec sirve para rehacer la pantalla de **crear cuenta** y la de **editar personaje** con el editor nuevo, que permite elegir todo lo de Personajes 2.0.

- **Repo:** `LiPeSolutions/el-mejor-de`, rama `claude/adoring-bardeen-19q4va`.
- **Dirección elegida:** **1a «Vitrina fija»**. El personaje queda fijo arriba, en la tarjeta azul de siempre. Debajo hay un cajón blanco que se desplaza solo, con todas las opciones en una lista y cinco pestañas.
- **Ya está hecho:** el dibujo y los datos de Personajes 2.0 (`draw.ts`, `avatarLook`, `badgeLook`, `AVATAR_*` y `parseAvatar`). Este paquete no cambia el modelo de datos.

---

## 1. Qué problema resuelve

- **Hoy** el personaje está arriba y las opciones abajo: cuando bajás a elegir, dejás de verlo.
- **Con las opciones nuevas** la lista sería el triple de larga: cara, ropa, cuatro zonas de accesorios y fondo.
- **Los cambios:**
  - el personaje queda siempre a la vista;
  - cada opción se muestra puesta en tu propio personaje;
  - crear la cuenta empieza por el personaje.

## 2. Qué hay en este zip

| Ruta | Qué es |
|---|---|
| `EDITOR.md` | Este documento. |
| `pantallas/01-crear-paso1-bicho.png` | Crear, paso 1, arriba de todo (pestaña Bicho). |
| `pantallas/02-crear-paso1-cara.png` | Crear, paso 1, más abajo en la lista (pestaña Cara). |
| `pantallas/03-crear-paso2-datos.png` | Crear, paso 2: apodo, contraseña y El o La. |
| `pantallas/04-editar-ropa.png` | Editar, con el chip «Guardado» y El / La en la tarjeta. |
| `pantallas/05-cajon-completo.png` | **El cajón entero, sección por sección.** Es la referencia de orden, celdas y recortes. |
| `pantallas/06-chip-de-guardado.png` | Los 4 estados del chip de editar. |
| `fuente/Editor de personaje.dc.html` | La fuente del diseño. Se abre en el navegador con la carpeta `fuente/` completa. La 1a está en «turno 1» y el cajón completo en «turno 2». Las 1b y 1c son las propuestas descartadas. |

Las medidas de esta spec son para 390 × 844, que es la base de diseño.

## 3. Flujo

### Crear cuenta (`/cuenta/personaje`)

| Paso | Pantalla | Chip del encabezado |
|---|---|---|
| 1 | **Tu personaje**: el editor, con «Seguir». | `Paso 1 de 3` |
| 2 | **Apodo y contraseña**: apodo, contraseña, El o La y «Crear mi cuenta». | `Paso 2 de 3` |
| 3 | **Tu lugar** (`PlaceFlow`, sin cambios). | `Paso 3 de 3` |

- **Si entrás por un grupo** (`back` empieza con `/g/`), no hay paso de lugar. Los chips son `Paso 1 de 2` y `Paso 2 de 2`.
- **`PlaceFlow.tsx`, línea ~174:** cambiá `"Paso 2 de 2"` por `"Paso 3 de 3"`.
- **Los dos pasos van en la misma ruta y el mismo componente,** con un estado `step`. Así el personaje no se pierde.
- **Botón Volver:**
  - En el paso 2, la flecha vuelve al paso 1 sin perder nada.
  - En el paso 1, hace lo de hoy: `router.back()` o `back`.
- **Opcional:** que el botón atrás del sistema también vuelva al paso 1, por ejemplo con `window.history.pushState` y el evento `popstate`. Si se complica, alcanza con la flecha.
- **El personaje inicial** es un bicho al azar de los 17, en color natural y sin nada puesto: `{ species, color: "natural", accessory: null }`. `DEFAULT_AVATAR` no cambia, porque se usa en otros lados.
- **En el paso 1 no se valida nada:** cualquier personaje sirve. Las validaciones de hoy (apodo, disponibilidad, contraseña y artículo) quedan iguales, en el paso 2.

### Editar personaje (`/cuenta/personaje?editar=1`)

- **Es una sola pantalla:** el editor, con el nombre y El / La en la tarjeta.
- **No tiene botón de guardar:** cada cambio se guarda solo (§8).
- `SignedOut` queda como está.

## 4. La pantalla del editor

De arriba hacia abajo:

**1. Encabezado.** Va a 66 px de arriba (debajo de la barra de estado), como hoy:
- `IconButton` Volver, de 38 px;
- a la derecha, el chip: `Paso 1 de 3` al crear, o el chip de guardado al editar (§8).

**2. Tarjeta del personaje (fija).** Es el `CharacterHero` de hoy, que no se desplaza nunca.
- Medidas: margen de 14 px arriba y 20 px a los costados, alto de 206 px, `rounded-hero`, `bg-hero-brand`, `bg-hero-glow`, `shadow-hero` y la nube abajo a la derecha.
- **A la derecha,** el personaje de 150 px con `anim="bob"`, apoyado en el borde de abajo. Lleva `title` («Tu personaje» o «El personaje de feli»).
- **A la izquierda, al crear:**
  - «TU PERSONAJE» en 12 px 700, en mayúsculas;
  - «Así te van / a ver» en Outfit 27 800;
  - los botones (ver abajo).
- **A la izquierda, al editar:**
  - el apodo en Outfit 30 800 (22 si tiene más de 10 letras, como hoy);
  - El / La (ver abajo);
  - los botones.
- **El / La (solo al editar):**
  - Es un segmentado blanco al 22 % con dos opciones, `El` y `La`, de 38 px de alto, en Outfit 14 800. La elegida va en blanco con texto `brand`.
  - Al lado, «Mejor de…» en Outfit 14 800, así se lee la frase completa: «El Mejor de…».
  - Es un `radiogroup` con el nombre «Cómo te nombramos».
- **Botones:**
  - «Al azar»: píldora de 44 px con el ícono `Shuffle`, blanca al 22 %, en 13 px 800.
  - Deshacer: botón redondo de 44 px con `Undo2`. Lleva `aria-label="Deshacer"`.
  - Deshacer se apaga (opacidad 45 %, `disabled`) cuando no hay nada que deshacer.

**3. Cajón (lo único que se desplaza).**
- Es blanco, con `rounded-t-[28px]`, sombra `0 -10px 30px rgba(35,38,58,.08)` y 16 px de margen arriba. Llega hasta el borde de abajo de la pantalla.
- **Pestañas fijas arriba del cajón:**
  - Un segmentado de 5 en `surface-2` (`#F1F2FA`), con 4 px de relleno. Cada pestaña mide 36 px (más el relleno, 44 px de zona de toque) y va en 13 px 700.
  - La activa va en `brand`, con texto blanco 800 y sombra `0 6px 14px rgba(79,107,255,.35)`.
  - Las pestañas son: **Bicho · Cara · Ropa · Accesorios · Fondo**.
- **La lista:**
  - Todas las secciones de §5 van en una sola columna con scroll propio (`overflow-y: auto`, `overscroll-behavior: contain`).
  - Relleno de 16 px arriba y 20 px a los costados. Hay 22 px entre secciones.
  - Al empezar cada pestaña va un título en Outfit 17 800, con una línea `#EDEFF8` arriba (ver `pantallas/05`).
- **Abajo, solo al crear:** «Seguir ›».
  - Es el `Button` de 56 px, fijo sobre la lista, con un degradé blanco de 32 px arriba.
  - La lista suma ese alto de relleno abajo, así la última fila sube por encima del botón.
- **Al editar** no hay botón: la lista llega hasta abajo, con un degradé blanco de 64 px.

**Alto de la pantalla.**
- La pantalla mide exactamente `100dvh`: el cajón ocupa lo que sobra y scrollea por dentro.
- `Screen` hoy usa `min-h-dvh`. Sumale una variante (por ejemplo `fill`) con `h-dvh`, sin relleno abajo, que deje el `safe-area-inset-bottom` al cajón.

### 4.1 Pestañas que siguen al scroll
- **Al tocar una pestaña,** la lista se desplaza hasta el título de esa pestaña con `container.scrollTo({ top, behavior: "smooth" })` (instantáneo con `prefers-reduced-motion`).
- **Al desplazarse,** se marca sola la pestaña cuya sección cruza la parte de arriba de la lista. Usá `IntersectionObserver` con `root` en el contenedor.
- **Mientras dura un scroll pedido por toque,** el observador no cambia la pestaña, así no parpadea.
- **El indicador** se corre entre pestañas en 200 ms (`ease-out`).
- **Semántica:** es una barra de navegación, no un `tablist`, porque todo está en la misma lista. Usá botones con `aria-current` en la activa.

### 4.2 Paso 2: Apodo y contraseña (`pantallas/03`)
- Es la pantalla de hoy, **sin el selector de personaje**:
  - la tarjeta (176 px de alto, personaje de 140);
  - `TextField` «Tu apodo»;
  - `PasswordField`;
  - `ArticleChoice`;
  - el `Button` «Crear mi cuenta ›»;
  - «Sin email ni datos personales.».
- La tarjeta ya muestra el personaje armado y el apodo mientras se escribe, como hoy.
- **No lleva Al azar ni Deshacer.**

## 5. Secciones del cajón (en orden)

Cada celda es **tu personaje con esa opción**. «Recorte» es la prop nueva `crop` (§9.1). «Sin» indica lo que se saca solo en esa celda, para que se vea la opción.

| Pestaña | Sección | Opciones, en orden | Celda | Columnas |
|---|---|---|---|---|
| Bicho | Elegí tu bicho | Las 17 de `AVATAR_SPECIES`, con su nombre (`SPECIES_NAMES`; «Oso horm.» en la celda) | Cuerpo entero, 40 px, con tu color y tu detalle, sin accesorios | 5 · alto 58 |
| | Color del cuerpo | Natural + los 7 de la paleta | Círculo de 34 px: `swatchColor(color, species)` | 8 en fila |
| | Color de detalle | Igual (`null`) + los 7 | 34 px. «Igual» va partido en diagonal: el principal y el oscuro de la especie | 8 en fila |
| Cara | Ojos | `AVATAR_EYES` | `crop="head"`, 62 px, sin accesorio de cara | 4 · alto 76 |
| | Pelo | Nada + `AVATAR_HAIR` | `crop="head"`, 62 px, sin accesorio de cabeza | 4 · alto 76 |
| | Marcas | Ninguna + `AVATAR_MARKS` | `crop="bust"`, 62 px | 4 · alto 76 |
| Ropa | Ropa | Nada + `AVATAR_OUTFITS` | Cuerpo entero, 46 px, sin lo de la mano | 5 · alto 68 |
| | Color de la ropa | Los 7 (por defecto, azul) | 34 px | 7, con 13 px entre cada uno |
| | Número | Stepper de 0 a 99 (`AVATAR_NUMBER`) | Píldora `surface-2` de 48 px, botones `−` y `+` blancos de 40 px y el número en Outfit 22 800 tabular | — |
| Accesorios | Cabeza | Nada + `AVATAR_HEADWEAR` | `crop="head"`, 62 px | 4 · alto 76 |
| | Cara | Nada + `AVATAR_FACEWEAR` | `crop="head"`, 62 px | 4 · alto 76 |
| | Cuello | Nada + `AVATAR_NECKWEAR` | `crop="bust"`, 62 px | 4 · alto 76 |
| | Mano | Nada + `AVATAR_HELD` | Cuerpo entero, 50 px | 4 · alto 76 |
| Fondo | Fondo del avatar | Celeste (`background` sin valor, `#E6EAFF`) + los 7 en su tono claro | 34 px | 8 en fila |
| | Así te ven en el ranking | Una fila de ranking de muestra: puesto, `badgeLook` de 34 px, apodo con «vos» y puntaje | Sobre un recuadro con el degradé del cielo | — |

**Cuándo se ven:**
- **Color de la ropa:** con ropa (`outfit` distinto de `null`) o con la cara pintada (`face === "pintura"`), porque la pintura usa ese color.
- **Número:** solo con `camiseta`.
- **El resto** se ve siempre.
- Cuando una sección aparece o desaparece, se abre o se cierra en 200 ms, sin saltos en la lista.

**Etiquetas de las celdas** (10 px, en una línea):
- «Nada» y «Ninguna»;
- «Auricul.» para auriculares, «De sol» para lentes y «Pintada» para pintura;
- el resto, con su nombre con tildes: Pestañas, Dormilón, Moño, Pañuelo, Moñito, Banderín.

**Encabezado de cada sección:**
- a la izquierda, el nombre en 11 px 700, en mayúsculas, con `tracking .06em` y `ink-500`;
- a la derecha, el valor elegido en 12 px 800 `brand` («Hornero», «Redondos», «Nada»).

**Aviso «gorro y pelo» (en Pelo, `pantallas/05`):**
- **Cuándo:** con `boina`, `gorra`, `gorro` o `sombrero` puestos (los de `COVERS_HAIR`).
- **Qué dice:** «La boina tapa el pelo.» (con el nombre del gorro), más un botón blanco de 34 px, «Sacar la boina», que pone `head: null`.
- **Estilo:** fondo `#FFF3D6`, texto `#5A4300` en 12,5 px 700 y radio 14.
- **En las celdas de pelo** el gorro no se dibuja, así se ven todos.
- **El flequillo** se ve igual, con o sin gorro (es la regla del dibujo).

## 6. Las celdas

- **Base:** `Choices` de `fields.tsx` (radios escondidos y celdas como botones), con estos estilos:
  - **Sin elegir:** fondo `surface-2`, sin sombra, radio 16 (`rounded-row`).
  - **Elegida:** fondo `brand-100` (`#E6EAFF`) y anillo `0 0 0 2px brand`. La etiqueta pasa a `brand` 800.
  - **Foco:** `focus-visible`, con el anillo de 2 px `brand` y un desplazamiento de 2 px.
  - **Círculos de color:**
    - sin elegir, `inset 0 0 0 1px rgba(35,38,58,.1)`;
    - elegido, `0 0 0 3px #fff, 0 0 0 5px brand`, como hoy.
- **Accesibilidad:**
  - Cada grupo es un `fieldset` con su `legend`.
  - Cada celda lleva `aria-label` con el nombre de la opción. En los colores, el nombre del color.
- **Rendimiento:**
  - Son unas 90 celdas con un `Personaje` cada una, y todas cambian al cambiar el bicho o los colores.
  - Memoizá cada celda por `(avatar sin el campo de la sección, opción)`.
  - Si hace falta, dibujá solo las secciones cerca de la vista.

## 7. Al azar y Deshacer

- **Historial:** una pila de estados `{ avatar, article }` que dura lo que dura la pantalla. Cada cambio (una celda, un color, el número, El / La o Al azar) suma el estado anterior.
- **Deshacer** vuelve al anterior. Se apaga con la pila vacía. Al editar, deshacer también se guarda solo, así que se puede volver hasta como estaba al entrar.
- **El stepper del número** suma un solo paso al historial por cada ráfaga de toques (300 ms sin tocar).
- **Al azar** cambia todo de una (no toca El / La):
  - otro bicho que no sea el actual;
  - color natural la mitad de las veces;
  - detalle: `null` 6 de cada 10 veces;
  - ojos al azar;
  - pelo, marcas, ropa, cabeza, cara, cuello y mano: cada uno vacío la mitad de las veces;
  - color de la ropa y fondo, al azar;
  - número de 1 a 99.
  - Va en una función pura, `randomAvatar(rand = Math.random)`, con prueba: siempre devuelve un `Avatar` que pasa `parseAvatar`.

## 8. Editar: se guarda solo

- **Al entrar,** normalizá el `Avatar`: pasá el `accessory` viejo a su zona con `avatarWear` y dejá `accessory: null`. Desde ahí, cada guardado manda las zonas explícitas (`head`, `face`, `neck` y `hand`, con su valor o `null`).
- **Cada cambio** espera **600 ms** sin otro cambio y manda `accountApi.updateProfile({ avatar, article })`. Si sale bien, `saveAccount(updated)`.
- **Si llega otro cambio mientras se guarda,** se manda después. Nunca hay dos pedidos a la vez y el último gana.
- **Chip del encabezado** (`pantallas/06`; reemplaza al de «Editar personaje»):

| Estado | Chip | Cuándo |
|---|---|---|
| En reposo | «Editar personaje» | Al entrar, y 2 s después de guardar. |
| Guardando | Rueda de 16 px y «Guardando…» en `ink-700` | Desde el cambio hasta la respuesta. |
| Guardado | Círculo `success` con un check blanco y «Guardado» | Al responder bien. Dura 2 s. |
| Sin conexión | Círculo `danger` con una cruz blanca y «Sin conexión» en `danger` | Si falla. Se queda; tocarlo reintenta. También reintenta solo al volver la conexión (`online`). |

- **El chip** cambia con `animate-chip-in` y tiene `aria-live="polite"`.
- **Volver con un cambio pendiente:**
  - Se manda en el momento, sin esperar los 600 ms, y se sale cuando responde (hasta 3 s, mostrando «Guardando…»).
  - Si falla, no se sale: el chip queda en «Sin conexión» y aparece el toast rojo «No se guardó tu personaje». Un segundo toque en Volver sale igual.
- **Si el servidor dice que la sesión venció,** se hace lo mismo que hoy con `accountErrorText`.

## 9. Cambios de código

### 9.1 `Personaje`: prop nueva `crop`
`crop?: "head" | "bust"` recorta un cuadrado alrededor de la cabeza o de cabeza y hombros. Va en `draw.ts`, en la rama que no es `badge`. Sale de `fuente/personajes.js`, `draw()`:

```ts
// A = the species' anchors, as already computed in drawCharacter
const top = A.T - 15;
const bottom = crop === "bust" ? A.neckY + 16 : A.hc + A.hw + 6;
const s = Math.max(bottom - top, 2 * A.hw + 22);
viewBox = `${50 - s / 2} ${top - (s - (bottom - top)) / 2} ${s} ${s}`;
ratio = 1; // and no floor shadow
```

- Con `crop`, `size` es el lado del cuadrado.
- **Prueba:** que cada especie dé un `viewBox` cuadrado con la cabeza adentro.
- En `dev/personajes` sumá una fila con los dos recortes.

### 9.2 `CharacterForm.tsx`
Conviene separarlo así:
- **`CharacterEditor`:** la tarjeta, el cajón, las pestañas, el historial, Al azar y Deshacer. Recibe `avatar`, `onChange`, `name?`, `article?`, `onArticle?` (solo al editar) y `footer?` (el «Seguir» al crear).
- **`CreateAccount`:** guarda `step` (`"character"` o `"account"`), `avatar` y los campos del paso 2. El envío y los errores quedan como hoy.
- **`EditCharacter`:** el editor con el guardado automático (un hook `useAutosave`) y el chip.
- **Lo que se borra:** `CharacterPicker` y `ACCESSORY_NAMES`.
- **Nombres de las opciones:** un `OPTION_NAMES` por grupo en `avatar.ts`, junto a `SPECIES_NAMES` y `COLOR_NAMES`.

### 9.3 Otros
- **`Screen`:** la variante de alto fijo (§4).
- **`PlaceFlow`:** «Paso 3 de 3».
- **Docs** (como pide `CLAUDE.md`):
  - la entrada en `docs/BITACORA.md`;
  - la decisión en `docs/PLAN.md`;
  - el cambio en `docs/diseno/CAMBIOS-AL-DISENO.md`, que es la pantalla 18 nueva.

## 10. Movimiento

- **Al elegir algo,** el personaje de la tarjeta da un salto chico: `scale .94 → 1.04 → 1` en 300 ms, con la curva del «pop» (`cubic-bezier(.2,.9,.3,1.25)`). Va sobre un envoltorio, así no pisa el `bob`.
- **Al Al azar** le corresponde el mismo salto, con el ícono `Shuffle` girando media vuelta en 300 ms.
- **La celda elegida** marca el anillo en 150 ms.
- **Con `prefers-reduced-motion`** no hay salto, ni giro, ni scroll suave.

## 11. Pantallas bajas (`short:`, 800 px de alto o menos)

| | Normal | `short:` |
|---|---|---|
| Tarjeta | 206 px, personaje de 150 | 168 px, personaje de 124 |
| «Así te van a ver» | Outfit 27 | Outfit 24 |
| Margen arriba del cajón | 16 px | 10 px |
| Celdas de 76 px | 76 | 68, recorte de 56 |

El cajón siempre deja ver por lo menos dos filas de celdas arriba del «Seguir».

## 12. Casos borde

- **Avatar viejo** (bicho, color y accesorio): se ve igual y el accesorio aparece elegido en su zona.
- **Llama:** con ropa, la manta no se ve (regla del dibujo); en las celdas de Ropa se nota sola.
- **Cara pintada sin ropa:** aparece Color de la ropa, porque pinta la cara.
- **Corona:** no es una opción. Si el jugador la tiene, la tarjeta la muestra igual que hoy. En las celdas de Cabeza no se dibuja, así se ve cada gorro.
- **Apodo largo** en la tarjeta: 22 px, con corte por letra, como hoy.
- **Sin conexión al crear:** igual que hoy. El paso 1 no usa la red.

## 13. Criterios de aceptación

- [ ] Crear empieza en el editor (`Paso 1 de 3`) y «Seguir» pasa al paso 2 sin perder nada. La flecha del paso 2 vuelve al 1.
- [ ] La tarjeta no se mueve nunca. Solo scrollea el cajón y el personaje siempre queda a la vista.
- [ ] Las 5 pestañas llevan a su sección y se marcan solas al desplazarse.
- [ ] Están todas las secciones de §5, en orden, con sus recortes y lo que se saca en cada celda, como en `pantallas/05`.
- [ ] Color de la ropa y Número aparecen y desaparecen según §5. El aviso de gorro y pelo funciona.
- [ ] Al azar siempre da un `Avatar` válido. Deshacer vuelve de a un cambio y se apaga con la pila vacía.
- [ ] Editar no tiene botón de guardar. El chip pasa por sus 4 estados y Volver no pierde el último cambio.
- [ ] Lo guardado al editar ya no usa `accessory`: las zonas van explícitas.
- [ ] `crop="head"` y `crop="bust"` funcionan en las 17 especies, con prueba.
- [ ] Hay pantallas bajas y movimiento reducido, como en §10 y §11.
