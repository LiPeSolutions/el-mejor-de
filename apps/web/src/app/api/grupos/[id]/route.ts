import { z } from "zod";
import type { GroupCreatedResponse, GroupDetailResponse } from "@/lib/group-types";
import { editGroup, groupDetail, parseGroupId } from "@/server/groups";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, groupContext, requireUser } from "@/server/session";

/** The group with its ranking of the day and of the week. Only for its members. */
export function GET(request: Request, { params }: RouteContext<"/api/grupos/[id]">) {
  return handle(async () => {
    const db = accountsDatabase();
    const id = parseGroupId((await params).id);
    const user = await requireUser();
    return (await groupDetail(db, user, id, groupContext(request))) satisfies GroupDetailResponse;
  });
}

const body = z.object({ name: z.string().max(100).optional(), emblem: z.string().max(20).optional(), color: z.string().max(20).optional() });

/** The owner changes the name, the emblem or the color. */
export function POST(request: Request, { params }: RouteContext<"/api/grupos/[id]">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const id = parseGroupId((await params).id);
    const input = body.parse(await request.json());
    const user = await requireUser();
    return { group: await editGroup(db, user, id, input, groupContext(request)) } satisfies GroupCreatedResponse;
  });
}
