import { describe, expect, it } from "vitest";
import { PAD_NOTES, synth, type SoundName } from "./synth";
import { fakeAudioContext } from "./testing/fake-audio";

const ARGS: Partial<Record<SoundName, unknown[]>> = {
  letter: [4],
  word: [6],
  tick: [true],
  correct: [true],
  pad: [2, 0.38],
  place: [1],
  reveal: [920],
};

describe("the app's sounds", () => {
  it.each(Object.keys(synth) as SoundName[])("%s plays from its start time and lasts what it says", (name) => {
    const { ctx, ramps, starts } = fakeAudioContext();
    const draw = synth[name] as (ctx: BaseAudioContext, out: AudioNode, t: number, ...rest: unknown[]) => number;
    const duration = draw(ctx, ctx.destination, 1, ...(ARGS[name] ?? []));
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThan(2.5);
    expect(starts.length).toBeGreaterThan(0);
    expect(Math.min(...starts)).toBeGreaterThanOrEqual(1);
    expect(ramps.every((ramp) => ramp.value > 0)).toBe(true);
    expect(Math.max(...ramps.map((ramp) => ramp.time))).toBeLessThanOrEqual(1 + duration + 1e-9);
  });

  it("gives each of Secuencia's pads its own note", () => {
    expect(new Set(PAD_NOTES).size).toBe(4);
  });
});
