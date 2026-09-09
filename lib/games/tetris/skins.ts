import type { SkinSet } from "@/lib/games/types";

export type TetrisPalette = {
  bg: string;
  grid: string;
  bevel: string;
  panel: string;
  pieces: readonly [null, string, string, string, string, string, string, string, string];
};

export const SKINS: SkinSet<TetrisPalette> = {
  neon: {
    bg: "#000",
    grid: "rgba(0, 240, 255, 0.12)",
    bevel: "rgba(255, 255, 255, 0.25)",
    panel: "#0ff",
    pieces: [
      null,
      "#00f0ff", // I - cyan
      "#faff00", // O - yellow
      "#ff00e6", // T - purple
      "#39ff14", // S - green
      "#ff073a", // Z - red
      "#3d5aff", // J - pale blue
      "#ff8c00", // L - orange
      "#b026ff", // N - tuerca (gris metálico)
    ],
  },
  retro: {
    bg: "#000",
    grid: "rgba(224, 179, 74, 0.08)",
    bevel: "rgba(224, 179, 74, 0.12)",
    panel: "#e0b34a",
    pieces: [
      null,
      "#7ec8c2", // I - cyan
      "#e0b34a", // O - yellow
      "#a06fa0", // T - purple
      "#7fae6b", // S - green
      "#c2665a", // Z - red
      "#6f93ad", // J - pale blue
      "#c98a4b", // L - orange
      "#8a8a7a", // N - tuerca (gris metálico)
    ],
  },
  clasico: {
    bg: "#000",
    grid: "rgba(255,255,255,0.08)",
    bevel: "rgba(255,255,255,0.12)",
    panel: "#fff",
    pieces: [
      null,
      "#4dd0e1", // I - cyan
      "#ffd54f", // O - yellow
      "#ba68c8", // T - purple
      "#81c784", // S - green
      "#e57373", // Z - red
      "#90caf9", // J - pale blue
      "#ffb74d", // L - orange
      "#9e9e9e", // N - tuerca (gris metálico)
    ],
  },
};
