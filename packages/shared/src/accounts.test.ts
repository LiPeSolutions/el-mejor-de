import { describe, expect, it } from 'vitest';
import { AVATAR_SPECIES, DEFAULT_AVATAR, avatarWear, checkPassword, checkUsername, isUsernameBlocked, parseAvatar, usernameKey, type Avatar } from './accounts';

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
  /** Juli, from the design's examples: every new field set. */
  const JULI: Avatar = {
    species: 'gato',
    color: 'violeta',
    accessory: null,
    detail: 'rosa',
    eyes: 'pestanas',
    hair: null,
    marks: 'rayas',
    outfit: 'camiseta',
    outfitColor: 'azul',
    number: 0,
    head: 'mono',
    face: null,
    neck: null,
    hand: 'celu',
    background: 'rosa',
  };

  it('accepts the first version\'s shape, as it is saved', () => {
    expect(parseAvatar(DEFAULT_AVATAR)).toEqual(DEFAULT_AVATAR);
    expect(parseAvatar({ species: 'rana', color: 'azul', accessory: null })).toEqual({ species: 'rana', color: 'azul', accessory: null });
  });

  it('accepts the 17 species', () => {
    expect(AVATAR_SPECIES).toHaveLength(17);
    for (const species of AVATAR_SPECIES) expect(parseAvatar({ species, color: 'natural', accessory: null })?.species).toBe(species);
  });

  it('accepts the new fields, and leaves out the missing ones', () => {
    expect(parseAvatar(JULI)).toEqual(JULI);
    expect(parseAvatar({ species: 'perro', color: 'dorado', accessory: null, marks: 'parche', number: 99 })).toEqual({
      species: 'perro',
      color: 'dorado',
      accessory: null,
      marks: 'parche',
      number: 99,
    });
  });

  it('drops what it doesn\'t know, like the crown flag of the design\'s examples', () => {
    expect(parseAvatar({ ...DEFAULT_AVATAR, hasCrown: true })).toEqual(DEFAULT_AVATAR);
  });

  it('rejects anything else, including the crown', () => {
    expect(parseAvatar(null)).toBeNull();
    expect(parseAvatar({ species: 'dragon', color: 'azul', accessory: null })).toBeNull();
    expect(parseAvatar({ species: 'rana', color: 'fucsia', accessory: null })).toBeNull();
    expect(parseAvatar({ species: 'rana', color: 'azul', accessory: 'corona' })).toBeNull();
    expect(parseAvatar({ species: 'rana', color: 'azul' })).toBeNull();
    expect(parseAvatar({ ...JULI, head: 'corona' })).toBeNull();
  });

  it('rejects a new field with a wrong value', () => {
    expect(parseAvatar({ ...JULI, eyes: 'tristes' })).toBeNull();
    expect(parseAvatar({ ...JULI, detail: 'natural' })).toBeNull();
    expect(parseAvatar({ ...JULI, outfit: 'frac' })).toBeNull();
    expect(parseAvatar({ ...JULI, hand: 'anteojos' })).toBeNull();
    expect(parseAvatar({ ...JULI, background: 'negro' })).toBeNull();
    // These have a default, not a "nothing".
    expect(parseAvatar({ ...JULI, eyes: null })).toBeNull();
    expect(parseAvatar({ ...JULI, outfitColor: null })).toBeNull();
    expect(parseAvatar({ ...JULI, background: null })).toBeNull();
  });

  it('takes shirt numbers from 0 to 99, whole', () => {
    expect(parseAvatar({ ...JULI, number: 100 })).toBeNull();
    expect(parseAvatar({ ...JULI, number: -1 })).toBeNull();
    expect(parseAvatar({ ...JULI, number: 9.5 })).toBeNull();
    expect(parseAvatar({ ...JULI, number: '9' })).toBeNull();
  });
});

describe('avatarWear', () => {
  it('puts the first version\'s accessory in its zone', () => {
    expect(avatarWear({ species: 'zorro', color: 'natural', accessory: 'boina' })).toEqual({ head: 'boina', face: null, neck: null, hand: null });
    expect(avatarWear({ species: 'zorro', color: 'natural', accessory: 'gorra' }).head).toBe('gorra');
    expect(avatarWear(DEFAULT_AVATAR)).toEqual({ head: null, face: 'anteojos', neck: null, hand: null });
    expect(avatarWear({ species: 'zorro', color: 'natural', accessory: 'bufanda' }).neck).toBe('bufanda');
    expect(avatarWear({ species: 'zorro', color: 'natural', accessory: 'mate' }).hand).toBe('mate');
  });

  it('lets a set zone win over the old accessory, even when it says "nothing"', () => {
    expect(avatarWear({ species: 'zorro', color: 'natural', accessory: 'boina', head: 'vincha', hand: 'celu' })).toEqual({ head: 'vincha', face: null, neck: null, hand: 'celu' });
    expect(avatarWear({ species: 'zorro', color: 'natural', accessory: 'anteojos', face: null }).face).toBeNull();
    // A zone the old accessory doesn't go to doesn't touch it.
    expect(avatarWear({ species: 'zorro', color: 'natural', accessory: 'anteojos', head: null }).face).toBe('anteojos');
  });
});
