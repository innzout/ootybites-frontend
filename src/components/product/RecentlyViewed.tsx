"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRecentStore } from "@/store/recentStore";
import { formatPrice } from "@/lib/format";

// A horizontal strip of the shopper's recently-viewed products. Reads the
// device-local history; renders nothing when empty. Pass `excludeId` on a product
// page so the product you're already looking at doesn't appear in its own strip.
export function RecentlyViewed({
  excludeId,
  title = "Recently viewed",
}: {
  excludeId?: string;
  title?: string;
}) {
  const items = useRecentStore((s) => s.items);
  // The store hydrates from localStorage on the client only; gate on mount so the
  // server render (empty) and the first client render match (no hydration warning).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const shown = items.filter((i) => i.id !== excludeId).slice(0, 10);
  if (shown.length === 0) return null;

  return (
    <section className="mt-14">
      <h2 className="mb-4 font-display text-lg font-bold text-ink sm:text-xl">{title}</h2>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {shown.map((i) => (
          <Link
            key={i.id}
            href={`/products/${i.slug}`}
            className="group w-36 shrink-0 rounded-2xl border border-line bg-white shadow-product transition-all hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <div className="aspect-square overflow-hidden rounded-t-2xl bg-brand-50">
              {i.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={i.imageUrl}
                  alt={i.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-brand-300">No image</div>
              )}
            </div>
            <div className="p-2.5">
              <p className="line-clamp-1 font-serif text-sm text-ink">{i.name}</p>
              {i.price != null && (
                <p className="mt-0.5 text-xs font-semibold text-brand-700">from {formatPrice(i.price)}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
