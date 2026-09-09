import type { EngineFactory } from "@/lib/games/types";
import { AsteroidsGame } from "@/lib/games/asteroids/engine";

const createAsteroidsGame: EngineFactory = (canvas, callbacks, options) =>
  new AsteroidsGame(canvas, callbacks, options);

export default createAsteroidsGame;
