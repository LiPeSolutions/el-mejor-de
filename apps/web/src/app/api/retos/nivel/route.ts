import { z } from "zod";
import { nextLevel, readAttempt } from "@/server/challenges";
import { handle } from "@/server/http";

const body = z.object({
  token: z.string(),
  level: z.number().int().min(2).max(40),
  inputs: z.array(z.number().int().min(0).max(3)).max(40),
});

export function POST(request: Request) {
  return handle(async () => {
    const { token, level, inputs } = body.parse(await request.json());
    return nextLevel(readAttempt(token), level, inputs);
  });
}
