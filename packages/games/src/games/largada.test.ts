import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import type { GameRngs } from '../types';
import { LARGADA_RULES, createLargada, largadaScore } from './largada';

const game = createLargada();
const rngs = (user: string): GameRngs => ({ shared: createRng('day'), player: createRng(`day:${user}`) });
const hit = (reactionMs: number) => ({ reactionMs, falseStart: false });
const jumped = { reactionMs: null, falseStart: true };
const missed = { reactionMs: null, falseStart: false };

describe('generate', () => {
  it('gives each player three waits of their own after the five lights', () => {
    const { content } = game.generate(rngs('tincho'));
    expect(content).toMatchObject({ version: 'largada', lights: 5, lightMs: 1000, maxReactionMs: 1500 });
    expect(content.delaysMs).toHaveLength(3);
    for (const delay of content.delaysMs) {
      expect(delay).toBeGreaterThanOrEqual(LARGADA_RULES.minDelayMs);
      expect(delay).toBeLessThanOrEqual(LARGADA_RULES.maxDelayMs);
    }
    expect(game.generate(rngs('tincho'))).toEqual(game.generate(rngs('tincho')));
    expect(game.generate(rngs('tincho')).content.delaysMs).not.toEqual(game.generate(rngs('juli')).content.delaysMs);
  });
});

describe('evaluate', () => {
  const { content } = game.generate(rngs('tincho'));

  it('scores the average: 1.000 at 200 ms, 920 at 240 and 0 from 700', () => {
    expect(largadaScore(150)).toBe(1000);
    expect(largadaScore(200)).toBe(1000);
    expect(largadaScore(240)).toBe(920);
    expect(largadaScore(700)).toBe(0);
    expect(largadaScore(900)).toBe(0);
    const result = game.evaluate(content, null, { rounds: [hit(231), hit(238), hit(251)] });
    expect(result).toMatchObject({ averageMs: 240, bestMs: 231, score: 920, flags: [] });
  });

  it('counts a jumped start as 450 ms and a missed one as 700', () => {
    const result = game.evaluate(content, null, { rounds: [hit(250), jumped, missed] });
    expect(result.rounds.map((round) => [round.outcome, round.countedMs])).toEqual([
      ['hit', 250],
      ['false-start', 450],
      ['miss', 700],
    ]);
    expect(result.averageMs).toBe(467);
    expect(result.score).toBe(466);
    expect(result.bestMs).toBe(250);
  });

  it('loses a start slower than the limit, and counts missing starts as missed', () => {
    const result = game.evaluate(content, null, { rounds: [hit(1600)] });
    expect(result.rounds.map((round) => round.outcome)).toEqual(['miss', 'miss', 'miss']);
    expect(result).toMatchObject({ averageMs: 700, score: 0, bestMs: null });
  });

  it('takes impossible reactions as jumped starts and flags them', () => {
    const result = game.evaluate(content, null, { rounds: [hit(60), hit(250), hit(260)] });
    expect(result.rounds[0]).toMatchObject({ outcome: 'impossible', countedMs: 450 });
    expect(result.flags).toContainEqual(expect.objectContaining({ code: 'impossible-reaction', severity: 'high' }));
  });

  it('flags robot-like consistency', () => {
    const result = game.evaluate(content, null, { rounds: [hit(201), hit(202), hit(203)] });
    expect(result.flags).toContainEqual(expect.objectContaining({ code: 'too-consistent' }));
    expect(game.evaluate(content, null, { rounds: [hit(201), hit(214), hit(236)] }).flags).toEqual([]);
  });

  it('flags attempts that finished before the lights could go out', () => {
    const result = game.evaluate(content, null, { rounds: [hit(250), hit(250), hit(260)] }, { serverElapsedMs: 4_000 });
    expect(result.flags).toContainEqual(expect.objectContaining({ code: 'clock-mismatch' }));
    const slow = 3 * (5_000 + LARGADA_RULES.maxDelayMs + 300);
    expect(game.evaluate(content, null, { rounds: [hit(250), hit(250), hit(260)] }, { serverElapsedMs: slow }).flags).toEqual([]);
    // The quickest an honest player gets there: the lights, each wait and each reaction, nothing in between.
    const honest = [250, 250, 260].reduce((sum, ms, i) => sum + 4 * 1_000 + content.delaysMs[i]! + ms, 0);
    expect(game.evaluate(content, null, { rounds: [hit(250), hit(250), hit(260)] }, { serverElapsedMs: honest }).flags).toEqual([]);
  });
});
