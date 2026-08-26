import type { EngineFactory } from "@/lib/games/types";

export const GAME_ENGINES: Record<string, () => Promise<{ default: EngineFactory }>> = {
  rocas: () => import("@/lib/games/asteroids"),
};
