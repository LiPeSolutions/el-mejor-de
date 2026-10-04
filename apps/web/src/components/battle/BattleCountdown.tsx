"use client";

import { Personaje } from "@/components/personaje/Personaje";
import { badgeLook } from "@/components/personaje/avatar";
import { cx } from "@/components/ui/cx";
import { gameStyle, type GameTheme } from "@/lib/games";
import type { BattleFace } from "./parts";

/** 3, 2, 1 on every phone at once, before a battle (or a rematch) starts. */
export function BattleCountdown({ game, seconds, faces }: { game: GameTheme; seconds: number; faces: readonly BattleFace[] }) {
  const onGold = game.colors.on !== "#FFFFFF";
  return (
    <main
      className={cx("relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col items-center overflow-hidden text-(--game-on)", game.heroClass)}
      style={gameStyle(game)}
    >
      <span aria-hidden className="absolute inset-0 bg-hero-glow" />
      <div className="relative pt-[calc(env(safe-area-inset-top)+26px)] text-center">
        <div className="text-[13px] font-extrabold tracking-[.08em] uppercase">{game.name}</div>
        <div className={cx("text-xs font-bold", onGold ? "text-gold-ink" : "text-white/85")}>Batalla en vivo</div>
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center">
        <div className="grid size-[200px] place-items-center rounded-full bg-white/18 ring-8 ring-white/25">
          <span key={seconds} className="animate-grow font-display text-[150px] leading-none font-extrabold tracking-[-.04em] tabular-nums">
            {seconds}
          </span>
        </div>
        <p className="mt-7 font-display text-[28px] leading-none font-extrabold tracking-[-.02em]">¡Prepárense!</p>
        <p className={cx("mt-2 text-[15px] font-semibold", onGold ? "text-gold-ink" : "text-white/90")}>Arranca para todos a la vez</p>
      </div>
      <ul className="relative flex flex-wrap justify-center gap-x-3 gap-y-2 px-6 pb-[calc(env(safe-area-inset-bottom)+34px)]">
        {faces.map((face) => (
          <li key={face.key} className="flex w-14 flex-col items-center gap-1">
            <span className={cx("grid size-12 place-items-center rounded-full bg-white", face.isMe && "ring-4 ring-white/60")}>
              <Personaje {...badgeLook(face.avatar)} size={48} />
            </span>
            <span className="max-w-full truncate text-[11px] font-extrabold">{face.isMe ? "Vos" : face.name}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
