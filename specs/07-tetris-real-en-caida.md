# SPEC 07 — Tetris real en "Caída"

> **Status:** aprobado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-01
> **Objective:** Sustituir el reproductor falso de "Caída" por el juego de piezas que caen de `referencias/started-games/03-tetris/`, portado a TypeScript sobre el contrato `ArcadeEngine` fijado en el SPEC 05, con tablero y panel de estado dibujados en letterbox dentro del búfer 800×600 fijo de `game-player.tsx`, y con la puntuación cayendo en `public.scores` como cualquier otro juego del SPEC 06.

## Por qué este spec existe

El SPEC 06 sembró `public.games` con 8 filas; `caida` ("CAÍDA — Encaja las piezas antes de que el techo te aplaste", `cat: PUZZLE`) es una de ellas, pero `lib/games/registry.ts` solo tiene una entrada (`rocas`), así que `caida` sigue cayendo en la arena falsa de `game-player.tsx` (`setInterval` subiendo el score sin mecánica real, documentado en `CLAUDE.md` como "Every other game in the catalog still falls back to the original fake game arena").

En paralelo, `referencias/started-games/03-tetris/game.js` (332 líneas, sin dependencias ni assets) es un Tetris completo cuya ficha sembrada lo describe casi palabra por palabra: tablero 10×20, 8 tipos de pieza (los 7 tetriminós estándar más una "tuerca" no estándar), rotación con wall kicks, línea fantasma, sistema de niveles que acelera cada 10 líneas — coincide 1:1 con "Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas" de la migración de `games`.

El original, tal como está, no se puede montar directamente en `game-player.tsx` por los mismos cuatro motivos que ya resolvió el SPEC 05 para Asteroids (script clásico autoejecutado, sin ciclo de vida, sin `preventDefault()`, sin callbacks) — y añade tres propios:

1. **Doble canvas.** `index.html` tiene `#board` (300×600) y un segundo `#next-canvas` (120×120) para la pieza siguiente. El contrato `ArcadeEngine` solo entrega un `<canvas>`.
2. **Panel HTML lateral.** `#score`, `#lines`, `#level` viven como `<span>` fuera del canvas, actualizados por `updateHUD()`. `EngineCallbacks` no tiene ranura para `lines`, y el HUD de React (`game-player.tsx`) no tiene ningún elemento equivalente a "Líneas".
3. **Overlay propio de PAUSA/GAME OVER** (`#overlay`), que en el Vault duplicaría el overlay de pausa y el modal de fin de partida que `game-player.tsx` ya dibuja para cualquier juego con motor.

Este spec resuelve los tres puntos absorbiendo el segundo canvas y el panel dentro del único `<canvas>` de 800×600 que `game-player.tsx` ya monta (sin tocar ese componente), y descartando el overlay propio en favor del que ya existe en React.

## Scope

**In:**

- `lib/games/tetris/entities.ts` — constantes (`COLS`, `ROWS`, `BLOCK`, `COLORS`, `PIECES`, `LINE_SCORES`) y funciones puras del tablero/pieza (`createBoard`, `randomPiece`, `collide`, `rotateCW`, `drawBlock`) portadas de `game.js`, recibiendo `ctx`/`board`/dimensiones por parámetro en vez de cerrarlas por scope de módulo global.
- `lib/games/tetris/engine.ts` — clase `TetrisGame` que implementa `ArcadeEngine`: bucle `requestAnimationFrame` con handle propio, máquina de estados `playing | paused | gameover`, listeners de teclado propios con `preventDefault()`, dibujado del tablero con letterbox más el panel SCORE/LINES/LEVEL/NEXT dentro del mismo canvas, emisión de callbacks al cambiar `score`/`level`/game over, `destroy()` idempotente que cancela el rAF y retira los listeners.
- `lib/games/tetris/index.ts` — factoría por defecto que exporta el motor para el registro.
- `lib/games/registry.ts` — una línea nueva, `caida: () => import("@/lib/games/tetris")`.
- `app/juegos/[id]/page.tsx` — la etiqueta fija de la línea 33 pasa de `game.id === "rocas" ? "TECLADO" : "TECLADO / TÁCTIL"` a `game.id in GAME_ENGINES ? "TECLADO" : "TECLADO / TÁCTIL"`.
- `CLAUDE.md` — actualizar los párrafos que hoy dicen "currently only `rocas`" y "Tetris y Arkanoid remain unported" (Tetris deja de estar en esa lista; Arkanoid sigue).

**Out of scope (for future specs):**

- Arkanoid (`04-arkanoid`) y los otros seis juegos del catálogo sin motor real.
- Cambios al contrato `EngineCallbacks`/`ArcadeEngine` — no se añade `onLines` ni ninguna ranura nueva.
- Controles táctiles o de gamepad. Solo teclado, como el original.
- El toggle de tema claro/oscuro con `localStorage` del `index.html` original — el Vault ya tiene su propio tema, no se porta.
- Sonido y música (el original tampoco los tiene).
- `app/components/game-player.tsx`, `lib/games-data.ts` y las páginas de `/salon`, `/biblioteca`, `/` — ya son genéricas, no cambian por añadir un segundo motor.
- Ajustar dificultad, balance, o añadir mecánicas nuevas (hold piece, combo, sistema de puntuación distinto).
- Nitidez en pantallas retina / escalado por `devicePixelRatio` (mismo riesgo aceptado que en el SPEC 05).
- Tests automatizados (el proyecto no tiene test runner configurado).

## Data model

Este spec no introduce ninguna migración ni tabla nueva: `public.games`, `public.scores` y `public.game_stats` ya existen desde el SPEC 06, y la fila `caida` ya está sembrada en `supabase/migrations/20260826184921_games.sql`. El contrato de motor, leído de `lib/games/types.ts` en este momento:

```ts
// lib/games/types.ts
export type EngineCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  onPause: (paused: boolean) => void;
};

export type ArcadeEngine = {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  destroy: () => void;
};

export type EngineFactory = (canvas: HTMLCanvasElement, callbacks: EngineCallbacks) => ArcadeEngine;
```

```ts
// lib/games/registry.ts, tras este spec
export const GAME_ENGINES: Record<string, () => Promise<{ default: EngineFactory }>> = {
  rocas: () => import("@/lib/games/asteroids"),
  caida: () => import("@/lib/games/tetris"),
};
```

Las constantes de balance del juego original se portan con el mismo valor, sin ajustes: `COLS = 10`, `ROWS = 20`, `BLOCK = 30`, las 8 piezas de `PIECES` (los 7 tetriminós estándar más la "N", una tuerca 3×3 hueca) con sus colores de `COLORS`, `LINE_SCORES = [0, 100, 300, 500, 800]` multiplicado por `level`, hard drop `+2` puntos por celda caída, soft drop `+1` punto por fila, `dropInterval = max(100, 1000 − (level − 1) × 90)` ms, `level = floor(lines / 10) + 1`, wall kicks `[0, -1, 1, -2, 2]` al rotar.

El búfer del canvas es 800×600 fijo — lo impone `game-player.tsx:144` (`<canvas width={800} height={600} />`), fuera del alcance de este spec. El tablero (300×600 a `BLOCK = 30`) se dibuja pegado al alto y desplazado a la izquierda; los ~500 px restantes de ancho se usan para el panel SCORE/LINES/LEVEL/NEXT, dibujado en el mismo canvas.

## Implementation plan

1. `lib/games/tetris/entities.ts` — constantes y funciones puras portadas de `game.js`: `createBoard()`, `randomPiece()`, `collide(shape, board, ox, oy)`, `rotateCW(shape)`, `drawBlock(ctx, x, y, colorIndex, size, alpha?)`, todas recibiendo lo que necesitan por parámetro (necesario porque React Strict Mode monta el efecto dos veces en desarrollo, igual que en `lib/games/asteroids/entities.ts`).
2. `lib/games/tetris/engine.ts`, primera mitad — la clase `TetrisGame` con sus campos de estado (`board`, `current`, `next`, `score`, `lines`, `level`, `dropAccum`, `dropInterval`, `state: "playing" | "paused" | "gameover"`) y los métodos privados `spawn()`, `lockPiece()`, `clearLines()`, `tryRotate()` (con los wall kicks del original), `ghostY()`, `hardDrop()`, `softDrop()`, portados de las funciones homónimas de `game.js`.
3. Completar `engine.ts` con el bucle: `requestAnimationFrame` guardado en `this.rafId`, `dt` capado igual que en `AsteroidsGame`, acumulador de caída (`dropAccum` contra `dropInterval`) y los métodos públicos `pause()`/`resume()`/`restart()`/`destroy()` (idempotente, con bandera `destroyed`, siguiendo el patrón de `lib/games/asteroids/engine.ts`).
4. Input propio en `engine.ts` — listeners en `window` como propiedades flecha (misma referencia para añadir y quitar), `PREVENT_DEFAULT_CODES = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"])`, `←`/`→` mueven, `↑`/`KeyX` rotan, `↓` hace soft drop, `Space` hace hard drop; `KeyP` y `Escape` alternan `pause()`/`resume()` y notifican por `onPause`; un listener de `visibilitychange` llama a `pause()` cuando `document.hidden` es `true`. `Space` no reinicia la partida en estado `gameover` (a diferencia de Asteroids): en Tetris esa tecla es el hard drop, y reiniciar por accidente sería peor que no ofrecer el atajo.
5. Dibujado con letterbox — offset X que deja el tablero (300×600) pegado a la izquierda, rejilla, celdas del tablero, pieza fantasma (`globalAlpha 0.2` vía `ghostY()`), pieza actual; a la derecha, el panel en el mismo canvas con `SCORE`/`LINES`/`LEVEL` en texto monospace (mismo estilo que `drawHUD()` de `AsteroidsGame`) y la preview de `next` (offset centrado en una grilla 4×4, reusando `drawBlock`). No se dibuja ningún overlay propio de pausa o game over — React ya cubre ambos casos sobre `.crt-screen` y el modal.
6. Cablear los callbacks — `onScore`/`onLevel` se invocan solo cuando su valor cambia respecto al último emitido (mismo patrón `emitChanges()` que `AsteroidsGame`); `onLives(0)` se invoca una única vez al arrancar, ya que Tetris no tiene vidas y el HUD de React ya pinta `—` cuando `lives === 0` (`game-player.tsx:121`); `onGameOver(score)` se invoca una sola vez, cuando `spawn()` detecta colisión inmediata de la pieza entrante; `onPause` se invoca desde `pause()`/`resume()`, tanto si los dispara el teclado (`KeyP`/`Escape`) como el botón de React.
7. `lib/games/tetris/index.ts` — factoría por defecto (`(canvas, callbacks) => new TetrisGame(canvas, callbacks)`) y la línea nueva en `lib/games/registry.ts` con la clave `caida`.
8. `app/juegos/[id]/page.tsx:33` — sustituir el ternario fijo por `game.id in GAME_ENGINES ? "TECLADO" : "TECLADO / TÁCTIL"`, para que el próximo port no tenga que volver a tocar esta línea.
9. `npm run lint` y `npm run build`. Actualizar los párrafos de `CLAUDE.md` señalados en el Scope. Si `next dev` regeneró el bloque de reglas de `AGENTS.md`, commitearlo junto con el resto del trabajo.

## Acceptance criteria

- [x] `npm run build` y `npm run lint` terminan sin errores ni warnings.
- [x] `/juegos/caida/jugar` muestra el `<canvas>` real del juego (tablero + panel + preview de la siguiente pieza), no la arena falsa.
- [x] Las flechas, `↑`/`X` y `Space` mueven/rotan/dejan caer la pieza sin producir scroll en la página del reproductor.
- [x] Completar una fila la limpia, suma puntos según `LINE_SCORES × level`, y el `SCORE`/`LINES`/`LEVEL` dibujados en el canvas coinciden con el HUD de React (Puntuación y Nivel); Vidas muestra `—`.
- [ ] Cada 10 líneas el nivel sube y la caída se acelera, reflejado a la vez en el canvas y en el HUD de React. _(pendiente de comprobar con una partida real sostenida; la fórmula está portada 1:1 de `game.js`, sin probar en vivo)_
- [x] El botón PAUSA congela el juego y REANUDAR lo continúa; `Escape` y `P` hacen lo mismo desde el teclado; cambiar de pestaña pausa automáticamente.
- [x] Al recibir una pieza que no cabe al spawnear, se ve el modal `FIN DEL JUEGO` de React con la misma puntuación que mostraba el canvas justo antes; el canvas no dibuja su propio "GAME OVER".
- [x] El botón "JUGAR DE NUEVO" reinicia con tablero vacío, puntuación 0, nivel 1; `Space` en ese estado no reinicia.
- [x] Recargar `/juegos/caida/jugar` en modo desarrollo (React Strict Mode) no duplica el bucle ni produce errores en consola.
- [x] Salir del reproductor detiene el bucle de animación y retira los listeners de teclado.
- [ ] Jugando con sesión iniciada, la puntuación aparece en `public.scores` y se refleja en `/juegos/caida` (mejor global), `/salon` y el ticker de la landing. _(pendiente de comprobar con una cuenta real; usa el mismo cableado de `game-player.tsx` ya validado en `rocas`)_
- [x] `rocas` sigue jugable sin cambios de comportamiento; el resto del catálogo sigue mostrando la arena falsa.

## Decisions taken and discarded

- **Sí:** reusar la entrada `caida` del catálogo existente. Su título, categoría (`PUZZLE`) y descripción ya sembrados en el SPEC 06 describen este mismo juego casi palabra por palabra; no requiere migración ni CSS de portada nuevos.
- **Sí:** letterbox del tablero 300×600 dentro del búfer fijo 800×600 de `game-player.tsx`, usando el ancho sobrante para el panel. Se descartó una regla CSS específica para `caida` en `.crt-screen` (rompería la convención 4:3 compartida) y un tablero centrado sin panel (perdería la vista de la pieza siguiente y el contador de líneas, que el original sí muestra).
- **Sí:** mantener las 8 piezas del original, incluida la "N" no estándar (tuerca 3×3 hueca). Es un port fiel al `game.js` de referencia y evita rebalancear la probabilidad de aparición de las demás piezas.
- **Sí:** `onLives(0)` emitido una vez al arrancar, en vez de reutilizar esa ranura para transportar `lines` o ampliar `EngineCallbacks` con un campo nuevo. El HUD de React ya resuelve `lives === 0` mostrando `—` sin cambios; ampliar el contrato obligaría a tocar también `game-player.tsx` y `AsteroidsGame` para no romperlos, y queda fuera del alcance de un port.
- **No:** el overlay propio de PAUSA/GAME OVER del original (`#overlay`). A diferencia del SPEC 05 (que sí conservó `drawOverlay()` de Asteroids en paralelo al modal de React), aquí se descarta entero: React ya cubre ambos estados sobre `.crt-screen` y el modal, y duplicarlo no aporta nada que el original necesitara por limitación técnica (el `#overlay` de Tetris solo existía porque el `index.html` original no tenía ningún componente de UI fuera del propio HTML).
- **Sí:** `P` y `Escape` pausan desde el teclado además del botón de React, igual que `AsteroidsGame`. Consistencia entre motores del mismo registro.
- **No:** `Space` no reinicia en estado `gameover`, a diferencia de Asteroids. En Tetris esa tecla es el hard drop; reutilizarla para reiniciar arriesgaría un reinicio accidental justo al perder. `restart()` queda como único camino, invocado solo desde "JUGAR DE NUEVO".
- **Sí:** derivar la etiqueta de controles de `game.id in GAME_ENGINES` en vez de añadir `caida` al ternario existente. Con dos motores registrados, seguir hardcodeando ids por juego se vuelve una lista que crece con cada port futuro; derivarla del registro cierra ese problema de una vez.
- **No:** portar el toggle de tema claro/oscuro con `localStorage` del `index.html` original. El Vault ya tiene su propio sistema de tema retro (`globals.css`); el del original es una preferencia de la página standalone, no del juego en sí.

## Risks

| Risk                                                                                                                                      | Mitigation                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El bucle o los listeners quedan vivos tras salir del reproductor sin recarga completa                                                     | `destroy()` idempotente, llamado desde el cleanup del efecto de montaje, igual que en `AsteroidsGame`                                                        |
| Strict Mode monta el efecto dos veces y crea dos instancias del motor sobre el mismo canvas                                               | El efecto de `game-player.tsx` ya usa una bandera de cancelación (`cancelled`, líneas 43-63); un motor creado tras desmontar se destruye sin arrancar        |
| El buffer del canvas es 800×600 fijo y el tablero nativo es 300×600 — deformación o desperdicio de espacio si no se maneja explícitamente | Letterbox explícito: tablero pegado a la izquierda a su tamaño nativo, panel dibujado en el ancho sobrante — decisión tomada, no accidental                  |
| Doble fuente de verdad entre el panel dibujado en canvas y el HUD de React (`score`/`level`)                                              | Los callbacks se emiten en paralelo al mismo dibujado (`emitChanges()` dentro del mismo `loop`), nunca en su lugar — mismo patrón validado en el SPEC 05     |
| `Space` (hard drop) podría reiniciar la partida por accidente si se reutilizara el patrón de Asteroids sin cambios                        | El estado `gameover` de `TetrisGame` no atiende ninguna tecla; solo `restart()` público reinicia, invocado exclusivamente desde el botón de React            |
| El panel y la preview de `next` ocupan espacio que en el original vivía en HTML aparte, con su propia tipografía y layout                 | Se dibujan con el mismo estilo monospace que ya usa `drawHUD()` de Asteroids, manteniendo consistencia visual entre motores sin replicar el CSS del original |

## What is **not** in this spec

- Arkanoid y los demás juegos del catálogo sin motor real.
- Cambios al contrato `EngineCallbacks`/`ArcadeEngine`.
- Controles táctiles o de gamepad.
- El toggle de tema claro/oscuro del original.
- Sonido y música.
- Cambios de balance o mecánicas nuevas.
- Escalado por `devicePixelRatio`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
