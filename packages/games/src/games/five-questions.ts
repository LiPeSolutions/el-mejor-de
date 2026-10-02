import type { Rng } from '../rng';
import type { Flag, GameDefinition, GameResult } from '../types';

/** "Cinco Preguntas": five trivia questions, 15 seconds each. Faster correct answers score more. */
export const FIVE_QUESTIONS_RULES = {
  /** Difficulty of each question, shown in this order (easy first). */
  difficultyPlan: [1, 1, 2, 2, 3] as const,
  secondsPerQuestion: 15,
  /** Correct answers within this time get the full speed bonus (time to read). */
  fullBonusWithinMs: 2_000,
  /** Allowance for network delay. */
  networkGraceMs: 1_500,
  basePoints: 100,
  maxSpeedBonus: 100,
  /** Nobody reads a question and answers it correctly faster than this. */
  minHumanAnswerMs: 400,
} as const;

export type TriviaCategory =
  | 'argentina'
  | 'football'
  | 'geography'
  | 'history'
  | 'general'
  | 'science'
  | 'entertainment';

export type TriviaDifficulty = 1 | 2 | 3;

export interface TriviaQuestion {
  id: string;
  category: TriviaCategory;
  difficulty: TriviaDifficulty;
  prompt: string;
  /** options[0] is the correct answer. Each player sees them in a different order. */
  options: readonly [string, string, string, string];
}

export interface PresentedQuestion {
  id: string;
  category: TriviaCategory;
  difficulty: TriviaDifficulty;
  prompt: string;
  /** In display order. */
  options: string[];
}

export interface FiveQuestionsContent {
  /** In display order. The server reveals them one at a time, never all at once. */
  questions: PresentedQuestion[];
  secondsPerQuestion: number;
}

export interface FiveQuestionsSolution {
  /** Display index of the correct option for each question. */
  correct: number[];
}

export interface FiveQuestionsLog {
  /**
   * One entry per question, in display order. `choice` is the display index (null
   * on timeout); `elapsedMs` is measured by the server, from serving to answer.
   */
  answers: Array<{ choice: number | null; elapsedMs: number }>;
}

export interface FiveQuestionsResult extends GameResult {
  questions: Array<{ correct: boolean; points: number; elapsedMs: number | null }>;
  correctCount: number;
}

/** Throws with a readable message when a question bank has mistakes. */
export function validateTriviaBank(bank: readonly TriviaQuestion[]): void {
  const ids = new Set<string>();
  for (const question of bank) {
    const where = `Question "${question.id}"`;
    if (!question.id) throw new Error('A question has no id');
    if (ids.has(question.id)) throw new Error(`${where} is duplicated`);
    ids.add(question.id);
    if (!question.prompt.trim()) throw new Error(`${where} has no prompt`);
    if (![1, 2, 3].includes(question.difficulty)) throw new Error(`${where} has an invalid difficulty`);
    if (question.options.length !== 4) throw new Error(`${where} needs exactly 4 options`);
    const options = question.options.map((option) => option.trim().toLocaleLowerCase('es'));
    if (options.some((option) => option === '')) throw new Error(`${where} has an empty option`);
    if (new Set(options).size !== options.length) throw new Error(`${where} has repeated options`);
  }
}

function selectQuestions(bank: readonly TriviaQuestion[], rng: Rng): TriviaQuestion[] {
  const pool = [...bank].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const chosen: TriviaQuestion[] = [];
  const usedCategories = new Set<TriviaCategory>();
  for (const difficulty of FIVE_QUESTIONS_RULES.difficultyPlan) {
    const remaining = pool.filter((question) => !chosen.includes(question));
    const sameDifficulty = remaining.filter((question) => question.difficulty === difficulty);
    const newCategory = sameDifficulty.filter((question) => !usedCategories.has(question.category));
    const candidates =
      newCategory.length > 0 ? newCategory : sameDifficulty.length > 0 ? sameDifficulty : remaining;
    const question = rng.pick(candidates);
    chosen.push(question);
    usedCategories.add(question.category);
  }
  return chosen;
}

/** Shuffles questions of equal difficulty among themselves, keeping easy ones first. */
function shuffleWithinDifficulty(questions: TriviaQuestion[], rng: Rng): TriviaQuestion[] {
  const result: TriviaQuestion[] = [];
  for (const difficulty of [1, 2, 3] as const) {
    result.push(...rng.shuffle(questions.filter((question) => question.difficulty === difficulty)));
  }
  return result;
}

export function fiveQuestionsPoints(elapsedMs: number): number {
  const { secondsPerQuestion, fullBonusWithinMs, basePoints, maxSpeedBonus } = FIVE_QUESTIONS_RULES;
  const limitMs = secondsPerQuestion * 1000;
  const speed = Math.min(1, Math.max(0, (limitMs - elapsedMs) / (limitMs - fullBonusWithinMs)));
  return basePoints + Math.round(maxSpeedBonus * speed);
}

/**
 * @param bank Approved questions, already without the ones used recently.
 *   Everyone gets the same five questions (they're good for chatting about);
 *   each player sees options in a different order.
 */
export function createFiveQuestions(
  bank: readonly TriviaQuestion[],
): GameDefinition<FiveQuestionsContent, FiveQuestionsSolution, FiveQuestionsLog, FiveQuestionsResult> {
  const rules = FIVE_QUESTIONS_RULES;
  validateTriviaBank(bank);
  if (bank.length < rules.difficultyPlan.length) {
    throw new Error(`The bank needs at least ${rules.difficultyPlan.length} questions`);
  }

  return {
    id: 'five-questions',
    category: 'trivia',
    maxDurationMs: rules.difficultyPlan.length * (rules.secondsPerQuestion * 1000 + 5_000),

    generate({ shared, player }) {
      const questions = shuffleWithinDifficulty(selectQuestions(bank, shared), player);
      const correct: number[] = [];
      const presented = questions.map((question) => {
        const order = player.shuffle([0, 1, 2, 3]);
        correct.push(order.indexOf(0));
        return {
          id: question.id,
          category: question.category,
          difficulty: question.difficulty,
          prompt: question.prompt,
          options: order.map((index) => question.options[index] as string),
        };
      });
      return {
        content: { questions: presented, secondsPerQuestion: rules.secondsPerQuestion },
        solution: { correct },
      };
    },

    evaluate(content, solution, log) {
      const limitMs = content.secondsPerQuestion * 1000 + rules.networkGraceMs;
      const flags: Flag[] = [];
      let tooFast = 0;

      const questions = content.questions.map((question, index) => {
        const answer = log.answers[index];
        const elapsedMs = answer && Number.isFinite(answer.elapsedMs) ? answer.elapsedMs : null;
        const answeredInTime =
          answer !== undefined &&
          answer.choice !== null &&
          Number.isInteger(answer.choice) &&
          answer.choice >= 0 &&
          answer.choice < question.options.length &&
          elapsedMs !== null &&
          elapsedMs >= 0 &&
          elapsedMs <= limitMs;
        const correct = answeredInTime && answer.choice === solution.correct[index];
        if (correct && elapsedMs < rules.minHumanAnswerMs) tooFast++;
        return { correct, points: correct ? fiveQuestionsPoints(elapsedMs) : 0, elapsedMs };
      });

      if (tooFast > 0) {
        flags.push({ code: 'too-fast-answers', severity: tooFast >= 2 ? 'high' : 'low', detail: String(tooFast) });
      }
      if (log.answers.length > content.questions.length) {
        flags.push({ code: 'malformed-log', severity: 'low', detail: 'more answers than questions' });
      }

      return {
        score: questions.reduce((sum, question) => sum + question.points, 0),
        flags,
        questions,
        correctCount: questions.filter((question) => question.correct).length,
      };
    },
  };
}
