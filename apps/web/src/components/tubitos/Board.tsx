"use client";

import { isTubeDone, topGroup, type Board as Tubes, type Tube as TubeLayers } from "@repo/games";
import { ArrowDown, Check } from "lucide-react";
import type { CSSProperties } from "react";
import { cx } from "@/components/ui/cx";
import { liquidOf, pourPose, runsOf, surfaceY, tippedLiquid, tubeLabel, type BoardLayout, type Run, type TubeSize } from "@/lib/tubitos";

/*
 * Tubitos' board, "Probeta" style (docs/diseno/handoff-tubitos §5): glass
 * tubes standing on white racks. Each tube's whole column is a button; the
 * glass inside it is only drawn.
 */

/** A pour on its way, in the order it goes: lift off, tip, pour, back. */
export interface PourMotion {
  from: number;
  to: number;
  amount: number;
  color: number;
  stage: "lift" | "tilt" | "pour" | "back";
  /** The board before the pour. */
  before: Tubes;
}

/** Tubes marked for a moment (a shake, a fade). A new `key` restarts the animation. */
export interface Flash {
  tubes: readonly number[];
  key: number;
}

/** The animation's class, alternating with its copy so it restarts when it comes twice in a row. */
const flashClass = (flash: Flash | null, index: number, name: "shake" | "nudge" | "fade-in") =>
  flash?.tubes.includes(index) ? (flash.key % 2 === 0 ? `animate-${name}` : `animate-${name}-again`) : null;

interface BoardProps {
  layout: BoardLayout;
  tubes: Tubes;
  capacity: number;
  selected: number | null;
  /** Tubes the lifted one can pour into. */
  targets: ReadonlySet<number>;
  /** Tapped, but it can't take it: red ring and a shake. */
  refused: Flash | null;
  /** Can't be lifted (empty or done): a small shake. */
  nudged: Flash | null;
  pour: PourMotion | null;
  /** Tubes that just changed without a pour (reduced motion, undo, restart), to fade them in. */
  faded: Flash | null;
  reduced: boolean;
  onTap: (index: number) => void;
}

export const LIFT_MS = 140;
export const FLY_MS = 220;
export const TILT_MS = 120;
export const POUR_MS_PER_LAYER = 300;
export const BACK_MS = 200;

export function Board({ layout, tubes, capacity, selected, targets, refused, nudged, pour, faded, reduced, onTap }: BoardProps) {
  const pose = pour ? pourPose(layout, pour.from, pour.to) : null;
  const pourMs = pour ? pour.amount * POUR_MS_PER_LAYER : 0;
  const inner = layout.tubeHeight - 6;

  // The stream, from the lip down to the liquid in the target, which rises as it comes in.
  let stream: { style: CSSProperties } | null = null;
  if (pour && pose && pour.stage === "pour") {
    const before = pour.before[pour.to]!.length;
    const start = Math.max(12, surfaceY(layout, pour.to, before) - pose.lipY);
    const end = Math.max(12, surfaceY(layout, pour.to, before + pour.amount) - pose.lipY);
    stream = {
      style: {
        left: pose.lipX - 4,
        top: pose.lipY,
        height: end,
        background: liquidOf(pour.color).hex,
        animationDuration: `${pourMs}ms`,
        ["--from-h" as string]: `${start}px`,
      },
    };
  }

  return (
    <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
      {layout.racks.map((rack) => (
        <div
          key={rack.y}
          aria-hidden
          className="absolute h-4 rounded-full bg-white/80 shadow-[0_6px_16px_rgba(35,38,58,.06)]"
          style={{ left: rack.x, top: rack.y, width: rack.width }}
        />
      ))}

      {tubes.map((tube, index) => {
        const zone = layout.zones[index]!;
        const spot = layout.tubes[index]!;
        const moving = pour?.from === index ? pour : null;
        const filling = pour?.to === index && pour.stage === "pour" ? pour : null;
        const lifted = selected === index;
        const canReceive = targets.has(index);
        // Where the glass goes: lifted, flying to pour, or in its place.
        let travel = "none";
        let travelMs = LIFT_MS;
        let tip = 0;
        let tipMs = TILT_MS;
        if (moving && pose) {
          // It tips in the flight's last 120 ms (the "tilt" stage starts 100 ms in).
          const out = moving.stage !== "back";
          travel = out ? `translate(${pose.dx.toFixed(1)}px, ${pose.dy.toFixed(1)}px)` : "none";
          travelMs = out ? FLY_MS : BACK_MS;
          tip = out && moving.stage !== "lift" ? pose.theta : 0;
          tipMs = out ? TILT_MS : BACK_MS;
        } else if (lifted) {
          travel = "translateY(-20px)";
        }
        return (
          <button
            key={index}
            type="button"
            aria-label={tubeLabel(index, tube, capacity, canReceive)}
            aria-pressed={lifted}
            onClick={() => onTap(index)}
            className={cx("absolute touch-manipulation rounded-[14px] select-none", moving ? "z-30" : "z-10")}
            style={{ left: zone.x, top: zone.y, width: zone.width, height: zone.height }}
          >
            <span
              aria-hidden
              className="absolute block"
              style={{
                left: spot.x - zone.x,
                top: spot.y - zone.y,
                transform: travel,
                transition: reduced ? "none" : `transform ${travelMs}ms ${moving ? "ease-in-out" : "cubic-bezier(.2,.9,.3,1.15)"}`,
              }}
            >
              <span className={cx("block", !reduced && flashClass(refused, index, "shake"), !reduced && flashClass(nudged, index, "nudge"), flashClass(faded, index, "fade-in"))}>
                <span
                  className="block"
                  style={{ transform: `rotate(${tip}deg)`, transformOrigin: "50% 0", transition: reduced ? "none" : `transform ${tipMs}ms ease-in-out` }}
                >
                  <Glass
                    size={layout.size}
                    height={layout.tubeHeight}
                    inner={inner}
                    tube={tube}
                    capacity={capacity}
                    lifted={lifted}
                    canReceive={canReceive}
                    refused={refused?.tubes.includes(index) ?? false}
                    tipped={moving && moving.stage !== "lift" && pose ? { pour: moving, side: pose.side, theta: pose.theta, ms: pourMs } : null}
                    filling={filling ? { pour: filling, ms: pourMs } : null}
                  />
                </span>
              </span>
            </span>
          </button>
        );
      })}

      {stream && <div aria-hidden className="absolute z-20 w-2 animate-fill-up rounded-full shadow-[0_0_0_2px_rgba(255,255,255,.45)]" style={stream.style} />}
    </div>
  );
}

interface GlassProps {
  size: TubeSize;
  height: number;
  inner: number;
  tube: TubeLayers;
  capacity: number;
  lifted: boolean;
  canReceive: boolean;
  refused: boolean;
  tipped: { pour: PourMotion; side: 1 | -1; theta: number; ms: number } | null;
  filling: { pour: PourMotion; ms: number } | null;
}

/** One tube: lip, glass body, liquid, shine, and its states (§5.2 and §5.3). */
function Glass({ size, height, inner, tube, capacity, lifted, canReceive, refused, tipped, filling }: GlassProps) {
  const radius = Math.round(size.tube / 2);
  const ring = `13px 13px ${radius + 7}px ${radius + 7}px`;
  const done = isTubeDone(tube, capacity);
  return (
    <span className="relative block" style={{ width: size.tube, height }}>
      {canReceive && (
        <>
          <span className="absolute -inset-[7px] block border-[2.5px] border-dashed border-tubitos bg-[rgba(255,111,165,.08)]" style={{ borderRadius: ring }} />
          <span
            className="absolute left-1/2 grid size-7 -translate-x-1/2 place-items-center rounded-full bg-tubitos text-white shadow-[0_6px_14px_rgba(255,111,165,.4)]"
            style={{ top: -46 }}
          >
            <ArrowDown className="size-4" strokeWidth={3} />
          </span>
        </>
      )}
      <span
        className="absolute inset-x-0 top-1.5 bottom-0 block overflow-hidden border-[2.5px] border-t-0 border-white bg-white/42 shadow-[0_10px_20px_rgba(35,38,58,.10)]"
        style={{ borderRadius: `0 0 ${radius}px ${radius}px` }}
      >
        {tipped ? <TippedLiquid tipped={tipped} inner={inner} iconSize={size.icon} /> : <Liquid tube={tube} size={size} filling={filling} />}
        <span className="absolute top-2 bottom-[24%] left-[16%] block w-[5px] rounded-[3px] bg-white/55" />
      </span>
      <span className="absolute -inset-x-1 top-0 block h-2 rounded-[4px] bg-white shadow-[0_2px_6px_rgba(35,38,58,.10)]" />
      {lifted && <span className="absolute -inset-[7px] block border-[3px] border-tubitos shadow-[0_16px_28px_rgba(255,111,165,.35)]" style={{ borderRadius: ring }} />}
      {refused && <span className="absolute -inset-[7px] block border-[3px] border-danger shadow-[0_12px_24px_rgba(226,80,76,.3)]" style={{ borderRadius: ring }} />}
      {done && !tipped && (
        <>
          <span className="absolute top-[-9px] right-[14%] left-[14%] block h-3.5 animate-cork rounded-[4px_4px_2px_2px] bg-[#E8CDA3] shadow-[inset_0_-3px_0_#C9A074]" />
          <span className="absolute top-[-40px] left-1/2 grid size-6 -translate-x-1/2 animate-check place-items-center rounded-full bg-success text-white shadow-[0_6px_14px_rgba(31,160,147,.35)]">
            <Check className="size-3.5" strokeWidth={3.2} />
          </span>
        </>
      )}
    </span>
  );
}

/** Standing up: one block per stretch of a color, from the bottom, each with its icon. */
function Liquid({ tube, size, filling }: { tube: TubeLayers; size: TubeSize; filling: { pour: PourMotion; ms: number } | null }) {
  let runs = runsOf(tube);
  // Liquid coming in rises to where it will be: from what was there, at the pour's pace.
  let fromHeight: number | null = null;
  if (filling) {
    const before = runsOf(filling.pour.before[filling.pour.to]!);
    const top = before.at(-1);
    fromHeight = top && top.color === filling.pour.color ? top.amount * size.layer : 0;
    runs = top && top.color === filling.pour.color ? [...before.slice(0, -1), { color: top.color, amount: top.amount + filling.pour.amount }] : [...before, { color: filling.pour.color, amount: filling.pour.amount }];
  }
  return (
    <span className="absolute inset-x-0 bottom-0 flex flex-col-reverse">
      {runs.map((run, index) => {
        const liquid = liquidOf(run.color);
        const top = index === runs.length - 1;
        const rising = filling && top;
        return (
          <span
            key={index}
            className={cx("relative grid flex-none place-items-center", rising && "animate-fill-up")}
            style={{
              height: run.amount * size.layer,
              background: liquid.hex,
              color: liquid.mark,
              ...(rising ? { animationDuration: `${filling.ms}ms`, ["--from-h" as string]: `${fromHeight}px` } : {}),
            }}
          >
            {top && <span className="absolute inset-x-0 top-0 h-[3px] bg-white/35" />}
            <liquid.Icon className="relative" style={{ width: size.icon, height: size.icon }} strokeWidth={2} fill={liquid.mark} />
          </span>
        );
      })}
    </span>
  );
}

/** Tipped over to pour: the liquid stays level and drains as it goes (§6.3). */
function TippedLiquid({ tipped, inner, iconSize }: { tipped: { pour: PourMotion; side: 1 | -1; theta: number; ms: number }; inner: number; iconSize: number }) {
  const { pour, side, theta, ms } = tipped;
  const before = runsOf(pour.before[pour.from]!);
  // Pouring (and on the way back) the top stretch has lost what went out.
  const drained = pour.stage === "pour" || pour.stage === "back";
  const runs: Run[] = before.map((run, index) => (index === before.length - 1 && drained ? { ...run, amount: run.amount - pour.amount } : run));
  const { bands, clip } = tippedLiquid(runs, inner, side);
  const transition = pour.stage === "pour" ? `${ms}ms linear` : "0ms";
  return (
    <span className="absolute inset-0 block" style={{ clipPath: clip, transition: `clip-path ${transition}` }}>
      {bands.map((band, index) => {
        const liquid = liquidOf(runs[index]!.color);
        return (
          <span
            key={index}
            className="absolute inset-x-0 block"
            style={{ top: band.top, height: band.height, background: liquid.hex, color: liquid.mark, transition: `top ${transition}, height ${transition}` }}
          >
            {band.height > iconSize + 4 && (
              <span className="absolute top-1/2 block" style={{ left: side > 0 ? "66%" : "34%", transform: `translate(-50%,-50%) rotate(${-theta}deg)` }}>
                <liquid.Icon style={{ width: iconSize, height: iconSize }} strokeWidth={2} fill={liquid.mark} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** The top color of a tube, if it has one. */
export function topColor(tube: TubeLayers): number | null {
  return topGroup(tube)?.color ?? null;
}
