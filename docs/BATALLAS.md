# El Mejor de — Batallas en vivo por dentro

> Guía para retomar las batallas sin releer conversaciones: cómo funcionan, dónde está cada pieza, qué trampas ya pisamos y el paso a paso para sumar juegos.
>
> Las decisiones de producto están en [PLAN §8](PLAN.md#batallas-en-vivo-decidido-el-4102026), y el resumen técnico, en [ARQUITECTURA §4](ARQUITECTURA.md#batallas-en-vivo). Lo que pasó día por día, en la [bitácora](BITACORA.md).

## 1. Dónde estamos (4/10/2026)

- **Publicado** (commit `0db320f`): salas de 2 a 10 jugadores, armadas desde un grupo o con un link. Se juegan:
  - **Largada** (id `reflexes`);
  - **Cinco Preguntas** (id `five-questions`).
- Las dos se juegan a la par, con podio, revancha u otro juego, y la pestaña "Batallas" del grupo.
- **Falta:**

  | Juego | Id | Estado |
  |---|---|---|
  | Diez Letras | `seven-letters` | Formato decidido; falta construirla. En la sala dice "Muy pronto". |
  | Secuencia | `sequence` | Formato decidido; falta construirla. En la sala dice "Muy pronto". |
  | Tubitos | `water-sort` | **Sin decidir** si entra ([PLAN §13](PLAN.md#13-preguntas-abiertas), pregunta 13). Hay que consultarlo antes de construir nada. |

- Los formatos decididos (opción "Todos a la par", elegida el 4/10/2026):
  - **Diez Letras:** las mismas letras en los mismos 90 segundos, viendo los puntos de los demás.
  - **Secuencia:** por rondas; el que se equivoca queda afuera.

## 2. Lo que hicimos

1. **Pedido:** "jugar al mismo tiempo con los del grupo", para un rato libre con amigos.
2. **Decisiones, consultadas antes de empezar** (PLAN §8):
   - de 2 a 10, con cuenta, desde un grupo o con un link;
   - un juego por partida, con revancha u otro juego;
   - todos a la par;
   - para divertirse, sin rankings ni coronas, con historial en el grupo;
   - primero Largada y Cinco Preguntas.
3. **Bocetos:** 10 pantallas armadas con las piezas reales de la app. La responsable del producto las aprobó antes de construir. También aprobó tres reglas que propusimos:
   - si alguien se va, la partida sigue;
   - si se va quien la armó, elige el que entró después;
   - quien llega tarde juega la próxima.
4. **Construcción**, en tres tandas:
   - salas, sumarse y la consulta seguida con el reloj sincronizado;
   - Cinco Preguntas y Largada a la par;
   - podio, revancha, historial del grupo, pruebas y documentación.
5. **Pruebas:**
   - 46 automáticas (reglas, consultas y una batalla entera en el servidor);
   - en el navegador, con tres celus simulados a la vez (`scripts/qa`, ver §10).
6. **Errores encontrados y corregidos:**
   - con la base de verdad, las preguntas ya jugadas se guardaban mal (ver §11);
   - en el grupo decía "Sumarme" a quien ya estaba adentro;
   - el aviso del grupo duraba demasiado.

## 3. La idea: una partida es una cuenta, no un programa andando

En Vercel cada pedido corre en una función que nace y muere con él, así que no hay dónde dejar un "reloj de la partida" corriendo. Por eso las batallas no tienen proceso propio:

- **Al empezar**, la partida guarda tres cosas:
  - cuándo arranca (`starts_at`, después de la cuenta regresiva);
  - quiénes la juegan (`players`, los que estaban en la sala);
  - qué se juega (`content`: los ids de las preguntas, o las esperas de las luces).
- **Cada jugada** se guarda con la hora del servidor (`game.battle_moves`).
- **Cada pedido recalcula dónde va la partida** con una función pura de `packages/games/src/battles.ts`: `triviaFlow` o `largadaFlow`.
  - Reciben `startsAt`, el roster, las jugadas y `now`. El roster dice quién juega y cuándo se fue cada uno.
  - Devuelven las rondas hasta la actual (`rounds`) y cuándo va el podio (`endsAt`, que es `null` mientras siga).
- **Cuándo cierra una ronda** (`closingTime`):
  - cuando jugaron todos los que siguen (quien se fue no la frena desde que se fue, aunque vuelva);
  - o al vencer su tiempo.
  - La ronda siguiente arranca a una hora fija después del cierre.
- **El resultado se escribe una sola vez:**
  - Cuando `now ≥ endsAt`, el primer pedido que llega lo escribe: `current()` llama a `settle()`, que llama a `endMatch`, y esta solo escribe si `ended_at is null`.
  - Si nadie miró el final (se fueron todos antes del podio), lo escribe el historial del grupo (`groupBattles`, con partidas empezadas hace más de 10 minutos). Las salas sueltas no tienen historial, así que ahí no hace falta.

Qué ganamos así:
- cualquier celu "empuja" la partida;
- un reinicio del servidor no pierde nada;
- las pruebas mueven el reloj pasando otro `now` (`ctx(T + 16_000)`), sin esperar.

### La línea de tiempo de Cinco Preguntas

```
"Empezar" ── 3,5 s de cuenta regresiva ──▶ startsAt = abre la pregunta 1
pregunta 1: abre ── cierra cuando respondieron todos (o a los 15 s + 0,6 s) ── 5 s con la correcta y la tabla ──▶
pregunta 2: abre ── … ──▶ … ── pregunta 5 cierra ── 5 s ──▶ endsAt: el podio
```

### La de Largada (cada largada es una ronda)

```
lightsAt ─0,8 s─ luz 1 ─1 s─ luz 2 ─1 s─ luz 3 ─1 s─ luz 4 ─1 s─ luz 5 ─ espera de 0,2 a 3 s ─▶ signalAt: se apagan
signalAt ── cierra cuando tocaron todos (o a 1,5 s + 0,8 s de la señal; nunca antes de la señal) ──▶ closedAt
closedAt ─0,7 s─▶ raceAt: la carrera en todos los celus ─4,8 s─▶ nextAt: la largada siguiente (o el podio, después de la 3.ª)
```

- La espera es la misma para todos.
- `signalAt = lightsAt + 800 + 4 × 1000 + espera`.
- Si todos se adelantan, la ronda cierra igual en `signalAt`: las luces siempre se apagan antes de la carrera.

Todos los tiempos están en `BATTLE_RULES` (`packages/games/src/battles.ts`). Los de cada juego salen de sus reglas: `FIVE_QUESTIONS_RULES` y `LARGADA_RULES`.

## 4. El reloj: que pase a la vez en todos los celus

- **Hora del servidor:** cada respuesta de `GET /api/batallas/{id}` trae dos horas.
  - `serverAt`: cuando llegó el pedido.
  - `serverNow`: cuando salió la respuesta.
- **Cálculo del desfase** (`BattleClock` en `apps/web/src/lib/use-battle.ts`), como NTP:
  - Con la hora de envío y la de llegada, el celu calcula cuánto está corrido su reloj (`offset`) y cuánto tardó el viaje (`delay`).
  - De las últimas 10 mediciones usa la que menos tardó.
  - Confía en el resultado después de 3 (`settled`).
- **Programar algo a una hora del servidor:** el celu usa `setTimeout(fn, horaDelServidor − clock.now())`. Así hacen:
  - las luces (`LargadaLive.begin`);
  - la carrera (`raceAt`);
  - el pedido de la pregunta (`TriviaLive`, 300 ms antes de `opensAt`).
- **En pantalla:** la cuenta regresiva y los relojes usan `useServerTime(now, cadaMs)`, que se refresca solo. No llames a `Date.now()` en el render: la regla de pureza del React Compiler lo rechaza.
- **Cada cuánto pregunta** (`nextAsk`):

  | Momento | Pregunta cada |
  |---|---|
  | En la sala y en el podio | 2 s |
  | Antes de `startsAt` | justo al terminar la cuenta (entre 0,1 y 1 s) |
  | Pregunta abierta | 0,7 s (0,4 s si ya respondiste) |
  | Pregunta cerrada | justo cuando viene la siguiente (hasta 1,5 s) |
  | Largada antes de la señal | justo después de la señal (entre 0,15 y 1,5 s) |
  | Largada después de la señal | 0,3 s |
  | Largada cerrada | justo cuando viene la siguiente (hasta 1,5 s) |

- **Sin conexión:** si falla, reintenta cada 0,8 s × fallas, hasta 5 s.
- **Segundo plano:** con la app en segundo plano no pregunta; al volver, pregunta enseguida.
- **Preguntar ya:** `refresh()` pregunta en el momento (por ejemplo, después de mandar una respuesta).
- **La música** (`useMusic(key, grid)` en `lib/sound.ts`) va al mismo compás en todos los celus.
  - `grid = −offset` es el momento en que el reloj del servidor marcaba 0, en la hora de este celu. El loop cuenta sus tiempos desde ahí.
  - Solo se corre si el cálculo cambia más de 40 ms, porque cada corrimiento reinicia la canción.
- **Pantalla prendida:** durante la partida se pide Wake Lock (`useWakeLock`, en `BattleRoom.tsx`) y se vuelve a pedir al volver a la app.

## 5. Las tablas

Migración `supabase/migrations/20261004031914_battles.sql`. Solo entra `app_server`, con RLS, como en el resto del esquema `game`. Nunca se borran filas: irse marca `left_at`.

| Tabla | Qué guarda | Lo importante |
|---|---|---|
| `game.battles` | La sala. | `code` de 4 caracteres fáciles de leer (`^[2-9A-HJKMNP-Z]{4}$`), único entre las salas abiertas. `group_id` (null si es suelta). `host_id`. `game` (el de la próxima partida). `lobby_at` (cuándo el anfitrión volvió a elegir juego). `used_questions`. `closed_at`. |
| `game.battle_players` | Quién está. | Clave `(battle_id, user_id)`. `left_at`, `removed_at` (la sacaron: no vuelve) y `seen_at` (su celu preguntó; se actualiza como mucho cada 5 s). |
| `game.battle_matches` | Cada partida. | `players` (uuid[], fijo al empezar). `departures` (jsonb `{userId: ms}`: quién se fue durante la partida). `content` (jsonb, nunca se manda entero a un celu). `started_at`, `starts_at`, `ended_at`, `results`, `winners`. Índice único `battle_matches_one_open`: una partida abierta por sala. |
| `game.battle_moves` | Una jugada por jugador y ronda. | Clave `(match_id, user_id, round)`, con `round` de 0 a 20. Columnas: `shown_at`, `played_at`, `choice` y `reaction_ms` / `false_start`. |

Cómo usa cada juego `game.battle_moves`:
- **Cinco Preguntas:**
  - `shown_at`: cuando el servidor le dio la pregunta (`markShown`), y no cambia si la pide de nuevo.
  - `played_at` y `choice`: la respuesta. `choice` es la opción en el orden propio de la pregunta, donde 0 es la correcta.
- **Largada:**
  - `played_at`: cuando llegó al servidor.
  - `reaction_ms` y `false_start`: lo que midió el celu.

> ⚠️ **Antes de sumar Tubitos**, la columna `game` de `battles` y la de `battle_matches` tienen un `check` que solo admite `'seven-letters', 'five-questions', 'reflexes', 'sequence'`. Tubitos (`water-sort`) necesita una migración que los cambie, como `20261004051946_water_sort.sql` hizo con `attempts`. Diez Letras y Secuencia ya entran.

Las consultas están en `packages/db/src/battles.ts`, agrupadas por tabla. Cada una dice en su comentario qué garantiza, por ejemplo:
- `recordAnswer`: una respuesta por pregunta, y solo a una pregunta mostrada;
- `recordStart`: una largada por ronda;
- `joinBattle`: devuelve `joined`, `already-in`, `full`, `removed` o `closed`.

`leaveBattle` hace cuatro cosas:
1. marca la salida;
2. la anota en `departures` de la partida en juego;
3. pasa el mando al que entró primero entre los que quedan;
4. cierra la sala si quedó vacía.

## 6. Mapa del código

| Capa | Archivo | Qué hace |
|---|---|---|
| Reglas | `packages/games/src/battles.ts` | Funciones puras, sin base ni red:<br>• `BATTLE_GAMES`, `isBattleGame` y `BATTLE_RULES`;<br>• `closingTime`;<br>• `triviaFlow`, `triviaAnswer` y `triviaStandings`;<br>• `largadaFlow`, `largadaStart` y `largadaStandings`;<br>• `battleWinners`: el primer puesto con puntos, si jugaron 2 o más. Un empate arriba gana para cada uno. |
| Consultas | `packages/db/src/battles.ts` | Salas, jugadores, partidas, jugadas e historial del grupo. Las horas van en milisegundos (`ms()` y `at()`). |
| Contenido | `apps/web/src/server/battle-content.ts` | Lo que se decide al empezar:<br>• `pickQuestions`: 5 preguntas que no repiten las de la sala ni las del reto de hoy (`dailyQuestions`);<br>• `largadaDelays`: las 3 esperas;<br>• `playerOptions`: el orden de las opciones de cada jugador, sacado con HMAC de partida, jugador y ronda;<br>• `questionById` y `categoryLabel`. |
| Servidor | `apps/web/src/server/battles.ts` | Quién puede hacer qué, y qué ve cada celu. Lo arma así:<br>• **Carga:** `load` trae la sala, los jugadores, la última partida y sus jugadas.<br>• **Cuentas:** `flowOf`, `standingsOf`, `settle` y `current`.<br>• **Etapa:** `stageOf` da `closed`, `lobby`, `match` o `podium`. Es `lobby` si `lobbyAt > match.startedAt`.<br>• **Permisos:** `requirePlayer`, `requireHost`, `requireOpen` y `requireInMatch`.<br>• **Salas:** `openRoom`, `joinFromGroup`, `previewRoom`, `joinWithCode`, `leaveRoom`, `removeFromRoom`, `chooseGame`, `backToLobby` y `startMatch`.<br>• **Vistas:** `battleState` arma la vista con `triviaView` o `largadaView` (vía `matchView`) y con `playerViews`.<br>• **Jugadas:** `battleQuestion`, `battleAnswer` y `battleStart`.<br>• **Grupo:** `groupBattles`. |
| Endpoints | `apps/web/src/app/api/batallas/**/route.ts` y `api/grupos/[id]/batallas` | Cortos y todos iguales:<br>• `handle(async () => …)`;<br>• `assertSameOrigin(request)` en los POST;<br>• validan el cuerpo con zod;<br>• piden la sesión con `requireUser()`;<br>• llaman a una función del servidor con `groupContext(request)`, que da `{ now, ipHash }`. |
| Tipos de la API | `apps/web/src/lib/battle-types.ts` | `BattleView`, `MatchView` (`TriviaMatchView` y `LargadaMatchView`), `StandingView`, `BattlePreview`, `LiveBattleView` y `GroupBattlesResponse`. |
| Cliente de la API | `apps/web/src/lib/api.ts` (`battlesApi`) | Un método por endpoint. |
| El celu | `apps/web/src/lib/use-battle.ts` | `BattleClock`, `nextAsk`, `useBattle(id)` (devuelve `{ view, problem, now, refresh, grid }`) y `useServerTime`. |
| Pantallas | `apps/web/src/components/battle/` | **Lógica:**<br>• `BattleRoom` decide qué se ve según la etapa: `Lobby`, `Playing` (cuenta regresiva y el juego), `Watching` (quien llegó tarde), `Podium` y los problemas. También define `CHOICES`, `SONG_FOR` y el Wake Lock.<br>• `TriviaLive` y `LargadaLive` llevan la lógica de cada juego en el celu.<br>**Presentación:** `BattleLobby`, `BattleCountdown`, `BattleQuestion`, `BattleLargada` y `BattlePodium`.<br>**Grupo:** `GroupBattles` (el aviso y la pestaña), `BattleStrip` y `BattleHistory`.<br>**Link:** `JoinBattleScreen` y `JoinBattle` (`/b/código`).<br>**Práctica:** `PracticeBattleCard`.<br>**Piezas:** `parts.tsx` (`BATTLE_HOW_TO`, caras, "en vivo") y `faces.ts` (`peopleOf`, `homeOf`). |
| Páginas | `app/batalla/[id]/page.tsx` y `app/b/[codigo]/page.tsx` | La sala y la invitación. |

Endpoints:

| Endpoint | Función |
|---|---|
| `POST /api/batallas` | `openRoom` |
| `GET /api/batallas/{id}` | `battleState` |
| `POST /api/batallas/{id}/juego` · `/empezar` · `/sala` | `chooseGame` · `startMatch` · `backToLobby` |
| `POST /api/batallas/{id}/pregunta` · `/respuesta` | `battleQuestion` · `battleAnswer` |
| `POST /api/batallas/{id}/largada` | `battleStart` |
| `POST /api/batallas/{id}/sumarse` · `/salir` · `/sacar` | `joinFromGroup` · `leaveRoom` · `removeFromRoom` |
| `GET` · `POST /api/batallas/codigo/{código}` | `previewRoom` · `joinWithCode` |
| `GET /api/grupos/{id}/batallas` | `groupBattles` |

## 7. Una partida de punta a punta (Cinco Preguntas)

1. **Empezar.** El anfitrión toca "Empezar" (`POST /empezar`, `startMatch`).
   - El servidor controla que la pida el anfitrión, que no haya otra partida en juego, que haya al menos 2 en la sala y que el juego esté en `BATTLE_GAMES`.
   - Elige las preguntas con `pickQuestions`. Cuando la sala ya jugó casi todas, vuelve a empezar (`resetUsedQuestions`).
   - Crea la partida con `startsAt = now + 3,5 s`. Si dos "Empezar" llegan juntos, el índice único deja pasar uno; el otro recibe `match-running`.
2. **El celu pregunta seguido** (`GET /api/batallas/{id}`, `battleState`). En cada pedido:
   - anota que el celu sigue ahí (`touchBattlePlayer`);
   - cierra la partida si ya terminó (`current`);
   - calcula la etapa (`stageOf`) y arma la vista con `triviaView`.
3. **Qué trae la vista** (`triviaView`):
   - `round`: la pregunta actual, con `opensAt`, `closesAt`, `closed` y `nextAt`;
   - `answered`: quiénes respondieron, nunca qué;
   - `myChoice`;
   - `reveals`: solo las preguntas cerradas, con la correcta en mi orden, los resultados y la tabla;
   - `standings`.
4. **Pantalla.** `BattleRoom` → `Playing` muestra la cuenta regresiva hasta `startsAt` (con el reloj sincronizado) y después `TriviaLive`.
5. **La pregunta.** 300 ms antes de `opensAt`, el celu pide `POST /pregunta { round }` (`battleQuestion`).
   - El servidor solo la da si está abierta o si abre en menos de 400 ms (`earlyMs`).
   - `markShown` anota la primera vez, nunca antes de `opensAt`.
   - Devuelve las opciones en el orden de ese jugador (`playerOptions`) y `answerUntil`.
6. **La respuesta.** Tocar una opción manda `POST /respuesta { round, choice }` (`battleAnswer`).
   - Vale si la pregunta está abierta y no pasaron 15 s + 0,6 s.
   - El servidor pasa la elección del orden del jugador al orden de la pregunta (0 = correcta).
   - `recordAnswer` guarda una sola por pregunta; si ya había una, responde `already-answered`.
   - Los puntos los calcula `triviaAnswer`, con el tiempo desde `shown_at` y `fiveQuestionsPoints`, como en el reto del día.
7. **El cierre.** Cuando responde el último, o se termina el tiempo, el pedido siguiente ve `closed: true`.
   - Durante 5 s se ven la correcta, quién acertó (con sus puntos) y la tabla, con flechas de quién subió.
   - Después abre la siguiente.
8. **El podio.** Después de la quinta, en `endsAt`, el primer pedido escribe el resultado y la etapa pasa a `podium` (`BattlePodium`).
   - "Revancha" llama a `/empezar` de nuevo, con otras preguntas.
   - "Otro juego" llama a `/sala` (`backToLobby` marca `lobbyAt`).
   - Si es de un grupo, se ven las batallas ganadas por cada uno.

Lo que cambia en Largada:
- **Contenido:** `{ delaysMs }`, tres esperas al azar de 0,2 a 3 s (`largadaDelays`), las mismas para todos.
- **Luces:** `LargadaLive` programa las cinco luces y la señal a la hora del servidor. Mide la reacción desde el cuadro en que se pintó la señal (dos `requestAnimationFrame`) y manda `POST /largada { round, reactionMs, falseStart }`.
- **Llegó tarde a la ronda:** si el celu se enteró después de la señal, manda enseguida "no largó", así nadie espera.
- **El control del servidor** (`battleStart`):
  - acepta la largada entre `lightsAt` y el plazo;
  - si llegó antes de lo posible (`now < signalAt + reactionMs − 300 ms`), cuenta como adelantada y deja un aviso en los logs (`suspicious-battle-start`);
  - guarda una por ronda (`recordStart`).
- **La carrera:** en `raceAt` corre en todos los celus a la vez, con las largadas de todos (`departures` y `raceEndMs` de `lib/largada.ts`).
- **Sonido:**
  - el de la largada suena después del toque, nunca con la señal (no avisa cuándo se apagan);
  - la música baja durante las luces.
- **La tabla** (`largadaStandings`): el promedio con las penalidades del juego (450 ms si te adelantás, 700 si no largás). Un empate lo gana la mejor largada.

## 8. Juego limpio

- **Los puntajes** los calcula el servidor, con las mismas funciones de cada juego (`fiveQuestionsPoints`, `largadaScore`). El celu solo muestra.
- **El contenido** (`content`) nunca va entero a un celu:
  - cada pregunta se entrega recién cuando abre;
  - la correcta y las elecciones de los demás se ven recién al cerrar.
- **El orden de las opciones** es distinto para cada uno: al lado, nadie puede decir "es la de arriba".
- **El reloj de la pregunta** corre desde que ese jugador la recibió (`shown_at`), así que pedirla tarde no da más tiempo.
- **Las preguntas** no repiten las de la sala (`used_questions`) ni las del reto de hoy, así la batalla no arruina el reto.
- **En Largada**, las esperas son las mismas para todos. Una reacción imposible por la hora de llegada cuenta como adelantada.
- **Una jugada por ronda**, garantizada por la base: la clave primaria y los `where … is null`.
- **Límites:**
  - 20 salas nuevas por hora por cuenta;
  - códigos equivocados: 10 por cuenta y 30 por conexión por hora, como en los grupos;
  - una sala por jugador a la vez (`leaveOthers`);
  - hasta 10 por sala.
- **Las batallas no cuentan para rankings ni coronas**, así que no hay nada que "comprar" ni "trucar" ahí. Igual, las reglas del servidor son las mismas que en los retos.

## 9. Lo que hoy da por hecho que hay dos juegos

Al sumar el tercero, estos lugares **no van a avisar solos** que falta algo: hoy son un `if` de Cinco Preguntas con un `else` que es Largada.

- `apps/web/src/server/battles.ts`:
  - `flowOf` y `standingsOf`;
  - `settle`: la cantidad de rondas;
  - `startMatch`: el contenido.
  - Son peligrosos porque `match.game` viene de la base como `string`, así que TypeScript no avisa.
- `apps/web/src/components/battle/BattleRoom.tsx`:
  - `Playing`: qué componente se muestra;
  - `Watching`: qué columna muestra la tabla;
  - `Podium`: `detail` y `winnerDetail`.
- `apps/web/src/lib/use-battle.ts` → `nextAsk`: después del bloque de Cinco Preguntas asume Largada. Ahí TypeScript sí avisa, porque el tipo nuevo no tiene `rounds`.

**Primer paso recomendado:** pasar cada uno a un `switch (game)` exhaustivo, con `default: { const unreachable: never = game; throw … }`. Así TypeScript marca todo lo que falta.

Lo que ya anda con cualquier juego de `BATTLE_GAMES`:
- las vistas del grupo y del link;
- el historial (`GAMES[game]`);
- la música (`SONG_FOR` ya tiene los cinco).

## 10. Pruebas

- **Reglas:** `packages/games/src/battles.test.ts`. Funciones puras con un `now` inventado: cuándo abre y cierra cada ronda, quien se fue, los puntos y la tabla.
- **Consultas:** `packages/db/src/battles.test.ts`, sobre PGlite (`testDatabase()` de `@repo/db/testing`). Cubren una partida por sala, una jugada por ronda, el mando que pasa y la sala que se cierra.
- **Servidor:** `apps/web/src/server/battles.test.ts`. Una batalla entera con varios jugadores, moviendo el reloj con `ctx(T + ms)`.
  - Helpers: `room(host, ...otros)` arma una sala; `answer(user, battleId, round, at, afterMs, right)` responde bien o mal.
  - Para leer la correcta en una prueba, `questionById(...).options[0]` es la correcta y `question.options` está en el orden del jugador.
- **En el navegador:** [`scripts/qa`](../scripts/qa/README.md). Tres celus simulados juegan una batalla entera: el grupo, el link, las 5 preguntas, 3 largadas y el podio. También prueban los casos raros: llegar tarde, la revancha, irse y que pase el mando. Correlos después de cada cambio en las batallas.

## 11. Trampas que ya pisamos

- **JSON y listas a la base:** con postgres.js van como texto y se convierten en SQL: `$1::text::jsonb`, y para listas el helper `array()` de `packages/db/src/battles.ts`. Si se mandan como jsonb, se guardan como un texto JSON y no como una lista.
  - Así se rompió `used_questions` con la base de verdad.
  - PGlite no lo mostraba: **probá en la base de verdad** cualquier columna jsonb o lista nueva.
- **React Compiler:** el lint rechaza leer `Date.now()` o refs durante el render, y hacer `setState` directo dentro de un efecto. Para esquivarlo:
  - los temporizadores que leen props frescas van con `useEffectEvent`, como `begin`, `onSignal` y `race` en `LargadaLive`;
  - la hora en pantalla sale de `useServerTime`.
- **Rutas tipadas:** después de crear una carpeta en `app/api/batallas/...`, `RouteContext<"/api/batallas/[id]/nueva">` no existe hasta que corra `npx next typegen` (o `next dev`/`next build`), desde `apps/web`.
- **Lo que manda la base:** que una partida esté abierta o cerrada sale de `ended_at`, y la etapa sale de `stageOf`. La vista no guarda estado propio: todo se recalcula en cada pedido.
- **Llegar tarde:**
  - quien entra a la sala con la partida en juego no está en `players`: ve `Watching` y juega la próxima;
  - quien se fue tiene `departures[userId]`: aunque vuelva a la sala, no vuelve a esa partida (`requireInMatch` responde `left-match`).
- **Pedir antes de tiempo:** `TriviaLive` pide la pregunta 300 ms antes y el servidor acepta hasta 400 ms antes. Si cambiás uno, revisá el otro.
- **Sonidos que delatan:** en Largada, ningún sonido ni vibración puede llegar antes que la señal en la pantalla. La vibración de la señal se consultó y quedó.
- **El aviso del grupo:** solo aparece si alguien de la sala preguntó en los últimos 2 minutos (`LIVE_MS`). Una sala por la que nadie preguntó en 20 minutos no se puede abrir con el código (`idleMs`).
- **La base que usan las pruebas** se vacía con un `truncate` de las tablas de batallas. Si sumás una tabla, agregala ahí (`beforeEach` de `apps/web/src/server/battles.test.ts` y el de `packages/db/src/battles.test.ts`).
- **Migraciones en Supabase:** aplicalas con la herramienta de migraciones (`apply_migration`), con el mismo nombre de versión que el archivo de `supabase/migrations` (por ejemplo `20261004051946_water_sort`). Después revisá los avisos de seguridad (`get_advisors`).

## 12. Paso a paso para sumar un juego

1. **Producto.** Confirmá el formato con la responsable del producto. Si hay pantallas nuevas, mostrá bocetos antes de construir (se hizo así con las primeras dos).
2. **Reglas** (`packages/games/src/battles.ts`):
   - Sumá el id a `BATTLE_GAMES` y sus tiempos a `BATTLE_RULES.<juego>`.
   - Definí el tipo de jugada (`XMove`) y el de ronda (`XRoundFlow`).
   - Escribí tres funciones: `xFlow({ startsAt, roster, moves, now })`, que devuelve `MatchFlow<XRoundFlow>` usando `closingTime`; el puntaje de una jugada; y `xStandings(roster, moves, closed)`, que usa `withPlaces`.
   - Reutilizá los puntos del juego (no inventes otros) y `battleWinners`.
   - Escribí las pruebas en `battles.test.ts`: cuándo abre y cierra, quien se fue, el final, la tabla y los empates.
3. **Base** (si hace falta):
   - Escribí una migración nueva en `supabase/migrations/` (nombre `AAAAMMDDhhmmss_nombre.sql`) para lo que haga falta:
     - sumar el juego al `check` de la columna `game` (solo Tubitos);
     - columnas nuevas en `battle_moves`, o una tabla nueva;
     - ampliar el `check (round between 0 and 20)`, si el juego tiene más de 21 rondas.
   - Agregá las consultas en `packages/db/src/battles.ts` y sus pruebas.
   - Aplicá la migración en Supabase (ver §11).
4. **Contenido** (`apps/web/src/server/battle-content.ts`): lo que se decide al empezar y es igual para todos. Se guarda en `content`.
   - Si reutiliza el reto del día, no puede coincidir con el de hoy (como `dailyQuestions`).
5. **Servidor** (`apps/web/src/server/battles.ts`):
   - Empezá por los `switch` exhaustivos de §9.
   - Sumá el juego al tipo `Flow`, a `flowOf`, a `standingsOf` y a la cantidad de rondas en `settle`.
   - Agregá el contenido en `startMatch`.
   - Agregá `xView` en `matchView`. Pensá bien qué ve cada uno y cuándo.
   - Escribí las funciones de las jugadas con `requireOpen`, `requirePlayer` y `requireInMatch(match, user.id, "<id>")`, validando la ronda con el flow a `ctx.now`.
   - Sumá pruebas en `battles.test.ts`: una partida entera, alguien que se va y una jugada fuera de tiempo.
6. **Tipos** (`apps/web/src/lib/battle-types.ts`): agregá `XMatchView` (con `game: "<id>"`) y sumalo a `MatchView`, más las respuestas de los endpoints nuevos.
7. **Endpoints:**
   - Creá `app/api/batallas/[id]/<acción>/route.ts`, copiando uno existente: zod, `assertSameOrigin`, `requireUser` y `groupContext`.
   - Agregá el método en `battlesApi` (`lib/api.ts`).
   - Corré `npx next typegen` (ver §11).
8. **El celu** (`lib/use-battle.ts`): sumá el juego a `nextAsk`, con la cadencia de lo que esté por pasar.
9. **Pantallas** (`components/battle/`):
   - Creá `XLive.tsx`, con la lógica: pedidos, temporizadores a la hora del servidor y sonidos.
   - Creá `BattleX.tsx`, la presentación, reutilizando las piezas del juego y de `parts.tsx` (caras, "en vivo", tabla).
   - En `BattleRoom.tsx`:
     - mostrá el juego en `Playing`;
     - sumá su columna en `Watching`;
     - sumá su `detail` y su `winnerDetail` en `Podium`;
     - en `CHOICES`, pasá `soon: false`.
   - Agregá su línea en `BATTLE_HOW_TO` (`parts.tsx`): se ve en la sala y en el link.
10. **Probar:**
    - `pnpm check` y `pnpm build` desde la raíz;
    - sumá el juego a `scripts/qa/battle-group.cjs` y corrélo con tres celus;
    - mirá las capturas en 390 × 844 y 360 × 740.
11. **Documentar:**
    - PLAN §8: "Hecho", con la fecha;
    - ARQUITECTURA "Batallas en vivo";
    - este documento: §1 y §13;
    - la bitácora.

## 13. Plan para los que faltan

Propuestas técnicas para no arrancar de cero. Lo marcado como **consultar** es de producto: se pregunta antes de construir.

### Diez Letras (`seven-letters`)

**Decidido:** las mismas letras en los mismos 90 segundos, viendo los puntos de los demás.

- **Contenido** (`startMatch`):
  - Las 10 letras, sacadas con el mismo generador del reto: `createSevenLetters(diccionario, TEN_LETTERS_RULES).generate({ shared: createRng(semilla), … })`. El diccionario es `getSevenLettersDictionary()` de `server/challenges.ts`.
  - Se guarda `{ letters }`.
  - Si Diez Letras es reto de hoy, que no salgan sus letras.
- **Las palabras válidas:** el servidor las recalcula desde las letras (exportar de `seven-letters.ts` una función que, dadas las letras, devuelva las palabras), con un caché por partida. Nunca van al celu.
- **Una sola ronda:**
  - abre en `startsAt` y cierra a los 90 s + 2 s de gracia (`lateGraceMs`);
  - cierra antes solo si se fueron todos (`closingTime` sin nadie que haya "jugado");
  - después, unos segundos de "¡Tiempo!" y el podio.
- **Las jugadas son palabras**, y no entran en `battle_moves`: cada palabra sería una fila, y `round` llega solo hasta 20. Propuesta: una tabla nueva `game.battle_words (match_id, user_id, word, played_at, points)`, con clave `(match_id, user_id, word)` para no repetir palabras.
- **Endpoint** `POST /api/batallas/{id}/palabra { word }`:
  - responde `valid`, `invalid`, `too-short` o `duplicate`, con los puntos;
  - el celu manda sin esperar la verificación, como en el reto (`SevenLettersPlay`);
  - límites: 300 palabras por jugador, y la hora del servidor tiene que estar dentro del plazo.
- **Puntos:** los del juego por palabra (`sevenLettersWordPoints`), sumados sin el tope de 1.000, así el mejor sigue sacando ventaja. Un empate lo gana quien llegó primero a ese puntaje.
- **Vista:**
  - las letras, mis palabras con sus puntos, y la tabla en vivo con los puntos y la cantidad de palabras de cada uno;
  - **nunca las palabras de los demás mientras se juega** (se podrían copiar);
  - el celu pregunta cada 1 s durante los 90 s.
- **Pantalla:** reutilizar las piezas de `SevenLettersPlay` (las letras y la palabra armada), con una tira de caras y puntos arriba y el reloj hasta el cierre con la hora del servidor.
- **Consultar:**
  - ¿al final se ven las palabras de todos, o la mejor de cada uno?
  - ¿puntos sin tope?
  - ¿botón "Terminé" para cortar antes?

### Secuencia (`sequence`)

**Decidido:** por rondas; el que se equivoca queda afuera.

- **Contenido:** una secuencia para todos, como la del reto (`SEQUENCE_RULES`: 4 colores, empieza en 3 y suma uno por nivel, hasta 30). Se guarda `{ sequence }`.
- **Ronda n:**
  1. Se muestran `3 + n` colores, a la vez en todos los celus, a 600 ms cada uno, desde `showAt`.
  2. Después hay un plazo para repetirla, por ejemplo 2 s + 0,8 s por color.
  3. La ronda cierra cuando respondieron todos los que siguen en juego, o al vencer el plazo.
  4. Unos 2,5 s para ver quién quedó afuera, y la siguiente.
- **Quiénes siguen:** los que repitieron bien todas las rondas anteriores y no se fueron. Lo calcula el flow desde las jugadas. No responder a tiempo es quedar afuera.
- **El final:**
  - cuando después de una ronda queda uno solo o ninguno;
  - o al llegar al largo máximo.
  - Si los últimos se equivocan en la misma ronda, comparten el primer puesto, igual que un empate arriba.
- **Entregar la ronda sin adelantarla:** `POST /api/batallas/{id}/secuencia { round }` devuelve los colores de esa ronda como mucho 400 ms antes de `showAt`, como la pregunta, y anota `shown_at`. Nunca se manda la secuencia entera.
- **La respuesta:** `POST /api/batallas/{id}/repetir { round, inputs }`. El servidor la compara con la esperada.
  - Una respuesta que llega antes de lo humanamente posible (menos de 120 ms por color desde que terminó de mostrarse) cuenta como error.
- **Base:** guardar en `battle_moves` si acertó (por ejemplo, una columna nueva `correct boolean`) y los colores (`inputs smallint[]`). Ampliar el `check` de `round` (con 28 niveles posibles no alcanza 0–20).
- **Tabla:** por niveles superados. Un empate comparte el puesto.
- **Pantalla:**
  - los cuatro botones de `SequencePlay`;
  - una tira con quién sigue y quién quedó afuera;
  - "Quedaste afuera en el nivel N": esa persona mira el resto.
- **Consultar:**
  - ¿cuánto tiempo hay para repetir?
  - si se equivocan todos a la vez, ¿comparten el primer puesto o se repite la ronda?

### Tubitos (`water-sort`): primero, decidir

**Sin decidir** (PLAN §13, pregunta 13). Opciones para llevarle a la responsable del producto:

- **A. Los 3 niveles del reto a la par:**
  - cada nivel es una ronda (6, 8 y 10 tubos) con el mismo tablero para todos;
  - cierra cuando lo resolvieron todos, o al tiempo límite (por ejemplo 60, 90 y 120 s);
  - puntos como en el reto: movimientos contra el mínimo y tiempo.
- **B. Al primero que lo resuelve:** cada ronda, un tablero, y suma más quien lo resuelve primero.

Lo que ya existe y sirve:
- **El tablero:** `sharedBoard` arma la misma estructura para todos y `playerVersion` cambia los colores y el orden de los tubos para cada uno. En una batalla al lado eso evita copiar.
- **La corrección:** `replayWaterSortLevel` valida jugada por jugada, y `waterSortLevelPoints` / `gradeWaterSortLevel` dan los puntos.
- **El tiempo:** el reto anota con la hora del servidor cuándo entregó y cuándo se resolvió cada nivel (`level:N` y `solved:N`). En una batalla serían `shown_at` y `played_at`.
- **La música:** `SONG_FOR` ya tiene "tubitos".

Hace falta:
- la migración del `check` del juego en `battles` y `battle_matches` (§5);
- guardar el registro de cada nivel (una columna jsonb en `battle_moves`, o una tabla).

## 14. Ideas para después

- **Detalle visto al documentar** (4/10/2026):
  - En el podio de una batalla de grupo, "Batallas ganadas en {grupo}" usa `groupBattleWins` tal cual. Ahí aparecen invitados que no son del grupo, y quien no está en la sala sale como "Alguien" (`peopleOf` no lo conoce).
  - La pestaña del grupo (`groupBattles`) sí filtra a los miembros.
  - Para que coincidan, `battleState` podría armar `wins` como `groupBattles`: solo miembros, con nombre y personaje.
- **Aviso en vivo con Supabase Realtime** en vez de preguntar seguido, si algún día hay muchas batallas a la vez. Las reglas no cambian: el aviso solo diría "preguntá ahora".
- **Avisar en el inicio** cuando hay una batalla en un grupo tuyo.
- **Desafíos 1 contra 1**, cada uno cuando puede (PLAN §8, etapa 1.5): pueden reutilizar `content` y las funciones de puntaje, sin la parte "a la par".
