import { COMPETITION_RULES, dayIndex, type GameDate } from '@repo/shared';
import { GAME_IDS, type GameCategory, type GameId } from './types';

/** Display info. Names are provisional (see docs/PLAN.md). */
export const GAME_CATALOG: Readonly<Record<GameId, { name: string; category: GameCategory; summary: string }>> = {
  'seven-letters': {
    name: 'Siete Letras',
    category: 'words',
    summary: 'Armá todas las palabras que puedas con 7 letras.',
  },
  'five-questions': {
    name: 'Cinco Preguntas',
    category: 'trivia',
    summary: 'Cinco preguntas, 15 segundos cada una.',
  },
  reflexes: {
    name: 'Reflejos',
    category: 'skill',
    summary: 'Tocá apenas cambie la pantalla.',
  },
  sequence: {
    name: 'Secuencia',
    category: 'logic',
    summary: 'Repetí la secuencia, cada vez más larga.',
  },
  'water-sort': {
    name: 'Tubitos',
    category: 'logic',
    summary: 'Pasá los colores de un tubo a otro hasta que cada uno tenga uno solo.',
  },
};

/**
 * Tubitos joins the daily challenge on this game date: from then on, five
 * games and three a day. The days before keep the four-game rotation, so a
 * day's lineup never changes.
 */
export const WATER_SORT_FROM = '2026-10-05';

/** The games before Tubitos, in their order. */
const FOUR_GAMES = GAME_IDS.filter((id) => id !== 'water-sort');

/**
 * Where the five-game rotation starts, so its first day (Monday 5/10/2026)
 * keeps Largada, as announced, and has Tubitos.
 */
const FIVE_GAMES_OFFSET = 1;

/** Which games rest on a date, as indexes into the list of games. */
function restingIndexes(date: GameDate): number[] {
  if (date < WATER_SORT_FROM) {
    // Four games: each one rests every fourth day.
    return [mod(dayIndex(date), FOUR_GAMES.length)];
  }
  // Five games, two resting: the day's number and the one two after it. Each game plays three
  // days out of five and never rests two days in a row.
  const day = mod(dayIndex(date) - dayIndex(WATER_SORT_FROM) + FIVE_GAMES_OFFSET, GAME_IDS.length);
  return [day, mod(day + 2, GAME_IDS.length)];
}

const mod = (value: number, by: number) => ((value % by) + by) % by;

/** The games in the daily rotation on a date: four before Tubitos, five from then on. */
export function rotationGames(date: GameDate): readonly GameId[] {
  return date < WATER_SORT_FROM ? FOUR_GAMES : GAME_IDS;
}

/**
 * The day's challenges, in a fixed order. The games that rest rotate daily,
 * so all of them show up just as often.
 */
export function dailyLineup(date: GameDate): GameId[] {
  const resting = restingIndexes(date);
  const lineup = rotationGames(date).filter((_, index) => !resting.includes(index));
  if (lineup.length !== COMPETITION_RULES.challengesPerDay) {
    throw new Error('The lineup size does not match the challenges per day');
  }
  return lineup;
}
