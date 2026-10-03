import type { PlaceLevel } from "@repo/shared";
import type { CrownView, GroupPlayer, GroupWeek } from "./group-types";

/** What the place and ranking API answers (apps/web/src/server/places.ts). */

export interface PlaceSummary {
  id: string;
  name: string;
  department: string;
  province: string;
}

export interface PlaceStatus {
  place: PlaceSummary | null;
  /** The GPS confirmed it at least once: the player is in its ranking. */
  verified: boolean;
  /** A check passed this week: the player can win its crowns. */
  verifiedThisWeek: boolean;
}

export interface NearbyResponse {
  places: PlaceSummary[];
}

export interface ChooseResponse {
  /** "verified": the GPS confirmed it; "too-far": saved, but you're not there now; "saved": chosen by hand. */
  result: "verified" | "too-far" | "saved";
  status: PlaceStatus;
}

export interface ProvincesResponse {
  provinces: { id: string; name: string }[];
}

export interface SearchResponse {
  places: PlaceSummary[];
}

export interface PlaceRankingRow extends GroupPlayer {
  position: number;
  score: number;
  daysPlayed: number;
  /** Where they played: shown in the rankings of the province and the country. */
  locality: string;
  isMe: boolean;
  /** Has the live crown. */
  holder: boolean;
  /** Can win the crown: a location check passed this week. */
  verifiedInWeek: boolean;
}

export interface RankingPeriod {
  players: number;
  rows: PlaceRankingRow[];
}

export interface RankingLevelTab {
  level: PlaceLevel;
  name: string;
}

export interface RankingResponse {
  /** "unverified": the ranking is shown, but the player isn't in it until the GPS confirms the place. */
  status: "ok" | "unverified" | "no-place";
  level: PlaceLevel;
  /** The place of this level: "Caballito", "Ciudad de Buenos Aires" (crown: "la Ciudad de Buenos Aires"). */
  place: { id: string; name: string; crownName: string } | null;
  levels: RankingLevelTab[];
  week: GroupWeek;
  today: string;
  periods: { today: RankingPeriod; week: RankingPeriod } | null;
  me: { verifiedThisWeek: boolean };
  /** Last week's crown of this place, once decided. */
  lastCrown: CrownView | null;
}

export interface LevelStanding {
  level: PlaceLevel;
  name: string;
  /** Null when the player hasn't played today. */
  position: number | null;
  score: number | null;
  players: number;
}

export interface TodayStandingsResponse {
  status: "ok" | "unverified" | "no-place";
  /** The locality (in the city, the barrio). */
  place: { id: string; name: string } | null;
  /** Locality, province and country. */
  levels: LevelStanding[];
  /** In the locality, the one right above the player, to say "A 70 de Tincho". */
  above: { username: string; score: number } | null;
}
