import type { ProvincesResponse } from "@/lib/place-types";
import { handle } from "@/server/http";
import { provinces } from "@/server/places";
import { accountsDatabase } from "@/server/session";

/** The 24 provinces (the Ciudad de Buenos Aires counts as one). */
export function GET() {
  return handle(async () => (await provinces(accountsDatabase())) satisfies ProvincesResponse);
}
