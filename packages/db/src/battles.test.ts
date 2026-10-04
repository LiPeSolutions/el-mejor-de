import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser, type User } from './accounts';
import {
  addUsedQuestions,
  battlePlayers,
  closeBattle,
  countBattlesCreatedSince,
  createBattle,
  createMatch,
  endMatch,
  findOpenBattle,
  getBattle,
  groupBattleWins,
  groupRecentMatches,
  joinBattle,
  latestMatch,
  leaveBattle,
  markShown,
  matchMoves,
  matchWords,
  openGroupBattle,
  playerOpenBattles,
  recordAnswer,
  recordRepeat,
  recordStart,
  recordWord,
  setBattleGame,
  setBattleLobby,
  touchBattlePlayer,
  unendedGroupMatches,
  type Battle,
} from './battles';
import { createGroup } from './groups';
import { testDatabase, type TestDatabase } from './testing';

let db: TestDatabase;
beforeAll(async () => {
  db = await testDatabase();
});
beforeEach(async () => {
  await db.query(
    'truncate game.battle_words, game.battle_moves, game.battle_matches, game.battle_players, game.battles, game.group_members, game.groups, game.sessions, game.auth_events, game.users cascade',
  );
});
afterAll(async () => {
  await db.close();
});

const AVATAR = { species: 'zorro', color: 'natural', accessory: 'gorra' };
const T0 = Date.UTC(2026, 9, 4, 21, 0, 0);

async function player(username: string): Promise<User> {
  const user = await createUser(db, { username, passwordHash: 'x', avatar: AVATAR, article: 'el' });
  if (!user) throw new Error(`couldn't create ${username}`);
  return user;
}

async function room(host: User, code = 'K7Q2', groupId: string | null = null): Promise<Battle> {
  const battle = await createBattle(db, { code, groupId, userId: host.id, game: 'reflexes', at: T0 });
  if (!battle) throw new Error('no battle');
  return battle;
}

describe('battle rooms', () => {
  it('opens a room with its creator in it as the host', async () => {
    const pato = await player('Pato');
    const battle = await room(pato);
    expect(battle).toMatchObject({ code: 'K7Q2', hostId: pato.id, game: 'reflexes', groupId: null, closedAt: null, usedQuestions: [] });
    expect(await battlePlayers(db, battle.id)).toEqual([
      { userId: pato.id, username: 'Pato', avatar: AVATAR, article: 'el', joinedAt: T0, leftAt: null, removedAt: null, seenAt: T0 },
    ]);
    expect(await findOpenBattle(db, 'K7Q2')).toMatchObject({ id: battle.id });
    expect(await countBattlesCreatedSince(db, pato.id, T0 - 1)).toBe(1);
  });

  it("doesn't give an open room's code to another one, but a closed room frees it", async () => {
    const pato = await player('Pato');
    const first = await room(pato);
    expect(await createBattle(db, { code: 'K7Q2', groupId: null, userId: pato.id, game: 'reflexes', at: T0 })).toBeNull();
    await closeBattle(db, first.id, T0 + 1);
    expect(await findOpenBattle(db, 'K7Q2')).toBeNull();
    expect(await createBattle(db, { code: 'K7Q2', groupId: null, userId: pato.id, game: 'reflexes', at: T0 })).not.toBeNull();
  });

  it('lets people in up to the limit, and back in after leaving', async () => {
    const [pato, juli, toto] = await Promise.all([player('Pato'), player('Juli'), player('Toto')]);
    const battle = await room(pato);
    expect(await joinBattle(db, { battleId: battle.id, userId: juli.id, maxPlayers: 2, at: T0 + 10 })).toBe('joined');
    expect(await joinBattle(db, { battleId: battle.id, userId: juli.id, maxPlayers: 2, at: T0 + 20 })).toBe('already-in');
    expect(await joinBattle(db, { battleId: battle.id, userId: toto.id, maxPlayers: 2, at: T0 + 30 })).toBe('full');
    expect(await leaveBattle(db, battle.id, juli.id, T0 + 40)).toBe(true);
    expect(await joinBattle(db, { battleId: battle.id, userId: toto.id, maxPlayers: 2, at: T0 + 50 })).toBe('joined');
    expect(await playerOpenBattles(db, toto.id)).toEqual([battle.id]);
    expect(await playerOpenBattles(db, juli.id)).toEqual([]);
  });

  it('keeps out whoever the host took out', async () => {
    const [pato, juli] = await Promise.all([player('Pato'), player('Juli')]);
    const battle = await room(pato);
    await joinBattle(db, { battleId: battle.id, userId: juli.id, maxPlayers: 10, at: T0 + 10 });
    expect(await leaveBattle(db, battle.id, juli.id, T0 + 20, true)).toBe(true);
    expect(await joinBattle(db, { battleId: battle.id, userId: juli.id, maxPlayers: 10, at: T0 + 30 })).toBe('removed');
  });

  it('passes the host to whoever came next, and closes the room when the last one leaves', async () => {
    const [pato, juli, toto] = await Promise.all([player('Pato'), player('Juli'), player('Toto')]);
    const battle = await room(pato);
    await joinBattle(db, { battleId: battle.id, userId: juli.id, maxPlayers: 10, at: T0 + 10 });
    await joinBattle(db, { battleId: battle.id, userId: toto.id, maxPlayers: 10, at: T0 + 20 });
    await leaveBattle(db, battle.id, pato.id, T0 + 30);
    expect((await getBattle(db, battle.id))?.hostId).toBe(juli.id);
    await leaveBattle(db, battle.id, toto.id, T0 + 40);
    expect((await getBattle(db, battle.id))?.hostId).toBe(juli.id);
    await leaveBattle(db, battle.id, juli.id, T0 + 50);
    expect((await getBattle(db, battle.id))?.closedAt).toBe(T0 + 50);
    expect(await joinBattle(db, { battleId: battle.id, userId: toto.id, maxPlayers: 10, at: T0 + 60 })).toBe('closed');
  });

  it("finds a group's open room only while someone is around", async () => {
    const pato = await player('Pato');
    const group = await createGroup(db, { ownerId: pato.id, name: 'Los primos', emblem: 'casa', color: 'coral', inviteCode: 'PRIMOS-2222', inviteExpiresAt: T0 + 1e9, at: T0 });
    const battle = await room(pato, 'K7Q2', group!.id);
    expect((await openGroupBattle(db, group!.id, T0 - 1))?.id).toBe(battle.id);
    expect(await openGroupBattle(db, group!.id, T0 + 1)).toBeNull();
    await touchBattlePlayer(db, battle.id, pato.id, T0 + 10_000, 5_000);
    expect((await openGroupBattle(db, group!.id, T0 + 1))?.id).toBe(battle.id);
    // Asking again right away doesn't write.
    await touchBattlePlayer(db, battle.id, pato.id, T0 + 12_000, 5_000);
    expect((await battlePlayers(db, battle.id))[0]?.seenAt).toBe(T0 + 10_000);
  });

  it('changes the game, goes back to the lobby and remembers the questions played', async () => {
    const pato = await player('Pato');
    const battle = await room(pato);
    await setBattleGame(db, battle.id, 'five-questions');
    await setBattleLobby(db, battle.id, T0 + 99);
    await addUsedQuestions(db, battle.id, ['arg-1', 'geo-2']);
    await addUsedQuestions(db, battle.id, ['his-3']);
    expect(await getBattle(db, battle.id)).toMatchObject({ game: 'five-questions', lobbyAt: T0 + 99, usedQuestions: ['arg-1', 'geo-2', 'his-3'] });
  });
});

describe('battle matches', () => {
  it('runs one match at a time in a room', async () => {
    const [pato, juli] = await Promise.all([player('Pato'), player('Juli')]);
    const battle = await room(pato);
    const input = { battleId: battle.id, groupId: null, game: 'reflexes', players: [pato.id, juli.id], content: { delaysMs: [1000, 2000, 500] }, startedAt: T0, startsAt: T0 + 3500 };
    const match = await createMatch(db, input);
    expect(match).toMatchObject({ game: 'reflexes', players: [pato.id, juli.id], departures: {}, content: { delaysMs: [1000, 2000, 500] }, startsAt: T0 + 3500, endedAt: null, winners: [] });
    expect(await createMatch(db, { ...input, startedAt: T0 + 1 })).toBeNull();
    // Leaving during the match keeps them out of it, even if they come back.
    await joinBattle(db, { battleId: battle.id, userId: juli.id, maxPlayers: 10, at: T0 + 100 });
    await leaveBattle(db, battle.id, juli.id, T0 + 5_000);
    await joinBattle(db, { battleId: battle.id, userId: juli.id, maxPlayers: 10, at: T0 + 6_000 });
    await leaveBattle(db, battle.id, juli.id, T0 + 7_000);
    expect((await latestMatch(db, battle.id))?.departures).toEqual({ [juli.id]: T0 + 5_000 });
    expect(await endMatch(db, { matchId: match!.id, endedAt: T0 + 60_000, results: [{ userId: pato.id, place: 1 }], winners: [pato.id] })).toBe(true);
    expect(await endMatch(db, { matchId: match!.id, endedAt: T0 + 70_000, results: [], winners: [] })).toBe(false);
    const rematch = await createMatch(db, { ...input, startedAt: T0 + 61_000 });
    expect(rematch).not.toBeNull();
    expect((await latestMatch(db, battle.id))?.id).toBe(rematch!.id);
  });

  it('keeps the first time a question was shown and one answer per question', async () => {
    const [pato, juli] = await Promise.all([player('Pato'), player('Juli')]);
    const battle = await room(pato);
    const match = await createMatch(db, { battleId: battle.id, groupId: null, game: 'five-questions', players: [pato.id, juli.id], content: { questionIds: ['a'] }, startedAt: T0, startsAt: T0 });
    const id = match!.id;
    expect(await recordAnswer(db, { matchId: id, userId: pato.id, round: 0, at: T0 + 500, choice: 0 })).toBe(false);
    expect(await markShown(db, { matchId: id, userId: pato.id, round: 0, at: T0 + 100 })).toBe(T0 + 100);
    expect(await markShown(db, { matchId: id, userId: pato.id, round: 0, at: T0 + 300 })).toBe(T0 + 100);
    expect(await recordAnswer(db, { matchId: id, userId: pato.id, round: 0, at: T0 + 2_000, choice: 2 })).toBe(true);
    expect(await recordAnswer(db, { matchId: id, userId: pato.id, round: 0, at: T0 + 2_500, choice: 0 })).toBe(false);
    expect(await matchMoves(db, id)).toEqual([
      { userId: pato.id, round: 0, shownAt: T0 + 100, playedAt: T0 + 2_000, choice: 2, reactionMs: null, falseStart: null, correct: null, inputs: null },
    ]);
  });

  it('keeps one start per player and round', async () => {
    const [pato, juli] = await Promise.all([player('Pato'), player('Juli')]);
    const battle = await room(pato);
    const match = await createMatch(db, { battleId: battle.id, groupId: null, game: 'reflexes', players: [pato.id, juli.id], content: {}, startedAt: T0, startsAt: T0 });
    const id = match!.id;
    expect(await recordStart(db, { matchId: id, userId: juli.id, round: 0, at: T0 + 7_000, reactionMs: 231, falseStart: false })).toBe(true);
    expect(await recordStart(db, { matchId: id, userId: juli.id, round: 0, at: T0 + 7_100, reactionMs: 150, falseStart: false })).toBe(false);
    expect(await recordStart(db, { matchId: id, userId: pato.id, round: 0, at: T0 + 5_000, reactionMs: null, falseStart: true })).toBe(true);
    expect((await matchMoves(db, id)).map((move) => [move.userId, move.reactionMs, move.falseStart])).toEqual([
      [pato.id, null, true],
      [juli.id, 231, false],
    ]);
  });

  it('keeps one repetition per player and round, with the colors tapped', async () => {
    const [pato, juli] = await Promise.all([player('Pato'), player('Juli')]);
    const battle = await room(pato);
    const match = await createMatch(db, { battleId: battle.id, groupId: null, game: 'sequence', players: [pato.id, juli.id], content: { sequence: [0, 1, 2] }, startedAt: T0, startsAt: T0 });
    const id = match!.id;
    expect(await recordRepeat(db, { matchId: id, userId: pato.id, round: 0, at: T0 + 4_000, correct: true, inputs: [0, 1, 2] })).toBe(true);
    expect(await recordRepeat(db, { matchId: id, userId: pato.id, round: 0, at: T0 + 4_500, correct: false, inputs: [3] })).toBe(false);
    expect(await recordRepeat(db, { matchId: id, userId: juli.id, round: 0, at: T0 + 5_000, correct: false, inputs: [0, 3] })).toBe(true);
    // Tiebreaks can take a match past the 21 rounds of the other games.
    expect(await recordRepeat(db, { matchId: id, userId: juli.id, round: 120, at: T0 + 9_000, correct: false, inputs: [] })).toBe(true);
    expect(await recordRepeat(db, { matchId: id, userId: juli.id, round: 1, at: T0 + 9_000, correct: false, inputs: [4] }).catch(() => 'refused')).toBe('refused');
    expect((await matchMoves(db, id)).map((move) => [move.userId, move.round, move.correct, move.inputs])).toEqual([
      [pato.id, 0, true, [0, 1, 2]],
      [juli.id, 0, false, [0, 3]],
      [juli.id, 120, false, []],
    ]);
  });

  it('keeps each word once per player, and only well-formed ones', async () => {
    const [pato, juli] = await Promise.all([player('Pato'), player('Juli')]);
    const battle = await room(pato);
    const match = await createMatch(db, { battleId: battle.id, groupId: null, game: 'seven-letters', players: [pato.id, juli.id], content: { letters: [...'CAMINANTES'] }, startedAt: T0, startsAt: T0 });
    const id = match!.id;
    expect(await recordWord(db, { matchId: id, userId: pato.id, word: 'CAMA', at: T0 + 4_000 })).toBe(true);
    expect(await recordWord(db, { matchId: id, userId: pato.id, word: 'CAMA', at: T0 + 6_000 })).toBe(false);
    expect(await recordWord(db, { matchId: id, userId: juli.id, word: 'CAMA', at: T0 + 5_000 })).toBe(true);
    expect(await recordWord(db, { matchId: id, userId: juli.id, word: 'ÑANDÚ', at: T0 + 5_500 }).catch(() => 'refused')).toBe('refused');
    expect(await recordWord(db, { matchId: id, userId: juli.id, word: 'AÑO', at: T0 + 7_000 })).toBe(true);
    expect(await matchWords(db, id)).toEqual([
      { userId: pato.id, word: 'CAMA', playedAt: T0 + 4_000 },
      { userId: juli.id, word: 'CAMA', playedAt: T0 + 5_000 },
      { userId: juli.id, word: 'AÑO', playedAt: T0 + 7_000 },
    ]);
  });

  it("keeps each group's tally of battles won and its last matches", async () => {
    const [pato, juli, toto] = await Promise.all([player('Pato'), player('Juli'), player('Toto')]);
    const group = await createGroup(db, { ownerId: pato.id, name: 'Los primos', emblem: 'casa', color: 'coral', inviteCode: 'PRIMOS-2222', inviteExpiresAt: T0 + 1e9, at: T0 });
    const battle = await room(pato, 'K7Q2', group!.id);
    const play = async (n: number, winners: string[], players = [pato.id, juli.id, toto.id]) => {
      const match = await createMatch(db, { battleId: battle.id, groupId: group!.id, game: n % 2 ? 'reflexes' : 'five-questions', players, content: {}, startedAt: T0 + n * 100_000, startsAt: T0 + n * 100_000 });
      await endMatch(db, { matchId: match!.id, endedAt: T0 + n * 100_000 + 60_000, results: [], winners });
    };
    await play(1, [pato.id]);
    await play(2, [juli.id, pato.id]);
    await play(3, [toto.id]);
    await play(4, [], [pato.id]);
    expect(await groupBattleWins(db, group!.id)).toEqual([
      { userId: pato.id, wins: 2 },
      ...[{ userId: juli.id, wins: 1 }, { userId: toto.id, wins: 1 }].sort((a, b) => a.userId.localeCompare(b.userId)),
    ]);
    const recent = await groupRecentMatches(db, group!.id, 2);
    expect(recent.map((match) => [match.game, match.players, match.winners.map((winner) => winner.username)])).toEqual([
      ['reflexes', 3, ['Toto']],
      ['five-questions', 3, ['Juli', 'Pato']],
    ]);
    const open = await createMatch(db, { battleId: battle.id, groupId: group!.id, game: 'reflexes', players: [pato.id, juli.id], content: {}, startedAt: T0 + 900_000, startsAt: T0 + 900_000 });
    expect((await unendedGroupMatches(db, group!.id, T0 + 900_001)).map((match) => match.id)).toEqual([open!.id]);
    expect(await unendedGroupMatches(db, group!.id, T0 + 900_000)).toEqual([]);
  });
});
