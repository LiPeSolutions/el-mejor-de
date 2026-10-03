import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { Queryable } from './queryable';

const MIGRATIONS = join(import.meta.dirname, '../../../supabase/migrations');

export interface TestDatabase extends Queryable {
  /** Runs `fn` as another role (e.g. 'app_server' or 'anon'), to check permissions. */
  as<T>(role: string, fn: (db: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/**
 * A fresh Postgres in memory with every migration applied. Supabase's own
 * roles are stubbed, since a plain Postgres doesn't have them.
 */
export async function testDatabase(): Promise<TestDatabase> {
  const pg = new PGlite();
  await pg.exec('create role anon nologin; create role authenticated nologin;');
  for (const file of readdirSync(MIGRATIONS).filter((name) => name.endsWith('.sql')).sort()) {
    await pg.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  }
  const query: Queryable['query'] = async <Row>(text: string, params: readonly unknown[] = []) =>
    (await pg.query<Row>(text, [...params])).rows;
  return {
    query,
    async as(role, fn) {
      await pg.exec(`set role ${role}`);
      try {
        return await fn({ query });
      } finally {
        await pg.exec('reset role');
      }
    },
    close: () => pg.close(),
  };
}
