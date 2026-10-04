import { z } from "zod";
import { battleAnswer, parseBattleId } from "@/server/battles";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

const body = z.object({ round: z.number().int().min(0).max(20), choice: z.number().int().min(0).max(3) });

/** An answer to the open question. */
export function POST(request: Request, { params }: RouteContext<"/api/batallas/[id]/respuesta">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const id = parseBattleId((await params).id);
    const { round, choice } = body.parse(await request.json());
    const user = await requireUser();
    return battleAnswer(db, user, id, round, choice, groupContext(request));
  });
}
