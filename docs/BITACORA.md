# El Mejor de — Bitácora

> Qué se hizo, en qué orden y qué quedó pendiente, para retomar el proyecto sin releer conversaciones.
> Se suma una entrada al cerrar cada tanda de trabajo (lo más nuevo, arriba). El *qué* y el *por qué* del producto están en [PLAN.md](PLAN.md); el *cómo*, en [ARQUITECTURA.md](ARQUITECTURA.md).

## Cómo retomar

1. Leé esta bitácora, después [PLAN.md](PLAN.md) y [ARQUITECTURA.md](ARQUITECTURA.md). Para las batallas en vivo, [BATALLAS.md](BATALLAS.md): cómo están hechas y el paso a paso para sumar un juego.
2. Comandos desde la raíz: `pnpm install`, `pnpm dev`, `pnpm check` (lint + tipos + pruebas) y `pnpm build`.
3. Rama de trabajo: `claude/adoring-bardeen-19q4va`. Es la única del repositorio y Vercel la usa como producción: **cada push se publica solo**.
4. **Probar con base en local** (cuentas, grupos, batallas y "un solo intento"): sin `DATABASE_URL` la app anda, pero no guarda nada y las cuentas responden 503.
   - Levantá la base con `node scripts/qa/local-db.mjs`. La primera vez, antes, `npm install --prefix scripts/qa`.
     - Es un Postgres en memoria (PGlite) con todas las migraciones, en `127.0.0.1:5433`.
     - Trae una muestra de los lugares (`supabase/scripts/places-sample.sql`): el país, las provincias, los barrios de la Ciudad y los pueblos alrededor de Chivilcoy. En Supabase, en cambio, se cargan todos con `import-places.sql`, que corre adentro de la base.
   - Después, `DATABASE_URL=postgres://app_server@127.0.0.1:5433/postgres DATABASE_POOL_MAX=1 pnpm dev`, y abrir **`localhost`** (no `127.0.0.1`: Next.js bloquea ahí sus scripts de desarrollo).
   - Si las pruebas crean muchas cuentas, el límite de cuentas por conexión salta. Borrá `game.auth_events` en esa base, o reiniciala.
5. **Revisar pantallas:** con Playwright, en celulares simulados de 390 × 844 y 360 × 740 (`isMobile`, `hasTouch` y `locale: "es-AR"`).
   - Las batallas (con tres celus a la vez) y Tubitos tienen pruebas listas en [`scripts/qa`](../scripts/qa/README.md). Juegan solas y sacan capturas.
   - El GPS se simula con `geolocation: { latitude, longitude, accuracy }` y `permissions: ["geolocation"]` en el contexto; sin el permiso, el navegador lo niega.

## Estado actual (4/10/2026)

- **App publicada** en https://game.lipesolutions.com (también en https://el-mejor-de-web.vercel.app). Se puede jugar: inicio, los 3 retos del día con su resultado, los juegos que descansan, resumen del día, práctica con récords, racha y puntaje de la semana.
- **Cuentas** con apodo y contraseña, sin email: crear cuenta (personaje y El / La Mejor), entrar, salir, perfil y editar personaje. Lo jugado ese día sin cuenta pasa a la cuenta nueva, y en otro celu se ve lo jugado.
- **Personajes 2.0** (diseñados con Claude Design): 17 bichos, vista de tres cuartos, 6 poses y avatar redondo.
  - Saludan en el inicio, abrazan la corona en su festejo y en los podios el 1º salta. En las filas y las batallas va el avatar redondo, y quien todavía no jugó, dormido.
  - Ojos, pelo, marcas, ropa y un accesorio por zona ya se dibujan, pero se van a elegir con el **editor nuevo**, que llega en otro paquete. Mientras, la pantalla de personaje ofrece los 17 bichos.
- **Grupos privados** con su ranking del día y de la semana y su **corona en vivo**:
  - Crear un grupo, invitar por WhatsApp o con el código, sumarse (también creando la cuenta desde el link), sacar a alguien e irse.
  - La corona la tiene quien va primero, y pasa a quien lo supera, con aviso.
  - La primera corona se entrega el **lunes 12/10** (semana del 5 al 11/10), con festejo y palmarés en el perfil.
- **Diez Letras** reemplaza a Siete Letras:
  - 10 letras en botones grandes y puntos fijos por largo.
  - Las palabras se mandan sin esperar la verificación.
  - Ya está en la práctica. En el reto del día rige desde el 4/10; el 3/10 y los días anteriores siguen con 7 letras.
- **Base de datos conectada** (Supabase): cada reto del día se juega una sola vez por cuenta (o por navegador, sin cuenta) y lo controla el servidor. Los lugares oficiales de Argentina están cargados.
- **Tu lugar y rankings por barrio, provincia y país:**
  - Al crear la cuenta, el "Paso 2 de 2" es elegir tu lugar: con el GPS en un toque o a mano, y verificarlo.
  - Ranking de tu barrio o localidad, tu provincia y el país, de hoy y de la semana. Cada uno tiene su corona en vivo, que la tiene el primero que verificó esa semana.
  - En el inicio, tu lugar arriba y tus puestos; en el resumen del día, tu puesto en los tres niveles; en el perfil, "Tu lugar" para cambiarlo.
  - La primera corona de los lugares también se entrega el **lunes 12/10**.
- **Largada** reemplaza a Reflejos: una largada de autos contra los tiempos de hoy de tu grupo, con podio, foto de llegada para compartir por WhatsApp y la franja de la corona.
  - Ya está en la práctica. En el reto del día rige desde el 4/10, y el primer día con reto de reflejos es el **lunes 5/10**. El 3/10 sigue el Reflejos de antes.
  - **Bots** (Rayo, Chispa, Turbo y Tortuga): en la práctica completan la pista; en el reto del día corren solo si no hay nadie más.
- **Tubitos**, el quinto juego (lógica): ordenar colores en tubos, diseñado con Claude Design.
  - Ya está en la práctica, con niveles sin fin desde el que sigue a tu récord.
  - En el reto del día entra el **lunes 5/10**, con 3 niveles seguidos (6, 8 y 10 tubos). Desde ese día se juegan 3 de los 5 juegos y descansan 2; ese lunes tocan Diez Letras, Largada y Tubitos.
  - El servidor arma los tableros, calcula el mínimo de movimientos, entrega cada nivel cuando resolviste el anterior y cronometra cada uno.
- **Sonido:** efectos en los juegos y en los resultados, y cortinas cortas al cerrar el día, al batir un récord y al ganar la corona, hechos con código. Arranca prendido, respeta el modo silencio y se apaga con el parlante de los juegos o en el perfil.
- **Música:** un loop para el menú y uno por juego (el de Tubitos, "Laboratorio"), más bajo que los efectos. Se apaga aparte en el perfil.
- **Batallas en vivo:** de 2 a 10 amigos juegan a la vez, cada uno en su celu, desde un grupo (con el aviso "Pato armó una de Largada · Sumarme") o con un link.
  - Se juegan **los cinco juegos**, a la par, con podio, revancha u otro juego, y la pestaña "Batallas" del grupo con quién ganó más.
  - En Diez Letras, en el podio se ven las palabras de todos. En Secuencia, el que se equivoca queda afuera, y si se equivocan todos, desempate. En Tubitos, los 3 tableros del reto, cada uno en su versión.
  - No cuentan para rankings ni coronas.
- **Pruebas:** 690 automáticas, todas pasan.
- **Control rápido:** https://el-mejor-de-web.vercel.app/api/estado tiene que responder `"database":"connected"`.
- **Falta:** el editor de personaje (llega en otro paquete de Claude Design), vincular con Google y la tarjeta "Desafiá a Pato" de Largada (ver [Pendientes](#pendientes-y-próximos-pasos)).

## Dónde está cada cosa

Sin secretos: las claves viven solo en Vercel y Supabase.

| Qué | Dónde |
|---|---|
| Código | GitHub `LiPeSolutions/el-mejor-de`, rama `claude/adoring-bardeen-19q4va`. CI con GitHub Actions: lint, tipos, pruebas y build en cada push. |
| Publicación | Vercel, equipo `lipe-demos`, proyecto `el-mejor-de-web` (Root Directory `apps/web`, funciones en São Paulo `gru1`). Variables: `CHALLENGE_SECRET` (producción y previews) y `DATABASE_URL` (producción). Los previews no tienen base, así que ahí no hay cuentas. |
| Base de datos | Supabase, organización **el mejor de** (plan Free), proyecto `qosoxpsjltmghadfkzph` en São Paulo. Data API apagada. Tablas en el esquema `game` (en el Table Editor, cambiar "schema public" por "game"). La app entra con el rol `app_server` por el pooler `aws-0-sa-east-1`. |
| Diseño | Claude Design en [`docs/diseno/handoff`](diseno/handoff/README.md); Largada y Tubitos, en [`handoff-largada`](diseno/handoff-largada/LARGADA.md) y [`handoff-tubitos`](diseno/handoff-tubitos/TUBITOS.md). Lo que se cambió al implementarlo, en [CAMBIOS-AL-DISENO.md](diseno/CAMBIOS-AL-DISENO.md). |
| Contenido | Diccionario de Diez Letras (365.648 palabras de 3 a 10 letras, y las palabras escondidas elegidas a mano) y 106 preguntas en `packages/content`. Las preguntas, para revisar, en [preguntas.md](contenido/preguntas.md). |
| Pruebas en el navegador | [`scripts/qa`](../scripts/qa/README.md): la base local y las pruebas con celus simulados (batallas con tres celus, Tubitos). Se corren a mano, fuera de `pnpm check`. |
| Dominio | `game.lipesolutions.com`, en el proyecto de Vercel. El DNS de lipesolutions.com está en **Namecheap**, con el registro CNAME `game` → `cname.vercel-dns.com`. |

## Cronología

### 4/10/2026 — Personajes 2.0

- **Lo decidido:**
  - El editor nuevo (Bicho, Cara, Ropa y Accesorios, con "Al azar") llega en otro paquete de Claude Design. Mientras, la pantalla de personaje de hoy ofrece los 17 bichos.
  - Toda la propuesta de dónde va cada pose, con animaciones cortas.
  - Se publica directo, sin capturas antes.
- **Qué se hizo:**
  - El dibujo nuevo, portado tal cual del diseño ("Pulido"). Los 8 bichos de antes tienen las terminaciones más parejas (la cola del hornero ahora nace detrás del cuerpo), y hay 9 nuevos: yaguareté, tero, mulita, cóndor, ñandú, oso hormiguero, vizcacha, perro y gato.
  - Vista de tres cuartos hacia los dos lados, 6 poses (quieto, saludo, festejo, salto, abrazando la corona y dormido) y el avatar redondo.
  - Toda la personalización ya se dibuja: segundo color, ojos, pelo, marcas, ropa con color y número, y un accesorio por zona (cabeza, cara, cuello y mano). Se va a poder elegir con el editor.
  - Lo que ya estaba guardado se ve igual: el accesorio de antes pasa a su zona.
  - **Dónde va cada pose:**
    - saluda en el inicio, y duerme cuando el día está hecho;
    - abraza la corona en su festejo;
    - en los podios (ranking, grupos, Largada y batallas) el 1º salta y los otros dos lo miran de tres cuartos;
    - festeja al verificar el lugar;
    - la mascota salta al pasar un nivel de Tubitos y al batir un récord en la práctica;
    - la mascota del juego que descansa duerme, y quien te invita a una batalla te saluda.
  - **Avatar redondo** en las filas del ranking, de los grupos y de las batallas, en las tiras "En vivo" y en los chips. Quien todavía no jugó aparece dormido, en gris y con borde punteado.
  - **Animaciones:** en el festejo los brazos suben, y en el salto el personaje aterriza con un rebote. Se apagan si el celu pide menos movimiento.
  - Una página de desarrollo con la hoja de modelos (`/dev/personajes`), que en producción no existe.
  - El diseño quedó en [`docs/diseno/handoff-personajes`](diseno/handoff-personajes/PERSONAJES.md), y lo que cambió al implementarlo, en [CAMBIOS-AL-DISENO.md](diseno/CAMBIOS-AL-DISENO.md#personajes-20).
- **Lo que resolvió Claude:**
  - Dormido conserva la "z" de antes: la guía la pide, pero los dibujos de referencia no la traen.
  - En tu fila del ranking (la barra azul) el avatar queda despierto aunque no hayas jugado: dormido no se lee sobre el azul.
  - Una camiseta con el 0 dice 0 (en el diseño, decía 10).
- **Probado:**
  - 263 pruebas automáticas nuevas. Los datos: la forma vieja, la nueva y los valores inválidos. El dibujo: comparado pieza por pieza con los 200 SVG de referencia del diseño (los 17 bichos en cada vista y pose, los 8 ejemplos y cada opción); coinciden todos.
  - En el navegador, `scripts/qa/personajes.cjs`: las 201 celdas de la hoja se ven como las de referencia. La que más difiere, un 0,24 %, es por la letra del número de la camiseta.
  - Las pantallas: la de personaje con los 17, el inicio, el perfil y guardar un bicho nuevo. Las batallas: grupo 8 de 8, Diez Letras 12 de 12 y la sala de 10, 5 de 5. Tubitos, 15 de 15.
- **Corregido de paso:**
  - la prueba de Diez Letras fallaba si a un jugador le tocaba una palabra que contiene la de otro (EROTISMOS y EROTISMO);
  - en los cambios al diseño de Tubitos todavía decía que no estaba en las batallas.
- **Pendiente:** el editor de personaje, cuando llegue su paquete.

### 4/10/2026 — Batallas: Tubitos como el reto

- **Lo decidido:** como el reto, con los mismos 3 tableros para todos, los puntos del reto y un tiempo máximo por tablero.
- **Lo que resolvió Claude:**
  - Los tiempos máximos son 1:40, 2:30 y 3:40: cuando en el reto el tiempo deja de sumar puntos. Quien no resuelve un tablero a tiempo no lo suma y sigue en el próximo.
  - Con los mismos puntos, gana el que tardó menos en total; el podio muestra los tableros resueltos y el tiempo.
- **Qué se hizo:**
  - Cada tablero abre a la vez en todos los celus. Cada uno juega su versión: otros colores y otro orden de tubos, el mismo rompecabezas.
  - Arriba, quién ya lo resolvió. Al cerrar, la tabla del tablero con los movimientos, el tiempo y los puntos de cada uno.
  - Al resolverlo, el celu manda los pasos y el servidor los rejuega, como en el reto.
  - La lógica de jugar un tablero (levantar, verter, deshacer, reiniciar) pasó del reto a una pieza común (`components/tubitos/use-board.tsx`), que usan el reto, la práctica y la batalla.
  - Migración `battle_water_sort` (aplicada en Supabase; los avisos de seguridad siguen en cero): Tubitos entra en el `check` de los juegos de las batallas, y cada tablero resuelto guarda sus pasos.
- **Probado:**
  - 9 pruebas automáticas nuevas: las reglas, las consultas y una batalla entera en el servidor, que resuelve los tableros con el motor del juego. Una más para la Secuencia larga.
  - En el navegador, `scripts/qa/battle-tubitos.cjs` con tres celus: 11 de 11 en 390 × 844 y en 360 × 740.
  - Una sala llena, con 10 jugadores, en el celu chico (`scripts/qa/battle-ten.cjs`): 5 de 5.
  - **Tubitos del reto, después de mover su lógica:** la práctica, 15 de 15, con y sin animaciones. Y el reto del día con el reloj del servidor corrido a mañana (arranca el 5/10): los 3 niveles, 4 de 4, y sus casos raros, 3 de 3.
- **Corregido antes de publicar:**
  - el cartel "Esperando a…" se salía del ancho con nombres largos;
  - en la tabla se cortaban los nombres;
  - en el podio no se veía por qué ganaba uno con los mismos puntos;
  - con 10 jugadores, la tira "En vivo" de Cinco Preguntas y de Tubitos no entraba en el celu chico: ahora se desliza de costado, como ya hacían Diez Letras y Secuencia;
  - el historial del grupo daba por terminada cualquier partida empezada hace más de 10 minutos. Con los juegos de antes no pasaba, pero una Secuencia larga entre dos muy buenos se cortaba a mitad. Ahora solo cierra las que terminaron por su reloj (con una prueba que lo confirma).
- **Con esto, las batallas tienen los cinco juegos.**

### 4/10/2026 — Batallas: Secuencia por rondas

- **Lo decidido** (en la tanda de Diez Letras): 3 s más 1 s por color para repetir, y desempate si se equivocan todos los que quedan.
- **Qué se hizo:**
  - La misma secuencia para todos. En cada ronda los colores se prenden a la vez en todos los celus, a la hora del servidor, y cada ronda suma un color.
  - Arriba, una tira "En vivo" con quién sigue y quién ya respondió (nunca si acertó, hasta que cierra la ronda).
  - Quien se equivoca o no responde a tiempo queda afuera, y mira el resto con los colores prendiéndose.
  - **Desempate:** si se equivocan todos los que quedan, juegan la ronda otra vez, con los mismos colores. Después de 3 desempates seguidos comparten el primer puesto, así la partida siempre termina. Esto último lo resolvió Claude: no estaba en la consulta.
  - En el podio, cada uno con el nivel en que quedó afuera.
  - Los cuatro botones del reto pasaron a una pieza común (`components/games/sequence-pads.tsx`).
  - Migración `battle_sequence` (aplicada en Supabase; los avisos de seguridad siguen en cero): si acertó y qué tocó en cada ronda, y hasta 200 rondas por los desempates.
- **Probado:**
  - 13 pruebas automáticas nuevas: las rondas, quién queda afuera, el desempate, el tope de desempates, las consultas y una batalla entera en el servidor (con una respuesta imposible de rápida y alguien que ya estaba afuera).
  - En el navegador, `scripts/qa/battle-sequence.cjs` con tres celus: 8 de 8 en 390 × 844 y en 360 × 740.
  - Las de antes siguen pasando: grupo 8 de 8, casos raros 8 de 8 y Diez Letras 12 de 12.
- **Corregido antes de publicar:** la tira decía "Siguen todos" a quien acababa de quedar afuera, el cartel amarillo del desempate se leía mal, y en el podio del celu chico se cortaba el nivel.
- **Pendiente:** Tubitos en las batallas.

### 4/10/2026 — Batallas: Diez Letras a la par

- **Pedido:** sumar Diez Letras, Secuencia y Tubitos a las batallas en vivo, preguntando antes lo que hiciera falta.
- **Lo que decidió la responsable del producto** (PLAN §8):
  - **Tubitos:** como el reto, con los mismos 3 tableros para todos.
  - **Secuencia:** si los últimos se equivocan en la misma ronda, desempate: la juegan otra vez solo ellos.
  - **Diez Letras:** en el podio se ven las palabras de todos, tocando a cada uno.
  - Las pantallas no necesitan bocetos: se publica cada juego cuando está probado.
- **Lo que propuso Claude, sin objeciones:**
  - en Diez Letras, los mismos 90 segundos sin botón para terminar antes, y los puntos sin el tope de 1.000;
  - en Secuencia, 3 segundos más 1 por color para repetir.
- **Qué se hizo (Diez Letras):**
  - Las mismas 10 letras para todos, nunca las del reto de hoy, que aparecen a la vez cuando termina la cuenta regresiva.
  - Mientras se juega, cada uno ve sus palabras y una tira "En vivo" con los puntos de todos, nunca sus palabras.
  - "¡Tiempo!" a los 90 segundos y, en el podio, las palabras de cada uno, con una estrella en las que encontró uno solo. Las groseras se ocultan para los demás.
  - El teclado es el mismo del reto: se separó en una pieza común (`components/games/letters.tsx`).
  - Una tabla nueva, `game.battle_words` (aplicada en Supabase; los avisos de seguridad quedaron en cero).
  - Cada decisión por juego del servidor, del celu y de la sala pasó a un `switch` que TypeScript controla. Así, sumar Secuencia y Tubitos no puede olvidar ningún lugar.
- **Probado:**
  - 12 pruebas automáticas nuevas: las reglas, las consultas y una batalla entera en el servidor, incluida la palabra grosera oculta.
  - En el navegador, con tres celus, `scripts/qa/battle-letters.cjs`: 12 de 12 en 390 × 844 y en 360 × 740.
  - Las pruebas de antes siguen pasando: grupo 8 de 8 y casos raros 8 de 8.
- **Corregido antes de publicar:** una palabra repetida por un reintento respondía 0 puntos, y el celu mostraba menos de lo que el servidor ya había contado.
- **Pendiente:** Secuencia y Tubitos en las batallas.

### 4/10/2026 — Las batallas, documentadas para seguir

- **Pedido de la responsable del producto:** documentar lo que hicimos y cómo están hechas las batallas en vivo. La idea es poder resumir la conversación y después sumar los otros tres juegos a las batallas.
- **Qué se hizo:**
  - **[BATALLAS.md](BATALLAS.md):** la guía de las batallas por dentro. Explica:
    - la idea: una partida es una cuenta sobre el tiempo, sin un programa corriendo; incluye la línea de tiempo de cada juego;
    - el reloj sincronizado, cada cuánto pregunta el celu, la música y la pantalla prendida;
    - las tablas, el mapa del código y una partida de punta a punta;
    - el juego limpio, las pruebas y las trampas que ya pisamos;
    - qué partes del código dan por hecho que hay dos juegos;
    - el paso a paso para sumar uno;
    - un plan para Diez Letras, Secuencia y Tubitos, con las preguntas que hay que consultar antes.
  - **[`scripts/qa`](../scripts/qa/README.md):** las pruebas en el navegador de las batallas y de Tubitos, más la base local, ahora guardadas en el repo. Antes estaban afuera. Se corren a mano.
  - Enlaces a la guía desde esta bitácora, la arquitectura, el README y las instrucciones del proyecto (`CLAUDE.md`).
- **Probado** con los scripts ya guardados, contra la app en local:
  - la batalla de grupo con 3 celus (Cinco Preguntas, Largada, los podios y la pestaña del grupo): 8 de 8;
  - los casos raros (sala suelta, llegar tarde, revancha, irse y que pase el mando): 8 de 8;
  - la práctica de Tubitos: 15 de 15;
  - el reto de Tubitos responde "SKIP" hasta el lunes 5/10, cuando entra.
- **Visto al documentar:**
  - En el podio de una batalla de grupo, "Batallas ganadas" muestra también a invitados que no son del grupo, y a quien no está en la sala como "Alguien".
  - La pestaña del grupo sí muestra solo a los miembros.
  - Quedó anotado en [BATALLAS §14](BATALLAS.md#14-ideas-para-después).
- **Pendiente:** las batallas de Diez Letras y Secuencia, y decidir si entra Tubitos ([BATALLAS §13](BATALLAS.md#13-los-juegos-de-la-segunda-tanda)); se hicieron ese mismo día.

### 4/10/2026 — Tubitos, el quinto juego

- **Pedido de la responsable del producto:** sumar Tubitos (el clásico "water sort", ordenar colores en tubos), que diseñó con Claude Design. Mandó un zip con la guía, las pantallas y el diseño de referencia, y pidió que le preguntara las dudas antes de empezar.
- **Decisiones (consultadas antes de empezar):**
  - **Rotación:** se siguen jugando 3 retos por día y descansan 2. Cada juego sale 3 de cada 5 días y ninguno descansa dos días seguidos.
  - **Desde cuándo:** al día siguiente de publicarlo, el **lunes 5/10/2026**. Ese día tocan Diez Letras, Largada y Tubitos, así Largada estrena en el reto del día como estaba previsto. En la práctica, desde ya.
  - **Reiniciar y deshacer:** como en el diseño. Reiniciar vuelve los movimientos a 0 y el reloj sigue; hay 3 deshacer por nivel y no descuentan.
  - **Música:** una propia, "Laboratorio".
  - Quedó en [PLAN §2 y §7](PLAN.md#tubitos-decidido-y-construido-el-4102026); lo que cambió respecto del diseño, en [CAMBIOS-AL-DISENO](diseno/CAMBIOS-AL-DISENO.md#tubitos). La guía y las pantallas, en [`docs/diseno/handoff-tubitos`](diseno/handoff-tubitos/TUBITOS.md).
- **Cómo funciona:**
  - **Reto del día:** 3 niveles seguidos, de 6, 8 y 10 tubos. Todos tienen el mismo tablero, con los colores y el orden de los tubos cambiados. El servidor calcula el mínimo de movimientos de cada nivel y entrega el siguiente recién cuando resolviste el anterior.
  - **Puntaje:** 250, 350 y 400 por nivel: 70 % por los movimientos contra el mínimo y 30 % por el tiempo. Lo calcula el servidor, que también cronometra cada nivel por su cuenta, así no sirve trucar el reloj del celu.
  - **Práctica:** niveles sin fin desde el que viene después de tu récord, con "Siguiente nivel", "Volver a Practicar" y "Repetir nivel".
- **Qué se hizo:**
  - **Motor** (`packages/games/src/games/water-sort.ts`): las reglas, el armado de los tableros, el buscador de la solución más corta, la corrección rejugando cada paso, las marcas de juego limpio y el puntaje. El buscador tarda milisegundos y se comprobó contra una búsqueda completa.
  - **Rotación de 5 juegos** (`packages/games/src/lineup.ts`), sin tocar los días anteriores.
  - **Servidor:** `/api/retos/resuelto` (un nivel resuelto, con su recibo) y `/api/retos/nivel` (el siguiente). Migración `water_sort`: la base acepta el juego nuevo.
  - **Pantallas:** el tablero de tubos de vidrio y el vertido animado (el tubo vuela, se inclina con el líquido horizontal y cae el chorro). También los avisos, deshacer y reiniciar, el corcho de cada tubo listo, la victoria de cada nivel (reto y práctica), el resultado con los 3 niveles y la baldosa y el récord en Práctica. Hay versión para tablet y para movimiento reducido.
  - **Sonidos y música:** el gluglú del vertido, el "plop" del corcho y la canción "Laboratorio".
  - El aviso "Hoy Tubitos descansa" dice "Tubitos se estrena mañana" hasta el lunes.
- **Pruebas:**
  - 392 automáticas (43 nuevas): las reglas, el buscador, la corrección y sus marcas, la rotación, las medidas del tablero y el servidor con los 3 niveles.
  - En el navegador, con una prueba que juega sola (lee los tubos de la pantalla y los resuelve):
    - la práctica entera en celus de 390 × 844 y 360 × 740 y en una tablet de 820 × 1180;
    - el reto del día con los 3 niveles y el resultado, con y sin movimiento reducido;
    - salir en la victoria de un nivel (cuenta lo resuelto) y cerrar la app a mitad (cuenta como jugado).
- **Visto al probar:** al empezar un nivel los dos botones se veían apagados y la pantalla parecía trabada (ahora Reiniciar se ve siempre), y la baldosa de Tubitos dejaba un hueco en Práctica (ahora ocupa toda la fila).
- **Pendiente:** decidir si Tubitos entra a las batallas en vivo, sumar el grupo en el juego y en la victoria (segunda vuelta del diseño) y calibrar el puntaje con la beta.

### 4/10/2026 — Batallas en vivo

- **Pedido de la responsable del producto:** poder jugar al mismo tiempo con los del grupo (o con un amigo, en un rato libre) a los juegos de la práctica.
- **Decisiones (consultadas antes de empezar):**
  - **Quiénes:** desde un grupo o con un link, con cuenta, de 2 a 10.
  - **Formato:** un juego, con revancha u otro juego.
  - **Ritmo:** todos a la par.
  - **Qué cuenta:** para divertirse, con historial en el grupo.
  - **Orden:** primero Largada y Cinco Preguntas.
  - **Diseño:** bocetos antes de construir. Los vio en una página con las pantallas y dio el ok.
  - **Vibración:** la de la señal de Largada se mantiene (se preguntó por el juego limpio).
  - Todo quedó en [PLAN §2, §6 y §8](PLAN.md#batallas-en-vivo-decidido-el-4102026).
- **Cómo funciona:**
  - Quien arma la sala elige el juego y la empieza. Hay una cuenta regresiva a la vez en todos los celus.
  - **Cinco Preguntas:** la misma pregunta para todos; se ve quién respondió pero no qué. La correcta aparece cuando respondieron todos (o se terminó el tiempo), con la tabla.
  - **Largada:** las mismas luces se apagan al mismo tiempo en todos los celus; cuando tocaron todos, la carrera corre a la vez en todos. Gana el mejor promedio de 3.
  - Al final, el podio, "Revancha" u "Otro juego", y cuántas batallas ganó cada uno en el grupo.
  - Quien se va no frena a los demás. Quien llega con la partida empezada mira y juega la próxima. Si se va quien la armó, elige el siguiente. Quien la arma puede sacar a alguien.
- **Qué se hizo:**
  - **Reglas** (`packages/games/src/battles.ts`): cuándo abre y cierra cada pregunta y cada largada, y la tabla. El servidor no corre nada entre pedidos: cada pedido calcula dónde va la partida.
  - **Base:** migración `battles` (salas, jugadores, partidas y jugadas) y sus consultas (`packages/db/src/battles.ts`).
  - **Servidor** (`apps/web/src/server/battles.ts`) y 12 endpoints en `/api/batallas`. Las preguntas no repiten las de la sala ni las del reto de hoy.
  - **Celu** (`lib/use-battle.ts`): pregunta seguido según lo que esté por pasar y sincroniza su reloj con el del servidor en cada respuesta.
  - **Pantallas** (`components/battle`): el aviso y la pestaña "Batallas" en el grupo, la tarjeta "Batalla con amigos" en Práctica, la sala, la cuenta regresiva, Cinco Preguntas y Largada a la par, el podio y la página del link (`/b/código`), que deja crear la cuenta y vuelve sola.
  - **Música:** en la sala suena al mismo compás en todos los celus. Durante la partida la pantalla no se apaga.
- **Pruebas:**
  - 349 automáticas (46 nuevas): reglas y tiempos, consultas, y una batalla entera con varios jugadores en el servidor.
  - En el navegador, con tres celus simulados a la vez (390 × 844 y 360 × 740): el aviso del grupo, el link, las 5 preguntas, la tabla, 3 largadas (con una adelantada), los dos podios y el historial. También entrar con la partida empezada, la revancha, irse a la mitad y que pase el mando.
- **Visto al probar:**
  - Con la base de verdad las preguntas elegidas se guardaban mal; la base de prueba no lo mostraba. Corregido como en el resto de las consultas.
  - En el grupo decía "Sumarme" a quien ya estaba adentro, y el aviso duraba demasiado después de que todos se iban. Corregidos.
- **Pendiente:** batallas de Diez Letras y Secuencia, y quizás avisar en el inicio cuando hay una batalla en un grupo tuyo.

### 4/10/2026 — Música

- **Pedido de la responsable del producto:** una melodía en loop para el menú y otra para cada juego, que tengan que ver con cada uno ("en Largada, una más rápida o intensa que en la trivia"). La escuchó en una página de prueba antes de sumarla, y dio el ok.
- **Las cinco melodías** (`lib/music.ts`, hechas con código como los sonidos):
  - **Menú, "Plaza":** alegre, con aire de cumbia, a 104 por minuto.
  - **Diez Letras, "Ingenio":** marimba juguetona y tranquila, a 96.
  - **Cinco Preguntas, "Concurso":** suspenso de programa de preguntas, a 112.
  - **Largada, "Carrera":** la más rápida e intensa, a 150.
  - **Secuencia, "Memoria":** calma, con un reloj de fondo, a 84.
- **Cómo funciona:**
  - Suena la del menú en el inicio, la práctica, el ranking, los grupos y el perfil. Cada juego pone la suya desde la pantalla de antes de empezar.
  - Al cambiar de pantalla pasa de una a otra con un fundido corto, y entre menús no se corta.
  - Va más baja que los efectos y baja más mientras suena una cortina o el puntaje.
  - En Largada baja mientras se prenden las luces y no cambia en la señal, así no avisa cuándo largar. En Secuencia baja mientras se muestra la secuencia.
  - Se pausa cuando la app queda en segundo plano.
  - El parlante de los juegos apaga todo. En el perfil, "Música" la apaga y deja los efectos.
- **Pruebas:** 303 automáticas (6 nuevas: cada compás de cada canción arranca a tiempo y sin errores de audio). En el navegador:
  - no suena nada antes del primer toque, y después arranca la del menú;
  - sigue entre menús sin cortarse, cada juego tiene la suya y al salir vuelve la del menú;
  - el parlante y el perfil la apagan, y se pausa en segundo plano.

### 3/10/2026 (noche) — Sonido

- **Pedido de la responsable del producto:** sumarle música y sonidos a la app y a los juegos.
- **Decisiones (consultadas):**
  - Los efectos se **arman con código**, sin archivos ni licencias. Desde la sesión no se puede entrar a las bibliotecas de sonidos.
  - **Música:** solo cortinas cortas (al cerrar el día, al batir un récord y al ganar la corona), sin música de fondo.
  - Arranca **prendido** para todos, respetando el modo silencio del iPhone.
  - **En Secuencia cada color tiene su nota, también en el reto del día**, aunque quien juega con sonido recuerde más fácil.
  - **La señal de Largada sigue en silencio:** con un sonido, quien tiene el volumen prendido reaccionaría unos 40 ms antes (80 puntos).
  - Quedó en [PLAN §2 y §6](PLAN.md#2-decisiones-tomadas).
- **Qué se hizo:**
  - **Los sonidos** (`lib/synth.ts`):
    - Diez Letras: letras que suben de nota, borrar, mezclar, palabra que vale (más notas si es larga), la de 10 letras, repetida, no vale, el reloj y el fin del tiempo.
    - Cinco Preguntas: llega la pregunta, correcta (con una nota más si fue rápida), incorrecta y el reloj.
    - Secuencia: una nota por color, nivel superado y "te equivocaste".
    - Largada: las luces, los autos que largan después de tu toque y el puesto.
    - Los resultados: el puntaje que cuenta y cómo termina.
    - Las cortinas: récord, día cerrado y corona.
  - **El parlante** (`lib/sound.ts`): se abre con el primer toque, no satura aunque suenen varios juntos y no corta la música del celu. Hay un botón con un parlante al lado de la cruz en cada juego, y "Sonido" en el perfil ("En este celu").
  - **Página para escucharlos** antes de publicar: un artifact con todos los sonidos, juego por juego.
- **Pruebas:** 297 automáticas (23 nuevas: cada sonido arranca cuando debe, dura lo que dice y no rompe el audio del navegador). En el navegador se comprobó que cada sonido sale en su momento, que la señal de Largada no suena, que el parlante los apaga y se recuerda, y el nivel de cada uno, sin saturar.
- **Visto al probar:** "Mezclar" y "Llega la pregunta" casi no se oían, y la cortina de "Cerraste el día" duraba más de lo que decía. Las tres cosas se corrigieron.

### 3/10/2026 (noche) — Bots en Largada

- **Pedido de la responsable del producto:** que en la práctica de Largada aparezcan bots, para no correr en solitario.
- **Decisiones (consultadas):**
  - En la práctica, los bots **siempre completan la pista**: primero los del grupo que corrieron hoy (o el fantasma) y después los bots, hasta 5 autos.
  - Cada bot tiene **su nivel**: Rayo es muy rápido (unos 212 ms), Chispa y Turbo van parejos (unos 245 y 260), y Tortuga es lento (unos 305) y a veces se adelanta.
  - En el **reto del día** también, pero solo si te toca correr solo. No cambian el puntaje ni aparecen en el podio del grupo.
  - Quedó en [PLAN §7](PLAN.md#largada-reemplaza-a-reflejos-decidida-y-construida-el-3102026).
- **Qué se hizo:**
  - Los bots tienen su personaje y su auto (Rayo dorado, Chispa coral, Turbo azul y Tortuga verde). En la parrilla llevan "bot" arriba del nombre.
  - Sus tiempos salen de una semilla. En la práctica cambian en cada partida; en el reto del día dependen del día y del jugador, así la foto de llegada sale igual en otro celu.
- **Pruebas:** 274 automáticas (6 nuevas: quién entra según el lugar libre, que la misma semilla da la misma carrera y que cada bot mantiene su nivel). Probado en local sin cuenta, en un grupo con una sola amiga que corrió (ella más tres bots) y en el reto del día sin nadie, en 390 y 360 px.
- **Visto al probar:** en la foto, "1º Rayo" no entraba y quedaba solo "1º"; y en celulares angostos "Tortuga" se cortaba en la parrilla. Los dos, corregidos.

### 3/10/2026 (noche) — Largada

- **Pedido de la responsable del producto:** reemplazar Reflejos por **Largada**, un juego de reflejos con autos que diseñó en Claude Design (`docs/diseno/handoff-largada`). Las decisiones se consultaron antes de empezar (ver la entrada de la tarde y [PLAN §7](PLAN.md#largada-reemplaza-a-reflejos-decidida-y-construida-el-3102026)).
- **Cómo se juega:**
  - Se prenden las cinco luces de a una y, después de una espera propia de cada jugador, se apagan todas juntas: hay que tocar.
  - Son 3 largadas. Los autos corren contra los tiempos que hizo hoy tu grupo, un carril por amigo (hasta 5 con vos).
  - El puntaje sale del promedio: 1.000 con 200 ms; adelantarse cuenta 450 ms y no tocar, 700.
- **Qué se hizo:**
  - **Motor** (`packages/games/src/games/largada.ts`): genera las esperas, corrige y marca lo sospechoso: menos de 100 ms, tres tiempos casi iguales, o terminar antes de lo que tardan las luces.
  - **Por fecha:** el reto del día es Largada desde el **4/10/2026** (`LARGADA_FROM`), así el Reflejos del 3/10 no cambia. La práctica ya es Largada.
  - **Servidor:** `GET /api/largada` arma la parrilla de hoy: quiénes corrieron en el grupo, con sus tiempos, quién tiene carril, quiénes no jugaron y quién tiene la corona. Sin grupo o sin rivales, el fantasma: el mejor del día de tu localidad o del país.
  - **Pantallas** (diseños 01 a 06):
    - Parrilla de hoy, con el chip para cambiar de grupo.
    - Pista con las luces, el cielo que se oscurece, "¡LARGÁ!" en turquesa, la carrera y la tabla de llegada.
    - Resultado con la foto de llegada, el podio del grupo y la franja "¡Le sacaste la corona a Tincho!".
    - "Contale al grupo" comparte la foto como imagen y el texto. Si el celu no puede, abre WhatsApp con el texto.
  - **Detalles:** sonido de cada luz (respeta el modo silencio del iPhone), vibración en Android y movimiento reducido. Pantallas bajas: carriles más chicos y sin el pie de texto.
  - **Lo distinto del diseño**, en [CAMBIOS-AL-DISENO.md](diseno/CAMBIOS-AL-DISENO.md#largada). Por ejemplo, el fantasma del país cuando no verificaste tu lugar, y la foto que achica las diferencias grandes para que entren todos los autos.
  - **El récord de práctica de Reflejos arranca de cero:** era de otro juego.
- **Pruebas:**
  - 268 automáticas (23 nuevas): motor, puntajes y marcas, la parrilla con el grupo, los carriles y el fantasma, la carrera y los textos.
  - Probado de punta a punta en local con un grupo de 6 y 4 largadas de ejemplo, en celulares simulados de 390 × 844 y 360 × 640, con movimiento reducido y sin grupo. También compartir, cambiar de grupo y que el Reflejos de hoy siga como antes.
- **Visto al probar y corregido:**
  - En la foto, los autos que llegaron lejos quedaban cortados contra el borde.
  - El aviso "Te adelantaste" salía corrido y cortado en la pantalla.
  - En la foto compartida, las etiquetas se salían de su píldora porque la imagen no tenía las letras de la app.
  - El control de "terminó demasiado rápido" era 200 ms por largada más estricto que el juego real.

### 3/10/2026 (tarde) — Tu lugar y rankings por barrio, provincia y país

- **Pedido de la responsable del producto:** competir por barrio, por provincia y por país, y que la corona diga el nombre: "Sos El Mejor de tu barrio, Caballito", "…de tu país, Argentina".
- **Decisiones (consultadas):**
  - Hay corona de **barrio o localidad, de provincia y de país**, cada una con su nombre ("¡Sos El Mejor de la Ciudad de Buenos Aires!"). Por ahora **se entregan solas**.
  - Para **ganar la corona** de un lugar hay que haber **verificado la ubicación esa misma semana**. Si quien va primero no lo hizo, pasa al siguiente que sí.
  - El lugar se **cambia cuando quieras**, con el GPS confirmando el nuevo. Lo jugado antes queda en el lugar viejo.
  - Quedó en [PLAN.md](PLAN.md) (§2, §4, §5 y §6).
- **Qué se hizo:**
  - **Reglas de ubicación** (`packages/shared/src/places.ts`):
    - Vale estar a menos de 12 km del centro de la localidad. En el campo, que la localidad más cercana sea del mismo partido y esté a menos de 40 km.
    - En la Ciudad de Buenos Aires, que el barrio sea uno de los 3 más cercanos y esté a menos de 4 km. La "Ciudad de Buenos Aires" genérica de Georef no se ofrece.
    - Precisión de 5 km o menos, conexión desde Argentina y 20 intentos por hora como mucho.
    - Los nombres de la corona: "la Ciudad de Buenos Aires", "Tierra del Fuego".
  - **Base de datos:** migración `20261003213448_places`, aplicada en Supabase. Suma cuándo se verificó el lugar de cada cuenta (`users.place_verified_at`), el resultado de cada verificación (`location_checks`, nunca las coordenadas) y las semanas ya decididas de cada lugar (`place_weeks`). Los avisos de seguridad de Supabase quedaron limpios.
  - **Servidor y API** (detalle en [ARQUITECTURA §5 y §6](ARQUITECTURA.md#5-lugares-y-verificación-de-ubicación)):
    - Elegir y verificar el lugar (`/api/lugar`, `/cercanos`, `/verificar`, `/buscar`, `/provincias`).
    - El ranking de hoy y de la semana de cada nivel, con la corona en vivo (`/api/ranking`), y el puesto de hoy en los tres niveles (`/api/ranking/hoy`).
    - El cierre de las coronas de lugar el lunes, al mirar, como en los grupos.
    - Cada reto guarda el lugar al empezar, si está verificado. Al verificar, entra lo jugado esa semana.
  - **Pantallas** (lo distinto del diseño, en [CAMBIOS-AL-DISENO.md](diseno/CAMBIOS-AL-DISENO.md)):
    - **Tu lugar** (`/cuenta/lugar`, diseños 19 a 23): primero "Usar mi ubicación" (las localidades de alrededor, y con un toque queda verificada) o "Buscar a mano". Pantallas de verificar, verificada, GPS denegado (con los pasos del iPhone o de Android), fuera de tu zona y otros casos: poca precisión, otro país, muchos intentos, sin localidades cerca.
    - Es el **"Paso 2 de 2"** al crear la cuenta, salvo para quien viene de una invitación a un grupo. También se abre para cambiar el lugar y para el chequeo de la semana (`?verificar=1`).
    - **Ranking** (24 y 25): chips de barrio o localidad, provincia y país, Hoy / Semana, podio con la corona en quien la tiene, tu fila fija y la tarjeta de "sos el único".
    - **Inicio:** arriba el lugar (o "Elegí tu lugar"), y las tarjetas "Hoy en Chivilcoy #6 de 312" y "Semana 40 #9".
    - **Resumen del día:** el puesto de hoy en los tres niveles.
    - **Perfil:** "Tu lugar" con "Cambiar", y el palmarés con las coronas de lugares. El festejo de una corona de lugar lleva a "Ver el ranking".
  - **Pruebas:** 245 automáticas (38 nuevas). Cubren la verificación con coordenadas reales de Georef, elegir y mudarse, el ranking de cada nivel con la corona del primero que verificó, los puestos del día y las coronas de barrio, ciudad y país con fechas simuladas.
- **Probado de punta a punta** en local, con barrios y pueblos reales en la base local (`supabase/scripts/places-sample.sql`):
  - API: 36 controles. Cubren elegir con el GPS y a mano, verificar desde lejos y desde ahí, mudarse, el campo, otro país, poca precisión, los rankings y los puestos.
  - Pantallas en celulares simulados de 390 y 360 px, con el GPS simulado: 22 recorridos sin errores. También la corona en vivo cuando quien va primero no verificó.
- **Visto al probar:** si tenés la corona sin ir primero, la banda dorada ahora explica por qué: "Turista suma más, pero no verificó esta semana".
- **Largada** (pedido de la misma tarde): la responsable del producto mandó el diseño de un juego nuevo de reflejos, una largada de autos contra los tiempos de tu grupo. Antes de empezar se consultó y quedó decidido:
  - Primero se publica Tu lugar y después se hace Largada.
  - La espera de las luces es distinta para cada jugador, para que nadie le pase a otro cuándo se apagan.
  - Cada auto tiene el color de su personaje.
  - Se corre contra el último grupo que abriste, con un chip para elegir otro.
  - Todo quedó en [PLAN §7](PLAN.md#largada-reemplaza-a-reflejos-decidida-y-construida-el-3102026), y el diseño en [`docs/diseno/handoff-largada`](diseno/handoff-largada/LARGADA.md).

### 3/10/2026 (tarde) — Grupos y corona en vivo

- **Decisiones de la responsable del producto:**
  - Los **grupos van primero**, antes que el lugar y el ranking.
  - **Corona en vivo:** durante la semana la corona la tiene quien más puntos tiene; si el jueves otro lo pasa, la corona pasa a él. Sin mínimo de días; en un empate la conserva quien llegó primero. Vale para los grupos y, después, para los lugares.
  - Corona de los grupos desde la primera semana: la del 5 al 11/10, que se entrega el lunes 12/10.
  - Para cuando llegue **Tu lugar**: los puntajes sin verificar entran al ranking del lugar recién al verificar (lo de esa semana); la localidad se elige con el GPS en un toque (las cercanas) o a mano; en la Ciudad de Buenos Aires se compite por barrio.
  - Todo quedó en [PLAN.md](PLAN.md) (§2, §4, §5 y §8).
- **Grupos** (pantallas 31 a 34):
  - Crear con nombre, emblema y color; hasta 50 miembros.
  - Invitar con link o código ("LABURO-7K2Q") que vence a los 7 días.
  - Ranking Hoy y Semana con podio, y "Miembros y ajustes" para sacar a alguien, irse o editar el grupo.
  - Página de invitación `/g/código`: "Crear mi cuenta y sumarme" vuelve con la cuenta creada y se suma sola.
- **Corona:** en vivo en el podio, en "Mis grupos" (borde dorado y corona) y con avisos "te sacó la corona" / "le sacaste la corona". Se decide al cerrar la semana (lunes 00:10), la primera vez que alguien mira, sin tareas programadas. Festejo el lunes (pantallas 28 y 29) y palmarés en el perfil.
- **Base de datos:** migración `20261003160200_groups` aplicada en Supabase (tablas `groups`, `group_members`, `crowns` y `group_code_failures`). Los avisos de seguridad de Supabase quedaron limpios.
- **Pruebas:**
  - 207 automáticas (52 nuevas): reglas de la corona en vivo, nombres de grupo, invitaciones, límites, quién puede hacer qué y el cierre de la semana con fechas simuladas.
  - Prueba de punta a punta de la API contra una base local: 30 controles.
  - Recorridos en celulares simulados de 390 y 360 px, también con la corona en vivo y el festejo.
- **Visto al probar:** en el festejo, los botones sobre las nubes no se leían; ahora van sobre una franja blanca.

### 3/10/2026 — Diez Letras

- **Pedido de la responsable del producto:** botones más grandes y que respondan al tipear rápido, 10 letras para que haya más palabras, y más puntos por palabra, porque 1.000 parecía imposible.
- **Decisiones (consultadas):**
  - El juego pasa a llamarse **Diez Letras**.
  - Las letras salen siempre de una palabra escondida que usa las 10, y encontrarla da 300 de premio.
  - Puntos fijos por largo: 25, 50, 80, 120, 160 y 220 (para 8 letras o más). Tope 1.000.
- **Botones:** dos filas de 5, de 64 px de alto (antes, 7 en una fila de 45 px de ancho). Responden apenas se apoya el dedo, no al levantarlo, y sin zoom por doble toque. Probado con toques cada 25 ms: no se pierde ninguno.
- **Diccionario:** de 3 a 10 letras (365.648 palabras) y 172 palabras escondidas de 10 letras elegidas a mano (animales, comidas, escuela, oficios, lugares del país…).
- **Desde cuándo:** el reto del día usa Diez Letras desde el **4/10/2026**. Los días anteriores siguen con Siete Letras, para que un reto no cambie después de empezado. Se comprobó que los retos de 7 letras salen idénticos al código anterior. La práctica ya usa Diez Letras.
- **Rendimiento:** con un diccionario cuatro veces más grande, las búsquedas usan máscaras de letras, y el reto del día se arma una sola vez por día y no una por jugador.
- **Pruebas:**
  - 155 automáticas.
  - Las nuevas comprueban el cambio de reglas por fecha y los puntos por largo.
  - Recorridos en celulares simulados de 390 y 360 px: botones de 64 × 64 y 58 × 64, y el resultado con las 10 letras sin desbordar.
- **Visto al probar:** el diccionario acepta palabras poco conocidas y conjugaciones, como ADRAN o AES (ya pasaba con Siete Letras). Quedó como pregunta abierta.

### 3/10/2026 — Siete Letras sin esperar la verificación

- **Pedido de la responsable del producto:** jugando con conexión lenta, Siete Letras no dejaba seguir hasta que el servidor confirmaba cada palabra.
- **Cambio:** la palabra aparece al instante en "Tus palabras" (la última, primera), en gris con puntitos, y se puede seguir armando otras. Cuando llega la respuesta muestra sus puntos o un círculo rojo si no vale.
- **Avisos:** arriba quedan solo los instantáneos ("muy corta" y "ya la mandaste") y el festejo de la de 7 letras.
- **Sin conexión:** la palabra se vuelve a verificar sola (hasta 3 veces). Si no se pudo, cuenta igual al final, porque el puntaje lo calcula el servidor con todo lo enviado. Probado con una conexión lenta simulada y con la conexión cortada.

### 3/10/2026 (noche) — Cuentas y dirección propia

- **Decisiones de la responsable del producto:**
  - La dirección es `game.lipesolutions.com`, porque "El Mejor de" puede no ser el nombre definitivo.
  - Cuentas con **apodo y contraseña**, "tipo invitado", más fáciles y sin email. Después se va a poder vincular Google para no perder la cuenta.
  - Las jugadas raras de Reflejos y Secuencia del 3/10 fueron pruebas suyas: no había error.
- **Dominio:** agregado al proyecto de Vercel, y la responsable del producto cargó el registro CNAME en Namecheap.
- **Cuentas propias en la base**, en vez de Supabase Auth: con apodo y contraseña no aporta, y así no hay nada que configurar en su panel.
  - Tablas `game.users`, `game.sessions` y `game.auth_events`.
  - Contraseñas con scrypt y sesión en una cookie httpOnly de 90 días.
  - Límites contra intentos y cuentas en masa.
  - Lista de palabras prohibidas y nombres reservados para los apodos.
  - Detalle en [ARQUITECTURA §4, "Cuentas"](ARQUITECTURA.md#cuentas).
- **Reglas de juego con cuenta:**
  - Cada reto se juega una vez por cuenta.
  - "Uno por navegador" quedó solo para jugar sin cuenta, así una familia que comparte el celu juega cada uno con la suya.
  - Al crear la cuenta pasa lo jugado ese día en ese navegador; al entrar a una cuenta existente, no se suma nada de lo jugado sin cuenta.
- **Pantallas:**
  - Crear cuenta (17), apodo y personaje (18) con contraseña y El / La Mejor, entrar, y perfil con racha, días, mejor día, semana y récords.
  - Editar personaje.
  - "Entrar" en la primera visita.
  - Saludo con el apodo y el personaje propio en el inicio.
  - "Crear cuenta" en el resumen.
  - Aviso en el reto si el celu conoce una cuenta y no entraste.
  - Los cambios al diseño están en [CAMBIOS-AL-DISENO.md](diseno/CAMBIOS-AL-DISENO.md).
- **Pruebas:**
  - 146 pruebas automáticas, de las cuales 42 son nuevas.
  - Prueba de punta a punta de la API contra una base local: 31 controles.
  - Recorridos en celulares simulados de 390 y 360 px.
- **Migraciones:**
  - `20261003050012_accounts`: aplicada.
  - `20261003050100_attempts_device_rule`: borra el índice viejo de "uno por navegador". Supabase pide confirmación al borrar, así que la responsable del producto la corrió en el SQL Editor y después se anotó en el historial de migraciones.

### 3/10/2026 — Publicación y base de datos

- **Vercel:** la responsable del producto importó el repositorio (proyecto `el-mejor-de-web`) y cargó `CHALLENGE_SECRET`. Jugó los retos del día en el celu y anduvo bien.
- **Compartir:** el link ahora usa la dirección donde corre la app (antes apuntaba a un dominio que todavía no existe).
- **Supabase:** se creó una organización propia, "el mejor de", separada de Yendo, con un proyecto en São Paulo, la Data API apagada y RLS automático.
- **Tablas:** esquema privado `game` con `places` (lugares) e `attempts` (intentos), un rol `app_server` con permisos mínimos (no puede borrar) y Row Level Security. Migraciones aplicadas: `20261003032448_game_schema` y `20261003035104_game_schema_advisor_fixes`.
- **Un solo intento de verdad:** el servidor registra cada reto del día. No se puede empezar dos veces ni corregir dos veces; en la trivia, pedir de nuevo una pregunta no reinicia el reloj; un reto abandonado cuenta con 0; si el celu "olvidó" un reto ya jugado, se muestra el resultado guardado. Probado de punta a punta contra una base local.
- **Lugares:** 24 provincias, 529 departamentos y 4.037 localidades de Georef (datos.gob.ar), cargados desde adentro de la base con `supabase/scripts/import-places.sql`.
- **Conexión:** `DATABASE_URL` cargada en Vercel (producción), con TLS. `/api/estado` confirma la conexión desde São Paulo.
- **Avisos de Supabase:** se corrigió el `search_path` de `game.search_name` y se agregó un índice; los demás avisos son de tablas nuevas.

### 2/10/2026 — Plan, diseño y app jugable

- **Plan:** entrevista con la responsable del producto, [PLAN.md](PLAN.md) (producto y reglas) y [ARQUITECTURA.md](ARQUITECTURA.md) (técnica).
- **Diseño:** brief y prompts para Claude Design. Volvió con 40 pantallas, el sistema de diseño y los personajes; quedó guardado en `docs/diseno/handoff`.
- **Decisiones al ver el diseño:** puntajes del plan, semana con los 5 mejores días, "El / La Mejor" al crear la cuenta, nombre provisorio "El Mejor de" y subdominio de lipesolutions.com.
- **Monorepo:**
  - `packages/games`: motor de los 4 juegos, con detección de trampas.
  - `packages/shared`: calendario argentino y reglas de la corona.
  - `packages/content`: diccionario y preguntas.
  - `apps/web`: Next.js 16.
- **API de retos autoritativa:** tokens firmados; el celu nunca recibe las respuestas.
- **Pantallas:** todas las del diseño que no necesitan cuentas.
- **Pruebas visuales** en celulares simulados (390 y 360 px de ancho, y con la barra del navegador). En pantallas bajas el inicio se compacta para que "Jugar" siempre se vea.
- **Tipografías incluidas en el proyecto:** Google Fonts rompía el build en GitHub.

## Pendientes y próximos pasos

En orden sugerido.

1. **Probar una batalla en vivo** (responsable del producto), con alguien al lado o por WhatsApp:
   - Desde el grupo, "Batalla en vivo · Armar", o desde Práctica, "Batalla con amigos".
   - Una de Cinco Preguntas, una de Largada y una de Diez Letras. Ver si las luces se apagan a la vez en los dos celus, si la tabla se entiende, si la música suena junta y si en Diez Letras se entienden los puntos en vivo y las palabras del podio.
   - Y una de Secuencia (que los colores salgan a la vez en los dos celus, que se entienda quién quedó afuera y el desempate) y una de Tubitos (si los tiempos máximos de cada tablero están bien).
2. **Probar en el celu** (responsable del producto):
   - **Personajes 2.0:** elegir uno de los bichos nuevos en Perfil → tu personaje, y mirar el saludo del inicio, los podios y las filas del ranking.
   - **Grupos:** crear uno, mandar el link por WhatsApp a alguien y que se sume (también sin cuenta, creándola desde el link).
   - **Diez Letras:** ya está en la práctica, y mañana (4/10) sale el primer reto del día con 10 letras.
   - Salir y volver a entrar a la cuenta.
   - Al probar las cuentas dijo que notó "2 cosas" y contó una (Siete Letras con conexión lenta). Si la otra no era lo de los botones, retomarla.
3. **El lunes 12/10, la primera corona de los grupos:** revisar que se haya entregado bien (festejo y palmarés).
4. **Probar Largada en el celu** (responsable del producto): ya está en Practicar, y el lunes 5/10 sale el primer reto del día. Mirar el sonido de las luces, que se lea la señal y que "Contale al grupo" mande la foto por WhatsApp.
   - Para una segunda vuelta: la tarjeta "Pato todavía no largó · Desafiá a Pato" (opción 1c del diseño).
5. **Probar Tu lugar en el celu** (responsable del producto): en Perfil → Tu lugar, "Usar mi ubicación", y después el ranking de los tres niveles.
6. **El editor de personaje** (cuando llegue su paquete de Claude Design): las 4 pestañas para elegir ojos, pelo, marcas, ropa, el accesorio de cada zona y el fondo del avatar. El dibujo y los datos ya están.
7. **Vincular con Google** (botón "Muy pronto" en el perfil):
   - Hay que crear una credencial OAuth en Google Cloud (Client ID web, con `game.lipesolutions.com` como origen).
   - La idea es usar "Sign in with Google" y verificar el token en el servidor.
   - Se suman también "cambiar contraseña" y "borrar cuenta".
8. **Para decidir** (responsable del producto; están en [PLAN §13](PLAN.md#13-preguntas-abiertas)):
   - Revisar las 106 preguntas de trivia y la lista de palabras prohibidas en apodos y nombres de grupo.
   - Si en Diez Letras valen solo palabras conocidas (hoy valen ADRAN o AES).
   - Qué hacer con las contraseñas olvidadas sin Google.
9. **Antes de abrir al público:**
   - Términos y privacidad.
   - Consulta legal sobre menores.
   - Modo sin conexión (PWA).
   - Plan Pro de Supabase, porque el gratis se pausa tras una semana sin uso.

## Aprendizajes técnicos

Para no tropezar dos veces:

- **iPhone y los campos de texto:** con letra de menos de 16 px, Safari hace zoom al tocar el campo. Los campos de búsqueda van en 16 px.
- **JSON y listas a la base:** van como texto y se convierten en SQL (`$1::text::jsonb`). Si no, postgres.js guarda el texto como un string de JSON. PGlite, la base de las pruebas, no lo muestra: solo aparece con la base de verdad (pasó con las batallas).
- **Batallas:** cada decisión por juego es un `switch` que TypeScript controla (desde Diez Letras): al sumar un juego a `BATTLE_GAMES`, marca cada lugar que falta. Antes de sumar uno, leé [BATALLAS §9 y §11](BATALLAS.md#9-dónde-se-decide-qué-hace-cada-juego).
- **País de la conexión:** Vercel lo manda en el encabezado `x-vercel-ip-country`. En local no viene, y entonces no se controla.
- **Red de la sesión en la nube:**
  - No llega a datos.gob.ar ni a `*.vercel.app`. Los datos de Georef se bajan desde la base (extensión `http`, que se apaga al terminar).
  - La app publicada se revisa con las herramientas de Vercel, que no abren el dominio propio: hay que usar `el-mejor-de-web.vercel.app`.
  - Las consultas DNS por HTTPS están bloqueadas. Para ver si un registro ya propagó sirve `getent hosts game.lipesolutions.com`.
- **Playwright en la sesión en la nube:** Chromium ya está instalado. Se usa con `require("/opt/node-tools/node_modules/playwright")` y `--no-sandbox`. Los radios ocultos (`sr-only`) se tocan por su `label`.
- **Supabase desde Claude (MCP):**
  - Los comandos que borran (`drop`, `truncate`, `delete`) esperan la confirmación del dueño y se cortan a los 60 s. Conviene hacerlos desde el SQL Editor.
  - Cualquier pedido de más de 60 s también se corta: hay que partirlo en pasos.
  - Los conectores se autorizan por organización (Supabase) y por proyecto (Vercel). Después de reconectarlos, la sesión los vio sin reiniciar.
- **Pooler de Supabase:** la dirección (`aws-0`, `aws-1`…) no se deduce de la región; se copia del botón **Connect**.
- **Next.js 16 y Google Fonts:** Outfit llega con enlaces que Turbopack no procesa, así que las tipografías van incluidas en el proyecto.
- **postgres.js:** codifica dos veces un parámetro `jsonb`. Hay que mandar el JSON como texto y convertirlo en SQL (`$1::text::jsonb`).
- **React 19 y su lint:** nada de `setState` sincrónico dentro de un efecto. El `localStorage` se lee después de montar, con `useSyncExternalStore` y `useMemo`.
- **Vercel:** un cambio en las variables de entorno necesita volver a publicar.
- **Migraciones con `drop`:** por el MCP quedan esperando la confirmación del dueño y se cortan. Conviene ponerlas en una migración aparte, para que lo demás se aplique igual, y correr el `drop` desde el SQL Editor.
- **React y `useSyncExternalStore`:** la cuenta guardada en el navegador se lee con un hook que devuelve `undefined` hasta montar, así las pantallas no parpadean entre "sin cuenta" y "con cuenta".
- **Toques rápidos en el celu:**
  - `click` llega al levantar el dedo y se pierde cuando los toques se pisan. Los botones de los juegos actúan en `pointerdown` (con `preventDefault`) y dejan `click` solo para el teclado (`event.detail === 0`).
  - `touch-manipulation` saca el zoom por doble toque.
- **Cambiar reglas o puntajes de un juego:** los retos del día se regeneran desde la semilla. Cambiar las reglas sin más cambiaría retos ya jugados, así que van por fecha (ver "Reglas por fecha" en [ARQUITECTURA, "Contrato de cada juego"](ARQUITECTURA.md#contrato-de-cada-juego)). Las pruebas que dependen de las reglas viejas las pasan explícitas.
- **Vitest en `apps/web`:** la configuración es `vitest.config.mts`, porque con `.ts` avisa por ESM. Además reemplaza `server-only` por un módulo vacío, porque fuera de Next.js tira error.
- **Base local con PGlite:** atiende todas las conexiones con un solo motor y mezcla las consultas que llegan juntas por conexiones distintas ("bind message supplies 1 parameters…"). Con `DATABASE_POOL_MAX=1` el servidor usa una sola conexión. En Supabase no pasa.
- **Reloj único:** las filas que dependen del momento (entrar a un grupo, salir, invitaciones, códigos fallidos) se graban con la hora del servidor web y no con `now()` de la base. Así las pruebas pueden simular fechas, como el cierre de una semana.
- **React en desarrollo corre cada efecto dos veces.** Algo que se hace una sola vez (sumarse al volver de crear la cuenta) borra su marca al empezar y no depende de que el efecto siga vivo para terminar.
- **React Compiler y su lint de pureza:** si una función que llama a `Date.now()` usa objetos armados durante el render, el lint la toma como si corriera en el render. Esos valores se arman adentro de la función, con lo que hay en el estado.
- **Tailwind 4 y `translate`:** `-translate-x-1/2` usa la propiedad `translate`, que se suma al `transform` de una animación. Un elemento que ya se centra con la animación queda corrido.
- **De SVG a imagen:** al pasar un SVG a PNG no llegan las clases ni las tipografías de la página. Cada texto se lleva su letra como atributo y las tipografías van adentro, como datos.
- **Compartir con Web Share:** la hoja de compartir se abre solo en el mismo toque. La imagen se prepara antes, y el toque llama a `navigator.share` directo; si el celu no comparte archivos, el mismo botón es un link a WhatsApp.
- **Probar Largada en local un día anterior al 4/10:** cambiar por un rato `LARGADA_FROM` (y `FIRST_CROWN_WEEK`, para la franja de la corona) y volverlos antes de guardar el cambio.
- **Formato del código:** el proyecto no usa Prettier (las líneas son largas, a mano); no correrlo sobre los archivos.
