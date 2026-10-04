import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { TRIVIA_QUESTIONS } from "@repo/content";
import { FIVE_QUESTIONS_RULES, LARGADA_RULES, createFiveQuestions, createRng, dailyLineup, type TriviaQuestion } from "@repo/games";
import { dailyRngs, deriveSeed } from "@repo/games/server";
import { CATEGORY_LABELS } from "./challenges";
import { challengeSecret } from "./secret";

/*
 * What each battle match plays: the questions (the same ones for everyone,
 * in the same order) or the waits of the lights (the same for everyone, so
 * they go out at once on every phone). Decided when the match starts and
 * kept with it; the right answers never leave the server.
 */

const QUESTIONS = new Map(TRIVIA_QUESTIONS.map((question) => [question.id, question]));
const QUESTION_COUNT = FIVE_QUESTIONS_RULES.difficultyPlan.length;

export interface BattleTriviaContent {
  questionIds: string[];
}

export interface BattleLargadaContent {
  delaysMs: number[];
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
