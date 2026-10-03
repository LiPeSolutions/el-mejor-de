import { describe, expect, it } from 'vitest';
import { createFiveQuestions, type TriviaQuestion } from './games/five-questions';
import { createReflexes } from './games/reflexes';
import { SEVEN_LETTERS_RULES, createSevenLetters, createSevenLettersDictionary } from './games/seven-letters';
import { practiceRngs } from './index';
import { dailyRngs, deriveSeed } from './server';

const SECRET = 'test-secret-that-is-long-enough-for-hmac';

describe('deriveSeed', () => {
  it('is deterministic and depends on every part', () => {
    expect(deriveSeed(SECRET, 'daily', '2026-10-02', '1')).toBe(deriveSeed(SECRET, 'daily', '2026-10-02', '1'));
    expect(deriveSeed(SECRET, 'daily', '2026-10-02', '1')).not.toBe(deriveSeed(SECRET, 'daily', '2026-10-02', '2'));
    expect(deriveSeed(SECRET, 'a|b', 'c')).not.toBe(deriveSeed(SECRET, 'a', 'b|c'));
  });

  it('changes completely with another secret', () => {
    expect(deriveSeed(SECRET, 'x')).not.toBe(deriveSeed(`${SECRET}!`, 'x'));
  });

  it('refuses short secrets', () => {
    expect(() => deriveSeed('corto', 'x')).toThrow('at least 32');
  });
});

describe('daily attempts', () => {
  const dictionary = createSevenLettersDictionary(
    ['caminar', 'animar', 'camina', 'marina', 'marca', 'arman', 'miran', 'cama', 'cara', 'rima', 'cima', 'rama', 'mina'],
  );
  const bank: TriviaQuestion[] = Array.from({ length: 12 }, (_, i) => ({
    id: `q${i}`,
    category: (['football', 'history', 'science', 'geography'] as const)[i % 4]!,
    difficulty: ((i % 3) + 1) as 1 | 2 | 3,
    prompt: `Pregunta ${i}`,
    options: [`ok ${i}`, `no ${i}a`, `no ${i}b`, `no ${i}c`],
  }));

  it('shares the content of the day and varies only what is per player', () => {
    const tincho = (slot: number) => dailyRngs(SECRET, '2026-10-02', slot, 'tincho');
    const laflor = (slot: number) => dailyRngs(SECRET, '2026-10-02', slot, 'laflor');

    const sevenLetters = createSevenLetters(dictionary, SEVEN_LETTERS_RULES);
    expect(sevenLetters.generate(tincho(1)).content).toEqual(sevenLetters.generate(laflor(1)).content);

    const fiveQuestions = createFiveQuestions(bank);
    const ids = (rngs: ReturnType<typeof tincho>) =>
      fiveQuestions.generate(rngs).content.questions.map((q) => q.id).sort();
    expect(ids(tincho(2))).toEqual(ids(laflor(2)));

    const reflexes = createReflexes();
    expect(reflexes.generate(tincho(3)).content).not.toEqual(reflexes.generate(laflor(3)).content);
  });

  it('changes from one day to the next', () => {
    const fiveQuestions = createFiveQuestions(bank);
    const day = (date: string) =>
      fiveQuestions.generate(dailyRngs(SECRET, date, 2, 'tincho')).content.questions.map((q) => q.id);
    const days = ['2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'].map((date) => day(date).join());
    expect(new Set(days).size).toBeGreaterThan(1);
  });
});

describe('practiceRngs', () => {
  it('is random by default and repeatable with a seed', () => {
    expect(practiceRngs().shared.next()).not.toBe(practiceRngs().shared.next());
    expect(practiceRngs('fixed').player.next()).toBe(practiceRngs('fixed').player.next());
  });
});
