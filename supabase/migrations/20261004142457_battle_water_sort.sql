-- Tubitos ("water-sort") joins the live battles (docs/BATALLAS.md §13): the
-- same three boards for everyone, like the daily challenge. A solved board
-- is one move, with its steps, which the server replays to score it.
alter table game.battles drop constraint battles_game_check;
alter table game.battles add constraint battles_game_check
  check (game in ('seven-letters', 'five-questions', 'reflexes', 'sequence', 'water-sort'));

alter table game.battle_matches drop constraint battle_matches_game_check;
alter table game.battle_matches add constraint battle_matches_game_check
  check (game in ('seven-letters', 'five-questions', 'reflexes', 'sequence', 'water-sort'));

-- Tubitos: the steps of the board, as the phone played them ({ events, durationMs }).
alter table game.battle_moves add column log jsonb;
