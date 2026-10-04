import type { BattleView } from "@/lib/battle-types";
import { battleState, parseBattleId } from "@/server/battles";
import { handle } from "@/server/http";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

/** The battle as this player sees it now, with the server's clock. Phones ask every second or so. */
export function GET(request: Request, { params }: RouteContext<"/api/batallas/[id]">) {
  return handle(async () => {
    const db = accountsDatabase();
    const id = parseBattleId((await params).id);
    const user = await requireUser();
    return (await battleState(db, user, id, groupContext(request))) satisfies BattleView;
  });
}
