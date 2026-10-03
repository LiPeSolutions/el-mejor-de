import type { ChallengeResult } from "./challenge-types";
import { themeOn, type GameTheme } from "./games";
import type { StoredDay } from "./storage";
import type { TodayInfo } from "./today-types";

export interface DaySlot {
  slot: number;
  game: GameTheme;
  result: ChallengeResult | null;
  /** Started but never graded (the page was closed mid-game). Opening it grades what was played. */
  unfinished: boolean;
}

/** Today's three challenges with what this browser did in each one. */
export function daySlots(today: TodayInfo, day: StoredDay): DaySlot[] {
  return today.lineup.map((id, slot) => {
    const attempt = day.attempts[slot];
    const result = attempt?.status === "finished" ? (attempt.result ?? null) : null;
    return { slot, game: themeOn(id, today.date), result, unfinished: attempt?.status === "started" };
  });
}

export function dayTotal(slots: readonly DaySlot[]): number {
  return slots.reduce((sum, slot) => sum + (slot.result?.score ?? 0), 0);
}

export const pendingSlots = (slots: readonly DaySlot[]) => slots.filter((slot) => !slot.result);
