"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { Product, Variant } from "@/types";
import { formatPrice, formatUnit } from "@/lib/format";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

// ProductQuickView is a compact popup shown when a product card is clicked: the
// image rotates into view, and the shopper can pick a variant + qty and add to
// cart without leaving the listing. "View full details" links to the product page.
export function ProductQuickView({ product, onClose }: { product: Product; onClose: () => void }) {
  const add = useCartStore((s) => s.add);
  const primary = product.images.find((i) => i.is_primary) ?? product.images[0];
  const firstSellable = product.variants.find((v) => v.is_active && v.stock_qty > 0) ?? product.variants[0] ?? null;
  const [variant, setVariant] = useState<Variant | null>(firstSellable);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const outOfStock = !variant || variant.stock_qty <= 0;
  const off = variant && variant.mrp > variant.price ? Math.round(((variant.mrp - variant.price) / variant.mrp) * 100) : 0;

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
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop-in relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-product"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-1.5 text-muted shadow-sm backdrop-blur transition-colors hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Rotating image */}
        <div className="relative aspect-square overflow-hidden bg-brand-50">
          {primary ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={primary.url}
              src={primary.url}
              alt={product.name}
              className="animate-rotate-in h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-brand-300">No image</div>
          )}
          {off > 0 && (
            <span className="absolute left-3 top-3">
              <Badge tone="accent">{off}% off</Badge>
            </span>
          )}
        </div>

        {/* Details */}
        <div className="p-4 sm:p-5">
          <h3 className="font-serif text-xl text-ink">{product.name}</h3>
          {product.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{product.description}</p>}

          {variant && (
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-2xl font-semibold text-brand-700">{formatPrice(variant.price)}</span>
              {off > 0 && <span className="text-sm text-muted line-through">{formatPrice(variant.mrp)}</span>}
            </div>
          )}

          {/* Variant chips */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.variants.map((v) => {
              const disabled = !v.is_active || v.stock_qty <= 0;
              const selected = variant?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setVariant(v)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    selected ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-muted hover:border-brand-400",
                    disabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  {v.label || formatUnit(v.unit_value, v.unit)}
                </button>
              );
            })}
          </div>

          {/* Qty + add */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-line">
              <button type="button" className="px-3 py-1.5 text-lg text-muted" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </button>
              <span className="w-8 text-center text-sm">{qty}</span>
              <button type="button" className="px-3 py-1.5 text-lg text-muted" onClick={() => setQty((q) => q + 1)}>
                +
              </button>
            </div>
            <Button className="flex-1" onClick={addToCart} disabled={outOfStock}>
              {outOfStock ? "Out of stock" : added ? "Added ✓" : "Add to cart"}
            </Button>
          </div>

          <Link
            href={`/products/${product.slug}`}
            className="mt-3 block text-center text-sm font-semibold text-brand-600 hover:underline"
          >
            View full details →
          </Link>
        </div>
      </div>
    </div>
  );
}
