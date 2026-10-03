import { randomUUID } from "node:crypto";
import { claimAttempt, createUser, finishAttempt, getUser, type User } from "@repo/db";
import { testDatabase, type TestDatabase } from "@repo/db/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { crownsOf } from "./groups";
import { HttpError } from "./http";
import { choosePlace, nearbyPlaces, placeStatus, rankingView, searchPlaces, settlePlaceCrowns, todayStandings, verifyPlace } from "./places";

let db: TestDatabase;
beforeAll(async () => {
  db = await testDatabase();
  await db.query(
    `insert into game.places (id, kind, parent_id, name, lat, lon, radius_km) values
       ('ar', 'country', null, 'Argentina', null, null, null),
       ('ar-02', 'province', 'ar', 'Ciudad Autónoma de Buenos Aires', null, null, null),
       ('ar-06', 'province', 'ar', 'Buenos Aires', null, null, null),
       ('ar-02042', 'department', 'ar-02', 'Comuna 6', null, null, null),
       ('ar-0204201001', 'locality', 'ar-02042', 'Caballito', -34.61627, -58.44055, 12),
       ('ar-02098', 'department', 'ar-02', 'Comuna 14', null, null, null),
       ('ar-0209801001', 'locality', 'ar-02098', 'Palermo', -34.58124, -58.42102, 12),
       ('ar-02014', 'department', 'ar-02', 'Comuna 2', null, null, null),
       ('ar-02014010', 'locality', 'ar-02014', 'Ciudad de Buenos Aires', -34.60842, -58.37213, 12),
       ('ar-06224', 'department', 'ar-06', 'Chivilcoy', null, null, null),
       ('ar-06224010', 'locality', 'ar-06224', 'Chivilcoy', -34.8969, -60.01909, 12),
       ('ar-06224050', 'locality', 'ar-06224', 'Moquehuá', -35.09221, -59.77571, 12)`,
  );
});
beforeEach(async () => {
  await db.query("truncate game.crowns, game.place_weeks, game.location_checks, game.group_members, game.groups, game.attempts, game.users cascade");
});
afterAll(async () => {
  await db.close();
});

const AVATAR = { species: "llama", color: "natural", accessory: null };
const CABALLITO = { lat: -34.6175, lon: -58.4412, accuracy: 30 };
const CHIVILCOY = { lat: -34.9, lon: -60.02, accuracy: 30 };
/** Wednesday 7/10/2026, noon in Argentina. */
const WEDNESDAY = Date.parse("2026-10-07T15:00:00Z");
const context = (now = WEDNESDAY, ipCountry: string | null = "AR") => ({ now, ipCountry });

async function player(username: string, article: "el" | "la" = "el"): Promise<User> {
  const user = await createUser(db, { username, passwordHash: "x", avatar: AVATAR, article });
  if (!user) throw new Error(`couldn't create ${username}`);
  return user;
}

const fresh = async (user: User) => (await getUser(db, user.id))!;

async function played(user: User, placeId: string | null, date: string, slot: number, score: number, at: number) {
  const { attempt } = await claimAttempt(db, { id: randomUUID(), deviceId: randomUUID(), userId: user.id, date, slot, game: "reflexes", startedAt: at - 60_000, placeId });
  await finishAttempt(db, attempt.id, { finishedAt: at, score, result: {}, flags: [] });
}

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof HttpError) return { status: error.status, code: error.message };
    throw error;
  }
  throw new Error("expected it to fail");
}

describe("choosing the place", () => {
  it("offers the places near the position, in the city by barrio", async () => {
    const { places } = await nearbyPlaces(db, CABALLITO, context());
    expect(places.map((place) => place.name)).toEqual(["Caballito"]);
    expect(places[0]).toEqual({ id: "ar-0204201001", name: "Caballito", department: "Comuna 6", province: "Ciudad de Buenos Aires" });
  });

  it("checks with the GPS on the spot, and the week's challenges join the ranking", async () => {
    const juli = await player("Juli", "la");
    await played(juli, null, "2026-10-06", 0, 700, Date.parse("2026-10-06T15:00:00Z"));
    const chosen = await choosePlace(db, juli, { placeId: "ar-0204201001", ...CABALLITO }, context());
    expect(chosen).toEqual({
      result: "verified",
      status: { place: { id: "ar-0204201001", name: "Caballito", department: "Comuna 6", province: "Ciudad de Buenos Aires" }, verified: true, verifiedThisWeek: true },
    });
    const ranking = await rankingView(db, await fresh(juli), "locality", WEDNESDAY);
    expect(ranking.periods?.week.rows.map((row) => [row.username, row.score])).toEqual([["Juli", 700]]);
  });

  it("saves a place chosen by hand, to check later", async () => {
    const tincho = await player("Tincho");
    expect((await choosePlace(db, tincho, { placeId: "ar-06224010" }, context())).result).toBe("saved");
    expect(await placeStatus(db, await fresh(tincho), WEDNESDAY)).toMatchObject({ place: { name: "Chivilcoy" }, verified: false });
    const far = await verifyPlace(db, await fresh(tincho), CABALLITO, context());
    expect(far.result).toBe("too-far");
    const near = await verifyPlace(db, await fresh(tincho), CHIVILCOY, context());
    expect(near).toMatchObject({ result: "verified", status: { verified: true, verifiedThisWeek: true } });
  });

  it("accepts the countryside of the same partido", async () => {
    const tincho = await player("Tincho");
    // 25 km from Chivilcoy, nearer to Moquehuá.
    expect((await choosePlace(db, tincho, { placeId: "ar-06224010", lat: -35.02, lon: -59.85, accuracy: 50 }, context())).result).toBe("verified");
  });

  it("can move whenever, if the GPS confirms the new place", async () => {
    const juli = await player("Juli");
    await choosePlace(db, juli, { placeId: "ar-0204201001", ...CABALLITO }, context());
    expect((await choosePlace(db, await fresh(juli), { placeId: "ar-06224010", ...CHIVILCOY }, context())).result).toBe("verified");
    expect((await fresh(juli)).placeName).toBe("Chivilcoy");
    // Moving by hand leaves the new place to check.
    const moved = await choosePlace(db, await fresh(juli), { placeId: "ar-0209801001" }, context());
    expect(moved).toMatchObject({ result: "saved", status: { verified: false } });
  });

  it("refuses the generic city, bad positions, other countries and too many checks", async () => {
    const tincho = await player("Tincho");
    expect(await failure(choosePlace(db, tincho, { placeId: "ar-02014010" }, context()))).toMatchObject({ status: 404 });
    expect(await failure(choosePlace(db, tincho, { placeId: "ar-06224010", lat: -34.9, lon: -60, accuracy: 9000 }, context()))).toMatchObject({ status: 422 });
    expect(await failure(nearbyPlaces(db, CHIVILCOY, context(WEDNESDAY, "UY")))).toMatchObject({ status: 403, code: "outside-argentina" });
    for (let i = 0; i < 20; i += 1) await choosePlace(db, tincho, { placeId: "ar-06224010", ...CABALLITO }, context());
    expect(await failure(choosePlace(db, tincho, { placeId: "ar-06224010", ...CHIVILCOY }, context()))).toMatchObject({ status: 429 });
  });

  it("searches by hand without the generic city", async () => {
    expect((await searchPlaces(db, "ciudad", "ar-02")).places).toEqual([]);
    expect((await searchPlaces(db, "cabal", null)).places).toEqual([{ id: "ar-0204201001", name: "Caballito", department: "Comuna 6", province: "Ciudad de Buenos Aires" }]);
  });
});

describe("the ranking of a place", () => {
  it("needs a place, and without the GPS shows it without you", async () => {
    const tincho = await player("Tincho");
    expect((await rankingView(db, tincho, "locality", WEDNESDAY)).status).toBe("no-place");
    await choosePlace(db, tincho, { placeId: "ar-0204201001" }, context());
    const view = await rankingView(db, await fresh(tincho), "province", WEDNESDAY);
    expect(view).toMatchObject({ status: "unverified", place: { name: "Ciudad de Buenos Aires", crownName: "la Ciudad de Buenos Aires" } });
    expect(view.levels.map((level) => level.name)).toEqual(["Caballito", "Ciudad de Buenos Aires", "Argentina"]);
  });

  it("gives the live crown to the first one who checked this week", async () => {
    const tincho = await player("Tincho");
    const juli = await player("Juli", "la");
    // Tincho verified last week and leads; Juli checked this week.
    await choosePlace(db, tincho, { placeId: "ar-0204201001", ...CABALLITO }, context(Date.parse("2026-10-03T15:00:00Z")));
    await choosePlace(db, juli, { placeId: "ar-0209801001", lat: -34.582, lon: -58.422, accuracy: 20 }, context());
    await played(await fresh(tincho), "ar-0204201001", "2026-10-07", 0, 900, WEDNESDAY);
    await played(await fresh(juli), "ar-0209801001", "2026-10-07", 0, 800, WEDNESDAY);
    const city = await rankingView(db, await fresh(tincho), "province", WEDNESDAY);
    expect(city.periods?.week.rows.map((row) => [row.username, row.locality, row.holder, row.isMe])).toEqual([
      ["Tincho", "Caballito", false, true],
      ["Juli", "Palermo", true, false],
    ]);
    expect(city.me.verifiedThisWeek).toBe(false);
    await verifyPlace(db, await fresh(tincho), CABALLITO, context());
    const after = await rankingView(db, await fresh(tincho), "province", WEDNESDAY);
    expect(after.periods?.week.rows[0]).toMatchObject({ username: "Tincho", holder: true });
  });
});

describe("today's position", () => {
  it("in the barrio, the city and the country, with who's right above", async () => {
    const tincho = await player("Tincho");
    const juli = await player("Juli", "la");
    await choosePlace(db, tincho, { placeId: "ar-0204201001", ...CABALLITO }, context());
    await choosePlace(db, juli, { placeId: "ar-0204201001", ...CABALLITO }, context());
    await played(await fresh(tincho), "ar-0204201001", "2026-10-07", 0, 600, WEDNESDAY);
    await played(await fresh(juli), "ar-0204201001", "2026-10-07", 0, 800, WEDNESDAY);
    expect(await todayStandings(db, await fresh(tincho), WEDNESDAY)).toEqual({
      status: "ok",
      place: { id: "ar-0204201001", name: "Caballito" },
      levels: [
        { level: "locality", name: "Caballito", position: 2, score: 600, players: 2 },
        { level: "province", name: "Ciudad de Buenos Aires", position: 2, score: 600, players: 2 },
        { level: "country", name: "Argentina", position: 2, score: 600, players: 2 },
      ],
      above: { username: "Juli", score: 800 },
    });
    expect((await todayStandings(db, await fresh(juli), WEDNESDAY)).above).toBeNull();
  });

  it("needs a place checked with the GPS", async () => {
    const pato = await player("Pato");
    expect(await todayStandings(db, pato, WEDNESDAY)).toEqual({ status: "no-place", place: null, levels: [], above: null });
    await choosePlace(db, pato, { placeId: "ar-06224010" }, context());
    expect(await todayStandings(db, await fresh(pato), WEDNESDAY)).toMatchObject({ status: "unverified", place: { name: "Chivilcoy" } });
  });
});

describe("the crowns of places", () => {
  const MONDAY = Date.parse("2026-10-12T04:00:00Z");

  it("crowns the barrio, the city and the country, each with its name", async () => {
    const juli = await player("Juli", "la");
    await choosePlace(db, juli, { placeId: "ar-0204201001", ...CABALLITO }, context());
    await played(await fresh(juli), "ar-0204201001", "2026-10-07", 0, 900, WEDNESDAY);
    const crowns = await crownsOf(db, await fresh(juli), MONDAY);
    expect(crowns.map((crown) => [crown.kind, crown.title, crown.score]).sort()).toEqual([
      ["country", "Argentina", 900],
      ["locality", "Caballito", 900],
      ["province", "la Ciudad de Buenos Aires", 900],
    ]);
  });

  it("goes to the next one if the leader didn't check that week", async () => {
    const tincho = await player("Tincho");
    const juli = await player("Juli", "la");
    await choosePlace(db, tincho, { placeId: "ar-0204201001", ...CABALLITO }, context(Date.parse("2026-10-03T15:00:00Z")));
    await choosePlace(db, juli, { placeId: "ar-0204201001", ...CABALLITO }, context());
    await played(await fresh(tincho), "ar-0204201001", "2026-10-07", 0, 950, WEDNESDAY);
    await played(await fresh(juli), "ar-0204201001", "2026-10-07", 0, 600, WEDNESDAY);
    await settlePlaceCrowns(db, ["ar-0204201001"], MONDAY);
    expect(await crownsOf(db, await fresh(tincho), MONDAY)).toEqual([]);
    const [crown] = (await crownsOf(db, await fresh(juli), MONDAY)).filter((one) => one.kind === "locality");
    expect(crown).toMatchObject({ title: "Caballito", winner: { username: "Juli" }, players: 2, runnerUp: null });
    // Deciding again changes nothing.
    await settlePlaceCrowns(db, ["ar-0204201001"], MONDAY + 60_000);
    expect((await crownsOf(db, await fresh(juli), MONDAY)).filter((one) => one.kind === "locality")).toHaveLength(1);
    expect((await rankingView(db, await fresh(juli), "locality", MONDAY)).lastCrown).toMatchObject({ title: "Caballito" });
  });

  it("gives no crown when nobody checked that week", async () => {
    const tincho = await player("Tincho");
    await choosePlace(db, tincho, { placeId: "ar-06224010", ...CHIVILCOY }, context(Date.parse("2026-10-03T15:00:00Z")));
    await played(await fresh(tincho), "ar-06224010", "2026-10-07", 0, 950, WEDNESDAY);
    expect(await crownsOf(db, await fresh(tincho), MONDAY)).toEqual([]);
  });
});
