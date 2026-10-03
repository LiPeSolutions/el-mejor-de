import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { searchLocalities, searchText } from './places';
import { testDatabase, type TestDatabase } from './testing';

let db: TestDatabase;
beforeAll(async () => {
  db = await testDatabase();
  await db.query(
    `insert into game.places (id, kind, parent_id, name) values
       ('ar', 'country', null, 'Argentina'),
       ('ar-06', 'province', 'ar', 'Buenos Aires'),
       ('ar-02', 'province', 'ar', 'Ciudad Autónoma de Buenos Aires'),
       ('ar-06217', 'department', 'ar-06', 'Chivilcoy'),
       ('ar-06217010000', 'locality', 'ar-06217', 'Chivilcoy'),
       ('ar-06134', 'department', 'ar-06', 'Cañuelas'),
       ('ar-06134010000', 'locality', 'ar-06134', 'Cañuelas'),
       ('ar-06217020000', 'locality', 'ar-06217', 'Moquehuá'),
       ('ar-02000010000', 'locality', 'ar-02', 'Villa Chivilcoy')`,
  );
});
afterAll(async () => {
  await db.close();
});

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
    expect(results[0]).toEqual({ id: 'ar-06217010000', name: 'Chivilcoy', department: 'Chivilcoy', province: 'Buenos Aires' });
  });

  it('matches accented names typed without accents, and the other way around', async () => {
    expect((await searchLocalities(db, 'canuelas'))[0]?.name).toBe('Cañuelas');
    expect((await searchLocalities(db, 'MOQUEHUÁ'))[0]?.name).toBe('Moquehuá');
  });

  it('works for localities that hang straight from a province', async () => {
    const [villa] = await searchLocalities(db, 'villa chiv');
    expect(villa).toMatchObject({ department: null, province: 'Ciudad Autónoma de Buenos Aires' });
  });

  it('needs at least two letters', async () => {
    expect(await searchLocalities(db, 'c')).toEqual([]);
  });

  it('is readable by the server role', async () => {
    const results = await db.as('app_server', (server) => searchLocalities(server, 'chivilcoy'));
    expect(results).toHaveLength(2);
  });
});
