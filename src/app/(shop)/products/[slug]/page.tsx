"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, Variant } from "@/types";
import { getProduct } from "@/lib/endpoints";
import { formatPrice, formatUnit } from "@/lib/format";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const add = useCartStore((s) => s.add);

  const [product, setProduct] = useState<Product | null>(null);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    getProduct(slug)
      .then((p) => {
        setProduct(p);
        setVariant(p.variants.find((v) => v.is_active && v.stock_qty > 0) ?? p.variants[0] ?? null);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }
  if (!product) {
    return <p className="py-20 text-center text-neutral-500">Product not found.</p>;
  }

  const primary = product.images.find((i) => i.is_primary) ?? product.images[0];
  const outOfStock = !variant || variant.stock_qty <= 0;

  function addToCart() {
    if (!product || !variant) return;
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
      <div className="aspect-square overflow-hidden rounded-xl bg-brand-50">
        {primary ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={primary.url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-300">No image</div>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{product.name}</h1>
        {product.description && <p className="mt-2 text-neutral-600">{product.description}</p>}

        {variant && (
          <p className="mt-4 text-2xl font-semibold text-brand-600">{formatPrice(variant.price)}</p>
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
