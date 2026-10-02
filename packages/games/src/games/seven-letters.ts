import { canSpell, countLetters, normalizeWord } from '../text';
import type { Flag, GameDefinition, GameResult } from '../types';

/** "Siete Letras": find as many words as possible with seven letters in 90 seconds. */
export const SEVEN_LETTERS_RULES = {
  letterCount: 7,
  minWordLength: 3,
  durationMs: 90_000,
  /** Allowance for network delay on the last submissions. */
  lateGraceMs: 2_000,
  /** A letter set needs at least this many words to be a fair challenge. */
  minWordsPerSet: 12,
  maxGenerateAttempts: 200,
  maxSubmissions: 300,
  pointsByLength: { 3: 1, 4: 2, 5: 3, 6: 5, 7: 8 } as Readonly<Record<number, number>>,
  /** Extra points for a word that uses all seven letters. */
  fullWordBonus: 10,
  /** A perfect 1000 means reaching this share of all available points, clamped. Calibrate with beta data. */
  targetShare: 0.35,
  targetMinPoints: 20,
  targetMaxPoints: 80,
  /** Two accepted words closer than this are not humanly possible on a touch screen. */
  minSubmissionGapMs: 350,
  /** Finding more than this share of a big set in 90 s is suspicious. */
  suspiciousFoundShare: 0.8,
} as const;

export interface SevenLettersDictionary {
  /** Every playable word: normalized, 3 to 7 letters, sorted. */
  readonly words: readonly string[];
  /** Curated 7-letter words a daily set can be built from (common and family-friendly), sorted. */
  readonly baseWords: readonly string[];
}

export function createSevenLettersDictionary(
  words: Iterable<string>,
  baseWords?: Iterable<string>,
): SevenLettersDictionary {
  const { letterCount, minWordLength } = SEVEN_LETTERS_RULES;
  const playable = new Set<string>();
  for (const raw of words) {
    const word = normalizeWord(raw);
    if (word && word.length >= minWordLength && word.length <= letterCount) playable.add(word);
  }
  const bases = new Set<string>();
  for (const raw of baseWords ?? playable) {
    const word = normalizeWord(raw);
    if (word && word.length === letterCount && playable.has(word)) bases.add(word);
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

export function sevenLettersWordPoints(word: string): number {
  const { pointsByLength, letterCount, fullWordBonus } = SEVEN_LETTERS_RULES;
  const base = pointsByLength[word.length] ?? 0;
  return word.length === letterCount ? base + fullWordBonus : base;
}

function byLengthThenAlphabet(a: string, b: string): number {
  return b.length - a.length || (a < b ? -1 : a > b ? 1 : 0);
}

function plausibilityFlags(
  result: Pick<SevenLettersResult, 'accepted'>,
  solution: SevenLettersSolution,
  serverElapsedMs: number | undefined,
): Flag[] {
  const rules = SEVEN_LETTERS_RULES;
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
): GameDefinition<SevenLettersContent, SevenLettersSolution, SevenLettersLog, SevenLettersResult> {
  const rules = SEVEN_LETTERS_RULES;
  if (dictionary.baseWords.length === 0) throw new Error('The dictionary has no 7-letter base words');

  return {
    id: 'seven-letters',
    category: 'words',
    maxDurationMs: rules.durationMs + 30_000,

    // Note: content depends on the dictionary, so the server stores each day's
    // generated content instead of regenerating it after a dictionary update.
    generate({ shared }) {
      for (let attempt = 0; attempt < rules.maxGenerateAttempts; attempt++) {
        const base = shared.pick(dictionary.baseWords);
        const available = countLetters(base);
        const words = dictionary.words.filter((word) => canSpell(word, available));
        if (words.length < rules.minWordsPerSet) continue;

        words.sort(byLengthThenAlphabet);
        const fullWords = words.filter((word) => word.length === rules.letterCount);
        // Never show the letters already spelling a full word.
        let letters = shared.shuffle([...base]);
        for (let i = 0; i < 20 && fullWords.includes(letters.join('')); i++) letters = shared.shuffle(letters);

        const maxPoints = words.reduce((sum, word) => sum + sevenLettersWordPoints(word), 0);
        const targetPoints = Math.min(
          maxPoints,
          Math.max(rules.targetMinPoints, Math.min(rules.targetMaxPoints, Math.round(maxPoints * rules.targetShare))),
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
          accepted.push({ word, points: sevenLettersWordPoints(word), atMs });
        }
      }

      const points = accepted.reduce((sum, entry) => sum + entry.points, 0);
      const score =
        solution.targetPoints > 0 ? Math.round(1000 * Math.min(1, points / solution.targetPoints)) : 0;
      flags.push(...plausibilityFlags({ accepted }, solution, context.serverElapsedMs));

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
