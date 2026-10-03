import type { AvailabilityResponse } from "@/lib/account-types";
import { checkAvailability } from "@/server/accounts";
import { handle } from "@/server/http";
import { accountsDatabase } from "@/server/session";

/** Whether an apodo is free: `?nombre=Tincho`. */
export function GET(request: Request) {
  return handle(async () => {
    const name = new URL(request.url).searchParams.get("nombre") ?? "";
    return (await checkAvailability(accountsDatabase(), name.slice(0, 100))) satisfies AvailabilityResponse;
  });
}
