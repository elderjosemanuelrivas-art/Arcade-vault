import type { ArcadeEngine, EngineCallbacks } from "@/lib/games/types";
import {
  Asteroid,
  Bullet,
  dist,
  Particle,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  PowerUp,
  rand,
  Ship,
} from "@/lib/games/asteroids/entities";

type GameState = "playing" | "dead" | "gameover" | "paused";

const PREVENT_DEFAULT_CODES = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]);

export class AsteroidsGame implements ArcadeEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly W = 800;
  private readonly H = 600;
  private readonly callbacks: EngineCallbacks;

  private ship!: Ship;
  private bullets: Bullet[] = [];
  private asteroids: Asteroid[] = [];
  private particles: Particle[] = [];
  private powerUps: PowerUp[] = [];
  private score = 0;
  private lives = 3;
  private level = 1;
  private state: GameState = "playing";
  private stateBeforePause: Exclude<GameState, "paused"> | null = null;
  private deadTimer = 0;
  private powerUpSpawned = false;
  private killsSinceSpawn = 0;

  private keys: Record<string, boolean> = {};
  private justPressed: Record<string, boolean> = {};

  private rafId: number | null = null;
  private lastTime: number | null = null;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context no disponible");
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.initGame();

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    this.rafId = requestAnimationFrame(this.loop);
  }

  pause() {
    if (this.state === "paused") return;
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
    window.removeEventListener("keyup", this.handleKeyUp);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
  }

  private pressed(code: string): boolean {
    const val = !!this.justPressed[code];
    this.justPressed[code] = false;
    return val;
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (PREVENT_DEFAULT_CODES.has(e.code)) e.preventDefault();

    if (!this.keys[e.code]) this.justPressed[e.code] = true;
    this.keys[e.code] = true;

    if (e.code === "KeyP" || e.code === "Escape") {
      if (this.state === "paused") this.resume();
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

  private loop = (ts: number) => {
    if (this.destroyed) return;
    const dt = this.lastTime === null ? 0 : Math.min((ts - this.lastTime) / 1000, 0.05);
    this.lastTime = ts;
    if (this.state !== "paused") {
      this.update(dt);
      this.emitChanges();
    }
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private lastEmitted = { score: 0, lives: 3, level: 1 };

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

  private spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      do {
        x = rand(0, this.W);
        y = rand(0, this.H);
      } while (Math.hypot(x - this.W / 2, y - this.H / 2) < SAFE_DIST);
      this.asteroids.push(new Asteroid(x, y, 3));
    }
  }

  private initGame() {
    this.ship = new Ship(this.W, this.H);
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.powerUps = [];
    this.powerUpSpawned = false;
    this.killsSinceSpawn = 0;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.state = "playing";
    this.spawnAsteroids(4);
  }

  private nextLevel() {
    this.level++;
    this.bullets = [];
    this.particles = [];
    this.powerUps = [];
    this.powerUpSpawned = false;
    this.killsSinceSpawn = 0;
    this.ship.reset();
    this.spawnAsteroids(3 + this.level);
  }

  private explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) this.particles.push(new Particle(x, y));
  }

  private killShip() {
    this.explode(this.ship.x, this.ship.y, 14);
    this.ship.dead = true;
    this.lives--;
    if (this.lives <= 0) {
      this.state = "gameover";
      this.callbacks.onGameOver(this.score);
    } else {
      this.state = "dead";
      this.deadTimer = 2;
    }
  }

  // ── Update ────────────────────────────────────────────────────────────
  private update(dt: number) {
    if (this.state === "gameover") {
      if (this.pressed("Space")) this.restart();
      this.particles.forEach((p) => p.update(dt));
      this.particles = this.particles.filter((p) => !p.dead);
      return;
    }

    if (this.state === "dead") {
      this.deadTimer -= dt;
      this.particles.forEach((p) => p.update(dt));
      this.particles = this.particles.filter((p) => !p.dead);
      this.asteroids.forEach((a) => a.update(dt, this.W, this.H));
      if (this.deadTimer <= 0) {
        this.state = "playing";
        this.ship.reset();
      }
      return;
    }

    // Disparar
    if (this.pressed("Space")) {
      this.bullets.push(...this.ship.tryShoot());
    }

    this.ship.update(dt, this.keys);
    this.bullets.forEach((b) => b.update(dt, this.W, this.H));
    this.asteroids.forEach((a) => a.update(dt, this.W, this.H));
    this.particles.forEach((p) => p.update(dt));
    this.powerUps.forEach((p) => p.update(dt, this.W, this.H));

    this.bullets = this.bullets.filter((b) => !b.dead);
    this.particles = this.particles.filter((p) => !p.dead);
    this.powerUps = this.powerUps.filter((p) => !p.dead);

    for (const p of this.powerUps) {
      if (!p.dead && dist(this.ship, p) < this.ship.radius + p.radius) {
        p.dead = true;
        this.ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of this.bullets) {
      for (const a of this.asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          this.score += POINTS[a.size];
          this.explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!this.powerUpSpawned) {
            this.killsSinceSpawn++;
            const guaranteed = this.killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              this.powerUps.push(new PowerUp(a.x, a.y));
              this.powerUpSpawned = true;
            }
          }
        }
      }
    }
    this.asteroids = this.asteroids.filter((a) => !a.dead).concat(newAsteroids);
    this.bullets = this.bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (this.ship.invincible <= 0) {
      for (const a of this.asteroids) {
        if (dist(this.ship, a) < this.ship.radius + a.radius * 0.82) {
          this.killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (this.asteroids.length === 0) this.nextLevel();
  }

  // ── Draw ──────────────────────────────────────────────────────────────
  private drawLifeIcon(x: number, y: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  private drawHUD() {
    const ctx = this.ctx;
    ctx.fillStyle = "#fff";
    ctx.font = "15px monospace";

    ctx.textAlign = "left";
    ctx.fillText(`SCORE  ${this.score}`, 14, 26);

    ctx.textAlign = "center";
    ctx.fillText(`NIVEL ${this.level}`, this.W / 2, 26);

    for (let i = 0; i < this.lives; i++) this.drawLifeIcon(this.W - 16 - i * 22, 18);

    if (this.ship.tripleShot > 0) {
      ctx.textAlign = "left";
      ctx.fillStyle = "#0ff";
      ctx.fillText(`3x  ${this.ship.tripleShot.toFixed(1)}s`, 14, 46);
    }
  }

  private drawOverlay(title: string, sub: string) {
    const ctx = this.ctx;
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 46px monospace";
    ctx.fillText(title, this.W / 2, this.H / 2 - 18);
    ctx.font = "18px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText(sub, this.W / 2, this.H / 2 + 22);
  }

  private draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.W, this.H);

    this.particles.forEach((p) => p.draw(ctx));
    this.asteroids.forEach((a) => a.draw(ctx));
    this.powerUps.forEach((p) => p.draw(ctx));
    this.bullets.forEach((b) => b.draw(ctx));
    this.ship.draw(ctx);

    this.drawHUD();

    if (this.state === "gameover")
      this.drawOverlay("GAME OVER", `PUNTAJE: ${this.score}   —   ESPACIO PARA REINICIAR`);
  }
}
