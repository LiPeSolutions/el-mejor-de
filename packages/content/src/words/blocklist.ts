/**
 * Words that never count in Siete Letras, because the game is for all ages:
 * vulgar terms, sexual terms and slurs, especially as used in Argentina.
 * Normalized (uppercase, no accents, Ñ kept). Extend the lists as needed.
 */
export const BLOCKED_WORDS: readonly string[] = [
  'CAGA', 'CAGAN', 'CAGAR', 'CAGASTE', 'CAGO', 'CAGUE',
  'CAJETA', 'CAJETAS',
  'CARAJO', 'CARAJOS',
  'CHOTA', 'CHOTAS', 'CHOTO', 'CHOTOS',
  'COGE', 'COGEMOS', 'COGEN', 'COGER', 'COGERA', 'COGERAN', 'COGERIA', 'COGES', 'COGI', 'COGIDA',
  'COGIDAS', 'COGIDO', 'COGIDOS', 'COGIENDO', 'COGIERON', 'COGIO',
  'COJON', 'COJONES',
  'CONCHA', 'CONCHAS',
  'CULEAR', 'CULO', 'CULOS',
  'JODER', 'JODIDA', 'JODIDAS', 'JODIDO', 'JODIDOS',
  'MARICA', 'MARICAS',
  'MEADA', 'MEAR',
  'ORTO', 'ORTOS',
  'PENE', 'PENES',
  'PETE', 'PETERO', 'PETES',
  'PIJA', 'PIJAS', 'PIJUDO',
  'PORNO',
  'PUTA', 'PUTAS', 'PUTO', 'PUTOS',
  'SEXO', 'SEXOS',
  'SUDACA', 'SUDACAS',
  'TETA', 'TETAS', 'TETONA', 'TETONAS', 'TETUDA', 'TETUDO',
  'TROLA', 'TROLAS', 'TROLO', 'TROLOS',
  'VERGA', 'VERGAS',
];

/** Any word starting with one of these stems is blocked too. */
export const BLOCKED_PREFIXES: readonly string[] = [
  'BOLUD', 'CAGAD', 'CAGON', 'CONCHUD', 'CULEAD', 'CULIAD', 'GARCH', 'MARICON', 'MIERD',
  'PAJER', 'PELOTUD', 'PORONG', 'PUTAZ', 'PUTE', 'PUTIT',
];

const blocked = new Set(BLOCKED_WORDS);

/** `word` must already be normalized. */
export function isBlockedWord(word: string): boolean {
  return blocked.has(word) || BLOCKED_PREFIXES.some((prefix) => word.startsWith(prefix));
}
