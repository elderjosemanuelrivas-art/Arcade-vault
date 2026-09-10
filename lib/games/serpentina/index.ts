import type { EngineFactory } from "@/lib/games/types";
import { SnakeGame } from "@/lib/games/serpentina/engine";

const createSnakeGame: EngineFactory = (canvas, callbacks, options) =>
  new SnakeGame(canvas, callbacks, options);

export default createSnakeGame;
