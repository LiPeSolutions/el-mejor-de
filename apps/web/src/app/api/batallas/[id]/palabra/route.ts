import { z } from "zod";
import { battleWord, parseBattleId } from "@/server/battles";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

const body = z.object({ word: z.string().min(1).max(30) });

/** A word of Diez Letras: the server says if it counts and its points. */
export function POST(request: Request, { params }: RouteContext<"/api/batallas/[id]/palabra">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const id = parseBattleId((await params).id);
    const { word } = body.parse(await request.json());
    const user = await requireUser();
    return battleWord(db, user, id, word, groupContext(request));
  });
}
