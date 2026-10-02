"use client";

import type { ReflexesLog } from "@repo/games";
import { Hourglass, X, Zap } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type PointerEvent } from "react";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/IconButton";
import { Screen } from "@/components/ui/Screen";
import type { StartView } from "@/lib/challenge-types";
import { FloatingToast, useToast } from "./chrome";

type View = Extract<StartView, { game: "reflexes" }>;
type Round = ReflexesLog["rounds"][number];

interface Props {
  view: View;
  onProgress: (log: ReflexesLog) => void;
  onFinish: (log: ReflexesLog) => void;
  onExit: () => void;
}

type Phase = "waiting" | "go" | "done";

/** The whole screen is the button. Waiting is dark; "¡YA!" is turquoise, with icon and text too. */
export function ReflexesPlay({ view, onProgress, onFinish, onExit }: Props) {
  const total = view.delaysMs.length;
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [backdrop, setBackdrop] = useState<"ink" | "reflejos">("ink");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [toast, showToast] = useToast();
  const goAt = useRef<number | null>(null);
  const timers = useRef<number[]>([]);
  const results = useRef<Round[]>([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const record = (entry: Round) => {
    results.current = [...results.current, entry];
    setRounds(results.current);
    onProgress({ rounds: results.current });
  };

  // After the round's random wait, the screen turns turquoise.
  const scheduleGo = (index: number) => {
    later(() => {
      setPhase("go");
      setBackdrop("reflejos");
      // Two frames: the timestamp is taken once "¡YA!" is actually on screen.
      requestAnimationFrame(() => requestAnimationFrame(() => (goAt.current = performance.now())));
      later(() => miss(index), view.maxReactionMs);
    }, view.delaysMs[index] ?? 2000);
  };

  const startRound = (index: number) => {
    clearTimers();
    goAt.current = null;
    setRound(index);
    setPhase("waiting");
    setBackdrop("ink");
    scheduleGo(index);
  };

  const next = (index: number, wait: number) => {
    setPhase("done");
    later(() => {
      if (index + 1 < total) startRound(index + 1);
      else onFinish({ rounds: results.current });
    }, wait);
  };

  const miss = (index: number) => {
    record({ reactionMs: null, falseStart: false });
    showToast({ tone: "danger", icon: <Hourglass className="size-3.5" strokeWidth={3} />, text: "Muy lento · ronda perdida" });
    next(index, 1200);
  };

  // The first round starts in the initial state ("Esperá…"), so it only needs its timer.
  const begin = useEffectEvent(() => scheduleGo(0));
  useEffect(() => {
    begin();
    return () => clearTimers();
  }, []);

  const onPress = (event: PointerEvent) => {
    if ((event.target as HTMLElement).closest("[data-no-tap]")) return;
    if (phase === "waiting") {
      clearTimers();
      record({ reactionMs: null, falseStart: true });
      showToast({ tone: "danger", icon: <X className="size-3.5" strokeWidth={3} />, text: "Te adelantaste · ronda perdida" });
      next(round, 1200);
    } else if (phase === "go") {
      clearTimers();
      const reactionMs = Math.round(performance.now() - (goAt.current ?? performance.now()));
      const previousBest = Math.min(...results.current.flatMap((r) => (r.reactionMs === null ? [] : [r.reactionMs])));
      record({ reactionMs, falseStart: false });
      const best = reactionMs < previousBest && results.current.length > 1;
      showToast({ tone: "success", icon: <Zap className="size-3.5 fill-current" strokeWidth={2.6} />, text: best ? `${reactionMs} ms · ¡tu mejor ronda!` : `${reactionMs} ms` });
      next(round, 900);
    }
  };

  const onInk = backdrop === "ink";
  return (
    <Screen backdrop={backdrop}>
      <div className="flex flex-1 touch-manipulation flex-col select-none" onPointerDown={onPress}>
        <div className="flex items-center justify-between px-5" data-no-tap>
          <IconButton label="Salir" onClick={onExit} tone={onInk ? "light" : "glass"}>
            <X className="size-[18px]" strokeWidth={2.6} />
          </IconButton>
          <div className={cx("flex h-[34px] items-center rounded-full px-3.5 text-[13px] font-bold", onInk ? "bg-white/12" : "bg-white/40")}>
            Ronda {Math.min(round + 1, total)} de {total}
          </div>
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center gap-[22px] px-5 pb-10" aria-live="assertive">
          {onInk ? (
            <>
              <div className="grid size-60 place-items-center rounded-full border-[3px] border-dashed border-white/22">
                <Hourglass className="size-[92px] text-white/80" strokeWidth={1.8} />
              </div>
              <div className="text-center">
                <div className="font-display text-[40px] leading-none font-extrabold tracking-[-.03em]">Esperá…</div>
                <div className="mt-2.5 text-[15px] font-semibold text-white/70">Cuando cambie, tocá en cualquier lado</div>
              </div>
            </>
          ) : (
            <>
              <div className="grid size-60 place-items-center rounded-full bg-white/35 shadow-[0_0_0_18px_rgba(255,255,255,.14)]">
                <Zap className="size-[110px] fill-ink text-ink" strokeWidth={1.6} />
              </div>
              <div className="text-center">
                <div className="font-display text-8xl leading-none font-extrabold tracking-[-.05em]">¡YA!</div>
                <div className="mt-2 font-display text-xl font-extrabold">¡Tocá!</div>
              </div>
            </>
          )}
          <FloatingToast toast={toast} className="bottom-2" />
        </div>

        <div className="flex justify-center gap-2 px-5 pb-8">
          {Array.from({ length: total }, (_, i) => {
            const result = rounds[i];
            if (result) {
              return (
                <div
                  key={i}
                  className={cx(
                    "flex h-[34px] items-center rounded-full px-3 font-display text-[13px] font-extrabold tabular-nums",
                    onInk ? "bg-white/14" : "bg-white/45",
                  )}
                >
                  {result.reactionMs === null ? "✗" : `${result.reactionMs} ms`}
                </div>
              );
            }
            return (
              <div
                key={i}
                className={cx(
                  "h-[34px] w-[52px] rounded-full border-2",
                  i === round
                    ? onInk
                      ? "border-white/35"
                      : "border-ink/50"
                    : cx("border-dashed", onInk ? "border-white/22" : "border-ink/30"),
                )}
              />
            );
          })}
        </div>
      </div>
    </Screen>
  );
}
