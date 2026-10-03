# Largada v2 · contra todo el grupo

Esta es la spec para implementar el minijuego **Largada** (categoría Reflejos) de *El Mejor de*.

- **Repo:** `LiPeSolutions/el-mejor-de`, rama `claude/adoring-bardeen-19q4va`, app `apps/web`.
- **Dirección elegida:** "Estadio". La pista ocupa la pantalla y corrés contra los tiempos de hoy de tu grupo, con un carril por amigo.

## Qué hay en este zip

| Ruta | Qué es |
|---|---|
| `LARGADA.md` | Este documento. |
| `pantallas/01…06.png` | Las 6 pantallas a 2× (celular de 390 × 844). Son **la referencia visual**: copiá medidas, colores y textos de acá. |
| `assets/equipo/` | El auto (`auto-<nombre>.svg`, 302 × 82) y el casco (`casco-<nombre>.svg`, 38,4 × 27,6) de cada jugador del ejemplo, con su animal en el visor. |
| `assets/personajes/` | Los personajes del ejemplo (para el podio) y la mascota del juego (`rana-bandera.svg`). |
| `assets/autos/auto-fantasma.svg` | El auto en gris, por si se elige el modo "fantasmas en gris" (ver Decisiones). |
| `fuente-diseno/` | Los HTML del diseño, solo para sacar valores exactos. **No es código para copiar.** Toda la geometría de la pista está en `renderVals()` de `Pista.dc.html`. En `Largada nueva.dc.html` la secuencia es la opción **1a**. |

En la app, los personajes se dibujan con `components/personaje/Personaje.tsx` y los SVG de `assets/personajes` son solo de referencia. Los autos y cascos de `assets/equipo` se armaron a mano para el ejemplo. En la app, cada uno se compone así: el auto base del color del equipo (`auto-[color].svg`) más la cara del animal del jugador dentro del visor del casco. El casco del auto va en (125, 7,6).

---

## 1. El juego en 30 segundos

1. Se prenden las cinco luces rojas del pórtico, de a una.
2. Después de una espera al azar, **se apagan todas juntas**: esa es la señal.
3. Tocás en cualquier parte de la pantalla. Se mide tu tiempo de reacción.
4. Los autos de la parrilla salen cada uno con su tiempo real y llegan a la meta en ese orden.
5. Son **3 largadas**. El puntaje sale de tu **promedio**. Tu puesto contra el grupo es para el pique y para compartir.

Se ve de costado, estilo F1, y los autos avanzan de izquierda a derecha. Se juega de un solo toque y no hay que machacar: después de largar, los autos corren solos.

## 2. Reglas

### Lo que no cambia

- Reto diario igual para todos, con **un solo intento**. Es el reto 3 de 3 del ejemplo.
- **3 largadas.** Las esperas al azar salen de `view.delaysMs` (son las mismas para todos ese día). El tiempo máximo es `view.maxReactionMs`, como hoy en `ReflexesPlay.tsx`.
- **Puntaje (de 0 a 1.000):** `clamp(1000 − 2 × (promedio − 200), 0, 1000)`. 200 ms o menos da 1.000, 240 ms da 920 y 700 ms o más da 0.
- **Adelantarse** (tocar con alguna luz prendida): perdés esa largada y cuenta como **450 ms** para el promedio.
- **No tocar** antes de `maxReactionMs`: perdés la largada. Para el promedio se usa el valor que ya usa el código actual. Si no hay ninguno, usá 700 ms.
- La señal no depende solo del color: aparece el texto "¡LARGÁ!", hay vibración y humo.

### Lo que cambia respecto de la versión 1 contra 1

- **Rivales:** ya no hay un único fantasma. Corren los **amigos del grupo que ya jugaron hoy**, cada uno con sus 3 tiempos reales.
- **Empate:** si tenés el mismo tiempo que un rival, **comparten el puesto** y la largada no se repite.
- **Resultado:** cada largada da un **puesto** (1º a Nº). Al final hay un **podio del grupo** con los puntajes de hoy, la **foto de llegada** de tu mejor largada y, si corresponde, el aviso de la corona.

## 3. Rivales: quién corre

- **Grupo:** el último grupo que abrió el jugador. Si no tiene grupos, ver Casos borde.
- **Carriles:** hasta **5 en total**, contándote a vos. Si jugaron más de 4 amigos, se eligen en este orden:
  1. quien tiene la corona de la semana;
  2. los que están justo arriba y justo abajo tuyo en el ranking semanal del grupo;
  3. los más rápidos de hoy.
- **Orden de arriba a abajo:** primero el de la corona y después según el ranking semanal. **Vos siempre vas en el carril de abajo**, que tiene el fondo resaltado en `rgba(79,107,255,.22)`.
- **Quien todavía no jugó** aparece en la pantalla 01 como un lugar vacío y punteado ("todavía no"), pero no tiene carril en la pista.
- **Lo que tiene que mandar la API por cada rival:** `userId`, `username`, el look del personaje (animal y colores), el color de su equipo, si tiene la corona y `rounds: { reactionMs: number | null; falseStart: boolean }[]` de la Largada de hoy.
- Las esperas (`delaysMs`) son las mismas para todos, así que los tiempos se pueden comparar.

## 4. Secuencia y tiempos

```
intro ─tap Empezar─▶ luces(1..5) ─espera delaysMs[i]─▶ señal ─tap─▶ carrera ─▶ resultadoLargada ─(2 s o tap)─▶ luces… ×3 ─▶ resultadoReto
        tap con luces prendidas ─▶ adelantada (largada perdida) ─▶ resultadoLargada
        sin tap en maxReactionMs ─▶ no largó (largada perdida) ─▶ resultadoLargada
```

| Paso | Tiempo |
|---|---|
| Se prende cada luz | Una cada **1.000 ms**. |
| Espera después de la 5ª | `delaysMs[i]`, entre 0,2 y 3 s. |
| Medición | Desde que la señal **se pinta** en pantalla (doble `requestAnimationFrame`, como en el código actual) hasta el `pointerdown`. |
| Carrera | ~**1,4 s** hasta que llega el primero (ver 6.4). |
| Resultado de la largada | La próxima arranca sola a los **2 s**, o antes si tocás. |

**Control:** toda la pantalla es el botón (`onPointerDown` en el contenedor). Los elementos con `data-no-tap` quedan afuera, como el botón de cerrar.

## 5. Pantallas (ver `pantallas/`)

Todas usan el fondo cielo `#C3DAF8 → #DAE1F6 → #E8EAF6` con nubes blancas, salvo la 02 (más oscura) y la 03 (turquesa). Durante el juego, la cabecera es: botón de cerrar (38 px) · "LARGADA" (13 px, 800, mayúsculas, turquesa oscuro) · un hueco a la derecha. El indicador de largadas va debajo de la pista.

### 01 · Antes de empezar
- Chip "Reto 3 de 3".
- Baldosa turquesa de 120 px de alto con la etiqueta "REFLEJOS", el título "Largada" y la mascota (`rana-bandera`) sobre un círculo claro.
- Texto: "Cuando se apaguen las cinco luces, tocá. Hoy corrés contra los tiempos que hizo tu grupo."
- Dos chips: "3 largadas" y "1.000 con 200 ms".
- **Parrilla de hoy**: una tarjeta asfalto `#3B4056` con el nombre del grupo. Tiene 6 boxes en 2 columnas escalonadas, como una grilla de F1: número de posición, casco, nombre y corona para quien la tiene. Tu box va en azul (`#4F6BFF` al 30%, borde `#8FA2FF`). Quien no jugó va punteado y con el texto "todavía no".
- Aviso dorado: "Tenés un solo intento. Si te adelantás, perdés esa largada."
- Botón "Empezar" turquesa de 74 px con brillo y, debajo, "Las luces arrancan cuando tocás".

### 02 · Se prenden las luces
- "Esperá…" (Outfit 800, 46 px) y "Tocá cuando se apaguen las cinco".
- **Pista de 512 px de alto** con 5 carriles de 72 px. Los autos esperan con la trompa en la línea de largada y el chip de nombre a la derecha (casco + nombre + corona).
- **Tensión:** cada luz que se prende **oscurece la escena un paso**. Hay una capa `rgba(16,18,32, 0.1 × luces)` sobre la pista y el cielo baja hacia `#9AAED4`. Las luces prendidas tienen halo y brillo (`0 0 27px rgba(226,80,76,.85)`). Con 4 o 5 luces, lo único que brilla es el pórtico.
- Indicador de largadas (la actual con borde y las otras punteadas) y el pie "Si tocás antes de que se apaguen, perdés la largada".

### 03 · ¡Largá!
- **La pantalla entera** se pone turquesa `#2EC4B6` y aparece "¡LARGÁ!" a 94 px.
- La tribuna se tiñe (`#A6EAE2` con rayas `#8DE1D7`), la **línea de largada se enciende** en turquesa con brillo y tu auto larga humo.
- Pie: "Toda la pantalla es el botón".

### 04 · Carrera
- Chip "2º de 5 · Juli salió antes" (la badge del puesto en azul) y tu tiempo grande: **231** ms.
- Los autos cruzan la pantalla con líneas de velocidad y cada uno lleva su etiqueta "Nombre · ms".
- Pie: "Los autos corren solos hasta la meta".

### 05 · Resultado de la largada
- "Llegaste 2º" y, debajo, "A 13 ms de Juli · le ganaste a Tincho, Caro y Sofi".
- Los autos **siguen de largo** pasando la meta y cada carril queda como **una fila de la tabla de llegada**: chip con el puesto, el casco, el nombre y los ms. El 1º va en dorado `#FFC53D`, vos en azul `#4F6BFF` y el resto en blanco.
- El indicador muestra "2º · 231 ms" (azul) y "Largada 2" (actual).
- Pie: "La próxima arranca sola en 2 s · tocá para seguir".

### 06 · Resultado del reto
- Chip "Reto 3 de 3 · Largada".
- **Arriba, en dos columnas:**
  - Izquierda: "¡Qué reflejos, Nico!", **920** (72 px), "de 1.000", la barra de puntaje y "Promedio 240 ms / Mejor largada 231 ms".
  - Derecha: la **foto de llegada** en formato polaroid (176 px de ancho, girada 4°). Es el último cuadro de tu mejor largada: los autos cruzando la meta, el ganador en dorado ("1º Vos") y cuánto le sacó al resto ("+6 ms", "+14 ms"…). Quien se adelantó lleva un chip rojo "Se adelantó". El pie dice "LARGADA 3" y "Vos 1º por 6 ms".
- **Podio del grupo de hoy**, con los puntajes de la Largada de hoy: personajes en 2º · 1º · 3º sobre escalones (el 1º en dorado) y, debajo, las fichas del 4º en adelante (casco, nombre, puntaje). Quien no jugó va punteado.
- **Franja de la corona** (solo si pasa): "¡Le sacaste la corona a Tincho!" y "Vas 1º en la semana por 30 · se define el domingo".
- Botones: "Contale al grupo" (verde WhatsApp `#25D366`) y "Ver resumen del día" (blanco).

## 6. Movimiento

### 6.1 Luces
- En cada luz: un golpe seco de sonido y `navigator.vibrate(15)` si está disponible. La luz pasa de `#4B5070` a `#E2504C` con el halo al 35%.
- Oscurecimiento progresivo: ver la pantalla 02. Transición de 150 ms.

### 6.2 Señal
- Las 5 luces se apagan en el mismo cuadro.
- El fondo pasa a turquesa en **0 ms**, sin transición, para no regalar reacción. La línea de largada brilla, sale humo de tu auto y se dispara `navigator.vibrate(40)`.

### 6.3 Pórtico
Caja tinta de 262 × 52 con radio 14, 5 luces de radio 17 separadas 48 px, centrada sobre la pista. La pista usa escala `k = 1,15` (ver `Pista.dc.html`).

### 6.4 Carrera
- Las diferencias reales son de pocos ms, así que **se exageran** para que se lean.
  - El primero arranca en `t = 0`.
  - Cada otro auto arranca `(r − rMin) × 6` ms después, con un máximo de 600 ms.
  - Todos usan la misma curva: `easeInQuad` durante **1.400 ms** desde la línea de largada (x = 192) hasta la meta (x = 362). Después siguen en línea recta.
  - Así, 13 ms de diferencia se ven como unos 19 px en la meta.
- **Adelantado:** el auto no sale y lleva un chip rojo "Se adelantó".
- **No largó:** sale con `maxReactionMs` y lleva el chip "No largó".
- Las líneas de velocidad aparecen cuando el auto empieza a moverse. La etiqueta "Nombre · ms" viaja arriba del auto.

### 6.5 Llegada
- Cuando llega el último, o a los 2,2 s, los autos salen por la derecha. Los chips de la tabla entran desde la izquierda, de a uno cada 60 ms y en orden de llegada.

### 6.6 Pantalla 06
- La polaroid entra con la animación `animate-pop` que ya existe.
- Los escalones del podio crecen desde 0, de a uno cada 120 ms.
- El puntaje cuenta hacia arriba con `AnimatedNumber`.
- La franja de la corona entra al final.

### 6.7 Movimiento reducido
Con `prefers-reduced-motion`, la carrera salta a las posiciones finales y no hay temblor ni conteo.

## 7. Chips de feedback (toast)

Se usan con `useToast` de `chrome.tsx`:

- Rojo `#E2504C` con una cruz: "Te adelantaste · largada perdida".
- Rojo con un reloj de arena: "Muy lento · largada perdida".
- Verde `#1FA093` con un rayo: "231 ms · ¡tu mejor largada!" (solo si mejora una anterior).
- Dorado `#FFC53D`: "Empate con Caro · comparten el 3º".

## 8. Lógica de la pantalla 06

- **Puntaje:** según la sección 2.
- **Podio:** los puntajes de la Largada de hoy de los miembros del grupo que jugaron, incluido vos. Empates de puntaje: gana el mejor promedio y, si sigue igual, quien jugó primero.
- **Foto de llegada:**
  - Se elige tu largada con **mejor puesto**. Si hay empate, la de menos ms.
  - Se dibuja el último cuadro de esa largada con la misma pista, a escala ~0,51, en la polaroid.
  - El pie dice "Largada N" y "Vos 1º por X ms" o, si no ganaste, "Vos 2º · a X ms de Juli".
- **Corona:** se muestra si, sumando los puntos de hoy, pasás a quien tiene la corona en el ranking semanal del grupo. Usá `lib/crown-watch` para que el aviso salga una sola vez. El texto sigue el de `CrownNotices` ("¡Le sacaste la corona a …!").
- **Compartir ("Contale al grupo"):**
  - Usá la Web Share API con la foto como archivo PNG si se puede. Si no, un link `wa.me` con el texto.
  - Texto: "Largada de hoy: 920 · 1º de Los del Chivi 🏁 ¿Me ganás?" (único lugar con emoji, solo dentro del mensaje compartido).

## 9. Casos borde

- **Nadie del grupo jugó todavía, o no tenés grupo:** corrés contra el mejor tiempo del día de tu localidad, como un fantasma con el auto gris (`auto-fantasma.svg`, opacidad 0,62) y el nombre "El mejor de Chivilcoy". El podio de la 06 se reemplaza por "Sos el primero del grupo hoy" y un botón para desafiar.
- **Menos de 5 carriles:** los carriles se agrandan y reparten la altura disponible, con un máximo de 96 px por carril y el auto escalado en proporción.
- **Un amigo todavía no jugó:** en la 06 aparece su ficha punteada. Si su promedio podría pasarte, se puede mostrar una tarjeta "Pato todavía no largó" con el botón "Desafiá a Pato" (variante en el archivo de diseño, opción 1c · 06).
- **Salir a mitad de juego:** usá `ExitDialog` de `chrome.tsx` (el reto cuenta como jugado con lo que llevás).
- **Práctica:** la misma pantalla, contra los fantasmas del grupo de ese día, sin sumar. Chip "Práctica · no cuenta para la corona".
- **Pantallas bajas** (`short:`, alto ≤ 800 px): carriles de 60 px, título de 38 px y sin el pie de texto.
- **Orientación horizontal:** no es parte de esta versión.

## 10. Estilo (tokens de `globals.css`)

- **Tinta** `#23263A`, texto secundario `#4B5070`, etiquetas `#6C7191` y azul de acción `#4F6BFF`.
- **Reflejos:** turquesa `#2EC4B6`, oscuro `#158A7F`, claro `#CFF3EE`. Éxito `#1FA093`, error `#E2504C`, dorado `#FFC53D` (suave `#FFF3D6`, tinta `#5A4300`).
- **Pista:** asfalto `#3B4056`, pasto `#6CCB6C`, muro `#B8BDD6`, pianos `#E2504C` / `#FFFFFF` en tramos de 16 px, gradas `#E8EAF6` con rayas `#D9DDF3`.
- **Tipografías:** Outfit 800 para títulos y números, Plus Jakarta Sans para el resto. Los ms siempre en **cifras tabulares**.
- **Formas:** píldoras y tarjetas blancas con radios de 16 a 28 px y sombras suaves teñidas (`shadow-sm/md/lg`).
- **Textos:** en español rioplatense con voseo ("Tocá", "Largá", "¿Me ganás?").

## 11. Dónde va en el código

- `apps/web/src/components/games/ReflexesPlay.tsx`: hoy es el juego de cambio de color. Reemplazalo por `LargadaPlay`, o hacé un componente nuevo con el mismo contrato (`view`, `onProgress`, `onFinish`, `onExit`) y el mismo `ReflexesLog` (`rounds: { reactionMs, falseStart }[]`).
- **Pista:** un componente propio (`LargadaTrack`) en SVG o divs absolutos, que reciba los carriles, la cantidad de luces prendidas, el estado (luces / señal / carrera / llegada) y el progreso. La geometría está en `fuente-diseno/Pista.dc.html`.
- **API:** el `StartView` de reflexes tiene que sumar el grupo y los fantasmas (ver sección 3), y el resultado tiene que sumar el podio y el cambio de corona.
- **Reutilizables:** `Screen`, `Chip`, `Button` (`size="start"`), `IconButton`, `useToast`/`FloatingToast`, `ExitDialog`, `AnimatedNumber`, `Personaje`, `crown-watch`.

## 12. Criterios de aceptación

- [ ] Las luces se prenden de a una cada 1 s y se apagan todas juntas después de `delaysMs[i]`.
- [ ] La escena se oscurece con cada luz. La señal pone toda la pantalla en turquesa, con el texto "¡LARGÁ!" y vibración.
- [ ] El tiempo se mide desde que la señal se pinta. Tocar con luces prendidas cuenta como adelantada (450 ms).
- [ ] Hay un carril por cada amigo que jugó hoy (máximo 5 con vos) y vos vas siempre abajo, resaltado.
- [ ] Los autos salen en el orden real de reacción, con la diferencia exagerada como en 6.4.
- [ ] La tabla de llegada muestra puesto, casco, nombre y ms, con el 1º en dorado y vos en azul.
- [ ] La 06 muestra el puntaje, la foto de llegada de tu mejor largada junto al podio, el podio del grupo y, si corresponde, la franja de la corona.
- [ ] "Contale al grupo" comparte la foto y el texto.
- [ ] Funciona con `prefers-reduced-motion` y en pantallas de 650 a 800 px de alto.

## 13. Decisiones abiertas

- **Color de los rivales:** cada uno con el auto de su equipo (como en las pantallas) o todos en gris fantasma. El diseño soporta las dos opciones.
- **Color del equipo propio:** ¿lo elige el jugador o sale del color de su personaje?
- **Más de un grupo:** ¿se elige el grupo en la pantalla 01 con un chip desplegable?
