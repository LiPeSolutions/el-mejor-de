import { describe, expect, it } from 'vitest';
import { crownWinner, dailyTotal, rankWeekly, weeklyScore } from './competition';

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

describe('rankWeekly', () => {
  it('orders by score, then best day, then who got there first', () => {
    const ranked = rankWeekly([
      { userId: 'tincho', dailyTotals: [2000, 2000, 2000], lastScoredAt: 100 },
      { userId: 'laflor', dailyTotals: [2500, 1500, 2000], lastScoredAt: 300 },
      { userId: 'colo', dailyTotals: [2500, 2000, 1500], lastScoredAt: 200 },
      { userId: 'pato', dailyTotals: [3000, 3000, 3000], lastScoredAt: 999 },
    ]);
    expect(ranked.map((s) => s.userId)).toEqual(['pato', 'colo', 'laflor', 'tincho']);
    expect(ranked.map((s) => s.position)).toEqual([1, 2, 3, 4]);
    expect(ranked[0]).toMatchObject({ score: 9000, bestDay: 3000, daysPlayed: 3 });
  });
});

describe('crownWinner', () => {
  it('skips players with too few days', () => {
    const winner = crownWinner([
      { userId: 'dosdias', dailyTotals: [3000, 3000], lastScoredAt: 1 },
      { userId: 'constante', dailyTotals: [1500, 1500, 1500], lastScoredAt: 2 },
    ]);
    expect(winner?.userId).toBe('constante');
  });

  it('crowns a lone eligible player', () => {
    expect(crownWinner([{ userId: 'unico', dailyTotals: [10, 10, 10], lastScoredAt: 1 }])?.userId).toBe(
      'unico',
    );
  });

  it('returns null when nobody qualifies', () => {
    expect(crownWinner([{ userId: 'nuevo', dailyTotals: [2800], lastScoredAt: 1 }])).toBeNull();
    expect(crownWinner([])).toBeNull();
  });
});
