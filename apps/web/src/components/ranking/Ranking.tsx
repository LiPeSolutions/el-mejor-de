import { dayIndex, type Avatar } from "@repo/shared";
import { Crown } from "lucide-react";
import type { ReactNode } from "react";
import { Personaje } from "@/components/personaje/Personaje";
import { avatarLook } from "@/components/personaje/avatar";
import { cx } from "@/components/ui/cx";
import { formatNumber } from "@/lib/format";

/*
 * Ranking pieces from the design system: podium, rows and "your row", for
 * the groups and the rankings by place.
 */

export interface RankedPlayer {
  key: string;
  name: string;
  avatar: Avatar;
  score: number;
  isMe: boolean;
  /** Has the live crown. Without it, the first one has it (groups). */
  crown?: boolean;
  /** A second line in gray, e.g. the locality in the ranking of the province. */
  detail?: string;
}

/** "quedan 3 días" until Sunday at midnight. */
export function daysLeftText(weekStart: string, today: string): string {
  const left = 6 - (dayIndex(today) - dayIndex(weekStart));
  if (left <= 0) return "hoy es el último día";
  return left === 1 ? "queda 1 día" : `quedan ${left} días`;
}

function MeTag({ light = false }: { light?: boolean }) {
  return (
    <span className={cx("shrink-0 rounded-full px-[7px] py-0.5 text-[10px] font-extrabold", light ? "bg-white/20 text-white" : "bg-brand-100 text-brand")}>
      vos
    </span>
  );
}

const PODIUM = [
  { place: 2, size: 54, block: "h-[50px] bg-white text-ink-500" },
  { place: 1, size: 64, block: "h-[70px] bg-gold text-ink shadow-[0_-8px_20px_rgba(255,197,61,.3)]" },
  { place: 3, size: 50, block: "h-9 bg-white text-ink-500" },
] as const;

/** The top 3 (second, first, third). `crowned` puts the crown on whoever has it (the first one, unless they say). */
export function Podium({ top, crowned }: { top: readonly (RankedPlayer | undefined)[]; crowned: boolean }) {
  return (
    <div className="grid grid-cols-3 items-end gap-2.5 px-5">
      {PODIUM.map(({ place, size, block }) => {
        const entry = top[place - 1];
        const crown = Boolean(entry && crowned && (entry.crown ?? place === 1));
        return (
          <div key={place} className="flex min-w-0 flex-col items-center gap-[3px]">
            {entry ? (
              <>
                <div style={{ height: size * 1.2 }} className="flex items-end">
                  <Personaje
                    {...avatarLook(entry.avatar)}
                    acc={[...avatarLook(entry.avatar).acc!, ...(crown ? (["corona"] as const) : [])]}
                    size={size}
                    title={`El personaje de ${entry.name}`}
                  />
                </div>
                <span className="flex max-w-full items-center gap-1 text-[13px] font-extrabold">
                  <span className="truncate">{entry.name}</span>
                  {entry.isMe && <MeTag />}
                </span>
                {entry.detail && <span className="-mt-0.5 max-w-full truncate text-[11px] font-semibold text-ink-500">{entry.detail}</span>}
                <span className="font-display text-[15px] leading-none font-extrabold tabular-nums">{formatNumber(entry.score)}</span>
              </>
            ) : (
              <>
                <div style={{ height: size * 1.2 }} className="flex items-end">
                  <span className="block rounded-full border-2 border-dashed border-ink-300" style={{ width: size * 0.8, height: size * 0.8 }} />
                </div>
                <span className="text-[13px] font-bold text-ink-500">Libre</span>
                <span className="font-display text-[15px] leading-none font-extrabold text-ink-300">—</span>
              </>
            )}
            <div
              className={cx(
                "mt-1 grid w-full place-items-center rounded-t-2xl font-display text-[22px] font-extrabold",
                entry ? block : "h-9 border-2 border-b-0 border-dashed border-ink-300 text-ink-300",
                !entry && place === 1 && "h-[70px]",
                !entry && place === 2 && "h-[50px]",
              )}
            >
              {place}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** One ranking row (50 px). Without a position, they haven't played in this period. */
export function RankingRow({ position, player, note }: { position: number | null; player: RankedPlayer; note?: ReactNode }) {
  return (
    <li className={cx("flex h-[50px] items-center gap-2.5 rounded-row pr-3.5 pl-3 shadow-sm", position === null ? "bg-white/70" : "bg-white")}>
      <span className="w-[22px] shrink-0 font-display text-sm font-extrabold text-ink-500 tabular-nums">{position ?? "–"}</span>
      <span className="shrink-0">
        <Personaje {...avatarLook(player.avatar)} size={30} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-bold">
          <span className="truncate">{player.name}</span>
          {player.isMe && <MeTag />}
          {note}
        </span>
        {player.detail && <span className="block truncate text-[11px] leading-tight font-semibold text-ink-500">{player.detail}</span>}
      </span>
      {position === null ? (
        <span className="shrink-0 text-xs font-semibold text-ink-500">{player.isMe ? "Todavía no jugaste" : "Todavía no jugó"}</span>
      ) : (
        <span className="shrink-0 font-display text-[15px] font-extrabold tabular-nums">{formatNumber(player.score)}</span>
      )}
    </li>
  );
}

/** "Your row", fixed above the nav (blue, radius 20). */
export function MeBar({ position, player, detail }: { position: number | null; player: RankedPlayer; detail: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[20px] bg-brand px-3.5 py-2.5 text-white shadow-btn">
      <span className="shrink-0 font-display text-sm font-extrabold text-gold tabular-nums">{position ? `#${position}` : "–"}</span>
      <span className="shrink-0">
        <Personaje {...avatarLook(player.avatar)} size={28} />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-extrabold">Vos · {player.name}</p>
        <p className="truncate text-xs text-white/80">{detail}</p>
      </div>
      <span className="shrink-0 font-display text-base font-extrabold tabular-nums">{position ? formatNumber(player.score) : "—"}</span>
    </div>
  );
}

/** The gold band that replaces your row when you lead and have the crown. */
export function CrownBand({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-gold px-4 py-2.5 text-ink shadow-btn-gold">
      <Crown className="size-[22px] shrink-0 fill-current" strokeWidth={2} />
      <div className="min-w-0 leading-tight">
        <p className="text-sm font-extrabold">{title}</p>
        <p className="text-xs font-semibold text-gold-ink">{detail}</p>
      </div>
    </div>
  );
}
