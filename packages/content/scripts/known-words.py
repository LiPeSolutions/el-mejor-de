"""
Known words for Diez Letras, step 1 of 2 (step 2 is build-words.ts).

Picks, from the "an-array-of-spanish-words" list, the words an Argentine adult
knows, and writes them to words/known.txt (one per line). The rules:

- 3 and 4 letters: only the hand-reviewed list (words/short.txt).
- Verbs: frequent ones (infinitive with Zipf 3.0 or more) and the reviewed ones
  (words/verbs.txt) count with their conjugations, voseo included (tenés,
  decí) and with pronouns (decime, hacerlo). Not vosotros (habláis).
- 5 letters or more: frequent words (Zipf 2.5 or more), the reviewed ones under
  that (words/bases.txt) and their plurals, feminines, diminutives and
  superlatives.
- Always: words/extra.txt (Argentine words and everyday loanwords) and the base
  words of the daily sets. Never: words/noise.txt (names, foreign words).

The all-ages filter (src/words/blocklist.ts) comes in step 2, so changing it
doesn't need this script.

Frequencies come from wordfreq (Zipf scale: 3 is about once per million words);
conjugations from verbecc's templates, kept when the template is a reliable one
(the source list has 95% of its forms), the list has them or a corpus has seen
them. Needs Python 3.10+ and:
    pip install wordfreq==3.1.1 && pip install --no-deps verbecc==2.0.3
Run from packages/content: pnpm build:known, then pnpm build:words.
"""
import collections
import json
import math
import os
import re
import sys

import wordfreq

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from conjugation import conjugate, in_verbecc, norm, template_for, VERBS  # noqa: E402

PACKAGE = os.path.dirname(HERE)
WORDS_DIR = os.path.join(PACKAGE, 'words')
SOURCE = os.path.join(PACKAGE, 'node_modules', 'an-array-of-spanish-words', 'index.json')
BASE_WORDS = os.path.join(PACKAGE, 'src', 'words', 'base-words.ts')
OUTPUT = os.path.join(WORDS_DIR, 'known.txt')

FREQUENT_VERB = 3.0  # an infinitive this frequent counts without review
FREQUENT_WORD = 2.5  # a word of 5+ letters this frequent counts without review
SEEN_FORM = 1.0      # a conjugation the source list lacks counts if a corpus has it this often
SEEN_DERIVED = 1.5   # same for forms with pronouns, plurals, diminutives…
SEEN_SHORT_CLITIC = 3.0  # dame, dale: four-letter forms with a pronoun
TRUSTED_TEMPLATE = 0.95  # a model whose forms the source list confirms this often needs no corpus check


def game_word(raw):
    """Like the game's normalizeWord: uppercase, no accents, Ñ kept; None if not only letters."""
    word = norm(raw)
    return word if word and re.fullmatch('[A-ZÑ]+', word) else None


def read_list(name):
    words = set()
    with open(os.path.join(WORDS_DIR, name), encoding='utf-8') as f:
        for line in f:
            if not line.startswith('#'):
                words |= set(line.split())
    return words


def frequencies():
    """Zipf frequency of each normalized word: accents don't split a word (the source list has none)."""
    total = collections.Counter()
    for word, freq in wordfreq.get_frequency_dict('es', wordlist='large').items():
        key = game_word(word)
        if key:
            total[key] += freq
    return {word: math.log10(freq) + 9 for word, freq in total.items()}


def diminutive_stem(stem):
    if stem.endswith('C'):
        return stem[:-1] + 'QU'
    if stem.endswith('G'):
        return stem + 'U'
    if stem.endswith('Z'):
        return stem[:-1] + 'C'
    return stem


def inflections(word):
    """(plurals, other forms) of a noun or adjective: gender, diminutive, superlative, -mente. Some won't exist."""
    last, vowel = word[-1], word[-1] in 'AEIOU'
    if vowel:
        plurals = {word + 'S'} | ({word + 'ES'} if last in 'IU' else set())  # rubíes, tabúes
    elif last == 'Z':
        plurals = {word[:-1] + 'CES'}
    else:
        plurals = {word + 'ES'}
    others = set()
    if last == 'O':
        others |= {word[:-1] + 'A', word[:-1] + 'AS'}
    if word.endswith(('OR', 'ES', 'ON', 'AN', 'IN', 'OL')):
        others |= {word + 'A', word + 'AS'}  # doctora, inglesa, campeona, española
    if last not in 'EIU':
        stem = diminutive_stem(word[:-1] if vowel else word)
        others |= {stem + ending for ending in ('ITO', 'ITA', 'ITOS', 'ITAS')}  # casita, chiquito
    if last not in 'IU':
        stem = diminutive_stem(word[:-1] if vowel else word)
        others |= {stem + ending for ending in ('ISIMO', 'ISIMA', 'ISIMOS', 'ISIMAS')}  # buenísimo, facilísimo
    if word.endswith('BLE'):
        others |= {word[:-3] + 'BILISIM' + ending for ending in ('O', 'A', 'OS', 'AS')}  # amabilísimo
    if last in 'ENR':
        others |= {word + ending for ending in ('CITO', 'CITA', 'CITOS', 'CITAS')}  # cafecito, camioncito, amorcito
    if len(word) <= 4 and not vowel:
        others |= {diminutive_stem(word) + 'E' + ending for ending in ('CITO', 'CITA', 'CITOS', 'CITAS')}  # panecito, lucecita
    if last == 'O':
        others.add(word[:-1] + 'AMENTE')
    elif last in 'ELZRN':
        others.add(word + 'MENTE')
    return plurals, others


def trusted_templates(source):
    """Conjugation models whose forms the source list almost always has (the regular ones and a few more)."""
    found, total, verbs = collections.Counter(), collections.Counter(), collections.Counter()
    for verb in VERBS:
        base = verb[:-2] if verb.endswith(('ARSE', 'ERSE', 'IRSE')) else verb
        if base not in source:
            continue
        template = template_for(base)
        forms = {f for f in conjugate(base)[0] if 5 <= len(f) <= 10 and f != base}
        verbs[template] += 1
        total[template] += len(forms)
        found[template] += len(forms & source)
    return {t for t in total if verbs[t] >= 3 and found[t] >= TRUSTED_TEMPLATE * total[t]}


def main():
    zipf = frequencies()
    Z = lambda w: zipf.get(w, 0.0)  # noqa: E731
    with open(SOURCE, encoding='utf-8') as f:
        source = {w for w in (game_word(raw) for raw in json.load(f)) if w and 3 <= len(w) <= 10}
    short, verb_keep, bases = read_list('short.txt'), read_list('verbs.txt'), read_list('bases.txt')
    not_verbs, rejected, noise, extra = read_list('not-verbs.txt'), read_list('rejected-verbs.txt'), read_list('noise.txt'), read_list('extra.txt')
    with open(BASE_WORDS, encoding='utf-8') as f:
        daily_bases = {game_word(raw) for raw in re.findall(r"'([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)'", f.read())}

    trusted = trusted_templates(source)
    # Verbs: infinitives in the list, verbecc's verbs, "ir" and the extra ones.
    candidates = {w for w in source if len(w) >= 4 and w[-2:] in ('AR', 'ER', 'IR')}
    candidates |= {v[:-2] if v.endswith(('ARSE', 'ERSE', 'IRSE')) else v for v in VERBS}
    candidates |= {'IR'} | {w for w in extra if w[-2:] in ('AR', 'ER', 'IR')}
    known = set(short) | set(extra) | daily_bases
    verbs = 0
    infinitives, verb_forms = set(), set()  # of every verb, known or not
    for verb in candidates:
        if verb in not_verbs:
            continue
        plain, clitic = conjugate(verb)
        plain = {f for f in plain if len(f) <= 10}
        clitic = {f for f in clitic if len(f) <= 10}
        seen = len({f for f in plain if f != verb} & source)
        looks_like_verb = in_verbecc(verb) or (seen >= 5 and seen >= 0.6 * len(plain))
        if looks_like_verb:
            infinitives.add(verb)
            verb_forms |= plain - {verb}
        listed = verb in verb_keep or verb in short or verb in extra or verb == 'IR'
        if verb in rejected or not (listed or (looks_like_verb and Z(verb) >= FREQUENT_VERB)):
            continue
        verbs += 1
        sure = template_for(verb) in trusted
        known |= {f for f in plain if len(f) >= 5 and (sure or f in source or Z(f) >= SEEN_FORM)}
        # The source list hardly has forms with pronouns; the ones it has are mostly other words (dialogales, plural of dialogal).
        known |= {f for f in clitic if Z(f) >= (SEEN_SHORT_CLITIC if len(f) == 4 else SEEN_DERIVED)}
    known |= {w for w in source if len(w) >= 5 and Z(w) >= FREQUENT_WORD}
    known |= bases
    known -= noise
    for word in list(known):
        if word in infinitives:
            continue  # an infinitive's "plural" is mostly a verb form (otear → oteares); "deberes" counts on its own
        plurals, others = inflections(word)
        known |= {f for f in plurals if 5 <= len(f) <= 10 and (f in source or Z(f) >= SEEN_DERIVED)}
        # A guessed feminine or diminutive that is really a verb form (desatino → desatina) needs to be seen in texts.
        known |= {f for f in others if 5 <= len(f) <= 10 and (Z(f) >= SEEN_DERIVED or (f in source and f not in verb_forms))}
    known = sorted(w for w in known - noise if 3 <= len(w) <= 10)
    missing = sorted(daily_bases - set(known))
    if missing:
        raise SystemExit(f'Base words missing: {missing}')
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(known) + '\n')
    print(f'{len(known)} known words ({len(set(known) - source)} not in the source list, {verbs} verbs) written to {OUTPUT}')


if __name__ == '__main__':
    main()
