# SPEC 01 — MVP visual de las pantallas de Arcade Vault

> **Status:** implementado
> **Depends on:** —
> **Date:** 2026-08-14
> **Objective:** Portar las cinco pantallas de `referencias/templates/` a rutas reales del App Router de Next.js 16, solo la capa visual y sin ningún juego jugable.

## Scope

**In:**

- Las 5 pantallas del template: Biblioteca, Detalle de juego, Reproductor, Acceso (login/registro) y Salón de la Fama.
- La barra de navegación (`nav.jsx`) con su panel móvil, y el footer que hoy vive en `app.jsx`.
- Los datos mock de `data.jsx` (8 juegos, categorías, generador `seededScores`) portados a TypeScript.
- Una sesión fake en cliente (usuario y puntuaciones guardadas en `localStorage`, sin backend) que alimenta el estado condicional del nav y del Salón.
- El reproductor incluye su simulación fake de puntuación (`setInterval`), pausa y modal de fin de partida, como maqueta animada del HUD — no es un juego jugable, no hay mecánica ni colisiones reales.

**Out of scope (for future specs):**

- Cualquier motor de juego real (los 8 juegos listados en `data.jsx` no se implementan).
- Backend, API routes o base de datos.
- Autenticación real: los botones de Google/GitHub y el formulario de acceso son decorativos, no validan credenciales ni crean cuentas reales.
- Puntuaciones globales persistentes o compartidas entre usuarios.
- Tests automatizados.
- `generateStaticParams` / pre-renderizado estático de las fichas de juego.
- Internacionalización y modo claro.

## Data model

```ts
// data/games.ts
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
  plays: string;
};

export type ScoreRow = { rank: number; name: string; score: number; date: string };

export const GAMES: Game[];      // los 8 juegos de data.jsx, portados literalmente
export const CATS: string[];     // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export function seededScores(seed: number, count?: number): ScoreRow[];
```

`seededScores` se porta literalmente, incluyendo su generador congruencial lineal
(`s = (s * 9301 + 49297) % 233280`). Es determinista: mismo `seed` produce siempre las mismas filas,
así que el resultado coincide entre servidor y cliente y no rompe la hidratación.

Sesión fake, definida en `app/components/session-provider.tsx`:

```ts
type User = { name: string };
type ScoreEntry = { game: string; score: number; name: string; at: number };
// Claves de localStorage: "av_user", "av_scores" (mismas que el template original).
```

Conventions:

- Todas las cifras se formatean con `toLocaleString("es-ES")`, locale fijado explícitamente como en el template.
- `localStorage` se lee siempre dentro de un `useEffect`, nunca en el inicializador de `useState`, para no desajustar la hidratación entre servidor y cliente.

## Implementation plan

1. Crear `data/games.ts` con el port tipado de `data.jsx` (`GAMES`, `CATS`, `seededScores`). Verificación: `npx tsc --noEmit` sin errores.
2. Crear `app/components/session-provider.tsx` (`"use client"`) con `useSession()` exponiendo `user`, `signIn`, `signOut`, `saveScore`, persistiendo en `localStorage` bajo `av_user` / `av_scores`.
3. Modificar `app/layout.tsx` para envolver `<div id="root">` con `SessionProvider`, y crear `app/components/nav.tsx` (`"use client"`, con `usePathname()` para el estado activo y panel móvil) y `app/components/site-footer.tsx`. Verificación: la app compila y muestra nav + footer sobre una página vacía.
4. Reemplazar `app/page.tsx` (boilerplate) por la pantalla Biblioteca: hero, buscador, chips de categoría, grid de `GameCard` (con el tilt 3D en `onMouseMove`), y estado vacío "NO HAY RESULTADOS". Verificación: `/` muestra las 8 tarjetas y el filtro por texto/categoría funciona.
5. Crear `app/juegos/[id]/page.tsx` (Server Component, `PageProps<'/juegos/[id]'>`) con el detalle del juego y el leaderboard vía `seededScores(id.length * 17 + 3, 10)`; `notFound()` si el `id` no existe en `GAMES`. Verificación: `/juegos/bloque-buster` renderiza portada, stats y tabla; `/juegos/no-existe` da 404.
6. Crear `app/juegos/[id]/jugar/page.tsx` con el reproductor: HUD, arena CRT animada por CSS, pausa, y modal de fin de partida que guarda la puntuación vía `saveScore`. Verificación: pausar detiene el contador, "FIN" abre el modal, guardar la puntuación muestra "▸ PUNTUACIÓN GUARDADA_".
7. Crear `app/auth/page.tsx` con pestañas Iniciar Sesión / Crear Cuenta, campo de email condicional, botón de invitado y botones sociales decorativos; al enviar, llama a `signIn` y navega a `/`. Verificación: tras enviar el formulario el nav muestra el nombre de usuario.
8. Crear `app/salon/page.tsx` con pestañas por juego, podio (2º-1º-3º) y tabla con animación escalonada; la fila "TU MEJOR MARCA" solo aparece con sesión iniciada. Verificación: cambiar de pestaña recalcula podio y tabla; sin sesión la fila no aparece.
9. Eliminar de `public/` los SVG del scaffold que queden sin usar (`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`) y añadir `metadata` (`title`/`description`) a cada página nueva. Verificación: `npm run build` y `npm run lint` sin errores ni warnings.

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` termina sin errores ni warnings.
- [ ] Las 5 rutas (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon`) cargan sin errores de hidratación en la consola del navegador.
- [ ] Navegar Biblioteca → Detalle → Reproductor y volver con el botón "atrás" del navegador funciona sin recargar la página completa.
- [ ] Buscar "cai" en la Biblioteca deja visible únicamente la tarjeta "CAÍDA".
- [ ] Seleccionar el chip "PUZZLE" deja visible únicamente los juegos de esa categoría.
- [ ] Una búsqueda sin resultados muestra el mensaje "NO HAY RESULTADOS".
- [ ] Iniciar sesión con un nombre de usuario hace que el nav muestre ese nombre en mayúsculas, recortado a 10 caracteres.
- [ ] Con sesión iniciada, el Salón de la Fama muestra la fila amarilla "TU MEJOR MARCA EN [JUEGO]".
- [ ] Sin sesión iniciada, esa fila no aparece.
- [ ] Recargar la página conserva la sesión iniciada.
- [ ] Visitar `/juegos/no-existe` devuelve una página 404.
- [ ] En el reproductor, pulsar "PAUSA" detiene el incremento de puntuación y muestra "EN PAUSA" en la pantalla CRT.
- [ ] Pulsar "FIN" abre el modal con la puntuación final y un campo para las iniciales.
- [ ] Guardar la puntuación en el modal muestra el mensaje "▸ PUNTUACIÓN GUARDADA_" y ya no se puede volver a guardar.
- [ ] Ninguna clase definida en `app/globals.css` queda sin usar por al menos un componente de la app.

## Decisions

- **Yes:** rutas reales del App Router (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon`). Da URLs compartibles y usa el router de forma idiomática.
- **No:** el switch por hash de una sola página (`app.jsx`). Desperdicia el App Router y no hay URL por pantalla.
- **Yes:** conservar `app/globals.css` con sus clases semánticas tal cual está hoy (ya es un port 1:1 verificado de `styles.css`). Reescribirlo a utilidades Tailwind solo añadiría riesgo de regresión visual sin ningún beneficio en este spec.
- **Yes:** mantener la simulación fake de puntuación del reproductor (`setInterval`, pausa, modal). Sin ella no se pueden ver los estados de "jugando", "en pausa" y "fin de partida".
- **No:** una pantalla de reproductor totalmente estática. Dejaría esos estados sin forma de verse.
- **Yes:** sesión fake en un Context de cliente (`SessionProvider`) persistida en `localStorage`. Es lo mínimo necesario para hacer visibles los estados condicionales del nav y del Salón, sin backend.
- **No:** NextAuth o cualquier proveedor de autenticación real. Fuera del alcance de un MVP puramente visual.
- **Yes:** `data/games.ts` en la raíz del proyecto. Los datos mock no son código de rutas, no pertenecen dentro de `app/`.
- **Yes:** leer `localStorage` dentro de `useEffect` en vez de en el inicializador de `useState` (como hacía `app.jsx`). En SSR, leer `localStorage` de forma síncrona en el primer render desajusta la hidratación.

## Risks

| Risk | Mitigation |
| --- | --- |
| Desajuste de hidratación por leer `localStorage` de forma síncrona | Lectura siempre dentro de `useEffect`; el primer render en servidor y cliente asume "sin sesión" |
| `toLocaleString("es-ES")` puede diferir entre entornos de servidor y cliente | Locale fijado explícitamente en cada llamada, igual que en el template original |
| Perder fidelidad visual al trocear las pantallas en componentes más pequeños | No se añade ni renombra ninguna clase de `globals.css` en este spec; se reutilizan las existentes tal cual |

## What is **not** in this spec

- Motor de juego real para ninguno de los 8 juegos listados.
- Backend, API routes o base de datos.
- Autenticación real (validación de credenciales, creación de cuentas, OAuth funcional).
- Puntuaciones globales persistentes o compartidas entre usuarios.
- Tests automatizados.
- Internacionalización y modo claro.

Cada uno de estos, si se implementa, va en su propio spec.
