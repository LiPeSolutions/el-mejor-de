-- Secuencia in live battles (docs/BATALLAS.md §13): each round is one move
-- per player, with whether they repeated it right and the colors they
-- tapped (to tell how far they got). A match can have more rounds than the
-- other games: up to 28 levels, and each level can be played again in a
-- tiebreak (up to 4 times).
alter table game.battle_moves add column correct boolean;
alter table game.battle_moves add column inputs smallint[]
  check (inputs is null or (cardinality(inputs) <= 30 and inputs <@ array[0, 1, 2, 3]::smallint[]));

alter table game.battle_moves drop constraint battle_moves_round_check;
alter table game.battle_moves add constraint battle_moves_round_check check (round between 0 and 199);
