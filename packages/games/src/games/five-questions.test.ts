import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import type { GameRngs } from '../types';
import {
  createFiveQuestions,
  fiveQuestionsPoints,
  validateTriviaBank,
  type TriviaQuestion,
} from './five-questions';

const BANK: TriviaQuestion[] = [
  { id: 'futbol-mundiales', category: 'football', difficulty: 1, prompt: '¿Cuántas Copas del Mundo ganó la Selección Argentina?', options: ['3', '2', '4', '1'] },
  { id: 'historia-independencia', category: 'history', difficulty: 1, prompt: '¿En qué año se declaró la independencia argentina?', options: ['1816', '1810', '1853', '1806'] },
  { id: 'cultura-mafalda', category: 'entertainment', difficulty: 1, prompt: '¿Qué personaje creó Quino?', options: ['Mafalda', 'Patoruzú', 'Isidoro Cañones', 'Clemente'] },
  { id: 'geografia-cataratas', category: 'geography', difficulty: 2, prompt: '¿En qué provincia están las Cataratas del Iguazú?', options: ['Misiones', 'Corrientes', 'Salta', 'Entre Ríos'] },
  { id: 'ciencia-jupiter', category: 'science', difficulty: 2, prompt: '¿Cuál es el planeta más grande del sistema solar?', options: ['Júpiter', 'Saturno', 'Neptuno', 'La Tierra'] },
  { id: 'general-guitarra', category: 'general', difficulty: 2, prompt: '¿Cuántas cuerdas tiene una guitarra criolla?', options: ['6', '4', '8', '12'] },
  { id: 'geografia-aconcagua', category: 'geography', difficulty: 3, prompt: '¿Cuál es la montaña más alta de América?', options: ['Aconcagua', 'Ojos del Salado', 'Chimborazo', 'Huascarán'] },
  { id: 'historia-constitucion', category: 'history', difficulty: 3, prompt: '¿En qué año se sancionó la Constitución Nacional?', options: ['1853', '1816', '1810', '1880'] },
  { id: 'ciencia-oro', category: 'science', difficulty: 3, prompt: '¿Cuál es el símbolo químico del oro?', options: ['Au', 'Ag', 'Or', 'Go'] },
];

const game = createFiveQuestions(BANK);
const rngs = (day: string, user: string): GameRngs => ({ shared: createRng(day), player: createRng(`${day}:${user}`) });

describe('validateTriviaBank', () => {
  it('catches duplicated ids and repeated options', () => {
    expect(() => validateTriviaBank([BANK[0]!, BANK[0]!])).toThrow('duplicated');
    expect(() =>
      validateTriviaBank([{ ...BANK[0]!, id: 'x', options: ['3', '3', '4', '1'] }]),
    ).toThrow('repeated options');
  });

  it('needs enough questions for a day', () => {
    expect(() => createFiveQuestions(BANK.slice(0, 4))).toThrow('at least 5');
  });
});

describe('generate', () => {
  it('gives every player the same questions, easy ones first', () => {
    const tincho = game.generate(rngs('2026-10-02', 'tincho'));
    const laflor = game.generate(rngs('2026-10-02', 'laflor'));
    const ids = (content: typeof tincho.content) => content.questions.map((q) => q.id).sort();
    expect(ids(tincho.content)).toEqual(ids(laflor.content));
    expect(tincho.content.questions.map((q) => q.difficulty)).toEqual([1, 1, 2, 2, 3]);
  });

  it('mixes categories', () => {
    const { content } = game.generate(rngs('2026-10-02', 'tincho'));
    expect(new Set(content.questions.slice(0, 4).map((q) => q.category)).size).toBe(4);
  });

  it('points the solution at the right answer for each presentation', () => {
    for (const user of ['a', 'b', 'c', 'd']) {
      const { content, solution } = game.generate(rngs('2026-10-03', user));
      content.questions.forEach((question, index) => {
        const original = BANK.find((q) => q.id === question.id)!;
        expect(question.options[solution.correct[index]!]).toBe(original.options[0]);
        expect([...question.options].sort()).toEqual([...original.options].sort());
      });
    }
  });

  it('shuffles the options differently for different players', () => {
    const orders = ['a', 'b', 'c', 'd', 'e'].map((user) =>
      JSON.stringify(game.generate(rngs('2026-10-03', user)).content.questions.map((q) => q.options)),
    );
    expect(new Set(orders).size).toBeGreaterThan(1);
  });
});

describe('scoring', () => {
  it('gives 200 for a fast correct answer and 100 for one at the buzzer', () => {
    expect(fiveQuestionsPoints(1_000)).toBe(200);
    expect(fiveQuestionsPoints(8_500)).toBe(150);
    expect(fiveQuestionsPoints(15_000)).toBe(100);
  });

  it('adds correct answers in time and nothing else', () => {
    const { content, solution } = game.generate(rngs('2026-10-02', 'tincho'));
    const right = (index: number) => solution.correct[index]!;
    const wrong = (index: number) => (right(index) + 1) % 4;
    const result = game.evaluate(content, solution, {
      answers: [
        { choice: right(0), elapsedMs: 1_000 },
        { choice: right(1), elapsedMs: 15_000 },
        { choice: wrong(2), elapsedMs: 5_000 },
        { choice: null, elapsedMs: 15_000 },
        { choice: right(4), elapsedMs: 17_000 },
      ],
    });
    expect(result.questions.map((q) => q.points)).toEqual([200, 100, 0, 0, 0]);
    expect(result.score).toBe(300);
    expect(result.correctCount).toBe(2);
    expect(result.flags).toEqual([]);
  });

  it('scores a perfect, fast game as 1000', () => {
    const { content, solution } = game.generate(rngs('2026-10-02', 'pato'));
    const answers = solution.correct.map((choice) => ({ choice, elapsedMs: 1_500 }));
    expect(game.evaluate(content, solution, { answers }).score).toBe(1000);
  });

  it('flags answers faster than anyone can read', () => {
    const { content, solution } = game.generate(rngs('2026-10-02', 'bot'));
    const answers = solution.correct.map((choice) => ({ choice, elapsedMs: 150 }));
    const result = game.evaluate(content, solution, { answers });
    expect(result.flags).toContainEqual(expect.objectContaining({ code: 'too-fast-answers', severity: 'high' }));
  });

  it('ignores invalid choices', () => {
    const { content, solution } = game.generate(rngs('2026-10-02', 'raro'));
    const result = game.evaluate(content, solution, {
      answers: [{ choice: 7, elapsedMs: 2_000 }, { choice: -1, elapsedMs: 2_000 }, { choice: 1.5, elapsedMs: 2_000 }],
    });
    expect(result.score).toBe(0);
  });
});
