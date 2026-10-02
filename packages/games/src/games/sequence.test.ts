import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import type { GameRngs } from '../types';
import { SEQUENCE_RULES, createSequence, sequenceLengthForLevel, type SequenceContent } from './sequence';

const game = createSequence();
const rngs = (user: string): GameRngs => ({ shared: createRng('day'), player: createRng(`day:${user}`) });

/** A correct log up to `levels`, with a human pace of 400 ms per tap. */
function perfectLevels(content: SequenceContent, levels: number) {
  return Array.from({ length: levels }, (_, index) => {
    const inputs = content.sequence.slice(0, content.startLength + index);
    return { inputs, durationMs: inputs.length * 400 };
  });
}

describe('generate', () => {
  it('builds a long sequence of pad indexes, unique per player', () => {
    const { content } = game.generate(rngs('tincho'));
    expect(content.sequence).toHaveLength(SEQUENCE_RULES.maxLength);
    expect(content.sequence.every((pad) => pad >= 0 && pad < SEQUENCE_RULES.pads)).toBe(true);
    expect(game.generate(rngs('tincho'))).toEqual(game.generate(rngs('tincho')));
    expect(game.generate(rngs('laflor')).content.sequence).not.toEqual(content.sequence);
  });

  it('starts at three items and adds one per level', () => {
    expect(sequenceLengthForLevel(1)).toBe(3);
    expect(sequenceLengthForLevel(9)).toBe(11);
  });
});

describe('evaluate', () => {
  const { content } = game.generate(rngs('tincho'));

  it('counts levels until the first mistake', () => {
    const levels = perfectLevels(content, 10);
    const last = levels[9]!;
    last.inputs = last.inputs.map((pad, i) => (i === last.inputs.length - 1 ? (pad + 1) % SEQUENCE_RULES.pads : pad));
    const result = game.evaluate(content, null, { levels });
    expect(result.levelReached).toBe(9);
    expect(result.longestSequence).toBe(11);
    expect(result.score).toBe(750);
    expect(result.flags).toEqual([]);
  });

  it('caps the score at the target level', () => {
    expect(game.evaluate(content, null, { levels: perfectLevels(content, 14) }).score).toBe(1000);
    expect(game.evaluate(content, null, { levels: [] }).score).toBe(0);
  });

  it('flags taps faster than humanly possible', () => {
    const levels = perfectLevels(content, 5).map((level) => ({ ...level, durationMs: 50 }));
    expect(game.evaluate(content, null, { levels }).flags).toContainEqual(
      expect.objectContaining({ code: 'too-fast-input', severity: 'high' }),
    );
  });

  it('flags levels sent after a mistake', () => {
    const levels = perfectLevels(content, 4);
    levels[1] = { inputs: [9, 9, 9, 9], durationMs: 1_600 };
    const result = game.evaluate(content, null, { levels });
    expect(result.levelReached).toBe(1);
    expect(result.flags).toContainEqual(expect.objectContaining({ code: 'malformed-log' }));
  });

  it('flags attempts shorter than showing the sequences takes', () => {
    const result = game.evaluate(content, null, { levels: perfectLevels(content, 8) }, { serverElapsedMs: 3_000 });
    expect(result.flags).toContainEqual(expect.objectContaining({ code: 'clock-mismatch' }));
  });
});
