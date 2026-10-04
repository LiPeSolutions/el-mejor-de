import { createSevenLettersDictionary, type SevenLettersDictionary } from '@repo/games';
import { BASE_WORDS, BASE_WORDS_10 } from './base-words';
import WORDS from './words.json';

export { BASE_WORDS, BASE_WORDS_10 } from './base-words';
export { BLOCKED_PREFIXES, BLOCKED_WORDS, isBlockedWord } from './blocklist';

let dictionary: SevenLettersDictionary | undefined;

/** Server-only: the word list is large (~120k words). Built once per process. */
export function getSevenLettersDictionary(): SevenLettersDictionary {
  dictionary ??= createSevenLettersDictionary(WORDS, [...BASE_WORDS, ...BASE_WORDS_10]);
  return dictionary;
}
