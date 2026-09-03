import type { EngineFactory } from "@/lib/games/types";
import { ArkanoidGame } from "@/lib/games/arkanoid/engine";

const createArkanoidGame: EngineFactory = (canvas, callbacks) =>
  new ArkanoidGame(canvas, callbacks);

export default createArkanoidGame;
