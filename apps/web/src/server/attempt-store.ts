import "server-only";
import { claimAttempt, finishAttempt, getAttempt, questionServedAt, type Attempt, type Queryable } from "@repo/db";
import type { Flag, GameId } from "@repo/games";
import { zeroResult } from "@/lib/challenge-results";
import type { ChallengeResult, PlayedAttempt } from "@/lib/challenge-types";
import { isExpired, type AttemptClaims } from "./challenges";
import { database } from "./db";
import { HttpError } from "./http";

/*
 * Daily attempts in the database: "one attempt per challenge" and "graded only
 * once" are enforced here. Without a database (local development, CI) these
 * functions do nothing and the API stays stateless.
 */

const ABANDONED: Flag = { code: "abandoned", severity: "low", detail: "closed with 0 after its time ran out" };

function played(attempt: Attempt): PlayedAttempt {
  return {
    date: attempt.date,
    slot: attempt.slot,
    status: attempt.status,
    result: attempt.status === "finished" ? (attempt.result as ChallengeResult) : null,
  };
}

async function closeWithZero(db: Queryable, attempt: { id: string; game: GameId }, now: number) {
  return finishAttempt(db, attempt.id, { finishedAt: now, score: 0, result: zeroResult(attempt.game), flags: [ABANDONED] });
}

/**
 * Takes today's slot for this player, or fails with 409 and what they already
 * played. `placeId` is the locality whose ranking it counts for: the
 * player's, once the GPS confirmed it.
 */
export async function recordStart(claims: AttemptClaims, now = Date.now(), placeId: string | null = null): Promise<void> {
  const db = database();
  if (!db || claims.mode !== "daily") return;
  const { created, attempt } = await claimAttempt(db, {
    id: claims.id,
    deviceId: claims.device ?? claims.user,
    userId: claims.account ?? null,
    date: claims.date,
    slot: claims.slot,
    game: claims.game,
    startedAt: claims.startedAt,
    placeId,
  });
  if (created) return;
  let current = attempt;
  // Left halfway and its time is over: it counts as played, with 0.
  if (current.status === "started" && isExpired({ game: current.game as GameId, startedAt: current.startedAt }, now)) {
    current = (await closeWithZero(db, { id: current.id, game: current.game as GameId }, now))?.attempt ?? current;
  }
  throw new HttpError(409, "already-played", { attempt: played(current) });
}

/** Saves the graded result once; if it was already graded, the saved result wins. */
export async function recordFinish(claims: AttemptClaims, graded: { result: ChallengeResult; flags: Flag[] }, now = Date.now()) {
  const db = database();
  if (!db || claims.mode !== "daily") return graded.result;
  const saved = await finishAttempt(db, claims.id, { finishedAt: now, score: graded.result.score, ...graded });
  // No row: the attempt began before the database was connected.
  if (!saved) return graded.result;
  return saved.attempt.result as ChallengeResult;
}

/** An attempt whose time ran out: record it as played, with 0. */
export async function recordExpired(claims: AttemptClaims, now = Date.now()): Promise<void> {
  const db = database();
  if (!db || claims.mode !== "daily") return;
  await closeWithZero(db, claims, now);
}

/** When a trivia question was first shown in this attempt, so asking again doesn't restart its clock. */
export async function questionShownAt(claims: AttemptClaims, index: number, now = Date.now()): Promise<number> {
  const db = database();
  if (!db || claims.mode !== "daily") return now;
  const servedAt = await questionServedAt(db, claims.id, index, now);
  // Null: finished, so no more questions. (No row at all means it began before the database.)
  if (servedAt === null) {
    if ((await getAttempt(db, claims.id))?.status === "finished") throw new HttpError(409, "finished");
    return now;
  }
  return servedAt;
}
