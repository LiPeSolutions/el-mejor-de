import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { TRIVIA_QUESTIONS, getSevenLettersDictionary } from "@repo/content";
import {
  BATTLE_RULES,
  FIVE_QUESTIONS_RULES,
  LARGADA_RULES,
  TEN_LETTERS_RULES,
  createFiveQuestions,
  createRng,
  createSequence,
  createSevenLetters,
  dailyLineup,
  sevenLettersWords,
  waterSortBoard,
  waterSortPlayerBoard,
  type TriviaQuestion,
  type WaterSortLevel,
} from "@repo/games";
import { dailyRngs, deriveSeed } from "@repo/games/server";
import { CATEGORY_LABELS } from "./challenges";
import { challengeSecret } from "./secret";

/*
 * What each battle match plays: the questions (the same ones for everyone,
 * in the same order), the waits of the lights (the same for everyone, so
 * they go out at once on every phone) or the letters. Decided when the
 * match starts and kept with it; the right answers never leave the server.
 */

const QUESTIONS = new Map(TRIVIA_QUESTIONS.map((question) => [question.id, question]));
const QUESTION_COUNT = FIVE_QUESTIONS_RULES.difficultyPlan.length;

export interface BattleTriviaContent {
  questionIds: string[];
}

export interface BattleLargadaContent {
  delaysMs: number[];
}

/** Only the letters: the valid words are worked out again from them (`lettersWords`). */
export interface BattleLettersContent {
  letters: string[];
}

/** The whole sequence (30 colors); each round shows the first ones, never more. */
export interface BattleSequenceContent {
  sequence: number[];
}

/** Tubitos' three boards as drawn, the same for everyone; each player plays their own version of each. */
export interface BattleTubitosContent {
  levels: WaterSortLevel[];
}

let dailyCache: { date: string; ids: Set<string> } | null = null;

/** Today's Cinco Preguntas, if it's one of the day's challenges: a battle never spoils it. */
function dailyQuestions(date: string): Set<string> {
  if (dailyCache?.date === date) return dailyCache.ids;
  const slot = dailyLineup(date).indexOf("five-questions");
  const ids = new Set<string>();
  if (slot !== -1) {
    const { content } = createFiveQuestions(TRIVIA_QUESTIONS).generate(dailyRngs(challengeSecret(), date, slot, "battle"));
    for (const question of content.questions) ids.add(question.id);
  }
  dailyCache = { date, ids };
  return ids;
}

/**
 * Five questions, easy ones first, none of today's challenge nor of this
 * room's earlier matches. When the room has played them all, it starts over.
 */
export function pickQuestions(date: string, used: readonly string[]): { ids: string[]; reset: boolean } {
  const daily = dailyQuestions(date);
  const fresh = TRIVIA_QUESTIONS.filter((question) => !daily.has(question.id) && !used.includes(question.id));
  const reset = fresh.length < QUESTION_COUNT * 2;
  const bank = reset ? TRIVIA_QUESTIONS.filter((question) => !daily.has(question.id)) : fresh;
  const seed = randomUUID();
  const { content } = createFiveQuestions(bank).generate({ shared: createRng(`${seed}:pick`), player: createRng(`${seed}:order`) });
  return { ids: content.questions.map((question) => question.id), reset };
}

export function questionById(id: string): TriviaQuestion {
  const question = QUESTIONS.get(id);
  if (!question) throw new Error(`unknown question ${id}`);
  return question;
}

/**
 * The options of a question as this player sees them: each one in their own
 * order, like in the daily challenge. `order[shown]` is the option's place in
 * the question, where 0 is the right one.
 */
export function playerOptions(matchId: string, userId: string, round: number, question: TriviaQuestion): { options: string[]; order: number[] } {
  const rng = createRng(deriveSeed(challengeSecret(), "battle", matchId, userId, String(round)));
  const order = rng.shuffle([0, 1, 2, 3]);
  return { options: order.map((index) => question.options[index]!), order };
}

export const categoryLabel = (question: TriviaQuestion) => CATEGORY_LABELS[question.category];

/** The wait after the fifth light of each start, the same for everyone. */
export function largadaDelays(): number[] {
  return Array.from({ length: LARGADA_RULES.starts }, () => randomInt(LARGADA_RULES.minDelayMs, LARGADA_RULES.maxDelayMs + 1));
}

/* ───────────── Diez Letras ───────────── */

let lettersEngine: ReturnType<typeof createSevenLetters> | undefined;
const lettersGame = () => (lettersEngine ??= createSevenLetters(getSevenLettersDictionary(), TEN_LETTERS_RULES));
const lettersKey = (letters: readonly string[]) => [...letters].sort().join("");

let dailyLettersCache: { date: string; key: string | null } | null = null;

/** Today's Diez Letras, if it's one of the day's challenges (its letters, sorted): a battle never spoils it. */
function dailyLetters(date: string): string | null {
  if (dailyLettersCache?.date === date) return dailyLettersCache.key;
  const slot = dailyLineup(date).indexOf("seven-letters");
  // The letters only depend on the day's shared seed, not on the player.
  const key = slot === -1 ? null : lettersKey(lettersGame().generate(dailyRngs(challengeSecret(), date, slot, "battle")).content.letters);
  dailyLettersCache = { date, key };
  return key;
}

/** Ten letters with plenty of words, like the daily challenge's, and never today's. */
export function pickLetters(date: string): BattleLettersContent {
  const daily = dailyLetters(date);
  for (let tries = 0; ; tries++) {
    const seed = randomUUID();
    const { content } = lettersGame().generate({ shared: createRng(`${seed}:letters`), player: createRng(`${seed}:player`) });
    if (lettersKey(content.letters) !== daily || tries >= 5) return { letters: content.letters };
  }
}

const wordsCache = new Map<string, ReadonlySet<string>>();

/** Every valid word of a set of letters, from the dictionary: kept for the latest sets, since every word sent asks. */
export function lettersWords(letters: readonly string[]): ReadonlySet<string> {
  const key = lettersKey(letters);
  let words = wordsCache.get(key);
  if (!words) {
    words = new Set(sevenLettersWords(getSevenLettersDictionary(), letters));
    wordsCache.set(key, words);
    if (wordsCache.size > 50) wordsCache.delete(wordsCache.keys().next().value as string);
  }
  return words;
}

/* ───────────── Secuencia ───────────── */

/** A new sequence for everyone, like the daily challenge's. */
export function pickSequence(): BattleSequenceContent {
  const seed = randomUUID();
  const { content } = createSequence().generate({ shared: createRng(`${seed}:shared`), player: createRng(`${seed}:sequence`) });
  return { sequence: content.sequence };
}

/* ───────────── Tubitos ───────────── */

/** The three boards of the daily challenge's sizes, new ones, with their par (solved once, here). */
export function pickBoards(): BattleTubitosContent {
  const seed = randomUUID();
  return { levels: BATTLE_RULES.tubitos.boards.map((rules, index) => waterSortBoard(`${seed}:${index}`, rules)) };
}

/**
 * This player's version of board `round`: its colors swapped and its tubes
 * in another order, from a seed of the match and the player. Same puzzle
 * and par, but a friend's board alongside doesn't copy over.
 */
export function playerBoard(matchId: string, userId: string, round: number, board: WaterSortLevel): WaterSortLevel {
  const rules = BATTLE_RULES.tubitos.boards[round];
  if (!rules) throw new Error(`no board ${round}`);
  return waterSortPlayerBoard(board, rules, createRng(deriveSeed(challengeSecret(), "battle", matchId, userId, "tubitos", String(round))));
}
