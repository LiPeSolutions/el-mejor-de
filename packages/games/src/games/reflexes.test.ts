import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import type { GameRngs } from '../types';
import { REFLEXES_RULES, createReflexes, reflexesRoundPoints } from './reflexes';

const game = createReflexes();
const rngs = (user: string): GameRngs => ({ shared: createRng('day'), player: createRng(`day:${user}`) });
const hit = (reactionMs: number) => ({ reactionMs, falseStart: false });

describe('generate', () => {
  it('gives each player five random waits within range', () => {
    const { content } = game.generate(rngs('tincho'));
    expect(content.delaysMs).toHaveLength(REFLEXES_RULES.rounds);
    for (const delay of content.delaysMs) {
      expect(delay).toBeGreaterThanOrEqual(REFLEXES_RULES.minDelayMs);
      expect(delay).toBeLessThanOrEqual(REFLEXES_RULES.maxDelayMs);
    }
    expect(game.generate(rngs('tincho'))).toEqual(game.generate(rngs('tincho')));
    expect(game.generate(rngs('tincho')).content.delaysMs).not.toEqual(game.generate(rngs('laflor')).content.delaysMs);
  });
});

describe('evaluate', () => {
  const { content } = game.generate(rngs('tincho'));

  it('maps reaction times to points', () => {
    expect(reflexesRoundPoints(170)).toBe(200);
    expect(reflexesRoundPoints(243)).toBe(162);
    expect(reflexesRoundPoints(550)).toBe(0);
  });

  it('scores hits and gives nothing for false starts or misses', () => {
    const result = game.evaluate(content, null, {
      rounds: [hit(170), hit(550), hit(360), { reactionMs: null, falseStart: true }, { reactionMs: null, falseStart: false }],
    });
    expect(result.rounds.map((round) => round.outcome)).toEqual(['hit', 'hit', 'hit', 'false-start', 'miss']);
    expect(result.score).toBe(200 + 0 + 100);
    expect(result.averageMs).toBe(360);
    expect(result.flags).toEqual([]);
  });

  it('counts missing rounds as misses', () => {
    const result = game.evaluate(content, null, { rounds: [hit(250)] });
    expect(result.rounds.filter((round) => round.outcome === 'miss')).toHaveLength(4);
  });

  it('voids and flags impossible reactions', () => {
    const result = game.evaluate(content, null, { rounds: [hit(80), hit(250), hit(260), hit(270), hit(280)] });
    expect(result.rounds[0]).toMatchObject({ outcome: 'impossible', points: 0 });
    expect(result.flags).toContainEqual(expect.objectContaining({ code: 'impossible-reaction', severity: 'high' }));
  });

  it('flags robot-like consistency', () => {
    const result = game.evaluate(content, null, { rounds: [hit(200), hit(201), hit(202), hit(203), hit(204)] });
    expect(result.flags).toContainEqual(expect.objectContaining({ code: 'too-consistent' }));
  });

  it('flags attempts that finished faster than the waits allow', () => {
    const result = game.evaluate(
      content,
      null,
      { rounds: [hit(250), hit(250), hit(250), hit(250), hit(260)] },
      { serverElapsedMs: 2_000 },
    );
    expect(result.flags).toContainEqual(expect.objectContaining({ code: 'clock-mismatch' }));
  });
});
