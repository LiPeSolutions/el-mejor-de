import type { PlaceLevel } from "@repo/shared";
import type { RankingResponse } from "@/lib/place-types";
import { handle } from "@/server/http";
import { rankingView } from "@/server/places";
import { accountsDatabase, placeContext, requireUser } from "@/server/session";

const LEVELS: Record<string, PlaceLevel> = { localidad: "locality", provincia: "province", pais: "country" };

/** The ranking of my locality (`?nivel=localidad`), province or country, of today and of the week. */
export function GET(request: Request) {
  return handle(async () => {
    const db = accountsDatabase();
    const level = LEVELS[new URL(request.url).searchParams.get("nivel") ?? "localidad"] ?? "locality";
    const user = await requireUser();
    return (await rankingView(db, user, level, placeContext(request).now)) satisfies RankingResponse;
  });
}
