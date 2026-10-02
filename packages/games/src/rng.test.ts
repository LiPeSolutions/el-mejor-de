import { describe, expect, it } from 'vitest';
import { createRng } from './rng';

const take = (seed: string, count: number) => {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => rng.next());
};

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    expect(take('2026-10-02:1', 20)).toEqual(take('2026-10-02:1', 20));
  });

  it('gives different sequences for different seeds', () => {
    expect(take('2026-10-02:1', 5)).not.toEqual(take('2026-10-02:2', 5));
  });

  it('keeps floats in [0, 1) and integers within bounds', () => {
    const rng = createRng('bounds');
    for (let i = 0; i < 2000; i++) {
      const float = rng.next();
      expect(float).toBeGreaterThanOrEqual(0);
      expect(float).toBeLessThan(1);
      const int = rng.int(3, 7);
      expect(int).toBeGreaterThanOrEqual(3);
      expect(int).toBeLessThanOrEqual(7);
    }
  });

  it('reaches every integer of a range', () => {
    const rng = createRng('coverage');
    const seen = new Set(Array.from({ length: 500 }, () => rng.int(0, 3)));
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it('shuffles into a permutation without touching the input', () => {
    const input = ['C', 'A', 'M', 'I', 'N', 'A', 'R'];
    const shuffled = createRng('shuffle').shuffle(input);
    expect(input).toEqual(['C', 'A', 'M', 'I', 'N', 'A', 'R']);
    expect([...shuffled].sort()).toEqual([...input].sort());
  });

  it('rejects empty picks and bad ranges', () => {
    const rng = createRng('errors');
    expect(() => rng.pick([])).toThrow(RangeError);
    expect(() => rng.int(5, 1)).toThrow(RangeError);
    expect(() => rng.int(0.5, 2)).toThrow(RangeError);
  });
});
