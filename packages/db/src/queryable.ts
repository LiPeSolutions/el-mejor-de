/**
 * The one thing the queries need from a database connection: run SQL with
 * $1, $2… parameters and get rows back. The web server adapts postgres.js to
 * it; the tests adapt PGlite (Postgres in memory).
 */
export interface Queryable {
  query<Row>(text: string, params?: readonly unknown[]): Promise<Row[]>;
}
