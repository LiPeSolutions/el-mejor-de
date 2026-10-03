import "server-only";
import {
  assignUnplacedAttempts,
  countLocationChecksSince,
  getLocality,
  getPlace,
  latestPlaceCrown,
  listProvinces,
  localitiesPlayed,
  markPlaceWeekDecided,
  nearbyLocalities,
  placeRanking,
  placeWeekLeaders,
  recordLocationCheck,
  recordPlaceCrown,
  searchLocalities,
  setUserPlace,
  undecidedPlaceWeeks,
  verifiedBetween,
  type Crown,
  type Locality,
  type PlaceStanding,
  type Queryable,
  type User,
} from "@repo/db";
import {
  CITY_GENERIC_LOCALITY_ID,
  DEFAULT_AVATAR,
  LOCATION_RULES,
  PLACE_LEVELS,
  addDays,
  checkPosition,
  distanceKm,
  isoWeekNumber,
  parseAvatar,
  placeNames,
  toGameDate,
  verifiableLocalities,
  verifiesLocality,
  weekStart,
  type PlaceLevel,
  type Point,
} from "@repo/shared";
import type { CrownView } from "@/lib/group-types";
import type {
  ChooseResponse,
  LevelStanding,
  NearbyResponse,
  PlaceRankingRow,
  PlaceStatus,
  PlaceSummary,
  ProvincesResponse,
  RankingLevelTab,
  RankingPeriod,
  RankingResponse,
  SearchResponse,
  TodayStandingsResponse,
} from "@/lib/place-types";
import { HttpError } from "./http";
import { recentClosedWeeks, weekBounds, weekInfo } from "./weeks";

/*
 * Competing for your place (docs/PLAN.md §4 and §5): choosing it, checking
 * with the GPS that you're there, and the rankings and crowns of your
 * locality (in the city, your barrio), your province and the country.
 * The position comes from the browser, is used to decide and is dropped:
 * only whether the check passed is stored.
 */

export interface PlaceContext {
  now: number;
  /** The connection's country, from Vercel (`x-vercel-ip-country`), or null when unknown. */
  ipCountry: string | null;
}

const HOUR_MS = 60 * 60 * 1000;

function summary(locality: Locality): PlaceSummary {
  return { id: locality.id, name: locality.name, department: locality.department, province: placeNames(locality.provinceId, locality.province).short };
}

function thisWeek(now: number) {
  const start = weekStart(toGameDate(new Date(now)));
  return { start, ...weekBounds(start) };
}

/** Where the player competes, and whether the GPS confirmed it (ever, and this week). */
export async function placeStatus(db: Queryable, user: User, now: number): Promise<PlaceStatus> {
  const locality = user.placeId ? await getLocality(db, user.placeId) : null;
  if (!locality) return { place: null, verified: false, verifiedThisWeek: false };
  const week = thisWeek(now);
  return {
    place: summary(locality),
    verified: user.placeVerifiedAt !== null,
    verifiedThisWeek: user.placeVerifiedAt !== null && (await verifiedBetween(db, user.id, locality.id, week.from, week.to)),
  };
}

export async function provinces(db: Queryable): Promise<ProvincesResponse> {
  const list = await listProvinces(db);
  return { provinces: list.map((province) => ({ id: province.id, name: placeNames(province.id, province.name).short })) };
}

/** Looking a locality up by name ("Buscarla a mano"). In the city, by barrio. */
export async function searchPlaces(db: Queryable, text: string, provinceId: string | null): Promise<SearchResponse> {
  const matches = await searchLocalities(db, text, { provinceId, limit: 12, exclude: [CITY_GENERIC_LOCALITY_ID] });
  return {
    places: matches.map((match) => ({
      id: match.id,
      name: match.name,
      department: match.department ?? "",
      province: placeNames(match.provinceId ?? "", match.province ?? "").short,
    })),
  };
}

/* ───────────── Checking the position ───────────── */

interface PositionInput {
  lat?: unknown;
  lon?: unknown;
  accuracy?: unknown;
}

function readPosition(input: PositionInput, context: PlaceContext): Point {
  // From outside the country the GPS can't be checked (and could be faked).
  if (context.ipCountry && context.ipCountry !== "AR") throw new HttpError(403, "outside-argentina");
  const position = checkPosition({ lat: input.lat, lon: input.lon, accuracy: input.accuracy });
  if (!position.ok) throw new HttpError(position.problem === "inaccurate" ? 422 : 400, position.problem === "inaccurate" ? "inaccurate-position" : "invalid-position");
  return position.point;
}

async function assertChecksLeft(db: Queryable, user: User, now: number): Promise<void> {
  if ((await countLocationChecksSince(db, user.id, now - HOUR_MS)) >= LOCATION_RULES.checksPerHour) throw new HttpError(429, "too-many-checks");
}

/** "Usar mi ubicación": the localities this position verifies, nearest first. Nothing is stored. */
export async function nearbyPlaces(db: Queryable, input: PositionInput, context: PlaceContext): Promise<NearbyResponse> {
  const point = readPosition(input, context);
  const choices = verifiableLocalities(await nearbyLocalities(db, point));
  return { places: choices.map(summary) };
}

/** Whether the position verifies the locality, recording the check. */
async function checkLocality(db: Queryable, user: User, locality: Locality, point: Point, now: number): Promise<boolean> {
  await assertChecksLeft(db, user, now);
  const nearby = await nearbyLocalities(db, point);
  const passed = verifiesLocality({ ...locality, km: distanceKm(point, locality) }, nearby);
  await recordLocationCheck(db, { userId: user.id, placeId: locality.id, result: passed ? "verified" : "too-far", at: now });
  return passed;
}

/** The GPS confirmed the place: it's verified, and this week's challenges played before go to its ranking. */
async function confirmPlace(db: Queryable, user: User, locality: Locality, now: number): Promise<void> {
  await setUserPlace(db, user.id, locality.id, now);
  await assignUnplacedAttempts(db, { userId: user.id, placeId: locality.id, fromDate: thisWeek(now).start });
}

async function statusAfter(db: Queryable, user: User, locality: Locality, verifiedAt: number | null, now: number): Promise<PlaceStatus> {
  return placeStatus(db, { ...user, placeId: locality.id, placeName: locality.name, placeVerifiedAt: verifiedAt }, now);
}

/**
 * Chooses the locality where the player competes. With a position, the GPS
 * checks it on the spot; without one, it's saved and checked later. It can
 * change whenever: what was played before stays in the old place.
 */
export async function choosePlace(db: Queryable, user: User, input: PositionInput & { placeId?: unknown }, context: PlaceContext): Promise<ChooseResponse> {
  const locality = typeof input.placeId === "string" && input.placeId !== CITY_GENERIC_LOCALITY_ID ? await getLocality(db, input.placeId) : null;
  if (!locality) throw new HttpError(404, "place-not-found");
  if (input.lat === undefined && input.lon === undefined) {
    // By hand: same place keeps its check; another one starts unverified.
    const keeps = user.placeId === locality.id ? user.placeVerifiedAt : null;
    await setUserPlace(db, user.id, locality.id, keeps);
    return { result: keeps ? "verified" : "saved", status: await statusAfter(db, user, locality, keeps, context.now) };
  }
  const point = readPosition(input, context);
  if (await checkLocality(db, user, locality, point, context.now)) {
    await confirmPlace(db, user, locality, context.now);
    return { result: "verified", status: await statusAfter(db, user, locality, context.now, context.now) };
  }
  const keeps = user.placeId === locality.id ? user.placeVerifiedAt : null;
  await setUserPlace(db, user.id, locality.id, keeps);
  return { result: "too-far", status: await statusAfter(db, user, locality, keeps, context.now) };
}

/** Checks the place the player already chose (first time, or this week's check for the crown). */
export async function verifyPlace(db: Queryable, user: User, input: PositionInput, context: PlaceContext): Promise<ChooseResponse> {
  if (!user.placeId) throw new HttpError(409, "no-place");
  return choosePlace(db, user, { ...input, placeId: user.placeId }, context);
}

/* ───────────── Rankings ───────────── */

const LEVEL_OF_KIND: Record<string, PlaceLevel> = { locality: "locality", province: "province", country: "country" };

/** The three places of a locality, from the barrio or town up to the country. */
function levelsOf(locality: Locality): Record<PlaceLevel, { id: string; name: string; crownName: string }> {
  const province = placeNames(locality.provinceId, locality.province);
  const country = placeNames(locality.countryId, "Argentina");
  return {
    locality: { id: locality.id, name: locality.name, crownName: locality.name },
    province: { id: locality.provinceId, name: province.short, crownName: province.crown },
    country: { id: locality.countryId, name: country.short, crownName: country.crown },
  };
}

function rankingRow(standing: PlaceStanding, meId: string): PlaceRankingRow {
  return {
    userId: standing.userId,
    username: standing.username,
    avatar: parseAvatar(standing.avatar) ?? DEFAULT_AVATAR,
    article: standing.article,
    position: standing.position,
    score: standing.score,
    daysPlayed: standing.daysPlayed,
    locality: standing.locality,
    isMe: standing.userId === meId,
    holder: standing.holder,
    verifiedInWeek: standing.verifiedInWeek,
  };
}

/** A crown as the app shows it. `nth` is the winner's count of crowns (0 when not needed). */
export function crownViewOf(crown: Crown, nth: number): CrownView {
  return {
    id: crown.id,
    weekStart: crown.weekStart,
    weekNumber: isoWeekNumber(crown.weekStart),
    kind: crown.placeKind ? (LEVEL_OF_KIND[crown.placeKind] ?? "locality") : "group",
    groupId: crown.groupId,
    title: crown.title,
    emblem: crown.emblem as CrownView["emblem"],
    color: crown.color as CrownView["color"],
    winner: { userId: crown.userId, username: crown.username, avatar: parseAvatar(crown.avatar) ?? DEFAULT_AVATAR, article: crown.article },
    score: crown.score,
    daysPlayed: crown.daysPlayed,
    players: crown.players,
    runnerUp: crown.runnerUp ? { username: crown.runnerUp.username, score: crown.runnerUp.score } : null,
    seen: crown.seenAt !== null,
    nth,
  };
}

/**
 * The ranking of the player's locality, province or country, of today and
 * of the week, with the live crown: the first one who checked their
 * location this week. Without a confirmed place it's shown without them.
 */
export async function rankingView(db: Queryable, user: User, level: PlaceLevel, now: number): Promise<RankingResponse> {
  const info = weekInfo(now);
  const today = toGameDate(new Date(now));
  const locality = user.placeId ? await getLocality(db, user.placeId) : null;
  if (!locality) {
    return { status: "no-place", level, place: null, levels: [], week: info, today, periods: null, me: { verifiedThisWeek: false }, lastCrown: null };
  }
  const levels = levelsOf(locality);
  const place = levels[level];
  await settlePlaceCrowns(db, [place.id], now);
  const week = thisWeek(now);
  const base = { placeId: place.id, weekFrom: week.from, weekTo: week.to, meId: user.id };
  const [day, wholeWeek, last, verifiedThisWeek] = [
    await placeRanking(db, { ...base, from: today, to: today }),
    await placeRanking(db, { ...base, from: week.start, to: today }),
    await latestPlaceCrown(db, place.id),
    user.placeVerifiedAt !== null ? await verifiedBetween(db, user.id, locality.id, week.from, week.to) : false,
  ];
  const period = (ranking: { players: number; rows: PlaceStanding[] }): RankingPeriod => ({
    players: ranking.players,
    rows: ranking.rows.map((row) => rankingRow(row, user.id)),
  });
  const tabs: RankingLevelTab[] = (["locality", "province", "country"] as const).map((one) => ({ level: one, name: levels[one].name }));
  return {
    status: user.placeVerifiedAt === null ? "unverified" : "ok",
    level,
    place,
    levels: tabs,
    week: info,
    today,
    periods: { today: period(day), week: period(wholeWeek) },
    me: { verifiedThisWeek },
    lastCrown: last && last.weekStart === addDays(info.start, -7) ? crownViewOf(last, 0) : null,
  };
}

/** Where the player stands today in their locality, province and country, for the day's summary. */
export async function todayStandings(db: Queryable, user: User, now: number): Promise<TodayStandingsResponse> {
  const locality = user.placeId ? await getLocality(db, user.placeId) : null;
  if (!locality) return { status: "no-place", place: null, levels: [], above: null };
  const place = { id: locality.id, name: locality.name };
  if (user.placeVerifiedAt === null) return { status: "unverified", place, levels: [], above: null };
  const today = toGameDate(new Date(now));
  const week = thisWeek(now);
  const levels = levelsOf(locality);
  const standings: LevelStanding[] = [];
  let above: TodayStandingsResponse["above"] = null;
  for (const level of PLACE_LEVELS) {
    // In the locality, enough rows to tell who's right above; higher up, just the player's.
    const { players, rows } = await placeRanking(db, {
      placeId: levels[level].id,
      from: today,
      to: today,
      weekFrom: week.from,
      weekTo: week.to,
      meId: user.id,
      limit: level === "locality" ? 50 : 1,
    });
    const me = rows.find((row) => row.userId === user.id);
    standings.push({ level, name: levels[level].name, position: me?.position ?? null, score: me?.score ?? null, players });
    if (level === "locality" && me && me.position > 1) {
      const ahead = rows.filter((row) => row.position < me.position);
      const next = ahead[ahead.length - 1];
      if (next) above = { username: next.username, score: next.score };
    }
  }
  return { status: "ok", place, levels: standings, above };
}

/* ───────────── Crowns of places ───────────── */

/** How a place's crown names it: the barrio or town, "la Ciudad de Buenos Aires", "Argentina". */
async function crownNameOf(db: Queryable, placeId: string): Promise<string | null> {
  const place = await getPlace(db, placeId);
  return place ? placeNames(place.id, place.name).crown : null;
}

/**
 * Decides a place's crown for a closed week: the first one who checked
 * their location in it that week. If whoever led didn't, it goes to the
 * next who did.
 */
async function decidePlaceWeek(db: Queryable, placeId: string, week: string, title: string): Promise<void> {
  const bounds = weekBounds(week);
  const { players, leaders } = await placeWeekLeaders(db, { placeId, from: week, to: addDays(week, 6), weekFrom: bounds.from, weekTo: bounds.to });
  const [holder, runnerUp] = leaders;
  if (!holder) return;
  await recordPlaceCrown(db, {
    placeId,
    weekStart: week,
    userId: holder.userId,
    score: holder.score,
    daysPlayed: holder.daysPlayed,
    players,
    runnerUpId: runnerUp?.userId ?? null,
    runnerUpScore: runnerUp?.score ?? null,
    title,
  });
}

/** Decides the closed weeks these places still owe. Safe to run twice. */
export async function settlePlaceCrowns(db: Queryable, placeIds: readonly string[], now: number): Promise<void> {
  const weeks = recentClosedWeeks(now);
  if (weeks.length === 0) return;
  for (const placeId of new Set(placeIds)) {
    const pending = await undecidedPlaceWeeks(db, placeId, weeks);
    if (pending.length === 0) continue;
    const title = await crownNameOf(db, placeId);
    if (!title) continue;
    for (const week of pending) {
      await decidePlaceWeek(db, placeId, week, title);
      await markPlaceWeekDecided(db, placeId, week);
    }
  }
}

/** The places whose crowns the player may have won: theirs now and where they played lately. */
export async function settlePlaceCrownsOf(db: Queryable, user: User, now: number): Promise<void> {
  const weeks = recentClosedWeeks(now);
  if (weeks.length === 0) return;
  const localityIds = new Set(await localitiesPlayed(db, user.id, weeks[0]!, addDays(weeks[weeks.length - 1]!, 6)));
  if (user.placeId) localityIds.add(user.placeId);
  const placeIds: string[] = [];
  for (const id of localityIds) {
    const locality = await getLocality(db, id);
    if (locality) placeIds.push(locality.id, locality.provinceId, locality.countryId);
  }
  await settlePlaceCrowns(db, placeIds, now);
}
