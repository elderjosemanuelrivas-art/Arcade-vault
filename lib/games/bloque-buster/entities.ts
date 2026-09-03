import type { BlockColor } from "@/lib/games/bloque-buster/sprites";
import type { Level } from "@/lib/games/bloque-buster/levels";

export const PADDLE_SPEED = 400;
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (800 - BLOCK_COLS * BLOCK_W) / 2;
export const BLOCKS_ORIGIN_Y = 80;
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;

export type Paddle = { x: number; y: number; w: number; h: number };
export type Ball = { x: number; y: number; w: number; h: number; vx: number; vy: number };
export type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
};
export type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number;
};

export function initPaddle(canvasWidth: number): Paddle {
  const w = 81;
  const h = 14;
  const y = 560;
  return { x: (canvasWidth - w) / 2, y, w, h };
}

export function initBall(paddle: Paddle, speed: number): Ball {
  const w = 16;
  const h = 16;
  return {
    x: paddle.x + (paddle.w - w) / 2,
    y: paddle.y - h,
    w,
    h,
    vx: BASE_BALL_VX * speed,
    vy: BASE_BALL_VY * speed,
  };
}

export function loadLevel(level: Level): Block[] {
  return level.blocks.map((b) => ({
    x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
    y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
    w: BLOCK_W,
    h: BLOCK_H,
    color: b.color,
    alive: true,
  }));
}

export function collideAABB(ball: Ball, block: Block): boolean {
  return (
    ball.x < block.x + block.w &&
    ball.x + ball.w > block.x &&
    ball.y < block.y + block.h &&
    ball.y + ball.h > block.y
  );
}
