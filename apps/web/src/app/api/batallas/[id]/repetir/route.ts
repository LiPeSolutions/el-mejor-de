import { z } from "zod";
import { battleRepeat, parseBattleId } from "@/server/battles";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

const body = z.object({ round: z.number().int().min(0).max(199), inputs: z.array(z.number().int().min(0).max(3)).max(30) });

/** A repetition of Secuencia: the colors the player tapped in this round. */
export function POST(request: Request, { params }: RouteContext<"/api/batallas/[id]/repetir">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const id = parseBattleId((await params).id);
    const input = body.parse(await request.json());
    const user = await requireUser();
    return battleRepeat(db, user, id, input, groupContext(request));
  });
}
