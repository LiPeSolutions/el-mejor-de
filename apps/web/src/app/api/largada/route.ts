import type { LargadaGridResponse } from "@/lib/largada-types";
import { handle } from "@/server/http";
import { largadaGrid } from "@/server/largada";
import { accountsDatabase, currentUser } from "@/server/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Today's Largada grid: the times of my group (`?grupo=`, or the first one), or the ghost of my place. */
export function GET(request: Request) {
  return handle(async () => {
    const db = accountsDatabase();
    const user = await currentUser();
    const groupId = new URL(request.url).searchParams.get("grupo");
    return (await largadaGrid(db, user, groupId && UUID.test(groupId) ? groupId : null, Date.now())) satisfies LargadaGridResponse;
  });
}
