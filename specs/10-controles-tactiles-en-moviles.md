# SPEC 10 — Controles táctiles en móviles

> **Status:** implementado
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-09-10
> **Objective:** Añadir controles táctiles en pantalla (D-pad + botones de acción) a los cuatro juegos con motor real (`rocas`, `tetris`, `arkanoid`, `serpentina`), visibles solo en dispositivos táctiles, sin modificar ninguna lógica interna de los `engine.ts` existentes.

## Por qué este spec existe

Los SPEC 05, 07, 08 y 09 excluyeron explícitamente los controles táctiles ("Controles táctiles o de gamepad. Solo teclado.") y dejaron dicho que, si se decidía dar soporte móvil, merecía su propio spec — este es ese spec. Hoy los 4 motores reales escuchan `keydown`/`keyup` directamente sobre `window` (confirmado en `lib/games/{asteroids,tetris,arkanoid,serpentina}/engine.ts`), el `<canvas>` de `game-player.tsx` es un búfer fijo de 800×600 escalado visualmente por CSS (`.crt-screen canvas { width:100%; height:100% }`, ya presente desde antes de este spec), y `game-player.tsx` muestra un aviso estático `REQUIERE TECLADO` sin ningún control en pantalla. En un teléfono no hay forma de jugar ninguno de los 4 juegos reales.

## Scope

**In:**

- `lib/games/touch-controls.ts` (nuevo) — mapa `TOUCH_CONTROLS` con el esquema de D-pad + botones de acción para cada uno de los 4 juegos con motor real, usando los mismos `code` de teclado que cada `engine.ts` ya reconoce (ver Data model).
- `app/components/touch-controls.tsx` (nuevo) — componente cliente que renderiza el D-pad y los botones de acción de un `TouchScheme`, y despacha `KeyboardEvent("keydown"/"keyup", { code })` sintéticos sobre `window` al presionar/soltar cada botón.
- `app/globals.css` — nuevas clases `.touch-controls`, `.touch-dpad`, `.touch-actions`, `.touch-btn` (reusando la paleta y tipografía ya definidas, mismo idioma visual que `.btn`/`.chip`), ocultas por defecto y mostradas solo bajo `@media (pointer: coarse)`; ese mismo media query oculta `.player-kb-note` en esos dispositivos.
- `app/components/game-player.tsx` — montar `<TouchControls>` debajo de `.crt` cuando el juego tiene motor real y una entrada en `TOUCH_CONTROLS`; el aviso `REQUIERE TECLADO` existente no se toca en JSX (el CSS ya lo oculta donde corresponde).
- `app/juegos/[id]/page.tsx` — la etiqueta de controles (línea 34) deja de depender de `game.id in GAME_ENGINES` y pasa a mostrar siempre `"TECLADO / TÁCTIL"`, ya que tras este spec los 4 juegos con motor real soportan ambos.
- `CLAUDE.md` — actualizar el párrafo de arquitectura de `game-player.tsx` para mencionar `lib/games/touch-controls.ts` y `app/components/touch-controls.tsx`.

**Out of scope (for future specs):**

- Soporte de gamepad/mando físico — excluido desde el SPEC 05, sigue fuera aquí.
- Cambiar la resolución interna del canvas (800×600) o añadir lógica de resize/DPR — el escalado visual por CSS ya existe desde antes de este spec y no se toca.
- Bloquear o sugerir una orientación de pantalla — sin restricciones, el canvas ya escala en cualquier orientación.
- Interacciones táctiles personalizadas por juego (arrastrar la paleta de `arkanoid`, swipe en `serpentina`) — se usa el mismo D-pad uniforme en los 4 juegos.
- Los 4 juegos sin motor real (`duelo-pixel`, `gloton`, `invasores`, `ranaria`) — sin controles reales que tocar, siguen con la arena falsa igual que hoy.
- Cambios al contrato `EngineCallbacks`/`ArcadeEngine`/`EngineFactory` — el input táctil vive enteramente en la capa de UI de React, ningún `engine.ts` se modifica.
- Persistencia de preferencias táctiles entre sesiones (no aplica: no hay nada que elegir ni guardar).
- Vibración/haptic feedback.
- Tests automatizados (el proyecto no tiene test runner configurado).

## Data model

Este spec no introduce ninguna tabla ni migración — es una feature puramente de cliente. El "modelo de datos" es el esquema TypeScript nuevo en `lib/games/touch-controls.ts`, y el mapeo concreto de `code` por juego, verificado leyendo cada `engine.ts` actual:

```ts
// lib/games/touch-controls.ts
export type TouchAction = { code: string; label: string };

export type TouchScheme = {
  dpad: Partial<Record<"up" | "down" | "left" | "right", TouchAction>>;
  actions: TouchAction[];
};

export const TOUCH_CONTROLS: Partial<Record<string, TouchScheme>> = {
  rocas: {
    dpad: {
      left: { code: "ArrowLeft", label: "◀" },
      right: { code: "ArrowRight", label: "▶" },
      up: { code: "ArrowUp", label: "▲" },
    },
    actions: [{ code: "Space", label: "DISPARAR" }],
  },
  tetris: {
    dpad: {
      left: { code: "ArrowLeft", label: "◀" },
      right: { code: "ArrowRight", label: "▶" },
      down: { code: "ArrowDown", label: "BAJAR" },
    },
    actions: [{ code: "ArrowUp", label: "GIRAR" }],
  },
  arkanoid: {
    dpad: {
      left: { code: "ArrowLeft", label: "◀" },
      right: { code: "ArrowRight", label: "▶" },
    },
    actions: [],
  },
  serpentina: {
    dpad: {
      up: { code: "ArrowUp", label: "▲" },
      down: { code: "ArrowDown", label: "▼" },
      left: { code: "ArrowLeft", label: "◀" },
      right: { code: "ArrowRight", label: "▶" },
    },
    actions: [],
  },
};
```

Notas sobre el mapeo, tomadas del código real de cada motor (no inventadas):

- `rocas` (`asteroids/engine.ts`): `ArrowLeft`/`ArrowRight` rotan, `ArrowUp` impulsa, `Space` dispara (`pressed("Space")`). No hace falta un botón de pausa/reinicio táctil — ya son botones de React (`PAUSA`, `FIN`, `JUGAR DE NUEVO`) fuera del canvas, no dependen del teclado.
- `tetris` (`tetris/engine.ts`): `ArrowLeft`/`ArrowRight` mueven, `ArrowDown` es soft-drop, y tanto `ArrowUp` como `KeyX` rotan la pieza (`case "ArrowUp": case "KeyX":` en el mismo bloque) — el botón táctil solo necesita despachar `ArrowUp`, no hace falta duplicar `KeyX`.
- `arkanoid` (`arkanoid/engine.ts`): solo `ArrowLeft`/`ArrowRight` mueven la paleta continuamente (`this.keys.ArrowLeft`/`this.keys.ArrowRight` leídos en cada frame); no hay tecla de lanzamiento de bola ni otra acción, así que `actions` queda vacío.
- `serpentina` (`serpentina/engine.ts`): las 4 flechas cambian de dirección vía `KEY_DIRECTIONS`; no hay botón de acción.
- En los 4 motores, `KeyP`/`Escape` alternan pausa — no se replica por botón táctil porque el botón `PAUSA` de React ya cumple esa función sin depender del teclado.

## Implementation plan

1. `lib/games/touch-controls.ts` — el tipo `TouchAction`/`TouchScheme` y el mapa `TOUCH_CONTROLS` con las 4 entradas de la sección Data model.
2. `app/components/touch-controls.tsx` — componente cliente `TouchControls({ scheme }: { scheme: TouchScheme })`: renderiza el D-pad como una cruz de hasta 3 botones (up/left/right o up/down/left/right según el esquema) y los `actions` como una fila aparte. Cada botón usa handlers de Pointer Events: `onPointerDown` despacha `window.dispatchEvent(new KeyboardEvent("keydown", { code }))`, y `onPointerUp`/`onPointerCancel`/`onPointerLeave` despachan el `keyup` correspondiente; `touch-action: none` en los botones para que sostenerlos no dispare scroll/zoom del navegador.
3. `app/globals.css` — bloque nuevo: `.touch-controls { display: none; ... }` (contenedor con `.touch-dpad` en grid 3×3 estilo cruz y `.touch-actions` en fila, reusando `--cyan`/`--magenta`/`var(--pixel)` como el resto del tema) y `@media (pointer: coarse) { .touch-controls { display: flex; } .player-kb-note { display: none; } }`.
4. `app/components/game-player.tsx` — importar `TOUCH_CONTROLS` y `TouchControls`; justo después del bloque `.crt` (donde hoy vive `{hasEngine && <p className="player-kb-note">...}`), añadir `{hasEngine && TOUCH_CONTROLS[game.id] && <TouchControls scheme={TOUCH_CONTROLS[game.id]!} />}`. El párrafo `player-kb-note` se deja tal cual — el CSS del paso 3 decide cuándo se oculta.
5. `app/juegos/[id]/page.tsx` — cambiar la línea `{game.id in GAME_ENGINES ? "TECLADO" : "TECLADO / TÁCTIL"}` por el literal `"TECLADO / TÁCTIL"`; si el import de `GAME_ENGINES` queda sin otro uso en el archivo, quitarlo.
6. Verificación con Playwright MCP: `browser_resize` a un viewport móvil (390×844), navegar a `/juegos/rocas/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/serpentina/jugar`; confirmar que aparece el D-pad/acciones y que `REQUIERE TECLADO` no se ve; usar `browser_click` sobre cada botón y confirmar por el HUD (score, posición del sprite, etc.) que el motor responde igual que con la tecla física equivalente; luego `browser_resize` a un viewport de escritorio (1280×800) y confirmar que los controles táctiles desaparecen y `REQUIERE TECLADO` reaparece.
7. `npm run lint` y `npm run build`. Actualizar el párrafo de `CLAUDE.md` señalado en el Scope. Si `next dev` regeneró el bloque de reglas de `AGENTS.md`, commitearlo junto con el resto del trabajo.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings.
- [ ] En un viewport con `pointer: coarse` (emulado con Playwright), `/juegos/rocas/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/serpentina/jugar` muestran el D-pad + botones de acción debajo del canvas y no muestran `REQUIERE TECLADO`.
- [ ] En un viewport de escritorio (`pointer: fine`), esos mismos 4 juegos no muestran ningún control táctil y sí muestran `REQUIERE TECLADO`, igual que antes de este spec.
- [ ] En `rocas`, tocar los botones de dirección rota/impulsa la nave y el botón de acción dispara.
- [ ] En `tetris`, tocar los botones de dirección mueve la pieza a los lados y hacia abajo, y el botón de acción la rota.
- [ ] En `arkanoid`, tocar los botones de dirección mueve la paleta a izquierda/derecha.
- [ ] En `serpentina`, tocar cada botón del D-pad cambia la dirección de la serpiente.
- [ ] Mantener presionado un botón direccional produce movimiento continuo mientras se sostiene, no solo un pulso.
- [ ] Soltar el botón (o deslizar el dedo fuera de él) detiene el movimiento, igual que soltar la tecla física.
- [ ] Los 4 juegos siguen jugables con teclado físico sin ningún cambio de comportamiento respecto a antes de este spec.
- [ ] Ningún `engine.ts`/`entities.ts`/`sprites.ts`/`skins.ts`/`index.ts` de los 4 motores existentes cambió.
- [ ] El selector de skin (donde exista) sigue funcionando sin cambios.
- [ ] `/juegos/[id]` muestra `"TECLADO / TÁCTIL"` para los 8 juegos del catálogo.
- [ ] `gloton`, `invasores`, `ranaria` y `duelo-pixel` no muestran ningún control táctil nuevo y siguen con la arena falsa sin cambios.

## Decisions taken and discarded

- **Sí:** eventos de teclado sintéticos (`KeyboardEvent` despachado sobre `window`) en vez de una API de input formal en `ArcadeEngine`. Cero riesgo de regresión sobre 4 motores ya probados y en producción; el input táctil vive enteramente en la capa de UI de React.
- **Sí:** D-pad + botones uniforme para los 4 juegos, con el mapeo de teclas específico de cada uno resuelto en `touch-controls.ts`. Se descartó una interacción a medida por juego (arrastrar la paleta de `arkanoid`, swipe en `serpentina`) por ser 4 interacciones distintas de diseñar y probar sin necesidad real, dado que el D-pad ya cubre exactamente el input que cada motor sabe interpretar.
- **Sí:** detección vía `@media (pointer: coarse)` en CSS, no _user-agent sniffing_ en JavaScript. Es la señal estándar del navegador para "el dispositivo principal es táctil", sin listas de user-agents que mantener.
- **Sí:** controles ubicados debajo del canvas, nunca superpuestos sobre él. Evita tapar el área de juego y es coherente con el HUD existente, que ya vive fuera del canvas.
- **No:** cambiar la resolución interna del canvas o su lógica de resize/DPR. El escalado visual (`.crt-screen canvas { width:100%; height:100% }` dentro de un contenedor con `aspect-ratio: 4/3`) ya existía antes de este spec — no había nada que resolver ahí.
- **No:** bloqueo o sugerencia de orientación de pantalla. El canvas ya escala en cualquier orientación vía CSS; no se agrega ninguna lógica nueva.
- **No:** soporte de gamepad. Fuera de alcance, excluido explícitamente desde el SPEC 05.
- **Sí:** verificación con Playwright MCP (resize + click con emulación de puntero) en vez de solo prueba manual, siguiendo el mismo patrón que ya usa `skin-designer`, dado que el repo no tiene test runner configurado.

## Risks

| Risk                                                                                                                                    | Mitigation                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mantener presionado un botón táctil no dispara "auto-repeat" como el navegador con una tecla física real                                | El código sintético dispara un solo `keydown` en `pointerdown` y un solo `keyup` en `pointerup`; los 4 motores usan un mapa `keys[code] = true/false` leído en cada frame del loop, no dependen de eventos repetidos, así que el movimiento continuo sale igual mientras el botón siga presionado |
| `pointerup` no se dispara si el dedo se desliza fuera del botón antes de soltar                                                         | También se escuchan `pointercancel` y `pointerleave` para forzar el `keyup` y evitar que una dirección quede "pegada"                                                                                                                                                                             |
| Un dispositivo híbrido (laptop táctil con mouse) cumple `pointer: coarse` y muestra los controles aunque el usuario prefiera el teclado | Ambos caminos conviven sin conflicto — mismo evento `keydown`/`keyup` sobre `window` sea sintético o real; los motores no distinguen el origen, así que el teclado físico sigue funcionando igual                                                                                                 |
| Multitouch: dos botones presionados a la vez (p. ej. dirección + acción en `rocas`)                                                     | Cada botón despacha su propio par `keydown`/`keyup` sobre su propio `code`; no hay estado compartido entre botones que se pise                                                                                                                                                                    |
| `CLAUDE.md` queda desactualizado si no se edita el párrafo de arquitectura tras este spec                                               | Paso final del plan de implementación lo actualiza explícitamente                                                                                                                                                                                                                                 |

## What is **not** in this spec

- Soporte de gamepad/mando físico.
- Cambios a la resolución interna del canvas o a su lógica de resize/DPR.
- Bloqueo o sugerencia de orientación de pantalla.
- Interacciones táctiles a medida por juego (arrastre, swipe).
- Los 4 juegos sin motor real (`duelo-pixel`, `gloton`, `invasores`, `ranaria`).
- Cambios al contrato `EngineCallbacks`/`ArcadeEngine`/`EngineFactory`.
- Persistencia de preferencias táctiles entre sesiones.
- Vibración/haptic feedback.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
