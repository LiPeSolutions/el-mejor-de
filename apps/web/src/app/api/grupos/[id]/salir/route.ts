import { leave, parseGroupId } from "@/server/groups";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

/** I leave the group. If I ran it, it passes to whoever joined first. */
export function POST(request: Request, { params }: RouteContext<"/api/grupos/[id]/salir">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const id = parseGroupId((await params).id);
    await leave(db, await requireUser(), id, groupContext(request));
    return { ok: true };
  });
}
