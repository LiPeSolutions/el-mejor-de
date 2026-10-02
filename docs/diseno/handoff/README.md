# Handoff: El Mejor de — UI v1 (prioridad 1 y 2)

## Overview

**El Mejor de** es una web app (PWA, celular primero) de minijuegos y retos diarios con rankings por lugar (localidad → provincia → país) y grupos privados. Tres retos por día, iguales para todos, un solo intento, de 0 a 1.000 puntos cada uno. Cada lunes el #1 de la semana de cada lugar se corona ("El Mejor de Chivilcoy – Semana 39"). Este paquete cubre el flujo completo de prioridad 1 (llegada → 3 retos → resumen → compartir → cuenta → ubicación → ranking) y las pantallas de prioridad 2 (perfil, festejo de corona, grupos, practicar, el cuarto juego Secuencia y el puntaje pendiente): **40 pantallas** en total.

Idioma de toda la interfaz: **español rioplatense con voseo** ("Jugá", "Tocá", "¿Me ganás?"). Nada de "Juega ahora", nada en inglés.

## About the Design Files

Los archivos de esta carpeta son **referencias de diseño hechas en HTML**: prototipos que muestran el aspecto y el comportamiento buscado, no código para copiar a producción. La tarea es **recrear estas pantallas en el entorno real del proyecto** — Next.js (App Router) + Tailwind CSS, según `CLAUDE.md` del repo — usando sus patrones y librerías. Los archivos `.dc.html` se abren en el navegador junto con `support.js` e `ios-frame.jsx` (misma carpeta).

- `El Mejor de - Direcciones.dc.html` — las 40 pantallas en marcos de celular de 390 × 844, agrupadas por recorrido (vuelta 3 = prioridad 1, vuelta 4 = prioridad 2; las vueltas 1 y 2 son las exploraciones previas y no se implementan).
- `El Mejor de - Sistema.dc.html` — el mini sistema de diseño: colores, tipografía, espaciado, botones, chips, tarjetas de reto, podio y filas, nav, personajes, fondo y movimiento, inventario.
- `personajes/` — 34 SVG exportados (bichos, caras, accesorios, mascotas de los juegos, elenco).
- `components/Personaje.jsx` — el generador de personajes como componente React, 1:1 con el prototipo.
- `tokens/tailwind.tokens.ts` y `tokens/globals.css` — tokens listos para `tailwind.config.ts` y los keyframes/fuentes.

## Fidelity

**Alta fidelidad (hifi).** Colores, tipografías, medidas, radios, sombras y textos son finales. Recrear las pantallas con exactitud usando los tokens de este documento; lo que no esté acá (p. ej., estados de carga) sigue las mismas reglas: píldoras, blanco sobre cielo, sombra del color del elemento.

Lo que **no** está diseñado todavía: modo oscuro (solo tokens claros), truco online, amigos, desafíos 1 vs 1, notificaciones, sponsors.

## Screens / Views

Marco: 390 × 844, barra de estado de 66 px arriba, zona segura de 44 px abajo. Fondo de toda pantalla: degradé `sky` (180°, `#C3DAF8 0% → #DAE1F6 42% → #E8EAF6 100%`) con 2–3 nubes blancas asomando por los bordes (ver "Nubes"). Margen lateral: 20 px. Una acción principal por pantalla, siempre abajo (`mt-auto`). Las rutas son una propuesta.

### A · Llegada

| # | Pantalla | Ruta | Qué pasa |
|---|---|---|---|
| 01 | Llegada desde un link | `/d/[dia]?de=[apodo]` | Logo + "Entrar" arriba. Tarjeta blanca (radio 28) con chip "Te invitó Tincho · Chivilcoy", personaje del invitador (150 px, cara guiño), "Tincho hizo" / **2.640** (Outfit 60, −0.04em) / "puntos hoy en Chivilcoy", tres chips con los puntajes por juego (punto de color + "Letras 860"), y "¿Le ganás?" (Outfit 36). CTA "Jugar los retos de hoy" + "3 retos · 5 minutos · sin registrarte". Link "¿Qué es El Mejor de?". |
| 02 | Primera visita | `/` sin sesión | Trío de personajes (64 px) sobre nube, título "¿Sos el mejor de tu pueblo?" (Outfit 34), párrafo 15/500, tres filas-beneficio (ícono en baldosa 32 px: reloj coral, candado violeta, trofeo dorado), CTA "Jugar" + "Sin registrarte · sin descargar nada". |

### B · C · D · Los retos (misma estructura, color del juego)

| # | Pantalla | Ruta | Qué pasa |
|---|---|---|---|
| 03 / 06 / 08 / 37 | Antes de empezar | `/jugar/[juego]` | Cerrar (38 px) + chip "Reto n de 3". Cabecera-baldosa (radio 28, degradé 165° claro→base→oscuro del juego) con kicker de categoría, nombre en Outfit 32 y la mascota (120 px) sobre círculo blanco 38% con `drop-shadow(0 10px 14px rgba(0,0,0,.28))`. Una línea de cómo se juega (16/600). Dos datos (reloj y "1.000 puntos máximo"). Aviso **"Tenés un solo intento. Si salís, cuenta como jugado."** (fondo `#FFF3D6`, borde 2 px dorado, candado). Botón **Empezar** de 74 px con brillo, en el color del juego. "El tiempo arranca cuando tocás". |
| 04 | Siete Letras · jugando | `/jugar/letras` | Cabecera: cerrar, "SIETE LETRAS" en `#C94F2E`, reloj píldora `0:47` (Outfit 16, cifras tabulares). Puntaje (Outfit 36) y "Palabras 6". Caja de palabra (72 px, radio 20, Outfit 30, tracking .08em, cursor coral) con el toast de feedback encima. 7 letras en grilla (56 px, radio 14): usada = coral con sombra, libre = blanca con anillo interior `#D9DDF3` y letra `#B8BDD6`. Botones Borrar / Mezclar (48 px blancos) y Enviar (48 px coral, Outfit 15). Encontradas: chips blancas "ANIMAR +120". Pie: "La de 7 letras vale 300". Feedback: válida (verde `#1FA093`, check), inválida (rojo `#E2504C`, cruz), repetida (dorado, flecha circular). |
| 05 / 11 / 39 | Resultado del reto | `/jugar/[juego]/resultado` | Chip "Reto n de 3 · juego". Mascota 84 px. "¡Bien ahí, Nico!" (14/700 gris) → **790** (Outfit 84, −0.05em) "/ 1.000". Barra de 10 px (blanca, relleno degradé del juego). Chip azul claro "Mejor que el 73% de Chivilcoy" (sparkles). Tarjeta de detalle (palabras y la de 7 letras que faltó / promedio y 5 rondas / niveles superados). CTA azul "Siguiente reto" o "Ver resumen del día". El número anima de 0 al valor en 0.9 s junto con la barra. |
| 07 | Cinco Preguntas · jugando | `/jugar/preguntas` | "PREGUNTA 2 DE 5" en `#6A4FD6`; anillo de 44 px con el tiempo (trazo 5, violeta sobre `#E8EAF6`) y el segundo restante dentro. Cinco barras de progreso (30 × 8, verde respondida / violeta actual / blanca pendiente). "Puntaje 180 · Fútbol". Tarjeta de pregunta (Outfit 24, radio 24). Cuatro opciones 84 px (Outfit 34): correcta = verde con check en la esquina. Toast "¡Correcta! +180 · respondiste en 4 s". Avanza sola al segundo. |
| 09 / 10 | Reflejos · esperá / ¡YA! | `/jugar/reflejos` | Esperá: fondo tinta `#23263A`, círculo punteado 240 px con reloj de arena, "Esperá…" (Outfit 40). ¡YA!: fondo turquesa `#2EC4B6`, círculo blanco 35% con rayo tinta 110 px, "¡YA!" (Outfit 96) + "¡Tocá!". Toda la pantalla es el botón. Abajo cinco píldoras: rondas hechas con ms, actual con borde sólido, pendientes punteadas. Nunca depende solo del color: cambian ícono y texto. Ronda perdida: toast rojo "Te adelantaste · ronda perdida". |
| 38 | Secuencia · jugando | `/jugar/secuencia` | "SECUENCIA" en `#9A6200`, píldora "Nivel 6". Puntaje y récord. Barra tinta (56 px, radio 18): "Tu turno" + 6 puntos (dorados hechos, punteados pendientes) + "4 de 6"; variantes "Mirá… · 3 de 6" (azul) y "Ese no era · llegaste al nivel 9" (rojo). Cuatro pads cuadrados (gap 12, esquina exterior 32 / interiores 12): coral-estrella, violeta-luna, turquesa-rayo, dorado-corazón. Pad activo: `scale(1.04)` + anillo blanco 6 px + anillo del color 4 px. Cada nivel vale 100; 1.000 en el nivel 10. |

### E · Resumen y compartir

| # | Pantalla | Ruta | Qué pasa |
|---|---|---|---|
| 12 | Resumen · sin cuenta | `/hoy/resumen` | "DÍA 214 · TU RESUMEN", **2.570** (Outfit 68) "/ 3.000". Tarjeta con tres filas de 52 px (baldosa de ícono 30 px por juego, puntaje Outfit 20). Tarjeta azul (degradé 165°): "HOY ESTARÍAS" / "#6 en Chivilcoy" (Outfit 32) / "A 70 puntos de Tincho · 312 jugadores" / caja "Creá tu cuenta para entrar al ranking". Botones "Crear cuenta" (azul) y "Compartir" (blanco). "Nuevos retos en 07:42:15". |
| 13 | Resumen · con cuenta | `/hoy/resumen` | Cabecera: píldora de lugar con check verde + píldora de racha dorada. Personaje 84 px + "¡Día cerrado, Nico!" (Outfit 26) + 2.570/3.000. Filas compactas 46 px con punto de color. Tres tarjetas de puesto (Chivilcoy #6 ↑, Buenos Aires #241 ↑, Argentina #1.530; flecha verde = subiste). Banda dorada de racha. CTA "Compartir". Pie con cuenta regresiva y "La corona se define el domingo". |
| 14 | Hoja de compartir | modal | Fondo atenuado (`#5A6180 → #73788F`), hoja blanca radio 28 arriba, asa 44 × 5 `#D9DDF3`. Vista previa (degradé cielo, nube, avatar 64, "Nico hizo 2.570", "¿Me ganás?"). Texto editable en caja `#F1F2FA`. Cuatro destinos (56 px, radio 18): WhatsApp `#25D366`, Historias (degradé coral→magenta→violeta), Copiar link (azul), Guardar (tinta). "Cancelar" neutro. |
| 15 | Historia 1080 × 1920 | servidor (`/api/og/historia`) | Fondo cielo + nubes. Marca con tile 88 px + "El Mejor de Chivilcoy" (Outfit 54), píldora "Día 214". Personaje 340 px. "Nico hizo" (44/700) → **2.570** (Outfit 220) → "puntos · #6 en Chivilcoy". Tres baldosas de juego (radio 36) con puntaje Outfit 72. Píldora dorada de racha / distancia al rival, "¿Me ganás?" (Outfit 112), "elmejorde.app". Sin degradés complejos: todo reproducible con `@vercel/og` / Satori (nubes = círculos). |
| 16 | Vista previa 1200 × 630 | servidor (`/api/og/link`) | Degradé 135°, nubes, personaje 200 px a la izquierda, "El Mejor de Chivilcoy · Día 214", **Nico hizo 2.570** (Outfit 104), "puntos hoy · #6 en Chivilcoy · a 70 de Tincho", "¿Me ganás?" en azul (Outfit 80), dominio. |

### F · Cuenta y ubicación

| # | Pantalla | Ruta | Qué pasa |
|---|---|---|---|
| 17 | Crear cuenta | `/cuenta/crear` | Mini podio de la localidad (Colo_88 / LaFlor / Juli) y, bajo la línea, tu fila punteada "#6 · Tu lugar está libre · 2.570". "Hoy estarías #6 en Chivilcoy" (Outfit 30) + "Creá tu cuenta para entrar al ranking y guardar lo que jugaste hoy." Botones blancos "Continuar con Google" / "Continuar con email", "Ahora no" fantasma, texto legal 11 px. **Nunca** bloquear el juego por registro. |
| 18 | Apodo y personaje | `/cuenta/personaje` | Volver + "Paso 1 de 2". Baldosa azul "Así te van a ver" con el personaje grande (140 px, emBob). Campo "Tu apodo" con validación "Disponible" en verde. "Elegí tu bicho": 8 celdas 50 px. "Color": 8 círculos 34 px, el elegido con anillo blanco 3 px + azul 2 px. "Accesorio": 6 celdas con etiqueta (Nada, Boina, Gorra, Anteojos, Bufanda, Mate). CTA "Seguir". |
| 19 | Tu lugar | `/cuenta/lugar` | "Paso 2 de 2". "¿De dónde sos?" + "Tu localidad define tu ranking. Después la verificamos con el GPS." Campo Provincia (select), campo Localidad con buscador (foco: borde azul) y lista de resultados: la sugerida (del link del invitador) resaltada en `#E6EAFF` con check. "Podés cambiarla una vez cada 30 días". |
| 20 | Antes de pedir el GPS | `/cuenta/ubicacion` | Ícono escudo-check 120 px en baldosa azul radio 36. "Para que el ranking sea justo, chequeamos que estés en Chivilcoy." (Outfit 28) + "Nunca guardamos ni mostramos tu ubicación exacta." Tres filas aclaratorias. CTA "Verificar ubicación" (pin) y "Más tarde". El permiso nativo se pide **después** de tocar el CTA. |
| 21 | Verificada | resultado | Chip verde "Ubicación verificada". Personaje 130 px (emFloat) con destellos. "¡Listo! Ya competís por Chivilcoy" (Outfit 32) + texto con el puesto. CTA "Ver el ranking". |
| 22 | GPS denegado | resultado | Personaje (cara sorpresa) + baldosa blanca con pin tachado rojo. "No pudimos acceder a tu ubicación". Pasos numerados (iOS) + línea Android. CTA "Reintentar" (flecha circular), "Más tarde · tenés 72 horas". |
| 23 | Fuera de tu zona | resultado | Chip dorado "Puntaje pendiente" (reloj de arena). "Parece que ahora no estás en Chivilcoy" + "Tranqui: tu puntaje queda pendiente. Verificalo desde tu localidad dentro de las próximas 72 horas…". Tarjeta con cuenta regresiva `71:58:12` (Outfit 24, tabular) y "2.570 puntos en espera". CTA "Entendido", "¿Te mudaste? Cambiá tu localidad". |

### G · Ranking e Inicio

| # | Pantalla | Ruta | Qué pasa |
|---|---|---|---|
| 24 | Ranking · Hoy | `/ranking` | Título "Ranking" + "Día 214 · 312 jugadores". Chips de lugar (Chivilcoy activo en tinta · Buenos Aires · Argentina · Grupos ▾), segmentado Hoy / Semana. Podio (ver sistema). Filas de 50 px; "te invitó" en azul claro; en provincia/país se agrega la localidad en gris. **Tu fila fija abajo** (azul, radio 20) con puesto en dorado, avatar, "Vos · Nico", distancia al de arriba, puntaje. Nav: Ranking activo. |
| 25 | Único de la localidad | `/ranking` variante | Podio con el #1 ocupado por vos (con corona) y #2/#3 punteados. Tarjeta: "Sos El Mejor de Tapalqué… porque sos el único." + "La corona es tuya igual, pero gana más gracia con competencia. ¿Te animás a invitar a alguien?" Botón WhatsApp verde "Invitar por WhatsApp" + "Copiar link de Tapalqué". |
| 26 | Inicio · todo jugado | `/` | Cabecera: lugar ✓ + racha. Héroe azul "Hoy ya está, Nico" / "Día 214 · jugaste los 3 retos" con el personaje dormido (116 px, emBob) y globo blanco "Volvé mañana y seguí la racha. Mientras, podés practicar." Tres baldosas compactas con puntaje y check. Dos tarjetas: "Hoy en Chivilcoy #6 de 312 · A 70 puntos de Tincho" y "Semana 40 #9 · Tu primera semana · 1 día jugado". Tarjeta de cuenta regresiva `07:42:15`. Botones "Compartir" / "Practicar". Nav: Hoy. Las otras variantes de Inicio (retos pendientes, "Jugar [siguiente reto]") están en la vuelta 2 (opción 2a) del archivo de direcciones. |

### Prioridad 2

| # | Pantalla | Ruta | Qué pasa |
|---|---|---|---|
| 27 | Perfil | `/perfil` | Título + engranaje. Avatar 110 px sobre círculo blanco 118 px; "Tincho" (Outfit 28); píldora "Chivilcoy, Buenos Aires ✓"; link "Editar personaje". Cuatro mini-stats (racha 12, coronas 3, podios 11, días jugados 86; Outfit 20). "Palmarés" + "Promedio por día: 2.410 · mejor día: 2.890": tarjetas doradas (radio 18) "CHIVILCOY · Semana 39 · 18.260 pts". "Récords personales · retos y práctica": 4 filas en grilla 2 × 2 con punto de color del juego. Nav: Perfil. |
| 28 | Festejo de corona | `/corona/[semana]` (lunes) | Fondo azul `180°, #3B4FD8 → #4F6BFF 55% → #8FA6FF`, nubes abajo, confeti (emRain). Chip "Lunes · cerró la Semana 39", "Saltear" a la derecha (siempre). Personaje 170 px con corona, entra con emPop y flota (emFloat), `drop-shadow(0 18px 22px rgba(20,28,90,.35))`. "TINCHO" / "¡Sos El Mejor de **Chivilcoy**!" (Outfit 42, el lugar en dorado) / "Semana 39 · 18.260 puntos · 7 de 7 días". Chips "A 140 de LaFlor, que quedó #2" y dorado "Tu 3ª corona". Botón dorado 66 px con brillo "Compartir la corona", "Ver el ranking de la semana" (blanco 18%). Pie: "Ya quedó en tu palmarés · la Semana 40 arranca de cero". |
| 29 | Variante "La Mejor de…" | idem | Igual que 28 con "¡Sos La Mejor de Chivilcoy!". Decisión pendiente: si se adopta, el artículo sale de una preferencia explícita en el perfil ("Cómo querés que te nombremos: El Mejor / La Mejor"), nunca inferido. La marca, el logo y el palmarés siguen diciendo "El Mejor de". |
| 30 | Historia de la corona | servidor | 1080 × 1920 sobre el fondo azul, confeti estático, personaje 340 px con corona, "Tincho es / El Mejor de / **Chivilcoy**" (Outfit 150), "18.260 puntos · 7 de 7 días", píldora dorada "3ª corona", "¿Me la sacás?" (Outfit 104), dominio. |
| 31 | Mis grupos | `/grupos` | Título + botón "+" azul 38 px. Intro 14/600. Tarjetas de grupo (radio 22): emblema 48 px en baldosa de color (radio 16), nombre Outfit 16, "14 miembros · Semana 40", línea con avatar del líder (22 px) y tu situación ("Vas primero por 530 · la corona se define el domingo"), a la derecha tu puesto grande (Outfit 26, con corona si sos #1) y "de 14". El grupo donde vas primero lleva borde 2 px dorado. CTA "Crear un grupo", link "Tengo un código de invitación". Nav: Grupos. |
| 32 | Crear un grupo | `/grupos/nuevo` | Volver + "Nuevo grupo". Vista previa azul "Así se va a ver · El Mejor de Los del laburo" con el emblema en blanco 64 px. Campo nombre (14 / 30). Emblema: 8 celdas 56 px (casa, maletín, pelota, birrete, mate, música, corazón, estrella; Lucide) — **emblemas en lugar de emoji** para que se vean iguales en todos los celulares. Color: 7 círculos. CTA "Crear el grupo", "Hasta 50 miembros · vos lo administrás". |
| 33 | Invitar al grupo | hoja | Cabecera con emblema, "Invitá a Los del laburo", "14 miembros · quedan 36 lugares". Caja punteada con "CÓDIGO DEL GRUPO · LABURO-7K2" (Outfit 30, tracking .08em) y botón copiar. Texto editable. Tres destinos: WhatsApp, Copiar link, Otras apps. "El link vence en 7 días · podés renovarlo cuando quieras". "Cerrar". |
| 34 | Ranking del grupo | `/grupos/[id]` | Volver, emblema + nombre + "14 miembros", botón "Invitar" (blanco, texto azul). Segmentado Hoy / **Semana 40**. Podio y filas como el ranking general; como vas #1, en vez de tu fila fija va una banda dorada "Vas primero por 530 · La corona del grupo se define el domingo · quedan 3 días". |
| 35 | Practicar | `/practicar` | Título + "Hoy: 3 partidas". Aviso "Jugá todo lo que quieras. Guarda tus récords, **no cuenta para la corona**." Grilla 2 × 2 de baldosas (radio 24, alto mín. 176) con nombre, "Récord 940 / 1.000 / 198 ms / Nivel 9", botón play blanco 32 px y la mascota abajo a la derecha. Tarjeta "Te queda un reto de hoy: Reflejos · Ese sí cuenta para el ranking" con botón "Jugarlo". Nav: Practicar. |
| 36 | Práctica · nuevo récord | `/practicar/[juego]/resultado` | Chip "Práctica · Siete Letras · no cuenta para la corona". Mascota 84. Chip dorado "¡Nuevo récord personal!" → **960** / 1.000 → "Tu récord anterior: 940". Detalle de palabras (la de 7 letras en dorado claro). Botones "Otra vez" (color del juego) y "Volver". |
| 40 | Puntaje pendiente · podio | modal/full | Chip dorado "Puntaje pendiente · Día 215". Mini podio con el #3 punteado en azul (tu avatar y "vos"). "¡Entraste al podio!" (Outfit 32) + "Hoy estás #3 en Chivilcoy con 2.810. Verificá tu ubicación para que cuente: tarda dos segundos." Tarjeta `71:58:12` + "Si no, el puesto queda libre". Nota "Nunca mostramos tu ubicación exacta". CTA "Verificar ubicación", "Más tarde". Mientras está pendiente, la fila aparece en el ranking con reloj de arena, borde punteado dorado y puntaje en gris, sin ocupar el puesto; los grupos sí la cuentan. |

## Interactions & Behavior

- **Navegación inferior**: Hoy · Ranking · Practicar · Grupos · Perfil. Flotante (16 px lateral, 26 px abajo), 5 columnas; activa con fondo `#E6EAFF`. Se oculta durante un reto.
- **Flujo sin cuenta**: se puede jugar todo sin registrarse; el puntaje del día se guarda localmente y se asocia al crear la cuenta (pantalla 17 lo muestra: "guardar lo que jugaste hoy").
- **Un solo intento**: al tocar "Empezar" el reto queda marcado como jugado aunque se salga. El aviso dorado aparece en las 4 intros. Cerrar durante el juego pide confirmación ("Si salís, cuenta como jugado").
- **Retos del día**: 3 de los 4 juegos, iguales para todos, rotan; cambian a las 00:00 hora argentina (cuenta regresiva `HH:MM:SS` con cifras tabulares).
- **Puntajes**: 0–1.000 por reto. Siete Letras: 40 por 4 letras, 80 por 5, 120 por 6, 300 la de 7. Cinco Preguntas: hasta 200 por pregunta según velocidad. Reflejos: promedio de 5 rondas; "te adelantaste" pierde la ronda. Secuencia: 100 por nivel, 1.000 en el nivel 10.
- **Feedback**: toast píldora sobre la zona de juego, 1.2 s, con ícono + texto (nunca solo color).
- **Resultado**: el número cuenta de 0 al valor (0.9 s, ease-out) y la barra crece a la vez; respetar `prefers-reduced-motion`.
- **Compartir**: hoja inferior nativa (Web Share API con imagen) con fallback a los cuatro destinos. La imagen la genera el servidor (historia 1080 × 1920 y OG 1200 × 630).
- **Ubicación**: explicar antes de pedir (pantalla 20); el permiso nativo solo tras el CTA. Estados: verificada ✓, pendiente ⏳ (72 h, cuenta regresiva), sin verificar. Solo se muestra el nombre de la localidad. Cambio de localidad una vez cada 30 días. Se vuelve a verificar en momentos clave (podio, corona).
- **Festejo de corona**: pantalla completa el lunes al abrir, con "Saltear" siempre visible; confeti infinito mientras está abierta; el personaje entra con `emPop` (0.8 s) y luego flota.
- **Grupos**: código `NOMBRE-XXX`, link `elmejorde.app/g/CÓDIGO`, vence a los 7 días (renovable). Hasta 50 miembros. El grupo tiene su propia corona semanal.
- **Transiciones de UI**: 160 ms ease-out; presionado = color un paso más oscuro + `scale(.98)`; foco de teclado = anillo 2 px `#4F6BFF` con 2 px de offset.

## State Management

- `session`: usuario (apodo, personaje `{sp, color, acc, glass, cap, scarf}`, localidad, provincia, estado de ubicación `verified|pending(expiresAt)|none`), racha, palmarés.
- `today`: número de día, los 3 retos con estado `pending|played(score, detail)`, total, puestos (localidad/provincia/país con delta), cuenta regresiva.
- `game`: estado de la partida en curso (tiempo, puntaje, palabras/preguntas/rondas/nivel, feedback); se marca `played` al empezar.
- `ranking`: lugar seleccionado (localidad, provincia, país, grupo), período (hoy/semana), podio, filas paginadas, tu fila.
- `groups`: lista con tu puesto y líder; grupo abierto con ranking; código de invitación.
- `practice`: récords por juego, partidas de hoy.
- `celebration`: corona pendiente de festejar (semana, puntos, rival), vista o salteada.
- Datos que trae el servidor: retos del día (semilla única), rankings, grupos, imágenes OG. Localmente: partida en curso (para no perderla si se recarga) y puntaje del día sin cuenta.

## Design Tokens

Ver `tokens/tailwind.tokens.ts` (copiar en `theme.extend` de `tailwind.config.ts`) y `tokens/globals.css` (fuentes, keyframes, foco). Resumen:

**Color**
- `brand` 500 `#4F6BFF` · 600 `#3F58E6` (presionado) · 100 `#E6EAFF`
- `ink` `#23263A` · `ink-700` `#4B5070` · `ink-500` `#6C7191` · `ink-300` `#B8BDD6`
- `sky` 100 `#C3DAF8` · 200 `#DAE1F6` · 300 `#E8EAF6` (fondo, degradé 180° 0 / 42 / 100%)
- superficie `#FFFFFF` · superficie-2 `#F1F2FA` · línea `#EDEFF8`
- `gold` `#FFC53D` · `gold-soft` `#FFF3D6` · texto sobre dorado `#23263A` / `#5A4300` / `#9A6200`
- `success` `#1FA093` · `danger` `#E2504C` · WhatsApp `#25D366`
- Juegos: letras `#FF6B4A` / `#C94F2E` / `#FFD1C4` · preguntas `#8B6CFF` / `#6A4FD6` / `#E4DBFF` · reflejos `#2EC4B6` / `#158A7F` / `#CFF3EE` · secuencia `#FFC53D` / `#D9971A` / `#FFF0C2`
- Festejo: fondo `180°, #3B4FD8 0% → #4F6BFF 55% → #8FA6FF 100%`

**Tipografía** — Google Fonts `Outfit` (500–800) y `Plus Jakarta Sans` (400–800), `display=swap`.
- display-xl 84/1/−.05em · display-lg 42/1.02/−.03em · display 32–36/1.05/−.03em · title 28/1/−.02em · h3 26/1.05 · button 18 (22 en el de 74 px) · section 15 · número de fila 15 tabular — todo Outfit 800
- body 16/1.45/600 · body-sm 15/1.45/500 (`ink-700`) · row 14/700 · chip 13/700 (12 cuando hay cuatro) · meta 12/600 (`ink-500`) · label 11/700 uppercase +.06em · badge 10/800 — Plus Jakarta Sans

**Espaciado** — 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 44 (zona segura inferior) · 66 (barra de estado). Margen lateral 20. Área táctil mínima 44.

**Radios** — píldora 999 · héroe 28 · tarjeta 22–24 · tarjeta compacta 20 · fila / campo 16 · letra / baldosa de ícono 14 · ícono pequeño 9–10.

**Sombras** — `sm 0 6px 16px rgba(35,38,58,.06)` · `md 0 8px 20px rgba(35,38,58,.08)` · `lg 0 10px 30px rgba(35,38,58,.12)` · botón `0 12px 24px <color> 35%` · botón alto `0 16px 32px <color> 35%` · personaje sobre baldosa `drop-shadow(0 10px 14px rgba(0,0,0,.28))`.

**Alturas** — botón principal 56 · Empezar 74 · dorado 66 · secundario 52 · ícono 38 · chip de lugar 32 · segmentado 40 (interno 32) · píldora de cabecera 38 · campo 50 · fila 50 · letra 56 · opción de trivia 84 · nav ≈ 64.

## Components (specs + snippets Tailwind)

Los snippets usan los nombres de `tokens/tailwind.tokens.ts`. Íconos: `lucide-react`.

**Botón principal**
```tsx
<button className="h-14 w-full rounded-full bg-brand text-white font-display font-extrabold text-lg flex items-center justify-center gap-2.5 shadow-btn active:bg-brand-600 active:scale-[.98] transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
  <Play className="size-[18px] fill-current" /> Jugar los retos de hoy
</button>
```

**Botón Empezar (74 px, color del juego, con brillo)**
```tsx
<button className="relative overflow-hidden h-[74px] w-full rounded-full bg-letras text-white font-display font-extrabold text-[22px] flex items-center justify-center gap-2.5 shadow-[0_16px_32px_rgba(255,107,74,.35)] active:scale-[.98]">
  <span className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent to-55%" />
  <Play className="relative size-5 fill-current" /><span className="relative">Empezar</span>
</button>
```

**Secundario / neutro / fantasma**
```tsx
<button className="h-[52px] w-full rounded-full bg-white font-display font-extrabold text-base shadow-md active:bg-surface-2">Compartir</button>
<button className="h-[52px] w-full rounded-full bg-surface-2 text-ink-700 font-display font-extrabold text-[15px]">Cancelar</button>
<button className="h-12 text-sm font-bold text-ink-700">Más tarde</button>
```

**Chip de lugar + segmentado**
```tsx
<div className="flex gap-1.5 px-5">
  <button className="h-8 px-[11px] rounded-full bg-ink text-white text-xs font-bold">Chivilcoy</button>
  <button className="h-8 px-[11px] rounded-full bg-white text-xs font-bold shadow-sm">Buenos Aires</button>
</div>
<div className="mx-5 grid grid-cols-2 rounded-full bg-white p-1 shadow-sm">
  <button className="h-8 rounded-full bg-brand text-white text-[13px] font-extrabold shadow-[0_6px_14px_rgba(79,107,255,.35)]">Hoy</button>
  <button className="h-8 rounded-full text-[13px] font-bold text-ink-500 flex items-center justify-center gap-1"><Crown className="size-[13px]" />Semana</button>
</div>
```

**Píldoras de cabecera (lugar verificado, racha)**
```tsx
<div className="h-[38px] px-3.5 rounded-full bg-white shadow-md flex items-center gap-1.5 text-sm font-bold">
  <MapPin className="size-4 text-brand" /> Chivilcoy <BadgeCheck className="size-4 text-success" />
</div>
<div className="h-[38px] px-3.5 rounded-full bg-gold shadow-[0_6px_16px_rgba(255,197,61,.4)] flex items-center gap-1 text-sm font-extrabold">
  <Flame className="size-4 fill-letras stroke-ink" /> 12
</div>
```

**Aviso de un solo intento**
```tsx
<div className="mx-5 flex gap-3 rounded-[18px] border-2 border-gold bg-gold-soft px-3.5 py-3">
  <div className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-gold"><Lock className="size-[18px]" /></div>
  <p className="text-sm font-bold leading-[1.35]">Tenés un solo intento.<br /><span className="font-semibold text-ink-700">Si salís, cuenta como jugado.</span></p>
</div>
```

**Tarjeta de reto (baldosa) — por jugar**
```tsx
<div className="relative flex min-h-[176px] flex-col overflow-hidden rounded-3xl bg-letras p-3.5 pb-0 text-white shadow-[0_12px_26px_rgba(255,107,74,.3)]">
  <span className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,.3),rgba(255,255,255,0)_55%)]" />
  <div className="relative flex items-start justify-between">
    <div><h3 className="font-display text-[17px] font-extrabold leading-[1.1]">Siete<br/>Letras</h3><p className="mt-1.5 text-[11px] font-bold">Por jugar</p><p className="font-display text-[15px] font-extrabold">90 s</p></div>
    <span className="grid size-8 place-items-center rounded-full bg-white text-letras"><Play className="size-3.5 fill-current" /></span>
  </div>
  <div className="relative mt-auto flex justify-end">
    <div className="relative -mr-1.5 h-[77px] w-16">
      <span className="absolute left-1/2 top-[54%] size-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[.38]" />
      <Personaje sp="nioqui" c={LETRAS} prop="letra" size={64} className="relative drop-shadow-[0_8px_10px_rgba(0,0,0,.26)]" />
    </div>
  </div>
</div>
```

**Fila de ranking + tu fila fija**
```tsx
<li className="flex h-[50px] items-center gap-2.5 rounded-2xl bg-white pl-3 pr-3.5">
  <span className="w-[22px] font-display text-sm font-extrabold text-ink-500">4</span>
  <Personaje {...row.avatar} size={30} />
  <span className="flex flex-1 items-center gap-1.5 text-sm font-bold">Tincho <span className="rounded-full bg-brand-100 px-[7px] py-0.5 text-[10px] font-extrabold text-brand">te invitó</span></span>
  <span className="font-display text-[15px] font-extrabold tabular-nums">2.640</span>
</li>
{/* pendiente: añadir border-2 border-dashed border-gold, Hourglass size-[13px] text-[#9A6200] junto al nombre, puntaje text-ink-500 */}
<div className="mx-4 flex items-center gap-2.5 rounded-[20px] bg-brand px-3.5 py-2.5 text-white shadow-btn">
  <span className="font-display text-sm font-extrabold text-gold">#6</span>
  <Personaje {...me.avatar} size={28} />
  <div className="flex-1 leading-tight"><p className="text-sm font-extrabold">Vos · Nico</p><p className="text-xs text-white/80">A 70 de Tincho · ubicación verificada</p></div>
  <span className="font-display text-base font-extrabold">2.570</span>
</div>
```

**Podio**
```tsx
<div className="grid grid-cols-3 items-end gap-2.5 px-5">
  {[second, first, third].map((p, i) => (
    <div key={p.id} className="flex flex-col items-center gap-[3px]">
      <Personaje {...p.avatar} size={[54, 64, 50][i]} acc={i === 1 ? [...p.avatar.acc, 'corona'] : p.avatar.acc} />
      <span className="text-[13px] font-extrabold">{p.name}</span>
      <span className="font-display text-[15px] font-extrabold">{p.pts}</span>
      <div className={`w-full rounded-t-2xl grid place-items-center font-display text-[22px] font-extrabold ${i === 1 ? 'h-[70px] bg-gold shadow-[0_-8px_20px_rgba(255,197,61,.3)]' : 'bg-white text-ink-500 ' + (i === 0 ? 'h-[50px]' : 'h-9')}`}>{[2, 1, 3][i]}</div>
    </div>
  ))}
</div>
{/* puesto vacío: border-2 border-dashed border-ink-300 text-ink-300 */}
```

**Nav inferior**
```tsx
<nav className="fixed inset-x-4 bottom-[26px] grid grid-cols-5 rounded-full bg-white px-2 py-1.5 shadow-lg">
  {tabs.map(t => (
    <Link key={t.href} href={t.href} className={`flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[10px] ${active ? 'bg-brand-100 font-extrabold text-brand' : 'font-semibold text-ink-500'}`}>
      <t.Icon className="size-[22px]" strokeWidth={2.2} />{t.label}
    </Link>
  ))}
</nav>
```

**Campo**
```tsx
<label className="block px-5"><span className="text-[11px] font-bold uppercase tracking-[.06em] text-ink-500">Tu apodo</span>
  <div className="mt-1.5 flex h-[50px] items-center gap-2.5 rounded-2xl bg-white px-3.5 shadow-sm focus-within:border-2 focus-within:border-brand focus-within:shadow-none">
    <input className="flex-1 bg-transparent font-display text-[17px] font-extrabold outline-none" />
    <span className="flex items-center gap-1 text-xs font-bold text-success"><Check className="size-3.5" strokeWidth={3} />Disponible</span>
  </div>
</label>
```

**Nube (fondo)**
```tsx
export function Nube({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute opacity-95 ${className}`} style={{ aspectRatio: '10 / 7' }}>
      <span className="absolute inset-x-0 bottom-0 h-[55%] rounded-full bg-white" />
      <span className="absolute left-[12%] bottom-[22%] w-1/2 aspect-square rounded-full bg-white" />
      <span className="absolute left-[44%] bottom-[28%] w-[38%] aspect-square rounded-full bg-white" />
    </div>
  );
}
// uso: <Nube className="-left-[50px] top-[200px] w-40" />  (2–3 por pantalla, asomando por los bordes; opacity-70 en pantallas de juego)
```

**Pantalla base**
```tsx
<main className="relative flex min-h-dvh flex-col overflow-hidden bg-sky text-ink pt-[66px] pb-11">
  <Nube className="-left-[50px] top-[200px] w-40" /><Nube className="-right-[70px] top-[430px] w-[200px]" />
  <div className="relative z-10 flex flex-1 flex-col">…</div>
</main>
```

**Personaje** — `components/Personaje.jsx` (props: `sp`, `size`, `face`, `acc`, `c`, `hat`, `cap`, `glass`, `scarf`, `prop`, `anim`). Es el mismo código del prototipo; portar a TSX y reemplazar `anim` por clases (`animate-bob`, `animate-float`). Los 34 SVG de `personajes/` sirven para imágenes estáticas (OG, placeholders), pero en la app conviene el componente para recolorear y combinar accesorios.

## Assets

- `personajes/especies/*.svg` — 8 bichos base (carpincho, hornero, pinguino, zorro, rana, llama, pelusa, nioqui), lienzo 100 × 120.
- `personajes/caras/carpincho-*.svg` — feliz, alegre, sorpresa, guiño, dormido.
- `personajes/accesorios/carpincho-*.svg` — boina, gorra, anteojos, bufanda, mate, corona.
- `personajes/mascotas/*.svg` — siete-letras, cinco-preguntas, reflejos, secuencia.
- `personajes/elenco/*.svg` — tincho, tincho-corona, nico, laflor, colo-88, juli, pato, mati-r, caro, eltano, sofi (datos de ejemplo del brief).
- Íconos: [Lucide](https://lucide.dev) (`lucide-react`), trazo 2.2–2.4, tamaños 13 / 14 / 16 / 18 / 22. Corona = `crown`, racha = `flame` (relleno coral, trazo tinta), pendiente = `hourglass`, verificado = `badge-check`, lugar = `map-pin`.
- Fuentes: Google Fonts — Outfit 500–800, Plus Jakarta Sans 400–800 (`next/font/google`).
- Logo: baldosa azul (radio 32% del lado) con corona dorada + "El Mejor de [lugar]" en Outfit 800, el lugar en azul (dorado sobre fondo azul).

## Files

- `El Mejor de - Direcciones.dc.html` — las 40 pantallas (vueltas 3 y 4) + exploraciones previas (vueltas 1 y 2).
- `El Mejor de - Sistema.dc.html` — mini sistema de diseño.
- `support.js`, `ios-frame.jsx` — necesarios para abrir los `.dc.html`.
- `components/Personaje.jsx` — generador de personajes.
- `tokens/tailwind.tokens.ts`, `tokens/globals.css` — tokens y keyframes.
- `personajes/` — SVG exportados.
- Brief original: `docs/diseno/BRIEF-DISENO.md` en el repo `LiPeSolutions/el-mejor-de`.
