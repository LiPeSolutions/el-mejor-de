/*
 * The app's sounds, made with Web Audio instead of files (decided on
 * 3/10/2026): no downloads, no licenses, one style. Each sound draws itself
 * on any audio context (the speaker, or an offline one to listen to them
 * all) starting at time `t`, and returns how long it lasts.
 */

type Ctx = BaseAudioContext;

export interface Voice {
  type?: OscillatorType;
  freq: number;
  /** Glides here by the end. */
  to?: number;
  start: number;
  dur: number;
  gain: number;
  attack?: number;
  /** Holds the level this long before fading (sustained notes). */
  hold?: number;
  /** Optional lowpass, for softer square and sawtooth waves. */
  lowpass?: number;
  vibrato?: number;
}

export function voice(ctx: Ctx, out: AudioNode, v: Voice): void {
  const osc = ctx.createOscillator();
  osc.type = v.type ?? "sine";
  osc.frequency.setValueAtTime(v.freq, v.start);
  if (v.to) osc.frequency.exponentialRampToValueAtTime(v.to, v.start + v.dur);
  if (v.vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 5.5;
    depth.gain.value = v.freq * v.vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(v.start);
    lfo.stop(v.start + v.dur + 0.05);
  }
  const env = ctx.createGain();
  const attack = v.attack ?? 0.005;
  env.gain.setValueAtTime(0.0001, v.start);
  env.gain.exponentialRampToValueAtTime(v.gain, v.start + attack);
  if (v.hold) env.gain.setValueAtTime(v.gain, v.start + attack + v.hold);
  env.gain.exponentialRampToValueAtTime(0.0001, v.start + v.dur);
  let node: AudioNode = osc;
  if (v.lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = v.lowpass;
    node = osc.connect(filter);
  }
  node.connect(env).connect(out);
  osc.start(v.start);
  osc.stop(v.start + v.dur + 0.05);
}

interface Noise {
  start: number;
  dur: number;
  gain: number;
  filter: BiquadFilterType;
  freq: number;
  to?: number;
  q?: number;
}

function noise(ctx: Ctx, out: AudioNode, n: Noise): void {
  const length = Math.max(1, Math.ceil(ctx.sampleRate * n.dur));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = n.filter;
  filter.frequency.setValueAtTime(n.freq, n.start);
  if (n.to) filter.frequency.exponentialRampToValueAtTime(n.to, n.start + n.dur);
  filter.Q.value = n.q ?? 1;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, n.start);
  env.gain.exponentialRampToValueAtTime(n.gain, n.start + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, n.start + n.dur);
  source.connect(filter).connect(env).connect(out);
  source.start(n.start);
  source.stop(n.start + n.dur);
}

/** A soft bell: the note, its octave and a hint of the fifth above. */
function bell(ctx: Ctx, out: AudioNode, freq: number, start: number, dur: number, gain: number): void {
  voice(ctx, out, { freq, start, dur, gain });
  voice(ctx, out, { freq: freq * 2, start, dur: dur * 0.6, gain: gain * 0.3 });
  voice(ctx, out, { type: "triangle", freq: freq * 3, start, dur: dur * 0.35, gain: gain * 0.08 });
}

/** A brass-like note for the fanfares. */
function horn(ctx: Ctx, out: AudioNode, freq: number, start: number, dur: number, gain: number): void {
  voice(ctx, out, { type: "sawtooth", freq, start, dur, gain, attack: 0.03, hold: dur * 0.55, lowpass: 1800, vibrato: dur > 0.3 ? 0.006 : 0 });
  voice(ctx, out, { type: "sawtooth", freq: freq * 1.003, start, dur, gain: gain * 0.6, attack: 0.03, hold: dur * 0.55, lowpass: 1400 });
}

/** Notes, in Hz. */
const N = {
  A3: 220,
  C4: 261.63,
  E4: 329.63,
  G4: 392,
  A4: 440,
  B4: 493.88,
  C5: 523.25,
  Cs5: 554.37,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880,
  C6: 1046.5,
  Cs6: 1108.73,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98,
  A6: 1760,
  C7: 2093,
} as const;

/** One step up a pentatonic scale per letter of the word being written. */
const LETTER_SCALE = [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6, N.D6, N.E6, N.G6, N.A6];

/** Secuencia's four pads, like a Simon: an A major chord. */
export const PAD_NOTES = [N.A4, N.Cs5, N.E5, N.A5] as const;

export const synth = {
  /** A letter of Diez Letras: a pop, a step higher for each letter of the word. */
  letter(ctx: Ctx, out: AudioNode, t: number, step: number): number {
    const freq = LETTER_SCALE[Math.min(Math.max(0, step), LETTER_SCALE.length - 1)]!;
    voice(ctx, out, { freq: freq * 1.45, to: freq, start: t, dur: 0.12, gain: 0.22, attack: 0.003 });
    voice(ctx, out, { type: "triangle", freq: freq * 2, start: t, dur: 0.06, gain: 0.03 });
    return 0.12;
  },

  /** Delete a letter: the pop going down. */
  erase(ctx: Ctx, out: AudioNode, t: number): number {
    voice(ctx, out, { freq: 620, to: 300, start: t, dur: 0.09, gain: 0.14, attack: 0.003 });
    return 0.09;
  },

  /** Mix the letters: two quick swishes. */
  shuffle(ctx: Ctx, out: AudioNode, t: number): number {
    noise(ctx, out, { start: t, dur: 0.1, gain: 0.4, filter: "bandpass", freq: 1200, to: 3200, q: 1.2 });
    noise(ctx, out, { start: t + 0.09, dur: 0.11, gain: 0.34, filter: "bandpass", freq: 1500, to: 4000, q: 1.2 });
    return 0.2;
  },

  /** A word that counts: more notes the longer it is. */
  word(ctx: Ctx, out: AudioNode, t: number, length: number): number {
    const notes = length >= 6 ? [N.C6, N.E6, N.G6, N.C7] : length >= 4 ? [N.C6, N.E6, N.G6] : [N.C6, N.E6];
    notes.forEach((freq, i) => bell(ctx, out, freq, t + i * 0.07, 0.4, 0.12));
    return notes.length * 0.07 + 0.4;
  },

  /** Repeated or too short: a gentle "boop boop", not an error. */
  nope(ctx: Ctx, out: AudioNode, t: number): number {
    voice(ctx, out, { type: "triangle", freq: 330, start: t, dur: 0.07, gain: 0.16 });
    voice(ctx, out, { type: "triangle", freq: 330, start: t + 0.1, dur: 0.08, gain: 0.16 });
    return 0.18;
  },

  /** Not valid, or the wrong pad: a low "bonk". */
  error(ctx: Ctx, out: AudioNode, t: number): number {
    voice(ctx, out, { type: "square", freq: 196, to: 98, start: t, dur: 0.22, gain: 0.12, lowpass: 900 });
    voice(ctx, out, { type: "triangle", freq: 147, to: 110, start: t, dur: 0.22, gain: 0.14 });
    return 0.22;
  },

  /** The word with every letter: a run up and a sparkle. */
  jackpot(ctx: Ctx, out: AudioNode, t: number): number {
    [N.C5, N.E5, N.G5, N.C6, N.E6].forEach((freq, i) => bell(ctx, out, freq, t + i * 0.06, 0.5, 0.12));
    [N.C6, N.E6, N.G6].forEach((freq) => bell(ctx, out, freq, t + 0.36, 0.9, 0.08));
    noise(ctx, out, { start: t + 0.36, dur: 0.5, gain: 0.05, filter: "highpass", freq: 6000 });
    return 1.26;
  },

  /** A clock tick for the last seconds; `high` alternates tick and tock. */
  tick(ctx: Ctx, out: AudioNode, t: number, high = true): number {
    voice(ctx, out, { freq: high ? 2000 : 1500, start: t, dur: 0.035, gain: 0.12, attack: 0.002 });
    noise(ctx, out, { start: t, dur: 0.025, gain: 0.05, filter: "bandpass", freq: 3200, q: 2 });
    return 0.04;
  },

  /** Time's up: two notes going down. */
  timeUp(ctx: Ctx, out: AudioNode, t: number): number {
    voice(ctx, out, { type: "triangle", freq: N.E5, start: t, dur: 0.16, gain: 0.2 });
    voice(ctx, out, { type: "triangle", freq: N.C5, start: t + 0.17, dur: 0.38, gain: 0.2, hold: 0.12 });
    return 0.55;
  },

  /** A question comes in: a soft swish. */
  question(ctx: Ctx, out: AudioNode, t: number): number {
    noise(ctx, out, { start: t, dur: 0.16, gain: 0.14, filter: "lowpass", freq: 900, to: 3500 });
    voice(ctx, out, { freq: N.A5, start: t + 0.08, dur: 0.09, gain: 0.09 });
    return 0.18;
  },

  /** A right answer; a fast one gets a third, higher note. */
  correct(ctx: Ctx, out: AudioNode, t: number, fast = false): number {
    bell(ctx, out, N.E6, t, 0.35, 0.14);
    bell(ctx, out, N.A6, t + 0.09, 0.45, 0.13);
    if (fast) bell(ctx, out, N.C7, t + 0.18, 0.5, 0.09);
    return fast ? 0.68 : 0.54;
  },

  /** A wrong answer: a quiz-show buzzer, short and low. */
  wrong(ctx: Ctx, out: AudioNode, t: number): number {
    voice(ctx, out, { type: "sawtooth", freq: 155, start: t, dur: 0.36, gain: 0.1, hold: 0.22, lowpass: 1100 });
    voice(ctx, out, { type: "sawtooth", freq: 158, start: t, dur: 0.36, gain: 0.08, hold: 0.22, lowpass: 1100 });
    return 0.36;
  },

  /** Secuencia: each pad its own note, held while it's lit. */
  pad(ctx: Ctx, out: AudioNode, t: number, pad: number, seconds = 0.38): number {
    const freq = PAD_NOTES[Math.min(Math.max(0, pad), PAD_NOTES.length - 1)]!;
    const dur = Math.max(0.12, seconds) + 0.08;
    voice(ctx, out, { type: "triangle", freq, start: t, dur, gain: 0.24, attack: 0.008, hold: dur - 0.1 });
    voice(ctx, out, { freq: freq * 2, start: t, dur, gain: 0.05, attack: 0.008, hold: dur - 0.1 });
    return dur;
  },

  /** A level of Secuencia done. */
  levelUp(ctx: Ctx, out: AudioNode, t: number): number {
    [N.A5, N.Cs6, N.E6].forEach((freq, i) => bell(ctx, out, freq, t + i * 0.06, 0.35, 0.11));
    return 0.47;
  },

  /** Secuencia is over: "oh-oh", gentle (every game ends like this). */
  fail(ctx: Ctx, out: AudioNode, t: number): number {
    voice(ctx, out, { type: "triangle", freq: N.E5, start: t, dur: 0.18, gain: 0.18 });
    voice(ctx, out, { type: "triangle", freq: N.B4, start: t + 0.2, dur: 0.42, gain: 0.18, hold: 0.15 });
    return 0.62;
  },

  /** Largada: the dry knock of a light going on. */
  knock(ctx: Ctx, out: AudioNode, t: number): number {
    voice(ctx, out, { freq: 150, to: 55, start: t, dur: 0.12, gain: 0.45, attack: 0.005 });
    return 0.12;
  },

  /** Largada: the cars go (after the tap, so it gives nothing away). */
  launch(ctx: Ctx, out: AudioNode, t: number): number {
    voice(ctx, out, { type: "sawtooth", freq: 70, to: 210, start: t, dur: 0.7, gain: 0.1, attack: 0.02, hold: 0.35, lowpass: 900 });
    voice(ctx, out, { type: "sawtooth", freq: 72, to: 214, start: t, dur: 0.7, gain: 0.07, attack: 0.02, hold: 0.35, lowpass: 600 });
    noise(ctx, out, { start: t + 0.05, dur: 0.6, gain: 0.07, filter: "bandpass", freq: 500, to: 2400, q: 0.8 });
    return 0.75;
  },

  /** Largada: the place at the finish. */
  place(ctx: Ctx, out: AudioNode, t: number, place: number): number {
    if (place === 1) {
      [N.C6, N.E6, N.G6].forEach((freq, i) => bell(ctx, out, freq, t + i * 0.05, 0.6, 0.11));
      return 0.7;
    }
    bell(ctx, out, place <= 3 ? N.G5 : N.E5, t, 0.45, place <= 3 ? 0.13 : 0.09);
    return 0.45;
  },

  /** Tubitos: liquid going into a tube, a short "glug-glug" for each layer (300 ms each, like the animation). */
  pour(ctx: Ctx, out: AudioNode, t: number, layers = 1): number {
    const count = Math.min(4, Math.max(1, Math.round(layers)));
    for (let layer = 0; layer < count; layer++) {
      const at = t + layer * 0.3;
      // Each glug is a bubble: a quick sweep up that fades, a bit higher as the tube fills.
      const base = 260 + layer * 40;
      voice(ctx, out, { freq: base, to: base * 2.6, start: at, dur: 0.07, gain: 0.16, attack: 0.004 });
      voice(ctx, out, { freq: base * 1.2, to: base * 3, start: at + 0.12, dur: 0.06, gain: 0.11, attack: 0.004 });
      noise(ctx, out, { start: at, dur: 0.22, gain: 0.035, filter: "lowpass", freq: 700, to: 1400 });
    }
    return count * 0.3;
  },

  /** Tubitos: the cork going on a finished tube, a "plop". */
  cork(ctx: Ctx, out: AudioNode, t: number): number {
    voice(ctx, out, { freq: 720, to: 190, start: t, dur: 0.09, gain: 0.26, attack: 0.002 });
    voice(ctx, out, { type: "triangle", freq: 1400, to: 500, start: t, dur: 0.04, gain: 0.05, attack: 0.001 });
    noise(ctx, out, { start: t, dur: 0.03, gain: 0.08, filter: "bandpass", freq: 2200, q: 1.5 });
    return 0.1;
  },

  /** The score counting up on a result, and how it lands. */
  reveal(ctx: Ctx, out: AudioNode, t: number, score: number): number {
    const steps = [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6, N.D6, N.E6];
    steps.forEach((freq, i) => voice(ctx, out, { freq, start: t + i * 0.1, dur: 0.07, gain: 0.05, attack: 0.003 }));
    const end = t + steps.length * 0.1;
    if (score >= 700) [N.C6, N.E6, N.G6].forEach((freq) => bell(ctx, out, freq, end, 0.8, 0.08));
    else bell(ctx, out, score >= 400 ? N.G5 : N.E5, end, 0.6, 0.1);
    return end - t + 0.8;
  },

  /** A new personal record: "ta-da-da-DAAA". */
  record(ctx: Ctx, out: AudioNode, t: number): number {
    [N.G5, N.C6, N.E6].forEach((freq, i) => bell(ctx, out, freq, t + i * 0.1, 0.25, 0.12));
    bell(ctx, out, N.G6, t + 0.3, 0.9, 0.12);
    bell(ctx, out, N.C6, t + 0.3, 0.9, 0.07);
    noise(ctx, out, { start: t + 0.3, dur: 0.45, gain: 0.04, filter: "highpass", freq: 7000 });
    return 1.2;
  },

  /** The three challenges of the day are done: a short, happy tune. */
  dayDone(ctx: Ctx, out: AudioNode, t: number): number {
    const melody: [number, number, number][] = [
      [N.C5, 0, 0.18],
      [N.E5, 0.16, 0.18],
      [N.G5, 0.32, 0.18],
      [N.A5, 0.48, 0.22],
      [N.G5, 0.68, 0.2],
      [N.C6, 0.88, 0.9],
    ];
    for (const [freq, at, dur] of melody) bell(ctx, out, freq, t + at, dur + 0.25, 0.13);
    for (const [freq, at, dur] of [
      [N.C4, 0, 0.45],
      [N.G4, 0.48, 0.38],
      [N.C4, 0.88, 0.9],
    ] as const)
      voice(ctx, out, { type: "triangle", freq: freq / 2, start: t + at, dur, gain: 0.16, hold: dur * 0.4 });
    return 2.05;
  },

  /** The crown: a fanfare, "ta-ta-ta-TAAAN, ta-TAAAN". */
  crown(ctx: Ctx, out: AudioNode, t: number): number {
    const notes: [number, number, number][] = [
      [N.G4, 0, 0.12],
      [N.G4, 0.14, 0.12],
      [N.G4, 0.28, 0.12],
      [N.C5, 0.42, 0.5],
      [N.E5, 0.98, 0.16],
      [N.G5, 1.16, 1.0],
    ];
    for (const [freq, at, dur] of notes) horn(ctx, out, freq, t + at, dur, 0.09);
    voice(ctx, out, { freq: 82, to: 60, start: t + 1.16, dur: 0.6, gain: 0.3 });
    [N.C6, N.E6, N.G6].forEach((freq, i) => bell(ctx, out, freq, t + 1.2 + i * 0.07, 0.8, 0.05));
    noise(ctx, out, { start: t + 1.16, dur: 0.7, gain: 0.04, filter: "highpass", freq: 6500 });
    return 2.3;
  },
};

export type SoundName = keyof typeof synth;
