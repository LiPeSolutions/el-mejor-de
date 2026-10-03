import type { SearchResponse } from "@/lib/place-types";
import { handle } from "@/server/http";
import { searchPlaces } from "@/server/places";
import { accountsDatabase } from "@/server/session";

/** Localities by name (`?q=`), optionally within a province (`?provincia=`). */
export function GET(request: Request) {
  return handle(async () => {
    const db = accountsDatabase();
    const params = new URL(request.url).searchParams;
    const text = (params.get("q") ?? "").slice(0, 60);
    const province = params.get("provincia");
    return (await searchPlaces(db, text, province && /^[a-z0-9-]{2,20}$/.test(province) ? province : null)) satisfies SearchResponse;
  });
}
