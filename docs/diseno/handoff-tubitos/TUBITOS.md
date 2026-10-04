# Tubitos · ordenar colores en tubos

Esta es la spec para implementar el minijuego nuevo **Tubitos** (categoría Lógica) de *El Mejor de*. Es el clásico "water sort": pasar líquidos de colores de un tubo a otro hasta que cada tubo tenga un solo color.

- **Repo:** `LiPeSolutions/el-mejor-de`, rama `claude/adoring-bardeen-19q4va`, app `apps/web`.
- **Dirección elegida:** **1a "Probeta"**. Tubos de vidrio parados en gradillas blancas sobre el cielo de la app, un ícono por color, avisos en toast, píldoras de nivel y dos botones blancos abajo.
- Es un **juego nuevo, el quinto**. No reemplaza a ninguno (ver "Decisiones abiertas" por la rotación diaria).

## Qué hay en este zip

| Ruta | Qué es |
|---|---|
| `TUBITOS.md` | Este documento. |
| `pantallas/01…07.png` | Las pantallas del celular a 2× (390 × 844). Son **la referencia visual**: copiá medidas, colores y textos de acá. |
| `pantallas/08…09.png` | Las de tablet a 1× (820 × 1180, iPad vertical). |
| `pantallas/10-resultado-del-reto.png` | El resultado del reto (GameResultView con el detalle de Tubitos), a 2×. |
| `assets/mascota-pinguino-tubo.svg` | La mascota, solo de referencia. En la app sale de `Personaje.tsx` con un prop nuevo (ver 11.3). |
| `fuente-diseno/` | Los HTML del diseño, solo para sacar valores exactos. **No es código para copiar.** `Tubitos.dc.html` tiene las 3 direcciones y **la elegida es 1a**. Toda la geometría del tablero (posiciones, vertido, chorro) está en `buildBoard()`, en el script de ese archivo. El tubo es la rama "probeta" de `Tubo.dc.html`. Se abren en el navegador si la carpeta queda junta. |

Los íconos son de **lucide** (`lucide-react`, como en toda la app) y las tipografías son las del repo. No hace falta ningún archivo nuevo de imagen.

---

## 1. El juego en 30 segundos

1. Cada tubo tiene **hasta 4 capas** de colores apiladas.
2. Tocás un tubo para **levantarlo** y tocás otro para **pasarle** lo de arriba.
3. Solo se puede pasar **sobre el mismo color o a un tubo vacío**, y si hay lugar.
4. El nivel se completa cuando **cada tubo tiene un solo color** (o está vacío).
5. **Reto del día:** 3 niveles seguidos (6, 8 y 10 tubos) y un solo intento. **Practicar:** niveles sin fin.

Se juega 100 % con toques, con una mano. No hay arrastre.

## 2. Reglas

### Tablero
- Capacidad de **4 capas** por tubo. Al empezar, siempre hay **2 tubos vacíos**.
- **Nivel 1:** 6 tubos y 4 colores. **Nivel 2:** 8 tubos y 6 colores. **Nivel 3:** 10 tubos y 8 colores (ver la paleta en 10.2).

### Mover
- Es válido si el destino **está vacío**, o si **su capa de arriba es del mismo color** y tiene lugar.
- Se pasa el **grupo de arriba**: todas las capas seguidas del mismo color, **tantas como entren** (`min(grupo, lugar libre)`). Lo que no entra se queda en el tubo de origen.
- **No se puede elegir** un tubo vacío ni uno completo (de un solo color, con 4 capas).
- Cada trasvase suma **1 movimiento**, al empezar a verter.

### Deshacer
- **3 por nivel.** Vuelve atrás el último trasvase, aunque haya sido parcial.
- **No resta movimientos:** el contador cuenta todo lo que hiciste.
- Con 0, el botón queda apagado (opacidad 0,45) y muestra "0". No hay rehacer.

### Reiniciar
- Vuelve el tablero al inicio del nivel, **los movimientos a 0** y los deshacer a 3.
- **El reloj sigue corriendo.** No pide confirmación.

### Reto del día
- **Un solo intento**, como los otros retos. Los 3 niveles van seguidos.
- Entre un nivel y el siguiente aparece la **victoria de nivel** (pantalla 06). El reloj se frena hasta que tocás "Siguiente nivel".
- Al resolver el **nivel 3 no hay victoria de nivel**: se pasa directo a "Contando tus puntos…" y al **resultado del reto** (pantalla 10).
- **Salir** (la X o "Volver al inicio") abre `ExitDialog`: el reto cuenta como jugado con lo que llevás. Los niveles sin resolver valen 0.

### Puntaje del reto (propuesta, a calibrar con la beta)
- Cada nivel vale **250, 350 y 400** puntos (en total, 1.000).
- **Por nivel:** `valor × (0,7 × min(1, mínimo ÷ movimientos) + 0,3 × tiempo)`.
  - `tiempo = clamp((tMalo − t) ÷ (tMalo − tBueno), 0, 1)`.
  - `tBueno / tMalo`: nivel 1, 25 s / 100 s · nivel 2, 40 s / 150 s · nivel 3, 60 s / 220 s.
- **"Mínimo"** es el par del nivel: los movimientos de la mejor solución, que calcula el servidor al generar (ver 11.1).
- Un nivel sin resolver vale 0. El total se redondea y queda entre 0 y 1.000. **Lo calcula el servidor.**
- Los números de las pantallas (+205, 814…) son ilustrativos.

### Practicar
- **Niveles sin fin.** Del 1 al 4 hay 6 tubos, del 5 al 9 hay 8 y del 10 en adelante, 10.
- No hay puntaje: el **récord es el nivel más alto resuelto**. En la baldosa de Practicar dice "Nivel 14", como Secuencia.
- Deshacer y Reiniciar funcionan igual que en el reto.
- La victoria tiene "Siguiente nivel", "Volver a Practicar" y "Repetir nivel" (el mismo tablero, desde cero).

## 3. Secuencia y tiempos

```
intro (GameIntro) ─Empezar─▶ nivel 1 ─resuelto─▶ victoria de nivel ─Siguiente nivel─▶ nivel 2 ─▶ victoria ─▶ nivel 3 ─resuelto─▶ Contando tus puntos… ─▶ resultado del reto

dentro de un nivel:
  reposo ─tap tubo─▶ elegido ─tap destino válido─▶ vertiendo ─▶ reposo  (o ─▶ tubo listo ─▶ reposo, o ─▶ nivel resuelto)
                     elegido ─tap destino inválido─▶ no entra (1,2 s) ─▶ elegido
                     elegido ─tap el mismo tubo─▶ reposo
```

| Paso | Tiempo |
|---|---|
| Levantar o bajar el tubo | 140 ms, `cubic-bezier(.2,.9,.3,1.15)`. |
| No entra | Temblor de 240 ms (±5 px, 3 veces). Anillo rojo durante 600 ms. Toast de 1.200 ms (el default de `useToast`). |
| Vertido | Vuelo de 220 ms (ease-in-out). La inclinación a 95° se hace en los últimos 120 ms del vuelo. Después, **300 ms por capa** que pasa, y la vuelta a su lugar en 200 ms. |
| Tubo listo | El corcho cae en 360 ms con rebote (como `animate-pop`) y el check aparece 200 ms después. |
| Nivel resuelto | 600 ms después del último corcho, aparece la victoria. |
| Reloj | Se muestra en `m:ss`. Arranca en el primer cuadro del nivel y se frena en la victoria. |

Mientras un tubo vuela o vierte, **no se puede tocar nada**: los toques se ignoran, no se encolan.

## 4. Pantallas (ver `pantallas/`)

Todas usan el `Screen` de siempre: fondo cielo `#C3DAF8 → #DAE1F6 → #E8EAF6` y una nube abajo a la izquierda (left −60, bottom 50, 220 de ancho, opacidad 0,7). El contenido va de 66 px desde arriba a 44 px desde abajo, en una columna flex.

**00 · Antes de empezar.** Es `GameIntro` sin cambios, con el tema de Tubitos (ver 11.3). No hay pantalla nueva.

### Partes comunes del juego (01 a 05)

1. **Cabecera** (`GameHeader`):
   - La X (38 px, "Salir") y el parlante.
   - "TUBITOS": 13 px, 800, mayúsculas, tracking .06em, `#C94A7F`.
   - Píldora "Nivel N": 38 px de alto, blanca, Outfit 16 800, padding horizontal de 14 y sombra `0 6px 16px rgba(35,38,58,.08)`. En la práctica dice "Nivel 14".
2. **Fila de puntaje** (`ScoreRow`, padding 18 24 0):
   - Izquierda: la etiqueta "MOVIMIENTOS" y el número en Outfit 36 800, −.03em, tabular.
   - Derecha: "TIEMPO" y "0:24" en Outfit 24 800.
   - Hoy `ScoreRow` tiene "Puntaje" fijo a la izquierda: sumale una prop para la etiqueta.
3. **Línea de instrucción**:
   - 34 px de alto, 8 px de margen arriba, centrada. Texto en 15 px, 600, `#4B5070`.
   - Los toasts salen en esta misma línea y reemplazan el texto mientras duran.
   - Textos: en reposo, "Tocá un tubo para levantarlo"; con uno elegido, "Turquesa · elegí dónde pasarlo" (con el nombre del color); mientras vierte, nada.
4. **Tablero**: 350 px de ancho (margen 20 a cada lado). Medidas en 5.1.
5. **Píldoras de nivel**, solo en el reto. Van con `margin-top: auto` y separadas 8 px. Es el indicador de rondas de `LargadaPlay`:
   - Resuelto: azul `#4F6BFF`, texto blanco, Outfit 14 800, "14 mov." (los movimientos de ese nivel).
   - Actual: borde de 2 px `#23263A` y "Nivel 2".
   - Pendiente: 52 × 34, borde punteado de 2 px `#B8BDD6`.
6. **Botones** (grid de 2 columnas con 10 de separación, padding 14 20 0):
   - Los dos son blancos, de 56 px de alto, con radio 999, sombra `0 8px 20px rgba(35,38,58,.08)` y Outfit 17 800. Ícono de 20 con trazo 2,6 y 9 px de separación.
   - **Deshacer:** ícono `Undo2` y un contador a la derecha (mínimo 24 × 24, radio 999, fondo `#F1F2FA`, Outfit 14 800) con los que quedan. Sin deshacer: opacidad 0,45 y "0".
   - **Reiniciar:** ícono `RotateCcw`.
7. **Pie:** "Solo sobre el mismo color o en un tubo vacío", en 13 px, 600, `#4B5070`, centrado y con 12 px arriba.

### 01 · Elegís un tubo (6 tubos, nivel 1)
- El tubo elegido sube 20 px y lleva el anillo rosa.
- Los **destinos posibles** se marcan solos: anillo punteado rosa y la flecha arriba. En el ejemplo son el que termina en turquesa con lugar y el vacío.
- Instrucción: "Turquesa · elegí dónde pasarlo".

### 02 · No entra
- Con el tubo elegido todavía levantado, el que tocaste tiembla y lleva el anillo rojo.
- Toast rojo: "Ahí no · solo sobre el mismo color".
- Si el destino está lleno: "Ahí no · ese tubo está lleno".

### 03 · Vertiendo
- El tubo vuela sobre el destino, se inclina y vierte. Ver 6.3.
- La instrucción queda vacía, porque el tubo pasa por arriba de esa línea.

### 04 · Tubo listo (8 tubos, nivel 2)
- El tubo completo lleva corcho y un check verde arriba.
- Toast verde: "¡Tubo listo! · faltan 5" (los colores que todavía no se completaron).
- Las píldoras muestran el nivel 1 resuelto ("14 mov.").

### 05 · 10 tubos, sin deshacer (nivel 3)
- Dos filas de 5 tubos.
- Deshacer está apagado con su "0".
- Instrucción de reposo.

### 06 · Victoria en el reto (entre niveles)
Sigue la estructura de `GameResultView`: las nubes en sus 3 posiciones y la columna centrada.
- **Chip:** "Reto 2 de 3 · Tubitos", con el punto de 8 px en `#FF6FA5`.
- **Mascota** de 84 px con la cara `joy` (16 px arriba).
- "¡Qué orden!" en 14 px, 700, `#6C7191`.
- "¡Nivel 1 listo!" en Outfit 30 800, −.03em.
- "**14**" en Outfit 84 800, −.05em, y al lado "movimientos" en Outfit 18 700 `#6C7191` (con 8 px de separación, alineados por la base).
- "El mínimo era 12" en 14 px, 700, `#6C7191`.
- **Tarjeta** blanca (radio 22, sombra md, margen 18 20 0) con 3 columnas separadas por una línea de 1 px `#EDEFF8`: TIEMPO "0:41" · DESHACER "1 de 3" (los usados) · PUNTOS "+205". Las etiquetas van en 11 px, 700, mayúsculas, y los valores en Outfit 22 800.
- **Píldoras de nivel** con 16 px arriba: nivel 1 resuelto y nivel 2 actual.
- **Abajo** (columna con 10 px de separación):
  - "Siguiente nivel": botón `game` `size="start"` (74 px, `#FF6FA5`, con brillo, `ChevronRight`).
  - "Volver al inicio": `secondary`, 52 px. Abre `ExitDialog`.
  - El pie "El reloj vuelve a correr cuando tocás" en 12 px, 600, `#4B5070`.
- **Celebración chica:** 10 papelitos de confeti con `animate-rain` durante 1,5 s, con los colores de `CrownCelebration`. Los movimientos cuentan con `AnimatedNumber`.

### 07 · Victoria en la práctica
- Igual que la 06, con estos cambios:
  - El chip es "Práctica · Tubitos" con `Gamepad2`.
  - Los textos son "¡Nivel 14 listo!", "18" y "El mínimo era 15".
  - La tercera columna dice RÉCORD "Nivel 14".
  - No hay píldoras.
- **Botones:** "Siguiente nivel" (game, 74), "Volver a Practicar" (secondary, 52) y "Repetir nivel". Este último es ghost, de 40 px, en 15 px 800 `#4B5070`, con `RotateCcw` de 17.
- **Pie:** "Quedó en tus récords personales".

### 08 · Tablet jugando (820 × 1180)
- El juego **sale de la columna de 430 px**: la cabecera, la fila de puntaje y el tablero van en una columna de hasta **760 px** centrada.
- El tablero mide 700 px y los tubos crecen (ver 5.1).
- Los botones van en un grid de **480 px** centrado.
- Los elementos van en el mismo orden que en el celular.

### 09 · Tablet victoria
- La victoria queda en la **columna de 430 px**, centrada en vertical, como cualquier resultado de hoy en pantalla grande.
- La mascota mide 112 px, el titular 34 y el número 96 (con "movimientos" en 20).

### 10 · Resultado del reto
Es `GameResultView` sin cambios en la estructura:
- **Chip:** "Reto 2 de 3 · Tubitos".
- **Elogio:** "¡Qué orden!" (con `praiseFor`).
- **Titular** (como el de Secuencia): "Resolviste los 3 niveles", "Resolviste 2 de 3 niveles" o "No resolviste el nivel 1".
- **Puntaje:** 814 / 1.000 con la barra.
- **Tarjeta de detalle nueva:**
  - Fila de arriba: "60 movimientos" (la suma) y "el mínimo era 50" (la suma de los pares).
  - Un divisor.
  - **3 baldosas**: fondo `#FFD6E7`, radio 12, padding 8 6, centradas. Cada una lleva "Nivel 1" (11 px, 700, `#C94A7F`), "14 mov." (Outfit 18 800) y "0:41 · +205" (11 px, 600, `#6C7191`). Un nivel sin resolver va con borde punteado `#B8BDD6`, sin fondo, y dice "sin resolver".
  - Pie de la tarjeta: "movimientos, tiempo y puntos de cada nivel".
- **Botón y nota:** "Siguiente reto" (primary) y la nota de siempre.

## 5. Tablero y tubo

### 5.1 Medidas

| | 6 tubos | 8 tubos | 10 tubos | Tablet (10) |
|---|---|---|---|---|
| Filas | 3 + 3 | 4 + 4 | 5 + 5 | 5 + 5 |
| Ancho del tubo | 58 | 52 | 46 | 78 |
| Separación entre tubos | 40 | 28 | 20 | 50 |
| Alto de capa | 34 | 33 | 31 | 60 |
| Aire arriba de la 4ª capa | 18 | 16 | 14 | 24 |
| **Alto del tubo** (6 + 4 × capa + aire) | 160 | 154 | 144 | 270 |
| Separación entre filas | 44 | 48 | 48 | 78 |
| Margen arriba / abajo del tablero | 56 / 14 | 52 / 14 | 52 / 14 | 70 / 24 |
| Tamaño del ícono | 15 | 14 | 13 | 22 |
| Alto del tablero (ancho 350, o 700 en tablet) | 434 | 422 | 402 | 712 |

- **Regla de filas:** con hasta 5 tubos va 1 fila; con más, 2 filas iguales. Si la cantidad es impar, la fila de arriba lleva uno más.
- Cada fila se centra: `x0 = (ancho − (n × tubo + (n − 1) × separación)) ÷ 2`.
- El **margen de arriba** deja lugar para el tubo levantado, la flecha de destino y el tubo que vuela al verter.
- **Zona táctil:** la columna entera de cada tubo, del ancho del tubo más la separación, desde 40 px por arriba del tubo hasta la gradilla. Con 10 tubos mide 66 × 190 px, más que los 44 mínimos.

### 5.2 Anatomía del tubo (estilo "probeta")
- **Labio:** 8 px de alto arriba de todo, 4 px más ancho que el tubo de cada lado, radio 4, blanco, con sombra `0 2px 6px rgba(35,38,58,.10)`.
- **Cuerpo:** empieza 6 px más abajo.
  - Borde de 2,5 px blanco, sin borde arriba.
  - Radio abajo = ancho ÷ 2 (fondo redondo de tubo de ensayo).
  - Fondo `rgba(255,255,255,.42)`, sombra `0 10px 20px rgba(35,38,58,.10)` y `overflow: hidden`.
- **Brillo:** una franja a 16 % de la izquierda, desde 8 px arriba hasta 24 % del fondo. Mide 5 px de ancho, radio 3, `rgba(255,255,255,.55)`, y va por encima del líquido.
- **Líquido:**
  - Las capas se apilan desde abajo. Las capas seguidas del mismo color se dibujan como **un solo bloque** de N × alto de capa.
  - El bloque de arriba lleva una franja de 3 px `rgba(255,255,255,.35)` en su borde superior.
  - Cada bloque lleva su **ícono centrado** (ver 10.2).
- **Gradilla:** una por fila, detrás de los tubos.
  - Arranca 16 px antes del primer tubo y termina 16 px después del último.
  - Su `top` es el `top` del tubo + alto − 10. Mide 16 px de alto, con radio 999, `rgba(255,255,255,.8)` y sombra `0 6px 16px rgba(35,38,58,.06)`.

### 5.3 Estados

| Estado | Cómo se ve |
|---|---|
| Normal | Como en 5.2. |
| **Elegido** | Sube 20 px. Anillo a 7 px por fuera: borde de 3 px `#FF6FA5`, radio 13 13 (r + 7) (r + 7), sombra `0 16px 28px rgba(255,111,165,.35)`. |
| **Destino válido** | Anillo punteado de 2,5 px `#FF6FA5` con fondo `rgba(255,111,165,.08)`. **Flecha:** un círculo de 28 px `#FF6FA5` centrado a 46 px por arriba del tubo, con `ArrowDown` blanco de 16 y trazo 3, y sombra `0 6px 14px rgba(255,111,165,.4)`. |
| **No entra** | Tiembla (en la captura, el cuadro del medio: −5 px y −3°). Anillo de 3 px `#E2504C` con sombra `0 12px 24px rgba(226,80,76,.3)`. |
| **Vertiendo** | Ver 6.3. Va por encima de todo. |
| **Listo** | **Corcho:** de 14 % a 14 % del ancho, 9 px por arriba, 14 px de alto, radio 4 4 2 2, `#E8CDA3` con `inset 0 -3px 0 #C9A074`. **Check:** un círculo de 24 px `#1FA093` a 40 px por arriba, con `Check` blanco de 14 y trazo 3,2, y sombra `0 6px 14px rgba(31,160,147,.35)`. No se puede elegir. |
| Vacío | Solo el vidrio. No se puede elegir. |

## 6. Movimiento

### 6.1 Elegir
- Sube 20 px en 140 ms y aparece el anillo. Los destinos válidos se marcan en el mismo cuadro.
- Vibración de 10 ms.

### 6.2 No entra
- Temblor horizontal de 240 ms y anillo rojo. El elegido **sigue levantado**.
- Sonido `fail` (el de Secuencia) y vibración `[15, 60, 15]`.

### 6.3 Vertido
1. El tubo de origen vuela hasta que su **labio de abajo** queda **12 px por arriba de la boca del destino**, centrado en el destino.
2. Gira **95°** alrededor del centro de su boca (`transform-origin: 50% 0`). Gira en sentido horario si viene de la izquierda del destino y antihorario si viene de la derecha. El cuerpo queda del lado del que vino, un poco hacia arriba.
3. **El líquido de adentro queda horizontal:** se dibuja en franjas y se recorta con `clip-path`. Es más hondo en la boca y más bajo en el fondo. La referencia está en `buildBoard()`: `bands` y `clip`.
4. **Chorro:** 8 px de ancho, redondeado, del color que pasa, con halo `0 0 0 2px rgba(255,255,255,.45)`. Cae del labio a la superficie del destino.
5. El destino **sube a la par**, a 300 ms por capa. Después el tubo vuelve a su lugar y se endereza en 200 ms.
6. El tubo que vuela va por encima de todo. El margen de arriba del tablero alcanza para que no tape la fila de puntaje.

### 6.4 Tubo listo
- Cae el corcho con rebote, aparece el check y suena un sonido nuevo de "plop" (`cork`).
- Vibración de 25 ms y el toast verde.
- Si era el último, 600 ms después aparece la victoria (sonido `levelUp`).

### 6.5 Victoria
- Confeti `animate-rain`, 10 papelitos durante 1,5 s, y `AnimatedNumber` para los movimientos.
- En la práctica, con récord nuevo, suena `record`.

### 6.6 Sonido
- Usá `lib/sound` y `synth`. Agregá dos sonidos:
  - `pour`: un gluglú corto por cada capa.
  - `cork`: el "plop" del corcho.
- El resto ya existe: `fail`, `levelUp` y `record`.

### 6.7 Movimiento reducido
- Con `prefers-reduced-motion` el tubo no vuela ni se inclina: el líquido pasa de golpe con un fundido de 150 ms.
- Sin temblor (queda solo el anillo rojo), sin confeti y sin conteo.

## 7. Avisos (toast)

Usá `Toast` / `useToast` de `chrome.tsx`, ubicados en la línea de instrucción:
- **Rojo** con `X`: "Ahí no · solo sobre el mismo color", o "Ahí no · ese tubo está lleno".
- **Verde** con `Check`: "¡Tubo listo! · faltan N".
- **Dorado** con `Info`: "Sin movimientos · deshacé o reiniciá". Es para cuando el tablero queda trabado y **se queda** hasta que hagas algo. No está dibujado: va igual que los otros toasts.

## 8. Accesibilidad
- **Cada color lleva su ícono, siempre visible** (tabla 10.2). Los cuatro primeros son los de Secuencia. El ícono va relleno, con trazo 2, en blanco al 92 %, o en tinta al 72 % sobre amarillo y lima.
- **Los textos nombran el color:** "Turquesa · elegí dónde pasarlo".
- **Cada tubo es un `button`** con `aria-label`, por ejemplo: "Tubo 3, de abajo hacia arriba: coral, amarillo, turquesa". Para el elegido, `aria-pressed`. Los destinos llevan "puede recibir".
- La instrucción y los toasts van en `aria-live="polite"`.
- **Teclado:** el orden de tabulación va fila por fila, y Enter o Espacio equivalen a tocar.
- Zonas táctiles de 66 × 190 px o más (ver 5.1).

## 9. Casos borde
- **Trabado** (no hay jugadas válidas y no está resuelto): sale el toast dorado y los dos botones laten suave.
- **Toques mientras vierte:** se ignoran.
- **Tocar un tubo vacío o completo sin nada elegido:** un temblor chico, sin toast.
- **Vertido parcial:** pasa lo que entra y el resto se queda. Cuenta como 1 movimiento y se deshace entero.
- **Reiniciar con 0 movimientos:** no hace nada.
- **Salir a mitad:** `ExitDialog` en el reto (cuenta como jugado); en la práctica, sale sin más.
- **Cerrar la app a mitad del reto:** igual que los otros juegos (`ChallengeRunner`). Al volver, se califica con el log guardado.
- **Pantallas bajas** (`short:`, ≤ 800 px):
  - Capas 4 px más bajas (30, 29 y 27).
  - Fila de puntaje con 12 px arriba.
  - Sin el pie de texto.
- **Tablet** (ancho ≥ 768): ver 08 y 09.
- **Horizontal:** no es parte de esta versión.
- **El grupo:** no aparece durante el juego ni en la victoria en esta versión.

## 10. Estilo

### 10.1 Tema y tokens
- **Tubitos:** main `#FF6FA5`, dark y title `#C94A7F`, light `#FFD6E7`, on `#FFFFFF`.
  - Hero a 165°: `#FF8DB8 0%`, `#FF6FA5 60%`, `#F25A93 100%`.
  - Sombra del main al 35 %: `0 16px 32px rgba(255,111,165,.35)`.
  - Barra: `linear-gradient(90deg,#FF8DB8,#FF6FA5)`.
- **El resto, de `globals.css`:** tinta `#23263A`, `#4B5070`, `#6C7191`, `#B8BDD6` y `#D9DDF3`; marca `#4F6BFF`; superficie 2 `#F1F2FA`; línea `#EDEFF8`; éxito `#1FA093`; peligro `#E2504C`; dorado `#FFC53D`.
- Radios de 28, 22 y 16 y sombras `sm`, `md` y `lg`. Outfit 800 para títulos y números, Plus Jakarta Sans para el resto. Los números van en **cifras tabulares**.
- Textos en español rioplatense con voseo y sin emoji.

### 10.2 Paleta de líquidos

| Clave | Nombre | Hex | Ícono (lucide) | Color del ícono | Niveles |
|---|---|---|---|---|---|
| `coral` | Coral | `#FF6B4A` | `Star` | blanco | 1, 2, 3 |
| `violeta` | Violeta | `#8B6CFF` | `Moon` | blanco | 1, 2, 3 |
| `turquesa` | Turquesa | `#2EC4B6` | `Zap` | blanco | 1, 2, 3 |
| `amarillo` | Amarillo | `#FFC53D` | `Heart` | tinta | 1, 2, 3 |
| `rosa` | Rosa | `#FF6FA5` | `Diamond` | blanco | 2, 3 |
| `azul` | Azul | `#4F6BFF` | `Droplet` | blanco | 2, 3 |
| `lima` | Lima | `#9ED64A` | `Leaf` | tinta | 3 |
| `cafe` | Café | `#B9804A` | `Spade` | blanco | 3 |

El blanco es `rgba(255,255,255,.92)` y la tinta, `rgba(35,38,58,.72)`. El ícono va con `fill` del mismo color.

## 11. Dónde va en el código

### 11.1 Motor (`packages/games`)
- **`src/types.ts`:** sumá `'water-sort'` a `GAME_IDS`, con categoría `'logic'`.
- **`src/games/water-sort.ts`** (nuevo, con pruebas):
  - `WATER_SORT_RULES`: capacidad, tubos y colores por nivel, valores por nivel y `tBueno` / `tMalo`.
  - `waterSortScore()` y `createWaterSort()`, que implementa `GameDefinition`.
  - **Generar:**
    - Partí del tablero resuelto y mezclalo con movimientos inversos al azar, o repartí al azar y verificá con el solver.
    - Calculá el **par** con un solver (BFS o A* sobre estados canónicos, sin importar el orden de los tubos). Para 10 tubos, poné un tope de nodos: si se llega al tope, el par es la mejor solución encontrada y queda marcado como aproximado.
  - **Justicia en el reto:** con `rngs.shared`, la misma estructura de tablero para todos; con `rngs.player`, una permutación de colores y del orden de los tubos. Son tableros equivalentes con el mismo par, pero la solución de uno no sirve para copiar en otro.
  - **Revelar de a un nivel**, como Secuencia: el nivel 1 viene en el `StartView` y el siguiente lo da `api/retos/nivel` después de verificar que el anterior está resuelto.
  - **Evaluar:**
    - Rejugá el log y verificá que cada trasvase sea legal, que haya como mucho 3 deshacer por nivel y que el tablero final esté resuelto.
    - Contá los movimientos desde el último reinicio y calculá el puntaje.
    - **Flags:** `illegal-move` (high), `unsolved-level` (high), `below-par` (high, salvo con par aproximado), `too-fast-input` (menos de unos 150 ms entre trasvases, en promedio) y `clock-mismatch` contra `serverElapsedMs`.
- **`src/lineup.ts`:**
  - Sumá Tubitos a `GAME_CATALOG`.
  - **La rotación diaria hoy no admite 5 juegos:** `dailyLineup` saca uno y espera 3. Hace falta otra regla (ver "Decisiones abiertas").
  - La regla nueva tiene que aplicar **desde la fecha de estreno**, así no cambian las alineaciones de los días anteriores (como `usesLargada`).
- **`src/index.ts`:** exportá el juego.

**Log propuesto:**
```ts
export interface WaterSortLog {
  levels: Array<{
    /** In order; `t` = ms since the level started. */
    events: Array<{ type: "pour"; from: number; to: number; t: number } | { type: "undo"; t: number } | { type: "restart"; t: number }>;
    durationMs: number;
  }>;
}
```

### 11.2 Web (`apps/web`)
- **`lib/games.ts`:** el slug `"tubitos"` en `GameSlug` y el tema en `GAMES["water-sort"]` (ver 11.3).
- **`app/globals.css`:** los tokens `--color-tubitos*` y la utilidad `bg-hero-tubitos`.
- **`components/personaje/Personaje.tsx`:** `GameProp` suma `"tubo"` (ver 11.3).
- **`components/games/WaterSortPlay.tsx`** (nuevo): tiene el mismo contrato que los otros (`view`, `token`, `onProgress`, `onFinish`, `onExit`). Adentro van:
  - **`Tube`:** los estados de 5.3.
  - **`Board`:** las medidas de 5.1, mejor como una función pura de layout con pruebas.
  - **La victoria de nivel:** pantallas 06 y 07, con la prop `practice`.
- **`components/games/ChallengeRunner.tsx`:** `emptyLog("water-sort") = { levels: [] }`, y renderizá `WaterSortPlay`.
- **`lib/challenge-types.ts`:** el `StartView` de `water-sort` (nivel 1, capacidad y paleta).
- **`server/challenges.ts` y `app/api/retos/nivel`:** dar el nivel siguiente.
- **`components/games/GameResultView.tsx`:** el titular y la tarjeta `Detail` de Tubitos (pantalla 10).
- **`components/games/chrome.tsx`:** la etiqueta configurable en `ScoreRow`.
- **`components/practice/PracticeHome.tsx` y `lib/storage.ts`:** el récord ("Nivel N").
- **`components/ui/Screen.tsx`:** una variante ancha (`wide`, hasta 760 px) para el juego en tablet.
- **`lib/sound.ts` y `lib/synth.ts`:** los sonidos `pour` y `cork`.
- **Reutilizables:** `Screen`, `GameHeader`, `ScoreRow`, `IconButton`, `SoundToggle`, `Button` (`game`, `secondary` y `ghost`), `Chip`, `Toast` / `useToast`, `ExitDialog`, `AnimatedNumber`, `ProgressBar`, `Personaje` y `GameIntro`.

### 11.3 Código listo para pegar

**El tema (`lib/games.ts`):**
```ts
"water-sort": {
  id: "water-sort",
  slug: "tubitos",
  name: "Tubitos",
  lines: ["Tubitos"],
  kicker: "Lógica",
  howTo: "Pasá los colores de un tubo a otro hasta que cada tubo tenga uno solo. Son 3 niveles: con menos movimientos y menos tiempo, más puntos.",
  facts: [
    { Icon: TestTubes, value: "3 niveles", label: "6, 8 y 10 tubos" },
    { Icon: Trophy, value: "1.000", label: "con pocos movimientos" },
  ],
  startNote: "El reloj arranca cuando tocás",
  duration: "unos 3 minutos",
  shortDuration: "3\u00A0min",
  praise: "¡Qué orden!",
  Icon: TestTubes,
  heroClass: "bg-hero-tubitos",
  colors: { main: "#FF6FA5", dark: "#C94A7F", light: "#FFD6E7", on: "#FFFFFF", title: "#C94A7F" },
  shadow: "rgba(255,111,165,.35)",
  gradient: "linear-gradient(90deg,#FF8DB8,#FF6FA5)",
  mascot: { sp: "pinguino", c: { main: "#FF6FA5", light: "#FFD6E7", dark: "#C94A7F" }, prop: "tubo" },
  resultFace: "joy",
},
```

**Los tokens (`globals.css`):**
```css
--color-tubitos: #ff6fa5;
--color-tubitos-dark: #c94a7f;
--color-tubitos-light: #ffd6e7;

@utility bg-hero-tubitos {
  background-image: linear-gradient(165deg, #ff8db8 0%, #ff6fa5 60%, #f25a93 100%);
}
```

**El prop `"tubo"` (`Personaje.tsx`, junto a `"bandera"`):**
```ts
if (o.prop === "tubo") {
  // Tubitos: a test tube held up in the hand. Simple shapes, like the other props.
  const [hx, hy] = hand;
  const x = hx + 5, top = hy - 30, w = 10, len = 30;
  k.push(
    h("g", { key: "tb", transform: `rotate(14 ${x + w / 2} ${top + len / 2})` },
      h("rect", { x, y: top, width: w, height: len, rx: w / 2, fill: "#FFFFFF" }),
      h("rect", { x, y: top + 12, width: w, height: len - 12, rx: w / 2, fill: "#2EC4B6" }),
      h("rect", { x, y: top + 12, width: w, height: 5, fill: "#2EC4B6" }),
      h("rect", { x: x + 2, y: top + 3, width: 2.2, height: 8, rx: 1.1, fill: "#FFFFFF", opacity: 0.9 }),
      h("rect", { x, y: top, width: w, height: len, rx: w / 2, fill: "none", stroke: "#B8BDD6", strokeWidth: 1.4 }),
      h("rect", { x: x - 1.8, y: top - 2, width: w + 3.6, height: 3.6, rx: 1.8, fill: "#B8BDD6" }),
    ),
  );
}
```

### 11.4 Documentación
Como pide `CLAUDE.md`:
- Sumá la entrada en `docs/BITACORA.md`.
- Registrá las decisiones en `docs/PLAN.md`.
- Agregá Tubitos a `docs/diseno/CAMBIOS-AL-DISENO.md` si algo cambia respecto de esta spec.

## 12. Criterios de aceptación

- [ ] Se puede elegir un tubo con un toque: sube 20 px y aparece el anillo rosa. Tocarlo de nuevo lo baja.
- [ ] Al elegir, se marcan solos todos los destinos válidos (anillo punteado y flecha), y solo esos.
- [ ] Un destino inválido tiembla, se marca en rojo y sale el toast. El elegido sigue levantado.
- [ ] El vertido vuela, se inclina 95° con el líquido horizontal, muestra el chorro y pasa el grupo de arriba, tanto como entre.
- [ ] Los movimientos suben 1 por trasvase y el reloj corre en `m:ss`.
- [ ] Deshacer: 3 por nivel, no resta movimientos y con 0 queda apagado. Reiniciar vuelve el tablero, pone 0 movimientos y 3 deshacer, y el reloj sigue.
- [ ] Un tubo de un solo color con 4 capas se tapa con corcho y check, sale el toast verde y ya no se puede elegir.
- [ ] 6, 8 y 10 tubos se reparten en filas centradas con las medidas de 5.1, y cada columna es una zona táctil entera.
- [ ] Cada color tiene su ícono y el juego se entiende en escala de grises.
- [ ] Reto: 3 niveles con victoria de nivel entre medio (el reloj frenado). Después del 3, el resultado del reto con su tarjeta de detalle. Salir abre `ExitDialog`.
- [ ] Práctica: niveles sin fin con "Siguiente nivel", "Volver a Practicar" y "Repetir nivel". El récord es el nivel más alto.
- [ ] El servidor rejuega el log, valida y calcula el puntaje. Los niveles se revelan de a uno.
- [ ] En tablet el juego usa hasta 760 px y la victoria queda en la columna de 430.
- [ ] Funciona con `prefers-reduced-motion`, en pantallas de 650 a 800 px de alto y con teclado.

## 13. Decisiones abiertas

- **Rotación diaria con 5 juegos:** hoy se juegan 3 y descansa 1. ¿Descansan 2 por día, en rotación? ¿Desde qué fecha?
- **Reiniciar vuelve a 0 movimientos:** esto permite explorar la solución, reiniciar y repetirla con menos movimientos. Lo único que se pierde es tiempo. ¿Está bien así? (Fue la elección.)
- **Deshacer no resta movimientos:** confirmar.
- **Pesos del puntaje** (250/350/400 y 70 % / 30 %) y los tiempos de cada nivel: calibrar con la beta.
- **Variante ancha solo para Tubitos en tablet:** ¿se usa también en los otros juegos?
- **El grupo:** rivales, podio o "el mejor de hoy" en el resultado quedan para una segunda vuelta.
