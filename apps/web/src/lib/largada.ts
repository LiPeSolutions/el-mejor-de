import type { Article } from "@repo/shared";
import type { LargadaStart } from "./largada-types";

/*
 * Largada's race (docs/diseno/handoff-largada/LARGADA.md §6): the real
 * differences are a few milliseconds, so they're exaggerated to be seen.
 * The first car leaves at once and each other one (r − rMin) × 6 ms later
 * (at most 600 ms); all take 1.4 s with the same curve from the start line
 * to the finish, and then go on straight.
 */

export const RACE = {
  /** Where the noses wait, and the finish line, in the track's 390-wide units. */
  startX: 192,
  finishX: 362,
  raceMs: 1_400,
  msFactor: 6,
  maxOffsetMs: 600,
  /** The arrival shows when the last car gets there, or at this point anyway. */
  arrivalMs: 2_200,
} as const;

/** When each car leaves, in ms after the first; null for a jumped start: that car stays. */
export function departures(starts: readonly LargadaStart[], maxReactionMs: number): (number | null)[] {
  const times = starts.map((start) => (start.falseStart ? null : (start.reactionMs ?? maxReactionMs)));
  const moving = times.filter((time): time is number => time !== null);
  if (moving.length === 0) return times.map(() => null);
  const first = Math.min(...moving);
  return times.map((time) => (time === null ? null : Math.min((time - first) * RACE.msFactor, RACE.maxOffsetMs)));
}

/** The nose of a car that left `leftAt` ms after the first, `t` ms after the first left. */
export function noseAt(t: number, leftAt: number | null): number {
  const { startX, finishX, raceMs } = RACE;
  if (leftAt === null || t <= leftAt) return startX;
  const elapsed = t - leftAt;
  const distance = finishX - startX;
  if (elapsed <= raceMs) return startX + distance * (elapsed / raceMs) ** 2;
  // Then straight on, at the speed the curve ends with.
  return finishX + ((2 * distance) / raceMs) * (elapsed - raceMs);
}

/** When the last car that left crosses the finish, in ms after the first left. */
export function raceEndMs(leftAt: readonly (number | null)[]): number {
  const moving = leftAt.filter((value): value is number => value !== null);
  return moving.length > 0 ? Math.max(...moving) + RACE.raceMs : 0;
}

/** The starts of a graded Largada, as the race replays them: an impossible one was a jump. */
export function startsOf(result: unknown): LargadaStart[] {
  const rounds = (result as { rounds?: unknown } | null)?.rounds;
  if (!Array.isArray(rounds)) return [];
  return rounds.map((round) => {
    const { outcome, reactionMs } = (round ?? {}) as { outcome?: unknown; reactionMs?: unknown };
    if (outcome === "hit" && typeof reactionMs === "number") return { reactionMs, falseStart: false };
    return { reactionMs: null, falseStart: outcome === "false-start" || outcome === "impossible" };
  });
}

const raceTime = (start: LargadaStart, maxReactionMs: number) => (start.falseStart ? Number.POSITIVE_INFINITY : (start.reactionMs ?? maxReactionMs));

/** The places of one start: by reaction time, a tie shares the place, a jumped start goes last. */
export function placements(starts: readonly LargadaStart[], maxReactionMs: number): number[] {
  const times = starts.map((start) => raceTime(start, maxReactionMs));
  return times.map((time) => 1 + times.filter((other) => other < time).length);
}

/**
 * The player's best start, for the finish photo: the best place and, in a
 * tie, the fewest milliseconds. `lanes[i]` are the rivals' starts in start i.
 */
export function bestStart(mine: readonly LargadaStart[], lanes: readonly (readonly LargadaStart[])[], maxReactionMs: number): number | null {
  let best: { index: number; place: number; ms: number } | null = null;
  mine.forEach((start, index) => {
    const field = [...(lanes[index] ?? []), start];
    const place = placements(field, maxReactionMs)[field.length - 1]!;
    const ms = raceTime(start, maxReactionMs);
    if (!best || place < best.place || (place === best.place && ms < best.ms)) best = { index, place, ms };
  });
  return best === null ? null : (best as { index: number }).index;
}

/** "1º" or "1ª", as the player chose to be named. */
export const ordinal = (place: number, article: Article = "el") => `${place}${article === "la" ? "ª" : "º"}`;

/*
 * Usernames have no spaces: a name like "El mejor de Chivilcoy" is the ghost,
 * and inside a sentence it takes its article ("a 3 ms del mejor de Chivilcoy").
 */
const GHOST_NAME = /^(El|La) /;

/** The name inside a sentence: "el mejor de Chivilcoy". */
export const inSentence = (name: string) => (GHOST_NAME.test(name) ? name.charAt(0).toLowerCase() + name.slice(1) : name);

/** "de Juli", "del mejor de Chivilcoy", "de la mejor de Chivilcoy". */
export const deName = (name: string) => (name.startsWith("El ") ? `del ${name.slice(3)}` : `de ${inSentence(name)}`);

/** "a Juli", "al mejor de Chivilcoy", "a la mejor de Chivilcoy". */
export const aName = (name: string) => (name.startsWith("El ") ? `al ${name.slice(3)}` : `a ${inSentence(name)}`);

/** "Tincho, Caro y Sofi". */
export function namesList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

export interface Runner extends LargadaStart {
  name: string;
  me: boolean;
}

/** How the player did in a start, for the race chip and the arrival's title. */
export function startSummary(field: readonly Runner[], maxReactionMs: number, article: Article) {
  const places = placements(field, maxReactionMs);
  const meIndex = field.findIndex((runner) => runner.me);
  const me = field[meIndex]!;
  const place = places[meIndex]!;
  const time = (runner: Runner) => raceTime(runner, maxReactionMs);
  const tied = field.filter((runner, i) => !runner.me && places[i] === place && !me.falseStart);
  const ahead = field
    .map((runner, i) => ({ runner, place: places[i]! }))
    .filter((entry) => entry.place < place)
    .sort((a, b) => time(b.runner) - time(a.runner))[0]?.runner;
  const beaten = field.filter((runner, i) => places[i]! > place).map((runner) => runner.name);
  const first = ordinal(place, article);

  let title: string;
  let detail: string;
  if (me.falseStart) {
    title = "Te adelantaste";
    detail = "Esta largada no cuenta: vale 450 ms";
  } else if (me.reactionMs === null) {
    title = "No largaste a tiempo";
    detail = "Esta largada vale 700 ms";
  } else if (field.length === 1) {
    title = `${me.reactionMs} ms`;
    detail = `Hoy sos ${article === "la" ? "la primera" : "el primero"} en largar`;
  } else {
    title = `Llegaste ${first}`;
    const versus = beaten.length === 1 ? `le ganaste ${aName(beaten[0]!)}` : beaten.length > 1 ? `le ganaste a ${namesList(beaten)}` : "";
    if (tied.length > 0) detail = `Empataste con ${namesList(tied.map((runner) => inSentence(runner.name)))}${versus ? ` · ${versus}` : ""}`;
    else if (place === 1) {
      const second = field.filter((runner) => !runner.me && !runner.falseStart).map(time).sort((a, b) => a - b)[0];
      detail = second !== undefined && Number.isFinite(second) ? `Por ${second - me.reactionMs} ms · ${versus}` : versus;
    } else detail = `A ${ahead ? time(me) - time(ahead) : 0} ms ${ahead ? deName(ahead.name) : "del de adelante"}${versus ? ` · ${versus}` : ""}`;
  }
  return { place, places, title, detail: detail.charAt(0).toUpperCase() + detail.slice(1), tied: tied.map((runner) => runner.name), ahead: ahead?.name ?? null };
}

/** Under the finish photo: "Vos 1º por 6 ms", "Vos 2º · a 13 ms de Juli". */
export function photoCaption(field: readonly Runner[], maxReactionMs: number, article: Article): string {
  const meIndex = field.findIndex((runner) => runner.me);
  const me = field[meIndex];
  if (!me || me.falseStart) return "Vos · te adelantaste";
  if (me.reactionMs === null) return "Vos · no largaste";
  if (field.length === 1) return `Vos · ${me.reactionMs} ms`;
  const places = placements(field, maxReactionMs);
  const place = places[meIndex]!;
  const time = (runner: Runner) => raceTime(runner, maxReactionMs);
  if (place === 1) {
    const second = Math.min(...field.filter((runner) => !runner.me).map(time));
    if (!Number.isFinite(second)) return `Vos ${ordinal(1, article)}`;
    return second === me.reactionMs ? `Vos ${ordinal(1, article)} · empate` : `Vos ${ordinal(1, article)} por ${second - me.reactionMs} ms`;
  }
  const ahead = field.filter((_, i) => places[i]! < place).sort((a, b) => time(b) - time(a))[0]!;
  return `Vos ${ordinal(place, article)} · a ${me.reactionMs - time(ahead)} ms ${deName(ahead.name)}`;
}
