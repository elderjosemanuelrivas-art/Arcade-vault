import type { EngineFactory } from "@/lib/games/types";
import { SnakeGame } from "@/lib/games/serpentina/engine";

const createSnakeGame: EngineFactory = (canvas, callbacks) => new SnakeGame(canvas, callbacks);

export default createSnakeGame;
