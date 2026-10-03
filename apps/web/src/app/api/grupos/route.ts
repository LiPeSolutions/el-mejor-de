import { z } from "zod";
import type { GroupCreatedResponse, GroupsResponse } from "@/lib/group-types";
import { listGroups, newGroup } from "@/server/groups";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

/** My groups, with who leads each one this week. */
export function GET(request: Request) {
  return handle(async () => {
    const db = accountsDatabase();
    const user = await requireUser();
    return (await listGroups(db, user, groupContext(request))) satisfies GroupsResponse;
  });
}

const body = z.object({ name: z.string().max(100), emblem: z.string().max(20), color: z.string().max(20) });

/** Creates a group, with me as its owner. */
export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const input = body.parse(await request.json());
    const user = await requireUser();
    return { group: await newGroup(db, user, input, groupContext(request)) } satisfies GroupCreatedResponse;
  });
}
