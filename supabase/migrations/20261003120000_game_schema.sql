-- Game data lives in its own schema, which Supabase's Data API does not expose:
-- browsers never read or write it directly. Only the web server, through the
-- `app_server` role, can touch it, and only in the ways granted below.

create schema if not exists game;
revoke all on schema game from public;

-- Lowercase and without accents, for search: 'Cañuelas' -> 'canuelas'.
create function game.search_name(value text) returns text
language sql immutable parallel safe
as $$
  select lower(translate(value, 'ÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑáàäâéèëêíìïîóòöôúùüûñ', 'AAAAEEEEIIIIOOOOUUUUNaaaaeeeeiiiioooouuuun'))
$$;

-- ───────────── Places ─────────────
-- A generic hierarchy (country → province → department → locality), so other
-- countries can be added later. Argentine ids are Georef's (datos.gob.ar) with
-- the country in front: 'ar-06' (Buenos Aires), 'ar-06217' (Chivilcoy, the
-- department), 'ar-06217010000' (Chivilcoy, the town). Loaded by
-- supabase/scripts/import-places.sql.
create table game.places (
  id text primary key,
  kind text not null check (kind in ('country', 'province', 'department', 'locality')),
  parent_id text references game.places (id),
  name text not null,
  search_name text generated always as (game.search_name(name)) stored,
  lat double precision,
  lon double precision,
  -- Localities: how far from the center a GPS check still counts, in km.
  radius_km real,
  updated_at timestamptz not null default now()
);

create index places_parent_idx on game.places (parent_id);
create index places_kind_idx on game.places (kind);

-- ───────────── Attempts ─────────────
-- One row per daily challenge started. The two unique indexes are the
-- "one attempt" rule: once per browser, and once per account.
create table game.attempts (
  id uuid primary key,
  device_id uuid not null,
  user_id uuid,
  game_date date not null,
  slot smallint not null check (slot between 0 and 2),
  game text not null check (game in ('seven-letters', 'five-questions', 'reflexes', 'sequence')),
  status text not null default 'started' check (status in ('started', 'finished')),
  started_at timestamptz not null,
  finished_at timestamptz,
  score integer check (score between 0 and 1000),
  result jsonb,
  -- Plausibility flags from grading (see packages/games).
  flags jsonb not null default '[]'::jsonb,
  -- Server-side progress while playing, e.g. when each trivia question was
  -- first shown, so asking for it again doesn't restart its clock.
  progress jsonb not null default '{"served": {}}'::jsonb,
  -- Where the player was registered when playing. Rankings use it, so moving
  -- doesn't change old scores. Null for players without an account.
  place_id text references game.places (id),
  constraint attempts_finished_complete check ((status = 'finished') = (finished_at is not null and score is not null))
);

create unique index attempts_one_per_device on game.attempts (device_id, game_date, slot);
create unique index attempts_one_per_user on game.attempts (user_id, game_date, slot) where user_id is not null;
create index attempts_rankings_idx on game.attempts (game_date, place_id) where status = 'finished';

-- ───────────── Access ─────────────
-- The web server's role. Its password is set outside the repository:
--   alter role app_server with password '…';
do $$
begin
  if not exists (select from pg_roles where rolname = 'app_server') then
    create role app_server login noinherit;
  end if;
end
$$;

alter role app_server set statement_timeout = '8s';

grant usage on schema game to app_server;
grant execute on function game.search_name(text) to app_server;
grant select on game.places to app_server;
grant select, insert, update on game.attempts to app_server;

-- Supabase's API roles get nothing here, even by mistake.
revoke all on all tables in schema game from anon, authenticated;

-- Row level security as a second lock: if the schema were ever exposed, only
-- the server role has policies.
alter table game.places enable row level security;
alter table game.attempts enable row level security;

create policy places_server_read on game.places for select to app_server using (true);
create policy attempts_server_all on game.attempts for all to app_server using (true) with check (true);
