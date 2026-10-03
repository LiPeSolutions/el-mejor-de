import type { Racer } from "@/components/largada/field";

/*
 * What a Largada was raced against, kept so its result can draw the finish
 * photo and tell whether the crown changed hands: the cars with the rivals'
 * starts as they were then, the group and who had its crown.
 */

export interface LargadaRace {
  date: string;
  /** Whose race it was (null without an account), so a shared phone doesn't mix them. */
  userId: string | null;
  field: Racer[];
  group: { id: string; name: string } | null;
  /** Who had the group's crown when the race started. */
  crown: { userId: string; username: string } | null;
}

const KEYS = { daily: "emd:largada:reto", practice: "emd:largada:practica" } as const;

export function saveLargadaRace(mode: keyof typeof KEYS, race: LargadaRace): void {
  try {
    window.localStorage.setItem(KEYS[mode], JSON.stringify(race));
  } catch {
    // Storage blocked: the result draws the photo from today's grid instead.
  }
}

/** The last race of `mode`, if it was this player's (and, for the daily challenge, of `date`). */
export function lastLargadaRace(mode: keyof typeof KEYS, userId: string | null, date?: string): LargadaRace | null {
  try {
    const race = JSON.parse(window.localStorage.getItem(KEYS[mode]) ?? "null") as LargadaRace | null;
    if (!race || !Array.isArray(race.field) || race.userId !== userId) return null;
    return date === undefined || race.date === date ? race : null;
  } catch {
    return null;
  }
}
