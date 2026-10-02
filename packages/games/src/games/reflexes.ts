import type { Flag, GameDefinition, GameResult } from '../types';

/** "Reflejos": tap as soon as the screen changes. Five rounds; random waits. */
export const REFLEXES_RULES = {
  rounds: 5,
  minDelayMs: 1_500,
  maxDelayMs: 4_500,
  /** Slower than this counts as a miss. */
  maxReactionMs: 1_500,
  /** Faster than this is not humanly possible: the round is void and flagged. */
  minHumanReactionMs: 100,
  /** Full points at or under this time… */
  fastMs: 170,
  /** …and none at or over this one. */
  slowMs: 550,
  pointsPerRound: 200,
  /** Hits this close to each other suggest a script. */
  minHumanSpreadMs: 6,
  /** Allowance when comparing against the server's clock. */
  clockToleranceMs: 1_000,
} as const;

export interface ReflexesContent {
  /** Wait before each round's signal. Each player gets their own random waits. */
  delaysMs: number[];
  maxReactionMs: number;
}

export interface ReflexesLog {
  /** Measured on the device from the signal being painted to the tap. */
  rounds: Array<{ reactionMs: number | null; falseStart: boolean }>;
}

export type ReflexesOutcome = 'hit' | 'false-start' | 'miss' | 'impossible';

export interface ReflexesResult extends GameResult {
  rounds: Array<{ outcome: ReflexesOutcome; reactionMs: number | null; points: number }>;
  /** Average of the hits, or null without hits. */
  averageMs: number | null;
}

export function reflexesRoundPoints(reactionMs: number): number {
  const { fastMs, slowMs, pointsPerRound } = REFLEXES_RULES;
  return Math.round(pointsPerRound * Math.min(1, Math.max(0, (slowMs - reactionMs) / (slowMs - fastMs))));
}

export function createReflexes(): GameDefinition<ReflexesContent, null, ReflexesLog, ReflexesResult> {
  const rules = REFLEXES_RULES;
  return {
    id: 'reflexes',
    category: 'skill',
    maxDurationMs: rules.rounds * (rules.maxDelayMs + rules.maxReactionMs + 3_000),

    generate({ player }) {
      return {
        content: {
          delaysMs: Array.from({ length: rules.rounds }, () => player.int(rules.minDelayMs, rules.maxDelayMs)),
          maxReactionMs: rules.maxReactionMs,
        },
        solution: null,
      };
    },

    evaluate(content, _solution, log, context = {}) {
      const rounds: ReflexesResult['rounds'] = content.delaysMs.map((_, index) => {
        const round = log.rounds[index];
        const reactionMs = round && Number.isFinite(round.reactionMs) ? round.reactionMs : null;
        if (!round) return { outcome: 'miss', reactionMs: null, points: 0 };
        if (round.falseStart) return { outcome: 'false-start', reactionMs: null, points: 0 };
        if (reactionMs === null || reactionMs > content.maxReactionMs) {
          return { outcome: 'miss', reactionMs, points: 0 };
        }
        if (reactionMs < rules.minHumanReactionMs) return { outcome: 'impossible', reactionMs, points: 0 };
        return { outcome: 'hit', reactionMs, points: reflexesRoundPoints(reactionMs) };
      });

      const hits = rounds.flatMap((round) =>
        round.outcome === 'hit' && round.reactionMs !== null ? [round.reactionMs] : [],
      );
      const flags: Flag[] = [];

      const impossible = rounds.filter((round) => round.outcome === 'impossible').length;
      if (impossible > 0) flags.push({ code: 'impossible-reaction', severity: 'high', detail: String(impossible) });

      if (hits.length >= 4 && Math.max(...hits) - Math.min(...hits) < rules.minHumanSpreadMs) {
        flags.push({ code: 'too-consistent', severity: 'high' });
      }

      if (context.serverElapsedMs !== undefined) {
        const minimumMs = rounds.reduce(
          (sum, round, index) =>
            round.outcome === 'hit' ? sum + (content.delaysMs[index] ?? 0) + (round.reactionMs ?? 0) : sum,
          0,
        );
        if (context.serverElapsedMs < minimumMs - rules.clockToleranceMs) {
          flags.push({
            code: 'clock-mismatch',
            severity: 'high',
            detail: `needed at least ${minimumMs} ms, server saw ${context.serverElapsedMs} ms`,
          });
        }
      }

      if (log.rounds.length > content.delaysMs.length) {
        flags.push({ code: 'malformed-log', severity: 'low', detail: 'more rounds than expected' });
      }

      return {
        score: rounds.reduce((sum, round) => sum + round.points, 0),
        flags,
        rounds,
        averageMs: hits.length > 0 ? Math.round(hits.reduce((sum, ms) => sum + ms, 0) / hits.length) : null,
      };
    },
  };
}
