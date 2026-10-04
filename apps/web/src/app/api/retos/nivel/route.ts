import { z } from "zod";
import { momentOf } from "@/server/attempt-store";
import { nextLevel, nextWaterSortLevel, readAttempt } from "@/server/challenges";
import { handle } from "@/server/http";

/** Secuencia: the inputs of the level before, to check them. */
const sequenceBody = z.object({
  token: z.string(),
  level: z.number().int().min(2).max(40),
  inputs: z.array(z.number().int().min(0).max(3)).max(40),
});

/** Tubitos: the receipt of the level before, which says it was solved. */
const waterSortBody = z.object({ token: z.string(), level: z.number().int().min(2).max(3), receipt: z.string().max(2_000) });

export function POST(request: Request) {
  return handle(async () => {
    const body: unknown = await request.json();
    const claims = readAttempt(z.object({ token: z.string() }).parse(body).token);
    if (claims.game === "water-sort") {
      const { level, receipt } = waterSortBody.parse(body);
      // Its clock starts when it's first served: asking again doesn't restart it.
      return nextWaterSortLevel(claims, level, receipt, () => momentOf(claims, `level:${level}`));
    }
    const { level, inputs } = sequenceBody.parse(body);
    return nextLevel(claims, level, inputs);
  });
}
