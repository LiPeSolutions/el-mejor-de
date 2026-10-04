import { createRng } from './rng';
import type { GameRngs } from './types';

export * from './types';
export * from './rng';
export * from './text';
export * from './lineup';
export * from './games/seven-letters';
export * from './games/five-questions';
export * from './games/largada';
export * from './games/reflexes';
export * from './games/sequence';
export * from './battles';

/** Random generators for free play (practice), which never counts for rankings. */
export function practiceRngs(seed: string = globalThis.crypto.randomUUID()): GameRngs {
  return { shared: createRng(`${seed}:shared`), player: createRng(`${seed}:player`) };
}
