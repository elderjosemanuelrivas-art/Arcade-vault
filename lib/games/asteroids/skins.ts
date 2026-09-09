import type { SkinSet } from "@/lib/games/types";

export type AsteroidsPalette = {
  bg: string;
  stroke: string;
  hud: string;
  accent: string;
  thrust: string;
  overlayTitle: string;
  overlaySub: string;
  particle: (alpha: number) => string;
  lineWidth: {
    ship: number;
    asteroid: number;
    powerup: number;
    lifeIcon: number;
    particle: number;
  };
};

export const SKINS: SkinSet<AsteroidsPalette> = {
  neon: {
    bg: "#000",
    stroke: "#00f5ff", // --cyan
    hud: "#00f5ff", // --cyan
    accent: "#ff006e", // --magenta
    thrust: "rgba(245, 255, 0, 0.85)", // --yellow
    overlayTitle: "#00f5ff", // --cyan
    overlaySub: "rgba(255, 0, 110, 0.65)", // --magenta
    particle: (alpha) => `rgba(0, 245, 255, ${alpha.toFixed(2)})`,
    lineWidth: {
      ship: 1.5,
      asteroid: 1.5,
      powerup: 2,
      lifeIcon: 1.2,
      particle: 1,
    },
  },
  retro: {
    bg: "#000",
    stroke: "#e8c07d",
    hud: "#e8c07d",
    accent: "#c9a24b",
    thrust: "rgba(201, 130, 40, 0.85)",
    overlayTitle: "#e8c07d",
    overlaySub: "rgba(232,192,125,0.65)",
    particle: (alpha) => `rgba(232,192,125,${alpha.toFixed(2)})`,
    lineWidth: {
      ship: 1.5,
      asteroid: 1.5,
      powerup: 2,
      lifeIcon: 1.2,
      particle: 1,
    },
  },
  clasico: {
    bg: "#000",
    stroke: "#fff",
    hud: "#fff",
    accent: "#0ff",
    thrust: "rgba(255, 130, 0, 0.85)",
    overlayTitle: "#fff",
    overlaySub: "rgba(255,255,255,0.65)",
    particle: (alpha) => `rgba(255,255,255,${alpha.toFixed(2)})`,
    lineWidth: {
      ship: 1.5,
      asteroid: 1.5,
      powerup: 2,
      lifeIcon: 1.2,
      particle: 1,
    },
  },
};
