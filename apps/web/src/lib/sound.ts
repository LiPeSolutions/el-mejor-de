/*
 * Largada's sounds: a short, dry knock for each light. Browsers only play
 * sound after a tap, so `unlockSound` runs on "Empezar". On the iPhone the
 * silent switch mutes it ("ambient" session).
 */

let audio: AudioContext | null = null;

export function unlockSound(): void {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "ambient";
    audio ??= new AudioContext();
    void audio.resume();
  } catch {
    // No Web Audio: no sound.
  }
}

/** The knock of a light going on. */
export function knock(): void {
  if (!audio || audio.state !== "running") return;
  const t = audio.currentTime;
  const tone = audio.createOscillator();
  const volume = audio.createGain();
  tone.type = "sine";
  tone.frequency.setValueAtTime(150, t);
  tone.frequency.exponentialRampToValueAtTime(55, t + 0.09);
  volume.gain.setValueAtTime(0.0001, t);
  volume.gain.exponentialRampToValueAtTime(0.45, t + 0.005);
  volume.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  tone.connect(volume).connect(audio.destination);
  tone.start(t);
  tone.stop(t + 0.13);
}

export function vibrate(ms: number): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Not supported (iPhone): no vibration.
  }
}
