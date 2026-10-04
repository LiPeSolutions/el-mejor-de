import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import type { GameRngs } from '../types';
import {
  SEVEN_LETTERS_RULES,
  TEN_LETTERS_RULES,
  createSevenLetters,
  createSevenLettersDictionary,
  sevenLettersScore,
  sevenLettersWordPoints,
  sevenLettersWords,
} from './seven-letters';

const CAMINAR_WORDS = [
  'caminar', 'animar', 'camina', 'marina', 'marca', 'arman', 'miran', 'manía', 'cama', 'cara',
  'rima', 'cima', 'rama', 'mina', 'cana', 'crin', 'arca', 'amar', 'nací', 'cría', 'mar', 'ría', 'mía',
];
const OTHER_WORDS = ['perro', 'gato', 'libro', 'mesa', 'brújula'];

// BRÚJULA is a base word with too few sub-words, so it must never be picked.
const dictionary = createSevenLettersDictionary([...CAMINAR_WORDS, ...OTHER_WORDS], ['CAMINAR', 'BRUJULA']);
// The tests below the "Diez Letras" block cover the 7-letter rules, which old days keep.
const game = createSevenLetters(dictionary, SEVEN_LETTERS_RULES);
const rngs = (seed: string): GameRngs => ({ shared: createRng(seed), player: createRng(`${seed}:p`) });

describe('createSevenLettersDictionary', () => {
  it('normalizes words and keeps only 3 to 10 letters', () => {
    const small = createSevenLettersDictionary(['Camión', 'sol', 'yo', 'mariposa', 'hola!', 'Cumpleaños', 'computadora'], []);
    expect(small.words).toEqual(['CAMION', 'CUMPLEAÑOS', 'MARIPOSA', 'SOL']);
    expect(small.baseWords).toEqual([]);
  });

  it('only accepts base words that are playable', () => {
    expect(dictionary.baseWords).toEqual(['BRUJULA', 'CAMINAR']);
    expect(createSevenLettersDictionary(['sol'], ['luna', 'sol']).baseWords).toEqual(['SOL']);
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
    expect(SEVEN_LETTERS_RULES.target).toMatchObject({ kind: 'share', minPoints: 20 });
    expect(solution.targetPoints).toBeGreaterThanOrEqual(20);
    expect(solution.targetPoints).toBeLessThanOrEqual(solution.maxPoints);
  });

  it('fails clearly when no base word has enough words', () => {
    const poor = createSevenLetters(createSevenLettersDictionary(['brújula', 'mesa']), SEVEN_LETTERS_RULES);
    expect(() => poor.generate(rngs('x'))).toThrow('enough words');
  });

  it('finds the same words again from the letters alone', () => {
    const { content, solution } = game.generate(rngs('again'));
    expect(sevenLettersWords(dictionary, content.letters)).toEqual(solution.words);
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
    expect(sevenLettersWordPoints('CAMINAR', SEVEN_LETTERS_RULES)).toBe(8 + SEVEN_LETTERS_RULES.fullWordBonus);
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

describe('Diez Letras (from 4/10/2026)', () => {
  const CAMINANTES_WORDS = [
    'caminantes', 'caminante', 'caminaste', 'cantimena', 'animaste', 'caminase', 'mantecas', 'mineras',
    'camina', 'animar', 'santa', 'manta', 'mesa', 'cama', 'mente', 'antes', 'tina', 'misa', 'mar', 'sin',
  ];
  const tenLetters = createSevenLettersDictionary([...CAMINANTES_WORDS, ...CAMINAR_WORDS], ['CAMINANTES', 'CAMINAR']);
  // Few words in this small test dictionary: ask for less than the real minimum.
  const rules = { ...TEN_LETTERS_RULES, minWordsPerSet: 5 };
  const diez = createSevenLetters(tenLetters, rules);
  const { content, solution } = diez.generate(rngs('diez'));

  it('builds the set from a 10-letter base word', () => {
    expect([...content.letters].sort()).toEqual([...'CAMINANTES'].sort());
    expect(content.letters.join('')).not.toBe('CAMINANTES');
    expect(solution.fullWords).toEqual(['CAMINANTES']);
    expect(solution.words).not.toContain('MINERAS'); // there is one R... and no R in CAMINANTES
  });

  it('gives fixed points by length, with a bonus for the word that uses all ten', () => {
    expect(['MAR', 'CAMA', 'SANTA', 'CAMINA', 'MINERAS', 'MANTECAS', 'CAMINANTE'].map((word) => sevenLettersWordPoints(word, rules))).toEqual([
      25, 50, 80, 120, 160, 220, 220,
    ]);
    expect(sevenLettersWordPoints('CAMINANTES', rules)).toBe(220 + 300);
  });

  it('adds each word to the score, up to 1000', () => {
    expect(solution.targetPoints).toBe(Math.min(1000, solution.maxPoints));
    const result = diez.evaluate(content, solution, {
      submissions: [
        { word: 'cama', atMs: 2_000 },
        { word: 'santa', atMs: 4_000 },
        { word: 'caminantes', atMs: 9_000 },
      ],
    });
    expect(result.points).toBe(50 + 80 + 520);
    expect(result.score).toBe(650);
    expect(result.foundFullWord).toBe(true);
    expect(sevenLettersScore(1_400, 1000)).toBe(1000);
  });

  it('keeps the 7-letter rules for old days', () => {
    expect(() => createSevenLetters(createSevenLettersDictionary(CAMINAR_WORDS, ['CAMINAR']), TEN_LETTERS_RULES)).toThrow(
      'no 10-letter base words',
    );
    expect(game.generate(rngs('old')).content.letters).toHaveLength(7);
  });
});
