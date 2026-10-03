-- Accounts (docs/ARQUITECTURA.md §4): an apodo and a password, no email.
-- Google can be linked later, so a forgotten password doesn't lose the
-- account. Like the rest of the schema, only the web server reaches it.

-- ───────────── Players ─────────────
create table game.users (
  id uuid primary key default gen_random_uuid(),
  -- As the player wrote it ("Tincho"): it's how rankings show them.
  username text not null check (char_length(username) between 3 and 16),
  -- One account per apodo, ignoring case and accents ("tincho").
  username_key text generated always as (game.search_name(username)) stored,
  -- scrypt, with its parameters (apps/web/src/server/passwords.ts).
  password_hash text not null,
  -- Google's id for the person, once they link their account.
  google_sub text,
  -- Their character: species, color and accessory.
  avatar jsonb not null,
  -- How the crown names them: "El Mejor de…" or "La Mejor de…".
  article text not null check (article in ('el', 'la')),
  -- Their locality, for rankings (chosen and verified with the GPS).
  place_id text references game.places (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index users_username_key on game.users (username_key);
create unique index users_google_sub on game.users (google_sub) where google_sub is not null;
create index users_place_idx on game.users (place_id) where place_id is not null;

-- ───────────── Sessions ─────────────
-- One row per signed-in browser. The cookie holds a random token and this
-- table only its SHA-256, so reading the table doesn't let anyone sign in.
-- Signing out moves expires_at to the present (the server role can't remove rows).
create table game.sessions (
  id text primary key,
  user_id uuid not null references game.users (id) on delete cascade,
  device_id uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index sessions_user_idx on game.sessions (user_id);

-- ───────────── Rate limits ─────────────
-- Failed sign-ins per apodo and per connection, and new accounts per browser
-- and per connection. Connections are kept as a keyed hash, never the IP.
create table game.auth_events (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('signup', 'signin-failed')),
  username_key text,
  device_id uuid,
  ip_hash text,
  at timestamptz not null default now()
);

create index auth_events_username_idx on game.auth_events (username_key, at) where username_key is not null;
create index auth_events_device_idx on game.auth_events (device_id, at) where device_id is not null;
create index auth_events_ip_idx on game.auth_events (ip_hash, at) where ip_hash is not null;

-- ───────────── Attempts with accounts ─────────────
-- "Once per browser" now holds for anonymous play only, so a family sharing a
-- phone can each play with their own account. A browser that already played
-- a challenge without an account can't play it again with one (claimAttempt
-- in packages/db checks it). The next migration retires the old index.
create unique index attempts_one_per_anonymous_device on game.attempts (device_id, game_date, slot) where user_id is null;

alter table game.attempts
  add constraint attempts_user_fk foreign key (user_id) references game.users (id) on delete cascade;

-- ───────────── Access ─────────────
grant select, insert, update on game.users to app_server;
grant select, insert, update on game.sessions to app_server;
grant select, insert on game.auth_events to app_server;

revoke all on game.users, game.sessions, game.auth_events from anon, authenticated;

alter table game.users enable row level security;
alter table game.sessions enable row level security;
alter table game.auth_events enable row level security;

create policy users_server_all on game.users for all to app_server using (true) with check (true);
create policy sessions_server_all on game.sessions for all to app_server using (true) with check (true);
create policy auth_events_server_all on game.auth_events for all to app_server using (true) with check (true);
