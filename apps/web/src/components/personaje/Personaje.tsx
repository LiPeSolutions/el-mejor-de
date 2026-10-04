import type { AvatarEyes, AvatarFacewear, AvatarHair, AvatarHeadwear, AvatarHeld, AvatarMarks, AvatarNeckwear, AvatarOutfit, AvatarPaletteColor } from "@repo/shared";
import { createElement as h, useId, type CSSProperties, type ReactElement } from "react";
import { drawCharacter, type Crop, type Facing, type Look, type Pose, type SvgNode, type View } from "./draw";
import type { BodyColors } from "./palette";
import type { Face, GameProp } from "./pieces";
import { RIGS, type Species } from "./rig";

/**
 * A character: a player's or a game's mascot, drawn in SVG from its species'
 * rig (characters 2.0, docs/diseno/handoff-personajes). It can look to one
 * side, take a pose or go in a round badge.
 */

export type { BodyColors } from "./palette";
export type { Face, GameProp } from "./pieces";
export type { Crop, Facing, Pose, View } from "./draw";
export type { Species } from "./rig";
/** The first version's accessories, and the crown: each one goes to its zone. */
export type Accessory = "boina" | "gorra" | "anteojos" | "bufanda" | "mate" | "corona";

export interface PersonajeProps {
  sp: Species;
  /** Width in px; the height is 1.2× (1× in a badge or a crop). */
  size?: number;
  face?: Face;
  /** First-version accessories; the zone props below win over them. */
  acc?: readonly Accessory[];
  c?: Partial<BodyColors>;
  /** The scarf's color. */
  scarf?: string;
  prop?: GameProp;
  anim?: "bob" | "float";
  className?: string;
  /** Accessible name; without it the drawing is decorative. */
  title?: string;
  /** Drawn inside another SVG, cropped to `viewBox` (e.g. the face in a helmet's visor). */
  frame?: { x: number; y: number; width: number; height: number; viewBox: string };
  /** The second color, for ears, wings, marks and hair. */
  detail?: AvatarPaletteColor | null;
  eyes?: AvatarEyes;
  hair?: AvatarHair | null;
  marks?: AvatarMarks | null;
  outfit?: AvatarOutfit | null;
  outfitColor?: AvatarPaletteColor;
  /** The shirt's number (on the "camiseta"). */
  number?: number;
  head?: AvatarHeadwear | null;
  /** What's worn on the face (`face` is the expression). */
  faceWear?: AvatarFacewear | null;
  neck?: AvatarNeckwear | null;
  hand?: AvatarHeld | null;
  /** The crown on the head, for whoever has it. */
  crown?: boolean;
  pose?: Pose;
  view?: View;
  /** Which side of the screen it looks to, in three-quarter view. */
  facing?: Facing;
  /** The round avatar, for rows and chips. */
  badge?: boolean;
  badgeColor?: AvatarPaletteColor;
  /** Only the head ("head") or the head and shoulders ("bust"), in a square: the editor's cells. */
  crop?: Crop;
}

/** Each species' own colors and eye line (the car's visor crops around the eyes). */
export const SPECIES = Object.fromEntries(
  Object.entries(RIGS).map(([species, rig]) => {
    const { c, A } = rig();
    return [species, { c: { main: c.m, light: c.l, dark: c.d, beak: c.b }, eyeY: A.eyeY }];
  }),
) as Record<Species, { c: BodyColors; eyeY: number }>;

const ZONE = { boina: "head", gorra: "head", anteojos: "faceWear", bufanda: "neck", mate: "hand", corona: "crown" } as const;

/** What's on: the zone props, else the first version's accessories in their zone. */
function wear(props: PersonajeProps) {
  const fromAcc: { head?: AvatarHeadwear; faceWear?: AvatarFacewear; neck?: AvatarNeckwear; hand?: AvatarHeld; crown?: boolean } = {};
  for (const one of props.acc ?? []) {
    const zone = ZONE[one];
    if (zone === "crown") fromAcc.crown = true;
    else if (zone === "head") fromAcc.head = one as AvatarHeadwear;
    else if (zone === "faceWear") fromAcc.faceWear = one as AvatarFacewear;
    else if (zone === "neck") fromAcc.neck = one as AvatarNeckwear;
    else fromAcc.hand = one as AvatarHeld;
  }
  return {
    head: props.head !== undefined ? props.head : fromAcc.head,
    faceWear: props.faceWear !== undefined ? props.faceWear : fromAcc.faceWear,
    neck: props.neck !== undefined ? props.neck : fromAcc.neck,
    hand: props.hand !== undefined ? props.hand : fromAcc.hand,
    crown: props.crown ?? fromAcc.crown ?? false,
  };
}

/** SVG attribute names as React wants them. */
const reactName = (name: string) => (name.startsWith("aria-") ? name : name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()));

function toReact(node: SvgNode, key: number): ReactElement {
  const props: Record<string, unknown> = { key };
  let className: string | undefined;
  let style: CSSProperties & Record<`--${string}`, string> = {};
  for (const [name, value] of Object.entries(node.attrs)) {
    // The shirt's number goes in the app's display font.
    if (name === "font-family" && String(value).startsWith("Outfit")) className = "font-display";
    else props[reactName(name)] = value;
  }
  if (node.anim?.name === "swing") {
    className = "animate-pj-swing";
    style = { "--pj-from": node.anim.from, transformBox: "view-box", transformOrigin: `${node.anim.origin[0]}px ${node.anim.origin[1]}px` };
  } else if (node.anim?.name === "land") className = "animate-pj-land";
  if (className) props.className = className;
  if (Object.keys(style).length > 0) props.style = style;
  return h(node.tag, props, node.text ?? node.children?.map(toReact));
}

/** What to draw, from the props (without the motion: Personaje adds it). */
export function lookOf(props: PersonajeProps): Look {
  return {
    sp: RIGS[props.sp] ? props.sp : "nioqui",
    colors: props.c,
    detail: props.detail,
    face: props.face,
    eyes: props.eyes,
    hair: props.hair,
    marks: props.marks,
    outfit: props.outfit,
    outfitColor: props.outfitColor,
    number: props.number,
    ...wear(props),
    scarf: props.scarf,
    prop: props.prop,
    pose: props.pose,
    view: props.view,
    facing: props.facing,
    badge: props.badge && !props.frame,
    badgeColor: props.badgeColor,
    crop: props.crop,
  };
}

export function Personaje(props: PersonajeProps): ReactElement {
  const ids = `pj${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  const size = props.size ?? 120;
  const drawing = drawCharacter({ ...lookOf(props), animate: !props.frame }, ids);
  const children = drawing.children.map(toReact);
  if (props.frame) {
    return h("svg", { ...props.frame, preserveAspectRatio: "xMidYMid slice", "aria-hidden": true }, children);
  }
  const animation = props.anim === "float" ? "animate-float" : props.anim === "bob" ? "animate-bob" : "";
  return h(
    "svg",
    {
      viewBox: drawing.viewBox,
      width: size,
      height: size * drawing.ratio,
      className: ["block overflow-visible", animation, props.className].filter(Boolean).join(" "),
      role: props.title ? "img" : undefined,
      "aria-label": props.title,
      "aria-hidden": props.title ? undefined : true,
    },
    children,
  );
}
