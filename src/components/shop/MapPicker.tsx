"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, LocateFixed, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

// MapPicker is a Google-Maps location picker for the delivery address. It is
// gated on NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: when the key is absent it renders a
// small fallback note and the manual address fields remain the source of truth.
// Dropping/dragging the pin reverse-geocodes to fill city / pincode / line1.
//
// Address search uses Places API (NEW) via PlaceAutocompleteElement, falling
// back to the legacy places.Autocomplete widget. Projects created recently
// cannot enable the legacy Places API at all, so the legacy widget silently
// returned nothing — the search box rendered and looked functional while doing
// nothing. If neither path initialises the box is hidden rather than left dead.

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
// Default centre: Ooty, Nilgiris (where Ootybites ships from).
const DEFAULT_CENTER = { lat: 11.4102, lng: 76.695 };

// AdvancedMarkerElement only renders on a map that has a Map ID. DEMO_MAP_ID
// works for development; create a real one in Cloud Console > Map Management
// and set NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID for production, otherwise Google may
// rate-limit or change the demo ID's behaviour.
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

// The classic Marker uses setPosition()/getPosition(); AdvancedMarkerElement
// exposes a plain `position` property. One pair of helpers so the rest of the
// component does not care which one it got.
function setMarkerPos(m: any, pos: any) {
  if (typeof m?.setPosition === "function") m.setPosition(pos);
  else if (m) m.position = pos;
}
function getMarkerPos(m: any) {
  return typeof m?.getPosition === "function" ? m.getPosition() : m?.position;
}

const SEARCH_INPUT_CLASS =
  "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25";

// The classic JS API hands back LatLng objects (lat() / lng() methods); Places
// API (New) hands back plain numbers. Accept either.
function toLatLng(v: any): { lat: number; lng: number } {
  return typeof v?.lat === "function"
    ? { lat: v.lat(), lng: v.lng() }
    : { lat: Number(v?.lat), lng: Number(v?.lng) };
}

let loaderPromise: Promise<void> | null = null;
function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    // NOT loading=async. That flag requires Google's inline bootstrap snippet;
    // with a plain <script src> the onload fires before google.maps.importLibrary
    // exists, so everything throws. The console logs a performance hint about
    // this — accepted deliberately. The classic bootstrap still exposes
    // importLibrary(), which is all the newer libraries below need.
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(s);
  });
  return loaderPromise;
}

export interface PickedLocation {
  lat: number;
  lng: number;
  city?: string;
  pincode?: string;
  line1?: string;
}

export function MapPicker({
  onPick,
  initial,
}: {
  onPick: (loc: PickedLocation) => void;
  initial?: { lat: number; lng: number };
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const searchHostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);
  // null = still deciding, false = no Places API, true = search is live.
  const [searchReady, setSearchReady] = useState<boolean | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateMsg, setLocateMsg] = useState<string | null>(null);
  const accuracyCircleRef = useRef<any>(null);
  const clearFixHintRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!KEY) return;
    let cancelled = false;
    // Google calls this global when the key is rejected (invalid key, referrer
    // not allowed, API not enabled, or billing off) instead of throwing — catch
    // it so we show the manual-entry fallback rather than Google's error box.
    (window as any).gm_authFailure = () => {
      // Fires when Google rejects the key — usually a missing API, a referrer
      // restriction, or billing being off. The precise reason is logged by
      // Google's own script just above this in the console.
      console.warn(
        "[MapPicker] Google Maps rejected the API key (gm_authFailure). Check the console error just above for the exact code — commonly ApiNotActivatedMapError (enable Maps JavaScript API + Places API + Geocoding API), RefererNotAllowedMapError (add this origin to the key's HTTP-referrer restrictions), or BillingNotEnabledMapError (turn on billing).",
      );
      setFailed(true);
    };
    loadMaps()
      .then(async () => {
        if (cancelled || !divRef.current) return;
        const g = (window as any).google;
        // Only the marker library needs importLibrary; Map and Geocoder are
        // attached synchronously by the classic bootstrap.
        const markerLib = await g.maps.importLibrary?.("marker").catch(() => null);
        if (cancelled || !divRef.current) return;

        const start = initial ?? DEFAULT_CENTER;
        const map = new g.maps.Map(divRef.current, {
          center: start,
          zoom: initial ? 16 : 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          // Required for AdvancedMarkerElement; harmless otherwise.
          mapId: MAP_ID,
        });

        // AdvancedMarkerElement replaces the deprecated Marker. Fall back to the
        // old one if the marker library or a Map ID is unavailable, so the pin
        // never silently disappears.
        const marker = markerLib?.AdvancedMarkerElement
          ? new markerLib.AdvancedMarkerElement({ map, position: start, gmpDraggable: true })
          : new g.maps.Marker({ position: start, map, draggable: true });
        const geocoder = new g.maps.Geocoder();
        mapRef.current = map;
        markerRef.current = marker;
        geocoderRef.current = geocoder;

        // Once the customer places the pin themselves the uncertainty circle and
        // its warning are stale — they have just told us where they actually are.
        const clearFixHint = () => {
          accuracyCircleRef.current?.setMap(null);
          accuracyCircleRef.current = null;
          setLocateMsg(null);
        };

        const handle = (latLng: any) => {
          clearFixHint();
          setMarkerPos(marker, latLng);
          map.panTo(latLng);
          reverse(latLng);
        };
        map.addListener("click", (e: any) => handle(e.latLng));
        // AdvancedMarkerElement is a web component: it wants DOM events
        // ('gmp-dragend'), not the classic addListener. Bind whichever the
        // marker we actually got supports.
        const onDragEnd = () => {
          clearFixHint();
          reverse(getMarkerPos(marker));
        };
        if (markerLib?.AdvancedMarkerElement && marker instanceof markerLib.AdvancedMarkerElement) {
          marker.addEventListener("gmp-dragend", onDragEnd);
        } else {
          marker.addListener("dragend", onDragEnd);
        }
        clearFixHintRef.current = clearFixHint;

        // Places autocomplete: type an address → drop the pin + fill the fields.
        setupSearch(g, map, marker).then((ok) => !cancelled && setSearchReady(ok));
      })
      .catch((err) => {
        // Covers both a script-load failure AND anything thrown while building
        // the map. Swallowing the reason here made a working key look like a
        // broken one, so surface it.
        if (cancelled) return;
        console.error("[MapPicker] could not initialise the map:", err);
        setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wires up address search, preferring Places API (New). Returns whether a
  // working search box exists, so the caller can hide it if not.
  async function setupSearch(g: any, map: any, marker: any): Promise<boolean> {
    const host = searchHostRef.current;
    if (!host) return false;

    // --- Places API (New): PlaceAutocompleteElement ---
    try {
      const places = await g.maps.importLibrary?.("places");
      const El = places?.PlaceAutocompleteElement;
      if (El) {
        const pac = new El({ includedRegionCodes: ["in"] });
        pac.className = "ob-place-autocomplete";
        host.appendChild(pac);

        // The element's event name changed during the New Places rollout, so
        // listen for both rather than silently binding to the wrong one.
        const onSelect = async (ev: any) => {
          const pred = ev?.placePrediction ?? ev?.detail?.placePrediction;
          let place = ev?.place ?? ev?.detail?.place;
          if (!place && pred?.toPlace) place = pred.toPlace();
          if (!place) return;
          try {
            await place.fetchFields({ fields: ["location", "addressComponents", "formattedAddress"] });
          } catch {
            /* fields may already be present */
          }
          const loc = place.location;
          if (!loc) return;
          clearFixHintRef.current?.();
          setMarkerPos(marker, loc);
          map.panTo(loc);
          map.setZoom(16);
          emit(loc, normaliseComponents(place.addressComponents), place.formattedAddress);
        };
        pac.addEventListener("gmp-select", onSelect);
        pac.addEventListener("gmp-placeselect", onSelect);
        return true;
      }
    } catch {
      /* fall through to the legacy widget */
    }

    // --- Legacy fallback (older projects that still have it enabled) ---
    try {
      if (!g.maps.places?.Autocomplete) return false;
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Search your address or area…";
      input.className = SEARCH_INPUT_CLASS;
      input.addEventListener("keydown", (e) => e.key === "Enter" && e.preventDefault());
      host.appendChild(input);
      const ac = new g.maps.places.Autocomplete(input, {
        componentRestrictions: { country: "in" },
        fields: ["geometry", "address_components", "formatted_address"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const loc = place?.geometry?.location;
        if (!loc) return;
        marker.setPosition(loc);
        map.panTo(loc);
        map.setZoom(16);
        emit(loc, place.address_components ?? [], place.formatted_address);
      });
      return true;
    } catch {
      return false;
    }
  }

  // New Places returns {longText, shortText, types}; the legacy API and our
  // geocoder return {long_name, types}. Normalise so emit() has one shape.
  function normaliseComponents(comps: any[] | undefined): any[] {
    if (!comps) return [];
    return comps.map((c) =>
      c.long_name !== undefined ? c : { long_name: c.longText ?? c.shortText, types: c.types },
    );
  }

  // Parse Google address components + a lat/lng into the fields we auto-fill.
  function emit(latLng: any, comps: any[], formatted?: string) {
    const get = (type: string) => comps.find((c) => c.types?.includes(type))?.long_name as string | undefined;
    const city = get("locality") ?? get("administrative_area_level_2");
    const pincode = get("postal_code");
    const line1 = formatted?.split(",").slice(0, 2).join(",").trim();
    onPick({ ...toLatLng(latLng), city, pincode, line1 });
  }

  function reverse(latLng: any) {
    const geocoder = geocoderRef.current;
    if (!geocoder) return;
    geocoder.geocode({ location: latLng }, (results: any[], status: string) => {
      if (status !== "OK" || !results?.length) {
        onPick(toLatLng(latLng));
        return;
      }
      emit(latLng, results[0].address_components ?? [], results[0].formatted_address);
    });
  }

  // Anything coarser than this is not a street address — it is almost always an
  // IP lookup resolving to the ISP's exchange, which can be tens of km away.
  const COARSE_FIX_METRES = 500;

  function useMyLocation() {
    if (!navigator.geolocation || !mapRef.current) {
      setLocateMsg("This browser cannot share your location — drop the pin manually.");
      return;
    }
    setLocating(true);
    setLocateMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const g = (window as any).google;
        const { latitude, longitude, accuracy } = pos.coords;
        const latLng = new g.maps.LatLng(latitude, longitude);
        setMarkerPos(markerRef.current, latLng);
        mapRef.current.panTo(latLng);

        // Zoom to match how good the fix actually is. Hard-coding zoom 15 made a
        // ±20 km IP guess look like a precise street-level pin.
        const zoom = accuracy <= 50 ? 17 : accuracy <= 200 ? 16 : accuracy <= 1000 ? 14 : 12;
        mapRef.current.setZoom(zoom);

        // Draw the uncertainty instead of hiding it, so the customer can see the
        // pin is a guess and correct it.
        accuracyCircleRef.current?.setMap(null);
        if (accuracy > COARSE_FIX_METRES) {
          accuracyCircleRef.current = new g.maps.Circle({
            map: mapRef.current,
            center: latLng,
            radius: accuracy,
            strokeColor: "#d98324",
            strokeOpacity: 0.6,
            strokeWeight: 1,
            fillColor: "#d98324",
            fillOpacity: 0.1,
            clickable: false,
          });
          setLocateMsg(
            `Only a rough fix (±${Math.round(accuracy / 100) / 10} km) — this is usually your internet provider's location, not your address. Drag the pin to your door.`,
          );
        } else {
          setLocateMsg(null);
        }
        reverse(latLng);
      },
      (err) => {
        // Previously there was no error callback at all, so a denied permission
        // did nothing whatsoever and looked like a broken button.
        setLocating(false);
        setLocateMsg(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — allow it in your browser, or drop the pin manually."
            : err.code === err.TIMEOUT
              ? "Timed out getting your location — drop the pin manually."
              : "Could not get your location — drop the pin manually.",
        );
      },
      {
        // Ask for GPS/Wi-Fi positioning rather than the cheapest source. Without
        // this the browser is free to answer from the IP address alone, which is
        // what put the pin at the ISP's exchange.
        enableHighAccuracy: true,
        timeout: 10000,
        // Never reuse a cached fix from a previous page or address.
        maximumAge: 0,
      },
    );
  }

  if (!KEY || failed) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-line bg-surface px-3 py-2.5 text-xs text-muted">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        Map picker unavailable — please enter your address below.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <MapPin className="h-3.5 w-3.5" /> Drop a pin at your delivery location
        </span>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-brand-600 transition-colors hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LocateFixed className={cn("h-3.5 w-3.5", locating && "animate-spin")} />
          {locating ? "Locating…" : "Use my location"}
        </button>
      </div>
      {/* The search widget mounts here. Kept out of the tree until Places is
          confirmed working, so we never show a box that does nothing. The label
          is ours: Google's element renders only a magnifier glyph, which does
          not tell anyone what the field is for. */}
      <div className={searchReady ? "flex flex-col gap-1" : "hidden"}>
        <label className="text-xs font-medium text-muted">Search for your address</label>
        <div ref={searchHostRef} />
      </div>
      {searchReady === false && (
        <p className="text-[11px] text-muted">
          Address search is unavailable — drop the pin on the map instead.
        </p>
      )}
      <div ref={divRef} className="h-52 w-full overflow-hidden rounded-xl border border-line" />
      {/* Accuracy / permission feedback. aria-live so it is announced, since the
          pin moving on a map conveys nothing to a screen reader. */}
      {locateMsg && (
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-accent-600" aria-live="polite">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
          {locateMsg}
        </p>
      )}
    </div>
  );
}
