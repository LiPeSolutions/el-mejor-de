"use client";

import { useSyncExternalStore } from "react";
import { synth } from "./synth";

/*
 * The speaker: one audio context for the whole app, opened by a tap
 * (browsers only play sound after one; `SoundUnlock` listens for it). On the
 * iPhone the silent switch mutes it and it doesn't stop the music someone is
 * listening to ("ambient"). On by default; each phone remembers if it was
 * turned off. Sounds never tell what the screen doesn't: Largada's signal,
 * for one, is silent, so playing with sound gives no edge.
 */

const KEY = "emd:sonido";
const CHANGE = "emd:sonido";

let audio: AudioContext | null = null;
let output: AudioNode | null = null;

export function soundOn(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "apagado";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean): void {
  try {
    if (on) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, "apagado");
  } catch {
    // Storage blocked: it lasts until the page closes.
  }
  window.dispatchEvent(new Event(CHANGE));
  // Turning it on is a tap: the speaker can open right away.
  if (on) unlockSound();
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) onChange();
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
      const master = audio.createGain();
      master.gain.value = 0.9;
      master.connect(limiter).connect(audio.destination);
      output = master;
    }
    if (audio.state !== "running") void audio.resume();
  } catch {
    // No Web Audio: no sound.
  }
}

/** Whether a sound would play right now: the speaker is open and on. */
export function soundReady(): boolean {
  return audio !== null && output !== null && audio.state === "running" && soundOn();
}

type Extra<F> = F extends (ctx: BaseAudioContext, out: AudioNode, t: number, ...rest: infer R) => number ? R : never;

/** Plays one of the app's sounds now, if the speaker is open and on. */
export function playSound<K extends keyof typeof synth>(name: K, ...args: Extra<(typeof synth)[K]>): void {
  if (!soundReady() || !audio || !output) return;
  try {
    const draw = synth[name] as (ctx: BaseAudioContext, out: AudioNode, t: number, ...rest: unknown[]) => number;
    draw(audio, output, audio.currentTime + 0.005, ...args);
  } catch {
    // A sound that fails just doesn't play.
  }
}

/** Plays a sound after `ms`, unless `cancel` runs first. */
export function playSoundLater<K extends keyof typeof synth>(ms: number, name: K, ...args: Extra<(typeof synth)[K]>): () => void {
  const id = window.setTimeout(() => playSound(name, ...args), ms);
  return () => window.clearTimeout(id);
}

export function vibrate(ms: number): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Not supported (iPhone): no vibration.
  }
}
