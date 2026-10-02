import {
  FIVE_QUESTIONS_RULES,
  SEVEN_LETTERS_RULES,
  canSpell,
  countLetters,
  createFiveQuestions,
  createRng,
  createSevenLetters,
  normalizeWord,
  validateTriviaBank,
} from '@repo/games';
import { describe, expect, it } from 'vitest';
import { BASE_WORDS, TRIVIA_QUESTIONS, getSevenLettersDictionary, isBlockedWord } from './index';

const rngs = (seed: string) => ({ shared: createRng(seed), player: createRng(`${seed}:p`) });

describe('Siete Letras dictionary', () => {
  const dictionary = getSevenLettersDictionary();

  it('is large and only has 3 to 7 normalized letters', () => {
    expect(dictionary.words.length).toBeGreaterThan(50_000);
    for (const word of dictionary.words.slice(0, 2000)) {
      expect(word).toMatch(/^[A-ZÑ]{3,7}$/);
    }
  });

  it('keeps everyday and local words', () => {
    const words = new Set(dictionary.words);
    for (const word of ['CAMINAR', 'LABURO', 'BIROME', 'PIBE', 'MATE', 'CAMION', 'ÑANDU']) {
      expect(words.has(word), word).toBe(true);
    }
  });

  it('leaves out vulgar words, so nobody scores with them', () => {
    const words = new Set(dictionary.words);
    for (const word of ['PUTA', 'BOLUDO', 'MIERDA', 'CONCHA', 'PIJA', 'GARCHA']) {
      expect(isBlockedWord(word)).toBe(true);
      expect(words.has(word), word).toBe(false);
    }
  });

  it('accepts every curated base word, each with enough shorter words', () => {
    const words = dictionary.words;
    const tooFew: string[] = [];
    for (const raw of BASE_WORDS) {
      const base = normalizeWord(raw);
      expect(base, raw).not.toBeNull();
      expect(base!.length, raw).toBe(SEVEN_LETTERS_RULES.letterCount);
      expect(dictionary.baseWords, raw).toContain(base);
      const letters = countLetters(base!);
      const count = words.filter((word) => canSpell(word, letters)).length;
      if (count < SEVEN_LETTERS_RULES.minWordsPerSet) tooFew.push(`${raw} (${count})`);
    }
    expect(tooFew).toEqual([]);
  });

  it('builds daily letter sets', () => {
    const game = createSevenLetters(dictionary);
    for (const day of ['2026-10-02', '2026-10-03', '2026-10-04']) {
      const { content, solution } = game.generate(rngs(day));
      expect(content.letters).toHaveLength(7);
      expect(solution.fullWords.length).toBeGreaterThan(0);
      expect(solution.words.length).toBeGreaterThanOrEqual(SEVEN_LETTERS_RULES.minWordsPerSet);
    }
  });
});

describe('trivia bank', () => {
  it('passes validation', () => {
    expect(() => validateTriviaBank(TRIVIA_QUESTIONS)).not.toThrow();
  });

  it('has plenty of questions for every difficulty of the daily plan', () => {
    const needed = new Map<number, number>();
    for (const difficulty of FIVE_QUESTIONS_RULES.difficultyPlan) {
      needed.set(difficulty, (needed.get(difficulty) ?? 0) + 1);
    }
    for (const [difficulty, perDay] of needed) {
      const available = TRIVIA_QUESTIONS.filter((question) => question.difficulty === difficulty).length;
      expect(available, `difficulty ${difficulty}`).toBeGreaterThanOrEqual(perDay * 8);
    }
  });

  it('builds daily sets', () => {
    const game = createFiveQuestions(TRIVIA_QUESTIONS);
    const { content } = game.generate(rngs('2026-10-02'));
    expect(content.questions.map((question) => question.difficulty)).toEqual([1, 1, 2, 2, 3]);
  });
});
