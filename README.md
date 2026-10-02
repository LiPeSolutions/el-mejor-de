# El Mejor de

> ¿Sos el mejor de tu pueblo? Demostralo.

**El Mejor de** (nombre provisorio) es una web app de minijuegos y retos diarios para competir con amigos, conocidos y con todo tu lugar: podés ser **el mejor de tu pueblo, de tu ciudad, de tu provincia, del país… o del mundo**. Se juega desde el navegador, sin descargar nada.

## Estado

🛠️ **Etapa 0: cimientos.**

- ✅ Plan del producto y brief de diseño.
- ✅ Motor de los 4 minijuegos (generar retos, corregir, puntuar y detectar trampas) y reglas de la competencia, con pruebas automáticas.
- ✅ Base de la web app (Next.js), con una página provisoria.
- ⏳ Diseño de pantallas (en Claude Design).
- ⏳ Base de datos (Supabase), publicación (Vercel) y cuentas.

## Documentos

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
