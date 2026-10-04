import { z } from "zod";
import { battleQuestion, parseBattleId } from "@/server/battles";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

const body = z.object({ round: z.number().int().min(0).max(20) });

/** A question of Cinco Preguntas, with this player's order of options. */
export function POST(request: Request, { params }: RouteContext<"/api/batallas/[id]/pregunta">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const id = parseBattleId((await params).id);
    const { round } = body.parse(await request.json());
    const user = await requireUser();
    return battleQuestion(db, user, id, round, groupContext(request));
  });
}
