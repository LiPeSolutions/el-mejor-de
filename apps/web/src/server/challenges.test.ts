import { getSevenLettersDictionary } from "@repo/content";
import { LARGADA_FROM, canSpell, countLetters, dailyLineup } from "@repo/games";
import { addDays, toGameDate } from "@repo/shared";
import { describe, expect, it } from "vitest";
import { checkWord, gradeAttempt, startAttempt } from "./challenges";

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
