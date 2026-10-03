-- Loads (or refreshes) Argentina's places from Georef, the official API of
-- datos.gob.ar: provinces, departments (partidos) and localities (BAHRA), with
-- their centers. The requests run inside the database through the http
-- extension, so run it from the Supabase SQL editor or the MCP. Safe to rerun:
-- it updates names and centers and keeps any radius adjusted by hand.
create extension if not exists http with schema extensions;
select extensions.http_set_curlopt('CURLOPT_TIMEOUT', '120');

create temporary table georef (resource text not null, item jsonb not null);

insert into georef (resource, item)
select 'provincias', item
from extensions.http_get('https://apis.datos.gob.ar/georef/api/provincias?max=100') as response,
  jsonb_array_elements(response.content::jsonb -> 'provincias') as item;

-- Georef pages its results; 1000 per request is safe.
insert into georef (resource, item)
select 'departamentos', item
from generate_series(0, 1000, 1000) as page (start),
  lateral extensions.http_get(format('https://apis.datos.gob.ar/georef/api/departamentos?max=1000&inicio=%s', page.start)) as response,
  lateral jsonb_array_elements(response.content::jsonb -> 'departamentos') as item;

insert into georef (resource, item)
select 'localidades', item
from generate_series(0, 6000, 1000) as page (start),
  lateral extensions.http_get(format('https://apis.datos.gob.ar/georef/api/localidades?max=1000&inicio=%s', page.start)) as response,
  lateral jsonb_array_elements(response.content::jsonb -> 'localidades') as item;

insert into game.places (id, kind, parent_id, name)
values ('ar', 'country', null, 'Argentina')
on conflict (id) do update set name = excluded.name, updated_at = now();

insert into game.places (id, kind, parent_id, name, lat, lon)
select distinct on (item ->> 'id')
  'ar-' || (item ->> 'id'), 'province', 'ar', item ->> 'nombre',
  (item #>> '{centroide,lat}')::float8, (item #>> '{centroide,lon}')::float8
from georef
where resource = 'provincias'
on conflict (id) do update
  set name = excluded.name, lat = excluded.lat, lon = excluded.lon, updated_at = now();

insert into game.places (id, kind, parent_id, name, lat, lon)
select distinct on (item ->> 'id')
  'ar-' || (item ->> 'id'), 'department', 'ar-' || (item #>> '{provincia,id}'), item ->> 'nombre',
  (item #>> '{centroide,lat}')::float8, (item #>> '{centroide,lon}')::float8
from georef
where resource = 'departamentos'
on conflict (id) do update
  set parent_id = excluded.parent_id, name = excluded.name, lat = excluded.lat, lon = excluded.lon, updated_at = now();

-- A locality hangs from its department, or from its province when Georef has none.
insert into game.places (id, kind, parent_id, name, lat, lon, radius_km)
select distinct on (item ->> 'id')
  'ar-' || (item ->> 'id'), 'locality',
  coalesce(department.id, 'ar-' || (item #>> '{provincia,id}')),
  item ->> 'nombre',
  (item #>> '{centroide,lat}')::float8, (item #>> '{centroide,lon}')::float8,
  12
from georef
left join game.places as department
  on department.id = 'ar-' || (item #>> '{departamento,id}') and department.kind = 'department'
where resource = 'localidades'
on conflict (id) do update
  set parent_id = excluded.parent_id, name = excluded.name, lat = excluded.lat, lon = excluded.lon,
    radius_km = coalesce(game.places.radius_km, excluded.radius_km), updated_at = now();

drop table georef;

select kind, count(*) from game.places group by kind order by kind;
