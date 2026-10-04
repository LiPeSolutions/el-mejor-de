import { canSpell, countLetters, letterMask, normalizeWord } from '../text';
import type { Flag, GameDefinition, GameResult } from '../types';

/**
 * The letters game: find as many words as possible with the day's letters in
 * 90 seconds. It started as "Siete Letras" (7 letters) and became "Diez
 * Letras" (10 letters, fixed points) on 4/10/2026; the id stays "seven-letters".
 */
export interface LetterGameRules {
  letterCount: number;
  minWordLength: number;
  durationMs: number;
  /** Allowance for network delay on the last submissions. */
  lateGraceMs: number;
  /** A letter set needs at least this many words to be a fair challenge. */
  minWordsPerSet: number;
  maxGenerateAttempts: number;
  maxSubmissions: number;
  /** Points per word length; longer words get the longest length's points. */
  pointsByLength: Readonly<Record<number, number>>;
  /** Extra points for a word that uses every letter. */
  fullWordBonus: number;
  /**
   * What a perfect 1000 takes: a share of the set's points (clamped), or a
   * fixed number of points, so each word adds its own points to the score.
   */
  target:
    | { kind: 'share'; share: number; minPoints: number; maxPoints: number }
    | { kind: 'fixed'; points: number };
  /** Two accepted words closer than this are not humanly possible on a touch screen. */
  minSubmissionGapMs: number;
  /** Finding more than this share of a big set in 90 s is suspicious. */
  suspiciousFoundShare: number;
}

/** "Siete Letras", until 3/10/2026: seven letters, scored against a share of the day's points. */
export const SEVEN_LETTERS_RULES: LetterGameRules = {
  letterCount: 7,
  minWordLength: 3,
  durationMs: 90_000,
  lateGraceMs: 2_000,
  // 7 since the dictionary has only known words (4/10/2026): every base word still has that many, so past days keep their letters.
  minWordsPerSet: 7,
  maxGenerateAttempts: 200,
  maxSubmissions: 300,
  pointsByLength: { 3: 1, 4: 2, 5: 3, 6: 5, 7: 8 },
  fullWordBonus: 10,
  target: { kind: 'share', share: 0.35, minPoints: 20, maxPoints: 80 },
  minSubmissionGapMs: 350,
  suspiciousFoundShare: 0.8,
};

/** "Diez Letras", from 4/10/2026: ten letters and fixed points per word (docs/PLAN.md §7). Calibrate with beta data. */
export const TEN_LETTERS_RULES: LetterGameRules = {
  ...SEVEN_LETTERS_RULES,
  letterCount: 10,
  minWordsPerSet: 40,
  pointsByLength: { 3: 25, 4: 50, 5: 80, 6: 120, 7: 160, 8: 220 },
  fullWordBonus: 300,
  target: { kind: 'fixed', points: 1000 },
};

/** The dictionary keeps words up to this length. */
export const MAX_WORD_LENGTH = 10;

export interface SevenLettersDictionary {
  /** Every playable word: normalized, 3 to 10 letters, sorted. */
  readonly words: readonly string[];
  /** Curated words a daily set can be built from (common and family-friendly), sorted. Their length is the set's. */
  readonly baseWords: readonly string[];
}

export function createSevenLettersDictionary(
  words: Iterable<string>,
  baseWords?: Iterable<string>,
): SevenLettersDictionary {
  const { minWordLength } = SEVEN_LETTERS_RULES;
  const playable = new Set<string>();
  for (const raw of words) {
    const word = normalizeWord(raw);
    if (word && word.length >= minWordLength && word.length <= MAX_WORD_LENGTH) playable.add(word);
  }
  // Each game version builds its sets from the base words of its own length.
  const bases = new Set<string>();
  for (const raw of baseWords ?? playable) {
    const word = normalizeWord(raw);
    if (word && playable.has(word)) bases.add(word);
  }
  return { words: [...playable].sort(), baseWords: [...bases].sort() };
}

export interface SevenLettersContent {
  letters: string[];
  durationMs: number;
  minWordLength: number;
}

export interface SevenLettersSolution {
  /** Every valid word, longest first. */
  words: string[];
  /** Words that use all seven letters. */
  fullWords: string[];
  maxPoints: number;
  /** Points worth a perfect 1000. */
  targetPoints: number;
}

export interface SevenLettersLog {
  submissions: Array<{ word: string; atMs: number }>;
}

export type SevenLettersRejection = 'invalid' | 'too-short' | 'duplicate' | 'not-in-letters' | 'late';

export interface SevenLettersResult extends GameResult {
  accepted: Array<{ word: string; points: number; atMs: number }>;
  rejected: Array<{ word: string; reason: SevenLettersRejection; atMs: number }>;
  points: number;
  foundFullWord: boolean;
}

export function sevenLettersWordPoints(word: string, rules: LetterGameRules = TEN_LETTERS_RULES): number {
  const longest = Math.max(...Object.keys(rules.pointsByLength).map(Number));
  const base = rules.pointsByLength[Math.min(word.length, longest)] ?? 0;
  return word.length === rules.letterCount ? base + rules.fullWordBonus : base;
}

/** Score for points so far; the UI uses it for the running score and each word's "+N". */
export function sevenLettersScore(points: number, targetPoints: number): number {
  return targetPoints > 0 ? Math.round(1000 * Math.min(1, points / targetPoints)) : 0;
}

// Each dictionary word's letter mask, computed once per dictionary (the list is large).
const masksByDictionary = new WeakMap<SevenLettersDictionary, Uint32Array>();
function wordMasks(dictionary: SevenLettersDictionary): Uint32Array {
  let masks = masksByDictionary.get(dictionary);
  if (!masks) {
    masks = Uint32Array.from(dictionary.words, letterMask);
    masksByDictionary.set(dictionary, masks);
  }
  return masks;
}

/** Every dictionary word the letters can spell, in dictionary order. */
function spellableWords(dictionary: SevenLettersDictionary, letters: string): string[] {
  const masks = wordMasks(dictionary);
  const available = countLetters(letters);
  const outside = ~letterMask(letters);
  const words: string[] = [];
  dictionary.words.forEach((word, i) => {
    if (((masks[i] ?? 0) & outside) === 0 && canSpell(word, available)) words.push(word);
  });
  return words;
}

function byLengthThenAlphabet(a: string, b: string): number {
  return b.length - a.length || (a < b ? -1 : a > b ? 1 : 0);
}

/** Every valid word of a set of letters, longest first: what `generate` keeps as the solution. */
export function sevenLettersWords(dictionary: SevenLettersDictionary, letters: readonly string[]): string[] {
  return spellableWords(dictionary, letters.join('')).sort(byLengthThenAlphabet);
}

function plausibilityFlags(
  rules: LetterGameRules,
  result: Pick<SevenLettersResult, 'accepted'>,
  solution: SevenLettersSolution,
  serverElapsedMs: number | undefined,
): Flag[] {
  const flags: Flag[] = [];

  let tooFastGaps = 0;
  for (let i = 1; i < result.accepted.length; i++) {
    const gap = (result.accepted[i]?.atMs ?? 0) - (result.accepted[i - 1]?.atMs ?? 0);
    if (gap < rules.minSubmissionGapMs) tooFastGaps++;
  }
  if (tooFastGaps > 0) {
    flags.push({
      code: 'too-fast-input',
      severity: tooFastGaps >= 2 ? 'high' : 'low',
      detail: `${tooFastGaps} words less than ${rules.minSubmissionGapMs} ms apart`,
    });
  }

  if (
    solution.words.length >= 20 &&
    result.accepted.length / solution.words.length > rules.suspiciousFoundShare
  ) {
    flags.push({ code: 'near-complete', severity: 'high' });
  }

  const lastAtMs = result.accepted.at(-1)?.atMs;
  if (serverElapsedMs !== undefined && lastAtMs !== undefined && lastAtMs > serverElapsedMs + rules.lateGraceMs) {
    flags.push({ code: 'clock-mismatch', severity: 'high', detail: `last word at ${lastAtMs} ms, server saw ${serverElapsedMs} ms` });
  }
  return flags;
}

export function createSevenLetters(
  dictionary: SevenLettersDictionary,
  rules: LetterGameRules = TEN_LETTERS_RULES,
): GameDefinition<SevenLettersContent, SevenLettersSolution, SevenLettersLog, SevenLettersResult> {
  const bases = dictionary.baseWords.filter((word) => word.length === rules.letterCount);
  if (bases.length === 0) throw new Error(`The dictionary has no ${rules.letterCount}-letter base words`);

  return {
    id: 'seven-letters',
    category: 'words',
    maxDurationMs: rules.durationMs + 30_000,

    // The server regenerates each day's content from its seed and the
    // dictionary, so a new dictionary must keep every base word with at least
    // minWordsPerSet words, or that day's letters change (the content tests check it).
    generate({ shared }) {
      for (let attempt = 0; attempt < rules.maxGenerateAttempts; attempt++) {
        const base = shared.pick(bases);
        const words = spellableWords(dictionary, base);
        if (words.length < rules.minWordsPerSet) continue;

        words.sort(byLengthThenAlphabet);
        const fullWords = words.filter((word) => word.length === rules.letterCount);
        // Never show the letters already spelling a full word.
        let letters = shared.shuffle([...base]);
        for (let i = 0; i < 20 && fullWords.includes(letters.join('')); i++) letters = shared.shuffle(letters);

        const maxPoints = words.reduce((sum, word) => sum + sevenLettersWordPoints(word, rules), 0);
        const { target } = rules;
        const targetPoints = Math.min(
          maxPoints,
          target.kind === 'fixed'
            ? target.points
            : Math.max(target.minPoints, Math.min(target.maxPoints, Math.round(maxPoints * target.share))),
        );
        return {
          content: { letters, durationMs: rules.durationMs, minWordLength: rules.minWordLength },
          solution: { words, fullWords, maxPoints, targetPoints },
        };
      }
      throw new Error('Could not build a letter set with enough words');
    },

    evaluate(content, solution, log, context = {}) {
      const valid = new Set(solution.words);
      const available = countLetters(content.letters.join(''));
      const deadline = content.durationMs + rules.lateGraceMs;
      const flags: Flag[] = [];

      let submissions = [...log.submissions].sort((a, b) => a.atMs - b.atMs);
      if (submissions.length > rules.maxSubmissions) {
        flags.push({ code: 'too-many-submissions', severity: 'high', detail: String(submissions.length) });
        submissions = submissions.slice(0, rules.maxSubmissions);
      }

      const accepted: SevenLettersResult['accepted'] = [];
      const rejected: SevenLettersResult['rejected'] = [];
      const seen = new Set<string>();
      for (const { word: raw, atMs } of submissions) {
        const word = typeof raw === 'string' ? normalizeWord(raw) : null;
        const reject = (reason: SevenLettersRejection) =>
          rejected.push({ word: word ?? String(raw).slice(0, 20), reason, atMs });

        if (!Number.isFinite(atMs) || atMs < 0 || atMs > deadline) reject('late');
        else if (!word) reject('invalid');
        else if (word.length < content.minWordLength) reject('too-short');
        else if (seen.has(word)) reject('duplicate');
        else if (!canSpell(word, available)) reject('not-in-letters');
        else if (!valid.has(word)) reject('invalid');
        else {
          seen.add(word);
          accepted.push({ word, points: sevenLettersWordPoints(word, rules), atMs });
        }
      }

      const points = accepted.reduce((sum, entry) => sum + entry.points, 0);
      const score = sevenLettersScore(points, solution.targetPoints);
      flags.push(...plausibilityFlags(rules, { accepted }, solution, context.serverElapsedMs));

      return {
        score,
        flags,
        accepted,
        rejected,
        points,
        foundFullWord: accepted.some((entry) => entry.word.length === rules.letterCount),
      };
    },
  };
}
