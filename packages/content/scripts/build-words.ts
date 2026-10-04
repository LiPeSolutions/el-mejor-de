/**
 * Builds src/words/words.json, step 2 of 2: the known words (words/known.txt,
 * from step 1, scripts/known-words.py) without the blocked ones
 * (src/words/blocklist.ts). Run: pnpm build:words
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MAX_WORD_LENGTH, SEVEN_LETTERS_RULES, normalizeWord } from '@repo/games';
import { BASE_WORDS, BASE_WORDS_10 } from '../src/words/base-words';
import { isBlockedWord } from '../src/words/blocklist';

const input = fileURLToPath(new URL('../words/known.txt', import.meta.url));
const output = fileURLToPath(new URL('../src/words/words.json', import.meta.url));

const words = new Set<string>();
let blocked = 0;
for (const raw of readFileSync(input, 'utf8').split('\n')) {
  const word = normalizeWord(raw);
  if (!word || word.length < SEVEN_LETTERS_RULES.minWordLength || word.length > MAX_WORD_LENGTH) continue;
  if (isBlockedWord(word)) {
    blocked++;
    continue;
  }
  words.add(word);
}

// The daily sets are built from these: without one, every day's letters would change.
const missing = [...BASE_WORDS, ...BASE_WORDS_10].filter((raw) => !words.has(normalizeWord(raw) ?? ''));
if (missing.length > 0) throw new Error(`Base words missing from the list: ${missing.join(', ')}`);

const sorted = [...words].sort();
writeFileSync(output, `[\n${sorted.map((word) => JSON.stringify(word)).join(',\n')}\n]\n`);
console.log(`${sorted.length} words written to ${output} (${blocked} blocked words left out)`);
