import "server-only";
import { addDays, gameDayStart, isoWeekNumber, toGameDate, weekStart } from "@repo/shared";
import type { GroupWeek } from "@/lib/group-types";

/*
 * The weeks of the crowns, for the groups and the places: Monday to Sunday,
 * Argentina time. A week is decided the first time someone looks after it
 * closes (Monday 00:10), so no scheduled job is needed.
 */

/** The first week with a crown: it's given on Monday 12/10/2026. */
export const FIRST_CROWN_WEEK = "2026-10-05";
/** A challenge can last up to 7 minutes: by 00:10 Sunday's scores are all in. */
export const CLOSE_GRACE_MS = 10 * 60_000;
/** Weeks decided per request, if a group or a place went unvisited for a long time. */
export const MAX_WEEKS_PER_SETTLE = 8;

export function weekInfo(now: number): GroupWeek {
  const start = weekStart(toGameDate(new Date(now)));
  return {
    start,
    number: isoWeekNumber(start),
    closesAt: gameDayStart(addDays(start, 7)).toISOString(),
    hasCrown: start >= FIRST_CROWN_WEEK,
    firstCrownOn: addDays(FIRST_CROWN_WEEK, 7),
  };
}

/** When a week starts and ends (epoch ms), from its Monday. */
export function weekBounds(monday: string): { from: number; to: number } {
  return { from: gameDayStart(monday).getTime(), to: gameDayStart(addDays(monday, 7)).getTime() };
}

/** The Monday of the latest week that can be decided, or null before the first one. */
export function lastClosedWeek(now: number): string | null {
  const thisWeek = weekStart(toGameDate(new Date(now)));
  const settled = now >= gameDayStart(thisWeek).getTime() + CLOSE_GRACE_MS;
  const last = addDays(thisWeek, settled ? -7 : -14);
  return last >= FIRST_CROWN_WEEK ? last : null;
}

/** The closed weeks still worth deciding, oldest first (up to MAX_WEEKS_PER_SETTLE). */
export function recentClosedWeeks(now: number): string[] {
  const last = lastClosedWeek(now);
  if (!last) return [];
  const weeks: string[] = [];
  for (let week = last; week >= FIRST_CROWN_WEEK && weeks.length < MAX_WEEKS_PER_SETTLE; week = addDays(week, -7)) weeks.unshift(week);
  return weeks;
}
