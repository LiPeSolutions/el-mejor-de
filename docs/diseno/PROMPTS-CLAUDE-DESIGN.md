# Prompts para Claude Design

Cómo usarlos:

1. Abrí Claude Design y empezá un proyecto nuevo.
2. Adjuntá el archivo `BRIEF-DISENO.md`. Si no te deja adjuntarlo, pegá su contenido debajo del prompt.
3. Pegá el **Paso 1**. Cuando te muestre las 3 direcciones, elegí una y seguí con el **Paso 2**, y así hasta el final.

Entre un paso y otro podés pedirle cambios con tus palabras: "más colorido", "la corona más grande", "esto no me gusta".

---

## Paso 1: direcciones visuales

```text
Hola. Quiero diseñar la interfaz de "El Mejor de", una web app (PWA, mobile-first) de minijuegos y retos diarios con rankings por lugar, para Argentina y para todo público. Te adjunto BRIEF-DISENO.md con todo el contexto: leelo completo antes de empezar. Respetá especialmente el tono rioplatense con voseo, la lista de "Lo que NO queremos" y los principios de UX.

Primer paso: proponé 3 direcciones visuales bien distintas entre sí. Para cada una, mostrame:
- la pantalla de Inicio ("Hoy") en un marco de celular de 390 × 844;
- la imagen para compartir en formato historia (1080 × 1920);
- la paleta (modo claro y oscuro), las tipografías (Google Fonts), el estilo de íconos e ilustración y una propuesta de logo jugando con "El Mejor de ___".

Usá los datos de ejemplo del brief (sección 7) para que se vea real, y cerrá cada dirección con 2 o 3 líneas sobre por qué encaja con el producto.

No avances con el resto de las pantallas hasta que elija una dirección.
```

## Paso 2: flujo principal

Reemplazá lo que está entre corchetes antes de mandarlo.

```text
Vamos con la dirección [A / B / C]. [Cambios que quieras, por ejemplo: "pero con la tipografía de la B".]

Diseñá todas las pantallas de prioridad 1 del brief (sección 5.1) como un prototipo navegable en 390 × 844, conectadas siguiendo este recorrido: llegada desde un link compartido → jugar los 3 retos → resumen del día → compartir → crear cuenta → verificar ubicación → ranking. Incluí todas las variantes que pide el brief.
```

## Paso 3: pantallas secundarias

```text
Ahora sumá las pantallas de prioridad 2 del brief (sección 5.2) con el mismo estilo, conectadas al prototipo. En el festejo de la corona, mostrame también la variante "La Mejor de…".
```

## Paso 4: sistema de diseño y pase a desarrollo

```text
Armá un mini sistema de diseño con todo lo que usamos (sección 8 del brief) y preparalo para pasárselo a Claude Code: la app se va a programar en Next.js + Tailwind CSS.
```
