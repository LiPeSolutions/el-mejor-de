import "server-only";
import { randomInt } from "node:crypto";
import {
  countCodeFailures,
  countGroupsCreatedSince,
  createGroup,
  findGroupByInvite,
  getGroup,
  getMembership,
  groupMemberScores,
  joinGroup,
  latestGroupCrown,
  leaveGroup,
  markCrownSeen,
  markGroupCrowned,
  recordCodeFailure,
  recordGroupCrown,
  removeMember,
  replaceInvite,
  updateGroup,
  userCrowns,
  userGroups,
  type Group,
  type MemberScores,
  type Queryable,
  type User,
} from "@repo/db";
import {
  DEFAULT_AVATAR,
  GROUP_COLORS,
  GROUP_EMBLEMS,
  GROUP_RULES,
  INVITE_ALPHABET,
  INVITE_SUFFIX_LENGTH,
  addDays,
  checkGroupName,
  crownHolder,
  dailyStanding,
  gameDayStart,
  inviteKey,
  invitePrefix,
  parseAvatar,
  rankStandings,
  toGameDate,
  weekStart,
  weeklyStanding,
  type GroupColor,
  type GroupEmblem,
  type Standing,
} from "@repo/shared";
import type {
  CrownView,
  GroupDetail,
  GroupDetailResponse,
  GroupPlayer,
  GroupSummary,
  GroupsResponse,
  InvitePreview,
  StandingRow,
} from "@/lib/group-types";
import { HttpError } from "./http";
import { crownViewOf, settlePlaceCrownsOf } from "./places";
import { FIRST_CROWN_WEEK, MAX_WEEKS_PER_SETTLE, lastClosedWeek, weekInfo } from "./weeks";

/*
 * Private groups (docs/PLAN.md §8): who can do what, their rankings and
 * their weekly crown. The crown is live: whoever leads the week has it. A
 * week is decided the first time someone looks at the group after it
 * closes (see weeks.ts).
 */

export { CLOSE_GRACE_MS, FIRST_CROWN_WEEK, lastClosedWeek, weekInfo } from "./weeks";

const DAY_MS = 24 * 60 * 60 * 1000;
const CODE_FAILURE_LIMITS = { windowMs: 60 * 60_000, perAccount: 10, perConnection: 30 } as const;

export interface GroupContext {
  now: number;
  /** Keyed hash of the connection's IP, or null when unknown. */
  ipHash: string | null;
}

/* ───────────── Rankings ───────────── */

function player(member: Pick<MemberScores, "userId" | "username" | "avatar" | "article">): GroupPlayer {
  return { userId: member.userId, username: member.username, avatar: parseAvatar(member.avatar) ?? DEFAULT_AVATAR, article: member.article };
}

/**
 * The ranking of a period: who played, by points (a tie goes to whoever got
 * there first), and then who didn't, by apodo.
 */
function rankRows(members: readonly MemberScores[], standingOf: (member: MemberScores) => Standing, meId: string): StandingRow[] {
  const byId = new Map(members.map((member) => [member.userId, member]));
  const standings = members.map(standingOf);
  const ranked = rankStandings(standings.filter((standing) => standing.daysPlayed > 0));
  const idle = standings
    .filter((standing) => standing.daysPlayed === 0)
    .sort((a, b) => byId.get(a.userId)!.username.localeCompare(byId.get(b.userId)!.username, "es"));
  return [
    ...ranked.map((standing) => ({ standing, position: standing.position as number | null })),
    ...idle.map((standing) => ({ standing, position: null })),
  ].map(({ standing, position }) => ({
    ...player(byId.get(standing.userId)!),
    position,
    score: standing.score,
    daysPlayed: standing.daysPlayed,
    isMe: standing.userId === meId,
  }));
}

function weekRows(members: readonly MemberScores[], meId: string): StandingRow[] {
  return rankRows(members, (member) => weeklyStanding(member.userId, member.challenges), meId);
}

function todayRows(members: readonly MemberScores[], meId: string, today: string): StandingRow[] {
  return rankRows(members, (member) => dailyStanding(member.userId, member.challenges.filter((c) => c.date === today)), meId);
}

/** The players' week in each of these groups. */
async function weekScores(db: Queryable, groupIds: readonly string[], now: number): Promise<Map<string, MemberScores[]>> {
  const today = toGameDate(new Date(now));
  const members = await groupMemberScores(db, { groupIds, from: weekStart(today), to: today });
  const byGroup = new Map<string, MemberScores[]>(groupIds.map((id) => [id, []]));
  for (const member of members) byGroup.get(member.groupId)?.push(member);
  return byGroup;
}

function summary(group: Group, members: readonly MemberScores[], user: User): GroupSummary {
  const rows = weekRows(members, user.id);
  const leader = rows[0] && rows[0].score > 0 ? rows[0] : null;
  const me = rows.find((row) => row.isMe);
  const second = rows[1];
  const gap = !leader || !me?.position ? null : me.position === 1 ? (second?.position ? leader.score - second.score : null) : leader.score - me.score;
  return {
    id: group.id,
    name: group.name,
    emblem: group.emblem as GroupEmblem,
    color: group.color as GroupColor,
    memberCount: group.memberCount,
    isOwner: group.ownerId === user.id,
    leader: leader ? { userId: leader.userId, username: leader.username, avatar: leader.avatar, article: leader.article, score: leader.score } : null,
    me: { position: me?.position ?? null, score: me?.score ?? 0 },
    gap,
  };
}

function detail(group: Group, user: User, now: number): GroupDetail {
  return {
    id: group.id,
    name: group.name,
    emblem: group.emblem as GroupEmblem,
    color: group.color as GroupColor,
    memberCount: group.memberCount,
    maxMembers: GROUP_RULES.maxMembers,
    ownerId: group.ownerId,
    isOwner: group.ownerId === user.id,
    invite: { code: group.inviteCode, expiresAt: new Date(group.inviteExpiresAt).toISOString(), expired: group.inviteExpiresAt <= now },
  };
}

/** A group's week as its ranking shows it, and who has the live crown (for Largada's grid). */
export async function groupWeek(db: Queryable, group: Group, user: User, now: number): Promise<{ rows: StandingRow[]; holderId: string | null }> {
  const members = (await weekScores(db, [group.id], now)).get(group.id) ?? [];
  const rows = weekRows(members, user.id);
  const leader = rows[0] && rows[0].score > 0 ? rows[0] : null;
  return { rows, holderId: weekInfo(now).hasCrown && leader ? leader.userId : null };
}

/* ───────────── Crowns ───────────── */

/** Decides the crown of one closed week: whoever led when it closed, among the members of that moment. */
async function decideWeek(db: Queryable, group: Group, week: string): Promise<void> {
  const closedAt = gameDayStart(addDays(week, 7)).getTime();
  const members = await groupMemberScores(db, { groupIds: [group.id], from: week, to: addDays(week, 6), asOf: closedAt });
  const ranked = rankStandings(members.map((member) => weeklyStanding(member.userId, member.challenges)).filter((s) => s.daysPlayed > 0));
  const holder = crownHolder(ranked);
  if (!holder) return;
  const runnerUp = ranked[1] && ranked[1].score > 0 ? ranked[1] : null;
  await recordGroupCrown(db, {
    groupId: group.id,
    weekStart: week,
    userId: holder.userId,
    score: holder.score,
    daysPlayed: holder.daysPlayed,
    players: ranked.length,
    runnerUpId: runnerUp?.userId ?? null,
    runnerUpScore: runnerUp?.score ?? null,
    title: group.name,
  });
}

/** Decides the closed weeks these groups still owe. Safe to run twice: a week's crown is recorded once. */
export async function settleCrowns(db: Queryable, groups: readonly Group[], now: number): Promise<void> {
  const last = lastClosedWeek(now);
  if (!last) return;
  for (const group of groups) {
    if (group.crownedThrough && group.crownedThrough >= last) continue;
    const created = weekStart(toGameDate(new Date(group.createdAt)));
    const next = group.crownedThrough ? addDays(group.crownedThrough, 7) : FIRST_CROWN_WEEK;
    let week = [FIRST_CROWN_WEEK, created, next].reduce((a, b) => (a > b ? a : b));
    for (let decided = 0; week <= last && decided < MAX_WEEKS_PER_SETTLE; decided += 1, week = addDays(week, 7)) {
      await decideWeek(db, group, week);
      await markGroupCrowned(db, group.id, week);
    }
    // Created after the last closed week: nothing to decide until the next one.
    if (week > last) await markGroupCrowned(db, group.id, last);
  }
}


/** A player's crowns, newest first, after deciding the weeks their groups owe. */
export async function crownsOf(db: Queryable, user: User, now: number): Promise<CrownView[]> {
  await settleCrowns(db, await userGroups(db, user.id), now);
  await settlePlaceCrownsOf(db, user, now);
  const crowns = await userCrowns(db, user.id);
  return crowns.map((crown, index) => crownViewOf(crown, crowns.length - index));
}

export async function markCelebrationSeen(db: Queryable, user: User, crownId: string): Promise<void> {
  await markCrownSeen(db, crownId, user.id);
}

/* ───────────── Groups ───────────── */

function newInviteCode(name: string): string {
  let suffix = "";
  for (let i = 0; i < INVITE_SUFFIX_LENGTH; i += 1) suffix += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  return `${invitePrefix(name)}-${suffix}`;
}

/** Tries a few random codes in case one is taken. */
async function withNewCode<T>(name: string, attempt: (code: string) => Promise<T | null>): Promise<T> {
  for (let tries = 0; tries < 5; tries += 1) {
    const result = await attempt(newInviteCode(name));
    if (result) return result;
  }
  throw new Error("no free invitation code after 5 tries");
}

function parseName(value: unknown): string {
  const checked = checkGroupName(typeof value === "string" ? value : "");
  if (!checked.ok) throw new HttpError(400, "invalid-group-name", { problem: checked.problem });
  return checked.name;
}

function parseEmblem(value: unknown): GroupEmblem {
  if (!GROUP_EMBLEMS.includes(value as GroupEmblem)) throw new HttpError(400, "invalid-emblem");
  return value as GroupEmblem;
}

function parseColor(value: unknown): GroupColor {
  if (!GROUP_COLORS.includes(value as GroupColor)) throw new HttpError(400, "invalid-color");
  return value as GroupColor;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A group's id from a URL or a request; anything else is a group that doesn't exist. */
export function parseGroupId(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new HttpError(404, "group-not-found");
  return value;
}

/** The group, if this player is in it; otherwise 404, so groups don't show up to outsiders. */
async function memberGroup(db: Queryable, groupId: string, user: User): Promise<Group> {
  const membership = await getMembership(db, groupId, user.id);
  const group = membership && membership.leftAt === null ? await getGroup(db, groupId) : null;
  if (!group) throw new HttpError(404, "group-not-found");
  return group;
}

async function ownedGroup(db: Queryable, groupId: string, user: User): Promise<Group> {
  const group = await memberGroup(db, groupId, user);
  if (group.ownerId !== user.id) throw new HttpError(403, "not-the-owner");
  return group;
}

export async function listGroups(db: Queryable, user: User, context: GroupContext): Promise<GroupsResponse> {
  const groups = await userGroups(db, user.id);
  await settleCrowns(db, groups, context.now);
  const scores = await weekScores(db, groups.map((group) => group.id), context.now);
  return {
    groups: groups.map((group) => summary(group, scores.get(group.id) ?? [], user)),
    week: weekInfo(context.now),
    limits: { maxGroups: GROUP_RULES.maxGroupsPerPlayer },
  };
}

export async function groupDetail(db: Queryable, user: User, groupId: string, context: GroupContext): Promise<GroupDetailResponse> {
  const group = await memberGroup(db, groupId, user);
  await settleCrowns(db, [group], context.now);
  const today = toGameDate(new Date(context.now));
  const members = (await weekScores(db, [group.id], context.now)).get(group.id) ?? [];
  const last = await latestGroupCrown(db, group.id);
  return {
    group: detail(group, user, context.now),
    week: weekInfo(context.now),
    today,
    standings: { week: weekRows(members, user.id), today: todayRows(members, user.id, today) },
    lastCrown: last ? crownViewOf(last, 0) : null,
  };
}

export interface GroupInput {
  name?: unknown;
  emblem?: unknown;
  color?: unknown;
}

export async function newGroup(db: Queryable, user: User, input: GroupInput, context: GroupContext): Promise<GroupDetail> {
  const name = parseName(input.name);
  const emblem = parseEmblem(input.emblem);
  const color = parseColor(input.color);
  if ((await userGroups(db, user.id)).length >= GROUP_RULES.maxGroupsPerPlayer) throw new HttpError(409, "too-many-groups");
  if ((await countGroupsCreatedSince(db, user.id, context.now - DAY_MS)) >= GROUP_RULES.newGroupsPerDay) {
    throw new HttpError(429, "too-many-new-groups");
  }
  const expiresAt = context.now + GROUP_RULES.inviteDays * DAY_MS;
  const group = await withNewCode(name, (inviteCode) => createGroup(db, { ownerId: user.id, name, emblem, color, inviteCode, inviteExpiresAt: expiresAt, at: context.now }));
  return detail(group, user, context.now);
}

export async function editGroup(db: Queryable, user: User, groupId: string, input: GroupInput, context: GroupContext): Promise<GroupDetail> {
  await ownedGroup(db, groupId, user);
  const changes = {
    name: input.name === undefined ? undefined : parseName(input.name),
    emblem: input.emblem === undefined ? undefined : parseEmblem(input.emblem),
    color: input.color === undefined ? undefined : parseColor(input.color),
  };
  const group = await updateGroup(db, groupId, changes);
  if (!group) throw new HttpError(404, "group-not-found");
  return detail(group, user, context.now);
}

/**
 * A new invitation link. While the current one works only the owner can
 * replace it (that turns the old link off); once it expired, any member can.
 */
export async function renewInvite(db: Queryable, user: User, groupId: string, context: GroupContext): Promise<GroupDetail> {
  const group = await memberGroup(db, groupId, user);
  if (group.ownerId !== user.id && group.inviteExpiresAt > context.now) throw new HttpError(403, "not-the-owner");
  const expiresAt = context.now + GROUP_RULES.inviteDays * DAY_MS;
  const renewed = await withNewCode(group.name, (code) => replaceInvite(db, group.id, { code, expiresAt, at: context.now }));
  return detail(renewed, user, context.now);
}

export async function leave(db: Queryable, user: User, groupId: string, context: GroupContext): Promise<void> {
  await memberGroup(db, groupId, user);
  await leaveGroup(db, groupId, user.id, context.now);
}

export async function removeFromGroup(db: Queryable, user: User, groupId: string, memberId: string, context: GroupContext): Promise<void> {
  await ownedGroup(db, groupId, user);
  if (memberId === user.id) throw new HttpError(400, "cannot-remove-yourself");
  if (!(await removeMember(db, groupId, memberId, context.now))) throw new HttpError(404, "member-not-found");
}

/* ───────────── Invitations ───────────── */

/** Stops guessing codes: too many wrong ones per account or connection, and it waits. */
async function assertCodeTriesLeft(db: Queryable, user: User | null, context: GroupContext): Promise<void> {
  const since = context.now - CODE_FAILURE_LIMITS.windowMs;
  const tooMany =
    (user !== null && (await countCodeFailures(db, { userId: user.id }, since)) >= CODE_FAILURE_LIMITS.perAccount) ||
    (context.ipHash !== null && (await countCodeFailures(db, { ipHash: context.ipHash }, since)) >= CODE_FAILURE_LIMITS.perConnection);
  if (tooMany) throw new HttpError(429, "too-many-codes");
}

async function groupByCode(db: Queryable, user: User | null, code: string, context: GroupContext): Promise<Group> {
  await assertCodeTriesLeft(db, user, context);
  const key = inviteKey(code);
  const group = key.length >= 4 && key.length <= 20 ? await findGroupByInvite(db, key) : null;
  if (!group) {
    await recordCodeFailure(db, { userId: user?.id ?? null, ipHash: context.ipHash, at: context.now });
    throw new HttpError(404, "invite-not-found");
  }
  return group;
}

/** What the invitation page shows. It works without an account. */
export async function previewInvite(db: Queryable, user: User | null, code: string, context: GroupContext): Promise<InvitePreview> {
  const group = await groupByCode(db, user, code, context);
  const membership = user ? await getMembership(db, group.id, user.id) : null;
  const isMember = membership !== null && membership.leftAt === null;
  return {
    code: group.inviteCode,
    name: group.name,
    emblem: group.emblem as GroupEmblem,
    color: group.color as GroupColor,
    memberCount: group.memberCount,
    maxMembers: GROUP_RULES.maxMembers,
    status: isMember ? "member" : group.inviteExpiresAt <= context.now ? "expired" : group.memberCount >= GROUP_RULES.maxMembers ? "full" : "open",
    groupId: isMember ? group.id : null,
  };
}

export async function joinWithCode(db: Queryable, user: User, code: string, context: GroupContext): Promise<{ groupId: string }> {
  const group = await groupByCode(db, user, code, context);
  const mine = await userGroups(db, user.id);
  if (mine.some((one) => one.id === group.id)) return { groupId: group.id };
  if (group.inviteExpiresAt <= context.now) throw new HttpError(410, "invite-expired");
  if (mine.length >= GROUP_RULES.maxGroupsPerPlayer) throw new HttpError(409, "too-many-groups");
  const outcome = await joinGroup(db, { groupId: group.id, userId: user.id, maxMembers: GROUP_RULES.maxMembers, at: context.now });
  if (outcome === "full") throw new HttpError(409, "group-full");
  if (outcome === "removed") throw new HttpError(403, "removed-from-group");
  return { groupId: group.id };
}
