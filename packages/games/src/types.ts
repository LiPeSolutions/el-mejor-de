import type { Rng } from './rng';

export const GAME_IDS = ['seven-letters', 'five-questions', 'reflexes', 'sequence'] as const;
export type GameId = (typeof GAME_IDS)[number];

export type GameCategory = 'words' | 'trivia' | 'skill' | 'logic';

/** Something odd about an attempt. 'high' means the score should not count until reviewed. */
export interface Flag {
  code: string;
  severity: 'low' | 'high';
  detail?: string;
}

export interface GameRngs {
  /** Same for every player on a given day and slot: the shared content. */
  shared: Rng;
  /** Unique per player: equivalent variants and presentation order. */
  player: Rng;
}

export interface EvaluationContext {
  /** Real time the server measured between starting and finishing the attempt. */
  serverElapsedMs?: number;
}

export interface GameResult {
  /** 0–1000. */
  score: number;
  flags: Flag[];
}

/**
 * A minigame. `content` is what the player may see (some games reveal it bit by
 * bit); `solution` never leaves the server. `evaluate` grades the attempt log.
 */
export interface GameDefinition<Content, Solution, Log, Result extends GameResult> {
  id: GameId;
  category: GameCategory;
  /** Upper bound for a whole attempt; after this the server closes it. */
  maxDurationMs: number;
  generate(rngs: GameRngs): { content: Content; solution: Solution };
  evaluate(content: Content, solution: Solution, log: Log, context?: EvaluationContext): Result;
}
