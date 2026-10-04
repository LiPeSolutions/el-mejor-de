import {
  FIVE_QUESTIONS_RULES,
  SEVEN_LETTERS_RULES,
  TEN_LETTERS_RULES,
  canSpell,
  countLetters,
  createFiveQuestions,
  createRng,
  createSevenLetters,
  letterMask,
  normalizeWord,
  validateTriviaBank,
  type LetterGameRules,
} from '@repo/games';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BASE_WORDS, BASE_WORDS_10, TRIVIA_QUESTIONS, getSevenLettersDictionary, isBlockedWord } from './index';

const rngs = (seed: string) => ({ shared: createRng(seed), player: createRng(`${seed}:p`) });

describe('letters dictionary (Siete Letras and Diez Letras)', () => {
  const dictionary = getSevenLettersDictionary();
  const masks = dictionary.words.map(letterMask);
  const spellable = (base: string) => {
    const letters = countLetters(base);
    const outside = ~letterMask(base);
    return dictionary.words.filter((word, i) => (masks[i]! & outside) === 0 && canSpell(word, letters)).length;
  };

  it('only has known words of 3 to 10 normalized letters', () => {
    expect(dictionary.words.length).toBeGreaterThan(100_000);
    expect(dictionary.words.length).toBeLessThan(150_000);
    for (const word of [...dictionary.words.slice(0, 1000), ...dictionary.words.slice(-1000)]) {
      expect(word).toMatch(/^[A-ZÑ]{3,10}$/);
    }
  });

  it('is exactly the known words without the blocked ones (run pnpm build:words after a change)', () => {
    const known = readFileSync(fileURLToPath(new URL('../words/known.txt', import.meta.url)), 'utf8').split('\n').filter(Boolean);
    expect(dictionary.words).toEqual(known.filter((word) => !isBlockedWord(word)));
  });

  it('keeps everyday, local and conjugated words', () => {
    const words = new Set(dictionary.words);
    for (const word of [
      'CAMINAR', 'LABURO', 'BIROME', 'PIBE', 'MATE', 'CAMION', 'ÑANDU', 'BONDI', 'CHABON', 'POCHOCLO', 'KIOSCO',
      'HORNALLA', 'CELU', 'ZAFAR', 'CHAMUYAR', 'MANTUVIERA', 'TENES', 'JUGAS', 'DECIME', 'DAME', 'HACERLO', 'PERRITOS',
      'BUENISIMO', 'LUCECITA', 'LABURADAS',
    ]) {
      expect(words.has(word), word).toBe(true);
    }
  });

  it('leaves out words nobody knows, names and vosotros forms', () => {
    const words = new Set(dictionary.words);
    for (const word of ['ADRAN', 'AES', 'ADRAR', 'EES', 'ABACIAL', 'ABADENGO', 'NADAL', 'MEDINA', 'HABEIS', 'ABRID']) {
      expect(words.has(word), word).toBe(false);
    }
  });

  it('is for all ages: neutral body, drug and violence words count, adult and vulgar ones do not', () => {
    const words = new Set(dictionary.words);
    for (const word of ['PENE', 'VAGINA', 'SEXO', 'EMBARAZO', 'DROGA', 'COCAINA', 'MARIHUANA', 'MATAR', 'GUERRA', 'ARMA']) {
      expect(isBlockedWord(word), word).toBe(false);
      expect(words.has(word), word).toBe(true);
    }
    for (const word of [
      'EROTISMO', 'PORNO', 'ORGASMO', 'PROSTITUTA', 'TETA', 'CULO', 'PUTA', 'BOLUDO', 'MIERDA', 'CONCHA', 'PIJA', 'GARCHA',
      'PORRO', 'FASO', 'FALOPA', 'MERCA', 'VIOLAR', 'VIOLACION', 'VIOLADOR',
    ]) {
      expect(isBlockedWord(word), word).toBe(true);
      expect(words.has(word), word).toBe(false);
    }
    // Their stems don't take innocent words with them.
    for (const word of ['VIOLETA', 'VIOLIN', 'VIOLENCIA', 'PUTATIVO', 'TETERA', 'FOLLAJE', 'CHINGOLO', 'MARIQUITA']) {
      expect(isBlockedWord(word), word).toBe(false);
    }
  });

  const lists: Array<[string, readonly string[], LetterGameRules]> = [
    ['7', BASE_WORDS, SEVEN_LETTERS_RULES],
    ['10', BASE_WORDS_10, TEN_LETTERS_RULES],
  ];

  it.each(lists)('accepts every curated %s-letter base word, each with enough shorter words', (_, list, rules) => {
    const tooFew: string[] = [];
    for (const raw of list) {
      const base = normalizeWord(raw);
      expect(base, raw).not.toBeNull();
      expect(base!.length, raw).toBe(rules.letterCount);
      expect(dictionary.baseWords, raw).toContain(base);
      const count = spellable(base!);
      if (count < rules.minWordsPerSet) tooFew.push(`${raw} (${count})`);
    }
    expect(tooFew).toEqual([]);
    expect(new Set(list).size, 'no repeated words').toBe(list.length);
  });

  it.each(lists)('builds daily %s-letter sets', (_, __, rules) => {
    const game = createSevenLetters(dictionary, rules);
    for (const day of ['2026-10-02', '2026-10-03', '2026-10-04']) {
      const { content, solution } = game.generate(rngs(day));
      expect(content.letters).toHaveLength(rules.letterCount);
      expect(solution.fullWords.length).toBeGreaterThan(0);
      expect(solution.words.length).toBeGreaterThanOrEqual(rules.minWordsPerSet);
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
