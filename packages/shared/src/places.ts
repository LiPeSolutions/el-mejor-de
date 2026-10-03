/**
 * Places and location checks (docs/PLAN.md §5), shared by the browser and
 * the server. The server has the last word: it gets the position, decides,
 * and keeps only the result.
 */

export type PlaceLevel = 'locality' | 'province' | 'country';
export const PLACE_LEVELS = ['locality', 'province', 'country'] as const satisfies readonly PlaceLevel[];

export const LOCATION_RULES = {
  /** Around a locality's center, when the place has no radius of its own. */
  radiusKm: 12,
  /** Worse than this, the position doesn't say where you are. */
  maxAccuracyMeters: 5000,
  /** The countryside: being in the same department (partido) as the nearest locality, if it's this close. */
  countrysideMaxKm: 40,
  /** Ciudad de Buenos Aires: your barrio has to be one of the nearest ones, and close. */
  cityNearestBarrios: 3,
  cityMaxKm: 4,
  /** Location checks per account per hour. */
  checksPerHour: 20,
} as const;

/** The Ciudad de Buenos Aires: a province for the rankings, with its barrios as localities. */
export const CITY_PROVINCE_ID = 'ar-02';
/** Georef's generic "Ciudad de Buenos Aires" locality: not offered, since the city competes by barrio. */
export const CITY_GENERIC_LOCALITY_ID = 'ar-02014010';
export const COUNTRY_ID = 'ar';

export interface Point {
  lat: number;
  lon: number;
}

/** Great-circle distance in kilometers. */
export function distanceKm(a: Point, b: Point): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface LocalityNearby {
  id: string;
  departmentId: string;
  provinceId: string;
  radiusKm: number | null;
  /** Distance from the position, in km. */
  km: number;
}

/**
 * Whether a position verifies `chosen`. `nearby` are the localities closest
 * to the position, nearest first (the chosen one may or may not be there):
 * - within the locality's radius of its center;
 * - in the countryside, in the same department as the nearest locality;
 * - in the city, the barrio is one of the nearest ones, and close.
 */
export function verifiesLocality(chosen: LocalityNearby, nearby: readonly LocalityNearby[]): boolean {
  const pool = nearby.filter((locality) => locality.id !== CITY_GENERIC_LOCALITY_ID);
  if (chosen.id === CITY_GENERIC_LOCALITY_ID) return false;
  if (chosen.provinceId === CITY_PROVINCE_ID) {
    return pool
      .filter((locality) => locality.provinceId === CITY_PROVINCE_ID)
      .slice(0, LOCATION_RULES.cityNearestBarrios)
      .some((barrio) => barrio.id === chosen.id && barrio.km <= LOCATION_RULES.cityMaxKm);
  }
  if (chosen.km <= (chosen.radiusKm ?? LOCATION_RULES.radiusKm)) return true;
  const nearest = pool.find((locality) => locality.provinceId !== CITY_PROVINCE_ID);
  return nearest !== undefined && nearest.km <= LOCATION_RULES.countrysideMaxKm && nearest.departmentId === chosen.departmentId;
}

/** The localities a position verifies, nearest first: the choices for "Usar mi ubicación". */
export function verifiableLocalities<T extends LocalityNearby>(nearby: readonly T[], limit = 6): T[] {
  return nearby.filter((locality) => verifiesLocality(locality, nearby)).slice(0, limit);
}

/** A position from the browser, checked: real coordinates and a usable accuracy. */
export function checkPosition(value: { lat: unknown; lon: unknown; accuracy: unknown }): { ok: true; point: Point; accuracy: number } | { ok: false; problem: 'invalid' | 'inaccurate' } {
  const { lat, lon, accuracy } = value;
  if (typeof lat !== 'number' || typeof lon !== 'number' || typeof accuracy !== 'number') return { ok: false, problem: 'invalid' };
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || !(accuracy >= 0)) return { ok: false, problem: 'invalid' };
  if (accuracy > LOCATION_RULES.maxAccuracyMeters) return { ok: false, problem: 'inaccurate' };
  return { ok: true, point: { lat, lon }, accuracy };
}

export interface PlaceNames {
  /** For chips and lists: "Ciudad de Buenos Aires". */
  short: string;
  /** After "El Mejor de": "la Ciudad de Buenos Aires". */
  crown: string;
}

const SPECIAL_NAMES: Record<string, PlaceNames> = {
  [CITY_PROVINCE_ID]: { short: 'Ciudad de Buenos Aires', crown: 'la Ciudad de Buenos Aires' },
  'ar-94': { short: 'Tierra del Fuego', crown: 'Tierra del Fuego' },
};

/** How a place is named in the app: the official names of a couple of provinces are long. */
export function placeNames(id: string, officialName: string): PlaceNames {
  return SPECIAL_NAMES[id] ?? { short: officialName, crown: officialName };
}
