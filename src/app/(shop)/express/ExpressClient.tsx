"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Zap, MapPin, ChevronDown, Check, Clock, LocateFixed } from "lucide-react";
import type { Area, Product } from "@/types";
import { listAddresses, listExpressAreas, listExpressProducts, nearestExpressAreas } from "@/lib/endpoints";
import { useAuthStore } from "@/store/authStore";
import { useHydrated } from "@/lib/useHydrated";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

const AREA_KEY = "ob_express_area";

// The dedicated 24-hour (express) storefront — a quick-commerce experience
// separate from the standard shop. Shopper picks their area up top; the grid
// shows only what's in stock at that area's hub (deliverable within 24 hours).
// initialAreas comes from the server (cached) so the page's main content is in
// the first HTML. Fetching it on the client put the largest paint behind a
// round trip after hydration: 2.7-3.2 s on a throttled phone. null means the
// server could not get them, and the client fetches instead.
export function ExpressClient({ initialAreas }: { initialAreas: Area[] | null }) {
  const [areas, setAreas] = useState<Area[]>(initialAreas ?? []);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(initialAreas === null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [hubName, setHubName] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [productsError, setProductsError] = useState(false);
  // How the current area was chosen, so the page can say so honestly.
  const [areaSource, setAreaSource] = useState<"saved" | "address" | "location" | "manual" | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateMsg, setLocateMsg] = useState<string | null>(null);
  const authHydrated = useHydrated(useAuthStore);
  const isAuthed = useAuthStore((s) => s.isAuthenticated()) && authHydrated;

  const area = useMemo(() => areas.find((a) => a.id === areaId) ?? null, [areas, areaId]);

  // Choosing the area. This used to fall back to the first area in the list,
  // so a first-time visitor from anywhere was shown one hub's stock as though
  // it were theirs. Now: their previous choice, else the pincode of their
  // default address when signed in, else nothing - they pick, or use their
  // location. Never a guess presented as a fact.
  useEffect(() => {
    if (!authHydrated) return;
    let live = true;
    (initialAreas ? Promise.resolve({ areas: initialAreas }) : listExpressAreas())
      .then(async (d) => {
        const list = d.areas ?? [];
        if (!live) return;
        setAreas(list);
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(AREA_KEY);
        } catch {
          /* storage blocked - treat as no saved choice */
        }
        const savedArea = list.find((a) => a.id === saved);
        if (savedArea) {
          setAreaId(savedArea.id);
          setAreaSource("saved");
          return;
        }
        if (isAuthed) {
          const addr = await listAddresses().catch(() => null);
          const def = addr?.addresses?.find((a) => a.is_default) ?? addr?.addresses?.[0];
          const match = def && list.find((a) => a.pincode === def.pincode);
          if (live && match) {
            setAreaId(match.id);
            setAreaSource("address");
          }
        }
      })
      .catch(() => live && setAreas([]))
      .finally(() => live && setLoadingAreas(false));
    return () => {
      live = false;
    };
    // initialAreas is fixed for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHydrated, isAuthed]);

  function chooseArea(id: string, source: "manual" | "location", km: number | null = null) {
    setAreaId(id);
    setAreaSource(source);
    setDistanceKm(km);
    setLocateMsg(null);
    try {
      localStorage.setItem(AREA_KEY, id);
    } catch {
      /* storage blocked - the choice still applies for this visit */
    }
  }

  // "Use my location": the browser's position, ranked against hub locations on
  // the server. Straight-line distance, so it says "nearest", not "exact".
  function locateMe() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocateMsg("Your browser cannot share its location. Please choose your area instead.");
      return;
    }
    setLocating(true);
    setLocateMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const d = await nearestExpressAreas(pos.coords.latitude, pos.coords.longitude);
          const nearest = d.areas?.[0];
          if (!nearest) {
            setLocateMsg("We could not match your location to a delivery area yet. Please choose one from the list.");
          } else if (!nearest.in_range) {
            setLocateMsg(
              `24-hour delivery doesn't reach you yet — our nearest hub is about ${Math.round(nearest.distance_km)} km away. The full store still delivers to you.`,
            );
          } else {
            chooseArea(nearest.id, "location", nearest.distance_km);
          }
        } catch {
          setLocateMsg("Could not look up areas near you. Please choose your area instead.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocateMsg(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was declined. Choose your area from the list instead."
            : "Could not get your location just now. Choose your area from the list instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  const loadProducts = useCallback(() => {
    if (!areaId) return;
    setLoadingProducts(true);
    setProductsError(false);
    listExpressProducts(areaId)
      .then((d) => {
        setProducts(d.products ?? []);
        setHubName(d.hub_name ?? null);
      })
      // Previously a failure fell through to "Nothing in stock in this area".
      .catch(() => {
        setProducts([]);
        setProductsError(true);
      })
      .finally(() => setLoadingProducts(false));
  }, [areaId]);
  useEffect(loadProducts, [loadProducts]);

  // Close the area picker on outside click.
  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [pickerOpen]);

  // Group areas by city for the picker.
  const byCity = useMemo(() => {
    const m = new Map<string, Area[]>();
    for (const a of areas) {
      const list = m.get(a.city) ?? [];
      list.push(a);
      m.set(a.city, list);
    }
    return [...m.entries()];
  }, [areas]);

  return (
    <div>
      {/* Express hero + location bar */}
      <div className="relative z-20 rounded-3xl bg-brand-gradient p-5 text-white shadow-sm shadow-brand-500/25 sm:p-7">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
          <Zap className="h-4 w-4 fill-current" /> Ootybites Express
        </div>
        <h1 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">Delivered in 24 hours</h1>
        <p className="mt-1 text-sm text-white/85">
          Fresh stock from your nearest hub{hubName ? ` · ${hubName}` : ""}. Pick your area to see what&rsquo;s available now.
        </p>

        {/* Location selector */}
        <div ref={pickerRef} className="relative mt-4 inline-block w-full max-w-sm">
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            disabled={loadingAreas || areas.length === 0}
            className="flex w-full items-center justify-between gap-2 rounded-xl bg-white/95 px-3.5 py-2.5 text-left text-ink shadow-sm transition-colors hover:bg-white disabled:opacity-70"
          >
            <span className="flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="min-w-0 truncate text-sm font-semibold">
                {loadingAreas
                  ? "Loading areas…"
                  : area
                    ? `${area.name} · ${area.city} ${area.pincode}`
                    : areas.length > 0
                      ? "Choose your area"
                      : "24-hour delivery not available yet"}
              </span>
            </span>
            {areas.length > 0 && <ChevronDown className="h-4 w-4 shrink-0 text-muted" />}
          </button>

          {pickerOpen && areas.length > 0 && (
            <div className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-line bg-white p-2 text-ink shadow-xl">
              {byCity.map(([city, list]) => (
                <div key={city} className="mb-1">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{city}</p>
                  {list.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        chooseArea(a.id, "manual");
                        setPickerOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-brand-50",
                        areaId === a.id && "bg-brand-50",
                      )}
                    >
                      <span>
                        {a.name} <span className="text-muted">· {a.pincode}</span>
                      </span>
                      {areaId === a.id && <Check className="h-4 w-4 text-brand-600" />}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {(loadingAreas || areas.length > 0) && (
          <div className="mt-2.5 flex min-h-[30px] flex-wrap items-center gap-x-3 gap-y-1.5">
            <button
              type="button"
              onClick={locateMe}
              disabled={locating || loadingAreas}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/25 disabled:opacity-60"
            >
              <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
              {locating ? "Finding you…" : "Use my location"}
            </button>
            {area && areaSource && areaSource !== "manual" && (
              <span className="text-xs text-white/80" aria-live="polite">
                {areaSource === "location"
                  ? `Nearest to you${distanceKm != null ? ` · about ${distanceKm} km` : ""}`
                  : areaSource === "address"
                    ? "From your saved address"
                    : "Your last choice"}
              </span>
            )}
          </div>
        )}
        {locateMsg && (
          <p role="status" className="mt-2 max-w-md rounded-lg bg-white/15 px-3 py-2 text-xs text-white">
            {locateMsg}
          </p>
        )}
      </div>

      {/* No coverage */}
      {!loadingAreas && areas.length === 0 && (
        <div className="mt-10 rounded-2xl border border-line bg-white px-4 py-12 text-center">
          <Clock className="mx-auto h-8 w-8 text-brand-300" />
          <p className="mt-3 font-semibold text-ink">24-hour delivery isn&rsquo;t live in your region yet.</p>
          <p className="mt-1 text-sm text-muted">You can still order from the full store with standard delivery.</p>
        </div>
      )}

      {/* Placeholder the size of the prompt below, so the page does not jump
          when the areas arrive. */}
      {loadingAreas && <div className="mt-6 h-[13.5rem] rounded-2xl bg-surface" aria-hidden="true" />}

      {/* Areas exist but none chosen yet: ask, rather than show a stranger's hub. */}
      {!loadingAreas && areas.length > 0 && !area && (
        <div className="mt-6 rounded-2xl border border-line bg-white px-4 py-12 text-center">
          <MapPin className="mx-auto h-8 w-8 text-brand-300" aria-hidden="true" />
          <p className="mt-3 font-semibold text-ink">Where should we deliver?</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Choose your area above, or use your location, to see what can reach you within 24 hours.
          </p>
        </div>
      )}

      {/* Express catalog */}
      {areas.length > 0 && area && (
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-ink sm:text-xl">Available now</h2>
            {!loadingProducts && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                {products.length} item{products.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : productsError ? (
            <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white px-4 py-12 text-center text-sm text-muted">
              Could not load what&rsquo;s in stock for this area.
              <Button variant="outline" onClick={loadProducts}>
                Try again
              </Button>
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white px-4 py-12 text-center text-sm text-muted">
              Nothing in stock for 24-hour delivery in this area right now — check back soon, or shop the full store with
              standard delivery.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
