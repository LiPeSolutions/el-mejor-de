import type { GroupBattlesResponse } from "@/lib/battle-types";
import { groupBattles } from "@/server/battles";
import { parseGroupId } from "@/server/groups";
import { handle } from "@/server/http";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

/** The group's live battle and its tally of battles won. Only for its members. */
export function GET(request: Request, { params }: RouteContext<"/api/grupos/[id]/batallas">) {
  return handle(async () => {
    const db = accountsDatabase();
    const id = parseGroupId((await params).id);
    const user = await requireUser();
    return (await groupBattles(db, user, id, groupContext(request))) satisfies GroupBattlesResponse;
  });
}
