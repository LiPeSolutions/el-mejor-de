-- Competing for your place (docs/PLAN.md §4 and §5): the locality each
-- player chose, when the GPS confirmed it, and the weekly crowns of every
-- locality (in the city, barrio), province and the country. Coordinates are
-- never stored: only whether the check passed.

-- When the GPS last confirmed the player's current locality (null: not yet).
alter table game.users add column place_verified_at timestamptz;

-- ───────────── Location checks ─────────────
-- One row per check. To win a place's crown you need one that passed
-- during that week.
create table game.location_checks (
  id bigint generated always as identity primary key,
  user_id uuid not null references game.users (id) on delete cascade,
  place_id text not null references game.places (id),
  result text not null check (result in ('verified', 'too-far')),
  at timestamptz not null
);

create index location_checks_user_idx on game.location_checks (user_id, at);
create index location_checks_place_idx on game.location_checks (place_id);

-- ───────────── Decided weeks ─────────────
-- The weeks whose crown of a place was already decided, so they aren't
-- looked at again (the server can't write game.places).
create table game.place_weeks (
  place_id text not null references game.places (id),
  week_start date not null,
  primary key (place_id, week_start)
);

-- ───────────── Access ─────────────
grant select, insert on game.location_checks, game.place_weeks to app_server;

revoke all on game.location_checks, game.place_weeks from anon, authenticated;

alter table game.location_checks enable row level security;
alter table game.place_weeks enable row level security;

create policy location_checks_server_all on game.location_checks for all to app_server using (true) with check (true);
create policy place_weeks_server_all on game.place_weeks for all to app_server using (true) with check (true);
