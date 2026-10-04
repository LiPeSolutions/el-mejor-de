import type { AvatarEyes, AvatarFacewear, AvatarHair, AvatarHeld, AvatarMarks, AvatarNeckwear, AvatarOutfit, AvatarPaletteColor } from "@repo/shared";
import { AVATAR_PALETTE, INK, luminance } from "./palette";
import { C, E, G, PA, PG, R, RING, ST, TEXT, rot, type Anchors, type PNode } from "./rig";

/*
 * What a character can wear, and its face. Hair and hats are drawn for the
 * standard head (center 50,48 · r 32 · top 16) and scaled to each species'.
 * Ported from the Claude Design source (fuente/personajes.js, "fiel" style).
 */

/** The props of each game's mascot. */
export type GameProp = "letra" | "pregunta" | "rayo" | "bandera" | "tubo";
export type Face = "happy" | "joy" | "wow" | "wink" | "sleep";
/** What a head can have on: the player's headwear, or the crown they earned. */
export type HeadThing = "boina" | "gorra" | "gorro" | "vincha" | "auriculares" | "mono" | "sombrero" | "corona";

export const HAIR: Record<AvatarHair, () => PNode[]> = {
  copete: () => [E(50, 9, 3.4, 8.5, "d"), E(43.5, 11.5, 3, 7, "d", { tr: rot(-30, 43.5, 11.5) }), E(56.5, 11.5, 3, 7, "d", { tr: rot(30, 56.5, 11.5) })],
  jopo: () => [PA("M27 27 Q29 1 58 3 Q75 5 73 18 Q61 9 46 15.5 Q35 20 27 27 Z", "d")],
  rulos: () => [C(37, 18, 6.5, "d"), C(45, 12.5, 7, "d"), C(55, 12.5, 7, "d"), C(63, 18, 6.5, "d"), C(50, 18.5, 6.5, "d")],
  cresta: () => [PG("36,22 39,4 45,16 50,-1 55,16 61,4 64,22", "d")],
  pluma: () => [PA("M51 17 Q45 2 59 -5 Q61 8 51 17 Z", "d"), ST("M51 16 Q52 5 58 -3", "w", 1, { op: 0.6 })],
  flequillo: () => [
    PA("M23 31 Q28 13.5 50 13.5 Q72 13.5 77 31 Q72 25.5 67.5 31 Q63 25 58.5 31 Q54 25 50 31 Q46 25 41.5 31 Q37 25 32.5 31 Q28 25.5 23 31 Z", "d"),
  ],
};

/** Spots and stripes go on the head and the body, cut to each; freckles, mask and patch go with the face. */
export const MARKS: Partial<Record<AvatarMarks, { head: () => PNode[]; body: () => PNode[] }>> = {
  manchas: {
    head: () => [C(29, 38, 5.5, "d"), C(69, 28, 3.6, "d"), C(73, 50, 4.2, "d")],
    body: () => [C(37, 92, 4.6, "d"), C(63, 84, 3.6, "d"), C(59, 102, 3, "d")],
  },
  rayas: {
    head: () => [R(14, 41, 12, 3, 1.5, "d"), R(14, 48, 11, 3, 1.5, "d"), R(74, 41, 12, 3, 1.5, "d"), R(75, 48, 11, 3, 1.5, "d")],
    body: () => [R(25, 81, 12, 3.2, 1.6, "d"), R(25, 89, 11, 3.2, 1.6, "d"), R(63, 81, 12, 3.2, 1.6, "d"), R(64, 89, 11, 3.2, 1.6, "d")],
  },
};

export const HATS: Record<HeadThing, () => PNode[]> = {
  boina: () => [E(50, 20, 26, 7, "#2F2A3A"), C(50, 13, 2.4, "#2F2A3A")],
  gorra: () => [PA("M26 25 A24 14 0 0 1 74 25 Z", "#4F6BFF"), R(50, 21, 32, 6.5, 3.2, "#4F6BFF"), C(50, 11.6, 2, "#3449C9")],
  gorro: () => [
    PA("M22 28 Q22 3 50 3 Q78 3 78 28 Z", "#FF6B4A"),
    R(20, 22, 60, 10, 5, "#FFD1C4"),
    ST("M30 24.5 L30 29.5 M38 24.5 L38 29.5 M46 24.5 L46 29.5 M54 24.5 L54 29.5 M62 24.5 L62 29.5 M70 24.5 L70 29.5", "#F2AE9C", 1.6),
    C(50, 2, 5.5, "#FFFFFF"),
  ],
  vincha: () => [PA("M19 36 Q50 15 81 36 L80 43 Q50 23 20 43 Z", "#FFFFFF"), PA("M19.5 38.4 Q50 18 80.5 38.4 L80.3 40.6 Q50 20.6 19.7 40.6 Z", "#4F6BFF")],
  auriculares: () => [
    ST("M20 46 Q20 9 50 9 Q80 9 80 46", "#23263A", 4.4),
    R(12, 37, 11, 20, 5.5, "#4F6BFF"),
    R(77, 37, 11, 20, 5.5, "#4F6BFF"),
    R(19.5, 40, 3.5, 14, 1.75, "#23263A"),
    R(77, 40, 3.5, 14, 1.75, "#23263A"),
  ],
  mono: () => [PG("66,20 55,12.5 55,27.5", "#FF7AA2"), PG("66,20 77,12.5 77,27.5", "#FF7AA2"), C(66, 20, 3.4, "#D9557F")],
  sombrero: () => [
    E(50, 21, 37, 6.8, "#E9C77B"),
    PA("M33 21.5 Q33 2 50 2 Q67 2 67 21.5 Z", "#E9C77B"),
    R(33, 14.5, 34, 5, 0, "#C94F2E"),
    E(50, 23, 30, 3, "#D4A957", { op: 0.55 }),
  ],
  corona: () => [PG("34,21 34,11 42,17 50,5 58,17 66,11 66,21", "#FFC53D"), R(34, 18, 32, 3.5, 0, "#E09A1A")],
};

/** These hide the hair, except the fringe. */
export const COVERS_HAIR: readonly HeadThing[] = ["boina", "gorra", "gorro", "sombrero", "corona"];

/** Glasses, sunglasses, a band-aid or face paint, around the eyes (`A.eyeDX` already narrowed in three-quarter view). */
export function faceWear(kind: AvatarFacewear, A: Anchors, outfitColor: AvatarPaletteColor | undefined): PNode[] {
  const L = 50 - A.eyeDX;
  const Rx = 50 + A.eyeDX;
  const y = A.eyeY;
  const lr = Math.max(4.6, Math.min(7.5, A.eyeDX * 0.72));
  if (kind === "anteojos") {
    return [
      G(
        [
          C(L, y, lr),
          C(Rx, y, lr),
          { t: "path", a: { d: `M${L + lr} ${y} L${Rx - lr} ${y} M${L - lr} ${y - 1} L${L - lr - 5.5} ${y - 3} M${Rx + lr} ${y - 1} L${Rx + lr + 5.5} ${y - 3}`, fill: "none" } },
        ],
        { raw: true, a: { fill: "rgba(255,255,255,.28)", stroke: "#E8503A", "stroke-width": 2.2, "stroke-linecap": "round" } },
      ),
    ];
  }
  if (kind === "lentes") {
    const lens = (x: number) => R(x - lr - 0.8, y - lr * 0.78, 2 * lr + 1.6, lr * 1.56, lr * 0.62, "#23263A", { op: 0.94 });
    const shine = (x: number) => ST(`M${x - lr + 1.6} ${y - lr * 0.25} L${x - lr * 0.15} ${y - lr * 0.5}`, "#FFFFFF", 1, { op: 0.7 });
    return [lens(L), lens(Rx), ST(`M${L + lr} ${y - 1} L${Rx - lr} ${y - 1}`, "#23263A", 1.8), shine(L), shine(Rx)];
  }
  if (kind === "curita") {
    const cx = 50 + A.cheekDX - 1;
    const cy = A.cheekY - 1;
    return [
      G([R(cx - 6.5, cy - 2.7, 13, 5.4, 2.7, "#F5D2B5"), R(cx - 2, cy - 2.7, 4, 5.4, 0, "#E3B48C"), C(cx - 4.4, cy - 0.9, 0.55, "#E3B48C"), C(cx + 4.4, cy + 0.9, 0.55, "#E3B48C")], {
        tr: rot(-28, cx, cy),
      }),
    ];
  }
  // Face paint, in the clothes' color.
  const pc = AVATAR_PALETTE[outfitColor ?? "azul"].main;
  const stripes = (x: number) => [R(x - 5, y + 6, 10, 2.4, 1.2, pc), R(x - 5, y + 9.2, 10, 2.4, 1.2, "#FFFFFF")];
  return [...stripes(L), ...stripes(Rx)];
}

/** What goes on the neck, at `ny`. */
export function neckWear(kind: AvatarNeckwear, ny: number, scarf = "#4F6BFF"): PNode[] {
  if (kind === "bufanda") {
    return [
      R(29, ny - 4, 42, 9, 4.5, scarf),
      R(58, ny + 3, 10, 16, 4, scarf),
      G([R(36, ny - 4, 6, 9), R(48, ny - 4, 6, 9), R(58, ny + 10, 10, 3.5)], { raw: true, a: { fill: "rgba(255,255,255,.7)" } }),
    ];
  }
  if (kind === "panuelo") {
    return [
      PG(`34,${ny - 3} 66,${ny - 3} 50,${ny + 12}`, "#FF6B4A"),
      R(32, ny - 5.5, 36, 5.5, 2.75, "#FF6B4A"),
      C(45, ny + 1, 1.1, "#FFFFFF", { op: 0.85 }),
      C(55, ny + 1, 1.1, "#FFFFFF", { op: 0.85 }),
      C(50, ny + 6, 1.1, "#FFFFFF", { op: 0.85 }),
    ];
  }
  if (kind === "monito") return [PG(`50,${ny + 1} 40,${ny - 5} 40,${ny + 7}`, "#23263A"), PG(`50,${ny + 1} 60,${ny - 5} 60,${ny + 7}`, "#23263A"), C(50, ny + 1, 2.6, "#4B5070")];
  return [R(30, ny - 2.5, 40, 5.5, 2.75, "#8B6CFF"), C(50, ny + 6.2, 3.9, "#FFC53D"), C(50, ny + 6.2, 1.2, "#D9971A")];
}

const pent = (cx: number, cy: number, r: number) =>
  Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  });

/** What's held in the hand (`A.hand`): the player's, or a mascot's prop. */
export function heldThing(kind: AvatarHeld | GameProp, A: Anchors & { hand: [number, number] }): PNode[] {
  const [hx, hy] = A.hand;
  switch (kind) {
    case "mate":
      return [ST(`M${hx + 6} ${hy + 2} L${hx + 12} ${hy - 14}`, "#9AA3AD", 2.2), C(hx + 12, hy - 14.5, 1.6, "#9AA3AD"), E(hx + 6, hy + 9, 6.5, 8, "#8B5A2B"), E(hx + 6, hy + 2, 4.8, 2, "#4C9A5A")];
    case "pelota": {
      const cx = hx + 9;
      const cy = hy + 5;
      const p = pent(cx, cy, 2.9);
      const spokes = p
        .map(([x, y]) => {
          const dx = x - cx;
          const dy = y - cy;
          const k = 7.6 / 2.9;
          return `M${x.toFixed(2)} ${y.toFixed(2)} L${(cx + dx * k).toFixed(2)} ${(cy + dy * k).toFixed(2)}`;
        })
        .join(" ");
      return [C(cx, cy, 7.8, "#FFFFFF", { s: "#23263A", sw: 1.1 }), PG(p.map((q) => q.map((v) => v.toFixed(2)).join(",")).join(" "), "#23263A"), ST(spokes, "#23263A", 1)];
    }
    case "celu":
      return [R(hx + 3, hy - 11, 9.5, 16.5, 2.4, "#23263A"), R(hx + 4.3, hy - 9.6, 6.9, 12.2, 1.2, "#C9D3FF"), C(hx + 7.75, hy + 3.9, 0.7, "#6C7191")];
    case "termo":
      return [
        R(hx + 3.5, hy - 17, 8.5, 24, 3, "#22A06B"),
        R(hx + 4.6, hy - 20.5, 6.3, 4.6, 1.6, "#9AA3B5"),
        ST(`M${hx + 12} ${hy - 12} Q${hx + 16.5} ${hy - 6} ${hx + 12} ${hy}`, "#1B7F55", 1.8),
        R(hx + 3.5, hy - 6, 8.5, 2.2, 0, "#1B7F55"),
      ];
    case "banderin":
      return [
        ST(`M${hx + 7} ${hy - 34} L${hx + 5.5} ${hy + 3}`, "#6C7191", 2.1),
        PG(`${hx + 7},${hy - 34} ${hx + 26},${hy - 28} ${hx + 7},${hy - 22}`, "#4F6BFF"),
        PG(`${hx + 7},${hy - 30} ${hx + 18},${hy - 28} ${hx + 7},${hy - 26}`, "#FFFFFF"),
      ];
    case "tubo": {
      // Tubitos: a test tube held up.
      const x = hx + 5;
      const top = hy - 30;
      const w = 10;
      const len = 30;
      return [
        G(
          [
            R(x, top, w, len, w / 2, "#FFFFFF"),
            R(x, top + 12, w, len - 12, w / 2, "#2EC4B6"),
            R(x, top + 12, w, 5, 0, "#2EC4B6"),
            R(x + 2, top + 3, 2.2, 8, 1.1, "#FFFFFF", { op: 0.9 }),
            { t: "rect", a: { x, y: top, width: w, height: len, rx: w / 2, fill: "none" }, s: "#B8BDD6", sw: 1.4 },
            R(x - 1.8, top - 2, w + 3.6, 3.6, 1.8, "#B8BDD6"),
          ],
          { tr: rot(14, x + w / 2, top + len / 2) },
        ),
      ];
    }
    case "bandera": {
      // Largada's checkered flag, on a pole.
      const cells = [
        [5, 0],
        [15, 0],
        [0, 5],
        [10, 5],
        [5, 10],
        [15, 10],
      ].map(([x, y]) => R(x!, y!, 5, 5, 0, "#23263A"));
      return [ST(`M${hx + 7} ${hy - 38} L${hx + 5.3} ${hy + 2}`, "#6C7191", 2.2), G([R(0, 0, 20, 15, 0, "#FFFFFF"), ...cells], { tr: `translate(${hx + 7} ${hy - 39})` })];
    }
    case "rayo":
      return [PG(`${hx + 12},${hy - 22} ${hx + 3},${hy - 4} ${hx + 10},${hy - 4} ${hx + 6},${hy + 12} ${hx + 19},${hy - 8} ${hx + 12},${hy - 8} ${hx + 17},${hy - 22}`, "#FFC53D")];
    case "letra": {
      // Diez Letras: a letter tile, in the other hand.
      const lx = 100 - hx;
      const ly = hy;
      return [
        G([
          R(lx - 15, ly - 4, 17, 17, 4, "#FFFFFF", { s: "d", sw: 2 }),
          TEXT({ x: lx - 6.5, y: ly + 9, "text-anchor": "middle", "font-size": 12, "font-weight": 800, "font-family": "inherit" }, "eye", "A"),
        ]),
      ];
    }
    case "pregunta":
      // Cinco Preguntas: a question mark over the head.
      return [TEXT({ x: 50, y: A.T - 6, "text-anchor": "middle", "font-size": 26, "font-weight": 800, "font-family": "inherit" }, "d", "?")];
  }
}

export interface Outfit {
  /** Over the body, cut to it. */
  body: PNode[];
  sleeves: PNode[];
}

/** Clothes in their color: they cover the belly and add short sleeves (the hoodie, whole ones). */
export function outfit(kind: AvatarOutfit, A: Anchors, color: AvatarPaletteColor | undefined, number: number | undefined): Outfit {
  const oc = AVATAR_PALETTE[color ?? "azul"];
  const shoulders = A.arms;
  const caps = (f: string) =>
    shoulders ? [E(50 - shoulders[0] + 1.5, shoulders[1] - 5, 7, 6.5, f), E(50 + shoulders[0] - 1.5, shoulders[1] - 5, 7, 6.5, f)] : [];
  const full = (f: string) =>
    shoulders
      ? [
          E(50 - shoulders[0], shoulders[1], 6.3, 10.3, f, { tr: rot(22, 50 - shoulders[0], shoulders[1]) }),
          E(50 + shoulders[0], shoulders[1], 6.3, 10.3, f, { tr: rot(-22, 50 + shoulders[0], shoulders[1]) }),
        ]
      : [];
  const base = R(0, 64, 100, 56, 0, oc.main);
  if (kind === "remera") return { body: [base, ST("M41 72 Q50 80 59 72", oc.dark, 1.8)], sleeves: caps(oc.main) };
  if (kind === "camiseta") {
    const ink = luminance(oc.main) > 0.62 ? INK : "#FFFFFF";
    const shirtNumber = TEXT({ x: 50, y: 102, "text-anchor": "middle", "font-size": 14, "font-weight": 800, "font-family": "Outfit, system-ui, sans-serif" }, ink, String(number ?? 10));
    return { body: [base, R(0, 64, 100, 3.5, 0, "#FFFFFF", { op: 0.85 }), shirtNumber], sleeves: caps(oc.main) };
  }
  if (kind === "rayada") return { body: [R(0, 64, 100, 56, 0, "#FFFFFF"), R(29, 64, 8, 56, 0, oc.main), R(46, 64, 8, 56, 0, oc.main), R(63, 64, 8, 56, 0, oc.main)], sleeves: caps("#FFFFFF") };
  return { body: [base, R(37, 95, 26, 10, 5, oc.dark), ST("M46 79 L45 89 M54 79 L55 89", "#FFFFFF", 1.4)], sleeves: full(oc.main) };
}

function star(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const rr = i % 2 ? r * 0.38 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

/** Cheeks, eyes, mouth and the marks that go with the face. Asleep, the "z" too. */
export function faceNodes(A: Anchors, face: Face, eyes: AvatarEyes, marks: AvatarMarks | null): PNode[] {
  const out: PNode[] = [];
  const L = 50 - A.eyeDX;
  const Rx = 50 + A.eyeDX;
  const y = A.eyeY;
  const ink = "eye";
  const skin = A.skin ?? "m";
  // Cheeks first, under everything else of the face.
  const cr = A.cheekR ?? 4;
  for (const x of [50 - A.cheekDX, 50 + A.cheekDX]) out.push(E(x, A.cheekY, cr, cr, "cheek", { op: 0.75 }));
  if (marks === "pecas") {
    for (const x of [50 - A.cheekDX, 50 + A.cheekDX]) {
      out.push(C(x - 3, A.cheekY, 1.05, "d", { op: 0.85 }), C(x, A.cheekY - 2.4, 1.05, "d", { op: 0.85 }), C(x + 3, A.cheekY, 1.05, "d", { op: 0.85 }));
    }
  }
  if (marks === "antifaz") out.push(R(L - 8, y - 5.8, 2 * A.eyeDX + 16, 11.6, 5.8, "d"));
  if (marks === "parche") out.push(C(L, y, 7.8, "d"));
  let r = 3.7 * (eyes === "grandes" ? 1.28 : eyes === "brillo" ? 1.12 : 1) * (face === "wow" ? 1.12 : 1);
  if (A.eyeDX < 8) r *= 0.78;
  if (A.eyeScale) r *= A.eyeScale;
  const whites = A.eyeWhite || marks === "antifaz" || marks === "parche";
  const arc = (x: number, up: boolean) =>
    ST(up ? `M${x - 4} ${y + 1.5} Q${x} ${y - 4} ${x + 4} ${y + 1.5}` : `M${x - 4} ${y - 1} Q${x} ${y + 3.5} ${x + 4} ${y - 1}`, ink, 2.4);
  const open = (x: number, side: -1 | 1) => {
    const g: PNode[] = [];
    const white = whites && (A.eyeWhite || marks === "antifaz" || (marks === "parche" && side < 0));
    if (A.eyeWhite) g.push(C(x, y, 6.2, "w"));
    else if (white) g.push(E(x, y, r + 1.7, r + 2.1, "w"));
    if (A.eyeRing) g.push(RING(x, y, r + (white ? 2.8 : 1.7), A.eyeRing, 1.6));
    if (eyes === "almendra") g.push(E(x, y + 0.2, r * 1.2, r * 0.8, ink));
    else g.push(C(x, y, r, ink));
    const hx = x + r * 0.36;
    const hy = y - r * 0.4;
    if (eyes === "brillo") g.push(PG(star(hx, hy, r * 0.6), "w"), C(x - r * 0.38, y + r * 0.42, r * 0.17, "w"));
    else {
      g.push(C(hx, hy, r * (eyes === "grandes" ? 0.36 : 0.3), "w"));
      if (eyes === "grandes") g.push(C(x - r * 0.34, y + r * 0.4, r * 0.15, "w"));
    }
    if (eyes === "dormilon") {
      const rr = white ? r + 2.2 : r + 1.2;
      g.push(PA(`M${x - rr} ${y - 0.2} A${rr} ${rr} 0 0 1 ${x + rr} ${y - 0.2} Z`, skin), ST(`M${x - rr} ${y - 0.2} L${x + rr} ${y - 0.2}`, ink, 1.5));
    }
    if (eyes === "pestanas") {
      g.push(
        ST(
          `M${x + side * r * 0.5} ${y - r * 0.85} L${x + side * (r + 1.7)} ${y - r - 1.7} M${x + side * r * 0.95} ${y - r * 0.3} L${x + side * (r + 2.9)} ${y - r * 0.6} M${x} ${y - r} L${x + side * 0.7} ${y - r - 2.4}`,
          ink,
          1.3,
        ),
      );
    }
    return g;
  };
  if (face === "joy") out.push(arc(L, true), arc(Rx, true));
  else if (face === "sleep") out.push(arc(L, false), arc(Rx, false));
  else if (face === "wink") out.push(...open(L, -1), arc(Rx, true));
  else out.push(...open(L, -1), ...open(Rx, 1));
  const mY = A.mouthY;
  const mw = A.mouthW ?? 4;
  if (!A.noMouth) {
    if (!A.beak) {
      if (face === "wow") out.push(E(50, mY + 2, 3.6, 4.8, ink), E(50, mY + 4.2, 2.2, 1.8, "tongue"));
      else if (face === "joy") {
        out.push(
          PA(`M${50 - mw - 3} ${mY - 1} Q50 ${mY + 9 + mw * 0.4} ${50 + mw + 3} ${mY - 1} Z`, ink),
          PA(`M${50 - mw * 0.8} ${mY + 3} Q50 ${mY + 6.5} ${50 + mw * 0.8} ${mY + 3} Z`, "tongue"),
        );
      } else if (face === "sleep") out.push(C(50, mY + 1, 1.8, ink));
      else out.push(ST(`M${50 - mw} ${mY} Q50 ${mY + 4 + (mw > 5 ? 3 : 0)} ${50 + mw} ${mY}`, ink, 2));
    } else if (face === "joy" || face === "wow") out.push(PA(`M44 ${mY + 5} Q50 ${mY + 13} 56 ${mY + 5} Z`, ink));
  }
  // The sleeping "z", as the first version drew it.
  if (face === "sleep") out.push(TEXT({ x: Rx + 13, y: y - 9, "font-size": 9, "font-weight": 800, "font-family": "inherit" }, "#6C7191", "z"));
  return out;
}
