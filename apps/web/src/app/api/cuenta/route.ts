import type { AccountResponse } from "@/lib/account-types";
import { accountHistory, toPublicAccount } from "@/server/accounts";
import { handle } from "@/server/http";
import { accountsDatabase, currentUser, requestContext } from "@/server/session";

/** Who is signed in on this browser. `?historial=1` adds the recent attempts. */
export function GET(request: Request) {
  return handle(async () => {
    const user = await currentUser();
    if (!user) return { account: null } satisfies AccountResponse;
    const response: AccountResponse = { account: toPublicAccount(user) };
    if (new URL(request.url).searchParams.has("historial")) {
      response.history = await accountHistory(accountsDatabase(), user.id, (await requestContext(request)).today);
    }
    return response;
  });
}
