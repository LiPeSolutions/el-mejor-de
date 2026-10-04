# El Mejor de — Plan del proyecto

> Documento vivo: lo vamos ajustando a medida que decidimos cosas.
> Lo marcado como *(propuesta)* todavía no está confirmado.
> Última actualización: 4 de octubre de 2026 (Tubitos, el quinto juego, y la rotación de 5 juegos; batallas en vivo, con los cinco juegos; la vibración de la señal de Largada se mantiene; música en loop).

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
| Nombre | **Provisorio: "El Mejor de"** (o "El Mejor") hasta definir el definitivo. En el código se cambia en un solo lugar. |
| Dominio | **Por ahora, `game.lipesolutions.com`**, porque "El Mejor de" puede no ser el nombre definitivo. El dominio propio se compra cuando esté el nombre: `elmejorde.app` y `elmejorde.com` estaban libres el 2/10/2026. |
| Diseño | Dirección **"Plaza + cielo"** de Claude Design: 40 pantallas de prioridad 1 y 2, sistema de diseño y personajes. Referencia: `docs/diseno/handoff/`. |
| Alcance | **Argentina primero.** Todo se prepara para sumar otros países después. |
| Público | **Todo público.** Implica cuidados extra de seguridad (ver §9). |
| Tipos de juego | Palabras, trivia, habilidad y reflejos, lógica y memoria. **Truco** en la etapa 2. |
| Reto diario | **Varios retos cortos por día** (3), iguales para todos, **1 intento** cada uno. Se suman en un puntaje del día. Con 5 juegos, **cada día se juegan 3 y descansan 2**: cada juego sale 3 de cada 5 días y ninguno descansa dos días seguidos (desde el 5/10/2026; 4/10/2026). |
| Juego libre | **Práctica sin límite + récords personales.** No cuenta para las coronas. |
| Corona | **Semanal y en vivo.** Durante la semana la corona la tiene quien va primero, y si alguien lo pasa en puntos, se la saca. El domingo a la medianoche queda definitiva: el #1 de cada lugar y de cada grupo es "El Mejor de…" esa semana. Cuenta la suma de los **5 mejores días**, **sin mínimo de días**; si empatan, la conserva quien llegó primero a ese puntaje (3/10/2026). Hay corona de **barrio o localidad, de provincia y de país**, cada una con su nombre ("¡Sos El Mejor de Caballito!", "…de Argentina"), y por ahora **se entregan solas** (3/10/2026). |
| El / La Mejor | Cada jugador elige **al crear la cuenta** si la corona dice "El Mejor de…" o "La Mejor de…", y lo puede **cambiar en el perfil**. Nunca se adivina por el nombre. La marca sigue siendo "El Mejor de". |
| Puntajes | **Los del plan** (§7), no los del diseño. Diez Letras pasó a **puntos fijos por largo** (3/10/2026). |
| Largada | Reemplaza a **Reflejos**: una largada de autos contra los tiempos de hoy de tu grupo, con 3 largadas y el puntaje según tu promedio. La espera es **distinta para cada jugador**, cada auto tiene **el color del personaje** y se corre contra **el último grupo que abriste**, que se puede cambiar (3/10/2026; construida, en el reto del día desde el 4/10; ver §7). |
| Tubitos | **Quinto juego, de lógica** (4/10/2026): pasar los colores de un tubo a otro hasta que cada tubo tenga uno solo. La responsable del producto lo diseñó con Claude Design (dirección "Probeta"). En el reto del día son **3 niveles seguidos** (6, 8 y 10 tubos) y entra en la rotación **desde el lunes 5/10/2026**; en la práctica, **niveles sin fin**. **Reiniciar vuelve los movimientos a 0** (el reloj sigue) y **deshacer no los descuenta** (3 por nivel). Tiene **música propia** (ver §7). |
| Sonido | **Efectos y cortinas cortas hechos con código** (sin archivos ni licencias): al tocar, acertar, equivocarse, en los últimos segundos y en Largada; una melodía de 1 a 3 segundos al cerrar el día, al batir un récord y al ganar la corona. **Música en loop** (4/10/2026): una para el menú ("Plaza", con aire de cumbia) y una por juego, cada una con su carácter ("Carrera" en Largada es la más rápida; "Memoria" en Secuencia, la más tranquila); va más baja que los efectos y se apaga aparte en el perfil. Arranca **prendido**, respeta el modo silencio del iPhone, no corta la música del celu y se apaga con el parlante de los juegos o en el perfil. En Secuencia cada color tiene su nota, en la práctica y en el reto (3/10/2026). |
| Ubicación | Se elige al crear la cuenta, **con el GPS en un toque** (las localidades cercanas ya quedan verificadas) o a mano. Sin verificar se juega igual, pero no se entra al ranking del lugar; al verificar entra lo de esa semana. Para **ganar la corona** de un lugar hay que haber **verificado esa misma semana**; si no, pasa al siguiente que sí. La localidad se **cambia cuando quieras**, con el GPS confirmando la nueva. En la Ciudad de Buenos Aires se compite **por barrio** (3/10/2026). |
| Cuentas | **Jugás sin registrarte**; para entrar en los rankings creás una cuenta con **apodo y contraseña**, sin email: más fácil y sirve para los chicos. Más adelante se va a poder **vincular con Google**, para entrar aunque te olvides la contraseña. |
| Social | Grupos privados, lista de amigos, desafíos 1 vs 1 y compartir resultados. Los **grupos van antes que el lugar y el ranking** (3/10/2026): hasta 50 miembros, invitación por link o código y su propia corona en vivo (ver §8). |
| Batallas en vivo | **Jugar al mismo tiempo**, cada uno en su celu (4/10/2026): se arma una sala **desde un grupo** (sus miembros ven el aviso) **o con un link** para cualquiera, con cuenta y **de 2 a 10 jugadores**. Quien la arma elige **un juego** y al final hay **revancha u otro juego** en la misma sala. Todo **a la par**: las mismas preguntas y las mismas luces para todos a la vez. **No cuentan para rankings ni coronas**; el grupo guarda **quién ganó cada batalla**. Con los cinco juegos: primero Largada y Cinco Preguntas, después Diez Letras, Secuencia y Tubitos (ver §8). |
| Truco | Online contra gente y mesas privadas. **Sin flor.** 1 vs 1, 2 vs 2 y 3 vs 3. |
| Comunicación | **Solo frases, emojis y señas predefinidas** (sin chat libre). |
| Monetización | **Más adelante.** Idea inicial: comprar vidas. |
| Primera versión | **MVP sin truco**, para salir rápido a probar con gente real. |
| Infraestructura | Vercel Pro (ya está), Supabase para la base de datos y dominio propio. Presupuesto: USD 25–100 por mes. Supabase va en una **organización propia, "El Mejor de"**, separada de Yendo. |
| Roles | La persona responsable del producto decide producto, diseño y negocio; Claude se encarga del desarrollo. |

## 3. Cómo se juega

### Un día cualquiera

1. Te llega un link por WhatsApp: *"Hoy hice 2.640. ¿Me ganás?"*.
2. Entrás y jugás los **3 retos del día** sin registrarte (de 3 a 6 minutos en total).
3. Ves tu puntaje y en qué puesto quedarías en tu localidad: *"Hoy estarías #4 en Chivilcoy. Creá tu cuenta para entrar al ranking."*
4. Creás la cuenta (apodo, contraseña y personaje), elegís tu localidad y la verificás con el GPS. Lo que jugaste ese día pasa a tu cuenta.
5. Compartís tu resultado, armás el grupo "El Mejor de los primos" y mandás el link.
6. Al día siguiente volvés: retos nuevos, tu racha sigue y el ranking de la semana se mueve.
7. El lunes a la mañana se anuncian las coronas: *"👑 Sos El Mejor de Chivilcoy de la semana"*.

### Retos diarios

- Todos los días hay **3 retos**, cada uno de un minijuego distinto. Las categorías van rotando: con 5 juegos, cada uno sale 3 de cada 5 días y ninguno descansa dos días seguidos (desde el 5/10/2026).
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
| Localidad (en la Ciudad de Buenos Aires, el barrio) | El Mejor de Chivilcoy · El Mejor de Caballito | MVP |
| Provincia (la Ciudad de Buenos Aires cuenta como una) | El Mejor de Buenos Aires · El Mejor de la Ciudad de Buenos Aires | MVP |
| País | El Mejor de Argentina | MVP |
| Grupos privados | El Mejor de la oficina | MVP |
| Amigos | Ranking entre tus amigos | Etapa 1.5 |
| Mundo | El Mejor del Mundo | Cuando sumemos otros países |

Cada nivel tiene su corona, con su nombre: *"¡Sos El Mejor de Caballito!"*, *"¡Sos El Mejor de la Ciudad de Buenos Aires!"*, *"¡Sos El Mejor de Argentina!"* (decidido el 3/10/2026).

Más adelante podemos sumar **partidos/departamentos** y **barrios** en otras ciudades grandes: en Córdoba capital ser el mejor de la ciudad es difícil, pero ser el mejor de tu barrio, no tanto. En la Ciudad de Buenos Aires ya se compite por barrio.

### Períodos

- **Ranking del día:** para engancharse todos los días.
- **Ranking de la semana (el de la corona):** de **lunes a domingo**. Cuenta la suma de tus **5 mejores días** de la semana, así podés faltar dos días sin quedar afuera (máximo 15.000).
- **Histórico:** coronas ganadas, rachas y récords.

### Corona semanal

Decidido el 3/10/2026, para los lugares y los grupos:

- **La corona está en juego toda la semana.** La tiene quien va primero: si el miércoles la tiene uno y el jueves otro lo pasa en puntos, la corona pasa al que más tiene.
- La semana cierra el domingo a la medianoche. Quien tiene la corona en ese momento se la queda, y el lunes a la mañana se anuncia: **"El Mejor de Chivilcoy – Semana 40"**.
- **Sin mínimo de días:** gana quien más sumó con sus 5 mejores días, aunque haya jugado uno solo.
- **Empate:** la conserva quien llegó primero a ese puntaje. Para sacarle la corona a alguien hay que superarlo, no igualarlo.
- Si sos **el único jugador** de tu localidad, te coronás igual, pero la app te lo hace notar con humor y te invita a traer competencia: *"Sos El Mejor de Tapalqué… porque sos el único. ¿Te animás a invitar a alguien?"*
- **Para ganar la corona de un lugar hay que haber verificado la ubicación esa misma semana** (decidido el 3/10/2026). Si quien va primero no lo hizo, la corona pasa al siguiente que sí. Los grupos no piden GPS.
- Las coronas de barrio o localidad, de provincia y de país **se entregan solas** por ahora. Revisar a mano las grandes llega con el panel de administración, cuando haya mucha gente (3/10/2026).

### Palmarés

Cada perfil muestra su historial: *"Fue El Mejor de Rosario 7 semanas · 2 veces El Mejor de Santa Fe"*. Así la corona semanal no se olvida al lunes siguiente.

## 5. Ubicación y verificación

La gracia es competir con tu lugar, así que la ubicación tiene que ser real.

1. **Al registrarte** (decidido el 3/10/2026):
   - **Con el GPS, en un toque:** tocás "Usar mi ubicación", te mostramos las localidades cercanas y elegís la tuya, que ya queda verificada.
   - **A mano:** si no querés usar el GPS, buscás tu provincia y tu localidad, y la verificás después.
   - **Sin verificar** jugás igual y tus puntajes se guardan, pero no entrás al ranking de tu localidad. Cuando verificás, entra todo lo de esa semana.
   - Si vivís en el campo, lejos del pueblo, vale estar dentro del mismo partido.
   - En la **Ciudad de Buenos Aires** se compite **por barrio** ("El Mejor de Palermo"), y la ciudad entera es el nivel de arriba, como una provincia. Los datos oficiales ya traen los 48 barrios.
2. **Para la corona se vuelve a verificar** (decidido el 3/10/2026): quien quiera ganar la corona de un lugar tiene que haber verificado esa misma semana. Si quien va primero no lo hizo, la corona pasa al siguiente que sí. Volver a pedirlo al entrar al podio o con un récord muy por encima de lo habitual queda para cuando aparezcan trampas. *(Propuesta.)*
3. **Si no estás en tu zona** (por ejemplo, porque estás de viaje), lo que jugás sigue contando en el ranking de tu lugar; para pelear la corona tenés que verificar desde ahí antes de que cierre la semana.
4. **Mudanzas** (decidido el 3/10/2026): podés cambiar de localidad **cuando quieras**, pero el GPS tiene que confirmar que estás en la nueva. Lo que jugaste antes del cambio queda en el lugar viejo.
5. **Privacidad:** tu ubicación exacta nunca se muestra ni se guarda. Solo queda registrado el resultado ("verificado en Chivilcoy el 2/10") y en la app solo se ve el nombre de tu localidad.

> El GPS del navegador se puede falsear con algunas apps, así que no es la única barrera: se combina con otras señales (ver §6).

## 6. Juego limpio

Si la corona se puede trucar, deja de valer. Por eso hay varias capas:

1. **El servidor manda.** Los retos se generan y se corrigen en el servidor; el celu nunca recibe las respuestas antes de tiempo y los tiempos se controlan desde el servidor.
2. **Un intento de verdad.** Cada reto se puede empezar una sola vez por cuenta.
3. **Detección de imposibles.** Por ejemplo, reflejos más rápidos de lo humanamente posible o un salto enorme de nivel de un día para otro. Esos puntajes se marcan para revisión.
4. **Ubicación verificada** en los momentos clave (ver §5), cruzada con la ubicación aproximada de la conexión a internet.
5. **Una persona, una cuenta.** Como crear una cuenta es fácil (apodo y contraseña), hay límites de cuentas por celu y por conexión, cada reto se juega una vez por cuenta, el ranking del lugar pide GPS y las coronas grandes se revisan.
6. **El sonido no da ventaja.** Nada que suene dice algo que la pantalla no muestre: la señal de Largada es solo visual, porque con un sonido se reacciona unos 40 ms antes. La excepción decidida son las notas de Secuencia (3/10/2026). La **vibración de la señal de Largada** en Android viene del diseño y **se mantiene** (decidido el 4/10/2026), aunque a una vibración se reaccione unas centésimas antes y el iPhone no vibre.
7. **Reportes y revisión.** Cualquiera puede reportar algo raro. Las coronas de provincia y de país por ahora se entregan solas; revisarlas a mano antes de entregarlas llega con el panel de administración. *(Propuesta.)*

## 7. Minijuegos

Cada minijuego dura entre **60 y 90 segundos** (Tubitos, unos 3 minutos) y se juega cómodo con una mano en el celu. Los nombres son provisorios.

### Los juegos

| Categoría | Juego | Cómo se juega |
|---|---|---|
| Palabras | **Diez Letras** (hasta el 3/10/2026, Siete Letras) | Con 10 letras, armá todas las palabras que puedas en 90 segundos. Las letras salen de una palabra escondida que usa las 10: encontrarla tiene premio. |
| Trivia | **Cinco Preguntas** | 5 preguntas de 15 segundos cada una: Argentina, fútbol, geografía, historia y cultura general. Responder rápido suma más. |
| Habilidad | **Largada** (hasta el 3/10/2026, Reflejos) | Cuando se apaguen las cinco luces del semáforo, tocá. Son 3 largadas contra los tiempos de hoy de tu grupo, y cuenta tu promedio. Si te adelantás, perdés esa largada. |
| Memoria | **Secuencia** | Repetí secuencias de colores cada vez más largas (tipo Simón dice). Cuanto más lejos llegás, más puntos. |
| Lógica | **Tubitos** (desde el 5/10/2026) | Pasá los colores de un tubo a otro hasta que cada tubo tenga uno solo. Son 3 niveles seguidos, de 6, 8 y 10 tubos: con menos movimientos y menos tiempo, más puntos. |

### Cómo se puntúa *(decidido; a calibrar con la beta)*

Cada reto da de 0 a 1.000 puntos:

| Juego | Puntos |
|---|---|
| Diez Letras | Puntos fijos por largo: 3 letras, 25; 4, 50; 5, 80; 6, 120; 7, 160; 8 o más, 220. La que usa las 10 suma 300 de premio. Tope 1.000: una partida normal da unos 500 y una muy buena llega a 1.000. Rige desde el reto del 4/10/2026; antes era Siete Letras, con puntos proporcionales a las letras del día. |
| Cinco Preguntas | Hasta 200 por pregunta: 200 si acertás en 2 segundos o menos, 10 menos por cada segundo extra y nunca menos de 100 si acertás. |
| Largada | Sale del promedio de las 3 largadas: 1.000 con 200 ms o menos, 2 menos por cada milisegundo más y 0 con 700 ms. Adelantarse cuenta como 450 ms y no tocar, como 700. Rige desde el reto del 4/10/2026; antes era Reflejos: hasta 200 por ronda, completos con 170 ms o menos y nada con 550 ms o más. |
| Secuencia | Llegar al nivel 12 (14 colores seguidos) vale 1.000; cada nivel menos resta proporcionalmente. |
| Tubitos | Cada nivel vale 250, 350 y 400. En cada uno, el 70 % sale de los movimientos (el mínimo dividido los que hiciste, hasta 1) y el 30 %, del tiempo: completo con 25, 40 y 60 segundos y nada con 100, 150 y 220. Un nivel sin resolver vale 0. |

Para que nadie se pase las respuestas, en Cinco Preguntas todos ven las mismas preguntas, pero cada uno ve las opciones en otro orden. En Largada y Secuencia cada jugador tiene su propia versión, de la misma dificultad. En Tubitos todos tienen el mismo tablero con los colores y el orden de los tubos cambiados: el mismo mínimo de movimientos, pero la solución de uno no sirve para copiarla en otro.

### Largada *(reemplaza a Reflejos; decidida y construida el 3/10/2026)*

La responsable del producto la diseñó con Claude Design. El diseño completo, con las pantallas y la explicación, está en [`docs/diseno/handoff-largada`](diseno/handoff-largada/LARGADA.md).

- **Cómo se juega:** se prenden las cinco luces del semáforo de a una. Después de una espera al azar se apagan todas juntas, y ahí hay que tocar. Son **3 largadas**, y los autos corren solos según el tiempo de reacción de cada uno.
- **Puntaje:** sale del promedio: 1.000 con 200 ms o menos, 2 puntos menos por cada milisegundo más y 0 con 700 ms o más. Adelantarse cuenta como 450 ms, y no tocar, como 700 ms.
- **Rivales:** los del grupo que ya jugaron ese día, cada uno con sus tiempos reales, en hasta 5 carriles contándote a vos. Se corre contra **el último grupo que abriste**, y antes de empezar se puede elegir otro.
- **Sin grupo o si nadie jugó todavía:** contra el mejor de ese día de tu localidad, o del país si no tenés lugar, como un auto fantasma gris.
- **Bots** *(decidido el 3/10/2026)*: cuatro personajes con su propio nivel. **Rayo** es muy rápido, **Chispa** y **Turbo** van parejos, y **Tortuga** es lento y a veces se adelanta.
  - En la **práctica** siempre completan la pista: primero los del grupo que corrieron hoy (o el fantasma) y después los bots, hasta 5 autos.
  - En el **reto del día** aparecen solo si te toca correr solo.
  - No cambian el puntaje, que sale de tus tiempos, y no están en el podio del grupo.
- **Esperas distintas para cada jugador**, como en Reflejos: si fueran iguales, quien ya jugó podría avisarle a otro cuándo se apagan las luces. Los tiempos se comparan igual, porque se miden desde que se apagan.
- **Autos:** cada uno con el color de su personaje.
- **Desde cuándo:** en el reto del día desde el **4/10/2026** (el primer día con reto de reflejos es el lunes 5/10). Los días anteriores siguen con Reflejos, para que un reto no cambie después de empezado. La práctica ya es Largada, y su récord arranca de cero porque el de antes era de otro juego.
- **Resultado:** el puntaje, la **foto de llegada** de tu mejor largada, el **podio del grupo** con la Largada de hoy y, si esa largada te dio la corona de la semana del grupo, la franja dorada. "Contale al grupo" comparte la foto y el texto por WhatsApp.
- **Para una segunda vuelta:** la tarjeta "Pato todavía no largó · Desafiá a Pato" (opción 1c del diseño).

### Tubitos *(decidido y construido el 4/10/2026)*

La responsable del producto lo diseñó con Claude Design (dirección "Probeta"). El diseño, con las pantallas y la explicación, está en [`docs/diseno/handoff-tubitos`](diseno/handoff-tubitos/TUBITOS.md).

- **Cómo se juega:** tocás un tubo para levantarlo y otro para pasarle lo de arriba. Solo se puede pasar sobre el mismo color o a un tubo vacío, y pasa todo lo que entra. El nivel termina cuando cada tubo tiene un solo color. Cada color lleva su ícono, así el juego se entiende sin distinguir colores.
- **Reto del día:** 3 niveles seguidos (6, 8 y 10 tubos, con 4, 6 y 8 colores) y un solo intento. Entre nivel y nivel, la victoria del nivel con el reloj frenado. El servidor entrega cada nivel recién cuando resolviste el anterior.
- **Reiniciar y deshacer** (decidido el 4/10/2026): reiniciar vuelve el tablero al principio y los movimientos a 0, pero el reloj sigue. Hay 3 deshacer por nivel y no descuentan movimientos.
- **Puntaje:** ver la tabla de arriba. El mínimo de cada nivel lo calcula el servidor al armarlo, con la solución más corta. A calibrar con la beta.
- **Tiempo:** el de cada nivel lo mide el celu, pero el servidor también lo cronometra (desde que entrega el nivel hasta que se entera de que lo resolviste) y nunca cuenta mucho menos que eso.
- **Práctica:** niveles sin fin (del 1 al 4 con 6 tubos, del 5 al 9 con 8 y desde el 10 con 10). El récord es el nivel más alto resuelto, y cada vez seguís desde el que viene.
- **Desde cuándo:** en la práctica, desde que se publicó; en el reto del día, desde el lunes 5/10/2026 (decidido: al día siguiente de publicarlo), con la rotación de 5 juegos.
- **Música:** "Laboratorio", tranquila y burbujeante (decidido el 4/10/2026), y dos sonidos nuevos: el gluglú del vertido y el "plop" del corcho.
- **Para una segunda vuelta:** el grupo en el juego y en la victoria.
- **En las batallas en vivo** (hecho el 4/10/2026): como el reto, con los mismos 3 tableros para todos (ver §8).

### Ideas para después

- **Más o menos:** "¿Chivilcoy tiene más o menos habitantes que Junín?" Usa datos del censo, así que es bien local.
- **Mapa:** ubicar provincias, ciudades o lugares conocidos en el mapa.
- **Abecedario:** una definición por letra, contra reloj.
- **Anagramas**, **Cálculo rápido**, **Puntería**, **Cronómetro** (frenalo justo en 10,00 segundos) y **Sudoku mini**.
- **Trivia de tu provincia o de tu pueblo**, quizás con preguntas que proponga la comunidad.

## 8. Social

| Función | Qué hace | ¿Cuándo? |
|---|---|---|
| Grupos privados | Rankings propios ("El Mejor de la oficina", "de la familia") con link de invitación por WhatsApp y su propia corona semanal, en vivo. | MVP |
| Compartir resultados | Imagen y texto con emojis para WhatsApp o historias, con un link que se ve lindo al compartirlo. | MVP |
| Lista de amigos | Agregar amigos, ver sus resultados y un ranking entre ustedes. | Etapa 1.5 |
| Desafíos 1 vs 1 | Retar a alguien a un minijuego: los dos juegan el mismo reto y gana el mejor puntaje. Cada uno juega cuando puede, dentro de las 24 horas. | Etapa 1.5 |
| Batallas en vivo | Una sala de 2 a 10 amigos que juegan el mismo juego a la vez, desde un grupo o con un link. | **Hecho** (4/10/2026): los cinco juegos |

Los grupos y el compartir van primero porque son los que más gente nueva traen.

### Grupos *(decidido el 3/10/2026)*

- **Crear:** nombre (con el mismo filtro de palabras que los apodos), emblema y color. Hasta **50 miembros**.
- **Invitar:** cualquier miembro comparte el link o el código por WhatsApp. El link vence a los **7 días** y se puede renovar.
- **Sumarse:** hace falta cuenta. Si abrís el link sin cuenta, la creás y quedás en el grupo.
- **Ranking:** Hoy y Semana, con los retos del día (la práctica no cuenta). Cuenta tu semana entera, aunque te sumes el jueves.
- **Corona del grupo:** en vivo, con las mismas reglas que la de los lugares (§4). La primera semana con corona es la del 5 al 11/10/2026: se entrega el lunes 12/10.
- **Administración:** quien lo crea lo administra: cambia el nombre o el emblema, renueva el link y puede sacar a alguien. Cualquiera puede irse del grupo.
- **Sin GPS:** los grupos no piden ubicación.

### Batallas en vivo *(decidido el 4/10/2026)*

La responsable del producto pidió poder jugar al mismo tiempo con los del grupo, "para cuando tenés un rato libre con algún amigo". Las pantallas se aprobaron con bocetos antes de construirlas.

- **Quiénes:** de 2 a 10 jugadores, con cuenta. Se arma **desde un grupo**: arriba del ranking, "Batalla en vivo · Armar", y los miembros ven "Pato armó una de Largada · Sumarme". O **desde Práctica**, sin grupo. En los dos casos se puede invitar a cualquiera con el **link o el código** por WhatsApp; quien no tiene cuenta la crea y entra.
- **La sala:** quien la arma elige el juego y la empieza; los demás esperan. Puede sacar a alguien de la sala, y esa persona no vuelve a esa batalla.
- **A la par:** una cuenta regresiva en todos los celus a la vez y después:
  - **Cinco Preguntas:** la misma pregunta para todos. Se ve quién ya respondió, pero no qué. La correcta aparece cuando respondieron todos o se terminó el tiempo, así nadie la puede cantar, y después de cada una se ve la tabla. Los puntos son los del juego.
  - **Largada:** las mismas luces para todos, que se apagan al mismo tiempo en cada celu. Cuando todos tocaron, la carrera corre a la vez en todos los celus. Son 3 largadas, y gana el mejor promedio, con las penalidades del juego.
  - **Diez Letras** (hecho el 4/10/2026): las mismas 10 letras para todos, en los mismos 90 segundos.
    - Mientras se juega se ven los puntos de cada uno, nunca sus palabras.
    - Los puntos son los del juego, sumados sin el tope de 1.000: el que más encuentra siempre gana. Un empate lo gana quien llegó primero a ese puntaje.
    - No hay botón para terminar antes, como en el reto.
    - En el podio se ven **las palabras de todos**, tocando a cada uno. Las que encontró uno solo llevan una estrella, y las groseras se ocultan para los demás.
  - **Secuencia** (hecho el 4/10/2026): por rondas, con la misma secuencia para todos a la vez. El que se equivoca o no responde a tiempo queda afuera y mira el resto.
    - Para repetirla hay 3 segundos más 1 por color (con 5 colores, 8 segundos); la ronda sigue apenas respondieron todos.
    - **Desempate:** si se equivocan todos los que quedan en la misma ronda, la juegan otra vez solo ellos (con los mismos colores), hasta que quede uno. Después de 3 desempates seguidos, comparten el primer puesto, así la partida siempre termina.
    - Gana el último que queda. En el podio, cada uno con el nivel en que quedó afuera.
  - **Tubitos** (hecho el 4/10/2026): **como el reto**. Los mismos 3 tableros para todos (6, 8 y 10 tubos), uno detrás del otro, con los puntos del reto (movimientos y tiempo).
    - Cada uno juega su versión del tablero (otros colores y otro orden de tubos), así el de al lado no se copia.
    - Se ve quién ya lo resolvió; cómo le fue a cada uno, en la tabla al cerrar el tablero.
    - Cada tablero tiene un tiempo máximo: 1:40, 2:30 y 3:40, que es cuando en el reto el tiempo deja de sumar. Quien no lo resuelve a tiempo no suma ese tablero, y sigue en el próximo.
    - Con los mismos puntos, gana el que tardó menos en total.
- **El final:** el podio de la batalla y **revancha** (otras preguntas, otras largadas) u **otro juego**, sin salir de la sala.
- **Si alguien se va** o se le corta internet, la partida sigue sin esa persona. Quien llega con una partida empezada juega la próxima. Si se va quien la armó, elige el que entró después.
- **No cuentan para rankings ni coronas**, que siguen saliendo de los retos del día. En el grupo, la pestaña **Batallas** muestra cuántas ganó cada uno y las últimas que se jugaron. Un empate arriba cuenta como ganada para cada uno.
- **Sin chat**, como en el resto de la app. La música suena en todos los celus de la sala al mismo compás, y la pantalla no se apaga durante la partida.

## 9. Seguridad (todo público)

Como también juegan chicos:

- **Sin fotos de perfil:** cada uno elige un avatar de una galería.
- **Sin chat libre:** solo frases, emojis y señas predefinidas.
- **Filtro de palabras** (lunfardo incluido) en apodos y nombres de grupos, más un botón para reportar.
- **La ubicación nunca se muestra exacta:** solo el nombre de la localidad.
- **Datos personales al mínimo:** la cuenta es un apodo y una contraseña, sin email. Opción de borrar la cuenta, y términos y política de privacidad claros.
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
- Cuentas: jugar sin registrarse, y registro con apodo y contraseña (después, vincular con Google).
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
- Notificaciones: "salió el reto de hoy", "te pasaron en el ranking", "¡ganaste la corona!", "Pato armó una batalla".
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

1. **Nombre definitivo:** que funcione para el pueblo, la provincia, el país y los amigos, y que sea apto para todo público. Con el nombre se compra el dominio.
2. **Nombres** de los minijuegos.
3. **Puntajes de cada juego** (§7): revisarlos con datos reales de la beta.
4. **Preguntas de trivia:** revisar el banco inicial (`docs/contenido/preguntas.md`).
5. **Premios reales** para las coronas (con sponsors): ¿sí o no? Si es que sí, hay que ver la parte legal de los concursos.
6. **Truco:** ¿siempre a 30, o las mesas privadas pueden elegir a 15?
7. **Barrios** en otras ciudades grandes (Córdoba, Rosario…): ¿desde cuándo? En la Ciudad de Buenos Aires ya se compite por barrio.
8. **Edad mínima** y manejo de menores: a validar con un abogado.
9. **Modo oscuro:** el diseño todavía no lo incluye.
10. **Palabras prohibidas en los apodos:** revisar la lista (`packages/shared/src/accounts.ts`).
11. **Contraseñas olvidadas sin Google:** ¿las recuperamos a mano (por ejemplo, con un código que da el equipo) o la cuenta se pierde?
12. **Diccionario de Diez Letras:** hoy acepta palabras poco conocidas y conjugaciones, como "ADRAN" o "AES". ¿Valen solo las palabras conocidas? Habría que filtrar el diccionario por frecuencia de uso.
13. **Tubitos:** ¿la pantalla ancha de tablet (hasta 760 px) se usa también en los otros juegos? Por ahora es solo de Tubitos. (Que entra a las batallas en vivo, como el reto, se decidió el 4/10/2026.)
