import { describe, expect, it } from "vitest";
import { PAD_NOTES, synth, type SoundName } from "./synth";

/*
 * A stand-in for the browser's audio context that records what each sound
 * schedules. Web Audio throws on an exponential ramp to zero or below, so
 * that's checked here; how they actually sound is checked by ear.
 */
interface Ramp {
  value: number;
  time: number;
}

function fakeContext() {
  const ramps: Ramp[] = [];
  const starts: number[] = [];
  const param = () => ({
    value: 0,
    setValueAtTime: () => undefined,
    linearRampToValueAtTime: () => undefined,
    exponentialRampToValueAtTime: (value: number, time: number) => ramps.push({ value, time }),
  });
  const node = () => ({ connect: (next: unknown) => next });
  const ctx = {
    sampleRate: 8000,
    currentTime: 0,
    destination: node(),
    createOscillator: () => ({ ...node(), type: "sine", frequency: param(), detune: param(), start: (t: number) => starts.push(t), stop: () => undefined }),
    createGain: () => ({ ...node(), gain: param() }),
    createBiquadFilter: () => ({ ...node(), type: "lowpass", frequency: param(), Q: param() }),
    createBuffer: (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
    createBufferSource: () => ({ ...node(), buffer: null, start: (t: number) => starts.push(t), stop: () => undefined }),
  };
  return { ctx: ctx as unknown as BaseAudioContext, ramps, starts };
}

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
    const { ctx, ramps, starts } = fakeContext();
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
