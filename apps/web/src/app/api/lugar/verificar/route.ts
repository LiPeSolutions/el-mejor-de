import { z } from "zod";
import type { ChooseResponse } from "@/lib/place-types";
import { handle } from "@/server/http";
import { verifyPlace } from "@/server/places";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, placeContext, requireUser } from "@/server/session";

const body = z.object({ lat: z.number(), lon: z.number(), accuracy: z.number() });

/** Checks with the GPS the locality I already chose: the first time, or this week's for the crown. */
export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const input = body.parse(await request.json());
    const user = await requireUser();
    return (await verifyPlace(db, user, input, placeContext(request))) satisfies ChooseResponse;
  });
}
