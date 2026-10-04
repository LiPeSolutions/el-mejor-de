import type { AvatarSpecies } from "@repo/shared";

/*
 * The characters' rigs: each species as a list of plain shapes on the
 * 100 × 120 grid, with the anchors where faces, clothes and accessories go.
 * Ported from the Claude Design source (docs/diseno/handoff-personajes,
 * fuente/personajes.js, "fiel" style only), keeping its numbers as they are.
 */

export type Species = AvatarSpecies;

/** A shape, before its colors are known. */
export interface PNode {
  t: "ellipse" | "circle" | "rect" | "polygon" | "path" | "g" | "text";
  a: Record<string, string | number | undefined>;
  /** Fill and stroke: a hex color, an rgba() or a token (`m`, `l`, `d`, `b`, `x`, `y`, `p`, `eye`, `cheek`, `ink`, `w`, `tongue`). */
  f?: string;
  s?: string;
  sw?: number;
  op?: number;
  tr?: string;
  /** A group's children. */
  k?: PNode[];
  /** A group whose own attributes (`a`) are drawn too, like the glasses' stroke. */
  raw?: boolean;
  /** Cut to the shape of the head or the body. */
  clip?: "head" | "body";
  txt?: string;
  /** Hidden under clothes. */
  belly?: boolean;
  /** An arm or a wing: it moves in the poses. */
  arm?: "L" | "R";
  /** Where a wing group turns (the cóndor). */
  piv?: [number, number];
  /** Moves with the face in three-quarter view (the frog's eyes). */
  mv?: boolean;
  /** Round joins on a filled shape with a stroke (Pelusa). */
  a2?: boolean;
  /** Plays when the drawing animates: an arm swinging up from its rest, or the jump landing. */
  anim?: { name: "swing"; from: string; origin: [number, number] } | { name: "land" };
}

type Options = Partial<Omit<PNode, "t">>;

const N = (t: PNode["t"], a: PNode["a"], o: Options = {}): PNode => ({ t, a, ...o });
export const E = (cx: number, cy: number, rx: number, ry: number, f?: string, o: Options = {}) => N("ellipse", { cx, cy, rx, ry }, { f, ...o });
export const C = (cx: number, cy: number, r: number, f?: string, o: Options = {}) => N("circle", { cx, cy, r }, { f, ...o });
export const R = (x: number, y: number, width: number, height: number, rx?: number, f?: string, o: Options = {}) =>
  N("rect", { x, y, width, height, rx }, { f, ...o });
export const PG = (points: string, f?: string, o: Options = {}) => N("polygon", { points }, { f, ...o });
export const PA = (d: string, f?: string, o: Options = {}) => N("path", { d }, { f, ...o });
/** A stroke with round ends. */
export const ST = (d: string, s: string, sw: number, o: Options = {}) =>
  N("path", { d, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, { s, sw, ...o });
export const RING = (cx: number, cy: number, r: number, s: string, sw: number) => N("circle", { cx, cy, r, fill: "none" }, { s, sw });
export const G = (k: readonly (PNode | null | undefined | false)[], o: Options = {}) =>
  N("g", {}, { k: k.filter((one): one is PNode => Boolean(one)), ...o });
export const TEXT = (a: PNode["a"], f: string, txt: string) => N("text", a, { f, txt });
export const rot = (d: number, x: number, y: number) => `rotate(${d} ${x} ${y})`;

/** Where things go on each species (see the table in PERSONAJES.md §4.2). */
export interface Anchors {
  /** Top of the head: where hats and hair sit. */
  T: number;
  /** Half the head's width, and its center (the standard head is r 32 at 50,48). */
  hw: number;
  hc?: number;
  eyeY: number;
  eyeDX: number;
  /** Fine-tunes the eyes' size. */
  eyeScale?: number;
  mouthY: number;
  mouthW?: number;
  /** The mouth goes on the beak. */
  beak?: 1;
  noMouth?: 1;
  cheekY: number;
  cheekDX: number;
  cheekR?: number;
  neckY: number;
  /** The neck's width, to scale what goes on it. */
  nw?: number;
  /** The head's base: where it tilts in the poses. */
  hb: number;
  /** The body's ellipse: [cy, rx, ry]. */
  body?: [number, number, number];
  hand?: [number, number];
  /** The shoulders: [dx, cy], for sleeves. */
  arms?: [number, number];
  /** The skin around the eyes (for the sleepy lid). */
  skin?: string;
  eyeWhite?: 1;
  /** A ring around each eye, in this color token (tero). */
  eyeRing?: string;
  /** The snout hangs in front of the neck (oso). */
  neckUnder?: 1;
  /** Where the hugged crown goes. */
  hugY?: number;
}

export interface Rig {
  /** The species' own colors: main, light, dark, beak and extras. */
  c: { m: string; l: string; d: string; b?: string; x?: string; y?: string };
  A: Anchors;
  /** Behind everything: tails, back ears, the cóndor's wings. */
  back?: PNode[];
  body: PNode[];
  /** The species' own marks on the body, cut to it. */
  natBody?: PNode[];
  /** Hidden under clothes (the llama's blanket). */
  deco?: PNode[];
  /** Long necks and the cóndor's ruff. */
  bodyTop?: PNode[];
  head: PNode[];
  /** The species' own marks on the head, cut to it. */
  natHead?: PNode[];
  /** Snout, beak, front belly. */
  front?: PNode[];
  headClip?: PNode[];
  bodyClip?: PNode[];
}

const feet = (f: string) => [E(41, 109, 7, 4.5, f), E(59, 109, 7, 4.5, f)];
const arms = (f: string, cy: number, dx: number) => [
  E(50 - dx, cy, 6, 10, f, { arm: "L", tr: rot(22, 50 - dx, cy) }),
  E(50 + dx, cy, 6, 10, f, { arm: "R", tr: rot(-22, 50 + dx, cy) }),
];
const torso = () => E(50, 89, 22, 19, "m");
const belly = (f = "l", cy = 93, rx = 12, ry = 11) => E(50, cy, rx, ry, f, { belly: true });
const headC = () => C(50, 48, 32, "m");
const wing = (x: number, f: string, d: number) => E(x, 90, 6, 11, f, { arm: x < 50 ? "L" : "R", tr: rot(d, x, 90) });

function pelusa(): Rig {
  const pts: string[] = [];
  for (let i = 0; i < 32; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 16;
    const r = i % 2 ? 33 : 41;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(60 + r * Math.sin(a)).toFixed(1)}`);
  }
  const p = pts.join(" ");
  return {
    c: { m: "#8B6CFF", l: "#E4DBFF", d: "#6A4FD6" },
    A: { T: 19, hw: 38, hc: 57, eyeY: 54, eyeDX: 10, mouthY: 65, neckY: 80, hb: 98, cheekY: 63, cheekDX: 20, hugY: 90, body: [62, 40, 38], hand: [78, 88], arms: [31, 88] },
    body: [...feet("d"), ...arms("m", 88, 31)],
    head: [PG(p, "m", { s: "m", sw: 6, a2: true })],
    front: [E(50, 81, 12, 10, "l", { belly: true })],
    headClip: [PG(p)],
    bodyClip: [PG(p)],
  };
}

/** Each species' rig, built fresh on every call (the poses move its pieces). */
export const RIGS: Record<Species, () => Rig> = {
  carpincho: () => ({
    c: { m: "#B9804A", l: "#E8CDA3", d: "#7D5330" },
    A: { T: 17, hw: 33, hc: 48, eyeY: 46, eyeDX: 12, mouthY: 62, neckY: 72, hb: 79, cheekY: 56, cheekDX: 21, arms: [23, 86] },
    back: [C(25, 22, 6.5, "d"), C(75, 22, 6.5, "d")],
    body: [...feet("d"), ...arms("m", 86, 23), torso(), belly()],
    head: [R(17, 17, 66, 62, 28, "m")],
    front: [E(50, 62, 15, 10, "l"), E(50, 57, 3.6, 2.4, "eye")],
  }),
  hornero: () => ({
    c: { m: "#D97B3E", l: "#F5D2B5", d: "#A6522A", b: "#F0A830" },
    A: { T: 16, hw: 32, eyeY: 47, eyeDX: 11, mouthY: 58, neckY: 72, hb: 80, cheekY: 57, cheekDX: 20, beak: 1, skin: "l", arms: [18, 90] },
    back: [PG("38,94 9,107 40,104", "d")],
    body: [...feet("b"), torso(), wing(68, "d", -18), wing(32, "d", 18), belly()],
    head: [headC()],
    front: [E(50, 55, 18, 13, "l"), PG("43,57 50,52 57,57 50,62", "b"), PG("43,57 57,57 50,62", "d", { op: 0.35 })],
  }),
  pinguino: () => ({
    c: { m: "#2F3447", l: "#FFFFFF", d: "#1E2232", b: "#F5A623" },
    A: { T: 16, hw: 32, eyeY: 49, eyeDX: 9, mouthY: 58, neckY: 74, hb: 80, cheekY: 57, cheekDX: 17, beak: 1, skin: "l", arms: [24, 86] },
    body: [...feet("b"), ...arms("m", 86, 24), torso(), belly("l", 93, 14, 13)],
    head: [headC()],
    front: [E(50, 52, 21, 18, "l"), PG("45,58 55,58 50,64", "b")],
  }),
  zorro: () => ({
    c: { m: "#FF7A3D", l: "#FFE3CF", d: "#C94F1A" },
    A: { T: 16, hw: 32, eyeY: 47, eyeDX: 11, mouthY: 62, neckY: 72, hb: 80, cheekY: 56, cheekDX: 21, arms: [23, 86] },
    back: [
      E(20, 98, 17, 9, "m", { tr: rot(-28, 20, 98) }),
      E(8, 104, 6.5, 5.5, "l"),
      PG("20,34 27,6 44,24", "m"),
      PG("80,34 73,6 56,24", "m"),
      PG("25,30 29,14 39,25", "d", { op: 0.55 }),
      PG("75,30 71,14 61,25", "d", { op: 0.55 }),
    ],
    body: [...feet("d"), ...arms("m", 86, 23), torso(), belly()],
    head: [headC()],
    front: [E(50, 61, 14, 10, "l"), E(50, 56, 3.2, 2.3, "eye")],
  }),
  rana: () => ({
    c: { m: "#6CCB6C", l: "#D6F2BF", d: "#3D9B4B" },
    A: { T: 13, hw: 31, hc: 50, eyeY: 23, eyeDX: 13, mouthY: 60, mouthW: 9, neckY: 74, hb: 81, cheekY: 56, cheekDX: 21, eyeWhite: 1, arms: [23, 86] },
    body: [...feet("d"), ...arms("m", 86, 23), torso(), belly("l", 92, 14, 12)],
    head: [C(50, 50, 31, "m"), C(37, 23, 9.5, "m", { mv: true }), C(63, 23, 9.5, "m", { mv: true })],
  }),
  llama: () => ({
    c: { m: "#F1E3C8", l: "#FFF8EA", d: "#C9A074" },
    A: { T: 16, hw: 21, hc: 35, eyeY: 33, eyeDX: 8, mouthY: 47, mouthW: 3, neckY: 62, nw: 10, hb: 54, cheekY: 40, cheekDX: 16, cheekR: 3.4, hugY: 101, body: [92, 26, 17], hand: [74, 88] },
    back: [
      E(39, 15, 4.5, 9, "m", { tr: rot(-12, 39, 15) }),
      E(61, 15, 4.5, 9, "m", { tr: rot(12, 61, 15) }),
      E(39, 16, 2, 5, "cheek", { op: 0.6, tr: rot(-12, 39, 16) }),
      E(61, 16, 2, 5, "cheek", { op: 0.6, tr: rot(12, 61, 16) }),
    ],
    body: [...feet("d"), E(50, 92, 26, 17, "m")],
    deco: [R(30, 84, 40, 12, 4, "#FF6B4A"), R(30, 88, 40, 4, 0, "#4F6BFF")],
    bodyTop: [R(40, 40, 20, 40, 10, "m")],
    head: [E(50, 35, 21, 19, "m")],
    front: [E(50, 44, 11, 8, "l"), E(47, 42, 1.3, 2, "eye"), E(53, 42, 1.3, 2, "eye"), C(50, 17, 5, "l")],
    bodyClip: [E(50, 92, 26, 17)],
  }),
  pelusa,
  nioqui: () => ({
    c: { m: "#FFC53D", l: "#FFE9A8", d: "#E09A1A" },
    A: { T: 18, hw: 30, eyeY: 50, eyeDX: 10, mouthY: 61, neckY: 76, hb: 106, cheekY: 58, cheekDX: 20, hugY: 88, body: [76, 30, 30], hand: [79, 80], arms: [29, 80] },
    body: [...feet("d"), ...arms("m", 80, 29)],
    head: [R(20, 18, 60, 88, 30, "m"), ST("M50 19 Q51 8 59 9", "d", 2.5), C(59.5, 9, 3, "d")],
    front: [E(50, 84, 14, 13, "l", { belly: true })],
    headClip: [R(20, 18, 60, 88, 30)],
    bodyClip: [R(20, 18, 60, 88, 30)],
  }),
  yaguarete: () => ({
    c: { m: "#F0A93B", l: "#FFF1D9", d: "#6B4A1E", x: "#B5654A" },
    A: { T: 16, hw: 32, eyeY: 47, eyeDX: 11, mouthY: 63, neckY: 74, hb: 80, cheekY: 57, cheekDX: 22, arms: [23, 86] },
    back: [
      ST("M60 102 Q92 106 88 80", "m", 7),
      ST("M83 94.2 L87.8 97.8", "d", 2.2),
      ST("M85.2 88.7 L91.1 89.7", "d", 2.2),
      C(26, 25, 9, "m"),
      C(74, 25, 9, "m"),
      C(26, 26, 4.6, "l"),
      C(74, 26, 4.6, "l"),
    ],
    body: [...feet("p"), ...arms("m", 86, 23), torso(), belly()],
    natBody: [
      C(31, 84, 1.6, "d"),
      C(34, 81, 1.6, "d"),
      C(35.5, 85.5, 1.6, "d"),
      C(68.5, 92, 1.6, "d"),
      C(65.5, 89, 1.6, "d"),
      C(64.5, 93.5, 1.6, "d"),
      C(33, 98, 1.4, "d"),
      C(67, 101, 1.4, "d"),
    ],
    head: [headC()],
    natHead: [C(37, 25, 2.6, "d"), C(50, 20.5, 2.2, "d"), C(63, 25, 2.6, "d"), C(27, 42, 2.2, "d"), C(73, 42, 2.2, "d"), C(30, 33, 1.6, "d"), C(70, 33, 1.6, "d")],
    front: [E(44, 62, 8, 6, "l"), E(56, 62, 8, 6, "l"), E(50, 67, 6, 4, "l"), PG("45.5,55.5 54.5,55.5 50,60", "x")],
  }),
  tero: () => ({
    c: { m: "#B9C2CC", l: "#FFFFFF", d: "#2F3447", b: "#FF8A6E" },
    A: { T: 16, hw: 32, eyeY: 46, eyeDX: 11, mouthY: 57, neckY: 74, hb: 80, cheekY: 56, cheekDX: 20, beak: 1, eyeRing: "b", arms: [18, 90] },
    back: [ST("M58 19 Q74 2 88 7", "d", 3.6), PG("40,95 11,104 40,105", "d")],
    body: [...feet("b"), torso(), wing(68, "d", -18), wing(32, "d", 18), belly()],
    head: [headC()],
    natHead: [R(48, 16, 4, 17, 2, "d")],
    front: [E(50, 80, 15, 5.5, "d", { belly: true }), PG("45,56 55,56 50,63", "b"), PG("48.2,61 51.8,61 50,63", "d")],
  }),
  mulita: () => ({
    c: { m: "#B98A6A", l: "#F0DCC8", d: "#7E5A44", x: "#E8A9A0" },
    A: { T: 21, hw: 29, hc: 50, eyeY: 53, eyeDX: 12, eyeScale: 0.82, mouthY: 76, neckY: 78, hb: 79, cheekY: 62, cheekDX: 19, skin: "l", noMouth: 1, arms: [23, 88] },
    back: [
      E(33, 20, 6, 11, "m", { tr: rot(-15, 33, 20) }),
      E(67, 20, 6, 11, "m", { tr: rot(15, 67, 20) }),
      E(33, 21, 3, 7, "x", { tr: rot(-15, 33, 21) }),
      E(67, 21, 3, 7, "x", { tr: rot(15, 67, 21) }),
      PG("60,96 89,111 58,105", "d"),
    ],
    body: [...feet("d"), ...arms("l", 88, 23), torso(), belly("l", 104, 10, 5)],
    natBody: [ST("M36 73 Q32 89 36 106", "d", 2), ST("M50 71 L50 108", "d", 2), ST("M64 73 Q68 89 64 106", "d", 2)],
    head: [C(50, 50, 29, "l"), PA("M21 49 A29 29 0 0 1 79 49 Q50 41 21 49 Z", "m")],
    natHead: [ST("M37 25 Q35 35 37 45", "d", 1.8), ST("M50 22 L50 42", "d", 1.8), ST("M63 25 Q65 35 63 45", "d", 1.8)],
    front: [PA("M42.5 58 Q50 53.5 57.5 58 L53.6 75.5 Q50 79 46.4 75.5 Z", "m", { op: 0.45 }), C(50, 75.2, 2.7, "eye")],
    headClip: [C(50, 50, 29)],
  }),
  condor: () => ({
    c: { m: "#2F3447", l: "#FFFFFF", d: "#1E2232", b: "#EDE6D6", x: "#C77B6B", y: "#8C3B3B" },
    A: { T: 20, hw: 27, hc: 47, eyeY: 45, eyeDX: 10, mouthY: 56, neckY: 73, hb: 74, cheekY: 53, cheekDX: 17, beak: 1, skin: "x", hand: [76, 88], arms: [27, 86] },
    back: [
      G([E(23, 86, 11, 19, "m", { tr: rot(18, 23, 86) }), E(24, 91, 5, 11, "#DCE0EE", { tr: rot(18, 24, 91) })], { arm: "L", piv: [31, 72] }),
      G([E(77, 86, 11, 19, "m", { tr: rot(-18, 77, 86) }), E(76, 91, 5, 11, "#DCE0EE", { tr: rot(-18, 76, 91) })], { arm: "R", piv: [69, 72] }),
      E(50, 22, 5, 7, "y"),
    ],
    body: [...feet("#9AA3AD"), torso()],
    bodyTop: [C(31, 73, 6.5, "l"), C(40, 76.5, 6.5, "l"), C(50, 77.5, 6.5, "l"), C(60, 76.5, 6.5, "l"), C(69, 73, 6.5, "l")],
    head: [C(50, 47, 27, "x")],
    front: [PG("44,55 56,55 53,64 50,66 47,64", "b"), PG("47.6,63 52.4,63 50,66", "d")],
  }),
  nandu: () => ({
    c: { m: "#B3A595", l: "#E6DED3", d: "#776A5C", b: "#D9B38C" },
    A: { T: 18, hw: 16, hc: 34, eyeY: 32, eyeDX: 6.5, mouthY: 44, neckY: 64, nw: 7, hb: 50, cheekY: 39, cheekDX: 11, cheekR: 2.6, beak: 1, noMouth: 1, body: [88, 27, 17], hand: [76, 88], arms: [23, 88] },
    body: [
      R(40.5, 98, 4.5, 10, 2, "b"),
      R(55, 98, 4.5, 10, 2, "b"),
      E(41, 109, 6, 3.6, "b"),
      E(59, 109, 6, 3.6, "b"),
      E(26, 88, 7, 12, "d", { arm: "L", tr: rot(25, 26, 88) }),
      E(74, 88, 7, 12, "d", { arm: "R", tr: rot(-25, 74, 88) }),
      E(50, 88, 27, 17, "m"),
    ],
    natBody: [ST("M28 90 Q34 96 40 90 Q46 96 52 90 Q58 96 64 90 Q69 95 73 90", "l", 1.8, { op: 0.7 })],
    bodyTop: [R(43, 40, 14, 42, 7, "m"), E(50, 72, 8, 4, "d", { belly: true })],
    head: [C(50, 34, 16, "m")],
    front: [E(50, 42.5, 7, 3.2, "b")],
    bodyClip: [E(50, 88, 27, 17)],
  }),
  oso: () => ({
    c: { m: "#8B7A6A", l: "#D9CDBF", d: "#2F3447", x: "#FFFFFF" },
    A: { T: 21, hw: 25, hc: 45, eyeY: 41, eyeDX: 11, mouthY: 0, neckY: 72, hb: 69, cheekY: 49, cheekDX: 17, noMouth: 1, neckUnder: 1, arms: [23, 86] },
    back: [E(20, 93, 12, 18, "m", { tr: rot(-35, 20, 93) }), C(30, 28, 5.5, "m"), C(70, 28, 5.5, "m"), C(30, 28.5, 2.8, "l"), C(70, 28.5, 2.8, "l")],
    body: [...feet("d"), ...arms("m", 86, 23), torso(), belly("l", 97, 11, 8)],
    natBody: [PG("27,83 37,71 77,94 69,105", "x"), PG("31,81 37,74 74,95 69,101", "d")],
    head: [E(50, 45, 25, 24, "m")],
    front: [PA("M43 52 L57 52 L54 81 Q50 86 46 81 Z", "m"), E(50, 82.5, 3.4, 2.4, "eye")],
  }),
  vizcacha: () => ({
    c: { m: "#9C958C", l: "#EDE9E3", d: "#2F3447", x: "#D98C8C" },
    A: { T: 18, hw: 32, hc: 48, eyeY: 43, eyeDX: 12, mouthY: 63, neckY: 74, hb: 80, cheekY: 57, cheekDX: 23, arms: [23, 86] },
    back: [
      E(33, 17, 7, 13, "m", { tr: rot(-14, 33, 17) }),
      E(67, 17, 7, 13, "m", { tr: rot(14, 67, 17) }),
      E(33, 18, 3.6, 8, "#E3C4BC", { tr: rot(-14, 33, 18) }),
      E(67, 18, 3.6, 8, "#E3C4BC", { tr: rot(14, 67, 18) }),
    ],
    body: [...feet("p"), ...arms("m", 86, 23), torso(), belly()],
    head: [headC()],
    natHead: [R(16, 49, 68, 6.5, 3.2, "d")],
    front: [
      E(38, 60, 11, 7.5, "l"),
      E(62, 60, 11, 7.5, "l"),
      PG("47.5,58 52.5,58 50,61", "x"),
      ST("M38 61 L21 59 M38 64 L21 65 M62 61 L79 59 M62 64 L79 65", "d", 0.9),
    ],
  }),
  perro: () => ({
    c: { m: "#C98C55", l: "#F3DEC8", d: "#8A5A33" },
    A: { T: 16, hw: 32, eyeY: 45, eyeDX: 11, mouthY: 64, neckY: 74, hb: 80, cheekY: 57, cheekDX: 19, arms: [23, 86] },
    back: [ST("M60 102 Q81 103 86 89", "m", 7.5)],
    body: [...feet("p"), ...arms("m", 86, 23), torso(), belly()],
    head: [headC()],
    front: [
      E(50, 62, 15, 11, "l"),
      E(50, 56, 4.6, 3.3, "eye"),
      E(20, 47, 8.5, 16, "d", { tr: rot(16, 20, 47) }),
      E(80, 47, 8.5, 16, "d", { tr: rot(-16, 80, 47) }),
    ],
  }),
  gato: () => ({
    c: { m: "#8D96AB", l: "#E9ECF2", d: "#5E6680", x: "#F2B8C0" },
    A: { T: 16, hw: 32, eyeY: 47, eyeDX: 11, mouthY: 62, neckY: 74, hb: 80, cheekY: 57, cheekDX: 21, arms: [23, 86] },
    back: [ST("M60 103 Q93 107 88 80", "m", 7), PG("21,37 25,8 45,23", "m"), PG("79,37 75,8 55,23", "m"), PG("26,31 27.5,15.5 38,24", "x"), PG("74,31 72.5,15.5 62,24", "x")],
    body: [...feet("p"), ...arms("m", 86, 23), torso(), belly()],
    head: [headC()],
    natHead: [R(48.8, 17, 2.4, 10, 1.2, "d"), R(42, 19.5, 2.4, 7.5, 1.2, "d"), R(55.6, 19.5, 2.4, 7.5, 1.2, "d")],
    front: [
      E(44.5, 61, 7, 5.5, "l"),
      E(55.5, 61, 7, 5.5, "l"),
      PG("47,56.5 53,56.5 50,59.5", "x"),
      ST("M36 60 L19 57 M36 63 L19 64 M64 60 L81 57 M64 63 L81 64", "d", 0.9),
    ],
  }),
};

/** Each species' own main color, for the swatches. */
export const SPECIES_MAIN = Object.fromEntries(Object.entries(RIGS).map(([species, rig]) => [species, rig().c.m])) as Record<Species, string>;
