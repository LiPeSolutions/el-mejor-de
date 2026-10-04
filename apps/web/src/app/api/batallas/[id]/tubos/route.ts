import { z } from "zod";
import { battleSolve, parseBattleId } from "@/server/battles";
import { waterSortLevelLog } from "@/server/challenges";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

const body = waterSortLevelLog.extend({ round: z.number().int().min(0).max(2) });

/** A solved board of Tubitos: the steps the phone played, for the server to replay and score. */
export function POST(request: Request, { params }: RouteContext<"/api/batallas/[id]/tubos">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const id = parseBattleId((await params).id);
    const { round, events, durationMs } = body.parse(await request.json());
    const user = await requireUser();
    return battleSolve(db, user, id, { round, log: { events, durationMs } }, groupContext(request));
  });
}
