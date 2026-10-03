"use client";

import type { Avatar } from "@repo/shared";
import { memo, useEffect, useState, type ReactNode } from "react";
import { RACE } from "@/lib/largada";
import { textWidth } from "@/lib/text-width";
import { CAR, CarShape, HelmetShape, type CarColors } from "./Car";

/*
 * Largada's track (design "Estadio", docs/diseno/handoff-largada/fuente-diseno/
 * Pista.dc.html): stands, the gantry with the five lights and a lane per
 * car, seen from the side, all in one SVG that scales with the screen. The
 * geometry is the design's, 390 wide.
 */

export const TRACK_WIDTH = 390;
const K = 1.15;
const ASPHALT_TOP = 102 * K;
const CROWD = ["#FFC53D", "#FF7AA2", "#4F6BFF", "#FF6B4A", "#8B6CFF", "#2EC4B6"];
const ME_LANE = "rgba(79,107,255,.22)";

export type ChipTone = "white" | "brand" | "gold" | "danger" | "ink";

const TONES: Record<ChipTone, { bg: string; fg: string; posBg: string; posFg: string }> = {
  white: { bg: "rgba(255,255,255,.92)", fg: "#4B5070", posBg: "#23263A", posFg: "#FFFFFF" },
  brand: { bg: "#4F6BFF", fg: "#FFFFFF", posBg: "#FFFFFF", posFg: "#4F6BFF" },
  gold: { bg: "#FFC53D", fg: "#23263A", posBg: "#FFFFFF", posFg: "#23263A" },
  danger: { bg: "#E2504C", fg: "#FFFFFF", posBg: "#FFFFFF", posFg: "#E2504C" },
  ink: { bg: "#23263A", fg: "#FFFFFF", posBg: "#FFFFFF", posFg: "#23263A" },
};

export interface ChipSpec {
  text: string;
  tone: ChipTone;
  /** From the left, or from the right edge. */
  x?: number;
  right?: number;
  /** From the lane's top. */
  dy: number;
  height: number;
  fontSize: number;
  /** A place badge ("2º"). */
  place?: string;
  /** The helmet of whoever it is (null: the ghost's). */
  helmet?: { avatar: Avatar | null; colors: CarColors };
  crown?: boolean;
  /** Slides in from the left after this many ms (the arrival's table). */
  enterAfterMs?: number;
}

export interface TrackLane {
  key: string;
  avatar: Avatar | null;
  colors: CarColors;
  number: number | null;
  me: boolean;
  /** The car's nose, in track units (the start line is at 192). */
  nose: number;
  opacity?: number;
  speedLines?: boolean;
  smoke?: boolean;
  chips?: ChipSpec[];
}

export interface TrackProps {
  lanes: TrackLane[];
  laneHeight: number;
  /** How many of the five lights are on. */
  lights: number;
  glow?: boolean;
  /** The signal: the lights went out (turquoise stands, glowing start line, the bar under the lights). */
  signal?: boolean;
  /** The scene darkens with each light. */
  shade?: number;
  /** Without the gantry, for the finish photo. */
  photo?: boolean;
  /** The car's size relative to the lane (0.56 at 72 px). */
  className?: string;
  title?: string;
}

/** The track's height for this many lanes. */
export function trackHeight(lanes: number, laneHeight: number): number {
  const asphalt = 3.5 + lanes * laneHeight + Math.max(0, lanes - 1) * 2 + 2 + 1.5;
  return ASPHALT_TOP + asphalt + 20;
}

/** How big a car is in a lane of this height: 0.56 at 72 px; taller lanes, a bit bigger, but never sticking out on the left. */
export const carScaleFor = (laneHeight: number) => (0.56 * Math.min(laneHeight, 80)) / 72;

/** Lanes fill the room five would take, up to 96 px each. */
export function laneHeightFor(lanes: number, short: boolean): number {
  const base = short ? 60 : 72;
  const room = 5 * base + 4 * 2;
  return Math.min(96, Math.max(base, (room - Math.max(0, lanes - 1) * 2) / Math.max(1, lanes)));
}

/** Re-renders once the fonts are in, so pills measured with the fallback font get their real width. */
function useFontsReady() {
  const [, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void document.fonts?.ready.then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
}

const Stands = memo(function Stands({ signal }: { signal: boolean }) {
  const dots: ReactNode[] = [];
  const step = 33 * K;
  const r = 4.5 * K;
  [
    { y: 12.5, x0: 16, ci: 5 },
    { y: 36, x0: 32, ci: 0 },
    { y: 54, x0: 16, ci: 5 },
  ].forEach((row, rowIndex) => {
    let i = 0;
    for (let x = row.x0 * K; x < TRACK_WIDTH + step; x += step, i++) {
      dots.push(<circle key={`${rowIndex}-${i}`} cx={x} cy={row.y * K} r={r} fill={CROWD[(row.ci + i) % 6]} />);
    }
  });
  return (
    <>
      <rect x="0" y={10 * K} width={TRACK_WIDTH} height={60 * K} fill={signal ? "#A6EAE2" : "#E8EAF6"} />
      {[24, 42, 60].map((y) => (
        <rect key={y} x="0" y={y * K} width={TRACK_WIDTH} height={5 * K} fill={signal ? "#8DE1D7" : "#D9DDF3"} />
      ))}
      {dots}
      <rect x="0" y="0" width={TRACK_WIDTH} height={10 * K} fill="#23263A" />
      <rect x="0" y={70 * K} width={TRACK_WIDTH} height={12 * K} fill="#B8BDD6" />
      <rect x="0" y={74 * K} width={TRACK_WIDTH} height={3 * K} fill="#FFFFFF" />
      <rect x="0" y={82 * K} width={TRACK_WIDTH} height={12 * K} fill="#6CCB6C" />
    </>
  );
});

function Piano({ y, offset = 0 }: { y: number; offset?: number }) {
  const tiles: ReactNode[] = [];
  for (let x = -offset; x < TRACK_WIDTH; x += 32) {
    tiles.push(<rect key={x} x={x} y={y} width="16" height="8" fill="#E2504C" />);
  }
  return (
    <>
      <rect x="0" y={y} width={TRACK_WIDTH} height="8" fill="#FFFFFF" />
      {tiles}
    </>
  );
}

/** The gantry's box with the five lights (radius 17, 48 apart). */
function Lights({ on, glow, signal }: { on: number; glow: boolean; signal: boolean }) {
  const box = { w: 262, h: 52, r: 14, top: 20 * K };
  const x = (TRACK_WIDTH - box.w) / 2;
  const cy = box.top + box.h / 2;
  return (
    <g>
      {glow && on > 0 && <rect x={x} y={box.top + 10} width={box.w} height={box.h} rx={box.r} fill="rgba(226,80,76,.35)" filter="url(#largada-blur)" />}
      <rect x={x} y={box.top} width={box.w} height={box.h} rx={box.r} fill="#23263A" />
      {[0, 1, 2, 3, 4].map((i) => {
        const cx = x + 35 + i * 48;
        const lit = i < on;
        return (
          <g key={i}>
            {lit && glow && <circle cx={cx} cy={cy} r={27} fill="rgba(226,80,76,.85)" filter="url(#largada-blur)" />}
            {lit && <circle cx={cx} cy={cy} r={17 + 4 * (17 / 9)} fill="rgba(226,80,76,.35)" />}
            <circle cx={cx} cy={cy} r={17} fill={lit ? "#E2504C" : "#4B5070"} />
          </g>
        );
      })}
      {signal && <rect x={x + 8} y={box.top + box.h - 3} width={box.w - 16} height="5" rx="2.5" fill="#2EC4B6" />}
    </g>
  );
}

const Car = memo(function Car({ colors, avatar, number }: { colors: CarColors; avatar: Avatar | null; number: number | null }) {
  return <CarShape colors={colors} avatar={avatar} number={number} />;
});

/** A pill drawn in the SVG, sized to its text. */
function Chip({ spec, laneTop }: { spec: ChipSpec; laneTop: number }) {
  const tone = TONES[spec.tone];
  const pad = 10;
  const gap = 6;
  const h = spec.height;
  const helmetH = h - 4;
  const helmetW = helmetH * 1.39;
  const placeW = spec.place ? Math.max(18, textWidth(spec.place, 11, 800, "display") + 8) : 0;
  const textW = textWidth(spec.text, spec.fontSize, 800);
  const parts = [placeW, spec.helmet ? helmetW : 0, spec.crown ? 13 : 0, textW].filter((w) => w > 0);
  // The badge and the helmet tuck into the pill's left padding, as in the design.
  const tuck = spec.place ? 5 : spec.helmet ? 4 : 0;
  const width = pad * 2 + parts.reduce((sum, w) => sum + w, 0) + gap * (parts.length - 1) - tuck;
  const left = spec.right !== undefined ? TRACK_WIDTH - spec.right - width : (spec.x ?? 0);
  const cy = h / 2;
  let x = pad - tuck;
  const items: ReactNode[] = [];
  if (spec.place) {
    items.push(
      <g key="place">
        <rect x={x} y={cy - 9} width={placeW} height="18" rx="9" fill={tone.posBg} />
        <text x={x + placeW / 2} y={cy} dy="0.36em" textAnchor="middle" fontSize="11" fontWeight="800" fill={tone.posFg} className="font-display">
          {spec.place}
        </text>
      </g>,
    );
    x += placeW + gap;
  }
  if (spec.helmet) {
    items.push(
      <svg key="helmet" x={x} y={cy - helmetH / 2} width={helmetW} height={helmetH} viewBox="-1 -1 38.4 27.6">
        <HelmetShape colors={spec.helmet.colors} avatar={spec.helmet.avatar} />
      </svg>,
    );
    x += helmetW + gap;
  }
  if (spec.crown) {
    items.push(
      <svg key="crown" x={x} y={cy - 6.5} width="13" height="13" viewBox="0 0 24 24">
        <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" fill="#FFC53D" stroke="#23263A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>,
    );
    x += 13 + gap;
  }
  items.push(
    <text key="text" x={x} y={cy} dy="0.36em" fontSize={spec.fontSize} fontWeight="800" fill={tone.fg} className="font-sans tabular-nums">
      {spec.text}
    </text>,
  );
  return (
    <g transform={`translate(${left},${laneTop + spec.dy})`}>
      <g className={spec.enterAfterMs !== undefined ? "animate-chip-in" : undefined} style={spec.enterAfterMs !== undefined ? { animationDelay: `${spec.enterAfterMs}ms` } : undefined}>
        <rect width={width} height={h} rx={h / 2} fill={tone.bg} />
        {items}
      </g>
    </g>
  );
}

export function Track({ lanes, laneHeight, lights, glow = false, signal = false, shade = 0, photo = false, className, title }: TrackProps) {
  useFontsReady();
  const height = trackHeight(lanes.length, laneHeight);
  const scale = carScaleFor(laneHeight);
  const carW = CAR.width * scale;
  const carH = CAR.height * scale;
  const firstTop = ASPHALT_TOP + 3.5;
  const rows = lanes.map((lane, i) => ({ lane, top: firstTop + i * (laneHeight + 2) }));
  const edgeBottom = firstTop + lanes.length * laneHeight + Math.max(0, lanes.length - 1) * 2;
  const asphaltBottom = edgeBottom + 2 + 1.5;
  return (
    <svg viewBox={`0 0 ${TRACK_WIDTH} ${height}`} width="100%" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <filter id="largada-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <pattern id="largada-checker" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#FFFFFF" />
          <rect width="7" height="7" fill="#23263A" />
          <rect x="7" y="7" width="7" height="7" fill="#23263A" />
        </pattern>
      </defs>
      <Stands signal={signal} />
      <Piano y={94 * K} />
      {!photo && (
        <>
          <rect x="0" y={14 * K} width={TRACK_WIDTH} height={8 * K} fill="#23263A" />
          <rect x="10" y={14 * K} width="6" height={ASPHALT_TOP - 14 * K} fill="#23263A" />
          <rect x={TRACK_WIDTH - 16} y={14 * K} width="6" height={ASPHALT_TOP - 14 * K} fill="#23263A" />
        </>
      )}
      <rect x="0" y={ASPHALT_TOP} width={TRACK_WIDTH} height={asphaltBottom - ASPHALT_TOP} fill="#3B4056" />
      <rect x="0" y={ASPHALT_TOP + 1.5} width={TRACK_WIDTH} height="2" fill="rgba(255,255,255,.83)" />
      <rect x="0" y={edgeBottom} width={TRACK_WIDTH} height="2" fill="rgba(255,255,255,.83)" />
      {rows.map(({ lane, top }, i) => (
        <g key={lane.key}>
          {lane.me && <rect x="0" y={top} width={TRACK_WIDTH} height={laneHeight} fill={ME_LANE} />}
          {i < rows.length - 1 && <line x1="0" x2={TRACK_WIDTH} y1={top + laneHeight + 1} y2={top + laneHeight + 1} stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeDasharray="14 18" />}
        </g>
      ))}
      <rect
        x={RACE.startX}
        y={ASPHALT_TOP}
        width="4"
        height={asphaltBottom - ASPHALT_TOP}
        fill={signal ? "#2EC4B6" : "#FFFFFF"}
        filter={undefined}
        style={signal ? { filter: "drop-shadow(0 0 6px rgba(46,196,182,.9))" } : undefined}
      />
      <rect x={RACE.finishX} y={ASPHALT_TOP} width="14" height={asphaltBottom - ASPHALT_TOP} fill="url(#largada-checker)" />
      {rows.map(({ lane, top }) => {
        const bottom = top + laneHeight - 2;
        const carX = lane.nose - carW;
        const carY = bottom - carH;
        return (
          <g key={lane.key} opacity={lane.opacity ?? 1}>
            <ellipse cx={carX + (6 + 145) * scale} cy={bottom - 1 * scale} rx={145 * scale} ry={5 * scale} fill="rgba(0,0,0,.18)" />
            {lane.speedLines &&
              [
                [24, -48, 30.4],
                [42, -40, 17],
                [60, -48, 30.4],
              ].map(([ly, lx, lw]) => (
                <rect key={ly} x={carX + lx! * scale} y={carY + (ly! - 1.5) * scale} width={lw! * scale} height={Math.max(2, 3 * scale)} rx="1" fill="#FFFFFF" opacity={0.95} />
              ))}
            <g transform={`translate(${carX},${carY}) scale(${scale})`}>
              <Car colors={lane.colors} avatar={lane.avatar} number={lane.number} />
            </g>
            {lane.smoke &&
              [
                [15.8, 75.3, 9.7],
                [2.4, 68, 7.3],
                [-7.3, 78.4, 4.8],
              ].map(([cx, cy, r]) => <circle key={cx} cx={carX + cx! * scale} cy={carY + cy! * scale} r={r! * scale} fill="rgba(255,255,255,.82)" />)}
          </g>
        );
      })}
      <Piano y={asphaltBottom} offset={8} />
      <rect x="0" y={asphaltBottom + 8} width={TRACK_WIDTH} height={Math.max(0, height - asphaltBottom - 8)} fill="#6CCB6C" />
      {shade > 0 && <rect x="0" y="0" width={TRACK_WIDTH} height={height} fill={`rgba(16,18,32,${shade})`} />}
      {!photo && <Lights on={lights} glow={glow} signal={signal} />}
      {rows.map(({ lane, top }) => lane.chips?.map((chip, i) => <Chip key={`${lane.key}-${i}`} spec={chip} laneTop={top} />))}
    </svg>
  );
}
