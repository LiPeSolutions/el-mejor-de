import { addDays } from '@repo/shared';
import { describe, expect, it } from 'vitest';
import { GAME_CATALOG, WATER_SORT_FROM, dailyLineup, rotationGames } from './lineup';
import { GAME_IDS } from './types';

describe('dailyLineup', () => {
  it('picks three different games', () => {
    for (const date of ['2026-10-02', WATER_SORT_FROM, '2027-03-14']) {
      const lineup = dailyLineup(date);
      expect(lineup).toHaveLength(3);
      expect(new Set(lineup).size).toBe(3);
      for (const id of lineup) expect(GAME_IDS).toContain(id);
    }
  });

  it('keeps the days before Tubitos as they were', () => {
    expect(dailyLineup('2026-10-03')).toEqual(['seven-letters', 'reflexes', 'sequence']);
    expect(dailyLineup('2026-10-04')).toEqual(['seven-letters', 'five-questions', 'sequence']);
    expect(rotationGames('2026-10-04')).not.toContain('water-sort');
  });

  it('rests each game exactly once every four days before Tubitos', () => {
    const resting = [0, 1, 2, 3].map((offset) => {
      const lineup = dailyLineup(addDays('2026-09-28', offset));
      return GAME_IDS.find((id) => id !== 'water-sort' && !lineup.includes(id));
    });
    expect([...resting].sort()).toEqual(GAME_IDS.filter((id) => id !== 'water-sort').sort());
  });

  it('starts the five games with Largada and Tubitos', () => {
    expect(WATER_SORT_FROM).toBe('2026-10-05');
    expect(dailyLineup(WATER_SORT_FROM)).toEqual(['seven-letters', 'reflexes', 'water-sort']);
  });

  it('plays each of the five games three days out of five', () => {
    for (const start of [WATER_SORT_FROM, '2027-01-01']) {
      const days = [0, 1, 2, 3, 4].map((offset) => dailyLineup(addDays(start, offset)));
      for (const id of GAME_IDS) expect(days.filter((lineup) => lineup.includes(id))).toHaveLength(3);
    }
  });

  it('never rests a game two days in a row, not even when Tubitos arrives', () => {
    for (let offset = -3; offset < 40; offset++) {
      const today = addDays(WATER_SORT_FROM, offset);
      const tomorrow = addDays(today, 1);
      const restsToday = rotationGames(today).filter((id) => !dailyLineup(today).includes(id));
      const restsTomorrow = rotationGames(tomorrow).filter((id) => !dailyLineup(tomorrow).includes(id));
      expect(restsToday.filter((id) => restsTomorrow.includes(id))).toEqual([]);
    }
  });

  it('is the same for everyone on a given day', () => {
    expect(dailyLineup('2026-12-25')).toEqual(dailyLineup('2026-12-25'));
  });

  it('has display info for every game', () => {
    for (const id of GAME_IDS) expect(GAME_CATALOG[id].name).toBeTruthy();
  });
});
