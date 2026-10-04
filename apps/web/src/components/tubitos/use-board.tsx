"use client";

import { canLift, checkPour, colorsLeft, hasPours, isSolved, isTubeDone, moveLayers, topGroup, type Board as Tubes, type WaterSortEvent } from "@repo/games";
import { Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ToastState } from "@/components/games/chrome";
import { playSound, vibrate } from "@/lib/sound";
import { BACK_MS, FLY_MS, POUR_MS_PER_LAYER, TILT_MS, type Flash, type PourMotion } from "./Board";

/*
 * One Tubitos board being played: lifting, pouring (with its flight), the
 * "Ahí no", undoing and restarting, and the steps the server replays. The
 * daily challenge, practice and the live battles play their boards with it.
 */

/** After the last cork, the victory (§3). */
const VICTORY_AFTER_MS = 600;

export interface BoardEvents {
  /** The solving pour, `t` ms after the board started: its clock stops now. */
  onSolved: (t: number, moves: number, events: WaterSortEvent[]) => void;
  /** The last cork popped: the victory can show. */
  onWin: () => void;
  /** Any other step (a pour, an undo, a restart), for the progress log. */
  onStep?: (t: number, events: WaterSortEvent[]) => void;
  showToast: (toast: Omit<ToastState, "key">) => void;
}

export interface BoardOptions {
  /** The board as it starts (restarting goes back to it). */
  start: Tubes;
  capacity: number;
  undos: number;
  reduced: boolean;
  /** Taps count (the board is on and its clock running). */
  active: boolean;
  /** Milliseconds since the board started, for the steps. */
  timeNow: () => number;
}

export function useWaterSortBoard({ start, capacity, undos, reduced, active, timeNow }: BoardOptions, on: BoardEvents) {
  const [tubes, setTubes] = useState<Tubes>(start);
  const [moves, setMoves] = useState(0);
  const [undosLeft, setUndosLeft] = useState(undos);
  const [history, setHistory] = useState<Array<{ from: number; to: number; amount: number }>>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [refused, setRefused] = useState<Flash | null>(null);
  const [nudged, setNudged] = useState<Flash | null>(null);
  const [faded, setFaded] = useState<Flash | null>(null);
  const [pour, setPour] = useState<PourMotion | null>(null);
  const events = useRef<WaterSortEvent[]>([]);
  const timers = useRef<number[]>([]);
  const flashes = useRef(0);

  const later = (run: () => void, ms: number) => {
    timers.current.push(window.setTimeout(run, ms));
  };
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const targets = useMemo(
    () => new Set(selected === null ? [] : tubes.flatMap((_, index) => (checkPour(tubes, selected, index, capacity).ok ? [index] : []))),
    [selected, tubes, capacity],
  );
  const canAct = active && !pour;
  /** No pour left and not solved: undo or restart. */
  const stuck = !pour && !isSolved(tubes, capacity) && !hasPours(tubes, capacity);

  /** Marks some tubes for a moment (a shake, a fade). */
  const flash = (set: (update: (current: Flash | null) => Flash | null) => void, marked: number[], ms: number) => {
    flashes.current += 1;
    const next = { tubes: marked, key: flashes.current };
    set(() => next);
    later(() => set((current) => (current?.key === next.key ? null : current)), ms);
  };

  const tap = (index: number) => {
    if (!canAct) return;
    const tube = tubes[index];
    if (!tube) return;
    if (selected === null) {
      if (!canLift(tube, capacity)) {
        flash(setNudged, [index], 240);
        return;
      }
      setSelected(index);
      vibrate(10);
      return;
    }
    if (index === selected) {
      setSelected(null);
      return;
    }
    const check = checkPour(tubes, selected, index, capacity);
    if (!check.ok) {
      // It can't take it: the lifted one stays up, so another can be tried.
      flash(setRefused, [index], 600);
      on.showToast({
        tone: "danger",
        icon: <X className="size-3.5" strokeWidth={3} />,
        text: check.reason === "full" ? "Ahí no · ese tubo está lleno" : "Ahí no · solo sobre el mismo color",
      });
      playSound("fail");
      vibrate([15, 60, 15]);
      return;
    }
    pourInto(selected, index, check.amount);
  };

  const pourInto = (from: number, to: number, amount: number) => {
    const t = timeNow();
    const before = tubes;
    const after = moveLayers(before, from, to, amount);
    const color = topGroup(before[from]!)!.color;
    const madeIt = isSolved(after, capacity);
    events.current = [...events.current, { type: "pour", from, to, t }];
    setMoves(moves + 1);
    setHistory((steps) => [...steps, { from, to, amount }]);
    setSelected(null);
    if (madeIt) on.onSolved(t, moves + 1, events.current);
    else on.onStep?.(t, events.current);
    const settle = () => afterPour(before, after, to, madeIt);
    if (reduced) {
      // No flight: the liquid just goes, with a short fade.
      setTubes(after);
      flash(setFaded, [from, to], 150);
      playSound("pour", amount);
      settle();
      return;
    }
    const pourMs = amount * POUR_MS_PER_LAYER;
    setPour({ from, to, amount, color, stage: "lift", before });
    later(() => setPour((current) => current && { ...current, stage: "tilt" }), FLY_MS - TILT_MS);
    later(() => {
      setPour((current) => current && { ...current, stage: "pour" });
      playSound("pour", amount);
    }, FLY_MS);
    later(() => {
      setTubes(after);
      setPour((current) => current && { ...current, stage: "back" });
      settle();
    }, FLY_MS + pourMs);
    later(() => setPour(null), FLY_MS + pourMs + BACK_MS);
  };

  const afterPour = (before: Tubes, after: Tubes, to: number, madeIt: boolean) => {
    if (isTubeDone(after[to]!, capacity) && !isTubeDone(before[to]!, capacity)) {
      playSound("cork");
      vibrate(25);
      const left = colorsLeft(after, capacity);
      if (left > 0) on.showToast({ tone: "success", icon: <Check className="size-3.5" strokeWidth={3} />, text: `¡Tubo listo! · faltan ${left}` });
    }
    if (madeIt) later(on.onWin, VICTORY_AFTER_MS);
  };

  const undo = () => {
    const step = history.at(-1);
    if (!canAct || undosLeft === 0 || !step) return;
    const t = timeNow();
    events.current = [...events.current, { type: "undo", t }];
    setTubes(moveLayers(tubes, step.to, step.from, step.amount));
    setHistory((steps) => steps.slice(0, -1));
    setUndosLeft(undosLeft - 1);
    setSelected(null);
    flash(setFaded, [step.from, step.to], 150);
    on.onStep?.(t, events.current);
  };

  const restart = () => {
    if (!canAct || moves === 0) return;
    const t = timeNow();
    events.current = [...events.current, { type: "restart", t }];
    setTubes(start);
    setMoves(0);
    setUndosLeft(undos);
    setHistory([]);
    setSelected(null);
    flash(
      setFaded,
      start.map((_, index) => index),
      150,
    );
    on.onStep?.(t, events.current);
  };

  /** A new board: everything back to its start. */
  const reset = (next: Tubes) => {
    setTubes(next);
    setMoves(0);
    setUndosLeft(undos);
    setHistory([]);
    setSelected(null);
    setRefused(null);
    setNudged(null);
    setFaded(null);
    setPour(null);
    events.current = [];
  };

  return { tubes, moves, undosLeft, history, selected, refused, nudged, faded, pour, targets, stuck, tap, undo, restart, reset };
}
