"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format";
import { activeStock, isLowStock } from "@/lib/stock";
import { Badge } from "@/components/ui/Badge";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { ProductQuickView } from "@/components/product/ProductQuickView";
import { useWishlistStore } from "@/store/wishlistStore";
import { cn } from "@/lib/cn";

// ProductCard shows a product's primary image, name, and the lowest variant
// price ("from ₹X"). Clicking it opens a compact quick-view popup (image rotates
// in) rather than navigating away; the popup links through to the full page.
export function ProductCard({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const wished = useWishlistStore((s) => s.has(product.id));
  const toggleWish = useWishlistStore((s) => s.toggle);
  const primary = product.images.find((i) => i.is_primary) ?? product.images[0];
  const active = product.variants.filter((v) => v.is_active);
  const from = active.length ? Math.min(...active.map((v) => v.price)) : null;
  const mrpAtMin = from !== null ? active.find((v) => v.price === from)?.mrp : undefined;
  const off = mrpAtMin && from !== null && mrpAtMin > from ? Math.round(((mrpAtMin - from) / mrpAtMin) * 100) : 0;
  const stock = activeStock(product.variants);
  const low = isLowStock(stock);
  // No active variant has stock — the card previously gave no hint of this, so
  // shoppers only found out after opening the product.
  const soldOut = active.length > 0 && stock === 0;

  return (
    <>
      {/* The wishlist control is a sibling of the link, not a child of it: an
          interactive element nested inside an <a> is invalid, and as a
          role="button" span it had no key handler — so Enter followed the link
          instead of toggling, and Space did nothing. Keyboard users could not
          use the wishlist from the grid at all. */}
      <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-product transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        {/* A real link to the product page (crawlable + open-in-new-tab), but a
            normal click opens the quick-view instead of navigating. */}
        <a
          href={`/products/${product.slug}`}
          onClick={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
          className="flex flex-1 flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <div className="relative aspect-square overflow-hidden bg-brand-50">
            <RemoteImage
              src={primary?.url}
              alt={product.name}
              // Grid is 2-up on mobile, 3-up at sm, 4-up at lg (max 1152px shell).
              sizes="(min-width: 1024px) 288px, (min-width: 640px) 33vw, 50vw"
              className={cn(
                "transition-transform duration-500 ease-out group-hover:rotate-2 group-hover:scale-110",
                // Mute what cannot be bought so the grid reads at a glance.
                soldOut && "opacity-45 saturate-50",
              )}
            />
            {soldOut ? (
              <span className="absolute left-2 top-2">
                <Badge tone="neutral">Sold out</Badge>
              </span>
            ) : (
              off > 0 && (
                <span className="absolute left-2 top-2">
                  <Badge tone="accent">{off}% off</Badge>
                </span>
              )
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1 p-3 sm:p-3.5">
            <h3 className="line-clamp-1 font-serif text-lg text-ink">{product.name}</h3>
            <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
              {from !== null ? (
                <>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted">from</span>
                  <span className="font-display text-lg font-semibold text-brand-700">{formatPrice(from)}</span>
                  {off > 0 && mrpAtMin && (
                    <span className="text-xs text-muted line-through">{formatPrice(mrpAtMin)}</span>
                  )}
                </>
              ) : (
                <span className="text-sm text-muted">Unavailable</span>
              )}
            </div>
            {/* Reserve the line so cards in a row stay the same height whether
                or not they carry a stock note. */}
            <p className="min-h-[15px] text-[11px] font-semibold text-accent-600">
              {soldOut ? <span className="text-muted">Out of stock</span> : low ? `Only ${stock} left` : ""}
            </p>
          </div>
        </a>

        <button
          type="button"
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={wished}
          onClick={() =>
            toggleWish({ id: product.id, slug: product.slug, name: product.name, price: from, imageUrl: primary?.url })
          }
          // bg-white/85 alone vanished against pale product shots — the control
          // was plainly visible on a dark image and invisible on a white one. The
          // hairline ring gives it an edge on any backdrop.
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm ring-1 ring-ink/10 backdrop-blur transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          <Heart className={cn("h-4 w-4", wished ? "fill-red-500 text-red-500" : "text-muted")} />
        </button>
      </div>

      {open && <ProductQuickView product={product} onClose={() => setOpen(false)} />}
    </>
  );
}
