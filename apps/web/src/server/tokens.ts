import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { challengeSecret } from "./secret";

/** Compact signed tokens (payload.signature, base64url) so the API can stay stateless. */
function signature(body: string): string {
  return createHmac("sha256", `${challengeSecret()}:tokens`).update(body).digest("base64url");
}

export function signToken(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signature(body)}`;
}

export function readToken<T>(token: unknown): T | null {
  if (typeof token !== "string" || token.length > 4000) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(signature(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
