/** Writes docs/contenido/preguntas.md so the trivia bank can be reviewed without reading code. */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { TriviaCategory } from '@repo/games';
import { TRIVIA_QUESTIONS } from '../src/trivia/questions';

const output = fileURLToPath(new URL('../../../docs/contenido/preguntas.md', import.meta.url));

const CATEGORY_NAMES: Record<TriviaCategory, string> = {
  argentina: 'Argentina',
  football: 'Fútbol',
  geography: 'Geografía',
  history: 'Historia',
  general: 'Cultura general y deportes',
  science: 'Ciencia y naturaleza',
  entertainment: 'Entretenimiento',
};
const DIFFICULTY = { 1: 'Fácil', 2: 'Media', 3: 'Difícil' } as const;
const cell = (text: string) => text.replaceAll('|', '\\|');

const lines = [
  '# Preguntas de Cinco Preguntas',
  '',
  '> Generado desde `packages/content/src/trivia/questions.ts` con `pnpm --dir packages/content export:trivia`. No editar a mano.',
  '',
  `Banco inicial: **${TRIVIA_QUESTIONS.length} preguntas**. Cada día salen 5: dos fáciles, dos medias y una difícil.`,
  'Para revisar: que la respuesta correcta sea correcta, que las otras opciones sean incorrectas y que la dificultad tenga sentido.',
  '',
];
for (const [category, name] of Object.entries(CATEGORY_NAMES)) {
  const questions = TRIVIA_QUESTIONS.filter((question) => question.category === category);
  lines.push(`## ${name} (${questions.length})`, '', '| Dificultad | Pregunta | Respuesta correcta | Otras opciones | Id |', '|---|---|---|---|---|');
  for (const question of questions) {
    const [correct, ...others] = question.options;
    lines.push(
      `| ${DIFFICULTY[question.difficulty]} | ${cell(question.prompt)} | **${cell(correct)}** | ${others.map(cell).join(' · ')} | \`${question.id}\` |`,
    );
  }
  lines.push('');
}
writeFileSync(output, lines.join('\n'));
console.log(`${TRIVIA_QUESTIONS.length} questions written to ${output}`);
