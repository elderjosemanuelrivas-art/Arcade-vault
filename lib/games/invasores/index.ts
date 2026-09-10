import type { EngineFactory } from "@/lib/games/types";
import { GalagaGame } from "@/lib/games/invasores/engine";

const createGalagaGame: EngineFactory = (canvas, callbacks) => new GalagaGame(canvas, callbacks);

export default createGalagaGame;
