import type { ArcadeEngine, EngineCallbacks, EngineOptions } from "@/lib/games/types";
import { DEFAULT_SKIN } from "@/lib/games/types";
import {
  advance,
  CELL,
  COLS,
  createInitialSnake,
  Direction,
  FRUITS_PER_LEVEL,
  GameState,
  hitsSelf,
  hitsWall,
  isOpposite,
  pickEmptyCell,
  Point,
  ROWS,
  SCORE_PER_FRUIT,
} from "@/lib/games/serpentina/entities";
import { drawFruit, loadSpritesheet, randomFruitKey } from "@/lib/games/serpentina/sprites";
import { SKINS, type SerpentinaPalette } from "@/lib/games/serpentina/skins";

type Fruit = { cell: Point; spriteKey: string };

const PREVENT_DEFAULT_CODES = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

export class SnakeGame implements ArcadeEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly W = 800;
  private readonly H = 600;
  private readonly callbacks: EngineCallbacks;
  private readonly p: SerpentinaPalette;

  private snake!: Point[];
  private dir: Direction = "right";
  private pendingDir: Direction = "right";
  private fruit!: Fruit;
  private score = 0;
  private fruitsEaten = 0;
  private level = 1;
  private tickAccum = 0;
  private moveInterval = 150;
  private state: GameState = "playing";
  private stateBeforePause: Exclude<GameState, "paused"> | null = null;

  private rafId: number | null = null;
  private lastTime: number | null = null;
  private destroyed = false;

  private lastEmitted = { score: 0, level: 1 };

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks, options?: EngineOptions) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context no disponible");
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.p = SKINS[options?.skin ?? DEFAULT_SKIN];
    this.initGame();

    window.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    this.callbacks.onLives(0);
    loadSpritesheet(() => {});
    this.rafId = requestAnimationFrame(this.loop);
  }

  pause() {
    if (this.state === "gameover" || this.state === "paused") return;
    this.stateBeforePause = this.state;
    this.state = "paused";
    this.callbacks.onPause(true);
  }

  resume() {
    if (this.state !== "paused") return;
    this.state = this.stateBeforePause ?? "playing";
    this.stateBeforePause = null;
    this.callbacks.onPause(false);
  }

  restart() {
    this.initGame();
    this.stateBeforePause = null;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (PREVENT_DEFAULT_CODES.has(e.code)) e.preventDefault();

    if (e.code === "KeyP" || e.code === "Escape") {
      if (this.state === "paused") this.resume();
      else this.pause();
      return;
    }

    if (this.state !== "playing") return;

    const dir = KEY_DIRECTIONS[e.code];
    if (dir) this.tryTurn(dir);
  };

  private handleVisibilityChange = () => {
    if (document.hidden) this.pause();
  };

  private loop = (ts: number) => {
    if (this.destroyed) return;
    const dt = this.lastTime === null ? 0 : Math.min(ts - this.lastTime, 50);
    this.lastTime = ts;

    if (this.state === "playing") {
      this.tickAccum += dt;
      if (this.tickAccum >= this.moveInterval) {
        this.tickAccum = 0;
        this.step();
      }
      this.emitChanges();
    }

    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private emitChanges() {
    if (this.score !== this.lastEmitted.score) {
      this.lastEmitted.score = this.score;
      this.callbacks.onScore(this.score);
    }
    if (this.level !== this.lastEmitted.level) {
      this.lastEmitted.level = this.level;
      this.callbacks.onLevel(this.level);
    }
  }

  private drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = this.p.grid;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, this.H);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(this.W, r * CELL);
      ctx.stroke();
    }
  }

  private drawSnake() {
    const ctx = this.ctx;
    this.snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? this.p.head : this.p.body;
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }

  private draw() {
    const ctx = this.ctx;
    ctx.fillStyle = this.p.bg;
    ctx.fillRect(0, 0, this.W, this.H);
    this.drawGrid();
    drawFruit(ctx, this.fruit.spriteKey, this.fruit.cell.x * CELL, this.fruit.cell.y * CELL, CELL);
    this.drawSnake();
  }

  private initGame() {
    this.snake = createInitialSnake();
    this.dir = "right";
    this.pendingDir = "right";
    this.score = 0;
    this.fruitsEaten = 0;
    this.level = 1;
    this.tickAccum = 0;
    this.moveInterval = 150;
    this.state = "playing";
    this.lastEmitted = { score: 0, level: 1 };
    this.fruit = this.spawnFruit();
  }

  private spawnFruit(): Fruit {
    return { cell: pickEmptyCell(this.snake), spriteKey: randomFruitKey() };
  }

  private tryTurn(dir: Direction) {
    if (isOpposite(this.dir, dir)) return;
    this.pendingDir = dir;
  }

  private step() {
    this.dir = this.pendingDir;
    const grown = advance(this.snake, this.dir, true);
    const head = grown[0];
    const ateFruit = head.x === this.fruit.cell.x && head.y === this.fruit.cell.y;
    const nextSnake = ateFruit ? grown : grown.slice(0, -1);

    if (hitsWall(head) || hitsSelf(nextSnake)) {
      this.state = "gameover";
      this.callbacks.onGameOver(this.score);
      return;
    }

    this.snake = nextSnake;

    if (ateFruit) {
      this.score += SCORE_PER_FRUIT;
      this.fruitsEaten++;
      this.level = Math.floor(this.fruitsEaten / FRUITS_PER_LEVEL) + 1;
      this.moveInterval = Math.max(60, 150 - (this.level - 1) * 15);
      this.fruit = this.spawnFruit();
    }
  }
}
