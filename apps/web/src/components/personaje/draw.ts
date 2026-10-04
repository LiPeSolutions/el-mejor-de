import type { AvatarEyes, AvatarFacewear, AvatarHair, AvatarHeld, AvatarMarks, AvatarNeckwear, AvatarOutfit, AvatarPaletteColor } from "@repo/shared";
import { AVATAR_PALETTE, BADGE_BACKGROUND, CHEEK, EYE, INK, TONGUE, mix, type BodyColors } from "./palette";
import { COVERS_HAIR, HAIR, HATS, MARKS, faceNodes, faceWear, heldThing, neckWear, outfit, type Face, type GameProp, type HeadThing } from "./pieces";
import { C, E, G, PG, R, RIGS, rot, type Anchors, type PNode, type Species } from "./rig";

/*
 * Puts a character together: the species' rig, what it wears, the view and
 * the pose, as a plain SVG tree that Personaje renders (and the tests read).
 * Ported from the Claude Design source (fuente/personajes.js, draw()).
 */

export type Pose = "idle" | "wave" | "cheer" | "jump" | "hugCrown" | "sleep";
export type View = "front" | "threeQuarter";
/** Which side of the screen the character looks to, in three-quarter view. */
export type Facing = "left" | "right";
export type Crop = "head" | "bust";

export interface Look {
  sp: Species;
  /** Overrides the species' colors (a palette color, or a mascot's). */
  colors?: Partial<BodyColors>;
  detail?: AvatarPaletteColor | null;
  face?: Face;
  eyes?: AvatarEyes;
  hair?: AvatarHair | null;
  marks?: AvatarMarks | null;
  outfit?: AvatarOutfit | null;
  outfitColor?: AvatarPaletteColor;
  number?: number;
  head?: HeadThing | null;
  /** The crown on the head: it takes the place of whatever is there. */
  crown?: boolean;
  faceWear?: AvatarFacewear | null;
  neck?: AvatarNeckwear | null;
  /** The scarf's color. */
  scarf?: string;
  hand?: AvatarHeld | null;
  prop?: GameProp;
  pose?: Pose;
  view?: View;
  facing?: Facing;
  /** The round avatar: half the body inside a circle of `badgeColor`. */
  badge?: boolean;
  badgeColor?: AvatarPaletteColor;
  /** A square around the head, or the head and shoulders: the editor's cells. Not with `badge`. */
  crop?: Crop;
  /** Adds the pose's motion (the arms going up, the jump landing). */
  animate?: boolean;
}

/** An SVG element with its final attributes. */
export interface SvgNode {
  tag: string;
  attrs: Record<string, string | number>;
  children?: SvgNode[];
  text?: string;
  /** The animation, for the renderer: CSS that can't go in attributes. */
  anim?: PNode["anim"];
}

export interface Drawing {
  /** The defs (clip paths) and everything drawn, in order. */
  children: SvgNode[];
  viewBox: string;
  /** Height over width: 1.2, or 1 for the round avatar and the crops. */
  ratio: number;
}

const TILT: Partial<Record<Pose, number>> = { cheer: -5, jump: -4, wave: 4, sleep: 7, hugCrown: 5 };
const ROTATE = /^rotate\((-?[\d.]+) /;

/** The arm's rotation at rest, from its `rotate(…)`. */
const restAngle = (node: PNode) => Number(ROTATE.exec(node.tr ?? "")?.[1] ?? 0);

/**
 * The character as SVG elements. `ids` names its clip paths: two characters
 * on the same page need different ones.
 */
export function drawCharacter(look: Look, ids: string): Drawing {
  const spec = RIGS[look.sp]();
  const A: Anchors & { hand: [number, number]; body: [number, number, number]; hc: number } = {
    skin: "m",
    hand: [73, 86],
    cheekR: 4,
    nw: 21,
    body: [89, 22, 19],
    ...spec.A,
    hc: spec.A.hc ?? spec.A.T + spec.A.hw,
  };
  const pose = look.pose ?? "idle";
  let face = look.face ?? "happy";
  if (pose === "sleep") face = "sleep";
  else if ((pose === "cheer" || pose === "jump" || pose === "hugCrown") && !look.face) face = "joy";
  // Hugging the crown: it's in the arms, so not on the head, and the hand is busy.
  const hugging = pose === "hugCrown";
  const crown = Boolean(look.crown) && !hugging;
  const handThing = hugging ? null : look.hand;
  const prop = hugging ? undefined : look.prop;
  const up = pose === "cheer" || pose === "jump";
  const animate = Boolean(look.animate) && !look.badge;

  const raise = (n: PNode): PNode => {
    if (!n.arm || (pose === "wave" && n.arm !== "L")) return n;
    const sd = n.arm === "L" ? -1 : 1;
    let raised: PNode;
    let from: string;
    let origin: [number, number];
    if (n.t === "g") {
      const [px, py] = n.piv!;
      raised = { ...n, tr: rot(-sd * 135, px, py) };
      from = `rotate(${sd * 135}deg)`;
      origin = [px, py];
    } else {
      const cx = Number(n.a.cx) + sd * 6;
      const cy = Number(n.a.cy) - 17;
      raised = { ...n, a: { ...n.a, cx, cy }, tr: rot(sd * 30, cx, cy) };
      from = `translate(${-sd * 6}px, 17px) rotate(${restAngle(n) - sd * 30}deg)`;
      origin = [cx, cy];
    }
    // Cheering, the arms go up from where they rest.
    return animate && pose === "cheer" ? G([raised], { arm: n.arm, anim: { name: "swing", from, origin } }) : raised;
  };
  if (up || pose === "wave") {
    spec.body = spec.body.map(raise);
    spec.back = (spec.back ?? []).map(raise);
    if (up) A.hand = [A.hand[0] + 5, A.hand[1] - 30];
  }

  let hug: PNode[] | null = null;
  if (hugging) {
    const cy = A.hugY ?? A.body[0] + 4;
    const huggers = [...spec.body, ...(spec.back ?? [])]
      .filter((n) => n.arm)
      .map((n): PNode => {
        const sd = n.arm === "L" ? -1 : 1;
        if (n.t === "g") return { ...n, tr: rot(sd * 18, n.piv![0], n.piv![1]) };
        const cx = 50 + sd * 16;
        const ay = cy + 3;
        return { ...n, a: { ...n.a, cx, cy: ay, rx: 6, ry: 10 }, tr: rot(sd * 40, cx, ay) };
      });
    spec.body = spec.body.filter((n) => !n.arm);
    spec.back = (spec.back ?? []).filter((n) => !n.arm);
    hug = [
      PG(`32,${cy + 5} 32,${cy - 9} 41,${cy - 1} 50,${cy - 15} 59,${cy - 1} 68,${cy - 9} 68,${cy + 5}`, "#FFC53D"),
      C(32, cy - 9, 1.9, "#FFC53D"),
      C(50, cy - 15, 2.1, "#FFC53D"),
      C(68, cy - 9, 1.9, "#FFC53D"),
      R(31, cy + 3, 38, 9, 3, "#FFC53D"),
      R(31, cy + 3, 38, 2.8, 0, "#E09A1A"),
      C(50, cy - 4, 2.6, "#FF6B4A"),
      C(41, cy + 7.6, 1.7, "#4F6BFF"),
      C(59, cy + 7.6, 1.7, "#3ECF8E"),
      C(50, cy + 7.6, 1.7, "#FF7AA2"),
      ...huggers,
    ];
  }

  const turn = look.view === "threeQuarter" ? (look.facing === "left" ? -1 : 1) : 0;
  if (turn) A.eyeDX -= 1.6;
  const shiftX = (k: readonly (PNode | null | undefined)[], dx: number) => (turn ? G(k, { tr: `translate(${(dx * turn).toFixed(2)} 0)` }) : G(k));

  // Colors: the species' own, the chosen ones over them; the paws, a step darker than the light tone.
  const base = spec.c;
  const c: Record<string, string | undefined> = {
    ...base,
    m: look.colors?.main ?? base.m,
    l: look.colors?.light ?? base.l,
    d: look.colors?.dark ?? base.d,
    b: look.colors?.beak ?? base.b,
  };
  if (look.detail) c.d = AVATAR_PALETTE[look.detail].main;
  c.p = mix(c.l!, c.m!, 0.45);
  const tokens: Record<string, string> = { eye: EYE, cheek: CHEEK, ink: INK, w: "#FFFFFF", tongue: TONGUE };
  const col = (t: string | undefined) => (t === undefined ? undefined : t.startsWith("#") || t.startsWith("rgba") ? t : (c[t] ?? tokens[t] ?? t));

  const fit = look.outfit ? outfit(look.outfit, A, look.outfitColor, look.number) : null;
  const headXf = `translate(50 ${A.hc}) scale(${(A.hw / 32).toFixed(3)}) translate(-50 -48)`;
  const [bcy, brx, bry] = A.body;
  const bodyXf = `translate(50 ${bcy}) scale(${(brx / 22).toFixed(3)} ${(bry / 19).toFixed(3)}) translate(-50 -89)`;
  const accXf = `translate(50 ${A.T}) scale(${(A.hw / 32).toFixed(3)}) translate(-50 -16)`;
  const ns = Math.max(0.6, Math.min(1, (A.nw ?? 21) / 21));
  const neckXf = `translate(50 ${A.neckY}) scale(${ns.toFixed(3)}) translate(-50 ${-A.neckY})`;
  const onHead: HeadThing | null = crown ? "corona" : (look.head ?? null);
  const hideHair = onHead !== null && COVERS_HAIR.includes(onHead) && look.hair !== "flequillo";
  const hair = !hideHair && look.hair ? shiftX([G(HAIR[look.hair](), { tr: accXf })], 2.5) : null;
  const hat = onHead ? shiftX([G(HATS[onHead](), { tr: accXf })], 2.5) : null;
  const faceThing = look.faceWear ? G(faceWear(look.faceWear, A, look.outfitColor)) : null;
  const neck = look.neck ? shiftX([G(neckWear(look.neck, A.neckY, look.scarf), { tr: neckXf })], 2.5) : null;
  // Cheering, what's in the hands goes up with them (the letter tile is in the other hand).
  const rising = (dx: number): Pick<PNode, "anim"> => (animate && pose === "cheer" ? { anim: { name: "swing", from: `translate(${dx}px, 30px)`, origin: [0, 0] } } : {});
  const held = handThing ? G(heldThing(handThing, A), rising(-5)) : null;
  const gameProp = prop ? G(heldThing(prop, A), prop === "pregunta" ? {} : rising(prop === "letra" ? 5 : -5)) : null;
  const marks = look.marks ? MARKS[look.marks] : undefined;

  const bodyN = spec.body.filter((n) => !(fit && n.belly)).map((n) => (turn && n.belly ? { ...n, a: { ...n.a, cx: Number(n.a.cx) + 3 * turn } } : n));
  const frontN = (spec.front ?? []).filter((n) => !(fit && n.belly));
  // The head's soft shadow over the body, and the marks and clothes, cut to the body.
  const bodyOver = G(
    [
      shiftX([...(spec.natBody ?? []), marks ? G(marks.body(), { tr: bodyXf }) : null, fit ? G(fit.body, { tr: bodyXf }) : null], 2.5),
      E(50, A.hb + 1.5, A.hw * 0.52, 3.6, "ink", { op: 0.08 }),
    ],
    { clip: "body" },
  );
  const armNodes = bodyN.filter((n) => n.arm);
  const sleeveList =
    fit && look.outfit === "buzo" && armNodes.length
      ? armNodes.map((n) => recolorArm(n, AVATAR_PALETTE[look.outfitColor ?? "azul"].main))
      : fit
        ? fit.sleeves
        : [];
  const sleeves = sleeveList.length ? G(sleeveList) : null;
  const headOver = G([...(spec.natHead ?? []), marks ? G(marks.head(), { tr: headXf }) : null], { clip: "head" });
  const tilt = TILT[pose] ?? 0;
  const headG = G(
    [
      ...spec.head.filter((n) => !n.mv),
      shiftX(
        spec.head.filter((n) => n.mv),
        5.5,
      ),
      headOver,
      shiftX([...frontN, ...faceNodes(A, face, look.eyes ?? "redondos", look.marks ?? null), faceThing], 5.5),
      hair,
      hat,
    ],
    { tr: tilt ? rot(tilt, 50, A.hb) : undefined },
  );
  const bodyTopN = (spec.bodyTop ?? []).filter((n) => !(fit && n.belly));
  const hugG = hug ? G(hug) : null;
  // Long snouts (oso) hang in front of whatever is worn on the neck.
  const all = [
    ...(spec.back ?? []),
    ...bodyN,
    ...(!fit && spec.deco ? spec.deco : []),
    bodyOver,
    sleeves,
    ...bodyTopN,
    A.neckUnder ? neck : null,
    A.neckUnder ? hugG : null,
    headG,
    A.neckUnder ? null : neck,
    A.neckUnder ? null : hugG,
    held,
    gameProp,
  ].filter((n): n is PNode => Boolean(n));

  const clipIds = { head: `${ids}-head`, body: `${ids}-body` };
  const el = (n: PNode): SvgNode => {
    if (n.t === "g") {
      const attrs: SvgNode["attrs"] = n.raw ? defined(n.a) : {};
      if (n.tr) attrs.transform = n.tr;
      if (n.clip) attrs["clip-path"] = `url(#${clipIds[n.clip]})`;
      if (n.op !== undefined) attrs.opacity = n.op;
      return { tag: "g", attrs, children: (n.k ?? []).map(el), anim: n.anim };
    }
    if (n.t === "text") return { tag: "text", attrs: { ...defined(n.a), fill: col(n.f)! }, text: n.txt };
    const attrs = defined(n.a);
    if (n.tr) attrs.transform = n.tr;
    if (n.f !== undefined) attrs.fill = col(n.f)!;
    if (n.s !== undefined) attrs.stroke = col(n.s)!;
    if (n.sw !== undefined) attrs["stroke-width"] = n.sw;
    if (n.a2) attrs["stroke-linejoin"] = "round";
    if (n.op !== undefined) attrs.opacity = n.op;
    return { tag: n.t, attrs };
  };
  const clipEl = (n: PNode): SvgNode | null => {
    const attrs = defined(n.a);
    if (n.tr) attrs.transform = n.tr;
    if (attrs.fill === "none") return null;
    delete attrs.fill;
    return { tag: n.t, attrs };
  };

  const defs: SvgNode[] = [];
  const kids: SvgNode[] = [];
  let viewBox = "0 0 100 120";
  let ratio = 1.2;
  let bodyAttrs: SvgNode["attrs"] = {};
  if (look.badge) {
    // Half the body in a circle: ears, crests and hats can go out over the top; below and at the sides, it's cut.
    const top = A.T - 12;
    const s = A.neckY + 24 - top;
    const cy = top + s / 2;
    const r = s / 2 - 1;
    kids.push({ tag: "circle", attrs: { cx: 50, cy, r, fill: look.badgeColor ? AVATAR_PALETTE[look.badgeColor].light : BADGE_BACKGROUND } });
    defs.push({
      tag: "clipPath",
      attrs: { id: `${ids}-badge` },
      children: [
        { tag: "circle", attrs: { cx: 50, cy, r } },
        { tag: "rect", attrs: { x: 50 - s, y: top - 30, width: 2 * s, height: s / 2 + 30 } },
      ],
    });
    bodyAttrs = { "clip-path": `url(#${ids}-badge)` };
    viewBox = `${(50 - s / 2).toFixed(1)} ${top.toFixed(1)} ${s.toFixed(1)} ${s.toFixed(1)}`;
    ratio = 1;
  } else if (look.crop) {
    // A square from above the hats down to the chin (or the shoulders), wide enough for the head; no floor.
    const top = A.T - 15;
    const bottom = look.crop === "bust" ? A.neckY + 16 : A.hc + A.hw + 6;
    const s = Math.max(bottom - top, 2 * A.hw + 22);
    const y = top - (s - (bottom - top)) / 2;
    viewBox = `${(50 - s / 2).toFixed(1)} ${y.toFixed(1)} ${s.toFixed(1)} ${s.toFixed(1)}`;
    ratio = 1;
  } else {
    // The floor's shadow; jumping, smaller and lighter, while the rest goes up.
    kids.push(el(pose === "jump" ? E(50, 116, 16, 2.6, "ink", { op: 0.07 }) : E(50, 116, 24, 3.5, "ink", { op: 0.1 })));
    if (pose === "jump") bodyAttrs = { transform: "translate(0 -10)" };
  }
  const layer: SvgNode = { tag: "g", attrs: {}, children: all.map(el), anim: animate && pose === "jump" ? { name: "land" } : undefined };
  kids.push({ tag: "g", attrs: bodyAttrs, children: [layer] });
  const headClip = spec.headClip ?? spec.head.filter((n) => n.t !== "path" && n.a.fill !== "none");
  const bodyClip = spec.bodyClip ?? [E(50, 89, 22, 19)];
  defs.push({ tag: "clipPath", attrs: { id: clipIds.head }, children: headClip.map(clipEl).filter((n): n is SvgNode => n !== null) });
  defs.push({ tag: "clipPath", attrs: { id: clipIds.body }, children: bodyClip.map(clipEl).filter((n): n is SvgNode => n !== null) });
  return { children: [{ tag: "defs", attrs: {}, children: defs }, ...kids], viewBox, ratio };
}

/** The attributes that have a value (a rect without `rx` has none). */
function defined(attrs: PNode["a"]): SvgNode["attrs"] {
  return Object.fromEntries(Object.entries(attrs).filter((entry): entry is [string, string | number] => entry[1] !== undefined));
}

/** A hoodie's sleeve: the arm itself, a hair bigger, in the clothes' color (raised arms stay raised). */
function recolorArm(n: PNode, color: string): PNode {
  if (n.t === "g") return { ...n, k: (n.k ?? []).map((one) => recolorArm(one, color)) };
  return { ...n, f: color, a: { ...n.a, rx: Number(n.a.rx) + 0.3, ry: Number(n.a.ry) + 0.3 } };
}
