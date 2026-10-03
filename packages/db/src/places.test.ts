import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser, getUser, type User } from './accounts';
import { claimAttempt, finishAttempt, getAttempt } from './attempts';
import { latestPlaceCrown, userCrowns } from './groups';
import {
  assignUnplacedAttempts,
  countLocationChecksSince,
  getLocality,
  listProvinces,
  localitiesPlayed,
  markPlaceVerified,
  markPlaceWeekDecided,
  nearbyLocalities,
  placeRanking,
  placeWeekLeaders,
  recordLocationCheck,
  recordPlaceCrown,
  searchLocalities,
  searchText,
  setUserPlace,
  undecidedPlaceWeeks,
  verifiedBetween,
} from './places';
import { testDatabase, type TestDatabase } from './testing';

let db: TestDatabase;
beforeAll(async () => {
  db = await testDatabase();
  await db.query(
    `insert into game.places (id, kind, parent_id, name, lat, lon, radius_km) values
       ('ar', 'country', null, 'Argentina', null, null, null),
       ('ar-06', 'province', 'ar', 'Buenos Aires', null, null, null),
       ('ar-02', 'province', 'ar', 'Ciudad Autónoma de Buenos Aires', null, null, null),
       ('ar-06224', 'department', 'ar-06', 'Chivilcoy', null, null, null),
       ('ar-06224010', 'locality', 'ar-06224', 'Chivilcoy', -34.8969, -60.01909, 12),
       ('ar-06224050', 'locality', 'ar-06224', 'Moquehuá', -35.09221, -59.77571, 12),
       ('ar-06134', 'department', 'ar-06', 'Cañuelas', null, null, null),
       ('ar-06134010', 'locality', 'ar-06134', 'Cañuelas', -35.05185, -58.76056, 12),
       ('ar-02042', 'department', 'ar-02', 'Comuna 6', null, null, null),
       ('ar-0204201001', 'locality', 'ar-02042', 'Caballito', -34.61627, -58.44055, 12),
       ('ar-02098', 'department', 'ar-02', 'Comuna 14', null, null, null),
       ('ar-0209801001', 'locality', 'ar-02098', 'Palermo', -34.58124, -58.42102, 12),
       ('ar-02000010', 'locality', 'ar-02', 'Villa Chivilcoy', null, null, null)`,
  );
});
beforeEach(async () => {
  await db.query('truncate game.crowns, game.place_weeks, game.location_checks, game.attempts, game.users cascade');
});
afterAll(async () => {
  await db.close();
});

const AVATAR = { species: 'zorro', color: 'natural', accessory: null };
/** The week of 5/10/2026 in Argentina (UTC-3): Monday 03:00 UTC to the next Monday. */
const WEEK = { from: '2026-10-05', to: '2026-10-11', weekFrom: Date.parse('2026-10-05T03:00:00Z'), weekTo: Date.parse('2026-10-12T03:00:00Z') };

async function player(username: string, placeId: string | null = null): Promise<User> {
  const user = await createUser(db, { username, passwordHash: 'x', avatar: AVATAR, article: 'el' });
  if (!user) throw new Error(`couldn't create ${username}`);
  if (placeId) await setUserPlace(db, user.id, placeId, Date.parse('2026-10-05T12:00:00Z'));
  return user;
}

/** A finished daily challenge, counted in `placeId` (or in none). */
async function played(user: User, placeId: string | null, date: string, slot: number, score: number, finishedAt: number) {
  const { attempt } = await claimAttempt(db, { id: randomUUID(), deviceId: randomUUID(), userId: user.id, date, slot, game: 'reflexes', startedAt: finishedAt - 60_000, placeId });
  await finishAttempt(db, attempt.id, { finishedAt, score, result: {}, flags: [] });
  return attempt.id;
}

const at = (iso: string) => Date.parse(iso);
const check = (user: User, placeId: string, when: string, result: 'verified' | 'too-far' = 'verified') =>
  recordLocationCheck(db, { userId: user.id, placeId, result, at: at(when) });

describe('searchText', () => {
  it('ignores accents, case and symbols', () => {
    expect(searchText('  Cañuelas!  ')).toBe('canuelas');
    expect(searchText('San Carlos de Bariloche')).toBe('san carlos de bariloche');
    expect(searchText('100%_')).toBe('100');
  });
});

describe('searchLocalities', () => {
  it('finds localities without accents and puts prefix matches first', async () => {
    const results = await searchLocalities(db, 'chivil');
    expect(results.map((place) => place.name)).toEqual(['Chivilcoy', 'Villa Chivilcoy']);
    expect(results[0]).toEqual({ id: 'ar-06224010', name: 'Chivilcoy', department: 'Chivilcoy', province: 'Buenos Aires', provinceId: 'ar-06' });
  });

  it('matches accented names typed without accents, and the other way around', async () => {
    expect((await searchLocalities(db, 'canuelas'))[0]?.name).toBe('Cañuelas');
    expect((await searchLocalities(db, 'MOQUEHUÁ'))[0]?.name).toBe('Moquehuá');
  });

  it('works for localities that hang straight from a province', async () => {
    const [villa] = await searchLocalities(db, 'villa chiv');
    expect(villa).toMatchObject({ department: null, province: 'Ciudad Autónoma de Buenos Aires' });
  });

  it('narrows to one province and leaves some out', async () => {
    expect((await searchLocalities(db, 'chivil', { provinceId: 'ar-02' })).map((place) => place.name)).toEqual(['Villa Chivilcoy']);
    expect((await searchLocalities(db, 'chivil', { exclude: ['ar-02000010'] })).map((place) => place.name)).toEqual(['Chivilcoy']);
  });

  it('needs at least two letters', async () => {
    expect(await searchLocalities(db, 'c')).toEqual([]);
  });

  it('is readable by the server role', async () => {
    const results = await db.as('app_server', (server) => searchLocalities(server, 'chivilcoy'));
    expect(results).toHaveLength(2);
  });
});

describe('localities', () => {
  it('lists the provinces', async () => {
    expect((await listProvinces(db)).map((province) => province.name)).toEqual(['Buenos Aires', 'Ciudad Autónoma de Buenos Aires']);
  });

  it('reads a locality with its department, province and country', async () => {
    expect(await getLocality(db, 'ar-0204201001')).toEqual({
      id: 'ar-0204201001',
      name: 'Caballito',
      lat: -34.61627,
      lon: -58.44055,
      radiusKm: 12,
      departmentId: 'ar-02042',
      department: 'Comuna 6',
      provinceId: 'ar-02',
      province: 'Ciudad Autónoma de Buenos Aires',
      countryId: 'ar',
    });
    expect(await getLocality(db, 'ar-06')).toBeNull();
  });

  it('finds the localities near a position, nearest first', async () => {
    const near = await nearbyLocalities(db, { lat: -34.62, lon: -58.44 });
    expect(near.map((place) => place.name)).toEqual(['Caballito', 'Palermo', 'Cañuelas']);
    expect(near[0]!.km).toBeLessThan(1);
    // Far from everything nearby, it looks further.
    expect((await nearbyLocalities(db, { lat: -36.5, lon: -60 }))[0]?.name).toBe('Moquehuá');
  });
});

describe('where each player competes', () => {
  it('keeps the locality, its name and when the GPS confirmed it', async () => {
    const tincho = await player('Tincho');
    await setUserPlace(db, tincho.id, 'ar-06224010', null);
    expect(await getUser(db, tincho.id)).toMatchObject({ placeId: 'ar-06224010', placeName: 'Chivilcoy', placeVerifiedAt: null });
    await markPlaceVerified(db, tincho.id, at('2026-10-06T12:00:00Z'));
    expect((await getUser(db, tincho.id))?.placeVerifiedAt).toBe(at('2026-10-06T12:00:00Z'));
  });

  it('records the checks and knows which passed in a week', async () => {
    const tincho = await player('Tincho');
    await check(tincho, 'ar-06224010', '2026-10-04T12:00:00Z');
    await check(tincho, 'ar-06224010', '2026-10-07T12:00:00Z', 'too-far');
    expect(await verifiedBetween(db, tincho.id, 'ar-06224010', WEEK.weekFrom, WEEK.weekTo)).toBe(false);
    await check(tincho, 'ar-06224010', '2026-10-08T12:00:00Z');
    expect(await verifiedBetween(db, tincho.id, 'ar-06224010', WEEK.weekFrom, WEEK.weekTo)).toBe(true);
    expect(await countLocationChecksSince(db, tincho.id, at('2026-10-05T00:00:00Z'))).toBe(2);
  });

  it("puts this week's challenges played before verifying in the place", async () => {
    const tincho = await player('Tincho');
    const before = await played(tincho, null, '2026-10-06', 0, 500, at('2026-10-06T15:00:00Z'));
    const lastWeek = await played(tincho, null, '2026-10-01', 0, 500, at('2026-10-01T15:00:00Z'));
    const elsewhere = await played(tincho, 'ar-06134010', '2026-10-06', 1, 500, at('2026-10-06T16:00:00Z'));
    expect(await assignUnplacedAttempts(db, { userId: tincho.id, placeId: 'ar-06224010', fromDate: '2026-10-05' })).toBe(1);
    expect((await getAttempt(db, before))!).toBeTruthy();
    const places = await db.query<{ id: string; place_id: string | null }>(`select id, place_id from game.attempts`);
    const placeOf = (id: string) => places.find((row) => row.id === id)?.place_id;
    expect([placeOf(before), placeOf(lastWeek), placeOf(elsewhere)]).toEqual(['ar-06224010', null, 'ar-06134010']);
    expect((await localitiesPlayed(db, tincho.id, '2026-10-05', '2026-10-11')).sort()).toEqual(['ar-06134010', 'ar-06224010']);
  });
});

describe('placeRanking', () => {
  it('ranks a locality with the best 5 days, and a province and the country above it', async () => {
    const tincho = await player('Tincho', 'ar-06224010');
    const juli = await player('Juli', 'ar-0204201001');
    const colo = await player('Colo', 'ar-06134010');
    // Tincho plays six days: the worst one doesn't count.
    for (let day = 0; day < 6; day += 1) {
      const date = `2026-10-${String(5 + day).padStart(2, '0')}`;
      await played(tincho, 'ar-06224010', date, 0, 100 * (day + 1), at(`${date}T15:00:00Z`));
    }
    await played(juli, 'ar-0204201001', '2026-10-06', 0, 1000, at('2026-10-06T15:00:00Z'));
    await played(colo, 'ar-06134010', '2026-10-06', 0, 900, at('2026-10-06T15:00:00Z'));

    const chivilcoy = await placeRanking(db, { placeId: 'ar-06224010', ...WEEK });
    expect(chivilcoy.players).toBe(1);
    expect(chivilcoy.rows[0]).toMatchObject({ username: 'Tincho', locality: 'Chivilcoy', score: 2000, daysPlayed: 6, bestDay: 600, position: 1 });

    const province = await placeRanking(db, { placeId: 'ar-06', ...WEEK });
    expect(province.rows.map((row) => [row.username, row.score])).toEqual([
      ['Tincho', 2000],
      ['Colo', 900],
    ]);
    const country = await placeRanking(db, { placeId: 'ar', ...WEEK });
    expect(country.rows.map((row) => row.username)).toEqual(['Tincho', 'Juli', 'Colo']);
    expect(country.rows.find((row) => row.username === 'Juli')?.locality).toBe('Caballito');
  });

  it('breaks ties by who got there first, and ranks only one day too', async () => {
    const tincho = await player('Tincho', 'ar-0204201001');
    const juli = await player('Juli', 'ar-0204201001');
    await played(juli, 'ar-0204201001', '2026-10-07', 0, 800, at('2026-10-07T15:00:00Z'));
    await played(tincho, 'ar-0204201001', '2026-10-07', 0, 800, at('2026-10-07T16:00:00Z'));
    await played(tincho, 'ar-0204201001', '2026-10-08', 0, 0, at('2026-10-08T16:00:00Z'));
    const week = await placeRanking(db, { placeId: 'ar-0204201001', ...WEEK });
    expect(week.rows.map((row) => [row.username, row.position, row.reachedAt])).toEqual([
      ['Juli', 1, at('2026-10-07T15:00:00Z')],
      ['Tincho', 2, at('2026-10-07T16:00:00Z')],
    ]);
    const day = await placeRanking(db, { placeId: 'ar-0204201001', ...WEEK, from: '2026-10-08', to: '2026-10-08' });
    expect(day.rows.map((row) => [row.username, row.score])).toEqual([['Tincho', 0]]);
  });

  it('gives the live crown to the first one who verified this week', async () => {
    const tincho = await player('Tincho', 'ar-0204201001');
    const juli = await player('Juli', 'ar-0204201001');
    await played(tincho, 'ar-0204201001', '2026-10-06', 0, 900, at('2026-10-06T15:00:00Z'));
    await played(juli, 'ar-0204201001', '2026-10-06', 0, 700, at('2026-10-06T15:00:00Z'));
    await check(tincho, 'ar-0204201001', '2026-10-04T12:00:00Z'); // last week: it doesn't count
    await check(juli, 'ar-0204201001', '2026-10-06T12:00:00Z');
    const ranking = await placeRanking(db, { placeId: 'ar-02', ...WEEK });
    expect(ranking.rows.map((row) => [row.username, row.verifiedInWeek, row.holder])).toEqual([
      ['Tincho', false, false],
      ['Juli', true, true],
    ]);
    const leaders = await placeWeekLeaders(db, { placeId: 'ar-02', ...WEEK });
    expect(leaders).toMatchObject({ players: 2, leaders: [{ username: 'Juli' }] });
  });

  it('brings the top, the player asking and the crown holder', async () => {
    const users: User[] = [];
    for (let i = 0; i < 5; i += 1) users.push(await player(`Jugador${i}`, 'ar-06224010'));
    for (const [i, user] of users.entries()) await played(user, 'ar-06224010', '2026-10-06', 0, 900 - i * 100, at('2026-10-06T15:00:00Z'));
    await check(users[4]!, 'ar-06224010', '2026-10-06T12:00:00Z');
    const ranking = await placeRanking(db, { placeId: 'ar-06224010', ...WEEK, limit: 2, meId: users[3]!.id });
    expect(ranking.players).toBe(5);
    expect(ranking.rows.map((row) => row.position)).toEqual([1, 2, 4, 5]);
    expect(ranking.rows.find((row) => row.holder)?.username).toBe('Jugador4');
  });
});

describe('crowns of places', () => {
  it('knows which weeks are still to decide', async () => {
    await markPlaceWeekDecided(db, 'ar-06', '2026-10-05');
    await markPlaceWeekDecided(db, 'ar-06', '2026-10-05');
    expect(await undecidedPlaceWeeks(db, 'ar-06', ['2026-10-05', '2026-10-12'])).toEqual(['2026-10-12']);
    expect(await undecidedPlaceWeeks(db, 'ar-02', [])).toEqual([]);
  });

  it("records a place's crown once and shows it in the palmarés", async () => {
    const juli = await player('Juli', 'ar-0204201001');
    const crown = { placeId: 'ar-0204201001', weekStart: '2026-10-05', userId: juli.id, score: 4000, daysPlayed: 4, players: 3, runnerUpId: null, runnerUpScore: null, title: 'Caballito' };
    await recordPlaceCrown(db, crown);
    await recordPlaceCrown(db, { ...crown, score: 1 });
    const [won] = await userCrowns(db, juli.id);
    expect(won).toMatchObject({ placeId: 'ar-0204201001', placeKind: 'locality', groupId: null, title: 'Caballito', score: 4000, emblem: null });
    expect((await latestPlaceCrown(db, 'ar-0204201001'))?.id).toBe(won!.id);
  });
});

describe('permissions', () => {
  it('lets the server role check locations and decide weeks', async () => {
    const tincho = await player('Tincho');
    await db.as('app_server', async (server) => {
      await setUserPlace(server, tincho.id, 'ar-06224010', Date.now());
      await recordLocationCheck(server, { userId: tincho.id, placeId: 'ar-06224010', result: 'verified', at: Date.now() });
      await markPlaceWeekDecided(server, 'ar-06224010', '2026-10-05');
      expect((await placeRanking(server, { placeId: 'ar', ...WEEK })).players).toBe(0);
      expect(await nearbyLocalities(server, { lat: -34.9, lon: -60 })).not.toHaveLength(0);
    });
  });

  it("doesn't let the server role delete checks or decided weeks, nor write places", async () => {
    for (const table of ['location_checks', 'place_weeks']) {
      await expect(db.as('app_server', (server) => server.query(`delete from game.${table}`))).rejects.toThrow(/permission denied/);
    }
    await expect(db.as('app_server', (server) => server.query(`update game.places set name = 'x'`))).rejects.toThrow(/permission denied/);
  });

  it("keeps Supabase's public API roles out", async () => {
    for (const role of ['anon', 'authenticated']) {
      for (const table of ['location_checks', 'place_weeks']) {
        await expect(db.as(role, (client) => client.query(`select * from game.${table}`))).rejects.toThrow(/permission denied/);
      }
    }
  });
});

