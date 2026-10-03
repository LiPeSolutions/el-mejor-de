import { randomUUID } from "node:crypto";
import { claimAttempt, createUser, finishAttempt, getGroup, type User } from "@repo/db";
import { testDatabase, type TestDatabase } from "@repo/db/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  crownsOf,
  editGroup,
  groupDetail,
  joinWithCode,
  lastClosedWeek,
  leave,
  listGroups,
  markCelebrationSeen,
  newGroup,
  previewInvite,
  removeFromGroup,
  renewInvite,
  settleCrowns,
  weekInfo,
} from "./groups";
import { HttpError } from "./http";

let db: TestDatabase;
beforeAll(async () => {
  db = await testDatabase();
});
beforeEach(async () => {
  await db.query("truncate game.crowns, game.group_code_failures, game.group_members, game.groups, game.attempts, game.users cascade");
});
afterAll(async () => {
  await db.close();
});

const AVATAR = { species: "rana", color: "natural", accessory: null };
/** Argentina is UTC-3: the week of 5/10/2026 closes on Monday 12/10 at 03:00 UTC. */
const WEEK_CLOSES = Date.parse("2026-10-12T03:00:00Z");
const THURSDAY = Date.parse("2026-10-08T15:00:00Z");
const context = (now = THURSDAY, ipHash: string | null = "ip-a") => ({ now, ipHash });

async function player(username: string, article: "el" | "la" = "el"): Promise<User> {
  const user = await createUser(db, { username, passwordHash: "x", avatar: AVATAR, article });
  if (!user) throw new Error(`couldn't create ${username}`);
  return user;
}

/** A finished daily challenge for an account, graded at `at`. */
async function played(user: User, date: string, slot: number, score: number, at: number) {
  const { attempt } = await claimAttempt(db, { id: randomUUID(), deviceId: randomUUID(), userId: user.id, date, slot, game: "reflexes", startedAt: at - 60_000 });
  await finishAttempt(db, attempt.id, { finishedAt: at, score, result: {}, flags: [] });
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

async function laburo(owner: User, now = THURSDAY) {
  return newGroup(db, owner, { name: "los del laburo", emblem: "maletin", color: "azul" }, context(now));
}

describe("creating a group", () => {
  it("creates it with a 7-day invitation", async () => {
    const group = await laburo(await player("Tincho"));
    expect(group).toMatchObject({ name: "Los del laburo", emblem: "maletin", color: "azul", memberCount: 1, maxMembers: 50, isOwner: true });
    expect(group.invite.code).toMatch(/^LABURO-[2-9A-HJKMNP-Z]{4}$/);
    expect(Date.parse(group.invite.expiresAt)).toBe(THURSDAY + 7 * 24 * 60 * 60 * 1000);
  });

  it("checks the name, the emblem and the color", async () => {
    const tincho = await player("Tincho");
    expect(await failure(newGroup(db, tincho, { name: "Los forros", emblem: "casa", color: "azul" }, context()))).toMatchObject({
      status: 400,
      code: "invalid-group-name",
      problem: "not-allowed",
    });
    expect(await failure(newGroup(db, tincho, { name: "Los primos", emblem: "calavera", color: "azul" }, context()))).toMatchObject({ code: "invalid-emblem" });
    expect(await failure(newGroup(db, tincho, { name: "Los primos", emblem: "casa", color: "negro" }, context()))).toMatchObject({ code: "invalid-color" });
  });

  it("limits new groups per day", async () => {
    const tincho = await player("Tincho");
    for (let i = 0; i < 5; i += 1) await newGroup(db, tincho, { name: `Grupo ${i + 1}`, emblem: "casa", color: "rosa" }, context());
    expect(await failure(newGroup(db, tincho, { name: "Grupo 6", emblem: "casa", color: "rosa" }, context()))).toMatchObject({ status: 429 });
  });
});

describe("invitations", () => {
  it("shows the group behind a code, with or without an account", async () => {
    const tincho = await player("Tincho");
    const group = await laburo(tincho);
    const code = group.invite.code.toLowerCase().replace("-", " ");
    expect(await previewInvite(db, null, code, context())).toMatchObject({ name: "Los del laburo", memberCount: 1, status: "open", groupId: null });
    expect(await previewInvite(db, tincho, code, context())).toMatchObject({ status: "member", groupId: group.id });
    const nextWeek = THURSDAY + 8 * 24 * 60 * 60 * 1000;
    expect(await previewInvite(db, null, code, context(nextWeek))).toMatchObject({ status: "expired" });
  });

  it("joins with the code, once", async () => {
    const group = await laburo(await player("Tincho"));
    const juli = await player("Juli", "la");
    expect(await joinWithCode(db, juli, group.invite.code, context())).toEqual({ groupId: group.id });
    expect(await joinWithCode(db, juli, group.invite.code, context())).toEqual({ groupId: group.id });
    expect((await getGroup(db, group.id))?.memberCount).toBe(2);
  });

  it("refuses an expired invitation", async () => {
    const group = await laburo(await player("Tincho"));
    const nextWeek = THURSDAY + 8 * 24 * 60 * 60 * 1000;
    expect(await failure(joinWithCode(db, await player("Juli"), group.invite.code, context(nextWeek)))).toMatchObject({ status: 410, code: "invite-expired" });
  });

  it("stops someone guessing codes", async () => {
    const juli = await player("Juli");
    for (let i = 0; i < 10; i += 1) {
      expect(await failure(joinWithCode(db, juli, `NOPE-${i}${i}${i}${i}`, context(THURSDAY, `ip-${i}`)))).toMatchObject({ status: 404 });
    }
    expect(await failure(joinWithCode(db, juli, "NOPE-2345", context(THURSDAY, "ip-x")))).toMatchObject({ status: 429, code: "too-many-codes" });
    // Without an account the connection is what counts.
    for (let i = 0; i < 30; i += 1) await failure(previewInvite(db, null, "NOPE-7777", context(THURSDAY, "ip-z")));
    expect(await failure(previewInvite(db, null, "NOPE-7777", context(THURSDAY, "ip-z")))).toMatchObject({ status: 429 });
  });

  it("lets the owner replace a working link, and anyone renew an expired one", async () => {
    const tincho = await player("Tincho");
    const juli = await player("Juli");
    const group = await laburo(tincho);
    await joinWithCode(db, juli, group.invite.code, context());
    expect(await failure(renewInvite(db, juli, group.id, context()))).toMatchObject({ status: 403 });
    const renewed = await renewInvite(db, tincho, group.id, context());
    expect(renewed.invite.code).not.toBe(group.invite.code);
    expect(await failure(previewInvite(db, null, group.invite.code, context()))).toMatchObject({ status: 404 });
    const nextWeek = THURSDAY + 8 * 24 * 60 * 60 * 1000;
    expect((await renewInvite(db, juli, group.id, context(nextWeek))).invite.expired).toBe(false);
  });
});

describe("members", () => {
  it("only shows a group to its members", async () => {
    const group = await laburo(await player("Tincho"));
    expect(await failure(groupDetail(db, await player("Colo"), group.id, context()))).toMatchObject({ status: 404 });
  });

  it("lets only the owner edit and remove members", async () => {
    const tincho = await player("Tincho");
    const juli = await player("Juli");
    const group = await laburo(tincho);
    await joinWithCode(db, juli, group.invite.code, context());
    expect(await failure(editGroup(db, juli, group.id, { name: "Hackeado" }, context()))).toMatchObject({ status: 403 });
    expect((await editGroup(db, tincho, group.id, { name: "El barrio", color: "coral" }, context())).name).toBe("El barrio");
    expect(await failure(removeFromGroup(db, juli, group.id, tincho.id, context()))).toMatchObject({ status: 403 });
    await removeFromGroup(db, tincho, group.id, juli.id, context());
    expect(await failure(groupDetail(db, juli, group.id, context()))).toMatchObject({ status: 404 });
    expect(await failure(joinWithCode(db, juli, group.invite.code, context()))).toMatchObject({ status: 403, code: "removed-from-group" });
  });

  it("lets anyone leave", async () => {
    const tincho = await player("Tincho");
    const juli = await player("Juli");
    const group = await laburo(tincho);
    await joinWithCode(db, juli, group.invite.code, context());
    await leave(db, tincho, group.id, context());
    expect((await groupDetail(db, juli, group.id, context())).group).toMatchObject({ isOwner: true, memberCount: 1 });
  });
});

describe("rankings", () => {
  it("ranks the week and the day, with whoever hasn't played last", async () => {
    const tincho = await player("Tincho");
    const juli = await player("Juli", "la");
    const colo = await player("Colo");
    const group = await laburo(tincho);
    await joinWithCode(db, juli, group.invite.code, context());
    await joinWithCode(db, colo, group.invite.code, context());
    await played(tincho, "2026-10-06", 0, 900, Date.parse("2026-10-06T15:00:00Z"));
    await played(juli, "2026-10-07", 0, 700, Date.parse("2026-10-07T15:00:00Z"));
    await played(juli, "2026-10-08", 0, 500, Date.parse("2026-10-08T14:00:00Z"));

    const view = await groupDetail(db, juli, group.id, context());
    expect(view.week).toMatchObject({ start: "2026-10-05", number: 41, hasCrown: true, closesAt: "2026-10-12T03:00:00.000Z" });
    expect(view.standings.week.map((row) => [row.username, row.position, row.score, row.isMe])).toEqual([
      ["Juli", 1, 1200, true],
      ["Tincho", 2, 900, false],
      ["Colo", null, 0, false],
    ]);
    expect(view.standings.today.map((row) => [row.username, row.position, row.score])).toEqual([
      ["Juli", 1, 500],
      ["Colo", null, 0],
      ["Tincho", null, 0],
    ]);

    const list = await listGroups(db, tincho, context());
    expect(list.groups[0]).toMatchObject({ leader: { username: "Juli", score: 1200 }, me: { position: 2, score: 900 }, gap: 300 });
    expect((await listGroups(db, juli, context())).groups[0]).toMatchObject({ me: { position: 1 }, gap: 300 });
  });

  it("counts the whole week even for someone who joined on Thursday", async () => {
    const tincho = await player("Tincho");
    const juli = await player("Juli");
    await played(juli, "2026-10-05", 0, 800, Date.parse("2026-10-05T15:00:00Z"));
    const group = await laburo(tincho);
    await joinWithCode(db, juli, group.invite.code, context());
    expect((await groupDetail(db, tincho, group.id, context())).standings.week[0]).toMatchObject({ username: "Juli", score: 800 });
  });
});

describe("the weekly crown", () => {
  it("closes on Monday at 00:10, once Sunday's scores are in", () => {
    expect(lastClosedWeek(WEEK_CLOSES + 9 * 60_000)).toBeNull();
    expect(lastClosedWeek(WEEK_CLOSES + 10 * 60_000)).toBe("2026-10-05");
    expect(lastClosedWeek(Date.parse("2026-10-20T15:00:00Z"))).toBe("2026-10-12");
    expect(weekInfo(Date.parse("2026-10-03T15:00:00Z"))).toMatchObject({ start: "2026-09-28", hasCrown: false, firstCrownOn: "2026-10-12" });
  });

  it("goes to whoever led when the week closed", async () => {
    const tincho = await player("Tincho");
    const juli = await player("Juli", "la");
    const group = await laburo(tincho, Date.parse("2026-10-05T12:00:00Z"));
    await joinWithCode(db, juli, group.invite.code, context(Date.parse("2026-10-05T12:00:00Z")));
    // Wednesday Tincho leads; Thursday Juli passes him; on Sunday he ties her, which isn't enough.
    await played(tincho, "2026-10-07", 0, 900, Date.parse("2026-10-07T15:00:00Z"));
    await played(juli, "2026-10-08", 0, 700, Date.parse("2026-10-08T15:00:00Z"));
    await played(juli, "2026-10-08", 1, 600, Date.parse("2026-10-08T15:05:00Z"));
    await played(tincho, "2026-10-11", 0, 400, Date.parse("2026-10-11T20:00:00Z"));

    const monday = WEEK_CLOSES + 11 * 60_000;
    expect(await crownsOf(db, juli, WEEK_CLOSES)).toEqual([]);
    const [crown] = await crownsOf(db, juli, monday);
    expect(crown).toMatchObject({
      weekStart: "2026-10-05",
      weekNumber: 41,
      groupId: group.id,
      title: "Los del laburo",
      emblem: "maletin",
      winner: { username: "Juli", article: "la" },
      score: 1300,
      daysPlayed: 1,
      players: 2,
      runnerUp: { username: "Tincho", score: 1300 },
      seen: false,
      nth: 1,
    });
    expect(await crownsOf(db, tincho, monday)).toEqual([]);
    expect((await groupDetail(db, tincho, group.id, context(monday))).lastCrown?.winner.username).toBe("Juli");

    await markCelebrationSeen(db, juli, crown!.id);
    expect((await crownsOf(db, juli, monday))[0]?.seen).toBe(true);
  });

  it("crowns a lone player and skips a week nobody played", async () => {
    const tincho = await player("Tincho");
    const group = await laburo(tincho, Date.parse("2026-10-05T12:00:00Z"));
    await played(tincho, "2026-10-14", 0, 50, Date.parse("2026-10-14T15:00:00Z"));
    const crowns = await crownsOf(db, tincho, Date.parse("2026-10-20T15:00:00Z"));
    expect(crowns.map((crown) => [crown.weekStart, crown.players, crown.runnerUp])).toEqual([["2026-10-12", 1, null]]);
    expect((await getGroup(db, group.id))?.crownedThrough).toBe("2026-10-12");
  });

  it("only counts who was in the group when the week closed", async () => {
    const tincho = await player("Tincho");
    const juli = await player("Juli");
    const group = await laburo(tincho, Date.parse("2026-10-05T12:00:00Z"));
    await played(tincho, "2026-10-06", 0, 100, Date.parse("2026-10-06T15:00:00Z"));
    await played(juli, "2026-10-06", 0, 900, Date.parse("2026-10-06T15:00:00Z"));
    // Juli joins on Monday morning, after the close: last week's crown is still Tincho's.
    await joinWithCode(db, juli, group.invite.code, context(WEEK_CLOSES + 6 * 60 * 60_000));
    const [crown] = await crownsOf(db, juli, WEEK_CLOSES + 7 * 60 * 60_000);
    expect(crown).toBeUndefined();
    expect((await crownsOf(db, tincho, WEEK_CLOSES + 7 * 60 * 60_000))[0]).toMatchObject({ score: 100, players: 1 });
  });

  it("starts with the week the group was created, and never before 5/10", async () => {
    const tincho = await player("Tincho");
    await played(tincho, "2026-10-01", 0, 999, Date.parse("2026-10-01T15:00:00Z"));
    await played(tincho, "2026-10-06", 0, 999, Date.parse("2026-10-06T15:00:00Z"));
    const group = await laburo(tincho, Date.parse("2026-10-13T12:00:00Z"));
    await played(tincho, "2026-10-13", 0, 10, Date.parse("2026-10-13T15:00:00Z"));
    const crowns = await crownsOf(db, tincho, Date.parse("2026-10-20T15:00:00Z"));
    expect(crowns.map((crown) => [crown.weekStart, crown.score])).toEqual([["2026-10-12", 10]]);
    // Deciding again changes nothing.
    await settleCrowns(db, [(await getGroup(db, group.id))!], Date.parse("2026-10-21T15:00:00Z"));
    expect(await crownsOf(db, tincho, Date.parse("2026-10-21T15:00:00Z"))).toHaveLength(1);
  });
});
