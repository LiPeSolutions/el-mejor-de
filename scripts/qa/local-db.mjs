// A local Postgres (PGlite, in memory) with the repo's migrations and a sample of the places,
// for trying the app with accounts, groups and battles. See README.md.
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const root = new URL("../../", import.meta.url);
const port = Number(process.env.PORT || 5433);

const db = await PGlite.create();
// Supabase's own roles, which the migrations grant to and revoke from.
await db.exec("create role anon nologin; create role authenticated nologin;");
const migrations = new URL("supabase/migrations/", root);
for (const file of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) {
  await db.exec(readFileSync(new URL(file, migrations), "utf8"));
}
// In Supabase the places come from import-places.sql; here, a sample (Argentina, its provinces, the city and Chivilcoy).
await db.exec(readFileSync(new URL("supabase/scripts/places-sample.sql", root), "utf8"));

const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 10 });
await server.start();
console.log(`local database on 127.0.0.1:${port}`);

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
