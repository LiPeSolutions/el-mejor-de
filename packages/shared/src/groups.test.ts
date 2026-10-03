import { describe, expect, it } from 'vitest';
import { checkGroupName, crownTitle, inviteKey, invitePrefix } from './groups';

describe('checkGroupName', () => {
  it('tidies spaces and capitalizes', () => {
    expect(checkGroupName('  los   del laburo ')).toEqual({ ok: true, name: 'Los del laburo' });
  });

  it('drops a leading "El Mejor de", since the app adds it', () => {
    expect(checkGroupName('El Mejor de los primos')).toEqual({ ok: true, name: 'Los primos' });
    expect(checkGroupName('la mejor de la oficina')).toEqual({ ok: true, name: 'La oficina' });
    expect(checkGroupName('El Mejor del barrio')).toEqual({ ok: true, name: 'El barrio' });
  });

  it('checks the length and the characters', () => {
    expect(checkGroupName('ab')).toEqual({ ok: false, problem: 'too-short' });
    expect(checkGroupName('a'.repeat(31))).toEqual({ ok: false, problem: 'too-long' });
    expect(checkGroupName('Los pibes 🔥')).toEqual({ ok: false, problem: 'invalid' });
    expect(checkGroupName('123 456')).toEqual({ ok: false, problem: 'needs-letter' });
    expect(checkGroupName('Fútbol de los jueves')).toEqual({ ok: true, name: 'Fútbol de los jueves' });
    expect(checkGroupName('¿Quién gana? 5°B')).toEqual({ ok: false, problem: 'invalid' });
    expect(checkGroupName('Los de 5to B (2026)')).toEqual({ ok: true, name: 'Los de 5to B (2026)' });
  });

  it('blocks bad words, also run together', () => {
    expect(checkGroupName('Los forros del laburo')).toEqual({ ok: false, problem: 'not-allowed' });
    expect(checkGroupName('Hijo de puta')).toEqual({ ok: false, problem: 'not-allowed' });
    expect(checkGroupName('Los b0lud0s')).toEqual({ ok: false, problem: 'not-allowed' });
  });

  it('lets innocent names through', () => {
    for (const name of ['La disputa', 'Los primos', 'Oficina de Control', 'Las chicas del cole', 'El Mejor de la oficina']) {
      expect(checkGroupName(name).ok).toBe(true);
    }
  });
});

describe('crownTitle', () => {
  it('puts "El Mejor de" or "La Mejor de" in front', () => {
    expect(crownTitle('Los del laburo')).toBe('El Mejor de Los del laburo');
    expect(crownTitle('la oficina', 'la')).toBe('La Mejor de la oficina');
  });

  it('turns "de el" into "del"', () => {
    expect(crownTitle('El barrio')).toBe('El Mejor del barrio');
    expect(crownTitle('el fortín', 'la')).toBe('La Mejor del fortín');
    expect(crownTitle('Elegidos')).toBe('El Mejor de Elegidos');
  });
});

describe('invitation codes', () => {
  it('starts with the longest word of the name', () => {
    expect(invitePrefix('Los del laburo')).toBe('LABURO');
    expect(invitePrefix('Fútbol de los jueves')).toBe('FUTBOL');
    expect(invitePrefix('Compañeros de facultad')).toBe('COMPANER');
    expect(invitePrefix('5to B')).toBe('GRUPO');
  });

  it('compares codes however they are typed', () => {
    expect(inviteKey(' laburo-7k2q ')).toBe('LABURO7K2Q');
    expect(inviteKey('LABURO 7K2Q')).toBe('LABURO7K2Q');
  });
});
