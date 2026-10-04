import { createRng, type Rng } from '../rng';
import type { Flag, GameDefinition, GameResult } from '../types';

/**
 * "Tubitos" (docs/diseno/handoff-tubitos/TUBITOS.md), the classic water sort:
 * pour colored liquid from tube to tube until each tube holds one color.
 * The daily challenge is three boards in a row (6, 8 and 10 tubes) and the
 * score comes from the moves against the best solution and the time.
 * Practice goes on level after level.
 */

export interface WaterSortLevelRules {
  tubes: number;
  colors: number;
  /** What the level is worth, out of the challenge's 1.000. */
  value: number;
  /** All the time points at or under this… */
  goodSeconds: number;
  /** …and none from this on. */
  badSeconds: number;
  /** Boards that can be solved in fewer pours are too easy: another one is drawn. */
  minPar: number;
}

export const WATER_SORT_RULES = {
  /** Layers per tube. */
  capacity: 4,
  /** Every board starts with this many empty tubes. */
  emptyTubes: 2,
  undosPerLevel: 3,
  /** The daily challenge's levels. Calibrate with beta data. */
  levels: [
    { tubes: 6, colors: 4, value: 250, goodSeconds: 25, badSeconds: 100, minPar: 10 },
    { tubes: 8, colors: 6, value: 350, goodSeconds: 40, badSeconds: 150, minPar: 16 },
    { tubes: 10, colors: 8, value: 400, goodSeconds: 60, badSeconds: 220, minPar: 22 },
  ],
  /** A level's points: this much for the moves (against the best solution)… */
  movesWeight: 0.7,
  /** …and this much for the time. */
  timeWeight: 0.3,
  /** Faster than this between pours, on average, is not possible on screen (each pour animates for longer). */
  minPourMs: 150,
  /** Allowance when comparing against the server's clock. */
  clockToleranceMs: 2_000,
  /** Boards the solver may look at before settling for the best solution it found. */
  solverLimit: 300_000,
} as const satisfies {
  capacity: number;
  emptyTubes: number;
  undosPerLevel: number;
  levels: readonly WaterSortLevelRules[];
  movesWeight: number;
  timeWeight: number;
  minPourMs: number;
  clockToleranceMs: number;
  solverLimit: number;
};

/** The liquids, in the order the levels add them: 4 colors with 6 tubes, 6 with 8 and all 8 with 10. */
export const WATER_SORT_COLORS = ['coral', 'violeta', 'turquesa', 'amarillo', 'rosa', 'azul', 'lima', 'cafe'] as const;
export type WaterSortColor = (typeof WATER_SORT_COLORS)[number];

/** Practice: levels 1 to 4 have 6 tubes, 5 to 9 have 8 and from 10 on, 10. */
export function waterSortPracticeRules(level: number): WaterSortLevelRules {
  const [six, eight, ten] = WATER_SORT_RULES.levels;
  if (level >= 10) return ten;
  return level >= 5 ? eight : six;
}

/* ───────────── The board ───────────── */

/** A tube's layers from the bottom up, as WATER_SORT_COLORS indexes. */
export type Tube = readonly number[];
/** Tubes from left to right, the first row and then the second. */
export type Board = readonly Tube[];

/** The top color and how many layers of it are stacked in a row. */
export function topGroup(tube: Tube): { color: number; size: number } | null {
  const color = tube.at(-1);
  if (color === undefined) return null;
  let size = 1;
  while (size < tube.length && tube[tube.length - 1 - size] === color) size++;
  return { color, size };
}

/** Full and of a single color: done, with its cork on. */
export function isTubeDone(tube: Tube, capacity: number): boolean {
  return tube.length === capacity && tube.every((color) => color === tube[0]);
}

/** Empty and done tubes can't be lifted. */
export function canLift(tube: Tube, capacity: number): boolean {
  return tube.length > 0 && !isTubeDone(tube, capacity);
}

export type PourCheck = { ok: true; amount: number } | { ok: false; reason: 'same-tube' | 'cannot-lift' | 'full' | 'other-color' };

/** Whether `from` can pour into `to`: onto the same color or into an empty tube, as much of its top group as fits. */
export function checkPour(board: Board, from: number, to: number, capacity: number): PourCheck {
  const source = board[from];
  const target = board[to];
  if (source === undefined || target === undefined) return { ok: false, reason: 'cannot-lift' };
  if (from === to) return { ok: false, reason: 'same-tube' };
  const group = topGroup(source);
  if (!group || isTubeDone(source, capacity)) return { ok: false, reason: 'cannot-lift' };
  if (target.length >= capacity) return { ok: false, reason: 'full' };
  if (target.length > 0 && target.at(-1) !== group.color) return { ok: false, reason: 'other-color' };
  return { ok: true, amount: Math.min(group.size, capacity - target.length) };
}

/** The board after the pour, or null if it isn't allowed. */
export function pour(board: Board, from: number, to: number, capacity: number): { board: Board; amount: number } | null {
  const check = checkPour(board, from, to, capacity);
  if (!check.ok) return null;
  return { board: moveLayers(board, from, to, check.amount), amount: check.amount };
}

/** Moves `amount` layers from the top of one tube to the top of another, no questions asked (undo uses it too). */
export function moveLayers(board: Board, from: number, to: number, amount: number): Board {
  const source = board[from]!;
  const moved = source.slice(source.length - amount);
  return board.map((tube, index) => {
    if (index === from) return source.slice(0, source.length - amount);
    if (index === to) return [...tube, ...moved];
    return tube;
  });
}

/** Every tube is done or empty. */
export function isSolved(board: Board, capacity: number): boolean {
  return board.every((tube) => tube.length === 0 || isTubeDone(tube, capacity));
}

/** Colors that aren't in a done tube yet ("faltan 5"). */
export function colorsLeft(board: Board, capacity: number): number {
  const colors = new Set(board.flat());
  for (const tube of board) if (isTubeDone(tube, capacity)) colors.delete(tube[0]!);
  return colors.size;
}

/** Whether any pour is possible: without one (and unsolved), the only way out is undoing or restarting. */
export function hasPours(board: Board, capacity: number): boolean {
  for (let from = 0; from < board.length; from++) {
    for (let to = 0; to < board.length; to++) {
      if (checkPour(board, from, to, capacity).ok) return true;
    }
  }
  return false;
}

/* ───────────── The solver ───────────── */

/*
 * A* over boards where the order of the tubes doesn't matter. Each tube is a
 * number (base 9, one digit per layer, 0 for nothing) and a board, the
 * sorted tubes as a string. The estimate never overshoots: every pour joins
 * at most one stretch of a color to another, and a color with no tube where
 * it sits at the bottom needs at least one pour into an empty tube. So the
 * first solution found is a shortest one.
 */

const tubeCode = (tube: Tube): number => tube.reduce((code, color, layer) => code + (color + 1) * 9 ** layer, 0);

function decodeTube(code: number): number[] {
  const tube: number[] = [];
  while (code > 0) {
    tube.push((code % 9) - 1);
    code = Math.floor(code / 9);
  }
  return tube;
}

const keyOfCodes = (codes: number[]): string => String.fromCharCode(...codes.sort((a, b) => a - b));
const keyOf = (board: Board): string => keyOfCodes(board.map(tubeCode));
const boardOfKey = (key: string): number[][] => Array.from(key, (char) => decodeTube(char.charCodeAt(0)));

/** Lower bound of the pours still needed. */
function estimate(board: Board): number {
  let stretches = 0;
  let bottoms = 0;
  for (const tube of board) {
    if (tube.length === 0) continue;
    bottoms |= 1 << tube[0]!;
    stretches++;
    for (let layer = 1; layer < tube.length; layer++) if (tube[layer] !== tube[layer - 1]) stretches++;
  }
  let distinctBottoms = 0;
  for (; bottoms; bottoms &= bottoms - 1) distinctBottoms++;
  return stretches - distinctBottoms;
}

/** The boards one pour away, skipping the pours that change nothing (a one-color tube into an empty one). */
function nextBoards(board: number[][], capacity: number): Array<{ from: number; to: number; board: number[][] }> {
  const next: Array<{ from: number; to: number; board: number[][] }> = [];
  for (let from = 0; from < board.length; from++) {
    const source = board[from]!;
    const group = topGroup(source);
    if (!group || isTubeDone(source, capacity)) continue;
    const oneColor = group.size === source.length;
    let triedEmpty = false;
    for (let to = 0; to < board.length; to++) {
      if (to === from) continue;
      const target = board[to]!;
      let amount: number;
      if (target.length === 0) {
        // Every empty tube is the same: try one.
        if (oneColor || triedEmpty) continue;
        triedEmpty = true;
        amount = group.size;
      } else {
        if (target.length >= capacity || target[target.length - 1] !== group.color) continue;
        amount = Math.min(group.size, capacity - target.length);
      }
      next.push({ from, to, board: moveLayers(board, from, to, amount) as number[][] });
    }
  }
  return next;
}

export interface WaterSortSolve {
  /** Pours of the solution. */
  moves: number;
  /** A shortest solution: false when the search hit its limit and this is the best it found. */
  exact: boolean;
  /** The pours, as indexes of the given board's tubes. */
  path: Array<[from: number, to: number]>;
}

/**
 * The fewest pours that solve the board, or null if it has no solution (or
 * none showed up within `limit` boards, even settling for a longer one).
 */
export function solveWaterSort(board: Board, capacity: number = WATER_SORT_RULES.capacity, limit: number = WATER_SORT_RULES.solverLimit): WaterSortSolve | null {
  const exact = search(board, capacity, limit, 1);
  if (exact.found) return { moves: exact.path.length, exact: true, path: exact.path };
  if (exact.exhausted) return null;
  // Too big to be sure: a greedier search finds a good solution, maybe not the shortest.
  const greedy = search(board, capacity, limit, 3);
  return greedy.found ? { moves: greedy.path.length, exact: false, path: greedy.path } : null;
}

type SearchResult = { found: true; path: Array<[number, number]> } | { found: false; exhausted: boolean };

/** A* with the estimate times `weight` (1: shortest solution; more: faster, maybe longer). */
function search(start: Board, capacity: number, limit: number, weight: number): SearchResult {
  const startKey = keyOf(start);
  if (estimate(start) === 0) return { found: true, path: [] };
  const best = new Map<string, number>([[startKey, 0]]);
  const parent = new Map<string, string>();
  const done = new Set<string>();
  // Buckets by priority: priorities are small whole numbers. One below the current bucket (only
  // possible with weight > 1) goes into the current one.
  const buckets: Array<Array<[key: string, moves: number]>> = [];
  let priority = 0;
  const push = (key: string, moves: number, wanted: number) => (buckets[Math.max(priority, wanted)] ??= []).push([key, moves]);
  push(startKey, 0, weight * estimate(start));

  let expanded = 0;
  for (; priority < buckets.length; priority++) {
    const bucket = buckets[priority];
    while (bucket && bucket.length > 0) {
      const [key, moves] = bucket.pop()!;
      if (moves !== best.get(key) || done.has(key)) continue;
      done.add(key);
      const board = boardOfKey(key);
      if (estimate(board) === 0) return { found: true, path: pathTo(start, key, parent, capacity) };
      if (++expanded > limit) return { found: false, exhausted: false };
      for (const step of nextBoards(board, capacity)) {
        const nextKey = keyOf(step.board);
        const nextMoves = moves + 1;
        if ((best.get(nextKey) ?? Infinity) <= nextMoves) continue;
        best.set(nextKey, nextMoves);
        parent.set(nextKey, key);
        const left = estimate(step.board);
        // A solution in the current bucket can't be beaten by anything still queued (the estimate
        // never drops by more than one per pour); with weight > 1 any solution will do.
        if (left === 0 && (weight > 1 || nextMoves <= priority)) return { found: true, path: pathTo(start, nextKey, parent, capacity) };
        push(nextKey, nextMoves, nextMoves + weight * left);
      }
    }
  }
  return { found: false, exhausted: true };
}

/** The pours from `start` to the board `goal`, in the start board's own tube indexes. */
function pathTo(start: Board, goal: string, parent: Map<string, string>, capacity: number): Array<[number, number]> {
  const keys = [goal];
  for (let key = parent.get(goal); key !== undefined; key = parent.get(key)) keys.unshift(key);
  const path: Array<[number, number]> = [];
  let board = start;
  for (const key of keys.slice(1)) {
    search: for (let from = 0; from < board.length; from++) {
      for (let to = 0; to < board.length; to++) {
        const next = pour(board, from, to, capacity);
        if (next && keyOf(next.board) === key) {
          path.push([from, to]);
          board = next.board;
          break search;
        }
      }
    }
  }
  return path;
}

/* ───────────── Boards for a level ───────────── */

export interface WaterSortLevel {
  /** What the player sees (WATER_SORT_COLORS indexes). */
  tubes: number[][];
  /** Pours of the best solution, the level's par. */
  par: number;
  /** False if a shorter solution might exist (the solver hit its limit). */
  parExact: boolean;
}

/**
 * The same board for everyone on a given seed: the colors shuffled into the
 * tubes, with two empty tubes at the end, no tube done from the start, not
 * too easy and with a known solution. `exactOnly` keeps drawing until the
 * par is certain.
 */
function drawBoard(rng: Rng, rules: WaterSortLevelRules, capacity: number, exactOnly: boolean): WaterSortLevel {
  for (let tries = 0; ; tries++) {
    const layers = rng.shuffle(Array.from({ length: rules.colors * capacity }, (_, index) => Math.floor(index / capacity)));
    const tubes = Array.from({ length: rules.tubes }, (_, tube) => (tube < rules.colors ? layers.slice(tube * capacity, (tube + 1) * capacity) : []));
    if (tubes.some((tube) => isTubeDone(tube, capacity))) continue;
    const solved = solveWaterSort(tubes, capacity);
    if (!solved || (tries < 40 && (solved.moves < rules.minPar || (exactOnly && !solved.exact)))) continue;
    return { tubes, par: solved.moves, parExact: solved.exact };
  }
}

const boardCache = new Map<string, WaterSortLevel>();
const BOARD_CACHE_LIMIT = 200;

/** The shared board for a seed, solved once per server (every player of the day gets a version of it). */
function sharedBoard(seed: string, rules: WaterSortLevelRules, capacity: number, exactOnly: boolean): WaterSortLevel {
  const key = `${seed}:${rules.tubes}:${rules.colors}:${capacity}:${exactOnly}`;
  const cached = boardCache.get(key);
  if (cached) return cached;
  const board = drawBoard(createRng(key), rules, capacity, exactOnly);
  boardCache.set(key, board);
  if (boardCache.size > BOARD_CACHE_LIMIT) boardCache.delete(boardCache.keys().next().value as string);
  return board;
}

/**
 * This player's version of a board: its colors swapped among themselves and
 * its full tubes in another order (the empty ones stay at the end). Same
 * puzzle and same par, but a friend's solution doesn't copy over.
 */
function playerVersion(board: WaterSortLevel, rules: WaterSortLevelRules, rng: Rng): WaterSortLevel {
  const colors = rng.shuffle(Array.from({ length: rules.colors }, (_, color) => color));
  const order = rng.shuffle(Array.from({ length: rules.colors }, (_, tube) => tube));
  const full = order.map((tube) => board.tubes[tube]!.map((color) => colors[color]!));
  return { ...board, tubes: [...full, ...board.tubes.slice(rules.colors).map((tube) => [...tube])] };
}

/** The same board for everyone on a seed, solved once (a live battle's boards). */
export function waterSortBoard(seed: string, rules: WaterSortLevelRules, exactPar = true): WaterSortLevel {
  return sharedBoard(seed, rules, WATER_SORT_RULES.capacity, exactPar);
}

/** One player's version of a shared board: same puzzle and par, other colors and order. */
export function waterSortPlayerBoard(board: WaterSortLevel, rules: WaterSortLevelRules, rng: Rng): WaterSortLevel {
  return playerVersion(board, rules, rng);
}

/* ───────────── Grading ───────────── */

export type WaterSortEvent =
  | { type: 'pour'; from: number; to: number; t: number }
  | { type: 'undo'; t: number }
  | { type: 'restart'; t: number };

export interface WaterSortLog {
  /** One entry per level played, in order. `t` is milliseconds since the level started. */
  levels: Array<{ events: WaterSortEvent[]; durationMs: number }>;
}

export interface WaterSortContent {
  capacity: number;
  undosPerLevel: number;
  /** Never sent all at once: the server reveals one level at a time. */
  levels: WaterSortLevel[];
  /** Points and times of each level. */
  rules: WaterSortLevelRules[];
}

export interface WaterSortLevelResult {
  solved: boolean;
  /** Pours since the last restart (undoing doesn't take them back). */
  moves: number;
  par: number;
  /** The time that counts, in milliseconds. */
  timeMs: number;
  /** Undos used since the last restart. */
  undos: number;
  points: number;
}

export interface WaterSortResult extends GameResult {
  levels: WaterSortLevelResult[];
  solvedCount: number;
}

/** A solved level's points: `value × (0,7 × min(1, par ÷ moves) + 0,3 × time)`, the time going from 1 at `goodSeconds` to 0 at `badSeconds`. */
export function waterSortLevelPoints(rules: WaterSortLevelRules, par: number, moves: number, timeMs: number): number {
  if (moves <= 0) return 0;
  const movesFactor = Math.min(1, par / moves);
  const seconds = timeMs / 1000;
  const timeFactor = Math.min(1, Math.max(0, (rules.badSeconds - seconds) / (rules.badSeconds - rules.goodSeconds)));
  return Math.round(rules.value * (WATER_SORT_RULES.movesWeight * movesFactor + WATER_SORT_RULES.timeWeight * timeFactor));
}

export interface LevelReplay {
  /** Every step was allowed. */
  legal: boolean;
  solved: boolean;
  board: Board;
  moves: number;
  pours: number;
  undos: number;
  /** When the solving pour happened (ms since the level started), if it was solved. */
  solvedAt: number | null;
  /** Average time between pours, when there are a few. */
  averagePourMs: number | null;
  /** Steps after the board was solved, or times going backwards. */
  odd: boolean;
}

/** Plays a level's steps on its board, checking each one, as the phone did. */
export function replayWaterSortLevel(start: Board, events: readonly WaterSortEvent[], capacity: number, undosPerLevel: number): LevelReplay {
  let board = start;
  let moves = 0;
  let pours = 0;
  let undosLeft = undosPerLevel;
  let history: Array<{ from: number; to: number; amount: number }> = [];
  let solvedAt: number | null = null;
  let odd = false;
  let last = 0;
  const pourTimes: number[] = [];
  for (const event of events) {
    if (solvedAt !== null) {
      odd = true;
      break;
    }
    if (!(event.t >= last)) odd = true;
    last = Math.max(last, event.t);
    if (event.type === 'pour') {
      const next = pour(board, event.from, event.to, capacity);
      if (!next) return { legal: false, solved: false, board, moves, pours, undos: undosPerLevel - undosLeft, solvedAt: null, averagePourMs: null, odd };
      board = next.board;
      history.push({ from: event.from, to: event.to, amount: next.amount });
      moves++;
      pours++;
      pourTimes.push(event.t);
      if (isSolved(board, capacity)) solvedAt = event.t;
    } else if (event.type === 'undo') {
      const step = history.pop();
      if (!step || undosLeft === 0) return { legal: false, solved: false, board, moves, pours, undos: undosPerLevel - undosLeft, solvedAt: null, averagePourMs: null, odd };
      board = moveLayers(board, step.to, step.from, step.amount);
      undosLeft--;
    } else {
      board = start;
      moves = 0;
      undosLeft = undosPerLevel;
      history = [];
    }
  }
  const averagePourMs = pourTimes.length >= 4 ? (pourTimes.at(-1)! - pourTimes[0]!) / (pourTimes.length - 1) : null;
  return { legal: true, solved: solvedAt !== null, board, moves, pours, undos: undosPerLevel - undosLeft, solvedAt, averagePourMs, odd };
}

export interface WaterSortLevelGrade {
  result: WaterSortLevelResult;
  flags: Flag[];
  /** Pours came faster than the screen allows them. */
  fast: boolean;
  /** What the phone says the level took, to add up against the server's clock. */
  phoneMs: number;
}

/**
 * One level of an attempt, replayed, checked and scored. `serverMs` is how
 * long the server saw it take, from serving it to hearing it was solved: the
 * counted time is the phone's, but never much less than that.
 */
export function gradeWaterSortLevel(
  content: WaterSortContent,
  index: number,
  played: WaterSortLog['levels'][number],
  serverMs: number | null = null,
): WaterSortLevelGrade {
  const rules = WATER_SORT_RULES;
  const level = content.levels[index];
  const levelRules = content.rules[index];
  if (!level || !levelRules) throw new RangeError(`No level ${index + 1}`);
  const flags: Flag[] = [];
  const replay = replayWaterSortLevel(level.tubes, played.events, content.capacity, content.undosPerLevel);
  if (!replay.legal) flags.push({ code: 'illegal-move', severity: 'high', detail: `level ${index + 1}` });
  if (replay.odd) flags.push({ code: 'malformed-log', severity: 'low', detail: `level ${index + 1}` });
  if (!replay.legal || !replay.solved) {
    return { result: { solved: false, moves: replay.moves, par: level.par, timeMs: 0, undos: replay.undos, points: 0 }, flags, fast: false, phoneMs: 0 };
  }
  if (level.parExact && replay.moves < level.par) {
    flags.push({ code: 'below-par', severity: 'high', detail: `level ${index + 1}: ${replay.moves} < ${level.par}` });
  }
  const phoneMs = Math.max(0, Math.min(played.durationMs, replay.solvedAt ?? played.durationMs));
  let timeMs = phoneMs;
  if (serverMs !== null && serverMs - rules.clockToleranceMs > phoneMs) {
    timeMs = serverMs - rules.clockToleranceMs;
    flags.push({ code: 'clock-mismatch', severity: 'low', detail: `level ${index + 1}: phone ${phoneMs} ms, server ${serverMs} ms` });
  }
  return {
    result: {
      solved: true,
      moves: replay.moves,
      par: level.par,
      timeMs: Math.round(timeMs),
      undos: replay.undos,
      points: waterSortLevelPoints(levelRules, level.par, replay.moves, timeMs),
    },
    flags,
    fast: replay.averagePourMs !== null && replay.averagePourMs < rules.minPourMs,
    phoneMs,
  };
}

export interface WaterSortOptions {
  /** The levels and what each is worth: the daily challenge's three by default, one for a practice level. */
  levels?: readonly WaterSortLevelRules[];
  /** Keep drawing boards until the par is certain (the daily challenge). */
  exactPar?: boolean;
}

export function createWaterSort(options: WaterSortOptions = {}): GameDefinition<WaterSortContent, null, WaterSortLog, WaterSortResult> {
  const rules = WATER_SORT_RULES;
  const levels = options.levels ?? rules.levels;
  const exactPar = options.exactPar ?? true;

  return {
    id: 'water-sort',
    category: 'logic',
    // Three levels of a few minutes, and the breaks between them.
    maxDurationMs: 30 * 60_000,

    generate({ shared, player }) {
      // The shared generator only names the boards, so each one is solved once and cached.
      const seed = `${shared.int(0, 2 ** 31)}:${shared.int(0, 2 ** 31)}`;
      return {
        content: {
          capacity: rules.capacity,
          undosPerLevel: rules.undosPerLevel,
          levels: levels.map((level, index) => playerVersion(sharedBoard(`${seed}:${index}`, level, rules.capacity, exactPar), level, player)),
          rules: levels.map((level) => ({ ...level })),
        },
        solution: null,
      };
    },

    evaluate(content, _solution, log, context = {}) {
      const flags: Flag[] = [];
      const results: WaterSortLevelResult[] = [];
      let fastLevels = 0;
      let claimedMs = 0;
      let stopped = false;

      for (const [index, level] of content.levels.entries()) {
        const played = log.levels[index];
        if (!played || stopped) {
          // The server only reveals a level once the one before is solved.
          if (played && played.events.some((event) => event.type === 'pour')) {
            flags.push({ code: 'unsolved-level', severity: 'high', detail: `level ${index + 1} after an unsolved one` });
          }
          results.push({ solved: false, moves: 0, par: level.par, timeMs: 0, undos: 0, points: 0 });
          continue;
        }
        const graded = gradeWaterSortLevel(content, index, played, context.levelServerMs?.[index] ?? null);
        flags.push(...graded.flags);
        results.push(graded.result);
        if (!graded.result.solved) stopped = true;
        if (graded.fast) fastLevels++;
        claimedMs += graded.phoneMs;
      }

      if (log.levels.length > content.levels.length) flags.push({ code: 'malformed-log', severity: 'low', detail: 'too many levels' });
      if (fastLevels > 0) {
        flags.push({ code: 'too-fast-input', severity: fastLevels >= 2 ? 'high' : 'low', detail: String(fastLevels) });
      }
      if (context.serverElapsedMs !== undefined && context.serverElapsedMs + rules.clockToleranceMs < claimedMs) {
        flags.push({ code: 'clock-mismatch', severity: 'high', detail: `levels took ${claimedMs} ms, server saw ${context.serverElapsedMs} ms` });
      }

      const score = Math.min(1000, results.reduce((sum, level) => sum + level.points, 0));
      return { score, flags, levels: results, solvedCount: results.filter((level) => level.solved).length };
    },
  };
}
