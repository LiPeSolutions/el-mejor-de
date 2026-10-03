import "server-only";
import { createHmac } from "node:crypto";
import { HttpError } from "./http";
import { challengeSecret } from "./secret";

/**
 * The connection, for rate limits: a keyed hash of the IP, so the IP itself is
 * never stored. Vercel sets x-forwarded-for and doesn't let clients forge it.
 */
export function clientIpHash(request: Request): string | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim();
  if (!ip) return null;
  return createHmac("sha256", `${challengeSecret()}:ip`).update(ip).digest("base64url").slice(0, 22);
}

/** Refuses requests sent by other sites (on top of the SameSite cookies). */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    // An unreadable Origin counts as foreign.
  }
  if (originHost !== host) throw new HttpError(403, "cross-origin");
}
