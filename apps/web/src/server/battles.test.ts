import { createUser, latestMatch, type User } from "@repo/db";
import { testDatabase, type TestDatabase } from "@repo/db/testing";
import { BATTLE_RULES } from "@repo/games";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { lettersWords, questionById, type BattleLargadaContent, type BattleLettersContent, type BattleTriviaContent } from "./battle-content";
import {
  backToLobby,
  battleAnswer,
  battleQuestion,
  battleStart,
  battleState,
  battleWord,
  chooseGame,
  groupBattles,
  joinFromGroup,
  joinWithCode,
  leaveRoom,
  openRoom,
  previewRoom,
  removeFromRoom,
  startMatch,
} from "./battles";
import { newGroup } from "./groups";
import { HttpError } from "./http";

let db: TestDatabase;
beforeAll(async () => {
  db = await testDatabase();
});
beforeEach(async () => {
  await db.query(
    "truncate game.battle_words, game.battle_moves, game.battle_matches, game.battle_players, game.battles, game.group_code_failures, game.group_members, game.groups, game.users cascade",
  );
});
afterAll(async () => {
  await db.close();
});

const AVATAR = { species: "zorro", color: "natural", accessory: "gorra" };
/** Sunday 4/10/2026, 18:00 in Argentina. */
const T = Date.parse("2026-10-04T21:00:00Z");
const ctx = (now: number, ipHash: string | null = "ip-a") => ({ now, ipHash });
const { countdownMs } = BATTLE_RULES;
const { answerMs, graceMs, revealMs } = BATTLE_RULES.trivia;

async function player(username: string): Promise<User> {
  const user = await createUser(db, { username, passwordHash: "x", avatar: AVATAR, article: "el" });
  if (!user) throw new Error(`couldn't create ${username}`);
  return user;
}

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof HttpError) return { status: error.status, code: error.message, ...error.details };
    throw error;
  }
  throw new Error("expected it to fail");
}

/** A loose room with `host` and the rest in it. */
async function room(host: User, ...others: User[]) {
  const { battleId } = await openRoom(db, host, { groupId: null }, ctx(T));
  const { code } = await battleState(db, host, battleId, ctx(T));
  for (const other of others) await joinWithCode(db, other, code, ctx(T + 1_000));
  return { battleId, code };
}

/** Answers question `round` right (or with the option `wrong` ahead of it), `afterMs` after getting it. */
async function answer(user: User, battleId: string, round: number, at: number, afterMs: number, right = true) {
  const question = await battleQuestion(db, user, battleId, round, ctx(at));
  const match = await latestMatch(db, battleId);
  const { questionIds } = match!.content as BattleTriviaContent;
  const correct = question.options.indexOf(questionById(questionIds[round]!).options[0]);
  const choice = right ? correct : (correct + 1) % 4;
  await battleAnswer(db, user, battleId, round, choice, ctx(at + afterMs));
  return { question, choice };
}

describe("battle rooms", () => {
  it("opens a room with a code and its creator as the host", async () => {
    const pato = await player("Pato");
    const { battleId } = await openRoom(db, pato, { groupId: null, game: "five-questions" }, ctx(T));
    const view = await battleState(db, pato, battleId, ctx(T + 10));
    expect(view).toMatchObject({ stage: "lobby", game: "five-questions", hostId: pato.id, meId: pato.id, group: null, match: null, maxPlayers: 10 });
    expect(view.code).toMatch(/^[2-9A-HJKMNP-Z]{4}$/);
    expect(view.players).toEqual([expect.objectContaining({ username: "Pato", host: true, me: true, online: true, inRoom: true, playing: false })]);
  });

  it("lets others in with the code, and shows the room's page without an account", async () => {
    const [pato, juli] = await Promise.all([player("Pato"), player("Juli")]);
    const { battleId, code } = await room(pato);
    const preview = await previewRoom(db, null, code.toLowerCase(), ctx(T + 500));
    expect(preview).toMatchObject({ battleId, game: "reflexes", host: { username: "Pato" }, status: "open", playing: false });
    expect(await joinWithCode(db, juli, ` ${code.slice(0, 2)} ${code.slice(2)} `, ctx(T + 1_000))).toEqual({ battleId });
    expect((await previewRoom(db, juli, code, ctx(T + 1_500))).status).toBe("in");
    const view = await battleState(db, juli, battleId, ctx(T + 2_000));
    expect(view.players.map((one) => [one.username, one.host, one.me])).toEqual([
      ["Pato", true, false],
      ["Juli", false, true],
    ]);
  });

  it("refuses wrong codes, and too many of them", async () => {
    const pato = await player("Pato");
    for (let i = 0; i < 10; i++) expect(await failure(joinWithCode(db, pato, "ZZZZ", ctx(T + i)))).toMatchObject({ status: 404 });
    expect(await failure(joinWithCode(db, pato, "ZZZZ", ctx(T + 20)))).toMatchObject({ status: 429, code: "too-many-codes" });
  });

  it("fits ten players", async () => {
    const people = await Promise.all(Array.from({ length: 11 }, (_, i) => player(`Jugador${i}`)));
    const { code } = await room(people[0]!, ...people.slice(1, 10));
    expect(await failure(joinWithCode(db, people[10]!, code, ctx(T + 2_000)))).toMatchObject({ status: 409, code: "battle-full" });
  });

  it("passes the host to the next one, and the host can take someone out for good", async () => {
    const [pato, juli, toto] = await Promise.all([player("Pato"), player("Juli"), player("Toto")]);
    const { battleId, code } = await room(pato, juli, toto);
    expect(await failure(removeFromRoom(db, juli, battleId, toto.id, ctx(T + 2_000)))).toMatchObject({ status: 403, code: "not-host" });
    await removeFromRoom(db, pato, battleId, toto.id, ctx(T + 2_000));
    expect(await failure(joinWithCode(db, toto, code, ctx(T + 3_000)))).toMatchObject({ status: 403, code: "removed" });
    await leaveRoom(db, pato, battleId, ctx(T + 4_000));
    expect((await battleState(db, juli, battleId, ctx(T + 5_000))).hostId).toBe(juli.id);
    expect(await failure(battleState(db, pato, battleId, ctx(T + 5_000)))).toMatchObject({ status: 403, code: "not-in-battle" });
  });

  it("keeps a player in one room at a time", async () => {
    const [pato, juli] = await Promise.all([player("Pato"), player("Juli")]);
    const first = await room(pato, juli);
    const { battleId: second } = await openRoom(db, juli, { groupId: null }, ctx(T + 5_000));
    expect(await failure(battleState(db, juli, first.battleId, ctx(T + 6_000)))).toMatchObject({ code: "not-in-battle" });
    expect((await battleState(db, juli, second, ctx(T + 6_000))).hostId).toBe(juli.id);
  });

  it("gives a group one room at a time, only for its members", async () => {
    const [pato, juli, toto] = await Promise.all([player("Pato"), player("Juli"), player("Toto")]);
    const group = await newGroup(db, pato, { name: "Los primos", emblem: "casa", color: "coral" }, ctx(T - 60_000));
    await db.query("insert into game.group_members (group_id, user_id, joined_at) values ($1::uuid, $2::uuid, now())", [group.id, juli.id]);
    const created = await openRoom(db, pato, { groupId: group.id }, ctx(T));
    expect(created.existing).toBe(false);
    expect(await openRoom(db, juli, { groupId: group.id }, ctx(T + 1_000))).toEqual({ battleId: created.battleId, existing: true });
    expect(await failure(openRoom(db, toto, { groupId: group.id }, ctx(T + 1_000)))).toMatchObject({ status: 404 });
    expect(await failure(joinFromGroup(db, toto, created.battleId, ctx(T + 1_000)))).toMatchObject({ status: 404 });

    const battles = await groupBattles(db, juli, group.id, ctx(T + 2_000));
    expect(battles.live).toMatchObject({ battleId: created.battleId, hostName: "Pato", game: "reflexes", playing: false, in: true });
    expect(battles.live?.players.map((one) => one.username)).toEqual(["Pato", "Juli"]);
    expect((await battleState(db, pato, created.battleId, ctx(T + 2_000))).group).toMatchObject({ id: group.id, name: "Los primos" });
  });
});

describe("a battle of Cinco Preguntas", () => {
  async function trivia() {
    const [pato, juli] = await Promise.all([player("Pato"), player("Juli")]);
    const { battleId } = await room(pato, juli);
    await chooseGame(db, pato, battleId, "five-questions", ctx(T + 2_000));
    await startMatch(db, pato, battleId, ctx(T + 3_000));
    return { pato, juli, battleId, startsAt: T + 3_000 + countdownMs };
  }

  it("needs two to start, and only the host starts it", async () => {
    const [pato, juli] = await Promise.all([player("Pato"), player("Juli")]);
    const { battleId, code } = await room(pato);
    expect(await failure(startMatch(db, pato, battleId, ctx(T + 2_000)))).toMatchObject({ status: 409, code: "not-enough-players" });
    await joinWithCode(db, juli, code, ctx(T + 2_500));
    expect(await failure(startMatch(db, juli, battleId, ctx(T + 3_000)))).toMatchObject({ status: 403, code: "not-host" });
  });

  it("counts down and then gives the same question to everyone", async () => {
    const { pato, juli, battleId, startsAt } = await trivia();
    const waiting = await battleState(db, juli, battleId, ctx(startsAt - 1_000));
    expect(waiting).toMatchObject({ stage: "match", match: { game: "five-questions", startsAt, round: null, questionCount: 5 } });
    expect(await failure(battleQuestion(db, juli, battleId, 0, ctx(startsAt - 1_000)))).toMatchObject({ code: "too-early" });

    const mine = await battleQuestion(db, pato, battleId, 0, ctx(startsAt - 300));
    const theirs = await battleQuestion(db, juli, battleId, 0, ctx(startsAt + 200));
    expect(mine.prompt).toBe(theirs.prompt);
    expect([...mine.options].sort()).toEqual([...theirs.options].sort());
    expect(mine).toMatchObject({ index: 0, opensAt: startsAt, answerUntil: startsAt + answerMs });
  });

  it("shows who answered but not what, until everyone did", async () => {
    const { pato, juli, battleId, startsAt } = await trivia();
    await answer(pato, battleId, 0, startsAt, 1_500);
    const during = await battleState(db, juli, battleId, ctx(startsAt + 2_000));
    const match = during.match;
    if (match?.game !== "five-questions") throw new Error("not trivia");
    expect(match.answered).toEqual([pato.id]);
    expect(match.reveals).toEqual([]);
    expect(match.round).toMatchObject({ index: 0, closed: false });

    await answer(juli, battleId, 0, startsAt + 2_500, 3_000, false);
    const after = await battleState(db, juli, battleId, ctx(startsAt + 6_000));
    const revealed = after.match;
    if (revealed?.game !== "five-questions") throw new Error("not trivia");
    expect(revealed.round).toMatchObject({ index: 0, closed: true, closesAt: startsAt + 5_500, nextAt: startsAt + 5_500 + revealMs });
    const reveal = revealed.reveals[0]!;
    const ids = ((await latestMatch(db, battleId))!.content as BattleTriviaContent).questionIds;
    expect(reveal.correctText).toBe(questionById(ids[0]!).options[0]);
    expect(reveal.myChoice).not.toBe(reveal.correctChoice);
    expect(reveal.results).toEqual([
      { userId: pato.id, answered: true, correct: true, points: 200, seconds: 2 },
      { userId: juli.id, answered: true, correct: false, points: 0, seconds: 3 },
    ]);
    expect(revealed.standings.map((row) => [row.userId, row.place, row.score])).toEqual([
      [pato.id, 1, 200],
      [juli.id, 2, 0],
    ]);
    expect(await failure(battleAnswer(db, juli, battleId, 0, 0, ctx(startsAt + 6_000)))).toMatchObject({ code: "round-closed" });
  });

  it("closes at the time limit, and ends with the podium after the fifth", async () => {
    const { pato, juli, battleId, startsAt } = await trivia();
    let opensAt = startsAt;
    for (let round = 0; round < 5; round++) {
      await answer(pato, battleId, round, opensAt, 1_000);
      if (round === 2) {
        // Juli doesn't answer this one: it closes when the time runs out.
        opensAt += answerMs + graceMs + revealMs;
      } else {
        await answer(juli, battleId, round, opensAt, 4_000);
        opensAt += 4_000 + revealMs;
      }
    }
    const before = await battleState(db, pato, battleId, ctx(opensAt - 1));
    expect(before.stage).toBe("match");
    const podium = await battleState(db, juli, battleId, ctx(opensAt + 10));
    expect(podium.stage).toBe("podium");
    const match = podium.match;
    if (match?.game !== "five-questions") throw new Error("not trivia");
    expect(match.endsAt).toBe(opensAt);
    expect(match.reveals).toHaveLength(5);
    expect(match.standings.map((row) => [row.userId, row.place, row.score, row.correct])).toEqual([
      [pato.id, 1, 1_000, 5],
      [juli.id, 2, 720, 4],
    ]);
    const saved = await latestMatch(db, battleId);
    expect(saved).toMatchObject({ endedAt: opensAt, winners: [pato.id] });
  });

  it("brings new questions in the rematch", async () => {
    const { pato, juli, battleId, startsAt } = await trivia();
    let opensAt = startsAt;
    for (let round = 0; round < 5; round++) {
      await answer(pato, battleId, round, opensAt, 1_000);
      await answer(juli, battleId, round, opensAt, 1_000);
      opensAt += 1_000 + revealMs;
    }
    const first = ((await latestMatch(db, battleId))!.content as BattleTriviaContent).questionIds;
    expect(await failure(startMatch(db, pato, battleId, ctx(opensAt - 10)))).toMatchObject({ code: "match-running" });
    await startMatch(db, pato, battleId, ctx(opensAt + 1_000));
    const second = ((await latestMatch(db, battleId))!.content as BattleTriviaContent).questionIds;
    expect(second).toHaveLength(5);
    expect(second.filter((id) => first.includes(id))).toEqual([]);
    expect((await battleState(db, juli, battleId, ctx(opensAt + 1_500))).stage).toBe("match");
  });

  it("doesn't wait for whoever left, who can't come back into that match", async () => {
    const [pato, juli, toto] = await Promise.all([player("Pato"), player("Juli"), player("Toto")]);
    const { battleId, code } = await room(pato, juli, toto);
    await chooseGame(db, pato, battleId, "five-questions", ctx(T + 2_000));
    await startMatch(db, pato, battleId, ctx(T + 3_000));
    const startsAt = T + 3_000 + countdownMs;
    await answer(pato, battleId, 0, startsAt, 1_000);
    await answer(juli, battleId, 0, startsAt, 2_000);
    await leaveRoom(db, toto, battleId, ctx(startsAt + 3_000));
    const view = await battleState(db, pato, battleId, ctx(startsAt + 3_500));
    if (view.match?.game !== "five-questions") throw new Error("not trivia");
    expect(view.match.round).toMatchObject({ closed: true, closesAt: startsAt + 3_000 });

    await joinWithCode(db, toto, code, ctx(startsAt + 4_000));
    const back = await battleState(db, toto, battleId, ctx(startsAt + 4_500));
    expect(back.players.find((one) => one.me)).toMatchObject({ inRoom: true, playing: false });
    expect(await failure(battleQuestion(db, toto, battleId, 1, ctx(startsAt + 3_000 + revealMs)))).toMatchObject({ code: "left-match" });
  });

  it("goes back to the room to choose another game", async () => {
    const { pato, juli, battleId, startsAt } = await trivia();
    expect(await failure(chooseGame(db, pato, battleId, "reflexes", ctx(startsAt)))).toMatchObject({ code: "match-running" });
    await leaveRoom(db, juli, battleId, ctx(startsAt + 100));
    // Alone, each question closes as soon as Pato answers.
    let opensAt = startsAt;
    for (let round = 0; round < 5; round++) {
      await answer(pato, battleId, round, opensAt, 500);
      opensAt += 500 + revealMs;
    }
    expect((await battleState(db, pato, battleId, ctx(opensAt))).stage).toBe("podium");
    await backToLobby(db, pato, battleId, ctx(opensAt + 1_000));
    const lobby = await battleState(db, pato, battleId, ctx(opensAt + 2_000));
    expect(lobby).toMatchObject({ stage: "lobby", match: null });
    // Juli left, so Pato won it.
    expect((await latestMatch(db, battleId))?.winners).toEqual([pato.id]);
  });
});

describe("a battle of Largada", () => {
  async function largada() {
    const [pato, juli] = await Promise.all([player("Pato"), player("Juli")]);
    const group = await newGroup(db, pato, { name: "Los primos", emblem: "casa", color: "coral" }, ctx(T - 60_000));
    await db.query("insert into game.group_members (group_id, user_id, joined_at) values ($1::uuid, $2::uuid, now())", [group.id, juli.id]);
    const { battleId } = await openRoom(db, pato, { groupId: group.id, game: "reflexes" }, ctx(T));
    await joinFromGroup(db, juli, battleId, ctx(T + 500));
    await startMatch(db, pato, battleId, ctx(T + 1_000));
    const { delaysMs } = (await latestMatch(db, battleId))!.content as BattleLargadaContent;
    return { pato, juli, battleId, groupId: group.id, startsAt: T + 1_000 + countdownMs, delaysMs };
  }
  const signalAfter = (delay: number) => BATTLE_RULES.largada.firstLightMs + 4 * 1_000 + delay;

  it("puts the lights out at the same time for both, and races once both tapped", async () => {
    const { pato, juli, battleId, startsAt, delaysMs } = await largada();
    const signalAt = startsAt + signalAfter(delaysMs[0]!);
    const lights = await battleState(db, juli, battleId, ctx(startsAt + 100));
    if (lights.match?.game !== "reflexes") throw new Error("not largada");
    expect(lights.match.rounds).toEqual([{ index: 0, lightsAt: startsAt, signalAt, closedAt: null, raceAt: null, nextAt: null, starts: [] }]);

    await battleStart(db, pato, battleId, { round: 0, reactionMs: 231, falseStart: false }, ctx(signalAt + 280));
    await battleStart(db, juli, battleId, { round: 0, reactionMs: null, falseStart: true }, ctx(signalAt - 900));
    expect(await failure(battleStart(db, juli, battleId, { round: 0, reactionMs: 200, falseStart: false }, ctx(signalAt + 300)))).toMatchObject({ code: "round-closed" });
    const raced = await battleState(db, juli, battleId, ctx(signalAt + 300));
    if (raced.match?.game !== "reflexes") throw new Error("not largada");
    expect(raced.match.rounds[0]).toMatchObject({ closedAt: signalAt + 280, raceAt: signalAt + 280 + BATTLE_RULES.largada.raceLeadMs });
    expect(raced.match.rounds[0]?.starts).toEqual([
      { userId: pato.id, outcome: "hit", reactionMs: 231 },
      { userId: juli.id, outcome: "false-start", reactionMs: null },
    ]);
    expect(raced.match.standings.map((row) => [row.userId, row.place, row.averageMs])).toEqual([
      [pato.id, 1, 231],
      [juli.id, 2, 450],
    ]);
  });

  it("counts as jumped a reaction that arrived before it could have happened", async () => {
    const { pato, juli, battleId, startsAt, delaysMs } = await largada();
    const signalAt = startsAt + signalAfter(delaysMs[0]!);
    await battleStart(db, pato, battleId, { round: 0, reactionMs: 180, falseStart: false }, ctx(signalAt - 400));
    await battleStart(db, juli, battleId, { round: 0, reactionMs: 250, falseStart: false }, ctx(signalAt + 100));
    const view = await battleState(db, pato, battleId, ctx(signalAt + 200));
    if (view.match?.game !== "reflexes") throw new Error("not largada");
    expect(view.match.rounds[0]?.starts.map((start) => start.outcome)).toEqual(["false-start", "hit"]);
  });

  it("ends after three starts and keeps the group's tally", async () => {
    const { pato, juli, battleId, groupId, startsAt, delaysMs } = await largada();
    const { raceLeadMs, raceShowMs, waitMs } = BATTLE_RULES.largada;
    let lightsAt = startsAt;
    for (let round = 0; round < 3; round++) {
      const signalAt = lightsAt + signalAfter(delaysMs[round]!);
      await battleStart(db, juli, battleId, { round, reactionMs: 210, falseStart: false }, ctx(signalAt + 260));
      if (round === 1) {
        // Pato doesn't tap: the start closes when the slowest that counts would have arrived.
        lightsAt = signalAt + waitMs + raceLeadMs + raceShowMs;
      } else {
        await battleStart(db, pato, battleId, { round, reactionMs: 300, falseStart: false }, ctx(signalAt + 350));
        lightsAt = signalAt + 350 + raceLeadMs + raceShowMs;
      }
    }
    const podium = await battleState(db, pato, battleId, ctx(lightsAt));
    expect(podium.stage).toBe("podium");
    if (podium.match?.game !== "reflexes") throw new Error("not largada");
    expect(podium.match.standings.map((row) => [row.userId, row.place, row.averageMs])).toEqual([
      [juli.id, 1, 210],
      [pato.id, 2, 433],
    ]);
    expect(podium.wins).toEqual([{ userId: juli.id, wins: 1 }]);

    const tally = await groupBattles(db, pato, groupId, ctx(lightsAt + 1_000));
    expect(tally.wins.map((row) => [row.username, row.wins])).toEqual([
      ["Juli", 1],
      ["Pato", 0],
    ]);
    expect(tally.recent).toEqual([{ id: expect.any(String), game: "reflexes", endedAt: lightsAt, players: 2, winners: [{ userId: juli.id, username: "Juli" }] }]);
  });

  it("writes down a match everyone left before the podium", async () => {
    const { pato, juli, battleId, groupId, startsAt } = await largada();
    await leaveRoom(db, pato, battleId, ctx(startsAt + 1_000));
    await leaveRoom(db, juli, battleId, ctx(startsAt + 2_000));
    const tally = await groupBattles(db, pato, groupId, ctx(startsAt + 11 * 60_000));
    expect(tally.live).toBeNull();
    expect(tally.recent).toHaveLength(1);
    expect(tally.recent[0]?.winners).toEqual([]);
  });
});

describe("a battle of Diez Letras", () => {
  const { durationMs, graceMs, timeUpMs } = BATTLE_RULES.letters;
  async function letters(set?: string) {
    const [pato, juli] = await Promise.all([player("Pato"), player("Juli")]);
    const { battleId } = await room(pato, juli);
    await chooseGame(db, pato, battleId, "seven-letters", ctx(T + 2_000));
    await startMatch(db, pato, battleId, ctx(T + 3_000));
    if (set) await db.query("update game.battle_matches set content = $2::text::jsonb where battle_id = $1::uuid", [battleId, JSON.stringify({ letters: [...set] })]);
    const content = (await latestMatch(db, battleId))!.content as BattleLettersContent;
    const valid = [...lettersWords(content.letters)];
    return { pato, juli, battleId, startsAt: T + 3_000 + countdownMs, letters: content.letters, valid };
  }

  it("gives everyone the same ten letters right when the countdown ends", async () => {
    const { pato, juli, battleId, startsAt, letters: set, valid } = await letters();
    expect(set).toHaveLength(10);
    expect(valid.length).toBeGreaterThanOrEqual(40);
    const early = await battleState(db, juli, battleId, ctx(startsAt - 1_000));
    if (early.match?.game !== "seven-letters") throw new Error("not letters");
    expect(early.match).toMatchObject({ letters: null, round: null, durationMs, minWordLength: 3, mine: [], found: null });
    const soon = await battleState(db, pato, battleId, ctx(startsAt - 300));
    if (soon.match?.game !== "seven-letters") throw new Error("not letters");
    expect(soon.match.letters).toEqual(set);
    expect(await failure(battleWord(db, pato, battleId, valid[0]!, ctx(startsAt - 300)))).toMatchObject({ code: "too-early" });
  });

  it("checks each word, and shows the others only the points until the time is up", async () => {
    const { pato, juli, battleId, startsAt, valid } = await letters();
    const [long, short] = [valid[0]!, valid.at(-1)!];
    expect(await battleWord(db, pato, battleId, long.toLowerCase(), ctx(startsAt + 5_000))).toMatchObject({ word: long, status: "valid" });
    const first = await battleWord(db, pato, battleId, long, ctx(startsAt + 6_000));
    expect(first).toEqual({ word: long, status: "duplicate", points: expect.any(Number) });
    expect(first.points).toBeGreaterThan(0);
    expect(await battleWord(db, pato, battleId, "ZZZQ", ctx(startsAt + 6_500))).toEqual({ word: "ZZZQ", status: "invalid", points: 0 });
    expect(await battleWord(db, pato, battleId, "ab", ctx(startsAt + 7_000))).toEqual({ word: "AB", status: "too-short", points: 0 });
    expect(await battleWord(db, juli, battleId, short, ctx(startsAt + 8_000))).toMatchObject({ status: "valid" });

    const during = await battleState(db, juli, battleId, ctx(startsAt + 10_000));
    if (during.match?.game !== "seven-letters") throw new Error("not letters");
    expect(during.match.mine.map((one) => one.word)).toEqual([short]);
    expect(during.match.found).toBeNull();
    expect(during.match.round).toMatchObject({ closed: false, closesAt: startsAt + durationMs + graceMs });
    expect(during.match.standings.map((row) => [row.userId, row.place, row.words])).toEqual([
      [pato.id, 1, 1],
      [juli.id, 2, 1],
    ]);
    expect(JSON.stringify(during)).not.toContain(long);
  });

  it("plays the whole 90 seconds and ends with everyone's words", async () => {
    const { pato, juli, battleId, startsAt, valid } = await letters();
    await battleWord(db, pato, battleId, valid[3]!, ctx(startsAt + 2_000));
    await battleWord(db, juli, battleId, valid[3]!, ctx(startsAt + 3_000));
    await battleWord(db, juli, battleId, valid[4]!, ctx(startsAt + durationMs + graceMs - 100));
    expect(await failure(battleWord(db, juli, battleId, valid[5]!, ctx(startsAt + durationMs + graceMs)))).toMatchObject({ code: "round-closed" });

    const timeUp = await battleState(db, pato, battleId, ctx(startsAt + durationMs + graceMs + 500));
    expect(timeUp.stage).toBe("match");
    if (timeUp.match?.game !== "seven-letters") throw new Error("not letters");
    expect(timeUp.match.round).toMatchObject({ closed: true, nextAt: startsAt + durationMs + graceMs + timeUpMs });
    expect(timeUp.match.found?.find((one) => one.userId === juli.id)?.words).toEqual([
      ...[valid[3]!, valid[4]!]
        .sort((a, b) => b.length - a.length || a.localeCompare(b, "es"))
        .map((word) => ({ word, points: expect.any(Number), onlyOne: word === valid[4] })),
    ]);

    const podium = await battleState(db, pato, battleId, ctx(startsAt + durationMs + graceMs + timeUpMs));
    expect(podium.stage).toBe("podium");
    expect(podium.match?.standings.map((row) => [row.userId, row.place])).toEqual([
      [juli.id, 1],
      [pato.id, 2],
    ]);
    expect((await latestMatch(db, battleId))?.winners).toEqual([juli.id]);
  });

  it("hides on the podium a rude word someone else found", async () => {
    const { pato, juli, battleId, startsAt, valid } = await letters("ADIVINANZA");
    const fine = valid.find((word) => word.length > 4)!;
    expect(await battleWord(db, juli, battleId, "nazi", ctx(startsAt + 4_000))).toMatchObject({ status: "valid" });
    expect(await battleWord(db, juli, battleId, fine, ctx(startsAt + 5_000))).toMatchObject({ status: "valid" });
    const end = startsAt + durationMs + graceMs + timeUpMs;
    const theirs = await battleState(db, pato, battleId, ctx(end));
    if (theirs.match?.game !== "seven-letters") throw new Error("not letters");
    expect(theirs.match.found?.find((one) => one.userId === juli.id)?.words.map((one) => one.word)).toEqual([fine, null]);
    const mine = await battleState(db, juli, battleId, ctx(end + 100));
    if (mine.match?.game !== "seven-letters") throw new Error("not letters");
    expect(mine.match.found?.find((one) => one.userId === juli.id)?.words.map((one) => one.word)).toEqual([fine, "NAZI"]);
  });

  it("ends early only when everyone left", async () => {
    const { pato, juli, battleId, startsAt } = await letters();
    await leaveRoom(db, juli, battleId, ctx(startsAt + 1_000));
    const view = await battleState(db, pato, battleId, ctx(startsAt + 20_000));
    if (view.match?.game !== "seven-letters") throw new Error("not letters");
    expect(view.match.round?.closed).toBe(false);
  });
});
