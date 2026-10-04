"use client";

import { LoaderCircle, Swords } from "lucide-react";
import { cx } from "@/components/ui/cx";
import type { GameTheme } from "@/lib/games";
import { FacePile, LiveDot, type BattleFace } from "./parts";

export interface LiveBattle {
  hostName: string;
  game: GameTheme;
  players: readonly BattleFace[];
  /** Already playing: whoever joins now enters on the next round. */
  playing: boolean;
  /** The one looking is in it already. */
  in?: boolean;
}

/**
 * The battle card at the top of a group: "Armar batalla" when there's none,
 * and the live one, with who's in, when somebody opened it.
 */
export function BattleStrip({
  live,
  onCreate,
  onOpen,
  busy = false,
  className,
}: {
  live: LiveBattle | null;
  onCreate: () => void;
  onOpen?: () => void;
  /** Opening or joining: the button waits. */
  busy?: boolean;
  className?: string;
}) {
  if (live) {
    const count = live.players.length;
    return (
      <button
        type="button"
        onClick={onOpen}
        disabled={busy}
        className={cx(
          "relative mx-5 flex items-center gap-3 overflow-hidden rounded-card bg-hero-brand px-4 py-3 text-left text-white shadow-hero transition active:scale-[.99]",
          className,
        )}
      >
        <span aria-hidden className="absolute inset-0 bg-hero-glow" />
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-[.08em] uppercase">
            <LiveDot light />
            {live.playing ? "Jugando ahora" : "Batalla en vivo"}
          </div>
          <p className="mt-1 text-[15px] leading-tight font-extrabold">
            {live.hostName} armó una de {live.game.name}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <FacePile faces={live.players} size={22} ring="brand" />
            <span className="text-xs font-bold text-white/85">{count === 1 ? "1 adentro" : `${count} adentro`}</span>
          </div>
        </div>
        <span className="relative flex h-10 shrink-0 items-center rounded-full bg-white px-4 font-display text-sm font-extrabold text-brand shadow-md">
          {busy ? <LoaderCircle className="size-4 animate-spin" strokeWidth={2.8} /> : live.in ? "Volver" : live.playing ? "Entrar" : "Sumarme"}
        </span>
      </button>
    );
  }
  return (
    <div className={cx("mx-5 flex items-center gap-3 rounded-card bg-white px-4 py-3 shadow-md", className)}>
      <span className="grid size-11 shrink-0 place-items-center rounded-key bg-brand-100 text-brand">
        <Swords className="size-[22px]" strokeWidth={2.3} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">Batalla en vivo</p>
        <p className="text-xs leading-snug font-semibold text-ink-500">Jueguen ahora, todos a la vez</p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        disabled={busy}
        className="flex h-10 shrink-0 items-center rounded-full bg-brand px-4 font-display text-sm font-extrabold text-white shadow-btn transition active:scale-95 disabled:opacity-60"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" strokeWidth={2.8} /> : "Armar"}
      </button>
    </div>
  );
}
