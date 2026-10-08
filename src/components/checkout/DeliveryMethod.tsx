"use client";

import { Zap, PackageCheck } from "lucide-react";
import { useSettings } from "@/store/settingsStore";

export interface ExpressResult {
  express: boolean;
  hub_name?: string | null;
}

// Shows which fulfilment the order will take once a pincode is known: express
// (local hub stock, 24h) or standard (central stock). The server makes the real
// decision at placement — this only reflects the check, never drives it.
export function DeliveryMethod({
  checking,
  result,
}: {
  checking: boolean;
  result: ExpressResult | null;
}) {
  const settings = useSettings();

  // The outcome changes after an async check, so announce it politely rather
  // than leaving it a silent visual-only update (WCAG 4.1.3).
  return (
    <div className="mt-4" aria-live="polite">
      {checking ? (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          Checking delivery options…
        </div>
      ) : result?.express ? (
        <div className="rounded-xl border border-brand-300 bg-brand-gradient px-3.5 py-3 text-white shadow-sm shadow-brand-500/25">
          <div className="flex items-center gap-2 font-semibold">
            <Zap className="h-4 w-4 fill-current" /> 24-Hour Express Delivery
          </div>
          <p className="mt-0.5 text-xs text-white/85">
            In stock at {result.hub_name ?? "your local hub"} —{" "}
            {settings.express_delivery_text.toLowerCase()}.
          </p>
        </div>
      ) : result ? (
        <div className="rounded-xl border border-line bg-surface px-3.5 py-3">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <PackageCheck className="h-4 w-4 text-brand-600" /> Standard Delivery
          </div>
          <p className="mt-0.5 text-xs text-muted">
            Shipped from our store — {settings.standard_delivery_text.toLowerCase()}.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted">Enter your pincode to see delivery options.</p>
      )}
    </div>
  );
}
