import { connection } from "next/server";
import { database } from "@/server/db";
import { handle } from "@/server/http";

/** Health check: is the app up, and can it reach the database? Details stay in the server logs. */
export async function GET() {
  await connection();
  return handle(async () => {
    const db = database();
    if (!db) return { ok: true, database: "not-configured" };
    try {
      await db.query("select 1");
      return { ok: true, database: "connected" };
    } catch (error) {
      console.error(JSON.stringify({ event: "database-unreachable", message: error instanceof Error ? error.message : String(error) }));
      return { ok: false, database: "error" };
    }
  });
}
