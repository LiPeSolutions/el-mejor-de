/** Spanish word handling: accents don't matter, but Ñ is its own letter. */

const ACCENTS: Readonly<Record<string, string>> = {
  Á: 'A', À: 'A', Â: 'A', Ä: 'A',
  É: 'E', È: 'E', Ê: 'E', Ë: 'E',
  Í: 'I', Ì: 'I', Î: 'I', Ï: 'I',
  Ó: 'O', Ò: 'O', Ô: 'O', Ö: 'O',
  Ú: 'U', Ù: 'U', Û: 'U', Ü: 'U',
};

const LETTERS = new Set('ABCDEFGHIJKLMNÑOPQRSTUVWXYZ');

/**
 * Uppercase without accents, keeping Ñ ("camión" → "CAMION", "ñandú" → "ÑANDU").
 * Returns null when the input has anything but letters.
 */
export function normalizeWord(input: string): string | null {
  const upper = input.trim().normalize('NFC').toLocaleUpperCase('es');
  let word = '';
  for (const char of upper) {
    const letter = ACCENTS[char] ?? char;
    if (!LETTERS.has(letter)) return null;
    word += letter;
  }
  return word === '' ? null : word;
}

export type LetterCounts = ReadonlyMap<string, number>;

export function countLetters(word: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const letter of word) counts.set(letter, (counts.get(letter) ?? 0) + 1);
  return counts;
}

/** Whether `word` can be spelled with the available letters, using each one at most once. */
export function canSpell(word: string, available: LetterCounts): boolean {
  const used = new Map<string, number>();
  for (const letter of word) {
    const count = (used.get(letter) ?? 0) + 1;
    if (count > (available.get(letter) ?? 0)) return false;
    used.set(letter, count);
  }
  return true;
}

const LETTER_BITS = new Map([...'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'].map((letter, i) => [letter, 1 << i]));

/**
 * One bit per letter the word uses (27 letters with Ñ). A word can only be
 * spelled with letters whose mask covers its own: a cheap filter before canSpell.
 */
export function letterMask(word: string): number {
  let mask = 0;
  for (const letter of word) mask |= LETTER_BITS.get(letter) ?? 1 << 27;
  return mask;
}
