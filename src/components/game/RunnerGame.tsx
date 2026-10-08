"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  CANVAS_H,
  CANVAS_W,
  GRAVITY_FALL,
  GRAVITY_HOLD,
  GRAVITY_RISE,
  GROUND_Y,
  HURT_STEPS,
  IDLE_SCROLL,
  JUMP_BUFFER_STEPS,
  JUMP_FORCE,
  JUMP_VX,
  PLAYER_BASE_X,
  PLAYER_H,
  PLAYER_MAX_FORWARD,
  PLAYER_W,
  RETURN_SPEED,
  TERMINAL_VELOCITY,
  getSpeed,
  overlaps,
  shrink,
} from "./physics";
import { collectibleColor, type Collectible, type Obstacle } from "./entities";
import { nextChunk } from "./spawner";
import { createRenderer, drawRunner, type Renderer } from "./render";

type Phase = "idle" | "playing" | "over";

// The simulation advances in fixed 1/60 s steps; rAF delta is accumulated and
// drained. Without this, speed/gravity/difficulty all scale with refresh rate.
const STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 250;
const MAX_STEPS_PER_FRAME = 5;

// Pools — sized to the worst case and reused, so the hot loop allocates nothing
// and never triggers a GC pause mid-run.
const MAX_PARTICLES = 200;
const MAX_POPUPS = 16;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export function RunnerGame({
  highScore,
  onStart,
  onSubmit,
}: {
  highScore: number;
  /** Called when a run begins so the page can open a server-side run ticket. */
  onStart?: () => void;
  onSubmit: (score: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [hud, setHud] = useState({ score: 0, lives: 3 });
  const [best, setBest] = useState(highScore);

  useEffect(() => setBest((b) => Math.max(b, highScore)), [highScore]);

  const submitRef = useRef(onSubmit);
  useEffect(() => {
    submitRef.current = onSubmit;
  }, [onSubmit]);

  const startRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let renderer: Renderer = createRenderer(dpr);

    function applySize() {
      canvas!.width = Math.round(CANVAS_W * dpr);
      canvas!.height = Math.round(CANVAS_H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    applySize();

    // Only rebuild the cached scenery tiles when the pixel ratio actually
    // changes (e.g. dragging to a different-density monitor) — not on every
    // window resize, since the canvas is a fixed logical size scaled by CSS.
    function onResize() {
      const next = Math.min(window.devicePixelRatio || 1, 2);
      if (next !== dpr) {
        dpr = next;
        renderer = createRenderer(dpr);
        applySize();
      }
    }
    window.addEventListener("resize", onResize);

    // ── Game state ──
    const g = {
      running: false,
      over: false,
      x: PLAYER_BASE_X,
      vx: 0,
      y: GROUND_Y - PLAYER_H,
      vy: 0,
      grounded: true,
      lives: 3,
      hurt: 0,
      score: 0,
      bonus: 0,
      steps: 0,
      scroll: 0,
      speed: getSpeed(0),
      runPhase: 0,
      squash: 1,
      squashVel: 0,
      shake: 0,
      jumpHeld: false,
      jumpBuffer: 0,
      chunkDist: 260,
    };

    const obstacles: Obstacle[] = [];
    const collectibles: Collectible[] = [];

    const particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
      x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: "#fff", size: 1,
    }));
    let particleCount = 0;
    const popups: Popup[] = Array.from({ length: MAX_POPUPS }, () => ({
      x: 0, y: 0, text: "", color: "#000", life: 0,
    }));
    let popupCount = 0;

    function addParticle(x: number, y: number, vx: number, vy: number, color: string, size: number, life: number) {
      if (particleCount >= MAX_PARTICLES) return;
      const p = particles[particleCount++];
      p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.color = color; p.size = size; p.life = life; p.maxLife = life;
    }
    function burst(x: number, y: number, color: string, count = 9, speed = 2.6) {
      for (let i = 0; i < count; i++) {
        const a = ((Math.PI * 2) / count) * i + Math.random() * 0.4;
        const s = speed * (0.6 + Math.random() * 0.8);
        addParticle(x, y, Math.cos(a) * s, Math.sin(a) * s - 1.2, color, 2.2 + Math.random() * 2.6, 20 + Math.random() * 14);
      }
    }
    function dust(x: number, y: number) {
      addParticle(x + Math.random() * 8 - 4, y, -0.4 - Math.random() * 0.9, -Math.random() * 0.6, "#cdebd8", 1.5 + Math.random() * 2, 10 + Math.random() * 8);
    }
    function addPopup(x: number, y: number, text: string, color: string) {
      if (popupCount >= MAX_POPUPS) return;
      const p = popups[popupCount++];
      p.x = x; p.y = y; p.text = text; p.color = color; p.life = 42;
    }

    function reset() {
      obstacles.length = 0;
      collectibles.length = 0;
      particleCount = 0;
      popupCount = 0;
      g.running = true;
      g.over = false;
      g.x = PLAYER_BASE_X;
      g.vx = 0;
      g.y = GROUND_Y - PLAYER_H;
      g.vy = 0;
      g.grounded = true;
      g.lives = 3;
      g.hurt = 0;
      g.score = 0;
      g.bonus = 0;
      g.steps = 0;
      g.speed = getSpeed(0);
      g.runPhase = 0;
      g.squash = 1;
      g.squashVel = 0;
      g.shake = 0;
      g.jumpHeld = false;
      g.jumpBuffer = 0;
      g.chunkDist = 260; // a clear runway before the first chunk
      setHud({ score: 0, lives: 3 });
    }
    startRef.current = reset;

    function endGame() {
      g.running = false;
      g.over = true;
      // The blink signals temporary invulnerability. Once the run is over it
      // means nothing, so clear it rather than leaving the rider flickering.
      g.hurt = 0;
      const final = Math.floor(g.score);
      setPhase("over");
      setHud({ score: final, lives: 0 });
      setBest((b) => Math.max(b, final));
      submitRef.current(final);
    }

    // ── Input: one action ──
    function pressJump() {
      g.jumpHeld = true;
      if (g.running) g.jumpBuffer = JUMP_BUFFER_STEPS;
    }
    function releaseJump() {
      g.jumpHeld = false;
    }
    // Space also activates a focused button. Swallowing it unconditionally meant
    // a keyboard user who tabbed to "Play again" (or any control on the page)
    // got a queued jump instead of the button firing, with no way to restart
    // without a mouse. Let the focused control win.
    function focusIsInteractive() {
      const el = document.activeElement;
      if (!el || el === document.body || el === canvas) return false;
      return !!el.closest("button, a, input, select, textarea, [tabindex]");
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.code !== "ArrowUp" && e.code !== "KeyW") return;
      if (focusIsInteractive()) return;
      e.preventDefault();
      if (!e.repeat) pressJump();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") releaseJump();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      pressJump();
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", releaseJump);

    let lastTime = 0;
    const onVisibility = () => {
      if (document.hidden) lastTime = 0;
    };
    document.addEventListener("visibilitychange", onVisibility);

    // ── Cosmetic step ──
    // Everything here is presentation that must keep advancing even when the
    // simulation is stopped (idle attract screen, game over): the i-frame blink,
    // the squash spring, and the particle/popup pools. It runs on the SAME fixed
    // timestep as the simulation rather than on the rAF clock, so it stays
    // refresh-rate independent.
    //
    // Keeping these out of step() is the fix for a whole bug class: anything
    // decayed only inside step() freezes at its last value the moment the game
    // ends, and then renders forever (the rider blinked in place after a game
    // over, particles hung in mid-air, the shake juddered on).
    function cosmeticStep() {
      if (g.hurt > 0) g.hurt--;
      g.shake = g.shake > 0.5 ? g.shake * 0.82 : 0;

      g.squashVel += (1 - g.squash) * 0.28;
      g.squash += g.squashVel;
      g.squashVel *= 0.68;
      g.squash = Math.max(0.68, Math.min(1.35, g.squash));

      for (let i = particleCount - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.13;
        p.life--;
        if (p.life <= 0) {
          particles[i] = particles[particleCount - 1];
          particles[particleCount - 1] = p;
          particleCount--;
        }
      }
      for (let i = popupCount - 1; i >= 0; i--) {
        const p = popups[i];
        p.y -= 0.9;
        p.life--;
        if (p.life <= 0) {
          popups[i] = popups[popupCount - 1];
          popups[popupCount - 1] = p;
          popupCount--;
        }
      }
    }

    // Attract/after-game step. The world drifts and the rider keeps jogging on
    // the idle screen (a static rider over scrolling ground read as a bug); once
    // the run is over everything halts except the cosmetic settle.
    function idleStep() {
      g.steps++;
      cosmeticStep();
      if (g.over) return;
      g.scroll += IDLE_SCROLL;
      g.runPhase += 0.13 + IDLE_SCROLL * 0.05;
    }

    // ── One fixed simulation step ──
    function step() {
      g.steps++;
      cosmeticStep();
      const timeScore = g.steps / 6;
      g.score = timeScore + g.bonus;
      g.speed = getSpeed(timeScore);

      if (g.jumpBuffer > 0 && g.grounded) {
        g.jumpBuffer = 0;
        g.vy = JUMP_FORCE;
        g.vx = JUMP_VX;
        g.grounded = false;
        g.squashVel = 0.26;
        for (let i = 0; i < 5; i++) dust(g.x + PLAYER_W / 2, GROUND_Y);
      }
      if (g.jumpBuffer > 0) g.jumpBuffer--;

      const rising = g.vy < 0;
      const grav = rising && g.jumpHeld ? GRAVITY_HOLD : rising ? GRAVITY_RISE : GRAVITY_FALL;
      g.vy = Math.min(g.vy + grav, TERMINAL_VELOCITY);

      const groundTarget = GROUND_Y - PLAYER_H;
      g.y += g.vy;
      if (g.y >= groundTarget) {
        if (!g.grounded) {
          g.squashVel = -(Math.abs(g.vy) * 0.03 + 0.15);
          for (let i = 0; i < 6; i++) dust(g.x + PLAYER_W / 2, GROUND_Y);
        }
        g.y = groundTarget;
        g.vy = 0;
        g.grounded = true;
      }

      if (!g.grounded) {
        g.x = Math.min(g.x + g.vx, PLAYER_BASE_X + PLAYER_MAX_FORWARD);
        g.vx *= 0.97;
      } else {
        g.vx = 0;
        if (g.x > PLAYER_BASE_X) g.x = Math.max(PLAYER_BASE_X, g.x - RETURN_SPEED);
        g.runPhase += 0.13 + g.speed * 0.05;
        if (g.steps % 7 === 0) dust(g.x, GROUND_Y);
      }

      // World scroll + chunk spawning. One scheduler owns both obstacles and
      // collectibles, so an authored chunk can never overlap the previous one.
      g.scroll += g.speed;
      g.chunkDist -= g.speed;
      if (g.chunkDist <= 0) {
        const chunk = nextChunk(CANVAS_W + 60, timeScore, g.speed);
        for (const o of chunk.obstacles) obstacles.push(o);
        for (const c of chunk.collectibles) collectibles.push(c);
        g.chunkDist = chunk.length;
      }

      // Advance + compact entities in place (no array reallocation per frame).
      let n = 0;
      for (let i = 0; i < obstacles.length; i++) {
        const o = obstacles[i];
        o.x -= g.speed;
        if (o.x + o.width > -80) obstacles[n++] = o;
      }
      obstacles.length = n;

      n = 0;
      for (let i = 0; i < collectibles.length; i++) {
        const c = collectibles[i];
        c.x -= g.speed;
        if (c.x + c.width > -80) collectibles[n++] = c;
      }
      collectibles.length = n;

      // Collision — forgiving hitbox, slightly inside the drawn sprite.
      const hb = shrink({ x: g.x, y: g.y, width: PLAYER_W, height: PLAYER_H }, 5);

      if (g.hurt <= 0) {
        for (let i = 0; i < obstacles.length; i++) {
          const o = obstacles[i];
          if (overlaps(hb, shrink(o, 5))) {
            g.lives--;
            g.hurt = HURT_STEPS;
            g.shake = 9;
            burst(g.x + PLAYER_W / 2, g.y + PLAYER_H / 2, "#ef4444", 7, 3);
            burst(g.x + PLAYER_W / 2, g.y + PLAYER_H / 2, "#fbbf24", 5, 2);
            obstacles.splice(i, 1);
            if (g.lives <= 0) {
              endGame();
              return;
            }
            break;
          }
        }
      }

      n = 0;
      for (let i = 0; i < collectibles.length; i++) {
        const c = collectibles[i];
        if (overlaps(hb, shrink(c, 3))) {
          g.bonus += c.points;
          g.score += c.points;
          burst(c.x + c.width / 2, c.y + c.height / 2, collectibleColor(c.type), c.isBonus ? 11 : 7);
          addPopup(c.x + c.width / 2, c.y, `+${c.points}`, c.isBonus ? "#d98324" : "#166b3d");
          if (c.isBonus) g.shake = 2;
        } else collectibles[n++] = c;
      }
      collectibles.length = n;
    }

    function render() {
      const c2 = ctx!;
      // The scene repaints every pixel, so no clearRect is needed — except that
      // screen shake translates everything, which would expose stale pixels at
      // the edges. One base fill (cheaper than a clear) covers that.
      if (g.shake > 0.5) {
        c2.fillStyle = "#bfe0ef";
        c2.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }
      c2.save();
      if (g.shake > 0.5) {
        c2.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake * 0.5);
      }

      renderer.drawBackdrop(c2, g.scroll, g.steps);
      renderer.drawGround(c2, g.scroll);

      for (let i = 0; i < obstacles.length; i++) renderer.drawObstacle(c2, obstacles[i]);

      for (let i = 0; i < collectibles.length; i++) {
        const c = collectibles[i];
        const bob = Math.sin(g.steps * 0.07 + c.id * 1.1) * 4;
        const pulse = 1 + Math.sin(g.steps * 0.1 + c.id) * 0.07;
        renderer.drawCollectible(
          c2,
          c.type,
          c.x + c.width / 2,
          c.y + c.height / 2 + bob,
          pulse * (c.isBonus ? 0.86 : 0.76),
          c.isBonus,
          g.steps * 0.02 + c.id,
        );
      }

      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        const k = p.life / p.maxLife;
        c2.globalAlpha = k * 0.9;
        c2.fillStyle = p.color;
        c2.beginPath();
        c2.arc(p.x, p.y, p.size * k, 0, Math.PI * 2);
        c2.fill();
      }
      c2.globalAlpha = 1;

      // Landing shadow tightens as the rider nears the ground.
      const above = GROUND_Y - (g.y + PLAYER_H);
      const prox = Math.max(0, 1 - above / 130);
      c2.globalAlpha = 0.1 + prox * 0.2;
      c2.fillStyle = "#14301f";
      c2.beginPath();
      c2.ellipse(g.x + PLAYER_W / 2, GROUND_Y + 3, 15 + prox * 7, 4.5, 0, 0, Math.PI * 2);
      c2.fill();
      c2.globalAlpha = 1;

      if (g.hurt <= 0 || Math.floor(g.steps / 4) % 2 === 0) {
        drawRunner(
          c2,
          {
            cx: g.x + PLAYER_W / 2,
            feetY: g.y + PLAYER_H,
            w: PLAYER_W,
            h: PLAYER_H,
            runPhase: g.runPhase,
            grounded: g.grounded,
            vy: g.vy,
            squash: g.squash,
          },
          g.steps,
        );
      }

      c2.textAlign = "center";
      c2.textBaseline = "middle";
      c2.font = "bold 18px sans-serif";
      c2.lineWidth = 3;
      for (let i = 0; i < popupCount; i++) {
        const p = popups[i];
        c2.globalAlpha = Math.min(1, p.life / 24);
        c2.strokeStyle = "rgba(255,255,255,0.9)";
        c2.strokeText(p.text, p.x, p.y);
        c2.fillStyle = p.color;
        c2.fillText(p.text, p.x, p.y);
      }
      c2.globalAlpha = 1;

      c2.restore();
    }

    let acc = 0;
    let raf = 0;
    let hudTick = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (!lastTime) lastTime = t;
      const elapsed = Math.min(t - lastTime, MAX_FRAME_MS);
      lastTime = t;

      // The accumulator drains on every frame, live or not: cosmetic state has
      // to keep settling after a game over, and it must do so on the same fixed
      // timestep so it looks identical on a 60 Hz and a 144 Hz display.
      acc += elapsed;
      let steps = 0;
      const wasRunning = g.running;
      while (acc >= STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        if (g.running) step();
        else idleStep();
        acc -= STEP_MS;
        steps++;
      }
      // If we hit the cap the device can't keep up; drop the backlog rather
      // than spiral (better to run slightly slow than to freeze).
      if (steps >= MAX_STEPS_PER_FRAME) acc = 0;

      if (wasRunning && ++hudTick % 6 === 0) {
        setHud({ score: Math.floor(g.score), lives: Math.max(0, g.lives) });
      }

      render();
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", releaseJump);
      canvas.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Keep the latest callback in a ref so start() stays referentially stable.
  const startCbRef = useRef(onStart);
  useEffect(() => {
    startCbRef.current = onStart;
  }, [onStart]);

  const start = useCallback(() => {
    startCbRef.current?.();
    setPhase("playing");
    startRef.current();
  }, []);

  return (
    // The logical canvas is 900x340 (2.65:1), which at phone width renders only
    // ~123px tall — unplayable, and far too short for the start/game-over panel,
    // which the rounded container then clipped. A minimum height letterboxes the
    // canvas on narrow screens so both the game and the panel have room. The
    // canvas keeps its aspect ratio everywhere, so the visible game world is
    // identical on every device and league scores stay comparable.
    <div
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden rounded-3xl border border-line bg-[#bfe0ef] shadow-product",
        // Only reserve the extra height while a panel is up. During play the card
        // hugs the canvas, so there is no dead letterbox around the action.
        phase !== "playing" && "min-h-[260px] sm:min-h-0",
      )}
    >
      <canvas
        ref={canvasRef}
        className="block w-full cursor-pointer touch-none select-none"
        style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
        aria-label="Ooty Bites Dash — press space or tap to jump"
      />

      {phase === "playing" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-4">
          <div className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-bold text-ink shadow-sm backdrop-blur">
            {hud.score}
          </div>
          <div className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-bold shadow-sm backdrop-blur">
            {"❤️".repeat(hud.lives)}
            {"🤍".repeat(Math.max(0, 3 - hud.lives))}
          </div>
        </div>
      )}

      {phase !== "playing" && (
        <div className="absolute inset-0 flex items-center justify-center overflow-y-auto bg-ink/30 p-3 backdrop-blur-[2px] sm:p-4">
          <div className="my-auto w-full max-w-sm rounded-3xl border border-line bg-white/95 p-4 text-center shadow-xl sm:p-6">
            {phase === "over" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-500">Delivery complete</p>
                <h2 className="mt-1 font-display text-2xl font-extrabold text-ink">{hud.score} points</h2>
                <p className="mt-1 text-sm text-muted">
                  Best: <span className="font-semibold text-brand-700">{best}</span>
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl font-extrabold text-ink">Ooty Bites Dash</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Run the delivery route through the tea hills. Grab the goods, hop the hazards.
                </p>
                {best > 0 && (
                  <p className="mt-2 text-sm">
                    Your best: <span className="font-semibold text-brand-700">{best}</span>
                  </p>
                )}
              </>
            )}

            <div className="mt-3 flex items-center justify-center gap-3 text-[11px] font-medium text-muted">
              <span>🍃 +10</span>
              <span>✨ jump +25</span>
              <span>🪨 avoid</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-sans">Space</kbd> to jump —
              hold to jump higher
            </p>

            <button
              onClick={start}
              className="mt-5 inline-flex items-center justify-center rounded-full bg-brand-gradient px-6 py-2.5 font-semibold text-white shadow-md shadow-brand-500/25 transition-transform hover:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            >
              {phase === "over" ? "Play again" : "Start running"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
