import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { claimAttempt, finishAttempt, questionServedAt } from './attempts';
import { testDatabase, type TestDatabase } from './testing';

let db: TestDatabase;
beforeAll(async () => {
  db = await testDatabase();
});
beforeEach(async () => {
  await db.query('truncate game.attempts');
});
afterAll(async () => {
  await db.close();
});

const START = Date.parse('2026-10-03T15:00:00Z');

function attempt(overrides: Partial<Parameters<typeof claimAttempt>[1]> = {}) {
  return {
    id: randomUUID(),
    deviceId: '11111111-1111-4111-8111-111111111111',
    date: '2026-10-03',
    slot: 0,
    game: 'reflexes',
    startedAt: START,
    ...overrides,
  };
}

const grade = (score: number) => ({ finishedAt: START + 60_000, score, result: { game: 'reflexes', score }, flags: [] });

describe('claimAttempt', () => {
  it('starts a challenge once per browser', async () => {
    const first = await claimAttempt(db, attempt());
    expect(first.created).toBe(true);
    expect(first.attempt).toMatchObject({ status: 'started', date: '2026-10-03', slot: 0, startedAt: START, score: null });

    const again = await claimAttempt(db, attempt({ startedAt: START + 5_000 }));
    expect(again.created).toBe(false);
    expect(again.attempt.id).toBe(first.attempt.id);
  });

  it('lets the same browser play the other slots and other days', async () => {
    await claimAttempt(db, attempt());
    expect((await claimAttempt(db, attempt({ slot: 1 }))).created).toBe(true);
    expect((await claimAttempt(db, attempt({ date: '2026-10-04' }))).created).toBe(true);
  });

  it('starts a challenge once per account, even from another browser', async () => {
    const userId = randomUUID();
    const first = await claimAttempt(db, attempt({ userId }));
    const otherBrowser = await claimAttempt(db, attempt({ userId, deviceId: randomUUID() }));
    expect(otherBrowser.created).toBe(false);
    expect(otherBrowser.attempt.id).toBe(first.attempt.id);
  });

  it('keeps players apart', async () => {
    await claimAttempt(db, attempt());
    expect((await claimAttempt(db, attempt({ deviceId: randomUUID() }))).created).toBe(true);
  });
});

describe('finishAttempt', () => {
  it('records the result', async () => {
    const { attempt: started } = await claimAttempt(db, attempt());
    const finished = await finishAttempt(db, started.id, grade(640));
    expect(finished?.updated).toBe(true);
    expect(finished?.attempt).toMatchObject({ status: 'finished', score: 640, finishedAt: START + 60_000, result: { game: 'reflexes', score: 640 } });
  });

  it('stores the result as a JSON object, not as text', async () => {
    const { attempt: started } = await claimAttempt(db, attempt());
    await finishAttempt(db, started.id, grade(640));
    const [row] = await db.query<{ kind: string; score: number }>(
      `select jsonb_typeof(result) as kind, (result ->> 'score')::int as score from game.attempts where id = $1`,
      [started.id],
    );
    expect(row).toEqual({ kind: 'object', score: 640 });
  });

  it('grades a challenge only once', async () => {
    const { attempt: started } = await claimAttempt(db, attempt());
    await finishAttempt(db, started.id, grade(400));
    const retry = await finishAttempt(db, started.id, grade(1000));
    expect(retry?.updated).toBe(false);
    expect(retry?.attempt.score).toBe(400);
  });

  it('returns null for an unknown attempt', async () => {
    expect(await finishAttempt(db, randomUUID(), grade(100))).toBeNull();
  });
});

describe('questionServedAt', () => {
  it('keeps the moment a question was first shown', async () => {
    const { attempt: started } = await claimAttempt(db, attempt({ game: 'five-questions' }));
    expect(await questionServedAt(db, started.id, 0, START + 1_000)).toBe(START + 1_000);
    expect(await questionServedAt(db, started.id, 0, START + 9_000)).toBe(START + 1_000);
    expect(await questionServedAt(db, started.id, 1, START + 20_000)).toBe(START + 20_000);
  });

  it('serves nothing once the attempt is finished', async () => {
    const { attempt: started } = await claimAttempt(db, attempt({ game: 'five-questions' }));
    await finishAttempt(db, started.id, grade(200));
    expect(await questionServedAt(db, started.id, 2, START + 70_000)).toBeNull();
  });
});

describe('permissions', () => {
  it('lets the server role start and finish attempts', async () => {
    await db.as('app_server', async (server) => {
      const { attempt: started } = await claimAttempt(server, attempt());
      expect((await finishAttempt(server, started.id, grade(500)))?.attempt.score).toBe(500);
    });
  });

  it("doesn't let the server role delete attempts", async () => {
    await claimAttempt(db, attempt());
    await expect(db.as('app_server', (server) => server.query('delete from game.attempts'))).rejects.toThrow(/permission denied/);
  });

  it("keeps Supabase's public API roles out", async () => {
    for (const role of ['anon', 'authenticated']) {
      await expect(db.as(role, (client) => client.query('select * from game.attempts'))).rejects.toThrow(/permission denied/);
    }
  });

  it('refuses a finished attempt without a score', async () => {
    await expect(
      db.query(
        `insert into game.attempts (id, device_id, game_date, slot, game, status, started_at)
         values ($1, $2, '2026-10-03', 0, 'reflexes', 'finished', now())`,
        [randomUUID(), randomUUID()],
      ),
    ).rejects.toThrow(/attempts_finished_complete/);
  });
});
