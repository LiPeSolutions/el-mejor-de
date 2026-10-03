import "server-only";
import type { Queryable } from "@repo/db";
import postgres from "postgres";

let client: postgres.Sql | null | undefined;

/**
 * The game database (Supabase Postgres, through its transaction pooler), or
 * null when DATABASE_URL isn't set: local development and CI run without one.
 */
export function database(): Queryable | null {
  if (client === undefined) {
    const url = process.env.DATABASE_URL;
    // The transaction pooler doesn't support prepared statements. The local
    // test database (PGlite) mixes up queries from parallel connections, so
    // there DATABASE_POOL_MAX=1.
    const max = Number(process.env.DATABASE_POOL_MAX) || 5;
    client = url ? postgres(url, { prepare: false, max, idle_timeout: 20, connect_timeout: 10 }) : null;
  }
  const sql = client;
  if (!sql) return null;
  return {
    query: async <Row>(text: string, params: readonly unknown[] = []) =>
      (await sql.unsafe(text, params as postgres.ParameterOrJSON<never>[])) as unknown as Row[],
  };
}
