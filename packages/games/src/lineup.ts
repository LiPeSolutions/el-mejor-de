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
};

/**
 * The day's challenges: every game but one, in a fixed order. The game that
 * rests rotates daily, so all of them show up just as often.
 */
export function dailyLineup(date: GameDate): GameId[] {
  const count = GAME_IDS.length;
  const resting = ((dayIndex(date) % count) + count) % count;
  const lineup = GAME_IDS.filter((_, index) => index !== resting);
  if (lineup.length !== COMPETITION_RULES.challengesPerDay) {
    throw new Error('The lineup size does not match the challenges per day');
  }
  return lineup;
}
