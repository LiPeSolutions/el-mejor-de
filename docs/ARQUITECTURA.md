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
| Tiempo real (etapa 2) | A definir: **Colyseus** en Fly.io/Railway o **Cloudflare Durable Objects** | Para el truco: servidor autoritativo con estado oculto por jugador. |

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
- **`player`** = `HMAC(secreto, fecha, slot, usuario)`: único por jugador. Ordena las opciones y genera las versiones propias (esperas de Reflejos, secuencia de Secuencia).

Sin el secreto nadie puede calcular por adelantado el reto de mañana. Un cron genera los retos del día siguiente y guarda el contenido en `daily_challenges` (así un cambio de diccionario o de preguntas no altera un día ya publicado); la solución nunca sale del servidor.

**Jugar un reto:**

1. `POST /api/daily/{fecha}/{slot}/start` → el servidor crea el intento en `attempts` (único por usuario + fecha + slot), guarda `started_at` y devuelve **solo lo necesario para jugar**.
2. Durante el juego, según cada juego:
   - **Cinco Preguntas:** las preguntas se piden de a una (`/next`); el servidor cronometra cada una y corrige.
   - **Diez Letras:** cada palabra se verifica en el servidor mientras el jugador sigue (el diccionario no se manda al celu), y la lista final se corrige en el servidor.
   - **Reflejos y Secuencia:** el cliente manda el registro de eventos (toques y tiempos) y el servidor lo valida.
3. `POST /api/daily/{fecha}/{slot}/finish` → el servidor valida con `packages/games`, calcula el puntaje (0–1.000) y corre los chequeos de plausibilidad.
4. Si un intento no se termina, al vencer su tiempo máximo se cierra con lo que haya.

### Lo que ya funciona

La API de los retos es autoritativa. Lo que necesita para jugar viaja firmado, y cada intento del día se guarda en la base de datos.

| Endpoint (`POST`) | Qué hace |
|---|---|
| `/api/retos/empezar` | Arranca un reto del día (`{ mode: "daily", slot }`) o una práctica (`{ mode: "practice", game }`). Devuelve un **token firmado** y solo lo necesario para jugar. |
| `/api/retos/palabra` | Diez Letras: dice si una palabra vale y cuántos puntos da (el diccionario no se manda al celu). El celu no espera la respuesta para seguir: la palabra aparece al instante y se marca cuando llega (si falla la conexión, reintenta). El puntaje final sale de todo lo enviado, verificado o no. |
| `/api/retos/pregunta` | Cinco Preguntas: entrega una pregunta por vez, con la hora del servidor adentro. Si se pide de nuevo, conserva la hora de la primera vez. |
| `/api/retos/respuesta` | Corrige la respuesta, mide el tiempo del lado del servidor y devuelve un **recibo firmado**. |
| `/api/retos/nivel` | Secuencia: entrega la secuencia siguiente solo si la anterior se repitió bien. |
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

### Contrato de cada juego

Cada juego de `packages/games` cumple esta interfaz:

```ts
interface GameDefinition<Content, Solution, Log, Result extends { score: number; flags: Flag[] }> {
  id: GameId;                    // 'seven-letters' | 'five-questions' | 'reflexes' | 'sequence'
  category: 'words' | 'trivia' | 'skill' | 'logic';
  maxDurationMs: number;         // después de esto el servidor cierra el intento
  generate(rngs: { shared: Rng; player: Rng }): { content: Content; solution: Solution };
  evaluate(content: Content, solution: Solution, log: Log, ctx?: { serverElapsedMs?: number }): Result;
}
```

- `content` es lo que el jugador puede ver (Cinco Preguntas y Secuencia lo revelan de a partes); `solution` nunca sale del servidor.
- `evaluate` corrige, puntúa (0–1.000) y devuelve **marcas** (`flags`) de plausibilidad: `severity: 'high'` significa que el puntaje no cuenta hasta revisarlo.
- Los juegos que necesitan datos se crean con ellos: `createSevenLetters(diccionario, reglas)` y `createFiveQuestions(bancoDePreguntas)`.
- **Reglas por fecha:** un reto del día nunca cambia después de publicado. Diez Letras (`TEN_LETTERS_RULES`: 10 letras, puntos fijos) rige desde el 4/10/2026 (`TEN_LETTERS_FROM` en `apps/web/src/server/challenges.ts`). Los días anteriores se regeneran con las reglas de Siete Letras (`SEVEN_LETTERS_RULES`), y la práctica usa siempre las actuales. Así se van a manejar los próximos ajustes de puntajes.
- **Diccionario de palabras:** 365.648 palabras de 3 a 10 letras (`packages/content`). Para buscar rápido qué palabras se arman con las letras del día, cada palabra tiene una máscara de bits con sus letras.
- La misma lógica corre en el cliente (juego libre, con `practiceRngs()`) y en el servidor (retos diarios, con `dailyRngs()`).
- `dailyLineup(fecha)` arma los 3 retos del día: rota el juego que descansa.
- La API valida la forma de cada registro (esquema) antes de pasárselo al motor.

### Agujeros conocidos y cómo los cerramos

| Agujero | Mitigación |
|---|---|
| Jugar como anónimo en varios navegadores para ensayar y registrarse con el mejor intento | Solo pasa a la cuenta lo jugado ese día en el navegador donde se crea, una vez. Al entrar a una cuenta existente no se suma nada. Límite de cuentas nuevas por navegador y por conexión, y los mismos chequeos de plausibilidad. |
| Pasarse las respuestas (la palabra o las preguntas del día) | Tiempo límite corto, orden mezclado y, si hace falta, contenido distinto por jugador con dificultad equivalente. |
| Bots o scripts en juegos de habilidad (dependen del reloj del celu) | Rangos humanos (por ejemplo, reflejos de menos de 100 ms son imposibles), análisis de varianza, verificación en el podio y revisión manual de coronas grandes. Si un juego resulta demasiado trucable, sale de los retos diarios y queda solo como juego libre. |
| GPS falso | Cruce con la región por IP (headers `x-vercel-ip-*`), precisión reportada, viajes imposibles y re-verificación en momentos clave. |
| Cuentas múltiples | Un intento por cuenta, cada cuenta con sus propias variantes (Reflejos, Secuencia), límites de cuentas nuevas, señales de conexión y navegador, y revisión de patrones. |

## 5. Lugares y verificación de ubicación

**Datos.** Provincias, departamentos/partidos, municipios y localidades de Argentina desde las fuentes oficiales de [datos.gob.ar](https://datos.gob.ar) (API Georef / INDEC), importados a PostGIS: polígonos para provincias, departamentos y municipios, y punto (centroide) para las localidades. *(Verificar licencia y atribución.)*

**Tabla `game.places`** (ya creada), con una jerarquía genérica para poder sumar otros países:
`id, kind (country | province | department | locality), parent_id, name, search_name, lat, lon, radius_km`. Los ids son los de Georef con el país adelante (`ar-06224010` es Chivilcoy). Para la primera versión alcanza con el centro de cada localidad y un radio (*R* = 12 km por defecto); los polígonos llegan después.

**Cómo se elige** (decidido el 3/10/2026, a construir):

- **Con el GPS, en un toque:** el servidor busca las localidades más cercanas al punto y el jugador elige la suya, que ya queda verificada. Si no, la busca a mano (provincia y localidad) y la verifica después.
- **El campo:** sin polígonos, vale estar cerca de cualquier localidad del mismo departamento o que la localidad más cercana sea de ese departamento.
- **Ciudad de Buenos Aires:** se compite por barrio (Georef trae los 48 barrios como localidades, más una "Ciudad de Buenos Aires" genérica que no se ofrece). Con 12 km todos los barrios quedan cerca, así que ahí vale estar en el barrio o en uno de los vecinos (los centros más cercanos).
- **Sin verificar:** jugás igual y los puntajes se guardan, pero no entrás al ranking del lugar; al verificar entra lo de esa semana.

**Verificación:**

1. El navegador pide la posición (`navigator.geolocation`, alta precisión).
2. El servidor recibe `lat`, `lon` y `accuracy`, y chequea:
   - que el punto caiga dentro del polígono del municipio o del departamento de la localidad elegida, o a menos de *R* km de su centroide (*R* según el tamaño de la localidad);
   - que la precisión reportada sea razonable;
   - que la región por IP sea coherente con la provincia.
3. Se guarda **solo el resultado** en `location_verifications` (`user_id, place_id, result, reason, created_at`). Las coordenadas no se guardan.

**Re-verificación.** Un puntaje queda `pending` cuando el usuario entra al top 3 de algún nivel, cuando el puntaje es atípico para su historial (por ejemplo, más de 3 desvíos sobre su media) y antes de entregar coronas. Los puntajes `pending` no entran a los rankings por lugar hasta verificarse, con un plazo de 72 horas. *(Propuesta.)*

**Lugar congelado.** Cada puntaje guarda el `place_id` del momento en que se jugó, así una mudanza no cambia de ranking los puntajes viejos.

## 6. Rankings y coronas

- **Los grupos ya andan** (ver §4, "Grupos y corona semanal"): calculan el ranking en el momento, desde `attempts`, porque son de hasta 50 personas. Las mismas reglas (`packages/shared/src/competition.ts`) van a servir para los lugares.
- **Para los lugares**, que pueden tener miles de jugadores: `attempts` → `daily_scores` (total del día por usuario) → `weekly_scores` (suma de los 5 mejores días, días jugados y cuándo se llegó al puntaje). Se actualizan al terminar cada intento.
- Las posiciones salen de consultas con `rank() over (partition by place_id order by score desc, reached_at)` sobre tablas indexadas. Al principio alcanza con Postgres; si crece, se suma un caché con sorted sets (Redis).
- **Corona en vivo y cierre:** como en los grupos, la tiene quien va primero y se decide al cerrar la semana (lunes 00:10). Para los lugares el cierre puede seguir siendo "al mirar" o pasar a un cron si hay muchos lugares. Las coronas de provincia y país quedan en revisión hasta que se aprueban en el panel. *(Propuesta.)*

## 7. Modelo de datos (boceto)

| Tabla | Para qué |
|---|---|
| `places` | **(Creada.)** Jerarquía de lugares (país → provincia → departamento → localidad). |
| `users` | **(Creada.)** La cuenta: apodo, hash de la contraseña, personaje, El / La Mejor, localidad y, más adelante, Google vinculado. Falta: fecha de verificación y del último cambio de localidad. |
| `sessions` | **(Creada.)** Sesiones abiertas: hash del token, cuenta, navegador y vencimiento. |
| `auth_events` | **(Creada.)** Cuentas nuevas e intentos fallidos de entrar, para los límites. |
| `location_verifications` | Resultado de cada verificación (sin coordenadas). |
| `daily_challenges` | Los retos de cada día: fecha, slot, juego, referencia de la semilla y dificultad. |
| `attempts` | **(Creada.)** Cada intento: navegador, cuenta, fecha y slot, juego, inicio, fin, puntaje, resultado, marcas, progreso del servidor y lugar del momento. |
| `daily_scores` / `weekly_scores` | Totales por día y por semana. |
| `crowns` | **(Creada.)** Coronas de cada semana: de un grupo (o, más adelante, de un lugar), ganador, puntaje, días jugados, cuántos jugaron, segundo, nombre del grupo ese día y si ya vio el festejo. |
| `practice_records` | Récords personales del juego libre. |
| `groups` / `group_members` | **(Creadas.)** Grupos privados (nombre, emblema, color, quien lo administra e invitación actual) y sus miembros (con cuándo entraron, salieron o los sacaron). |
| `group_code_failures` | **(Creada.)** Códigos de invitación equivocados, para los límites. |
| `friendships` | Amistades y solicitudes (etapa 1.5). |
| `duels` | Desafíos 1 vs 1 (etapa 1.5). |
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
