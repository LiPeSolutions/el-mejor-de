import { z } from "zod";
import type { AccountResponse } from "@/lib/account-types";
import { signOut, signUp, toPublicAccount } from "@/server/accounts";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, requestContext, sessionToken, setSessionCookie } from "@/server/session";

const body = z.object({
  username: z.string().max(100),
  password: z.string().max(200),
  avatar: z.unknown(),
  article: z.unknown(),
});

/** Creates an account with what this browser played today, and signs it in. */
export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const input = body.parse(await request.json());
    const signed = await signUp(db, input, await requestContext(request));
    const previous = await sessionToken();
    if (previous) await signOut(db, previous);
    await setSessionCookie(signed.token, signed.expiresAt);
    return { account: toPublicAccount(signed.user) } satisfies AccountResponse;
  });
}
