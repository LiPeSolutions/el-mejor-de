/*
 * A stand-in for the browser's audio context, for tests: it records what a
 * sound or a song schedules. Web Audio throws on an exponential ramp to zero
 * or below, so the ramps are kept to check them.
 */

export interface Ramp {
  value: number;
  time: number;
}

export function fakeAudioContext() {
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
