import { z } from "zod";
import type { AccountResponse } from "@/lib/account-types";
import { changeProfile, toPublicAccount } from "@/server/accounts";
import { HttpError, handle } from "@/server/http";
import { assertSameOrigin } from "@/server/request";
import { accountsDatabase, currentUser } from "@/server/session";

const body = z.object({ avatar: z.unknown().optional(), article: z.unknown().optional() });

/** Changes the character and/or "El / La Mejor". */
export function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    const db = accountsDatabase();
    const input = body.parse(await request.json());
    const user = await currentUser();
    if (!user) throw new HttpError(401, "signed-out");
    return { account: toPublicAccount(await changeProfile(db, user.id, input)) } satisfies AccountResponse;
  });
}
