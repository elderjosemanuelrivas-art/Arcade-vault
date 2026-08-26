# SPEC 05 — Juego real de Asteroids en "Rocas"

> **Status:** approved
> **Depends on:** SPEC 01, SPEC 04
> **Date:** 2026-08-25
> **Objective:** Sustituir el reproductor falso de "Rocas" por el juego Asteroids real de `referencias/started-games/02-asteroids/`, portado a TypeScript, manteniendo su HUD y su pantalla de fin de partida dibujados en canvas tal como el original, y notificando en paralelo al HUD y al modal ya existentes en `game-player.tsx`.

## Por qué este spec existe

El SPEC 01 dejó `app/components/game-player.tsx` explícitamente como maqueta: la puntuación sube sola vía `setInterval` (`game-player.tsx:22`), y la "arena" son cuatro `div` con animaciones CSS (`.game-arena`, `.enemy`, `.player-ship`) sin ninguna mecánica real. `CLAUDE.md` lo documenta así: "no canvas, no iframe, no real game engine wired in yet".

En paralelo, `referencias/started-games/02-asteroids/` contiene un Asteroids completo y jugable: `game.js` (511 líneas, sin dependencias ni assets, canvas fijo 800×600), con clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, bucle `requestAnimationFrame`, wrap toroidal, sistema de niveles y power-up de disparo triple. El catálogo mock (`data/games.ts`) ya tiene una entrada que encaja 1:1: `rocas` ("ROCAS — Pulveriza asteroides en gravedad cero", `cat: SHOOTER`).

El original, tal como está, no se puede montar directamente en un componente de React por cuatro motivos:

1. **Sin API de arranque/parada.** El script se autoejecuta al final del archivo (`initGame(); requestAnimationFrame(loop);`) y el `loop` se reprograma para siempre sin guardar el handle de `requestAnimationFrame`.
2. **Revienta al montarse dos veces.** Es un script clásico (no un módulo): sus `const`/`class` de nivel superior (`canvas`, `ctx`, `Bullet`, `Ship`, `ship`, `score`, etc.) chocarían con un `SyntaxError: Identifier has already been declared` si el cuerpo se evaluara dos veces, como hace React en modo desarrollo (Strict Mode monta cada efecto dos veces).
3. **No hace `preventDefault()`.** Las flechas y la barra espaciadora harían scroll de la página del Vault, que sí tiene overflow vertical (a diferencia del `index.html` original, fijado a `100vh`).
4. **Sin ningún hook de puntuación.** No hay callback, evento ni `postMessage`; la única salida es el propio `<canvas>`.

Este spec resuelve los cuatro puntos portando el motor a una clase TypeScript con ciclo de vida explícito (`pause/resume/restart/destroy`) y callbacks, dejando games futuros (Tetris, Arkanoid) con el mismo patrón listo para reutilizar.

## Scope

**In:**

- `lib/games/types.ts` — contrato compartido `EngineCallbacks`, `ArcadeEngine`, `EngineFactory`.
- `lib/games/registry.ts` — `GAME_ENGINES: Record<string, () => Promise<{ default: EngineFactory }>>` con una sola entrada, `rocas`.
- `lib/games/asteroids/entities.ts` — port de `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, recibiendo `ctx`/`W`/`H` como parámetros en vez de cerrarlos por scope de módulo global.
- `lib/games/asteroids/engine.ts` — clase `AsteroidsGame` que implementa `ArcadeEngine`: bucle `requestAnimationFrame` con handle propio, máquina de estados `playing | dead | gameover | paused`, listeners de teclado propios con `preventDefault()`, `drawHUD()` y `drawOverlay()` del canvas conservados tal como el original, emisión de callbacks al cambiar `score`/`lives`/`level`/game over (en paralelo al dibujado en canvas, no en su lugar), `destroy()` idempotente que cancela el rAF y retira los listeners.
- `lib/games/asteroids/index.ts` — factoría por defecto que exporta el motor para el registro.
- `app/components/game-player.tsx` — reescrito para montar un `<canvas>` real cuando el juego tiene motor registrado, y conservar la arena falsa actual como fallback para el resto del catálogo.
- `app/globals.css` — reglas para el `<canvas>` dentro de `.crt-screen` y una línea de aviso "REQUIERE TECLADO".
- `app/juegos/[id]/page.tsx` — la etiqueta fija `TECLADO / TÁCTIL` (línea 33) pasa a `TECLADO` para el juego real (sigue mostrando la actual en el resto, dado que ninguno tiene controles táctiles hoy tampoco).
- `CLAUDE.md` — actualizar el párrafo que describe `game-player.tsx` como "fake game" y el que dice que nada en `app/`, `lib/` o `data/` referencia `referencias/started-games/`.

**Out of scope (for future specs):**

- Puntuaciones reales: tabla `scores`, sustituir `seededScores()`, `game.best` deja de ser mock. El SPEC 04 ya difirió esto explícitamente; este spec no lo retoma.
- Portar Tetris (`03-tetris`) o Arkanoid (`04-arkanoid`) — este spec solo cubre Asteroids, aunque deja el patrón de registro listo para ellos.
- Controles táctiles o de gamepad. Solo teclado.
- Sonido y música (el original tampoco los tiene).
- Cualquier persistencia local del mejor puntaje (`localStorage`) — el SPEC 04 retiró justamente ese patrón de `av_scores`.
- Recolorear el juego con la paleta del sitio: se mantiene monocromo (blanco/negro, powerup cian, llama de propulsor naranja), igual que el original.
- Ajustar dificultad, balance o añadir mecánicas nuevas (power-ups adicionales, jefes, etc.).
- Nitidez en pantallas retina / escalado por `devicePixelRatio`.
- Tests automatizados (el proyecto no tiene test runner configurado).

## Data model

Este spec no introduce datos persistidos. Introduce un contrato de código compartido entre el reproductor y cualquier motor de juego:

```ts
// lib/games/types.ts
export type EngineCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
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
// lib/games/registry.ts
export const GAME_ENGINES: Record<string, () => Promise<{ default: EngineFactory }>> = {
  rocas: () => import("@/lib/games/asteroids"),
};
```

Las constantes de balance del juego original se portan con el mismo valor, sin ajustes: `RADII = [0, 16, 30, 50]`, `SPEEDS = [0, 85, 55, 32]`, `POINTS = [0, 100, 50, 20]`, `ROT = 3.5`, `THRUST = 260`, `DRAG = 0.987`, `POWERUP_DROP_CHANCE = 0.15`, `POWERUP_DURATION = 5`, `POWERUP_TTL = 12`, `TRIPLE_SPREAD = 0.18`, cooldown de disparo `0.2`s, invencibilidad de reaparición `3`s, dt capado a `0.05`s.

## Implementation plan

1. Crear `lib/games/types.ts` con el contrato de la sección anterior y `lib/games/registry.ts` con el mapa (puede apuntar a un módulo que aún no existe). Verificación: `npx tsc --noEmit` falla solo por el import inexistente, no por tipos.
2. Crear `lib/games/asteroids/entities.ts`: port mecánico de `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` desde `referencias/started-games/02-asteroids/game.js`, recibiendo `ctx: CanvasRenderingContext2D` y las dimensiones `W`/`H` como parámetros de `draw()`/constructor en vez de variables de módulo global. Verificación: `npx tsc --noEmit` sin errores.
3. Crear `lib/games/asteroids/engine.ts`, primera mitad: la clase `AsteroidsGame` con sus campos de estado (`ship`, `bullets`, `asteroids`, `particles`, `powerUps`, `score`, `lives`, `level`, `state`, `deadTimer`, `powerUpSpawned`, `killsSinceSpawn`) y los métodos privados `spawnAsteroids`, `initGame`, `nextLevel`, `explode`, `killShip`, portados de las funciones homónimas del original. Verificación: `npx tsc --noEmit` sin errores.
4. Completar `engine.ts` con el bucle: `requestAnimationFrame` guardado en `this.rafId`, `dt` capado a 0.05s igual que hoy, y los métodos públicos `pause()`/`resume()` (dejan de invocar `update`, siguen invocando `draw` para no congelar el último fotograma en negro) y `destroy()` (`cancelAnimationFrame(this.rafId)`, idempotente). Verificación: manual, `npm run dev` y comprobar en consola que no hay errores al importar el módulo desde una página de prueba temporal.
5. Añadir el input propio del motor dentro de `engine.ts`: listeners en `window` para `keydown`/`keyup` usando `e.code`, con `event.preventDefault()` en `ArrowLeft`, `ArrowRight`, `ArrowUp` y `Space`; `KeyP` y `Escape` alternan `pause()`/`resume()`; un listener de `visibilitychange` llama a `pause()` cuando `document.hidden` es `true`. Todos los listeners se registran en el constructor o en un método `start()` y se retiran en `destroy()`. Se conserva el reinicio con `Space` en estado `gameover`, igual que el original, llamando internamente al mismo `restart()` público que también invoca el botón "JUGAR DE NUEVO" de React — ambos caminos convergen en la misma lógica, sin duplicar comportamiento. Verificación: jugar con teclado no mueve el scroll de la página del reproductor.
6. Cablear los callbacks: `onScore`/`onLives`/`onLevel` se invocan solo cuando su valor cambia respecto al fotograma anterior (comparación simple, sin emitir en cada `update`), y `onGameOver(score)` se invoca una vez, desde la rama `lives <= 0` de `killShip()`. `drawHUD()` y `drawOverlay()` se mantienen intactos dentro de `draw()`, igual que en el original — el canvas sigue mostrando SCORE/NIVEL/vidas y el texto "GAME OVER"; los callbacks solo añaden una notificación en paralelo, no sustituyen el dibujado. Verificación: `npx tsc --noEmit` y revisión manual de que `/juegos/rocas/jugar` muestra el HUD tanto en el canvas como en `.player-hud` a la vez.
7. Crear `lib/games/asteroids/index.ts` exportando la factoría por defecto (`(canvas, callbacks) => new AsteroidsGame(canvas, callbacks)`) y apuntar `lib/games/registry.ts` a ese módulo. Verificación: `npm run lint` sin errores.
8. Reescribir `app/components/game-player.tsx`: `useRef<HTMLCanvasElement>` para el canvas; un efecto que resuelve `GAME_ENGINES[game.id]`, y si existe, hace `await import(...)`, crea el motor con callbacks que llaman a los `setState` existentes (`setScore`, nuevo `setLives`, nuevo `setLevel`, y `endGame` como `onGameOver`), y devuelve `engine.destroy()` como cleanup — con una bandera de cancelación para el caso en que el componente se desmonte antes de que resuelva el `import()`. Los `setState` viven dentro de los callbacks pasados al motor, no en el cuerpo del efecto, respetando `react-hooks/set-state-in-effect` (documentado en `CLAUDE.md`). El botón PAUSA llama a `engine.pause()`/`engine.resume()` en vez de solo alternar estado local; JUGAR DE NUEVO llama a `engine.restart()`. `lives` deja de ser un `useState` fijo en `3` y `level` deja de derivarse de `score / 2500` cuando hay motor real; ambos quedan como fallback intactos cuando no lo hay. Verificación: `npm run lint` sin errores; en `/juegos/rocas/jugar` se ve el canvas del juego real, y en cualquier otro juego se sigue viendo la arena falsa de antes.
9. Añadir a `app/globals.css` la regla del `<canvas>` dentro de `.crt-screen` (`position: absolute; inset: 0; width: 100%; height: 100%; display: block`, sin `image-rendering: pixelated` porque el juego es vectorial, no de sprites) y una línea de aviso `.player-kb-note` ("REQUIERE TECLADO") visible bajo el CRT solo cuando el juego activo tiene motor real. Corregir la etiqueta `TECLADO / TÁCTIL` a `TECLADO` en `app/juegos/[id]/page.tsx` cuando `game.id === "rocas"`. Verificación visual en `/juegos/rocas` y `/juegos/rocas/jugar`.
10. `npm run lint` y `npm run build`. Actualizar los dos párrafos de `CLAUDE.md` señalados en el Scope. Si `next dev` regeneró el bloque de reglas de `AGENTS.md`, commitearlo junto con el resto del trabajo. Verificación: ambos comandos terminan sin errores ni warnings.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings.
- [ ] `/juegos/rocas/jugar` muestra un `<canvas>` con la nave y 4 asteroides grandes al cargar, no la arena de `div`s animados.
- [ ] Las flechas rotan y propulsan la nave, y Espacio dispara, sin producir scroll en la página del reproductor.
- [ ] Destruir un asteroide grande suma 20 puntos, uno mediano 50, uno pequeño 100, y el total se refleja a la vez en el `SCORE` dibujado dentro del canvas y en el HUD de React (`.hud-stat .v` de Puntuación).
- [ ] Chocar contra un asteroide resta una vida, visible tanto en los iconos de nave del canvas como en el HUD de React; tras 3 vidas perdidas se detiene el juego.
- [ ] Al llegar a 0 vidas se ve el texto `GAME OVER` dibujado en el canvas (como en el original) y, en paralelo, aparece el modal `FIN DEL JUEGO` de React con la misma puntuación final.
- [ ] Pulsar `Espacio` en la pantalla de game over reinicia la partida (comportamiento original conservado), y también lo hace el botón "JUGAR DE NUEVO" del modal de React — ambos dejan la partida en 0 puntos, 3 vidas y nivel 1 sin recargar la página.
- [ ] Vaciar el campo de asteroides incrementa el nivel mostrado tanto en el canvas (`NIVEL`) como en el HUD de React, y respawnea una oleada mayor.
- [ ] El botón PAUSA congela el juego (deja de actualizar física, sigue mostrando el último fotograma) y REANUDAR lo continúa; `Escape` y `P` hacen lo mismo desde el teclado.
- [ ] Cambiar a otra pestaña del navegador pausa el juego automáticamente; volver a la pestaña no lo reanuda solo.
- [ ] Pulsar SALIR o navegar a otra ruta detiene el bucle de animación y retira los listeners de teclado (verificable escribiendo en cualquier input de otra página sin que reaccione a flechas/espacio).
- [ ] Recargar `/juegos/rocas/jugar` en modo desarrollo (React Strict Mode) no duplica el bucle del juego ni produce errores en consola.
- [ ] El resto de juegos del catálogo (los otros 7) siguen mostrando la arena falsa con el `setInterval` de puntuación, sin cambios de comportamiento.
- [ ] `localStorage` no contiene ninguna clave nueva tras jugar una partida completa.

## Decisions taken and discarded

- **Sí:** reusar la entrada `rocas` del catálogo existente en vez de crear una entrada nueva o renombrar. Ya tiene título, categoría (`SHOOTER`) y descripción coherentes con Asteroids; no requiere tocar `data/games.ts` ni añadir CSS de portada.
- **Sí:** portar el motor a una clase TypeScript con ciclo de vida explícito, en vez de un `<iframe>` con los archivos originales. Un iframe evitaría el port pero el HUD de React no podría leer la puntuación sin `postMessage`, y el marco `.crt` (scanlines, viñeta) no se aplicaría dentro de un documento aislado.
- **No:** un solo archivo con las ~500 líneas del motor. Se separan tipos (`types.ts`), registro (`registry.ts`), entidades (`entities.ts`) y motor (`engine.ts`) siguiendo el patrón de un archivo por responsabilidad que ya usa el resto del repo (`app/components/`).
- **Sí:** mantener `drawHUD()` y `drawOverlay()` intactos en el canvas, tal como el original, y que el motor además notifique a React (`.player-hud` y el modal) en paralelo. Se prefirió sobre "solo React" para conservar la experiencia original del juego dentro de la pantalla del CRT; la duplicación de información se acepta como coste consciente en vez de evitarse.
- **Sí:** conservar el reinicio con `Espacio` del original en la pantalla de game over, en vez de eliminarlo. Al mantenerse `drawOverlay()` con su texto "ESPACIO PARA REINICIAR", quitar esa función habría dejado un mensaje engañoso; ambos caminos (`Espacio` y el botón "JUGAR DE NUEVO" del modal) llaman al mismo `restart()` público, así que no hay lógica duplicada, solo dos disparadores.
- **Sí:** mantener el juego monocromo (blanco/negro/cian/naranja) en vez de recolorear con la paleta del sitio. El marco `.crt` ya aporta la ambientación retro (glow cian, scanlines); recolorear las entidades es riesgo de romper la legibilidad del juego sin ganancia visual clara.
- **No:** controles táctiles en este spec. El original es solo teclado; añadir un D-pad en pantalla es trabajo de UI y de pruebas independiente, mejor en su propio spec si se decide dar soporte móvil.
- **Sí:** un registro (`lib/games/registry.ts`) en vez de un `if (game.id === "rocas")` dentro de `game-player.tsx`. Un registro escala sin tocar el componente cuando se porten Tetris o Arkanoid; el `if` se pudre en cuanto exista un segundo motor.
- **Sí:** `import()` dinámico del motor en vez de import estático. El código del juego (entidades + motor) solo debe viajar a quien realmente abre `/juegos/rocas/jugar`, no a cualquiera que visite otra ficha de juego.
- **Sí:** búfer del canvas fijo en 800×600, estirado por CSS dentro de `.crt-screen` (que ya tiene `aspect-ratio: 4/3`). Evita tocar ninguna constante de física del juego original; el coste es una ligera pérdida de nitidez en pantallas grandes, aceptable para el alcance de este spec.
- **No:** persistir el mejor puntaje en `localStorage`. El SPEC 04 retiró explícitamente ese patrón (`av_scores`) por ser una maqueta de un solo navegador sin lectores reales; reintroducirlo aquí sería dar un paso atrás.
- **No:** guardar puntuaciones reales en Supabase en este spec. Ampliaría el alcance a diseñar un esquema `scores` con RLS, que el SPEC 04 ya dejó explícitamente para otro spec.

## Risks

| Risk                                                                                                                                                                                                          | Mitigation                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El bucle `requestAnimationFrame` o los listeners de teclado quedan vivos tras salir del reproductor (navegación de cliente sin recarga completa)                                                              | `destroy()` es idempotente, se llama desde el cleanup del efecto de montaje, y hay un criterio de aceptación específico que verifica que las teclas dejan de reaccionar tras salir                                                    |
| React Strict Mode monta el efecto dos veces en desarrollo, y un `import()` en vuelo podría crear dos instancias del motor sobre el mismo canvas                                                               | El efecto usa una bandera de cancelación: si el componente se desmonta antes de que resuelva el `import()`, el motor recién creado se destruye inmediatamente sin llegar a arrancar                                                   |
| `preventDefault()` global sobre flechas y Espacio podría interferir con inputs de texto en la misma página                                                                                                    | Los listeners solo existen mientras el motor está montado, y la ruta `/juegos/[id]/jugar` no tiene ningún campo de texto salvo el input de iniciales dentro del modal, que solo aparece cuando el motor ya está pausado por game over |
| Emitir los callbacks de puntuación/vidas/nivel en cada fotograma provocaría un re-render de React 60 veces por segundo                                                                                        | Los callbacks solo se invocan cuando el valor efectivamente cambia respecto al fotograma anterior, comparando contra el último valor emitido                                                                                          |
| El canvas estirado por CSS en pantallas grandes se ve ligeramente suavizado al no coincidir 1:1 con los píxeles físicos                                                                                       | Aceptado explícitamente; ajustar por `devicePixelRatio` queda fuera de este spec                                                                                                                                                      |
| `lib/games/` no está excluido de ESLint/Prettier (a diferencia de `referencias/`), así que el código portado debe cumplir las mismas reglas que el resto del repo, incluida `react-hooks/set-state-in-effect` | El plan de implementación llama explícitamente esa regla en el paso 8; el hook `PostToolUse` de formato corre igual sobre estos archivos                                                                                              |
| El `CLAUDE.md` propio de `referencias/started-games/02-asteroids/` describe convenciones de un proyecto standalone que no aplican aquí (sin build, sin framework)                                             | Ya documentado en el `CLAUDE.md` raíz del repo: esos archivos son material de referencia, no se siguen sus instrucciones                                                                                                              |
| La puntuación, vidas y nivel quedan duplicados visualmente (canvas + `.player-hud`), y podrían desincronizarse si el motor y React no se actualizan en el mismo fotograma                                     | Ambas fuentes leen del mismo estado interno del motor (el canvas se dibuja en el mismo `draw()` que dispara los callbacks); no hay dos fuentes de verdad, solo dos renderizados del mismo dato                                        |
| El texto "GAME OVER" del canvas y el modal de React aparecen a la vez, y ambos ofrecen una vía de reinicio (`Espacio` vs. botón) que podría confundir sobre cuál es la "oficial"                              | Ambas vías llaman al mismo método público `restart()`; documentado explícitamente en las decisiones como una elección consciente, no un descuido                                                                                      |

## What is **not** in this spec

- Puntuaciones reales (tabla `scores`, sustituir `seededScores()`, `game.best` real).
- Tetris y Arkanoid.
- Controles táctiles o de gamepad.
- Sonido y música.
- Mejor puntaje en `localStorage`.
- Recoloreado del juego con la paleta del sitio.
- Cambios de balance o mecánicas nuevas.
- Escalado por `devicePixelRatio`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
