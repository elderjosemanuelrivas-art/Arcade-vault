# Memoria de `game-jam`

Ledger versionado del agente `game-jam` (`specs/game-jam/AGENT.md`, registrado como subagente por
el stub `.claude/agents/game-jam.md`). Registra qué temas ya se le dieron, qué juego eligió para
cada uno, con qué dos enfoques y en qué quedó cada jam, para que el agente nunca repita un juego ni
un tema entre sesiones.

**No editar a mano salvo para corregir una divergencia puntual** (`**Estado:**`/`**Resultado:**`
de una entrada existente) — las entradas nuevas las añade el propio agente en la Fase 5 de
`specs/game-jam/AGENT.md`. Se commitea junto con el resto del trabajo, como cualquier otro archivo
del repo.

Este ledger es independiente del de `game-planner`
(`.claude/agents/game-planner/memoria.md`) — ese agente solo recomienda un juego, sin escribir
specs. `game-jam` **lee** esa memoria en su Fase 0 para no repetir un juego que ya conste ahí, pero
mantiene su propio registro porque su unidad de trabajo es distinta: un tema con dos specs
completos y excluyentes, no una recomendación.

## Ya implementado (historia de partida, ninguno salió de una jam)

Estos 4 ports existían antes de que `game-jam` existiera — no los eligió él, pero forman su punto
de partida para no proponerlos de nuevo ni ignorarlos al razonar sobre variedad de mecánica.

| Juego     | Slot (`games.id`) | Spec    | Origen                                                           |
| --------- | ----------------- | ------- | ---------------------------------------------------------------- |
| Asteroids | `rocas`           | SPEC 05 | `referencias/started-games/02-asteroids/game.js`                 |
| Tetris    | `tetris`          | SPEC 07 | `referencias/started-games/03-tetris/game.js`                    |
| Arkanoid  | `arkanoid`        | SPEC 08 | `referencias/started-games/04-arkanoid/game.js`                  |
| Snake     | `serpentina`      | SPEC 09 | Desde cero; sprites de `referencias/source-assets/snake-assets/` |

## Registro de jams

### 001 — TEMA «naves y escuadrones alienígenas en formación, estilo Galaga» → GALAGA → `invasores` (2026-09-09)

- **Estado:** promovido, pendiente de aprobación
- **Tema recibido:** literal, "naves y escuadrones alienígenas en formación, estilo Galaga" — con el
  juego ya elegido por decisión explícita del humano (GALAGA), no por deliberación libre de la Fase 2. La Fase 2 se completó igual, íntegra, para dejar constancia escrita de que Galaga gana la
  rúbrica también bajo este tema.
- **Juego elegido:** GALAGA — gana frente a SPACE INVADERS y GALAXIAN (los otros dos candidatos que
  encajan en el tema) por variedad de mecánica (picados individuales con trayectoria curva y
  formación que se arma en vuelo, frente al descenso en bloque de Space Invaders y el subconjunto
  estricto que es Galaxian) y, sobre todo, por ser el único que admite dos diseños genuinamente
  distintos y con código distinto (desempate 5, propio de `game-jam`): la captura por el Boss
  Galaga y la nave doble son opcionales de implementar, y al serlo abren una bifurcación real de
  diseño sobre la semántica de `lives`.
- **Divergencia frente a memoria previa:** ratifica la entrada #005 de `game-planner`
  (GALAGA → `escuadron`, `propuesto`) en cuanto al juego, pero diverge en el slot por decisión
  explícita del humano: usa `invasores` (ya sembrado, sin migración) en vez de `escuadron`
  (`games.id` nuevo, con migración + `.cover-escuadron`). Efecto colateral: la entrada #002 de
  `game-planner` (SPACE INVADERS → `invasores`, `propuesto`) queda sin su slot candidato — sigue
  siendo portable a futuro, pero ya no sobre `invasores` sin migración nueva. No se edita
  `.claude/agents/game-planner/memoria.md` (no es memoria de este agente); ambas entradas (#002 y
  #005) siguen intactas ahí, con esta divergencia documentada solo aquí y en el `## Por qué este
spec existe` de los dos specs de esta jam.
- **Slot:** `invasores` (SHOOTER, green, sort_order 5) — libre, sin migración. Confirmado libre en
  `lib/games/registry.ts` y sembrado en `public.games` con `short: "Defiende el planeta de filas
alienígenas."`, `long: "Olas de pixeles hostiles descienden formación tras formación. Mueve tu
cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie."` — describe a
  Galaga sin forzar nada.
- **Eje de separación:** semántica de vidas — captura de la nave por el Boss Galaga con nave doble
  recuperable (patrón `arkanoid`, vidas no monótonas con estado intermedio) vs. vidas limpias sin
  captura, con impacto = una vida sin excepciones (patrón `tetris`/`serpentina`, más simple). Es el
  mecanismo que de verdad distingue a Galaga de Space Invaders/Galaxian, así que tensiona el diseño
  de este juego en concreto, no uno genérico.
- **Enfoque A:** captura por el Boss Galaga (haz tractor) resta una vida y dispara al jugador; si el
  jugador rescata al capturado destruyendo a ese Boss Galaga, se fusiona en nave doble
  (doble disparo) sin sumar vidas; perder la nave doble degrada a sencilla sin restar vida — máxima
  fidelidad, mayor riesgo de implementación (máquina de estados de 3 fases). · **Enfoque B:** sin
  captura ni nave doble; cualquier impacto resta exactamente una vida, con una breve invulnerabilidad
  tras reaparecer como compensación de diseño — menor riesgo, más simple de validar, sacrifica el
  mecanismo más icónico del original.
- **Specs:** `specs/game-jam/invasores/01-galaga-captura-y-nave-doble.md`,
  `specs/game-jam/invasores/02-galaga-vidas-limpias.md`
- **Descartados esta jam:** SPACE INVADERS (`invasores`, memoria `game-planner` #002) — pasa la
  puerta pero es mecánicamente un subconjunto de lo que aporta Galaga sobre el mismo slot (sin
  picados individuales en curva, sin bifurcación de diseño real); GALAXIAN (id nuevo, no evaluado
  en detalle) — subconjunto estricto de Galaga sin picados coreografiados en curva ni captura,
  además exigiría migración que Galaga no necesita gracias al slot `invasores`.
- **Riesgos:** el humano deberá decidir si prioriza fidelidad Galaga (captura + nave doble, enfoque
  A, mayor riesgo de implementación por la máquina de estados de 3 fases) o un port más simple y
  rápido de validar (enfoque B, sacrifica el mecanismo más icónico); ambos enfoques dejan a Space
  Invaders (memoria `game-planner` #002) sin slot libre sin migración nueva, algo que el humano debe
  tener presente si en el futuro quiere portarlo también.
- **Resultado:** ganó el enfoque A (captura y nave doble). Promovido a
  `specs/11-galaga-captura-y-nave-doble.md` (siguiente número global tras SPEC 10) para poder
  implementarse con `/spec-impl-game` sin colisionar con la numeración local de esta jam. El
  enfoque B (`02-galaga-vidas-limpias.md`) queda en `Status: descartado` — son excluyentes. Falta
  que el humano cambie `Status:` de `specs/11-...` a `aprobado` antes de implementar.
