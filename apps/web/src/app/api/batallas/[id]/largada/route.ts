import { z } from "zod";
import { battleStart, parseBattleId } from "@/server/battles";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

const body = z.object({ round: z.number().int().min(0).max(20), reactionMs: z.number().min(0).max(60_000).nullable(), falseStart: z.boolean() });

/** A start of Largada: the reaction the phone measured, or that it jumped. */
export function POST(request: Request, { params }: RouteContext<"/api/batallas/[id]/largada">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const id = parseBattleId((await params).id);
    const input = body.parse(await request.json());
    const user = await requireUser();
    return battleStart(db, user, id, input, groupContext(request));
  });
}
