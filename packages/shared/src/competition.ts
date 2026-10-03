import type { GameDate } from './time';

/**
 * Daily and weekly competition rules (docs/PLAN.md §4). Changing a rule is a
 * one-line edit here.
 */
export const COMPETITION_RULES = {
  maxChallengeScore: 1000,
  challengesPerDay: 3,
  /** The weekly score sums the best N days, so two days can be skipped. */
  weeklyBestDays: 5,
} as const;

export function clampChallengeScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(COMPETITION_RULES.maxChallengeScore, Math.max(0, Math.round(score)));
}

/** Total for one day: the sum of that day's challenge scores. */
export function dailyTotal(challengeScores: readonly number[]): number {
  return challengeScores
    .slice(0, COMPETITION_RULES.challengesPerDay)
    .reduce((sum, score) => sum + clampChallengeScore(score), 0);
}

/** Weekly score: the sum of the best days of the week. */
export function weeklyScore(dailyTotals: readonly number[]): number {
  return [...dailyTotals]
    .sort((a, b) => b - a)
    .slice(0, COMPETITION_RULES.weeklyBestDays)
    .reduce((sum, total) => sum + total, 0);
}

/** A finished daily challenge, as rankings see it. */
export interface ScoredChallenge {
  date: GameDate;
  score: number;
  /** Epoch ms when it was graded. */
  at: number;
}

export interface Standing {
  userId: string;
  score: number;
  /** Days with at least one finished challenge. */
  daysPlayed: number;
  bestDay: number;
  /**
   * Epoch ms when the player reached `score`: on a tie, whoever got there
   * first stays ahead. Null without points.
   */
  reachedAt: number | null;
}

/**
 * Replays the challenges in the order they were graded, so a tie can go to
 * whoever got there first. `total` turns the totals per day into the score.
 */
function standingFrom(userId: string, challenges: readonly ScoredChallenge[], total: (dailyTotals: number[]) => number): Standing {
  const byDay = new Map<GameDate, number[]>();
  let score = 0;
  let reachedAt: number | null = null;
  for (const challenge of [...challenges].sort((a, b) => a.at - b.at)) {
    const day = byDay.get(challenge.date) ?? [];
    day.push(challenge.score);
    byDay.set(challenge.date, day);
    const next = total([...byDay.values()].map(dailyTotal));
    if (next > score) {
      score = next;
      reachedAt = challenge.at;
    }
  }
  const totals = [...byDay.values()].map(dailyTotal);
  return { userId, score, daysPlayed: byDay.size, bestDay: Math.max(0, ...totals), reachedAt };
}

/** A player's week so far, from their finished challenges of that week. */
export function weeklyStanding(userId: string, challenges: readonly ScoredChallenge[]): Standing {
  return standingFrom(userId, challenges, weeklyScore);
}

/** A player's day, from their finished challenges of that day. */
export function dailyStanding(userId: string, challenges: readonly ScoredChallenge[]): Standing {
  return standingFrom(userId, challenges, (totals) => totals.reduce((sum, total) => sum + total, 0));
}

export interface RankedStanding extends Standing {
  /** 1-based position: strict order, no shared positions. */
  position: number;
}

/** Points first; on a tie, whoever reached that score first. */
function compareStandings(a: Standing, b: Standing): number {
  return (
    b.score - a.score ||
    (a.reachedAt ?? Infinity) - (b.reachedAt ?? Infinity) ||
    (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0)
  );
}

export function rankStandings(standings: readonly Standing[]): RankedStanding[] {
  return [...standings].sort(compareStandings).map((standing, index) => ({ ...standing, position: index + 1 }));
}

/**
 * Who has the crown: the leader, while the week is on and once it closes.
 * There's no minimum of days, and to take the crown you have to beat the
 * holder, not tie. Nobody has it until someone scores.
 */
export function crownHolder(standings: readonly Standing[]): RankedStanding | null {
  const leader = rankStandings(standings)[0];
  return leader && leader.score > 0 ? leader : null;
}
