import type { Queryable } from './queryable';

export interface User {
  id: string;
  username: string;
  /** Validated by the app (parseAvatar in @repo/shared). */
  avatar: unknown;
  article: 'el' | 'la';
  placeId: string | null;
  googleLinked: boolean;
  /** Epoch milliseconds. */
  createdAt: number;
}

interface UserRow {
  id: string;
  username: string;
  avatar: string;
  article: 'el' | 'la';
  place_id: string | null;
  google_linked: boolean;
  created_at: number;
  password_hash?: string;
}

// JSON as text and times as epoch milliseconds, like attempts.ts. `t` is a table alias.
const userColumns = (t = '') => `${t}id, ${t}username, ${t}avatar::text as avatar, ${t}article, ${t}place_id,
  ${t}google_sub is not null as google_linked, floor(extract(epoch from ${t}created_at) * 1000)::float8 as created_at`;
const USER_COLUMNS = userColumns();

function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    avatar: JSON.parse(row.avatar),
    article: row.article,
    placeId: row.place_id,
    googleLinked: row.google_linked,
    createdAt: row.created_at,
  };
}

export interface NewUser {
  username: string;
  passwordHash: string;
  avatar: unknown;
  article: 'el' | 'la';
}

/** Creates an account, or returns null if the apodo is taken (ignoring case and accents). */
export async function createUser(db: Queryable, input: NewUser): Promise<User | null> {
  const rows = await db.query<UserRow>(
    `insert into game.users (username, password_hash, avatar, article)
     values ($1, $2, $3::text::jsonb, $4)
     on conflict do nothing
     returning ${USER_COLUMNS}`,
    [input.username, input.passwordHash, JSON.stringify(input.avatar), input.article],
  );
  return rows[0] ? toUser(rows[0]) : null;
}

export async function getUser(db: Queryable, id: string): Promise<User | null> {
  const rows = await db.query<UserRow>(`select ${USER_COLUMNS} from game.users where id = $1::uuid`, [id]);
  return rows[0] ? toUser(rows[0]) : null;
}

/** The account with this apodo (ignoring case and accents) and its password hash, to sign in. */
export async function findUserForSignIn(db: Queryable, username: string): Promise<{ user: User; passwordHash: string } | null> {
  const rows = await db.query<UserRow>(
    `select ${USER_COLUMNS}, password_hash from game.users where username_key = game.search_name($1)`,
    [username],
  );
  const row = rows[0];
  return row?.password_hash ? { user: toUser(row), passwordHash: row.password_hash } : null;
}

export async function usernameTaken(db: Queryable, username: string): Promise<boolean> {
  const rows = await db.query<{ taken: boolean }>(
    `select exists (select 1 from game.users where username_key = game.search_name($1)) as taken`,
    [username],
  );
  return rows[0]?.taken ?? false;
}

export async function updatePasswordHash(db: Queryable, userId: string, passwordHash: string): Promise<void> {
  await db.query(`update game.users set password_hash = $2, updated_at = now() where id = $1::uuid`, [userId, passwordHash]);
}

/** Changes the character and/or the article. */
export async function updateProfile(
  db: Queryable,
  userId: string,
  changes: { avatar?: unknown; article?: 'el' | 'la' },
): Promise<User | null> {
  const rows = await db.query<UserRow>(
    `update game.users
     set avatar = coalesce($2::text::jsonb, avatar), article = coalesce($3, article), updated_at = now()
     where id = $1::uuid
     returning ${USER_COLUMNS}`,
    [userId, changes.avatar === undefined ? null : JSON.stringify(changes.avatar), changes.article ?? null],
  );
  return rows[0] ? toUser(rows[0]) : null;
}

/* ───────────── Sessions ───────────── */

export interface NewSession {
  /** SHA-256 of the cookie's token. */
  id: string;
  userId: string;
  deviceId: string | null;
  /** Epoch milliseconds. */
  expiresAt: number;
}

export async function createSession(db: Queryable, session: NewSession): Promise<void> {
  await db.query(
    `insert into game.sessions (id, user_id, device_id, expires_at)
     values ($1, $2::uuid, $3::uuid, to_timestamp($4::float8 / 1000))`,
    [session.id, session.userId, session.deviceId, session.expiresAt],
  );
}

/** A session that hasn't expired, with its account. */
export async function getSession(db: Queryable, id: string): Promise<{ expiresAt: number; user: User } | null> {
  const rows = await db.query<UserRow & { expires_at: number }>(
    `select ${userColumns('u.')}, floor(extract(epoch from s.expires_at) * 1000)::float8 as expires_at
     from game.sessions s join game.users u on u.id = s.user_id
     where s.id = $1 and s.expires_at > now()`,
    [id],
  );
  const row = rows[0];
  return row ? { expiresAt: row.expires_at, user: toUser(row) } : null;
}

export async function extendSession(db: Queryable, id: string, expiresAt: number): Promise<void> {
  await db.query(`update game.sessions set expires_at = to_timestamp($2::float8 / 1000) where id = $1`, [id, expiresAt]);
}

/** Signs a browser out: the session stays, already expired. */
export async function endSession(db: Queryable, id: string): Promise<void> {
  await db.query(`update game.sessions set expires_at = now() where id = $1 and expires_at > now()`, [id]);
}

/* ───────────── Rate limits ───────────── */

export type AuthEventKind = 'signup' | 'signin-failed';

export interface AuthEvent {
  kind: AuthEventKind;
  usernameKey?: string | null;
  deviceId?: string | null;
  ipHash?: string | null;
}

export async function recordAuthEvent(db: Queryable, event: AuthEvent): Promise<void> {
  await db.query(`insert into game.auth_events (kind, username_key, device_id, ip_hash) values ($1, $2, $3::uuid, $4)`, [
    event.kind,
    event.usernameKey ?? null,
    event.deviceId ?? null,
    event.ipHash ?? null,
  ]);
}

/** How many events of a kind happened since `since` (epoch ms) for this apodo, browser or connection. */
export async function countAuthEvents(
  db: Queryable,
  kind: AuthEventKind,
  by: { usernameKey: string } | { deviceId: string } | { ipHash: string },
  since: number,
): Promise<number> {
  const [column, value, cast] =
    'usernameKey' in by ? ['username_key', by.usernameKey, ''] : 'deviceId' in by ? ['device_id', by.deviceId, '::uuid'] : ['ip_hash', by.ipHash, ''];
  const rows = await db.query<{ count: number }>(
    `select count(*)::int as count from game.auth_events
     where ${column} = $2${cast} and kind = $1 and at > to_timestamp($3::float8 / 1000)`,
    [kind, value, since],
  );
  return rows[0]?.count ?? 0;
}

/* ───────────── Attempts ───────────── */

/**
 * At sign-up, what this browser played today without an account becomes the
 * new account's. Returns how many attempts moved.
 */
export async function linkDeviceAttempts(db: Queryable, input: { deviceId: string; userId: string; date: string }): Promise<number> {
  const rows = await db.query<{ id: string }>(
    `update game.attempts set user_id = $2::uuid
     where device_id = $1::uuid and user_id is null and game_date = $3::date
     returning id`,
    [input.deviceId, input.userId, input.date],
  );
  return rows.length;
}
