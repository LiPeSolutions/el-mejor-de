import { z } from "zod";
import type { NearbyResponse } from "@/lib/place-types";
import { handle } from "@/server/http";
import { nearbyPlaces } from "@/server/places";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, placeContext, requireUser } from "@/server/session";

const body = z.object({ lat: z.number(), lon: z.number(), accuracy: z.number() });

/** "Usar mi ubicación": the localities this position verifies. The position isn't stored. */
export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const input = body.parse(await request.json());
    await requireUser();
    return (await nearbyPlaces(db, input, placeContext(request))) satisfies NearbyResponse;
  });
}
