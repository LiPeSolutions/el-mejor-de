import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import type { GameRngs } from '../types';
import {
  SEVEN_LETTERS_RULES,
  createSevenLetters,
  createSevenLettersDictionary,
  sevenLettersWordPoints,
} from './seven-letters';

const CAMINAR_WORDS = [
  'caminar', 'animar', 'camina', 'marina', 'marca', 'arman', 'miran', 'manía', 'cama', 'cara',
  'rima', 'cima', 'rama', 'mina', 'cana', 'crin', 'arca', 'amar', 'nací', 'cría', 'mar', 'ría', 'mía',
];
const OTHER_WORDS = ['perro', 'gato', 'libro', 'mesa', 'brújula'];

// BRÚJULA is a base word with too few sub-words, so it must never be picked.
const dictionary = createSevenLettersDictionary([...CAMINAR_WORDS, ...OTHER_WORDS], ['CAMINAR', 'BRUJULA']);
const game = createSevenLetters(dictionary);
const rngs = (seed: string): GameRngs => ({ shared: createRng(seed), player: createRng(`${seed}:p`) });

describe('createSevenLettersDictionary', () => {
  it('normalizes words and keeps only 3 to 7 letters', () => {
    const small = createSevenLettersDictionary(['Camión', 'sol', 'yo', 'mariposa', 'hola!']);
    expect(small.words).toEqual(['CAMION', 'SOL']);
    expect(small.baseWords).toEqual([]);
  });

  it('only accepts base words that are playable 7-letter words', () => {
    expect(dictionary.baseWords).toEqual(['BRUJULA', 'CAMINAR']);
  });
});

describe('generate', () => {
  it('is deterministic for a seed', () => {
    expect(game.generate(rngs('2026-10-02:1'))).toEqual(game.generate(rngs('2026-10-02:1')));
  });

  it('builds the set from a base word with enough words, without spelling it', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const { content, solution } = game.generate(rngs(seed));
      expect([...content.letters].sort()).toEqual([...'CAMINAR'].sort());
      expect(content.letters.join('')).not.toBe('CAMINAR');
      expect(solution.fullWords).toEqual(['CAMINAR']);
      expect(solution.words).toHaveLength(CAMINAR_WORDS.length);
      expect(solution.words).not.toContain('PERRO');
      expect(solution.words[0]).toBe('CAMINAR'); // longest first
    }
  });

  it('sets a reachable target', () => {
    const { solution } = game.generate(rngs('target'));
    expect(solution.targetPoints).toBeGreaterThanOrEqual(SEVEN_LETTERS_RULES.targetMinPoints);
    expect(solution.targetPoints).toBeLessThanOrEqual(solution.maxPoints);
  });

  it('fails clearly when no base word has enough words', () => {
    const poor = createSevenLetters(createSevenLettersDictionary(['brújula', 'mesa']));
    expect(() => poor.generate(rngs('x'))).toThrow('enough words');
  });
});

describe('evaluate', () => {
  const { content, solution } = game.generate(rngs('eval'));

  it('accepts valid words once and explains every rejection', () => {
    const result = game.evaluate(content, solution, {
      submissions: [
        { word: 'Camina', atMs: 3_000 },
        { word: 'animar', atMs: 6_000 },
        { word: 'ANIMAR', atMs: 9_000 },
        { word: 'perro', atMs: 12_000 },
        { word: 'mican', atMs: 15_000 },
        { word: 'ar', atMs: 18_000 },
        { word: 'mar!', atMs: 21_000 },
        { word: 'rima', atMs: 95_000 },
      ],
    });
    expect(result.accepted.map((entry) => entry.word)).toEqual(['CAMINA', 'ANIMAR']);
    expect(result.rejected.map((entry) => entry.reason)).toEqual([
      'duplicate',
      'not-in-letters',
      'invalid',
      'too-short',
      'invalid',
      'late',
    ]);
    expect(result.points).toBe(10);
    expect(result.foundFullWord).toBe(false);
    expect(result.flags).toEqual([]);
  });

  it('gives the full-word bonus', () => {
    expect(sevenLettersWordPoints('CAMINAR')).toBe(8 + SEVEN_LETTERS_RULES.fullWordBonus);
    const result = game.evaluate(content, solution, { submissions: [{ word: 'caminar', atMs: 5_000 }] });
    expect(result.foundFullWord).toBe(true);
    expect(result.points).toBe(18);
  });

  it('scales the score from 0 to 1000', () => {
    const none = game.evaluate(content, solution, { submissions: [] });
    expect(none.score).toBe(0);

    const someWords = solution.words.slice(-4).map((word, i) => ({ word, atMs: 2_000 * (i + 1) }));
    const some = game.evaluate(content, solution, { submissions: someWords });
    expect(some.score).toBeGreaterThan(0);
    expect(some.score).toBeLessThan(1000);

    const everyWord = solution.words.map((word, i) => ({ word, atMs: 1_000 * (i + 1) }));
    expect(game.evaluate(content, solution, { submissions: everyWord }).score).toBe(1000);
  });

  it('flags inhumanly fast typing', () => {
    const result = game.evaluate(content, solution, {
      submissions: ['CAMINA', 'ANIMAR', 'MARINA', 'MARCA'].map((word, i) => ({ word, atMs: 1_000 + i * 100 })),
    });
    expect(result.flags).toContainEqual(expect.objectContaining({ code: 'too-fast-input', severity: 'high' }));
  });

  it('flags a device clock that does not match the server', () => {
    const result = game.evaluate(
      content,
      solution,
      { submissions: [{ word: 'cama', atMs: 80_000 }] },
      { serverElapsedMs: 20_000 },
    );
    expect(result.flags).toContainEqual(expect.objectContaining({ code: 'clock-mismatch' }));
  });

  it('caps absurdly long logs', () => {
    const spam = Array.from({ length: 400 }, (_, i) => ({ word: 'zzz', atMs: i }));
    const result = game.evaluate(content, solution, { submissions: spam });
    expect(result.flags).toContainEqual(expect.objectContaining({ code: 'too-many-submissions' }));
    expect(result.rejected).toHaveLength(SEVEN_LETTERS_RULES.maxSubmissions);
  });
});
