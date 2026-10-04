import {
  AVATAR_EYES,
  AVATAR_FACEWEAR,
  AVATAR_HAIR,
  AVATAR_HEADWEAR,
  AVATAR_HELD,
  AVATAR_MARKS,
  AVATAR_NECKWEAR,
  AVATAR_OUTFITS,
  AVATAR_PALETTE_COLORS,
  AVATAR_SPECIES,
  avatarWear,
  type Avatar,
  type AvatarColor,
  type AvatarEyes,
  type AvatarFacewear,
  type AvatarHair,
  type AvatarHeadwear,
  type AvatarHeld,
  type AvatarMarks,
  type AvatarNeckwear,
  type AvatarOutfit,
  type AvatarSpecies,
} from "@repo/shared";
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

/** Each option's name: the chosen one goes next to its section in the editor, and screen readers say it for each cell. */
export const OPTION_NAMES = {
  eyes: { redondos: "Redondos", grandes: "Grandes", almendra: "Almendra", pestanas: "Pestañas", dormilon: "Dormilón", brillo: "Brillo" },
  hair: { copete: "Copete", jopo: "Jopo", rulos: "Rulos", cresta: "Cresta", pluma: "Pluma", flequillo: "Flequillo" },
  marks: { manchas: "Manchas", rayas: "Rayas", pecas: "Pecas", antifaz: "Antifaz", parche: "Parche" },
  outfit: { remera: "Remera", camiseta: "Camiseta", rayada: "Rayada", buzo: "Buzo" },
  head: { boina: "Boina", gorra: "Gorra", gorro: "Gorro", vincha: "Vincha", auriculares: "Auriculares", mono: "Moño", sombrero: "Sombrero" },
  face: { anteojos: "Anteojos", lentes: "Lentes de sol", curita: "Curita", pintura: "Pintada" },
  neck: { bufanda: "Bufanda", panuelo: "Pañuelo", monito: "Moñito", collar: "Collar" },
  hand: { mate: "Mate", pelota: "Pelota", celu: "Celu", termo: "Termo", banderin: "Banderín" },
} as const satisfies {
  eyes: Record<AvatarEyes, string>;
  hair: Record<AvatarHair, string>;
  marks: Record<AvatarMarks, string>;
  outfit: Record<AvatarOutfit, string>;
  head: Record<AvatarHeadwear, string>;
  face: Record<AvatarFacewear, string>;
  neck: Record<AvatarNeckwear, string>;
  hand: Record<AvatarHeld, string>;
};

/** The names that don't fit under an editor cell (10 px, one line). */
export const SHORT_NAMES: Partial<Record<AvatarSpecies | AvatarHeadwear | AvatarFacewear, string>> = {
  oso: "Oso horm.",
  auriculares: "Auricul.",
  lentes: "De sol",
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

const pick = <T>(list: readonly T[], rand: () => number): T => list[Math.min(list.length - 1, Math.floor(rand() * list.length))]!;
/** One of the list, or nothing `empty` of the times. */
const maybe = <T>(list: readonly T[], rand: () => number, empty = 0.5): T | null => (rand() < empty ? null : pick(list, rand));

/** The character a new account starts with: any of the 17, in its own colors and with nothing on. */
export function startingAvatar(rand: () => number = Math.random): Avatar {
  return { species: pick(AVATAR_SPECIES, rand), color: "natural", accessory: null };
}

/**
 * "Al azar": everything at once, on another species than `species`. Half the
 * times in its natural color, the detail like the body 6 in 10, and each part
 * (hair, marks, clothes and the 4 zones) empty half the times.
 */
export function randomAvatar(species: AvatarSpecies, rand: () => number = Math.random): Avatar {
  const background = maybe(AVATAR_PALETTE_COLORS, rand, 1 / (AVATAR_PALETTE_COLORS.length + 1));
  return {
    species: pick(
      AVATAR_SPECIES.filter((one) => one !== species),
      rand,
    ),
    color: rand() < 0.5 ? "natural" : pick(AVATAR_PALETTE_COLORS, rand),
    accessory: null,
    detail: maybe(AVATAR_PALETTE_COLORS, rand, 0.6),
    eyes: pick(AVATAR_EYES, rand),
    hair: maybe(AVATAR_HAIR, rand),
    marks: maybe(AVATAR_MARKS, rand),
    outfit: maybe(AVATAR_OUTFITS, rand),
    outfitColor: pick(AVATAR_PALETTE_COLORS, rand),
    number: Math.min(99, 1 + Math.floor(rand() * 99)),
    head: maybe(AVATAR_HEADWEAR, rand),
    face: maybe(AVATAR_FACEWEAR, rand),
    neck: maybe(AVATAR_NECKWEAR, rand),
    hand: maybe(AVATAR_HELD, rand),
    // The light blue of the brand is the one without a value.
    ...(background ? { background } : {}),
  };
}
