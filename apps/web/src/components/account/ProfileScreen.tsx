"use client";

import { ChevronRight, Crown, LogOut, MapPin, Pencil } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Personaje } from "@/components/personaje/Personaje";
import { avatarLook } from "@/components/personaje/avatar";
import { recordLabel } from "@/components/practice/PracticeHome";
import { BottomNav } from "@/components/ui/BottomNav";
import { Button } from "@/components/ui/Button";
import { Chip, Label } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { useAccount } from "@/lib/account";
import { accountErrorText } from "@/lib/account-copy";
import type { PublicAccount } from "@/lib/account-types";
import { groupsApi } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { GAME_LIST, gameStyle } from "@/lib/games";
import { useClientValue } from "@/lib/hooks";
import { placePath } from "@/lib/paths";
import { signOut } from "@/lib/session";
import { currentStreak, playedDaysSummary, practiceRecords, weekSummary, type PracticeRecord } from "@/lib/storage";
import type { TodayInfo } from "@/lib/today-types";
import { useRequest } from "@/lib/use-request";
import type { CrownView } from "@/lib/group-types";
import type { GameId } from "@repo/games";

const CLOUDS = ["-right-[60px] top-[110px] w-[180px] opacity-95", "-left-[50px] bottom-[170px] w-[220px] opacity-95"];

interface Stats {
  streak: number;
  week: number;
  daysPlayed: number;
  bestDay: number;
  records: Partial<Record<GameId, PracticeRecord>>;
}

/** Perfil (design 27), with what exists before rankings: streak, days, best day and records. */
export function ProfileScreen({ today }: { today: TodayInfo }) {
  const account = useAccount();
  const stats = useClientValue<Stats>(
    () => ({ streak: currentStreak(today.date), week: weekSummary(today.date).score, ...playedDaysSummary(), records: practiceRecords() }),
    `${today.date}:${account?.id ?? ""}`,
  );
  if (account === undefined || !stats) return <Screen nav>{null}</Screen>;
  return account ? <SignedIn account={account} stats={stats} /> : <SignedOut />;
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="rounded-row bg-white px-2 py-2.5 text-center shadow-sm">
      <div className="font-display text-xl leading-none font-extrabold tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] font-semibold text-ink-500">{label}</div>
    </div>
  );
}

/** The crown's name on its card: "Los del laburo", "Caballito", "Ciudad de Buenos Aires". */
const cardTitle = (crown: CrownView) => (crown.kind === "group" ? crown.title : crown.title.replace(/^la\s+/, ""));

/** Palmarés: one gold card per crown, newest first. A tap shows the celebration again. */
function Palmares({ crowns, crown }: { crowns: CrownView[] | undefined; crown: string }) {
  if (crowns && crowns.length > 0) {
    return (
      <ul className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
        {crowns.map((one) => (
          <li key={one.id} className="w-[118px] shrink-0">
            <Link href={`/corona?id=${one.id}`} className="block h-full rounded-[18px] bg-gold px-3 py-2.5 shadow-btn-gold transition active:scale-[.98]">
              <div className="flex items-center gap-1 text-[10px] font-extrabold tracking-[.04em] uppercase">
                {one.kind === "group" ? (
                  <Crown className="size-3 shrink-0 fill-current" strokeWidth={2.2} />
                ) : (
                  <MapPin className="size-3 shrink-0" strokeWidth={2.6} />
                )}
                <span className="truncate">{cardTitle(one)}</span>
              </div>
              <div className="mt-1 font-display text-lg leading-[1.05] font-extrabold">Semana {one.weekNumber}</div>
              <div className="mt-0.5 text-[11px] font-bold text-gold-ink tabular-nums">{formatNumber(one.score)} pts</div>
            </Link>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="mt-2 flex items-center gap-3 rounded-card bg-gold-soft px-4 py-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-key bg-gold">
        <Crown className="size-5 fill-current" strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] leading-[1.4] font-semibold text-gold-ink">
          Todavía no tenés coronas. Cada lunes, quien más sumó en tu barrio o tu pueblo, tu provincia, el país y cada grupo pasa a ser {crown} de ahí.
        </p>
        <Link href="/ranking" className="mt-1 inline-flex items-center gap-0.5 text-[13px] font-extrabold text-brand">
          Ver el ranking
          <ChevronRight className="size-3.5" strokeWidth={2.8} />
        </Link>
      </div>
    </div>
  );
}

function SignedIn({ account, stats }: { account: PublicAccount; stats: Stats }) {
  const crowns = useRequest(`coronas:${account.id}`, () => groupsApi.crowns());
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const crown = account.article === "la" ? "La Mejor" : "El Mejor";

  const leave = () => {
    setLeaving(true);
    setError(null);
    signOut().catch((cause: unknown) => {
      setError(accountErrorText(cause));
      setLeaving(false);
    });
  };

  return (
    <Screen clouds={CLOUDS} nav>
      <header className="px-5">
        <h1 className="font-display text-[28px] leading-none font-extrabold tracking-[-.02em]">Perfil</h1>
      </header>

      <div className="flex flex-col items-center px-5 pt-4 text-center">
        <div className="relative grid size-[118px] place-items-end justify-center rounded-full bg-white shadow-md">
          <div className="-mb-1">
            <Personaje {...avatarLook(account.avatar)} size={96} title={`El personaje de ${account.username}`} />
          </div>
        </div>
        <div className="mt-3 font-display text-[28px] leading-none font-extrabold tracking-[-.02em] [overflow-wrap:anywhere]">{account.username}</div>
        <Chip className="mt-2.5">
          <Crown className="size-3.5 text-gold-dark" strokeWidth={2.6} />
          {crown} de…
        </Chip>
        <Link href="/cuenta/personaje?editar=1&volver=/perfil" className="mt-2.5 flex items-center gap-1.5 text-[13px] font-extrabold text-brand">
          <Pencil className="size-3.5" strokeWidth={2.6} />
          Editar personaje
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-2 px-5 pt-4">
        <Stat value={stats.streak} label="Racha" />
        <Stat value={stats.daysPlayed} label="Días" />
        <Stat value={formatNumber(stats.bestDay)} label="Mejor día" />
        <Stat value={formatNumber(stats.week)} label="Semana" />
      </div>

      <section className="px-5 pt-5">
        <Label>
          Palmarés
          {crowns.data && crowns.data.crowns.length > 0 && ` · ${crowns.data.crowns.length} ${crowns.data.crowns.length === 1 ? "corona" : "coronas"}`}
        </Label>
        <Palmares crowns={crowns.data?.crowns} crown={crown} />
      </section>

      <section className="px-5 pt-5">
        <Label>Récords de práctica</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {GAME_LIST.map((game) => (
            <div key={game.id} className="rounded-row bg-white px-3.5 py-2.5 shadow-sm" style={gameStyle(game)}>
              <div className="flex items-center gap-2">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-(--game)" />
                <span className="min-w-0 text-[13px] leading-tight font-bold">{game.name}</span>
              </div>
              <div className="mt-1 font-display text-lg leading-none font-extrabold tabular-nums">{recordLabel(game, stats.records[game.id])}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pt-5">
        <Label>Tu cuenta</Label>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-row bg-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <div className="text-sm font-bold">Tu lugar</div>
            <div className="truncate text-xs font-semibold text-ink-500">
              {account.placeName ? `${account.placeName} · ${account.placeVerified ? "verificado" : "sin verificar"}` : "Todavía no lo elegiste"}
            </div>
          </div>
          <Link
            href={account.placeName && !account.placeVerified ? placePath({ verify: true, back: "/perfil" }) : placePath({ back: "/perfil" })}
            className="shrink-0 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-extrabold text-brand transition active:scale-95"
          >
            {!account.placeName ? "Elegir" : account.placeVerified ? "Cambiar" : "Verificar"}
          </Link>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 rounded-row bg-white px-4 py-3 shadow-sm">
          <div>
            <div className="text-sm font-bold">Vincular con Google</div>
            <div className="text-xs font-semibold text-ink-500">Para entrar aunque te olvides la contraseña</div>
          </div>
          <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-extrabold text-brand">Muy pronto</span>
        </div>
        {error && (
          <p role="alert" className="mt-2 rounded-row bg-white px-4 py-3 text-center text-sm font-bold text-danger shadow-sm">
            {error}
          </p>
        )}
        <div className="mt-2.5">
          <Button variant="secondary" size="md" onClick={leave} disabled={leaving}>
            <LogOut className="size-[18px]" strokeWidth={2.6} />
            {leaving ? "Saliendo…" : "Salir de la cuenta"}
          </Button>
        </div>
      </section>
      <BottomNav />
    </Screen>
  );
}

function SignedOut() {
  return (
    <Screen clouds={CLOUDS} nav>
      <header className="px-5">
        <h1 className="font-display text-[28px] leading-none font-extrabold tracking-[-.02em]">Perfil</h1>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="relative">
          <div aria-hidden className="absolute top-[54%] left-1/2 size-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
          <div className="relative">
            <Personaje sp="hornero" size={120} acc={["anteojos"]} face="joy" anim="float" />
          </div>
        </div>
        <h2 className="mt-6 font-display text-[26px] leading-[1.1] font-extrabold tracking-[-.02em]">Tu personaje te espera</h2>
        <p className="mt-2 text-[15px] leading-[1.45] font-semibold text-pretty text-ink-700">
          Creá tu cuenta para entrar al ranking de tu pueblo, elegir tu personaje y no perder tu racha.
        </p>
        <div className="mt-6 flex w-full flex-col gap-2.5">
          <Button href="/cuenta/crear?volver=/perfil">Crear mi cuenta</Button>
          <Button variant="secondary" size="md" href="/cuenta/entrar?volver=/perfil">
            Ya tengo cuenta
          </Button>
        </div>
      </div>
      <BottomNav />
    </Screen>
  );
}
