import { z } from "zod";
import type { BattleCreatedResponse } from "@/lib/battle-types";
import { openRoom } from "@/server/battles";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

const body = z.object({ groupId: z.string().uuid().nullable().optional(), game: z.string().max(20).optional() });

/** Opens a battle room, from a group or loose. A group with one open joins that one. */
export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const input = body.parse(await request.json());
    const user = await requireUser();
    return (await openRoom(db, user, { groupId: input.groupId ?? null, game: input.game }, groupContext(request))) satisfies BattleCreatedResponse;
  });
}
