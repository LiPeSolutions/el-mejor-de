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
  z.object({ mode: z.literal("practice"), game: z.enum(["letras", "preguntas", "reflejos", "secuencia"]) }),
]);

export function POST(request: Request) {
  return handle(async () => {
    const input = body.parse(await request.json());
    const device = await deviceId();
    // Signed in, the daily challenge counts for the account (and its ranking).
    const account = input.mode === "daily" ? ((await currentUser())?.id ?? null) : null;
    const started =
      input.mode === "daily"
        ? startAttempt({ mode: "daily", slot: input.slot }, { device, account })
        : startAttempt({ mode: "practice", game: gameBySlug(input.game)!.id }, { device });
    // One attempt per daily challenge: fails with 409 if this player already took it.
    await recordStart(started.claims);
    return {
      token: started.token,
      mode: started.claims.mode,
      date: started.claims.date,
      slot: started.claims.slot,
      view: started.view,
    } satisfies StartResponse;
  });
}
