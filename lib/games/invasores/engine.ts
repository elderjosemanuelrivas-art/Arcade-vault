import type { ArcadeEngine, EngineCallbacks, EngineOptions, SkinName } from "@/lib/games/types";
import { DEFAULT_SKIN } from "@/lib/games/types";
import {
  aabbHit,
  BEAM_ACTIVE_MS,
  BEAM_WIDTH,
  Bullet,
  bezierPoint,
  createFormation,
  DIVE_DURATION_MS,
  Enemy,
  ENEMY_BULLET_FIRE_CHANCE,
  ENEMY_BULLET_H,
  ENEMY_BULLET_W,
  ENEMY_SIZE,
  enemyRect,
  ENTRY_DURATION_MS,
  FIELD_H,
  FIELD_W,
  formationCleared,
  FORMING_HOLD_MS,
  lerp,
  LIVES_START,
  Player,
  PlayerMode,
  playerRect,
  PLAYER_BULLET_H,
  PLAYER_BULLET_SPEED,
  PLAYER_BULLET_W,
  PLAYER_H,
  PLAYER_MAX_X,
  PLAYER_MIN_X,
  PLAYER_SPEED,
  PLAYER_W_DUAL,
  PLAYER_W_SINGLE,
  PLAYER_Y,
  pointInCone,
  rand,
  randInt,
  RESPAWN_DELAY_MS,
  TractorBeam,
} from "@/lib/games/invasores/entities";
import { levelConfig } from "@/lib/games/invasores/levels";
import { SKINS, type InvasoresPalette } from "@/lib/games/invasores/skins";

type WaveState = "entering" | "forming" | "active" | "cleared";
type GameState = "playing" | "paused" | "gameover";

const PREVENT_DEFAULT_CODES = new Set(["ArrowLeft", "ArrowRight", "Space"]);

export class GalagaGame implements ArcadeEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly W = FIELD_W;
  private readonly H = FIELD_H;
  private readonly callbacks: EngineCallbacks;
  private p: InvasoresPalette;

  private formation: Enemy[] = [];
  private playerBullets: Bullet[] = [];
  private enemyBullets: Bullet[] = [];
  private player: Player = { x: FIELD_W / 2, visible: true, respawnElapsed: 0 };
  private playerMode: PlayerMode = "single";

  private score = 0;
  private lives = LIVES_START;
  private level = 1;
  private waveState: WaveState = "entering";
  private formingElapsed = 0;
  private diveTimer = 0;
  private activeBeam: TractorBeam | null = null;

  private state: GameState = "playing";
  private keys: Record<string, boolean> = {};

  private rafId: number | null = null;
  private lastTime: number | null = null;
  private destroyed = false;

  private lastEmitted = { score: 0, lives: LIVES_START, level: 1 };

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks, options?: EngineOptions) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context no disponible");
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.p = SKINS[options?.skin ?? DEFAULT_SKIN];
    this.initGame();

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    this.rafId = requestAnimationFrame(this.loop);
  }

  // ── Ciclo de vida (ArcadeEngine) ─────────────────────────────────────
  pause() {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.callbacks.onPause(true);
  }

  resume() {
    if (this.state !== "paused") return;
    this.state = "playing";
    this.callbacks.onPause(false);
  }

  restart() {
    this.initGame();
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
    window.removeEventListener("keyup", this.handleKeyUp);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
  }

  // ── Input ─────────────────────────────────────────────────────────────
  private readonly handleKeyDown = (e: KeyboardEvent) => {
    if (PREVENT_DEFAULT_CODES.has(e.code)) e.preventDefault();

    if (e.code === "KeyP" || e.code === "Escape") {
      if (this.state === "paused") this.resume();
      else this.pause();
      return;
    }

    this.keys[e.code] = true;

    if (e.code === "Space" && !e.repeat && this.state === "playing") {
      this.firePlayerBullet();
    }
  };

  private readonly handleKeyUp = (e: KeyboardEvent) => {
    if (PREVENT_DEFAULT_CODES.has(e.code)) e.preventDefault();
    this.keys[e.code] = false;
  };

  private readonly handleVisibilityChange = () => {
    if (document.hidden) this.pause();
  };

  private updatePlayerMovement(dt: number) {
    if (!this.player.visible) return;
    let dx = 0;
    if (this.keys.ArrowLeft || this.keys.KeyA) dx -= 1;
    if (this.keys.ArrowRight || this.keys.KeyD) dx += 1;
    if (dx === 0) return;
    this.player.x = Math.max(
      PLAYER_MIN_X,
      Math.min(PLAYER_MAX_X, this.player.x + dx * PLAYER_SPEED * dt),
    );
  }

  private firePlayerBullet() {
    if (!this.player.visible || this.playerBullets.length > 0) return;
    const y = PLAYER_Y - PLAYER_H / 2 - PLAYER_BULLET_H;

    if (this.playerMode === "dual") {
      const offset = PLAYER_W_DUAL / 2 - 8;
      for (const x of [this.player.x - offset, this.player.x + offset]) {
        this.playerBullets.push({
          x: x - PLAYER_BULLET_W / 2,
          y,
          w: PLAYER_BULLET_W,
          h: PLAYER_BULLET_H,
          vx: 0,
          vy: -PLAYER_BULLET_SPEED,
        });
      }
      return;
    }

    this.playerBullets.push({
      x: this.player.x - PLAYER_BULLET_W / 2,
      y,
      w: PLAYER_BULLET_W,
      h: PLAYER_BULLET_H,
      vx: 0,
      vy: -PLAYER_BULLET_SPEED,
    });
  }

  // ── Estado de partida ────────────────────────────────────────────────
  private initGame() {
    this.score = 0;
    this.lives = LIVES_START;
    this.level = 1;
    this.player = { x: this.W / 2, visible: true, respawnElapsed: 0 };
    this.playerMode = "single";
    this.playerBullets = [];
    this.enemyBullets = [];
    this.activeBeam = null;
    this.state = "playing";
    this.lastEmitted = { score: 0, lives: LIVES_START, level: 1 };
    this.spawnWave();
  }

  private spawnWave() {
    this.formation = createFormation();
    this.enemyBullets = [];
    this.waveState = "entering";
    this.formingElapsed = 0;
    this.diveTimer = 0;
    this.activeBeam = null;
  }

  // ── Formación: entrada y reingreso tras un picado sobrevivido ───────
  private updateFormationEntry(dt: number) {
    for (let i = 0; i < this.formation.length; i++) {
      const enemy = this.formation[i];
      if (enemy.dead || (enemy.mode !== "entering" && enemy.mode !== "returning")) continue;

      enemy.entryElapsed += dt;
      if (enemy.entryElapsed < enemy.entryDelay) continue;

      const t = Math.min((enemy.entryElapsed - enemy.entryDelay) / ENTRY_DURATION_MS, 1);
      const pos = lerp(enemy.entryFrom, enemy.cell, t);
      enemy.x = pos.x;
      enemy.y = pos.y;

      if (t >= 1) {
        const wasReturning = enemy.mode === "returning";
        enemy.mode = "formation";
        enemy.x = enemy.cell.x;
        enemy.y = enemy.cell.y;

        // El Boss Galaga, ya de vuelta en su celda tras sobrevivir un
        // picado (no al entrar por primera vez en la oleada), puede
        // disparar el haz tractor — un único haz activo a la vez.
        if (
          wasReturning &&
          enemy.kind === "boss" &&
          !enemy.carryingCaptive &&
          !this.activeBeam &&
          Math.random() < levelConfig(this.level).tractorBeamChance
        ) {
          this.activeBeam = { bossIndex: i, elapsed: 0 };
        }
      }
    }

    if (
      this.waveState === "entering" &&
      this.formation.every((e) => e.dead || e.mode !== "entering")
    ) {
      this.waveState = "forming";
      this.formingElapsed = 0;
    }

    if (this.waveState === "forming") {
      this.formingElapsed += dt;
      if (this.formingElapsed >= FORMING_HOLD_MS) this.waveState = "active";
    }
  }

  // ── Picados ──────────────────────────────────────────────────────────
  private maybeStartDive(dt: number) {
    if (this.waveState !== "active") return;

    this.diveTimer += dt;
    const interval = levelConfig(this.level).diveIntervalMs;
    if (this.diveTimer < interval) return;
    this.diveTimer = 0;

    const candidates = this.formation.filter((e) => !e.dead && e.mode === "formation");
    if (candidates.length === 0) return;

    const enemy = candidates[randInt(0, candidates.length - 1)];
    enemy.mode = "diving";
    enemy.diveElapsed = 0;
    enemy.diveFired = false;
    enemy.diveControl = { x: enemy.cell.x + rand(-220, 220), y: (enemy.cell.y + this.H) / 2 };
    enemy.diveEnd = {
      x: Math.max(20, Math.min(this.W - 20, enemy.cell.x + rand(-160, 160))),
      y: this.H + 60,
    };
  }

  private updateDives(dt: number) {
    const bulletSpeed = levelConfig(this.level).enemyBulletSpeed;

    for (const enemy of this.formation) {
      if (enemy.dead || enemy.mode !== "diving" || !enemy.diveControl || !enemy.diveEnd) continue;

      enemy.diveElapsed += dt;
      const t = Math.min(enemy.diveElapsed / DIVE_DURATION_MS, 1);
      const pos = bezierPoint(enemy.cell, enemy.diveControl, enemy.diveEnd, t);
      enemy.x = pos.x;
      enemy.y = pos.y;

      if (!enemy.diveFired && t >= 0.5) {
        enemy.diveFired = true;
        if (Math.random() < ENEMY_BULLET_FIRE_CHANCE) {
          this.enemyBullets.push({
            x: enemy.x - ENEMY_BULLET_W / 2,
            y: enemy.y,
            w: ENEMY_BULLET_W,
            h: ENEMY_BULLET_H,
            vx: 0,
            vy: bulletSpeed,
          });
        }
      }

      if (t >= 1) {
        // Sobrevivió el picado (no lo destruyó el jugador): reingresa por la
        // MISMA interpolación lineal que la entrada de oleada, reapareciendo
        // fuera del borde superior en su columna.
        enemy.mode = "returning";
        enemy.entryFrom = { x: enemy.cell.x, y: -40 };
        enemy.entryElapsed = 0;
        enemy.entryDelay = 0;
        enemy.diveControl = null;
        enemy.diveEnd = null;
      }
    }
  }

  // ── Haz tractor del Boss Galaga ──────────────────────────────────────
  private updateTractorBeams(dt: number) {
    if (!this.activeBeam) return;
    this.activeBeam.elapsed += dt;
    const boss = this.formation[this.activeBeam.bossIndex];

    if (!boss || boss.dead || this.activeBeam.elapsed >= BEAM_ACTIVE_MS) {
      this.activeBeam = null;
      return;
    }

    if (this.playerMode === "single" && this.player.visible) {
      const point = { x: this.player.x, y: PLAYER_Y };
      if (pointInCone(point, boss.cell, BEAM_WIDTH, this.H - boss.cell.y)) {
        boss.carryingCaptive = true;
        this.activeBeam = null;
        this.loseLife();
      }
    }
  }

  // ── Colisiones que resuelven contra el jugador ───────────────────────
  private checkPlayerHit() {
    if (!this.player.visible) return;
    const rect = playerRect(this.player, this.playerMode);

    let hit = false;
    const remainingEnemyBullets: Bullet[] = [];
    for (const bullet of this.enemyBullets) {
      if (!hit && aabbHit(bullet, rect)) {
        hit = true;
        continue;
      }
      remainingEnemyBullets.push(bullet);
    }
    this.enemyBullets = remainingEnemyBullets;

    if (!hit) {
      for (const enemy of this.formation) {
        if (enemy.dead) continue;
        if (aabbHit(rect, enemyRect(enemy))) {
          // El choque destruye también al enemigo, sin otorgar puntuación
          // (solo los impactos de proyectil puntúan — ver `## Data model`).
          enemy.dead = true;
          hit = true;
          break;
        }
      }
    }

    if (hit) this.applyPlayerHit();
  }

  private applyPlayerHit() {
    if (this.playerMode === "dual") {
      // Perder la nave doble degrada a sencilla sin restar vida.
      this.playerMode = "single";
      return;
    }
    this.loseLife();
  }

  private loseLife() {
    this.lives--;
    this.player.visible = false;
    this.player.respawnElapsed = 0;
    if (this.lives <= 0) {
      this.lives = 0;
      this.state = "gameover";
      this.callbacks.onGameOver(this.score);
    }
  }

  // ── Proyectiles del jugador contra la formación ─────────────────────
  private resolvePlayerBulletHits() {
    const remaining: Bullet[] = [];
    for (const bullet of this.playerBullets) {
      let consumed = false;
      for (const enemy of this.formation) {
        if (enemy.dead) continue;
        if (aabbHit(bullet, enemyRect(enemy))) {
          consumed = true;
          enemy.hp -= 1;
          if (enemy.hp <= 0) {
            enemy.dead = true;
            this.score += enemy.mode === "diving" ? enemy.scoreDiving : enemy.scoreFormation;
            // Rescate: destruir un Boss Galaga que lleva la nave capturada
            // libera al jugador como nave doble. No suma vidas — es potencia
            // de fuego, no una vida extra (ver `## Data model`).
            if (enemy.kind === "boss" && enemy.carryingCaptive) {
              this.playerMode = "dual";
            }
          }
          break;
        }
      }
      if (!consumed) remaining.push(bullet);
    }
    this.playerBullets = remaining;
  }

  // ── Proyectiles: movimiento y descarte fuera de pantalla ─────────────
  private updateBullets(dt: number) {
    this.playerBullets = this.playerBullets
      .map((b) => ({ ...b, x: b.x + b.vx * dt, y: b.y + b.vy * dt }))
      .filter((b) => b.y + b.h > 0);

    this.enemyBullets = this.enemyBullets
      .map((b) => ({ ...b, x: b.x + b.vx * dt, y: b.y + b.vy * dt }))
      .filter((b) => b.y < this.H);
  }

  // ── Reaparición tras perder una nave (impacto directo o captura) ─────
  private updateRespawn(dtMs: number) {
    if (this.player.visible) return;
    this.player.respawnElapsed += dtMs;
    if (this.player.respawnElapsed >= RESPAWN_DELAY_MS) {
      this.player.visible = true;
      this.player.x = this.W / 2;
      // No se fuerza `playerMode = "single"` aquí: `loseLife()` solo se
      // invoca cuando `playerMode` ya es "single" (un impacto en "dual" solo
      // degrada, ver `applyPlayerHit`), así que ya lo es al llegar aquí —
      // salvo que, mientras la nave esperaba reaparecer, un proyectil ya en
      // vuelo antes de la captura rescatara al Boss Galaga que la llevaba
      // (ver `resolvePlayerBulletHits`), dejando `playerMode` en "dual". No
      // pisar ese rescate es intencional.
    }
  }

  // ── Oleada limpia → siguiente nivel ───────────────────────────────────
  private checkWaveCleared() {
    if (this.waveState !== "active" || !formationCleared(this.formation)) return;
    this.waveState = "cleared";
    this.level += 1;
    this.spawnWave();
  }

  // ── Bucle principal ───────────────────────────────────────────────────
  private loop = (ts: number) => {
    if (this.destroyed) return;
    const dt = this.lastTime === null ? 0 : Math.min((ts - this.lastTime) / 1000, 0.05);
    this.lastTime = ts;

    if (this.state === "playing") {
      this.update(dt);
      this.emitChanges();
    }

    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    // Las constantes de balance de este motor son mayormente en ms
    // (ENTRY_DURATION_MS, diveIntervalMs, BEAM_ACTIVE_MS, …) mientras que el
    // movimiento continuo (jugador, proyectiles) es en px/s, como en
    // `arkanoid`/`asteroids` — de ahí la conversión puntual a `dtMs` para los
    // únicos métodos que acumulan tiempo en milisegundos.
    const dtMs = dt * 1000;

    this.updatePlayerMovement(dt);
    this.updateBullets(dt);
    // Orden fijo (ver `## Risks` del spec): proyectil-enemigo primero, para
    // que un Boss Galaga destruido este frame no pueda además reingresar a
    // formación y disparar un haz nuevo en el mismo frame.
    this.resolvePlayerBulletHits();
    this.updateFormationEntry(dtMs);
    this.maybeStartDive(dtMs);
    this.updateDives(dtMs);
    this.updateTractorBeams(dtMs); // haz-jugador
    this.checkPlayerHit(); // jugador-enemigo (+ proyectiles enemigos)
    this.updateRespawn(dtMs);
    this.checkWaveCleared();
  }

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

  // ── Dibujado ──────────────────────────────────────────────────────────
  // Campo de estrellas de fondo: posiciones fijas generadas una sola vez
  // (sin física); el parpadeo se calcula por tiempo + fase en cada frame.
  private readonly stars = Array.from({ length: 90 }, () => ({
    x: rand(0, FIELD_W),
    y: rand(0, FIELD_H),
    size: randInt(1, 2),
    phase: rand(0, Math.PI * 2),
  }));

  private draw() {
    const ctx = this.ctx;
    ctx.fillStyle = this.p.bg;
    ctx.fillRect(0, 0, this.W, this.H);

    this.drawStars();
    this.drawEnemies();
    this.drawBeam();
    this.drawBullets();
    this.drawPlayer();
  }

  private drawStars() {
    const ctx = this.ctx;
    const now = performance.now();
    for (const star of this.stars) {
      const alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(now / 600 + star.phase));
      ctx.fillStyle = this.p.star(alpha);
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
  }

  private drawEnemies() {
    for (const enemy of this.formation) {
      if (enemy.dead) continue;
      if (enemy.kind === "bee") this.drawBee(enemy);
      else if (enemy.kind === "butterfly") this.drawButterfly(enemy);
      else this.drawBoss(enemy);
    }
  }

  private drawBee(enemy: Enemy) {
    const ctx = this.ctx;
    const { w, h } = ENEMY_SIZE.bee;

    if (!this.p.glow) {
      ctx.fillStyle = this.p.bee;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y - h / 2);
      ctx.lineTo(enemy.x + w / 2, enemy.y);
      ctx.lineTo(enemy.x, enemy.y + h / 2);
      ctx.lineTo(enemy.x - w / 2, enemy.y);
      ctx.closePath();
      ctx.fill();
      return;
    }

    ctx.save();
    ctx.shadowColor = this.p.bee;
    ctx.shadowBlur = this.p.glow;
    ctx.fillStyle = this.p.bee;
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y - h / 2);
    ctx.lineTo(enemy.x + w / 2, enemy.y);
    ctx.lineTo(enemy.x, enemy.y + h / 2);
    ctx.lineTo(enemy.x - w / 2, enemy.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawButterfly(enemy: Enemy) {
    const ctx = this.ctx;
    const { w, h } = ENEMY_SIZE.butterfly;

    if (!this.p.glow) {
      ctx.fillStyle = this.p.butterfly;
      ctx.beginPath();
      ctx.moveTo(enemy.x - w / 2, enemy.y + h / 2);
      ctx.lineTo(enemy.x - w / 2, enemy.y - h / 2);
      ctx.lineTo(enemy.x, enemy.y + h / 6);
      ctx.lineTo(enemy.x + w / 2, enemy.y - h / 2);
      ctx.lineTo(enemy.x + w / 2, enemy.y + h / 2);
      ctx.closePath();
      ctx.fill();
      return;
    }

    ctx.save();
    ctx.shadowColor = this.p.butterfly;
    ctx.shadowBlur = this.p.glow;
    ctx.fillStyle = this.p.butterfly;
    ctx.beginPath();
    ctx.moveTo(enemy.x - w / 2, enemy.y + h / 2);
    ctx.lineTo(enemy.x - w / 2, enemy.y - h / 2);
    ctx.lineTo(enemy.x, enemy.y + h / 6);
    ctx.lineTo(enemy.x + w / 2, enemy.y - h / 2);
    ctx.lineTo(enemy.x + w / 2, enemy.y + h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawBoss(enemy: Enemy) {
    const ctx = this.ctx;
    const { w, h } = ENEMY_SIZE.boss;

    if (!this.p.glow) {
      ctx.fillStyle = this.p.boss;
      this.drawHexagon(enemy.x, enemy.y, w / 2, h / 2);

      if (enemy.carryingCaptive) {
        // Segundo hexágono, más pequeño, superpuesto junto al Boss Galaga: la
        // nave capturada del jugador flotando junto a él.
        ctx.fillStyle = this.p.bossCaptive;
        this.drawHexagon(enemy.x + w / 2 + 10, enemy.y, w / 4, h / 4);
      }
      return;
    }

    ctx.save();
    ctx.shadowColor = this.p.boss;
    ctx.shadowBlur = this.p.glow;
    ctx.fillStyle = this.p.boss;
    this.drawHexagon(enemy.x, enemy.y, w / 2, h / 2);

    if (enemy.carryingCaptive) {
      ctx.shadowColor = this.p.bossCaptive;
      ctx.fillStyle = this.p.bossCaptive;
      this.drawHexagon(enemy.x + w / 2 + 10, enemy.y, w / 4, h / 4);
    }
    ctx.restore();
  }

  private drawHexagon(cx: number, cy: number, rx: number, ry: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = cx + Math.cos(angle) * rx;
      const py = cy + Math.sin(angle) * ry;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawBeam() {
    if (!this.activeBeam) return;
    const boss = this.formation[this.activeBeam.bossIndex];
    if (!boss || boss.dead) return;

    const ctx = this.ctx;
    const apex = boss.cell;
    const height = this.H - apex.y;
    ctx.fillStyle = this.p.beam;
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(apex.x - BEAM_WIDTH / 2, apex.y + height);
    ctx.lineTo(apex.x + BEAM_WIDTH / 2, apex.y + height);
    ctx.closePath();
    ctx.fill();
  }

  private drawBullets() {
    const ctx = this.ctx;

    if (!this.p.glow) {
      ctx.fillStyle = this.p.player;
      for (const bullet of this.playerBullets) ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);

      ctx.fillStyle = this.p.bulletEnemy;
      for (const bullet of this.enemyBullets) ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
      return;
    }

    ctx.save();
    ctx.shadowColor = this.p.player;
    ctx.shadowBlur = this.p.glow;
    ctx.fillStyle = this.p.player;
    for (const bullet of this.playerBullets) ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);

    ctx.shadowColor = this.p.bulletEnemy;
    ctx.fillStyle = this.p.bulletEnemy;
    for (const bullet of this.enemyBullets) ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
    ctx.restore();
  }

  private drawPlayer() {
    if (!this.player.visible) return;
    const ctx = this.ctx;

    if (!this.p.glow) {
      ctx.fillStyle = this.p.player;

      if (this.playerMode === "dual") {
        const gap = PLAYER_W_DUAL / 2 - PLAYER_W_SINGLE / 2 - 2;
        this.drawShipTriangle(this.player.x - gap, PLAYER_Y, PLAYER_W_SINGLE, PLAYER_H);
        this.drawShipTriangle(this.player.x + gap, PLAYER_Y, PLAYER_W_SINGLE, PLAYER_H);
        return;
      }

      this.drawShipTriangle(this.player.x, PLAYER_Y, PLAYER_W_SINGLE, PLAYER_H);
      return;
    }

    ctx.save();
    ctx.shadowColor = this.p.player;
    ctx.shadowBlur = this.p.glow;
    ctx.fillStyle = this.p.player;

    if (this.playerMode === "dual") {
      const gap = PLAYER_W_DUAL / 2 - PLAYER_W_SINGLE / 2 - 2;
      this.drawShipTriangle(this.player.x - gap, PLAYER_Y, PLAYER_W_SINGLE, PLAYER_H);
      this.drawShipTriangle(this.player.x + gap, PLAYER_Y, PLAYER_W_SINGLE, PLAYER_H);
      ctx.restore();
      return;
    }

    this.drawShipTriangle(this.player.x, PLAYER_Y, PLAYER_W_SINGLE, PLAYER_H);
    ctx.restore();
  }

  private drawShipTriangle(cx: number, cy: number, w: number, h: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx - w / 2, cy + h / 2);
    ctx.lineTo(cx + w / 2, cy + h / 2);
    ctx.closePath();
    ctx.fill();
  }
}
