# SPEC — Galaga, enfoque B («vidas limpias») real en «invasores»

> **Status:** borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 08 (patrón `levels.ts` de progresión por oleadas y de un motor con múltiples tipos de entidad enemiga)
> **Date:** 2026-09-09
> **Alternativa excluyente:** `specs/game-jam/invasores/01-galaga-captura-y-nave-doble.md`
> **Objective:** Sustituir el reproductor falso de "Invasores" por un Galaga escrito desde cero contra el contrato `ArcadeEngine`, con formación de alienígenas que se forma y ataca en picado con trayectorias curvas, y una semántica de vidas limpia y estándar (sin captura ni nave doble), todo dibujado con formas vectoriales sobre el búfer 800×600 nativo, con la puntuación cayendo en `public.scores` como cualquier otro juego con motor real.

## Por qué este spec existe

El tema recibido para esta jam es **"naves y escuadrones alienígenas en formación, estilo Galaga"**. El juego ya viene decidido por el humano: **GALAGA**, sin pasar por la deliberación libre habitual de la Fase 2 — aun así esa fase se completa íntegra en el spec hermano (`specs/game-jam/invasores/01-galaga-captura-y-nave-doble.md`, sección "Fase 2 — Candidatos considerados bajo este tema"), con al menos 3 candidatos, la puerta de viabilidad y los desempates, dejando constancia de por qué Galaga gana la rúbrica también bajo este tema pese a constar ya como `propuesto` en `.claude/agents/game-planner/memoria.md` (entrada #005, GALAGA → `escuadron`). Este spec no repite esa deliberación completa para no duplicar texto entre los dos enfoques excluyentes; remite al hermano como fuente única de esa sección.

**Divergencia deliberada frente a la entrada #005 de `game-planner`:** esa entrada proponía el `games.id` nuevo `escuadron` (SHOOTER, yellow), con migración de `public.games` + un bloque `.cover-escuadron` nuevo en `app/globals.css`. Por decisión explícita del humano, este spec usa en su lugar el slot **`invasores`** (SHOOTER, green, `sort_order: 5`), confirmado libre hoy en `lib/games/registry.ts` (Fase 0) y ya sembrado en `public.games` con `short: "Defiende el planeta de filas alienígenas."` y `long: "Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie."` — texto que describe a Galaga sin forzar nada y sin coste de migración ni CSS.

**Efecto colateral sobre la entrada #002 de `game-planner`:** esa entrada proponía **SPACE INVADERS → `invasores`**, el mismo slot que ocupa este spec. Tras esta jam, la entrada #002 queda sin su slot candidato — Space Invaders seguiría siendo portable a futuro, pero ya no sobre `invasores` sin migración nueva.

**Fuente:** no hay ningún `game.js` de referencia para Galaga. `Glob referencias/started-games/*` solo devuelve `02-asteroids`, `03-tetris` y `04-arkanoid` (ya portados); `Glob referencias/source-assets/**` solo devuelve el sprite sheet de Snake, ya consumido íntegro en el SPEC 09. **Coste de assets: cero, obligatorio** — el motor se escribe desde cero y todo el arte es 100% pixel art / formas vectoriales dibujadas en canvas (`fillRect`, `arc`, polígonos vía `lineTo`), sin depender de ningún asset por conseguir.

## Scope

**In:**

- `lib/games/invasores/entities.ts` — tipos (`Vec2`, `EnemyKind`, `EnemyState`, `Enemy`, `Bullet`, `Player`), constantes de balance (grilla de formación, velocidades, puntuación, cadencias), y funciones puras: `createFormation()`, `bezierPoint(p0, p1, p2, t)` (trayectoria de picado), `aabbHit(a, b)` (colisión rectángulo-rectángulo).
- `lib/games/invasores/levels.ts` — tabla declarada de oleadas (velocidad base de picado, frecuencia de picado, velocidad de proyectil enemigo por nivel), siguiendo el patrón de datos de `lib/games/arkanoid/levels.ts`.
- `lib/games/invasores/engine.ts` — clase `GalagaGame` que implementa `ArcadeEngine`: bucle `requestAnimationFrame`, máquina de estados de la formación (`entering | forming | diving | cleared`), input propio, dibujado vectorial completo, emisión de callbacks, `destroy()` idempotente.
- `lib/games/invasores/index.ts` — factoría por defecto que exporta el motor para el registro.
- `lib/games/registry.ts` — una línea nueva, `invasores: () => import("@/lib/games/invasores")`.
- `app/juegos/[id]/page.tsx` — la etiqueta de controles ya deriva de `game.id in GAME_ENGINES` desde el SPEC 07 (confirmar en Fase 0 de implementación; si no deriva automáticamente, actualizar el texto hardcodeado a "← / → mueven la nave, Espacio dispara; P pausa").
- `CLAUDE.md` — actualizar los párrafos que listan qué juegos tienen motor real (`rocas`, `tetris`, `arkanoid`, `serpentina` → añadir `invasores`).

**Out of scope (for future specs):**

- El enfoque hermano de esta misma jam, `specs/game-jam/invasores/01-galaga-captura-y-nave-doble.md` (captura por el Boss Galaga y nave doble) — son alternativas excluyentes, no se implementan los dos.
- Los otros tres juegos del catálogo sin motor real tras este spec (`gloton`, `ranaria`, `duelo-pixel`).
- Cambios al contrato `EngineCallbacks`/`ArcadeEngine`.
- Controles táctiles o de gamepad. Solo teclado.
- Sonido y música — no hay assets de audio disponibles en el repo para este juego.
- Entrada coreografiada en curva de Bézier para la formación al inicio de cada oleada (solo los picados individuales usan curva; la entrada de formación es interpolación lineal simple).
- Cualquier mecanismo de captura, nave doble, o vida "especial" — es precisamente lo que este enfoque descarta a propósito, ver `## Decisions taken and discarded`.
- Bonus de precisión de disparo y cualquier otra mecánica de puntuación del Galaga original no listada explícitamente en `## Data model`.
- `app/components/game-player.tsx` y `lib/games-data.ts` — ya son genéricos, no cambian por añadir un quinto motor.
- Renombre del `games.id`/`title` de `invasores`.
- Tests automatizados (el proyecto no tiene test runner configurado).

## Data model

Este spec no introduce ninguna migración ni tabla nueva: el slot `invasores` ya existe en `public.games` desde el SPEC 06 (`SHOOTER`, green, `sort_order: 5`, `short: "Defiende el planeta de filas alienígenas."`), confirmado por consulta directa en la Fase 0:

```json
{
  "id": "invasores",
  "title": "INVASORES",
  "short": "Defiende el planeta de filas alienígenas.",
  "long": "Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.",
  "cat": "SHOOTER",
  "color": "green",
  "sort_order": 5,
  "cover": "cover-invaders"
}
```

Contrato de motor, leído de `lib/games/types.ts` en este momento (Fase 0 de este spec):

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
  invasores: () => import("@/lib/games/invasores"),
};
```

El búfer del canvas es 800×600 fijo (`game-player.tsx:144`), 4:3 nativo — **sin letterbox**: el área de juego usa el búfer completo.

### Balance — compartido con el enfoque A (no es el eje de separación de esta jam)

- Jugador: nave de 32×24px (triángulo vectorial), `y = 560` fijo, `x` acotado a `[24, 776]`. Movimiento continuo sin inercia: mientras `ArrowLeft`/`ArrowRight` (o `A`/`D`) esté presionada, `x` cambia a `PLAYER_SPEED = 320` px/s.
- Disparo del jugador: `Space` dispara un proyectil de `4×12px` a `PLAYER_BULLET_SPEED = 520` px/s hacia arriba; **un solo proyectil del jugador en pantalla a la vez** (mismo supuesto conservador que la entrada #002 de `game-planner` para Space Invaders).
- Formación: rejilla de `FORMATION_COLS = 8` columnas espaciadas `70px` (de `x = 100` a `x = 590`), `FORMATION_ROWS = 5` filas espaciadas `50px` desde `y = 80`:
  - Fila 0 (`y = 80`): **2 Boss Galaga** centrados (columnas 3–4), `hp: 2`, `scoreFormation: 150`, `scoreDiving: 400`.
  - Filas 1–2 (`y = 130, 180`): **8 Butterfly** por fila, `hp: 1`, `scoreFormation: 80`, `scoreDiving: 160`.
  - Filas 3–4 (`y = 230, 280`): **8 Bee** por fila, `hp: 1`, `scoreFormation: 50`, `scoreDiving: 100`.
  - Total por oleada: 34 enemigos (2 + 16 + 16). En este enfoque el Boss Galaga no tiene ninguna habilidad especial más allá de sus 150/400 puntos y su `hp: 2` — es, a efectos de comportamiento, un enemigo más resistente y valioso, sin haz tractor.
- Entrada de oleada: cada enemigo interpola linealmente desde un punto fuera del borde superior (`y = -40`, `x` = su columna de destino) hasta su celda de formación en `ENTRY_DURATION_MS = 1500`, escalonado con `ENTRY_STAGGER_MS = 60` por índice de enemigo.
- Picado: cada `DIVE_INTERVAL_MS(level) = max(400, 1800 - (level - 1) * 100)` un enemigo elegible se elige al azar para iniciar un picado; sigue una curva de Bézier cuadrática (`bezierPoint`) desde su celda de formación, con un punto de control lateral aleatorio y un punto final por debajo del borde inferior del área de juego; si sobrevive, reingresa a la formación por la misma interpolación lineal de entrada. Puede disparar un proyectil enemigo (`ENEMY_BULLET_SPEED(level) = 220 + (level - 1) * 15` px/s) con probabilidad `0.6` al cruzar el punto medio de su curva.
- Progresión: `level` sube al limpiar una oleada completa (34/34 destruidos); no hay tope de oleadas.
- `onScore`/`onLevel` se emiten solo al cambiar respecto al último valor notificado.

### Balance — específico de este enfoque (vidas limpias, sin captura)

- `onLives(3)` al arrancar. El jugador tiene un único estado de nave: no existen los estados `dual` ni `captured` del enfoque hermano.
- **Cualquier impacto sobre el jugador** — colisión directa con un enemigo o con un proyectil enemigo — resta exactamente una vida: `lives -= 1`, `onLives(lives)`. Sin excepciones, sin estados intermedios.
- Tras perder una vida, si `lives > 0` el jugador reaparece en la posición inicial tras `RESPAWN_DELAY_MS = 1000`, con `INVULNERABLE_MS = 1200` de invulnerabilidad tras reaparecer (parpadeo visual, sin colisión activa) — mitiga la "muerte en cadena" contra una formación densa, algo que el enfoque A no necesita declarar porque su ventana de captura ya cumple ese rol de respiro.
- Fin de partida: `onGameOver(score)` se dispara exactamente una vez, cuando `lives` llega a `0`.
- El Boss Galaga se destruye igual que cualquier otro enemigo (dos impactos, sin ninguna mecánica de haz tractor, captura o rescate).

## Implementation plan

1. `lib/games/invasores/entities.ts` — tipos (`Vec2`, `EnemyKind = "bee" | "butterfly" | "boss"`, `Enemy`, `Bullet`, `Player`), constantes de balance de la sección anterior, y funciones puras: `createFormation(level)`, `bezierPoint(p0, p1, p2, t)`, `aabbHit(a, b)`.
2. `lib/games/invasores/levels.ts` — función `levelConfig(level)` con `diveIntervalMs`, `enemyBulletSpeed` por nivel (progresión sin tope, misma fórmula que el enfoque hermano).
3. `lib/games/invasores/engine.ts`, primera mitad — clase `GalagaGame` con sus campos de estado (`formation: Enemy[]`, `playerBullets`, `enemyBullets`, `player: Player`, `invulnerableUntil`, `score`, `lives`, `level`, `waveState: "entering" | "forming" | "active" | "cleared"`, `state: "playing" | "paused" | "gameover"`) y los métodos privados `spawnWave()`, `updateFormationEntry(dt)`, `maybeStartDive(dt)`, `updateDives(dt)`, `checkPlayerHit()`.
4. Completar `engine.ts` con el bucle `requestAnimationFrame`, `dt` capado igual que en los 4 motores existentes, y los métodos públicos `pause()`/`resume()`/`restart()`/`destroy()` (idempotente, bandera `destroyed`).
5. Input propio — listeners en `window` como propiedades flecha; `ArrowLeft/Right` (y `KeyA`/`KeyD`) mueven al jugador con `preventDefault()` en las flechas; `Space` dispara (`preventDefault()`); `KeyP`/`Escape` alternan pausa; `visibilitychange` llama a `pause()`.
6. Cablear `checkPlayerHit()`: cualquier colisión resta una vida, respeta la ventana `INVULNERABLE_MS` tras reaparecer, y dispara `onGameOver` cuando `lives` llega a 0. Emitir `onScore`/`onLives`/`onLevel` solo al cambiar.
7. Dibujado vectorial — fondo oscuro del tema con estrellas parpadeantes de fondo; jugador como triángulo simple (parpadeando durante `INVULNERABLE_MS`); enemigos como polígonos simples distintos por tipo (bee: rombo; butterfly: forma de "M"; boss: hexágono, sin ningún adorno de captura); proyectiles como rectángulos finos. Ningún panel de stats en el canvas. Sin overlay propio de pausa o game over.
8. `lib/games/invasores/index.ts` — factoría por defecto (`(canvas, callbacks) => new GalagaGame(canvas, callbacks)`). Línea nueva en `lib/games/registry.ts` con la clave `invasores`.
9. `app/juegos/[id]/page.tsx` — confirmar si la etiqueta de controles ya deriva de `game.id in GAME_ENGINES` (SPEC 07); si no, actualizarla para `invasores`.
10. `npm run lint` y `npm run build`. Actualizar `CLAUDE.md`. Si `next dev` regeneró el bloque de `AGENTS.md`, commitearlo junto con el resto.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings.
- [ ] `/juegos/invasores/jugar` muestra el `<canvas>` real del juego (formación, jugador, proyectiles), no la arena falsa.
- [ ] La formación entra en oleada 1 con la interpolación de entrada, se estabiliza, y empieza a lanzar picados individuales con trayectoria curva visible.
- [ ] Destruir un enemigo en formación y el mismo tipo de enemigo en picado otorgan puntuaciones distintas (`scoreFormation` vs `scoreDiving`), reflejadas en `Puntuación` del HUD.
- [ ] Cualquier impacto sobre el jugador (colisión directa o proyectil enemigo) resta exactamente una vida en el HUD, sin excepciones ni estados intermedios.
- [ ] Tras perder una vida, el jugador reaparece y parpadea durante la ventana de invulnerabilidad, sin poder perder otra vida durante ese lapso.
- [ ] Al llegar `lives` a 0, se dispara el modal `FIN DEL JUEGO` de React con la puntuación correcta; el canvas no dibuja su propio "GAME OVER".
- [ ] Limpiar las 34 naves de una oleada genera la siguiente oleada y sube `Nivel` en el HUD; la cadencia de picado y la velocidad de los proyectiles enemigos aumentan de forma perceptible.
- [ ] El botón PAUSA congela el juego y REANUDAR lo continúa; `Escape` y `P` hacen lo mismo desde el teclado; cambiar de pestaña pausa automáticamente.
- [ ] El botón "JUGAR DE NUEVO" reinicia con 3 vidas, puntuación 0, nivel 1, oleada 1 entrando desde cero.
- [ ] Recargar `/juegos/invasores/jugar` en modo desarrollo (React Strict Mode) no duplica el bucle ni produce errores en consola.
- [ ] Salir del reproductor detiene el bucle de animación y retira los listeners de teclado.
- [ ] Jugando con sesión iniciada, la puntuación aparece en `public.scores` y se refleja en `/juegos/invasores` (mejor global), `/salon` y el ticker de la landing.
- [ ] `rocas`, `tetris`, `arkanoid` y `serpentina` siguen jugables sin cambios de comportamiento; el resto del catálogo (`gloton`, `ranaria`, `duelo-pixel`) sigue mostrando la arena falsa.

## Decisions taken and discarded

- **Sí, este enfoque (vidas limpias) sobre el enfoque hermano (captura y nave doble):** el eje de separación de esta jam es la **semántica de vidas**. Este enfoque descarta deliberadamente la captura del Boss Galaga y la nave doble, tratando cada impacto de forma uniforme (`lives -= 1`, sin estados intermedios) — es la variante de menor riesgo de implementación y más fácil de razonar y probar, al coste de sacrificar el mecanismo más icónico y distintivo de Galaga frente a Space Invaders/Galaxian. Se recomienda para quien priorice un port robusto y rápido de validar sobre la fidelidad máxima al original.
- **Sí:** invulnerabilidad temporal (`INVULNERABLE_MS = 1200`) tras reaparecer. Se añade porque, al no existir la ventana de "captura con margen de reacción" del enfoque hermano, una formación densa podría infligir dos impactos casi simultáneos y vaciar las 3 vidas de golpe sin que el jugador pueda reaccionar — es la compensación de diseño específica de prescindir de la captura.
- **No:** cualquier variante de "vida especial" (nave doble, escudo temporal, captura). Es precisamente el descarte que define este enfoque frente al hermano.
- **Sí:** slot `invasores` sin migración, sobre `escuadron` (memoria `game-planner` #005) — misma justificación que el spec hermano, ver `## Por qué este spec existe`.
- **Sí:** un solo proyectil del jugador en pantalla a la vez, igual que el enfoque hermano y que el supuesto conservador de la entrada #002 de `game-planner` para Space Invaders sobre el mismo slot.
- **No:** entrada de formación con curva de Bézier (solo interpolación lineal), por el mismo motivo de presupuesto de alcance que el enfoque hermano.

## Risks

| Risk                                                                                                                                                             | Mitigation                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El bucle o los listeners quedan vivos tras salir del reproductor sin recarga completa                                                                            | `destroy()` idempotente, llamado desde el cleanup del efecto de montaje, igual que los 4 motores existentes                                            |
| Strict Mode monta el efecto dos veces y crea dos instancias del motor sobre el mismo canvas                                                                      | El efecto de `game-player.tsx` ya usa una bandera de cancelación; un motor creado tras desmontar se destruye sin arrancar                              |
| Sin captura, las 3 vidas pueden perderse muy rápido frente a una formación densa con varios picados simultáneos, sintiéndose injusto                             | `INVULNERABLE_MS = 1200` tras cada reaparición, con parpadeo visual como señal clara al jugador                                                        |
| El slot `invasores` ya tenía una sugerencia previa distinta sobre la mesa (Space Invaders, memoria `game-planner` #002), que queda sin slot libre tras este spec | Documentado explícitamente en `## Por qué este spec existe` y en `specs/game-jam/game-jam.md`; Space Invaders sigue portable, pero ya no sin migración |
| Progresión sin tope (oleadas infinitas) puede volverse injugable a niveles muy altos si `DIVE_INTERVAL_MS`/`ENEMY_BULLET_SPEED` escalan sin límite               | Fórmulas con `max()`/suma acotada explícita en `## Data model`, mismo patrón que la aceleración de `tetris`                                            |

## What is **not** in this spec

- El enfoque hermano de esta jam, `specs/game-jam/invasores/01-galaga-captura-y-nave-doble.md` (captura y nave doble).
- Los otros tres juegos del catálogo sin motor real (`gloton`, `ranaria`, `duelo-pixel`).
- Cambios al contrato `EngineCallbacks`/`ArcadeEngine`.
- Controles táctiles o de gamepad.
- Sonido y música.
- Entrada de formación con curva de Bézier (solo interpolación lineal).
- Captura, nave doble, o cualquier vida "especial".
- Bonus de precisión de disparo y cualquier mecánica de puntuación no listada en `## Data model`.
- Migración de `public.games` o bloque `.cover-*` nuevo — este spec usa el slot ya sembrado `invasores`.
- Renombre del `games.id`/`title` de `invasores`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
