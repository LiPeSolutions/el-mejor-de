import { getSevenLettersDictionary } from "@repo/content";
import { LARGADA_FROM, WATER_SORT_FROM, canSpell, countLetters, dailyLineup, solveWaterSort, type Board, type WaterSortEvent } from "@repo/games";
import { addDays, toGameDate } from "@repo/shared";
import { describe, expect, it } from "vitest";
import { checkWord, gradeAttempt, nextWaterSortLevel, solveWaterSortLevel, startAttempt } from "./challenges";

const PLAYER = { device: "11111111-1111-4111-8111-111111111111" };

/** Noon in Argentina of the first day from `from` (and in that direction) where the letters game is played. */
function dayWithLetters(from: string, step: 1 | -1) {
  for (let date = from; ; date = addDays(date, step)) {
    const slot = dailyLineup(date).indexOf("seven-letters");
    if (slot !== -1) return { date, slot, now: Date.parse(`${date}T15:00:00Z`) };
  }
}

function someWords(letters: string[], count: number): string[] {
  const available = countLetters(letters.join(""));
  return getSevenLettersDictionary()
    .words.filter((word) => word.length >= 4 && word.length <= 6 && canSpell(word, available))
    .slice(0, count);
}

describe("the letters game changes rules by date", () => {
  it("keeps Siete Letras for days before 4/10/2026", () => {
    const { date, slot, now } = dayWithLetters("2026-10-03", -1);
    const started = startAttempt({ mode: "daily", slot }, PLAYER, now);
    expect(toGameDate(new Date(now))).toBe(date);
    expect(started.view).toMatchObject({ game: "seven-letters" });
    if (started.view.game !== "seven-letters") return;
    expect(started.view.letters).toHaveLength(7);
    expect(started.view.targetPoints).toBeLessThanOrEqual(80);
  });

  it("plays Diez Letras from 4/10/2026, with fixed points per word", () => {
    const { slot, now } = dayWithLetters("2026-10-04", 1);
    const started = startAttempt({ mode: "daily", slot }, PLAYER, now);
    if (started.view.game !== "seven-letters") throw new Error("expected the letters game");
    expect(started.view.letters).toHaveLength(10);
    expect(started.view.targetPoints).toBe(1000);

    const words = someWords(started.view.letters, 200);
    const four = words.find((word) => word.length === 4)!;
    const five = words.find((word) => word.length === 5)!;
    expect(checkWord(started.claims, four)).toEqual({ word: four, status: "valid", points: 50 });
    expect(checkWord(started.claims, five)).toEqual({ word: five, status: "valid", points: 80 });

    const graded = gradeAttempt(started.claims, { submissions: [{ word: four, atMs: 3_000 }, { word: five, atMs: 8_000 }] }, now + 90_000);
    expect(graded.result).toMatchObject({ game: "seven-letters", score: 130 });
  });

  it("already uses ten letters in practice", () => {
    const started = startAttempt({ mode: "practice", game: "seven-letters" }, PLAYER, Date.parse("2026-10-03T15:00:00Z"));
    if (started.view.game !== "seven-letters") throw new Error("expected the letters game");
    expect(started.view.letters).toHaveLength(10);
  });
});

/** Noon in Argentina of the first day from `from` (and in that direction) where the reflexes game is played. */
function dayWithReflexes(from: string, step: 1 | -1) {
  for (let date = from; ; date = addDays(date, step)) {
    const slot = dailyLineup(date).indexOf("reflexes");
    if (slot !== -1) return { date, slot, now: Date.parse(`${date}T15:00:00Z`) };
  }
}

describe("the reflexes game becomes Largada by date", () => {
  it("keeps the color-change game for the days before", () => {
    const { slot, now } = dayWithReflexes("2026-10-03", -1);
    const started = startAttempt({ mode: "daily", slot }, PLAYER, now);
    expect(started.view).toMatchObject({ game: "reflexes" });
    if (started.view.game !== "reflexes") return;
    expect(started.view.version).toBeUndefined();
    expect(started.view.delaysMs).toHaveLength(5);
  });

  it("plays Largada from then on: five lights, three starts, the score from the average", () => {
    const { slot, now } = dayWithReflexes(LARGADA_FROM, 1);
    const started = startAttempt({ mode: "daily", slot }, PLAYER, now);
    if (started.view.game !== "reflexes" || started.view.version !== "largada") throw new Error("expected Largada");
    expect(started.view).toMatchObject({ lights: 5, lightMs: 1000, maxReactionMs: 1500 });
    expect(started.view.delaysMs).toHaveLength(3);
    const log = { rounds: [{ reactionMs: 231, falseStart: false }, { reactionMs: 238, falseStart: false }, { reactionMs: 251, falseStart: false }] };
    const graded = gradeAttempt(started.claims, log, now + 30_000);
    expect(graded.result).toEqual({
      game: "reflexes",
      version: "largada",
      score: 920,
      averageMs: 240,
      bestMs: 231,
      rounds: [
        { outcome: "hit", reactionMs: 231 },
        { outcome: "hit", reactionMs: 238 },
        { outcome: "hit", reactionMs: 251 },
      ],
    });
    expect(graded.flags).toEqual([]);
  });

  it("is already Largada in practice", () => {
    const started = startAttempt({ mode: "practice", game: "reflexes" }, PLAYER, Date.parse("2026-10-03T15:00:00Z"));
    expect(started.view).toMatchObject({ game: "reflexes", version: "largada" });
  });
});

/** A level solved the shortest way, one pour every 900 ms. */
function solvedLevel(tubes: Board) {
  const { path } = solveWaterSort(tubes)!;
  const events: WaterSortEvent[] = path.map(([from, to], i) => ({ type: "pour", from, to, t: 900 * (i + 1) }));
  return { events, durationMs: 900 * path.length };
}

describe("Tubitos", () => {
  const slot = dailyLineup(WATER_SORT_FROM).indexOf("water-sort");
  const now = Date.parse(`${WATER_SORT_FROM}T15:00:00Z`);

  it("joins the daily challenge on 5/10/2026", () => {
    expect(dailyLineup("2026-10-04")).not.toContain("water-sort");
    expect(slot).not.toBe(-1);
  });

  it("serves the levels one at a time, each once the one before is solved", async () => {
    const started = startAttempt({ mode: "daily", slot }, PLAYER, now);
    const { view, claims } = started;
    if (view.game !== "water-sort") throw new Error("expected Tubitos");
    expect(view).toMatchObject({ capacity: 4, undos: 3, levels: 3, practiceLevel: null });
    expect(view.board.level).toBe(1);
    expect(view.board.tubes).toHaveLength(6);
    expect(view.board.levelToken).toBeUndefined();

    // A level that isn't solved gets no receipt.
    await expect(solveWaterSortLevel(claims, { level: 1, events: [], durationMs: 1_000 }, () => now + 5_000)).rejects.toMatchObject({ status: 400 });

    const one = solvedLevel(view.board.tubes);
    const solvedOne = await solveWaterSortLevel(claims, { level: 1, ...one }, () => now + one.durationMs + 300);
    expect(solvedOne).toMatchObject({ level: 1, moves: view.board.par, par: view.board.par, points: 250 });

    // The next level needs the receipt of the one before.
    await expect(nextWaterSortLevel(claims, 2, "made-up")).rejects.toMatchObject({ status: 401 });
    await expect(nextWaterSortLevel(claims, 3, solvedOne.receipt)).rejects.toMatchObject({ status: 401 });
    const two = await nextWaterSortLevel(claims, 2, solvedOne.receipt, () => now + 60_000);
    expect(two.board).toMatchObject({ level: 2 });
    expect(two.board.tubes).toHaveLength(8);
    // Its clock is in its token: without it (or with another level's), it can't be solved.
    const playedTwo = solvedLevel(two.board.tubes);
    await expect(solveWaterSortLevel(claims, { level: 2, ...playedTwo }, () => now + 80_000)).rejects.toMatchObject({ status: 401 });
    const solvedTwo = await solveWaterSortLevel(claims, { level: 2, ...playedTwo, levelToken: two.board.levelToken }, () => now + 60_000 + playedTwo.durationMs + 300);

    const three = await nextWaterSortLevel(claims, 3, solvedTwo.receipt, () => now + 120_000);
    expect(three.board.tubes).toHaveLength(10);
    const playedThree = solvedLevel(three.board.tubes);
    const solvedThree = await solveWaterSortLevel(claims, { level: 3, ...playedThree, levelToken: three.board.levelToken }, () => now + 120_000 + playedThree.durationMs + 300);

    const log = {
      levels: [
        { ...one, receipt: solvedOne.receipt },
        { ...playedTwo, receipt: solvedTwo.receipt },
        { ...playedThree, receipt: solvedThree.receipt },
      ],
    };
    const graded = gradeAttempt(claims, log, now + 180_000);
    expect(graded.result).toMatchObject({ game: "water-sort", score: 1000, solvedCount: 3 });
    expect(graded.flags).toEqual([]);
  });

  it("counts the time the server saw when the phone says less", async () => {
    const { view, claims } = startAttempt({ mode: "daily", slot }, PLAYER, now);
    if (view.game !== "water-sort") throw new Error("expected Tubitos");
    const one = solvedLevel(view.board.tubes);
    const claimed = { events: one.events.map((event) => ({ ...event, t: event.t / 10 })), durationMs: one.durationMs / 10 };
    // The server heard of it 80 s after serving it, whatever the phone says.
    const solved = await solveWaterSortLevel(claims, { level: 1, ...claimed }, () => now + 80_000);
    expect(solved.timeMs).toBe(78_000);
    expect(solved.points).toBeLessThan(250);
    const graded = gradeAttempt(claims, { levels: [{ ...claimed, receipt: solved.receipt }] }, now + 90_000);
    expect(graded.result).toMatchObject({ score: solved.points });
    expect(graded.result.game === "water-sort" && graded.result.levels[0]!.timeMs).toBe(78_000);
    // The moments the database kept win over the receipts.
    const fromDatabase = gradeAttempt(claims, { levels: [{ ...claimed, receipt: solved.receipt }] }, now + 90_000, { "solved:1": now + 40_000 });
    expect(fromDatabase.result.game === "water-sort" && fromDatabase.result.levels[0]!.timeMs).toBe(38_000);
  });

  it("plays practice one level per attempt, sized by the run's level", () => {
    const at = Date.parse("2026-10-04T15:00:00Z");
    const sizes = [undefined, 7, 12].map((level) => {
      const { view } = startAttempt({ mode: "practice", game: "water-sort", level }, PLAYER, at);
      if (view.game !== "water-sort") throw new Error("expected Tubitos");
      expect(view.levels).toBe(1);
      return [view.practiceLevel, view.board.tubes.length];
    });
    expect(sizes).toEqual([
      [1, 6],
      [7, 8],
      [12, 10],
    ]);
  });
});
