import { randomUUID } from "node:crypto";
import { claimAttempt, finishAttempt, getAttempt } from "@repo/db";
import { testDatabase, type TestDatabase } from "@repo/db/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ACCOUNT_RULES, accountHistory, changeProfile, checkAvailability, readSession, signIn, signOut, signUp, type RequestContext } from "./accounts";
import { HttpError } from "./http";

let db: TestDatabase;
beforeAll(async () => {
  db = await testDatabase();
});
beforeEach(async () => {
  await db.query("truncate game.attempts, game.sessions, game.auth_events, game.users cascade");
});
afterAll(async () => {
  await db.close();
});

const DEVICE = "11111111-1111-4111-8111-111111111111";
const DAY = 24 * 60 * 60 * 1000;
const AVATAR = { species: "hornero", color: "natural", accessory: "anteojos" };
const TINCHO = { username: "Tincho", password: "una frase larga", avatar: AVATAR, article: "el" };

const context = (overrides: Partial<RequestContext> = {}): RequestContext => ({
  deviceId: DEVICE,
  ipHash: "ip-a",
  now: Date.now(),
  today: "2026-10-03",
  ...overrides,
});

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof HttpError) return { status: error.status, code: error.message, ...error.details };
    throw error;
  }
  throw new Error("expected it to fail");
}

describe("signUp", () => {
  it("creates the account and signs it in", async () => {
    const signed = await signUp(db, TINCHO, context());
    expect(signed.user).toMatchObject({ username: "Tincho", avatar: AVATAR, article: "el" });
    expect((await readSession(db, signed.token, Date.now()))?.user.id).toBe(signed.user.id);
  });

  it("keeps only a hash of the password", async () => {
    await signUp(db, TINCHO, context());
    const [row] = await db.query<{ password_hash: string }>("select password_hash from game.users");
    expect(row?.password_hash).toMatch(/^scrypt\$32768\$8\$3\$/);
    expect(row?.password_hash).not.toContain(TINCHO.password);
  });

  it("gives the new account what this browser played today", async () => {
    const played = await claimAttempt(db, { id: randomUUID(), deviceId: DEVICE, date: "2026-10-03", slot: 0, game: "reflexes", startedAt: Date.now() });
    const signed = await signUp(db, TINCHO, context());
    expect((await getAttempt(db, played.attempt.id))?.userId).toBe(signed.user.id);
  });

  it("refuses an apodo that is taken, however it's written", async () => {
    await signUp(db, TINCHO, context());
    expect(await failure(signUp(db, { ...TINCHO, username: "TINCHÓ" }, context({ deviceId: randomUUID() })))).toMatchObject({
      status: 409,
      code: "username-taken",
    });
  });

  it("says what is wrong with each field", async () => {
    expect(await failure(signUp(db, { ...TINCHO, username: "Yo" }, context()))).toMatchObject({ code: "invalid-username", problem: "too-short" });
    expect(await failure(signUp(db, { ...TINCHO, password: "12345678" }, context()))).toMatchObject({ code: "invalid-password", problem: "too-common" });
    expect(await failure(signUp(db, { ...TINCHO, avatar: { ...AVATAR, accessory: "corona" } }, context()))).toMatchObject({ code: "invalid-avatar" });
    expect(await failure(signUp(db, { ...TINCHO, article: "lo" }, context()))).toMatchObject({ code: "invalid-article" });
  });

  it("limits new accounts per browser", async () => {
    for (const username of ["Juli", "Caro", "Pato"]) await signUp(db, { ...TINCHO, username }, context({ ipHash: null }));
    expect(await failure(signUp(db, TINCHO, context({ ipHash: null })))).toMatchObject({ status: 429, code: "too-many-signups" });
    expect((await signUp(db, TINCHO, context({ deviceId: randomUUID(), ipHash: null }))).user.username).toBe("Tincho");
  });
});

describe("signIn", () => {
  it("signs in with the apodo written any way", async () => {
    const created = await signUp(db, TINCHO, context());
    const signed = await signIn(db, { username: " tinchó ", password: TINCHO.password }, context());
    expect(signed.user.id).toBe(created.user.id);
    expect(signed.token).not.toBe(created.token);
  });

  it("answers the same for an unknown apodo and a wrong password", async () => {
    await signUp(db, TINCHO, context());
    expect(await failure(signIn(db, { username: "Tincho", password: "otra frase larga" }, context()))).toMatchObject({ status: 401, code: "wrong-credentials" });
    expect(await failure(signIn(db, { username: "Nadie123", password: TINCHO.password }, context()))).toMatchObject({ status: 401, code: "wrong-credentials" });
  });

  it("makes you wait after too many failures with one apodo", async () => {
    await signUp(db, TINCHO, context());
    for (let i = 0; i < ACCOUNT_RULES.signInFailuresPerUsername; i++) {
      await failure(signIn(db, { username: "Tincho", password: `intento numero ${i}` }, context({ ipHash: `ip-${i}` })));
    }
    expect(await failure(signIn(db, { username: "Tincho", password: TINCHO.password }, context()))).toMatchObject({ status: 429, code: "too-many-attempts" });
  });
});

describe("sessions", () => {
  it("renews a session when less than half of it is left", async () => {
    const { token } = await signUp(db, TINCHO, context());
    expect((await readSession(db, token, Date.now()))?.renewedTo).toBeNull();
    const later = Date.now() + 50 * DAY;
    expect((await readSession(db, token, later))?.renewedTo).toBe(later + ACCOUNT_RULES.sessionMs);
  });

  it("ends the session when signing out", async () => {
    const { token } = await signUp(db, TINCHO, context());
    await signOut(db, token);
    expect(await readSession(db, token, Date.now())).toBeNull();
  });

  it("ignores tokens that aren't ours", async () => {
    expect(await readSession(db, "", Date.now())).toBeNull();
    expect(await readSession(db, "x".repeat(43), Date.now())).toBeNull();
    expect(await readSession(db, "' or 1=1 --", Date.now())).toBeNull();
  });
});

describe("checkAvailability", () => {
  it("says whether an apodo is free and why not", async () => {
    await signUp(db, TINCHO, context());
    expect(await checkAvailability(db, "Juli")).toEqual({ available: true });
    expect(await checkAvailability(db, "tincho")).toEqual({ available: false, problem: "taken" });
    expect(await checkAvailability(db, "Admin")).toEqual({ available: false, problem: "not-allowed" });
  });
});

describe("changeProfile", () => {
  it("changes the character and the article", async () => {
    const { user } = await signUp(db, TINCHO, context());
    const changed = await changeProfile(db, user.id, { article: "la", avatar: { species: "rana", color: "azul", accessory: null } });
    expect(changed).toMatchObject({ article: "la", avatar: { species: "rana", color: "azul", accessory: null } });
    expect(await failure(changeProfile(db, user.id, { avatar: { species: "dragon" } }))).toMatchObject({ code: "invalid-avatar" });
  });
});

describe("accountHistory", () => {
  it("sends the account's attempts of the last days with their results", async () => {
    const { user } = await signUp(db, TINCHO, context());
    const start = (date: string, slot: number) =>
      claimAttempt(db, { id: randomUUID(), deviceId: DEVICE, userId: user.id, date, slot, game: "reflexes", startedAt: Date.now() });
    const old = await start("2026-07-01", 0);
    const recent = await start("2026-10-02", 1);
    await finishAttempt(db, recent.attempt.id, { finishedAt: Date.now(), score: 640, result: { game: "reflexes", score: 640 }, flags: [] });
    await finishAttempt(db, old.attempt.id, { finishedAt: Date.now(), score: 100, result: { game: "reflexes", score: 100 }, flags: [] });

    const history = await accountHistory(db, user.id, "2026-10-03");
    expect(history).toEqual([
      { date: "2026-10-02", slot: 1, game: "reflexes", status: "finished", startedAt: expect.any(Number), result: { game: "reflexes", score: 640 } },
    ]);
  });
});
