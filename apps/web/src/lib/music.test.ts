import { describe, expect, it, vi } from "vitest";
import { SONGS, playSong, type SongKey } from "./music";
import { fakeAudioContext } from "./testing/fake-audio";

describe("the app's music", () => {
  it.each(Object.keys(SONGS) as SongKey[])("%s plays every step of its loop on time", (key) => {
    const song = SONGS[key];
    const { ctx, ramps, starts } = fakeAudioContext();
    const sixteenth = 60 / song.bpm / 4;
    const steps = song.bars * 16;
    for (let step = 0; step < steps; step++) {
      const before = starts.length;
      const t = 1 + step * sixteenth;
      song.step(ctx, ctx.destination, t, step, sixteenth);
      expect(starts.slice(before).every((start) => start >= t)).toBe(true);
    }
    // Every bar plays something (Secuencia's is sparse on purpose).
    expect(starts.length).toBeGreaterThanOrEqual(song.bars * 4);
    expect(ramps.every((ramp) => ramp.value > 0)).toBe(true);
  });

  it("goes faster in Largada than in the trivia, and calmest in Secuencia", () => {
    expect(SONGS.largada.bpm).toBeGreaterThan(SONGS.preguntas.bpm);
    expect(SONGS.secuencia.bpm).toBeLessThan(Math.min(SONGS.menu.bpm, SONGS.letras.bpm, SONGS.preguntas.bpm));
  });
});

describe("music in a battle's room", () => {
  it("puts phones that share a clock on the same beat, whenever each one starts", () => {
    vi.stubGlobal("window", { setInterval: () => 0, clearInterval: () => undefined, setTimeout: () => 0 });
    const song = SONGS.largada;
    const sixteenth = 60 / song.bpm / 4;
    const grid = 1.234;
    const firstBeats = [5, 7.3].map((now) => {
      const { ctx, starts } = fakeAudioContext();
      (ctx as unknown as { currentTime: number }).currentTime = now;
      playSong(ctx as AudioContext, ctx.destination, song, grid);
      const first = Math.min(...starts);
      expect(first).toBeGreaterThanOrEqual(now);
      return first;
    });
    for (const first of firstBeats) {
      const beats = (first - grid) / sixteenth;
      expect(Math.abs(beats - Math.round(beats))).toBeLessThan(1e-6);
    }
    vi.unstubAllGlobals();
  });
});
