// Progresión por nivel de Galaga (`invasores`). A diferencia de
// `lib/games/arkanoid/levels.ts` (5 niveles con un layout de bloques fijo por
// nivel), aquí no hay tope de oleadas: la formación se recrea igual en cada
// nivel (`entities.ts#createFormation`) y solo la dificultad escala, por
// fórmula, sin límite superior — de ahí una función `levelConfig(level)` en
// vez de una tabla `LEVELS[]` fija.
import { TRACTOR_BEAM_CHANCE_PER_DIVE } from "@/lib/games/invasores/entities";

export type LevelConfig = {
  diveIntervalMs: number;
  enemyBulletSpeed: number;
  tractorBeamChance: number;
};

export function levelConfig(level: number): LevelConfig {
  return {
    diveIntervalMs: Math.max(400, 1800 - (level - 1) * 100),
    enemyBulletSpeed: 220 + (level - 1) * 15,
    // El spec no da una fórmula de escalado para esta probabilidad (solo para
    // diveIntervalMs/enemyBulletSpeed) — se mantiene constante por nivel.
    tractorBeamChance: TRACTOR_BEAM_CHANCE_PER_DIVE,
  };
}
