/**
 * Builds src/words/words.json from the "an-array-of-spanish-words" list (MIT):
 * normalized, 3 to 10 letters, without blocked words. Run: pnpm build:words
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { MAX_WORD_LENGTH, SEVEN_LETTERS_RULES, normalizeWord } from '@repo/games';
import { isBlockedWord } from '../src/words/blocklist';

const require = createRequire(import.meta.url);
const source: string[] = require('an-array-of-spanish-words');
const output = fileURLToPath(new URL('../src/words/words.json', import.meta.url));

const words = new Set<string>();
let blocked = 0;
for (const raw of source) {
  const word = normalizeWord(raw);
  if (!word || word.length < SEVEN_LETTERS_RULES.minWordLength || word.length > MAX_WORD_LENGTH) {
    continue;
  }
  if (isBlockedWord(word)) {
    blocked++;
    continue;
  }
  words.add(word);
}

const sorted = [...words].sort();
writeFileSync(output, `[\n${sorted.map((word) => JSON.stringify(word)).join(',\n')}\n]\n`);
console.log(`${sorted.length} words written to ${output} (${blocked} blocked forms skipped)`);
