"use client";

import { Podium, RankingRow, type RankedPlayer } from "@/components/ranking/Ranking";
import { Personaje } from "@/components/personaje/Personaje";
import { cx } from "@/components/ui/cx";
import type { GameTheme } from "@/lib/games";

export interface WinsRow extends RankedPlayer {
  place: number | null;
}

export interface PastBattle {
  id: string;
  game: GameTheme;
  /** "Hoy 18:40", "Ayer", "Sáb 3/10". */
  when: string;
  winnerName: string;
  winnerIsMe: boolean;
  players: number;
}

/** The group's "Batallas" tab: who won the most, and the last ones played. */
export function BattleHistory({ rows, recent }: { rows: readonly WinsRow[]; recent: readonly PastBattle[] }) {
  const ranked = rows.filter((row) => row.place !== null);
  if (recent.length === 0) {
    return (
      <p className="mx-5 mt-4 rounded-row bg-white px-4 py-3.5 text-center text-sm leading-[1.4] font-semibold text-ink-700 shadow-sm">
        Todavía no jugaron ninguna. Armen la primera: <b className="text-ink">juegan todos a la vez</b>, cada uno en su celu.
      </p>
    );
  }
  return (
    <>
      <div className="flex items-baseline justify-between px-6 pt-4">
        <span className="text-[11px] font-bold tracking-[.06em] text-ink-500 uppercase">Batallas ganadas</span>
        <span className="text-xs font-bold text-ink-500">No cuentan para la corona</span>
      </div>
      <div className="pt-3">
        <Podium top={[ranked[0], ranked[1], ranked[2]]} crowned={false} />
      </div>
      {rows.length > 3 && (
        <ul className="flex flex-col gap-2 px-4 pt-3">
          {rows.slice(3).map((row) => (
            <RankingRow key={row.key} position={row.place} player={row} />
          ))}
        </ul>
      )}

      <div className="px-6 pt-5 text-[11px] font-bold tracking-[.06em] text-ink-500 uppercase">Últimas batallas</div>
      <ul className="flex flex-col gap-2 px-4 pt-2">
        {recent.map((battle) => (
          <li key={battle.id} className="flex items-center gap-3 rounded-row bg-white py-2 pr-3.5 pl-2 shadow-sm">
            <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-key" style={{ background: battle.game.colors.light }}>
              <span className="mt-2">
                <Personaje {...battle.game.mascot} size={34} />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-extrabold">{battle.game.name}</span>
              <span className="block truncate text-xs font-semibold text-ink-500">
                {battle.when} · {battle.players} jugaron
              </span>
            </span>
            <span className={cx("max-w-[45%] shrink-0 truncate rounded-full px-2.5 py-1 text-xs font-extrabold", battle.winnerIsMe ? "bg-gold text-ink" : "bg-surface-2 text-ink-700")}>
              {battle.winnerIsMe ? "Ganaste vos" : battle.winnerName ? `Ganó ${battle.winnerName}` : "Sin ganador"}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
