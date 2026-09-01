---
name: juego-nuevo
description: Diseña el spec para integrar un juego jugable nuevo en Arcade Vault — motor portado al contrato ArcadeEngine, entrada en el registry, assets y el leaderboard que viene detrás. Pregunta lo que /spec no sabe preguntar sobre un port de juego, y escribe specs/NN-slug.md. Úsalo antes de implementar cualquier juego nuevo.
disable-model-invocation: true
argument-hint: "nombre del juego, opcionalmente con su fuente y el slot del catálogo"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(wc:*)
---

# /juego-nuevo — Diseñador de specs para juegos del Vault

## Session context

Hoy (usa esto para la fecha del spec, nunca la inventes):
!`date +%F`

Specs que ya existen:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ todavía no existe"`

Contrato de motor vigente — léelo tal cual, no de memoria (el número de callbacks cambia entre specs y código real):
!`cat lib/games/types.ts 2>/dev/null || echo "lib/games/types.ts no existe todavía"`

Motores ya registrados:
!`cat lib/games/registry.ts 2>/dev/null || echo "lib/games/registry.ts no existe todavía"`

Juegos de referencia disponibles para portar:
!`ls referencias/started-games/ 2>/dev/null || echo "No hay carpeta referencias/started-games/"`

---

Este skill diseña el spec para integrar un juego jugable nuevo — con motor real en `<canvas>`, cableado al registry, y puntuaciones que caen en el leaderboard existente. **Aquí no se escribe código.** Tu trabajo es identificar qué juego se porta y de dónde, hacer las preguntas específicas de un port de juego que `/spec` no sabe hacer, y dejar el spec listo en `specs/`.

## Por qué existe además de `/spec`

`/spec` es genérico: sirve para cualquier feature. Portar un juego a Arcade Vault tiene una forma muy específica —ya validada dos veces (SPEC 05, Asteroids en `rocas`; y el catálogo/leaderboard del SPEC 06 que cualquier juego nuevo hereda gratis)— con trampas que no se ven leyendo el código superficialmente:

- `.crt-screen` fuerza `aspect-ratio: 4 / 3` y estira el `<canvas>` al 100%. Un juego que no nazca 4:3 se deforma si nadie lo decide explícitamente.
- El contrato es un único `<canvas>`. Un juego original con una segunda vista (p. ej. "next piece"), una barra lateral en HTML o un overlay propio de game over no tiene dónde vivir salvo que alguien decida absorberlo dentro del mismo canvas o descartarlo.
- `EngineCallbacks` solo transporta `score`, `lives`, `level`, game over y pausa. Un stat propio del juego (líneas limpiadas, combo, tiempo) no tiene ranura en el contrato — se dibuja en el canvas, no se añade al contrato, salvo decisión explícita en contra.
- Un juego con sprites o sonido introduce assets binarios que Asteroids nunca tuvo: dónde viven, cómo se referencian bajo Next, y qué le pasa al audio cuando se sale del reproductor.

Sin este skill, cada una de esas decisiones se toma implícitamente durante la implementación — que es justo lo que el flujo de spec existe para evitar.

## Lo que casi nunca cambia

Antes de preguntar nada, ten claro (y no lo repreguntes) que la plataforma ya es genérica para juegos con motor real:

- `app/components/game-player.tsx` **no se toca**: `hasEngine = game.id in GAME_ENGINES` ya gobierna el canvas, el import dinámico del motor, el HUD, el guardado automático en `scores` al terminar la partida (solo si hay sesión), y el bloque de guardado del modal.
- `lib/games-data.ts`, `/salon`, `/biblioteca`, la landing y su ticker **no se tocan**: leen `games`/`scores`/`game_stats` de Postgres. En cuanto exista una fila de `scores` para el juego nuevo, el leaderboard, el podio del Salón de la Fama y el ticker de la portada lo muestran solos.
- Los 8 `games.id` del catálogo ya están sembrados por migración (`supabase/migrations/20260826184921_games.sql`). Salvo que el usuario pida explícitamente un juego fuera de esos 8, no hace falta ninguna migración nueva — solo ocupar un slot libre.

Lo que sí cambia en cada port: `lib/games/<slug>/{entities,engine,index}.ts`, una línea nueva en `lib/games/registry.ts`, la etiqueta de controles hardcodeada en `app/juegos/[id]/page.tsx:33` (`game.id === "rocas" ? "TECLADO" : "TECLADO / TÁCTIL"`), assets en `public/` si los hay, y los párrafos de `CLAUDE.md` que hoy dicen "currently only `rocas`".

## Fases

### Fase 1 — Identificar el juego y su fuente

A partir de `$ARGUMENTS` y del listado de `referencias/started-games/` en el contexto de sesión, resuelve tres cosas:

1. **Qué juego.** Nombre y mecánica en una frase.
2. **De dónde sale el código.** Tres orígenes posibles:
   - Una carpeta de `referencias/started-games/` (léela: `game.js` y los archivos que lo acompañen).
   - Código o una ruta que aporte el usuario.
   - Escrito desde cero, sin fuente previa.
3. **A qué `games.id` del catálogo va.** Lee la migración de `games` para ver los 8 ids sembrados y cuáles ya tienen motor en `lib/games/registry.ts` (contexto de sesión). Ofrece solo los libres.

Si `$ARGUMENTS` viene vacío, pregunta por el nombre del juego antes de seguir.

**Regla dura:** la clave que se añadirá a `GAME_ENGINES` debe ser idéntica al `games.id` de Postgres. Es lo único que enciende el motor real (`game.id in GAME_ENGINES` en `game-player.tsx`), y `scores.game_id` tiene una FK contra `games.id` — un id inventado nunca podrá guardar puntuación.

Si el slot pedido ya tiene motor registrado, para y avisa en vez de proponer sobrescribirlo.

### Fase 2 — Preguntas del port

El corazón del skill. Igual que `/spec`, pregunta en bloques de 3 a 5 con `AskUserQuestion`, marca tu recomendación, y espera respuesta antes de seguir. Cubre, en este orden (cada una condiciona la siguiente):

1. **Slot del catálogo.** Cuál de los ids libres ocupa, con su `cat` y `color` ya fijados por la migración — no se inventan.
2. **Buffer y proporción.** Dimensiones nativas del juego original vs. el `4 / 3` fijo de `.crt-screen`. Si no es 4:3, dos opciones: letterbox dentro de un buffer 800×600 (recomendado — no toca física del juego ni CSS global), o una regla CSS específica para ese juego en `.crt-screen` (más trabajo, rompe la convención actual).
3. **Mapeo a `EngineCallbacks`.** De dónde sale exactamente `score`, `lives` y `level` en la lógica del juego. Si no tiene vidas, `onLives(0)` ya pinta `—` en el HUD sin cambios en React. Cualquier stat que el contrato no cubra (líneas, combo, tiempo) se dibuja en el canvas como hace Asteroids con su HUD dual, salvo que el usuario pida explícitamente ampliar `EngineCallbacks` — avisa que eso obliga a tocar también `game-player.tsx` y el motor de Asteroids para no romperlo.
4. **Elementos fuera de un único canvas.** ¿El original usa un segundo canvas, una barra lateral en HTML, o un overlay de fin de partida propio? Decide explícitamente si se absorben dentro del único `<canvas>` del contrato o se descartan — nunca se dejan implícitos.
5. **Assets.** Si hay sprites o sonido: van a `public/juegos/<slug>/` y se referencian con ruta absoluta (`/juegos/<slug>/…`), nunca con la ruta relativa del original. Cubre también: precarga antes del primer frame jugable, que los navegadores bloquean el audio sin interacción previa del usuario, y que `destroy()` tiene que parar y soltar cualquier sonido en curso o seguirá sonando tras salir del reproductor.
6. **Controles.** Qué teclas necesitan `preventDefault()` — a diferencia del `index.html` original, la página del Vault sí tiene scroll vertical — y si `P`/`Escape` deben pausar además del botón de React.
7. **Fin de partida y reinicio.** Confirma que `onGameOver(score)` se emite una sola vez, y que `restart()` es el mismo método público que invocan tanto una tecla de reinicio del juego original (si la tiene) como el botón "JUGAR DE NUEVO" de React — un solo camino, no dos lógicas duplicadas.

Si alguna respuesta abre algo que se sale de portar este juego (p. ej. "y que además tenga modo dos jugadores"), señala que eso merece su propio spec y pregunta si se deja fuera de este.

### Fase 3 — Escribir el spec

Cuando las siete preguntas estén cerradas sin nada por asumir, escribe el spec completo de una vez (no sección por sección — igual que `/spec`, re-preguntar por partes cuando ya se respondió todo es fricción).

- Lee `template.md` (en esta misma carpeta) para la estructura exacta de cada sección.
- Numeración: siguiente entero tras el máximo en `specs/` (contexto de sesión), dos dígitos.
- Slug: kebab-case derivado del nombre del juego y su slot (p. ej. `07-tetris-real-en-caida`).
- Fecha: la del bloque `date` del contexto de sesión, nunca inventada.
- Idioma: encabezados y etiquetas de sección en inglés, prosa y vocabulario de estado en español — es la convención verificada en los seis specs existentes del repo.
- Estado inicial: `borrador`.
- Si el spec depende de otro (normalmente SPEC 05 y SPEC 06, por el contrato de motor y el catálogo/leaderboard), verifica que existan en `specs/` antes de referenciarlos.

### Fase 4 — Confirmar y parar

Al terminar:

- Confirma la ruta del archivo creado.
- Recuerda que queda en `borrador` y que el cambio a `aprobado` lo hace el humano tras releerlo.
- Indica el siguiente paso: `/spec-impl NN-slug` una vez aprobado.
- **No propongas implementar nada, no escribas ni un fragmento de código de motor.** Tu turno termina en la confirmación.

## Reglas duras

- **Nunca escribas código durante este comando.** Solo el `.md` del spec.
- **Nunca asumas una decisión de port que el usuario no confirmó** en la Fase 2 — es exactamente para eso que existe.
- **No repitas en la Fase 3 lo que ya se cerró en la Fase 2.**
- **Si el slot de catálogo pedido ya tiene motor registrado**, detente y dilo antes de diseñar nada — no hay spec que valga si el primer paso pisa un juego que ya funciona.
