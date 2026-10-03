import type { Avatar, AvatarColor, AvatarSpecies } from "@repo/shared";
import { SPECIES, type BodyColors, type PersonajeProps } from "./Personaje";

/** The colors a player can paint their character (design 18). "natural" keeps the species' own. */
export const AVATAR_PALETTE: Record<Exclude<AvatarColor, "natural">, BodyColors> = {
  dorado: { main: "#FFC53D", light: "#FFF0C2", dark: "#D9971A", beak: "#FF8A3D" },
  coral: { main: "#FF6B4A", light: "#FFD1C4", dark: "#C94F2E" },
  verde: { main: "#3ECF8E", light: "#CFF5E3", dark: "#22A06B" },
  azul: { main: "#4F6BFF", light: "#C9D3FF", dark: "#3449C9" },
  violeta: { main: "#8B6CFF", light: "#E4DBFF", dark: "#6A4FD6" },
  rosa: { main: "#FF7AA2", light: "#FFD6E3", dark: "#D9557F" },
  gris: { main: "#9AA3B5", light: "#E4E7EE", dark: "#6C7489" },
};

export const COLOR_NAMES: Record<AvatarColor, string> = {
  natural: "Natural",
  dorado: "Dorado",
  coral: "Coral",
  verde: "Verde",
  azul: "Azul",
  violeta: "Violeta",
  rosa: "Rosa",
  gris: "Gris",
};

export const SPECIES_NAMES: Record<AvatarSpecies, string> = {
  carpincho: "Carpincho",
  hornero: "Hornero",
  pinguino: "Pingüino",
  zorro: "Zorro",
  rana: "Rana",
  llama: "Llama",
  pelusa: "Pelusa",
  nioqui: "Ñoqui",
};

/** Personaje props that draw a player's character. */
export function avatarLook(avatar: Avatar): Pick<PersonajeProps, "sp" | "c" | "acc"> {
  return {
    sp: avatar.species,
    c: avatar.color === "natural" ? undefined : AVATAR_PALETTE[avatar.color],
    acc: avatar.accessory ? [avatar.accessory] : [],
  };
}

/** The swatch for a color: "natural" shows the species' own. */
export function swatchColor(color: AvatarColor, species: AvatarSpecies): string {
  return color === "natural" ? SPECIES[species].c.main : AVATAR_PALETTE[color].main;
}
