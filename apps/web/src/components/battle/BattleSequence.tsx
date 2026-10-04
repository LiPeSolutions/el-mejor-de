"use client";

import { Check, Eye, Hourglass, Swords, X } from "lucide-react";
import { GameHeader } from "@/components/games/chrome";
import { SequencePads } from "@/components/games/sequence-pads";
import { cx } from "@/components/ui/cx";
import { Screen } from "@/components/ui/Screen";
import { gameStyle, GAMES } from "@/lib/games";
import { AnsweredBadge, FaceTile, LiveDot, type BattleFace } from "./parts";

/*
 * Secuencia a la par: the same colors on every phone at once, round after
 * round. Whoever gets it wrong (or runs out of time) is out and watches the
 * rest; if everyone left gets it wrong, they play it again.
 */

export type SequenceFaceState = "in" | "answered" | "right" | "wrong" | "late" | "out";

export interface SequenceFace {
  face: BattleFace;
  state: SequenceFaceState;
}

/** What the banner says. */
export type SequenceBanner =
  | { kind: "loading" }
  | { kind: "watch"; shown: number; length: number }
  | { kind: "input"; tapped: number; length: number; fraction: number; seconds: number }
  | { kind: "done"; waitingFor: string | null }
  | { kind: "wrong" }
  | { kind: "late" }
  | { kind: "watching"; level: number }
  | { kind: "next"; text: string; tone: "good" | "bad" | "neutral" | "replay" };

interface Props {
  level: number;
  replay: boolean;
  banner: SequenceBanner;
  faces: readonly SequenceFace[];
  /** How many go on (in this round, or to the next one). */
  still: number;
  active: number | null;
  enabled: boolean;
  onPress: (pad: number, at: number) => void;
  onExit: () => void;
}

function OutBadge({ late = false }: { late?: boolean }) {
  return (
    <span className="grid size-5 place-items-center rounded-full bg-danger text-white ring-2 ring-white">
      {late ? <Hourglass className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3.6} />}
    </span>
  );
}

function Strip({ faces, still }: { faces: readonly SequenceFace[]; still: number }) {
  return (
    <div className="mx-5 mt-3 rounded-row bg-white/70 px-3 pt-2.5 pb-2 shadow-sm">
      <div className="flex items-center justify-between text-[11px] font-bold tracking-[.06em] text-ink-500 uppercase">
        <span className="flex items-center gap-1.5">
          <LiveDot />
          En vivo
        </span>
        <span className="tracking-normal normal-case">{still === faces.length ? `Siguen todos (${still})` : `Siguen ${still} de ${faces.length}`}</span>
      </div>
      <div className={cx("mt-2 flex gap-1 overflow-x-auto", faces.length <= 6 && "justify-around")} aria-label="Quiénes siguen">
        {faces.map(({ face, state }) => (
          <div key={face.key} className="w-[52px] shrink-0">
            <FaceTile
              face={face}
              size={30}
              dim={state === "out"}
              badge={state === "answered" || state === "right" ? <AnsweredBadge /> : state === "wrong" ? <OutBadge /> : state === "late" ? <OutBadge late /> : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const NEXT_TONES = { good: "bg-success text-white", bad: "bg-danger text-white", neutral: "bg-brand text-white", replay: "bg-secuencia text-ink" } as const;

function Banner({ banner }: { banner: SequenceBanner }) {
  const base = "relative mx-5 mt-[14px] flex min-h-14 items-center justify-center gap-3 overflow-hidden rounded-[18px] px-4 py-2 text-center shadow-[0_10px_24px_rgba(35,38,58,.2)]";
  switch (banner.kind) {
    case "loading":
      return <div className={cx(base, "bg-brand text-white")}>…</div>;
    case "watch":
      return (
        <div aria-live="polite" className={cx(base, "bg-brand text-white")}>
          <Eye className="size-5" strokeWidth={2.4} />
          <span className="font-display text-lg font-extrabold">Mirá…</span>
          <span className="text-[13px] font-bold text-white/75">
            {banner.shown} de {banner.length}
          </span>
        </div>
      );
    case "input":
      return (
        <div aria-live="polite" className={cx(base, "bg-ink text-white")}>
          <span className="font-display text-lg font-extrabold">Tu turno</span>
          {banner.length <= 14 && (
            <span className="flex gap-[5px]" aria-hidden>
              {Array.from({ length: banner.length }, (_, i) => (
                <span key={i} className={cx("size-3 rounded-full", i < banner.tapped ? "bg-gold" : "border-2 border-white/50")} />
              ))}
            </span>
          )}
          <span className="text-[13px] font-bold text-white/75 tabular-nums">{banner.seconds} s</span>
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
            <span className={cx("block h-full transition-[width] duration-200", banner.seconds <= 3 ? "bg-danger" : "bg-gold")} style={{ width: `${Math.round(banner.fraction * 100)}%` }} />
          </span>
        </div>
      );
    case "done":
      return (
        <div aria-live="polite" className={cx(base, "bg-success text-white")}>
          <Check className="size-5 shrink-0" strokeWidth={3} />
          <span className="font-display text-lg leading-tight font-extrabold">{banner.waitingFor ? `¡Bien! Esperando a ${banner.waitingFor}…` : "¡Bien!"}</span>
        </div>
      );
    case "wrong":
      return (
        <div aria-live="polite" className={cx(base, "bg-danger text-white")}>
          <X className="size-5 shrink-0" strokeWidth={3} />
          <span className="font-display text-lg leading-tight font-extrabold">Ese no era · esperá a los demás</span>
        </div>
      );
    case "late":
      return (
        <div aria-live="polite" className={cx(base, "bg-danger text-white")}>
          <Hourglass className="size-5 shrink-0" strokeWidth={3} />
          <span className="font-display text-lg leading-tight font-extrabold">Se terminó el tiempo</span>
        </div>
      );
    case "watching":
      return (
        <div aria-live="polite" className={cx(base, "bg-ink-500 text-white")}>
          <Eye className="size-5 shrink-0" strokeWidth={2.4} />
          <span className="font-display text-[17px] leading-tight font-extrabold">Quedaste afuera en el nivel {banner.level} · mirás cómo sigue</span>
        </div>
      );
    case "next":
      return (
        <div aria-live="polite" className={cx(base, NEXT_TONES[banner.tone])}>
          {banner.tone === "replay" && <Swords className="size-5 shrink-0" strokeWidth={2.6} />}
          <span className="font-display text-[17px] leading-tight font-extrabold">{banner.text}</span>
        </div>
      );
  }
}

export function BattleSequence({ level, replay, banner, faces, still, active, enabled, onPress, onExit }: Props) {
  const game = GAMES.sequence;
  return (
    <Screen clouds={["-left-[60px] bottom-[50px] w-[220px] opacity-70"]} style={gameStyle(game)}>
      <GameHeader
        title={game.name}
        onClose={onExit}
        right={
          <div className="flex h-[38px] items-center rounded-full bg-white px-3.5 font-display text-base font-extrabold shadow-[0_6px_16px_rgba(35,38,58,.08)]">
            {replay ? "Desempate" : `Nivel ${level}`}
          </div>
        }
      />
      <Strip faces={faces} still={still} />
      <Banner banner={banner} />
      <SequencePads active={active} enabled={enabled} onPress={onPress} />
      <p className="mt-auto px-5 pt-4 text-center text-xs font-semibold text-ink-500">Tocá los botones en el mismo orden · si se equivocan todos, desempate</p>
    </Screen>
  );
}
