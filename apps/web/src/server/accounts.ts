import "server-only";
import { createHash, randomBytes } from "node:crypto";
import {
  countAuthEvents,
  createSession,
  createUser,
  endSession,
  extendSession,
  findUserForSignIn,
  getSession,
  linkDeviceAttempts,
  recordAuthEvent,
  updatePasswordHash,
  updateProfile,
  userAttemptsSince,
  usernameTaken,
  type Queryable,
  type User,
} from "@repo/db";
import type { GameId } from "@repo/games";
import {
  ARTICLES,
  USERNAME_RULES,
  addDays,
  checkPassword,
  checkUsername,
  parseAvatar,
  usernameKey,
  type Article,
  type UsernameProblem,
} from "@repo/shared";
import type { HistoryAttempt, PublicAccount } from "@/lib/account-types";
import type { ChallengeResult } from "@/lib/challenge-types";
import { HttpError } from "./http";
import { DUMMY_HASH, hashPassword, needsRehash, verifyPassword } from "./passwords";

/*
 * Accounts: an apodo and a password (docs/ARQUITECTURA.md §4). This module
 * holds the rules and talks to the database; the route handlers add cookies.
 */

const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

export const ACCOUNT_RULES = {
  /** A session lasts this long and renews itself when less than half is left. */
  sessionMs: 90 * DAY,
  /** Days of attempts a browser gets when it signs in (streak and week). */
  historyDays: 60,
  renewBelowMs: 45 * DAY,
  /** Failed sign-ins before waiting, per apodo and per connection. */
  signInWindowMs: 15 * MINUTE,
  signInFailuresPerUsername: 10,
  signInFailuresPerConnection: 30,
  /** New accounts per browser per day, and per connection per hour (schools share one). */
  signUpsPerDevice: 3,
  signUpsPerConnectionPerHour: 20,
} as const;

export interface RequestContext {
  deviceId: string;
  /** Keyed hash of the connection's IP, or null when unknown. */
  ipHash: string | null;
  now: number;
  /** Today's game date (Argentina). */
  today: string;
}

export interface SignedIn {
  user: User;
  /** Goes in the cookie; the database only keeps its hash. */
  token: string;
  expiresAt: number;
}

export function toPublicAccount(user: User): PublicAccount {
  return {
    id: user.id,
    username: user.username,
    avatar: parseAvatar(user.avatar) ?? { species: "hornero", color: "natural", accessory: null },
    article: user.article,
    placeId: user.placeId,
    placeName: user.placeName,
    placeVerified: user.placeVerifiedAt !== null,
    googleLinked: user.googleLinked,
  };
}

const sessionIdOf = (token: string) => createHash("sha256").update(token).digest("hex");

async function startSession(db: Queryable, userId: string, context: RequestContext): Promise<{ token: string; expiresAt: number }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = context.now + ACCOUNT_RULES.sessionMs;
  await createSession(db, { id: sessionIdOf(token), userId, deviceId: context.deviceId, expiresAt });
  return { token, expiresAt };
}

function parseArticle(value: unknown): Article {
  if (!ARTICLES.includes(value as Article)) throw new HttpError(400, "invalid-article");
  return value as Article;
}

export interface SignUpInput {
  username: string;
  password: string;
  avatar: unknown;
  article: unknown;
}

/** Creates the account, gives it what this browser played today and signs it in. */
export async function signUp(db: Queryable, input: SignUpInput, context: RequestContext): Promise<SignedIn> {
  const name = checkUsername(input.username);
  if (!name.ok) throw new HttpError(400, "invalid-username", { problem: name.problem });
  const passwordProblem = checkPassword(input.password, name.username);
  if (passwordProblem) throw new HttpError(400, "invalid-password", { problem: passwordProblem });
  const avatar = parseAvatar(input.avatar);
  if (!avatar) throw new HttpError(400, "invalid-avatar");
  const article = parseArticle(input.article);

  const { signUpsPerDevice, signUpsPerConnectionPerHour } = ACCOUNT_RULES;
  const tooMany =
    (await countAuthEvents(db, "signup", { deviceId: context.deviceId }, context.now - DAY)) >= signUpsPerDevice ||
    (context.ipHash !== null &&
      (await countAuthEvents(db, "signup", { ipHash: context.ipHash }, context.now - 60 * MINUTE)) >= signUpsPerConnectionPerHour);
  if (tooMany) throw new HttpError(429, "too-many-signups");

  const user = await createUser(db, { username: name.username, passwordHash: await hashPassword(input.password), avatar, article });
  if (!user) throw new HttpError(409, "username-taken");
  await recordAuthEvent(db, { kind: "signup", usernameKey: usernameKey(name.username), deviceId: context.deviceId, ipHash: context.ipHash });
  await linkDeviceAttempts(db, { deviceId: context.deviceId, userId: user.id, date: context.today });
  return { user, ...(await startSession(db, user.id, context)) };
}

/** Checks the apodo and password. Unknown apodo or wrong password get the same answer. */
export async function signIn(db: Queryable, input: { username: string; password: string }, context: RequestContext): Promise<SignedIn> {
  const username = input.username.trim().normalize("NFC");
  if (!username || username.length > USERNAME_RULES.maxLength || input.password.length > 200) {
    throw new HttpError(401, "wrong-credentials");
  }
  const key = usernameKey(username);
  const { signInWindowMs, signInFailuresPerUsername, signInFailuresPerConnection } = ACCOUNT_RULES;
  const since = context.now - signInWindowMs;
  const tooMany =
    (await countAuthEvents(db, "signin-failed", { usernameKey: key }, since)) >= signInFailuresPerUsername ||
    (context.ipHash !== null && (await countAuthEvents(db, "signin-failed", { ipHash: context.ipHash }, since)) >= signInFailuresPerConnection);
  if (tooMany) throw new HttpError(429, "too-many-attempts");

  const found = await findUserForSignIn(db, username);
  const ok = await verifyPassword(input.password, found?.passwordHash ?? DUMMY_HASH);
  if (!found || !ok) {
    await recordAuthEvent(db, { kind: "signin-failed", usernameKey: key, deviceId: context.deviceId, ipHash: context.ipHash });
    throw new HttpError(401, "wrong-credentials");
  }
  if (needsRehash(found.passwordHash)) await updatePasswordHash(db, found.user.id, await hashPassword(input.password));
  return { user: found.user, ...(await startSession(db, found.user.id, context)) };
}

/** The account behind a cookie's token. `renewedTo` is set when the session was extended. */
export async function readSession(db: Queryable, token: string, now: number): Promise<{ user: User; renewedTo: number | null } | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const id = sessionIdOf(token);
  const session = await getSession(db, id);
  if (!session) return null;
  if (session.expiresAt - now >= ACCOUNT_RULES.renewBelowMs) return { user: session.user, renewedTo: null };
  const renewedTo = now + ACCOUNT_RULES.sessionMs;
  await extendSession(db, id, renewedTo);
  return { user: session.user, renewedTo };
}

export async function signOut(db: Queryable, token: string): Promise<void> {
  await endSession(db, sessionIdOf(token));
}

/** Whether an apodo can be used, for the "Disponible" next to the field. */
export async function checkAvailability(db: Queryable, raw: string): Promise<{ available: true } | { available: false; problem: UsernameProblem | "taken" }> {
  const name = checkUsername(raw);
  if (!name.ok) return { available: false, problem: name.problem };
  return (await usernameTaken(db, name.username)) ? { available: false, problem: "taken" } : { available: true };
}

/** Changes the character and/or the article ("El / La Mejor"). */
export async function changeProfile(db: Queryable, userId: string, input: { avatar?: unknown; article?: unknown }): Promise<User> {
  const avatar = input.avatar === undefined ? undefined : parseAvatar(input.avatar);
  if (avatar === null) throw new HttpError(400, "invalid-avatar");
  const article = input.article === undefined ? undefined : parseArticle(input.article);
  const user = await updateProfile(db, userId, { avatar, article });
  if (!user) throw new HttpError(401, "signed-out");
  return user;
}

/** The account's recent daily attempts, so a browser that just signed in shows its streak and week. */
export async function accountHistory(db: Queryable, userId: string, today: string): Promise<HistoryAttempt[]> {
  const attempts = await userAttemptsSince(db, userId, addDays(today, 1 - ACCOUNT_RULES.historyDays));
  return attempts.map((attempt) => ({
    date: attempt.date,
    slot: attempt.slot,
    game: attempt.game as GameId,
    status: attempt.status,
    startedAt: attempt.startedAt,
    result: attempt.status === "finished" ? (attempt.result as ChallengeResult) : null,
  }));
}
