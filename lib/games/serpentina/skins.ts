import type { SkinSet } from "@/lib/games/types";

export type SerpentinaPalette = { bg: string; head: string; body: string; grid: string };

export const SKINS: SkinSet<SerpentinaPalette> = {
  neon: {
    bg: "#000",
    head: "#ff2bd6",
    body: "#00e5ff",
    grid: "rgba(255, 43, 214, 0.08)",
  },
  retro: {
    bg: "#000",
    head: "#e8c07d",
    body: "#7a5c3e",
    grid: "rgba(122, 92, 62, 0.08)",
  },
  clasico: {
    bg: "#000",
    head: "#baffe0",
    body: "#00ff88",
    grid: "rgba(0, 255, 136, 0.08)",
  },
};
