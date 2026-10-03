import { z } from "zod";
import type { AccountResponse } from "@/lib/account-types";
import { accountHistory, signIn, signOut, toPublicAccount } from "@/server/accounts";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, requestContext, sessionToken, setSessionCookie } from "@/server/session";

const body = z.object({ username: z.string().max(100), password: z.string().max(200) });

/** Signs in with apodo and password, and sends the recent attempts for this browser. */
export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const input = body.parse(await request.json());
    const context = await requestContext(request);
    const signed = await signIn(db, input, context);
    const previous = await sessionToken();
    if (previous) await signOut(db, previous);
    await setSessionCookie(signed.token, signed.expiresAt);
    return {
      account: toPublicAccount(signed.user),
      history: await accountHistory(db, signed.user.id, context.today),
    } satisfies AccountResponse;
  });
}
