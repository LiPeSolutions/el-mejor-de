"use client";

import { Check, Clock, Copy, Crown, Flame, Share2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { FloatingToast, useToast } from "@/components/games/chrome";
import { Button } from "@/components/ui/Button";
import { Cloud } from "@/components/ui/Cloud";
import { cx } from "@/components/ui/cx";
import type { ChallengeResult } from "@/lib/challenge-types";
import { dayTotal, type DaySlot } from "@/lib/day";
import { formatCountdown, formatNumber } from "@/lib/format";
import { gameStyle, type GameTheme } from "@/lib/games";
import { useCountdown } from "@/lib/hooks";
import { dayShareText, shareOrCopy } from "@/lib/share";

export function StreakPill({ streak }: { streak: number }) {
  return (
    <div
      className="flex h-[38px] items-center gap-[5px] rounded-full bg-gold px-3.5 text-sm font-extrabold shadow-[0_6px_16px_rgba(255,197,61,.4)]"
      aria-label={`Racha de ${streak} ${streak === 1 ? "día" : "días"}`}
    >
      <Flame className="size-4 fill-letras text-ink" strokeWidth={2.2} />
      <span>{streak}</span>
    </div>
  );
}

interface TodayTileProps {
  game: GameTheme;
  result?: ChallengeResult | null;
  /** Started and left halfway: opening it counts what was played. */
  unfinished?: boolean;
  compact?: boolean;
}

/** Today's challenge tile on the home screen: colored when played, dashed while pending. */
export function TodayTile({ game, result, unfinished, compact }: TodayTileProps) {
  const { Icon } = game;
  if (result) {
    return (
      <div
        className="relative flex flex-col gap-2 overflow-hidden rounded-tile bg-(--game) p-3 text-(--game-on) shadow-(--game-tile-shadow)"
        style={gameStyle(game)}
      >
        <span aria-hidden className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,.28),rgba(255,255,255,0)_55%)]" />
        {!compact && (
          <span className="relative grid size-8 place-items-center rounded-[10px] bg-white/25">
            <Icon className="size-[18px]" strokeWidth={2.4} />
          </span>
        )}
        <span className="relative text-xs leading-[1.15] font-bold">{game.name}</span>
        <span className="relative flex items-center gap-1 font-display text-lg leading-none font-extrabold">
          {formatNumber(result.score)}
          <Check className="size-4" strokeWidth={3} />
        </span>
      </div>
    );
  }
  return (
    <Link
      href={`/jugar/${game.slug}`}
      className="flex flex-col gap-2 rounded-tile border-2 border-dashed border-(--game) bg-white p-2.5 active:scale-[.98]"
      style={gameStyle(game)}
    >
      <span className="grid size-8 place-items-center rounded-[10px] bg-(--game-light) text-(--game-dark)">
        <Icon className="size-[18px]" strokeWidth={2.4} />
      </span>
      <span className="text-xs leading-[1.15] font-bold">{game.name}</span>
      <span className="text-xs leading-[1.2] font-bold text-(--game-dark)">
        {unfinished ? "Sin terminar" : `Por jugar\u00A0· ${game.shortDuration}`}
      </span>
    </Link>
  );
}

export function StatCard({ label, value, note, gold }: { label: ReactNode; value: ReactNode; note: ReactNode; gold?: boolean }) {
  return (
    <div className={cx("rounded-tile px-3.5 py-3", gold ? "bg-gold shadow-[0_8px_20px_rgba(255,197,61,.3)]" : "bg-white shadow-[0_8px_20px_rgba(35,38,58,.06)]")}>
      <div className={cx("flex items-center gap-1 text-[11px] font-bold uppercase tracking-[.06em]", gold ? "text-ink" : "text-ink-500")}>{label}</div>
      <div className="mt-[5px] font-display text-2xl leading-none font-extrabold">{value}</div>
      <div className="mt-[5px] text-xs font-semibold">{note}</div>
    </div>
  );
}

export function WeekCard({ weekNumber, score, daysPlayed }: { weekNumber: number; score: number; daysPlayed: number }) {
  return (
    <StatCard
      gold
      label={
        <>
          <Crown className="size-3.5" strokeWidth={2.6} />
          Semana {weekNumber}
        </>
      }
      value={formatNumber(score)}
      note={daysPlayed === 1 ? "1 día jugado · cuentan tus 5 mejores" : `${daysPlayed} días jugados · cuentan tus 5 mejores`}
    />
  );
}

export function StreakCard({ streak, playedToday }: { streak: number; playedToday: boolean }) {
  let note = "Arrancala hoy";
  if (streak > 0) note = playedToday ? "Volvé mañana y seguila" : "Jugá hoy para no cortarla";
  return (
    <StatCard
      label={
        <>
          <Flame className="size-3.5" strokeWidth={2.6} />
          Tu racha
        </>
      }
      value={streak === 1 ? "1 día" : `${streak} días`}
      note={note}
    />
  );
}

export function Countdown({ target }: { target: string }) {
  const left = useCountdown(target);
  return <b className="text-ink tabular-nums">{left === null ? "--:--:--" : formatCountdown(left)}</b>;
}

export function CountdownCard({ target }: { target: string }) {
  const left = useCountdown(target);
  return (
    <div className="mx-5 mt-3.5 flex items-center gap-3 rounded-card bg-white px-4 py-3.5 shadow-md">
      <div className="grid size-11 place-items-center rounded-key bg-brand-100 text-brand">
        <Clock className="size-[22px]" strokeWidth={2.4} />
      </div>
      <div className="flex-1">
        <div className="text-xs font-bold text-ink-500">Nuevos retos en</div>
        <div className="mt-0.5 font-display text-[26px] leading-none font-extrabold tabular-nums">{left === null ? "--:--:--" : formatCountdown(left)}</div>
      </div>
      <div className="text-right text-xs leading-[1.3] font-semibold text-ink-500">
        a las 00:00
        <br />
        hora argentina
      </div>
    </div>
  );
}

/** Blue hero card with a character and a speech bubble. */
export function Hero({ title, subtitle, character, children }: { title: ReactNode; subtitle: ReactNode; character: ReactNode; children: ReactNode }) {
  return (
    <section className="relative mx-5 mt-3.5 overflow-hidden rounded-hero bg-hero-brand px-[18px] pt-[18px] text-white shadow-hero">
      <span aria-hidden className="absolute inset-0 bg-hero-glow" />
      <Cloud className="-top-3.5 -right-4 w-[110px] opacity-28" />
      <Cloud className="-bottom-[26px] -left-[22px] w-[190px] opacity-95" />
      <h1 className="relative font-display text-[28px] leading-[1.05] font-extrabold tracking-[-.02em] short:text-2xl">{title}</h1>
      <p className="relative mt-1 text-[13px] font-semibold text-white/82">{subtitle}</p>
      <div className="relative mt-1.5 flex items-end justify-between">
        <div className="ml-1 h-[139px] w-[116px] flex-none short:h-[101px] short:w-[84px]">{character}</div>
        <p className="mb-11 ml-3 flex-1 rounded-[18px_18px_18px_4px] bg-white px-3.5 py-3 text-sm leading-[1.35] font-semibold text-ink shadow-[0_8px_20px_rgba(35,38,58,.14)] short:mb-5 short:py-2.5">
          {children}
        </p>
      </div>
    </section>
  );
}

/** "Retos de hoy · 1.760 / 3.000" and the three tiles. */
export function TodayTiles({ slots, compact }: { slots: readonly DaySlot[]; compact?: boolean }) {
  return (
    <section className="px-5 pt-4" aria-labelledby="retos-de-hoy">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 id="retos-de-hoy" className="font-display text-[15px] font-extrabold">
          Retos de hoy
        </h2>
        <span className="text-[13px] font-bold text-ink-500">
          <b className="text-ink">{formatNumber(dayTotal(slots))}</b> / 3.000
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {slots.map(({ slot, game, result, unfinished }) => (
          <TodayTile key={slot} game={game} result={result} unfinished={unfinished} compact={compact} />
        ))}
      </div>
    </section>
  );
}

/** Shares the day's scores (share sheet, or copied to the clipboard). */
export function ShareDayButton({ dayNumber, slots, variant = "primary", size = "md" }: { dayNumber: number; slots: readonly DaySlot[]; variant?: "primary" | "secondary"; size?: "md" | "lg" }) {
  const [toast, showToast] = useToast(2200);
  const share = async () => {
    const results = slots.flatMap(({ result }) => (result ? [{ game: result.game, score: result.score }] : []));
    const outcome = await shareOrCopy(dayShareText(dayNumber, results));
    if (outcome === "copied") showToast({ tone: "success", icon: <Copy className="size-3.5" strokeWidth={3} />, text: "Copiado · pegalo donde quieras" });
    if (outcome === "failed") showToast({ tone: "danger", icon: <TriangleAlert className="size-3.5" strokeWidth={3} />, text: "No pudimos compartir" });
  };
  return (
    <div className="relative">
      <FloatingToast toast={toast} className="-top-11" />
      <Button variant={variant} size={size} onClick={() => void share()}>
        <Share2 className="size-[18px]" strokeWidth={2.6} />
        Compartir
      </Button>
    </div>
  );
}
