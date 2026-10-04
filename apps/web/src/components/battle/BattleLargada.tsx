"use client";

import type { Article } from "@repo/shared";
import { X } from "lucide-react";
import type { PointerEvent, ReactNode } from "react";
import { CAR } from "@/components/largada/Car";
import type { Racer } from "@/components/largada/field";
import { Track, carScaleFor, laneHeightFor, type ChipSpec, type ChipTone, type TrackLane } from "@/components/largada/Track";
import { Personaje } from "@/components/personaje/Personaje";
import { badgeLook } from "@/components/personaje/avatar";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/IconButton";
import { Screen } from "@/components/ui/Screen";
import { SoundToggle } from "@/components/ui/Sound";
import { useMediaQuery } from "@/lib/hooks";
import { RACE, departures, namesList, noseAt, ordinal, placements, startSummary } from "@/lib/largada";
import type { LargadaStart } from "@/lib/largada-types";
import type { BattleFace } from "./parts";

/*
 * Largada a la par: the same lights for everyone, so they go out at the
 * same moment on every phone. After the tap each car waits for its
 * driver's time; when all of them are in, the race runs on every phone at
 * once. The table keeps everyone's average.
 */

export interface LargadaStanding {
  face: BattleFace;
  place: number;
  /** With the penalties; null before the first start. */
  averageMs: number | null;
}

export type BattleLargadaPhase = "lights" | "go" | "waiting" | "race" | "arrival";

interface Props {
  phase: BattleLargadaPhase;
  round: number;
  total: number;
  lights: number;
  /** Ms since the first car left, while racing. */
  t: number;
  /** Top to bottom, the player last. */
  field: readonly Racer[];
  /** This start, one per racer (null: still coming). */
  starts: readonly (LargadaStart | null)[];
  table: readonly LargadaStanding[];
  article: Article;
  maxReactionMs: number;
  onExit: () => void;
  onPress?: (event: PointerEvent) => void;
}

const PENDING: LargadaStart = { reactionMs: null, falseStart: false };

const msText = (start: LargadaStart) => (start.falseStart ? "se adelantó" : start.reactionMs === null ? "no largó" : `${start.reactionMs}`);

export function BattleLargada({ phase, round, total, lights, t, field, starts, table, article, maxReactionMs, onExit, onPress }: Props) {
  const short = useMediaQuery("(max-height: 800px)");
  const laneHeight = laneHeightFor(field.length, short);
  const carW = CAR.width * carScaleFor(laneHeight);
  const racing = phase === "race" || phase === "arrival";
  const known = starts.map((start) => start ?? PENDING);
  const leftAt = departures(known, maxReactionMs);
  const places = placements(known, maxReactionMs);
  const meIndex = field.findIndex((racer) => racer.me);
  const myStart = starts[meIndex] ?? null;
  const pending = field.filter((racer, i) => !racer.me && !starts[i]).map((racer) => racer.name);
  const summary = myStart && pending.length === 0 ? startSummary(field.map((racer, i) => ({ ...known[i]!, name: racer.name, me: racer.me })), maxReactionMs, article) : null;

  const lanes: TrackLane[] = field.map((racer, i) => {
    const start = starts[i];
    const nose = racing && start ? noseAt(t, leftAt[i] ?? null) : RACE.startX;
    const tone: ChipTone = racer.me ? "brand" : "white";
    const helmet = { avatar: racer.avatar, colors: racer.colors };
    let chips: ChipSpec[];
    if (phase === "lights" || phase === "go") {
      chips = [{ text: racer.name, tone: start?.falseStart ? "danger" : tone, right: 22, dy: (laneHeight - 24) / 2, height: 24, fontSize: 12, helmet }];
    } else if (phase === "waiting" || !start) {
      chips = [
        {
          text: `${racer.name} · ${start ? msText(start) : "…"}`,
          tone: start?.falseStart ? "danger" : tone,
          right: 22,
          dy: (laneHeight - 24) / 2,
          height: 24,
          fontSize: 12,
          helmet,
        },
      ];
    } else if (phase === "race") {
      chips = [{ text: `${racer.name} · ${msText(start)}`, tone: start.falseStart ? "danger" : tone, x: Math.max(6, nose - carW + 44), dy: 1, height: 21, fontSize: 11.5 }];
    } else {
      const place = places[i] ?? field.length;
      chips = [
        {
          text: `${racer.name} · ${start.reactionMs === null ? msText(start) : `${start.reactionMs} ms`}`,
          tone: racer.me ? "brand" : start.falseStart ? "danger" : place === 1 ? "gold" : "white",
          x: 10,
          dy: (laneHeight - 26) / 2,
          height: 26,
          fontSize: 12,
          place: ordinal(place, racer.article),
          helmet,
        },
      ];
    }
    return {
      key: racer.key,
      avatar: racer.avatar,
      colors: racer.colors,
      number: racer.number,
      me: racer.me,
      nose,
      opacity: phase === "arrival" && leftAt[i] === null ? 0.35 : 1,
      speedLines: phase === "race" && Boolean(start) && leftAt[i] !== null && t > (leftAt[i] ?? 0),
      smoke: racer.me && (phase === "go" || (phase === "waiting" && Boolean(myStart?.reactionMs)) || (phase === "race" && leftAt[i] !== null && t < (leftAt[i] ?? 0) + 500)),
      chips,
    };
  });

  const big = cx("font-display leading-none font-extrabold tracking-[-.05em] tabular-nums", short ? "text-[52px]" : "text-[60px]");
  let headline: ReactNode;
  if (phase === "lights") {
    headline = (
      <>
        <h1 className="font-display text-[44px] leading-none font-extrabold tracking-[-.03em]">Esperá…</h1>
        <p className="mt-2 text-[15px] font-semibold text-ink-700">Las mismas luces para todos</p>
      </>
    );
  } else if (phase === "go") {
    headline = <h1 className={cx("font-display leading-none font-extrabold tracking-[-.04em]", short ? "text-[76px]" : "text-[90px]")}>¡LARGÁ!</h1>;
  } else if (!myStart || myStart.falseStart || myStart.reactionMs === null) {
    const title = !myStart ? "Esta no la corriste" : myStart.falseStart ? "Te adelantaste" : "No largaste a tiempo";
    const detail = !myStart ? "Entraste con la largada empezada" : myStart.falseStart ? "Esta largada vale 450 ms" : "Esta largada vale 700 ms";
    headline = (
      <>
        <h1 className="font-display text-[36px] leading-none font-extrabold tracking-[-.03em]">{title}</h1>
        <p className="mt-2 text-[15px] font-semibold text-ink-700">{phase === "waiting" && pending.length > 0 ? `Esperando a ${namesList(pending)}` : detail}</p>
      </>
    );
  } else if (phase === "arrival" && summary) {
    headline = (
      <>
        <h1 className="font-display text-[40px] leading-none font-extrabold tracking-[-.03em]">{summary.title}</h1>
        <p className="mt-2 px-4 text-center text-[15px] leading-[1.35] font-semibold text-balance text-ink-700">{summary.detail}</p>
      </>
    );
  } else {
    headline = (
      <>
        <div className="flex h-[34px] items-center gap-1.5 rounded-full bg-white px-1.5 pr-3.5 text-[15px] font-extrabold shadow-sm">
          {summary ? (
            <>
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand px-1.5 font-display text-[13px] text-white">{ordinal(summary.place, article)}</span>
              <span>
                de {field.length} · {summary.ahead ? `${summary.ahead} salió antes` : "saliste primero"}
              </span>
            </>
          ) : (
            <span className="pl-2">{pending.length > 0 ? `Esperando a ${namesList(pending)}` : "Ya largaron todos"}</span>
          )}
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className={big}>{myStart.reactionMs}</span>
          <span className="font-display text-xl font-extrabold text-ink-500">ms</span>
        </div>
      </>
    );
  }

  const onSignal = phase === "go";
  return (
    <Screen backdrop={onSignal ? "reflejos" : "sky"} className="pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <div className="flex flex-1 touch-manipulation flex-col select-none" onPointerDown={onPress}>
        <div className="flex items-center justify-between px-5" data-no-tap>
          <div className="flex gap-2">
            <IconButton label="Salir" onClick={onExit} tone={onSignal ? "glass" : "white"}>
              <X className="size-[18px]" strokeWidth={2.6} />
            </IconButton>
            <SoundToggle tone={onSignal ? "glass" : "white"} />
          </div>
          <div className="text-center">
            <div className={cx("text-[13px] font-extrabold tracking-[.06em] uppercase", onSignal || phase === "lights" ? "text-ink" : "text-reflejos-dark")}>Largada</div>
            <div className={cx("text-[11px] font-bold", onSignal ? "text-ink" : "text-ink-500")}>
              Batalla · {round + 1} de {total}
            </div>
          </div>
          <span aria-hidden className="w-[84px]" />
        </div>

        <div className={cx("relative flex flex-col items-center justify-center text-center", short ? "h-[92px]" : "h-[108px]")} aria-live="assertive">
          {headline}
        </div>

        <Track lanes={lanes} laneHeight={laneHeight} lights={lights} glow={phase === "lights"} signal={onSignal} shade={phase === "lights" ? 0.1 * lights : 0} />

        <div className="mx-5 mt-3 rounded-row bg-white px-2 pt-2 pb-2.5 shadow-sm">
          <div className="flex items-baseline justify-between px-1">
            <span className="text-[11px] font-bold tracking-[.06em] text-ink-500 uppercase">Promedio de la batalla</span>
            {phase === "lights" && <span className="pl-2 text-[11px] font-bold text-ink-500">Si te adelantás, vale 450 ms</span>}
          </div>
          <ol className="mt-1.5 flex justify-around">
            {table.map((row) => (
              <li key={row.face.key} className="flex min-w-0 flex-1 flex-col items-center">
                <span className="relative">
                  <span className={cx("grid size-9 place-items-center rounded-full bg-surface-2", row.face.isMe && "ring-2 ring-brand")}>
                    <Personaje {...badgeLook(row.face.avatar)} size={36} />
                  </span>
                  <span
                    className={cx(
                      "absolute -top-1 -left-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 font-display text-[10px] font-extrabold ring-2 ring-white",
                      row.place === 1 && row.averageMs !== null ? "bg-gold text-ink" : "bg-ink text-white",
                    )}
                  >
                    {row.averageMs === null ? "–" : row.place}
                  </span>
                </span>
                <span className={cx("mt-1 max-w-full truncate text-[11px] font-extrabold", row.face.isMe ? "text-brand" : "text-ink-700")}>{row.face.isMe ? "Vos" : row.face.name}</span>
                <span className="font-display text-[13px] leading-tight font-extrabold tabular-nums">{row.averageMs === null ? "—" : row.averageMs}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Screen>
  );
}
