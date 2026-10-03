import type { GroupCreatedResponse } from "@/lib/group-types";
import { parseGroupId, renewInvite } from "@/server/groups";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

/** A new invitation link for 7 days; the old one stops working. */
export function POST(request: Request, { params }: RouteContext<"/api/grupos/[id]/invitacion">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const id = parseGroupId((await params).id);
    const user = await requireUser();
    return { group: await renewInvite(db, user, id, groupContext(request)) } satisfies GroupCreatedResponse;
  });
}
