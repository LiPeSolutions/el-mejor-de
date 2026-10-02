# El Mejor de — Brief de diseño (UI/UX)

> Para Claude Design o cualquier persona que diseñe. El documento es autosuficiente: tiene todo lo necesario para diseñar la primera versión de la app.
> Todos los textos de la interfaz van en **español rioplatense, con voseo**.

## 1. El producto en 30 segundos

**El Mejor de** es una web app de minijuegos y retos diarios para competir con amigos, conocidos y con todo tu lugar. La promesa: **sentirte el mejor de tu pueblo**… y llegar a ser el mejor de tu ciudad, de tu provincia, del país o del mundo.

- **Sin descarga:** se juega desde el navegador y se puede instalar como app (PWA).
- **Retos diarios:** todos los días hay **3 retos cortos** (de 60 a 90 segundos cada uno), **iguales para todos** y con **un solo intento**. Cada reto da de 0 a 1.000 puntos; el día, hasta 3.000.
- **Rankings por lugar:** localidad → provincia → país (y el mundo, más adelante), más los **grupos privados** ("El Mejor de la oficina").
- **Corona semanal:** cada lunes, el #1 de la semana de cada lugar se corona: **"El Mejor de Chivilcoy – Semana 40"**. Las coronas quedan en su **palmarés**.
- **Juego libre:** los minijuegos también se pueden jugar sin límite para practicar. Guardan récords personales, pero no cuentan para la corona.
- **Más adelante:** truco argentino online. No se diseña ahora, pero el sistema visual tiene que poder alojar un juego de cartas en el futuro.

## 2. Público y contexto de uso

- **Todo público** en Argentina: chicos, adultos, familias. Muchos no son "gamers": todo se tiene que entender sin instrucciones.
- **En el celu, con una mano y en ratos cortos:** en el colectivo, en una fila, en la sobremesa.
- Muchos llegan **desde un link de WhatsApp** que les mandó alguien conocido.

## 3. Personalidad de marca

- **Orgullo local y pique sano:** competir con tu pueblo, tus amigos y tu familia.
- **Humor argentino:** canchero pero amable, nunca agresivo ni burlón.
- **Festiva:** celebra los logros (corona, podio, racha).
- **Símbolo central:** la corona 👑.
- **Idea para explorar en el logo:** "El Mejor de ___", donde el espacio se completa con el lugar ("El Mejor de Chivilcoy", "de Rosario", "de la oficina").

### Tono de los textos

Corto, directo, con voseo y algo de chispa. Ejemplos:

- "Jugá", "Tocá", "Compartí", "¿Me ganás?"
- "Hoy estarías #4 en Chivilcoy. Creá tu cuenta para entrar al ranking."
- "Sos El Mejor de Tapalqué… porque sos el único. ¿Te animás a invitar a alguien?"
- "A 120 puntos del primero. Todavía quedan 3 días."

### Lo que NO queremos

- Estética de casino o apuestas: fichas, monedas tipo tragamonedas, "jackpot".
- Un look gamer oscuro y agresivo, o uno demasiado infantil (también juegan adultos).
- Pantallas recargadas: una acción principal por pantalla.
- Textos en inglés o en español neutro ("Juega ahora" ✗ → "Jugá" ✓).
- Fotos de personas: solo avatares ilustrados.
- Mapas o ubicaciones exactas del usuario.
- Presión para registrarse o pop-ups encadenados.

## 4. Conceptos que el diseño tiene que comunicar

| Concepto | Cómo funciona |
|---|---|
| Reto diario | 3 por día, iguales para todos, **un solo intento**. Se pueden jugar en cualquier orden. |
| Puntaje | Cada reto: de 0 a 1.000. El día: hasta 3.000. |
| Niveles | Localidad, provincia y país, más los grupos privados. |
| Períodos | **Hoy** y **Semana** (la semana define la corona). |
| Corona | El #1 de la semana de cada lugar. |
| Palmarés | Historial de coronas en el perfil. |
| Racha | Días seguidos jugando los retos 🔥. |
| Ubicación | Verificada ✓, pendiente ⏳ o sin verificar. Solo se muestra el nombre de la localidad. |
| Juego libre | Práctica sin límite, con récord personal. No cuenta para la corona. |

## 5. Pantallas

Navegación inferior propuesta: **Hoy · Ranking · Practicar · Grupos · Perfil**.

### 5.1 Prioridad 1

**1. Inicio ("Hoy")**

- Arriba: el lugar del usuario y su racha (🔥 12).
- Las 3 tarjetas de los retos del día, con su estado: por jugar, o jugado con su puntaje.
- Botón principal **"Jugar"**, que lanza el siguiente reto pendiente.
- Tu puesto de hoy en tu localidad y cuánto te falta para alcanzar al de arriba.
- Cómo vas en la semana (puesto y días jugados) y cuánto falta para la corona.
- Cuenta regresiva para los retos de mañana.
- Variantes: **primera visita** (todavía sin cuenta), **llegada desde un link compartido** ("Tincho hizo 2.640 hoy en Chivilcoy. ¿Le ganás?") y **todos los retos jugados** ("Volvé mañana").

**2. Un minijuego: Siete Letras**

- *Antes de empezar:* nombre del juego, cómo se juega en una línea, duración y el aviso **"Tenés un solo intento. Si salís, cuenta como jugado."** Botón "Empezar".
- *Jugando:* 7 letras para tocar, la palabra que se va armando, botones para borrar, mezclar y enviar, tiempo restante (90 s), puntaje y palabras encontradas. Feedback claro para palabra válida, inválida o repetida.

**3. Resultados y compartir**

- *Después de cada reto:* puntaje con animación, comparación ("Mejor que el 73% de Chivilcoy") y botón "Siguiente reto".
- *Resumen del día* (al terminar los 3): total sobre 3.000, puesto en localidad, provincia y país (con una flechita si subiste), racha, botón **"Compartir"** y cuenta regresiva.
- *Imagen para compartir:* formato historia (1080 × 1920) y vista previa del link en WhatsApp (1200 × 630). Lleva la marca, el número de día, el puntaje de cada reto (con un ícono por juego), el total, el puesto en la localidad, la racha y la invitación "¿Me ganás?".

**4. Ranking**

- Selector de lugar (Chivilcoy · Buenos Aires · Argentina · Grupos) y de período (Hoy · Semana).
- Podio con los 3 primeros y la corona en el #1.
- Lista con avatar, apodo, localidad (en los niveles de provincia y país) y puntaje.
- **Tu fila siempre visible** abajo, aunque estés en el puesto 300.
- Variante: **sos el único de tu localidad**, con humor y un botón para invitar.

**5. Registro y verificación de ubicación**

- *Invitación a crear cuenta* al terminar los retos sin cuenta: "Hoy estarías #4 en Chivilcoy. Creá tu cuenta para entrar al ranking." Opciones: Google, email o "Ahora no".
- *Apodo y avatar:* galería de avatares ilustrados (sin fotos).
- *Tu lugar:* elegir provincia y localidad, con buscador.
- *Antes de pedir el GPS:* pantalla propia que explica por qué ("Para que el ranking sea justo, chequeamos que estés en Chivilcoy. Nunca guardamos ni mostramos tu ubicación exacta.") y el botón "Verificar ubicación".
- *Resultado:* verificada ✓ ("¡Listo! Ya competís por Chivilcoy"), GPS denegado (cómo habilitarlo) y fuera de tu zona.

### 5.2 Prioridad 2

- **Perfil:** avatar, apodo, localidad verificada ✓, racha, palmarés de coronas, récords personales y estadísticas.
- **Festejo de corona** (lunes): pantalla de celebración + compartir. Mostrá también una variante con **"La Mejor de…"** para evaluar si el título se adapta (decisión pendiente; la marca sigue siendo "El Mejor de").
- **Grupos:** mis grupos, crear un grupo (nombre + emoji), invitar por link o WhatsApp, y el ranking del grupo con su corona.
- **Practicar:** grilla con los 4 juegos y tu récord personal en cada uno.
- **Los otros 3 juegos:**
  - *Cinco Preguntas:* trivia de 5 preguntas, 15 segundos cada una, 4 opciones.
  - *Reflejos:* tocar apenas cambia la pantalla, 5 rondas. El cambio no puede depender solo del color: sumar un ícono o el texto "¡YA!".
  - *Secuencia:* repetir secuencias de colores cada vez más largas (tipo Simón dice).
- **Puntaje pendiente de verificación:** "¡Entraste al podio! Verificá tu ubicación para que cuente", con un plazo de 72 horas.

### 5.3 Más adelante (no diseñar todavía)

Truco online, lista de amigos, desafíos 1 vs 1, notificaciones, sponsors locales ("El Mejor de Rosario, presentado por…") y vidas para el juego libre.

## 6. Principios de UX

- **Celu primero:** marco de 390 × 844. En la compu, una columna centrada.
- **Una mano:** las acciones principales van abajo, donde llega el pulgar, con áreas táctiles de 48 px o más.
- **De abrir a jugar en un toque.**
- **Tu puesto siempre a la vista:** es el gran motivador.
- **El "un solo intento" tiene que quedar clarísimo** antes de empezar cada reto.
- **Explicar antes de pedir permisos** (GPS y, más adelante, notificaciones).
- **Celebrar los logros** con animaciones cortas que se puedan saltear.
- **Accesible:** texto base de 16 px o más, contraste AA y nada que dependa solo del color.
- **Modo claro y oscuro.**

## 7. Datos de ejemplo

Usalos para que los diseños se vean reales.

- **Usuario:** "Tincho", de **Chivilcoy, Buenos Aires** (ubicación verificada ✓). Racha: 12 días. Palmarés: 3 coronas de Chivilcoy.
- **Día 214. Retos de hoy:** Siete Letras (860), Cinco Preguntas (900) y Reflejos (880). **Total: 2.640 / 3.000.**
- **Puestos de hoy:** #4 en Chivilcoy (de 312 jugadores), #186 en Buenos Aires y #1.204 en Argentina.
- **Semana:** #2 en Chivilcoy, a 120 puntos de "LaFlor" (#1), con 4 días jugados.
- **Otros jugadores:** LaFlor, Colo_88, Juli, Pato, Mati.R, Caro, ElTano, Sofi, Rami.
- **Otros lugares:** Rosario (Santa Fe), Villa María (Córdoba), Tapalqué y Junín (Buenos Aires).
- **Grupos:** "El Mejor de los primos" (8 miembros), "Los del laburo" (14) y "Fútbol de los jueves" (10).
- **Siete Letras:** letras C · A · M · I · N · A · R. Palabras encontradas: ANIMAR, CAMINA, MARINA, MARCA, CARA, RIMA, CIMA. La de 7 letras es CAMINAR.
- **Cinco Preguntas:** "¿Cuántas Copas del Mundo ganó la Selección Argentina?" (2 · 3 · 4 · 5; la correcta es 3).
- **Reflejos:** promedio de 243 ms. **Secuencia:** llegaste al nivel 9.
- **Cuenta regresiva:** "Nuevos retos en 07:42:15".
- **Dominio:** "elmejorde.app" (provisorio, hasta definir el real).

## 8. Entregables

1. **3 direcciones visuales** distintas, cada una aplicada a la pantalla de Inicio y a la imagen para compartir, con paleta (modo claro y oscuro), tipografías, estilo de íconos e ilustración y una propuesta de logo.
2. Con la dirección elegida: **todas las pantallas de prioridad 1 como prototipo navegable**, con sus variantes.
3. **Las pantallas de prioridad 2.**
4. **Un mini sistema de diseño:** colores, tipografía, espaciados, botones, tarjetas de reto, filas de ranking, selectores, podio, corona e insignias (verificado, pendiente, racha).

## 9. Restricciones técnicas

La app se va a programar en **Next.js + Tailwind CSS**, así que:

- Tipografías de **Google Fonts** que soporten bien el español (ñ, tildes, ¿ ¡).
- Íconos de una librería libre (por ejemplo, Lucide) o SVG propios.
- Animaciones simples (CSS), nada que dependa de video.
- La imagen para compartir la genera el servidor: diseño simple, sin efectos difíciles de reproducir.
