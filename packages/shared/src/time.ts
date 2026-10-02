/**
 * Game calendar. Every game day and week runs on Argentina time, decided by
 * the server — never by the player's device clock.
 */

export const GAME_TIME_ZONE = 'America/Argentina/Buenos_Aires';

/** A calendar date in the game time zone, formatted as YYYY-MM-DD. */
export type GameDate = string;

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: GAME_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const offsetFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: GAME_TIME_ZONE,
  timeZoneName: 'longOffset',
});

function toUtcMidnight(date: GameDate): number {
  const match = DATE_PATTERN.exec(date);
  if (!match) throw new RangeError(`Invalid game date: ${date}`);
  const [, year, month, day] = match;
  const ms = Date.UTC(Number(year), Number(month) - 1, Number(day));
  if (fromUtcMidnight(ms) !== date) throw new RangeError(`Invalid game date: ${date}`);
  return ms;
}

function fromUtcMidnight(ms: number): GameDate {
  return new Date(ms).toISOString().slice(0, 10);
}

/** UTC offset of the game time zone at an instant, in minutes (Argentina today: -180). */
function offsetMinutes(instantMs: number): number {
  const name =
    offsetFormatter.formatToParts(new Date(instantMs)).find((part) => part.type === 'timeZoneName')
      ?.value ?? 'GMT';
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0;
  const [, sign, hours, minutes] = match;
  const total = Number(hours) * 60 + Number(minutes);
  return sign === '-' ? -total : total;
}

/** Game date for an instant. */
export function toGameDate(instant: Date): GameDate {
  const parts = dateFormatter.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Throws if the string is not a real YYYY-MM-DD date. */
export function assertGameDate(date: string): asserts date is GameDate {
  toUtcMidnight(date);
}

export function addDays(date: GameDate, days: number): GameDate {
  return fromUtcMidnight(toUtcMidnight(date) + days * DAY_MS);
}

/** Days since 1970-01-01 for a calendar date. Consecutive dates differ by 1. */
export function dayIndex(date: GameDate): number {
  return Math.round(toUtcMidnight(date) / DAY_MS);
}

/** Day number since launch, starting at 1 ("Día 214"). */
export function dayNumber(date: GameDate, firstDay: GameDate): number {
  return dayIndex(date) - dayIndex(firstDay) + 1;
}

/** Monday of the date's week. Weeks run Monday to Sunday. */
export function weekStart(date: GameDate): GameDate {
  const ms = toUtcMidnight(date);
  const isoWeekday = (new Date(ms).getUTCDay() + 6) % 7; // Monday = 0
  return fromUtcMidnight(ms - isoWeekday * DAY_MS);
}

/** ISO 8601 week number (1–53), as in "Semana 40". */
export function isoWeekNumber(date: GameDate): number {
  const ms = toUtcMidnight(date);
  const isoWeekday = (new Date(ms).getUTCDay() + 6) % 7;
  const thursday = ms + (3 - isoWeekday) * DAY_MS;
  const yearStart = Date.UTC(new Date(thursday).getUTCFullYear(), 0, 1);
  return Math.floor((thursday - yearStart) / DAY_MS / 7) + 1;
}

/** Instant when a game day starts (00:00 Argentina time). */
export function gameDayStart(date: GameDate): Date {
  const utcMidnight = toUtcMidnight(date);
  const guess = utcMidnight - offsetMinutes(utcMidnight) * 60_000;
  // Recompute with the offset at the guess, in case a DST change sits in between.
  return new Date(utcMidnight - offsetMinutes(guess) * 60_000);
}

export function nextGameDayStart(now: Date): Date {
  return gameDayStart(addDays(toGameDate(now), 1));
}

/** Milliseconds until the next daily challenges, for the countdown. */
export function msUntilNextGameDay(now: Date): number {
  return nextGameDayStart(now).getTime() - now.getTime();
}
