import { describe, expect, it } from "vitest";
import type { LargadaGridResponse } from "@/lib/largada-types";
import { raceField } from "./field";

const AVATAR = { species: "rana", color: "natural", accessory: null } as const;
const ME = { userId: "me", avatar: AVATAR, article: "el" } as const;
const START = { reactionMs: 240, falseStart: false };

function grid(rivals: string[], ghost = false): LargadaGridResponse {
  return {
    groups: [],
    group: null,
    rivals: rivals.map((name, i) => ({ userId: name, username: name, avatar: AVATAR, article: "el", crown: false, starts: [START, START, START], score: 900, averageMs: 240, at: i })),
    lanes: rivals,
    waiting: [],
    me: null,
    ghost: ghost ? { title: "El mejor de Chivilcoy", avatar: AVATAR, article: "el", starts: [START, START, START], score: 900 } : null,
    week: { start: "2026-10-05", hasCrown: true },
    crown: null,
    meWeek: { position: null, lead: null },
  };
}

const names = (field: ReturnType<typeof raceField>) => field.map((racer) => racer.name);

describe("who races", () => {
  it("in practice, bots fill the track after the group or the ghost", () => {
    expect(names(raceField(grid(["Juli", "Tincho"]), ME, { mode: "fill", seed: "s" }))).toEqual(["Juli", "Tincho", "Rayo", "Tortuga", "Vos"]);
    expect(names(raceField(grid([], true), ME, { mode: "fill", seed: "s" }))).toEqual(["El mejor de Chivilcoy", "Rayo", "Chispa", "Tortuga", "Vos"]);
    expect(names(raceField(null, ME, { mode: "fill", seed: "s" }))).toEqual(["Rayo", "Chispa", "Turbo", "Tortuga", "Vos"]);
  });

  it("in the daily challenge, bots come only when nobody else would race", () => {
    expect(names(raceField(grid(["Juli"]), ME, { mode: "alone", seed: "s" }))).toEqual(["Juli", "Vos"]);
    expect(names(raceField(grid([], true), ME, { mode: "alone", seed: "s" }))).toEqual(["El mejor de Chivilcoy", "Vos"]);
    expect(names(raceField(null, ME, { mode: "alone", seed: "s" }))).toEqual(["Rayo", "Chispa", "Turbo", "Tortuga", "Vos"]);
  });

  it("numbers the cars, the ghost without one, and the player last", () => {
    const field = raceField(grid([], true), ME, { mode: "fill", seed: "s" });
    expect(field.map((racer) => racer.number)).toEqual([null, 1, 2, 3, 4]);
    expect(field.filter((racer) => racer.bot).every((racer) => racer.starts.length === 3)).toBe(true);
  });
});
