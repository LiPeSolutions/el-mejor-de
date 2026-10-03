import type { TodayStandingsResponse } from "@/lib/place-types";
import { handle } from "@/server/http";
import { todayStandings } from "@/server/places";
import { accountsDatabase, placeContext, requireUser } from "@/server/session";

/** My position today in my locality, province and country (the day's summary). */
export function GET(request: Request) {
  return handle(async () => {
    const db = accountsDatabase();
    const user = await requireUser();
    return (await todayStandings(db, user, placeContext(request).now)) satisfies TodayStandingsResponse;
  });
}
