import type { Flag, GameDefinition, GameResult } from '../types';
import type { ReflexesLog, ReflexesOutcome } from './reflexes';

/**
 * "Largada" (docs/PLAN.md §7), the reflexes game since it replaced the
 * color-change one: five red lights go on one per second and, after a
 * random wait, all go out together. Tap. Three starts; the score comes from
 * the average, where a jumped or a missed start counts as a slow one.
 */
export const LARGADA_RULES = {
  starts: 3,
  lights: 5,
  /** One light every second… */
  lightMs: 1_000,
  /** …and then a random wait before they all go out. Each player gets their own. */
  minDelayMs: 200,
  maxDelayMs: 3_000,
  /** Slower than this, the start is lost. */
  maxReactionMs: 1_500,
  /** Faster than this is not humanly possible: it counts as a jumped start and is flagged. */
  minHumanReactionMs: 100,
  /** 1.000 points at this average or faster… */
  fastMs: 200,
  /** …and two less for every millisecond above it (0 at 700 ms). */
  pointsPerMs: 2,
  /** What a jumped start and a missed one count for the average. */
  falseStartMs: 450,
  missMs: 700,
  /** Three hits this close to each other suggest a script. */
  minHumanSpreadMs: 3,
  /** Allowance when comparing against the server's clock. */
  clockToleranceMs: 1_000,
  /** The race and the result between starts, for the attempt's time limit. */
  raceMs: 4_000,
} as const;

/**
 * The daily challenge is Largada from this game date on, so a day's
 * challenge never changes after it started; earlier days keep the
 * color-change game. Practice is Largada already.
 */
export const LARGADA_FROM = '2026-10-04';

export function usesLargada(mode: 'daily' | 'practice', date: string): boolean {
  return mode === 'practice' || date >= LARGADA_FROM;
}

export interface LargadaContent {
  version: 'largada';
  lights: number;
  lightMs: number;
  /** The wait after the fifth light, for each start. */
  delaysMs: number[];
  maxReactionMs: number;
}

export interface LargadaRound {
  outcome: ReflexesOutcome;
  reactionMs: number | null;
  /** What the start adds to the average: the time, or the penalty. */
  countedMs: number;
}

export interface LargadaResult extends GameResult {
  rounds: LargadaRound[];
  /** The average the score comes from, penalties included. */
  averageMs: number;
  /** The fastest start that counted, or null. */
  bestMs: number | null;
}

/** 1.000 with an average of 200 ms or less, two points less per millisecond, 0 from 700 ms. */
export function largadaScore(averageMs: number): number {
  const { fastMs, pointsPerMs } = LARGADA_RULES;
  return Math.round(Math.min(1000, Math.max(0, 1000 - pointsPerMs * (averageMs - fastMs))));
}

function gradeRound(round: ReflexesLog['rounds'][number] | undefined, maxReactionMs: number): LargadaRound {
  const rules = LARGADA_RULES;
  if (!round) return { outcome: 'miss', reactionMs: null, countedMs: rules.missMs };
  if (round.falseStart) return { outcome: 'false-start', reactionMs: null, countedMs: rules.falseStartMs };
  const reactionMs = Number.isFinite(round.reactionMs) ? Math.round(round.reactionMs as number) : null;
  if (reactionMs === null || reactionMs > maxReactionMs) return { outcome: 'miss', reactionMs, countedMs: rules.missMs };
  if (reactionMs < rules.minHumanReactionMs) return { outcome: 'impossible', reactionMs, countedMs: rules.falseStartMs };
  return { outcome: 'hit', reactionMs, countedMs: reactionMs };
}

export function createLargada(): GameDefinition<LargadaContent, null, ReflexesLog, LargadaResult> {
  const rules = LARGADA_RULES;
  return {
    id: 'reflexes',
    category: 'skill',
    maxDurationMs: rules.starts * (rules.lights * rules.lightMs + rules.maxDelayMs + rules.maxReactionMs + rules.raceMs),

    generate({ player }) {
      return {
        content: {
          version: 'largada',
          lights: rules.lights,
          lightMs: rules.lightMs,
          delaysMs: Array.from({ length: rules.starts }, () => player.int(rules.minDelayMs, rules.maxDelayMs)),
          maxReactionMs: rules.maxReactionMs,
        },
        solution: null,
      };
    },

    evaluate(content, _solution, log, context = {}) {
      const rounds = content.delaysMs.map((_, index) => gradeRound(log.rounds[index], content.maxReactionMs));
      const averageMs = Math.round(rounds.reduce((sum, round) => sum + round.countedMs, 0) / rounds.length);
      const hits = rounds.flatMap((round) => (round.outcome === 'hit' && round.reactionMs !== null ? [round.reactionMs] : []));
      const flags: Flag[] = [];

      const impossible = rounds.filter((round) => round.outcome === 'impossible').length;
      if (impossible > 0) flags.push({ code: 'impossible-reaction', severity: 'high', detail: String(impossible) });

      if (hits.length === content.delaysMs.length && hits.length >= 3 && Math.max(...hits) - Math.min(...hits) < rules.minHumanSpreadMs) {
        flags.push({ code: 'too-consistent', severity: 'high' });
      }

      if (context.serverElapsedMs !== undefined) {
        // Every start that counted waited for the five lights (the first one goes on as it begins) and its own pause.
        const minimumMs = rounds.reduce(
          (sum, round, index) =>
            round.outcome === 'hit' ? sum + (content.lights - 1) * content.lightMs + (content.delaysMs[index] ?? 0) + (round.reactionMs ?? 0) : sum,
          0,
        );
        if (context.serverElapsedMs < minimumMs - rules.clockToleranceMs) {
          flags.push({ code: 'clock-mismatch', severity: 'high', detail: `needed at least ${minimumMs} ms, server saw ${context.serverElapsedMs} ms` });
        }
      }

      if (log.rounds.length > content.delaysMs.length) {
        flags.push({ code: 'malformed-log', severity: 'low', detail: 'more starts than expected' });
      }

      return {
        score: largadaScore(averageMs),
        flags,
        rounds,
        averageMs,
        bestMs: hits.length > 0 ? Math.min(...hits) : null,
      };
    },
  };
}
