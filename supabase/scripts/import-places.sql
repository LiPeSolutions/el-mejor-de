-- Loads (or refreshes) Argentina's places from Georef, the official API of
-- datos.gob.ar: provinces, departments (partidos) and localities (BAHRA), with
-- their centers. The requests run inside the database through the http
-- extension, so run it from the Supabase SQL editor or the MCP.
--
-- Run it block by block: each statement finishes in seconds, while some
-- clients (like the MCP's execute_sql) cut long batches at 60 s. Safe to rerun:
-- it updates names and centers and keeps any radius adjusted by hand.
-- Last run: 3/10/2026 (24 provinces, 529 departments, 4037 localities).

-- 1. Prepare: the http extension and a staging table.
create extension if not exists http with schema extensions;
create table if not exists game.georef_import (resource text not null, item jsonb not null);
alter table game.georef_import enable row level security;

-- 2. Download. "materialized" makes sure each request runs exactly once.
select extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');

with response as materialized (
  select content::jsonb as body from extensions.http_get('https://apis.datos.gob.ar/georef/api/provincias?max=100')
)
insert into game.georef_import (resource, item)
select 'provincias', item from response, jsonb_array_elements(response.body -> 'provincias') as item;

with response as materialized (
  select content::jsonb as body from extensions.http_get('https://apis.datos.gob.ar/georef/api/departamentos?max=1000')
)
insert into game.georef_import (resource, item)
select 'departamentos', item from response, jsonb_array_elements(response.body -> 'departamentos') as item;

-- Georef pages its results: 1000 per request.
with meta as materialized (
  select (content::jsonb ->> 'total')::int as total
  from extensions.http_get('https://apis.datos.gob.ar/georef/api/localidades?max=1')
), pages as materialized (
  select (select content from extensions.http_get(format('https://apis.datos.gob.ar/georef/api/localidades?max=1000&inicio=%s', start))) as content
  from meta, generate_series(0, meta.total - 1, 1000) as start
)
insert into game.georef_import (resource, item)
select 'localidades', item from pages, jsonb_array_elements(pages.content::jsonb -> 'localidades') as item;

-- 3. Load into game.places.
insert into game.places (id, kind, parent_id, name)
values ('ar', 'country', null, 'Argentina')
on conflict (id) do update set name = excluded.name, updated_at = now();

insert into game.places (id, kind, parent_id, name, lat, lon)
select distinct on (item ->> 'id')
  'ar-' || (item ->> 'id'), 'province', 'ar', item ->> 'nombre',
  (item #>> '{centroide,lat}')::float8, (item #>> '{centroide,lon}')::float8
from game.georef_import
where resource = 'provincias'
on conflict (id) do update
  set name = excluded.name, lat = excluded.lat, lon = excluded.lon, updated_at = now();

insert into game.places (id, kind, parent_id, name, lat, lon)
select distinct on (item ->> 'id')
  'ar-' || (item ->> 'id'), 'department', 'ar-' || (item #>> '{provincia,id}'), item ->> 'nombre',
  (item #>> '{centroide,lat}')::float8, (item #>> '{centroide,lon}')::float8
from game.georef_import
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
from game.georef_import
left join game.places as department
  on department.id = 'ar-' || (item #>> '{departamento,id}') and department.kind = 'department'
where resource = 'localidades'
on conflict (id) do update
  set parent_id = excluded.parent_id, name = excluded.name, lat = excluded.lat, lon = excluded.lon,
    radius_km = coalesce(game.places.radius_km, excluded.radius_km), updated_at = now();

select kind, count(*) from game.places group by kind order by kind;

-- 4. Clean up. Only imports need outbound HTTP from the database. (The MCP
-- asks the project owner to confirm statements that delete things.)
drop table game.georef_import;
drop extension http;
