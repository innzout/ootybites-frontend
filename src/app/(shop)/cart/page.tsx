"use client";

import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const subtotal = useCartStore((s) => s.subtotal());

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-neutral-500">Your cart is empty.</p>
        <Link href="/" className="mt-4 inline-block font-medium text-brand-600 hover:underline">
          Browse products →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
        {items.map((item) => (
          <div key={item.variantId} className="flex items-center gap-4 p-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-brand-50">
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-neutral-800">{item.productName}</p>
              <p className="text-sm text-neutral-500">{item.variantLabel}</p>
              <p className="text-sm font-semibold text-brand-600">{formatPrice(item.price)}</p>
            </div>
            <div className="flex items-center rounded-lg border border-neutral-300">
              <button className="px-2 py-1" onClick={() => setQty(item.variantId, item.qty - 1)}>
                −
              </button>
              <span className="w-8 text-center text-sm">{item.qty}</span>
              <button className="px-2 py-1" onClick={() => setQty(item.variantId, item.qty + 1)}>
                +
              </button>
            </div>
            <button
              onClick={() => remove(item.variantId)}
              className="text-sm text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <aside className="h-fit rounded-xl border border-neutral-200 p-5">
        <h2 className="font-semibold text-neutral-800">Order summary</h2>
        <div className="mt-4 flex justify-between text-sm">
          <span className="text-neutral-600">Subtotal</span>
          <span className="font-medium">{formatPrice(subtotal)}</span>
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          Coupons and delivery are applied at checkout. Prices are re-checked on the server.
        </p>
        <Link href="/checkout">
          <Button className="mt-5 w-full">Proceed to checkout</Button>
        </Link>
      </aside>
    </div>
  );
}
