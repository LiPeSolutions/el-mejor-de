import { z } from "zod";
import { answerQuestion, readAttempt } from "@/server/challenges";
import { handle } from "@/server/http";

const body = z.object({
  token: z.string(),
  questionToken: z.string().max(2000),
  choice: z.number().int().min(0).max(3).nullable(),
});

export function POST(request: Request) {
  return handle(async () => {
    const { token, questionToken, choice } = body.parse(await request.json());
    return answerQuestion(readAttempt(token), questionToken, choice);
  });
}
