import { z } from "zod";
import type { ChooseResponse, PlaceStatus } from "@/lib/place-types";
import { handle } from "@/server/http";
import { choosePlace, placeStatus } from "@/server/places";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, placeContext, requireUser } from "@/server/session";

/** Where I compete, and whether the GPS confirmed it (ever, and this week). */
export function GET(request: Request) {
  return handle(async () => {
    const db = accountsDatabase();
    const user = await requireUser();
    return (await placeStatus(db, user, placeContext(request).now)) satisfies PlaceStatus;
  });
}

const body = z.object({ placeId: z.string().max(40), lat: z.number().optional(), lon: z.number().optional(), accuracy: z.number().optional() });

/** Chooses my locality: with a position the GPS checks it now, without one it's checked later. */
export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const input = body.parse(await request.json());
    const user = await requireUser();
    return (await choosePlace(db, user, input, placeContext(request))) satisfies ChooseResponse;
  });
}
