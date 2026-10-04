import { WATER_SORT_COLORS, isTubeDone, type Tube } from "@repo/games";
import { Diamond, Droplet, Heart, Leaf, Moon, Spade, Star, Zap, type LucideIcon } from "lucide-react";

/*
 * Tubitos on screen (docs/diseno/handoff-tubitos/TUBITOS.md §5): the
 * liquids, where each tube goes and how a pour moves. Pure functions, so
 * the measures can be tested without a browser.
 */

export interface Liquid {
  name: string;
  hex: string;
  /** Every color has its icon, always visible: the game reads in grayscale too. */
  Icon: LucideIcon;
  /** The icon's color: white, or ink on yellow and lime. */
  mark: string;
}

const WHITE = "rgba(255,255,255,.92)";
const INK = "rgba(35,38,58,.72)";

const LIQUID_BY_KEY: Record<(typeof WATER_SORT_COLORS)[number], Liquid> = {
  coral: { name: "Coral", hex: "#FF6B4A", Icon: Star, mark: WHITE },
  violeta: { name: "Violeta", hex: "#8B6CFF", Icon: Moon, mark: WHITE },
  turquesa: { name: "Turquesa", hex: "#2EC4B6", Icon: Zap, mark: WHITE },
  amarillo: { name: "Amarillo", hex: "#FFC53D", Icon: Heart, mark: INK },
  rosa: { name: "Rosa", hex: "#FF6FA5", Icon: Diamond, mark: WHITE },
  azul: { name: "Azul", hex: "#4F6BFF", Icon: Droplet, mark: WHITE },
  lima: { name: "Lima", hex: "#9ED64A", Icon: Leaf, mark: INK },
  cafe: { name: "Café", hex: "#B9804A", Icon: Spade, mark: WHITE },
};

/** By the engine's color index. */
export const LIQUIDS: readonly Liquid[] = WATER_SORT_COLORS.map((key) => LIQUID_BY_KEY[key]);

export const liquidOf = (color: number): Liquid => LIQUIDS[color] ?? LIQUIDS[0]!;

/* ───────────── The board ───────────── */

export interface TubeSize {
  /** Tube width. */
  tube: number;
  /** Space between tubes in a row. */
  gap: number;
  /** Height of one layer of liquid. */
  layer: number;
  /** Air above the fourth layer. */
  head: number;
  rowGap: number;
  /** Room above the first row (for the lifted tube, the arrow and the pour) and below the last. */
  top: number;
  bottom: number;
  icon: number;
}

/** The design's measures (§5.1): the phone's for 6, 8 and 10 tubes and the tablet's. */
const PHONE: Record<6 | 8 | 10, TubeSize> = {
  6: { tube: 58, gap: 40, layer: 34, head: 18, rowGap: 44, top: 56, bottom: 14, icon: 15 },
  8: { tube: 52, gap: 28, layer: 33, head: 16, rowGap: 48, top: 52, bottom: 14, icon: 14 },
  10: { tube: 46, gap: 20, layer: 31, head: 14, rowGap: 48, top: 52, bottom: 14, icon: 13 },
};
/** The design draws the tablet with 10 tubes; 6 and 8 keep its layers and get wider tubes. */
const TABLET: Record<6 | 8 | 10, TubeSize> = {
  6: { tube: 92, gap: 70, layer: 60, head: 24, rowGap: 78, top: 70, bottom: 24, icon: 24 },
  8: { tube: 84, gap: 60, layer: 60, head: 24, rowGap: 78, top: 70, bottom: 24, icon: 23 },
  10: { tube: 78, gap: 50, layer: 60, head: 24, rowGap: 78, top: 70, bottom: 24, icon: 22 },
};
const PHONE_WIDTH = 350;
const TABLET_WIDTH = 700;
/** The rack sticks out this much on each side of a row. */
const RACK_OVERHANG = 16;
/** A tube's touch zone starts this far above it. */
const ZONE_ABOVE = 40;
const MIN_LAYER = 22;

/** Up to 5 tubes, one row; more, two rows, the top one with one more if odd. */
export function rowsFor(count: number): number[] {
  if (count <= 5) return [count];
  return [Math.ceil(count / 2), Math.floor(count / 2)];
}

export interface BoardLayout {
  width: number;
  height: number;
  size: TubeSize;
  /** 6 px of lip and body, four layers and the air above them. */
  tubeHeight: number;
  /** Top-left corner of each tube, row by row. */
  tubes: Array<{ x: number; y: number; row: number }>;
  racks: Array<{ x: number; y: number; width: number }>;
  /** The whole column of each tube: its width plus the gap, from 40 px above it to the rack. */
  zones: Array<{ x: number; y: number; width: number; height: number }>;
}

export interface LayoutOptions {
  /** Room across; the board is at most 350 px (700 on a tablet). */
  width: number;
  /** Room down, if it must fit: the layers get lower, down to 22 px. */
  height?: number;
  tablet?: boolean;
  /** Short screens (800 px or less): layers 4 px lower. */
  short?: boolean;
}

const sizeKey = (count: number): 6 | 8 | 10 => (count <= 6 ? 6 : count <= 8 ? 8 : 10);
const tubeHeightOf = (size: TubeSize) => 6 + 4 * size.layer + size.head;

function heightOf(size: TubeSize, rows: number): number {
  return size.top + rows * tubeHeightOf(size) + (rows - 1) * size.rowGap + size.bottom;
}

/** Where everything goes for `count` tubes, in the room there is. */
export function boardLayout(count: number, options: LayoutOptions): BoardLayout {
  const rows = rowsFor(count);
  const base = (options.tablet ? TABLET : PHONE)[sizeKey(count)];
  let size: TubeSize = { ...base, layer: base.layer - (options.short && !options.tablet ? 4 : 0) };
  const width = Math.max(200, Math.min(options.tablet ? TABLET_WIDTH : PHONE_WIDTH, Math.floor(options.width)));

  // Too narrow: first less gap, then thinner tubes.
  const widest = Math.max(...rows);
  const room = width - 2 * RACK_OVERHANG;
  if (widest * size.tube + (widest - 1) * size.gap > room) {
    const gap = Math.max(10, Math.floor((room - widest * size.tube) / Math.max(1, widest - 1)));
    const tube = Math.min(size.tube, Math.floor((room - (widest - 1) * gap) / widest));
    size = { ...size, gap, tube };
  }

  // Too low: lower layers, and the air and the gaps with them.
  if (options.height !== undefined) {
    const start = size;
    for (let layer = start.layer; layer > MIN_LAYER && heightOf(size, rows.length) > options.height; ) {
      layer--;
      const scale = layer / start.layer;
      size = {
        ...start,
        layer,
        head: Math.max(10, Math.round(start.head * scale)),
        rowGap: Math.max(32, Math.round(start.rowGap * scale)),
        top: Math.max(44, Math.round(start.top * scale)),
      };
    }
  }
  size = { ...size, icon: Math.max(10, Math.min(size.icon, size.layer - 12)) };

  const tubeHeight = tubeHeightOf(size);
  const tubes: BoardLayout["tubes"] = [];
  const racks: BoardLayout["racks"] = [];
  rows.forEach((inRow, row) => {
    const rowWidth = inRow * size.tube + (inRow - 1) * size.gap;
    const x0 = (width - rowWidth) / 2;
    const y = size.top + row * (tubeHeight + size.rowGap);
    for (let column = 0; column < inRow; column++) tubes.push({ x: x0 + column * (size.tube + size.gap), y, row });
    racks.push({ x: x0 - RACK_OVERHANG, y: y + tubeHeight - 10, width: rowWidth + 2 * RACK_OVERHANG });
  });

  const zones = tubes.map((tube) => {
    // A row's zones start where the row above ends.
    const above = tube.row === 0 ? 0 : racks[tube.row - 1]!.y + 16;
    const top = Math.max(above, tube.y - ZONE_ABOVE);
    return { x: tube.x - size.gap / 2, y: top, width: size.tube + size.gap, height: tube.y + tubeHeight + 6 - top };
  });

  return { width, height: heightOf(size, rows.length), size, tubeHeight, tubes, racks, zones };
}

/* ───────────── Pouring ───────────── */

export interface PourPose {
  /** Move of the tube's mouth from its place to the pour. */
  dx: number;
  dy: number;
  /** 95° clockwise when it comes from the left of the target, counterclockwise from the right. */
  theta: number;
  side: 1 | -1;
  /** The point it pours from: centered, 12 px above the target's mouth. */
  lipX: number;
  lipY: number;
}

/** The source flies until its lower lip is 12 px above the target's mouth and tips 95° around its mouth (§6.3). */
export function pourPose(layout: BoardLayout, from: number, to: number): PourPose {
  const source = layout.tubes[from]!;
  const target = layout.tubes[to]!;
  const half = layout.size.tube / 2;
  const theta = source.x < target.x ? 95 : -95;
  const side = theta > 0 ? 1 : -1;
  const rad = (theta * Math.PI) / 180;
  const lipX = target.x + half;
  const lipY = target.y - 12;
  const reach = side * half;
  const cx = lipX - reach * Math.cos(rad);
  const cy = lipY - reach * Math.sin(rad);
  return { dx: cx - (source.x + half), dy: cy - source.y, theta, side, lipX, lipY };
}

/** A stretch of one color, `amount` layers (it can be part of one while pouring). */
export interface Run {
  color: number;
  amount: number;
}

/** Layers of the same color in a row, bottom to top, as one block each. */
export function runsOf(tube: Tube): Run[] {
  const runs: Run[] = [];
  for (const color of tube) {
    const last = runs.at(-1);
    if (last && last.color === color) last.amount++;
    else runs.push({ color, amount: 1 });
  }
  return runs;
}

/**
 * The liquid inside a tipped tube stays level (§6.3): drawn in bands along
 * the tube from its mouth, cut with a slanted edge, deeper at the mouth.
 * `inner` is the body's height. Bands come in the runs' order.
 */
export function tippedLiquid(runs: readonly Run[], inner: number, side: 1 | -1): { bands: Array<{ top: number; height: number }>; clip: string } {
  const total = runs.reduce((sum, run) => sum + run.amount, 0);
  const fill = total / 4;
  const length = total > 0 ? inner * Math.min(1, 0.3 + fill * 0.8) : 0;
  const unit = total > 0 ? length / total : 0;
  const bands: Array<{ top: number; height: number }> = runs.map(() => ({ top: 0, height: 0 }));
  let y = 0;
  for (let index = runs.length - 1; index >= 0; index--) {
    const height = runs[index]!.amount * unit;
    bands[index] = { top: Math.round(y), height: height > 0 ? Math.round(height) + 1 : 0 };
    y += height;
  }
  const mouth = Math.round(Math.max(4, 36 - fill * 36));
  const bottom = Math.round(Math.min(92, 86 - fill * 34));
  const depth = inner > 0 ? Math.round((length / inner) * 100) : 0;
  const clip =
    side > 0
      ? `polygon(${mouth}% 0, 100% 0, 100% ${depth}%, ${bottom}% ${depth}%)`
      : `polygon(0 0, ${100 - mouth}% 0, ${100 - bottom}% ${depth}%, 0 ${depth}%)`;
  return { bands, clip };
}

/** How far down from the board's top a tube's liquid reaches, with `layers` in it. */
export function surfaceY(layout: BoardLayout, index: number, layers: number): number {
  const tube = layout.tubes[index]!;
  return tube.y + layout.tubeHeight - layers * layout.size.layer;
}

/* ───────────── Words ───────────── */

/** "Tubo 3, de abajo hacia arriba: coral, amarillo, turquesa", for screen readers. */
export function tubeLabel(index: number, tube: Tube, capacity: number, canReceive = false): string {
  const name = `Tubo ${index + 1}`;
  const receive = canReceive ? ", puede recibir" : "";
  if (tube.length === 0) return `${name}, vacío${receive}`;
  if (isTubeDone(tube, capacity)) return `${name}, listo: ${liquidOf(tube[0]!).name.toLowerCase()}`;
  return `${name}, de abajo hacia arriba: ${tube.map((color) => liquidOf(color).name.toLowerCase()).join(", ")}${receive}`;
}

/** "0:41": minutes and seconds. */
export function clockText(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
