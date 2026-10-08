"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import type { Product, Variant } from "@/types";
import { formatPrice, formatUnit } from "@/lib/format";
import { isLowStock } from "@/lib/stock";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useRecentStore } from "@/store/recentStore";
import { Button } from "@/components/ui/Button";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { cn } from "@/lib/cn";

// Interactive product UI. The product is fetched on the server and passed in as
// a prop so the detail content is server-rendered (SEO) while variant selection,
// the gallery, quantity, wishlist and add-to-cart stay client-side.
export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const add = useCartStore((s) => s.add);
  const wishItems = useWishlistStore((s) => s.items);
  const toggleWish = useWishlistStore((s) => s.toggle);
  const recordRecent = useRecentStore((s) => s.record);

  const primaryIdx = Math.max(
    0,
    product.images.findIndex((i) => i.is_primary),
  );
  const [variant, setVariant] = useState<Variant | null>(
    product.variants.find((v) => v.is_active && v.stock_qty > 0) ?? product.variants[0] ?? null,
  );
  const [activeImg, setActiveImg] = useState(primaryIdx);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const primary = product.images.find((i) => i.is_primary) ?? product.images[0];
  const gallery = product.images.length > 0 ? product.images : [];
  const shown = gallery[activeImg] ?? primary;
  const outOfStock = !variant || variant.stock_qty <= 0;
  const activePrices = product.variants.filter((v) => v.is_active).map((v) => v.price);
  const fromPrice = activePrices.length ? Math.min(...activePrices) : null;
  const wished = wishItems.some((i) => i.id === product.id);

  // Remember this product for the "Recently viewed" strip on return visits.
  useEffect(() => {
    recordRecent({ id: product.id, slug: product.slug, name: product.name, price: fromPrice, imageUrl: primary?.url });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  function addToCart() {
    if (!variant) return;
    add({
      variantId: variant.id,
      productSlug: product.slug,
      productName: product.name,
      variantLabel: variant.label,
      unit: variant.unit,
      unitValue: variant.unit_value,
      price: variant.price,
      qty,
      imageUrl: primary?.url,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-brand-50 shadow-product">
          {/* The PDP hero is the LCP element — the one image on the site that
              should load eagerly. key forces the flip animation on each swap. */}
          <RemoteImage
            key={shown?.url}
            src={shown?.url}
            alt={product.name}
            sizes="(min-width: 768px) 560px, 100vw"
            priority
            className="animate-rotate-in"
          />
        </div>
        {/* Thumbnails */}
        {gallery.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {gallery.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveImg(i)}
                aria-label={`View image ${i + 1} of ${gallery.length}`}
                aria-current={i === activeImg}
                className={`relative h-16 w-16 overflow-hidden rounded-xl border-2 transition-colors ${
                  i === activeImg ? "border-brand-500" : "border-line hover:border-brand-300"
                }`}
              >
                <RemoteImage src={img.url} alt="" sizes="64px" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-neutral-900">{product.name}</h1>
          <button
            type="button"
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            onClick={() =>
              toggleWish({ id: product.id, slug: product.slug, name: product.name, price: fromPrice, imageUrl: primary?.url })
            }
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-white transition-colors hover:border-red-300"
          >
            <Heart className={cn("h-5 w-5", wished ? "fill-red-500 text-red-500" : "text-muted")} />
          </button>
        </div>
        {product.description && <p className="mt-2 text-neutral-600">{product.description}</p>}

        {variant && (
          <p className="mt-4 text-2xl font-semibold text-brand-600">{formatPrice(variant.price)}</p>
        )}
        {variant && isLowStock(variant.stock_qty) && (
          <p className="mt-1 text-sm font-semibold text-accent-600">
            Hurry — only {variant.stock_qty} left in stock
          </p>
        )}

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-neutral-700">Choose an option</p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const disabled = !v.is_active || v.stock_qty <= 0;
              const selected = variant?.id === v.id;
              return (
                <button
                  key={v.id}
                  disabled={disabled}
                  onClick={() => setVariant(v)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    selected
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-neutral-300 text-neutral-700 hover:border-brand-400"
                  } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  {v.label || formatUnit(v.unit_value, v.unit)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex items-center rounded-lg border border-neutral-300">
            <button className="px-3 py-2 text-lg" onClick={() => setQty((q) => Math.max(1, q - 1))}>
              −
            </button>
            <span className="w-10 text-center">{qty}</span>
            <button className="px-3 py-2 text-lg" onClick={() => setQty((q) => q + 1)}>
              +
            </button>
          </div>
          <Button size="lg" onClick={addToCart} disabled={outOfStock}>
            {outOfStock ? "Out of stock" : added ? "Added ✓" : "Add to cart"}
          </Button>
        </div>

        {added && (
          <button
            onClick={() => router.push("/cart")}
            className="mt-3 text-sm font-medium text-brand-600 hover:underline"
          >
            Go to cart →
          </button>
        )}
      </div>
    </div>
  );
}
