// Physics + tuning constants for "Ooty Bites Dash".
//
// All values are per fixed 1/60 s step. The game loop runs a fixed-timestep
// accumulator (see RunnerGame), so these behave identically on 60 Hz and 144 Hz
// displays — frame-rate independence, rather than assuming rAF fires at 60 fps.

// ─── World ───────────────────────────────────────────────────────────────────
export const CANVAS_W = 900;
export const CANVAS_H = 340;
export const GROUND_Y = CANVAS_H - 62;

// ─── Gravity (three-tier, for a controllable jump arc) ───────────────────────
export const GRAVITY_RISE = 0.62; // ascending, jump released
export const GRAVITY_HOLD = 0.4; // ascending, jump held → floatier, higher
export const GRAVITY_FALL = 0.95; // descending → firm, predictable landing
export const TERMINAL_VELOCITY = 13;

// ─── Jump ────────────────────────────────────────────────────────────────────
// -11 gives: tap ≈ 97 px peak (~32 steps airborne)
//            hold ≈ 151 px peak (~45 steps airborne)
export const JUMP_FORCE = -11;
// A little forward drift on jump so the arc reads as a parabola in screen space
// instead of a flat vertical bounce.
export const JUMP_VX = 1.5;
export const PLAYER_MAX_FORWARD = 52;
export const RETURN_SPEED = 2.0;
// A press up to this many steps before landing still fires on touchdown, so
// chained jumps feel responsive instead of being swallowed.
export const JUMP_BUFFER_STEPS = 12;
export const HURT_STEPS = 80;

// ─── Player ──────────────────────────────────────────────────────────────────
export const PLAYER_W = 34;
export const PLAYER_H = 46;
export const PLAYER_BASE_X = 120;

// Scroll speed of the attract screen behind the title card — slow enough to read
// as ambient motion rather than a run in progress.
export const IDLE_SCROLL = 0.35;

// ─── Speed ramp ──────────────────────────────────────────────────────────────
// ~60 score/sec. Stages are wide early so a new player gets 10+ seconds to learn
// each speed before it steps up.
const SPEED_STAGES: [number, number][] = [
  [0, 3.0],
  [150, 3.5],
  [400, 4.0],
  [750, 4.5],
  [1200, 5.0],
  [1800, 5.5],
  [2600, 6.0],
];

export function getSpeed(score: number): number {
  let speed = SPEED_STAGES[0][1];
  for (const [threshold, s] of SPEED_STAGES) if (score >= threshold) speed = s;
  return speed;
}

// Spacing is no longer a pair of independent random gaps — see spawner.ts,
// where one scheduler emits whole authored chunks whose length is derived from
// the real jump span, so obstacles and pickups can never overlap.

// ─── Collision ───────────────────────────────────────────────────────────────
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Axis-aligned bounding-box overlap test. */
export function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Shrinks a rect inward — a forgiving hitbox smaller than the drawn sprite. */
export function shrink(r: Rect, margin: number): Rect {
  return {
    x: r.x + margin,
    y: r.y + margin,
    width: r.width - margin * 2,
    height: r.height - margin * 2,
  };
}

/** Deterministic pseudo-random in [0,1) — used for seamless scenery tiling. */
export function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

// ─── Jump trajectory ─────────────────────────────────────────────────────────
export interface ArcPoint {
  dx: number; // horizontal distance travelled through the world since take-off
  dy: number; // height above the ground
}

/**
 * Simulates one full (held) jump with the exact same integration the game loop
 * uses, and returns the trajectory in world space.
 *
 * `dx` combines both horizontal motions: the world scrolling left at `speed`
 * AND the player drifting right at `vx`. Relative to a static world object, the
 * player advances by the sum — so placing a collectible at a returned `dx`
 * guarantees the runner passes through it.
 *
 * Used to lay collectibles along the real arc (so a correctly-timed jump sweeps
 * up the whole line) and to locate the apex for obstacle placement.
 */
export function sampleJumpArc(speed: number): ArcPoint[] {
  const pts: ArcPoint[] = [];
  let y = 0; // height above ground (positive up)
  let vy = JUMP_FORCE; // negative = rising (screen coords)
  let vx = JUMP_VX;
  let scrolled = 0;
  let forward = 0;

  for (let t = 0; t < 240; t++) {
    const rising = vy < 0;
    // Assume the jump is held — that's the arc the collectible line teaches.
    vy = Math.min(vy + (rising ? GRAVITY_HOLD : GRAVITY_FALL), TERMINAL_VELOCITY);
    y -= vy; // vy negative while rising → y grows
    scrolled += speed;
    forward = Math.min(forward + vx, PLAYER_MAX_FORWARD);
    vx *= 0.97;
    if (y <= 0) break;
    pts.push({ dx: scrolled + forward, dy: y });
  }
  return pts;
}

/** Index of the arc's highest point. */
export function arcApexIndex(arc: ArcPoint[]): number {
  let best = 0;
  for (let i = 1; i < arc.length; i++) if (arc[i].dy > arc[best].dy) best = i;
  return best;
}
