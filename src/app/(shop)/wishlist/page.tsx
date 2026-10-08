"use client";

import Link from "next/link";
import { Heart, X } from "lucide-react";
import { useWishlistStore } from "@/store/wishlistStore";
import { formatPrice } from "@/lib/format";
import { buttonClasses } from "@/components/ui/Button";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { Spinner } from "@/components/ui/Spinner";
import { useHydrated } from "@/lib/useHydrated";

export default function WishlistPage() {
  const items = useWishlistStore((s) => s.items);
  const remove = useWishlistStore((s) => s.remove);
  // Persisted in localStorage — same server/client mismatch as the cart.
  const hydrated = useHydrated(useWishlistStore);

  return (
    <div>
      <h1 className="mb-5 flex items-center gap-2 font-display text-2xl font-bold text-ink">
        <Heart className="h-6 w-6 fill-red-500 text-red-500" /> Your wishlist
      </h1>

      {!hydrated ? (
        <div className="py-20 text-center" aria-busy="true">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-white px-4 py-16 text-center">
          <p className="text-muted">Nothing saved yet.</p>
          {/* A real link, not a button doing window.location: that forced a full
              page reload and gave up middle-click / open-in-new-tab. */}
          <Link href="/" className={buttonClasses({}, "mt-4")}>
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-product">
              <button
                type="button"
                aria-label="Remove"
                onClick={() => remove(it.id)}
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-muted shadow-sm backdrop-blur hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
              <Link href={`/products/${it.slug}`} className="flex flex-1 flex-col">
                <div className="relative aspect-square overflow-hidden bg-brand-50">
                  <RemoteImage
                    src={it.imageUrl}
                    alt={it.name}
                    sizes="(min-width: 1024px) 288px, (min-width: 640px) 33vw, 50vw"
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <h3 className="line-clamp-1 font-serif text-lg text-ink">{it.name}</h3>
                  {it.price !== null && (
                    <span className="mt-auto font-display text-lg font-semibold text-brand-700">{formatPrice(it.price)}</span>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
