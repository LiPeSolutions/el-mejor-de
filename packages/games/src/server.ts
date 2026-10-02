/** Server-only helpers: they need the secret that keeps future challenges unpredictable. */
import { createHmac } from 'node:crypto';
import type { GameDate } from '@repo/shared';
import { createRng } from './rng';
import type { GameRngs } from './types';

const MIN_SECRET_LENGTH = 32;

/** HMAC-SHA256 of the parts. Without the secret nobody can compute tomorrow's challenges. */
export function deriveSeed(secret: string, ...parts: string[]): string {
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`The seed secret needs at least ${MIN_SECRET_LENGTH} characters`);
  }
  return createHmac('sha256', secret).update(JSON.stringify(parts)).digest('hex');
}

/** Random generators for one player's attempt at one daily challenge slot. */
export function dailyRngs(secret: string, date: GameDate, slot: number, userId: string): GameRngs {
  return {
    shared: createRng(deriveSeed(secret, 'daily', date, String(slot))),
    player: createRng(deriveSeed(secret, 'daily', date, String(slot), 'player', userId)),
  };
}
