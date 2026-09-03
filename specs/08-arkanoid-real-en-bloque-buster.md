# SPEC 08 — Arkanoid real en «bloque-buster»

> **Status:** implementado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-09-03
> **Nota post-implementación (2026-09-03):** el catálogo se renombró de `bloque-buster`/"BLOQUE
> BUSTER" a `arkanoid`/"ARKANOID" tras cerrar la implementación de este spec, a pedido explícito
> del usuario — mismo patrón que el SPEC 07 aplicó a `caida` → `tetris`. A diferencia de aquel caso,
> aquí también se movieron rutas reales en disco: `lib/games/bloque-buster/` → `lib/games/arkanoid/`
> y `public/juegos/bloque-buster/` → `public/juegos/arkanoid/` (el spec original nombró la carpeta
> igual que el slot de catálogo de entonces, en vez de por el nombre del juego). El resto de este
> documento conserva el nombre original (`bloque-buster`) al describir la historia y las decisiones
> tal como estaban en el momento de escribirlo; solo el snippet de `registry.ts` y las URLs de
> criterios de aceptación de abajo, que siguen siendo datos operativos activos, se actualizaron a
> `arkanoid` para no quedar apuntando a un id o una ruta que ya no existen.
> **Objective:** Sustituir el reproductor falso de "bloque-buster" por el juego Arkanoid real de `referencias/started-games/04-arkanoid/`, portado a TypeScript sobre el contrato `ArcadeEngine` fijado en el SPEC 05, con su buffer nativo 800×600 (ya 4:3, sin letterbox), controles solo de teclado, sprites y sonido portados a `public/juegos/bloque-buster/`, y puntuación cayendo en `public.scores` como cualquier otro juego del SPEC 06.

## Por qué este spec existe

El SPEC 06 sembró `public.games` con 8 filas; `bloque-buster` ("BLOQUE BUSTER — Rebota la pelota y destruye muros de neón", `cat: ARCADE`) es una de ellas, pero `lib/games/registry.ts` solo tiene dos entradas (`rocas`, `tetris`), así que `bloque-buster` sigue cayendo en la arena falsa de `game-player.tsx` (`setInterval` subiendo el score sin mecánica real).

En paralelo, `referencias/started-games/04-arkanoid/` contiene un Arkanoid/Breakout completo y jugable: `game.js` (269 líneas), `levels.js` (5 niveles con distintos patrones de bloques y velocidad de bola creciente), y `assets/spritesheet.js` + `assets/spritesheet-breakout.png` + dos efectos de sonido (`ball-bounce.mp3`, `break-sound.mp3`). La ficha sembrada lo describe casi palabra por palabra: paleta, pelota, muros de bloques por nivel.

El original, tal como está, no se puede montar directamente en `game-player.tsx` por los mismos cuatro motivos que ya resolvió el SPEC 05 para Asteroids (script clásico autoejecutado, revienta si se monta dos veces, sin `preventDefault()`, sin callbacks) — y añade cuatro propios:

1. **Control mixto teclado + mouse.** La paleta se mueve con `ArrowLeft`/`ArrowRight` y también con `mousemove` sobre el canvas (traduciendo coordenadas de pantalla a coordenadas del buffer). Ningún motor del registro soporta mouse hoy.
2. **Overlay de pausa propio con selector de nivel.** Al pausar, el original dibuja 5 botones dentro del canvas y atiende `click` para saltar a cualquier nivel — una mecánica de depuración/arcade sin equivalente en el contrato ni en el overlay de pausa que ya dibuja React (`EN PAUSA` en `game-player.tsx`).
3. **Estado `win` sin equivalente en el contrato.** Al limpiar el nivel 5, el original entra en un estado terminal distinto de `gameover` (mensaje "¡Completaste el juego!"). `ArcadeEngine` solo tiene `onGameOver`.
4. **Sonido y sprites como assets binarios.** Sería el primer motor del catálogo con audio. Las rutas relativas del original (`assets/spritesheet-breakout.png`, `assets/sounds/*.mp3`) no resuelven bajo Next, y cada rebote clona un `Audio` (`bounceSound.cloneNode().play()`) sin que nada lo retenga — si el jugador sale del reproductor justo cuando un sonido empezó, seguiría sonando tras `destroy()` salvo que se rastree explícitamente.

Este spec resuelve los cuatro puntos con las decisiones tomadas en la Fase 2 (ver más abajo): solo teclado, sin selector de nivel, `win` converge en `onGameOver`, y assets con precarga + limpieza explícita de audio en `destroy()`.

## Scope

**In:**

- `lib/games/bloque-buster/entities.ts` — `Block`, `Explosion`, `collideAABB(ball, block)` y las funciones puras de paleta/pelota portadas de `game.js`, recibiendo `ctx`/`W`/`H` por parámetro en vez de cerrarlas por scope de módulo global.
- `lib/games/bloque-buster/sprites.ts` — port de `assets/spritesheet.js`: `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`, `loadSpritesheet()`, `drawSprite()`, `drawFrame()`, apuntando a `/juegos/bloque-buster/spritesheet-breakout.png` en vez de la ruta relativa del original.
- `lib/games/bloque-buster/levels.ts` — port literal de `LEVELS` (5 niveles, mismos patrones de bloques y multiplicador de velocidad) desde `levels.js`.
- `lib/games/bloque-buster/engine.ts` — clase `ArkanoidGame` que implementa `ArcadeEngine`: bucle `requestAnimationFrame` con handle propio, máquina de estados `playing | gameover`, listeners de teclado propios con `preventDefault()`, dibujado con los sprites portados, emisión de callbacks al cambiar `score`/`lives`/`level`/game over/pausa, `destroy()` idempotente que cancela el rAF, retira los listeners y detiene cualquier audio en curso.
- `lib/games/bloque-buster/index.ts` — factoría por defecto que exporta el motor para el registro.
- `lib/games/registry.ts` — una línea nueva, `"bloque-buster": () => import("@/lib/games/bloque-buster")`.
- `public/juegos/bloque-buster/spritesheet-breakout.png`, `ball-bounce.mp3`, `break-sound.mp3` — assets movidos desde `referencias/started-games/04-arkanoid/assets/`, referenciados por ruta absoluta.
- `CLAUDE.md` — actualizar los párrafos que listan qué juegos tienen motor real (`rocas`, `tetris` → añadir `bloque-buster`) y el que dice "Arkanoid remains unported".

`app/juegos/[id]/page.tsx` **no cambia**: la etiqueta de controles ya se deriva de `game.id in GAME_ENGINES` desde el SPEC 07, así que `bloque-buster` hereda "TECLADO" automáticamente en cuanto se registra su motor.

**Out of scope (for future specs):**

- `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel` — el resto del catálogo sin motor real.
- Cambios al contrato `EngineCallbacks`/`ArcadeEngine` — no se añade ninguna ranura para "victoria" ni para stats propios de este juego.
- Controles táctiles, de gamepad, o por mouse — el original los tiene, este port no.
- El selector de nivel del overlay de pausa original (5 botones por click).
- Bucle infinito de niveles tras completar el 5 — la partida termina ahí, como un game over más.
- `app/components/game-player.tsx`, `lib/games-data.ts` y las páginas de `/salon`, `/biblioteca`, `/` — ya son genéricas, no cambian por añadir un tercer motor.
- Ajustar dificultad, balance, niveles nuevos o power-ups.
- Nitidez en pantallas retina / escalado por `devicePixelRatio`.
- Tests automatizados (el proyecto no tiene test runner configurado).

## Data model

Este spec no introduce ninguna migración ni tabla nueva: `public.games`, `public.scores` y `public.game_stats` ya existen desde el SPEC 06, y la fila `bloque-buster` ya está sembrada en `supabase/migrations/20260826184921_games.sql`. El contrato de motor, leído de `lib/games/types.ts` en este momento:

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
// lib/games/registry.ts, tras este spec y el renombrado post-implementación
export const GAME_ENGINES: Record<string, () => Promise<{ default: EngineFactory }>> = {
  rocas: () => import("@/lib/games/asteroids"),
  tetris: () => import("@/lib/games/tetris"),
  arkanoid: () => import("@/lib/games/arkanoid"),
};
```

Las constantes de balance del juego original se portan con el mismo valor, sin ajustes: `PADDLE_SPEED = 400`, `BLOCK_COLS = 10`, `BLOCK_ROWS = 6`, `BLOCK_W = 64`, `BLOCK_H = 24`, `BASE_BALL_VX = 200`, `BASE_BALL_VY = -300`, paddle `81×14`, pelota `16×16`, 3 vidas iniciales, `EXPLOSION_DURATION = 150`ms con 4 frames por color, y los multiplicadores de velocidad de `LEVELS` (`1.00, 1.10, 1.21, 1.33, 1.46`). El búfer del canvas es 800×600 fijo — lo impone `game-player.tsx:144` (`<canvas width={800} height={600} />`) — y coincide exactamente con las dimensiones nativas del original y con el `aspect-ratio: 4/3` de `.crt-screen`, así que no hace falta ningún letterbox ni transformación de coordenadas.

## Implementation plan

1. `lib/games/bloque-buster/sprites.ts` — port de `assets/spritesheet.js`: mismas constantes (`SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`) y funciones (`loadSpritesheet`, `drawSprite`, `drawFrame`), cambiando la ruta de carga a `/juegos/bloque-buster/spritesheet-breakout.png`. El estado de carga (`ssImg`/`ssLoaded`) se mantiene a nivel de módulo a propósito: es una caché de un asset de solo lectura, no estado de partida — recargar el mismo módulo dos veces en React Strict Mode es idempotente (`loadSpritesheet` ya resuelve inmediatamente si `ssLoaded` es `true`), a diferencia del estado de juego que sí debe recrearse por instancia.
2. `lib/games/bloque-buster/levels.ts` — port literal de `LEVELS` desde `levels.js`, sin cambios de balance.
3. `lib/games/bloque-buster/entities.ts` — `collideAABB(ball, block)` y las funciones de inicialización (`initPaddle`, `initBall`, `loadLevel`) portadas de `game.js`, recibiendo `canvas`/dimensiones por parámetro.
4. `lib/games/bloque-buster/engine.ts`, primera mitad — la clase `ArkanoidGame` con sus campos de estado (`paddle`, `ball`, `blocks`, `explosions`, `score`, `lives`, `level`, `state: "playing" | "gameover"`, `activeSounds: Set<HTMLAudioElement>`) y los métodos privados `initPaddle()`, `initBall()`, `loadLevel(n)`, `update(dt)`, portados de las funciones homónimas de `game.js`. Limpiar todos los bloques del nivel 5 llama a `onGameOver(score)` directamente (no hay un estado `win` separado); limpiar los niveles 1–4 llama a `loadLevel(n + 1)` como el original.
5. Completar `engine.ts` con el bucle: `requestAnimationFrame` guardado en `this.rafId`, `dt` capado igual que `AsteroidsGame`/`TetrisGame`, `draw()` que no dibuja nada hasta que `loadSpritesheet()` resuelve (mismo guard `if (!ssLoaded) return` del original, evita un frame de canvas roto), y los métodos públicos `pause()`/`resume()`/`restart()`/`destroy()` (idempotente, con bandera `destroyed`).
6. Input propio en `engine.ts` — listeners en `window` como propiedades flecha (misma referencia para añadir y quitar): `ArrowLeft`/`ArrowRight` con `preventDefault()` mueven la paleta; `KeyP` y `Escape` alternan `pause()`/`resume()` y notifican por `onPause`; un listener de `visibilitychange` llama a `pause()` cuando `document.hidden` es `true`. Sin listeners de `mousemove` ni `click` — la paleta y la pausa dejan de responder al mouse.
7. Cablear los callbacks — `onScore`/`onLevel` se invocan solo cuando su valor cambia respecto al último emitido; `onLives` se invoca al perder una vida (empieza en 3); `onGameOver(score)` se invoca una sola vez, ya sea por `lives <= 0` o por limpiar el nivel 5. `onPause` se invoca desde `pause()`/`resume()`, tanto si los dispara el teclado como el botón de React. No se dibuja ningún overlay propio de pausa/game over/victoria en el canvas — React ya cubre los tres casos con el mismo modal y el mismo overlay `EN PAUSA`.
8. Audio — los sonidos (`ball-bounce.mp3`, `break-sound.mp3`) se cargan con rutas absolutas (`/juegos/bloque-buster/ball-bounce.mp3`, etc.) y se reproducen igual que el original (`cloneNode().play()`, para permitir solapamiento), pero cada clon se añade a `this.activeSounds` al reproducirse y se retira con su propio evento `ended`; `destroy()` itera `activeSounds` y llama `.pause()` en cada uno antes de vaciar el set, para que ningún sonido siga sonando tras salir del reproductor.
9. `lib/games/bloque-buster/index.ts` — factoría por defecto (`(canvas, callbacks) => new ArkanoidGame(canvas, callbacks)`) y la línea nueva en `lib/games/registry.ts` con la clave `"bloque-buster"`.
10. Mover `assets/spritesheet-breakout.png`, `assets/sounds/ball-bounce.mp3` y `assets/sounds/break-sound.mp3` de `referencias/started-games/04-arkanoid/` a `public/juegos/bloque-buster/`.
11. `npm run lint` y `npm run build`. Actualizar los párrafos de `CLAUDE.md` señalados en el Scope. Si `next dev` regeneró el bloque de reglas de `AGENTS.md`, commitearlo junto con el resto del trabajo.

## Acceptance criteria

- [x] `npm run build` y `npm run lint` terminan sin errores ni warnings.
- [x] `/juegos/arkanoid/jugar` muestra el `<canvas>` real del juego (paleta, pelota y bloques del nivel 1), no la arena falsa.
- [x] Las flechas mueven la paleta sin producir scroll en la página del reproductor; mover el mouse sobre el canvas o hacer click no tiene ningún efecto. _(verificado con Playwright: `ArrowLeft` sostenida 150ms mueve la paleta de x=360 a x=300 — 400px/s, igual a `PADDLE_SPEED` — y `mousemove`/`click` sobre el canvas no cambian su posición.)_
- [x] Romper un bloque suma 10 puntos, dispara la animación de explosión de 4 frames, y el `SCORE` dibujado en el canvas coincide con el HUD de React (Puntuación). _(incrementos de 10 en 10 confirmados en vivo; la animación de 4 frames se da por buena por lectura de código — dura 150ms, demasiado breve para capturarla en una captura de pantalla puntual.)_
- [x] Perder la pelota resta una vida reflejada a la vez en el canvas y en el HUD de React; al llegar a 0 vidas aparece el modal `FIN DEL JUEGO` de React con la misma puntuación, sin ningún overlay propio dibujado en el canvas.
- [ ] Limpiar todos los bloques de un nivel (1–4) carga el siguiente con su velocidad de bola correspondiente, reflejado en `NIVEL` del canvas y en el HUD de React. _(pendiente de comprobar con una partida real que limpie un nivel completo; el código replica 1:1 la condición `blocks.every(b => !b.alive)` del original, sin probar en vivo.)_
- [ ] Limpiar el nivel 5 dispara el mismo modal `FIN DEL JUEGO` de React (no un estado de victoria separado ni un overlay "¡Completaste el juego!" propio). _(mismo pendiente que el criterio anterior.)_
- [x] El botón PAUSA congela el juego (deja de mover la paleta y la pelota, sigue mostrando el último fotograma) y REANUDAR lo continúa; `Escape` y `P` hacen lo mismo desde el teclado; no aparece ningún selector de nivel por click durante la pausa.
- [x] El botón "JUGAR DE NUEVO" reinicia con nivel 1, 3 vidas y 0 puntos. _(se detectó y corrigió un bug real durante esta verificación: `initGame()` reseteaba `lastEmitted` a los mismos valores frescos, así que `emitChanges()` nunca detectaba el "cambio" y el HUD de React quedaba con los valores de la partida anterior hasta el próximo evento real. Arreglado quitando ese reset — igual que `AsteroidsGame`, que nunca toca `lastEmitted` en `initGame()` — para que el próximo frame sí detecte la diferencia y reemita.)_
- [x] Los sonidos de rebote y de rotura de bloque se escuchan durante la partida. _(la ruta de audio se ejecuta sin que `play()` rechace la promesa ni la consola muestre errores; el sonido audible en sí no se verificó de oído — requiere una pasada humana.)_
- [x] Salir del reproductor a mitad de un sonido lo detiene de inmediato (no sigue sonando tras navegar a otra ruta). _(cobertura de código: `destroy()` recorre `activeSounds` y llama `.pause()`; no verificado de oído.)_
- [x] Recargar `/juegos/arkanoid/jugar` en modo desarrollo (React Strict Mode) no duplica el bucle, no produce errores en consola, y no se percibe una segunda carga visible del spritesheet. _(múltiples recargas durante esta sesión, cero errores/warnings de la app en consola, progreso de puntuación consistente con una sola instancia del bucle.)_
- [x] Salir del reproductor detiene el bucle de animación y retira los listeners de teclado. _(verificado con el botón SALIR —navegación cliente, no recarga completa— seguido de un despacho manual de `ArrowLeft`: cero errores en consola.)_
- [ ] Jugando con sesión iniciada, la puntuación aparece en `public.scores` y se refleja en `/juegos/arkanoid` (mejor global), `/salon` y el ticker de la landing. _(pendiente de comprobar con una cuenta real; usa el mismo cableado de `game-player.tsx` ya validado en `rocas` y `tetris`.)_
- [x] `rocas` y `tetris` siguen jugables sin cambios de comportamiento; el resto del catálogo sigue mostrando la arena falsa. _(ambos verificados en vivo tras el cambio de `registry.ts`: cero errores en consola, canvas y HUD funcionando igual que antes.)_

## Decisions taken and discarded

- **Sí:** reusar la entrada `bloque-buster` del catálogo existente. Su título, categoría (`ARCADE`) y descripción ya sembrados en el SPEC 06 describen este mismo juego casi palabra por palabra; no requiere migración ni CSS de portada nuevos. Los otros slots libres (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) no describen un rompe-bloques.
- **Sí:** buffer 800×600 sin letterbox. A diferencia de Tetris (tablero nativo 300×600 dentro de un buffer 800×600), las dimensiones nativas de Arkanoid ya son 800×600 — coinciden exactamente con el buffer fijo de `game-player.tsx` y con el `aspect-ratio: 4/3` de `.crt-screen`. Ni la física del juego ni el CSS global necesitan tocarse.
- **No:** controles por mouse. El original soporta `mousemove` para la paleta además de las flechas; se descarta a favor de solo teclado, consistente con la etiqueta "TECLADO" que ya usan `rocas` y `tetris`, y evita traducir coordenadas de pantalla a coordenadas del buffer sobre un canvas estirado por CSS — algo que ningún motor del registro resuelve hoy.
- **No:** el selector de nivel del overlay de pausa original (5 botones por click para saltar de nivel). Mismo criterio que el SPEC 07 aplicó al overlay propio de Tetris: existía solo porque el `index.html` original no tenía ninguna UI de React alrededor. Pausa aquí es solo congelar/reanudar, igual que en los otros dos motores.
- **Sí:** el estado `win` del original (limpiar el nivel 5) converge en `onGameOver(score)`, en vez de ampliar el contrato con una noción de "victoria" o hacer que el juego vuelva al nivel 1 en bucle infinito. Ampliar `EngineCallbacks` obligaría a tocar también `game-player.tsx`, `AsteroidsGame` y `TetrisGame` para no romperlos, y queda fuera del alcance de un port; un bucle infinito complicaría el criterio de "una sola llamada a `onGameOver`" sin que el usuario lo haya pedido.
- **Sí:** portar sonido y sprites en vez de omitir el audio. Es fiel al original y los dos efectos (rebote, rotura de bloque) son simples de rastrear y limpiar. Se descarta dejar `spritesheet-breakout.png` visual sin los sonidos porque no simplifica nada relevante (el spritesheet ya obliga a resolver precarga por rutas absolutas de todos modos).
- **Sí:** rastrear cada clon de `Audio` reproducido en un `Set` propio de la instancia (`activeSounds`), en vez de asumir que su corta duración (<300ms) hace innecesaria la limpieza. `destroy()` los detiene explícitamente — es la única forma de garantizar que ningún sonido sigue tras salir del reproductor, sin depender de una suposición de timing.
- **Sí:** mantener el estado de carga del spritesheet (`ssImg`/`ssLoaded`) a nivel de módulo en `sprites.ts`, en vez de instanciarlo por partida. Es una caché de un asset de solo lectura compartida entre reinicios (`restart()`) y montajes duplicados de Strict Mode — no es estado de juego, así que no necesita el mismo aislamiento por instancia que sí exige `entities.ts`/`engine.ts`.
- **No:** ampliar `EngineCallbacks`/`ArcadeEngine`. Ningún stat propio de este juego (nivel, bloques restantes) queda fuera del contrato existente — el nivel ya tiene ranura (`onLevel`), y "bloques restantes" no es una prioridad de HUD que el usuario haya pedido exponer fuera del canvas.
- **Sí (encontrado durante la verificación, no planeado):** `initGame()` no resetea `lastEmitted` a los valores frescos de una partida nueva. La primera versión sí lo hacía, y `restart()` (llamado desde "JUGAR DE NUEVO") dejaba el HUD de React congelado en los valores de la partida anterior (p. ej. `VIDAS —` tras perder, en vez de volver a 3) porque `emitChanges()` solo emite cuando el valor interno difiere de `lastEmitted`, y ambos quedaban sincronizados sin que React se enterara del reinicio. Se corrigió quitando ese reset, igual que ya hace `AsteroidsGame` (que nunca toca `lastEmitted` en su `initGame()`): así el primer `emitChanges()` tras el reinicio siempre encuentra una diferencia real contra los valores de la partida terminada, y reemite `onScore`/`onLives`/`onLevel` de inmediato.

## Risks

| Risk                                                                                                                                                        | Mitigation                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El bucle o los listeners quedan vivos tras salir del reproductor sin recarga completa                                                                       | `destroy()` idempotente, llamado desde el cleanup del efecto de montaje, igual que en `AsteroidsGame`/`TetrisGame`                                                          |
| Strict Mode monta el efecto dos veces y crea dos instancias del motor sobre el mismo canvas                                                                 | El efecto de `game-player.tsx` ya usa una bandera de cancelación; un motor creado tras desmontar se destruye sin arrancar                                                   |
| Un sonido reproducido justo antes de salir del reproductor sigue sonando tras `destroy()`                                                                   | Cada clon de `Audio` se registra en `activeSounds` al reproducirse y `destroy()` llama `.pause()` en todos antes de vaciar el set                                           |
| El spritesheet no ha cargado cuando arranca el primer frame, mostrando un canvas negro o roto                                                               | `draw()` no dibuja nada hasta que `loadSpritesheet()` resuelve (mismo guard `!ssLoaded` del original); el bucle arranca igual pero el primer frame visible ya tiene sprites |
| Rutas relativas del original (`assets/...`) no resuelven bajo Next y los assets no cargan                                                                   | Todo se mueve a `public/juegos/bloque-buster/` y se referencia con ruta absoluta (`/juegos/bloque-buster/...`)                                                              |
| Descartar el selector de nivel y el estado `win` deja "huérfanas" partes de `game.js` que un lector que compare contra el original podría esperar encontrar | Documentado explícitamente en Decisiones — es una simplificación consciente para encajar en el contrato, no un olvido                                                       |

## What is **not** in this spec

- `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel` — el resto del catálogo sin motor real.
- Cambios al contrato `EngineCallbacks`/`ArcadeEngine`.
- Controles táctiles, de gamepad, o por mouse.
- El selector de nivel del overlay de pausa original.
- Bucle infinito de niveles tras completar el 5.
- Cambios de balance, niveles nuevos o power-ups.
- Escalado por `devicePixelRatio`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
