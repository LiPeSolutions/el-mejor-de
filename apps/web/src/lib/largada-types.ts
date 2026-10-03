import type { Article, Avatar } from "@repo/shared";
import type { GroupPlayer } from "./group-types";

/** What the Largada API answers (apps/web/src/server/largada.ts). */

/** One start: the reaction time, or a jumped start, or none (missed). */
export interface LargadaStart {
  reactionMs: number | null;
  falseStart: boolean;
}

export interface LargadaRacer extends GroupPlayer {
  /** Has the group's live crown. */
  crown: boolean;
  /** Today's three starts. */
  starts: LargadaStart[];
  score: number;
  averageMs: number | null;
  /** When they finished (epoch ms): on the podium, a tie goes to who raced first. */
  at: number;
}

/** Without rivals: the best of the day in the player's locality (or the country), as a gray car. */
export interface LargadaGhost {
  /** "El mejor de Chivilcoy". */
  title: string;
  avatar: Avatar;
  article: Article;
  starts: LargadaStart[];
  score: number;
}

export interface LargadaGridResponse {
  /** The player's groups, to race against another one. */
  groups: { id: string; name: string }[];
  /** The group of this grid: the one asked for, or else the first one. */
  group: { id: string; name: string } | null;
  /** Everyone in the group who raced today but the player, in the week's order (the crown first). */
  rivals: LargadaRacer[];
  /** The ones who get a lane: up to 4 of `rivals`. */
  lanes: string[];
  /** Members who haven't raced today. */
  waiting: GroupPlayer[];
  /** The player's own race today, once played. */
  me: LargadaRacer | null;
  ghost: LargadaGhost | null;
  week: { start: string; hasCrown: boolean };
  /** Who has the group's crown now. */
  crown: { userId: string; username: string } | null;
  /** The player's week in the group: position, and the lead over the second when first. */
  meWeek: { position: number | null; lead: number | null };
}
