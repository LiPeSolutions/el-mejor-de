"use client";

import { CircleCheck, Crown, MapPin } from "lucide-react";
import Link from "next/link";
import type { PublicAccount } from "@/lib/account-types";
import { formatNumber } from "@/lib/format";
import { placePath } from "@/lib/paths";
import { gapText } from "@/lib/place-copy";
import type { RankingResponse } from "@/lib/place-types";
import { StatCard } from "./parts";

const PILL = "flex h-[38px] min-w-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-extrabold shadow-[0_6px_16px_rgba(35,38,58,.08)] transition active:scale-95";

/** Top left of the home (designs 2a and 26): where you compete, or an invitation to choose it. */
export function PlacePill({ account }: { account: PublicAccount }) {
  if (!account.placeId || !account.placeName) {
    return (
      <Link href={placePath({ back: "/" })} className={PILL}>
        <MapPin className="size-4 shrink-0 text-brand" strokeWidth={2.6} />
        Elegí tu lugar
      </Link>
    );
  }
  return (
    <Link href={account.placeVerified ? "/ranking" : placePath({ verify: true, back: "/" })} className={PILL}>
      <MapPin className="size-4 shrink-0 text-brand" strokeWidth={2.6} />
      <span className="truncate">{account.placeName}</span>
      {account.placeVerified ? (
        <CircleCheck aria-label="verificado" className="size-4 shrink-0 text-success" strokeWidth={2.6} />
      ) : (
        <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-extrabold text-brand">Verificar</span>
      )}
    </Link>
  );
}

const daysText = (days: number) => (days === 1 ? "1 día jugado" : `${days} días jugados`);

/** "Hoy en Chivilcoy #6 de 312" and "Semana 40 #9", instead of the streak and the week (designs 2a and 26). */
export function PlaceStats({ ranking, account }: { ranking: RankingResponse; account: PublicAccount }) {
  const { place, periods, week } = ranking;
  if (!place || !periods) return null;
  const today = periods.today.rows.find((row) => row.isMe);
  const mine = periods.week.rows.find((row) => row.isMe);
  const crowned = week.hasCrown && mine?.holder;
  const mustVerify = week.hasCrown && !ranking.me.verifiedThisWeek;

  let weekNote: string;
  if (!mine) weekNote = "Todavía no jugaste esta semana";
  else if (crowned) weekNote = `Tenés la corona · ${daysText(mine.daysPlayed)}`;
  else if (mustVerify) weekNote = "Verificá tu ubicación para pelear la corona";
  else weekNote = `${gapText(periods.week.rows, mine, account.article)} · ${daysText(mine.daysPlayed)}`;

  return (
    <>
      <Link href="/ranking" className="block rounded-tile transition active:scale-[.98]">
        <StatCard
          className="h-full"
          label={<span className="min-w-0 truncate">Hoy en {place.name}</span>}
          value={
            today ? (
              <>
                #{formatNumber(today.position)} <span className="text-sm font-bold text-ink-500">de {formatNumber(periods.today.players)}</span>
              </>
            ) : (
              "—"
            )
          }
          note={today ? gapText(periods.today.rows, today, account.article) : "Jugá y entrá al ranking"}
        />
      </Link>
      <Link href={mustVerify && mine ? placePath({ verify: true, back: "/" }) : "/ranking"} className="block rounded-tile transition active:scale-[.98]">
        <StatCard
          gold
          className="h-full"
          label={
            <>
              <Crown className="size-3.5" strokeWidth={2.6} />
              Semana {week.number}
            </>
          }
          value={
            mine ? (
              <span className="flex items-center gap-1">
                #{formatNumber(mine.position)}
                {crowned && <Crown aria-label="con corona" className="size-5 fill-current" strokeWidth={2} />}
              </span>
            ) : (
              "—"
            )
          }
          note={weekNote}
        />
      </Link>
    </>
  );
}
