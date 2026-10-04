import type { AvatarPaletteColor } from "@repo/shared";

/*
 * The colors the characters are painted with: the palette a player chooses
 * from (design 18), the fixed ones of the face, and the hex helpers the
 * drawing uses (docs/diseno/handoff-personajes/fuente/personajes.js).
 */

export interface BodyColors {
  main: string;
  light: string;
  dark: string;
  /** Beak and feet of the birds. */
  beak?: string;
}

/** The colors a player can paint their character with. "natural" keeps the species' own. */
export const AVATAR_PALETTE: Record<AvatarPaletteColor, BodyColors> = {
  dorado: { main: "#FFC53D", light: "#FFF0C2", dark: "#D9971A", beak: "#FF8A3D" },
  coral: { main: "#FF6B4A", light: "#FFD1C4", dark: "#C94F2E" },
  verde: { main: "#3ECF8E", light: "#CFF5E3", dark: "#22A06B" },
  azul: { main: "#4F6BFF", light: "#C9D3FF", dark: "#3449C9" },
  violeta: { main: "#8B6CFF", light: "#E4DBFF", dark: "#6A4FD6" },
  rosa: { main: "#FF7AA2", light: "#FFD6E3", dark: "#D9557F" },
  gris: { main: "#9AA3B5", light: "#E4E7EE", dark: "#6C7489" },
};

export const INK = "#23263A";
export const EYE = "#3C1E00";
export const CHEEK = "#FF9EB5";
export const TONGUE = "#FF7A8A";
/** The round badge's background when the player didn't choose one: the brand's light blue. */
export const BADGE_BACKGROUND = "#E6EAFF";

const rgb = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255] as const;
};

/** `a` moved toward `b` by `t` (0 to 1). */
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return `#${x.map((v, i) => Math.round(v + (y[i]! - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** How light a color looks, from 0 to 1 (to choose white or ink over it). */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => v / 255) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
