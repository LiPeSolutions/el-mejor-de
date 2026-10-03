import type { Queryable } from './queryable';

/*
 * Private groups, their members and their weekly crowns (docs/PLAN.md §8).
 * The rules (limits, names, who can do what) live in the web server; these
 * are the queries. Times are epoch milliseconds, like attempts.ts.
 */

const ms = (column: string, as: string) => `floor(extract(epoch from ${column}) * 1000)::float8 as ${as}`;

export interface Group {
  id: string;
  name: string;
  emblem: string;
  color: string;
  ownerId: string;
  inviteCode: string;
  inviteCreatedAt: number;
  inviteExpiresAt: number;
  /** The Monday of the last week whose crown was decided. */
  crownedThrough: string | null;
  createdAt: number;
  /** Active members. */
  memberCount: number;
}

interface GroupRow {
  id: string;
  name: string;
  emblem: string;
  color: string;
  owner_id: string;
  invite_code: string;
  invite_created_at: number;
  invite_expires_at: number;
  crowned_through: string | null;
  created_at: number;
  member_count: number;
}

const GROUP_COLUMNS = `g.id, g.name, g.emblem, g.color, g.owner_id, g.invite_code,
  ${ms('g.invite_created_at', 'invite_created_at')}, ${ms('g.invite_expires_at', 'invite_expires_at')},
  g.crowned_through::text as crowned_through, ${ms('g.created_at', 'created_at')},
  (select count(*)::int from game.group_members c where c.group_id = g.id and c.left_at is null) as member_count`;

function toGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    emblem: row.emblem,
    color: row.color,
    ownerId: row.owner_id,
    inviteCode: row.invite_code,
    inviteCreatedAt: row.invite_created_at,
    inviteExpiresAt: row.invite_expires_at,
    crownedThrough: row.crowned_through,
    createdAt: row.created_at,
    memberCount: row.member_count,
  };
}

/** Postgres' "unique violation": an invitation code already in use. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505';
}

export interface NewGroup {
  ownerId: string;
  name: string;
  emblem: string;
  color: string;
  inviteCode: string;
  inviteExpiresAt: number;
  /** When it's created (epoch ms): the server's clock decides, like everywhere in the game. */
  at: number;
}

/** Creates the group with its owner as the first member. Null if the invitation code is taken. */
export async function createGroup(db: Queryable, input: NewGroup): Promise<Group | null> {
  const rows = await db.query<{ id: string }>(
    `with created as (
       insert into game.groups (owner_id, name, emblem, color, invite_code, invite_expires_at, invite_created_at, created_at, updated_at)
       values ($1::uuid, $2, $3, $4, $5, to_timestamp($6::float8 / 1000), to_timestamp($7::float8 / 1000), to_timestamp($7::float8 / 1000), to_timestamp($7::float8 / 1000))
       on conflict do nothing
       returning id, owner_id, created_at
     ), owner as (
       insert into game.group_members (group_id, user_id, joined_at) select id, owner_id, created_at from created
     )
     select id from created`,
    [input.ownerId, input.name, input.emblem, input.color, input.inviteCode, input.inviteExpiresAt, input.at],
  );
  return rows[0] ? getGroup(db, rows[0].id) : null;
}

export async function getGroup(db: Queryable, id: string): Promise<Group | null> {
  const rows = await db.query<GroupRow>(`select ${GROUP_COLUMNS} from game.groups g where g.id = $1::uuid`, [id]);
  return rows[0] ? toGroup(rows[0]) : null;
}

/** The group whose current invitation has this key (see invite_key), expired or not. */
export async function findGroupByInvite(db: Queryable, key: string): Promise<Group | null> {
  const rows = await db.query<GroupRow>(`select ${GROUP_COLUMNS} from game.groups g where g.invite_key = $1`, [key]);
  return rows[0] ? toGroup(rows[0]) : null;
}

/** The groups a player is in, in the order they joined. */
export async function userGroups(db: Queryable, userId: string): Promise<Group[]> {
  const rows = await db.query<GroupRow>(
    `select ${GROUP_COLUMNS}
     from game.group_members m join game.groups g on g.id = m.group_id
     where m.user_id = $1::uuid and m.left_at is null
     order by m.joined_at, g.id`,
    [userId],
  );
  return rows.map(toGroup);
}

/** Groups this player created since `since` (epoch ms), for the daily limit. */
export async function countGroupsCreatedSince(db: Queryable, userId: string, since: number): Promise<number> {
  const rows = await db.query<{ count: number }>(
    `select count(*)::int as count from game.groups where owner_id = $1::uuid and created_at > to_timestamp($2::float8 / 1000)`,
    [userId, since],
  );
  return rows[0]?.count ?? 0;
}

export async function updateGroup(
  db: Queryable,
  id: string,
  changes: { name?: string; emblem?: string; color?: string },
): Promise<Group | null> {
  const rows = await db.query<{ id: string }>(
    `update game.groups
     set name = coalesce($2, name), emblem = coalesce($3, emblem), color = coalesce($4, color), updated_at = now()
     where id = $1::uuid
     returning id`,
    [id, changes.name ?? null, changes.emblem ?? null, changes.color ?? null],
  );
  return rows[0] ? getGroup(db, id) : null;
}

/** A new invitation, made at `at`: the old code stops working. Null if the new code is taken. */
export async function replaceInvite(db: Queryable, id: string, invite: { code: string; expiresAt: number; at: number }): Promise<Group | null> {
  try {
    const rows = await db.query<{ id: string }>(
      `update game.groups
       set invite_code = $2, invite_created_at = to_timestamp($4::float8 / 1000), invite_expires_at = to_timestamp($3::float8 / 1000), updated_at = now()
       where id = $1::uuid
       returning id`,
      [id, invite.code, invite.expiresAt, invite.at],
    );
    return rows[0] ? getGroup(db, id) : null;
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }
}

/* ───────────── Members ───────────── */

export interface Membership {
  joinedAt: number;
  leftAt: number | null;
  removedAt: number | null;
}

export async function getMembership(db: Queryable, groupId: string, userId: string): Promise<Membership | null> {
  const rows = await db.query<{ joined_at: number; left_at: number | null; removed_at: number | null }>(
    `select ${ms('joined_at', 'joined_at')}, ${ms('left_at', 'left_at')}, ${ms('removed_at', 'removed_at')}
     from game.group_members where group_id = $1::uuid and user_id = $2::uuid`,
    [groupId, userId],
  );
  const row = rows[0];
  return row ? { joinedAt: row.joined_at, leftAt: row.left_at, removedAt: row.removed_at } : null;
}

export type JoinOutcome = 'joined' | 'already-member' | 'full' | 'removed';

/**
 * Adds the player, or brings back one who had left. Someone the owner
 * removed can only come back with an invitation made after that.
 */
export async function joinGroup(db: Queryable, input: { groupId: string; userId: string; maxMembers: number; at: number }): Promise<JoinOutcome> {
  const rows = await db.query<{ outcome: JoinOutcome }>(
    `with target as (
       select g.id, g.invite_created_at from game.groups g where g.id = $1::uuid for update
     ), previous as (
       select m.left_at, m.removed_at from game.group_members m where m.group_id = $1::uuid and m.user_id = $2::uuid
     ), verdict as (
       select case
         when exists (select 1 from previous where left_at is null) then 'already-member'
         when exists (select 1 from previous p, target t where p.removed_at >= t.invite_created_at) then 'removed'
         when (select count(*) from game.group_members m where m.group_id = $1::uuid and m.left_at is null) >= $3::int then 'full'
         else 'joined'
       end as outcome
       from target
     ), joined as (
       insert into game.group_members (group_id, user_id, joined_at)
       select $1::uuid, $2::uuid, to_timestamp($4::float8 / 1000) from verdict where outcome = 'joined'
       on conflict (group_id, user_id) do update
         set joined_at = excluded.joined_at, left_at = null, removed_at = null
         where game.group_members.left_at is not null
       returning 1
     )
     select case when verdict.outcome = 'joined' and not exists (select 1 from joined) then 'already-member' else verdict.outcome end as outcome
     from verdict`,
    [input.groupId, input.userId, input.maxMembers, input.at],
  );
  const outcome = rows[0]?.outcome;
  if (!outcome) throw new Error(`group ${input.groupId} doesn't exist`);
  return outcome;
}

/**
 * The player leaves. If they ran the group, it passes to whoever joined
 * first among the rest. False if they weren't in it.
 */
export async function leaveGroup(db: Queryable, groupId: string, userId: string, at: number): Promise<boolean> {
  const left = await db.query(
    `update game.group_members set left_at = to_timestamp($3::float8 / 1000)
     where group_id = $1::uuid and user_id = $2::uuid and left_at is null
     returning 1`,
    [groupId, userId, at],
  );
  if (left.length === 0) return false;
  await db.query(
    `update game.groups g
     set owner_id = next.user_id, updated_at = now()
     from (
       select m.user_id from game.group_members m
       where m.group_id = $1::uuid and m.left_at is null
       order by m.joined_at, m.user_id
       limit 1
     ) as next
     where g.id = $1::uuid and g.owner_id = $2::uuid`,
    [groupId, userId],
  );
  return true;
}

/** The owner removes a member. False if they weren't in it. */
export async function removeMember(db: Queryable, groupId: string, userId: string, at: number): Promise<boolean> {
  const rows = await db.query(
    `update game.group_members set left_at = to_timestamp($3::float8 / 1000), removed_at = to_timestamp($3::float8 / 1000)
     where group_id = $1::uuid and user_id = $2::uuid and left_at is null
     returning 1`,
    [groupId, userId, at],
  );
  return rows.length > 0;
}

/* ───────────── Scores ───────────── */

export interface MemberScores {
  groupId: string;
  userId: string;
  username: string;
  /** Validated by the app (parseAvatar in @repo/shared). */
  avatar: unknown;
  article: 'el' | 'la';
  joinedAt: number;
  /** Finished daily challenges between the two dates, in the order they were graded. */
  challenges: { date: string; score: number; at: number }[];
}

interface MemberScoreRow {
  group_id: string;
  user_id: string;
  username: string;
  avatar: string;
  article: 'el' | 'la';
  joined_at: number;
  game_date: string | null;
  score: number | null;
  finished_at: number | null;
}

/**
 * The members of these groups with their daily challenges between two game
 * dates. With `asOf` (epoch ms), the members at that moment, for closing a
 * week; without it, the current ones.
 */
export async function groupMemberScores(
  db: Queryable,
  input: { groupIds: readonly string[]; from: string; to: string; asOf?: number },
): Promise<MemberScores[]> {
  if (input.groupIds.length === 0) return [];
  const members =
    input.asOf === undefined
      ? 'm.left_at is null'
      : 'm.joined_at <= to_timestamp($4::float8 / 1000) and (m.left_at is null or m.left_at > to_timestamp($4::float8 / 1000))';
  const params: unknown[] = [input.groupIds.join(','), input.from, input.to];
  if (input.asOf !== undefined) params.push(input.asOf);
  const rows = await db.query<MemberScoreRow>(
    `select m.group_id, m.user_id, u.username, u.avatar::text as avatar, u.article, ${ms('m.joined_at', 'joined_at')},
       a.game_date::text as game_date, a.score, ${ms('a.finished_at', 'finished_at')}
     from game.group_members m
     join game.users u on u.id = m.user_id
     left join game.attempts a
       on a.user_id = m.user_id and a.status = 'finished' and a.game_date between $2::date and $3::date
     where m.group_id = any(string_to_array($1::text, ',')::uuid[]) and ${members}
     order by m.group_id, m.joined_at, m.user_id, a.finished_at`,
    params,
  );
  const byMember = new Map<string, MemberScores>();
  for (const row of rows) {
    const key = `${row.group_id}:${row.user_id}`;
    let member = byMember.get(key);
    if (!member) {
      member = {
        groupId: row.group_id,
        userId: row.user_id,
        username: row.username,
        avatar: JSON.parse(row.avatar),
        article: row.article,
        joinedAt: row.joined_at,
        challenges: [],
      };
      byMember.set(key, member);
    }
    if (row.game_date !== null && row.score !== null && row.finished_at !== null) {
      member.challenges.push({ date: row.game_date, score: row.score, at: row.finished_at });
    }
  }
  return [...byMember.values()];
}

/* ───────────── Crowns ───────────── */

export interface NewGroupCrown {
  groupId: string;
  weekStart: string;
  userId: string;
  score: number;
  daysPlayed: number;
  players: number;
  runnerUpId: string | null;
  runnerUpScore: number | null;
  title: string;
}

/** Records a group's crown for a week. Deciding it twice keeps the first. */
export async function recordGroupCrown(db: Queryable, crown: NewGroupCrown): Promise<void> {
  await db.query(
    `insert into game.crowns (week_start, group_id, user_id, score, days_played, players, runner_up_id, runner_up_score, title)
     values ($1::date, $2::uuid, $3::uuid, $4::int, $5::smallint, $6::smallint, $7::uuid, $8::int, $9)
     on conflict do nothing`,
    [crown.weekStart, crown.groupId, crown.userId, crown.score, crown.daysPlayed, crown.players, crown.runnerUpId, crown.runnerUpScore, crown.title],
  );
}

/** Notes that the crowns up to this week are decided, so they aren't looked at again. */
export async function markGroupCrowned(db: Queryable, groupId: string, weekStart: string): Promise<void> {
  await db.query(
    `update game.groups set crowned_through = greatest(coalesce(crowned_through, $2::date), $2::date) where id = $1::uuid`,
    [groupId, weekStart],
  );
}

export interface Crown {
  id: string;
  weekStart: string;
  groupId: string | null;
  userId: string;
  username: string;
  avatar: unknown;
  article: 'el' | 'la';
  score: number;
  daysPlayed: number;
  players: number;
  runnerUp: { userId: string; username: string; score: number } | null;
  title: string;
  /** The group's emblem and color today (null if it's not a group's crown). */
  emblem: string | null;
  color: string | null;
  seenAt: number | null;
}

interface CrownRow {
  id: string;
  week_start: string;
  group_id: string | null;
  user_id: string;
  username: string;
  avatar: string;
  article: 'el' | 'la';
  score: number;
  days_played: number;
  players: number;
  runner_up_id: string | null;
  runner_up_name: string | null;
  runner_up_score: number | null;
  title: string;
  emblem: string | null;
  color: string | null;
  seen_at: number | null;
}

const CROWN_SELECT = `select c.id, c.week_start::text as week_start, c.group_id, c.user_id, u.username, u.avatar::text as avatar, u.article,
    c.score, c.days_played, c.players, c.runner_up_id, r.username as runner_up_name, c.runner_up_score, c.title,
    g.emblem, g.color, ${ms('c.seen_at', 'seen_at')}
  from game.crowns c
  join game.users u on u.id = c.user_id
  left join game.users r on r.id = c.runner_up_id
  left join game.groups g on g.id = c.group_id`;

function toCrown(row: CrownRow): Crown {
  return {
    id: row.id,
    weekStart: row.week_start,
    groupId: row.group_id,
    userId: row.user_id,
    username: row.username,
    avatar: JSON.parse(row.avatar),
    article: row.article,
    score: row.score,
    daysPlayed: row.days_played,
    players: row.players,
    runnerUp:
      row.runner_up_id && row.runner_up_name !== null && row.runner_up_score !== null
        ? { userId: row.runner_up_id, username: row.runner_up_name, score: row.runner_up_score }
        : null,
    title: row.title,
    emblem: row.emblem,
    color: row.color,
    seenAt: row.seen_at,
  };
}

/** Every crown a player won, newest first. */
export async function userCrowns(db: Queryable, userId: string): Promise<Crown[]> {
  const rows = await db.query<CrownRow>(`${CROWN_SELECT} where c.user_id = $1::uuid order by c.week_start desc, c.created_at desc`, [userId]);
  return rows.map(toCrown);
}

/** The latest crown of a group. */
export async function latestGroupCrown(db: Queryable, groupId: string): Promise<Crown | null> {
  const rows = await db.query<CrownRow>(`${CROWN_SELECT} where c.group_id = $1::uuid order by c.week_start desc limit 1`, [groupId]);
  return rows[0] ? toCrown(rows[0]) : null;
}

/** The winner saw the celebration. False if it isn't theirs or they had seen it. */
export async function markCrownSeen(db: Queryable, crownId: string, userId: string): Promise<boolean> {
  const rows = await db.query(
    `update game.crowns set seen_at = now() where id = $1::uuid and user_id = $2::uuid and seen_at is null returning 1`,
    [crownId, userId],
  );
  return rows.length > 0;
}

/* ───────────── Rate limits ───────────── */

export async function recordCodeFailure(db: Queryable, input: { userId: string | null; ipHash: string | null; at: number }): Promise<void> {
  await db.query(`insert into game.group_code_failures (user_id, ip_hash, at) values ($1::uuid, $2, to_timestamp($3::float8 / 1000))`, [
    input.userId,
    input.ipHash,
    input.at,
  ]);
}

/** Wrong codes since `since` (epoch ms) for this account or connection. */
export async function countCodeFailures(db: Queryable, by: { userId: string } | { ipHash: string }, since: number): Promise<number> {
  const [column, value, cast] = 'userId' in by ? ['user_id', by.userId, '::uuid'] : ['ip_hash', by.ipHash, ''];
  const rows = await db.query<{ count: number }>(
    `select count(*)::int as count from game.group_code_failures where ${column} = $1${cast} and at > to_timestamp($2::float8 / 1000)`,
    [value, since],
  );
  return rows[0]?.count ?? 0;
}
