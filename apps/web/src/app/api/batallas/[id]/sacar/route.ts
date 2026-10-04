import { z } from "zod";
import { removeFromRoom, parseBattleId } from "@/server/battles";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

const body = z.object({ userId: z.string().uuid() });

/** The host takes someone out of the room: they can't come back to it. */
export function POST(request: Request, { params }: RouteContext<"/api/batallas/[id]/sacar">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const id = parseBattleId((await params).id);
    const { userId } = body.parse(await request.json());
    const user = await requireUser();
    return removeFromRoom(db, user, id, userId, groupContext(request));
  });
}
