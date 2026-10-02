import { addDays } from '@repo/shared';
import { describe, expect, it } from 'vitest';
import { GAME_CATALOG, dailyLineup } from './lineup';
import { GAME_IDS } from './types';

describe('dailyLineup', () => {
  it('picks three different games', () => {
    const lineup = dailyLineup('2026-10-02');
    expect(lineup).toHaveLength(3);
    expect(new Set(lineup).size).toBe(3);
    for (const id of lineup) expect(GAME_IDS).toContain(id);
  });

  it('rests each game exactly once every four days', () => {
    const resting = [0, 1, 2, 3].map((offset) => {
      const lineup = dailyLineup(addDays('2026-10-02', offset));
      return GAME_IDS.find((id) => !lineup.includes(id));
    });
    expect([...resting].sort()).toEqual([...GAME_IDS].sort());
  });

  it('is the same for everyone on a given day', () => {
    expect(dailyLineup('2026-12-25')).toEqual(dailyLineup('2026-12-25'));
  });

  it('has display info for every game', () => {
    for (const id of GAME_IDS) expect(GAME_CATALOG[id].name).toBeTruthy();
  });
});
