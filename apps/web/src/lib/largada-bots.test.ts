import { describe, expect, it } from "vitest";
import { BOTS, botStarts, botsFor } from "./largada-bots";

const [rayo, , , tortuga] = BOTS;

describe("Largada's bots", () => {
  it("come in when there's room: Rayo always, then Tortuga, in their lane order", () => {
    expect(botsFor(0)).toEqual([]);
    expect(botsFor(1).map((bot) => bot.name)).toEqual(["Rayo"]);
    expect(botsFor(2).map((bot) => bot.name)).toEqual(["Rayo", "Tortuga"]);
    expect(botsFor(3).map((bot) => bot.name)).toEqual(["Rayo", "Chispa", "Tortuga"]);
    expect(botsFor(9).map((bot) => bot.name)).toEqual(["Rayo", "Chispa", "Turbo", "Tortuga"]);
  });

  it("race the same with the same seed, and differently with another", () => {
    expect(botStarts(rayo!, "2026-10-05:nico")).toEqual(botStarts(rayo!, "2026-10-05:nico"));
    expect(botStarts(rayo!, "2026-10-05:nico")).not.toEqual(botStarts(rayo!, "2026-10-05:juli"));
    expect(botStarts(rayo!, "x")).toHaveLength(3);
  });

  it("keep their pace: Rayo is fast and never jumps, Tortuga is slow and jumps now and then", () => {
    const runs = Array.from({ length: 400 }, (_, i) => `semilla-${i}`);
    const hits = (bot: (typeof BOTS)[number]) => runs.flatMap((seed) => botStarts(bot, seed)).flatMap((start) => (start.reactionMs === null ? [] : [start.reactionMs]));
    const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(hits(rayo!)).toHaveLength(1200);
    expect(average(hits(rayo!))).toBeGreaterThan(205);
    expect(average(hits(rayo!))).toBeLessThan(219);
    expect(Math.min(...hits(rayo!))).toBeGreaterThanOrEqual(160);
    const jumps = runs.flatMap((seed) => botStarts(tortuga!, seed)).filter((start) => start.falseStart).length;
    expect(jumps / 1200).toBeGreaterThan(0.05);
    expect(jumps / 1200).toBeLessThan(0.15);
    expect(average(hits(tortuga!))).toBeGreaterThan(290);
  });
});
