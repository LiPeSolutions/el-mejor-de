import { z } from "zod";
import { checkWord, readAttempt } from "@/server/challenges";
import { handle } from "@/server/http";

const body = z.object({ token: z.string(), word: z.string().max(20) });

export function POST(request: Request) {
  return handle(async () => {
    const { token, word } = body.parse(await request.json());
    return checkWord(readAttempt(token), word);
  });
}
