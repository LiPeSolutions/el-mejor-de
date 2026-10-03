import "server-only";
import { randomUUID } from "node:crypto";
import { TRIVIA_QUESTIONS, getSevenLettersDictionary } from "@repo/content";
import {
  FIVE_QUESTIONS_RULES,
  SEQUENCE_RULES,
  SEVEN_LETTERS_RULES,
  TEN_LETTERS_RULES,
  answerSeconds,
  createFiveQuestions,
  createLargada,
  createReflexes,
  createSequence,
  createSevenLetters,
  dailyLineup,
  fiveQuestionsPoints,
  normalizeWord,
  practiceRngs,
  sevenLettersScore,
  sevenLettersWordPoints,
  usesLargada,
  type FiveQuestionsContent,
  type FiveQuestionsSolution,
  type Flag,
  type GameId,
  type GameRngs,
  type LargadaContent,
  type ReflexesContent,
  type SequenceContent,
  type SevenLettersContent,
  type SevenLettersSolution,
  type TriviaCategory,
} from "@repo/games";
import { dailyRngs } from "@repo/games/server";
import { toGameDate } from "@repo/shared";
import { z } from "zod";
import type {
  AnswerResponse,
  ChallengeMode,
  ChallengeResult,
  LevelResponse,
  QuestionResponse,
  StartView,
  WordCheckResponse,
} from "@/lib/challenge-types";
import { HttpError } from "./http";
import { challengeSecret } from "./secret";
import { readToken, signToken } from "./tokens";

/**
 * Server side of every challenge. Content is regenerated from the secret seed on
 * each request (and cached), so the API is stateless: the signed attempt token
 * says which challenge it is and when it started.
 */
export interface AttemptClaims {
  v: 1;
  id: string;
  mode: ChallengeMode;
  game: GameId;
  date: string;
  /** 0–2 for daily challenges, -1 for practice. */
  slot: number;
  /** Seeds this player's own variants: the account when signed in, else the browser. */
  user: string;
  /** The browser (emd_uid cookie). Tokens from before accounts don't have it: it's `user`. */
  device?: string;
  /** The account, when the player is signed in. */
  account?: string;
  /** Practice only: random seed. */
  seed?: string;
  startedAt: number;
}

interface QuestionClaims {
  v: 1;
  a: string;
  i: number;
  servedAt: number;
}

interface ReceiptClaims {
  v: 1;
  a: string;
  i: number;
  choice: number | null;
  elapsedMs: number;
}

type Generated =
  | { game: "seven-letters"; content: SevenLettersContent; solution: SevenLettersSolution }
  | { game: "five-questions"; content: FiveQuestionsContent; solution: FiveQuestionsSolution }
  | { game: "reflexes"; content: ReflexesContent | LargadaContent; solution: null }
  | { game: "sequence"; content: SequenceContent; solution: null };

const CATEGORY_LABELS: Record<TriviaCategory, string> = {
  argentina: "Argentina",
  football: "Fútbol",
  geography: "Geografía",
  history: "Historia",
  general: "Cultura general",
  science: "Ciencia",
  entertainment: "Entretenimiento",
};

/**
 * "Diez Letras" (10 letters, fixed points) for the daily challenge from this
 * game date on; earlier days keep "Siete Letras", so a day's challenge never
 * changes after it started. Practice always uses the current rules.
 */
const TEN_LETTERS_FROM = "2026-10-04";

function buildEngines() {
  return {
    "seven-letters": createSevenLetters(getSevenLettersDictionary(), TEN_LETTERS_RULES),
    "five-questions": createFiveQuestions(TRIVIA_QUESTIONS),
    reflexes: createReflexes(),
    sequence: createSequence(),
  };
}

/** Largada replaced the color-change reflexes game (see `usesLargada`). */
const largada = createLargada();
const isLargada = (content: ReflexesContent | LargadaContent): content is LargadaContent => "version" in content && content.version === "largada";

type Engines = ReturnType<typeof buildEngines>;
let engines: Engines | undefined;
let sevenLettersEngine: Engines["seven-letters"] | undefined;
const getEngines = () => (engines ??= buildEngines());

function usesSevenLetters(claims: Pick<AttemptClaims, "mode" | "date">): boolean {
  return claims.mode === "daily" && claims.date < TEN_LETTERS_FROM;
}

/** The engines for an attempt, with the letters game its date had. */
function enginesFor(claims: Pick<AttemptClaims, "mode" | "date">): Engines {
  const all = getEngines();
  if (!usesSevenLetters(claims)) return all;
  sevenLettersEngine ??= createSevenLetters(getSevenLettersDictionary(), SEVEN_LETTERS_RULES);
  return { ...all, "seven-letters": sevenLettersEngine };
}

const cache = new Map<string, Generated>();
const CACHE_LIMIT = 500;

function rngsFor(claims: AttemptClaims): GameRngs {
  if (claims.mode === "daily") return dailyRngs(challengeSecret(), claims.date, claims.slot, claims.user);
  if (!claims.seed) throw new HttpError(400, "missing-seed");
  return practiceRngs(claims.seed);
}

function generate(claims: AttemptClaims): Generated {
  // The letters game only uses the shared seed: one entry per day and slot is enough.
  const player = claims.game === "seven-letters" ? "" : `:${claims.user}`;
  const key = claims.mode === "daily" ? `d:${claims.date}:${claims.slot}${player}` : `p:${claims.seed}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const all = enginesFor(claims);
  const rngs = rngsFor(claims);
  let generated: Generated;
  switch (claims.game) {
    case "seven-letters":
      generated = { game: claims.game, ...all[claims.game].generate(rngs) };
      break;
    case "five-questions":
      generated = { game: claims.game, ...all[claims.game].generate(rngs) };
      break;
    case "reflexes":
      generated = { game: claims.game, ...(usesLargada(claims.mode, claims.date) ? largada : all[claims.game]).generate(rngs) };
      break;
    case "sequence":
      generated = { game: claims.game, ...all[claims.game].generate(rngs) };
      break;
  }
  cache.set(key, generated);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  return generated;
}

function startView(generated: Generated): StartView {
  switch (generated.game) {
    case "seven-letters":
      return {
        game: generated.game,
        letters: generated.content.letters,
        durationMs: generated.content.durationMs,
        minWordLength: generated.content.minWordLength,
        targetPoints: generated.solution.targetPoints,
      };
    case "five-questions":
      return {
        game: generated.game,
        questionCount: generated.content.questions.length,
        secondsPerQuestion: generated.content.secondsPerQuestion,
      };
    case "reflexes": {
      const { content } = generated;
      if (isLargada(content)) {
        return { game: generated.game, version: "largada", lights: content.lights, lightMs: content.lightMs, delaysMs: content.delaysMs, maxReactionMs: content.maxReactionMs };
      }
      return { game: generated.game, delaysMs: content.delaysMs, maxReactionMs: content.maxReactionMs };
    }
    case "sequence":
      return {
        game: generated.game,
        pads: generated.content.pads,
        startLength: generated.content.startLength,
        showMsPerItem: generated.content.showMsPerItem,
        sequence: generated.content.sequence.slice(0, generated.content.startLength),
      };
  }
}

export type StartInput = { mode: "daily"; slot: number } | { mode: "practice"; game: GameId };

/** Who plays: the browser, and the account when signed in. */
export interface Player {
  device: string;
  account?: string | null;
}

export function startAttempt(input: StartInput, player: Player, now = Date.now()) {
  const date = toGameDate(new Date(now));
  const who = { user: player.account ?? player.device, device: player.device, ...(player.account ? { account: player.account } : {}) };
  let claims: AttemptClaims;
  if (input.mode === "daily") {
    const game = dailyLineup(date)[input.slot];
    if (!game) throw new HttpError(400, "invalid-slot");
    claims = { v: 1, id: randomUUID(), mode: "daily", game, date, slot: input.slot, ...who, startedAt: now };
  } else {
    claims = { v: 1, id: randomUUID(), mode: "practice", game: input.game, date, slot: -1, ...who, seed: randomUUID(), startedAt: now };
  }
  return { token: signToken(claims), claims, view: startView(generate(claims)) };
}

/** How long an attempt stays playable: the game's maximum length plus two minutes of slack. */
export function attemptLimitMs(game: GameId): number {
  const maxDurationMs = game === "reflexes" ? Math.max(getEngines().reflexes.maxDurationMs, largada.maxDurationMs) : getEngines()[game].maxDurationMs;
  return maxDurationMs + 120_000;
}

export function isExpired(attempt: { game: GameId; startedAt: number }, now = Date.now()): boolean {
  return now - attempt.startedAt > attemptLimitMs(attempt.game);
}

/** Checks an attempt token's signature, without looking at its age. */
export function readAttemptClaims(token: unknown): AttemptClaims {
  const claims = readToken<AttemptClaims>(token);
  if (!claims || claims.v !== 1) throw new HttpError(401, "invalid-token");
  return claims;
}

/** Validates an attempt token that is still playable. */
export function readAttempt(token: unknown, now = Date.now()): AttemptClaims {
  const claims = readAttemptClaims(token);
  if (isExpired(claims, now)) throw new HttpError(410, "expired");
  return claims;
}

function generatedFor<G extends GameId>(claims: AttemptClaims, game: G): Extract<Generated, { game: G }> {
  const generated = generate(claims);
  if (generated.game !== game) throw new HttpError(400, "wrong-game");
  return generated as Extract<Generated, { game: G }>;
}

export function checkWord(claims: AttemptClaims, raw: string): WordCheckResponse {
  const { content, solution } = generatedFor(claims, "seven-letters");
  const word = normalizeWord(raw) ?? "";
  if (word.length < content.minWordLength) return { word, status: "too-short", points: 0 };
  if (!solution.words.includes(word)) return { word, status: "invalid", points: 0 };
  const rules = usesSevenLetters(claims) ? SEVEN_LETTERS_RULES : TEN_LETTERS_RULES;
  return { word, status: "valid", points: sevenLettersWordPoints(word, rules) };
}

/** `servedAt` is when the question was first shown in this attempt: its clock runs from then. */
export function serveQuestion(claims: AttemptClaims, index: number, servedAt = Date.now()): QuestionResponse {
  const { content } = generatedFor(claims, "five-questions");
  const question = content.questions[index];
  if (!question) throw new HttpError(400, "invalid-question");
  return {
    index,
    prompt: question.prompt,
    category: CATEGORY_LABELS[question.category],
    options: question.options,
    questionToken: signToken({ v: 1, a: claims.id, i: index, servedAt } satisfies QuestionClaims),
  };
}

export function answerQuestion(claims: AttemptClaims, questionToken: string, choice: number | null, now = Date.now()): AnswerResponse {
  const question = readToken<QuestionClaims>(questionToken);
  if (!question || question.v !== 1 || question.a !== claims.id) throw new HttpError(401, "invalid-question-token");
  const { content, solution } = generatedFor(claims, "five-questions");
  const correctChoice = solution.correct[question.i];
  if (correctChoice === undefined) throw new HttpError(400, "invalid-question");
  const elapsedMs = Math.max(0, now - question.servedAt);
  const limitMs = content.secondsPerQuestion * 1000 + FIVE_QUESTIONS_RULES.networkGraceMs;
  const correct = choice !== null && elapsedMs <= limitMs && choice === correctChoice;
  return {
    correct,
    correctChoice,
    points: correct ? fiveQuestionsPoints(elapsedMs) : 0,
    seconds: choice === null ? null : answerSeconds(elapsedMs),
    receipt: signToken({ v: 1, a: claims.id, i: question.i, choice, elapsedMs } satisfies ReceiptClaims),
  };
}

/** Releases level `level` of Secuencia once the previous level's inputs are right. */
export function nextLevel(claims: AttemptClaims, level: number, inputs: number[]): LevelResponse {
  const { content } = generatedFor(claims, "sequence");
  const previousLength = content.startLength + level - 2;
  const expected = content.sequence.slice(0, previousLength);
  const maxLevel = SEQUENCE_RULES.maxLength - content.startLength + 1;
  const ok =
    level >= 2 &&
    level <= maxLevel &&
    inputs.length === previousLength &&
    inputs.every((pad, i) => pad === expected[i]);
  if (!ok) throw new HttpError(400, "wrong-inputs");
  return { level, sequence: content.sequence.slice(0, previousLength + 1) };
}

const sevenLettersLog = z.object({
  submissions: z.array(z.object({ word: z.string().max(20), atMs: z.number() })).max(300),
});
const fiveQuestionsLog = z.object({ receipts: z.array(z.string().max(2000)).max(5) });
const reflexesLog = z.object({
  rounds: z.array(z.object({ reactionMs: z.number().nullable(), falseStart: z.boolean() })).max(5),
});
const sequenceLog = z.object({
  levels: z.array(z.object({ inputs: z.array(z.number().int()).max(40), durationMs: z.number() })).max(30),
});

function reportFlags(claims: AttemptClaims, flags: Flag[]) {
  if (flags.length === 0) return;
  console.warn(
    JSON.stringify({ event: "suspicious-attempt", mode: claims.mode, game: claims.game, date: claims.date, user: claims.user, flags }),
  );
}

export function gradeAttempt(claims: AttemptClaims, log: unknown, now = Date.now()): { result: ChallengeResult; flags: Flag[] } {
  const all = enginesFor(claims);
  const context = { serverElapsedMs: now - claims.startedAt };
  const generated = generate(claims);
  let flags: Flag[] = [];

  const graded = ((): ChallengeResult => {
    switch (generated.game) {
      case "seven-letters": {
        const result = all["seven-letters"].evaluate(generated.content, generated.solution, sevenLettersLog.parse(log), context);
        flags = result.flags;
        let points = 0;
        let previous = 0;
        const words = result.accepted.map((entry) => {
          points += entry.points;
          const score = sevenLettersScore(points, generated.solution.targetPoints);
          const delta = score - previous;
          previous = score;
          return { word: entry.word, delta };
        });
        const longest = result.accepted.reduce<string | null>(
          (best, entry) => (entry.word.length > (best?.length ?? 0) ? entry.word : best),
          null,
        );
        return {
          game: "seven-letters",
          score: result.score,
          words,
          longest,
          fullWords: generated.solution.fullWords,
          foundFullWord: result.foundFullWord,
        };
      }
      case "five-questions": {
        const { receipts } = fiveQuestionsLog.parse(log);
        const answers: Array<{ choice: number | null; elapsedMs: number }> = generated.content.questions.map(() => ({
          choice: null,
          elapsedMs: Number.POSITIVE_INFINITY,
        }));
        for (const receipt of receipts) {
          const claim = readToken<ReceiptClaims>(receipt);
          if (claim?.v === 1 && claim.a === claims.id && claim.i >= 0 && claim.i < answers.length) {
            answers[claim.i] = { choice: claim.choice, elapsedMs: claim.elapsedMs };
          }
        }
        const result = all["five-questions"].evaluate(generated.content, generated.solution, { answers }, context);
        flags = result.flags;
        return {
          game: "five-questions",
          score: result.score,
          correctCount: result.correctCount,
          questions: result.questions.map((question) => ({
            correct: question.correct,
            points: question.points,
            seconds: question.elapsedMs === null ? null : answerSeconds(question.elapsedMs),
          })),
        };
      }
      case "reflexes": {
        const { content } = generated;
        if (isLargada(content)) {
          const result = largada.evaluate(content, null, reflexesLog.parse(log), context);
          flags = result.flags;
          return {
            game: "reflexes",
            version: "largada",
            score: result.score,
            averageMs: result.averageMs,
            bestMs: result.bestMs,
            rounds: result.rounds.map((round) => ({ outcome: round.outcome, reactionMs: round.reactionMs })),
          };
        }
        const result = all.reflexes.evaluate(content, null, reflexesLog.parse(log), context);
        flags = result.flags;
        return {
          game: "reflexes",
          score: result.score,
          averageMs: result.averageMs,
          rounds: result.rounds.map((round) => ({ outcome: round.outcome, reactionMs: round.reactionMs })),
        };
      }
      case "sequence": {
        const result = all.sequence.evaluate(generated.content, null, sequenceLog.parse(log), context);
        flags = result.flags;
        return {
          game: "sequence",
          score: result.score,
          levelReached: result.levelReached,
          longestSequence: result.longestSequence,
        };
      }
    }
  })();
  reportFlags(claims, flags);
  return { result: graded, flags };
}
