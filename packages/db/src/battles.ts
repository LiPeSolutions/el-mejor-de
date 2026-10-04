import type { Queryable } from './queryable';

/*
 * Live battles (docs/PLAN.md §8): rooms, who's in, each match played in
 * them and every move. The rules (who can do what, when a round closes)
 * live in the web server and @repo/games; these are the queries. Times are
 * epoch milliseconds, written with the web server's clock.
 */

const ms = (column: string, as: string) => `floor(extract(epoch from ${column}) * 1000)::float8 as ${as}`;
const at = (param: string) => `to_timestamp(${param}::float8 / 1000)`;
/*
 * JSON and arrays travel as text and are cast in SQL ($1::text::jsonb):
 * typed as jsonb, postgres.js would store the text as a JSON string.
 */
const array = (param: string, type: 'text' | 'uuid') =>
  `coalesce((select array_agg(value::${type}) from jsonb_array_elements_text(${param}::text::jsonb)), '{}'::${type}[])`;

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505';
}

/* ───────────── Rooms ───────────── */

export interface Battle {
  id: string;
  code: string;
  groupId: string | null;
  hostId: string;
  createdBy: string;
  game: string;
  /** When the host went back to choose another game. */
  lobbyAt: number | null;
  usedQuestions: string[];
  createdAt: number;
  closedAt: number | null;
}

interface BattleRow {
  id: string;
  code: string;
  group_id: string | null;
  host_id: string;
  created_by: string;
  game: string;
  lobby_at: number | null;
  used_questions: string[];
  created_at: number;
  closed_at: number | null;
}

const BATTLE_COLUMNS = `b.id, b.code, b.group_id, b.host_id, b.created_by, b.game, ${ms('b.lobby_at', 'lobby_at')}, b.used_questions,
  ${ms('b.created_at', 'created_at')}, ${ms('b.closed_at', 'closed_at')}`;

function toBattle(row: BattleRow): Battle {
  return {
    id: row.id,
    code: row.code,
    groupId: row.group_id,
    hostId: row.host_id,
    createdBy: row.created_by,
    game: row.game,
    lobbyAt: row.lobby_at,
    usedQuestions: row.used_questions ?? [],
    createdAt: row.created_at,
    closedAt: row.closed_at,
  };
}

/** Opens a room with its creator in it, as the host. Null if the code is taken by another open room. */
export async function createBattle(db: Queryable, input: { code: string; groupId: string | null; userId: string; game: string; at: number }): Promise<Battle | null> {
  try {
    const rows = await db.query<{ id: string }>(
      `with created as (
         insert into game.battles (code, group_id, host_id, created_by, game, created_at)
         values ($1, $2::uuid, $3::uuid, $3::uuid, $4, ${at('$5')})
         on conflict do nothing
         returning id, created_by, created_at
       ), host as (
         insert into game.battle_players (battle_id, user_id, joined_at, seen_at)
         select id, created_by, created_at, created_at from created
       )
       select id from created`,
      [input.code, input.groupId, input.userId, input.game, input.at],
    );
    return rows[0] ? getBattle(db, rows[0].id) : null;
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }
}

export async function getBattle(db: Queryable, id: string): Promise<Battle | null> {
  const rows = await db.query<BattleRow>(`select ${BATTLE_COLUMNS} from game.battles b where b.id = $1::uuid`, [id]);
  return rows[0] ? toBattle(rows[0]) : null;
}

/** The open room with this code. */
export async function findOpenBattle(db: Queryable, code: string): Promise<Battle | null> {
  const rows = await db.query<BattleRow>(`select ${BATTLE_COLUMNS} from game.battles b where b.code = $1 and b.closed_at is null`, [code]);
  return rows[0] ? toBattle(rows[0]) : null;
}

/** The group's open room where someone was around after `activeSince`, the newest. */
export async function openGroupBattle(db: Queryable, groupId: string, activeSince: number): Promise<Battle | null> {
  const rows = await db.query<BattleRow>(
    `select ${BATTLE_COLUMNS} from game.battles b
     where b.group_id = $1::uuid and b.closed_at is null
       and exists (select 1 from game.battle_players p where p.battle_id = b.id and p.left_at is null and p.seen_at > ${at('$2')})
     order by b.created_at desc
     limit 1`,
    [groupId, activeSince],
  );
  return rows[0] ? toBattle(rows[0]) : null;
}

/** The open rooms this player is in. */
export async function playerOpenBattles(db: Queryable, userId: string): Promise<string[]> {
  const rows = await db.query<{ id: string }>(
    `select b.id from game.battle_players p join game.battles b on b.id = p.battle_id
     where p.user_id = $1::uuid and p.left_at is null and b.closed_at is null`,
    [userId],
  );
  return rows.map((row) => row.id);
}

export async function countBattlesCreatedSince(db: Queryable, userId: string, since: number): Promise<number> {
  const rows = await db.query<{ count: number }>(
    `select count(*)::int as count from game.battles where created_by = $1::uuid and created_at > ${at('$2')}`,
    [userId, since],
  );
  return rows[0]?.count ?? 0;
}

export async function setBattleGame(db: Queryable, battleId: string, game: string): Promise<void> {
  await db.query(`update game.battles set game = $2 where id = $1::uuid and closed_at is null`, [battleId, game]);
}

/** The host goes back to choose another game, after a match. */
export async function setBattleLobby(db: Queryable, battleId: string, when: number): Promise<void> {
  await db.query(`update game.battles set lobby_at = ${at('$2')} where id = $1::uuid`, [battleId, when]);
}

export async function closeBattle(db: Queryable, battleId: string, when: number): Promise<void> {
  await db.query(`update game.battles set closed_at = ${at('$2')} where id = $1::uuid and closed_at is null`, [battleId, when]);
}

/** Questions played in the room, so the next match brings new ones. */
export async function addUsedQuestions(db: Queryable, battleId: string, ids: readonly string[]): Promise<void> {
  await db.query(`update game.battles set used_questions = used_questions || ${array('$2', 'text')} where id = $1::uuid`, [battleId, JSON.stringify(ids)]);
}

export async function resetUsedQuestions(db: Queryable, battleId: string): Promise<void> {
  await db.query(`update game.battles set used_questions = '{}' where id = $1::uuid`, [battleId]);
}

/* ───────────── Who's in ───────────── */

export interface BattlePlayer {
  userId: string;
  username: string;
  /** Validated by the app (parseAvatar in @repo/shared). */
  avatar: unknown;
  article: 'el' | 'la';
  joinedAt: number;
  leftAt: number | null;
  removedAt: number | null;
  seenAt: number;
}

/** Everyone who was ever in the room (who left too, for the matches they played), in the order they came. */
export async function battlePlayers(db: Queryable, battleId: string): Promise<BattlePlayer[]> {
  const rows = await db.query<{
    user_id: string;
    username: string;
    avatar: string;
    article: 'el' | 'la';
    joined_at: number;
    left_at: number | null;
    removed_at: number | null;
    seen_at: number;
  }>(
    `select p.user_id, u.username, u.avatar::text as avatar, u.article,
       ${ms('p.joined_at', 'joined_at')}, ${ms('p.left_at', 'left_at')}, ${ms('p.removed_at', 'removed_at')}, ${ms('p.seen_at', 'seen_at')}
     from game.battle_players p join game.users u on u.id = p.user_id
     where p.battle_id = $1::uuid
     order by p.joined_at, p.user_id`,
    [battleId],
  );
  return rows.map((row) => ({
    userId: row.user_id,
    username: row.username,
    avatar: JSON.parse(row.avatar),
    article: row.article,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
    removedAt: row.removed_at,
    seenAt: row.seen_at,
  }));
}

export type BattleJoin = 'joined' | 'already-in' | 'full' | 'removed' | 'closed';

/** Puts the player in the room, or back in if they had left. Someone the host took out can't come back. */
export async function joinBattle(db: Queryable, input: { battleId: string; userId: string; maxPlayers: number; at: number }): Promise<BattleJoin> {
  const rows = await db.query<{ outcome: BattleJoin }>(
    `with target as (
       select b.id, b.closed_at from game.battles b where b.id = $1::uuid for update
     ), previous as (
       select p.left_at, p.removed_at from game.battle_players p where p.battle_id = $1::uuid and p.user_id = $2::uuid
     ), verdict as (
       select case
         when t.closed_at is not null then 'closed'
         when exists (select 1 from previous where removed_at is not null) then 'removed'
         when exists (select 1 from previous where left_at is null) then 'already-in'
         when (select count(*) from game.battle_players p where p.battle_id = $1::uuid and p.left_at is null) >= $3::int then 'full'
         else 'joined'
       end as outcome
       from target t
     ), joined as (
       insert into game.battle_players (battle_id, user_id, joined_at, seen_at)
       select $1::uuid, $2::uuid, ${at('$4')}, ${at('$4')} from verdict where outcome = 'joined'
       on conflict (battle_id, user_id) do update
         set joined_at = excluded.joined_at, seen_at = excluded.seen_at, left_at = null
         where game.battle_players.left_at is not null and game.battle_players.removed_at is null
       returning 1
     )
     select case when verdict.outcome = 'joined' and not exists (select 1 from joined) then 'already-in' else verdict.outcome end as outcome
     from verdict`,
    [input.battleId, input.userId, input.maxPlayers, input.at],
  );
  const outcome = rows[0]?.outcome;
  if (!outcome) throw new Error(`battle ${input.battleId} doesn't exist`);
  return outcome;
}

/**
 * The player leaves (or the host takes them out, with `removed`). The host
 * passes to whoever came first among the rest, and a room left empty
 * closes. False if they weren't in it.
 */
export async function leaveBattle(db: Queryable, battleId: string, userId: string, when: number, removed = false): Promise<boolean> {
  const left = await db.query(
    `update game.battle_players set left_at = ${at('$3')}, removed_at = case when $4::boolean then ${at('$3')} else removed_at end
     where battle_id = $1::uuid and user_id = $2::uuid and left_at is null
     returning 1`,
    [battleId, userId, when, removed],
  );
  if (left.length === 0) return false;
  // Whoever leaves a match on the way stays out of it.
  await db.query(
    `update game.battle_matches set departures = departures || jsonb_build_object($2::text, $3::float8)
     where battle_id = $1::uuid and ended_at is null and $2::uuid = any (players) and not departures ? $2::text`,
    [battleId, userId, when],
  );
  await db.query(
    `update game.battles b
     set host_id = next.user_id
     from (
       select p.user_id from game.battle_players p
       where p.battle_id = $1::uuid and p.left_at is null
       order by p.joined_at, p.user_id
       limit 1
     ) as next
     where b.id = $1::uuid and b.host_id = $2::uuid`,
    [battleId, userId],
  );
  await db.query(
    `update game.battles set closed_at = ${at('$2')}
     where id = $1::uuid and closed_at is null
       and not exists (select 1 from game.battle_players p where p.battle_id = $1::uuid and p.left_at is null)`,
    [battleId, when],
  );
  return true;
}

/** Notes that the player's phone is still there, at most once every `minGapMs`. */
export async function touchBattlePlayer(db: Queryable, battleId: string, userId: string, when: number, minGapMs: number): Promise<void> {
  await db.query(
    `update game.battle_players set seen_at = ${at('$3')}
     where battle_id = $1::uuid and user_id = $2::uuid and left_at is null and seen_at < ${at('$4')}`,
    [battleId, userId, when, when - minGapMs],
  );
}

/* ───────────── Matches ───────────── */

export interface BattleMatch {
  id: string;
  battleId: string;
  groupId: string | null;
  game: string;
  players: string[];
  /** Who left the room during it, and when (epoch ms). */
  departures: Record<string, number>;
  content: unknown;
  startedAt: number;
  startsAt: number;
  endedAt: number | null;
  results: unknown;
  winners: string[];
}

interface MatchRow {
  id: string;
  battle_id: string;
  group_id: string | null;
  game: string;
  players: string[];
  departures: string;
  content: string;
  started_at: number;
  starts_at: number;
  ended_at: number | null;
  results: string | null;
  winners: string[];
}

const MATCH_COLUMNS = `m.id, m.battle_id, m.group_id, m.game, m.players::text[] as players, m.departures::text as departures, m.content::text as content,
  ${ms('m.started_at', 'started_at')}, ${ms('m.starts_at', 'starts_at')}, ${ms('m.ended_at', 'ended_at')},
  m.results::text as results, m.winners::text[] as winners`;

function toMatch(row: MatchRow): BattleMatch {
  return {
    id: row.id,
    battleId: row.battle_id,
    groupId: row.group_id,
    game: row.game,
    players: row.players,
    departures: JSON.parse(row.departures) as Record<string, number>,
    content: JSON.parse(row.content),
    startedAt: row.started_at,
    startsAt: row.starts_at,
    endedAt: row.ended_at,
    results: row.results === null ? null : JSON.parse(row.results),
    winners: row.winners ?? [],
  };
}

/** Starts a match in the room. Null if another one is still running there. */
export async function createMatch(
  db: Queryable,
  input: { battleId: string; groupId: string | null; game: string; players: readonly string[]; content: unknown; startedAt: number; startsAt: number },
): Promise<BattleMatch | null> {
  try {
    const rows = await db.query<{ id: string }>(
      `insert into game.battle_matches (battle_id, group_id, game, players, content, started_at, starts_at)
       values ($1::uuid, $2::uuid, $3, ${array('$4', 'uuid')}, $5::text::jsonb, ${at('$6')}, ${at('$7')})
       returning id`,
      [input.battleId, input.groupId, input.game, JSON.stringify(input.players), JSON.stringify(input.content), input.startedAt, input.startsAt],
    );
    return rows[0] ? getMatch(db, rows[0].id) : null;
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }
}

export async function getMatch(db: Queryable, id: string): Promise<BattleMatch | null> {
  const rows = await db.query<MatchRow>(`select ${MATCH_COLUMNS} from game.battle_matches m where m.id = $1::uuid`, [id]);
  return rows[0] ? toMatch(rows[0]) : null;
}

/** The room's last match, running or not. */
export async function latestMatch(db: Queryable, battleId: string): Promise<BattleMatch | null> {
  const rows = await db.query<MatchRow>(
    `select ${MATCH_COLUMNS} from game.battle_matches m where m.battle_id = $1::uuid order by m.started_at desc, m.id limit 1`,
    [battleId],
  );
  return rows[0] ? toMatch(rows[0]) : null;
}

/** Writes how a match ended, once. False if it was already written. */
export async function endMatch(db: Queryable, input: { matchId: string; endedAt: number; results: unknown; winners: readonly string[] }): Promise<boolean> {
  const rows = await db.query(
    `update game.battle_matches set ended_at = ${at('$2')}, results = $3::text::jsonb, winners = ${array('$4', 'uuid')}
     where id = $1::uuid and ended_at is null
     returning 1`,
    [input.matchId, input.endedAt, JSON.stringify(input.results), JSON.stringify(input.winners)],
  );
  return rows.length > 0;
}

/** Matches of a group that nobody wrote down yet, started before `before`: everyone closed the app before the podium. */
export async function unendedGroupMatches(db: Queryable, groupId: string, before: number): Promise<BattleMatch[]> {
  const rows = await db.query<MatchRow>(
    `select ${MATCH_COLUMNS} from game.battle_matches m
     where m.group_id = $1::uuid and m.ended_at is null and m.started_at < ${at('$2')}
     order by m.started_at
     limit 20`,
    [groupId, before],
  );
  return rows.map(toMatch);
}

/* ───────────── Moves ───────────── */

export interface BattleMove {
  userId: string;
  round: number;
  shownAt: number | null;
  playedAt: number | null;
  choice: number | null;
  reactionMs: number | null;
  falseStart: boolean | null;
}

export async function matchMoves(db: Queryable, matchId: string): Promise<BattleMove[]> {
  const rows = await db.query<{
    user_id: string;
    round: number;
    shown_at: number | null;
    played_at: number | null;
    choice: number | null;
    reaction_ms: number | null;
    false_start: boolean | null;
  }>(
    `select user_id, round, ${ms('shown_at', 'shown_at')}, ${ms('played_at', 'played_at')}, choice, reaction_ms, false_start
     from game.battle_moves where match_id = $1::uuid
     order by round, played_at nulls last, user_id`,
    [matchId],
  );
  return rows.map((row) => ({
    userId: row.user_id,
    round: row.round,
    shownAt: row.shown_at,
    playedAt: row.played_at,
    choice: row.choice,
    reactionMs: row.reaction_ms,
    falseStart: row.false_start,
  }));
}

/** When the player first got this question: asking again keeps the first time. */
export async function markShown(db: Queryable, input: { matchId: string; userId: string; round: number; at: number }): Promise<number> {
  const rows = await db.query<{ shown_at: number }>(
    `insert into game.battle_moves (match_id, user_id, round, shown_at)
     values ($1::uuid, $2::uuid, $3::int, ${at('$4')})
     on conflict (match_id, user_id, round) do update set shown_at = coalesce(game.battle_moves.shown_at, excluded.shown_at)
     returning ${ms('shown_at', 'shown_at')}`,
    [input.matchId, input.userId, input.round, input.at],
  );
  return rows[0]!.shown_at;
}

/** The answer to a question the player was shown, once. False if there was already one (or no question). */
export async function recordAnswer(db: Queryable, input: { matchId: string; userId: string; round: number; at: number; choice: number }): Promise<boolean> {
  const rows = await db.query(
    `update game.battle_moves set played_at = ${at('$4')}, choice = $5::int
     where match_id = $1::uuid and user_id = $2::uuid and round = $3::int and shown_at is not null and played_at is null
     returning 1`,
    [input.matchId, input.userId, input.round, input.at, input.choice],
  );
  return rows.length > 0;
}

/** A start of Largada, once. False if this player already sent this one. */
export async function recordStart(
  db: Queryable,
  input: { matchId: string; userId: string; round: number; at: number; reactionMs: number | null; falseStart: boolean },
): Promise<boolean> {
  const rows = await db.query(
    `insert into game.battle_moves (match_id, user_id, round, played_at, reaction_ms, false_start)
     values ($1::uuid, $2::uuid, $3::int, ${at('$4')}, $5::int, $6::boolean)
     on conflict (match_id, user_id, round) do nothing
     returning 1`,
    [input.matchId, input.userId, input.round, input.at, input.reactionMs, input.falseStart],
  );
  return rows.length > 0;
}

/* ───────────── Words (Diez Letras) ───────────── */

export interface BattleWord {
  userId: string;
  /** Normalized and already checked by the server. */
  word: string;
  playedAt: number;
}

export async function matchWords(db: Queryable, matchId: string): Promise<BattleWord[]> {
  const rows = await db.query<{ user_id: string; word: string; played_at: number }>(
    `select user_id, word, ${ms('played_at', 'played_at')}
     from game.battle_words where match_id = $1::uuid
     order by played_at, user_id, word`,
    [matchId],
  );
  return rows.map((row) => ({ userId: row.user_id, word: row.word, playedAt: row.played_at }));
}

/** A valid word, once per player. False if they had already found it. */
export async function recordWord(db: Queryable, input: { matchId: string; userId: string; word: string; at: number }): Promise<boolean> {
  const rows = await db.query(
    `insert into game.battle_words (match_id, user_id, word, played_at)
     values ($1::uuid, $2::uuid, $3, ${at('$4')})
     on conflict (match_id, user_id, word) do nothing
     returning 1`,
    [input.matchId, input.userId, input.word, input.at],
  );
  return rows.length > 0;
}

/* ───────────── A group's history ───────────── */

/** The group's current members, for its tally of battles. */
export async function groupPlayers(db: Queryable, groupId: string): Promise<{ userId: string; username: string; avatar: unknown; article: 'el' | 'la' }[]> {
  const rows = await db.query<{ user_id: string; username: string; avatar: string; article: 'el' | 'la' }>(
    `select m.user_id, u.username, u.avatar::text as avatar, u.article
     from game.group_members m join game.users u on u.id = m.user_id
     where m.group_id = $1::uuid and m.left_at is null
     order by m.joined_at, m.user_id`,
    [groupId],
  );
  return rows.map((row) => ({ userId: row.user_id, username: row.username, avatar: JSON.parse(row.avatar), article: row.article }));
}

/** Battles each player won in the group (a tie at the top counts for each one). */
export async function groupBattleWins(db: Queryable, groupId: string): Promise<{ userId: string; wins: number }[]> {
  const rows = await db.query<{ user_id: string; wins: number }>(
    `select w.user_id::text as user_id, count(*)::int as wins
     from game.battle_matches m cross join lateral unnest(m.winners) as w(user_id)
     where m.group_id = $1::uuid and m.ended_at is not null
     group by w.user_id
     order by wins desc, user_id`,
    [groupId],
  );
  return rows.map((row) => ({ userId: row.user_id, wins: row.wins }));
}

export interface PastMatch {
  id: string;
  game: string;
  endedAt: number;
  players: number;
  winners: { userId: string; username: string }[];
}

/** The group's last matches with two or more players, newest first. */
export async function groupRecentMatches(db: Queryable, groupId: string, limit: number): Promise<PastMatch[]> {
  const rows = await db.query<{ id: string; game: string; ended_at: number; players: number; winners: string | null }>(
    `select m.id, m.game, ${ms('m.ended_at', 'ended_at')}, cardinality(m.players) as players,
       (select json_agg(json_build_object('userId', u.id, 'username', u.username) order by u.username)::text
        from game.users u where u.id = any (m.winners)) as winners
     from game.battle_matches m
     where m.group_id = $1::uuid and m.ended_at is not null and cardinality(m.players) >= 2
     order by m.ended_at desc
     limit $2::int`,
    [groupId, limit],
  );
  return rows.map((row) => ({
    id: row.id,
    game: row.game,
    endedAt: row.ended_at,
    players: row.players,
    winners: row.winners ? (JSON.parse(row.winners) as PastMatch['winners']) : [],
  }));
}
