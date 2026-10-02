import type { GameId } from "@repo/games";
import { dailyTotal, weekStart, weeklyScore, addDays } from "@repo/shared";
import type { ChallengeResult } from "./challenge-types";

/**
 * What this browser played. Until accounts exist, today's attempts, the streak,
 * the week and practice records live in localStorage. Reads never throw.
 */

export interface StoredAttempt {
  slot: number;
  game: GameId;
  status: "started" | "finished";
  token?: string;
  startedAt: number;
  /** Latest progress, so an interrupted attempt still counts what was played. */
  log?: unknown;
  result?: ChallengeResult;
}

export interface StoredDay {
  date: string;
  attempts: Record<number, StoredAttempt>;
}

export interface PracticeRecord {
  score: number;
  /** Extra stat shown on the practice tile: best average ms, highest level… */
  best?: number;
  playedAt: number;
}

const DAY_PREFIX = "emd:dia:";
const PRACTICE_KEY = "emd:practica";
const PRACTICE_COUNT_PREFIX = "emd:practica-hoy:";
const LAST_PRACTICE_PREFIX = "emd:practica-ultima:";

function read<T>(key: string, storage: () => Storage = () => window.localStorage): T | null {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown, storage: () => Storage = () => window.localStorage): void {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode): the game still works, it just won't remember.
  }
}

export function loadDay(date: string): StoredDay {
  return read<StoredDay>(DAY_PREFIX + date) ?? { date, attempts: {} };
}

export function saveAttempt(date: string, attempt: StoredAttempt): void {
  const day = loadDay(date);
  day.attempts[attempt.slot] = attempt;
  write(DAY_PREFIX + date, day);
}

export function updateAttempt(date: string, slot: number, patch: Partial<StoredAttempt>): void {
  const day = loadDay(date);
  const current = day.attempts[slot];
  if (!current) return;
  day.attempts[slot] = { ...current, ...patch };
  write(DAY_PREFIX + date, day);
}

export function finishedScores(day: StoredDay): number[] {
  return Object.values(day.attempts).flatMap((attempt) =>
    attempt.status === "finished" && attempt.result ? [attempt.result.score] : [],
  );
}

export function hasAnyHistory(): boolean {
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      if (window.localStorage.key(i)?.startsWith(DAY_PREFIX)) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/** Days in a row (ending today, or yesterday if today is still open) with at least one finished challenge. */
export function currentStreak(today: string): number {
  const played = (date: string) => finishedScores(loadDay(date)).length > 0;
  let date = played(today) ? today : addDays(today, -1);
  let streak = 0;
  while (played(date) && streak < 1000) {
    streak++;
    date = addDays(date, -1);
  }
  return streak;
}

/** This week's score (best 5 days) and days played, from this browser's history. */
export function weekSummary(today: string): { score: number; daysPlayed: number } {
  const start = weekStart(today);
  const totals: number[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(start, offset);
    if (date > today) break;
    const scores = finishedScores(loadDay(date));
    if (scores.length > 0) totals.push(dailyTotal(scores));
  }
  return { score: weeklyScore(totals), daysPlayed: totals.length };
}

export function practiceRecords(): Partial<Record<GameId, PracticeRecord>> {
  return read<Partial<Record<GameId, PracticeRecord>>>(PRACTICE_KEY) ?? {};
}

/** Records a practice result. Returns the previous record, and whether this one beats it. */
export function savePracticeResult(date: string, result: ChallengeResult): { previous: PracticeRecord | null; isRecord: boolean } {
  const records = practiceRecords();
  const previous = records[result.game] ?? null;
  const best = practiceBest(result);
  const isRecord = !previous || result.score > previous.score;
  if (isRecord) {
    records[result.game] = { score: result.score, best, playedAt: Date.now() };
  } else if (best !== undefined && betterBest(result.game, best, previous.best)) {
    records[result.game] = { ...previous, best };
  }
  write(PRACTICE_KEY, records);
  write(PRACTICE_COUNT_PREFIX + date, practiceCount(date) + 1);
  write(LAST_PRACTICE_PREFIX + result.game, { result, previous, isRecord }, () => window.sessionStorage);
  return { previous, isRecord };
}

export function lastPracticeResult(game: GameId): { result: ChallengeResult; previous: PracticeRecord | null; isRecord: boolean } | null {
  return read(LAST_PRACTICE_PREFIX + game, () => window.sessionStorage);
}

export function practiceCount(date: string): number {
  return read<number>(PRACTICE_COUNT_PREFIX + date) ?? 0;
}

function practiceBest(result: ChallengeResult): number | undefined {
  if (result.game === "reflexes") return result.averageMs ?? undefined;
  if (result.game === "sequence") return result.levelReached;
  return undefined;
}

function betterBest(game: GameId, candidate: number, current: number | undefined): boolean {
  if (current === undefined) return true;
  return game === "reflexes" ? candidate < current : candidate > current;
}
