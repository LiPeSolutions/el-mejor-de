import { describe, expect, it } from 'vitest';
import {
  BATTLE_RULES,
  battleWinners,
  largadaFlow,
  largadaStandings,
  largadaStart,
  lettersFlow,
  lettersPoints,
  lettersStandings,
  triviaAnswer,
  triviaFlow,
  triviaStandings,
  type LargadaMove,
  type LettersWord,
  type RosterEntry,
  type TriviaMove,
} from './battles';

const T0 = 1_000_000;
const { answerMs, graceMs, revealMs } = BATTLE_RULES.trivia;
const roster = (...ids: string[]): RosterEntry[] => ids.map((userId) => ({ userId, leftAt: null }));

/** An answer `afterMs` after the question was shown at `shownAt`; `choice` 0 is the right one. */
const answer = (userId: string, round: number, shownAt: number, afterMs: number, choice = 0): TriviaMove => ({
  userId,
  round,
  shownAt,
  answeredAt: shownAt + afterMs,
  choice,
});

describe('a Cinco Preguntas battle', () => {
  it('opens the first question when the countdown ends and waits while someone is missing', () => {
    expect(triviaFlow({ startsAt: T0, roster: roster('a', 'b'), moves: [], now: T0 - 1 }).rounds).toEqual([]);
    const flow = triviaFlow({ startsAt: T0, roster: roster('a', 'b'), moves: [answer('a', 0, T0, 2_000)], now: T0 + 5_000 });
    expect(flow.rounds).toEqual([{ index: 0, opensAt: T0, closesAt: T0 + answerMs + graceMs, closed: false, nextAt: null }]);
    expect(flow.endsAt).toBeNull();
  });

  it('closes a question as soon as everyone answered, and opens the next after the table', () => {
    const moves = [answer('a', 0, T0, 2_000), answer('b', 0, T0, 3_500, 2)];
    const flow = triviaFlow({ startsAt: T0, roster: roster('a', 'b'), moves, now: T0 + 4_000 });
    expect(flow.rounds[0]).toEqual({ index: 0, opensAt: T0, closesAt: T0 + 3_500, closed: true, nextAt: T0 + 3_500 + revealMs });
    expect(flow.rounds).toHaveLength(1);

    const later = triviaFlow({ startsAt: T0, roster: roster('a', 'b'), moves, now: T0 + 3_500 + revealMs });
    expect(later.rounds[1]).toMatchObject({ index: 1, opensAt: T0 + 3_500 + revealMs, closed: false });
  });

  it('closes at the time limit when someone never answers', () => {
    const flow = triviaFlow({ startsAt: T0, roster: roster('a', 'b'), moves: [answer('a', 0, T0, 1_000)], now: T0 + answerMs + graceMs });
    expect(flow.rounds[0]).toMatchObject({ closed: true, closesAt: T0 + answerMs + graceMs });
  });

  it("doesn't wait for whoever left the room", () => {
    const players: RosterEntry[] = [
      { userId: 'a', leftAt: null },
      { userId: 'b', leftAt: T0 + 4_000 },
    ];
    const early = triviaFlow({ startsAt: T0, roster: players, moves: [answer('a', 0, T0, 2_000)], now: T0 + 3_000 });
    expect(early.rounds[0]?.closed).toBe(false);
    const flow = triviaFlow({ startsAt: T0, roster: players, moves: [answer('a', 0, T0, 2_000)], now: T0 + 4_500 });
    expect(flow.rounds[0]).toMatchObject({ closed: true, closesAt: T0 + 4_000 });
  });

  it('ignores an answer that came after the deadline', () => {
    const late = answer('b', 0, T0, answerMs + graceMs + 1);
    const flow = triviaFlow({ startsAt: T0, roster: roster('a', 'b'), moves: [answer('a', 0, T0, 1_000), late], now: T0 + 2_000 });
    expect(flow.rounds[0]?.closed).toBe(false);
  });

  it('shows the podium after the reveal of the fifth question', () => {
    const moves: TriviaMove[] = [];
    let opensAt = T0;
    for (let round = 0; round < 5; round++) {
      moves.push(answer('a', round, opensAt, 1_000), answer('b', round, opensAt, 2_000));
      opensAt += 2_000 + revealMs;
    }
    const flow = triviaFlow({ startsAt: T0, roster: roster('a', 'b'), moves, now: opensAt + 1 });
    expect(flow.rounds).toHaveLength(5);
    expect(flow.endsAt).toBe(opensAt);
  });

  it('scores like the game: 200 within 2 seconds, fewer after, nothing when wrong', () => {
    expect(triviaAnswer(answer('a', 0, T0, 1_900))).toMatchObject({ correct: true, points: 200, seconds: 2 });
    expect(triviaAnswer(answer('a', 0, T0, 6_000))).toMatchObject({ correct: true, points: 160, seconds: 6 });
    expect(triviaAnswer(answer('a', 0, T0, 1_000, 3))).toMatchObject({ answered: true, correct: false, points: 0 });
    expect(triviaAnswer(undefined)).toMatchObject({ answered: false, points: 0, seconds: null });
  });

  it('ranks by points, and a tie goes to whoever answered right faster', () => {
    const moves = [answer('a', 0, T0, 1_500), answer('b', 0, T0, 1_000), answer('c', 0, T0, 5_000, 1)];
    const table = triviaStandings(roster('a', 'b', 'c'), moves, 1);
    expect(table.map((row) => [row.userId, row.place, row.score])).toEqual([
      ['b', 1, 200],
      ['a', 2, 200],
      ['c', 3, 0],
    ]);
    expect(battleWinners(table)).toEqual(['b']);
  });
});

const lightsToSignal = (delay: number) => BATTLE_RULES.largada.firstLightMs + 4 * 1_000 + delay;
const start = (userId: string, round: number, at: number, reactionMs: number | null, falseStart = false): LargadaMove => ({ userId, round, at, reactionMs, falseStart });

describe('a Largada battle', () => {
  const delays = [1_000, 2_000, 500];

  it('puts the lights out at the same moment for everyone', () => {
    const flow = largadaFlow({ startsAt: T0, delaysMs: delays, roster: roster('a', 'b'), moves: [], now: T0 + 10 });
    expect(flow.rounds).toEqual([
      { index: 0, lightsAt: T0, signalAt: T0 + lightsToSignal(1_000), deadline: T0 + lightsToSignal(1_000) + BATTLE_RULES.largada.waitMs, closedAt: null, raceAt: null, nextAt: null },
    ]);
  });

  it('races once everyone tapped, and starts the next lights after the race', () => {
    const signal = T0 + lightsToSignal(1_000);
    const moves = [start('a', 0, signal + 300, 250), start('b', 0, signal + 420, 380)];
    const flow = largadaFlow({ startsAt: T0, delaysMs: delays, roster: roster('a', 'b'), moves, now: signal + 500 });
    const { raceLeadMs, raceShowMs } = BATTLE_RULES.largada;
    expect(flow.rounds[0]).toMatchObject({ closedAt: signal + 420, raceAt: signal + 420 + raceLeadMs, nextAt: signal + 420 + raceLeadMs + raceShowMs });
  });

  it('never races before the lights go out, even if everyone jumped', () => {
    const signal = T0 + lightsToSignal(1_000);
    const moves = [start('a', 0, T0 + 2_000, null, true), start('b', 0, T0 + 3_000, null, true)];
    const flow = largadaFlow({ startsAt: T0, delaysMs: delays, roster: roster('a', 'b'), moves, now: T0 + 3_100 });
    expect(flow.rounds[0]?.closedAt).toBe(signal);
  });

  it('closes after the slowest start that counts when someone never taps', () => {
    const signal = T0 + lightsToSignal(1_000);
    const deadline = signal + BATTLE_RULES.largada.waitMs;
    const moves = [start('a', 0, signal + 300, 250)];
    expect(largadaFlow({ startsAt: T0, delaysMs: delays, roster: roster('a', 'b'), moves, now: deadline - 1 }).rounds[0]?.closedAt).toBeNull();
    expect(largadaFlow({ startsAt: T0, delaysMs: delays, roster: roster('a', 'b'), moves, now: deadline }).rounds[0]?.closedAt).toBe(deadline);
  });

  it('ends after the third race', () => {
    const moves: LargadaMove[] = [];
    let lightsAt = T0;
    const { raceLeadMs, raceShowMs } = BATTLE_RULES.largada;
    for (let round = 0; round < 3; round++) {
      const signal = lightsAt + lightsToSignal(delays[round]!);
      moves.push(start('a', round, signal + 250, 240), start('b', round, signal + 300, 290));
      lightsAt = signal + 300 + raceLeadMs + raceShowMs;
    }
    const flow = largadaFlow({ startsAt: T0, delaysMs: delays, roster: roster('a', 'b'), moves, now: lightsAt });
    expect(flow.rounds).toHaveLength(3);
    expect(flow.endsAt).toBe(lightsAt);
  });

  it('counts the penalties like the game', () => {
    expect(largadaStart(start('a', 0, 0, 230))).toEqual({ outcome: 'hit', reactionMs: 230, countedMs: 230 });
    expect(largadaStart(start('a', 0, 0, null, true))).toMatchObject({ outcome: 'false-start', countedMs: 450 });
    expect(largadaStart(start('a', 0, 0, 60))).toMatchObject({ outcome: 'impossible', countedMs: 450 });
    expect(largadaStart(undefined)).toMatchObject({ outcome: 'miss', countedMs: 700 });
  });

  it('ranks by the average, and a tie goes to the best start', () => {
    const moves = [start('a', 0, 0, 200), start('a', 1, 0, 300), start('b', 0, 0, 250), start('b', 1, 0, 250), start('c', 0, 0, null, true)];
    const table = largadaStandings(roster('a', 'b', 'c'), moves, 2);
    expect(table.map((row) => [row.userId, row.place, row.averageMs, row.bestMs])).toEqual([
      ['a', 1, 250, 200],
      ['b', 2, 250, 250],
      ['c', 3, 575, null],
    ]);
    expect(table[0]?.score).toBe(900);
  });

  it('has no winner when only one played', () => {
    expect(battleWinners(largadaStandings(roster('a'), [start('a', 0, 0, 200)], 1))).toEqual([]);
  });
});

describe('a Diez Letras battle', () => {
  const { durationMs, graceMs, timeUpMs } = BATTLE_RULES.letters;
  const word = (userId: string, text: string, at: number): LettersWord => ({ userId, word: text, at });

  it('opens when the countdown ends and plays the whole 90 seconds', () => {
    expect(lettersFlow({ startsAt: T0, roster: roster('a', 'b'), now: T0 - 1 })).toEqual({ rounds: [], endsAt: null });
    const playing = lettersFlow({ startsAt: T0, roster: roster('a', 'b'), now: T0 + 60_000 });
    expect(playing).toEqual({ rounds: [{ index: 0, opensAt: T0, closesAt: T0 + durationMs + graceMs, closed: false, nextAt: null }], endsAt: null });
    const done = lettersFlow({ startsAt: T0, roster: roster('a', 'b'), now: T0 + durationMs + graceMs });
    expect(done.rounds[0]).toMatchObject({ closed: true, closesAt: T0 + durationMs + graceMs });
    expect(done.endsAt).toBe(T0 + durationMs + graceMs + timeUpMs);
  });

  it('closes early only when everyone left', () => {
    const left = [
      { userId: 'a', leftAt: T0 + 10_000 },
      { userId: 'b', leftAt: T0 + 20_000 },
    ];
    expect(lettersFlow({ startsAt: T0, roster: left, now: T0 + 15_000 }).rounds[0]?.closed).toBe(false);
    expect(lettersFlow({ startsAt: T0, roster: left, now: T0 + 20_000 }).rounds[0]).toMatchObject({ closed: true, closesAt: T0 + 20_000, nextAt: T0 + 20_000 + timeUpMs });
  });

  it('scores each word like the game, with no cap', () => {
    expect(['MAR', 'CAMA', 'SANTA', 'CAMINANTES'].map(lettersPoints)).toEqual([25, 50, 80, 220 + 300]);
    // The server never accepts a word twice; here only the sum matters.
    const plenty = Array.from({ length: 10 }, (_, i) => word('a', 'CAMINA', T0 + i));
    expect(lettersStandings(roster('a'), plenty)[0]?.score).toBe(1_200);
  });

  it('ranks by points, and a tie goes to whoever got there first', () => {
    const table = lettersStandings(roster('a', 'b', 'c', 'd'), [
      word('a', 'CAMA', T0 + 5_000),
      word('a', 'MAR', T0 + 9_000),
      word('b', 'MAR', T0 + 2_000),
      word('b', 'MESA', T0 + 7_000),
      word('c', 'SANTA', T0 + 1_000),
    ]);
    expect(table.map((row) => [row.userId, row.place, row.score, row.words])).toEqual([
      ['c', 1, 80, 1],
      ['b', 2, 75, 2],
      ['a', 3, 75, 2],
      ['d', 4, 0, 0],
    ]);
    expect(battleWinners(table)).toEqual(['c']);
  });

  it('shares the place of those without words, and nobody wins with none', () => {
    const table = lettersStandings(roster('a', 'b'), []);
    expect(table.map((row) => row.place)).toEqual([1, 1]);
    expect(battleWinners(table)).toEqual([]);
  });
});
