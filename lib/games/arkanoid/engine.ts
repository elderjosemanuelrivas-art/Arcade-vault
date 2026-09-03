import type { ArcadeEngine, EngineCallbacks } from "@/lib/games/types";
import {
  Ball,
  Block,
  collideAABB,
  Explosion,
  initBall,
  initPaddle,
  loadLevel,
  Paddle,
  PADDLE_SPEED,
} from "@/lib/games/arkanoid/entities";
import {
  drawFrame,
  drawSprite,
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  loadSpritesheet,
} from "@/lib/games/arkanoid/sprites";
import { LEVELS } from "@/lib/games/arkanoid/levels";

type GameState = "playing" | "gameover";

const PREVENT_DEFAULT_CODES = new Set(["ArrowLeft", "ArrowRight"]);

export class ArkanoidGame implements ArcadeEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly W = 800;
  private readonly H = 600;
  private readonly callbacks: EngineCallbacks;

  private paddle!: Paddle;
  private ball!: Ball;
  private blocks: Block[] = [];
  private explosions: Explosion[] = [];
  private score = 0;
  private lives = 3;
  private level = 1;
  private state: GameState = "playing";
  private paused = false;

  private keys: Record<string, boolean> = {};

  private rafId: number | null = null;
  private lastTime: number | null = null;
  private destroyed = false;

  private lastEmitted = { score: 0, lives: 3, level: 1 };

  private readonly bounceSound: HTMLAudioElement;
  private readonly breakSound: HTMLAudioElement;
  private readonly activeSounds = new Set<HTMLAudioElement>();

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context no disponible");
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.bounceSound = new Audio("/juegos/arkanoid/ball-bounce.mp3");
    this.breakSound = new Audio("/juegos/arkanoid/break-sound.mp3");
    this.initGame();

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    loadSpritesheet(() => {});
    this.rafId = requestAnimationFrame(this.loop);
  }

  pause() {
    if (this.state !== "playing" || this.paused) return;
    this.paused = true;
    this.callbacks.onPause(true);
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.callbacks.onPause(false);
  }

  restart() {
    this.initGame();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);

    for (const audio of this.activeSounds) audio.pause();
    this.activeSounds.clear();
  }

  // ── Input ─────────────────────────────────────────────────────────────
  private handleKeyDown = (e: KeyboardEvent) => {
    if (PREVENT_DEFAULT_CODES.has(e.code)) e.preventDefault();
    this.keys[e.code] = true;

    if (e.code === "KeyP" || e.code === "Escape") {
      if (this.paused) this.resume();
      else this.pause();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (PREVENT_DEFAULT_CODES.has(e.code)) e.preventDefault();
    this.keys[e.code] = false;
  };

  private handleVisibilityChange = () => {
    if (document.hidden) this.pause();
  };

  // ── State ────────────────────────────────────────────────────────────
  private initGame() {
    this.score = 0;
    this.lives = 3;
    this.state = "playing";
    this.paused = false;
    this.paddle = initPaddle(this.W);
    this.loadLevelState(1);
  }

  private loadLevelState(n: number) {
    this.level = n;
    const level = LEVELS[n - 1];
    this.blocks = loadLevel(level);
    this.explosions = [];
    this.ball = initBall(this.paddle, level.speed);
  }

  private playSound(name: "bounce" | "break") {
    const base = name === "bounce" ? this.bounceSound : this.breakSound;
    const clone = base.cloneNode(true) as HTMLAudioElement;
    this.activeSounds.add(clone);
    clone.addEventListener("ended", () => this.activeSounds.delete(clone));
    clone.play().catch(() => {});
  }

  // ── Update ────────────────────────────────────────────────────────────
  private update(dt: number) {
    if (this.state !== "playing") return;

    if (this.keys.ArrowLeft) this.paddle.x = Math.max(0, this.paddle.x - PADDLE_SPEED * dt);
    if (this.keys.ArrowRight)
      this.paddle.x = Math.min(this.W - this.paddle.w, this.paddle.x + PADDLE_SPEED * dt);

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    if (this.ball.x <= 0) {
      this.ball.x = 0;
      this.ball.vx = Math.abs(this.ball.vx);
      this.playSound("bounce");
    }
    if (this.ball.x + this.ball.w >= this.W) {
      this.ball.x = this.W - this.ball.w;
      this.ball.vx = -Math.abs(this.ball.vx);
      this.playSound("bounce");
    }
    if (this.ball.y <= 0) {
      this.ball.y = 0;
      this.ball.vy = Math.abs(this.ball.vy);
      this.playSound("bounce");
    }

    if (
      this.ball.vy > 0 &&
      this.ball.x + this.ball.w > this.paddle.x &&
      this.ball.x < this.paddle.x + this.paddle.w &&
      this.ball.y + this.ball.h >= this.paddle.y &&
      this.ball.y + this.ball.h <= this.paddle.y + this.paddle.h + 8
    ) {
      this.ball.y = this.paddle.y - this.ball.h;
      this.ball.vy = -Math.abs(this.ball.vy);
      this.playSound("bounce");
    }

    for (const block of this.blocks) {
      if (!block.alive) continue;
      if (collideAABB(this.ball, block)) {
        block.alive = false;
        this.explosions.push({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          color: block.color,
          elapsed: 0,
        });
        this.score += 10;
        this.ball.vy = -this.ball.vy;
        this.playSound("break");
        if (this.blocks.every((b) => !b.alive)) {
          if (this.level < 5) {
            this.loadLevelState(this.level + 1);
          } else {
            this.state = "gameover";
            this.callbacks.onGameOver(this.score);
          }
        }
        break;
      }
    }

    for (const exp of this.explosions) exp.elapsed += dt * 1000;
    this.explosions = this.explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    if (this.ball.y > this.H) {
      this.lives--;
      if (this.lives <= 0) {
        this.lives = 0;
        this.state = "gameover";
        this.callbacks.onGameOver(this.score);
      } else {
        this.ball = initBall(this.paddle, LEVELS[this.level - 1].speed);
      }
    }
  }

  // ── Loop ──────────────────────────────────────────────────────────────
  private loop = (ts: number) => {
    if (this.destroyed) return;
    const dt = this.lastTime === null ? 0 : Math.min((ts - this.lastTime) / 1000, 0.05);
    this.lastTime = ts;

    if (!this.paused) {
      this.update(dt);
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
    if (this.lives !== this.lastEmitted.lives) {
      this.lastEmitted.lives = this.lives;
      this.callbacks.onLives(this.lives);
    }
    if (this.level !== this.lastEmitted.level) {
      this.lastEmitted.level = this.level;
      this.callbacks.onLevel(this.level);
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────
  private drawHUD() {
    const ctx = this.ctx;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Score: " + this.score, 10, 10);
    ctx.textAlign = "center";
    ctx.fillText("Nivel: " + this.level, this.W / 2, 10);

    const ballSize = 16;
    const ballSpacing = 4;
    for (let i = 0; i < this.lives; i++) {
      const bx = this.W - 10 - (this.lives - i) * (ballSize + ballSpacing);
      drawSprite(ctx, "ball", bx, 10, ballSize, ballSize);
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.W, this.H);

    for (const block of this.blocks) {
      if (block.alive) drawSprite(ctx, `block_${block.color}`, block.x, block.y, block.w, block.h);
    }

    for (const exp of this.explosions) {
      const frameIndex = Math.min(Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4), 3);
      drawFrame(ctx, EXPLOSION_FRAMES[exp.color][frameIndex], exp.x, exp.y, exp.w, exp.h);
    }

    drawSprite(ctx, "paddle", this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);
    drawSprite(ctx, "ball", this.ball.x, this.ball.y, this.ball.w, this.ball.h);

    this.drawHUD();
  }
}
