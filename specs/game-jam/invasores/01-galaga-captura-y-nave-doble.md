# SPEC — Galaga, enfoque A («captura y nave doble») real en «invasores»

> **Status:** borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 08 (patrón `levels.ts` de progresión por oleadas y de un motor con múltiples tipos de entidad enemiga)
> **Date:** 2026-09-09
> **Alternativa excluyente:** `specs/game-jam/invasores/02-galaga-vidas-limpias.md`
> **Objective:** Sustituir el reproductor falso de "Invasores" por un Galaga escrito desde cero contra el contrato `ArcadeEngine`, con formación de alienígenas que se forma, ataca en picado con trayectorias curvas y captura la nave del jugador vía el Boss Galaga — liberación y nave doble incluidas — todo dibujado con formas vectoriales sobre el búfer 800×600 nativo, con la puntuación cayendo en `public.scores` como cualquier otro juego con motor real.

## Por qué este spec existe

El tema recibido para esta jam es **"naves y escuadrones alienígenas en formación, estilo Galaga"**. El juego ya viene decidido por el humano: **GALAGA**, sin pasar por la deliberación libre habitual de la Fase 2 — aun así esta Fase 2 se completa íntegra más abajo, con al menos 3 candidatos, la puerta de viabilidad y los desempates, para dejar constancia escrita de que Galaga gana la rúbrica también bajo este tema y de por qué sigue siendo la mejor opción pese a constar ya como `propuesto` en `.claude/agents/game-planner/memoria.md` (entrada #005, GALAGA → `escuadron`).

**Divergencia deliberada frente a la entrada #005 de `game-planner`:** esa entrada proponía el `games.id` nuevo `escuadron` (SHOOTER, yellow), lo que exige migración de `public.games` + un bloque `.cover-escuadron` nuevo en `app/globals.css`. Por decisión explícita del humano, este spec usa en su lugar el slot **`invasores`** (SHOOTER, green, `sort_order: 5`), confirmado libre hoy en `lib/games/registry.ts` (Fase 0) y ya sembrado en `public.games` con `short: "Defiende el planeta de filas alienígenas."` y `long: "Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie."` — texto que describe a Galaga (formaciones descendentes, cañón horizontal) sin forzar nada y sin inventar redacción nueva. Usar `invasores` evita por completo el coste de migración + CSS que pedía la entrada #005, a cambio de renunciar al `id`/color propios que esa entrada sugería (`escuadron`, yellow) — se documenta como trade-off aceptado, no como error de #005.

**Efecto colateral sobre la entrada #002 de `game-planner`:** esa entrada proponía **SPACE INVADERS → `invasores`**, precisamente el mismo slot. Al asignar `invasores` a Galaga en esta jam, la entrada #002 se queda sin su slot candidato — Space Invaders seguiría siendo portable, pero ya no sobre este `games.id` sin migración nueva. Ver también "Descartados" más abajo y el riesgo correspondiente en la sección `## Risks`.

**Fuente:** no hay ningún `game.js` de referencia para Galaga. `Glob referencias/started-games/*` solo devuelve `02-asteroids`, `03-tetris` y `04-arkanoid` (ya portados); `Glob referencias/source-assets/**` solo devuelve el sprite sheet de Snake (`snake-assets/`), ya consumido íntegro en el SPEC 09. Por tanto **coste de assets: cero, obligatorio** — el motor se escribe desde cero (mismo precedente que Snake/SPEC 09) y todo el arte es 100% pixel art / formas vectoriales dibujadas en canvas (`fillRect`, `arc`, polígonos vía `lineTo`), sin depender de ningún asset por conseguir. Esto descarta de raíz, para toda esta jam, el eje "sprites nuevos vs. vectorial" como posible eje de separación entre los dos enfoques (Fase 3) — ambos enfoques son vectoriales.

### Fase 2 — Candidatos considerados bajo este tema (con Galaga ganando explícitamente)

**Puerta de viabilidad** (aplicada a los tres): los tres caben en un único `<canvas>` 800×600 sin segunda vista; su estado se expresa con `score`/`lives`/`level` sin ampliar el contrato; se juegan enteros con teclado; son pausables/reiniciables/destruibles sin fugas; assets cero (formas vectoriales); alcanzables en un solo spec de port por enfoque. Los tres pasan.

1. **GALAGA → `invasores`** (elegido). Formación que se forma en vuelo, picados individuales con trayectorias curvas precalculadas, y el mecanismo de captura/nave doble del Boss Galaga — sin análogo en `rocas`/`tetris`/`arkanoid`/`serpentina` (desempate 1, variedad de mecánica). Reutiliza la interpolación vectorial de trayectorias ya validada en `asteroids/entities.ts` y el patrón de tabla de datos por oleada de `arkanoid/levels.ts` (desempate 3). Cero assets (desempate 4). Y decisivo para esta jam en concreto: **es el único de los tres candidatos que admite dos diseños genuinamente distintos y con código distinto** (desempate 5, el criterio propio de `game-jam` que `game-planner` no exige) — ver Fase 3 más abajo: la captura por el Boss Galaga y la nave doble son opcionales de implementar y, al serlo, generan una bifurcación de diseño real sobre la semántica de `lives`.
2. **SPACE INVADERS → `invasores`** (memoria `game-planner` #002, `propuesto`). Pasa la puerta entera. Pierde el desempate 1 frente a Galaga: formación estática que desciende en bloque y dispara, sin picados individuales ni trayectorias curvas — mecánicamente es un subconjunto de lo que ya aporta Galaga sobre el mismo slot. Pierde también el desempate 5: su diseño es prácticamente único (grilla que baja + escudos destructibles al estilo `arkanoid`); no hay una bifurcación de diseño comparable a la captura de Galaga que produzca dos ports igual de completos y distintos entre sí. Se ratifica aquí lo que ya registra la propia entrada #002 en su lote de descartes de PHOENIX y GALAXIAN: "GALAXIAN — subconjunto estricto de GALAGA" y "PHOENIX — Space Invaders con jefe, solapa sin aportar" — la misma lógica aplica en sentido inverso a Space Invaders frente a Galaga bajo este tema concreto ("naves en formación estilo Galaga"), que nombra explícitamente al juego ganador.
3. **GALAXIAN → games.id nuevo (no evaluado en detalle)**. Motor casi idéntico a Galaga pero sin picados coreografiados en curva ni captura — es, literalmente, un Galaga con menos mecánica (así lo registra la propia entrada #002 de `game-planner`: "subconjunto estricto de GALAGA"). Pierde el desempate 1 frente a Galaga en su propio género, y además requeriría `games.id` nuevo con migración, un coste que Galaga no necesita gracias al slot `invasores`.

**Ganador:** GALAGA, sobre el slot `invasores`. Motivo explícito de por qué se ratifica pese a constar como `propuesto` en `.claude/agents/game-planner/memoria.md` #005: aquella entrada ya reconocía que Galaga "pasa la puerta entera sin matices" y que su único punto débil era competir en variedad de mecánica frente a Missile Command/Centipede en una ronda de shooters — pero esta jam no compite contra esos dos (no encajan en el tema "naves y escuadrones en formación"), y frente a los dos rivales que sí encajan en el tema (Space Invaders, Galaxian) Galaga gana con claridad en variedad de mecánica y, sobre todo, en el desempate 5 específico de `game-jam`.

## Scope

**In:**

- `lib/games/invasores/entities.ts` — tipos (`Vec2`, `EnemyKind`, `EnemyState`, `Enemy`, `Bullet`, `Player`), constantes de balance (grilla de formación, velocidades, puntuación, cadencias), y funciones puras: `createFormation()`, `bezierPoint(p0, p1, p2, t)` (trayectoria de picado), `aabbHit(a, b)` (colisión rectángulo-rectángulo), `circleHitsRect(...)` para el haz tractor del Boss Galaga.
- `lib/games/invasores/levels.ts` — tabla declarada de oleadas (número de filas por tipo de enemigo, velocidad base de picado, frecuencia de picado, probabilidad de captura del Boss Galaga por oleada), siguiendo el patrón de datos de `lib/games/arkanoid/levels.ts`.
- `lib/games/invasores/engine.ts` — clase `GalagaGame` que implementa `ArcadeEngine`: bucle `requestAnimationFrame`, máquina de estados de la formación (`entering | forming | diving | cleared`), máquina de estados del jugador (`single | captured-pending | dual`), input propio, dibujado vectorial completo, emisión de callbacks, `destroy()` idempotente.
- `lib/games/invasores/index.ts` — factoría por defecto que exporta el motor para el registro.
- `lib/games/registry.ts` — una línea nueva, `invasores: () => import("@/lib/games/invasores")`.
- `app/juegos/[id]/page.tsx` — la etiqueta de controles ya deriva de `game.id in GAME_ENGINES` desde el SPEC 07 (confirmar en Fase 0 de implementación; si no deriva automáticamente, actualizar el texto hardcodeado a "← / → mueven la nave, Espacio dispara; P pausa").
- `CLAUDE.md` — actualizar los párrafos que listan qué juegos tienen motor real (`rocas`, `tetris`, `arkanoid`, `serpentina` → añadir `invasores`).

**Out of scope (for future specs):**

- El enfoque hermano de esta misma jam, `specs/game-jam/invasores/02-galaga-vidas-limpias.md` (vidas limpias sin captura) — son alternativas excluyentes, no se implementan los dos.
- Los otros tres juegos del catálogo sin motor real tras este spec (`gloton`, `ranaria`, `duelo-pixel`).
- Cambios al contrato `EngineCallbacks`/`ArcadeEngine` — no se añade ninguna ranura nueva (el estado de nave doble/captura se resuelve enteramente dentro del motor y se dibuja en canvas, sin tocar el contrato).
- Controles táctiles o de gamepad. Solo teclado.
- Sonido y música — no hay assets de audio disponibles en el repo para este juego y añadirlos está fuera del alcance de "coste de assets cero".
- Entrada coreografiada en curva de bezier para la formación al inicio de cada oleada (solo los picados individuales usan curva; la entrada de formación es interpolación lineal simple desde el borde superior, ver `## Decisions taken and discarded`).
- Bonus de precisión de disparo, puntuación por "reto" de picado simultáneo múltiple, y cualquier otra mecánica de puntuación del Galaga original no listada explícitamente en `## Data model`.
- `app/components/game-player.tsx` y `lib/games-data.ts` — ya son genéricos, no cambian por añadir un quinto motor.
- Renombre del `games.id`/`title` de `invasores` — a diferencia de `caida`→`tetris` y `bloque-buster`→`arkanoid`, el humano decidió explícitamente conservar el slot tal cual (título "INVASORES") para evitar el coste de migración; si en el futuro se quiere renombrar a algo más específico de Galaga, es un spec aparte.
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

El búfer del canvas es 800×600 fijo (`game-player.tsx:144`), 4:3 nativo — **sin letterbox**: el área de juego usa el búfer completo (a diferencia de `tetris`, que reserva una franja lateral para el panel de siguiente pieza).

### Balance — compartido con el enfoque B (no es el eje de separación de esta jam)

- Jugador: nave de 32×24px (triángulo vectorial), `y = 560` fijo, `x` acotado a `[24, 776]`. Movimiento continuo sin inercia: mientras `ArrowLeft`/`ArrowRight` (o `A`/`D`) esté presionada, `x` cambia a `PLAYER_SPEED = 320` px/s.
- Disparo del jugador: `Space` dispara un proyectil de `4×12px` a `PLAYER_BULLET_SPEED = 520` px/s hacia arriba; **un solo proyectil del jugador en pantalla a la vez** (mismo supuesto conservador que la entrada #002 de `game-planner` para Space Invaders — es lo que sostiene la dificultad del original).
- Formación: rejilla de `FORMATION_COLS = 8` columnas espaciadas `70px` (de `x = 100` a `x = 590`), `FORMATION_ROWS = 5` filas espaciadas `50px` desde `y = 80`:
  - Fila 0 (`y = 80`): **2 Boss Galaga** centrados (columnas 3–4), `hp: 2` (dos impactos para destruir en formación), `scoreFormation: 150`, `scoreDiving: 400`.
  - Filas 1–2 (`y = 130, 180`): **8 Butterfly** por fila, `hp: 1`, `scoreFormation: 80`, `scoreDiving: 160`.
  - Filas 3–4 (`y = 230, 280`): **8 Bee** por fila, `hp: 1`, `scoreFormation: 50`, `scoreDiving: 100`.
  - Total por oleada: 34 enemigos (2 + 16 + 16).
- Entrada de oleada: cada enemigo interpola linealmente desde un punto fuera del borde superior (`y = -40`, `x` = su columna de destino) hasta su celda de formación en `ENTRY_DURATION_MS = 1500`, escalonado con `ENTRY_STAGGER_MS = 60` por índice de enemigo (evita que entren todos a la vez).
- Picado: cada `DIVE_INTERVAL_MS(level) = max(400, 1800 - (level - 1) * 100)` un enemigo elegible (no ya en picado) se elige al azar para iniciar un picado; sigue una curva de Bézier cuadrática (`bezierPoint`) desde su celda de formación, con un punto de control lateral aleatorio y un punto final por debajo del borde inferior del área de juego; si sobrevive el picado (el jugador no le da), reingresa a la formación por la misma interpolación lineal de entrada. El enemigo en picado puede disparar un proyectil enemigo (`ENEMY_BULLET_SPEED(level) = 220 + (level - 1) * 15` px/s) con probabilidad `0.6` al cruzar el punto medio de su curva.
- Progresión: `level` sube al limpiar una oleada completa (34/34 destruidos); no hay tope de oleadas (el juego continúa generando oleadas nuevas mientras haya vidas).
- `onScore`/`onLevel` se emiten solo al cambiar respecto al último valor notificado (mismo patrón que los 4 motores existentes).

### Balance — específico de este enfoque (captura y nave doble)

- `onLives(3)` al arrancar. El jugador es `single` (nave sencilla) o `dual` (nave doble, ver abajo).
- **Captura:** el Boss Galaga, mientras está en su celda de formación (no durante su propio picado), puede disparar un **haz tractor** (`TRACTOR_BEAM_CHANCE_PER_DIVE = 0.15` de probabilidad, evaluada cada vez que ese Boss Galaga concreto complete un picado sin ser destruido) — el haz es un cono vectorial de `120px` de ancho en la base, activo `BEAM_ACTIVE_MS = 900`, alineado verticalmente sobre la `x` del Boss Galaga en su celda de formación. Si el jugador (estado `single`) intersecta el haz mientras está activo:
  - `lives -= 1` (`onLives(lives)`), la nave del jugador desaparece de inmediato (misma consecuencia visual que morir).
  - Se marca ese Boss Galaga concreto como `carryingCaptive: true`; visualmente se dibuja una segunda nave pequeña "capturada" flotando junto a él en su celda de formación (no dispara, no cuenta como enemigo adicional para la condición de oleada limpia — sigue siendo el mismo Boss Galaga, con un adorno visual).
  - Si `lives > 0`, el jugador reaparece como `single` en la posición inicial tras `RESPAWN_DELAY_MS = 1000`. Si `lives === 0`, se dispara `onGameOver(score)` de inmediato — un Boss Galaga con `carryingCaptive: true` en ese momento nunca llega a rescatarse (la partida ya terminó).
- **Rescate y nave doble:** si el jugador destruye un Boss Galaga que tiene `carryingCaptive: true` (impacto que lo lleva a 0 `hp`, en formación o en picado), el rescate ocurre automáticamente: la nave capturada se libera y se fusiona con la nave actual del jugador, que pasa a estado `dual` — una nave visualmente doble (dos triángulos unidos, hitbox de `56×24px`) que dispara **dos proyectiles en paralelo** por cada pulsación de `Space` (mismo cooldown de un-solo-par-en-pantalla que el disparo simple). **El rescate no incrementa `lives`** — es una mejora de potencia de fuego, no una vida extra; el contrato `EngineCallbacks` no gana ninguna ranura nueva por esto.
- **Perder la nave doble:** un impacto (colisión con enemigo o con proyectil enemigo) sobre el jugador en estado `dual` lo degrada a `single` **sin restar `lives`** (se pierde solo la mitad doble, no una vida — es la única desviación de "todo impacto resta una vida", declarada aquí explícitamente). Un impacto sobre el jugador en estado `single` sí resta una vida, como es estándar.
- Fin de partida: `onGameOver(score)` se dispara exactamente una vez, cuando `lives` llega a `0` (ya sea por colisión directa o por captura).

## Implementation plan

1. `lib/games/invasores/entities.ts` — tipos (`Vec2`, `EnemyKind = "bee" | "butterfly" | "boss"`, `PlayerMode = "single" | "dual"`, `Enemy`, `Bullet`, `Player`), constantes de balance de la sección anterior, y funciones puras: `createFormation(level)`, `bezierPoint(p0, p1, p2, t)`, `aabbHit(a, b)`, `pointInCone(point, apex, width, height)` (para el haz tractor).
2. `lib/games/invasores/levels.ts` — tabla `LEVELS` (o función `levelConfig(level)`, ya que las oleadas no tienen tope y solo escalan por fórmula) con `diveIntervalMs`, `enemyBulletSpeed`, `tractorBeamChance` por nivel, siguiendo el patrón de datos de `arkanoid/levels.ts` adaptado a progresión sin fin.
3. `lib/games/invasores/engine.ts`, primera mitad — clase `GalagaGame` con sus campos de estado (`formation: Enemy[]`, `playerBullets`, `enemyBullets`, `player: Player`, `playerMode`, `score`, `lives`, `level`, `waveState: "entering" | "forming" | "active" | "cleared"`, `state: "playing" | "paused" | "gameover"`) y los métodos privados `spawnWave()`, `updateFormationEntry(dt)`, `maybeStartDive(dt)`, `updateDives(dt)`, `updateTractorBeams(dt)`, `checkPlayerHit()`.
4. Completar `engine.ts` con el bucle `requestAnimationFrame`, `dt` capado igual que en los 4 motores existentes, y los métodos públicos `pause()`/`resume()`/`restart()`/`destroy()` (idempotente, bandera `destroyed`).
5. Input propio — listeners en `window` como propiedades flecha; `ArrowLeft/Right` (y `KeyA`/`KeyD`) mueven al jugador con `preventDefault()` en las flechas; `Space` dispara (`preventDefault()`, evita scroll de página); `KeyP`/`Escape` alternan pausa; `visibilitychange` llama a `pause()`.
6. Cablear la lógica de captura/rescate/nave doble descrita en `## Data model` dentro de `checkPlayerHit()` y de la resolución de colisión proyectil-jugador-vs-Boss Galaga; emitir `onScore`/`onLives`/`onLevel` solo al cambiar; `onGameOver` una sola vez.
7. Dibujado vectorial — fondo oscuro del tema con estrellas parpadeantes de fondo (puntos estáticos, `fillRect` de 1-2px, sin física); jugador como triángulo (doble triángulo unido si `dual`); enemigos como polígonos simples distintos por tipo (bee: rombo; butterfly: forma de "M" con dos triángulos; boss: hexágono, con un segundo hexágono pequeño superpuesto cuando `carryingCaptive`); haz tractor como polígono semitransparente; proyectiles como rectángulos finos. Ningún panel de stats en el canvas — el HUD de React ya cubre `score`/`lives`/`level`. Sin overlay propio de pausa o game over.
8. `lib/games/invasores/index.ts` — factoría por defecto (`(canvas, callbacks) => new GalagaGame(canvas, callbacks)`). Línea nueva en `lib/games/registry.ts` con la clave `invasores`.
9. `app/juegos/[id]/page.tsx` — confirmar si la etiqueta de controles ya deriva de `game.id in GAME_ENGINES` (SPEC 07); si no, actualizarla para `invasores`.
10. `npm run lint` y `npm run build`. Actualizar `CLAUDE.md`. Si `next dev` regeneró el bloque de `AGENTS.md`, commitearlo junto con el resto.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings.
- [ ] `/juegos/invasores/jugar` muestra el `<canvas>` real del juego (formación, jugador, proyectiles), no la arena falsa.
- [ ] La formación entra en oleada 1 con la interpolación de entrada, se estabiliza, y empieza a lanzar picados individuales con trayectoria curva visible.
- [ ] Destruir un enemigo en formación y el mismo tipo de enemigo en picado otorgan puntuaciones distintas (`scoreFormation` vs `scoreDiving`), reflejadas en `Puntuación` del HUD.
- [ ] El Boss Galaga puede capturar la nave del jugador con su haz tractor: `lives` baja en el HUD, la nave capturada aparece flotando junto a ese Boss Galaga concreto.
- [ ] Destruir un Boss Galaga que tiene una nave capturada libera al jugador como nave doble (`dual`), visualmente distinta y disparando dos proyectiles paralelos; `lives` no sube al rescatar.
- [ ] Un impacto sobre la nave doble la degrada a nave sencilla sin restar `lives`; un impacto sobre la nave sencilla sí resta `lives`.
- [ ] Al llegar `lives` a 0 (por colisión directa o por captura sin vidas restantes), se dispara el modal `FIN DEL JUEGO` de React con la puntuación correcta; el canvas no dibuja su propio "GAME OVER".
- [ ] Limpiar las 34 naves de una oleada genera la siguiente oleada y sube `Nivel` en el HUD; la cadencia de picado y la velocidad de los proyectiles enemigos aumentan de forma perceptible.
- [ ] El botón PAUSA congela el juego y REANUDAR lo continúa; `Escape` y `P` hacen lo mismo desde el teclado; cambiar de pestaña pausa automáticamente.
- [ ] El botón "JUGAR DE NUEVO" reinicia con 3 vidas, puntuación 0, nivel 1, oleada 1 entrando desde cero.
- [ ] Recargar `/juegos/invasores/jugar` en modo desarrollo (React Strict Mode) no duplica el bucle ni produce errores en consola.
- [ ] Salir del reproductor detiene el bucle de animación y retira los listeners de teclado.
- [ ] Jugando con sesión iniciada, la puntuación aparece en `public.scores` y se refleja en `/juegos/invasores` (mejor global), `/salon` y el ticker de la landing.
- [ ] `rocas`, `tetris`, `arkanoid` y `serpentina` siguen jugables sin cambios de comportamiento; el resto del catálogo (`gloton`, `ranaria`, `duelo-pixel`) sigue mostrando la arena falsa.

## Decisions taken and discarded

- **Sí, este enfoque (captura y nave doble) sobre el enfoque hermano (vidas limpias):** el eje de separación de esta jam es la **semántica de vidas**. Este enfoque implementa el mecanismo que de verdad distingue a Galaga de Space Invaders/Galaxian bajo este mismo tema — la captura por el Boss Galaga y la nave doble recuperable — asumiendo el coste de una máquina de estados de jugador de 3 estados efectivos (`single` / `captured` transitorio / `dual`) y una regla no estándar ("perder la nave doble no resta vida"). Es la opción de mayor fidelidad al original y de mayor riesgo de implementación; se recomienda para quien priorice autenticidad Galaga sobre superficie de riesgo mínima.
- **No:** ampliar `EngineCallbacks` con una ranura para "nave doble" o "capturado". El estado se resuelve enteramente dentro del motor y se dibuja en el canvas (doble triángulo vs. simple); el HUD de React no necesita saberlo, igual que Tetris no expone "pieza siguiente" al contrato.
- **Sí:** el rescate no otorga una vida extra. Se descartó mapear "nave doble" a `lives + 1` porque rompería la lectura del HUD ("vidas" pasaría a significar dos cosas distintas simultáneamente) y porque el Galaga original tampoco lo hace — la nave doble es potencia de fuego, no una vida adicional.
- **Sí:** perder la nave doble no resta vida (solo la degrada a sencilla). Se descartó tratarlo como una vida perdida porque penalizaría dos veces el mismo evento (capturar costó ya una vida; degradar la recompensa del rescate no debería costar otra).
- **No:** entrada de formación con curva de Bézier (solo los picados la usan). Se descartó por presupuesto de alcance — una interpolación lineal de entrada es visualmente suficiente y mantiene el spec como "un solo port" sin desbordar hacia una segunda coreografía completa.
- **Sí:** slot `invasores` sin migración, sobre `escuadron` (memoria `game-planner` #005) — ver justificación completa en `## Por qué este spec existe`.
- **Sí:** un solo proyectil del jugador en pantalla a la vez, igual que el supuesto conservador de la entrada #002 de `game-planner` para Space Invaders sobre el mismo slot — es lo que sostiene la dificultad y evita que el jugador "llene" la pantalla de disparos.

## Risks

| Risk                                                                                                                                                                                     | Mitigation                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El bucle o los listeners quedan vivos tras salir del reproductor sin recarga completa                                                                                                    | `destroy()` idempotente, llamado desde el cleanup del efecto de montaje, igual que los 4 motores existentes                                                                                                           |
| Strict Mode monta el efecto dos veces y crea dos instancias del motor sobre el mismo canvas                                                                                              | El efecto de `game-player.tsx` ya usa una bandera de cancelación; un motor creado tras desmontar se destruye sin arrancar                                                                                             |
| La máquina de estados de captura/rescate/nave doble es la lógica más delicada del spec y puede desincronizarse (p. ej. un Boss Galaga destruido en el mismo frame en que dispara el haz) | Orden de resolución fijo por frame: primero colisiones proyectil-enemigo, luego colisión haz-jugador, luego colisión jugador-enemigo; el Boss Galaga marcado para destrucción no puede iniciar un haz nuevo ese frame |
| El haz tractor puede sentirse injusto si captura sin aviso visual previo                                                                                                                 | El haz es visible durante toda su ventana activa (`BEAM_ACTIVE_MS`) antes de resolver colisión, dando margen de reacción                                                                                              |
| El slot `invasores` ya tenía una sugerencia previa distinta sobre la mesa (Space Invaders, memoria `game-planner` #002), que queda sin slot libre tras este spec                         | Documentado explícitamente en `## Por qué este spec existe` y en `specs/game-jam/game-jam.md`; Space Invaders sigue siendo portable a futuro, pero ya no sin migración                                                |
| Progresión sin tope (oleadas infinitas) puede volverse injugable a niveles muy altos si `DIVE_INTERVAL_MS`/`ENEMY_BULLET_SPEED` escalan sin límite inferior/superior                     | Fórmulas con `max()`/suma acotada explícita en `## Data model` (`max(400, ...)`), mismo patrón que la aceleración de `tetris`                                                                                         |

## What is **not** in this spec

- El enfoque hermano de esta jam, `specs/game-jam/invasores/02-galaga-vidas-limpias.md` (vidas limpias sin captura).
- Los otros tres juegos del catálogo sin motor real (`gloton`, `ranaria`, `duelo-pixel`).
- Cambios al contrato `EngineCallbacks`/`ArcadeEngine`.
- Controles táctiles o de gamepad.
- Sonido y música.
- Entrada de formación con curva de Bézier (solo interpolación lineal).
- Bonus de precisión de disparo y cualquier mecánica de puntuación no listada en `## Data model`.
- Migración de `public.games` o bloque `.cover-*` nuevo — este spec usa el slot ya sembrado `invasores`.
- Renombre del `games.id`/`title` de `invasores`.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.
