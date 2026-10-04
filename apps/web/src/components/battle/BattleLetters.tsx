"use client";

import { Clock, Timer } from "lucide-react";
import { GameHeader, ScoreRow, type ToastState } from "@/components/games/chrome";
import { LetterKeys, WordChip, type LetterKeysState, type SentWord } from "@/components/games/letters";
import { Personaje } from "@/components/personaje/Personaje";
import { avatarLook } from "@/components/personaje/avatar";
import { Label } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { Screen } from "@/components/ui/Screen";
import { formatClock, formatNumber } from "@/lib/format";
import { gameStyle, GAMES } from "@/lib/games";
import { ordinal } from "@/lib/largada";
import { LiveDot, type BattleFace } from "./parts";

/*
 * Diez Letras a la par: the same letters for everyone, in the same 90
 * seconds. Everyone sees how many points the others have, never which
 * words: those show on the podium.
 */

export interface LettersLiveRow {
  face: BattleFace;
  place: number;
  points: number;
}

interface Props {
  /** "loading": the letters are on their way; "time-up": the 90 seconds are over. */
  phase: "loading" | "playing" | "time-up";
  /** What the clock shows. */
  leftMs: number;
  /** Everyone, by points (mine as I find them). */
  rows: readonly LettersLiveRow[];
  me: { place: number; points: number; article: "el" | "la" };
  keys: LetterKeysState | null;
  letterCount: number;
  sent: readonly SentWord[];
  toast: ToastState | null;
  /** Seconds to the podium, once the time is up. */
  podiumIn: number | null;
  onSend: () => void;
  onExit: () => void;
}

function LiveScores({ rows }: { rows: readonly LettersLiveRow[] }) {
  return (
    <div className="mx-5 mt-3 rounded-row bg-white/70 px-3 pt-2.5 pb-2 shadow-sm">
      <div className="flex items-center justify-between text-[11px] font-bold tracking-[.06em] text-ink-500 uppercase">
        <span className="flex items-center gap-1.5">
          <LiveDot />
          En vivo
        </span>
        <span className="tracking-normal normal-case">Los puntos de cada uno</span>
      </div>
      <ol className={cx("mt-2 flex gap-1 overflow-x-auto", rows.length <= 6 && "justify-around")} aria-label="Puntos en vivo">
        {rows.map(({ face, place, points }) => (
          <li key={face.key} className="flex w-[54px] shrink-0 flex-col items-center gap-0.5">
            <span className={cx("relative grid size-[38px] place-items-center rounded-full bg-white shadow-sm", face.isMe && "ring-2 ring-brand")}>
              <Personaje {...avatarLook(face.avatar)} size={28} />
              {place === 1 && points > 0 && (
                <span className="absolute -top-1 -right-1.5 grid size-[18px] place-items-center rounded-full bg-gold font-display text-[10px] font-extrabold text-ink ring-2 ring-white">1</span>
              )}
            </span>
            <span className={cx("max-w-full truncate text-[10px] font-extrabold", face.isMe ? "text-brand" : "text-ink-700")}>{face.isMe ? "Vos" : face.name}</span>
            <span className="font-display text-[13px] leading-none font-extrabold tabular-nums">{formatNumber(points)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function BattleLetters({ phase, leftMs, rows, me, keys, letterCount, sent, toast, podiumIn, onSend, onExit }: Props) {
  const game = GAMES["seven-letters"];
  const urgent = phase === "playing" && leftMs <= 10_000;
  const valid = sent.filter((entry) => entry.status === "valid").length;
  return (
    <Screen clouds={["-right-[60px] bottom-10 w-[220px] opacity-70"]} style={gameStyle(game)}>
      <GameHeader
        title={game.name}
        onClose={onExit}
        right={
          <div
            className={cx(
              "flex h-[38px] items-center gap-1.5 rounded-full bg-white px-3.5 font-display text-base font-extrabold tabular-nums shadow-[0_6px_16px_rgba(35,38,58,.08)]",
              urgent && "text-danger",
            )}
            aria-label={`Quedan ${Math.max(0, Math.ceil(leftMs / 1000))} segundos`}
          >
            <Clock className="size-4" strokeWidth={2.6} />
            {formatClock(leftMs)}
          </div>
        }
      />
      <LiveScores rows={rows} />
      <ScoreRow className="pt-3" score={me.points} scoreLabel={`Vas ${ordinal(me.place, me.article)}`} label="Palabras" value={valid} />

      {phase === "time-up" ? (
        <div className="mx-5 mt-4 flex flex-col items-center rounded-card bg-white px-5 py-6 text-center shadow-md" role="status">
          <span className="grid size-14 place-items-center rounded-full bg-letras text-white shadow-[0_10px_20px_rgba(255,107,74,.35)]">
            <Timer className="size-7" strokeWidth={2.6} />
          </span>
          <p className="mt-3 font-display text-[30px] leading-none font-extrabold tracking-[-.02em]">¡Tiempo!</p>
          <p className="mt-2 text-sm font-bold text-ink-700">
            {valid === 0 ? "No encontraste palabras" : valid === 1 ? "Encontraste 1 palabra" : `Encontraste ${valid} palabras`}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink-500">{podiumIn !== null && podiumIn > 0 ? `El podio en ${podiumIn}…` : "Ya sale el podio…"}</p>
        </div>
      ) : keys ? (
        <LetterKeys keys={keys} toast={toast} onSend={onSend} />
      ) : (
        <div className="mx-5 mt-4 flex h-[72px] items-center justify-center rounded-tile bg-white font-display text-[30px] font-extrabold text-ink-300 shadow-md">…</div>
      )}

      <div className="px-5 pt-[18px]">
        <Label className="mb-2">Tus palabras</Label>
        <ul className="flex flex-wrap gap-1.5">
          {sent.map((entry) => (
            <WordChip key={entry.word} entry={entry} />
          ))}
        </ul>
      </div>

      <p className="mt-auto px-5 pt-4 text-center text-xs font-semibold text-ink-500">
        {phase === "time-up" ? "Las palabras de todos se ven en el podio" : `La de ${letterCount} letras tiene premio · las de los demás se ven al final`}
      </p>
    </Screen>
  );
}
