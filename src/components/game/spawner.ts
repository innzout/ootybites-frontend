// Pattern-based spawning.
//
// Obstacles and collectibles used to spawn on two independent distance timers,
// which let them land on top of each other (a hazard materialising over a
// ground-level pickup = an impossible "collect or dodge" choice, and visually
// broken). Instead, ONE scheduler emits a whole authored chunk at a time and
// then advances by that chunk's full length, so nothing can ever overlap.
//
// Collectible lines are laid along the real jump trajectory (see sampleJumpArc),
// so a correctly-timed jump sweeps up the entire arc — the layout teaches the
// mechanic instead of just decorating it.

import {
  GROUND_Y,
  PLAYER_H,
  arcApexIndex,
  sampleJumpArc,
  type ArcPoint,
} from "./physics";
import { createCollectible, createObstacle, type Collectible, type Obstacle } from "./entities";

export interface Chunk {
  obstacles: Obstacle[];
  collectibles: Collectible[];
  length: number; // world distance to travel before the next chunk spawns
}

// Vertical centre of the runner at a given height above the ground.
function bodyCenterY(heightAboveGround: number): number {
  return GROUND_Y - PLAYER_H / 2 - heightAboveGround;
}

// Clearance so a chunk never begins right on top of the previous one.
function breather(score: number): number {
  return 150 + Math.max(0, 140 - score * 0.05);
}

/** Straight run of pickups at running height — free points, no jump needed. */
function groundLine(x: number, score: number): Chunk {
  const n = 3 + Math.floor(Math.random() * 3);
  const gap = 52;
  const collectibles: Collectible[] = [];
  for (let i = 0; i < n; i++) {
    const c = createCollectible(x + i * gap);
    c.y = GROUND_Y - 46;
    c.isBonus = false;
    c.points = 10;
    collectibles.push(c);
  }
  return { obstacles: [], collectibles, length: n * gap + breather(score) };
}

/** A hazard with a collectible arc arcing over it — jump and you get both. */
function hazardArc(x: number, score: number, speed: number, arc: ArcPoint[]): Chunk {
  const apex = arcApexIndex(arc);
  const obstacle = createObstacle(x + arc[apex].dx);

  // Sample the arc evenly and drop a pickup at each point. Skip the very start
  // and end so nothing sits at ground level right beside the hazard.
  const collectibles: Collectible[] = [];
  const count = 5;
  for (let i = 1; i <= count; i++) {
    const idx = Math.floor((arc.length - 1) * (i / (count + 1)));
    const p = arc[idx];
    if (p.dy < 26) continue; // too low — would read as "on" the obstacle
    const c = createCollectible(x + p.dx);
    c.y = bodyCenterY(p.dy) - c.height / 2;
    c.isBonus = true;
    c.points = 25;
    collectibles.push(c);
  }

  // The chunk spans take-off → landing, plus room to react to what's next.
  const span = arc[arc.length - 1].dx;
  return { obstacles: [obstacle], collectibles, length: span + breather(score) + speed * 20 };
}

/** A bare hazard — pure reaction test. */
function soloHazard(x: number, score: number, speed: number, arc: ArcPoint[]): Chunk {
  const span = arc[arc.length - 1].dx;
  return {
    obstacles: [createObstacle(x + 40)],
    collectibles: [],
    length: span * 0.7 + breather(score) + speed * 16,
  };
}

/** Two hazards spaced so each needs its own jump (never an impossible double). */
function doubleHazard(x: number, score: number, speed: number, arc: ArcPoint[]): Chunk {
  const span = arc[arc.length - 1].dx;
  // Second hazard sits a full jump-span plus landing room after the first.
  const second = span + 120;
  return {
    obstacles: [createObstacle(x + 40), createObstacle(x + 40 + second)],
    collectibles: [],
    length: second + span * 0.7 + breather(score) + speed * 16,
  };
}

/** A floating line at jump height — reward for a well-timed hop. */
function floatLine(x: number, score: number): Chunk {
  const n = 3 + Math.floor(Math.random() * 2);
  const gap = 54;
  const collectibles: Collectible[] = [];
  for (let i = 0; i < n; i++) {
    const c = createCollectible(x + i * gap);
    c.y = bodyCenterY(96) - c.height / 2;
    c.isBonus = true;
    c.points = 25;
    collectibles.push(c);
  }
  return { obstacles: [], collectibles, length: n * gap + breather(score) };
}

/**
 * Picks the next chunk. Early on, hazards are rarer and pickup lines common, so
 * the first ~20 seconds teach the controls before they start testing them.
 */
export function nextChunk(x: number, score: number, speed: number): Chunk {
  const arc = sampleJumpArc(speed);
  const warmup = score < 180;
  const r = Math.random();

  if (warmup) {
    if (r < 0.4) return groundLine(x, score);
    if (r < 0.7) return floatLine(x, score);
    return soloHazard(x, score, speed, arc);
  }
  if (r < 0.26) return hazardArc(x, score, speed, arc);
  if (r < 0.48) return soloHazard(x, score, speed, arc);
  if (r < 0.62 && score > 600) return doubleHazard(x, score, speed, arc);
  if (r < 0.82) return groundLine(x, score);
  return floatLine(x, score);
}
