import { describe, expect, it } from 'vitest';
import { crownHolder, dailyStanding, dailyTotal, rankStandings, weeklyScore, weeklyStanding, type ScoredChallenge } from './competition';

describe('dailyTotal', () => {
  it('adds the three challenge scores', () => {
    expect(dailyTotal([860, 900, 880])).toBe(2640);
  });

  it('clamps each score to 0–1000 and ignores extra scores', () => {
    expect(dailyTotal([1200, -5, Number.NaN])).toBe(1000);
    expect(dailyTotal([1000, 1000, 1000, 1000])).toBe(3000);
  });
});

describe('weeklyScore', () => {
  it('sums the best five days', () => {
    expect(weeklyScore([100, 2000, 300, 2500, 1500, 2900, 50])).toBe(2900 + 2500 + 2000 + 1500 + 300);
  });

  it('sums every day when fewer than five were played', () => {
    expect(weeklyScore([2000, 1000])).toBe(3000);
    expect(weeklyScore([])).toBe(0);
  });
});

/**
 * One day per total, from Monday 5/10/2026 on. Each total is split into
 * challenges of up to 1.000, and day i is graded at `at + i`.
 */
function days(totals: number[], at = 1000): ScoredChallenge[] {
  return totals.flatMap((total, i) => {
    const date = `2026-10-${String(5 + i).padStart(2, '0')}`;
    const scores = [Math.min(total, 1000), Math.min(Math.max(total - 1000, 0), 1000), Math.max(total - 2000, 0)];
    return scores.slice(0, total > 2000 ? 3 : total > 1000 ? 2 : 1).map((score, k) => ({ date, score, at: at + i + k / 10 }));
  });
}

describe('weeklyStanding', () => {
  it('sums the best five days and remembers when it got there', () => {
    const standing = weeklyStanding('tincho', days([900, 800, 700, 600, 500, 400, 950]));
    expect(standing).toMatchObject({ score: 950 + 900 + 800 + 700 + 600, daysPlayed: 7, bestDay: 950, reachedAt: 1006 });
    expect(weeklyStanding('colo', days([2900, 2500]))).toMatchObject({ score: 5400, daysPlayed: 2, bestDay: 2900, reachedAt: 1001.2 });
  });

  it("doesn't move the time when a day doesn't improve the week", () => {
    // The sixth day (100) is below the five counted, so the score stays the same.
    const standing = weeklyStanding('tincho', days([900, 800, 700, 600, 500, 100]));
    expect(standing).toMatchObject({ score: 3500, daysPlayed: 6, reachedAt: 1004 });
  });

  it('adds up the challenges of one day', () => {
    const standing = weeklyStanding('tincho', [
      { date: '2026-10-05', score: 500, at: 10 },
      { date: '2026-10-05', score: 0, at: 20 },
      { date: '2026-10-05', score: 300, at: 30 },
    ]);
    expect(standing).toMatchObject({ score: 800, daysPlayed: 1, bestDay: 800, reachedAt: 30 });
  });

  it('has no time without points', () => {
    expect(weeklyStanding('nuevo', [])).toMatchObject({ score: 0, daysPlayed: 0, reachedAt: null });
    expect(weeklyStanding('cero', days([0]))).toMatchObject({ score: 0, daysPlayed: 1, reachedAt: null });
  });
});

describe('dailyStanding', () => {
  it("is the day's total", () => {
    const standing = dailyStanding('tincho', [
      { date: '2026-10-05', score: 700, at: 10 },
      { date: '2026-10-05', score: 900, at: 20 },
    ]);
    expect(standing).toMatchObject({ score: 1600, daysPlayed: 1, reachedAt: 20 });
  });
});

describe('rankStandings and crownHolder', () => {
  it('orders by points, then by who reached them first', () => {
    const ranked = rankStandings([
      weeklyStanding('tincho', days([2000, 2000], 100)),
      weeklyStanding('laflor', days([3000, 1000], 50)),
      weeklyStanding('pato', days([3000, 3000], 999)),
      weeklyStanding('nadie', []),
    ]);
    expect(ranked.map((s) => s.userId)).toEqual(['pato', 'laflor', 'tincho', 'nadie']);
    expect(ranked.map((s) => s.position)).toEqual([1, 2, 3, 4]);
  });

  it('passes the crown to whoever has more points', () => {
    // Wednesday: Juli leads. Thursday: Tincho passes her.
    const juli = weeklyStanding('juli', days([2500, 2500, 2500], 1000));
    expect(crownHolder([juli, weeklyStanding('tincho', days([2000, 2000, 2000], 2000))])?.userId).toBe('juli');
    expect(crownHolder([juli, weeklyStanding('tincho', days([2000, 2000, 2000, 2900], 2000))])?.userId).toBe('tincho');
  });

  it('keeps the crown on a tie: you have to beat the holder', () => {
    const holder = weeklyStanding('juli', days([2000], 100));
    const tied = weeklyStanding('tincho', days([2000], 500));
    expect(crownHolder([tied, holder])?.userId).toBe('juli');
  });

  it('crowns a lone player, with no minimum of days', () => {
    expect(crownHolder([weeklyStanding('unico', days([10]))])?.userId).toBe('unico');
  });

  it('gives no crown without points', () => {
    expect(crownHolder([weeklyStanding('cero', days([0]))])).toBeNull();
    expect(crownHolder([])).toBeNull();
  });
});
