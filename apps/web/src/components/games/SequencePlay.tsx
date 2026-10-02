"use client";

import { SEQUENCE_RULES, sequenceScore, type SequenceLog } from "@repo/games";
import { Check, Eye, Heart, Moon, Star, X, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { cx } from "@/components/ui/cx";
import { Screen } from "@/components/ui/Screen";
import { api } from "@/lib/api";
import type { StartView } from "@/lib/challenge-types";
import { GameHeader, ScoreRow } from "./chrome";

type View = Extract<StartView, { game: "sequence" }>;

interface Props {
  view: View;
  token: string;
  /** Best level so far on this device, for "Récord". */
  record: number | null;
  onProgress: (log: SequenceLog) => void;
  onFinish: (log: SequenceLog) => void;
  onExit: () => void;
}

/** Each pad has its own color, corner, shape and icon: nothing depends on color alone. */
const PADS: Array<{ label: string; Icon: LucideIcon; bg: string; fg: string; corner: string; shadow: string; ring: string }> = [
  { label: "Estrella", Icon: Star, bg: "bg-letras", fg: "text-white", corner: "rounded-[32px_12px_12px_12px]", shadow: "rgba(255,107,74,.3)", ring: "#FF6B4A" },
  { label: "Luna", Icon: Moon, bg: "bg-preguntas", fg: "text-white", corner: "rounded-[12px_32px_12px_12px]", shadow: "rgba(139,108,255,.3)", ring: "#8B6CFF" },
  { label: "Rayo", Icon: Zap, bg: "bg-reflejos", fg: "text-white", corner: "rounded-[12px_12px_12px_32px]", shadow: "rgba(46,196,182,.3)", ring: "#2EC4B6" },
  { label: "Corazón", Icon: Heart, bg: "bg-secuencia", fg: "text-ink", corner: "rounded-[12px_12px_32px_12px]", shadow: "rgba(255,197,61,.35)", ring: "#FFC53D" },
];

type Phase = "watch" | "input" | "advancing" | "failed";

export function SequencePlay({ view, token, record, onProgress, onFinish, onExit }: Props) {
  const maxLevel = SEQUENCE_RULES.maxLength - view.startLength + 1;
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState(view.sequence);
  const [phase, setPhase] = useState<Phase>("watch");
  const [shown, setShown] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [inputs, setInputs] = useState<number[]>([]);
  const [completed, setCompleted] = useState(0);
  const levels = useRef<SequenceLog["levels"]>([]);
  const inputStart = useRef(0);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const end = () => {
    if (finished.current) return;
    finished.current = true;
    onFinish({ levels: levels.current });
  };

  // Show the sequence: each item lights up for 400 ms, then 200 ms dark.
  // `shown` and `active` are already reset when a level starts.
  const play = useEffectEvent((items: number[]) => {
    clearTimers();
    items.forEach((pad, i) => {
      later(() => {
        setActive(pad);
        setShown(i + 1);
      }, 500 + i * view.showMsPerItem);
      later(() => setActive(null), 500 + i * view.showMsPerItem + 400);
    });
    later(() => {
      setPhase("input");
      inputStart.current = performance.now();
    }, 500 + items.length * view.showMsPerItem);
  });

  useEffect(() => {
    if (phase === "watch") play(sequence);
  }, [phase, sequence]);

  useEffect(() => () => clearTimers(), []);

  const flash = (pad: number) => {
    setActive(pad);
    later(() => setActive((current) => (current === pad ? null : current)), 180);
  };

  // The server sends the next, longer sequence only after this one was repeated right.
  const advance = async (nextInputs: number[]) => {
    try {
      const response = await api.level(token, level + 1, nextInputs);
      later(() => {
        setLevel(response.level);
        setSequence(response.sequence);
        setInputs([]);
        setShown(0);
        setActive(null);
        setPhase("watch");
      }, 800);
    } catch {
      end();
    }
  };

  const press = (pad: number, pressedAt: number) => {
    if (phase !== "input") return;
    flash(pad);
    const nextInputs = [...inputs, pad];
    const durationMs = Math.round(pressedAt - inputStart.current);
    if (pad !== sequence[nextInputs.length - 1]) {
      levels.current = [...levels.current, { inputs: nextInputs, durationMs }];
      onProgress({ levels: levels.current });
      setInputs(nextInputs);
      setPhase("failed");
      later(end, 1600);
      return;
    }
    if (nextInputs.length < sequence.length) {
      setInputs(nextInputs);
      return;
    }
    levels.current = [...levels.current, { inputs: nextInputs, durationMs }];
    onProgress({ levels: levels.current });
    setInputs(nextInputs);
    setCompleted(level);
    setPhase("advancing");
    if (level >= maxLevel) later(end, 900);
    else void advance(nextInputs);
  };

  const score = sequenceScore(completed);
  const gained = sequenceScore(completed) - sequenceScore(completed - 1);
  const showDots = sequence.length <= 14;

  return (
    <Screen clouds={["-left-[60px] bottom-[50px] w-[220px] opacity-70"]}>
      <GameHeader
        title="Secuencia"
        onClose={onExit}
        right={
          <div className="flex h-[38px] items-center rounded-full bg-white px-3.5 font-display text-base font-extrabold shadow-[0_6px_16px_rgba(35,38,58,.08)]">
            Nivel {level}
          </div>
        }
      />
      <ScoreRow score={score} label="Récord" value={record ? `Nivel ${record}` : "—"} />

      <div
        aria-live="polite"
        className={cx(
          "mx-5 mt-[18px] flex h-14 items-center justify-center gap-3 rounded-[18px] px-4 text-white shadow-[0_10px_24px_rgba(35,38,58,.2)]",
          phase === "watch" && "bg-brand",
          phase === "input" && "bg-ink",
          phase === "advancing" && "bg-success",
          phase === "failed" && "bg-danger",
        )}
      >
        {phase === "watch" && (
          <>
            <Eye className="size-5" strokeWidth={2.4} />
            <span className="font-display text-lg font-extrabold">Mirá…</span>
            <span className="text-[13px] font-bold text-white/75">
              {shown} de {sequence.length}
            </span>
          </>
        )}
        {phase === "input" && (
          <>
            <span className="font-display text-lg font-extrabold">Tu turno</span>
            {showDots && (
              <span className="flex gap-[5px]" aria-hidden>
                {sequence.map((_, i) => (
                  <span
                    key={i}
                    className={cx(
                      "size-3 rounded-full",
                      i < inputs.length ? "bg-gold" : "border-2 border-white/50",
                      i === inputs.length - 1 && "shadow-[0_0_0_3px_rgba(255,197,61,.35)]",
                    )}
                  />
                ))}
              </span>
            )}
            <span className="text-[13px] font-bold text-white/75">
              {inputs.length} de {sequence.length}
            </span>
          </>
        )}
        {phase === "advancing" && (
          <>
            <Check className="size-5" strokeWidth={3} />
            <span className="font-display text-lg font-extrabold">
              ¡Nivel {completed}! +{gained}
            </span>
          </>
        )}
        {phase === "failed" && (
          <>
            <X className="size-5" strokeWidth={3} />
            <span className="font-display text-lg font-extrabold">Ese no era · llegaste al nivel {completed}</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 px-8 pt-4">
        {PADS.map(({ label, Icon, bg, fg, corner, shadow, ring }, pad) => {
          const lit = active === pad;
          return (
            <button
              key={label}
              type="button"
              aria-label={label}
              disabled={phase !== "input"}
              onPointerDown={() => press(pad, performance.now())}
              className={cx("grid aspect-square place-items-center transition duration-150 select-none", bg, fg, corner, lit && "scale-[1.04]")}
              style={{
                boxShadow: lit ? `0 0 0 6px #fff, 0 0 0 10px ${ring}, 0 16px 30px ${shadow.replace(/[\d.]+\)$/, ".45)")}` : `0 10px 22px ${shadow}`,
              }}
            >
              <Icon className={cx("size-12", pad === 3 ? "fill-ink" : "fill-white")} strokeWidth={1.6} />
            </button>
          );
        })}
      </div>

      <p className="mt-auto px-5 pt-4 text-center text-xs font-semibold text-ink-500">
        Tocá los botones en el mismo orden · 1.000 en el nivel {SEQUENCE_RULES.targetLevel}
      </p>
    </Screen>
  );
}
