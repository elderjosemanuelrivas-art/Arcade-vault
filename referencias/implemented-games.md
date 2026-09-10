# Juegos implementados en Arcade Vault

Inventario de los juegos del catálogo, consultado directamente sobre `public.games` (proyecto
Supabase `infuthprfvgsjflqmsby`) y cruzado con `lib/games/registry.ts` para saber cuáles tienen
un motor de juego real (`<canvas>`) y cuáles siguen siendo la arena falsa original. Consultado el
2026-09-08.

## Resumen

- **8 juegos** en el catálogo (`public.games`, 8 filas seeded).
- **4 con motor real** jugable (`rocas`, `tetris`, `arkanoid`, `serpentina`), registrados en
  `GAME_ENGINES` (`lib/games/registry.ts`) e importados dinámicamente en `game-player.tsx`.
- **4 sin motor**: la fila de catálogo existe, pero `game-player.tsx` cae a la arena falsa
  (el score sube solo con un `setInterval`, sin `<canvas>` ni motor real).
- `public.scores` tiene **0 filas** todavía, así que los marcadores (`/salon`, la ficha de cada
  juego, el ticker del home) muestran su estado vacío hasta que alguien termine una partida real
  con sesión iniciada.
- **21 sugerencias** de `game-planner` para próximos ports, registradas en
  `.claude/agents/game-planner/memoria.md`: 1 para el slot `ranaria` (sesión inicial) + 20 de una
  ronda de 4 ejecuciones paralelas (2026-09-08) — 3 ocupan los 3 slots libres restantes sin
  migración, 17 exigirían dar de alta una fila nueva en `public.games`. Ver "To-do" más abajo.

## Catálogo completo

| id | título | categoría | color | orden | motor real | spec de origen |
|---|---|---|---|---|---|---|
| `arkanoid` | ARKANOID | ARCADE | cyan | 1 | ✅ | SPEC 08 |
| `tetris` | TETRIS | PUZZLE | magenta | 2 | ✅ | SPEC 07 |
| `serpentina` | SERPENTINA | ARCADE | green | 3 | ✅ | SPEC 09 |
| `gloton` | GLOTÓN | ARCADE | yellow | 4 | ❌ | — |
| `invasores` | INVASORES | SHOOTER | green | 5 | ❌ | — |
| `rocas` | ROCAS | SHOOTER | yellow | 6 | ✅ | SPEC 05 |
| `ranaria` | RANARIA | ARCADE | green | 7 | ❌ | — |
| `duelo-pixel` | DUELO PIXEL | VERSUS | cyan | 8 | ❌ | — |

Nota: los nombres de las specs conservan el nombre del juego tal como se llamaba cuando se
escribieron. El catálogo renombró dos filas después de que su spec se implementara (migración
`20260903223040_rename_bloque_buster_to_arkanoid.sql`):

- `caida` → `tetris` (spec sigue llamándose `07-tetris-real-en-caida.md`)
- `bloque-buster` → `arkanoid` (spec sigue llamándose `08-arkanoid-real-en-bloque-buster.md`)

---

## Juegos con motor real

### ROCAS — `lib/games/asteroids/`

- **Catálogo**: SHOOTER, color yellow, `sort_order: 6`. "Pulveriza asteroides en gravedad cero."
- **Spec**: `specs/05-juego-real-asteroids-en-rocas.md`.
- **Origen del port**: hand-port a TypeScript de `referencias/started-games/02-asteroids/game.js`.
- **Módulos**: `engine.ts` + `entities.ts` + `index.ts` (sin extras).
- **Assets**: ninguno (todo se dibuja con formas vectoriales sobre `<canvas>`).
- **Controles**: ← / → rotan la nave, ↑ acelera, Espacio dispara; `P` pausa.
- **Reporta vía `EngineCallbacks`**: score, vidas (`onLives`), game over. No usa `onLevel`.

### TETRIS — `lib/games/tetris/`

- **Catálogo**: PUZZLE, color magenta, `sort_order: 2`. "Encaja las piezas antes de que el techo
  te aplaste."
- **Spec**: `specs/07-tetris-real-en-caida.md` (catálogo originalmente seeded como
  `caida`/"CAÍDA", renombrado a `tetris`/"TETRIS" tras implementarse).
- **Origen del port**: hand-port a TypeScript de `referencias/started-games/03-tetris/game.js`.
- **Módulos**: `engine.ts` + `entities.ts` + `index.ts` (sin extras).
- **Assets**: ninguno (piezas dibujadas como bloques de color).
- **Controles**: ← / → mueven la pieza, ↓ soft drop, ↑ o `X` rotan, Espacio hard drop; `P` pausa.
- **Reporta vía `EngineCallbacks`**: score, nivel (`onLevel`, sube cada 10 líneas), game over. No
  usa `onLives` (no hay vidas, es partida única hasta que la pila llega arriba).

### ARKANOID — `lib/games/arkanoid/`

- **Catálogo**: ARCADE, color cyan, `sort_order: 1`. "Rebota la pelota y destruye muros de neón."
- **Spec**: `specs/08-arkanoid-real-en-bloque-buster.md` (catálogo originalmente seeded como
  `bloque-buster`/"BLOQUE BUSTER", renombrado a `arkanoid`/"ARKANOID" tras implementarse).
- **Origen del port**: hand-port a TypeScript de `referencias/started-games/04-arkanoid/game.js`
  — el primer port con assets binarios.
- **Módulos**: `engine.ts` + `entities.ts` + `index.ts`, más `levels.ts` (diseño de niveles) y
  `sprites.ts` (recortes del spritesheet).
- **Assets**: `public/juegos/arkanoid/spritesheet-breakout.png`,
  `public/juegos/arkanoid/ball-bounce.mp3`, `public/juegos/arkanoid/break-sound.mp3`.
- **Controles**: ← / → mueven la paleta; `P` pausa. (No usa flechas arriba/abajo.)
- **Reporta vía `EngineCallbacks`**: score, vidas, nivel (multi-nivel vía `levels.ts`), game over.

### SERPENTINA — `lib/games/serpentina/`

- **Catálogo**: ARCADE, color green, `sort_order: 3`. "Crece sin morder tu propia cola."
- **Spec**: `specs/09-snake-real-en-serpentina.md`. Ya venía seeded como `serpentina`/"SERPENTINA"
  desde SPEC 06, sin renombre necesario.
- **Origen del port**: **no** viene de `referencias/started-games/` — no hay `game.js` de
  referencia para Snake. El motor se escribió desde cero contra el contrato `ArcadeEngine`; lo
  único portado es `sprites.ts` (`FRUIT_ATLAS`), a partir de un sprite sheet que el usuario
  proveyó directamente (`referencias/source-assets/snake-assets/.../{fruits.png, sprites.js}`,
  21 frutas + un `window.SPRITE_ATLAS`).
- **Módulos**: `engine.ts` + `entities.ts` + `index.ts`, más `sprites.ts`.
- **Assets**: `public/juegos/serpentina/fruits.png`.
- **Controles**: flechas o WASD; `P` pausa.
- **Reporta vía `EngineCallbacks`**: score, game over. No usa `onLives` ni `onLevel`.

---

## Juegos sin motor real (arena falsa)

Estos 4 existen como filas de catálogo pero todavía no tienen un motor `<canvas>` registrado en
`lib/games/registry.ts`. Al jugarlos, `game-player.tsx` cae al modo original: el score sube solo
vía `setInterval`, sin lógica de juego, sin `<canvas>` ni assets. Como no hay partida real, no
muestran el bloque de guardado de puntuación (eso requiere un motor real + sesión iniciada).

- **GLOTÓN** (`gloton`) — ARCADE, yellow, `sort_order: 4`. "Devora puntos y escapa de los
  fantasmas." → sugerencia `game-planner`: **PAC-MAN** (memoria #012).
- **INVASORES** (`invasores`) — SHOOTER, green, `sort_order: 5`. "Defiende el planeta de filas
  alienígenas." → sugerencia `game-planner`: **SPACE INVADERS** (memoria #002).
- **RANARIA** (`ranaria`) — ARCADE, green, `sort_order: 7`. "Cruza la autopista de pixeles." →
  sugerencia `game-planner`: **FROGGER** (memoria #001).
- **DUELO PIXEL** (`duelo-pixel`) — VERSUS, cyan, `sort_order: 8`. "Dos paletas. Una pelota.
  Reflejos máximos." → sugerencia `game-planner`: **PONG VERSUS** (memoria #017).

Son los candidatos naturales para una futura pasada de `/juego-nuevo`; ninguno de los 4 exige
migración de catálogo.

## To-do — sugerencias pendientes de `game-planner`

Ledger completo (razonamiento, riesgos, descartes) en
`.claude/agents/game-planner/memoria.md`. Lo de aquí es solo un índice rápido para no tener que
abrir ese archivo cada vez.

**Sin migración — los 4 slots de arriba.** Orden de preferencia del propio agente si hubiera que
elegir uno para empezar: PAC-MAN → `gloton` (el más grande: IA de 4 fantasmas), SPACE INVADERS →
`invasores`, PONG VERSUS → `duelo-pixel`, FROGGER → `ranaria`.

**Con migración nueva sobre `public.games`** (patrón
`supabase/migrations/20260826184921_games.sql`) **+ una regla `.cover-<slug>` a mano en
`app/globals.css`** (la columna `cover` no es una imagen, es un nombre de clase CSS resuelta ahí y
consumida en `game-card.tsx`/`home.tsx`/`app/juegos/[id]/page.tsx`):

| # memoria | Juego            | `id` propuesto | `cat`   | color   |
| --------- | ----------------- | -------------- | ------- | ------- |
| 003       | Missile Command   | `misiles`      | SHOOTER | magenta |
| 004       | Centipede         | `ciempies`     | SHOOTER | cyan    |
| 005       | Galaga            | `escuadron`    | SHOOTER | yellow  |
| 006       | Defender          | `defensor`     | SHOOTER | green   |
| 007       | Puzzle Bobble     | `burbujas`     | PUZZLE  | cyan    |
| 008       | Pipe Mania        | `tuberia`      | PUZZLE  | yellow  |
| 009       | Panel de Pon      | `trueque`      | PUZZLE  | magenta |
| 010       | Sokoban           | `bodega`       | PUZZLE  | green   |
| 011       | 2048              | `duplica`      | PUZZLE  | cyan    |
| 013       | Bomberman         | `bombardero`   | ARCADE  | magenta |
| 014       | Dig Dug           | `excavador`    | ARCADE  | yellow  |
| 015       | Pengo             | `pinguino`     | PUZZLE  | cyan    |
| 016       | Q\*bert           | `piramide`     | ARCADE  | magenta |
| 018       | Lunar Lander      | `alunizaje`    | ARCADE  | magenta |
| 019       | Simon             | `secuencia`    | ARCADE  | cyan    |
| 020       | Surround          | `estelas`      | VERSUS  | magenta |
| 021       | Kaboom!           | `cubetas`      | ARCADE  | yellow  |

Los `sort_order` no se listan aquí: las 4 rondas paralelas que produjeron esta lista los asignaron
sin verse entre sí y colisionan entre ellas (ver memoria.md) — se fijan al escribir la migración
real de cada uno, no antes.

## Cómo se añade un motor real a un juego existente

1. `/juego-nuevo` — genera la spec de porting específica para ese juego.
2. Aprobar la spec (`Status:` con la palabra de aprobación en español, ver `CLAUDE.md`).
3. `/spec-impl` — implementa el motor contra el contrato compartido de `lib/games/types.ts`
   (`EngineCallbacks` / `ArcadeEngine` / `EngineFactory`) y lo registra en
   `lib/games/registry.ts` (`GAME_ENGINES`).
