# Cambios al diseño de Claude Design

El handoff original está en [`handoff/`](handoff/README.md). Al implementarlo, estas cosas cambian respecto de lo que dice ese README:

| Tema | En el diseño | Lo que se implementa | Por qué |
|---|---|---|---|
| Puntaje de Siete Letras | 40 / 80 / 120 / 300 por palabra, desde 4 letras | Desde 3 letras, con puntaje ajustado a las letras del día ([PLAN §7](../PLAN.md)) | Decisión de producto (2/10/2026) |
| Puntaje de Secuencia | 100 por nivel, 1.000 en el nivel 10; el nivel 1 tiene 1 color | Empieza con 3 colores; 1.000 en el nivel 12 | Decisión de producto (2/10/2026) |
| Puntaje de Cinco Preguntas | "Hasta 200 según velocidad" | 200 si respondés en 2 s o menos; 10 menos por cada segundo extra; mínimo 100 si acertás | Coincide con el ejemplo del diseño (4 s = 180) |
| Puntaje de la semana | Suma de los 7 días (18.260 en el ejemplo) | Suma de los **5 mejores días** (máximo 15.000) | Decisión de producto (2/10/2026) |
| El / La Mejor | Preferencia en el perfil | Se pregunta **al crear la cuenta** y se puede cambiar en el perfil | Decisión de producto (2/10/2026) |
| Dominio | `elmejorde.app` | Subdominio de `lipesolutions.com` mientras se define el nombre | Decisión de producto (2/10/2026) |
| Tokens | Tailwind 3 (`tailwind.config.ts`) | Tailwind 4 (`@theme` en `globals.css`), mismos valores | El proyecto usa Tailwind 4 |
| Festejo de corona | Las nubes tapan parte del texto | El texto va por encima de las nubes | Detalle visual |
| Modo oscuro | No está diseñado | Solo modo claro por ahora | Queda como pregunta abierta |
| Pantallas con ranking (inicio, resultados, resumen) | Puesto en tu pueblo, "mejor que el 73%", rivales | Hasta que haya cuentas: racha y puntaje de la semana en el inicio; en el resumen, una tarjeta "Muy pronto" | Sin cuentas no hay ranking |
| Botón "Entrar" y saludo con nombre | "¡Buenas, Tincho!" | "¡Buenas!", sin botón "Entrar" | Llegan con las cuentas |
| Ranking, Grupos y Perfil | Pantallas completas | Pantalla "Muy pronto" con la barra de abajo | Llegan con las cuentas |
| Juego que descansa | No está diseñado | Pantalla "Hoy {juego} descansa", con botón para practicarlo | Cada día se juegan 3 de los 4 juegos |
| Pantallas bajas | Diseñado a 390 × 844 | En pantallas de menos de 800 px de alto (el navegador del celu) el personaje del inicio se achica y la racha y la semana quedan debajo del botón principal | Que "Jugar" siempre se vea sin bajar |
| Etiqueta del resultado de práctica | "Práctica · Siete Letras · no cuenta para la corona" | "Práctica · Siete Letras" | No entraba en una línea en celulares angostos |
| Ícono de la app | No está diseñado | El logo: corona dorada sobre azul | Para instalarla en la pantalla de inicio |
