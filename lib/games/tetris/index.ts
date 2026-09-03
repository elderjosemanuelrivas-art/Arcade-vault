import type { EngineFactory } from "@/lib/games/types";
import { TetrisGame } from "@/lib/games/tetris/engine";

const createTetrisGame: EngineFactory = (canvas, callbacks) => new TetrisGame(canvas, callbacks);

export default createTetrisGame;
