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

_(vacío — la primera entrada la añade `game-planner` en su primera ejecución)_
