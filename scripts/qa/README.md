# Pruebas en el navegador

Estos scripts juegan la app en celus simulados, con Playwright y tocando la pantalla como una persona. Corren contra la app levantada en tu máquina, con una base local.

No son parte de `pnpm check`: se corren a mano después de tocar las batallas o Tubitos. Las capturas quedan en `scripts/qa/out/`, que no se sube al repo.

| Script | Qué prueba |
|---|---|
| `local-db.mjs` | Levanta la base local en `127.0.0.1:5433`: Postgres en memoria (PGlite) con todas las migraciones y la muestra de lugares (`supabase/scripts/places-sample.sql`). |
| `battle-group.cjs` | Una batalla de grupo entera con 3 celus: el aviso "Armar" en el grupo, quien se suma desde el aviso y quien entra con el link, las 5 preguntas de Cinco Preguntas y "Otro juego". Después, 3 largadas (con una adelantada), los dos podios y la pestaña "Batallas" del grupo. |
| `battle-letters.cjs` | Una batalla de Diez Letras con 3 celus: las mismas letras para todos, palabras de verdad (sacadas del diccionario) mandadas mientras se juega, una que no vale y una repetida, los puntos en vivo sin las palabras de los demás, "¡Tiempo!" y el podio con las palabras de cada uno. Dura unos 2 minutos. |
| `battle-sequence.cjs` | Una batalla de Secuencia con 3 celus: los mismos colores a la vez, uno que se equivoca y queda afuera (y mira el resto), un desempate cuando los dos que quedan se equivocan, y el podio. |
| `battle-edges.cjs` | Los casos raros: una batalla suelta desde Práctica, quien llega con la partida empezada (mira y juega la revancha), alguien que se va a mitad de una pregunta y el anfitrión que se va (pasa el mando). Al final, quien se fue ve "No estás en esta batalla". |
| `tubitos.cjs` | La práctica de Tubitos: levantar, "Ahí no", deshacer, reiniciar, resolver, la victoria, repetir, el siguiente nivel y el récord. Con `DAILY=1`, el reto del día con sus 3 niveles y el resultado. |
| `tubitos-edges.cjs` | El reto de Tubitos dejado a mitad: salir en la victoria de un nivel (cuenta lo resuelto) y cerrar la app a mitad de un nivel (cuenta como jugado). |
| `helpers.cjs` · `tubitos-board.cjs` | Piezas compartidas:<br>• los celus, las cuentas, las capturas y el informe;<br>• leer los tubos de la pantalla y resolverlos con el motor del juego, empaquetado con esbuild en cada corrida;<br>• las palabras válidas de Diez Letras, con el diccionario de verdad, empaquetado igual. |

## Una sola vez

```sh
npm install --prefix scripts/qa
```

Instala PGlite, su servidor y esbuild en `scripts/qa/node_modules`, aparte de la app.

**Playwright:**
- En las máquinas de Claude en la nube ya está, en `/opt/node-tools/node_modules/playwright`, con Chromium; los scripts lo encuentran solos.
- En otra compu:

  ```sh
  npm install --prefix scripts/qa playwright
  npx --prefix scripts/qa playwright install chromium
  ```

  O indicá dónde está con `PLAYWRIGHT_MODULE=/ruta/a/playwright`.

## Cada vez

En tres terminales, desde la raíz del repo:

```sh
# 1. La base local (déjala corriendo; al cortarla se borra todo)
node scripts/qa/local-db.mjs

# 2. La app, con esa base
cd apps/web && DATABASE_URL=postgres://app_server@127.0.0.1:5433/postgres DATABASE_POOL_MAX=1 npx next dev -p 3100

# 3. Las pruebas (ancho y alto del celu, opcionales)
node scripts/qa/battle-group.cjs 390 844
node scripts/qa/battle-edges.cjs 360 740
node scripts/qa/battle-letters.cjs 390 844
node scripts/qa/battle-sequence.cjs 360 740
node scripts/qa/tubitos.cjs 390 844
REDUCED=1 node scripts/qa/tubitos.cjs 360 740
DAILY=1 node scripts/qa/tubitos.cjs
node scripts/qa/tubitos-edges.cjs
```

**Qué devuelve cada script:**
- una línea `OK` o `FAIL` por cada control;
- los errores de la página (`ERRORS none` si no hubo);
- si algo falló, sale con código 1.

Mirá las capturas: un `OVERFLOW-X` en la consola quiere decir que la página se sale de costado.

**Variables:**
- `BASE`: dónde está la app; por defecto, `http://localhost:3100`.
- `QA_OUT`: la carpeta de las capturas.
- `PLAYWRIGHT_MODULE`: dónde está Playwright.
- `REDUCED=1`: movimiento reducido.
- `DAILY=1`: el reto del día de Tubitos.

## Para tener en cuenta

- **La primera vez que se abre cada página tarda**, porque Next.js la compila; los scripts esperan hasta 20 s. Si una corrida falla por tiempo justo al empezar, corréla de nuevo.
- **Abrí `localhost`, no `127.0.0.1`:** en `127.0.0.1` Next.js bloquea sus scripts de desarrollo.
- **Cuentas:** cada corrida de las batallas crea 3 cuentas nuevas. Si saltara el límite de cuentas por conexión, reiniciá la base (es en memoria) o borrá `game.auth_events`.
- **Tubitos en el reto del día:** juega 3 de cada 5 días, desde el **5/10/2026**. Los otros días, `DAILY=1` y `tubitos-edges.cjs` dicen `SKIP`.
- **Un solo intento:** el reto del día se juega una vez por navegador. Cada script abre celus nuevos, así que siempre arranca de cero.
- **Para sumar un juego a las batallas,** agregá su partida a `battle-group.cjs`, siguiendo la de Cinco Preguntas (ver [docs/BATALLAS.md](../../docs/BATALLAS.md) §12).
