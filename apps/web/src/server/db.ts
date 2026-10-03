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
    // The transaction pooler doesn't support prepared statements.
    client = url ? postgres(url, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 10 }) : null;
  }
  const sql = client;
  if (!sql) return null;
  return {
    query: async <Row>(text: string, params: readonly unknown[] = []) =>
      (await sql.unsafe(text, params as postgres.ParameterOrJSON<never>[])) as unknown as Row[],
  };
}
