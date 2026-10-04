import { avatarWear, type Avatar, type AvatarColor, type AvatarSpecies } from "@repo/shared";
import { AVATAR_PALETTE } from "./palette";
import type { PersonajeProps } from "./Personaje";
import { SPECIES_MAIN } from "./rig";

export { AVATAR_PALETTE } from "./palette";

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
  yaguarete: "Yaguareté",
  tero: "Tero",
  mulita: "Mulita",
  condor: "Cóndor",
  nandu: "Ñandú",
  oso: "Oso hormiguero",
  vizcacha: "Vizcacha",
  perro: "Perro",
  gato: "Gato",
};

/** What draws a player's character (without the badge's background: see `badgeLook`). */
export type AvatarLook = Pick<
  PersonajeProps,
  "sp" | "c" | "detail" | "eyes" | "hair" | "marks" | "outfit" | "outfitColor" | "number" | "head" | "faceWear" | "neck" | "hand"
>;

/** Personaje props that draw a player's character. The first version's accessory goes to its zone. */
export function avatarLook(avatar: Avatar): AvatarLook {
  const { head, face, neck, hand } = avatarWear(avatar);
  return {
    sp: avatar.species,
    c: avatar.color === "natural" ? undefined : AVATAR_PALETTE[avatar.color],
    detail: avatar.detail ?? null,
    eyes: avatar.eyes,
    hair: avatar.hair ?? null,
    marks: avatar.marks ?? null,
    outfit: avatar.outfit ?? null,
    outfitColor: avatar.outfitColor,
    number: avatar.number,
    head,
    faceWear: face,
    neck,
    hand,
  };
}

/** The round avatar of rows and chips, on the background the player chose. */
export function badgeLook(avatar: Avatar): AvatarLook & Pick<PersonajeProps, "badge" | "badgeColor"> {
  return { ...avatarLook(avatar), badge: true, badgeColor: avatar.background };
}

/** The swatch for a color: "natural" shows the species' own. */
export function swatchColor(color: AvatarColor, species: AvatarSpecies): string {
  return color === "natural" ? SPECIES_MAIN[species] : AVATAR_PALETTE[color].main;
}
