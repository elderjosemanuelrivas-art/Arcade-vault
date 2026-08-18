# SPEC 02 — Landing (Home) y Acerca de / Contacto

> **Status:** implementado
> **Depends on:** SPEC 01
> **Date:** 2026-08-17
> **Objective:** Portar la landing y la pantalla Acerca de / Contacto de `referencias/templates/home-about/` a rutas reales del App Router, moviendo la Biblioteca de `/` a `/biblioteca`.

## Scope

**In:**

- Landing en `/`: hero con siluetas pixel flotantes, sección "¿POR QUÉ ARCADE VAULT?" (4 feature cards), preview de 6 juegos, banda de stats, "ACTIVIDAD EN VIVO" (ticker + top jugadores), precios + FAQ, y CTA final.
- `/acerca`: misión, tres *highlights*, divisor animado, y formulario de contacto con validación de campos vacíos (shake) y terminal fake de éxito.
- `/biblioteca`: la Biblioteca actual, movida sin tocar `<Library />`.
- Nav con los cuatro enlaces de la plantilla: Inicio, Biblioteca, Salón de la Fama, Acerca de (más el panel móvil).
- Reapuntar a `/biblioteca` los enlaces existentes que hoy van a `/` esperando la Biblioteca.
- Anexar a `globals.css` solo las secciones CSS que este port usa.

**Out of scope (for future specs):**

- La sección `GAMEPAD` del CSS de referencia (~470 líneas) y sus variantes de tema: ningún componente de este spec las usa. Si un spec futuro rediseña el reproductor, se portan allí.
- Backend para el formulario de contacto: no envía nada, no hay API route ni email.
- Datos reales de "actividad en vivo": las puntuaciones del ticker son mock estático, no salen de `av_scores` ni de sesiones reales.
- Redirect de compatibilidad de `/` → `/biblioteca` (no hay URLs publicadas que preservar).
- Los `12+ JUEGOS` del bloque de stats siguen siendo texto de marketing, no se derivan de `GAMES.length`.
- Tests automatizados, internacionalización, modo claro.

## Data model

Se añaden tres constantes tipadas a `data/games.ts` (valores literales de la plantilla):

```ts
export type TickerRow = { player: string; game: string; score: number; when: string; color: GameColor };
export type TopRow = { rank: number; player: string; score: number };
export type HomeStat = { n: string; unit: string; sub: string };

export const HOME_TICKER: TickerRow[];  // 7 filas: NEONFOX/Caída/184220/"hace 2 min"…
export const HOME_TOP: TopRow[];        // 5 filas: NEONFOX 312840 … GLITCHA 138900
export const HOME_STATS: HomeStat[];    // 3 bloques: 12+/JUEGOS, MILES/DE PARTIDAS, GLOBAL/RANKING
```

`color` reutiliza el tipo `GameColor` ya existente en `data/games.ts` (los cuatro valores del ticker — cyan, magenta, yellow, green — encajan sin extenderlo). Las cifras se formatean con `toLocaleString("es-ES")`, como el resto del proyecto.

Los textos de features, FAQ y viñetas de precio **no** son datos: se quedan como JSX literal en su componente, igual que en la plantilla.

## Implementation plan

1. Anexar a `app/globals.css`, al final, las secciones `HOME PAGE`, `ABOUT PAGE`, `ACTIVITY` y `PRICING` de `referencias/templates/home-about/home-about/styles.css`, más la regla suelta `.btn.press:active`. Omitir `GAMEPAD`, `Theme variants`, `.slide-in`, `.tw-*`, `.live-led` y `.tp-bar` (sin uso en este port), y no re-declarar `.fade-in`, `.divider` ni `.spinner`, que ya existen en el archivo. Verificación: `npm run dev` arranca y las páginas actuales se ven igual que antes.
2. Añadir `TickerRow`/`TopRow`/`HomeStat` y `HOME_TICKER`/`HOME_TOP`/`HOME_STATS` a `data/games.ts`. Verificación: `npx tsc --noEmit` sin errores.
3. Crear `app/components/use-reveal.ts` (`"use client"`) con el `IntersectionObserver` (`threshold: 0.12`) que añade `.in` a cada `.reveal` y hace `unobserve` por elemento, con `io.disconnect()` en el cleanup del efecto. Verificación: `npm run lint` sin el error `react-hooks/set-state-in-effect`.
4. Crear `app/components/pixel-icons.tsx` (`"use client"`) exportando `FloatingSilhouettes` (8 siluetas), `FeatureIcon` (GAMEPAD/FREE/TROPHY/ROCKET) y `HighlightIcon` (HEART/BROWSER/PLANT), portados literalmente de `home.jsx`/`about.jsx`. Verificación: compila; se usan en los pasos 5 y 7.
5. Crear `app/components/home.tsx` (`"use client"`) con las seis secciones de la landing, usando `useReveal()`, `HOME_TICKER`/`HOME_TOP`/`HOME_STATS` y `GAMES.slice(0, 6)` para las mini-tarjetas. Toda navegación con `next/link`: cada mini-tarjeta a `/juegos/${g.id}`, los CTA "EXPLORAR JUEGOS"/"VER TODOS LOS JUEGOS"/"INSERTAR MONEDA" a `/biblioteca`, "CREAR CUENTA"/"EMPEZAR GRATIS" a `/auth`, "VER SALÓN" a `/salon`. Verificación: aún no está enrutado; `npx tsc --noEmit` limpio.
6. Crear `app/biblioteca/page.tsx` con la `metadata` que hoy tiene `app/page.tsx` y renderizando `<Library />`; reescribir `app/page.tsx` para exportar su propia `metadata` (`Arcade Vault · Portal Retro`) y renderizar `<Home />`. Verificación: `/` muestra la landing y `/biblioteca` la Biblioteca, ambas sin errores de hidratación.
7. Crear `app/components/about-contact.tsx` (`"use client"`) con la misión, los tres highlights, el divisor de 24 píxeles animados y el formulario de contacto (estado `form`/`sent`/`shake`; shake de 400 ms si algún campo está vacío al enviar; al enviar con todos los campos completos muestra la terminal fake con el nombre en mayúsculas; "ENVIAR OTRO MENSAJE" resetea a formulario vacío), y `app/acerca/page.tsx` con su `metadata`. Verificación: enviar vacío sacude el formulario sin avanzar; enviar completo muestra la terminal.
8. Actualizar `app/components/nav.tsx` a los cuatro enlaces (Inicio `/`, Biblioteca `/biblioteca`, Salón de la Fama `/salon`, Acerca de `/acerca`) tanto en la barra como en el panel móvil, y extender `isActive` para que "biblioteca" se resalte en `/biblioteca` y en `/juegos/*`, e "inicio" solo en `/` exacto. Verificación: navegar por las cuatro rutas resalta el enlace correcto y nunca dos a la vez.
9. Auditar y reapuntar a `/biblioteca` los enlaces que hoy asumen que la Biblioteca vive en `/`: el botón "VOLVER A LA BIBLIOTECA" del Salón de la Fama, "VOLVER AL VAULT" en el detalle de juego y en el modal de fin de partida del reproductor, y los `router.push("/")` tras iniciar sesión o entrar como invitado en el formulario de acceso. Verificación: `grep -rn 'href="/"\|push("/")' app/` solo devuelve el logo del nav.
10. `npm run build` y `npm run lint`. Si `next dev` regeneró el bloque de reglas de `AGENTS.md`, commitearlo junto con el resto del trabajo. Verificación: build y lint terminan sin errores ni warnings.

## Acceptance criteria

- [x] `npm run build` termina sin errores.
- [x] `npm run lint` termina sin errores ni warnings.
- [x] `/`, `/biblioteca` y `/acerca` cargan sin errores de hidratación en la consola del navegador.
- [x] `/` muestra el hero con las 8 siluetas flotantes, las 4 feature cards, 6 mini-tarjetas de juegos, 3 bloques de stats, el ticker de 7 filas, el top de 5 jugadores, la tarjeta de precio con FAQ y el CTA final.
- [x] Al hacer scroll en `/`, cada sección `.reveal` aparece con la transición al entrar en el viewport (no está visible antes de eso).
- [x] Clic en una mini-tarjeta de `/` lleva al detalle (`/juegos/[id]`) del juego correcto.
- [x] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS" e "INSERTAR MONEDA" llevan a `/biblioteca`.
- [x] "CREAR CUENTA" y "EMPEZAR GRATIS" llevan a `/auth`; "VER SALÓN" lleva a `/salon`.
- [x] `/biblioteca` se comporta como la `/` anterior: buscar "caí" deja visible solo "CAÍDA" y el chip "PUZZLE" filtra por esa categoría.
- [x] El nav muestra los cuatro enlaces (Inicio, Biblioteca, Salón de la Fama, Acerca de) y resalta exactamente uno según la ruta activa; en `/juegos/[id]` el resaltado es "Biblioteca".
- [x] El panel móvil (hamburguesa) lista los cuatro enlaces más Iniciar Sesión / Cuenta.
- [x] En `/acerca`, enviar el formulario con algún campo vacío lo sacude y no muestra la terminal de éxito.
- [x] Enviar el formulario completo muestra la terminal con "MENSAJE RECIBIDO" y el nombre en mayúsculas; "ENVIAR OTRO MENSAJE" vuelve al formulario vacío.
- [x] Desde el Salón de la Fama, "VOLVER A LA BIBLIOTECA" lleva a `/biblioteca` (no a la landing).
- [x] Desde el detalle de juego y desde el modal de fin de partida del reproductor, "VOLVER AL VAULT" lleva a `/biblioteca`.
- [x] Tras iniciar sesión o entrar como invitado desde `/auth`, se aterriza en `/biblioteca`.
- [x] Ninguna clase CSS añadida a `globals.css` en este spec queda sin usar por al menos un componente de la app.

## Decisions taken and discarded

- **Sí:** la landing ocupa `/` y la Biblioteca se mueve a `/biblioteca`. El nav de la plantilla ya asume "Inicio" como portada, y `/biblioteca` mantiene la coherencia de URLs en español con `/salon` y `/juegos/[id]`.
- **No:** dejar la Biblioteca en `/` y mover la landing a otra ruta (p. ej. `/inicio`). La petición explícita era portar esto "en mi home".
- **No:** un `redirect()` de compatibilidad de `/` a `/biblioteca`. No hay URLs publicadas que preservar y el paso 9 reapunta todos los enlaces internos afectados.
- **Sí:** portar a `globals.css` solo las secciones CSS que este spec usa (`HOME PAGE`, `ABOUT PAGE`, `ACTIVITY`, `PRICING`). La sección `GAMEPAD` (~470 líneas) no la referencia ninguna de las dos plantillas nuevas, y el spec 01 ya fijó como criterio que ninguna clase de `globals.css` quede sin usar.
- **Sí:** `HOME_TICKER`/`HOME_TOP`/`HOME_STATS` como constantes tipadas en `data/games.ts`, con los mismos valores literales de la plantilla. Saca los datos fuera de la vista sin arriesgar ningún cambio visual frente a la maqueta.
- **No:** derivar el ticker y el top de jugadores a partir de `GAMES` + `seededScores`. Cambiaría los nombres y puntuaciones que muestra la maqueta; este spec porta fidelidad visual, no un ranking en vivo real (eso depende de puntuaciones globales, fuera de alcance).
- **Sí:** un único hook `useReveal()` compartido por Home y Acerca de, en vez de duplicar el efecto como hace la plantilla. Manipula `classList` directamente (no llama `setState`), por lo que no choca con la regla `react-hooks/set-state-in-effect` documentada en `CLAUDE.md`.
- **Sí:** `next/link` en toda la navegación de estas pantallas, en vez de `onClick` + función `navigate()` como en la plantilla original. Da prefetch, apertura en pestaña nueva y semántica de enlace; es el patrón que ya usa `nav.tsx`.
- **Sí:** `app/components/pixel-icons.tsx` compartido para las siluetas flotantes y los iconos SVG de features/highlights. Los usan ambas pantallas nuevas y evita duplicar ~150 líneas de SVG.
- **Sí:** `<Library />` se mueve de archivo (`app/page.tsx` → `app/biblioteca/page.tsx`) pero no se modifica, incluido su propio hero ("ARCADE VAULT · INSERTA UNA MONEDA"). Que la landing y la Biblioteca repitan el mensaje "inserta una moneda" es aceptable al vivir en rutas distintas; tocarlo dejaría las clases `.av-hero`/`.flicker` sin uso, violando el mismo criterio de `globals.css` limpio.
- **Sí:** omitir del port los elementos `.tp-bar`/`.tp-fill` del top de jugadores. En la referencia, `.tp-bar` es `position: absolute` sin ancho/alto propio y `.tp-fill` no tiene ninguna regla CSS asociada: son marcado muerto en la plantilla original, y la barra de progreso que sí se ve la pinta `.top-row::before`.
- **Sí:** formulario de contacto puramente decorativo (no envía nada, no hay API route), coherente con el `/auth` fake ya implementado en el spec 01. Un backend de contacto real queda para otro spec.
- **Sí:** ruta `/acerca` en español, siguiendo la convención de `/salon` ya establecida.

## Risks

| Risk | Mitigation |
| --- | --- |
| Mover la Biblioteca de `/` a `/biblioteca` rompe enlaces internos existentes sin que la compilación lo detecte | Paso 9 es una auditoría explícita de cada sitio que hoy asume `/` como Biblioteca, con un `grep` final como verificación |
| `useReveal()` no dispara (por ejemplo tras un fallo de hidratación) y las secciones `.reveal` quedan con `opacity: 0` de forma permanente | Criterio de aceptación específico sobre el comportamiento de scroll; el hook hace `unobserve` por elemento y `disconnect()` en el cleanup del efecto |
| Copiar el CSS a mano introduce diferencias sutiles frente a la referencia | El `diff` contra `referencias/templates/styles.css` confirma que la referencia nueva es puramente aditiva (dos hunks de inserción, ninguna línea modificada); se copian los bloques completos sin reescribir reglas |
| El nav crece de 2 a 4 enlaces y puede desbordar en anchos intermedios | Se reutilizan `.links` y el panel móvil (`.av-mobile-panel`) existentes sin tocar sus reglas responsive de `globals.css` |

## What is **not** in this spec

- La sección `GAMEPAD` del CSS de referencia y sus variantes de tema.
- Backend, API routes o envío real del formulario de contacto.
- Puntuaciones globales o "actividad en vivo" derivadas de datos reales.
- Redirect de compatibilidad de `/` hacia `/biblioteca`.
- Tests automatizados, internacionalización y modo claro.

Cada uno de estos, si se implementa, va en su propio spec.
