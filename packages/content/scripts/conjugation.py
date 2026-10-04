"""
Spanish conjugations from verbecc's templates (https://github.com/bretttolbert/verbecc).

Used only to propose word forms: known-words.py keeps a form when the source
list has it or a corpus has seen it. Normalized like the game (uppercase, no
accents, Ñ kept). No vosotros forms and no future subjunctive (Argentina uses
neither); with voseo (vos cantás, cantá) and enclitics (decime, hacerlo).
"""
import importlib.util
import os
import re
import unicodedata
import xml.etree.ElementTree as ET


def norm(text: str) -> str:
    text = text.strip().upper().replace('Ñ', '\0')
    text = ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
    return text.replace('\0', 'Ñ')


CLITICS = ['SE', 'ME', 'TE', 'LO', 'LA', 'LE', 'NOS', 'LOS', 'LAS', 'LES', 'SELO', 'SELA', 'SELOS', 'SELAS', 'SELE', 'SELES',
           'MELO', 'MELA', 'MELOS', 'MELAS', 'TELO', 'TELA', 'TELOS', 'TELAS', 'NOSLO', 'NOSLA', 'NOSLOS', 'NOSLAS']


def _data_dir() -> str:
    spec = importlib.util.find_spec('verbecc')
    if spec is None or not spec.submodule_search_locations:
        raise SystemExit('Missing verbecc\'s data: pip install --no-deps verbecc==2.0.3')
    return os.path.join(list(spec.submodule_search_locations)[0], 'data', 'xml')


def _load():
    xml = _data_dir()
    root = ET.parse(os.path.join(xml, 'conjugations', 'conjugations-es.xml')).getroot()
    templates = {}
    for template in root.findall('template'):
        tenses = {}
        for mood in template:
            for tense in mood:
                tenses[(mood.tag, tense.tag)] = [[norm(i.text or '') for i in p.findall('i')] for p in tense.findall('p')]
        templates[template.get('name')] = tenses
    root = ET.parse(os.path.join(xml, 'verbs', 'verbs-es.xml')).getroot()
    verbs = {norm(v.find('i').text): v.find('t').text for v in root.findall('v')}
    return templates, verbs


TEMPLATES, VERBS = _load()

# Regular models for verbs verbecc doesn't list (laburar, chamuyar, morfar…).
GUESSES = [('CAR', 'sa:car'), ('GAR', 'pag:ar'), ('ZAR', 'ca:zar'), ('GUAR', 'averi:guar'), ('AR', 'cort:ar'),
           ('CER', 'cono:cer'), ('ER', 'deb:er'), ('GIR', 'adstrin:gir'), ('UIR', 'influ:ir'), ('IR', 'viv:ir')]


def in_verbecc(infinitive: str) -> bool:
    return infinitive in VERBS or infinitive + 'SE' in VERBS


def template_for(infinitive: str):
    if infinitive in VERBS:
        return VERBS[infinitive]
    if infinitive + 'SE' in VERBS:
        return VERBS[infinitive + 'SE']
    for ending, template in GUESSES:
        if infinitive.endswith(ending) and template in TEMPLATES:
            return template
    return None


def conjugate(infinitive: str):
    """(plain forms, forms with enclitics) of an infinitive."""
    template = template_for(infinitive)
    if not template:
        return set(), set()
    ending = norm(template.split(':')[1])
    pronominal = ending.endswith('SE') and not infinitive.endswith('SE')
    if pronominal:
        ending = ending[:-2]
    base = infinitive[:-2] if infinitive.endswith('SE') and not pronominal else infinitive
    if not base.endswith(ending):
        return set(), set()
    radical = base[:-len(ending)]
    plain, imperatives, raw = set(), set(), {}
    for (mood, tense), persons in TEMPLATES[template].items():
        if mood == 'Subjuntivo' and tense == 'futuro':
            continue
        for person, endings in enumerate(persons):
            forms = [radical + e for e in endings]
            if pronominal and mood in ('Infinitivo', 'Gerundio'):
                forms = [f[:-2] if f.endswith('SE') else f for f in forms]  # arrepentirse → arrepentir
            raw[(mood, tense, person)] = forms
            vosotros = 3 if mood == 'Imperativo' else 4
            if len(persons) > 1 and person == vosotros:
                continue
            if mood == 'Imperativo':
                if tense == 'negativo':
                    plain |= set(forms)
                elif not pronominal:
                    imperatives |= set(forms)
                continue
            plain |= set(forms)
    # Voseo: vos cantás, comés, vivís (from cantáis, coméis, vivís) and cantá, comé, viví (from cantad…).
    for form in raw.get(('Indicativo', 'presente', 4), []):
        plain.add(re.sub(r'([AE])IS$', r'\1S', form))
    for form in raw.get(('Imperativo', 'afirmativo', 3), []):
        if pronominal and form.endswith('OS'):
            form = form[:-2]
        if form.endswith('D') and base != 'IR':
            plain.add(form[:-1])
            imperatives.add(form[:-1])
    # Participles in both genders and numbers.
    participles = {p for (mood, tense, _), forms in raw.items() if tense == 'participo' for p in forms}
    for form in list(plain):
        if form in participles and form.endswith('O'):
            plain |= {form[:-1] + 'A', form + 'S', form[:-1] + 'AS'}
    gerunds = set(raw.get(('Gerundio', 'gerundio', 0), []))
    clitic = set()
    for host in {base} | gerunds | imperatives:
        for pronoun in CLITICS:
            word = host + pronoun
            # Nosotros drops its S before NOS and SE: vayámonos, digámoselo.
            if host.endswith('MOS') and (pronoun.startswith('NOS') or pronoun.startswith('SE')):
                word = host[:-1] + pronoun
            clitic.add(word)
    plain.add(base)
    plain |= gerunds
    return plain, clitic - plain
