import "server-only";
import type { Queryable, User } from "@repo/db";
import { toGameDate } from "@repo/shared";
import { cookies } from "next/headers";
import { readSession, type RequestContext } from "./accounts";
import { database } from "./db";
import { deviceId } from "./device";
import { HttpError } from "./http";
import { clientIpHash } from "./request";

/** The signed-in browser's token. httpOnly: the page's JavaScript never sees it. */
const COOKIE = "emd_sesion";

export async function sessionToken(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

export async function setSessionCookie(token: string, expiresAt: number): Promise<void> {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** Accounts need the database: without one (local development, CI) they're off. */
export function accountsDatabase(): Queryable {
  const db = database();
  if (!db) throw new HttpError(503, "accounts-unavailable");
  return db;
}

/**
 * The account signed in on this request, or null. Only for route handlers:
 * it renews a session that's getting old and drops a cookie that no longer works.
 */
export async function currentUser(): Promise<User | null> {
  const db = database();
  const token = await sessionToken();
  if (!db || !token) return null;
  const session = await readSession(db, token, Date.now());
  if (!session) {
    await clearSessionCookie();
    return null;
  }
  if (session.renewedTo !== null) await setSessionCookie(token, session.renewedTo);
  return session.user;
}

export async function requestContext(request: Request): Promise<RequestContext> {
  const now = Date.now();
  return { deviceId: await deviceId(), ipHash: clientIpHash(request), now, today: toGameDate(new Date(now)) };
}
