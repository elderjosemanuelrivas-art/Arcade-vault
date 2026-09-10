import type { EngineFactory } from "@/lib/games/types";
import { GalagaGame } from "@/lib/games/invasores/engine";

const createGalagaGame: EngineFactory = (canvas, callbacks, options) =>
  new GalagaGame(canvas, callbacks, options);

export default createGalagaGame;
