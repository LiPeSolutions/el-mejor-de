# @repo/content

Contenido de los juegos (solo para el servidor).

- `src/words/words.json`: palabras de 3 a 7 letras para Siete Letras. Se genera con `pnpm build:words` a partir de [`an-array-of-spanish-words`](https://github.com/words/an-array-of-spanish-words) (licencia MIT, © Zeke Sikelianos; derivada de la lista de palabras de Letterpress), sin las palabras de `src/words/blocklist.ts`.
- `src/words/base-words.ts`: palabras de 7 letras elegidas a mano para armar los retos del día.
- `src/trivia/questions.ts`: banco de preguntas de Cinco Preguntas. Para revisarlo sin leer código: [`docs/contenido/preguntas.md`](../../docs/contenido/preguntas.md) (se regenera con `pnpm export:trivia`).
