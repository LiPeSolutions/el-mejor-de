import type { Queryable } from './queryable';

export type AttemptStatus = 'started' | 'finished';

export interface Attempt {
  id: string;
  deviceId: string;
  userId: string | null;
  /** Game date, YYYY-MM-DD in Argentina time. */
  date: string;
  slot: number;
  game: string;
  status: AttemptStatus;
  /** Epoch milliseconds. */
  startedAt: number;
  finishedAt: number | null;
  score: number | null;
  result: unknown;
}

interface AttemptRow {
  id: string;
  device_id: string;
  user_id: string | null;
  game_date: string;
  slot: number;
  game: string;
  status: AttemptStatus;
  started_at: number;
  finished_at: number | null;
  score: number | null;
  result: string | null;
}

// Dates and JSON as text, and times as epoch milliseconds, so every driver
// returns the same thing. (JSON goes in as text too: see finishAttempt.)
const COLUMNS = `id, device_id, user_id, game_date::text as game_date, slot, game, status,
  floor(extract(epoch from started_at) * 1000)::float8 as started_at,
  floor(extract(epoch from finished_at) * 1000)::float8 as finished_at,
  score, result::text as result`;

function toAttempt(row: AttemptRow): Attempt {
  return {
    id: row.id,
    deviceId: row.device_id,
    userId: row.user_id,
    date: row.game_date,
    slot: row.slot,
    game: row.game,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    score: row.score,
    result: row.result === null ? null : JSON.parse(row.result),
  };
}

export interface NewAttempt {
  id: string;
  deviceId: string;
  userId?: string | null;
  date: string;
  slot: number;
  game: string;
  startedAt: number;
}

/**
 * Starts a daily challenge. If this browser (or this account) already took
 * the slot, nothing is written and the existing attempt comes back instead.
 */
export async function claimAttempt(db: Queryable, input: NewAttempt): Promise<{ created: boolean; attempt: Attempt }> {
  const userId = input.userId ?? null;
  const inserted = await db.query<AttemptRow>(
    `insert into game.attempts (id, device_id, user_id, game_date, slot, game, started_at)
     values ($1::uuid, $2::uuid, $3::uuid, $4::date, $5::smallint, $6, to_timestamp($7::float8 / 1000))
     on conflict do nothing
     returning ${COLUMNS}`,
    [input.id, input.deviceId, userId, input.date, input.slot, input.game, input.startedAt],
  );
  if (inserted[0]) return { created: true, attempt: toAttempt(inserted[0]) };

  const existing = await db.query<AttemptRow>(
    `select ${COLUMNS} from game.attempts
     where game_date = $3::date and slot = $4::smallint
       and (device_id = $1::uuid or ($2::uuid is not null and user_id = $2::uuid))
     order by started_at
     limit 1`,
    [input.deviceId, userId, input.date, input.slot],
  );
  if (!existing[0]) throw new Error(`attempt ${input.id} conflicted without a matching attempt`);
  return { created: false, attempt: toAttempt(existing[0]) };
}

export interface Grade {
  finishedAt: number;
  score: number;
  result: unknown;
  flags: readonly unknown[];
}

/**
 * Records the graded result. A challenge is graded only once: if the attempt
 * was already finished, it comes back unchanged (updated: false). Null when
 * there is no such attempt.
 */
export async function finishAttempt(db: Queryable, id: string, grade: Grade): Promise<{ updated: boolean; attempt: Attempt } | null> {
  // JSON is sent as text and cast in SQL: drivers disagree on how to encode a
  // jsonb parameter (postgres.js would store a string inside the JSON).
  const updated = await db.query<AttemptRow>(
    `update game.attempts
     set status = 'finished', finished_at = to_timestamp($2::float8 / 1000), score = $3::int,
         result = $4::text::jsonb, flags = $5::text::jsonb
     where id = $1::uuid and status = 'started'
     returning ${COLUMNS}`,
    [id, grade.finishedAt, grade.score, JSON.stringify(grade.result), JSON.stringify(grade.flags)],
  );
  if (updated[0]) return { updated: true, attempt: toAttempt(updated[0]) };
  const existing = await getAttempt(db, id);
  return existing ? { updated: false, attempt: existing } : null;
}

export async function getAttempt(db: Queryable, id: string): Promise<Attempt | null> {
  const rows = await db.query<AttemptRow>(`select ${COLUMNS} from game.attempts where id = $1::uuid`, [id]);
  return rows[0] ? toAttempt(rows[0]) : null;
}

/**
 * When a trivia question was first shown in this attempt. The first call
 * stores `now`; later calls return that same moment, so asking for the
 * question again doesn't restart its clock. Null when the attempt doesn't
 * exist or is already finished.
 */
export async function questionServedAt(db: Queryable, attemptId: string, index: number, now: number): Promise<number | null> {
  const key = String(index);
  const rows = await db.query<{ served_at: number }>(
    `update game.attempts
     set progress = jsonb_set(progress, array['served', $2], coalesce(progress #> array['served', $2], to_jsonb($3::float8)))
     where id = $1::uuid and status = 'started'
     returning (progress #>> array['served', $2])::float8 as served_at`,
    [attemptId, key, now],
  );
  return rows[0]?.served_at ?? null;
}
