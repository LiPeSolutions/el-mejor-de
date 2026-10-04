# El Mejor de — Arquitectura técnica

> Documento vivo. Acompaña a [PLAN.md](PLAN.md): allá está el *qué* y el *por qué*; acá, el *cómo*.
> Lo marcado como *(propuesta)* todavía no está confirmado.

## 1. Stack

| Capa | Elección | Por qué |
|---|---|---|
| Web app | **Next.js** (App Router) + **React** + **TypeScript** | Frontend y API en un solo proyecto; genera las imágenes para compartir (Open Graph) y se despliega de forma nativa en Vercel. |
| Estilos | **Tailwind CSS** | Rápido para iterar un diseño mobile-first. |
| PWA | Manifest + service worker (**Serwist**) | Instalable sin tiendas, tolera mala conexión y permite notificaciones push (etapa 1.5). |
| Hosting | **Vercel Pro** (ya contratado) | Deploys automáticos desde GitHub, previews por PR, crons y headers de geolocalización por IP. |
| Base de datos | **Supabase Postgres** + **PostGIS** | SQL para rankings (funciones de ventana) y PostGIS para verificar ubicaciones contra polígonos. |
| Cuentas | **Propias, en la base** (apodo y contraseña con scrypt, sesión en una cookie httpOnly) | La cuenta no usa email, así que Supabase Auth no aporta: así no hay nada que configurar en su panel y todo se prueba en local. Google se suma después, solo para vincular la cuenta. |
| Emails | **Ninguno por ahora** | Las cuentas no usan email. Si algún día se suma, Resend como servicio de envío. |
| Anti-bots | **Cloudflare Turnstile** *(propuesta)* | Captcha invisible al registrarse, si los límites por navegador y por conexión no alcanzan. |
| Tests | **Vitest** (lógica) + **Playwright** (punta a punta) | La lógica de juegos y puntajes tiene que estar muy bien testeada. |
| Tiempo real | **Batallas:** el servidor fija la hora de cada momento y los celus preguntan seguido, con el reloj sincronizado (ver §4, "Batallas en vivo"). **Truco (etapa 2):** a definir, **Colyseus** en Fly.io/Railway o **Cloudflare Durable Objects** | Las batallas andan con lo que ya hay (Vercel y Supabase), sin otro servicio. El truco necesita un servidor autoritativo con estado oculto por jugador. |

## 2. Estructura del repositorio

Monorepo con **pnpm workspaces**. Los paquetes internos se llaman `@repo/*` (independiente de la marca) y exportan TypeScript directo: Next.js (Turbopack) los compila sin un build propio.

```
el-mejor-de/
├── apps/
│   └── web/            # Next.js 16: pantallas, API (route handlers) y crons
├── packages/
│   ├── games/          # @repo/games: lógica pura de los minijuegos (cliente y servidor)
│   │                   #   y @repo/games/server: semillas secretas (solo servidor)
│   ├── shared/         # @repo/shared: calendario argentino y reglas de la competencia
│   ├── content/        # @repo/content: diccionario y preguntas de trivia
│   ├── db/             # @repo/db: consultas a la base de datos (probadas con PGlite)
│   └── truco/          # (etapa 2) Motor de reglas del truco
├── supabase/
│   ├── migrations/     # Migraciones SQL (formato de la CLI de Supabase)
│   └── scripts/        # Cargas de datos, como los lugares de Georef
├── scripts/
│   └── qa/             # Pruebas en el navegador (Playwright) y la base local, a mano
└── docs/
```

- **Pruebas:** Vitest en cada paquete (`pnpm test`). Las consultas a la base corren contra **PGlite** (Postgres en memoria) con todas las migraciones aplicadas.
- **CI:** GitHub Actions corre `lint`, `typecheck`, `test` y `build` en cada push y PR.
- **Marca:** el nombre y los colores provisorios viven en `apps/web/src/config/brand.ts`.
- **Tipografías:** Outfit y Plus Jakarta Sans van incluidas en `apps/web/src/app/fonts` (licencia libre OFL), así el build no depende de Google Fonts.
- **Reglas ajustables:** cada juego tiene su objeto `*_RULES` (tiempos, puntajes, umbrales anti-trampa) y la competencia, `COMPETITION_RULES`.

## 3. Tiempo: días y semanas

- Zona horaria única: **America/Argentina/Buenos_Aires** (UTC−3, hoy sin horario de verano).
- El "día de juego" lo define **siempre el servidor**, nunca el reloj del celu.
- Semana de corona: de **lunes 00:00 a domingo 23:59:59**, hora argentina.
- Cuando sumemos otros países habrá que decidir si cada país tiene su propio día o si hay un día global.

## 4. Retos diarios: flujo autoritativo

**Semillas secretas.** Cada reto usa dos generadores de azar derivados con HMAC-SHA256 de un secreto del servidor (`dailyRngs` en `@repo/games/server`):

- **`shared`** = `HMAC(secreto, fecha, slot)`: igual para todos. Elige las letras, las preguntas, etc.
- **`player`** = `HMAC(secreto, fecha, slot, usuario)`: único por jugador. Ordena las opciones y genera las versiones propias (esperas de Largada, secuencia de Secuencia, colores y orden de los tubos de Tubitos).

Sin el secreto nadie puede calcular por adelantado el reto de mañana. Un cron genera los retos del día siguiente y guarda el contenido en `daily_challenges` (así un cambio de diccionario o de preguntas no altera un día ya publicado); la solución nunca sale del servidor.

**Jugar un reto:**

1. `POST /api/daily/{fecha}/{slot}/start` → el servidor crea el intento en `attempts` (único por usuario + fecha + slot), guarda `started_at` y devuelve **solo lo necesario para jugar**.
2. Durante el juego, según cada juego:
   - **Cinco Preguntas:** las preguntas se piden de a una (`/next`); el servidor cronometra cada una y corrige.
   - **Diez Letras:** cada palabra se verifica en el servidor mientras el jugador sigue (el diccionario no se manda al celu), y la lista final se corrige en el servidor.
   - **Largada y Secuencia:** el cliente manda el registro de eventos (toques y tiempos) y el servidor lo valida.
   - **Tubitos:** cada nivel se pide recién cuando el anterior está resuelto; el servidor lo comprueba con los pasos del nivel y anota cuándo lo entregó y cuándo se resolvió.
3. `POST /api/daily/{fecha}/{slot}/finish` → el servidor valida con `packages/games`, calcula el puntaje (0–1.000) y corre los chequeos de plausibilidad.
4. Si un intento no se termina, al vencer su tiempo máximo se cierra con lo que haya.

### Lo que ya funciona

La API de los retos es autoritativa. Lo que necesita para jugar viaja firmado, y cada intento del día se guarda en la base de datos.

| Endpoint (`POST`) | Qué hace |
|---|---|
| `/api/retos/empezar` | Arranca un reto del día (`{ mode: "daily", slot }`) o una práctica (`{ mode: "practice", game }`; Tubitos suma `level`, el nivel de la carrera). Devuelve un **token firmado** y solo lo necesario para jugar. |
| `/api/retos/palabra` | Diez Letras: dice si una palabra vale y cuántos puntos da (el diccionario no se manda al celu). El celu no espera la respuesta para seguir: la palabra aparece al instante y se marca cuando llega (si falla la conexión, reintenta). El puntaje final sale de todo lo enviado, verificado o no. |
| `/api/retos/pregunta` | Cinco Preguntas: entrega una pregunta por vez, con la hora del servidor adentro. Si se pide de nuevo, conserva la hora de la primera vez. |
| `/api/retos/respuesta` | Corrige la respuesta, mide el tiempo del lado del servidor y devuelve un **recibo firmado**. |
| `/api/retos/nivel` | Secuencia: entrega la secuencia siguiente solo si la anterior se repitió bien. Tubitos: entrega el tablero siguiente con el **recibo** del anterior, y un token con la hora en que lo entregó (si se pide de nuevo, conserva la primera). |
| `/api/retos/resuelto` | Tubitos: recibe los pasos de un nivel, los rejuega y, si lo resuelven, devuelve los puntos y un **recibo firmado** con cuándo se entregó y cuándo se resolvió. |
| `/api/retos/terminar` | Recibe el registro del juego, recalcula todo desde la semilla y devuelve el puntaje. Un reto se corrige **una sola vez**: si se manda de nuevo, vuelve el resultado guardado. |

- **Token del intento:** id del intento, juego, fecha, slot, jugador y hora de inicio, firmados con HMAC. El servidor regenera el contenido desde la semilla en cada pedido (con un caché en memoria), así que el contenido no se guarda. Un token vencido (pasado el tiempo máximo del juego más dos minutos) se rechaza.
- **Jugador:** sin cuenta, una cookie anónima `emd_uid` (httpOnly, un año) identifica al navegador; con cuenta, el reto queda a nombre de la cuenta (ver "Cuentas").
- **Un solo intento, en el servidor:** `empezar` registra el intento en `game.attempts`, que acepta uno por cuenta y, sin cuenta, uno por navegador, para cada fecha y slot. Si ya estaba, responde `409 already-played` con lo jugado, y el celu muestra el resultado guardado. Un intento empezado y abandonado se cierra con 0 cuando se vence.
- **Lo que recuerda el celu:** los intentos del día, la racha, la semana y los récords de práctica también viven en el `localStorage`, para mostrarlos al instante. Si un reto se corta a la mitad, al volver se corrige con lo que se llegó a jugar.
- **Marcas de plausibilidad:** se guardan con cada intento (`flags`) y también van a los logs del servidor como `suspicious-attempt`.
- **Límite conocido:** sin cuenta, quien borra las cookies es un navegador nuevo y puede repetir. Por eso los rankings van a contar solo los intentos hechos con cuenta.
- **Sin base de datos:** si no está `DATABASE_URL` (desarrollo local y CI), la API funciona igual pero no guarda nada, y "un solo intento" lo controla solo el navegador.
- **Secreto:** la variable `CHALLENGE_SECRET` (32 caracteres o más) deriva las semillas y firma los tokens. En producción es obligatoria (sin ella la API no arranca); en desarrollo y en los previews se usa una de prueba.

### La base de datos

- **Esquema `game`**, que la API de datos de Supabase no publica: el navegador nunca lee ni escribe tablas directamente. El servidor entra con su propio rol, `app_server`, que solo puede leer lugares y leer, crear y actualizar el resto (intentos, cuentas, grupos, coronas): no puede borrar. Además, todas las tablas tienen Row Level Security con permisos solo para ese rol.
- **Hora:** las filas que dependen del momento (unirse a un grupo, salir, crear una invitación) se escriben con la hora del servidor web, no con `now()` de la base, así las reglas usan un solo reloj y se pueden probar con fechas simuladas.
- **Conexión:** `DATABASE_URL` apunta al pooler de transacciones de Supabase (puerto 6543) con el rol `app_server`; el cliente es postgres.js sin prepared statements. La contraseña del rol se define fuera del repo.
- **Región:** las funciones de Vercel corren en São Paulo (`gru1`, en `apps/web/vercel.json`), igual que la base: es lo más cerca de Argentina.
- **Lugares:** `supabase/scripts/import-places.sql` carga provincias, departamentos y localidades desde Georef. Corre adentro de la base (extensión `http`) y se puede repetir para actualizar.

### Cuentas

Apodo y contraseña, sin email (decisión de producto del 3/10/2026). El código está en `apps/web/src/server/accounts.ts` (reglas), `packages/db/src/accounts.ts` (consultas) y `packages/shared/src/accounts.ts` (reglas de apodos y contraseñas, compartidas con el navegador).

| Endpoint | Qué hace |
|---|---|
| `POST /api/cuenta/crear` | Crea la cuenta (apodo, contraseña, personaje y El / La Mejor), le pasa lo que ese navegador jugó **ese día** sin cuenta y la deja abierta. |
| `POST /api/cuenta/entrar` | Entra con apodo y contraseña. Devuelve los intentos de los últimos 60 días, para que un celu nuevo muestre la racha y la semana. |
| `POST /api/cuenta/salir` | Cierra la sesión de ese navegador. |
| `GET /api/cuenta` | Quién está adentro (`?historial=1` suma los intentos). La app lo consulta en cada visita (`AccountSync`). |
| `GET /api/cuenta/apodo?nombre=` | Si un apodo está libre. |
| `POST /api/cuenta/perfil` | Cambia el personaje o El / La Mejor. |

- **Apodos:** de 3 a 16 letras, números, puntos o guiones bajos. Únicos sin importar mayúsculas ni acentos (`username_key`, generado con `game.search_name`). Hay una lista de palabras prohibidas (con lunfardo y números disfrazados de letras) y de nombres reservados.
- **Contraseñas:** 8 caracteres o más, que no sean de las más comunes ni iguales al apodo. Se guardan con **scrypt** (N=2^15, r=8, p=3, sal propia); los parámetros van con cada hash para poder subirlos.
- **Sesión:** un token al azar en la cookie `emd_sesion` (httpOnly, SameSite=Lax, segura en producción). La base guarda solo su SHA-256, en `game.sessions`. Dura 90 días y se renueva sola cuando le quedan menos de 45. Salir la vence (el rol del servidor no borra filas).
- **Límites:** 10 intentos fallidos por apodo y 30 por conexión cada 15 minutos; 3 cuentas nuevas por navegador por día y 20 por conexión por hora. La conexión se guarda como un hash con clave, nunca la IP (`game.auth_events`).
- **Otros sitios:** los `POST` de cuentas rechazan pedidos con un `Origin` ajeno, además de las cookies SameSite.
- **Retos con cuenta:** el token del intento lleva `device` (el navegador), `account` (la cuenta) y `user` (la semilla de las variantes: la cuenta si hay, si no el navegador). "Uno por navegador" vale solo sin cuenta, así una familia que comparte el celu juega cada uno con la suya; pero un navegador que ya jugó un reto sin cuenta no puede jugarlo de nuevo entrando a una.
- **Qué pasa a la cuenta:** al **crearla**, lo que ese navegador jugó ese día. Al **entrar** a una cuenta que ya existía no se suma nada de lo jugado sin cuenta: si no, alguien podría probar en varios navegadores y entrar con el mejor.
- **En el navegador:** una copia de la cuenta en `localStorage` (`emd:cuenta`) para dibujar las pantallas al instante, y los días guardados por cuenta (`emd:<cuenta>:dia:<fecha>`), para que en un celu compartido no se mezclen.
- **Sin base de datos** (local y CI) las cuentas no funcionan: los endpoints responden `503 accounts-unavailable`.
- **Pruebas:** reglas y consultas con Vitest sobre PGlite (`packages/shared`, `packages/db` y `apps/web/src/server/accounts.test.ts`).

### Grupos y corona semanal

Grupos privados con su ranking y su corona (decisiones del 3/10/2026 en [PLAN §8](PLAN.md#grupos-decidido-el-3102026)). El código está en `apps/web/src/server/groups.ts` (reglas), `packages/db/src/groups.ts` (consultas), `packages/shared/src/groups.ts` (nombre, emblemas, colores y códigos) y `packages/shared/src/competition.ts` (ranking y corona).

| Endpoint | Qué hace |
|---|---|
| `GET /api/grupos` | Mis grupos, con quién va primero en cada uno, mi puesto y la diferencia. |
| `POST /api/grupos` | Crea un grupo (nombre, emblema y color) con su invitación de 7 días. |
| `GET /api/grupos/{id}` | El grupo con su ranking del día y de la semana, la invitación y la última corona. Solo para miembros (a los demás, `404`). |
| `POST /api/grupos/{id}` | Quien lo administra cambia el nombre, el emblema o el color. |
| `POST /api/grupos/{id}/invitacion` | Invitación nueva: el código anterior deja de andar. Con la actual vigente, solo quien lo administra; vencida, cualquier miembro. |
| `POST /api/grupos/{id}/salir` · `/sacar` | Irse del grupo, o sacar a un miembro (solo quien lo administra). |
| `GET` · `POST /api/invitaciones/{código}` | Lo que muestra la página `/g/{código}` (anda sin cuenta) y sumarse con el código. |
| `GET /api/coronas` · `POST /api/coronas/vista` | Mis coronas (decide antes las semanas cerradas que deben mis grupos) y marcar un festejo como visto. |

- **Tablas:** `game.groups` (con la invitación actual: `invite_code` como "LABURO-7K2Q" e `invite_key` para compararlo como sea que se escriba), `game.group_members` (irse o ser sacado pone `left_at`, porque el rol del servidor no borra), `game.crowns` (una por grupo y semana; sirve también para los lugares) y `game.group_code_failures` (códigos equivocados).
- **Códigos:** la palabra más larga del nombre (hasta 8 letras) y 4 caracteres de un alfabeto sin 0/O ni 1/I/L. Un código equivocado se anota: 10 por cuenta y 30 por conexión por hora, después espera.
- **Límites:** 50 miembros por grupo, 20 grupos por persona y 5 grupos nuevos por día. Quien fue sacado no vuelve con la invitación de ese momento: hace falta una más nueva.
- **Ranking:** cuentan los retos del día terminados, de toda la semana aunque te sumes el jueves. La semana suma los 5 mejores días. Con los mismos puntos va primero quien llegó antes a ese puntaje (se recorre en el orden en que se corrigieron los retos). Quien todavía no jugó va al final, sin puesto.
- **Corona en vivo:** la tiene quien va primero (`crownHolder`); para sacársela hay que superarlo, no igualarlo. No hay mínimo de días.
- **Cierre sin cron:** una semana se decide la primera vez que alguien mira el grupo (o sus coronas) después del lunes a las 00:10: un reto dura como mucho 7 minutos, así que a esa hora ya están todos los puntajes del domingo. Se toman los miembros que había al cierre, se graba la corona una sola vez (índice único por grupo y semana) y `crowned_through` evita mirar de nuevo. La primera semana con corona es la del 5/10/2026 (`FIRST_CROWN_WEEK`).
- **Festejo:** el inicio pregunta por coronas cada 15 minutos como mucho y, si hay una sin ver, abre `/corona`. Al verla se marca vista; desde el palmarés del perfil se puede volver a ver.
- **"Te sacaron la corona":** el navegador recuerda quién la tenía la última vez que miró cada grupo (`emd:coronas-vistas`) y lo avisa una vez.
- **Sumarse sin cuenta:** "Crear mi cuenta y sumarme" deja anotado el código en `sessionStorage`; al volver con la cuenta creada, la página `/g/{código}` se suma sola. Solo un toque en esa página lo anota, así un link no puede sumar a nadie sin querer.
- **Vista previa del link:** genérica ("Te invitaron a un grupo"), sin el nombre del grupo, que solo se ve en la página.
- **Pruebas:** reglas y consultas con Vitest sobre PGlite (`packages/shared`, `packages/db` y `apps/web/src/server/groups.test.ts`).

### Largada

El juego de reflejos desde el 4/10/2026 (decisiones en [PLAN §7](PLAN.md#largada-reemplaza-a-reflejos-decidida-y-construida-el-3102026), diseño en [`docs/diseno/handoff-largada`](diseno/handoff-largada/LARGADA.md)). El motor está en `packages/games/src/games/largada.ts`; el servidor, en `apps/web/src/server/largada.ts` y `packages/db/src/largada.ts`; las pantallas, en `apps/web/src/components/largada`.

- **Reglas por fecha:** `usesLargada(modo, fecha)` (con `LARGADA_FROM`, en `@repo/games`) decide qué motor de `reflexes` usa cada reto: Largada desde el 4/10/2026 y en la práctica; los días anteriores, el de cambio de color. El juego sigue siendo `reflexes` en la base; lo nuevo se reconoce por `version: "largada"` en lo que ve el jugador y en el resultado.
- **Reto:** 5 luces (una por segundo), 3 largadas y una espera **propia de cada jugador** (de 0,2 a 3 s, con la semilla `player`). El registro es `{ rounds: { reactionMs, falseStart }[] }`; el resultado guarda `averageMs` (con las penalidades: 450 ms adelantarse, 700 no tocar), `bestMs` y cada largada.
- **Marcas:** menos de 100 ms cuenta como adelantada y se marca (`impossible-reaction`); tres largadas a menos de 3 ms entre sí (`too-consistent`); un intento que terminó antes de lo que tardan las luces, las esperas y las reacciones, con 1 s de margen (`clock-mismatch`).
- **`GET /api/largada?grupo=`:** la parrilla de hoy. Con cuenta y grupo (el pedido o, si no, el primero): quienes ya corrieron hoy con sus 3 largadas (`rivals`, en el orden de la semana), los que tienen carril (`lanes`: hasta 4, eligiendo a quien tiene la corona, a los de arriba y abajo tuyo en la semana y después a los más rápidos), quienes no jugaron (`waiting`), tu Largada si ya corriste (`me`), quién tiene la corona y tu semana. Sin grupo, sin cuenta o sin rivales, un fantasma: el mejor del día de tu localidad (si la verificaste) o del país (`bestLargadaIn`).
- **Bots** (`apps/web/src/lib/largada-bots.ts`): Rayo, Chispa, Turbo y Tortuga, cada uno con su tiempo promedio, cuánto varía y cuántas veces se adelanta. `raceField` los suma después de los rivales: en la práctica hasta completar 4 carriles, y en el reto del día solo si no hay nadie más. Sus tiempos salen de una semilla: en la práctica, el token del intento (una carrera nueva cada vez); en el reto del día, la fecha y el jugador, así otro celu arma la misma foto de llegada. No pasan por el servidor ni cambian el puntaje.
- **La carrera es del celu** (`apps/web/src/lib/largada.ts`): cuándo sale cada auto (la diferencia real, exagerada 6 veces y con un tope de 600 ms), dónde está cada trompa, los puestos (un empate comparte el puesto y adelantarse va último), los textos de cada largada y la foto de llegada. La pista y los autos son SVG (`Track.tsx`, `Car.tsx`); cada auto toma el color del personaje.
- **Lo que recuerda el navegador:** el último grupo abierto (`emd:ultimo-grupo`, lo guardan la pantalla del grupo y el chip de la parrilla) y la última carrera de cada modo (`emd:largada:reto` y `emd:largada:practica`: los autos con sus tiempos de ese momento, el grupo y quién tenía la corona al empezar). Con eso el resultado dibuja la foto y sabe si esa largada te dio la corona; en otro celu la foto sale de la parrilla de hoy y la franja de la corona no aparece.
- **Compartir:** la foto se pasa a PNG antes de tocar el botón (el SVG con las letras de la app adentro, en una polaroid hecha en un canvas), porque la hoja de compartir tiene que abrirse en el mismo toque. Con la Web Share API va el archivo con el texto y el link; si el celu no comparte archivos, el botón abre WhatsApp (`wa.me`) con el texto.
- **Sonido y vibración:** un golpe seco por luz con Web Audio, que se habilita al tocar "Empezar"; en el iPhone respeta el modo silencio (`audioSession` "ambient"). Vibra donde se puede (en Android sí, en el iPhone no).
- **Récords de práctica:** el de Reflejos se guarda marcado como de Largada; el del juego anterior ya no se muestra.

### Tubitos

El quinto juego, de lógica: en la práctica desde el 4/10/2026 y en el reto del día desde el 5/10/2026 (decisiones en [PLAN §7](PLAN.md#tubitos-decidido-y-construido-el-4102026), diseño en [`docs/diseno/handoff-tubitos`](diseno/handoff-tubitos/TUBITOS.md)). Es `water-sort` en el código y en la base. El motor está en `packages/games/src/games/water-sort.ts`; el servidor, en `apps/web/src/server/challenges.ts`; las pantallas, en `apps/web/src/components/games/WaterSortPlay.tsx` y `apps/web/src/components/tubitos`, y las medidas, en `apps/web/src/lib/tubitos.ts`.

- **Tablero:** tubos de 4 capas, cada uno de abajo hacia arriba como índices de `WATER_SORT_COLORS` (los 8 líquidos en el orden en que entran: 4 con 6 tubos, 6 con 8 y 8 con 10). Las reglas (`checkPour`, `pour`, `isSolved`, `hasPours`, `colorsLeft`) son las mismas en el celu y en el servidor.
- **Mínimo de movimientos (par):** `solveWaterSort` busca la solución más corta con A* sobre tableros donde el orden de los tubos no importa (cada tubo es un número y el tablero, los tubos ordenados). La estimación nunca se pasa (cada pase une a lo sumo un tramo de un color con otro, y un color que no está en el fondo de ningún tubo necesita al menos un pase a un tubo vacío), así que la primera solución es la más corta; se comprobó contra una búsqueda completa. Tarda milisegundos. Si una búsqueda llegara a su tope (300.000 tableros), se queda con una solución más larga y el par queda marcado como no exacto.
- **Armado:** con la semilla `shared`, los colores al azar en los tubos llenos y 2 vacíos al final, sin tubos listos de entrada y con un mínimo de pases (10, 16 y 22) para que no sea fácil. Cada tablero se resuelve una vez por servidor (caché por semilla). Con la semilla `player`, cada jugador lo recibe con los colores cambiados y otro orden de los tubos llenos: el mismo par.
- **Registro:** `{ levels: { events, durationMs, receipt? }[] }`, con `pour` (de qué tubo a cuál), `undo` y `restart`, cada uno con su `t` (ms desde que empezó el nivel). El servidor rejuega cada nivel: pases permitidos, como mucho 3 deshacer desde el último reinicio y el tablero resuelto. Los movimientos que cuentan son los pases desde el último reinicio.
- **Tiempo justo:** el de cada nivel es el del celu (hasta el pase que lo resuelve), pero nunca menos que lo que vio el servidor menos 2 s de margen. El servidor anota en `attempts.progress` cuándo entregó cada nivel (`level:N`, el primero es el comienzo del intento) y cuándo se enteró de que se resolvió (`solved:N`), la primera vez (`momentOf`, como las preguntas); sin base, los recibos firmados lo dicen. Así no conviene mirar el nivel siguiente durante la pausa: recién se entrega al tocar "Siguiente nivel".
- **Marcas:** `illegal-move` (alta), `unsolved-level` (alta: pasos en un nivel que no debió entregarse), `below-par` (alta, con par exacto), `too-fast-input` (menos de 150 ms entre pases, en promedio) y `clock-mismatch`.
- **Práctica:** cada nivel es un intento propio (`claims.level`), con un motor de un nivel del tamaño que le toca (`waterSortPracticeRules`). El celu pide el nivel siguiente a su récord (`emd:practica`, `best`); no hay que mandarle nada al servidor al terminar.
- **Pantalla:** el tablero ocupa el lugar que queda entre las instrucciones y los botones (`boardLayout`, con las medidas del diseño, más bajas en pantallas de 800 px o menos y achicadas si todavía no entran; en tablets paradas, más grandes). Cada tubo es un botón del alto de su columna. El vertido son transiciones de CSS en cuatro etapas (levantar, inclinar, verter y volver); el líquido inclinado queda horizontal con `tippedLiquid` (franjas y un `clip-path`), y el chorro y el tubo que se llena crecen con la animación `fill-up`. Con movimiento reducido, el líquido pasa con un fundido.
- **Rotación:** `dailyLineup` usa los 4 juegos hasta el 4/10/2026 y los 5 desde `WATER_SORT_FROM` (5/10/2026), con 2 que descansan por día (ver "Contrato de cada juego").

### Sonido

Efectos y cortinas cortas hechos con Web Audio, sin archivos (decisiones en [PLAN §2](PLAN.md#2-decisiones-tomadas)).

- **Los sonidos** (`apps/web/src/lib/synth.ts`): cada uno se dibuja sobre cualquier contexto de audio (el parlante, o uno sin parlante para escucharlos o medirlos) desde un momento dado, y dice cuánto dura. Son osciladores con envolventes y ruido filtrado: letras que suben por una escala pentatónica, campanitas para acertar, un "bonk" para el error, el tic del reloj, las notas de Secuencia (un acorde de La mayor, como el Simón), el golpe de las luces y el motor de Largada, el gluglú del vertido y el "plop" del corcho de Tubitos, y las cortinas (día cerrado, récord, corona).
- **El parlante** (`apps/web/src/lib/sound.ts`): un solo `AudioContext` para toda la app, con un limitador para que los sonidos encimados no saturen. Los navegadores solo dejan sonar después de un toque: `SoundUnlock` (en el layout) lo abre en el primero y lo reabre si el celu lo pausó. En el iPhone usa la sesión de audio "ambient": respeta la tecla de silencio y no corta la música que esté sonando.
- **Prendido o apagado:** arranca prendido; apagarlo queda en el celu (`emd:sonido`). Se cambia con el parlante de la cabecera de los juegos (`SoundToggle`) o en el perfil (`SoundSetting`).
- **Cuándo suena:** cada juego llama a `playSound` en el momento justo (al tocar, al corregir, en los últimos segundos). Los resultados cuentan el puntaje con un sonido (`useResultSound`); el récord, la corona y el día cerrado (una vez por día, `emd:sonido-dia`) tienen su cortina.
- **Música** (`apps/web/src/lib/music.ts`): seis loops de 8 compases, uno para los menús ("Plaza") y uno por juego ("Ingenio", "Concurso", "Carrera", "Memoria" y "Laboratorio", la de Tubitos, con burbujas). Cada canción dibuja cada semicorchea, y un programador las agenda un poco por adelantado para que el loop no se corte. Los bajos van una octava más arriba que en un disco, porque los parlantes de los celus casi no tocan por debajo de 150 Hz.
- **Qué canción suena:** la de los menús, salvo que una pantalla pida otra con `useMusic`. `ChallengeRunner` pide la del juego desde la pantalla de antes de empezar. Al cambiar de canción hay un fundido, y entre menús no se reinicia. Va por su propio canal, más bajo que los efectos (`MUSIC_LEVEL`), y se pausa cuando la app queda en segundo plano.
- **Cuándo baja:** mientras se prenden las luces de Largada y mientras se muestra la secuencia de Secuencia (`duckMusic`), y sola mientras suena una cortina o el puntaje del resultado.
- **Música aparte:** el parlante de los juegos apaga todo; en el perfil, "Música" la apaga sin tocar los efectos (`emd:musica`).
- **Juego limpio:** nada que suene da información que la pantalla no muestre. La señal de Largada no suena: el motor arranca después del toque, y la música baja al prenderse las luces, no al apagarse.
- **Pruebas:** `synth.test.ts` y `music.test.ts` revisan con un contexto de mentira (`lib/testing/fake-audio.ts`) que cada sonido y cada compás arranque cuando debe y no rompa Web Audio (una rampa exponencial a cero da error). Cómo suenan se escucha en las páginas de sonidos y de música.

### Personajes

Los personajes 2.0 (17 bichos, tres cuartos, 6 poses y avatar redondo) se dibujan en SVG con código, sin imágenes. El diseño y su fuente están en [`docs/diseno/handoff-personajes`](diseno/handoff-personajes/PERSONAJES.md); lo que cambió al implementarlo, en [CAMBIOS-AL-DISENO.md](diseno/CAMBIOS-AL-DISENO.md#personajes-20).

- **Los datos** (`packages/shared/src/accounts.ts`): `Avatar` guarda el bicho, el color y el accesorio de la primera versión, y los campos nuevos son opcionales (segundo color, ojos, pelo, marcas, ropa con su color y número, un accesorio por zona y el fondo del avatar). Un campo que falta vale su valor de base, así lo guardado sigue valiendo; uno con un valor inválido rechaza todo el personaje (`parseAvatar`). `avatarWear` pone el accesorio viejo en su zona (la boina y la gorra en la cabeza, los anteojos en la cara, la bufanda en el cuello y el mate en la mano). La corona no se guarda: la suman el podio y el festejo.
- **El dibujo** (`apps/web/src/components/personaje/`): `rig.ts` tiene el esqueleto de cada bicho (sus piezas y sus anclas, en una grilla de 100 × 120); `pieces.ts`, la cara, el pelo, las marcas, la ropa y los accesorios; `draw.ts` los arma con la vista y la pose y devuelve un árbol SVG simple, sin React, y `Personaje.tsx` lo dibuja. Portados de `fuente/personajes.js` (solo el estilo "Pulido"), con sus mismos números.
- **Uso:** `avatarLook` da las props de un jugador y `badgeLook`, las del avatar redondo. Las props de antes siguen andando (`acc`, `prop` de las mascotas, `scarf`, `frame` del casco de Largada); las nuevas son `pose`, `view`, `facing`, `badge`, `badgeColor`, `crown` y una por cada opción. Cada personaje usa `useId` para sus recortes, así dos en la misma pantalla no se pisan.
- **Movimiento:** el festejo sube los brazos y el salto aterriza (`animate-pj-swing` y `animate-pj-land` en `globals.css`). Fuera del avatar redondo, y apagado si el celu pide menos movimiento.
- **Pruebas:** `draw.test.ts` compara cada bicho en cada vista y pose, los 8 ejemplos y cada opción con los 200 SVG de referencia, pieza por pieza. En el navegador, `/dev/personajes` (solo en desarrollo) muestra la hoja de modelos, y `scripts/qa/personajes.cjs` la compara píxel por píxel con esos SVG.

### Batallas en vivo

Una sala de 2 a 10 jugadores que juegan el mismo juego a la vez, cada uno en su celu (decisiones en [PLAN §8](PLAN.md#batallas-en-vivo-decidido-el-4102026)). El detalle, las trampas que ya pisamos y el paso a paso para sumar un juego están en [BATALLAS.md](BATALLAS.md). El código está en:

- `packages/games/src/battles.ts`: las reglas y los tiempos, como funciones puras.
- `apps/web/src/server/battles.ts` y `battle-content.ts`: quién puede hacer qué y qué se juega.
- `packages/db/src/battles.ts`: las consultas.
- `apps/web/src/components/battle`: las pantallas.
- `apps/web/src/lib/use-battle.ts`: el reloj y las preguntas al servidor.

**Sin proceso propio.** Ningún programa queda corriendo entre pedidos:

- La partida guarda cuándo arranca y cada jugada.
- Cada pedido calcula dónde está con `triviaFlow`, `largadaFlow`, `lettersFlow`, `sequenceFlow` o `tubitosFlow`.
- Cada decisión por juego es un `switch` sobre el juego: al sumar uno, TypeScript marca lo que falta.
- Una pregunta (o una largada) **cierra cuando jugaron todos los que siguen en la sala, o al vencer su tiempo**. Quien se fue durante la partida no la frena (`departures`), aunque vuelva.
- Lo que sigue arranca a una hora fija después de ese cierre:
  - en Cinco Preguntas, 5 s de tabla;
  - en Largada, 0,7 s para que todos se enteren y la carrera.
- Diez Letras es una sola ronda de 90 s (más 2 s de gracia), que cierra antes solo si se fueron todos, y 2,5 s de "¡Tiempo!" antes del podio.
- En Secuencia, cada ronda muestra sus colores y da 3 s más 1 s por color para repetirlos; cierra cuando respondieron todos los que siguen, y 2,5 s después arranca la próxima (o el desempate).
- En Tubitos, cada tablero cierra cuando lo resolvieron todos o a su tiempo máximo (1:40, 2:30 y 3:40), y 5 s de tabla después arranca el próximo.
- Cuando la partida terminó, el primero que pregunta la escribe (`ended_at`, `results`, `winners`), una sola vez.
- Una partida que nadie miró hasta el final se escribe al abrir el historial del grupo.

**El reloj de cada celu.**

- Cada respuesta trae la hora del servidor cuando llegó el pedido y cuando salió la respuesta (`serverAt`, `serverNow`).
- Con eso el celu calcula, como NTP, cuánto está corrido su reloj. Se queda con la medición que menos tardó de las últimas 10, y le erra por unas decenas de milisegundos.
- Así la pregunta aparece, y las luces se apagan, al mismo tiempo en todos los celus.

**Preguntar seguido.** El celu pregunta `GET /api/batallas/{id}` según lo que esté por pasar:

- cada 2 s en la sala y en el podio;
- cada 0,7 s con una pregunta abierta, y cada 0,4 s si ya respondió;
- cada 0,3 s después de la señal de Largada;
- cada 1 s en Diez Letras, por los puntos de los demás (las letras las pide 0,3 s antes de que termine la cuenta regresiva);
- en Secuencia, cada 0,7 s con una ronda abierta (0,4 s si ya respondió) y 0,3 s antes de la ronda siguiente, para tener sus colores;
- en Tubitos, cada 1 s con un tablero abierto (0,7 s si ya lo resolvió) y 0,3 s antes del tablero siguiente;
- justo cuando arranca lo que sigue.

Con la app en segundo plano deja de preguntar; al volver, pregunta enseguida. No hace falta un servidor de websockets, y si algún día hay muchas batallas a la vez, se puede sumar un aviso en vivo (Supabase Realtime) sin cambiar las reglas.

| Endpoint | Qué hace |
|---|---|
| `POST /api/batallas` | Abre una sala, desde un grupo (`groupId`) o suelta. Un grupo tiene una abierta por vez: pedir otra suma a la que hay. |
| `GET /api/batallas/{id}` | La sala como la ve ese jugador: quiénes están, la etapa (`lobby`, `match`, `podium`, `closed`), la partida y la hora del servidor. |
| `POST /api/batallas/{id}/juego` · `/empezar` · `/sala` | Quien la arma elige el juego, empieza (o la revancha) y vuelve a la sala ("Otro juego"). |
| `POST /api/batallas/{id}/pregunta` · `/respuesta` | Cinco Preguntas: la pregunta, con las opciones en el orden de ese jugador, y la respuesta. |
| `POST /api/batallas/{id}/largada` | Largada: el tiempo de reacción que midió el celu, o que se adelantó. |
| `POST /api/batallas/{id}/palabra` | Diez Letras: una palabra. El servidor dice si vale (`valid`, `invalid`, `too-short` o `duplicate`) y sus puntos. |
| `POST /api/batallas/{id}/repetir` | Secuencia: los colores que tocó el jugador en una ronda. El servidor dice si estaba bien. |
| `POST /api/batallas/{id}/tubos` | Tubitos: los pasos de un tablero resuelto. El servidor los rejuega y dice los puntos. |
| `POST /api/batallas/{id}/sumarse` · `/salir` · `/sacar` | Sumarse desde el grupo, irse y sacar a alguien (quien la arma). |
| `GET` · `POST /api/batallas/codigo/{código}` | Lo que muestra la página `/b/{código}` (anda sin cuenta) y sumarse con el código. |
| `GET /api/grupos/{id}/batallas` | La batalla en vivo del grupo (para el aviso) y su historial: ganadas por miembro y las últimas 10. |

- **Tablas:**
  - `game.battles`: la sala, con el código, el grupo, quien la arma, el juego elegido y las preguntas ya jugadas.
  - `game.battle_players`: quién está, con `seen_at` para saber quién sigue conectado.
  - `game.battle_matches`: cada partida, con su contenido (los ids de las preguntas o las esperas de las luces), quiénes la juegan, quién se fue y el resultado.
  - `game.battle_moves`: una jugada por jugador y ronda (en Secuencia, si acertó y qué colores tocó, con hasta 200 rondas por los desempates; en Tubitos, los pasos de cada tablero resuelto, en `log`).
  - `game.battle_words`: cada palabra válida de Diez Letras, una vez por jugador.
  - Una sola partida abierta por sala (índice único).
- **Juego limpio:**
  - Los puntajes los calcula el servidor con las reglas de cada juego.
  - En Cinco Preguntas, cada pregunta se entrega recién cuando abre (400 ms antes, como mucho), y su reloj corre desde que ese jugador la recibe. Cada uno ve las opciones en otro orden. Nadie ve la correcta ni qué eligieron los demás antes de que cierre. Las preguntas no repiten las de la sala ni las del reto de hoy.
  - En Largada, las esperas son las mismas para todos y el celu mide la reacción desde el cuadro en que se apagan las luces, como en el reto del día. Una reacción que llega al servidor antes de lo posible (con 300 ms de margen de reloj) cuenta como adelantada y va a los logs.
  - En Diez Letras, las letras llegan 400 ms antes de abrir, como mucho, y no coinciden con las del reto de hoy. El servidor saca las palabras válidas de las letras y del diccionario; nunca van al celu. Mientras se juega, de los demás solo se ven los puntos. En el podio se ven las palabras de todos, y las groseras (el filtro de los apodos) se ocultan para los demás.
  - En Secuencia, la secuencia es la misma para todos y cada ronda llega 400 ms antes de mostrarse, como mucho, con solo sus colores. Una repetición correcta que llega antes de lo posible (menos de 120 ms por color desde que terminaron de mostrarse, con 300 ms de margen) cuenta como error y va a los logs.
  - En Tubitos, cada uno juega su versión del tablero (los colores cambiados y los tubos en otro orden, sacados con HMAC de la partida y el jugador). El servidor rejuega los pasos sobre esa versión, como en el reto, y el tiempo nunca cuenta mucho menos que el que vio él desde que abrió el tablero. Vertidos más rápidos de lo que permite la pantalla van a los logs.
- **Límites:**
  - 20 salas nuevas por hora por cuenta.
  - Los códigos equivocados cuentan como los de los grupos: 10 por cuenta y 30 por conexión por hora.
  - Un jugador está en una sala a la vez.
  - Una sala sin nadie se cierra. En el grupo, el aviso solo aparece si alguien preguntó en los últimos 2 minutos.
- **En el celu:**
  - La música de la sala se alinea con el reloj del servidor (`useMusic(key, grid)`), así suena al mismo compás en todos los celus.
  - Durante la partida se pide que la pantalla no se apague (Wake Lock).
- **Pruebas:**
  - Las reglas, en `packages/games/src/battles.test.ts`.
  - Las consultas, sobre PGlite.
  - Una batalla entera con tres jugadores, en `apps/web/src/server/battles.test.ts`.
  - En el navegador, con tres celus simulados a la vez ([`scripts/qa`](../scripts/qa/README.md)).

### Contrato de cada juego

Cada juego de `packages/games` cumple esta interfaz:

```ts
interface GameDefinition<Content, Solution, Log, Result extends { score: number; flags: Flag[] }> {
  id: GameId;                    // 'seven-letters' | 'five-questions' | 'reflexes' | 'sequence' | 'water-sort'
  category: 'words' | 'trivia' | 'skill' | 'logic';
  maxDurationMs: number;         // después de esto el servidor cierra el intento
  generate(rngs: { shared: Rng; player: Rng }): { content: Content; solution: Solution };
  evaluate(content: Content, solution: Solution, log: Log, ctx?: { serverElapsedMs?: number; levelServerMs?: (number | null)[] }): Result;
}
```

- `content` es lo que el jugador puede ver (Cinco Preguntas, Secuencia y Tubitos lo revelan de a partes); `solution` nunca sale del servidor.
- `evaluate` corrige, puntúa (0–1.000) y devuelve **marcas** (`flags`) de plausibilidad: `severity: 'high'` significa que el puntaje no cuenta hasta revisarlo.
- Los juegos que necesitan datos se crean con ellos: `createSevenLetters(diccionario, reglas)` y `createFiveQuestions(bancoDePreguntas)`.
- **Reglas por fecha:** un reto del día nunca cambia después de publicado. Diez Letras (`TEN_LETTERS_RULES`: 10 letras, puntos fijos) rige desde el 4/10/2026 (`TEN_LETTERS_FROM` en `apps/web/src/server/challenges.ts`). Los días anteriores se regeneran con las reglas de Siete Letras (`SEVEN_LETTERS_RULES`), y la práctica usa siempre las actuales. Igual con Largada (`LARGADA_FROM`, 4/10/2026), que reemplaza al Reflejos de cambio de color. Así se van a manejar los próximos ajustes de puntajes.
- **Diccionario de palabras:** 365.648 palabras de 3 a 10 letras (`packages/content`). Para buscar rápido qué palabras se arman con las letras del día, cada palabra tiene una máscara de bits con sus letras.
- La misma lógica corre en el cliente (juego libre, con `practiceRngs()`) y en el servidor (retos diarios, con `dailyRngs()`).
- `dailyLineup(fecha)` arma los 3 retos del día. Hasta el 4/10/2026, con 4 juegos, descansaba uno por día. Desde el 5/10/2026 (`WATER_SORT_FROM`), con 5, descansan el del número del día y el de dos lugares después: cada juego sale 3 de cada 5 días y ninguno descansa dos días seguidos. El primer día tocan Diez Letras, Largada y Tubitos. `rotationGames(fecha)` dice qué juegos estaban en la rotación ese día.
- La API valida la forma de cada registro (esquema) antes de pasárselo al motor.

### Agujeros conocidos y cómo los cerramos

| Agujero | Mitigación |
|---|---|
| Jugar como anónimo en varios navegadores para ensayar y registrarse con el mejor intento | Solo pasa a la cuenta lo jugado ese día en el navegador donde se crea, una vez. Al entrar a una cuenta existente no se suma nada. Límite de cuentas nuevas por navegador y por conexión, y los mismos chequeos de plausibilidad. |
| Pasarse las respuestas (la palabra o las preguntas del día) | Tiempo límite corto, orden mezclado y, si hace falta, contenido distinto por jugador con dificultad equivalente. |
| Bots o scripts en juegos de habilidad (dependen del reloj del celu) | Rangos humanos (por ejemplo, reflejos de menos de 100 ms son imposibles), análisis de varianza, verificación en el podio y revisión manual de coronas grandes. Si un juego resulta demasiado trucable, sale de los retos diarios y queda solo como juego libre. |
| GPS falso | Cruce con la región por IP (headers `x-vercel-ip-*`), precisión reportada, viajes imposibles y re-verificación en momentos clave. |
| Cuentas múltiples | Un intento por cuenta, cada cuenta con sus propias variantes (Largada, Secuencia, Tubitos), límites de cuentas nuevas, señales de conexión y navegador, y revisión de patrones. |
| Trucar el reloj del celu (Tubitos) | El servidor cronometra cada nivel por su cuenta (de entregarlo a enterarse de que se resolvió) y nunca cuenta mucho menos que eso. El nivel siguiente recién se entrega al tocar "Siguiente nivel". |

## 5. Lugares y verificación de ubicación

**Datos.** Provincias, departamentos/partidos, municipios y localidades de Argentina desde las fuentes oficiales de [datos.gob.ar](https://datos.gob.ar) (API Georef / INDEC), importados a PostGIS: polígonos para provincias, departamentos y municipios, y punto (centroide) para las localidades. *(Verificar licencia y atribución.)*

**Tabla `game.places`** (ya creada), con una jerarquía genérica para poder sumar otros países:
`id, kind (country | province | department | locality), parent_id, name, search_name, lat, lon, radius_km`. Los ids son los de Georef con el país adelante (`ar-06224010` es Chivilcoy). Para la primera versión alcanza con el centro de cada localidad y un radio (*R* = 12 km por defecto); los polígonos llegan después.

**Cómo se elige** (decidido y construido el 3/10/2026). El código está en `apps/web/src/server/places.ts` (reglas), `packages/db/src/places.ts` (consultas) y `packages/shared/src/places.ts` (cuándo una posición verifica una localidad, y los nombres).

| Endpoint | Qué hace |
|---|---|
| `GET /api/lugar` | Dónde compito, si el GPS lo confirmó alguna vez y si lo confirmó esta semana. |
| `POST /api/lugar/cercanos` | "Usar mi ubicación": las localidades que esa posición verifica (hasta 6, la más cercana primero). No guarda nada. |
| `POST /api/lugar` | Elige la localidad. Con posición, el GPS la verifica en el momento (`verified` o `too-far`); sin posición, queda guardada sin verificar (`saved`). |
| `POST /api/lugar/verificar` | Verifica la localidad ya elegida: la primera vez o la de cada semana para la corona. |
| `GET /api/lugar/provincias` · `GET /api/lugar/buscar?q=&provincia=` | Para buscarla a mano. |

- **Con el GPS, en un toque:** el servidor busca las localidades cercanas al punto y el jugador elige la suya, que ya queda verificada. Si no, la busca a mano (provincia y localidad) y la verifica después.
- **El campo:** sin polígonos, vale que la localidad más cercana sea del mismo departamento y esté a menos de 40 km.
- **Ciudad de Buenos Aires:** se compite por barrio (Georef trae los 48 barrios como localidades, más una "Ciudad de Buenos Aires" genérica, `ar-02014010`, que no se ofrece). Con 12 km todos los barrios quedan cerca, así que ahí vale estar a menos de 4 km del centro del barrio y que sea uno de los 3 más cercanos.
- **Sin verificar:** jugás igual y los puntajes se guardan, pero no entrás al ranking del lugar; al verificar entra lo de esa semana (`assignUnplacedAttempts`).
- **Mudanzas** (decidido el 3/10/2026): se cambia cuando quieras. Con el GPS, la nueva queda verificada; a mano, arranca sin verificar. Lo jugado antes queda en el lugar viejo.

**Verificación:**

1. El navegador pide la posición solo después de un toque (`navigator.geolocation`, alta precisión, hasta 15 s y de hace un minuto como mucho).
2. El servidor recibe `lat`, `lon` y `accuracy`, y chequea:
   - que la precisión sea de 5 km o menos (si no, `422 inaccurate-position`);
   - que la conexión sea de Argentina, según Vercel (`x-vercel-ip-country`; si no, `403 outside-argentina`). Sin ese dato (en local) no se controla;
   - que el punto esté a menos de *R* km del centro de la localidad (12 por defecto), o las reglas del campo y de la ciudad de arriba;
   - 20 verificaciones por hora por cuenta como mucho (`429 too-many-checks`).
3. Se guarda **solo el resultado**: `game.location_checks` (cuenta, lugar, `verified` o `too-far`, hora). Las coordenadas no se guardan. `game.users.place_verified_at` dice cuándo se verificó por última vez el lugar actual (vacío si nunca, o si se cambió a mano).

**Para la corona** (decidido el 3/10/2026): hay que haber verificado esa misma semana en el lugar. Volver a pedir el GPS al entrar al podio o con un récord muy por encima de lo habitual queda para cuando aparezcan trampas. *(Propuesta.)*

**Lugar congelado.** Cada intento guarda el `place_id` del momento en que se empezó (si el lugar de la cuenta está verificado), así una mudanza no cambia de ranking los puntajes viejos.

## 6. Rankings y coronas

- **Los grupos ya andan** (ver §4, "Grupos y corona semanal"): calculan el ranking en el momento, desde `attempts`, porque son de hasta 50 personas.
- **Los lugares** también se calculan en el momento, con una consulta (`STANDINGS` en `packages/db/src/places.ts`):
  - el área es la localidad (en la ciudad, el barrio), o todas las localidades de la provincia o del país;
  - cuentan los retos del día terminados con cuenta y con ese lugar; la semana suma los 5 mejores días;
  - con los mismos puntos va primero quien llegó antes a ese puntaje;
  - cada jugador aparece con la localidad donde jugó por última vez (se ve en los rankings de provincia y país).
- **Endpoints:** `GET /api/ranking?nivel=localidad|provincia|pais` devuelve el ranking de hoy y de la semana (los 50 primeros, más el jugador y quien tiene la corona) y la corona de la semana anterior. `GET /api/ranking/hoy` devuelve el puesto de hoy en los tres niveles, para el resumen del día.
- **Cuando haya muchos jugadores:** totales por día y por semana (`daily_scores` y `weekly_scores`) que se actualizan al terminar cada intento, con índices, y si hace falta un caché (Redis).
- **Corona en vivo de un lugar:** la tiene el primero del ranking de la semana que **verificó esa semana** en esa área (`verified_in_week`); si quien va primero no verificó, pasa al siguiente que sí. Tiene que haber sumado puntos.
- **Cierre sin cron:** como en los grupos, una semana se decide la primera vez que alguien mira después del lunes a las 00:10: el ranking de ese lugar, o las coronas del jugador (`/api/coronas` revisa los lugares donde vive y donde jugó). `game.place_weeks` anota las semanas ya decididas de cada lugar, y la corona se graba en `game.crowns` con el `place_id` y su nombre ("Caballito", "la Ciudad de Buenos Aires", "Argentina"). Las fechas de las semanas están en `apps/web/src/server/weeks.ts`, compartidas con los grupos.
- **Revisión:** por ahora las coronas de provincia y país se entregan solas (decidido el 3/10/2026). Revisarlas a mano llega con el panel de administración. *(Propuesta.)*

## 7. Modelo de datos (boceto)

| Tabla | Para qué |
|---|---|
| `places` | **(Creada.)** Jerarquía de lugares (país → provincia → departamento → localidad). |
| `users` | **(Creada.)** La cuenta: apodo, hash de la contraseña, personaje, El / La Mejor, localidad, cuándo se verificó (`place_verified_at`, migración `places`) y, más adelante, Google vinculado. |
| `sessions` | **(Creada.)** Sesiones abiertas: hash del token, cuenta, navegador y vencimiento. |
| `auth_events` | **(Creada.)** Cuentas nuevas e intentos fallidos de entrar, para los límites. |
| `location_checks` | **(Creada.)** Resultado de cada verificación con el GPS (sin coordenadas). |
| `place_weeks` | **(Creada.)** Semanas ya decididas de la corona de cada lugar. |
| `daily_challenges` | Los retos de cada día: fecha, slot, juego, referencia de la semilla y dificultad. |
| `attempts` | **(Creada.)** Cada intento: navegador, cuenta, fecha y slot, juego, inicio, fin, puntaje, resultado, marcas, progreso del servidor y lugar del momento. |
| `daily_scores` / `weekly_scores` | Totales por día y por semana. |
| `crowns` | **(Creada.)** Coronas de cada semana: de un grupo o de un lugar, ganador, puntaje, días jugados, cuántos jugaron, segundo, nombre del grupo o del lugar ese día y si ya vio el festejo. |
| `practice_records` | Récords personales del juego libre. |
| `groups` / `group_members` | **(Creadas.)** Grupos privados (nombre, emblema, color, quien lo administra e invitación actual) y sus miembros (con cuándo entraron, salieron o los sacaron). |
| `group_code_failures` | **(Creada.)** Códigos de invitación equivocados, para los límites. |
| `friendships` | Amistades y solicitudes (etapa 1.5). |
| `duels` | Desafíos 1 vs 1 (etapa 1.5). |
| `battles` / `battle_players` | **(Creadas.)** Salas de las batallas en vivo y quién está en cada una. |
| `battle_matches` / `battle_moves` | **(Creadas.)** Cada partida de una sala, con su contenido y su resultado, y cada jugada. |
| `battle_words` | **(Creada.)** Las palabras de Diez Letras en las batallas: una fila por palabra válida y jugador. |
| `reports` / `score_flags` | Reportes de usuarios y marcas automáticas para revisión. |
| `trivia_questions` | Banco de preguntas con categoría, dificultad y estado de revisión. |

Las tablas viven en el esquema `game` (ver §4, "La base de datos"). **Row Level Security** en todas. Los puntajes y las coronas se escriben solo desde el servidor, nunca directamente desde el cliente.

## 8. Moderación y menores

- **Apodos y nombres de grupo:** normalización (acentos, leetspeak, letras repetidas), lista de palabras prohibidas en español y lunfardo, y nombres reservados. Lo dudoso queda para revisión.
- **Comunicación en el truco:** solo IDs de frases, emojis y señas predefinidas; el servidor rechaza cualquier otra cosa.
- **Avatares:** galería de SVG propios; no se suben imágenes.
- **Datos:** no se guardan coordenadas, el borrado de cuenta es completo, y se pide el año de nacimiento para aplicar las reglas de menores. *(Definir con asesoría legal.)*

## 9. Truco (etapa 2): adelanto

- `packages/truco`: motor de reglas puro y testeado: reparto; envido, real envido y falta envido; truco, retruco y vale cuatro; irse al mazo; pardas; mano y pie; turnos para 2, 4 y 6 jugadores; sin flor.
- **Servidor de tiempo real autoritativo:** cada mesa vive en el servidor y cada jugador recibe solo su mano. Opciones: Colyseus (Node) en Fly.io/Railway, o Cloudflare Durable Objects (una mesa = un objeto). Se decide al arrancar la etapa.
- **Rating:** Glicko-2 o ELO. En 2 vs 2 y 3 vs 3, el rating de cada jugador se actualiza según el promedio de los equipos.
- Reconexión, tiempo por turno y penalización por abandono.

## 10. Entornos y despliegue

- **Supabase:** organización propia, "El Mejor de" (separada de otros proyectos), con el proyecto `qosoxpsjltmghadfkzph` en São Paulo (`sa-east-1`). Plan gratuito para empezar y Pro para el lanzamiento. Se creó con la Data API apagada y RLS automático. Migraciones versionadas en `supabase/migrations`.
- **Conexión de la app:** pooler de transacciones `aws-0-sa-east-1.pooler.supabase.com:6543`, usuario `app_server.qosoxpsjltmghadfkzph`, con TLS (`sslmode=require`). La URL completa vive solo en Vercel (`DATABASE_URL`, producción).
- **Vercel:** proyecto `el-mejor-de-web` (Root Directory `apps/web`), que publica cada push a la rama principal. La dirección es `game.lipesolutions.com` (registro CNAME `game` → `cname.vercel-dns.com` en Namecheap, donde está el DNS de lipesolutions.com); `el-mejor-de-web.vercel.app` sigue andando.
- **Variables de entorno:** `CHALLENGE_SECRET` y `DATABASE_URL` (ver `apps/web/.env.example`).
- **Secretos:** solo en variables de entorno de Vercel y Supabase; nunca en el repo.
- **CI (GitHub Actions):** lint, chequeo de tipos, tests unitarios y un smoke test con Playwright en cada PR.

## 11. Costos estimados

| Servicio | Etapas 0 y 1 | Al lanzar |
|---|---|---|
| Vercel Pro | ya contratado | ya contratado |
| Supabase | USD 0 (Free) | USD 25/mes (Pro) |
| Resend (emails) | No hace falta (cuentas sin email) | — |
| Cloudflare Turnstile | USD 0 | USD 0 |
| Dominio | ya está | ya está |
| Tiempo real para el truco | — | USD 5–20/mes (etapa 2) |
| **Total adicional** | **USD 0** | **≈ USD 25–65/mes** |

> Los proyectos gratuitos de Supabase se pausan después de una semana sin actividad: para la beta conviene que `prod` ya esté en Pro.

## 12. Riesgos técnicos

| Riesgo | Plan |
|---|---|
| Trampas en juegos de habilidad | Las capas de §4 y revisión manual de las coronas grandes. |
| Rankings vacíos al principio | Beta concentrada en pocas localidades, grupos privados como motor y mensajes que invitan a traer gente. |
| Contenido (trivia y diccionario) | Banco inicial de preguntas armado con ayuda de IA y revisado a mano; diccionario libre filtrado para todo público. Verificar licencias. |
| Notificaciones en iPhone | En iOS solo funcionan con la app instalada en la pantalla de inicio (iOS 16.4 o posterior): hay que guiar la instalación. |
| Muchas batallas a la vez | Cada celu pregunta seguido (hasta unas 3 veces por segundo en los momentos clave). Con mucha gente: sumar avisos en vivo (Supabase Realtime) y preguntar menos, sin cambiar las reglas. |
