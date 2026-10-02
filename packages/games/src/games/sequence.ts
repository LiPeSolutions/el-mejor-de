import type { Flag, GameDefinition, GameResult } from '../types';

/** "Secuencia": repeat ever longer color sequences (like Simon). One mistake ends the game. */
export const SEQUENCE_RULES = {
  pads: 4,
  /** Level 1 shows this many items; each level adds one. */
  startLength: 3,
  maxLength: 30,
  /** Level worth a perfect 1000. Calibrate with beta data. */
  targetLevel: 12,
  showMsPerItem: 600,
  /** Faster than this per tap, on average over a level, is not humanly possible. */
  minTapMs: 120,
  /** Reaching this level is suspicious. */
  suspiciousLevel: 20,
  clockToleranceMs: 1_000,
} as const;

export interface SequenceContent {
  pads: number;
  startLength: number;
  /**
   * Pad indexes. Never send the whole sequence: reveal it level by level
   * (level n shows the first startLength + n − 1 items).
   */
  sequence: number[];
  showMsPerItem: number;
}

export interface SequenceLog {
  /** One entry per level attempted, in order. */
  levels: Array<{ inputs: number[]; durationMs: number }>;
}

export interface SequenceResult extends GameResult {
  /** Levels completed without mistakes. */
  levelReached: number;
  /** Items in the longest sequence repeated correctly. */
  longestSequence: number;
}

export function sequenceLengthForLevel(level: number): number {
  return SEQUENCE_RULES.startLength + level - 1;
}

export function createSequence(): GameDefinition<SequenceContent, null, SequenceLog, SequenceResult> {
  const rules = SEQUENCE_RULES;
  const maxLevel = rules.maxLength - rules.startLength + 1;

  return {
    id: 'sequence',
    category: 'logic',
    maxDurationMs: 5 * 60_000,

    generate({ player }) {
      return {
        content: {
          pads: rules.pads,
          startLength: rules.startLength,
          sequence: Array.from({ length: rules.maxLength }, () => player.int(0, rules.pads - 1)),
          showMsPerItem: rules.showMsPerItem,
        },
        solution: null,
      };
    },

    evaluate(content, _solution, log, context = {}) {
      let levelReached = 0;
      let fastLevels = 0;
      let minimumMs = 0;

      for (const [index, level] of log.levels.slice(0, maxLevel).entries()) {
        const expected = content.sequence.slice(0, content.startLength + index);
        const correct =
          level.inputs.length === expected.length && level.inputs.every((pad, i) => pad === expected[i]);
        if (!correct) break;
        levelReached = index + 1;
        if (level.durationMs / level.inputs.length < rules.minTapMs) fastLevels++;
        minimumMs += expected.length * content.showMsPerItem + Math.max(0, level.durationMs);
      }

      const flags: Flag[] = [];
      if (fastLevels > 0) {
        flags.push({ code: 'too-fast-input', severity: fastLevels >= 2 ? 'high' : 'low', detail: String(fastLevels) });
      }
      if (levelReached >= rules.suspiciousLevel) flags.push({ code: 'superhuman-memory', severity: 'high' });
      if (log.levels.length > levelReached + 1) {
        flags.push({ code: 'malformed-log', severity: 'low', detail: 'levels after a mistake' });
      }
      if (context.serverElapsedMs !== undefined && context.serverElapsedMs < minimumMs - rules.clockToleranceMs) {
        flags.push({
          code: 'clock-mismatch',
          severity: 'high',
          detail: `needed at least ${minimumMs} ms, server saw ${context.serverElapsedMs} ms`,
        });
      }

      return {
        score: Math.round(1000 * Math.min(1, levelReached / rules.targetLevel)),
        flags,
        levelReached,
        longestSequence: levelReached > 0 ? content.startLength + levelReached - 1 : 0,
      };
    },
  };
}
