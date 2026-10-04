import { z } from "zod";
import { chooseGame, parseBattleId } from "@/server/battles";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

const body = z.object({ game: z.string().max(20) });

/** The host chooses the game of the next match. */
export function POST(request: Request, { params }: RouteContext<"/api/batallas/[id]/juego">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const id = parseBattleId((await params).id);
    const { game } = body.parse(await request.json());
    const user = await requireUser();
    return chooseGame(db, user, id, game, groupContext(request));
  });
}
