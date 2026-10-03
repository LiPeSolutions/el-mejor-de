import { LARGADA_RULES } from "@repo/games";
import type { Article, Avatar } from "@repo/shared";
import type { LargadaStart } from "./largada-types";

/*
 * Largada's bots (docs/PLAN.md §7): they fill the track in practice, and
 * race the daily challenge when nobody else did. Four characters, each with
 * its own pace: Rayo is the one to beat, Tortuga jumps a start now and then.
 * They don't count for anything: the score comes from the player's times.
 */

export interface Bot {
  key: string;
  name: string;
  article: Article;
  avatar: Avatar;
  /** Their usual reaction and how much it varies (about one standard deviation), in ms. */
  meanMs: number;
  spreadMs: number;
  /** How often they jump a start. */
  jumpChance: number;
}

/** In the order they take the lanes, top to bottom. */
export const BOTS: readonly Bot[] = [
  { key: "bot-rayo", name: "Rayo", article: "el", avatar: { species: "zorro", color: "dorado", accessory: "anteojos" }, meanMs: 212, spreadMs: 12, jumpChance: 0 },
  { key: "bot-chispa", name: "Chispa", article: "la", avatar: { species: "hornero", color: "coral", accessory: null }, meanMs: 243, spreadMs: 18, jumpChance: 0.03 },
  { key: "bot-turbo", name: "Turbo", article: "el", avatar: { species: "pinguino", color: "azul", accessory: null }, meanMs: 262, spreadMs: 22, jumpChance: 0.03 },
  { key: "bot-tortuga", name: "Tortuga", article: "la", avatar: { species: "carpincho", color: "verde", accessory: null }, meanMs: 305, spreadMs: 30, jumpChance: 0.1 },
];

/** Who comes when there's room for fewer: Rayo always, then the slow one, for contrast. */
const PREFERENCE = ["bot-rayo", "bot-tortuga", "bot-chispa", "bot-turbo"];

export function botsFor(count: number): Bot[] {
  const keys = PREFERENCE.slice(0, Math.max(0, count));
  return BOTS.filter((bot) => keys.includes(bot.key));
}

/** A small seeded generator (mulberry32 over an FNV-1a hash): the same seed, the same race. */
function seeded(seed: string): () => number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Never faster than a person could be. */
const FASTEST_MS = LARGADA_RULES.minHumanReactionMs + 60;

/** A bot's starts in one race: around its pace, bell-shaped. */
export function botStarts(bot: Bot, seed: string, count: number = LARGADA_RULES.starts): LargadaStart[] {
  const random = seeded(`${seed}:${bot.key}`);
  return Array.from({ length: count }, () => {
    if (random() < bot.jumpChance) return { reactionMs: null, falseStart: true };
    // Three uniforms make a bell; this one has a standard deviation of about 1.
    const noise = (random() + random() + random() - 1.5) * 2;
    return { reactionMs: Math.max(FASTEST_MS, Math.round(bot.meanMs + noise * bot.spreadMs)), falseStart: false };
  });
}
