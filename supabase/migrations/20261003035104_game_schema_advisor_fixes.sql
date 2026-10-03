-- Fixes from Supabase's advisors.

-- A fixed, empty search_path: the function only uses built-ins (pg_catalog).
alter function game.search_name(text) set search_path = '';

-- An index for the attempts → places foreign key.
create index if not exists attempts_place_idx on game.attempts (place_id) where place_id is not null;
