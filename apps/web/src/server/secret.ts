import "server-only";

// Only for local development and previews: the repo is public, so this is not secret.
const DEV_SECRET = "dev-only-challenge-secret-change-me-0123456789";

/**
 * Secret that derives every challenge seed and signs every attempt token.
 * Required in production: without it, anyone could compute tomorrow's challenges.
 */
export function challengeSecret(): string {
  const secret = process.env.CHALLENGE_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("CHALLENGE_SECRET is missing or shorter than 32 characters");
  }
  return DEV_SECRET;
}
