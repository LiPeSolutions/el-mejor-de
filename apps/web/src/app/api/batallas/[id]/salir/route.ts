import { z } from "zod";
import { leaveRoom, parseBattleId } from "@/server/battles";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

const body = z.object({});

/** Leaves the room (and the match, if one is running). */
export function POST(request: Request, { params }: RouteContext<"/api/batallas/[id]/salir">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const id = parseBattleId((await params).id);
    body.parse(await request.json());
    const user = await requireUser();
    return leaveRoom(db, user, id, groupContext(request));
  });
}
