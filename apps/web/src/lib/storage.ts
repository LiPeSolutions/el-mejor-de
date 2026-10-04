import type { GameId } from "@repo/games";
import { dailyTotal, weekStart, weeklyScore, addDays } from "@repo/shared";
import { loadAccount } from "./account";
import type { HistoryAttempt } from "./account-types";
import type { ChallengeResult } from "./challenge-types";

/**
 * What was played on this browser: each day's attempts (for the streak and the
 * week) and the practice records live in localStorage. Days are kept apart per
 * account, so a family sharing a phone doesn't mix them. Reads never throw.
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
  /** Reflexes: a record of Largada. The color-change game's ones went away with it. */
  largada?: true;
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

function keysStartingWith(prefix: string): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(prefix)) keys.push(key);
    }
  } catch {
    // ignore
  }
  return keys;
}

/** "emd:dia:2026-10-03" without an account, "emd:<account id>:dia:2026-10-03" with one. */
function dayPrefix(accountId = loadAccount()?.id): string {
  return accountId ? `emd:${accountId}:dia:` : DAY_PREFIX;
}

export function loadDay(date: string): StoredDay {
  return read<StoredDay>(dayPrefix() + date) ?? { date, attempts: {} };
}

export function saveAttempt(date: string, attempt: StoredAttempt): void {
  const day = loadDay(date);
  day.attempts[attempt.slot] = attempt;
  write(dayPrefix() + date, day);
}

export function updateAttempt(date: string, slot: number, patch: Partial<StoredAttempt>): void {
  const day = loadDay(date);
  const current = day.attempts[slot];
  if (!current) return;
  day.attempts[slot] = { ...current, ...patch };
  write(dayPrefix() + date, day);
}

/** At sign-up: what this browser played without an account becomes the new account's. */
export function adoptAnonymousDays(accountId: string): void {
  const target = dayPrefix(accountId);
  for (const key of keysStartingWith(DAY_PREFIX)) {
    const date = key.slice(DAY_PREFIX.length);
    const anonymous = read<StoredDay>(key);
    const existing = read<StoredDay>(target + date);
    write(target + date, { date, attempts: { ...anonymous?.attempts, ...existing?.attempts } } satisfies StoredDay);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

/** At sign-in: the account's attempts, from the server, fill in what this browser doesn't know. */
export function mergeAccountDays(accountId: string, attempts: readonly HistoryAttempt[]): void {
  const target = dayPrefix(accountId);
  const byDate = new Map<string, HistoryAttempt[]>();
  for (const attempt of attempts) byDate.set(attempt.date, [...(byDate.get(attempt.date) ?? []), attempt]);
  for (const [date, played] of byDate) {
    const day = read<StoredDay>(target + date) ?? { date, attempts: {} };
    for (const attempt of played) {
      const local = day.attempts[attempt.slot];
      if (local?.status === "finished" || (local && attempt.status !== "finished")) continue;
      day.attempts[attempt.slot] = {
        slot: attempt.slot,
        game: attempt.game,
        status: attempt.status,
        startedAt: attempt.startedAt,
        ...(attempt.result ? { result: attempt.result } : {}),
      };
    }
    write(target + date, day);
  }
}

export function finishedScores(day: StoredDay): number[] {
  return Object.values(day.attempts).flatMap((attempt) =>
    attempt.status === "finished" && attempt.result ? [attempt.result.score] : [],
  );
}

export function hasAnyHistory(): boolean {
  return keysStartingWith(dayPrefix()).length > 0;
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

/** Days with a finished challenge and the best day's total, from this browser's history. */
export function playedDaysSummary(): { daysPlayed: number; bestDay: number } {
  let daysPlayed = 0;
  let bestDay = 0;
  for (const key of keysStartingWith(dayPrefix())) {
    const day = read<StoredDay>(key);
    const scores = day ? finishedScores(day) : [];
    if (scores.length === 0) continue;
    daysPlayed++;
    bestDay = Math.max(bestDay, dailyTotal(scores));
  }
  return { daysPlayed, bestDay };
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
  const records = read<Partial<Record<GameId, PracticeRecord>>>(PRACTICE_KEY) ?? {};
  // Practice is Largada now: a record of the color-change game would compare different things.
  if (records.reflexes && !records.reflexes.largada) delete records.reflexes;
  return records;
}

/** Records a practice result. Returns the previous record, and whether this one beats it. */
export function savePracticeResult(date: string, result: ChallengeResult): { previous: PracticeRecord | null; isRecord: boolean } {
  const records = practiceRecords();
  const previous = records[result.game] ?? null;
  const best = practiceBest(result);
  const isRecord = !previous || result.score > previous.score;
  if (isRecord) {
    records[result.game] = { score: result.score, best, playedAt: Date.now(), ...(result.game === "reflexes" && result.version === "largada" ? { largada: true as const } : {}) };
  } else if (best !== undefined && betterBest(result.game, best, previous.best)) {
    records[result.game] = { ...previous, best };
  }
  write(PRACTICE_KEY, records);
  write(PRACTICE_COUNT_PREFIX + date, practiceCount(date) + 1);
  write(LAST_PRACTICE_PREFIX + result.game, { result, previous, isRecord }, () => window.sessionStorage);
  return { previous, isRecord };
}

/**
 * Tubitos in practice: a level solved. The record is the highest level
 * solved (the run goes on from the next one), and it counts as a game of
 * today's practice.
 */
export function savePracticeLevel(date: string, level: number): { previous: number | null; isRecord: boolean } {
  const records = practiceRecords();
  const previous = records["water-sort"]?.best ?? null;
  const isRecord = previous === null || level > previous;
  if (isRecord) records["water-sort"] = { score: level, best: level, playedAt: Date.now() };
  write(PRACTICE_KEY, records);
  write(PRACTICE_COUNT_PREFIX + date, practiceCount(date) + 1);
  return { previous, isRecord };
}

/** Where a practice Tubitos run goes on: the level after the record. */
export function nextPracticeLevel(): number {
  return (practiceRecords()["water-sort"]?.best ?? 0) + 1;
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
