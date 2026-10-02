import type { GameId } from "@repo/games";

/** Public facts about today's game day, computed on the server. */
export interface TodayInfo {
  date: string;
  dayNumber: number;
  weekNumber: number;
  lineup: GameId[];
  /** ISO instant when the next challenges start (00:00 Argentina). */
  nextResetAt: string;
}
