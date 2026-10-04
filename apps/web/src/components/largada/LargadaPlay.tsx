"use client";

import type { Article } from "@repo/shared";
import { Crown, Hourglass, X, Zap } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { FloatingToast, useToast } from "@/components/games/chrome";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/IconButton";
import { Screen } from "@/components/ui/Screen";
import type { StartView } from "@/lib/challenge-types";
import { useMediaQuery } from "@/lib/hooks";
import { SoundToggle } from "@/components/ui/Sound";
import { RACE, departures, inSentence, noseAt, ordinal, placements, raceEndMs, startSummary } from "@/lib/largada";
import type { LargadaStart } from "@/lib/largada-types";
import { duckMusic, playSound, restoreMusic, vibrate } from "@/lib/sound";
import { CAR } from "./Car";
import type { Racer } from "./field";
import { Track, carScaleFor, laneHeightFor, type ChipSpec, type ChipTone, type TrackLane } from "./Track";

/*
 * Largada (designs 02 to 05): the five lights go on one per second and
 * after a random wait all go out; tap. The cars race with each one's real
 * time, and the arrival shows the places. Three starts.
 */

type View = Extract<StartView, { version: "largada" }>;
type Phase = "lights" | "go" | "race" | "arrival";

interface Props {
  view: View;
  /** Top to bottom, the player last. */
  field: Racer[];
  article: Article;
  onProgress: (log: { rounds: LargadaStart[] }) => void;
  onFinish: (log: { rounds: LargadaStart[] }) => void;
  onExit: () => void;
}

const FIRST_LIGHT_MS = 800;
const NEXT_START_MS = 2_000;
/** After the arrival the cars keep going until they leave the screen. */
const LEAVE_MS = 1_200;
const SKY = ["#C3DAF8", "#DAE1F6", "#E8EAF6"];
const DUSK = "#9AAED4";

function mix(a: string, b: string, f: number): string {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [x, y] = [parse(a), parse(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i]! - v) * f)).join(",")})`;
}

/** The sky darkens with each light. */
const skyFor = (lights: number) => {
  const f = Math.min(1, lights / 5);
  return `linear-gradient(180deg, ${mix(SKY[0]!, DUSK, f)} 0%, ${mix(SKY[1]!, DUSK, f)} 42%, ${mix(SKY[2]!, DUSK, f)} 100%)`;
};

const noStart: LargadaStart = { reactionMs: null, falseStart: false };

export function LargadaPlay({ view, field, article, onProgress, onFinish, onExit }: Props) {
  const total = view.delaysMs.length;
  const short = useMediaQuery("(max-height: 800px)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("lights");
  const [lights, setLights] = useState(0);
  const [mine, setMine] = useState<LargadaStart[]>([]);
  const [t, setT] = useState(0);
  const [toast, showToast] = useToast(1500);
  const timers = useRef<number[]>([]);
  const frame = useRef(0);
  const goAt = useRef<number | null>(null);
  const signalAt = useRef(0);
  const results = useRef<LargadaStart[]>([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    cancelAnimationFrame(frame.current);
  };
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  // This start's field: everyone's start number `index`, the player's as it went.
  const myStart = mine[index];
  const starts = field.map((racer) => (racer.me ? (myStart ?? noStart) : (racer.starts[index] ?? noStart)));
  const leftAt = departures(starts, view.maxReactionMs);
  const summary = myStart ? startSummary(field.map((racer, i) => ({ ...starts[i]!, name: racer.name, me: racer.me })), view.maxReactionMs, article) : null;

  const scheduleLights = (round: number) => {
    for (let light = 1; light <= 5; light++) {
      later(() => {
        setLights(light);
        playSound("knock");
        vibrate(15);
      }, FIRST_LIGHT_MS + (light - 1) * view.lightMs);
    }
    later(() => signal(round), FIRST_LIGHT_MS + 4 * view.lightMs + (view.delaysMs[round] ?? 1000));
  };

  // All five go out in the same frame; the time runs from when that frame is painted.
  const signal = (round: number) => {
    setLights(0);
    setPhase("go");
    vibrate(40);
    goAt.current = null;
    signalAt.current = 0;
    requestAnimationFrame((first) => {
      signalAt.current = first;
      requestAnimationFrame((painted) => (goAt.current = painted));
    });
    later(() => record(round, { reactionMs: null, falseStart: false }), view.maxReactionMs);
  };

  const record = (round: number, start: LargadaStart) => {
    clearTimers();
    const hits = results.current.flatMap((one) => (one.reactionMs === null ? [] : [one.reactionMs]));
    results.current = [...results.current, start];
    setMine(results.current);
    onProgress({ rounds: results.current });
    // After the tap, so the sound never tells when the lights went out.
    playSound(start.falseStart ? "error" : start.reactionMs === null ? "timeUp" : "launch");
    if (start.falseStart) showToast({ tone: "danger", icon: <X className="size-3.5" strokeWidth={3} />, text: "Te adelantaste · largada perdida" });
    else if (start.reactionMs === null) showToast({ tone: "danger", icon: <Hourglass className="size-3.5" strokeWidth={3} />, text: "Muy lento · largada perdida" });
    else if (hits.length > 0 && start.reactionMs < Math.min(...hits)) {
      showToast({ tone: "success", icon: <Zap className="size-3.5 fill-current" strokeWidth={2.6} />, text: `${start.reactionMs} ms · ¡tu mejor largada!` });
    }
    setLights(0);
    race(round);
  };

  const race = (round: number) => {
    setPhase("race");
    setT(0);
    const now = startsFor(round);
    const leave = departures(now, view.maxReactionMs);
    const end = Math.min(raceEndMs(leave), RACE.arrivalMs);
    if (reduced) {
      setT(end + LEAVE_MS);
      arrive(round);
      return;
    }
    let startedAt: number | null = null;
    let arrived = false;
    const tick = (now: number) => {
      startedAt ??= now;
      const elapsed = now - startedAt;
      setT(elapsed);
      if (!arrived && elapsed >= end) {
        arrived = true;
        arrive(round);
      }
      if (elapsed < end + LEAVE_MS) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  const startsFor = (round: number) => field.map((racer) => (racer.me ? (results.current[round] ?? noStart) : (racer.starts[round] ?? noStart)));

  const arrive = (round: number) => {
    setPhase("arrival");
    const now = startsFor(round);
    const last = now.length - 1;
    const mineNow = now[last]!;
    if (mineNow.reactionMs !== null) playSound("place", placements(now, view.maxReactionMs)[last]!);
    const tied = mineNow.reactionMs !== null ? now.findIndex((one, i) => i < last && !one.falseStart && one.reactionMs === mineNow.reactionMs) : -1;
    if (tied !== -1) {
      const place = startSummary(now.map((one, i) => ({ ...one, name: racerAt(i), me: i === last })), view.maxReactionMs, article).place;
      showToast({ tone: "gold", icon: <Crown className="size-3.5 fill-current" strokeWidth={2.4} />, text: `Empate con ${inSentence(racerAt(tied))} · comparten el ${ordinal(place)}` });
    }
    later(() => next(round), NEXT_START_MS);
  };

  const racerAt = (i: number) => field[i]?.name ?? "";

  const next = (round: number) => {
    clearTimers();
    if (round + 1 >= total) {
      onFinish({ rounds: results.current });
      return;
    }
    setIndex(round + 1);
    setPhase("lights");
    setLights(0);
    setT(0);
    scheduleLights(round + 1);
  };

  // The music steps back while the lights go on, for the tension, and comes back with the race, after the tap.
  // It doesn't move at the signal, so it never tells when to go.
  const hushed = phase === "lights" || phase === "go";
  useEffect(() => {
    if (hushed) duckMusic(0.35);
    else restoreMusic();
  }, [hushed]);
  useEffect(() => () => restoreMusic(), []);

  const begin = useEffectEvent(() => scheduleLights(0));
  useEffect(() => {
    begin();
    return () => clearTimers();
  }, []);

  const onPress = (event: PointerEvent) => {
    if ((event.target as HTMLElement).closest("[data-no-tap]")) return;
    if (phase === "lights") {
      record(index, { reactionMs: null, falseStart: true });
    } else if (phase === "go") {
      // Tapped before the signal was even painted: that was anticipating (0 ms counts as impossible).
      const now = performance.now();
      record(index, { reactionMs: Math.round(now - (goAt.current ?? (signalAt.current || now))), falseStart: false });
    } else if (phase === "arrival") {
      next(index);
    }
  };

  /* ───────────── The scene ───────────── */

  const laneHeight = laneHeightFor(field.length, short);
  const carW = CAR.width * carScaleFor(laneHeight);
  const racing = phase === "race" || phase === "arrival";
  const places = summary?.places ?? [];
  const order = [...places.keys()].sort((a, b) => (places[a] ?? 0) - (places[b] ?? 0));

  const lanes: TrackLane[] = field.map((racer, i) => {
    const start = starts[i]!;
    const nose = racing ? noseAt(t, leftAt[i] ?? null) : RACE.startX;
    const tone: ChipTone = racer.me ? "brand" : "white";
    const helmet = { avatar: racer.avatar, colors: racer.colors };
    const ms = start.falseStart ? "se adelantó" : start.reactionMs === null ? "no largó" : `${start.reactionMs}`;
    let chips: ChipSpec[];
    if (!racing) {
      chips = [{ text: racer.name, tone, right: 22, dy: (laneHeight - 24) / 2, height: 24, fontSize: 12, helmet, crown: racer.crown }];
    } else if (phase === "race") {
      chips = [{ text: `${racer.name} · ${ms}`, tone: start.falseStart ? "danger" : tone, x: Math.max(6, nose - carW + 44), dy: 1, height: 21, fontSize: 11.5, crown: racer.crown }];
    } else {
      const place = places[i] ?? field.length;
      chips = [
        {
          text: `${racer.name} · ${start.reactionMs === null ? ms : `${ms} ms`}`,
          tone: racer.me ? "brand" : start.falseStart ? "danger" : place === 1 ? "gold" : "white",
          x: 10,
          dy: (laneHeight - 26) / 2,
          height: 26,
          fontSize: 12,
          place: ordinal(place, racer.article),
          helmet,
          crown: racer.crown,
          enterAfterMs: order.indexOf(i) * 60,
        },
      ];
    }
    return {
      key: racer.key,
      avatar: racer.avatar,
      colors: racer.colors,
      number: racer.number,
      me: racer.me,
      nose,
      // At the arrival, a car that never left fades so its chip reads.
      opacity: (racer.ghost ? 0.62 : 1) * (phase === "arrival" && leftAt[i] === null ? 0.35 : 1),
      speedLines: phase === "race" && leftAt[i] !== null && t > (leftAt[i] ?? 0),
      smoke: racer.me && (phase === "go" || (phase === "race" && leftAt[i] !== null && t < (leftAt[i] ?? 0) + 500)),
      chips,
    };
  });

  /* ───────────── The words ───────────── */

  const titleSize = short ? "text-[38px]" : "text-[46px]";
  let headline: ReactNode;
  let footer: string;
  if (phase === "lights") {
    headline = (
      <>
        <h1 className={cx("font-display leading-none font-extrabold tracking-[-.03em]", titleSize)}>Esperá…</h1>
        <p className="mt-2 text-[15px] font-semibold text-ink-700">Tocá cuando se apaguen las cinco</p>
      </>
    );
    footer = "Si tocás antes de que se apaguen, perdés la largada";
  } else if (phase === "go") {
    headline = <h1 className={cx("font-display leading-none font-extrabold tracking-[-.04em]", short ? "text-[76px]" : "text-[94px]")}>¡LARGÁ!</h1>;
    footer = "Toda la pantalla es el botón";
  } else if (phase === "race") {
    const chip = !myStart
      ? ""
      : myStart.falseStart
        ? "Te adelantaste"
        : myStart.reactionMs === null
          ? "No largaste a tiempo"
          : field.length === 1
            ? `Largada ${index + 1} de ${total}`
            : `de ${field.length} · ${summary?.ahead ? `${summary.ahead} salió antes` : "saliste primero"}`;
    headline = (
      <>
        <div className="flex h-[34px] items-center gap-1.5 rounded-full bg-white px-1.5 pr-3.5 text-[15px] font-extrabold shadow-sm">
          {myStart?.reactionMs != null && field.length > 1 && (
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand px-1.5 font-display text-[13px] text-white">{ordinal(summary?.place ?? 1, article)}</span>
          )}
          <span className={cx(myStart?.reactionMs == null && "pl-2")}>{chip}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          {myStart?.reactionMs != null ? (
            <>
              <span className={cx("font-display leading-none font-extrabold tracking-[-.05em] tabular-nums", short ? "text-[56px]" : "text-[72px]")}>{myStart.reactionMs}</span>
              <span className="font-display text-xl font-extrabold text-ink-500">ms</span>
            </>
          ) : (
            <span className={cx("font-display leading-none font-extrabold tracking-[-.03em]", short ? "text-[32px]" : "text-[40px]")}>Largada perdida</span>
          )}
        </div>
      </>
    );
    footer = "Los autos corren solos hasta la meta";
  } else {
    headline = (
      <>
        <h1 className={cx("font-display leading-none font-extrabold tracking-[-.03em]", titleSize)}>{summary?.title}</h1>
        <p className="mt-2 px-4 text-center text-[15px] leading-[1.35] font-semibold text-ink-700 text-balance">{summary?.detail}</p>
      </>
    );
    footer = index + 1 < total ? "La próxima arranca sola en 2 s · tocá para seguir" : "Tocá para ver tu resultado";
  }

  const onSignal = phase === "go";
  return (
    <Screen backdrop={onSignal ? "reflejos" : "sky"} style={phase === "lights" ? { backgroundImage: skyFor(lights) } : undefined} className="pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <div className="flex flex-1 touch-manipulation flex-col select-none" onPointerDown={onPress}>
        <div className="flex items-center justify-between px-5" data-no-tap>
          <div className="flex gap-2">
            <IconButton label="Salir" onClick={onExit} tone={onSignal ? "glass" : "white"}>
              <X className="size-[18px]" strokeWidth={2.6} />
            </IconButton>
            <SoundToggle tone={onSignal ? "glass" : "white"} />
          </div>
          <div className={cx("text-[13px] font-extrabold tracking-[.06em] uppercase", onSignal || phase === "lights" ? "text-ink" : "text-reflejos-dark")}>Largada</div>
          <span aria-hidden className="w-[84px]" />
        </div>

        <div className={cx("relative flex flex-col items-center justify-center text-center", short ? "h-[96px]" : "h-[124px]")} aria-live="assertive">
          {headline}
          <FloatingToast toast={toast} className="top-full mt-1" />
        </div>

        <Track lanes={lanes} laneHeight={laneHeight} lights={lights} glow={phase === "lights"} signal={onSignal} shade={phase === "lights" ? 0.1 * lights : 0} />

        <div className="flex justify-center gap-2 px-5 pt-4">
          {Array.from({ length: total }, (_, i) => {
            const done = mine[i];
            if (done && (i < index || phase === "arrival")) {
              const lost = done.reactionMs === null;
              return (
                <div key={i} className={cx("flex h-[34px] items-center rounded-full px-3.5 font-display text-[14px] font-extrabold text-white tabular-nums", lost ? "bg-danger" : "bg-brand")}>
                  {done.falseStart ? "Se adelantó" : lost ? "No largó" : field.length > 1 && i === index ? `${ordinal(summary?.place ?? 1, article)} · ${done.reactionMs} ms` : `${done.reactionMs} ms`}
                </div>
              );
            }
            const current = i === index || (phase === "arrival" && i === index + 1);
            return current ? (
              <div key={i} className="flex h-[34px] items-center rounded-full border-2 border-ink px-3.5 font-display text-[14px] font-extrabold">
                Largada {i + 1}
              </div>
            ) : (
              <div key={i} className={cx("h-[34px] w-[52px] rounded-full border-2 border-dashed", onSignal ? "border-ink/35" : "border-ink-300")} />
            );
          })}
        </div>
        {!short && <p className={cx("pt-3 text-center text-[13px] font-semibold", onSignal ? "text-ink" : "text-ink-700")}>{footer}</p>}
      </div>
    </Screen>
  );
}
