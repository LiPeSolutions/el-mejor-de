import { describe, expect, it } from 'vitest';
import { canSpell, countLetters, normalizeWord } from './text';

describe('normalizeWord', () => {
  it('uppercases and drops accents but keeps Ñ', () => {
    expect(normalizeWord('Camión')).toBe('CAMION');
    expect(normalizeWord('ñandú')).toBe('ÑANDU');
    expect(normalizeWord('pingüino')).toBe('PINGUINO');
    expect(normalizeWord('  hola ')).toBe('HOLA');
  });

  it('accepts a decomposed ñ (n + combining tilde)', () => {
    expect(normalizeWord('ñandú')).toBe('ÑANDU');
  });

  it('rejects anything that is not letters', () => {
    expect(normalizeWord('hola!')).toBeNull();
    expect(normalizeWord('abc1')).toBeNull();
    expect(normalizeWord('dos palabras')).toBeNull();
    expect(normalizeWord('')).toBeNull();
  });
});

describe('canSpell', () => {
  const letters = countLetters('CAMINAR');

  it('allows each letter as many times as it is available', () => {
    expect(canSpell('ANIMAR', letters)).toBe(true); // uses both A
    expect(canSpell('CAMINAR', letters)).toBe(true);
  });

  it('refuses missing or overused letters', () => {
    expect(canSpell('PERRO', letters)).toBe(false);
    expect(canSpell('AAA', letters)).toBe(false);
  });
});
