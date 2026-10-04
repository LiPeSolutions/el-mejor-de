"use client";

import { Check, Clock, Hourglass } from "lucide-react";
import type { ReactNode } from "react";
import { GameHeader, ScoreRow } from "@/components/games/chrome";
import { Personaje } from "@/components/personaje/Personaje";
import { badgeLook } from "@/components/personaje/avatar";
import { cx } from "@/components/ui/cx";
import { Screen } from "@/components/ui/Screen";
import { formatClock, formatNumber } from "@/lib/format";
import { gameStyle, GAMES } from "@/lib/games";
import { clockText } from "@/lib/tubitos";
import { AnsweredStrip, type BattleFace } from "./parts";

/*
 * Tubitos a la par: the same three boards for everyone, one after the
 * other, with the daily challenge's points. Everyone sees who already
 * solved the board; how each one did, once it closes.
 */

const ROW_SHADOW = "shadow-[0_6px_16px_rgba(35,38,58,.06)]";

/** The board being played: who solved it, my moves and the time left, around the board itself (`children`). */
export function BattleTubitosBoard({
  index,
  total,
  leftMs,
  faces,
  solved,
  moves,
  par,
  line,
  actions,
  hint,
  children,
  onExit,
}: {
  index: number;
  total: number;
  leftMs: number;
  faces: readonly BattleFace[];
  solved: ReadonlySet<string>;
  moves: number;
  par: number;
  /** The line over the board: what to do, a warning or how it went. */
  line: ReactNode;
  actions: ReactNode;
  hint?: string;
  children: ReactNode;
  onExit: () => void;
}) {
  const game = GAMES["water-sort"];
  const urgent = leftMs <= 10_000;
  return (
    <Screen clouds={["-left-[60px] bottom-[50px] w-[220px] opacity-70"]} style={gameStyle(game)}>
      <GameHeader
        title={`Tablero ${index + 1} de ${total}`}
        onClose={onExit}
        right={
          <div
            className={cx("flex h-[38px] items-center gap-1.5 rounded-full bg-white px-3.5 font-display text-base font-extrabold tabular-nums shadow-[0_6px_16px_rgba(35,38,58,.08)]", urgent && "text-danger")}
            aria-label={`Quedan ${Math.max(0, Math.ceil(leftMs / 1000))} segundos`}
          >
            <Clock className="size-4" strokeWidth={2.6} />
            {formatClock(leftMs)}
          </div>
        }
      />
      <AnsweredStrip faces={faces} answered={solved} verb="Lo resolvieron" />
      <ScoreRow scoreLabel="Movimientos" score={moves} label="Mínimo" value={par} className="pt-3" />
      <div aria-live="polite" className="mt-2 flex min-h-[34px] items-center justify-center px-5 text-center">
        {line}
      </div>
      {children}
      <div className="grid grid-cols-2 gap-2.5 px-5 pt-3.5">{actions}</div>
      {hint && <p className="px-5 pt-3 text-center text-[13px] font-semibold text-ink-700">{hint}</p>}
    </Screen>
  );
}

export interface TubitosTableRow {
  face: BattleFace;
  place: number;
  total: number;
  /** How this board went: null if not solved. */
  result: { moves: number; timeMs: number; points: number } | null;
}

function ResultChip({ result }: { result: TubitosTableRow["result"] }) {
  if (!result) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-extrabold text-ink-500">
        <Hourglass className="size-3" strokeWidth={3} />
        No lo resolvió
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-[#DDF5F1] px-2 py-0.5 text-[11px] font-extrabold text-success tabular-nums">
      <Check className="size-3" strokeWidth={3.4} />+{result.points}
    </span>
  );
}

/** A board's table, once it closed: how each one did and the total so far, until the next board (or the podium). */
export function BattleTubitosTable({ index, total, par, rows, nextIn, onExit }: { index: number; total: number; par: number; rows: readonly TubitosTableRow[]; nextIn: number; onExit: () => void }) {
  const game = GAMES["water-sort"];
  const last = index + 1 >= total;
  return (
    <Screen clouds={["-left-[70px] bottom-[60px] w-[220px] opacity-70"]} style={gameStyle(game)}>
      <GameHeader title={`Tablero ${index + 1} de ${total}`} onClose={onExit} />
      <div className="mx-5 mt-4 rounded-[24px] bg-white px-5 py-4 text-center shadow-[0_10px_24px_rgba(35,38,58,.08)]">
        <p className="font-display text-[22px] leading-tight font-extrabold tracking-[-.01em]">¡Listo el tablero {index + 1}!</p>
        <p className="mt-1 text-sm font-semibold text-ink-700">Se resolvía en {par} movimientos, como mínimo</p>
      </div>
      <div className="flex items-baseline justify-between px-6 pt-4">
        <span className="text-[11px] font-bold tracking-[.06em] text-ink-500 uppercase">La tabla</span>
        <span className="text-xs font-bold text-ink-500">
          Después de {index + 1} de {total}
        </span>
      </div>
      <ol className="flex flex-col gap-2 px-4 pt-2">
        {rows.map((row) => (
          <li key={row.face.key} className={cx("flex min-h-[50px] items-center gap-2.5 rounded-row py-1.5 pr-3 pl-3", ROW_SHADOW, row.face.isMe ? "bg-brand text-white" : "bg-white")}>
            <span className={cx("w-6 shrink-0 font-display text-sm font-extrabold tabular-nums", row.face.isMe ? "text-gold" : "text-ink-500")}>{row.place}</span>
            <span className="shrink-0">
              <Personaje {...badgeLook(row.face.avatar)} size={32} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-extrabold">{row.face.isMe ? "Vos" : row.face.name}</span>
              {row.result && (
                <span className={cx("block truncate text-[11px] leading-tight font-bold tabular-nums", row.face.isMe ? "text-white/80" : "text-ink-500")}>
                  {row.result.moves} mov · {clockText(row.result.timeMs)}
                </span>
              )}
            </span>
            <span className={cx(row.face.isMe && "rounded-full bg-white/95")}>
              <ResultChip result={row.result} />
            </span>
            <span className="w-12 shrink-0 text-right font-display text-[15px] font-extrabold tabular-nums">{formatNumber(row.total)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-auto px-5 pt-4 text-center text-sm font-extrabold text-ink-700">{last ? `El podio en ${nextIn}…` : `El próximo tablero en ${nextIn}…`}</p>
    </Screen>
  );
}
