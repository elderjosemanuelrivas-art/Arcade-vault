// Tipos, constantes de balance y funciones puras del motor de Galaga (`invasores`).
// Ver specs/11-galaga-captura-y-nave-doble.md — sección `## Data model`.

export type Vec2 = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export const FIELD_W = 800;
export const FIELD_H = 600;

export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

// ── Formación ────────────────────────────────────────────────────────────
export type EnemyKind = "boss" | "butterfly" | "bee";
// "entering": interpolación lineal desde fuera de pantalla hasta la celda.
// "formation": estacionario en su celda, elegible para iniciar un picado.
// "diving": recorriendo la curva de Bézier de picado.
// "returning": reingresando a la celda tras sobrevivir el picado (misma interpolación lineal que "entering").
export type EnemyMode = "entering" | "formation" | "diving" | "returning";

export type Enemy = {
  kind: EnemyKind;
  hp: number;
  scoreFormation: number;
  scoreDiving: number;
  cell: Vec2; // celda de formación (destino en reposo)
  x: number;
  y: number;
  mode: EnemyMode;
  entryDelay: number; // ms antes de empezar a entrar/reingresar (stagger por índice)
  entryElapsed: number; // ms transcurridos en la interpolación activa (entering/returning)
  entryFrom: Vec2; // punto de partida de esa interpolación
  diveElapsed: number; // ms transcurridos en la curva de picado
  diveControl: Vec2 | null;
  diveEnd: Vec2 | null;
  diveFired: boolean; // ya disparó su proyectil en este picado
  carryingCaptive: boolean; // solo relevante para "boss"; lleva la nave capturada del jugador
  dead: boolean;
};

export const ENEMY_STATS: Record<
  EnemyKind,
  { hp: number; scoreFormation: number; scoreDiving: number }
> = {
  boss: { hp: 2, scoreFormation: 150, scoreDiving: 400 },
  butterfly: { hp: 1, scoreFormation: 80, scoreDiving: 160 },
  bee: { hp: 1, scoreFormation: 50, scoreDiving: 100 },
};

// El spec no fija dimensiones de hitbox/dibujado por tipo (solo las del
// jugador y los proyectiles) — se eligen tamaños razonables, consistentes
// entre sí (boss el mayor, bee el menor) y con la separación de columnas
// (70px) y de filas (50px) de la formación.
export const ENEMY_SIZE: Record<EnemyKind, { w: number; h: number }> = {
  boss: { w: 30, h: 24 },
  butterfly: { w: 26, h: 20 },
  bee: { w: 20, h: 16 },
};

export function enemyRect(enemy: Pick<Enemy, "kind" | "x" | "y">): Rect {
  const { w, h } = ENEMY_SIZE[enemy.kind];
  return { x: enemy.x - w / 2, y: enemy.y - h / 2, w, h };
}

export const FORMATION_COLS = 8;
export const FORMATION_ROWS = 5;
export const FORMATION_COL_SPACING = 70; // x = 100..590
export const FORMATION_ROW_SPACING = 50; // y = 80..280
export const FORMATION_X0 = 100;
export const FORMATION_Y0 = 80;
// Fila 0: solo estas dos columnas (0-indexadas) llevan Boss Galaga — son el
// par central exacto de las 8 columnas (100..590), lo que produce la
// formación "centrada" que describe el spec.
export const BOSS_ROW_COLS = [3, 4];

export const ENTRY_DURATION_MS = 1500;
export const ENTRY_STAGGER_MS = 60;
// El spec no da una duración explícita del picado (solo el intervalo entre
// picados nuevos, `diveIntervalMs`, escala por nivel — ver levels.ts). Se fija
// como constante, un poco más ágil que la entrada, y no escala por nivel.
export const DIVE_DURATION_MS = 1300;
// Pausa breve tras que la última nave llega a su celda, antes de que empiecen
// los picados — le da sentido propio al estado de oleada "forming" (distinto
// de "entering") y a que la formación "se estabiliza" (criterio de
// aceptación #3) antes de atacar. No fijado por el spec.
export const FORMING_HOLD_MS = 600;

function kindAt(row: number, col: number): EnemyKind | null {
  if (row === 0) return BOSS_ROW_COLS.includes(col) ? "boss" : null;
  if (row === 1 || row === 2) return "butterfly";
  return "bee";
}

/** Crea las 34 naves de una oleada nueva, todas en modo "entering". */
export function createFormation(): Enemy[] {
  const enemies: Enemy[] = [];
  let index = 0;
  for (let row = 0; row < FORMATION_ROWS; row++) {
    for (let col = 0; col < FORMATION_COLS; col++) {
      const kind = kindAt(row, col);
      if (!kind) continue;
      const stats = ENEMY_STATS[kind];
      const cellX = FORMATION_X0 + col * FORMATION_COL_SPACING;
      const cellY = FORMATION_Y0 + row * FORMATION_ROW_SPACING;
      const entryFrom = { x: cellX, y: -40 };
      enemies.push({
        kind,
        hp: stats.hp,
        scoreFormation: stats.scoreFormation,
        scoreDiving: stats.scoreDiving,
        cell: { x: cellX, y: cellY },
        x: entryFrom.x,
        y: entryFrom.y,
        mode: "entering",
        entryDelay: index * ENTRY_STAGGER_MS,
        entryElapsed: 0,
        entryFrom,
        diveElapsed: 0,
        diveControl: null,
        diveEnd: null,
        diveFired: false,
        carryingCaptive: false,
        dead: false,
      });
      index++;
    }
  }
  return enemies;
}

export function formationCleared(enemies: Enemy[]): boolean {
  return enemies.every((e) => e.dead);
}

// ── Jugador ──────────────────────────────────────────────────────────────
export type PlayerMode = "single" | "dual";

export type Player = {
  x: number;
  visible: boolean; // false mientras espera reaparecer tras perder una nave
  respawnElapsed: number; // ms transcurridos esperando reaparecer (solo si !visible)
};

export const PLAYER_SPEED = 320;
export const PLAYER_Y = 560;
export const PLAYER_MIN_X = 24;
export const PLAYER_MAX_X = 776;
export const PLAYER_W_SINGLE = 32;
export const PLAYER_W_DUAL = 56;
export const PLAYER_H = 24;
export const RESPAWN_DELAY_MS = 1000;
export const LIVES_START = 3;

export function playerWidth(mode: PlayerMode): number {
  return mode === "dual" ? PLAYER_W_DUAL : PLAYER_W_SINGLE;
}

export function playerRect(player: Player, mode: PlayerMode): Rect {
  const w = playerWidth(mode);
  return { x: player.x - w / 2, y: PLAYER_Y - PLAYER_H / 2, w, h: PLAYER_H };
}

// ── Proyectiles ──────────────────────────────────────────────────────────
export type Bullet = Rect & { vx: number; vy: number };

export const PLAYER_BULLET_SPEED = 520;
export const PLAYER_BULLET_W = 4;
export const PLAYER_BULLET_H = 12;

export const ENEMY_BULLET_FIRE_CHANCE = 0.6;
export const ENEMY_BULLET_W = 4;
export const ENEMY_BULLET_H = 10;

// ── Haz tractor del Boss Galaga ──────────────────────────────────────────
export type TractorBeam = {
  bossIndex: number; // índice del boss en el array `formation` que lo dispara
  elapsed: number; // ms transcurridos desde que se activó
};

export const TRACTOR_BEAM_CHANCE_PER_DIVE = 0.15;
export const BEAM_ACTIVE_MS = 900;
export const BEAM_WIDTH = 120;

// ── Geometría pura ───────────────────────────────────────────────────────
/** Punto sobre una curva de Bézier cuadrática en t ∈ [0, 1]. */
export function bezierPoint(p0: Vec2, p1: Vec2, p2: Vec2, t: number): Vec2 {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

/** Colisión rectángulo-rectángulo (AABB), ambos en coordenadas de esquina superior izquierda. */
export function aabbHit(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * ¿`point` cae dentro del cono del haz tractor? El cono tiene su vértice en
 * `apex` (la celda del Boss Galaga), se abre hacia abajo, y alcanza `width`
 * px de ancho en la base, `height` px por debajo del vértice.
 */
export function pointInCone(point: Vec2, apex: Vec2, width: number, height: number): boolean {
  const dy = point.y - apex.y;
  if (dy < 0 || dy > height) return false;
  const halfWidthAtY = (width / 2) * (dy / height);
  return Math.abs(point.x - apex.x) <= halfWidthAtY;
}
