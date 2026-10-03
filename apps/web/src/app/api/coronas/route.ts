import type { CrownsResponse } from "@/lib/group-types";
import { crownsOf } from "@/server/groups";
import { handle } from "@/server/http";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

/** My crowns, newest first. Decides first the closed weeks my groups still owe. */
export function GET(request: Request) {
  return handle(async () => {
    const db = accountsDatabase();
    const user = await requireUser();
    return { crowns: await crownsOf(db, user, groupContext(request).now) } satisfies CrownsResponse;
  });
}
