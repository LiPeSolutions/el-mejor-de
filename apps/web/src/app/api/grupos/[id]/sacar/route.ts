import { z } from "zod";
import { parseGroupId, removeFromGroup } from "@/server/groups";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

const body = z.object({ userId: z.uuid() });

/** The owner removes a member. */
export function POST(request: Request, { params }: RouteContext<"/api/grupos/[id]/sacar">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const id = parseGroupId((await params).id);
    const { userId } = body.parse(await request.json());
    await removeFromGroup(db, await requireUser(), id, userId, groupContext(request));
    return { ok: true };
  });
}
