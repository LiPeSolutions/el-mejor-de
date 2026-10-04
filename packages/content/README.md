# @repo/content

Contenido de los juegos (solo para el servidor).

- `src/words/words.json`: las palabras que valen en Diez Letras (antes Siete Letras), de 3 a 10 letras. Son unas 120.000: solo palabras que la gente conoce, con sus conjugaciones (también el voseo: tenés, decí) y sus plurales, femeninos y diminutivos. Es apta para todo público: no entran las palabras de `src/words/blocklist.ts` (eróticas, vulgares, insultos, jerga de drogas y violencia sexual). Las palabras neutras del cuerpo (pene, vagina, sexo), los nombres comunes de drogas (cocaína) y la violencia común (matar, guerra) sí valen.
- `src/words/base-words.ts`: palabras elegidas a mano para armar los retos del día: de 10 letras desde el 4/10/2026 (`BASE_WORDS_10`) y de 7 para los días anteriores (`BASE_WORDS`). Si una falta en el diccionario, o le quedan menos palabras que el mínimo del juego, cambian las letras de esos días: las pruebas lo controlan.
- `src/trivia/questions.ts`: banco de preguntas de Cinco Preguntas. Para revisarlo sin leer código: [`docs/contenido/preguntas.md`](../../docs/contenido/preguntas.md) (se regenera con `pnpm export:trivia`).

## Cómo se arma el diccionario

Son dos pasos:

1. **`pnpm build:known`** (`scripts/known-words.py`) elige las palabras conocidas de la lista de origen y las escribe en `words/known.txt`. Hace falta solo para rehacer la selección y necesita Python 3.10 o más nuevo: `pip install wordfreq==3.1.1` y `pip install --no-deps verbecc==2.0.3`.
2. **`pnpm build:words`** (`scripts/build-words.ts`) saca de esa lista las palabras bloqueadas y escribe `src/words/words.json`. Es rápido y alcanza para cambiar la lista de bloqueadas.

Cómo elige el paso 1:

- **3 y 4 letras:** solo las de `words/short.txt`, revisadas una por una. Las cortas son las que más se prueban al azar.
- **Verbos:** los frecuentes y los de `words/verbs.txt` valen con todas sus formas, sin vosotros. `words/not-verbs.txt` tiene palabras que parecen verbos pero no se conjugan (solar, pilar), y `words/rejected-verbs.txt`, verbos que no valen de ninguna forma.
- **5 letras o más:** las frecuentes (que aparecen más de unas 3 veces cada 10 millones de palabras) y las de `words/bases.txt` (poco frecuentes pero conocidas, revisadas una por una), con sus plurales, femeninos y diminutivos.
- **Siempre:** `words/extra.txt` (palabras argentinas y de todos los días que la lista de origen no tiene o los textos casi no usan) y las palabras base de los retos. **Nunca:** `words/noise.txt` (nombres, lugares, palabras en otro idioma, formas de vosotros).

Para sumar o sacar una palabra, editá esos archivos y corré los dos pasos. Si la palabra es ofensiva, alcanza con sumarla a `src/words/blocklist.ts` y correr el paso 2.

## Fuentes y licencias

- Lista de origen: [`an-array-of-spanish-words`](https://github.com/words/an-array-of-spanish-words) (licencia MIT, © Zeke Sikelianos; derivada de la lista de palabras de Letterpress).
- Frecuencias de uso: [wordfreq](https://github.com/rspeer/wordfreq) 3.1.1 (© Robyn Speer; datos con licencia CC BY-SA 4.0). Se usan para decidir qué palabras son conocidas, así que `words/known.txt` y `src/words/words.json` se comparten con la misma licencia CC BY-SA 4.0.
- Conjugaciones: los modelos de [verbecc](https://github.com/bretttolbert/verbecc) 2.0.3. Solo se usan como herramienta para proponer formas; no forman parte del diccionario.
