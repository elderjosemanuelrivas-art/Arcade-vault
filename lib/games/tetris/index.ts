import type { EngineFactory } from "@/lib/games/types";
import { TetrisGame } from "@/lib/games/tetris/engine";

const createTetrisGame: EngineFactory = (canvas, callbacks, options) =>
  new TetrisGame(canvas, callbacks, options);

export default createTetrisGame;
