-- Tubitos ("water-sort") joins the daily challenges. Its levels' served and
-- solved moments go in attempts.progress, like the trivia questions.
alter table game.attempts drop constraint attempts_game_check;
alter table game.attempts add constraint attempts_game_check
  check (game in ('seven-letters', 'five-questions', 'reflexes', 'sequence', 'water-sort'));
