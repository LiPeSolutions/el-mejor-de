import type { BattlePreview } from "@/lib/battle-types";
import { joinWithCode, previewRoom } from "@/server/battles";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, currentUser, groupContext, requireUser } from "@/server/session";

/** The battle behind a link or a code, for its page. Works without an account. */
export function GET(request: Request, { params }: RouteContext<"/api/batallas/codigo/[codigo]">) {
  return handle(async () => {
    const db = accountsDatabase();
    const { codigo } = await params;
    return (await previewRoom(db, await currentUser(), codigo, groupContext(request))) satisfies BattlePreview;
  });
}

/** Joins the battle with its code. */
export function POST(request: Request, { params }: RouteContext<"/api/batallas/codigo/[codigo]">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const { codigo } = await params;
    return await joinWithCode(db, await requireUser(), codigo, groupContext(request));
  });
}
