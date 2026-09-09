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

export const SKIN_NAMES = ["neon", "retro", "clasico"] as const;
export type SkinName = (typeof SKIN_NAMES)[number];
export const DEFAULT_SKIN: SkinName = "clasico";
export type SkinSet<P> = Record<SkinName, P>;
export type EngineOptions = { skin?: SkinName };

export type EngineFactory = (
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  options?: EngineOptions,
) => ArcadeEngine;
