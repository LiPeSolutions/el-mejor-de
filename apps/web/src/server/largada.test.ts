import { randomUUID } from "node:crypto";
import { claimAttempt, createUser, finishAttempt, getUser, type User } from "@repo/db";
import { testDatabase, type TestDatabase } from "@repo/db/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { joinWithCode, newGroup } from "./groups";
import { largadaGrid, pickLanes } from "./largada";
import { choosePlace } from "./places";

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
  await db.query("truncate game.crowns, game.group_members, game.groups, game.location_checks, game.attempts, game.users cascade");
});
afterAll(async () => {
  await db.close();
});

const AVATAR = { species: "rana", color: "natural", accessory: null } as const;
const THURSDAY = Date.parse("2026-10-08T15:00:00Z");
const TODAY = "2026-10-08";
const context = { now: THURSDAY, ipHash: null };
const CHIVILCOY = { lat: -34.9, lon: -60.02, accuracy: 30 };

async function player(username: string, article: "el" | "la" = "el"): Promise<User> {
  const user = await createUser(db, { username, passwordHash: "x", avatar: AVATAR, article });
  if (!user) throw new Error(`couldn't create ${username}`);
  return user;
}

let slotSeq = 0;
/** A finished daily challenge; a Largada when `starts` are given. */
async function played(user: User, score: number, options: { date?: string; starts?: (number | "jumped" | "missed")[]; at?: number; placeId?: string | null } = {}) {
  const at = options.at ?? THURSDAY - 60_000;
  const largada = options.starts !== undefined;
  const { attempt } = await claimAttempt(db, {
    id: randomUUID(),
    deviceId: randomUUID(),
    userId: user.id,
    date: options.date ?? TODAY,
    slot: largada ? 1 : 2 + (slotSeq++ % 1),
    game: largada ? "reflexes" : "sequence",
    startedAt: at - 40_000,
    placeId: options.placeId ?? null,
  });
  const rounds = (options.starts ?? []).map((start) =>
    start === "jumped" ? { outcome: "false-start", reactionMs: null } : start === "missed" ? { outcome: "miss", reactionMs: null } : { outcome: "hit", reactionMs: start },
  );
  const result = largada ? { game: "reflexes", version: "largada", score, averageMs: 240, bestMs: 231, rounds } : { game: "sequence", score };
  await finishAttempt(db, attempt.id, { finishedAt: at, score, result, flags: [] });
}

async function groupOf(owner: User, members: User[]) {
  const group = await newGroup(db, owner, { name: "los del chivi", emblem: "mate", color: "turquesa" }, context);
  for (const member of members) await joinWithCode(db, member, group.invite.code, context);
  return group;
}

describe("the grid of today's Largada", () => {
  it("races the group's times of today, in the week's order, with the crown first", async () => {
    const [nico, tincho, juli, caro, pato] = [await player("Nico"), await player("Tincho"), await player("Juli", "la"), await player("Caro", "la"), await player("Pato")];
    const group = await groupOf(nico, [tincho, juli, caro, pato]);
    // The week so far: Tincho leads, then Juli, Nico and Caro; Pato didn't play.
    for (const [user, monday, tuesday] of [[tincho, 1000, 1000], [juli, 1000, 900], [nico, 1000, 900], [caro, 900, 0]] as const) {
      await played(user, monday, { date: "2026-10-05" });
      if (tuesday > 0) await played(user, tuesday, { date: "2026-10-06" });
    }
    // Today's Largadas.
    await played(tincho, 891, { starts: [256, 249, 262], at: THURSDAY - 120_000 });
    await played(juli, 917, { starts: [218, "jumped", 230] });
    await played(caro, 887, { starts: [247, 240, "missed"] });

    const grid = await largadaGrid(db, nico, group.id, THURSDAY);
    expect(grid.group).toEqual({ id: group.id, name: "Los del chivi" });
    expect(grid.rivals.map((rival) => [rival.username, rival.crown, rival.score])).toEqual([
      ["Tincho", true, 891],
      ["Juli", false, 917],
      ["Caro", false, 887],
    ]);
    expect(grid.rivals[1]!.starts).toEqual([
      { reactionMs: 218, falseStart: false },
      { reactionMs: null, falseStart: true },
      { reactionMs: 230, falseStart: false },
    ]);
    expect(grid.lanes).toEqual(grid.rivals.map((rival) => rival.userId));
    expect(grid.waiting.map((member) => member.username)).toEqual(["Pato"]);
    expect(grid).toMatchObject({ me: null, ghost: null, crown: { username: "Tincho" }, meWeek: { position: 3, lead: null } });

    // After racing, the player shows up for the podium.
    await played(nico, 920, { starts: [231, 238, 251] });
    expect((await largadaGrid(db, nico, null, THURSDAY)).me).toMatchObject({ username: "Nico", score: 920, starts: [{ reactionMs: 231, falseStart: false }, expect.anything(), expect.anything()] });
  });

  it("without a group, races the best of the day in the locality, then in the country", async () => {
    const nico = await player("Nico");
    const ana = await player("Ana", "la");
    expect((await largadaGrid(db, nico, null, THURSDAY)).ghost).toBeNull();
    await played(ana, 940, { starts: [210, 220, 230], placeId: "ar-06224050" });
    expect((await largadaGrid(db, nico, null, THURSDAY)).ghost).toMatchObject({ title: "La mejor de Argentina", article: "la", score: 940 });
    await choosePlace(db, nico, { placeId: "ar-06224010", ...CHIVILCOY }, { now: THURSDAY, ipCountry: "AR" });
    const local = await player("Colo");
    await played(local, 800, { starts: [250, 260, 270], placeId: "ar-06224010" });
    expect((await largadaGrid(db, (await getUser(db, nico.id))!, null, THURSDAY)).ghost).toMatchObject({ title: "El mejor de Chivilcoy", score: 800 });
    expect((await largadaGrid(db, null, null, THURSDAY)).ghost).toMatchObject({ title: "La mejor de Argentina" });
  });
});

describe("the lanes", () => {
  const rival = (userId: string, score: number, at = 0) => ({ userId, username: userId, avatar: AVATAR, article: "el" as const, crown: false, starts: [], score, averageMs: null, at });

  it("go to the crown, the ones right above and below, and then the fastest", () => {
    const week = ["a", "b", "c", "me", "d", "e", "f"];
    const rivals = [rival("a", 500), rival("b", 600), rival("c", 700), rival("d", 400), rival("e", 990), rival("f", 980)];
    expect(pickLanes(rivals, week, "me", "a")).toEqual(["a", "c", "d", "e"]);
    expect(pickLanes(rivals.slice(0, 4), week, "me", "a")).toEqual(["a", "b", "c", "d"]);
  });
});
