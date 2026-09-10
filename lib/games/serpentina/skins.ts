import type { SkinSet } from "@/lib/games/types";

export type SerpentinaPalette = {
  bg: string;
  head: string;
  body: string;
  grid: string;
  // px de ctx.shadowBlur para cabeza/cuerpo/fruta; 0 = sin glow (ruta original, sin ctx.shadow*).
  glow: number;
  // núcleo blanco-caliente pintado encima del relleno cuando glow > 0; null = sin núcleo.
  core: string | null;
};

export const SKINS: SkinSet<SerpentinaPalette> = {
  neon: {
    bg: "#000",
    head: "#ff006e", // --magenta
    body: "#00f5ff", // --cyan
    grid: "rgba(0, 245, 255, 0.18)", // = --line de globals.css
    glow: 18,
    core: "#eaffff",
  },
  retro: {
    bg: "#000",
    head: "#e8c07d",
    body: "#7a5c3e",
    grid: "rgba(122, 92, 62, 0.08)",
    glow: 0,
    core: null,
  },
  clasico: {
    bg: "#000",
    head: "#baffe0",
    body: "#00ff88",
    grid: "rgba(0, 255, 136, 0.08)",
    glow: 0,
    core: null,
  },
};
