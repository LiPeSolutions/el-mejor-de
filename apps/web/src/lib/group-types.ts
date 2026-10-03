import type { Article, Avatar, GroupColor, GroupEmblem } from "@repo/shared";

/** What the groups API answers (apps/web/src/server/groups.ts). */

export interface GroupPlayer {
  userId: string;
  username: string;
  avatar: Avatar;
  article: Article;
}

/** One member in the ranking of the day or of the week. */
export interface StandingRow extends GroupPlayer {
  /** Null when they haven't played in that period: they go last. */
  position: number | null;
  score: number;
  daysPlayed: number;
  isMe: boolean;
}

export interface GroupWeek {
  /** Monday, YYYY-MM-DD. */
  start: string;
  /** "Semana 41". */
  number: number;
  /** When it closes: Monday at 00:00, Argentina time (ISO). */
  closesAt: string;
  /** False on the weeks before the first crown (5/10/2026). */
  hasCrown: boolean;
  /** The Monday the first crown is given, YYYY-MM-DD. */
  firstCrownOn: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  emblem: GroupEmblem;
  color: GroupColor;
  memberCount: number;
  isOwner: boolean;
  /** Who leads the week, and so has the crown. Null while nobody has points. */
  leader: (GroupPlayer & { score: number }) | null;
  me: { position: number | null; score: number };
  /** When I lead, how much I'm ahead of #2; otherwise, how far I am from the leader. */
  gap: number | null;
}

export interface GroupsResponse {
  groups: GroupSummary[];
  week: GroupWeek;
  limits: { maxGroups: number };
}

export interface GroupInvite {
  code: string;
  /** ISO. */
  expiresAt: string;
  expired: boolean;
}

export interface GroupDetail {
  id: string;
  name: string;
  emblem: GroupEmblem;
  color: GroupColor;
  memberCount: number;
  maxMembers: number;
  ownerId: string;
  isOwner: boolean;
  invite: GroupInvite;
}

export interface CrownView {
  id: string;
  /** Monday, YYYY-MM-DD. */
  weekStart: string;
  weekNumber: number;
  groupId: string | null;
  /** The group's name that week. */
  title: string;
  emblem: GroupEmblem | null;
  color: GroupColor | null;
  winner: GroupPlayer;
  score: number;
  daysPlayed: number;
  /** How many played that week. */
  players: number;
  runnerUp: { username: string; score: number } | null;
  seen: boolean;
  /** The winner's nth crown ("Tu 3ª corona"). */
  nth: number;
}

export interface GroupDetailResponse {
  group: GroupDetail;
  week: GroupWeek;
  today: string;
  standings: { week: StandingRow[]; today: StandingRow[] };
  /** The last week's crown, once decided. */
  lastCrown: CrownView | null;
}

export interface GroupCreatedResponse {
  group: GroupDetail;
}

export interface InvitePreview {
  code: string;
  name: string;
  emblem: GroupEmblem;
  color: GroupColor;
  memberCount: number;
  maxMembers: number;
  /** "member": the signed-in player is already in it. */
  status: "open" | "expired" | "full" | "member";
  /** Only for members, to go to the group. */
  groupId: string | null;
}

export interface JoinResponse {
  groupId: string;
}

export interface CrownsResponse {
  /** Newest first. */
  crowns: CrownView[];
}
