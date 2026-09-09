import type { SkinSet } from "@/lib/games/types";

// La paleta de este motor no son colores CSS: son píxeles de
// spritesheet-breakout.png. La skin se implementa como un filtro CSS
// horneado una sola vez sobre el atlas offscreen (ver sprites.ts), no como
// PNGs recoloreados por skin ni como ctx.filter aplicado por frame.
export type ArkanoidPalette = {
  bg: string;
  hud: string;
  atlasFilter: string;
};

export const SKINS: SkinSet<ArkanoidPalette> = {
  neon: {
    bg: "#000",
    hud: "#00f5ff", // --cyan
    atlasFilter: "saturate(2.2) hue-rotate(150deg) brightness(1.05)",
  },
  retro: {
    bg: "#000",
    hud: "#e8c07d",
    atlasFilter: "sepia(0.65) hue-rotate(320deg) saturate(1.5) contrast(1.1)",
  },
  clasico: {
    bg: "#000",
    hud: "#fff",
    atlasFilter: "none",
  },
};
