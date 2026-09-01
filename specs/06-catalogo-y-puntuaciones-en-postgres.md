# SPEC 06 — Catálogo de juegos y puntuaciones reales en Postgres

> **Status:** implementado
> **Depends on:** SPEC 05
> **Date:** 2026-08-26
> **Objective:** Mover el catálogo de juegos y las puntuaciones a Postgres, sustituyendo `GAMES`/`CATS`/`seededScores()` por las tablas `public.games` y `public.scores`, y guardando de verdad la puntuación al terminar una partida de un juego con motor real.

## Por qué este spec existe

El SPEC 01 dejó `data/games.ts` explícitamente como maqueta: `GAMES` (8 juegos), `CATS`, `seededScores()`, `HOME_TICKER`, `HOME_TOP` y `HOME_STATS` son datos inventados que ningún archivo del repo lee de una base de datos. El SPEC 04 retiró el único intento de persistencia (`saveScore` en `localStorage`, bajo la clave `av_scores`) por ser "una maqueta de un solo navegador, sin lectores reales", y dejó el botón "GUARDAR PUNTUACIÓN" de `app/components/game-player.tsx:175` deshabilitado con el texto "PRÓXIMAMENTE". El SPEC 05 confirmó ambos huecos como fuera de alcance: "Puntuaciones reales: tabla `scores`, sustituir `seededScores()` (…) este spec no lo retoma" y "Catálogo de juegos (`GAMES`/`CATS` de `data/games.ts`) movido a Postgres" en su lista de "Out of scope".

Este spec cierra los dos huecos a la vez porque están acoplados: una tabla `scores` con FK a `games` no se puede escribir de forma sensata contra un catálogo que vive en un array de TypeScript. `rocas` es hoy el único juego con motor real jugable (`lib/games/asteroids/`, cableado en SPEC 05); es también el único que puede producir una puntuación honesta.

## Scope

**In:**

- Migración `public.games` (8 filas, sembradas desde el `GAMES` actual) con RLS de solo lectura.
- Migración `public.scores` (histórico, una fila por partida) con RLS: lectura pública, inserción solo de filas propias.
- Vista `public.game_stats` (`best`, `plays`, `last_played_at` por juego), con `security_invoker = on`.
- `lib/games-data.ts` — funciones de lectura server-side (`getGames`, `getGame`, `getCategories`, `getGameScores`, `getTopPlayers`, `getRecentScores`, `getSiteStats`), usando `lib/supabase/server.ts`. Los tipos `Game` y `ScoreRow` se mueven aquí.
- `app/biblioteca/page.tsx`, `app/juegos/[id]/page.tsx`, `app/salon/page.tsx`, `app/page.tsx` — pasan a Server Components que leen de Postgres y entregan los datos como props a sus componentes cliente (`Library`, `Leaderboard`, `HallOfFame`, `Home`), que conservan intacta su lógica de filtros/tabs en memoria.
- Estados vacíos nuevos en `Leaderboard`, `HallOfFame` (podio y tabla) y en el bloque "ACTIVIDAD EN VIVO" de `Home`, para cuando un juego o el sitio entero no tienen partidas todavía.
- `app/components/game-player.tsx`: al llegar a `onGameOver` en un juego con motor real (`hasEngine`), si hay sesión, se inserta la fila en `scores` automáticamente. El botón de guardado pasa a reflejar el estado de esa inserción (`GUARDANDO… / GUARDADO ✓ / REINTENTAR`) en vez de estar permanentemente deshabilitado. Sin sesión, muestra "INICIA SESIÓN PARA GUARDAR" en vez del botón. Se retira el input de iniciales (`nameOverride` y su `<input>`).
- `app/components/hall-of-fame.tsx`: `youRank`/`youScore` (hoy inventados en `hall-of-fame.tsx:13-14`) pasan a ser la mejor marca real del usuario para el juego activo, calculada a partir de las filas recibidas por props, u ocultarse si no tiene ninguna.
- Actualizar `CLAUDE.md`: el párrafo que dice "authentication only" y "`data/games.ts` is still mock data and scores are still not persisted anywhere", y la nota del botón "PRÓXIMAMENTE".

**Out of scope (for future specs):**

- Portar Tetris (`caida`) o Arkanoid (`bloque-buster`) — sin motor real, esos juegos y los demás 5 del catálogo siguen sin poder guardar puntuación aunque ya vivan en `public.games`.
- Página de cuenta o historial personal de partidas del usuario.
- Paginación o "cargar más" en el Salón de la Fama — cada pestaña sigue trayendo un límite fijo de filas.
- Suscripciones en tiempo real (Supabase Realtime) para el ticker de la landing; se recalcula en cada carga de página, no en vivo.
- Tipos generados de la base de datos (`database.types.ts`).
- Proteger cualquier ruta detrás de sesión.
- Panel de administración para editar el catálogo — los 8 juegos se siembran por migración y no hay UI para añadir uno noveno.
- Validación de servidor de la puntuación (rango plausible, rate limit) — ver Riesgos.
- Tests automatizados (el proyecto no tiene test runner configurado).

## Data model

```sql
-- supabase/migrations/<timestamp>_games.sql
create table public.games (
  id          text primary key,
  title       text not null,
  short       text not null,
  long        text not null,
  cat         text not null,
  cover       text not null,
  color       text not null check (color in ('cyan','magenta','yellow','green')),
  sort_order  int  not null
);

alter table public.games enable row level security;
grant select on public.games to anon, authenticated;
create policy "Catálogo visible por todos" on public.games for select using (true);

insert into public.games (id, title, short, long, cat, cover, color, sort_order) values
  ('bloque-buster', 'BLOQUE BUSTER', '...', '...', 'ARCADE',  'cover-bricks',   'cyan',    1),
  ('caida',         'CAÍDA',         '...', '...', 'PUZZLE',  'cover-tetro',    'magenta', 2),
  ('serpentina',    'SERPENTINA',    '...', '...', 'ARCADE',  'cover-snake',    'green',   3),
  ('gloton',        'GLOTÓN',        '...', '...', 'ARCADE',  'cover-glot',     'yellow',  4),
  ('invasores',     'INVASORES',     '...', '...', 'SHOOTER', 'cover-invaders', 'green',   5),
  ('rocas',         'ROCAS',         '...', '...', 'SHOOTER', 'cover-rocas',    'yellow',  6),
  ('ranaria',       'RANARIA',       '...', '...', 'ARCADE',  'cover-rana',     'green',   7),
  ('duelo-pixel',   'DUELO PIXEL',   '...', '...', 'VERSUS',  'cover-duelo',    'cyan',    8);
```

```sql
-- supabase/migrations/<timestamp>_scores.sql
create table public.scores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  game_id    text not null references public.games(id)    on delete cascade,
  score      int  not null check (score >= 0),
  played_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_played_at_idx  on public.scores (played_at desc);

alter table public.scores enable row level security;
grant select on public.scores to anon, authenticated;
grant insert on public.scores to authenticated;
create policy "Puntuaciones visibles por todos" on public.scores for select using (true);
create policy "Cada quien guarda solo su puntuación" on public.scores
  for insert with check ((select auth.uid()) = user_id);

create view public.game_stats
  with (security_invoker = on) as
  select
    game_id,
    max(score)      as best,
    count(*)        as plays,
    max(played_at)  as last_played_at
  from public.scores
  group by game_id;

grant select on public.game_stats to anon, authenticated;
```

`security_invoker = on` es obligatorio: sin él, la vista corre con los privilegios de quien la creó y `mcp__supabase__get_advisors` la marca como `security_definer_view`, exponiendo datos sin pasar por la RLS de `scores`.

Sin política de `update` ni `delete` en `scores`: una vez guardada, una puntuación es inmutable, igual que en un arcade real.

Contrato nuevo de `lib/games-data.ts` (sustituye los tipos y funciones de `data/games.ts`):

```ts
export type GameColor = "cyan" | "magenta" | "yellow" | "green";
export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: string;
  cover: string;
  color: GameColor;
  best: number;
  plays: number; // desde game_stats, 0 si no hay filas
};
export type ScoreRow = { rank: number; name: string; score: number; date: string };

export async function getGames(): Promise<Game[]>;
export async function getGame(id: string): Promise<Game | null>;
export async function getCategories(): Promise<string[]>; // "TODOS" + distinct cat
export async function getGameScores(gameId: string, limit?: number): Promise<ScoreRow[]>;
export async function getTopPlayers(
  limit?: number,
): Promise<{ rank: number; player: string; score: number }[]>;
export async function getRecentScores(
  limit?: number,
): Promise<{ player: string; game: string; score: number; when: string; color: GameColor }[]>;
export async function getSiteStats(): Promise<{ gameCount: number; playCount: number }>;
```

`data/games.ts` conserva únicamente lo que sigue siendo maqueta tras este spec: nada, si todo lo anterior se movió — el archivo se elimina. Si algún import residual necesita un tipo compartido, se reexporta desde `lib/games-data.ts`.

## Implementation plan

1. Migración `games`: crear tabla, RLS, política de lectura y `insert` con los 8 juegos actuales de `GAMES` (contenido real, no placeholders). Aplicar con `mcp__supabase__apply_migration` y versionar en `supabase/migrations/`. Verificación: `mcp__supabase__list_tables` muestra `public.games` con 8 filas; `mcp__supabase__get_advisors` sin avisos de RLS.
2. Migración `scores`: tabla, índices, RLS, políticas y la vista `game_stats` con `security_invoker`. Verificación: `mcp__supabase__execute_sql` con un `insert` de prueba usando un `user_id` inexistente falla por el `foreign key` (confirma que la FK a `profiles` está activa); `get_advisors` no reporta `security_definer_view`.
3. Crear `lib/games-data.ts` con las siete funciones del contrato, usando `createClient()` de `lib/supabase/server.ts`. `getGames`/`getGame` hacen `select` de `games` con `left join`/segunda consulta a `game_stats` para completar `best`/`plays` (0 si no hay fila). Verificación: `npx tsc --noEmit` sin errores.
4. Reescribir `app/biblioteca/page.tsx` como `async function Page()` que llama a `getGames()` y `getCategories()` y los pasa como props a `Library`; `Library` deja de importar `GAMES`/`CATS` de `data/games.ts` y recibe `games`/`cats` por props, manteniendo intacto su filtro de texto y categoría en memoria. Verificación: `/biblioteca` lista los 8 juegos con `best`/`plays` en 0 (todavía no hay puntuaciones).
5. Reescribir `app/juegos/[id]/page.tsx`: `getGame(id)` sustituye a `GAMES.find`, `notFound()` si es `null`; `getGameScores(id, 10)` sustituye a `seededScores()`. `generateMetadata` también usa `getGame`. `Leaderboard` gana un estado vacío ("AÚN NADIE HA JUGADO") cuando `rows.length === 0`. Verificación: `/juegos/rocas` muestra el mejor global real (0 antes de jugar); `/juegos/caida` muestra el estado vacío en el leaderboard.
6. Reescribir `app/salon/page.tsx` como `async function Page()` que llama a `getGames()` (para las pestañas) y, para el juego activo, a `getGameScores`; como el tab vive en estado de cliente, `HallOfFame` recibe `games` por props y hace ella misma un `fetch` server action o recibe las puntuaciones de los 8 juegos precargadas — decisión de implementación: precargar `Record<gameId, ScoreRow[]>` desde el Server Component y que `HallOfFame` solo cambie de pestaña en memoria, evitando una ida y vuelta al servidor por cada click de tab. Podio y tabla ganan estado vacío. `youRank`/`youScore` se calculan buscando la mejor fila de `user.id` en las puntuaciones ya cargadas del juego activo (no hay recorrido a null: si no tiene ninguna, se oculta el bloque "TU MEJOR MARCA"). Verificación: sin sesión no aparece el bloque "TU MEJOR MARCA"; jugando una partida de `rocas` y volviendo a `/salon`, aparece con la puntuación real.
7. Reescribir `app/page.tsx` como `async function Page()` que llama a `getRecentScores()`, `getTopPlayers()` y `getSiteStats()`, pasándolos a `Home`. `HOME_TICKER`/`HOME_TOP`/`HOME_STATS` dejan de importarse de `data/games.ts`. Ambos bloques de "ACTIVIDAD EN VIVO" ganan estado vacío ("TODAVÍA NO HAY PARTIDAS — SÉ EL PRIMERO"). El bloque de stats muestra `gameCount`/`playCount` reales; el tercer bloque ("RANKING GLOBAL") se deja como texto fijo, no es una cifra. Verificación: con `scores` vacía, la landing muestra los estados vacíos sin romperse.
8. Reescribir el guardado en `app/components/game-player.tsx`: nuevo estado `saveState: "idle" | "saving" | "saved" | "error"`; en el callback `onGameOver` del motor, si `hasEngine && user`, `insert` en `scores` vía `lib/supabase/client.ts` con `{ user_id: user.id, game_id: game.id, score: finalScore }`, actualizando `saveState`. El bloque de guardado del modal deja de mostrar el `<input>` de iniciales; el botón muestra `GUARDANDO…` (disabled), `GUARDADO ✓` (disabled) o `REINTENTAR` (retry) según `saveState`, y si `!user` muestra un enlace "INICIA SESIÓN PARA GUARDAR" hacia `/auth` en su lugar. Para juegos sin motor real (`!hasEngine`) el bloque de guardado desaparece del modal (nunca hubo partida real que guardar). Verificación: jugar `rocas` sin sesión no intenta insertar nada; jugando con sesión, tras el game over aparece `GUARDADO ✓` y la fila existe en `scores` (`mcp__supabase__execute_sql`).
9. Eliminar `data/games.ts`, `data/` si queda vacío, y todo import residual de `GAMES`/`CATS`/`seededScores`/`HOME_TICKER`/`HOME_TOP`/`HOME_STATS`. `lib/games/registry.ts` y `lib/games/types.ts` (SPEC 05) no cambian, son independientes del catálogo. Verificación: `npx tsc --noEmit` y `npm run lint` sin errores; `grep -r "data/games"` en `app/` y `lib/` no devuelve nada.
10. `npm run lint` y `npm run build`. Actualizar en `CLAUDE.md`: el párrafo de "authentication only" (el catálogo y las puntuaciones ya no son mock), y la frase sobre `data/games.ts` siendo mock data. Si `next dev` regeneró el bloque de reglas de `AGENTS.md`, commitearlo junto con el resto del trabajo. Verificación: ambos comandos terminan sin errores ni warnings.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings.
- [ ] `mcp__supabase__list_tables` muestra `public.games` (8 filas) y `public.scores` (0 filas antes de jugar); `mcp__supabase__get_advisors` no reporta avisos sobre ninguna de las dos ni sobre `game_stats`.
- [ ] `/biblioteca` lista los 8 juegos leídos de `public.games`, con filtro de texto y categoría funcionando igual que antes.
- [ ] `/juegos/rocas` muestra "Mejor global" y "Partidas" en 0 antes de jugar ninguna partida.
- [ ] Jugar una partida de `rocas` estando autenticado, morir, y ver en el modal el botón pasar de `GUARDANDO…` a `GUARDADO ✓`.
- [ ] Tras esa partida, `mcp__supabase__execute_sql` muestra una fila nueva en `public.scores` con el `user_id`, `game_id: 'rocas'` y el `score` final correctos.
- [ ] Recargar `/juegos/rocas` tras esa partida muestra "Mejor global" actualizado y la fila en la tabla de puntuaciones del juego.
- [ ] Jugar la misma partida sin sesión iniciada no intenta ningún `insert`; el modal muestra "INICIA SESIÓN PARA GUARDAR" en vez del botón de guardado.
- [ ] Cualquier juego sin motor real (los otros 7) no muestra ningún bloque de guardado en su modal de fin de partida.
- [ ] `/salon`, con la pestaña de un juego sin partidas, muestra el estado vacío en vez de un podio con nombres inventados.
- [ ] `/salon`, con la pestaña `ROCAS` tras la partida guardada, muestra esa puntuación en el podio o la tabla, y el bloque "TU MEJOR MARCA" con el valor real.
- [ ] La landing (`/`) muestra el ticker y el top de jugadores vacíos cuando `scores` está vacía, y con datos reales tras la primera partida guardada.
- [ ] Los bloques de estadísticas de la landing muestran el número real de juegos (8) y de partidas jugadas.
- [ ] `data/games.ts` ya no existe en el repo, y ningún archivo de `app/` o `lib/` lo importa.
- [ ] Intentar un `insert` en `scores` vía `mcp__supabase__execute_sql` con un `user_id` distinto al autenticado (simulando la clave publicable) falla por la política RLS.

## Decisions taken and discarded

- **Sí:** un solo spec para `games` y `scores`, en vez de dos separados. `scores.game_id` referencia a `games.id`; escribir `scores` contra el catálogo mock obligaría a rehacer la FK en cuanto se migrara el catálogo. Decisión del usuario.
- **No:** permitir que los juegos sin motor real (el `setInterval` falso) guarden puntuación. Contaminaría el ranking con números sin ninguna partida real detrás; solo `rocas` guarda hasta que se porten más juegos.
- **Sí:** `scores` como histórico (una fila por partida), no una fila por `(user, game)` con upsert de mejor marca. El histórico da el ticker de "últimas puntuaciones" de la landing gratis y no pierde información; el coste de crecer sin límite es aceptable para un proyecto de curso.
- **Sí:** `best`/`plays` derivados de una vista (`game_stats`) en vez de columnas congeladas en `games`. Una sola fuente de verdad; el coste es que ambos arrancan en 0 hasta la primera partida real, en vez de mostrar cifras vistosas de mentira.
- **No:** sembrar `scores` con puntuaciones ficticias en la migración. Habría exigido perfiles falsos en `auth.users` o hacer `user_id` nullable, y datos fantasma que limpiar después. Se prefiere un estado vacío honesto.
- **Sí:** guardado automático al game over para usuarios autenticados, sin botón de confirmación. Con auth real ya no hace falta que el jugador "decida" guardar ni escriba iniciales — su nickname ya está en `profiles`; un botón manual solo añade una forma de perder la puntuación cerrando el modal sin pulsarlo.
- **No:** aceptar invitados con nickname libre en `scores`. Abriría la puerta a suplantar el nickname de un usuario real y complica la política de `insert` (¿qué valor de `user_id`?).
- **Sí:** la landing entra en este spec (ticker y top reales). Sería inconsistente que el Salón de la Fama muestre "aún nadie ha jugado" mientras la portada sigue mostrando a NEONFOX con 184.220 puntos inventados.
- **Sí:** lectura vía Server Component (`page.tsx` async + `lib/supabase/server.ts`) que pasa props a componentes cliente, en vez de que cada componente cliente haga sus propias consultas al montar. Evita estados de carga/spinners en cuatro pantallas y sigue el patrón ya usado en `app/juegos/[id]/page.tsx` desde el SPEC 01.
- **Sí:** aceptar como riesgo que cualquiera con la clave publicable pueda insertar puntuaciones falsas directamente contra `scores`, en vez de mover el guardado a un Route Handler con validación de rango o rate limit. El juego corre íntegro en el navegador del jugador: cualquier validación de servidor sobre "¿es un score plausible?" sería igual de fácil de burlar simulando la petición. Se documenta como riesgo asumido, no se resuelve aquí.
- **Sí:** `security_invoker = on` en `game_stats`, explícitamente, en vez de dejar el valor por defecto de Postgres (`security_definer` para vistas creadas por un rol con privilegios elevados). Sin esto, el advisor de Supabase la marca como hallazgo de seguridad.
- **No:** paginación en el Salón de la Fama en este spec. Con el catálogo aún limitado a un juego jugable, el volumen de filas es bajo; se difiere hasta que el histórico crezca de verdad.

## Risks

| Risk                                                                                                                                                                                                      | Mitigation                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Solo `rocas` tiene motor real; 7 de 8 juegos del catálogo mostrarán "aún nadie ha jugado" en el Salón de la Fama y en su propia ficha indefinidamente, hasta que se porten Tetris y Arkanoid              | Aceptado explícitamente; los estados vacíos del paso 5, 6 y 7 del plan están diseñados para no verse rotos en ese caso                                                                      |
| `game.plays` real empieza en 0 y sustituye a cifras vistosas del mock (`"12.4K"`) — la biblioteca se ve visualmente más pobre al lanzar                                                                   | Aceptado; es el coste de mostrar datos reales en vez de inventados, coherente con la decisión de no sembrar `scores`                                                                        |
| El MCP de Supabase conectado no es de solo lectura y escribe directo contra el proyecto real (`infuthprfvgsjflqmsby`), sin entorno de staging                                                             | El SQL aplicado queda versionado en `supabase/migrations/`; `get_advisors` se usa como verificación posterior a cada migración, igual que en el SPEC 04                                     |
| Insertar puntuaciones directamente desde el cliente (sin Route Handler intermedio) es falsificable: cualquiera puede simular la petición con un score arbitrario, mientras respete `user_id = auth.uid()` | Riesgo aceptado por decisión explícita del usuario; documentado también en la sección de decisiones. Ninguna validación de servidor sería más robusta dado que el juego corre en el cliente |
| Una vista `security_definer` (por omisión) expondría `game_stats` sin pasar por la RLS de `scores`, filtrando agregados aunque se revocara el `select` directo sobre la tabla                             | Se fuerza `security_invoker = on` explícitamente en la migración, verificado con `get_advisors` tras aplicarla                                                                              |
| Cargar en `/salon` las puntuaciones de los 8 juegos de una sola vez en el Server Component (paso 6) puede volverse pesado si el histórico crece mucho en el futuro                                        | Cada consulta usa `limit` (10-12 filas por juego, igual que hoy `seededScores(seed, 12)`); paginación queda fuera de alcance de este spec si el volumen crece más adelante                  |
| `data/games.ts` desaparece; cualquier import residual no detectado rompería el build en vez de fallar en tiempo de ejecución                                                                              | `npx tsc --noEmit` lo atrapa en el paso 9 antes de llegar a build; es un error de compilación, no un fallo silencioso                                                                       |

## What is **not** in this spec

- Portar Tetris o Arkanoid a motor real.
- Página de cuenta o historial personal de partidas.
- Paginación del Salón de la Fama.
- Puntuaciones o ticker en tiempo real (Supabase Realtime).
- Tipos generados de la base de datos (`database.types.ts`).
- Rutas protegidas por sesión.
- Panel de administración del catálogo.
- Validación de servidor de la puntuación (rango plausible, rate limit).
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
