import "server-only";
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/*
 * Password hashing with scrypt (Node's own, no native modules). Parameters
 * follow OWASP's equivalent of N=2^17: N=2^15, r=8, p=3, about 32 MiB and
 * 0.2 s per hash. They're stored with each hash, so they can grow later.
 */
const PARAMS = { N: 2 ** 15, r: 8, p: 3 } as const;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

function derive(password: string, salt: Buffer, params: { N: number; r: number; p: number }): Promise<Buffer> {
  const options: ScryptOptions = { ...params, maxmem: 256 * params.N * params.r };
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFC"), salt, KEY_LENGTH, options, (error, key) => (error ? reject(error) : resolve(key))),
  );
}

/** "scrypt$N$r$p$salt$hash", base64url. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

function parse(stored: string) {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  const params = { N: Number(n), r: Number(r), p: Number(p) };
  if (scheme !== "scrypt" || !salt || !hash || !Object.values(params).every((v) => Number.isInteger(v) && v > 0)) return null;
  return { params, salt: Buffer.from(salt, "base64url"), hash: Buffer.from(hash, "base64url") };
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parse(stored);
  if (!parsed) return false;
  const key = await derive(password, parsed.salt, parsed.params);
  return key.length === parsed.hash.length && timingSafeEqual(key, parsed.hash);
}

/** Whether a hash was made with older parameters and should be redone at the next sign-in. */
export function needsRehash(stored: string): boolean {
  const parsed = parse(stored);
  return !parsed || parsed.params.N < PARAMS.N || parsed.params.r !== PARAMS.r || parsed.params.p < PARAMS.p;
}

/** For unknown apodos: comparing against this takes as long as a real check. */
export const DUMMY_HASH = "scrypt$32768$8$3$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
