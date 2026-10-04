/**
 * Words that never count in Diez Letras, because the game is for all ages
 * (docs/PLAN.md, decisions). Neutral body and biology words do count (pene,
 * vagina, sexo, embarazo), and so do common drug names (droga, cocaína) and
 * ordinary violence (matar, guerra). Out: erotic and sexual words, vulgar
 * words (body parts included), insults and slurs, drug slang and sexual
 * violence. Normalized (uppercase, no accents, Ñ kept). After a change, run
 * pnpm build:words.
 */
export const BLOCKED_WORDS: readonly string[] = [
  // Erotic and sexual.
  'BURDEL', 'BURDELES', 'CALENTON', 'CALENTONA', 'CALENTONAS', 'CALENTONES', 'COGE', 'COGEMOS',
  'COGEN', 'COGES', 'COITO', 'COITOS', 'FOLLA', 'FOLLAMOS', 'FOLLAN', 'FOLLAS', 'FOLLE', 'FOLLEN',
  'FOLLES', 'FOLLO', 'LIBIDO', 'MAMADA', 'MAMADAS', 'MERETRICES', 'MERETRIZ', 'PETE', 'PETERA',
  'PETERO', 'PETES', 'PUTA', 'PUTAS', 'PUTO', 'PUTOS', 'RAMERA', 'RAMERAS', 'REPUTA', 'REPUTAS',
  'REPUTO', 'REPUTOS',
  // Vulgar, body parts included.
  'BOLAZO', 'BOLAZOS', 'CABRON', 'CABRONA', 'CABRONAZO', 'CABRONES', 'CAGO', 'CAJETA', 'CAJETAS',
  'CARAJO', 'CARAJOS', 'CHOTA', 'CHOTAS', 'CHOTO', 'CHOTOS', 'COJON', 'COJONES', 'COJUDA', 'COJUDO',
  'CONCHA', 'CONCHAS', 'COÑAZO', 'COÑO', 'COÑOS', 'CULITO', 'CULITOS', 'CULO', 'CULON', 'CULONA',
  'CULONAS', 'CULONES', 'HUEVON', 'HUEVONA', 'HUEVONADA', 'HUEVONES', 'MAMON', 'MAMONA', 'MAMONES',
  'MEA', 'MEABA', 'MEABAN', 'MEADA', 'MEADAS', 'MEAN', 'MEANDO', 'MEAR', 'MEARON', 'MEAS', 'MEE',
  'MEEN', 'MEES', 'MEON', 'MEONA', 'MEONES', 'ORTIVA', 'ORTIVAS', 'ORTO', 'ORTOS', 'PIJA', 'PIJAS',
  'PIJOTEAR', 'PIJOTERA', 'PIJOTERO', 'PIJUDO', 'POLLA', 'POLLAS', 'QUILOMBERA', 'QUILOMBERO',
  'QUILOMBO', 'QUILOMBOS', 'TETA', 'TETAS', 'TETONA', 'TETONAS', 'TETUDA', 'TETUDAS', 'TETUDO',
  'TETUDOS', 'VERGA', 'VERGAS',
  // Insults and slurs.
  'BOLLERA', 'BOLLERAS', 'CHINGO', 'CHINGON', 'CHINGONA', 'CHINGONES', 'CORNUDA', 'CORNUDO',
  'CORNUDOS', 'GARCA', 'GARCAS', 'GRONCHA', 'GRONCHAS', 'GRONCHO', 'GRONCHOS', 'MALPARIDA',
  'MALPARIDAS', 'MALPARIDO', 'MALPARIDOS', 'MARICA', 'MARICAS', 'MOGOLICA', 'MOGOLICAS', 'MOGOLICO',
  'MOGOLICOS', 'MONGOLICA', 'MONGOLICAS', 'MONGOLICO', 'MONGOLICOS', 'NEGRADA', 'PERUCA', 'PERUCAS',
  'SUBNORMAL', 'SUBNORMALES', 'SUDACA', 'SUDACAS', 'TORTILLERA', 'TORTILLERAS', 'TRAVA', 'TRAVAS',
  'TROLA', 'TROLAS', 'TROLO', 'TROLOS',
  // Drug slang.
  'FASO', 'FASOS', 'MERCA', 'MERCAS', 'PORRERA', 'PORRERO', 'PORRO', 'PORROS', 'TRANZA', 'TRANZAS',
  // Sexual violence (the stems below cover the rest).
  'INCESTO', 'VIOLASE', 'VIOLASEN', 'VIOLO',
];

/** Any word starting with one of these stems is blocked too. */
export const BLOCKED_PREFIXES: readonly string[] = [
  // Erotic and sexual.
  'ARRECH', 'CACHOND', 'COGER', 'COGI', 'CULEA', 'CULIA', 'DESVIRG', 'EROTI', 'EXCIT', 'EYACULA',
  'FOLLAB', 'FOLLAD', 'FOLLAND', 'FOLLAR', 'FORNICA', 'FORNIQU', 'GARCH', 'LASCIV', 'LIBIDIN',
  'LUJURI', 'MASTURB', 'NECROFIL', 'ORGASM', 'ORGIA', 'PAJEA', 'PAJER', 'PORNO', 'PROSTIBUL',
  'PROSTITU', 'PROXENET', 'PUTAZ', 'PUTAÑ', 'PUTE', 'PUTIT', 'SODOMI', 'ZOOFIL',
  // Vulgar.
  'ACOJON', 'CAGA', 'CAGON', 'CAGUE', 'COJONUD', 'DESCOJON', 'ENCABRON', 'ENMIERD', 'JOD', 'MIERD',
  'PORONG',
  // Insults and slurs.
  'BOLUD', 'CHINGA', 'CHINGUE', 'CONCHUD', 'GILIPOLL', 'HIJOPUT', 'HIJUEPUT', 'MARICON', 'PELOTUD',
  'PENDEJ',
  // Drug slang.
  'FALOP',
  // Sexual violence.
  'ESTUPR', 'INCESTU', 'PEDERAST', 'PEDOFIL', 'VIOLAB', 'VIOLACI', 'VIOLAD', 'VIOLAND', 'VIOLAR',
  'VIOLAST',
];

const blocked = new Set(BLOCKED_WORDS);

/** `word` must already be normalized. */
export function isBlockedWord(word: string): boolean {
  return blocked.has(word) || BLOCKED_PREFIXES.some((prefix) => word.startsWith(prefix));
}
