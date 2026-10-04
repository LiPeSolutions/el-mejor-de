/**
 * Account rules, shared by the browser (instant feedback) and the server (which
 * has the last word): apodos, passwords and characters. The messages players
 * read live in the web app.
 */

export const USERNAME_RULES = { minLength: 3, maxLength: 16 } as const;
export const PASSWORD_RULES = { minLength: 8, maxLength: 100 } as const;

const LETTERS = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';
/** Letters, digits, dots and underscores; it starts and ends with a letter or digit. */
const USERNAME_PATTERN = new RegExp(`^[${LETTERS}0-9](?:[${LETTERS}0-9._]*[${LETTERS}0-9])?$`);
const HAS_LETTER = new RegExp(`[${LETTERS}]`);

// Same as game.search_name in the database: translate, then lowercase.
const ACCENTED = 'ÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑáàäâéèëêíìïîóòöôúùüûñ';
const PLAIN = 'AAAAEEEEIIIIOOOOUUUUNaaaaeeeeiiiioooouuuun';

/** How apodos are compared: lowercase and without accents ("Tinchó" → "tincho"). */
export function usernameKey(username: string): string {
  let out = '';
  for (const char of username) {
    const index = ACCENTED.indexOf(char);
    out += index === -1 ? char : PLAIN[index];
  }
  return out.toLowerCase();
}

export type UsernameProblem = 'too-short' | 'too-long' | 'invalid' | 'needs-letter' | 'not-allowed';

export function checkUsername(raw: string): { ok: true; username: string } | { ok: false; problem: UsernameProblem } {
  const username = raw.trim().normalize('NFC');
  if (username.length < USERNAME_RULES.minLength) return { ok: false, problem: 'too-short' };
  if (username.length > USERNAME_RULES.maxLength) return { ok: false, problem: 'too-long' };
  if (!USERNAME_PATTERN.test(username) || /[._]{2}/.test(username)) return { ok: false, problem: 'invalid' };
  if (!HAS_LETTER.test(username)) return { ok: false, problem: 'needs-letter' };
  if (isUsernameBlocked(username)) return { ok: false, problem: 'not-allowed' };
  return { ok: true, username };
}

/*
 * Words an apodo can't have (docs/PLAN.md §9). Matching runs on the apodo
 * lowercased, without accents, with digits read as letters (pu7o → puto) and
 * without dots or underscores, and again with repeated letters collapsed
 * (puuuto → puto). To review with the product owner.
 */

/** Blocked anywhere in the apodo: they don't show up inside innocent words. */
const BLOCKED_ANYWHERE = [
  'boludo', 'boluda', 'pelotud', 'mierd', 'poronga', 'sorete', 'garch', 'pajer', 'conchud',
  'conchetu', 'conchatu', 'conchasu', 'conchesu', 'chupal', 'chupam', 'chupapij', 'chupaverg',
  'cagon', 'hijodeput', 'hijadeput', 'putit', 'puton', 'culiad', 'culiao', 'mogolic', 'retrasad',
  'maricon', 'hitler', 'falop', 'cocain', 'suicid', 'matate',
  'fuck', 'shit', 'bitch', 'cunt', 'nigg', 'porn', 'whore',
];

/** Blocked as the whole apodo or as one of its parts ("el_puto"). */
const BLOCKED_WORDS = [
  'puto', 'puta', 'verga', 'pija', 'pene', 'culo', 'orto', 'choto', 'chota', 'cajeta', 'concha',
  'teta', 'tetas', 'coger', 'paja', 'forro', 'forra', 'trolo', 'trola', 'trava', 'marica', 'nazi',
  'hdp', 'lpm', 'lpqtp', 'lpqlp', 'faso', 'porro', 'sexo', 'sexy', 'dick', 'cock', 'fag', 'sex',
  'xxx', 'rape', 'kkk',
];

/** Blocked at the start or the end too ("putoelquelee", "soyforro"). */
const BLOCKED_EDGES = ['puto', 'puta', 'forro', 'forra', 'trolo', 'trola', 'hdp', 'lpm'];
/** Innocent words caught by the edges. */
const EDGE_EXCEPTIONS = ['disputa', 'imputa', 'imputo', 'reputa', 'controla', 'controlo'];

/** Names that could pass for the game itself or its team. */
const RESERVED = [
  'admin', 'administrador', 'administradora', 'moderador', 'moderadora', 'mod', 'soporte', 'oficial',
  'staff', 'sistema', 'system', 'root', 'vos', 'anonimo', 'anonima', 'invitado', 'invitada', 'nadie',
  'null', 'undefined', 'lipe', 'lipesolutions', 'claude', 'anthropic',
];
const RESERVED_PREFIXES = ['admin', 'moderador', 'soporte', 'elmejor', 'lamejor'];

const LEET: Record<string, string> = { '0': 'o', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '9': 'g' };

/** The ways an apodo can be read: "1" as "i" or as "l", and with repeated letters collapsed. */
function readings(username: string): { whole: string[]; parts: string[] } {
  const key = usernameKey(username);
  const whole = new Set<string>();
  const parts = new Set<string>();
  for (const one of ['i', 'l']) {
    const letters = key.replace(/[0-9]/g, (digit) => (digit === '1' ? one : (LEET[digit] ?? digit)));
    for (const form of [letters, letters.replace(/(.)\1+/g, '$1')]) {
      whole.add(form.replace(/[._]/g, ''));
      for (const part of form.split(/[._]/)) if (part) parts.add(part);
    }
  }
  // Parts split by digits too: "tincho_99" → "tincho", and "puto99" → "puto".
  for (const part of key.split(/[._0-9]+/)) if (part) parts.add(part);
  return { whole: [...whole], parts: [...parts] };
}

export function isUsernameBlocked(username: string): boolean {
  const plain = usernameKey(username).replace(/[._]/g, '');
  if (RESERVED.includes(plain) || RESERVED_PREFIXES.some((prefix) => plain.startsWith(prefix))) return true;
  return hasBlockedWords(username);
}

/** Whether one word (or an apodo) has a blocked word, in any of its readings. */
function hasBlockedWords(text: string): boolean {
  const { whole, parts } = readings(text);
  return whole.some(
    (form) =>
      BLOCKED_ANYWHERE.some((word) => form.includes(word)) ||
      BLOCKED_WORDS.includes(form) ||
      (!EDGE_EXCEPTIONS.includes(form) && BLOCKED_EDGES.some((word) => form.startsWith(word) || form.endsWith(word))),
  ) || parts.some((part) => BLOCKED_WORDS.includes(part));
}

/**
 * For names with spaces, like a group's: each word is read like an apodo,
 * and the worst words are also looked for with the words run together
 * ("hijo de p…").
 */
export function isPhraseBlocked(text: string): boolean {
  const words = text.split(new RegExp(`[^${LETTERS}0-9]+`)).filter(Boolean);
  if (words.some(hasBlockedWords)) return true;
  return readings(words.join('')).whole.some((form) => BLOCKED_ANYWHERE.some((word) => form.includes(word)));
}

export type PasswordProblem = 'too-short' | 'too-long' | 'too-common' | 'same-as-username';

/** The ones people try first. Compared in lowercase. */
const COMMON_PASSWORDS = [
  '12345678', '123456789', '1234567890', '87654321', '12341234', '12121212', '11223344', 'password',
  'password1', 'contraseña', 'contrasena', 'qwertyui', 'qwerty123', 'asdfghjk', 'abcdefgh', 'abcd1234',
  'iloveyou', 'teamo123', 'argentina', 'bocajuniors', 'riverplate', 'elmejorde', 'futbol123',
];

export function checkPassword(password: string, username = ''): PasswordProblem | null {
  if (password.length < PASSWORD_RULES.minLength) return 'too-short';
  if (password.length > PASSWORD_RULES.maxLength) return 'too-long';
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.includes(lower) || /^(.)\1+$/.test(password)) return 'too-common';
  if (username && usernameKey(lower) === usernameKey(username)) return 'same-as-username';
  return null;
}

/* ───────────── Characters ───────────── */

/** The first 8 came with the app; the other 9, with characters 2.0 (docs/diseno/handoff-personajes). */
export const AVATAR_SPECIES = [
  'carpincho',
  'hornero',
  'pinguino',
  'zorro',
  'rana',
  'llama',
  'pelusa',
  'nioqui',
  'yaguarete',
  'tero',
  'mulita',
  'condor',
  'nandu',
  'oso',
  'vizcacha',
  'perro',
  'gato',
] as const;
/** "natural" keeps the species' own colors. */
export const AVATAR_COLORS = ['natural', 'dorado', 'coral', 'verde', 'azul', 'violeta', 'rosa', 'gris'] as const;
/** The first version's single accessory: still read, each one drawn in its zone. The crown isn't here: it's earned. */
export const AVATAR_ACCESSORIES = ['boina', 'gorra', 'anteojos', 'bufanda', 'mate'] as const;
/** The first one is the default. */
export const AVATAR_EYES = ['redondos', 'grandes', 'almendra', 'pestanas', 'dormilon', 'brillo'] as const;
export const AVATAR_HAIR = ['copete', 'jopo', 'rulos', 'cresta', 'pluma', 'flequillo'] as const;
export const AVATAR_MARKS = ['manchas', 'rayas', 'pecas', 'antifaz', 'parche'] as const;
export const AVATAR_OUTFITS = ['remera', 'camiseta', 'rayada', 'buzo'] as const;
/** One thing per zone: head, face, neck and hand. */
export const AVATAR_HEADWEAR = ['boina', 'gorra', 'gorro', 'vincha', 'auriculares', 'mono', 'sombrero'] as const;
export const AVATAR_FACEWEAR = ['anteojos', 'lentes', 'curita', 'pintura'] as const;
export const AVATAR_NECKWEAR = ['bufanda', 'panuelo', 'monito', 'collar'] as const;
export const AVATAR_HELD = ['mate', 'pelota', 'celu', 'termo', 'banderin'] as const;
/** The shirt number goes from 0 to 99; without one, the 10. */
export const AVATAR_NUMBER = { min: 0, max: 99, fallback: 10 } as const;

export type AvatarSpecies = (typeof AVATAR_SPECIES)[number];
export type AvatarColor = (typeof AVATAR_COLORS)[number];
/** A color of the palette, without "natural": for details, clothes and the badge's background. */
export type AvatarPaletteColor = Exclude<AvatarColor, 'natural'>;
export type AvatarAccessory = (typeof AVATAR_ACCESSORIES)[number];
export type AvatarEyes = (typeof AVATAR_EYES)[number];
export type AvatarHair = (typeof AVATAR_HAIR)[number];
export type AvatarMarks = (typeof AVATAR_MARKS)[number];
export type AvatarOutfit = (typeof AVATAR_OUTFITS)[number];
export type AvatarHeadwear = (typeof AVATAR_HEADWEAR)[number];
export type AvatarFacewear = (typeof AVATAR_FACEWEAR)[number];
export type AvatarNeckwear = (typeof AVATAR_NECKWEAR)[number];
export type AvatarHeld = (typeof AVATAR_HELD)[number];

/** A player's character. Every field after `accessory` can be missing: then it has its default (see each one). */
export interface Avatar {
  species: AvatarSpecies;
  color: AvatarColor;
  /** The first version's accessory, drawn in its zone when that zone isn't set. */
  accessory: AvatarAccessory | null;
  /** The detail color (ears, wings, marks, hair). Missing: the character's own dark tone. */
  detail?: AvatarPaletteColor | null;
  /** Missing: "redondos". */
  eyes?: AvatarEyes;
  hair?: AvatarHair | null;
  marks?: AvatarMarks | null;
  outfit?: AvatarOutfit | null;
  /** Missing: "azul". */
  outfitColor?: AvatarPaletteColor;
  /** Only shown on the "camiseta". Missing: 10. */
  number?: number;
  head?: AvatarHeadwear | null;
  face?: AvatarFacewear | null;
  neck?: AvatarNeckwear | null;
  hand?: AvatarHeld | null;
  /** The round badge's background. Missing: the brand's light blue. */
  background?: AvatarPaletteColor;
}

export const DEFAULT_AVATAR: Avatar = { species: 'hornero', color: 'natural', accessory: 'anteojos' };

/** The palette, without "natural": details, clothes and the badge's background. */
export const AVATAR_PALETTE_COLORS = AVATAR_COLORS.filter((color): color is AvatarPaletteColor => color !== 'natural');

/** The optional fields: the values each one takes, and whether it can be null ("nothing"). */
const OPTIONAL_FIELDS = {
  detail: { values: AVATAR_PALETTE_COLORS, nullable: true },
  eyes: { values: AVATAR_EYES, nullable: false },
  hair: { values: AVATAR_HAIR, nullable: true },
  marks: { values: AVATAR_MARKS, nullable: true },
  outfit: { values: AVATAR_OUTFITS, nullable: true },
  outfitColor: { values: AVATAR_PALETTE_COLORS, nullable: false },
  head: { values: AVATAR_HEADWEAR, nullable: true },
  face: { values: AVATAR_FACEWEAR, nullable: true },
  neck: { values: AVATAR_NECKWEAR, nullable: true },
  hand: { values: AVATAR_HELD, nullable: true },
  background: { values: AVATAR_PALETTE_COLORS, nullable: false },
} as const satisfies Partial<Record<keyof Avatar, { values: readonly string[]; nullable: boolean }>>;

/**
 * A valid character, or null. For what comes from the browser or the database.
 * The first version's shape (species, color and accessory) is still valid; a
 * missing optional field keeps its default, but one with a wrong value makes
 * the whole character invalid. Unknown fields are dropped.
 */
export function parseAvatar(value: unknown): Avatar | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const { species, color, accessory } = raw;
  if (!AVATAR_SPECIES.includes(species as AvatarSpecies)) return null;
  if (!AVATAR_COLORS.includes(color as AvatarColor)) return null;
  if (accessory !== null && !AVATAR_ACCESSORIES.includes(accessory as AvatarAccessory)) return null;
  const avatar: Record<string, unknown> = { species, color, accessory };
  for (const [field, rule] of Object.entries(OPTIONAL_FIELDS)) {
    const option = raw[field];
    if (option === undefined) continue;
    if (option === null ? !rule.nullable : !(rule.values as readonly unknown[]).includes(option)) return null;
    avatar[field] = option;
  }
  const { number } = raw;
  if (number !== undefined) {
    if (!Number.isInteger(number) || (number as number) < AVATAR_NUMBER.min || (number as number) > AVATAR_NUMBER.max) return null;
    avatar.number = number;
  }
  return avatar as unknown as Avatar;
}

/** Which zone each first-version accessory goes to. */
export const ACCESSORY_ZONE = { boina: 'head', gorra: 'head', anteojos: 'face', bufanda: 'neck', mate: 'hand' } as const satisfies Record<
  AvatarAccessory,
  'head' | 'face' | 'neck' | 'hand'
>;

/** What a character wears in each zone: a set zone wins; a missing one takes the first version's accessory, if it goes there. */
export function avatarWear(avatar: Avatar): {
  head: AvatarHeadwear | null;
  face: AvatarFacewear | null;
  neck: AvatarNeckwear | null;
  hand: AvatarHeld | null;
} {
  const old = avatar.accessory;
  const zone = old ? ACCESSORY_ZONE[old] : null;
  return {
    head: avatar.head !== undefined ? avatar.head : zone === 'head' ? (old as AvatarHeadwear) : null,
    face: avatar.face !== undefined ? avatar.face : zone === 'face' ? (old as AvatarFacewear) : null,
    neck: avatar.neck !== undefined ? avatar.neck : zone === 'neck' ? (old as AvatarNeckwear) : null,
    hand: avatar.hand !== undefined ? avatar.hand : zone === 'hand' ? (old as AvatarHeld) : null,
  };
}

/** The same character with every zone spelled out and no first-version accessory: how the editor saves it. */
export function avatarWithZones(avatar: Avatar): Avatar {
  return { ...avatar, accessory: null, ...avatarWear(avatar) };
}

/** How the crown names the player: "El Mejor de…" or "La Mejor de…". */
export const ARTICLES = ['el', 'la'] as const;
export type Article = (typeof ARTICLES)[number];
