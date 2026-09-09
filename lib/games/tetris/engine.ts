import type { ArcadeEngine, EngineCallbacks, EngineOptions, SkinName } from "@/lib/games/types";
import { DEFAULT_SKIN } from "@/lib/games/types";
import {
  BLOCK,
  Board,
  COLS,
  collide,
  createBoard,
  drawBlock,
  LINE_SCORES,
  Piece,
  randomPiece,
  ROWS,
  rotateCW,
} from "@/lib/games/tetris/entities";
import { SKINS, type TetrisPalette } from "@/lib/games/tetris/skins";

type GameState = "playing" | "paused" | "gameover";

const PREVENT_DEFAULT_CODES = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"]);

const BOARD_X = 30;
const BOARD_Y = 0;
const PANEL_X = 370;
const NEXT_BLOCK = 30;

export class TetrisGame implements ArcadeEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly W = 800;
  private readonly H = 600;
  private readonly callbacks: EngineCallbacks;
  private p: TetrisPalette;

  private board!: Board;
  private current!: Piece;
  private next!: Piece;
  private score = 0;
  private lines = 0;
  private level = 1;
  private dropAccum = 0;
  private dropInterval = 1000;
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

  setSkin(skin: SkinName) {
    this.p = SKINS[skin];
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

  // ── State / piece logic ──────────────────────────────────────────────
  private initGame() {
    this.board = createBoard();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.dropInterval = 1000;
    this.dropAccum = 0;
    this.lastTime = null;
    this.state = "playing";
    this.lastEmitted = { score: 0, level: 1 };
    this.next = randomPiece();
    this.spawn();
  }

  private spawn() {
    this.current = this.next;
    this.next = randomPiece();
    if (collide(this.current.shape, this.board, this.current.x, this.current.y)) {
      this.state = "gameover";
      this.callbacks.onGameOver(this.score);
    }
  }

  private merge() {
    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        if (this.current.shape[r][c])
          this.board[this.current.y + r][this.current.x + c] = this.current.shape[r][c];
  }

  private clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r].every((v) => v !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      this.lines += cleared;
      this.score += (LINE_SCORES[cleared] || 0) * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 90);
    }
  }

  private lockPiece() {
    this.merge();
    this.clearLines();
    this.spawn();
  }

  private tryRotate() {
    const rotated = rotateCW(this.current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(rotated, this.board, this.current.x + kick, this.current.y)) {
        this.current.shape = rotated;
        this.current.x += kick;
        return;
      }
    }
  }

  private ghostY(): number {
    let gy = this.current.y;
    while (!collide(this.current.shape, this.board, this.current.x, gy + 1)) gy++;
    return gy;
  }

  private hardDrop() {
    const gy = this.ghostY();
    this.score += (gy - this.current.y) * 2;
    this.current.y = gy;
    this.lockPiece();
  }

  private softDrop() {
    if (!collide(this.current.shape, this.board, this.current.x, this.current.y + 1)) {
      this.current.y++;
      this.score += 1;
    } else {
      this.lockPiece();
    }
  }

  // ── Loop ──────────────────────────────────────────────────────────────
  private loop = (ts: number) => {
    if (this.destroyed) return;
    const dt = this.lastTime === null ? 0 : Math.min(ts - this.lastTime, 50);
    this.lastTime = ts;

    if (this.state === "playing") {
      this.dropAccum += dt;
      if (this.dropAccum >= this.dropInterval) {
        this.dropAccum = 0;
        if (!collide(this.current.shape, this.board, this.current.x, this.current.y + 1)) {
          this.current.y++;
        } else {
          this.lockPiece();
        }
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

  // ── Input ─────────────────────────────────────────────────────────────
  private handleKeyDown = (e: KeyboardEvent) => {
    if (PREVENT_DEFAULT_CODES.has(e.code)) e.preventDefault();

    if (e.code === "KeyP" || e.code === "Escape") {
      if (this.state === "paused") this.resume();
      else this.pause();
      return;
    }

    if (this.state !== "playing") return;

    switch (e.code) {
      case "ArrowLeft":
        if (!collide(this.current.shape, this.board, this.current.x - 1, this.current.y))
          this.current.x--;
        break;
      case "ArrowRight":
        if (!collide(this.current.shape, this.board, this.current.x + 1, this.current.y))
          this.current.x++;
        break;
      case "ArrowDown":
        this.softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        this.tryRotate();
        break;
      case "Space":
        this.hardDrop();
        break;
    }
  };

  private handleVisibilityChange = () => {
    if (document.hidden) this.pause();
  };

  // ── Draw ──────────────────────────────────────────────────────────────
  private drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = this.p.grid;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(COLS * BLOCK, r * BLOCK);
      ctx.stroke();
    }
  }

  private drawBoard() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(BOARD_X, BOARD_Y);
    this.drawGrid();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(ctx, this.p, c, r, this.board[r][c], BLOCK);

    const gy = this.ghostY();
    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        if (this.current.shape[r][c])
          drawBlock(ctx, this.p, this.current.x + c, gy + r, this.current.shape[r][c], BLOCK, 0.2);

    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        drawBlock(
          ctx,
          this.p,
          this.current.x + c,
          this.current.y + r,
          this.current.shape[r][c],
          BLOCK,
        );

    ctx.restore();
  }

  private drawPanel() {
    const ctx = this.ctx;
    ctx.fillStyle = this.p.panel;
    ctx.font = "15px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE  ${this.score}`, PANEL_X, 30);
    ctx.fillText(`LINES  ${this.lines}`, PANEL_X, 54);
    ctx.fillText(`LEVEL  ${this.level}`, PANEL_X, 78);
    ctx.fillText("NEXT", PANEL_X, 116);

    const shape = this.next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    ctx.save();
    ctx.translate(PANEL_X, 130);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(ctx, this.p, offX + c, offY + r, shape[r][c], NEXT_BLOCK);
    ctx.restore();
  }

  private draw() {
    const ctx = this.ctx;
    ctx.fillStyle = this.p.bg;
    ctx.fillRect(0, 0, this.W, this.H);
    this.drawBoard();
    this.drawPanel();
  }
}
