import type { SkinSet } from "@/lib/games/types";

export type InvasoresPalette = {
  bg: string;
  star: (alpha: number) => string;
  player: string;
  bee: string;
  butterfly: string;
  boss: string;
  bossCaptive: string;
  beam: string;
  bulletEnemy: string;
  // px de ctx.shadowBlur para nave/enemigos/proyectiles; 0 = sin glow (ruta original, sin ctx.shadow*).
  glow: number;
};

export const SKINS: SkinSet<InvasoresPalette> = {
  neon: {
    bg: "#000",
    star: (alpha) => `rgba(199, 208, 224, ${alpha.toFixed(2)})`, // --silver
    player: "#00f5ff", // --cyan
    bee: "#00ff88", // --green
    butterfly: "#ff006e", // --magenta
    boss: "#f5ff00", // --yellow
    bossCaptive: "#00f5ff", // --cyan (misma nave capturada del jugador)
    beam: "rgba(245, 255, 0, 0.35)", // --yellow
    bulletEnemy: "#ff7700",
    glow: 14,
  },
  retro: {
    bg: "#000",
    star: (alpha) => `rgba(232, 192, 125, ${alpha.toFixed(2)})`,
    player: "#e8c07d",
    bee: "#7fae6b",
    butterfly: "#b06a8f",
    boss: "#e0b34a",
    bossCaptive: "#e8c07d",
    beam: "rgba(201, 130, 40, 0.35)",
    bulletEnemy: "#c2665a",
    glow: 0,
  },
  clasico: {
    bg: "#000",
    star: (alpha) => `rgba(255, 255, 255, ${alpha.toFixed(2)})`,
    player: "#0ff",
    bee: "#3cff6e",
    butterfly: "#ff5fc4",
    boss: "#ffd23c",
    bossCaptive: "#0ff",
    beam: "rgba(255, 210, 60, 0.35)",
    bulletEnemy: "#ff3c3c",
    glow: 0,
  },
};
