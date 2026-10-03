import "server-only";
import { bestLargadaIn, getLocality, largadaRaces, userGroups, type LargadaRace, type Queryable, type User } from "@repo/db";
import { COUNTRY_ID, DEFAULT_AVATAR, parseAvatar, toGameDate } from "@repo/shared";
import type { GroupPlayer, StandingRow } from "@/lib/group-types";
import { startsOf } from "@/lib/largada";
import type { LargadaGhost, LargadaGridResponse, LargadaRacer } from "@/lib/largada-types";
import { groupWeek } from "./groups";
import { weekInfo } from "./weeks";

/*
 * Largada's grid (docs/PLAN.md §7): you race against the times your group
 * did today, a lane each, up to five with you. Without a group, or when
 * nobody raced yet, against the best of the day of your locality.
 */

/** Lanes for rivals; the player's is always the last one. */
export const MAX_RIVAL_LANES = 4;

function averageOf(result: unknown): number | null {
  const value = (result as { averageMs?: unknown } | null)?.averageMs;
  return typeof value === "number" ? value : null;
}

const player = (row: StandingRow): GroupPlayer => ({ userId: row.userId, username: row.username, avatar: row.avatar, article: row.article });

function racer(race: LargadaRace, crownId: string | null): LargadaRacer {
  return {
    userId: race.userId,
    username: race.username,
    avatar: parseAvatar(race.avatar) ?? DEFAULT_AVATAR,
    article: race.article,
    crown: race.userId === crownId,
    starts: startsOf(race.result),
    score: race.score,
    averageMs: averageOf(race.result),
    at: race.finishedAt,
  };
}

/**
 * Who gets a lane when more than four raced: who has the crown, the ones
 * right above and right below the player in the week, then the fastest of
 * today. They race in the week's order.
 */
export function pickLanes(rivals: readonly LargadaRacer[], weekOrder: readonly string[], meId: string, crownId: string | null): string[] {
  if (rivals.length <= MAX_RIVAL_LANES) return rivals.map((rival) => rival.userId);
  const raced = new Set(rivals.map((rival) => rival.userId));
  const picked: string[] = [];
  const pick = (id: string | undefined | null) => {
    if (id && raced.has(id) && !picked.includes(id) && picked.length < MAX_RIVAL_LANES) picked.push(id);
  };
  pick(crownId);
  const mine = weekOrder.indexOf(meId);
  if (mine !== -1) {
    pick(weekOrder.slice(0, mine).reverse().find((id) => raced.has(id)));
    pick(weekOrder.slice(mine + 1).find((id) => raced.has(id)));
  }
  for (const rival of [...rivals].sort((a, b) => b.score - a.score || a.at - b.at)) pick(rival.userId);
  return picked.sort((a, b) => weekOrder.indexOf(a) - weekOrder.indexOf(b));
}

/** The best of the day in the player's locality (checked with the GPS) or else the country. */
async function ghostFor(db: Queryable, user: User | null, date: string): Promise<LargadaGhost | null> {
  const locality = user?.placeId && user.placeVerifiedAt !== null ? await getLocality(db, user.placeId) : null;
  const except = user?.id ?? null;
  const local = locality ? await bestLargadaIn(db, { placeId: locality.id, date, exceptUserId: except }) : null;
  const best = local ?? (await bestLargadaIn(db, { placeId: COUNTRY_ID, date, exceptUserId: except }));
  if (!best) return null;
  const where = local && locality ? locality.name : "Argentina";
  return {
    title: `${best.article === "la" ? "La" : "El"} mejor de ${where}`,
    avatar: parseAvatar(best.avatar) ?? DEFAULT_AVATAR,
    article: best.article,
    starts: startsOf(best.result),
    score: best.score,
  };
}

/** The grid of today's Largada: against `groupId` (or the first group), or against the ghost. */
export async function largadaGrid(db: Queryable, user: User | null, groupId: string | null, now: number): Promise<LargadaGridResponse> {
  const today = toGameDate(new Date(now));
  const info = weekInfo(now);
  const base = {
    groups: [],
    group: null,
    rivals: [],
    lanes: [],
    waiting: [],
    me: null,
    week: { start: info.start, hasCrown: info.hasCrown },
    crown: null,
    meWeek: { position: null, lead: null },
  } satisfies Omit<LargadaGridResponse, "ghost">;
  if (!user) return { ...base, ghost: await ghostFor(db, null, today) };

  const groups = await userGroups(db, user.id);
  const list = groups.map(({ id, name }) => ({ id, name }));
  const group = groups.find((one) => one.id === groupId) ?? groups[0];
  if (!group) return { ...base, groups: list, ghost: await ghostFor(db, user, today) };

  const { rows, holderId } = await groupWeek(db, group, user, now);
  const races = new Map((await largadaRaces(db, { userIds: rows.map((row) => row.userId), date: today })).map((race) => [race.userId, race]));
  const rivals = rows.flatMap((row) => {
    const race = races.get(row.userId);
    return !row.isMe && race ? [racer(race, holderId)] : [];
  });
  const mine = races.get(user.id);
  const me = rows.find((row) => row.isMe);
  const second = rows[1];
  const holder = rows.find((row) => row.userId === holderId);
  return {
    ...base,
    groups: list,
    group: { id: group.id, name: group.name },
    rivals,
    lanes: pickLanes(rivals, rows.map((row) => row.userId), user.id, holderId),
    waiting: rows.filter((row) => !row.isMe && !races.has(row.userId)).map(player),
    me: mine ? racer(mine, holderId) : null,
    ghost: rivals.length === 0 ? await ghostFor(db, user, today) : null,
    crown: holder ? { userId: holder.userId, username: holder.username } : null,
    meWeek: { position: me?.position ?? null, lead: me?.position === 1 && second?.position ? me.score - second.score : null },
  };
}
