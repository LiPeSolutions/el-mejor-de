-- Private groups (docs/PLAN.md §8): their own ranking and weekly crown, with
-- the same daily challenges as everyone. Invitations go by link or code.
-- Like the rest of the schema, only the web server reaches these tables.

-- ───────────── Groups ─────────────
create table game.groups (
  id uuid primary key default gen_random_uuid(),
  -- As the creator wrote it, without "El Mejor de" (the app adds it).
  name text not null check (char_length(name) between 3 and 30),
  emblem text not null check (emblem in ('casa', 'maletin', 'pelota', 'birrete', 'mate', 'musica', 'corazon', 'estrella')),
  color text not null check (color in ('azul', 'coral', 'violeta', 'turquesa', 'dorado', 'rosa', 'tinta')),
  -- Who runs it: edits it, renews the invitation and can remove members.
  owner_id uuid not null references game.users (id) on delete cascade,
  -- The current invitation ("LABURO-7K2Q"). Renewing replaces it, so the old link stops working.
  invite_code text not null,
  -- The code as it's compared, however it's typed: "LABURO7K2Q".
  invite_key text generated always as (upper(regexp_replace(invite_code, '[^A-Za-z0-9]', '', 'g'))) stored,
  invite_created_at timestamptz not null default now(),
  invite_expires_at timestamptz not null,
  -- The Monday of the last week whose crown was decided (null: none yet).
  crowned_through date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index groups_invite_key on game.groups (invite_key);
create index groups_owner_idx on game.groups (owner_id);

-- ───────────── Members ─────────────
-- Leaving or being removed sets left_at: the server role can't delete rows.
create table game.group_members (
  group_id uuid not null references game.groups (id) on delete cascade,
  user_id uuid not null references game.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  -- When the owner removed them: they can't come back with the invitation of that moment.
  removed_at timestamptz,
  primary key (group_id, user_id)
);

create index group_members_user_idx on game.group_members (user_id);

-- ───────────── Crowns ─────────────
-- The weekly crown of each group (and, later, of each place): whoever led
-- when the week closed, on Sunday at midnight. Decided once, by the server.
create table game.crowns (
  id uuid primary key default gen_random_uuid(),
  -- The Monday of the week.
  week_start date not null,
  group_id uuid references game.groups (id) on delete cascade,
  place_id text references game.places (id),
  user_id uuid not null references game.users (id) on delete cascade,
  score integer not null check (score > 0),
  days_played smallint not null,
  -- How many played that week, and the runner-up, for the celebration.
  players smallint not null,
  runner_up_id uuid references game.users (id) on delete set null,
  runner_up_score integer,
  -- The group's name that week.
  title text not null,
  -- When the winner saw the celebration.
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  constraint crowns_one_scope check ((group_id is null) <> (place_id is null))
);

create unique index crowns_group_week on game.crowns (group_id, week_start) where group_id is not null;
create unique index crowns_place_week on game.crowns (place_id, week_start) where place_id is not null;
create index crowns_user_idx on game.crowns (user_id);
create index crowns_runner_up_idx on game.crowns (runner_up_id) where runner_up_id is not null;

-- ───────────── Rate limits ─────────────
-- Wrong invitation codes, per account and per connection (a keyed hash, never the IP).
create table game.group_code_failures (
  id bigint generated always as identity primary key,
  user_id uuid references game.users (id) on delete cascade,
  ip_hash text,
  at timestamptz not null default now()
);

create index group_code_failures_user_idx on game.group_code_failures (user_id, at) where user_id is not null;
create index group_code_failures_ip_idx on game.group_code_failures (ip_hash, at) where ip_hash is not null;

-- ───────────── Access ─────────────
grant select, insert, update on game.groups, game.group_members, game.crowns to app_server;
grant select, insert on game.group_code_failures to app_server;

revoke all on game.groups, game.group_members, game.crowns, game.group_code_failures from anon, authenticated;

alter table game.groups enable row level security;
alter table game.group_members enable row level security;
alter table game.crowns enable row level security;
alter table game.group_code_failures enable row level security;

create policy groups_server_all on game.groups for all to app_server using (true) with check (true);
create policy group_members_server_all on game.group_members for all to app_server using (true) with check (true);
create policy crowns_server_all on game.crowns for all to app_server using (true) with check (true);
create policy group_code_failures_server_all on game.group_code_failures for all to app_server using (true) with check (true);
