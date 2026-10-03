import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser, type User } from './accounts';
import { claimAttempt, finishAttempt } from './attempts';
import {
  countCodeFailures,
  countGroupsCreatedSince,
  createGroup,
  findGroupByInvite,
  getGroup,
  getMembership,
  groupMemberScores,
  joinGroup,
  latestGroupCrown,
  leaveGroup,
  markCrownSeen,
  markGroupCrowned,
  recordCodeFailure,
  recordGroupCrown,
  removeMember,
  replaceInvite,
  updateGroup,
  userCrowns,
  userGroups,
  type Group,
} from './groups';
import { testDatabase, type TestDatabase } from './testing';

let db: TestDatabase;
beforeAll(async () => {
  db = await testDatabase();
});
beforeEach(async () => {
  await db.query('truncate game.crowns, game.group_code_failures, game.group_members, game.groups, game.attempts, game.sessions, game.auth_events, game.users cascade');
});
afterAll(async () => {
  await db.close();
});

const AVATAR = { species: 'carpincho', color: 'natural', accessory: null };
const DAY = 24 * 60 * 60 * 1000;

async function player(username: string, article: 'el' | 'la' = 'el'): Promise<User> {
  const user = await createUser(db, { username, passwordHash: 'x', avatar: AVATAR, article });
  if (!user) throw new Error(`couldn't create ${username}`);
  return user;
}

let codes = 0;
async function group(owner: User, name = 'Los del laburo'): Promise<Group> {
  codes += 1;
  const created = await createGroup(db, {
    ownerId: owner.id,
    name,
    emblem: 'maletin',
    color: 'azul',
    inviteCode: `LABURO-${String(codes).padStart(4, '2')}`,
    inviteExpiresAt: Date.now() + 7 * DAY,
    at: Date.now(),
  });
  if (!created) throw new Error('code taken');
  return created;
}

/** A finished daily challenge for an account. */
async function played(user: User, date: string, slot: number, score: number, finishedAt: number) {
  const { attempt } = await claimAttempt(db, {
    id: randomUUID(),
    deviceId: randomUUID(),
    userId: user.id,
    date,
    slot,
    game: 'reflexes',
    startedAt: finishedAt - 60_000,
  });
  await finishAttempt(db, attempt.id, { finishedAt, score, result: {}, flags: [] });
}

describe('groups', () => {
  it('creates a group with its owner inside', async () => {
    const tincho = await player('Tincho');
    const created = await group(tincho);
    expect(created).toMatchObject({ name: 'Los del laburo', emblem: 'maletin', color: 'azul', ownerId: tincho.id, memberCount: 1, crownedThrough: null });
    expect(await userGroups(db, tincho.id)).toEqual([created]);
    expect(await countGroupsCreatedSince(db, tincho.id, Date.now() - DAY)).toBe(1);
  });

  it('refuses an invitation code already in use', async () => {
    const tincho = await player('Tincho');
    const first = await group(tincho);
    const again = await createGroup(db, {
      ownerId: tincho.id,
      name: 'Otro',
      emblem: 'casa',
      color: 'rosa',
      inviteCode: first.inviteCode.toLowerCase(),
      inviteExpiresAt: Date.now() + DAY,
      at: Date.now(),
    });
    expect(again).toBeNull();
    expect(await userGroups(db, tincho.id)).toHaveLength(1);
  });

  it('finds a group by its code, however it was typed', async () => {
    const created = await group(await player('Tincho'));
    const key = created.inviteCode.replace('-', '');
    expect((await findGroupByInvite(db, key))?.id).toBe(created.id);
    expect(await findGroupByInvite(db, 'NOEXISTE1234')).toBeNull();
  });

  it('changes the name, emblem and color', async () => {
    const created = await group(await player('Tincho'));
    const changed = await updateGroup(db, created.id, { name: 'Los primos', color: 'coral' });
    expect(changed).toMatchObject({ name: 'Los primos', emblem: 'maletin', color: 'coral' });
  });

  it('replaces the invitation, and the old code stops working', async () => {
    const created = await group(await player('Tincho'));
    const renewed = await replaceInvite(db, created.id, { code: 'LABURO-9999', expiresAt: Date.now() + 7 * DAY, at: Date.now() });
    expect(renewed?.inviteCode).toBe('LABURO-9999');
    expect(renewed!.inviteCreatedAt).toBeGreaterThanOrEqual(created.inviteCreatedAt);
    expect(await findGroupByInvite(db, created.inviteCode.replace('-', ''))).toBeNull();
    const other = await group(await player('Juli'));
    expect(await replaceInvite(db, other.id, { code: 'LABURO-9999', expiresAt: Date.now(), at: Date.now() })).toBeNull();
  });
});

describe('members', () => {
  it('joins once', async () => {
    const created = await group(await player('Tincho'));
    const juli = await player('Juli', 'la');
    expect(await joinGroup(db, { groupId: created.id, userId: juli.id, maxMembers: 50, at: Date.now() })).toBe('joined');
    expect(await joinGroup(db, { groupId: created.id, userId: juli.id, maxMembers: 50, at: Date.now() })).toBe('already-member');
    expect((await getGroup(db, created.id))?.memberCount).toBe(2);
    expect(await userGroups(db, juli.id)).toHaveLength(1);
  });

  it('stops at the member limit', async () => {
    const created = await group(await player('Tincho'));
    expect(await joinGroup(db, { groupId: created.id, userId: (await player('Juli')).id, maxMembers: 2, at: Date.now() })).toBe('joined');
    expect(await joinGroup(db, { groupId: created.id, userId: (await player('Colo')).id, maxMembers: 2, at: Date.now() })).toBe('full');
  });

  it('lets someone who left come back', async () => {
    const created = await group(await player('Tincho'));
    const juli = await player('Juli');
    await joinGroup(db, { groupId: created.id, userId: juli.id, maxMembers: 50, at: Date.now() });
    expect(await leaveGroup(db, created.id, juli.id, Date.now())).toBe(true);
    expect(await leaveGroup(db, created.id, juli.id, Date.now())).toBe(false);
    expect(await userGroups(db, juli.id)).toEqual([]);
    expect(await joinGroup(db, { groupId: created.id, userId: juli.id, maxMembers: 50, at: Date.now() })).toBe('joined');
    expect((await getMembership(db, created.id, juli.id))?.leftAt).toBeNull();
  });

  it("keeps someone removed out until there's a new invitation", async () => {
    const created = await group(await player('Tincho'));
    const colo = await player('Colo');
    await joinGroup(db, { groupId: created.id, userId: colo.id, maxMembers: 50, at: Date.now() });
    expect(await removeMember(db, created.id, colo.id, Date.now())).toBe(true);
    expect(await joinGroup(db, { groupId: created.id, userId: colo.id, maxMembers: 50, at: Date.now() })).toBe('removed');
    // A new code, made after the removal, lets them back in.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await replaceInvite(db, created.id, { code: 'LABURO-NEW2', expiresAt: Date.now() + DAY, at: Date.now() });
    expect(await joinGroup(db, { groupId: created.id, userId: colo.id, maxMembers: 50, at: Date.now() })).toBe('joined');
  });

  it('passes the group to the oldest member when the owner leaves', async () => {
    const tincho = await player('Tincho');
    const created = await group(tincho);
    const juli = await player('Juli');
    const colo = await player('Colo');
    await joinGroup(db, { groupId: created.id, userId: juli.id, maxMembers: 50, at: Date.now() });
    await joinGroup(db, { groupId: created.id, userId: colo.id, maxMembers: 50, at: Date.now() });
    await leaveGroup(db, created.id, tincho.id, Date.now());
    expect((await getGroup(db, created.id))?.ownerId).toBe(juli.id);
    // A member who isn't the owner leaving doesn't change the owner.
    await leaveGroup(db, created.id, colo.id, Date.now());
    expect((await getGroup(db, created.id))?.ownerId).toBe(juli.id);
  });
});

describe('groupMemberScores', () => {
  it("lists each member with the week's finished challenges", async () => {
    const tincho = await player('Tincho');
    const juli = await player('Juli', 'la');
    const created = await group(tincho);
    await joinGroup(db, { groupId: created.id, userId: juli.id, maxMembers: 50, at: Date.now() });
    await played(tincho, '2026-10-05', 0, 800, 1_000_000);
    await played(tincho, '2026-10-06', 1, 600, 2_000_000);
    await played(tincho, '2026-10-12', 0, 999, 3_000_000); // next week
    await claimAttempt(db, { id: randomUUID(), deviceId: randomUUID(), userId: juli.id, date: '2026-10-05', slot: 2, game: 'sequence', startedAt: 1 });

    const members = await groupMemberScores(db, { groupIds: [created.id], from: '2026-10-05', to: '2026-10-11' });
    expect(members.map((m) => m.username)).toEqual(['Tincho', 'Juli']);
    expect(members[0]).toMatchObject({ groupId: created.id, userId: tincho.id, avatar: AVATAR, article: 'el' });
    expect(members[0]!.challenges).toEqual([
      { date: '2026-10-05', score: 800, at: 1_000_000 },
      { date: '2026-10-06', score: 600, at: 2_000_000 },
    ]);
    // Started but not finished: it doesn't count yet.
    expect(members[1]!.challenges).toEqual([]);
  });

  it('can list the members at a past moment, to close a week', async () => {
    const tincho = await player('Tincho');
    const created = await group(tincho);
    const juli = await player('Juli');
    const before = Date.now() - 1000;
    await joinGroup(db, { groupId: created.id, userId: juli.id, maxMembers: 50, at: Date.now() });
    const now = await groupMemberScores(db, { groupIds: [created.id], from: '2026-10-05', to: '2026-10-11' });
    const then = await groupMemberScores(db, { groupIds: [created.id], from: '2026-10-05', to: '2026-10-11', asOf: before });
    expect(now).toHaveLength(2);
    expect(then.map((m) => m.username)).toEqual([]);
    expect(await groupMemberScores(db, { groupIds: [], from: '2026-10-05', to: '2026-10-11' })).toEqual([]);
  });
});

describe('crowns', () => {
  it("records a week's crown once and lists it in the winner's palmarés", async () => {
    const tincho = await player('Tincho');
    const juli = await player('Juli', 'la');
    const created = await group(tincho);
    const crown = { groupId: created.id, weekStart: '2026-10-05', userId: juli.id, score: 9000, daysPlayed: 5, players: 2, runnerUpId: tincho.id, runnerUpScore: 8000, title: 'Los del laburo' };
    await recordGroupCrown(db, crown);
    await recordGroupCrown(db, { ...crown, userId: tincho.id });
    const [won] = await userCrowns(db, juli.id);
    expect(won).toMatchObject({
      weekStart: '2026-10-05',
      groupId: created.id,
      username: 'Juli',
      article: 'la',
      score: 9000,
      runnerUp: { userId: tincho.id, username: 'Tincho', score: 8000 },
      title: 'Los del laburo',
      emblem: 'maletin',
      color: 'azul',
      seenAt: null,
    });
    expect(await userCrowns(db, tincho.id)).toEqual([]);
    expect((await latestGroupCrown(db, created.id))?.id).toBe(won!.id);
  });

  it('marks the celebration as seen, only by the winner', async () => {
    const tincho = await player('Tincho');
    const juli = await player('Juli');
    const created = await group(tincho);
    await recordGroupCrown(db, { groupId: created.id, weekStart: '2026-10-05', userId: juli.id, score: 10, daysPlayed: 1, players: 1, runnerUpId: null, runnerUpScore: null, title: 'X' });
    const [won] = await userCrowns(db, juli.id);
    expect(await markCrownSeen(db, won!.id, tincho.id)).toBe(false);
    expect(await markCrownSeen(db, won!.id, juli.id)).toBe(true);
    expect(await markCrownSeen(db, won!.id, juli.id)).toBe(false);
    expect((await userCrowns(db, juli.id))[0]?.seenAt).not.toBeNull();
  });

  it('remembers the last decided week, never going back', async () => {
    const created = await group(await player('Tincho'));
    await markGroupCrowned(db, created.id, '2026-10-12');
    await markGroupCrowned(db, created.id, '2026-10-05');
    expect((await getGroup(db, created.id))?.crownedThrough).toBe('2026-10-12');
  });
});

describe('wrong codes', () => {
  it('counts them per account and per connection', async () => {
    const tincho = await player('Tincho');
    await recordCodeFailure(db, { userId: tincho.id, ipHash: 'ip-1', at: Date.now() });
    await recordCodeFailure(db, { userId: null, ipHash: 'ip-1', at: Date.now() });
    expect(await countCodeFailures(db, { userId: tincho.id }, Date.now() - DAY)).toBe(1);
    expect(await countCodeFailures(db, { ipHash: 'ip-1' }, Date.now() - DAY)).toBe(2);
    expect(await countCodeFailures(db, { ipHash: 'ip-1' }, Date.now() + DAY)).toBe(0);
  });
});

describe('permissions', () => {
  it('lets the server role run groups', async () => {
    const tincho = await player('Tincho');
    const juli = await player('Juli');
    await db.as('app_server', async (server) => {
      const created = await createGroup(server, { ownerId: tincho.id, name: 'Los primos', emblem: 'casa', color: 'rosa', inviteCode: 'PRIMOS-2345', inviteExpiresAt: Date.now() + DAY, at: Date.now() });
      expect(await joinGroup(server, { groupId: created!.id, userId: juli.id, maxMembers: 50, at: Date.now() })).toBe('joined');
      await leaveGroup(server, created!.id, tincho.id, Date.now());
      await recordGroupCrown(server, { groupId: created!.id, weekStart: '2026-10-05', userId: juli.id, score: 1, daysPlayed: 1, players: 1, runnerUpId: null, runnerUpScore: null, title: 'Los primos' });
      await markGroupCrowned(server, created!.id, '2026-10-05');
      await recordCodeFailure(server, { userId: juli.id, ipHash: null, at: Date.now() });
      expect(await userCrowns(server, juli.id)).toHaveLength(1);
    });
  });

  it("doesn't let the server role delete groups, members, crowns or failures", async () => {
    for (const table of ['groups', 'group_members', 'crowns', 'group_code_failures']) {
      await expect(db.as('app_server', (server) => server.query(`delete from game.${table}`))).rejects.toThrow(/permission denied/);
    }
  });

  it("keeps Supabase's public API roles out", async () => {
    for (const role of ['anon', 'authenticated']) {
      for (const table of ['groups', 'group_members', 'crowns', 'group_code_failures']) {
        await expect(db.as(role, (client) => client.query(`select * from game.${table}`))).rejects.toThrow(/permission denied/);
      }
    }
  });
});
