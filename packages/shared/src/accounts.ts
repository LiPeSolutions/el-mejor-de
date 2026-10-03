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

export const AVATAR_SPECIES = ['carpincho', 'hornero', 'pinguino', 'zorro', 'rana', 'llama', 'pelusa', 'nioqui'] as const;
/** "natural" keeps the species' own colors. */
export const AVATAR_COLORS = ['natural', 'dorado', 'coral', 'verde', 'azul', 'violeta', 'rosa', 'gris'] as const;
/** The crown isn't here: it's earned. */
export const AVATAR_ACCESSORIES = ['boina', 'gorra', 'anteojos', 'bufanda', 'mate'] as const;

export type AvatarSpecies = (typeof AVATAR_SPECIES)[number];
export type AvatarColor = (typeof AVATAR_COLORS)[number];
export type AvatarAccessory = (typeof AVATAR_ACCESSORIES)[number];

export interface Avatar {
  species: AvatarSpecies;
  color: AvatarColor;
  accessory: AvatarAccessory | null;
}

export const DEFAULT_AVATAR: Avatar = { species: 'hornero', color: 'natural', accessory: 'anteojos' };

/** A valid character, or null. For what comes from the browser or the database. */
export function parseAvatar(value: unknown): Avatar | null {
  if (typeof value !== 'object' || value === null) return null;
  const { species, color, accessory } = value as Record<string, unknown>;
  if (!AVATAR_SPECIES.includes(species as AvatarSpecies)) return null;
  if (!AVATAR_COLORS.includes(color as AvatarColor)) return null;
  if (accessory !== null && !AVATAR_ACCESSORIES.includes(accessory as AvatarAccessory)) return null;
  return { species: species as AvatarSpecies, color: color as AvatarColor, accessory: accessory as AvatarAccessory | null };
}

/** How the crown names the player: "El Mejor de…" or "La Mejor de…". */
export const ARTICLES = ['el', 'la'] as const;
export type Article = (typeof ARTICLES)[number];
