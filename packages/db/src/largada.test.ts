import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser, type User } from './accounts';
import { claimAttempt, finishAttempt } from './attempts';
import { bestLargadaIn, largadaRaces } from './largada';
import { testDatabase, type TestDatabase } from './testing';

let db: TestDatabase;
beforeAll(async () => {
  db = await testDatabase();
  await db.query(
    `insert into game.places (id, kind, parent_id, name, lat, lon, radius_km) values
       ('ar', 'country', null, 'Argentina', null, null, null),
       ('ar-06', 'province', 'ar', 'Buenos Aires', null, null, null),
       ('ar-06224', 'department', 'ar-06', 'Chivilcoy', null, null, null),
       ('ar-06224010', 'locality', 'ar-06224', 'Chivilcoy', -34.8969, -60.01909, 12),
       ('ar-06224050', 'locality', 'ar-06224', 'Moquehuá', -35.09221, -59.77571, 12)`,
  );
});
beforeEach(async () => {
  await db.query('truncate game.attempts, game.users cascade');
});
afterAll(async () => {
  await db.close();
});

const AVATAR = { species: 'rana', color: 'natural', accessory: null };
const DAY = '2026-10-07';
const AT = Date.parse('2026-10-07T15:00:00Z');

async function player(username: string): Promise<User> {
  const user = await createUser(db, { username, passwordHash: 'x', avatar: AVATAR, article: 'el' });
  if (!user) throw new Error(`couldn't create ${username}`);
  return user;
}

async function raced(user: User, score: number, options: { placeId?: string; version?: string; date?: string; game?: 'reflexes' | 'sequence'; at?: number } = {}) {
  const { attempt } = await claimAttempt(db, {
    id: randomUUID(),
    deviceId: randomUUID(),
    userId: user.id,
    date: options.date ?? DAY,
    slot: 1,
    game: options.game ?? 'reflexes',
    startedAt: (options.at ?? AT) - 40_000,
    placeId: options.placeId ?? null,
  });
  const result = { game: 'reflexes', version: options.version ?? 'largada', score, rounds: [{ outcome: 'hit', reactionMs: 231 }] };
  await finishAttempt(db, attempt.id, { finishedAt: options.at ?? AT, score, result, flags: [] });
}

describe('largada races', () => {
  it('are the finished Largadas of these players that day', async () => {
    const [tincho, juli, caro, sofi] = [await player('Tincho'), await player('Juli'), await player('Caro'), await player('Sofi')];
    await raced(tincho, 891);
    await raced(juli, 917, { at: AT + 60_000 });
    await raced(caro, 700, { version: 'old' }); // the color-change game
    await raced(sofi, 724, { date: '2026-10-06' });
    const races = await largadaRaces(db, { userIds: [tincho.id, juli.id, caro.id, sofi.id], date: DAY });
    expect(races.map((race) => [race.username, race.score])).toEqual([
      ['Tincho', 891],
      ['Juli', 917],
    ]);
    expect(races[0]).toMatchObject({ avatar: AVATAR, article: 'el', finishedAt: AT, result: { version: 'largada', rounds: [{ outcome: 'hit', reactionMs: 231 }] } });
    expect(await largadaRaces(db, { userIds: [], date: DAY })).toEqual([]);
  });

  it('give the best of a place, other than me', async () => {
    const [nico, pato, ana] = [await player('Nico'), await player('Pato'), await player('Ana')];
    await raced(nico, 990, { placeId: 'ar-06224010' });
    await raced(pato, 880, { placeId: 'ar-06224010' });
    await raced(ana, 940, { placeId: 'ar-06224050' });
    expect((await bestLargadaIn(db, { placeId: 'ar-06224010', date: DAY, exceptUserId: nico.id }))?.username).toBe('Pato');
    expect((await bestLargadaIn(db, { placeId: 'ar-06', date: DAY, exceptUserId: nico.id }))?.username).toBe('Ana');
    expect((await bestLargadaIn(db, { placeId: 'ar', date: DAY, exceptUserId: null }))?.username).toBe('Nico');
    expect(await bestLargadaIn(db, { placeId: 'ar-06224010', date: '2026-10-08', exceptUserId: null })).toBeNull();
  });
});
