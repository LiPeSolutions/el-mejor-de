import type { Queryable } from './queryable';

/*
 * Largada (the reflexes game since it became a race, docs/PLAN.md §7): the
 * day's finished races, to run against the group or against the best of a
 * place. The starts come from each attempt's graded result.
 */

const ms = (column: string, as: string) => `floor(extract(epoch from ${column}) * 1000)::float8 as ${as}`;

export interface LargadaRace {
  userId: string;
  username: string;
  /** Validated by the app (parseAvatar in @repo/shared). */
  avatar: unknown;
  article: 'el' | 'la';
  score: number;
  /** The graded result as the app stored it (rounds, average…). */
  result: unknown;
  finishedAt: number;
}

interface RaceRow {
  user_id: string;
  username: string;
  avatar: string;
  article: 'el' | 'la';
  score: number;
  result: string;
  finished_at: number;
}

const toRace = (row: RaceRow): LargadaRace => ({
  userId: row.user_id,
  username: row.username,
  avatar: JSON.parse(row.avatar),
  article: row.article,
  score: row.score,
  result: JSON.parse(row.result),
  finishedAt: row.finished_at,
});

const RACE_COLUMNS = `a.user_id, u.username, u.avatar::text as avatar, u.article, a.score, a.result::text as result, ${ms('a.finished_at', 'finished_at')}`;

/** The Largadas these players finished that day (the daily challenge). */
export async function largadaRaces(db: Queryable, input: { userIds: readonly string[]; date: string }): Promise<LargadaRace[]> {
  if (input.userIds.length === 0) return [];
  const rows = await db.query<RaceRow>(
    `select ${RACE_COLUMNS}
     from game.attempts a join game.users u on u.id = a.user_id
     where a.user_id = any(string_to_array($1::text, ',')::uuid[]) and a.game_date = $2::date
       and a.game = 'reflexes' and a.status = 'finished' and a.result->>'version' = 'largada'
     order by a.finished_at`,
    [input.userIds.join(','), input.date],
  );
  return rows.map(toRace);
}

/**
 * The best Largada of the day in a place (a locality, a province or the
 * country), but this player's: the most points, and who got them first.
 */
export async function bestLargadaIn(db: Queryable, input: { placeId: string; date: string; exceptUserId: string | null }): Promise<LargadaRace | null> {
  const rows = await db.query<RaceRow>(
    `with area as (
       select l.id from game.places l
       join game.places d on d.id = l.parent_id
       join game.places p on p.id = d.parent_id
       where l.kind = 'locality' and (l.id = $1 or p.id = $1 or p.parent_id = $1)
     )
     select ${RACE_COLUMNS}
     from game.attempts a join game.users u on u.id = a.user_id
     where a.game_date = $2::date and a.game = 'reflexes' and a.status = 'finished' and a.result->>'version' = 'largada'
       and a.place_id in (select id from area)
       and ($3::uuid is null or a.user_id <> $3::uuid)
     order by a.score desc, a.finished_at
     limit 1`,
    [input.placeId, input.date, input.exceptUserId],
  );
  return rows[0] ? toRace(rows[0]) : null;
}
