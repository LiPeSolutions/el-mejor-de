# El Mejor de

> ¿Sos el mejor de tu pueblo? Demostralo.

**El Mejor de** (nombre provisorio) es una web app de minijuegos y retos diarios para competir con amigos, conocidos y con todo tu lugar: podés ser **el mejor de tu pueblo, de tu ciudad, de tu provincia, del país… o del mundo**. Se juega desde el navegador, sin descargar nada.

## Estado

🛠️ **Etapa 0: cimientos.** Ya se puede jugar.

- ✅ Plan del producto y brief de diseño.
- ✅ Motor de los 4 minijuegos (generar retos, corregir, puntuar y detectar trampas) y reglas de la competencia, con pruebas automáticas.
- ✅ Diseño de pantallas (Claude Design), guardado en [`docs/diseno/handoff`](docs/diseno/handoff/README.md).
- ✅ Web app jugable y publicada en Vercel ([game.lipesolutions.com](https://game.lipesolutions.com)): inicio, los 3 retos del día con su resultado, resumen del día, práctica con récords, racha y puntaje de la semana. Los puntajes los calcula el servidor.
- ✅ Base de datos en Supabase (São Paulo), conectada a la app: un solo intento por reto controlado por el servidor, y los lugares oficiales de Argentina cargados (provincias, departamentos y 4.037 localidades).
- ✅ Cuentas con apodo y contraseña (sin email): personaje, El / La Mejor y perfil. Lo jugado ese día pasa a la cuenta.
- ✅ Grupos privados con su ranking del día y de la semana, invitación por link o código, y corona semanal en vivo (festejo y palmarés).
- ✅ Tu lugar con GPS y rankings por barrio, provincia y país, cada uno con su corona en vivo.
- ✅ Largada, el nuevo juego de reflejos: una largada de autos contra los tiempos de hoy de tu grupo (y bots en la práctica), con podio, foto de llegada para compartir y la corona en juego. En el reto del día desde el 4/10/2026.
- ✅ Sonidos y música hechos con código: efectos en cada juego, cortinas para el récord, el día cerrado y la corona, y un loop para el menú y cada juego.
- ✅ Batallas en vivo: de 2 a 10 amigos juegan Largada o Cinco Preguntas a la vez, cada uno en su celu, desde un grupo o con un link, con podio, revancha e historial en el grupo.
- ⏳ Vincular con Google.

## Documentos

- [Bitácora](docs/BITACORA.md): qué se hizo, dónde está cada cosa y qué sigue. Es lo primero para retomar.
- [Plan del proyecto](docs/PLAN.md): la idea, las reglas del juego, qué entra en cada etapa y las preguntas abiertas.
- [Arquitectura técnica](docs/ARQUITECTURA.md): cómo se va a construir (tecnologías, datos, anti-trampa y costos).
- [Brief de diseño](docs/diseno/BRIEF-DISENO.md): qué pantallas diseñar y cómo, con los [prompts para Claude Design](docs/diseno/PROMPTS-CLAUDE-DESIGN.md).

## Para desarrollar

Requiere Node 22 y pnpm.

```bash
pnpm install
pnpm dev        # web app en http://localhost:3000
pnpm check      # lint + tipos + pruebas
pnpm build      # build de producción
```

| Carpeta | Qué hay |
|---|---|
| `apps/web` | La web app (Next.js + Tailwind). |
| `packages/games` | Motor de los minijuegos: lógica pura, igual en el servidor y en el navegador. |
| `packages/shared` | Calendario argentino y reglas de la competencia (puntaje semanal, corona). |
| `packages/content` | Diccionario de Diez Letras y preguntas de Cinco Preguntas ([revisar preguntas](docs/contenido/preguntas.md)). |
| `packages/db` | Consultas a la base de datos, con pruebas sobre Postgres en memoria. |
| `supabase` | Migraciones de la base de datos y la carga de lugares de Georef. |
