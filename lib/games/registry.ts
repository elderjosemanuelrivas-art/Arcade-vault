import type { EngineFactory } from "@/lib/games/types";

export const GAME_ENGINES: Record<string, () => Promise<{ default: EngineFactory }>> = {
  rocas: () => import("@/lib/games/asteroids"),
  tetris: () => import("@/lib/games/tetris"),
  arkanoid: () => import("@/lib/games/arkanoid"),
  serpentina: () => import("@/lib/games/serpentina"),
  invasores: () => import("@/lib/games/invasores"),
};
