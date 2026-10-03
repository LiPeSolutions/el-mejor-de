# Cambios al diseño de Claude Design

El handoff original está en [`handoff/`](handoff/README.md). Al implementarlo, estas cosas cambian respecto de lo que dice ese README:

| Tema | En el diseño | Lo que se implementa | Por qué |
|---|---|---|---|
| Juego de palabras | "Siete Letras": 7 letras en una fila | **"Diez Letras"**: 10 letras en dos filas de 5 botones grandes (64 px de alto), que responden apenas se apoya el dedo. Las letras salen de una palabra escondida que usa las 10, con premio | Decisión de producto (3/10/2026): botones más fáciles de tocar y más palabras posibles |
| Puntaje de Diez Letras | 40 / 80 / 120 / 300 por palabra, desde 4 letras | Puntos fijos desde 3 letras: 25 / 50 / 80 / 120 / 160 / 220 (8 o más) y 300 de premio por la de 10; tope 1.000 ([PLAN §7](../PLAN.md)) | Decisión de producto (3/10/2026): antes cada palabra daba muy poco y 1.000 parecía imposible |
| Puntaje de Secuencia | 100 por nivel, 1.000 en el nivel 10; el nivel 1 tiene 1 color | Empieza con 3 colores; 1.000 en el nivel 12 | Decisión de producto (2/10/2026) |
| Puntaje de Cinco Preguntas | "Hasta 200 según velocidad" | 200 si respondés en 2 s o menos; 10 menos por cada segundo extra; mínimo 100 si acertás | Coincide con el ejemplo del diseño (4 s = 180) |
| Puntaje de la semana | Suma de los 7 días (18.260 en el ejemplo) | Suma de los **5 mejores días** (máximo 15.000) | Decisión de producto (2/10/2026) |
| El / La Mejor | Preferencia en el perfil | Se pregunta **al crear la cuenta** y se puede cambiar en el perfil | Decisión de producto (2/10/2026) |
| Dominio | `elmejorde.app` | `game.lipesolutions.com` mientras se define el nombre | Decisión de producto (2/10 y 3/10/2026) |
| Tokens | Tailwind 3 (`tailwind.config.ts`) | Tailwind 4 (`@theme` en `globals.css`), mismos valores | El proyecto usa Tailwind 4 |
| Festejo de corona | Las nubes tapan parte del texto | El texto va por encima de las nubes | Detalle visual |
| Modo oscuro | No está diseñado | Solo modo claro por ahora | Queda como pregunta abierta |
| Pantallas con ranking (inicio, resultados, resumen) | Puesto en tu pueblo, "mejor que el 73%", rivales | Hasta que haya rankings: racha y puntaje de la semana en el inicio; en el resumen, una tarjeta "Muy pronto" con "Crear cuenta" y "Compartir" (o "Jugás como Tincho" con cuenta) | Los rankings llegan después de las cuentas |
| Botón "Entrar" y saludo con nombre | "¡Buenas, Tincho!" | "Entrar" arriba en la primera visita; con cuenta, "¡Buenas, Tincho!" y el personaje de cada uno en el inicio | Como el diseño, desde que hay cuentas (3/10/2026) |
| Ranking y Grupos | Pantallas completas | Pantalla "Muy pronto" con la barra de abajo | Llegan después de las cuentas |
| Crear cuenta (17) | "Continuar con Google" o "con email", y el podio real de tu localidad | "Crear mi cuenta" (apodo y contraseña) o "Ya tengo cuenta". Podio decorativo, sin puntajes, y tres beneficios (sin email, lo de hoy pasa a tu cuenta, cualquier celu) | Decisión de producto (3/10/2026): cuentas sin email. Todavía no hay ranking para mostrar puestos reales |
| Apodo y personaje (18) | Apodo, bicho, color y accesorio; "Paso 1 de 2" | Suma la contraseña y "¿Cómo querés que te nombremos?" (El / La Mejor, sin opción marcada de entrada). Sin "Paso 1 de 2" hasta que llegue el paso del lugar. El anillo azul marca bicho, color y accesorio elegidos | Cuentas con contraseña; El / La se elige al crear la cuenta |
| Entrar | No está diseñado | Apodo y contraseña, con "¿Te olvidaste la contraseña?" (sin email todavía no se recupera) | Hace falta para volver a entrar |
| Perfil (27) | Coronas, podios, palmarés y récords | Racha, días jugados, mejor día y semana; palmarés vacío hasta que haya coronas; récords de práctica; "Vincular con Google · Muy pronto" y "Salir de la cuenta". Editar personaje reusa la pantalla 18 | Sin rankings todavía no hay coronas ni podios |
| Antes de empezar un reto | No lo contempla | Si el celu conoce una cuenta pero no entraste: "No entraste como Tincho: este reto no va a quedar en tu cuenta · Entrar" | Para no perder un reto por jugarlo sin cuenta |
| Diez Letras · jugando (04) | Aviso arriba por cada palabra (válida, inválida, repetida) y lista "Encontradas" | La palabra aparece al instante en "Tus palabras" (la última, primera), en gris con puntitos mientras se verifica, y las letras quedan libres para seguir. Después muestra sus puntos o un círculo rojo si no vale. Avisos arriba solo para "muy corta", "ya la mandaste" y la de 10 letras | Decisión de producto (3/10/2026): con mala conexión no hay que esperar la verificación para seguir jugando |
| Juego que descansa | No está diseñado | Pantalla "Hoy {juego} descansa", con botón para practicarlo | Cada día se juegan 3 de los 4 juegos |
| Pantallas bajas | Diseñado a 390 × 844 | En pantallas de menos de 800 px de alto (el navegador del celu) el personaje del inicio se achica y la racha y la semana quedan debajo del botón principal | Que "Jugar" siempre se vea sin bajar |
| Etiqueta del resultado de práctica | "Práctica · Siete Letras · no cuenta para la corona" | "Práctica · Diez Letras" | No entraba en una línea en celulares angostos |
| Ícono de la app | No está diseñado | El logo: corona dorada sobre azul | Para instalarla en la pantalla de inicio |
