import type { ChallengeResult, GameId } from "./challenge-types";

/** Result recorded when an attempt can no longer be graded (it expired): it counts as played, with 0. */
export function zeroResult(game: GameId): ChallengeResult {
  switch (game) {
    case "seven-letters":
      return { game, score: 0, words: [], longest: null, fullWords: [], foundFullWord: false };
    case "five-questions":
      return { game, score: 0, correctCount: 0, questions: [] };
    case "reflexes":
      return { game, score: 0, averageMs: null, rounds: [] };
    case "sequence":
      return { game, score: 0, levelReached: 0, longestSequence: 0 };
    case "water-sort":
      return { game, score: 0, solvedCount: 0, levels: [] };
  }
}
