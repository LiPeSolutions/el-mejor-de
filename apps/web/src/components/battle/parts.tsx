"use client";

import type { GameId } from "@repo/games";
import type { Avatar } from "@repo/shared";
import { Check, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Personaje, type PersonajeProps } from "@/components/personaje/Personaje";
import { avatarLook } from "@/components/personaje/avatar";
import { cx } from "@/components/ui/cx";

/*
 * Small pieces shared by the battle screens: who's in, who already
 * answered, the waiting pill and the "en vivo" dot.
 */

export interface BattleFace {
  key: string;
  name: string;
  avatar: Avatar;
  isMe?: boolean;
}

/** The red "EN VIVO" dot, pulsing. */
export function LiveDot({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cx("relative flex size-2.5 shrink-0", className)} aria-hidden>
      <span className={cx("absolute inline-flex size-full animate-ping rounded-full opacity-70", light ? "bg-white" : "bg-danger")} />
      <span className={cx("relative inline-flex size-2.5 rounded-full bg-danger", light && "ring-2 ring-white")} />
    </span>
  );
}

/** A game's mascot on its soft white disc, as on the practice tiles. */
export function Mascot({ look, size, disc = "bg-white/40", className }: { look: PersonajeProps; size: number; disc?: string; className?: string }) {
  return (
    <span className={cx("block", !/\b(absolute|relative|fixed|sticky)\b/.test(className ?? "") && "relative", className)} style={{ width: size, height: size * 1.2 }}>
      <span aria-hidden className={cx("absolute top-[54%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full", disc)} style={{ width: size, height: size }} />
      <span className="relative block drop-shadow-[0_6px_8px_rgba(0,0,0,.18)]">
        <Personaje {...look} size={size} />
      </span>
    </span>
  );
}

/** Overlapping characters, e.g. who's in a battle. */
export function FacePile({ faces, size = 30, max = 4, ring = "white" }: { faces: readonly BattleFace[]; size?: number; max?: number; ring?: "white" | "brand" }) {
  const shown = faces.slice(0, max);
  const more = faces.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((face, i) => (
        <span
          key={face.key}
          className={cx("grid place-items-center overflow-hidden rounded-full", ring === "white" ? "bg-white ring-2 ring-white" : "bg-white ring-2 ring-brand", i > 0 && "-ml-2.5")}
          style={{ width: size + 6, height: size + 6 }}
        >
          <Personaje {...avatarLook(face.avatar)} size={size} />
        </span>
      ))}
      {more > 0 && (
        <span
          className={cx("-ml-2.5 grid place-items-center rounded-full font-display text-xs font-extrabold", ring === "white" ? "bg-surface-2 text-ink-700 ring-2 ring-white" : "bg-white/25 text-white ring-2 ring-brand")}
          style={{ width: size + 6, height: size + 6 }}
        >
          +{more}
        </span>
      )}
    </div>
  );
}

/** A player's character with a badge (answered, out…) and the name under it. */
export function FaceTile({ face, size = 40, badge, dim = false, label }: { face: BattleFace; size?: number; badge?: ReactNode; dim?: boolean; label?: ReactNode }) {
  return (
    <div className={cx("flex min-w-0 flex-col items-center gap-1 transition-opacity", dim && "opacity-45")}>
      <div className="relative">
        <span className={cx("grid place-items-center rounded-full bg-white shadow-sm", face.isMe && "ring-2 ring-brand")} style={{ width: size + 10, height: size + 10 }}>
          <Personaje {...avatarLook(face.avatar)} size={size} />
        </span>
        {badge && <span className="absolute -right-1 -bottom-1">{badge}</span>}
      </div>
      <span className={cx("max-w-full truncate text-[11px] font-extrabold", face.isMe ? "text-brand" : "text-ink-700")}>{label ?? (face.isMe ? "Vos" : face.name)}</span>
    </div>
  );
}

/** The green check on whoever already answered. */
export function AnsweredBadge() {
  return (
    <span className="grid size-5 place-items-center rounded-full bg-success text-white ring-2 ring-white">
      <Check className="size-3" strokeWidth={3.6} />
    </span>
  );
}

/** "Esperando a que Pato empiece…": a soft pill for whoever isn't deciding. */
export function WaitingPill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-white/80 px-5 text-center text-sm font-extrabold text-ink-700 shadow-sm", className)}>
      <LoaderCircle className="size-4 shrink-0 animate-spin text-brand" strokeWidth={2.8} />
      <span>{children}</span>
    </div>
  );
}

/** A "who answered" strip: the characters, a check on each one that did. */
export function AnsweredStrip({ faces, answered }: { faces: readonly BattleFace[]; answered: ReadonlySet<string> }) {
  const count = faces.filter((face) => answered.has(face.key)).length;
  return (
    <div className="mx-5 mt-3 rounded-row bg-white/70 px-3 pt-2.5 pb-2 shadow-sm">
      <div className="flex justify-between text-[11px] font-bold tracking-[.06em] text-ink-500 uppercase">
        <span>En vivo</span>
        <span className="normal-case tracking-normal">
          {count === faces.length ? "Respondieron todos" : `Respondieron ${count} de ${faces.length}`}
        </span>
      </div>
      <div className="mt-2 flex justify-around gap-1">
        {faces.map((face) => (
          <FaceTile key={face.key} face={face} size={30} badge={answered.has(face.key) ? <AnsweredBadge /> : undefined} dim={!answered.has(face.key)} />
        ))}
      </div>
    </div>
  );
}

/** How a battle of each game goes, in one line (under the picker and on the link). */
export const BATTLE_HOW_TO: Partial<Record<GameId, string>> = {
  reflexes: "3 largadas con las mismas luces para todos. Gana el mejor promedio.",
  "five-questions": "5 preguntas, la misma para todos a la vez. Responder rápido suma más.",
  "seven-letters": "Las mismas 10 letras para todos, 90 segundos. Gana el que suma más puntos.",
  sequence: "La misma secuencia para todos, cada ronda un color más. El que se equivoca queda afuera.",
};
