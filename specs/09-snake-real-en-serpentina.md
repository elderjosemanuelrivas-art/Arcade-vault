# SPEC 09 — Snake real en "Serpentina"

> **Status:** implementado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-03
> **Objective:** Sustituir el reproductor falso de "Serpentina" por un Snake escrito desde cero, portado al contrato `ArcadeEngine` fijado en el SPEC 05, con la grilla de juego dibujada a tamaño completo dentro del búfer 800×600 fijo de `game-player.tsx` y usando el sprite sheet de frutas aportado por el usuario, con la puntuación cayendo en `public.scores` como cualquier otro juego del SPEC 06.

## Por qué este spec existe

El SPEC 06 sembró `public.games` con 8 filas; `serpentina` ("SERPENTINA — Crece sin morder tu propia cola", `cat: ARCADE`, verde, `sort_order: 3`) es una de ellas, pero `lib/games/registry.ts` solo tiene tres entradas (`rocas`, `tetris`, `arkanoid`), así que `serpentina` sigue cayendo en la arena falsa de `game-player.tsx` (`setInterval` subiendo el score sin mecánica real).

A diferencia de los tres ports anteriores, aquí no hay un `game.js` de referencia en `referencias/started-games/`: el usuario aportó `referencias/source-assets/snake-assets/.../snake-assets/{fruits.png, sprites.js}` — un sprite sheet de 21 frutas (3790×442px, fondo transparente, fila usada y=136–295) más un atlas de recorte en JavaScript vanilla (`window.SPRITE_ATLAS`), sin ningún código de lógica de juego. El motor de Snake en sí se escribe desde cero para este spec; solo el arte de las frutas viene de una fuente externa.

## Scope

**In:**

- `lib/games/serpentina/entities.ts` — constantes de balance (grilla, velocidades, puntuación), tipos de dirección/celda, y funciones puras (spawn de fruta, detección de colisión con pared/cola, avance de la serpiente), recibiendo estado por parámetro en vez de cerrarlo por scope de módulo.
- `lib/games/serpentina/sprites.ts` — atlas de recorte de `fruits.png` reescrito como objeto TypeScript tipado (portado de `sprites.js`), más la carga perezosa de la imagen siguiendo el patrón ya validado de `lib/games/arkanoid/sprites.ts` (`loadSpritesheet(cb)`, caché a nivel de módulo, `ssLoaded`/callbacks).
- `lib/games/serpentina/engine.ts` — clase `SnakeGame` que implementa `ArcadeEngine`: bucle `requestAnimationFrame` con acumulador de tick propio (independiente del framerate), máquina de estados `playing | paused | gameover`, listeners de teclado propios con `preventDefault()`, dibujado de la grilla/serpiente/fruta a tamaño completo del canvas, emisión de callbacks al cambiar `score`/`level`/game over, `destroy()` idempotente que cancela el rAF y retira los listeners.
- `lib/games/serpentina/index.ts` — factoría por defecto que exporta el motor para el registro.
- `lib/games/registry.ts` — una línea nueva, `serpentina: () => import("@/lib/games/serpentina")`.
- `public/juegos/serpentina/fruits.png` — copia del sprite sheet, referenciado por ruta absoluta.
- `CLAUDE.md` — actualizar los párrafos que listan qué juegos tienen motor real (`rocas`, `tetris`, `arkanoid` → añadir `serpentina`), y la mención a `referencias/started-games/` para aclarar que este port no viene de ahí sino de `referencias/source-assets/`.

**Out of scope (for future specs):**

- Los otros cuatro juegos del catálogo sin motor real (`gloton`, `invasores`, `ranaria`, `duelo-pixel`).
- Cambios al contrato `EngineCallbacks`/`ArcadeEngine` — no se añade ninguna ranura nueva (ni para longitud de la serpiente ni para nada más; `score`/`level`/`lives` ya cubren todo lo que necesita este juego).
- Controles táctiles o de gamepad. Solo teclado.
- Sonido — no hay assets de audio en la fuente aportada; la partida es silenciosa, igual que Asteroids y Tetris.
- `app/juegos/[id]/page.tsx` — la etiqueta de controles ya deriva de `game.id in GAME_ENGINES` desde el SPEC 07; no hace falta tocarla.
- `app/components/game-player.tsx`, `lib/games-data.ts` y las páginas de `/salon`, `/biblioteca`, `/` — ya son genéricas, no cambian por añadir un cuarto motor.
- Tests automatizados (el proyecto no tiene test runner configurado).

## Data model

Este spec no introduce ninguna migración ni tabla nueva: `public.games`, `public.scores` y `public.game_stats` ya existen desde el SPEC 06, y la fila `serpentina` ya está sembrada en `supabase/migrations/20260826184921_games.sql`. El contrato de motor, leído de `lib/games/types.ts` en este momento:

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
  tetris: () => import("@/lib/games/tetris"),
  arkanoid: () => import("@/lib/games/arkanoid"),
  serpentina: () => import("@/lib/games/serpentina"),
};
```

El búfer del canvas es 800×600 fijo — lo impone `game-player.tsx:144` (`<canvas width={800} height={600} />`), fuera del alcance de este spec. La grilla de juego se fija en celdas de 40×40px: **20 columnas × 15 filas = 800×600 exactos**, así que la grilla ocupa el búfer completo sin márgenes de letterbox — a diferencia de Tetris (tablero 300×600 dentro de 800×600), aquí el tamaño de celda elegido hace que no sobre ni falte espacio.

Balance del juego, fijado por este spec (no viene de ningún original, se define aquí):

- Serpiente inicial: 3 segmentos, centrada en la grilla (columna 5, fila 7), moviéndose hacia la derecha.
- Dirección: flechas y WASD; una entrada que sea el reverso exacto de la dirección actual se ignora (no se puede girar 180° sobre la propia cola en el mismo tick).
- Tick de movimiento: `moveInterval = max(60, 150 - (level - 1) * 15)` ms, acumulado en el bucle `requestAnimationFrame` (no en `setInterval`, para poder pausar sin fugas).
- Puntuación: `+10` por fruta.
- Nivel: `level = floor(fruitsEaten / 5) + 1`; sube (y acelera el tick) cada 5 frutas.
- Fruta: aparece en una celda vacía elegida al azar (nunca sobre el cuerpo de la serpiente); cada fruta que se genera elige al azar uno de los 21 sprites del atlas (mismo valor de puntos para todas — no hay frutas especiales).
- Colisión con el borde de la grilla (columna/fila fuera de `[0, 19]`/`[0, 14]`) o con el propio cuerpo → game over inmediato.
- `onLives(0)` se emite una única vez al arrancar; Snake no tiene vidas y el HUD de React ya pinta `—` cuando `lives === 0` (`game-player.tsx:121`).

Atlas de sprites, portado de `sprites.js` (mismas 21 frutas, mismas coordenadas sobre `fruits.png`, reescrito como `Record<string, { x: number; y: number; w: number; h: number }>` en `lib/games/serpentina/sprites.ts` en vez de `window.SPRITE_ATLAS`): `banana`, `orange`, `grape`, `garlic`, `eggplant`, `strawberry`, `cherry`, `carrot`, `mushroom`, `broccoli`, `watermelon`, `pepper`, `kiwi`, `lemon`, `peach`, `peanut`, `apple`, `tomato`, `berries`, `grapes2`, `pineapple`, `melon`.

## Implementation plan

1. `lib/games/serpentina/entities.ts` — tipos (`Point`, `Direction`, `GameState`), constantes (`COLS = 20`, `ROWS = 15`, `CELL = 40`, `INITIAL_LENGTH = 3`, `SCORE_PER_FRUIT = 10`, `FRUITS_PER_LEVEL = 5`), y funciones puras: `createInitialSnake()`, `isOpposite(a, b)` (para bloquear el giro de 180°), `advance(snake, dir)` (nueva cabeza + recorte de cola, sin mutar el array recibido), `hitsWall(point)`, `hitsSelf(snake)`, `pickEmptyCell(snake, rng)` para el spawn de fruta.
2. `lib/games/serpentina/sprites.ts` — el atlas de las 21 frutas (coordenadas de `sprites.js`) como objeto TS tipado, más `loadSpritesheet(cb)` con caché a nivel de módulo (`ssLoaded`, callbacks en cola) siguiendo el patrón de `lib/games/arkanoid/sprites.ts`, y `drawFruit(ctx, key, x, y, size)` que hace `drawImage` recortando del atlas.
3. `lib/games/serpentina/engine.ts`, primera mitad — la clase `SnakeGame` con sus campos de estado (`snake`, `dir`, `pendingDir`, `fruit: { cell, spriteKey }`, `score`, `fruitsEaten`, `level`, `tickAccum`, `moveInterval`, `state: "playing" | "paused" | "gameover"`) y los métodos privados `spawnFruit()`, `step()` (avanza un tick: mueve, detecta colisión con pared/cola vía las funciones de `entities.ts`, detecta si comió fruta y llama a `spawnFruit()` + sube `score`/`fruitsEaten`/recalcula `level`), `tryTurn(dir)` (aplica `isOpposite` antes de aceptar el cambio de dirección, guardado en `pendingDir` para aplicarse en el próximo `step()` y no perder una tecla presionada entre ticks).
4. Completar `engine.ts` con el bucle: `requestAnimationFrame` guardado en `this.rafId`, `dt` capado igual que en `AsteroidsGame`/`TetrisGame`, `tickAccum` contra `moveInterval` disparando `step()`, y los métodos públicos `pause()`/`resume()`/`restart()`/`destroy()` (idempotente, con bandera `destroyed`, siguiendo el mismo patrón que los tres motores existentes).
5. Input propio en `engine.ts` — listeners en `window` como propiedades flecha (misma referencia para añadir y quitar); `ArrowUp/Down/Left/Right` y `KeyW/KeyA/KeyS/KeyD` llaman a `tryTurn(dir)`; `PREVENT_DEFAULT_CODES` cubre solo los códigos de flecha (`ArrowUp/Down/Left/Right`) porque WASD no produce scroll de página y no hace falta interceptarlo; `KeyP` y `Escape` alternan `pause()`/`resume()` y notifican por `onPause`; un listener de `visibilitychange` llama a `pause()` cuando `document.hidden` es `true`.
6. Dibujado — fondo oscuro del tema con una rejilla sutil de líneas de baja opacidad cada `CELL` px (coherente con el estilo "neón" del Vault); cada segmento de la serpiente como un bloque sólido verde (`--` variable de acento verde del tema), la cabeza en un tono más claro para distinguirla del cuerpo; la fruta activa dibujada con `drawFruit()` escalada a `CELL × CELL` en su celda. No se dibuja ningún panel de score/nivel en el canvas (a diferencia de Tetris): la grilla ocupa el búfer 800×600 completo sin espacio sobrante, y el HUD de React (`game-player.tsx`) ya muestra Puntuación/Vidas/Nivel fuera del canvas. Tampoco se dibuja overlay propio de pausa o game over — React ya cubre ambos casos sobre `.crt-screen` y el modal.
7. Cablear los callbacks — `onScore`/`onLevel` se invocan solo cuando su valor cambia respecto al último emitido (mismo patrón `emitChanges()` que los motores existentes); `onLives(0)` una única vez al arrancar; `onGameOver(score)` una sola vez, cuando `step()` detecta colisión con pared o con la propia cola; `onPause` se invoca desde `pause()`/`resume()`, tanto si los dispara el teclado (`KeyP`/`Escape`) como el botón de React.
8. `lib/games/serpentina/index.ts` — factoría por defecto (`(canvas, callbacks) => new SnakeGame(canvas, callbacks)`), que en su constructor llama a `loadSpritesheet()` antes de arrancar el bucle (o arranca el bucle igual pero no dibuja fruta hasta que `ssLoaded` sea `true` — el juego es jugable desde el primer frame aun si la imagen tarda unos milisegundos, la fruta simplemente no se ve hasta que cargue). Línea nueva en `lib/games/registry.ts` con la clave `serpentina`.
9. Copiar `fruits.png` a `public/juegos/serpentina/fruits.png`; `sprites.ts` referencia `/juegos/serpentina/fruits.png` por ruta absoluta.
10. `npm run lint` y `npm run build`. Actualizar los párrafos de `CLAUDE.md` señalados en el Scope. Si `next dev` regeneró el bloque de reglas de `AGENTS.md`, commitearlo junto con el resto del trabajo.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings.
- [ ] `/juegos/serpentina/jugar` muestra el `<canvas>` real del juego (grilla, serpiente, fruta), no la arena falsa.
- [ ] Flechas y WASD mueven la serpiente sin producir scroll en la página del reproductor; intentar girar 180° sobre la propia cola en el mismo tick no causa un game over instantáneo por auto-colisión falsa.
- [ ] Comer una fruta la hace desaparecer, aparece una fruta nueva en una celda vacía con un sprite aleatorio del atlas, la serpiente crece un segmento, y `Puntuación` sube +10 en el HUD de React.
- [ ] Cada 5 frutas el nivel sube (`Nivel` en el HUD) y el movimiento se acelera visiblemente.
- [ ] Tocar el borde de la grilla o la propia cola dispara el modal `FIN DEL JUEGO` de React con la puntuación correcta; el canvas no dibuja su propio "GAME OVER".
- [ ] El botón PAUSA congela el juego y REANUDAR lo continúa; `Escape` y `P` hacen lo mismo desde el teclado; cambiar de pestaña pausa automáticamente.
- [ ] El botón "JUGAR DE NUEVO" reinicia con serpiente de 3 segmentos, puntuación 0, nivel 1, en el centro de la grilla.
- [ ] Recargar `/juegos/serpentina/jugar` en modo desarrollo (React Strict Mode) no duplica el bucle ni produce errores en consola.
- [ ] Salir del reproductor detiene el bucle de animación y retira los listeners de teclado.
- [ ] Jugando con sesión iniciada, la puntuación aparece en `public.scores` y se refleja en `/juegos/serpentina` (mejor global), `/salon` y el ticker de la landing.
- [ ] `rocas`, `tetris` y `arkanoid` siguen jugables sin cambios de comportamiento; el resto del catálogo (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) sigue mostrando la arena falsa.

## Decisions taken and discarded

- **Sí:** reusar la entrada `serpentina` del catálogo existente (ARCADE, verde, `sort_order: 3`). Es el único slot libre que encaja temáticamente con Snake; no requiere migración ni CSS de portada nuevos.
- **Sí:** letterbox implícito en 800×600 con celdas de 40px (20×15). Se descartó una regla CSS específica para `serpentina` en `.crt-screen` (rompería la convención 4:3 compartida) y una grilla más fina de celdas de 20px (40×30) — la de 40px llena el búfer exacto sin sobrante y da un look "chunky retro" más propio de Snake arcade clásico.
- **Sí:** muerte al tocar el borde de la grilla, sin wrap-around. Es el Snake arcade clásico y es la variante más simple de razonar para el game over.
- **Sí:** puntuación fija (+10) por fruta, con nivel subiendo cada 5 frutas y acelerando el tick de movimiento. Se descartó escalar los puntos con la longitud actual de la serpiente por ser menos estándar en Snake clásico y añadir una variable más a balancear sin necesidad.
- **Sí:** `onLives(0)` emitido una vez al arrancar, igual que Tetris. El HUD de React ya resuelve `lives === 0` mostrando `—` sin cambios; Snake no tiene concepto de vidas.
- **Sí:** serpiente dibujada como bloques sólidos de color (verde, con la cabeza en un tono más claro), no como sprite — no hay asset de serpiente en la fuente aportada, y el estilo pixel-art sólido es coherente con el tema "Arcade Vault". La fruta sí usa el sprite sheet aportado, eligiendo al azar entre las 21 disponibles en cada spawn para aprovechar todo el atlas.
- **No:** sonido. La fuente aportada no trae ningún asset de audio; se descartó añadir efectos nuevos por estar fuera del alcance de los assets entregados.
- **No:** panel de score/nivel dibujado en el canvas (a diferencia de Tetris). Ahí sobraba ancho tras el letterbox y se usó para mostrar la pieza siguiente; aquí la grilla llena el búfer completo y el HUD de React ya cubre `score`/`level`/`lives` sin duplicación.
- **Sí:** atlas de `sprites.js` reescrito como objeto TypeScript tipado en `lib/games/serpentina/sprites.ts`, no servido tal cual. El original depende de `window.SPRITE_ATLAS` (script clásico, no módulo ES); reescribirlo evita esa dependencia global y sigue el mismo patrón de módulo que ya usa `lib/games/arkanoid/sprites.ts`.
- **Sí:** `P` y `Escape` pausan desde el teclado además del botón de React, igual que los tres motores existentes. Consistencia entre motores del mismo registro.
- **Sí:** WASD como alternativa a las flechas, sin `preventDefault()` en esas teclas (no producen scroll de página, a diferencia de las flechas).

## Risks

| Risk                                                                                                                                     | Mitigation                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| El bucle o los listeners quedan vivos tras salir del reproductor sin recarga completa                                                    | `destroy()` idempotente, llamado desde el cleanup del efecto de montaje, igual que en los tres motores existentes                                   |
| Strict Mode monta el efecto dos veces y crea dos instancias del motor sobre el mismo canvas                                              | El efecto de `game-player.tsx` ya usa una bandera de cancelación; un motor creado tras desmontar se destruye sin arrancar                           |
| Girar 180° en el mismo tick provocaría que la cabeza choque contra el segundo segmento del propio cuerpo (auto-colisión falsa)           | `tryTurn(dir)` ignora cualquier dirección que sea el reverso exacto de la dirección actual antes de aceptarla, portado como regla estándar de Snake |
| `fruits.png` tarda en cargar (aunque es pequeño) y el primer frame se dibuja antes de que `loadSpritesheet()` resuelva                   | El bucle arranca igual y es jugable de inmediato; la fruta simplemente no se dibuja hasta que `ssLoaded` sea `true`, sin bloquear el juego          |
| El acumulador de tick de movimiento se desincroniza si el tab pierde foco y `requestAnimationFrame` deja de dispararse por un rato largo | `visibilitychange` llama a `pause()` cuando `document.hidden`, igual que los motores existentes; al reanudar, el `dt` del primer frame se capa      |
| Referenciar `fruits.png` con ruta relativa del original en vez de absoluta rompería la carga bajo Next                                   | Copiado a `public/juegos/serpentina/fruits.png`, referenciado siempre como `/juegos/serpentina/fruits.png`                                          |

## What is **not** in this spec

- Los otros cuatro juegos del catálogo sin motor real (`gloton`, `invasores`, `ranaria`, `duelo-pixel`).
- Cambios al contrato `EngineCallbacks`/`ArcadeEngine`.
- Controles táctiles o de gamepad.
- Sonido y música.
- Frutas especiales, combos, o cualquier mecánica de puntuación distinta a la fija por fruta.
- Un panel dibujado en el canvas para stats — el HUD de React ya cubre `score`/`lives`/`level`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
