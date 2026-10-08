"use client";

import { useEffect, useRef } from "react";
import { getDeviceFlag, onDeviceFlag } from "@/lib/deviceStatus";
import { FRAG, VERT } from "./hillsShader";

// Renders the hero shader, and — more importantly — knows when not to.
//
// Three modes, never a boolean:
//   FALLBACK_2D  no WebGL2, or the context is lost. Nothing is drawn; the CSS
//                gradient underneath is the hero and the page is unaffected.
//   REDUCED_3D   phone, touch device, or "reduce motion" is on. The scene is
//                drawn exactly once and the loop never starts, so the art is
//                still there for ~0ms/frame and no battery.
//   FULL_3D      desktop pointer device, motion allowed. Animated, and even
//                then paused whenever the tab is hidden or the hero scrolls
//                out of view.
//
// The reduced-motion check lives in the render loop, not only in CSS: a media
// query cannot stop a requestAnimationFrame.

type Mode = "FULL_3D" | "REDUCED_3D" | "FALLBACK_2D";

// Read a brand colour out of globals.css so the shader never hard-codes a hex.
function cssColor(name: string, fallback: [number, number, number]): [number, number, number] {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(raw);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[HillsCanvas] shader failed:", gl.getShaderInfoLog(shader));
    }
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function HillsCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      antialias: false, // the shader anti-aliases its own ridges via fwidth
      alpha: true,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
      failIfMajorPerformanceCaveat: true,
    });
    if (!gl) return; // FALLBACK_2D — the CSS gradient is already painted

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const program = vs && fs ? gl.createProgram() : null;
    if (!vs || !fs || !program) return;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(program);
      return;
    }
    gl.useProgram(program);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");
    gl.uniform3fv(gl.getUniformLocation(program, "u_skyTop"), cssColor("--color-cream", [1, 0.97, 0.93]));
    gl.uniform3fv(gl.getUniformLocation(program, "u_skyLow"), cssColor("--color-accent-300", [0.96, 0.85, 0.45]));
    gl.uniform3fv(gl.getUniformLocation(program, "u_sun"), cssColor("--color-accent-400", [0.91, 0.65, 0.24]));
    gl.uniform3fv(gl.getUniformLocation(program, "u_hillFar"), cssColor("--color-brand-300", [0.34, 0.84, 0.56]));
    gl.uniform3fv(gl.getUniformLocation(program, "u_hillNear"), cssColor("--color-brand-800", [0.07, 0.25, 0.16]));

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let mode: Mode = "FULL_3D";
    let raf = 0;
    let visible = true;
    let disposed = false;
    const started = performance.now();

    function currentMode(): Mode {
      // Phones and touch devices get the still frame: same art, no battery cost.
      if (getDeviceFlag("reducedMotion") || getDeviceFlag("touchOrSmall")) return "REDUCED_3D";
      return "FULL_3D";
    }

    function resize() {
      if (disposed || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      // Desktop 2, constrained devices 1.5 — an uncapped DPR on a 3x phone is a
      // 9x fill-rate bill for a background.
      const cap = mode === "FULL_3D" ? 2 : 1.5;
      const dpr = Math.min(window.devicePixelRatio || 1, cap);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl!.viewport(0, 0, w, h);
      gl!.uniform2f(uRes, w, h);
    }

    function draw(elapsedSeconds: number) {
      if (disposed) return;
      gl!.uniform1f(uTime, elapsedSeconds);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }

    function frame(now: number) {
      if (disposed) return;
      draw((now - started) / 1000);
      raf = requestAnimationFrame(frame);
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    // The one place that decides whether the loop should be running.
    function sync() {
      if (disposed) return;
      const next = currentMode();
      const changed = next !== mode;
      mode = next;
      if (changed) resize();

      const shouldAnimate = mode === "FULL_3D" && visible && !document.hidden;
      if (shouldAnimate && !raf) {
        raf = requestAnimationFrame(frame);
      } else if (!shouldAnimate) {
        stop();
        // Still paint one frame so the hero is never blank.
        draw((performance.now() - started) / 1000);
      }
    }

    mode = currentMode();
    resize();
    sync();

    // --- listeners -------------------------------------------------------
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { rootMargin: "120px" },
    );
    io.observe(canvas);

    const ro = new ResizeObserver(() => {
      resize();
      if (mode !== "FULL_3D" || !raf) draw((performance.now() - started) / 1000);
    });
    ro.observe(canvas);

    const onVisibility = () => sync();
    document.addEventListener("visibilitychange", onVisibility);

    const offMotion = onDeviceFlag("reducedMotion", sync);
    const offTouch = onDeviceFlag("touchOrSmall", sync);

    // A lost context must not leave a frozen canvas on screen.
    const onLost = (e: Event) => {
      e.preventDefault();
      stop();
      canvas.style.opacity = "0";
    };
    canvas.addEventListener("webglcontextlost", onLost);

    // --- teardown: WebGL resources are not garbage collected -------------
    return () => {
      disposed = true;
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      offMotion();
      offTouch();
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      tabIndex={-1}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
