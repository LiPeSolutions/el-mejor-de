"use client";

import { ChevronRight, House, Lock, MapPin, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { Countdown, ShareDayButton } from "@/components/home/parts";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Chip";
import { Logo } from "@/components/ui/Logo";
import { Screen } from "@/components/ui/Screen";
import { useAccount } from "@/lib/account";
import type { PublicAccount } from "@/lib/account-types";
import { placesApi } from "@/lib/api";
import { dayTotal, daySlots } from "@/lib/day";
import { formatNumber } from "@/lib/format";
import { gameStyle } from "@/lib/games";
import { useClientValue } from "@/lib/hooks";
import { placePath } from "@/lib/paths";
import type { TodayStandingsResponse } from "@/lib/place-types";
import { loadDay } from "@/lib/storage";
import type { TodayInfo } from "@/lib/today-types";
import { playSoundLater, soundReady } from "@/lib/sound";
import { useRequest } from "@/lib/use-request";

const DAY_TUNE_KEY = "emd:sonido-dia";

/** The day's three challenges done: its tune, once a day. */
function DayDoneSound({ date }: { date: string }) {
  useEffect(() => {
    if (!soundReady()) return;
    try {
      if (window.localStorage.getItem(DAY_TUNE_KEY) === date) return;
      window.localStorage.setItem(DAY_TUNE_KEY, date);
    } catch {
      return;
    }
    playSoundLater(400, "dayDone");
  }, [date]);
  return null;
}

/** End of the day's run (designs 12 and 13). */
export function DaySummary({ today }: { today: TodayInfo }) {
  const account = useAccount();
  const slots = useClientValue(() => daySlots(today, loadDay(today.date)), `${today.date}:${account?.id ?? ""}`);
  if (!slots || account === undefined) return <Screen>{null}</Screen>;

  return (
    <Screen clouds={["-right-[60px] top-[110px] w-[170px] opacity-95", "-left-[50px] bottom-[120px] w-[220px] opacity-95"]}>
      <header className="px-5">
        <Logo />
      </header>
      {slots.every((slot) => slot.result) && <DayDoneSound date={today.date} />}

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

      {account ? (
        <DayStandings account={account} />
      ) : (
        <BlueCard label="Ranking" title="¿Sos el mejor de tu pueblo?">
          Creá tu cuenta para ver en qué puesto quedás hoy en tu barrio o tu pueblo, tu provincia y el país, y pelear la corona de la semana.
          <span className="mt-3 flex items-center gap-2 rounded-key bg-white/18 px-3 py-2.5 text-[13px] font-bold">
            <Lock className="size-4 shrink-0" strokeWidth={2.4} />
            Creá tu cuenta para entrar al ranking
          </span>
        </BlueCard>
      )}

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

function BlueCard({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <section className="relative mx-5 mt-3 overflow-hidden rounded-[24px] bg-hero-brand px-[18px] py-4 text-white shadow-hero">
      <span aria-hidden className="absolute inset-0 bg-hero-glow" />
      <div className="relative text-xs font-bold uppercase tracking-[.06em] text-white/85">{label}</div>
      <div className="relative mt-1 font-display text-[26px] leading-[1.05] font-extrabold tracking-[-.03em] [overflow-wrap:anywhere]">{title}</div>
      <div className="relative mt-1.5 flex flex-col text-[13px] font-semibold text-white/90">{children}</div>
    </section>
  );
}

function BlueCardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mt-3 flex h-11 items-center justify-center gap-2 rounded-full bg-white font-display text-[15px] font-extrabold text-brand transition active:scale-[.98]">
      {children}
    </Link>
  );
}

/** "Chivilcoy #6 · Buenos Aires #241 · Argentina #1.530" (design 13), or what's missing to get there. */
function DayStandings({ account }: { account: PublicAccount }) {
  const request = useRequest(account.placeId ? `resumen:${account.id}:${account.placeId}` : null, () => placesApi.today());
  const back = "/hoy/resumen";
  if (!account.placeId) {
    return (
      <BlueCard label="Tu lugar" title="¿De dónde sos?">
        Elegí tu barrio o tu pueblo y mirá en qué puesto quedás hoy ahí, en tu provincia y en el país.
        <BlueCardLink href={placePath({ back })}>
          <MapPin className="size-[18px]" strokeWidth={2.6} />
          Elegir mi lugar
        </BlueCardLink>
      </BlueCard>
    );
  }
  const data = request.data;
  if (data?.status === "unverified" || (!data && !account.placeVerified)) {
    return (
      <BlueCard label="Tu lugar" title={`Entrá al ranking de ${data?.place?.name ?? account.placeName ?? "tu lugar"}`}>
        Verificá con el GPS que estás ahí y entra todo lo que jugaste esta semana.
        <BlueCardLink href={placePath({ verify: true, back })}>
          <ShieldCheck className="size-[18px]" strokeWidth={2.6} />
          Verificar ubicación
        </BlueCardLink>
      </BlueCard>
    );
  }
  if (!data || data.status !== "ok") {
    return (
      <div aria-label="Cargando tus puestos" className="mx-5 mt-3 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[66px] animate-pulse rounded-row bg-white/60" />
        ))}
      </div>
    );
  }
  return <Standings data={data} account={account} />;
}

function Standings({ data, account }: { data: TodayStandingsResponse; account: PublicAccount }) {
  const [local] = data.levels;
  const first = account.article === "la" ? "primera" : "primero";
  let line: string;
  if (!local || local.position === null) line = "Todavía no hay puntos tuyos de hoy en el ranking.";
  else if (local.position === 1) line = local.players === 1 ? `Por ahora sos ${account.article === "la" ? "la única" : "el único"} de ${local.name} que jugó hoy.` : `Vas ${first} en ${local.name}.`;
  else if (data.above && local.score !== null && data.above.score > local.score) line = `A ${formatNumber(data.above.score - local.score)} puntos de ${data.above.username} en ${local.name}.`;
  else line = `Vas #${formatNumber(local.position)} de ${formatNumber(local.players)} en ${local.name}.`;
  return (
    <section className="mx-5 mt-3" aria-label="Tus puestos de hoy">
      <ul className="grid grid-cols-3 gap-2">
        {data.levels.map((level) => (
          <li key={level.level} className="min-w-0 rounded-row bg-white px-3 py-2.5 shadow-sm">
            <div className="truncate text-[11px] font-bold text-ink-500">{level.name}</div>
            <div className="mt-0.5 font-display text-[22px] leading-none font-extrabold tabular-nums">{level.position ? `#${formatNumber(level.position)}` : "—"}</div>
            <div className="mt-1 truncate text-[11px] font-semibold text-ink-500">de {formatNumber(level.players)}</div>
          </li>
        ))}
      </ul>
      <Link href="/ranking" className="mt-2 flex items-center justify-between gap-2 rounded-row bg-white px-3.5 py-2.5 text-[13px] font-bold shadow-sm">
        <span className="min-w-0">{line}</span>
        <span className="flex shrink-0 items-center gap-0.5 font-extrabold text-brand">
          Ver el ranking
          <ChevronRight className="size-3.5" strokeWidth={2.8} />
        </span>
      </Link>
    </section>
  );
}
