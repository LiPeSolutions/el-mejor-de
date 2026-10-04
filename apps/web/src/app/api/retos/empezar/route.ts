import { z } from "zod";
import type { StartResponse } from "@/lib/challenge-types";
import { gameBySlug } from "@/lib/games";
import { recordStart } from "@/server/attempt-store";
import { startAttempt } from "@/server/challenges";
import { deviceId } from "@/server/device";
import { handle } from "@/server/http";
import { currentUser } from "@/server/session";

const body = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("daily"), slot: z.number().int().min(0).max(2) }),
  z.object({
    mode: z.literal("practice"),
    game: z.enum(["letras", "preguntas", "reflejos", "secuencia", "tubitos"]),
    /** Tubitos: the level the run goes on from. */
    level: z.number().int().min(1).max(9_999).optional(),
  }),
]);

export function POST(request: Request) {
  return handle(async () => {
    const input = body.parse(await request.json());
    const device = await deviceId();
    // Signed in, the daily challenge counts for the account (and the ranking of its place, once verified).
    const user = input.mode === "daily" ? await currentUser() : null;
    const account = user?.id ?? null;
    const placeId = user && user.placeVerifiedAt !== null ? user.placeId : null;
    const started =
      input.mode === "daily"
        ? startAttempt({ mode: "daily", slot: input.slot }, { device, account })
        : startAttempt({ mode: "practice", game: gameBySlug(input.game)!.id, level: input.level }, { device });
    // One attempt per daily challenge: fails with 409 if this player already took it.
    await recordStart(started.claims, Date.now(), placeId);
    return {
      token: started.token,
      mode: started.claims.mode,
      date: started.claims.date,
      slot: started.claims.slot,
      view: started.view,
    } satisfies StartResponse;
  });
}
