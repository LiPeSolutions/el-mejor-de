import type { Queryable } from './queryable';

/*
 * Places (docs/ARQUITECTURA.md §5): localities and their departments and
 * provinces, where each player competes, the location checks and the
 * rankings and crowns of each place. Times are epoch milliseconds.
 */

const ms = (column: string, as: string) => `floor(extract(epoch from ${column}) * 1000)::float8 as ${as}`;

export interface LocalityMatch {
  id: string;
  name: string;
  department: string | null;
  province: string | null;
  provinceId: string | null;
}

/** Same normalization as game.search_name, plus only letters, digits and spaces. */
export function searchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Localities whose name contains the text; names that start with it come
 * first. `provinceId` narrows it to one province; `exclude` leaves some out
 * (the city's generic locality).
 */
export async function searchLocalities(
  db: Queryable,
  text: string,
  options: { provinceId?: string | null; limit?: number; exclude?: readonly string[] } = {},
): Promise<LocalityMatch[]> {
  const query = searchText(text);
  if (query.length < 2) return [];
  const rows = await db.query<Omit<LocalityMatch, 'provinceId'> & { province_id: string | null }>(
    `select locality.id, locality.name,
       department.name as department,
       coalesce(province.name, direct_province.name) as province,
       coalesce(province.id, direct_province.id) as province_id
     from game.places as locality
     left join game.places as department on department.id = locality.parent_id and department.kind = 'department'
     left join game.places as province on province.id = department.parent_id
     left join game.places as direct_province on direct_province.id = locality.parent_id and direct_province.kind = 'province'
     where locality.kind = 'locality' and locality.search_name like '%' || $1 || '%'
       and ($3::text is null or coalesce(province.id, direct_province.id) = $3)
       and not (locality.id = any(string_to_array($4::text, ',')))
     order by (locality.search_name like $1 || '%') desc, length(locality.name), locality.name
     limit $2::int`,
    [query, options.limit ?? 10, options.provinceId ?? null, (options.exclude ?? []).join(',')],
  );
  return rows.map(({ province_id, ...match }) => ({ ...match, provinceId: province_id }));
}

export interface Province {
  id: string;
  name: string;
}

export async function listProvinces(db: Queryable): Promise<Province[]> {
  return db.query<Province>(`select id, name from game.places where kind = 'province' order by search_name`);
}

export interface Place {
  id: string;
  kind: 'country' | 'province' | 'department' | 'locality';
  name: string;
  parentId: string | null;
}

export async function getPlace(db: Queryable, id: string): Promise<Place | null> {
  const rows = await db.query<{ id: string; kind: Place['kind']; name: string; parent_id: string | null }>(
    `select id, kind, name, parent_id from game.places where id = $1`,
    [id],
  );
  const row = rows[0];
  return row ? { id: row.id, kind: row.kind, name: row.name, parentId: row.parent_id } : null;
}

export interface Locality {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radiusKm: number | null;
  departmentId: string;
  department: string;
  provinceId: string;
  province: string;
  countryId: string;
}

interface LocalityRow {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radius_km: number | null;
  department_id: string;
  department: string;
  province_id: string;
  province: string;
  country_id: string;
  km?: number;
}

const LOCALITY_SELECT = `select l.id, l.name, l.lat, l.lon, l.radius_km, d.id as department_id, d.name as department,
    p.id as province_id, p.name as province, p.parent_id as country_id`;
const LOCALITY_FROM = `from game.places l
  join game.places d on d.id = l.parent_id and d.kind = 'department'
  join game.places p on p.id = d.parent_id and p.kind = 'province'`;

function toLocality(row: LocalityRow): Locality {
  return {
    id: row.id,
    name: row.name,
    lat: row.lat,
    lon: row.lon,
    radiusKm: row.radius_km,
    departmentId: row.department_id,
    department: row.department,
    provinceId: row.province_id,
    province: row.province,
    countryId: row.country_id,
  };
}

/** A locality with its department, province and country. Null if the id isn't a locality. */
export async function getLocality(db: Queryable, id: string): Promise<Locality | null> {
  const rows = await db.query<LocalityRow>(`${LOCALITY_SELECT} ${LOCALITY_FROM} where l.kind = 'locality' and l.id = $1`, [id]);
  return rows[0] ? toLocality(rows[0]) : null;
}

export interface NearbyLocality extends Locality {
  /** Distance from the position, in km. */
  km: number;
}

/**
 * The localities closest to a position, nearest first. It looks within
 * about 60 km, and further if there's nothing that close.
 */
export async function nearbyLocalities(db: Queryable, point: { lat: number; lon: number }, limit = 25): Promise<NearbyLocality[]> {
  for (const degrees of [0.6, 2.5]) {
    const rows = await db.query<LocalityRow & { km: number }>(
      `select * from (
         ${LOCALITY_SELECT},
           2 * 6371 * asin(least(1, sqrt(
             power(sin(radians(l.lat - $1) / 2), 2) + cos(radians($1)) * cos(radians(l.lat)) * power(sin(radians(l.lon - $2) / 2), 2)
           ))) as km
         ${LOCALITY_FROM}
         where l.kind = 'locality' and l.lat is not null
           and l.lat between $1 - $3 and $1 + $3 and l.lon between $2 - $3 * 1.25 and $2 + $3 * 1.25
       ) as candidates
       order by km
       limit $4::int`,
      [point.lat, point.lon, degrees, limit],
    );
    if (rows.length > 0) return rows.map((row) => ({ ...toLocality(row), km: row.km }));
  }
  return [];
}

/* ───────────── Where each player competes ───────────── */

/** Changes the player's locality. `verifiedAt` (epoch ms) when the GPS just confirmed it, else null. */
export async function setUserPlace(db: Queryable, userId: string, placeId: string, verifiedAt: number | null): Promise<void> {
  await db.query(
    `update game.users set place_id = $2, place_verified_at = to_timestamp($3::float8 / 1000), updated_at = now() where id = $1::uuid`,
    [userId, placeId, verifiedAt],
  );
}

/** The GPS confirmed the player's current locality. */
export async function markPlaceVerified(db: Queryable, userId: string, at: number): Promise<void> {
  await db.query(`update game.users set place_verified_at = to_timestamp($2::float8 / 1000), updated_at = now() where id = $1::uuid`, [userId, at]);
}

export type LocationResult = 'verified' | 'too-far';

export async function recordLocationCheck(db: Queryable, check: { userId: string; placeId: string; result: LocationResult; at: number }): Promise<void> {
  await db.query(`insert into game.location_checks (user_id, place_id, result, at) values ($1::uuid, $2, $3, to_timestamp($4::float8 / 1000))`, [
    check.userId,
    check.placeId,
    check.result,
    check.at,
  ]);
}

/** Location checks since `since` (epoch ms), for the hourly limit. */
export async function countLocationChecksSince(db: Queryable, userId: string, since: number): Promise<number> {
  const rows = await db.query<{ count: number }>(
    `select count(*)::int as count from game.location_checks where user_id = $1::uuid and at > to_timestamp($2::float8 / 1000)`,
    [userId, since],
  );
  return rows[0]?.count ?? 0;
}

/** Whether a check passed in this locality between two moments (epoch ms). */
export async function verifiedBetween(db: Queryable, userId: string, placeId: string, from: number, to: number): Promise<boolean> {
  const rows = await db.query<{ verified: boolean }>(
    `select exists (
       select 1 from game.location_checks
       where user_id = $1::uuid and place_id = $2 and result = 'verified'
         and at >= to_timestamp($3::float8 / 1000) and at < to_timestamp($4::float8 / 1000)
     ) as verified`,
    [userId, placeId, from, to],
  );
  return rows[0]?.verified ?? false;
}

/**
 * The player's challenges from `fromDate` on that weren't in any place's
 * ranking yet (played before verifying) go to this one. Returns how many.
 */
export async function assignUnplacedAttempts(db: Queryable, input: { userId: string; placeId: string; fromDate: string }): Promise<number> {
  const rows = await db.query<{ id: string }>(
    `update game.attempts set place_id = $2
     where user_id = $1::uuid and place_id is null and game_date >= $3::date
     returning id`,
    [input.userId, input.placeId, input.fromDate],
  );
  return rows.length;
}

/** The localities where the player has challenges between two dates (they may have moved). */
export async function localitiesPlayed(db: Queryable, userId: string, from: string, to: string): Promise<string[]> {
  const rows = await db.query<{ place_id: string }>(
    `select distinct place_id from game.attempts
     where user_id = $1::uuid and place_id is not null and game_date between $2::date and $3::date`,
    [userId, from, to],
  );
  return rows.map((row) => row.place_id);
}

/* ───────────── Rankings ───────────── */

/**
 * The players of a place (a locality, a province or the country) between
 * two dates, with the same rules as the groups: the best 5 days, and on a
 * tie whoever reached that score first (the last challenge with points of
 * the days that count). Each challenge counts where it was played.
 * `$1` place, `$2`–`$3` dates, `$4`–`$5` the week (epoch ms) for the
 * crown: who passed a location check in it.
 */
const STANDINGS = `
  with area as (
    select l.id from game.places l
    join game.places d on d.id = l.parent_id
    join game.places p on p.id = d.parent_id
    where l.kind = 'locality' and (l.id = $1 or p.id = $1 or p.parent_id = $1)
  ), played as (
    select a.user_id, a.game_date, a.score, a.finished_at, a.place_id
    from game.attempts a
    where a.status = 'finished' and a.user_id is not null
      and a.game_date between $2::date and $3::date
      and a.place_id in (select id from area)
  ), days as (
    select user_id, game_date, sum(score)::int as total, max(finished_at) filter (where score > 0) as last_point
    from played group by user_id, game_date
  ), counted as (
    select *, row_number() over (partition by user_id order by total desc, game_date) as n from days
  ), totals as (
    select user_id, coalesce(sum(total) filter (where n <= 5), 0)::int as score, count(*)::int as days_played,
      max(total)::int as best_day, max(last_point) filter (where n <= 5) as reached_at
    from counted group by user_id
  ), latest as (
    select distinct on (user_id) user_id, place_id from played order by user_id, finished_at desc
  ), ranked as (
    select t.*, latest.place_id,
      exists (
        select 1 from game.location_checks c
        where c.user_id = t.user_id and c.result = 'verified' and c.place_id in (select id from area)
          and c.at >= to_timestamp($4::float8 / 1000) and c.at < to_timestamp($5::float8 / 1000)
      ) as verified_in_week,
      row_number() over (order by t.score desc, t.reached_at asc nulls last, t.user_id) as position,
      count(*) over () as players
    from totals t join latest on latest.user_id = t.user_id
  ), holder as (
    select min(position) as position from ranked where verified_in_week and score > 0
  )`;

const STANDING_COLUMNS = `r.user_id, u.username, u.avatar::text as avatar, u.article, r.place_id, pl.name as place_name,
  r.score, r.days_played, r.best_day, ${ms('r.reached_at', 'reached_at')}, r.verified_in_week,
  r.position::int as position, r.players::int as players, (r.position = holder.position) as holder`;

export interface PlaceStanding {
  userId: string;
  username: string;
  /** Validated by the app (parseAvatar in @repo/shared). */
  avatar: unknown;
  article: 'el' | 'la';
  /** Where they played last in the period. */
  localityId: string;
  locality: string;
  score: number;
  daysPlayed: number;
  bestDay: number;
  reachedAt: number | null;
  /** A location check passed in this place during the week: they can win its crown. */
  verifiedInWeek: boolean;
  position: number;
  /** The live crown: the first one who can win it. */
  holder: boolean;
}

interface StandingRow {
  user_id: string;
  username: string;
  avatar: string;
  article: 'el' | 'la';
  place_id: string;
  place_name: string;
  score: number;
  days_played: number;
  best_day: number;
  reached_at: number | null;
  verified_in_week: boolean;
  position: number;
  players: number;
  holder: boolean | null;
}

function toStanding(row: StandingRow): PlaceStanding {
  return {
    userId: row.user_id,
    username: row.username,
    avatar: JSON.parse(row.avatar),
    article: row.article,
    localityId: row.place_id,
    locality: row.place_name,
    score: row.score,
    daysPlayed: row.days_played,
    bestDay: row.best_day,
    reachedAt: row.reached_at,
    verifiedInWeek: row.verified_in_week,
    position: row.position,
    holder: row.holder === true,
  };
}

export interface PlaceRankingQuery {
  placeId: string;
  from: string;
  to: string;
  /** The week, for who can win the crown (epoch ms). */
  weekFrom: number;
  weekTo: number;
  /** Also brings this player's row, wherever they are. */
  meId?: string | null;
  limit?: number;
}

/** The top of a place's ranking, plus the player asking and whoever has the crown. */
export async function placeRanking(db: Queryable, query: PlaceRankingQuery): Promise<{ players: number; rows: PlaceStanding[] }> {
  const rows = await db.query<StandingRow>(
    `${STANDINGS}
     select ${STANDING_COLUMNS}
     from ranked r cross join holder
     join game.users u on u.id = r.user_id
     join game.places pl on pl.id = r.place_id
     where r.position <= $6::int or r.user_id = $7::uuid or r.position = holder.position
     order by r.position`,
    [query.placeId, query.from, query.to, query.weekFrom, query.weekTo, query.limit ?? 50, query.meId ?? null],
  );
  return { players: rows[0] ? (rows[0] as StandingRow).players : 0, rows: rows.map(toStanding) };
}

/** Who can win a place's crown for a week: the first two who passed a check, and how many played. */
export async function placeWeekLeaders(db: Queryable, query: Omit<PlaceRankingQuery, 'meId' | 'limit'>): Promise<{ players: number; leaders: PlaceStanding[] }> {
  const rows = await db.query<StandingRow>(
    `${STANDINGS}
     select ${STANDING_COLUMNS}
     from ranked r cross join holder
     join game.users u on u.id = r.user_id
     join game.places pl on pl.id = r.place_id
     where (r.verified_in_week and r.score > 0) or r.position = 1
     order by r.position
     limit 3`,
    [query.placeId, query.from, query.to, query.weekFrom, query.weekTo],
  );
  const players = rows[0]?.players ?? 0;
  return { players, leaders: rows.map(toStanding).filter((row) => row.verifiedInWeek && row.score > 0).slice(0, 2) };
}

/* ───────────── Crowns of places ───────────── */

/** Of these weeks (Mondays), the ones whose crown for the place isn't decided yet. */
export async function undecidedPlaceWeeks(db: Queryable, placeId: string, weeks: readonly string[]): Promise<string[]> {
  if (weeks.length === 0) return [];
  const rows = await db.query<{ week: string }>(
    `select week::text as week from unnest(string_to_array($2::text, ',')::date[]) as week
     where not exists (select 1 from game.place_weeks w where w.place_id = $1 and w.week_start = week)
     order by week`,
    [placeId, weeks.join(',')],
  );
  return rows.map((row) => row.week);
}

export async function markPlaceWeekDecided(db: Queryable, placeId: string, week: string): Promise<void> {
  await db.query(`insert into game.place_weeks (place_id, week_start) values ($1, $2::date) on conflict do nothing`, [placeId, week]);
}

export interface NewPlaceCrown {
  placeId: string;
  weekStart: string;
  userId: string;
  score: number;
  daysPlayed: number;
  players: number;
  runnerUpId: string | null;
  runnerUpScore: number | null;
  /** The place as the crown names it: "Caballito", "la Ciudad de Buenos Aires". */
  title: string;
}

/** Records a place's crown for a week. Deciding it twice keeps the first. */
export async function recordPlaceCrown(db: Queryable, crown: NewPlaceCrown): Promise<void> {
  await db.query(
    `insert into game.crowns (week_start, place_id, user_id, score, days_played, players, runner_up_id, runner_up_score, title)
     values ($1::date, $2, $3::uuid, $4::int, $5::smallint, $6::smallint, $7::uuid, $8::int, $9)
     on conflict do nothing`,
    [crown.weekStart, crown.placeId, crown.userId, crown.score, crown.daysPlayed, Math.min(crown.players, 32767), crown.runnerUpId, crown.runnerUpScore, crown.title],
  );
}
