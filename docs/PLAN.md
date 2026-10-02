# El Mejor de — Plan del proyecto

> Documento vivo: lo vamos ajustando a medida que decidimos cosas.
> Lo marcado como *(propuesta)* todavía no está confirmado.
> Última actualización: 2 de octubre de 2026.

## 1. La idea

Una web app de **minijuegos y retos diarios** para jugar con amigos y conocidos, donde cada partida cuenta para un **ranking por lugar**. El objetivo es que te sientas **el mejor de tu pueblo**… y que puedas llegar a ser el mejor de tu ciudad, de tu provincia, del país o del mundo.

Lo que la hace distinta:

- **Siempre hay un ranking donde podés pelear arriba.** Ser el #1 del mundo es casi imposible; ser el #1 de tu pueblo, de tu oficina o de tu familia, no.
- **Los retos diarios son iguales para todos y se juegan una sola vez.** El que gana, gana por mérito, y al día siguiente hay tema de charla: "¿cuánto hiciste hoy?".
- **Sin descarga.** Se juega desde el navegador del celu o la compu, y se puede "instalar" como app sin pasar por Play Store ni App Store.
- **Con identidad argentina.** Tono, contenido y juegos locales, empezando por el truco.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Nombre | **Provisorio: "El Mejor de".** Se busca uno más general, que no encasille en "jugar entre amigos". En el código se cambia en un solo lugar. |
| Alcance | **Argentina primero.** Todo se prepara para sumar otros países después. |
| Público | **Todo público.** Implica cuidados extra de seguridad (ver §9). |
| Tipos de juego | Palabras, trivia, habilidad y reflejos, lógica y memoria. **Truco** en la etapa 2. |
| Reto diario | **Varios retos cortos por día** (3), iguales para todos, **1 intento** cada uno. Se suman en un puntaje del día. |
| Juego libre | **Práctica sin límite + récords personales.** No cuenta para las coronas. |
| Corona | **Semanal.** El #1 de cada lugar es "El Mejor de…" esa semana. |
| Ubicación | Se elige y **se verifica con GPS** al registrarse, y **se vuelve a verificar** al hacer un récord o subir en el ranking. |
| Cuentas | **Jugás sin registrarte**; para entrar en los rankings creás una cuenta. |
| Social | Grupos privados, lista de amigos, desafíos 1 vs 1 y compartir resultados. |
| Truco | Online contra gente y mesas privadas. **Sin flor.** 1 vs 1, 2 vs 2 y 3 vs 3. |
| Comunicación | **Solo frases, emojis y señas predefinidas** (sin chat libre). |
| Monetización | **Más adelante.** Idea inicial: comprar vidas. |
| Primera versión | **MVP sin truco**, para salir rápido a probar con gente real. |
| Infraestructura | Vercel Pro (ya está), Supabase para la base de datos y dominio propio. Presupuesto: USD 25–100 por mes. |
| Roles | La persona responsable del producto decide producto, diseño y negocio; Claude se encarga del desarrollo. |

## 3. Cómo se juega

### Un día cualquiera

1. Te llega un link por WhatsApp: *"Hoy hice 2.640. ¿Me ganás?"*.
2. Entrás y jugás los **3 retos del día** sin registrarte (de 3 a 5 minutos en total).
3. Ves tu puntaje y en qué puesto quedarías en tu localidad: *"Hoy estarías #4 en Chivilcoy. Creá tu cuenta para entrar al ranking."*
4. Creás la cuenta, elegís tu localidad y la verificás con el GPS. Lo que jugaste pasa a tu cuenta.
5. Compartís tu resultado, armás el grupo "El Mejor de los primos" y mandás el link.
6. Al día siguiente volvés: retos nuevos, tu racha sigue y el ranking de la semana se mueve.
7. El lunes a la mañana se anuncian las coronas: *"👑 Sos El Mejor de Chivilcoy de la semana"*.

### Retos diarios

- Todos los días hay **3 retos**, cada uno de un minijuego distinto. Las categorías van rotando.
- El reto es **igual para todos** en todo el país: mismo juego, misma dificultad y, en general, el mismo contenido.
- **Un solo intento** por reto. Si lo empezás y cerrás la app, cuenta como jugado.
- Cada reto da **de 0 a 1.000 puntos**, así todas las categorías pesan igual. El puntaje del día es la suma: hasta **3.000**.
- El día cambia a las **00:00, hora argentina**.

> En los juegos donde la respuesta se puede pasar (por ejemplo, la palabra del día), usamos **tiempo límite corto y orden mezclado**. Si con eso no alcanza, cada jugador recibe un contenido distinto pero de la **misma dificultad**. Así nadie gana por pasarse las respuestas.

### Juego libre

- Todos los minijuegos se pueden jugar **sin límite** para practicar.
- Guardan tu **récord personal**, pero **no cuentan para las coronas**: las coronas salen solo de los retos diarios.

### Rachas

- Cuántos días seguidos jugaste los retos. Se ve en el perfil y al compartir.

## 4. Rankings y coronas

### Niveles

| Nivel | Ejemplo | ¿Cuándo? |
|---|---|---|
| Localidad | El Mejor de Chivilcoy | MVP |
| Provincia | El Mejor de Buenos Aires | MVP |
| País | El Mejor de Argentina | MVP |
| Grupos privados | El Mejor de la oficina | MVP |
| Amigos | Ranking entre tus amigos | Etapa 1.5 |
| Mundo | El Mejor del Mundo | Cuando sumemos otros países |

Más adelante podemos sumar **partidos/departamentos** y **barrios** en ciudades grandes: en Córdoba capital o en CABA ser el mejor de la ciudad es difícil, pero ser el mejor de tu barrio, no tanto.

### Períodos

- **Ranking del día:** para engancharse todos los días.
- **Ranking de la semana (el de la corona):** de **lunes a domingo**. Cuenta la suma de tus **5 mejores días** de la semana, así podés faltar dos días sin quedar afuera. *(Propuesta.)*
- **Histórico:** coronas ganadas, rachas y récords.

### Corona semanal

- La semana cierra el domingo a la medianoche y el lunes a la mañana se anuncian las coronas: **"El Mejor de Chivilcoy – Semana 40"**.
- Para coronarse hay que haber jugado **al menos 3 días** esa semana. *(Propuesta.)*
- Desempate: gana quien tenga el mejor día individual; si siguen empatados, quien llegó primero a ese puntaje. *(Propuesta.)*
- Si sos **el único jugador** de tu localidad, te coronás igual, pero la app te lo hace notar con humor y te invita a traer competencia: *"Sos El Mejor de Tapalqué… porque sos el único. ¿Te animás a invitar a alguien?"*
- Antes de entregar una corona se confirma la ubicación (ver §5).

### Palmarés

Cada perfil muestra su historial: *"Fue El Mejor de Rosario 7 semanas · 2 veces El Mejor de Santa Fe"*. Así la corona semanal no se olvida al lunes siguiente.

## 5. Ubicación y verificación

La gracia es competir con tu lugar, así que la ubicación tiene que ser real.

1. **Al registrarte:** elegís tu provincia y tu localidad, y se verifica con el GPS del celu (con tu permiso) que estés ahí.
2. **En los momentos clave se vuelve a verificar.** Para no pedir el GPS a cada rato, se pide *(propuesta)*:
   - cuando entrás al **podio (top 3)** de tu localidad, provincia o país;
   - cuando hacés un **récord** muy por encima de tu nivel habitual;
   - **antes de entregar una corona**.
3. **Si no estás en tu zona** en ese momento (por ejemplo, porque estás de viaje), el puntaje queda **"pendiente"** y tenés **72 horas** para verificarlo desde tu localidad. Si no lo verificás, no cuenta para los rankings por lugar (sí para tus grupos y amigos). *(Propuesta.)*
4. **Mudanzas:** podés cambiar de localidad **una vez cada 30 días**, con verificación. *(Propuesta.)*
5. **Privacidad:** tu ubicación exacta nunca se muestra ni se guarda. Solo queda registrado el resultado ("verificado en Chivilcoy el 2/10") y en la app solo se ve el nombre de tu localidad.

> El GPS del navegador se puede falsear con algunas apps, así que no es la única barrera: se combina con otras señales (ver §6).

## 6. Juego limpio

Si la corona se puede trucar, deja de valer. Por eso hay varias capas:

1. **El servidor manda.** Los retos se generan y se corrigen en el servidor; el celu nunca recibe las respuestas antes de tiempo y los tiempos se controlan desde el servidor.
2. **Un intento de verdad.** Cada reto se puede empezar una sola vez por cuenta.
3. **Detección de imposibles.** Por ejemplo, reflejos más rápidos de lo humanamente posible o un salto enorme de nivel de un día para otro. Esos puntajes se marcan para revisión.
4. **Ubicación verificada** en los momentos clave (ver §5), cruzada con la ubicación aproximada de la conexión a internet.
5. **Una persona, una cuenta.** Login con Google o email, más controles para detectar cuentas múltiples.
6. **Reportes y revisión.** Cualquiera puede reportar algo raro, y las coronas de provincia y de país se revisan a mano antes de entregarse. *(Propuesta.)*

## 7. Minijuegos

Cada minijuego dura entre **60 y 90 segundos** y se juega cómodo con una mano en el celu. Los nombres son provisorios.

### Primera versión: uno por categoría

| Categoría | Juego | Cómo se juega |
|---|---|---|
| Palabras | **Siete Letras** | Con 7 letras, armá todas las palabras que puedas en 90 segundos. Las palabras largas valen más y la de 7 letras tiene premio. |
| Trivia | **Cinco Preguntas** | 5 preguntas de 15 segundos cada una: Argentina, fútbol, geografía, historia y cultura general. Responder rápido suma más. |
| Habilidad | **Reflejos** | Tocá apenas la pantalla cambia de color. Son 5 rondas y cuenta tu promedio. Si tocás antes de tiempo, perdés la ronda. |
| Memoria | **Secuencia** | Repetí secuencias de colores cada vez más largas (tipo Simón dice). Cuanto más lejos llegás, más puntos. |

### Cómo se puntúa *(propuesta, a calibrar con la beta)*

Cada reto da de 0 a 1.000 puntos:

| Juego | Puntos |
|---|---|
| Siete Letras | Cada palabra suma según su largo (3 letras: 1 punto … 7 letras: 8 puntos + 10 de premio). Los 1.000 se alcanzan con un 35% de los puntos posibles de esas letras, así un día con letras difíciles no castiga. |
| Cinco Preguntas | Hasta 200 por pregunta: 100 por acertar y hasta 100 más por rapidez (completos si respondés en menos de 2 segundos). |
| Reflejos | Hasta 200 por ronda: completos con 170 ms o menos, nada con 550 ms o más. Tocar antes de tiempo da 0 en esa ronda. |
| Secuencia | Llegar al nivel 12 (14 colores seguidos) vale 1.000; cada nivel menos resta proporcionalmente. |

Para que nadie se pase las respuestas, en Cinco Preguntas todos ven las mismas preguntas, pero cada uno ve las opciones en otro orden. En Reflejos y Secuencia cada jugador tiene su propia versión, de la misma dificultad.

### Ideas para después

- **Más o menos:** "¿Chivilcoy tiene más o menos habitantes que Junín?" Usa datos del censo, así que es bien local.
- **Mapa:** ubicar provincias, ciudades o lugares conocidos en el mapa.
- **Abecedario:** una definición por letra, contra reloj.
- **Anagramas**, **Cálculo rápido**, **Puntería**, **Cronómetro** (frenalo justo en 10,00 segundos) y **Sudoku mini**.
- **Trivia de tu provincia o de tu pueblo**, quizás con preguntas que proponga la comunidad.

## 8. Social

| Función | Qué hace | ¿Cuándo? |
|---|---|---|
| Grupos privados | Rankings propios ("El Mejor de la oficina", "de la familia") con link de invitación por WhatsApp y su propia corona semanal. | MVP |
| Compartir resultados | Imagen y texto con emojis para WhatsApp o historias, con un link que se ve lindo al compartirlo. | MVP |
| Lista de amigos | Agregar amigos, ver sus resultados y un ranking entre ustedes. | Etapa 1.5 |
| Desafíos 1 vs 1 | Retar a alguien a un minijuego: los dos juegan el mismo reto y gana el mejor puntaje. Cada uno juega cuando puede, dentro de las 24 horas. | Etapa 1.5 |

Los grupos y el compartir van primero porque son los que más gente nueva traen. *(Propuesta.)*

## 9. Seguridad (todo público)

Como también juegan chicos:

- **Sin fotos de perfil:** cada uno elige un avatar de una galería.
- **Sin chat libre:** solo frases, emojis y señas predefinidas.
- **Filtro de palabras** (lunfardo incluido) en apodos y nombres de grupos, más un botón para reportar.
- **La ubicación nunca se muestra exacta:** solo el nombre de la localidad.
- **Datos personales al mínimo**, opción de borrar la cuenta, y términos y política de privacidad claros.
- **Antes de lanzar, validar con un abogado** la Ley 25.326 de Protección de Datos Personales y el manejo de menores de edad (consentimiento de madres, padres o tutores). Más adelante, también la publicidad y las compras.

## 10. Truco (etapa 2)

| Tema | Decisión |
|---|---|
| Modos | **Online contra gente** (buscás partida) y **mesas privadas** (invitás por link). |
| Formatos | **1 vs 1, 2 vs 2 y 3 vs 3.** |
| Reglas | **Sin flor.** A 30 puntos (15 malas y 15 buenas). *(Propuesta: ¿las mesas privadas pueden elegir a 15?)* |
| Comunicación | Frases, emojis y **señas predefinidas**; las señas solo las ve tu compañero. |
| Ranking | Tipo **ELO** (como en el ajedrez: ganarle a alguien mejor suma más), por localidad, provincia y país. |
| Corona | **"El Mejor de Truco de Chivilcoy"**, semanal. La fórmula exacta se define en la etapa 2. |
| Juego limpio | Las cartas se reparten en el servidor y cada jugador recibe **solo las suyas**: no se puede espiar. Hay penalización por abandonar y reconexión si se corta internet. |

Riesgo conocido: al principio, con poca gente conectada, buscar partida online puede tardar. Las mesas privadas lo compensan; si hace falta, se reevalúa sumar un bot.

## 11. Monetización (más adelante)

Por ahora no se monetiza: primero, que la gente juegue y se enganche. Ideas para cuando llegue el momento:

- **Vidas** (idea inicial): por ejemplo, para el juego libre: 5 vidas que se recargan solas; si te quedás sin, esperás o comprás más. Ojo: eso cambiaría la decisión de "práctica sin límite", así que se define cuando lleguemos.
- **Escudo de racha:** no perder la racha si un día no podés jugar.
- **Cosméticos:** avatares, marcos y coronas especiales.
- **Sponsors locales:** "El Mejor de Rosario, presentado por…", con premios de comercios de la zona.

**Regla de oro: la corona no se compra.** Nada pago puede dar ventaja en los retos diarios ni en el truco con ranking; si no, "el mejor" deja de serlo. Además, al ser una app para todo público, las compras y la publicidad tienen que cumplir reglas especiales para menores.

## 12. Etapas

Cada etapa termina con algo que se puede jugar y probar.

### Etapa 0 — Cimientos

- Proyecto armado: web app, base de datos en Supabase y publicación en Vercel con el dominio propio.
- Cuentas: jugar sin registrarse, y registro con Google o email.
- Mapa de lugares de Argentina (provincias, departamentos y localidades, con datos oficiales) y verificación por GPS.
- Diseño base: colores, tipografía, logo provisorio y pantallas principales.

### Etapa 1 — MVP

- Los 4 minijuegos, como reto diario y como juego libre.
- Retos diarios: 3 por día, 1 intento, puntaje del día.
- Rankings del día y de la semana por localidad, provincia y país.
- Corona semanal, palmarés y rachas.
- Grupos privados con link de invitación.
- Compartir resultados.
- Perfil con avatar.
- Panel de administración: preguntas de trivia, reportes y puntajes sospechosos.
- Instalable como app (PWA), con términos y política de privacidad.
- **Beta cerrada** con amigos y conocidos en una o dos localidades.

### Etapa 1.5 — Más social

- Lista de amigos y ranking entre amigos.
- Desafíos 1 vs 1.
- Notificaciones: "salió el reto de hoy", "te pasaron en el ranking", "¡ganaste la corona!".
- Más minijuegos.

### Etapa 2 — Truco

- Mesas privadas (1 vs 1, 2 vs 2 y 3 vs 3).
- Búsqueda de partida online, ranking ELO y corona de truco.

### Etapa 3 — Crecer

- Monetización (vidas, escudo de racha, cosméticos, sponsors locales).
- Partidos/departamentos y barrios.
- Otros países y ranking mundial.

## 13. Preguntas abiertas

Para las próximas charlas:

1. **Nombre definitivo:** que funcione para el pueblo, la provincia, el país y los amigos, y que sea apto para todo público.
2. **Dominio:** ¿cuál es? Hay que configurarlo en Vercel. Depende también del nombre.
3. **Identidad visual:** colores, logo y estilo. ¿Canchero y con humor? ¿Una mascota?
4. **El título y el género:** ¿la corona dice "El Mejor de…" para todos, o cada uno elige entre "El Mejor" y "La Mejor"?
5. **Nombres** de los minijuegos.
6. **Reglas finas de la corona:** ¿5 mejores días de 7? ¿Mínimo de 3 días para coronarse? ¿Desempates?
7. **Puntajes de cada juego** (§7): revisarlos con datos reales de la beta.
8. **Premios reales** para las coronas (con sponsors): ¿sí o no? Si es que sí, hay que ver la parte legal de los concursos.
9. **Truco:** ¿siempre a 30, o las mesas privadas pueden elegir a 15?
10. **Barrios** en ciudades grandes: ¿desde cuándo?
11. **Edad mínima** y manejo de menores: a validar con un abogado.
