import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  countAuthEvents,
  createSession,
  createUser,
  endSession,
  extendSession,
  findUserForSignIn,
  getSession,
  getUser,
  linkDeviceAttempts,
  recordAuthEvent,
  updateProfile,
  usernameTaken,
} from './accounts';
import { claimAttempt, getAttempt } from './attempts';
import { testDatabase, type TestDatabase } from './testing';

let db: TestDatabase;
beforeAll(async () => {
  db = await testDatabase();
});
beforeEach(async () => {
  await db.query('truncate game.attempts, game.sessions, game.auth_events, game.users');
});
afterAll(async () => {
  await db.close();
});

const AVATAR = { species: 'hornero', color: 'natural', accessory: 'anteojos' };
const DEVICE = '11111111-1111-4111-8111-111111111111';
const HOUR = 60 * 60 * 1000;

const tincho = () => createUser(db, { username: 'Tincho', passwordHash: 'scrypt$hash', avatar: AVATAR, article: 'el' });

describe('users', () => {
  it('creates an account and reads it back', async () => {
    const user = await tincho();
    expect(user).toMatchObject({ username: 'Tincho', avatar: AVATAR, article: 'el', placeId: null, googleLinked: false });
    expect(await getUser(db, user!.id)).toEqual(user);
  });

  it('keeps one account per apodo, ignoring case and accents', async () => {
    await tincho();
    expect(await createUser(db, { username: 'TINCHÓ', passwordHash: 'x', avatar: AVATAR, article: 'el' })).toBeNull();
    expect(await usernameTaken(db, 'tinchó')).toBe(true);
    expect(await usernameTaken(db, 'Tinchito')).toBe(false);
  });

  it('finds the account to sign in, however the apodo is written', async () => {
    const user = await tincho();
    const found = await findUserForSignIn(db, 'TINCHÓ');
    expect(found).toEqual({ user, passwordHash: 'scrypt$hash' });
    expect(await findUserForSignIn(db, 'Nadie')).toBeNull();
  });

  it('changes the character and the article', async () => {
    const user = await tincho();
    const changed = await updateProfile(db, user!.id, { article: 'la' });
    expect(changed).toMatchObject({ article: 'la', avatar: AVATAR });
    const recolored = await updateProfile(db, user!.id, { avatar: { ...AVATAR, color: 'azul' } });
    expect(recolored).toMatchObject({ article: 'la', avatar: { color: 'azul' } });
  });

  it('stores the character as a JSON object', async () => {
    const user = await tincho();
    const [row] = await db.query<{ kind: string }>(`select jsonb_typeof(avatar) as kind from game.users where id = $1`, [user!.id]);
    expect(row?.kind).toBe('object');
  });
});

describe('sessions', () => {
  it('signs a browser in until the session expires', async () => {
    const user = await tincho();
    await createSession(db, { id: 'hash-1', userId: user!.id, deviceId: DEVICE, expiresAt: Date.now() + HOUR });
    expect((await getSession(db, 'hash-1'))?.user).toEqual(user);

    await createSession(db, { id: 'hash-2', userId: user!.id, deviceId: DEVICE, expiresAt: Date.now() - 1 });
    expect(await getSession(db, 'hash-2')).toBeNull();
    expect(await getSession(db, 'unknown')).toBeNull();
  });

  it('extends and ends sessions', async () => {
    const user = await tincho();
    await createSession(db, { id: 'hash-1', userId: user!.id, deviceId: null, expiresAt: Date.now() + HOUR });
    const later = Math.floor(Date.now() / 1000) * 1000 + 48 * HOUR;
    await extendSession(db, 'hash-1', later);
    expect((await getSession(db, 'hash-1'))?.expiresAt).toBe(later);

    await endSession(db, 'hash-1');
    expect(await getSession(db, 'hash-1')).toBeNull();
  });
});

describe('auth events', () => {
  it('counts events by apodo, browser and connection within a window', async () => {
    await recordAuthEvent(db, { kind: 'signin-failed', usernameKey: 'tincho', ipHash: 'ip-a' });
    await recordAuthEvent(db, { kind: 'signin-failed', usernameKey: 'tincho', ipHash: 'ip-b' });
    await recordAuthEvent(db, { kind: 'signup', usernameKey: 'juli', deviceId: DEVICE, ipHash: 'ip-a' });
    const since = Date.now() - HOUR;
    expect(await countAuthEvents(db, 'signin-failed', { usernameKey: 'tincho' }, since)).toBe(2);
    expect(await countAuthEvents(db, 'signin-failed', { ipHash: 'ip-a' }, since)).toBe(1);
    expect(await countAuthEvents(db, 'signup', { deviceId: DEVICE }, since)).toBe(1);
    expect(await countAuthEvents(db, 'signup', { deviceId: DEVICE }, Date.now() + HOUR)).toBe(0);
  });
});

describe('linkDeviceAttempts', () => {
  it("gives the new account what this browser played today, and nothing else", async () => {
    const start = (overrides: object) =>
      claimAttempt(db, { id: randomUUID(), deviceId: DEVICE, date: '2026-10-03', slot: 0, game: 'reflexes', startedAt: Date.now(), ...overrides });
    const today = await start({});
    const yesterday = await start({ date: '2026-10-02' });
    const otherBrowser = await start({ deviceId: randomUUID() });

    const user = await tincho();
    expect(await linkDeviceAttempts(db, { deviceId: DEVICE, userId: user!.id, date: '2026-10-03' })).toBe(1);
    expect((await getAttempt(db, today.attempt.id))?.userId).toBe(user!.id);
    expect((await getAttempt(db, yesterday.attempt.id))?.userId).toBeNull();
    expect((await getAttempt(db, otherBrowser.attempt.id))?.userId).toBeNull();
  });
});

describe('permissions', () => {
  it('lets the server role sign players up and in', async () => {
    await db.as('app_server', async (server) => {
      const user = await createUser(server, { username: 'Juli', passwordHash: 'x', avatar: AVATAR, article: 'la' });
      await createSession(server, { id: 'hash-1', userId: user!.id, deviceId: DEVICE, expiresAt: Date.now() + HOUR });
      expect((await getSession(server, 'hash-1'))?.user.username).toBe('Juli');
      await endSession(server, 'hash-1');
      await recordAuthEvent(server, { kind: 'signup', deviceId: DEVICE });
      expect(await countAuthEvents(server, 'signup', { deviceId: DEVICE }, 0)).toBe(1);
    });
  });

  it("doesn't let the server role delete accounts, sessions or events", async () => {
    for (const table of ['users', 'sessions', 'auth_events']) {
      await expect(db.as('app_server', (server) => server.query(`delete from game.${table}`))).rejects.toThrow(/permission denied/);
    }
  });

  it("keeps Supabase's public API roles out", async () => {
    for (const role of ['anon', 'authenticated']) {
      for (const table of ['users', 'sessions', 'auth_events']) {
        await expect(db.as(role, (client) => client.query(`select * from game.${table}`))).rejects.toThrow(/permission denied/);
      }
    }
  });
});
