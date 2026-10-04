-- Diez Letras in live battles (docs/BATALLAS.md §13): every word a player
-- finds is one row, so it doesn't fit in battle_moves (one per round). Only
-- valid words are kept, each one once per player; their points come from
-- the game's rules when the table is worked out.
create table game.battle_words (
  match_id uuid not null references game.battle_matches (id) on delete cascade,
  user_id uuid not null references game.users (id) on delete cascade,
  -- Normalized like the dictionary: capitals without accents, Ñ kept.
  word text not null check (word ~ '^[A-ZÑ]{3,10}$'),
  -- The server's clock: a tie goes to whoever reached the points first.
  played_at timestamptz not null,
  primary key (match_id, user_id, word)
);

create index battle_words_user_idx on game.battle_words (user_id);

grant select, insert on game.battle_words to app_server;

revoke all on game.battle_words from anon, authenticated;

alter table game.battle_words enable row level security;

create policy battle_words_server_all on game.battle_words for all to app_server using (true) with check (true);
