/**
 * Daily and weekly competition rules. Values marked "(propuesta)" in
 * docs/PLAN.md live here, so changing a rule is a one-line edit.
 */
export const COMPETITION_RULES = {
  maxChallengeScore: 1000,
  challengesPerDay: 3,
  /** The weekly score sums the best N days, so two days can be skipped. */
  weeklyBestDays: 5,
  /** Minimum days played in the week to win a crown. */
  crownMinDaysPlayed: 3,
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

export interface WeeklyStanding {
  userId: string;
  /** One total per day played this week. */
  dailyTotals: readonly number[];
  /** Epoch ms when the player's last scored challenge finished. Earlier wins ties. */
  lastScoredAt: number;
}

export interface RankedStanding extends WeeklyStanding {
  /** 1-based position after tie-breaks (strict order, no shared positions). */
  position: number;
  score: number;
  bestDay: number;
  daysPlayed: number;
  crownEligible: boolean;
}

/** Tie-breaks: weekly score, then best single day, then who got there first. */
function compareStandings(
  a: Omit<RankedStanding, 'position'>,
  b: Omit<RankedStanding, 'position'>,
): number {
  return (
    b.score - a.score ||
    b.bestDay - a.bestDay ||
    a.lastScoredAt - b.lastScoredAt ||
    (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0)
  );
}

export function rankWeekly(standings: readonly WeeklyStanding[]): RankedStanding[] {
  return standings
    .map((standing) => ({
      ...standing,
      score: weeklyScore(standing.dailyTotals),
      bestDay: Math.max(0, ...standing.dailyTotals),
      daysPlayed: standing.dailyTotals.length,
      crownEligible: standing.dailyTotals.length >= COMPETITION_RULES.crownMinDaysPlayed,
    }))
    .sort(compareStandings)
    .map((standing, index) => ({ ...standing, position: index + 1 }));
}

/**
 * The crown goes to the best eligible player. Callers pass only standings
 * whose location is verified for the place being crowned.
 */
export function crownWinner(standings: readonly WeeklyStanding[]): RankedStanding | null {
  return rankWeekly(standings).find((s) => s.crownEligible && s.score > 0) ?? null;
}
