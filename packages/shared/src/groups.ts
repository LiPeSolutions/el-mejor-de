/**
 * Private groups (docs/PLAN.md §8), shared by the browser (instant feedback)
 * and the server (which has the last word).
 */
import { isPhraseBlocked, usernameKey } from './accounts';
import type { Article } from './accounts';

export const GROUP_RULES = {
  nameMinLength: 3,
  nameMaxLength: 30,
  maxMembers: 50,
  /** Groups a player can be in at the same time. */
  maxGroupsPerPlayer: 20,
  /** New groups per player per day. */
  newGroupsPerDay: 5,
  /** An invitation link works this long; then it has to be renewed. */
  inviteDays: 7,
} as const;

/** Emblems instead of emoji, so they look the same on every phone. */
export const GROUP_EMBLEMS = ['casa', 'maletin', 'pelota', 'birrete', 'mate', 'musica', 'corazon', 'estrella'] as const;
export const GROUP_COLORS = ['azul', 'coral', 'violeta', 'turquesa', 'dorado', 'rosa', 'tinta'] as const;

export type GroupEmblem = (typeof GROUP_EMBLEMS)[number];
export type GroupColor = (typeof GROUP_COLORS)[number];

export type GroupNameProblem = 'too-short' | 'too-long' | 'invalid' | 'needs-letter' | 'not-allowed';

const LETTERS = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';
const NAME_PATTERN = new RegExp(`^[${LETTERS}0-9 .,'¡!¿?&()-]+$`);
const HAS_LETTER = new RegExp(`[${LETTERS}]`);
/** The app puts "El Mejor de" in front of the name, so it isn't part of it. */
const CROWN_PREFIX = /^(?:el|la)\s+mejor\s+(de|del)\s+/i;

/**
 * A valid group name, tidied up: single spaces, first letter in uppercase
 * and without a leading "El Mejor de" ("El Mejor del barrio" → "El barrio").
 */
export function checkGroupName(raw: string): { ok: true; name: string } | { ok: false; problem: GroupNameProblem } {
  let name = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  const prefix = CROWN_PREFIX.exec(name);
  if (prefix) name = (prefix[1]!.toLowerCase() === 'del' ? 'el ' : '') + name.slice(prefix[0].length);
  name = name.charAt(0).toUpperCase() + name.slice(1);
  if (name.length < GROUP_RULES.nameMinLength) return { ok: false, problem: 'too-short' };
  if (name.length > GROUP_RULES.nameMaxLength) return { ok: false, problem: 'too-long' };
  if (!NAME_PATTERN.test(name)) return { ok: false, problem: 'invalid' };
  if (!HAS_LETTER.test(name)) return { ok: false, problem: 'needs-letter' };
  if (isPhraseBlocked(name)) return { ok: false, problem: 'not-allowed' };
  return { ok: true, name };
}

/** "El Mejor de Los del laburo", "La Mejor del barrio" ("de" + "el" makes "del"). */
export function crownTitle(groupName: string, article: Article = 'el'): string {
  const lead = article === 'la' ? 'La Mejor' : 'El Mejor';
  const withEl = /^el\s+(.+)$/i.exec(groupName);
  return withEl ? `${lead} del ${withEl[1]}` : `${lead} de ${groupName}`;
}

/** Invitation codes look like "LABURO-7K2Q": a word of the name and four characters easy to read aloud. */
export const INVITE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const INVITE_SUFFIX_LENGTH = 4;

/** The longest word of the name, without accents and up to 8 letters ("Los del laburo" → "LABURO"). */
export function invitePrefix(groupName: string): string {
  const words = usernameKey(groupName).toUpperCase().split(/[^A-Z]+/).filter((word) => word.length >= 3);
  const longest = words.reduce((best, word) => (word.length > best.length ? word : best), '');
  return (longest || 'GRUPO').slice(0, 8);
}

/** How codes are compared, however they're typed: "laburo 7k2q" → "LABURO7K2Q". */
export function inviteKey(code: string): string {
  return usernameKey(code.normalize('NFC')).toUpperCase().replace(/[^A-Z0-9]/g, '');
}
