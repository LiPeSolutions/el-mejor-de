import { AVATAR_SPECIES, parseAvatar } from "@repo/shared";
import { describe, expect, it } from "vitest";
import { randomAvatar, startingAvatar } from "./avatar";

/** Repeatable random numbers from 0 to 1 (Park-Miller). */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

describe("randomAvatar", () => {
  it("always gives a valid character, on another species", () => {
    const rand = seeded(7);
    for (let i = 0; i < 3000; i++) {
      const species = AVATAR_SPECIES[i % AVATAR_SPECIES.length]!;
      const avatar = randomAvatar(species, rand);
      expect(parseAvatar(avatar)).toEqual(avatar);
      expect(avatar.species).not.toBe(species);
      expect(avatar.accessory).toBeNull();
    }
  });

  it("stays valid at the edges of the random numbers", () => {
    for (const value of [0, 0.5, 0.999999, 1]) {
      const avatar = randomAvatar("gato", () => value);
      expect(parseAvatar(avatar)).toEqual(avatar);
      expect(avatar.number).toBeGreaterThanOrEqual(1);
      expect(avatar.number).toBeLessThanOrEqual(99);
    }
  });

  it("leaves things natural or empty about as often as the design says", () => {
    const rand = seeded(42);
    const avatars = Array.from({ length: 4000 }, () => randomAvatar("hornero", rand));
    const share = (test: (avatar: (typeof avatars)[number]) => boolean) => avatars.filter(test).length / avatars.length;
    expect(share((avatar) => avatar.color === "natural")).toBeCloseTo(0.5, 1);
    expect(share((avatar) => avatar.detail === null)).toBeCloseTo(0.6, 1);
    expect(share((avatar) => avatar.head === null)).toBeCloseTo(0.5, 1);
    expect(share((avatar) => avatar.background === undefined)).toBeCloseTo(1 / 8, 1);
    expect(new Set(avatars.map((avatar) => avatar.species)).size).toBe(AVATAR_SPECIES.length - 1);
  });
});

describe("startingAvatar", () => {
  it("is any of the 17, natural and with nothing on", () => {
    const rand = seeded(3);
    const species = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const avatar = startingAvatar(rand);
      expect(avatar).toEqual({ species: avatar.species, color: "natural", accessory: null });
      expect(parseAvatar(avatar)).toEqual(avatar);
      species.add(avatar.species);
    }
    expect(species.size).toBe(AVATAR_SPECIES.length);
  });
});
