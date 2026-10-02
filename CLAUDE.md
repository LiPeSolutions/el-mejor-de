# El Mejor de

Web app (PWA, sin descarga) de minijuegos y retos diarios con rankings y coronas por lugar
(localidad → provincia → país → mundo). Lanzamiento en Argentina, apta para todo público.

- **Antes de proponer o construir algo, leé** `docs/PLAN.md` (producto y reglas) y `docs/ARQUITECTURA.md` (técnica).
- **Roles:** la persona responsable del producto no es técnica. Decide producto, diseño y negocio; Claude se encarga del desarrollo. Las decisiones de producto se consultan; las técnicas se explican en lenguaje simple.
- **Decisiones nuevas:** reflejalas en `docs/PLAN.md` (tabla de decisiones y preguntas abiertas) o en `docs/ARQUITECTURA.md`.
- **Idioma:** documentación, textos de la app y mensajes de commit en español rioplatense (vos, jugá, tocá). Código (identificadores y comentarios) en inglés.
- **Principio rector:** la corona no se compra ni se truca. Nada pago da ventaja competitiva y los puntajes se validan en el servidor.
- **Comandos:** `pnpm check` (lint + tipos + pruebas) y `pnpm build` desde la raíz; corrélos antes de cada push. La web vive en `apps/web` (Next.js 16: leé `apps/web/AGENTS.md`).
