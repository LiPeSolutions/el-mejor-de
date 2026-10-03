import { describe, expect, it } from 'vitest';
import { checkPosition, distanceKm, placeNames, verifiableLocalities, verifiesLocality, type LocalityNearby, type Point } from './places';

/** Real centers from Georef (datos.gob.ar). */
const PLACES = [
  { id: 'ar-06224010', name: 'Chivilcoy', departmentId: 'ar-06224', provinceId: 'ar-06', lat: -34.8969, lon: -60.01909 },
  { id: 'ar-06224020', name: 'Emilio Ayarza', departmentId: 'ar-06224', provinceId: 'ar-06', lat: -34.74373, lon: -60.0391 },
  { id: 'ar-06224030', name: 'Gorostiaga', departmentId: 'ar-06224', provinceId: 'ar-06', lat: -34.8388, lon: -59.86601 },
  { id: 'ar-06224050', name: 'Moquehuá', departmentId: 'ar-06224', provinceId: 'ar-06', lat: -35.09221, lon: -59.77571 },
  { id: 'ar-06021010', name: 'Alberti', departmentId: 'ar-06021', provinceId: 'ar-06', lat: -35.03157, lon: -60.28029 },
  { id: 'ar-06784020', name: 'Suipacha', departmentId: 'ar-06784', provinceId: 'ar-06', lat: -34.76881, lon: -59.68683 },
  { id: 'ar-0204201001', name: 'Caballito', departmentId: 'ar-02042', provinceId: 'ar-02', lat: -34.61627, lon: -58.44055 },
  { id: 'ar-0203501001', name: 'Almagro', departmentId: 'ar-02035', provinceId: 'ar-02', lat: -34.60578, lon: -58.4191 },
  { id: 'ar-0203501002', name: 'Boedo', departmentId: 'ar-02035', provinceId: 'ar-02', lat: -34.62558, lon: -58.41609 },
  { id: 'ar-0204901001', name: 'Flores', departmentId: 'ar-02049', provinceId: 'ar-02', lat: -34.62853, lon: -58.46369 },
  { id: 'ar-0210501005', name: 'Villa Crespo', departmentId: 'ar-02105', provinceId: 'ar-02', lat: -34.59988, lon: -58.43881 },
  { id: 'ar-0209801001', name: 'Palermo', departmentId: 'ar-02098', provinceId: 'ar-02', lat: -34.58124, lon: -58.42102 },
  { id: 'ar-02014010', name: 'Ciudad de Buenos Aires', departmentId: 'ar-02014', provinceId: 'ar-02', lat: -34.60842, lon: -58.37213 },
];

/** The localities around a point, nearest first, as the database answers. */
function around(point: Point): (LocalityNearby & { name: string })[] {
  return PLACES.map((place) => ({ ...place, radiusKm: 12, km: distanceKm(point, place) })).sort((a, b) => a.km - b.km);
}

const byName = (nearby: ReturnType<typeof around>, name: string) => nearby.find((place) => place.name === name)!;

describe('distanceKm', () => {
  it('measures real distances', () => {
    const chivilcoy = PLACES[0]!;
    const caballito = PLACES[6]!;
    expect(distanceKm(chivilcoy, caballito)).toBeGreaterThan(145);
    expect(distanceKm(chivilcoy, caballito)).toBeLessThan(150);
    expect(distanceKm(chivilcoy, chivilcoy)).toBe(0);
  });
});

describe('verifiesLocality', () => {
  it('accepts being near the center of the town', () => {
    const nearby = around({ lat: -34.9, lon: -60.03 });
    expect(verifiesLocality(byName(nearby, 'Chivilcoy'), nearby)).toBe(true);
    expect(verifiesLocality(byName(nearby, 'Suipacha'), nearby)).toBe(false);
  });

  it('accepts the countryside of the same partido', () => {
    // 25 km from Chivilcoy, out in the fields: nearer to Moquehuá, also in the partido of Chivilcoy.
    const nearby = around({ lat: -35.02, lon: -59.85 });
    expect(byName(nearby, 'Chivilcoy').km).toBeGreaterThan(12);
    expect(verifiesLocality(byName(nearby, 'Chivilcoy'), nearby)).toBe(true);
    expect(verifiesLocality(byName(nearby, 'Alberti'), nearby)).toBe(false);
  });

  it('in the city, only your barrio or one of the nearest', () => {
    const nearby = around({ lat: -34.618, lon: -58.442 }); // Caballito
    expect(verifiesLocality(byName(nearby, 'Caballito'), nearby)).toBe(true);
    expect(verifiesLocality(byName(nearby, 'Palermo'), nearby)).toBe(false);
    expect(verifiesLocality(byName(nearby, 'Ciudad de Buenos Aires'), nearby)).toBe(false);
  });

  it('works for a locality that is not among the nearest', () => {
    const point = { lat: -34.9, lon: -60.03 };
    const far = { id: 'ar-50098070', departmentId: 'ar-50098', provinceId: 'ar-50', radiusKm: 12, km: distanceKm(point, { lat: -33.04266, lon: -68.44791 }) };
    expect(verifiesLocality(far, around(point))).toBe(false);
  });
});

describe('verifiableLocalities', () => {
  it('lists the choices nearest first, without the generic city', () => {
    const near = verifiableLocalities(around({ lat: -34.9, lon: -60.03 })).map((place) => place.name);
    expect(near[0]).toBe('Chivilcoy');
    expect(near).not.toContain('Suipacha');
    const city = verifiableLocalities(around({ lat: -34.618, lon: -58.442 })).map((place) => place.name);
    expect(city).toEqual(['Caballito', 'Villa Crespo', 'Flores']);
  });
});

describe('checkPosition', () => {
  it('needs real coordinates and a usable accuracy', () => {
    expect(checkPosition({ lat: -34.6, lon: -58.4, accuracy: 30 })).toEqual({ ok: true, point: { lat: -34.6, lon: -58.4 }, accuracy: 30 });
    expect(checkPosition({ lat: -34.6, lon: -58.4, accuracy: 9000 })).toEqual({ ok: false, problem: 'inaccurate' });
    expect(checkPosition({ lat: 120, lon: 0, accuracy: 5 })).toEqual({ ok: false, problem: 'invalid' });
    expect(checkPosition({ lat: '1', lon: 0, accuracy: 5 })).toEqual({ ok: false, problem: 'invalid' });
  });
});

describe('placeNames', () => {
  it('shortens the long official names', () => {
    expect(placeNames('ar-02', 'Ciudad Autónoma de Buenos Aires')).toEqual({ short: 'Ciudad de Buenos Aires', crown: 'la Ciudad de Buenos Aires' });
    expect(placeNames('ar-06', 'Buenos Aires')).toEqual({ short: 'Buenos Aires', crown: 'Buenos Aires' });
  });
});
