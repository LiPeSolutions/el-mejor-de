import type { InvitePreview, JoinResponse } from "@/lib/group-types";
import { joinWithCode, previewInvite } from "@/server/groups";
import { handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, currentUser, groupContext, requireUser } from "@/server/session";

/** The group behind an invitation, for its page. Works without an account. */
export function GET(request: Request, { params }: RouteContext<"/api/invitaciones/[codigo]">) {
  return handle(async () => {
    const db = accountsDatabase();
    const { codigo } = await params;
    return (await previewInvite(db, await currentUser(), codigo, groupContext(request))) satisfies InvitePreview;
  });
}

/** Joins the group with its invitation. */
export function POST(request: Request, { params }: RouteContext<"/api/invitaciones/[codigo]">) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const { codigo } = await params;
    return (await joinWithCode(db, await requireUser(), codigo, groupContext(request))) satisfies JoinResponse;
  });
}
