import { z } from "zod";
import { backToLobby, parseBattleId } from "@/server/battles";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

const body = z.object({});

/** "Otro juego": the host goes from the podium back to the room. */
export function POST(request: Request, { params }: RouteContext<"/api/batallas/[id]/sala">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const id = parseBattleId((await params).id);
    body.parse(await request.json());
    const user = await requireUser();
    return backToLobby(db, user, id, groupContext(request));
  });
}
