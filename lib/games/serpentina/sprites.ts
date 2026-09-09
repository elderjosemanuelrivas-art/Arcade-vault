type SpriteRect = { x: number; y: number; w: number; h: number };

// Coordenadas portadas de referencias/source-assets/snake-assets/.../sprites.js
// (window.SPRITE_ATLAS.fruits), recortadas sobre fruits.png (3790x442, fondo transparente).
export const FRUIT_ATLAS: Record<string, SpriteRect> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
};

export const FRUIT_KEYS = Object.keys(FRUIT_ATLAS);

export function randomFruitKey(rng: () => number = Math.random): string {
  return FRUIT_KEYS[Math.floor(rng() * FRUIT_KEYS.length)];
}

// Caché a nivel de módulo a propósito: es un asset de solo lectura compartido entre
// instancias/restarts, no estado de partida — recargar el módulo dos veces (Strict Mode)
// es idempotente porque loadSpritesheet ya resuelve de inmediato si ssLoaded es true.
let ssImg: HTMLImageElement | null = null;
let ssLoaded = false;
const ssCallbacks: (() => void)[] = [];

export function loadSpritesheet(cb: () => void): void {
  if (ssLoaded) {
    cb();
    return;
  }
  ssCallbacks.push(cb);
  if (ssImg) return;

  const img = new Image();
  img.onload = () => {
    ssImg = img;
    ssLoaded = true;
    ssCallbacks.forEach((f) => f());
  };
  img.onerror = () => console.error("Failed to load fruits spritesheet");
  img.src = "/juegos/serpentina/fruits.png";
}

export function drawFruit(
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number,
  y: number,
  size: number,
  glow = 0,
  glowColor = "",
): void {
  if (!ssLoaded || !ssImg) return;
  const rect = FRUIT_ATLAS[key];
  if (!rect) return;
  if (!glow) {
    ctx.drawImage(ssImg, rect.x, rect.y, rect.w, rect.h, x, y, size, size);
    return;
  }
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = glow;
  ctx.drawImage(ssImg, rect.x, rect.y, rect.w, rect.h, x, y, size, size);
  ctx.restore();
}
