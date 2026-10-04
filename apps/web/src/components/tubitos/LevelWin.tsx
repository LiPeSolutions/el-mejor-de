"use client";

import { ChevronRight, Gamepad2, RotateCcw } from "lucide-react";
import { Personaje } from "@/components/personaje/Personaje";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { Screen } from "@/components/ui/Screen";
import { gameStyle, type GameTheme } from "@/lib/games";
import { clockText } from "@/lib/tubitos";

/** The daily challenge's levels: done ones with their moves, the current one outlined, the rest dashed (Largada's pills). */
export function LevelPills({ total, moves, current, className }: { total: number; moves: readonly number[]; current: number | null; className?: string }) {
  return (
    <div className={cx("flex justify-center gap-2", className)}>
      {Array.from({ length: total }, (_, index) => {
        const done = moves[index];
        if (done !== undefined) {
          return (
            <div key={index} className="flex h-[34px] items-center rounded-full bg-brand px-3.5 font-display text-[14px] font-extrabold text-white tabular-nums">
              {done} mov.
            </div>
          );
        }
        if (current === index + 1) {
          return (
            <div key={index} className="flex h-[34px] items-center rounded-full border-2 border-ink px-3.5 font-display text-[14px] font-extrabold">
              Nivel {index + 1}
            </div>
          );
        }
        return <div key={index} aria-hidden className="h-[34px] w-[52px] rounded-full border-2 border-dashed border-ink-300" />;
      })}
    </div>
  );
}

const CLOUDS = [
  "-left-[70px] top-[120px] w-[200px] opacity-95",
  "-right-[60px] top-[260px] w-[170px] opacity-95",
  "-left-[40px] bottom-[120px] w-[220px] opacity-95",
];

/** A small celebration: ten pieces of confetti falling for a second and a half. */
const CONFETTI = Array.from({ length: 10 }, (_, i) => ({
  left: (i * 41 + 7) % 100,
  color: ["#FFC53D", "#FF6B4A", "#2EC4B6", "#8B6CFF", "#FFFFFF", "#FF7AA2"][i % 6]!,
  width: 7 + (i % 3) * 3,
  delay: (i % 5) * 0.08,
  duration: 1.3 + (i % 3) * 0.1,
}));

interface LevelWinProps {
  game: GameTheme;
  practice: boolean;
  /** The daily challenge's place in the day: "Reto 2 de 3". */
  position?: number;
  level: number;
  moves: number;
  par: number;
  timeMs: number;
  undosUsed: number;
  undos: number;
  /** Daily: what the level is worth (null while the server answers). */
  points?: number | null;
  /** Practice: the highest level solved. */
  record?: number;
  /** Daily: the levels' pills, with the next one current. */
  pills?: { total: number; moves: readonly number[]; current: number };
  tablet: boolean;
  short: boolean;
  reduced: boolean;
  busy: boolean;
  error: string | null;
  onNext: () => void;
  onBack: () => void;
  onRepeat?: () => void;
}

/** "¡Nivel 1 listo!" between the daily challenge's levels (design 06) and after each practice level (07). */
export function LevelWin(props: LevelWinProps) {
  const { game, practice, level, moves, par, tablet, short, reduced } = props;
  return (
    <Screen clouds={CLOUDS} style={gameStyle(game)} className={cx(tablet && "justify-center")}>
      {!reduced && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-full overflow-hidden">
          {CONFETTI.map((piece, i) => (
            <span
              key={i}
              className="absolute -top-6 block rounded-[2px]"
              style={{
                left: `${piece.left}%`,
                width: piece.width,
                height: piece.width * 0.6,
                background: piece.color,
                animation: `rain ${piece.duration}s linear ${piece.delay}s 1 both`,
              }}
            />
          ))}
        </div>
      )}
      <div className={cx("relative flex flex-col", tablet ? "" : "flex-1")}>
        <div className="flex justify-center px-5">
          <Chip className="whitespace-nowrap">
            {practice ? (
              <>
                <Gamepad2 className="size-4" strokeWidth={2.4} />
                Práctica · {game.name}
              </>
            ) : (
              <>
                <span className="inline-block size-2 rounded-full bg-(--game)" />
                Reto {props.position ?? 1} de 3 · {game.name}
              </>
            )}
          </Chip>
        </div>
        <div className={cx("flex justify-center", tablet ? "mt-5" : short ? "mt-2" : "mt-4")}>
          <Personaje {...game.mascot} face={game.resultFace} size={tablet ? 112 : short ? 64 : 84} />
        </div>
        <div className="mt-1.5 text-center" aria-live="polite">
          <div className="text-sm font-bold text-ink-500">{game.praise}</div>
          <h1 className={cx("mt-2 font-display leading-none font-extrabold tracking-[-.03em]", tablet ? "text-[34px]" : "text-[30px]")}>¡Nivel {level} listo!</h1>
          <div className="mt-1.5 flex items-baseline justify-center gap-2">
            <div className={cx("font-display leading-none font-extrabold tracking-[-.05em] tabular-nums", tablet ? "text-[96px]" : short ? "text-[64px]" : "text-[84px]")}>
              {reduced ? moves : <AnimatedNumber value={moves} />}
            </div>
            <div className={cx("font-display font-bold text-ink-500", tablet ? "text-xl" : "text-lg")}>{moves === 1 ? "movimiento" : "movimientos"}</div>
          </div>
          <div className="mt-1.5 text-sm font-bold text-ink-500">El mínimo era {par}</div>
        </div>

        <div className={cx("mx-5 grid grid-cols-3 rounded-card bg-white px-1 py-3.5 shadow-md", short ? "mt-3" : tablet ? "mt-[22px]" : "mt-[18px]")}>
          <Stat label="Tiempo" value={clockText(props.timeMs)} />
          <Stat label="Deshacer" value={`${props.undosUsed} de ${props.undos}`} divided />
          {practice ? (
            <Stat label="Récord" value={`Nivel ${props.record ?? level}`} divided />
          ) : (
            <Stat label="Puntos" value={props.points === null || props.points === undefined ? "…" : `+${props.points}`} divided />
          )}
        </div>

        {props.pills && <LevelPills {...props.pills} className={short ? "mt-3" : "mt-4"} />}

        <div className={cx("flex flex-col gap-2.5 px-5 pt-3.5", tablet ? "mt-8" : "mt-auto")}>
          {props.error && (
            <p role="alert" className="text-center text-[13px] font-bold text-danger">
              {props.error}
            </p>
          )}
          <Button variant="game" size="start" onClick={props.onNext} disabled={props.busy}>
            Siguiente nivel
            <ChevronRight className="size-[22px]" strokeWidth={2.8} />
          </Button>
          {practice ? (
            <>
              <Button variant="secondary" size="md" href="/practicar">
                Volver a Practicar
              </Button>
              <button
                type="button"
                onClick={props.onRepeat}
                disabled={props.busy}
                className="flex h-10 items-center justify-center gap-2 text-[15px] font-extrabold text-ink-700 transition active:scale-[.98] disabled:opacity-45"
              >
                <RotateCcw className="size-[17px]" strokeWidth={2.6} />
                Repetir nivel
              </button>
            </>
          ) : (
            <Button variant="secondary" size="md" onClick={props.onBack}>
              Volver al inicio
            </Button>
          )}
          <p className="text-center text-xs font-semibold text-ink-700">{practice ? "Quedó en tus récords personales" : "El reloj vuelve a correr cuando tocás"}</p>
        </div>
      </div>
    </Screen>
  );
}

function Stat({ label, value, divided = false }: { label: string; value: string; divided?: boolean }) {
  return (
    <div className={cx("text-center", divided && "border-l border-line")}>
      <div className="text-[11px] font-bold tracking-[.06em] text-ink-500 uppercase">{label}</div>
      <div className="mt-1 font-display text-[22px] font-extrabold tabular-nums">{value}</div>
    </div>
  );
}
