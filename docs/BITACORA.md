# El Mejor de — Bitácora

> Qué se hizo, en qué orden y qué quedó pendiente, para retomar el proyecto sin releer conversaciones.
> Se suma una entrada al cerrar cada tanda de trabajo (lo más nuevo, arriba). El *qué* y el *por qué* del producto están en [PLAN.md](PLAN.md); el *cómo*, en [ARQUITECTURA.md](ARQUITECTURA.md).

## Cómo retomar

1. Leé esta bitácora, después [PLAN.md](PLAN.md) y [ARQUITECTURA.md](ARQUITECTURA.md).
2. Comandos desde la raíz: `pnpm install`, `pnpm dev`, `pnpm check` (lint + tipos + pruebas) y `pnpm build`.
3. Rama de trabajo: `claude/adoring-bardeen-19q4va`. Es la única del repositorio y Vercel la usa como producción: **cada push se publica solo**.

## Estado actual (3/10/2026)

- **App publicada** en https://el-mejor-de-web.vercel.app. Se puede jugar: inicio, los 3 retos del día con su resultado, el juego que descansa, resumen del día, práctica con récords, racha y puntaje de la semana. Ranking, Grupos y Perfil muestran "Muy pronto".
- **Base de datos conectada** (Supabase): cada reto del día se juega una sola vez por navegador y lo controla el servidor. Los lugares oficiales de Argentina están cargados.
- **Control rápido:** https://el-mejor-de-web.vercel.app/api/estado tiene que responder `"database":"connected"`.
- **Falta:** cuentas, ubicación con GPS, rankings, corona, grupos y perfil (ver [Pendientes](#pendientes-y-próximos-pasos)).

## Dónde está cada cosa

Sin secretos: las claves viven solo en Vercel y Supabase.

| Qué | Dónde |
|---|---|
| Código | GitHub `LiPeSolutions/el-mejor-de`, rama `claude/adoring-bardeen-19q4va`. CI con GitHub Actions: lint, tipos, pruebas y build en cada push. |
| Publicación | Vercel, equipo `lipe-demos`, proyecto `el-mejor-de-web` (Root Directory `apps/web`, funciones en São Paulo `gru1`). Variables: `CHALLENGE_SECRET` (producción y previews) y `DATABASE_URL` (producción). |
| Base de datos | Supabase, organización **el mejor de** (plan Free), proyecto `qosoxpsjltmghadfkzph` en São Paulo. Data API apagada. Tablas en el esquema `game` (en el Table Editor, cambiar "schema public" por "game"). La app entra con el rol `app_server` por el pooler `aws-0-sa-east-1`. |
| Diseño | Claude Design en [`docs/diseno/handoff`](diseno/handoff/README.md). Lo que se cambió al implementarlo, en [CAMBIOS-AL-DISENO.md](diseno/CAMBIOS-AL-DISENO.md). |
| Contenido | Diccionario de Siete Letras y 106 preguntas en `packages/content`. Las preguntas, para revisar, en [preguntas.md](contenido/preguntas.md). |
| Dominio | Pendiente. Propuesta: `elmejorde.lipesolutions.com`. |

## Cronología

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

1. **Cuentas** con Supabase Auth: Google y/o email con código. Hay que configurar los proveedores y las direcciones en el panel de Supabase, crear las credenciales de Google y, para email, un servicio de envío (por ejemplo, Resend) con registros en el dominio.
2. **Perfil:** apodo, avatar y El / La Mejor (pantallas 17 y 18).
3. **Lugar y GPS** (pantallas 19 a 23): el buscador de localidades ya existe (`searchLocalities` en `packages/db`); la verificación usa un radio de 12 km alrededor del centro de la localidad.
4. **Rankings** del día y de la semana (pantallas 24 y 25) y **corona semanal** (28 a 30 y 40).
5. **Grupos privados** (31 a 34).
6. **Dominio propio** (subdominio de lipesolutions.com).
7. **Revisar las 106 preguntas** de trivia (pendiente de la responsable del producto).
8. **Antes de abrir al público:** términos y privacidad, consulta legal sobre menores, modo sin conexión (PWA) y plan Pro de Supabase (el gratis se pausa tras una semana sin uso).

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
