import { z } from "zod";
import { joinFromGroup, parseBattleId } from "@/server/battles";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

const body = z.object({});

/** Joins a group's battle from the card in the group. */
export function POST(request: Request, { params }: RouteContext<"/api/batallas/[id]/sumarse">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const id = parseBattleId((await params).id);
    body.parse(await request.json());
    const user = await requireUser();
    return joinFromGroup(db, user, id, groupContext(request));
  });
}
