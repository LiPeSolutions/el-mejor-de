import { z } from "zod";
import { momentOf } from "@/server/attempt-store";
import { readAttempt, solveWaterSortLevel, waterSortLevelLog } from "@/server/challenges";
import { handle } from "@/server/http";

/** A Tubitos level the phone solved, with what was played on it. */
const body = waterSortLevelLog.extend({
  token: z.string(),
  level: z.number().int().min(1).max(3),
  levelToken: z.string().max(2_000).optional(),
});

export function POST(request: Request) {
  return handle(async () => {
    const { token, ...input } = body.parse(await request.json());
    const claims = readAttempt(token);
    // The level's time ends when the server first hears it was solved.
    return solveWaterSortLevel(claims, input, () => momentOf(claims, `solved:${input.level}`));
  });
}
