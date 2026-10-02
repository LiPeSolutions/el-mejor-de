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
| Auth | **Supabase Auth** | Usuarios anónimos que después se convierten en cuenta (Google o email con código). |
| Emails | **Resend** (como SMTP de Supabase Auth) | El SMTP incluido en Supabase tiene límites muy bajos para producción. |
| Anti-bots | **Cloudflare Turnstile** | Captcha invisible al crear usuarios anónimos y al registrarse. |
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
│   └── truco/          # (etapa 2) Motor de reglas del truco
├── supabase/           # (próximo) Migraciones SQL y datos iniciales
└── docs/
```

- **Pruebas:** Vitest en cada paquete (`pnpm test`).
- **CI:** GitHub Actions corre `lint`, `typecheck`, `test` y `build` en cada push y PR.
- **Marca:** el nombre y los colores provisorios viven en `apps/web/src/config/brand.ts`.
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
   - **Siete Letras:** el cliente valida contra el diccionario para dar feedback inmediato, pero la lista final se valida en el servidor.
   - **Reflejos y Secuencia:** el cliente manda el registro de eventos (toques y tiempos) y el servidor lo valida.
3. `POST /api/daily/{fecha}/{slot}/finish` → el servidor valida con `packages/games`, calcula el puntaje (0–1.000) y corre los chequeos de plausibilidad.
4. Si un intento no se termina, al vencer su tiempo máximo se cierra con lo que haya.

**Contrato de cada juego** (`packages/games`):

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
- Los juegos que necesitan datos se crean con ellos: `createSevenLetters(diccionario)` y `createFiveQuestions(bancoDePreguntas)`.
- La misma lógica corre en el cliente (juego libre, con `practiceRngs()`) y en el servidor (retos diarios, con `dailyRngs()`).
- `dailyLineup(fecha)` arma los 3 retos del día: rota el juego que descansa.
- La API valida la forma de cada registro (esquema) antes de pasárselo al motor.

### Agujeros conocidos y cómo los cerramos

| Agujero | Mitigación |
|---|---|
| Jugar como anónimo en varios navegadores para ensayar y registrarse con el mejor intento | Turnstile al crear usuarios anónimos, límite de anónimos por IP, y los puntajes que pasan de anónimo a cuenta atraviesan los mismos chequeos de plausibilidad. |
| Pasarse las respuestas (la palabra o las preguntas del día) | Tiempo límite corto, orden mezclado y, si hace falta, contenido distinto por jugador con dificultad equivalente. |
| Bots o scripts en juegos de habilidad (dependen del reloj del celu) | Rangos humanos (por ejemplo, reflejos de menos de 100 ms son imposibles), análisis de varianza, verificación en el podio y revisión manual de coronas grandes. Si un juego resulta demasiado trucable, sale de los retos diarios y queda solo como juego libre. |
| GPS falso | Cruce con la región por IP (headers `x-vercel-ip-*`), precisión reportada, viajes imposibles y re-verificación en momentos clave. |
| Cuentas múltiples | Un intento por cuenta, señales de IP y navegador, y revisión de patrones. |

## 5. Lugares y verificación de ubicación

**Datos.** Provincias, departamentos/partidos, municipios y localidades de Argentina desde las fuentes oficiales de [datos.gob.ar](https://datos.gob.ar) (API Georef / INDEC), importados a PostGIS: polígonos para provincias, departamentos y municipios, y punto (centroide) para las localidades. *(Verificar licencia y atribución.)*

**Tabla `places`**, con una jerarquía genérica para poder sumar otros países:
`id, kind (country | province | department | locality | neighborhood), parent_id, name, slug, centroid, geom`.

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

- `attempts` → `daily_scores` (total del día por usuario) → `weekly_scores` (suma de los 5 mejores días y días jugados). Se actualizan al terminar cada intento.
- Las posiciones salen de consultas con `rank() over (partition by place_id order by score desc)` sobre tablas indexadas. Al principio alcanza con Postgres; si crece, se suma un caché con sorted sets (Redis).
- **Cierre semanal:** un cron de Vercel corre el lunes a las 00:05, hora argentina: calcula los ganadores de cada lugar y nivel, aplica desempates y mínimos, y escribe en `crowns`. Las coronas de provincia y país quedan en revisión hasta que se aprueban en el panel. *(Propuesta.)*
- Los grupos y los amigos usan los mismos `weekly_scores`, filtrados por membresía.

## 7. Modelo de datos (boceto)

| Tabla | Para qué |
|---|---|
| `places` | Jerarquía de lugares (país → provincia → departamento → localidad). |
| `profiles` | Apodo, avatar, localidad, fecha de verificación y fecha del último cambio de localidad. |
| `location_verifications` | Resultado de cada verificación (sin coordenadas). |
| `daily_challenges` | Los retos de cada día: fecha, slot, juego, referencia de la semilla y dificultad. |
| `attempts` | Cada intento: usuario, reto, inicio, fin, resultado, puntaje, estado de verificación, lugar del momento y marcas. |
| `daily_scores` / `weekly_scores` | Totales por día y por semana. |
| `crowns` | Coronas ganadas: usuario, lugar, nivel, semana, puntaje y estado. |
| `practice_records` | Récords personales del juego libre. |
| `groups` / `group_members` | Grupos privados, sus miembros y el código de invitación. |
| `friendships` | Amistades y solicitudes (etapa 1.5). |
| `duels` | Desafíos 1 vs 1 (etapa 1.5). |
| `reports` / `score_flags` | Reportes de usuarios y marcas automáticas para revisión. |
| `trivia_questions` | Banco de preguntas con categoría, dificultad y estado de revisión. |

**Row Level Security** en todas las tablas. Los puntajes y las coronas se escriben solo desde el servidor, nunca directamente desde el cliente.

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

- **Supabase:** un proyecto `dev` (plan gratuito) y uno `prod` (Pro) para el lanzamiento. Migraciones versionadas en `supabase/migrations` con la CLI de Supabase.
- **Vercel:** un preview automático por cada PR y producción desde `main` con el dominio propio.
- **Secretos:** solo en variables de entorno de Vercel y Supabase; nunca en el repo.
- **CI (GitHub Actions):** lint, chequeo de tipos, tests unitarios y un smoke test con Playwright en cada PR.

## 11. Costos estimados

| Servicio | Etapas 0 y 1 | Al lanzar |
|---|---|---|
| Vercel Pro | ya contratado | ya contratado |
| Supabase | USD 0 (Free) | USD 25/mes (Pro) |
| Resend (emails) | USD 0 (hasta 3.000 por mes) | USD 0–20/mes |
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
