import type { GameId, ReflexesOutcome } from "@repo/games";

/** Daily challenges have a slot (0–2); practice games don't count for anything. */
export type ChallengeMode = "daily" | "practice";

/** What the player gets when a challenge starts. Solutions never leave the server. */
export type StartView =
  | { game: "seven-letters"; letters: string[]; durationMs: number; minWordLength: number; targetPoints: number }
  | { game: "five-questions"; questionCount: number; secondsPerQuestion: number }
  | { game: "reflexes"; version?: undefined; delaysMs: number[]; maxReactionMs: number }
  /** Largada: five lights, one every `lightMs`, then each start's own wait before they go out. */
  | { game: "reflexes"; version: "largada"; lights: number; lightMs: number; delaysMs: number[]; maxReactionMs: number }
  | { game: "sequence"; pads: number; startLength: number; showMsPerItem: number; sequence: number[] }
  /** Tubitos: the first level's board (the next ones come after solving each). `practiceLevel` is the run's level in practice. */
  | { game: "water-sort"; capacity: number; undos: number; levels: number; practiceLevel: number | null; board: WaterSortBoardView };

/** A Tubitos board as the player sees it: tubes left to right, each one bottom to top, as WATER_SORT_COLORS indexes. */
export interface WaterSortBoardView {
  /** 1 to 3 in the daily challenge, 1 in practice. */
  level: number;
  tubes: number[][];
  /** Moves of the best solution, shown once it's solved. */
  par: number;
  /** False when a shorter solution might exist. */
  parExact: boolean;
  /** When the server served it, signed (the levels after the first). */
  levelToken?: string;
}

export interface StartResponse {
  token: string;
  mode: ChallengeMode;
  date: string;
  slot: number;
  view: StartView;
}

export interface WordCheckResponse {
  word: string;
  status: "valid" | "invalid" | "too-short";
  /** What the word adds before scaling to the score (0 unless valid). */
  points: number;
}

export interface QuestionResponse {
  index: number;
  prompt: string;
  category: string;
  options: string[];
  questionToken: string;
}

export interface AnswerResponse {
  correct: boolean;
  correctChoice: number;
  points: number;
  seconds: number | null;
  receipt: string;
}

export interface LevelResponse {
  level: number;
  sequence: number[];
}

/** A Tubitos level the server checked as solved, with what it's worth. */
export interface WaterSortSolvedResponse {
  level: number;
  /** Proof that it was solved, and when: the next level asks for it. */
  receipt: string;
  moves: number;
  par: number;
  timeMs: number;
  points: number;
}

export interface WaterSortLevelResponse {
  board: WaterSortBoardView;
}

export type ChallengeResult =
  | {
      game: "seven-letters";
      score: number;
      /** In the order they were found, with each word's contribution to the score. */
      words: Array<{ word: string; delta: number }>;
      longest: string | null;
      fullWords: string[];
      foundFullWord: boolean;
    }
  | {
      game: "five-questions";
      score: number;
      correctCount: number;
      questions: Array<{ correct: boolean; points: number; seconds: number | null }>;
    }
  | {
      game: "reflexes";
      version?: undefined;
      score: number;
      averageMs: number | null;
      rounds: Array<{ outcome: ReflexesOutcome; reactionMs: number | null }>;
    }
  | {
      game: "reflexes";
      version: "largada";
      score: number;
      /** With the penalties: a jumped start counts 450 ms and a missed one 700. */
      averageMs: number;
      bestMs: number | null;
      rounds: Array<{ outcome: ReflexesOutcome; reactionMs: number | null }>;
    }
  | { game: "sequence"; score: number; levelReached: number; longestSequence: number }
  | {
      game: "water-sort";
      score: number;
      solvedCount: number;
      /** The three levels; an unsolved one has 0 points. */
      levels: Array<{ solved: boolean; moves: number; par: number; timeMs: number; points: number }>;
    };

/** A daily challenge this player already took (the 409 "already-played" answer). */
export interface PlayedAttempt {
  date: string;
  slot: number;
  status: "started" | "finished";
  result: ChallengeResult | null;
}

export interface FinishResponse {
  mode: ChallengeMode;
  date: string;
  slot: number;
  result: ChallengeResult;
}

export type { GameId };
