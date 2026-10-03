import type { Article, Avatar } from "@repo/shared";
import { botStarts, botsFor } from "@/lib/largada-bots";
import type { LargadaGridResponse, LargadaStart } from "@/lib/largada-types";
import { GHOST_COLORS, carColors, type CarColors } from "./Car";

/** One car of the race: a rival of the group with today's starts, the ghost, a bot, or the player. */
export interface Racer {
  key: string;
  name: string;
  /** Null for the ghost. */
  avatar: Avatar | null;
  /** For their place: "1º" or "1ª". */
  article: Article;
  colors: CarColors;
  /** Painted on the rear wing; the ghost has none. */
  number: number | null;
  crown: boolean;
  me: boolean;
  ghost: boolean;
  bot?: boolean;
  starts: LargadaStart[];
}

/** Lanes for everyone but the player, who always gets the last one. */
const RIVAL_LANES = 4;

/**
 * When bots race: "fill" completes the track (practice); "alone" only when
 * nobody else would (the daily challenge). The seed fixes their times.
 */
export interface BotRule {
  mode: "fill" | "alone";
  seed: string;
}

/** Who races, top to bottom: the rivals with a lane (or the ghost), the bots and the player last. */
export function raceField(grid: LargadaGridResponse | null, me: { userId: string | null; avatar: Avatar; article: Article }, bots?: BotRule): Racer[] {
  const field: Racer[] = [];
  for (const id of grid?.lanes ?? []) {
    const rival = grid?.rivals.find((one) => one.userId === id);
    if (!rival) continue;
    field.push({
      key: rival.userId,
      name: rival.username,
      avatar: rival.avatar,
      article: rival.article,
      colors: carColors(rival.avatar),
      number: field.length + 1,
      crown: rival.crown,
      me: false,
      ghost: false,
      starts: rival.starts,
    });
  }
  if (field.length === 0 && grid?.ghost) {
    field.push({ key: "ghost", name: grid.ghost.title, avatar: null, article: grid.ghost.article, colors: GHOST_COLORS, number: null, crown: false, me: false, ghost: true, starts: grid.ghost.starts });
  }
  if (bots && (bots.mode === "fill" || field.length === 0)) {
    for (const bot of botsFor(RIVAL_LANES - field.length)) {
      field.push({
        key: bot.key,
        name: bot.name,
        avatar: bot.avatar,
        article: bot.article,
        colors: carColors(bot.avatar),
        number: field.filter((racer) => !racer.ghost).length + 1,
        crown: false,
        me: false,
        ghost: false,
        bot: true,
        starts: botStarts(bot, bots.seed),
      });
    }
  }
  field.push({
    key: "me",
    name: "Vos",
    avatar: me.avatar,
    article: me.article,
    colors: carColors(me.avatar),
    number: field.filter((racer) => !racer.ghost).length + 1,
    crown: grid?.crown !== null && grid?.crown?.userId === me.userId,
    me: true,
    ghost: false,
    starts: [],
  });
  return field;
}
