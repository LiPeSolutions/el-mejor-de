import { z } from "zod";
import { markCelebrationSeen } from "@/server/groups";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, requireUser } from "@/server/session";

const body = z.object({ id: z.uuid() });

/** I saw the celebration of a crown: it doesn't show up again. */
export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const { id } = body.parse(await request.json());
    await markCelebrationSeen(db, await requireUser(), id);
    return { ok: true };
  });
}
