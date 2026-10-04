"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, battlesApi } from "./api";
import type { BattleView } from "./battle-types";

/*
 * A battle on this phone: it asks the server how it's going, more often
 * when something is about to happen, and syncs its clock with every answer
 * so the questions and the lights come at the same moment on every phone.
 */

/** This phone's clock in milliseconds, steady while the page is open. */
export const localNow = () => performance.timeOrigin + performance.now();

/**
 * How far the server's clock is from this phone's, NTP style: of the last
 * answers, the one that took least on the way says it best.
 */
export class BattleClock {
  private samples: { delay: number; offset: number }[] = [];
  offset = 0;

  /** Enough answers to trust the estimate. */
  get settled(): boolean {
    return this.samples.length >= 3;
  }

  add(sentAt: number, receivedAt: number, serverAt: number, serverNow: number): void {
    const delay = receivedAt - sentAt - Math.max(0, serverNow - serverAt);
    const offset = (serverAt - sentAt + (serverNow - receivedAt)) / 2;
    this.samples.push({ delay, offset });
    if (this.samples.length > 10) this.samples.shift();
    this.offset = this.samples.reduce((best, sample) => (sample.delay < best.delay ? sample : best)).offset;
  }

  /** Now, by the server's clock. */
  now(): number {
    return localNow() + this.offset;
  }
}

/** For a switch over the games of a match: TypeScript says which one is missing. */
export function unknownGame(match: never): never {
  throw new Error(`unknown battle game ${(match as { game?: unknown }).game}`);
}

/** A phone asks for what's coming (Diez Letras' letters, Secuencia's colors) this early, so it's there on time. */
const AHEAD_MS = 300;

/** When to ask again: often while something is about to change, little in the room. */
function nextAsk(view: BattleView, now: number): number {
  if (view.stage === "lobby" || view.stage === "podium") return 2_000;
  const match = view.match;
  if (!match) return 2_000;
  // Right when the next thing comes (a question, the lights, the podium), and at least every 1,5 s.
  const until = (at: number | null) => Math.min(1_500, Math.max(100, (at ?? now) - now + 80));
  const ahead = (at: number) => Math.min(1_500, Math.max(100, at - AHEAD_MS - now));
  if (match.game === "seven-letters" && match.letters === null) return ahead(match.startsAt);
  if (match.game === "sequence" && match.current === null && match.rounds.length === 0) return ahead(match.startsAt);
  if (now < match.startsAt) return Math.min(1_000, Math.max(100, match.startsAt - now + 50));
  switch (match.game) {
    case "five-questions": {
      const round = match.round;
      if (!round) return 500;
      if (!round.closed) return match.myChoice !== null ? 400 : 700;
      return until(round.nextAt);
    }
    case "reflexes": {
      const round = match.rounds.at(-1);
      if (!round) return 500;
      if (round.closedAt === null) return now < round.signalAt ? Math.min(1_500, Math.max(150, round.signalAt - now + 150)) : 300;
      return until(round.nextAt);
    }
    case "seven-letters": {
      // Everyone's points, every second.
      const round = match.round;
      return round?.closed ? until(round.nextAt) : 1_000;
    }
    case "sequence": {
      const current = match.current;
      // Between rounds: the next one's colors, a moment before it shows.
      if (!current) return ahead(match.rounds.at(-1)?.nextAt ?? now);
      const done = match.answered.includes(view.meId) || !current.players.includes(view.meId);
      return done ? 400 : 700;
    }
    default:
      return unknownGame(match);
  }
}

export type BattleProblem = "not-in-battle" | "closed" | "not-found" | "signed-out" | "network";

function problemOf(error: unknown): BattleProblem {
  if (!(error instanceof ApiError)) return "network";
  if (error.status === 401) return "signed-out";
  if (error.code === "not-in-battle") return "not-in-battle";
  if (error.status === 410) return "closed";
  if (error.status === 404) return "not-found";
  return "network";
}

export function useBattle(id: string) {
  const [view, setView] = useState<BattleView | null>(null);
  const [problem, setProblem] = useState<BattleProblem | null>(null);
  /** When the server's clock was zero, in this phone's: the music of every phone in the room counts from it. */
  const [grid, setGrid] = useState<number | null>(null);
  const clock = useRef(new BattleClock());
  const askNow = useRef<() => void>(() => undefined);

  useEffect(() => {
    let alive = true;
    let timer = 0;
    let failures = 0;
    let busy = false;
    const ask = async () => {
      window.clearTimeout(timer);
      if (!alive || busy) return;
      busy = true;
      const sentAt = localNow();
      try {
        const next = await battlesApi.state(id);
        if (!alive) return;
        clock.current.add(sentAt, localNow(), next.serverAt, next.serverNow);
        if (clock.current.settled) {
          // Moved only for a real change: every move restarts the song.
          const origin = -clock.current.offset;
          setGrid((current) => (current === null || Math.abs(current - origin) > 40 ? origin : current));
        }
        failures = 0;
        setView(next);
        setProblem(null);
        if (next.stage !== "closed" && document.visibilityState === "visible") timer = window.setTimeout(() => void ask(), nextAsk(next, clock.current.now()));
      } catch (error) {
        if (!alive) return;
        const kind = problemOf(error);
        setProblem(kind);
        if (kind === "network") {
          failures += 1;
          timer = window.setTimeout(() => void ask(), Math.min(5_000, 800 * failures));
        }
      } finally {
        busy = false;
      }
    };
    askNow.current = () => void ask();
    void ask();
    // Leaving the app stops asking; coming back asks right away.
    const onVisible = () => {
      if (document.visibilityState === "visible") void ask();
      else window.clearTimeout(timer);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id]);

  const now = useCallback(() => clock.current.now(), []);
  /** Asks right away, e.g. after an answer or a start. */
  const refresh = useCallback(() => askNow.current(), []);
  return { view, problem, now, refresh, grid };
}

/** The server's time, refreshed every `everyMs` while the screen needs it (countdowns, clocks). */
export function useServerTime(now: () => number, everyMs = 200): number {
  const [time, setTime] = useState(0);
  useEffect(() => {
    const tick = () => setTime(now());
    tick();
    const id = window.setInterval(tick, everyMs);
    return () => window.clearInterval(id);
  }, [now, everyMs]);
  return time;
}
