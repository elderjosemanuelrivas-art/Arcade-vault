import type { EngineFactory } from "@/lib/games/types";
import { ArkanoidGame } from "@/lib/games/arkanoid/engine";

const createArkanoidGame: EngineFactory = (canvas, callbacks, options) =>
  new ArkanoidGame(canvas, callbacks, options);

export default createArkanoidGame;
