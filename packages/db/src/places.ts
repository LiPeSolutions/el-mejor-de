import type { Queryable } from './queryable';

export interface LocalityMatch {
  id: string;
  name: string;
  department: string | null;
  province: string | null;
}

/** Same normalization as game.search_name, plus only letters, digits and spaces. */
export function searchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Localities whose name contains the text; names that start with it come first. */
export async function searchLocalities(db: Queryable, text: string, limit = 10): Promise<LocalityMatch[]> {
  const query = searchText(text);
  if (query.length < 2) return [];
  return db.query<LocalityMatch>(
    `select locality.id, locality.name,
       department.name as department,
       coalesce(province.name, direct_province.name) as province
     from game.places as locality
     left join game.places as department on department.id = locality.parent_id and department.kind = 'department'
     left join game.places as province on province.id = department.parent_id
     left join game.places as direct_province on direct_province.id = locality.parent_id and direct_province.kind = 'province'
     where locality.kind = 'locality' and locality.search_name like '%' || $1 || '%'
     order by (locality.search_name like $1 || '%') desc, length(locality.name), locality.name
     limit $2::int`,
    [query, limit],
  );
}
