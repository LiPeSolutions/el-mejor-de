import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import type { GameRngs } from '../types';
import {
  WATER_SORT_COLORS,
  WATER_SORT_RULES,
  canLift,
  checkPour,
  colorsLeft,
  createWaterSort,
  hasPours,
  isSolved,
  pour,
  replayWaterSortLevel,
  solveWaterSort,
  waterSortLevelPoints,
  waterSortPracticeRules,
  type Board,
  type WaterSortContent,
  type WaterSortEvent,
  type WaterSortLog,
} from './water-sort';

const CAP = WATER_SORT_RULES.capacity;
const game = createWaterSort();
const rngs = (user: string, day = 'day'): GameRngs => ({ shared: createRng(day), player: createRng(`${day}:${user}`) });

/** The solver's pours at a human pace (900 ms each), finishing at `durationMs`. */
function solvedLevel(tubes: Board, durationMs?: number): WaterSortLog['levels'][number] {
  const { path } = solveWaterSort(tubes)!;
  const events: WaterSortEvent[] = path.map(([from, to], i) => ({ type: 'pour', from, to, t: 900 * (i + 1) }));
  return { events, durationMs: durationMs ?? 900 * path.length };
}

describe('the board', () => {
  const board: Board = [[0, 1, 1], [2, 1], [], [0, 0, 0, 0], [2, 2, 2, 1]];

  it('pours the top group onto the same color or into an empty tube, as much as fits', () => {
    expect(checkPour(board, 0, 1, CAP)).toEqual({ ok: true, amount: 2 });
    expect(checkPour(board, 0, 2, CAP)).toEqual({ ok: true, amount: 2 });
    expect(pour(board, 0, 1, CAP)!.board).toEqual([[0], [2, 1, 1, 1], [], [0, 0, 0, 0], [2, 2, 2, 1]]);
    // Only one layer fits: the other stays.
    expect(pour([[0, 1, 1], [2, 2, 1]], 0, 1, CAP)!.board).toEqual([[0, 1], [2, 2, 1, 1]]);
  });

  it('refuses the other color, a full tube, an empty or done one and the same tube', () => {
    expect(checkPour(board, 1, 0, CAP)).toEqual({ ok: true, amount: 1 });
    expect(checkPour(board, 4, 1, CAP)).toEqual({ ok: true, amount: 1 });
    expect(checkPour([[0], [1]], 0, 1, CAP)).toEqual({ ok: false, reason: 'other-color' });
    expect(checkPour(board, 1, 4, CAP)).toEqual({ ok: false, reason: 'full' });
    expect(checkPour(board, 2, 0, CAP)).toEqual({ ok: false, reason: 'cannot-lift' });
    expect(checkPour(board, 3, 2, CAP)).toEqual({ ok: false, reason: 'cannot-lift' });
    expect(checkPour(board, 0, 0, CAP)).toEqual({ ok: false, reason: 'same-tube' });
    expect(canLift([], CAP)).toBe(false);
    expect(canLift([1, 1, 1, 1], CAP)).toBe(false);
    expect(canLift([1, 1, 1], CAP)).toBe(true);
  });

  it('knows when it is solved, what is left and when it is stuck', () => {
    expect(isSolved([[0, 0, 0, 0], [], [1, 1, 1, 1]], CAP)).toBe(true);
    expect(isSolved([[0, 0, 0], [0], [1, 1, 1, 1]], CAP)).toBe(false);
    expect(colorsLeft(board, CAP)).toBe(2);
    expect(hasPours([[0, 1, 0, 1], [1, 0, 1, 0]], CAP)).toBe(false);
    expect(hasPours(board, CAP)).toBe(true);
  });
});

describe('solveWaterSort', () => {
  it('finds the shortest solution, with pours that work', () => {
    const tubes: Board = [[0, 1, 0, 1], [1, 0, 1, 0], []];
    const solved = solveWaterSort(tubes)!;
    expect(solved.exact).toBe(true);
    let board = tubes;
    for (const [from, to] of solved.path) board = pour(board, from, to, CAP)!.board;
    expect(isSolved(board, CAP)).toBe(true);
    expect(solved.moves).toBe(solved.path.length);
    expect(solveWaterSort([[0, 0, 0, 0], [1, 1, 1, 1], []])).toEqual({ moves: 0, exact: true, path: [] });
  });

  it('says when there is no way out', () => {
    expect(solveWaterSort([[0, 1, 0, 1], [1, 0, 1, 0]])).toBeNull();
  });
});

describe('generate', () => {
  const { content } = game.generate(rngs('tincho'));

  it('makes the three levels: 6, 8 and 10 tubes, with 4, 6 and 8 colors and two empty tubes at the end', () => {
    expect(content.levels.map((level) => level.tubes.length)).toEqual([6, 8, 10]);
    for (const [index, level] of content.levels.entries()) {
      const rules = WATER_SORT_RULES.levels[index]!;
      expect(level.tubes.slice(-2)).toEqual([[], []]);
      expect(level.tubes.slice(0, -2).every((tube) => tube.length === CAP && !isSolved([tube], CAP))).toBe(true);
      const counts = new Map<number, number>();
      for (const color of level.tubes.flat()) counts.set(color, (counts.get(color) ?? 0) + 1);
      // The level's own colors from the palette, four layers each.
      expect([...counts.keys()].sort()).toEqual(Array.from({ length: rules.colors }, (_, color) => color));
      expect([...counts.values()].every((count) => count === CAP)).toBe(true);
      expect(level.par).toBeGreaterThanOrEqual(rules.minPar);
      expect(level.parExact).toBe(true);
      expect(solveWaterSort(level.tubes)!.moves).toBe(level.par);
    }
    expect(WATER_SORT_COLORS).toHaveLength(8);
  });

  it('gives everyone the same puzzle in their own colors and order', () => {
    expect(game.generate(rngs('tincho'))).toEqual(game.generate(rngs('tincho')));
    const other = game.generate(rngs('laflor')).content;
    expect(other.levels.map((level) => level.par)).toEqual(content.levels.map((level) => level.par));
    expect(other.levels.map((level) => level.tubes)).not.toEqual(content.levels.map((level) => level.tubes));
    expect(game.generate(rngs('tincho', 'otro dia')).content.levels[2]!.tubes).not.toEqual(content.levels[2]!.tubes);
  });

  it('makes one level for practice, sized by the level number', () => {
    expect([1, 4, 5, 9, 10, 14].map((level) => waterSortPracticeRules(level).tubes)).toEqual([6, 6, 8, 8, 10, 10]);
    const practice = createWaterSort({ levels: [waterSortPracticeRules(7)], exactPar: false });
    expect(practice.generate(rngs('tincho', 'practica')).content.levels.map((level) => level.tubes.length)).toEqual([8]);
  });
});

describe('replayWaterSortLevel', () => {
  const start: Board = [[0, 1, 1], [1, 0, 0], [], []];

  it('counts pours since the last restart; undoing does not take them back', () => {
    const replay = replayWaterSortLevel(
      start,
      [
        { type: 'pour', from: 0, to: 2, t: 1000 },
        { type: 'undo', t: 2000 },
        { type: 'pour', from: 0, to: 3, t: 3000 },
      ],
      CAP,
      3,
    );
    expect(replay).toMatchObject({ legal: true, solved: false, moves: 2, pours: 2, undos: 1 });
    expect(replay.board).toEqual([[0], [1, 0, 0], [], [1, 1]]);

    const restarted = replayWaterSortLevel(
      start,
      [
        { type: 'pour', from: 0, to: 2, t: 1000 },
        { type: 'undo', t: 2000 },
        { type: 'restart', t: 3000 },
        { type: 'pour', from: 1, to: 2, t: 4000 },
      ],
      CAP,
      3,
    );
    expect(restarted).toMatchObject({ legal: true, moves: 1, undos: 0 });
  });

  it('allows three undos per level, and three more after restarting', () => {
    const pourAndUndo = (t: number): WaterSortEvent[] => [
      { type: 'pour', from: 0, to: 2, t },
      { type: 'undo', t: t + 1 },
    ];
    const three = [...pourAndUndo(0), ...pourAndUndo(10), ...pourAndUndo(20)];
    expect(replayWaterSortLevel(start, three, CAP, 3).legal).toBe(true);
    expect(replayWaterSortLevel(start, [...three, ...pourAndUndo(30)], CAP, 3).legal).toBe(false);
    expect(replayWaterSortLevel(start, [...three, { type: 'restart', t: 25 }, ...pourAndUndo(30)], CAP, 3).legal).toBe(true);
    expect(replayWaterSortLevel(start, [{ type: 'undo', t: 0 }], CAP, 3).legal).toBe(false);
  });

  it('refuses a pour the board does not allow', () => {
    expect(replayWaterSortLevel(start, [{ type: 'pour', from: 2, to: 0, t: 0 }], CAP, 3).legal).toBe(false);
    expect(replayWaterSortLevel(start, [{ type: 'pour', from: 0, to: 1, t: 0 }], CAP, 3).legal).toBe(false);
  });
});

describe('waterSortLevelPoints', () => {
  const [one] = WATER_SORT_RULES.levels;

  it('weighs the moves against the par (70 %) and the time (30 %)', () => {
    expect(waterSortLevelPoints(one, 12, 12, 25_000)).toBe(250);
    expect(waterSortLevelPoints(one, 12, 12, 100_000)).toBe(175);
    expect(waterSortLevelPoints(one, 12, 14, 41_000)).toBe(209);
    expect(waterSortLevelPoints(one, 12, 24, 200_000)).toBe(88);
    expect(waterSortLevelPoints(one, 12, 0, 1_000)).toBe(0);
  });
});

describe('evaluate', () => {
  const { content } = game.generate(rngs('tincho'));
  const fast = (index: number) => WATER_SORT_RULES.levels[index]!.goodSeconds * 1000;
  const perfect: WaterSortLog = { levels: content.levels.map((level, index) => solvedLevel(level.tubes, fast(index))) };

  it('gives 1.000 for the three levels at par and on good time', () => {
    const result = game.evaluate(content, null, perfect, { serverElapsedMs: 3 * 60_000 });
    expect(result.score).toBe(1000);
    expect(result.solvedCount).toBe(3);
    expect(result.levels.map((level) => level.moves)).toEqual(content.levels.map((level) => level.par));
    expect(result.flags).toEqual([]);
  });

  it('counts only the levels solved: one left halfway is worth 0, and so are the ones after it', () => {
    const halfway: WaterSortLog = {
      levels: [perfect.levels[0]!, { events: perfect.levels[1]!.events.slice(0, 3), durationMs: 20_000 }],
    };
    const result = game.evaluate(content, null, halfway);
    expect(result.score).toBe(250);
    expect(result.levels.map((level) => level.solved)).toEqual([true, false, false]);
    expect(result.levels[1]!.moves).toBe(3);
    expect(game.evaluate(content, null, { levels: [] }).score).toBe(0);
  });

  it('flags pours that are not allowed and levels after an unsolved one', () => {
    const empty = content.levels[0]!.tubes.length - 1;
    const illegal: WaterSortLog = { levels: [{ events: [{ type: 'pour', from: empty, to: 0, t: 500 }], durationMs: 500 }, perfect.levels[1]!] };
    const result = game.evaluate(content, null, illegal);
    expect(result.score).toBe(0);
    expect(result.flags).toContainEqual(expect.objectContaining({ code: 'illegal-move', severity: 'high' }));
    expect(result.flags).toContainEqual(expect.objectContaining({ code: 'unsolved-level', severity: 'high' }));
  });

  it('flags solutions shorter than the best one', () => {
    const tampered: WaterSortContent = { ...content, levels: content.levels.map((level) => ({ ...level, par: level.par + 3 })) };
    expect(game.evaluate(tampered, null, perfect).flags).toContainEqual(expect.objectContaining({ code: 'below-par', severity: 'high' }));
  });

  it('flags pours faster than the screen allows', () => {
    const quick: WaterSortLog = {
      levels: perfect.levels.map((level) => ({ events: level.events.map((event, i) => ({ ...event, t: 40 * i })), durationMs: 40 * level.events.length })),
    };
    expect(game.evaluate(content, null, quick).flags).toContainEqual(expect.objectContaining({ code: 'too-fast-input', severity: 'high' }));
  });

  it('never counts much less time than the server saw', () => {
    // The phone's time is when the solving pour happened.
    const phoneMs = 900 * content.levels[2]!.par;
    const result = game.evaluate(content, null, perfect, { levelServerMs: [fast(0) + 30_000, null, phoneMs + 500] });
    expect(result.levels[0]!.timeMs).toBe(fast(0) + 30_000 - WATER_SORT_RULES.clockToleranceMs);
    expect(result.levels[2]!.timeMs).toBe(phoneMs);
    expect(result.score).toBeLessThan(1000);
    expect(result.flags).toContainEqual(expect.objectContaining({ code: 'clock-mismatch', severity: 'low' }));
    // Claiming more time than the whole attempt took doesn't add up either.
    expect(game.evaluate(content, null, perfect, { serverElapsedMs: 30_000 }).flags).toContainEqual(
      expect.objectContaining({ code: 'clock-mismatch', severity: 'high' }),
    );
  });
});
