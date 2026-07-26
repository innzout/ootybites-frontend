import Link from "next/link";
import type { Product } from "@/types";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

// ProductCard shows a product's primary image, name, and the lowest variant
// price ("from ₹X"), since price lives on variants.
export function ProductCard({ product }: { product: Product }) {
  const primary = product.images.find((i) => i.is_primary) ?? product.images[0];
  const active = product.variants.filter((v) => v.is_active);
  const from = active.length ? Math.min(...active.map((v) => v.price)) : null;
  const mrpAtMin = from !== null ? active.find((v) => v.price === from)?.mrp : undefined;
  const off = mrpAtMin && from !== null && mrpAtMin > from ? Math.round(((mrpAtMin - from) / mrpAtMin) * 100) : 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-all hover:-translate-y-0.5 hover:shadow-soft"
    >
      <div className="relative aspect-square overflow-hidden bg-brand-50">
        {primary ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primary.url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-brand-300">No image</div>
        )}
        {off > 0 && (
          <span className="absolute left-2 top-2">
            <Badge tone="accent">{off}% off</Badge>
          </span>
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
      </div>
    </Link>
  );
}
