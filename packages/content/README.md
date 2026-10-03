# @repo/content

Contenido de los juegos (solo para el servidor).

- `src/words/words.json`: palabras de 3 a 10 letras para Diez Letras (antes Siete Letras). Se genera con `pnpm build:words` a partir de [`an-array-of-spanish-words`](https://github.com/words/an-array-of-spanish-words) (licencia MIT, © Zeke Sikelianos; derivada de la lista de palabras de Letterpress), sin las palabras de `src/words/blocklist.ts`.
- `src/words/base-words.ts`: palabras elegidas a mano para armar los retos del día: de 10 letras desde el 4/10/2026 (`BASE_WORDS_10`) y de 7 para los días anteriores (`BASE_WORDS`).
- `src/trivia/questions.ts`: banco de preguntas de Cinco Preguntas. Para revisarlo sin leer código: [`docs/contenido/preguntas.md`](../../docs/contenido/preguntas.md) (se regenera con `pnpm export:trivia`).
