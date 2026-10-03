# El Mejor de — Bitácora

> Qué se hizo, en qué orden y qué quedó pendiente, para retomar el proyecto sin releer conversaciones.
> Se suma una entrada al cerrar cada tanda de trabajo (lo más nuevo, arriba). El *qué* y el *por qué* del producto están en [PLAN.md](PLAN.md); el *cómo*, en [ARQUITECTURA.md](ARQUITECTURA.md).

## Cómo retomar

1. Leé esta bitácora, después [PLAN.md](PLAN.md) y [ARQUITECTURA.md](ARQUITECTURA.md).
2. Comandos desde la raíz: `pnpm install`, `pnpm dev`, `pnpm check` (lint + tipos + pruebas) y `pnpm build`.
3. Rama de trabajo: `claude/adoring-bardeen-19q4va`. Es la única del repositorio y Vercel la usa como producción: **cada push se publica solo**.

## Estado actual (3/10/2026, noche)

- **App publicada** en https://game.lipesolutions.com (también en https://el-mejor-de-web.vercel.app). Se puede jugar: inicio, los 3 retos del día con su resultado, el juego que descansa, resumen del día, práctica con récords, racha y puntaje de la semana.
- **Cuentas** con apodo y contraseña, sin email: crear cuenta (personaje y El / La Mejor), entrar, salir, perfil y editar personaje. Lo jugado ese día sin cuenta pasa a la cuenta nueva, y en otro celu se ve lo jugado.
- **Base de datos conectada** (Supabase): cada reto del día se juega una sola vez por cuenta (o por navegador, sin cuenta) y lo controla el servidor. Los lugares oficiales de Argentina están cargados.
- **Control rápido:** https://el-mejor-de-web.vercel.app/api/estado tiene que responder `"database":"connected"`.
- **Falta:** ubicación con GPS, rankings, corona, grupos y vincular con Google (ver [Pendientes](#pendientes-y-próximos-pasos)). Ranking y Grupos muestran "Muy pronto".

## Dónde está cada cosa

Sin secretos: las claves viven solo en Vercel y Supabase.

| Qué | Dónde |
|---|---|
| Código | GitHub `LiPeSolutions/el-mejor-de`, rama `claude/adoring-bardeen-19q4va`. CI con GitHub Actions: lint, tipos, pruebas y build en cada push. |
| Publicación | Vercel, equipo `lipe-demos`, proyecto `el-mejor-de-web` (Root Directory `apps/web`, funciones en São Paulo `gru1`). Variables: `CHALLENGE_SECRET` (producción y previews) y `DATABASE_URL` (producción). Los previews no tienen base, así que ahí no hay cuentas. |
| Base de datos | Supabase, organización **el mejor de** (plan Free), proyecto `qosoxpsjltmghadfkzph` en São Paulo. Data API apagada. Tablas en el esquema `game` (en el Table Editor, cambiar "schema public" por "game"). La app entra con el rol `app_server` por el pooler `aws-0-sa-east-1`. |
| Diseño | Claude Design en [`docs/diseno/handoff`](diseno/handoff/README.md). Lo que se cambió al implementarlo, en [CAMBIOS-AL-DISENO.md](diseno/CAMBIOS-AL-DISENO.md). |
| Contenido | Diccionario de Siete Letras y 106 preguntas en `packages/content`. Las preguntas, para revisar, en [preguntas.md](contenido/preguntas.md). |
| Dominio | `game.lipesolutions.com`, en el proyecto de Vercel. El DNS de lipesolutions.com está en **Namecheap**, con el registro CNAME `game` → `cname.vercel-dns.com`. |

## Cronología

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

En orden sugerido (lo acordado: "cuentas y rankings").

1. **Probar las cuentas en el celu** (responsable del producto): crear la cuenta, salir y volver a entrar.
2. **Lugar y GPS** (pantallas 19 a 23), como "Paso 2 de 2" de la cuenta. El buscador de localidades ya existe (`searchLocalities` en `packages/db`), y la verificación usa un radio de 12 km alrededor del centro de la localidad.
3. **Rankings** del día y de la semana (pantallas 24 y 25) y **corona semanal** (28 a 30 y 40).
4. **Grupos privados** (31 a 34).
5. **Vincular con Google** (botón "Muy pronto" en el perfil):
   - Hay que crear una credencial OAuth en Google Cloud (Client ID web, con `game.lipesolutions.com` como origen).
   - La idea es usar "Sign in with Google" y verificar el token en el servidor.
   - Se suman también "cambiar contraseña" y "borrar cuenta".
6. **Revisar** las 106 preguntas de trivia y la lista de palabras prohibidas en apodos (pendiente de la responsable del producto).
7. **Antes de abrir al público:**
   - Términos y privacidad.
   - Consulta legal sobre menores.
   - Modo sin conexión (PWA).
   - Plan Pro de Supabase, porque el gratis se pausa tras una semana sin uso.

## Aprendizajes técnicos

Para no tropezar dos veces:

- **Red de la sesión en la nube:** no llega a datos.gob.ar ni a `*.vercel.app`. Los datos de Georef se bajan desde la base (extensión `http`, que se apaga al terminar), y la app publicada se revisa con las herramientas de Vercel.
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
