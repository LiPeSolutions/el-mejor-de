import { describe, expect, it } from 'vitest';
import {
  addDays,
  assertGameDate,
  dayIndex,
  dayNumber,
  gameDayStart,
  isoWeekNumber,
  msUntilNextGameDay,
  nextGameDayStart,
  toGameDate,
  weekStart,
} from './time';

describe('toGameDate', () => {
  it('uses Argentina time, so the day changes at 03:00 UTC', () => {
    expect(toGameDate(new Date('2026-10-03T02:59:59Z'))).toBe('2026-10-02');
    expect(toGameDate(new Date('2026-10-03T03:00:00Z'))).toBe('2026-10-03');
  });
});

describe('gameDayStart / countdown', () => {
  it('starts each game day at 00:00 Argentina time', () => {
    expect(gameDayStart('2026-10-03').toISOString()).toBe('2026-10-03T03:00:00.000Z');
  });

  it('counts down to the next game day', () => {
    const sixPmInArgentina = new Date('2026-10-02T21:00:00Z');
    expect(nextGameDayStart(sixPmInArgentina).toISOString()).toBe('2026-10-03T03:00:00.000Z');
    expect(msUntilNextGameDay(sixPmInArgentina)).toBe(6 * 60 * 60 * 1000);
  });

  it('counts a full day right at midnight', () => {
    expect(msUntilNextGameDay(new Date('2026-10-03T03:00:00Z'))).toBe(24 * 60 * 60 * 1000);
  });
});

describe('calendar helpers', () => {
  it('adds days across months, years and leap days', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-10-02', -5)).toBe('2026-09-27');
  });

  it('gives consecutive day indexes and day numbers', () => {
    expect(dayIndex('2026-10-03') - dayIndex('2026-10-02')).toBe(1);
    expect(dayNumber('2026-10-02', '2026-10-02')).toBe(1);
    expect(dayNumber('2027-05-03', '2026-10-02')).toBe(214);
  });

  it('starts weeks on Monday', () => {
    expect(weekStart('2026-10-02')).toBe('2026-09-28'); // Friday
    expect(weekStart('2026-09-28')).toBe('2026-09-28'); // Monday
    expect(weekStart('2026-10-04')).toBe('2026-09-28'); // Sunday
  });

  it('computes ISO week numbers', () => {
    expect(isoWeekNumber('2026-10-02')).toBe(40);
    expect(isoWeekNumber('2026-01-01')).toBe(1);
    expect(isoWeekNumber('2027-01-01')).toBe(53);
    expect(isoWeekNumber('2027-01-04')).toBe(1);
  });

  it('rejects malformed or impossible dates', () => {
    expect(() => assertGameDate('2026-02-30')).toThrow(RangeError);
    expect(() => assertGameDate('2026-1-1')).toThrow(RangeError);
    expect(() => assertGameDate('hola')).toThrow(RangeError);
    expect(() => assertGameDate('2026-10-02')).not.toThrow();
  });
});
