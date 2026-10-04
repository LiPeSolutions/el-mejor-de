import { z } from "zod";
import type { FinishResponse } from "@/lib/challenge-types";
import { momentsOf, recordExpired, recordFinish } from "@/server/attempt-store";
import { gradeAttempt, isExpired, readAttemptClaims } from "@/server/challenges";
import { HttpError, handle } from "@/server/http";

const body = z.object({ token: z.string(), log: z.unknown() });

export function POST(request: Request) {
  return handle(async () => {
    const { token, log } = body.parse(await request.json());
    const claims = readAttemptClaims(token);
    if (isExpired(claims)) {
      await recordExpired(claims);
      throw new HttpError(410, "expired");
    }
    // Tubitos counts each level's time from when the server served it to when it heard it was solved.
    const moments = claims.game === "water-sort" ? await momentsOf(claims) : null;
    return {
      mode: claims.mode,
      date: claims.date,
      slot: claims.slot,
      result: await recordFinish(claims, gradeAttempt(claims, log, Date.now(), moments)),
    } satisfies FinishResponse;
  });
}
