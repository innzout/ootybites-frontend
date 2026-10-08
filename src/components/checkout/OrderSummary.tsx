"use client";

import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { DeliveryMethod, type ExpressResult } from "@/components/checkout/DeliveryMethod";

// Order summary rail: coupon entry, money breakdown, fulfilment, place button.
// Money shown here is display-only — the server re-validates the cart and re-runs
// the coupon engine at placement, so a tampered total cannot be paid (rule 3).
export function OrderSummary({
  code,
  onCodeChange,
  onApplyCoupon,
  couponMsg,
  subtotal,
  discount,
  expressChecking,
  expressResult,
  error,
  placing,
  onPlace,
}: {
  code: string;
  onCodeChange: (v: string) => void;
  onApplyCoupon: () => void;
  couponMsg: string | null;
  subtotal: number;
  discount: number;
  expressChecking: boolean;
  expressResult: ExpressResult | null;
  error: string | null;
  placing: boolean;
  onPlace: () => void;
}) {
  const total = Math.max(0, subtotal - discount);

  return (
    <aside className="h-fit rounded-2xl border border-line bg-white p-5">
      <h2 className="font-display font-bold text-ink">Order summary</h2>

      <div className="mt-4 flex gap-2">
        <input
          className="h-10 flex-1 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand-500"
          placeholder="Coupon code"
          aria-label="Coupon code"
          value={code}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
          // Enter in a coupon field should apply the coupon, not do nothing.
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onApplyCoupon();
            }
          }}
        />
        <Button variant="secondary" onClick={onApplyCoupon}>
          Apply
        </Button>
      </div>
      {couponMsg && (
        <p className="mt-2 text-xs text-muted" aria-live="polite">
          {couponMsg}
        </p>
      )}

      <div className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-brand-600">
            <span>Discount</span>
            <span>−{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-line pt-2 font-semibold">
          <span>Total (COD)</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      <DeliveryMethod checking={expressChecking} result={expressResult} />

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <Button className="mt-4 w-full" loading={placing} onClick={onPlace}>
        Place order (Cash on Delivery)
      </Button>
    </aside>
  );
}
