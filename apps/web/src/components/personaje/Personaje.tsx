import { createElement as h, type ReactElement } from "react";

/**
 * Character generator, ported 1:1 from the Claude Design prototype
 * (docs/diseno/handoff/components/Personaje.jsx). Species anchors make every
 * accessory fit every species. Kept as createElement calls to match the source.
 */

export type Species = "carpincho" | "hornero" | "pinguino" | "zorro" | "rana" | "llama" | "pelusa" | "nioqui";
export type Face = "happy" | "joy" | "wow" | "wink" | "sleep";
export type Accessory = "boina" | "gorra" | "anteojos" | "bufanda" | "mate" | "corona";
export type GameProp = "letra" | "pregunta" | "rayo" | "bandera" | "tubo";

export interface BodyColors {
  main: string;
  light: string;
  dark: string;
  beak?: string;
}

export interface PersonajeProps {
  sp: Species;
  /** Width in px; height is 1.2×. */
  size?: number;
  face?: Face;
  acc?: readonly Accessory[];
  c?: Partial<BodyColors>;
  hat?: string;
  cap?: string;
  glass?: string;
  scarf?: string;
  /** Stripes over the body (team shirt). */
  shirt?: string;
  prop?: GameProp;
  anim?: "bob" | "float";
  className?: string;
  /** Accessible name; without it the drawing is decorative. */
  title?: string;
  /** Drawn inside another SVG, cropped to `viewBox` (e.g. the face in a helmet's visor). */
  frame?: { x: number; y: number; width: number; height: number; viewBox: string };
}

interface SpeciesSpec {
  c: BodyColors;
  headTop: number;
  eyeY: number;
  eyeDX: number;
  mouthY: number;
  neckY: number;
  beak?: boolean;
  eyeWhite?: boolean;
  mouthW?: number;
  hand?: [number, number];
}

const EYE = "#3C1E00";
const CHEEK = "#FF9EB5";
const TONGUE = "#FF7A8A";

export const SPECIES: Record<Species, SpeciesSpec> = {
  carpincho: { c: { main: "#B9804A", light: "#E8CDA3", dark: "#7D5330" }, headTop: 17, eyeY: 46, eyeDX: 12, mouthY: 62, neckY: 72 },
  hornero: { c: { main: "#D97B3E", light: "#F5D2B5", dark: "#A6522A", beak: "#F0A830" }, headTop: 16, eyeY: 47, eyeDX: 11, mouthY: 58, neckY: 72, beak: true },
  pinguino: { c: { main: "#2F3447", light: "#FFFFFF", dark: "#1E2232", beak: "#F5A623" }, headTop: 16, eyeY: 49, eyeDX: 9, mouthY: 58, neckY: 74, beak: true },
  zorro: { c: { main: "#FF7A3D", light: "#FFE3CF", dark: "#C94F1A" }, headTop: 16, eyeY: 47, eyeDX: 11, mouthY: 62, neckY: 72 },
  rana: { c: { main: "#6CCB6C", light: "#D6F2BF", dark: "#3D9B4B" }, headTop: 13, eyeY: 23, eyeDX: 13, mouthY: 60, neckY: 74, eyeWhite: true, mouthW: 9 },
  llama: { c: { main: "#F1E3C8", light: "#FFF8EA", dark: "#C9A074" }, headTop: 16, eyeY: 33, eyeDX: 8, mouthY: 47, neckY: 64, mouthW: 3 },
  pelusa: { c: { main: "#8B6CFF", light: "#E4DBFF", dark: "#6A4FD6" }, headTop: 18, eyeY: 54, eyeDX: 10, mouthY: 65, neckY: 80, hand: [78, 88] },
  nioqui: { c: { main: "#FFC53D", light: "#FFE9A8", dark: "#E09A1A" }, headTop: 18, eyeY: 50, eyeDX: 10, mouthY: 61, neckY: 76, hand: [79, 80] },
};

export function Personaje(o: PersonajeProps): ReactElement {
  const S = SPECIES[o.sp] ?? SPECIES.nioqui;
  const c: BodyColors = { ...S.c, ...o.c };
  const face = o.face ?? "happy";
  const acc = o.acc ?? [];
  const size = o.size ?? 120;
  // The clip shape depends only on the species (viewBox units), so a shared id is safe.
  const id = `personaje-clip-${o.sp}`;
  const k: ReactElement[] = [];

  const feet = (col: string) => [
    h("ellipse", { key: "f1", cx: 41, cy: 109, rx: 7, ry: 4.5, fill: col }),
    h("ellipse", { key: "f2", cx: 59, cy: 109, rx: 7, ry: 4.5, fill: col }),
  ];
  const arms = (col: string, cy: number, dx: number) => [
    h("ellipse", { key: "ar1", cx: 50 - dx, cy, rx: 6, ry: 10, fill: col, transform: `rotate(22 ${50 - dx} ${cy})` }),
    h("ellipse", { key: "ar2", cx: 50 + dx, cy, rx: 6, ry: 10, fill: col, transform: `rotate(-22 ${50 + dx} ${cy})` }),
  ];
  const torso = (col: string) => h("ellipse", { key: "bd", cx: 50, cy: 89, rx: 22, ry: 19, fill: col });
  const belly = (col: string, cy = 93, rx = 12, ry = 11) => h("ellipse", { key: "bl", cx: 50, cy, rx, ry, fill: col });
  const head = (col: string) => h("circle", { key: "hd", cx: 50, cy: 48, r: 32, fill: col });
  const cheeks = (y: number, dx: number) => [
    h("circle", { key: "ck1", cx: 50 - dx, cy: y, r: 4, fill: CHEEK, opacity: 0.75 }),
    h("circle", { key: "ck2", cx: 50 + dx, cy: y, r: 4, fill: CHEEK, opacity: 0.75 }),
  ];
  let clipShape: ReactElement = h("ellipse", { key: "cs", cx: 50, cy: 89, rx: 22, ry: 19 });
  k.push(h("ellipse", { key: "sh", cx: 50, cy: 116, rx: 24, ry: 3.5, fill: "#23263A", opacity: 0.1 }));

  switch (o.sp) {
    case "carpincho":
      k.push(
        h("circle", { key: "er1", cx: 25, cy: 22, r: 6.5, fill: c.dark }),
        h("circle", { key: "er2", cx: 75, cy: 22, r: 6.5, fill: c.dark }),
        ...feet(c.dark),
        ...arms(c.main, 86, 23),
        torso(c.main),
        belly(c.light),
      );
      k.push(
        h("rect", { key: "hd", x: 17, y: 17, width: 66, height: 62, rx: 28, fill: c.main }),
        h("ellipse", { key: "sn", cx: 50, cy: 62, rx: 15, ry: 10, fill: c.light }),
        h("ellipse", { key: "ns", cx: 50, cy: 57, rx: 3.4, ry: 2.3, fill: EYE }),
        ...cheeks(56, 21),
      );
      break;
    case "hornero":
      k.push(
        h("polygon", { key: "tl", points: "30,98 10,108 30,106", fill: c.dark }),
        ...feet(c.beak ?? c.dark),
        torso(c.main),
        h("ellipse", { key: "wg1", cx: 68, cy: 90, rx: 6, ry: 11, fill: c.dark, transform: "rotate(-18 68 90)" }),
        h("ellipse", { key: "wg2", cx: 32, cy: 90, rx: 6, ry: 11, fill: c.dark, transform: "rotate(18 32 90)" }),
        belly(c.light),
      );
      k.push(
        head(c.main),
        h("ellipse", { key: "fp", cx: 50, cy: 55, rx: 18, ry: 13, fill: c.light }),
        ...cheeks(57, 20),
        h("polygon", { key: "bk", points: "43,57 50,52 57,57 50,62", fill: c.beak }),
        h("polygon", { key: "bk2", points: "43,57 57,57 50,62", fill: c.dark, opacity: 0.35 }),
      );
      break;
    case "pinguino":
      k.push(
        ...feet(c.beak ?? c.dark),
        ...arms(c.main, 86, 24),
        torso(c.main),
        head(c.main),
        h("ellipse", { key: "fp", cx: 50, cy: 52, rx: 21, ry: 18, fill: c.light }),
        belly(c.light, 93, 14, 13),
        ...cheeks(57, 17),
        h("polygon", { key: "bk", points: "45,58 55,58 50,64", fill: c.beak }),
      );
      break;
    case "zorro":
      k.push(
        h("ellipse", { key: "tl", cx: 20, cy: 98, rx: 17, ry: 9, fill: c.main, transform: "rotate(-28 20 98)" }),
        h("ellipse", { key: "tl2", cx: 8, cy: 104, rx: 6.5, ry: 5.5, fill: c.light }),
      );
      k.push(
        h("polygon", { key: "er1", points: "20,34 27,6 44,24", fill: c.main }),
        h("polygon", { key: "er2", points: "80,34 73,6 56,24", fill: c.main }),
        h("polygon", { key: "ei1", points: "25,30 29,14 39,25", fill: c.dark, opacity: 0.55 }),
        h("polygon", { key: "ei2", points: "75,30 71,14 61,25", fill: c.dark, opacity: 0.55 }),
      );
      k.push(
        ...feet(c.dark),
        ...arms(c.main, 86, 23),
        torso(c.main),
        belly(c.light),
        head(c.main),
        h("ellipse", { key: "mz", cx: 50, cy: 61, rx: 14, ry: 10, fill: c.light }),
        h("ellipse", { key: "ns", cx: 50, cy: 56, rx: 3.2, ry: 2.3, fill: EYE }),
        ...cheeks(56, 21),
      );
      break;
    case "rana":
      k.push(
        ...feet(c.dark),
        ...arms(c.main, 86, 23),
        torso(c.main),
        belly(c.light, 92, 14, 12),
        h("circle", { key: "hd", cx: 50, cy: 50, r: 31, fill: c.main }),
        h("circle", { key: "eb1", cx: 37, cy: 23, r: 9.5, fill: c.main }),
        h("circle", { key: "eb2", cx: 63, cy: 23, r: 9.5, fill: c.main }),
        ...cheeks(56, 21),
      );
      break;
    case "llama":
      clipShape = h("ellipse", { key: "cs", cx: 50, cy: 92, rx: 26, ry: 17 });
      k.push(
        h("ellipse", { key: "er1", cx: 39, cy: 15, rx: 4.5, ry: 9, fill: c.main, transform: "rotate(-12 39 15)" }),
        h("ellipse", { key: "er2", cx: 61, cy: 15, rx: 4.5, ry: 9, fill: c.main, transform: "rotate(12 61 15)" }),
        h("ellipse", { key: "ei1", cx: 39, cy: 16, rx: 2, ry: 5, fill: CHEEK, opacity: 0.6, transform: "rotate(-12 39 16)" }),
        h("ellipse", { key: "ei2", cx: 61, cy: 16, rx: 2, ry: 5, fill: CHEEK, opacity: 0.6, transform: "rotate(12 61 16)" }),
      );
      k.push(
        ...feet(c.dark),
        h("ellipse", { key: "bd", cx: 50, cy: 92, rx: 26, ry: 17, fill: c.main }),
        h("rect", { key: "nk", x: 40, y: 40, width: 20, height: 40, rx: 10, fill: c.main }),
        h("ellipse", { key: "hd", cx: 50, cy: 35, rx: 21, ry: 19, fill: c.main }),
        h("ellipse", { key: "mz", cx: 50, cy: 44, rx: 11, ry: 8, fill: c.light }),
        h("ellipse", { key: "ns1", cx: 47, cy: 42, rx: 1.3, ry: 2, fill: EYE }),
        h("ellipse", { key: "ns2", cx: 53, cy: 42, rx: 1.3, ry: 2, fill: EYE }),
        h("circle", { key: "tf", cx: 50, cy: 17, r: 5, fill: c.light }),
        ...cheeks(40, 16),
      );
      if (!o.shirt) {
        k.push(
          h("rect", { key: "bk", x: 30, y: 84, width: 40, height: 12, rx: 4, fill: "#FF6B4A" }),
          h("rect", { key: "bk2", x: 30, y: 88, width: 40, height: 4, fill: "#4F6BFF" }),
        );
      }
      break;
    case "pelusa": {
      const pts: string[] = [];
      for (let i = 0; i < 32; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 16;
        const r = i % 2 ? 33 : 41;
        pts.push(`${(50 + r * Math.cos(a)).toFixed(1)},${(60 + r * Math.sin(a)).toFixed(1)}`);
      }
      clipShape = h("polygon", { key: "cs", points: pts.join(" ") });
      k.push(
        ...feet(c.dark),
        ...arms(c.main, 88, 31),
        h("polygon", { key: "bd", points: pts.join(" "), fill: c.main, stroke: c.main, strokeWidth: 6, strokeLinejoin: "round" }),
        belly(c.light, 81, 12, 10),
        ...cheeks(63, 20),
      );
      break;
    }
    default:
      clipShape = h("rect", { key: "cs", x: 20, y: 18, width: 60, height: 88, rx: 30 });
      k.push(
        ...feet(c.dark),
        ...arms(c.main, 80, 29),
        h("rect", { key: "bd", x: 20, y: 18, width: 60, height: 88, rx: 30, fill: c.main }),
        h("path", { key: "an", d: "M50 19 Q51 8 59 9", fill: "none", stroke: c.dark, strokeWidth: 2.5, strokeLinecap: "round" }),
        h("circle", { key: "an2", cx: 59.5, cy: 9, r: 3, fill: c.dark }),
        belly(c.light, 84, 14, 13),
        ...cheeks(58, 20),
      );
  }

  if (o.shirt) {
    k.push(
      h("defs", { key: "df" }, h("clipPath", { id }, clipShape)),
      h(
        "g",
        { key: "st", clipPath: `url(#${id})` },
        [0, 1, 2].map((i) => h("rect", { key: i, x: 30 + i * 14, y: 68, width: 7, height: 44, fill: o.shirt })),
      ),
    );
  }

  const { eyeY, eyeDX, mouthY } = S;
  const mw = S.mouthW ?? 4;
  const L = 50 - eyeDX;
  const R = 50 + eyeDX;
  if (S.eyeWhite) {
    k.push(
      h("circle", { key: "ew1", cx: L, cy: eyeY, r: 6.2, fill: "#fff" }),
      h("circle", { key: "ew2", cx: R, cy: eyeY, r: 6.2, fill: "#fff" }),
    );
  }
  const dot = (x: number, kk: string, r = 3.6) => [
    h("circle", { key: kk, cx: x, cy: eyeY, r, fill: EYE }),
    h("circle", { key: `${kk}h`, cx: x + 1.2, cy: eyeY - 1.3, r: 1.1, fill: "#fff" }),
  ];
  const arcUp = (x: number, kk: string) =>
    h("path", { key: kk, d: `M${x - 4} ${eyeY + 1.5} Q${x} ${eyeY - 4} ${x + 4} ${eyeY + 1.5}`, fill: "none", stroke: EYE, strokeWidth: 2.4, strokeLinecap: "round" });
  const arcDown = (x: number, kk: string) =>
    h("path", { key: kk, d: `M${x - 4} ${eyeY - 1} Q${x} ${eyeY + 3.5} ${x + 4} ${eyeY - 1}`, fill: "none", stroke: EYE, strokeWidth: 2.4, strokeLinecap: "round" });
  if (face === "joy") k.push(arcUp(L, "e1"), arcUp(R, "e2"));
  else if (face === "sleep") k.push(arcDown(L, "e1"), arcDown(R, "e2"));
  else if (face === "wink") k.push(...dot(L, "e1"), arcUp(R, "e2"));
  else k.push(...dot(L, "e1", face === "wow" ? 4.2 : 3.6), ...dot(R, "e2", face === "wow" ? 4.2 : 3.6));

  const zz = h("text", { key: "z", x: R + 13, y: eyeY - 9, fontSize: 9, fontWeight: 800, fill: "#6C7191", fontFamily: "inherit" }, "z");
  if (!S.beak) {
    if (face === "wow") {
      k.push(
        h("ellipse", { key: "m", cx: 50, cy: mouthY + 2, rx: 3.6, ry: 4.8, fill: EYE }),
        h("ellipse", { key: "m2", cx: 50, cy: mouthY + 4.2, rx: 2.2, ry: 1.8, fill: TONGUE }),
      );
    } else if (face === "joy") {
      k.push(
        h("path", { key: "m", d: `M${50 - mw - 3} ${mouthY - 1} Q50 ${mouthY + 9 + mw * 0.4} ${50 + mw + 3} ${mouthY - 1} Z`, fill: EYE }),
        h("path", { key: "m2", d: `M${50 - mw * 0.8} ${mouthY + 3} Q50 ${mouthY + 6.5} ${50 + mw * 0.8} ${mouthY + 3} Z`, fill: TONGUE }),
      );
    } else if (face === "sleep") {
      k.push(h("circle", { key: "m", cx: 50, cy: mouthY + 1, r: 1.8, fill: EYE }), zz);
    } else {
      k.push(
        h("path", { key: "m", d: `M${50 - mw} ${mouthY} Q50 ${mouthY + 4 + (mw > 5 ? 3 : 0)} ${50 + mw} ${mouthY}`, fill: "none", stroke: EYE, strokeWidth: 2, strokeLinecap: "round" }),
      );
    }
  } else if (face === "joy" || face === "wow") {
    k.push(h("path", { key: "m", d: `M44 ${mouthY + 5} Q50 ${mouthY + 13} 56 ${mouthY + 5} Z`, fill: EYE }));
  } else if (face === "sleep") {
    k.push(zz);
  }

  const T = S.headTop;
  const scarf = o.scarf ?? "#4F6BFF";
  const hand = S.hand ?? [73, 86];
  if (acc.includes("anteojos")) {
    k.push(
      h(
        "g",
        { key: "gl", fill: "rgba(255,255,255,.28)", stroke: o.glass ?? "#E8503A", strokeWidth: 2.2, strokeLinecap: "round" },
        h("circle", { cx: L, cy: eyeY, r: 7.5 }),
        h("circle", { cx: R, cy: eyeY, r: 7.5 }),
        h("path", {
          d: `M${L + 7.5} ${eyeY} L${R - 7.5} ${eyeY} M${L - 7.5} ${eyeY - 1} L${L - 13} ${eyeY - 3} M${R + 7.5} ${eyeY - 1} L${R + 13} ${eyeY - 3}`,
          fill: "none",
        }),
      ),
    );
  }
  if (acc.includes("boina")) {
    k.push(
      h(
        "g",
        { key: "bo" },
        h("ellipse", { cx: 50, cy: T + 4, rx: 26, ry: 7, fill: o.hat ?? "#2F2A3A" }),
        h("circle", { cx: 50, cy: T - 3, r: 2.4, fill: o.hat ?? "#2F2A3A" }),
      ),
    );
  }
  if (acc.includes("gorra")) {
    k.push(
      h(
        "g",
        { key: "go" },
        h("path", { d: `M26 ${T + 9} A24 14 0 0 1 74 ${T + 9} Z`, fill: o.cap ?? "#4F6BFF" }),
        h("rect", { x: 50, y: T + 5, width: 32, height: 6.5, rx: 3.2, fill: o.cap ?? "#4F6BFF" }),
      ),
    );
  }
  if (acc.includes("corona")) {
    k.push(
      h(
        "g",
        { key: "cr" },
        h("polygon", { points: `34,${T + 5} 34,${T - 5} 42,${T + 1} 50,${T - 11} 58,${T + 1} 66,${T - 5} 66,${T + 5}`, fill: "#FFC53D" }),
        h("rect", { x: 34, y: T + 2, width: 32, height: 3.5, fill: "#E09A1A" }),
      ),
    );
  }
  if (acc.includes("bufanda")) {
    const ny = S.neckY;
    k.push(
      h(
        "g",
        { key: "sc" },
        h("rect", { x: 29, y: ny - 4, width: 42, height: 9, rx: 4.5, fill: scarf }),
        h("rect", { x: 58, y: ny + 3, width: 10, height: 16, rx: 4, fill: scarf }),
        h(
          "g",
          { fill: "rgba(255,255,255,.7)" },
          h("rect", { x: 36, y: ny - 4, width: 6, height: 9 }),
          h("rect", { x: 48, y: ny - 4, width: 6, height: 9 }),
          h("rect", { x: 58, y: ny + 10, width: 10, height: 3.5 }),
        ),
      ),
    );
  }
  if (acc.includes("mate")) {
    const [hx, hy] = hand;
    k.push(
      h(
        "g",
        { key: "mt" },
        h("path", { d: `M${hx + 6} ${hy + 2} L${hx + 12} ${hy - 14}`, stroke: "#9AA3AD", strokeWidth: 2.2, strokeLinecap: "round" }),
        h("circle", { cx: hx + 12, cy: hy - 14.5, r: 1.6, fill: "#9AA3AD" }),
        h("ellipse", { cx: hx + 6, cy: hy + 9, rx: 6.5, ry: 8, fill: "#8B5A2B" }),
        h("ellipse", { cx: hx + 6, cy: hy + 2, rx: 4.8, ry: 2, fill: "#4C9A5A" }),
      ),
    );
  }
  if (o.prop === "letra") {
    const lx = 100 - hand[0];
    const ly = hand[1];
    k.push(
      h(
        "g",
        { key: "pl" },
        h("rect", { x: lx - 15, y: ly - 4, width: 17, height: 17, rx: 4, fill: "#fff", stroke: c.dark, strokeWidth: 2 }),
        h("text", { x: lx - 6.5, y: ly + 9, textAnchor: "middle", fontSize: 12, fontWeight: 800, fill: EYE, fontFamily: "inherit" }, "A"),
      ),
    );
  }
  if (o.prop === "pregunta") {
    k.push(h("text", { key: "pq", x: 50, y: T - 6, textAnchor: "middle", fontSize: 26, fontWeight: 800, fill: c.dark, fontFamily: "inherit" }, "?"));
  }
  if (o.prop === "rayo") {
    const [hx, hy] = hand;
    k.push(
      h("polygon", {
        key: "pr",
        points: `${hx + 12},${hy - 22} ${hx + 3},${hy - 4} ${hx + 10},${hy - 4} ${hx + 6},${hy + 12} ${hx + 19},${hy - 8} ${hx + 12},${hy - 8} ${hx + 17},${hy - 22}`,
        fill: "#FFC53D",
      }),
    );
  }

  if (o.prop === "bandera") {
    // Largada's checkered flag, on a pole held in the hand.
    const [hx, hy] = hand;
    k.push(
      h("line", { key: "bp", x1: hx + 7, y1: hy - 38, x2: hx + 5.3, y2: hy + 2, stroke: "#6C7191", strokeWidth: 2.2, strokeLinecap: "round" }),
      h(
        "g",
        { key: "bf", transform: `translate(${hx + 7},${hy - 39})` },
        h("rect", { width: 20, height: 15, fill: "#FFFFFF" }),
        ...[
          [5, 0],
          [15, 0],
          [0, 5],
          [10, 5],
          [5, 10],
          [15, 10],
        ].map(([x, y]) => h("rect", { key: `${x}-${y}`, x, y, width: 5, height: 5, fill: "#23263A" })),
      ),
    );
  }

  if (o.prop === "tubo") {
    // Tubitos: a test tube held up in the hand. Simple shapes, like the other props.
    const [hx, hy] = hand;
    const x = hx + 5;
    const top = hy - 30;
    const w = 10;
    const len = 30;
    k.push(
      h(
        "g",
        { key: "tb", transform: `rotate(14 ${x + w / 2} ${top + len / 2})` },
        h("rect", { x, y: top, width: w, height: len, rx: w / 2, fill: "#FFFFFF" }),
        h("rect", { x, y: top + 12, width: w, height: len - 12, rx: w / 2, fill: "#2EC4B6" }),
        h("rect", { x, y: top + 12, width: w, height: 5, fill: "#2EC4B6" }),
        h("rect", { x: x + 2, y: top + 3, width: 2.2, height: 8, rx: 1.1, fill: "#FFFFFF", opacity: 0.9 }),
        h("rect", { x, y: top, width: w, height: len, rx: w / 2, fill: "none", stroke: "#B8BDD6", strokeWidth: 1.4 }),
        h("rect", { x: x - 1.8, y: top - 2, width: w + 3.6, height: 3.6, rx: 1.8, fill: "#B8BDD6" }),
      ),
    );
  }

  const animation = o.anim === "float" ? "animate-float" : o.anim === "bob" ? "animate-bob" : "";
  if (o.frame) {
    return h("svg", { ...o.frame, preserveAspectRatio: "xMidYMid slice", "aria-hidden": true }, k);
  }
  return h(
    "svg",
    {
      viewBox: "0 0 100 120",
      width: size,
      height: size * 1.2,
      className: ["block overflow-visible", animation, o.className].filter(Boolean).join(" "),
      role: o.title ? "img" : undefined,
      "aria-label": o.title,
      "aria-hidden": o.title ? undefined : true,
    },
    k,
  );
}
