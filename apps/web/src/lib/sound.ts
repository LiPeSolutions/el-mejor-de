"use client";

import { useEffect, useSyncExternalStore } from "react";
import { SONGS, playSong, type Playing, type SongKey } from "./music";
import { synth, type SoundName } from "./synth";

/*
 * The speaker: one audio context for the whole app, opened by a tap
 * (browsers only play sound after one; `SoundUnlock` listens for it). On the
 * iPhone the silent switch mutes it and it doesn't stop the music someone is
 * listening to ("ambient"). On by default; each phone remembers if it was
 * turned off. Sounds never tell what the screen doesn't: Largada's signal,
 * for one, is silent, so playing with sound gives no edge.
 *
 * Music goes on its own bus, under the effects: the menus' song unless a
 * game screen asks for its own, and it can be turned off by itself.
 */

const KEY = "emd:sonido";
const MUSIC_KEY = "emd:musica";
const CHANGE = "emd:sonido";
/** How loud the music sits under the effects. */
const MUSIC_LEVEL = 0.55;

let audio: AudioContext | null = null;
let output: AudioNode | null = null;
let musicBus: AudioNode | null = null;

function read(key: string, off: string): boolean {
  try {
    return window.localStorage.getItem(key) !== off;
  } catch {
    return true;
  }
}

function write(key: string, off: string, on: boolean): void {
  try {
    if (on) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, off);
  } catch {
    // Storage blocked: it lasts until the page closes.
  }
  window.dispatchEvent(new Event(CHANGE));
}

/** All the app's sound, effects and music. */
export const soundOn = () => read(KEY, "apagado");
/** Music only; with sound off it doesn't play either. */
export const musicOn = () => read(MUSIC_KEY, "apagada");

export function setSoundOn(on: boolean): void {
  write(KEY, "apagado", on);
  // Turning it on is a tap: the speaker can open right away.
  if (on) unlockSound();
  applyMusic();
}

export function setMusicOn(on: boolean): void {
  write(MUSIC_KEY, "apagada", on);
  if (on) unlockSound();
  applyMusic();
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === MUSIC_KEY || event.key === null) onChange();
  };
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Whether sound is on (true on the server and while hydrating). */
export function useSoundOn(): boolean {
  return useSyncExternalStore(subscribe, soundOn, () => true);
}

export function useMusicOn(): boolean {
  return useSyncExternalStore(subscribe, musicOn, () => true);
}

/** Opens the speaker. It has to run inside a tap. */
export function unlockSound(): void {
  if (!soundOn()) return;
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== "ambient") session.type = "ambient";
    if (!audio) {
      audio = new AudioContext();
      // Sounds that overlap don't clip.
      const limiter = audio.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.ratio.value = 6;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.2;
      limiter.connect(audio.destination);
      const effects = audio.createGain();
      effects.gain.value = 0.9;
      effects.connect(limiter);
      output = effects;
      const music = audio.createGain();
      music.gain.value = MUSIC_LEVEL;
      music.connect(limiter);
      musicBus = music;
      audio.addEventListener("statechange", applyMusic);
      // Leaving the app pauses the music; coming back starts it again.
      document.addEventListener("visibilitychange", applyMusic);
    }
    if (audio.state !== "running") void audio.resume().then(applyMusic, () => undefined);
  } catch {
    // No Web Audio: no sound.
  }
}

/** Whether a sound would play right now: the speaker is open and on. */
export function soundReady(): boolean {
  return audio !== null && output !== null && audio.state === "running" && soundOn();
}

type Extra<F> = F extends (ctx: BaseAudioContext, out: AudioNode, t: number, ...rest: infer R) => number ? R : never;

/** The music steps back while these play, so they're heard. */
const DUCK_FOR: Partial<Record<SoundName, number>> = { reveal: 0.45, jackpot: 0.4, record: 0.3, dayDone: 0.3, crown: 0.25 };

/** Plays one of the app's sounds now, if the speaker is open and on. */
export function playSound<K extends keyof typeof synth>(name: K, ...args: Extra<(typeof synth)[K]>): void {
  if (!soundReady() || !audio || !output) return;
  try {
    const draw = synth[name] as (ctx: BaseAudioContext, out: AudioNode, t: number, ...rest: unknown[]) => number;
    const duration = draw(audio, output, audio.currentTime + 0.005, ...args);
    const duck = DUCK_FOR[name];
    if (duck !== undefined && playing && ducking === 1) {
      const song = playing.song;
      song.duck(duck, 0.15);
      window.setTimeout(() => {
        if (ducking === 1) song.duck(1, 0.5);
      }, duration * 1000);
    }
  } catch {
    // A sound that fails just doesn't play.
  }
}

/** Plays a sound after `ms`, unless `cancel` runs first. */
export function playSoundLater<K extends keyof typeof synth>(ms: number, name: K, ...args: Extra<(typeof synth)[K]>): () => void {
  const id = window.setTimeout(() => playSound(name, ...args), ms);
  return () => window.clearTimeout(id);
}

/* ───────────── Music ───────────── */

let playing: { key: SongKey; grid: number | null; song: Playing } | null = null;
/**
 * Screens asking for their song; the last one wins, and with none it's the
 * menus'. A battle's room also gives the moment its loops count from, in
 * this phone's clock (performance.timeOrigin + performance.now()), so every
 * phone in the room plays in step.
 */
const claims: { key: SongKey; grid: number | null }[] = [];
/** Below 1 while a game holds the music down (Largada's lights, Secuencia's sequence). */
let ducking = 1;

function applyMusic(): void {
  const claim = claims[claims.length - 1] ?? { key: "menu" as const, grid: null };
  const allowed = audio !== null && musicBus !== null && audio.state === "running" && soundOn() && musicOn() && document.visibilityState === "visible";
  if (!allowed || !audio || !musicBus) {
    playing?.song.stop(0.3);
    playing = null;
    document.documentElement.dataset.musica = "";
    return;
  }
  if (playing?.key === claim.key && playing.grid === claim.grid) return;
  playing?.song.stop(0.6);
  const grid = claim.grid === null ? undefined : audio.currentTime + (claim.grid - (performance.timeOrigin + performance.now())) / 1000;
  playing = { key: claim.key, grid: claim.grid, song: playSong(audio, musicBus, SONGS[claim.key], grid) };
  if (ducking !== 1) playing.song.duck(ducking, 0.01);
  // Which song is playing, for tests (and anyone curious).
  document.documentElement.dataset.musica = claim.key;
}

/**
 * A screen's song while it's on screen; without one, the menus' plays.
 * `grid` (this phone's clock, in ms) lines the loop up with other phones.
 */
export function useMusic(key: SongKey, grid: number | null = null): void {
  useEffect(() => {
    const claim = { key, grid };
    claims.push(claim);
    applyMusic();
    return () => {
      const index = claims.lastIndexOf(claim);
      if (index !== -1) claims.splice(index, 1);
      // The next screen may ask for its own right away: wait a moment before going back to the menus' song.
      window.setTimeout(applyMusic, 250);
    };
  }, [key, grid]);
}

/** Holds the music down to `level` (0–1) until `restoreMusic`. */
export function duckMusic(level: number): void {
  if (ducking === level) return;
  ducking = level;
  playing?.song.duck(level, 0.3);
}

export function restoreMusic(): void {
  if (ducking === 1) return;
  ducking = 1;
  playing?.song.duck(1, 0.4);
}

/** A vibration, or a pattern of them (`[15, 60, 15]`: buzz, pause, buzz). */
export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported (iPhone): no vibration.
  }
}
