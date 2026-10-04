import { voice } from "./synth";

/*
 * The app's music: one loop for the menus and one per game, made with Web
 * Audio like the sounds (no files). Each song is eight bars of sixteenth
 * notes that a small scheduler plays ahead of time, so the loop never
 * stutters. Phone speakers barely play anything under 150 Hz, so the bass
 * lines live an octave higher than on a record and carry some harmonics.
 */

type Ctx = BaseAudioContext;

/** MIDI note number to Hz (60 is the middle C, 69 the A at 440 Hz). */
const hz = (note: number) => 440 * Math.pow(2, (note - 69) / 12);

/* ───────────── Instruments ───────────── */

const noiseBuffers = new WeakMap<Ctx, AudioBuffer>();

/** One second of noise per context, played in slices: drums don't allocate a buffer per hit. */
function noiseBuffer(ctx: Ctx): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

function hit(ctx: Ctx, out: AudioNode, t: number, dur: number, gain: number, filter: BiquadFilterType, freq: number, q = 1): void {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  const band = ctx.createBiquadFilter();
  band.type = filter;
  band.frequency.value = freq;
  band.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + 0.003);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  source.connect(band).connect(env).connect(out);
  source.start(t, Math.random() * 0.8, dur + 0.02);
}

const kick = (ctx: Ctx, out: AudioNode, t: number, gain: number) => voice(ctx, out, { freq: 150, to: 50, start: t, dur: 0.16, gain, attack: 0.002 });
const snare = (ctx: Ctx, out: AudioNode, t: number, gain: number) => {
  hit(ctx, out, t, 0.14, gain, "bandpass", 1900, 0.7);
  voice(ctx, out, { type: "triangle", freq: 240, to: 170, start: t, dur: 0.07, gain: gain * 0.6 });
};
const hat = (ctx: Ctx, out: AudioNode, t: number, gain: number, open = false) => hit(ctx, out, t, open ? 0.14 : 0.035, gain, "highpass", 7500);
const shaker = (ctx: Ctx, out: AudioNode, t: number, gain: number) => hit(ctx, out, t, 0.055, gain, "bandpass", 5500, 1.4);
const rim = (ctx: Ctx, out: AudioNode, t: number, gain: number) => hit(ctx, out, t, 0.04, gain, "bandpass", 2600, 3);

/** A bass that a phone can play: a triangle plus a filtered square for the harmonics. */
function bass(ctx: Ctx, out: AudioNode, t: number, note: number, dur: number, gain: number, bright = 900): void {
  voice(ctx, out, { type: "triangle", freq: hz(note), start: t, dur, gain, attack: 0.004 });
  voice(ctx, out, { type: "square", freq: hz(note), start: t, dur: dur * 0.8, gain: gain * 0.35, attack: 0.004, lowpass: bright });
}

/** Marimba-like: a sine with a quick, woody overtone. */
function marimba(ctx: Ctx, out: AudioNode, t: number, note: number, dur: number, gain: number): void {
  voice(ctx, out, { freq: hz(note), start: t, dur, gain, attack: 0.002 });
  voice(ctx, out, { freq: hz(note) * 4, start: t, dur: Math.min(dur, 0.08), gain: gain * 0.25, attack: 0.001 });
}

/** A soft bell for melodies. */
function chime(ctx: Ctx, out: AudioNode, t: number, note: number, dur: number, gain: number): void {
  voice(ctx, out, { freq: hz(note), start: t, dur, gain, attack: 0.004 });
  voice(ctx, out, { freq: hz(note) * 2, start: t, dur: dur * 0.5, gain: gain * 0.25, attack: 0.004 });
}

/** A short chord, like a strummed or pianoish offbeat. */
function stab(ctx: Ctx, out: AudioNode, t: number, notes: readonly number[], dur: number, gain: number): void {
  for (const note of notes) voice(ctx, out, { type: "triangle", freq: hz(note), start: t, dur, gain, attack: 0.004 });
}

/** A held, airy chord that fades in. */
function pad(ctx: Ctx, out: AudioNode, t: number, notes: readonly number[], dur: number, gain: number): void {
  for (const note of notes) {
    voice(ctx, out, { freq: hz(note), start: t, dur, gain, attack: dur * 0.3, hold: dur * 0.35 });
    voice(ctx, out, { type: "triangle", freq: hz(note) * 1.004, start: t, dur, gain: gain * 0.45, attack: dur * 0.35, hold: dur * 0.3 });
  }
}

function lead(ctx: Ctx, out: AudioNode, t: number, note: number, dur: number, gain: number, type: OscillatorType = "square", bright = 2200): void {
  voice(ctx, out, { type, freq: hz(note), start: t, dur, gain, attack: 0.008, hold: dur * 0.45, lowpass: bright });
}

/* ───────────── Songs ───────────── */

/** [step in the bar, MIDI note, length in sixteenths]. */
type Phrase = readonly (readonly [number, number, number])[];

interface Chord {
  root: number;
  tones: readonly number[];
}

export interface Song {
  key: SongKey;
  title: string;
  bpm: number;
  bars: number;
  /** Overall level of the song, so all of them sit alike. */
  level: number;
  /** Draws what plays on `step` (0 to bars × 16 − 1) at time `t`. */
  step(ctx: Ctx, out: AudioNode, t: number, step: number, sixteenth: number): void;
}

export type SongKey = "menu" | "letras" | "preguntas" | "largada" | "secuencia";

function melody(ctx: Ctx, out: AudioNode, t: number, phrase: Phrase | undefined, at: number, sixteenth: number, play: (note: number, dur: number) => void): void {
  for (const [step, note, length] of phrase ?? []) if (step === at) play(note, length * sixteenth);
}

/** The menus: a happy cumbia-like walk around the square (C major, 104 BPM). */
const PLAZA: Record<string, Chord> = {
  C: { root: 48, tones: [60, 64, 67] },
  G: { root: 43, tones: [59, 62, 67] },
  Am: { root: 45, tones: [60, 64, 69] },
  F: { root: 41, tones: [60, 65, 69] },
};
const PLAZA_BARS = ["C", "G", "Am", "F", "C", "G", "F", "G"];
const PLAZA_TUNE: Phrase[] = [
  [[0, 76, 3], [3, 79, 3], [6, 81, 2], [8, 79, 4], [12, 76, 2], [14, 74, 2]],
  [[0, 74, 2], [2, 76, 2], [4, 74, 2], [6, 71, 2], [8, 67, 6]],
  [[0, 72, 3], [3, 76, 3], [6, 81, 2], [8, 79, 3], [11, 76, 3], [14, 72, 2]],
  [[0, 69, 2], [2, 72, 2], [4, 77, 4], [8, 76, 6], [14, 74, 2]],
  [[0, 76, 3], [3, 79, 3], [6, 81, 2], [8, 79, 4], [12, 76, 2], [14, 74, 2]],
  [[0, 74, 2], [2, 76, 2], [4, 79, 2], [6, 83, 2], [8, 79, 6]],
  [[0, 77, 3], [3, 76, 3], [6, 74, 2], [8, 72, 4], [12, 69, 4]],
  [[0, 71, 2], [2, 74, 2], [4, 79, 4], [8, 77, 2], [10, 76, 2], [12, 74, 4]],
];

/** Diez Letras: marimba arpeggios to think along to (F major, 96 BPM). */
const INGENIO: Record<string, Chord> = {
  F: { root: 41, tones: [65, 69, 72] },
  Dm: { root: 38, tones: [62, 65, 69] },
  Bb: { root: 46, tones: [62, 65, 70] },
  C: { root: 48, tones: [60, 64, 67] },
  Gm: { root: 43, tones: [62, 67, 70] },
};
const INGENIO_BARS = ["F", "Dm", "Bb", "C", "F", "Dm", "Gm", "C"];
const INGENIO_TUNE: Phrase[] = [[], [[8, 77, 2], [10, 76, 2], [12, 74, 4]], [], [[8, 72, 2], [10, 74, 2], [12, 76, 4]], [], [[8, 81, 2], [10, 79, 2], [12, 77, 4]], [], [[8, 76, 2], [10, 74, 2], [12, 72, 4]]];
const ARPEGGIO = [0, 1, 2, 3, 2, 1, 2, 1];

/** Cinco Preguntas: a game show's suspense, pizzicato bass and a question-like tune (A minor, 112 BPM). */
const CONCURSO: Record<string, Chord> = {
  Am: { root: 45, tones: [69, 72, 76] },
  F: { root: 41, tones: [69, 72, 77] },
  G: { root: 43, tones: [67, 71, 74] },
  E: { root: 40, tones: [68, 71, 76] },
  Dm: { root: 38, tones: [69, 74, 77] },
};
const CONCURSO_BARS = ["Am", "F", "G", "E", "Am", "F", "Dm", "E"];
const CONCURSO_TUNE: Phrase[] = [
  [[0, 76, 4], [4, 81, 4], [8, 84, 4], [12, 83, 4]],
  [[0, 81, 8], [8, 77, 8]],
  [[0, 79, 4], [4, 83, 4], [8, 86, 4], [12, 84, 4]],
  [[0, 83, 8], [8, 80, 8]],
  [[0, 76, 4], [4, 81, 4], [8, 84, 4], [12, 83, 4]],
  [[0, 81, 4], [4, 84, 4], [8, 81, 4], [12, 77, 4]],
  [[0, 77, 4], [4, 81, 4], [8, 86, 8]],
  [[0, 83, 4], [4, 80, 4], [8, 76, 4], [12, 80, 4]],
];
const PIZZICATO = [0, 12, 7, 12, 0, 12, 7, 12];

/** Largada: a race, driving bass, four on the floor and a fast arpeggio (E minor, 150 BPM). */
const CARRERA: Record<string, Chord> = {
  Em: { root: 52, tones: [64, 67, 71] },
  C: { root: 48, tones: [64, 67, 72] },
  D: { root: 50, tones: [66, 69, 74] },
  B: { root: 47, tones: [66, 71, 75] },
  Am: { root: 45, tones: [64, 69, 72] },
};
const CARRERA_BARS = ["Em", "C", "D", "B", "Em", "C", "Am", "B"];
const CARRERA_TUNE: Phrase[] = [
  [],
  [],
  [[0, 74, 2], [2, 78, 2], [4, 81, 4], [8, 78, 2], [10, 81, 2], [12, 86, 4]],
  [[0, 83, 4], [4, 78, 4], [8, 75, 4], [12, 78, 4]],
  [],
  [],
  [[0, 76, 2], [2, 79, 2], [4, 84, 4], [8, 83, 2], [10, 81, 2], [12, 79, 4]],
  [[0, 78, 4], [4, 75, 4], [8, 83, 8]],
];
const DRIVE = [0, 0, 0, 12, 0, 0, 12, 0];

/** Secuencia: calm and a little mysterious, a clock and soft chords below the pads' notes (A major, 84 BPM). */
const MEMORIA: Record<string, Chord> = {
  A: { root: 45, tones: [57, 61, 64] },
  Fsm: { root: 42, tones: [54, 57, 61] },
  D: { root: 50, tones: [50, 54, 57] },
  E: { root: 52, tones: [52, 56, 59] },
};
const MEMORIA_BARS = ["A", "A", "Fsm", "Fsm", "D", "D", "E", "E"];
const MEMORIA_SPARKLE: Phrase[] = [[], [[8, 93, 4], [12, 88, 6]], [], [[8, 92, 4], [12, 85, 6]], [], [[8, 90, 4], [12, 86, 6]], [], [[8, 88, 4], [12, 92, 6]]];

export const SONGS: Record<SongKey, Song> = {
  menu: {
    key: "menu",
    title: "Plaza",
    bpm: 104,
    bars: 8,
    level: 0.9,
    step(ctx, out, t, step, s) {
      const bar = Math.floor(step / 16);
      const at = step % 16;
      const chord = PLAZA[PLAZA_BARS[bar]!]!;
      if (at === 0) bass(ctx, out, t, chord.root, 4 * s, 0.15);
      if (at === 6) bass(ctx, out, t, chord.root, 2 * s, 0.11);
      if (at === 8) bass(ctx, out, t, chord.root + 7, 4 * s, 0.14);
      if (at === 14) bass(ctx, out, t, chord.root + 7, 2 * s, 0.1);
      if (at % 4 === 2) stab(ctx, out, t, chord.tones, 1.3 * s, 0.035);
      shaker(ctx, out, t, at % 2 === 0 ? 0.05 : 0.025);
      if (at === 0 || at === 8) kick(ctx, out, t, 0.28);
      if (at === 4 || at === 12) rim(ctx, out, t, 0.07);
      melody(ctx, out, t, PLAZA_TUNE[bar], at, s, (note, dur) => chime(ctx, out, t, note, dur + 0.15, 0.07));
    },
  },
  letras: {
    key: "letras",
    title: "Ingenio",
    bpm: 96,
    bars: 8,
    level: 0.9,
    step(ctx, out, t, step, s) {
      const bar = Math.floor(step / 16);
      const at = step % 16;
      const chord = INGENIO[INGENIO_BARS[bar]!]!;
      if (at % 2 === 0) {
        const index = ARPEGGIO[at / 2]!;
        const note = index === 3 ? chord.tones[0]! + 12 : chord.tones[index]!;
        marimba(ctx, out, t, note, 1.6 * s, 0.07);
      }
      if (at === 0) bass(ctx, out, t, chord.root + 12, 6 * s, 0.12, 700);
      if (at === 8) bass(ctx, out, t, chord.root + 19, 6 * s, 0.1, 700);
      if (at === 0) kick(ctx, out, t, 0.2);
      if (at === 4 || at === 12) shaker(ctx, out, t, 0.035);
      if (at === 10) shaker(ctx, out, t, 0.02);
      melody(ctx, out, t, INGENIO_TUNE[bar], at, s, (note, dur) => chime(ctx, out, t, note, dur + 0.2, 0.055));
    },
  },
  preguntas: {
    key: "preguntas",
    title: "Concurso",
    bpm: 112,
    bars: 8,
    level: 0.85,
    step(ctx, out, t, step, s) {
      const bar = Math.floor(step / 16);
      const at = step % 16;
      const chord = CONCURSO[CONCURSO_BARS[bar]!]!;
      if (at % 2 === 0) bass(ctx, out, t, chord.root + 12 + PIZZICATO[at / 2]!, 0.8 * s, 0.11, 1200);
      if (at === 4 || at === 12) stab(ctx, out, t, chord.tones, 0.8 * s, 0.032);
      if (at === 0 || at === 8) kick(ctx, out, t, 0.26);
      if (at === 4 || at === 12) snare(ctx, out, t, 0.09);
      if (at % 4 === 2) hat(ctx, out, t, 0.03);
      melody(ctx, out, t, CONCURSO_TUNE[bar], at, s, (note, dur) => lead(ctx, out, t, note, dur, 0.035, "square", 1900));
    },
  },
  largada: {
    key: "largada",
    title: "Carrera",
    bpm: 150,
    bars: 8,
    level: 0.85,
    step(ctx, out, t, step, s) {
      const bar = Math.floor(step / 16);
      const at = step % 16;
      const chord = CARRERA[CARRERA_BARS[bar]!]!;
      if (at % 2 === 0) {
        const note = chord.root + DRIVE[at / 2]!;
        voice(ctx, out, { type: "sawtooth", freq: hz(note), start: t, dur: 1.7 * s, gain: 0.07, attack: 0.004, lowpass: 900 });
        voice(ctx, out, { type: "triangle", freq: hz(note), start: t, dur: 1.7 * s, gain: 0.09, attack: 0.004 });
      }
      if (at % 4 === 0) kick(ctx, out, t, 0.38);
      if (at === 4 || at === 12) snare(ctx, out, t, 0.17);
      hat(ctx, out, t, at % 4 === 2 ? 0.045 : 0.02, at === 14);
      const arp = [chord.tones[0]!, chord.tones[1]!, chord.tones[2]!, chord.tones[0]! + 12];
      lead(ctx, out, t, arp[at % 4]! + 12, 0.9 * s, 0.022, "square", 2600);
      if (bar % 4 === 0 && at === 0) hit(ctx, out, t, 0.9, 0.05, "highpass", 5000);
      melody(ctx, out, t, CARRERA_TUNE[bar], at, s, (note, dur) => lead(ctx, out, t, note, dur, 0.04, "sawtooth", 2400));
    },
  },
  secuencia: {
    key: "secuencia",
    title: "Memoria",
    bpm: 84,
    bars: 8,
    level: 1,
    step(ctx, out, t, step, s) {
      const bar = Math.floor(step / 16);
      const at = step % 16;
      const chord = MEMORIA[MEMORIA_BARS[bar]!]!;
      if (bar % 2 === 0 && at === 0) {
        pad(ctx, out, t, chord.tones, 32 * s, 0.028);
        bass(ctx, out, t, chord.root, 12 * s, 0.07, 500);
      }
      if (at % 4 === 0) voice(ctx, out, { freq: at % 8 === 0 ? 950 : 720, start: t, dur: 0.05, gain: 0.03, attack: 0.002 });
      melody(ctx, out, t, MEMORIA_SPARKLE[bar], at, s, (note, dur) => chime(ctx, out, t, note, dur + 0.4, 0.02));
    },
  },
};

export interface Playing {
  stop(fadeSeconds?: number): void;
  /** Lowers the music for a while (Largada's lights, Secuencia's sequence) and back. */
  duck(level: number, seconds?: number): void;
}

/** Plays `song` in a loop on `out`, scheduling a little ahead so it never stutters. */
export function playSong(ctx: AudioContext, out: AudioNode, song: Song): Playing {
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, ctx.currentTime);
  bus.gain.exponentialRampToValueAtTime(song.level, ctx.currentTime + 0.6);
  bus.connect(out);
  const sixteenth = 60 / song.bpm / 4;
  const total = song.bars * 16;
  let step = 0;
  let next = ctx.currentTime + 0.08;
  const schedule = () => {
    // A tab that was asleep starts again from now instead of rushing the missed notes.
    if (next < ctx.currentTime - 0.2) next = ctx.currentTime + 0.05;
    while (next < ctx.currentTime + 0.15) {
      song.step(ctx, bus, next, step % total, sixteenth);
      step++;
      next += sixteenth;
    }
  };
  schedule();
  const timer = window.setInterval(schedule, 25);
  let stopped = false;
  const rampTo = (level: number, seconds: number) => {
    const now = ctx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), now);
    bus.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), now + seconds);
  };
  return {
    stop(fadeSeconds = 0.5) {
      if (stopped) return;
      stopped = true;
      window.clearInterval(timer);
      rampTo(0.0001, fadeSeconds);
      window.setTimeout(() => bus.disconnect(), fadeSeconds * 1000 + 400);
    },
    duck(level, seconds = 0.3) {
      if (!stopped) rampTo(song.level * level, seconds);
    },
  };
}
