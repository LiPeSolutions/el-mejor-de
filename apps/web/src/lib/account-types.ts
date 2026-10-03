import type { GameId } from "@repo/games";
import type { Article, Avatar } from "@repo/shared";
import type { ChallengeResult } from "./challenge-types";

/** What the browser knows about the signed-in account. */
export interface PublicAccount {
  id: string;
  username: string;
  avatar: Avatar;
  article: Article;
  /** The locality (in the city, the barrio) where they compete. */
  placeId: string | null;
  placeName: string | null;
  /** The GPS confirmed it: they're in its ranking. */
  placeVerified: boolean;
  googleLinked: boolean;
}

/** One of the account's daily attempts, to fill in a browser that just signed in. */
export interface HistoryAttempt {
  date: string;
  slot: number;
  game: GameId;
  status: "started" | "finished";
  startedAt: number;
  result: ChallengeResult | null;
}

export interface AccountResponse {
  account: PublicAccount | null;
  /** Only when asked for (`?historial=1`) or right after signing in. */
  history?: HistoryAttempt[];
}

export type AvailabilityResponse = { available: true } | { available: false; problem: string };
