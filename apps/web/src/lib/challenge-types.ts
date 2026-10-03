import type { GameId, ReflexesOutcome } from "@repo/games";

/** Daily challenges have a slot (0–2); practice games don't count for anything. */
export type ChallengeMode = "daily" | "practice";

/** What the player gets when a challenge starts. Solutions never leave the server. */
export type StartView =
  | { game: "seven-letters"; letters: string[]; durationMs: number; minWordLength: number; targetPoints: number }
  | { game: "five-questions"; questionCount: number; secondsPerQuestion: number }
  | { game: "reflexes"; delaysMs: number[]; maxReactionMs: number }
  | { game: "sequence"; pads: number; startLength: number; showMsPerItem: number; sequence: number[] };

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
      score: number;
      averageMs: number | null;
      rounds: Array<{ outcome: ReflexesOutcome; reactionMs: number | null }>;
    }
  | { game: "sequence"; score: number; levelReached: number; longestSequence: number };

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
