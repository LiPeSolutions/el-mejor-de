-- With accounts, "once per browser" applies only to anonymous play
-- (attempts_one_per_anonymous_device, previous migration). The index that
-- applied it to everyone goes away.
drop index game.attempts_one_per_device;
