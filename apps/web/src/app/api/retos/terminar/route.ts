import { z } from "zod";
import type { FinishResponse } from "@/lib/challenge-types";
import { finishAttempt, readAttempt } from "@/server/challenges";
import { handle } from "@/server/http";

const body = z.object({ token: z.string(), log: z.unknown() });

export function POST(request: Request) {
  return handle(async () => {
    const { token, log } = body.parse(await request.json());
    const claims = readAttempt(token);
    return {
      mode: claims.mode,
      date: claims.date,
      slot: claims.slot,
      result: finishAttempt(claims, log),
    } satisfies FinishResponse;
  });
}
