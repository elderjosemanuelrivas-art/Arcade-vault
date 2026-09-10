# Memoria de `game-planner`

Ledger versionado del agente `game-planner` (`.claude/agents/game-planner.md`). Registra qué
juegos ya se sugirieron para portar a Arcade Vault, con qué razonamiento y en qué quedó cada
sugerencia, para que el agente nunca se repita entre sesiones.

**No editar a mano salvo para corregir una divergencia puntual** (`**Estado:**`/`**Resultado:**`
de una entrada existente) — las entradas nuevas las añade el propio agente en la Fase 4 de su
definición. Se commitea junto con el resto del trabajo, como cualquier otro archivo del repo.

## Ya implementado (previo al agente)

Estos 4 ports existían antes de que `game-planner` existiera — no los sugirió él, pero forman su
historia de partida para no proponerlos de nuevo ni ignorarlos al razonar sobre variedad de
mecánica.

| Juego     | Slot (`games.id`) | Spec    | Origen                                                           |
| --------- | ----------------- | ------- | ---------------------------------------------------------------- |
| Asteroids | `rocas`           | SPEC 05 | `referencias/started-games/02-asteroids/game.js`                 |
| Tetris    | `tetris`          | SPEC 07 | `referencias/started-games/03-tetris/game.js`                    |
| Arkanoid  | `arkanoid`        | SPEC 08 | `referencias/started-games/04-arkanoid/game.js`                  |
| Snake     | `serpentina`      | SPEC 09 | Desde cero; sprites de `referencias/source-assets/snake-assets/` |

## Registro de sugerencias

### 001 — FROGGER → `ranaria` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `ranaria` (ARCADE, green, sort_order 7) — libre, sin migración.
- **Fuente:** desde cero contra el contrato `ArcadeEngine`. No hay `game.js` de referencia:
  `referencias/started-games/` solo tiene los 3 ya portados (asteroids, tetris, arkanoid) y
  `referencias/source-assets/` solo el sprite sheet de Snake, ya consumido en SPEC 09.
- **Por qué encaja:**
  - Primer candidato que usa los tres callbacks del contrato sin forzarlos: `score` (avance y
    cruce), `lives` (las 3 canónicas), `level` (velocidad/densidad por oleada).
  - Mecánica nueva frente a los 4 portados: esquiva por timing contra flujos de obstáculos y
    acarreo de plataforma — no es un quinto "esquiva y dispara" (desempate 1).
  - Doble reutilización de patrones ya validados: rejilla `COLS=20`/`ROWS=15`/`CELL=40` = 800×600
    exacto y tick discreto de `serpentina`, más el patrón de datos de nivel de `arkanoid`
    (`levels.ts` → configuración de carriles) (desempate 3).
  - Coste de assets cero: todo vectorial sobre `<canvas>` (desempate 4, el óptimo). El slot ya
    viene sembrado con la descripción "Cruza la autopista de pixeles." (desempate 2).
- **Riesgos:** reparto exacto de las 15 filas (salida / carretera / mediana / río / meta, y si la
  meta tiene 5 nichos); semántica de `onLevel` y de fin de partida (define cuándo se inserta en
  `public.scores`); salto discreto vs. acarreo continuo en el río — supuesto conservador asumido:
  carriles discretos con un solo tick de rejilla, a confirmar con el humano; el timer de ronda no
  tiene ranura en `EngineCallbacks` y, si se incluye, se dibuja dentro del canvas (ampliar el
  contrato es rechazo automático).
- **Descartados esta ronda:** INVASORES (`invasores`) — pasa la puerta pero repite la familia
  "esquiva y dispara" de `rocas` y el "vacía el muro" de `arkanoid`; GLOTÓN (`gloton`) — encaje de
  color inmejorable, pero la IA de 4 fantasmas + laberinto + power-pellet no tiene análogo
  validado en el repo y su "un solo spec" es discutible sin referencia; DUELO PIXEL
  (`duelo-pixel`) — anotado, no rechazado: cabe en el contrato, pero es familia `arkanoid` y deja
  sin resolver qué puntuación guarda un solo `onScore` en una partida de dos humanos.
- **Resultado:** —

_Entradas 002–021: lote de una sola sesión (2026-09-08), producido por cuatro ejecuciones
paralelas de `game-planner`, una por familia de mecánica (shooters, puzzle, laberinto/plataforma,
versus/habilidad). Todas pasan la puerta de viabilidad; solo `gloton`, `invasores` y `duelo-pixel`
están libres, el resto exige migración sobre `public.games` **más** una regla `.cover-<slug>` a
mano en `app/globals.css` (la columna `cover` no es una imagen, es un nombre de clase CSS resuelto
ahí). Las cuatro rondas asignaron `sort_order` en paralelo sin verse entre sí, así que sus valores
propuestos (9–12 cada una) colisionan entre ellas; se sustituyen abajo por una nota a resolver al
escribir cada migración real, sin renumerar `id`, que sí son todos únicos._

### 002 — SPACE INVADERS → `invasores` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `invasores` (SHOOTER, green, sort_order 5) — libre, sin migración.
- **Fuente:** desde cero contra el contrato `ArcadeEngine`. No hay `game.js` de referencia:
  `referencias/started-games/` solo tiene los 3 ya portados y `referencias/source-assets/` solo el
  sprite sheet de Snake, consumido en SPEC 09.
- **Por qué encaja:**
  - Único candidato de esta ronda que ocupa un slot ya sembrado con su propia descripción
    ("Defiende el planeta de filas alienígenas"), con cat/color exactos (desempate 2) y cero coste
    de migración.
  - Usa los tres callbacks de estado sin forzar ninguno: `score` (filas de alien + OVNI), `lives`
    (3 cañones), `level` (oleada más baja y más rápida).
  - Doble reutilización de patrones validados: formación como matriz con tick discreto al estilo
    `serpentina`, tabla de configuración por oleada al estilo `levels.ts` de `arkanoid`, y escudos
    destructibles como primo del muro de ladrillos de `arkanoid` (desempate 3).
  - Coste de assets cero: aliens como pixel art dibujado con `fillRect` sobre matrices de bits,
    igual que las piezas de `tetris` (desempate 4, el óptimo).
  - Frente a `rocas`: sin inercia, sin rotación, sin envolvente; un solo eje de movimiento y
    disparo vertical — es la variante más alejada de Asteroids dentro de la familia.
- **Riesgos:** semántica de `onLevel` (¿la oleada 2 reinicia la formación o la conserva?);
  supuesto conservador asumido: un solo proyectil del jugador en pantalla a la vez, como el
  original — es lo que sostiene la dificultad, a confirmar con el humano; resolución de la máscara
  de destrucción de escudos (supuesto: sub-bloques de 4×4, no píxel real); doble condición de fin
  de partida (0 vidas o aliens en la línea de defensa) — definir cuál dispara `onGameOver` e
  inserta en `public.scores`; el OVNI bonus es recortable.
- **Descartados esta ronda:** GALAXIAN — subconjunto estricto de GALAGA; PHOENIX — Space Invaders
  con jefe, solapa sin aportar; MILLIPEDE — variante directa de CENTIPEDE; TIME PILOT — rotación
  libre y scroll omnidireccional, es `rocas` sin inercia; GYRUSS — disparo radial de 360°, vuelve
  al eje de `rocas` y añade pseudo-3D; GORF — antología de 5 fases, falla "un solo spec";
  BATTLEZONE — wireframe 3D en primera persona, fuera de la familia de pantalla fija.
- **Resultado:** —

### 003 — MISSILE COMMAND → `misiles` (2026-09-08)

- **Estado:** propuesto
- **Slot:** requiere migración nueva sobre `public.games` (patrón
  `supabase/migrations/20260826184921_games.sql`): `id: misiles`, `title: "MISILES"`,
  `cat: SHOOTER`, `color: magenta`, `sort_order` a asignar al escribir la migración (los valores
  propuestos en paralelo colisionan; el máximo actual en `public.games` es 8).
- **Fuente:** desde cero contra el contrato `ArcadeEngine`; no hay referencia en el repo.
- **Por qué encaja:**
  - Máxima variedad de mecánica del catálogo entero (desempate 1): no hay nave del jugador, es
    defensa por interceptación predictiva con detonación temporizada — nada de los 4 ports
    existentes se le parece.
  - Encaja en 800×600 nativo sin letterbox (6 ciudades y 3 baterías abajo, cielo arriba) y su
    estética de líneas y explosiones circulares es la del tema neón del repo.
  - Reutiliza la progresión por oleadas de `levels.ts` (`arkanoid`) y una colisión círculo-punto
    más simple que la vector-a-vector de `rocas` (desempate 3).
  - Coste de assets cero (desempate 4).
- **Riesgos:** `lives` no son vidas — supuesto conservador asumido: se mapea a ciudades
  supervivientes (6), a ratificar con el humano; adaptación de control declarada (el original es
  de trackball): retículo movido con flechas a velocidad constante y baterías en `Z`/`X`/`C`, con
  la velocidad del retículo como el parámetro crítico de jugabilidad; el juego nunca "se gana", hay
  que fijar el criterio de `onGameOver` (todas las ciudades destruidas) y si hay bonus de oleada;
  la munición por batería se dibuja en canvas, no amplía `EngineCallbacks`.
- **Descartados esta ronda:** queda por detrás de SPACE INVADERS solo porque exige migración de
  catálogo y no puede reclamar el slot ya sembrado; en variedad de mecánica lo supera.
- **Resultado:** —

### 004 — CENTIPEDE → `ciempies` (2026-09-08)

- **Estado:** propuesto
- **Slot:** requiere migración nueva sobre `public.games` (patrón
  `supabase/migrations/20260826184921_games.sql`): `id: ciempies`, `title: "CIEMPIÉS"`,
  `cat: SHOOTER`, `color: cyan`, `sort_order` a asignar al escribir la migración (los valores
  propuestos en paralelo colisionan; el máximo actual en `public.games` es 8). (Título con tilde
  como `GLOTÓN`, id sin tilde como `gloton`.)
- **Fuente:** desde cero contra el contrato `ArcadeEngine`; no hay referencia en el repo.
- **Por qué encaja:**
  - La reutilización de patrón más directa de la ronda (desempate 3): el ciempiés es literalmente
    una serpiente sobre rejilla con IA, así que `serpentina/entities.ts` (lista de celdas, tick
    discreto, giro al chocar) sirve de molde, y el campo de hongos es la matriz de ladrillos de
    `arkanoid` en versión regenerable.
  - Rejilla exacta sobre 800×600 (20×15 celdas de 40×40, las mismas constantes ya validadas).
  - Mecánica distinta de todo el catálogo: jugador confinado a una banda inferior y escenario
    destructible que altera la trayectoria del enemigo — el jugador modela el campo disparando
    (desempate 1).
  - Coste de assets cero (desempate 4).
- **Riesgos:** la partición del ciempiés en dos cadenas independientes al recibir un impacto (más
  el hongo que deja el segmento) es la lógica no trivial donde se irá el tiempo del port;
  adaptación de control declarada (el original es de trackball): flechas dentro de la banda
  inferior; decidir si los hongos persisten entre oleadas (el original sí, y es lo que da
  progresión); el alcance debe recortarse por escrito a ciempiés + hongos + araña, dejando fuera
  pulga y escorpión, o deja de ser un solo spec.
- **Descartados esta ronda:** MILLIPEDE, su variante directa, por redundante.
- **Resultado:** —

### 005 — GALAGA → `escuadron` (2026-09-08)

- **Estado:** propuesto
- **Slot:** requiere migración nueva sobre `public.games` (patrón
  `supabase/migrations/20260826184921_games.sql`): `id: escuadron`, `title: "ESCUADRÓN"`,
  `cat: SHOOTER`, `color: yellow`, `sort_order` a asignar al escribir la migración (los valores
  propuestos en paralelo colisionan; el máximo actual en `public.games` es 8).
- **Fuente:** desde cero contra el contrato `ArcadeEngine`; no hay referencia en el repo.
- **Por qué encaja:**
  - Pasa la puerta entera sin matices: un canvas, 800×600 nativo, `score`/`lives`/`level`, teclado,
    assets cero.
  - Aporta sobre Space Invaders los picados con trayectorias curvas (paths precalculados),
    emparentados con la interpolación vectorial ya presente en `asteroids/entities.ts`
    (desempate 3).
- **Riesgos:** la captura de la nave por el Boss Galaga y la nave doble rompen la semántica limpia
  de `lives` (se pierde una vida y se puede recuperar duplicada) — supuesto conservador asumido:
  recortarla del spec base; las trayectorias de picado son datos, no lógica, y hay que fijar su
  formato antes de codificar; el bonus por precisión de disparo no tiene ranura en el contrato y se
  dibuja en canvas o se omite.
- **Descartados esta ronda:** queda por detrás de CENTIPEDE y MISSILE COMMAND por el desempate 1:
  solapa con la entrada 002 (misma sub-familia "formación + disparo vertical"), así que no debería
  encadenarse justo detrás de SPACE INVADERS — o se trata como alternativa excluyente a ella.
- **Resultado:** —

### 006 — DEFENDER → `defensor` (2026-09-08)

- **Estado:** propuesto
- **Slot:** requiere migración nueva sobre `public.games` (patrón
  `supabase/migrations/20260826184921_games.sql`): `id: defensor`, `title: "DEFENSOR"`,
  `cat: SHOOTER`, `color: green`, `sort_order` a asignar al escribir la migración (los valores
  propuestos en paralelo colisionan; el máximo actual en `public.games` es 8).
- **Fuente:** desde cero contra el contrato `ArcadeEngine`; no hay referencia en el repo.
- **Por qué encaja:**
  - Pasa la puerta: el radar se dibuja como franja dentro del mismo canvas (no es segunda vista ni
    elemento HTML), el área de juego queda en 800×540 dentro del búfer fijo, y el estado se expresa
    con `score`/`lives`/`level`. Teclado completo, assets cero.
  - Aporta la primera cámara con scroll del repo (mundo envolvente de ~3200px) y un objetivo
    secundario de rescate que convive con el combate (desempate 1).
  - Reutiliza la física de nave y la colisión vector-a-vector de `rocas` y las oleadas de
    `levels.ts` (desempate 3).
- **Riesgos:** el mayor riesgo de alcance de la ronda — solo es "un solo spec" si el spec fija por
  escrito el recorte a lander + mutante + humanoides, dejando fuera bomber, pod, swarmer y baiter;
  sincronizar el radar con el mundo envolvente es el bug clásico del port; la máquina de estados de
  los humanoides (en suelo / secuestrado / cayendo / rescatado) da identidad al juego y no es
  recortable; las bombas inteligentes son un segundo recurso sin ranura en el contrato y se dibujan
  en canvas.
- **Descartados esta ronda:** va el último de los cinco porque su nave con thrust e inercia es lo
  más parecido a `rocas` de toda la ronda, justo el solape que había que despriorizar, y porque su
  alcance sin recorte dobla al de `asteroids`.
- **Resultado:** —

### 007 — PUZZLE BOBBLE → `burbujas` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `burbujas` (PUZZLE, cyan, sort_order a asignar al escribir la migración — los valores
  propuestos en paralelo colisionan; el máximo actual en `public.games` es 8) — **requiere
  migración nueva** sobre `public.games` (patrón `20260826184921_games.sql`), más una regla
  `.cover-burbujas` a mano en `app/globals.css` (la columna `cover` es un nombre de clase CSS, no
  una imagen).
- **Fuente:** desde cero contra el contrato `ArcadeEngine`. `referencias/started-games/` solo
  conserva los 3 ya portados y `referencias/source-assets/` solo el sprite sheet de Snake, ya
  consumido en SPEC 09.
- **Por qué encaja:**
  - Teclado canónico sin inventar nada: el arcade original es volante + botón → `←`/`→` ángulo del
    cañón, `Espacio` dispara. Esquiva de raíz el riesgo "match-3 es de ratón" de esta familia.
  - Es el candidato de la familia PUZZLE que más se aleja de `tetris`: tablero anclado al techo y
    apuntado angular, no piezas cayendo en un pozo (desempate 1).
  - Doble reutilización validada: reflexión contra paredes = `arkanoid/engine.ts`; progresión por
    tableros = `arkanoid/levels.ts` (desempate 3).
  - Assets cero: burbujas vectoriales con símbolo interior para no depender solo del color
    (desempate 4, el óptimo). Geometría 16 col × Ø40 = 640 px centrados en el búfer 800×600.
- **Riesgos:** flood-fill de racimo y detección de burbujas huérfanas son los dos únicos puntos de
  complejidad real; snap hexagonal tras colisión — supuesto conservador asumido: snap a la celda
  hex más cercana; cadencia de descenso del techo — supuesto conservador: cada N disparos, no por
  reloj; la paleta debe seguir siendo distinguible bajo el filtro `.crt`.
- **Descartados esta ronda:** BUSCAMINAS — descartado en la puerta, input canónico de dos botones
  de ratón y métrica de tiempo en vez de `score`; COLUMNS / DR. MARIO / PUYO PUYO — solapan con
  `tetris` como "piezas que caen en un pozo"; KLAX — arcade auténtico pero conserva el pozo y
  duplica la paleta de `arkanoid`; PUZZNIC — se solapa con BODEGA; SAME GAME y BEJEWELED clásico —
  mouse-natural sin presión temporal (BEJEWELED sustituido por TRUEQUE, mismo género con control de
  teclado canónico); LIGHTS OUT / FLOOD IT — demasiado delgados para justificar migración + CSS.
- **Resultado:** —

### 008 — PIPE MANIA → `tuberia` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `tuberia` (PUZZLE, yellow, sort_order a asignar al escribir la migración — colisión con
  los otros valores propuestos en paralelo; máximo actual 8) — **requiere migración nueva** sobre
  `public.games`, más `.cover-tuberia` en `app/globals.css`.
- **Fuente:** desde cero contra el contrato `ArcadeEngine`; no hay `game.js` de referencia
  disponible en el repo.
- **Por qué encaja:**
  - Es el "puzzle de trazado" puro: routing bajo presión temporal, mecánica sin análogo entre los 4
    portados (desempate 1).
  - Teclado nativo de arcade (joystick + botón): `←↑→↓` mueven el cursor de colocación, `Espacio`
    coloca la pieza de cabeza de cola.
  - Rejilla 10×7 con celda 70 px = 700×490 centrada en 800×600, con la cola de piezas y el HUD
    dibujados dentro del mismo canvas; `onLevel` por fase (patrón `arkanoid/levels.ts`), rejilla
    discreta estilo `serpentina` (desempate 3).
  - Assets cero: tubos = `lineTo` + `arc` (desempate 4).
- **Riesgos:** único candidato de la ronda con reloj real — la curva de retardo del fluido ES la
  dificultad y calibrarla mal lo vuelve trivial o imposible; regla de sobrescritura de pieza ya
  colocada — supuesto conservador: permitida con penalización de puntos; semántica de fin de
  partida (fuga = game over vs. pérdida de fase) determina cuándo se inserta la fila en
  `public.scores`, a confirmar con el humano.
- **Descartados esta ronda:** ver entrada 007 (misma ronda, mismo conjunto de descartes).
- **Resultado:** —

### 009 — PANEL DE PON (TETRIS ATTACK) → `trueque` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `trueque` (PUZZLE, magenta, sort_order a asignar al escribir la migración — colisión
  con los otros valores propuestos en paralelo; máximo actual 8) — **requiere migración nueva**
  sobre `public.games`, más `.cover-trueque` en `app/globals.css`.
- **Fuente:** desde cero contra el contrato `ArcadeEngine`.
- **Por qué encaja:**
  - Es el único match-3 que nunca fue de ratón: cursor de 2×1 con cruceta y un botón de
    intercambio, esquema heredado tal cual del original de consola. Resuelve el riesgo de teclado
    de la familia sin inventar controles.
  - Tablero 6×12 a 40 px = 240×480 centrado con laterales de HUD dentro del canvas; `onLevel` como
    escalón de velocidad = patrón exacto de `tetris`; cadenas y combos se dibujan en canvas sin
    ampliar `EngineCallbacks`.
  - Assets cero: bloques de color con forma interior distintiva (desempate 4).
- **Riesgos:** el resolutor de cascadas y cadenas es el riesgo principal y el que puede desbordar
  un solo spec — exige máquina de estados por bloque (`normal → emparejado → parpadeo → desaparece
→ caída`) con temporizados; supuesto conservador asumido: solo subida automática del stack más
  `Shift` para acelerarla, difiriendo el "raise" manual; hay que fijar la fórmula de puntuación por
  cadena o `public.scores` no discriminará bien.
- **Descartados esta ronda:** ver entrada 007. Nota: queda por debajo de 007 y 008 porque conserva
  el "el tablero se llena y haces top-out" de `tetris` (desempate 1) y es el de mayor densidad
  lógica de la ronda.
- **Resultado:** —

### 010 — SOKOBAN → `bodega` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `bodega` (PUZZLE, green, sort_order a asignar al escribir la migración — colisión con
  los otros valores propuestos en paralelo; máximo actual 8) — **requiere migración nueva** sobre
  `public.games`, más `.cover-bodega` en `app/globals.css`.
- **Fuente:** desde cero contra el contrato `ArcadeEngine`; niveles autorados a mano dentro del
  propio spec (patrón `arkanoid/levels.ts`), sin depender de ningún set externo por descargar.
- **Por qué encaja:**
  - Encaje geométrico perfecto: reutiliza literalmente `COLS=20`/`ROWS=15`/`CELL=40` de
    `lib/games/serpentina/entities.ts` = exactamente 800×600, sin cambiar un número (desempate 3,
    la reutilización más alta de la ronda).
  - Teclado puro sin alternativa posible (`←↑→↓`, `R` reinicia, `Z` deshace) — riesgo de control
    nulo.
  - `onLevel` = número de puzzle, el uso más natural de ese callback en todo el repo. Assets cero.
- **Riesgos:** riesgo de diseño, no técnico — la puntuación es determinista (todos los que
  resuelvan los niveles óptimos empatan arriba) y eso degrada `/salon`; supuesto conservador:
  puntuar por movimientos ahorrados frente al par del nivel más bonus por no deshacer, pero un
  humano debe validar si es aceptable o si hace falta cronómetro (que desnaturaliza el género);
  estados sin salida obligan a que `R`/`Z` sean obligatorios, no opcionales; autoría manual de
  8-10 niveles con curva es trabajo de diseño dentro del spec.
- **Descartados esta ronda:** ver entrada 007. Nota: baja al 4.º puesto pese a ser el más fácil de
  implementar, por ser el único sin componente de tiempo real y por el problema de puntuación
  determinista frente a un catálogo de salón recreativo con marcador global.
- **Resultado:** —

### 011 — 2048 → `duplica` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `duplica` (PUZZLE, cyan, sort_order a asignar al escribir la migración — colisión con
  los otros valores propuestos en paralelo; máximo actual 8) — **requiere migración nueva** sobre
  `public.games`, más `.cover-duplica` en `app/globals.css`.
- **Fuente:** desde cero contra el contrato `ArcadeEngine`.
- **Por qué encaja:**
  - Riesgo de viabilidad prácticamente nulo: 4 teclas y nada más, tablero 4×4 de 480×480 centrado
    en 800×600, assets cero, `onScore` nativo del juego y `onLevel` = mayor potencia alcanzada.
  - Fusión direccional del tablero entero no se parece a nada de lo portado y no es un pozo
    (desempate 1).
- **Riesgos:** la regla de que una ficha no puede fusionarse dos veces en el mismo barrido es el
  bug clásico del género y debe fijarse explícitamente en el spec; animación de deslizamiento —
  supuesto conservador: interpolación de 100 ms que no toca la lógica; la partida no tiene presión
  que la termine y puede alargarse miles de movimientos.
- **Descartados esta ronda:** ver entrada 007. Nota: cierra el ranking por el peor encaje temático
  de la ronda (juego web de 2014 junto a ARKANOID/ROCAS/INVASORES) y porque es el que menos entrega
  frente al coste compartido de migración + `.cover-*` a mano — un motor de ~150 líneas para el
  mismo ceremonial de catálogo. KLAX quedó anotado como su sustitución natural si el humano
  prioriza autenticidad arcade sobre pureza de mecánica.
- **Resultado:** —

### 012 — PAC-MAN → `gloton` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `gloton` (ARCADE, yellow, sort_order 4) — libre, sin migración.
- **Fuente:** desde cero contra el contrato `ArcadeEngine`. No hay `game.js` de referencia:
  `referencias/started-games/` solo tiene los 3 ya portados. Precedente validado de port desde
  cero: SERPENTINA (SPEC 09).
- **Por qué encaja:**
  - Gana el desempate 2 de forma insuperable: la fila `gloton` está sembrada literalmente como
    Pac-Man ("Devora puntos y escapa de los fantasmas.", ARCADE, amarillo). Ningún otro candidato
    de la familia laberinto tiene un slot con esa semántica ya escrita.
  - Desempate 1: persecución con IA sobre ruta cerrada, mecánica sin parecido con los 4 portados.
  - Usa los tres callbacks sin forzarlos: `score` (puntos, power-pellets, fantasmas, frutas),
    `lives` (las 3 canónicas), `level` (oleada).
  - Coste de assets cero (desempate 4, el óptimo): todo vectorial sobre `<canvas>`.
  - Cabe en 800×600 con el laberinto canónico 28×31 a `CELL=19` (532×589) pillarboxeado, con el
    HUD dibujado en los márgenes laterales.
- **Riesgos:** la IA de fantasmas es el mayor coste de código de todo el catálogo hasta la fecha
  (~180-220 líneas solo de `ghosts.ts`; motor total estimado ~800 líneas, ~1,3x asteroids) —
  4 personalidades de tile-objetivo, máquina scatter/chase/frightened, retorno de ojos y
  liberación desde la casa; el "cornering" (girar antes del centro del tile) define el tacto del
  juego y es fácil de perder en un port ingenuo; túnel lateral con wrap y velocidad reducida;
  supuesto conservador asumido: laberinto canónico pillarboxeado, a confirmar con el humano;
  semántica de `onLevel` y momento exacto de `onGameOver` (define la inserción en `public.scores`).
- **Descartados esta ronda:** RALLY-X — no pasa la puerta: laberinto mayor que la pantalla, exige
  scroll de cámara y radar-minimapa (segunda vista). DONKEY KONG — no pasa el último ítem sin
  amputarlo: 4 fases de mecánicas distintas y física de plataformas sin análogo validado.
  LODE RUNNER — pasa la puerta pero la IA de guardias es la más cara de la familia, por encima de
  los fantasmas. BURGERTIME — pierde el desempate 3: no reutiliza la rejilla de `serpentina`.
  MR. DO! — redundante con Dig Dug. MS. PAC-MAN — es una ampliación de esta misma spec, no un
  candidato aparte. FROGGER/CROSSY ROAD — excluidos: `ranaria` reservado por la entrada 001.
- **Nota sobre la entrada 001:** aquella ronda descartó GLOTÓN por el coste de la IA de fantasmas.
  Ese hecho sigue siendo cierto, pero allí competía contra Frogger (IA de coste cero); en una
  ronda restringida a la familia laberinto/persecución ese coste es el suelo común de todos los
  candidatos, no un diferenciador, y el desempate 2 decide. No es una ratificación ni una
  repetición de 001: 001 sigue `propuesto` sobre `ranaria`, intacta.
- **Resultado:** —

### 013 — BOMBERMAN → `bombardero` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `bombardero` (ARCADE, magenta, sort_order a asignar al escribir la migración — colisión
  con los otros valores propuestos en paralelo; máximo actual 8) — **requiere migración nueva
  sobre `public.games`** (patrón: `supabase/migrations/20260826184921_games.sql`).
- **Fuente:** desde cero contra el contrato `ArcadeEngine`; sin `game.js` de referencia.
- **Por qué encaja:**
  - Desempate 3, el más alto de la ronda junto con Pengo: reutiliza casi tal cual la rejilla
    discreta de `serpentina` (movimiento por celdas, ocupación booleana del tablero) y la
    progresión declarativa por fases de `arkanoid/levels.ts`.
  - Desempate 4: cero assets, todo rectángulos y círculos.
  - La IA de perseguidores es la más barata de la familia (~40 líneas): los enemigos canónicos
    caminan recto y eligen dirección al azar en las intersecciones, sin pathfinding.
  - Es el candidato de menor riesgo de ejecución de la ronda; el más claramente alcanzable en un
    solo spec. Rejilla 15x13 a `CELL=40` (600x520) centrada en el búfer, HUD en los márgenes.
  - Pierde el desempate 2 frente a Pac-Man solo por exigir migración: no hay slot sembrado con su
    semántica.
- **Riesgos:** la propagación de la explosión en cruz con corte por bloque duro y la reacción en
  cadena entre bombas es la única lógica delicada (puramente de rejilla); condición de victoria de
  fase por decidir — supuesto conservador: matar a todos los enemigos y alcanzar la puerta oculta;
  auto-daño con la propia bomba a fijar explícitamente; power-ups (rango, bombas simultáneas)
  recomendados y triviales sobre la rejilla; coste extra de la migración y del `sort_order` sin
  romper el orden ya sembrado.
- **Descartados esta ronda:** los mismos de la entrada 012 (RALLY-X y DONKEY KONG por no pasar la
  puerta; LODE RUNNER, BURGERTIME, MR. DO! y MS. PAC-MAN por rúbrica; FROGGER/CROSSY ROAD por
  reserva de `ranaria` en la entrada 001).
- **Resultado:** —

### 014 — DIG DUG → `excavador` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `excavador` (ARCADE, yellow, sort_order a asignar al escribir la migración — colisión
  con los otros valores propuestos en paralelo; máximo actual 8) — **requiere migración nueva
  sobre `public.games`** (patrón: `supabase/migrations/20260826184921_games.sql`).
- **Fuente:** desde cero contra el contrato `ArcadeEngine`; sin `game.js` de referencia.
- **Por qué encaja:**
  - Gana con fuerza el desempate 1: el terreno destructible no existe en ninguno de los 4 ports
    actuales ni en ningún otro candidato de esta ronda — la mecánica más genuinamente nueva.
  - Usa los tres callbacks: `score` (bombeo, rocas que aplastan), `lives`, `level` (rondas con más
    enemigos y capas de roca).
  - Desempate 3: la rejilla de `serpentina` sirve de sustrato para la máscara de tierra
    (`Uint8Array` de celdas excavadas), y `arkanoid/levels.ts` para rocas y enemigos por ronda.
  - Desempate 4: cero assets, tierra en capas de color y enemigos vectoriales.
  - Playfield ~14x12 a `CELL=40` (560x480) más franja de cielo, todo dentro del búfer 800x600.
- **Riesgos:** granularidad de la excavación — supuesto conservador asumido: máscara por celda, no
  por píxel, a confirmar con el humano; el bombeo inflar-hasta-reventar necesita estado y
  temporizador de desinflado por enemigo y no puede simplificarse a "tocar = matar" sin perder el
  juego; rocas que caen al excavar debajo, con bonus por aplastar dos enemigos; el aliento de
  fuego de Fygar añade un segundo tipo de enemigo y puede diferirse si la spec queda grande; la IA
  es de coste medio (~90 líneas): persecución por túneles ya excavados sobre un grafo que cambia
  cada frame, más el "modo fantasma" que atraviesa la tierra en línea recta; migración.
- **Descartados esta ronda:** los mismos de la entrada 012.
- **Resultado:** —

### 015 — PENGO → `pinguino` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `pinguino` (PUZZLE, cyan, sort_order a asignar al escribir la migración — colisión con
  los otros valores propuestos en paralelo; máximo actual 8) — **requiere migración nueva sobre
  `public.games`** (patrón: `supabase/migrations/20260826184921_games.sql`). `cat: ARCADE` es la
  alternativa razonable; se propone PUZZLE porque hoy esa categoría solo contiene a `tetris`.
- **Fuente:** desde cero contra el contrato `ArcadeEngine`; sin `game.js` de referencia.
- **Por qué encaja:**
  - Empata con Q*bert en los desempates 1 y 2 y gana el 3: es el candidato con más reutilización
    directa de la rejilla de `serpentina` después de Bomberman (deslizamiento de bloque hasta
    colisión = un bucle de celdas).
  - Mecánica distinta de todo lo portado: empujar bloques de hielo para aplastar enemigos y
    aturdirlos golpeando el muro.
  - Usa `score` (Sno-Bees aplastadas, alineación de bloques diamante), `lives` y `level` (rondas).
  - Desempate 4: cero assets. Rejilla 13x15 a `CELL=40` (520x600), altura exacta del búfer y
    pillarbox lateral para el HUD.
  - IA de perseguidores de coste bajo-medio (~80 líneas): heurística greedy sobre celdas libres,
    las Sno-Bees rompen hielo para abrirse paso, con estado "aturdido". Sin personalidades
    múltiples ni máquina de estados global.
- **Riesgos:** orden de resolución del empuje (bloque, luego enemigos, luego jugador) para evitar
  estados inconsistentes cuando un bloque deslizante aplasta algo en su trayecto; el bonus por
  alinear los 3 bloques-diamante exige comprobación de alineación en fila y columna; bloques que
  emergen de los bordes en rondas avanzadas; es el menos icónico de los cinco — encaje temático
  más débil en un catálogo retro, aunque técnicamente de los más limpios; confirmar `cat` PUZZLE
  frente a ARCADE; migración.
- **Descartados esta ronda:** los mismos de la entrada 012.
- **Resultado:** —

### 016 — Q*BERT → `piramide` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `piramide` (ARCADE, magenta, sort_order a asignar al escribir la migración — colisión
  con los otros valores propuestos en paralelo; máximo actual 8) — **requiere migración nueva
  sobre `public.games`** (patrón: `supabase/migrations/20260826184921_games.sql`).
- **Fuente:** desde cero contra el contrato `ArcadeEngine`; sin `game.js` de referencia.
- **Por qué encaja:**
  - Gana el desempate 1 con claridad: proyección isométrica y salto diagonal con volteo de color
    de casillas no se parecen a nada del repo ni a nada de esta ronda.
  - Es el que mejor se acomoda al búfer: pirámide de 7 filas / 28 cubos, ~504x450 px centrada en
    800x600 sin pillarbox forzado, con márgenes de sobra para el HUD.
  - Usa `score` (cubos volteados, enemigos), `lives` (las 3 canónicas) y `level` (rondas: 1 toque
    por cubo, luego 2, luego alternancia).
  - Desempate 4: cero assets — cubos como 3 rombos, personajes como esferas y espirales.
  - IA de perseguidores barata (~60 líneas): Coily salta hacia el jugador con heurística trivial
    sobre coordenadas de pirámide; las bolas solo bajan.
- **Riesgos:** cae al último puesto por el desempate 3 — es el único de los cinco que no reutiliza
  la rejilla rectangular de `serpentina`: necesita su propia proyección iso (fila,columna → x,y)
  escrita desde cero, sin análogo validado. El mapeo de las 4 diagonales a las 4 flechas es la
  queja clásica de todos los ports de Q*bert y hay que fijarlo y comunicarlo en pantalla; caer
  fuera de la pirámide debe matar, lo que exige un estado de caída además del salto; los discos
  flotantes que teletransportan a la cima y despeñan a Coily añaden otro estado; sin el volteo por
  rondas (1 toque / 2 toques / alternancia) el juego queda plano; migración.
- **Descartados esta ronda:** los mismos de la entrada 012.
- **Resultado:** —

### 017 — PONG VERSUS → `duelo-pixel` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `duelo-pixel` (VERSUS, cyan, sort_order 8) — libre, sin migración.
- **Fuente:** desde cero contra el contrato `ArcadeEngine`. No hay `game.js` de referencia:
  `referencias/started-games/` solo tiene los 3 ya portados y `referencias/source-assets/` solo el
  sprite sheet de Snake, consumido en SPEC 09.
- **Por qué encaja:**
  - Único candidato cuyo slot ya está sembrado describiéndolo literalmente: `short` "Dos paletas.
    Una pelota. Reflejos máximos." y `long` "…partida local a dos jugadores" (desempate 2,
    decisivo).
  - Coste de assets cero **y** coste de portada cero: `.cover-duelo` en `globals.css` ya dibuja red
    central, paleta cyan, paleta magenta y bola (desempate 4, el óptimo del ranking).
  - Reutiliza la física bola-vs-paleta ya validada de `lib/games/arkanoid/entities.ts` (rebote con
    ángulo según punto de impacto) (desempate 3).
  - 800×600 es 4:3 nativo: sin letterbox. `score` + `level` (velocidad por rally) bastan; el
    marcador del rival se dibuja dentro del canvas, sin ampliar `EngineCallbacks`.
- **Riesgos:** el nudo es la puntuación a dos jugadores, ya confirmado en el código —
  `game-player.tsx` tiene un solo "Puntuación" en el HUD, un solo "PUNTUACIÓN FINAL" en el modal y
  auto-inserta esa cifra contra `auth.uid()`, que es el jugador con sesión, mientras el segundo
  humano no tiene ninguna. Supuesto conservador asumido, a confirmar con el humano: solo el modo
  1P-vs-CPU llama a `onGameOver` y guarda; el 2P local se juega pero no inserta en `public.scores`,
  para no atribuirle a la sesión una partida que ganó otra persona. Además: calibrar la IA (una
  paleta que sigue la `y` de la bola sin error es invencible — banda muerta + velocidad tope
  escalada por `onLevel`), y definir el fin de partida (primero a 11 vs. tiempo).
- **Descartados esta ronda:** CIRCUS CHARLIE — no pasa la puerta, depende de un sprite sheet que no
  existe en el repo; MOON PATROL — vehículo que dispara, invade la familia shooter y su parallax +
  disparo dual no cabe en un spec; JOUST — mecánica de plataformas, familia de otro agente; WARLORDS
  — 4 jugadores en un teclado, inmanejable y multiplica el problema de la puntuación; TRACK & FIELD —
  4 pruebas con física propia, sería un spec por evento; ALETEO (flappy-like) — pasa la puerta pero
  es demasiado fino y no justifica gastar migración + `.cover-*`.
- **Resultado:** —

### 018 — LUNAR LANDER → `alunizaje` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `alunizaje` — **requiere migración nueva** sobre `public.games` (patrón
  `supabase/migrations/20260826184921_games.sql`). Fila propuesta: `id: alunizaje`,
  `title: "ALUNIZAJE"`, `cat: ARCADE`, `color: magenta`, `sort_order` a asignar al escribir la
  migración (los valores propuestos en paralelo colisionan; el máximo actual en `public.games` es
  8), `cover: cover-luna`.
- **Fuente:** desde cero contra el contrato `ArcadeEngine`.
- **Por qué encaja:**
  - La reutilización de patrón más fuerte de la ronda (desempate 3): es el motor de
    `lib/games/asteroids/` — rotación por ángulo, empuje acumulado sobre el vector velocidad,
    integración por frame, render vectorial — sin disparo ni wrap-around y con gravedad constante.
  - La mayor variedad de mecánica de la ronda junto con SECUENCIA (desempate 1): precisión y
    gestión de recurso, no esquiva-y-dispara; primer juego del vault donde no se destruye nada.
  - Usa los tres callbacks con semántica natural: `score` = bonus por dificultad de plataforma,
    `lives` = naves, `level` = gravedad/terreno por misión.
  - Assets cero (terreno = polilínea, nave = triángulo con llama); el único coste extra es el
    bloque `.cover-luna` en `globals.css`.
- **Riesgos:** el combustible no tiene ranura en `EngineCallbacks` y ampliar el contrato es rechazo
  automático — se dibuja como barra dentro del canvas (mismo criterio que las líneas de `tetris`);
  fijar umbrales de alunizaje válido (velocidad vertical, horizontal y ángulo) sin volverlo hostil
  desde el primer intento; generación de terreno determinista vs. aleatoria y garantizar siempre
  una plataforma alcanzable con el combustible dado; decidir si quedarse sin combustible es muerte
  inmediata o caída libre jugable.
- **Descartados esta ronda:** ver 017. Frente a SECUENCIA gana por reutilización directa del motor
  de `rocas`; frente a ESTELAS y CUBETAS gana por variedad de mecánica.
- **Resultado:** —

### 019 — SIMON → `secuencia` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `secuencia` — **requiere migración nueva** sobre `public.games` (patrón
  `supabase/migrations/20260826184921_games.sql`). Fila propuesta: `id: secuencia`,
  `title: "SECUENCIA"`, `cat: ARCADE`, `color: cyan`, `sort_order` a asignar al escribir la
  migración (los valores propuestos en paralelo colisionan; el máximo actual en `public.games` es
  8), `cover: cover-seq`.
- **Fuente:** desde cero contra el contrato `ArcadeEngine`.
- **Por qué encaja:**
  - La mecánica más distinta de todo el vault (desempate 1, la mejor de la ronda): memoria pura —
    ni bola, ni rejilla, ni disparo, ni pila. Nada que se solape con los 4 portados.
  - El spec más pequeño y más cierto de la ronda: una máquina de estados de tres fases (reproducir
    / esperar / validar) sobre cuatro cuadrantes en un solo canvas.
  - Assets cero de verdad: los cuatro tonos se generan con osciladores `WebAudio`, sin copiar
    archivos a `public/juegos/` (a diferencia de `arkanoid`). Solo cuesta `.cover-seq`.
  - `score` = longitud de secuencia superada, `level` = ronda, `lives` = fallos permitidos: encaja
    en el contrato sin inventar stats.
- **Riesgos:** el `AudioContext` debe crearse tras un gesto del usuario (la partida arranca con una
  tecla, así que se cumple) y cerrarse en un `destroy()` idempotente — misma clase de fuga que
  vigiló `arkanoid`, pero con contexto propio en vez de `<audio>`; el juego tiene que ser jugable
  solo con el destello visual, sin depender del audio; decidir si el fallo es `onGameOver` directo
  o consume una vida; y fijar la aceleración por ronda para que la partida no sea eterna. Es el
  candidato que menos código previo del repo reaprovecha (desempate 3, su único punto débil).
- **Descartados esta ronda:** ver 017. Queda por detrás de ALUNIZAJE solo por el desempate 3
  (reutilización de patrón), tras empatar por arriba en variedad de mecánica.
- **Resultado:** —

### 020 — SURROUND / MOTOS DE LUZ → `estelas` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `estelas` — **requiere migración nueva** sobre `public.games` (patrón
  `supabase/migrations/20260826184921_games.sql`). Fila propuesta: `id: estelas`,
  `title: "ESTELAS"`, `cat: VERSUS`, `color: magenta`, `sort_order` a asignar al escribir la
  migración (los valores propuestos en paralelo colisionan; el máximo actual en `public.games` es
  8), `cover: cover-estelas`.
- **Fuente:** desde cero contra el contrato `ArcadeEngine`.
- **Por qué encaja:**
  - Reutilización casi literal del bucle de `lib/games/serpentina/` (desempate 3): tick discreto,
    giro de 180° prohibido, colisión contra celdas ocupadas — duplicado a dos actores y con la
    estela creciendo siempre, sin comida.
  - Rejilla que cuadra exacta en 800×600 (`CELL=20` → 40×30), sin letterbox ni ajuste de física.
  - Da coherencia real al `cat` VERSUS, que tras el candidato 017 seguiría teniendo una sola fila
    (desempate 2), y mantiene la simetría a dos teclados (`WASD` vs flechas).
  - Assets cero (rectángulos de color) + el bloque `.cover-estelas`.
- **Riesgos:** hereda íntegro el riesgo de puntuación a dos jugadores de la entrada 017 — un solo
  `onScore` insertando contra `auth.uid()` en una partida local; mismo supuesto conservador: solo
  puntúa y guarda el modo contra CPU. Además: la muerte simultánea (ambos chocan en el mismo tick)
  necesita una regla explícita de empate; la IA es notoriamente difícil de calibrar (una que solo
  evita la colisión inmediata es trivial de encerrar, una con flood-fill es invencible); y decidir
  si hay estructura de rondas (mejor de N) o muerte súbita. Pierde el desempate 1 frente a
  ALUNIZAJE y SECUENCIA porque su mecánica es la de `serpentina`, ya portada.
- **Descartados esta ronda:** ver 017. Gana a CUBETAS por reutilización de patrón más directa y por
  reforzar la categoría VERSUS.
- **Resultado:** —

### 021 — KABOOM! → `cubetas` (2026-09-08)

- **Estado:** propuesto
- **Slot:** `cubetas` — **requiere migración nueva** sobre `public.games` (patrón
  `supabase/migrations/20260826184921_games.sql`). Fila propuesta: `id: cubetas`,
  `title: "CUBETAS"`, `cat: ARCADE`, `color: yellow`, `sort_order` a asignar al escribir la
  migración (los valores propuestos en paralelo colisionan; el máximo actual en `public.games` es
  8), `cover: cover-cubetas`.
- **Fuente:** desde cero contra el contrato `ArcadeEngine`.
- **Por qué encaja:**
  - Puerta de viabilidad de las más limpias del repo: bombardero arriba y pila de cubetas abajo en
    el mismo canvas, 800×600 nativo, `←`/`→` y `P`, `destroy()` trivial, cero decisiones de diseño
    espinosas.
  - Los tres callbacks con semántica natural y sin forzar: `score` = bombas atrapadas con
    multiplicador, `lives` = cubetas restantes (mapea directo a los corazones del HUD de
    `game-player.tsx`), `level` = oleada.
  - Reutiliza el control horizontal de paleta y el spawn/caída de entidades de `arkanoid`, con
    progresión por oleadas al estilo de su `levels.ts` (desempate 3).
  - Assets cero (bombas = círculos con mecha, cubetas = trapecios) + el bloque `.cover-cubetas`.
- **Riesgos:** la curva de dificultad **es** el juego (el Kaboom! original es brutal desde la
  oleada 3) y no hay referencia en el repo para calibrarla — tuneo a ojo, es el mayor riesgo del
  port; decidir si perder una cubeta también elimina las bombas en vuelo; el multiplicador por
  oleada no tiene ranura en el contrato y se dibuja en canvas. Cierra el ranking porque pierde el
  desempate 1: sería el tercer juego de controlar algo horizontal en la base de la pantalla, tras
  `arkanoid` y el PONG de la entrada 017.
- **Descartados esta ronda:** ver 017.
- **Resultado:** —
