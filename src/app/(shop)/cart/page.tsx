"use client";

import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/lib/format";
import { buttonClasses } from "@/components/ui/Button";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { Spinner } from "@/components/ui/Spinner";
import { useHydrated } from "@/lib/useHydrated";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const subtotal = useCartStore((s) => s.subtotal());

  // The cart lives in localStorage, so the server renders an empty cart and the
  // client renders the real one — React threw "Hydration failed… server HTML
  // didn't match" and discarded the server tree. Hold the first paint until the
  // store has rehydrated so both sides agree.
  const hydrated = useHydrated(useCartStore);
  if (!hydrated) {
    return (
      <div className="py-20 text-center" aria-busy="true">
        <Spinner />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted">Your cart is empty.</p>
        <Link href="/" className="mt-4 inline-block font-medium text-brand-600 hover:underline">
          Browse products →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      {/* Brand tokens throughout — this page still used raw neutral-* greys, so
          its borders and text sat a shade off every other surface. */}
      <div className="divide-y divide-line rounded-2xl border border-line bg-white">
        {items.map((item) => (
          <div key={item.variantId} className="flex items-center gap-4 p-4">
            {/* The image and name link back to the product. Every cart line
                already carries productSlug; it simply was not being used, so
                there was no way back to the detail page from the cart. */}
            <Link
              href={`/products/${item.productSlug}`}
              aria-label={`View ${item.productName}`}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            >
              <RemoteImage
                src={item.imageUrl}
                alt={item.productName}
                sizes="64px"
                fallback={<span />}
              />
            </Link>
            <div className="flex-1">
              <Link
                href={`/products/${item.productSlug}`}
                className="font-medium text-ink transition-colors hover:text-brand-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                {item.productName}
              </Link>
              <p className="text-sm text-muted">{item.variantLabel}</p>
              <p className="text-sm font-semibold text-brand-600">{formatPrice(item.price)}</p>
            </div>
            {/* "−" and "+" alone announce as punctuation, so each control needs
                a real label naming the product it adjusts. */}
            <div className="flex items-center rounded-lg border border-line">
              <button
                type="button"
                aria-label={`Decrease quantity of ${item.productName}`}
                className="px-2 py-1 text-muted transition-colors hover:text-brand-700"
                onClick={() => setQty(item.variantId, item.qty - 1)}
              >
                −
              </button>
              <span className="w-8 text-center text-sm" aria-live="polite">
                {item.qty}
              </span>
              <button
                type="button"
                aria-label={`Increase quantity of ${item.productName}`}
                className="px-2 py-1 text-muted transition-colors hover:text-brand-700"
                onClick={() => setQty(item.variantId, item.qty + 1)}
              >
                +
              </button>
            </div>
            <button
              type="button"
              aria-label={`Remove ${item.productName} from cart`}
              onClick={() => remove(item.variantId)}
              className="text-sm text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display font-bold text-ink">Order summary</h2>
        <div className="mt-4 flex justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <span className="font-medium text-ink">{formatPrice(subtotal)}</span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Coupons and delivery are applied at checkout. Prices are re-checked on the server.
        </p>
        {/* A real link styled as a button. It was <Link><Button>, which renders
            <a><button> — invalid nesting, and it swallowed the link semantics
            (no middle-click, no open-in-new-tab). */}
        <Link href="/checkout" className={buttonClasses({ size: "md" }, "mt-5 w-full")}>
          Proceed to checkout
        </Link>
      </aside>
    </div>
  );
}
