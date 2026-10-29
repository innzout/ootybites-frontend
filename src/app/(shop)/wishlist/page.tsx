"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlistStore } from "@/store/wishlistStore";
import { listProducts } from "@/lib/endpoints";
import type { Product } from "@/types";
import { buttonClasses } from "@/components/ui/Button";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { useHydrated } from "@/lib/useHydrated";

export default function WishlistPage() {
  const items = useWishlistStore((s) => s.items);
  // Persisted in localStorage — same server/client mismatch as the cart.
  const hydrated = useHydrated(useWishlistStore);

  // The wishlist only stores a snapshot (name, price, image) taken when the item
  // was saved, which can be months stale: it has no stock, so a sold-out product
  // sat in here looking perfectly buyable while the same product was greyed out
  // everywhere else. Re-fetch the live products and render the ordinary
  // ProductCard, so the sold-out treatment, pricing and quick view are by
  // definition identical to the rest of the shop.
  const [products, setProducts] = useState<Product[] | null>(null);
  const [failed, setFailed] = useState(false);
  const ids = items.map((i) => i.id).join(",");

  useEffect(() => {
    if (!hydrated) return;
    if (!ids) {
      setProducts([]);
      return;
    }
    let live = true;
    setFailed(false);
    listProducts({ ids: ids.split(","), limit: 100 })
      .then((d) => live && setProducts(d.products ?? []))
      .catch(() => {
        if (!live) return;
        setProducts([]);
        setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [hydrated, ids]);

  // Keep the saved order rather than the API's, so the grid does not reshuffle.
  const ordered = products
    ? items.map((i) => products.find((p) => p.id === i.id)).filter((p): p is Product => !!p)
    : [];
  // A saved product that no longer comes back is unpublished or deleted.
  const missing = products ? items.length - ordered.length : 0;

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
      ) : products === null ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4" aria-busy="true">
          {items.map((i) => (
            <ProductCardSkeleton key={i.id} />
          ))}
        </div>
      ) : (
        <>
          {failed && (
            <p className="mb-4 rounded-xl bg-surface px-3 py-2 text-sm text-muted" role="alert">
              Could not refresh your saved items just now. Please try again.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {ordered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {!failed && missing > 0 && (
            <p className="mt-4 text-sm text-muted">
              {missing === 1
                ? "1 saved item is no longer available and is not shown."
                : `${missing} saved items are no longer available and are not shown.`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
