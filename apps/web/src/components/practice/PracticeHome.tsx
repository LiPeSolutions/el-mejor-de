"use client";

import { Clock, Play, Trophy } from "lucide-react";
import Link from "next/link";
import { PracticeBattleCard } from "@/components/battle/PracticeBattleCard";
import { Personaje } from "@/components/personaje/Personaje";
import { BottomNav } from "@/components/ui/BottomNav";
import { cx } from "@/components/ui/cx";
import { Screen } from "@/components/ui/Screen";
import { daySlots, pendingSlots } from "@/lib/day";
import { formatNumber } from "@/lib/format";
import { GAME_LIST, gameStyle, type GameTheme } from "@/lib/games";
import { useClientValue } from "@/lib/hooks";
import { loadDay, practiceCount, practiceRecords, type PracticeRecord } from "@/lib/storage";
import type { TodayInfo } from "@/lib/today-types";

export function recordLabel(game: GameTheme, record: PracticeRecord | undefined): string {
  if (!record) return "—";
  if (game.id === "reflexes" && record.best !== undefined) return `${record.best} ms`;
  if ((game.id === "sequence" || game.id === "water-sort") && record.best !== undefined) return `Nivel ${record.best}`;
  return formatNumber(record.score);
}

function PracticeTile({ game, record, wide = false }: { game: GameTheme; record: string | null; wide?: boolean }) {
  const onGold = game.colors.on !== "#FFFFFF";
  return (
    <Link
      href={`/practicar/${game.slug}`}
      className={cx(
        "relative flex min-h-[176px] flex-col overflow-hidden rounded-[24px] bg-(--game) px-3.5 pt-3.5 text-(--game-on) transition active:scale-[.98]",
        wide && "col-span-2 min-h-[150px]",
      )}
      style={{ ...gameStyle(game), boxShadow: `0 12px 26px ${game.shadow.replace(/[\d.]+\)$/, onGold ? ".35)" : ".3)")}` }}
    >
      <span
        aria-hidden
        className={cx("absolute inset-0", onGold ? "bg-[linear-gradient(160deg,rgba(255,255,255,.4),rgba(255,255,255,0)_55%)]" : "bg-tile-shine")}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="font-display text-[17px] leading-[1.1] font-extrabold">
            {game.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </div>
          <div className={cx("mt-1.5 text-[11px] font-bold", onGold ? "text-[#5A4300]" : "opacity-95")}>Récord</div>
          <div className="mt-0.5 min-h-6 font-display text-2xl leading-none font-extrabold">{record}</div>
        </div>
        <span className={cx("grid size-8 place-items-center rounded-full", onGold ? "bg-ink text-gold" : "bg-white text-(--game)")}>
          <Play className="size-3.5 fill-current" />
        </span>
      </div>
      <div className="relative mt-auto flex justify-end">
        <div className="relative -mr-1.5 h-[77px] w-16">
          <span
            aria-hidden
            className={cx("absolute top-[54%] left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full", onGold ? "bg-white/45" : "bg-white/38")}
          />
          <div className={cx("relative", onGold ? "drop-shadow-[0_8px_10px_rgba(0,0,0,.22)]" : "drop-shadow-[0_8px_10px_rgba(0,0,0,.26)]")}>
            <Personaje {...game.mascot} size={64} />
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Practicar (design 35): free play with personal records, plus a nudge if today's challenges are pending. */
export function PracticeHome({ today }: { today: TodayInfo }) {
  const state = useClientValue(
    () => ({ records: practiceRecords(), count: practiceCount(today.date), pending: pendingSlots(daySlots(today, loadDay(today.date))) }),
    today.date,
  );
  const next = state?.pending[0];

  return (
    <Screen clouds={["-right-[60px] top-[110px] w-[180px] opacity-95", "-left-[50px] bottom-[170px] w-[220px] opacity-95"]} nav>
      <header className="flex items-end justify-between px-5">
        <h1 className="font-display text-[28px] leading-none font-extrabold tracking-[-.02em]">Practicar</h1>
        {state && <div className="text-xs font-bold text-ink-500">Hoy: {state.count === 1 ? "1 partida" : `${state.count} partidas`}</div>}
      </header>

      <div className="mx-5 mt-3 flex items-center gap-2.5 rounded-row bg-white px-3.5 py-2.5 shadow-sm">
        <Clock className="size-[18px] shrink-0 text-brand" strokeWidth={2.4} />
        <p className="text-[13px] leading-[1.3] font-semibold text-ink-700">
          Jugá todo lo que quieras. Guarda tus récords, <b className="text-ink">no cuenta para la corona</b>.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-5 pt-4">
        {GAME_LIST.map((game, index) => (
          <PracticeTile
            key={game.id}
            game={game}
            record={state ? recordLabel(game, state.records[game.id]) : null}
            // With an odd number of games, the last one takes the whole row.
            wide={GAME_LIST.length % 2 === 1 && index === GAME_LIST.length - 1}
          />
        ))}
      </div>

      {state && next && (
        <div className="mx-5 mt-3.5 flex items-center gap-3 rounded-card bg-white px-4 py-3.5 shadow-md">
          <div className="grid size-11 shrink-0 place-items-center rounded-key bg-brand-100 text-brand">
            <Trophy className="size-[22px]" strokeWidth={2.2} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold">
              {state.pending.length === 1 ? `Te queda un reto de hoy: ${next.game.name}` : `Te quedan ${state.pending.length} retos de hoy`}
            </div>
            <div className="mt-0.5 text-xs font-semibold text-ink-500">
              {state.pending.length === 1 ? "Ese sí cuenta · un solo intento" : "Esos sí cuentan · un solo intento"}
            </div>
          </div>
          <Link
            href={`/jugar/${next.game.slug}`}
            className="flex h-9 shrink-0 items-center rounded-full bg-brand px-3.5 font-display text-[13px] font-extrabold text-white"
          >
            {state.pending.length === 1 ? "Jugarlo" : "Jugar"}
          </Link>
        </div>
      )}

      <PracticeBattleCard />
      <BottomNav />
    </Screen>
  );
}
