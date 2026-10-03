"use client";

import { Clock, Gamepad2, Lock, LogIn, Play, Trophy, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Personaje, type Face } from "@/components/personaje/Personaje";
import { avatarLook } from "@/components/personaje/avatar";
import { BottomNav } from "@/components/ui/BottomNav";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Logo } from "@/components/ui/Logo";
import { Screen } from "@/components/ui/Screen";
import { useAccount } from "@/lib/account";
import type { PublicAccount } from "@/lib/account-types";
import { daySlots, pendingSlots, type DaySlot } from "@/lib/day";
import { useClientValue } from "@/lib/hooks";
import { currentStreak, hasAnyHistory, loadDay, weekSummary } from "@/lib/storage";
import type { TodayInfo } from "@/lib/today-types";
import { Countdown, CountdownCard, Hero, ShareDayButton, StreakCard, StreakPill, TodayTiles, WeekCard } from "./parts";

interface HomeState {
  slots: DaySlot[];
  firstVisit: boolean;
  streak: number;
  week: { score: number; daysPlayed: number };
}

/** Inicio: first visit, today's challenges still to play, or the day already done. */
export function HomeScreen({ today }: { today: TodayInfo }) {
  const account = useAccount();
  const state = useClientValue<HomeState>(
    () => ({
      slots: daySlots(today, loadDay(today.date)),
      firstVisit: !hasAnyHistory(),
      streak: currentStreak(today.date),
      week: weekSummary(today.date),
    }),
    `${today.date}:${account?.id ?? ""}`,
  );

  // What this browser played lives in localStorage: render once it's read.
  if (!state || account === undefined) return <Screen>{null}</Screen>;
  const pending = pendingSlots(state.slots);
  if (state.firstVisit && !account) return <FirstVisit next={pending[0] ?? state.slots[0]!} />;
  if (pending.length > 0) return <TodayPending today={today} state={state} pending={pending} account={account} />;
  return <TodayDone today={today} state={state} account={account} />;
}

/** The player's own character when signed in; the hornero otherwise. */
function HeroCharacter({ account, face }: { account: PublicAccount | null; face?: Face }) {
  const look = account ? avatarLook(account.avatar) : { sp: "hornero" as const, acc: ["anteojos" as const] };
  return <Personaje {...look} face={face} size={116} anim="bob" className="size-full" />;
}

const dayLabel = (today: TodayInfo) => (today.dayNumber > 0 ? `Día ${today.dayNumber} · ` : "");

function playHref(slot: DaySlot) {
  return `/jugar/${slot.game.slug}`;
}

/* ───────────── First visit (design 02) ───────────── */

const BENEFITS: Array<{ Icon: LucideIcon; tile: string; text: string }> = [
  { Icon: Clock, tile: "bg-letras text-white", text: "3 retos · 5 minutos en total" },
  { Icon: Lock, tile: "bg-preguntas text-white", text: "Un solo intento por reto" },
  { Icon: Trophy, tile: "bg-gold text-ink", text: "Ranking de tu lugar y corona semanal" },
];

function FirstVisit({ next }: { next: DaySlot }) {
  return (
    <Screen
      clouds={["-right-[50px] top-[150px] w-[160px] opacity-95", "left-[30px] top-[270px] w-[330px] opacity-95", "-right-[60px] bottom-[30px] w-[230px] opacity-95"]}
    >
      <div className="flex items-center justify-between px-5">
        <Logo />
        <Link
          href="/cuenta/entrar"
          className="flex h-[38px] items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-extrabold shadow-[0_6px_16px_rgba(35,38,58,.08)] active:scale-95"
        >
          <LogIn className="size-4 text-brand" strokeWidth={2.6} />
          Entrar
        </Link>
      </div>
      <div className="mt-[72px] flex h-[100px] items-end justify-center gap-2.5 short:mt-5 short:h-[80px]" aria-hidden>
        <Personaje sp="carpincho" size={64} acc={["boina"]} />
        <Personaje sp="hornero" size={64} acc={["anteojos"]} face="joy" />
        <Personaje sp="pelusa" size={64} face="wow" />
      </div>
      <div className="px-6 pt-9 text-center short:pt-5">
        <h1 className="font-display text-[34px] leading-[1.05] font-extrabold tracking-[-.03em] text-balance">¿Sos el mejor de tu pueblo?</h1>
        <p className="mt-3 text-[15px] leading-[1.45] font-medium text-pretty text-ink-700">
          Tres retos cortos por día, iguales para todos y con un solo intento. Competí con tu pueblo, tu provincia y el país.
        </p>
      </div>
      <ul className="mx-5 mt-[22px] flex flex-col gap-2">
        {BENEFITS.map(({ Icon, tile, text }) => (
          <li key={text} className="flex items-center gap-3 rounded-row bg-white px-3.5 py-2.5 shadow-sm">
            <span className={cx("grid size-8 place-items-center rounded-[10px]", tile)}>
              <Icon className="size-[18px]" strokeWidth={2.4} />
            </span>
            <span className="text-sm font-bold">{text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto px-5 pt-3.5 pb-4">
        <Button href={playHref(next)}>
          <Play className="size-5 fill-current" />
          Jugar
        </Button>
        <p className="mt-2 text-center text-xs font-semibold text-ink-700">Sin registrarte · sin descargar nada</p>
      </div>
    </Screen>
  );
}

/* ───────────── Challenges still to play (design 2a, without rankings yet) ───────────── */

const HOME_CLOUDS = [
  "-left-[54px] top-[150px] w-[150px] opacity-95",
  "-right-[70px] top-[470px] w-[200px] opacity-95",
  "-left-[30px] bottom-[120px] w-[220px] opacity-95",
];

function Names({ slots }: { slots: readonly DaySlot[] }) {
  return slots.map((slot, i) => (
    <span key={slot.slot}>
      {i > 0 && (i === slots.length - 1 ? " y " : ", ")}
      <b>{slot.game.name}</b>
    </span>
  ));
}

function TodayPending({ today, state, pending, account }: { today: TodayInfo; state: HomeState; pending: DaySlot[]; account: PublicAccount | null }) {
  const next = pending[0]!;
  const played = state.slots.length - pending.length;
  let bubble: ReactNode;
  if (played === 0) {
    bubble = (
      <>
        Hoy arrancás con <b>{next.game.name}</b>. {state.streak > 0 ? "¡Seguí la racha!" : "Son 3 retos cortos."}
      </>
    );
  } else {
    bubble = (
      <>
        {pending.length === 1 ? "Te falta" : "Te faltan"} <Names slots={pending} /> para cerrar el día.
      </>
    );
  }

  return (
    <Screen clouds={HOME_CLOUDS} nav>
      <header className="flex items-center justify-between px-5">
        <Logo />
        <StreakPill streak={state.streak} />
      </header>
      <Hero
        title={account ? `¡Buenas, ${account.username}!` : "¡Buenas!"}
        subtitle={played === 0 ? `${dayLabel(today)}tenés 3 retos nuevos` : `${dayLabel(today)}jugaste ${played} de 3 retos`}
        character={<HeroCharacter account={account} />}
      >
        {bubble}
      </Hero>
      <TodayTiles slots={state.slots} />
      <div className="grid grid-cols-2 gap-2.5 px-5 pt-3.5 short:order-last">
        <StreakCard streak={state.streak} playedToday={played > 0} />
        <WeekCard weekNumber={today.weekNumber} score={state.week.score} daysPlayed={state.week.daysPlayed} />
      </div>
      <div className="mt-auto px-5 pt-3.5">
        <Button href={playHref(next)}>
          <Play className="size-5 fill-current" />
          {next.unfinished ? `Ver cómo te fue en ${next.game.name}` : `Jugar ${next.game.name}`}
        </Button>
        <p className="mt-2 text-center text-xs font-semibold text-ink-700">
          Nuevos retos en <Countdown target={today.nextResetAt} />
        </p>
      </div>
      <BottomNav />
    </Screen>
  );
}

/* ───────────── Day done (design 26) ───────────── */

function TodayDone({ today, state, account }: { today: TodayInfo; state: HomeState; account: PublicAccount | null }) {
  return (
    <Screen clouds={HOME_CLOUDS} nav>
      <header className="flex items-center justify-between px-5">
        <Logo />
        <StreakPill streak={state.streak} />
      </header>
      <Hero
        title={account ? `Hoy ya está, ${account.username}` : "Hoy ya está"}
        subtitle={`${dayLabel(today)}jugaste los 3 retos`}
        character={<HeroCharacter account={account} face="sleep" />}
      >
        Volvé mañana y seguí la racha. Mientras, podés practicar.
      </Hero>
      <TodayTiles slots={state.slots} compact />
      <div className="grid grid-cols-2 gap-2.5 px-5 pt-3.5 short:order-last">
        <StreakCard streak={state.streak} playedToday />
        <WeekCard weekNumber={today.weekNumber} score={state.week.score} daysPlayed={state.week.daysPlayed} />
      </div>
      <CountdownCard target={today.nextResetAt} />
      <div className="mt-auto grid grid-cols-2 gap-2.5 px-5 pt-3">
        <ShareDayButton dayNumber={today.dayNumber} slots={state.slots} />
        <Button variant="secondary" size="md" href="/practicar">
          <Gamepad2 className="size-[18px]" strokeWidth={2.6} />
          Practicar
        </Button>
      </div>
      <BottomNav />
    </Screen>
  );
}
