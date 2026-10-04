import { FIVE_QUESTIONS_RULES, answerSeconds, fiveQuestionsPoints } from './games/five-questions';
import { LARGADA_RULES, largadaScore } from './games/largada';
import { SEQUENCE_RULES, sequenceLengthForLevel } from './games/sequence';
import { TEN_LETTERS_RULES, sevenLettersWordPoints } from './games/seven-letters';
import { WATER_SORT_RULES } from './games/water-sort';
import type { GameId } from './types';

/*
 * Live battles (docs/PLAN.md §8): a room of friends plays the same game at
 * the same time, each on their own phone. The server runs no process of
 * its own: every request works out where a match is from its start time
 * and the moves so far, with these functions. Times are epoch milliseconds
 * of the server's clock, which every phone syncs to.
 */

/** The games a battle can be of today; the rest arrive later. */
export const BATTLE_GAMES = ['reflexes', 'five-questions', 'seven-letters', 'sequence', 'water-sort'] as const satisfies readonly GameId[];
export type BattleGame = (typeof BATTLE_GAMES)[number];

export const isBattleGame = (game: string): game is BattleGame => (BATTLE_GAMES as readonly string[]).includes(game);

export const BATTLE_RULES = {
  minPlayers: 2,
  maxPlayers: 10,
  /** "3, 2, 1" on every phone before the first question or the first lights. */
  countdownMs: 3_500,
  trivia: {
    questions: FIVE_QUESTIONS_RULES.difficultyPlan.length,
    answerMs: FIVE_QUESTIONS_RULES.secondsPerQuestion * 1000,
    /** An answer sent at the last moment still arrives. */
    graceMs: 600,
    /** The right answer and the table stay on screen this long. */
    revealMs: 5_000,
    /** A phone may ask for a question this early: clocks never match exactly. */
    earlyMs: 400,
  },
  largada: {
    starts: LARGADA_RULES.starts,
    /** The first light goes on this long after a start begins; then one per second. */
    firstLightMs: 800,
    /** A start waits for the slowest after the signal: the longest reaction that counts, plus the network. */
    waitMs: LARGADA_RULES.maxReactionMs + 800,
    /** From closing a start to the race on every phone, so all of them hear about it. */
    raceLeadMs: 700,
    /** The race, the arrival and the table before the next lights. */
    raceShowMs: 4_800,
    /** A reaction can't reach the server before it happened, give or take this much clock. */
    clockToleranceMs: 300,
  },
  letters: {
    durationMs: TEN_LETTERS_RULES.durationMs,
    /** A word sent at the last moment still arrives. */
    graceMs: TEN_LETTERS_RULES.lateGraceMs,
    /** "¡Tiempo!" on every phone, before the podium. */
    timeUpMs: 2_500,
    /** The letters reach a phone this early, so they show right when the countdown ends. */
    earlyMs: 400,
    maxWords: TEN_LETTERS_RULES.maxSubmissions,
    /** Finding more than this share of a big set is suspicious, as in the daily challenge. */
    suspiciousShare: TEN_LETTERS_RULES.suspiciousFoundShare,
  },
  sequence: {
    /** From a round opening to its first color, as in the daily challenge. */
    leadMs: 500,
    showMsPerItem: SEQUENCE_RULES.showMsPerItem,
    /** To repeat it: this long, plus `answerPerItemMs` for each color (decided on 4/10/2026). */
    answerBaseMs: 3_000,
    answerPerItemMs: 1_000,
    /** A repetition sent at the last moment still arrives. */
    graceMs: 600,
    /** Who's out, before the next round. */
    revealMs: 2_500,
    /** The colors reach a phone this early. */
    earlyMs: 400,
    /** Tiebreaks in a row before the tied ones share first place, so a match always ends. */
    maxReplays: 3,
    maxLevel: SEQUENCE_RULES.maxLength - SEQUENCE_RULES.startLength + 1,
    /** Faster than this per color, since the last one showed, is not humanly possible. */
    minTapMs: SEQUENCE_RULES.minTapMs,
    /** A repetition can't reach the server before it was possible, give or take this much clock. */
    clockToleranceMs: 300,
  },
  tubitos: {
    /** The daily challenge's three boards: 6, 8 and 10 tubes. */
    boards: WATER_SORT_RULES.levels,
    /** Each board's most time: when the daily challenge's clock stops adding points (decided on 4/10/2026). */
    maxMs: WATER_SORT_RULES.levels.map((level) => level.badSeconds * 1000),
    /** The solving steps can arrive a moment late. */
    graceMs: 2_000,
    /** Each board's table, before the next one. */
    revealMs: 5_000,
    /** A board reaches a phone this early. */
    earlyMs: 400,
  },
  /** A room nobody opened for this long closes. */
  idleMs: 20 * 60_000,
  /** Someone is connected while their phone asks at least this often. */
  onlineMs: 15_000,
} as const;

/** Who plays a match, and when they left the room (null: still in). */
export interface RosterEntry {
  userId: string;
  leftAt: number | null;
}

/**
 * When a round closes: as soon as everyone still in has played (someone who
 * left during it doesn't hold it up), or at its deadline. Null while it's
 * still waiting for someone.
 */
function closingTime(opensAt: number, deadline: number, roster: readonly RosterEntry[], played: ReadonlyMap<string, number>, now: number): number | null {
  let last = opensAt;
  for (const entry of roster) {
    const at = played.get(entry.userId);
    if (at !== undefined) {
      last = Math.max(last, at);
    } else if (entry.leftAt !== null && entry.leftAt <= now) {
      last = Math.max(last, entry.leftAt);
    } else {
      return now >= deadline ? deadline : null;
    }
  }
  return Math.min(last, deadline);
}

/* ───────────── Cinco Preguntas ───────────── */

export interface TriviaMove {
  userId: string;
  round: number;
  /** When the server first gave this player the question: their clock runs from then. */
  shownAt: number | null;
  answeredAt: number | null;
  /** The option in the question's own order, where 0 is the right one. */
  choice: number | null;
}

export interface TriviaRoundFlow {
  index: number;
  opensAt: number;
  /** When it closed; while open, the latest it can close. */
  closesAt: number;
  closed: boolean;
  /** When the next question (or the podium) comes; null while open. */
  nextAt: number | null;
}

export interface MatchFlow<Round> {
  /** Up to the current one. */
  rounds: Round[];
  /** When the podium shows; null until the last round closed. */
  endsAt: number | null;
}

/**
 * The same question for everyone: it closes when everyone answered or the
 * time ran out, and the right answer shows with the table until the next one.
 */
export function triviaFlow(input: { startsAt: number; roster: readonly RosterEntry[]; moves: readonly TriviaMove[]; now: number }): MatchFlow<TriviaRoundFlow> {
  const { questions, answerMs, graceMs, revealMs } = BATTLE_RULES.trivia;
  const rounds: TriviaRoundFlow[] = [];
  let opensAt = input.startsAt;
  for (let index = 0; index < questions && input.now >= opensAt; index++) {
    const deadline = opensAt + answerMs + graceMs;
    const answered = new Map<string, number>();
    for (const move of input.moves) {
      if (move.round === index && move.answeredAt !== null && move.answeredAt <= deadline) answered.set(move.userId, move.answeredAt);
    }
    const closedAt = closingTime(opensAt, deadline, input.roster, answered, input.now);
    if (closedAt === null) {
      rounds.push({ index, opensAt, closesAt: deadline, closed: false, nextAt: null });
      return { rounds, endsAt: null };
    }
    const nextAt = closedAt + revealMs;
    rounds.push({ index, opensAt, closesAt: closedAt, closed: true, nextAt });
    opensAt = nextAt;
  }
  const last = rounds.at(-1);
  return { rounds, endsAt: rounds.length === questions && last?.closed ? last.nextAt : null };
}

export interface TriviaAnswer {
  answered: boolean;
  correct: boolean;
  points: number;
  /** Whole seconds, as the player sees them. */
  seconds: number | null;
  elapsedMs: number | null;
}

/** How one answer went, with the same points as the game: faster scores more. */
export function triviaAnswer(move: TriviaMove | undefined): TriviaAnswer {
  if (!move || move.answeredAt === null || move.shownAt === null || move.choice === null) {
    return { answered: false, correct: false, points: 0, seconds: null, elapsedMs: null };
  }
  const elapsedMs = Math.max(0, move.answeredAt - move.shownAt);
  const inTime = elapsedMs <= BATTLE_RULES.trivia.answerMs + FIVE_QUESTIONS_RULES.networkGraceMs;
  const correct = inTime && move.choice === 0;
  return { answered: true, correct, points: correct ? fiveQuestionsPoints(elapsedMs) : 0, seconds: answerSeconds(elapsedMs), elapsedMs };
}

/* ───────────── Largada ───────────── */

export interface LargadaMove {
  userId: string;
  round: number;
  /** When the server got it. */
  at: number;
  reactionMs: number | null;
  falseStart: boolean;
}

export interface LargadaRoundFlow {
  index: number;
  /** When this start begins: the first light goes on a little after. */
  lightsAt: number;
  /** When the five lights go out, on every phone at once. */
  signalAt: number;
  /** The latest a start can arrive. */
  deadline: number;
  closedAt: number | null;
  /** When the cars race on every phone. */
  raceAt: number | null;
  /** When the next lights (or the podium) come. */
  nextAt: number | null;
}

/** The same lights for everyone; a start closes when all of them tapped, or after the slowest that counts. */
export function largadaFlow(input: {
  startsAt: number;
  delaysMs: readonly number[];
  roster: readonly RosterEntry[];
  moves: readonly LargadaMove[];
  now: number;
}): MatchFlow<LargadaRoundFlow> {
  const { firstLightMs, waitMs, raceLeadMs, raceShowMs, starts } = BATTLE_RULES.largada;
  const rounds: LargadaRoundFlow[] = [];
  let lightsAt = input.startsAt;
  for (let index = 0; index < starts && input.now >= lightsAt; index++) {
    const signalAt = lightsAt + firstLightMs + (LARGADA_RULES.lights - 1) * LARGADA_RULES.lightMs + (input.delaysMs[index] ?? LARGADA_RULES.minDelayMs);
    const deadline = signalAt + waitMs;
    const played = new Map<string, number>();
    for (const move of input.moves) {
      if (move.round === index && move.at <= deadline) played.set(move.userId, move.at);
    }
    const closing = closingTime(lightsAt, deadline, input.roster, played, input.now);
    if (closing === null) {
      rounds.push({ index, lightsAt, signalAt, deadline, closedAt: null, raceAt: null, nextAt: null });
      return { rounds, endsAt: null };
    }
    // Even if all of them jumped, the lights go out before the race.
    const closedAt = Math.max(closing, signalAt);
    const raceAt = closedAt + raceLeadMs;
    const nextAt = raceAt + raceShowMs;
    rounds.push({ index, lightsAt, signalAt, deadline, closedAt, raceAt, nextAt });
    lightsAt = nextAt;
  }
  const last = rounds.at(-1);
  return { rounds, endsAt: rounds.length === starts && last?.nextAt ? last.nextAt : null };
}

export type LargadaOutcome = 'hit' | 'miss' | 'false-start' | 'impossible';

/** What a start counts for the average, with the game's penalties: jumping 450 ms, not tapping 700. */
export function largadaStart(move: LargadaMove | undefined): { outcome: LargadaOutcome; reactionMs: number | null; countedMs: number } {
  const rules = LARGADA_RULES;
  if (!move) return { outcome: 'miss', reactionMs: null, countedMs: rules.missMs };
  if (move.falseStart) return { outcome: 'false-start', reactionMs: null, countedMs: rules.falseStartMs };
  const reactionMs = move.reactionMs === null || !Number.isFinite(move.reactionMs) ? null : Math.round(move.reactionMs);
  if (reactionMs === null || reactionMs > rules.maxReactionMs) return { outcome: 'miss', reactionMs, countedMs: rules.missMs };
  if (reactionMs < rules.minHumanReactionMs) return { outcome: 'impossible', reactionMs, countedMs: rules.falseStartMs };
  return { outcome: 'hit', reactionMs, countedMs: reactionMs };
}

/* ───────────── Diez Letras ───────────── */

/** A word the server accepted: valid, new for this player and in time. */
export interface LettersWord {
  userId: string;
  word: string;
  /** When the server got it. */
  at: number;
}

export interface LettersRoundFlow {
  index: number;
  opensAt: number;
  /** When it closed; while open, the latest it can (the 90 seconds and the grace). */
  closesAt: number;
  closed: boolean;
  /** When the podium comes; null while open. */
  nextAt: number | null;
}

/** The same letters for everyone, in the same 90 seconds: one round, which closes early only if everyone left. */
export function lettersFlow(input: { startsAt: number; roster: readonly RosterEntry[]; now: number }): MatchFlow<LettersRoundFlow> {
  const { durationMs, graceMs, timeUpMs } = BATTLE_RULES.letters;
  const opensAt = input.startsAt;
  if (input.now < opensAt) return { rounds: [], endsAt: null };
  const deadline = opensAt + durationMs + graceMs;
  const closedAt = closingTime(opensAt, deadline, input.roster, new Map(), input.now);
  if (closedAt === null) return { rounds: [{ index: 0, opensAt, closesAt: deadline, closed: false, nextAt: null }], endsAt: null };
  const nextAt = closedAt + timeUpMs;
  return { rounds: [{ index: 0, opensAt, closesAt: closedAt, closed: true, nextAt }], endsAt: nextAt };
}

/** A word's points, the game's own: the longer the more, and the one with all ten letters has its prize. */
export const lettersPoints = (word: string): number => sevenLettersWordPoints(word, TEN_LETTERS_RULES);

/* ───────────── Secuencia ───────────── */

/** A repetition the server got and checked. */
export interface SequenceMove {
  userId: string;
  round: number;
  /** When the server got it. */
  at: number;
  /** The whole sequence, right. */
  correct: boolean;
}

export interface SequenceRoundFlow {
  index: number;
  /** Its sequence has `length` colors. A tiebreak plays the same level again. */
  level: number;
  length: number;
  /** Everyone left got the last round wrong: they play it again, only them. */
  replay: boolean;
  /** Who plays it: whoever is still in. */
  players: string[];
  /** The first color shows `leadMs` after; then one every `showMsPerItem`. */
  showAt: number;
  /** The last color is over: repeating starts. */
  inputAt: number;
  /** The latest a repetition counts. */
  deadline: number;
  closedAt: number | null;
  /** Once closed: who repeated it right, and who's out with it. */
  passed: string[] | null;
  out: string[] | null;
  /** When the next round (or the podium) comes. */
  nextAt: number | null;
}

/** How long there is to repeat a sequence of `length` colors: 3 s plus 1 s per color. */
export function sequenceAnswerMs(length: number): number {
  const { answerBaseMs, answerPerItemMs } = BATTLE_RULES.sequence;
  return answerBaseMs + answerPerItemMs * length;
}

/**
 * By rounds, with the same sequence for everyone at once. Whoever gets it
 * wrong, or doesn't answer in time, is out; it ends when one is left. If
 * everyone still in gets the same round wrong, the ones who tried play it
 * again (a tiebreak) until one is left, or they share first place after
 * `maxReplays` of them.
 */
export function sequenceFlow(input: { startsAt: number; roster: readonly RosterEntry[]; moves: readonly SequenceMove[]; now: number }): MatchFlow<SequenceRoundFlow> {
  const rules = BATTLE_RULES.sequence;
  const leftAt = new Map(input.roster.map((entry) => [entry.userId, entry.leftAt]));
  const rounds: SequenceRoundFlow[] = [];
  let players = input.roster.map((entry) => entry.userId);
  let level = 1;
  let replays = 0;
  let showAt = input.startsAt;
  for (let index = 0; input.now >= showAt; index++) {
    const length = sequenceLengthForLevel(level);
    const inputAt = showAt + rules.leadMs + length * rules.showMsPerItem;
    const deadline = inputAt + sequenceAnswerMs(length) + rules.graceMs;
    const answers = new Map<string, SequenceMove>();
    for (const move of input.moves) {
      if (move.round === index && move.at <= deadline && players.includes(move.userId)) answers.set(move.userId, move);
    }
    const playing = input.roster.filter((entry) => players.includes(entry.userId));
    const closing = closingTime(showAt, deadline, playing, new Map([...answers].map(([id, move]) => [id, move.at])), input.now);
    const round = { index, level, length, replay: replays > 0, players, showAt, inputAt, deadline };
    if (closing === null) {
      rounds.push({ ...round, closedAt: null, passed: null, out: null, nextAt: null });
      return { rounds, endsAt: null };
    }
    // Even if everyone answered early (which counts as wrong), the colors finish first.
    const closedAt = Math.max(closing, inputAt);
    const stays = (id: string) => {
      const left = leftAt.get(id);
      return left === null || left === undefined || left > closedAt;
    };
    const passed = players.filter((id) => stays(id) && answers.get(id)?.correct === true);
    const missed = players.filter((id) => stays(id) && answers.get(id)?.correct === false);
    let next: string[];
    let ends: boolean;
    if (passed.length > 0) {
      next = passed;
      ends = passed.length === 1 || level >= rules.maxLevel;
      level += 1;
      replays = 0;
    } else if (missed.length >= 2 && replays < rules.maxReplays) {
      next = missed;
      ends = false;
      replays += 1;
    } else {
      // Nobody got it: the one who tried is left, or they share it once the tiebreaks ran out.
      next = missed;
      ends = true;
    }
    const nextAt = closedAt + rules.revealMs;
    rounds.push({ ...round, closedAt, passed, out: players.filter((id) => !next.includes(id)), nextAt });
    if (ends) return { rounds, endsAt: nextAt };
    players = next;
    showAt = nextAt;
  }
  return { rounds, endsAt: null };
}

/** Whether a repetition is the sequence, and how many colors it got right before the first mistake. */
export function sequenceCheck(expected: readonly number[], inputs: readonly number[]): { correct: boolean; right: number } {
  let right = 0;
  while (right < inputs.length && right < expected.length && inputs[right] === expected[right]) right++;
  return { correct: inputs.length === expected.length && right === expected.length, right };
}

/* ───────────── Tubitos ───────────── */

/** A board someone solved, when the server got it. Unsolved boards have none. */
export interface TubitosMove {
  userId: string;
  round: number;
  at: number;
}

/** How a solved board scored, worked out by the server from its steps. */
export interface TubitosResult {
  userId: string;
  round: number;
  points: number;
  moves: number;
  timeMs: number;
}

export interface TubitosRoundFlow {
  index: number;
  opensAt: number;
  /** The clock shown runs out here. */
  answerUntil: number;
  /** When it closed; while open, the latest it can. */
  closesAt: number;
  closed: boolean;
  /** When the next board (or the podium) comes; null while open. */
  nextAt: number | null;
}

/** The same three boards for everyone, one after the other: each closes when all solved it, or at its most time. */
export function tubitosFlow(input: { startsAt: number; roster: readonly RosterEntry[]; moves: readonly TubitosMove[]; now: number }): MatchFlow<TubitosRoundFlow> {
  const { boards, maxMs, graceMs, revealMs } = BATTLE_RULES.tubitos;
  const rounds: TubitosRoundFlow[] = [];
  let opensAt = input.startsAt;
  for (let index = 0; index < boards.length && input.now >= opensAt; index++) {
    const answerUntil = opensAt + (maxMs[index] ?? 0);
    const deadline = answerUntil + graceMs;
    const solved = new Map<string, number>();
    for (const move of input.moves) {
      if (move.round === index && move.at <= deadline) solved.set(move.userId, move.at);
    }
    const closedAt = closingTime(opensAt, deadline, input.roster, solved, input.now);
    if (closedAt === null) {
      rounds.push({ index, opensAt, answerUntil, closesAt: deadline, closed: false, nextAt: null });
      return { rounds, endsAt: null };
    }
    const nextAt = closedAt + revealMs;
    rounds.push({ index, opensAt, answerUntil, closesAt: closedAt, closed: true, nextAt });
    opensAt = nextAt;
  }
  const last = rounds.at(-1);
  return { rounds, endsAt: rounds.length === boards.length && last?.closed ? last.nextAt : null };
}

/* ───────────── The table ───────────── */

export interface BattleStanding {
  userId: string;
  /** A tie shares the place: 1, 1, 3. */
  place: number;
  score: number;
  /** Cinco Preguntas: right answers. */
  correct?: number;
  /** Largada: the average with the penalties, and the best start. */
  averageMs?: number | null;
  bestMs?: number | null;
  /** Diez Letras: words found. */
  words?: number;
  /** Secuencia: still in (or last one standing). */
  alive?: boolean;
  /** Tubitos: boards solved, and their time added up. */
  solved?: number;
  timeMs?: number;
}

function withPlaces<T>(rows: readonly T[], compare: (a: T, b: T) => number): (T & { place: number })[] {
  const sorted = [...rows].sort(compare);
  return sorted.map((row) => ({ ...row, place: 1 + sorted.filter((other) => compare(other, row) < 0).length }));
}

/** After `closed` questions: by points; a tie goes to whoever answered right faster. */
export function triviaStandings(roster: readonly RosterEntry[], moves: readonly TriviaMove[], closed: number): BattleStanding[] {
  const rows = roster.map(({ userId }) => {
    let score = 0;
    let correct = 0;
    let time = 0;
    for (let round = 0; round < closed; round++) {
      const answer = triviaAnswer(moves.find((move) => move.userId === userId && move.round === round));
      score += answer.points;
      if (answer.correct) {
        correct++;
        time += answer.elapsedMs ?? 0;
      }
    }
    return { userId, score, correct, time };
  });
  return withPlaces(rows, (a, b) => b.score - a.score || a.time - b.time).map((row) => ({ userId: row.userId, place: row.place, score: row.score, correct: row.correct }));
}

/** After `closed` starts: by the average (the lower, the more points); a tie goes to the best start. */
export function largadaStandings(roster: readonly RosterEntry[], moves: readonly LargadaMove[], closed: number): BattleStanding[] {
  const rows = roster.map(({ userId }) => {
    const starts = Array.from({ length: closed }, (_, round) => largadaStart(moves.find((move) => move.userId === userId && move.round === round)));
    const averageMs = starts.length > 0 ? Math.round(starts.reduce((sum, start) => sum + start.countedMs, 0) / starts.length) : null;
    const hits = starts.flatMap((start) => (start.outcome === 'hit' && start.reactionMs !== null ? [start.reactionMs] : []));
    return { userId, score: averageMs === null ? 0 : largadaScore(averageMs), averageMs, bestMs: hits.length > 0 ? Math.min(...hits) : null };
  });
  const big = Number.MAX_SAFE_INTEGER;
  return withPlaces(rows, (a, b) => (a.averageMs ?? big) - (b.averageMs ?? big) || (a.bestMs ?? big) - (b.bestMs ?? big));
}

/**
 * By points, without the daily challenge's 1.000 cap, so whoever finds more
 * always gets ahead; a tie goes to whoever got there first.
 */
export function lettersStandings(roster: readonly RosterEntry[], words: readonly LettersWord[]): BattleStanding[] {
  const rows = roster.map(({ userId }) => {
    const found = words.filter((one) => one.userId === userId);
    return {
      userId,
      score: found.reduce((sum, one) => sum + lettersPoints(one.word), 0),
      words: found.length,
      reachedAt: found.reduce((last, one) => Math.max(last, one.at), Number.NEGATIVE_INFINITY),
    };
  });
  return withPlaces(rows, (a, b) => b.score - a.score || (a.words > 0 && b.words > 0 ? a.reachedAt - b.reachedAt : 0)).map((row) => ({
    userId: row.userId,
    place: row.place,
    score: row.score,
    words: row.words,
  }));
}

/**
 * Whoever lasted longer goes first: the ones still in (or the last one
 * standing), then by the round each one went out in. The points are the
 * levels each one repeated right.
 */
export function sequenceStandings(roster: readonly RosterEntry[], flow: MatchFlow<SequenceRoundFlow>): BattleStanding[] {
  const still = Number.MAX_SAFE_INTEGER;
  const rows = roster.map(({ userId }) => {
    let levels = 0;
    let outIn = still;
    for (const round of flow.rounds) {
      if (round.passed?.includes(userId)) levels = Math.max(levels, round.level);
      if (outIn === still && round.out?.includes(userId)) outIn = round.index;
    }
    return { userId, levels, outIn };
  });
  return withPlaces(rows, (a, b) => b.outIn - a.outIn).map((row) => ({
    userId: row.userId,
    place: row.place,
    score: row.levels,
    alive: row.outIn === still,
  }));
}

/** After `closed` boards: by points, as in the daily challenge; a tie goes to whoever solved more, then faster. */
export function tubitosStandings(roster: readonly RosterEntry[], results: readonly TubitosResult[], closed: number): BattleStanding[] {
  const rows = roster.map(({ userId }) => {
    const mine = results.filter((one) => one.userId === userId && one.round < closed);
    return {
      userId,
      score: mine.reduce((sum, one) => sum + one.points, 0),
      solved: mine.length,
      time: mine.reduce((sum, one) => sum + one.timeMs, 0),
    };
  });
  return withPlaces(rows, (a, b) => b.score - a.score || b.solved - a.solved || a.time - b.time).map((row) => ({
    userId: row.userId,
    place: row.place,
    score: row.score,
    solved: row.solved,
    timeMs: row.time,
  }));
}

/** Who won: first place with points, once two or more played. A tie at the top gives it to each of them. */
export function battleWinners(standings: readonly BattleStanding[]): string[] {
  if (standings.length < BATTLE_RULES.minPlayers) return [];
  return standings.filter((row) => row.place === 1 && row.score > 0).map((row) => row.userId);
}
