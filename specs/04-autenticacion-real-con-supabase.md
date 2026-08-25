# SPEC 04 — Autenticación real con Supabase

> **Status:** implementado 
> **Depends on:** SPEC 01
> **Date:** 2026-08-21
> **Objective:** Sustituir la sesión fake de `localStorage` por autenticación real de Supabase con correo y contraseña, respaldada por un perfil de jugador (`nickname`) en Postgres.

## Por qué este spec existe

El SPEC 01 introdujo una "sesión fake en cliente" (`app/components/session-provider.tsx`) explícitamente como maqueta: `User` es `{ name: string }` guardado en `localStorage` bajo la clave `av_user`, y `app/components/auth-form.tsx:15-19` hace `signIn({ name: username })` sin tocar la contraseña ni el correo que el usuario escribe. Cualquiera "entra" como cualquiera, y no hay backend real (`CLAUDE.md` documenta que el proyecto no usa Supabase todavía).

Este spec cierra ese hueco para el login: el registro y el inicio de sesión pasan a ser reales, con Supabase Auth y una tabla `profiles` en Postgres. Es el primer uso real del proyecto Supabase (`infuthprfvgsjflqmsby`, ya conectado por MCP con esquema `public` vacío) y la primera vez que el repo usa cookies de sesión.

Un hallazgo colateral, no arreglado aquí: `av_scores` es _write-only_ — `saveScore()` escribe ahí pero ningún archivo del repo lo lee nunca; todas las tablas de puntuaciones (`/salon`, el detalle de juego) salen del generador mock `seededScores()`. Persistir puntuaciones reales queda para otro spec.

## Scope

**In:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr` añadidas a `package.json`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, en `.env.local` (no versionado) y `.env.example` (versionado).
- `lib/supabase/client.ts` — cliente de navegador (`createBrowserClient`).
- `lib/supabase/server.ts` — cliente de servidor `async`, con `await cookies()` de `next/headers`.
- `lib/supabase/proxy.ts` (`updateSession`) y `proxy.ts` en la raíz del proyecto — refresco de token en cada request, sin proteger ninguna ruta.
- Migración SQL con la tabla `public.profiles`, el trigger que la puebla al registrarse, y sus políticas RLS — aplicada vía MCP y versionada en `supabase/migrations/`.
- Reescritura de `app/components/session-provider.tsx`: fuera `useSyncExternalStore` + `localStorage`; dentro `onAuthStateChange` de Supabase. Nuevo contrato: `user`, `loading`, `signUp`, `signIn`, `signOut`.
- `app/components/auth-form.tsx` con registro y login reales, validación, estados de carga y error, y una pantalla de "revisa tu correo" tras registrarse. El botón "JUGAR COMO INVITADO" pasa de `signIn(null)` a un `Link` directo a `/biblioteca`.
- `app/auth/confirm/route.ts` — Route Handler que confirma el correo con `verifyOtp`.
- `app/components/nav.tsx` y `app/components/hall-of-fame.tsx` adaptados al `Profile` nuevo (`user.nickname` en vez de `user.name`).
- El botón "GUARDAR PUNTUACIÓN" de `app/components/game-player.tsx` deja de fingir que guarda: se deshabilita con una nota de "próximamente", ya que su destino real (una tabla `scores`) no es parte de este spec.
- Actualizar el párrafo de `CLAUDE.md` que dice "The app does not use Supabase yet".

**Out of scope (for future specs):**

- Puntuaciones reales: tabla `scores`, sustituir `seededScores()` por datos reales de partidas. `av_scores` no se migra.
- Catálogo de juegos (`GAMES`/`CATS` de `data/games.ts`) movido a Postgres.
- OAuth con Google o GitHub: los botones de `auth-form.tsx` siguen sin `onClick`.
- Auth anónima de Supabase, recuperación de contraseña, cambio de correo o borrado de cuenta.
- Página `/cuenta`, edición de perfil, avatares y Supabase Storage.
- Proteger cualquier ruta detrás de sesión (`/juegos/[id]/jugar` sigue siendo pública).
- Tipos generados de la base de datos (`database.types.ts`).
- Tests automatizados (el proyecto no tiene test runner configurado).

## Data model

```sql
-- supabase/migrations/<timestamp>_profiles.sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  created_at timestamptz not null default now(),
  constraint nickname_length check (char_length(nickname) between 3 and 10)
);

alter table public.profiles enable row level security;
grant select on public.profiles to anon;
grant select, update on public.profiles to authenticated;

create policy "Perfiles visibles por todos" on public.profiles
  for select using (true);
create policy "Cada quien actualiza su perfil" on public.profiles
  for update using ((select auth.uid()) = id);

create function public.handle_new_user()
returns trigger
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, upper(new.raw_user_meta_data->>'nickname'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

No hay política de `insert`: la única fila la crea el trigger, que corre como `security definer`. El límite de 3–10 caracteres del `nickname` encaja con el `slice(0, 10)` que ya hace `auth-form.tsx:17` al normalizar el nombre. `nickname` se guarda en mayúsculas, igual que el `User.name` actual.

Contrato nuevo de `app/components/session-provider.tsx` (reemplaza `User = { name: string }`):

```ts
export type Profile = { id: string; email: string; nickname: string };

type SessionContextValue = {
  user: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    nickname: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};
```

`saveScore` se elimina del contrato: hoy escribe en un `av_scores` que nadie lee, y no tiene reemplazo real dentro de este spec.

Variables de entorno (`.env.local`, con `.env.example` como plantilla versionada):

```
NEXT_PUBLIC_SUPABASE_URL=https://infuthprfvgsjflqmsby.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

Ambas son seguras de exponer en el navegador: Supabase habilita RLS por defecto en todas las tablas nuevas, y este spec la activa explícitamente en `profiles`.

## Implementation plan

1. `npm install @supabase/supabase-js @supabase/ssr`. Crear `.env.local` con las dos variables reales y `.env.example` con los mismos nombres sin valores. Aparte: borrar la variable suelta `supabase_db_pasword` de `.env.local` (nadie en el código la lee; es la contraseña de Postgres del proyecto) y rotarla desde el dashboard de Supabase. Verificación: `npm run build` sigue pasando.
2. Crear `lib/supabase/client.ts` con `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)`. Es un singleton interno de la librería; no hace falta memoizarlo aparte. Verificación: `npx tsc --noEmit` sin errores.
3. Crear `lib/supabase/server.ts` con `export async function createClient()`, usando `await cookies()` (convención Next 16 confirmada en `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`) y `createServerClient` con `cookies: { getAll, setAll }`, envolviendo `setAll` en `try/catch` para cuando se invoca desde un Server Component. Verificación: `npx tsc --noEmit` sin errores.
4. Crear `lib/supabase/proxy.ts` (`updateSession(request: NextRequest)`) y `proxy.ts` en la raíz del proyecto exportando `async function proxy(request)` — no `middleware`, que está deprecado en Next 16 (confirmado en `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md:11`). Reglas a respetar literalmente: ningún código entre `createServerClient` y `supabase.auth.getClaims()`; devolver el objeto `supabaseResponse` sin reconstruirlo; aplicar al `response` las cabeceras de caché que llegan como segundo argumento de `setAll` (evita que un CDN sirva la sesión de un usuario a otro); el cliente se crea dentro del handler, nunca en ámbito de módulo. `matcher` excluye `_next/static`, `_next/image`, `favicon.ico` y extensiones de imagen. Sin redirecciones: cualquier request sigue su curso, con o sin sesión. Verificación: `npm run dev`, navegar cualquier ruta y comprobar en devtools que existe una cookie `sb-<project_ref>-auth-token`.
5. Aplicar la migración SQL de la sección Data model con `mcp__supabase__apply_migration`, y copiar el mismo SQL a `supabase/migrations/<timestamp>_profiles.sql` en el repo. Verificación: `mcp__supabase__list_tables` muestra `public.profiles`; `mcp__supabase__get_advisors` no reporta avisos de RLS sobre esa tabla.
6. Reescribir `app/components/session-provider.tsx`: al montar, `supabase.auth.getSession()` para el estado inicial y `supabase.auth.onAuthStateChange((_event, session) => ...)` para mantenerlo actualizado; cuando hay sesión, `supabase.from("profiles").select("nickname").eq("id", session.user.id).single()` para completar `Profile`. La suscripción se crea dentro de un `useEffect` con `unsubscribe()` en el cleanup, pero el `setState` ocurre en el callback del listener, no en el cuerpo del efecto — evita chocar con `react-hooks/set-state-in-effect` (documentada en `CLAUDE.md`). `signUp`, `signIn` y `signOut` llaman a `supabase.auth.signUp/signInWithPassword/signOut` y devuelven el resultado tipado del contrato. Verificación: `npm run lint` sin errores.
7. Actualizar `app/components/auth-form.tsx`: pestaña "up" llama a `signUp(email, pass, username)`, pasando el nickname en `options.data.nickname` para que lo recoja el trigger; antes de llamar, consulta `profiles` por ese nickname y si existe corta con un error propio (ver Riesgos). Pestaña "in" llama a `signIn(email, pass)`. Estado `status: "idle" | "loading" | "error" | "needsConfirmation"`, reutilizando las clases `.spinner` y `.contact-error` ya existentes en `globals.css` — no hace falta CSS nuevo. El botón "JUGAR COMO INVITADO" pasa de `onClick={() => { signIn(null); router.push(...) }}` a `<Link href="/biblioteca">`. Añadir `name`, `autoComplete` y `htmlFor`/`id` a los tres inputs, que hoy no los tienen. Verificación: registrar con un correo nuevo muestra la pantalla de confirmación; con contraseña incorrecta aparece el error y no navega.
8. Crear `app/auth/confirm/route.ts` (`GET`) que lee `token_hash` y `type` de la URL, llama a `supabase.auth.verifyOtp({ type, token_hash })` y redirige a `/biblioteca` si no hay error, o a `/auth?error=confirm` si lo hay. Configurar en el dashboard de Supabase (Auth → Templates → "Confirm signup") la plantilla para que use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` en vez de `{{ .ConfirmationURL }}`, y añadir la Redirect URL correspondiente en Auth → URL Configuration. Verificación: registrarse, abrir el correo recibido, el enlace confirma y aterriza en `/biblioteca` ya logueado.
9. Adaptar `app/components/nav.tsx` (`user.nickname` en vez de `user.name`; no mostrar el estado "Iniciar Sesión" mientras `loading` es `true`, para evitar el parpadeo) y `app/components/hall-of-fame.tsx` (`user.nickname`; `youRank`/`youScore` siguen siendo inventados como hoy, sin tocar esa lógica — es deuda explícita para el spec de puntuaciones). Deshabilitar el botón "GUARDAR PUNTUACIÓN" de `app/components/game-player.tsx` con texto "PRÓXIMAMENTE" y quitar la llamada a `saveScore`. Verificación: iniciar sesión y recargar la página mantiene el nickname en el nav sin parpadeo.
10. `npm run lint` y `npm run build`. Actualizar el párrafo de `CLAUDE.md` sobre el estado de Supabase. Si `next dev` regeneró el bloque de reglas de `AGENTS.md`, commitearlo junto con el resto del trabajo. Verificación: ambos comandos terminan sin errores ni warnings.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings.
- [ ] Registrarse con un correo nuevo crea una fila en `auth.users` y otra en `public.profiles` con el nickname escrito (verificable con `mcp__supabase__execute_sql`).
- [ ] Tras registrarse aparece la pantalla "revisa tu correo"; iniciar sesión antes de confirmar falla con un mensaje claro.
- [ ] Al hacer clic en el enlace del correo de confirmación, la sesión queda iniciada y se aterriza en `/biblioteca`.
- [ ] Iniciar sesión con contraseña incorrecta muestra un error y no inicia sesión.
- [ ] Registrarse con un nickname ya existente muestra un error antes de crear ningún usuario nuevo.
- [ ] El nav muestra el nickname del usuario logueado; "Cerrar sesión" (antes `signOut`) borra la sesión y el nav vuelve a "Iniciar Sesión".
- [ ] Recargar la página con sesión iniciada mantiene el nickname en el nav sin mostrar primero "Iniciar Sesión".
- [ ] Cerrar sesión en una pestaña se refleja en otra pestaña abierta de la misma app sin recargar.
- [ ] "JUGAR COMO INVITADO" navega a `/biblioteca` sin crear ninguna sesión ni escribir en `localStorage`.
- [ ] Tras iniciar sesión, `localStorage` no contiene `av_user` ni `av_scores`.
- [ ] `mcp__supabase__get_advisors` no reporta ninguna tabla del esquema `public` sin RLS.
- [ ] El bundle de cliente contiene `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` pero ninguna clave `sb_secret_` (`grep -r "sb_secret_" .next/static` no devuelve nada).
- [ ] `.env.local` no está versionado; `.env.example` sí, con los dos nombres nuevos y sin valores reales.

## Decisions taken and discarded

- **Sí:** correo + contraseña como único método real de esta iteración. Google/GitHub requieren credenciales externas que hay que crear fuera del repo; se dejan como botones decorativos, listos para engancharse en otro spec.
- **No:** auth anónima de Supabase para el botón de invitado. `signIn(null)` hoy es indistinguible de no tener sesión (escribe `"null"` y se lee como `null`); convertirlo en un `Link` a `/biblioteca` es honesto con lo que ya hace y no exige habilitar nada en el dashboard.
- **Sí:** tabla `profiles` con `nickname` propio, en vez de guardar el nombre solo en `user_metadata`. Permite unicidad garantizada por `UNIQUE` y hacer `select`/`join` reales para el ranking, que es donde se mostrará en el spec de puntuaciones.
- **Sí:** el `nickname` se puebla con un trigger `security definer` sobre `auth.users`, no con un `insert` desde el cliente tras el `signUp`. Evita una ventana donde existe el usuario de Auth pero no el perfil si el cliente se cae entre medias.
- **Sí:** exigir confirmación de correo (comportamiento por defecto de Supabase). Es lo correcto y evita registrar cuentas con correos ajenos; el coste es una pantalla y una ruta más.
- **Sí:** `getClaims()` en el proxy, no `getUser()` ni `getSession()`. La documentación de Supabase marca explícitamente `getSession()` en servidor como no confiable (puede venir de una cookie falsificada); `getClaims()` valida la firma del JWT sin depender de eso.
- **No:** proteger ninguna ruta con el proxy. Hoy toda la app es pública y no hay contenido exclusivo de usuarios logueados; añadir redirecciones sería alcance sin necesidad real todavía.
- **No:** migrar `av_user`/`av_scores` de `localStorage`. Son datos de una maqueta de un solo navegador, sin valor real; el spec los descarta y limpia explícitamente.
- **No:** guardar puntuaciones reales en este spec. `saveScore` no tenía ningún lector; en vez de mantener una función fantasma, se retira del contrato y el botón que la llamaba queda deshabilitado hasta que exista una tabla `scores` real.
- **Sí:** `supabase/migrations/` versionado en el repo además de aplicar por MCP. El MCP conectado no es de solo lectura y escribe directo contra el proyecto remoto; versionar el SQL dócumenta el esquema y permite reconstruirlo.

## Risks

| Risk                                                                                                                                                                                                            | Mitigation                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getServerSnapshot` de la sesión actual siempre devuelve `null`; con sesión real en cookies el render inicial del servidor puede no coincidir con el cliente                                                    | El contrato nuevo expone `loading` explícito; el nav no muestra "Iniciar Sesión" hasta que se resuelve                                                                         |
| Un `nickname` duplicado hace fallar el `insert` del trigger dentro de la misma transacción que crea el usuario en `auth.users`, devolviendo un error genérico y poco legible ("Database error saving new user") | El formulario comprueba la disponibilidad del nickname antes de llamar a `signUp` y muestra su propio mensaje; no queda usuario huérfano porque la transacción entera revierte |
| Si el trigger fallara por otra causa, podría quedar un usuario de Auth sin fila en `profiles`                                                                                                                   | La UI trata `profile === null` como estado válido en vez de romper                                                                                                             |
| Cachear una respuesta con `Set-Cookie` de sesión (CDN/ISR) puede filtrar la sesión de un usuario a otro                                                                                                         | El proxy aplica las cabeceras de caché que Supabase pasa como segundo argumento de `setAll`; ninguna ruta de este spec usa ISR                                                 |
| Crear el cliente de Supabase en ámbito de módulo puede reutilizarse entre requests de usuarios distintos en entornos con cómputo compartido                                                                     | El cliente de servidor y el del proxy se crean dentro de cada handler/request, nunca a nivel de módulo                                                                         |
| Sin dominio propio verificado, los correos de confirmación salen del SMTP compartido de Supabase, con límites de envío bajos                                                                                    | Aceptable para el alcance actual (proyecto de curso); documentado como límite conocido                                                                                         |
| El MCP de Supabase conectado no es de solo lectura y apunta al proyecto real (`infuthprfvgsjflqmsby`); `apply_migration` escribe directo en producción, sin entorno de staging                                  | El SQL aplicado queda también versionado en `supabase/migrations/`; `get_advisors` se usa como verificación posterior a cada cambio de esquema                                 |
| `proxy.ts` es una convención nueva de Next 16; cualquier código copiado de un tutorial que use `middleware.ts` no se ejecutaría, y el token dejaría de refrescarse sin ningún error visible                     | Documentado explícitamente en el plan de implementación, con la cita del archivo de docs local que confirma el cambio                                                          |

## What is **not** in this spec

- Puntuaciones reales (tabla `scores`, sustituir `seededScores()`), y la migración de `av_scores`.
- Catálogo de juegos movido a Postgres.
- OAuth con Google o GitHub.
- Auth anónima, recuperación de contraseña, cambio de correo, borrado de cuenta.
- Página de cuenta, edición de perfil, avatares, Supabase Storage.
- Rutas protegidas por sesión.
- Tipos generados de la base de datos.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
