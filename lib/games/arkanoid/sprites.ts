import type { SkinName } from "@/lib/games/types";
import { SKINS } from "@/lib/games/arkanoid/skins";

export type BlockColor = "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";

type SpriteRect = { sx: number; sy: number; sw: number; sh: number };

export const EXPLOSION_FRAMES: Record<BlockColor, SpriteRect[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

export const EXPLOSION_DURATION = 150;

export const SPRITES: {
  paddle: SpriteRect;
  ball: SpriteRect;
  blocks: Record<BlockColor, SpriteRect>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};

// Caché a nivel de módulo a propósito: es un asset de solo lectura compartido entre
// instancias/restarts, no estado de partida — recargar el módulo dos veces (Strict Mode)
// es idempotente porque loadSpritesheet ya resuelve de inmediato si ssLoaded es true.
// Keyeada por skin: se decodifica el atlas crudo una sola vez (rawImg, compartido) y se
// hornea un canvas por skin bajo demanda (filtro CSS aplicado una única vez al hornear,
// nunca por frame) — bakedAtlases guarda esos canvases horneados por SkinName.
let rawImg: HTMLImageElement | null = null;
let ssLoaded = false;
const bakedAtlases = new Map<SkinName, HTMLCanvasElement>();
const ssCallbacks: (() => void)[] = [];

function bakeAtlas(skin: SkinName): HTMLCanvasElement | null {
  const cached = bakedAtlases.get(skin);
  if (cached) return cached;
  if (!rawImg) return null;
  const oc = document.createElement("canvas");
  oc.width = rawImg.width;
  oc.height = rawImg.height;
  const octx = oc.getContext("2d")!;
  octx.filter = SKINS[skin].atlasFilter;
  octx.drawImage(rawImg, 0, 0);
  bakedAtlases.set(skin, oc);
  return oc;
}

export function loadSpritesheet(skin: SkinName, cb: () => void): void {
  if (ssLoaded) {
    bakeAtlas(skin);
    cb();
    return;
  }
  ssCallbacks.push(cb);
  if (rawImg) return;

  rawImg = new Image();
  rawImg.onload = () => {
    ssLoaded = true;
    bakeAtlas(skin);
    ssCallbacks.forEach((f) => f());
  };
  rawImg.onerror = () => console.error("Failed to load spritesheet");
  rawImg.src = "/juegos/arkanoid/spritesheet-breakout.png";
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  skin: SkinName,
  frame: SpriteRect,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const atlas = ssLoaded ? bakeAtlas(skin) : null;
  if (!atlas) return;
  ctx.drawImage(atlas, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  skin: SkinName,
  name: "paddle" | "ball" | `block_${BlockColor}`,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const atlas = ssLoaded ? bakeAtlas(skin) : null;
  if (!atlas) return;
  const sp = name.startsWith("block_")
    ? SPRITES.blocks[name.slice(6) as BlockColor]
    : SPRITES[name as "paddle" | "ball"];
  if (!sp) return;
  ctx.drawImage(atlas, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
}
