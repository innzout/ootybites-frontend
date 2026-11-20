// Shared Google Maps JS API loader.
//
// A single module-level promise matters: the API can only be bootstrapped once
// per page. Two components each injecting their own <script> would load it
// twice, and Google warns about (and may break on) that. Everything that needs
// the JS API goes through loadMaps.

let loaderPromise: Promise<void> | null = null;

export function loadMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as { google?: { maps?: unknown } }).google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    // NOT loading=async. That flag requires Google's inline bootstrap snippet;
    // with a plain <script src> the onload fires before google.maps.importLibrary
    // exists, so everything throws. The console logs a performance hint about
    // this — accepted deliberately. The classic bootstrap still exposes
    // importLibrary(), which is all the newer libraries need.
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      // Let a later attempt retry rather than caching the failure forever.
      loaderPromise = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(s);
  });
  return loaderPromise;
}

/**
 * Deep link that opens the route in Google Maps.
 *
 * The always-available fallback for directions: it needs no extra API enabled
 * and no billing beyond what the key already has, and on a phone it hands the
 * rider straight to turn-by-turn navigation. `origin` may be a "lat,lng" pair
 * or a plain address string — Google geocodes the latter.
 */
export function directionsUrl(origin: string, destination: string): string {
  const p = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}

/** Formats a coordinate pair for the Maps URL parameters above. */
export function latLngParam(lat: number, lng: number): string {
  return `${lat},${lng}`;
}

/**
 * Straight-line (great-circle) distance in kilometres. Mirrors the backend's
 * services.HaversineKm. Used where road distance is unavailable - it is always
 * shorter than the drive, so the UI labels it "straight line".
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface UserPosition {
  lat: number;
  lng: number;
  /** Radius of uncertainty in metres. Above ~500 m it is usually an IP guess. */
  accuracy: number;
}

// One lookup per page visit, shared by every map. Without this each map asked
// separately, so a page with two maps could prompt twice and wait twice.
let positionPromise: Promise<UserPosition | null> | null = null;

/**
 * The visitor's current position, used to open maps where they actually are
 * instead of at a fixed default. Asks for permission the first time; the
 * browser remembers the answer. Resolves to null when unavailable, denied or
 * too slow, so callers always fall back to their own default and a map is
 * never left waiting.
 */
export function getUserPosition(timeoutMs = 8000): Promise<UserPosition | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  if (positionPromise) return positionPromise;
  const pending = new Promise<UserPosition | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => {
        // A refusal or failure is final for this visit; a timeout may succeed later.
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 5 * 60 * 1000 },
    );
  }).then((r) => {
    if (!r) positionPromise = null;
    return r;
  });
  positionPromise = pending;
  return pending;
}

/** Zoom that matches how good a fix is, so a rough guess never looks exact. */
export function zoomForAccuracy(accuracy: number): number {
  return accuracy <= 50 ? 17 : accuracy <= 200 ? 16 : accuracy <= 1000 ? 14 : 12;
}
