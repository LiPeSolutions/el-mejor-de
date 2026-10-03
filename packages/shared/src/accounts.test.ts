import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR, checkPassword, checkUsername, isUsernameBlocked, parseAvatar, usernameKey } from './accounts';

describe('usernameKey', () => {
  it('ignores case and accents, like the database', () => {
    expect(usernameKey('Tinchó')).toBe('tincho');
    expect(usernameKey('ÑOÑO')).toBe('nono');
    expect(usernameKey('Mati.R_9')).toBe('mati.r_9');
  });
});

describe('checkUsername', () => {
  it('accepts the apodos of the design', () => {
    for (const name of ['Tincho', 'LaFlor', 'Colo_88', 'Juli', 'Nico', 'Mati.R', 'Caro', 'Pato', 'Ñandú', 'Pato2010']) {
      expect(checkUsername(name)).toEqual({ ok: true, username: name });
    }
  });

  it('trims spaces around it', () => {
    expect(checkUsername('  Tincho ')).toEqual({ ok: true, username: 'Tincho' });
  });

  it('explains what is wrong', () => {
    expect(checkUsername('Yo')).toEqual({ ok: false, problem: 'too-short' });
    expect(checkUsername('ElMasCapoDelBarrio')).toEqual({ ok: false, problem: 'too-long' });
    expect(checkUsername('Tin cho')).toEqual({ ok: false, problem: 'invalid' });
    expect(checkUsername('_tincho')).toEqual({ ok: false, problem: 'invalid' });
    expect(checkUsername('tin..cho')).toEqual({ ok: false, problem: 'invalid' });
    expect(checkUsername('tincho!')).toEqual({ ok: false, problem: 'invalid' });
    expect(checkUsername('2010')).toEqual({ ok: false, problem: 'needs-letter' });
    expect(checkUsername('Pelotudo')).toEqual({ ok: false, problem: 'not-allowed' });
  });
});

describe('isUsernameBlocked', () => {
  it('catches insults, also disguised', () => {
    for (const name of ['puto', 'PUTO99', 'pu70', 'el_puto', 'putoelquelee', 'soyforro', 'puuuuto', 'boludazo', 'cu1o', 'hdp', 'Hitlerito', 'kkk']) {
      expect(isUsernameBlocked(name), name).toBe(true);
    }
  });

  it('keeps innocent names that contain those letters', () => {
    for (const name of ['Pijama', 'Vergara', 'Penelope', 'Conchita', 'Computadora', 'Disputa', 'Pajarito', 'Vehiculo', 'Ortiz', 'Nazira', 'Tetris', 'Escoger', 'Forrest', 'Sexto', 'Putin', 'Controla']) {
      expect(isUsernameBlocked(name), name).toBe(false);
    }
  });

  it('reserves names that could pass for the game', () => {
    for (const name of ['Admin', 'administrador', 'ElMejor', 'LaMejorDeTodas', 'Soporte', 'vos']) {
      expect(isUsernameBlocked(name), name).toBe(true);
    }
  });
});

describe('checkPassword', () => {
  it('asks for 8 characters or more', () => {
    expect(checkPassword('corto')).toBe('too-short');
    expect(checkPassword('una frase larga')).toBeNull();
  });

  it('rejects the ones people try first', () => {
    expect(checkPassword('12345678')).toBe('too-common');
    expect(checkPassword('Contraseña')).toBe('too-common');
    expect(checkPassword('aaaaaaaa')).toBe('too-common');
  });

  it('rejects the apodo itself', () => {
    expect(checkPassword('Tincho1234', 'tincho1234')).toBe('same-as-username');
    expect(checkPassword('Tincho1234', 'Tincho')).toBeNull();
  });
});

describe('parseAvatar', () => {
  it('accepts a valid character', () => {
    expect(parseAvatar(DEFAULT_AVATAR)).toEqual(DEFAULT_AVATAR);
    expect(parseAvatar({ species: 'rana', color: 'azul', accessory: null })).toEqual({ species: 'rana', color: 'azul', accessory: null });
  });

  it('rejects anything else, including the crown', () => {
    expect(parseAvatar(null)).toBeNull();
    expect(parseAvatar({ species: 'dragon', color: 'azul', accessory: null })).toBeNull();
    expect(parseAvatar({ species: 'rana', color: 'fucsia', accessory: null })).toBeNull();
    expect(parseAvatar({ species: 'rana', color: 'azul', accessory: 'corona' })).toBeNull();
    expect(parseAvatar({ species: 'rana', color: 'azul' })).toBeNull();
  });
});
