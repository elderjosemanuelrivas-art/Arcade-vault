---
name: spec-impl-game
description: Implementa un spec de juego aprobado siguiendo /spec-impl al pie de la letra, y al terminar dispara en secuencia (nunca en paralelo) skin-designer y luego mobile-porter para dejar el juego nuevo con sus 3 skins y su experiencia móvil auditada.
disable-model-invocation: true
argument-hint: <NN-nombre-del-spec>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Task, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*), Bash(date:*), Bash(npm run lint:*), Bash(npm run build:*), Bash(npx tsc:*)
---

# /spec-impl-game — Implementador de specs de juego + post-proceso

## Session context

Estado del repo:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

Config de creación de rama:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, sin archivo de config)"`

Motores ya registrados:
!`cat lib/games/registry.ts 2>/dev/null || echo "sin registry"`

Motores que ya tienen skins:
!`ls lib/games/*/skins.ts 2>/dev/null || echo "ningún motor tiene skins.ts todavía"`

---

Este comando **es** `/spec-impl`, sin duplicarlo, más una fase de post-implementación específica
de juegos. La razón de existir por separado: un port de juego siempre necesita dos pasos más que
`/spec-impl` no sabe dar — sus 3 skins (`skin-designer`) y una auditoría de experiencia móvil
(`mobile-porter`) — y lanzarlos a mano, uno por uno, en el orden correcto, es fricción que se
olvida. Este skill los encadena automáticamente **en secuencia, nunca en paralelo**: ambos
verifican su propio trabajo con `git diff --stat` contra una lista blanca de archivos, así que
lanzarlos a la vez haría que cada uno viera el diff del otro y fallara esa puerta.

**Regla de diseño no negociable: no se copian ni se reescriben las fases de `/spec-impl` en este
archivo.** Se leen del skill instalado, en tiempo de ejecución, y se siguen verbatim. Así, si
`/spec-impl` se actualiza (`npx skills@latest add Klerith/fernando-skills`), este comando hereda el
cambio sin que nadie tenga que tocarlo.

## Fase A — Delegar en `/spec-impl`

1. `Read .claude/skills/spec-impl/SKILL.md` (es un symlink en el working tree hacia
   `.agents/skills/spec-impl/SKILL.md` — léelo tal cual, no asumas su contenido de memoria aunque
   lo hayas visto antes en esta sesión).
2. Si el `Read` falla (el skill fue reinstalado, renombrado o movido), **para aquí** y dilo — no
   reconstruyas sus fases de memoria ni improvises un sustituto.
3. Ejecuta sus **Fases 1 a 4 exactamente como están escritas**, usando `$ARGUMENTS` como el
   argumento del spec. Esto incluye, sin ninguna excepción ni atajo:
   - Fase 1: localizar el archivo en `specs/` a partir del argumento (número, slug o nombre
     completo), o pedirlo si viene vacío.
   - Fase 2: validar que el campo de estado del spec **significa "Aprobado" en cualquier idioma**.
     Si no lo significa (`Borrador`, `En revisión`, `Implementado`, `Obsoleto`, o cualquier valor no
     reconocido), **detente ahí** y muestra el mensaje de error estándar de `/spec-impl` tal cual —
     sin ofrecer alternativas, sin "puedo empezar igual si quieres". **No se lanza ningún agente si
     esta fase bloquea.**
   - Fase 3: comprobar el working tree (parar y preguntar si hay cambios sin commitear, nunca
     stashear por tu cuenta), leer `AutoCreateBranch` de `specs/.spec-config.yml`, crear/cambiar a
     la rama `spec-NN-slug` según corresponda, y mostrar el resumen del spec (objetivo, alcance,
     plan de implementación, criterios de aceptación) antes de tocar código.
   - Fase 4: implementar paso a paso, mostrando el diff y pausando para confirmación después de
     cada paso del plan, resolviendo cualquier ambigüedad con el usuario en vez de improvisar, y
     **nunca commiteando automáticamente** — ni por paso, ni al final.

## Fase B — Cierre de la implementación y puerta de commit

Una vez completado el último paso del plan (Fase 4 de `/spec-impl` terminada):

1. Verifica los criterios de aceptación del spec uno por uno y muestra el resultado de cada uno.
2. Corre `npm run lint` y `npm run build`; muestra el resultado literal de ambos.
3. **Pide al humano que haga el commit** del trabajo del spec (o commitea tú solo si te lo pide
   explícitamente — se hereda la regla de `/spec-impl` de nunca commitear sin que te lo pidan).
   Explica el porqué en una línea: tanto `skin-designer` como `mobile-porter` verifican su propio
   trabajo con `git diff --stat` contra una lista blanca de archivos; con el trabajo del spec sin
   commitear, esas puertas verían archivos ajenos mezclados y darían un falso rojo.
4. **No continúes a la Fase C** hasta que el working tree esté limpio, o el humano diga
   explícitamente que sigas de todos modos con cambios sin commitear.
5. Identifica el **juego objetivo** de esta invocación: cruza el `games.id` que el spec ocupó
   (Fase 1 del spec) con la línea nueva en `lib/games/registry.ts` (compara contra el registry que
   ya tenías en el contexto de sesión) para resolver el par `id` → directorio bajo `lib/games/`.
   - Si el spec no terminó registrando ningún motor nuevo en `GAME_ENGINES`, dilo explícitamente y
     pregunta si se salta `skin-designer` (no tendría un motor nuevo sobre el que trabajar) o se
     aborta la cadena de post-proceso aquí, dejando el spec implementado sin más.
   - Comprueba también aquí si el spec ya añadió una entrada para este juego en
     `lib/games/touch-controls.ts` (`TOUCH_CONTROLS`) — lo necesitas para la Fase D.

## Fase C — `skin-designer` (primero, solo)

Una única llamada al agente `skin-designer`, en su propio turno. **Espera su informe completo
antes de hacer cualquier otra cosa** — nunca la lances junto con `mobile-porter` en el mismo turno.

El prompt que le pasas debe incluir, explícitamente:

- **El nombre del juego, sin ambigüedad.** Es obligatorio, no cosmético: la Fase 1 de
  `skin-designer` elige por defecto "el primero de `rocas, tetris, arkanoid, serpentina` (el orden
  de `registry.ts`) que no tenga `skins.ts`" — y hoy los cuatro ya lo tienen, así que sin nombrar el
  juego reportaría "nada que hacer" y el port recién implementado se quedaría sin skins. Su propia
  Fase 1 contempla el caso ("Si el invocador nombra un juego explícitamente, ese"): pásaselo.
- El `games.id` y el directorio del motor bajo `lib/games/` que resolviste en la Fase B.5.
- Que es un port recién implementado del spec `NN-slug` (nombra el spec).
- Que `lib/games/types.ts` puede ya traer `SkinName`/`SkinSet`/`DEFAULT_SKIN`/`EngineOptions` de
  invocaciones anteriores sobre otros juegos — su propia Fase 2 ya es idempotente y no debe
  duplicarlos, solo confirmarlo antes de tocar el archivo.
- Que el selector de skin en `app/components/game-player.tsx` ya existe y detecta la capacidad del
  motor en runtime (`typeof engine.setSkin === "function"`) — su único trabajo en esta invocación es
  que el motor nuevo implemente ese método opcional; no tiene que tocar `game-player.tsx`.

Al recibir su informe:

- Relévalo al usuario: qué juego modificó, el resultado literal de sus 3 puertas de verificación,
  la lista exacta de archivos tocados, y una línea por skin con su dirección visual.
- **Si reportó cualquier puerta en rojo, `build` roto, o "nada que hacer" por no encontrar el motor
  nuevo, detén la cadena aquí** — no lances `mobile-porter` sobre una base rota. Dile al usuario qué
  quedó pendiente y por qué.

## Fase D — `mobile-porter` (después, solo)

Solo si la Fase C terminó en verde. Una única llamada al agente `mobile-porter`, en un turno
propio y separado del de `skin-designer` — nunca en el mismo mensaje.

El prompt que le pasas debe incluir, explícitamente:

- **Alcance acotado a este port**, no las 8 rutas completas: prioriza `/juegos/<id>` (Detalle) y
  `/juegos/<id>/jugar` (Reproductor) del juego que acabas de identificar en la Fase B.5, más las
  superficies compartidas donde aparece (su tarjeta en `/biblioteca`, el nav en las 8 rutas). Pídele
  que declare en su informe (su propia Fase 7, punto 1) qué cubrió de las 8 rutas y qué quedó
  pendiente, igual que haría en cualquier otra invocación parcial.
- **Una autorización puntual y acotada** que contradice una de sus reglas duras por defecto, así
  que debe quedar inequívoca en el prompt: se le autoriza a añadir **solo** la entrada de este juego
  nuevo en `lib/games/touch-controls.ts` (`TOUCH_CONTROLS`), siguiendo el esquema de las entradas
  existentes, para que el D-pad aparezca en móvil para este juego. Aclara los límites exactos de
  esa autorización: nada más de SPEC 10 cambia — `app/components/touch-controls.tsx` y las entradas
  de los otros juegos siguen intocables salvo regresión real y confirmada, exactamente como dictan
  sus reglas duras. Explícale el porqué: un juego nuevo sin entrada en `TOUCH_CONTROLS` no es una
  regresión de SPEC 10 (SPEC 10 no podía preverlo), es un hueco que este comando le autoriza a
  cerrar explícitamente.
- Si en la Fase B.5 confirmaste que el spec **ya** añadió esa entrada, díselo en el prompt para que
  no la duplique ni la reescriba — solo la verifique.

Al recibir su informe, relévalo al usuario completo: rutas cubiertas, hallazgos con su evidencia,
fix aplicado por cada uno (archivo, selector, breakpoint), confirmación explícita de que los 4
juegos y criterios de aceptación de SPEC 10 siguen intactos, resultado literal de lint/build, y
riesgos o deuda que haya quedado fuera.

## Fase E — Cierre

Resume al usuario, en este orden: spec implementado y rama activa; resultado de los criterios de
aceptación (Fase B.1); qué hizo cada agente (Fases C y D) o por qué la cadena se detuvo antes; y
los pasos manuales que este comando **deliberadamente no hace**: cambiar el `Status:` del spec a
`implementado`, el commit final de ese cambio, el merge a `main`, y borrar la rama `spec-NN-slug`.

## Reglas duras

- **Nunca lances `skin-designer` y `mobile-porter` en el mismo turno/mensaje.** Uno, esperar su
  informe completo, relevarlo, y solo entonces el otro.
- **Nunca copies ni reescribas las fases de `/spec-impl` en este archivo.** Se leen del skill
  instalado en cada ejecución — si diverge de lo que hace `/spec-impl` hoy, es un bug de este
  archivo, no una libertad de diseño.
- **Nunca te saltes la validación de estado aprobado** de la Fase 2 heredada, ni su mensaje de
  error, ni ofrezcas continuar de todos modos.
- **Nunca commitees automáticamente** — ni el trabajo del spec, ni el de los agentes.
- **Nunca lances `mobile-porter` si `skin-designer` no terminó en verde.**
- **No amplíes la autorización de `mobile-porter`** más allá de la única entrada en
  `lib/games/touch-controls.ts` del juego de esta invocación — todo lo demás de SPEC 10 sigue
  fuera de su alcance salvo regresión real.
- **No uses este comando para specs que no sean de port de juego.** Para esos, `/spec-impl` normal
  sigue siendo el camino correcto — los dos agentes de este comando no tendrían objeto.
