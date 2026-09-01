# Plantilla para el spec de un port de juego

Este archivo es la referencia que consulta el skill `/juego-nuevo` al generar specs. Cada sección incluye su propósito y lo que ya viene resuelto por ser un port de juego a Arcade Vault, para que el spec generado solo rellene lo específico de ese juego. **No es texto para copiar literal** — es la forma que el skill debe respetar.

Sigue la misma estructura que `.agents/skills/spec/template.md` (encabezado en blockquote, sin tablas raras, secciones estándar), con el contenido específico de un port de juego ya precargado en cada una.

---

## Header

```markdown
# SPEC NN — <Nombre del juego> real en «<games.id>»

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06
> **Date:** YYYY-MM-DD
> **Objective:** Una sola frase.
```

Casi todo port depende de SPEC 05 (contrato `ArcadeEngine`/`EngineCallbacks`, patrón `entities.ts`/`engine.ts`/`index.ts`) y SPEC 06 (catálogo y `scores` en Postgres, de donde sale el `games.id` del slot). Verifica que ambos existan en `specs/` antes de citarlos; si el repo ya tiene specs de ports anteriores, añádelos también como dependencia si el nuevo juego reutiliza algo suyo.

---

## Por qué este spec existe

Casi siempre aplica: la entrada del catálogo ya existe (sembrada en el SPEC 06) pero sin motor real, así que el juego cae en la arena falsa de `game-player.tsx` (`setInterval` subiendo el score solo). Nombra la fuente concreta si viene de `referencias/started-games/` — y si trae assets, licencia u origen de esos assets si se conoce.

---

## Scope

```markdown
## Scope

**In:**

- `lib/games/<slug>/entities.ts`, `engine.ts`, `index.ts` — port del motor al contrato `ArcadeEngine`.
- Una línea nueva en `lib/games/registry.ts` con la clave `<games.id>`.
- Assets (si los hay) movidos a `public/juegos/<slug>/` y referenciados por ruta absoluta.
- `app/juegos/[id]/page.tsx` — actualizar la etiqueta de controles hardcodeada si el juego es solo teclado.
- `CLAUDE.md` — actualizar los párrafos que listan qué juegos tienen motor real.

**Out of scope (for future specs):**

- Cualquier otro juego del catálogo sin motor real.
- Cambios al contrato `EngineCallbacks`/`ArcadeEngine` (a menos que este spec los justifique explícitamente en Decisiones).
- Controles táctiles o de gamepad, si el original es solo teclado.
- `app/components/game-player.tsx`, `lib/games-data.ts` y las páginas de `/salon`, `/biblioteca`, `/` — ya son genéricas, no cambian por añadir un juego.
```

---

## Data model

Casi ningún port de juego introduce datos persistidos nuevos — `public.games` y `public.scores` ya existen desde el SPEC 06, y el `games.id` del slot ya está sembrado. Escríbelo así de explícito salvo que el usuario haya pedido un juego fuera de los 8 slots (en cuyo caso sí hace falta una migración `insert` nueva, siguiendo el patrón de `supabase/migrations/20260826184921_games.sql`).

Sí documenta el contrato de motor **leído del código en este momento** (no de memoria — el número de campos de `EngineCallbacks` ha cambiado antes sin que el spec correspondiente se actualizara):

```ts
// lib/games/types.ts — copiar tal cual está hoy
```

Y las constantes de balance propias del juego que se porta (velocidades, puntuación por evento, dimensiones del buffer), con el mismo valor que el original salvo que el usuario pida ajustarlas.

---

## Implementation plan

Orden validado por el SPEC 05. Numerado, cada paso deja el sistema funcional:

```markdown
## Implementation plan

1. `lib/games/<slug>/entities.ts` — clases puras del juego, sin DOM ni estado de módulo: reciben `ctx`, `W`, `H`, `dt`, `keys` por parámetro (necesario porque React Strict Mode monta el efecto dos veces en desarrollo).
2. `lib/games/<slug>/engine.ts`, primera mitad — la clase que implementa `ArcadeEngine`: campos de estado, métodos privados de inicialización/spawn/colisión portados del original.
3. Completar `engine.ts` — bucle `requestAnimationFrame` con `rafId` propio, `dt` capado, `pause()`/`resume()`/`destroy()` (idempotente).
4. Input propio en `engine.ts` — listeners como propiedades flecha (misma referencia para añadir y quitar), `preventDefault()` en las teclas usadas, `visibilitychange` → `pause()`.
5. Cablear los callbacks — `onScore`/`onLives`/`onLevel` solo al cambiar respecto al valor anterior emitido; `onGameOver` una sola vez; `onPause` si el juego permite pausa desde teclado propio.
6. `lib/games/<slug>/index.ts` — factoría por defecto de 7 líneas, más la línea nueva en `lib/games/registry.ts` con la clave `<games.id>`.
7. Assets, si los hay — mover a `public/juegos/<slug>/`, referencias absolutas, precarga, `destroy()` detiene el audio.
8. `app/juegos/[id]/page.tsx` — actualizar la etiqueta de controles.
9. `npm run lint` y `npm run build`. Actualizar `CLAUDE.md`.
```

Ajusta el detalle de cada paso a las respuestas concretas de la Fase 2 (proporción del buffer, qué stats se dibujan solo en canvas, etc.) — esto es el esqueleto, no el spec final.

---

## Acceptance criteria

Checklist reutilizable en todo port, más lo específico del juego:

```markdown
## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings.
- [ ] `/juegos/<slug>/jugar` muestra el `<canvas>` real del juego, no la arena falsa.
- [ ] Recargar la página en modo desarrollo (Strict Mode) no duplica el bucle ni produce errores en consola.
- [ ] Salir del reproductor detiene el bucle de animación y retira los listeners de teclado (y el audio, si lo hay).
- [ ] Al llegar a game over, el modal de React muestra la misma puntuación que el canvas.
- [ ] Jugando con sesión iniciada, la puntuación aparece en `public.scores` y se refleja en `/juegos/<slug>` (mejor global), `/salon` y el ticker de la landing.
- [ ] El resto del catálogo sigue mostrando la arena falsa, sin cambios de comportamiento.
```

---

## Decisions taken and discarded

Registra aquí, con su porqué, cada respuesta de la Fase 2: slot elegido, proporción del buffer y por qué, qué se hizo con elementos fuera de un único canvas, si se amplió o no `EngineCallbacks`, dónde viven los assets.

---

## Risks

Tabla de dos columnas. Riesgos recurrentes en todo port — inclúyelos solo si aplican a este juego:

```markdown
## Risks

| Risk                                                                                        | Mitigation                                                                                        |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| El bucle o los listeners quedan vivos tras salir del reproductor sin recarga completa       | `destroy()` idempotente, llamado desde el cleanup del efecto de montaje                           |
| Strict Mode monta el efecto dos veces y crea dos instancias del motor sobre el mismo canvas | El efecto usa una bandera de cancelación; un motor creado tras desmontar se destruye sin arrancar |
| El buffer del canvas no es 4:3 y se deforma dentro de `.crt-screen`                         | Letterbox dentro de un buffer 800×600, o regla CSS específica — decisión explícita, no accidental |
| Audio o sprites no cargan por ruta relativa bajo Next                                       | Assets en `public/juegos/<slug>/`, referenciados con ruta absoluta                                |
```

---

## What is **not** in this spec

Repite al final lo que el Scope ya excluyó — otros juegos del catálogo, cambios al contrato de motor, controles táctiles/gamepad si no aplican. Cada uno, si se implementa, va en su propio spec.
