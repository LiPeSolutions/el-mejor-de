import { z } from "zod";
import { readAttempt, serveQuestion } from "@/server/challenges";
import { handle } from "@/server/http";

const body = z.object({ token: z.string(), index: z.number().int().min(0).max(9) });

export function POST(request: Request) {
  return handle(async () => {
    const { token, index } = body.parse(await request.json());
    return serveQuestion(readAttempt(token), index);
  });
}
