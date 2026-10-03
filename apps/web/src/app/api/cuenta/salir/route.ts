import type { AccountResponse } from "@/lib/account-types";
import { signOut } from "@/server/accounts";
import { database } from "@/server/db";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { clearSessionCookie, sessionToken } from "@/server/session";

export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = database();
    const token = await sessionToken();
    if (db && token) await signOut(db, token);
    await clearSessionCookie();
    return { account: null } satisfies AccountResponse;
  });
}
