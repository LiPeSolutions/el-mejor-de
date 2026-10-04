import { z } from "zod";
import { startMatch, parseBattleId } from "@/server/battles";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

const body = z.object({});

/** The host starts a match (or the rematch) for everyone in the room. */
export function POST(request: Request, { params }: RouteContext<"/api/batallas/[id]/empezar">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const id = parseBattleId((await params).id);
    body.parse(await request.json());
    const user = await requireUser();
    return startMatch(db, user, id, groupContext(request));
  });
}
