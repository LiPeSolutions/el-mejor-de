# El Mejor de — Batallas en vivo por dentro

> Guía para retomar las batallas sin releer conversaciones: cómo funcionan, dónde está cada pieza, qué trampas ya pisamos y el paso a paso para sumar juegos.
>
> Las decisiones de producto están en [PLAN §8](PLAN.md#batallas-en-vivo-decidido-el-4102026), y el resumen técnico, en [ARQUITECTURA §4](ARQUITECTURA.md#batallas-en-vivo). Lo que pasó día por día, en la [bitácora](BITACORA.md).

## 1. Dónde estamos (4/10/2026)

- **Publicado:** salas de 2 a 10 jugadores, armadas desde un grupo o con un link. Se juegan a la par, con podio, revancha u otro juego, y la pestaña "Batallas" del grupo:
  - **Largada** (id `reflexes`) y **Cinco Preguntas** (id `five-questions`), desde el commit `0db320f`;
  - **Diez Letras** (id `seven-letters`), desde la tanda "Batallas: Diez Letras a la par";
  - **Secuencia** (id `sequence`), desde la tanda "Batallas: Secuencia por rondas";
  - **Tubitos** (id `water-sort`), desde la tanda "Batallas: Tubitos como el reto".
- Ya están los cinco juegos.

- Lo que decidió la responsable del producto el 4/10/2026 está en [PLAN §8](PLAN.md#batallas-en-vivo-decidido-el-4102026).

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
| `game.battle_moves` | Una jugada por jugador y ronda. | Clave `(match_id, user_id, round)`, con `round` de 0 a 199 (antes, hasta 20; lo amplió `20261004135504_battle_sequence.sql` por los desempates de Secuencia). Columnas: `shown_at`, `played_at`, `choice`, `reaction_ms` / `false_start`, `correct` / `inputs` y `log`. |
| `game.battle_words` | Cada palabra de Diez Letras. | Migración `20261004061538_battle_words.sql`. Clave `(match_id, user_id, word)`: una vez por jugador. Solo las válidas, normalizadas (`^[A-ZÑ]{3,10}$`), con `played_at`. Los puntos no se guardan: salen de la palabra (`lettersPoints`). |

Cómo usa cada juego `game.battle_moves`:
- **Cinco Preguntas:**
  - `shown_at`: cuando el servidor le dio la pregunta (`markShown`), y no cambia si la pide de nuevo.
  - `played_at` y `choice`: la respuesta. `choice` es la opción en el orden propio de la pregunta, donde 0 es la correcta.
- **Largada:**
  - `played_at`: cuando llegó al servidor.
  - `reaction_ms` y `false_start`: lo que midió el celu.
- **Secuencia:**
  - `played_at`: cuando llegó la repetición.
  - `correct`: si estaba bien (lo decide el servidor, que compara con la secuencia).
  - `inputs`: los colores que tocó (hasta 30, de 0 a 3), para saber hasta dónde llegó.
- **Tubitos:** una fila por tablero resuelto (los que no se resuelven no tienen).
  - `played_at`: cuando llegó.
  - `correct`: siempre `true`.
  - `log`: los pasos (`{ events, durationMs }`), que el servidor rejuega cada vez que arma la tabla.
- **Diez Letras** no usa `battle_moves`: cada palabra es una fila de `battle_words`. `playsOf` (en el servidor) trae una cosa o la otra según el juego.

> La columna `game` de `battles` y la de `battle_matches` tienen un `check` con los juegos que admiten. `20261004142457_battle_water_sort.sql` le sumó Tubitos (`water-sort`). Un juego nuevo necesita una migración igual.

Las consultas están en `packages/db/src/battles.ts`, agrupadas por tabla. Cada una dice en su comentario qué garantiza, por ejemplo:
- `recordAnswer`: una respuesta por pregunta, y solo a una pregunta mostrada;
- `recordStart`: una largada por ronda;
- `recordRepeat`: una repetición de Secuencia por ronda;
- `recordSolve`: un tablero resuelto de Tubitos por ronda, con sus pasos;
- `recordWord`: una palabra una vez por jugador (devuelve `false` si ya estaba);
- `joinBattle`: devuelve `joined`, `already-in`, `full`, `removed` o `closed`.

`leaveBattle` hace cuatro cosas:
1. marca la salida;
2. la anota en `departures` de la partida en juego;
3. pasa el mando al que entró primero entre los que quedan;
4. cierra la sala si quedó vacía.

## 6. Mapa del código

| Capa | Archivo | Qué hace |
|---|---|---|
| Reglas | `packages/games/src/battles.ts` | Funciones puras, sin base ni red:<br>• `BATTLE_GAMES`, `isBattleGame` y `BATTLE_RULES`;<br>• `closingTime`;<br>• `triviaFlow`, `triviaAnswer` y `triviaStandings`;<br>• `largadaFlow`, `largadaStart` y `largadaStandings`;<br>• `lettersFlow`, `lettersPoints` y `lettersStandings`;<br>• `sequenceFlow`, `sequenceAnswerMs`, `sequenceCheck` y `sequenceStandings`;<br>• `tubitosFlow` y `tubitosStandings` (los puntos de cada tablero los saca el servidor con `gradeWaterSortLevel`);<br>• `battleWinners`: el primer puesto con puntos, si jugaron 2 o más. Un empate arriba gana para cada uno. |
| Consultas | `packages/db/src/battles.ts` | Salas, jugadores, partidas, jugadas e historial del grupo. Las horas van en milisegundos (`ms()` y `at()`). |
| Contenido | `apps/web/src/server/battle-content.ts` | Lo que se decide al empezar:<br>• `pickQuestions`: 5 preguntas que no repiten las de la sala ni las del reto de hoy (`dailyQuestions`);<br>• `largadaDelays`: las 3 esperas;<br>• `pickLetters`: 10 letras con el generador del reto, nunca las de hoy (`dailyLetters`);<br>• `lettersWords`: las palabras válidas de unas letras, sacadas del diccionario (con caché de las últimas 50);<br>• `pickSequence`: los 30 colores, con el generador del reto;<br>• `pickBoards`: los 3 tableros, con su mínimo (`waterSortBoard`), y `playerBoard`: la versión de cada jugador (`waterSortPlayerBoard`, con HMAC de partida, jugador y ronda);<br>• `playerOptions`: el orden de las opciones de cada jugador, sacado con HMAC de partida, jugador y ronda;<br>• `questionById` y `categoryLabel`. |
| Servidor | `apps/web/src/server/battles.ts` | Quién puede hacer qué, y qué ve cada celu. Lo arma así:<br>• **Carga:** `load` trae la sala, los jugadores, la última partida y sus jugadas (`plays`: `moves` o `words`, según el juego).<br>• **Cuentas:** `gameOf`, `flowOf`, `finalStandings`, `settle` y `current`.<br>• **Etapa:** `stageOf` da `closed`, `lobby`, `match` o `podium`. Es `lobby` si `lobbyAt > match.startedAt`.<br>• **Permisos:** `requirePlayer`, `requireHost`, `requireOpen` y `requireInMatch`.<br>• **Salas:** `openRoom`, `joinFromGroup`, `previewRoom`, `joinWithCode`, `leaveRoom`, `removeFromRoom`, `chooseGame`, `backToLobby` y `startMatch`.<br>• **Vistas:** `battleState` arma la vista con `triviaView`, `largadaView`, `lettersView`, `sequenceView` o `tubitosView` (vía `matchView`) y con `playerViews`.<br>• **Jugadas:** `battleQuestion`, `battleAnswer`, `battleStart`, `battleWord`, `battleRepeat` y `battleSolve`.<br>• **Grupo:** `groupBattles`. |
| Endpoints | `apps/web/src/app/api/batallas/**/route.ts` y `api/grupos/[id]/batallas` | Cortos y todos iguales:<br>• `handle(async () => …)`;<br>• `assertSameOrigin(request)` en los POST;<br>• validan el cuerpo con zod;<br>• piden la sesión con `requireUser()`;<br>• llaman a una función del servidor con `groupContext(request)`, que da `{ now, ipHash }`. |
| Tipos de la API | `apps/web/src/lib/battle-types.ts` | `BattleView`, `MatchView` (`TriviaMatchView`, `LargadaMatchView`, `LettersMatchView`, `SequenceMatchView` y `TubitosMatchView`), `StandingView`, `BattleWordResponse`, `TubitosSolveResponse`, `BattlePreview`, `LiveBattleView` y `GroupBattlesResponse`. |
| Cliente de la API | `apps/web/src/lib/api.ts` (`battlesApi`) | Un método por endpoint. |
| El celu | `apps/web/src/lib/use-battle.ts` | `BattleClock`, `nextAsk`, `useBattle(id)` (devuelve `{ view, problem, now, refresh, grid }`), `useServerTime` y `unknownGame` (para los `switch`). |
| Pantallas | `apps/web/src/components/battle/` | **Lógica:**<br>• `BattleRoom` decide qué se ve según la etapa: `Lobby`, `Playing` (cuenta regresiva y el juego), `Watching` (quien llegó tarde), `Podium` y los problemas. También define `CHOICES`, `SONG_FOR` y el Wake Lock.<br>• `TriviaLive`, `LargadaLive`, `LettersLive`, `SequenceLive` y `TubitosLive` llevan la lógica de cada juego en el celu.<br>**Presentación:** `BattleLobby`, `BattleCountdown`, `BattleQuestion`, `BattleLargada`, `BattleLetters`, `BattleSequence`, `BattleTubitos`, `BattlePodium` y `BattleLettersWords` (las palabras de todos en el podio).<br>**Del reto:** el teclado de Diez Letras (`components/games/letters.tsx`: `useLetterKeys`, `useTyping`, `LetterKeys` y `WordChip`), los botones de Secuencia (`components/games/sequence-pads.tsx`) y el tablero de Tubitos (`components/tubitos/use-board.tsx`: `useWaterSortBoard`, y `ActionButton.tsx`) son los mismos que los del reto.<br>**Grupo:** `GroupBattles` (el aviso y la pestaña), `BattleStrip` y `BattleHistory`.<br>**Link:** `JoinBattleScreen` y `JoinBattle` (`/b/código`).<br>**Práctica:** `PracticeBattleCard`.<br>**Piezas:** `parts.tsx` (`BATTLE_HOW_TO`, caras, "en vivo") y `faces.ts` (`peopleOf`, `homeOf`). |
| Páginas | `app/batalla/[id]/page.tsx` y `app/b/[codigo]/page.tsx` | La sala y la invitación. |

Endpoints:

| Endpoint | Función |
|---|---|
| `POST /api/batallas` | `openRoom` |
| `GET /api/batallas/{id}` | `battleState` |
| `POST /api/batallas/{id}/juego` · `/empezar` · `/sala` | `chooseGame` · `startMatch` · `backToLobby` |
| `POST /api/batallas/{id}/pregunta` · `/respuesta` | `battleQuestion` · `battleAnswer` |
| `POST /api/batallas/{id}/largada` | `battleStart` |
| `POST /api/batallas/{id}/palabra` | `battleWord` |
| `POST /api/batallas/{id}/repetir` | `battleRepeat` |
| `POST /api/batallas/{id}/tubos` | `battleSolve` |
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

## 9. Dónde se decide qué hace cada juego

Desde Diez Letras, cada decisión por juego es un `switch` sobre el juego, con `default: return unknownGame(…)`. Al sumar un id a `BATTLE_GAMES` (o un tipo a `MatchView`), **TypeScript marca cada lugar que falta**:

- `apps/web/src/server/battles.ts`: `flowOf`, `finalStandings`, `startMatch` y `matchView`. `gameOf(match)` pasa el `game` de la base (un texto) a `BattleGame`, y falla fuerte si no es uno.
- `apps/web/src/lib/use-battle.ts`: `nextAsk`.
- `apps/web/src/components/battle/BattleRoom.tsx`: `Playing`, `scoreText` (la tabla de quien mira), `podiumDetail` y `winnerText`.

Lo que todavía hay que sumar a mano, porque no es un `switch`:
- el tipo `Flow` del servidor y el contenido de `startMatch`;
- `playsOf`, si el juego no guarda sus jugadas en `battle_moves`;
- en `BattleRoom`, lo que el juego agrega al podio (como `BattleLettersWords`), `CHOICES` y `BATTLE_HOW_TO`.

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
- **En el navegador:** [`scripts/qa`](../scripts/qa/README.md). Tres celus simulados juegan una batalla entera: el grupo, el link, las 5 preguntas, 3 largadas y el podio. También prueban los casos raros: llegar tarde, la revancha, irse y que pase el mando. `battle-letters.cjs` juega Diez Letras con palabras de verdad (las saca del diccionario); `battle-sequence.cjs`, Secuencia con uno que queda afuera y un desempate; y `battle-tubitos.cjs`, los 3 tableros de Tubitos, resueltos con el motor del juego, con alguien que se va a mitad. Correlos después de cada cambio en las batallas.

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
     - sumar el juego al `check` de la columna `game` de `battles` y `battle_matches`, si todavía no está (ver §5);
     - columnas nuevas en `battle_moves`, o una tabla nueva;
     - ampliar el `check (round between 0 and 20)`, si el juego tiene más de 21 rondas.
   - Agregá las consultas en `packages/db/src/battles.ts` y sus pruebas.
   - Aplicá la migración en Supabase (ver §11).
4. **Contenido** (`apps/web/src/server/battle-content.ts`): lo que se decide al empezar y es igual para todos. Se guarda en `content`.
   - Si reutiliza el reto del día, no puede coincidir con el de hoy (como `dailyQuestions`).
5. **Servidor** (`apps/web/src/server/battles.ts`):
   - Sumá el juego al tipo `Flow`; TypeScript marca los `switch` que faltan (§9): `flowOf`, `finalStandings`, `startMatch` y `matchView`.
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

## 13. Los juegos de la segunda tanda

Cómo quedaron Diez Letras, Secuencia y Tubitos, con lo que decidió la responsable del producto el 4/10/2026. Sirven de ejemplo para sumar un juego: uno de una sola ronda con muchas jugadas (Diez Letras), uno por rondas con eliminación (Secuencia) y uno con una versión distinta para cada jugador (Tubitos).

### Diez Letras (`seven-letters`): hecha el 4/10/2026

Quedó como el plan, con estos detalles:

- **Contenido:** `{ letters }`, de `pickLetters` (el generador del reto con una semilla nueva). Si Diez Letras es reto de hoy, no repite sus letras.
- **Las palabras válidas** las recalcula el servidor desde las letras (`sevenLettersWords` de `seven-letters.ts`, con caché en `lettersWords`). Nunca van al celu.
- **La ronda** (`lettersFlow`): abre en `startsAt` y cierra a los 90 s + 2 s de gracia, o antes si se fueron todos. Después, 2,5 s de "¡Tiempo!" (`timeUpMs`) y el podio.
- **Las letras** viajan en la vista desde 400 ms antes de abrir (`earlyMs`); el celu pregunta 300 ms antes (`LETTERS_AHEAD_MS` en `nextAsk`).
- **Las palabras** van a `game.battle_words` con `POST /palabra`.
  - Responde `valid`, `invalid`, `too-short` o `duplicate`. En `duplicate` devuelve igual los puntos: es una palabra que ya contó (por ejemplo, un reintento cuya primera respuesta se perdió).
  - Límite de 300 por jugador. Si alguien encuentra más del 80 % de un juego grande, queda en los logs (`suspicious-battle-words`).
- **Puntos:** `lettersPoints` (los del juego), sumados sin tope. Un empate lo gana quien llegó primero a ese puntaje (`lettersStandings`).
- **Vista** (`lettersView`):
  - `mine`, mis palabras;
  - `standings`, con los puntos y la cantidad de palabras de cada uno;
  - `found`, las palabras de todos, recién cuando cierra.
  - Las palabras de los demás que el filtro de los apodos marca (`isPhraseBlocked`) llegan como `null` y se ven "•••••". `onlyOne` marca las que encontró uno solo.
- **El celu** (`LettersLive`): manda sin esperar, como el reto. Mis puntos suben enseguida y los de los demás llegan cada 1 s. El teclado es el mismo componente que el del reto.
- **Podio:** `BattleLettersWords`, una fila por jugador que se abre al tocarla.

### Secuencia (`sequence`): hecha el 4/10/2026

Lo decidido: por rondas, 3 s más 1 s por color para repetir, y desempate si se equivocan todos los que quedan. Quedó así:

- **Contenido:** `{ sequence }`, los 30 colores de `pickSequence` (el generador del reto). Cada ronda muestra los primeros `largo` colores; nunca se manda la secuencia entera.
- **La ronda** (`sequenceFlow`):
  1. En `showAt`, 0,5 s (`leadMs`) y después un color cada 0,6 s, en todos los celus a la vez.
  2. `inputAt`: terminó el último color y se puede repetir, hasta `answerUntil` (3 s + 1 s por color) más 0,6 s de gracia (`deadline`).
  3. Cierra cuando respondieron todos los que siguen (o se fueron), o al vencer el plazo. Nunca antes de `inputAt`.
  4. 2,5 s (`revealMs`) con quién siguió y quién quedó afuera, y la próxima.
- **Quiénes siguen:** los que la repitieron bien. Quien se equivoca, no responde o se va, queda afuera.
  - **Desempate:** si nadie la repitió bien y al menos dos lo intentaron, la ronda se juega de nuevo, con los mismos colores, solo con los que lo intentaron (`replay: true`). Quien no respondió queda afuera igual.
  - Si nadie la repitió bien y solo uno lo intentó, gana ese.
  - Después de 3 desempates seguidos (`maxReplays`), los que quedan comparten el primer puesto: así la partida siempre termina.
- **El final:** cuando queda uno solo, o al pasar el nivel 28 (los 30 colores).
- **Los colores al celu:** van en la vista (`current.colors`) desde 400 ms antes de `showAt` (`earlyMs`), calculando el flow con `now + 400` (`soon` en `sequenceView`). El celu pregunta 300 ms antes (`AHEAD_MS` en `nextAsk`) y programa cada color a la hora del servidor.
- **La respuesta:** `POST /repetir { round, inputs }` (`battleRepeat`), una por ronda (`recordRepeat`).
  - El celu la manda al terminar, al primer error o cuando se acaba el tiempo con algo tocado. Sin nada tocado, no manda nada, y cuenta como no responder.
  - El servidor compara con la secuencia (`sequenceCheck`). Una correcta que llega antes de lo posible (`inputAt` + 120 ms por color − 300 ms) cuenta como error y va a los logs (`suspicious-battle-sequence`).
- **La tabla** (`sequenceStandings`): primero los que siguen (o el último que quedó), después por la ronda en que quedó afuera cada uno. Los puntos son los niveles que repitió bien.
- **El celu** (`SequenceLive`): `SequenceRound` (una por ronda, con su `key`) muestra los colores, la vuelta para repetir y la espera; `SequenceBetween`, el resultado de la ronda (siguen, afuera, desempate o quién ganó). Quien quedó afuera ve los colores igual, sin poder tocar.

### Tubitos (`water-sort`): hecha el 4/10/2026

Lo decidido: **como el reto**, con los mismos 3 tableros para todos (la otra opción era "al primero que lo resuelve"). Quedó así:

- **Contenido:** `{ levels }`, los 3 tableros como se sortearon (`pickBoards`: 6, 8 y 10 tubos, con su mínimo exacto). Armarlos tarda unos milisegundos.
- **Cada jugador, su versión** (`playerBoard`): los colores cambiados y los tubos llenos en otro orden, con una semilla HMAC de partida, jugador y ronda. Es el mismo rompecabezas con el mismo mínimo, pero el tablero del de al lado no se copia.
- **La ronda** (`tubitosFlow`):
  - cada tablero abre a la vez en todos los celus;
  - cierra cuando lo resolvieron todos (o se fueron), o a su tiempo máximo (`maxMs`): 100, 150 y 220 s, el `badSeconds` de cada nivel, más 2 s de gracia;
  - 5 s (`revealMs`) con la tabla del tablero, y el próximo.
- **El tablero al celu:** en la vista (`current`, su versión) desde 400 ms antes de abrir (`soon` en `tubitosView`).
- **Resolverlo:** `POST /tubos { round, events, durationMs }` (`battleSolve`).
  - El servidor rejuega los pasos sobre la versión de ese jugador (`gradeWaterSortLevel`, el del reto). Si no lo resuelven, responde 400 `not-solved`.
  - El tiempo que cuenta es el del celu, pero nunca mucho menos que el que vio el servidor desde que abrió el tablero (−2 s).
  - Vertidos más rápidos de lo que permite la pantalla van a los logs (`suspicious-battle-tubitos`).
  - Una vez por tablero (`recordSolve`).
- **Puntos y tabla:** los del reto por tablero (`waterSortLevelPoints`: movimientos contra el mínimo, y tiempo), que suman 1.000 como mucho. `tubitosStandings` ordena por puntos, después por tableros resueltos y después por tiempo total. Mientras un tablero está abierto, se ve quién lo resolvió, no cómo: la tabla solo cuenta los cerrados.
- **El celu** (`TubitosLive`):
  - `TubitosRound` (uno por tablero, con su `key`) usa `useWaterSortBoard`, la misma lógica del reto (levantar, verter, "Ahí no", deshacer y reiniciar). Al resolverlo, manda los pasos.
  - `TubitosBetween` muestra la tabla del tablero que cerró.
- **Podio:** los tableros resueltos y el tiempo total de cada uno ("3 de 3 · 0:59"), porque con los mismos puntos decide el tiempo.

## 14. Ideas para después

- **Detalle visto al documentar** (4/10/2026):
  - En el podio de una batalla de grupo, "Batallas ganadas en {grupo}" usa `groupBattleWins` tal cual. Ahí aparecen invitados que no son del grupo, y quien no está en la sala sale como "Alguien" (`peopleOf` no lo conoce).
  - La pestaña del grupo (`groupBattles`) sí filtra a los miembros.
  - Para que coincidan, `battleState` podría armar `wins` como `groupBattles`: solo miembros, con nombre y personaje.
- **Aviso en vivo con Supabase Realtime** en vez de preguntar seguido, si algún día hay muchas batallas a la vez. Las reglas no cambian: el aviso solo diría "preguntá ahora".
- **Avisar en el inicio** cuando hay una batalla en un grupo tuyo.
- **Desafíos 1 contra 1**, cada uno cuando puede (PLAN §8, etapa 1.5): pueden reutilizar `content` y las funciones de puntaje, sin la parte "a la par".
