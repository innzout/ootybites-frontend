// Rendering for "Ooty Bites Dash".
//
// PERFORMANCE: every static/periodic layer is pre-rendered once into an
// offscreen canvas and then blitted with drawImage. Rebuilding the scenery with
// live paths each frame cost ~1000 path ops + a handful of gradient allocations
// per frame, which is what made the game stutter. Now a frame is ~10 blits plus
// the runner. Scenery tiles are periodic, so tiling them is seamless.

import { CANVAS_H, CANVAS_W, GROUND_Y, hash } from "./physics";
import type { Obstacle, ObstacleType, CollectibleType } from "./entities";
import { COLLECTIBLE_CONFIG } from "./entities";
import { PRODUCT_SPRITE_SIZE, buildProductSprite } from "./sprites";

// ─── Palette ─────────────────────────────────────────────────────────────────
const HILL_FAR = "#a9cdba";
const HILL_MID = "#7db698";
const HILL_NEAR = "#4f9271";

const UNIFORM = "#22ab5f";
const UNIFORM_DARK = "#166b3d";
const SKIN = "#f0c092";
const SKIN_DARK = "#d9a173";
const BOX = "#d98324";
const BOX_DARK = "#b05f12";
const SHOE = "#14301f";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Periodic hill silhouette: integer sine harmonics over `period`, so the value
// at x == the value at x+period and the tile repeats without a seam.
function hillY(x: number, period: number, baseY: number, amp: number, phase: number): number {
  const t = (x / period) * Math.PI * 2;
  const n =
    0.5 +
    0.3 * Math.sin(t + phase) +
    0.15 * Math.sin(t * 2 + phase * 1.7) +
    0.05 * Math.sin(t * 3 + phase * 2.3);
  return baseY - n * amp;
}

/** Allocates an offscreen canvas sized in logical units but backed at `dpr`. */
function makeTile(w: number, h: number, dpr: number) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w * dpr);
  c.height = Math.ceil(h * dpr);
  const ctx = c.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas: c, ctx };
}

export interface Renderer {
  drawBackdrop(ctx: CanvasRenderingContext2D, scroll: number, frame: number): void;
  drawGround(ctx: CanvasRenderingContext2D, scroll: number): void;
  drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle): void;
  drawCollectible(
    ctx: CanvasRenderingContext2D,
    type: CollectibleType,
    cx: number,
    cy: number,
    scale: number,
    bonus: boolean,
    spin?: number,
  ): void;
}

export function createRenderer(dpr: number): Renderer {
  // ── Sky + sun (fully static → one full-canvas tile) ──
  const sky = makeTile(CANVAS_W, CANVAS_H, dpr);
  {
    const c = sky.ctx;
    const g = c.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, "#bfe0ef");
    g.addColorStop(0.55, "#dff0e6");
    g.addColorStop(1, "#f3f7ee");
    c.fillStyle = g;
    c.fillRect(0, 0, CANVAS_W, GROUND_Y);

    const sunX = CANVAS_W * 0.78;
    const sunY = 62;
    const glow = c.createRadialGradient(sunX, sunY, 8, sunX, sunY, 110);
    glow.addColorStop(0, "rgba(255,244,214,0.95)");
    glow.addColorStop(0.35, "rgba(255,236,186,0.35)");
    glow.addColorStop(1, "rgba(255,236,186,0)");
    c.fillStyle = glow;
    c.fillRect(sunX - 120, sunY - 120, 240, 240);
    c.fillStyle = "#fff6dc";
    c.beginPath();
    c.arc(sunX, sunY, 26, 0, Math.PI * 2);
    c.fill();
  }

  // ── Parallax hill tiles ──
  function hillTile(period: number, baseY: number, amp: number, color: string, phase: number, terraces: boolean) {
    const t = makeTile(period, CANVAS_H, dpr);
    const c = t.ctx;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, CANVAS_H);
    for (let x = 0; x <= period; x += 6) c.lineTo(x, hillY(x, period, baseY, amp, phase));
    c.lineTo(period, CANVAS_H);
    c.closePath();
    c.fill();

    if (terraces) {
      // Tea-terrace contour lines — the signature Nilgiri estate look.
      c.strokeStyle = "rgba(255,255,255,0.14)";
      c.lineWidth = 1.5;
      for (let band = 1; band <= 4; band++) {
        const drop = band * 11;
        c.beginPath();
        let started = false;
        for (let x = 0; x <= period; x += 8) {
          const y = hillY(x, period, baseY, amp, phase) + drop;
          if (y > GROUND_Y) {
            started = false;
            continue;
          }
          if (!started) {
            c.moveTo(x, y);
            started = true;
          } else c.lineTo(x, y);
        }
        c.stroke();
      }
    }
    return t.canvas;
  }

  const FAR_P = 620;
  const MID_P = 470;
  const NEAR_P = 360;
  const BUSH_P = 150;
  const GROUND_P = 276; // 3 × the 92px dash period, so dashes align across tiles

  const farTile = hillTile(FAR_P, GROUND_Y - 6, 120, HILL_FAR, 0.6, false);
  const midTile = hillTile(MID_P, GROUND_Y + 4, 92, HILL_MID, 2.1, false);
  const nearTile = hillTile(NEAR_P, GROUND_Y + 14, 66, HILL_NEAR, 4.4, true);

  // ── Mist band between the mid and near ridges (static, alpha) ──
  const mist = makeTile(CANVAS_W, CANVAS_H, dpr);
  {
    const c = mist.ctx;
    const g = c.createLinearGradient(0, GROUND_Y - 96, 0, GROUND_Y - 16);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.6, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, GROUND_Y - 96, CANVAS_W, 80);
  }

  // ── Tea bushes (fastest scenery layer — sells the speed) ──
  const bushTile = (() => {
    const t = makeTile(BUSH_P, CANVAS_H, dpr);
    const c = t.ctx;
    for (let i = 0; i < 2; i++) {
      const r = 16 + hash(i * 3.7) * 12;
      const bx = 20 + i * 74 + hash(i + 7) * 20;
      const by = GROUND_Y - 2;
      c.fillStyle = "#2f7a52";
      c.beginPath();
      c.ellipse(bx, by, r, r * 0.72, 0, Math.PI, 0);
      c.fill();
      c.fillStyle = "rgba(87,215,142,0.5)";
      c.beginPath();
      c.ellipse(bx - r * 0.25, by - r * 0.2, r * 0.42, r * 0.3, 0, Math.PI, 0);
      c.fill();
    }
    return t.canvas;
  })();

  // ── Ground strip ──
  const groundTile = (() => {
    const h = CANVAS_H - GROUND_Y;
    const t = makeTile(GROUND_P, h, dpr);
    const c = t.ctx;
    c.fillStyle = "#3f8a5e";
    c.fillRect(0, 0, GROUND_P, h);
    c.fillStyle = "#57d78e";
    c.fillRect(0, 0, GROUND_P, 5);
    const soil = c.createLinearGradient(0, 5, 0, h);
    soil.addColorStop(0, "#a9753f");
    soil.addColorStop(1, "#8a5f34");
    c.fillStyle = soil;
    c.fillRect(0, 12, GROUND_P, h - 12);
    c.fillStyle = "rgba(255,255,255,0.32)";
    for (let i = 0; i < 3; i++) c.fillRect(i * 92, 22, 44, 3);
    c.fillStyle = "rgba(0,0,0,0.10)";
    for (let i = 0; i < 14; i++) {
      c.fillRect(hash(i * 1.7) * GROUND_P, 32 + hash(i + 5) * 18, 3, 3);
    }
    return t.canvas;
  })();

  // ── Obstacle sprites (pre-rendered — no per-frame gradients) ──
  const obstacleSprites: Partial<Record<ObstacleType, HTMLCanvasElement>> = {};
  function buildObstacle(type: ObstacleType, w: number, h: number) {
    const pad = 8;
    const t = makeTile(w + pad * 2, h + pad * 2, dpr);
    const c = t.ctx;
    c.translate(pad, pad);
    c.fillStyle = "rgba(20,48,31,0.18)";
    c.beginPath();
    c.ellipse(w / 2, h + 2, w * 0.5, 4, 0, 0, Math.PI * 2);
    c.fill();

    if (type === "rock") {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#8d9a92");
      g.addColorStop(1, "#5c6b63");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(w * 0.08, h);
      c.lineTo(w * 0.22, h * 0.3);
      c.lineTo(w * 0.5, h * 0.04);
      c.lineTo(w * 0.8, h * 0.34);
      c.lineTo(w * 0.94, h);
      c.closePath();
      c.fill();
      c.fillStyle = "rgba(255,255,255,0.22)";
      c.beginPath();
      c.moveTo(w * 0.5, h * 0.06);
      c.lineTo(w * 0.78, h * 0.36);
      c.lineTo(w * 0.56, h * 0.5);
      c.closePath();
      c.fill();
    } else if (type === "log") {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#b07a45");
      g.addColorStop(1, "#7d5330");
      c.fillStyle = g;
      roundRect(c, 0, 0, w, h, h / 2);
      c.fill();
      c.fillStyle = "#c9a074";
      c.beginPath();
      c.ellipse(w - h / 2, h / 2, h * 0.28, h / 2 - 1, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "rgba(90,58,32,0.6)";
      c.lineWidth = 1.4;
      c.beginPath();
      c.ellipse(w - h / 2, h / 2, h * 0.15, h * 0.26, 0, 0, Math.PI * 2);
      c.stroke();
    } else {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#c79a5e");
      g.addColorStop(1, "#9a6f3c");
      c.fillStyle = g;
      roundRect(c, 0, 0, w, h, 3);
      c.fill();
      c.strokeStyle = "rgba(90,58,32,0.55)";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(0, h * 0.33);
      c.lineTo(w, h * 0.33);
      c.moveTo(0, h * 0.67);
      c.lineTo(w, h * 0.67);
      c.stroke();
      c.strokeStyle = "rgba(34,171,95,0.85)";
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(w * 0.5, h * 0.3);
      c.lineTo(w * 0.5, h * 0.7);
      c.stroke();
    }
    return t.canvas;
  }

  // ── Collectible sprites — custom vector product art, rasterised once each ──
  const SPRITE = PRODUCT_SPRITE_SIZE;
  const collectibleSprites: Partial<Record<CollectibleType, HTMLCanvasElement>> = {};
  (Object.keys(COLLECTIBLE_CONFIG) as CollectibleType[]).forEach((k) => {
    collectibleSprites[k] = buildProductSprite(k, dpr);
  });

  // Bonus marker: a crisp dashed ring rather than a soft radial blob. The blob
  // read as an opaque smudge behind the item; a ring keeps the product readable
  // and clearly says "this one is worth more".
  const halo = (() => {
    const s = 52;
    const t = makeTile(s, s, dpr);
    const c = t.ctx;
    c.translate(s / 2, s / 2);
    const glow = c.createRadialGradient(0, 0, 12, 0, 0, s / 2);
    glow.addColorStop(0, "rgba(246,216,115,0)");
    glow.addColorStop(0.72, "rgba(246,216,115,0.30)");
    glow.addColorStop(1, "rgba(246,216,115,0)");
    c.fillStyle = glow;
    c.fillRect(-s / 2, -s / 2, s, s);
    c.strokeStyle = "rgba(217,131,36,0.85)";
    c.lineWidth = 2;
    c.setLineDash([4, 4]);
    c.beginPath();
    c.arc(0, 0, s / 2 - 5, 0, Math.PI * 2);
    c.stroke();
    return t.canvas;
  })();

  function blit(
    ctx: CanvasRenderingContext2D,
    tile: HTMLCanvasElement,
    period: number,
    offset: number,
    y = 0,
    h = CANVAS_H,
  ) {
    let x = -(offset % period);
    if (x > 0) x -= period;
    for (; x < CANVAS_W; x += period) ctx.drawImage(tile, x, y, period, h);
  }

  return {
    drawBackdrop(ctx, scroll, frame) {
      ctx.drawImage(sky.canvas, 0, 0, CANVAS_W, CANVAS_H);

      // Clouds — few enough that live drawing is cheap, and they drift
      // independently of the world scroll.
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      for (let i = 0; i < 4; i++) {
        const w = 24 + hash(i * 5.1) * 18;
        const cx = ((frame * (0.09 + i * 0.02) + i * 240) % (CANVAS_W + 200)) - 100;
        const cy = 38 + hash(i + 2) * 52;
        ctx.beginPath();
        ctx.ellipse(cx, cy, w, w * 0.42, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - w * 0.5, cy + 5, w * 0.6, w * 0.3, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + w * 0.5, cy + 4, w * 0.55, w * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      blit(ctx, farTile, FAR_P, scroll * 0.12);
      blit(ctx, midTile, MID_P, scroll * 0.26);
      ctx.drawImage(mist.canvas, 0, 0, CANVAS_W, CANVAS_H);
      blit(ctx, nearTile, NEAR_P, scroll * 0.46);

      // Birds
      ctx.strokeStyle = "rgba(60,90,75,0.35)";
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) {
        const bx = ((frame * 0.35 + i * 260) % (CANVAS_W + 120)) - 60;
        const by = 54 + i * 17 + Math.sin(frame * 0.03 + i) * 4;
        ctx.beginPath();
        ctx.moveTo(bx - 5, by);
        ctx.quadraticCurveTo(bx, by - 3.5, bx + 5, by);
        ctx.stroke();
      }

      blit(ctx, bushTile, BUSH_P, scroll * 0.85);
    },

    drawGround(ctx, scroll) {
      blit(ctx, groundTile, GROUND_P, scroll, GROUND_Y, CANVAS_H - GROUND_Y);
    },

    drawObstacle(ctx, o) {
      let sprite = obstacleSprites[o.type];
      if (!sprite) {
        sprite = buildObstacle(o.type, o.width, o.height);
        obstacleSprites[o.type] = sprite;
      }
      const pad = 8;
      ctx.drawImage(sprite, o.x - pad, o.y - pad, o.width + pad * 2, o.height + pad * 2);
    },

    drawCollectible(ctx, type, cx, cy, scale, bonus, spin = 0) {
      if (bonus) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(spin); // the ring turns slowly — draws the eye upward
        ctx.drawImage(halo, -26, -26, 52, 52);
        ctx.restore();
      }
      const s = SPRITE * scale;
      ctx.drawImage(collectibleSprites[type]!, cx - s / 2, cy - s / 2, s, s);
    },
  };
}

// ─── The delivery rider ──────────────────────────────────────────────────────
export interface RunnerPose {
  cx: number;
  feetY: number;
  w: number;
  h: number;
  runPhase: number;
  grounded: boolean;
  vy: number;
  squash: number;
}

/** A two-segment limb (thigh+calf / upper+forearm) with an optional shoe. */
function limb(
  ctx: CanvasRenderingContext2D,
  pivotY: number,
  a1: number,
  a2: number,
  l1: number,
  l2: number,
  t1: number,
  t2: number,
  color: string,
  shoe = false,
) {
  ctx.save();
  ctx.translate(0, pivotY);
  ctx.rotate(a1);
  ctx.fillStyle = color;
  roundRect(ctx, -t1 / 2, 0, t1, l1, t1 / 2);
  ctx.fill();
  ctx.translate(0, l1);
  ctx.rotate(a2);
  roundRect(ctx, -t2 / 2, 0, t2, l2, t2 / 2);
  ctx.fill();
  if (shoe) {
    ctx.translate(0, l2);
    ctx.fillStyle = SHOE;
    roundRect(ctx, -t2 * 0.55, -t2 * 0.2, t2 * 1.9, t2 * 0.95, t2 * 0.4);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * The Ootybites delivery rider: green uniform, cap, and an amber delivery box
 * on the back. Drawn back-to-front so the far-side limbs sit behind the torso.
 */
export function drawRunner(ctx: CanvasRenderingContext2D, p: RunnerPose, frame: number) {
  const { cx, feetY, w, h, runPhase, grounded, vy, squash } = p;

  ctx.save();
  ctx.translate(cx, feetY);
  ctx.scale(1 / Math.sqrt(squash), squash);

  // Body bob: the torso rises twice per stride (once per foot-strike), which is
  // what actually sells a run. Doubling the run phase gives that 2:1 cadence.
  const bob = grounded ? Math.abs(Math.cos(runPhase)) * -h * 0.035 : 0;
  ctx.translate(0, bob);

  const hipY = -h * 0.38;
  const shoulderY = -h * 0.72;
  const thigh = h * 0.2;
  const calf = h * 0.2;
  const upperArm = h * 0.15;
  const foreArm = h * 0.15;

  const sp = Math.sin(runPhase);

  // Leg angles — thigh swings, knee bends on the recovery (heel lift).
  let frontThigh: number, frontKnee: number, backThigh: number, backKnee: number;
  let frontUpper: number, frontFore: number, backUpper: number, backFore: number;

  if (grounded) {
    frontThigh = sp * 0.8;
    frontKnee = 0.2 + Math.max(0, -sp) * 0.95;
    backThigh = -sp * 0.8;
    backKnee = 0.2 + Math.max(0, sp) * 0.95;
    frontUpper = -sp * 0.7;
    frontFore = 0.75 + Math.max(0, sp) * 0.35;
    backUpper = sp * 0.7;
    backFore = 0.75 + Math.max(0, -sp) * 0.35;
  } else if (vy < 0) {
    // Rising — tuck up.
    frontThigh = -0.85;
    frontKnee = 1.25;
    backThigh = -0.3;
    backKnee = 0.8;
    frontUpper = -1.0;
    frontFore = 0.9;
    backUpper = 0.5;
    backFore = 0.7;
  } else {
    // Falling — reach for the landing.
    frontThigh = 0.35;
    frontKnee = 0.25;
    backThigh = -0.15;
    backKnee = 0.55;
    frontUpper = -0.6;
    frontFore = 0.6;
    backUpper = 0.8;
    backFore = 0.5;
  }

  // Far-side limbs (darker).
  limb(ctx, hipY, backThigh, backKnee, thigh, calf, w * 0.17, w * 0.14, UNIFORM_DARK, true);
  limb(ctx, shoulderY, backUpper, backFore, upperArm, foreArm, w * 0.13, w * 0.11, "#0f5c33");

  // Delivery box on the back (amber, "OB" stamped). It lags the body slightly
  // and tips on landing — a small secondary motion that makes the rider feel
  // like he's actually carrying something.
  ctx.save();
  const jiggle = grounded ? Math.sin(runPhase * 2) * 0.05 : vy * 0.012;
  ctx.rotate(jiggle);
  const boxW = w * 0.46;
  const boxH = h * 0.3;
  const boxX = -w * 0.62;
  const boxY = shoulderY + h * 0.02;
  const bg = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
  bg.addColorStop(0, BOX);
  bg.addColorStop(1, BOX_DARK);
  ctx.fillStyle = bg;
  roundRect(ctx, boxX, boxY, boxW, boxH, 2.5);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX + 2, boxY + boxH * 0.3, boxW - 4, boxH * 0.42);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.round(h * 0.11)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("OB", boxX + boxW / 2, boxY + boxH * 0.51);
  ctx.restore();

  // Torso — green uniform with a forward lean.
  ctx.save();
  ctx.translate(0, shoulderY);
  ctx.rotate(0.12);
  ctx.fillStyle = UNIFORM;
  roundRect(ctx, -w * 0.21, 0, w * 0.42, h * 0.36, w * 0.16);
  ctx.fill();
  // Strap across the chest
  ctx.strokeStyle = UNIFORM_DARK;
  ctx.lineWidth = w * 0.07;
  ctx.beginPath();
  ctx.moveTo(-w * 0.18, h * 0.04);
  ctx.lineTo(w * 0.16, h * 0.2);
  ctx.stroke();
  ctx.restore();

  // Head
  const headR = w * 0.165;
  const headY = shoulderY - headR * 1.05;
  const headX = w * 0.05;
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  // Ear
  ctx.fillStyle = SKIN_DARK;
  ctx.beginPath();
  ctx.arc(headX - headR * 0.55, headY + headR * 0.12, headR * 0.26, 0, Math.PI * 2);
  ctx.fill();

  // Cap — crown + brim pointing forward.
  ctx.fillStyle = UNIFORM;
  ctx.beginPath();
  ctx.arc(headX, headY - headR * 0.16, headR * 1.03, Math.PI * 1.02, Math.PI * 2.04);
  ctx.fill();
  ctx.fillStyle = UNIFORM_DARK;
  roundRect(ctx, headX + headR * 0.2, headY - headR * 0.42, headR * 1.5, headR * 0.34, headR * 0.17);
  ctx.fill();

  // Face — eye (with an occasional blink) and a smile.
  const blink = Math.sin(frame * 0.055) > 0.987 ? 0.18 : 1;
  ctx.fillStyle = "#14301f";
  ctx.beginPath();
  ctx.ellipse(headX + headR * 0.42, headY + headR * 0.1, headR * 0.12, headR * 0.17 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a9613a";
  ctx.lineWidth = 1.3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(headX + headR * 0.3, headY + headR * 0.34, headR * 0.34, 0.08 * Math.PI, 0.55 * Math.PI);
  ctx.stroke();

  // Near-side limbs (brighter — closest to the viewer).
  limb(ctx, shoulderY, frontUpper, frontFore, upperArm, foreArm, w * 0.14, w * 0.12, UNIFORM);
  limb(ctx, hipY, frontThigh, frontKnee, thigh, calf, w * 0.18, w * 0.15, "#1e9c55", true);

  ctx.restore();
}
