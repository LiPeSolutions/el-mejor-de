import "server-only";
import { dailyLineup } from "@repo/games";
import { dayNumber, isoWeekNumber, nextGameDayStart, toGameDate } from "@repo/shared";
import { brand } from "@/config/brand";
import type { TodayInfo } from "@/lib/today-types";

/** Public facts about today's game day (no secrets involved). */
export function todayInfo(now = new Date()): TodayInfo {
  const date = toGameDate(now);
  return {
    date,
    dayNumber: dayNumber(date, brand.firstDay),
    weekNumber: isoWeekNumber(date),
    lineup: dailyLineup(date),
    nextResetAt: nextGameDayStart(now).toISOString(),
  };
}
