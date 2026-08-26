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

export type EngineFactory = (canvas: HTMLCanvasElement, callbacks: EngineCallbacks) => ArcadeEngine;
