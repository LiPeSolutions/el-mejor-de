-- Live battles (docs/PLAN.md §8): a room of friends plays the same game at
-- the same time. A room can be of a group (its members see it live) or
-- loose, shared by link or code. Each game played in it is a match, and a
-- rematch is a new match in the same room. They never count for rankings
-- or crowns. Like the rest of the schema, only the web server reaches them.

-- ───────────── Rooms ─────────────
create table game.battles (
  id uuid primary key default gen_random_uuid(),
  -- Four characters easy to read aloud ("K7Q2"), unique among open rooms.
  code text not null check (code ~ '^[2-9A-HJKMNP-Z]{4}$'),
  group_id uuid references game.groups (id) on delete cascade,
  -- Who picks the game and starts it; if they leave, whoever joined next.
  host_id uuid not null references game.users (id) on delete cascade,
  created_by uuid not null references game.users (id) on delete cascade,
  -- The game of the next match.
  game text not null check (game in ('seven-letters', 'five-questions', 'reflexes', 'sequence')),
  -- When the host went back to choose another game after a match.
  lobby_at timestamptz,
  -- Trivia questions already played in this room, so a rematch brings new ones.
  used_questions text[] not null default '{}',
  created_at timestamptz not null,
  closed_at timestamptz
);

create unique index battles_open_code on game.battles (code) where closed_at is null;
create index battles_group_idx on game.battles (group_id);
create index battles_host_idx on game.battles (host_id);
create index battles_creator_idx on game.battles (created_by, created_at);

-- ───────────── Who's in ─────────────
-- Leaving sets left_at: the server role can't delete rows.
create table game.battle_players (
  battle_id uuid not null references game.battles (id) on delete cascade,
  user_id uuid not null references game.users (id) on delete cascade,
  joined_at timestamptz not null,
  left_at timestamptz,
  -- The host took them out: they can't come back to this room.
  removed_at timestamptz,
  -- The last time their phone asked how the battle is going.
  seen_at timestamptz not null,
  primary key (battle_id, user_id)
);

create index battle_players_user_idx on game.battle_players (user_id);

-- ───────────── Matches ─────────────
create table game.battle_matches (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references game.battles (id) on delete cascade,
  -- The room's group, for its history.
  group_id uuid references game.groups (id) on delete set null,
  game text not null check (game in ('seven-letters', 'five-questions', 'reflexes', 'sequence')),
  -- Who plays it: whoever was in the room when it started.
  players uuid[] not null,
  -- Who left the room during it, and when: they don't hold up the rest, even if they come back.
  departures jsonb not null default '{}',
  -- The questions (by id) or the waits of the lights, decided when it starts. Never sent whole to a phone.
  content jsonb not null,
  started_at timestamptz not null,
  -- After the countdown.
  starts_at timestamptz not null,
  ended_at timestamptz,
  -- Each player's place and points, written once, when it ends.
  results jsonb,
  winners uuid[] not null default '{}'
);

create index battle_matches_battle_idx on game.battle_matches (battle_id, started_at desc);
-- One match at a time in a room: a rematch waits until the last one was written down.
create unique index battle_matches_one_open on game.battle_matches (battle_id) where ended_at is null;
create index battle_matches_group_idx on game.battle_matches (group_id, ended_at desc);

-- ───────────── Moves ─────────────
-- One per player and round: a question (when it was shown and the answer)
-- or a start (the reaction). The server's clock times them.
create table game.battle_moves (
  match_id uuid not null references game.battle_matches (id) on delete cascade,
  user_id uuid not null references game.users (id) on delete cascade,
  round smallint not null check (round between 0 and 20),
  shown_at timestamptz,
  played_at timestamptz,
  -- Cinco Preguntas: the option in the question's own order (0 is the right one).
  choice smallint,
  -- Largada.
  reaction_ms integer,
  false_start boolean,
  primary key (match_id, user_id, round)
);

create index battle_moves_user_idx on game.battle_moves (user_id);

-- ───────────── Access ─────────────
grant select, insert, update on game.battles, game.battle_players, game.battle_matches, game.battle_moves to app_server;

revoke all on game.battles, game.battle_players, game.battle_matches, game.battle_moves from anon, authenticated;

alter table game.battles enable row level security;
alter table game.battle_players enable row level security;
alter table game.battle_matches enable row level security;
alter table game.battle_moves enable row level security;

create policy battles_server_all on game.battles for all to app_server using (true) with check (true);
create policy battle_players_server_all on game.battle_players for all to app_server using (true) with check (true);
create policy battle_matches_server_all on game.battle_matches for all to app_server using (true) with check (true);
create policy battle_moves_server_all on game.battle_moves for all to app_server using (true) with check (true);
