import type { EngineFactory } from "@/lib/games/types";
import { AsteroidsGame } from "@/lib/games/asteroids/engine";

const createAsteroidsGame: EngineFactory = (canvas, callbacks) =>
  new AsteroidsGame(canvas, callbacks);

export default createAsteroidsGame;
