"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Zap, MapPin, ChevronDown, Check, Clock } from "lucide-react";
import type { Area, Product } from "@/types";
import { listExpressAreas, listExpressProducts } from "@/lib/endpoints";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

const AREA_KEY = "ob_express_area";

// The dedicated 24-hour (express) storefront — a quick-commerce experience
// separate from the standard shop. Shopper picks their area up top; the grid
// shows only what's in stock at that area's hub (deliverable within 24 hours).
export default function ExpressPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [hubName, setHubName] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const area = useMemo(() => areas.find((a) => a.id === areaId) ?? null, [areas, areaId]);

  useEffect(() => {
    listExpressAreas()
      .then((d) => {
        const list = d.areas ?? [];
        setAreas(list);
        if (list.length > 0) {
          const saved = typeof window !== "undefined" ? localStorage.getItem(AREA_KEY) : null;
          setAreaId((list.find((a) => a.id === saved) ?? list[0]).id);
        }
      })
      .catch(() => setAreas([]))
      .finally(() => setLoadingAreas(false));
  }, []);

  useEffect(() => {
    if (!areaId) return;
    setLoadingProducts(true);
    if (typeof window !== "undefined") localStorage.setItem(AREA_KEY, areaId);
    listExpressProducts(areaId)
      .then((d) => {
        setProducts(d.products ?? []);
        setHubName(d.hub_name ?? null);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, [areaId]);

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
                        setAreaId(a.id);
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
      </div>

      {/* No coverage */}
      {!loadingAreas && areas.length === 0 && (
        <div className="mt-10 rounded-2xl border border-line bg-white px-4 py-12 text-center">
          <Clock className="mx-auto h-8 w-8 text-brand-300" />
          <p className="mt-3 font-semibold text-ink">24-hour delivery isn&rsquo;t live in your region yet.</p>
          <p className="mt-1 text-sm text-muted">You can still order from the full store with standard delivery.</p>
        </div>
      )}

      {/* Express catalog */}
      {areas.length > 0 && (
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
