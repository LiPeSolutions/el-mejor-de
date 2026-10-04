"use client";

import type { GroupColor, GroupEmblem as EmblemId } from "@repo/shared";
import { ChevronRight, Gamepad2, RotateCcw, Swords, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { GroupEmblem } from "@/components/groups/Emblem";
import { Personaje } from "@/components/personaje/Personaje";
import { badgeLook } from "@/components/personaje/avatar";
import { Podium, RankingRow, type RankedPlayer } from "@/components/ranking/Ranking";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/IconButton";
import { Screen } from "@/components/ui/Screen";
import { gameStyle, type GameTheme } from "@/lib/games";
import { WaitingPill, type BattleFace } from "./parts";

export interface PodiumRow extends RankedPlayer {
  place: number;
}

export interface GroupWins {
  group: { id: string; name: string; emblem: EmblemId; color: GroupColor };
  /** Battles won in the group, most first (this one counted). */
  wins: readonly { face: BattleFace; wins: number }[];
}

interface Props {
  game: GameTheme;
  rows: readonly PodiumRow[];
  /** The headline under the winner: "5 de 5 bien", "205 ms de promedio". */
  winnerDetail: string;
  host: boolean;
  hostName: string;
  history: GroupWins | null;
  /** What the game adds under the table (Diez Letras: everyone's words). */
  children?: ReactNode;
  /** Waiting for the server after a button. */
  busy?: boolean;
  onRematch: () => void;
  onOtherGame: () => void;
  onLeave: () => void;
}

/** The battle's podium (it doesn't count for rankings or crowns), with the rematch and the group's tally. */
export function BattlePodium({ game, rows, winnerDetail, host, hostName, history, children, busy = false, onRematch, onOtherGame, onLeave }: Props) {
  const winner = rows[0];
  const title = !winner ? "Terminó la batalla" : winner.isMe ? "¡Ganaste!" : `¡Ganó ${winner.name}!`;
  const tied = rows.filter((row) => row.place === 1).length > 1;
  return (
    <Screen clouds={["-left-[70px] top-[110px] w-[200px] opacity-95", "-right-[60px] top-[190px] w-[170px] opacity-95"]} style={gameStyle(game)}>
      <div className="flex items-center justify-between gap-2 px-5">
        <IconButton label="Salir de la batalla" onClick={onLeave}>
          <X className="size-[18px]" strokeWidth={2.6} />
        </IconButton>
        <div className="text-center">
          <div className="text-[13px] font-extrabold tracking-[.06em] text-(--game-title) uppercase">{game.name}</div>
          <div className="text-[11px] font-bold text-ink-500">Batalla en vivo</div>
        </div>
        <span aria-hidden className="w-[38px]" />
      </div>

      <div className="px-5 pt-4 text-center">
        <h1 className="font-display text-[34px] leading-none font-extrabold tracking-[-.03em]">{tied ? "¡Empate arriba!" : title}</h1>
        <p className="mt-1.5 text-sm font-bold text-ink-700">{winnerDetail}</p>
      </div>

      <div className="pt-4">
        <Podium top={[rows[0], rows[1], rows[2]]} crowned={false} />
      </div>
      {rows.length > 3 && (
        <ul className="flex flex-col gap-2 px-4 pt-3" aria-label="El resto">
          {rows.slice(3).map((row) => (
            <RankingRow key={row.key} position={row.place} player={row} />
          ))}
        </ul>
      )}

      {children}

      {history && (
        <Link href={`/grupos/${history.group.id}?vista=batallas`} className="mx-5 mt-3 flex items-center gap-3 rounded-card bg-white px-4 py-3 shadow-md">
          <GroupEmblem emblem={history.group.emblem} color={history.group.color} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-extrabold tracking-[.06em] text-ink-500 uppercase">Batallas ganadas en {history.group.name}</p>
            <div className="mt-1 flex items-center gap-3">
              {history.wins.slice(0, 3).map(({ face, wins }) => (
                <span key={face.key} className="flex min-w-0 items-center gap-1">
                  <Personaje {...badgeLook(face.avatar)} size={24} />
                  <span className={cx("truncate text-[13px] font-extrabold", face.isMe && "text-brand")}>{face.isMe ? "Vos" : face.name}</span>
                  <span className="font-display text-[13px] font-extrabold text-ink-500 tabular-nums">{wins}</span>
                </span>
              ))}
            </div>
          </div>
          <ChevronRight className="size-5 shrink-0 text-ink-300" strokeWidth={2.6} />
        </Link>
      )}

      <div className="mt-auto flex flex-col gap-2.5 px-5 pt-5">
        {host ? (
          <>
            <Button variant="game" size="lg" onClick={onRematch} disabled={busy} shine>
              <RotateCcw className="size-5" strokeWidth={2.8} />
              Revancha
            </Button>
            <Button variant="secondary" size="md" onClick={onOtherGame} disabled={busy}>
              <Gamepad2 className="size-5" strokeWidth={2.4} />
              Otro juego
            </Button>
          </>
        ) : (
          <>
            <WaitingPill>{hostName} elige: revancha u otro juego</WaitingPill>
            <button type="button" onClick={onLeave} className="flex h-10 items-center justify-center gap-1.5 text-sm font-extrabold text-ink-500">
              <Swords className="size-4" strokeWidth={2.4} />
              Salir de la batalla
            </button>
          </>
        )}
      </div>
      <p className="px-5 pt-2.5 text-center text-xs font-semibold text-ink-500">Las batallas no cuentan para el ranking ni la corona</p>
    </Screen>
  );
}
