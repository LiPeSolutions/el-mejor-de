"use client";

import { CircleCheck, House, Lock, UserPlus } from "lucide-react";
import Link from "next/link";
import { Countdown, ShareDayButton } from "@/components/home/parts";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Chip";
import { Logo } from "@/components/ui/Logo";
import { Screen } from "@/components/ui/Screen";
import { useAccount } from "@/lib/account";
import { dayTotal, daySlots } from "@/lib/day";
import { formatNumber } from "@/lib/format";
import { gameStyle } from "@/lib/games";
import { useClientValue } from "@/lib/hooks";
import { loadDay } from "@/lib/storage";
import type { TodayInfo } from "@/lib/today-types";

/** End of the day's run (design 12 and 13, without rankings yet). */
export function DaySummary({ today }: { today: TodayInfo }) {
  const account = useAccount();
  const slots = useClientValue(() => daySlots(today, loadDay(today.date)), `${today.date}:${account?.id ?? ""}`);
  if (!slots || account === undefined) return <Screen>{null}</Screen>;

  return (
    <Screen clouds={["-right-[60px] top-[110px] w-[170px] opacity-95", "-left-[50px] bottom-[120px] w-[220px] opacity-95"]}>
      <header className="px-5">
        <Logo />
      </header>

      <div className="px-6 pt-[18px]">
        <Label className="text-[13px]">{today.dayNumber > 0 ? `Día ${today.dayNumber} · tu resumen` : "Tu resumen"}</Label>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="font-display text-[68px] leading-none font-extrabold tracking-[-.05em] tabular-nums">
            <AnimatedNumber value={dayTotal(slots)} />
          </div>
          <div className="font-display text-lg font-bold text-ink-500">/ 3.000</div>
        </div>
      </div>

      <ul className="mx-5 mt-3.5 rounded-card bg-white px-4 py-1.5 shadow-md">
        {slots.map(({ slot, game, result }) => (
          <li key={slot} className="flex h-[52px] items-center gap-3 border-b border-line last:border-b-0" style={gameStyle(game)}>
            <span className="grid size-[30px] place-items-center rounded-[9px] bg-(--game) text-(--game-on)">
              <game.Icon className="size-[15px]" strokeWidth={2.4} />
            </span>
            <span className="flex-1 text-sm font-bold">{game.name}</span>
            {result ? (
              <span className="font-display text-xl font-extrabold tabular-nums">{formatNumber(result.score)}</span>
            ) : (
              <Link href={`/jugar/${game.slug}`} className="rounded-full bg-brand-100 px-3 py-1.5 text-[13px] font-extrabold text-brand">
                Jugar
              </Link>
            )}
          </li>
        ))}
      </ul>

      <section className="relative mx-5 mt-3 overflow-hidden rounded-[24px] bg-hero-brand px-[18px] py-4 text-white shadow-hero">
        <span aria-hidden className="absolute inset-0 bg-hero-glow" />
        <div className="relative text-xs font-bold uppercase tracking-[.06em] text-white/85">Muy pronto</div>
        <div className="relative mt-1 font-display text-[28px] leading-none font-extrabold tracking-[-.03em]">El ranking de tu pueblo</div>
        <p className="relative mt-1.5 text-[13px] font-semibold text-white/90">
          Vas a ver en qué puesto quedás en tu pueblo, tu provincia y el país, y quién se lleva la corona de la semana.
        </p>
        <div className="relative mt-3 flex items-center gap-2 rounded-key bg-white/18 px-3 py-2.5 text-[13px] font-bold">
          {account ? <CircleCheck className="size-4 shrink-0" strokeWidth={2.4} /> : <Lock className="size-4 shrink-0" strokeWidth={2.4} />}
          {account ? `Jugás como ${account.username}: tus puntos quedan en tu cuenta` : "Creá tu cuenta para entrar al ranking"}
        </div>
      </section>

      {account ? (
        <div className="mt-auto flex flex-col gap-2.5 px-5 pt-3.5">
          <ShareDayButton dayNumber={today.dayNumber} slots={slots} size="lg" />
          <Button variant="secondary" size="md" href="/">
            <House className="size-[18px]" strokeWidth={2.6} />
            Ir al inicio
          </Button>
        </div>
      ) : (
        <div className="mt-auto grid grid-cols-2 gap-2.5 px-5 pt-3.5">
          <Button size="md" href="/cuenta/crear?volver=/hoy/resumen">
            <UserPlus className="size-[18px]" strokeWidth={2.6} />
            Crear cuenta
          </Button>
          <ShareDayButton dayNumber={today.dayNumber} slots={slots} variant="secondary" />
        </div>
      )}
      <p className="pt-2.5 text-center text-xs font-semibold text-ink-700">
        Nuevos retos en <Countdown target={today.nextResetAt} />
      </p>
    </Screen>
  );
}
