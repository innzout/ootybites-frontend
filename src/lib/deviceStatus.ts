// Device + user-preference state, in one place.
//
// Every component that needs to know "is this a phone?", "does this person want
// less motion?" or "is this a touch screen?" reads it from here instead of
// writing its own matchMedia string. Two reasons:
//
//   1. Breakpoints are read from the CSS custom properties Tailwind emits, so JS
//      and CSS can never drift apart. Change --breakpoint-sm in globals.css and
//      this file follows automatically.
//   2. `reducedMotion` is a value the render loop can read every frame. A CSS
//      media query does nothing to a requestAnimationFrame loop — the canvas has
//      to ask. This is the single most-missed accessibility detail on WebGL
//      sites, so it lives at the centre rather than in one component.
//
// SSR-safe: with no `window` every flag resolves to its conservative value
// (reduced motion on, small screen, touch), so the server renders the cheap,
// calm version and the client upgrades after hydration.

export type DeviceFlag =
  | "reducedMotion"
  | "touchScreen"
  | "smallScreen"
  | "mediumScreen"
  | "touchOrSmall"
  | "touchOrMedium";

// What each flag is before we can measure (SSR, or matchMedia unavailable).
// Conservative on purpose: assume the constrained device until proven otherwise.
const SSR_DEFAULTS: Record<DeviceFlag, boolean> = {
  reducedMotion: true,
  touchScreen: true,
  smallScreen: true,
  mediumScreen: true,
  touchOrSmall: true,
  touchOrMedium: true,
};

// Tailwind's defaults, used only if the custom property is missing.
const FALLBACK_SM = "40rem";
const FALLBACK_MD = "48rem";

function readBreakpoint(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function buildQueries(): Record<DeviceFlag, string> {
  const sm = readBreakpoint("--breakpoint-sm", FALLBACK_SM);
  const md = readBreakpoint("--breakpoint-md", FALLBACK_MD);
  return {
    reducedMotion: "(prefers-reduced-motion: reduce)",
    touchScreen: "(hover: none)",
    smallScreen: `(max-width: ${sm})`,
    mediumScreen: `(max-width: ${md})`,
    // The right gate for hover effects and pointer-driven motion: catches phones
    // *and* desktop touchscreens, which a width query alone misses.
    touchOrSmall: `(max-width: ${sm}), (hover: none)`,
    touchOrMedium: `(max-width: ${md}), (hover: none)`,
  };
}

type Entry = { list: MediaQueryList; value: boolean; listeners: Set<(v: boolean) => void> };

let entries: Partial<Record<DeviceFlag, Entry>> | null = null;

function ensure(): Partial<Record<DeviceFlag, Entry>> {
  if (entries) return entries;
  entries = {};
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return entries;

  const queries = buildQueries();
  (Object.keys(queries) as DeviceFlag[]).forEach((key) => {
    const list = window.matchMedia(queries[key]);
    const entry: Entry = { list, value: list.matches, listeners: new Set() };
    const onChange = (e: MediaQueryListEvent) => {
      entry.value = e.matches;
      entry.listeners.forEach((fn) => fn(e.matches));
    };
    // addEventListener is the modern API; older Safari only has addListener.
    if (typeof list.addEventListener === "function") list.addEventListener("change", onChange);
    else if (typeof list.addListener === "function") list.addListener(onChange);
    entries![key] = entry;
  });
  return entries;
}

/** Current value of a flag. Safe to call every frame — it reads a cached boolean. */
export function getDeviceFlag(flag: DeviceFlag): boolean {
  const entry = ensure()[flag];
  return entry ? entry.value : SSR_DEFAULTS[flag];
}

/** Subscribe to a flag. Returns an unsubscribe function. */
export function onDeviceFlag(flag: DeviceFlag, cb: (value: boolean) => void): () => void {
  const entry = ensure()[flag];
  if (!entry) return () => {};
  entry.listeners.add(cb);
  return () => entry.listeners.delete(cb);
}
