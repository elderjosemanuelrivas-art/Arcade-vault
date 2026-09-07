export const COLS = 20;
export const ROWS = 15;
export const CELL = 40;

export const INITIAL_LENGTH = 3;
export const SCORE_PER_FRUIT = 10;
export const FRUITS_PER_LEVEL = 5;

export type Point = { x: number; y: number };
export type Direction = "up" | "down" | "left" | "right";
export type GameState = "playing" | "paused" | "gameover";

const DIRECTION_DELTAS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITES: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function isOpposite(a: Direction, b: Direction): boolean {
  return OPPOSITES[a] === b;
}

export function createInitialSnake(): Point[] {
  const headX = 5;
  const headY = 7;
  return Array.from({ length: INITIAL_LENGTH }, (_, i) => ({ x: headX - i, y: headY }));
}

export function advance(snake: Point[], dir: Direction, grow: boolean): Point[] {
  const delta = DIRECTION_DELTAS[dir];
  const head = snake[0];
  const newHead: Point = { x: head.x + delta.x, y: head.y + delta.y };
  const body = grow ? snake : snake.slice(0, -1);
  return [newHead, ...body];
}

export function hitsWall(point: Point): boolean {
  return point.x < 0 || point.x >= COLS || point.y < 0 || point.y >= ROWS;
}

export function hitsSelf(snake: Point[]): boolean {
  const head = snake[0];
  return snake.slice(1).some((seg) => seg.x === head.x && seg.y === head.y);
}

export function pickEmptyCell(snake: Point[], rng: () => number = Math.random): Point {
  let cell: Point;
  do {
    cell = { x: Math.floor(rng() * COLS), y: Math.floor(rng() * ROWS) };
  } while (snake.some((seg) => seg.x === cell.x && seg.y === cell.y));
  return cell;
}
